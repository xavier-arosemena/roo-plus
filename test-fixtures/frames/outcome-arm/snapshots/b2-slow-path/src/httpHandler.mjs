import { getDataset } from "./dataset.mjs"
import { summarise } from "./summarise.mjs"

const BASE = "http://summary.invalid"
const SUMMARY_PATH = "/summary"

/**
 * GET /summary[?channel=web|phone|reseller]
 *
 * The handler is the only entry point that decides which slice of the batch is
 * summarised; the aggregation itself lives in `summarise`.
 */
export function handleSummaryRequest(request, reference) {
	const method = request?.method ?? "GET"

	if (method !== "GET") {
		return { status: 405, body: { error: "method not allowed" } }
	}

	let url

	try {
		url = new URL(String(request?.url ?? SUMMARY_PATH), BASE)
	} catch {
		return { status: 400, body: { error: "bad request url" } }
	}

	if (url.pathname !== SUMMARY_PATH) {
		return { status: 404, body: { error: "not found" } }
	}

	const dataset = reference ?? getDataset()
	const channel = url.searchParams.get("channel")
	const orders = channel ? dataset.orders.filter((order) => order.channel === channel) : dataset.orders

	return { status: 200, body: summarise(orders, dataset) }
}
