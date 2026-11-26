import assert from "node:assert/strict"
import { test } from "node:test"

import { PICKER_FORMATS, echoLineFor, pickerLine, pickerTextFor } from "./lib/framing-pretest.mjs"

/**
 * R0 (log §32): the picker form the experiments rendered is not the form the
 * extension emits. These tests pin both forms byte-for-byte, and pin the two
 * order variants that keep field order separable from template.
 */

const MODE = { slug: "explain", name: "Explain", whenToUse: "Use when the answer must cite evidence." }
const SECOND = { slug: "code", name: "Code", whenToUse: "Use when specified behaviour must be implemented." }

test("the default format is byte-identical to the form E13/E20 rendered", () => {
	assert.equal(pickerLine(MODE), "- explain — Explain — Use when the answer must cite evidence.")
	assert.equal(pickerLine(MODE, "fixture"), pickerLine(MODE))
	assert.equal(pickerTextFor([MODE]), "- explain — Explain — Use when the answer must cite evidence.\n")
})

test("the product format is byte-identical to the extension's template", () => {
	// src/core/prompts/sections/modes.ts:33 — `  * "${name}" mode (${slug}) - ${description}`
	assert.equal(pickerLine(MODE, "product"), `  * "Explain" mode (explain) - Use when the answer must cite evidence.`)
})

test("field order varies independently of the template", () => {
	assert.equal(
		pickerLine(MODE, "fixture-name-first"),
		"- Explain — explain — Use when the answer must cite evidence.",
	)
	assert.equal(
		pickerLine(MODE, "product-slug-first"),
		`  * "explain" mode (Explain) - Use when the answer must cite evidence.`,
	)
})

test("only the product family carries the MODES heading", () => {
	for (const format of ["fixture", "fixture-name-first"]) {
		const text = pickerTextFor([MODE], format)
		assert.ok(!text.includes("MODES"), `${format} must not carry a heading`)
		assert.ok(!text.startsWith("===="), `${format} must not carry the block delimiter`)
	}
	const product = pickerTextFor([MODE], "product")
	assert.ok(product.startsWith("====\n\nMODES\n"), "product form opens the MODES block")
	assert.ok(
		product.includes("- These are the currently available modes:"),
		"product form carries the introduction line the extension emits",
	)
	assert.ok(
		pickerTextFor([MODE], "product-slug-first").startsWith("===="),
		"the heading follows the template, not the order",
	)
})

test("every format carries all three fields once per mode", () => {
	for (const format of PICKER_FORMATS) {
		const text = pickerTextFor([MODE, SECOND], format)
		// `product-slug-only` intentionally renders no display name, so the name check
		// does not apply to it. Everything else must carry all three fields.
		const needles =
			format === "product-slug-only"
				? ["explain", "evidence.", "code", "implemented."]
				: ["explain", "Explain", "evidence.", "code", "Code", "implemented."]
		for (const needle of needles) {
			assert.ok(text.includes(needle), `${format} lost ${needle}`)
		}
		// One rendered entry per mode, counted by a marker that only an entry can
		// satisfy: the product introduction line also starts with "- ", so a prefix
		// test alone would count it as an entry.
		const entries = text
			.split("\n")
			// `product-slug-only` renders `* "slug" mode - line`, with no parenthetical,
			// so the entry marker cannot require one.
			.filter((line) => (format.startsWith("product") ? /mode\s*[(-]/.test(line) : /^- .+ — .+ — /.test(line)))
		assert.equal(entries.length, 2, `${format} should render exactly two entries`)
	}
})

test("an unknown format fails closed rather than falling back", () => {
	assert.throws(() => pickerLine(MODE, "dash"), /unknown picker format/)
	assert.throws(() => pickerTextFor([MODE], "dash"), /unknown picker format/)
})

test("the echo reference follows the format", () => {
	const sample = { slug: "slug", name: "Name", whenToUse: "routing line" }
	for (const format of PICKER_FORMATS) {
		assert.equal(echoLineFor(format), pickerLine(sample, format), `${format} echo reference drifted`)
	}
	assert.notEqual(echoLineFor("fixture"), echoLineFor("product"))
})
