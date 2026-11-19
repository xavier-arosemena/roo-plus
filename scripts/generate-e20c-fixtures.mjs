#!/usr/bin/env node

/**
 * generate-e20c-fixtures.mjs — the E20c fixture registered in
 * [`docs/reviews/2026-11-17-e20c-preregistration.md`]: three arms, one brief,
 * one swapped index, 600 calls.
 *
 * WHAT IT WRITES
 *   test-fixtures/frames/e20c/
 *     X.roomodes   E20's arm B picker, unchanged (control, §2)
 *     Y.roomodes   `documentation` swapped with the occupant of index 44
 *     Z.roomodes   `architecture-reviewer` swapped with the occupant of index 44
 *     plan.json    600 runs in the registered cycle, the swap pairs recorded
 *     answer-key.json   sealed: arm id → expected owner, shared vocabulary
 *     _label-map.json   sealed: arm id → arm letter
 *   and, unless --check, the 600 prompts under `--out` (default: a temp dir).
 *
 * WHAT IT REFUSES TO TRUST
 *   `buildExperimentSet` parses every derived picker and throws unless the arms
 *   are the base at every entry except the two the swap involves, unless
 *   `explain` sits at index 6 with the registered line in all three, unless the
 *   list length is unchanged, and unless the three prompts hash distinctly. The
 *   two pre-checks in the instruction are assertions here, not operator memory:
 *   `documentation` and `architecture-reviewer` must exist in the picker, and
 *   neither may already occupy index 44. `buildRuns` then asserts the cycle
 *   `X Y Z` × 200 with exact 200/200/200 counts and no adjacent repeat.
 *
 *   A violated assertion is a build failure (exit 2), never a warning.
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
	DEFAULT_E20C_BLIND_SEED,
	E20C_ARMS,
	E20C_BRIEF_ID,
	E20C_CYCLES,
	E20C_CYCLE,
	E20C_EXPLAIN_INDEX,
	E20C_LAST_INDEX,
	E20C_LINE,
	E20C_PICKER_LENGTH,
	E20C_REGISTERED_LINE_LENGTH,
	E20C_SPEC,
	buildAnswerKey,
	buildExperimentSet,
	buildLabelMap,
	buildPlanDocument,
	buildRuns,
	e20cBrief,
	expectedRuns,
	labelArms,
} from "./lib/e20c.mjs"
import { ROOT } from "./lib/framing-pretest.mjs"
import { ROUTING_ROUND_DIR } from "./lib/routing-round.mjs"

/** E20c's base picker is the closing round's C1 picker: 45 entries, `explain` at 6. */
const BASE_PICKER_PATH = path.join(ROUTING_ROUND_DIR, "C1.roomodes")

const DEFAULT_OUT = path.join(os.tmpdir(), "roo-plus-e20c")

const USAGE = `Usage: node scripts/generate-e20c-fixtures.mjs [options]

  --check              compare the generated files with the ones on disk and exit
                       1 on any drift; writes nothing and emits no prompt files
  --out <dir>          where the 600 prompt files are written
                       (default: ${DEFAULT_OUT}); never inside test-fixtures/
  --seed <s>           seed for the blind arm ids
                       (default: ${DEFAULT_E20C_BLIND_SEED}, so a rerun is byte-identical)
  --help               print this text
`

function parseArgs(argv) {
	const opts = { check: false, out: DEFAULT_OUT, seed: DEFAULT_E20C_BLIND_SEED, help: false }
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
 * in `lib/e20c.mjs`; this function only assembles what it returns.
 */
function buildFixture({ baseText, seed }) {
	const spec = E20C_SPEC
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
	const brief = e20cBrief()
	const built = buildFixture({ baseText, seed: opts.seed })
	const { spec, fixtureSet, runs } = built

	console.log("E20c — fixture generator (the last slot: filler against rival)")
	console.log("")
	console.log(`base picker: ${path.relative(ROOT, BASE_PICKER_PATH)} — one brief, verbatim:`)
	console.log(`  ${brief.id}: ${JSON.stringify(brief.text)} (${brief.text.length} ch)`)
	console.log(
		`  explain line B (${E20C_LINE.length} ch, registration ${E20C_REGISTERED_LINE_LENGTH}): ${JSON.stringify(E20C_LINE)}`,
	)
	console.log("")
	console.log(`explain held at index ${E20C_EXPLAIN_INDEX} (0-based) in all three arms; index ${E20C_LAST_INDEX} is the manipulation`)
	console.log(`original occupant of index ${E20C_LAST_INDEX}: ${fixtureSet.originalOccupant}`)
	console.log("")
	for (const arm of fixtureSet.arms) {
		console.log(
			`  arm ${pad(arm.arm, 3)} moved: ${pad(arm.moved ?? "none (control)", 24)} ` +
				`changed indices: ${JSON.stringify(arm.changedIndices).padEnd(12)} entries ${arm.modes.length} ` +
				`index ${E20C_LAST_INDEX} holds ${pad(arm.modes[E20C_LAST_INDEX].slug, 24)} ${arm.role}`,
		)
	}

	// The pairwise consequence, printed rather than left to arithmetic on paper.
	const byArm = new Map(fixtureSet.arms.map((arm) => [arm.arm, arm]))
	console.log("")
	console.log("pairwise differences (parsed entries):")
	for (let left = 0; left < spec.arms.length; left++) {
		for (let right = left + 1; right < spec.arms.length; right++) {
			const a = byArm.get(spec.arms[left].arm)
			const b = byArm.get(spec.arms[right].arm)
			const changed = a.modes
				.map((mode, index) => (JSON.stringify(mode) !== JSON.stringify(b.modes[index]) ? index : null))
				.filter((index) => index !== null)
			console.log(`  ${a.arm}/${b.arm}: ${JSON.stringify(changed)} (list length ${a.modes.length} = ${b.modes.length})`)
		}
	}

	const hashes = runs.map((run) => run.promptSha256)
	const distinct = [...new Set(hashes)]
	console.log("")
	console.log(
		`  plan: ${runs.length} runs · cycle ${spec.cycle.join(" ")} × ${spec.cycles} · ` +
			`${distinct.length} distinct promptSha256`,
	)
	for (const [index, arm] of fixtureSet.arms.entries()) {
		console.log(`    ${arm.arm}: ${distinct[index]} (${hashes.filter((hash) => hash === distinct[index]).length} runs)`)
	}
	console.log(
		`  arm counts: ${[...built.perArm.entries()].map(([arm, count]) => `${arm} ${count}`).join(" · ")} ` +
			`(registered ${spec.arms.map((arm) => `${arm.arm} ${arm.draws}`).join(" · ")})`,
	)
	console.log(`  expected total from the plan: ${expectedRuns(spec.id)}`)
	const head = runs.slice(0, 9)
	console.log(`  first 9 cycle positions: ${head.map((run) => run.arm.padEnd(3)).join(" ")}`)
	console.log(`  first 9 blind labels:    ${head.map((run) => run.label.padEnd(6)).join(" ")}`)
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
			drifted === 0
				? "check: PASS — the disk matches the derivation"
				: `check: FAIL — ${drifted} file(s) drifted`,
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
		console.error(`generate-e20c-fixtures failed: ${error.message}`)
		process.exit(2)
	})
