#!/usr/bin/env node

/**
 * Webview build/test toolchain parity gate (issue #250 systemic quality gate).
 *
 * Invariant enforced here (also documented in
 * `webview-ui/docs/react-hooks-v7-loop-safe-design.md`):
 *
 *   Test and production MUST compile the webview with identical Babel/React
 *   tooling. A toolchain divergence — e.g. babel-plugin-react-compiler enabled
 *   in the production `vite` build but not in the vitest suite — lets the test
 *   suite stay green while the shipped artifact behaves differently (the #301
 *   "Too many re-renders" startup crash this gate exists to prevent).
 *
 * What it does:
 *   1. Config parity — compares the `@vitejs/plugin-react` `react(...)` plugin
 *      configuration declared in `vite.config.ts`, `playwright-ct.config.ts`,
 *      and `vitest.config.ts` and fails on any divergence. It also hard-fails
 *      if the React Compiler (`babel-plugin-react-compiler`) is enabled in ANY
 *      of the three toolchains.
 *   2. Bundle canary — builds the webview production bundle (`vite build`) and
 *      fails if it contains React Compiler runtime markers
 *      (`react-compiler-runtime`, `useMemoCache`), which only appear when the
 *      production toolchain compiles differently from the test path.
 *
 * Usage:
 *   node webview-ui/scripts/verify-webview-build-parity.mjs        # build + verify
 *   node webview-ui/scripts/verify-webview-build-parity.mjs --skip-build  # inspect existing bundle
 *
 * Idempotent: running it repeatedly produces the same result (a fresh build is
 * produced deterministically; the build output is a git-ignored artifact).
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs"
import { spawnSync } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

const WEBVIEW_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

/** Toolchain configs whose Babel/React plugin config must stay in parity. */
const CONFIG_FILES = ["vite.config.ts", "playwright-ct.config.ts", "vitest.config.ts"]

/**
 * Production bundle output dir, matching `outDir: "../src/webview-ui/build"`
 * in `vite.config.ts` (default mode).
 */
const BUILD_DIR = path.resolve(WEBVIEW_DIR, "..", "src", "webview-ui", "build")

/**
 * React Compiler runtime markers that must NEVER appear in the production
 * bundle. Calibrated against the compiler-free build: a bundle compiled by
 * babel-plugin-react-compiler emits `useMemoCache(...)` calls and imports from
 * the `react-compiler-runtime` package; the compiler-free production build
 * contains neither string anywhere in its JS output.
 */
export const HARD_BUNDLE_MARKERS = ["react-compiler-runtime", "useMemoCache"]

/**
 * `jsxDEV` is deliberately NOT a hard gate: it appears in legitimate
 * compiler-free production bundles from third-party JSX-transform runtimes
 * (e.g. hast-util-to-jsx-runtime's `development: true` branch). It is
 * reported for context only.
 */
export const SOFT_BUNDLE_MARKERS = ["jsxDEV"]

/** The React Compiler must never be enabled in any webview toolchain. */
const FORBIDDEN_CONFIG_TOKENS = ["babel-plugin-react-compiler", "react-compiler"]

/**
 * Extract the balanced `react(...)` plugin call (the @vitejs/plugin-react
 * configuration) from a toolchain config source. Handles nested parens,
 * braces, brackets and quoted strings. Returns the raw call text, or `null`
 * when no react plugin call is present.
 */
export function extractReactPluginCall(source) {
	const callStart = source.search(/react\s*\(/)
	if (callStart === -1) {
		return null
	}

	const openParen = source.indexOf("(", callStart)
	let depth = 0
	let inString = null

	for (let i = openParen; i < source.length; i++) {
		const ch = source[i]

		if (inString) {
			if (ch === "\\") {
				i++
				continue
			}
			if (ch === inString) {
				inString = null
			}
			continue
		}

		if (ch === '"' || ch === "'" || ch === "`") {
			inString = ch
			continue
		}

		if (ch === "(") {
			depth++
		} else if (ch === ")") {
			depth--
			if (depth === 0) {
				return source.slice(callStart, i + 1)
			}
		}
	}

	return null
}

/**
 * Normalize a react plugin call so formatting differences (whitespace,
 * comments, line breaks) do not cause false divergences, while any real
 * config difference (e.g. a babel plugin array) still does.
 */
export function normalizeSignature(signature) {
	return signature
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.replace(/\s+/g, "")
		// Strip trailing commas before } or ] so prettier formatting (which adds
		// them) never causes a false divergence between toolchain configs.
		.replace(/,([}\]])/g, "$1")
}

/**
 * Verify that every webview toolchain config declares an identical
 * `@vitejs/plugin-react` configuration and that none enables the React
 * Compiler.
 */
export function checkConfigParity() {
	const signatures = {}

	for (const file of CONFIG_FILES) {
		const abs = path.join(WEBVIEW_DIR, file)

		if (!existsSync(abs)) {
			return { ok: false, error: `Missing webview toolchain config: ${file}` }
		}

		const source = readFileSync(abs, "utf8")

		for (const token of FORBIDDEN_CONFIG_TOKENS) {
			if (source.includes(token)) {
				return {
					ok: false,
					error: `${file} enables the React Compiler (found "${token}"). The compiler must be disabled in EVERY webview toolchain (production AND test) so tests match the shipped artifact.`,
				}
			}
		}

		const call = extractReactPluginCall(source)

		if (call === null) {
			return { ok: false, error: `${file} does not declare the @vitejs/plugin-react react() plugin.` }
		}

		signatures[file] = normalizeSignature(call)
	}

	const uniqueSignatures = new Set(Object.values(signatures))

	if (uniqueSignatures.size > 1) {
		return {
			ok: false,
			error: `Babel/React plugin config diverges across webview toolchains (test and production must compile identically):\n${CONFIG_FILES.map(
				(file) => `  ${file}: ${signatures[file]}`,
			).join("\n")}`,
		}
	}

	return { ok: true, signature: [...uniqueSignatures][0] }
}

/** Recursively list every `.js` file under `dir`. */
function walkJsFiles(dir, out = []) {
	for (const entry of readdirSync(dir)) {
		const abs = path.join(dir, entry)
		const stat = statSync(abs)

		if (stat.isDirectory()) {
			walkJsFiles(abs, out)
		} else if (entry.endsWith(".js")) {
			out.push(abs)
		}
	}

	return out
}

/**
 * Scan the production bundle for React Compiler runtime markers.
 * Returns `{ ok, hard, soft }` where `hard` entries fail the gate and `soft`
 * entries (jsxDEV) are informational only.
 */
export function scanBundle(buildDir) {
	if (!existsSync(buildDir)) {
		return {
			ok: false,
			error: `No webview production bundle at ${buildDir}. Run the webview build first (or drop --skip-build).`,
			hard: [],
			soft: [],
		}
	}

	const hard = []
	const soft = []

	for (const file of walkJsFiles(buildDir)) {
		const content = readFileSync(file, "utf8")

		for (const marker of HARD_BUNDLE_MARKERS) {
			if (content.includes(marker)) {
				hard.push({ file: path.relative(WEBVIEW_DIR, file), marker })
			}
		}

		for (const marker of SOFT_BUNDLE_MARKERS) {
			if (content.includes(marker)) {
				soft.push({ file: path.relative(WEBVIEW_DIR, file), marker })
			}
		}
	}

	return { ok: hard.length === 0, hard, soft }
}

/** Run a fresh webview production build (`vite build`, no type-check). */
function buildWebview() {
	const npx = process.platform === "win32" ? "npx.cmd" : "npx"
	const result = spawnSync(npx, ["vite", "build"], { cwd: WEBVIEW_DIR, stdio: "inherit" })
	return result.status === 0
}

export function main(argv = process.argv.slice(2)) {
	const skipBuild = argv.includes("--skip-build")

	const configResult = checkConfigParity()

	if (!configResult.ok) {
		console.error(`\n[verify-webview-build-parity] FAIL: ${configResult.error}`)
		return 1
	}

	console.log(
		`[verify-webview-build-parity] config parity OK (react plugin signature: ${configResult.signature})`,
	)

	if (skipBuild) {
		console.log("[verify-webview-build-parity] --skip-build: inspecting existing production bundle")
	} else {
		console.log("[verify-webview-build-parity] building webview production bundle (vite build)...")

		if (!buildWebview()) {
			console.error("[verify-webview-build-parity] FAIL: webview production build failed")
			return 1
		}
	}

	const bundleResult = scanBundle(BUILD_DIR)

	if (bundleResult.error) {
		console.error(`\n[verify-webview-build-parity] FAIL: ${bundleResult.error}`)
		return 1
	}

	if (bundleResult.hard.length > 0) {
		console.error(
			"\n[verify-webview-build-parity] FAIL: production bundle contains React Compiler runtime markers (production is compiling differently from the test path):",
		)
		for (const { file, marker } of bundleResult.hard) {
			console.error(`  - ${marker} in ${file}`)
		}
		return 1
	}

	console.log("[verify-webview-build-parity] bundle canary OK (no React Compiler runtime markers)")

	if (bundleResult.soft.length > 0) {
		console.log(
			`[verify-webview-build-parity] note: jsxDEV present in ${bundleResult.soft.length} file(s) — third-party dev-runtime branch, informational only, not a gate`,
		)
	}

	console.log("[verify-webview-build-parity] PASS: webview build and test toolchains are in parity")
	return 0
}

// Run directly (not when imported by a spec file).
if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
	process.exitCode = main()
}
