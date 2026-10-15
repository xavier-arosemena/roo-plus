/**
 * verify-branding.spec.mjs
 *
 * Tests for scripts/verify-branding.mjs (the CI guard against branding
 * regressions in Roo+'s user-facing i18n surfaces).
 *
 * Covers:
 *   - the banned-pattern matcher (whole-word "Zoo" only; the "Roo+ Code" double
 *     brand),
 *   - in-scope file collection (src/package.nls*.json included; `__tests__` and
 *     `*.spec.*` / `*.test.*` excluded),
 *   - a real pass run against the CURRENT repo state,
 *   - the required tampered-/tmp-copy case: the gate must actually FAIL when a
 *     copy of the real in-scope files is mutated to reintroduce upstream branding.
 *
 * Run with: node --test scripts/verify-branding.spec.mjs
 * (scripts/ has no vitest runner; Node's built-in node:test is used — same
 * pattern as scripts/verify-locale-readmes.spec.mjs.)
 */

import { test } from "node:test"
import assert from "node:assert/strict"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

import { BANNED_PATTERNS, collectInScopeFiles, findBrandingViolations, verifyBranding } from "./verify-branding.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

test("the Zoo pattern is whole-word and does not match ZooCode or lowercase zoo", () => {
	const zoo = BANNED_PATTERNS.find((p) => p.name === "Zoo").regex
	assert.ok(zoo.test("Powered by Zoo"))
	assert.ok(zoo.test("Zoo-Code nightly"))
	assert.ok(!zoo.test("ZooCode"))
	assert.ok(!zoo.test("the zoo is quiet"))
})

test("the double-brand pattern matches Roo+ Code", () => {
	const double = BANNED_PATTERNS.find((p) => p.name === "Roo+ Code").regex
	assert.ok(double.test("Welcome to Roo+ Code"))
	assert.ok(!double.test("Welcome to Roo+"))
})

test("collectInScopeFiles includes package.nls files and skips tests/build output", () => {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "branding-scope-"))
	try {
		const write = (rel, content = "{}") => {
			const abs = path.join(tmp, rel)
			fs.mkdirSync(path.dirname(abs), { recursive: true })
			fs.writeFileSync(abs, content)
		}
		write("src/package.nls.json")
		write("src/package.nls.de.json")
		write("src/i18n/locales/en/common.json")
		write("webview-ui/src/i18n/locales/en/common.json")
		write("src/i18n/__tests__/branding.spec.ts", "// Zoo")
		write("src/i18n/locales/helpers.spec.json", "// Zoo")
		write("src/i18n/locales/legacy.test.ts", "// Zoo")
		write("src/i18n/dist/bundle.json", "// Zoo")

		const files = collectInScopeFiles(tmp)
		assert.ok(files.includes("src/package.nls.json"))
		assert.ok(files.includes("src/package.nls.de.json"))
		assert.ok(files.includes("src/i18n/locales/en/common.json"))
		assert.ok(files.includes("webview-ui/src/i18n/locales/en/common.json"))
		assert.ok(!files.some((f) => f.includes("__tests__")))
		assert.ok(!files.some((f) => f.endsWith("helpers.spec.json")))
		assert.ok(!files.some((f) => f.endsWith("legacy.test.ts")))
		assert.ok(!files.some((f) => f.includes("/dist/")))
	} finally {
		fs.rmSync(tmp, { recursive: true, force: true })
	}
})

test("findBrandingViolations reports file, line, and pattern", () => {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "branding-violations-"))
	try {
		fs.mkdirSync(path.join(tmp, "src"), { recursive: true })
		fs.writeFileSync(path.join(tmp, "src", "package.nls.json"), '{\n\t"x": "Roo+ Code"\n}\n')

		const violations = findBrandingViolations(["src/package.nls.json"], tmp)
		assert.equal(violations.length, 1)
		assert.equal(violations[0].file, "src/package.nls.json")
		assert.equal(violations[0].line, 2)
		assert.equal(violations[0].pattern, "Roo+ Code")
	} finally {
		fs.rmSync(tmp, { recursive: true, force: true })
	}
})

// ---------------------------------------------------------------------------
// Real repo state
// ---------------------------------------------------------------------------

test("the CURRENT repo passes verifyBranding", () => {
	const result = verifyBranding({ root: ROOT })
	assert.equal(result.ok, true, JSON.stringify(result.violations, null, 2))
	assert.ok(result.checked > 0, "expected at least one in-scope file to be scanned")
})

// ---------------------------------------------------------------------------
// The required tampered-/tmp-copy case
// ---------------------------------------------------------------------------

/** Copies every in-scope file from `from` into `to`, preserving relative paths. */
function copyInScope(from, to) {
	const files = collectInScopeFiles(from)
	assert.ok(files.length > 0, "fixture requires at least one in-scope file")
	for (const rel of files) {
		const dest = path.join(to, rel)
		fs.mkdirSync(path.dirname(dest), { recursive: true })
		fs.copyFileSync(path.join(from, rel), dest)
	}
	return files
}

test("verifyBranding FAILS on a tampered /tmp copy of the real in-scope files", () => {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "branding-tampered-"))
	try {
		const files = copyInScope(ROOT, tmp)

		// An untouched copy is clean.
		assert.equal(verifyBranding({ root: tmp }).ok, true)

		// Tamper one copied file to reintroduce the upstream brand.
		fs.appendFileSync(path.join(tmp, files[0]), '\n{"note":"Powered by Zoo"}\n')

		const tampered = verifyBranding({ root: tmp })
		assert.equal(tampered.ok, false)
		assert.ok(
			tampered.violations.some((v) => v.file === files[0] && v.pattern === "Zoo"),
			JSON.stringify(tampered.violations, null, 2),
		)
	} finally {
		fs.rmSync(tmp, { recursive: true, force: true })
	}
})

test("verifyBranding FAILS on a tampered Roo+ Code string", () => {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "branding-double-"))
	try {
		fs.mkdirSync(path.join(tmp, "src"), { recursive: true })
		fs.writeFileSync(path.join(tmp, "src", "package.nls.json"), '{\n\t"extension.displayName": "Roo+ Code"\n}\n')

		const result = verifyBranding({ root: tmp })
		assert.equal(result.ok, false)
		assert.ok(result.violations.some((v) => v.pattern === "Roo+ Code"))
	} finally {
		fs.rmSync(tmp, { recursive: true, force: true })
	}
})
