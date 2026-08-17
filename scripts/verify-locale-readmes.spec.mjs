/**
 * verify-locale-readmes.spec.mjs
 *
 * Tests for scripts/verify-locale-readmes.mjs (the CI guard for the 17
 * localized Roo+ landing pages — DEBT.md item #8 / Issue #220).
 *
 * Covers:
 *   - the pure content checks (upstream-marker blacklist, required content,
 *     language switcher, per-file assessment),
 *   - a real pass run against the CURRENT repo state (all 17 locale READMEs
 *     must verify clean),
 *   - deterministic failure cases against self-contained temp fixtures
 *     (upstream marker present, Open VSX link missing, locale directory
 *     missing, unexpected locale directory).
 *
 * Run with: node --test scripts/verify-locale-readmes.spec.mjs
 * (scripts/ has no vitest runner, so node:test built into Node 22 is used —
 * same as scripts/verify-submodule-pin.spec.mjs.)
 */

import { test } from "node:test"
import assert from "node:assert/strict"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

import {
	EXPECTED_LOCALES,
	UPSTREAM_MARKERS,
	REQUIRED_CONTENT,
	SWITCHER_MARKER,
	assessLocaleFile,
	checkLanguageSwitcher,
	checkRequiredContent,
	checkUpstreamMarkers,
	verifyLocaleReadmes,
} from "./verify-locale-readmes.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")
const REPO_LOCALES_ROOT = path.join(ROOT, "locales")

/**
 * A minimal but representative valid locale landing page: language switcher,
 * Open VSX link, GitHub repo link, back-link to the English README, and a link
 * to the localized CONTRIBUTING.md. Deliberately mirrors the real files'
 * structure without copying them verbatim.
 */
const VALID_README = `# Roo+

<div align="center">
<sub>

[English](../../README.md) • [Deutsch](../de/README.md) • <b>Español</b>

</sub>
</div>

Roo+ es un **fork de Zoo Code** con **90 modos personalizados precargados**.

## Instalación

<a href="https://open-vsx.org/extension/xavier-arosemena/roo-plus">Open VSX Registry</a>

## Recursos

- [GitHub](https://github.com/xavier-arosemena/roo-plus)
- [README completo (inglés)](../../README.md)
- [Cómo contribuir](./CONTRIBUTING.md)
`

/**
 * Builds a self-contained fixture locales root in a fresh temp directory:
 * writes VALID_README (or a per-locale mutation) into every given locale, runs
 * `fn(root)`, then always removes the temp directory. Deterministic and
 * side-effect free on the repo.
 *
 * @param {string[]} locales - Locale dirs to create.
 * @param {Record<string, (content: string) => string>} [mutators] - Per-locale
 *   content transformers for the failure cases.
 * @param {(root: string) => Promise<void>} fn - The test body.
 */
async function withFixture(locales, mutators = {}, fn) {
	const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "verify-locale-readmes-"))
	try {
		for (const locale of locales) {
			const localeDir = path.join(root, locale)
			await fs.promises.mkdir(localeDir, { recursive: true })
			let content = VALID_README
			if (mutators[locale]) content = mutators[locale](content)
			await fs.promises.writeFile(path.join(localeDir, "README.md"), content, "utf-8")
		}
		await fn(root)
	} finally {
		await fs.promises.rm(root, { recursive: true, force: true })
	}
}

// ---------------------------------------------------------------------------
// Pure content checks
// ---------------------------------------------------------------------------

test("checkUpstreamMarkers flags every upstream marker", () => {
	for (const marker of UPSTREAM_MARKERS) {
		const result = checkUpstreamMarkers(`Some text ${marker} more text`)
		assert.equal(result.ok, false, `expected ${marker} to be flagged`)
		assert.ok(result.markers.includes(marker))
	}
})

test("checkUpstreamMarkers is case-insensitive", () => {
	const result = checkUpstreamMarkers("download the latest from zooCodeOrganization today")
	assert.equal(result.ok, false)
	assert.equal(result.markers.length, 1)
	assert.equal(result.markers[0].toLowerCase(), "zoocodeorganization")
})

test("checkUpstreamMarkers passes clean Roo+ content", () => {
	// "Zoo Code" (the prose mention, not the URL/org markers) is allowed.
	assert.deepEqual(checkUpstreamMarkers(VALID_README), { ok: true, markers: [] })
})

test("checkRequiredContent flags every missing required link", () => {
	const result = checkRequiredContent("# Roo+\nNo Roo+ links here.\n")
	assert.equal(result.ok, false)
	for (const needle of REQUIRED_CONTENT) {
		assert.ok(result.missing.includes(needle), `expected "${needle}" to be reported missing`)
	}
})

test("checkRequiredContent passes content with every required link", () => {
	assert.deepEqual(checkRequiredContent(VALID_README), { ok: true, missing: [] })
})

test("checkLanguageSwitcher requires the English back-link bar", () => {
	assert.deepEqual(checkLanguageSwitcher(VALID_README), { ok: true, reason: "" })
	const without = VALID_README.replace("English](../../README.md)", "Español</b>")
	const verdict = checkLanguageSwitcher(without)
	assert.equal(verdict.ok, false)
	assert.match(verdict.reason, new RegExp(SWITCHER_MARKER.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
})

test("assessLocaleFile collects all failure kinds", () => {
	const verdict = assessLocaleFile("# Roo+\nvisit https://zoocode.dev\n")
	assert.equal(verdict.ok, false)
	assert.ok(verdict.errors.some((e) => /upstream marker/i.test(e)))
	assert.ok(verdict.errors.some((e) => /required Roo\+ content/i.test(e)))
	assert.ok(verdict.errors.some((e) => /language-switcher/i.test(e)))
})

test("assessLocaleFile passes a valid landing page", () => {
	assert.deepEqual(assessLocaleFile(VALID_README), { ok: true, errors: [] })
})

// ---------------------------------------------------------------------------
// Real run against the current repo state
// ---------------------------------------------------------------------------

test("passes against the current repo state (all 17 locale READMEs valid)", async () => {
	const result = await verifyLocaleReadmes({ localesRoot: REPO_LOCALES_ROOT })
	assert.equal(result.ok, true)
	assert.deepEqual(result.errors, [])
	assert.equal(result.checked.length, EXPECTED_LOCALES.length)
	assert.deepEqual(result.checked, EXPECTED_LOCALES)
})

// ---------------------------------------------------------------------------
// Failure cases against temp fixtures
// ---------------------------------------------------------------------------

test("fails when a locale README contains an upstream marker", async () => {
	await withFixture(
		EXPECTED_LOCALES,
		{
			es: (content) => content + "\nInstall from https://zoocode.dev/download\n",
		},
		async (root) => {
			const result = await verifyLocaleReadmes({ localesRoot: root })
			assert.equal(result.ok, false)
			assert.ok(
				result.errors.some((e) => e.includes("locales/es/README.md") && /upstream marker/i.test(e)),
				`expected an es/README.md upstream-marker error, got: ${result.errors.join("\n")}`,
			)
		},
	)
})

test("fails when a locale README is missing the Open VSX link", async () => {
	await withFixture(
		EXPECTED_LOCALES,
		{
			de: (content) =>
				content.replace(
					"https://open-vsx.org/extension/xavier-arosemena/roo-plus",
					"https://example.com/marketplace-placeholder",
				),
		},
		async (root) => {
			const result = await verifyLocaleReadmes({ localesRoot: root })
			assert.equal(result.ok, false)
			assert.ok(
				result.errors.some(
					(e) => e.includes("locales/de/README.md") && e.includes("open-vsx.org/extension/xavier-arosemena/roo-plus"),
				),
				`expected a de/README.md missing-Open-VSX error, got: ${result.errors.join("\n")}`,
			)
		},
	)
})

test("fails when an expected locale directory is missing its README", async () => {
	const locales = EXPECTED_LOCALES.filter((locale) => locale !== "ja")
	await withFixture(locales, {}, async (root) => {
		const result = await verifyLocaleReadmes({ localesRoot: root })
		assert.equal(result.ok, false)
		assert.ok(
			result.errors.some((e) => e.includes("locales/ja/") && /missing/i.test(e)),
			`expected a ja/ missing error, got: ${result.errors.join("\n")}`,
		)
	})
})

test("fails when an unexpected locale directory appears", async () => {
	const locales = [...EXPECTED_LOCALES, "xx"]
	await withFixture(locales, {}, async (root) => {
		const result = await verifyLocaleReadmes({ localesRoot: root })
		assert.equal(result.ok, false)
		assert.ok(
			result.errors.some((e) => e.includes("locales/xx/") && /unexpected locale directory/i.test(e)),
			`expected an xx/ unexpected-directory error, got: ${result.errors.join("\n")}`,
		)
	})
})

test("fails clearly when the locales root cannot be read", async () => {
	const result = await verifyLocaleReadmes({ localesRoot: path.join(os.tmpdir(), "does-not-exist-verify-locale-readmes") })
	assert.equal(result.ok, false)
	assert.ok(result.errors.some((e) => /cannot read locales root/i.test(e)))
})
