/**
 * reach-corpus.spec.mjs — polices the E24 reach corpus as it is authored.
 *
 * Run with: node --test scripts/reach-corpus.spec.mjs
 *
 * WHAT IS PINNED, AND WHY EACH ONE MATTERS
 *   1. The corpus names a **job**, never a slug, and its `owner` is the job's
 *      owner in the axis x stance frame. A corpus keyed by modes would measure
 *      the catalogue's own vocabulary, which is the defect the reach test exists
 *      to expose.
 *   2. **No probe contains the name or slug of the mode that owns it.** This is
 *      the load-bearing rule: a probe carrying the owner's word is reachable by
 *      construction, and including one would inflate reachability invisibly.
 *   3. `owner: null` is legal and means the frame assigns that job no owner. It
 *      is a coverage gap to report, never a corpus defect to paper over — B9 is
 *      the first one, and it is exactly the kind of row D-5 needs.
 *   4. Every job in an axis marked complete carries at least four probes, so
 *      "axis complete" cannot be claimed on a partial authoring pass.
 */

import assert from "node:assert/strict"
import fs from "node:fs"
import { test } from "node:test"

import { parseRoomodes } from "./lib/roomodes-lite.mjs"

const CORPUS = "test-fixtures/reach/probes.json"
const CATALOGUE = "test-fixtures/frames/axis-stance.roomodes"

const corpus = JSON.parse(fs.readFileSync(CORPUS, "utf8"))
const { entries, digest } = parseRoomodes(fs.readFileSync(CATALOGUE, "utf8"))
const bySlug = new Map(entries.map((entry) => [entry.slug, entry]))

const probes = corpus.probes

test("the corpus declares its schema, registration and catalogue", () => {
	assert.equal(corpus.schema, "reach-probes/1")
	assert.equal(corpus.registration, "docs/reviews/2026-11-20-e24-reach-preregistration.md")
	assert.equal(corpus.catalogue, CATALOGUE)
	assert.ok(corpus.rule.includes("neither the name nor the slug"))
})

test("the catalogue it will be measured against is digest-addressable", () => {
	// Borrowed from ECC (review §A5, B2): a corpus bound to an unnamed catalogue
	// can silently change its own meaning. 45 entries, one digest, both recorded.
	assert.match(digest, /^[0-9a-f]{64}$/)
	assert.equal(entries.length, 45, "the axis x stance frame is the 45-entry catalogue")
})

test("every probe carries a job, an axis, an owner decision and a request", () => {
	for (const probe of probes) {
		for (const field of ["id", "jobId", "axis", "request", "note"]) {
			assert.ok(probe[field], `${probe.id ?? "?"} is missing ${field}`)
		}
		assert.ok("owner" in probe, `${probe.id} has no owner field; null must be explicit`)
		assert.match(probe.jobId, /^[A-Z]\d+$/, `${probe.id} has a malformed jobId`)
		assert.match(probe.axis, /^[A-Z]{3}$/, `${probe.id} has a malformed axis`)
		assert.match(probe.id, /^[a-z]{3}-[a-z]\d+-\d{2}$/, `${probe.id} does not follow axis-job-index`)
		assert.ok(
			probe.request.length >= 20 && probe.request.length <= 200,
			`${probe.id} is outside the 20-200 char range`,
		)
	}
})

test("ids are unique and each job has at least four probes", () => {
	const ids = probes.map((probe) => probe.id)
	assert.equal(new Set(ids).size, ids.length, "duplicate probe id")

	const perJob = new Map()
	for (const probe of probes) perJob.set(probe.jobId, (perJob.get(probe.jobId) ?? 0) + 1)
	for (const [jobId, count] of perJob) {
		assert.ok(count >= 4, `${jobId} has ${count} probes; the registration asks for 4-6`)
	}
	for (const axis of corpus.axesComplete) {
		assert.ok(
			probes.some((probe) => probe.axis === axis),
			`${axis} is marked complete but has no probes`,
		)
	}
})

test("every non-null owner exists in the catalogue it will be measured against", () => {
	for (const probe of probes) {
		if (probe.owner === null) continue
		assert.ok(bySlug.has(probe.owner), `${probe.id} names an owner absent from the catalogue: ${probe.owner}`)
	}
})

test("no probe contains the name or slug of the mode that owns it", () => {
	for (const probe of probes) {
		if (probe.owner === null) continue
		const mode = bySlug.get(probe.owner)
		const haystack = probe.request.toLowerCase()
		const offenders = [mode.slug, mode.name]
			.filter(Boolean)
			.map((term) => term.toLowerCase())
			// a word boundary on each side: "debugger" in a probe is fine, "debug" is not
			.filter((term) =>
				new RegExp(`(^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`).test(haystack),
			)
		assert.deepEqual(
			offenders,
			[],
			`${probe.id} contains the owner's own vocabulary (${offenders.join(", ")}), so it is reachable by construction`,
		)
	}
})

test("a null owner is recorded as a coverage gap, not as a missing decision", () => {
	const unowned = probes.filter((probe) => probe.owner === null)
	for (const probe of unowned) {
		assert.match(probe.note, /no owner/i, `${probe.id} must say in its note why no owner was assigned`)
	}
})

test("every probe declares how its wording was sourced", () => {
	const allowed = corpus.authoring?.sourceValues ?? []
	assert.ok(allowed.length > 0, "the corpus must declare its permitted authoring sources")
	for (const probe of probes) {
		assert.ok(allowed.includes(probe.source), `${probe.id} has source ${JSON.stringify(probe.source)}`)
	}
})

test("the owner is derived from the frame, not chosen by the author", () => {
	// owners.json is the frame's 'Jobs owned' column reduced to jobId -> slugs. A
	// corpus that re-derives ownership by reading the lines would launder the
	// catalogue's vocabulary back into its own probes.
	const owners = JSON.parse(fs.readFileSync("test-fixtures/reach/owners.json", "utf8"))
	for (const probe of probes) {
		const mapped = owners.map[probe.jobId]
		if (mapped === undefined) continue // an axis not yet mapped; the authoring task extends owners.json
		if (mapped.length === 0) {
			assert.equal(
				probe.owner,
				null,
				`${probe.id}: the frame assigns ${probe.jobId} no owner, so owner must be null`,
			)
		} else {
			assert.ok(
				mapped.includes(probe.owner),
				`${probe.id}: owner ${probe.owner} is not what the frame assigns (${mapped.join(", ")})`,
			)
		}
	}
})

test("the axis lists are disjoint and cover the twelve axes", () => {
	const done = new Set(corpus.axesComplete)
	const pending = new Set(corpus.axesPending)
	for (const axis of done) assert.ok(!pending.has(axis), `${axis} is both complete and pending`)
	assert.equal(done.size + pending.size, 12, "the inventory has twelve job axes")
})
