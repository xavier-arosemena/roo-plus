/**
 * framing-pretest-runner.mjs — the provider boundary for the framing pretest.
 *
 * WHY THERE IS NO PROVIDER PROTOCOL HERE
 *   The harness must not invent a request format, and the repository must not
 *   gain a dependency for this. The call is delegated to an operator-supplied
 *   shell command, exactly as `test-fixtures/frames/outcome-arm/run-b1-pilot.sh`
 *   does. The harness's whole job is to substitute paths safely, run the command,
 *   and say honestly what came back.
 *
 * SUBSTITUTION IS SINGLE-QUOTED
 *   Every substituted value is wrapped in single quotes so a path with a space
 *   survives. Write the placeholder bare — `%OUT_FILE%`, not `'%OUT_FILE%'`.
 *
 * STATUS RECONCILIATION (two rules met at once, mirrored from the B1 pilot)
 *   no runner, or no output file at all  -> UNRUN   nothing was produced to score
 *   output exists but is empty           -> INVALID the runner/harness misbehaved
 *   non-empty output from a non-zero exit -> INVALID partial output; kept, never blessed
 *   non-empty output from exit 0         -> RUN
 *   A transcript is never synthesised and never repaired: a missing response stays
 *   missing, which is the honest state.
 *
 * No dependencies. Node 22 ESM.
 */

import { spawnSync } from "node:child_process"
import * as fs from "node:fs/promises"
import { sha256 } from "./framing-pretest.mjs"

/** Pinned. Recorded in the plan and in every result record. */
export const TEMPERATURE = 0

const PLACEHOLDERS = ["PROMPT_FILE", "OUT_FILE", "MODEL", "TEMPERATURE", "RUN_ID", "TRANSCRIPT_DIR"]

/** The runner is never told which catalogue it is serving. */
const RUNNER_TIMEOUT_MS = 15 * 60 * 1000

export function quoteForShell(value) {
	return `'${String(value).replace(/'/g, "'\\''")}'`
}

export function expandRunner(template, values) {
	return template.replace(/%([A-Z_]+)%/g, (match, key) =>
		PLACEHOLDERS.includes(key) ? quoteForShell(values[key]) : match,
	)
}

async function fileSize(target) {
	try {
		return (await fs.stat(target)).size
	} catch {
		return null
	}
}

/**
 * Execute one run. Returns `{ status, reason, exitCode, startedAt, endedAt,
 * transcript, runnerStderrTail }` — never a fabricated transcript.
 */
export async function executeRun({ runner, outFile, promptFile, runId, model, transcriptDir, cwd }) {
	const startedAt = new Date().toISOString()
	await fs.rm(outFile, { force: true })

	const command = expandRunner(runner, {
		PROMPT_FILE: promptFile,
		OUT_FILE: outFile,
		MODEL: model,
		TEMPERATURE: String(TEMPERATURE),
		RUN_ID: runId,
		TRANSCRIPT_DIR: transcriptDir,
	})

	const proc = spawnSync("sh", ["-c", command], { cwd, encoding: "utf-8", timeout: RUNNER_TIMEOUT_MS })
	const endedAt = new Date().toISOString()
	const size = await fileSize(outFile)

	let status
	let reason
	if (proc.error) {
		status = "UNRUN"
		reason = `runner did not start: ${proc.error.message}`
	} else if (size === null) {
		status = "UNRUN"
		reason = `no output file was produced (exit ${proc.status})`
	} else if (size === 0) {
		status = "INVALID"
		reason = `the runner wrote an empty file (exit ${proc.status})`
	} else if (proc.status !== 0) {
		status = "INVALID"
		reason = `non-empty output with exit ${proc.status}: partial or failed run`
	} else {
		status = "RUN"
		reason = null
	}

	const transcriptText = size === null || size === 0 ? null : await fs.readFile(outFile, "utf-8")

	return {
		startedAt,
		endedAt,
		status,
		reason,
		exitCode: proc.status,
		transcript: transcriptText === null ? null : { path: `transcripts/${runId}.txt`, bytes: size, sha256: sha256(transcriptText) },
		runnerStderrTail: status === "RUN" ? null : (proc.stderr ?? "").slice(-800),
	}
}
