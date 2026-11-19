import { parseLabel } from "./src/labels.mjs"

const CASES = [
	{ name: "default", line: "p|LBL-1041|SKU-7781|3|1,5kg|d3|2026-02-01T08:15:00Z" },
	{ name: "wide", line: "w|2026-02-01T09:00:00Z|d3|LBL-1042|SKU-7781|2|1,5kg" },
]

const HEADER = ["record", "returned order", "weight_g", "dock"]

const rows = CASES.map((item) => {
	const record = parseLabel(item.line)

	return [item.name, Object.keys(record).join(","), String(record.weight_g), record.dock]
})

const widths = HEADER.map((title, index) =>
	Math.max(title.length, ...rows.map((cells) => cells[index].length)),
)

const render = (cells) =>
	cells
		.map((cell, index) => cell.padEnd(widths[index]))
		.join("  ")
		.trimEnd()

for (const item of CASES) {
	console.log(`input    ${item.name.padEnd(8)}${item.line}`)
}

console.log("")
console.log(render(HEADER))
console.log(widths.map((width) => "-".repeat(width)).join("  "))

for (const cells of rows) {
	console.log(render(cells))
}
