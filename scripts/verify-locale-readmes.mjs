#!/usr/bin/env node

/**
 * verify-locale-readmes.mjs
 *
 * CI guard for the 17 localized Roo+ landing pages at locales/<locale>/README.md
 * (ca, de, es, fr, hi, id, it, ja, ko, nl, pl, pt-BR, ru, tr, vi, zh-CN,
 * zh-TW). Implements the fix suggested in DEBT.md item #8 ("Locale README
 * Files Out of Sync").
 *
 * The locale READMEs were rewritten from stale upstream Zoo Code translations
 * into compact Roo+-only landing pages. This gate makes sure:
 *
 *   1. NO upstream Zoo Code reference ever creeps back into a locale README
 *      (case-insensitive substring blacklist — see UPSTREAM_MARKERS).
 *   2. Required Roo+ content is ALWAYS present (Open VSX link, GitHub repo
 *      link, link back to the English root README, link to the localized
 *      CONTRIBUTING.md — see REQUIRED_CONTENT).
 *   3. The language-switcher bar (English](../../README.md)) exists in every
 *      locale file.
 *   4. The set of locale directories under locales/ is EXACTLY the expected
 *      17: a missing locale directory, or an unexpected one, is a hard failure.
 *
 * Exits 0 with a summary when everything passes; exits 1 with clear per-file
 * error messages otherwise.
 *
 * Usage (repo root):
 *   node scripts/verify-locale-readmes.mjs
 *   ROO_LOCALES_ROOT=/tmp/fixture node scripts/verify-locale-readmes.mjs
 *
 * Env overrides:
 *   ROO_LOCALES_ROOT  path to the locales root to verify (default: <repo>/locales)
 *                     — used by the spec to run against temp fixtures.
 */

import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

import { logStep, logEndGroup, logInfo, logOk, logError, logSuccess } from "./lib/logger.mjs"

// Hierarchical tag identifying this process.
const TAG = "VERIFY:LOCALE-READMES"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")

/**
 * The exact set of locale landing pages that must exist under locales/.
 * Adding a new locale requires adding it here (and to the language switcher of
 * every README); removing one requires removing it here too.
 */
export const EXPECTED_LOCALES = [
	"ca",
	"de",
	"es",
	"fr",
	"hi",
	"id",
	"it",
	"ja",
	"ko",
	"nl",
	"pl",
	"pt-BR",
	"ru",
	"tr",
	"vi",
	"zh-CN",
	"zh-TW",
]

/**
 * Upstream Zoo Code references that were removed from the locale READMEs and
 * must never return. Matched case-insensitively as literal substrings (the
 * same spellings that appeared in the stale upstream translations).
 */
export const UPSTREAM_MARKERS = [
	"ZooCodeOrganization",
	"zoocode.dev",
	"docs.zoocode",
	"r/ZooCode",
	"roocodeyt",
	"x.com/ZooCodeDev",
	"Zoo-Code-Org",
	"bin/zoo-code",
	"zoo-code-<version>",
	"v3.72.0",
]

/**
 * Required Roo+ content that every locale landing page must carry. Matched as
 * literal substrings (URLs are matched by their domain+path so trailing
 * fragments/slashes do not false-negative).
 */
export const REQUIRED_CONTENT = [
	"open-vsx.org/extension/xavier-arosemena/roo-plus",
	"github.com/xavier-arosemena/roo-plus",
	"../../README.md",
	"./CONTRIBUTING.md",
]

/**
 * The marker that proves the language-switcher bar is present. Every locale
 * README's switcher links back to the English root README this way.
 */
export const SWITCHER_MARKER = "English](../../README.md)"

/**
 * Verdict for the upstream-marker blacklist. Pure — exported for the spec.
 * @param {string} content - Full text of a locale README.
 * @returns {{ ok: boolean, markers: string[] }}
 */
export function checkUpstreamMarkers(content) {
	const lower = content.toLowerCase()
	const found = UPSTREAM_MARKERS.filter((marker) => lower.includes(marker.toLowerCase()))
	return { ok: found.length === 0, markers: found }
}

/**
 * Verdict for required Roo+ content. Pure — exported for the spec.
 * @param {string} content - Full text of a locale README.
 * @returns {{ ok: boolean, missing: string[] }}
 */
export function checkRequiredContent(content) {
	const missing = REQUIRED_CONTENT.filter((needle) => !content.includes(needle))
	return { ok: missing.length === 0, missing }
}

/**
 * Verdict for the language-switcher bar. Pure — exported for the spec.
 * @param {string} content - Full text of a locale README.
 * @returns {{ ok: boolean, reason: string }}
 */
export function checkLanguageSwitcher(content) {
	const ok = content.includes(SWITCHER_MARKER)
	return { ok, reason: ok ? "" : `missing language-switcher bar (look for "${SWITCHER_MARKER}")` }
}

/**
 * Runs every content check for a single locale README and collects the
 * human-readable failures. Pure — exported for the spec.
 * @param {string} content - Full text of a locale README.
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function assessLocaleFile(content) {
	const errors = []

	const upstream = checkUpstreamMarkers(content)
	if (!upstream.ok) {
		errors.push(`contains upstream marker(s): ${upstream.markers.join(", ")}`)
	}

	const required = checkRequiredContent(content)
	if (!required.ok) {
		errors.push(`missing required Roo+ content: ${required.missing.join(", ")}`)
	}

	const switcher = checkLanguageSwitcher(content)
	if (!switcher.ok) {
		errors.push(switcher.reason)
	}

	return { ok: errors.length === 0, errors }
}

/**
 * Verifies a locales root: enumerates the locale directories and checks every
 * expected locale README. Pure (no side effects beyond reading) — exported for
 * the spec so it can run against temp fixtures.
 *
 * @param {{ localesRoot: string }} opts - Absolute path to the locales root.
 * @returns {Promise<{ ok: boolean, errors: string[], checked: string[] }>}
 *   - ok: true when every check passed
 *   - errors: human-readable per-file / per-directory failures
 *   - checked: the locale codes whose README was actually read and verified
 */
export async function verifyLocaleReadmes({ localesRoot }) {
	const errors = []
	const checked = []

	// 1. Enumerate the locale directories.
	let entries
	try {
		entries = await fs.promises.readdir(localesRoot, { withFileTypes: true })
	} catch (error) {
		return { ok: false, errors: [`cannot read locales root ${localesRoot}: ${error.message}`], checked }
	}
	const dirs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name)

	// 2. Unexpected locale directories are a hard failure.
	for (const dir of dirs) {
		if (!EXPECTED_LOCALES.includes(dir)) {
			errors.push(`locales/${dir}/: unexpected locale directory (expected only: ${EXPECTED_LOCALES.join(", ")})`)
		}
	}

	// 3. Every expected locale directory must exist.
	for (const locale of EXPECTED_LOCALES) {
		if (!dirs.includes(locale)) {
			errors.push(`locales/${locale}/README.md: locale directory is missing (expected ${EXPECTED_LOCALES.length} locales)`)
		}
	}

	// 4. Every expected locale README must exist and pass all content checks.
	for (const locale of EXPECTED_LOCALES) {
		const file = path.join(localesRoot, locale, "README.md")
		let content
		try {
			content = await fs.promises.readFile(file, "utf-8")
		} catch (error) {
			errors.push(`locales/${locale}/README.md: cannot read (${error.message})`)
			continue
		}
		checked.push(locale)
		const verdict = assessLocaleFile(content)
		if (!verdict.ok) {
			for (const err of verdict.errors) {
				errors.push(`locales/${locale}/README.md: ${err}`)
			}
		}
	}

	return { ok: errors.length === 0, errors, checked }
}

async function main() {
	const localesRoot = process.env.ROO_LOCALES_ROOT
		? path.resolve(process.env.ROO_LOCALES_ROOT)
		: path.resolve(ROOT, "locales")

	logStep(TAG, `Verifying ${EXPECTED_LOCALES.length} locale README landing pages (DEBT.md #8)`)
	logInfo(TAG, `locales root: ${localesRoot}`)

	const result = await verifyLocaleReadmes({ localesRoot })

	if (!result.ok) {
		for (const err of result.errors) {
			logError(TAG, err)
		}
		logError(TAG, `${result.errors.length} problem(s) found across ${EXPECTED_LOCALES.length} expected locale READMEs.`)
		logError(TAG, "Upstream Zoo Code references must not return; required Roo+ content must always be present.")
		process.exit(1)
	}

	logOk(TAG, `${result.checked.length}/${EXPECTED_LOCALES.length} expected locale READMEs verified: ${result.checked.join(", ")}`)
	logEndGroup()
	logSuccess(TAG, "Locale README landing pages verified — no upstream markers, required Roo+ content present.")
	process.exit(0)
}

// Only run when executed directly (not when imported by the spec / CI).
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
	main().catch((error) => {
		logError(TAG, `verification failed: ${error.message}`)
		process.exit(1)
	})
}
