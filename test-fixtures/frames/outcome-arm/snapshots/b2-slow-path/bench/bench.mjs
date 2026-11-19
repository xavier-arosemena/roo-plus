import { getDataset } from "../src/dataset.mjs"
import { handleSummaryRequest } from "../src/httpHandler.mjs"
import { resetStats, stats } from "../src/stats.mjs"

const REQUEST = { method: "GET", url: "/summary" }

const dataset = getDataset()

// One untimed call so the first run does not pay for lazy module work.
handleSummaryRequest(REQUEST, dataset)

resetStats()

const startedAt = process.hrtime.bigint()
const response = handleSummaryRequest(REQUEST, dataset)
const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1e6

if (response.status !== 200) {
	console.error(`bench: unexpected status ${response.status}`)
	process.exit(1)
}

console.log(
	`bench orders=${dataset.orders.length} work=${stats.comparisons} elapsed_ms=${elapsedMs.toFixed(1)} net_cents=${response.body.totals.netCents}`,
)
