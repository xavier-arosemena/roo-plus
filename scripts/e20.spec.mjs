/**
 * e20.spec.mjs — pins the E20 and E20b material, and the executor's plan-derived
 * call total, without spending a call.
 *
 * WHAT IT PINS
 *   1. The three registered lines measure 50 / 96 / 99 characters, B is the closing
 *      round's IN line verbatim, and C is three characters longer than B (§2.1, §2.2).
 *   2. The three E20 arms are one 45-entry picker — `explain` at index 6 — apart from
 *      that one line, proven by diffing the parsed `.roomodes` objects. The B arm is
 *      the closing round's C1 picker byte for byte.
 *   3. The plan is 900 entries in the Amendment-1 cycle `A B C B C B C B C` × 100,
 *      with exact counts 100 / 400 / 400 and 899 transitions across 900 calls. The
 *      interleaving assertion is exercised, not assumed: it must accept a nine-call
 *      cycle and still refuse a blocked order.
 *   4. E20b is 200 entries alternating `P1 P45`, `explain` first in one arm and last
 *      in the other, line B in both.
 *   5. Both answer keys are sealed, name `explain` as the owner of every arm, and
 *      carry no field that reveals which arm is which beyond the arm id.
 *   6. The executor takes the expected total from the plan (§Amendment 1 §7): a
 *      899-entry E20 plan is refused against its own declared 900, and the full-set
 *      interleaving proof fires on the plan's total, not on a constant.
 *
 * NO MODEL CALL IS POSSIBLE HERE
 *   Everything is read from disk or imported. The executor is driven with a fake
 *   runner in-process, exactly as the closing round's spec drives it.
 *
 * Run with: node --test scripts/e20.spec.mjs
 */

import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { execFile } from "node:child_process"
import * as fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { promisify } from "node:util"

import {
	E20B_CYCLE,
	E20B_DIR,
	E20_CYCLE,
	E20_DIR,
	E20_LINES,
	E20_REGISTERED_LINE_LENGTHS,
	EXPLAIN_INDEX_E20,
	EXPLAIN_SLUG,
	buildExperimentSet,
	buildRuns,
	expectedRuns,
	labelArms,
	measuredLineLengths,
	moveEntryToIndex,
} from "./lib/e20.mjs"
import { parseRoomodes, sha256 } from "./lib/framing-pretest.mjs"
import { LINE_IN, ROUTING_ROUND_DIR, assertInterleaved, differingLineNumbers } from "./lib/routing-round.mjs"
import { executeSelected, planShape, registeredTotal } from "./run-routing-round.mjs"

const run = promisify(execFile)
const ROOT = path.resolve(".")

const read = (dir, name) => fs.readFile(path.join(dir, name), "utf-8")
const loadJson = async (dir, name) => JSON.parse(await read(dir, name))
const c1Text = () => fs.readFile(path.join(ROUTING_ROUND_DIR, "C1.roomodes"), "utf-8")

/** Arm id → arm letter, from the sealed map. The spec is allowed to read it. */
function armByLabel(labelMap) {
	return new Map(labelMap.arms.map((entry) => [entry.armId, entry.arm]))
}

function countsByArm(entries, armOf) {
	const counts = new Map()
	for (const entry of entries) {
		const arm = armOf.get(entry.label)
		assert.ok(arm, `the sealed map has no arm for label ${entry.label}`)
		counts.set(arm, (counts.get(arm) ?? 0) + 1)
	}
	return counts
}

const at = (second) => new Date(Date.UTC(2026, 10, 16, 9, 0, second)).toISOString()

/**
 * Records shaped so `assertInterleaved` can read them: sorted by `startedAt`, one
 * call in flight, labels taken from the plan in plan order.
 */
function recordsFrom(entries) {
	return entries.map((entry, index) => ({
		runId: entry.runId,
		label: entry.label,
		startedAt: at(index * 10),
		endedAt: at(index * 10 + 5),
	}))
}

describe("the registered lines", () => {
	it("measure 50, 96 and 99 characters, and B is the closing round's IN line", () => {
		const measured = measuredLineLengths()
		assert.deepEqual(measured, { A: 50, B: 96, C: 99 })
		assert.deepEqual(measured, E20_REGISTERED_LINE_LENGTHS, "the measurement is the registration's")
		assert.equal(E20_LINES.B, LINE_IN, "arm B is the round's IN line, verbatim")
		assert.match(E20_LINES.A, /^Use when someone asks why code behaves as it does\.$/)
		assert.match(E20_LINES.C, /must not merely describe the code\.$/)
		assert.equal(measured.C - measured.B, 3, "the primary contrast is length-matched at 3 characters")
	})
})

describe("the E20 arms", () => {
	it("are one 45-entry picker with explain at index 6, differing only at that line", async () => {
		const fixtureSet = buildExperimentSet({ experimentId: "E20", baseText: await c1Text() })
		assert.equal(fixtureSet.arms.length, 3)

		for (const arm of fixtureSet.arms) {
			assert.equal(arm.modes.length, 45, `${arm.arm} entry count`)
			assert.equal(arm.position, EXPLAIN_INDEX_E20)
			assert.equal(arm.modes[EXPLAIN_INDEX_E20].slug, EXPLAIN_SLUG)
			assert.equal(arm.modes[EXPLAIN_INDEX_E20].name, "Explain")
			assert.equal(arm.modes[EXPLAIN_INDEX_E20].whenToUse, E20_LINES[arm.lineKey])
			assert.equal(
				arm.modes.filter((mode) => mode.slug === EXPLAIN_SLUG).length,
				1,
				`${arm.arm}: explain appears once`,
			)
		}

		// The diff is on the written files, not only on the derivation object.
		const written = new Map()
		for (const arm of fixtureSet.arms) {
			written.set(arm.arm, parseRoomodes(await read(E20_DIR, `${arm.arm}.roomodes`), `${arm.arm}.roomodes`))
		}
		for (const left of ["A", "B", "C"]) {
			for (const right of ["A", "B", "C"]) {
				if (left >= right) continue
				const a = written.get(left)
				const b = written.get(right)
				assert.equal(a.length, b.length)
				for (let index = 0; index < a.length; index++) {
					if (index === EXPLAIN_INDEX_E20) continue
					assert.deepEqual(a[index], b[index], `${left}/${right} differ at entry ${index}`)
				}
				assert.equal(a[EXPLAIN_INDEX_E20].slug, b[EXPLAIN_INDEX_E20].slug)
				assert.equal(a[EXPLAIN_INDEX_E20].name, b[EXPLAIN_INDEX_E20].name)
				assert.notEqual(
					a[EXPLAIN_INDEX_E20].whenToUse,
					b[EXPLAIN_INDEX_E20].whenToUse,
					`${left}/${right}: the whenToUse line is the manipulation`,
				)
			}
		}
	})

	it("keep the B arm byte-identical to the closing round's C1 picker", async () => {
		const base = await c1Text()
		const armB = await read(E20_DIR, "B.roomodes")
		assert.equal(armB, base, "the IN cell's picker is the closing round's")

		for (const arm of ["A", "C"]) {
			const derived = await read(E20_DIR, `${arm}.roomodes`)
			assert.deepEqual(differingLineNumbers(base, derived), [60], `${arm} changes the whenToUse line only`)
		}
	})

	it("carry the registered brief verbatim in every arm", async () => {
		const fixtureSet = buildExperimentSet({ experimentId: "E20", baseText: await c1Text() })
		assert.equal(fixtureSet.brief.id, "B3")
		assert.equal(fixtureSet.brief.text, "Explain why this module is structured the way it is.")
		for (const arm of fixtureSet.arms) {
			assert.ok(arm.prompt.includes(fixtureSet.brief.text), `${arm.arm}: the brief is in the prompt`)
		}
	})
})

describe("the E20 plan", () => {
	it("holds 900 entries, the registered cycle verbatim, and three distinct prompts", async () => {
		const plan = await loadJson(E20_DIR, "plan.json")
		assert.equal(plan.planSchema, "e20/1")
		assert.equal(plan.experiment, "E20")
		assert.deepEqual(plan.cycle, E20_CYCLE)
		assert.deepEqual(plan.cycle, ["A", "B", "C", "B", "C", "B", "C", "B", "C"], "the cycle is recorded verbatim")
		assert.equal(plan.cycles, 100)
		assert.deepEqual(plan.drawsPerArm, { A: 100, B: 400, C: 400 })
		assert.equal(plan.entries.length, 900)
		assert.equal(expectedRuns("E20"), 900)
		assert.equal(new Set(plan.entries.map((entry) => entry.promptSha256)).size, 3, "one prompt per arm")
	})

	it("counts exactly 100 / 400 / 400 and never repeats an arm", async () => {
		const plan = await loadJson(E20_DIR, "plan.json")
		const armOf = armByLabel(await loadJson(E20_DIR, "_label-map.json"))
		const counts = countsByArm(plan.entries, armOf)
		assert.deepEqual(Object.fromEntries([...counts.entries()].sort()), { A: 100, B: 400, C: 400 })

		const arms = plan.entries.map((entry) => armOf.get(entry.label))
		for (let index = 1; index < arms.length; index++) {
			assert.notEqual(arms[index], arms[index - 1], `entries ${index} and ${index + 1} share an arm`)
		}
		assert.deepEqual(
			arms.slice(0, 18),
			["A", "B", "C", "B", "C", "B", "C", "B", "C", "A", "B", "C", "B", "C", "B", "C", "B", "C"],
			"the first 18 entries are the registered cycle twice",
		)
	})

	it("yields 899 transitions across 900 calls and every consecutive pair differs", async () => {
		const plan = await loadJson(E20_DIR, "plan.json")
		const summary = assertInterleaved(recordsFrom(plan.entries), (record) => record.label)
		assert.deepEqual(summary, { calls: 900, transitions: 899, expected: 899, maxConcurrency: 1 })
	})

	it("is refused by the interleaving assertion when one adjacent pair repeats", async () => {
		const plan = await loadJson(E20_DIR, "plan.json")
		// assertInterleaved sorts by timestamp, so the drift must live in the label
		// sequence that the timestamps describe — not in the array order alone.
		const labels = plan.entries.map((entry) => entry.label)
		;[labels[2], labels[3]] = [labels[3], labels[2]]
		const blocked = labels.map((label, index) => ({
			runId: `blocked-${index}`,
			label,
			startedAt: at(index * 10),
			endedAt: at(index * 10 + 5),
		}))
		assert.throws(
			() => assertInterleaved(blocked, (record) => record.label),
			/897 transitions across 900 calls, expected 899/,
			"a blocked nine-call cycle is not interleaved",
		)
	})

	it("is the derivation, entry for entry", async () => {
		const plan = await loadJson(E20_DIR, "plan.json")
		const fixtureSet = buildExperimentSet({ experimentId: "E20", baseText: await c1Text() })
		const labelsByArm = labelArms("E20", plan.blindSeed)
		const derived = buildRuns({ experimentId: "E20", fixtureSet, labelsByArm })
		assert.equal(derived.length, plan.entries.length)
		for (const [index, run] of derived.entries()) {
			const entry = plan.entries[index]
			for (const field of ["runId", "label", "draw", "cyclePosition", "promptSha256", "promptBytes"]) {
				assert.equal(entry[field], run[field], `entry ${index + 1} ${field}`)
			}
		}
	})
})

describe("the E20b plan", () => {
	it("holds 200 entries alternating P1 and P45, with explain first and last", async () => {
		const plan = await loadJson(E20B_DIR, "plan.json")
		const armOf = armByLabel(await loadJson(E20B_DIR, "_label-map.json"))
		assert.deepEqual(plan.cycle, E20B_CYCLE)
		assert.equal(plan.cycles, 100)
		assert.deepEqual(plan.drawsPerArm, { P1: 100, P45: 100 })
		assert.equal(plan.entries.length, 200)
		assert.equal(new Set(plan.entries.map((entry) => entry.promptSha256)).size, 2)

		const arms = plan.entries.map((entry) => armOf.get(entry.label))
		assert.deepEqual(
			arms.slice(0, 18),
			Array.from({ length: 18 }, (_, index) => (index % 2 === 0 ? "P1" : "P45")),
		)
		assert.deepEqual(Object.fromEntries(countsByArm(plan.entries, armOf)), { P1: 100, P45: 100 })
		assert.deepEqual(
			assertInterleaved(recordsFrom(plan.entries), (record) => record.label),
			{
				calls: 200,
				transitions: 199,
				expected: 199,
				maxConcurrency: 1,
			},
		)
	})

	it("keeps 45 entries and the same line, moving explain to index 0 and 44", async () => {
		const p1 = parseRoomodes(await read(E20B_DIR, "P1.roomodes"), "P1.roomodes")
		const p45 = parseRoomodes(await read(E20B_DIR, "P45.roomodes"), "P45.roomodes")
		assert.equal(p1.length, 45)
		assert.equal(p45.length, 45)
		assert.equal(p1[0].slug, EXPLAIN_SLUG, "P1 lists explain first")
		assert.equal(p45[44].slug, EXPLAIN_SLUG, "P45 lists explain last")
		assert.equal(p1[0].whenToUse, LINE_IN, "P1 uses line B")
		assert.equal(p45[44].whenToUse, LINE_IN, "P45 uses line B")

		// Same entries, different order: no field is rewritten by a position arm.
		const bySlug = new Map(p45.map((mode) => [mode.slug, mode]))
		for (const mode of p1) assert.deepEqual(bySlug.get(mode.slug), mode, `${mode.slug} differs between arms`)
	})

	it("moves an entry without touching a byte of it", async () => {
		const base = await c1Text()
		const moved = moveEntryToIndex(base, EXPLAIN_SLUG, 0)
		const baseLines = base.trimEnd().split("\n")
		const movedLines = moved.trimEnd().split("\n")
		assert.equal(movedLines.length, baseLines.length)
		// Everything below the moved block is the base's text, in order.
		assert.equal(moved.split("\n")[0], "customModes:")
		assert.deepEqual(
			parseRoomodes(moved, "moved")
				.map((mode) => mode.slug)
				.sort(),
			parseRoomodes(base, "base")
				.map((mode) => mode.slug)
				.sort(),
		)
	})
})

describe("the sealed files", () => {
	for (const [experimentId, dir, arms] of [
		["E20", E20_DIR, 3],
		["E20b", E20B_DIR, 2],
	]) {
		it(`${experimentId}: the answer key is sealed and names explain for every arm`, async () => {
			const key = await loadJson(dir, "answer-key.json")
			assert.equal(key.sealed, true)
			assert.match(key.warning, /SEALED ANALYSIS KEY/)
			assert.match(key.warning, /No scorer bundle may contain this file/)
			assert.equal(key.experiment, experimentId)
			assert.equal(key.arms.length, arms)
			for (const arm of key.arms) {
				assert.deepEqual(Object.keys(arm).sort(), ["armId", "expectedOwner"], "no field beyond the arm id")
				assert.match(arm.armId, /^ARM-\d+$/, "the arm id carries no arm letter")
				assert.equal(arm.expectedOwner, EXPLAIN_SLUG)
			}
			assert.equal(key.slugVocabulary.length, 45)
			for (const line of Object.values(E20_LINES)) {
				assert.ok(!JSON.stringify(key).includes(line), "no registered line text in the key")
			}
			assert.ok(!JSON.stringify(key).includes("whenToUse"))
		})

		it(`${experimentId}: the label map resolves every plan label to one arm`, async () => {
			const map = await loadJson(dir, "_label-map.json")
			const plan = await loadJson(dir, "plan.json")
			assert.equal(map.sealed, true)
			assert.equal(map.arms.length, arms)
			const labels = new Set(plan.entries.map((entry) => entry.label))
			assert.deepEqual(new Set(map.arms.map((entry) => entry.armId)), labels)
			assert.equal(new Set(map.arms.map((entry) => entry.arm)).size, arms)
		})
	}
})

describe("the generator", () => {
	it("--check finds every E20 and E20b file byte-identical", async () => {
		const { stdout } = await run("node", ["scripts/generate-e20-fixtures.mjs", "--check"], { cwd: ROOT })
		assert.match(stdout, /check: PASS — the disk matches the derivation/)
		for (const name of [
			"E20/A.roomodes",
			"E20/B.roomodes",
			"E20/C.roomodes",
			"E20/plan.json",
			"E20/answer-key.json",
			"E20/_label-map.json",
			"E20b/P1.roomodes",
			"E20b/P45.roomodes",
			"E20b/plan.json",
			"E20b/answer-key.json",
			"E20b/_label-map.json",
		]) {
			assert.match(stdout, new RegExp(`check ${name.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}\\s+byte-identical`))
		}
	})

	it("refuses an --out inside test-fixtures/", async () => {
		await assert.rejects(
			run("node", ["scripts/generate-e20-fixtures.mjs", "--out", "test-fixtures/frames/e20"], { cwd: ROOT }),
			(error) => {
				assert.equal(error.code, 2)
				assert.match(error.stderr, /may not point inside test-fixtures/)
				return true
			},
		)
	})
})

describe("the executor's plan-derived total", () => {
	it("reads E20's 900 and E20b's 200 from the plan, never from a constant", async () => {
		for (const [dir, experimentId, total] of [
			[E20_DIR, "E20", 900],
			[E20B_DIR, "E20b", 200],
		]) {
			const plan = await loadJson(dir, "plan.json")
			assert.equal(planShape(plan), "e20")
			assert.equal(registeredTotal(plan, "e20"), total)
			assert.equal(plan.entries.length, total)
			assert.equal(expectedRuns(experimentId), total)
		}

		const plan = await loadJson(E20_DIR, "plan.json")
		assert.equal(registeredTotal({ ...plan, cycles: 3 }, "e20"), 27, "the total follows the plan's own cycle")
		assert.equal(registeredTotal({ ...plan, cycles: 0 }, "e20"), null, "an unusable total is null, not a guess")
	})

	it("refuses an E20 plan that has lost one entry, naming its own registered total", async () => {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), "e20-short-"))
		const plan = await loadJson(E20_DIR, "plan.json")
		plan.entries = plan.entries.slice(0, 899)
		const planPath = path.join(dir, "plan.json")
		await fs.writeFile(planPath, `${JSON.stringify(plan, null, 2)}\n`, "utf-8")

		await assert.rejects(
			run(
				"node",
				["scripts/run-routing-round.mjs", "--dry-run", "--out", path.join(dir, "out"), "--plan", planPath],
				{
					cwd: ROOT,
				},
			),
			(error) => {
				assert.equal(error.code, 2)
				assert.match(error.stderr, /entries 899, expected 900 \(9-call cycle × 100\)/)
				return true
			},
		)
	})

	it("--dry-run writes 900 E20 prompts and 200 E20b prompts, and no results file", async () => {
		for (const [dir, planFile, total, hashes] of [
			[E20_DIR, "test-fixtures/frames/e20/plan.json", 900, 3],
			[E20B_DIR, "test-fixtures/frames/e20b/plan.json", 200, 2],
		]) {
			const out = await fs.mkdtemp(path.join(os.tmpdir(), "e20-dry-"))
			const { stdout } = await run(
				"node",
				["scripts/run-routing-round.mjs", "--dry-run", "--out", out, "--plan", planFile],
				{
					cwd: ROOT,
				},
			)
			assert.match(stdout, new RegExp(`plan validation: runs ${total}/${total}`))
			assert.match(stdout, new RegExp(`unique prompt hashes ${hashes}/${hashes}`))
			assert.equal((await fs.readdir(path.join(out, "prompts"))).length, total)
			assert.equal(
				await fs.readFile(path.join(out, "plan.json"), "utf-8"),
				await read(dir, "plan.json"),
				"the plan copy is byte-identical",
			)
			await assert.rejects(fs.readFile(path.join(out, "results.jsonl"), "utf-8"), "no results on a dry-run")

			// Every written prompt hashes to the plan's own claim.
			const plan = JSON.parse(await read(dir, "plan.json"))
			const sample = plan.entries[plan.entries.length - 1]
			assert.equal(sha256(await fs.readFile(path.join(out, sample.prompt), "utf-8")), sample.promptSha256)
		}
	})
})

describe("the full-set interleaving proof, gated on the plan's total", () => {
	const plannedRun = (index, label) => ({
		index,
		runId: `${label}-d${String(index).padStart(3, "0")}`,
		label,
		draw: index,
		briefId: "B3",
		promptSha256: "0".repeat(64),
		text: "prompt",
	})

	/** A fake runner: no transcript, no network, spans in plan order, no overlap. */
	function fakeRunner(count) {
		let next = 0
		return async () => {
			const startedAt = new Date(Date.UTC(2026, 10, 16, 10, 0, next * 10)).toISOString()
			const endedAt = new Date(Date.UTC(2026, 10, 16, 10, 0, next * 10 + 5)).toISOString()
			next++
			return { status: "RUN", reason: null, exitCode: 0, startedAt, endedAt, transcript: null }
		}
	}

	async function capture(fn) {
		const lines = []
		const original = console.log
		console.log = (...args) => lines.push(args.join(" "))
		try {
			return { value: await fn(), lines }
		} finally {
			console.log = original
		}
	}

	it("asserts 199 transitions across 200 calls when the batch is the registered total", async () => {
		const plan = await loadJson(E20B_DIR, "plan.json")
		const selected = plan.entries.map((entry, index) => plannedRun(index + 1, entry.label))
		const out = await fs.mkdtemp(path.join(os.tmpdir(), "e20-assert-"))

		const { lines } = await capture(() =>
			executeSelected({
				out,
				selected,
				opts: { model: "stub", only: null, usageDir: "" },
				runOnce: fakeRunner(selected.length),
				expectedRuns: registeredTotal(plan, "e20"),
			}),
		)
		assert.match(lines.join("\n"), /interleaving: 199 transitions across 200 calls \(expected 199\)/)
	})

	it("skips the proof on a short batch rather than inventing a total", async () => {
		const plan = await loadJson(E20B_DIR, "plan.json")
		const selected = plan.entries.slice(0, 4).map((entry, index) => plannedRun(index + 1, entry.label))
		const out = await fs.mkdtemp(path.join(os.tmpdir(), "e20-partial-"))

		const { lines } = await capture(() =>
			executeSelected({
				out,
				selected,
				opts: { model: "stub", only: null, usageDir: "" },
				runOnce: fakeRunner(selected.length),
				expectedRuns: registeredTotal(plan, "e20"),
			}),
		)
		assert.match(lines.join("\n"), /not asserted on a partial batch of 4 calls \(the registered total is 200\)/)
	})

	it("refuses a full-length batch whose labels repeat somewhere", async () => {
		const plan = await loadJson(E20B_DIR, "plan.json")
		const selected = plan.entries.map((entry, index) => plannedRun(index + 1, entry.label))
		const swapped = [selected[0], selected[1], selected[3], selected[2], ...selected.slice(4)]
		const out = await fs.mkdtemp(path.join(os.tmpdir(), "e20-blocked-"))
		const original = console.log
		console.log = () => {}
		try {
			// The per-record check is the early warning and fires first, naming the
			// call; the full-set proof is its replacement, not its duplicate.
			await assert.rejects(
				executeSelected({
					out,
					selected: swapped,
					opts: { model: "stub", only: null, usageDir: "" },
					runOnce: fakeRunner(swapped.length),
					expectedRuns: registeredTotal(plan, "e20"),
				}),
				/consecutive calls repeat label/,
			)
		} finally {
			console.log = original
		}
	})
})

describe("the plan shape", () => {
	it("names the closing round by its runs array and E20 by its schema", async () => {
		const closing = JSON.parse(await read(ROUTING_ROUND_DIR, "plan.json"))
		assert.equal(planShape(closing), "closed-round")
		assert.equal(registeredTotal(closing, "closed-round"), 600)
		assert.equal(planShape({ planSchema: "e20/1" }), "e20")
		assert.throws(() => planShape({ planSchema: "e99/1" }), /unknown planSchema/)
		assert.throws(() => planShape({}), /neither a planSchema nor a runs array/)
	})
})
