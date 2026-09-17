#!/usr/bin/env node

/**
 * upstream-sync-triage.mjs
 *
 * Triage automation for the upstream-sync register
 * (docs/upstream-sync/pending-upstream-commits.md). Implements README §8 of
 * docs/upstream-sync/README.md: the register is machine-checkable and
 * machine-refreshable, but class assignment stays a human decision.
 *
 * Two modes:
 *
 *   --verify   (default) Assert the register's integrity against the repo.
 *              Reports seven independent checks:
 *                1. row-sha-format     every row SHA is the canonical 9-char prefix
 *                2. row-sha-resolves   every row SHA resolves in the repo
 *                3. coverage           every commit in merge-base..upstream/main
 *                                      has exactly one row, and no row points
 *                                      outside that range
 *                4. duplicates         no row SHA appears twice
 *                5. synced-fork-sha    every `☑` row carries a fork SHA reachable
 *                                      from the fork ref (runbook R9)
 *                6. stale-in-progress  every `◐` row that records a fork SHA is
 *                                      NOT already reachable from the fork ref;
 *                                      a landed `◐` row is stale and must be
 *                                      flipped to `☑`. WARNING by default;
 *                                      `--strict` promotes it to a failure.
 *                7. header-counts      the header's pending count / baseline tip
 *                                      / merge base match reality
 *              Also prints a per-batch progress roll-up (resolved vs pending).
 *
 *   --refresh  Fetch/deepen upstream, diff `upstream/main` against the baseline
 *              tip recorded in the register header, compute git-derived
 *              evidence per NEW commit, PROPOSE a class + priority, and print a
 *              ready-to-paste register diff. Dry-run by default; only
 *              `--write` touches the register.
 *
 * Hard constraints (see the runbook and README §8):
 *   - Classification is never applied to existing rows. The tool proposes
 *     classes for NEW commits only and reports mismatches for humans; it never
 *     reclassifies and never deletes a row. `--write` only appends.
 *   - Row cells are matched with a ROW-SCOPED regex (`^| \`[0-9a-f]{9}\` |`).
 *     Never grep for "any backticked hex token": SHAs legitimately repeat in
 *     Notes, the recommended execution order and the baseline tips, so a naive
 *     grep reports ~29 false duplicates.
 *   - A row SHA must be a canonical 9-character prefix. A 10-character row SHA
 *     is a real defect: it resolves in git but never matches the 9-char prefix
 *     used for coverage, so the commit silently looks absent from the register.
 *   - All git access goes through `execFileSync` with argument arrays. The host
 *     default shell is dash and does not support process substitution (`<(…)`),
 *     so shell strings are never used.
 *   - The fork ref is resolved once per run and shared by BOTH the `☑` and `◐`
 *     reachability checks so they can never diverge: `--fork-ref <ref>` wins,
 *     else `origin/master` when it resolves and local `master` is an ancestor of
 *     it (a stale local ref), else `master`.
 *   - `stale-in-progress` is a WARNING by default (exit 0): a stale `◐` is an
 *     operator-hygiene problem, not a structural defect, and failing mainline
 *     until a human flips the rows would be worse. `--strict` promotes it.
 *   - Upstream unreachable (no local ref + fetch failed) SKIPS with exit 0 so an
 *     infra/network problem never blocks CI; `--strict` turns that into exit 1.
 *
 * Usage (repo root):
 *   node scripts/upstream-sync-triage.mjs [--verify] [--json] [--strict] [--fork-ref <ref>]
 *   node scripts/upstream-sync-triage.mjs --refresh          # dry run
 *   node scripts/upstream-sync-triage.mjs --refresh --write  # update register
 *   node scripts/upstream-sync-triage.mjs --help
 *
 * Exit codes:
 *   0  register verified, or refreshed, or (default) skipped — upstream unavailable
 *      (a stale `◐` row is a warning, so it also exits 0 by default)
 *   1  a register check failed, or the merge base is unusable (shallow clone)
 *      and --strict was given, or upstream was unavailable and --strict was given,
 *      or stale `◐` rows were found and --strict was given
 *
 * Env:
 *   UPSTREAM_URL  git URL for upstream (default https://github.com/Zoo-Code-Org/Zoo-Code.git)
 */

import { execFileSync } from "node:child_process"
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

import { logStep, logEndGroup, logInfo, logOk, logWarn, logError, logSuccess } from "./lib/logger.mjs"
import { CORE_FILES } from "./verify-upstream-code-index-alignment.mjs"

/** Hierarchical tag identifying this process (same scheme as the sibling gates). */
export const TAG = "SYNC:TRIAGE"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
/** Repository root (the workspace root, one level above scripts/). */
export const ROOT = path.resolve(__dirname, "..")

/** The register — the data this tool verifies and proposes additions to. */
export const REGISTER_PATH = "docs/upstream-sync/pending-upstream-commits.md"
/** Operating manual whose §9 "Register changelog" records refresh events. */
export const README_PATH = "docs/upstream-sync/README.md"
/** Upstream ref compared against; `master` is the fork ref. */
export const UPSTREAM_REF = "upstream/main"
/**
 * Default fork ref for the reachability checks. Resolution is delegated to
 * `chooseForkRef()`: local `master` is frequently stale relative to
 * `origin/master`, and a bare `master` then misses a genuinely-landed fork SHA.
 */
export const FORK_REF = "master"
/** Remote-tracking fork ref preferred when local `master` is an ancestor of it. */
export const ORIGIN_FORK_REF = "origin/master"
/** The command a shallow-clone user must run before triage is meaningful. */
export const DEPTHEN_COMMAND = "git fetch --deepen=400 upstream main"
/** Upstream remote, added on demand on CI checkouts that only have origin. */
const UPSTREAM_URL = process.env.UPSTREAM_URL || "https://github.com/Zoo-Code-Org/Zoo-Code.git"
const FETCH_TIMEOUT_MS = 120_000
const GIT_MAX_BUFFER = 64 * 1024 * 1024

/**
 * Canonical row-SHA length. README §8 / runbook §6: a 10-character row SHA is a
 * defect because it silently fails 9-character prefix matching.
 */
export const ROW_SHA_LENGTH = 9

/**
 * ROW-SCOPED row matcher. Only the FIRST cell of a table row counts as a commit
 * SHA. Deliberately permissive on length (4–40 hex) so that a non-canonical row
 * SHA is *captured and reported as a defect* instead of being silently skipped
 * the way the strict `^| \`[0-9a-f]{9}\` |` form would.
 */
export const ROW_SHA_RE = /^\|\s*`([0-9a-fA-F]{4,40})`\s*\|/

/** Transient / resolved markers used in the register's Status column. */
export const SYNCED_MARKER = "☑"
/**
 * In-progress marker. A `◐` row records the fork SHA of an in-flight pick in the
 * same Status cell (e.g. `| … | ◐ f4287ff4f |`); once that SHA is reachable from
 * the fork ref the row is stale and must be flipped to `☑`.
 */
export const IN_PROGRESS_MARKER = "◐"

/**
 * The most-diverged paths between the fork and upstream, used for the
 * "hot-file hits" evidence signal. Derived from the touch-count of the 102
 * commits in `merge-base..upstream/main` (2026-09-16 baseline) and corroborated
 * by the divergence notes in the register (`src/eslint-suppressions.json` is
 * touched by 12 upstream commits, `.github/workflows/code-qa.yml` by 9,
 * `.github/workflows/label-pr-review-state.yml` by 7 —
 * `src/core/webview/ClineProvider.ts` by 16).
 */
export const HOT_FILES = [
	"src/core/webview/ClineProvider.ts",
	"src/core/webview/webviewMessageHandler.ts",
	"src/eslint-suppressions.json",
	"src/eslint.config.mjs",
	"src/core/task/Task.ts",
	"src/package.json",
	"pnpm-lock.yaml",
	"pnpm-workspace.yaml",
	"package.json",
	"renovate.json",
	".coderabbit.yaml",
	".github/workflows/code-qa.yml",
	".github/workflows/label-pr-review-state.yml",
]

/**
 * README §3 "Upstream automation": commits confined to upstream's org-scale
 * automation stack the fork does not run → `E-SKIP`.
 */
export const UPSTREAM_AUTOMATION_RE = /^(\.github\/|\.coderabbit|CONTRIBUTING\.md$)/

/**
 * README §3 "Lockfile-only": files ⊆ lockfile / dependency manifests →
 * `D-LOCAL` (regenerate locally via Renovate instead of importing the churn).
 * `src/package.json` is BOTH a manifest and the version file — `D-LOCAL` either
 * way, so a basename match is the right granularity here.
 */
export const DEPENDENCY_MANIFEST_RE = /(^|\/)(pnpm-lock\.yaml|pnpm-workspace\.yaml|package\.json|renovate\.json|\.npmrc)$/

/**
 * README §3 "Scope of concern": the fork owns versioning, the changelog,
 * locale readmes and the announcement surface → `D-LOCAL`.
 */
export const SCOPE_OF_CONCERN_RE =
	/(^|\/)CHANGELOG(\.[^/]*)?$|^src\/package\.json$|^locales\/[^/]+\/README\.md$|Announcement\.tsx$/

/**
 * README §3 "Structural hit": paths the fork restructured. The fork's
 * `webviewMessageHandler.ts` is a 131-line router (upstream's is 4206 lines) and
 * the per-domain modules live under `src/core/webview/handlers/`, so an upstream
 * edit there can only be re-implemented, never cherry-picked.
 */
export const STRUCTURAL_PATH_RE =
	/^src\/core\/webview\/webviewMessageHandler\.ts$|^src\/core\/webview\/ClineProvider\.ts$|^src\/core\/webview\/handlers\//

/** Telemetry subsystem markers — the fork purged telemetry (0 refs vs upstream's 131 files). */
export const TELEMETRY_PATCH_RE = /captureEvent\s*\(|@roo-code\/telemetry|TelemetryService|TelemetryEventName/
export const TELEMETRY_PATH_RE = /(^|\/)telemetry(\/|\.|$)/i

/** Runtime source roots — a scope-of-concern hit only implies `D-LOCAL` without these. */
export const RUNTIME_SOURCE_RE = /^(src\/|webview-app\/|webview-ui\/src\/|packages\/[^/]+\/src\/)/

/** README §3 "Value override": raises the priority to P0 regardless of intent prefix. */
export const VALUE_OVERRIDE_RE = /\b(data ?loss|data ?corrupt\w*|security|vulnerab\w*|CVE-\d|crash\w*|stall\w*)\b/i

/** Intent-prefix → priority (README §3), applied after the value override. */
const PREFIX_PRIORITY = new Map([
	["security", "P0"],
	["fix", "P1"],
	["perf", "P1"],
	["feat", "P2"],
	["feature", "P2"],
])

/** Hygiene/CI/docs prefixes → P3. */
const HYGIENE_PREFIXES = new Set([
	"chore",
	"ci",
	"test",
	"tests",
	"lint",
	"docs",
	"build",
	"style",
	"refactor",
	"deps",
	"dependencies",
	"revert",
	"improve",
])

/** A "small diff" for the quick-win flag (README §3). */
export const SMALL_DIFF_MAX_FILES = 3

/**
 * Whether a path is runtime source the fork maintains.
 *
 * Dependency manifests and the changelog live under `src/` too
 * (`src/package.json`, `src/CHANGELOG.md`), but they are NOT runtime source:
 * README §3 classifies a release commit that only touches them as `D-LOCAL`.
 * Without this exclusion `src/package.json` is mistaken for a code change and a
 * version bump gets proposed as `B-CAREFUL`.
 * Pure — exported for the spec.
 */
export function isRuntimeSourceFile(file) {
	if (!RUNTIME_SOURCE_RE.test(file)) return false
	if (DEPENDENCY_MANIFEST_RE.test(file)) return false
	if (/(^|\/)CHANGELOG(\.[^/]*)?$/.test(file)) return false
	return true
}

// ---------------------------------------------------------------------------
// Register parsing (pure)
// ---------------------------------------------------------------------------

/**
 * Splits a markdown table row into trimmed content cells (without the leading /
 * trailing pipes). Handles rows that omit the trailing pipe.
 * Pure — exported for the spec.
 */
export function splitRowCells(line) {
	const parts = line.split("|")
	const content = parts.slice(1, -1).map((cell) => cell.trim())
	if (!line.trimEnd().endsWith("|")) {
		content.push(parts[parts.length - 1].trim())
	}
	return content
}

/**
 * Extracts the fork SHA recorded next to an arbitrary status `marker`. Accepts
 * both `` <marker> `abc1234` `` and `<marker> abc1234`. Returns null when absent.
 * Pure — exported for the spec.
 */
export function extractMarkerSha(statusCell, marker) {
	if (typeof statusCell !== "string") return null
	const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
	const match = new RegExp(escaped + "\\s*`?([0-9a-fA-F]{4,40})`?").exec(statusCell)
	return match ? match[1] : null
}

/**
 * Extracts the fork SHA recorded next to a `☑` marker in a Status cell.
 * Accepts both `` ☑ `abc1234` `` and `☑ abc1234`. Returns null when absent.
 * Pure — exported for the spec.
 */
export function extractForkSha(statusCell) {
	return extractMarkerSha(statusCell, SYNCED_MARKER)
}

/**
 * Reads the two-cell `Field | Value` baseline table at the top of the register.
 * Pure — exported for the spec.
 */
export function parseBaseline(markdown) {
	const baseline = { mergeBase: null, upstreamTip: null, forkTip: null, pendingCount: null }
	for (const line of markdown.split("\n")) {
		const cells = /^\|\s*([^|]+?)\s*\|(.*)\|\s*$/.exec(line)
		if (!cells) continue
		const field = cells[1].trim()
		const value = cells[2].trim()
		const sha = /`([0-9a-fA-F]{4,40})`/.exec(value)
		if (field === "Merge base") baseline.mergeBase = sha ? sha[1] : null
		else if (field === "Upstream tip") baseline.upstreamTip = sha ? sha[1] : null
		else if (field === "Fork tip") baseline.forkTip = sha ? sha[1] : null
		else if (field === "Pending upstream commits") {
			const count = /\*\*(\d+)\*\*/.exec(value) || /(\d+)/.exec(value)
			baseline.pendingCount = count ? Number(count[1]) : null
		}
	}
	return baseline
}

/**
 * Parses every commit row (row-scoped) plus the `SYNC-n` sections that own them.
 * Pure — exported for the spec.
 */
export function parseRegister(markdown) {
	const lines = markdown.split("\n")
	const rows = []
	const sections = []
	for (let i = 0; i < lines.length; i++) {
		const heading = /^##\s+(SYNC-\d+)\b(.*)$/.exec(lines[i])
		if (heading) {
			sections.push({ id: heading[1], line: i + 1, suffix: heading[2].trim(), rows: [] })
		}
		const match = ROW_SHA_RE.exec(lines[i])
		if (!match) continue
		const cells = splitRowCells(lines[i])
		const statusCell = cells[6] ?? ""
		const row = {
			line: i + 1,
			sha: match[1],
			raw: lines[i],
			date: cells[1] ?? "",
			subject: cells[2] ?? "",
			klass: (cells[3] ?? "").replace(/`/g, "").trim(),
			priority: cells[4] ?? "",
			delta: cells[5] ?? "",
			status: statusCell,
			synced: statusCell.includes(SYNCED_MARKER),
			forkSha: extractForkSha(statusCell),
			inProgress: statusCell.includes(IN_PROGRESS_MARKER),
			inProgressSha: extractMarkerSha(statusCell, IN_PROGRESS_MARKER),
			sectionId: sections.length > 0 ? sections[sections.length - 1].id : null,
		}
		rows.push(row)
		if (sections.length > 0) sections[sections.length - 1].rows.push(row)
	}
	return { rows, sections, baseline: parseBaseline(markdown) }
}

/**
 * Per-batch progress roll-up: rows / resolved (`☑`) / pending (`☐`) / other per
 * `SYNC-n` section. Pure — exported for the spec.
 */
export function buildBatchRollup(sections) {
	return sections.map((section) => {
		const resolved = section.rows.filter((row) => row.synced).length
		const pending = section.rows.filter((row) => row.status.includes("☐")).length
		return {
			id: section.id,
			suffix: section.suffix,
			total: section.rows.length,
			resolved,
			pending,
			other: section.rows.length - resolved - pending,
		}
	})
}

/**
 * Compares row SHAs against the pending commit list and the duplicate set.
 * Pure — exported for the spec.
 */
export function crossCheckRows(rows, pendingShas) {
	const expected = pendingShas.map((sha) => sha.slice(0, ROW_SHA_LENGTH))
	const expectedSet = new Set(expected)
	const seen = new Map()
	for (const row of rows) {
		seen.set(row.sha, (seen.get(row.sha) ?? 0) + 1)
	}
	const duplicates = [...seen.entries()].filter(([, count]) => count > 1).map(([sha, count]) => ({ sha, count }))
	const rowSet = new Set(rows.map((row) => row.sha))
	const missing = expected.filter((sha) => !rowSet.has(sha))
	const unexpected = [...rowSet].filter((sha) => !expectedSet.has(sha))
	return { expected, duplicates, missing, unexpected }
}

// ---------------------------------------------------------------------------
// Register validation (pure, via an injected probe)
// ---------------------------------------------------------------------------

function makeCheck(id, title, options = {}) {
	return { id, title, ok: true, failures: [], warnings: [], severity: options.severity ?? "error" }
}

function fail(check, message) {
	check.ok = false
	check.failures.push(message)
}

/**
 * Records a NON-fatal finding. A check with warnings keeps `ok: true` — the
 * register is still structurally consistent — so the CLI can decide whether the
 * finding is fatal. That is how `stale-in-progress` stays a warning by default
 * and only fails under `--strict`.
 */
function warn(check, message) {
	check.warnings.push(message)
}

/**
 * Runs the seven independent register checks against an injected `probe` so the
 * whole thing is unit-testable without touching git.
 *
 * `probe` supplies the repo facts:
 *   commitType(sha)             → "commit" | "tree" | "blob" | null  (git cat-file -t)
 *   isReachableFromForkRef(sha) → boolean                            (git merge-base --is-ancestor)
 *   upstreamTip()               → full SHA of upstream/main
 *   mergeBase()                 → full SHA of merge-base upstream/main <forkRef>
 *
 * `forkRef` is the resolved fork ref shared by the `☑` (`synced-fork-sha`) and
 * `◐` (`stale-in-progress`) checks; it is threaded into their titles and
 * messages so an operator sees exactly what was compared.
 *
 * Pure — exported for the spec.
 */
export function validateRegister({ markdown, pendingShas, probe, forkRef = FORK_REF }) {
	const { rows, sections, baseline } = parseRegister(markdown)
	const cross = crossCheckRows(rows, pendingShas)

	// 1 — every row SHA is the canonical 9-character prefix.
	const formatCheck = makeCheck("row-sha-format", `row SHAs are canonical ${ROW_SHA_LENGTH}-character prefixes`)
	for (const row of rows) {
		if (row.sha.length !== ROW_SHA_LENGTH) {
			fail(
				formatCheck,
				`line ${row.line}: ${row.sha.length}-character SHA \`${row.sha}\` for "${row.subject}" — ` +
					`row SHAs MUST be the canonical ${ROW_SHA_LENGTH}-character prefix, otherwise the commit ` +
					`silently looks absent from the register (README §8)`,
			)
		}
	}

	// 2 — every row SHA resolves in the repo.
	const resolveCheck = makeCheck("row-sha-resolves", "every row SHA resolves to a commit in this repo")
	for (const row of rows) {
		const type = probe.commitType(row.sha)
		if (type !== "commit") {
			fail(
				resolveCheck,
				`line ${row.line}: \`${row.sha}\` ("${row.subject}") does not resolve to a commit` +
					`${type ? ` (git cat-file -t reports "${type}")` : " (git cat-file -t failed)"}`,
			)
		}
	}

	// 3 — coverage of merge-base..upstream/main, and no rows outside it.
	const coverageCheck = makeCheck("coverage", "every pending upstream commit has exactly one row")
	for (const sha of cross.missing) {
		fail(coverageCheck, `pending commit \`${sha}\` has no row in the register`)
	}
	for (const sha of cross.unexpected) {
		const row = rows.find((candidate) => candidate.sha === sha)
		fail(
			coverageCheck,
			`row \`${sha}\` (line ${row ? row.line : "?"}, "${row ? row.subject : ""}") is not in ` +
				`merge-base..${UPSTREAM_REF} — it is stale or mistyped`,
		)
	}

	// 4 — no duplicate rows.
	const duplicateCheck = makeCheck("duplicates", "no row SHA appears more than once")
	for (const duplicate of cross.duplicates) {
		const lines = rows.filter((row) => row.sha === duplicate.sha).map((row) => row.line)
		fail(duplicateCheck, `\`${duplicate.sha}\` appears ${duplicate.count}× (lines ${lines.join(", ")})`)
	}

	// 5 — every ☑ row carries a fork SHA reachable from the resolved fork ref (runbook R9).
	const syncedCheck = makeCheck("synced-fork-sha", `every ${SYNCED_MARKER} row has a fork SHA reachable from ${forkRef}`)
	for (const row of rows) {
		if (!row.synced) continue
		if (!row.forkSha) {
			fail(syncedCheck, `line ${row.line}: \`${row.sha}\` is marked ${SYNCED_MARKER} but records no fork SHA (runbook R9)`)
			continue
		}
		if (!probe.isReachableFromForkRef(row.forkSha)) {
			fail(
				syncedCheck,
				`line ${row.line}: \`${row.sha}\` claims fork SHA \`${row.forkSha}\`, which is not reachable from ${forkRef}`,
			)
		}
	}

	// 6 — no ◐ (in-progress) row is already merged (stale-in-progress).
	//
	// Blind spot this closes (issue #342): the register showed six rows at
	// `◐ <fork-sha>` long after the first sync batch had merged to the fork ref,
	// yet `synced-fork-sha` inspected only `☑` rows and reported all-green. A `◐`
	// row whose recorded fork SHA is reachable from the fork ref is stale — the
	// register under-reports reality and the operator must flip it to `☑`.
	//
	// Severity is deliberate. A stale `◐` is an operator-hygiene problem, not a
	// structural defect: the register still has the correct row count and no
	// duplicates, so the batch itself is safe. A hard failure would turn mainline
	// red until a human flips the rows, so this is a WARNING (exit 0) by default
	// and only fails under `--strict`, matching the shallow-clone / unreachable
	// convention. Only `◐` rows that RECORD a fork SHA are checkable — a bare
	// `◐` may simply be mid-pick, so it is not warned about.
	const staleCheck = makeCheck(
		"stale-in-progress",
		`no ${IN_PROGRESS_MARKER} row's recorded fork SHA is already reachable from ${forkRef}`,
		{ severity: "warning" },
	)
	const staleRows = []
	for (const row of rows) {
		if (!row.inProgress || !row.inProgressSha) continue
		if (probe.isReachableFromForkRef(row.inProgressSha)) {
			warn(
				staleCheck,
				`line ${row.line}: \`${row.sha}\` is marked ${IN_PROGRESS_MARKER} with fork SHA ` +
					`\`${row.inProgressSha}\`, which is already reachable from ${forkRef} — the row is stale; ` +
					`flip it to ${SYNCED_MARKER}`,
			)
			staleRows.push({ line: row.line, sha: row.sha, forkSha: row.inProgressSha, subject: row.subject })
		}
	}

	// 7 — the header counts match reality.
	const headerCheck = makeCheck("header-counts", "the register header matches reality")
	const actualTip = probe.upstreamTip()
	const actualMergeBase = probe.mergeBase()
	if (baseline.pendingCount !== cross.expected.length) {
		fail(
			headerCheck,
			`header says "Pending upstream commits: ${baseline.pendingCount}" but ` +
				`merge-base..${UPSTREAM_REF} contains ${cross.expected.length} commits`,
		)
	}
	if (!baseline.upstreamTip) {
		fail(headerCheck, `header has no parseable "Upstream tip" — the refresh baseline cannot be derived`)
	} else if (actualTip && baseline.upstreamTip !== actualTip.slice(0, baseline.upstreamTip.length)) {
		fail(headerCheck, `header records baseline tip \`${baseline.upstreamTip}\` but ${UPSTREAM_REF} is \`${actualTip.slice(0, 12)}\``)
	}
	if (!baseline.mergeBase) {
		fail(headerCheck, `header has no parseable "Merge base"`)
	} else if (actualMergeBase && baseline.mergeBase !== actualMergeBase.slice(0, baseline.mergeBase.length)) {
		fail(
			headerCheck,
			`header records merge base \`${baseline.mergeBase}\` but git reports \`${actualMergeBase.slice(0, baseline.mergeBase.length)}\``,
		)
	}

	const checks = [formatCheck, resolveCheck, coverageCheck, duplicateCheck, syncedCheck, staleCheck, headerCheck]
	return {
		// `ok` reflects STRUCTURAL defects only. Warning-severity findings
		// (`stale-in-progress`) are surfaced separately so the CLI keeps the
		// default exit code green while still printing them prominently.
		ok: checks.every((check) => check.severity !== "error" || check.ok),
		checks,
		warnings: checks.flatMap((check) => check.warnings),
		hasWarnings: checks.some((check) => check.warnings.length > 0),
		staleInProgress: staleRows,
		rows,
		sections,
		baseline,
		rollup: buildBatchRollup(sections),
		counts: {
			rows: rows.length,
			pendingCommits: cross.expected.length,
			duplicates: cross.duplicates.length,
			missing: cross.missing.length,
			unexpected: cross.unexpected.length,
			synced: rows.filter((row) => row.synced).length,
		},
		missing: cross.missing,
		unexpected: cross.unexpected,
		duplicates: cross.duplicates,
	}
}

// ---------------------------------------------------------------------------
// Evidence + classification (pure) — NEW commits only
// ---------------------------------------------------------------------------

/**
 * Conventional-commit / bracketed intent prefix of an upstream subject.
 * `[Fix] ...` → "fix"; `fix(api): ...` → "fix". Pure — exported for the spec.
 */
export function intentPrefix(subject) {
	const text = (subject ?? "").trim()
	const bracketed = /^\[([^\]]+)\]\s*/.exec(text)
	if (bracketed) return bracketed[1].toLowerCase()
	const conventional = /^([a-z]+)(?:\([^)]*\))?!?:/.exec(text)
	if (conventional) return conventional[1].toLowerCase()
	return ""
}

/**
 * Computes the git-derived evidence for ONE commit. Pure — the caller supplies
 * the file lists so the function is unit-testable against fixtures.
 *
 *   deltaFiles     files changed by the commit that the fork also changed
 *                  since the merge base (README §3 "Δ")
 *   delta          |deltaFiles|
 *   fileCount      files changed by the commit
 *   hotFileHits    changed files that are among HOT_FILES
 *   touchesCoreFile changed files gated by CORE_FILES in the code-index gate
 * Pure — exported for the spec.
 */
export function computeCommitEvidence({
	sha,
	subject,
	files,
	conflictSurface,
	patchText = "",
	coreFilePaths = CORE_FILES.map((entry) => entry.path),
	hotFiles = HOT_FILES,
}) {
	const unique = [...new Set(files.filter(Boolean))]
	const surface = conflictSurface instanceof Set ? conflictSurface : new Set(conflictSurface ?? [])
	const hot = new Set(hotFiles)
	const core = new Set(coreFilePaths)
	const deltaFiles = unique.filter((file) => surface.has(file))
	const hotFileHits = unique.filter((file) => hot.has(file))
	const coreFileHits = unique.filter((file) => core.has(file))

	const isDependencyManifestOnly = unique.length > 0 && unique.every((file) => DEPENDENCY_MANIFEST_RE.test(file))
	const isUpstreamAutomationOnly = unique.length > 0 && unique.every((file) => UPSTREAM_AUTOMATION_RE.test(file))
	const touchesRuntimeSource = unique.some(isRuntimeSourceFile)
	/** Version / CHANGELOG / locale-readme / announcement paths the fork owns. */
	const touchesVersionOrChangelog = unique.filter((file) => SCOPE_OF_CONCERN_RE.test(file))
	const touchesTelemetry = unique.some((file) => TELEMETRY_PATH_RE.test(file)) || TELEMETRY_PATCH_RE.test(patchText)
	const touchesStructural = unique.some((file) => STRUCTURAL_PATH_RE.test(file))

	return {
		sha,
		sha9: sha.slice(0, ROW_SHA_LENGTH),
		subject,
		files: unique,
		fileCount: unique.length,
		delta: deltaFiles.length,
		deltaFiles,
		hotFileHits,
		coreFileHits,
		touchesCoreFile: coreFileHits.length > 0,
		touchesTelemetry,
		touchesStructural,
		touchesVersionOrChangelog,
		touchesManifestOnly: isDependencyManifestOnly,
		touchesUpstreamAutomationOnly: isUpstreamAutomationOnly,
		touchesRuntimeSource,
	}
}

/**
 * PROPOSES a class for a NEW commit from README §3's rules. Advisory only —
 * a human confirms before the row lands. Never called for existing rows.
 * Pure — exported for the spec.
 *
 * Signal precedence (most specific first):
 *   1. E-SKIP         upstream-automation-only
 *   2. D-LOCAL        dependency-manifest-only, or scope-of-concern without a
 *                     runtime-source change (release/version/CHANGELOG commits)
 *   3. C-REIMPLEMENT  telemetry hit, or a structural path hit
 *   4. A-CLEAN        Δ 0
 *   5. B-CAREFUL      Δ 1–5 (Δ 4–5 flagged for inspection)
 *   6. C-REIMPLEMENT  Δ > 5 (runbook §2 stop condition: Δ>5 outside
 *                     C-REIMPLEMENT means the classification is probably wrong)
 * Pure — exported for the spec.
 */
export function proposeClass(evidence) {
	if (evidence.touchesUpstreamAutomationOnly) {
		return { klass: "E-SKIP", reason: "files touch only upstream-org automation (.github/.coderabbit/CONTRIBUTING)" }
	}
	if (evidence.touchesManifestOnly) {
		return { klass: "D-LOCAL", reason: "files are dependency manifests / lockfile — regenerate locally" }
	}
	if (evidence.touchesVersionOrChangelog.length > 0 && !evidence.touchesRuntimeSource) {
		return {
			klass: "D-LOCAL",
			reason: `scope of concern the fork owns (${evidence.touchesVersionOrChangelog.join(", ")}) with no runtime source change`,
		}
	}
	if (evidence.touchesTelemetry) {
		return { klass: "C-REIMPLEMENT", reason: "telemetry hit — the fork purged telemetry (0 refs, upstream has 131 files)" }
	}
	if (evidence.touchesStructural) {
		return { klass: "C-REIMPLEMENT", reason: "structural divergence (decomposed webview handlers / ClineProvider)" }
	}
	if (evidence.delta === 0) {
		return { klass: "A-CLEAN", reason: "Δ 0 — no overlap with any fork-touched file" }
	}
	if (evidence.delta <= 5) {
		const flagged = evidence.delta > 3
		return {
			klass: "B-CAREFUL",
			reason: `Δ ${evidence.delta} — small overlap, cherry-pick then rebrand + gates`,
			needsInspection: flagged,
		}
	}
	return {
		klass: "C-REIMPLEMENT",
		reason: `Δ ${evidence.delta} — large overlap; runbook §2 stop condition (Δ>5 outside C-REIMPLEMENT) means inspect by hand`,
		needsInspection: true,
	}
}

/**
 * PROPOSES a priority for a NEW commit: value override first, then intent prefix.
 * `E-SKIP` is always `P4` (not applicable to the fork).
 * Pure — exported for the spec.
 */
export function proposePriority(evidence, klass) {
	if (klass === "E-SKIP") return { priority: "P4", reason: "E-SKIP — not applicable to the fork" }
	const override = VALUE_OVERRIDE_RE.exec(evidence.subject ?? "")
	if (override) {
		return { priority: "P0", reason: `value override on "${override[0]}" (data loss / security / crash / stall)` }
	}
	const prefix = intentPrefix(evidence.subject)
	if (PREFIX_PRIORITY.has(prefix)) {
		return { priority: PREFIX_PRIORITY.get(prefix), reason: `intent prefix "${prefix}"` }
	}
	if (HYGIENE_PREFIXES.has(prefix)) {
		return { priority: "P3", reason: `hygiene intent prefix "${prefix}"` }
	}
	return { priority: "P3", reason: `unrecognised intent prefix${prefix ? ` "${prefix}"` : ""} — defaulting to P3 for human review` }
}

/**
 * The `quick-win` cross-cutting flag: `A-CLEAN` + `P0`–`P2` + a small diff.
 * Pure — exported for the spec.
 */
export function isQuickWin(klass, priority, fileCount) {
	return klass === "A-CLEAN" && ["P0", "P1", "P2"].includes(priority) && fileCount <= SMALL_DIFF_MAX_FILES
}

/**
 * Formats one proposed register row in the register's exact column order.
 * Pure — exported for the spec.
 */
export function formatRegisterRow({ sha9, date, subject, klass, priority, delta }) {
	return `| \`${sha9}\` | ${date} | ${subject} | \`${klass}\` | ${priority} | ${delta} | ☐ |`
}

/**
 * Builds the full refresh plan: proposal rows plus the header/report metadata.
 * Pure — exported for the spec.
 */
export function buildRefreshPlan({ proposals, baseline, upstreamTip, upstreamTipDate, pendingCount, date, nextSectionNumber }) {
	return {
		date,
		baseline,
		upstreamTip,
		upstreamTipShort: upstreamTip.slice(0, ROW_SHA_LENGTH),
		upstreamTipDate,
		upstreamTipSubject: null,
		pendingCount,
		sectionNumber: nextSectionNumber,
		rows: proposals,
	}
}

/** Next `SYNC-n` number, continuing forward. Never renumbers existing batches. Pure. */
export function nextSectionNumber(markdown) {
	const numbers = [...markdown.matchAll(/^##\s+SYNC-(\d+)\b/gm)].map((match) => Number(match[1]))
	return numbers.length === 0 ? 1 : Math.max(...numbers) + 1
}

/**
 * Renders a ready-to-paste register diff for a refresh plan. Pure.
 * Exported for the spec.
 */
export function renderRegisterDiff(plan, markdown) {
	const registerLines = markdown.split("\n")
	const findLine = (re) => registerLines.find((line) => re.test(line)) ?? "(row not found)"
	const lines = []
	lines.push(`--- ${REGISTER_PATH}`)
	lines.push(`+++ ${REGISTER_PATH}`)
	lines.push("@@ register header @@")
	lines.push(`-${findLine(/^\|\s*Upstream tip\s*\|/)}`)
	lines.push(`+| Upstream tip | \`${plan.upstreamTipShort}\` (${plan.upstreamTipDate}, "${plan.upstreamTipSubject ?? ""}") |`)
	lines.push(`-${findLine(/^\|\s*Pending upstream commits\s*\|/)}`)
	lines.push(`+| Pending upstream commits | **${plan.pendingCount}** |`)
	lines.push("")
	lines.push("@@ append before '## Recommended execution order' @@")
	for (const line of buildRefreshSection(plan)) {
		lines.push(`+${line}`)
	}
	lines.push("")
	lines.push("@@ docs/upstream-sync/README.md §9 'Register changelog' @@")
	lines.push(
		`+| ${plan.date} | Refresh: ${plan.rows.length} new upstream commit(s) folded in from ` +
			`\`${plan.upstreamTipShort}\`; proposed classes are advisory and need human confirmation. |`,
	)
	lines.push("")
	if (plan.rows.some((row) => row.needsInspection)) {
		lines.push("!! Rows flagged for inspection (Δ > 3 or another stop condition):")
		for (const row of plan.rows.filter((candidate) => candidate.needsInspection)) {
			lines.push(`   - \`${row.sha9}\` (Δ ${row.delta}) ${row.subject}`)
		}
	}
	lines.push("")
	lines.push("NOTE: `--write` updates the header cells above and appends the section. The")
	lines.push("      Summary tables and the README changelog stay manual (README §6 step 5/6).")
	return lines.join("\n")
}

/** The proposed `SYNC-n` markdown block for a refresh plan. Pure. */
export function buildRefreshSection(plan) {
	const out = []
	out.push("---")
	out.push("")
	out.push(`## SYNC-${plan.sectionNumber} — Refresh ${plan.date} (proposals — needs human triage)`)
	out.push("")
	out.push(
		`These ${plan.rows.length} commit(s) landed on \`${UPSTREAM_REF}\` after the recorded baseline tip ` +
			`\`${plan.baseline.upstreamTip ?? "?"}\`. Classes/priorities below are **proposals** computed from ` +
			`git-derived evidence (README §3) by \`scripts/upstream-sync-triage.mjs --refresh\`; review before ` +
			`picking and re-home any row whose theme belongs to an existing batch.`,
	)
	out.push("")
	out.push("| SHA | Date | Subject | Class | Pri | Δ | Status |")
	out.push("| --- | ---- | ------- | ----- | --- | - | ------ |")
	for (const row of plan.rows) {
		out.push(formatRegisterRow(row))
	}
	for (const row of plan.rows) {
		if (row.evidence) {
			out.push("")
			out.push(
				`**\`${row.sha9}\` evidence.** Δ ${row.delta} of ${row.fileCount} file(s)` +
					`${row.evidence.hotFileHits.length ? ` · hot: ${row.evidence.hotFileHits.join(", ")}` : ""}` +
					`${row.evidence.touchesCoreFile ? ` · CORE_FILES: ${row.evidence.coreFileHits.join(", ")}` : ""}` +
					`. Proposed \`${row.klass}\` / ${row.priority}: ${row.reason}`,
			)
		}
	}
	out.push("")
	return out
}

/**
 * Applies a refresh plan to the register markdown: rewrites the two header
 * cells and inserts the new proposal section before the recommended execution
 * order. Existing rows are NEVER modified, reordered or deleted.
 *
 * Cell padding is preserved when the replacement value fits; when it does not,
 * the row simply grows (still valid markdown) and the caller is told to run the
 * formatter. Pure — exported for the spec.
 */
export function applyRefreshWrite(markdown, plan) {
	let lines = markdown.split("\n")
	lines = lines.map((line) => {
		if (/^\|\s*Upstream tip\s*\|/.test(line)) {
			return replaceValueCell(line, `\`${plan.upstreamTipShort}\` (${plan.upstreamTipDate}, "${plan.upstreamTipSubject ?? ""}")`)
		}
		if (/^\|\s*Pending upstream commits\s*\|/.test(line)) {
			return replaceValueCell(line, `**${plan.pendingCount}**`)
		}
		return line
	})
	if (plan.rows.length > 0) {
		const anchor = lines.findIndex((line) => /^##\s+Recommended execution order/.test(line))
		const section = buildRefreshSection(plan)
		if (anchor === -1) {
			lines.push(...section)
		} else {
			lines.splice(anchor, 0, ...section)
		}
	}
	return lines.join("\n")
}

/**
 * Replaces the value cell (2nd cell) of a `Field | Value` row, preserving the
 * original cell width when the new value is shorter so column alignment holds.
 */
function replaceValueCell(line, value) {
	const parts = line.split("|")
	if (parts.length < 4) return line
	const original = parts[2]
	const replacement = ` ${value}`
	parts[2] = replacement.length < original.length ? replacement.padEnd(original.length, " ") : replacement
	return parts.join("|")
}

/**
 * Decides whether to enforce or skip when upstream is unreachable.
 *   - local ref present → run (offline-safe)
 *   - fetch succeeded   → run
 *   - otherwise         → skip (exit 0); with --strict → fail
 * Mirrors scripts/verify-upstream-code-index-alignment.mjs's convention.
 * Pure — exported for the spec.
 */
export function decideRunMode({ localRef, fetchSucceeded, strict }) {
	if (localRef) return { run: true, fail: false }
	if (fetchSucceeded) return { run: true, fail: false }
	return { run: false, fail: Boolean(strict) }
}

/**
	* Resolves the fork ref used by the reachability checks.
	*
	* A bare local `master` is frequently stale relative to `origin/master`; in this
	* checkout local `master` once sat 71 commits behind, so a correct `☑` flip
	* failed the reachability check and the `◐` drift went unseen. Resolution order:
	*
	*   1. the `--fork-ref <ref>` override, when given;
	*   2. `origin/master`, when it resolves AND local `master` is an ancestor of it
	*      (local `master` is stale rather than ahead or diverged);
	*   3. local `master` otherwise.
	*
	* BOTH the `☑` (`synced-fork-sha`) and `◐` (`stale-in-progress`) checks consume
	* this single result, so they can never diverge.
	* Pure — exported for the spec.
	*/
export function chooseForkRef({ override, originResolves, localMasterResolves, localMasterIsAncestorOfOrigin }) {
	if (override) return override
	if (originResolves && localMasterResolves && localMasterIsAncestorOfOrigin) return ORIGIN_FORK_REF
	return FORK_REF
}

/**
	* The exit code for `--verify`. A structurally-clean register with stale `◐`
	* rows exits 0 by default — the rows are an operator-hygiene warning, not a
	* defect — and 1 under `--strict`. Isolating the policy here keeps the
	* warn-vs-fail decision unit-testable and used in exactly one place.
	* Pure — exported for the spec.
	*/
export function verifyExitCode({ ok, staleCount, strict }) {
	if (!ok) return 1
	if (strict && staleCount > 0) return 1
	return 0
}

/**
 * Parses CLI arguments. Unknown flags are reported so typos fail loudly instead
 * of silently defaulting to --verify. `--fork-ref <ref>` (or `--fork-ref=<ref>`)
 * sets the fork-ref override used by the reachability checks.
 * Pure — exported for the spec.
 */
export function parseArgs(argv) {
	const opts = { mode: null, json: false, strict: false, write: false, help: false, forkRef: null, unknown: [] }
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i]
		switch (arg) {
			case "--verify":
				opts.mode = "verify"
				break
			case "--refresh":
				opts.mode = "refresh"
				break
			case "--json":
				opts.json = true
				break
			case "--strict":
				opts.strict = true
				break
			case "--write":
				opts.write = true
				break
			case "--fork-ref": {
				const value = argv[i + 1]
				if (value === undefined || value.startsWith("-")) {
					opts.unknown.push(arg)
				} else {
					opts.forkRef = value
					i++
				}
				break
			}
			case "--help":
			case "-h":
				opts.help = true
				break
			default:
				if (arg.startsWith("--fork-ref=")) opts.forkRef = arg.slice("--fork-ref=".length) || null
				else opts.unknown.push(arg)
		}
	}
	if (opts.mode === null) opts.mode = "verify"
	return opts
}

// ---------------------------------------------------------------------------
// Git plumbing (impure) — execFileSync + argument arrays only, never a shell
// ---------------------------------------------------------------------------

/** Runs git with an argument array. Throws a tagged Error carrying stderr. */
function git(args, options = {}) {
	try {
		return execFileSync("git", args, {
			cwd: ROOT,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "pipe"],
			maxBuffer: GIT_MAX_BUFFER,
			...options,
		})
	} catch (error) {
		const stderr = (error.stderr && error.stderr.toString()) || ""
		throw new Error(`git ${args.join(" ")} failed: ${stderr.trim() || error.message}`)
	}
}

function gitQuiet(args) {
	try {
		return git(args)
	} catch {
		return null
	}
}

function refExists(ref) {
	return gitQuiet(["rev-parse", "--verify", "--quiet", ref]) !== null
}

/** Resolves `upstream/main`, preferring the local ref (offline-safe). */
function resolveUpstreamRef() {
	if (refExists("refs/remotes/upstream/main")) return "refs/remotes/upstream/main"
	if (refExists(UPSTREAM_REF)) return UPSTREAM_REF
	return null
}

/**
 * Resolves the fork ref for this run (see `chooseForkRef`) and returns it with a
 * human-readable reason for the log, so the operator can see WHICH ref both the
 * `☑` and `◐` reachability checks compared against.
 */
function resolveForkRef(override) {
	const originResolves = refExists(ORIGIN_FORK_REF)
	const localMasterResolves = refExists(FORK_REF)
	const localMasterIsAncestorOfOrigin =
		originResolves && localMasterResolves
			? gitQuiet(["merge-base", "--is-ancestor", FORK_REF, ORIGIN_FORK_REF]) !== null
			: false
	const ref = chooseForkRef({ override, originResolves, localMasterResolves, localMasterIsAncestorOfOrigin })
	let reason
	if (override) reason = "--fork-ref override"
	else if (ref === ORIGIN_FORK_REF) reason = `local ${FORK_REF} is an ancestor of ${ORIGIN_FORK_REF} (stale local ref)`
	else reason = `local ${FORK_REF}`
	return { ref, reason }
}

/** Deepens/fetches upstream. Throws when the fetch fails (no remote / no network). */
export function fetchUpstream() {
	if (gitQuiet(["remote", "get-url", "upstream"]) === null) {
		git(["remote", "add", "upstream", UPSTREAM_URL])
	}
	git(["fetch", "--deepen=400", "upstream", "main"], { timeout: FETCH_TIMEOUT_MS })
}

function isShallowRepository() {
	const out = gitQuiet(["rev-parse", "--is-shallow-repository"])
	return out !== null && out.trim() === "true"
}

function mergeBaseOf(forkRef = FORK_REF) {
	const out = gitQuiet(["merge-base", UPSTREAM_REF, forkRef])
	return out ? out.trim() : ""
}

function upstreamTipSha() {
	const out = gitQuiet(["rev-parse", "--verify", "--quiet", UPSTREAM_REF])
	return out ? out.trim() : ""
}

/** File list for one commit; falls back to a first-parent diff for merges. */
function commitChangedFiles(sha) {
	let out = gitQuiet(["diff-tree", "-r", "--no-commit-id", "--name-only", "--root", sha])
	if (!out || !out.trim()) {
		out = gitQuiet(["diff-tree", "-r", "--no-commit-id", "--name-only", `${sha}^1`, sha]) ?? ""
	}
	return [...new Set(out.split("\n").map((line) => line.trim()).filter(Boolean))]
}

function commitPatchText(sha) {
	return gitQuiet(["show", "--format=", "--unified=0", sha]) ?? ""
}

/** Files changed by the fork since the merge base. */
function forkChangedFiles(mergeBase, forkRef = FORK_REF) {
	return new Set(
		(gitQuiet(["diff", "--name-only", mergeBase, forkRef]) ?? "")
			.split("\n")
			.map((line) => line.trim())
			.filter(Boolean),
	)
}

/** Files changed by upstream since the merge base. */
function upstreamChangedFiles(mergeBase) {
	return (gitQuiet(["diff", "--name-only", mergeBase, UPSTREAM_REF]) ?? "")
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean)
}

/** The conflict surface: files changed by BOTH sides since the merge base. */
function computeConflictSurface(mergeBase, forkRef = FORK_REF) {
	const forkFiles = forkChangedFiles(mergeBase, forkRef)
	return new Set(upstreamChangedFiles(mergeBase).filter((file) => forkFiles.has(file)))
}

function commitMeta(sha) {
	const out = gitQuiet(["log", "-1", "--format=%ad%x1f%s%x1f%an", "--date=short", sha]) ?? ""
	const [date = "", subject = "", author = ""] = out.trimEnd().split("\u001f")
	return { date, subject, author }
}

/** Builds the repo probe consumed by validateRegister(), bound to `forkRef`. */
function buildProbe(forkRef = FORK_REF) {
	return {
		commitType(sha) {
			const out = gitQuiet(["cat-file", "-t", sha])
			return out ? out.trim() : null
		},
		isReachableFromForkRef(sha) {
			return gitQuiet(["merge-base", "--is-ancestor", sha, forkRef]) !== null
		},
		upstreamTip: upstreamTipSha,
		mergeBase: () => mergeBaseOf(forkRef),
	}
}

// ---------------------------------------------------------------------------
// Shared upstream resolution
// ---------------------------------------------------------------------------

/**
 * Resolves upstream, honouring the skip-on-unreachable convention. Returns a
 * discriminated result the callers turn into an exit code.
 */
function resolveUpstream({ strict, deepen }) {
	let ref = resolveUpstreamRef()
	let fetchError = null
	const shouldFetch = deepen || ref === null
	if (shouldFetch) {
		try {
			fetchUpstream()
			ref = resolveUpstreamRef()
		} catch (error) {
			fetchError = error
		}
	}
	const decision = decideRunMode({ localRef: Boolean(ref), fetchSucceeded: ref !== null, strict })
	return { ref, fetchError, decision, fetched: shouldFetch && ref !== null && fetchError === null }
}

/**
 * Asserts the merge base is usable. A shallow clone without a merge base is a
 * HARD failure: `rev-list` would report the fetch window (22) instead of the
 * real backlog (102), so every downstream number would be wrong.
 */
function requireMergeBase(forkRef = FORK_REF) {
	const shallow = isShallowRepository()
	const mergeBase = mergeBaseOf(forkRef)
	if (!mergeBase) {
		return { ok: false, shallow, mergeBase }
	}
	return { ok: true, shallow, mergeBase }
}

// ---------------------------------------------------------------------------
// Modes
// ---------------------------------------------------------------------------

/**
 * Emits a machine-readable payload on stdout in --json mode.
 *
 * In JSON mode EVERY human-facing log call is guarded by `!opts.json` so stdout
 * carries exactly one parseable JSON document and nothing else — a stray
 * `logWarn` before the payload would corrupt the output for consumers.
 * Pure-ish (writes to stdout only) — exported for the spec.
 */
export function emitJson(opts, payload) {
	if (opts.json) process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`)
}

async function runVerify(opts) {
	const upstream = resolveUpstream({ strict: opts.strict, deepen: false })
	if (!upstream.ref) {
		const detail = upstream.fetchError ? upstream.fetchError.message : "no local upstream/main ref found"
		if (upstream.decision.fail) {
			if (!opts.json) {
				logError(TAG, `${UPSTREAM_REF} is unavailable and --strict is set — refusing to skip the register check.`)
				logError(TAG, detail)
			}
			emitJson(opts, { mode: "verify", ok: false, skipped: true, strict: true, reason: detail })
			return 1
		}
		if (!opts.json) {
			logWarn(TAG, `${UPSTREAM_REF} is unavailable (no local ref; fetch failed or no network).`)
			logWarn(TAG, detail)
			logWarn(TAG, `Skipping the register check — CI is NOT blocked for an infra reason. Run \`${DEPTHEN_COMMAND}\` to enforce.`)
		}
		emitJson(opts, { mode: "verify", ok: true, skipped: true, reason: detail })
		return 0
	}

	const forkRef = resolveForkRef(opts.forkRef)
	if (!opts.json) logInfo(TAG, `fork ref ${forkRef.ref} (${forkRef.reason})`)

	const merge = requireMergeBase(forkRef.ref)
	if (!merge.ok) {
		const message =
			`${UPSTREAM_REF} has no merge base with ${forkRef.ref}` +
			`${merge.shallow ? " (this checkout is shallow)" : ""}. ` +
			`\`git merge-base\` returns nothing, so the pending count would read 22 instead of 102. ` +
			`Deepen first: ${DEPTHEN_COMMAND}`
		emitJson(opts, { mode: "verify", ok: false, shallow: merge.shallow, error: message })
		if (!opts.json) logError(TAG, message)
		return 1
	}
	if (merge.shallow && !opts.json) {
		logWarn(TAG, "This checkout reports as shallow, but the merge base resolves — deepen anyway before triaging a real backlog.")
	}

	const markdown = await readFile(path.join(ROOT, REGISTER_PATH), "utf8")
	const pendingShas = (gitQuiet(["rev-list", "--reverse", `${merge.mergeBase}..${UPSTREAM_REF}`]) ?? "")
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean)

	const report = validateRegister({ markdown, pendingShas, probe: buildProbe(forkRef.ref), forkRef: forkRef.ref })
	const strictFailure = Boolean(opts.strict) && report.staleInProgress.length > 0

	if (opts.json) {
		emitJson(opts, {
			mode: "verify",
			ok: report.ok && !strictFailure,
			skipped: false,
			shallow: merge.shallow,
			forkRef: forkRef.ref,
			forkRefReason: forkRef.reason,
			register: REGISTER_PATH,
			mergeBase: merge.mergeBase.slice(0, 12),
			upstreamTip: upstreamTipSha().slice(0, 12),
			counts: report.counts,
			baseline: report.baseline,
			checks: report.checks,
			warnings: report.warnings,
			staleInProgress: report.staleInProgress,
			rollup: report.rollup,
			missing: report.missing,
			unexpected: report.unexpected,
			duplicates: report.duplicates,
		})
		return verifyExitCode({ ok: report.ok, staleCount: report.staleInProgress.length, strict: Boolean(opts.strict) })
	}

	logStep(TAG, `Verifying ${REGISTER_PATH}`)
	logInfo(TAG, `merge base ${merge.mergeBase.slice(0, ROW_SHA_LENGTH)} · ${UPSTREAM_REF} @ ${upstreamTipSha().slice(0, ROW_SHA_LENGTH)}`)
	logInfo(`${TAG}:ROWS`, `parsed ${report.counts.rows} table rows with the row-scoped matcher ${String(ROW_SHA_RE)}`)
	for (const check of report.checks) {
		const label = `${check.id} — ${check.title}`
		if (!check.ok) {
			logError(`${TAG}:CHECK`, label)
			for (const failure of check.failures) logError(`${TAG}:CHECK`, `  · ${failure}`)
		} else if (check.warnings.length > 0) {
			logWarn(`${TAG}:CHECK`, label)
			for (const warning of check.warnings) logWarn(`${TAG}:CHECK`, `  · ${warning}`)
		} else {
			logOk(`${TAG}:CHECK`, label)
		}
	}

	logEndGroup()
	logStep(`${TAG}:BATCHES`, "per-batch progress (resolved vs pending)")
	for (const batch of report.rollup) {
		const suffix = batch.suffix ? ` ${batch.suffix}` : ""
		logInfo(
			`${TAG}:BATCHES`,
			`${batch.id.padEnd(8)} ${String(batch.total).padStart(3)} rows · ` +
				`${String(batch.resolved).padStart(3)} resolved · ${String(batch.pending).padStart(3)} pending` +
				`${batch.other ? ` · ${batch.other} other` : ""}${suffix}`,
		)
	}
	logEndGroup()

	const { rows, duplicates, missing, unexpected, synced } = report.counts
	logInfo(
		TAG,
		`rows=${rows} duplicates=${duplicates} missing=${missing} unexpected=${unexpected} synced=${synced} ` +
			`pending-commits=${report.counts.pendingCommits}`,
	)

	if (!report.ok) {
		logError(TAG, `Register check FAILED — ${report.checks.filter((check) => !check.ok).length} of ${report.checks.length} checks reported defects.`)
		logError(TAG, "Do NOT start a sync batch against a broken register (runbook §3 Pass C).")
		return 1
	}
	if (report.staleInProgress.length > 0) {
		const summary = `${report.staleInProgress.length} stale ${IN_PROGRESS_MARKER} row(s) already reachable from ${forkRef.ref} — the register under-reports reality.`
		const remedy = `Flip each to ${SYNCED_MARKER} (with its fork SHA) once the fork SHA has landed.`
		if (strictFailure) {
			logError(TAG, summary)
			logError(TAG, `${remedy} --strict promotes this warning to a failure.`)
		} else {
			logWarn(TAG, summary)
			logWarn(TAG, `${remedy} Warning only — pass --strict to fail on stale rows.`)
		}
	}
	logSuccess(
		TAG,
		`Register verified: ${rows} rows cover ${report.counts.pendingCommits} pending commits, 0 duplicates, 0 missing, 0 unexpected` +
			`${report.staleInProgress.length > 0 ? ` (${report.staleInProgress.length} stale ${IN_PROGRESS_MARKER} warning(s))` : ""}.`,
	)
	return verifyExitCode({ ok: report.ok, staleCount: report.staleInProgress.length, strict: Boolean(opts.strict) })
}

async function runRefresh(opts) {
	const upstream = resolveUpstream({ strict: opts.strict, deepen: true })
	if (!upstream.ref) {
		const detail = upstream.fetchError ? upstream.fetchError.message : "no local upstream/main ref found"
		if (upstream.decision.fail) {
			if (!opts.json) {
				logError(TAG, `${UPSTREAM_REF} is unavailable and --strict is set — refusing to skip the refresh.`)
				logError(TAG, detail)
			}
			return { code: 1, payload: { mode: "refresh", ok: false, skipped: true, strict: true, error: detail } }
		}
		if (!opts.json) {
			logWarn(TAG, `${UPSTREAM_REF} is unavailable (no local ref; fetch failed or no network).`)
			logWarn(TAG, detail)
			logWarn(TAG, "Skipping the refresh — CI is NOT blocked for an infra reason.")
			logWarn(TAG, `Re-run with network (or after \`${DEPTHEN_COMMAND}\`) to refresh.`)
		}
		return { code: 0, payload: { mode: "refresh", ok: true, skipped: true, reason: detail } }
	}
	if (upstream.fetchError && !opts.json) {
		logWarn(TAG, `fetching upstream failed (${upstream.fetchError.message}) — falling back to the local ${UPSTREAM_REF} ref.`)
	}

	const forkRef = resolveForkRef(opts.forkRef)
	if (!opts.json) logInfo(TAG, `fork ref ${forkRef.ref} (${forkRef.reason})`)

	const merge = requireMergeBase(forkRef.ref)
	if (!merge.ok) {
		const message =
			`${UPSTREAM_REF} has no merge base with ${forkRef.ref}${merge.shallow ? " (shallow clone)" : ""}. ` +
			`Deepen first: ${DEPTHEN_COMMAND}`
		if (!opts.json) logError(TAG, message)
		return { code: 1, payload: { mode: "refresh", ok: false, shallow: merge.shallow, error: message } }
	}

	const registerAbs = path.join(ROOT, REGISTER_PATH)
	const markdown = await readFile(registerAbs, "utf8")
	const baseline = parseBaseline(markdown)
	if (!baseline.upstreamTip) {
		const message = `the register header has no parseable "Upstream tip" — cannot derive the refresh baseline`
		if (!opts.json) logError(TAG, message)
		return { code: 1, payload: { mode: "refresh", ok: false, error: message } }
	}

	const baselineFull = (gitQuiet(["rev-parse", "--verify", "--quiet", `${baseline.upstreamTip}^{commit}`]) ?? "").trim()
	if (!baselineFull) {
		const message =
			`the register's recorded baseline tip \`${baseline.upstreamTip}\` is not reachable in this clone. ` +
			`Deepen first: ${DEPTHEN_COMMAND}`
		if (!opts.json) logError(TAG, message)
		return { code: 1, payload: { mode: "refresh", ok: false, error: message } }
	}

	const tipSha = upstreamTipSha()
	const newShas = (gitQuiet(["rev-list", "--reverse", `${baselineFull}..${UPSTREAM_REF}`]) ?? "")
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean)

	const conflictSurface = newShas.length > 0 ? computeConflictSurface(merge.mergeBase, forkRef.ref) : new Set()
	const proposals = newShas.map((sha) => {
		const meta = commitMeta(sha)
		const evidence = computeCommitEvidence({
			sha,
			subject: meta.subject,
			files: commitChangedFiles(sha),
			conflictSurface,
			patchText: commitPatchText(sha),
		})
		const proposal = proposeClass(evidence)
		const priority = proposePriority(evidence, proposal.klass)
		return {
			sha9: sha.slice(0, ROW_SHA_LENGTH),
			date: meta.date,
			subject: meta.subject,
			author: meta.author,
			klass: proposal.klass,
			priority: priority.priority,
			delta: evidence.delta,
			fileCount: evidence.fileCount,
			reason: `${proposal.reason}; ${priority.reason}`,
			needsInspection: Boolean(proposal.needsInspection),
			quickWin: isQuickWin(proposal.klass, priority.priority, evidence.fileCount),
			evidence,
		}
	})

	const tipMeta = commitMeta(tipSha)
	const pendingCount = Number((gitQuiet(["rev-list", "--count", `${forkRef.ref}..${UPSTREAM_REF}`]) ?? "0").trim() || 0)
	const plan = buildRefreshPlan({
		proposals,
		baseline,
		upstreamTip: tipSha,
		upstreamTipDate: tipMeta.date,
		pendingCount,
		date: new Date().toISOString().slice(0, 10),
		nextSectionNumber: nextSectionNumber(markdown),
	})
	plan.upstreamTipSubject = tipMeta.subject

	if (opts.write && proposals.length > 0) {
		await writeFile(registerAbs, applyRefreshWrite(markdown, plan), "utf8")
	}

	if (opts.json) {
		return {
			code: 0,
			payload: {
				mode: "refresh",
				ok: true,
				skipped: false,
				wrote: Boolean(opts.write && proposals.length > 0),
				register: REGISTER_PATH,
				baselineTip: baseline.upstreamTip,
				upstreamTip: tipSha.slice(0, 12),
				pendingCount,
				newCommitCount: proposals.length,
				nextSectionNumber: plan.sectionNumber,
				proposals: proposals.map(({ evidence, ...rest }) => ({ ...rest, evidence })),
				diff: renderRegisterDiff(plan, markdown),
			},
		}
	}

	logStep(TAG, `Refreshing the register against ${UPSTREAM_REF}`)
	logInfo(TAG, `baseline tip (from the register header) ${baseline.upstreamTip} → ${baselineFull.slice(0, ROW_SHA_LENGTH)}`)
	logInfo(TAG, `${UPSTREAM_REF} @ ${tipSha.slice(0, ROW_SHA_LENGTH)} (${tipMeta.date}, "${tipMeta.subject}")`)
	logInfo(TAG, `merge base ${merge.mergeBase.slice(0, ROW_SHA_LENGTH)}`)

	if (proposals.length === 0) {
		logOk(TAG, "No new commits since the recorded baseline tip — the register already covers upstream/main.")
		logEndGroup()
		return { code: 0, payload: { mode: "refresh", ok: true, skipped: false, newCommitCount: 0, pendingCount } }
	}

	logInfo(TAG, `conflict surface (files changed by both sides) ${conflictSurface.size} file(s)`)

	logStep(`${TAG}:NEW`, `${proposals.length} new upstream commit(s) — proposed triage`)
	for (const row of proposals) {
		logInfo(
			`${TAG}:NEW`,
			`\`${row.sha9}\` Δ ${row.delta}/${row.fileCount} → proposed \`${row.klass}\` / ${row.priority}` +
				`${row.quickWin ? " (quick-win)" : ""}${row.needsInspection ? " [INSPECT]" : ""} — ${row.subject}`,
		)
	}
	logEndGroup()

	logStep(`${TAG}:DIFF`, "ready-to-paste register diff (dry run — pass --write to apply)")
	logInfo(`${TAG}:DIFF`, renderRegisterDiff(plan, markdown))
	logEndGroup()

	if (opts.write) {
		logSuccess(TAG, `Register updated: section SYNC-${plan.sectionNumber} appended, header tip/count rewritten (${proposals.length} row(s)).`)
		logWarn(TAG, "Review the proposals by hand, move rows into their thematic batch, update the Summary tables, and add the README §9 changelog line.")
		logWarn(TAG, "Run the formatter (pnpm format) to re-align the table columns.")
	} else {
		logInfo(TAG, "Dry run: no files were modified. Re-run with --refresh --write to apply.")
	}
	return {
		code: 0,
		payload: {
			mode: "refresh",
			ok: true,
			skipped: false,
			wrote: Boolean(opts.write),
			newCommitCount: proposals.length,
			pendingCount,
			diff: renderRegisterDiff(plan, markdown),
		},
	}
}

function printHelp() {
	console.log(`
upstream-sync-triage.mjs

Triage automation for the upstream-sync register
(${REGISTER_PATH}), implementing README §8. Classification stays a
human decision: existing rows are never re-classified or deleted, and --refresh
only PROPOSES classes for commits that are new since the register's recorded
baseline tip.

Usage:
  node scripts/upstream-sync-triage.mjs [--verify] [--json] [--strict] [--fork-ref <ref>]
  node scripts/upstream-sync-triage.mjs --refresh [--write] [--json] [--strict] [--fork-ref <ref>]
  node scripts/upstream-sync-triage.mjs --help

Modes:
  --verify   (default) Assert the register against the repo, reporting seven
             independent checks: canonical 9-character row SHAs, row SHAs that
             resolve, coverage of merge-base..${UPSTREAM_REF} (missing /
             unexpected), duplicate rows, every ${SYNCED_MARKER} row carrying a fork SHA reachable
             from the fork ref, every ${IN_PROGRESS_MARKER} row whose recorded fork SHA is already
             reachable from the fork ref (stale-in-progress), and header counts
             matching reality. Prints a per-batch progress roll-up.
  --refresh  Deepen/fetch upstream, diff ${UPSTREAM_REF} against the baseline tip
             recorded in the register header, compute per-commit evidence
             (Δ, file count, hot-file hits, CORE_FILES hits, telemetry /
             version / CHANGELOG / lockfile / .github / .coderabbit signals) and
             propose a class + priority using README §3's rules. Dry run by
             default: it prints a ready-to-paste register diff.

Options:
  --write    (with --refresh) Apply the proposal section and header rewrite to
             the register. Never re-classifies or deletes existing rows.
  --json     Emit the machine-readable report on stdout instead of the log.
  --strict   Exit 1 when ${UPSTREAM_REF} cannot be resolved (no local ref and the
             fetch failed), AND exit 1 when stale-in-progress rows are found.
             Without it those conditions skip/warn with exit 0 so an infra
             problem or a stale register never turns mainline red on its own.
  --fork-ref <ref>
             Override the fork ref used by the reachability checks. Default
             resolution: origin/master when it resolves and local master is an
             ancestor of it (a stale local ref), else master. Both the ${SYNCED_MARKER} and
             ${IN_PROGRESS_MARKER} checks use the same resolved ref.
  --help     Show this help message

Note on stale-in-progress: a ${IN_PROGRESS_MARKER} (in-progress) row whose recorded fork SHA
is already reachable from the fork ref is stale and must be flipped to ${SYNCED_MARKER}.
It is a WARNING by default (exit 0); pass --strict to fail on it.

Precondition (runbook R1):
  This clone is shallow by default. Without a usable merge base the pending
  count reads 22 instead of 102. Deepen first:
    ${DEPTHEN_COMMAND}
    git rev-parse --is-shallow-repository
    git merge-base ${UPSTREAM_REF} ${FORK_REF}     # must print a SHA

Exit codes:
  0  register verified / refreshed / skipped (upstream unavailable); a stale
     in-progress warning alone does NOT fail
  1  a register check failed, the merge base is unusable, upstream was unavailable
     with --strict, or stale in-progress rows were found with --strict

Env:
  UPSTREAM_URL  git URL for upstream (default https://github.com/Zoo-Code-Org/Zoo-Code.git)
`)
}

async function main() {
	const opts = parseArgs(process.argv.slice(2))
	if (opts.help) {
		printHelp()
		return 0
	}
	if (opts.unknown.length > 0) {
		emitJson(opts, { mode: opts.mode, ok: false, error: `unknown argument(s): ${opts.unknown.join(", ")}` })
		if (!opts.json) logError(TAG, `unknown argument(s): ${opts.unknown.join(", ")} — run with --help`)
		return 1
	}
	if (opts.write && opts.mode !== "refresh") {
		emitJson(opts, { mode: opts.mode, ok: false, error: "--write is only valid with --refresh" })
		if (!opts.json) logError(TAG, "--write is only valid with --refresh")
		return 1
	}

	if (opts.mode === "refresh") {
		const { code, payload } = await runRefresh(opts)
		emitJson(opts, payload)
		return code
	}
	return await runVerify(opts)
}

// Only run when executed directly (not when imported by the spec).
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
	main()
		.then((code) => {
			process.exit(code)
		})
		.catch((error) => {
			logError(TAG, `unexpected error: ${error instanceof Error ? error.message : String(error)}`)
			process.exit(1)
		})
}
