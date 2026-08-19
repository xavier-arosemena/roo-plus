import test from "node:test"
import assert from "node:assert/strict"
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs"
import os from "node:os"
import path from "node:path"

import {
	extractReactPluginCall,
	normalizeSignature,
	scanBundle,
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
