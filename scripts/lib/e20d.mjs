/**
 * e20d.mjs — Task C: does E20's headline effect travel to a second brief?
 *
 * WHAT THIS FILE IS
 *   A sibling of `lib/replication.mjs` that reuses `lib/e20.mjs` rather than
 *   re-deriving anything. The two arms are E20's B and C and their pickers are
 *   taken from `buildE20ExperimentSet`, so every single-field assertion E20 makes
 *   (registered line lengths 96/99, `explain` at index 6, a byte-identical B arm,
 *   one distinct prompt per arm) is made again for this run instead of retyped.
 *
 * THE ONE MANIPULATION, AND THE ONLY ONE
 *   The brief changes; the lines do not. The pickers are carried across
 *   unmodified, so the only difference between an E20 prompt and its E20d
 *   counterpart is the brief string. `buildExperimentSet` proves that by
 *   substituting the brief into E20's prompt and requiring the result to be
 *   byte-identical to the prompt it built — a picker that drifted, or a second
 *   text change hiding beside the brief, fails the build rather than becoming
 *   material for 400 paid calls.
 *
 *   B  Use when someone asks why code behaves as it does and the answer must cite evidence, not recall.
 *   C  Use when someone asks why code behaves as it does and the answer must not merely describe the code.
 *   brief  Why does this service depend on so many internal packages?
 *
 * THE PLAN
 *   Two arms, 200 draws each, cycle `B C` repeated 200 times = 400 calls, one call
 *   in flight, interleaved. `e20/1` is the DOCUMENT shape and is reused as-is; the
 *   executor selects this derivation by `plan.experiment === "E20d"`.
 *
 * WHY THE BRIEF IS A LOCAL CONSTANT RATHER THAN A `BRIEFS` ENTRY
 *   `BRIEFS` is the pretest's frozen §3.1 list and other material is built by
 *   iterating it; adding a fourth entry would silently change experiments that are
 *   already registered. The new brief therefore lives here, verbatim, and the plan
 *   records its own text and sha256 so the material is self-describing.
 *
 * WHAT IS DELIBERATELY NOT HERE
 *   No network, no provider protocol, no key, no `.env`, and no decision rule: the
 *   reading belongs to the report, not to the fixture generator.
 *
 * No dependencies. Node 22 ESM.
 */

import * as path from "node:path"

import { FRAME_DIR, assignLabels, buildPrompt, sha256 } from "./framing-pretest.mjs"
import {
	E20_LINES,
	EXPLAIN_INDEX_E20,
	EXPLAIN_SLUG,
	buildExperimentSet as buildE20ExperimentSet,
	measuredLineLengths,
} from "./e20.mjs"
import { TEMPERATURE } from "./routing-round.mjs"

export const E20D_ID = "E20d"
export const E20D_DIR = path.join(FRAME_DIR, "e20d")
export const E20D_PLAN_SCHEMA = "e20/1"

/**
 * There is no registration file for Task C: the design was fixed in the task
 * statement. This string is what the plan records as its provenance.
 */
export const E20D_REGISTRATION = "Task C — headline effect on a second brief (design fixed in the task statement)"

/** The new brief, verbatim. One brief for both arms. */
export const E20D_BRIEF_ID = "D1"
export const E20D_BRIEF_TEXT = "Why does this service depend on so many internal packages?"

/** The registered pair, taken from `e20.mjs` so the strings are never retyped here. */
export const E20D_ARMS = [
	{ arm: "B", draws: 200 },
	{ arm: "C", draws: 200 },
]

/** The registered lines, by key: byte-identical to E20's B and C. */
export const REGISTERED_LINES = { B: E20_LINES.B, C: E20_LINES.C }

/** `B C` repeated 200 times = 400 calls. */
export const E20D_CYCLE = ["B", "C"]
export const E20D_CYCLES = 200

/** Fixed so a repeated dry-run is byte-identical; recorded in the sealed label map. */
export const DEFAULT_E20D_BLIND_SEED = "roo-plus-e20d-2026-11-18"

export const E20D_SPEC = {
	id: E20D_ID,
	title: "E20d — artefact polarity on a second brief: B against C, interleaved",
	dir: E20D_DIR,
	cycle: E20D_CYCLE,
	cycles: E20D_CYCLES,
	defaultSeed: DEFAULT_E20D_BLIND_SEED,
	arms: E20D_ARMS,
}

export function experimentSpec(experimentId) {
	if (experimentId !== E20D_ID) {
		throw new Error(`this module builds only ${E20D_ID}; got ${JSON.stringify(experimentId)}`)
	}
	return E20D_SPEC
}

/** The plan's own registered total: the cycle, repeated. Never a module constant. */
export function expectedRuns(experimentId = E20D_ID) {
	const spec = experimentSpec(experimentId)
	return spec.cycle.length * spec.cycles
}

/** The brief as the prompt builder and the plan need it. */
export function e20dBrief() {
	return { id: E20D_BRIEF_ID, text: E20D_BRIEF_TEXT }
}

/** Literals only doctrine or grants could contribute. Zero of each is asserted. */
const FORBIDDEN_PROMPT_STRINGS = ["roleDefinition", "customInstructions", "groups:"]

function assertNoDoctrine(prompt, where) {
	for (const literal of FORBIDDEN_PROMPT_STRINGS) {
		if (prompt.includes(literal)) throw new Error(`${where}: doctrine literal ${JSON.stringify(literal)} in prompt`)
	}
}

/**
 * Derive the two arms from E20's registered material and rebuild each prompt with
 * the new brief. Throws on any violation: material that failed here must not run.
 */
export function buildExperimentSet({ experimentId, baseText }) {
	const spec = experimentSpec(experimentId)
	const source = buildE20ExperimentSet({ experimentId: "E20", baseText })
	const brief = e20dBrief()

	// The new brief must be a different prompt text from E20's, or the experiment
	// would be E20 run again under another name.
	if (brief.text === source.brief.text) {
		throw new Error("E20d's brief is E20's brief: the manipulation would be null")
	}
	// A registered line inside the brief would put arm text into a shared prompt.
	for (const [key, line] of Object.entries(REGISTERED_LINES)) {
		if (brief.text.includes(line)) throw new Error(`E20d's brief contains registered line ${key}`)
	}

	// The E20 line lengths are the registration's; E20 asserts this too, and the
	// assertion is repeated here so this module cannot be used with drifted lines.
	const measured = measuredLineLengths()
	if (measured.B !== 96 || measured.C !== 99) {
		throw new Error(`line lengths measured ${measured.B}/${measured.C}, expected E20's registered 96/99`)
	}

	const byArm = new Map(source.arms.map((arm) => [arm.arm, arm]))
	const arms = spec.arms.map((registered) => {
		const fixture = byArm.get(registered.arm)
		if (!fixture) throw new Error(`E20 has no arm ${JSON.stringify(registered.arm)}`)
		if (fixture.position !== EXPLAIN_INDEX_E20) {
			throw new Error(`E20 arm ${registered.arm} holds explain at ${fixture.position}, expected 6`)
		}

		// The picker is carried across, not rebuilt: the brief is not in it, and it
		// must not be.
		const picker = fixture.picker
		if (picker.includes(brief.text)) throw new Error(`E20d's brief appears inside the ${registered.arm} picker`)

		const prompt = buildPrompt(source.persona, brief, picker)

		// The only difference from E20's prompt is the brief, proven by substitution.
		const occurrences = fixture.prompt.split(source.brief.text).length - 1
		if (occurrences !== 1) {
			throw new Error(
				`E20's arm ${registered.arm} prompt holds its brief ${occurrences} times; ` +
					"the substitution proof needs exactly one",
			)
		}
		const substituted = fixture.prompt.replace(source.brief.text, brief.text)
		if (prompt.text !== substituted) {
			throw new Error(
				`E20d arm ${registered.arm}: the prompt is not E20's with only the brief exchanged — ` +
					"the picker or the persona moved as well, and a difference could not be attributed to the brief",
			)
		}
		if (prompt.text.split(picker).length !== 2) throw new Error(`${registered.arm}: picker does not appear exactly once`)
		assertNoDoctrine(prompt.text, registered.arm)

		return {
			arm: registered.arm,
			lineKey: registered.arm,
			position: fixture.position,
			text: fixture.text,
			modes: fixture.modes,
			picker,
			prompt: prompt.text,
			changedLines: fixture.changedLines,
			draws: registered.draws,
		}
	})

	// The arms differ in nothing but the explain line — E20's own property, re-asserted
	// against the fixture set this module returns.
	const [first, second] = arms
	if (arms.length !== 2) throw new Error(`E20d has ${arms.length} arms, expected 2`)
	if (first.modes.length !== 45) throw new Error(`the picker parsed ${first.modes.length} entries, expected 45`)
	for (let index = 0; index < first.modes.length; index++) {
		if (index === first.position) continue
		if (JSON.stringify(first.modes[index]) !== JSON.stringify(second.modes[index])) {
			throw new Error(
				`arms B and C differ at entry ${index} (${first.modes[index].slug}); the manipulation is the explain line`,
			)
		}
	}
	if (first.modes[first.position].whenToUse !== REGISTERED_LINES.B) throw new Error("arm B's line is not line B")
	if (second.modes[second.position].whenToUse !== REGISTERED_LINES.C) throw new Error("arm C's line is not line C")

	const hashes = new Set(arms.map((arm) => sha256(arm.prompt)))
	if (hashes.size !== arms.length) {
		throw new Error(`${E20D_ID}: ${hashes.size} distinct prompts, expected ${arms.length} (one per arm)`)
	}

	return { spec, persona: source.persona, brief, arms, baseModes: source.baseModes, source }
}

/**
 * Blind arm ids: ascending `sha256(arm + seed)`, the programme's algorithm. An id
 * carries no arm letter.
 */
export function labelArms(experimentId, seed = E20D_SPEC.defaultSeed) {
	const spec = experimentSpec(experimentId)
	const catalogues = new Map(
		spec.arms.map((arm) => [arm.arm, { frame: arm.arm, file: path.join(spec.dir, `${arm.arm}.roomodes`), modes: [] }]),
	)
	const labelled = assignLabels(seed, catalogues, "ARM-")
	return new Map(labelled.map((catalogue) => [catalogue.frame, catalogue.label]))
}

/** The inverse view the summaries need: blind label → arm letter. */
export function armByLabel(experimentId = E20D_ID, seed = E20D_SPEC.defaultSeed) {
	return new Map([...labelArms(experimentId, seed).entries()].map(([arm, label]) => [label, arm]))
}

/**
 * The runs in the registered cycle order: the cycle repeated, each occurrence of
 * an arm taking that arm's next draw number. Asserts the order it just built.
 */
export function buildRuns({ experimentId, fixtureSet, labelsByArm }) {
	const spec = experimentSpec(experimentId)
	const byArm = new Map(fixtureSet.arms.map((arm) => [arm.arm, arm]))
	const draws = new Map(spec.arms.map((arm) => [arm.arm, 0]))
	const runs = []

	for (let repeat = 1; repeat <= spec.cycles; repeat++) {
		for (const [offset, arm] of spec.cycle.entries()) {
			const fixture = byArm.get(arm)
			if (!fixture) throw new Error(`no picker for arm ${arm}`)
			const label = labelsByArm.get(arm)
			if (!label) throw new Error(`no blind label for arm ${arm}`)

			const draw = (draws.get(arm) ?? 0) + 1
			draws.set(arm, draw)
			const runId = `${label}-d${String(draw).padStart(3, "0")}`

			runs.push({
				index: runs.length + 1,
				runId,
				label,
				arm,
				draw,
				repeat,
				cyclePosition: offset + 1,
				briefId: fixtureSet.brief.id,
				persona: fixtureSet.persona.id,
				text: fixture.prompt,
				promptSha256: sha256(fixture.prompt),
				promptBytes: Buffer.byteLength(fixture.prompt, "utf8"),
			})
		}
	}

	assertCycle(runs, spec, labelsByArm)
	return runs
}

/**
 * The registered order, asserted from the runs: exact 200/200 counts, every
 * consecutive pair a different arm, and each run's label the one the cycle assigns.
 */
export function assertCycle(runs, spec, labelsByArm) {
	const expected = spec.cycle.length * spec.cycles
	if (runs.length !== expected) throw new Error(`plan has ${runs.length} runs, expected ${expected}`)

	const counts = new Map(spec.arms.map((arm) => [arm.arm, 0]))
	for (const [position, run] of runs.entries()) {
		const arm = spec.cycle[position % spec.cycle.length]
		if (run.arm !== arm) {
			throw new Error(`run ${position + 1} is arm ${run.arm}, expected ${arm}: the plan is not the registered cycle`)
		}
		if (run.label !== labelsByArm.get(arm)) {
			throw new Error(`run ${position + 1} carries label ${run.label}, expected ${labelsByArm.get(arm)}`)
		}
		if (position > 0 && runs[position - 1].label === run.label) {
			throw new Error(`runs ${position} and ${position + 1} share an arm: the plan is blocked`)
		}
		counts.set(arm, (counts.get(arm) ?? 0) + 1)
	}

	for (const arm of spec.arms) {
		if (counts.get(arm.arm) !== arm.draws) {
			throw new Error(`arm ${arm.arm} has ${counts.get(arm.arm)} runs, expected ${arm.draws}`)
		}
	}
	return true
}

/** The plan entry: no arm letter, no line, no owner — labels and hashes only. */
export function planEntry(run) {
	return {
		index: run.index,
		runId: run.runId,
		label: run.label,
		draw: run.draw,
		cyclePosition: run.cyclePosition,
		briefId: run.briefId,
		persona: run.persona,
		prompt: `prompts/${run.runId}.txt`,
		promptSha256: run.promptSha256,
		promptBytes: run.promptBytes,
	}
}

export function buildPlanDocument({ experimentId, fixtureSet, runs, seed }) {
	const spec = experimentSpec(experimentId)
	const brief = fixtureSet?.brief ?? e20dBrief()
	return {
		planSchema: E20D_PLAN_SCHEMA,
		instrument: spec.title,
		experiment: spec.id,
		registration: E20D_REGISTRATION,
		amendment: "Task C — one brief exchanged, both lines and the picker held",
		design:
			`${spec.arms.length} arms (${spec.arms.map((arm) => `${arm.arm} ${arm.draws}`).join(", ")}) = ` +
			`${runs.length} runs, cycle ${spec.cycle.join(" ")} repeated ${spec.cycles} times`,
		drawsPerArm: Object.fromEntries(spec.arms.map((arm) => [arm.arm, arm.draws])),
		cycle: [...spec.cycle],
		cycles: spec.cycles,
		temperature: TEMPERATURE,
		provider: null,
		model: null,
		blindSeed: seed,
		persona: { id: fixtureSet.persona.id, condition: fixtureSet.persona.condition, directive: fixtureSet.persona.directive },
		briefs: [{ id: brief.id, text: brief.text, sha256: sha256(brief.text) }],
		entries: runs.map(planEntry),
	}
}

/**
 * The sealed analysis key. Every arm's expected owner is `explain`; the key
 * carries no line text and no arm letter.
 */
export function buildAnswerKey({ experimentId, fixtureSet, labelsByArm }) {
	const spec = experimentSpec(experimentId)
	const vocabulary = [...fixtureSet.arms[0].modes.map((mode) => mode.slug)].sort()
	for (const arm of fixtureSet.arms.slice(1)) {
		if ([...arm.modes.map((mode) => mode.slug)].sort().join(",") !== vocabulary.join(",")) {
			throw new Error(`${arm.arm}: the arms do not share one slug vocabulary, so one shared list would be wrong`)
		}
	}
	return {
		sealed: true,
		warning:
			"SEALED ANALYSIS KEY — maps blind arm ids to their expected owner and the shared picker vocabulary. " +
			"No scorer bundle may contain this file.",
		registration: E20D_REGISTRATION,
		experiment: spec.id,
		slugVocabulary: vocabulary,
		arms: spec.arms.map((arm) => ({ armId: labelsByArm.get(arm.arm), expectedOwner: EXPLAIN_SLUG })),
	}
}

/** The sealed arm id → arm letter map. The single place a label's meaning lives. */
export function buildLabelMap({ experimentId, seed, labelsByArm }) {
	const spec = experimentSpec(experimentId)
	return {
		sealed: true,
		warning: "SEALED — maps blind arm ids to the registered arms. No scorer bundle may contain this file.",
		blindSeed: seed,
		algorithm: "arm ids assigned by ascending sha256(arm + blindSeed)",
		arms: spec.arms.map((arm) => ({ armId: labelsByArm.get(arm.arm), arm: arm.arm })),
	}
}
