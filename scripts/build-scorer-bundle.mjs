#!/usr/bin/env node

/**
 * build-scorer-bundle.mjs — the structural blinding mitigation (registration I-5, I-6).
 *
 * WHY THIS EXISTS
 *   E11 handed scorers a directory that still contained `plan.json`, which named
 *   the catalogue labels and de-blinded the batch on the first `cat`. Instruction
 *   ("do not open the plan") is not a mitigation. This tool is: it copies only
 *   `prompt.txt` and `response.txt` into case folders, adds the rubric, and
 *   refuses to write anything that carries an arm letter, a condition name, a
 *   fixture name, a catalogue label, a run id or the sealed answer key.
 *
 * TWO BUNDLES, TWO ORDERS
 *   Each bundle is shuffled independently from a different seed, so the two case
 *   orderings cannot be aligned by a scorer who compares them. The ordering is
 *   deterministic per seed, so the mapping can be audited later.
 *
 * WHERE THE MAP GOES (objection 18)
 *   The case id → run id map is a de-blinding document. The default output used
 *   to be `<run>/scoring-bundles`, i.e. one `..` from `plan.json`, the blind map
 *   and the sealed answer key. It now defaults to a neutral directory created by
 *   `fs.mkdtemp` under the system temporary directory — unique to this process and
 *   owner-only, so no other local user can pre-create or read it (code-scanning
 *   `js/insecure-temporary-file`) — and the tool refuses an `--out` that is inside
 *   the run directory or inside a bundle. The resolved output directory is printed
 *   so an operator can find it, and the tool prints bundle and map paths only —
 *   never the run path. An explicit `--out` is used verbatim.
 *
 * WHAT IS EXCLUDED
 *   Anything whose status is not `RUN`, and anything whose `finishReason` is
 *   neither `STOP` nor absent (objection 17: a truncated answer used to be
 *   bundled and scored). The answer key, the plan and the maps are never inputs
 *   to a bundle, and the written tree is re-checked for their filenames.
 *
 * DUPLICATES (objection 10b)
 *   Five clean responses are duplicated into each bundle under fresh case ids, at
 *   shuffled positions, so a scorer meets identical text twice without knowing
 *   it. The selection is deterministic and recorded in `_duplicate-map.json`
 *   outside both bundles.
 *
 * EXIT STATUS
 *   0  both bundles written, leak and sealed-file checks clean
 *   1  a leak or sealed-file check failed — nothing is kept
 *   2  bad arguments, or an input file is missing
 *
 * No dependencies. Node 22 ESM.
 */

import * as fs from "node:fs/promises"
import * as path from "node:path"

import { resolveEvalOutputDir } from "./lib/eval-output-dir.mjs"
import { isTruncatedFinishReason } from "./lib/framing-pretest-results.mjs"
import { orderForBundle, selectDuplicateSources, walkFiles } from "./lib/scorer-bundle-cases.mjs"
import { RUBRIC_MD } from "./lib/scorer-rubric.mjs"
import { RUBRIC_LEAK_PATTERNS, findLeaks, findSealedFiles, isInside, isInsideBundle } from "./lib/scorer-bundle-guards.mjs"

/** mkdtemp prefix for the default output directory (see lib/eval-output-dir.mjs). */
const DEFAULT_OUT_PREFIX = "roo-plus-scoring-bundles-"
const DUPLICATE_COUNT = 5
const DUPLICATE_SALT = "b3-isolation-scorer-reliability-2026-11-11"

const USAGE = `Usage: node scripts/build-scorer-bundle.mjs --run <dir> [options]

  --run <dir>          a run directory holding plan.json, results.jsonl,
                       prompts/<runId>.txt and transcripts/<runId>.txt
  --out <dir>          where bundle-A/, bundle-B/ and the maps are written
                       (default: a fresh fs.mkdtemp directory under the system
                       temp root, printed on start). Must not be inside the run
                       directory or inside a bundle.
  --seed-a <s>         shuffle seed for bundle A (default: fixed literal)
  --seed-b <s>         shuffle seed for bundle B (default: fixed literal)
  --help               print this text
`

const DEFAULT_SEED_A = "scorer-A-b3-isolation-2026-11-11"
const DEFAULT_SEED_B = "scorer-B-b3-isolation-2026-11-11"

function parseArgs(argv) {
	const opts = { run: "", out: "", seedA: DEFAULT_SEED_A, seedB: DEFAULT_SEED_B, help: false }
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i]
		const value = () => {
			const next = argv[++i]
			if (next === undefined) throw new Error(`${arg} needs a value`)
			return next
		}
		if (arg === "--run") opts.run = value()
		else if (arg === "--out") opts.out = value()
		else if (arg === "--seed-a") opts.seedA = value()
		else if (arg === "--seed-b") opts.seedB = value()
		else if (arg === "--help" || arg === "-h") opts.help = true
		else throw new Error(`unknown argument: ${arg}`)
	}
	return opts
}

async function readCases(runDir) {
	const plan = JSON.parse(await fs.readFile(path.join(runDir, "plan.json"), "utf-8"))
	const results = (await fs.readFile(path.join(runDir, "results.jsonl"), "utf-8"))
		.split("\n")
		.filter((line) => line.trim() !== "")
		.map((line) => JSON.parse(line))

	const byRunId = new Map(results.map((record) => [record.runId, record]))
	const cases = []
	const excluded = []

	for (const run of plan.runs) {
		const record = byRunId.get(run.runId)
		if (!record) throw new Error(`results.jsonl has no record for ${run.runId}`)
		if (record.status !== "RUN") {
			excluded.push({ runId: run.runId, status: record.status, reason: record.reason ?? null })
			continue
		}
		if (isTruncatedFinishReason(record.finishReason)) {
			excluded.push({
				runId: run.runId,
				status: "INVALID",
				reason: `finishReason ${record.finishReason} is not STOP: a truncated answer is never partially scored`,
			})
			continue
		}
		cases.push({
			runId: run.runId,
			prompt: await fs.readFile(path.join(runDir, "prompts", `${run.runId}.txt`), "utf-8"),
			response: await fs.readFile(path.join(runDir, "transcripts", `${run.runId}.txt`), "utf-8"),
		})
	}

	if (cases.length === 0) throw new Error("no run in results.jsonl is a clean RUN; there is nothing to score")

	// Deterministic, clean-only duplicate selection: see lib/scorer-bundle-cases.mjs.
	const sources = selectDuplicateSources(cases, DUPLICATE_SALT, DUPLICATE_COUNT)

	return { cases, excluded, sources }
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

	const runDir = path.resolve(opts.run)
	const outDir = await resolveEvalOutputDir(opts.out, { prefix: DEFAULT_OUT_PREFIX })
	console.log(`output directory: ${outDir}`)

	// The bundles and the maps may not live inside the run directory: that
	// directory holds plan.json, the blind map and the sealed answer key.
	if (isInside(outDir, runDir)) {
		console.error("error: --out is inside the run directory. The bundles and maps must be written elsewhere.")
		return 2
	}
	if (isInsideBundle(outDir)) {
		console.error("error: --out points inside bundle-A/ or bundle-B/. The case map must live outside both.")
		return 2
	}
	const mapPath = path.join(outDir, "_case-maps.json")
	const duplicatePath = path.join(outDir, "_duplicate-map.json")
	for (const target of [mapPath, duplicatePath]) {
		if (isInsideBundle(target) || isInside(target, runDir)) {
			console.error(`error: refusing to write ${path.basename(target)} at a de-blinding location.`)
			return 2
		}
	}

	let cases
	let excluded
	let sources
	try {
		;({ cases, excluded, sources } = await readCases(runDir))
	} catch (error) {
		console.error(`error: ${error.message}`)
		return 2
	}

	const orderA = orderForBundle(cases, sources, opts.seedA)
	const orderB = orderForBundle(cases, sources, opts.seedB)
	if (orderA.every((item, index) => item.runId === orderB[index]?.runId)) {
		console.error("error: the two seeds produced the same case order; the bundles could be aligned")
		return 1
	}

	// Leak check before a single byte is written: a bundle that might leak must
	// never exist, not even briefly.
	const leaks = []
	for (const { runId, prompt, response } of cases) {
		leaks.push(...findLeaks(prompt, `prompt(${runId})`), ...findLeaks(response, `response(${runId})`))
	}
	leaks.push(...findLeaks(RUBRIC_MD, "rubric.md", RUBRIC_LEAK_PATTERNS))

	if (leaks.length > 0) {
		console.error(`error: leak check failed — ${leaks.length} occurrence(s). Nothing was written.`)
		for (const leak of leaks.slice(0, 40)) console.error(`  - ${leak}`)
		return 1
	}

	const caseMap = { A: [], B: [] }
	const duplicateMap = { A: [], B: [] }

	const writeBundle = async (name, seed, order) => {
		const bundleDir = path.join(outDir, name)
		await fs.rm(bundleDir, { recursive: true, force: true })
		for (const [index, item] of order.entries()) {
			const caseId = `case-${String(index + 1).padStart(2, "0")}`
			const caseDir = path.join(bundleDir, caseId)
			await fs.mkdir(caseDir, { recursive: true })
			await fs.writeFile(path.join(caseDir, "prompt.txt"), item.prompt, "utf-8")
			await fs.writeFile(path.join(caseDir, "response.txt"), item.response, "utf-8")
			await fs.writeFile(path.join(caseDir, "rubric.md"), RUBRIC_MD, "utf-8")
			const bucket = name === "bundle-A" ? "A" : "B"
			caseMap[bucket].push({ caseId, runId: item.runId, kind: item.kind })
			if (item.kind === "duplicate") duplicateMap[bucket].push({ caseId, duplicateOf: item.duplicateOf })
		}
		console.log(`${path.join(outDir, name)}: ${order.length} cases (${cases.length} base + ${sources.length} duplicate), seed ${seed}`)
	}

	await fs.mkdir(outDir, { recursive: true })
	await writeBundle("bundle-A", opts.seedA, orderA)
	await writeBundle("bundle-B", opts.seedB, orderB)

	// The written tree is re-checked, not just the inputs: a bundle is the thing
	// a scorer opens, so the seal is verified where it matters.
	const sealed = []
	const expectedNames = new Set(["prompt.txt", "response.txt", "rubric.md"])
	for (const name of ["bundle-A", "bundle-B"]) {
		const bundleDir = path.join(outDir, name)
		const entries = await walkFiles(bundleDir)
		sealed.push(...findSealedFiles(entries).map((entry) => `${name}/${entry}`))
		const unexpected = entries.filter((entry) => !expectedNames.has(path.basename(entry.path)))
		if (unexpected.length > 0) {
			console.error(`error: ${name} contains unexpected entries: ${unexpected.map((entry) => entry.path).join(", ")}`)
			return 1
		}
	}
	if (sealed.length > 0) {
		console.error(`error: a sealed file reached a bundle: ${sealed.join(", ")}. Nothing is kept.`)
		for (const name of ["bundle-A", "bundle-B"]) await fs.rm(path.join(outDir, name), { recursive: true, force: true })
		return 1
	}

	await fs.writeFile(
		mapPath,
		JSON.stringify(
			{
				warning:
					"SCORERS MUST NOT OPEN THIS FILE. It maps case ids to run ids, and E12 run ids encode the condition.",
				seeds: { A: opts.seedA, B: opts.seedB },
				rubric: "scripts/lib/scorer-rubric.mjs (Amendment 1 rubric, copied verbatim)",
				cases: caseMap,
				excluded,
			},
			null,
			2,
		) + "\n",
		"utf-8",
	)
	await fs.writeFile(
		duplicatePath,
		JSON.stringify(
			{
				warning:
					"SCORERS MUST NOT OPEN THIS FILE. It names which case ids are duplicates of which response.",
				salt: DUPLICATE_SALT,
				rule: "clean responses only (status RUN, finishReason STOP or absent), ordered by sha256(runId + salt), first five",
				sources: sources.map((source) => source.runId),
				cases: duplicateMap,
			},
			null,
			2,
		) + "\n",
		"utf-8",
	)

	const orderAgrees = caseMap.A.filter((entry, index) => entry.runId === caseMap.B[index]?.runId).length
	console.log(`case map written outside both bundles (${caseMap.A.length} + ${caseMap.B.length} entries)`)
	console.log(`duplicate map written outside both bundles (${sources.length} responses, ${duplicateMap.A.length + duplicateMap.B.length} duplicate cases)`)
	console.log(`orderings in the same position: ${orderAgrees} of ${caseMap.A.length} (0 means fully independent)`)
	if (excluded.length > 0) console.log(`excluded runs: ${excluded.length}`)
	return 0
}

main()
	.then((code) => process.exit(code))
	.catch((error) => {
		console.error(`build-scorer-bundle failed: ${error.message}`)
		process.exit(1)
	})
