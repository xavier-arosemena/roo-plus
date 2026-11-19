/**
 * framing-pretest-batch.mjs — executing a batch and reporting it.
 *
 * WHY THIS IS NOT IN THE CLI
 *   The CLI is arguments, guards and exit codes. Running the batch is a separate
 *   responsibility with its own failure modes (a runner that writes nothing, a
 *   sidecar that does not exist, a transcript that cannot be read), and keeping it
 *   here lets the CLI stay small enough to read in one pass.
 *
 * WHAT IT GUARANTEES
 *   One `results.jsonl` record per run, written immediately after that run, so a
 *   batch interrupted halfway leaves an honest partial file rather than nothing.
 *   The record is built by `buildResultRecord`, which cannot revise what the runner
 *   reported.
 *
 * No dependencies. Node 22 ESM.
 */

import * as fs from "node:fs/promises"
import * as path from "node:path"

import { buildResultRecord, readFinishReason, readTranscript } from "./framing-pretest-results.mjs"
import { TEMPERATURE, executeRun } from "./framing-pretest-runner.mjs"

/**
 * Execute every run in order, appending each record as it completes.
 * `tally` is mutated in place so the caller can report RUN / UNRUN / INVALID.
 */
export async function executeBatch(out, runs, opts, labelled, repetitions, tally) {
	const resultsPath = path.join(out, "results.jsonl")
	const transcriptDir = path.join(out, "transcripts")

	// The sidecar location is the operator's to decide, but the default is where
	// %TRANSCRIPT_DIR% points, so a stock gemini-runner invocation is found.
	const usageDirs = [...new Set([opts.usageDir || transcriptDir, path.join(out, "usage"), transcriptDir])]
	const byLabel = new Map(labelled.map((catalogue) => [catalogue.label, catalogue]))

	for (const run of runs) {
		const outcome = await executeRun({
			runner: opts.runner,
			outFile: path.join(transcriptDir, `${run.runId}.txt`),
			promptFile: path.join(out, "prompts", `${run.runId}.txt`),
			runId: run.runId,
			model: opts.model,
			transcriptDir,
			cwd: out,
		})
		tally[outcome.status]++

		// Read the transcript back rather than trusting the runner's byte count: a
		// file replaced between the two reads must not be described by the old size.
		const transcriptText = outcome.status === "RUN" ? await readTranscript(transcriptDir, run.runId) : null
		const record = buildResultRecord({
			run,
			opts,
			temperature: TEMPERATURE,
			repetitions,
			outcome,
			finishReason: await readFinishReason(usageDirs, run.runId),
			transcriptText,
			modes: byLabel.get(run.catalogue)?.modes ?? [],
		})

		await fs.appendFile(resultsPath, JSON.stringify(record) + "\n", "utf-8")
		console.log(`${run.runId} ${run.persona.id} ${run.brief.id} ${run.catalogue} -> ${outcome.status}`)
	}
}

/**
 * Per-condition accounting. `distinctHeaders` against `runs` is the check that two
 * conditions whose prompts differ only in the picker share every header: five runs
 * and five distinct headers means one header per persona, and identical hashes
 * across conditions mean the header zone is the same text.
 */
export function printConditionTable(conditionSummary) {
	for (const [condition, row] of Object.entries(conditionSummary)) {
		const headers = row.headerSha256.map((hash) => hash.slice(0, 12)).join(",")
		console.log(
			`  ${condition.padEnd(3)} runs ${String(row.runs).padStart(2)}  bytes ${row.promptBytesMin}-${row.promptBytesMax}` +
				`  headers ${row.distinctHeaders} [${headers}]  label ${row.labels.join(",")}`,
		)
	}
}
