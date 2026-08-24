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
 * Output contract:
 *   - `Announcements`: `Record<string, ReleaseAnnouncement>` keyed by the
 *     current version (mirrors the `Package` pattern in src/shared/package.ts).
 *   - `hasAnnouncementForVersion(version)`: used by the extension trigger so
 *     the popup only re-arms when there is real per-version content.
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
 * exists for the current version (pre-release/preview builds).
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
 * True when the given version has non-empty announcement content to show.
 * Used by the extension trigger so the popup only re-arms when there is real
 * per-version content (noise mitigation).
 */
export function hasAnnouncementForVersion(version: string): boolean {
\tconst announcement = Announcements[version]
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
