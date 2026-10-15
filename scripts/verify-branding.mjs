#!/usr/bin/env node

/**
 * verify-branding.mjs
 *
 * CI guard against branding regressions in Roo+'s user-facing localization
 * surfaces. The fork is "Roo+"; the upstream product name must never leak back
 * into strings the user reads, and the mistaken double brand "Roo+ Code" must
 * never appear.
 *
 * In-scope files (the user-facing localization surfaces):
 *   - webview-ui/src/i18n/**            (webview translations)
 *   - src/i18n/**                       (extension-host translations)
 *   - src/package.nls*.json             (VS Code manifest strings)
 *
 * It fails when a banned pattern appears in an in-scope file:
 *   1. `\bZoo\b`      — whole-word upstream brand ("Zoo", "Zoo-Code").
 *   2. `Roo+ Code`    — mistaken double brand (should be "Roo+").
 *
 * Excluded, and therefore never flagged:
 *   - `__tests__/**` and `*.spec.*` / `*.test.*` files (assertions legitimately
 *     mention the upstream name, e.g. "brands the English messages as Roo+,
 *     not Zoo").
 *   - build output (`dist`/`build`/`out`/`coverage`) and `node_modules`.
 *   - files on the explicit ALLOWED_FILES allow-list (intentionally-upstream
 *     artifacts — mirroring the allow-list style of verify-locale-readmes.mjs).
 *
 * Usage (repo root):
 *   node scripts/verify-branding.mjs
 *   ROO_BRANDING_ROOT=/tmp/fixture node scripts/verify-branding.mjs
 *
 * Env overrides (used by the spec):
 *   ROO_BRANDING_ROOT   repo root to scan   (default: <repo>)
 */

import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

import { logStep, logEndGroup, logInfo, logOk, logError, logSuccess } from "./lib/logger.mjs"

// Hierarchical tag identifying this process.
const TAG = "VERIFY:BRANDING"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")

/**
 * Banned branding patterns, matched per line against in-scope files.
 * `regex` must be non-global: a global regex is stateful under repeated tests.
 * @type {{ name: string; regex: RegExp; hint: string }[]}
 */
export const BANNED_PATTERNS = [
	{ name: "Zoo", regex: /\bZoo\b/, hint: 'upstream whole-word "Zoo"' },
	{ name: "Roo+ Code", regex: /Roo\+ Code/, hint: 'mistaken double brand (use "Roo+")' },
]

/** Directory names never descended into while collecting in-scope files. */
export const EXCLUDED_DIRS = new Set(["node_modules", "__tests__", "dist", "build", "out", "coverage", ".turbo"])

/** Base-name pattern for test files (`*.spec.*` / `*.test.*`), which legitimately reference upstream names. */
export const EXCLUDED_FILE_RE = /\.(?:spec|test)\.[^.]+$/

/**
 * Repo-relative POSIX paths that are intentionally upstream and therefore
 * exempt from the banned-pattern scan. Empty by default; add an entry (with a
 * justification comment) only when an in-scope file must quote upstream naming.
 * @type {string[]}
 */
export const ALLOWED_FILES = []

/** Directories (repo-relative) whose contents are in scope. */
export const IN_SCOPE_DIRS = ["webview-ui/src/i18n", "src/i18n"]

/** VS Code manifest string files live directly under `src/`. */
export const PACKAGE_NLS_DIR = "src"
export const PACKAGE_NLS_RE = /^package\.nls(\..+)?\.json$/

/**
 * Collects every in-scope file (repo-relative, POSIX-separated, sorted), honouring
 * the directory/file exclusions and the allow-list. Pure — exported for the spec.
 * @param {string} root - Absolute path to the repo root to scan.
 * @returns {string[]}
 */
export function collectInScopeFiles(root) {
	const files = []

	const walk = (dir) => {
		if (!fs.existsSync(dir)) return
		for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
			const abs = path.join(dir, entry.name)
			if (entry.isDirectory()) {
				if (EXCLUDED_DIRS.has(entry.name)) continue
				walk(abs)
			} else if (entry.isFile()) {
				if (EXCLUDED_FILE_RE.test(entry.name)) continue
				const rel = path.relative(root, abs).split(path.sep).join("/")
				if (ALLOWED_FILES.includes(rel)) continue
				files.push(rel)
			}
		}
	}

	for (const dir of IN_SCOPE_DIRS) walk(path.join(root, dir))

	const nlsDir = path.join(root, PACKAGE_NLS_DIR)
	if (fs.existsSync(nlsDir)) {
		for (const entry of fs.readdirSync(nlsDir, { withFileTypes: true })) {
			if (!entry.isFile() || !PACKAGE_NLS_RE.test(entry.name)) continue
			const rel = `${PACKAGE_NLS_DIR}/${entry.name}`
			if (!ALLOWED_FILES.includes(rel)) files.push(rel)
		}
	}

	return [...new Set(files)].sort()
}

/**
 * Finds every banned-pattern occurrence in the given repo-relative files.
 * Pure — exported for the spec.
 * @param {string[]} relFiles - Repo-relative file paths.
 * @param {string} root - Absolute repo root the paths are relative to.
 * @returns {{ file: string; line: number; pattern: string; hint: string; text: string }[]}
 */
export function findBrandingViolations(relFiles, root) {
	const violations = []
	for (const rel of relFiles) {
		let content
		try {
			content = fs.readFileSync(path.join(root, rel), "utf-8")
		} catch {
			continue
		}
		const lines = content.split(/\r?\n/)
		for (let i = 0; i < lines.length; i++) {
			for (const pattern of BANNED_PATTERNS) {
				if (pattern.regex.test(lines[i])) {
					violations.push({
						file: rel,
						line: i + 1,
						pattern: pattern.name,
						hint: pattern.hint,
						text: lines[i].trim(),
					})
				}
			}
		}
	}
	return violations
}

/**
 * Runs the branding gate against the given repo root. Pure enough for the spec
 * to point at a temp copy. Exported for the spec.
 * @param {{ root: string }} opts
 * @returns {{ ok: boolean; violations: object[]; checked: number }}
 */
export function verifyBranding({ root }) {
	const files = collectInScopeFiles(root)
	const violations = findBrandingViolations(files, root)
	return { ok: violations.length === 0, violations, checked: files.length }
}

async function main() {
	const root = process.env.ROO_BRANDING_ROOT ? path.resolve(process.env.ROO_BRANDING_ROOT) : ROOT

	logStep(TAG, "Verifying user-facing i18n surfaces contain no upstream branding")
	logInfo(TAG, `repo root: ${root}`)
	logInfo(TAG, `in scope:  ${[...IN_SCOPE_DIRS, `${PACKAGE_NLS_DIR}/package.nls*.json`].join(", ")}`)

	const result = verifyBranding({ root })

	if (!result.ok) {
		for (const violation of result.violations) {
			logError(
				TAG,
				`${violation.file}:${violation.line}: banned branding "${violation.pattern}" (${violation.hint})\n  ${violation.text}`,
			)
		}
		logError(TAG, `${result.violations.length} branding regression(s) found across ${result.checked} file(s).`)
		logError(TAG, 'The fork is "Roo+" — never ship upstream "Zoo" or the double brand "Roo+ Code" to users.')
		process.exit(1)
	}

	logOk(TAG, `${result.checked} in-scope file(s) scanned — no upstream "Zoo" / "Roo+ Code" branding.`)
	logEndGroup()
	logSuccess(TAG, "No branding regressions in the user-facing i18n surfaces.")
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
