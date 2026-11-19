#!/usr/bin/env node

/**
 * analyze-replication-run.mjs — the mechanical table for a second-provider
 * replication run directory (E20-BC or E20C-XZ).
 *
 * WHY A SEPARATE ANALYZER
 *   `analyze-e20c-run.mjs` refuses a plan whose `experiment` is not E20c, and these
 *   runs are deliberately their own experiments over the same `e20/1` shape. The
 *   arithmetic below is the registered kind and nothing more: counts, rates,
 *   quarter blocks, wall clock, mean seconds per call and the token totals from
 *   the runner's own sidecars.
 *
 * WHAT IT READS
 *   <run-dir>/results.jsonl   the executor's records, in draw order
 *   <run-dir>/plan.json       the plan copy, for `experiment`, `cycle`, `blindSeed`
 *   <run-dir>/usage/*.json    the runner's sidecars, for tokens and the cap
 *   --key <file>              the sealed answer key, for the shared vocabulary
 *
 * NO READING, NO TEST
 *   No p-value, no decision rule, no interval. The report applies the
 *   registration; this file does not.
 *
 * EXIT STATUS
 *   0  the table was printed
 *   2  a precondition failed
 *
 * NO MODEL CALL IS POSSIBLE HERE.
 */

import * as fs from "node:fs/promises"
import path from "node:path"

import { E20_BC, E20C_XZ } from "./lib/replication.mjs"
import { longestVerbatimRun, summariseRun } from "./lib/e20c.mjs"
import { extractDeclaredV2 } from "./lib/routing-round.mjs"

const MODULES = new Map([E20_BC, E20C_XZ].map((module) => [module.id, module]))

const USAGE = `Usage: node scripts/analyze-replication-run.mjs --run-dir <dir> [options]

  --run-dir <dir>   a directory holding results.jsonl and the plan copy
  --key <file>      the sealed answer key (default: the plan's experiment directory)
  --help            print this text
`

class Refusal extends Error {}

function parseArgs(argv) {
	const opts = { runDir: null, key: null, help: false }
	for (let index = 0; index < argv.length; index++) {
		const arg = argv[index]
		const value = () => {
			const next = argv[++index]
			if (next === undefined) throw new Refusal(`${arg} needs a value`)
			return next
		}
		if (arg === "--run-dir") opts.runDir = value()
		else if (arg === "--key") opts.key = value()
		else if (arg === "--help" || arg === "-h") opts.help = true
		else throw new Refusal(`unknown argument: ${arg}`)
	}
	return opts
}

const pad = (text, width) => String(text).padEnd(width)
const percent = (value) => (value === null ? "—" : `${(value * 100).toFixed(1)}%`)
const seconds = (value) => (value === null ? "—" : `${value.toFixed(1)}s`)

async function readOrRefuse(target, what) {
	try {
		return await fs.readFile(path.resolve(target), "utf-8")
	} catch {
		throw new Refusal(`cannot read ${what} at ${target}`)
	}
}

function parseJsonl(text, where) {
	const rows = []
	for (const [index, line] of String(text).split("\n").entries()) {
		if (line.trim() === "") continue
		try {
			rows.push(JSON.parse(line))
		} catch (error) {
			throw new Refusal(`${where}:${index + 1} is not JSON: ${error.message}`)
		}
	}
	return rows
}

/** Sum the sidecars' token counts; absent fields stay absent in the total. */
async function readTokens(usageDir) {
	const totals = { calls: 0, prompt: 0, completion: 0, thoughts: 0, total: 0, caps: new Set() }
	let names = []
	try {
		names = (await fs.readdir(usageDir)).filter((name) => name.startsWith("usage-") && name.endsWith(".json"))
	} catch {
		return { ...totals, calls: null }
	}
	for (const name of names) {
		let sidecar
		try {
			sidecar = JSON.parse(await fs.readFile(path.join(usageDir, name), "utf-8"))
		} catch {
			continue
		}
		totals.calls++
		if (sidecar.maxOutputTokens !== undefined) totals.caps.add(sidecar.maxOutputTokens)
		const usage = sidecar.attempts?.[sidecar.attempts.length - 1]?.usageMetadata
		if (!usage) continue
		totals.prompt += usage.promptTokenCount ?? 0
		totals.completion += usage.candidatesTokenCount ?? 0
		totals.thoughts += usage.thoughtsTokenCount ?? 0
		totals.total += usage.totalTokenCount ?? 0
	}
	return totals
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
	if (!opts.runDir) {
		console.error("error: --run-dir is required")
		return 2
	}

	const runDir = path.resolve(opts.runDir)
	const records = parseJsonl(await readOrRefuse(path.join(runDir, "results.jsonl"), "results"), "results.jsonl")
	if (records.length === 0) throw new Refusal("results.jsonl holds no records")

	const plan = JSON.parse(await readOrRefuse(path.join(runDir, "plan.json"), "plan copy"))
	const module = MODULES.get(plan.experiment)
	if (!module) throw new Refusal(`plan.json names experiment ${JSON.stringify(plan.experiment)}; this analyzer reads E20-BC or E20C-XZ`)

	const spec = module.experimentSpec(plan.experiment)
	const keyPath = opts.key ?? path.join(spec.dir, "answer-key.json")
	const key = JSON.parse(await readOrRefuse(keyPath, "sealed answer key"))
	if (!Array.isArray(key.slugVocabulary) || key.slugVocabulary.length === 0) {
		throw new Refusal(`${keyPath} carries no slugVocabulary`)
	}

	const labelsByArm = module.labelArms(plan.experiment, plan.blindSeed)
	const armOf = new Map([...labelsByArm.entries()].map(([arm, label]) => [label, arm]))
	const vocabulary = key.slugVocabulary

	const summary = summariseRun({
		records,
		armOf,
		vocabulary,
		outcomes: ["explain", "architecture-reviewer"],
	})

	console.log(`replication run analysis — ${path.relative(process.cwd(), runDir) || "."}`)
	console.log(`experiment: ${plan.experiment} · cycle ${plan.cycle.join(" ")} × ${plan.cycles} · plan entries ${plan.entries.length}`)
	console.log(`records on disk: ${records.length} · key: ${path.relative(process.cwd(), keyPath)} (sealed)`)
	console.log("")
	console.log(
		`${pad("arm", 4)} ${pad("records", 8)} ${pad("scorable", 9)} ${pad("excl", 6)} ${pad("excl%", 7)} ` +
			`${pad("verbatim", 9)} ${pad("explain", 8)} ${pad("arch-rev", 9)} undetermined`,
	)
	for (const row of summary.arms) {
		console.log(
			`${pad(row.arm, 4)} ${pad(row.records, 8)} ${pad(row.scorable, 9)} ${pad(row.excluded, 6)} ` +
				`${pad(percent(row.exclusionRate), 7)} ${pad(row.longestVerbatimRun, 9)} ` +
				`${pad(row.declared.explain ?? 0, 8)} ${pad(row.declared["architecture-reviewer"] ?? 0, 9)} ${row.undetermined}`,
		)
	}
	console.log("")
	console.log(
		`wall clock ${seconds(summary.overall.wallClockSeconds)} · mean ${seconds(summary.overall.meanCallSeconds)} per call · ` +
			`${summary.overall.scorable}/${summary.overall.records} scorable`,
	)

	// Quarter blocks, in draw order, on the same definition as the totals: replies
	// declaring `explain`, and (for the rival design) `architecture-reviewer`.
	const byArm = new Map()
	for (const record of records) {
		const arm = armOf.get(record.label)
		if (!arm) continue
		if (!byArm.has(arm)) byArm.set(arm, [])
		byArm.get(arm).push(record)
	}

	console.log("")
	console.log("quarter blocks (explain declarations / block size, and arch-rev where present)")
	const blocksByArm = new Map()
	for (const arm of spec.arms.map((entry) => entry.arm)) {
		const armRecords = byArm.get(arm) ?? []
		const size = Math.ceil(armRecords.length / 4) || 1
		const blocks = []
		for (let start = 0; start < armRecords.length; start += size) {
			const slice = armRecords.slice(start, start + size)
			let explain = 0
			let rival = 0
			let undetermined = 0
			for (const record of slice) {
				if (!(record.status === "RUN" && typeof record.response === "string" && record.response.trim() !== "")) {
					undetermined++
					continue
				}
				const slug = extractDeclaredV2(record.response, vocabulary)
				if (slug === null) undetermined++
				else if (slug === "explain") explain++
				else if (slug === "architecture-reviewer") rival++
			}
			blocks.push({ size: slice.length, explain, rival, undetermined })
		}
		blocksByArm.set(arm, blocks)
		console.log(
			`  ${pad(arm, 3)} ${blocks
				.map(
					(block) =>
						`${block.explain}/${block.size} (${percent(block.size === 0 ? null : block.explain / block.size)})` +
						(block.rival > 0 ? ` rev ${block.rival}` : "") +
						(block.undetermined > 0 ? ` undet ${block.undetermined}` : ""),
				)
				.join(" · ")}`,
		)
	}

	if (spec.arms.length === 2) {
		const [first, second] = spec.arms.map((entry) => entry.arm)
		const firstBlocks = blocksByArm.get(first) ?? []
		const secondBlocks = blocksByArm.get(second) ?? []
		const points = firstBlocks.map((block, index) => {
			const other = secondBlocks[index]
			if (!other || block.size === 0 || other.size === 0) return null
			return ((block.explain / block.size - other.explain / other.size) * 100).toFixed(1)
		})
		console.log("")
		console.log(`contrast per quarter, ${first} − ${second}, in points: ${points.map((value) => (value ?? "—")).join(" / ")}`)
	}

	const tokens = await readTokens(path.join(runDir, "usage"))
	if (tokens.calls === null) {
		console.log("")
		console.log("usage sidecars: none found")
	} else {
		console.log("")
		console.log(
			`usage sidecars: ${tokens.calls} · prompt ${tokens.prompt} · completion ${tokens.completion} ` +
				`(thinking ${tokens.thoughts}) · total ${tokens.total} · cap(s) ${[...tokens.caps].join(", ") || "—"}`,
		)
		const meanTotal = tokens.calls === 0 ? 0 : tokens.total / tokens.calls
		console.log(`tokens per call (mean): ${meanTotal.toFixed(0)}`)
	}

	return 0
}

main()
	.then((code) => process.exit(code))
	.catch((error) => {
		if (error instanceof Refusal) {
			console.error(`error: ${error.message}`)
			process.exit(2)
		}
		console.error(`analyze-replication-run failed: ${error.message}`)
		process.exit(2)
	})
