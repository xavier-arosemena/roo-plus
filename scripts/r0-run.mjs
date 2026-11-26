/**
 * r0-run.mjs — R0: the same contrast, rendered in chosen picker formats, in one batch.
 *
 * R0 asks one question: do the programme's two headline readings survive a change
 * to the **rendered picker line**? Every earlier experiment used
 * `- <slug> — <Name> — <line>` with no heading; the extension emits
 * `  * "<Name>" mode (<slug>) - <line>` under a `MODES` heading (log §32).
 *
 *   node scripts/r0-run.mjs --contrast position --format both                    # dry run
 *   node scripts/r0-run.mjs --contrast position --format both --run --model gemini-3.5-flash
 *
 * `--format both` is the default design: the format contrast must be **within one
 * batch** or it is a cross-batch subtraction, which M-9 forbids and which the level
 * drift between E20 batches already demonstrates.
 */

import { createHash } from "node:crypto"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { BRIEFS, PICKER_FORMATS, buildPrompt, pickerTextFor } from "./lib/framing-pretest.mjs"
import { E20_BRIEF_ID, E20_LINES, EXPLAIN_SLUG } from "./lib/e20.mjs"
import { EXTRACTOR_VERSION, classifyProductReply } from "./lib/r0-extract.mjs"
import { parseRoomodes } from "./lib/roomodes-lite.mjs"
import { fixedPersona } from "./lib/routing-round.mjs"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const CATALOGUE = "test-fixtures/frames/axis-stance.roomodes"
const sha = (text) => createHash("sha256").update(text, "utf8").digest("hex")

const CONTRASTS = {
	// `explain` first vs last in the 45-entry list, line B held fixed.
	position: [
		{ arm: "first", line: "B", index: 0 },
		{ arm: "last", line: "B", index: 44 },
	],
	// line B vs line C, `explain` held at the seventh entry.
	wording: [
		{ arm: "B", line: "B", index: 6 },
		{ arm: "C", line: "C", index: 6 },
	],
	// One condition, nothing varied: the drift probe. Every movement it shows is
	// the provider or the hour, not the design, which is what makes it the cheapest
	// decisive test before any four-arm batch is trusted (log §35).
	drift: [{ arm: "fixed", line: "B", index: 0 }],
	// Is it the template or the field order? `explain` held at the seventh entry in
	// all four arms, so position cannot leak into the comparison; only the rendered
	// line changes. This is the contrast the position batch could not make (log §36).
	// Which of the three product-template namings should the catalogue print? One
	// batch, so the three levels can be compared to each other (M-16 forbids comparing
	// them to levels measured in other batches). `explain` at the seventh entry.
	naming: [
		{ arm: "name-first", line: "B", index: 6, format: "product" },
		{ arm: "slug-only", line: "B", index: 6, format: "product-slug-only" },
		{ arm: "slug-and-name", line: "B", index: 6, format: "product-slug-first" },
	],
	// Is it the parenthetical that broke the slug arm, or the slug itself? Two arms,
	// `explain` at the seventh entry, only the quoted field and the parenthetical vary.
	"slug-lead": [
		{ arm: "slug-only", line: "B", index: 6, format: "product-slug-only" },
		{ arm: "slug-and-name", line: "B", index: 6, format: "product-slug-first" },
	],
	attribution: [
		{ arm: "fixture", line: "B", index: 6, format: "fixture" },
		{ arm: "fixture-name-first", line: "B", index: 6, format: "fixture-name-first" },
		{ arm: "product-slug-first", line: "B", index: 6, format: "product-slug-first" },
		{ arm: "product", line: "B", index: 6, format: "product" },
	],
}

function parseArgs(argv) {
	const options = { contrast: null, format: "both", draws: 100, model: null, run: false, runner: null, limit: null }
	for (let i = 0; i < argv.length; i += 1) {
		const arg = argv[i]
		const value = () => {
			i += 1
			if (!argv[i]) throw new Error(`${arg} needs a value`)
			return argv[i]
		}
		if (arg === "--run") options.run = true
		else if (arg === "--contrast") options.contrast = value()
		else if (arg === "--format") options.format = value()
		else if (arg === "--draws") options.draws = Number(value())
		else if (arg === "--model") options.model = value()
		else if (arg === "--runner") options.runner = value()
		else if (arg === "--limit") options.limit = Number(value())
		else throw new Error(`unknown argument: ${arg}`)
	}
	if (!CONTRASTS[options.contrast]) throw new Error(`--contrast must be one of ${Object.keys(CONTRASTS).join(", ")}`)
	if (options.format !== "both" && !PICKER_FORMATS.includes(options.format)) {
		throw new Error(`--format must be both or one of ${PICKER_FORMATS.join(", ")}`)
	}
	return options
}

const options = parseArgs(process.argv.slice(2))
const { entries, digest: catalogueDigest } = parseRoomodes(fs.readFileSync(path.join(ROOT, CATALOGUE), "utf8"))
const brief = BRIEFS.find((candidate) => candidate.id === E20_BRIEF_ID)
if (!brief) throw new Error(`BRIEFS has no ${E20_BRIEF_ID}`)
const persona = fixedPersona()

const formats = options.format === "both" ? ["fixture", "product"] : [options.format]

function modesForArm(arm) {
	const modes = entries.map((entry) => ({ ...entry }))
	const explainIndex = modes.findIndex((entry) => entry.slug === EXPLAIN_SLUG)
	const [explain] = modes.splice(explainIndex, 1)
	explain.whenToUse = E20_LINES[arm.line]
	modes.splice(arm.index, 0, explain)
	return modes
}

const spec = CONTRASTS[options.contrast]
// A contrast may carry its own formats (attribution does): then `--format` is ignored
// rather than doubling the batch.
const explicitFormats = spec.every((arm) => Boolean(arm.format))
const arms = (
	explicitFormats
		? spec.map((arm) => [arm.format, arm])
		: formats.flatMap((format) => spec.map((arm) => [format, arm]))
).map(([format, arm]) => {
	const modes = modesForArm(arm)
	const picker = pickerTextFor(modes, format)
	const prompt = buildPrompt(persona, brief, picker)
	return {
		key: `${format}:${arm.arm}`,
		format,
		arm: arm.arm,
		line: arm.line,
		index: arm.index,
		prompt: prompt.text,
		promptSha256: sha(prompt.text),
		pickerDigest: sha(picker),
	}
})

const outDir = path.join(
	ROOT,
	`runs/r0-${options.contrast}-${options.format === "both" ? "both" : options.format}-2026-11-20`,
)
const plan = {
	schemaVersion: "ecc.r0.v1",
	registration: "docs/reviews/2026-11-20-r0-picker-format-preregistration.md",
	contrast: options.contrast,
	formats,
	briefId: E20_BRIEF_ID,
	brief: brief.text ?? brief.brief ?? null,
	persona: persona.id,
	model: options.model,
	draws: options.draws,
	catalogueDigest,
	arms: arms.map(({ prompt, ...rest }) => rest),
}
fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(path.join(outDir, "plan.json"), `${JSON.stringify(plan, null, 2)}\n`)

// One draw per arm per cycle, with the arm order rotated each cycle so no arm is
// systematically first in the batch.
const sequence = []
for (let cycle = 0; cycle < options.draws; cycle += 1) {
	const order = [...arms.keys()]
	const rotation = cycle % arms.length
	sequence.push(...order.slice(rotation), ...order.slice(0, rotation))
}
const total = options.limit ? Math.min(options.limit, sequence.length) : sequence.length

if (!options.run) {
	process.stdout.write(
		`dry run: ${path.relative(ROOT, outDir)} — ${total} calls over ${arms.length} arms (${options.contrast}, ${formats.join("+")}, ${options.draws} draws/arm); catalogue ${catalogueDigest.slice(0, 12)}…\n`,
	)
	for (const arm of arms)
		process.stdout.write(
			`  ${arm.key}: line ${arm.line} at index ${arm.index}, prompt ${arm.prompt.length} chars\n`,
		)
	process.exit(0)
}
if (!options.model) throw new Error("--run needs --model")

const template = options.runner ?? `node scripts/lib/gemini-runner.mjs {prompt} {out} {model} {usage} {runId}`
const slugs = new Set(entries.map((entry) => entry.slug))
const rows = []
const perArmDraw = new Map()
for (let i = 0; i < total; i += 1) {
	const arm = arms[sequence[i]]
	const draw = (perArmDraw.get(arm.key) ?? 0) + 1
	perArmDraw.set(arm.key, draw)
	const runId = `r0-${options.contrast}-${arm.format}-${arm.arm}-${String(draw).padStart(3, "0")}`
	const promptPath = path.join(outDir, "prompts", `${runId}.txt`)
	const outPath = path.join(outDir, "transcripts", `${runId}.txt`)
	const usagePath = path.join(outDir, "usage", `${runId}.json`)
	fs.mkdirSync(path.dirname(promptPath), { recursive: true })
	fs.mkdirSync(path.dirname(outPath), { recursive: true })
	fs.mkdirSync(path.dirname(usagePath), { recursive: true })
	fs.writeFileSync(promptPath, arm.prompt)
	const command = template
		.replaceAll("{prompt}", `"${promptPath}"`)
		.replaceAll("{out}", `"${outPath}"`)
		.replaceAll("{usage}", `"${usagePath}"`)
		.replaceAll("{model}", options.model)
		.replaceAll("{runId}", runId)
	const child = spawnSync(command, { shell: true, cwd: ROOT, encoding: "utf8" })
	const reply = fs.existsSync(outPath) ? fs.readFileSync(outPath, "utf8") : ""
	const machine = classifyProductReply(reply, slugs, entries)
	const failed = child.status !== 0 || reply.trim().length === 0
	rows.push({
		i,
		runId,
		key: arm.key,
		format: arm.format,
		arm: arm.arm,
		quarter: Math.min(3, Math.floor((4 * i) / total)),
		verdict: machine.verdict,
		slug: machine.slug ?? null,
		rule: machine.rule,
		// The rule that produced this verdict is stamped on the record, because D-22
		// found every earlier batch claiming a parser version it could not evidence.
		// A batch scored by an older extractor is now visible as such.
		extractor: EXTRACTOR_VERSION,
		exitCode: child.status,
		// A failed call must never enter a denominator: one of 400 did in the first
		// position batch and was scored as a row (log §35).
		failed,
	})
	if ((i + 1) % 25 === 0) process.stdout.write(`  ${i + 1}/${total} calls\n`)
	// Fail fast. The attribution batch kept going after its first failure and turned
	// one quota event into 146 wasted rows on an arm that then could not be read
	// (log §39). Stopping keeps the batch balanced enough to say what it lost.
	if (failed) {
		fs.writeFileSync(path.join(outDir, "results.jsonl"), rows.map((row) => JSON.stringify(row)).join("\n") + "\n")
		const perKey = {}
		for (const row of rows) {
			perKey[row.key] ??= { done: 0, failed: 0 }
			perKey[row.key].done++
			if (row.failed) perKey[row.key].failed++
		}
		throw new Error(
			`call ${i + 1}/${total} failed (exit ${child.status}, ${reply.trim().length} bytes). Stopped: ${JSON.stringify(perKey)}. ` +
				`Re-run only after the quota is confirmed; a partial batch is unbalanced on the drift axis (log §39).`,
		)
	}
}

fs.writeFileSync(path.join(outDir, "results.jsonl"), rows.map((row) => JSON.stringify(row)).join("\n") + "\n")

const byArm = {}
for (const arm of arms) {
	const armRows = rows.filter((row) => row.key === arm.key && !row.failed)
	const declared = armRows.filter((row) => row.verdict === "DECLARATION").length
	const byQuarter = [0, 1, 2, 3].map((quarter) => {
		const qRows = armRows.filter((row) => row.quarter === quarter)
		return qRows.length
			? Number((qRows.filter((row) => row.verdict === "DECLARATION").length / qRows.length).toFixed(3))
			: null
	})
	byArm[arm.key] = {
		format: arm.format,
		arm: arm.arm,
		n: armRows.length,
		declared,
		asks: armRows.filter((row) => row.verdict === "ASK").length,
		unresolved: armRows.length - declared - armRows.filter((row) => row.verdict === "ASK").length,
		declarationRate: Number((declared / armRows.length).toFixed(3)),
		byQuarter,
	}
}

// Stationarity first: a ramp inside an arm voids every contrast that uses it (M-10).
const ramped = Object.entries(byArm)
	.filter(([, arm]) => {
		const q = arm.byQuarter.filter((value) => value !== null)
		return q.length === 4 && Math.max(...q) - Math.min(...q) > 0.2
	})
	.map(([key]) => key)
const stationary = ramped.length === 0

const diff = (a, b) => Number(((byArm[b].declarationRate - byArm[a].declarationRate) * 100).toFixed(1))
const summary = {
	schemaVersion: "ecc.r0.v1",
	warning: stationary
		? "Descriptive within-batch contrasts. No p-value is quoted and no interval is computed: the design is read for direction and size, and every cell is 100 draws."
		: `INCONCLUSIVE for any contrast involving ${ramped.join(", ")}: an arm is not stationary within the run (M-10).`,
	contrast: options.contrast,
	formats,
	model: options.model,
	calls: rows.length,
	failed: rows.filter((row) => row.failed).length,
	stationary,
	ramped,
	byArm,
	contrasts: {
		orderAtFixture: stationary ? diff("fixture:first", "fixture:last") : null,
		orderAtProduct: stationary ? diff("product:first", "product:last") : null,
		formatAtFirst: stationary ? diff("fixture:first", "product:first") : null,
		formatAtLast: stationary ? diff("fixture:last", "product:last") : null,
	},
}
fs.writeFileSync(path.join(outDir, "report.json"), `${JSON.stringify({ summary, rows }, null, 2)}\n`)
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`)
