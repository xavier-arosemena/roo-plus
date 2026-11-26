/**
 * r0-extract.spec.mjs — validates R0's extractor against R2's twenty
 * hand-adjudicated product-form replies, before R0 is allowed to spend anything.
 *
 * Run with: node --test scripts/r0-extract.spec.mjs
 *
 * R2's batch is the only product-form evidence the programme owns: 20 replies,
 * every one read by hand, recorded in adjudication.json. R0 §5.2 says an
 * extractor that cannot reproduce those verdicts has not been validated.
 */

import assert from "node:assert/strict"
import fs from "node:fs"
import { test } from "node:test"

import { pickerLine } from "./lib/framing-pretest.mjs"
import { classifyProductReply, echoesLine } from "./lib/r0-extract.mjs"
import { parseRoomodes } from "./lib/roomodes-lite.mjs"

const RUN = "runs/hidden-intent-screen-2026-11-20"
const TRANSCRIPTS_DIR = `${RUN}/transcripts`

// `runs/**/transcripts/` is gitignored by design (raw model output, not source), so a CI
// checkout never carries it. Without the transcripts the extractor cannot be replayed
// against R2's hand pass, so the four replay tests skip explicitly instead of failing the
// whole scripts run with an ENOENT at import time. The committed `adjudication.json` still
// loads, so the file proves itself structurally even where the replay is unavailable.
const transcriptsAvailable = fs.existsSync(TRANSCRIPTS_DIR)
const transcriptTest = transcriptsAvailable ? test : test.skip

const { entries } = parseRoomodes(fs.readFileSync("test-fixtures/frames/axis-stance.roomodes", "utf8"))
const slugs = new Set(entries.map((entry) => entry.slug))

const adjudication = JSON.parse(fs.readFileSync(`${RUN}/adjudication.json`, "utf8"))
const transcripts = transcriptsAvailable
	? fs
			.readdirSync(TRANSCRIPTS_DIR)
			.sort()
			.map((file) => ({ file, reply: fs.readFileSync(`${TRANSCRIPTS_DIR}/${file}`, "utf8") }))
	: []

transcriptTest("the batch and the adjudication line up, 20 replies", () => {
	assert.equal(transcripts.length, 20)
	assert.equal(adjudication.rows.length, 20)
})

transcriptTest("the extractor reproduces every hand verdict", () => {
	const mismatches = []
	transcripts.forEach(({ file, reply }, index) => {
		const hand = adjudication.rows[index]
		const machine = classifyProductReply(reply, slugs)
		if (machine.verdict !== hand.hand || (hand.slug ?? null) !== (machine.slug ?? null)) {
			mismatches.push(
				`${file}: extractor ${machine.verdict}${machine.slug ? ":" + machine.slug : ""} (${machine.rule}) vs hand ${hand.hand}${hand.slug ? ":" + hand.slug : ""}`,
			)
		}
	})
	assert.deepEqual(mismatches, [], "the extractor must agree with the hand pass, reply for reply")
})

transcriptTest("the one added rule is the one it claims to be", () => {
	// r10-B3 is the only reply v3 leaves unresolved; it must be resolved by the
	// lead-in rule, not by a special case on its id.
	const index = transcripts.findIndex(({ file }) => file === "r10-B3.txt")
	const machine = classifyProductReply(transcripts[index].reply, slugs)
	assert.equal(machine.verdict, "ASK")
	assert.equal(machine.rule, "ask-leadin")
})

test("a lead-in does not override an explicit marker", () => {
	const reply = '**Required information** was not needed.\n\nSelected mode: **"Debug" mode (debug)**'
	assert.equal(classifyProductReply(reply, slugs).verdict, "DECLARATION")
})

test("no signal never becomes a declaration", () => {
	// v3 distinguishes EMPTY from UNRESOLVED; both are "no signal", and neither is
	// a choice. What must not happen is a default.
	for (const reply of ["Understood.", ""]) {
		assert.notEqual(classifyProductReply(reply, slugs).verdict, "DECLARATION")
	}
})

test("the echo guard follows the format it is given", () => {
	const mode = { slug: "slug", name: "Name", whenToUse: "routing line" }
	const product = pickerLine(mode, "product")
	assert.equal(echoesLine(`I pick ${product}`, "product", pickerLine), true, "product echo is recognised as product")
	assert.equal(echoesLine(product, "fixture", pickerLine), false, "a product line is not a fixture echo")
	assert.equal(echoesLine(pickerLine(mode, "fixture"), "fixture", pickerLine), true, "fixture echo still works")
})

// ---------------------------------------------------------------------------
// v4 — the choice written as a label (log §43, F-15). Every rule below is
// anchored on the picker's own vocabulary: a token that is not a slug or a
// display name cannot be read as a mode, which is what stops the rule from
// manufacturing a declaration out of a sentence like "using concrete evidence".
// ---------------------------------------------------------------------------

transcriptTest("the wall still holds when the vocabulary is supplied", () => {
	const mismatches = []
	transcripts.forEach(({ file, reply }, index) => {
		const hand = adjudication.rows[index]
		const machine = classifyProductReply(reply, slugs, entries)
		if (machine.verdict !== hand.hand || (hand.slug ?? null) !== (machine.slug ?? null)) {
			mismatches.push(`${file}: ${machine.verdict} (${machine.rule}) vs hand ${hand.hand}`)
		}
	})
	assert.deepEqual(mismatches, [], "v4 must not disturb a single hand-adjudicated verdict")
})

test("without a vocabulary, no v4 rule can fire", () => {
	// The reply has to defeat v3 the way the real ones do: `code` is a mode name,
	// so "the source code" leaves two candidates and the pinned rule says nothing.
	const label = '**"Explain" mode (explain)**\n\nI want to examine the source code.'
	assert.equal(classifyProductReply(label, slugs).verdict, "UNRESOLVED", "the pinned rule leaves it unresolved")
	assert.equal(classifyProductReply(label, slugs, entries).verdict, "DECLARATION", "v4 reads it with the vocabulary")
})

test("a header followed by a request for the artefact is a declaration", () => {
	// The exact shapes of r0-naming 014, 079 and 019 in the product rendering.
	const quoted = '"Explain" mode (explain)\n\nTo proceed, I need the source code of the module.'
	const bolded = '**"Explain" mode (explain)**\n\nI want to examine the source code and configuration.'
	const explicit = 'To address this request, I will use **"explain" mode**.\n\nI need the source code.'
	for (const reply of [quoted, bolded, explicit]) {
		const machine = classifyProductReply(reply, slugs, entries)
		assert.equal(machine.verdict, "DECLARATION", reply.slice(0, 40))
		assert.equal(machine.slug, "explain", reply.slice(0, 40))
	}
	assert.equal(classifyProductReply(quoted, slugs, entries).rule, "v4-bare-header")
	assert.equal(classifyProductReply(explicit, slugs, entries).rule, "v4-will-use")
})

test("a clarification ask that names a candidate is not a declaration to `code`", () => {
	// r0-naming 032 and 064: "To determine the exact mode … Clarification on whether
	// you need … (`explain`), … (`architecture-reviewer`)". These must stay unresolved;
	// misreading them as a choice of `code` was a defect in the first draft of v4.
	const ask = [
		"I want to understand the design rationale and structural trade-offs of the module.",
		"",
		"To determine the exact mode and complete this analysis, I need:",
		"1. The source code, directory structure, or file paths for the module.",
		"2. Clarification on whether you need a structural review (`architecture-reviewer`) or a trace (`explain`).",
	].join("\n")
	assert.equal(classifyProductReply(ask, slugs, entries).verdict, "UNRESOLVED")
})

test("an ask that precedes the header wins", () => {
	// Position decides, not the mere presence of a marker: this is r10-B3's shape.
	const reply = 'To determine the correct mode, I need the following information:\n1. the code\n\n**"Explain" mode (explain)**'
	assert.equal(classifyProductReply(reply, slugs, entries).verdict, "ASK")
})

test("a bolded bare token on its own line is a declaration", () => {
	const reply = "I want to trace how responsibilities are divided in the source code.\n\n**explain**"
	const machine = classifyProductReply(reply, slugs, entries)
	assert.equal(machine.verdict, "DECLARATION")
	assert.equal(machine.rule, "v4-bare-token")
})

test("the selected-mode list form is a declaration", () => {
	const reply = '**Objective:** understand the layout.\n\n**Selected Mode:**\n- Explain — `explain`\n\nTo continue I need the files.'
	const machine = classifyProductReply(reply, slugs, entries)
	assert.equal(machine.verdict, "DECLARATION")
	assert.equal(machine.slug, "explain")
})

test("a display name maps to its slug", () => {
	const machine = classifyProductReply('**"Architecture Reviewer" mode (architecture-reviewer)**', slugs, entries)
	assert.equal(machine.verdict, "DECLARATION")
	assert.equal(machine.slug, "architecture-reviewer")
})

test("prose is never a declaration, however much it looks like one", () => {
	// The false positive that motivated the vocabulary anchor: "using concrete" is
	// not a mode, so the sentence announces nothing.
	const prose = "I want to map the module by using concrete evidence from its implementation."
	for (const reply of [prose, "I am using concrete evidence.", "Understood.", ""]) {
		assert.notEqual(classifyProductReply(reply, slugs, entries).verdict, "DECLARATION", reply)
	}
})

test("an unknown quoted token is not a mode", () => {
	const machine = classifyProductReply('**"Concretiser" mode (concretiser)**', slugs, entries)
	assert.equal(machine.verdict, "UNRESOLVED")
})
