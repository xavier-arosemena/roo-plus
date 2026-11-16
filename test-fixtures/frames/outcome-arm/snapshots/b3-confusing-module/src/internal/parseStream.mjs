import { COLUMN_ORDER } from "./columnTable.mjs"

const DEFAULT_MARKER = "p"

function toInteger(text, field) {
	const value = Number.parseInt(text, 10)

	if (!Number.isFinite(value)) {
		throw new TypeError(`${field} is not an integer: ${text}`)
	}

	return value
}

function toWeightGrams(text) {
	const digits = String(text).replace(/[^0-9]/g, "")

	return digits === "" ? 0 : Number.parseInt(digits, 10)
}

function toTimestamp(text) {
	const parsed = Date.parse(text)

	if (Number.isNaN(parsed)) {
		throw new TypeError(`scanned_at is not a timestamp: ${text}`)
	}

	return new Date(parsed).toISOString()
}

function readField(field, cell) {
	switch (field) {
		case "qty":
			return toInteger(cell, field)
		case "weight_g":
			return toWeightGrams(cell)
		case "scanned_at":
			return toTimestamp(cell)
		default:
			return String(cell).trim()
	}
}

/**
 * Reads one record written in the default layout, marker included. Throws for
 * every other marker.
 */
export function readRecord(line) {
	const text = String(line).trim()
	const marker = text.slice(0, 1)

	if (marker !== DEFAULT_MARKER) {
		throw new TypeError(`unknown layout marker: ${marker}`)
	}

	const cells = text.slice(2).split("|")

	if (cells.length !== COLUMN_ORDER.length) {
		throw new TypeError(`expected ${COLUMN_ORDER.length} fields, saw ${cells.length}`)
	}

	const record = {}

	for (let index = 0; index < COLUMN_ORDER.length; index += 1) {
		const field = COLUMN_ORDER[index]
		record[field] = readField(field, cells[index])
	}

	return record
}
