/**
 * semble-smoke.spec.mjs
 *
 * Unit tests for the pure, deterministic logic in scripts/semble-smoke.mjs:
 *   - SEMBLE_* constant extraction from the downloader source
 *   - binary layout resolution (flat + one-dir PyInstaller builds)
 *   - --help / --version / search output assertions
 *
 * The real binary is exercised by the script itself (scripts/semble-smoke.mjs);
 * these tests pin the helpers without any network access or binary download.
 *
 * Run with: node --test scripts/semble-smoke.spec.mjs
 * (scripts/ has no vitest runner, so node:test built into Node 22 is used —
 * no new dependencies or configuration, same as verify-message-schemas.spec.mjs)
 */

import { describe, it, after } from "node:test"
import assert from "node:assert/strict"
import * as fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import {
	assertHelpOutput,
	extractArchives,
	extractSha256,
	extractVersion,
	extractVersionFromOutput,
	parseSearchOutput,
	resolveSembleBinaryPath,
} from "./semble-smoke.mjs"

const SAMPLE_SOURCE = `
export const SEMBLE_ARCHIVES: Record<string, { archive: string; binary: string }> = {
	"linux-x64": { archive: "semble-linux-x64-fast.tar.gz", binary: "semble" },
	"linux-arm64": { archive: "semble-linux-arm64-fast.tar.gz", binary: "semble" },
	"win32-x64": { archive: "semble-windows-x64-fast.zip", binary: "semble.exe" },
}

export const SEMBLE_VERSION = "v0.5.2"

export const SEMBLE_SHA256: Record<string, string> = {
	"linux-x64": "bd5be465659c220335f1e2d4e1afe117288ae7f8ceab93902ac737662e9309d3",
	"win32-x64": "c793051829fd440939f7d9735649e6027bb42182f19f1c324dbeb0ed6c9118ad",
}
`

describe("constant extraction from the downloader source", () => {
	it("extracts the pinned SEMBLE_VERSION", () => {
		assert.equal(extractVersion(SAMPLE_SOURCE), "v0.5.2")
	})

	it("extracts SEMBLE_ARCHIVES with archive + binary per platform", () => {
		assert.deepEqual(extractArchives(SAMPLE_SOURCE), {
			"linux-x64": { archive: "semble-linux-x64-fast.tar.gz", binary: "semble" },
			"linux-arm64": { archive: "semble-linux-arm64-fast.tar.gz", binary: "semble" },
			"win32-x64": { archive: "semble-windows-x64-fast.zip", binary: "semble.exe" },
		})
	})

	it("extracts SEMBLE_SHA256 hashes keyed by platform", () => {
		assert.deepEqual(extractSha256(SAMPLE_SOURCE), {
			"linux-x64": "bd5be465659c220335f1e2d4e1afe117288ae7f8ceab93902ac737662e9309d3",
			"win32-x64": "c793051829fd440939f7d9735649e6027bb42182f19f1c324dbeb0ed6c9118ad",
		})
	})

	it("throws a clear error when SEMBLE_VERSION is missing", () => {
		assert.throws(() => extractVersion("export const OTHER = 1"), /SEMBLE_VERSION/)
	})
})

describe("assertHelpOutput (checkInstalled hardening)", () => {
	it("passes when help advertises the search subcommand (case-insensitive)", () => {
		assert.equal(
			assertHelpOutput("usage: semble [-h] {search,find-related,clear,install,savings}\n\npositional arguments:"),
			true,
		)
		assert.equal(assertHelpOutput("USAGE: SEMBLE COMMANDS: SEARCH ..."), true)
	})

	it("fails when help is empty or lacks `search` (silent-exit-0 stub)", () => {
		assert.throws(() => assertHelpOutput(""), /search/)
		assert.throws(() => assertHelpOutput("usage: semble\n\nno subcommands here"), /search/)
	})
})

describe("extractVersionFromOutput", () => {
	it("extracts a plain version token", () => {
		assert.equal(extractVersionFromOutput("semble 0.5.2"), "0.5.2")
	})

	it("extracts a v-prefixed version token", () => {
		assert.equal(extractVersionFromOutput("semble version v0.5.2"), "v0.5.2")
	})

	it("returns undefined for empty or version-less output (stub)", () => {
		assert.equal(extractVersionFromOutput(""), undefined)
		assert.equal(extractVersionFromOutput("semble"), undefined)
		assert.equal(extractVersionFromOutput("   "), undefined)
	})
})

describe("parseSearchOutput", () => {
	const validOutput = JSON.stringify({
		query: "sum",
		results: [
			{ file_path: "calculator.py", start_line: 5, end_line: 8, score: 0.9, content: "def add" },
			{ file_path: "greeter.py", start_line: 1, end_line: 4, score: 0.2, content: "def greet" },
		],
	})

	it("parses a valid non-empty results payload", () => {
		const parsed = parseSearchOutput(validOutput)
		assert.equal(parsed.results.length, 2)
		assert.equal(parsed.results[0].file_path, "calculator.py")
	})

	it("fails on empty stdout", () => {
		assert.throws(() => parseSearchOutput(""), /empty stdout/)
	})

	it("fails on non-JSON output", () => {
		assert.throws(() => parseSearchOutput("some plain text"), /not valid JSON/)
	})

	it("fails on an error payload (No results found)", () => {
		assert.throws(() => parseSearchOutput(JSON.stringify({ error: "No results found." })), /error payload/)
	})

	it("fails on an empty results array", () => {
		assert.throws(() => parseSearchOutput(JSON.stringify({ query: "q", results: [] })), /empty results array/)
	})

	it("fails when results is not an array", () => {
		assert.throws(
			() => parseSearchOutput(JSON.stringify({ query: "q", results: "nope" })),
			/no top-level "results" array/,
		)
	})

	it("fails when no result carries a file_path (stub-like payload)", () => {
		assert.throws(
			() => parseSearchOutput(JSON.stringify({ query: "q", results: [{ score: 1 }] })),
			/none carry a file_path/,
		)
	})
})

describe("resolveSembleBinaryPath (extension layout rule)", () => {
	const tempRoots = []

	after(async () => {
		await Promise.all(tempRoots.map((root) => fs.rm(root, { recursive: true, force: true })))
	})

	async function makeTempDir() {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), "semble-smoke-spec-"))
		tempRoots.push(root)
		return root
	}

	it("resolves a flat archive layout (<root>/semble)", async () => {
		const root = await makeTempDir()
		await fs.writeFile(path.join(root, "semble"), "#!/bin/sh\necho hi\n", "utf-8")
		assert.equal(await resolveSembleBinaryPath(root, "semble"), path.join(root, "semble"))
	})

	it("resolves a PyInstaller one-dir layout (<root>/semble/semble)", async () => {
		const root = await makeTempDir()
		await fs.mkdir(path.join(root, "semble"), { recursive: true })
		await fs.writeFile(path.join(root, "semble", "semble"), "#!/bin/sh\necho hi\n", "utf-8")
		assert.equal(await resolveSembleBinaryPath(root, "semble"), path.join(root, "semble", "semble"))
	})

	it("prefers a flat file over a same-named directory", async () => {
		const root = await makeTempDir()
		await fs.writeFile(path.join(root, "semble"), "flat\n", "utf-8")
		await fs.mkdir(path.join(root, "nested"), { recursive: true })
		await fs.writeFile(path.join(root, "nested", "semble"), "nested\n", "utf-8")
		assert.equal(await resolveSembleBinaryPath(root, "semble"), path.join(root, "semble"))
	})

	it("returns undefined when the binary is absent (no false positives)", async () => {
		const root = await makeTempDir()
		await fs.writeFile(path.join(root, "other.txt"), "x\n", "utf-8")
		assert.equal(await resolveSembleBinaryPath(root, "semble"), undefined)
	})
})
