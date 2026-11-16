/**
 * routing-round.spec.mjs — pins the E13-R Stage 1 instrument without spending a call.
 *
 * WHAT IT PINS
 *   1. The six pickers are the base picker with one entry rewritten, proven by
 *      diffing bytes; C6 carries `debug`'s routing line verbatim and not the
 *      artefact fixture's (the independent red team's objection 3).
 *   2. The six prompts differ only in the brief line and the target entry.
 *   3. The plan is 600 draw-major runs, 100 per cell, interleaved, label-only.
 *   4. The answer key is sealed and its owner per cell is the registered one.
 *   5. `finishReason` is enforced, not recorded: a non-STOP run leaves the
 *      denominator, and the report refuses only when a cell's exclusion rate
 *      exceeds the registered 5% (§A2.5 row 10) — one truncation must not void
 *      a 600-run sweep.
 *   5b. `scripts/run-routing-round.mjs` is the executor: it validates the plan,
 *      rebuilds the prompts, honours --dry-run / --only / --limit / --force, and
 *      turns a non-STOP `finishReason` into INVALID. Exercised with a stub runner
 *      that writes a fixed transcript: no network, no key.
 *   5c. `scripts/lib/gemini-runner.mjs` caps output at 4096 tokens by default and
 *      states the cap in its usage text; a malformed value is refused.
 *   6. The abstention rule is mechanical: slug presence, never the request for
 *      information; `explain` does not match inside `explanation`.
 *   7. The statistics are the registered ones: Wilson, within-cell run length,
 *      duplicate rate, the seeded bootstrap and Fisher's exact test.
 *   8. The clustering guard (R-5) and the boundary guard suppress intervals.
 *
 * Run with: node --test scripts/routing-round.spec.mjs
 */

import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { execFile } from "node:child_process"
import * as fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { promisify } from "node:util"

import { extractDeclaredMode } from "./lib/b3-sequence.mjs"
import { PERSONAS, parseRoomodes, sha256 } from "./lib/framing-pretest.mjs"
import {
	ARTEFACT_FIXTURE_PATH,
	AXIS_FIXTURE_PATH,
	CELLS,
	CLUSTER_DUPLICATE_LIMIT,
	CLUSTER_RUN_LIMIT,
	DEFAULT_BLIND_SEED,
	DRAWS_PER_CELL,
	MAX_EXCLUSION_RATE,
	PARSER_VERSION,
	PARSER_VERSION_V2,
	ROUTING_ROUND_DIR,
	analysePromptPairs,
	assertInterleaved,
	assertRoundRobin,
	bootstrapInteraction,
	buildAnswerKey,
	buildFixtureSet,
	buildReport,
	buildRuns,
	classifyRecord,
	extractDeclaredAcrossArms,
	extractDeclaredV2,
	fisherExact,
	isAbstention,
	isInvalidFinishReason,
	labelCells,
	longestRun,
	outcomeRunsTest,
	renderReport,
	syntheticRecords,
	transcriptStats,
	wilsonInterval,
} from "./lib/routing-round.mjs"

const run = promisify(execFile)
const ROOT = path.resolve(".")
const DIR = ROUTING_ROUND_DIR

const read = (name, dir = DIR) => fs.readFile(path.join(dir, name), "utf-8")

/** Flip `count` draws of one label to a truncated RUN: an exclusion, by the Guard 4 rule. */
function withExclusions(records, label, count) {
	let flipped = 0
	return records.map((record) => {
		if (record.label !== label || flipped >= count) return record
		flipped++
		return { ...record, status: "RUN", finishReason: "MAX_TOKENS" }
	})
}

/** The blind label of a cell, read from the sealed key rather than assumed. */
function labelFor(key, cell) {
	const entry = key.cells.find((candidate) => candidate.cell === cell)
	assert.ok(entry, `the key has no ${cell}`)
	return entry.label
}

/**
 * A stub runner: writes a fixed transcript and, when STUB_FINISH_REASON is set,
 * a usage sidecar. No network, no key, no provider protocol.
 */
async function writeStubRunner(dir) {
	const stubPath = path.join(dir, "stub-runner.mjs")
	await fs.writeFile(
		stubPath,
		[
			'import * as fs from "node:fs/promises"',
			'import path from "node:path"',
			"",
			"const [promptFile, outFile, runId, transcriptDir] = process.argv.slice(2)",
			'const prompt = await fs.readFile(promptFile, "utf-8")',
			"await fs.mkdir(path.dirname(outFile), { recursive: true })",
			'await fs.writeFile(outFile, `STUB ${runId}: read ${prompt.length} bytes; the picker names a mode.\\n`, "utf-8")',
			"if (process.env.STUB_FINISH_REASON) {",
			"	await fs.mkdir(transcriptDir, { recursive: true })",
			"	const sidecar = { runId, attempts: [{ finishReason: process.env.STUB_FINISH_REASON }], maxOutputTokens: 4096 }",
			'	await fs.writeFile(path.join(transcriptDir, `usage-${runId}.json`), `${JSON.stringify(sidecar)}\\n`, "utf-8")',
			"}",
			"",
		].join("\n"),
		"utf-8",
	)
	const runner = `node ${JSON.stringify(stubPath)} %PROMPT_FILE% %OUT_FILE% %RUN_ID% %TRANSCRIPT_DIR%`
	return { stubPath, runner }
}

let fixtureCache = null
async function loadFixtures() {
	if (!fixtureCache) {
		fixtureCache = buildFixtureSet({
			baseText: await fs.readFile(AXIS_FIXTURE_PATH, "utf-8"),
			artefactText: await fs.readFile(ARTEFACT_FIXTURE_PATH, "utf-8"),
		})
	}
	return fixtureCache
}

let keyCache = null
async function loadKey() {
	if (!keyCache) keyCache = JSON.parse(await read("answer-key.json"))
	return keyCache
}

function cellsOf(fixtureSet, cell) {
	return fixtureSet.cells.find((candidate) => candidate.spec.cell === cell)
}

describe("the six pickers", () => {
	it("derive 45 entries each, with one target entry rewritten", async () => {
		const fixtureSet = await loadFixtures()
		assert.equal(fixtureSet.cells.length, 6)
		assert.equal(fixtureSet.baseModes.length, 45)
		for (const cell of fixtureSet.cells) {
			assert.equal(cell.modes.length, 45, `${cell.spec.cell} entry count`)
			const entry = cell.modes[cell.targetIndex]
			assert.equal(entry.slug, cell.spec.slug, `${cell.spec.cell} slug`)
			assert.equal(entry.name, cell.spec.name, `${cell.spec.cell} name`)
		}
	})

	it("changes exactly the registered lines and nothing else", async () => {
		const fixtureSet = await loadFixtures()
		assert.deepEqual(cellsOf(fixtureSet, "C1").changedLines, [])
		assert.deepEqual(cellsOf(fixtureSet, "C2").changedLines, [56, 57])
		assert.deepEqual(cellsOf(fixtureSet, "C3").changedLines, [60])
		assert.deepEqual(cellsOf(fixtureSet, "C4").changedLines, [56, 57, 60])
		assert.deepEqual(cellsOf(fixtureSet, "C5").changedLines, [])
		assert.deepEqual(cellsOf(fixtureSet, "C6").changedLines, [74, 75])
	})

	it("C1 and C5 are the base picker byte for byte", async () => {
		const base = await fs.readFile(AXIS_FIXTURE_PATH, "utf-8")
		assert.equal(await read("C1.roomodes"), base, "C1")
		assert.equal(await read("C5.roomodes"), base, "C5")
	})

	it("C6 carries debug's routing line verbatim and not the artefact fixture's", async () => {
		const fixtureSet = await loadFixtures()
		const c5 = cellsOf(fixtureSet, "C5")
		const c6 = cellsOf(fixtureSet, "C6")
		const debugLine = fixtureSet.baseModes.find((mode) => mode.slug === "debug").whenToUse
		const artefactModes = parseRoomodes(await fs.readFile(ARTEFACT_FIXTURE_PATH, "utf-8"), "artefact.roomodes")
		const artefactLine = artefactModes.find((mode) => mode.slug === "bug-report").whenToUse

		assert.equal(c5.modes[c5.targetIndex].whenToUse, debugLine, "C5 line")
		assert.equal(c6.modes[c6.targetIndex].whenToUse, debugLine, "C6 line equals debug's line")
		assert.match(debugLine, /produce a reproduction and a named root cause/, "debug's line is the axis line")
		assert.match(artefactLine, /produce evidence, not a guess/, "the artefact line is the rejected one")
		assert.notEqual(c6.modes[c6.targetIndex].whenToUse, artefactLine, "C6 did not copy the artefact line")
	})

	it("C6 differs from C5 only in slug and name", async () => {
		const fixtureSet = await loadFixtures()
		const c5 = (await read("C5.roomodes")).split("\n")
		const c6 = (await read("C6.roomodes")).split("\n")
		assert.equal(c5.length, c6.length, "same line count")
		const changed = c5.map((line, index) => (line === c6[index] ? null : index + 1)).filter(Boolean)
		assert.deepEqual(changed, [74, 75], "only the slug and name lines move")
		assert.equal(c5[73], "  - slug: debug")
		assert.equal(c6[73], "  - slug: bug-report")
	})
})

describe("the six prompts", () => {
	it("are unique and differ only in the brief and the target entry", async () => {
		const fixtureSet = await loadFixtures()
		assert.equal(new Set(fixtureSet.cells.map((cell) => cell.prompt)).size, 6, "six unique prompts")
		const rows = analysePromptPairs(fixtureSet.cells)
		assert.equal(rows.length, 15, "all 15 pairs analysed")
		const allowed = new Set([5, 13, 15])
		for (const row of rows) {
			for (const line of row.changed)
				assert.ok(allowed.has(line), `${row.left}/${row.right} changed line ${line}`)
		}
		const pair = (left, right) => rows.find((row) => row.left === left && row.right === right)
		assert.deepEqual(pair("C1", "C5").changed, [5], "the two base pickers differ only in the brief")
		assert.deepEqual(pair("C5", "C6").changed, [15], "the control pair differs only in the target entry")
		assert.deepEqual(pair("C1", "C2").changed, [13], "the register manipulation differs only in the target entry")
		assert.deepEqual(pair("C3", "C4").changed, [13], "the register manipulation under DC")
		assert.deepEqual(pair("C1", "C3").changed, [13], "the mood manipulation differs only in the target entry")
	})

	it("carry no doctrine or grant literal", async () => {
		const fixtureSet = await loadFixtures()
		for (const cell of fixtureSet.cells) {
			for (const literal of ["roleDefinition", "customInstructions", "groups:"]) {
				assert.equal(cell.prompt.split(literal).length - 1, 0, `${cell.spec.cell}: ${literal}`)
			}
		}
	})

	it("use the goal-only explorer directive byte for byte", async () => {
		const fixtureSet = await loadFixtures()
		const persona = PERSONAS.find((candidate) => candidate.condition === "goal-only explorer")
		assert.ok(persona, "the frozen persona exists")
		for (const cell of fixtureSet.cells) {
			assert.ok(cell.prompt.startsWith(`${persona.directive}\n`), `${cell.spec.cell} starts with the directive`)
			assert.equal(cell.persona.directive, persona.directive)
		}
	})
})

describe("plan.json", () => {
	it("is 600 draw-major runs, 100 per label, labels only", async () => {
		const plan = JSON.parse(await read("plan.json"))
		assert.equal(plan.runs.length, 600)
		assert.equal(plan.drawsPerCell, 100)
		const perLabel = new Map()
		for (const [position, entry] of plan.runs.entries()) {
			assert.match(entry.label, /^CELL-\d+$/, "a run carries a blind label")
			assert.ok(!Object.hasOwn(entry, "cell"), "a run never carries a cell name")
			assert.equal(entry.index, position + 1)
			assert.equal(entry.draw, Math.floor(position / 6) + 1, "draw-major order")
			perLabel.set(entry.label, (perLabel.get(entry.label) ?? 0) + 1)
		}
		assert.equal(perLabel.size, 6)
		for (const [label, count] of perLabel) assert.equal(count, DRAWS_PER_CELL, label)
		assert.doesNotMatch(JSON.stringify(plan), /"cell"/, "plan.json has no cell key")
		assert.doesNotMatch(JSON.stringify(plan), /\bC[1-6]\b/, "plan.json has no cell identifier")
	})

	it("never schedules two consecutive runs of the same cell", async () => {
		const plan = JSON.parse(await read("plan.json"))
		for (let index = 1; index < plan.runs.length; index++) {
			assert.notEqual(plan.runs[index].label, plan.runs[index - 1].label, `runs ${index} and ${index + 1}`)
		}
		assert.equal(assertRoundRobin(plan.runs), true, "the plan still passes the round-robin assertion")
	})

	it("carries six unique prompt hashes and the frozen persona", async () => {
		const plan = JSON.parse(await read("plan.json"))
		assert.equal(new Set(plan.runs.map((entry) => entry.promptSha256)).size, 6)
		const persona = PERSONAS.find((candidate) => candidate.condition === "goal-only explorer")
		assert.equal(plan.persona.directive, persona.directive)
		assert.deepEqual(plan.briefs.map((brief) => brief.id).sort(), ["B1", "B3"])
	})
})

describe("the sealed files", () => {
	it("record the registered owner per cell", async () => {
		const key = await loadKey()
		assert.equal(key.sealed, true)
		assert.match(key.warning, /SEALED/)
		const owners = Object.fromEntries(key.cells.map((cell) => [cell.cell, cell.expectedOwner]))
		assert.deepEqual(owners, {
			C1: "explain",
			C2: "explanation",
			C3: "explain",
			C4: "explanation",
			C5: "debug",
			C6: "bug-report",
		})
		for (const cell of key.cells) {
			assert.ok(cell.slugs.includes(cell.expectedOwner), `${cell.cell}: owner is in its own picker`)
			assert.equal(cell.slugs.length, 45, `${cell.cell}: 45 slugs`)
		}
	})

	it("refuses a key whose owner is not in its picker, or whose labels collide", async () => {
		const key = await loadKey()
		const results = syntheticRecords({ key, scenario: "clean" })
		const wrongOwner = {
			...key,
			cells: key.cells.map((cell) => (cell.cell === "C1" ? { ...cell, expectedOwner: "not-a-slug" } : cell)),
		}
		assert.throws(() => buildReport({ results, key: wrongOwner, resamples: 10 }), /not in its own picker/)
		const collided = {
			...key,
			cells: key.cells.map((cell) => (cell.cell === "C2" ? { ...cell, label: key.cells[0].label } : cell)),
		}
		assert.throws(() => buildReport({ results, key: collided, resamples: 10 }), /repeats label/)
	})

	it("map every label to exactly one cell, and never leak into a prompt", async () => {
		const key = await loadKey()
		const map = JSON.parse(await read("_label-map.json"))
		assert.equal(map.sealed, true)
		assert.match(map.warning, /SEALED/)
		assert.equal(map.blindSeed, DEFAULT_BLIND_SEED)
		assert.equal(map.labels.length, 6)
		assert.deepEqual(new Set(map.labels.map((entry) => entry.cell)), new Set(CELLS.map((spec) => spec.cell)))
		assert.deepEqual(new Set(map.labels.map((entry) => entry.label)), new Set(key.cells.map((cell) => cell.label)))
		const fixtureSet = await loadFixtures()
		for (const cell of fixtureSet.cells) {
			assert.ok(!cell.prompt.includes("CELL-"), `${cell.spec.cell}: no blind label in the prompt`)
		}
	})
})

describe("finishReason enforcement (R-2 / Guard 4)", () => {
	const cellKey = { cell: "C1", label: "CELL-4", expectedOwner: "explain", slugs: ["explain", "debug"] }
	const base = { status: "RUN", label: "CELL-4", draw: 1, response: "use the explain mode" }

	it("treats only STOP and absent as scorable", () => {
		assert.equal(isInvalidFinishReason("STOP"), false)
		assert.equal(isInvalidFinishReason(null), false)
		assert.equal(isInvalidFinishReason(undefined), false)
		for (const reason of ["MAX_TOKENS", "SAFETY", "RECITATION", "OTHER"]) {
			assert.equal(isInvalidFinishReason(reason), true, reason)
		}
		assert.equal(classifyRecord({ ...base, finishReason: "STOP" }, cellKey).scored, true)
		assert.equal(classifyRecord({ ...base, finishReason: null }, cellKey).scored, true)
	})

	it("invalidates a RUN whose reason is not STOP, whatever its status says", () => {
		const decision = classifyRecord({ ...base, status: "RUN", finishReason: "MAX_TOKENS" }, cellKey)
		assert.equal(decision.scored, false)
		assert.equal(decision.invalid, true)
		assert.ok(decision.reasons.some((reason) => reason.includes("MAX_TOKENS")))
	})

	it("invalidates a non-RUN record and a RUN with no response", () => {
		assert.equal(classifyRecord({ ...base, status: "UNRUN", finishReason: null }, cellKey).scored, false)
		assert.equal(classifyRecord({ ...base, status: "INVALID", finishReason: null }, cellKey).scored, false)
		assert.equal(classifyRecord({ ...base, response: "   " }, cellKey).scored, false)
	})
})

describe("the abstention rule (R-3)", () => {
	it("counts slug presence, not the request for information", () => {
		assert.equal(isAbstention("I cannot tell which mode fits; please tell me more.", ["explain"]), true)
		assert.equal(isAbstention("Use the explain mode. Which file is it?", ["explain"]), false)
		assert.equal(isAbstention("Use the explain mode, but I need to know the branch.", ["explain"]), false)
		assert.equal(isAbstention("I need more information.", ["explain", "explanation"]), true)
	})

	it("does not read explain inside explanation", () => {
		assert.equal(extractDeclaredMode("Use explanation.", ["explain"]).declared, null)
		assert.equal(extractDeclaredMode("Use explanation.", ["explanation"]).declared, "explanation")
	})

	it("takes the last-mentioned slug and flags the ambiguity", () => {
		const extraction = extractDeclaredMode("Not explain; explanation.", ["explain", "explanation"])
		assert.equal(extraction.declared, "explanation")
		assert.equal(extraction.ambiguous, true)
	})
})

describe("the statistics", () => {
	it("computes the Wilson interval for 45/100", () => {
		const interval = wilsonInterval(45, 100)
		assert.equal(interval.p, 0.45)
		assert.ok(Math.abs(interval.lower - 0.3561453797951198) < 1e-9, `lower ${interval.lower}`)
		assert.ok(Math.abs(interval.upper - 0.5475539700255787) < 1e-9, `upper ${interval.upper}`)
		assert.equal(wilsonInterval(0, 0), null)
	})

	it("measures the longest identical run within the cell's draw order", () => {
		assert.equal(longestRun(["a", "a", "b", "a", "a", "a"]), 3)
		assert.equal(longestRun([]), 0)
		assert.equal(longestRun(["a", "b", "c"]), 1)
	})

	it("measures the exact-duplicate rate as (n - distinct) / n", () => {
		assert.equal(transcriptStats(["a", "a", "b", "c"]).duplicateRate, 0.25)
		assert.equal(transcriptStats(["a", "b", "c", "d"]).duplicateRate, 0)
		assert.equal(transcriptStats(["a", "a", "a"]).longestRun, 3)
	})

	it("bootstraps (C2 − C1) − (C6 − C5) reproducibly", () => {
		const vectors = {
			C1: [0, 0, 1, 0],
			C2: [1, 1, 1, 0],
			C5: [1, 1, 1, 1],
			C6: [1, 1, 1, 1],
		}
		const first = bootstrapInteraction(vectors, { resamples: 200, seed: 7 })
		const second = bootstrapInteraction(vectors, { resamples: 200, seed: 7 })
		assert.equal(first.estimate, 0.5)
		assert.deepEqual(first, second)
		assert.ok(first.lower <= first.estimate && first.estimate <= first.upper)
	})

	it("computes Fisher's exact test on a 2×2 table", () => {
		assert.ok(Math.abs(fisherExact(3, 1, 1, 3) - 0.4857142857142848) < 1e-12)
		assert.equal(fisherExact(3, 1, 1, 3), fisherExact(1, 3, 3, 1))
		assert.ok(fisherExact(10, 0, 0, 10) < 1e-4)
	})
})

describe("the declaration extractor v2", () => {
	const vocabulary = ["explain", "explanation", "debug", "bug-report"]

	it("pins routing-round-parser/2", () => {
		assert.equal(PARSER_VERSION_V2, "routing-round-parser/2")
	})

	it("recognises the six registered reply shapes, case-insensitively", () => {
		assert.equal(extractDeclaredV2("**Mode:** `explain`", vocabulary), "explain")
		assert.equal(extractDeclaredV2("**MODE:** `Explain`", vocabulary), "explain")
		assert.equal(extractDeclaredV2("**Mode:** explain", vocabulary), "explain")
		assert.equal(extractDeclaredV2("Mode: `explain`", vocabulary), "explain")
		assert.equal(extractDeclaredV2("Mode: explain", vocabulary), "explain")
		assert.equal(extractDeclaredV2("**Selected Mode:** `debug`", vocabulary), "debug")
		assert.equal(extractDeclaredV2("**Selected Mode:** debug", vocabulary), "debug")
		assert.equal(extractDeclaredV2("**debug**", vocabulary), "debug")
	})

	it("accepts the marker and the slug split across one line break", () => {
		assert.equal(extractDeclaredV2("**Mode:**\n`explain`", vocabulary), "explain")
		assert.equal(extractDeclaredV2("Mode:\nexplain", vocabulary), "explain")
	})

	it("refuses a bare bold slug that is not on a line of its own, or carries a colon", () => {
		assert.equal(extractDeclaredV2("Some prose **debug** and more.", vocabulary), null)
		assert.equal(extractDeclaredV2("**Goal:**", vocabulary), null)
		assert.equal(extractDeclaredV2("**Explanation**", ["explain", "debug"]), null)
	})

	it("refuses a token outside the caller's own picker rather than returning a wrong slug", () => {
		assert.equal(extractDeclaredV2("**Mode:** `explanation`", ["explain"]), null)
		assert.equal(extractDeclaredV2("**Mode:** `bug-report`", ["explain", "debug"]), null)
		assert.equal(extractDeclaredV2("**Selected Mode:** `explanation`", ["explain"]), null)
	})

	it("returns null for a prose commit with no marker", () => {
		assert.equal(extractDeclaredV2("I will use the explain mode to answer the question.", vocabulary), null)
		assert.equal(
			extractDeclaredV2("I want to understand the design rationale and cite evidence.", vocabulary),
			null,
		)
	})

	it("does not read a candidate offered in a list as a declaration", () => {
		assert.equal(extractDeclaredV2("The focus could be `explanation` or `explain`.", vocabulary), null)
	})

	it("resolves across arms by the first picker that carries the token", () => {
		const arms = new Map([
			["C1", ["explain"]],
			["C2", ["explanation"]],
			["C6", ["bug-report"]],
		])
		assert.deepEqual(extractDeclaredAcrossArms("**Mode:** `bug-report`", arms), { slug: "bug-report", arm: "C6" })
		assert.deepEqual(extractDeclaredAcrossArms("**Mode:** `explanation`", arms), { slug: "explanation", arm: "C2" })
		assert.deepEqual(extractDeclaredAcrossArms("no marker here", arms), { slug: null, arm: null })
	})
})

describe("the outcome runs test", () => {
	/** Alternate runs of ones and zeros: oneGroups[n] ones, then zeroGroups[n] zeros. */
	function buildSequence(oneGroups, zeroGroups) {
		const sequence = []
		for (let index = 0; index < Math.max(oneGroups.length, zeroGroups.length); index++) {
			if (index < oneGroups.length) sequence.push(...new Array(oneGroups[index]).fill(1))
			if (index < zeroGroups.length) sequence.push(...new Array(zeroGroups[index]).fill(0))
		}
		return sequence
	}

	it("reproduces the closing round's 93/7 vector (11 runs, z = −2.40)", () => {
		const sequence = buildSequence([10, 20, 20, 20, 20, 3], [1, 1, 1, 1, 3])
		assert.equal(sequence.length, 100)
		const result = outcomeRunsTest(sequence)
		assert.equal(result.runs, 11)
		assert.ok(Math.abs(result.expected - 14.02) < 1e-12, `expected ${result.expected}`)
		assert.equal(result.z.toFixed(2), "-2.40")
	})

	it("reproduces the closing round's 50/50 vector (58 runs, z = +1.41)", () => {
		const groups = [...new Array(21).fill(2), ...new Array(8).fill(1)]
		const sequence = buildSequence(groups, groups)
		assert.equal(sequence.length, 100)
		const result = outcomeRunsTest(sequence)
		assert.equal(result.runs, 58)
		assert.equal(result.expected, 51)
		assert.equal(result.z.toFixed(2), "1.41")
	})

	it("gives an alternating sequence a large positive z under this sign convention", () => {
		const result = outcomeRunsTest(Array.from({ length: 100 }, (_, index) => index % 2))
		assert.equal(result.runs, 100)
		assert.equal(result.expected, 51)
		assert.equal(result.z.toFixed(2), "9.85")
		assert.ok(result.z > 0, "positive z means more runs than chance, i.e. alternation")
	})

	it("returns null when every value is identical", () => {
		assert.equal(outcomeRunsTest([1, 1, 1, 1]), null)
		assert.equal(outcomeRunsTest([0, 0, 0]), null)
		assert.equal(outcomeRunsTest([]), null)
	})
})

describe("the interleaving assertion", () => {
	const at = (second) => new Date(Date.UTC(2026, 10, 12, 16, 0, second)).toISOString()
	const call = (label, start, end) => ({ runId: `${label}-${start}`, label, startedAt: at(start), endedAt: at(end) })

	it("passes a synthetic round-robin and reports n − 1 transitions", () => {
		const labels = ["A", "B", "C", "A", "B", "C"]
		const records = labels.map((label, index) => call(label, index * 10, index * 10 + 5))
		const summary = assertInterleaved(records, (record) => record.label)
		assert.deepEqual(summary, { calls: 6, transitions: 5, expected: 5, maxConcurrency: 1 })
	})

	it("sorts by startedAt rather than trusting the input order", () => {
		const records = [call("A", 0, 5), call("B", 10, 15), call("A", 20, 25)].reverse()
		assert.equal(assertInterleaved(records, (record) => record.label).transitions, 2)
	})

	it("throws on a blocked round and names the transition count", () => {
		const records = [call("A", 0, 5), call("A", 10, 15), call("B", 20, 25)]
		assert.throws(
			() => assertInterleaved(records, (record) => record.label),
			/1 transitions across 3 calls, expected 2/,
		)
	})

	it("throws when two calls overlap in time", () => {
		const records = [call("A", 0, 12), call("B", 10, 15)]
		assert.throws(() => assertInterleaved(records, (record) => record.label), /overlap/)
	})
})

describe("the report", () => {
	async function reportFor(scenario, options = {}) {
		const key = await loadKey()
		const results = syntheticRecords({ key, scenario })
		return buildReport({ results, key, resamples: 400, ...options })
	}

	it("emits the per-cell table and both co-primary intervals on a clean sweep", async () => {
		const report = await reportFor("clean")
		assert.equal(report.refused, false)
		assert.equal(report.synthetic, true)
		for (const cell of Object.values(report.cells)) {
			assert.equal(cell.scored, 100, `${cell.label} scored`)
			assert.equal(cell.excluded, 0)
			assert.ok(cell.hitInterval && cell.abstentionInterval, `${cell.label} intervals`)
			assert.ok(cell.hitInterval.lower <= cell.hitRate && cell.hitRate <= cell.hitInterval.upper)
			assert.ok(
				cell.outcomeRunsTest === null || typeof cell.outcomeRunsTest.z === "number",
				`${cell.label} carries the outcome runs test`,
			)
		}
		for (const outcome of ["hit", "abstention"]) {
			const contrast = report.contrasts[outcome]
			assert.equal(contrast.estimable, true, `${outcome} estimable`)
			assert.equal(contrast.resamples, 400)
			assert.ok(contrast.lower <= contrast.estimate && contrast.estimate <= contrast.upper)
		}
		const text = renderReport(report)
		assert.match(text, /P1 — hit rate/)
		assert.match(text, /P2 — abstention rate/)
		assert.match(text, /2×2 decomposition/)
		assert.match(text, /SYNTHETIC/)
	})

	it("reports every cell with denominators when a cell excludes inside the 5% rule", async () => {
		const report = await reportFor("partial")
		assert.equal(report.refused, false, "1 exclusion in 100 draws is 1.0%, inside the registered limit")
		assert.equal(report.maxExclusionRate, MAX_EXCLUSION_RATE)
		for (const cell of Object.values(report.cells)) {
			assert.equal(cell.drawn, 100, `${cell.label} drawn`)
			assert.equal(cell.scored + cell.excluded, cell.drawn, `${cell.label} denominator`)
			assert.ok(cell.hitInterval && cell.abstentionInterval, `${cell.label} intervals`)
			assert.ok(cell.hitInterval.lower <= cell.hitRate && cell.hitRate <= cell.hitInterval.upper)
		}
		assert.equal(report.cells.C2.scored, 99)
		assert.equal(report.cells.C2.excluded, 1)
		assert.ok(Math.abs(report.cells.C2.exclusionRate - 0.01) < 1e-12)
		assert.deepEqual(
			report.exclusionFlags.map((entry) => entry.cell),
			["C2"],
			"the only short cell is named",
		)
		assert.equal(report.denominators.scored, 599)
		const text = renderReport(report)
		assert.doesNotMatch(text, /REFUSED/)
		assert.match(text, /REPORTED WITH A FLAG/)
		assert.match(text, /excludes 1 of 100 draws \(1\.0%\)/)
		assert.match(text, /do not compare cells with differing exclusion rates/)
	})

	it("refuses only when a cell's exclusion rate exceeds 5%, naming the cell and the rate", async () => {
		const report = await reportFor("over-exclusion")
		assert.equal(report.refused, true)
		assert.ok(
			report.reasons.some((reason) => reason.includes("C2") && reason.includes("6.0%")),
			`reasons: ${report.reasons.join("; ")}`,
		)
		assert.equal(report.cells.C2.scored, 94)
		assert.equal(report.cells.C2.excluded, 6)
		assert.equal(report.cells.C2.excludedReasons["finishReason MAX_TOKENS"], 6)
		assert.equal(report.contrasts, undefined, "no contrast is computed on a refusal")
		const text = renderReport(report)
		assert.match(text, /REFUSED/)
		assert.match(text, /6\.0%/)
		assert.match(text, /finishReason MAX_TOKENS ×6/)
	})

	it("treats exactly 5% as reportable and 6% as a refusal", async () => {
		const key = await loadKey()
		const clean = syntheticRecords({ key, scenario: "clean" })
		const label = labelFor(key, "C2")

		const five = withExclusions(clean, label, 5)
		const reported = buildReport({ results: five, key, resamples: 200 })
		assert.equal(reported.refused, false, "5 of 100 is exactly 5%: it must not refuse")
		assert.equal(reported.cells.C2.excluded, 5)
		assert.ok(Math.abs(reported.cells.C2.exclusionRate - MAX_EXCLUSION_RATE) < 1e-12)

		const six = withExclusions(clean, label, 6)
		const refused = buildReport({ results: six, key, resamples: 200 })
		assert.equal(refused.refused, true, "6 of 100 is 6%: it must refuse")
		assert.ok(refused.reasons.some((reason) => reason.includes("C2")))
	})

	it("suppresses the interval of a clustered cell and of any contrast using it", async () => {
		const report = await reportFor("clustered")
		const cell = Object.values(report.cells).find((candidate) => candidate.cell === "C1")
		assert.equal(cell.clustered, true)
		assert.ok(cell.longestRun > CLUSTER_RUN_LIMIT, `longest run ${cell.longestRun}`)
		assert.ok(cell.duplicateRate > CLUSTER_DUPLICATE_LIMIT, `duplicate rate ${cell.duplicateRate}`)
		assert.equal(cell.hitInterval, null, "no interval is emitted for a clustered cell")
		for (const outcome of ["hit", "abstention"]) {
			const contrast = report.contrasts[outcome]
			assert.equal(contrast.estimable, false)
			assert.equal(contrast.reason, "clustered")
			assert.ok(!Object.hasOwn(contrast, "lower"), "no bootstrap interval on a clustered contrast")
		}
		assert.match(renderReport(report), /NOT ESTIMABLE/)
	})

	it("suppresses the interval at a boundary and reports counts with an exact test", async () => {
		const report = await reportFor("boundary")
		const contrast = report.contrasts.hit
		assert.equal(contrast.estimable, false)
		assert.equal(contrast.reason, "boundary")
		assert.ok(!Object.hasOwn(contrast, "lower"), "no bootstrap interval at a boundary")
		assert.ok(contrast.pairTests.ambiguous >= 0 && contrast.pairTests.ambiguous <= 1)
		assert.match(renderReport(report), /INTERVAL SUPPRESSED/)
	})

	it("computes the 2×2 decomposition from the same counts", async () => {
		const report = await reportFor("clean")
		const rate = (cell) => report.cells[cell].hitRate
		const decomposition = report.decomposition.hit
		assert.ok(Math.abs(decomposition.register[0].value - (rate("C2") - rate("C1"))) < 1e-12)
		assert.ok(Math.abs(decomposition.register[1].value - (rate("C4") - rate("C3"))) < 1e-12)
		assert.ok(Math.abs(decomposition.mood[0].value - (rate("C3") - rate("C1"))) < 1e-12)
		assert.ok(Math.abs(decomposition.mood[1].value - (rate("C4") - rate("C2"))) < 1e-12)
		assert.ok(Math.abs(decomposition.interaction - (rate("C4") - rate("C3") - (rate("C2") - rate("C1")))) < 1e-12)
	})
})

describe("the command line", () => {
	it("generate-routing-round-fixtures.mjs --check finds the disk byte-identical", async () => {
		const { stdout } = await run("node", ["scripts/generate-routing-round-fixtures.mjs", "--check"], { cwd: ROOT })
		assert.match(stdout, /check: PASS/)
	})

	it("report-routing-round.mjs reports a clean sweep and exits 0", async () => {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), "routing-round-clean-"))
		await run("node", ["scripts/report-routing-round.mjs", "--write-synthetic", dir, "--scenario", "clean"], {
			cwd: ROOT,
		})
		const { stdout } = await run(
			"node",
			["scripts/report-routing-round.mjs", "--run-dir", dir, "--resamples", "200"],
			{
				cwd: ROOT,
			},
		)
		assert.match(stdout, /P1 — hit rate/)
		assert.match(stdout, /interval excludes 0/)
	})

	it("report-routing-round.mjs applies the clustering guard", async () => {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), "routing-round-clustered-"))
		await run("node", ["scripts/report-routing-round.mjs", "--write-synthetic", dir, "--scenario", "clustered"], {
			cwd: ROOT,
		})
		const { stdout } = await run(
			"node",
			["scripts/report-routing-round.mjs", "--run-dir", dir, "--resamples", "200"],
			{
				cwd: ROOT,
			},
		)
		assert.match(stdout, /CLUSTERED/)
		assert.match(stdout, /NOT ESTIMABLE/)
	})

	it("report-routing-round.mjs reports a batch that excludes 1% and exits 0", async () => {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), "routing-round-partial-"))
		await run("node", ["scripts/report-routing-round.mjs", "--write-synthetic", dir, "--scenario", "partial"], {
			cwd: ROOT,
		})
		const { stdout } = await run(
			"node",
			["scripts/report-routing-round.mjs", "--run-dir", dir, "--resamples", "200"],
			{ cwd: ROOT },
		)
		assert.match(stdout, /REPORTED WITH A FLAG/)
		assert.match(stdout, /1\.0%/)
		assert.doesNotMatch(stdout, /REFUSED/)
	})

	it("report-routing-round.mjs refuses a cell above 5% with exit 2", async () => {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), "routing-round-over-"))
		await run(
			"node",
			["scripts/report-routing-round.mjs", "--write-synthetic", dir, "--scenario", "over-exclusion"],
			{
				cwd: ROOT,
			},
		)
		await assert.rejects(
			run("node", ["scripts/report-routing-round.mjs", "--run-dir", dir, "--resamples", "200"], { cwd: ROOT }),
			(error) => {
				assert.equal(error.code, 2)
				assert.match(error.stdout, /REFUSED/)
				assert.match(error.stdout, /6\.0%/)
				return true
			},
		)
	})
})

describe("the executor (run-routing-round.mjs)", () => {
	it("--dry-run writes 600 prompts and a plan copy, and no results file", async () => {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), "routing-round-dry-"))
		const { stdout } = await run("node", ["scripts/run-routing-round.mjs", "--dry-run", "--out", dir], {
			cwd: ROOT,
		})

		assert.match(stdout, /plan validation: runs 600\/600/)
		assert.match(stdout, /unique prompt hashes 6\/6/)
		const prompts = await fs.readdir(path.join(dir, "prompts"))
		assert.equal(prompts.length, 600, "600 prompt files")
		assert.equal(
			await read("plan.json"),
			await fs.readFile(path.join(dir, "plan.json"), "utf-8"),
			"the plan copy is byte-identical",
		)
		await assert.rejects(fs.readFile(path.join(dir, "results.jsonl"), "utf-8"), "no results file on a dry-run")

		// Every written prompt hashes to the plan's own claim.
		const plan = JSON.parse(await read("plan.json"))
		const first = plan.runs[0]
		const text = await fs.readFile(path.join(dir, first.prompt), "utf-8")
		assert.equal(sha256(text), first.promptSha256)
	})

	it("--limit 3 executes exactly three runs through the stub runner", async () => {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), "routing-round-limit-"))
		const { runner } = await writeStubRunner(dir)
		const out = path.join(dir, "run")
		const { stdout } = await run(
			"node",
			[
				"scripts/run-routing-round.mjs",
				"--run",
				"--out",
				out,
				"--model",
				"stub",
				"--runner",
				runner,
				"--limit",
				"3",
			],
			{ cwd: ROOT },
		)
		assert.match(stdout, /tally: RUN 3 \/ UNRUN 0 \/ INVALID 0/)
		const records = (await fs.readFile(path.join(out, "results.jsonl"), "utf-8")).trim().split("\n").map(JSON.parse)
		assert.equal(records.length, 3, "exactly three runs executed")
		assert.deepEqual(
			records.map((record) => record.runId),
			["CELL-4-d001", "CELL-1-d001", "CELL-3-d001"],
			"the first three plan entries, in plan order",
		)
		for (const record of records) {
			assert.equal(record.status, "RUN")
			assert.equal(record.runnerStatus, "RUN")
			assert.equal(record.parserVersion, PARSER_VERSION)
			assert.equal(record.promptSha256.length, 64)
			assert.ok(record.transcript && record.transcript.sha256.length === 64, "transcript hash recorded")
			assert.equal(record.finishReason, null, "no sidecar, no finish reason")
			assert.equal(typeof record.response, "string")
			assert.equal(record.index, records.indexOf(record) + 1)
		}
	})

	it("--only restricts execution to one label", async () => {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), "routing-round-only-"))
		const { runner } = await writeStubRunner(dir)
		const out = path.join(dir, "run")
		const key = await loadKey()
		const label = labelFor(key, "C3")
		await run(
			"node",
			[
				"scripts/run-routing-round.mjs",
				"--run",
				"--out",
				out,
				"--model",
				"stub",
				"--runner",
				runner,
				"--only",
				label,
				"--limit",
				"2",
			],
			{ cwd: ROOT },
		)
		const records = (await fs.readFile(path.join(out, "results.jsonl"), "utf-8")).trim().split("\n").map(JSON.parse)
		assert.equal(records.length, 2)
		assert.deepEqual(new Set(records.map((record) => record.label)), new Set([label]))
		assert.deepEqual(
			records.map((record) => record.draw),
			[1, 2],
			"the first two draws of that label, in plan order",
		)
	})

	it("turns a RUN whose finishReason is MAX_TOKENS into INVALID and keeps the runner verdict", async () => {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), "routing-round-trunc-"))
		const { runner } = await writeStubRunner(dir)
		const out = path.join(dir, "run")
		const { stdout } = await run(
			"node",
			[
				"scripts/run-routing-round.mjs",
				"--run",
				"--out",
				out,
				"--model",
				"stub",
				"--runner",
				runner,
				"--limit",
				"1",
			],
			{ cwd: ROOT, env: { ...process.env, STUB_FINISH_REASON: "MAX_TOKENS" } },
		)
		assert.match(stdout, /tally: RUN 0 \/ UNRUN 0 \/ INVALID 1/)
		const [record] = (await fs.readFile(path.join(out, "results.jsonl"), "utf-8"))
			.trim()
			.split("\n")
			.map(JSON.parse)
		assert.equal(record.status, "INVALID", "the truncation decides the status")
		assert.equal(record.runnerStatus, "RUN", "the runner's own verdict is preserved, not overwritten")
		assert.equal(record.finishReason, "MAX_TOKENS")
		assert.match(record.reason, /never a miss/)
		assert.equal(record.response, null, "a truncated run contributes no scorable text")
		assert.equal(record.maxOutputTokens, 4096, "the cap in force is recorded")
	})

	it("refuses to overwrite a run directory holding results without --force", async () => {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), "routing-round-force-"))
		const { runner } = await writeStubRunner(dir)
		const out = path.join(dir, "run")
		const args = [
			"scripts/run-routing-round.mjs",
			"--run",
			"--out",
			out,
			"--model",
			"stub",
			"--runner",
			runner,
			"--limit",
			"1",
		]
		await run("node", args, { cwd: ROOT })
		await assert.rejects(run("node", args, { cwd: ROOT }), (error) => {
			assert.equal(error.code, 2)
			assert.match(error.stderr, /Refusing to overwrite/)
			return true
		})
		const forced = await run("node", [...args, "--force"], { cwd: ROOT })
		assert.match(forced.stdout, /tally: RUN 1/)
	})

	it("refuses a plan that is not the 600-run registered plan", async () => {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), "routing-round-badplan-"))
		const plan = JSON.parse(await read("plan.json"))
		plan.runs = plan.runs.slice(0, 599)
		const planPath = path.join(dir, "plan.json")
		await fs.writeFile(planPath, `${JSON.stringify(plan, null, 2)}\n`, "utf-8")
		await assert.rejects(
			run("node", ["scripts/run-routing-round.mjs", "--dry-run", "--out", dir, "--plan", planPath], {
				cwd: ROOT,
			}),
			(error) => {
				assert.equal(error.code, 2)
				assert.match(error.stderr, /runs 599, expected 600/)
				return true
			},
		)
	})
})

describe("the Gemini runner's output cap", () => {
	it("defaults to 4096 tokens and states it in its usage text", async () => {
		const { stdout } = await run("node", ["scripts/lib/gemini-runner.mjs", "--help"], { cwd: ROOT })
		assert.match(stdout, /--max-output-tokens/)
		assert.match(stdout, /default 4096/)
		assert.match(stdout, /do not change it mid-run/)
	})

	it("refuses a malformed cap before any call is attempted", async () => {
		await assert.rejects(
			run("node", ["scripts/lib/gemini-runner.mjs", "a", "b", "c", "--max-output-tokens", "abc"], { cwd: ROOT }),
			(error) => {
				assert.equal(error.code, 1)
				assert.match(error.stderr, /--max-output-tokens must be an integer/)
				return true
			},
		)
	})
})
