#!/usr/bin/env node

/**
 * verify-upstream-code-index-alignment.mjs
 *
 * CI diff-gate that keeps the fork's Qdrant code-index core aligned with
 * upstream Zoo-Code (remediation item 6 from
 * plans/architecture-review-code-index-semble.md — see §3.1 for the file list
 * and §5/2a for the rationale).
 *
 * The review found the non-Semble code-index core is byte-identical to
 * `upstream/main` (Zoo-Code-Org/Zoo-Code). This gate GUARANTEES that stays
 * true: if a core file drifts from upstream beyond the allow-listed branding /
 * fork-specific exceptions, the check fails and lists the drifted file(s) so a
 * contributor can revert or cherry-pick cleanly.
 *
 * Comparison semantics per core file:
 *   - default  : byte-identical to upstream/main required.
 *   - branding : compared after normalizing known branding tokens
 *                (Roo-Plus ↔ Zoo-Code, Roo+ ↔ Zoo Code, ...) on BOTH sides, so
 *                branding-only diffs in bedrock.ts / openrouter.ts /
 *                qdrant-client.ts pass while real drift still fails.
 *   - fork-config: compared after stripping the fork's `sembleBinaryPath`
 *                fields from interfaces/config.ts (required by the
 *                intentionally-hardened config-manager.ts, which is NOT gated).
 *   - fork-telemetry: compared after stripping every trace of the fork's
 *                v3.88.0 telemetry purge (telemetry imports, captureEvent
 *                statements, and the emptied try/rethrow shells they left) from
 *                BOTH sides. Upstream still ships the telemetry call sites the
 *                fork deleted on purpose (Marketplace notice #305), so exact
 *                byte-identity is impossible by design — while any non-telemetry
 *                add/change/remove still fails the comparison.
 *   - modes    : an entry may list several of the above (e.g. branding +
 *                fork-telemetry); they compose in order.
 *
 * Divergence ledger (H-11):
 *   - Every allow-list entry (a CORE_FILES entry carrying a mode) MUST have a row
 *     in docs/upstream-sync/allowlist-ledger.md recording WHY the relaxation
 *     exists, and the row must satisfy its kind's requirements. The ledger
 *     RECORDS divergence and never AUTHORISES it — the allow-list is CORE_FILES,
 *     in this file, and a ledger row naming no allow-list entry fails too. This
 *     check is pure and local, so it runs BEFORE any upstream resolution and is
 *     green independently of the file-drift check below.
 *
 * Upstream resolution:
 *   - A local `upstream/main` ref is used as-is (offline-safe).
 *   - Otherwise `git fetch upstream main --depth=1` is attempted (the remote is
 *     added from UPSTREAM_URL if missing, e.g. on CI checkouts).
 *   - If the ref is missing AND the fetch fails (no remote / no network), the
 *     check SKIPS with a clear message and exits 0 (default) so an infra issue
 *     never blocks CI. `--strict` turns that into a hard failure.
 *
 * Usage (repo root):
 *   node scripts/verify-upstream-code-index-alignment.mjs            # default (skip on no network)
 *   node scripts/verify-upstream-code-index-alignment.mjs --fetch    # always fetch upstream/main first
 *   node scripts/verify-upstream-code-index-alignment.mjs --strict   # fail if upstream unavailable
 *   node scripts/verify-upstream-code-index-alignment.mjs --help
 *
 * Exit codes:
 *   0  aligned, or (default) skipped because upstream is unavailable
 *   1  a core file drifted from upstream/main, or --strict + upstream unavailable
 *
 * Env overrides:
 *   UPSTREAM_URL  git URL for upstream (default https://github.com/Zoo-Code-Org/Zoo-Code.git)
 */

import { execFileSync } from "node:child_process"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

import { logStep, logEndGroup, logInfo, logOk, logWarn, logError, logSuccess } from "./lib/logger.mjs"

// Hierarchical tag identifying this process.
const TAG = "VERIFY:UPSTREAM-ALIGNMENT"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")
const UPSTREAM_URL = process.env.UPSTREAM_URL || "https://github.com/Zoo-Code-Org/Zoo-Code.git"
const FETCH_TIMEOUT_MS = 120_000

/**
 * The core files that must stay aligned with upstream/main. Entries:
 *   - path: repo-relative path
 *   - mode: one of "branding" (branding-only diffs allowed), "fork-config"
 *     (the known `sembleBinaryPath` fork addition allowed), or "fork-telemetry"
 *     (the documented v3.88.0 telemetry purge: upstream still contains
 *     TelemetryService.captureEvent calls that Roo+ intentionally deleted as
 *     part of the privacy/security work responding to Marketplace notice #305;
 *     see docs/adr/adr-release-versioning-policy.md); default = exact.
 *   - modes: an array when several allow-lists apply to one file (e.g.
 *     branding + telemetry in bedrock.ts). Exactly one of mode/modes.
 *
 * Intentionally NOT gated (fork-specific hardening): manager.ts,
 * config-manager.ts, state-manager.ts, interfaces/manager.ts, semble/*,
 * src/core/webview/handlers/codeIndex.ts, src/core/tools/CodebaseSearchTool.ts.
 * Test files (__tests__) are not gated either — the review's "identical core"
 * list covers production sources only, and tests may legitimately diverge
 * without affecting the cherry-pickability of the core.
 */
export const CORE_FILES = [
	{ path: "src/services/code-index/orchestrator.ts", mode: "fork-telemetry" },
	{ path: "src/services/code-index/search-service.ts", mode: "fork-telemetry" },
	{ path: "src/services/code-index/service-factory.ts", mode: "fork-telemetry" },
	{ path: "src/services/code-index/cache-manager.ts", mode: "fork-telemetry" },
	// processors/* (parser, scanner, file-watcher, index)
	{ path: "src/services/code-index/processors/index.ts" },
	{ path: "src/services/code-index/processors/parser.ts", mode: "fork-telemetry" },
	{ path: "src/services/code-index/processors/scanner.ts", mode: "fork-telemetry" },
	{ path: "src/services/code-index/processors/file-watcher.ts", mode: "fork-telemetry" },
	// shared/*
	{ path: "src/services/code-index/shared/get-relative-path.ts" },
	{ path: "src/services/code-index/shared/supported-extensions.ts" },
	{ path: "src/services/code-index/shared/validation-helpers.ts" },
	// interfaces/* except interfaces/manager.ts (intentionally diverged).
	// config.ts carries the fork's `sembleBinaryPath` fields (used by the
	// non-gated config-manager.ts) — allowed via the fork-config mode.
	{ path: "src/services/code-index/interfaces/cache.ts" },
	{ path: "src/services/code-index/interfaces/config.ts", mode: "fork-config" },
	{ path: "src/services/code-index/interfaces/embedder.ts" },
	{ path: "src/services/code-index/interfaces/file-processor.ts" },
	{ path: "src/services/code-index/interfaces/index.ts" },
	{ path: "src/services/code-index/interfaces/vector-store.ts" },
	// constants/*
	{ path: "src/services/code-index/constants/index.ts" },
	// embedders/* — bedrock.ts / openrouter.ts carry branding diffs on top of
	// the telemetry purge; the rest diverge from upstream only by telemetry.
	{ path: "src/services/code-index/embedders/bedrock.ts", modes: ["branding", "fork-telemetry"] },
	{ path: "src/services/code-index/embedders/gemini.ts", mode: "fork-telemetry" },
	{ path: "src/services/code-index/embedders/mistral.ts", mode: "fork-telemetry" },
	{ path: "src/services/code-index/embedders/ollama.ts", mode: "fork-telemetry" },
	{ path: "src/services/code-index/embedders/openai-compatible.ts", mode: "fork-telemetry" },
	{ path: "src/services/code-index/embedders/openai.ts", mode: "fork-telemetry" },
	{ path: "src/services/code-index/embedders/openrouter.ts", modes: ["branding", "fork-telemetry"] },
	{ path: "src/services/code-index/embedders/vercel-ai-gateway.ts", mode: "fork-telemetry" },
	// vector-store (branding-only diff in the User-Agent header)
	{ path: "src/services/code-index/vector-store/qdrant-client.ts", mode: "branding" },
	// currently identical; must stay identical
	{ path: "src/core/prompts/tools/filter-tools-for-mode.ts" },
]

/**
 * Branding token pairs (fork ↔ upstream) that are allowed to differ in
 * mode:"branding" files. Each pair is replaced with a NUL placeholder on BOTH
 * sides before comparing, so either spelling is accepted and any OTHER change
 * still counts as drift. Longer tokens are listed first so e.g.
 * "Roo-Plus-Org" is consumed before "Roo-Plus".
 */
const BRANDING_PAIRS = [
	["Roo-Plus-Org", "Zoo-Code-Org"],
	["RooPlus", "ZooCode"],
	["Roo-Plus", "Zoo-Code"],
	["Roo+", "Zoo Code"],
]

/**
 * Replaces every known fork/upstream branding token with a NUL placeholder.
 * Pure — exported for the spec.
 */
export function normalizeBranding(content) {
	let out = content
	for (const [forkToken, upstreamToken] of BRANDING_PAIRS) {
		out = out.split(forkToken).join("\u0000")
		out = out.split(upstreamToken).join("\u0000")
	}
	return out
}

/**
 * Strips the fork's `sembleBinaryPath` fields from interfaces/config.ts so the
 * file can be compared to upstream (which predates the Semble integration).
 * Pure — exported for the spec.
 */
export function stripSembleBinaryPath(content) {
	return content
		.split("\n")
		.filter((line) => !line.includes("sembleBinaryPath"))
		.join("\n")
}

/**
 * Removes every trace of the fork's v3.88.0 telemetry purge (Marketplace notice
 * #305 / adr-release-versioning-policy) from a source file so it can be compared
 * to upstream — which STILL ships telemetry call sites that Roo+ deliberately
 * deleted. Applied identically to BOTH sides, so it can never hide drift that is
 * not telemetry: any added/modified/removed non-telemetry line still fails the
 * byte comparison afterwards. Handles exactly three shapes observed in the core:
 *   1. `import { TelemetryService } from "@roo-code/telemetry"` and the fork-side
 *      `TelemetryEventName` name imported from @roo-code/types
 *   2. whole `TelemetryService.instance.captureEvent(...)` statements (multi-line,
 *      paren-balanced) and comments that exist only to describe them
 *   3. `try { ... } catch (err) { throw err }` wrappers whose catch body became
 *      empty once the telemetry call was removed (the fork deleted the wrapper
 *      too, which also dedents the try body — see collapseSignificantLines)
 * Pure — exported for the spec.
 */
export function stripForkTelemetry(content) {
	const lines = content.split("\n")
	const kept = []
	for (let i = 0; i < lines.length; i++) {
		const t = lines[i].trim()
		if (TELEMETRY_IMPORT_RE.test(t)) {
			continue
		}
		if (t.includes("TelemetryService.instance.captureEvent(")) {
			let depth = 0
			let j = i
			let closed = false
			for (; j < lines.length; j++) {
				depth += parenDelta(lines[j])
				if (depth <= 0) {
					closed = true
					break
				}
			}
			// Unbalanced (unexpected shape): keep the line so it surfaces as drift.
			if (closed) {
				i = j
				continue
			}
		}
		if (/^(\/\/|\/\*|\*)/.test(t) && TELEMETRY_REF_RE.test(t)) {
			continue
		}
		kept.push(lines[i])
	}
	// Unwrap emptied try/rethrow shells to a fixpoint (handles nesting).
	let current = kept
	for (let round = 0; round < 20; round++) {
		const next = unwrapEmptyRethrowTryBlocks(current)
		if (next.length === current.length) {
			break
		}
		current = next
	}
	return collapseSignificantLines(current.join("\n"))
}

/** Matches a whole import line whose braces include a telemetry symbol. */
const TELEMETRY_IMPORT_RE = /^import\s*(?:type\s*)?\{[^}]*\bTelemetry(?:Service|EventName)\b[^}]*\}\s*from\s*["']@roo-code\/(?:telemetry|types)["'];?$/
/** Matches any identifier/comment reference to the telemetry subsystem. */
const TELEMETRY_REF_RE = /\bTelemetry(?:Service|EventName)\b|captureEvent\(|\btelemetry\b/i

function parenDelta(line) {
	let d = 0
	for (const ch of line) {
		if (ch === "(") d++
		else if (ch === ")") d--
	}
	return d
}

function braceDelta(line) {
	let d = 0
	for (const ch of line) {
		if (ch === "{") d++
		else if (ch === "}") d--
	}
	return d
}

/**
 * Drops `try { BODY } catch (X) { throw X }` wrappers, keeping BODY. Only the
 * exact emptied-rethrow shape is unwrapped; anything else is left untouched so a
 * genuine logic change around a try block still counts as drift.
 */
function unwrapEmptyRethrowTryBlocks(lines) {
	const out = []
	for (let i = 0; i < lines.length; i++) {
		if (lines[i].trim() !== "try {") {
			out.push(lines[i])
			continue
		}
		// Walk the try body to the depth-1 catch header.
		let depth = 1
		let j = i + 1
		const body = []
		let catchBinding = null
		for (; j < lines.length; j++) {
			const lt = lines[j].trim()
			const catchMatch = lt.match(/^\} catch \(([^)]*)\) \{$/)
			if (depth === 1 && catchMatch) {
				catchBinding = catchMatch[1].trim()
				break
			}
			depth += braceDelta(lt)
			body.push(lines[j])
			if (depth < 1) {
				break
			}
		}
		if (catchBinding === null) {
			out.push(lines[i])
			continue
		}
		// Walk the catch body to its closing brace.
		let cdepth = 1
		let k = j + 1
		const catchBody = []
		let closed = false
		for (; k < lines.length; k++) {
			const lt = lines[k].trim()
			if (cdepth === 1 && lt === "}") {
				closed = true
				break
			}
			cdepth += braceDelta(lt)
			catchBody.push(lines[k])
			if (cdepth < 1) {
				break
			}
		}
		const meaningful = catchBody.map((l) => l.trim()).filter((l) => l.length > 0)
		const isRethrowShell =
			meaningful.length === 1 && meaningful[0].replace(/;+$/, "") === `throw ${catchBinding}`
		if (closed && isRethrowShell) {
			out.push(...body)
			i = k
			continue
		}
		out.push(lines[i])
	}
	return out
}

/**
 * Trims every line and drops blank lines, so a dedented try-body (left behind by
 * wrapper removal) compares equal on both sides. Symmetric: applied to fork AND
 * upstream text identically. Whitespace/format-only divergence is intentionally
 * NOT policed by this gate (prettier already owns formatting).
 */
function collapseSignificantLines(content) {
	return content
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0)
		.join("\n")
}

/**
 * Returns the normalization function for a CORE_FILES entry (identity by
 * default). `entry.modes` (array) composes several allow-lists in order;
 * `entry.mode` (string) selects one. Pure — exported for the spec.
 */
const NORMALIZERS = {
	branding: normalizeBranding,
	"fork-config": stripSembleBinaryPath,
	"fork-telemetry": stripForkTelemetry,
}

export function getNormalizer(entry) {
	const modes = entry.modes ?? (entry.mode ? [entry.mode] : [])
	const fns = modes.map((m) => NORMALIZERS[m]).filter(Boolean)
	if (fns.length === 0) {
		return (text) => text
	}
	if (fns.length === 1) {
		return fns[0]
	}
	return (text) => fns.reduce((acc, fn) => fn(acc), text)
}

/**
 * Verdict for a single core file. `forkText`/`upstreamText` are the file
 * contents, or null when the file is missing on that side. Pure — exported for
 * the spec.
 *
 * Returns:
 *   { ok: true,  status: "identical" }                       — byte-identical
 *   { ok: true,  status: "allowed-diff", reason }            — only allow-listed branding/fork content
 *   { ok: false, status: "drift" | "missing-local" | "missing-upstream", reason }
 */
export function compareCoreFile(entry, forkText, upstreamText) {
	if (forkText === null && upstreamText === null) {
		return {
			ok: false,
			status: "missing-both",
			reason: "file is missing in both the local checkout and upstream/main",
		}
	}
	if (forkText === null) {
		return {
			ok: false,
			status: "missing-local",
			reason: "file is missing from the local checkout (upstream/main has it)",
		}
	}
	if (upstreamText === null) {
		return {
			ok: false,
			status: "missing-upstream",
			reason: "file does not exist in upstream/main — alignment cannot be verified",
		}
	}
	if (forkText === upstreamText) {
		return { ok: true, status: "identical" }
	}
	const normalize = getNormalizer(entry)
	if (normalize(forkText) === normalize(upstreamText)) {
		return {
			ok: true,
			status: "allowed-diff",
			reason: "differs from upstream only in allow-listed branding / fork-specific content",
		}
	}
	return {
		ok: false,
		status: "drift",
		reason: "content differs from upstream/main beyond the allow-listed exceptions",
	}
}

/**
 * Runs the verdict over every entry. `forkContents`/`upstreamContents` map
 * entry.path → file text (absent keys treated as missing). Pure — exported for
 * the spec.
 */
export function assessAll(entries, forkContents, upstreamContents) {
	return entries.map((entry) => ({
		entry,
		verdict: compareCoreFile(entry, forkContents[entry.path] ?? null, upstreamContents[entry.path] ?? null),
	}))
}

/**
 * Paths of the entries whose verdict is not OK. Pure — exported for the spec.
 */
export function failedPaths(results) {
	return results.filter((result) => !result.verdict.ok).map((result) => result.entry.path)
}

/**
 * The divergence ledger (H-11): one row per allow-list entry recording why the
 * relaxation exists. The ledger RECORDS divergence; it never AUTHORISES it — the
 * allow-list is {@link CORE_FILES} (code), and a ledger row naming no allow-list
 * entry is itself a failure.
 */
export const ALLOWLIST_LEDGER_PATH = "docs/upstream-sync/allowlist-ledger.md"

/**
 * The gate's real allow-list mode → ledger kind. Total over {@link CORE_FILES}'
 * modes, so a row's `kind` is DERIVED from the entry's real mode(s) and never
 * invented: `fork-telemetry` is the fork-feature class. Exported so the spec and
 * the ledger's own header cannot drift apart.
 */
export const ALLOWLIST_MODE_KINDS = {
	branding: "branding",
	"fork-config": "fork-config",
	"fork-telemetry": "fork-feature",
}

/** The ledger's closed sets. */
export const ALLOWLIST_LEDGER_KINDS = ["branding", "fork-config", "fork-feature"]
export const ALLOWLIST_LEDGER_DISPOSITIONS = ["divergent-forever", "pending-upstream", "local-only"]

/** A forcing upstream SHA: an abbreviated hex prefix (9–40 chars). */
export const FORCING_SHA_RE = /^[0-9a-f]{9,40}$/

/** The kind that MUST cite the upstream SHA which forced the exception. */
const FORK_FEATURE_KIND = "fork-feature"

/** The allow-list modes declared on a CORE_FILES entry (`entry.mode` / `.modes`). */
export function entryModes(entry) {
	return entry.modes ?? (entry.mode ? [entry.mode] : [])
}

/**
 * The ledger `kind` an allow-list entry requires, or null when the entry is NOT
 * allow-listed (no mode ⇒ it must stay byte-identical and carries no exception).
 * Pure — exported for the spec.
 */
export function expectedLedgerKind(entry) {
	const modes = entryModes(entry)
	if (modes.length === 0) return null
	return modes.map((mode) => ALLOWLIST_MODE_KINDS[mode] ?? mode).join("+")
}

/** The entries that carry an allow-list exception. Pure — exported for the spec. */
export function allowlistedEntries(entries = CORE_FILES) {
	return entries.filter((entry) => entryModes(entry).length > 0)
}

/** Normalises a markdown table header cell into a lookup key. */
function headerKey(cell) {
	return (cell ?? "")
		.replace(/[`*]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "")
}

/** Normalises a markdown table body cell into a plain value (`—` ⇒ empty). */
function cellValue(cell) {
	const value = (cell ?? "").replace(/[`*]/g, "").trim()
	return value === "—" || value === "-" ? "" : value
}

/**
 * Parses the divergence ledger's table. Columns are matched BY HEADER NAME, so
 * inserting a column cannot shift a value into the wrong field. Returns rows as
 * `{ entry, kind, reason, forcingSha, date, disposition, line }`. Rows before the
 * header (prose, other tables) and separator rows are skipped. Pure — exported
 * for the spec.
 */
export function parseAllowlistLedger(markdown) {
	const lines = String(markdown ?? "").split("\n")
	const headerIndex = lines.findIndex((line) => {
		if (!line.trim().startsWith("|")) return false
		const keys = line.split("|").map(headerKey)
		return keys.includes("entry") && keys.includes("kind") && keys.includes("disposition")
	})
	if (headerIndex === -1) return []
	const headers = lines[headerIndex].split("|").slice(1, -1).map(headerKey)
	const rows = []
	for (let i = headerIndex + 1; i < lines.length; i++) {
		const line = lines[i]
		if (!line.trim().startsWith("|")) {
			if (rows.length > 0) break
			continue
		}
		const cells = line.split("|").slice(1, -1)
		if (cells.every((cell) => /^\s*:?-{2,}:?\s*$/.test(cell))) continue // separator
		const values = {}
		headers.forEach((key, index) => {
			values[key] = cellValue(cells[index])
		})
		rows.push({
			entry: values.entry ?? "",
			kind: values.kind ?? "",
			reason: values.reason ?? "",
			forcingSha: values.forcingupstreamsha ?? "",
			date: values.date ?? "",
			disposition: values.disposition ?? "",
			line: i + 1,
		})
	}
	return rows
}

/**
 * Checks the ledger against the allow-list: every allow-list entry has exactly one
 * row, no row names a non-entry, and each row satisfies its kind's requirements.
 * Every failure NAMES THE ENTRY (never a line number). Pure — exported for the
 * spec.
 *
 * Returns `{ ok, failures: [{ entry, problem }], entries, rows }`.
 */
export function assessAllowlistLedger({ entries = CORE_FILES, markdown } = {}) {
	const rows = parseAllowlistLedger(markdown)
	const allowlisted = allowlistedEntries(entries)
	const failures = []
	const fail = (entry, problem) => failures.push({ entry, problem })

	const byEntry = new Map()
	for (const row of rows) {
		if (!byEntry.has(row.entry)) byEntry.set(row.entry, [])
		byEntry.get(row.entry).push(row)
	}

	for (const row of rows) {
		if (row.entry === "") {
			fail("(blank entry)", "ledger row has no `entry`")
			continue
		}
		const entry = allowlisted.find((candidate) => candidate.path === row.entry)
		if (!entry) {
			fail(row.entry, "names no allow-list entry — the ledger records divergence, it does not authorise it")
			continue
		}
		const expected = expectedLedgerKind(entry)
		if (row.kind !== expected) {
			fail(row.entry, `kind "${row.kind}" disagrees with the entry's modes (expected "${expected}")`)
		}
		if (row.reason === "") {
			fail(row.entry, "reason is empty")
		}
		if (!ALLOWLIST_LEDGER_DISPOSITIONS.includes(row.disposition)) {
			fail(
				row.entry,
				`disposition "${row.disposition}" is not one of ${ALLOWLIST_LEDGER_DISPOSITIONS.join(" | ")}`,
			)
		}
		if (row.kind.split("+").includes(FORK_FEATURE_KIND) && !FORCING_SHA_RE.test(row.forcingSha)) {
			fail(row.entry, "fork-feature row must cite the `forcing upstream SHA` that made the exception necessary")
		}
	}

	for (const entry of allowlisted) {
		const matching = byEntry.get(entry.path) ?? []
		if (matching.length === 0) {
			fail(entry.path, `no ledger row for allow-list kind "${expectedLedgerKind(entry)}"`)
		} else if (matching.length > 1) {
			fail(entry.path, `duplicate ledger rows (${matching.length})`)
		}
	}

	return { ok: failures.length === 0, failures, entries: allowlisted.length, rows: rows.length }
}

/**
 * Decides whether to enforce or skip the gate when upstream is unavailable.
 * Pure — exported for the spec.
 *
 *   - localRef present     → run against the local ref (offline).
 *   - fetch succeeded      → run against the freshly fetched ref.
 *   - otherwise (default)  → skip (exit 0); with --strict → fail (exit 1).
 */
export function decideRunMode({ localRef, fetchSucceeded, strict }) {
	if (localRef) return { run: true, fail: false }
	if (fetchSucceeded) return { run: true, fail: false }
	return { run: false, fail: Boolean(strict) }
}

function git(args, cwd = ROOT, options = {}) {
	try {
		return execFileSync("git", args, {
			cwd,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "pipe"],
			...options,
		})
	} catch (error) {
		const stderr = (error.stderr && error.stderr.toString()) || ""
		throw new Error(`git ${args.join(" ")} failed: ${stderr.trim() || error.message}`)
	}
}

function refExists(ref) {
	try {
		git(["rev-parse", "--verify", "--quiet", ref])
		return true
	} catch {
		return false
	}
}

function resolveRef() {
	if (refExists("refs/remotes/upstream/main")) {
		return { ref: "refs/remotes/upstream/main" }
	}
	if (refExists("upstream/main")) {
		return { ref: "upstream/main" }
	}
	return null
}

function fetchUpstream() {
	try {
		git(["remote", "get-url", "upstream"])
	} catch {
		git(["remote", "add", "upstream", UPSTREAM_URL])
	}
	git(["fetch", "upstream", "main", "--depth=1"], ROOT, { timeout: FETCH_TIMEOUT_MS })
}

function upstreamFileContent(ref, repoPath) {
	try {
		return git(["show", `${ref}:${repoPath}`])
	} catch {
		return null
	}
}

function printHelp() {
	console.log(`
verify-upstream-code-index-alignment.mjs

Verifies the Qdrant code-index core stays aligned with upstream Zoo-Code so
future upstream improvements cherry-pick cleanly. Fails when a core file
differs from upstream/main beyond the allow-listed branding (bedrock.ts,
openrouter.ts, qdrant-client.ts), fork-config (interfaces/config.ts
sembleBinaryPath), or fork-telemetry (the documented v3.88.0 telemetry purge)
exceptions. See plans/architecture-review-code-index-semble.md
(§3.1, §5 item 2a, §6 item 6).

Usage:
  node scripts/verify-upstream-code-index-alignment.mjs [options]

Options:
  --fetch    Always fetch upstream/main first (default: use the local ref when
             present, fetch only when missing).
  --strict   Exit 1 if upstream/main cannot be resolved (no local ref + fetch
             failed). Without --strict, that condition SKIPs with exit 0 so an
             infra/network issue never blocks CI.
  --help     Show this help message

Env:
  UPSTREAM_URL  git URL for upstream (default https://github.com/Zoo-Code-Org/Zoo-Code.git)
`)
}

async function main() {
	const args = process.argv.slice(2)
	const isStrict = args.includes("--strict")
	const forceFetch = args.includes("--fetch")
	const isHelp = args.includes("--help") || args.includes("-h")

	if (isHelp) {
		printHelp()
		process.exit(0)
	}

	logStep(TAG, "Verifying the Qdrant code-index core stays aligned with upstream Zoo-Code")

	// 0. Divergence ledger (H-11). Pure and local, so it runs BEFORE any upstream
	//    resolution: the ledger is green independently of the (possibly
	//    unreachable) upstream ref AND of any file drift reported below.
	logStep(`${TAG}:LEDGER`, `Checking the divergence ledger (${ALLOWLIST_LEDGER_PATH})`)
	let ledgerMarkdown = null
	try {
		ledgerMarkdown = await readFile(path.join(ROOT, ALLOWLIST_LEDGER_PATH), "utf8")
	} catch {
		ledgerMarkdown = null
	}
	if (ledgerMarkdown === null) {
		logError(
			`${TAG}:LEDGER`,
			`the divergence ledger ${ALLOWLIST_LEDGER_PATH} is missing — every allow-list entry must have a ledger row (H-11).`,
		)
		process.exit(1)
	}
	const ledgerReport = assessAllowlistLedger({ entries: CORE_FILES, markdown: ledgerMarkdown })
	if (!ledgerReport.ok) {
		logError(`${TAG}:LEDGER`, `the divergence ledger does not cover the allow-list (${ALLOWLIST_LEDGER_PATH}):`)
		for (const failure of ledgerReport.failures) {
			logError(`${TAG}:LEDGER`, `- ${failure.entry}: ${failure.problem}`)
		}
		logEndGroup()
		process.exit(1)
	}
	logSuccess(
		`${TAG}:LEDGER`,
		`divergence ledger OK: ${ledgerReport.entries} allow-list entries, ${ledgerReport.rows} ledger rows, all satisfied.`,
	)
	logEndGroup()

	// 1. Resolve upstream/main: local ref first (offline), fetch when missing
	//    or when --fetch is passed.
	let resolved = resolveRef()
	let fetchError = null
	if (forceFetch || resolved === null) {
		try {
			fetchUpstream()
			resolved = resolveRef()
		} catch (error) {
			fetchError = error
		}
	}

	if (resolved === null) {
		const decision = decideRunMode({ localRef: false, fetchSucceeded: false, strict: isStrict })
		const detail = fetchError ? fetchError.message : "no local upstream/main ref found"
		if (decision.fail) {
			logError(TAG, "upstream/main is unavailable and --strict is set — refusing to skip the alignment gate.")
			logError(TAG, detail)
			process.exit(1)
		}
		logWarn(TAG, "upstream/main is unavailable (no local ref; fetch failed or no network).")
		logWarn(TAG, detail)
		logWarn(TAG, "Skipping the alignment check — CI is NOT blocked for an infra reason.")
		logWarn(TAG, "Re-run with network (or after `git fetch upstream main --depth=1`) to enforce.")
		process.exit(0)
	}

	if (fetchError) {
		logWarn(TAG, `fetching upstream failed (${fetchError.message}) — falling back to the local upstream/main ref.`)
	}

	const upstreamSha = git(["rev-parse", resolved.ref]).trim()
	logInfo(TAG, `upstream/main @ ${upstreamSha.slice(0, 12)}`)

	// 2. Compare every core file.
	logStep(`${TAG}:FILES`, "Comparing core files against upstream/main")
	const results = []
	for (const entry of CORE_FILES) {
		let forkText = null
		try {
			forkText = await readFile(path.join(ROOT, entry.path), "utf8")
		} catch {
			forkText = null
		}
		const upstreamText = upstreamFileContent(resolved.ref, entry.path)
		const verdict = compareCoreFile(entry, forkText, upstreamText)
		const badge = verdict.ok ? "✔" : "✖"
		const detail = verdict.reason ? ` (${verdict.reason})` : ""
		logInfo(`${TAG}:FILES`, `${badge} ${entry.path} — ${verdict.status}${detail}`)
		results.push({ entry, verdict })
	}
	logEndGroup()

	const failures = failedPaths(results)
	if (failures.length > 0) {
		logError(`${TAG}:FILES`, "The Qdrant code-index core has drifted from upstream Zoo-Code:")
		for (const result of results) {
			if (!result.verdict.ok) {
				logError(`${TAG}:FILES`, `- ${result.entry.path}: ${result.verdict.reason}`)
			}
		}
		logError(`${TAG}:FILES`, "These files must stay byte-identical to upstream/main so upstream improvements")
		logError(`${TAG}:FILES`, "cherry-pick cleanly. Fix by reverting the fork change that touched a core file,")
		logError(`${TAG}:FILES`, "or (after confirming the drift is unwanted) restoring from upstream:")
		logError(`${TAG}:FILES`, "  git fetch upstream main --depth=1")
		logError(`${TAG}:FILES`, "  git checkout upstream/main -- <drifted-file>")
		logError(`${TAG}:FILES`, "See plans/architecture-review-code-index-semble.md (§3.1 / §6 item 6).")
		process.exit(1)
	}

	const identical = results.filter((r) => r.verdict.status === "identical").length
	const allowed = results.filter((r) => r.verdict.status === "allowed-diff").length
	logSuccess(
		TAG,
		`Qdrant code-index core aligned with upstream/main: ${identical} identical, ${allowed} allow-listed branding/fork diff(s).`,
	)
	process.exit(0)
}

// Only run when executed directly (not when imported by the spec).
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
	main().catch((error) => {
		logError(TAG, `unexpected error: ${error instanceof Error ? error.message : String(error)}`)
		process.exit(1)
	})
}
