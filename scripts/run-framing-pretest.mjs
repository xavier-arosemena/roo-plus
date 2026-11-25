#!/usr/bin/env node

/**
 * run-framing-pretest.mjs — harness for the agent framing pretest, E11 and E12.
 *
 * WHAT IT DOES
 *   Builds the runs and, only when a provider is explicitly configured, executes
 *   them through an operator-supplied runner command. It does not score: scoring
 *   is a blinded pass over a bundle produced by `scripts/build-scorer-bundle.mjs`.
 *
 * TWO PLANS
 *   Without `--plan` it builds E11's frozen 5 personas × 3 briefs × 2 catalogues
 *   = 30 runs, so that run stays reproducible. With `--plan <file.json>` the run
 *   is described by data (E12, I-1): a list of conditions, each naming a fixture
 *   and a brief. E12 is 8 conditions × 5 personas × 1 repetition = 40 runs.
 *
 * WHAT A PROMPT CONTAINS
 *   persona directive, standing request, one brief, one picker text
 *   (slug, name, whenToUse). No doctrine, no grants, no arm or frame name, no run
 *   id, no preamble saying a test is running. The audit runs in BOTH modes and a
 *   failure refuses the batch before anything is executed.
 *
 * WHY DRY-RUN IS THE DEFAULT
 *   The pre-registration was filed before any trial run, and the honest state of
 *   an unexercised instrument is UNRUN. A harness that would spend money has to be
 *   told to: no provider, no key or no --runner means dry-run.
 *
 * EXIT STATUS
 *   0  the batch completed and every run was recorded (RUN / UNRUN / INVALID),
 *      or a dry-run wrote its material
 *   1  the blindness audit failed — the material must not be run
 *   2  a precondition failed: bad arguments or plan, missing provider/model/
 *      runner/key in --run mode, or a run directory already holding results
 *
 * See scripts/RUN-FRAMING-PRETEST.md for the operator procedure.
 */

import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"

import { printPlanArithmetic } from "./lib/b3-sequence.mjs"
import { assignLabels, buildPrompt, loadCatalogues, pickerTextFor, planRuns } from "./lib/framing-pretest.mjs"
import { auditPrompts, formatReport } from "./lib/framing-pretest-audit.mjs"
import { executeBatch, printConditionTable } from "./lib/framing-pretest-batch.mjs"
import { byteStats, pathExists, writeBlindMap, writeMaterial, writePlan, writeReport } from "./lib/framing-pretest-output.mjs"
import { loadPlan, planCatalogues, planRunsFromPlan } from "./lib/framing-pretest-plan.mjs"
import { TEMPERATURE } from "./lib/framing-pretest-runner.mjs"

/** Fixed so repeated dry-runs are byte-identical. A real run should pass --blind-seed. */
const DEFAULT_BLIND_SEED = "roo-plus-framing-pretest-2026-11-10"

/** Outside the repository on purpose: this harness may not write into test-fixtures/. */
const DEFAULT_OUT = path.join(os.tmpdir(), "roo-plus-framing-pretest")

const USAGE = `Usage: node scripts/run-framing-pretest.mjs [--dry-run|--run] [options]

  --dry-run            build prompts, plan and blind map; no network call (default)
  --run                execute the runs through --runner; requires provider + key
  --plan <file.json>   describe the run as data (conditions × personas); without it
                       the frozen E11 5x3x2 plan is used
  --only <ids>         execute only these conditions (comma separated); asking for a
                       condition the plan marks not-run is refused. Requires --plan
  --repetitions <k>    override every condition's repetition count (default: the
                       plan's own per-condition count); requires --plan
  --out <dir>          run directory (default: ${DEFAULT_OUT})
  --force              overwrite a run directory that already holds results.jsonl
  --blind-seed <s>     seed for the blind label assignment (default: fixed literal)
  --usage-dir <dir>    where the runner's usage-<runId>.json sidecars are read from
                       (default: <out>/transcripts)
  --model <id>         model id recorded in the plan (required with --run)
  --provider <id>      provider id recorded in the plan (env FRAMING_PRETEST_PROVIDER)
  --runner <template>  shell command template (required with --run); placeholders:
                       %PROMPT_FILE% %OUT_FILE% %MODEL% %TEMPERATURE% %RUN_ID%
                       %TRANSCRIPT_DIR%
  --api-key-env <name> environment variable holding the API key
                       (default: FRAMING_PRETEST_API_KEY)
  --help               print this text
`

function parseArgs(argv) {
	const opts = {
		run: false,
		out: DEFAULT_OUT,
		force: false,
		blindSeed: DEFAULT_BLIND_SEED,
		plan: "",
		only: null,
		repetitions: null,
		usageDir: "",
		model: process.env.FRAMING_PRETEST_MODEL ?? "",
		provider: process.env.FRAMING_PRETEST_PROVIDER ?? "",
		runner: "",
		apiKeyEnv: "FRAMING_PRETEST_API_KEY",
		help: false,
	}

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i]
		const value = () => {
			const next = argv[++i]
			if (next === undefined) throw new Error(`${arg} needs a value`)
			return next
		}
		if (arg === "--dry-run") opts.run = false
		else if (arg === "--run") opts.run = true
		else if (arg === "--out") opts.out = value()
		else if (arg === "--force") opts.force = true
		else if (arg === "--blind-seed") opts.blindSeed = value()
		else if (arg === "--plan") opts.plan = value()
		else if (arg === "--only") opts.only = value().split(",").map((id) => id.trim()).filter((id) => id !== "")
		else if (arg === "--repetitions") opts.repetitions = Number(value())
		else if (arg === "--usage-dir") opts.usageDir = value()
		else if (arg === "--model") opts.model = value()
		else if (arg === "--provider") opts.provider = value()
		else if (arg === "--runner") opts.runner = value()
		else if (arg === "--api-key-env") opts.apiKeyEnv = value()
		else if (arg === "--help" || arg === "-h") opts.help = true
		else throw new Error(`unknown argument: ${arg}`)
	}

	return opts
}

/** Arguments that are wrong in either mode, checked before any file is read. */
function argumentErrors(opts) {
	const errors = []
	if (opts.repetitions !== null && (!Number.isInteger(opts.repetitions) || opts.repetitions < 1)) {
		errors.push("--repetitions must be an integer >= 1")
	}
	if (opts.repetitions !== null && !opts.plan) {
		errors.push("--repetitions requires --plan: the fixed 5x3x2 plan is frozen and is not repeated")
	}
	if (opts.only !== null && !opts.plan) {
		errors.push("--only requires --plan: the fixed 5x3x2 plan is frozen")
	}
	return errors
}

/** Preconditions for spending money. Checked before anything runs. */
function runPreconditions(opts) {
	const errors = []
	if (!opts.run) return errors
	if (!opts.model) errors.push("--model is required with --run")
	if (!opts.provider) errors.push("--provider (or FRAMING_PRETEST_PROVIDER) is required with --run")
	if (!opts.runner) errors.push("--runner is required with --run")
	// The message is deliberately CONSTANT: `--api-key-env` is operator-supplied text,
	// and interpolating it here put a user-controlled string into a printed error
	// (code-scanning `js/clear-text-logging`, alert #119). The operator already knows
	// which variable name they passed, so naming it back to them adds nothing.
	if (!process.env[opts.apiKeyEnv]) {
		errors.push("the environment variable named by --api-key-env is empty; export the API key first")
	}
	return errors
}

/** Refuse a run directory that already holds results, unless --force says otherwise. */
async function guardResults(resultsPath, force) {
	if (!(await pathExists(resultsPath))) return true
	if (!force) {
		console.error(`error: ${resultsPath} exists. Refusing to overwrite a run directory holding results without --force.`)
		return false
	}
	console.warn("warning: --force — discarding the previous results.jsonl.")
	await fs.rm(resultsPath, { force: true })
	return true
}

/**
 * Build every run, either from a plan file or from the frozen E11 table. The
 * `catalogue` field becomes the blind LABEL: no frame, fixture or condition id
 * travels with a prompt.
 */
async function buildRuns(opts) {
	if (!opts.plan) {
		const labelled = assignLabels(opts.blindSeed, await loadCatalogues())
		const runs = planRuns(labelled).map((run) => ({
			runId: run.runId,
			persona: run.persona,
			brief: run.brief,
			catalogue: run.catalogue.label,
			...buildPrompt(run.persona, run.brief, pickerTextFor(run.catalogue.modes)),
		}))
		return { runs, labelled, plan: null, repetitions: 1, briefs: undefined }
	}

	// `--only` is passed to the loader, so a request to execute a not-run
	// condition is refused there rather than silently dropped.
	const plan = await loadPlan(opts.plan, { only: opts.only })
	// `repetitions` is the maximum for reporting; the plan's own per-condition
	// counts are what `planRunsFromPlan` uses unless --repetitions overrides them.
	const repetitions = opts.repetitions ?? plan.repetitions
	const labelled = assignLabels(opts.blindSeed, planCatalogues(plan), "PICKER-")

	const runs = planRunsFromPlan(plan, labelled, opts.repetitions).map((run) => {
		const catalogue = labelled.find((candidate) => candidate.label === run.catalogue)
		return { ...run, ...buildPrompt(run.persona, run.brief, pickerTextFor(catalogue.modes)) }
	})

	// The brief set actually used, in plan order, with provenance: a paraphrase is
	// never allowed to look like a registered text in briefs.json.
	const briefs = []
	for (const condition of plan.conditions) {
		if (briefs.some((brief) => brief.id === condition.brief.id)) continue
		briefs.push({
			id: condition.brief.id,
			text: condition.brief.text,
			provenance:
				condition.brief.id === "B1" || condition.brief.id === "B3"
					? "VERBATIM — pre-registration §3.1 (checked against the frozen BRIEFS constant)"
					: "REGISTERED — pre-registration Amendment 2 §A2.4 (checked against REGISTERED_B3P)",
		})
	}

	return { runs, labelled, plan, repetitions, briefs }
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

	let built
	try {
		built = await buildRuns(opts)
	} catch (error) {
		console.error(`error: ${error.message}`)
		return 2
	}
	const { runs, labelled, plan, repetitions, briefs } = built
	const audit = auditPrompts(runs, labelled)

	const out = path.resolve(opts.out)
	if (!(await guardResults(path.join(out, "results.jsonl"), opts.force))) return 2

	// Checked before anything runs: a missing key must not look like a batch.
	const errors = runPreconditions(opts)
	if (errors.length > 0) {
		for (const message of errors) console.error(`error: ${message}`)
		return 2
	}

	await writeMaterial(out, runs, { briefs })
	await writePlan(out, { runs, labelled, opts, temperature: TEMPERATURE, plan, repetitions })
	await writeBlindMap(out, { labelled, seed: opts.blindSeed })
	await writeReport(out, formatReport(audit, runs.length))

	const stats = byteStats(runs.map((run) => Buffer.byteLength(run.text, "utf8")))
	console.log(`${runs.length} prompts written to ${path.join(out, "prompts")}`)
	console.log(`plan: ${plan ? plan.source : "fixed E11 plan"}`)
	if (plan) {
		const perCondition = plan.conditions.map((condition) => `${condition.id} x${condition.repetitions}`).join(", ")
		console.log(`per-condition repetitions: ${perCondition}`)
		printPlanArithmetic(runs)
		for (const entry of plan.notRun) console.log(`not run: ${entry.id} — ${entry.reason}`)
	} else {
		console.log(`repetitions: ${repetitions} (fixed E11 plan)`)
	}
	console.log(`prompt bytes: min ${stats.min} / max ${stats.max} / mean ${stats.mean}`)
	console.log("per condition:")
	printConditionTable(audit.conditionSummary)
	console.log(`blindness audit: ${audit.ok ? "PASS" : "FAIL"}`)
	for (const failure of audit.failures.slice(0, 20)) console.error(`  - ${failure}`)

	if (!audit.ok) {
		console.error("error: the material leaks identity. It must not be run. See blindness-report.json.")
		return 1
	}

	if (!opts.run) {
		console.log(`dry-run: no provider call, no results.jsonl. Model: ${opts.model || "UNSET"}.`)
		return 0
	}

	const tally = { RUN: 0, UNRUN: 0, INVALID: 0 }
	await executeBatch(out, runs, opts, labelled, repetitions, tally)
	console.log(`tally: RUN ${tally.RUN} / UNRUN ${tally.UNRUN} / INVALID ${tally.INVALID}`)
	return 0
}

main()
	.then((code) => process.exit(code))
	.catch((error) => {
		console.error(`run-framing-pretest failed: ${error.message}`)
		process.exit(2)
	})
