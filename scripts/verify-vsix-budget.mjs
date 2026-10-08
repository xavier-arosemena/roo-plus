#!/usr/bin/env node

/**
 * verify-vsix-budget.mjs — regression gate for the packaged VSIX footprint (Issue #13).
 *
 * The leanness work delivered by Sub-tasks A–D (source-map & duplicate-asset
 * exclusion, curated Shiki grammars, Mermaid/vendor chunk consolidation, and
 * moving the 13.9 MB `esbuild.wasm` to download-only) is easy to silently
 * regress: a stray `!dist` negate, a re-enabled source map, or a new eagerly
 * bundled dependency inflates the pack without any test noticing. This gate
 * freezes the post-leanness footprint as BUDGETS and fails the moment it grows.
 *
 * It does two checks against the SAME file list:
 *
 *   1. BUDGET — file count, `.js` count, and hard-zero counts for source maps,
 *      the duplicate `dist/assets/marketplace/**` copy, and `dist/esbuild.wasm`.
 *   2. LAYOUT — every runtime-critical path is present and every deliberately
 *      excluded path is absent. The required list is derived from real runtime
 *      readers, not guessed:
 *        - `src/core/webview/ClineProvider.ts` `getHtmlContent()` (webview
 *          assets: index.js/index.css, codicons, material icons, images, audio);
 *        - `src/services/marketplace/ConfigLoader.ts` (assets/marketplace/*.yml);
 *        - `src/services/tree-sitter/languageParser.ts` `loadLanguage()`
 *          (dist/tree-sitter-*.wasm);
 *        - plus i18n (`src/i18n/setup.ts`), default themes
 *          (`src/integrations/theme/getTheme.ts`), the tiktoken worker
 *          (`src/utils/countTokens.ts`) and the esbuild-wasm runtime
 *          (`src/services/custom-tools/esbuild-engine.ts`).
 *
 * The default path is FAST and OFFLINE: it only runs `vsce ls --no-dependencies`
 * from `src/` against the existing build output — no network, no VSIX build.
 * An optional `--vsix <path>` mode reads the file list straight out of a built
 * `.vsix` (pure ZIP central-directory parse) and is NOT part of the default path.
 *
 * Wiring note: this gate needs a BUILT tree (`src/dist` + `webview-ui/build`).
 * It is therefore exposed as `pnpm verify:vsix-budget` and added to
 * `pnpm test:scripts`, but deliberately NOT added to `prevsix`/`prebundle`:
 * those hooks run BEFORE the build, so the list would be empty/incomplete and
 * the gate would be meaningless or falsely red. It is likewise kept out of the
 * upstream-sync batch (`gate:sync`), which is scoped to sync integrity.
 *
 * Usage (from the repo root):
 *   node scripts/verify-vsix-budget.mjs                 # gate the current tree
 *   node scripts/verify-vsix-budget.mjs --json          # machine-readable verdict
 *   node scripts/verify-vsix-budget.mjs --vsix bin/roo-plus-3.88.15.vsix
 *   node scripts/verify-vsix-budget.mjs --files-budget 10   # negative-check helper
 *   node scripts/verify-vsix-budget.mjs --help
 *
 * Exit codes:
 *   0  PASS — within budget and layout complete.
 *   1  FAIL — a budget exceeded, a required path missing, or a forbidden path present.
 *   2  FAIL — usage error.
 *   3  FAIL — the file list could not be produced (vsce missing / unreadable vsix).
 */

import { spawn } from "node:child_process"
import { existsSync, readFileSync, readdirSync } from "node:fs"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

import { logError, logInfo, logOk, logStep, logWarn } from "./lib/logger.mjs"

/** Hierarchical tag identifying this process (same scheme as the sibling gates). */
export const TAG = "VERIFY:VSIX-BUDGET"

/** Repository root (the workspace root, one level above scripts/). */
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

/** The VS Code extension package whose build output `vsce ls` enumerates. */
export const SRC_DIR = path.join(ROOT, "src")

export const EXIT = {
	PASS: 0,
	FAIL: 1,
	USAGE: 2,
	LIST_ERROR: 3,
}

/**
 * The measured post-leanness footprint these budgets freeze. Recorded
 * 2026-10-07 from `cd src && npx vsce ls --no-dependencies` on the Issue #13
 * branch (Sub-tasks A–D applied). Budgets are the baseline plus a small,
 * deliberate headroom so routine additive changes pass while regressions
 * (re-included maps/duplicates, an un-consolidated vendor chunk, a stray new
 * bundle) fail loudly.
 */
export const BUDGET_BASELINE = {
	measuredAt: "2026-10-07",
	files: 1278,
	js: 93,
	map: 0,
	marketplace: 0,
	esbuildWasm: 0,
	note: "Issue #13 post-leanness pack (Sub-tasks A–D). Sub-task C reported packaged .js = 93 (≤ 100).",
}

/**
 * Maximum packaged file count. Baseline 1278 → 1300 permits ~22 added files of
 * routine drift while still catching a wholesale re-inclusion (a blanket
 * `!dist` regress alone adds hundreds of files: maps + `dist/assets/**`).
 */
export const FILES_BUDGET = 1300

/**
 * Maximum packaged `.js` count. Sub-task C froze this at 93; 100 is the agreed
 * ceiling with ~7 files of headroom.
 */
export const JS_BUDGET = 100

/** Hard zeros: any presence is an immediate FAIL (A/D regressions). */
export const MAP_BUDGET = 0
export const MARKETPLACE_DUPLICATE_BUDGET = 0
export const ESBUILD_WASM_BUDGET = 0

/**
 * Paths that MUST be present in the pack, keyed to a real runtime reader.
 * Keep this list minimal and evidence-backed; see the file header for sources.
 */
export const REQUIRED_EXACT = [
	// Extension entry point + bundled workers (src/esbuild.mjs entryPoints).
	"dist/extension.js",
	"dist/workers/countTokens.js",
	// tiktoken runtime used by the token-counting worker pool.
	"dist/workers/tiktoken_bg.wasm",
	"dist/tiktoken_bg.wasm",
	// Main web-tree-sitter runtime (languageParser loads per-language grammars).
	"dist/tree-sitter.wasm",
	// esbuild-wasm runtime (downloaded engine is paired with these at use time).
	"dist/bin/esbuild",
	"dist/wasm_exec.js",
	"dist/wasm_exec_node.js",
	// Built webview referenced by ClineProvider.getHtmlContent().
	"webview-ui/build/assets/index.js",
	"webview-ui/build/assets/index.css",
	"assets/codicons/codicon.css",
	// Marketplace catalogues read by ConfigLoader / CustomModesManager.
	"assets/marketplace/modes.yml",
	"assets/marketplace/mcps.yml",
	"assets/marketplace/pre-installed-modes.yml",
	// Default theme the webview applyTheme falls back to.
	"integrations/theme/default-themes/dark_plus.json",
	// Extension-host i18n bundle (src/i18n/setup.ts reads dist/i18n/locales).
	"dist/i18n/locales/en/common.json",
	// Manifest + VS Code manifest localizations + distribution docs.
	"package.json",
	"package.nls.json",
	"README.md",
	"CHANGELOG.md",
	"LICENSE",
]

/**
 * Directory/glob requirements that are not a single file: each must match at
 * least `min` packaged entries. Kept as patterns so adding a file to a required
 * directory never breaks the gate, while deleting the directory does.
 */
export const REQUIRED_PATTERNS = [
	{ id: "package-nls-locales", re: /^package\.nls\.[^/]+\.json$/, min: 2 },
	{ id: "material-icons", re: /^assets\/vscode-material-icons\/icons\//, min: 1 },
	{ id: "images", re: /^assets\/images\//, min: 1 },
	{ id: "webview-audio", re: /^webview-ui\/audio\//, min: 1 },
	{ id: "default-themes", re: /^integrations\/theme\/default-themes\//, min: 1 },
	{ id: "i18n-locales", re: /^dist\/i18n\/locales\//, min: 1 },
	{ id: "tree-sitter-main", re: /^dist\/tree-sitter\.wasm$/, min: 1 },
]

/**
 * Paths that MUST NOT be present. Each carries the Sub-task that removed it so
 * a future regression is traceable.
 */
export const FORBIDDEN = [
	{
		id: "source-maps",
		re: /\.map$/,
		why: "Sub-task A: source maps are excluded from the pack (dev-only).",
	},
	{
		id: "dist-assets-marketplace-duplicate",
		re: /^dist\/assets\/marketplace\//,
		why: "Sub-task A: dist/assets/marketplace/** duplicates the runtime-read assets/marketplace/**.",
	},
	{
		id: "esbuild-wasm-engine",
		re: /^dist\/esbuild\.wasm$/,
		why: "Sub-task D: the 13.9 MB engine is download-only (see ADR adr-semble-binary-download-only / esbuild-engine.ts).",
	},
]

/* ------------------------------------------------------------------ *
 * Pure decision logic (unit-testable without vsce or a real VSIX).
 * ------------------------------------------------------------------ */

/**
 * Splits raw `vsce ls` stdout (or a ZIP entry list) into normalized, sorted,
 * de-duplicated relative paths using forward slashes.
 * @param {string|string[]} raw
 * @returns {string[]}
 */
export function normalizeFileList(raw) {
	const lines = Array.isArray(raw) ? raw : String(raw).split(/\r?\n/)
	const seen = new Set()
	for (const line of lines) {
		const p = String(line).trim().replace(/\\/g, "/").replace(/^\.\//, "")
		if (p) seen.add(p)
	}
	return [...seen].sort()
}

/**
 * Evaluates the packaging budgets. PURE: same list in → same verdict out.
 *
 * @param {string[]} files - normalized packaged file paths
 * @param {object} [budgets]
 * @returns {{ok: boolean, stats: object, budgets: object, violations: object[]}}
 */
export function assessVsixBudget(files, budgets = {}) {
	const b = {
		files: budgets.files ?? FILES_BUDGET,
		js: budgets.js ?? JS_BUDGET,
		map: budgets.map ?? MAP_BUDGET,
		marketplace: budgets.marketplace ?? MARKETPLACE_DUPLICATE_BUDGET,
		esbuildWasm: budgets.esbuildWasm ?? ESBUILD_WASM_BUDGET,
	}

	const stats = {
		files: files.length,
		js: files.filter((f) => f.endsWith(".js")).length,
		map: files.filter((f) => f.endsWith(".map")).length,
		marketplace: files.filter((f) => f.startsWith("dist/assets/marketplace/")).length,
		esbuildWasm: files.filter((f) => f === "dist/esbuild.wasm").length,
	}

	const violations = []
	if (stats.files > b.files) {
		violations.push({
			rule: "files-budget",
			message: `packaged file count ${stats.files} exceeds budget ${b.files}`,
		})
	}
	if (stats.js > b.js) {
		violations.push({
			rule: "js-budget",
			message: `packaged .js count ${stats.js} exceeds budget ${b.js}`,
		})
	}
	if (stats.map > b.map) {
		violations.push({
			rule: "source-maps-forbidden",
			message: `${stats.map} source map(s) packaged; budget is ${b.map}`,
		})
	}
	if (stats.marketplace > b.marketplace) {
		violations.push({
			rule: "marketplace-duplicate-forbidden",
			message: `${stats.marketplace} dist/assets/marketplace file(s) packaged; budget is ${b.marketplace}`,
		})
	}
	if (stats.esbuildWasm > b.esbuildWasm) {
		violations.push({
			rule: "esbuild-wasm-forbidden",
			message: `dist/esbuild.wasm packaged; budget is ${b.esbuildWasm}`,
		})
	}

	return { ok: violations.length === 0, stats, budgets: b, violations }
}

/**
 * Evaluates the packaged layout. PURE: same list in → same verdict out.
 *
 * @param {string[]} files - normalized packaged file paths
 * @param {object} [spec]
 * @param {string[]} [spec.requiredExact]
 * @param {object[]} [spec.requiredPatterns]
 * @param {object[]} [spec.forbidden]
 * @param {string[]} [spec.expectedTreeSitterWasms] - bare filenames (e.g. "tree-sitter-c.wasm") asserted as `dist/<name>`
 * @returns {{ok: boolean, missing: object[], presentForbidden: object[]}}
 */
export function evaluateLayout(files, spec = {}) {
	const requiredExact = spec.requiredExact ?? REQUIRED_EXACT
	const requiredPatterns = spec.requiredPatterns ?? REQUIRED_PATTERNS
	const forbidden = spec.forbidden ?? FORBIDDEN
	const expectedTreeSitterWasms = spec.expectedTreeSitterWasms ?? []

	const set = new Set(files)
	const missing = []

	for (const p of requiredExact) {
		if (!set.has(p)) missing.push({ kind: "required-exact", path: p })
	}

	for (const r of requiredPatterns) {
		const matched = files.filter((f) => r.re.test(f)).length
		if (matched < r.min) {
			missing.push({ kind: "required-pattern", id: r.id, min: r.min, matched })
		}
	}

	if (expectedTreeSitterWasms.length === 0) {
		missing.push({
			kind: "tree-sitter-set-undeterminable",
			path: "(expected tree-sitter-*.wasm set could not be derived)",
		})
	}
	for (const name of expectedTreeSitterWasms) {
		const p = `dist/${name}`
		if (!set.has(p)) missing.push({ kind: "required-tree-sitter-wasm", path: p })
	}

	const presentForbidden = []
	for (const f of forbidden) {
		const hits = files.filter((x) => f.re.test(x))
		if (hits.length > 0) {
			presentForbidden.push({
				kind: "forbidden",
				id: f.id,
				count: hits.length,
				sample: hits.slice(0, 5),
				why: f.why,
			})
		}
	}

	return { ok: missing.length === 0 && presentForbidden.length === 0, missing, presentForbidden }
}

/**
 * Derives the tree-sitter grammar set that MUST be packaged, from the build's
 * own source of truth: `packages/build/src/esbuild.ts` copies every `.wasm`
 * from `tree-sitter-wasms/out` into `dist/`. Falls back to whatever the build
 * already placed in `dist/`, and returns `[]` (which the layout check treats as
 * a hard failure) only when neither is present.
 * @returns {string[]} bare filenames, sorted
 */
export function deriveExpectedTreeSitterWasms() {
	const outDir = path.join(SRC_DIR, "node_modules", "tree-sitter-wasms", "out")
	if (existsSync(outDir)) {
		const names = readdirSync(outDir).filter((f) => f.endsWith(".wasm"))
		if (names.length > 0) return names.sort()
	}

	const distDir = path.join(SRC_DIR, "dist")
	if (existsSync(distDir)) {
		const names = readdirSync(distDir).filter((f) => /^tree-sitter-.*\.wasm$/.test(f))
		if (names.length > 0) return names.sort()
	}

	return []
}

/* ------------------------------------------------------------------ *
 * File-list capture (default: vsce ls; optional: existing .vsix)
 * ------------------------------------------------------------------ */

/**
 * Resolves the workspace-local `vsce` binary so the default gate never touches
 * the network (no implicit `npx` download).
 * @returns {string} absolute path to the vsce executable
 */
export function resolveVsceBin() {
	const bin = process.platform === "win32" ? "vsce.cmd" : "vsce"
	const candidates = [path.join(SRC_DIR, "node_modules", ".bin", bin), path.join(ROOT, "node_modules", ".bin", bin)]
	for (const c of candidates) {
		if (existsSync(c)) return c
	}
	throw new Error(`vsce binary not found; looked in: ${candidates.join(", ")}`)
}

/**
 * Runs `vsce ls --no-dependencies` from `src/` and returns the normalized file
 * list. Throws on a non-zero exit so the caller can report a tool error.
 * @param {{srcDir?: string}} [opts]
 * @returns {Promise<string[]>}
 */
export function capturePackagedFiles(opts = {}) {
	const cwd = opts.srcDir ?? SRC_DIR
	const bin = resolveVsceBin()

	return new Promise((resolve, reject) => {
		const child = spawn(bin, ["ls", "--no-dependencies"], { cwd, stdio: ["ignore", "pipe", "pipe"] })
		let stdout = ""
		let stderr = ""
		child.stdout.on("data", (d) => (stdout += d))
		child.stderr.on("data", (d) => (stderr += d))
		child.on("error", (err) => reject(new Error(`failed to run "${bin} ls": ${err.message}`)))
		child.on("close", (code) => {
			if (code !== 0) {
				reject(new Error(`"${bin} ls --no-dependencies" exited ${code}: ${stderr.trim()}`))
				return
			}
			resolve(normalizeFileList(stdout))
		})
	})
}

/* ------------------------------------------------------------------ *
 * Optional --vsix mode: pure ZIP central-directory reader (offline)
 * ------------------------------------------------------------------ */

const ZIP_EOCD_SIG = 0x06054b50
const ZIP_CD_SIG = 0x02014b50

/**
 * Extracts entry names from a ZIP archive held in memory by walking its central
 * directory (EOCD → CD entries). Zip64 is not supported (a VSIX is well under
 * 4 GiB and the leanness work keeps it far smaller); we fail loudly instead of
 * mis-reading. PURE — exported for the spec.
 * @param {Buffer} buffer
 * @returns {string[]}
 */
export function readZipEntryNames(buffer) {
	// EOCD is at the end, optionally followed by a comment (max 65535 bytes).
	const minEocd = 22
	const maxComment = 0xffff
	const scanStart = Math.max(0, buffer.length - minEocd - maxComment)
	let eocd = -1
	for (let i = buffer.length - minEocd; i >= scanStart; i--) {
		if (buffer.readUInt32LE(i) === ZIP_EOCD_SIG) {
			eocd = i
			break
		}
	}
	if (eocd === -1) throw new Error("not a ZIP archive: no end-of-central-directory record")

	const totalEntries = buffer.readUInt16LE(eocd + 10)
	const cdSize = buffer.readUInt32LE(eocd + 12)
	const cdOffset = buffer.readUInt32LE(eocd + 16)

	if (totalEntries === 0xffff || cdSize === 0xffffffff || cdOffset === 0xffffffff) {
		throw new Error("ZIP64 archives are not supported by this reader")
	}

	const names = []
	let off = cdOffset
	for (let i = 0; i < totalEntries; i++) {
		if (off + 46 > buffer.length || buffer.readUInt32LE(off) !== ZIP_CD_SIG) {
			throw new Error(`corrupt ZIP central directory at entry ${i}`)
		}
		const nameLen = buffer.readUInt16LE(off + 28)
		const extraLen = buffer.readUInt16LE(off + 30)
		const commentLen = buffer.readUInt16LE(off + 32)
		const nameStart = off + 46
		names.push(buffer.toString("utf8", nameStart, nameStart + nameLen))
		off = nameStart + nameLen + extraLen + commentLen
	}
	return names
}

/** The single root folder a `vsce`-produced VSIX wraps every file in. */
export const VSIX_ROOT_PREFIX = "extension/"

/**
 * Rewrites VSIX entry names (all under `extension/`) to package-relative paths
 * so they match the `vsce ls` shape. Pure; exported for the spec.
 * @param {string[]} names
 * @returns {string[]}
 */
export function stripVsixRootPrefix(names) {
	return names.map((n) =>
		n === VSIX_ROOT_PREFIX.slice(0, -1) ? "" : n.replace(new RegExp(`^${VSIX_ROOT_PREFIX}`), ""),
	)
}

/**
 * Reads a built `.vsix` and returns its package-relative entry names (files and
 * directories), with the leading `extension/` folder removed.
 * @param {string} vsixPath
 * @returns {string[]}
 */
export function listVsixEntries(vsixPath) {
	const buf = readFileSync(vsixPath)
	return normalizeFileList(stripVsixRootPrefix(readZipEntryNames(buf)))
}

/* ------------------------------------------------------------------ *
 * Reporting
 * ------------------------------------------------------------------ */

/** Renders the human-readable verdict body (pure, for reuse in tests/CLI). */
export function formatVerdict(budget, layout) {
	const lines = []
	lines.push(
		`budgets: files ≤ ${budget.budgets.files} (measured ${budget.stats.files}), ` +
			`.js ≤ ${budget.budgets.js} (measured ${budget.stats.js}), ` +
			`maps = ${budget.budgets.map} (measured ${budget.stats.map}), ` +
			`dist/assets/marketplace = ${budget.budgets.marketplace} (measured ${budget.stats.marketplace}), ` +
			`dist/esbuild.wasm = ${budget.budgets.esbuildWasm} (measured ${budget.stats.esbuildWasm})`,
	)
	if (layout.missing.length) {
		lines.push(`missing required paths (${layout.missing.length}):`)
		for (const m of layout.missing) {
			if (m.kind === "required-exact") lines.push(`  - MISSING ${m.path}`)
			else if (m.kind === "required-pattern")
				lines.push(`  - MISSING ${m.id} (matched ${m.matched}, need ≥ ${m.min})`)
			else if (m.kind === "required-tree-sitter-wasm") lines.push(`  - MISSING ${m.path}`)
			else lines.push(`  - ${m.path}`)
		}
	}
	if (layout.presentForbidden.length) {
		lines.push(`forbidden paths present (${layout.presentForbidden.length}):`)
		for (const f of layout.presentForbidden) {
			lines.push(`  - ${f.id}: ${f.count} entr${f.count === 1 ? "y" : "ies"} e.g. ${f.sample.join(", ")}`)
			lines.push(`      ${f.why}`)
		}
	}
	if (budget.violations.length) {
		lines.push(`budget violations (${budget.violations.length}):`)
		for (const v of budget.violations) lines.push(`  - ${v.rule}: ${v.message}`)
	}
	return lines.join("\n")
}

/* ------------------------------------------------------------------ *
 * CLI
 * ------------------------------------------------------------------ */

const HELP = `verify-vsix-budget.mjs — packaged VSIX footprint gate (Issue #13)

Usage:
  node scripts/verify-vsix-budget.mjs [options]

Default (fast, offline): enumerates the pack with
"vsce ls --no-dependencies" run from src/ against the existing build output,
then checks the file-count/.js budgets and the runtime-critical layout.

Options:
  --vsix <path>          Read the file list from a built .vsix instead of vsce
                         (pure ZIP central-directory parse; not the default path).
  --files-budget <n>     Override the files budget (debug/negative-check helper).
  --js-budget <n>        Override the .js budget (debug/negative-check helper).
  --json                 Emit a machine-readable JSON verdict.
  --help                 Show this help.

Exit codes:
  0 PASS · 1 FAIL (budget/layout) · 2 usage error · 3 file list unavailable
`

function parseArgs(argv) {
	const args = { vsix: null, filesBudget: null, jsBudget: null, json: false, help: false }
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i]
		switch (a) {
			case "--vsix":
				args.vsix = argv[++i] ?? null
				break
			case "--files-budget":
				args.filesBudget = Number(argv[++i])
				break
			case "--js-budget":
				args.jsBudget = Number(argv[++i])
				break
			case "--json":
				args.json = true
				break
			case "--help":
			case "-h":
				args.help = true
				break
			default:
				return { error: `unknown option: ${a}` }
		}
	}
	if (args.filesBudget !== null && !Number.isInteger(args.filesBudget))
		return { error: "--files-budget requires an integer" }
	if (args.jsBudget !== null && !Number.isInteger(args.jsBudget)) return { error: "--js-budget requires an integer" }
	return args
}

export async function main(argv = process.argv.slice(2)) {
	const args = parseArgs(argv)
	if (args.error) {
		process.stderr.write(`Error: ${args.error}\n\n${HELP}`)
		return EXIT.USAGE
	}
	if (args.help) {
		process.stdout.write(HELP)
		return EXIT.PASS
	}

	logStep(TAG, args.vsix ? `reading file list from ${args.vsix}` : "enumerating pack via vsce ls --no-dependencies")

	let files
	try {
		files = args.vsix ? listVsixEntries(path.resolve(args.vsix)) : await capturePackagedFiles()
	} catch (err) {
		logError(TAG, `could not produce the packaged file list: ${err.message}`)
		return EXIT.LIST_ERROR
	}

	const expectedTreeSitterWasms = deriveExpectedTreeSitterWasms()
	if (expectedTreeSitterWasms.length === 0) {
		logWarn(
			TAG,
			"could not derive the expected tree-sitter-*.wasm set (no tree-sitter-wasms/out or src/dist); layout check will fail closed",
		)
	}

	const budgets = {}
	if (args.filesBudget !== null) budgets.files = args.filesBudget
	if (args.jsBudget !== null) budgets.js = args.jsBudget

	const budget = assessVsixBudget(files, budgets)
	const layout = evaluateLayout(files, { expectedTreeSitterWasms })
	const ok = budget.ok && layout.ok

	logInfo(TAG, formatVerdict(budget, layout))
	logInfo(TAG, `expected tree-sitter grammars: ${expectedTreeSitterWasms.length}`)

	if (args.json) {
		process.stdout.write(
			"\n" +
				JSON.stringify(
					{
						source: args.vsix ? path.resolve(args.vsix) : "vsce ls --no-dependencies (src/)",
						ok,
						budget: {
							ok: budget.ok,
							stats: budget.stats,
							budgets: budget.budgets,
							violations: budget.violations,
						},
						layout: {
							ok: layout.ok,
							missing: layout.missing,
							presentForbidden: layout.presentForbidden.map((f) => ({ ...f, sample: f.sample })),
						},
						expectedTreeSitterWasms,
						baseline: BUDGET_BASELINE,
					},
					null,
					2,
				) +
				"\n",
		)
	}

	if (ok) {
		logOk(TAG, `PASS — packaged footprint within budget (${budget.stats.files} files, ${budget.stats.js} .js)`)
		return EXIT.PASS
	}

	logError(TAG, `FAIL — packaged footprint regressed (${budget.stats.files} files, ${budget.stats.js} .js)`)
	return EXIT.FAIL
}

// Run only when executed directly (not when imported by the spec file).
const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
if (isDirectRun) {
	main()
		.then((code) => {
			process.exitCode = code
		})
		.catch((err) => {
			process.stderr.write(`Error: ${err.message}\n`)
			process.exitCode = EXIT.LIST_ERROR
		})
}
