#!/usr/bin/env node
/**
 * verify-adr-index.mjs
 *
 * Keeps the ADR set honest. Three failure modes this gate prevents, all of which
 * have occurred in this repository:
 *
 * 1. **Dangling index links** — an index row pointing at a file that does not
 *    exist (or at a review record that was never committed).
 * 2. **Unindexed ADRs** — an ADR file nobody can find because the index omits it.
 * 3. **Non-vocabulary statuses** — a row claiming a state outside the lifecycle,
 *    which makes "is this decision binding?" unanswerable.
 *
 * Links into `plans/` are skipped by design: that directory is gitignored, so it
 * resolves locally and not in CI.
 *
 * Usage: node scripts/verify-adr-index.mjs
 * Exit codes: 0 clean, 1 problems found.
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const HERE = path.dirname(fileURLToPath(import.meta.url))
export const REPO_ROOT = path.resolve(HERE, "..")
export const ADR_DIR = path.join(REPO_ROOT, "docs", "adr")
export const INDEX_PATH = path.join(ADR_DIR, "ADR-INDEX.md")

/** Lifecycle vocabulary from docs/adr/README.md. */
export const ADR_STATUSES = ["Proposed", "Accepted", "Deprecated", "Superseded", "Active", "Resolved"]

/**
 * Parse the rows of the ADR index table.
 *
 * A row is accepted when it looks like `| [title](link) | status | date | decision |`.
 * Header and separator rows are skipped.
 *
 * @param {string} markdown index file contents
 * @returns {Array<{ title: string, link: string, status: string, line: number }>}
 */
export function parseIndexRows(markdown) {
	const rows = []
	const lines = markdown.split("\n")

	lines.forEach((line, index) => {
		const trimmed = line.trim()
		if (!trimmed.startsWith("|")) return

		const cells = trimmed
			.split("|")
			.slice(1, -1)
			.map((cell) => cell.trim())

		if (cells.length < 2) return
		// Separator row: | --- | --- | ...
		if (cells.every((cell) => /^:?-{2,}:?$/.test(cell))) return

		const linkMatch = cells[0].match(/\[([^\]]+)\]\(([^)]+)\)/)
		if (!linkMatch) return

		rows.push({
			title: linkMatch[1],
			link: linkMatch[2],
			status: cells[1],
			line: index + 1,
		})
	})

	return rows
}

/**
 * Check every index row states a lifecycle status.
 *
 * Emoji/decoration is allowed; the row must contain one of {@link ADR_STATUSES}.
 *
 * @param {Array<{ title: string, status: string, line: number }>} rows
 * @returns {string[]} problems
 */
export function validateIndexRows(rows) {
	return rows
		.filter((row) => !ADR_STATUSES.some((status) => row.status.toLowerCase().includes(status.toLowerCase())))
		.map(
			(row) =>
				`ADR-INDEX.md:${row.line} "${row.title}" has status "${row.status}", which is not one of: ${ADR_STATUSES.join(", ")}`,
		)
}

/**
 * Extract relative markdown link targets from a document.
 *
 * Anchors and `:line` suffixes are stripped. Absolute URLs and in-page anchors
 * are ignored. Targets inside `plans/` are returned separately because they are
 * gitignored and cannot be verified in CI.
 *
 * @param {string} markdown
 * @returns {{ verifiable: string[], skipped: string[] }}
 */
export function extractRelativeLinks(markdown) {
	const verifiable = []
	const skipped = []

	for (const match of markdown.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
		const raw = match[1]
		if (/^[a-z]+:/i.test(raw) || raw.startsWith("#")) continue

		const target = raw.split("#")[0].replace(/:\d+$/, "")
		if (!target) continue

		if (target.includes("plans/")) {
			skipped.push(target)
			continue
		}

		verifiable.push(target)
	}

	return { verifiable, skipped }
}

/**
 * Verify that each link resolves, using an injected existence predicate so the
 * check is unit-testable without touching the filesystem.
 *
 * @param {{ files: Record<string, string>, exists: (absolutePath: string) => boolean, baseDir: string }} input
 * @returns {string[]} problems
 */
export function verifyLinks({ files, exists, baseDir }) {
	const problems = []

	for (const [file, markdown] of Object.entries(files)) {
		for (const target of extractRelativeLinks(markdown).verifiable) {
			const absolute = path.resolve(baseDir, path.dirname(file), target)
			if (!exists(absolute)) {
				problems.push(`${file}: broken link -> ${target}`)
			}
		}
	}

	return problems
}

/**
 * Verify that every `adr-*.md` file appears in the index.
 *
 * @param {{ indexRows: Array<{ link: string }>, adrFiles: string[] }} input
 * @returns {string[]} problems
 */
export function verifyCoverage({ indexRows, adrFiles }) {
	const linked = new Set(
		indexRows
			.map((row) => row.link.split("#")[0].replace(/:\d+$/, ""))
			.filter(Boolean)
			.map((link) => link.replace(/^\.\//, "")),
	)

	return adrFiles
		.filter((file) => !linked.has(file))
		.map((file) => `ADR file "${file}" is not listed in ADR-INDEX.md`)
}

function main() {
	const problems = []

	if (!fs.existsSync(INDEX_PATH)) {
		console.error(`[verify-adr-index] Missing index: ${path.relative(REPO_ROOT, INDEX_PATH)}`)
		return 1
	}

	const indexMarkdown = fs.readFileSync(INDEX_PATH, "utf8")
	const rows = parseIndexRows(indexMarkdown)

	if (rows.length === 0) {
		console.error("[verify-adr-index] No ADR rows parsed — the table format changed?")
		return 1
	}

	problems.push(...validateIndexRows(rows))

	const adrFiles = fs
		.readdirSync(ADR_DIR, { withFileTypes: true })
		.filter(
			(entry) =>
				entry.isFile() &&
				entry.name.endsWith(".md") &&
				entry.name !== "ADR-INDEX.md" &&
				entry.name !== "ADR-TEMPLATE.md" &&
				entry.name !== "README.md",
		)
		.map((entry) => entry.name)

	problems.push(...verifyCoverage({ indexRows: rows, adrFiles }))

	const files = Object.fromEntries(
		adrFiles.map((file) => [path.join("docs", "adr", file), fs.readFileSync(path.join(ADR_DIR, file), "utf8")]),
	)

	problems.push(...verifyLinks({ files, exists: fs.existsSync, baseDir: REPO_ROOT }))

	if (problems.length > 0) {
		console.error(`[verify-adr-index] ${problems.length} problem(s):`)
		for (const problem of problems) console.error(`  - ${problem}`)
		return 1
	}

	console.log(`[verify-adr-index] ${rows.length} index row(s), ${adrFiles.length} ADR file(s) — clean`)
	return 0
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	process.exitCode = main()
}
