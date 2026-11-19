#!/usr/bin/env node

/**
 * generate-frame-fixtures.mjs
 *
 * Materialises the two frozen "frame bake-off" catalogues as `.roomodes`
 * fixtures plus one routing-selection block per frame, for the later
 * mode-selection trials. NOTHING in the fixtures is hand-copied: every entry,
 * every `whenToUse`, and every slug is read out of the catalogue markdown.
 *
 * Sources (read-only inputs, never modified by this script):
 *   docs/modes-catalogue-axis-stance-frame.md   -> 45 entries (24 coding, 5 meta, 16 non-coding)
 *   docs/modes-catalogue-artefact-frame.md      -> 47 entries (24 coding, 6 ops/data, 5 meta, 12 non-coding)
 *
 * Outputs:
 *   test-fixtures/frames/axis-stance.roomodes
 *   test-fixtures/frames/axis-stance.selection-block.txt
 *   test-fixtures/frames/artefact.roomodes
 *   test-fixtures/frames/artefact.selection-block.txt
 *
 * ---------------------------------------------------------------------------
 * Catalogue format, as actually found (the parser depends on exactly this)
 * ---------------------------------------------------------------------------
 * Both documents are markdown whose entries are rows of GitHub pipe tables.
 *
 *   axis-stance:  `## 1. Coding owners (24)`, `## 2. Meta owners (5)`,
 *                 `## 3. Non-coding owners (16)`, then several NON-entry tables
 *                 (stance vocabulary, arithmetic correction, job coverage,
 *                 costs, comparison). Entry tables have the header
 *                 `| # | Mode | Axis | Stance | Jobs owned | Draft `whenToUse` | ~chars |`
 *                 (coding) or the same minus `Axis`/`Jobs owned` (meta,
 *                 non-coding). Every one of the 45 rows carries a drafted
 *                 `whenToUse` sentence beginning "Use when ...".
 *
 *   artefact:     `### 1.1 Coding artefacts (24)`, `### 1.2 Operations and
 *                 data artefacts (6)`, `### 1.3 Meta artefacts (5)`,
 *                 `### 1.4 Non-coding artefacts (12)`. Header is
 *                 `| # | Mode | Produces | Serves jobs | Draft `whenToUse` | ~chars |`
 *                 (1.1-1.3) and `| # | Mode | Produces | ~chars |` (1.4).
 *                 The `#` column holds `A1`..`A47`, the slug is backticked in
 *                 `Mode`.
 *
 * Parser strategy (delimiter-based, no prose heuristics):
 *   1. Track the current `##`/`###` heading and derive a section class from it
 *      (coding / operations-and-data / meta / non-coding). Headings that do not
 *      match one of those classes disable parsing until the next heading, which
 *      is what keeps the analysis tables (costs, coverage, pruning) out.
 *   2. Inside an entry section, a table header row is the row containing a
 *      `Draft whenToUse` cell; column positions are read from that header.
 *   3. An entry row is a row whose first cell is an identifier (`12` or `A12`)
 *      and whose `Mode` cell is a single backticked slug.
 *
 * ---------------------------------------------------------------------------
 * The ONE gap in the sources, stated rather than papered over
 * ---------------------------------------------------------------------------
 * `docs/modes-catalogue-artefact-frame.md` §1.4 has NO `Draft whenToUse`
 * column: the 12 non-coding classes (A36-A47) carry only `Produces` and an
 * estimated `~chars` count (the document itself says they are "estimated at
 * ~580", §7.1). Those 12 entries therefore cannot yield a verbatim drafted
 * line. They are NOT hand-authored: their `whenToUse` is derived by the single
 * fixed template below from that row's own `Produces` cell, and every such
 * entry is reported by this script (see `whenToUseDerived` in the log) and in
 * the completion report. The other 35 artefact entries and all 45 axis-stance
 * entries use the catalogue line verbatim.
 *
 * Usage:
 *   node scripts/generate-frame-fixtures.mjs
 * Exit code is non-zero when either catalogue does not yield its expected
 * entry count (45 / 47) — a silent partial parse must never produce a fixture.
 */

import * as fs from "node:fs/promises"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import * as yaml from "yaml"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")
const OUT_DIR = path.join(ROOT, "test-fixtures", "frames")

const FRAMES = [
	{
		name: "axis-stance",
		source: path.join(ROOT, "docs", "modes-catalogue-axis-stance-frame.md"),
		expected: 45,
	},
	{
		name: "artefact",
		source: path.join(ROOT, "docs", "modes-catalogue-artefact-frame.md"),
		expected: 47,
	},
]

/**
 * groups assignment rule (the single documented rule; no per-entry tuning).
 *
 * 1. Section lookup — the profile is a pure function of the catalogue section
 *    the entry was parsed from:
 *      coding            -> ["read", "edit", "command"]   (writes code/config)
 *      operations & data -> ["read", "edit", "command"]   (writes pipeline/data)
 *      meta              -> ["read", "modes"]             (delegates to modes)
 *      non-coding        -> ["read"]                      (read-only advisory)
 * 2. One keyword overlay, applied to the entry's own `whenToUse` text: add
 *    "browser" when that line mentions external sources
 *    (research / sources / cited / citation / outside this repository).
 *
 * Both parts are mechanical; changing the rule changes all fixtures at once.
 */
const SECTION_GROUPS = {
	coding: ["read", "edit", "command"],
	"ops-data": ["read", "edit", "command"],
	meta: ["read", "modes"],
	"non-coding": ["read"],
}

const BROWSER_KEYWORDS = ["research", "sources", "cited", "citation", "outside this repository"]

/** A small, documented acronym set so derived names read sanely (`adr` -> ADR). */
const ACRONYMS = new Set(["adr", "ai", "api", "ci", "sbom", "cve", "sql", "ui", "ux"])

/**
 * Classify a heading into an entry-section class, or null when the section is
 * prose/analysis (which must not be parsed for entries).
 */
function classifySection(heading) {
	const title = heading
		.replace(/^\d+(\.\d+)*\.?\s*/, "")
		.trim()
		.toLowerCase()

	// Order matters: "non-coding artefacts" also starts with "coding" nowhere,
	// but "non-coding" must be tested before any broader match.
	if (title.startsWith("non-coding")) return "non-coding"
	if (title.startsWith("operations") || title.startsWith("ops")) return "ops-data"
	if (title.startsWith("meta")) return "meta"
	if (title.startsWith("coding")) return "coding"
	return null
}

/** Strip markdown emphasis/backticks that are formatting only, and normalise spacing. */
function stripFormatting(cell) {
	return cell
		.replace(/\\\|/g, "|")
		.replace(/\*\*/g, "")
		.replace(/`/g, "")
		.replace(/\s+/g, " ")
		.trim()
}

/** Split a pipe-table row into trimmed, formatting-stripped cells; null if not a row. */
function splitRow(line) {
	const trimmed = line.trim()
	if (!trimmed.startsWith("|")) return null
	const inner = trimmed.replace(/^\|/, "").replace(/\|$/, "")
	return inner.split("|").map(stripFormatting)
}

/**
 * Parse one catalogue markdown document into entries.
 * Returns { slug, whenToUse, whenToUseDerived, section } in document order.
 */
function parseCatalogue(markdown) {
	const lines = markdown.split(/\r?\n/)
	const entries = []

	let sectionClass = null
	let header = null

	for (const line of lines) {
		const heading = line.match(/^#{2,3}\s+(.*)$/)
		if (heading) {
			sectionClass = classifySection(heading[1])
			header = null
			continue
		}

		if (!sectionClass) continue

		const cells = splitRow(line)
		if (!cells) {
			// A blank line or prose ends the current table.
			if (line.trim() === "") header = null
			continue
		}

		// Header row: the one that names the `Mode` column plus either a
		// `Draft whenToUse` column (all sections but artefact §1.4) or a
		// `Produces` column (artefact §1.4, where the line must be derived).
		if (cells.includes("Mode") && (cells.includes("Draft whenToUse") || cells.includes("Produces"))) {
			header = cells
			continue
		}

		if (!header) continue

		// Entry rows start with an identifier (`12` or `A12`).
		if (!/^[A-Z]*\d+$/.test(cells[0] ?? "")) continue
		if (cells.length !== header.length) continue

		const column = (name) => {
			const idx = header.indexOf(name)
			return idx === -1 ? null : cells[idx]
		}

		const slug = column("Mode")
		if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) continue

		const drafted = column("Draft whenToUse")
		const produces = column("Produces")

		let whenToUse = drafted
		let whenToUseDerived = false
		if (!whenToUse) {
			// Only the artefact catalogue's §1.4 lacks the column; derive from the
			// row's own Produces cell with the single fixed template.
			if (!produces) {
				throw new Error(`entry ${slug} has neither a drafted whenToUse nor a Produces cell`)
			}
			whenToUse = `Use when ${produces.replace(/[.!]+$/, "")} must be produced.`
			whenToUseDerived = true
		}

		entries.push({ slug, whenToUse, whenToUseDerived, section: sectionClass })
	}

	return entries
}

/** Title-case a slug, expanding a documented acronym set. */
function displayName(slug) {
	return slug
		.split("-")
		.map((word) =>
			ACRONYMS.has(word) ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
		)
		.join(" ")
}

/** Deterministic description + roleDefinition templates over the entry's own line. */
function deriveCharter(slug, whenToUse) {
	const name = displayName(slug)
	const condition = whenToUse.replace(/^Use when\s+/i, "").replace(/[.!]+$/, "")

	return {
		name,
		description: `${name} mode — ${condition}.`,
		roleDefinition:
			`You are the ${name} mode. Your charter: ${condition}. ` +
			`Work only while that condition holds, state your assumptions, and end with the evidence a reviewer can check.`,
	}
}

function groupsFor(section, whenToUse) {
	const groups = [...SECTION_GROUPS[section]]
	const lower = whenToUse.toLowerCase()
	if (BROWSER_KEYWORDS.some((keyword) => lower.includes(keyword))) groups.push("browser")
	return groups
}

function toModeEntry(entry) {
	const charter = deriveCharter(entry.slug, entry.whenToUse)
	return {
		slug: entry.slug,
		name: charter.name,
		description: charter.description,
		roleDefinition: charter.roleDefinition,
		whenToUse: entry.whenToUse,
		groups: groupsFor(entry.section, entry.whenToUse),
	}
}

function renderRoomodes(modeEntries) {
	// lineWidth: 0 disables folding so every scalar stays on one line; this keeps
	// the fixture byte-stable and makes the verbatim `whenToUse` auditable by eye.
	return yaml.stringify({ customModes: modeEntries }, { lineWidth: 0 })
}

function renderSelectionBlock(entries) {
	return entries.map((entry) => `- ${entry.slug} — ${entry.whenToUse}`).join("\n") + "\n"
}

/** Character length in code points (the cost proxy) and UTF-8 bytes (for cross-checking). */
function measure(text) {
	return { chars: [...text].length, bytes: Buffer.byteLength(text, "utf8") }
}

async function main() {
	await fs.mkdir(OUT_DIR, { recursive: true })

	let failed = false

	for (const frame of FRAMES) {
		const markdown = await fs.readFile(frame.source, "utf-8")
		const entries = parseCatalogue(markdown)

		const modeEntries = entries.map(toModeEntry)
		const roomodesText = renderRoomodes(modeEntries)
		const blockText = renderSelectionBlock(entries)

		// Self-check: the emitted YAML must re-parse to exactly what we intended,
		// including the verbatim `whenToUse` strings.
		const reparsed = yaml.parse(roomodesText)
		const reparsedModes = reparsed?.customModes
		if (!Array.isArray(reparsedModes) || reparsedModes.length !== modeEntries.length) {
			throw new Error(`${frame.name}: emitted YAML did not re-parse to ${modeEntries.length} entries`)
		}
		for (let i = 0; i < modeEntries.length; i++) {
			if (reparsedModes[i].whenToUse !== modeEntries[i].whenToUse) {
				throw new Error(`${frame.name}: whenToUse round-trip mismatch for ${modeEntries[i].slug}`)
			}
			if (reparsedModes[i].slug !== modeEntries[i].slug) {
				throw new Error(`${frame.name}: slug round-trip mismatch at index ${i}`)
			}
		}

		const roomodesPath = path.join(OUT_DIR, `${frame.name}.roomodes`)
		const blockPath = path.join(OUT_DIR, `${frame.name}.selection-block.txt`)
		await fs.writeFile(roomodesPath, roomodesText, "utf-8")
		await fs.writeFile(blockPath, blockText, "utf-8")

		const blockSize = measure(blockText)
		const derived = entries.filter((entry) => entry.whenToUseDerived)

		console.log(`${frame.name}: ${entries.length} entries (expected ${frame.expected})`)
		console.log(`  ${path.relative(ROOT, roomodesPath)} — ${measure(roomodesText).bytes} bytes`)
		console.log(
			`  ${path.relative(ROOT, blockPath)} — ${blockSize.chars} chars / ${blockSize.bytes} bytes, ` +
				`mean ${(blockSize.chars / entries.length).toFixed(2)} chars per entry`,
		)
		if (derived.length > 0) {
			console.log(
				`  whenToUse DERIVED (no drafted line in the catalogue) for ${derived.length} entries: ` +
					derived.map((entry) => entry.slug).join(", "),
			)
		}

		if (entries.length !== frame.expected) {
			console.error(
				`ERROR ${frame.name}: parsed ${entries.length} entries, expected ${frame.expected}. ` +
					`The catalogue format changed — fix the parser rather than the fixture.`,
			)
			failed = true
		}
	}

	if (failed) process.exit(1)
}

main().catch((error) => {
	console.error(`generate-frame-fixtures failed: ${error.message}`)
	process.exit(1)
})
