/**
 * verify-third-party-notices.spec.mjs
 *
 * Unit tests for the attribution gate. The pure functions are exercised with
 * synthetic inputs; the final block re-reads the real repository files (notices
 * file, `.vscodeignore`, `constants.ts`, bundled archives) so a committed
 * regression is caught here and not only in CI. No pnpm, no network.
 *
 * Run from the repo root with: node --test scripts/verify-third-party-notices.spec.mjs
 */

import { after, before, describe, it } from "node:test"
import assert from "node:assert/strict"
import { readFileSync, readdirSync } from "node:fs"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

import {
	BEGIN_MARKER,
	DCG_BUNDLE_DIR,
	DCG_CONSTANTS_PATH,
	END_MARKER,
	NOTICES_PATH,
	PACKAGED_NOTICES_PATH,
	MIN_EXPECTED_DEPENDENCIES,
	SHIPPED_BINARY_COMPONENTS,
	VSCODEIGNORE_PATH,
	compareDependencies,
	dependencyFloorProblems,
	deriveExpectedDependencies,
	expectedShippedComponents,
	formatDependencyTable,
	generatedSection,
	missingComponentSections,
	parseDcgPins,
	parseJsDependencyRows,
	replaceGeneratedSection,
	sha256File,
	verifyDcgArchivePins,
} from "./verify-third-party-notices.mjs"

/** Builds a notices document with the given generated-section body. */
function noticesWithSection(body) {
	return [
		"# Notices",
		"",
		"| `pinned-binary` | `v1` |",
		"",
		BEGIN_MARKER,
		body,
		END_MARKER,
		"",
		"## How to regenerate",
		"",
	].join("\n")
}

describe("generatedSection", () => {
	it("returns the body between the markers", () => {
		const text = noticesWithSection("| `a` | `1.0.0` |")
		assert.equal(generatedSection(text), "\n| `a` | `1.0.0` |\n")
	})

	it("returns undefined when either marker is missing", () => {
		assert.equal(generatedSection(`${BEGIN_MARKER}\nnothing`), undefined)
		assert.equal(generatedSection(`nothing\n${END_MARKER}`), undefined)
		assert.equal(generatedSection("plain text"), undefined)
	})

	it("returns undefined when the markers are inverted", () => {
		assert.equal(generatedSection(`${END_MARKER}\nbody\n${BEGIN_MARKER}`), undefined)
	})
})

describe("parseJsDependencyRows", () => {
	it("reads only the generated section, never the pinned binary tables", () => {
		const text = noticesWithSection("| `left-pad` | `1.3.0` |\n| `zod` | `3.23.8` |")
		assert.deepEqual(parseJsDependencyRows(text), [
			{ name: "left-pad", version: "1.3.0" },
			{ name: "zod", version: "3.23.8" },
		])
	})

	it("returns an empty list when the section is missing", () => {
		assert.deepEqual(parseJsDependencyRows("| `a` | `1` |"), [])
	})

	it("ignores rows that are not two code spans", () => {
		const text = noticesWithSection("| Package | Version |\n| --- | --- |\n| `a` | `1` |")
		assert.deepEqual(parseJsDependencyRows(text), [{ name: "a", version: "1" }])
	})
})

describe("deriveExpectedDependencies", () => {
	it("flattens pnpm's licence grouping into name/version/licence rows", () => {
		const licenses = {
			MIT: [{ name: "zod", versions: ["3.23.8", "3.24.1"] }],
			ISC: [{ name: "abbrev", versions: ["2.0.0"] }],
		}
		assert.deepEqual(deriveExpectedDependencies(licenses), [
			{ name: "abbrev", version: "2.0.0", license: "ISC" },
			{ name: "zod", version: "3.23.8", license: "MIT" },
			{ name: "zod", version: "3.24.1", license: "MIT" },
		])
	})

	it("tolerates malformed input", () => {
		assert.deepEqual(deriveExpectedDependencies({ MIT: null, ISC: [{ name: "x" }] }), [])
		assert.deepEqual(deriveExpectedDependencies(undefined), [])
	})
})

describe("compareDependencies", () => {
	it("reports missing and stale rows independently", () => {
		const expected = [
			{ name: "a", version: "1" },
			{ name: "b", version: "2" },
		]
		const actual = [
			{ name: "a", version: "1" },
			{ name: "c", version: "3" },
		]
		const { missing, extra } = compareDependencies(expected, actual)
		assert.deepEqual(missing, [{ name: "b", version: "2" }])
		assert.deepEqual(extra, [{ name: "c", version: "3" }])
	})

	it("is empty when the sets match exactly", () => {
		const set = [{ name: "a", version: "1" }]
		const { missing, extra } = compareDependencies(set, set)
		assert.deepEqual(missing, [])
		assert.deepEqual(extra, [])
	})

	it("treats a version bump as a missing row", () => {
		const { missing } = compareDependencies([{ name: "a", version: "2" }], [{ name: "a", version: "1" }])
		assert.deepEqual(missing, [{ name: "a", version: "2" }])
	})
})

describe("expectedShippedComponents / missingComponentSections", () => {
	it("selects the components whose negate is present in .vscodeignore", () => {
		const ignore = ["**", "!README.md", "!dist/bin/**", "!bin/dcg/**"].join("\n")
		const ids = expectedShippedComponents(ignore).map((c) => c.id)
		assert.deepEqual(ids, ["dcg", "esbuild-wasm"])
	})

	it("ignores comments and non-negated lines", () => {
		const ignore = ["# !bin/dcg/**", "dist/bin/**"].join("\n")
		assert.deepEqual(expectedShippedComponents(ignore), [])
	})

	it("accepts numbered headings and rejects missing ones", () => {
		const notices = ["### 1.2 esbuild (WASM shims) — MIT", "### 1.3 tree-sitter runtimes — MIT"].join("\n")
		const missing = missingComponentSections(notices, SHIPPED_BINARY_COMPONENTS)
		assert.deepEqual(
			missing.map((c) => c.id),
			["dcg", "tiktoken"],
		)
	})

	it("accepts an unnumbered heading", () => {
		const notices = SHIPPED_BINARY_COMPONENTS.map((c) => `### ${c.heading}`).join("\n")
		assert.deepEqual(missingComponentSections(notices, SHIPPED_BINARY_COMPONENTS), [])
	})

	it("does not accept a heading with the wrong level", () => {
		const notices = SHIPPED_BINARY_COMPONENTS.map((c) => `## ${c.heading}`).join("\n")
		assert.equal(missingComponentSections(notices, SHIPPED_BINARY_COMPONENTS).length, SHIPPED_BINARY_COMPONENTS.length)
	})
})

describe("parseDcgPins", () => {
	const source = `
export const DCG_VERSION = "v9.9.9"

export const DCG_ARCHIVES = {
	"linux-x64": {
		archive: "dcg-x86_64-unknown-linux-musl.tar.xz",
		binary: "dcg",
		sha256: "${"a".repeat(64)}",
		binarySha256: "${"b".repeat(64)}",
	},
} as const
`

	it("reads the pinned version and per-platform pins", () => {
		const pins = parseDcgPins(source)
		assert.equal(pins.version, "v9.9.9")
		assert.deepEqual(pins.archives, [
			{
				key: "linux-x64",
				archive: "dcg-x86_64-unknown-linux-musl.tar.xz",
				// `binary` is captured too: the bundled-binary gate (M8) has to
				// extract the archive and hash exactly this file.
				binary: "dcg",
				sha256: "a".repeat(64),
				binarySha256: "b".repeat(64),
			},
		])
	})

	it("returns undefined/empty when the pins cannot be read", () => {
		const pins = parseDcgPins("export const NOTHING = 1")
		assert.equal(pins.version, undefined)
		assert.deepEqual(pins.archives, [])
	})
})

describe("verifyDcgArchivePins", () => {
	const pins = [{ archive: "dcg-a.tar.xz", sha256: "a".repeat(64), binarySha256: "b".repeat(64) }]
	let bundleDir

	before(async () => {
		bundleDir = await mkdtemp(path.join(tmpdir(), "dcg-pins-"))
		await writeFile(path.join(bundleDir, "dcg-a.tar.xz"), "archive bytes")
	})

	after(async () => {
		await rm(bundleDir, { recursive: true, force: true })
	})

	it("accepts a matching archive", () => {
		const result = verifyDcgArchivePins(pins, bundleDir, () => "a".repeat(64))
		assert.deepEqual(result, { missing: [], mismatched: [] })
	})

	it("reports a mismatching archive", () => {
		const result = verifyDcgArchivePins(pins, bundleDir, () => "c".repeat(64))
		assert.deepEqual(result.missing, [])
		assert.equal(result.mismatched.length, 1)
		assert.equal(result.mismatched[0].actual, "c".repeat(64))
	})

	it("reports a missing archive instead of hashing", () => {
		const result = verifyDcgArchivePins(
			[{ ...pins[0], archive: "dcg-absent.tar.xz" }],
			bundleDir,
			() => "unused",
		)
		assert.deepEqual(result.missing, ["dcg-absent.tar.xz"])
		assert.deepEqual(result.mismatched, [])
	})
})

describe("formatDependencyTable / replaceGeneratedSection", () => {
	const dependencies = [
		{ name: "zod", version: "3.23.8", license: "MIT" },
		{ name: "abbrev", version: "2.0.0", license: "ISC" },
		{ name: "another", version: "1.0.0", license: "MIT" },
	]

	it("groups by licence, sorts, and emits one row per package version", () => {
		const table = formatDependencyTable(dependencies)
		assert.match(table, /### ISC \(1 packages\)/)
		assert.match(table, /### MIT \(2 packages\)/)
		assert.match(table, /\| `another` \| `1\.0\.0` \|/)
		assert.match(table, /\| `zod` \| `3\.23\.8` \|/)
		assert.ok(table.indexOf("### ISC") < table.indexOf("### MIT"), "licence groups should be sorted")
		assert.ok(table.indexOf("`another`") < table.indexOf("`zod`"), "rows inside a group should be sorted")
	})

	it("replaces the generated body while keeping the markers and other sections", () => {
		const original = noticesWithSection("| `old` | `0.0.1` |")
		const updated = replaceGeneratedSection(original, formatDependencyTable(dependencies))
		assert.ok(updated.includes(BEGIN_MARKER))
		assert.ok(updated.includes(END_MARKER))
		assert.ok(updated.includes("| `zod` | `3.23.8` |"))
		assert.ok(!updated.includes("| `old` | `0.0.1` |"))
		assert.ok(updated.includes("## How to regenerate"))
	})

	it("throws when the markers are absent", () => {
		assert.throws(() => replaceGeneratedSection("# nothing", "table"), /markers/)
	})
})

/* ------------------------------------------------------------------ *
 * The committed artefact
 * ------------------------------------------------------------------ */

describe("the committed notices file", () => {
	const noticesText = readFileSync(NOTICES_PATH, "utf8")

	it("carries the generated-section markers", () => {
		assert.notEqual(generatedSection(noticesText), undefined)
	})

	it("documents every shipped binary component", () => {
		const shipped = expectedShippedComponents(readFileSync(VSCODEIGNORE_PATH, "utf8"))
		assert.ok(shipped.length > 0, "expected at least one shipped binary include in .vscodeignore")
		assert.deepEqual(missingComponentSections(noticesText, shipped), [])
	})

	it("quotes the DCG rider verbatim", () => {
		assert.match(noticesText, /MIT License \(with OpenAI\/Anthropic Rider\)/)
		assert.match(noticesText, /any distribution of the Software or any\nDerivative Works must include this rider provision unmodified/)
		assert.match(noticesText, /no rights are granted to\nany Restricted Party/)
	})

	// Truthfulness regression (review finding M1): the notices file must describe
	// the CURRENT behaviour. Semble is downloaded at first use today; a claim that
	// Roo+ does not download it is a compliance overclaim.
	it("describes Semble's current acquisition model (downloaded, not bundled)", () => {
		assert.match(noticesText, /### 2\.1 Semble/)
		assert.match(noticesText, /downloaded at first use/)
		assert.match(noticesText, /Audare-est-Facere\/sembleexec/)
		assert.match(noticesText, /planned, not shipped/)
		// The false statements this finding was about must not come back.
		assert.doesNotMatch(noticesText, /not downloaded by Roo\+/)
		assert.doesNotMatch(noticesText, /Not distributed\./)
	})

	it("still states that no Semble bytes ship inside the VSIX", () => {
		assert.match(noticesText, /No Semble bytes are present in this repository or in the VSIX/)
	})

	it("pins every DCG archive to the constants.ts hash and the archives on disk", () => {
		const pins = parseDcgPins(readFileSync(DCG_CONSTANTS_PATH, "utf8"))
		assert.equal(pins.archives.length, 5)
		assert.equal(readdirSync(DCG_BUNDLE_DIR).filter((f) => /\.(?:tar\.xz|zip)$/.test(f)).length, 5)
		assert.deepEqual(verifyDcgArchivePins(pins.archives, DCG_BUNDLE_DIR, sha256File), {
			missing: [],
			mismatched: [],
		})
		assert.ok(noticesText.includes(pins.version), "notices file must name the bundled DCG version")
	})

	it("is byte-identical to the copy that ships inside the VSIX", () => {
		assert.equal(readFileSync(PACKAGED_NOTICES_PATH, "utf8"), noticesText)
	})

	it("is included by src/.vscodeignore so it actually ships", () => {
		const negates = readFileSync(VSCODEIGNORE_PATH, "utf8")
			.split(/\r?\n/)
			.map((line) => line.trim())
		assert.ok(negates.includes("!THIRD-PARTY-NOTICES.md"))
	})
})

describe("dependency floor (review finding M6)", () => {
	// The gate used to pass vacuously on an empty tree: deriveExpectedDependencies({})
	// -> [], compareDependencies([], rows) -> { missing: [] }, and main() failed
	// only on `missing`. Measured: 0 expected -> 0 missing -> PASS.
	it("an empty tree produces no expected rows, which is exactly why a floor is needed", () => {
		assert.deepEqual(deriveExpectedDependencies({}), [])
		assert.deepEqual(compareDependencies([], [{ name: "anything", version: "1.0.0" }]).missing, [])
	})

	it("fails an empty tree with an explicit message", () => {
		const problems = dependencyFloorProblems([])
		assert.equal(problems.length, 1)
		assert.match(problems[0], /resolved to 0 packages/)
	})

	it("fails a structurally valid but implausibly small tree", () => {
		const tiny = Array.from({ length: 3 }, (_, i) => ({ name: `pkg-${i}`, version: "1.0.0" }))
		const problems = dependencyFloorProblems(tiny)
		assert.equal(problems.length, 1)
		assert.match(problems[0], new RegExp(`below the documented floor of ${MIN_EXPECTED_DEPENDENCIES}`))
	})

	it("treats a non-array as an empty tree rather than passing", () => {
		assert.match(dependencyFloorProblems(undefined)[0], /resolved to 0 packages/)
	})

	it("passes a plausible tree", () => {
		const plausible = Array.from({ length: MIN_EXPECTED_DEPENDENCIES }, (_, i) => ({
			name: `pkg-${i}`,
			version: "1.0.0",
		}))
		assert.deepEqual(dependencyFloorProblems(plausible), [])
	})
})
