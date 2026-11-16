import test from "node:test"
import assert from "node:assert/strict"

import { loadEvents } from "../src/events.mjs"
import { rollupByDay, busiestDay } from "../src/rollup.mjs"

const events = loadEvents()
const rollup = rollupByDay(events)

test("every incident event is reported exactly once", () => {
	const reported = rollup.reduce((sum, bucket) => sum + bucket.total, 0)

	assert.equal(reported, events.length)
})

test("incident days are listed busiest first", () => {
	assert.deepStrictEqual(
		rollup.map((bucket) => bucket.day),
		["2026-10-01", "2026-10-02", "2026-10-03"],
	)
})

test("incident days carry their event totals", () => {
	assert.deepStrictEqual(
		rollup.map((bucket) => [bucket.day, bucket.total]),
		[
			["2026-10-01", 4],
			["2026-10-02", 3],
			["2026-10-03", 1],
		],
	)
})

test("incident days break down by severity", () => {
	assert.deepStrictEqual(rollup, [
		{ day: "2026-10-01", total: 4, bySeverity: { critical: 1, error: 1, warning: 2, info: 0 } },
		{ day: "2026-10-02", total: 3, bySeverity: { critical: 0, error: 1, warning: 1, info: 1 } },
		{ day: "2026-10-03", total: 1, bySeverity: { critical: 0, error: 0, warning: 0, info: 1 } },
	])
})

test("the busiest day is the one reported first", () => {
	assert.equal(busiestDay(rollup), "2026-10-01")
})
