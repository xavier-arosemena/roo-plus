import { dayKey } from "./dates.mjs"
import { SEVERITIES } from "./events.mjs"

function emptyBucket(day) {
	const bySeverity = {}

	for (const severity of SEVERITIES) {
		bySeverity[severity] = 0
	}

	return { day, total: 0, bySeverity }
}

export function rollupByDay(events) {
	const buckets = new Map()

	for (const event of events) {
		const day = dayKey(event.at)
		let bucket = buckets.get(day)

		if (!bucket) {
			bucket = emptyBucket(day)
			buckets.set(day, bucket)
		}

		bucket.total += 1
		bucket.bySeverity[event.severity] += 1
	}

	return [...buckets.values()].sort(compareBuckets)
}

function compareBuckets(left, right) {
	if (left.total !== right.total) {
		return right.total - left.total
	}

	if (left.day === right.day) {
		return 0
	}

	return left.day < right.day ? -1 : 1
}

export function busiestDay(rollup) {
	return rollup.length > 0 ? rollup[0].day : null
}
