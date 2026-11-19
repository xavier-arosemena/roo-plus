import test from "node:test"
import assert from "node:assert/strict"

import { parseLabel, scanRecord, columnOrder } from "../src/labels.mjs"

const DEFAULT_LINE = "p|LBL-1041|SKU-7781|3|1500g|d3|2026-02-01T08:15:00Z"
const WIDE_LINE = "w|2026-02-01T09:00:00Z|d3|LBL-1042|SKU-7781|2|750g"

test("a default record comes back field by field", () => {
	assert.deepStrictEqual(parseLabel(DEFAULT_LINE), {
		ref: "LBL-1041",
		sku: "SKU-7781",
		qty: 3,
		weight_g: 1500,
		dock: "d3",
		scanned_at: "2026-02-01T08:15:00.000Z",
	})
})

test("a wide record is mapped by its own column order", () => {
	assert.deepStrictEqual(parseLabel(WIDE_LINE), {
		ref: "LBL-1042",
		sku: "SKU-7781",
		qty: 2,
		weight_g: 750,
		dock: "D3",
		scanned_at: "2026-02-01T09:00:00.000Z",
	})
})

test("the returned keys are always in the documented order", () => {
	assert.deepStrictEqual(Object.keys(parseLabel(DEFAULT_LINE)), columnOrder)
	assert.deepStrictEqual(Object.keys(parseLabel(WIDE_LINE)), columnOrder)
})

test("a weight with a decimal comma is read per layout", () => {
	assert.equal(parseLabel("p|LBL-1|SKU-1|1|1,5kg|d1|2026-02-01T08:15:00Z").weight_g, 15)
	assert.equal(parseLabel("w|2026-02-01T08:15:00Z|d1|LBL-1|SKU-1|1|1,5kg").weight_g, 1500)
})

test("the leading marker must select a known layout", () => {
	assert.throws(() => parseLabel(""), /empty record/)
	assert.throws(() => parseLabel("x|a|b|c|d|e|f"), /unknown layout marker/)
	assert.throws(() => parseLabel("p|a|b"), /expected 6 fields/)
	assert.throws(() => parseLabel("w|a|b"), /expected 6 fields/)
})

test("scanRecord is only usable on the default layout", () => {
	assert.equal(scanRecord(DEFAULT_LINE).qty, 3)
	assert.throws(() => scanRecord(WIDE_LINE), /unknown layout marker/)
})
