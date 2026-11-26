#!/usr/bin/env node
/**
 * mode-probe-gate.mjs — run the model-free routing probes over a catalogue.
 *
 * USAGE
 *   node scripts/mode-probe-gate.mjs                       # gate probes, owners only
 *   node scripts/mode-probe-gate.mjs --json                # full result object
 *   node scripts/mode-probe-gate.mjs --write-baseline test-fixtures/mode-probes/baseline.json
 *   node scripts/mode-probe-gate.mjs --baseline <file>     # also fail on any changed top-1
 *   node scripts/mode-probe-gate.mjs --probes <file> --catalogue <file> [--topk 3]
 *
 * WHAT FAILS THE RUN (exit 1)
 *   1. A `gate` probe whose top-1 is outside its allowed owner set (wrong owner).
 *   2. A `gate` probe with no allowed owner in the top 3 (miss).
 *   3. With `--baseline`: the catalogue digest differs from the baseline's, or a
 *      gate probe's top-1 moved. A digest mismatch is deliberately fatal: the
 *      probe set was reviewed against one catalogue text.
 *
 * WHAT DOES NOT FAIL THE RUN
 *   `report` probes (the screened ambiguous briefs). Their top-1 is printed and
 *   summarised; it is an observation about the catalogue, not a defect.
 *
 * WHY THE CONSTRUCT IS PRINTED EVERY TIME
 *   This gate ranks text. It does not ask a model anything. The routing report's
 *   most expensive error was quoting a rate without its construct (log §26), so
 *   every human-readable output begins with the construct line and the digests.
 *
 * EXIT CODES
 *   0 pass · 1 breach · 2 usage error or unreadable input
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { parseRoomodes } from "./lib/roomodes-lite.mjs"
import { runGate, digestOf, SCHEMA_VERSION } from "./lib/mode-probe-gate.mjs"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const DEFAULTS = {
	catalogue: "test-fixtures/frames/axis-stance.roomodes",
	probes: "test-fixtures/mode-probes/probes.json",
	topk: 3,
}

const USAGE = `usage: node scripts/mode-probe-gate.mjs [--catalogue <file>] [--probes <file>]
       [--topk <n>] [--json] [--baseline <file>] [--write-baseline <file>]

  --catalogue       .roomodes to probe (default ${DEFAULTS.catalogue})
  --probes          probe set (default ${DEFAULTS.probes})
  --topk            entries considered for the top-3 check (minimum 3)
  --json            print the full result object
  --baseline        compare against a baseline and fail on any changed top-1
  --write-baseline  record this run as the baseline (then exit 0 if no breach)
`

function fail(message) {
	process.stderr.write(`mode-probe-gate: ${message}\n`)
	process.exit(2)
}

function parseArgs(argv) {
	const options = { catalogue: DEFAULTS.catalogue, probes: DEFAULTS.probes, topk: DEFAULTS.topk, json: false, baseline: null, writeBaseline: null }
	const takeValue = (index, name) => {
		const value = argv[index + 1]
		if (!value || value.startsWith("--")) fail(`${name} needs a value`)
		return value
	}
	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index]
		if (arg === "--json") options.json = true
		else if (arg === "--help" || arg === "-h") {
			process.stdout.write(USAGE)
			process.exit(0)
		} else if (arg === "--catalogue") {
			options.catalogue = takeValue(index, arg)
			index += 1
		} else if (arg === "--probes") {
			options.probes = takeValue(index, arg)
			index += 1
		} else if (arg === "--baseline") {
			options.baseline = takeValue(index, arg)
			index += 1
		} else if (arg === "--write-baseline") {
			options.writeBaseline = takeValue(index, arg)
			index += 1
		} else if (arg === "--topk") {
			const raw = takeValue(index, arg)
			if (!/^[1-9]\d*$/.test(raw)) fail("--topk must be a positive integer")
			options.topk = Number(raw)
			index += 1
		} else fail(`unknown argument: ${arg}`)
	}
	if (options.topk < 3) fail("--topk below 3 would make the top-3 check meaningless")
	return options
}

function readJson(file, label) {
	try {
		return JSON.parse(readFileSync(path.resolve(ROOT, file), "utf8"))
	} catch (error) {
		fail(`cannot read ${label} ${file}: ${error.message}`)
	}
}

function readText(file) {
	try {
		return readFileSync(path.resolve(ROOT, file), "utf8")
	} catch (error) {
		fail(`cannot read catalogue ${file}: ${error.message}`)
	}
}

function printHuman(result) {
	const lines = []
	lines.push(`construct : ${result.construct}`)
	lines.push(`catalogue : ${result.catalogueDigest.slice(0, 16)}…  probes: ${result.probesDigest.slice(0, 16)}…  topk: ${result.topk}`)
	lines.push("")
	lines.push("id        set     top-1                    hit1  hit3  margin  query")
	for (const row of result.rows) {
		lines.push(
			`${row.id.padEnd(9)} ${row.set.padEnd(7)} ${String(row.top1 ?? "-").padEnd(25)} ${row.hit1 ? "yes " : "NO  "} ${row.hit3 ? "yes " : "NO  "} ${String(row.margin ?? "-").padStart(6)}  ${row.query}`,
		)
	}
	lines.push("")
	lines.push(
		`gate probes   n=${result.summary.gate.n}  anchored ${result.summary.gate.anchored} (reachability ${result.summary.gate.reachability})  top-1 ${result.summary.gate.hit1Rate}  top-3 ${result.summary.gate.hit3Rate}  wrong owners ${result.summary.gate.wrongOwners}`,
	)
	if (result.summary.unreachable.length > 0) {
		lines.push(`  unreachable (expected owner shares no term with the request — catalogue coverage gap, reported not gated): ${result.summary.unreachable.join(", ")}`)
	}
	lines.push(`report probes n=${result.summary.report.n}  top-1 ${result.summary.report.hit1Rate}  top-3 ${result.summary.report.hit3Rate}  (reported, never gated)`)
	if (result.summary.changedTop1.length > 0) {
		lines.push("")
		lines.push("changed top-1 against baseline:")
		for (const row of result.summary.changedTop1) lines.push(`  ${row.id}: ${row.was} -> ${row.now}`)
	}
	lines.push("")
	lines.push(result.status === "pass" ? "STATUS: pass" : "STATUS: FAIL")
	for (const breach of result.breaches) lines.push(`  ${breach.code}: ${breach.id ?? ""} ${JSON.stringify(breach)}`)
	lines.push("")
	lines.push("Reminder: these rates describe text overlap in one catalogue. They are not a routing result.")
	process.stdout.write(`${lines.join("\n")}\n`)
}

function main() {
	const options = parseArgs(process.argv.slice(2))
	const catalogue = parseRoomodes(readText(options.catalogue))
	const probeFile = readJson(options.probes, "probes")
	if (!Array.isArray(probeFile.probes) || probeFile.probes.length === 0) fail("probe file has no probes")
	const probes = { probes: probeFile.probes, digest: digestOf(probeFile.probes) }
	const baselinePath = options.baseline ? path.resolve(ROOT, options.baseline) : null
	let baseline = null
	if (baselinePath) {
		if (!existsSync(baselinePath)) fail(`baseline not found: ${options.baseline}`)
		baseline = JSON.parse(readFileSync(baselinePath, "utf8"))
	}
	const result = runGate({ catalogue, probes, baseline, topk: options.topk })
	if (options.json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
	else printHuman(result)

	if (options.writeBaseline) {
		const top1 = {}
		for (const row of result.rows) if (row.set === "gate") top1[row.id] = row.top1
		const recorded = {
			schemaVersion: SCHEMA_VERSION,
			catalogue: options.catalogue,
			catalogueDigest: catalogue.digest,
			probesDigest: probes.digest,
			topk: options.topk,
			top1,
		}
		writeFileSync(path.resolve(ROOT, options.writeBaseline), `${JSON.stringify(recorded, null, 2)}\n`)
		process.stderr.write(`mode-probe-gate: baseline written to ${options.writeBaseline}\n`)
	}
	process.exit(result.status === "pass" ? 0 : 1)
}

main()
