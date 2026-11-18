#!/usr/bin/env node

/**
 * generate-e20d-fixtures.mjs — Task C's fixture: E20's B and C lines on a second
 * brief, 200 draws per arm, 400 calls.
 *
 * WHAT IT WRITES
 *   test-fixtures/frames/e20d/
 *     B.roomodes        E20's arm B picker, byte for byte
 *     C.roomodes        E20's arm C picker, byte for byte
 *     plan.json         400 runs in the cycle `B C` repeated 200 times
 *     answer-key.json   sealed: arm id → expected owner, shared vocabulary
 *     _label-map.json   sealed: arm id → arm letter
 *   and, unless --check, the 400 prompts under `--out` (default: a temp dir).
 *
 * THE PICKERS ARE COPIES, AND THAT IS CHECKED
 *   `scripts/lib/e20d.mjs` takes both arms from `lib/e20.mjs`, and this file
 *   compares each derived arm with the registered picker it must reproduce —
 *   `test-fixtures/frames/e20/B.roomodes` and `e20/C.roomodes` — before anything
 *   is written. A picker that drifted from E20 would make a difference
 *   unattributable to the brief, so it fails the build instead of becoming the
 *   material for 400 paid calls. The brief must also be absent from both pickers:
 *   if it leaked into one, the arms would no longer be E20's.
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
	DEFAULT_E20D_BLIND_SEED,
	E20D_BRIEF_ID,
	E20D_BRIEF_TEXT,
	E20D_ID,
	E20D_SPEC,
	REGISTERED_LINES,
	buildAnswerKey,
	buildExperimentSet,
	buildLabelMap,
	buildPlanDocument,
	buildRuns,
	e20dBrief,
	expectedRuns,
	labelArms,
} from "./lib/e20d.mjs"
import { E20_DIR } from "./lib/e20.mjs"
import { ROOT } from "./lib/framing-pretest.mjs"
import { ROUTING_ROUND_DIR } from "./lib/routing-round.mjs"

/** E20d's base picker is the closing round's C1 picker: 45 entries, `explain` at 6. */
const BASE_PICKER_PATH = path.join(ROUTING_ROUND_DIR, "C1.roomodes")

const DEFAULT_OUT = path.join(os.tmpdir(), "roo-plus-e20d")

const USAGE = `Usage: node scripts/generate-e20d-fixtures.mjs [options]

  --check              compare the generated files with the ones on disk and exit
                       1 on any drift; writes nothing and emits no prompt files
  --out <dir>          where the 400 prompt files are written
                       (default: ${DEFAULT_OUT}); never inside test-fixtures/
  --seed <s>           seed for the blind arm ids
                       (default: ${DEFAULT_E20D_BLIND_SEED}, so a rerun is byte-identical)
  --help               print this text
`

function parseArgs(argv) {
	const opts = { check: false, out: DEFAULT_OUT, seed: DEFAULT_E20D_BLIND_SEED, help: false }
	for (let index = 0; index < argv.length; index++) {
		const arg = argv[index]
		const value = () => {
			const next = argv[++index]
			if (next === undefined) throw new Error(`${arg} needs a value`)
			return next
		}
		if (arg === "--check") opts.check = true
		else if (arg === "--out") opts.out = value()
		else if (arg === "--seed") opts.seed = value()
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
	return await fs.readFile(target, "utf-8").catch(() => null)
}

/**
 * Build the fixture: pickers, plan, sealed files and runs. Every assertion lives
 * in `lib/e20d.mjs`; this function only assembles what it returns.
 */
function buildFixture({ baseText, seed }) {
	const spec = E20D_SPEC
	const fixtureSet = buildExperimentSet({ experimentId: spec.id, baseText })
	const labelsByArm = labelArms(spec.id, seed)
	const runs = buildRuns({ experimentId: spec.id, fixtureSet, labelsByArm })

	const plan = buildPlanDocument({ experimentId: spec.id, fixtureSet, runs, seed })
	const answerKey = buildAnswerKey({ experimentId: spec.id, fixtureSet, labelsByArm })
	const labelMap = buildLabelMap({ experimentId: spec.id, seed, labelsByArm })

	const files = new Map()
	for (const arm of fixtureSet.arms) files.set(`${arm.arm}.roomodes`, arm.text)
	files.set("plan.json", json(plan))
	files.set("answer-key.json", json(answerKey))
	files.set("_label-map.json", json(labelMap))

	const perArm = new Map()
	for (const run of runs) perArm.set(run.arm, (perArm.get(run.arm) ?? 0) + 1)

	return { spec, fixtureSet, labelsByArm, runs, plan, files, perArm }
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
	const brief = e20dBrief()
	const built = buildFixture({ baseText, seed: opts.seed })
	const { spec, fixtureSet, runs } = built

	console.log(`${E20D_ID} — fixture generator (one brief exchanged, both lines held)`)
	console.log("")
	console.log(`base picker: ${path.relative(ROOT, BASE_PICKER_PATH)} — one brief, verbatim:`)
	console.log(`  ${E20D_BRIEF_ID}: ${JSON.stringify(brief.text)} (${brief.text.length} ch)`)
	console.log(
		`  line B (${REGISTERED_LINES.B.length} ch): ${JSON.stringify(REGISTERED_LINES.B)}`,
	)
	console.log(
		`  line C (${REGISTERED_LINES.C.length} ch): ${JSON.stringify(REGISTERED_LINES.C)}`,
	)
	console.log("")

	// The pickers must be E20's, byte for byte. A local derivation is not enough:
	// the comparison is against the files E20's own generator wrote.
	for (const arm of fixtureSet.arms) {
		const registeredPath = path.join(E20_DIR, `${arm.arm}.roomodes`)
		const registered = await readIfExists(registeredPath)
		if (registered === null) {
			console.error(`error: ${path.relative(ROOT, registeredPath)} does not exist`)
			return 2
		}
		if (registered !== arm.text) {
			console.error(
				`error: E20d arm ${arm.arm} does not reproduce ${path.relative(ROOT, registeredPath)} byte for byte; ` +
					"the only permitted difference from E20 is the brief",
			)
			return 2
		}
		if (arm.picker.includes(E20D_BRIEF_TEXT)) {
			console.error(`error: E20d's brief appears inside the ${arm.arm} picker`)
			return 2
		}
		console.log(`  arm ${pad(arm.arm, 2)} reproduces ${path.relative(ROOT, registeredPath)} byte for byte`)
	}

	const hashes = runs.map((run) => run.promptSha256)
	const distinct = [...new Set(hashes)]
	if (distinct.length !== fixtureSet.arms.length) {
		console.error(`error: ${distinct.length} distinct prompt hashes, expected ${fixtureSet.arms.length}`)
		return 2
	}
	console.log("")
	console.log(`  plan: ${runs.length} runs · cycle ${spec.cycle.join(" ")} × ${spec.cycles} · ${distinct.length} distinct promptSha256`)
	for (const [index, arm] of fixtureSet.arms.entries()) {
		console.log(`    ${arm.arm}: ${distinct[index]} (${hashes.filter((hash) => hash === distinct[index]).length} runs)`)
	}
	console.log(
		`  arm counts: ${[...built.perArm.entries()].map(([arm, count]) => `${arm} ${count}`).join(" · ")} ` +
			`(declared ${spec.arms.map((arm) => `${arm.arm} ${arm.draws}`).join(" · ")})`,
	)
	console.log(`  expected total from the plan: ${expectedRuns(spec.id)}`)
	const head = runs.slice(0, 10)
	console.log(`  first 10 cycle positions: ${head.map((run) => run.arm.padEnd(2)).join(" ")}`)
	console.log(`  first 10 blind labels:    ${head.map((run) => run.label.padEnd(6)).join(" ")}`)
	const adjacentSameArm = runs.filter((run, index) => index > 0 && runs[index - 1].label === run.label).length
	console.log(`  adjacent runs sharing an arm: ${adjacentSameArm} (0 is the registered property)`)
	console.log("")

	if (opts.check) {
		let drifted = 0
		for (const [name, content] of built.files) {
			const current = await readIfExists(path.join(spec.dir, name))
			const ok = current === content
			if (!ok) drifted++
			console.log(`  check ${pad(name, 20)} ${ok ? "byte-identical" : "DRIFTED"}`)
		}
		console.log(
			drifted === 0 ? "check: PASS — the disk matches the derivation" : `check: FAIL — ${drifted} file(s) drifted`,
		)
		return drifted === 0 ? 0 : 1
	}

	await fs.mkdir(spec.dir, { recursive: true })
	for (const [name, content] of built.files) {
		await fs.writeFile(path.join(spec.dir, name), content, "utf-8")
	}
	const promptDir = path.join(out, "prompts")
	await fs.mkdir(promptDir, { recursive: true })
	for (const run of runs) {
		await fs.writeFile(path.join(promptDir, `${run.runId}.txt`), run.text, "utf-8")
	}

	console.log(`written: ${[...built.files.keys()].join(", ")} → ${path.relative(ROOT, spec.dir)}/`)
	console.log(`prompts: ${runs.length} files → ${promptDir}`)
	console.log(`sealed: answer-key.json and _label-map.json must never enter a scorer bundle.`)
	console.log("dry-run only: no provider call was made and none is possible from this file.")
	return 0
}

main()
	.then((code) => process.exit(code))
	.catch((error) => {
		console.error(`generate-e20d-fixtures failed: ${error.message}`)
		process.exit(2)
	})
