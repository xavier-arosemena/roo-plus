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
 *   - mode: "branding" (branding-only diffs allowed) or "fork-config"
 *     (the known `sembleBinaryPath` fork addition allowed); default = exact.
 *
 * Intentionally NOT gated (fork-specific hardening): manager.ts,
 * config-manager.ts, state-manager.ts, interfaces/manager.ts, semble/*,
 * src/core/webview/handlers/codeIndex.ts, src/core/tools/CodebaseSearchTool.ts.
 * Test files (__tests__) are not gated either — the review's "identical core"
 * list covers production sources only, and tests may legitimately diverge
 * without affecting the cherry-pickability of the core.
 */
export const CORE_FILES = [
	{ path: "src/services/code-index/orchestrator.ts" },
	{ path: "src/services/code-index/search-service.ts" },
	{ path: "src/services/code-index/service-factory.ts" },
	{ path: "src/services/code-index/cache-manager.ts" },
	// processors/* (parser, scanner, file-watcher, index)
	{ path: "src/services/code-index/processors/index.ts" },
	{ path: "src/services/code-index/processors/parser.ts" },
	{ path: "src/services/code-index/processors/scanner.ts" },
	{ path: "src/services/code-index/processors/file-watcher.ts" },
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
	// embedders/* — bedrock.ts / openrouter.ts carry branding-only diffs.
	{ path: "src/services/code-index/embedders/bedrock.ts", mode: "branding" },
	{ path: "src/services/code-index/embedders/gemini.ts" },
	{ path: "src/services/code-index/embedders/mistral.ts" },
	{ path: "src/services/code-index/embedders/ollama.ts" },
	{ path: "src/services/code-index/embedders/openai-compatible.ts" },
	{ path: "src/services/code-index/embedders/openai.ts" },
	{ path: "src/services/code-index/embedders/openrouter.ts", mode: "branding" },
	{ path: "src/services/code-index/embedders/vercel-ai-gateway.ts" },
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
 * Returns the normalization function for a CORE_FILES entry (identity by
 * default). Pure — exported for the spec.
 */
export function getNormalizer(entry) {
	if (entry.mode === "branding") return normalizeBranding
	if (entry.mode === "fork-config") return stripSembleBinaryPath
	return (text) => text
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
openrouter.ts, qdrant-client.ts) / fork-specific (interfaces/config.ts
sembleBinaryPath) exceptions. See plans/architecture-review-code-index-semble.md
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
