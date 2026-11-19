#!/usr/bin/env node

/**
 * report-routing-round.mjs — the per-cell table and the two co-primary
 * contrasts for the routing closing round (E13-R, Stage 1).
 *
 * WHAT IT READS
 *   A completed run directory holding `results.jsonl`, plus the sealed
 *   `answer-key.json` (default: test-fixtures/frames/routing-round/). It never
 *   reads a prompt, a picker or `_label-map.json`, so the table is computed from
 *   the run records and the sealed key alone.
 *
 * WHAT IT ENFORCES BEFORE IT REPORTS
 *   1. `finishReason` (Guard 4 / R-2): any record whose reason is neither `STOP`
 *      nor absent is INVALID and leaves its cell's denominator, whatever its
 *      `status` says. The per-cell excluded count is printed.
 *   2. The refusal rule is §A2.5 row 10 and nothing stricter: the tool refuses
 *      only when a cell's exclusion rate EXCEEDS 5% (exit 2), because cells with
 *      differing exclusion rates must not be compared. Below or at 5% every cell
 *      is reported on its own denominator and any cell with a non-zero exclusion
 *      rate is flagged by name and rate. A cell with no records at all also
 *      refuses: there is no denominator to report.
 *   3. The clustering guard (Guard 1 / R-5): a cell whose longest identical run
 *      exceeds 5, or whose exact-duplicate transcript rate exceeds 20%, is
 *      clustered; no interval is printed for it and a contrast that depends on
 *      it is reported as "not estimable at this n".
 *   4. Boundary degeneracy (Guard 2): where a constituent cell's outcome is all
 *      one value, the bootstrap interval is suppressed and the contrast is
 *      reported as a difference in counts with an exact test.
 *
 * WHAT IT DOES NOT DO
 *   It emits no reading. §A2.5's table is applied by a human after the sweep.
 *   It makes no model call and reads no key.
 *
 * EXIT STATUS
 *   0  a report was emitted
 *   1  unused
 *   2  a precondition failed, or a cell's exclusion rate exceeded 5%
 *
 * See scripts/ROUTING-ROUND.md for the operator procedure.
 */

import * as fs from "node:fs/promises"
import path from "node:path"

import {
	DEFAULT_BOOTSTRAP_RESAMPLES,
	DEFAULT_BOOTSTRAP_SEED,
	MAX_EXCLUSION_RATE,
	ROUTING_ROUND_DIR,
	SYNTHETIC_SCENARIOS,
	buildReport,
	renderReport,
	writeSyntheticRunDir,
} from "./lib/routing-round.mjs"

const DEFAULT_KEY = path.join(ROUTING_ROUND_DIR, "answer-key.json")

const USAGE = `Usage: node scripts/report-routing-round.mjs --run-dir <dir> [options]

  --run-dir <dir>        a completed run directory containing results.jsonl
  --key <file>           the sealed answer key (default: ${path.relative(process.cwd(), DEFAULT_KEY)})
  --resamples <n>        bootstrap resamples (default: ${DEFAULT_BOOTSTRAP_RESAMPLES})
  --seed <n>             bootstrap seed (default: ${DEFAULT_BOOTSTRAP_SEED})
  --json <file>          also write the report object as JSON
  --write-synthetic <dir>  TEST ONLY: fabricate a run directory and exit; never a
                         model call. Pair with --scenario.
  --scenario <name>      ${SYNTHETIC_SCENARIOS.join(" | ")} (default: clean)
  --help                 print this text
`

function parseArgs(argv) {
	const opts = {
		runDir: "",
		key: DEFAULT_KEY,
		resamples: DEFAULT_BOOTSTRAP_RESAMPLES,
		seed: DEFAULT_BOOTSTRAP_SEED,
		json: "",
		writeSynthetic: "",
		scenario: "clean",
		help: false,
	}
	for (let index = 0; index < argv.length; index++) {
		const arg = argv[index]
		const value = () => {
			const next = argv[++index]
			if (next === undefined) throw new Error(`${arg} needs a value`)
			return next
		}
		if (arg === "--run-dir") opts.runDir = value()
		else if (arg === "--key") opts.key = value()
		else if (arg === "--resamples") opts.resamples = Number(value())
		else if (arg === "--seed") opts.seed = Number(value())
		else if (arg === "--json") opts.json = value()
		else if (arg === "--write-synthetic") opts.writeSynthetic = value()
		else if (arg === "--scenario") opts.scenario = value()
		else if (arg === "--help" || arg === "-h") opts.help = true
		else throw new Error(`unknown argument: ${arg}`)
	}
	return opts
}

async function loadKey(keyPath) {
	let raw
	try {
		raw = await fs.readFile(path.resolve(keyPath), "utf-8")
	} catch {
		throw new Error(`cannot read the answer key at ${keyPath}`)
	}
	return JSON.parse(raw)
}

async function loadResults(runDir) {
	const resultsPath = path.join(path.resolve(runDir), "results.jsonl")
	let raw
	try {
		raw = await fs.readFile(resultsPath, "utf-8")
	} catch {
		throw new Error(`no results.jsonl in ${runDir}`)
	}
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
	if (!Number.isInteger(opts.resamples) || opts.resamples < 1) {
		console.error("error: --resamples must be an integer >= 1")
		return 2
	}
	if (!Number.isFinite(opts.seed)) {
		console.error("error: --seed must be a number")
		return 2
	}

	let key
	try {
		key = await loadKey(opts.key)
	} catch (error) {
		console.error(`error: ${error.message}`)
		return 2
	}

	if (opts.writeSynthetic) {
		try {
			const written = await writeSyntheticRunDir({
				dir: path.resolve(opts.writeSynthetic),
				key,
				scenario: opts.scenario,
				seed: opts.seed,
			})
			console.log(`synthetic run directory written: ${written.dir}`)
			console.log(
				`  records: ${written.records} (scenario ${written.scenario}); every record is marked synthetic`,
			)
			console.log("  no model call was made; this directory must never be reported as a run")
			return 0
		} catch (error) {
			console.error(`error: ${error.message}`)
			return 2
		}
	}

	if (!opts.runDir) {
		console.error(`error: --run-dir is required\n\n${USAGE}`)
		return 2
	}

	let report
	try {
		const results = await loadResults(opts.runDir)
		report = buildReport({
			results,
			key,
			resamples: opts.resamples,
			seed: opts.seed,
			maxExclusionRate: MAX_EXCLUSION_RATE,
		})
	} catch (error) {
		console.error(`error: ${error.message}`)
		return 2
	}

	console.log(`run directory: ${path.resolve(opts.runDir)}`)
	console.log(`answer key: ${path.relative(process.cwd(), path.resolve(opts.key))} (sealed)`)
	console.log("")
	console.log(renderReport(report))

	if (opts.json) {
		const target = path.resolve(opts.json)
		const serialisable = {
			...report,
			cells: Object.fromEntries(
				Object.entries(report.cells).map(([cell, value]) => [cell, { ...value, vectors: undefined }]),
			),
		}
		await fs.mkdir(path.dirname(target), { recursive: true })
		await fs.writeFile(target, `${JSON.stringify(serialisable, null, 2)}\n`, "utf-8")
		console.log("")
		console.log(`report object written to ${target}`)
	}

	return report.refused ? 2 : 0
}

main()
	.then((code) => process.exit(code))
	.catch((error) => {
		console.error(`report-routing-round failed: ${error.message}`)
		process.exit(2)
	})
