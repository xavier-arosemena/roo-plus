/**
 * verify-vsix-budget.spec.mjs
 *
 * Unit tests for the pure decision logic in scripts/verify-vsix-budget.mjs
 * (Issue #13, Sub-task E). These tests DO NOT run `vsce`, do not need a built
 * tree, and are fully offline: they feed synthetic file lists (and a synthetic
 * in-memory ZIP) into the exported pure functions and assert the verdicts.
 *
 * Run from the repo root with: node --test scripts/verify-vsix-budget.spec.mjs
 * (scripts/ has no vitest runner, so node:test built into Node 22 is used.)
 */

import { describe, it } from "node:test"
import assert from "node:assert/strict"

import {
	BUDGET_BASELINE,
	ESBUILD_WASM_BUDGET,
	FILES_BUDGET,
	FORBIDDEN,
	JS_BUDGET,
	MAP_BUDGET,
	MARKETPLACE_DUPLICATE_BUDGET,
	REQUIRED_EXACT,
	REQUIRED_PATTERNS,
	assessVsixBudget,
	evaluateLayout,
	formatVerdict,
	normalizeFileList,
	readZipEntryNames,
	stripVsixRootPrefix,
} from "./verify-vsix-budget.mjs"

/** A representative pack that satisfies every required path/pattern. */
function baseFixture() {
	const files = [...REQUIRED_EXACT]
	files.push("package.nls.zh-CN.json", "package.nls.de.json")
	files.push("assets/vscode-material-icons/icons/abc.svg")
	files.push("assets/images/icon.png")
	files.push("webview-ui/audio/notification.wav")
	files.push("integrations/theme/default-themes/light_plus.json")
	files.push("dist/i18n/locales/en/tools.json")
	files.push("dist/tree-sitter.wasm")
	files.push("dist/tree-sitter-c.wasm", "dist/tree-sitter-rust.wasm")
	return files
}

const EXPECTED_TS = ["tree-sitter-c.wasm", "tree-sitter-rust.wasm"]

/* ------------------------------------------------------------------ *
 * normalizeFileList
 * ------------------------------------------------------------------ */

describe("normalizeFileList", () => {
	it("trims, converts backslashes, strips ./ and drops blanks", () => {
		assert.deepEqual(normalizeFileList("dist/extension.js\n\n./package.json\n"), [
			"dist/extension.js",
			"package.json",
		])
		assert.deepEqual(normalizeFileList("dist\\workers\\countTokens.js"), ["dist/workers/countTokens.js"])
	})

	it("de-duplicates and sorts", () => {
		assert.deepEqual(normalizeFileList(["b.js", "a.js", "b.js"]), ["a.js", "b.js"])
	})

	it("accepts an array or a string", () => {
		assert.deepEqual(normalizeFileList(["a"]), ["a"])
		assert.deepEqual(normalizeFileList("a"), ["a"])
	})
})

/* ------------------------------------------------------------------ *
 * assessVsixBudget — the packaging-budget gate
 * ------------------------------------------------------------------ */

describe("assessVsixBudget", () => {
	it("PASSES at the measured post-leanness baseline (1278 files, 93 .js)", () => {
		const files = [
			...Array.from({ length: BUDGET_BASELINE.js }, (_, i) => `dist/a${i}.js`),
			...Array.from({ length: BUDGET_BASELINE.files - BUDGET_BASELINE.js }, (_, i) => `dist/f${i}.txt`),
		]
		const verdict = assessVsixBudget(files)
		assert.equal(verdict.ok, true, JSON.stringify(verdict.violations))
		assert.equal(verdict.stats.files, 1278)
		assert.equal(verdict.stats.js, 93)
		assert.deepEqual(verdict.violations, [])
	})

	it("FAILS when the file count exceeds the budget (not a no-op)", () => {
		const files = Array.from({ length: FILES_BUDGET + 1 }, (_, i) => `f${i}.txt`)
		const verdict = assessVsixBudget(files)
		assert.equal(verdict.ok, false)
		assert.ok(verdict.violations.some((v) => v.rule === "files-budget"))
	})

	it("FAILS when the .js count exceeds 100", () => {
		const files = [
			...Array.from({ length: JS_BUDGET + 1 }, (_, i) => `a${i}.js`),
			...Array.from({ length: 40 }, (_, i) => `b${i}.txt`),
		]
		const verdict = assessVsixBudget(files)
		assert.equal(verdict.ok, false)
		assert.equal(verdict.stats.js, JS_BUDGET + 1)
		assert.ok(verdict.violations.some((v) => v.rule === "js-budget"))
	})

	it("FAILS when any source map is packaged", () => {
		const verdict = assessVsixBudget(["dist/extension.js", "dist/extension.js.map"])
		assert.equal(verdict.ok, false)
		assert.equal(verdict.stats.map, 1)
		assert.ok(verdict.violations.some((v) => v.rule === "source-maps-forbidden"))
	})

	it("FAILS when the dist/assets/marketplace duplicate is packaged", () => {
		const verdict = assessVsixBudget(["assets/marketplace/modes.yml", "dist/assets/marketplace/modes.yml"])
		assert.equal(verdict.ok, false)
		assert.equal(verdict.stats.marketplace, 1)
		assert.ok(verdict.violations.some((v) => v.rule === "marketplace-duplicate-forbidden"))
	})

	it("FAILS when dist/esbuild.wasm is packaged", () => {
		const verdict = assessVsixBudget(["dist/extension.js", "dist/esbuild.wasm"])
		assert.equal(verdict.ok, false)
		assert.equal(verdict.stats.esbuildWasm, 1)
		assert.ok(verdict.violations.some((v) => v.rule === "esbuild-wasm-forbidden"))
	})

	it("allows per-run budget overrides (debug/negative-check helper)", () => {
		const verdict = assessVsixBudget(["a.js", "b.js"], { files: 1, js: 1 })
		assert.equal(verdict.ok, false)
		assert.equal(verdict.budgets.files, 1)
		assert.equal(verdict.budgets.js, 1)
	})

	it("exposes default budgets as documented", () => {
		assert.equal(FILES_BUDGET, 1300)
		assert.equal(JS_BUDGET, 100)
		assert.equal(MAP_BUDGET, 0)
		assert.equal(MARKETPLACE_DUPLICATE_BUDGET, 0)
		assert.equal(ESBUILD_WASM_BUDGET, 0)
	})

	it("keeps budget headroom small and positive over the recorded baseline", () => {
		assert.ok(FILES_BUDGET >= BUDGET_BASELINE.files, "files budget below baseline")
		assert.ok(JS_BUDGET >= BUDGET_BASELINE.js, ".js budget below baseline")
		assert.ok(FILES_BUDGET - BUDGET_BASELINE.files <= 50, "files headroom too generous")
		assert.ok(JS_BUDGET - BUDGET_BASELINE.js <= 20, ".js headroom too generous")
	})
})

/* ------------------------------------------------------------------ *
 * evaluateLayout — the packaged-layout smoke assertions
 * ------------------------------------------------------------------ */

describe("evaluateLayout", () => {
	it("PASSES a pack that contains every required path and no forbidden path", () => {
		const verdict = evaluateLayout(baseFixture(), { expectedTreeSitterWasms: EXPECTED_TS })
		assert.equal(
			verdict.ok,
			true,
			JSON.stringify({ missing: verdict.missing, forbidden: verdict.presentForbidden }),
		)
		assert.deepEqual(verdict.missing, [])
		assert.deepEqual(verdict.presentForbidden, [])
	})

	it("FAILS when a required exact path is missing", () => {
		const files = baseFixture().filter((f) => f !== "dist/workers/countTokens.js")
		const verdict = evaluateLayout(files, { expectedTreeSitterWasms: EXPECTED_TS })
		assert.equal(verdict.ok, false)
		assert.ok(verdict.missing.some((m) => m.kind === "required-exact" && m.path === "dist/workers/countTokens.js"))
	})

	it("FAILS when a required tree-sitter grammar is missing", () => {
		const files = baseFixture().filter((f) => f !== "dist/tree-sitter-rust.wasm")
		const verdict = evaluateLayout(files, { expectedTreeSitterWasms: EXPECTED_TS })
		assert.equal(verdict.ok, false)
		assert.ok(
			verdict.missing.some(
				(m) => m.kind === "required-tree-sitter-wasm" && m.path === "dist/tree-sitter-rust.wasm",
			),
		)
	})

	it("FAILS when a required directory/glob pattern has no matches", () => {
		const files = baseFixture().filter((f) => !f.startsWith("webview-ui/audio/"))
		const verdict = evaluateLayout(files, { expectedTreeSitterWasms: EXPECTED_TS })
		assert.equal(verdict.ok, false)
		assert.ok(verdict.missing.some((m) => m.kind === "required-pattern" && m.id === "webview-audio"))
	})

	it("FAILS when a forbidden path is present", () => {
		const files = [...baseFixture(), "webview-ui/build/assets/index.js.map"]
		const verdict = evaluateLayout(files, { expectedTreeSitterWasms: EXPECTED_TS })
		assert.equal(verdict.ok, false)
		assert.ok(verdict.presentForbidden.some((f) => f.id === "source-maps"))
	})

	it("FAILS CLOSED when the tree-sitter grammar set cannot be derived (empty expected set)", () => {
		const verdict = evaluateLayout(baseFixture(), { expectedTreeSitterWasms: [] })
		assert.equal(verdict.ok, false)
		assert.ok(verdict.missing.some((m) => m.kind === "tree-sitter-set-undeterminable"))
	})

	it("every REQUIRED_PATTERN has a well-formed regex and positive minimum", () => {
		for (const r of REQUIRED_PATTERNS) {
			assert.ok(r.re instanceof RegExp, `${r.id} has no regex`)
			assert.ok(Number.isInteger(r.min) && r.min > 0, `${r.id} has a bad min`)
		}
	})

	it("every FORBIDDEN entry carries an id, regex and rationale", () => {
		for (const f of FORBIDDEN) {
			assert.ok(f.id && f.re instanceof RegExp && f.why, `bad forbidden entry: ${JSON.stringify(f)}`)
		}
	})

	it("the required exact list has no duplicates", () => {
		assert.equal(new Set(REQUIRED_EXACT).size, REQUIRED_EXACT.length)
	})

	it("REQUIRED_EXACT covers every path the runtime readers touch", () => {
		const required = new Set(REQUIRED_EXACT)
		// ClineProvider.getHtmlContent()
		for (const p of [
			"webview-ui/build/assets/index.js",
			"webview-ui/build/assets/index.css",
			"assets/codicons/codicon.css",
			"assets/marketplace/modes.yml",
			"assets/marketplace/mcps.yml",
			"assets/marketplace/pre-installed-modes.yml",
		]) {
			assert.ok(required.has(p), `missing required path: ${p}`)
		}
	})
})

/* ------------------------------------------------------------------ *
 * formatVerdict
 * ------------------------------------------------------------------ */

describe("formatVerdict", () => {
	it("prints budgets and measured counts", () => {
		const budget = assessVsixBudget(["a.js", "b.js"])
		const layout = evaluateLayout(baseFixture(), { expectedTreeSitterWasms: EXPECTED_TS })
		const text = formatVerdict(budget, layout)
		assert.match(text, /files ≤ 1300 \(measured 2\)/)
		assert.match(text, /\.js ≤ 100 \(measured 2\)/)
	})

	it("lists missing required paths and forbidden hits", () => {
		const budget = assessVsixBudget(["a.js"])
		const layout = evaluateLayout(["dist/extension.js.map"], { expectedTreeSitterWasms: EXPECTED_TS })
		const text = formatVerdict(budget, layout)
		assert.match(text, /missing required paths/)
		assert.match(text, /forbidden paths present/)
	})
})

/* ------------------------------------------------------------------ *
 * readZipEntryNames — optional --vsix mode
 * ------------------------------------------------------------------ */

/**
 * Builds a minimal, valid, UNCOMPRESSED ("stored") ZIP in memory for the given
 * entry names. CRC values are zeroed because the reader only walks the central
 * directory. Deterministic and offline.
 * @param {string[]} names
 * @returns {Buffer}
 */
function createStoredZip(names) {
	const localChunks = []
	const centralChunks = []
	let offset = 0
	for (const name of names) {
		const nameBuf = Buffer.from(name, "utf8")
		const data = Buffer.from(`stored:${name}`, "utf8")

		const local = Buffer.alloc(30)
		local.writeUInt32LE(0x04034b50, 0)
		local.writeUInt16LE(20, 4) // version needed
		local.writeUInt16LE(0, 6) // flags
		local.writeUInt16LE(0, 8) // method: stored
		local.writeUInt16LE(0, 10) // mod time
		local.writeUInt16LE(0, 12) // mod date
		local.writeUInt32LE(0, 14) // crc32
		local.writeUInt32LE(data.length, 18) // compressed size
		local.writeUInt32LE(data.length, 22) // uncompressed size
		local.writeUInt16LE(nameBuf.length, 26)
		local.writeUInt16LE(0, 28) // extra length
		localChunks.push(local, nameBuf, data)

		const central = Buffer.alloc(46)
		central.writeUInt32LE(0x02014b50, 0)
		central.writeUInt16LE(20, 4) // version made by
		central.writeUInt16LE(20, 6) // version needed
		central.writeUInt16LE(0, 8) // flags
		central.writeUInt16LE(0, 10) // method
		central.writeUInt16LE(0, 12) // mod time
		central.writeUInt16LE(0, 14) // mod date
		central.writeUInt32LE(0, 16) // crc32
		central.writeUInt32LE(data.length, 20)
		central.writeUInt32LE(data.length, 24)
		central.writeUInt16LE(nameBuf.length, 28)
		central.writeUInt16LE(0, 30) // extra length
		central.writeUInt16LE(0, 32) // comment length
		central.writeUInt16LE(0, 34) // disk number start
		central.writeUInt16LE(0, 36) // internal attrs
		central.writeUInt32LE(0, 38) // external attrs
		central.writeUInt32LE(offset, 42) // local header offset
		centralChunks.push(central, nameBuf)

		offset += local.length + nameBuf.length + data.length
	}

	const centralDir = Buffer.concat(centralChunks)
	const eocd = Buffer.alloc(22)
	eocd.writeUInt32LE(0x06054b50, 0)
	eocd.writeUInt16LE(0, 4)
	eocd.writeUInt16LE(0, 6)
	eocd.writeUInt16LE(names.length, 8)
	eocd.writeUInt16LE(names.length, 10)
	eocd.writeUInt32LE(centralDir.length, 12)
	eocd.writeUInt32LE(offset, 16)
	eocd.writeUInt16LE(0, 20)

	return Buffer.concat([...localChunks, centralDir, eocd])
}

describe("readZipEntryNames", () => {
	it("reads entry names from a stored ZIP", () => {
		const zip = createStoredZip([
			"extension/dist/extension.js",
			"extension/package.json",
			"extension/webview-ui/build/assets/index.js",
		])
		assert.deepEqual(readZipEntryNames(zip), [
			"extension/dist/extension.js",
			"extension/package.json",
			"extension/webview-ui/build/assets/index.js",
		])
	})

	it("handles an empty archive", () => {
		assert.deepEqual(readZipEntryNames(createStoredZip([])), [])
	})

	it("throws on a non-ZIP buffer", () => {
		assert.throws(() => readZipEntryNames(Buffer.from("not a zip file at all")), /not a ZIP archive/)
	})
})

describe("stripVsixRootPrefix", () => {
	it("removes the leading extension/ folder so paths match the vsce ls shape", () => {
		assert.deepEqual(stripVsixRootPrefix(["extension/dist/extension.js", "extension/package.json"]), [
			"dist/extension.js",
			"package.json",
		])
	})

	it("leaves the bare extension/ directory entry as an empty string (dropped by normalizeFileList)", () => {
		assert.deepEqual(stripVsixRootPrefix(["extension/"]), [""])
	})

	it("does not touch paths that lack the prefix", () => {
		assert.deepEqual(stripVsixRootPrefix(["dist/extension.js"]), ["dist/extension.js"])
	})
})
