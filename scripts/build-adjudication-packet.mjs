#!/usr/bin/env node

/**
 * build-adjudication-packet.mjs — the anonymised adjudication tooling of
 * [`docs/reviews/2026-11-13-e20-preregistration.md`] Amendment 2 §4.
 *
 * WHAT IT IS FOR
 *   The primary outcome of E20 is mechanical: the extractor never sees an arm
 *   label, so it is blind by construction. Blindness matters for the replies the
 *   extractor cannot classify — a regex cannot decide whether a reply that asks a
 *   question and names no mode is a courtesy question after a commit. Those replies
 *   are judged by hand, and the hand must not know the arm.
 *
 *   This script does exactly two jobs:
 *     build   take the replies `extractDeclaredV2` returns null for, strip every
 *             trace of the arm that produced them, and write a packet plus a join
 *             that is deliberately kept outside the packet.
 *     apply   join recorded verdicts back through that mapping and print, per arm,
 *             the counts and the registered outcomes — plus the two-pass agreement
 *             rate Amendment 2 §4 requires.
 *
 * FLAGS
 *   --run-dir <dir|file>  a directory holding results.jsonl, or the file itself
 *   --key <file>          the sealed answer key (cells[] or arms[])
 *   --out <dir>           the packet directory: packet.jsonl and packet.md
 *   --join <file>         the id → { runId, label } mapping; must be outside --out
 *   --seed <value>        default 1; recorded in the packet header and the id hash
 *   --apply <file>        merge mode: judgements of { id, verdict }
 *   --second <file>       merge mode: the second blind pass, for the agreement rate
 *   --verify <dir>        re-scan an existing packet directory for leaks
 *
 * EXIT STATUS
 *   0  the packet was written, the judgements merged, or --verify found no leak
 *   2  a precondition failed: a bad argument, an unreadable input, a judgement
 *      that is missing, duplicated, unknown or carries an unregistered verdict
 *   3  the blindness assertion failed: the packet is unsafe to adjudicate
 *
 * NO MODEL CALL IS POSSIBLE HERE
 *   This file reads a results file, a sealed key and (in merge mode) judgement
 *   files. It has no provider protocol, no network, and reads no `.env`.
 */

import * as fs from "node:fs/promises"
import path from "node:path"

import {
	AdjudicationBlindnessError,
	DEFAULT_ADJUDICATION_SEED,
	PACKET_JSONL,
	PACKET_MD,
	VERDICTS,
	assertBlind,
	buildPacket,
	classifyRound,
	compareJudgements,
	formatRate,
	mergeJudgements,
	normaliseJoin,
	normaliseKey,
	parseJsonl,
	parseJudgements,
	renderPacketJsonl,
	renderPacketMarkdown,
	validateJudgements,
} from "./lib/adjudication.mjs"

const USAGE = `Usage: node scripts/build-adjudication-packet.mjs [options]

  Build the blind packet:
    --run-dir <dir|file>  directory holding results.jsonl, or the results file
    --key <file>          the sealed answer key
    --out <dir>           packet directory (packet.jsonl, packet.md)
    --join <file>         id → runId/label mapping; must be outside --out
    --seed <value>        id seed (default ${DEFAULT_ADJUDICATION_SEED}), recorded in the header

  Merge judgements back:
    --apply <file>        judgements of { id, verdict }, verdict ∈ ${VERDICTS.join(" | ")}
    --join <file>         the mapping written by the build
    --second <file>       optional second pass, for the agreement rate
    --key <file>          optional: adds the extractor's own counts to the outcome table
    --run-dir <dir|file>  optional: the results the judgement file was produced from

  Verify an existing packet:
    --verify <dir>        re-scan packet.jsonl and packet.md for leaks (needs --join)

  --help                  print this text
`

class Refusal extends Error {}

function parseArgs(argv) {
	const opts = {
		runDir: null,
		key: null,
		out: null,
		join: null,
		seed: DEFAULT_ADJUDICATION_SEED,
		apply: null,
		second: null,
		verify: null,
		help: false,
	}
	for (let index = 0; index < argv.length; index++) {
		const arg = argv[index]
		const value = () => {
			const next = argv[++index]
			if (next === undefined) throw new Refusal(`${arg} needs a value`)
			return next
		}
		if (arg === "--run-dir") opts.runDir = value()
		else if (arg === "--key") opts.key = value()
		else if (arg === "--out") opts.out = value()
		else if (arg === "--join") opts.join = value()
		else if (arg === "--seed") opts.seed = value()
		else if (arg === "--apply") opts.apply = value()
		else if (arg === "--second") opts.second = value()
		else if (arg === "--verify") opts.verify = value()
		else if (arg === "--help" || arg === "-h") opts.help = true
		else throw new Refusal(`unknown argument: ${arg}`)
	}
	return opts
}

function pad(text, width) {
	return String(text).padEnd(width)
}

function relative(target) {
	return path.relative(process.cwd(), path.resolve(target)) || "."
}

/** `child` at or inside `parent`? Both resolved. */
function isInside(parent, child) {
	const base = path.resolve(parent)
	const target = path.resolve(child)
	return target === base || target.startsWith(`${base}${path.sep}`)
}

async function readOrRefuse(target, what) {
	try {
		return await fs.readFile(path.resolve(target), "utf-8")
	} catch {
		throw new Refusal(`cannot read ${what} at ${target}`)
	}
}

/** --run-dir takes a directory holding results.jsonl, or the results file itself. */
async function resolveResults(target) {
	const resolved = path.resolve(target)
	const stat = await fs.stat(resolved).catch(() => null)
	if (stat === null) throw new Refusal(`no results file or directory at ${target}`)
	const file = stat.isDirectory() ? path.join(resolved, "results.jsonl") : resolved
	return { path: file, raw: await readOrRefuse(file, "results") }
}

async function loadJsonOrRefuse(target, what) {
	const raw = await readOrRefuse(target, what)
	try {
		return JSON.parse(raw)
	} catch (error) {
		throw new Refusal(`${target} is not JSON: ${error.message}`)
	}
}

/** Both packet files, as the adjudicator will receive them. */
async function readPacketFiles(dir) {
	const files = []
	for (const name of [PACKET_JSONL, PACKET_MD]) {
		const file = path.join(path.resolve(dir), name)
		files.push({ where: relative(file), text: await readOrRefuse(file, name) })
	}
	return files
}

/**
 * The plan's own `briefs` list, when the run directory carries one. Task C's
 * brief id (`D1`) is not in the frozen `BRIEFS` constant, and the packet must
 * carry the request text the replies answered.
 */
async function planBriefsFor(target) {
	const resolved = path.resolve(target)
	const stat = await fs.stat(resolved).catch(() => null)
	const dir = stat?.isDirectory() ? resolved : path.dirname(resolved)
	const raw = await fs.readFile(path.join(dir, "plan.json"), "utf-8").catch(() => null)
	if (raw === null) return null
	try {
		const plan = JSON.parse(raw)
		return Array.isArray(plan.briefs) ? plan.briefs : null
	} catch {
		return null
	}
}

// ---------------------------------------------------------------------------
// build
// ---------------------------------------------------------------------------

async function build(opts) {
	if (!opts.runDir) throw new Refusal("--run-dir is required to build a packet")
	if (!opts.key) throw new Refusal("--key is required: the extractor needs each arm's own picker")
	if (!opts.out) throw new Refusal("--out is required to build a packet")
	if (!opts.join) throw new Refusal("--join is required: the mapping must be written outside the packet")

	const out = path.resolve(opts.out)
	const joinPath = path.resolve(opts.join)
	if (isInside(out, joinPath)) {
		throw new Refusal(
			`--join must live outside --out (got ${opts.join} inside ${opts.out}); ` +
				"a join beside the packet hands the adjudicator the answer",
		)
	}

	const key = normaliseKey(await loadJsonOrRefuse(opts.key, "sealed answer key"))
	const results = await resolveResults(opts.runDir)
	const records = parseJsonl(results.raw, relative(results.path)).map((row) => row.value)
	const briefs = await planBriefsFor(opts.runDir)

	const { packet, join, classification } = buildPacket({ records, keyEntries: key, seed: opts.seed, briefs })
	const jsonl = renderPacketJsonl(packet)
	const markdown = renderPacketMarkdown({ packet, seed: opts.seed })

	await fs.mkdir(out, { recursive: true })
	await fs.writeFile(path.join(out, PACKET_JSONL), jsonl, "utf-8")
	await fs.writeFile(path.join(out, PACKET_MD), markdown, "utf-8")
	await fs.mkdir(path.dirname(joinPath), { recursive: true })
	await fs.writeFile(joinPath, `${JSON.stringify(join, null, 2)}\n`, "utf-8")

	// The assertion reads the files back from disk, so it tests what an adjudicator
	// would actually receive rather than a string this process still holds.
	const runIds = records.map((record) => record.runId).filter((runId) => typeof runId === "string")
	assertBlind({ files: await readPacketFiles(out), runIds })

	console.log(`adjudication packet — ${classification.parserVersion}`)
	console.log(`results: ${relative(results.path)}`)
	console.log(`key: ${relative(opts.key)} (sealed)`)
	console.log(`seed: ${opts.seed}`)
	console.log(`records: ${classification.total} (skipped as unscorable: ${classification.skipped})`)
	console.log("")
	console.log(`${pad("arm", 8)} ${pad("scorable", 8)} ${pad("undetermined", 12)}`)
	for (const row of classification.stats) {
		console.log(`${pad(row.cell ?? row.label, 8)} ${pad(row.scorable, 8)} ${pad(`${row.undetermined}`, 12)}`)
	}
	console.log("")
	console.log(
		`undetermined: ${packet.length} of ${classification.total} — each one is in the packet and none of them is scored here`,
	)
	console.log(`packet: ${relative(path.join(out, PACKET_JSONL))} (${packet.length} entries) + ${PACKET_MD}`)
	console.log(`join: ${relative(joinPath)} — outside the packet, open only after every judgement is recorded`)
	console.log(
		"blindness: PASS — no arm label, no run id, no timestamp, no registered line text, no arm token beside an id",
	)
	return 0
}

// ---------------------------------------------------------------------------
// apply
// ---------------------------------------------------------------------------

async function apply(opts) {
	if (!opts.join) throw new Refusal("--join is required to merge judgements")

	const join = normaliseJoin(await loadJsonOrRefuse(opts.join, "join"), relative(opts.join))
	const firstPath = opts.apply
	const first = parseJudgements(await readOrRefuse(firstPath, "judgements"), relative(firstPath))
	validateJudgements({ judgements: first, join, where: relative(firstPath) })

	let second = null
	if (opts.second) {
		second = parseJudgements(await readOrRefuse(opts.second, "second-pass judgements"), relative(opts.second))
		validateJudgements({ judgements: second, join, where: relative(opts.second) })
	}

	// The extractor's own tally, when the caller can supply it: mechanical
	// declarations plus adjudicated declarations is the report's headline.
	let mechanical = null
	if (opts.key && opts.runDir) {
		const keyEntries = normaliseKey(await loadJsonOrRefuse(opts.key, "sealed answer key"))
		const results = await resolveResults(opts.runDir)
		const records = parseJsonl(results.raw, relative(results.path)).map((row) => row.value)
		mechanical = classifyRound({ records, keyEntries }).mechanical
	}

	const merged = mergeJudgements({ judgements: first, join, mechanical })

	console.log("adjudication merge")
	console.log(`join: ${relative(opts.join)} (sealed)`)
	console.log(`judgements: ${first.size} verdicts for ${join.entries.length} packet ids, all in the join`)
	if (second) console.log(`second pass: ${second.size} verdicts`)
	if (!mechanical)
		console.log("mechanical counts: not supplied (--key + --run-dir) — the outcome table is the adjudicated subset")
	console.log("")

	console.log("per arm — adjudicated verdicts")
	console.log(`${pad("arm", 10)} ${pad("declarations", 13)} ${pad("asks", 6)} ${pad("other", 6)} total`)
	for (const row of merged.perArm) {
		console.log(
			`${pad(row.label, 10)} ${pad(row.declarations, 13)} ${pad(row.asks, 6)} ${pad(row.other, 6)} ${row.total}`,
		)
	}
	const t = merged.totals
	console.log(`${pad("total", 10)} ${pad(t.declarations, 13)} ${pad(t.asks, 6)} ${pad(t.other, 6)} ${t.total}`)
	console.log("")

	console.log(`combined outcome per arm${mechanical ? "" : " (adjudicated only)"}`)
	console.log(
		`${pad("arm", 10)} ${pad("declared key", 13)} ${pad("asked", 6)} ${pad("wrong commit", 13)} appropriate`,
	)
	for (const row of merged.outcome) {
		console.log(
			`${pad(row.label, 10)} ${pad(row.declaredKey, 13)} ${pad(row.asked, 6)} ${pad(row.wrongCommit, 13)} ${row.appropriate}`,
		)
	}
	const o = merged.outcomeTotals
	console.log(
		`${pad("total", 10)} ${pad(o.declaredKey, 13)} ${pad(o.asked, 6)} ${pad(o.wrongCommit, 13)} ${o.appropriate}`,
	)
	console.log(
		"note: a wrong commit is mechanical only — the verdict vocabulary carries no slug, and a reply that names " +
			"a non-key slug through a declaration marker is extracted mechanically and never enters the packet",
	)

	if (second) {
		const agreement = compareJudgements(first, second)
		console.log("")
		console.log(`two-pass agreement: ${agreement.agreements} of ${agreement.total} (${formatRate(agreement.rate)})`)
		if (agreement.disagreements.length === 0) {
			console.log("disagreements: none")
		} else {
			console.log(`disagreements (${agreement.disagreements.length}):`)
			for (const row of agreement.disagreements) {
				console.log(`  ${row.id}  pass1 ${row.first ?? "—"}  pass2 ${row.second ?? "—"}`)
			}
		}
	}

	return 0
}

// ---------------------------------------------------------------------------
// verify
// ---------------------------------------------------------------------------

async function verify(opts) {
	if (!opts.join) throw new Refusal("--verify needs --join: without the run ids there is nothing to scan for")
	const join = normaliseJoin(await loadJsonOrRefuse(opts.join, "join"), relative(opts.join))
	const files = await readPacketFiles(opts.verify)
	assertBlind({ files, runIds: join.entries.map((entry) => entry.runId) })
	console.log(`blindness: PASS — ${files.map((file) => file.where).join(" and ")} carry no arm trace`)
	return 0
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

	const modes = [
		opts.apply ? "apply" : null,
		opts.verify ? "verify" : null,
		!opts.apply && !opts.verify ? "build" : null,
	].filter(Boolean)
	if (modes.length !== 1) throw new Refusal("choose one mode: build (default), --apply, or --verify")

	if (modes[0] === "apply") return apply(opts)
	if (modes[0] === "verify") return verify(opts)
	return build(opts)
}

main()
	.then((code) => process.exit(code))
	.catch((error) => {
		if (error instanceof AdjudicationBlindnessError) {
			console.error(error.message)
			return process.exit(3)
		}
		if (error instanceof Refusal) {
			console.error(`error: ${error.message}`)
			return process.exit(2)
		}
		console.error(`build-adjudication-packet failed: ${error.message}`)
		process.exit(2)
	})
