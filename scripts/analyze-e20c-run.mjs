#!/usr/bin/env node

/**
 * analyze-e20c-run.mjs — the mechanical table for an E20c run directory: per arm,
 * the exclusion rate, the longest identical verbatim run, and the declaration
 * counts from the pinned `routing-round-parser/2`.
 *
 * WHAT IT READS
 *   <run-dir>/results.jsonl      the executor's records, in draw order
 *   <run-dir>/plan.json          the plan copy, for `experiment` and `blindSeed`
 *   <key>                        the sealed answer key, for the shared vocabulary
 *
 * WHY THE ARM MAP IS DERIVED RATHER THAN READ
 *   The label → arm map is `assignLabels` over the plan's own `blindSeed`, so the
 *   sealed `_label-map.json` is not needed for a mechanical tally. The extractor is
 *   blind by construction (E20 §4.2): it is given the arm's vocabulary, never its
 *   label. Nothing here adjudicates a reply — an undetermined reply is counted as
 *   undetermined and left to the packet.
 *
 * --gate APPLIES §5 / AMENDMENT 2 §1 AND NOTHING ELSE
 *   Exclusion above 5% in any arm, or a longest identical verbatim run above 5 in
 *   any arm, stops the sweep: exit 2 and the failing arms are named. On a pass the
 *   script still prints the table, because the gate's numbers are report material.
 *
 * EXIT STATUS
 *   0  the table was printed (and, with --gate, every arm is inside its thresholds)
 *   2  a precondition failed, or --gate refused the run
 *
 * NO MODEL CALL IS POSSIBLE HERE.
 */

import * as fs from "node:fs/promises"
import path from "node:path"

import {
	EXPLAIN_SLUG,
	E20C_DIR,
	E20C_ID,
	E20C_MAX_EXCLUSION_RATE,
	E20C_MAX_VERBATIM_RUN,
	armByLabel,
	gateVerdict,
	summariseRun,
} from "./lib/e20c.mjs"

const DEFAULT_KEY = path.join(E20C_DIR, "answer-key.json")

/** E20c's two named outcomes (§3), plus "other declared" implied by the remainder. */
const OUTCOMES = [EXPLAIN_SLUG, "architecture-reviewer"]

const USAGE = `Usage: node scripts/analyze-e20c-run.mjs --run-dir <dir> [options]

  --run-dir <dir>      a directory holding results.jsonl and the plan copy
  --key <file>         the sealed answer key (default: ${path.relative(process.cwd(), DEFAULT_KEY)})
  --gate               exit 2 when any arm exceeds the exclusion or verbatim threshold
  --help               print this text

Thresholds (registration §5, Amendment 2 §1): exclusion > ${(E20C_MAX_EXCLUSION_RATE * 100).toFixed(0)}%,
longest identical verbatim run > ${E20C_MAX_VERBATIM_RUN}, in any arm.
`

class Refusal extends Error {}

function parseArgs(argv) {
	const opts = { runDir: null, key: DEFAULT_KEY, gate: false, help: false }
	for (let index = 0; index < argv.length; index++) {
		const arg = argv[index]
		const value = () => {
			const next = argv[++index]
			if (next === undefined) throw new Refusal(`${arg} needs a value`)
			return next
		}
		if (arg === "--run-dir") opts.runDir = value()
		else if (arg === "--key") opts.key = value()
		else if (arg === "--gate") opts.gate = true
		else if (arg === "--help" || arg === "-h") opts.help = true
		else throw new Refusal(`unknown argument: ${arg}`)
	}
	return opts
}

function pad(text, width) {
	return String(text).padEnd(width)
}

const rel = (target) => path.relative(process.cwd(), path.resolve(target)) || "."

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

/** Recursive byte total, so the report can state the run directory's size. */
async function directoryBytes(dir) {
	let total = 0
	const entries = await fs.readdir(dir, { withFileTypes: true })
	for (const entry of entries) {
		const target = path.join(dir, entry.name)
		if (entry.isDirectory()) total += await directoryBytes(target)
		else if (entry.isFile()) total += (await fs.stat(target)).size
	}
	return total
}

function humanBytes(bytes) {
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`
	return `${(bytes / 1024 / 1024).toFixed(1)} MiB`
}

const percent = (rate) => `${(rate * 100).toFixed(1)}%`
const seconds = (value) => (value === null ? "—" : `${value.toFixed(1)}s`)

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
	if (!opts.runDir) throw new Refusal("--run-dir is required")

	const runDir = path.resolve(opts.runDir)
	const resultsPath = path.join(runDir, "results.jsonl")
	const planPath = path.join(runDir, "plan.json")

	const records = parseJsonl(await readOrRefuse(resultsPath, "results"), rel(resultsPath))
	if (records.length === 0) throw new Refusal(`${rel(resultsPath)} holds no records`)

	let plan
	try {
		plan = JSON.parse(await readOrRefuse(planPath, "plan copy"))
	} catch (error) {
		if (error instanceof Refusal) throw error
		throw new Refusal(`${rel(planPath)} is not JSON: ${error.message}`)
	}
	if (plan.experiment !== E20C_ID) {
		throw new Refusal(`${rel(planPath)} is an ${plan.experiment} plan, not ${E20C_ID}`)
	}

	let key
	try {
		key = JSON.parse(await readOrRefuse(opts.key, "sealed answer key"))
	} catch (error) {
		if (error instanceof Refusal) throw error
		throw new Refusal(`${opts.key} is not JSON: ${error.message}`)
	}
	if (!Array.isArray(key.slugVocabulary) || key.slugVocabulary.length === 0) {
		throw new Refusal(`${opts.key} carries no slugVocabulary, so the extractor has no vocabulary to use`)
	}
	for (const slug of OUTCOMES) {
		if (!key.slugVocabulary.includes(slug)) {
			throw new Refusal(`${opts.key}: the vocabulary does not contain ${JSON.stringify(slug)}, so its count would be a guess`)
		}
	}

	const armOf = armByLabel(plan.experiment, plan.blindSeed)
	const summary = summariseRun({ records, armOf, vocabulary: key.slugVocabulary, outcomes: OUTCOMES })

	console.log(`E20c run analysis — ${rel(runDir)}`)
	console.log(`plan: ${rel(planPath)} · seed ${plan.blindSeed} · ${plan.cycle.length}-call cycle × ${plan.cycles}`)
	console.log(`key: ${rel(opts.key)} (sealed) · vocabulary ${key.slugVocabulary.length} slugs`)
	console.log("")
	console.log(
		`${pad("arm", 4)} ${pad("records", 8)} ${pad("scorable", 9)} ${pad("excluded", 9)} ${pad("excl%", 7)} ` +
			`${pad("verbatim", 9)} ${pad("explain", 8)} ${pad("arch-rev", 9)} ${pad("other", 6)} undetermined`,
	)
	for (const row of summary.arms) {
		const other = Object.entries(row.declared)
			.filter(([slug]) => !OUTCOMES.includes(slug))
			.reduce((total, [, count]) => total + count, 0)
		console.log(
			`${pad(row.arm, 4)} ${pad(row.records, 8)} ${pad(row.scorable, 9)} ${pad(row.excluded, 9)} ` +
				`${pad(percent(row.exclusionRate), 7)} ${pad(row.longestVerbatimRun, 9)} ` +
				`${pad(row.declared[EXPLAIN_SLUG] ?? 0, 8)} ${pad(row.declared["architecture-reviewer"] ?? 0, 9)} ` +
				`${pad(other, 6)} ${row.undetermined}`,
		)
	}
	console.log("")
	console.log(
		`totals: ${summary.overall.records} records · ${summary.overall.scorable} scorable · ` +
			`${summary.overall.excluded} excluded · wall clock ${seconds(summary.overall.wallClockSeconds)} · ` +
			`mean ${seconds(summary.overall.meanCallSeconds)} per call`,
	)
	const bytes = await directoryBytes(runDir)
	console.log(`directory: ${humanBytes(bytes)} (${bytes} bytes)`)

	if (opts.gate) {
		const verdict = gateVerdict(summary.arms)
		console.log("")
		if (verdict.passed) {
			console.log(
				`gate: PASS — no arm exceeds ${(E20C_MAX_EXCLUSION_RATE * 100).toFixed(0)}% exclusion and none has a ` +
					`verbatim run above ${E20C_MAX_VERBATIM_RUN}`,
			)
			return 0
		}
		console.log("gate: FAIL")
		for (const failure of verdict.failures) console.log(`  - ${failure}`)
		console.log("the sweep must not run against this gate (registration §5, Amendment 2 §1)")
		return 2
	}
	return 0
}

main()
	.then((code) => process.exit(code))
	.catch((error) => {
		console.error(`error: ${error.message}`)
		process.exit(2)
	})
