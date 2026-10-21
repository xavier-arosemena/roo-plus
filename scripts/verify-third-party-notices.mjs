#!/usr/bin/env node

/**
 * verify-third-party-notices.mjs — attribution gate for the packaged artefact.
 *
 * `THIRD-PARTY-NOTICES.md` is the file that answers "what is in this VSIX and
 * under which licence". It drifts in two ways: a new production dependency is
 * added and never listed, or a binary starts shipping (or changes) without the
 * notices file following it. This gate fails on both, and it is deliberately
 * **dependency-free and network-free**: it reads the dependency tree that
 * `pnpm` already resolved on disk, the `.vscodeignore` that decides what is
 * packaged, and the archives that are committed for bundling.
 *
 * Checks (all fail-closed):
 *
 *   0. FLOOR — the resolved production dependency tree must be plausible
 *      (non-zero and at least MIN_EXPECTED_DEPENDENCIES rows). Without it an
 *      empty tree (a pnpm major change, a renamed filter, a differently shaped
 *      payload) yields "0 expected → 0 missing" and the gate passes vacuously
 *      against a notices file with an empty §3.
 *   1. DEPENDENCIES — every production package in `src/`'s dependency tree
 *      (`pnpm --filter ./src licenses list --prod --json`) appears as a
 *      `| \`name\` | \`version\` |` row inside the generated section, and every
 *      row in that section still exists in the tree (stale rows fail too, so a
 *      removed dependency cannot linger silently).
 *   2. COMPONENTS — every shipped-binary include in `src/.vscodeignore`
 *      (DCG archives, esbuild shims, tree-sitter grammars, tiktoken) has a
 *      corresponding section heading in the notices file.
 *   3. PINS — the DCG archives committed for bundling hash to the SHA-256 values
 *      pinned in `src/services/destructive-command-guard/constants.ts`, and the
 *      pinned `DCG_VERSION` appears in the notices file. `binarySha256` cannot
 *      be re-derived here without extracting, so its presence is asserted.
 *   4. SHIP — `src/THIRD-PARTY-NOTICES.md` is a byte-identical copy of the root
 *      file (the VSIX can only include files under `src/`).
 *
 * Usage (from the repo root):
 *   node scripts/verify-third-party-notices.mjs            # gate
 *   node scripts/verify-third-party-notices.mjs --write    # regenerate §3 in place
 *   node scripts/verify-third-party-notices.mjs --json     # machine-readable verdict
 *   node scripts/verify-third-party-notices.mjs --help
 *
 * Exit codes:
 *   0  PASS
 *   1  FAIL — a dependency or shipped component is missing, a pin drifted, or the
 *             packaged copy is out of sync.
 *   2  USAGE error.
 *   3  FAIL — the dependency tree could not be read (pnpm missing / unreadable).
 */

import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

import { logError, logInfo, logOk, logStep, logWarn } from "./lib/logger.mjs"

/** Hierarchical tag identifying this process (same scheme as the sibling gates). */
export const TAG = "VERIFY:THIRD-PARTY-NOTICES"

/** Repository root (the workspace root, one level above scripts/). */
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

export const NOTICES_PATH = path.join(ROOT, "THIRD-PARTY-NOTICES.md")
export const PACKAGED_NOTICES_PATH = path.join(ROOT, "src", "THIRD-PARTY-NOTICES.md")
export const VSCODEIGNORE_PATH = path.join(ROOT, "src", ".vscodeignore")
export const DCG_CONSTANTS_PATH = path.join(ROOT, "src", "services", "destructive-command-guard", "constants.ts")
export const DCG_BUNDLE_DIR = path.join(ROOT, "src", "bin", "dcg")

export const EXIT = {
	PASS: 0,
	FAIL: 1,
	USAGE: 2,
	TOOL_ERROR: 3,
}

export const BEGIN_MARKER = "<!-- BEGIN GENERATED: js-dependencies -->"
export const END_MARKER = "<!-- END GENERATED: js-dependencies -->"

/**
 * Floor for the resolved production dependency tree.
 *
 * Measured 425 package versions on 2026-10-21. The floor exists to catch a
 * STRUCTURAL failure of the query (empty object, renamed filter, changed payload
 * shape), not ordinary dependency churn: it is deliberately far below the real
 * count so removing a package never trips it, while an empty or near-empty tree
 * cannot pass (review finding M6).
 */
export const MIN_EXPECTED_DEPENDENCIES = 300

/**
 * Shipped-binary components the notices file MUST describe. Each entry pairs the
 * `.vscodeignore` negate that puts the bytes in the VSIX with the section
 * heading the notices file uses, so adding a new negate without documentation
 * (or renaming a heading) fails the gate.
 */
export const SHIPPED_BINARY_COMPONENTS = [
	{ id: "dcg", negate: "!bin/dcg/**", heading: "DCG (`destructive_command_guard`)" },
	{ id: "esbuild-wasm", negate: "!dist/bin/**", heading: "esbuild (WASM shims)" },
	{ id: "tree-sitter", negate: "!dist/tree-sitter*.wasm", heading: "tree-sitter runtimes" },
	{ id: "tiktoken", negate: "!dist/tiktoken_bg.wasm", heading: "tiktoken" },
]

/* ------------------------------------------------------------------ *
 * Pure decision logic (unit-testable without pnpm or a built tree).
 * ------------------------------------------------------------------ */

/**
 * Extracts the generated dependency section delimited by the BEGIN/END markers.
 * @param {string} noticesText
 * @returns {string|undefined} section body, or undefined when the markers are absent/ambiguous
 */
export function generatedSection(noticesText) {
	const begin = noticesText.indexOf(BEGIN_MARKER)
	const end = noticesText.indexOf(END_MARKER)
	if (begin === -1 || end === -1 || end < begin) return undefined
	return noticesText.slice(begin + BEGIN_MARKER.length, end)
}

/**
 * Parses `| \`name\` | \`version\` |` rows from the generated section only, so
 * the pinned binary tables in §1 cannot accidentally satisfy the dependency check.
 * @param {string} noticesText
 * @returns {{name: string, version: string}[]}
 */
export function parseJsDependencyRows(noticesText) {
	const section = generatedSection(noticesText)
	if (!section) return []
	const rows = []
	const rowPattern = /^\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|\s*$/gm
	let match
	while ((match = rowPattern.exec(section)) !== null) {
		rows.push({ name: match[1], version: match[2] })
	}
	return rows
}

/**
 * Normalizes `pnpm licenses list --json` output to `{name, version, license}`
 * entries (one per package version).
 * @param {object} licensesJson
 * @returns {{name: string, version: string, license: string}[]}
 */
export function deriveExpectedDependencies(licensesJson) {
	const expected = []
	for (const [license, packages] of Object.entries(licensesJson || {})) {
		if (!Array.isArray(packages)) continue
		for (const pkg of packages) {
			const versions = Array.isArray(pkg?.versions) ? pkg.versions : []
			for (const version of versions) {
				expected.push({ name: String(pkg.name), version: String(version), license })
			}
		}
	}
	return expected.sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version))
}

/**
 * Compares the expected dependency set against the rows in the notices file.
 * @param {{name: string, version: string}[]} expected
 * @param {{name: string, version: string}[]} actual
 * @returns {{missing: {name: string, version: string}[], extra: {name: string, version: string}[]}}
 */
export function compareDependencies(expected, actual) {
	const key = (d) => `${d.name}@${d.version}`
	const actualKeys = new Set(actual.map(key))
	const expectedKeys = new Set(expected.map(key))
	return {
		missing: expected.filter((d) => !actualKeys.has(key(d))),
		extra: actual.filter((d) => !expectedKeys.has(key(d))),
	}
}

/**
 * Reports an implausible (empty or near-empty) resolved dependency tree.
 *
 * `compareDependencies([], rows)` reports no `missing` rows, so without this the
 * gate passes vacuously when the dependency query stops returning data.
 *
 * @param {{name: string, version: string}[]} dependencies
 * @returns {string[]} problems; empty when the tree is plausible
 */
export function dependencyFloorProblems(dependencies) {
	const count = Array.isArray(dependencies) ? dependencies.length : 0
	if (count === 0) {
		return [
			"the src/ production dependency tree resolved to 0 packages — refusing to pass, because an empty tree makes every dependency trivially 'documented' (the pnpm query, the --filter or the JSON payload shape has changed)",
		]
	}
	if (count < MIN_EXPECTED_DEPENDENCIES) {
		return [
			`the src/ production dependency tree resolved to only ${count} package versions, below the documented floor of ${MIN_EXPECTED_DEPENDENCIES} — refusing to pass on an implausibly small tree (false negatives are worse than a false alarm here)`,
		]
	}
	return []
}

/**
 * Which shipped-binary components `src/.vscodeignore` says are packaged.
 * @param {string} vscodeignoreText
 * @returns {object[]} the matching SHIPPED_BINARY_COMPONENTS entries
 */
export function expectedShippedComponents(vscodeignoreText) {
	const negates = new Set(
		vscodeignoreText
			.split(/\r?\n/)
			.map((line) => line.trim())
			.filter((line) => line.startsWith("!")),
	)
	return SHIPPED_BINARY_COMPONENTS.filter((component) => negates.has(component.negate))
}

/** Escapes a literal string for use inside a RegExp. */
function escapeRegExp(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Reports shipped components that have no section heading in the notices file.
 * Headings may carry a numeric prefix (`### 1.2 esbuild (WASM shims)`), so the
 * match allows `### [n[.n…] ]<heading>`.
 * @param {string} noticesText
 * @param {object[]} components
 * @returns {object[]} the undocumented components
 */
export function missingComponentSections(noticesText, components) {
	return components.filter((component) => {
		const heading = new RegExp(`^###\\s+(?:\\d+(?:\\.\\d+)*\\s+)?${escapeRegExp(component.heading)}`, "m")
		return !heading.test(noticesText)
	})
}

/**
 * Parses the DCG pin block out of `constants.ts` (regex by design: the gate must
 * not import TypeScript).
 *
 * `binary` (the executable name inside the archive: `dcg`, or `dcg.exe` on
 * Windows) is captured as well because the bundled-binary gate has to extract the
 * archive and hash exactly that file.
 *
 * @param {string} constantsSource
 * @returns {{version: string|undefined, archives: {key: string, archive: string, binary: string, sha256: string, binarySha256: string}[]}}
 */
export function parseDcgPins(constantsSource) {
	const version = constantsSource.match(/export const DCG_VERSION\s*=\s*"([^"]+)"/)?.[1]
	const archives = []
	// Bounded `[\s\S]{0,400}?` gaps keep each match inside its own entry without
	// depending on the exact field order (archive / binary / sha256 / binarySha256).
	const entryPattern =
		/"([a-z0-9]+-[a-z0-9]+)"\s*:\s*\{[\s\S]{0,400}?archive:\s*"([^"]+)"[\s\S]{0,400}?binary:\s*"([^"]+)"[\s\S]{0,400}?sha256:\s*"([0-9a-f]{64})",\s*binarySha256:\s*"([0-9a-f]{64})"/g
	let match
	while ((match = entryPattern.exec(constantsSource)) !== null) {
		archives.push({
			key: match[1],
			archive: match[2],
			binary: match[3],
			sha256: match[4],
			binarySha256: match[5],
		})
	}
	return { version, archives }
}

/**
 * Hashes every bundled DCG archive and compares it to the pinned value.
 * @param {object[]} pins - `parseDcgPins().archives`
 * @param {string} bundleDir - directory holding the bundled archives
 * @param {(file: string) => string} hashFn - sha256 helper (injected for tests)
 * @returns {{missing: string[], mismatched: {archive: string, expected: string, actual: string}[]}}
 */
export function verifyDcgArchivePins(pins, bundleDir, hashFn) {
	const missing = []
	const mismatched = []
	for (const pin of pins) {
		const file = path.join(bundleDir, pin.archive)
		if (!existsSync(file)) {
			missing.push(pin.archive)
			continue
		}
		const actual = hashFn(file)
		if (actual !== pin.sha256) mismatched.push({ archive: pin.archive, expected: pin.sha256, actual })
	}
	return { missing, mismatched }
}

/**
 * Renders the generated Markdown table for the given dependency set.
 * @param {{name: string, version: string, license: string}[]} dependencies
 * @returns {string}
 */
export function formatDependencyTable(dependencies) {
	const groups = new Map()
	for (const dep of dependencies) {
		if (!groups.has(dep.license)) groups.set(dep.license, [])
		groups.get(dep.license).push(dep)
	}
	const lines = []
	for (const license of [...groups.keys()].sort((a, b) => a.localeCompare(b))) {
		const group = groups
			.get(license)
			.sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version))
		lines.push("", `### ${license} (${group.length} packages)`, "", "| Package | Version |", "| --- | --- |")
		for (const dep of group) lines.push(`| \`${dep.name}\` | \`${dep.version}\` |`)
	}
	lines.push("")
	return lines.join("\n")
}

/**
 * Replaces the generated section body, preserving the markers.
 * @param {string} noticesText
 * @param {string} table
 * @returns {string}
 */
export function replaceGeneratedSection(noticesText, table) {
	const begin = noticesText.indexOf(BEGIN_MARKER)
	const end = noticesText.indexOf(END_MARKER)
	if (begin === -1 || end === -1 || end < begin) {
		throw new Error("notices file has no generated-section markers")
	}
	return (
		noticesText.slice(0, begin + BEGIN_MARKER.length) + "\n" + table + "\n" + noticesText.slice(end)
	)
}

/* ------------------------------------------------------------------ *
 * Environment readers
 * ------------------------------------------------------------------ */

/** Reading the production dependency tree from pnpm's local resolution. */
export function readDependencyTree() {
	const stdout = execFileSync("pnpm", ["--filter", "./src", "licenses", "list", "--prod", "--json"], {
		cwd: ROOT,
		encoding: "utf8",
		maxBuffer: 64 * 1024 * 1024,
		stdio: ["ignore", "pipe", "pipe"],
	})
	return deriveExpectedDependencies(JSON.parse(stdout))
}

export function sha256File(file) {
	return createHash("sha256").update(readFileSync(file)).digest("hex")
}

/* ------------------------------------------------------------------ *
 * CLI
 * ------------------------------------------------------------------ */

const HELP = `verify-third-party-notices.mjs — attribution gate for the packaged VSIX

Usage:
  node scripts/verify-third-party-notices.mjs [options]

Checks that every production dependency of src/ and every bundled binary
component is described in THIRD-PARTY-NOTICES.md, that the DCG archives match
their pinned SHA-256 values, and that the packaged copy under src/ is identical.

Options:
  --write   Regenerate the generated dependency table in THIRD-PARTY-NOTICES.md
  --json    Emit a machine-readable verdict
  --help    Show this help

Exit codes:
  0 PASS · 1 FAIL (drift) · 2 usage error · 3 dependency tree unreadable
`

function parseArgs(argv) {
	const args = { write: false, json: false, help: false }
	for (const a of argv) {
		if (a === "--write") args.write = true
		else if (a === "--json") args.json = true
		else if (a === "--help" || a === "-h") args.help = true
		else return { error: `unknown option: ${a}` }
	}
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

	let dependencies
	try {
		dependencies = readDependencyTree()
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		process.stderr.write(`Error: could not read the src/ production dependency tree: ${message}\n`)
		return EXIT.TOOL_ERROR
	}

	logStep(TAG, `production dependency tree: ${dependencies.length} package versions`)

	// 0. Floor. Applies to --write too: regenerating from a broken query would
	// wipe the real table.
	const floorProblems = dependencyFloorProblems(dependencies)
	if (floorProblems.length > 0) {
		for (const problem of floorProblems) logError(TAG, problem)
		return EXIT.FAIL
	}

	if (args.write) {
		const table = formatDependencyTable(dependencies)
		const updated = replaceGeneratedSection(readFileSync(NOTICES_PATH, "utf8"), table)
		writeFileSync(NOTICES_PATH, updated)
		writeFileSync(PACKAGED_NOTICES_PATH, updated)
		logOk(TAG, `regenerated ${path.relative(ROOT, NOTICES_PATH)} (${dependencies.length} rows) and its src/ copy`)
		return EXIT.PASS
	}

	const failures = []

	const noticesText = readFileSync(NOTICES_PATH, "utf8")
	if (!generatedSection(noticesText)) {
		failures.push({ rule: "markers", message: `notices file is missing ${BEGIN_MARKER} / ${END_MARKER}` })
	}

	// 1. Dependencies (both directions: nothing missing, nothing stale).
	const { missing: missingDeps, extra: extraDeps } = compareDependencies(
		dependencies,
		parseJsDependencyRows(noticesText),
	)
	for (const dep of missingDeps) {
		failures.push({
			rule: "dependency",
			message: `${dep.name}@${dep.version} is a production dependency but is not listed in THIRD-PARTY-NOTICES.md`,
		})
	}
	for (const dep of extraDeps) {
		failures.push({
			rule: "dependency",
			message: `${dep.name}@${dep.version} is listed in THIRD-PARTY-NOTICES.md but no longer resolves in the src/ production tree — stale row (regenerate with --write)`,
		})
	}

	// 2. Shipped binary components.
	const shipped = expectedShippedComponents(readFileSync(VSCODEIGNORE_PATH, "utf8"))
	for (const component of missingComponentSections(noticesText, shipped)) {
		failures.push({
			rule: "component",
			message: `shipped binary component "${component.id}" (${component.negate}) has no "### ${component.heading}" section`,
		})
	}

	// 3. DCG pins.
	const pins = parseDcgPins(readFileSync(DCG_CONSTANTS_PATH, "utf8"))
	if (!pins.version) {
		failures.push({ rule: "pins", message: "could not read DCG_VERSION from constants.ts" })
	} else if (!noticesText.includes(pins.version)) {
		failures.push({ rule: "pins", message: `DCG version ${pins.version} is not mentioned in THIRD-PARTY-NOTICES.md` })
	}
	if (pins.archives.length === 0) {
		failures.push({ rule: "pins", message: "could not read DCG archive pins from constants.ts" })
	}
	const pinCheck = verifyDcgArchivePins(pins.archives, DCG_BUNDLE_DIR, sha256File)
	for (const archive of pinCheck.missing) {
		failures.push({ rule: "pins", message: `bundled DCG archive is missing: src/bin/dcg/${archive}` })
	}
	for (const mismatch of pinCheck.mismatched) {
		failures.push({
			rule: "pins",
			message: `bundled DCG archive ${mismatch.archive} hashes to ${mismatch.actual}, pinned ${mismatch.expected}`,
		})
	}
	const bundledArchives = existsSync(DCG_BUNDLE_DIR)
		? readdirSync(DCG_BUNDLE_DIR).filter((f) => /\.(?:tar\.xz|zip)$/.test(f))
		: []
	if (bundledArchives.length !== pins.archives.length) {
		failures.push({
			rule: "pins",
			message: `src/bin/dcg holds ${bundledArchives.length} archive(s) but constants.ts pins ${pins.archives.length}`,
		})
	}

	// 4. Packaged copy.
	if (!existsSync(PACKAGED_NOTICES_PATH)) {
		failures.push({ rule: "ship", message: "src/THIRD-PARTY-NOTICES.md is missing (the VSIX would ship without notices)" })
	} else if (readFileSync(PACKAGED_NOTICES_PATH, "utf8") !== noticesText) {
		failures.push({ rule: "ship", message: "src/THIRD-PARTY-NOTICES.md differs from the root copy" })
	}
	const vscodeignoreNegates = readFileSync(VSCODEIGNORE_PATH, "utf8")
		.split(/\r?\n/)
		.map((line) => line.trim())
	if (!vscodeignoreNegates.includes("!THIRD-PARTY-NOTICES.md")) {
		failures.push({
			rule: "ship",
			message: "src/.vscodeignore does not include !THIRD-PARTY-NOTICES.md (the notices file would be excluded from the VSIX)",
		})
	}

	const verdict = {
		ok: failures.length === 0,
		dependencies: dependencies.length,
		shippedComponents: shipped.map((c) => c.id),
		dcgArchives: pins.archives.length,
		failures,
	}

	if (args.json) {
		process.stdout.write(JSON.stringify(verdict, null, 2) + "\n")
	} else if (verdict.ok) {
		logOk(
			TAG,
			`notices complete: ${verdict.dependencies} dependencies, ${verdict.shippedComponents.length} shipped components, ${verdict.dcgArchives} DCG archives`,
		)
	} else {
		logError(TAG, `${failures.length} attribution problem(s)`)
		for (const failure of failures) logWarn(TAG, `[${failure.rule}] ${failure.message}`)
		logInfo(TAG, "regenerate the dependency table with: node scripts/verify-third-party-notices.mjs --write")
	}

	return verdict.ok ? EXIT.PASS : EXIT.FAIL
}

// Run only when executed directly (not when imported by the spec file).
const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
if (isDirectRun) {
	main()
		.then((code) => {
			process.exitCode = code
		})
		.catch((error) => {
			process.stderr.write(`Error: ${error.message}\n`)
			process.exitCode = EXIT.TOOL_ERROR
		})
}
