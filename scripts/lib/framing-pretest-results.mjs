/**
 * framing-pretest-results.mjs — the three observations E12's I-2 adds to a
 * result record: `finishReason`, `language`, `echoed`.
 *
 * WHY THESE THREE, AND WHY THEY ARE OBSERVATIONS RATHER THAN VERDICTS
 *   `finishReason` makes truncation visible: the registration's edge-case table
 *   says `MAX_TOKENS` is INVALID and must never be partially scored, which is
 *   only enforceable if the value is recorded. It comes from the runner's usage
 *   sidecar (`attempts[last].finishReason`) because the harness never speaks the
 *   provider protocol itself; a run with no sidecar records `null`, which is the
 *   honest state and not "STOP".
 *   `language` makes code-switching visible rather than assumed absent (persona
 *   P5 may induce it).
 *   `echoed` flags the registered edge case where a response reproduces the
 *   picker line instead of naming a mode.
 *
 * WHAT IS NOT TOUCHED
 *   `status`, `reason` and the transcript hash stay exactly as the runner
 *   produced them. Nothing here can turn an UNRUN into anything else.
 *
 * THE LANGUAGE RULE, STATED SO IT CAN BE ARGUED WITH
 *   Script alone does not identify a language. The rule is therefore deliberately
 *   weak and one-sided: if at least 95% of the letters in the transcript are
 *   Latin-script letters, the record says `en`; if there are no letters at all,
 *   or non-Latin letters exceed 5%, it says `und` (ISO 639-2, "undetermined").
 *   `und` is a refusal to guess, not a claim that the text is in no language.
 *   It cannot distinguish Japanese from Chinese from Korean, and it is not
 *   intended to: the registered use is "language reported per arm", and a
 *   non-Latin script is all that needs to be visible.
 *
 * No dependencies. Node 22 ESM.
 */

import * as fs from "node:fs/promises"
import * as path from "node:path"

import { pickerLine, sha256 } from "./framing-pretest.mjs"

/**
 * A finish reason that is neither `STOP` nor absent means the answer text may be
 * incomplete, so it is INVALID and never partially scored (registration §6).
 *
 * Objection 17: this used to be recorded and never enforced, so a truncated
 * answer with exit 0 and a non-empty file was bundled and scored. The gate is
 * `!== STOP && !== null` rather than `=== MAX_TOKENS` because RECITATION,
 * SAFETY and every future reason fail the same way: the provider stopped before
 * finishing. `undefined` is treated as absent, like `null`, because a sidecar
 * without the field says nothing about truncation.
 */
export function isTruncatedFinishReason(finishReason) {
	return finishReason !== null && finishReason !== undefined && finishReason !== "STOP"
}

/** Below this share of Latin letters the record refuses to name a language. */
const LATIN_DOMINANCE = 0.95

const LATIN = /\p{Script=Latin}/gu
const LETTER = /\p{L}/gu

/** Crude script-based detector. Returns `en`, `und`, or `null` when there is no transcript. */
export function detectLanguage(text) {
	if (text === null || text === undefined) return null
	const letters = text.match(LETTER)
	if (!letters || letters.length === 0) return "und"
	const latin = (text.match(LATIN) ?? []).length
	return latin / letters.length >= LATIN_DOMINANCE ? "en" : "und"
}

/**
 * `true` when the transcript reproduces one of its own picker lines verbatim —
 * the registered `echo` edge case. The picker line is the whole
 * `- slug — Name — whenToUse` string, so a response that merely mentions a slug
 * is not an echo.
 *
 * Objection 16: this detector and the rubric previously named two different
 * strings (one with the leading bullet, one without), so "a high echo rate"
 * named two quantities. Both now render through `pickerLine`, and the rubric
 * quotes that rendering, so the flag and the scorer's definition are one string.
 */
export function detectEcho(text, modes) {
	if (text === null || text === undefined) return false
	return modes.some((mode) => text.includes(pickerLine(mode)))
}

/**
 * Read `finishReason` from the usage sidecar the runner writes. Directories are
 * tried in order; the first sidecar found wins. No sidecar, no value: `null`.
 */
export async function readFinishReason(usageDirs, runId) {
	for (const dir of usageDirs) {
		const candidate = path.join(dir, `usage-${runId}.json`)
		let raw
		try {
			raw = await fs.readFile(candidate, "utf-8")
		} catch {
			continue
		}
		try {
			const sidecar = JSON.parse(raw)
			const attempts = Array.isArray(sidecar.attempts) ? sidecar.attempts : []
			const last = attempts[attempts.length - 1]
			return last?.finishReason ?? null
		} catch {
			return null
		}
	}
	return null
}

/**
 * Read the transcript a run produced, or `null`. The file path is the runner's
 * own convention (`transcripts/<runId>.txt`); a missing file is not repaired.
 */
export async function readTranscript(transcriptDir, runId) {
	try {
		return await fs.readFile(path.join(transcriptDir, `${runId}.txt`), "utf-8")
	} catch {
		return null
	}
}

/**
 * One `results.jsonl` record.
 *
 * The runner's own fields are spread in UNCHANGED — `status`, `reason`, the exit
 * code and the transcript hash are the runner's report and this function must not
 * be able to revise them. Everything after the spread is an observation added by
 * I-2. `condition` and `repetition` are present only for a plan-driven run, so an
 * E11 record keeps its original shape.
 */
export function buildResultRecord({ run, opts, temperature, repetitions, outcome, finishReason, transcriptText, modes }) {
	const truncated = isTruncatedFinishReason(finishReason)
	return {
		runId: run.runId,
		condition: run.condition ?? null,
		persona: run.persona.id,
		personaCondition: run.persona.condition,
		brief: run.brief.id,
		repetition: run.repetition ?? 1,
		repetitions,
		catalogue: run.catalogue,
		model: opts.model,
		provider: opts.provider,
		temperature,
		blindSeed: opts.blindSeed,
		promptSha256: sha256(run.text),
		// The runner's own verdict is preserved verbatim, so the enforcement below
		// can be audited rather than taken on trust.
		runnerStatus: outcome.status,
		...outcome,
		// Only ever narrows: a RUN whose finish reason is not STOP becomes INVALID.
		// Nothing here can turn an INVALID or an UNRUN into a RUN.
		...(truncated && outcome.status === "RUN"
			? {
					status: "INVALID",
					reason: `finishReason ${finishReason} is not STOP: the answer is truncated and must never be partially scored`,
				}
			: {}),
		finishReason,
		language: detectLanguage(transcriptText),
		echoed: detectEcho(transcriptText, modes),
		scoring: "NOT SCORED — the harness has no rubric and emits no verdict",
	}
}
