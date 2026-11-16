import { readFileSync } from "node:fs"

export const SEVERITIES = ["critical", "error", "warning", "info"]

const DATA_FILE = new URL("../data/events.json", import.meta.url)

export function loadEvents(file = DATA_FILE) {
	return parseEvents(JSON.parse(readFileSync(file, "utf8")))
}

export function parseEvents(document) {
	if (!document || !Array.isArray(document.events)) {
		throw new TypeError("events document must contain an events array")
	}

	return document.events.map(toEvent)
}

function toEvent(raw, index) {
	if (!raw || typeof raw.at !== "string" || Number.isNaN(Date.parse(raw.at))) {
		throw new TypeError(`event ${index} has no usable timestamp`)
	}

	if (!SEVERITIES.includes(raw.severity)) {
		throw new TypeError(`event ${index} has unknown severity: ${String(raw.severity)}`)
	}

	return Object.freeze({
		id: String(raw.id ?? `evt-${index}`),
		at: raw.at,
		severity: raw.severity,
		service: String(raw.service ?? "unknown"),
	})
}
