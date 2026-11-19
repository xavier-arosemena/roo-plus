const REGIONS = ["north", "south", "east", "west", "central"]
const CATEGORIES = ["hardware", "software", "services", "training", "support"]
const CHANNELS = ["web", "phone", "reseller"]
const TIER_DISCOUNT_BPS = [0, 250, 500, 1000, 1500]

const pad = (value, width) => String(value).padStart(width, "0")
const pick = (next, list) => list[Math.floor(next() * list.length)]
const between = (next, low, high) => low + Math.floor(next() * (high - low + 1))

/**
 * Small deterministic PRNG (mulberry32). Same seed, same sequence, every run
 * and every machine — the sample data must not depend on the clock.
 */
export function mulberry32(seed) {
	let state = seed >>> 0

	return function next() {
		state = (state + 0x6d2b79f5) >>> 0
		let value = state
		value = Math.imul(value ^ (value >>> 15), value | 1)
		value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
		return ((value ^ (value >>> 14)) >>> 0) / 4294967296
	}
}

/**
 * Reference tables plus a batch of orders. The sizes and the seed are the
 * fixture: every caller that does not pass options gets the same data.
 */
export function buildDataset(options = {}) {
	const seed = options.seed ?? 1234
	const customerCount = options.customers ?? 5000
	const productCount = options.products ?? 4000
	const orderCount = options.orders ?? 70000

	const next = mulberry32(seed)

	const tiers = TIER_DISCOUNT_BPS.map((discountBps, index) =>
		Object.freeze({ id: `T${pad(index + 1, 2)}`, discountBps }),
	)

	const customers = []

	for (let index = 0; index < customerCount; index += 1) {
		customers.push(
			Object.freeze({
				id: `C${pad(index + 1, 5)}`,
				region: pick(next, REGIONS),
				tierId: pick(next, tiers).id,
				since: 2016 + (index % 9),
			}),
		)
	}

	const products = []

	for (let index = 0; index < productCount; index += 1) {
		products.push(
			Object.freeze({
				id: `P${pad(index + 1, 5)}`,
				category: pick(next, CATEGORIES),
				unitCents: between(next, 199, 249999),
			}),
		)
	}

	const orders = []

	for (let index = 0; index < orderCount; index += 1) {
		orders.push(
			Object.freeze({
				id: `O${pad(index + 1, 6)}`,
				customerId: pick(next, customers).id,
				productId: pick(next, products).id,
				quantity: between(next, 1, 12),
				channel: pick(next, CHANNELS),
			}),
		)
	}

	return Object.freeze({ customers, products, tiers, orders })
}

let cached = null

/** The serving process loads its reference tables once. */
export function getDataset() {
	if (!cached) {
		cached = buildDataset()
	}

	return cached
}
