#!/usr/bin/env node

/**
 * adjudicate-with-model.mjs — the independent second reading of a blind
 * adjudication packet, produced by the second provider's model.
 *
 * WHAT IT DOES
 *   Reads a packet built by `build-adjudication-packet.mjs`, asks the second
 *   provider's chat-completions endpoint to place each reply in exactly one
 *   class (`DECLARATION` / `ASK` / `OTHER`), and writes one JSONL record per
 *   entry: `{ id, verdict, raw, attempts }`.
 *
 * WHY THESE PARAMETERS, EXACTLY
 *   - temperature 0: the reading must be reproducible, not sampled.
 *   - max_tokens 8192, not 4096: the second provider's model is a reasoning
 *     model and its thinking tokens count against the cap. At 4096 a
 *     reasoning-heavy reply is truncated, which looks exactly like a parse
 *     failure and would be misread as ambiguity in the reply (D-24).
 *   - concurrency 4, each worker strictly sequential: four calls in flight,
 *     never four chains per worker.
 *   - exponential backoff on 429 and 5xx only, at most three retries per entry.
 *   - a parse failure is recorded as `verdict: null` with the raw text kept. It
 *     is never retried into a guess.
 *   - the run aborts after 10 consecutive call failures: that is an auth or
 *     endpoint problem, not bad luck. It also aborts immediately on 401/403/404.
 *
 * CREDENTIALS
 *   SECOND_PROVIDER_API_KEY, SECOND_PROVIDER_BASE_URL, SECOND_PROVIDER_MODEL
 *   are read from the environment, or from `.env` when absent, with comments
 *   and surrounding quotes stripped. The key is never printed, written, or put
 *   in an error message — only its length is printed.
 *
 * USAGE
 *   node scripts/adjudicate-with-model.mjs --packet <packet.jsonl> --out <file> [options]
 *
 *   --provider <tag>     output-name tag; default is the model's first segment
 *   --concurrency <n>    default 4
 *   --max-tokens <n>     default 8192, and deliberately not lowered for the sweep
 *   --limit <n>          judge only the first n entries (smoke test)
 *   --budget-usd <n>     soft stop (default 1.20); prices via
 *                        ADJUDICATION_PRICE_INPUT_PER_MTOK / _OUTPUT_PER_MTOK
 *
 * No dependencies. Node 22 ESM (global fetch).
 */

import * as fs from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"

import { buildPrompt, classifierPromptFor, parseVerdict } from "./lib/adjudication-classifier.mjs"

/**
 * Which classifier wording produced these judgements.
 *
 * Default 1, the registered prompt. Version 2 corrects the construct: version 1's
 * tie-break ("names a mode anywhere") turns every ask that enumerates candidate
 * modes into a declaration, which on this corpus is most of them. The version is
 * taken from the environment rather than a flag so that re-running a pass is a
 * single variable, and it is recorded in the output filename by the caller.
 */
const PROMPT_VERSION = Number(process.env.CLASSIFIER_PROMPT_VERSION ?? 1)
if (!Number.isInteger(PROMPT_VERSION) || PROMPT_VERSION < 1) {
	throw new Error(`CLASSIFIER_PROMPT_VERSION must be a positive integer, got ${process.env.CLASSIFIER_PROMPT_VERSION}`)
}
const CLASSIFIER_PROMPT_TEXT = classifierPromptFor(PROMPT_VERSION)

const DEFAULT_CONCURRENCY = 4
const DEFAULT_MAX_TOKENS = 8192
const MAX_RETRIES = 3
const CONSECUTIVE_FAILURE_LIMIT = 10
const TIMEOUT_MS = 5 * 60 * 1000

/** Upper-bound price assumptions, in USD per million tokens. Overridable. */
const DEFAULT_PRICE_INPUT_PER_MTOK = 0.3
const DEFAULT_PRICE_OUTPUT_PER_MTOK = 1.2

const USAGE = `usage: adjudicate-with-model.mjs --packet <packet.jsonl> --out <file> [options]

  --packet <file>      the blind packet (packet.jsonl); never a join
  --out <file>         judgements JSONL, { id, verdict, raw, attempts }
  --provider <tag>     tag for the output name (default: model's first segment)
  --concurrency <n>    calls in flight (default ${DEFAULT_CONCURRENCY})
  --max-tokens <n>     output cap (default ${DEFAULT_MAX_TOKENS}; do not lower for a sweep, D-24)
  --limit <n>          judge only the first n entries (smoke test)
  --budget-usd <n>     soft stop on estimated spend (default 1.20)
  --help               print this text

  credentials: SECOND_PROVIDER_API_KEY, SECOND_PROVIDER_BASE_URL, SECOND_PROVIDER_MODEL
  from the environment or .env. Only the key length is printed.
`

function fail(message) {
	process.stderr.write(`adjudicate-with-model: ${message}\n`)
	process.exit(1)
}

// ---------------------------------------------------------------------------
// Credentials
// ---------------------------------------------------------------------------

/** One `NAME=value` line, comment and surrounding quotes stripped. */
export function envValue(text, name) {
	const match = new RegExp(`^${name}=(.*)$`, "m").exec(String(text))
	if (!match) return null
	const value = match[1].replace(/#.*/, "").trim().replace(/^["']|["']$/g, "")
	return value === "" ? null : value
}

async function loadCredentials() {
	const file = path.resolve(".env")
	const text = await fs.readFile(file, "utf-8").catch(() => null)
	const pick = (name) => (process.env[name] && process.env[name].trim() !== "" ? process.env[name].trim() : text ? envValue(text, name) : null)
	const apiKey = pick("SECOND_PROVIDER_API_KEY")
	const baseUrl = pick("SECOND_PROVIDER_BASE_URL")
	const model = pick("SECOND_PROVIDER_MODEL")
	if (!apiKey) throw new Error("SECOND_PROVIDER_API_KEY is empty; refusing to call the API")
	if (!baseUrl) throw new Error("SECOND_PROVIDER_BASE_URL is empty; refusing to guess an endpoint")
	if (!model) throw new Error("SECOND_PROVIDER_MODEL is empty; refusing to guess a model")
	return { apiKey, baseUrl, model }
}

// ---------------------------------------------------------------------------
// Pure helpers (exported for tests)
// ---------------------------------------------------------------------------

export function isRetryableStatus(status) {
	return status === 429 || (typeof status === "number" && status >= 500 && status <= 599)
}

export function isFatalStatus(status) {
	return status === 401 || status === 403 || status === 404
}

/**
 * Exponential backoff, no more than 30s between tries unless the provider asks
 * for longer via Retry-After (capped at 60s). `attempt` is 1-based.
 */
export function backoffDelayMs(attempt, retryAfterMs = null) {
	if (Number.isFinite(retryAfterMs) && retryAfterMs > 0) return Math.min(retryAfterMs, 60_000)
	return Math.min(1000 * 2 ** (attempt - 1), 30_000)
}

/** Pull text out of a chat completion, tolerating string or parts-array content. */
export function extractContent(payload) {
	const content = payload?.choices?.[0]?.message?.content
	if (typeof content === "string") return content
	if (Array.isArray(content)) {
		const joined = content
			.map((part) => (typeof part === "string" ? part : typeof part?.text === "string" ? part.text : ""))
			.join("")
		return joined === "" ? null : joined
	}
	return null
}

/** Accumulate the provider's usage object into fixed counters. */
function addUsage(totals, usage) {
	if (!usage || typeof usage !== "object") return
	if (Number.isFinite(usage.prompt_tokens)) totals.promptTokens += usage.prompt_tokens
	if (Number.isFinite(usage.completion_tokens)) totals.completionTokens += usage.completion_tokens
	if (Number.isFinite(usage.total_tokens)) totals.totalTokens += usage.total_tokens
	const reasoning = usage.completion_tokens_details?.reasoning_tokens
	if (Number.isFinite(reasoning)) totals.reasoningTokens += reasoning
}

export function estimatedCostUsd(totals, inputPrice, outputPrice) {
	return (totals.promptTokens / 1_000_000) * inputPrice + (totals.completionTokens / 1_000_000) * outputPrice
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Parse the packet JSONL. Refuses a malformed or duplicate entry. */
export function parsePacket(text, where = "packet") {
	const entries = []
	const seen = new Set()
	for (const [index, line] of String(text).split("\n").entries()) {
		if (line.trim() === "") continue
		let value
		try {
			value = JSON.parse(line)
		} catch (error) {
			throw new Error(`${where}:${index + 1} is not JSON: ${error.message}`)
		}
		if (typeof value?.id !== "string" || !/^[0-9a-f]{12}$/.test(value.id)) {
			throw new Error(`${where}:${index + 1} has no 12-hex id`)
		}
		if (typeof value?.brief !== "string" || typeof value?.reply !== "string") {
			throw new Error(`${where}:${index + 1} (${value.id}) needs string brief and reply`)
		}
		if (seen.has(value.id)) throw new Error(`${where}:${index + 1} repeats id ${value.id}`)
		seen.add(value.id)
		entries.push({ id: value.id, brief: value.brief, reply: value.reply })
	}
	if (entries.length === 0) throw new Error(`${where} holds no entries`)
	return entries
}

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------

function parseArgs(argv) {
	const opts = {
		packet: null,
		out: null,
		provider: null,
		concurrency: DEFAULT_CONCURRENCY,
		maxTokens: DEFAULT_MAX_TOKENS,
		limit: null,
		budgetUsd: 1.2,
		help: false,
	}
	for (let index = 0; index < argv.length; index++) {
		const arg = argv[index]
		const value = () => {
			const next = argv[++index]
			if (next === undefined) throw new Error(`${arg} needs a value`)
			return next
		}
		if (arg === "--packet") opts.packet = value()
		else if (arg === "--out") opts.out = value()
		else if (arg === "--provider") opts.provider = value()
		else if (arg === "--concurrency") opts.concurrency = Number(value())
		else if (arg === "--max-tokens") opts.maxTokens = Number(value())
		else if (arg === "--limit") opts.limit = Number(value())
		else if (arg === "--budget-usd") opts.budgetUsd = Number(value())
		else if (arg === "--help" || arg === "-h") opts.help = true
		else throw new Error(`unknown argument: ${arg}`)
	}
	if (opts.packet === null) throw new Error("--packet is required")
	if (opts.out === null) throw new Error("--out is required")
	if (!Number.isInteger(opts.concurrency) || opts.concurrency < 1 || opts.concurrency > 8) {
		throw new Error("--concurrency must be an integer between 1 and 8")
	}
	if (!Number.isInteger(opts.maxTokens) || opts.maxTokens < 1024) throw new Error("--max-tokens must be an integer >= 1024")
	if (opts.limit !== null && (!Number.isInteger(opts.limit) || opts.limit < 1)) throw new Error("--limit must be a positive integer")
	if (!Number.isFinite(opts.budgetUsd) || opts.budgetUsd <= 0) throw new Error("--budget-usd must be a positive number")
	return opts
}

// ---------------------------------------------------------------------------
// One call, with retry accounting outside
// ---------------------------------------------------------------------------

async function chat({ endpoint, apiKey, model, prompt, maxTokens }) {
	const body = {
		model,
		messages: [{ role: "user", content: prompt }],
		temperature: 0,
		max_tokens: maxTokens,
	}
	const startedAt = new Date().toISOString()
	let response
	try {
		response = await fetch(endpoint, {
			method: "POST",
			headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
			body: JSON.stringify(body),
			signal: AbortSignal.timeout(TIMEOUT_MS),
		})
	} catch (error) {
		const detail = error.name === "TimeoutError" ? "timeout" : error.message
		// Never echo the request: its headers carry the key.
		return { ok: false, status: null, error: `network error: ${detail}`, retryable: true, fatal: false, startedAt }
	}

	const payload = await response.json().catch(() => null)
	const status = response.status
	const retryAfter = Number(response.headers.get("retry-after"))
	const retryAfterMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : null

	if (status === 200) {
		const content = extractContent(payload)
		if (content === null) {
			return {
				ok: false,
				status,
				error: "HTTP 200 with no message content",
				retryable: false,
				fatal: false,
				usage: payload?.usage ?? null,
				startedAt,
			}
		}
		return { ok: true, status, raw: content, usage: payload?.usage ?? null, retryAfterMs, startedAt }
	}

	const apiMessage = payload?.error?.message
		? String(payload.error.message).slice(0, 300)
		: payload?.message
			? String(payload.message).slice(0, 300)
			: null
	return {
		ok: false,
		status,
		error: `HTTP ${status}${apiMessage ? `: ${apiMessage}` : ""}`,
		retryable: isRetryableStatus(status),
		fatal: isFatalStatus(status),
		retryAfterMs,
		startedAt,
	}
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

async function main() {
	const opts = parseArgs(process.argv.slice(2))
	if (opts.help) {
		process.stdout.write(USAGE)
		return 0
	}

	const { apiKey, baseUrl, model } = await loadCredentials()
	const endpoint = `${baseUrl.replace(/\/+$/, "")}/chat/completions`
	const tag = opts.provider ?? model.split(/[-_/]/)[0]

	const packetAbs = path.resolve(opts.packet)
	const outAbs = path.resolve(opts.out)
	const entries = parsePacket(await fs.readFile(packetAbs, "utf-8"), opts.packet)
	const selected = opts.limit === null ? entries : entries.slice(0, opts.limit)

	const inputPrice = Number(process.env.ADJUDICATION_PRICE_INPUT_PER_MTOK) || DEFAULT_PRICE_INPUT_PER_MTOK
	const outputPrice = Number(process.env.ADJUDICATION_PRICE_OUTPUT_PER_MTOK) || DEFAULT_PRICE_OUTPUT_PER_MTOK

	const state = {
		next: 0,
		completed: 0,
		records: 0,
		failures: 0,
		consecutiveFailures: 0,
		aborted: false,
		abortReason: null,
		tallies: { DECLARATION: 0, ASK: 0, OTHER: 0, null: 0 },
		usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, reasoningTokens: 0 },
		attemptsTotal: 0,
		missing: [],
	}

	await fs.mkdir(path.dirname(outAbs), { recursive: true })
	await fs.writeFile(outAbs, "", "utf-8")
	let appendChain = Promise.resolve()
	const appendRecord = (record) => {
		const line = `${JSON.stringify(record)}\n`
		appendChain = appendChain.then(() => fs.appendFile(outAbs, line, "utf-8"))
		return appendChain
	}

	const abort = (reason) => {
		if (state.aborted) return
		state.aborted = true
		state.abortReason = reason
	}

	const classifyOne = async (entry) => {
		const prompt = buildPrompt({ brief: entry.brief, reply: entry.reply, prompt: CLASSIFIER_PROMPT_TEXT })
		let attempt = 0
		while (!state.aborted) {
			attempt++
			state.attemptsTotal++
			const result = await chat({ endpoint, apiKey, model, prompt, maxTokens: opts.maxTokens })

			if (result.ok) {
				state.consecutiveFailures = 0
				addUsage(state.usage, result.usage)
				const verdict = parseVerdict(result.raw)
				state.tallies[verdict === null ? "null" : verdict]++
				state.records++
				await appendRecord({ id: entry.id, verdict, raw: result.raw, attempts: attempt })
				const spent = estimatedCostUsd(state.usage, inputPrice, outputPrice)
				if (spent >= opts.budgetUsd) {
					abort(`estimated spend $${spent.toFixed(3)} reached the $${opts.budgetUsd.toFixed(2)} soft budget`)
				}
				return
			}

			if (result.usage) addUsage(state.usage, result.usage)

			if (result.fatal) {
				abort(`provider returned ${result.error} — auth or endpoint problem, not bad luck`)
				return
			}

			if (result.retryable && attempt <= MAX_RETRIES) {
				const waitMs = backoffDelayMs(attempt, result.retryAfterMs) + Math.floor(Math.random() * 250)
				process.stderr.write(
					`adjudicate-with-model: ${entry.id} attempt ${attempt} failed (${result.error}); retrying in ${waitMs}ms\n`,
				)
				await sleep(waitMs)
				continue
			}

			// Exhausted retries (or a non-retryable non-fatal status): count it and
			// move on. It is not a parse failure, so it is not written as a verdict.
			state.failures++
			state.consecutiveFailures++
			state.missing.push(entry.id)
			process.stderr.write(`adjudicate-with-model: ${entry.id} failed after ${attempt} attempt(s): ${result.error}\n`)
			if (state.consecutiveFailures >= CONSECUTIVE_FAILURE_LIMIT) {
				abort(`${state.consecutiveFailures} consecutive call failures — auth or endpoint problem, not bad luck`)
			}
			return
		}
	}

	const worker = async () => {
		while (true) {
			if (state.aborted) return
			const index = state.next++
			if (index >= selected.length) return
			await classifyOne(selected[index])
			state.completed++
			if (state.completed % 50 === 0 || state.completed === selected.length) {
				const t = state.tallies
				process.stdout.write(
					`progress ${state.completed}/${selected.length} — DECLARATION ${t.DECLARATION}, ASK ${t.ASK}, OTHER ${t.OTHER}, null ${t.null}, call failures ${state.failures}\n`,
				)
			}
		}
	}

	process.stdout.write(
		`adjudicating ${selected.length} of ${entries.length} entries from ${opts.packet}\n` +
			`model: ${model} (endpoint host: ${new URL(endpoint).host}), provider tag: ${tag}\n` +
			`key length: ${apiKey.length}\n` +
			`temperature: 0, max_tokens: ${opts.maxTokens}, concurrency: ${opts.concurrency}\n`,
	)

	await Promise.all(Array.from({ length: opts.concurrency }, () => worker()))
	await appendChain

	const cost = estimatedCostUsd(state.usage, inputPrice, outputPrice)
	const t = state.tallies
	process.stdout.write("\n")
	process.stdout.write(`judgements: ${outAbs} (${state.records} records)\n`)
	process.stdout.write(`verdicts: DECLARATION ${t.DECLARATION}, ASK ${t.ASK}, OTHER ${t.OTHER}\n`)
	process.stdout.write(`nulls: ${t.null}${t.null > 0 ? " — parse failures, raw text kept" : ""}\n`)
	process.stdout.write(`call failures (no record): ${state.failures}\n`)
	if (state.missing.length > 0) process.stdout.write(`missing ids: ${state.missing.join(", ")}\n`)
	process.stdout.write(
		`tokens: prompt ${state.usage.promptTokens}, completion ${state.usage.completionTokens}` +
			`${state.usage.reasoningTokens > 0 ? ` (reasoning ${state.usage.reasoningTokens})` : ""}, ` +
			`total ${state.usage.totalTokens}; attempts ${state.attemptsTotal}\n`,
	)
	process.stdout.write(
		`estimated cost: $${cost.toFixed(4)} at $${inputPrice}/M input, $${outputPrice}/M output (upper-bound assumption)\n`,
	)

	if (state.abortReason) {
		process.stderr.write(`ABORTED: ${state.abortReason}\n`)
		return 1
	}
	const nullRate = state.records === 0 ? 0 : t.null / Math.max(1, selected.length)
	if (nullRate > 0.1) {
		process.stderr.write(
			`WARNING: nulls are ${(nullRate * 100).toFixed(1)}% of the packet (>10%) — the prompt or the parser is wrong, not the replies\n`,
		)
	}
	return 0
}

// Run only when invoked as a script, so specs can import the pure helpers.
const invokedDirectly = typeof process.argv[1] === "string" && import.meta.url === pathToFileURL(process.argv[1]).href

if (invokedDirectly) {
	main()
		.then((code) => process.exit(code))
		.catch((error) => fail(error.message))
}
