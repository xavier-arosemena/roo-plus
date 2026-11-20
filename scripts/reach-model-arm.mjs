/**
 * reach-model-arm.mjs — E24's model arm: does the model reach the owner when the
 * line does not carry the user's words?
 *
 * One call per job (119), product-rendered picker, the standing request that lets
 * it ask. The lexical arm already ran for free; this is the paid half the
 * registration prices at ≈€0.6.
 *
 *   node scripts/reach-model-arm.mjs                 # dry run: prompts only, no calls
 *   node scripts/reach-model-arm.mjs --limit 3 --run --model gemini-3.5-flash
 *   node scripts/reach-model-arm.mjs --run --model gemini-3.5-flash
 *
 * A dry run is not optional politeness: the prompts are the artefact, and reading
 * one before the first call is how the format divergences in log §32 would have
 * been caught a week earlier.
 */

import { createHash } from "node:crypto"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { pickerTextFor } from "./lib/framing-pretest.mjs"
import { classifyProductReply } from "./lib/r0-extract.mjs"
import { parseRoomodes } from "./lib/roomodes-lite.mjs"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const CORPUS = "test-fixtures/reach/probes.json"
const CATALOGUE = "test-fixtures/frames/axis-stance.roomodes"
const OUT = "runs/reach-arm-2026-11-20"

const FRAMING = [
	"You are exploring. Say what you want to achieve, not what you want handed back.",
	"",
	"Pick exactly one mode from the list below for the request that follows. If you cannot tell which mode fits, say what information you need instead of guessing.",
	"",
].join("\n")

const sha = (text) => createHash("sha256").update(text, "utf8").digest("hex")

function parseArgs(argv) {
	const options = { run: false, model: null, limit: null, runner: null, force: false }
	for (let i = 0; i < argv.length; i += 1) {
		const arg = argv[i]
		const value = () => {
			i += 1
			if (!argv[i]) throw new Error(`${arg} needs a value`)
			return argv[i]
		}
		if (arg === "--run") options.run = true
		else if (arg === "--force") options.force = true
		else if (arg === "--model") options.model = value()
		else if (arg === "--runner") options.runner = value()
		else if (arg === "--limit") options.limit = Number(value())
		else throw new Error(`unknown argument: ${arg}`)
	}
	return options
}

const options = parseArgs(process.argv.slice(2))

const corpusText = fs.readFileSync(path.join(ROOT, CORPUS), "utf8")
const corpus = JSON.parse(corpusText)
const { entries, digest: catalogueDigest } = parseRoomodes(fs.readFileSync(path.join(ROOT, CATALOGUE), "utf8"))
const picker = pickerTextFor(entries, "product")
const pickerDigest = sha(picker)
const slugs = new Set(entries.map((entry) => entry.slug))

// One probe per job, chosen deterministically: the lowest id for that job.
const byJob = new Map()
for (const probe of corpus.probes) {
	if (!byJob.has(probe.jobId)) byJob.set(probe.jobId, probe)
}

const runs = [...byJob.values()]
	.sort((a, b) => (a.jobId < b.jobId ? -1 : a.jobId > b.jobId ? 1 : 0))
	.map((probe) => {
		const runId = `reach-${probe.jobId.toLowerCase()}-01`
		const prompt = `${FRAMING}\n${probe.request}\n\n${picker}`
		return {
			runId,
			jobId: probe.jobId,
			axis: probe.axis,
			owner: probe.owner,
			probeId: probe.id,
			request: probe.request,
			prompt,
			promptSha256: sha(prompt),
		}
	})

const outDir = path.join(ROOT, OUT)
const planPath = path.join(outDir, "plan.json")
if (fs.existsSync(planPath)) {
	const previous = JSON.parse(fs.readFileSync(planPath, "utf8"))
	if (previous.catalogueDigest !== catalogueDigest || previous.corpusDigest !== sha(corpusText)) {
		if (!options.force) {
			throw new Error(
				`${OUT}/plan.json was built from a different corpus or catalogue; a changed corpus is a new run (borrowed from ECC, review §A5 B2). Use --force only to start a new run.`,
			)
		}
	}
}

const plan = {
	schemaVersion: "ecc.reach-model-arm.v1",
	registration: "docs/reviews/2026-11-20-e24-reach-preregistration.md",
	model: options.model,
	catalogueDigest,
	pickerDigest,
	corpusDigest: sha(corpusText),
	pickerFormat: "product",
	calls: runs.length,
	ownerless: runs.filter((run) => run.owner === null).length,
	prompts: runs.map(({ prompt, ...rest }) => rest),
}
fs.mkdirSync(path.join(outDir, "prompts"), { recursive: true })
fs.writeFileSync(planPath, `${JSON.stringify(plan, null, 2)}\n`)
for (const run of runs) fs.writeFileSync(path.join(outDir, "prompts", `${run.runId}.txt`), run.prompt)

const selected = options.limit ? runs.slice(0, options.limit) : runs

if (!options.run) {
	process.stdout.write(
		`dry run: ${selected.length} prompts written to ${OUT}/prompts; catalogue ${catalogueDigest.slice(0, 12)}… picker ${pickerDigest.slice(0, 12)}…; ${plan.ownerless} jobs have no owner and are excluded from agreement\n`,
	)
	process.exit(0)
}
if (!options.model) throw new Error("--run needs --model")

const template = options.runner ?? `node scripts/lib/gemini-runner.mjs {prompt} {out} {model} {usage} {runId}`
const results = []
for (const [index, run] of selected.entries()) {
	const promptPath = path.join(outDir, "prompts", `${run.runId}.txt`)
	const outPath = path.join(outDir, "transcripts", `${run.runId}.txt`)
	const usagePath = path.join(outDir, "usage", `${run.runId}.json`)
	fs.mkdirSync(path.dirname(outPath), { recursive: true })
	fs.mkdirSync(path.dirname(usagePath), { recursive: true })
	const command = template
		.replaceAll("{prompt}", `"${promptPath}"`)
		.replaceAll("{out}", `"${outPath}"`)
		.replaceAll("{usage}", `"${usagePath}"`)
		.replaceAll("{model}", options.model)
		.replaceAll("{runId}", run.runId)
	const started = Date.now()
	const child = spawnSync(command, { shell: true, cwd: ROOT, encoding: "utf8" })
	const reply = fs.existsSync(outPath) ? fs.readFileSync(outPath, "utf8") : ""
	const machine = classifyProductReply(reply, slugs)
	const row = {
		index,
		runId: run.runId,
		jobId: run.jobId,
		axis: run.axis,
		owner: run.owner,
		verdict: machine.verdict,
		slug: machine.slug ?? null,
		rule: machine.rule,
		agrees: run.owner === null ? null : machine.slug === run.owner,
		exitCode: child.status,
		ms: Date.now() - started,
	}
	results.push(row)
	process.stdout.write(
		`${row.runId} ${row.verdict}${row.slug ? ":" + row.slug : ""} ${row.agrees === null ? "unowned" : row.agrees ? "OK" : "MISS"}\n`,
	)
}

fs.writeFileSync(path.join(outDir, "results.jsonl"), results.map((row) => JSON.stringify(row)).join("\n") + "\n")

const owned = results.filter((row) => row.owner !== null)
const summary = {
	schemaVersion: "ecc.reach-model-arm.v1",
	warning:
		"Descriptive only: no contrast, no p-value. Agreement is against the frame's authored owner, which is a judgement, not a golden key (M-1).",
	model: options.model,
	calls: results.length,
	ownerless: results.filter((row) => row.owner === null).length,
	ask: results.filter((row) => row.verdict === "ASK").length,
	declaration: results.filter((row) => row.verdict === "DECLARATION").length,
	unresolved: results.filter((row) => !["ASK", "DECLARATION"].includes(row.verdict)).length,
	agreement: {
		n: owned.length,
		agree: owned.filter((row) => row.agrees === true).length,
		rate: owned.length ? Number((owned.filter((row) => row.agrees).length / owned.length).toFixed(3)) : null,
	},
	perAxis: Object.fromEntries(
		[...new Set(results.map((row) => row.axis))].sort().map((axis) => {
			const rows = owned.filter((row) => row.axis === axis)
			return [axis, { n: rows.length, agree: rows.filter((row) => row.agrees).length }]
		}),
	),
}
fs.writeFileSync(path.join(outDir, "report.json"), `${JSON.stringify({ summary, rows: results }, null, 2)}\n`)
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`)
