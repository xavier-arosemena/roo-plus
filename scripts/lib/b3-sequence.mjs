/**
 * b3-sequence.mjs — Amendment 2 §A2.2 as a pure function, plus the answer-key reader.
 *
 * WHY THE PROCEDURE LIVES HERE AND NOT IN THE CLI
 *   §A2.2 is six steps with five stop conditions and a first-match rule. Written
 *   inline in a CLI it can only be exercised by running a batch. As a pure
 *   function over declared modes it can be driven through every stop path with
 *   synthetic data — no model call, no run directory, no scorer.
 *
 * WHAT DECIDES A STEP
 *   `declared_mode` against the sealed key, plus "did the response declare
 *   anything at all". Nothing else. No scorer is consulted and no judgement is
 *   made here: HELP is `declared_mode === null`, a key hit is
 *   `declared_mode === key owner`, and everything else is non-key. If a step
 *   needed more than that, it could not be in this file.
 *
 * THE ONE PLACE THE KEY NEEDS A SLUG
 *   Step 4 compares A0 with E11's recorded vector, which contains one
 *   `PLAUSIBLE` (P3 → `architecture-reviewer`). PLAUSIBLE is a judgement, but the
 *   E11 vector records the slug that judgement settled on, so agreement is
 *   decidable as exact slug equality. A DIFFERENT non-key mode does not agree,
 *   which is the conservative reading.
 *
 * No dependencies. Node 22 ESM.
 */

import * as fs from "node:fs/promises"
import * as path from "node:path"

import { ROOT } from "./framing-pretest.mjs"

export const ANSWER_KEY_PATH = "test-fixtures/frames/b3-isolation/answer-key.json"

/** The frozen order (§A2.7): C1 → A0×3 → A5 → P → M → L → X → N. */
export const SEQUENCE = {
	control: "C1",
	baseline: "A0",
	contrast: "A5",
	placebo: "P",
	arms: [
		{ cause: "M", condition: "A1" },
		{ cause: "L", condition: "A2" },
		{ cause: "X", condition: "A4" },
	],
}

/** The cells §A2.2 needs, with the repetition count each condition must supply. */
export const SEQUENCE_CELLS = [
	...Array.from({ length: 1 }, (_, index) => ({ condition: SEQUENCE.control, repetition: index + 1 })),
	...Array.from({ length: 3 }, (_, index) => ({ condition: SEQUENCE.baseline, repetition: index + 1 })),
	...Array.from({ length: 1 }, (_, index) => ({ condition: SEQUENCE.contrast, repetition: index + 1 })),
	...Array.from({ length: 1 }, (_, index) => ({ condition: SEQUENCE.placebo, repetition: index + 1 })),
	...SEQUENCE.arms.map((arm) => ({ condition: arm.condition, repetition: 1 })),
]

export const REASON = {
	INSTRUMENT_FAILURE: "instrument-failure",
	NONDETERMINISTIC: "nondeterministic",
	CONTRAST_NOT_REPRODUCED: "contrast-not-reproduced",
	NO_NOISE_FLOOR: "no-noise-floor",
	NOT_REPLICATED: "not-replicated",
	FIRST_MATCH: "first-match",
	N_UNEXPLAINED: "N-unexplained",
}

export async function loadAnswerKey(keyPath = ANSWER_KEY_PATH) {
	const absolute = path.resolve(ROOT, keyPath)
	const key = JSON.parse(await fs.readFile(absolute, "utf-8"))
	if (!Array.isArray(key.owners) || key.owners.length === 0) throw new Error("answer key has no owners")
	if (!Array.isArray(key.e11ReferenceVector) || key.e11ReferenceVector.length === 0) {
		throw new Error("answer key has no E11 reference vector")
	}
	return { ...key, source: path.relative(ROOT, absolute) }
}

/**
 * The expected owner for one (condition, brief) pair, or a thrown error.
 *
 * `briefId` is optional because each condition carries exactly one brief; the
 * arms are keyed by condition, and A4's brief is the paraphrased one, so passing
 * a hard-coded brief id per arm would be a second place to drift.
 */
export function ownerFor(key, condition, briefId = null) {
	const entry = key.owners.find((owner) => owner.condition === condition && (briefId === null || owner.briefId === briefId))
	if (!entry) throw new Error(`answer key has no owner for (${condition}, ${briefId ?? "any brief"})`)
	return entry.owner
}

/**
 * The mechanical declared-mode extractor.
 *
 * A slug is "declared" when it occurs in the transcript as a whole token. No
 * slugs at all means the response declared nothing — the mechanical definition
 * of HELP. More than one slug means the last-mentioned wins (Amendment 1's
 * "mode after the marker" rule, reduced to the only marker a script can find:
 * textual order) and the case is flagged `ambiguous`.
 */
export function extractDeclaredMode(text, slugs) {
	if (typeof text !== "string" || text.trim() === "") return { declared: null, slugsSeen: [], ambiguous: false }

	const found = []
	for (const slug of slugs) {
		const escaped = slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
		const re = new RegExp(`(?<![a-z0-9-])${escaped}(?![a-z0-9-])`, "gi")
		if (!re.test(text)) continue
		found.push({ slug, last: text.toLowerCase().lastIndexOf(slug.toLowerCase()) })
	}

	if (found.length === 0) return { declared: null, slugsSeen: [], ambiguous: false }
	if (found.length === 1) return { declared: found[0].slug, slugsSeen: [found[0].slug], ambiguous: false }

	found.sort((a, b) => a.last - b.last)
	const slugsSeen = found.map((entry) => entry.slug)
	return { declared: found[found.length - 1].slug, slugsSeen, ambiguous: true }
}

function indexObservations(observations) {
	const index = new Map()
	for (const observation of observations) {
		const key = `${observation.condition}/${observation.persona}/r${observation.repetition}`
		if (index.has(key)) throw new Error(`duplicate observation ${key}`)
		index.set(key, observation)
	}
	return index
}

function requiredCells(key) {
	return SEQUENCE_CELLS.flatMap((cell) => key.personas.map((persona) => ({ ...cell, persona })))
}

function vectorOf(index, condition, repetition, key) {
	return key.personas.map((persona) => {
		const cell = index.get(`${condition}/${persona}/r${repetition}`)
		if (!cell) throw new Error(`no observation for ${condition}/${persona}/r${repetition}`)
		return { persona, declared: cell.declared ?? null, transcript: cell.transcript ?? null }
	})
}

function keyHits(vector, owner) {
	return vector.filter((entry) => entry.declared === owner).length
}

/**
 * Run §A2.2 over recorded observations.
 *
 * `observations` is `[{ condition, persona, repetition, declared, transcript }]`.
 * Returns the report written to `sequence-report.json`.
 */
export function runSequence({ key, observations }) {
	const index = indexObservations(observations)
	for (const cell of requiredCells(key)) {
		if (!index.has(`${cell.condition}/${cell.persona}/r${cell.repetition}`)) {
			throw new Error(`the run is incomplete: no observation for ${cell.condition}/${cell.persona}/r${cell.repetition}`)
		}
	}

	const steps = []
	const finish = (stopStep, reasonCode, extra = {}) => ({
		instrument: key.instrument ?? "B3 isolation (E12)",
		registration: key.registration ?? null,
		procedure: "Amendment 2 §A2.2",
		key: key.source ?? ANSWER_KEY_PATH,
		generatedAt: new Date().toISOString(),
		steps,
		stopStep,
		reasonCode,
		armsNotReached: extra.armsNotReached ?? SEQUENCE.arms.map((arm) => arm.cause),
		...extra,
	})

	// Step 0 — instrument control: C1 must be 5/5 on its own key owner.
	const c1Owner = ownerFor(key, SEQUENCE.control, "B1")
	const c1 = vectorOf(index, SEQUENCE.control, 1, key)
	const c1Misses = c1.filter((entry) => entry.declared !== c1Owner)
	steps.push({
		step: 0,
		id: "instrument-control",
		condition: SEQUENCE.control,
		expectedOwner: c1Owner,
		vector: c1,
		hits: c1.length - c1Misses.length,
		required: `${c1.length}/${c1.length}`,
		status: c1Misses.length === 0 ? "pass" : "stop",
		detail: c1Misses.length === 0 ? null : `declared ${c1Misses.map((entry) => `${entry.persona}=${entry.declared ?? "HELP"}`).join(", ")}`,
	})
	if (c1Misses.length > 0) {
		return finish(0, REASON.INSTRUMENT_FAILURE, { detail: "the batch-validity control did not hold; no arm may be read" })
	}

	// Step 1 — determinism: the three A0 draws must be byte-identical per persona.
	const a0Reps = [1, 2, 3].map((repetition) => vectorOf(index, SEQUENCE.baseline, repetition, key))
	const diverged = []
	for (const [position, entry] of a0Reps[0].entries()) {
		const texts = a0Reps.map((vector) => vector[position].transcript)
		if (texts.some((text) => text !== texts[0])) diverged.push({ persona: entry.persona, texts })
	}
	steps.push({
		step: 1,
		id: "determinism",
		condition: SEQUENCE.baseline,
		repetitions: 3,
		vector: a0Reps[0],
		identical: diverged.length === 0,
		status: diverged.length === 0 ? "pass" : "stop",
		detail: diverged.length === 0 ? null : `differing personas: ${diverged.map((entry) => entry.persona).join(", ")}`,
	})
	if (diverged.length > 0) {
		return finish(1, REASON.NONDETERMINISTIC, {
			detail: "single-draw measurement is unavailable at this model and these settings; no arm may be read",
			diverged,
		})
	}

	const a0 = a0Reps[0]
	const a0Owner = ownerFor(key, SEQUENCE.baseline, "B3")

	// Step 2 — the contrast exists: A5 must reach 4/5 on its own key owner.
	const a5Owner = ownerFor(key, SEQUENCE.contrast, "B3")
	const a5 = vectorOf(index, SEQUENCE.contrast, 1, key)
	const a5Hits = keyHits(a5, a5Owner)
	steps.push({
		step: 2,
		id: "contrast",
		condition: SEQUENCE.contrast,
		expectedOwner: a5Owner,
		vector: a5,
		hits: a5Hits,
		required: ">= 4/5",
		status: a5Hits >= 4 ? "pass" : "stop",
		detail: a5Hits >= 4 ? null : `only ${a5Hits}/5 declared the key owner`,
	})
	if (a5Hits < 4) {
		return finish(2, REASON.CONTRAST_NOT_REPRODUCED, { detail: "the difference this experiment exists to explain was not reproduced" })
	}

	// Step 3 — the noise floor: P's per-persona declared modes must equal A0's.
	const p = vectorOf(index, SEQUENCE.placebo, 1, key)
	const floorMoves = p
		.map((entry, position) => ({ persona: entry.persona, baseline: a0[position].declared, placebo: entry.declared }))
		.filter((entry) => entry.baseline !== entry.placebo)
	steps.push({
		step: 3,
		id: "noise-floor",
		condition: SEQUENCE.placebo,
		vector: p,
		baselineVector: a0,
		floor: floorMoves.length,
		status: floorMoves.length === 0 ? "pass" : "stop",
		detail: floorMoves.length === 0 ? null : `material change alone moved ${floorMoves.length}/5 personas`,
		moves: floorMoves,
	})
	if (floorMoves.length > 0) {
		return finish(3, REASON.NO_NOISE_FLOOR, {
			detail: "no arm's movement can be attributed without subtracting this floor; the floor is reported and no causal arm is read",
			floor: floorMoves.length,
			floorMoves,
		})
	}

	// Step 4 — replication of E11 (§A2.2), decidable from declared modes alone.
	const agreement = key.e11ReferenceVector.map((reference) => {
		const entry = a0.find((candidate) => candidate.persona === reference.persona)
		if (!entry) throw new Error(`E11 reference vector names ${reference.persona}, which is not a persona in this plan`)
		const agrees =
			reference.label === "HELP"
				? entry.declared === null
				: reference.label === "MATCH"
					? entry.declared === a0Owner
					: entry.declared === reference.declared
		return { persona: reference.persona, expected: reference.label, expectedDeclared: reference.declared, observed: entry.declared, agrees }
	})
	const agrees = agreement.filter((entry) => entry.agrees).length
	const helpCount = a0.filter((entry) => entry.declared === null).length
	const replicated = agrees >= (key.replicationCriterion?.minAgreement ?? 4) && helpCount >= (key.replicationCriterion?.minHelp ?? 2)
	steps.push({
		step: 4,
		id: "replication",
		condition: SEQUENCE.baseline,
		vector: a0,
		agreement,
		agrees,
		helpCount,
		required: `>= ${key.replicationCriterion?.minAgreement ?? 4}/5 agree and HELP >= ${key.replicationCriterion?.minHelp ?? 2}`,
		status: replicated ? "pass" : "stop",
		detail: replicated ? null : `${agrees}/5 agree, HELP ${helpCount}`,
	})
	if (!replicated) {
		return finish(4, REASON.NOT_REPLICATED, { detail: "the cell did not replicate; no cause is named" })
	}

	// Step 5 — ordered causal evaluation, first match wins, later arms NOT RUN.
	const baseHits = new Set(a0.filter((entry) => entry.declared === a0Owner).map((entry) => entry.persona))
	const notReached = []
	let matched = null

	for (const arm of SEQUENCE.arms) {
		if (matched !== null) {
			notReached.push(arm.cause)
			continue
		}
		const owner = ownerFor(key, arm.condition)
		const vector = vectorOf(index, arm.condition, 1, key)
		const hits = new Set(vector.filter((entry) => entry.declared === owner).map((entry) => entry.persona))
		const gains = [...hits].filter((persona) => !baseHits.has(persona))
		const losses = [...baseHits].filter((persona) => !hits.has(persona))
		const isMatch = gains.length >= 3 && losses.length === 0
		steps.push({
			step: 5,
			id: `cause-${arm.cause}`,
			condition: arm.condition,
			expectedOwner: owner,
			vector,
			gains,
			losses,
			status: isMatch ? "match" : "no-match",
			detail: isMatch
				? `${gains.length} personas moved to a key hit and none moved away`
				: `${gains.length} gained, ${losses.length} lost (needs >= 3 gained and no loss)`,
		})
		if (isMatch) matched = arm
	}

	if (matched) {
		return finish(5, REASON.FIRST_MATCH, {
			matchedCause: matched.cause,
			matchedCondition: matched.condition,
			armsNotReached: notReached,
			detail: `first match wins: ${matched.cause} (${matched.condition}); later arms are NOT RUN, never negative results`,
		})
	}

	return finish(5, REASON.N_UNEXPLAINED, {
		matchedCause: null,
		armsNotReached: [],
		detail:
			"no arm met its criterion: N — unexplained at this instrument. The candidate set is non-exhaustive; " +
			"T (routing-line terseness) is untested by this registration, and S was withdrawn, not refuted.",
	})
}

/** The plan's call arithmetic, from the run list rather than from a comment. */
export function printPlanArithmetic(runs) {
	const counts = new Map()
	for (const run of runs) counts.set(run.condition, (counts.get(run.condition) ?? 0) + 1)
	const parts = [...counts.entries()]
	const materialised = runs.length
	const steps04 = (counts.get(SEQUENCE.control) ?? 0) + (counts.get(SEQUENCE.baseline) ?? 0) + (counts.get(SEQUENCE.contrast) ?? 0) + (counts.get(SEQUENCE.placebo) ?? 0)
	const step5 = SEQUENCE.arms.reduce((sum, arm) => sum + (counts.get(arm.condition) ?? 0), 0)
	const armCalls = SEQUENCE.arms.map((arm) => counts.get(arm.condition) ?? 0)
	const minimum = steps04 + Math.min(...armCalls)
	console.log(`arithmetic: ${parts.map(([condition, count]) => `${condition} ${count}`).join(" + ")} = ${materialised} materialised`)
	console.log(`  §A2.6: steps 0-4 = ${steps04} calls; step 5 = ${step5} calls at most (${armCalls.join(" + ")}), stopping at the first match`)
	console.log(`  executable range: ${minimum} minimum (stop at ${SEQUENCE.arms[0].cause}), ${materialised} maximum (all three arms)`)
}
