/**
 * adjudication.spec.mjs — pins the blind adjudication tooling (Amendment 2 §4)
 * against a synthetic round, and against the closing round's 600 saved replies.
 *
 * WHAT IT PINS
 *   1. The packet carries no trace of the arm — no arm label, no run id, no
 *      timestamp, no registered line text — asserted by scanning the file that was
 *      written, and `{ id, brief, reply }` is the whole record.
 *   2. Ids are deterministic: the same seed rebuilds the packet byte-identically,
 *      and a different seed changes every id and the order.
 *   3. Every id maps to exactly one runId and back: the join is a bijection.
 *   4. The merge refuses a missing id, a duplicated id, an unknown id and an
 *      unregistered verdict.
 *   5. A two-pass merge reports the agreement rate and names the disagreements.
 *   6. The blindness assertion fires on a corrupted packet and says the packet is
 *      unsafe to adjudicate.
 *   7. Against the closed round's real replies: 183 of 600 replies enter the
 *      packet, the per-cell undetermined counts are the recorded ones, and labelling
 *      all 183 as ASK round-trips to the join's per-arm counts. Skipped with an
 *      explicit message when `/tmp/rr-run/results.jsonl` is absent, so it is safe
 *      in CI.
 *
 * NO MODEL CALL IS POSSIBLE HERE
 *   Everything is read from disk. The CLI is driven as a subprocess with fixtures
 *   in temp directories, exactly as `e20.spec.mjs` drives its generator.
 *
 * Run with: node --test scripts/adjudication.spec.mjs
 */

import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { execFile } from "node:child_process"
import { existsSync } from "node:fs"
import * as fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { promisify } from "node:util"

import {
	AdjudicationBlindnessError,
	PACKET_JSONL,
	PACKET_MD,
	adjudicationId,
	assertBlind,
	buildPacket,
	compareJudgements,
	mergeJudgements,
	normaliseJoin,
	normaliseKey,
	parseJsonl,
	parseJudgements,
	renderPacketJsonl,
	renderPacketMarkdown,
	scanForLeaks,
	validateJudgements,
} from "./lib/adjudication.mjs"
import { E20_LINES } from "./lib/e20.mjs"

const run = promisify(execFile)
const ROOT = path.resolve(".")

/** The closed round's saved replies: a workstation artefact, absent in CI. */
const CLOSED_ROUND_RESULTS = "/tmp/rr-run/results.jsonl"
const CLOSED_ROUND_KEY = path.join("test-fixtures", "frames", "routing-round", "answer-key.json")
const closedRoundAvailable = existsSync(CLOSED_ROUND_RESULTS)

/**
 * The closing round's per-cell undetermined counts, measured from the saved
 * replies: C1 50, C2 49, C3 26, C4 58, C5 0, C6 0 — 183 in total, which is the
 * number [`modes-experiment-log.md`] §17 records ("183 of 600 replies matched no
 * format", and `C2 49/49/2`). C2 is 49, not the 51 the build brief quotes: 51
 * would make the cells sum to 185, which contradicts both the recorded 183 and the
 * file itself. The data and the log agree, so the test asserts them.
 */
const CLOSED_ROUND_UNDETERMINED = { C1: 50, C2: 49, C3: 26, C4: 58, C5: 0, C6: 0 }

function cli(args) {
	return run("node", ["scripts/build-adjudication-packet.mjs", ...args], { cwd: ROOT })
}

/**
 * A six-draw, two-arm round against a key shaped like E20's: replies that extract
 * cleanly (a declaration of the key, two wrong commits) and replies that do not
 * (a question, a prose commit, a candidate list). Two undetermined per arm.
 */
function syntheticRound() {
	const arms = [
		{ armId: "ARM-1", expectedOwner: "explain" },
		{ armId: "ARM-2", expectedOwner: "explain" },
	]
	const responses = [
		"**Mode:** `explain`",
		"Mode: debug",
		"Which module do you mean? Please paste the source.",
		"I will explain the structure once you share the file.",
		"**Selected Mode:** `architecture-reviewer`",
		"Could you confirm the target file?\n\nIf you want the layout explained, `explain` fits.",
	]

	const records = []
	let index = 0
	for (const arm of arms) {
		for (const [offset, response] of responses.entries()) {
			index++
			records.push({
				index,
				runId: `${arm.armId}-d${String(offset + 1).padStart(3, "0")}`,
				label: arm.armId,
				draw: offset + 1,
				briefId: "B3",
				promptSha256: "0".repeat(64),
				model: "stub",
				temperature: 0,
				status: "RUN",
				startedAt: "2026-11-16T09:00:00.000Z",
				endedAt: "2026-11-16T09:00:05.000Z",
				response,
				finishReason: "STOP",
			})
		}
	}

	const key = {
		sealed: true,
		experiment: "E20",
		slugVocabulary: ["architecture-reviewer", "debug", "explain"],
		arms,
	}
	return { records, key }
}

async function writeRound() {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "adj-round-"))
	const { records, key } = syntheticRound()
	const resultsPath = path.join(dir, "results.jsonl")
	const keyPath = path.join(dir, "answer-key.json")
	await fs.writeFile(resultsPath, `${records.map((record) => JSON.stringify(record)).join("\n")}\n`, "utf-8")
	await fs.writeFile(keyPath, `${JSON.stringify(key, null, 2)}\n`, "utf-8")
	return { dir, resultsPath, keyPath, records, key }
}

async function buildInto(seed = "1") {
	const round = await writeRound()
	const out = path.join(round.dir, "packet")
	const joinPath = path.join(round.dir, "join.json")
	const { stdout } = await cli([
		"--run-dir",
		round.dir,
		"--key",
		round.keyPath,
		"--out",
		out,
		"--join",
		joinPath,
		"--seed",
		String(seed),
	])
	return { ...round, out, joinPath, stdout }
}

const readPacket = async (out) => fs.readFile(path.join(out, PACKET_JSONL), "utf-8")
const readMarkdown = async (out) => fs.readFile(path.join(out, PACKET_MD), "utf-8")
const readJoin = async (joinPath) => JSON.parse(await fs.readFile(joinPath, "utf-8"))
const parsePacket = async (out) => parseJsonl(await readPacket(out), PACKET_JSONL).map((row) => row.value)

describe("the packet", () => {
	it("carries { id, brief, reply } and no trace of the arm", async () => {
		const { out, records } = await buildInto()
		const jsonl = await readPacket(out)
		const markdown = await readMarkdown(out)

		// Read from disk, not from the writer's in-memory string: the scan must see
		// exactly what an adjudicator would open.
		for (const text of [jsonl, markdown]) {
			assert.ok(!text.includes("ARM-"), "no arm label prefix")
			assert.ok(!/\b\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(text), "no ISO timestamp")
			for (const line of Object.values(E20_LINES)) assert.ok(!text.includes(line), `no line text: ${line}`)
			for (const record of records) {
				assert.ok(!text.includes(record.runId), `no run id: ${record.runId}`)
			}
			assert.deepEqual(scanForLeaks({ text, where: "packet" }), [], "the shared scanner finds nothing either")
		}

		const entries = await parsePacket(out)
		assert.equal(
			entries.length,
			6,
			"three undetermined replies per arm: a question, a prose commit, a candidate list",
		)
		for (const entry of entries) {
			assert.deepEqual(Object.keys(entry).sort(), ["brief", "id", "reply"], "no field beyond the three")
			assert.match(entry.id, /^[0-9a-f]{12}$/, "twelve hex characters")
			assert.equal(entry.brief, "Explain why this module is structured the way it is.")
		}
		// The whole record is the three fields: no nested object can hide a label.
		for (const entry of entries) {
			for (const value of Object.values(entry)) assert.equal(typeof value, "string")
		}
	})

	it("is ordered by id, so the order comes from the hash and not from the data", async () => {
		const { out } = await buildInto()
		const ids = (await parsePacket(out)).map((entry) => entry.id)
		assert.deepEqual(ids, [...ids].sort(), "packet order is id order")
		assert.notDeepEqual(
			ids,
			(await readJoin(path.join(path.dirname(out), "join.json"))).entries
				.map((e) => e.id)
				.sort()
				.reverse(),
		)
	})

	it("puts the undetermined replies in, and the extractable ones out", async () => {
		const { out } = await buildInto()
		const entries = await parsePacket(out)
		assert.ok(
			entries.every((entry) => !entry.reply.includes("**Mode:** `explain`")),
			"a clean declaration never enters",
		)
		assert.ok(
			entries.every((entry) => !entry.reply.startsWith("Mode: debug")),
			"a wrong commit never enters",
		)
		assert.ok(
			entries.every((entry) => !entry.reply.includes("**Selected Mode:**")),
			"nor a bold wrong commit",
		)
		assert.equal(entries.filter((entry) => entry.reply.includes("Which module do you mean?")).length, 2)
		assert.equal(entries.filter((entry) => entry.reply.includes("I will explain the structure")).length, 2)
		assert.equal(entries.filter((entry) => entry.reply.includes("Could you confirm the target file?")).length, 2)
	})
})

describe("the ids", () => {
	it("are deterministic: the same seed rebuilds both files byte-identically", async () => {
		const first = await buildInto("7")
		const second = await buildInto("7")
		assert.equal(await readPacket(first.out), await readPacket(second.out), "packet.jsonl is byte-identical")
		assert.equal(await readMarkdown(first.out), await readMarkdown(second.out), "packet.md is byte-identical")
		assert.deepEqual(await readJoin(first.joinPath), await readJoin(second.joinPath), "the join is identical")
	})

	it("change every id, and the order, when the seed changes", async () => {
		const one = await buildInto("1")
		const other = await buildInto("2")
		const firstIds = (await parsePacket(one.out)).map((entry) => entry.id)
		const otherIds = (await parsePacket(other.out)).map((entry) => entry.id)
		assert.equal(new Set(firstIds).size, firstIds.length, "ids are unique")
		assert.deepEqual(
			firstIds.filter((id) => otherIds.includes(id)),
			[],
			"no id survives a seed change",
		)
		assert.notDeepEqual(firstIds, otherIds, "the order changes too")
		assert.equal(adjudicationId("1", "ARM-1-d001"), adjudicationId(1, "ARM-1-d001"), 'seed 1 and "1" are one seed')
	})
})

describe("the join", () => {
	it("maps every packet id to exactly one runId and back", async () => {
		const { out, joinPath, records } = await buildInto()
		const join = normaliseJoin(await readJoin(joinPath), "join")
		const ids = (await parsePacket(out)).map((entry) => entry.id)

		assert.deepEqual(
			join.entries.map((entry) => entry.id),
			ids,
			"the same ids, in packet order",
		)
		assert.equal(new Set(join.entries.map((entry) => entry.runId)).size, join.entries.length, "runIds are unique")
		assert.equal(new Set(join.entries.map((entry) => entry.label)).size, 2, "both arms are represented")

		const undeterminedRunIds = records
			.filter(
				(record) =>
					record.response.startsWith("Which module") ||
					record.response.startsWith("I will explain") ||
					record.response.startsWith("Could you confirm"),
			)
			.map((record) => record.runId)
		assert.deepEqual([...join.entries.map((entry) => entry.runId)].sort(), undeterminedRunIds.sort())
		for (const entry of join.entries) {
			assert.equal(adjudicationId(join.seed, entry.runId), entry.id, "the id is the runId's hash")
		}
	})

	it("is refused inside the packet directory", async () => {
		const round = await writeRound()
		await assert.rejects(
			cli([
				"--run-dir",
				round.dir,
				"--key",
				round.keyPath,
				"--out",
				path.join(round.dir, "packet"),
				"--join",
				path.join(round.dir, "packet", "join.json"),
			]),
			(error) => {
				assert.equal(error.code, 2)
				assert.match(error.stderr, /--join must live outside --out/)
				return true
			},
		)
	})
})

describe("the merge", () => {
	async function joinAndJudgements() {
		const built = await buildInto()
		const join = normaliseJoin(await readJoin(built.joinPath), "join")
		return { ...built, join }
	}

	const write = async (dir, name, lines) => {
		const file = path.join(dir, name)
		await fs.writeFile(file, `${lines.map((line) => JSON.stringify(line)).join("\n")}\n`, "utf-8")
		return file
	}

	it("refuses a missing packet id", async () => {
		const { dir, join } = await joinAndJudgements()
		const partial = join.entries.slice(1).map((entry) => ({ id: entry.id, verdict: "ASK" }))
		const file = await write(dir, "partial.jsonl", partial)
		await assert.rejects(cli(["--apply", file, "--join", path.join(dir, "join.json")]), (error) => {
			assert.equal(error.code, 2)
			assert.match(error.stderr, /is missing 1 of 6 packet ids/)
			return true
		})
	})

	it("refuses a duplicated id", async () => {
		const { dir, join } = await joinAndJudgements()
		const rows = join.entries.map((entry) => ({ id: entry.id, verdict: "ASK" }))
		rows.push({ ...rows[0] })
		const file = await write(dir, "duplicate.jsonl", rows)
		await assert.rejects(cli(["--apply", file, "--join", path.join(dir, "join.json")]), (error) => {
			assert.equal(error.code, 2)
			assert.match(error.stderr, /repeats id/)
			assert.match(error.stderr, /exactly one verdict/)
			return true
		})
	})

	it("refuses an unregistered verdict", async () => {
		const { dir, join } = await joinAndJudgements()
		const rows = join.entries.map((entry, index) => ({ id: entry.id, verdict: index === 0 ? "declared" : "ASK" }))
		const file = await write(dir, "verdict.jsonl", rows)
		await assert.rejects(cli(["--apply", file, "--join", path.join(dir, "join.json")]), (error) => {
			assert.equal(error.code, 2)
			assert.match(error.stderr, /verdict "declared"; allowed: DECLARATION, ASK, OTHER/)
			return true
		})
	})

	it("refuses an id that is not in the join", async () => {
		const { dir, join } = await joinAndJudgements()
		const rows = join.entries.map((entry) => ({ id: entry.id, verdict: "ASK" }))
		rows[0] = { id: "ffffffffffff", verdict: "ASK" }
		const file = await write(dir, "unknown.jsonl", rows)
		await assert.rejects(cli(["--apply", file, "--join", path.join(dir, "join.json")]), (error) => {
			assert.equal(error.code, 2)
			assert.match(error.stderr, /is not in the join/)
			return true
		})
	})

	it("counts per arm and prints the combined outcome table", async () => {
		const { dir, join } = await joinAndJudgements()
		// Verdicts keyed to the arm, not to the packet order: the packet is shuffled,
		// so an index-based expectation would be asserting the hash, not the merge.
		const rows = join.entries.map((entry) => ({
			id: entry.id,
			verdict: entry.label === "ARM-1" ? "DECLARATION" : "ASK",
		}))
		const file = await write(dir, "all.jsonl", rows)
		const { stdout } = await cli([
			"--apply",
			file,
			"--join",
			path.join(dir, "join.json"),
			"--key",
			path.join(dir, "answer-key.json"),
			"--run-dir",
			dir,
		])
		assert.match(stdout, /per arm — adjudicated verdicts/)
		assert.match(stdout, /combined outcome per arm/)
		assert.match(stdout, /declared key/)
		assert.match(stdout, /\btotal\b\s+3\s+3\s+0\s+6/, "six adjudicated verdicts, three of them declarations")
		// Each arm has one mechanical declared key and two mechanical wrong commits (a
		// plain `Mode:` and a bold `**Selected Mode:**`); ARM-1's three undetermined
		// replies are now declarations, ARM-2's are asks.
		assert.match(stdout, /ARM-1\s+4\s+0\s+2\s+4/, "arm 1: one mechanical plus three adjudicated declarations")
		assert.match(stdout, /ARM-2\s+1\s+3\s+2\s+4/, "arm 2: one mechanical, three adjudicated asks")
		assert.match(stdout, /\btotal\b\s+5\s+3\s+4\s+8/, "the totals are the sum of the arms")
	})

	it("reports the two-pass agreement rate and names each disagreement", async () => {
		const { dir, join } = await joinAndJudgements()
		const first = join.entries.map((entry) => ({ id: entry.id, verdict: "ASK" }))
		const second = first.map((row, index) => ({ ...row, verdict: index === 1 ? "DECLARATION" : row.verdict }))
		const firstFile = await write(dir, "pass1.jsonl", first)
		const secondFile = await write(dir, "pass2.jsonl", second)

		const { stdout } = await cli([
			"--apply",
			firstFile,
			"--join",
			path.join(dir, "join.json"),
			"--second",
			secondFile,
		])
		assert.match(stdout, /two-pass agreement: 5 of 6 \(83\.3%\)/)
		assert.match(stdout, new RegExp(`${join.entries[1].id}\\s+pass1 ASK\\s+pass2 DECLARATION`))

		const agreement = compareJudgements(
			parseJudgements(await fs.readFile(firstFile, "utf-8"), firstFile),
			parseJudgements(await fs.readFile(secondFile, "utf-8"), secondFile),
		)
		assert.equal(agreement.rate, 5 / 6)
		assert.deepEqual(agreement.disagreements, [{ id: join.entries[1].id, first: "ASK", second: "DECLARATION" }])
	})
})

describe("the blindness assertion", () => {
	it("refuses a packet with a run id added to one line", async () => {
		const built = await buildInto()
		const join = normaliseJoin(await readJoin(built.joinPath), "join")
		const lines = (await readPacket(built.out)).trimEnd().split("\n")
		lines[0] = JSON.stringify({ ...JSON.parse(lines[0]), runId: join.entries[0].runId })
		await fs.writeFile(path.join(built.out, PACKET_JSONL), `${lines.join("\n")}\n`, "utf-8")

		await assert.rejects(cli(["--verify", built.out, "--join", built.joinPath]), (error) => {
			assert.equal(error.code, 3, "the blindness failure is its own exit code")
			assert.match(error.stderr, /BLINDNESS ASSERTION FAILED/)
			assert.match(error.stderr, /UNSAFE to adjudicate/)
			assert.match(error.stderr, /packet\.jsonl/, "the file is named")
			assert.ok(error.stderr.includes(join.entries[0].runId), "the matched text is named")
			return true
		})
	})

	it("names a run id that carries no arm-shaped token of its own", () => {
		assert.throws(
			() =>
				assertBlind({
					files: [{ where: "packet.jsonl", text: '{"id":"0123456789ab","runId":"rr-run-d001"}\n' }],
					runIds: ["rr-run-d001"],
				}),
			/run id — "rr-run-d001"/,
		)
	})

	it("refuses an arm label beside an id, a timestamp, and a registered line", () => {
		const id = "0123456789ab"
		assert.throws(
			() => assertBlind({ files: [{ where: "packet.jsonl", text: `## C1:${id}\n` }], runIds: [] }),
			(error) => {
				assert.ok(error instanceof AdjudicationBlindnessError)
				assert.match(error.message, /arm token adjacent to a packet id/)
				return true
			},
		)
		assert.throws(
			() => assertBlind({ files: [{ where: "packet.md", text: "built 2026-11-16T09:00:00Z\n" }], runIds: [] }),
			/ISO timestamp/,
		)
		assert.throws(
			() => assertBlind({ files: [{ where: "packet.md", text: `## ${id}\n${E20_LINES.C}\n` }], runIds: [] }),
			/registered E20 line text/,
		)
		assert.throws(
			() =>
				assertBlind({ files: [{ where: "packet.jsonl", text: `{"id":"${id}","arm":"ARM-4"}\n` }], runIds: [] }),
			/arm label prefix/,
		)
	})

	it("passes an untouched packet, including the markdown rendering", async () => {
		const built = await buildInto()
		const join = await readJoin(built.joinPath)
		const files = [
			{ where: PACKET_JSONL, text: await readPacket(built.out) },
			{ where: PACKET_MD, text: await readMarkdown(built.out) },
		]
		assert.deepEqual(assertBlind({ files, runIds: join.entries.map((entry) => entry.runId) }).hits, [])
	})
})

describe("a reply's own backticks", () => {
	it("cannot close the markdown container", () => {
		const packet = [{ id: "aaaaaaaaaaaa", brief: "A brief.", reply: "```js\nconsole.log(1)\n```" }]
		const markdown = renderPacketMarkdown({ packet, seed: "1" })
		assert.match(markdown, /````+\n```js/, "the fence is longer than the reply's own run")
		assert.equal(renderPacketJsonl(packet).trim().split("\n").length, 1, "jsonl stays one record per line")
	})
})

describe("the closed round", () => {
	const skip = closedRoundAvailable
		? false
		: `no saved replies at ${CLOSED_ROUND_RESULTS}: the closed-round check is a workstation artefact and skips in CI`

	it("puts 183 of 600 replies in the packet, in the recorded per-cell distribution", { skip }, async () => {
		const keyEntries = normaliseKey(JSON.parse(await fs.readFile(CLOSED_ROUND_KEY, "utf-8")))
		const records = parseJsonl(await fs.readFile(CLOSED_ROUND_RESULTS, "utf-8"), CLOSED_ROUND_RESULTS).map(
			(row) => row.value,
		)
		const { packet, join, classification } = buildPacket({ records, keyEntries, seed: "1" })

		assert.equal(records.length, 600)
		assert.equal(packet.length, 183, "183 replies matched no format and therefore need a hand")
		const byCell = Object.fromEntries(classification.stats.map((row) => [row.cell, row.undetermined]))
		assert.deepEqual(byCell, CLOSED_ROUND_UNDETERMINED)
		assert.equal(
			Object.values(byCell).reduce((sum, count) => sum + count, 0),
			packet.length,
			"the cells sum to the packet",
		)

		// Scanned as rendered, not trusted: this is the file an adjudicator opens.
		const jsonl = renderPacketJsonl(packet)
		const markdown = renderPacketMarkdown({ packet, seed: "1" })
		for (const text of [jsonl, markdown]) {
			assert.deepEqual(
				scanForLeaks({ text, where: "packet", runIds: join.entries.map((entry) => entry.runId) }),
				[],
			)
		}
		assert.equal(join.entries.length, packet.length, "one join entry per packet id")
	})

	it("round-trips all 183 ASK verdicts to the join's per-arm counts", { skip }, async () => {
		// Built through the CLI, against the closed round's real replies, so the
		// round-trip exercises the same path the analyst will run on 2026-11-17.
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), "adj-closed-"))
		const out = path.join(dir, "packet")
		const joinPath = path.join(dir, "join.json")
		await cli([
			"--run-dir",
			CLOSED_ROUND_RESULTS,
			"--key",
			CLOSED_ROUND_KEY,
			"--out",
			out,
			"--join",
			joinPath,
			"--seed",
			"1",
		])
		const join = normaliseJoin(await readJoin(joinPath), "join")
		const packet = await parsePacket(out)
		assert.equal(packet.length, 183)

		const judgements = new Map(packet.map((entry) => [entry.id, "ASK"]))
		validateJudgements({ judgements, join, where: "all-ASK" })

		const merged = mergeJudgements({ judgements, join })
		const joinCounts = new Map()
		for (const entry of join.entries) joinCounts.set(entry.label, (joinCounts.get(entry.label) ?? 0) + 1)
		for (const row of merged.perArm) {
			assert.equal(row.asks, joinCounts.get(row.label), `${row.label}: each judged id is one ASK`)
			assert.equal(row.declarations, 0)
			assert.equal(row.other, 0)
			assert.equal(row.total, joinCounts.get(row.label))
		}
		assert.equal(merged.totals.asks, 183)
		assert.deepEqual(Object.fromEntries(joinCounts), { "CELL-1": 49, "CELL-3": 26, "CELL-4": 50, "CELL-5": 58 })

		// The same file through the CLI: the merge must accept a real judgement set.
		const file = path.join(dir, "closed.jsonl")
		await fs.writeFile(
			file,
			`${packet.map((entry) => JSON.stringify({ id: entry.id, verdict: "ASK" })).join("\n")}\n`,
			"utf-8",
		)
		const { stdout } = await cli(["--apply", file, "--join", joinPath])
		assert.match(stdout, /judgements: 183 verdicts for 183 packet ids/)
		assert.match(stdout, /total\s+0\s+183\s+0\s+183/)
	})

	it("produces the recorded closing-round outcome when the extractor's counts are joined", { skip }, async () => {
		const keyEntries = normaliseKey(JSON.parse(await fs.readFile(CLOSED_ROUND_KEY, "utf-8")))
		const records = parseJsonl(await fs.readFile(CLOSED_ROUND_RESULTS, "utf-8"), CLOSED_ROUND_RESULTS).map(
			(row) => row.value,
		)
		const { packet, join } = buildPacket({ records, keyEntries, seed: "1" })
		const judgements = new Map(packet.map((entry) => [entry.id, "ASK"]))
		validateJudgements({ judgements, join, where: "all-ASK" })

		const merged = mergeJudgements({
			judgements,
			join,
			mechanical: new Map(
				[
					["CELL-4", { declaredKey: 50 }],
					["CELL-1", { declaredKey: 49, wrongCommit: 2 }],
					["CELL-3", { declaredKey: 74 }],
					["CELL-5", { declaredKey: 42 }],
					["CELL-2", { declaredKey: 100 }],
					["CELL-6", { declaredKey: 100 }],
				].map(([label, counts]) => [label, { asked: 0, wrongCommit: 0, ...counts }]),
			),
		})
		// §17.3: 598 of 600 appropriate. Mechanical commitments plus the replies the
		// extractor could not read — with every undetermined reply scored as an ASK.
		assert.equal(merged.outcomeTotals.appropriate, 598)
		assert.equal(merged.outcomeTotals.wrongCommit, 2)
		assert.equal(
			merged.outcome.find((row) => row.label === "CELL-2").declaredKey,
			100,
			"an arm with no packet entries survives",
		)
	})
})
