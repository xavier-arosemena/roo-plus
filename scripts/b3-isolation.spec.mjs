/**
 * b3-isolation.spec.mjs — pins the E12 instrument without spending a call.
 *
 * WHAT IT PINS, AND WHAT IT NO LONGER PINS
 *   Everything here describes the instrument as Amendment 2 leaves it. Nothing
 *   asserts §3, which Amendment 2 withdraws: a green test for a void rule is a
 *   defect, not a safeguard, so the old condition-order assertion that encoded
 *   "8 conditions, A3 executed seventh" is gone rather than updated.
 *
 *   1. The seven fixtures are the registered derivations, proven by diffing bytes.
 *   2. P is a placebo: exactly two fields differ from A0.
 *   3. The plan is the Amendment 2 sequence, refuses A3, and interleaves repeats.
 *   4. The answer key exists, is sealed, and is a banned bundle token.
 *   5. §A2.2 is decidable from declared modes: every stop path is exercised.
 *   6. `MAX_TOKENS` (and any non-STOP reason) is enforced, not recorded.
 *   7. The rubric is Amendment 1's, and the echo string is one string.
 *   8. The bundle builder keeps the answer key, the plan and the maps out.
 *
 * Run with: node --test scripts/b3-isolation.spec.mjs
 */

import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { execFile } from "node:child_process"
import * as fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { promisify } from "node:util"

import { extractDeclaredMode, loadAnswerKey, runSequence } from "./lib/b3-sequence.mjs"
import { FRAME_DIR, PERSONAS, REGISTERED_B3P, parseRoomodes, pickerLine } from "./lib/framing-pretest.mjs"
import { loadPlan, planRunsFromPlan } from "./lib/framing-pretest-plan.mjs"
import { buildResultRecord, detectEcho, detectLanguage, readFinishReason } from "./lib/framing-pretest-results.mjs"
import { ECHO_LINE_FORM, RUBRIC_MD } from "./lib/scorer-rubric.mjs"
import { RUBRIC_LEAK_PATTERNS, findLeaks, findSealedFiles, isInside, isInsideBundle, shuffle } from "./lib/scorer-bundle-guards.mjs"

const run = promisify(execFile)
const ROOT = path.resolve(".")
const B3_DIR = path.join(FRAME_DIR, "b3-isolation")
const read = (name, dir = B3_DIR) => fs.readFile(path.join(dir, name), "utf-8")
const lines = (text) => text.split("\n")

function blockStarts(text) {
	const source = lines(text)
	const starts = []
	for (let i = 0; i < source.length; i++) if (/^ {2}- slug: /.test(source[i])) starts.push(i)
	return { source, starts }
}

function blocks(text) {
	const { source, starts } = blockStarts(text)
	return starts.map((start, index) => source.slice(start, index + 1 < starts.length ? starts[index + 1] : source.length))
}

function changedLines(before, after) {
	const a = lines(before)
	const b = lines(after)
	assert.equal(a.length, b.length, "fixtures under test are line-for-line comparable")
	return a.map((line, index) => (line === b[index] ? null : { line: index + 1, from: line, to: b[index] })).filter(Boolean)
}

describe("the seven E12 fixtures", () => {
	it("A0 and A5 are byte-identical copies of the two source fixtures", async () => {
		assert.equal(await read("A0.roomodes"), await read("axis-stance.roomodes", FRAME_DIR))
		assert.equal(await read("A5.roomodes"), await read("artefact.roomodes", FRAME_DIR))
	})

	it("parses to the registered mode counts", async () => {
		const expected = { "A0.roomodes": 45, "A1.roomodes": 45, "A2.roomodes": 45, "A3.roomodes": 47, "A5.roomodes": 47, "P.roomodes": 45, "C2.roomodes": 45 }
		for (const [name, count] of Object.entries(expected)) {
			assert.equal(parseRoomodes(await read(name), name).length, count, name)
		}
	})

	it("P changes exactly two fields versus A0 and nothing else", async () => {
		const changed = changedLines(await read("A0.roomodes"), await read("P.roomodes"))
		assert.deepEqual(
			changed.map((change) => [change.from, change.to]),
			[
				["  - slug: pricing-analyst", "  - slug: pricing-strategist"],
				["  - slug: career-coach", "  - slug: career-adviser"],
			],
		)
		// The comprehension mode is untouched, so P keeps A0's expected owner and
		// only the noise floor can move. The two renamed modes are non-engineering
		// and unrelated to the brief; neither is the comprehension mode or near it.
		const placebo = parseRoomodes(await read("P.roomodes"), "P")
		const slugs = placebo.map((mode) => mode.slug)
		assert.ok(slugs.includes("explain"), "P still contains the comprehension mode")
		assert.ok(!slugs.includes("career-coach") && !slugs.includes("pricing-analyst"))
		assert.equal(placebo.find((mode) => mode.slug === "career-adviser")?.name, "Career Coach", "only the slug moved")
	})

	it("A1 changes exactly two lines versus A0, and not the route line", async () => {
		const changed = changedLines(await read("A0.roomodes"), await read("A1.roomodes"))
		assert.deepEqual(
			changed.map((change) => [change.from, change.to]),
			[
				["  - slug: explain", "  - slug: explanation"],
				["    name: Explain", "    name: Explanation"],
			],
		)
		const a1 = lines(await read("A1.roomodes"))
		assert.ok(a1.some((line) => line.includes("Use when someone asks why code behaves")), "A1 keeps its own route line")
	})

	it("A2 equals A1 except for the comprehension mode's whenToUse, which is the artefact line", async () => {
		const a2 = lines(await read("A2.roomodes"))
		const changed = changedLines(await read("A1.roomodes"), await read("A2.roomodes"))
		assert.deepEqual(changed.map((change) => change.line), [60])
		const artefact = parseRoomodes(await read("A5.roomodes"), "A5")
		const explanation = artefact.find((mode) => mode.slug === "explanation")
		assert.equal(a2[changed[0].line - 1], `    whenToUse: ${explanation.whenToUse}`)
	})

	it("A3 appends exactly two neutral modes to A0, and its padding avoids explanation too", async () => {
		const a0 = await read("A0.roomodes")
		const a3 = await read("A3.roomodes")
		assert.ok(a3.startsWith(a0.trimEnd()), "A0's bytes are an unchanged prefix of A3")
		const added = blocks(a3).slice(45)
		assert.equal(added.length, 2)
		const parsed = parseRoomodes(added.flat().join("\n"), "A3-padding")
		for (const mode of parsed) {
			const visible = `${mode.slug} ${mode.name} ${mode.whenToUse}`.toLowerCase()
			for (const word of ["why", "explain", "explanation", "reason", "rationale", "structure", "evidence"]) {
				assert.ok(!visible.includes(word), `padding ${mode.slug} must not contain "${word}"`)
			}
		}
		for (const block of added) assert.ok(block.includes("      - read"), "padding carries the minimal group")
	})

	it("C2 is A0 with the mode blocks reversed and no field changed", async () => {
		const content = (text) =>
			blocks(text).map((block) =>
				block
					.filter((line) => line !== "")
					.join("\n")
					.concat("\n"),
			)
		const forward = content(await read("A0.roomodes"))
		const reversed = content(await read("C2.roomodes"))
		assert.deepEqual(reversed, [...forward].reverse())
	})
})

describe("the plan is Amendment 2's sequence", () => {
	const arms = async () => JSON.parse(await read("arms.json"))

	it("C1 is first, A0 is drawn three times, and the four not-run conditions are declared", async () => {
		const plan = await loadPlan("test-fixtures/frames/b3-isolation/arms.json")
		assert.deepEqual(plan.conditions.map((condition) => condition.id), ["C1", "A0", "A5", "P", "A1", "A2", "A4"])
		assert.equal(plan.conditions[0].brief.id, "B1")
		assert.equal(plan.conditions.find((condition) => condition.id === "A0").repetitions, 3)
		assert.deepEqual(plan.notRun.map((entry) => entry.id), ["A3", "C2"])
		for (const entry of plan.notRun) assert.match(entry.reason, /Amendment 2/)
	})

	it("materialises 45 prompts from 35 distinct ones, with no adjacent identical prompt", async () => {
		const plan = await loadPlan("test-fixtures/frames/b3-isolation/arms.json")
		const labelled = plan.conditions.map((condition, index) => ({ ...condition, frame: condition.id, label: `PICKER-${index + 1}` }))
		const runs = planRunsFromPlan(plan, labelled)
		assert.equal(runs.length, 45)
		const ids = runs.map((entry) => entry.runId)
		assert.deepEqual(ids.slice(0, 6), ["C1-P1-r1", "C1-P2-r1", "C1-P3-r1", "C1-P4-r1", "C1-P5-r1", "A0-P1-r1"])
		const promptKey = runs.map((entry) => `${entry.condition}/${entry.persona.id}/${entry.brief.text}`)
		for (let index = 1; index < promptKey.length; index++) {
			assert.notEqual(promptKey[index], promptKey[index - 1], `repeats must never be adjacent (${ids[index]})`)
		}
		assert.equal(new Set(promptKey).size, 35, "A0's three draws are the same prompt, not new cells")
	})

	it("refuses to execute A3, and refuses an unregistered brief id", async () => {
		await assert.rejects(
			() => loadPlan("test-fixtures/frames/b3-isolation/arms.json", { only: ["A3"] }),
			/condition A3 is marked not-run and cannot be executed: Amendment 2 §A2\.3/,
		)
		const plan = await arms()
		plan.conditions[0].briefId = "B9"
		const file = path.join(await fs.mkdtemp(path.join(os.tmpdir(), "plan-")), "p.json")
		await fs.writeFile(file, JSON.stringify(plan), "utf-8")
		await assert.rejects(() => loadPlan(file), /is not a registered brief/)
	})

	it("rejects an edited persona directive and a reworded registered brief", async () => {
		const writePlanFile = async (mutate) => {
			const plan = await arms()
			mutate(plan)
			const file = path.join(await fs.mkdtemp(path.join(os.tmpdir(), "plan-")), "p.json")
			await fs.writeFile(file, JSON.stringify(plan), "utf-8")
			return file
		}
		await assert.rejects(
			() => writePlanFile((plan) => (plan.personas[2].directive = "You write two short lines.")).then(loadPlan),
			/directive differs from the frozen E11 directive/,
		)
		await assert.rejects(
			() => writePlanFile((plan) => (plan.conditions[1].brief = "Why is this module organised like this?")).then(loadPlan),
			/not the registered text/,
		)
		await assert.rejects(
			() =>
				writePlanFile((plan) => {
					const a4 = plan.conditions.find((condition) => condition.id === "A4")
					a4.brief = "This module is structured the way it is. I want to understand the reasoning behind that."
				}).then(loadPlan),
			/not the registered text/,
			"A4's withdrawn paraphrase is refused; REGISTERED_B3P is the only accepted text",
		)
		assert.equal(REGISTERED_B3P.text, "Set out the reasons this module is arranged as it is.")
	})
})

describe("the sealed answer key", () => {
	it("keys every condition and brief, and carries E11's vector", async () => {
		const key = await loadAnswerKey()
		const owner = (condition) => key.owners.find((entry) => entry.condition === condition)
		assert.equal(owner("C1").owner, "debug")
		assert.equal(owner("C1").briefId, "B1")
		for (const condition of ["A0", "A4", "C2", "P"]) assert.equal(owner(condition).owner, "explain", condition)
		for (const condition of ["A1", "A2", "A5"]) assert.equal(owner(condition).owner, "explanation", condition)
		assert.deepEqual(
			key.e11ReferenceVector.map((entry) => `${entry.persona}:${entry.label}:${entry.declared ?? "null"}`),
			["P1:HELP:null", "P2:HELP:null", "P3:PLAUSIBLE:architecture-reviewer", "P4:MATCH:explain", "P5:HELP:null"],
		)
		assert.equal(key.personas.length, PERSONAS.length)
	})

	it("its name is a banned token and a sealed filename", () => {
		assert.ok(findLeaks("see answer-key.json for the owner").length > 0)
		assert.ok(findLeaks("the answer key is sealed").length > 0)
		assert.deepEqual(findSealedFiles([{ name: "answer-key.json", path: "case-01/answer-key.json" }]), ["case-01/answer-key.json"])
	})
})

describe("§A2.2 is decidable from declared modes alone", () => {
	const key = {
		instrument: "test",
		source: "test-key",
		personas: ["P1", "P2", "P3", "P4", "P5"],
		owners: [
			{ condition: "C1", briefId: "B1", owner: "debug" },
			{ condition: "A0", briefId: "B3", owner: "explain" },
			{ condition: "A5", briefId: "B3", owner: "explanation" },
			{ condition: "P", briefId: "B3", owner: "explain" },
			{ condition: "A1", briefId: "B3", owner: "explanation" },
			{ condition: "A2", briefId: "B3", owner: "explanation" },
			{ condition: "A4", briefId: "B3P", owner: "explain" },
		],
		e11ReferenceVector: [
			{ persona: "P1", label: "HELP", declared: null },
			{ persona: "P2", label: "HELP", declared: null },
			{ persona: "P3", label: "PLAUSIBLE", declared: "architecture-reviewer" },
			{ persona: "P4", label: "MATCH", declared: "explain" },
			{ persona: "P5", label: "HELP", declared: null },
		],
		replicationCriterion: { minAgreement: 4, minHelp: 2 },
	}
	const E11 = { P1: null, P2: null, P3: "architecture-reviewer", P4: "explain", P5: null }
	const vector = (declared) => {
		const result = {}
		for (const [index, persona] of key.personas.entries()) {
			const perPersona = typeof declared === "object" && declared !== null
			const value = Array.isArray(declared) ? declared[index] : perPersona ? declared[persona] : declared
			result[persona] = value === undefined ? null : value
		}
		return result
	}
	const observations = (spec) => {
		const cells = []
		const push = (condition, declared, repetitions = 1) => {
			for (let repetition = 1; repetition <= repetitions; repetition++) {
				for (const persona of key.personas) {
					const declaredMode = declared[persona]
					cells.push({
						condition,
						persona,
						repetition,
						declared: declaredMode,
						transcript: `${condition}/${persona}=${declaredMode ?? "HELP"}`,
					})
				}
			}
		}
		push("C1", spec.C1 ?? vector("debug"))
		push("A0", spec.A0 ?? vector(E11), 3)
		push("A5", spec.A5 ?? vector("explanation"))
		push("P", spec.P ?? vector(E11))
		push("A1", spec.A1 ?? vector(E11))
		push("A2", spec.A2 ?? vector(E11))
		push("A4", spec.A4 ?? vector(E11))
		return cells
	}
	const reasons = (spec) => runSequence({ key, observations: observations(spec) })

	it("step 0 stops with instrument-failure when C1 is not 5/5", () => {
		const report = reasons({ C1: vector(["debug", "explain", "debug", "debug", "debug"]) })
		assert.equal(report.reasonCode, "instrument-failure")
		assert.equal(report.stopStep, 0)
		assert.deepEqual(report.armsNotReached, ["M", "L", "X"])
	})

	it("step 1 stops with nondeterministic when two A0 draws differ", () => {
		const cells = observations({})
		const target = cells.find((cell) => cell.condition === "A0" && cell.persona === "P4" && cell.repetition === 2)
		target.transcript = "a different answer"
		const report = runSequence({ key, observations: cells })
		assert.equal(report.reasonCode, "nondeterministic")
		assert.equal(report.stopStep, 1)
	})

	it("step 2 stops with contrast-not-reproduced when A5 falls below 4/5", () => {
		const report = reasons({ A5: vector(["explanation", "explanation", "explain", null, null]) })
		assert.equal(report.reasonCode, "contrast-not-reproduced")
		assert.equal(report.stopStep, 2)
	})

	it("step 3 stops with no-noise-floor and reports the floor", () => {
		const report = reasons({ P: { ...E11, P5: "explain" } })
		assert.equal(report.reasonCode, "no-noise-floor")
		assert.equal(report.stopStep, 3)
		assert.equal(report.floor, 1)
		assert.deepEqual(report.floorMoves, [{ persona: "P5", baseline: null, placebo: "explain" }])
	})

	it("step 4 stops with not-replicated when HELP falls below 2", () => {
		// P must move with A0, or step 3 legitimately stops first: the procedure is
		// sequential and a later step is never reached after an earlier stop.
		const a0 = vector(["explain", "explain", "architecture-reviewer", "explain", "explain"])
		const report = reasons({ A0: a0, P: a0 })
		assert.equal(report.reasonCode, "not-replicated")
		assert.equal(report.stopStep, 4)
		assert.equal(report.steps.find((step) => step.id === "replication").helpCount, 0)
	})

	it("step 5 stops at the first matching arm and records later arms not run", () => {
		// Three helpers become key hits on A1's own owner (`explanation`) and P4, the
		// one persona that was already a key hit, stays one.
		const report = reasons({ A1: vector(["explanation", "explanation", "explanation", "explanation", null]) })
		assert.equal(report.reasonCode, "first-match")
		assert.equal(report.matchedCause, "M")
		assert.equal(report.matchedCondition, "A1")
		assert.deepEqual(report.armsNotReached, ["L", "X"])
		const m = report.steps.find((step) => step.id === "cause-M")
		assert.deepEqual(m.gains, ["P1", "P2", "P3"])
		assert.deepEqual(m.losses, [])
	})

	it("step 5 refuses an arm that gains three but loses a key hit", () => {
		const report = reasons({ A1: vector(["explanation", "explanation", "explanation", "explain", null]) })
		assert.equal(report.reasonCode, "N-unexplained")
		assert.equal(report.matchedCause, null)
		assert.equal(report.steps.find((step) => step.id === "cause-M").losses.length, 1)
		assert.deepEqual(report.armsNotReached, [])
	})

	it("step 6 reads N-unexplained when no arm matches", () => {
		const report = reasons({})
		assert.equal(report.reasonCode, "N-unexplained")
		assert.equal(report.stopStep, 5)
		assert.deepEqual(report.steps.map((step) => step.id), ["instrument-control", "determinism", "contrast", "noise-floor", "replication", "cause-M", "cause-L", "cause-X"])
	})
})

describe("readings from a transcript", () => {
	it("extractDeclaredMode: nothing declared is HELP, one slug is a declaration, two resolve to the last", () => {
		const slugs = ["explain", "debug", "explanation"]
		assert.deepEqual(extractDeclaredMode("Which do you mean?", slugs), { declared: null, slugsSeen: [], ambiguous: false })
		assert.equal(extractDeclaredMode("Use explain for this.", slugs).declared, "explain")
		const two = extractDeclaredMode("debug or explain", slugs)
		assert.equal(two.declared, "explain")
		assert.equal(two.ambiguous, true)
		assert.equal(extractDeclaredMode("explanation of the parser", slugs).declared, "explanation")
	})
})

describe("I-2 observations and the finish-reason gate", () => {
	const modes = [{ slug: "explain", name: "Explain", whenToUse: "Use when someone asks why code behaves as it does." }]
	const base = {
		run: {
			runId: "A0-P1-r1",
			condition: "A0",
			persona: PERSONAS[0],
			brief: { id: "B3", text: "Explain why this module is structured the way it is." },
			repetition: 1,
			catalogue: "PICKER-3",
			text: "prompt text",
		},
		opts: { model: "m", provider: "p", blindSeed: "s" },
		temperature: 0,
		repetitions: 3,
		modes,
	}

	it("detectLanguage refuses to guess from a non-Latin script", () => {
		assert.equal(detectLanguage(null), null)
		assert.equal(detectLanguage("The module is structured this way because of the parser."), "en")
		assert.equal(detectLanguage("这个模块这样组织是因为解析器"), "und")
		assert.equal(detectLanguage("12345 ---"), "und")
	})

	it("detectEcho requires the whole picker line, in the rubric's own rendering", () => {
		assert.equal(pickerLine({ slug: "slug", name: "Name", whenToUse: "routing line" }), ECHO_LINE_FORM)
		assert.ok(RUBRIC_MD.includes(ECHO_LINE_FORM), "the rubric states the same string the detector tests")
		assert.equal(detectEcho(`- explain — Explain — Use when someone asks why code behaves as it does.`, modes), true)
		assert.equal(detectEcho("explain — Explain — Use when someone asks why code behaves as it does.", modes), false)
		assert.equal(detectEcho("explain", modes), false)
		assert.equal(detectEcho(null, modes), false)
	})

	it("readFinishReason reads the last attempt of the sidecar, and null when absent", async () => {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), "finish-reason-"))
		assert.equal(await readFinishReason([dir], "A0-P1-r1"), null)
		await fs.writeFile(
			path.join(dir, "usage-A0-P1-r1.json"),
			JSON.stringify({ attempts: [{ finishReason: "RECITATION" }, { finishReason: "STOP" }] }),
			"utf-8",
		)
		assert.equal(await readFinishReason([dir], "A0-P1-r1"), "STOP")
	})

	it("enforces the finish-reason gate: a RUN that did not stop becomes INVALID", () => {
		const outcome = { status: "RUN", reason: null, exitCode: 0, transcript: { path: "t", bytes: 12, sha256: "abc" } }
		const record = buildResultRecord({
			...base,
			outcome,
			finishReason: "MAX_TOKENS",
			transcriptText: "- explain — Explain — Use when someone asks why code behaves as it does.",
		})
		// This assertion is only true because of the gate in buildResultRecord: delete
		// the gate and `status` is the runner's "RUN", so the test fails.
		assert.equal(record.status, "INVALID", "MAX_TOKENS must not be scored")
		assert.equal(record.runnerStatus, "RUN", "the runner's own verdict is preserved")
		assert.match(record.reason, /finishReason MAX_TOKENS is not STOP/)
		assert.equal(record.finishReason, "MAX_TOKENS")
		assert.equal(record.echoed, true)
		assert.equal(record.repetitions, 3)
	})

	it("leaves RUN/STOP, RUN/absent and INVALID inputs exactly as the runner reported them", () => {
		const record = (status, finishReason) =>
			buildResultRecord({ ...base, outcome: { status, reason: null, exitCode: 0 }, finishReason, transcriptText: "t" })
		assert.equal(record("RUN", "STOP").status, "RUN")
		assert.equal(record("RUN", null).status, "RUN")
		assert.equal(record("INVALID", "STOP").status, "INVALID")
		assert.equal(record("RUN", "SAFETY").status, "INVALID")
	})
})

describe("the rubric and the bundle guards", () => {
	it("is Amendment 1's rubric, with four owner levels and five categories", () => {
		for (const level of ["`MATCH`", "`PLAUSIBLE`", "`MISS`", "`NO_SELECTION`"]) assert.ok(RUBRIC_MD.includes(level), level)
		for (const category of ["`GOAL`", "`DELIVERABLE`", "`IMPLICIT`", "`BARE`", "`HELP`"]) {
			assert.ok(RUBRIC_MD.includes(`| ${category} |`), category)
		}
		assert.ok(RUBRIC_MD.includes("whose routing line most directly answers the brief"), "MATCH is anchored to the routing line")
		assert.ok(!/obvious owner|reader who knows nothing/.test(RUBRIC_MD), "the E2 failure mode is gone")
		assert.ok(!RUBRIC_MD.includes("MODE-X") && !RUBRIC_MD.includes("Blind-scoring rule"), "the parent blind-scoring rule is gone")
		assert.ok(!RUBRIC_MD.includes("| **B1** |") && !RUBRIC_MD.includes("| Brief | Pass | Fail |"), "the parent task rubric is gone")
		assert.ok(RUBRIC_MD.includes("This bundle scores routing only; no answer text is being judged."))
		assert.ok(RUBRIC_MD.includes("not scored as correctness"), "objection 16's softened claim")
		assert.ok(RUBRIC_MD.includes("two stated framings") || RUBRIC_MD.includes("`two_framings`"), "the two-framings tie-break")
	})

	it("is leak-free once the frozen noun `artefact` is allowed", () => {
		assert.deepEqual(findLeaks(RUBRIC_MD, "rubric.md", RUBRIC_LEAK_PATTERNS), [])
		assert.ok(findLeaks(RUBRIC_MD, "rubric.md").length > 0, "the strict check still flags the frozen noun, which is why the narrowed list exists")
	})

	it("guards the map and the bundle locations", () => {
		assert.equal(isInsideBundle("/tmp/out/bundle-A"), true)
		assert.equal(isInsideBundle("/tmp/out/scoring"), false)
		assert.equal(isInside("/tmp/run/scoring", "/tmp/run"), true)
		assert.equal(isInside("/tmp/run-scoring", "/tmp/run"), false)
		assert.notDeepEqual(shuffle([{ runId: "a" }, { runId: "b" }], "s"), undefined)
	})
})

describe("the bundle builder keeps the seal", () => {
	async function syntheticRun({ truncatedRun = null } = {}) {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), "e12-run-"))
		await fs.mkdir(path.join(dir, "prompts"), { recursive: true })
		await fs.mkdir(path.join(dir, "transcripts"), { recursive: true })
		const runs = []
		const results = []
		for (let index = 1; index <= 35; index++) {
			const runId = `r${String(index).padStart(2, "0")}`
			runs.push({ runId })
			await fs.writeFile(path.join(dir, "prompts", `${runId}.txt`), "- response-writer — Response Writer — Use when a response is needed.\n", "utf-8")
			await fs.writeFile(path.join(dir, "transcripts", `${runId}.txt`), `answer ${index}\n`, "utf-8")
			const truncated = truncatedRun === index
			results.push({ runId, status: "RUN", finishReason: truncated ? "MAX_TOKENS" : "STOP" })
		}
		await fs.writeFile(path.join(dir, "plan.json"), JSON.stringify({ runs }, null, 2), "utf-8")
		await fs.writeFile(path.join(dir, "results.jsonl"), results.map((record) => JSON.stringify(record)).join("\n") + "\n", "utf-8")
		await fs.writeFile(path.join(dir, "answer-key.json"), JSON.stringify({ sealed: true }), "utf-8")
		return dir
	}

	const build = (runDir, out) =>
		run("node", ["scripts/build-scorer-bundle.mjs", "--run", runDir, "--out", out], { cwd: ROOT }).then(
			(result) => ({ code: 0, stdout: result.stdout }),
			(error) => ({ code: error.code, stdout: error.stdout ?? "", stderr: error.stderr ?? "" }),
		)

	it("writes 35 base cases plus 5 duplicates per bundle, and no sealed file", async () => {
		const runDir = await syntheticRun()
		const out = path.join(await fs.mkdtemp(path.join(os.tmpdir(), "e12-out-")), "scoring")
		const { code } = await build(runDir, out)
		assert.equal(code, 0)
		for (const bundle of ["bundle-A", "bundle-B"]) {
			const cases = await fs.readdir(path.join(out, bundle))
			assert.equal(cases.length, 40, `${bundle} holds 35 base + 5 duplicates`)
			const files = []
			for (const caseId of cases) for (const name of await fs.readdir(path.join(out, bundle, caseId))) files.push(name)
			assert.deepEqual(findSealedFiles(files.map((name) => ({ name, path: name }))), [])
			assert.ok(files.every((name) => ["prompt.txt", "response.txt", "rubric.md"].includes(name)))
		}
		const maps = await fs.readdir(out)
		assert.ok(maps.includes("_case-maps.json") && maps.includes("_duplicate-map.json"))
		const duplicates = JSON.parse(await fs.readFile(path.join(out, "_duplicate-map.json"), "utf-8"))
		assert.equal(duplicates.sources.length, 5)
		assert.equal(duplicates.cases.A.length, 5)
		assert.equal(duplicates.cases.B.length, 5)
	})

	it("excludes a truncated run and refuses an output inside the run directory", async () => {
		const runDir = await syntheticRun({ truncatedRun: 7 })
		const out = path.join(await fs.mkdtemp(path.join(os.tmpdir(), "e12-out-")), "scoring")
		assert.equal((await build(runDir, out)).code, 0)
		const cases = await fs.readdir(path.join(out, "bundle-A"))
		assert.equal(cases.length, 39, "34 clean base cases + 5 duplicates")
		const inside = await build(runDir, path.join(runDir, "scoring-bundles"))
		assert.equal(inside.code, 2)
		assert.match(inside.stderr, /inside the run directory/)
	})
})
