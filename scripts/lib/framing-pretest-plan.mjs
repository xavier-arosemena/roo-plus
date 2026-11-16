/**
 * framing-pretest-plan.mjs — the plan described by data (I-1), under Amendment 2.
 *
 * WHY THE PLAN IS A FILE
 *   E11's harness hard-coded `5 personas × 3 briefs × 2 catalogues`. E12 is
 *   material-variant based, so every condition is a `.roomodes` fixture with its
 *   own brief and its own repetition count. Encoding that in code would make each
 *   condition a code change; encoding it in JSON makes the run a document that
 *   can be reviewed before it is executed.
 *
 * WHAT IS VALIDATED RATHER THAN TRUSTED
 *   1. Persona directives must be byte-identical to the frozen `PERSONAS`
 *      constant, so an edited plan cannot silently become a different experiment.
 *   2. Registered brief texts must be byte-identical to `BRIEFS` (`B1`, `B3`) or
 *      to `REGISTERED_B3P` (amendment 2 §A2.4). Objection 21: `B3P` used to be
 *      accepted unvalidated, so A4's brief could drift from the registration.
 *   3. A condition marked `"status": "not-run"` is NOT silently included. It is
 *      returned in `notRun` with its registered reason, and asking to execute it
 *      throws. This is how A3 (§A2.3, S withdrawn) is refused rather than run.
 *   4. Fixtures must resolve inside `test-fixtures/`. A plan is data; it must not
 *      be able to make the harness read `.env` or any other file.
 *   5. Every fixture is parsed by the strict parser, so a malformed fixture
 *      refuses the batch instead of emitting a partial prompt.
 *
 * REPETITIONS ARE OUTERMOST
 *   Objection 19: repeats used to be emitted consecutively, which is the
 *   arrangement most likely to hide non-determinism behind provider-side caching.
 *   The loop below draws every condition once, then every condition that has a
 *   second draw, and so on, so two identical prompts are never adjacent.
 *
 * No dependencies. Node 22 ESM.
 */

import * as fs from "node:fs/promises"
import * as path from "node:path"

import { BRIEFS, PERSONAS, REGISTERED_B3P, ROOT, parseRoomodes } from "./framing-pretest.mjs"

/** Every fixture a plan may reference must live under this directory. */
const FIXTURE_ROOT = path.join(ROOT, "test-fixtures")

const CONDITION_ID = /^[A-Za-z0-9][A-Za-z0-9_-]*$/

function frozenBrief(id) {
	if (id === REGISTERED_B3P.id) return REGISTERED_B3P.text
	const brief = BRIEFS.find((candidate) => candidate.id === id)
	if (!brief) return null
	return brief.text
}

function assertPersonas(personas) {
	if (!Array.isArray(personas) || personas.length !== PERSONAS.length) {
		throw new Error(`plan.personas must list exactly ${PERSONAS.length} personas`)
	}
	for (const [index, frozen] of PERSONAS.entries()) {
		const given = personas[index]
		if (!given || given.id !== frozen.id) {
			throw new Error(`plan.personas[${index}] must be ${frozen.id}, got ${given?.id ?? "(missing)"}`)
		}
		if (given.directive !== frozen.directive) {
			throw new Error(
				`plan.personas[${index}] (${frozen.id}) directive differs from the frozen E11 directive.\n` +
					`  plan:   ${JSON.stringify(given.directive)}\n  frozen: ${JSON.stringify(frozen.directive)}`,
			)
		}
		if (given.condition !== frozen.condition) {
			throw new Error(`plan.personas[${index}] (${frozen.id}) condition label differs from the frozen one`)
		}
	}
}

function assertBrief(condition) {
	if (typeof condition.brief !== "string" || condition.brief.trim() === "") {
		throw new Error(`condition ${condition.id}: brief must be a non-empty string`)
	}
	const expected = frozenBrief(condition.briefId)
	// Every brief id in this instrument is a registered one. An unknown id is a
	// plan defect, not licence to invent text: a paraphrase that is not in the
	// registration is exactly the class of change a registration exists to stop.
	if (expected === null) {
		throw new Error(
			`condition ${condition.id}: brief id ${JSON.stringify(condition.briefId)} is not a registered brief ` +
				`(expected one of ${[...BRIEFS.map((brief) => brief.id), REGISTERED_B3P.id].join(", ")})`,
		)
	}
	if (condition.brief !== expected) {
		throw new Error(
			`condition ${condition.id}: brief is declared ${condition.briefId} but is not the registered text.\n` +
				`  plan:       ${JSON.stringify(condition.brief)}\n  registered: ${JSON.stringify(expected)}`,
		)
	}
}

function assertRepetitions(value, where) {
	if (!Number.isInteger(value) || value < 1) throw new Error(`${where} must be an integer >= 1`)
	return value
}

/**
 * Load and validate a plan file.
 *
 * `only` names the conditions the caller intends to execute; a request for a
 * not-run condition throws instead of being quietly dropped. Without `only`
 * every runnable condition is returned and the not-run ones are reported.
 */
export async function loadPlan(planPath, { only = null } = {}) {
	const absolute = path.resolve(ROOT, planPath)
	const plan = JSON.parse(await fs.readFile(absolute, "utf-8"))

	if (!Array.isArray(plan.conditions) || plan.conditions.length === 0) {
		throw new Error("plan.conditions must be a non-empty array")
	}
	assertPersonas(plan.personas)

	const defaultRepetitions = assertRepetitions(plan.repetitions ?? 1, "plan.repetitions")

	const requested = only === null ? null : new Set(only)
	const seen = new Set()
	const conditions = []
	const notRun = []

	for (const raw of plan.conditions) {
		if (typeof raw.id !== "string" || !CONDITION_ID.test(raw.id)) throw new Error(`bad condition id ${JSON.stringify(raw.id)}`)
		if (seen.has(raw.id)) throw new Error(`duplicate condition id ${raw.id}`)
		seen.add(raw.id)
		if (typeof raw.fixture !== "string" || raw.fixture === "") throw new Error(`condition ${raw.id}: missing fixture`)
		if (typeof raw.briefId !== "string" || raw.briefId === "") throw new Error(`condition ${raw.id}: missing briefId`)
		if (raw.status !== undefined && raw.status !== "not-run") {
			throw new Error(`condition ${raw.id}: unknown status ${JSON.stringify(raw.status)} (only "not-run" is defined)`)
		}
		assertBrief(raw)

		const repetitions = assertRepetitions(raw.repetitions ?? defaultRepetitions, `condition ${raw.id}: repetitions`)

		if (raw.status === "not-run") {
			const reason = typeof raw.notRunReason === "string" ? raw.notRunReason : "(no reason recorded)"
			if (requested !== null && requested.has(raw.id)) {
				throw new Error(`condition ${raw.id} is marked not-run and cannot be executed: ${reason}`)
			}
			notRun.push({ id: raw.id, reason, fixture: raw.fixture, briefId: raw.briefId, repetitions })
			continue
		}

		const file = path.resolve(ROOT, raw.fixture)
		if (!file.startsWith(FIXTURE_ROOT + path.sep)) {
			throw new Error(`condition ${raw.id}: fixture ${raw.fixture} is outside test-fixtures/`)
		}
		const modes = parseRoomodes(await fs.readFile(file, "utf-8"), `${raw.id}.roomodes`)
		conditions.push({
			id: raw.id,
			role: raw.role ?? null,
			fixture: raw.fixture,
			file,
			modes,
			repetitions,
			brief: { id: raw.briefId, text: raw.brief },
		})
	}

	if (requested !== null) {
		for (const id of requested) {
			if (!seen.has(id)) throw new Error(`condition ${id} is not in the plan`)
		}
	}
	if (conditions.length === 0) throw new Error("plan has no runnable condition")

	return {
		source: path.relative(ROOT, absolute),
		instrument: plan.instrument ?? null,
		registration: plan.registration ?? null,
		amendment: plan.amendment ?? null,
		conditions,
		notRun,
		personas: PERSONAS.map((persona) => ({ ...persona })),
		repetitions: Math.max(...conditions.map((condition) => condition.repetitions)),
	}
}

/**
 * The catalogue set a plan describes, in the shape `assignLabels` expects. The
 * `frame` key is the CONDITION id; it is a bookkeeping name and never reaches a
 * prompt — the emitted picker is the fixture's own text.
 */
export function planCatalogues(plan) {
	const map = new Map()
	for (const condition of plan.conditions) {
		map.set(condition.id, { frame: condition.id, file: condition.file, modes: condition.modes })
	}
	return map
}

export function conditionRepetitions(plan, override = null) {
	const map = new Map()
	for (const condition of plan.conditions) {
		map.set(condition.id, override ?? condition.repetitions)
	}
	return map
}

/**
 * One run per condition × repetition × persona, with the repetition loop
 * outermost so identical prompts are never adjacent.
 *
 * The run id encodes all three (`A0-P1-r2`) so a later reader can tell a single
 * draw from a repeat without consulting the plan, and so two repetitions of the
 * same cell are never mistaken for two different cells.
 */
export function planRunsFromPlan(plan, labelled, repetitions = null) {
	const byConditionId = new Map(labelled.map((catalogue) => [catalogue.frame, catalogue]))
	const counts = conditionRepetitions(plan, repetitions)
	const maxRepetitions = Math.max(...counts.values())
	const runs = []

	for (let repetition = 1; repetition <= maxRepetitions; repetition++) {
		for (const condition of plan.conditions) {
			if (counts.get(condition.id) < repetition) continue
			const catalogue = byConditionId.get(condition.id)
			if (!catalogue) throw new Error(`condition ${condition.id} has no blind label`)
			for (const persona of plan.personas) {
				runs.push({
					runId: `${condition.id}-${persona.id}-r${repetition}`,
					condition: condition.id,
					persona,
					brief: condition.brief,
					repetition,
					catalogue: catalogue.label,
				})
			}
		}
	}

	return runs
}
