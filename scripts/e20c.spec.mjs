/**
 * e20c.spec.mjs — pins the E20c material, its seals, its mechanical tallies and
 * the executor's plan-derived call total, without spending a call.
 *
 * WHAT IT PINS
 *   1. Line B measures 96 characters and is the closing round's IN line verbatim;
 *      the brief is the registered 52-character string.
 *   2. The three arms are one 45-entry picker — `explain` at index 6 with the same
 *      line in all three — and each arm differs from the control X at exactly the
 *      two indices its swap involves: X/Y {22, 44}, X/Z {3, 44}, Y/Z {3, 22, 44}.
 *      X is byte-identical to the closing round's C1 picker, and index 44's
 *      original occupant is neither moved mode.
 *   3. The plan is 600 entries in the cycle `X Y Z` × 200, with exact 200/200/200
 *      counts, three distinct prompt hashes, and 599 transitions across 600 calls.
 *   4. The sealed key names `explain` for every arm and carries no line text; the
 *      label map names three arms and no arm letter is reachable from the key.
 *   5. The executor takes `e20/1` unchanged: `planShape` still returns "e20", the
 *      total is 600 from the plan, a 599-entry plan is refused against its own
 *      declared 600, and a dry-run writes 600 prompts and a byte-identical copy.
 *   6. The mechanical tally: exclusion, the longest identical verbatim run, the
 *      per-outcome declaration counts, and the gate's two verdicts.
 *
 * NO MODEL CALL IS POSSIBLE HERE
 *   Everything is read from disk or imported. The executor is driven with
 *   `--dry-run` and, where a batch is simulated, with a fake runner in-process.
 *
 * Run with: node --test scripts/e20c.spec.mjs
 */

import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { execFile } from "node:child_process"
import * as fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { promisify } from "node:util"

import {
	DEFAULT_E20C_BLIND_SEED,
	E20C_ARMS,
	E20C_BRIEF_TEXT,
	E20C_CYCLE,
	E20C_CYCLES,
	E20C_DIR,
	E20C_EXPLAIN_INDEX,
	E20C_LAST_INDEX,
	E20C_LINE,
	E20C_PICKER_LENGTH,
	E20C_REGISTERED_LINE_LENGTH,
	EXPLAIN_SLUG,
	armByLabel as armMapFromSeed,
	buildExperimentSet,
	buildRuns,
	changedIndices,
	expectedRuns,
	expectedSwapIndices,
	gateVerdict,
	labelArms,
	longestVerbatimRun,
	summariseRun,
	swapEntryBlocks,
} from "./lib/e20c.mjs"
import { parseRoomodes } from "./lib/framing-pretest.mjs"
import { LINE_IN, ROUTING_ROUND_DIR, assertInterleaved } from "./lib/routing-round.mjs"
import { planShape, registeredTotal } from "./run-routing-round.mjs"

const run = promisify(execFile)
const ROOT = path.resolve(".")

const read = (dir, name) => fs.readFile(path.join(dir, name), "utf-8")
const loadJson = async (dir, name) => JSON.parse(await read(dir, name))
const c1Text = () => fs.readFile(path.join(ROUTING_ROUND_DIR, "C1.roomodes"), "utf-8")

/** Arm id → arm letter, from the sealed map. The spec is allowed to read it. */
function armByLabel(labelMap) {
	return new Map(labelMap.arms.map((entry) => [entry.armId, entry.arm]))
}

const at = (second) => new Date(Date.UTC(2026, 10, 17, 9, 0, second)).toISOString()

function recordsFrom(entries) {
	return entries.map((entry, index) => ({
		runId: entry.runId,
		label: entry.label,
		startedAt: at(index * 12),
		endedAt: at(index * 12 + 5),
	}))
}

describe("the registered material", () => {
	it("uses a 96-character line B that is the closing round's IN line, and the 52-character brief", () => {
		assert.equal(E20C_LINE.length, 96)
		assert.equal(E20C_LINE.length, E20C_REGISTERED_LINE_LENGTH, "the measurement is the registration's")
		assert.equal(E20C_LINE, LINE_IN, "line B is the round's IN line, verbatim")
		assert.equal(E20C_BRIEF_TEXT, "Explain why this module is structured the way it is.")
		assert.equal(E20C_BRIEF_TEXT.length, 52)
	})

	it("registers three arms of 200 draws and the cycle X Y Z repeated 200 times", () => {
		assert.deepEqual(E20C_CYCLE, ["X", "Y", "Z"])
		assert.equal(E20C_CYCLES, 200)
		assert.deepEqual(
			E20C_ARMS.map((arm) => [arm.arm, arm.draws, arm.moved]),
			[
				["X", 200, null],
				["Y", 200, "documentation"],
				["Z", 200, "architecture-reviewer"],
			],
		)
		assert.equal(expectedRuns("E20c"), 600)
	})
})

describe("the E20c arms", () => {
	it("are one 45-entry picker with explain at index 6 and the same line in all three", async () => {
		const fixtureSet = buildExperimentSet({ experimentId: "E20c", baseText: await c1Text() })
		assert.equal(fixtureSet.arms.length, 3)
		assert.equal(fixtureSet.originalOccupant, "ai-cost-engineer", "index 44's original occupant")

		for (const arm of fixtureSet.arms) {
			assert.equal(arm.modes.length, E20C_PICKER_LENGTH)
			assert.equal(arm.position, E20C_EXPLAIN_INDEX)
			assert.equal(arm.modes[E20C_EXPLAIN_INDEX].slug, EXPLAIN_SLUG)
			assert.equal(arm.modes[E20C_EXPLAIN_INDEX].name, "Explain")
			assert.equal(arm.modes[E20C_EXPLAIN_INDEX].whenToUse, E20C_LINE, `${arm.arm}: the line never changes`)
			assert.equal(arm.modes.filter((mode) => mode.slug === EXPLAIN_SLUG).length, 1)
		}
	})

	it("differ from the control at exactly the two indices each swap involves", async () => {
		const fixtureSet = buildExperimentSet({ experimentId: "E20c", baseText: await c1Text() })
		const written = new Map()
		for (const arm of fixtureSet.arms) {
			written.set(arm.arm, parseRoomodes(await read(E20C_DIR, `${arm.arm}.roomodes`), `${arm.arm}.roomodes`))
		}

		const expected = { X: [], Y: [22, 44], Z: [3, 44] }
		for (const [arm, indices] of Object.entries(expected)) {
			assert.deepEqual(changedIndices(written.get("X"), written.get(arm)), indices, `X/${arm}`)
		}

		// Y and Z are two independent swaps against one control, so their own diff is
		// the union — three indices, not two. Stated rather than implied.
		assert.deepEqual(changedIndices(written.get("Y"), written.get("Z")), [3, 22, 44], "Y/Z")

		// Nothing outside the moved modes' origins and index 44 differs anywhere.
		assert.deepEqual(expectedSwapIndices(22), [22, E20C_LAST_INDEX])
		for (const arm of fixtureSet.arms) {
			for (let index = 0; index < E20C_PICKER_LENGTH; index++) {
				if ([3, 22, 44].includes(index)) continue
				assert.deepEqual(written.get(arm.arm)[index], written.get("X")[index], `${arm.arm} differs at ${index}`)
			}
		}
	})

	it("place the moved mode at index 44 and the displaced occupant at the moved mode's origin", async () => {
		const written = new Map()
		for (const arm of ["X", "Y", "Z"]) {
			written.set(arm, parseRoomodes(await read(E20C_DIR, `${arm}.roomodes`), `${arm}.roomodes`))
		}
		assert.equal(written.get("X")[E20C_LAST_INDEX].slug, "ai-cost-engineer")
		assert.equal(written.get("Y")[E20C_LAST_INDEX].slug, "documentation")
		assert.equal(written.get("Y")[22].slug, "ai-cost-engineer")
		assert.equal(written.get("Z")[E20C_LAST_INDEX].slug, "architecture-reviewer")
		assert.equal(written.get("Z")[3].slug, "ai-cost-engineer")
	})

	it("keep the control byte-identical to the closing round's C1 picker", async () => {
		assert.equal(await read(E20C_DIR, "X.roomodes"), await c1Text())
	})

	it("carry the registered brief verbatim in every prompt", async () => {
		const fixtureSet = buildExperimentSet({ experimentId: "E20c", baseText: await c1Text() })
		assert.equal(fixtureSet.brief.id, "B3")
		for (const arm of fixtureSet.arms) {
			assert.ok(arm.prompt.includes(E20C_BRIEF_TEXT), `${arm.arm}: the brief is in the prompt`)
		}
		assert.equal(new Set(fixtureSet.arms.map((arm) => arm.prompt)).size, 3, "three distinct prompts")
	})
})

describe("the swap machinery", () => {
	it("exchanges two blocks without resizing the picker or touching another entry", async () => {
		const base = await c1Text()
		const swapped = swapEntryBlocks(base, "documentation", "ai-cost-engineer")
		const before = parseRoomodes(base, "base")
		const after = parseRoomodes(swapped, "swapped")
		assert.equal(after.length, before.length)
		assert.deepEqual(changedIndices(before, after), [22, 44])
		assert.deepEqual([...after.map((mode) => mode.slug)].sort(), [...before.map((mode) => mode.slug)].sort())
	})

	it("refuses a self-swap, a missing slug and a length change", async () => {
		const base = await c1Text()
		assert.throws(() => swapEntryBlocks(base, "explain", "explain"), /cannot swap/)
		assert.throws(() => swapEntryBlocks(base, "no-such-mode", "explain"), /no entry with slug/)
		assert.throws(() => changedIndices([{ slug: "a" }], []), /different lengths/)
	})

	it("registers no arm whose moved mode is index 44's own occupant", () => {
		// The instruction's first pre-check, kept as a fact about the material: a
		// moved mode that already sits at 44 cannot be swapped, and the builder
		// refuses that case explicitly (see `buildExperimentSet`).
		for (const arm of E20C_ARMS) {
			assert.notEqual(arm.moved, "ai-cost-engineer", `${arm.arm}: index 44's occupant cannot be the moved mode`)
		}
	})
})

describe("the E20c plan", () => {
	it("holds 600 entries, the registered cycle verbatim, and three distinct prompts", async () => {
		const plan = await loadJson(E20C_DIR, "plan.json")
		assert.equal(plan.planSchema, "e20/1")
		assert.equal(plan.experiment, "E20c")
		assert.deepEqual(plan.cycle, ["X", "Y", "Z"], "the cycle is recorded verbatim")
		assert.equal(plan.cycles, 200)
		assert.deepEqual(plan.drawsPerArm, { X: 200, Y: 200, Z: 200 })
		assert.equal(plan.entries.length, 600)
		assert.equal(new Set(plan.entries.map((entry) => entry.promptSha256)).size, 3, "one prompt per arm")
	})

	it("records the swapped pair and nothing else about the manipulation", async () => {
		const plan = await loadJson(E20C_DIR, "plan.json")
		assert.equal(plan.swaps.X, null)
		assert.deepEqual(plan.swaps.Y, { moved: "documentation", replaced: "ai-cost-engineer", indices: [22, 44] })
		assert.deepEqual(plan.swaps.Z, {
			moved: "architecture-reviewer",
			replaced: "ai-cost-engineer",
			indices: [3, 44],
		})
		const text = JSON.stringify(plan)
		assert.ok(!text.includes(E20C_LINE), "no registered line text in the plan")
		assert.ok(!text.includes("expectedOwner"), "no sealed field in the plan")
	})

	it("counts exactly 200 per arm, never repeating an arm", async () => {
		const plan = await loadJson(E20C_DIR, "plan.json")
		const armOf = armByLabel(await loadJson(E20C_DIR, "_label-map.json"))
		const counts = new Map()
		for (const entry of plan.entries) {
			const arm = armOf.get(entry.label)
			assert.ok(arm, `the sealed map has no arm for label ${entry.label}`)
			counts.set(arm, (counts.get(arm) ?? 0) + 1)
		}
		assert.deepEqual(Object.fromEntries([...counts.entries()].sort()), { X: 200, Y: 200, Z: 200 })

		const arms = plan.entries.map((entry) => armOf.get(entry.label))
		assert.deepEqual(arms.slice(0, 9), ["X", "Y", "Z", "X", "Y", "Z", "X", "Y", "Z"])
		for (let index = 1; index < arms.length; index++) {
			assert.notEqual(arms[index], arms[index - 1], `entries ${index} and ${index + 1} share an arm`)
		}
	})

	it("yields 599 transitions across 600 calls", async () => {
		const plan = await loadJson(E20C_DIR, "plan.json")
		const summary = assertInterleaved(recordsFrom(plan.entries), (record) => record.label)
		assert.deepEqual(summary, { calls: 600, transitions: 599, expected: 599, maxConcurrency: 1 })
	})

	it("is the derivation, entry for entry", async () => {
		const plan = await loadJson(E20C_DIR, "plan.json")
		const fixtureSet = buildExperimentSet({ experimentId: "E20c", baseText: await c1Text() })
		const labelsByArm = labelArms("E20c", plan.blindSeed)
		const derived = buildRuns({ experimentId: "E20c", fixtureSet, labelsByArm })
		assert.equal(derived.length, plan.entries.length)
		for (const [index, entry] of derived.entries()) {
			for (const field of ["runId", "label", "draw", "cyclePosition", "promptSha256", "promptBytes"]) {
				assert.equal(plan.entries[index][field], entry[field], `entry ${index + 1} ${field}`)
			}
		}
	})
})

describe("the sealed files", () => {
	it("name explain as the owner of every arm and share one vocabulary", async () => {
		const key = await loadJson(E20C_DIR, "answer-key.json")
		assert.equal(key.sealed, true)
		assert.equal(key.experiment, "E20c")
		assert.equal(key.slugVocabulary.length, 45)
		assert.equal(key.arms.length, 3)
		for (const arm of key.arms) {
			assert.equal(arm.expectedOwner, "explain")
			assert.ok(key.slugVocabulary.includes(arm.expectedOwner))
			assert.match(arm.armId, /^ARM-\d+$/)
		}
		assert.ok(!JSON.stringify(key).includes(E20C_LINE), "no line text in the key")
	})

	it("keep the arm id → arm letter mapping only in the sealed label map", async () => {
		const labelMap = await loadJson(E20C_DIR, "_label-map.json")
		assert.equal(labelMap.sealed, true)
		assert.equal(labelMap.blindSeed, DEFAULT_E20C_BLIND_SEED)
		assert.deepEqual(
			labelMap.arms.map((entry) => entry.arm).sort(),
			["X", "Y", "Z"],
		)
		for (const entry of labelMap.arms) assert.match(entry.armId, /^ARM-\d+$/)
	})
})

describe("the executor takes the third plan without a new shape", () => {
	it("names e20/1 and derives 600 from the plan's own cycle", async () => {
		const plan = await loadJson(E20C_DIR, "plan.json")
		assert.equal(planShape(plan), "e20", "the e20/1 document shape is reused")
		assert.equal(registeredTotal(plan, "e20"), 600)
		assert.equal(registeredTotal({ ...plan, cycles: 3 }, "e20"), 9, "the total follows the plan's own cycle")
		assert.equal(registeredTotal({ ...plan, cycles: 0 }, "e20"), null, "an unusable total is null, not a guess")
	})

	it("refuses a plan that has lost one entry, naming its own registered total", async () => {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), "e20c-short-"))
		const plan = await loadJson(E20C_DIR, "plan.json")
		plan.entries = plan.entries.slice(0, 599)
		const planPath = path.join(dir, "plan.json")
		await fs.writeFile(planPath, `${JSON.stringify(plan, null, 2)}\n`, "utf-8")

		await assert.rejects(
			run("node", ["scripts/run-routing-round.mjs", "--dry-run", "--out", path.join(dir, "out"), "--plan", planPath], {
				cwd: ROOT,
			}),
			(error) => {
				assert.equal(error.code, 2)
				assert.match(error.stderr, /entries 599, expected 600 \(3-call cycle × 200\)/)
				return true
			},
		)
	})

	it("--dry-run writes 600 prompts, a byte-identical plan copy, and no results file", async () => {
		const out = await fs.mkdtemp(path.join(os.tmpdir(), "e20c-dry-"))
		const { stdout } = await run(
			"node",
			[
				"scripts/run-routing-round.mjs",
				"--dry-run",
				"--out",
				out,
				"--plan",
				"test-fixtures/frames/e20c/plan.json",
			],
			{ cwd: ROOT },
		)
		assert.match(stdout, /plan validation: runs 600\/600 · arms 3\/3/)
		assert.match(stdout, /unique prompt hashes 3\/3/)
		assert.equal((await fs.readdir(path.join(out, "prompts"))).length, 600)
		assert.equal(await fs.readFile(path.join(out, "plan.json"), "utf-8"), await read(E20C_DIR, "plan.json"))
		await assert.rejects(fs.readFile(path.join(out, "results.jsonl"), "utf-8"), "no results on a dry-run")
	})
})

describe("the mechanical tally", () => {
	const vocabulary = ["architecture-reviewer", "debug", "explain"]
	const labelsByArm = labelArms("E20c", DEFAULT_E20C_BLIND_SEED)
	const armOf = armMapFromSeed("E20c", DEFAULT_E20C_BLIND_SEED)
	const record = (arm, draw, response, status = "RUN") => ({
		runId: `${labelsByArm.get(arm)}-d${String(draw).padStart(3, "0")}`,
		label: labelsByArm.get(arm),
		status,
		response,
		startedAt: at(draw),
		endedAt: at(draw + 5),
	})

	const records = [
		record("X", 1, "**Mode:** `explain`"),
		record("X", 2, "**Selected Mode:** `architecture-reviewer`"),
		record("X", 3, "I need more context before choosing."),
		record("Y", 1, "**Mode:** `explain`"),
		record("Y", 2, null, "INVALID"),
		record("Z", 1, "**Mode:** `debug`"),
		record("Z", 2, "**Mode:** `debug`"),
		record("Z", 3, "**Mode:** `debug`"),
		record("Z", 4, "**Mode:** `explain`"),
	]

	it("counts exclusion, verbatim runs and each named outcome per arm", () => {
		const summary = summariseRun({ records, armOf, vocabulary, outcomes: ["explain", "architecture-reviewer"] })
		const byArm = new Map(summary.arms.map((row) => [row.arm, row]))

		const x = byArm.get("X")
		assert.equal(x.records, 3)
		assert.equal(x.excluded, 0)
		assert.equal(x.exclusionRate, 0)
		assert.equal(x.declared.explain, 1)
		assert.equal(x.declared["architecture-reviewer"], 1)
		assert.equal(x.undetermined, 1)
		assert.equal(x.longestVerbatimRun, 1)

		const y = byArm.get("Y")
		assert.equal(y.records, 2)
		assert.equal(y.scorable, 1)
		assert.equal(y.excluded, 1)
		assert.equal(y.exclusionRate, 0.5)

		const z = byArm.get("Z")
		assert.equal(z.longestVerbatimRun, 3, "three identical consecutive draws")
		assert.equal(z.declared.debug ?? 0, 0, "debug is not one of the named outcomes")
		assert.equal(z.declared.explain, 1)

		assert.equal(summary.overall.records, 9)
		assert.equal(summary.overall.excluded, 1)
	})

	it("measures the longest identical verbatim run", () => {
		assert.equal(longestVerbatimRun([]), 0)
		assert.equal(longestVerbatimRun(["a"]), 1)
		assert.equal(longestVerbatimRun(["a", "a", "b", "a"]), 2)
		assert.equal(longestVerbatimRun(["a", "a", "a", "a", "a", "a"]), 6)
	})

	it("passes the gate inside 5% and 5, and refuses beyond either", () => {
		const inside = [
			{ arm: "X", records: 20, excluded: 1, exclusionRate: 0.05, longestVerbatimRun: 5 },
			{ arm: "Y", records: 20, excluded: 0, exclusionRate: 0, longestVerbatimRun: 1 },
		]
		assert.deepEqual(gateVerdict(inside), { passed: true, failures: [] })

		const overExclusion = [{ arm: "Z", records: 20, excluded: 2, exclusionRate: 0.1, longestVerbatimRun: 1 }]
		const exclusionVerdict = gateVerdict(overExclusion)
		assert.equal(exclusionVerdict.passed, false)
		assert.match(exclusionVerdict.failures[0], /Z: exclusion 10\.0% \(2\/20\)/)

		const clustered = [{ arm: "Y", records: 20, excluded: 0, exclusionRate: 0, longestVerbatimRun: 6 }]
		const clusterVerdict = gateVerdict(clustered)
		assert.equal(clusterVerdict.passed, false)
		assert.match(clusterVerdict.failures[0], /verbatim run 6 exceeds the registered 5/)
	})
})
