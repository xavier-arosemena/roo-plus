import test from "node:test"
import assert from "node:assert/strict"
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs"
import os from "node:os"
import path from "node:path"

import {
	extractReactPluginCall,
	normalizeSignature,
	scanBundle,
	scanRootAbsoluteAssetRefs,
	ROOT_ABSOLUTE_ASSET_CHECKS,
	HARD_BUNDLE_MARKERS,
	SOFT_BUNDLE_MARKERS,
} from "./verify-webview-build-parity.mjs"

test("extractReactPluginCall returns the balanced react() call including options", () => {
	const source = `plugins: [react({ babel: { plugins: [["babel-plugin-react-compiler", { target: "18" }]] } }), tailwindcss()]`
	assert.equal(
		extractReactPluginCall(source),
		`react({ babel: { plugins: [["babel-plugin-react-compiler", { target: "18" }]] } })`,
	)
})

test("extractReactPluginCall handles nested quotes inside the options object", () => {
	const source = `plugins: [react({ babel: { plugins: ["pkg", { opt: "a)b(" }] } })]`
	assert.equal(extractReactPluginCall(source), `react({ babel: { plugins: ["pkg", { opt: "a)b(" }] } })`)
})

test("extractReactPluginCall returns null when the react plugin is missing", () => {
	assert.equal(extractReactPluginCall(`plugins: [tailwindcss()]`), null)
})

test("normalizeSignature ignores formatting so semantically equal configs compare equal", () => {
	const a = normalizeSignature(`react({ babel: { plugins: [["babel-plugin-react-compiler", { target: "18" }]] } })`)
	const b = normalizeSignature(`react({
		babel: {
			plugins: [["babel-plugin-react-compiler", { target: "18" }]],
		},
	})`)
	assert.equal(a, b)
	assert.equal(a, `react({babel:{plugins:[["babel-plugin-react-compiler",{target:"18"}]]}})`)
})

test("a compiler-enabled react() config diverges from the plain react() config", () => {
	// This is exactly the #250 divergence: production compiled with the React
	// Compiler while the vitest suite compiled without it.
	const plain = normalizeSignature(extractReactPluginCall(`plugins: [react(), tailwindcss()]`))
	const compiled = normalizeSignature(
		extractReactPluginCall(
			`plugins: [react({ babel: { plugins: [["babel-plugin-react-compiler", { target: "18" }]] } }), tailwindcss()]`,
		),
	)
	assert.notEqual(plain, compiled)
})

test("scanBundle hard-fails on React Compiler runtime markers and reports jsxDEV as soft only", () => {
	const root = mkdtempSync(path.join(os.tmpdir(), "webview-parity-"))

	try {
		// A bundle compiled by the React Compiler imports react-compiler-runtime
		// and calls useMemoCache — both are hard gates.
		const compiledDir = path.join(root, "compiled")
		mkdirSync(compiledDir, { recursive: true })
		writeFileSync(
			path.join(compiledDir, "index.js"),
			`import { useMemoCache } from "react-compiler-runtime"; function App(){ return useMemoCache(1) }`,
		)

		const hardResult = scanBundle(compiledDir)
		assert.equal(hardResult.ok, false)
		assert.equal(hardResult.hard.length, 2)
		assert.ok(hardResult.hard.some((entry) => entry.marker === "react-compiler-runtime"))
		assert.ok(hardResult.hard.some((entry) => entry.marker === "useMemoCache"))

		// A compiler-free bundle may still reference jsxDEV (third-party dev
		// runtime branch) — that must NOT fail the gate.
		const cleanDir = path.join(root, "clean")
		mkdirSync(cleanDir, { recursive: true })
		writeFileSync(path.join(cleanDir, "index.js"), `if (options.development) { typeof jsxDEV === "function" }`)

		const softResult = scanBundle(cleanDir)
		assert.equal(softResult.ok, true)
		assert.equal(softResult.hard.length, 0)
		assert.equal(softResult.soft.length, 1)
		assert.equal(softResult.soft[0].marker, "jsxDEV")
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

test("scanBundle reports a missing bundle dir as an error", () => {
	const missing = path.join(os.tmpdir(), "definitely-missing-webview-build")
	const result = scanBundle(missing)
	assert.equal(result.ok, false)
	assert.ok(result.error)
})

test("hard and soft marker lists are disjoint", () => {
	for (const hard of HARD_BUNDLE_MARKERS) {
		assert.ok(!SOFT_BUNDLE_MARKERS.includes(hard), `marker "${hard}" must not be both hard and soft`)
	}
})

// ---------------------------------------------------------------------------
// scanRootAbsoluteAssetRefs — issue #416 root-absolute asset gate
// ---------------------------------------------------------------------------

/**
 * Writes a minimal three-file webview build fixture into a temp dir and runs
 * `fn(root, cleanup)`. `cleanup` is always run.
 */
function withBuildFixture(files, fn) {
	const root = mkdtempSync(path.join(os.tmpdir(), "webview-url-parity-"))

	try {
		for (const [rel, content] of Object.entries(files)) {
			const abs = path.join(root, rel)
			mkdirSync(path.dirname(abs), { recursive: true })
			writeFileSync(abs, content)
		}
		fn(root)
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
}

test("scanRootAbsoluteAssetRefs passes a relative-base build fixture", () => {
	withBuildFixture(
		{
			"index.html":
				'<script type="module" src="./assets/index.js"></script>\n<link rel="stylesheet" href="./assets/index.css" />',
			"assets/index.js": 'import x from "./chunk-abc.js"; const a=function(e,t){return new URL(e,t).href};',
			"assets/index.css": "@font-face{src:url(./fonts/codicon.ttf)}",
		},
		(root) => {
			const result = scanRootAbsoluteAssetRefs(root)
			assert.equal(result.ok, true)
			assert.deepEqual(result.violations, [])
		},
	)
})

test("scanRootAbsoluteAssetRefs fails a root-absolute build fixture (issue #416)", () => {
	withBuildFixture(
		{
			"index.html":
				'<script type="module" src="/assets/index.js"></script>\n<link rel="stylesheet" href="/assets/index.css" />',
			// The preload helper's root-absolute href plus a root-absolute
			// dynamic-import chunk specifier.
			"assets/index.js": 'const a=function(e){return "/"+e}; import("/assets/chunk-abc.js");',
			"assets/index.css": "@font-face{src:url(/assets/fonts/codicon.ttf)}",
		},
		(root) => {
			const result = scanRootAbsoluteAssetRefs(root)
			assert.equal(result.ok, false)

			const files = new Set(result.violations.map((v) => v.file))
			assert.ok(files.has("index.html"), "index.html root-absolute src/href must be flagged")
			assert.ok(files.has(path.join("assets", "index.js")), "index.js root-absolute import must be flagged")
			assert.ok(files.has(path.join("assets", "index.css")), "index.css root-absolute url() must be flagged")

			// Every violation reports a non-zero count for a real pattern hit.
			assert.ok(result.violations.every((v) => v.pattern !== "<missing-file>" && v.count > 0))
		},
	)
})

test("scanRootAbsoluteAssetRefs reports missing build artifacts", () => {
	withBuildFixture({}, (root) => {
		const result = scanRootAbsoluteAssetRefs(root)
		assert.equal(result.ok, false)
		assert.equal(result.violations.length, ROOT_ABSOLUTE_ASSET_CHECKS.length)
		assert.ok(result.violations.every((v) => v.pattern === "<missing-file>" && v.count === 0))
	})
})

test("scanRootAbsoluteAssetRefs flags the root-absolute preload-helper composition with no literal /assets/ (H5)", () => {
	withBuildFixture(
		{
			"index.html": '<script type="module" src="./assets/index.js"></script>',
			// A `base` regression that manifests ONLY through the preload helper:
			// there is no literal "/assets/" string anywhere in this file, so the
			// pre-H5 checks could not see it. The `"/"+` composition is the tell.
			"assets/index.js": 'const p=function(e){return "/"+e};',
			"assets/index.css": "",
		},
		(root) => {
			const result = scanRootAbsoluteAssetRefs(root)
			assert.equal(result.ok, false)
			const jsViolation = result.violations.find((v) => v.file === path.join("assets", "index.js"))
			assert.ok(jsViolation, "the root-absolute preload-helper composition must be flagged")
			assert.equal(jsViolation.pattern, '"/"+')
		},
	)
})

test("scanRootAbsoluteAssetRefs passes the relative preload-helper composition (H5)", () => {
	withBuildFixture(
		{
			"index.html": '<script type="module" src="./assets/index.js"></script>',
			"assets/index.js": 'const p=function(e){return "./"+e};',
			"assets/index.css": "",
		},
		(root) => {
			const result = scanRootAbsoluteAssetRefs(root)
			assert.equal(result.ok, true)
			assert.deepEqual(result.violations, [])
		},
	)
})
