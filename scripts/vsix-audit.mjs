#!/usr/bin/env node
/**
 * vsix-audit.mjs
 *
 * Optional on-demand VSIX security audit (DEBT #23).
 *
 * Runs Trail of Bits' `@trailofbits/vsix-audit` against a built `.vsix` (with
 * YARA-X when available), reports structured findings, applies a documented
 * triage policy against the by-design register in
 * `scripts/vsix-audit-register.json`, and FAILS CLOSED on:
 *
 *   1. real findings — any finding NOT explicitly listed in the register as
 *      by-design, or whose severity / per-file count ESCALATES beyond the
 *      recorded baseline;
 *   2. degraded coverage — YARA-X unavailable or the scanner reports coverage
 *      degradation — when running in a publish context (`--publish`).
 *
 * It originated from the one-off, degraded-coverage scan of Marketplace notice
 * #305 and was briefly automated per release, then (2026-09-08) intentionally
 * REMOVED from every automated / publish path by design decision — the tool is
 * retained for deliberate, on-demand security passes (see SECURITY.md and DEBT
 * #23). It still FAILS CLOSED on degraded coverage when invoked with
 * `--publish`, so a silent degraded scan is never mistaken for a full audit.
 *
 * Usage (repo root):
 *   node scripts/vsix-audit.mjs <path-to.vsix> [--publish] [--register <path>]
 *       [--tool <cmd>] [--json] [--allow-degraded] [--help]
 *
 * Examples:
 *   node scripts/vsix-audit.mjs bin/roo-plus-3.87.3.vsix            # local
 *   node scripts/vsix-audit.mjs bin/roo-plus-3.87.3.vsix --publish  # treat as a publish gate
 *
 * Exit codes:
 *   0  PASS  — full coverage; every finding matches a by-design register entry.
 *   1  FAIL  — real finding(s): unregistered, or severity/count escalation.
 *   2  FAIL  — degraded coverage in a publish context, or the audit tool could
 *              not run / its output could not be parsed.
 *   3  FAIL  — usage error (bad arguments / missing file).
 *
 * The register and its policy are documented in SECURITY.md ("Optional on-demand
 * VSIX audit") and DEBT #23.
 */

import { spawn } from "node:child_process"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

// Default pinned audit tool. Deterministic across runs; no secrets required.
export const DEFAULT_TOOL = "npx"
export const DEFAULT_TOOL_VERSION = "@trailofbits/vsix-audit@0.3.0"
export const PINNED_YARA_X = "v1.20.0"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_REGISTER = path.join(__dirname, "vsix-audit-register.json")

export const SEVERITY_RANK = { low: 0, medium: 1, high: 2, critical: 3 }

const EXIT = {
	PASS: 0,
	REAL_FINDINGS: 1,
	DEGRADED_OR_TOOL_ERROR: 2,
	USAGE: 3,
}

/* ------------------------------------------------------------------ *
 * Pure triage / policy logic (unit-testable without the real tool).
 * ------------------------------------------------------------------ */

/**
 * Parses and normalizes the JSON result emitted by `vsix-audit scan -o json`.
 * Accepts the raw parsed object (or a JSON string) and returns a normalized
 * shape: { extension, coverage: { degraded, unavailableModules, warnings },
 * findings: [...] }.
 * @param {object|string} raw
 * @returns {object}
 */
export function parseScan(raw) {
	const scan = typeof raw === "string" ? JSON.parse(raw) : raw
	if (!scan || typeof scan !== "object") {
		throw new Error("vsix-audit output is not an object")
	}
	if (!Array.isArray(scan.findings)) {
		throw new Error("vsix-audit output has no findings array")
	}
	const coverage = (scan.metadata && scan.metadata.coverage) || {}
	return {
		extension: scan.extension || null,
		coverage: {
			degraded: coverage.degraded === true,
			unavailableModules: Array.isArray(coverage.unavailableModules)
				? coverage.unavailableModules
				: [],
			warnings: Array.isArray(coverage.warnings) ? coverage.warnings : [],
		},
		findings: scan.findings,
	}
}

/**
 * True when YARA-X coverage is unavailable: the scanner itself reports the yara
 * module missing (unavailableModules / degraded), or a YARA_NOT_INSTALLED
 * finding was emitted.
 * @param {object} scan - normalized scan (see parseScan) OR the raw tool output
 * @returns {boolean}
 */
export function yaraUnavailable(scan) {
	const coverage = scan.coverage ?? scan.metadata?.coverage ?? {}
	const unavailableModules = Array.isArray(coverage.unavailableModules) ? coverage.unavailableModules : []
	if (unavailableModules.includes("yara")) return true
	const findings = Array.isArray(scan.findings) ? scan.findings : []
	return findings.some((f) => f.id === "YARA_NOT_INSTALLED")
}

/**
 * Classifies findings against the by-design register.
 *
 * A finding is "by-design" (safe) when a register entry exists whose `rule`
 * matches the finding id AND whose `file` matches the finding location AND the
 * finding severity does not rank above the entry's recorded severity. Per-file
 * counts are then checked: if the number of findings for a registered
 * (rule, file) exceeds the recorded count, the excess is reported as an
 * escalation (a benign file gaining extra hits needs re-triage).
 *
 * @param {object[]} findings - raw findings from the scan
 * @param {object} register - parsed register ({ entries: [...] })
 * @returns {{byDesign: object[], real: object[]}}
 *   real items carry an extra `_why` explaining why they failed triage.
 */
export function classifyFindings(findings, register) {
	const entries = Array.isArray(register?.entries) ? register.entries : []
	const byDesign = []
	const real = []

	// First pass: match each finding to its register entry.
	const matched = new Map() // key rule+file -> { entry, findings: [] }
	const unmatched = []
	for (const finding of findings) {
		if (finding.id === "YARA_NOT_INSTALLED") continue // coverage signal, handled separately
		const file = finding.location?.file ?? "(no-location)"
		const key = `${finding.id}\u0000${file}`
		const entry = entries.find((e) => e.rule === finding.id && e.file === file)
		if (!entry) {
			unmatched.push({ finding, why: `unregistered by-design entry for rule "${finding.id}" in file "${file}"` })
			continue
		}
		const rank = SEVERITY_RANK[finding.severity] ?? -1
		const capRank = SEVERITY_RANK[entry.severity] ?? -1
		if (rank > capRank) {
			unmatched.push({
				finding,
				why: `severity ${finding.severity} exceeds registered by-design cap ${entry.severity} for rule "${entry.rule}"`,
			})
			continue
		}
		if (!matched.has(key)) matched.set(key, { entry, findings: [] })
		matched.get(key).findings.push(finding)
	}

	// Second pass: honor the recorded per-file count baseline.
	for (const { entry, findings: group } of matched.values()) {
		const cap = Number.isFinite(entry.count) ? entry.count : group.length
		const within = group.slice(0, cap)
		within.forEach((f) => byDesign.push({ ...f, _registered: entry }))
		if (group.length > cap) {
			group.slice(cap).forEach((f) =>
				real.push({
					finding: f,
					why: `count for rule "${entry.rule}" in "${entry.file}" exceeds registered baseline ${cap} (now ${group.length})`,
				}),
			)
		}
	}

	unmatched.forEach(({ finding, why }) => real.push({ finding, why }))
	return { byDesign, real }
}

/**
 * Applies the full gate policy and returns the decision.
 *
 * @param {object} scan - normalized scan (see parseScan)
 * @param {object} register - parsed register
 * @param {{publish?: boolean, allowDegraded?: boolean}} opts
 * @returns {{exitCode: number, degraded: boolean, yaraMissing: boolean,
 *   byDesign: object[], real: object[], findingsCount: number}}
 */
export function assessAudit(scan, register, opts = {}) {
	const publish = opts.publish === true
	const allowDegraded = opts.allowDegraded === true

	// Accept both raw tool output ({ metadata: { coverage } }) and the
	// normalized shape ({ coverage }) produced by parseScan().
	const normalized = scan.coverage && scan.coverage.degraded !== undefined ? scan : parseScan(scan)
	const yaraMissing = yaraUnavailable(normalized)
	const degraded = normalized.coverage.degraded || yaraMissing
	// Normalize degraded local-run reporting to the same shape as parseScan.
	scan = normalized

	// Fail-closed: a degraded scan must never be reported as a clean full audit
	// in a publish (release-gate) context.
	if (degraded && publish) {
		return {
			exitCode: EXIT.DEGRADED_OR_TOOL_ERROR,
			degraded,
			yaraMissing,
			byDesign: [],
			real: [],
			findingsCount: scan.findings.length,
		}
	}

	const { byDesign, real } = classifyFindings(scan.findings, register)

	// In a local (non-publish) run a degraded scan may still be inspected, but it
	// must be loudly flagged; pass --allow-degraded to acknowledge that.
	if (degraded && !allowDegraded) {
		return {
			exitCode: EXIT.DEGRADED_OR_TOOL_ERROR,
			degraded,
			yaraMissing,
			byDesign,
			real,
			findingsCount: scan.findings.length,
		}
	}

	return {
		exitCode: real.length > 0 ? EXIT.REAL_FINDINGS : EXIT.PASS,
		degraded,
		yaraMissing,
		byDesign,
		real,
		findingsCount: scan.findings.length,
	}
}

/**
 * Loads and lightly validates the register file.
 * @param {string} registerPath
 * @returns {Promise<object>}
 */
export async function loadRegister(registerPath = DEFAULT_REGISTER) {
	let text
	try {
		text = await readFile(registerPath, "utf8")
	} catch (err) {
		throw new Error(`cannot read register "${registerPath}": ${err.message}`)
	}
	let register
	try {
		register = JSON.parse(text)
	} catch (err) {
		throw new Error(`register "${registerPath}" is not valid JSON: ${err.message}`)
	}
	if (!Array.isArray(register?.entries)) {
		throw new Error(`register "${registerPath}" has no entries array`)
	}
	return register
}

/* ------------------------------------------------------------------ *
 * Tool execution
 * ------------------------------------------------------------------ */

/**
 * Runs the audit tool against a vsix and resolves with its stdout.
 * @param {string} vsixPath
 * @param {{tool?: string, toolVersion?: string}} opts
 * @returns {Promise<{stdout: string, stderr: string, code: number}>}
 */
export function runAuditTool(vsixPath, opts = {}) {
	const tool = opts.tool || DEFAULT_TOOL
	const toolVersion = opts.toolVersion || DEFAULT_TOOL_VERSION
	const args =
		tool === "npx"
			? ["--yes", toolVersion, "scan", vsixPath, "--output", "json", "--severity", "low"]
			: ["scan", vsixPath, "--output", "json", "--severity", "low"]

	return new Promise((resolve) => {
		const child = spawn(tool, args, { stdio: ["ignore", "pipe", "pipe"] })
		let stdout = ""
		let stderr = ""
		child.stdout.on("data", (d) => (stdout += d))
		child.stderr.on("data", (d) => (stderr += d))
		child.on("error", (err) =>
			resolve({ stdout, stderr: `${err.message}`, code: EXIT.DEGRADED_OR_TOOL_ERROR }),
		)
		child.on("close", (code) => resolve({ stdout, stderr, code: code ?? EXIT.DEGRADED_OR_TOOL_ERROR }))
	})
}

/* ------------------------------------------------------------------ *
 * Reporting
 * ------------------------------------------------------------------ */

function formatFindings(byDesign, real) {
	const lines = []
	lines.push(`by-design (registered): ${byDesign.length}`)
	lines.push(`real (fail-closed):     ${real.length}`)
	if (real.length) {
		lines.push("")
		lines.push("Findings that FAILED triage:")
		for (const { finding, why } of real) {
			const loc = finding.location
				? `${finding.location.file}${finding.location.line ? ":" + finding.location.line : ""}`
				: "(no location)"
			lines.push(`  - [${finding.severity.toUpperCase()}] ${finding.id} @ ${loc}`)
			lines.push(`      ${why}`)
			if (finding.title) lines.push(`      title: ${finding.title}`)
		}
	}
	if (byDesign.length) {
		const rules = new Set(byDesign.map((f) => f._registered.rule))
		lines.push("")
		lines.push(`registered by-design rules covered: ${[...rules].sort().join(", ")}`)
	}
	return lines.join("\n")
}

/* ------------------------------------------------------------------ *
 * CLI
 * ------------------------------------------------------------------ */

const HELP = `vsix-audit.mjs — optional on-demand VSIX security audit (DEBT #23, not in the publish pipeline)

Usage:
  node scripts/vsix-audit.mjs <path-to.vsix> [options]

Runs @trailofbits/vsix-audit (pinned ${DEFAULT_TOOL_VERSION}) against the built
VSIX, applies the by-design register, and fails closed on real findings or on
degraded coverage (YARA-X unavailable) in a publish context.

Options:
  --publish            Treat as a release/publish gate: degraded coverage
                       (YARA-X missing) is a hard failure.
  --register <path>    By-design register JSON (default: scripts/vsix-audit-register.json)
  --tool <cmd>         Audit tool command (default: npx). When not 'npx', the
                       tool is invoked as '<cmd> scan <vsix> --output json'.
  --json               Emit a machine-readable JSON summary of the decision.
  --allow-degraded     (Local only) Inspect a degraded scan instead of failing.
  --help               Show this help.

Exit codes:
  0  PASS   full coverage, all findings match by-design register entries
  1  FAIL   real finding(s) — unregistered or severity/count escalation
  2  FAIL   degraded coverage in publish context, or tool could not run/parse
  3  FAIL   usage error

Install (documented; not required to run this file — npx resolves on demand):
  npm i -g @trailofbits/vsix-audit@0.3.0
YARA-X (full coverage): https://github.com/VirusTotal/yara-x/releases (${PINNED_YARA_X})
`

function parseArgs(argv) {
	const args = { positional: [], publish: false, register: null, tool: null, json: false, allowDegraded: false, help: false }
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i]
		switch (a) {
			case "--publish":
				args.publish = true
				break
			case "--json":
				args.json = true
				break
			case "--allow-degraded":
				args.allowDegraded = true
				break
			case "--help":
			case "-h":
				args.help = true
				break
			case "--register":
				args.register = argv[++i]
				break
			case "--tool":
				args.tool = argv[++i]
				break
			default:
				if (a.startsWith("-")) return { error: `unknown option: ${a}` }
				args.positional.push(a)
		}
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
	if (args.positional.length !== 1) {
		process.stderr.write(`Error: expected exactly one <path-to.vsix> argument\n\n${HELP}`)
		return EXIT.USAGE
	}

	const vsixPath = path.resolve(args.positional[0])
	try {
		const { access } = await import("node:fs/promises")
		await access(vsixPath)
	} catch {
		process.stderr.write(`Error: VSIX file not found: ${vsixPath}\n`)
		return EXIT.USAGE
	}

	// 1. Run the audit tool and capture its JSON.
	const run = await runAuditTool(vsixPath, args.tool ? { tool: args.tool } : {})
	let scan
	try {
		scan = parseScan(run.stdout)
	} catch (err) {
		process.stderr.write(`Error: could not parse vsix-audit output: ${err.message}\n`)
		if (run.stderr) process.stderr.write(`tool stderr: ${run.stderr.slice(0, 2000)}\n`)
		return EXIT.DEGRADED_OR_TOOL_ERROR
	}
	// A non-zero tool exit code with no parseable JSON = hard tool failure.
	if (run.code !== 0 && !scan) {
		process.stderr.write(`Error: vsix-audit exited with code ${run.code}\n`)
		if (run.stderr) process.stderr.write(`tool stderr: ${run.stderr.slice(0, 2000)}\n`)
		return EXIT.DEGRADED_OR_TOOL_ERROR
	}

	// 2. Load register + assess.
	const register = await loadRegister(args.register || DEFAULT_REGISTER)
	const decision = assessAudit(scan, register, {
		publish: args.publish,
		allowDegraded: args.allowDegraded,
	})

	// 3. Report.
	const ext = scan.extension
		? `${scan.extension.publisher || ""}.${scan.extension.name || ""} v${scan.extension.version || "?"}`
		: vsixPath
	const coverageLine = scan.coverage.degraded
		? `coverage: DEGRADED (unavailable modules: ${scan.coverage.unavailableModules.join(",") || "yara?"})`
		: "coverage: full"
	process.stdout.write(`vsix-audit gate — ${ext} — ${vsixPath}\n`)
	process.stdout.write(`  ${coverageLine}\n`)
	process.stdout.write(`  tool exit: ${run.code} (0/1 = tool OK; JSON parsed)\n`)
	process.stdout.write(`  ${formatFindings(decision.byDesign, decision.real)}\n`)

	if (decision.degraded && !args.publish) {
		process.stdout.write(
			"\n⚠️  DEGRADED COVERAGE: YARA-X is unavailable or the scanner reported degradation.\n" +
				"   This is NOT a full audit. Install YARA-X (https://github.com/VirusTotal/yara-x) and\n" +
				"   re-run, or pass --allow-degraded to inspect the partial scan locally.\n",
		)
	}

	if (args.json) {
		process.stdout.write(
			"\n" +
				JSON.stringify(
					{
						vsix: vsixPath,
						extension: scan.extension || null,
						coverage: scan.coverage,
						decision: {
							exitCode: decision.exitCode,
							degraded: decision.degraded,
							yaraMissing: decision.yaraMissing,
							findingsCount: decision.findingsCount,
							byDesignCount: decision.byDesign.length,
							realFindings: decision.real.map((r) => ({
								id: r.finding.id,
								severity: r.finding.severity,
								file: r.finding.location?.file ?? null,
								line: r.finding.location?.line ?? null,
								why: r.why,
							})),
						},
						register: path.basename(args.register || DEFAULT_REGISTER),
					},
					null,
					2,
				),
		)
	}

	return decision.exitCode
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
			process.exitCode = EXIT.DEGRADED_OR_TOOL_ERROR
		})
}
