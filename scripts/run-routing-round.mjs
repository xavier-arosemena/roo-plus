#!/usr/bin/env node

/**
 * run-routing-round.mjs — the executor for the two registered routing sweeps:
 * the closing round's Stage 1 (E13-R, 600 calls) and E20/E20b (900 and 200 calls,
 * `docs/reviews/2026-11-13-e20-preregistration.md` as amended).
 *
 * WHY THIS FILE EXISTS
 *   `scripts/run-framing-pretest.mjs` reads a DIFFERENT plan schema (`conditions`,
 *   each naming a fixture and a brief), so pointing it at a routing plan fails
 *   with `plan.conditions must be a non-empty array`. This file is the executor
 *   for both routing shapes, and it is deliberately thin: the plan is data, the
 *   runner is an operator-supplied shell command, and every verdict belongs to
 *   `executeRun` from `scripts/lib/framing-pretest-runner.mjs`.
 *
 * THE EXPECTED NUMBER OF CALLS COMES FROM THE PLAN (E20 Amendment 1 §7)
 *   The closing round's 600 is a registered constant and stays one. E20 has 900
 *   calls and E20b has 200, so for those the expected total is the plan's own
 *   registered structure: `cycle.length × cycles`. A plan that has lost entries
 *   therefore fails against its own declared total, and the full-set interleaving
 *   proof is gated on that derived number rather than on a constant that belongs
 *   to a closed round. The two plan shapes are named, not sniffed: a plan states
 *   `"planSchema": "e20/1"`, and a plan without that field is the closing round's
 *   `runs` schema.
 *
 * WHAT IT REFUSES TO TRUST
 *   1. The plan is validated before anything is written or executed. Closing
 *      round: 600 entries, 100 per label, six labels, six unique prompt hashes,
 *      draw-major interleaving. E20/E20b: entries equal to the cycle × repeats,
 *      the registered cycle verbatim, the registered draws per arm, and no
 *      registered line text anywhere in the plan. Both: no cell identifier, no
 *      arm letter as a label, and no fragment of the sealed answer key.
 *   2. The plan is then checked against the live derivation. Every entry's
 *      `runId`, `label`, `draw`, `briefId`, `promptSha256` and `promptBytes` (and
 *      E20's `cyclePosition`) must match the pickers and prompts this file
 *      rebuilds from the fixtures. A drifted picker therefore fails the batch
 *      instead of running prompts that are no longer the registered material.
 *
 * WHAT IT WRITES
 *   <out>/prompts/<runId>.txt        the selected prompts, byte-identical to the plan
 *   <out>/plan.json                  a byte-identical copy of the plan it validated
 *   <out>/results.jsonl              every completed run, appended as it completes
 *                                    (not written by --dry-run)
 *   <out>/transcripts/<runId>.txt    whatever the runner wrote — never synthesised
 *
 * RESULTS STREAM, AND DRIFT IS CAUGHT WHERE IT HAPPENS
 *   results.jsonl is truncated once before the loop and every record is appended as
 *   its call completes, so a crash or Ctrl-C can never discard calls already paid
 *   for. Immediately before each append the record is checked against the record
 *   that precedes it: consecutive calls must carry different labels and must not
 *   overlap in time. A violation throws at that call, naming its index, both labels
 *   and both timestamps, and leaves every earlier record on disk. The full-set
 *   assertInterleaved() proof still runs at the end of a complete batch; the
 *   per-record check is its early warning, not its replacement. The proof requires
 *   only that consecutive labels differ and that calls do not overlap — never a
 *   two-way alternation — so E20's nine-call `A B C B C B C B C` cycle satisfies it
 *   (899 transitions across 900 calls) exactly as the closed round's six-way cycle
 *   did (599 across 600).
 *
 * `finishReason` IS ENFORCED HERE, NOT MERELY RECORDED (Guard 4 / R-2)
 *   The value comes from the runner's usage sidecar. Any value other than `STOP`
 *   or absent forces `status: "INVALID"` and the runner's own verdict is kept in
 *   `runnerStatus`, so the enforcement can be audited rather than taken on trust.
 *   A truncated run leaves its cell's denominator; it is never counted as a miss,
 *   and its text is not placed in `response`, so it cannot later be scored by
 *   accident.
 *
 * DRY-RUN IS THE DEFAULT
 *   The honest state of an unexercised instrument is UNRUN. `--run` must be given
 *   explicitly, together with `--runner` and `--model`; with neither flag the
 *   batch is built and written and nothing is executed.
 *
 * EXIT STATUS
 *   0  the batch completed (RUN / UNRUN / INVALID), or a dry-run wrote its material
 *   2  a precondition failed: bad arguments, an invalid plan, a plan that no longer
 *      matches the derivation, or a run directory that already holds results
 *
 * No dependencies. Node 22 ESM.
 */

import * as fs from "node:fs/promises"
import * as os from "node:os"
import path from "node:path"
import { pathToFileURL } from "node:url"

import {
	E20_LINES,
	E20_PLAN_SCHEMA,
	buildExperimentSet,
	buildRuns as buildE20Runs,
	experimentSpec,
	labelArms,
} from "./lib/e20.mjs"
import { executeRun } from "./lib/framing-pretest-runner.mjs"
import { readTranscript } from "./lib/framing-pretest-results.mjs"
import { sha256 } from "./lib/framing-pretest.mjs"
import {
	ARTEFACT_FIXTURE_PATH,
	AXIS_FIXTURE_PATH,
	CELLS,
	DRAWS_PER_CELL,
	DEFAULT_BLIND_SEED,
	PARSER_VERSION,
	ROUTING_ROUND_DIR,
	TEMPERATURE,
	assertInterleaved,
	assertRoundRobin,
	buildFixtureSet,
	buildRuns,
	labelCells,
} from "./lib/routing-round.mjs"

const DEFAULT_PLAN = path.join(ROUTING_ROUND_DIR, "plan.json")
const DEFAULT_OUT = path.join(os.tmpdir(), "roo-plus-routing-round", "stage-1")

/**
 * The closing round's registered total. It is a constant because that registration
 * is closed and its 600 calls are fixed; no other plan shape may use it. E20 and
 * E20b take their total from the plan (`planShape` / `registeredTotal`).
 *
 * The E20 base picker is the closing round's C1 picker, which already carries
 * `explain` with the IN line at index 6 (registration §2.1).
 */
const CLOSED_ROUND_RUNS = CELLS.length * DRAWS_PER_CELL
const C1_PICKER_PATH = path.join(ROUTING_ROUND_DIR, "C1.roomodes")

/** Literals that would mean the plan had leaked the sealed analysis key. */
const SEALED_TOKENS = ["expectedOwner", "slugs", "sealed", "answer-key", "answerKey", "blindSeedMap"]

const USAGE = `Usage: node scripts/run-routing-round.mjs [options]

  --plan <file.json>   the run plan: the closing round's 600, E20's 900 or E20b's 200
                       (default: ${path.relative(process.cwd(), DEFAULT_PLAN)})
  --out <dir>          run directory (default: ${DEFAULT_OUT})
  --dry-run            write the selected prompts and a plan copy; execute nothing (default)
  --run                execute the selected runs through --runner; requires --runner and --model
  --runner <template>  shell command template (required with --run); placeholders:
                       %PROMPT_FILE% %OUT_FILE% %MODEL% %TEMPERATURE% %RUN_ID%
                       %TRANSCRIPT_DIR%
  --model <id>         model id passed to the runner and recorded (required with --run)
  --only <label>       execute only this blind label (CELL-n or ARM-n): a bounded trial
  --limit <n>          execute at most the first n selected plan entries: a smoke batch
  --usage-dir <dir>    where the runner's usage-<runId>.json sidecars are read from
                       (default: <out>/transcripts)
  --force              overwrite a run directory that already holds results.jsonl
  --help               print this text
`

function parseArgs(argv) {
	const opts = {
		plan: DEFAULT_PLAN,
		out: DEFAULT_OUT,
		run: false,
		runner: "",
		model: "",
		only: null,
		limit: null,
		usageDir: "",
		force: false,
		help: false,
	}

	for (let index = 0; index < argv.length; index++) {
		const arg = argv[index]
		const value = () => {
			const next = argv[++index]
			if (next === undefined) throw new Error(`${arg} needs a value`)
			return next
		}
		if (arg === "--dry-run") opts.run = false
		else if (arg === "--run") opts.run = true
		else if (arg === "--plan") opts.plan = value()
		else if (arg === "--out") opts.out = value()
		else if (arg === "--runner") opts.runner = value()
		else if (arg === "--model") opts.model = value()
		else if (arg === "--only") opts.only = value()
		else if (arg === "--limit") opts.limit = Number(value())
		else if (arg === "--usage-dir") opts.usageDir = value()
		else if (arg === "--force") opts.force = true
		else if (arg === "--help" || arg === "-h") opts.help = true
		else throw new Error(`unknown argument: ${arg}`)
	}

	return opts
}

/** Arguments that are wrong in either mode, checked before any file is read. */
function argumentErrors(opts) {
	const errors = []
	if (opts.limit !== null && (!Number.isInteger(opts.limit) || opts.limit < 1)) {
		errors.push("--limit must be an integer >= 1")
	}
	if (opts.run && !opts.runner) errors.push("--runner is required with --run")
	if (opts.run && !opts.model) errors.push("--model is required with --run")
	if (!opts.run && opts.runner) errors.push("--runner was given without --run: nothing would be executed")
	return errors
}

function pad(text, width) {
	return String(text).padEnd(width)
}

async function readIfExists(target) {
	try {
		return await fs.readFile(target, "utf-8")
	} catch {
		return null
	}
}

async function loadPlan(planPath) {
	const raw = await readIfExists(path.resolve(planPath))
	if (raw === null) throw new Error(`cannot read the plan at ${planPath}`)
	try {
		return { plan: JSON.parse(raw), raw }
	} catch (error) {
		throw new Error(`${planPath} is not JSON: ${error.message}`)
	}
}

/**
 * Which registered plan shape this is. Named rather than sniffed: E20 states its
 * schema, and the closing round's plan predates the field and is identified by its
 * `runs` array. Anything else is refused rather than guessed at.
 */
export function planShape(plan) {
	if (plan?.planSchema === E20_PLAN_SCHEMA) return "e20"
	if (plan?.planSchema === undefined) {
		if (Array.isArray(plan?.runs)) return "closed-round"
		throw new Error("the plan has neither a planSchema nor a runs array: it is not a registered routing plan")
	}
	throw new Error(
		`unknown planSchema ${JSON.stringify(plan.planSchema)}; this executor reads the closing round's runs plan ` +
			`(no planSchema) and ${E20_PLAN_SCHEMA}`,
	)
}

/**
 * The number of calls this plan registers.
 *
 * The closing round's is its registered constant. E20 and E20b declare their own
 * structure — the registered cycle and how many times it repeats — and Amendment 1
 * §7 requires the executor to take the total from the plan rather than from the
 * closed round's 600. `null` means the plan declares no usable total; the
 * validator has already named why.
 */
export function registeredTotal(plan, shape) {
	if (shape === "closed-round") return CLOSED_ROUND_RUNS
	const cycle = Array.isArray(plan?.cycle) ? plan.cycle : []
	const cycles = plan?.cycles
	if (cycle.length === 0 || !Number.isInteger(cycles) || cycles < 1) return null
	return cycle.length * cycles
}

/** No cell name, and no fragment of a sealed answer key, may travel with the material. */
function hygieneProblems(plan) {
	const problems = []
	const text = JSON.stringify(plan)
	if (/\bC[1-6]\b/.test(text)) problems.push("a cell identifier (C1…C6) appears in the plan")
	if (/"cell"\s*:/.test(text)) problems.push('a "cell" field appears in the plan')
	for (const token of SEALED_TOKENS) {
		if (text.includes(token))
			problems.push(`sealed analysis-key field ${JSON.stringify(token)} appears in the plan`)
	}
	return problems
}

/** Dispatch, so each shape is validated by the registration it belongs to. */
function validatePlan(plan, shape) {
	return shape === "e20" ? validateE20Plan(plan) : validateClosedRoundPlan(plan)
}

/**
 * Structural and hygiene validation of the closing round's plan, independent of
 * the derivation. Every failure is collected rather than thrown on the first, so
 * an operator sees the whole list in one pass.
 */
function validateClosedRoundPlan(plan) {
	const problems = []
	const runs = Array.isArray(plan?.runs) ? plan.runs : []

	if (runs.length !== CLOSED_ROUND_RUNS) {
		problems.push(
			`runs ${runs.length}, expected ${CLOSED_ROUND_RUNS} (${CELLS.length} cells × ${DRAWS_PER_CELL} draws)`,
		)
	}
	if (plan?.drawsPerCell !== DRAWS_PER_CELL) {
		problems.push(`drawsPerCell ${plan?.drawsPerCell}, expected ${DRAWS_PER_CELL}`)
	}

	const perLabel = new Map()
	const seenIndex = new Set()
	for (const [position, entry] of runs.entries()) {
		if (typeof entry?.label !== "string" || !/^CELL-\d+$/.test(entry.label)) {
			problems.push(`entry ${position + 1} has no blind label (label ${JSON.stringify(entry?.label)})`)
			continue
		}
		perLabel.set(entry.label, (perLabel.get(entry.label) ?? 0) + 1)
		if (entry.index !== position + 1) {
			problems.push(
				`entry ${position + 1} carries index ${JSON.stringify(entry.index)}: the plan is not in order`,
			)
		}
		if (seenIndex.has(entry.index)) problems.push(`index ${entry.index} appears more than once`)
		seenIndex.add(entry.index)
		if (typeof entry.promptSha256 !== "string" || !/^[0-9a-f]{64}$/.test(entry.promptSha256)) {
			problems.push(`entry ${position + 1} has no sha256 prompt hash`)
		}
		if (entry.prompt !== `prompts/${entry.runId}.txt`) {
			problems.push(
				`entry ${position + 1} names prompt ${JSON.stringify(entry.prompt)}, expected prompts/${entry.runId}.txt`,
			)
		}
		if (entry.briefId !== "B1" && entry.briefId !== "B3") {
			problems.push(`entry ${position + 1} names brief ${JSON.stringify(entry.briefId)}, expected B1 or B3`)
		}
	}

	if (perLabel.size !== CELLS.length) {
		problems.push(`${perLabel.size} labels, expected ${CELLS.length}`)
	}
	for (const [label, count] of perLabel) {
		if (count !== DRAWS_PER_CELL) problems.push(`${label} has ${count} runs, expected ${DRAWS_PER_CELL}`)
	}

	const hashes = new Set(runs.map((entry) => entry.promptSha256))
	if (hashes.size !== CELLS.length) {
		problems.push(`${hashes.size} unique prompt hashes, expected ${CELLS.length} (one per cell)`)
	}

	// R-1: the interleaving is the registration's, not merely "some order".
	try {
		assertRoundRobin(runs)
	} catch (error) {
		problems.push(`interleaving: ${error.message}`)
	}

	// R-5: no cell name may travel with the material, and no sealed field may be present.
	problems.push(...hygieneProblems(plan))

	return {
		problems,
		expectedRuns: CLOSED_ROUND_RUNS,
		summary: {
			runs: runs.length,
			labels: perLabel.size,
			expectedLabels: CELLS.length,
			minDraws: Math.min(...perLabel.values()),
			expectedDraws: DRAWS_PER_CELL,
			uniquePromptHashes: hashes.size,
		},
	}
}

/**
 * Structural and hygiene validation of an E20/E20b plan, independent of the
 * derivation. The total is the plan's own (`registeredTotal`), and the registered
 * cycle, draws per arm and brief are checked as the registration states them.
 */
function validateE20Plan(plan) {
	const problems = []
	let spec = null
	try {
		spec = experimentSpec(plan?.experiment)
	} catch (error) {
		problems.push(error.message)
	}

	const entries = Array.isArray(plan?.entries) ? plan.entries : []
	const cycle = Array.isArray(plan?.cycle) ? plan.cycle : []
	const cycles = plan?.cycles
	const expectedRuns = registeredTotal(plan, "e20")

	if (expectedRuns === null) {
		problems.push(
			`the plan declares no cycle total (cycle ${JSON.stringify(cycle)}, cycles ${JSON.stringify(cycles)})`,
		)
	} else if (entries.length !== expectedRuns) {
		problems.push(`entries ${entries.length}, expected ${expectedRuns} (${cycle.length}-call cycle × ${cycles})`)
	}

	if (spec) {
		if (JSON.stringify(cycle) !== JSON.stringify(spec.cycle)) {
			problems.push(`cycle ${JSON.stringify(cycle)} is not the registered cycle ${JSON.stringify(spec.cycle)}`)
		}
		for (const arm of spec.arms) {
			if (plan?.drawsPerArm?.[arm.arm] !== arm.draws) {
				problems.push(
					`drawsPerArm.${arm.arm} is ${JSON.stringify(plan?.drawsPerArm?.[arm.arm])}, expected ${arm.draws}`,
				)
			}
		}
	}

	const perLabel = new Map()
	const seenIndex = new Set()
	for (const [position, entry] of entries.entries()) {
		if (typeof entry?.label !== "string" || !/^ARM-\d+$/.test(entry.label)) {
			problems.push(`entry ${position + 1} has no blind arm id (label ${JSON.stringify(entry?.label)})`)
			continue
		}
		perLabel.set(entry.label, (perLabel.get(entry.label) ?? 0) + 1)
		if (entry.index !== position + 1) {
			problems.push(
				`entry ${position + 1} carries index ${JSON.stringify(entry.index)}: the plan is not in order`,
			)
		}
		if (seenIndex.has(entry.index)) problems.push(`index ${entry.index} appears more than once`)
		seenIndex.add(entry.index)
		if (typeof entry.promptSha256 !== "string" || !/^[0-9a-f]{64}$/.test(entry.promptSha256)) {
			problems.push(`entry ${position + 1} has no sha256 prompt hash`)
		}
		if (entry.prompt !== `prompts/${entry.runId}.txt`) {
			problems.push(
				`entry ${position + 1} names prompt ${JSON.stringify(entry.prompt)}, expected prompts/${entry.runId}.txt`,
			)
		}
		if (!Number.isInteger(entry.draw) || entry.draw < 1) {
			problems.push(`entry ${position + 1} has draw ${JSON.stringify(entry.draw)}, expected an integer >= 1`)
		}
		if (cycle.length > 0) {
			const expectedPosition = (position % cycle.length) + 1
			if (entry.cyclePosition !== expectedPosition) {
				problems.push(
					`entry ${position + 1} is cycle position ${JSON.stringify(entry.cyclePosition)}, expected ${expectedPosition}`,
				)
			}
		}
		if (position > 0 && entries[position - 1].label === entry.label) {
			problems.push(`entries ${position} and ${position + 1} share an arm: the plan is blocked`)
		}
	}

	if (spec && perLabel.size !== spec.arms.length) {
		problems.push(`${perLabel.size} distinct arm ids, expected ${spec.arms.length}`)
	}
	for (const [label, count] of perLabel) {
		if (!Number.isInteger(count) || count < 1) problems.push(`arm id ${label} has ${count} runs`)
	}

	const hashes = new Set(entries.map((entry) => entry.promptSha256))
	if (spec && hashes.size !== spec.arms.length) {
		problems.push(`${hashes.size} unique prompt hashes, expected ${spec.arms.length} (one per arm)`)
	}

	problems.push(...hygieneProblems(plan))
	// A registered line in the plan would tell a scorer which arm is which.
	const planText = JSON.stringify(plan)
	for (const [key, line] of Object.entries(E20_LINES)) {
		if (planText.includes(line)) problems.push(`registered line ${key} appears in the plan`)
	}

	return {
		problems,
		expectedRuns: expectedRuns ?? entries.length,
		summary: {
			runs: entries.length,
			labels: perLabel.size,
			expectedLabels: spec ? spec.arms.length : null,
			minDraws: perLabel.size > 0 ? Math.min(...perLabel.values()) : 0,
			expectedDraws: null,
			drawsPerArm: spec
				? spec.arms.map((arm) => `${arm.arm} ${plan?.drawsPerArm?.[arm.arm] ?? "?"}`).join(" · ")
				: "unknown",
			uniquePromptHashes: hashes.size,
		},
	}
}

/**
 * Rebuild the prompts from the fixtures and require the plan to describe exactly
 * those runs. This is the drift gate: if a picker, a brief or a blind seed has
 * moved since the plan was written, the batch stops here.
 */
async function deriveFromFixtures(plan, shape, problems) {
	return shape === "e20" ? deriveE20FromFixtures(plan, problems) : deriveClosedRoundFromFixtures(plan, problems)
}

async function deriveClosedRoundFromFixtures(plan, problems) {
	const fixtureSet = buildFixtureSet({
		baseText: await fs.readFile(AXIS_FIXTURE_PATH, "utf-8"),
		artefactText: await fs.readFile(ARTEFACT_FIXTURE_PATH, "utf-8"),
	})
	const labelsByCell = labelCells(plan.blindSeed ?? DEFAULT_BLIND_SEED)
	const derived = buildRuns({ fixtureSet, labelsByCell })

	if (plan.persona?.directive !== fixtureSet.persona.directive) {
		problems.push("the plan's persona directive is not the frozen goal-only explorer directive")
	}
	for (const brief of plan.briefs ?? []) {
		if (sha256(brief.text) !== brief.sha256) {
			problems.push(`brief ${brief.id}: the plan's sha256 does not hash its own text`)
		}
	}

	if (derived.length !== plan.runs.length) {
		problems.push(`the derivation produces ${derived.length} runs, the plan holds ${plan.runs.length}`)
		return derived
	}

	const mismatches = []
	for (let index = 0; index < derived.length; index++) {
		const expected = derived[index]
		const actual = plan.runs[index]
		const fields = ["runId", "label", "draw", "briefId", "promptSha256", "promptBytes"]
		for (const field of fields) {
			if (expected[field] !== actual[field]) {
				mismatches.push(
					`index ${index + 1} (${expected.runId}): ${field} is ${JSON.stringify(actual[field])}, derived ${JSON.stringify(expected[field])}`,
				)
			}
		}
	}
	reportMismatches(mismatches, problems)

	return derived
}

/**
 * E20/E20b: rebuild the arms, require the pickers on disk to be that derivation,
 * and require every plan entry to be the run the registered cycle produces. The
 * bound of the cycle — not the length of the plan — is what the counts are
 * checked against, so a truncated plan cannot agree with itself.
 */
async function deriveE20FromFixtures(plan, problems) {
	const spec = experimentSpec(plan.experiment)
	const fixtureSet = buildExperimentSet({
		experimentId: plan.experiment,
		baseText: await fs.readFile(C1_PICKER_PATH, "utf-8"),
	})

	for (const arm of fixtureSet.arms) {
		const onDisk = await readIfExists(path.join(spec.dir, `${arm.arm}.roomodes`))
		if (onDisk !== arm.text) {
			problems.push(`${spec.id}/${arm.arm}.roomodes on disk is not the derived picker: regenerate the fixture`)
		}
	}

	const labelsByArm = labelArms(plan.experiment, plan.blindSeed ?? spec.defaultSeed)
	const derived = buildE20Runs({ experimentId: plan.experiment, fixtureSet, labelsByArm })

	if (plan.persona?.directive !== fixtureSet.persona.directive) {
		problems.push("the plan's persona directive is not the frozen goal-only explorer directive")
	}
	for (const brief of plan.briefs ?? []) {
		if (sha256(brief.text) !== brief.sha256) {
			problems.push(`brief ${brief.id}: the plan's sha256 does not hash its own text`)
		}
	}

	const entries = Array.isArray(plan.entries) ? plan.entries : []
	if (derived.length !== entries.length) {
		problems.push(`the derivation produces ${derived.length} runs, the plan holds ${entries.length}`)
		return derived
	}

	const mismatches = []
	for (let index = 0; index < derived.length; index++) {
		const expected = derived[index]
		const actual = entries[index]
		const fields = ["runId", "label", "draw", "cyclePosition", "briefId", "promptSha256", "promptBytes"]
		for (const field of fields) {
			if (expected[field] !== actual[field]) {
				mismatches.push(
					`index ${index + 1} (${expected.runId}): ${field} is ${JSON.stringify(actual[field])}, derived ${JSON.stringify(expected[field])}`,
				)
			}
		}
	}
	reportMismatches(mismatches, problems)

	return derived
}

function reportMismatches(mismatches, problems) {
	for (const mismatch of mismatches.slice(0, 10)) problems.push(`plan does not match the derivation — ${mismatch}`)
	if (mismatches.length > 10) problems.push(`…and ${mismatches.length - 10} further mismatches`)
}

/** Apply --only and --limit to the derived runs; the plan order is preserved. */
function selectRuns(runs, opts) {
	let selected = runs
	if (opts.only !== null) {
		const labels = [...new Set(runs.map((run) => run.label))]
		if (!labels.includes(opts.only)) {
			throw new Error(
				`--only ${JSON.stringify(opts.only)}: no run carries that label (labels: ${labels.join(", ")})`,
			)
		}
		selected = selected.filter((run) => run.label === opts.only)
	}
	if (opts.limit !== null) selected = selected.slice(0, opts.limit)
	return selected
}

/**
 * `finishReason` and the token cap the runner used, read from the usage sidecar.
 * No sidecar, no value: `null`, which is the honest state and not "STOP".
 */
async function readUsage(usageDirs, runId) {
	for (const dir of usageDirs) {
		const raw = await readIfExists(path.join(dir, `usage-${runId}.json`))
		if (raw === null) continue
		try {
			const sidecar = JSON.parse(raw)
			const attempts = Array.isArray(sidecar.attempts) ? sidecar.attempts : []
			const last = attempts[attempts.length - 1]
			return {
				finishReason: last?.finishReason ?? null,
				maxOutputTokens: sidecar.maxOutputTokens ?? null,
			}
		} catch {
			return { finishReason: null, maxOutputTokens: null }
		}
	}
	return { finishReason: null, maxOutputTokens: null }
}

/** `true` for a finish reason that may be scored: only `STOP` or absent. */
function isInvalidFinishReason(finishReason) {
	return finishReason !== null && finishReason !== undefined && finishReason !== "STOP"
}

/**
 * One `results.jsonl` record. The runner's verdict is preserved in
 * `runnerStatus`; `status` is only ever narrowed by the `finishReason` rule.
 */
function buildRecord({ run, opts, outcome, finishReason, maxOutputTokens, transcriptText }) {
	const truncated = isInvalidFinishReason(finishReason)
	const status = truncated ? "INVALID" : outcome.status
	return {
		index: run.index,
		runId: run.runId,
		label: run.label,
		draw: run.draw,
		briefId: run.briefId,
		promptSha256: run.promptSha256,
		model: opts.model,
		temperature: TEMPERATURE,
		status,
		// The runner's own verdict, unchanged, so the enforcement above is auditable.
		runnerStatus: outcome.status,
		reason: truncated
			? `finishReason ${finishReason} is not STOP: the output is truncated, so the run is INVALID and is never a miss`
			: outcome.reason,
		exitCode: outcome.exitCode,
		startedAt: outcome.startedAt,
		endedAt: outcome.endedAt,
		transcript: outcome.transcript,
		// Scorable text only. A truncated run keeps its hash above but contributes no
		// response, so it cannot be scored later by accident.
		response: status === "RUN" ? transcriptText : null,
		finishReason,
		maxOutputTokens,
		parserVersion: PARSER_VERSION,
	}
}

/** Refuse a run directory that already holds results, unless --force says otherwise. */
async function guardResults(resultsPath, force) {
	if ((await readIfExists(resultsPath)) === null) return true
	if (!force) {
		console.error(
			`error: ${resultsPath} exists. Refusing to overwrite a run directory holding results without --force.`,
		)
		return false
	}
	console.warn("warning: --force — discarding the previous results.jsonl.")
	await fs.rm(resultsPath, { force: true })
	return true
}

async function writeMaterial(out, runs, planRaw) {
	await fs.mkdir(path.join(out, "prompts"), { recursive: true })
	for (const run of runs) {
		await fs.writeFile(path.join(out, "prompts", `${run.runId}.txt`), run.text, "utf-8")
	}
	// A byte-identical copy, so the run directory records the plan it was built from.
	await fs.writeFile(path.join(out, "plan.json"), planRaw, "utf-8")
}

/**
 * The per-record continuity invariant: the early warning that fires at the moment
 * a batch drifts, not after the whole round has been paid for.
 *
 * Two things must hold between a call and the call immediately before it:
 *   1. the labels differ — consecutive calls must be different cells;
 *   2. `startedAt >= previous.endedAt` — calls must not overlap in time.
 *
 * `skipLabelCheck` is for a legitimate single-label slice (`--only <label>`): such
 * a slice is same-label by construction, so the label test can never pass there
 * and is meaningless rather than failed. The overlap test still applies to it,
 * because a same-label slice can still drift into concurrent execution. A partial
 * `--limit` slice of the registered plan keeps the label test, since it still
 * alternates cells.
 *
 * The thrown error names the call index, both labels and both timestamps, so the
 * operator can see exactly where the batch left the plan.
 */
export function assertRecordContinues(record, previous, { skipLabelCheck = false } = {}) {
	const both =
		`previous call #${previous.index} (${previous.runId}) [${previous.label} ${previous.startedAt} → ${previous.endedAt}]; ` +
		`this call #${record.index} (${record.runId}) [${record.label} ${record.startedAt} → ${record.endedAt}]`

	if (!skipLabelCheck && record.label === previous.label) {
		throw new Error(
			`the round drifted at call #${record.index}: consecutive calls repeat label ` +
				`${JSON.stringify(record.label)} (${both}). Calls must alternate cells.`,
		)
	}

	const started = Date.parse(record.startedAt)
	const previousEnded = Date.parse(previous.endedAt)
	if (!Number.isFinite(started) || !Number.isFinite(previousEnded)) {
		throw new Error(
			`call #${record.index} cannot be checked against its predecessor: a timestamp is unparseable (${both}).`,
		)
	}
	if (started < previousEnded) {
		throw new Error(
			`the round drifted at call #${record.index}: this call starts before the previous call ends, ` +
				`so calls overlap in time and maximum concurrency exceeds 1 (${both}).`,
		)
	}
}

/**
 * `expectedRuns` is the number of calls the plan registers (`registeredTotal`).
 * It is passed in rather than read from a constant, because the two shapes
 * register different totals: 600 for the closing round, 900 and 200 for E20 and
 * E20b. `null` — the default, so a caller driving a slice directly need not name
 * one — means "this batch claims no registered total", and the full-set proof is
 * skipped rather than run against a guess.
 */
export async function executeSelected({ out, selected, opts, runOnce = executeRun, expectedRuns = null }) {
	const resultsPath = path.join(out, "results.jsonl")
	const transcriptDir = path.join(out, "transcripts")
	const usageDirs = [...new Set([opts.usageDir || transcriptDir, path.join(out, "usage"), transcriptDir])]

	const tally = { RUN: 0, UNRUN: 0, INVALID: 0 }
	const perLabel = new Map()
	const records = []
	const caps = new Set()
	let capConflict = false

	// A --only slice is same-label by construction, so the label-difference check is
	// skipped for it; the timestamp-overlap check still applies. A --limit slice of
	// the registered plan still alternates cells, so it keeps both checks.
	const skipLabelCheck = opts.only !== null && opts.only !== undefined

	// Truncate exactly once, before the loop. From here on the file IS the record of
	// every completed call: each record is appended before the next call starts, so
	// a crash or Ctrl-C costs at most the call in flight, never the batch.
	await fs.mkdir(out, { recursive: true })
	await fs.writeFile(resultsPath, "", "utf-8")

	let previous = null
	for (const run of selected) {
		const outcome = await runOnce({
			runner: opts.runner,
			outFile: path.join(transcriptDir, `${run.runId}.txt`),
			promptFile: path.join(out, "prompts", `${run.runId}.txt`),
			runId: run.runId,
			model: opts.model,
			transcriptDir,
			cwd: out,
		})
		const usage = await readUsage(usageDirs, run.runId)
		const transcriptText = outcome.status === "RUN" ? await readTranscript(transcriptDir, run.runId) : null
		const record = buildRecord({
			run,
			opts,
			outcome,
			finishReason: usage.finishReason,
			maxOutputTokens: usage.maxOutputTokens,
			transcriptText,
		})

		// Checked before the append, so a violation leaves every earlier record on
		// disk and the violating record off it.
		if (previous !== null) assertRecordContinues(record, previous, { skipLabelCheck })

		tally[record.status]++
		const counts = perLabel.get(run.label) ?? { RUN: 0, UNRUN: 0, INVALID: 0 }
		counts[record.status]++
		perLabel.set(run.label, counts)

		if (usage.maxOutputTokens !== null) {
			if (caps.size > 0 && !caps.has(usage.maxOutputTokens)) capConflict = true
			caps.add(usage.maxOutputTokens)
		}

		await fs.appendFile(resultsPath, `${JSON.stringify(record)}\n`, "utf-8")
		records.push(record)
		previous = record
		console.log(`#${String(run.index).padStart(3, "0")} ${pad(run.runId, 14)} ${record.status}`)
	}

	// A complete batch must be interleaved, proved from the recorded timestamps
	// rather than from the plan file (log §16.1). The total is the plan's own, so
	// this fires for 600 calls on the closing round, 900 on E20 and 200 on E20b.
	// The per-record check above is its early warning; both stay. A --only/--limit
	// slice is not a complete batch and is not expected to be interleaved by
	// construction.
	//
	// assertInterleaved()'s invariant is only "consecutive labels differ" plus "no
	// overlap": it never requires a two-way alternation, so E20's 9-call cycle is
	// as valid as the closing round's 6-call one.
	let interleaving = null
	if (expectedRuns !== null && records.length === expectedRuns) {
		interleaving = assertInterleaved(records, (record) => record.label)
	}

	if (interleaving !== null) {
		console.log(
			`interleaving: ${interleaving.transitions} transitions across ${interleaving.calls} calls ` +
				`(expected ${interleaving.expected}); max concurrency ${interleaving.maxConcurrency}`,
		)
	} else {
		console.log(
			expectedRuns === null
				? `interleaving: not asserted on ${records.length} calls (this batch declares no registered total)`
				: `interleaving: not asserted on a partial batch of ${records.length} calls ` +
						`(the registered total is ${expectedRuns})`,
		)
	}

	console.log("per label:")
	for (const [label, counts] of perLabel) {
		console.log(
			`  ${pad(label, 8)} RUN ${pad(counts.RUN, 4)} / UNRUN ${pad(counts.UNRUN, 4)} / INVALID ${pad(counts.INVALID, 4)}`,
		)
	}
	if (caps.size > 0) {
		console.log(`maxOutputTokens recorded in the sidecars: ${[...caps].join(", ")}`)
		if (capConflict) {
			console.warn(
				"warning: the token cap CHANGED during this batch. scripts/ROUTING-ROUND.md requires one fixed cap for the whole sweep.",
			)
		}
	}
	console.log(`tally: RUN ${tally.RUN} / UNRUN ${tally.UNRUN} / INVALID ${tally.INVALID}`)
	console.log(`results: ${resultsPath} (${selected.length} records)`)

	return tally
}

async function main() {
	let opts
	try {
		opts = parseArgs(process.argv.slice(2))
	} catch (error) {
		console.error(`error: ${error.message}\n\n${USAGE}`)
		return 2
	}
	if (opts.help) {
		console.log(USAGE)
		return 0
	}

	const early = argumentErrors(opts)
	if (early.length > 0) {
		for (const message of early) console.error(`error: ${message}`)
		return 2
	}

	const out = path.resolve(opts.out)
	if (!(await guardResults(path.join(out, "results.jsonl"), opts.force))) return 2

	let plan
	let planRaw
	try {
		const loaded = await loadPlan(opts.plan)
		plan = loaded.plan
		planRaw = loaded.raw
	} catch (error) {
		console.error(`error: ${error.message}`)
		return 2
	}

	let shape
	try {
		shape = planShape(plan)
	} catch (error) {
		console.error(`error: ${error.message}`)
		return 2
	}

	console.log(
		shape === "e20"
			? `${plan.experiment} executor — ${plan.instrument}`
			: "routing closing round (E13-R) — Stage 1 executor",
	)
	console.log(`plan: ${path.resolve(opts.plan)}`)

	const { problems, expectedRuns, summary } = validatePlan(plan, shape)
	console.log(
		shape === "e20"
			? `plan validation: runs ${summary.runs}/${expectedRuns} · arms ${summary.labels}/${summary.expectedLabels} · ` +
					`drawsPerArm ${summary.drawsPerArm} · unique prompt hashes ${summary.uniquePromptHashes}/${summary.expectedLabels}`
			: `plan validation: runs ${summary.runs}/${expectedRuns} · labels ${summary.labels}/${summary.expectedLabels} · ` +
					`draws per label min ${summary.minDraws}/${summary.expectedDraws} · ` +
					`unique prompt hashes ${summary.uniquePromptHashes}/${summary.expectedLabels}`,
	)

	let derived
	try {
		derived = await deriveFromFixtures(plan, shape, problems)
	} catch (error) {
		problems.push(`the derivation failed: ${error.message}`)
	}

	if (problems.length > 0) {
		console.error("error: the plan is not runnable:")
		for (const message of problems) console.error(`  - ${message}`)
		return 2
	}
	console.log("plan matches the current derivation: every runId, draw, brief and prompt hash")

	let selected
	try {
		selected = selectRuns(derived, opts)
	} catch (error) {
		console.error(`error: ${error.message}`)
		return 2
	}
	if (selected.length === 0) {
		console.error("error: the selection is empty; nothing would be written or executed")
		return 2
	}

	await writeMaterial(out, selected, planRaw)
	console.log(`prompts: ${selected.length} written to ${path.join(out, "prompts")}`)
	console.log(`plan copy: ${path.join(out, "plan.json")}`)
	if (opts.only !== null) console.log(`--only ${opts.only}: ${selected.length} of ${derived.length} runs selected`)
	if (opts.limit !== null) console.log(`--limit ${opts.limit}: ${selected.length} run(s) selected`)

	if (!opts.run) {
		console.log(`dry-run: no runner was executed; no results.jsonl exists. Model: ${opts.model || "UNSET"}.`)
		return 0
	}

	await executeSelected({ out, selected, opts, expectedRuns })
	return 0
}

// Run only when invoked as a script, so the spec can import `executeSelected`
// and drive the per-record invariant with a fake runner instead of a paid call.
const invokedDirectly = typeof process.argv[1] === "string" && import.meta.url === pathToFileURL(process.argv[1]).href

if (invokedDirectly) {
	main()
		.then((code) => process.exit(code))
		.catch((error) => {
			console.error(`run-routing-round failed: ${error.message}`)
			process.exit(2)
		})
}
