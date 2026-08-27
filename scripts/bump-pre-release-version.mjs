#!/usr/bin/env node

/**
 * bump-pre-release-version.mjs
 *
 * Deterministic helper for the iterate-then-stabilize release policy
 * (see docs/adr/adr-release-versioning-policy.md).
 *
 *   node scripts/bump-pre-release-version.mjs            # bump:pre-release
 *     Bumps src/package.json to the NEXT patch on the current minor line:
 *       3.86.0  -> 3.86.1
 *       3.86.19 -> 3.86.20
 *
 *   node scripts/bump-pre-release-version.mjs --line      # bump:line
 *     Starts a NEW minor line (next release cycle):
 *       3.86.19 -> 3.87.0
 *       3.88.3  -> 3.89.0
 *
 * The bump is purely local and does NOT query the registries: the CI guard in
 * .github/workflows/pre-release-publish.yml enforces that the committed version
 * is unique and greater than the max published patch on its minor line, so a
 * one-off historical gap (e.g. the 3.86 line already published through 3.86.18
 * under the old scheme) is caught there and resolved by committing a higher
 * patch (3.86.19) once.
 *
 * The write is ATOMIC (temp file + rename) to avoid corrupting src/package.json
 * on interruption. src/utils/safeWriteJson.ts cannot be reused here because it
 * is a TypeScript module with runtime deps (proper-lockfile,
 * json-stream-stringify) not importable from a plain node .mjs script; this
 * implements the same atomicity intent (no partial/corrupt writes) without the
 * extra deps.
 */

import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")
export const PACKAGE_JSON_PATH = path.join(ROOT, "src", "package.json")

export const MODE_LINE = "line"
export const MODE_PRE_RELEASE = "pre-release"

/**
 * Pure version computation — the next version for the given mode.
 * @param {string} version - Current plain `major.minor.patch` version.
 * @param {"line" | "pre-release"} mode - `line` starts a new minor (patch 0);
 *   `pre-release` (default) bumps the patch by 1 on the current minor.
 * @returns {string | null} - The next version, or null when `version` is not a
 *   plain `major.minor.patch` string.
 */
export function computeNextVersion(version, mode = MODE_PRE_RELEASE) {
	const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version)
	if (!match) {
		return null
	}
	let major = Number(match[1])
	let minor = Number(match[2])
	let patch = Number(match[3])
	if (mode === MODE_LINE) {
		minor += 1
		patch = 0
	} else {
		patch += 1
	}
	return `${major}.${minor}.${patch}`
}

function main() {
	const mode = process.argv[2] === "--line" ? MODE_LINE : MODE_PRE_RELEASE
	const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, "utf8"))
	const nextVersion = computeNextVersion(pkg.version, mode)
	if (nextVersion === null) {
		console.error(`[BUMP:VERSION] src/package.json version "${pkg.version}" is not a plain major.minor.patch — cannot bump`)
		process.exit(1)
	}
	pkg.version = nextVersion

	// Atomic write: serialize to a temp file in the same directory, then rename
	// over the target so a crash mid-write can never leave a truncated/partial
	// package.json.
	const tmpPath = path.join(path.dirname(PACKAGE_JSON_PATH), `.package.json.${process.pid}.${Date.now()}.tmp`)
	fs.writeFileSync(tmpPath, `${JSON.stringify(pkg, null, "\t")}\n`)
	fs.renameSync(tmpPath, PACKAGE_JSON_PATH)

	console.log(`Bumped src/package.json version ${pkg.version} (${mode})`)
	process.exit(0)
}

// Only run when executed directly (not when imported by the spec).
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
	main()
}
