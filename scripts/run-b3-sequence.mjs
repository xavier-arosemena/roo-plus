#!/usr/bin/env node

/**
 * run-b3-sequence.mjs — evaluate a completed E12 run with Amendment 2 §A2.2.
 *
 * WHY THIS IS A SEPARATE ENTRY POINT
 *   The registered procedure is sequential: each step either passes or stops the
 *   reading. It is therefore not the same job as executing a batch — it is a
 *   reading over transcripts that already exist, and it must be runnable on a
 *   synthetic or partial run directory without any provider being configured.
 *   Putting it behind `--sequence` on the harness would have required the
 *   harness to know about the answer key, which is a sealed document the harness
 *   must never need.
 *
 * WHAT IT READS
 *   <run>/transcripts/<runId>.txt for every cell the step needs, the plan (for
 *   each condition's picker slugs) and the sealed answer key. Nothing else. No
 *   scorer, no model, no network.
 *
 * WHAT IT WRITES
 *   sequence-report.json (default `<run>/sequence-report.json`) with the steps
 *   attempted, the stop step and reason code, per-step per-persona declared
 *   modes, and the arms not reached.
 *
 * EXIT STATUS
 *   0  a report was written, whatever the reason code (a stop is a result)
 *   2  bad arguments, or the run/plan/key is inconsistent or incomplete
 *
 * No dependencies. Node 22 ESM.
 */

import * as fs from "node:fs/promises"
import * as path from "node:path"

import { ROOT, parseRoomodes } from "./lib/framing-pretest.mjs"
import { loadPlan } from "./lib/framing-pretest-plan.mjs"
import { ANSWER_KEY_PATH, SEQUENCE_CELLS, extractDeclaredMode, loadAnswerKey, runSequence } from "./lib/b3-sequence.mjs"

const DEFAULT_PLAN = "test-fixtures/frames/b3-isolation/arms.json"

const USAGE = `Usage: node scripts/run-b3-sequence.mjs --run <dir> [options]

  --run <dir>     a run directory holding transcripts/<runId>.txt for every cell
                  the sequence needs (C1 r1, A0 r1-r3, A5 r1, P r1, A1 r1,
                  A2 r1, A4 r1). No provider is contacted.
  --plan <file>   the plan the batch was built from (default: ${DEFAULT_PLAN})
  --key <file>    the sealed answer key (default: ${ANSWER_KEY_PATH})
  --out <file>    where sequence-report.json is written
                  (default: <run>/sequence-report.json)
  --help          print this text
`

function parseArgs(argv) {
	const opts = { run: "", plan: DEFAULT_PLAN, key: ANSWER_KEY_PATH, out: "", help: false }
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i]
		const value = () => {
			const next = argv[++i]
			if (next === undefined) throw new Error(`${arg} needs a value`)
			return next
		}
		if (arg === "--run") opts.run = value()
		else if (arg === "--plan") opts.plan = value()
		else if (arg === "--key") opts.key = value()
		else if (arg === "--out") opts.out = value()
		else if (arg === "--help" || arg === "-h") opts.help = true
		else throw new Error(`unknown argument: ${arg}`)
	}
	return opts
}

/**
 * Build `[{ condition, persona, repetition, declared, transcript }]` from a run
 * directory. The slugs a response may name are that condition's own picker, so a
 * slug from another fixture can never be read as a declaration.
 */
export async function readObservations(runDir, plan, key) {
	const transcripts = path.join(runDir, "transcripts")
	const byCondition = new Map(plan.conditions.map((condition) => [condition.id, condition]))
	const observations = []
	const missing = []

	for (const cell of SEQUENCE_CELLS) {
		const condition = byCondition.get(cell.condition)
		if (!condition) throw new Error(`the plan has no runnable condition ${cell.condition}`)
		let modes = condition.modes
		if (!modes) modes = parseRoomodes(await fs.readFile(condition.file, "utf-8"), `${cell.condition}.roomodes`)
		const slugs = modes.map((mode) => mode.slug)
		for (const persona of key.personas) {
			const runId = `${cell.condition}-${persona}-r${cell.repetition}`
			let transcript
			try {
				transcript = await fs.readFile(path.join(transcripts, `${runId}.txt`), "utf-8")
			} catch {
				missing.push(runId)
				continue
			}
			const { declared } = extractDeclaredMode(transcript, slugs)
			observations.push({ condition: cell.condition, persona, repetition: cell.repetition, declared, transcript })
		}
	}

	if (missing.length > 0) {
		throw new Error(`the run is incomplete — no transcript for ${missing.length} cell(s): ${missing.slice(0, 10).join(", ")}`)
	}
	return observations
}

function printReport(report) {
	for (const step of report.steps) {
		const where = step.condition ? `${step.condition}` : "—"
		const vector = step.vector.map((entry) => `${entry.persona}=${entry.declared ?? "HELP"}`).join(" ")
		console.log(`step ${step.step} ${step.id.padEnd(18)} ${where.padEnd(3)} ${step.status.toUpperCase().padEnd(9)} ${vector}`)
		if (step.detail) console.log(`         ${step.detail}`)
	}
	console.log(`stop step: ${report.stopStep}`)
	console.log(`reason code: ${report.reasonCode}`)
	if (report.matchedCause) console.log(`matched cause: ${report.matchedCause} (${report.matchedCondition})`)
	if (report.armsNotReached.length > 0) console.log(`arms not reached: ${report.armsNotReached.join(", ")}`)
	if (report.floor !== undefined) console.log(`noise floor: ${report.floor}/5 personas moved on a material change of no consequence`)
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
	if (!opts.run) {
		console.error(`error: --run is required\n\n${USAGE}`)
		return 2
	}

	const runDir = path.resolve(ROOT, opts.run)
	let plan
	let key
	let observations
	try {
		plan = await loadPlan(opts.plan)
		key = await loadAnswerKey(opts.key)
		observations = await readObservations(runDir, plan, key)
	} catch (error) {
		console.error(`error: ${error.message}`)
		return 2
	}

	let report
	try {
		report = runSequence({ key, observations })
	} catch (error) {
		console.error(`error: ${error.message}`)
		return 2
	}
	report.plan = plan.source
	report.notRun = plan.notRun.map((entry) => ({ id: entry.id, reason: entry.reason }))

	const outPath = opts.out ? path.resolve(ROOT, opts.out) : path.join(runDir, "sequence-report.json")
	await fs.writeFile(outPath, JSON.stringify(report, null, 2) + "\n", "utf-8")

	printReport(report)
	console.log(`report: ${path.relative(process.cwd(), outPath) || outPath}`)
	return 0
}

main()
	.then((code) => process.exit(code))
	.catch((error) => {
		console.error(`run-b3-sequence failed: ${error.message}`)
		process.exit(2)
	})
