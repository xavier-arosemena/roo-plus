/**
 * framing-pretest-output.mjs — every file the framing pretest harness writes.
 *
 * WHY THE WRITERS ARE SEPARATED FROM THE HARNESS
 *   The set of files is the instrument's artefact, and one of them is a secret
 *   (the blind map). Keeping the whole set in one module makes it auditable at a
 *   glance: six files, four of them safe to read, one of them forbidden to
 *   scorers, and results.jsonl which only exists when something actually ran.
 *
 * NOTHING HERE IS TIMESTAMPED INSIDE A PROMPT
 *   `plan.json` and the report carry a `generatedAt`/`checkedAt`; the prompts and
 *   the blind map do not, so repeated dry-runs are byte-identical. That property
 *   is how the operator proves the instrument did not drift between invocations.
 *
 * STILL TRUE WHEN THE PLAN COMES FROM A FILE
 *   A plan-driven run records the plan path, its condition table and `k`, because
 *   a later reader has to be able to tell a single draw from a repeat (I-3). The
 *   condition table names arm letters, so `plan.json` remains a file that must
 *   never reach a scorer — `scripts/build-scorer-bundle.mjs` exists for that.
 *
 * No dependencies. Node 22 ESM.
 */

import * as fs from "node:fs/promises"
import * as path from "node:path"

import { BRIEFS, sha256 } from "./framing-pretest.mjs"

export async function pathExists(target) {
	try {
		await fs.stat(target)
		return true
	} catch {
		return false
	}
}

export function byteStats(sizes) {
	const sorted = [...sizes].sort((a, b) => a - b)
	const total = sizes.reduce((sum, size) => sum + size, 0)
	return { min: sorted[0], max: sorted[sorted.length - 1], mean: Math.round((total / sizes.length) * 100) / 100 }
}

async function writeJson(target, value) {
	await fs.writeFile(target, JSON.stringify(value, null, 2) + "\n", "utf-8")
}

/**
 * The prompts and the brief set they were built from. `briefs` defaults to the
 * three registered E11 briefs; a plan file supplies its own set (E12 adds the A4
 * paraphrase and reuses B1 for C1).
 */
export async function writeMaterial(out, runs, { briefs = BRIEFS } = {}) {
	await fs.mkdir(path.join(out, "prompts"), { recursive: true })
	await fs.mkdir(path.join(out, "transcripts"), { recursive: true })

	await writeJson(path.join(out, "briefs.json"), {
		note: "Verbatim brief texts. Reused across personas; never rewritten per run.",
		briefs: briefs.map((brief) => ({ ...brief, sha256: sha256(brief.text) })),
	})

	for (const run of runs) {
		await fs.writeFile(path.join(out, "prompts", `${run.runId}.txt`), run.text, "utf-8")
	}
}

/**
 * The run table. Blind labels only — no frame name may appear here, and in
 * plan mode the condition ids live here so that they do not live in a bundle.
 *
 * `repetitions` is now per condition (A0 is drawn three times, every other
 * condition once), so the plan records each condition's own count as well as the
 * maximum. A reader can therefore tell a single draw from a repeat without the
 * plan file, which is what I-3 requires.
 */
export async function writePlan(out, { runs, labelled, opts, temperature, plan = null, repetitions = 1 }) {
	const planMode = plan !== null
	const notRun = plan?.notRun ?? []
	await writeJson(path.join(out, "plan.json"), {
		instrument: plan?.instrument ?? "agent framing pretest",
		registration: plan?.registration ?? "docs/reviews/2026-11-09-frame-decision-preregistration.md",
		registrationAmendment: planMode ? (plan?.amendment ?? null) : 5,
		design: planMode
			? `${plan.conditions.length} executable conditions × ${plan.personas.length} personas, per-condition repetitions (max ${repetitions}) = ${runs.length} runs`
			: "5 personas × 3 briefs × 2 catalogues = 30 runs",
		planFile: plan?.source ?? null,
		repetitions,
		blindSeed: opts.blindSeed,
		temperature,
		provider: opts.provider || null,
		model: opts.model || null,
		catalogueLabels: labelled.map((catalogue) => catalogue.label),
		...(planMode
			? {
					conditions: plan.conditions.map((condition) => ({
						id: condition.id,
						role: condition.role,
						fixture: condition.fixture,
						modes: condition.modes.length,
						repetitions: condition.repetitions,
						briefId: condition.brief.id,
						briefSha256: sha256(condition.brief.text),
						label: labelled.find((catalogue) => catalogue.frame === condition.id)?.label ?? null,
					})),
					notRun: notRun.map((entry) => ({ id: entry.id, briefId: entry.briefId, reason: entry.reason })),
				}
			: {}),
		generatedAt: new Date().toISOString(),
		runs: runs.map((run) => ({
			runId: run.runId,
			...(run.condition === undefined ? {} : { condition: run.condition }),
			...(run.repetition === undefined ? {} : { repetition: run.repetition }),
			persona: run.persona.id,
			personaCondition: run.persona.condition,
			brief: run.brief.id,
			catalogue: run.catalogue,
			prompt: `prompts/${run.runId}.txt`,
			promptBytes: Buffer.byteLength(run.text, "utf8"),
			promptSha256: sha256(run.text),
		})),
	})
}

/** The label → frame mapping. Scorers must not open this file. */
export async function writeBlindMap(out, { labelled, seed }) {
	await writeJson(path.join(out, "_blind-map.json"), {
		warning: "SCORERS MUST NOT OPEN THIS FILE. It maps the blind labels to the frame names.",
		blindSeed: seed,
		algorithm: "labels assigned by ascending sha256(frame + blindSeed)",
		labels: labelled.map((catalogue) => ({
			label: catalogue.label,
			frame: catalogue.frame,
			source: path.relative(path.dirname(out), catalogue.file),
			modes: catalogue.modes.length,
		})),
	})
}

export async function writeReport(out, report) {
	await writeJson(path.join(out, "blindness-report.json"), report)
}
