import test from "node:test"
import assert from "node:assert/strict"

import { buildDataset } from "../src/dataset.mjs"
import { handleSummaryRequest } from "../src/httpHandler.mjs"

const reference = {
	tiers: [
		{ id: "T01", discountBps: 0 },
		{ id: "T02", discountBps: 500 },
	],
	customers: [
		{ id: "C00001", region: "north", tierId: "T02" },
		{ id: "C00002", region: "south", tierId: "T01" },
	],
	products: [
		{ id: "P00001", category: "hardware", unitCents: 1000 },
		{ id: "P00002", category: "software", unitCents: 250 },
	],
	orders: [
		{ id: "O1", customerId: "C00001", productId: "P00001", quantity: 2, channel: "web" },
		{ id: "O2", customerId: "C00002", productId: "P00002", quantity: 4, channel: "phone" },
		{ id: "O3", customerId: "C00002", productId: "P00001", quantity: 1, channel: "web" },
	],
}

test("GET /summary answers with every region, largest earner first", () => {
	const response = handleSummaryRequest({ method: "GET", url: "/summary" }, reference)

	assert.equal(response.status, 200)
	assert.deepStrictEqual(
		response.body.regions.map((region) => [region.region, region.netCents]),
		[
			["south", 2000],
			["north", 1900],
		],
	)
	assert.equal(response.body.totals.orders, 3)
})

test("GET /summary narrows the batch to one channel", () => {
	const response = handleSummaryRequest({ method: "GET", url: "/summary?channel=web" }, reference)

	assert.equal(response.status, 200)
	assert.deepStrictEqual(
		response.body.regions.map((region) => region.region),
		["north", "south"],
	)
	assert.equal(response.body.totals.orders, 2)
	assert.equal(response.body.totals.netCents, 1900 + 1000)
})

test("unknown paths, unknown methods and unusable urls are refused", () => {
	assert.equal(handleSummaryRequest({ method: "GET", url: "/totals" }, reference).status, 404)
	assert.equal(handleSummaryRequest({ method: "POST", url: "/summary" }, reference).status, 405)
	assert.equal(handleSummaryRequest({ method: "GET", url: "http://[" }, reference).status, 400)
})

test("the sample data is reproducible from its seed", () => {
	const first = buildDataset({ customers: 40, products: 25, orders: 60 })
	const second = buildDataset({ customers: 40, products: 25, orders: 60 })

	assert.deepStrictEqual(first.orders, second.orders)
	assert.deepStrictEqual(first.customers, second.customers)
	assert.deepStrictEqual(first.products, second.products)
	assert.equal(first.orders.length, 60)
})
