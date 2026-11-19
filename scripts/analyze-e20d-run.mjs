#!/usr/bin/env node

/**
 * analyze-e20d-run.mjs — the mechanical table for an E20d run directory.
 *
 * WHAT IT PRINTS
 *   Per arm: records, scorable, excluded, exclusion rate, the longest identical
 *   verbatim run, the declared-key count (`explain` by the pinned
 *   `routing-round-parser/2`), other declared slugs, and undetermined — split into
 *   "question present" and "no question", which is the commit/ask split the sanity
 *   check reads. Then the B − C gap in points, four equal blocks per arm in draw
 *   order, timings from the records, and token usage from the runner's sidecars.
 *
 * WHAT IT READS
 *   <run-dir>/results.jsonl                 the executor's records
 *   <run-dir>/plan.json                     the plan copy, for experiment and seed
 *   <key>                                   the sealed answer key, for the vocabulary
 *   <run-dir>/transcripts/usage-*.json      the runner's per-call sidecars (optional)
 *
 * WHY THE ARM MAP IS DERIVED RATHER THAN READ
 *   The label → arm map is `assignLabels` over the plan's own `blindSeed`, so the
 *   sealed `_label-map.json` is not needed. The extractor is blind by construction:
 *   it is given the arm's vocabulary, never its label. Nothing here adjudicates a
 *   reply — an undetermined reply is counted and left to the packet.
 *
 * EXIT STATUS
 *   0  the table was printed
 *   2  a precondition failed
 *
 * NO MODEL CALL IS POSSIBLE HERE.
 */

import * as fs from "node:fs/promises"
import path from "node:path"

import { E20D_DIR, E20D_ID, armByLabel } from "./lib/e20d.mjs"
import { EXPLAIN_SLUG } from "./lib/e20.mjs"
import { extractDeclaredV2 } from "./lib/routing-round.mjs"

const DEFAULT_KEY = path.join(E20D_DIR, "answer-key.json")
const BLOCKS = 4

const USAGE = `Usage: node scripts/analyze-e20d-run.mjs --run-dir <dir> [options]

  --run-dir <dir>     a directory holding results.jsonl and the plan copy
  --key <file>        the sealed answer key (default: ${path.relative(process.cwd(), DEFAULT_KEY)})
  --judgements <file> the adjudication verdicts (JSONL of { id, verdict })
  --join <file>       the sealed id → runId/label join, needed with --judgements
  --json <file>       write the table as JSON as well as printing it
  --help              print this text
`

class Refusal extends Error {}

function parseArgs(argv) {
	const opts = { runDir: null, key: DEFAULT_KEY, judgements: null, join: null, json: null, help: false }
	for (let index = 0; index < argv.length; index++) {
		const arg = argv[index]
		const value = () => {
			const next = argv[++index]
			if (next === undefined) throw new Refusal(`${arg} needs a value`)
			return next
		}
		if (arg === "--run-dir") opts.runDir = value()
		else if (arg === "--key") opts.key = value()
		else if (arg === "--judgements") opts.judgements = value()
		else if (arg === "--join") opts.join = value()
		else if (arg === "--json") opts.json = value()
		else if (arg === "--help" || arg === "-h") opts.help = true
		else throw new Refusal(`unknown argument: ${arg}`)
	}
	return opts
}

const pad = (text, width) => String(text).padEnd(width)
const percent = (rate) => (rate === null ? "—" : `${(rate * 100).toFixed(1)}%`)
const points = (value) => (value === null ? "—" : `${value >= 0 ? "+" : ""}${value.toFixed(1)}`)

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

const isScorable = (record) =>
	record?.status === "RUN" && typeof record?.response === "string" && record.response.trim() !== ""

function longestVerbatimRun(replies) {
	let longest = 0
	let current = 0
	let previous = null
	for (const reply of replies) {
		current = reply === previous ? current + 1 : 1
		previous = reply
		if (current > longest) longest = current
	}
	return longest
}

/** Every usage-<runId>.json the runner wrote, keyed by runId. */
async function readSidecars(dir) {
	const out = new Map()
	const names = await fs.readdir(dir).catch(() => [])
	for (const name of names) {
		const match = /^usage-(.+)\.json$/.exec(name)
		if (!match) continue
		try {
			out.set(match[1], JSON.parse(await fs.readFile(path.join(dir, name), "utf-8")))
		} catch {
			// An unreadable sidecar contributes nothing; the timings still come from records.
		}
	}
	return out
}

function tokenTotals(sidecars) {
	const totals = { calls: 0, prompt: 0, candidates: 0, thoughts: 0, total: 0, maxOutputTokens: new Set() }
	for (const sidecar of sidecars.values()) {
		const last = (sidecar.attempts ?? []).at(-1)
		const usage = last?.usageMetadata
		if (!usage) continue
		totals.calls++
		totals.prompt += usage.promptTokenCount ?? 0
		totals.candidates += usage.candidatesTokenCount ?? 0
		totals.thoughts += usage.thoughtsTokenCount ?? 0
		totals.total += usage.totalTokenCount ?? 0
		if (sidecar.maxOutputTokens !== undefined) totals.maxOutputTokens.add(sidecar.maxOutputTokens)
	}
	return totals
}

function blockTable(entries, blocks = BLOCKS, key = "declared") {
	const size = Math.floor(entries.length / blocks)
	const rows = []
	for (let index = 0; index < blocks; index++) {
		const from = index * size
		const to = index === blocks - 1 ? entries.length : from + size
		const slice = entries.slice(from, to)
		const declared = slice.filter((entry) => entry[key]).length
		rows.push({
			block: index + 1,
			draws: `${from + 1}–${to}`,
			n: slice.length,
			declared,
			rate: slice.length === 0 ? null : declared / slice.length,
		})
	}
	return rows
}

/** The second reading's verdicts, keyed by the run id the sealed join names. */
function verdictsByRunId({ judgements, join }) {
	const entries = Array.isArray(join?.entries) ? join.entries : []
	if (entries.length === 0) throw new Refusal("the join carries no entries")
	const byRunId = new Map()
	for (const entry of entries) {
		if (typeof entry?.runId !== "string" || typeof entry?.id !== "string") {
			throw new Refusal("the join has an entry without a string id and runId")
		}
		byRunId.set(entry.runId, judgements.get(entry.id) ?? null)
	}
	return byRunId
}

function parseJudgements(text, where) {
	const map = new Map()
	for (const [index, line] of String(text).split("\n").entries()) {
		if (line.trim() === "") continue
		let record
		try {
			record = JSON.parse(line)
		} catch (error) {
			throw new Refusal(`${where}:${index + 1} is not JSON: ${error.message}`)
		}
		if (typeof record?.id !== "string") throw new Refusal(`${where}:${index + 1} has no id`)
		map.set(record.id, record.verdict ?? null)
	}
	return map
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
	if (!opts.runDir) throw new Refusal("--run-dir is required")

	const runDir = path.resolve(opts.runDir)
	const resultsPath = path.join(runDir, "results.jsonl")
	const planPath = path.join(runDir, "plan.json")

	const records = parseJsonl(await readOrRefuse(resultsPath, "results"), resultsPath)
	if (records.length === 0) throw new Refusal(`${resultsPath} holds no records`)

	let plan
	try {
		plan = JSON.parse(await readOrRefuse(planPath, "plan copy"))
	} catch (error) {
		if (error instanceof Refusal) throw error
		throw new Refusal(`${planPath} is not JSON: ${error.message}`)
	}
	if (plan.experiment !== E20D_ID) throw new Refusal(`${planPath} is an ${plan.experiment} plan, not ${E20D_ID}`)

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
	const vocabulary = key.slugVocabulary
	if (!vocabulary.includes(EXPLAIN_SLUG)) throw new Refusal(`${opts.key}: the vocabulary does not contain explain`)

	// The second reading is optional: without it the table is the mechanical one.
	let verdictByRunId = new Map()
	const hasAdjudication = opts.judgements !== null
	if (hasAdjudication) {
		if (!opts.join) throw new Refusal("--judgements needs --join to map packet ids to run ids")
		const judgements = parseJudgements(await readOrRefuse(opts.judgements, "judgements"), opts.judgements)
		let join
		try {
			join = JSON.parse(await readOrRefuse(opts.join, "join"))
		} catch (error) {
			if (error instanceof Refusal) throw error
			throw new Refusal(`${opts.join} is not JSON: ${error.message}`)
		}
		verdictByRunId = verdictsByRunId({ judgements, join })
	}

	const armOf = armByLabel(plan.experiment, plan.blindSeed)
	const byArm = new Map()
	for (const record of records) {
		const arm = armOf.get(record?.label)
		if (!arm) throw new Refusal(`a record carries label ${JSON.stringify(record?.label)}, which maps to no arm`)
		if (!byArm.has(arm)) byArm.set(arm, [])
		byArm.get(arm).push(record)
	}

	const table = []
	for (const [arm, armRecords] of [...byArm.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
		const ordered = [...armRecords].sort((a, b) => (a.draw ?? 0) - (b.draw ?? 0))
		const scorable = ordered.filter(isScorable)
		const entries = scorable.map((record) => {
			const slug = extractDeclaredV2(record.response, vocabulary)
			const adjudicated = verdictByRunId.get(record.runId) ?? null
			return {
				slug,
				declared: slug === EXPLAIN_SLUG,
				// The verdict vocabulary carries no slug, so an adjudicated
				// DECLARATION is an upper-bound declared key (report §9 caveat).
				combinedDeclared: slug === EXPLAIN_SLUG || (slug === null && adjudicated === "DECLARATION"),
				adjudicated,
				question: /\?/.test(record.response),
			}
		})
		const declared = entries.filter((entry) => entry.declared).length
		const combinedDeclared = entries.filter((entry) => entry.combinedDeclared).length
		const asked = entries.filter((entry) => entry.question).length
		const otherDeclared = entries.filter((entry) => entry.slug !== null && entry.slug !== EXPLAIN_SLUG).length
		const otherSlugs = new Map()
		for (const entry of entries) {
			if (entry.slug === null || entry.slug === EXPLAIN_SLUG) continue
			otherSlugs.set(entry.slug, (otherSlugs.get(entry.slug) ?? 0) + 1)
		}
		const undetermined = entries.filter((entry) => entry.slug === null)
		table.push({
			arm,
			records: ordered.length,
			scorable: scorable.length,
			excluded: ordered.length - scorable.length,
			exclusionRate: ordered.length === 0 ? 0 : (ordered.length - scorable.length) / ordered.length,
			longestVerbatimRun: longestVerbatimRun(scorable.map((record) => record.response)),
			declared,
			combinedDeclared,
			asked,
			otherDeclared,
			otherSlugs: Object.fromEntries(
				[...otherSlugs.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])),
			),
			undetermined: undetermined.length,
			undeterminedQuestion: undetermined.filter((entry) => entry.question).length,
			undeterminedNoQuestion: undetermined.filter((entry) => !entry.question).length,
			declaredRate: scorable.length === 0 ? null : declared / scorable.length,
			combinedRate: scorable.length === 0 ? null : combinedDeclared / scorable.length,
			entries,
		})
	}

	console.log(`E20d run analysis — ${path.relative(process.cwd(), runDir)}`)
	console.log(`plan: ${path.relative(process.cwd(), planPath)} · seed ${plan.blindSeed} · cycle ${plan.cycle.join(" ")} × ${plan.cycles}`)
	console.log(`key: ${path.relative(process.cwd(), opts.key)} (sealed) · vocabulary ${vocabulary.length} slugs`)
	if (hasAdjudication) {
		console.log(`adjudication: ${path.relative(process.cwd(), opts.judgements)} joined through ${path.relative(process.cwd(), opts.join)}`)
	}
	console.log("")
	console.log(
		`${pad("arm", 4)} ${pad("records", 8)} ${pad("scorable", 9)} ${pad("excluded", 9)} ${pad("excl%", 7)} ` +
			`${pad("verbatim", 9)} ${pad("explain", 8)} ${pad("asks", 6)} ${pad("other", 6)} ${pad("undet", 6)} ` +
			`${pad("? in undet", 11)} ${pad("no-?", 6)} combined`,
	)
	for (const row of table) {
		console.log(
			`${pad(row.arm, 4)} ${pad(row.records, 8)} ${pad(row.scorable, 9)} ${pad(row.excluded, 9)} ` +
				`${pad(percent(row.exclusionRate), 7)} ${pad(row.longestVerbatimRun, 9)} ${pad(row.declared, 8)} ` +
				`${pad(row.asked, 6)} ${pad(row.otherDeclared, 6)} ${pad(row.undetermined, 6)} ` +
				`${pad(row.undeterminedQuestion, 11)} ${pad(row.undeterminedNoQuestion, 6)} ${row.combinedDeclared}`,
		)
	}

	const b = table.find((row) => row.arm === "B")
	const c = table.find((row) => row.arm === "C")
	const gap = b && c && b.declaredRate !== null && c.declaredRate !== null ? (b.declaredRate - c.declaredRate) * 100 : null
	const combinedGap =
		b && c && b.combinedRate !== null && c.combinedRate !== null ? (b.combinedRate - c.combinedRate) * 100 : null
	console.log("")
	console.log(
		`declared-key rates (mechanical): B ${percent(b?.declaredRate ?? null)} · C ${percent(c?.declaredRate ?? null)} · ` +
			`B − C ${points(gap)} points${table.length === 2 ? "" : " (one arm only: no gap)"}`,
	)
	if (hasAdjudication) {
		console.log(
			`declared-key rates (mechanical + adjudicated DECLARATION): B ${percent(b?.combinedRate ?? null)} · ` +
				`C ${percent(c?.combinedRate ?? null)} · B − C ${points(combinedGap)} points`,
		)
	}

	const otherSlugLines = table
		.map((row) => {
			const entries = Object.entries(row.otherSlugs)
			return `${row.arm} ${entries.length === 0 ? "none" : entries.map(([slug, count]) => `${slug} ${count}`).join(", ")}`
		})
		.join(" · ")
	console.log(`other declared slugs: ${otherSlugLines}`)

	console.log("")
	const blockKey = hasAdjudication ? "combinedDeclared" : "declared"
	const blockLabel = hasAdjudication ? "mechanical + adjudicated DECLARATION" : "mechanical"
	console.log(`per-quarter blocks (${BLOCKS} equal blocks in draw order, ${blockLabel} declared-key rate)`)
	const blocksB = b ? blockTable(b.entries, BLOCKS, blockKey) : []
	const blocksC = c ? blockTable(c.entries, BLOCKS, blockKey) : []
	for (let index = 0; index < BLOCKS; index++) {
		const left = blocksB[index]
		const right = blocksC[index]
		const blockGap =
			left && right && left.rate !== null && right.rate !== null ? (left.rate - right.rate) * 100 : null
		console.log(
			`  Q${index + 1}  B ${pad(`${left?.declared ?? "—"}/${left?.n ?? "—"}`, 8)} ${pad(percent(left?.rate ?? null), 8)}` +
				`  C ${pad(`${right?.declared ?? "—"}/${right?.n ?? "—"}`, 8)} ${pad(percent(right?.rate ?? null), 8)}` +
				`  B − C ${points(blockGap)} points`,
		)
	}

	const spans = records
		.map((record) => ({ started: Date.parse(record?.startedAt), ended: Date.parse(record?.endedAt) }))
		.filter((span) => Number.isFinite(span.started) && Number.isFinite(span.ended) && span.ended >= span.started)
	const durations = spans.map((span) => (span.ended - span.started) / 1000).sort((a, b) => a - b)
	const wallClock =
		spans.length === 0 ? null : (Math.max(...spans.map((s) => s.ended)) - Math.min(...spans.map((s) => s.started))) / 1000
	const mean = durations.length === 0 ? null : durations.reduce((t, v) => t + v, 0) / durations.length
	const median = durations.length === 0 ? null : (durations[Math.floor(durations.length / 2)] + durations[Math.ceil(durations.length / 2)]) / 2

	const sidecars = await readSidecars(path.join(runDir, "transcripts"))
	const tokens = tokenTotals(sidecars)

	const statuses = records.reduce((tally, record) => {
		tally[record.status] = (tally[record.status] ?? 0) + 1
		return tally
	}, {})

	console.log("")
	console.log(
		`timings: wall clock ${wallClock === null ? "—" : `${(wallClock / 60).toFixed(1)} min`} · ` +
			`mean ${mean === null ? "—" : `${mean.toFixed(1)}s`} · median ${median === null ? "—" : `${median.toFixed(1)}s`} per call`,
	)
	console.log(
		`tokens (sidecars: ${tokens.calls} of ${records.length}): prompt ${tokens.prompt.toLocaleString("en-US")} · ` +
			`candidates ${tokens.candidates.toLocaleString("en-US")} · thinking ${tokens.thoughts.toLocaleString("en-US")} · ` +
			`total ${tokens.total.toLocaleString("en-US")}` +
			(tokens.maxOutputTokens.size > 0 ? ` · cap ${[...tokens.maxOutputTokens].join(", ")}` : ""),
	)
	console.log(
		`calls issued: ${records.length} · statuses ${Object.entries(statuses)
			.map(([status, count]) => `${status} ${count}`)
			.join(" · ")}`,
	)

	const payload = {
		experiment: plan.experiment,
		blindSeed: plan.blindSeed,
		records: records.length,
		statuses,
		arms: table.map(({ entries, ...row }) => row),
		gapPoints: gap,
		combinedGapPoints: hasAdjudication ? combinedGap : null,
		adjudication: hasAdjudication ? { judgements: opts.judgements, join: opts.join } : null,
		blocks: { B: blocksB, C: blocksC },
		timings: { wallClockSeconds: wallClock, meanSeconds: mean, medianSeconds: median },
		tokens: { ...tokens, maxOutputTokens: [...tokens.maxOutputTokens] },
	}
	if (opts.json) {
		await fs.writeFile(path.resolve(opts.json), `${JSON.stringify(payload, null, 2)}\n`, "utf-8")
		console.log(`json: ${path.relative(process.cwd(), path.resolve(opts.json))}`)
	}
	return 0
}

main()
	.then((code) => process.exit(code))
	.catch((error) => {
		console.error(`error: ${error.message}`)
		process.exit(2)
	})
