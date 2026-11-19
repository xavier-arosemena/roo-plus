/**
 * gemini-runner.mjs — a Gemini runner for the framing pretest harness.
 *
 * WHY THIS FILE EXISTS
 *   `scripts/lib/framing-pretest-runner.mjs` deliberately contains no provider
 *   protocol: it takes an operator-supplied shell command and substitutes paths.
 *   This file is that command, for one provider. It exists so the pretest can run
 *   without adding a dependency to the repository and without inventing a request
 *   format inside the harness.
 *
 * CONTRACT (positional, matching the harness placeholders)
 *   node gemini-runner.mjs <promptFile> <outFile> <model> [usageDir] [runId]
 *                           [--max-output-tokens <n>]
 *
 *   Writes the model's plain text to <outFile>. Writes NOTHING on failure and
 *   exits non-zero, so the harness records UNRUN/INVALID with the stderr tail
 *   rather than scoring a fabricated response.
 *
 * THE OUTPUT CAP IS 4096 TOKENS, AND IT IS FIXED FOR A SWEEP
 *   Gemini counts thinking tokens against `maxOutputTokens`. At 2048 a
 *   thinking-heavy response truncated and became `MAX_TOKENS`, which Guard 4
 *   makes INVALID: one such run costs a draw from its cell's denominator. 4096
 *   leaves room for the thinking budget plus the short answer this instrument
 *   asks for.
 *
 *   The value is exposed as `--max-output-tokens` so an operator can see and
 *   state it, and it is recorded in every usage sidecar. It must NOT be changed
 *   mid-sweep: a batch run at two caps has two different truncation regimes, and
 *   `scripts/run-routing-round.mjs` warns when the sidecars disagree.
 *
 * USAGE SIDECAR
 *   When <usageDir> is given, one JSON file per run records the API-reported
 *   token counts, the attempt history and the `maxOutputTokens` in force. This is
 *   what makes the cost and the truncation regime of the experiment measurable
 *   after the fact instead of estimated beforehand.
 *
 * SECRET HANDLING
 *   The key is read from $FRAMING_PRETEST_API_KEY. It is never printed, never
 *   written to disk, and never included in an error message or in the sidecar.
 *
 * No dependencies. Node 22 ESM (global fetch).
 */

import * as fs from "node:fs/promises"
import * as path from "node:path"

const API_ROOT = "https://generativelanguage.googleapis.com/v1beta/models"
const MAX_ATTEMPTS = 4
const RETRYABLE = new Set([429, 500, 502, 503, 504])
const TIMEOUT_MS = 5 * 60 * 1000

/** Thinking tokens count against this cap, so 2048 truncated thinking-heavy answers. */
export const DEFAULT_MAX_OUTPUT_TOKENS = 4096
const MIN_OUTPUT_TOKENS = 256
const MAX_OUTPUT_TOKENS_CEILING = 65536

const USAGE = `usage: gemini-runner.mjs <promptFile> <outFile> <model> [usageDir] [runId] [--max-output-tokens <n>]

  --max-output-tokens <n>   output cap for every call (default ${DEFAULT_MAX_OUTPUT_TOKENS}).
                            Fixed for a sweep: do not change it mid-run. Recorded in
                            every usage sidecar.
`

function fail(message) {
	process.stderr.write(`gemini-runner: ${message}\n`)
	process.exit(1)
}

/** Split argv into the five positionals and the one flag. Argument errors exit 1. */
function parseArgs(argv) {
	const positional = []
	let maxOutputTokens = DEFAULT_MAX_OUTPUT_TOKENS
	let help = false

	for (let index = 0; index < argv.length; index++) {
		const arg = argv[index]
		if (arg === "--max-output-tokens") {
			const raw = argv[++index]
			if (raw === undefined) fail("--max-output-tokens needs a value")
			const parsed = Number(raw)
			if (!Number.isInteger(parsed) || parsed < MIN_OUTPUT_TOKENS || parsed > MAX_OUTPUT_TOKENS_CEILING) {
				fail(
					`--max-output-tokens must be an integer between ${MIN_OUTPUT_TOKENS} and ${MAX_OUTPUT_TOKENS_CEILING} (got ${JSON.stringify(raw)})`,
				)
			}
			maxOutputTokens = parsed
		} else if (arg === "--help" || arg === "-h") {
			help = true
		} else {
			positional.push(arg)
		}
	}

	return { positional, maxOutputTokens, help }
}

const { positional, maxOutputTokens: MAX_OUTPUT_TOKENS, help } = parseArgs(process.argv.slice(2))

if (help) {
	process.stdout.write(USAGE)
	process.exit(0)
}

const [promptFile, outFile, model, usageDir, runId] = positional

if (!promptFile || !outFile || !model) {
	process.stderr.write(`${USAGE}\n`)
	fail("a prompt file, an output file and a model id are required")
}

const apiKey = process.env.FRAMING_PRETEST_API_KEY
if (!apiKey) {
	fail("FRAMING_PRETEST_API_KEY is empty; refusing to call the API")
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** Pull the text out of a generateContent response. Returns null if there is none. */
function extractText(payload) {
	const candidate = payload?.candidates?.[0]
	if (!candidate) return null
	const blockReason = payload?.promptFeedback?.blockReason
	if (blockReason) return null
	const parts = candidate?.content?.parts
	if (!Array.isArray(parts)) return null
	const text = parts
		.map((part) => (typeof part?.text === "string" ? part.text : ""))
		.join("")
		.trim()
	return text.length === 0 ? null : text
}

function finishReasonOf(payload) {
	return payload?.candidates?.[0]?.finishReason ?? null
}

async function writeSidecar(record) {
	if (!usageDir) return
	try {
		await fs.mkdir(usageDir, { recursive: true })
		const name = `usage-${runId || path.basename(outFile)}.json`
		const sidecar = { ...record, maxOutputTokens: MAX_OUTPUT_TOKENS, model }
		await fs.writeFile(path.join(usageDir, name), `${JSON.stringify(sidecar, null, 2)}\n`, "utf-8")
	} catch (error) {
		// A sidecar failure must never turn a successful model call into a failed run.
		process.stderr.write(`gemini-runner: sidecar not written: ${error.message}\n`)
	}
}

async function main() {
	const prompt = await fs.readFile(promptFile, "utf-8")
	const url = `${API_ROOT}/${encodeURIComponent(model)}:generateContent`
	const body = {
		contents: [{ role: "user", parts: [{ text: prompt }] }],
		generationConfig: { temperature: 0, maxOutputTokens: MAX_OUTPUT_TOKENS },
	}

	const attempts = []
	let lastError = null

	for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
		const startedAt = new Date().toISOString()
		let response
		let payload = null
		let text = null

		try {
			response = await fetch(`${url}?key=${apiKey}`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(body),
				signal: AbortSignal.timeout(TIMEOUT_MS),
			})
			payload = await response.json().catch(() => null)
		} catch (error) {
			// Never echo the URL: it carries the key as a query parameter.
			lastError = `network error: ${error.name === "TimeoutError" ? "timeout" : error.message}`
			attempts.push({ attempt, startedAt, endedAt: new Date().toISOString(), status: null, error: lastError })
			if (attempt < MAX_ATTEMPTS) {
				await sleep(1000 * 2 ** (attempt - 1))
				continue
			}
			break
		}

		const status = response.status
		text = status === 200 ? extractText(payload) : null
		const apiMessage = payload?.error?.message ? String(payload.error.message).slice(0, 300) : null

		attempts.push({
			attempt,
			startedAt,
			endedAt: new Date().toISOString(),
			httpStatus: status,
			finishReason: finishReasonOf(payload),
			usageMetadata: payload?.usageMetadata ?? null,
			apiMessage,
		})

		if (status === 200 && text) {
			await fs.mkdir(path.dirname(outFile), { recursive: true })
			await fs.writeFile(outFile, text, "utf-8")
			await writeSidecar({ runId: runId ?? null, model, attempts, outcome: "RUN" })
			return
		}

		if (status === 200 && !text) {
			// A 200 with no usable text is a blocked or empty completion. Not retryable:
			// repeating an identical prompt at temperature 0 would earn the same result.
			lastError = `no usable text (finishReason=${finishReasonOf(payload)}, block=${
				payload?.promptFeedback?.blockReason ?? "none"
			})`
			break
		}

		lastError = `HTTP ${status}${apiMessage ? `: ${apiMessage}` : ""}`
		if (!RETRYABLE.has(status) || attempt === MAX_ATTEMPTS) break
		await sleep(1000 * 2 ** (attempt - 1))
	}

	await writeSidecar({ runId: runId ?? null, model, attempts, outcome: "FAILED", error: lastError })
	fail(lastError ?? "unknown failure")
}

await main()
