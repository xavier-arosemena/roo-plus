#!/usr/bin/env node

/**
 * generate-e20-fixtures.mjs — the E20 and E20b fixtures registered in
 * [`docs/reviews/2026-11-13-e20-preregistration.md`]: three polarity arms, two
 * position arms, their plans, and their two sealed files.
 *
 * WHAT IT WRITES
 *   test-fixtures/frames/e20/
 *     A.roomodes B.roomodes C.roomodes   the three 45-entry pickers (§2.1)
 *     plan.json                          900 runs in the Amendment-1 cycle
 *     answer-key.json                    sealed: arm id → expected owner
 *     _label-map.json                    sealed: arm id → arm letter
 *   test-fixtures/frames/e20b/
 *     P1.roomodes P45.roomodes           `explain` first / last, line B (§2.3)
 *     plan.json                          200 runs, strictly alternating
 *     answer-key.json                    sealed, as above
 *     _label-map.json                    sealed, as above
 *   and, unless --check, the 1,100 prompts under `--out` (default: a temp dir).
 *
 * WHAT IT REFUSES TO TRUST
 *   `buildExperimentSet` parses every derived picker and throws unless the arms
 *   are identical at every entry except the registered manipulation, unless
 *   `explain` sits at the registered index, unless the E20 B arm is byte-identical
 *   to the closing round's C1 picker, and unless the three registered lines
 *   measure 50 / 96 / 99 characters. `buildRuns` then asserts Amendment 1 §5's
 *   cycle: exact 100 / 400 / 400 counts for E20, 100 / 100 for E20b, and every
 *   consecutive pair a different arm.
 *
 * NO MODEL CALL IS POSSIBLE HERE
 *   This file reads one fixture and the frozen constants, writes files and prints
 *   a summary. It has no provider protocol, reads no key, and cannot read `.env`.
 *
 * EXIT STATUS
 *   0  fixtures written, or --check found the disk byte-identical
 *   1  --check found drift
 *   2  a precondition or assertion failed
 */

import * as fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import {
	DEFAULT_E20_BLIND_SEED,
	DEFAULT_E20B_BLIND_SEED,
	E20_LINES,
	E20_REGISTERED_LINE_LENGTHS,
	EXPERIMENT_IDS,
	EXPLAIN_SLUG,
	buildAnswerKey,
	buildExperimentSet,
	buildLabelMap,
	buildPlanDocument,
	buildRuns,
	e20Brief,
	experimentSpec,
	labelArms,
	measuredLineLengths,
} from "./lib/e20.mjs"
import { ROOT } from "./lib/framing-pretest.mjs"
import { ROUTING_ROUND_DIR } from "./lib/routing-round.mjs"

/** E20's base picker is the closing round's C1 picker: 45 entries, `explain` at 6. */
const BASE_PICKER_PATH = path.join(ROUTING_ROUND_DIR, "C1.roomodes")

const DEFAULT_OUT = path.join(os.tmpdir(), "roo-plus-e20")

const USAGE = `Usage: node scripts/generate-e20-fixtures.mjs [options]

  --check              compare the generated files with the ones on disk and exit
                       1 on any drift; writes nothing and emits no prompt files
  --out <dir>          where the 1,100 prompt files are written
                       (default: ${DEFAULT_OUT}); never inside test-fixtures/
  --seed-e20 <s>       seed for E20's blind arm ids
                       (default: fixed literal so repeated runs are byte-identical)
  --seed-e20b <s>      seed for E20b's blind arm ids
                       (default: fixed literal so repeated runs are byte-identical)
  --help               print this text
`

function parseArgs(argv) {
	const opts = {
		check: false,
		out: DEFAULT_OUT,
		seeds: { E20: DEFAULT_E20_BLIND_SEED, E20b: DEFAULT_E20B_BLIND_SEED },
		help: false,
	}
	for (let index = 0; index < argv.length; index++) {
		const arg = argv[index]
		const value = () => {
			const next = argv[++index]
			if (next === undefined) throw new Error(`${arg} needs a value`)
			return next
		}
		if (arg === "--check") opts.check = true
		else if (arg === "--out") opts.out = value()
		else if (arg === "--seed-e20") opts.seeds.E20 = value()
		else if (arg === "--seed-e20b") opts.seeds.E20b = value()
		else if (arg === "--help" || arg === "-h") opts.help = true
		else throw new Error(`unknown argument: ${arg}`)
	}
	return opts
}

function json(value) {
	return `${JSON.stringify(value, null, 2)}\n`
}

function pad(text, width) {
	return String(text).padEnd(width)
}

async function readIfExists(target) {
	const raw = await fs.readFile(target, "utf-8").catch(() => null)
	return raw
}

/**
 * Build one experiment: its fixture files, its plan, its sealed files and its
 * runs. The summary rows are returned so `main` can print the arithmetic a
 * reader needs without opening a sealed file.
 */
function buildExperiment({ experimentId, baseText, seed }) {
	const spec = experimentSpec(experimentId)
	const fixtureSet = buildExperimentSet({ experimentId, baseText })
	const labelsByArm = labelArms(experimentId, seed)
	const runs = buildRuns({ experimentId, fixtureSet, labelsByArm })

	const plan = buildPlanDocument({ experimentId, runs, seed })
	const answerKey = buildAnswerKey({ experimentId, fixtureSet, labelsByArm })
	const labelMap = buildLabelMap({ experimentId, seed, labelsByArm })

	const files = new Map()
	for (const arm of fixtureSet.arms) files.set(`${arm.arm}.roomodes`, arm.text)
	files.set("plan.json", json(plan))
	files.set("answer-key.json", json(answerKey))
	files.set("_label-map.json", json(labelMap))

	const perArm = new Map()
	for (const run of runs) perArm.set(run.arm, (perArm.get(run.arm) ?? 0) + 1)

	return { spec, fixtureSet, labelsByArm, runs, plan, files, perArm }
}

function printExperiment({ spec, fixtureSet, runs, perArm }) {
	const measured = measuredLineLengths()
	console.log(spec.title)
	console.log(`  directory: ${path.relative(ROOT, spec.dir)}/`)
	console.log(
		`  line lengths, measured: ${Object.entries(measured)
			.map(([key, chars]) => `${key} ${chars} ch (registration ${E20_REGISTERED_LINE_LENGTHS[key]})`)
			.join(" · ")} · C−B ${measured.C - measured.B} ch`,
	)
	for (const arm of fixtureSet.arms) {
		console.log(
			`  arm ${pad(arm.arm, 4)} explain at index ${pad(arm.position, 3)} whenToUse[${arm.lineKey}] ` +
				`${pad(`${E20_LINES[arm.lineKey].length} ch`, 6)} changed lines: ${
					arm.changedLines.length === 0 ? "none (the base picker's own entry)" : arm.changedLines.join(",")
				}`,
		)
	}
	console.log(
		`  pickers identical apart from the registered manipulation: yes ` +
			`(${fixtureSet.arms.map((arm) => arm.modes.length).join("/")} entries, one shared slug set)`,
	)
	console.log(
		`  plan: ${runs.length} runs · cycle ${spec.cycle.join(" ")} × ${spec.cycles} · ` +
			`${new Set(runs.map((run) => run.promptSha256)).size} distinct promptSha256`,
	)
	console.log(
		`  arm counts: ${[...perArm.entries()].map(([arm, count]) => `${arm} ${count}`).join(" · ")} ` +
			`(registered ${spec.arms.map((arm) => `${arm.arm} ${arm.draws}`).join(" · ")})`,
	)
	const head = runs.slice(0, 18)
	console.log(`  first 18 cycle positions: ${head.map((run) => run.arm.padEnd(4)).join(" ")}`)
	console.log(`  first 18 blind labels:    ${head.map((run) => run.label.padEnd(6)).join(" ")}`)
	const adjacentSameArm = runs.filter((run, index) => index > 0 && runs[index - 1].label === run.label).length
	console.log(`  adjacent runs sharing an arm: ${adjacentSameArm} (0 is the registered property)`)
	console.log("")
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

	const out = path.resolve(opts.out)
	const fixtureRoot = path.resolve(ROOT, "test-fixtures")
	if (!opts.check && (out === fixtureRoot || out.startsWith(`${fixtureRoot}${path.sep}`))) {
		console.error("error: --out may not point inside test-fixtures/; prompts are run artefacts, not fixtures")
		return 2
	}

	const baseText = await fs.readFile(BASE_PICKER_PATH, "utf-8")
	const brief = e20Brief()

	console.log("E20 / E20b — fixture generator (artefact polarity, position)")
	console.log("")
	console.log(`base picker: ${path.relative(ROOT, BASE_PICKER_PATH)} — one brief, verbatim:`)
	console.log(`  ${brief.id}: ${JSON.stringify(brief.text)} (${brief.text.length} ch)`)
	console.log("")

	const built = EXPERIMENT_IDS.map((experimentId) =>
		buildExperiment({ experimentId, baseText, seed: opts.seeds[experimentId] }),
	)
	for (const experiment of built) printExperiment(experiment)

	if (opts.check) {
		let drifted = 0
		for (const experiment of built) {
			for (const [name, content] of experiment.files) {
				const current = await readIfExists(path.join(experiment.spec.dir, name))
				const ok = current === content
				if (!ok) drifted++
				console.log(`  check ${pad(`${experiment.spec.id}/${name}`, 24)} ${ok ? "byte-identical" : "DRIFTED"}`)
			}
		}
		console.log(
			drifted === 0
				? "check: PASS — the disk matches the derivation"
				: `check: FAIL — ${drifted} file(s) drifted`,
		)
		return drifted === 0 ? 0 : 1
	}

	for (const experiment of built) {
		await fs.mkdir(experiment.spec.dir, { recursive: true })
		for (const [name, content] of experiment.files) {
			await fs.writeFile(path.join(experiment.spec.dir, name), content, "utf-8")
		}
		const promptDir = path.join(out, experiment.spec.id.toLowerCase(), "prompts")
		await fs.mkdir(promptDir, { recursive: true })
		for (const run of experiment.runs) {
			await fs.writeFile(path.join(promptDir, `${run.runId}.txt`), run.text, "utf-8")
		}
		console.log(
			`written: ${[...experiment.files.keys()].join(", ")} → ${path.relative(ROOT, experiment.spec.dir)}/`,
		)
		console.log(`prompts: ${experiment.runs.length} files → ${promptDir}`)
	}
	console.log("sealed: answer-key.json and _label-map.json must never enter a scorer bundle.")
	console.log("dry-run only: no provider call was made and none is possible from this file.")
	return 0
}

main()
	.then((code) => process.exit(code))
	.catch((error) => {
		console.error(`generate-e20-fixtures failed: ${error.message}`)
		process.exit(2)
	})
