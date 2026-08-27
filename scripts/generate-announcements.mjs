#!/usr/bin/env node

/**
 * generate-announcements.mjs
 *
 * Generates src/shared/announcements.ts — the single source of truth for the
 * "What's New" popup content — from the current (top) versioned section of
 * src/CHANGELOG.md.
 *
 * Bug #265: the announcement popup's content was static i18n (three hardcoded
 * `chat:announcement.release.highlightN` keys) while only the title updated per
 * version. This generator derives real per-version release highlights straight
 * from the auto-generated changelog (which is itself produced from changesets
 * by `.changeset/config.json` + `.changeset/changelog-config.js`), so a version
 * bump needs NO manual announcement edits.
 *
 * LINE-KEYED RELEASE POLICY (iterate-then-stabilize, same minor): the committed
 * version IS the published version (no build-time derivation or mutation).
 * Pre-releases are consecutive patches on the current minor (3.88.0, 3.88.1,
 * 3.88.2, ...), the stable is the next patch on that same minor (3.88.3), and
 * the next cycle starts a new minor (3.89.0). The CHANGELOG keeps ONE
 * accumulating section per minor titled `## [<major>.<minor>.0]`. Announcements
 * are therefore keyed to the LINE BASE `<major>.<minor>.0` and every patch on
 * the minor resolves to it at runtime via `getAnnouncementForVersion` — this is
 * what makes a pre-release patch like 3.86.19 show the 3.86.0 line's highlights
 * (the popup arms ONCE PER MINOR through `latestAnnouncementId`).
 *
 * Output contract:
 *   - `Announcements`: `Record<string, ReleaseAnnouncement>` keyed by the LINE
 *     BASE `<major>.<minor>.0` (mirrors the `Package` pattern in
 *     src/shared/package.ts).
 *   - `resolveLineVersion(version)`: maps any `major.minor.patch` to its line
 *     base `major.minor.0`; returns undefined for versions without a third
 *     segment (no false positives).
 *   - `getAnnouncementForVersion(version)`: exact match first, then the line
 *     base fallback.
 *   - `hasAnnouncementForVersion(version)`: implemented via
 *     `getAnnouncementForVersion` so the extension trigger re-arms when the
 *     resolved line actually has content.
 *
 * The emitted module is deterministic — scripts/verify-announcement-version.mjs
 * re-renders it in memory and byte-compares it against the committed file, so a
 * version bump without regenerating this asset fails CI/build loudly.
 *
 * Usage:
 *   node scripts/generate-announcements.mjs
 *   pnpm generate:announcements
 *
 * Highlights are English-only (auto-derived from changeset summaries); the
 * webview falls back to the translated i18n `highlight1..3` keys when no data
 * exists for the current minor line.
 */

import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

import { logStep, logEndGroup, logInfo, logOk, logError, logSuccess } from "./lib/logger.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")
export const CHANGELOG_PATH = path.join(ROOT, "src", "CHANGELOG.md")
export const OUTPUT_PATH = path.join(ROOT, "src", "shared", "announcements.ts")
const TAG = "GENERATE:ANNOUNCEMENTS"

/** Cap on how many highlights the popup renders, to keep it scannable. */
export const MAX_HIGHLIGHTS = 5

// `## [3.81.0] — 2026-08-21` (numeric versions only — `## [Unreleased]` is skipped).
const VERSION_HEADING_RE = /^##\s*\[(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)\]/m
const NEXT_SECTION_RE = /^##\s*\[/gm
const BOLD_BULLET_RE = /^-\s*\*\*(.+?)\*\*\s*(?:—\s*(.*))?$/
const PLAIN_BULLET_RE = /^-\s+(.+)$/
// Trailing issue/PR markers, e.g. `(Closes: #250)`, `(Issue #196)`,
// `(PR #244 by @xavier-arosemena)` — the colon is optional ("PR #244" vs
// "Closes: #250").
const ANNOTATION_RE = /\s*\((?:Closes|Fixes|Resolves|Issue|PR)\s*:?\s*#\d+[^)]*\)\s*$/g
const MARKDOWN_LINK_RE = /\[([^\]]+)\]\([^)]*\)/g

function escapeRegExp(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Strips markdown links and trailing issue/PR annotations from a changelog
 * bullet title so the popup shows a clean, concise excerpt.
 * @param {string} raw - The bold title (or raw bullet text) of a changelog line.
 * @returns {string}
 */
export function cleanHighlight(raw) {
	return raw.replace(MARKDOWN_LINK_RE, "$1").replace(ANNOTATION_RE, "").replace(/\s+/g, " ").trim()
}

/**
 * Resolves a full `<major>.<minor>.<patch>` version to its announcement LINE
 * BASE `<major>.<minor>.0`. Announcements are keyed once per minor line (the
 * `## [<major>.<minor>.0]` changelog section), so every patch on a minor shares
 * the line base's highlights. Versions without a third segment (e.g. `3.86`)
 * cannot resolve and return `undefined` (no false positives).
 *
 * This is the SINGLE source of truth for line-resolution: the generated
 * src/shared/announcements.ts embeds the same logic (see
 * `renderAnnouncementsModule`) and scripts/verify-announcement-version.mjs
 * reuses this export.
 *
 * @param {string} version - A plain `major.minor.patch` version string.
 * @returns {string | undefined} - The line base, or undefined when unresolved.
 */
export function resolveLineVersion(version) {
	const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version)
	if (!match) {
		return undefined
	}
	return `${match[1]}.${match[2]}.0`
}

/**
 * Parses the top versioned section of a changelog into release highlights.
 * @param {string} changelogText - Full markdown changelog.
 * @param {string} [version] - If given, look up that exact version's section;
 *   otherwise use the first numeric versioned section.
 * @returns {{ version: string, highlights: string[] } | null} - null when no
 *   matching versioned section exists.
 */
export function parseChangelogSection(changelogText, version) {
	const headingRe = version ? new RegExp(`^##\\s*\\[${escapeRegExp(version)}\\]`, "m") : VERSION_HEADING_RE
	const match = changelogText.match(headingRe)
	if (!match) {
		return null
	}
	const foundVersion = match[1] ?? version
	const sectionStart = match.index

	NEXT_SECTION_RE.lastIndex = sectionStart + match[0].length
	const next = NEXT_SECTION_RE.exec(changelogText)
	const sectionEnd = next ? next.index : changelogText.length

	const highlights = []
	const seen = new Set()
	for (const line of changelogText.slice(sectionStart, sectionEnd).split("\n")) {
		if (!line.startsWith("- ")) {
			continue
		}
		const bold = line.match(BOLD_BULLET_RE)
		const plain = line.match(PLAIN_BULLET_RE)
		const raw = bold ? bold[1] : plain ? plain[1] : null
		if (!raw) {
			continue
		}
		const cleaned = cleanHighlight(raw)
		if (!cleaned || seen.has(cleaned)) {
			continue
		}
		seen.add(cleaned)
		highlights.push(cleaned)
		if (highlights.length >= MAX_HIGHLIGHTS) {
			break
		}
	}

	return { version: foundVersion, highlights }
}

/**
 * Renders the deterministic TypeScript module emitted to src/shared/announcements.ts.
 *
 * The emitted module is LINE-KEYED: `Announcements` is keyed to the line base
 * (`section.version`, e.g. `3.86.0`) and the module embeds `resolveLineVersion`,
 * `getAnnouncementForVersion` (exact match → line fallback) and
 * `hasAnnouncementForVersion` (via `getAnnouncementForVersion`) so every patch
 * on a minor resolves to the line base at runtime.
 *
 * @param {{ version: string, highlights: string[] }} section
 * @returns {string}
 */
export function renderAnnouncementsModule(section) {
	const encoded = section.highlights.map((h) => `\t\t\t${JSON.stringify(h)},`).join("\n")
	return `// AUTO-GENERATED by scripts/generate-announcements.mjs — DO NOT EDIT.
// Regenerate with \`pnpm generate:announcements\`. Source of truth:
// src/CHANGELOG.md (top versioned section). Highlights are English-only,
// auto-derived from changeset summaries; non-English locales fall back to the
// translated chat:announcement.release.highlightN keys.
//
// LINE-KEYED RELEASE POLICY (iterate-then-stabilize, same minor): one
// announcement per MINOR LINE, keyed at the line base <major>.<minor>.0. Every
// patch on the line (pre-release patches and the stable patch alike) resolves
// to the line base at runtime via getAnnouncementForVersion, so the "What's
// New" popup shows the right highlights for any build without per-patch data.

/** Release highlights for a specific extension version (English-only). */
export interface ReleaseAnnouncement {
\tversion: string
\t/** English-only, auto-generated from the current CHANGELOG section. */
\thighlights: string[]
}

export const Announcements: Record<string, ReleaseAnnouncement> = {
\t${JSON.stringify(section.version)}: {
\t\tversion: ${JSON.stringify(section.version)},
\t\thighlights: [
${encoded}
\t\t],
\t},
}

/**
 * Resolves a full <major>.<minor>.<patch> version to its announcement LINE BASE
 * <major>.<minor>.0. Announcements are keyed once per minor line, so every patch
 * on a minor shares the line base's highlights. Versions without a third segment
 * cannot resolve and return undefined (no false positives).
 */
export function resolveLineVersion(version: string): string | undefined {
\tconst match = /^(\\d+)\\.(\\d+)\\.(\\d+)$/.exec(version)
\tif (!match) {
\t\treturn undefined
\t}
\treturn match[1] + "." + match[2] + ".0"
}

/**
 * Returns the announcement for a version, resolving any patch on a minor to the
 * line base <major>.<minor>.0. Exact matches win; a version without a third
 * segment (or a line with no content) returns undefined.
 */
export function getAnnouncementForVersion(version: string): ReleaseAnnouncement | undefined {
\tconst exact = Announcements[version]
\tif (exact !== undefined) {
\t\treturn exact
\t}
\tconst lineBase = resolveLineVersion(version)
\tif (lineBase === undefined) {
\t\treturn undefined
\t}
\treturn Announcements[lineBase]
}

/**
 * True when the given version has non-empty announcement content to show.
 * Used by the extension trigger so the popup only re-arms when the resolved
 * line actually has content (noise mitigation). Line-resolved: any patch on a
 * minor resolves to the line base.
 */
export function hasAnnouncementForVersion(version: string): boolean {
\tconst announcement = getAnnouncementForVersion(version)
\treturn announcement !== undefined && announcement.highlights.length > 0
}
`
}

async function main() {
	logStep(TAG, "Generating src/shared/announcements.ts from src/CHANGELOG.md")
	const changelogText = fs.readFileSync(CHANGELOG_PATH, "utf8")
	const section = parseChangelogSection(changelogText)
	if (!section) {
		logError(`${TAG}:PARSE`, `no versioned section found in ${CHANGELOG_PATH}`)
		process.exit(1)
	}
	logInfo(`${TAG}:PARSE`, `derived ${section.highlights.length} highlight(s) for version ${section.version}`)
	if (section.highlights.length === 0) {
		logError(
			`${TAG}:PARSE`,
			`version ${section.version} has no release highlights — the "What's New" popup would be empty`,
		)
		process.exit(1)
	}

	const content = renderAnnouncementsModule(section)
	fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true })
	fs.writeFileSync(OUTPUT_PATH, content)
	logOk(`${TAG}:WRITE`, `wrote ${OUTPUT_PATH}`)
	logEndGroup()
	logSuccess(TAG, `announcement data regenerated for v${section.version}`)
	process.exit(0)
}

// Only run when executed directly (not when imported by specs / CI).
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
	main().catch((err) => {
		logError(TAG, `generation failed: ${err.message}`)
		process.exit(1)
	})
}
