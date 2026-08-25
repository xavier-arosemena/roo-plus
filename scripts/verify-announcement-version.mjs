#!/usr/bin/env node

/**
 * verify-announcement-version.mjs
 *
 * Fail-fast release guard for the "What's New" announcement popup (bug #265).
 *
 * The popup content lives in the build-time-generated
 * src/shared/announcements.ts (derived from src/CHANGELOG.md by
 * scripts/generate-announcements.mjs) and the popup only re-arms when the
 * current version has non-empty highlights. If the version is bumped without
 * regenerating that asset, the announcement silently stops showing — a
 * regression that would otherwise ship unreviewed.
 *
 * This gate asserts, for the CURRENT version in src/package.json:
 *   1. The changelog has a section for that version (a version bump without a
 *      changelog entry fails).
 *   2. That section yields non-empty release highlights (a version bump without
 *      announcement content fails).
 *   3. src/shared/announcements.ts is byte-identical to what the generator
 *      would emit for the current version (a stale / un-regenerated asset
 *      fails).
 *
 * Wired as `prevsix`, `prebundle` and `prevscode:prepublish` in root +
 * src/package.json (so it cannot be bypassed by any packaging path) and into
 * `code-qa.yml` + `test:scripts` so CI fails loudly on a version change without
 * announcement data.
 *
 * Usage:
 *   node scripts/verify-announcement-version.mjs
 *   pnpm verify:announcement-version
 *
 * Exit codes: 0 = data present + in sync; 1 = missing / empty / stale data.
 */

import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

import { logStep, logEndGroup, logInfo, logOk, logError, logSuccess } from "./lib/logger.mjs"
import {
	CHANGELOG_PATH,
	OUTPUT_PATH,
	parseChangelogSection,
	renderAnnouncementsModule,
} from "./generate-announcements.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")
const PACKAGE_JSON_PATH = path.join(ROOT, "src", "package.json")
const TAG = "VERIFY:ANNOUNCEMENT-VERSION"

/**
 * Whether the strict announcement check should be SKIPPED because the caller is
 * building for the pre-release channel (PKG_RELEASE_CHANNEL=prerelease).
 *
 * The pre-release publish workflow packages a DERIVED version
 * (`<major>.<minor>.<run>`, see the "Set pre-release version" step) that by
 * design never has a CHANGELOG section or a generated announcement entry — the
 * gap-minor pre-release line is not a released stable, so the "What's New"
 * popup content is keyed to the COMMITTED version instead. That committed
 * version (which does carry announcement data) is verified by the pre-release
 * workflow in an early verification step BEFORE the version is mutated. This
 * gate therefore skips itself for pre-release builds so the
 * `prevsix`/`prebundle`/`prevscode:prepublish` hooks do not fail the package at
 * version-mutation time (bug #265 guard; this resolves the pre-release publish
 * regression where the derived version has no announcement entry).
 *
 * Stable-channel builds (the default, and every CI gate that does not set
 * PKG_RELEASE_CHANNEL) keep the strict check: a version bump without
 * announcement data must still fail loudly.
 *
 * @param {Record<string, string | undefined>} env - Environment (defaults to process.env).
 * @returns {boolean}
 */
export function isPreReleaseChannel(env = process.env) {
	return env.PKG_RELEASE_CHANNEL === "prerelease"
}

/**
 * Pure verdict for a single version: does the committed announcement asset
 * cover it, with non-empty highlights, byte-identical to a fresh generation?
 * @param {string} version - Current extension version (from src/package.json).
 * @param {string} changelogText - Contents of src/CHANGELOG.md.
 * @param {string} assetText - Contents of src/shared/announcements.ts.
 * @returns {{ ok: boolean, reasons: string[] }}
 */
export function assessAnnouncementVersion(version, changelogText, assetText) {
	const reasons = []

	const section = parseChangelogSection(changelogText, version)
	if (!section) {
		return {
			ok: false,
			reasons: [
				`version ${version} has no section in ${CHANGELOG_PATH} — a version bump must ship a changelog entry`,
			],
		}
	}

	if (section.highlights.length === 0) {
		reasons.push(`version ${version} has no release highlights in ${CHANGELOG_PATH} — the popup would be empty`)
	}

	const expected = renderAnnouncementsModule(section)
	if (assetText !== expected) {
		reasons.push(
			`${OUTPUT_PATH} is stale for version ${version} — regenerate it with \`pnpm generate:announcements\``,
		)
	}

	return { ok: reasons.length === 0, reasons }
}

async function main() {
	logStep(TAG, "Verifying announcement data matches the current extension version")

	if (isPreReleaseChannel()) {
		// Pre-release packaging derives `<major>.<minor>.<run>` from the committed
		// version (see the "Set pre-release version" step in
		// .github/workflows/pre-release-publish.yml), and that derived version has
		// no CHANGELOG section or announcement entry by design. The committed
		// version was already verified strictly by the workflow's early
		// verification step before the mutation, so skip here instead of failing
		// every pre-release build.
		logInfo(
			TAG,
			"PKG_RELEASE_CHANNEL=prerelease: skipping strict announcement check — the packaged version is the derived <major>.<minor>.<run> pre-release version, which has no CHANGELOG/announcement entry by design; the committed version is verified by the pre-release workflow's early verification step.",
		)
		logEndGroup()
		logSuccess(TAG, "announcement verification skipped (pre-release channel)")
		process.exit(0)
	}

	const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, "utf8"))
	const version = packageJson.version
	logInfo(TAG, `current extension version: ${version}`)

	const changelogText = fs.readFileSync(CHANGELOG_PATH, "utf8")
	const assetText = fs.readFileSync(OUTPUT_PATH, "utf8")

	const verdict = assessAnnouncementVersion(version, changelogText, assetText)
	if (!verdict.ok) {
		for (const reason of verdict.reasons) {
			logError(`${TAG}:MISMATCH`, reason)
		}
		logError(
			`${TAG}:MISMATCH`,
			`the "What's New" popup would not show for v${version}. Fix with: pnpm generate:announcements`,
		)
		logEndGroup()
		process.exit(1)
	}

	logOk(`${TAG}:DATA`, `announcement data present for v${version} (non-empty highlights)`)
	logOk(`${TAG}:SYNC`, `src/shared/announcements.ts is in sync with the current changelog section`)
	logEndGroup()
	logSuccess(TAG, `announcement data verified for v${version}`)
	process.exit(0)
}

// Only run when executed directly (not when imported by the spec).
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
	main().catch((err) => {
		logError(TAG, `verification failed: ${err.message}`)
		process.exit(1)
	})
}
