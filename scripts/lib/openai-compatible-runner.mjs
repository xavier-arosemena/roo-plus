/**
 * openai-compatible-runner.mjs — a second-provider runner for the routing harness.
 *
 * WHY THIS FILE EXISTS
 *   `scripts/lib/gemini-runner.mjs` speaks Gemini's `generateContent` protocol and
 *   is the only provider implementation the harness had. Repeating the E20 and
 *   E20c designs against a different model needs the same contract against an
 *   OpenAI-compatible endpoint, without adding a dependency and without teaching
 *   the executor a second protocol.
 *
 * CONTRACT (positional, identical to gemini-runner.mjs)
 *   node openai-compatible-runner.mjs <promptFile> <outFile> <model> [usageDir]
 *                                     [runId] [--max-output-tokens <n>]
 *
 *   Writes the model's plain text to <outFile>. Writes NOTHING on failure and
 *   exits non-zero, so the harness records UNRUN/INVALID with the stderr tail
 *   rather than scoring a fabricated response.
 *
 * CREDENTIALS AND ENDPOINT
 *   SECOND_PROVIDER_API_KEY   required; an empty value refuses to call, exactly
 *                             as the Gemini runner does for its own key.
 *   SECOND_PROVIDER_BASE_URL  required; the request is `POST {base}/chat/completions`.
 *   SECOND_PROVIDER_MODEL     the default when the positional model is omitted.
 *   None of the three is ever printed, written to disk, included in an error
 *   message, or included in the usage sidecar.
 *
 * ONE ATTEMPT, NEVER A SILENT RETRY
 *   The Gemini runner retries its retryable statuses; this one does not. A sweep
 *   measuring a rate must count a failed call as a failed call, not as a call that
 *   eventually succeeded after an invisible delay, so every non-success exits
 *   non-zero on the first response.
 *
 * THE OUTPUT CAP IS 4096 TOKENS, AND IT IS FIXED FOR A SWEEP
 *   Same default and same reason as the Gemini runner (thinking tokens count
 *   against the cap; 2048 truncated thinking-heavy answers, which Guard 4 makes
 *   INVALID). Exposed as `--max-output-tokens` and recorded in every sidecar.
 *
 * USAGE SIDECAR
 *   When <usageDir> is given, one JSON file per run records the API-reported
 *   token counts, the attempt history, the `finishReason` in the SAME vocabulary
 *   the Gemini runner emits (so `run-routing-round.mjs` needs no second rule),
 *   and the `maxOutputTokens` in force. The provider's raw names are kept beside
 *   the normalised ones so the cost can be recomputed without guessing.
 *
 * FINISH REASON MAPPING
 *   OpenAI-style value  ->  Gemini-style value the executor already enforces
 *   stop                ->  STOP           (the only scorable value)
 *   length              ->  MAX_TOKENS     (truncated; Guard 4 makes it INVALID)
 *   content_filter      ->  SAFETY
 *   tool_calls          ->  OTHER
 *   function_call       ->  OTHER
 *   anything else       ->  OTHER          (raw value kept in providerFinishReason)
 *
 * No dependencies. Node 22 ESM (global fetch).
 */

import * as fs from "node:fs/promises"
import * as path from "node:path"
import { pathToFileURL } from "node:url"

/** Thinking tokens count against this cap, so 2048 truncated thinking-heavy answers. */
export const DEFAULT_MAX_OUTPUT_TOKENS = 4096
const MIN_OUTPUT_TOKENS = 256
const MAX_OUTPUT_TOKENS_CEILING = 65536
const TIMEOUT_MS = 5 * 60 * 1000

const USAGE = `usage: openai-compatible-runner.mjs <promptFile> <outFile> <model> [usageDir] [runId] [--max-output-tokens <n>]

  --max-output-tokens <n>   output cap for every call (default ${DEFAULT_MAX_OUTPUT_TOKENS}).
                            Fixed for a sweep: do not change it mid-run. Recorded in
                            every usage sidecar.

  credentials: SECOND_PROVIDER_API_KEY, SECOND_PROVIDER_BASE_URL, SECOND_PROVIDER_MODEL
  one attempt; a non-success exits non-zero and is never retried.
`

function fail(message) {
	process.stderr.write(`openai-compatible-runner: ${message}\n`)
	process.exit(1)
}

/** Split argv into the five positionals and the one flag. Argument errors exit 1. */
export function parseArgs(argv) {
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

/** The executor scores only `STOP`; every other mapped value leaves its cell. */
export function mapFinishReason(rawReason) {
	if (rawReason === null || rawReason === undefined || rawReason === "") return null
	const reason = String(rawReason).toLowerCase()
	if (reason === "stop") return "STOP"
	if (reason === "length") return "MAX_TOKENS"
	if (reason === "content_filter") return "SAFETY"
	return "OTHER"
}

/**
 * Map an OpenAI-style `usage` object onto the Gemini-style `usageMetadata` names
 * the existing sidecars and cost reconciliation use, keeping the raw counts too.
 * Absent fields stay absent rather than becoming 0, so "not reported" is
 * distinguishable from "zero tokens".
 */
export function mapUsage(usage) {
	if (!usage || typeof usage !== "object") return null
	const mapped = {}
	if (Number.isFinite(usage.prompt_tokens)) mapped.promptTokenCount = usage.prompt_tokens
	if (Number.isFinite(usage.completion_tokens)) mapped.candidatesTokenCount = usage.completion_tokens
	if (Number.isFinite(usage.total_tokens)) mapped.totalTokenCount = usage.total_tokens
	const cached = usage.prompt_tokens_details?.cached_tokens ?? usage.prompt_cache_hit_tokens
	if (Number.isFinite(cached)) mapped.cachedContentTokenCount = cached
	if (Number.isFinite(usage.completion_tokens_details?.reasoning_tokens)) {
		mapped.thoughtsTokenCount = usage.completion_tokens_details.reasoning_tokens
	}
	mapped.provider = usage
	return mapped
}

/** Pull the reply text out of a chat completion. Returns null if there is none. */
function extractText(payload) {
	const choice = payload?.choices?.[0]
	if (!choice) return null
	const content = choice?.message?.content
	if (typeof content !== "string") return null
	const text = content.trim()
	return text.length === 0 ? null : text
}

function finishReasonOf(payload) {
	return payload?.choices?.[0]?.finish_reason ?? null
}

async function writeSidecar(usageDir, runId, outFile, record, maxOutputTokens, model) {
	if (!usageDir) return
	try {
		await fs.mkdir(usageDir, { recursive: true })
		const name = `usage-${runId || path.basename(outFile)}.json`
		const sidecar = { ...record, maxOutputTokens, model }
		await fs.writeFile(path.join(usageDir, name), `${JSON.stringify(sidecar, null, 2)}\n`, "utf-8")
	} catch (error) {
		// A sidecar failure must never turn a successful model call into a failed run.
		process.stderr.write(`openai-compatible-runner: sidecar not written: ${error.message}\n`)
	}
}

async function main({ promptFile, outFile, model, usageDir, runId, maxOutputTokens, apiKey, endpoint }) {
	const prompt = await fs.readFile(promptFile, "utf-8")
	const body = {
		model,
		messages: [{ role: "user", content: prompt }],
		temperature: 0,
		max_tokens: maxOutputTokens,
	}

	const startedAt = new Date().toISOString()
	let response
	let payload = null

	try {
		response = await fetch(endpoint, {
			method: "POST",
			headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
			body: JSON.stringify(body),
			signal: AbortSignal.timeout(TIMEOUT_MS),
		})
		payload = await response.json().catch(() => null)
	} catch (error) {
		// Never echo the request: its headers carry the key.
		const detail = error.name === "TimeoutError" ? "timeout" : error.message
		const message = `network error: ${detail}`
		await writeSidecar(
			usageDir,
			runId,
			outFile,
			{
				runId: runId ?? null,
				model,
				attempts: [{ attempt: 1, startedAt, endedAt: new Date().toISOString(), status: null, error: message }],
				outcome: "FAILED",
				error: message,
			},
			maxOutputTokens,
			model,
		)
		fail(message)
	}

	const status = response.status
	const rawFinishReason = status === 200 ? finishReasonOf(payload) : null
	const finishReason = status === 200 ? mapFinishReason(rawFinishReason) : null
	const text = status === 200 ? extractText(payload) : null
	const apiMessage = payload?.error?.message
		? String(payload.error.message).slice(0, 300)
		: payload?.message
			? String(payload.message).slice(0, 300)
			: null

	const attempt = {
		attempt: 1,
		startedAt,
		endedAt: new Date().toISOString(),
		httpStatus: status,
		finishReason,
		providerFinishReason: rawFinishReason,
		usageMetadata: status === 200 ? mapUsage(payload?.usage) : null,
		apiMessage,
	}

	if (status === 200 && text) {
		await fs.mkdir(path.dirname(outFile), { recursive: true })
		await fs.writeFile(outFile, text, "utf-8")
		await writeSidecar(
			usageDir,
			runId,
			outFile,
			{ runId: runId ?? null, model, attempts: [attempt], outcome: "RUN" },
			maxOutputTokens,
			model,
		)
		return
	}

	if (status === 200 && !text) {
		// A 200 with no usable text is an empty or filtered completion. Not retried,
		// for the same reason the Gemini runner does not retry it.
		const message = `no usable text (finishReason=${rawFinishReason ?? "none"})`
		await writeSidecar(
			usageDir,
			runId,
			outFile,
			{ runId: runId ?? null, model, attempts: [attempt], outcome: "FAILED", error: message },
			maxOutputTokens,
			model,
		)
		fail(message)
	}

	const message = `HTTP ${status}${apiMessage ? `: ${apiMessage}` : ""}`
	await writeSidecar(
		usageDir,
		runId,
		outFile,
		{ runId: runId ?? null, model, attempts: [attempt], outcome: "FAILED", error: message },
		maxOutputTokens,
		model,
	)
	fail(message)
}

/** The CLI: argument and credential checks, then exactly one attempt. */
async function cli() {
	const { positional, maxOutputTokens, help } = parseArgs(process.argv.slice(2))

	if (help) {
		process.stdout.write(USAGE)
		return
	}

	const [promptFile, outFile, modelArg, usageDir, runId] = positional

	if (!promptFile || !outFile) {
		process.stderr.write(`${USAGE}\n`)
		fail("a prompt file and an output file are required")
	}

	const model = modelArg || process.env.SECOND_PROVIDER_MODEL
	if (!model) fail("no model: pass it positionally, or set SECOND_PROVIDER_MODEL")

	const apiKey = process.env.SECOND_PROVIDER_API_KEY
	if (!apiKey) fail("SECOND_PROVIDER_API_KEY is empty; refusing to call the API")

	const baseUrl = process.env.SECOND_PROVIDER_BASE_URL
	if (!baseUrl) fail("SECOND_PROVIDER_BASE_URL is empty; refusing to guess an endpoint")

	const endpoint = `${baseUrl.replace(/\/+$/, "")}/chat/completions`

	await main({ promptFile, outFile, model, usageDir, runId, maxOutputTokens, apiKey, endpoint })
}

// Run only when invoked as a script, so the spec can import the pure mappings
// without reading `.env`, touching the network or demanding a key.
const invokedDirectly = typeof process.argv[1] === "string" && import.meta.url === pathToFileURL(process.argv[1]).href

if (invokedDirectly) {
	cli().catch((error) => {
		process.stderr.write(`openai-compatible-runner: ${error.message}\n`)
		process.exit(1)
	})
}
