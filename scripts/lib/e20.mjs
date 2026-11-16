/**
 * e20.mjs — the pure half of E20 (artefact polarity) and E20b (position).
 *
 * WHAT THIS FILE IS
 *   The registered material for [`docs/reviews/2026-11-13-e20-preregistration.md`]
 *   as functions over strings and numbers: derive one picker per arm from the
 *   closing round's C1 picker, prove the only difference is the `explain` line
 *   (§2.1) or the `explain` position (§2.3), build the registered cycle with the
 *   Amendment 1 1:4:4 draw counts, and emit the plan, the sealed answer key and
 *   the sealed label map. The two CLI files stay thin.
 *
 * THE TWO EXPERIMENTS (registration §2.1, §2.3, Amendment 1 §1 and §5)
 *   E20   three arms — A (100 draws, 50-char line), B (400, 96, the round's IN
 *         line) and C (400, 99, the excluded-artefact line) — one slug `explain`
 *         held at index 6 (0-based) in all three, one brief, 900 calls in the
 *         cycle `A B C B C B C B C` repeated 100 times.
 *   E20b  two arms — `explain` first (index 0) and last (index 44) — line B in
 *         both, 200 calls alternating strictly, `P1 P45` repeated 100 times.
 *
 * WHY THE DERIVATION IS ASSERTED RATHER THAN DESCRIBED
 *   A picker that quietly changed a neighbour line would make an arm difference
 *   unattributable. `buildExperimentSet` therefore parses every derived picker
 *   and requires the arms to be equal at every entry except the manipulated one,
 *   that `explain` sits at the registered index, that the B arm is byte-identical
 *   to the closing round's C1 picker (whose line is already the IN line), and
 *   that the measured line lengths are the ones registration §2.1 states.
 *
 * WHAT IS DELIBERATELY NOT HERE
 *   No network, no provider protocol, no key, no `.env`, no dependency, and no
 *   scoring rule: E20's statistics are a different task (Fisher exact on two
 *   declared contrasts) and inventing them here would put the reading inside the
 *   fixture generator.
 *
 * No dependencies. Node 22 ESM.
 */

import * as path from "node:path"

import {
	BRIEFS,
	FRAME_DIR,
	assignLabels,
	buildPrompt,
	parseRoomodes,
	pickerTextFor,
	sha256,
} from "./framing-pretest.mjs"
import { LINE_IN, TEMPERATURE, derivePickerText, differingLineNumbers, fixedPersona } from "./routing-round.mjs"

export const E20_DIR = path.join(FRAME_DIR, "e20")
export const E20B_DIR = path.join(FRAME_DIR, "e20b")

/** The plan schema field that makes the executor's two plan shapes explicit. */
export const E20_PLAN_SCHEMA = "e20/1"

export const E20_REGISTRATION = "docs/reviews/2026-11-13-e20-preregistration.md"
export const E20_AMENDMENT = "Amendment 1 — 2026-11-16, draws per arm"

/** One brief, verbatim, in both experiments (§2.1: the ambiguous brief). */
export const E20_BRIEF_ID = "B3"

export const EXPLAIN_SLUG = "explain"
export const EXPLAIN_NAME = "Explain"

/** §2.1: `explain` held at index 7 one-based, index 6 zero-based, in every E20 arm. */
export const EXPLAIN_INDEX_E20 = 6

/** The three registered lines, verbatim (§2.1). B is the closing round's IN line. */
export const E20_LINES = {
	A: "Use when someone asks why code behaves as it does.",
	B: LINE_IN,
	C: "Use when someone asks why code behaves as it does and the answer must not merely describe the code.",
}

/**
 * The lengths §2.1 states, kept as an assertion rather than a comment: if a
 * registered line is not the length the registration claims, the build fails
 * instead of producing material nobody measured.
 */
export const E20_REGISTERED_LINE_LENGTHS = { A: 50, B: 96, C: 99 }

/** §2.2: B and C are the length-matched contrast; three characters apart. */
export const E20_PRIMARY_LENGTH_DELTA = 3

/** Amendment 1 §5: `A B C B C B C B C`, repeated 100 times = 900 calls. */
export const E20_CYCLE = ["A", "B", "C", "B", "C", "B", "C", "B", "C"]

/** §2.3: `P1 P45` alternating, repeated 100 times = 200 calls. */
export const E20B_CYCLE = ["P1", "P45"]

/** The number of times the registered cycle is repeated, in both experiments. */
export const E20_CYCLES = 100

/** Fixed so a repeated dry-run is byte-identical. A real sweep passes a fresh seed. */
export const DEFAULT_E20_BLIND_SEED = "roo-plus-e20-2026-11-16"
export const DEFAULT_E20B_BLIND_SEED = "roo-plus-e20b-2026-11-16"

/**
 * The two experiments. `lineKey` indexes `E20_LINES`; `position` is the
 * zero-based index of `explain` in that arm's picker; `draws` are Amendment 1's.
 */
export const EXPERIMENTS = {
	E20: {
		id: "E20",
		title: "E20 — artefact polarity: one slug, one brief, three lines",
		dir: E20_DIR,
		cycle: E20_CYCLE,
		cycles: E20_CYCLES,
		defaultSeed: DEFAULT_E20_BLIND_SEED,
		arms: [
			{ arm: "A", draws: 100, lineKey: "A", position: EXPLAIN_INDEX_E20 },
			{ arm: "B", draws: 400, lineKey: "B", position: EXPLAIN_INDEX_E20 },
			{ arm: "C", draws: 400, lineKey: "C", position: EXPLAIN_INDEX_E20 },
		],
	},
	E20b: {
		id: "E20b",
		title: "E20b — position: one line, two positions",
		dir: E20B_DIR,
		cycle: E20B_CYCLE,
		cycles: E20_CYCLES,
		defaultSeed: DEFAULT_E20B_BLIND_SEED,
		arms: [
			{ arm: "P1", draws: 100, lineKey: "B", position: 0 },
			{ arm: "P45", draws: 100, lineKey: "B", position: 44 },
		],
	},
}

export const EXPERIMENT_IDS = Object.keys(EXPERIMENTS)

export function experimentSpec(experimentId) {
	const spec = EXPERIMENTS[experimentId]
	if (!spec) {
		throw new Error(
			`unknown experiment ${JSON.stringify(experimentId)}; the registration names ${EXPERIMENT_IDS.join(", ")}`,
		)
	}
	return spec
}

/** The plan's own registered total: the cycle, repeated. Never a module constant. */
export function expectedRuns(experimentId) {
	const spec = experimentSpec(experimentId)
	return spec.cycle.length * spec.cycles
}

/** The registered brief, taken from the frozen `BRIEFS` constant, never retyped. */
export function e20Brief() {
	const brief = BRIEFS.find((candidate) => candidate.id === E20_BRIEF_ID)
	if (!brief) throw new Error(`BRIEFS has no ${E20_BRIEF_ID}; E20 cannot be built`)
	return brief
}

/** Measured lengths of the three registered lines. Printed, and asserted below. */
export function measuredLineLengths() {
	return { A: E20_LINES.A.length, B: E20_LINES.B.length, C: E20_LINES.C.length }
}

/** Literals only doctrine or grants could contribute. Zero of each is asserted. */
const FORBIDDEN_PROMPT_STRINGS = ["roleDefinition", "customInstructions", "groups:"]

function assertNoDoctrine(prompt, where) {
	for (const literal of FORBIDDEN_PROMPT_STRINGS) {
		if (prompt.includes(literal)) throw new Error(`${where}: doctrine literal ${JSON.stringify(literal)} in prompt`)
	}
}

/**
 * Rewrite the `explain` entry's `whenToUse` and leave every other byte alone.
 * For line B this is a no-op: the base entry already carries the IN line, which
 * is why the E20 B arm must be byte-identical to the closing round's C1 picker.
 */
function withLine(baseText, lineKey) {
	const line = E20_LINES[lineKey]
	if (typeof line !== "string") throw new Error(`no registered line for key ${JSON.stringify(lineKey)}`)
	return derivePickerText(baseText, {
		target: EXPLAIN_SLUG,
		slug: EXPLAIN_SLUG,
		name: EXPLAIN_NAME,
		line,
	})
}

/**
 * Move the whole `explain` block to `targetIndex`, preserving its bytes and every
 * other entry's relative order. Used by E20b, where the line does not change but
 * the position does: §2.3's manipulation is list order alone.
 *
 * The block is spliced as text, not re-rendered, so a moved picker differs from
 * the unmoved one only in the order of its entries — no field is rewritten.
 */
export function moveEntryToIndex(text, slug, targetIndex) {
	const lines = text.split("\n")
	const endsWithNewline = lines.length > 0 && lines[lines.length - 1] === ""
	if (endsWithNewline) lines.pop()

	const firstEntry = lines.findIndex((line) => /^ {2}- slug: /.test(line))
	if (firstEntry < 0) throw new Error("picker has no entries to move")

	const header = lines.slice(0, firstEntry)
	const blocks = []
	for (let index = firstEntry; index < lines.length; index++) {
		if (/^ {2}- slug: /.test(lines[index])) blocks.push([])
		blocks[blocks.length - 1].push(lines[index])
	}

	const from = blocks.findIndex((block) => block[0] === `  - slug: ${slug}`)
	if (from < 0) throw new Error(`picker has no entry with slug ${JSON.stringify(slug)}`)
	if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= blocks.length) {
		throw new Error(`target index ${targetIndex} is outside the picker's ${blocks.length} entries`)
	}

	const [block] = blocks.splice(from, 1)
	blocks.splice(targetIndex, 0, block)

	const joined = [...header, ...blocks.flat()].join("\n")
	return endsWithNewline ? `${joined}\n` : joined
}

function slugSequence(modes) {
	return modes.map((mode) => mode.slug)
}

/**
 * Derive every arm's picker, assert the manipulation is single-field, and build
 * the prompts. Throws on any violation: material that failed here must not run.
 */
export function buildExperimentSet({ experimentId, baseText }) {
	const spec = experimentSpec(experimentId)
	const persona = fixedPersona()
	const brief = e20Brief()

	// The registered lengths are asserted, never assumed.
	const measured = measuredLineLengths()
	for (const [key, registered] of Object.entries(E20_REGISTERED_LINE_LENGTHS)) {
		if (measured[key] !== registered) {
			throw new Error(
				`line ${key} measures ${measured[key]} characters; registration §2.1 states ${registered} — ` +
					"the material is not the registered material",
			)
		}
	}
	if (measured.C - measured.B !== E20_PRIMARY_LENGTH_DELTA) {
		throw new Error(
			`B and C differ by ${measured.C - measured.B} characters; §2.2's primary contrast is length-matched at ${E20_PRIMARY_LENGTH_DELTA}`,
		)
	}

	const baseModes = parseRoomodes(baseText, "C1.roomodes")
	if (baseModes.length !== 45) throw new Error(`the C1 picker parsed ${baseModes.length} entries, expected 45`)
	const baseExplain = baseModes.find((mode) => mode.slug === EXPLAIN_SLUG)
	if (!baseExplain) throw new Error("the C1 picker has no explain entry")
	if (baseExplain.whenToUse !== LINE_IN) {
		throw new Error(
			`the C1 picker's explain line is ${JSON.stringify(baseExplain.whenToUse)}, not the round's IN line: ` +
				"E20 arm B would not be the closing round's IN cell verbatim",
		)
	}
	const baseSlugs = slugSequence(baseModes)

	const arms = spec.arms.map((arm) => {
		const rewritten = withLine(baseText, arm.lineKey)
		const text =
			arm.position === EXPLAIN_INDEX_E20
				? rewritten.text
				: moveEntryToIndex(rewritten.text, EXPLAIN_SLUG, arm.position)

		const modes = parseRoomodes(text, `${arm.arm}.roomodes`)
		if (modes.length !== baseModes.length) {
			throw new Error(`${arm.arm}: derived ${modes.length} entries, expected ${baseModes.length}`)
		}

		// The slug multiset is the base's: moving an entry must not lose or duplicate one.
		const sortedBase = [...baseSlugs].sort().join(",")
		const sortedArm = [...slugSequence(modes)].sort().join(",")
		if (sortedBase !== sortedArm) throw new Error(`${arm.arm}: the derived picker's slug set is not the base's`)

		const entry = modes[arm.position]
		if (!entry) throw new Error(`${arm.arm}: no entry at index ${arm.position}`)
		if (entry.slug !== EXPLAIN_SLUG) {
			throw new Error(`${arm.arm}: entry ${arm.position} is ${entry.slug}, expected explain`)
		}
		if (entry.name !== EXPLAIN_NAME) throw new Error(`${arm.arm}: entry ${arm.position} is named ${entry.name}`)
		const expectedLine = E20_LINES[arm.lineKey]
		if (entry.whenToUse !== expectedLine) {
			throw new Error(
				`${arm.arm}: explain's line is ${JSON.stringify(entry.whenToUse)}, expected ${JSON.stringify(expectedLine)}`,
			)
		}

		const changedLines = differingLineNumbers(baseText, withLine(baseText, arm.lineKey).text)
		const expectedChanged =
			E20_LINES[arm.lineKey] === baseExplain.whenToUse ? [] : [rewritten.lineNumbers.whenToUse]
		if (JSON.stringify(changedLines) !== JSON.stringify(expectedChanged)) {
			throw new Error(
				`${arm.arm}: changed lines ${JSON.stringify(changedLines)}, expected ${JSON.stringify(expectedChanged)}`,
			)
		}

		const picker = pickerTextFor(modes)
		const prompt = buildPrompt(persona, brief, picker)
		if (prompt.text.split(picker).length !== 2) throw new Error(`${arm.arm}: picker does not appear exactly once`)
		assertNoDoctrine(prompt.text, arm.arm)

		return {
			arm: arm.arm,
			lineKey: arm.lineKey,
			position: arm.position,
			text,
			modes,
			picker,
			prompt: prompt.text,
			changedLines,
		}
	})

	// Every arm holds the same 45 entries. Two arms that share a position must be
	// equal entry for entry (E20); two arms that differ only in position must be
	// equal entry for entry once keyed by slug (E20b).
	const reference = arms[0]
	for (const arm of arms.slice(1)) {
		if (arm.modes.length !== reference.modes.length) {
			throw new Error(`${arm.arm} and ${reference.arm} have different entry counts`)
		}
		if (arm.position === reference.position) {
			for (let index = 0; index < arm.modes.length; index++) {
				if (index === arm.position) continue
				if (JSON.stringify(arm.modes[index]) !== JSON.stringify(reference.modes[index])) {
					throw new Error(
						`${arm.arm} and ${reference.arm} differ at entry ${index} ` +
							`(${arm.modes[index].slug} / ${reference.modes[index].slug}); ` +
							"the registered manipulation is one field of one entry",
					)
				}
			}
			continue
		}
		const bySlug = new Map(arm.modes.map((mode) => [mode.slug, mode]))
		for (const mode of reference.modes) {
			const other = bySlug.get(mode.slug)
			if (!other) throw new Error(`${arm.arm} is missing ${mode.slug}: the arms are not the same picker`)
			if (JSON.stringify(other) !== JSON.stringify(mode)) {
				throw new Error(
					`${arm.arm} and ${reference.arm} differ in ${mode.slug}; ` +
						"a position arm may change list order only",
				)
			}
		}
	}

	// The B arm of E20 is the closing round's IN cell, byte for byte (§2.1).
	const armB = arms.find((arm) => arm.lineKey === "B" && arm.position === EXPLAIN_INDEX_E20)
	if (armB && armB.text !== baseText) {
		throw new Error("the E20 B arm is not byte-identical to the closing round's C1 picker")
	}

	const hashes = new Set(arms.map((arm) => sha256(arm.prompt)))
	if (hashes.size !== arms.length) {
		throw new Error(`${spec.id}: ${hashes.size} distinct prompts, expected ${arms.length} (one per arm)`)
	}

	return { spec, persona, brief, arms, baseModes }
}

/**
 * Blind arm ids: ascending `sha256(arm + seed)`, the same algorithm the closing
 * round used for its labels. An id carries no arm letter.
 */
export function labelArms(experimentId, seed = experimentSpec(experimentId).defaultSeed) {
	const spec = experimentSpec(experimentId)
	const catalogues = new Map(
		spec.arms.map((arm) => [
			arm.arm,
			{ frame: arm.arm, file: path.join(spec.dir, `${arm.arm}.roomodes`), modes: [] },
		]),
	)
	const labelled = assignLabels(seed, catalogues, "ARM-")
	return new Map(labelled.map((catalogue) => [catalogue.frame, catalogue.label]))
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
				briefId: E20_BRIEF_ID,
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
 * The registered order, asserted from the runs rather than from a comment:
 * exact per-arm counts (Amendment 1: 100/400/400 and 100/100), every consecutive
 * pair a different arm, and each run's label the one the cycle assigns.
 */
export function assertCycle(runs, spec, labelsByArm) {
	const expected = spec.cycle.length * spec.cycles
	if (runs.length !== expected) throw new Error(`plan has ${runs.length} runs, expected ${expected}`)

	const counts = new Map(spec.arms.map((arm) => [arm.arm, 0]))
	for (const [position, run] of runs.entries()) {
		const arm = spec.cycle[position % spec.cycle.length]
		if (run.arm !== arm) {
			throw new Error(
				`run ${position + 1} is arm ${run.arm}, expected ${arm}: the plan is not the registered cycle`,
			)
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

export function buildPlanDocument({ experimentId, runs, seed }) {
	const spec = experimentSpec(experimentId)
	const persona = fixedPersona()
	const brief = e20Brief()
	return {
		planSchema: E20_PLAN_SCHEMA,
		instrument: spec.title,
		experiment: spec.id,
		registration: E20_REGISTRATION,
		amendment: E20_AMENDMENT,
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
		persona: { id: persona.id, condition: persona.condition, directive: persona.directive },
		briefs: [{ id: brief.id, text: brief.text, sha256: sha256(brief.text) }],
		entries: runs.map(planEntry),
	}
}

/**
 * The sealed analysis key. Every arm's expected owner is `explain`, and the key
 * carries nothing that would tell a scorer which arm is which beyond the arm id:
 * no line text, no position, no arm letter, no slug.
 */
export function buildAnswerKey({ experimentId, fixtureSet, labelsByArm }) {
	const spec = experimentSpec(experimentId)
	// A position arm reorders the picker, so the vocabulary is compared as a set
	// and emitted sorted: the key must not encode either arm's list order.
	const vocabulary = [...slugSequence(fixtureSet.arms[0].modes)].sort()
	for (const arm of fixtureSet.arms.slice(1)) {
		if ([...slugSequence(arm.modes)].sort().join(",") !== vocabulary.join(",")) {
			throw new Error(`${arm.arm}: the arms do not share one slug vocabulary, so one shared list would be wrong`)
		}
	}
	return {
		sealed: true,
		warning:
			"SEALED ANALYSIS KEY — maps blind arm ids to their expected owner and the shared picker vocabulary. " +
			"No scorer bundle may contain this file.",
		registration: E20_REGISTRATION,
		amendment: E20_AMENDMENT,
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
