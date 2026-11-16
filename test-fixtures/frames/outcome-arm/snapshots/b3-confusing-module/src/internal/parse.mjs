import { COLUMN_ORDER } from "./columnTable.mjs"
import { LAYOUT_COLUMNS } from "./layoutTable.mjs"
import { readRecord } from "./parseStream.mjs"

const DEFAULT_MARKER = "p"
const WIDE_MARKER = "w"

const WEIGHT = /^\s*([0-9]+(?:[.,][0-9]+)?)\s*([a-zA-Z]*)\s*$/

function legacyWeightGrams(text) {
	const match = WEIGHT.exec(String(text))

	if (!match) {
		throw new TypeError(`weight is not a number: ${text}`)
	}

	const value = Number(match[1].replace(",", "."))
	const unit = match[2].toLowerCase()

	if (unit === "kg") {
		return Math.round(value * 1000)
	}

	if (unit === "g" || unit === "") {
		return Math.round(value)
	}

	throw new TypeError(`unknown weight unit: ${unit}`)
}

function legacyDock(text) {
	return String(text).trim().toUpperCase()
}

function readWide(text) {
	const cells = text.slice(2).split("|")

	if (cells.length !== LAYOUT_COLUMNS.length) {
		throw new TypeError(`expected ${LAYOUT_COLUMNS.length} fields, saw ${cells.length}`)
	}

	const byColumn = {}

	for (let index = 0; index < LAYOUT_COLUMNS.length; index += 1) {
		byColumn[LAYOUT_COLUMNS[index]] = cells[index]
	}

	const ordered = COLUMN_ORDER.map((field) => byColumn[field])
	const record = readRecord(`${DEFAULT_MARKER}|${ordered.join("|")}`)

	record.weight_g = legacyWeightGrams(byColumn.weight_g)
	record.dock = legacyDock(byColumn.dock)

	return record
}

/**
 * Reads one scanner record. The leading marker selects the layout.
 */
export function parseRecord(line) {
	const text = String(line).trim()

	if (text === "") {
		throw new TypeError("empty record")
	}

	const marker = text.slice(0, 1)

	if (marker === WIDE_MARKER) {
		return readWide(text)
	}

	if (marker === DEFAULT_MARKER) {
		return readRecord(text)
	}

	throw new TypeError(`unknown layout marker: ${marker}`)
}
