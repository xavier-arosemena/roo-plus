#!/usr/bin/env node

/**
 * generate-replication-fixtures.mjs — the second-provider replication material:
 * E20-BC (B against C, 400 draws each) and E20C-XZ (X against Z, 200 each).
 *
 * WHAT IT WRITES
 *   test-fixtures/frames/e20-bc/
 *     B.roomodes C.roomodes   byte-identical copies of e20/B.roomodes and e20/C.roomodes
 *     plan.json               800 runs in the cycle `B C` repeated 400 times
 *     answer-key.json         sealed: arm id → expected owner
 *     _label-map.json         sealed: arm id → arm letter
 *   test-fixtures/frames/e20c-xz/
 *     X.roomodes Z.roomodes   byte-identical copies of e20c/X.roomodes and e20c/Z.roomodes
 *     plan.json               400 runs in the cycle `X Z` repeated 200 times
 *     answer-key.json         sealed, as above
 *     _label-map.json         sealed, as above
 *
 * THE PICKERS ARE COPIES, AND THAT IS CHECKED
 *   `scripts/lib/replication.mjs` re-derives both arms from the closing round's C1
 *   picker through the registered modules, so each derived arm text is compared
 *   with the registered picker it reproduces before anything is written to the new
 *   directory. A copy that drifted from `e20/B.roomodes` fails the build instead of
 *   becoming the material for 800 paid calls.
 *
 * NO MODEL CALL IS POSSIBLE HERE
 *   No provider protocol, no key, no `.env`.
 *
 * EXIT STATUS
 *   0  fixtures written, or --check found the disk byte-identical
 *   1  --check found drift
 *   2  a precondition or assertion failed
 */

import * as fs from "node:fs/promises"
import path from "node:path"

import { ROOT } from "./lib/framing-pretest.mjs"
import { ROUTING_ROUND_DIR } from "./lib/routing-round.mjs"
import { REPLICATIONS } from "./lib/replication.mjs"

const BASE_PICKER_PATH = path.join(ROUTING_ROUND_DIR, "C1.roomodes")

const USAGE = `Usage: node scripts/generate-replication-fixtures.mjs [options]

  --check   compare the generated files with the ones on disk and exit 1 on any
            drift; writes nothing
  --help    print this text
`

function parseArgs(argv) {
	const opts = { check: false, help: false }
	for (const arg of argv) {
		if (arg === "--check") opts.check = true
		else if (arg === "--help" || arg === "-h") opts.help = true
		else throw new Error(`unknown argument: ${arg}`)
	}
	return opts
}

function json(value) {
	return `${JSON.stringify(value, null, 2)}\n`
}

async function readIfExists(target) {
	return await fs.readFile(target, "utf-8").catch(() => null)
}

function pad(text, width) {
	return String(text).padEnd(width)
}

function buildReplication({ module, baseText }) {
	const spec = module.experimentSpec(module.id)
	const fixtureSet = module.buildExperimentSet({ experimentId: module.id, baseText })
	const labelsByArm = module.labelArms(module.id, spec.defaultSeed)
	const runs = module.buildRuns({ experimentId: module.id, fixtureSet, labelsByArm })

	const plan = module.buildPlanDocument({ runs, seed: spec.defaultSeed })
	const answerKey = module.buildAnswerKey({ fixtureSet, labelsByArm })
	const labelMap = module.buildLabelMap({ seed: spec.defaultSeed, labelsByArm })

	const files = new Map()
	for (const arm of fixtureSet.arms) files.set(`${arm.arm}.roomodes`, arm.text)
	files.set("plan.json", json(plan))
	files.set("answer-key.json", json(answerKey))
	files.set("_label-map.json", json(labelMap))

	return { spec, fixtureSet, runs, files }
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

	const baseText = await fs.readFile(BASE_PICKER_PATH, "utf-8")
	console.log("Second-provider replication fixtures — E20-BC and E20C-XZ")
	console.log("")

	const built = []
	for (const module of REPLICATIONS) {
		const replication = buildReplication({ module, baseText })
		const { spec, fixtureSet, runs, files } = replication

		// Each derived arm must be the registered picker it claims to reproduce.
		for (const arm of fixtureSet.arms) {
			const registeredPath = path.join(spec.sourceDir, `${arm.arm}.roomodes`)
			const registered = await readIfExists(registeredPath)
			if (registered === null) {
				console.error(`error: ${path.relative(ROOT, registeredPath)} does not exist`)
				return 2
			}
			if (registered !== arm.text) {
				console.error(
					`error: ${spec.id} arm ${arm.arm} does not reproduce ${path.relative(ROOT, registeredPath)} ` +
						"byte for byte; the replication would not be the registered material",
				)
				return 2
			}
		}

		const perArm = new Map()
		for (const run of runs) perArm.set(run.arm, (perArm.get(run.arm) ?? 0) + 1)
		const hashes = new Set(runs.map((run) => run.promptSha256))

		console.log(spec.title)
		console.log(`  directory: ${path.relative(ROOT, spec.dir)}/`)
		console.log(
			`  plan: ${runs.length} runs · cycle ${spec.cycle.join(" ")} × ${spec.cycles} · ` +
				`${hashes.size} distinct promptSha256 (expected ${fixtureSet.arms.length})`,
		)
		console.log(
			`  arm counts: ${[...perArm.entries()].map(([arm, count]) => `${arm} ${count}`).join(" · ")} ` +
				`(declared ${spec.arms.map((arm) => `${arm.arm} ${arm.draws}`).join(" · ")})`,
		)
		console.log(`  first 8 arms: ${runs.slice(0, 8).map((run) => run.arm).join(" ")}`)
		console.log(`  first 8 labels: ${runs.slice(0, 8).map((run) => run.label).join(" ")}`)
		console.log("")

		if (hashes.size !== fixtureSet.arms.length) {
			console.error(`error: ${spec.id} has ${hashes.size} distinct prompt hashes, expected ${fixtureSet.arms.length}`)
			return 2
		}

		built.push(replication)
	}

	if (opts.check) {
		let drifted = 0
		for (const { spec, files } of built) {
			for (const [name, content] of files) {
				const current = await readIfExists(path.join(spec.dir, name))
				const ok = current === content
				if (!ok) drifted++
				console.log(`  check ${pad(`${spec.id}/${name}`, 26)} ${ok ? "byte-identical" : "DRIFTED"}`)
			}
		}
		console.log(drifted === 0 ? "check: PASS — the disk matches the derivation" : `check: FAIL — ${drifted} file(s) drifted`)
		return drifted === 0 ? 0 : 1
	}

	for (const { spec, files } of built) {
		await fs.mkdir(spec.dir, { recursive: true })
		for (const [name, content] of files) {
			await fs.writeFile(path.join(spec.dir, name), content, "utf-8")
		}
		console.log(`written: ${[...files.keys()].join(", ")} → ${path.relative(ROOT, spec.dir)}/`)
	}
	console.log("sealed: answer-key.json and _label-map.json must never enter a scorer bundle.")
	console.log("dry-run only: no provider call was made and none is possible from this file.")
	return 0
}

main()
	.then((code) => process.exit(code))
	.catch((error) => {
		console.error(`generate-replication-fixtures failed: ${error.message}`)
		process.exit(2)
	})
