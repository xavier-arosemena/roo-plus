#!/usr/bin/env node

/**
 * verify-i18n-placeholders.mjs
 *
 * Repo-wide placeholder / tag parity gate for every i18n namespace in BOTH
 * locale trees:
 *   - webview-ui/src/i18n/locales/<locale>/<namespace>.json   (WebView UI)
 *   - src/i18n/locales/<locale>/<namespace>.json              (extension host)
 *
 * For every key that exists in the base locale (`en`) and in the target locale,
 * the target value must carry the SAME MULTISET of
 *   - `{{ interpolation }}` placeholders (inner whitespace normalised), and
 *   - `<0>` / `</0>` / `<tag>` / `</tag>` component tokens
 * as the English source. Ordering is irrelevant — reordering tokens inside a
 * sentence is a legitimate translation choice and is explicitly allowed.
 *
 * A missing, extra, or duplicated token is a HARD FAILURE: i18next renders a
 * malformed string without complaint, so a bad translation silently drops an
 * interpolated value or a React component (leaking a raw `<0>` to the user).
 *
 * Keys that only exist in some locales are NOT this gate's concern — that is
 * `scripts/find-missing-translations.js`. Non-string leaves (numbers, booleans,
 * arrays, objects) are traversed; only string leaves are compared.
 *
 * Intentional exceptions go on ALLOW_LIST (namespace + locale + key, with a
 * reason), mirroring the allow-list style of verify-branding.mjs.
 *
 * Usage (repo root):
 *   node scripts/verify-i18n-placeholders.mjs
 *
 * Env overrides (used by the spec):
 *   ROO_I18N_ROOT   repo root to scan (default: <repo>)
 */

import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

import { logStep, logEndGroup, logInfo, logOk, logError, logSuccess } from "./lib/logger.mjs"

// Hierarchical tag identifying this process; every log line is prefixed so CI
// logs are greppable per process.
const TAG = "VERIFY:I18N-PLACEHOLDERS"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")

/** Locale whose values are the source of truth. */
export const BASE_LOCALE = "en"

/**
 * Locale trees to check, relative to the repo root. Both trees are checked with
 * the same rules, so a namespace name collision (e.g. `marketplace.json`) is
 * fine — they are independent namespaces.
 * @type {{ name: string; dir: string }[]}
 */
export const LOCALE_ROOTS = [
	{ name: "webview-ui", dir: "webview-ui/src/i18n/locales" },
	{ name: "core", dir: "src/i18n/locales" },
]

/**
 * Intentional placeholder/tag differences, keyed by namespace + locale + key.
 * Each entry MUST carry a reason. Keep this list empty unless the divergence is
 * genuinely intentional (e.g. a token that is meaningless in a given language).
 * @type {{ namespace: string; locale: string; key: string; reason: string }[]}
 */
export const ALLOW_LIST = []

/** `{{ name }}` → captured as `{{name}}`. */
export const PLACEHOLDER_RE = /\{\{\s*([^{}]+?)\s*\}\}/g

/** `<0>`, `</0>`, `<tag>`, `</tag>`, `<br/>` → captured as `<0>` / `</tag>`. */
export const TAG_RE = /<\/?([A-Za-z][A-Za-z0-9]*|\d+)(?:\s[^<>]*?)?\/?>/g

/**
 * Extract the canonical, sorted token multiset of a string value.
 * Sorting makes the comparison order-independent while preserving duplicates.
 * @param {unknown} value
 * @returns {string[]}
 */
export function extractTokens(value) {
	if (typeof value !== "string") return []

	const tokens = []
	let match

	PLACEHOLDER_RE.lastIndex = 0
	while ((match = PLACEHOLDER_RE.exec(value)) !== null) {
		tokens.push(`{{${match[1]}}}`)
	}

	TAG_RE.lastIndex = 0
	while ((match = TAG_RE.exec(value)) !== null) {
		const closing = match[0].startsWith("</") ? "/" : ""
		tokens.push(`<${closing}${match[1]}>`)
	}

	return tokens.sort()
}

/**
 * Flatten a nested translation object into `dotted.path` → string leaves.
 * Arrays are traversed with `[index]` segments.
 * @param {unknown} obj
 * @param {string} prefix
 * @param {Map<string, string>} out
 * @returns {Map<string, string>}
 */
export function flattenStrings(obj, prefix = "", out = new Map()) {
	if (obj === null || obj === undefined) return out

	if (typeof obj === "string") {
		out.set(prefix, obj)
		return out
	}

	if (Array.isArray(obj)) {
		obj.forEach((item, index) => flattenStrings(item, prefix ? `${prefix}[${index}]` : `[${index}]`, out))
		return out
	}

	if (typeof obj === "object") {
		for (const [key, value] of Object.entries(obj)) {
			flattenStrings(value, prefix ? `${prefix}.${key}` : key, out)
		}
	}

	return out
}

const countTokens = (tokens) => {
	const counts = new Map()
	for (const token of tokens) counts.set(token, (counts.get(token) ?? 0) + 1)
	return counts
}

/**
 * Multiset difference between the base and target token lists.
 * @param {string[]} baseTokens
 * @param {string[]} targetTokens
 * @returns {{ missing: string[]; extra: string[] }}
 */
export function diffTokens(baseTokens, targetTokens) {
	const base = countTokens(baseTokens)
	const target = countTokens(targetTokens)

	/** @type {string[]} */
	const missing = []
	/** @type {string[]} */
	const extra = []

	for (const [token, count] of base) {
		const have = target.get(token) ?? 0
		for (let i = have; i < count; i++) missing.push(token)
	}

	for (const [token, count] of target) {
		const have = base.get(token) ?? 0
		for (let i = have; i < count; i++) extra.push(token)
	}

	return { missing: missing.sort(), extra: extra.sort() }
}

const isAllowed = (allowList, { namespace, locale, key }) =>
	allowList.some((entry) => entry.namespace === namespace && entry.locale === locale && entry.key === key)

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"))

const listDirNames = (dir, { files = false } = {}) => {
	const entries = fs.readdirSync(dir, { withFileTypes: true })
	return entries
		.filter((entry) => (files ? entry.isFile() : entry.isDirectory()))
		.map((entry) => entry.name)
		.sort()
}

/**
 * Run the gate.
 * @param {{ root?: string; allowList?: typeof ALLOW_LIST }} [opts]
 * @returns {{ ok: boolean; findings: object[]; checked: number }}
 */
export function verifyI18nPlaceholders({ root = ROOT, allowList = ALLOW_LIST } = {}) {
	/** @type {object[]} */
	const findings = []
	let checked = 0

	for (const localeRoot of LOCALE_ROOTS) {
		const dir = path.join(root, localeRoot.dir)
		if (!fs.existsSync(dir)) continue

		const locales = listDirNames(dir)
		if (!locales.includes(BASE_LOCALE)) continue

		const namespaces = listDirNames(path.join(dir, BASE_LOCALE), { files: true })
			.filter((file) => file.endsWith(".json"))
			.map((file) => file.replace(/\.json$/, ""))

		for (const namespace of namespaces) {
			const baseFile = path.join(dir, BASE_LOCALE, `${namespace}.json`)
			const baseFlat = flattenStrings(readJson(baseFile))

			for (const locale of locales) {
				if (locale === BASE_LOCALE) continue

				const localeFile = path.join(dir, locale, `${namespace}.json`)
				if (!fs.existsSync(localeFile)) continue

				let localeFlat
				try {
					localeFlat = flattenStrings(readJson(localeFile))
				} catch {
					// Unparseable locale files are the missing-translations gate's
					// problem, not ours.
					continue
				}

				for (const [key, value] of localeFlat) {
					if (!baseFlat.has(key)) continue
					checked++

					const { missing, extra } = diffTokens(extractTokens(baseFlat.get(key)), extractTokens(value))
					if (missing.length === 0 && extra.length === 0) continue
					if (isAllowed(allowList, { namespace, locale, key })) continue

					findings.push({
						namespace,
						locale,
						key,
						file: path.relative(root, localeFile).split(path.sep).join("/"),
						missing,
						extra,
					})
				}
			}
		}
	}

	return { ok: findings.length === 0, findings, checked }
}

const describe = (finding) => {
	const parts = []
	if (finding.missing.length > 0) parts.push(`missing [${finding.missing.join(", ")}]`)
	if (finding.extra.length > 0) parts.push(`extra [${finding.extra.join(", ")}]`)
	return parts.join("; ")
}

async function main() {
	const root = process.env.ROO_I18N_ROOT ? path.resolve(process.env.ROO_I18N_ROOT) : ROOT

	logStep(TAG, "Verifying placeholder/tag parity across every i18n namespace")
	logInfo(TAG, `repo root: ${root}`)
	logInfo(TAG, `in scope:  ${LOCALE_ROOTS.map((r) => r.dir).join(", ")}`)

	const result = verifyI18nPlaceholders({ root })

	if (!result.ok) {
		for (const finding of result.findings) {
			logError(
				TAG,
				`${finding.file} — ${finding.namespace}:${finding.key} (${finding.locale})\n  ${describe(finding)}`,
			)
		}
		logError(
			TAG,
			`${result.findings.length} placeholder/tag mismatch(es) found across ${result.checked} compared value(s).`,
		)
		logError(TAG, "Translations must keep the same {{placeholders}} and <0>/<tag> tokens as the en source.")
		process.exit(1)
	}

	logOk(TAG, `${result.checked} compared value(s) — placeholder/tag parity holds against "${BASE_LOCALE}".`)
	logEndGroup()
	logSuccess(TAG, "No placeholder/tag drift across the locale trees.")
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
