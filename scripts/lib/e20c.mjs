/**
 * e20c.mjs — the pure half of E20c (is the last slot a magnet, or is `explain`
 * special?), registered in [`docs/reviews/2026-11-17-e20c-preregistration.md`].
 *
 * WHAT THIS FILE IS
 *   The registered material for that file as functions over strings and numbers:
 *   derive one picker per arm from the closing round's C1 picker by SWAPPING the
 *   moved mode with whoever occupies index 44, prove that exactly the two indices
 *   involved changed and nothing else, build the registered cycle with its 200
 *   draws per arm, and emit the plan, the sealed answer key and the sealed label
 *   map. The CLI files stay thin.
 *
 * THE EXPERIMENT (registration §2, §5; Amendment 2 §1 and §4)
 *   Three arms — X (control: E20's arm B picker verbatim), Y (the non-competing
 *   filler `documentation` moved to index 44) and Z (the plausible rival
 *   `architecture-reviewer` moved to index 44) — one slug `explain` held at index
 *   6 with the SAME line in all three, one brief, 600 calls in the cycle
 *   `X Y Z` repeated 200 times.
 *
 * WHY A SWAP, AND WHICH TWO INDICES IT CHANGES
 *   §2 is explicit: "The moved mode is swapped with whoever held index 44, so the
 *   list length and every other index are preserved — a clean swap, not a
 *   removal." A swap necessarily changes TWO indices per arm: index 44 and the
 *   moved mode's own index (`documentation` sits at 22, `architecture-reviewer`
 *   at 3 in the C1 picker; `ai-cost-engineer` is the original occupant of 44).
 *   It does NOT change index 6 — `explain` is at 6 in every arm and its line is
 *   the control condition (§2: "index 6, line B" for all three).
 *
 *   The assertion is therefore derived from the base picker rather than typed:
 *   each arm against X must differ at exactly the pair
 *   `{index of the moved mode, 44}`, and any two arms must differ at exactly the
 *   union of their own pairs. The pairwise consequence is stated here because it
 *   is easy to get wrong on paper: X/Y differ at {22, 44}, X/Z at {3, 44}, and
 *   Y/Z at {3, 22, 44}. Two independent swaps against one control cannot all be
 *   two-index diffs of each other.
 *
 * WHY THE PLAN SAYS `e20/1`
 *   The plan schema names the DOCUMENT shape (entries over a declared cycle with
 *   draws per arm), not the manipulation. E20c's plan is that shape exactly, so
 *   it reuses the schema and the executor's plan-derived total, and the derivation
 *   is selected by `plan.experiment`.
 *
 * WHAT IS DELIBERATELY NOT HERE
 *   No network, no provider protocol, no key, no `.env`, and no decision rule:
 *   E20c's statistics (two-sided Fisher exact, Holm across two contrasts, §5) and
 *   §6's readings belong to the report, not to the fixture generator. The run
 *   summaries below are mechanical counts only; they classify nothing.
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
import { LINE_IN, TEMPERATURE, extractDeclaredV2, fixedPersona } from "./routing-round.mjs"

export const E20C_DIR = path.join(FRAME_DIR, "e20c")

export const E20C_ID = "E20c"
export const E20C_REGISTRATION = "docs/reviews/2026-11-17-e20c-preregistration.md"

/** The plan DOCUMENT shape E20 already uses; see the header for why it is reused. */
export const E20C_PLAN_SCHEMA = "e20/1"

/** The one brief, verbatim, in all three arms (§2). */
export const E20C_BRIEF_ID = "B3"
export const E20C_BRIEF_TEXT = "Explain why this module is structured the way it is."

export const EXPLAIN_SLUG = "explain"
export const EXPLAIN_NAME = "Explain"

/** §2: `explain` at index 7 one-based, 6 zero-based, in every arm. */
export const E20C_EXPLAIN_INDEX = 6

/** §2: the manipulated slot — the last entry of the 45-entry picker. */
export const E20C_LAST_INDEX = 44

/** The C1 picker's entry count. A swap must not change it (§2: "not a removal"). */
export const E20C_PICKER_LENGTH = 45

/**
 * Line B, verbatim (§2). It is the same string as the closing round's IN line,
 * and the assertion below the constants keeps that a checked fact rather than a
 * comment: the control arm X must be E20's arm B, byte for byte.
 */
export const E20C_REGISTERED_LINE =
	"Use when someone asks why code behaves as it does and the answer must cite evidence, not recall."
export const E20C_REGISTERED_LINE_LENGTH = 96

export const E20C_LINE = E20C_REGISTERED_LINE

/** §2: the cycle, verbatim. `X Y Z` repeated 200 times = 600 calls. */
export const E20C_CYCLE = ["X", "Y", "Z"]
export const E20C_CYCLES = 200
export const E20C_DRAWS_PER_ARM = 200

/** Amendment 2 §1: the gate's thresholds, and §5's, are one and the same. */
export const E20C_MAX_EXCLUSION_RATE = 0.05
export const E20C_MAX_VERBATIM_RUN = 5

/** Fixed so a repeated dry-run is byte-identical. A real sweep passes a fresh seed. */
export const DEFAULT_E20C_BLIND_SEED = "roo-plus-e20c-2026-11-17"

/**
 * The three arms. `moved` is the slug swapped with the occupant of index 44 —
 * `null` for the control, which is the base picker untouched.
 */
export const E20C_ARMS = [
	{ arm: "X", draws: E20C_DRAWS_PER_ARM, moved: null, role: "control — E20's arm B picker, unchanged" },
	{ arm: "Y", draws: E20C_DRAWS_PER_ARM, moved: "documentation", role: "non-competing filler at index 44" },
	{ arm: "Z", draws: E20C_DRAWS_PER_ARM, moved: "architecture-reviewer", role: "plausible rival at index 44" },
]

export const E20C_SPEC = {
	id: E20C_ID,
	title: "E20c — the last slot: a non-competing filler and a plausible rival at index 44",
	dir: E20C_DIR,
	cycle: E20C_CYCLE,
	cycles: E20C_CYCLES,
	defaultSeed: DEFAULT_E20C_BLIND_SEED,
	arms: E20C_ARMS,
}

/** The registered lines, by key, for the executor's "no line text in the plan" check. */
export const REGISTERED_LINES = { B: E20C_LINE }

export function experimentSpec(experimentId) {
	if (experimentId !== E20C_ID) {
		throw new Error(`this module builds only ${E20C_ID}; got ${JSON.stringify(experimentId)}`)
	}
	return E20C_SPEC
}

/** The plan's own registered total: the cycle, repeated. Never a module constant. */
export function expectedRuns(experimentId = E20C_ID) {
	const spec = experimentSpec(experimentId)
	return spec.cycle.length * spec.cycles
}

/** The registered brief, taken from the frozen `BRIEFS` constant, never retyped. */
export function e20cBrief() {
	const brief = BRIEFS.find((candidate) => candidate.id === E20C_BRIEF_ID)
	if (!brief) throw new Error(`BRIEFS has no ${E20C_BRIEF_ID}; E20c cannot be built`)
	return brief
}

/** Literals only doctrine or grants could contribute. Zero of each is asserted. */
const FORBIDDEN_PROMPT_STRINGS = ["roleDefinition", "customInstructions", "groups:"]

function assertNoDoctrine(prompt, where) {
	for (const literal of FORBIDDEN_PROMPT_STRINGS) {
		if (prompt.includes(literal)) throw new Error(`${where}: doctrine literal ${JSON.stringify(literal)} in prompt`)
	}
}

function slugSequence(modes) {
	return modes.map((mode) => mode.slug)
}

/** The registered pair for a swap: the moved mode's own index and the last slot. */
export function expectedSwapIndices(originIndex, lastIndex = E20C_LAST_INDEX) {
	return [originIndex, lastIndex].sort((left, right) => left - right)
}

/**
 * Indices whose parsed entry differs between two arm documents. Parsed, not
 * textual: a swap of two blocks with different line counts still leaves the
 * entries at the same indices, and only the two involved ones differ.
 */
export function changedIndices(reference, candidate) {
	if (reference.length !== candidate.length) {
		throw new Error(
			`arm documents have different lengths (${reference.length} vs ${candidate.length}): a swap must not resize the picker`,
		)
	}
	const changed = []
	for (let index = 0; index < reference.length; index++) {
		if (JSON.stringify(reference[index]) !== JSON.stringify(candidate[index])) changed.push(index)
	}
	return changed
}

/**
 * Exchange two whole entries as text, preserving every other entry's bytes and
 * relative order. The block is spliced, not re-rendered, so a swapped picker
 * differs from the base only in the position of the two blocks (§2).
 */
export function swapEntryBlocks(text, slugA, slugB) {
	if (slugA === slugB) throw new Error(`cannot swap ${JSON.stringify(slugA)} with itself`)

	const lines = text.split("\n")
	const endsWithNewline = lines.length > 0 && lines[lines.length - 1] === ""
	if (endsWithNewline) lines.pop()

	const firstEntry = lines.findIndex((line) => /^ {2}- slug: /.test(line))
	if (firstEntry < 0) throw new Error("picker has no entries to swap")

	const header = lines.slice(0, firstEntry)
	const blocks = []
	for (let index = firstEntry; index < lines.length; index++) {
		if (/^ {2}- slug: /.test(lines[index])) blocks.push([])
		blocks[blocks.length - 1].push(lines[index])
	}

	const a = blocks.findIndex((block) => block[0] === `  - slug: ${slugA}`)
	const b = blocks.findIndex((block) => block[0] === `  - slug: ${slugB}`)
	if (a < 0) throw new Error(`picker has no entry with slug ${JSON.stringify(slugA)}`)
	if (b < 0) throw new Error(`picker has no entry with slug ${JSON.stringify(slugB)}`)

	const swapped = [...blocks]
	;[swapped[a], swapped[b]] = [swapped[b], swapped[a]]

	const joined = [...header, ...swapped.flat()].join("\n")
	return endsWithNewline ? `${joined}\n` : joined
}

/**
 * Derive every arm's picker, assert the manipulation is a clean two-index swap,
 * and build the prompts. Throws on any violation: material that failed here must
 * not run.
 */
export function buildExperimentSet({ experimentId, baseText }) {
	const spec = experimentSpec(experimentId)
	const persona = fixedPersona()
	const brief = e20cBrief()

	// The registered material is asserted, never assumed.
	if (E20C_LINE.length !== E20C_REGISTERED_LINE_LENGTH) {
		throw new Error(
			`line B measures ${E20C_LINE.length} characters; registration §2 states ${E20C_REGISTERED_LINE_LENGTH}`,
		)
	}
	if (E20C_LINE !== LINE_IN) {
		throw new Error(
			"E20c's line is not the closing round's IN line: arm X would not replicate E20's arm B picker byte for byte",
		)
	}
	if (brief.text !== E20C_BRIEF_TEXT) {
		throw new Error(`brief ${E20C_BRIEF_ID} is ${JSON.stringify(brief.text)}, not the registered brief`)
	}

	const baseModes = parseRoomodes(baseText, "C1.roomodes")
	if (baseModes.length !== E20C_PICKER_LENGTH) {
		throw new Error(`the C1 picker parsed ${baseModes.length} entries, expected ${E20C_PICKER_LENGTH}`)
	}
	const baseSlugs = slugSequence(baseModes)
	const baseExplain = baseModes[E20C_EXPLAIN_INDEX]
	if (!baseExplain || baseExplain.slug !== EXPLAIN_SLUG) {
		throw new Error(`the C1 picker's entry ${E20C_EXPLAIN_INDEX} is not ${EXPLAIN_SLUG}`)
	}
	if (baseExplain.name !== EXPLAIN_NAME) {
		throw new Error(`the C1 picker's explain entry is named ${JSON.stringify(baseExplain.name)}`)
	}
	if (baseExplain.whenToUse !== E20C_LINE) {
		throw new Error(
			`the C1 picker's explain line is ${JSON.stringify(baseExplain.whenToUse)}, not the registered line B`,
		)
	}

	const originalOccupant = baseSlugs[E20C_LAST_INDEX]
	if (typeof originalOccupant !== "string") {
		throw new Error(`the C1 picker has no entry at index ${E20C_LAST_INDEX}`)
	}

	// The two registered pre-checks, as assertions rather than operator memory.
	for (const arm of spec.arms) {
		if (arm.moved === null) continue
		if (!baseSlugs.includes(arm.moved)) {
			throw new Error(`${arm.arm}: the C1 picker has no ${JSON.stringify(arm.moved)} entry to move`)
		}
		if (arm.moved === originalOccupant) {
			throw new Error(
				`${arm.arm}: ${JSON.stringify(arm.moved)} already occupies index ${E20C_LAST_INDEX}, so moving it ` +
					"would not be a swap — pick a replacement and report it rather than substituting silently",
			)
		}
	}

	const expectedByArm = new Map()
	const arms = spec.arms.map((arm) => {
		const text = arm.moved === null ? baseText : swapEntryBlocks(baseText, arm.moved, originalOccupant)
		const modes = parseRoomodes(text, `${arm.arm}.roomodes`)

		if (modes.length !== baseModes.length) {
			throw new Error(`${arm.arm}: derived ${modes.length} entries, expected ${baseModes.length} (a swap, not a removal)`)
		}
		const sortedBase = [...baseSlugs].sort().join(",")
		const sortedArm = [...slugSequence(modes)].sort().join(",")
		if (sortedBase !== sortedArm) {
			throw new Error(`${arm.arm}: the derived picker's slug set is not the base's`)
		}

		const entry = modes[E20C_EXPLAIN_INDEX]
		if (!entry || entry.slug !== EXPLAIN_SLUG) {
			throw new Error(`${arm.arm}: entry ${E20C_EXPLAIN_INDEX} is ${entry?.slug}, expected ${EXPLAIN_SLUG}`)
		}
		if (entry.name !== EXPLAIN_NAME) throw new Error(`${arm.arm}: entry ${E20C_EXPLAIN_INDEX} is named ${entry.name}`)
		if (entry.whenToUse !== E20C_LINE) {
			throw new Error(
				`${arm.arm}: explain's line is ${JSON.stringify(entry.whenToUse)}; §2 holds the same line in all three arms`,
			)
		}

		const expected = arm.moved === null ? [] : expectedSwapIndices(baseSlugs.indexOf(arm.moved))
		const changed = changedIndices(baseModes, modes)
		if (JSON.stringify(changed) !== JSON.stringify(expected)) {
			throw new Error(
				`${arm.arm}: changed indices ${JSON.stringify(changed)}, expected ${JSON.stringify(expected)} — ` +
					"a swap must change the moved mode's own index and index 44, and nothing else",
			)
		}
		expectedByArm.set(arm.arm, expected)

		// The pair really exchanged places, in both directions.
		if (arm.moved !== null) {
			if (modes[E20C_LAST_INDEX].slug !== arm.moved) {
				throw new Error(`${arm.arm}: index ${E20C_LAST_INDEX} holds ${modes[E20C_LAST_INDEX].slug}, expected ${arm.moved}`)
			}
			const origin = baseSlugs.indexOf(arm.moved)
			if (modes[origin].slug !== originalOccupant) {
				throw new Error(
					`${arm.arm}: index ${origin} holds ${modes[origin].slug}, expected the displaced ${originalOccupant}`,
				)
			}
		}

		const picker = pickerTextFor(modes)
		const prompt = buildPrompt(persona, brief, picker)
		if (prompt.text.split(picker).length !== 2) throw new Error(`${arm.arm}: picker does not appear exactly once`)
		assertNoDoctrine(prompt.text, arm.arm)

		return {
			arm: arm.arm,
			moved: arm.moved,
			role: arm.role,
			position: E20C_EXPLAIN_INDEX,
			text,
			modes,
			picker,
			prompt: prompt.text,
			changedIndices: changed,
		}
	})

	// Any two arms must differ at exactly the union of their own pairs against X.
	// This is what "every other index is identical" means for three arms: X/Y are
	// {22, 44}, X/Z are {3, 44}, and Y/Z are their union {3, 22, 44}.
	const reference = arms[0]
	for (let left = 0; left < arms.length; left++) {
		for (let right = left + 1; right < arms.length; right++) {
			const a = arms[left]
			const b = arms[right]
			const union = [...new Set([...expectedByArm.get(a.arm), ...expectedByArm.get(b.arm)])].sort(
				(one, two) => one - two,
			)
			const actual = changedIndices(a.modes, b.modes)
			if (JSON.stringify(actual) !== JSON.stringify(union)) {
				throw new Error(
					`arms ${a.arm}/${b.arm} differ at ${JSON.stringify(actual)}, expected ${JSON.stringify(union)} — ` +
						"two swaps against one control must leave every other index identical",
				)
			}
		}
	}

	const hashes = new Set(arms.map((arm) => sha256(arm.prompt)))
	if (hashes.size !== arms.length) {
		throw new Error(`${spec.id}: ${hashes.size} distinct prompts, expected ${arms.length} (one per arm)`)
	}

	return { spec, persona, brief, arms, baseModes, originalOccupant, swapIndices: expectedByArm }
}

/**
 * Blind arm ids: ascending `sha256(arm + seed)`, the same algorithm the closing
 * round used for its labels. An id carries no arm letter.
 */
export function labelArms(experimentId, seed = E20C_SPEC.defaultSeed) {
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
 * The inverse view the summaries need: blind label → arm letter. Derived from the
 * plan's seed, so a mechanical tally never has to open the sealed label map.
 */
export function armByLabel(experimentId, seed = E20C_SPEC.defaultSeed) {
	const labelsByArm = labelArms(experimentId, seed)
	return new Map([...labelsByArm.entries()].map(([arm, label]) => [label, arm]))
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
				briefId: E20C_BRIEF_ID,
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
 * exact per-arm counts (200 each), every consecutive pair a different arm, and
 * each run's label the one the cycle assigns.
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

export function buildPlanDocument({ experimentId, fixtureSet, runs, seed }) {
	const spec = experimentSpec(experimentId)
	const persona = fixedPersona()
	const brief = e20cBrief()
	return {
		planSchema: E20C_PLAN_SCHEMA,
		instrument: spec.title,
		experiment: spec.id,
		registration: E20C_REGISTRATION,
		design:
			`${spec.arms.length} arms (${spec.arms.map((arm) => `${arm.arm} ${arm.draws}`).join(", ")}) = ` +
			`${runs.length} runs, cycle ${spec.cycle.join(" ")} repeated ${spec.cycles} times`,
		drawsPerArm: Object.fromEntries(spec.arms.map((arm) => [arm.arm, arm.draws])),
		cycle: [...spec.cycle],
		cycles: spec.cycles,
		// §2: the manipulation recorded as a swap, with the indices it is allowed to touch.
		swaps: Object.fromEntries(
			spec.arms.map((arm) => [
				arm.arm,
				arm.moved === null
					? null
					: {
							moved: arm.moved,
							replaced: fixtureSet.originalOccupant,
							indices: [...fixtureSet.swapIndices.get(arm.arm)],
						},
			]),
		),
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
 * no arm letter, no line text, no position, no moved-mode name.
 */
export function buildAnswerKey({ experimentId, fixtureSet, labelsByArm }) {
	const spec = experimentSpec(experimentId)
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
		registration: E20C_REGISTRATION,
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

// ---------------------------------------------------------------------------
// Mechanical run summaries — counts only, no reading
// ---------------------------------------------------------------------------

/** A record is scorable exactly as `verify-extractor-round-trip` defines it. */
export function isScorable(record) {
	return record?.status === "RUN" && typeof record?.response === "string" && record.response.trim() !== ""
}

/** The longest block of byte-identical replies, in the order given. */
export function longestVerbatimRun(replies) {
	let longest = 0
	let current = 0
	let previous = null
	for (const reply of replies) {
		current = reply === previous ? current + 1 : 1
		previous = reply
		if (current > longest) longest = current
	}
	return longest
}

/**
 * Per-arm mechanical counts for one run directory: exclusion, the longest
 * identical verbatim run, and the declaration tally from the pinned extractor
 * over the arm's own shared vocabulary.
 *
 * `records` must arrive in draw order for the verbatim run to mean "consecutive
 * draws". No reply is adjudicated here: an undetermined reply is counted as
 * undetermined and left for the packet.
 */
export function summariseRun({ records, armOf, vocabulary, outcomes = [EXPLAIN_SLUG] }) {
	const byArm = new Map()
	for (const record of records) {
		const arm = armOf.get(record?.label)
		if (!arm) throw new Error(`a record carries label ${JSON.stringify(record?.label)}, which maps to no arm`)
		if (!byArm.has(arm)) byArm.set(arm, [])
		byArm.get(arm).push(record)
	}

	const rows = []
	for (const [arm, armRecords] of [...byArm.entries()].sort((left, right) => left[0].localeCompare(right[0]))) {
		const scorable = armRecords.filter((record) => isScorable(record))
		const excluded = armRecords.length - scorable.length
		const declared = new Map(outcomes.map((slug) => [slug, 0]))
		let undetermined = 0
		for (const record of scorable) {
			const slug = extractDeclaredV2(record.response, vocabulary)
			if (slug === null) undetermined++
			else if (declared.has(slug)) declared.set(slug, declared.get(slug) + 1)
		}
		rows.push({
			arm,
			records: armRecords.length,
			scorable: scorable.length,
			excluded,
			exclusionRate: armRecords.length === 0 ? 0 : excluded / armRecords.length,
			longestVerbatimRun: longestVerbatimRun(scorable.map((record) => record.response)),
			declared: Object.fromEntries(declared),
			undetermined,
		})
	}

	const spans = records
		.map((record) => ({ started: Date.parse(record?.startedAt), ended: Date.parse(record?.endedAt) }))
		.filter((span) => Number.isFinite(span.started) && Number.isFinite(span.ended) && span.ended >= span.started)
	const durations = spans.map((span) => (span.ended - span.started) / 1000)
	const wallClockSeconds =
		spans.length === 0
			? null
			: (Math.max(...spans.map((span) => span.ended)) - Math.min(...spans.map((span) => span.started))) / 1000

	return {
		arms: rows,
		overall: {
			records: records.length,
			scorable: records.filter((record) => isScorable(record)).length,
			excluded: records.length - records.filter((record) => isScorable(record)).length,
			wallClockSeconds,
			meanCallSeconds:
				durations.length === 0 ? null : durations.reduce((total, value) => total + value, 0) / durations.length,
		},
	}
}

/**
 * The gate of §5 / Amendment 2 §1: exclusion above 5% in any arm, or a longest
 * identical verbatim run above 5 in any arm, stops the sweep. `failures` is
 * empty on a pass, and every failure names the arm, the metric and its value.
 */
export function gateVerdict(rows, { maxExclusionRate = E20C_MAX_EXCLUSION_RATE, maxVerbatimRun = E20C_MAX_VERBATIM_RUN } = {}) {
	const failures = []
	for (const row of rows) {
		if (row.exclusionRate > maxExclusionRate) {
			failures.push(
				`${row.arm}: exclusion ${(row.exclusionRate * 100).toFixed(1)}% (${row.excluded}/${row.records}) exceeds the registered ${(maxExclusionRate * 100).toFixed(0)}%`,
			)
		}
		if (row.longestVerbatimRun > maxVerbatimRun) {
			failures.push(
				`${row.arm}: longest identical verbatim run ${row.longestVerbatimRun} exceeds the registered ${maxVerbatimRun}`,
			)
		}
	}
	return { passed: failures.length === 0, failures }
}
