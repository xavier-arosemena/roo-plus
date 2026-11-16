import test from "node:test"
import assert from "node:assert/strict"

import { COLUMN_ORDER } from "../src/internal/columnTable.mjs"
import { LAYOUT_COLUMNS } from "../src/internal/layoutTable.mjs"
import { parseLabel, columnOrder } from "../src/labels.mjs"

const WIDE_LINE = "w|2026-02-01T09:00:00Z|d3|LBL-1042|SKU-7781|2|750g"

test("both tables hold the same six fields", () => {
	assert.equal(COLUMN_ORDER.length, LAYOUT_COLUMNS.length)
	assert.deepStrictEqual([...COLUMN_ORDER].sort(), [...LAYOUT_COLUMNS].sort())
})

test("the two tables do not hold those fields in the same order", () => {
	assert.notDeepStrictEqual([...COLUMN_ORDER], [...LAYOUT_COLUMNS])
})

test("the facade republishes the record order unchanged", () => {
	assert.deepStrictEqual(columnOrder, COLUMN_ORDER)
})

test("records come back in the record order, not the ingest order", () => {
	const record = parseLabel(WIDE_LINE)

	assert.deepStrictEqual(Object.keys(record), COLUMN_ORDER)
	assert.notDeepStrictEqual(Object.keys(record), LAYOUT_COLUMNS)
})

test("every column of the ingest order survives the round trip", () => {
	const record = parseLabel(WIDE_LINE)

	for (const field of LAYOUT_COLUMNS) {
		assert.notEqual(record[field], undefined)
	}
})
