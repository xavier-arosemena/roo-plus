import test from "node:test"
import assert from "node:assert/strict"

import { summarise } from "../src/summarise.mjs"

function sampleOrders() {
	return [
		{ id: "O1", customerId: "C00001", productId: "P00001", quantity: 2, channel: "web" },
		{ id: "O2", customerId: "C00002", productId: "P00002", quantity: 4, channel: "phone" },
		{ id: "O3", customerId: "C00003", productId: "P00001", quantity: 1, channel: "web" },
		{ id: "O4", customerId: "C00001", productId: "P00002", quantity: 4, channel: "reseller" },
		{ id: "O5", customerId: "C00009", productId: "P00001", quantity: 1, channel: "web" },
		{ id: "O6", customerId: "C00002", productId: "P00009", quantity: 1, channel: "web" },
	]
}

function sampleReference() {
	return {
		tiers: [
			{ id: "T01", discountBps: 0 },
			{ id: "T02", discountBps: 500 },
		],
		customers: [
			{ id: "C00001", region: "north", tierId: "T02" },
			{ id: "C00002", region: "south", tierId: "T01" },
			{ id: "C00003", region: "north", tierId: "T01" },
		],
		products: [
			{ id: "P00001", category: "hardware", unitCents: 1000 },
			{ id: "P00002", category: "software", unitCents: 250 },
		],
	}
}

test("each region is reported once, busiest earner first", () => {
	const summary = summarise(sampleOrders(), sampleReference())

	assert.deepStrictEqual(summary.regions, [
		{
			region: "north",
			orders: 3,
			units: 7,
			grossCents: 4000,
			discountCents: 150,
			netCents: 3850,
			topCategory: "software",
		},
		{
			region: "south",
			orders: 1,
			units: 4,
			grossCents: 1000,
			discountCents: 0,
			netCents: 1000,
			topCategory: "software",
		},
	])
})

test("totals cover every order that resolved", () => {
	const summary = summarise(sampleOrders(), sampleReference())

	assert.deepStrictEqual(summary.totals, {
		orders: 4,
		units: 11,
		grossCents: 5000,
		discountCents: 150,
		netCents: 4850,
	})
})

test("orders that point at missing reference rows are counted, not billed", () => {
	const summary = summarise(sampleOrders(), sampleReference())

	assert.deepStrictEqual(summary.missing, { customers: 1, products: 1 })
})

test("an empty batch produces no regions and zero totals", () => {
	const summary = summarise([], sampleReference())

	assert.deepStrictEqual(summary, {
		regions: [],
		totals: { orders: 0, units: 0, grossCents: 0, discountCents: 0, netCents: 0 },
		missing: { customers: 0, products: 0 },
	})
})
