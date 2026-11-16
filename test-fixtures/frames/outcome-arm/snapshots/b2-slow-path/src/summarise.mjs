import { stats } from "./stats.mjs"

/**
 * Reference rows are addressed by their `id` column.
 */
function resolve(rows, id) {
	for (let index = 0; index < rows.length; index += 1) {
		stats.comparisons += 1

		if (rows[index].id === id) {
			return rows[index]
		}
	}

	return null
}

const byCategory = (left, right) => right[1] - left[1] || (left[0] < right[0] ? -1 : 1)

const byNet = (left, right) => right.netCents - left.netCents || (left.region < right.region ? -1 : 1)

/**
 * One summary per region, busiest earner first, plus the totals for the batch.
 */
export function summarise(orders, reference) {
	const { customers, products, tiers } = reference
	const buckets = new Map()
	const missing = { customers: 0, products: 0 }

	let included = 0
	let units = 0
	let grossCents = 0
	let discountCents = 0

	for (const order of orders) {
		const customer = resolve(customers, order.customerId)

		if (!customer) {
			missing.customers += 1
			continue
		}

		const product = resolve(products, order.productId)

		if (!product) {
			missing.products += 1
			continue
		}

		const tier = resolve(tiers, customer.tierId)
		const gross = product.unitCents * order.quantity
		const discount = tier ? Math.round((gross * tier.discountBps) / 10000) : 0

		let bucket = buckets.get(customer.region)

		if (!bucket) {
			bucket = {
				region: customer.region,
				orders: 0,
				units: 0,
				grossCents: 0,
				discountCents: 0,
				netCents: 0,
				byCategory: new Map(),
			}

			buckets.set(customer.region, bucket)
		}

		bucket.orders += 1
		bucket.units += order.quantity
		bucket.grossCents += gross
		bucket.discountCents += discount
		bucket.netCents += gross - discount
		bucket.byCategory.set(product.category, (bucket.byCategory.get(product.category) ?? 0) + order.quantity)

		included += 1
		units += order.quantity
		grossCents += gross
		discountCents += discount
	}

	const regions = [...buckets.values()]
		.map((bucket) => ({
			region: bucket.region,
			orders: bucket.orders,
			units: bucket.units,
			grossCents: bucket.grossCents,
			discountCents: bucket.discountCents,
			netCents: bucket.netCents,
			topCategory: [...bucket.byCategory.entries()].sort(byCategory)[0][0],
		}))
		.sort(byNet)

	return {
		regions,
		totals: {
			orders: included,
			units,
			grossCents,
			discountCents,
			netCents: grossCents - discountCents,
		},
		missing,
	}
}
