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
const { entries } = parseRoomodes(fs.readFileSync("test-fixtures/frames/axis-stance.roomodes", "utf8"))
const slugs = new Set(entries.map((entry) => entry.slug))

const adjudication = JSON.parse(fs.readFileSync(`${RUN}/adjudication.json`, "utf8"))
const transcripts = fs
	.readdirSync(`${RUN}/transcripts`)
	.sort()
	.map((file) => ({ file, reply: fs.readFileSync(`${RUN}/transcripts/${file}`, "utf8") }))

test("the batch and the adjudication line up, 20 replies", () => {
	assert.equal(transcripts.length, 20)
	assert.equal(adjudication.rows.length, 20)
})

test("the extractor reproduces every hand verdict", () => {
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

test("the one added rule is the one it claims to be", () => {
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
