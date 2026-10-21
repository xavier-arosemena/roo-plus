#!/usr/bin/env node
/**
 * vsix-audit.mjs
 *
 * Optional on-demand VSIX security audit (DEBT #23).
 *
 * Runs TWO scanning stages against a built `.vsix`, maps both into ONE finding
 * shape, applies a documented triage policy against the by-design register in
 * `scripts/vsix-audit-register.json`, and FAILS CLOSED on:
 *
 *   1. real findings — any finding NOT explicitly listed in the register as
 *      by-design, or whose severity / per-file count ESCALATES beyond the
 *      recorded baseline;
 *   2. degraded coverage — YARA-X unavailable, the scanner reports coverage
 *      degradation, or the second stage could not scan every oversized file —
 *      when running in a publish context (`--publish`).
 *
 * STAGE 1 — `@trailofbits/vsix-audit` (AST + YARA + metadata checks). Known,
 * documented blind spot: its YARA check skips every file larger than 10 MiB
 * (`dist/scanner/checks/yara.js`: `if (buffer.length > 10 * 1024 * 1024)
 * continue;`). `dist/extension.js` is ~15 MB, so the main bundle never receives
 * YARA evaluation while the report could still say `coverage: full`.
 *
 * STAGE 2 — "oversized files" (`runOversizedStage`). This wrapper enumerates
 * every packaged file above the same 10 MiB threshold straight out of the VSIX
 * central directory, runs the PINNED YARA-X CLI (`yr`, v1.20.0 — the same asset
 * and checksum the workflows install) over each of them with the rule set the
 * tool itself ships (`@trailofbits/vsix-audit/zoo/signatures/yara/*.yar`), and
 * maps each match into the tool's finding shape (`id: "YARA_<rule>"`,
 * `category: "yara"`, `location.file`) so register triage applies unchanged.
 * It deliberately does NOT inherit the tool's `dist/**` suppression table:
 * `dist/` is exactly where the blind file lives, so a suppressed rule would
 * re-open the hole. More findings, never fewer.
 *
 * COVERAGE CONTRACT — `coverage: full` now means: the tool reported no
 * degradation, YARA-X was present, AND every packaged file over 10 MiB was
 * actually scanned by stage 2. Anything else prints `coverage: DEGRADED` with
 * the reason (missing `yr`, missing rule set, a file that failed to extract or
 * scan) and exits 2 in a publish context. There is no flag that skips stage 2.
 *
 * REGISTER IDENTITY — entries are matched with the trailing content hash of a
 * JS bundle normalised on BOTH sides (`normalizeFileKey`): a Vite rebuild that
 * re-hashes `mermaid~stateDiagram…-DHB4NmXe.js` keeps matching its registered
 * family instead of forcing a bulk re-accept of a dozen entries (the laundering
 * behaviour the red-team review forbade). Files without a hash suffix
 * (`changelog.md`, `dist/extension.js`, …) normalise to themselves, so exact
 * matching remains the default. Severity caps take the STRICTEST registered
 * entry in a family and counts the LARGEST per-file baseline, so normalisation
 * can never widen a cap.
 *
 * Usage (repo root):
 *   node scripts/vsix-audit.mjs <path-to.vsix> [--publish] [--register <path>]
 *       [--tool <cmd>] [--yr <cmd>] [--rules-dir <path>] [--json]
 *       [--allow-degraded] [--help]
 *
 * Examples:
 *   node scripts/vsix-audit.mjs bin/roo-plus-3.87.3.vsix            # local
 *   node scripts/vsix-audit.mjs bin/roo-plus-3.87.3.vsix --publish  # treat as a publish gate
 *
 * Exit codes (THE contract — the workflows and SECURITY.md quote this table):
 *   0  PASS  — full coverage; every finding matches a by-design register entry.
 *   1  FAIL  — real finding(s): unregistered, or severity/count escalation.
 *   2  FAIL  — degraded coverage in a publish context, or the audit tool could
 *              not run / its output could not be parsed. REACHABLE by design:
 *              when YARA-X is absent (a failed install, an offline runner) the
 *              scan reports degraded coverage and the wrapper exits 2 rather
 *              than pretending the scan was complete. The workflows treat the
 *              scanner install as non-fatal precisely so this state can be
 *              expressed instead of killing the job in its own toolchain.
 *              A missing `yr` for the oversized-file stage is the same outcome:
 *              degraded coverage, never a silent skip.
 *   3  FAIL  — usage error (bad arguments / missing file / malformed register).
 *
 * The register and its policy are documented in SECURITY.md ("Optional on-demand
 * VSIX audit") and DEBT #23.
 */

import { spawn } from "node:child_process"
import { readdirSync, statSync } from "node:fs"
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { inflateRawSync } from "node:zlib"

// Default pinned audit tool. Deterministic across runs; no secrets required.
export const DEFAULT_TOOL = "npx"
export const DEFAULT_TOOL_VERSION = "@trailofbits/vsix-audit@0.3.0"
export const PINNED_YARA_X = "v1.20.0"

/** Pinned YARA-X CLI used by the oversized-file stage (same asset as the workflows). */
export const DEFAULT_YR = "yr"

/**
 * The first stage's YARA check skips files above this size, so the wrapper
 * treats "larger than this" as "the first stage never YARA-scanned it".
 */
export const OVERSIZED_FILE_BYTES = 10 * 1024 * 1024

/** Marks findings produced by the wrapper's own oversized-file stage. */
export const OVERSIZED_STAGE = "oversized-yara"

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
 * Trailing hash segments of a bundled JS chunk (or its source map).
 *
 * Vite/Rollup emit TWO volatile 8-character segments for a grouped chunk: an
 * auto-generated name segment and the content hash, e.g.
 * `mermaid~stateDiagram-…~ganttDiagram-~gdd5p7yb-DHB4NmXe.js`, where BOTH
 * `~gdd5p7yb` and `-DHB4NmXe` change on a rebuild (observed between two builds
 * of the same tree). Single-chunk bundles carry one segment
 * (`mermaid-core-BsNHBjcS.js`). At most two are normalised, so the long
 * module-list prefix — the real family identity — is preserved.
 */
const BUNDLE_HASH_SUFFIX = /(?:[-~][A-Za-z0-9_-]{8}){1,2}(\.js(?:\.map)?)$/

/** Every other extension is compared byte-for-byte after slash normalisation. */
export const HASH_PLACEHOLDER = "<hash>"

/**
 * Normalises a scanner file path for register matching.
 *
 * A rebuild re-hashes webview chunks, so a register keyed to the literal name
 * turns the gate red for a byte-identical triage — and the path of least
 * resistance becomes re-accepting a dozen entries (the laundering behaviour the
 * red-team review forbade). Normalising the trailing content hash on BOTH sides
 * of the comparison keeps the identity stable while leaving module identity
 * intact: `mermaid-core-<hash>.js` still cannot match `mermaid~vennDiagram…`.
 *
 * Files with no hash suffix (`changelog.md`, `dist/extension.js`,
 * `dist/workers/countTokens.js`, `package.json`, …) are returned unchanged, so
 * EXACT matching stays the default for them.
 *
 * @param {string} file
 * @returns {string}
 */
export function normalizeFileKey(file) {
	if (typeof file !== "string") return ""
	return file.replace(/\\/g, "/").replace(BUNDLE_HASH_SUFFIX, `-${HASH_PLACEHOLDER}$1`)
}

/** True when the path carries a normalisable trailing bundle hash. */
export function hasBundleHash(file) {
	return typeof file === "string" && BUNDLE_HASH_SUFFIX.test(file.replace(/\\/g, "/"))
}

/**
 * True when a register entry covers a scanner-reported file.
 * @param {{file?: string}} entry
 * @param {string} file
 * @returns {boolean}
 */
export function entryCoversFile(entry, file) {
	if (!entry || typeof entry.file !== "string" || entry.file === "") return false
	return normalizeFileKey(entry.file) === normalizeFileKey(file)
}

/**
 * Classifies findings against the by-design register.
 *
 * A finding is "by-design" (safe) when at least one register entry exists whose
 * `rule` matches the finding id AND whose `file` covers the finding location
 * (see `entryCoversFile`) AND the finding severity does not rank above that
 * entry's recorded cap. Per-file counts are then checked: if the number of
 * findings for a registered (rule, file) exceeds the largest recorded count for
 * that family, the excess is reported as an escalation.
 *
 * When several entries cover one finding (same family, different build hash),
 * the caps combine STRICTLY: severity takes the strictest (lowest) cap and the
 * count takes the largest per-file baseline. Normalisation therefore can never
 * widen a cap — it only stops a rebuild from invalidating a reviewed one.
 *
 * Anything not covered — a new rule, a new file family, a raised severity, more
 * hits than the baseline — stays "real" and fails the gate.
 *
 * @param {object[]} findings - raw findings (both stages, one shape)
 * @param {object} register - parsed register ({ entries: [...] })
 * @returns {{byDesign: object[], real: object[]}}
 */
export function classifyFindings(findings, register) {
	const entries = Array.isArray(register?.entries) ? register.entries : []
	const byDesign = []
	const real = []

	// First pass: match each finding to the entries that cover it.
	const matched = new Map() // key rule+file -> { cap, capSeverity, label, findings: [] }
	const unmatched = []
	for (const finding of findings) {
		if (finding.id === "YARA_NOT_INSTALLED") continue // coverage signal, handled separately
		const file = finding.location?.file ?? "(no-location)"
		const candidates = entries.filter((e) => e.rule === finding.id && entryCoversFile(e, file))
		if (candidates.length === 0) {
			unmatched.push({ finding, why: `unregistered by-design entry for rule "${finding.id}" in file "${file}"` })
			continue
		}
		// Strictest cap wins when a family has several registered build hashes.
		let capRank = Number.POSITIVE_INFINITY
		let capSeverity = null
		let capCount = 0
		for (const candidate of candidates) {
			const candidateRank = SEVERITY_RANK[candidate.severity] ?? -1
			if (candidateRank < capRank) {
				capRank = candidateRank
				capSeverity = candidate.severity ?? "(unknown)"
			}
			const candidateCount = Number.isFinite(candidate.count) ? candidate.count : 0
			if (candidateCount > capCount) capCount = candidateCount
		}
		const rank = SEVERITY_RANK[finding.severity] ?? -1
		if (rank > capRank) {
			unmatched.push({
				finding,
				why: `severity ${finding.severity} exceeds registered by-design cap ${capSeverity} for rule "${finding.id}"`,
			})
			continue
		}
		const key = `${finding.id}\u0000${normalizeFileKey(file)}\u0000${file}`
		if (!matched.has(key)) {
			matched.set(key, {
				cap: capCount > 0 ? capCount : finding.count,
				capSeverity,
				label: candidates.map((c) => c.file).join(" | "),
				rule: finding.id,
				file,
				findings: [],
			})
		}
		matched.get(key).findings.push(finding)
	}

	// Second pass: honor the recorded per-file count baseline.
	for (const group of matched.values()) {
		const cap = Number.isFinite(group.cap) && group.cap > 0 ? group.cap : group.findings.length
		group.findings.slice(0, cap).forEach((f) =>
			byDesign.push({
				...f,
				_registered: { rule: group.rule, file: group.label, severity: group.capSeverity, count: cap },
			}),
		)
		if (group.findings.length > cap) {
			group.findings.slice(cap).forEach((f) =>
				real.push({
					finding: f,
					why: `count for rule "${group.rule}" in "${group.file}" exceeds registered baseline ${cap} (now ${group.findings.length})`,
				}),
			)
		}
	}

	unmatched.forEach(({ finding, why }) => real.push({ finding, why }))
	return { byDesign, real }
}

/**
 * Normalises an oversized-file stage report into the fields the decision and
 * the coverage line need. A MISSING report is not "nothing to scan": it means
 * the stage did not run, which is a coverage gap (fail-closed), so a caller
 * that forgets the stage can never be reported as a full audit.
 *
 * @param {object|undefined} report - see `runOversizedStage`
 * @returns {{ran: boolean, available: boolean, oversized: string[], scanned: string[],
 *   failed: {file: string, reason: string}[], findings: object[], gaps: string[]}}
 */
export function normalizeOversizedReport(report) {
	const ran = report?.ran === true
	const available = report?.available === true
	const rawTargets = Array.isArray(report?.oversized) ? report.oversized : []
	const oversized = rawTargets.map((t) => (typeof t === "string" ? t : t?.file)).filter((f) => typeof f === "string" && f)
	const scanned = Array.isArray(report?.scanned) ? report.scanned.filter((f) => typeof f === "string" && f) : []
	const failed = Array.isArray(report?.failed)
		? report.failed
				.filter((f) => f && typeof f.file === "string")
				.map((f) => ({ file: f.file, reason: String(f.reason ?? "") }))
		: []
	const findings = Array.isArray(report?.findings) ? report.findings : []

	const gaps = []
	if (!ran) {
		gaps.push("oversized-file stage not run")
	} else if (!available && oversized.length > 0) {
		gaps.push(
			`oversized-file stage unavailable: ${report?.unavailableReason || "YARA-X (yr) or its rule set was not found"}`,
		)
	}
	if (ran && available) {
		const missing = oversized.filter((f) => !scanned.includes(f) && !failed.some((x) => x.file === f))
		if (missing.length > 0) gaps.push(`oversized files not scanned: ${missing.join(", ")}`)
		if (failed.length > 0) gaps.push(`oversized file scan failed: ${failed.map((f) => f.file).join(", ")}`)
	}

	return { ran, available, oversized, scanned, failed, findings, gaps }
}

/**
 * Applies the full gate policy and returns the decision.
 *
 * Both stages produce findings in ONE shape, so they are concatenated before
 * triage and the register needs no stage-specific knowledge.
 *
 * @param {object} scan - normalized scan (see parseScan)
 * @param {object} register - parsed register
 * @param {{publish?: boolean, allowDegraded?: boolean, oversized?: object}} opts
 *   `oversized` is the stage-2 report; omitting it means the stage did not run,
 *   which is a coverage gap (see normalizeOversizedReport).
 * @returns {{exitCode: number, degraded: boolean, yaraMissing: boolean,
 *   byDesign: object[], real: object[], findingsCount: number,
 *   oversized: object, oversizedGaps: string[]}}
 */
export function assessAudit(scan, register, opts = {}) {
	const publish = opts.publish === true
	const allowDegraded = opts.allowDegraded === true

	// Accept both raw tool output ({ metadata: { coverage } }) and the
	// normalized shape ({ coverage }) produced by parseScan().
	const normalized = scan.coverage && scan.coverage.degraded !== undefined ? scan : parseScan(scan)
	const oversized = normalizeOversizedReport(opts.oversized)
	const yaraMissing = yaraUnavailable(normalized)
	const degraded = normalized.coverage.degraded || yaraMissing || oversized.gaps.length > 0
	// Normalize degraded local-run reporting to the same shape as parseScan.
	scan = normalized

	const findings = [...scan.findings, ...oversized.findings]

	// Fail-closed: a degraded scan must never be reported as a clean full audit
	// in a publish (release-gate) context.
	if (degraded && publish) {
		return {
			exitCode: EXIT.DEGRADED_OR_TOOL_ERROR,
			degraded,
			yaraMissing,
			byDesign: [],
			real: [],
			findingsCount: findings.length,
			oversized,
			oversizedGaps: oversized.gaps,
		}
	}

	const { byDesign, real } = classifyFindings(findings, register)

	// In a local (non-publish) run a degraded scan may still be inspected, but it
	// must be loudly flagged; pass --allow-degraded to acknowledge that.
	if (degraded && !allowDegraded) {
		return {
			exitCode: EXIT.DEGRADED_OR_TOOL_ERROR,
			degraded,
			yaraMissing,
			byDesign,
			real,
			findingsCount: findings.length,
			oversized,
			oversizedGaps: oversized.gaps,
		}
	}

	return {
		exitCode: real.length > 0 ? EXIT.REAL_FINDINGS : EXIT.PASS,
		degraded,
		yaraMissing,
		byDesign,
		real,
		findingsCount: findings.length,
		oversized,
		oversizedGaps: oversized.gaps,
	}
}

/** Verdict values the triage policy recognises. Only "by-design" silences a finding. */
export const REGISTER_VERDICTS = ["by-design"]

/**
 * Validates the by-design register's schema.
 *
 * The register is the ONLY thing that can silence a finding, so a bare entry
 * (`{rule, file, severity, count}` with no `reason`/`verdict`) is a way to widen
 * the baseline without triage — exactly what DEBT #23 and the runbooks forbid.
 * The classifier ignores `reason` and `verdict`, so this validation is the only
 * place the prohibition is enforced mechanically (review finding M9).
 *
 * Every entry must carry:
 *   - `rule`      non-empty string (scanner rule id)
 *   - `file`      non-empty string (path exactly as the scanner reports it)
 *   - `reason`    non-empty string (the written justification for by-design)
 *   - `verdict`   exactly "by-design"
 *   - `severity`  one of low|medium|high|critical (the per-entry cap)
 *   - `count`     positive integer (the reviewed baseline count)
 *
 * @param {object} register
 * @returns {string[]} human-readable problems; empty when the register is valid
 */
export function validateRegister(register) {
	if (!register || typeof register !== "object") return ['register is not an object with an "entries" array']
	if (!Array.isArray(register.entries)) return ['register has no "entries" array']
	const problems = []
	register.entries.forEach((entry, index) => {
		const where = `entries[${index}]`
		if (!entry || typeof entry !== "object") {
			problems.push(`${where} is not an object`)
			return
		}
		const label = `${where}${typeof entry.rule === "string" && entry.rule ? ` (${entry.rule} @ ${entry.file ?? "?"})` : ""}`
		if (typeof entry.rule !== "string" || entry.rule.trim() === "") {
			problems.push(`${label}: "rule" must be a non-empty string`)
		}
		if (typeof entry.file !== "string" || entry.file.trim() === "") {
			problems.push(`${label}: "file" must be a non-empty string`)
		}
		if (typeof entry.reason !== "string" || entry.reason.trim() === "") {
			problems.push(
				`${label}: "reason" must be a non-empty written justification — an entry without one could silence a finding without triage`,
			)
		}
		if (!REGISTER_VERDICTS.includes(entry.verdict)) {
			problems.push(
				`${label}: "verdict" must be ${REGISTER_VERDICTS.map((v) => `"${v}"`).join(" or ")} (got ${JSON.stringify(entry.verdict)})`,
			)
		}
		if (typeof entry.severity !== "string" || !(entry.severity in SEVERITY_RANK)) {
			problems.push(
				`${label}: "severity" cap must be one of ${Object.keys(SEVERITY_RANK).join(", ")} (got ${JSON.stringify(entry.severity)})`,
			)
		}
		if (!Number.isInteger(entry.count) || entry.count <= 0) {
			problems.push(`${label}: "count" must be a positive integer (got ${JSON.stringify(entry.count)})`)
		}
	})
	return problems
}

/**
 * Loads and validates the register file.
 *
 * A register that cannot be read, parsed or validated throws; `main()` turns
 * that into exit 3 (usage/config error), never into a silent pass.
 *
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
	const problems = validateRegister(register)
	if (problems.length > 0) {
		throw new Error(
			`register "${registerPath}" is invalid (${problems.length} problem(s)):\n  - ${problems.join("\n  - ")}`,
		)
	}
	return register
}

/**
 * Renders the coverage line of the report.
 *
 * The exit code and the printed coverage MUST agree. They previously did not:
 * `yaraUnavailable()` flags coverage as degraded when the scanner emits a
 * `YARA_NOT_INSTALLED` finding even if `metadata.coverage.degraded` is false, so
 * a publish run exited 2 while printing "coverage: full". The line is therefore
 * derived from the DECISION (which drives the exit code), not from the raw
 * metadata (review finding M5).
 *
 * `coverage: full` is now reachable only when the decision is not degraded,
 * which also requires the oversized-file stage to have run, found YARA-X and its
 * rule set, and scanned every packaged file above the 10 MiB threshold.
 *
 * @param {object} scan - normalized scan
 * @param {{degraded?: boolean, yaraMissing?: boolean, oversizedGaps?: string[]}} decision
 * @returns {string}
 */
export function formatCoverageLine(scan, decision = {}) {
	const modules = Array.isArray(scan?.coverage?.unavailableModules) ? scan.coverage.unavailableModules : []
	const gaps = Array.isArray(decision.oversizedGaps) ? decision.oversizedGaps : []
	const degraded = decision.degraded ?? scan?.coverage?.degraded === true
	if (!degraded) return "coverage: full"
	const reasons = []
	if (decision.yaraMissing) reasons.push("YARA-X unavailable")
	if (modules.length > 0) reasons.push(`unavailable modules: ${modules.join(",")}`)
	for (const gap of gaps) reasons.push(gap)
	return `coverage: DEGRADED${reasons.length > 0 ? ` (${reasons.join("; ")})` : ""}`
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
 * Oversized-file YARA-X stage
 *
 * `@trailofbits/vsix-audit@0.3.0` skips every file above 10 MiB in its YARA
 * check (`dist/scanner/checks/yara.js`: `if (buffer.length > 10 * 1024 * 1024)
 * continue;`), so the 15 MB `dist/extension.js` — the file that runs at
 * activation — never receives YARA evaluation. This stage closes that hole with
 * the same pinned binary and the same rule set, and maps matches into the
 * tool's finding shape so register triage is unchanged.
 * ------------------------------------------------------------------ */

const ZIP_EOCD_SIGNATURE = 0x06054b50
const ZIP_CENTRAL_SIGNATURE = 0x02014b50
const ZIP_LOCAL_SIGNATURE = 0x04034b50
const ZIP_EOCD_MIN_BYTES = 22
const ZIP_EOCD_MAX_COMMENT = 0xffff

/**
 * Reads the ZIP central directory of an in-memory VSIX (pure, no `unzip`
 * dependency; ZIP64 archives are rejected rather than mis-parsed).
 *
 * @param {Buffer} buffer
 * @returns {{name: string, method: number, compressedSize: number, size: number, localHeaderOffset: number}[]}
 */
export function readZipDirectory(buffer) {
	let eocd = -1
	const lowest = Math.max(0, buffer.length - ZIP_EOCD_MIN_BYTES - ZIP_EOCD_MAX_COMMENT)
	for (let i = buffer.length - ZIP_EOCD_MIN_BYTES; i >= lowest; i--) {
		if (buffer.readUInt32LE(i) === ZIP_EOCD_SIGNATURE) {
			eocd = i
			break
		}
	}
	if (eocd < 0) throw new Error("not a ZIP archive (no end-of-central-directory record)")

	const count = buffer.readUInt16LE(eocd + 10)
	const cdOffset = buffer.readUInt32LE(eocd + 16)
	if (count === 0xffff || cdOffset === 0xffffffff) {
		throw new Error("ZIP64 archives are not supported by this reader")
	}

	const entries = []
	let p = cdOffset
	for (let n = 0; n < count; n++) {
		if (p + 46 > buffer.length || buffer.readUInt32LE(p) !== ZIP_CENTRAL_SIGNATURE) {
			throw new Error(`malformed ZIP central directory at entry ${n}`)
		}
		const nameLen = buffer.readUInt16LE(p + 28)
		entries.push({
			name: buffer.toString("utf8", p + 46, p + 46 + nameLen),
			method: buffer.readUInt16LE(p + 10),
			compressedSize: buffer.readUInt32LE(p + 20),
			size: buffer.readUInt32LE(p + 24),
			localHeaderOffset: buffer.readUInt32LE(p + 42),
		})
		p += 46 + nameLen + buffer.readUInt16LE(p + 30) + buffer.readUInt16LE(p + 32)
	}
	return entries
}

/**
 * Extracts one entry's bytes from an in-memory ZIP archive.
 * @param {Buffer} buffer
 * @param {{method: number, compressedSize: number, localHeaderOffset: number}} entry
 * @returns {Buffer}
 */
export function readZipEntryContents(buffer, entry) {
	const p = entry.localHeaderOffset
	if (p + 30 > buffer.length || buffer.readUInt32LE(p) !== ZIP_LOCAL_SIGNATURE) {
		throw new Error("malformed ZIP local header")
	}
	const start = p + 30 + buffer.readUInt16LE(p + 26) + buffer.readUInt16LE(p + 28)
	const raw = buffer.subarray(start, start + entry.compressedSize)
	if (entry.method === 0) return Buffer.from(raw)
	if (entry.method === 8) return inflateRawSync(raw)
	throw new Error(`unsupported ZIP compression method ${entry.method}`)
}

/** Strips the VSIX's `extension/` root so paths match the scanner's own shape. */
export function packagePathFromZipName(name) {
	return String(name).replace(/^extension\//, "")
}

/**
 * Every packaged FILE above `threshold` bytes, largest first. This list is the
 * answer to "which files did stage 1 never YARA-scan", and it is reported even
 * when the stage then fails: a silent empty list would hide the gap.
 *
 * @param {ReturnType<typeof readZipDirectory>} entries
 * @param {number} threshold
 * @returns {{file: string, size: number, entry: object}[]}
 */
export function findOversizedEntries(entries, threshold = OVERSIZED_FILE_BYTES) {
	return entries
		.filter((e) => e && !String(e.name).endsWith("/"))
		.map((e) => ({ file: packagePathFromZipName(e.name), size: e.size, entry: e }))
		.filter((e) => e.size > threshold)
		.sort((a, b) => b.size - a.size)
}

/** Parses `yr scan` stdout (`rule_name path` per line), as the tool does. */
export function parseYaraOutput(stdout) {
	const matches = []
	for (const line of String(stdout ?? "").trim().split("\n")) {
		const match = line.match(/^(\S+)\s+(.+)$/)
		if (match) matches.push({ rule: match[1], file: match[2] })
	}
	return matches
}

/**
 * Parses `rule NAME { meta: severity = "…" description = "…" }` blocks out of
 * the tool's own rule files, mirroring `getRuleMeta()` in
 * `@trailofbits/vsix-audit/dist/scanner/checks/yara.js` so severities cannot
 * drift between the two stages.
 *
 * @param {{source: string, ruleFile: string}[]} sources
 * @returns {Map<string, {rule: string, ruleFile: string, severity?: string, description?: string}>}
 */
export function parseRuleMetadata(sources) {
	const meta = new Map()
	const rulePattern = /rule\s+(\w+)\s*\{[^}]*meta\s*:\s*([^}]+?)(?:strings|condition)\s*:/gs
	for (const { source, ruleFile } of sources) {
		for (const match of String(source).matchAll(rulePattern)) {
			const [, rule, metaBlock] = match
			if (!rule || !metaBlock) continue
			const severity = metaBlock.match(/severity\s*=\s*["'](\w+)["']/)?.[1]
			const description = metaBlock.match(/description\s*=\s*["']([^"']+)["']/)?.[1]
			meta.set(rule, { rule, ruleFile, ...(severity ? { severity } : {}), ...(description ? { description } : {}) })
		}
	}
	return meta
}

/**
 * Severity for a rule: its declared `meta.severity`, else the tool's documented
 * name-prefix fallback (`MAL_`/`critical` → critical, `STEALER_`/`RAT_`/`C2_`/
 * `stealth` → high, everything else → medium).
 */
export function deriveYaraSeverity(rule, meta) {
	const declared = meta?.severity
	if (typeof declared === "string" && declared in SEVERITY_RANK) return declared
	const lower = String(rule).toLowerCase()
	if (lower.includes("critical") || lower.startsWith("mal_")) return "critical"
	if (
		lower.includes("stealth") ||
		lower.startsWith("stealer_") ||
		lower.startsWith("rat_") ||
		lower.startsWith("c2_")
	) {
		return "high"
	}
	return "medium"
}

/**
 * Builds a finding in EXACTLY the shape `@trailofbits/vsix-audit` emits for a
 * YARA hit, so `classifyFindings` and the register treat both stages alike.
 * `metadata.stage` records the producer without affecting triage.
 */
export function buildYaraFinding({ rule, file, ruleFile = "unknown", meta = null }) {
	const dot = file.lastIndexOf(".")
	return {
		id: `YARA_${rule}`,
		title: `YARA rule match: ${rule}`,
		description:
			`YARA rule "${rule}" from ${ruleFile} ` +
			"matched this file. This indicates the file " +
			"contains patterns associated with known " +
			"malware or suspicious behavior.",
		severity: deriveYaraSeverity(rule, meta),
		category: "yara",
		location: { file },
		metadata: { rule, ruleFile, fileType: dot === -1 ? "" : file.slice(dot).toLowerCase(), stage: OVERSIZED_STAGE },
	}
}

/**
 * Runs the pinned YARA-X CLI. Always resolves (never rejects) so one bad file
 * cannot abort the run; the caller records it as a coverage gap.
 * @param {string} yrPath
 * @param {string[]} args
 * @returns {Promise<{stdout: string, stderr: string, code: number}>}
 */
export function runYrScan(yrPath, args) {
	return new Promise((resolve) => {
		const child = spawn(yrPath, args, { stdio: ["ignore", "pipe", "pipe"] })
		let stdout = ""
		let stderr = ""
		child.stdout.on("data", (d) => (stdout += d))
		child.stderr.on("data", (d) => (stderr += d))
		child.on("error", (err) => resolve({ stdout, stderr: `${err.message}`, code: -1 }))
		child.on("close", (code) => resolve({ stdout, stderr, code: code ?? -1 }))
	})
}

/** Candidate install roots for the pinned tool, used to locate its rule set. */
export function defaultToolRoots() {
	const roots = [path.join(__dirname, "..", "node_modules", "@trailofbits", "vsix-audit")]
	roots.push(path.join(path.dirname(process.execPath), "..", "lib", "node_modules", "@trailofbits", "vsix-audit"))
	roots.push("/usr/lib/node_modules/@trailofbits/vsix-audit")
	roots.push("/usr/local/lib/node_modules/@trailofbits/vsix-audit")
	// `npx --yes …` (stage 1) populates the npm cache, which is where the tool's
	// own rule set lives on a CI runner. Honour npm_config_cache when set.
	for (const cacheRoot of [process.env.npm_config_cache, path.join(os.homedir(), ".npm")]) {
		if (!cacheRoot) continue
		try {
			const npxCache = path.join(cacheRoot, "_npx")
			for (const entry of readdirSync(npxCache)) {
				roots.push(path.join(npxCache, entry, "node_modules", "@trailofbits", "vsix-audit"))
			}
		} catch {
			// No npx cache here; the other roots still apply.
		}
	}
	return roots
}

/**
 * Locates the rule set the audit tool ships (`zoo/signatures/yara`), honouring
 * the same `VSIX_AUDIT_ZOO_PATH` override the tool itself uses.
 * @param {{env?: object, toolRoots?: string[]}} opts
 * @returns {string|null}
 */
export function discoverYaraRulesDir({ env = process.env, toolRoots = defaultToolRoots() } = {}) {
	const candidates = []
	// `VSIX_AUDIT_ZOO_PATH` points AT the zoo directory (the tool appends
	// "signatures/yara" itself), while a tool root contains `zoo/` one level down.
	if (env && env["VSIX_AUDIT_ZOO_PATH"]) candidates.push(path.join(env["VSIX_AUDIT_ZOO_PATH"], "signatures", "yara"))
	for (const root of toolRoots) candidates.push(path.join(root, "zoo", "signatures", "yara"))
	for (const dir of candidates) {
		try {
			if (statSync(dir).isDirectory()) return dir
		} catch {
			// Not here; try the next candidate.
		}
	}
	return null
}

/** Reads every `*.yar` / `*.yara` file in the rule directory into memory. */
export async function loadRuleMetadata(rulesDir) {
	const sources = []
	for (const file of await readdir(rulesDir)) {
		if (!file.endsWith(".yar") && !file.endsWith(".yara")) continue
		sources.push({ source: await readFile(path.join(rulesDir, file), "utf8"), ruleFile: file })
	}
	return parseRuleMetadata(sources)
}

/**
 * Stage 2: enumerate every packaged file over the 10 MiB threshold and YARA-scan
 * each one with the pinned `yr` binary and the tool's own rule set.
 *
 * Reporting contract: `available` is true only when the binary AND the rule set
 * were found; every oversized file is accounted for in `scanned` or `failed`;
 * nothing is dropped silently. `runYr` and `makeTempDir` are injectable.
 *
 * @param {object} opts
 * @returns {Promise<object>} the stage report (see normalizeOversizedReport)
 */
export async function runOversizedStage(opts = {}) {
	const {
		vsixPath,
		threshold = OVERSIZED_FILE_BYTES,
		yrPath = DEFAULT_YR,
		rulesDir = null,
		toolRoots = defaultToolRoots(),
		makeTempDir = () => mkdtemp(path.join(os.tmpdir(), "vsix-audit-oversized-")),
	} = opts
	const runYr = opts.runYr ?? ((args) => runYrScan(yrPath, args))

	const report = {
		ran: true,
		available: false,
		threshold,
		oversized: [],
		scanned: [],
		failed: [],
		findings: [],
		rulesDir: null,
		yaraVersion: null,
		unavailableReason: null,
	}

	let buffer
	try {
		buffer = await readFile(vsixPath)
	} catch (err) {
		report.unavailableReason = `cannot read VSIX: ${err.message}`
		report.failed.push({ file: vsixPath, reason: report.unavailableReason })
		return report
	}

	let targets
	try {
		targets = findOversizedEntries(readZipDirectory(buffer), threshold)
	} catch (err) {
		report.unavailableReason = `cannot enumerate VSIX contents: ${err.message}`
		report.failed.push({ file: vsixPath, reason: report.unavailableReason })
		return report
	}
	report.oversized = targets.map((t) => ({ file: t.file, size: t.size }))
	if (targets.length === 0) {
		// Nothing exceeds the threshold: stage 1's YARA check covered everything.
		report.available = true
		return report
	}

	const probe = await runYr(["--version"])
	if (probe.code !== 0 || !String(probe.stdout ?? "").trim()) {
		report.unavailableReason = `YARA-X ("${yrPath} --version") is not available`
		return report
	}
	report.yaraVersion = String(probe.stdout).trim().split("\n")[0]

	const resolvedRulesDir = rulesDir ?? discoverYaraRulesDir({ toolRoots })
	if (!resolvedRulesDir) {
		report.unavailableReason =
			"YARA rule set not found (@trailofbits/vsix-audit zoo/signatures/yara; set VSIX_AUDIT_ZOO_PATH)"
		return report
	}
	report.rulesDir = resolvedRulesDir
	const ruleMeta = await loadRuleMetadata(resolvedRulesDir)
	report.available = true

	const tempDir = await makeTempDir()
	try {
		for (const target of targets) {
			const dest = path.join(tempDir, target.file)
			try {
				await mkdir(path.dirname(dest), { recursive: true })
				await writeFile(dest, readZipEntryContents(buffer, target.entry))
			} catch (err) {
				report.failed.push({ file: target.file, reason: `cannot extract from VSIX: ${err.message}` })
				continue
			}
			const result = await runYr(["scan", "--disable-warnings", resolvedRulesDir, dest])
			if (result.code !== 0) {
				report.failed.push({
					file: target.file,
					reason: `yr scan exited ${result.code}: ${String(result.stderr ?? "").trim().slice(0, 400)}`,
				})
				continue
			}
			report.scanned.push(target.file)
			for (const match of parseYaraOutput(result.stdout)) {
				const meta = ruleMeta.get(match.rule) ?? null
				report.findings.push(
					buildYaraFinding({ rule: match.rule, file: target.file, ruleFile: meta?.ruleFile ?? "unknown", meta }),
				)
			}
		}
	} finally {
		await rm(tempDir, { recursive: true, force: true })
	}
	return report
}

/* ------------------------------------------------------------------ *
 * Reporting
 * ------------------------------------------------------------------ */

/** Renders the oversized-file section of the report (list + per-file outcome). */
export function formatOversizedReport(oversized) {
	const lines = []
	lines.push(`oversized files (> 10 MiB, never YARA-scanned by stage 1): ${oversized.oversized.length}`)
	for (const file of oversized.oversized) {
		const failure = oversized.failed.find((f) => f.file === file)
		if (failure) {
			lines.push(`  - ${file} — NOT SCANNED (${failure.reason})`)
			continue
		}
		if (!oversized.scanned.includes(file)) {
			lines.push(`  - ${file} — NOT SCANNED (stage unavailable)`)
			continue
		}
		const hits = oversized.findings.filter((f) => f.location?.file === file)
		lines.push(`  - ${file} — YARA-X scanned, ${hits.length} rule match(es)`)
		for (const hit of hits) lines.push(`      ${hit.id} [${hit.severity}]`)
	}
	return lines.join("\n")
}

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

Runs TWO stages over the built VSIX, then applies the by-design register and
fails closed on real findings or on degraded coverage in a publish context:

  1. @trailofbits/vsix-audit (pinned ${DEFAULT_TOOL_VERSION}), AST + YARA + metadata.
  2. A YARA-X sweep of every packaged file the tool SKIPS for being larger than
     10 MiB (its YARA check has a hard 10 MiB cutoff). Matches are mapped into
     the same finding shape, so the register triage is unchanged.

"coverage: full" means stage 1 reported no degradation AND stage 2 had YARA-X
(${DEFAULT_YR}) plus the tool's own rule set and scanned EVERY oversized file.

Options:
  --publish            Treat as a release/publish gate: degraded coverage
                       (YARA-X missing, or an oversized file not scanned) is a
                       hard failure.
  --register <path>    By-design register JSON (default: scripts/vsix-audit-register.json)
  --tool <cmd>         Audit tool command (default: npx). When not 'npx', the
                       tool is invoked as '<cmd> scan <vsix> --output json'.
  --yr <cmd>           YARA-X CLI for the oversized-file stage (default: yr)
  --rules-dir <path>   YARA rule set for stage 2 (default: the rule set shipped
                       in @trailofbits/vsix-audit's zoo/signatures/yara)
  --json               Emit a machine-readable JSON summary of the decision.
  --allow-degraded     (Local only) Inspect a degraded scan instead of failing.
  --help               Show this help.

Exit codes:
  0  PASS   full coverage, all findings match by-design register entries
  1  FAIL   real finding(s) — unregistered or severity/count escalation
  2  FAIL   degraded coverage in publish context, or tool could not run/parse
  3  FAIL   usage error (bad arguments, missing VSIX, missing/malformed register)

Note: the register is schema-validated on load. Every entry needs a non-empty
"reason", verdict "by-design", a low|medium|high|critical severity cap and a
positive integer count; a bare entry is rejected with exit 3 rather than
silencing a finding.

Register identity: entries match with the trailing content hash of a JS bundle
normalised on both sides, so a webview rebuild that re-hashes chunks does not
invalidate a reviewed entry. Non-hashed files still match exactly.

Install (documented; not required to run this file — npx resolves on demand):
  npm i -g @trailofbits/vsix-audit@0.3.0
YARA-X (full coverage, both stages): https://github.com/VirusTotal/yara-x/releases (${PINNED_YARA_X})
`

function parseArgs(argv) {
	const args = {
		positional: [],
		publish: false,
		register: null,
		tool: null,
		yr: null,
		rulesDir: null,
		json: false,
		allowDegraded: false,
		help: false,
	}
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
			case "--yr":
				args.yr = argv[++i]
				break
			case "--rules-dir":
				args.rulesDir = argv[++i]
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

	// 2. Run the oversized-file stage. This is unconditional: there is no flag
	// that skips it, because skipping it is exactly the blind spot being closed.
	const oversizedReport = await runOversizedStage({
		vsixPath,
		threshold: OVERSIZED_FILE_BYTES,
		...(args.yr ? { yrPath: args.yr } : {}),
		...(args.rulesDir ? { rulesDir: args.rulesDir } : {}),
	})

	// 3. Load register + assess. A malformed register is a configuration error
	// (exit 3), never a pass: an entry without a reason could silence a finding.
	let register
	try {
		register = await loadRegister(args.register || DEFAULT_REGISTER)
	} catch (err) {
		process.stderr.write(`Error: ${err.message}\n`)
		return EXIT.USAGE
	}
	const decision = assessAudit(scan, register, {
		publish: args.publish,
		allowDegraded: args.allowDegraded,
		oversized: oversizedReport,
	})

	// 4. Report.
	const ext = scan.extension
		? `${scan.extension.publisher || ""}.${scan.extension.name || ""} v${scan.extension.version || "?"}`
		: vsixPath
	// Derived from the decision so the printed coverage can never disagree with
	// the exit code (see formatCoverageLine).
	const coverageLine = formatCoverageLine(scan, decision)
	process.stdout.write(`vsix-audit gate — ${ext} — ${vsixPath}\n`)
	process.stdout.write(`  ${coverageLine}\n`)
	process.stdout.write(`  tool exit: ${run.code} (0/1 = tool OK; JSON parsed)\n`)
	process.stdout.write(`  ${formatOversizedReport(decision.oversized)}\n`)
	process.stdout.write(`  ${formatFindings(decision.byDesign, decision.real)}\n`)

	if (decision.degraded && !args.publish) {
		process.stdout.write(
			"\n⚠️  DEGRADED COVERAGE: this is NOT a full audit.\n" +
				(decision.yaraMissing
					? "   YARA-X is unavailable or the scanner reported degradation.\n"
					: "") +
				decision.oversizedGaps.map((gap) => `   ${gap}\n`).join("") +
				"   Install the pinned YARA-X (https://github.com/VirusTotal/yara-x) and re-run,\n" +
				"   or pass --allow-degraded to inspect the partial scan locally.\n",
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
						oversizedStage: {
							ran: decision.oversized.ran,
							available: decision.oversized.available,
							threshold: oversizedReport.threshold,
							yaraVersion: oversizedReport.yaraVersion,
							rulesDir: oversizedReport.rulesDir,
							files: oversizedReport.oversized,
							scanned: decision.oversized.scanned,
							failed: decision.oversized.failed,
							findings: decision.oversized.findings.map((f) => ({
								id: f.id,
								severity: f.severity,
								file: f.location?.file ?? null,
							})),
							gaps: decision.oversizedGaps,
						},
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
