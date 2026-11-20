/**
 * hidden-intent-screen.spec.mjs — pins the screen's construction and its counting rule.
 *
 * Run with: node --test scripts/hidden-intent-screen.spec.mjs
 *
 * WHY THE CLASSIFIER CASES ARE ALL REAL REPLIES
 *   v1 of the rule agreed with the hand pass on 15 of 20 replies and failed in
 *   both directions: it missed `Selected mode: **"Explain" mode (explain)**`
 *   (no `<slug> mode` adjacency) and it scored an ask as a declaration because
 *   the asker wrote "source code" and the lower-case matcher saw `code`. v2 then
 *   over-corrected: "without needing to ask for clarification" was scored as a
 *   question. Every case below is one of those replies, trimmed. A rule that is
 *   only tested on invented strings learns nothing about what models write.
 */

import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

import { buildScreen, classify, productPickerLine } from "./hidden-intent-screen.mjs"
import { parseRoomodes } from "./lib/roomodes-lite.mjs"
import { fixedPersona } from "./lib/routing-round.mjs"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const CATALOGUE = path.join(ROOT, "test-fixtures/frames/axis-stance.roomodes")
const BRIEFS = JSON.parse(readFileSync(path.join(ROOT, "test-fixtures/hidden-intent/briefs.json"), "utf8"))
const slugs = new Set(parseRoomodes(readFileSync(CATALOGUE, "utf8")).entries.map((entry) => entry.slug))

describe("buildScreen", () => {
	const screen = buildScreen({ catalogueText: readFileSync(CATALOGUE, "utf8"), briefs: BRIEFS, persona: fixedPersona() })

	it("interleaves ten hidden-intent briefs with ten control draws", () => {
		assert.equal(screen.runs.length, 20)
		assert.deepEqual(screen.runs.slice(0, 4).map((run) => run.arm), ["hidden-intent", "control", "hidden-intent", "control"])
		assert.equal(new Set(screen.runs.map((run) => run.promptSha256)).size, 11)
		assert.equal(new Set(screen.runs.map((run) => run.runId)).size, 20)
	})

	it("renders the product line, not the fixture line", () => {
		const prompt = screen.runs[0].prompt
		assert.ok(prompt.includes('  * "Requirements" mode (requirements) - '))
		assert.ok(!/\n- [a-z-]+ — /.test(prompt), "the fixture dash form must not appear")
		assert.equal(productPickerLine({ name: "Debug", slug: "debug", whenToUse: "line" }), '  * "Debug" mode (debug) - line')
	})

	it("carries the standing request once and the brief once", () => {
		const prompt = screen.runs[0].prompt
		assert.equal(prompt.split("Pick exactly one mode").length, 2)
		assert.equal(prompt.split(BRIEFS.briefs[0].brief).length, 2)
	})
})

describe("classify", () => {
	it("reads a bare slug and a Mode marker as declarations", () => {
		assert.deepEqual(classify("explain", slugs), { verdict: "DECLARATION", slug: "explain" })
		assert.deepEqual(classify('Selected mode: **"Explain" mode (explain)**', slugs), { verdict: "DECLARATION", slug: "explain" })
		assert.deepEqual(classify('**Selected Mode:**\n"Explain" mode (explain)', slugs), { verdict: "DECLARATION", slug: "explain" })
		assert.deepEqual(classify('**Mode:** "Performance" mode (performance)', slugs), { verdict: "DECLARATION", slug: "performance" })
	})

	it("reads a question, and a candidate list without a question mark, as an ask", () => {
		assert.equal(classify("Which mode fits? Is it debug or devops?", slugs).verdict, "ASK")
		assert.equal(classify("To determine the correct mode, I need the following information:\n1. logs\n2. scope", slugs).verdict, "ASK")
		assert.equal(classify("I need additional context: pricing, invoicing, or contract terms?", slugs).verdict, "ASK")
	})

	it("does not treat a goal statement as an ask", () => {
		const reply = 'I want to update the documentation so readers can operate the system without needing to ask for clarification.\n\n**Mode:** "Documentation" mode (documentation)'
		assert.deepEqual(classify(reply, slugs), { verdict: "DECLARATION", slug: "documentation" })
	})

	it("never promotes a mention to a declaration", () => {
		const reply = "To select the appropriate mode I need the module or source code, and whether you want Architect, Architecture Reviewer, Codebase Cartographer or Explain."
		const result = classify(reply, slugs)
		assert.notEqual(result.verdict, "DECLARATION")
	})

	it("leaves a reply it cannot read unresolved rather than guessing", () => {
		assert.equal(classify("Here is a plan with code and architect mentions.", slugs).verdict, "UNRESOLVED")
		assert.equal(classify("", slugs).verdict, "EMPTY")
	})
})
