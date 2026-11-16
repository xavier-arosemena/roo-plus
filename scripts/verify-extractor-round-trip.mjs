#!/usr/bin/env node

/**
 * verify-extractor-round-trip.mjs — prove declaration extractor v2 against the
 * closing round's 600 saved replies (E20 §4.2 and §10).
 *
 * WHAT IT DOES
 *   Reads a results file and the sealed answer key, extracts the declared mode
 *   from every scorable reply with `extractDeclaredV2` using that cell's OWN
 *   45-slug picker, and prints per cell: correct / asked / wrong, the recorded
 *   manual baseline, and the residual (correct − baseline).
 *
 * WHY THE RESIDUAL IS THE OUTPUT
 *   The preregistration accepts v2 only if it reproduces the closing round within
 *   the recorded residual, not exactly. A cell whose residual exceeds ±6 is a
 *   failure of the instrument, not a finding about the model.
 *
 * WHAT ALWAYS PRINTS
 *   The count of replies that no format matched. Those replies are the
 *   hand-adjudication workload, and §9.4 forbids publishing an extraction number
 *   without the adjudication count beside it.
 *
 * EXIT STATUS
 *   0  every cell is inside the tolerance, or the default results file is absent
 *      (a CI-safe skip: the closing round is not required to exist on every host)
 *   1  a cell's residual exceeds ±6
 *   2  a precondition failed: a bad argument, an unreadable key, a malformed
 *      results file, or a cell with no scorable records
 *
 * No dependencies. Node 22 ESM.
 */

import * as fs from "node:fs/promises"
import path from "node:path"

import { PARSER_VERSION_V2, extractDeclaredV2 } from "./lib/routing-round.mjs"

const DEFAULT_RESULTS = "/tmp/rr-run/results.jsonl"
const DEFAULT_KEY = path.join("test-fixtures", "frames", "routing-round", "answer-key.json")

/** The closing round's recorded manual commit counts (§17.3), cell by cell. */
const RECORDED_BASELINE = { C1: 53, C2: 50, C3: 71, C4: 46, C5: 99, C6: 98 }

/** The pre-registered tolerance: any cell beyond ±6 fails the verification. */
const RESIDUAL_TOLERANCE = 6

const USAGE = `Usage: node scripts/verify-extractor-round-trip.mjs [options]

  --results <file>  results.jsonl from a completed round (default: ${DEFAULT_RESULTS})
  --key <file>      the sealed answer key (default: ${DEFAULT_KEY})
  --help            print this text
`

function parseArgs(argv) {
	const opts = { results: DEFAULT_RESULTS, resultsExplicit: false, key: DEFAULT_KEY, help: false }
	for (let index = 0; index < argv.length; index++) {
		const arg = argv[index]
		const value = () => {
			const next = argv[++index]
			if (next === undefined) throw new Error(`${arg} needs a value`)
			return next
		}
		if (arg === "--results") {
			opts.results = value()
			opts.resultsExplicit = true
		} else if (arg === "--key") opts.key = value()
		else if (arg === "--help" || arg === "-h") opts.help = true
		else throw new Error(`unknown argument: ${arg}`)
	}
	return opts
}

function pad(text, width) {
	return String(text).padEnd(width)
}

function signed(value) {
	return `${value >= 0 ? "+" : ""}${value}`
}

async function readIfExists(target) {
	try {
		return await fs.readFile(target, "utf-8")
	} catch {
		return null
	}
}

async function loadKey(keyPath) {
	const raw = await readIfExists(path.resolve(keyPath))
	if (raw === null) throw new Error(`cannot read the answer key at ${keyPath}`)
	const key = JSON.parse(raw)
	if (!Array.isArray(key?.cells) || key.cells.length === 0) throw new Error("the answer key lists no cells")
	for (const cell of key.cells) {
		if (typeof cell?.cell !== "string" || !Object.hasOwn(RECORDED_BASELINE, cell.cell)) {
			throw new Error(`the answer key names unknown cell ${JSON.stringify(cell?.cell)}`)
		}
		if (typeof cell.label !== "string" || cell.label === "") {
			throw new Error(`answer key cell ${cell.cell} has no blind label`)
		}
		if (!Array.isArray(cell.slugs) || cell.slugs.length === 0) {
			throw new Error(`answer key cell ${cell.cell} has no slug list`)
		}
		if (!cell.slugs.includes(cell.expectedOwner)) {
			throw new Error(`answer key cell ${cell.cell}: expected owner is not in its own picker`)
		}
	}
	return key
}

function parseResults(raw, resultsPath) {
	const records = []
	for (const [index, line] of raw.split("\n").entries()) {
		if (line.trim() === "") continue
		try {
			records.push(JSON.parse(line))
		} catch (error) {
			throw new Error(`${resultsPath}:${index + 1} is not JSON: ${error.message}`)
		}
	}
	if (records.length === 0) throw new Error(`${resultsPath} holds no records`)
	return records
}

async function main() {
	let opts
	try {
		opts = parseArgs(process.argv.slice(2))
	} catch (error) {
		console.error(`error: ${error.message}\n\n${USAGE}`)
		return 2
	}
	if (opts.help) {
		console.log(USAGE)
		return 0
	}

	const resultsPath = path.resolve(opts.results)
	const raw = await readIfExists(resultsPath)
	if (raw === null) {
		// The default path is a workstation artefact, so its absence is not an
		// error: CI must be able to run this check without the closing round.
		if (!opts.resultsExplicit) {
			console.log(`skipped: no results file at ${resultsPath}`)
			return 0
		}
		console.error(`error: no results file at ${resultsPath}`)
		return 2
	}

	let key
	let records
	try {
		key = await loadKey(opts.key)
		records = parseResults(raw, resultsPath)
	} catch (error) {
		console.error(`error: ${error.message}`)
		return 2
	}

	console.log(`extractor round-trip — ${PARSER_VERSION_V2}`)
	console.log(`results: ${resultsPath}`)
	console.log(`answer key: ${path.relative(process.cwd(), path.resolve(opts.key))} (sealed)`)
	console.log("")
	console.log(
		`${pad("cell", 4)} ${pad("label", 8)} ${pad("scored", 6)} ${pad("correct", 7)} ${pad("asked", 5)} ${pad(
			"wrong",
			5,
		)} ${pad("baseline", 8)} residual`,
	)

	const rows = []
	for (const cell of key.cells) {
		const cellRecords = records.filter((record) => record.label === cell.label)
		const scorable = cellRecords.filter(
			(record) => record.status === "RUN" && typeof record.response === "string" && record.response.trim() !== "",
		)
		if (scorable.length === 0) {
			console.error(`error: cell ${cell.cell} (${cell.label}) has no scorable records`)
			return 2
		}

		let correct = 0
		let asked = 0
		let wrong = 0
		for (const record of scorable) {
			const declared = extractDeclaredV2(record.response, cell.slugs)
			if (declared === null) asked++
			else if (declared === cell.expectedOwner) correct++
			else wrong++
		}
		const residual = correct - RECORDED_BASELINE[cell.cell]
		rows.push({ cell: cell.cell, label: cell.label, scored: scorable.length, correct, asked, wrong, residual })
	}

	for (const row of rows) {
		console.log(
			`${pad(row.cell, 4)} ${pad(row.label, 8)} ${pad(row.scored, 6)} ${pad(row.correct, 7)} ${pad(
				row.asked,
				5,
			)} ${pad(row.wrong, 5)} ${pad(RECORDED_BASELINE[row.cell], 8)} ${signed(row.residual)}`,
		)
	}

	const scoredTotal = rows.reduce((sum, row) => sum + row.scored, 0)
	const unmatchedTotal = rows.reduce((sum, row) => sum + row.asked, 0)
	const failures = rows.filter((row) => Math.abs(row.residual) > RESIDUAL_TOLERANCE)

	console.log("")
	console.log(
		`no format matched: ${unmatchedTotal} of ${scoredTotal} replies — each one is part of the hand-adjudication workload`,
	)
	console.log(
		`residual tolerance: ±${RESIDUAL_TOLERANCE} correct per cell against the recorded manual baseline (53/50/71/46/99/98)`,
	)
	if (failures.length === 0) {
		console.log("result: PASS — every cell is inside the pre-registered tolerance")
		return 0
	}
	console.log(
		`result: FAIL — ${failures
			.map((row) => `${row.cell} residual ${signed(row.residual)}`)
			.join(", ")} exceed ±${RESIDUAL_TOLERANCE}`,
	)
	return 1
}

main()
	.then((code) => process.exit(code))
	.catch((error) => {
		console.error(`verify-extractor-round-trip failed: ${error.message}`)
		process.exit(2)
	})
