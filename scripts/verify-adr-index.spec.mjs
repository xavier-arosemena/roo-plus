/**
 * verify-adr-index.spec.mjs
 *
 * Unit tests for the ADR index/link gate.
 * Run with: node --test scripts/verify-adr-index.spec.mjs
 */

import { describe, it } from "node:test"
import assert from "node:assert/strict"

import {
	extractRelativeLinks,
	parseIndexRows,
	validateIndexRows,
	verifyCoverage,
	verifyLinks,
} from "./verify-adr-index.mjs"

const INDEX = [
	"# ADRs",
	"",
	"| Document | Status | Date | Decision |",
	"| --- | --- | --- | --- |",
	"| [First](adr-first.md) | ✅ ACCEPTED | 2026-01-01 | did a thing |",
	"| [Second](adr-second.md) | Proposed | 2026-01-02 | might do a thing |",
	"",
].join("\n")

describe("parseIndexRows", () => {
	it("parses document rows and skips the header and separator", () => {
		const rows = parseIndexRows(INDEX)
		assert.equal(rows.length, 2)
		assert.deepEqual(
			rows.map((row) => row.link),
			["adr-first.md", "adr-second.md"],
		)
		assert.equal(rows[0].status, "✅ ACCEPTED")
		assert.equal(rows[0].line, 5)
	})

	it("returns an empty list for a table with no document rows", () => {
		assert.deepEqual(parseIndexRows("| Document | Status |\n| --- | --- |\n"), [])
	})
})

describe("validateIndexRows", () => {
	it("accepts every lifecycle status, with or without decoration", () => {
		const rows = [
			{ title: "a", status: "✅ ACCEPTED", line: 1 },
			{ title: "b", status: "Proposed", line: 2 },
			{ title: "c", status: "Deprecated", line: 3 },
			{ title: "d", status: "Superseded by ADR-9", line: 4 },
		]
		assert.deepEqual(validateIndexRows(rows), [])
	})

	it("flags a row whose status is outside the vocabulary", () => {
		const problems = validateIndexRows([{ title: "x", status: "DONE", line: 7 }])
		assert.equal(problems.length, 1)
		assert.match(problems[0], /ADR-INDEX\.md:7/)
		assert.match(problems[0], /DONE/)
	})
})

describe("extractRelativeLinks", () => {
	it("strips anchors and :line suffixes, and ignores absolute URLs", () => {
		const { verifiable } = extractRelativeLinks(
			"[a](foo.md#anchor) [b](bar.ts:42) [c](https://example.com/x) [d](#local)",
		)
		assert.deepEqual(verifiable, ["foo.md", "bar.ts"])
	})

	it("separates links into gitignored plans/ from verifiable links", () => {
		const { verifiable, skipped } = extractRelativeLinks("[p](../../plans/thing.md) [q](real.md)")
		assert.deepEqual(verifiable, ["real.md"])
		assert.deepEqual(skipped, ["../../plans/thing.md"])
	})
})

describe("verifyLinks", () => {
	it("reports links whose target does not exist", () => {
		const problems = verifyLinks({
			files: { "docs/adr/adr-a.md": "[ok](adr-b.md) [bad](missing.md)" },
			exists: (absolute) => absolute.endsWith("adr-b.md"),
			baseDir: "/repo",
		})
		assert.equal(problems.length, 1)
		assert.match(problems[0], /missing\.md/)
	})

	it("stays silent when every link resolves", () => {
		const problems = verifyLinks({
			files: { "docs/adr/adr-a.md": "[ok](adr-b.md)" },
			exists: () => true,
			baseDir: "/repo",
		})
		assert.deepEqual(problems, [])
	})
})

describe("verifyCoverage", () => {
	it("flags ADR files that are absent from the index", () => {
		const problems = verifyCoverage({
			indexRows: [{ link: "adr-first.md" }],
			adrFiles: ["adr-first.md", "adr-orphan.md"],
		})
		assert.equal(problems.length, 1)
		assert.match(problems[0], /adr-orphan\.md/)
	})

	it("accepts files indexed with a ./-prefix or an anchor", () => {
		const problems = verifyCoverage({
			indexRows: [{ link: "./adr-first.md" }, { link: "adr-second.md#revision" }],
			adrFiles: ["adr-first.md", "adr-second.md"],
		})
		assert.deepEqual(problems, [])
	})
})
