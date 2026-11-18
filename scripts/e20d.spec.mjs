/**
 * e20d.spec.mjs — pins Task C's material and the executor's handling of it,
 * without spending a call.
 *
 * WHAT IT PINS
 *   1. The brief is the 58-character task string; the two lines measure 96 and 99
 *      characters and are E20's registered B and C verbatim.
 *   2. Both pickers are E20's, byte for byte — checked against the files E20's own
 *      generator wrote — so the only thing that differs from E20 is the brief.
 *   3. Each prompt is E20's prompt with the brief exchanged and nothing else, the
 *      brief appears in no picker, and the arms differ only in explain's line.
 *   4. The plan is 400 entries in the cycle `B C` × 200 with exact 200/200 counts,
 *      two distinct prompt hashes, 399 transitions, no registered line text and no
 *      sealed field.
 *   5. The sealed key names `explain` for both arms, carries no line text, and the
 *      label map is the only place an arm letter lives.
 *   6. The executor takes `e20/1` unchanged: the total is 400 from the plan, a
 *      399-entry plan is refused, and a dry-run writes 400 prompts.
 *
 * NO MODEL CALL IS POSSIBLE HERE
 *   Everything is read from disk or imported; the executor is driven with --dry-run.
 *
 * Run with: node --test scripts/e20d.spec.mjs
 */

import { describe, it, before } from "node:test"
import assert from "node:assert/strict"
import { execFile } from "node:child_process"
import * as fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { promisify } from "node:util"

import {
	DEFAULT_E20D_BLIND_SEED,
	E20D_BRIEF_TEXT,
	E20D_CYCLE,
	E20D_CYCLES,
	E20D_DIR,
	E20D_ID,
	REGISTERED_LINES,
	buildExperimentSet,
	buildRuns,
	expectedRuns,
	labelArms,
} from "./lib/e20d.mjs"
import { E20_DIR, E20_LINES, EXPLAIN_SLUG, buildExperimentSet as buildE20ExperimentSet } from "./lib/e20.mjs"
import { ROUTING_ROUND_DIR, assertInterleaved } from "./lib/routing-round.mjs"
import { planShape, registeredTotal } from "./run-routing-round.mjs"

const run = promisify(execFile)
const ROOT = path.resolve(".")

const read = (dir, name) => fs.readFile(path.join(dir, name), "utf-8")
const loadJson = async (dir, name) => JSON.parse(await read(dir, name))
const c1Text = () => fs.readFile(path.join(ROUTING_ROUND_DIR, "C1.roomodes"), "utf-8")

let baseText
let fixtureSet
let labelsByArm
let runs
let plan
let key
let labelMap

before(async () => {
	baseText = await c1Text()
	fixtureSet = buildExperimentSet({ experimentId: E20D_ID, baseText })
	labelsByArm = labelArms(E20D_ID, DEFAULT_E20D_BLIND_SEED)
	runs = buildRuns({ experimentId: E20D_ID, fixtureSet, labelsByArm })
	plan = await loadJson(E20D_DIR, "plan.json")
	key = await loadJson(E20D_DIR, "answer-key.json")
	labelMap = await loadJson(E20D_DIR, "_label-map.json")
})

describe("the registered material", () => {
	it("uses the 58-character brief and E20's 96/99-character lines verbatim", () => {
		assert.equal(E20D_BRIEF_TEXT, "Why does this service depend on so many internal packages?")
		assert.equal(E20D_BRIEF_TEXT.length, 58)
		assert.equal(REGISTERED_LINES.B, E20_LINES.B)
		assert.equal(REGISTERED_LINES.C, E20_LINES.C)
		assert.equal(REGISTERED_LINES.B.length, 96)
		assert.equal(REGISTERED_LINES.C.length, 99)
	})

	it("registers two arms of 200 draws and the cycle B C repeated 200 times", () => {
		assert.deepEqual(E20D_CYCLE, ["B", "C"])
		assert.equal(E20D_CYCLES, 200)
		assert.equal(expectedRuns(E20D_ID), 400)
	})
})

describe("the E20d arms", () => {
	it("reproduce E20's B and C pickers byte for byte", async () => {
		const byArm = new Map(fixtureSet.arms.map((arm) => [arm.arm, arm]))
		for (const arm of ["B", "C"]) {
			const registered = await read(E20_DIR, `${arm}.roomodes`)
			assert.equal(byArm.get(arm).text, registered, `arm ${arm} is E20's picker`)
			assert.equal(await read(E20D_DIR, `${arm}.roomodes`), registered, `arm ${arm} on disk is E20's picker`)
		}
	})

	it("differ from each other only in explain's line, at index 6", () => {
		const [b, c] = fixtureSet.arms
		assert.equal(b.position, 6)
		assert.equal(c.position, 6)
		assert.equal(b.modes[b.position].slug, EXPLAIN_SLUG)
		assert.equal(b.modes[b.position].whenToUse, REGISTERED_LINES.B)
		assert.equal(c.modes[c.position].whenToUse, REGISTERED_LINES.C)
		for (let index = 0; index < b.modes.length; index++) {
			if (index === b.position) continue
			assert.deepEqual(c.modes[index], b.modes[index], `entry ${index} is shared`)
		}
	})

	it("carry the new brief, keep it out of the pickers, and change nothing else", async () => {
		const e20 = buildE20ExperimentSet({ experimentId: "E20", baseText })
		const e20ByArm = new Map(e20.arms.map((arm) => [arm.arm, arm]))
		for (const arm of fixtureSet.arms) {
			assert.equal(arm.picker.includes(E20D_BRIEF_TEXT), false, `the brief is not in the ${arm.arm} picker`)
			const source = e20ByArm.get(arm.arm)
			const substituted = source.prompt.replace(e20.brief.text, E20D_BRIEF_TEXT)
			assert.equal(arm.prompt, substituted, `${arm.arm} is E20's prompt with only the brief exchanged`)
			assert.equal(arm.prompt.split(arm.picker).length, 2, "the picker appears once")
		}
	})
})

describe("the plan", () => {
	it("is 400 entries in the cycle B C with exact 200/200 counts and two hashes", () => {
		assert.equal(plan.planSchema, "e20/1")
		assert.equal(plan.experiment, E20D_ID)
		assert.deepEqual(plan.cycle, ["B", "C"])
		assert.equal(plan.cycles, 200)
		assert.deepEqual(plan.drawsPerArm, { B: 200, C: 200 })
		assert.equal(plan.entries.length, 400)
		assert.equal(new Set(plan.entries.map((entry) => entry.promptSha256)).size, 2)

		const perLabel = new Map()
		for (const entry of plan.entries) perLabel.set(entry.label, (perLabel.get(entry.label) ?? 0) + 1)
		assert.deepEqual([...perLabel.values()].sort(), [200, 200])
	})

	it("records the brief verbatim with a matching sha256", async () => {
		const { sha256 } = await import("./lib/framing-pretest.mjs")
		assert.equal(plan.briefs.length, 1)
		assert.equal(plan.briefs[0].id, "D1")
		assert.equal(plan.briefs[0].text, E20D_BRIEF_TEXT)
		assert.equal(sha256(plan.briefs[0].text), plan.briefs[0].sha256)
	})

	it("carries no registered line text and no sealed field", async () => {
		const text = await read(E20D_DIR, "plan.json")
		assert.equal(text.includes(REGISTERED_LINES.B), false)
		assert.equal(text.includes(REGISTERED_LINES.C), false)
		for (const token of ["expectedOwner", "slugVocabulary", "sealed", "answerKey"]) {
			assert.equal(text.includes(token), false, `plan carries no ${token}`)
		}
	})

	it("is interleaved: consecutive labels differ across all 400 calls", () => {
		const records = runs.map((entry, index) => ({
			label: entry.label,
			startedAt: new Date(Date.UTC(2026, 10, 18, 9, 0, index * 12)).toISOString(),
			endedAt: new Date(Date.UTC(2026, 10, 18, 9, 0, index * 12 + 5)).toISOString(),
		}))
		const proof = assertInterleaved(records, (record) => record.label)
		assert.equal(proof.calls, 400)
		assert.equal(proof.transitions, 399)
		assert.equal(proof.maxConcurrency, 1)
	})
})

describe("the sealed files", () => {
	it("name explain for both arms and carry no line text", async () => {
		assert.equal(key.sealed, true)
		assert.equal(key.slugVocabulary.length, 45)
		assert.equal(key.slugVocabulary.includes(EXPLAIN_SLUG), true)
		assert.deepEqual(
			key.arms.map((arm) => arm.expectedOwner),
			["explain", "explain"],
		)
		const text = JSON.stringify(key)
		assert.equal(text.includes(REGISTERED_LINES.B), false)
		assert.equal(text.includes(REGISTERED_LINES.C), false)
	})

	it("keep the arm letters in the label map alone", async () => {
		assert.equal(labelMap.sealed, true)
		assert.deepEqual(
			labelMap.arms.map((arm) => arm.arm).sort(),
			["B", "C"],
		)
		const keyArms = new Set(key.arms.map((arm) => arm.armId))
		for (const arm of labelMap.arms) assert.equal(keyArms.has(arm.armId), true)
	})
})

describe("the executor", () => {
	it("reads e20/1 and derives the 400-call total from the plan", () => {
		assert.equal(planShape(plan), "e20")
		assert.equal(registeredTotal(plan, "e20"), 400)
	})

	it("refuses a plan with one entry removed against its own declared total", () => {
		const truncated = { ...plan, entries: plan.entries.slice(0, 399) }
		assert.equal(registeredTotal(truncated, "e20"), 400)
		assert.notEqual(truncated.entries.length, registeredTotal(truncated, "e20"))
	})

	it("writes 400 prompts and a byte-identical plan copy on a dry-run", async () => {
		const out = await fs.mkdtemp(path.join(os.tmpdir(), "e20d-spec-"))
		await run(
			process.execPath,
			[
				path.join(ROOT, "scripts", "run-routing-round.mjs"),
				"--dry-run",
				"--plan",
				path.join(E20D_DIR, "plan.json"),
				"--out",
				out,
			],
			{ cwd: ROOT },
		)
		const prompts = await fs.readdir(path.join(out, "prompts"))
		assert.equal(prompts.length, 400)
		const copied = await read(out, "plan.json")
		const original = await read(E20D_DIR, "plan.json")
		assert.equal(copied, original)

		const sample = await read(path.join(out, "prompts"), `${runs[0].runId}.txt`)
		assert.equal(sample.includes(E20D_BRIEF_TEXT), true)
		assert.equal(sample.includes(REGISTERED_LINES.B) || sample.includes(REGISTERED_LINES.C), true)

		await fs.rm(out, { recursive: true, force: true })
	})
})
