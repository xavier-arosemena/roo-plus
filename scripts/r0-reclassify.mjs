/**
 * r0-reclassify.mjs — re-derive every stored R0 verdict with the current extractor.
 *
 * Why this exists: the extractor gained v4 after the batches were scored (log §43,
 * F-15). The raw records are never rewritten — `results.jsonl` is what the runner
 * wrote, and a record that silently changes is not a record. This script reads the
 * stored transcripts, re-derives every verdict, and reports the difference, writing
 * it beside the batch as `reclass-<version>.json` so a reader can audit the change.
 *
 * It costs nothing: no provider is called and no transcript is regenerated.
 *
 *   node scripts/r0-reclassify.mjs                      # every runs/r0-* batch
 *   node scripts/r0-reclassify.mjs --dir r0-wording-both-2026-11-20
 *   node scripts/r0-reclassify.mjs --quiet              # table only, no per-row list
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { EXTRACTOR_VERSION, classifyProductReply } from "./lib/r0-extract.mjs"
import { parseRoomodes } from "./lib/roomodes-lite.mjs"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const CATALOGUE = "test-fixtures/frames/axis-stance.roomodes"

function parseArgs(argv) {
	const options = { dirs: [], quiet: false }
	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index]
		if (arg === "--dir") {
			index += 1
			if (!argv[index]) throw new Error("--dir needs a value")
			options.dirs.push(argv[index])
		} else if (arg === "--quiet") options.quiet = true
		else throw new Error(`unknown argument: ${arg}`)
	}
	return options
}

const isDeclaration = (verdict) => verdict === "DECLARATION"

function loadBatch(dirName, entries, slugs) {
	const dir = path.join(ROOT, "runs", dirName)
	const resultsPath = path.join(dir, "results.jsonl")
	if (!fs.existsSync(resultsPath)) return null
	const stored = fs
		.readFileSync(resultsPath, "utf8")
		.trim()
		.split("\n")
		.filter(Boolean)
		.map((line) => JSON.parse(line))
	const rows = []
	for (const row of stored) {
		if (row.failed) continue
		const transcriptPath = path.join(dir, "transcripts", `${row.runId}.txt`)
		if (!fs.existsSync(transcriptPath)) {
			rows.push({ row, derived: null, note: "no transcript" })
			continue
		}
		const reply = fs.readFileSync(transcriptPath, "utf8")
		rows.push({ row, derived: classifyProductReply(reply, slugs, entries), reply })
	}
	return { dirName, dir, rows }
}

function summarise(batch) {
	const byArm = new Map()
	const changed = []
	for (const { row, derived, reply, note } of batch.rows) {
		if (!byArm.has(row.key)) byArm.set(row.key, { n: 0, storedDeclared: 0, derivedDeclared: 0, changed: 0 })
		const arm = byArm.get(row.key)
		arm.n += 1
		if (isDeclaration(row.verdict)) arm.storedDeclared += 1
		if (!derived) continue
		if (isDeclaration(derived.verdict)) arm.derivedDeclared += 1
		if (derived.verdict !== row.verdict || (derived.slug ?? null) !== (row.slug ?? null)) {
			arm.changed += 1
			changed.push({
				runId: row.runId,
				arm: row.arm,
				stored: row.verdict,
				derived: derived.verdict,
				slug: derived.slug ?? null,
				rule: derived.rule,
				firstLine: String(reply ?? "").trim().split("\n")[0].slice(0, 100),
				note: note ?? null,
			})
		}
	}
	return { byArm, changed }
}

/**
 * Paired contrasts over the derived verdicts, using the batch's own rotation:
 * each block of `keys.length` calls holds every arm once. M-15's statistic — the
 * contrast, not the arm rate — and the only one M-16 allows inside a batch.
 */
function pairs(batch) {
	const keys = [...new Set(batch.rows.map(({ row }) => row.key))]
	const size = keys.length
	if (size < 2) return null
	const cycles = new Map()
	let position = 0
	for (const entry of batch.rows) {
		const cycle = Math.floor(position / size)
		if (!cycles.has(cycle)) cycles.set(cycle, new Map())
		const bucket = cycles.get(cycle)
		if (bucket.has(entry.row.key)) return null
		bucket.set(entry.row.key, entry.derived)
		position += 1
	}
	const complete = [...cycles.values()].filter((bucket) => bucket.size === size)
	const out = []
	for (let left = 0; left < size; left += 1) {
		for (let right = left + 1; right < size; right += 1) {
			let up = 0
			let down = 0
			for (const bucket of complete) {
				const a = bucket.get(keys[left])?.verdict === "DECLARATION"
				const b = bucket.get(keys[right])?.verdict === "DECLARATION"
				if (a && !b) up += 1
				else if (!a && b) down += 1
			}
			const n = up + down
			out.push({
				a: keys[left],
				b: keys[right],
				up,
				down,
				n,
				delta: n ? ((up - down) / n) * 100 : 0,
				z: n ? (up - down) / Math.sqrt(n) : 0,
			})
		}
	}
	return { cycles: complete.length, out }
}

const options = parseArgs(process.argv.slice(2))
const { entries } = parseRoomodes(fs.readFileSync(path.join(ROOT, CATALOGUE), "utf8"))
const slugs = new Set(entries.map((entry) => entry.slug))

const names = options.dirs.length
	? options.dirs
	: fs
			.readdirSync(path.join(ROOT, "runs"))
			.filter((name) => name.startsWith("r0-"))
			.sort()

console.log(`extractor ${EXTRACTOR_VERSION} · catalogue ${CATALOGUE} (${entries.length} entries)`)
let totalChanged = 0
for (const dirName of names) {
	const batch = loadBatch(dirName, entries, slugs)
	if (!batch) continue
	const { byArm, changed } = summarise(batch)
	totalChanged += changed.length
	console.log(`\n${dirName} — ${batch.rows.length} usable rows, ${changed.length} verdicts change`)
	for (const [key, arm] of byArm) {
		const delta = arm.derivedDeclared - arm.storedDeclared
		console.log(
			`  ${key.padEnd(38)} n=${String(arm.n).padStart(3)} stored=${String(arm.storedDeclared).padStart(3)}` +
				` derived=${String(arm.derivedDeclared).padStart(3)} (${delta >= 0 ? "+" : ""}${delta})` +
				`  rate ${(arm.derivedDeclared / arm.n).toFixed(3)}`,
		)
	}
	const paired = pairs(batch)
	if (paired) {
		console.log(`  paired within cycle (${paired.cycles} complete cycles)`)
		for (const p of paired.out) {
			console.log(
				`    ${p.a} vs ${p.b}: up ${String(p.up).padStart(2)} down ${String(p.down).padStart(2)}` +
					` n ${String(p.n).padStart(3)} delta ${p.delta.toFixed(1)} pts z ${p.z.toFixed(2)}`,
			)
		}
	}
	if (!options.quiet) {
		for (const entry of changed) {
			console.log(`    ${entry.stored} → ${entry.derived}${entry.slug ? ":" + entry.slug : ""} (${entry.rule}) · ${entry.runId}`)
			console.log(`      ${JSON.stringify(entry.firstLine)}`)
		}
	}
	fs.writeFileSync(
		path.join(batch.dir, `reclass-${EXTRACTOR_VERSION.replace("/", "-")}.json`),
		`${JSON.stringify(
			{
				schema: "r0.reclass.v1",
				extractorVersion: EXTRACTOR_VERSION,
				catalogue: CATALOGUE,
				rows: batch.rows.length,
				changed,
				byArm: Object.fromEntries(byArm),
			},
			null,
			1,
		)}\n`,
	)
}
console.log(`\n${totalChanged} verdicts change across ${names.length} batches. Raw records untouched.`)
