/**
 * adjudication-classifier.spec.mjs — pins the second-reading classifier and the
 * pure helpers of its runner.
 *
 * WHAT THIS PINS
 *   1. The prompt is fixed and carries only the brief and the reply, so every
 *      entry is read by byte-identical instructions and the reader stays blind.
 *   2. The parser is strict: one word, surrounding whitespace tolerated, nothing
 *      else accepted. A malformed reply becomes null, never a guess.
 *   3. The credentials parser strips comments and quotes and never treats an
 *      empty value as present.
 *   4. Retry classification is exactly 429 and 5xx, and backoff is exponential.
 *
 * NO MODEL CALL IS POSSIBLE HERE
 *   Only pure functions are imported; the runner's CLI is guarded by
 *   `invokedDirectly` and decides nothing at import time.
 *
 * Run with: node --test scripts/adjudication-classifier.spec.mjs
 */

import { describe, it } from "node:test"
import assert from "node:assert/strict"

import { CLASSIFIER_PROMPT, CLASSIFIER_VERDICTS, buildPrompt, parseVerdict } from "./lib/adjudication-classifier.mjs"
import {
	backoffDelayMs,
	envValue,
	estimatedCostUsd,
	extractContent,
	isFatalStatus,
	isRetryableStatus,
	parsePacket,
} from "./adjudicate-with-model.mjs"

describe("classifier prompt", () => {
	it("carries both placeholders and no verdict hint beyond the registered vocabulary", () => {
		assert.match(CLASSIFIER_PROMPT, /\{\{BRIEF\}\}/)
		assert.match(CLASSIFIER_PROMPT, /\{\{REPLY\}\}/)
		for (const verdict of CLASSIFIER_VERDICTS) assert.ok(CLASSIFIER_PROMPT.includes(verdict))
		assert.match(CLASSIFIER_PROMPT, /Tie-break rule: if the reply names a mode anywhere/)
	})

	it("substitutes the brief and the reply exactly once", () => {
		const prompt = buildPrompt({ brief: "Explain the module.", reply: "**mode**: `explain`" })
		assert.ok(prompt.includes("Explain the module."))
		assert.ok(prompt.includes("**mode**: `explain`"))
		assert.ok(!prompt.includes("{{BRIEF}}"))
		assert.ok(!prompt.includes("{{REPLY}}"))
	})

	it("is identical for identical entries and differs when the reply differs", () => {
		const first = buildPrompt({ brief: "b", reply: "r" })
		const same = buildPrompt({ brief: "b", reply: "r" })
		const other = buildPrompt({ brief: "b", reply: "r2" })
		assert.equal(first, same)
		assert.notEqual(first, other)
	})

	it("does not rescan text inserted as the reply for placeholders", () => {
		const prompt = buildPrompt({ brief: "b", reply: "literal {{REPLY}} and {{BRIEF}}" })
		assert.ok(prompt.endsWith("literal {{REPLY}} and {{BRIEF}}"))
	})

	it("refuses non-string inputs", () => {
		assert.throws(() => buildPrompt({ brief: null, reply: "r" }), /string brief/)
		assert.throws(() => buildPrompt({ brief: "b", reply: undefined }), /string reply/)
	})
})

describe("parseVerdict", () => {
	it("accepts the three words, case-insensitively, with surrounding whitespace", () => {
		assert.equal(parseVerdict("DECLARATION"), "DECLARATION")
		assert.equal(parseVerdict(" ask \n"), "ASK")
		assert.equal(parseVerdict("Other"), "OTHER")
	})

	it("rejects anything that is not exactly one word", () => {
		for (const raw of ["", "   ", "ASK.", "I think ASK", "DECLARATION\nASK", "AS K", "`ASK`", null, undefined, 3]) {
			assert.equal(parseVerdict(raw), null, `expected null for ${JSON.stringify(raw)}`)
		}
	})
})

describe("credentials parsing", () => {
	it("strips comments and surrounding quotes", () => {
		const text = 'SECOND_PROVIDER_API_KEY="sk-abc" # comment\nSECOND_PROVIDER_MODEL=deepseek-v4-pro\n'
		assert.equal(envValue(text, "SECOND_PROVIDER_API_KEY"), "sk-abc")
		assert.equal(envValue(text, "SECOND_PROVIDER_MODEL"), "deepseek-v4-pro")
	})

	it("does not match a longer name or treat an empty value as present", () => {
		const text = "SECOND_PROVIDER_API_KEY_OLD=x\nSECOND_PROVIDER_MODEL=\n"
		assert.equal(envValue(text, "SECOND_PROVIDER_MODEL"), null)
		assert.equal(envValue(text, "SECOND_PROVIDER_API_KEY"), null)
	})
})

describe("retry classification", () => {
	it("retries exactly 429 and 5xx", () => {
		assert.equal(isRetryableStatus(429), true)
		assert.equal(isRetryableStatus(500), true)
		assert.equal(isRetryableStatus(503), true)
		assert.equal(isRetryableStatus(599), true)
		for (const status of [200, 400, 401, 422, 600]) assert.equal(isRetryableStatus(status), false)
	})

	it("treats auth and endpoint statuses as fatal", () => {
		for (const status of [401, 403, 404]) assert.equal(isFatalStatus(status), true)
		for (const status of [400, 429, 500]) assert.equal(isFatalStatus(status), false)
	})

	it("backs off exponentially and honours Retry-After", () => {
		assert.equal(backoffDelayMs(1), 1000)
		assert.equal(backoffDelayMs(2), 2000)
		assert.equal(backoffDelayMs(3), 4000)
		assert.equal(backoffDelayMs(10), 30_000)
		assert.equal(backoffDelayMs(1, 7000), 7000)
		assert.equal(backoffDelayMs(1, 120_000), 60_000)
	})
})

describe("response and packet helpers", () => {
	it("extracts string and parts-array content, and null when absent", () => {
		assert.equal(extractContent({ choices: [{ message: { content: "ASK" } }] }), "ASK")
		assert.equal(extractContent({ choices: [{ message: { content: [{ text: "AS" }, { text: "K" }] } }] }), "ASK")
		assert.equal(extractContent({ choices: [{ message: { content: null } }] }), null)
		assert.equal(extractContent({}), null)
	})

	it("parses a packet and refuses duplicates and missing fields", () => {
		const good = '{"id":"abcdef123456","brief":"b","reply":"r"}\n'
		assert.deepEqual(parsePacket(good), [{ id: "abcdef123456", brief: "b", reply: "r" }])
		assert.throws(() => parsePacket(`${good}${good}`), /repeats id/)
		assert.throws(() => parsePacket('{"id":"nothex","brief":"b","reply":"r"}'), /12-hex id/)
		assert.throws(() => parsePacket('{"id":"abcdef123456","brief":"b"}'), /string brief and reply/)
	})

	it("estimates cost from token totals", () => {
		const cost = estimatedCostUsd({ promptTokens: 1_000_000, completionTokens: 1_000_000 }, 0.3, 1.2)
		assert.ok(Math.abs(cost - 1.5) < 1e-9)
	})
})
