/**
 * mode-probe-gate.spec.mjs — pins the model-free routing gate.
 *
 * Run with: node --test scripts/mode-probe-gate.spec.mjs
 *
 * WHAT IS PINNED, AND WHY EACH ONE MATTERS
 *   1. The reader accepts the generated fixtures and refuses anything it cannot
 *      prove it understands. A half-parsed catalogue would silently change the
 *      answers the gate reports.
 *   2. The reader refuses block scalars: `|` and `>` change what the model reads
 *      and the fixtures never use them.
 *   3. The ranking is a function of the catalogue and the query only (ties by
 *      slug), never of file order.
 *   4. A wrong owner is a breach on a probe whose expected owner is lexically
 *      reachable, and a coverage gap — not a breach — when it is not. That is
 *      the line between "the selector picked wrong" and "the line has no word a
 *      user would type", and conflating them was the first defect this file caught.
 *   5. A baseline whose catalogue digest differs is fatal, and a moved top-1 is
 *      a breach. A gate that silently re-baselines cannot be a regression gate.
 */

import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

import { parseRoomodes, renderPickerLine } from "./lib/roomodes-lite.mjs"
import { buildIndex, rank, judgeProbe, runGate, tokenize } from "./lib/mode-probe-gate.mjs"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const CATALOGUE = path.join(ROOT, "test-fixtures/frames/axis-stance.roomodes")

const fixture = `customModes:
  - slug: alpha
    name: Alpha
    description: Alpha does the example thing.
    roleDefinition: "You are Alpha."
    whenToUse: Use when the widget must be calibrated before shipping.
    groups:
      - read
      - edit
  - slug: beta
    name: Beta
    description: Beta does the other thing.
    roleDefinition: "You are Beta."
    whenToUse: Use when a widget must be reviewed for risk.
    groups:
      - read
`

const entries = [
	{ slug: "alpha", name: "Alpha", whenToUse: "Use when the widget must be calibrated before shipping." },
	{ slug: "beta", name: "Beta", whenToUse: "Use when a widget must be reviewed for risk." },
]

describe("roomodes-lite", () => {
	it("parses the 45-entry preload and renders the documented line", () => {
		const { entries: parsed, digest } = parseRoomodes(readFileSync(CATALOGUE, "utf8"))
		assert.equal(parsed.length, 45)
		assert.match(digest, /^[0-9a-f]{64}$/)
		for (const entry of parsed) assert.ok(entry.whenToUse.trim().length > 0, `${entry.slug} has no whenToUse`)
		assert.equal(
			renderPickerLine({ name: "Debug", slug: "debug", whenToUse: "Use when something fails." }),
			'* "Debug" mode (debug) - Use when something fails.',
		)
	})

	it("parses quoted scalars with escapes, single quotes and group lists", () => {
		const { entries: parsed } = parseRoomodes(fixture)
		assert.deepEqual(parsed[0].groups, ["read", "edit"])
		assert.equal(parsed[1].whenToUse, "Use when a widget must be reviewed for risk.")
	})

	it("refuses content it cannot prove it understands", () => {
		assert.throws(() => parseRoomodes("customModes:\n  - slug: a\n    name: A\n    whenToUse: |\n      block\n"), /block scalars/)
		assert.throws(() => parseRoomodes("customModes:\n  - slug: a\n    name: A\n    whenToUse: x\n    customInstructions: y\n"), /unknown key/)
		assert.throws(() => parseRoomodes("customModes:\n  - slug: a\n    name: A\n    whenToUse: x\n  - slug: a\n    name: B\n    whenToUse: y\n"), /duplicate slug/)
		assert.throws(() => parseRoomodes("\tcustomModes:\n"), /tab characters|content before/)
		// A stray entry outside `customModes:` is parsed as an entry and then fails
		// validation; either refusal is correct, and both are loud.
		assert.throws(() => parseRoomodes("  - slug: a\n"), /missing name|content before/)
	})
})

describe("tokenizer and ranking", () => {
	it("keeps the content words this catalogue discriminates on", () => {
		assert.deepEqual(tokenize("Why does the API fail?"), ["why", "api", "fail"])
		assert.deepEqual(tokenize("CI runs the tests"), ["ci", "run", "test"])
	})

	it("ranks the named entry first and breaks ties by slug", () => {
		const index = buildIndex(entries)
		const ranked = rank(index, "ask beta about widget risk")
		assert.equal(ranked[0].slug, "beta")
		const tied = rank(buildIndex([entries[1], entries[0]]), "widget")
		assert.deepEqual(tied.map((row) => row.slug), ["alpha", "beta"])
	})

	it("returns nothing for a query with no overlap", () => {
		assert.deepEqual(rank(buildIndex(entries), "quarterly payroll forecast"), [])
	})
})

describe("judging and gating", () => {
	const anchors = new Map([
		["alpha", new Set(["alpha"])],
		["beta", new Set(["beta"])],
	])

	it("marks a wrong owner, and records the terms that produced it", () => {
		const index = buildIndex(entries)
		const row = judgeProbe({ id: "p", set: "gate", query: "review the widget", expected: ["alpha"] }, rank(index, "review the widget"), anchors)
		assert.equal(row.top1, "beta")
		assert.equal(row.wrongOwner, true)
		assert.deepEqual(row.top1Matched, ["review", "widget"])
	})

	it("treats an unreachable expectation as coverage, not as a wrong owner", () => {
		const index = buildIndex(entries)
		const row = judgeProbe({ id: "p", set: "gate", query: "help me out here", expected: ["alpha"] }, rank(index, "help me out here"), anchors)
		assert.equal(row.reachable, false)
		assert.equal(row.wrongOwner, false)
	})

	it("fails the gate on an anchored wrong owner and passes on an honest one", () => {
		// alpha repeats "widget" five times, so it outranks beta on a query that
		// names both — the shape a generic line takes when it is over-described.
		const strong = [
			{ slug: "alpha", name: "Alpha", whenToUse: "widget widget widget widget widget" },
			{ slug: "beta", name: "Beta", whenToUse: "a thing about nothing in particular" },
		]
		const catalogue = { entries: strong, digest: "0".repeat(64) }
		const bad = runGate({
			catalogue,
			probes: { probes: [{ id: "bad", set: "gate", query: "beta widget", expected: ["beta"] }] },
		})
		assert.equal(bad.status, "fail")
		assert.deepEqual(bad.breaches.map((breach) => breach.code), ["wrong-owner"])
		assert.equal(bad.summary.gate.anchored, 1)

		const honest = runGate({
			catalogue,
			probes: { probes: [{ id: "good", set: "gate", query: "alpha widget", expected: ["alpha"] }] },
		})
		assert.equal(honest.status, "pass")
		assert.equal(honest.summary.gate.hit1Rate, 1)
	})

	it("never fails on the ambiguous report set", () => {
		const result = runGate({
			catalogue: { entries, digest: "0".repeat(64) },
			probes: { probes: [{ id: "amb", set: "report", query: "alpha widget", expected: ["beta"] }] },
		})
		assert.equal(result.status, "pass")
		assert.equal(result.summary.report.n, 1)
	})

	it("fails when the catalogue digest moved or a top-1 changed", () => {
		const catalogue = { entries, digest: "a".repeat(64) }
		const probes = { probes: [{ id: "good", set: "gate", query: "alpha calibrate", expected: ["alpha"] }] }
		const digestMismatch = runGate({ catalogue, probes, baseline: { catalogueDigest: "b".repeat(64), top1: { good: "alpha" } } })
		assert.equal(digestMismatch.status, "fail")
		assert.ok(digestMismatch.breaches.some((breach) => breach.code === "catalogue-digest-changed"))
		const moved = runGate({ catalogue, probes, baseline: { catalogueDigest: catalogue.digest, top1: { good: "beta" } } })
		assert.equal(moved.status, "fail")
		assert.deepEqual(moved.summary.changedTop1, [{ id: "good", was: "beta", now: "alpha" }])
	})
})
