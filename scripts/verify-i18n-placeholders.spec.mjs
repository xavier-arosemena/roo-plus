/**
 * verify-i18n-placeholders.spec.mjs
 *
 * Tests for scripts/verify-i18n-placeholders.mjs (the repo-wide placeholder/tag
 * parity gate).
 *
 * Covers:
 *   - token extraction (whitespace normalisation, numbering, named tags,
 *     closing tags, self-closing tags),
 *   - order-independence (reordering tokens is allowed) and
 *     duplicate detection (a repeated token is a mismatch),
 *   - flattening of nested objects/arrays,
 *   - an end-to-end failure on a TAMPERED /tmp COPY of the real locale trees
 *     (the required "prove it fails on a tampered copy" case) plus its
 *     allow-list suppression,
 *   - a real pass run against the CURRENT repo state.
 *
 * Run with: node --test scripts/verify-i18n-placeholders.spec.mjs
 * (scripts/ has no vitest runner; Node's built-in node:test is used — same
 * pattern as scripts/verify-branding.spec.mjs.)
 */

import { test } from "node:test"
import assert from "node:assert/strict"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

import {
	BASE_LOCALE,
	diffTokens,
	extractTokens,
	flattenStrings,
	verifyI18nPlaceholders,
} from "./verify-i18n-placeholders.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")

const writeJson = (file, data) => {
	fs.mkdirSync(path.dirname(file), { recursive: true })
	fs.writeFileSync(file, JSON.stringify(data, null, "\t"))
}

// ---------------------------------------------------------------------------
// Token extraction
// ---------------------------------------------------------------------------

test("extractTokens reads placeholders and tags, normalising whitespace", () => {
	const tokens = extractTokens("Roo+ searched for <code>{{ regex }}</code> in <0>{{path}}</0>")
	// extractTokens sorts its output; compare against a locally-sorted expectation
	// so the assertion does not encode the collation order.
	const expected = ["{{path}}", "{{regex}}", "</0>", "</code>", "<0>", "<code>"].sort()
	assert.deepEqual(tokens, expected)
})

test("extractTokens treats <br/> and <br> as the same token", () => {
	assert.deepEqual(extractTokens("a<br/>b"), ["<br>"])
	assert.deepEqual(extractTokens("a<br>b"), ["<br>"])
})

test("extractTokens ignores comparison operators that are not tags", () => {
	assert.deepEqual(extractTokens("{{itemTokens}} > {{maxTokens}}"), ["{{itemTokens}}", "{{maxTokens}}"])
	assert.deepEqual(extractTokens("a < b and c"), [])
})

// ---------------------------------------------------------------------------
// Multiset comparison
// ---------------------------------------------------------------------------

test("diffTokens is order-independent", () => {
	const base = extractTokens("{{a}} then {{b}}")
	const target = extractTokens("{{b}} d'abord {{a}}")
	assert.deepEqual(diffTokens(base, target), { missing: [], extra: [] })
})

test("diffTokens reports a missing token", () => {
	assert.deepEqual(diffTokens(extractTokens("{{a}} {{b}}"), extractTokens("{{a}}")), {
		missing: ["{{b}}"],
		extra: [],
	})
})

test("diffTokens reports an extra token", () => {
	assert.deepEqual(diffTokens(extractTokens("{{a}}"), extractTokens("{{a}} {{oops}}")), {
		missing: [],
		extra: ["{{oops}}"],
	})
})

test("diffTokens detects a duplicated token as one missing", () => {
	assert.deepEqual(diffTokens(extractTokens("{{a}} {{a}}"), extractTokens("{{a}}")), {
		missing: ["{{a}}"],
		extra: [],
	})
})

test("diffTokens detects a dropped closing tag", () => {
	assert.deepEqual(diffTokens(extractTokens("<0>{{a}}</0>"), extractTokens("<0>{{a}}")), {
		missing: ["</0>"],
		extra: [],
	})
})

// ---------------------------------------------------------------------------
// Flattening
// ---------------------------------------------------------------------------

test("flattenStrings walks nested objects and arrays", () => {
	const flat = flattenStrings({ a: { b: "x" }, list: ["y", { z: "w" }], count: 3 })
	assert.deepEqual([...flat.entries()].sort(), [
		["a.b", "x"],
		["list[0]", "y"],
		["list[1].z", "w"],
	])
})

// ---------------------------------------------------------------------------
// End-to-end
// ---------------------------------------------------------------------------

test("the gate passes against the current repo state", () => {
	const result = verifyI18nPlaceholders({ root: ROOT })
	assert.equal(result.ok, true, JSON.stringify(result.findings.slice(0, 5), null, 2))
	assert.ok(result.checked > 1000, `expected many compared values, got ${result.checked}`)
})

test("the gate fails on a tampered /tmp copy and the allow-list can suppress it", () => {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "i18n-placeholders-"))
	try {
		// A faithful copy of both real locale trees.
		fs.cpSync(path.join(ROOT, "webview-ui/src/i18n/locales"), path.join(tmp, "webview-ui/src/i18n/locales"), {
			recursive: true,
		})
		fs.cpSync(path.join(ROOT, "src/i18n/locales"), path.join(tmp, "src/i18n/locales"), { recursive: true })

		// The untampered copy must pass.
		assert.equal(verifyI18nPlaceholders({ root: tmp }).ok, true)

		// Tamper: drop every placeholder/tag from one German value that carries
		// them in English.
		const baseFile = path.join(tmp, "webview-ui/src/i18n/locales", BASE_LOCALE, "chat.json")
		const targetFile = path.join(tmp, "webview-ui/src/i18n/locales", "de", "chat.json")
		const base = JSON.parse(fs.readFileSync(baseFile, "utf8"))

		const [key] = [...flattenStrings(base).entries()].find(([, value]) => /\{\{/.test(value)) ?? []
		assert.ok(key, "expected at least one chat key with a placeholder")

		const target = JSON.parse(fs.readFileSync(targetFile, "utf8"))
		const segments = key.split(".")
		let cursor = target
		for (const segment of segments.slice(0, -1)) cursor = cursor[segment]
		cursor[segments.at(-1)] = "tampered"
		writeJson(targetFile, target)

		const tampered = verifyI18nPlaceholders({ root: tmp })
		assert.equal(tampered.ok, false)
		const finding = tampered.findings.find((f) => f.locale === "de" && f.key === key)
		assert.ok(finding, `expected a finding for de:${key}`)
		assert.ok(finding.missing.length > 0)

		// The allow-list mechanism suppresses an intentional exception.
		const allowed = verifyI18nPlaceholders({
			root: tmp,
			allowList: [{ namespace: "chat", locale: "de", key, reason: "spec fixture" }],
		})
		assert.equal(allowed.ok, true)
	} finally {
		fs.rmSync(tmp, { recursive: true, force: true })
	}
})
