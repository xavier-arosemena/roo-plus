#!/usr/bin/env node

/**
 * generate-routing-round-fixtures.mjs — the six pickers, the 600-run plan and
 * the two sealed files for the routing closing round (E13-R, Stage 1).
 *
 * WHAT IT WRITES
 *   test-fixtures/frames/routing-round/
 *     C1.roomodes … C6.roomodes    the six pickers (45 entries each)
 *     plan.json                    600 runs, labels only, no cell names
 *     answer-key.json              sealed: expected owner per label
 *     _label-map.json              sealed: label → cell, with the blind seed
 *   and, unless --check, the 600 prompts under `--out` (default: a temp dir).
 *
 * WHAT IT REFUSES TO TRUST
 *   `buildFixtureSet` diffs every derived picker against the base by line and
 *   throws unless the changed lines are exactly the ones the cell's own spec
 *   implies. It asserts C6 carries `debug`'s routing line verbatim and not the
 *   artefact fixture's bug-report line — the independent red team's objection 3,
 *   which is the single most important detail in this build.
 *
 * NO MODEL CALL IS POSSIBLE HERE
 *   This file reads two fixtures, writes files and prints a summary. It has no
 *   provider protocol, reads no key, and cannot read `.env`.
 *
 * EXIT STATUS
 *   0  fixtures written, or --check found the disk byte-identical
 *   1  --check found drift
 *   2  a precondition or assertion failed
 *
 * See scripts/ROUTING-ROUND.md for the operator procedure.
 */

import * as fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import { ROOT } from "./lib/framing-pretest.mjs"
import {
	ARTEFACT_FIXTURE_PATH,
	AXIS_FIXTURE_PATH,
	CELLS,
	DRAWS_PER_CELL,
	DEFAULT_BLIND_SEED,
	ROUTING_ROUND_DIR,
	analysePromptPairs,
	buildAnswerKey,
	buildFixtureSet,
	buildLabelMap,
	buildPlanDocument,
	buildRuns,
	labelCells,
} from "./lib/routing-round.mjs"

const DEFAULT_OUT = path.join(os.tmpdir(), "roo-plus-routing-round")

const USAGE = `Usage: node scripts/generate-routing-round-fixtures.mjs [options]

  --check              compare the generated files with the ones on disk and exit
                       1 on any drift; writes nothing and emits no prompt files
  --out <dir>          where the 600 prompt files are written
                       (default: ${DEFAULT_OUT}); never inside test-fixtures/
  --blind-seed <s>     seed for the blind label assignment
                       (default: fixed literal so repeated runs are byte-identical)
  --help               print this text
`

function parseArgs(argv) {
	const opts = { check: false, out: DEFAULT_OUT, blindSeed: DEFAULT_BLIND_SEED, help: false }
	for (let index = 0; index < argv.length; index++) {
		const arg = argv[index]
		const value = () => {
			const next = argv[++index]
			if (next === undefined) throw new Error(`${arg} needs a value`)
			return next
		}
		if (arg === "--check") opts.check = true
		else if (arg === "--out") opts.out = value()
		else if (arg === "--blind-seed") opts.blindSeed = value()
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
	try {
		return await fs.readFile(target, "utf-8")
	} catch {
		return null
	}
}

function describeChangedLines(cell) {
	if (cell.changedLines.length === 0) return "none (identical to the base picker)"
	return cell.changedLines.join(",")
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

	const baseText = await fs.readFile(AXIS_FIXTURE_PATH, "utf-8")
	const artefactText = await fs.readFile(ARTEFACT_FIXTURE_PATH, "utf-8")

	const fixtureSet = buildFixtureSet({ baseText, artefactText })
	const labelsByCell = labelCells(opts.blindSeed)
	const runs = buildRuns({ fixtureSet, labelsByCell })
	const pairs = analysePromptPairs(fixtureSet.cells)

	const plan = buildPlanDocument({ runs, seed: opts.blindSeed })
	const answerKey = buildAnswerKey({ fixtureSet, labelsByCell })
	const labelMap = buildLabelMap({ seed: opts.blindSeed, labelsByCell })

	const files = new Map()
	for (const cell of fixtureSet.cells) files.set(`${cell.spec.cell}.roomodes`, cell.text)
	files.set("plan.json", json(plan))
	files.set("answer-key.json", json(answerKey))
	files.set("_label-map.json", json(labelMap))

	// The summary is printed in both modes so a reader can check the arithmetic
	// without opening the sealed files.
	console.log("routing closing round — Stage 1 fixture generator")
	console.log("")
	console.log(`base picker: ${path.relative(ROOT, AXIS_FIXTURE_PATH)} — ${fixtureSet.baseModes.length} entries`)
	console.log(`persona: ${plan.persona.id} (${plan.persona.condition}) — ${JSON.stringify(plan.persona.directive)}`)
	console.log("")
	console.log("derivation — every file is asserted byte-identical except the target entry:")
	for (const cell of fixtureSet.cells) {
		const entry = cell.modes[cell.targetIndex]
		const spec = cell.spec
		const arrow = spec.slug === spec.target ? spec.slug : `${spec.target} → ${spec.slug}`
		console.log(
			`  ${pad(spec.cell, 3)} ${pad(arrow, 22)} ${pad(`whenToUse: ${spec.line === null ? "native" : (spec.factor?.mood ?? "")}`, 16)} ` +
				`changed lines: ${describeChangedLines(cell)}`,
		)
		if (entry.slug !== spec.slug) throw new Error(`${spec.cell}: sanity check failed`)
	}
	const c6 = fixtureSet.cells.find((cell) => cell.spec.cell === "C6")
	console.log(
		`  C6 line equals debug's line byte-for-byte: ${c6.modes[c6.targetIndex].whenToUse === fixtureSet.baseModes.find((mode) => mode.slug === "debug").whenToUse}`,
	)
	console.log("")
	console.log(
		`plan: ${runs.length} runs — ${DRAWS_PER_CELL} per cell, ${new Set(runs.map((run) => run.promptSha256)).size} unique prompts`,
	)
	const perLabel = new Map()
	for (const run of runs) perLabel.set(run.label, (perLabel.get(run.label) ?? 0) + 1)
	console.log(`  per label: ${[...perLabel.entries()].map(([label, count]) => `${label} ${count}`).join(", ")}`)
	const adjacentSameCell = runs.filter((run, index) => index > 0 && runs[index - 1].label === run.label).length
	console.log(`  interleaving: draw-major; adjacent runs sharing a cell: ${adjacentSameCell}`)
	console.log(
		`  first 12 run ids: ${runs
			.slice(0, 12)
			.map((run) => run.runId)
			.join(" ")}`,
	)
	console.log("")
	console.log("pairwise prompt diff — only the brief line and the target entry may differ:")
	for (const row of pairs) {
		console.log(
			`  ${row.left} vs ${row.right}: line(s) ${row.changed.join(",") || "none"} [${[...new Set(row.zones)].join(", ")}]`,
		)
	}
	console.log("")
	const hygiene = { roleDefinition: 0, customInstructions: 0, "groups:": 0 }
	for (const cell of fixtureSet.cells) {
		for (const literal of Object.keys(hygiene)) {
			hygiene[literal] += cell.prompt.split(literal).length - 1
		}
	}
	console.log(
		`prompt hygiene: ${Object.entries(hygiene)
			.map(([literal, count]) => `${literal} ${count}`)
			.join(", ")}`,
	)
	console.log("")

	if (opts.check) {
		let drifted = 0
		for (const [name, content] of files) {
			const current = await readIfExists(path.join(ROUTING_ROUND_DIR, name))
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

	await fs.mkdir(ROUTING_ROUND_DIR, { recursive: true })
	for (const [name, content] of files) {
		await fs.writeFile(path.join(ROUTING_ROUND_DIR, name), content, "utf-8")
	}

	await fs.mkdir(path.join(out, "prompts"), { recursive: true })
	for (const run of runs) {
		await fs.writeFile(path.join(out, "prompts", `${run.runId}.txt`), run.text, "utf-8")
	}

	console.log(`written: ${[...files.keys()].join(", ")} → ${path.relative(ROOT, ROUTING_ROUND_DIR)}/`)
	console.log(`prompts: ${runs.length} files → ${path.join(out, "prompts")}`)
	console.log("sealed: answer-key.json and _label-map.json must never enter a scorer bundle.")
	console.log("dry-run only: no provider call was made and none is possible from this file.")
	return 0
}

main()
	.then((code) => process.exit(code))
	.catch((error) => {
		console.error(`generate-routing-round-fixtures failed: ${error.message}`)
		process.exit(2)
	})
