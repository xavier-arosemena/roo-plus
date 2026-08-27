/**
 * verify-announcement-version.spec.mjs
 *
 * Unit tests for the pure announcement-data guard logic in
 * scripts/verify-announcement-version.mjs (bug #265 release guard) and the
 * shared changelog parser/renderer in scripts/generate-announcements.mjs.
 *
 * Run with: node --test scripts/verify-announcement-version.spec.mjs
 * (scripts/ has no vitest runner, so node:test built into Node 22 is used —
 * same as scripts/verify-submodule-pin.spec.mjs.)
 */

import { describe, it } from "node:test"
import assert from "node:assert/strict"

import {
	CHANGELOG_PATH,
	OUTPUT_PATH,
	cleanHighlight,
	parseChangelogSection,
	renderAnnouncementsModule,
	resolveLineVersion,
} from "./generate-announcements.mjs"
import { assessAnnouncementVersion } from "./verify-announcement-version.mjs"

const SAMPLE_CHANGELOG = `# Roo+ Changelog

## [Unreleased]

---

## [3.81.0] — 2026-08-21

### Patch — Webview Reliability

### 🐛 Bug Fixes

- **Webview React #301 startup crash resolved (Closes: #250)** — Long description.
- **Render-phase setState loops eliminated (Closes: #245)** — Long description.
- **Open VSX pre-release marker stamped (Closes: #243)** — Long description.
- **Pre-release publish fails loudly (PR #244 by @xavier-arosemena)** — Long description.
- **Stale docs removed** — Long description.
- **CI audit fixed (PR #241 by @xavier-arosemena)** — Long description.

### 🔧 Chores

- **Unrelated chore bullet** — Should be capped away.

---

## [3.80.0] — 2026-08-01

### 🚀 Enhancements

- **Older release bullet** — Not part of the current section.
`

const EMPTY_SECTION_CHANGELOG = `# Roo+ Changelog

## [3.81.0] — 2026-08-21

### Patch — No notable changes

(no bullets)
`

describe("cleanHighlight", () => {
	it("strips trailing issue/PR annotations", () => {
		assert.equal(
			cleanHighlight("Webview React #301 startup crash resolved (Closes: #250)"),
			"Webview React #301 startup crash resolved",
		)
		assert.equal(
			cleanHighlight("Pre-release publish fails loudly (PR #244 by @xavier-arosemena)"),
			"Pre-release publish fails loudly",
		)
		assert.equal(cleanHighlight("Welcome screen tuned (Issue #196)"), "Welcome screen tuned")
	})

	it("strips markdown link syntax and collapses whitespace", () => {
		assert.equal(
			cleanHighlight("[`RooHero.tsx`](webview-ui/src/components/welcome/RooHero.tsx) tuned"),
			"`RooHero.tsx` tuned",
		)
		assert.equal(cleanHighlight("Some   weird\n  spacing"), "Some weird spacing")
	})
})

describe("parseChangelogSection", () => {
	it("skips [Unreleased] and parses the first numeric versioned section", () => {
		const section = parseChangelogSection(SAMPLE_CHANGELOG)
		assert.equal(section.version, "3.81.0")
		// Capped at MAX_HIGHLIGHTS = 5, and the older 3.80.0 section is excluded.
		assert.equal(section.highlights.length, 5)
		assert.equal(section.highlights[0], "Webview React #301 startup crash resolved")
		assert.equal(section.highlights[1], "Render-phase setState loops eliminated")
		assert.equal(section.highlights[3], "Pre-release publish fails loudly")
		// 5th bullet is the cap; the 6th ("CI audit fixed") is truncated.
		assert.equal(section.highlights[4], "Stale docs removed")
	})

	it("looks up an explicit version section when requested", () => {
		const section = parseChangelogSection(SAMPLE_CHANGELOG, "3.80.0")
		assert.equal(section.version, "3.80.0")
		assert.deepEqual(section.highlights, ["Older release bullet"])
	})

	it("returns null when the requested version has no section", () => {
		assert.equal(parseChangelogSection(SAMPLE_CHANGELOG, "9.9.9"), null)
	})

	it("returns empty highlights for a section with no bullets", () => {
		const section = parseChangelogSection(EMPTY_SECTION_CHANGELOG)
		assert.equal(section.version, "3.81.0")
		assert.deepEqual(section.highlights, [])
	})
})

describe("renderAnnouncementsModule", () => {
	it("emits a deterministic TS module keyed by the line base version", () => {
		const out = renderAnnouncementsModule({ version: "3.81.0", highlights: ["Alpha", "Beta"] })
		assert.match(out, /export const Announcements: Record<string, ReleaseAnnouncement> = \{/)
		assert.match(out, /"3\.81\.0": \{/)
		assert.match(out, /"Alpha",/)
		assert.match(out, /"Beta",/)
		assert.match(out, /export function hasAnnouncementForVersion\(version: string\): boolean \{/)
		// Re-rendering the same section is byte-identical (the verifier relies on this).
		assert.equal(out, renderAnnouncementsModule({ version: "3.81.0", highlights: ["Alpha", "Beta"] }))
	})

	it("emits the line-resolving resolver functions", () => {
		const out = renderAnnouncementsModule({ version: "3.81.0", highlights: ["Alpha"] })
		assert.match(out, /export function resolveLineVersion\(version: string\): string \| undefined \{/)
		assert.match(out, /export function getAnnouncementForVersion\(version: string\): ReleaseAnnouncement \| undefined \{/)
		// The emitted resolver must embed exact-match-first + line-fallback logic.
		assert.match(out, /const exact = Announcements\[version\]/)
		assert.match(out, /const lineBase = resolveLineVersion\(version\)/)
		assert.match(out, /if \(lineBase === undefined\) \{/)
		assert.match(out, /return Announcements\[lineBase\]/)
		// hasAnnouncementForVersion must be implemented via getAnnouncementForVersion.
		assert.match(out, /const announcement = getAnnouncementForVersion\(version\)/)
	})

	it("resolveLineVersion is the shared single source of truth for line-resolution", () => {
		// The generated module embeds the same logic as this export, which the
		// verify script reuses — testing it proves the emitted resolver behaviour:
		// exact line match, patch → line base, and no false positive for absent
		// lines / two-part versions.
		assert.equal(resolveLineVersion("3.81.0"), "3.81.0")
		assert.equal(resolveLineVersion("3.81.19"), "3.81.0")
		assert.equal(resolveLineVersion("3.86.19"), "3.86.0")
		assert.equal(resolveLineVersion("3.81"), undefined)
		assert.equal(resolveLineVersion("3.81.0.1"), undefined)
		assert.equal(resolveLineVersion("not-a-version"), undefined)
	})

	it("escapes quote characters inside highlights", () => {
		const out = renderAnnouncementsModule({ version: "1.0.0", highlights: ['say "hi"'] })
		assert.match(out, /"say \\"hi\\""/)
	})
})

describe("assessAnnouncementVersion", () => {
	// Byte-identical to what generate-announcements.mjs would emit for the
	// SAMPLE_CHANGELOG's current section — the verifier compares exactly this.
	const ASSET = renderAnnouncementsModule(parseChangelogSection(SAMPLE_CHANGELOG, "3.81.0"))

	it("passes when the version has non-empty data and the asset is in sync", () => {
		const verdict = assessAnnouncementVersion("3.81.0", SAMPLE_CHANGELOG, ASSET)
		assert.equal(verdict.ok, true)
		assert.deepEqual(verdict.reasons, [])
	})

	it("fails when the version has no changelog section", () => {
		const verdict = assessAnnouncementVersion("9.9.9", SAMPLE_CHANGELOG, ASSET)
		assert.equal(verdict.ok, false)
		assert.match(verdict.reasons[0], /no section/)
	})

	it("passes when a patch version on the line resolves to the line base section", () => {
		// 3.81.1 is a patch on the 3.81 line: it must verify against the
		// `## [3.81.0]` section and the asset keyed 3.81.0 (line-resolution —
		// this is what lets pre-release patches like 3.86.19 pass).
		const verdict = assessAnnouncementVersion("3.81.1", SAMPLE_CHANGELOG, ASSET)
		assert.equal(verdict.ok, true)
		assert.deepEqual(verdict.reasons, [])
	})

	it("fails when a patch version's line has no section", () => {
		// 3.82.1 resolves to line 3.82.0, which has no changelog section.
		const verdict = assessAnnouncementVersion("3.82.1", SAMPLE_CHANGELOG, ASSET)
		assert.equal(verdict.ok, false)
		assert.match(verdict.reasons[0], /no section/)
	})

	it("fails when the version is not a plain major.minor.patch", () => {
		const verdict = assessAnnouncementVersion("3.81", SAMPLE_CHANGELOG, ASSET)
		assert.equal(verdict.ok, false)
		assert.match(verdict.reasons[0], /not a plain/)
	})

	it("fails when the version's changelog section has no highlights", () => {
		const verdict = assessAnnouncementVersion("3.81.0", EMPTY_SECTION_CHANGELOG, ASSET)
		assert.equal(verdict.ok, false)
		assert.match(verdict.reasons[0], /no release highlights/)
	})

	it("fails when the committed asset is stale for the current version", () => {
		// Asset still describes 3.80.0 while the changelog/version moved to 3.81.0.
		const staleAsset = renderAnnouncementsModule({ version: "3.80.0", highlights: ["Older release bullet"] })
		const verdict = assessAnnouncementVersion("3.81.0", SAMPLE_CHANGELOG, staleAsset)
		assert.equal(verdict.ok, false)
		assert.match(verdict.reasons[0], /stale/)
	})

	it("fails when the asset is missing entirely (empty file)", () => {
		const verdict = assessAnnouncementVersion("3.81.0", SAMPLE_CHANGELOG, "")
		assert.equal(verdict.ok, false)
	})
})

describe("paths", () => {
	it("targets the repo changelog and generated asset", () => {
		assert.match(CHANGELOG_PATH, /src[\\/]CHANGELOG\.md$/)
		assert.match(OUTPUT_PATH, /src[\\/]shared[\\/]announcements\.ts$/)
	})
})
