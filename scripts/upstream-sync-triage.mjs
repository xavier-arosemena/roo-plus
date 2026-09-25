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
 *              Reports `CHECK_IDS_FULL.length` independent checks (derive the
 *              number from the constant, never trust prose). `CHECK_IDS_REPO_ONLY`
 *              is the subset that needs no merge base and runs in a `--depth=1`
 *              checkout (`--repo-only`):
 *                1. row-sha-format        every row SHA is the canonical 9-char prefix
 *                2. row-sha-resolves      every row SHA resolves in the repo
 *                3. row-parse             every data row in a commit table parses
 *                                         into a row — a row whose SHA cell lost its
 *                                         backticks is invisible to coverage, and
 *                                         repo-only used to go BLIND to it (CP1-8)
 *                4. duplicates            no row SHA appears twice
 *                5. synced-fork-sha       every `☑` row carries a fork SHA reachable
 *                                         from the fork ref (runbook R9) AND records
 *                                         `Resolved:` and `Version`
 *                6. stale-in-progress     every `◐` row that records a fork SHA is
 *                                         NOT already reachable from the fork ref;
 *                                         a landed `◐` row is stale and must be
 *                                         flipped to `☑`. WARNING by default;
 *                                         `--strict` promotes it to a failure.
 *                7. exception-advisory    ADVISORY: a dated `Exception` older than
 *                                         `EXCEPTION_RECONFIRM_DAYS` needs
 *                                         re-confirmation. Reported by SHA (CP1-9).
 *                8. header-tip            the header's Upstream tip is a canonical
 *                                         SHA that resolves in this repo
 *              The remaining checks only the full profile runs (F-A-7):
 *                9. coverage              every commit in merge-base..upstream/main
 *                                         has exactly one row, and no row points
 *                                         outside that range
 *               10. class-ladder          HARD: `A-CLEAN` ⇒ Δ 0. An `A-CLEAN` label
 *                                         asserts pickability, so Δ>0 is a false
 *                                         claim: reclassify the row, or record a
 *                                         dated exception with a reason of at
 *                                         least `MIN_EXCEPTION_REASON_LENGTH`
 *                                         characters (CP1-9). The `Blocked-by`
 *                                         clause of the old ladder is NOT here —
 *                                         readiness is derived, not a class (F-A-4),
 *                                         so it is reported as `blocked-by-pending`
 *                                         + the ready set.
 *               11. class-ladder-advisory ADVISORY, never fatal: `B-CAREFUL` ⇒
 *                                         1 ≤ Δ ≤ 5. Δ>5 means "inspect before
 *                                         picking" — a human judgement, not a
 *                                         misclassification to auto-correct
 *                                         (WS-1b ruling, H-02 amendment).
 *               12. blocked-by            HARD: every `Blocked-by` token names a
 *                                         DIFFERENT row in this register. The
 *                                         literal `unknown` is forbidden (a named
 *                                         unknown is worse than an empty cell);
 *                                         `—` is the empty cell to write instead.
 *               13. blocked-by-pending    ADVISORY, never fatal: a `Blocked-by`
 *                                         prerequisite that has not landed. A
 *                                         correctly blocked row is precisely one
 *                                         whose blocker has not landed, so this is
 *                                         a readiness fact, not a data defect.
 *               14. discard-rationale     every `✖` row carries a rationale, inline
 *                                         or in its batch's **Rationale.** block
 *               15. header-pending-count  the header's pending count, merge base
 *                                         and tip agree with git
 *               16. landed-unflipped      HARD: no `☐`/`◐` row's change is already
 *                                         in the fork — by patch identity
 *                                         (`git cherry -v <forkRef> upstream/main`
 *                                         marks the upstream commit `-`, and the
 *                                         matching fork commit is named as
 *                                         evidence) or because the row already
 *                                         records `Resolved:`/`Version` while still
 *                                         `☐`. Needs history, so it is FULL-profile
 *                                         only (CP1-2). This is the "update the
 *                                         table to ☑ when the commit lands" control.
 *               17. synced-upstream-ancestry HARD (F-F-5/H-22): every `☑` row's
 *                                         UPSTREAM SHA resolves AND is an ancestor
 *                                         of `upstream/main`. `synced-fork-sha`
 *                                         proves the fork side; this proves the
 *                                         upstream side, so a fabricated or
 *                                         mistyped `-x` SHA is caught by row SHA.
 *                                         References `upstream/main` → FULL profile
 *                                         only (`--repo-only` keeps its
 *                                         merge-base-free guarantee).
 *               18. provenance            (F-F-1/H-22) every `☑` row's upstream
 *                                         commit carries a signature from an
 *                                         allow-listed signer (default: the GitHub
 *                                         web-flow identity; extend with
 *                                         `--allow-signer` or the
 *                                         UPSTREAM_SIGNER_ALLOWLIST env var).
 *                                         `invalid` (bad/expired/revoked/unsigned,
 *                                         or a good signature from a signer that is
 *                                         not allow-listed) FAILS; `unverifiable`
 *                                         (no keyring, `%G?` = E) is an ADVISORY
 *                                         unless `--signature-strict` is passed.
 *                                         FULL profile only.
 *              Also prints a per-batch progress roll-up (resolved vs pending), the
 *              derived READY SET and every dated EXCEPTION.
 *
 *              FOUR FINDING LEVELS (an operator sees all four):
 *                fail          an `error`-severity check reported a defect — a
 *                              false claim about the register. Exit 1.
 *                advisory      a `warning`-severity check reported a judgement
 *                              call (stale `◐`, `B-CAREFUL` Δ>5, an aged
 *                              exception, unlanded prerequisite). Printed, never
 *                              fatal — `--strict` promotes stale `◐` rows only.
 *                informational the derived ready set (`A-CLEAN` ∧ Δ 0 ∧ no
 *                              `Blocked-by` ∧ still open) and the inspect-first
 *                              list. Never affects the exit code.
 *                exception     a dated `Exception` cell on a row that honours a
 *                              decision already recorded. Its ONLY permitted use
 *                              is the `A-CLEAN` ⇒ Δ 0 clause; every excepted row
 *                              is printed BY SHA so an exception can never be
 *                              silent.
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
 *   - Row cells are resolved BY HEADER NAME, never by fixed index (F-B-1).
 *     Inserting a column before `Status` used to make the parser read the
 *     `Blocked-by` cell as the status, so `synced` became false for genuinely
 *     `☑` rows and `synced-fork-sha` / `stale-in-progress` went QUIET (a false
 *     negative, which is worse than a red). A row table is a table whose first
 *     header cell is `SHA`.
 *   - STATUS CONTRACT (one marker, one meaning):
 *       `☑ <fork-sha>` merged — MUST also carry `Resolved:` and `Version`
 *       `✖`            deliberately discarded — MUST carry a rationale
 *       `☐` pending · `◐ <fork-sha>` in flight · `⏸` deferred
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
 *   node scripts/upstream-sync-triage.mjs --verify --repo-only     # merge-base-free subset
 *   node scripts/upstream-sync-triage.mjs --refresh          # dry run
 *   node scripts/upstream-sync-triage.mjs --refresh --write  # update register
 *   node scripts/upstream-sync-triage.mjs --help
 *
 * Exit codes:
 *   0  register verified, or refreshed, or (default) skipped — upstream unavailable
 *      (advisories — stale `◐`, `B-CAREFUL` Δ>5, unlanded prerequisite — and the
 *      informational ready set / exceptions are NOT failures, so this also exits 0)
 *   1  a register check failed, or the merge base is unusable (shallow clone)
 *      and --strict was given, or upstream was unavailable and --strict was given,
 *      or stale `◐` rows were found and --strict was given
 *
 * `--verify --repo-only` runs the `CHECK_IDS_REPO_ONLY` profile (merge-base-free)
 * and issues NO git command that references `upstream/main` or computes the
 * upstream merge base — the `header-pending-count`, `coverage` and
 * `landed-unflipped` checks (which do) are invoked only in the full profile
 * (CP1-3). That lets CI gate the register in the exact clone shape it ships in (a
 * `--depth=1` checkout with no usable merge base — F-D-2/F-G-5). Quantities the
 * profile cannot evaluate (`pendingCommits`, `missing`, `unexpected`) are `null`
 * in `--json`, never `0` (CP1-7).
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
/**
 * The remediation a shallow clone needs before triage is meaningful. An unshallow
 * is the only fetch that guarantees the register's recorded baseline tip is an
 * ancestor of `upstream/main` — the H-01 post-condition the guard asserts.
 */
export const DEPTHEN_COMMAND = "git fetch --unshallow upstream main"
/** Bounded alternative when a full unshallow is undesirable (H-01 remediation). */
export const DEEPEN_SINCE_COMMAND = "git fetch --shallow-since=<date> upstream main"
/**
 * Bounded fallback window for a `--deepen` fetch, used only when the register
 * carries no usable baseline date (H-01: prefer `--shallow-since=<date>`).
 */
export const DEEPEN_FALLBACK = 400
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
 * Pending marker. A `☐` row is open work. The `landed-unflipped` check fails a
 * `☐` row whose change is already in the fork by patch identity (CP1-2), and a
 * `☐` row that already records `Resolved:`/`Version` — both are "landed but the
 * table was never flipped to ☑", which is exactly what the maintainer asked the
 * register to detect.
 */
export const PENDING_MARKER = "☐"
/**
 * In-progress marker. A `◐` row records the fork SHA of an in-flight pick in the
 * same Status cell (e.g. `| … | ◐ f4287ff4f |`); once that SHA is reachable from
 * the fork ref the row is stale and must be flipped to `☑`.
 */
export const IN_PROGRESS_MARKER = "◐"
/** Deliberately-discarded marker. A `✖` row must carry a rationale. */
export const DISCARD_MARKER = "✖"
/** Deferred marker — a `⏸` row is pending by decision, not by oversight. */
export const DEFERRED_MARKER = "⏸"
/**
 * The register's placeholder for an empty appended cell. The parser maps it (and
 * a bare `-`) to `""` so "not recorded" has exactly one representation.
 */
export const EMPTY_CELL = "—"
/** Cell values that mean "not recorded". `unknown` is deliberately NOT one. */
export const EMPTY_CELL_RE = /^(|—|–|-|n\/a|none)$/i
/**
 * Header cells of the appended schema, in register order (after `Status`).
 *
 * `Exception` is the fourth appended cell (WS-1b): a dated token that honours a
 * decision already recorded for a row. Unused cells carry the `—` placeholder,
 * exactly like the other appended cells.
 */
export const BLOCKED_BY_COLUMN = "Blocked-by"
export const RESOLVED_COLUMN = "Resolved:"
export const VERSION_COLUMN = "Version"
export const EXCEPTION_COLUMN = "Exception"
/**
 * The literal token the `Blocked-by` column must never contain: a named `unknown`
 * is worse than an empty cell because it looks like a resolved reference.
 */
export const UNKNOWN_BLOCKED_BY_TOKEN = "unknown"
/**
 * The exception-token grammar: `excepted <YYYY-MM-DD> — <reason>`. Dated and
 * free-text on purpose — an exception must be traceable to a decision, and an
 * undated or unparseable token is a hard `class-ladder` failure.
 */
export const EXCEPTION_TOKEN_RE = /^excepted\s+(\d{4}-\d{2}-\d{2})\s*[—–-]\s*(\S.*)$/i
/**
 * Minimum reason length for an `Exception` token (CP1-9). A bare date plus a
 * token like "ok" is not a decision record, so a short reason is a hard
 * `class-ladder` failure alongside an undated one.
 */
export const MIN_EXCEPTION_REASON_LENGTH = 20
/**
 * Days after which a dated `Exception` is reported as an ADVISORY for
 * re-confirmation (CP1-9). Never fatal: re-confirming a decision is a human act,
 * so this is a `warning`-severity check reported by SHA, not a defect.
 */
export const EXCEPTION_RECONFIRM_DAYS = 90

/**
 * Default allow-listed signer identity (F-F-1 / H-22). Upstream signs every
 * commit with GitHub's web-flow key, so `%GS` reads `GitHub <noreply@github.com>`.
 * The allow-list is deliberately a *list* — repeatable `--allow-signer <identity>`
 * wins over the comma-separated `UPSTREAM_SIGNER_ALLOWLIST` env var — so a future
 * signer is a configuration change, not a code change.
 */
export const GITHUB_WEBFLOW_SIGNER = "GitHub <noreply@github.com>"
export const DEFAULT_ALLOWED_SIGNERS = [GITHUB_WEBFLOW_SIGNER]

/**
 * git's `%G?` code → the coarse decision input.
 *
 * `E` is the ONLY code that means "this machine cannot tell" (no keyring), so it
 * must never be conflated with a bad signature: treating it as invalid would make
 * the tool unusable on every machine without a keyring. `N` (no signature) is
 * deliberately `invalid`: an unsigned commit carries no provenance at all, and
 * H-22 requires an unsigned `-x` SHA to fail. Anything not listed fails closed.
 */
export const SIGNATURE_VALIDITY = new Map([
	["G", "valid"], // good signature
	["U", "valid"], // good signature, key validity unknown (the allow-list decides)
	["B", "invalid"], // BAD signature
	["X", "invalid"], // good signature, key expired
	["Y", "invalid"], // good signature, key expired
	["R", "invalid"], // good signature, key revoked
	["N", "invalid"], // no signature at all
	["E", "unverifiable"], // cannot be checked here (no keyring)
])

/** The three provenance outcomes. `invalid` FAILS; `unverifiable` is an advisory. */
export const SIGNATURE_OUTCOMES = ["valid", "invalid", "unverifiable"]

/**
 * Resolves the signer allow-list: explicit `--allow-signer` values win, then the
 * `UPSTREAM_SIGNER_ALLOWLIST` env var (comma-separated), then the GitHub web-flow
 * default. Pure-ish (reads the env it is handed) — exported for the spec.
 */
export function resolveAllowedSigners(env = process.env, override = []) {
	if (Array.isArray(override) && override.length > 0) return override
	const raw = env ? env.UPSTREAM_SIGNER_ALLOWLIST : undefined
	if (typeof raw === "string" && raw.trim() !== "") {
		return raw
			.split(",")
			.map((entry) => entry.trim())
			.filter(Boolean)
	}
	return DEFAULT_ALLOWED_SIGNERS
}

/** Lowercases a signer identity and extracts its `<email>` when present. Pure. */
export function normaliseSignerIdentity(identity) {
	const text = String(identity ?? "")
		.trim()
		.toLowerCase()
	const email = /<([^>]+)>/.exec(text)
	return { text, email: email ? email[1].trim() : null }
}

/**
 * The provenance DECISION (F-F-1 / H-22): `valid` · `invalid` · `unverifiable`.
 *
 *   valid         a good signature (`G`/`U`) from an allow-listed signer
 *   invalid       the signature is present but bad/expired/revoked/unsigned, or
 *                 it is good but the signer is NOT allow-listed. A false claim
 *                 about provenance, so it FAILS.
 *   unverifiable  the signature exists but this checkout cannot check it
 *                 (`%G?` = `E`, no keyring). An ADVISORY by default and a failure
 *                 only under the explicit `--signature-strict` opt-in — otherwise
 *                 the tool would be unusable on any machine with no keyring.
 *
 * `invalid` and `unverifiable` are therefore NOT interchangeable, which is the
 * whole point of the distinction (a missing keyring is not evidence of a forgery).
 * Pure — exported for the spec.
 */
export function decideProvenance({ validity, signer = "", allowedSigners = DEFAULT_ALLOWED_SIGNERS } = {}) {
	const code = String(validity ?? "")
		.trim()
		.toUpperCase()
	const kind = SIGNATURE_VALIDITY.get(code) ?? "invalid"
	const identity = normaliseSignerIdentity(signer)
	if (kind === "unverifiable") {
		return {
			outcome: "unverifiable",
			code,
			signer: identity.text,
			reason:
				`the signature cannot be checked in this checkout (\`%G?\` = ${code})` +
				`${identity.text ? `, signer \`${identity.text}\`` : ""}`,
		}
	}
	if (kind === "invalid") {
		const detail =
			code === "N" || code === ""
				? "the commit carries NO signature (`%G?` = N) — its provenance is unproven"
				: `git reports \`%G?\` = ${code} — the signature is present but not good`
		return { outcome: "invalid", code: code === "" ? "N" : code, signer: identity.text, reason: detail }
	}
	const list = Array.isArray(allowedSigners) ? allowedSigners : []
	if (list.length === 0) {
		return {
			outcome: "invalid",
			code,
			signer: identity.text,
			reason: "no allow-listed signer is configured, so no signature can be trusted",
		}
	}
	const allowed = list.some((entry) => {
		const candidate = normaliseSignerIdentity(entry)
		if (identity.text !== "" && identity.text === candidate.text) return true
		return Boolean(identity.email && candidate.email && identity.email === candidate.email)
	})
	if (!allowed) {
		return {
			outcome: "invalid",
			code,
			signer: identity.text,
			reason:
				`the signature is good but the signer \`${identity.text || "unknown"}\` is not in the allow-list ` +
				`(${list.join(", ")})`,
		}
	}
	return {
		outcome: "valid",
		code,
		signer: identity.text,
		reason: `good signature from allow-listed \`${identity.text}\``,
	}
}

/** The full commit-table header row, in canonical order. */
export const ROW_TABLE_HEADER = [
	"SHA",
	"Date",
	"Subject",
	"Class",
	"Pri",
	"Δ",
	"Status",
	BLOCKED_BY_COLUMN,
	RESOLVED_COLUMN,
	VERSION_COLUMN,
	EXCEPTION_COLUMN,
]

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
export const DEPENDENCY_MANIFEST_RE =
	/(^|\/)(pnpm-lock\.yaml|pnpm-workspace\.yaml|package\.json|renovate\.json|\.npmrc)$/

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

/**
 * Telemetry subsystem markers. The fork removed the telemetry TRANSPORT (0
 * `captureEvent(` call sites); the token survives in inert scaffolding, so the
 * pattern names the symbol, not the word. The file counts that used to be quoted
 * here were scope-unstable and are deliberately not restated (L6/F-F-4).
 */
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
 * Canonical register column names → row field. `Resolved:` matches as "resolved"
 * (the trailing colon is stripped) and `Blocked-by` as "blocked-by".
 */
export const COLUMN_FIELDS = new Map([
	["sha", "sha"],
	["date", "date"],
	["subject", "subject"],
	["class", "klass"],
	["pri", "priority"],
	["priority", "priority"],
	["δ", "delta"],
	["delta", "delta"],
	["status", "status"],
	["blocked-by", "blockedBy"],
	["blockedby", "blockedBy"],
	["resolved", "resolved"],
	["version", "version"],
	["exception", "exception"],
])

/** Normalises a header cell so name-based column resolution is robust. */
export function normaliseHeaderName(cell) {
	return String(cell ?? "")
		.trim()
		.replace(/`/g, "")
		.replace(/:+$/, "")
		.toLowerCase()
}

/** True when a line is the header row of a commit table (`| SHA | … |`). */
export function isRowTableHeader(line) {
	return /^\|\s*`?sha`?\s*\|/i.test(line)
}

/** Maps row field → column index for one commit-table header row, by NAME. */
export function headerColumnMap(line) {
	const map = new Map()
	splitRowCells(line).forEach((cell, index) => {
		const field = COLUMN_FIELDS.get(normaliseHeaderName(cell))
		if (field && !map.has(field)) map.set(field, index)
	})
	return map
}

/** Trims a cell and maps the register's empty placeholder to "". Pure. */
export function cleanCell(value) {
	const text = String(value ?? "").trim()
	return EMPTY_CELL_RE.test(text) ? "" : text
}

/** Splits a `Blocked-by` cell into its tokens (a SHA list, or `unknown`). Pure. */
export function parseBlockedBy(value) {
	const text = cleanCell(value)
	if (!text) return []
	return text
		.split(/[,;/]+/)
		.map((token) => token.replace(/`/g, "").trim())
		.filter(Boolean)
}

/**
 * Parses an `Exception` cell.
 *
 * `null` when the cell is empty (the `—` placeholder), `{ malformed }` when a
 * token is present but is not the documented dated form, `{ date, reason }` when
 * it is. A malformed token is deliberately NOT read as "no exception": an
 * undated exception could hide a decision, which is the one thing this mechanism
 * must never allow.
 * Pure — exported for the spec.
 */
export function parseException(value) {
	const text = cleanCell(value)
	if (!text) return null
	const match = EXCEPTION_TOKEN_RE.exec(text)
	if (!match) return { malformed: text }
	const reason = match[2].trim()
	/**
	 * A dated token with a token-length reason ("ok") is not a decision record
	 * (CP1-9). It is reported as malformed so `class-ladder` fails it by SHA,
	 * rather than being read as a usable exception.
	 */
	if (reason.length < MIN_EXCEPTION_REASON_LENGTH) {
		return { malformed: text, reasonTooShort: true, reason }
	}
	return { date: match[1], reason }
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
 * The `YYYY-MM-DD` a baseline-table value is annotated with, e.g.
 * `` `252c69b5` (2026-08-20, "fix: …") `` → `2026-08-20`. `null` when absent.
 * Pure — exported for the spec.
 */
export function parseHeaderDate(value) {
	const match = /\((\d{4}-\d{2}-\d{2})[,)]/.exec(String(value ?? ""))
	return match ? match[1] : null
}

/**
 * Reads the two-cell `Field | Value` baseline table at the top of the register.
 *
 * Also captures the annotated date of the merge base and the upstream tip
 * (`*Date`), because the deterministic deepen (H-01) is derived from them rather
 * than from a hardcoded window. Pure — exported for the spec.
 */
export function parseBaseline(markdown) {
	const baseline = {
		mergeBase: null,
		mergeBaseDate: null,
		upstreamTip: null,
		upstreamTipDate: null,
		forkTip: null,
		pendingCount: null,
	}
	for (const line of markdown.split("\n")) {
		const cells = /^\|\s*([^|]+?)\s*\|(.*)\|\s*$/.exec(line)
		if (!cells) continue
		const field = cells[1].trim()
		const value = cells[2].trim()
		const sha = /`([0-9a-fA-F]{4,40})`/.exec(value)
		if (field === "Merge base") {
			baseline.mergeBase = sha ? sha[1] : null
			baseline.mergeBaseDate = parseHeaderDate(value)
		} else if (field === "Upstream tip") {
			baseline.upstreamTip = sha ? sha[1] : null
			baseline.upstreamTipDate = parseHeaderDate(value)
		} else if (field === "Fork tip") baseline.forkTip = sha ? sha[1] : null
		else if (field === "Pending upstream commits") {
			const count = /\*\*(\d+)\*\*/.exec(value) || /(\d+)/.exec(value)
			baseline.pendingCount = count ? Number(count[1]) : null
		}
	}
	return baseline
}

/**
 * Parses every commit row (row-scoped) plus the `SYNC-n` sections that own them.
 *
 * Cells are resolved BY HEADER NAME when the row's table has a `| SHA | … |`
 * header, and only fall back to the historical fixed indices when it does not
 * (F-B-1). Adding `Blocked-by`/`Resolved:`/`Version` before `Status`, or after
 * it, can therefore never make `status` read the wrong cell and go quiet.
 * Pure — exported for the spec.
 */
export function parseRegister(markdown) {
	const lines = markdown.split("\n")
	const rows = []
	const sections = []
	/** Column map of the most recent commit-table header; null before any. */
	let columns = null
	for (let i = 0; i < lines.length; i++) {
		const heading = /^##\s+(SYNC-\d+)\b(.*)$/.exec(lines[i])
		if (heading) {
			sections.push({ id: heading[1], line: i + 1, suffix: heading[2].trim(), rows: [] })
		}
		if (isRowTableHeader(lines[i])) columns = headerColumnMap(lines[i])
		const match = ROW_SHA_RE.exec(lines[i])
		if (!match) continue
		const cells = splitRowCells(lines[i])
		/**
		 * Name-based lookup; the legacy index is used ONLY when the table never
		 * declared a header. The appended columns then read as "not recorded"
		 * rather than as whatever happens to sit at that offset (F-B-1).
		 */
		const pick = (field, legacyIndex) => {
			const index = columns ? columns.get(field) : legacyIndex
			return index === undefined || index === null ? "" : (cells[index] ?? "")
		}
		const statusCell = pick("status", 6)
		const blockedBy = cleanCell(pick("blockedBy", undefined))
		const exception = cleanCell(pick("exception", undefined))
		const row = {
			line: i + 1,
			sha: match[1],
			raw: lines[i],
			date: pick("date", 1),
			subject: pick("subject", 2),
			klass: pick("klass", 3).replace(/`/g, "").trim(),
			priority: pick("priority", 4),
			delta: pick("delta", 5),
			status: statusCell,
			synced: statusCell.includes(SYNCED_MARKER),
			forkSha: extractForkSha(statusCell),
			inProgress: statusCell.includes(IN_PROGRESS_MARKER),
			inProgressSha: extractMarkerSha(statusCell, IN_PROGRESS_MARKER),
			discarded: statusCell.includes(DISCARD_MARKER),
			blockedBy,
			blockedByTokens: parseBlockedBy(blockedBy),
			resolved: cleanCell(pick("resolved", undefined)),
			version: cleanCell(pick("version", undefined)),
			exception,
			exceptionInfo: parseException(exception),
			sectionId: sections.length > 0 ? sections[sections.length - 1].id : null,
		}
		rows.push(row)
		if (sections.length > 0) sections[sections.length - 1].rows.push(row)
	}
	return { rows, sections, baseline: parseBaseline(markdown) }
}

/**
	* Data-looking lines inside a commit table that did NOT parse into a row (CP1-8).
	*
	* A row whose SHA cell lost its backticks (`| e12a42e7a | 2026-09-05 | … |`)
	* matches neither `ROW_SHA_RE` nor the coverage cross-check, so it simply
	* disappears: `coverage` cannot see the commit it should have documented, and the
	* repo-only profile — which never computes coverage — goes BLIND and exits 0.
	* This scans each table introduced by a `| SHA | … |` header, skips the header and
	* its `| --- |` separator, and reports every remaining `|`-leading line that did
	* not parse as a row, naming the line number and text. Pure — exported for the spec.
	*/
export function findUnparsedRowLines(markdown) {
	const lines = markdown.split("\n")
	const unparsed = []
	let inTable = false
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]
		if (isRowTableHeader(line)) {
			inTable = true
			continue
		}
		if (!inTable) continue
		// A commit table ends at the first line that is not a `|`-leading row.
		if (!/^\s*\|/.test(line)) {
			inTable = false
			continue
		}
		const cells = splitRowCells(line)
		// Skip the `| --- | ---- | - |` separator: every content cell is dashes
		// (the Δ column separator is a single `-`). A data row never has an
		// all-dashes content row, so this cannot mask a real row.
		if (cells.length > 0 && cells.every((cell) => /^:?-+:?$/.test(cell))) continue
		if (ROW_SHA_RE.test(line)) continue
		unparsed.push({ line: i + 1, text: line.trim() })
	}
	return unparsed
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
export function crossCheckRows(rows, pendingShas = null) {
	/**
	 * `--repo-only` has no merge-base range and therefore no pending list: only
	 * `duplicates` is computable from the rows alone. Without a list, `missing`
	 * and `unexpected` are meaningless (every row would look "unexpected"), so
	 * they are reported as empty rather than invented (F-A-7).
	 */
	const hasPendingList = Array.isArray(pendingShas) && pendingShas.length > 0
	const expected = hasPendingList ? pendingShas.map((sha) => sha.slice(0, ROW_SHA_LENGTH)) : []
	const expectedSet = new Set(expected)
	const seen = new Map()
	for (const row of rows) {
		seen.set(row.sha, (seen.get(row.sha) ?? 0) + 1)
	}
	const duplicates = [...seen.entries()].filter(([, count]) => count > 1).map(([sha, count]) => ({ sha, count }))
	const rowSet = new Set(rows.map((row) => row.sha))
	const missing = expected.filter((sha) => !rowSet.has(sha))
	const unexpected = hasPendingList ? [...rowSet].filter((sha) => !expectedSet.has(sha)) : []
	return { expected, duplicates, missing, unexpected }
}

// ---------------------------------------------------------------------------
// Register validation (pure, via an injected probe)
// ---------------------------------------------------------------------------

/**
 * The DERIVED READY SET (F-A-4) — informational only, never an exit code.
 *
 * `A-CLEAN` ∧ Δ = 0 ∧ no `Blocked-by` ∧ still open. A ready set is a *predicate
 * over the register*, not a class: the plan's §5 ready set wrongly included
 * `B-CAREFUL`, which is defined by Δ ≥ 1, so `B-CAREFUL ∧ Δ = 0` is empty by
 * construction. `B-CAREFUL` rows are therefore reported separately (see
 * `buildInspectFirst`) instead of being conflated with "pickable today".
 *
 * "Open" excludes the resolved (`☑`), discarded (`✖`), in-flight (`◐`) and
 * deferred (`⏸`) markers: "what can be picked today" cannot include a row that
 * has already landed or has been deliberately parked.
 * Pure — exported for the spec.
 */
export function buildReadySet(rows) {
	return rows
		.filter((row) => row.klass === "A-CLEAN")
		.filter((row) => row.delta !== "" && Number(row.delta) === 0)
		.filter((row) => row.blockedByTokens.length === 0)
		.filter((row) => !row.synced && !row.discarded && !row.inProgress)
		.filter((row) => !row.status.includes(DEFERRED_MARKER))
		.map((row) => ({
			line: row.line,
			sha: row.sha,
			priority: row.priority,
			sectionId: row.sectionId,
			subject: row.subject,
		}))
}

/**
 * The INSPECT-FIRST list: `B-CAREFUL` rows whose Δ falls outside 1–5. This is
 * exactly the advisory set reported by `class-ladder-advisory`; keeping it in one
 * pure function stops the check and the informational report from ever diverging.
 * Pure — exported for the spec.
 */
export function buildInspectFirst(rows) {
	const outsideLadder = (row) => {
		const delta = row.delta === "" ? Number.NaN : Number(row.delta)
		return !(Number.isInteger(delta) && delta >= 1 && delta <= 5)
	}
	return rows.filter((row) => row.klass === "B-CAREFUL" && outsideLadder(row)).map((row) => {
		const delta = row.delta === "" ? Number.NaN : Number(row.delta)
		return {
			line: row.line,
			sha: row.sha,
			delta: Number.isInteger(delta) ? delta : null,
			priority: row.priority,
			sectionId: row.sectionId,
			subject: row.subject,
		}
	})
}

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
 * Check ids reported by the full `--verify`. Every repo-only id runs here too,
 * plus the ones that need history the repo-only profile cannot assume:
 *   - `coverage` and `header-pending-count` need `merge-base..upstream/main`;
 *   - `landed-unflipped` needs the fork↔upstream patch-id comparison
 *     (`git cherry`), which is only meaningful once a real merge base resolves
 *     (CP1-2), so it is deliberately FULL-profile only;
 *   - `class-ladder`, `class-ladder-advisory`, `blocked-by`,
 *     `blocked-by-pending` and `discard-rationale` assert invariants the register
 *     itself carries.
 * The counts are derived from `.length`, never hardcoded in prose.
 *
 * The last two are the provenance pair (WS-4 / F-F-1 / F-F-5 / H-22) and are
 * FULL-profile only, because both consult `upstream/main`: an ancestry assertion
 * needs it directly, and keeping the pair out of `--repo-only` is what preserves
 * that profile's "no `upstream` / no merge-base git call" guarantee.
 */
export const CHECK_IDS_FULL = [
	"row-sha-format",
	"row-sha-resolves",
	"row-parse",
	"coverage",
	"duplicates",
	"synced-fork-sha",
	"stale-in-progress",
	"class-ladder",
	"class-ladder-advisory",
	"exception-advisory",
	"blocked-by",
	"blocked-by-pending",
	"discard-rationale",
	"header-tip",
	"header-pending-count",
	"landed-unflipped",
	"synced-upstream-ancestry",
	"provenance",
]

/**
 * Check ids that need NO merge base — exactly what `--verify --repo-only` runs.
 * This is the profile CI can gate in the clone shape the repo ships in
 * (F-D-2/F-G-5): a `--depth=1` checkout has no merge base, so anything derived
 * from `merge-base..upstream/main` would be red by construction. `row-parse`
 * (CP1-8) and `exception-advisory` (CP1-9) are pure markdown checks, so they run
 * in BOTH profiles — that is what stops repo-only going blind to a row whose SHA
 * cell lost its backticks. It never invokes a git command that references
 * `upstream` or computes the upstream merge base (CP1-3).
 */
export const CHECK_IDS_REPO_ONLY = [
	"row-sha-format",
	"row-sha-resolves",
	"row-parse",
	"duplicates",
	"synced-fork-sha",
	"stale-in-progress",
	"exception-advisory",
	"header-tip",
]

/** The two `--verify` profiles. */
export const VERIFY_PROFILES = ["full", "repo-only"]

/**
 * Whether one `SYNC-n` section documents a rationale. That is where a `✖` row
 * may defer its reason to (the register records per-batch rationale blocks; it
 * has no per-row rationale column by design — H-02 appends only
 * `Blocked-by`/`Resolved:`/`Version`).
 * Pure — exported for the spec.
 */
export function sectionHasRationale(lines) {
	const index = lines.findIndex((line) => /Rationale/i.test(line) && !/^\s*#/.test(line))
	if (index === -1) return false
	if (/\*{0,2}Rationale\*{0,2}\.?:?\s+\S/i.test(lines[index])) return true
	return lines.slice(index + 1).some((line) => {
		const text = line.trim()
		return text !== "" && !text.startsWith("|") && !text.startsWith("#") && !text.startsWith("---")
	})
}

/** The body lines of one `SYNC-n` section, excluding its heading. Pure. */
export function sectionLines(lines, sections, sectionId) {
	const index = sections.findIndex((section) => section.id === sectionId)
	if (index === -1) return []
	const end = index + 1 < sections.length ? sections[index + 1].line - 1 : lines.length
	return lines.slice(sections[index].line, end)
}

/**
 * Runs the independent register checks against an injected `probe` so the whole
 * thing is unit-testable without touching git.
 *
 * `probe` supplies the repo facts:
 *   commitType(sha)             → "commit" | "tree" | "blob" | null  (git cat-file -t)
 *   isReachableFromForkRef(sha) → boolean                            (git merge-base --is-ancestor)
 *   upstreamTip()               → full SHA of upstream/main
 *   mergeBase()                 → full SHA of merge-base upstream/main <forkRef>
 *   landedByPatchId()           → [{ upstreamSha, forkSha }] — upstream commits
 *                                 whose patch-id is already in the fork
 *                                 (`git cherry -v <forkRef> upstream/main` marks
 *                                 them `-`). Needs a merge base → full profile.
 *
 * `forkRef` is the resolved fork ref shared by the `☑` (`synced-fork-sha`) and
 * `◐` (`stale-in-progress`) checks; it is threaded into their titles and
 * messages so an operator sees exactly what was compared.
 *
 * `pendingShas` is the `merge-base..upstream/main` commit list. Pass `null` (the
 * `repo-only` profile) and `coverage` is not reported, because it cannot be
 * computed without a merge base — that is the F-A-7 split. Every quantity that
 * cannot be computed is then reported as `null`, never as a misleading `0`
 * (CP1-7), so no consumer reads "0 pending" from a profile that never measured it.
 *
 * `today` (`YYYY-MM-DD`) is the reference date for the aged-exception advisory
 * (CP1-9); it is a parameter so the advisory is deterministic under test.
 *
 * The full-profile checks that consult `upstreamTip()`/`mergeBase()` — i.e. the
 * ones that shell `git … upstream/main` — are invoked ONLY when the selected
 * profile is `full`, so `--verify --repo-only` never issues an `upstream` or
 * upstream-merge-base git call (CP1-3).
 *
 * Pure — exported for the spec.
 */
export function validateRegister({
	markdown,
	pendingShas = null,
	probe,
	forkRef = FORK_REF,
	profile = "full",
	today = new Date().toISOString().slice(0, 10),
	/**
	 * `--signature-strict` promotes an UNVERIFIABLE signature (`%G?` = `E`, no
	 * keyring) from an advisory to a failure. `invalid` always fails. Default
	 * `false` so the tool stays usable on a machine with no keyring (F-F-1).
	 */
	signatureStrict = false,
	/** Signer allow-list for the provenance decision (default: GitHub web-flow). */
	allowedSigners = DEFAULT_ALLOWED_SIGNERS,
}) {
 const selectedProfile = profile === "repo-only" ? "repo-only" : "full"
 const isFull = selectedProfile === "full"
 const { rows, sections, baseline } = parseRegister(markdown)
 const cross = crossCheckRows(rows, pendingShas)
 const hasPendingList = Array.isArray(pendingShas) && pendingShas.length > 0
	const lines = markdown.split("\n")
	const rationaleBySection = new Map(
		sections.map((section) => [section.id, sectionHasRationale(sectionLines(lines, sections, section.id))]),
	)

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

	// 2b — a data-looking line in a commit table that did NOT parse into a row is
	// invisible to `coverage`, and the repo-only profile (which never computes
	// coverage) used to go BLIND to it and exit 0. Fails by LINE so the exact
	// mistyped row is named (CP1-8). Pure markdown → runs in BOTH profiles.
	const parseCheck = makeCheck("row-parse", "every data row in a commit table parses into a register row")
	for (const { line, text } of findUnparsedRowLines(markdown)) {
		fail(
			parseCheck,
			`line ${line}: a table row did not parse into a register row — a row SHA cell must carry its ` +
				`backticks (the row-scoped matcher is ${String(ROW_SHA_RE)}): ${text}`,
		)
	}

	// 3 — coverage of merge-base..upstream/main, and no rows outside it. Skipped
	// (and not reported) without a pending list: `--repo-only` has no range.
	const coverageCheck = makeCheck("coverage", "every pending upstream commit has exactly one row")
	if (hasPendingList) {
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
	}

	// 4 — no duplicate rows.
	const duplicateCheck = makeCheck("duplicates", "no row SHA appears more than once")
	for (const duplicate of cross.duplicates) {
		const lines = rows.filter((row) => row.sha === duplicate.sha).map((row) => row.line)
		fail(duplicateCheck, `\`${duplicate.sha}\` appears ${duplicate.count}× (lines ${lines.join(", ")})`)
	}

	// 5 — the `☑` contract: fork SHA reachable from the resolved fork ref (runbook
	// R9) AND both `Resolved:` and `Version` recorded. `☑` means merged and
	// released; without the date and the version the claim is unfalsifiable and
	// H-12's metrics have no input (F-A-3).
	const syncedCheck = makeCheck(
		"synced-fork-sha",
		`every ${SYNCED_MARKER} row records a fork SHA reachable from ${forkRef}, plus ${RESOLVED_COLUMN} and ${VERSION_COLUMN}`,
	)
	for (const row of rows) {
		if (!row.synced) continue
		if (!row.forkSha) {
			fail(
				syncedCheck,
				`line ${row.line}: \`${row.sha}\` is marked ${SYNCED_MARKER} but records no fork SHA (runbook R9)`,
			)
		} else if (!probe.isReachableFromForkRef(row.forkSha)) {
			fail(
				syncedCheck,
				`line ${row.line}: \`${row.sha}\` claims fork SHA \`${row.forkSha}\`, which is not reachable from ${forkRef}`,
			)
		}
		if (!row.resolved) {
			fail(
				syncedCheck,
				`line ${row.line}: \`${row.sha}\` is marked ${SYNCED_MARKER} but records no ${RESOLVED_COLUMN} date`,
			)
		}
		if (!row.version) {
			fail(
				syncedCheck,
				`line ${row.line}: \`${row.sha}\` is marked ${SYNCED_MARKER} but records no ${VERSION_COLUMN}`,
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

	// 7 — the HARD half of the class ↔ Δ ladder: `A-CLEAN` ⇒ Δ = 0.
	//
	// An `A-CLEAN` label ASSERTS pickability ("no overlap with any fork-touched
	// file → direct cherry-pick"), so Δ>0 is a false claim about the register. The
	// remedy is the data (reclassify the row) or, for a row whose decision is
	// already history, a dated `Exception` token that `--verify` prints BY SHA so
	// an exception can never be silent.
	//
	// Two clauses are deliberately NOT here (WS-1b ruling, H-02 amendment):
	//   · `B-CAREFUL` ⇒ 1 ≤ Δ ≤ 5 — a judgement call, reported by
	//     `class-ladder-advisory` and never fatal;
	//   · the old `A-CLEAN ⇒ no Blocked-by` clause — `A-CLEAN` + a recorded
	//     prerequisite is a READINESS fact, not a class defect (a correctly blocked
	//     row is precisely one whose blocker has not landed), so it is reported by
	//     `blocked-by-pending` and excluded from the derived ready set (F-A-4).
	const ladderCheck = makeCheck("class-ladder", `the hard class invariant holds (\`A-CLEAN\` ⇒ Δ = 0)`)
	const exceptions = []
	for (const row of rows) {
		const delta = row.delta === "" ? Number.NaN : Number(row.delta)
		const recordedDelta = row.delta === "" ? "(not recorded)" : row.delta
		const violatesCleanRule = row.klass === "A-CLEAN" && delta !== 0
		if (row.exception !== "") {
			const token = row.exceptionInfo
			if (!token || token.malformed !== undefined) {
				const detail =
					token && token.reasonTooShort
						? `its reason is ${token.reason.length} character(s), below the ${MIN_EXCEPTION_REASON_LENGTH}-character minimum (CP1-9)`
						: "it is not a dated token"
				fail(
					ladderCheck,
					`line ${row.line}: \`${row.sha}\` carries an ${EXCEPTION_COLUMN} cell \`${row.exception}\` that is not ` +
						`usable — ${detail}; write \`excepted <YYYY-MM-DD> — <reason of at least ${MIN_EXCEPTION_REASON_LENGTH} characters>\``,
				)
				continue
			}
			if (!violatesCleanRule) {
				fail(
					ladderCheck,
					`line ${row.line}: \`${row.sha}\` records an exception (\`${row.exception}\`) but does not violate ` +
						`\`A-CLEAN\` ⇒ Δ = 0 — an exception may only honour a decision that was already recorded; remove the cell`,
				)
				continue
			}
			exceptions.push({
				line: row.line,
				sha: row.sha,
				date: token.date,
				reason: token.reason,
				subject: row.subject,
			})
			continue
		}
		if (violatesCleanRule) {
			fail(
				ladderCheck,
				`line ${row.line}: \`${row.sha}\` is \`A-CLEAN\` but Δ = ${recordedDelta} — A-CLEAN requires Δ = 0 ` +
					`(F-C-2); reclassify the row, or record a dated \`${EXCEPTION_COLUMN}\` token`,
			)
		}
	}

	// 7a-bis — an AGED exception is reported for re-confirmation (CP1-9), never as
	// a defect: re-confirming a recorded decision is a human act. Reported BY SHA.
	const exceptionAgeCheck = makeCheck(
		"exception-advisory",
		`advisory: a dated ${EXCEPTION_COLUMN} older than ${EXCEPTION_RECONFIRM_DAYS} days needs re-confirmation`,
		{ severity: "warning" },
	)
	const agedExceptions = []
	for (const exception of exceptions) {
		const ageDays = daysBetween(exception.date, today)
		if (ageDays !== null && ageDays > EXCEPTION_RECONFIRM_DAYS) {
			warn(
				exceptionAgeCheck,
				`line ${exception.line}: \`${exception.sha}\` carries an ${EXCEPTION_COLUMN} dated ${exception.date} ` +
					`(${ageDays} days old) — re-confirm the decision or close the row (advisory only: the run stays green)`,
			)
			agedExceptions.push({ ...exception, ageDays })
		}
	}

	// 7b — the ADVISORY half: `B-CAREFUL` ⇒ 1 ≤ Δ ≤ 5. Reported, never fatal:
	// Δ>5 means "inspect before picking" (runbook §2 stop condition) — a human
	// judgement, not a misclassification the tool may auto-correct. The same set is
	// printed as the separate inspect-first list.
	const advisoryCheck = makeCheck(
		"class-ladder-advisory",
		`advisory: \`B-CAREFUL\` rows sit inside 1 ≤ Δ ≤ 5 (Δ > 5 needs inspection before picking)`,
		{ severity: "warning" },
	)
	const inspectFirst = buildInspectFirst(rows)
	for (const row of inspectFirst) {
		const recordedDelta = row.delta === null ? "(not recorded)" : row.delta
		let reason = "Δ ≤ 0 — probably `A-CLEAN`; re-check the classification"
		if (row.delta === null) reason = "Δ is not a number — re-record it"
		else if (row.delta > 5) reason = "Δ > 5 — inspect before picking (runbook §2 stop condition)"
		warn(
			advisoryCheck,
			`line ${row.line}: \`${row.sha}\` is \`B-CAREFUL\` with Δ = ${recordedDelta} — ${reason} ` +
				`(advisory only: the run stays green)`,
		)
	}

	// 8 — Blocked-by closure (HARD): a token must name a DIFFERENT row of this
	// register, and the literal `unknown` is forbidden — a named unknown looks like
	// a resolved reference while carrying no information, so the real prerequisite
	// SHA (or `—`) is the only correct cell content.
	const blockedCheck = makeCheck(
		"blocked-by",
		`every ${BLOCKED_BY_COLUMN} token names a different row in this register (never \`${UNKNOWN_BLOCKED_BY_TOKEN}\`)`,
	)
	// 8b — readiness, NOT a data defect: a prerequisite that has not landed is
	// exactly what "blocked" means, so it is a warning. WS-1 made it a hard
	// failure, which turned every correctly blocked row red.
	const blockedPendingCheck = makeCheck(
		"blocked-by-pending",
		`advisory: a ${BLOCKED_BY_COLUMN} prerequisite that has not landed yet (correctly blocked, not a defect)`,
		{ severity: "warning" },
	)
	const rowBySha = new Map(rows.map((row) => [row.sha, row]))
	const blockedByPending = []
	for (const row of rows) {
		for (const token of row.blockedByTokens) {
			if (token.toLowerCase() === UNKNOWN_BLOCKED_BY_TOKEN) {
				fail(
					blockedCheck,
					`line ${row.line}: \`${row.sha}\` records the literal \`${token}\` in ${BLOCKED_BY_COLUMN} — a ` +
						`named unknown is worse than an empty cell; write the prerequisite's row SHA or \`${EMPTY_CELL}\``,
				)
				continue
			}
			const target = rowBySha.get(token) ?? rowBySha.get(token.slice(0, ROW_SHA_LENGTH))
			if (!target) {
				fail(
					blockedCheck,
					`line ${row.line}: \`${row.sha}\` records ${BLOCKED_BY_COLUMN} \`${token}\`, which is not a ` +
						`row in this register — record the prerequisite's row SHA or \`${EMPTY_CELL}\``,
				)
				continue
			}
			if (target.sha === row.sha) {
				fail(
					blockedCheck,
					`line ${row.line}: \`${row.sha}\` records itself in ${BLOCKED_BY_COLUMN} — a row cannot be its ` +
						`own prerequisite`,
				)
				continue
			}
			if (!target.synced) {
				warn(
					blockedPendingCheck,
					`line ${row.line}: \`${row.sha}\` is blocked by \`${target.sha}\`, which has not landed — the row ` +
						`is correctly blocked; land the prerequisite first (readiness, not a defect)`,
				)
				blockedByPending.push({ line: row.line, sha: row.sha, blocker: target.sha, subject: row.subject })
			}
		}
	}

	// 9 — a deliberately-discarded row must say why: inline in the Status cell, or
	// in its batch's rationale block.
	const discardCheck = makeCheck("discard-rationale", `every ${DISCARD_MARKER} row carries a rationale`)
	for (const row of rows) {
		if (!row.discarded) continue
		const inline = row.status.replaceAll(DISCARD_MARKER, "").trim()
		const sectionRationale = row.sectionId !== null && rationaleBySection.get(row.sectionId) === true
		if (inline === "" && !sectionRationale) {
			fail(
				discardCheck,
				`line ${row.line}: \`${row.sha}\` is marked ${DISCARD_MARKER} but carries no rationale — state it ` +
					`in the Status cell or add a **Rationale.** block to ${row.sectionId ?? "its section"}`,
			)
		}
	}

	// 10 — the merge-base-free half of the old `header-counts` (F-A-7): the
	// recorded upstream tip must exist and resolve in this repo. It needs neither
	// the merge base nor a network fetch, so it is green in a `--depth=1` clone
	// even when a later upstream advance has made the tip stale.
	const tipCheck = makeCheck("header-tip", "the header records an Upstream tip that resolves in this repo")
	if (!baseline.upstreamTip) {
		fail(tipCheck, `header has no parseable "Upstream tip" — the refresh baseline cannot be derived`)
	} else if (!/^[0-9a-fA-F]{7,40}$/.test(baseline.upstreamTip)) {
		fail(tipCheck, `header records a non-SHA "Upstream tip" \`${baseline.upstreamTip}\``)
	} else if (probe.commitType(baseline.upstreamTip) !== "commit") {
		fail(
			tipCheck,
			`header records upstream tip \`${baseline.upstreamTip}\`, which does not resolve to a commit in this repo`,
		)
	}

	// 11 — the clauses of the old `header-counts` that DO need the merge-base
	// range: the pending count, the merge base, and tip agreement with git.
	//
	// CP1-3: `upstreamTip()` and `mergeBase()` shell `git … upstream/main`. They
	// are invoked ONLY in the full profile, so `--verify --repo-only` performs no
	// `upstream` / upstream-merge-base git call at all — the guarantee `--help` and
	// README §8 claim is now literally true rather than aspirational.
	const headerCheck = makeCheck(
		"header-pending-count",
		"the header's pending count, merge base and tip agree with git",
	)
	if (isFull) {
		const actualTip = probe.upstreamTip()
		const actualMergeBase = probe.mergeBase()
		if (hasPendingList && baseline.pendingCount !== cross.expected.length) {
			fail(
				headerCheck,
				`header says "Pending upstream commits: ${baseline.pendingCount}" but ` +
					`merge-base..${UPSTREAM_REF} contains ${cross.expected.length} commits`,
			)
		}
		if (!baseline.upstreamTip) {
			fail(headerCheck, `header has no parseable "Upstream tip" — the refresh baseline cannot be derived`)
		} else if (actualTip && baseline.upstreamTip !== actualTip.slice(0, baseline.upstreamTip.length)) {
			fail(
				headerCheck,
				`header records baseline tip \`${baseline.upstreamTip}\` but ${UPSTREAM_REF} is \`${actualTip.slice(0, 12)}\``,
			)
		}
		if (!baseline.mergeBase) {
			fail(headerCheck, `header has no parseable "Merge base"`)
		} else if (actualMergeBase && baseline.mergeBase !== actualMergeBase.slice(0, baseline.mergeBase.length)) {
			fail(
				headerCheck,
				`header records merge base \`${baseline.mergeBase}\` but git reports \`${actualMergeBase.slice(0, baseline.mergeBase.length)}\``,
			)
		}
	}

	// 12 — CP1-2: a row still `☐`/`◐` whose change is ALREADY in the fork by patch
	// identity is "landed but never flipped". `git cherry -v <forkRef>
	// upstream/main` marks such upstream commits `-`; the fork commit whose
	// patch-id matched is named as the evidence. This is the control the maintainer
	// asked for: "when an upstream commit is merged our table should update it to
	// ☑". It needs history / a merge base, so it is FULL-profile only. The second
	// clause is git-independent: a `☐` row that already records
	// `Resolved:`/`Version` is landed-but-unflipped even if patch identity is
	// inconclusive (a semantic re-land is not patch-equivalent).
	const landedCheck = makeCheck(
		"landed-unflipped",
		`no ${PENDING_MARKER} / ${IN_PROGRESS_MARKER} row's change is already in ${forkRef} by patch identity`,
	)
	const landedUnflipped = []
	if (isFull) {
		const landed = typeof probe.landedByPatchId === "function" ? probe.landedByPatchId() : []
		const byPrefix = new Map(
			landed.map((entry) => [String(entry.upstreamSha).slice(0, ROW_SHA_LENGTH), entry]),
		)
		for (const row of rows) {
			const open = row.status.includes(PENDING_MARKER) || row.inProgress
			if (!open) continue
			const marker = row.inProgress ? IN_PROGRESS_MARKER : PENDING_MARKER
			const match = byPrefix.get(row.sha)
			if (match) {
				const forkSha = match.forkSha ? String(match.forkSha).slice(0, ROW_SHA_LENGTH) : null
				fail(
					landedCheck,
					`line ${row.line}: \`${row.sha}\` is still ${marker} but its patch is already in ${forkRef}` +
						`${forkSha ? ` as \`${forkSha}\`` : ""} — upstream \`${String(match.upstreamSha).slice(0, ROW_SHA_LENGTH)}\` ` +
						`is marked \`-\` by \`git cherry\`; flip the row to ${SYNCED_MARKER} with its fork SHA and record ` +
						`${RESOLVED_COLUMN}/${VERSION_COLUMN}`,
				)
				landedUnflipped.push({ line: row.line, sha: row.sha, forkSha, subject: row.subject })
			}
			if (row.status.includes(PENDING_MARKER) && (row.resolved || row.version)) {
				const recorded = [
					row.resolved ? `${RESOLVED_COLUMN} ${row.resolved}` : null,
					row.version ? `${VERSION_COLUMN} ${row.version}` : null,
				]
					.filter(Boolean)
					.join(" and ")
				fail(
					landedCheck,
					`line ${row.line}: \`${row.sha}\` is still ${PENDING_MARKER} but already records ${recorded} — a ` +
						`landed row must be flipped to ${SYNCED_MARKER}`,
				)
				if (!landedUnflipped.some((entry) => entry.sha === row.sha)) {
					landedUnflipped.push({ line: row.line, sha: row.sha, forkSha: row.forkSha, subject: row.subject })
				}
			}
		}
	}

	// 13 — F-F-5 / H-22: the UPSTREAM half of the `☑` contract. `synced-fork-sha`
	// proves the FORK side (the recorded fork SHA is reachable from the fork ref),
	// but nothing proved the upstream side, so a fabricated or mistyped `-x` SHA in
	// the register was unfalsifiable. Cheap, offline-capable and HARD: every `☑`
	// row's upstream SHA must resolve AND be an ancestor of `upstream/main`.
	// Reported BY ROW SHA so the offending row is named. Needs `upstream/main`, so
	// it is FULL-profile only — `--repo-only` must keep its merge-base-free
	// guarantee (a probe that cannot answer leaves the check unevaluated rather
	// than inventing a verdict).
	const ancestryCheck = makeCheck(
		"synced-upstream-ancestry",
		`every ${SYNCED_MARKER} row's upstream SHA resolves and is an ancestor of ${UPSTREAM_REF}`,
	)
	if (isFull && typeof probe.isAncestorOfUpstream === "function") {
		for (const row of rows) {
			if (!row.synced) continue
			if (probe.commitType(row.sha) !== "commit") {
				fail(
					ancestryCheck,
					`line ${row.line}: \`${row.sha}\` is marked ${SYNCED_MARKER} but does not resolve to a commit in this ` +
						`repo — its recorded upstream provenance cannot be checked`,
				)
				continue
			}
			if (!probe.isAncestorOfUpstream(row.sha)) {
				fail(
					ancestryCheck,
					`line ${row.line}: \`${row.sha}\` (fork SHA \`${row.forkSha ?? EMPTY_CELL}\`) is marked ${SYNCED_MARKER} ` +
						`but is NOT an ancestor of ${UPSTREAM_REF} — the row's recorded upstream provenance is fabricated ` +
						`or mistyped`,
				)
			}
		}
	} else {
		ancestryCheck.evaluated = false
	}

	// 14 — F-F-1 / H-22: SIGNATURE provenance. Upstream signs every commit with
	// GitHub's web-flow key and the pipeline used to ignore that signal. The two
	// failure modes are deliberately NOT collapsed:
	//   invalid       present but bad / expired / revoked / unsigned, or good but
	//                 signed by a signer outside the allow-list → a FALSE claim
	//                 about provenance → FAILS.
	//   unverifiable  the signature exists but cannot be checked here (no keyring,
	//                 `%G?` = `E`) → ADVISORY by default, failure only under the
	//                 explicit `--signature-strict` opt-in. Otherwise the tool
	//                 would be unusable on any machine with no keyring.
	const provenanceCheck = makeCheck(
		"provenance",
		`every ${SYNCED_MARKER} row's upstream commit carries a signature from an allow-listed signer`,
	)
	const signatureCounts = { valid: 0, invalid: 0, unverifiable: 0 }
	const unverifiableProvenance = []
	if (isFull && typeof probe.commitSignature === "function") {
		for (const row of rows) {
			if (!row.synced) continue
			const raw = probe.commitSignature(row.sha)
			const decision = raw
				? decideProvenance({ validity: raw.validity, signer: raw.signer, allowedSigners })
				: {
						outcome: "unverifiable",
						code: "?",
						signer: "",
						reason: "the signature could not be read at all (git produced no `%G?`/`%GS` line)",
					}
			signatureCounts[decision.outcome] += 1
			if (decision.outcome === "invalid") {
				fail(provenanceCheck, `line ${row.line}: \`${row.sha}\` — ${decision.reason}`)
			} else if (decision.outcome === "unverifiable") {
				const remedy = signatureStrict
					? "`--signature-strict` treats this as a failure"
					: "advisory only (pass `--signature-strict` to fail on it)"
				const message = `line ${row.line}: \`${row.sha}\` — ${decision.reason}; ${remedy}`
				if (signatureStrict) fail(provenanceCheck, message)
				else warn(provenanceCheck, message)
				unverifiableProvenance.push({ line: row.line, sha: row.sha, subject: row.subject })
			}
		}
	} else {
		provenanceCheck.evaluated = false
	}

	const byId = new Map()
	for (const check of [
		formatCheck,
		resolveCheck,
		parseCheck,
		coverageCheck,
		duplicateCheck,
		syncedCheck,
		staleCheck,
		ladderCheck,
		advisoryCheck,
		exceptionAgeCheck,
		blockedCheck,
		blockedPendingCheck,
		discardCheck,
		tipCheck,
		headerCheck,
		landedCheck,
		ancestryCheck,
		provenanceCheck,
	]) {
		byId.set(check.id, check)
	}
	const ids = selectedProfile === "repo-only" ? CHECK_IDS_REPO_ONLY : CHECK_IDS_FULL
	const checks = ids.map((id) => byId.get(id)).filter(Boolean)
	return {
		profile: selectedProfile,
		// `ok` reflects STRUCTURAL and INVARIANT defects only. Warning-severity
		// findings (`stale-in-progress`, `class-ladder-advisory`,
		// `exception-advisory`, `blocked-by-pending`) are surfaced separately so the
		// CLI keeps the default exit code green while still printing them
		// prominently. The ready set is informational and never participates in `ok`.
		ok: checks.every((check) => check.severity !== "error" || check.ok),
		checks,
		warnings: checks.flatMap((check) => check.warnings),
		hasWarnings: checks.some((check) => check.warnings.length > 0),
		staleInProgress: staleRows,
		/**
		 * Dated exceptions, one entry per excepted row. Reported BY SHA in both the
		 * human output and the JSON payload — an exception can never be silent.
		 */
		exceptions,
		/** Dated exceptions older than the re-confirmation window (CP1-9). */
		agedExceptions,
		/** Rows still `☐`/`◐` whose change is already in the fork (CP1-2). */
		landedUnflipped,
		/**
		 * F-F-1 provenance outcomes over the `☑` rows (FULL profile only): how many
		 * signatures were good, how many were invalid (a HARD failure) and how many
		 * could not be checked here (an advisory). Reported so an operator can see
		 * how much of the register was actually checkable.
		 */
		signatureCounts,
		/** `☑` rows whose signature could not be checked here (advisory, F-F-1). */
		unverifiableProvenance,
		/** The advisory set (`B-CAREFUL` Δ outside 1–5) — informational mirror. */
		advisories: inspectFirst,
		/** `Blocked-by` prerequisites that have not landed — readiness, not defects. */
		blockedByPending,
		/** The derived ready set (F-A-4) — informational, never affects the exit code. */
		readySet: buildReadySet(rows),
		/** The same rows as `advisories`, labelled for the operator as inspect-first. */
		inspectFirst,
		rows,
		sections,
		baseline,
		rollup: buildBatchRollup(sections),
		/**
		 * CP1-7: an unevaluated quantity is `null`, never `0`. The repo-only profile
		 * has no `merge-base..upstream/main` range, so `pendingCommits`/`missing`/
		 * `unexpected` are genuinely unmeasured there — reporting them as `0` let a
		 * consumer read "0 pending upstream commits" from a profile that never looked.
		 */
		counts: {
			rows: rows.length,
			pendingCommits: hasPendingList ? cross.expected.length : null,
			duplicates: cross.duplicates.length,
			missing: hasPendingList ? cross.missing.length : null,
			unexpected: hasPendingList ? cross.unexpected.length : null,
			synced: rows.filter((row) => row.synced).length,
		},
		missing: hasPendingList ? cross.missing : null,
		unexpected: hasPendingList ? cross.unexpected : null,
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
		return {
			klass: "E-SKIP",
			reason: "files touch only upstream-org automation (.github/.coderabbit/CONTRIBUTING)",
		}
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
		return {
			klass: "C-REIMPLEMENT",
			reason: "telemetry hit — the fork purged the telemetry transport; re-implement, never cherry-pick",
		}
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
	return {
		priority: "P3",
		reason: `unrecognised intent prefix${prefix ? ` "${prefix}"` : ""} — defaulting to P3 for human review`,
	}
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
	return (
		`| \`${sha9}\` | ${date} | ${subject} | \`${klass}\` | ${priority} | ${delta} | ☐ | ` +
		`${EMPTY_CELL} | ${EMPTY_CELL} | ${EMPTY_CELL} | ${EMPTY_CELL} |`
	)
}

/**
 * Builds the full refresh plan: proposal rows plus the header/report metadata.
 * Pure — exported for the spec.
 */
export function buildRefreshPlan({
	proposals,
	baseline,
	upstreamTip,
	upstreamTipDate,
	pendingCount,
	date,
	nextSectionNumber,
}) {
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
	lines.push(
		`+| Upstream tip | \`${plan.upstreamTipShort}\` (${plan.upstreamTipDate}, "${plan.upstreamTipSubject ?? ""}") |`,
	)
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
	out.push(`| ${ROW_TABLE_HEADER.join(" | ")} |`)
	out.push("| --- | ---- | ------- | ----- | --- | - | ------ | ---------- | --------- | ------- | ------- |")
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
			return replaceValueCell(
				line,
				`\`${plan.upstreamTipShort}\` (${plan.upstreamTipDate}, "${plan.upstreamTipSubject ?? ""}")`,
			)
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

/** `YYYY-MM-DD` shape guard for the dates the deepen planner consumes. */
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** Shifts an ISO date by whole days, deterministically and in UTC. */
function shiftIsoDate(date, days) {
	const shifted = new Date(`${date}T00:00:00.000Z`)
	if (Number.isNaN(shifted.getTime())) return date
	shifted.setUTCDate(shifted.getUTCDate() + days)
	return shifted.toISOString().slice(0, 10)
}

/**
	* Whole days from `fromISO` to `toISO` (both `YYYY-MM-DD`, UTC). `null` when
	* either date is unusable, so a malformed date can never masquerade as "0 days
	* old". Used by the aged-exception advisory (CP1-9). Pure — exported for the spec.
	*/
export function daysBetween(fromISO, toISO) {
	if (!ISO_DATE_RE.test(String(fromISO)) || !ISO_DATE_RE.test(String(toISO))) return null
	const from = Date.parse(`${fromISO}T00:00:00.000Z`)
	const to = Date.parse(`${toISO}T00:00:00.000Z`)
	if (Number.isNaN(from) || Number.isNaN(to)) return null
	return Math.round((to - from) / 86_400_000)
}

/**
	* The deterministic deepen (H-01), replacing the fixed `--deepen=400`.
 *
 * `--shallow-since=<date>` is derived from the register's own baseline dates:
 * the EARLIER of its merge-base date and its upstream-tip date, minus one day of
 * margin. The margin matters — the merge base is an ancestor of the recorded
 * baseline tip, so a window that starts at the tip's date can slice the merge base
 * off and make every downstream range unusable. Falling back to a bounded
 * `--deepen` only when the register carries no usable date.
 *
 * `command` is returned so the chosen fetch is visible in the output, not just
 * implied. Pure — exported for the spec.
 */
export function planUpstreamDeepen({ mergeBaseDate = null, upstreamTipDate = null } = {}) {
	const dates = [mergeBaseDate, upstreamTipDate].filter((date) => typeof date === "string" && ISO_DATE_RE.test(date))
	if (dates.length === 0) {
		return {
			strategy: "deepen",
			args: ["fetch", `--deepen=${DEEPEN_FALLBACK}`, "upstream", "main"],
			command: `git fetch --deepen=${DEEPEN_FALLBACK} upstream main`,
		}
	}
	const since = shiftIsoDate(dates.slice().sort()[0], -1)
	return {
		strategy: "shallow-since",
		since,
		args: ["fetch", `--shallow-since=${since}`, "upstream", "main"],
		command: `git fetch --shallow-since=${since} upstream main`,
	}
}

/**
 * The H-01 post-conditions, evaluated AFTER deepening and BEFORE any write.
 *
 *   (i)   a real merge base resolves;
 *   (ii)  the register's recorded baseline tip IS an ancestor of `upstream/main`;
 *   (iii) the new-commit count is NOT saturated — it must be strictly less than
 *         the local shallow window. When the window is gone (repository
 *         unshallowed) `windowSize` is `null` and that is stated explicitly in
 *         `windowNote` instead of the clause being silently dropped.
 *
 * A recorded tip that is not an ancestor is not "a big advance": it is a
 * truncated window, and advancing the header past it would erase every commit the
 * window never contained — the failure mode this guard exists to stop (S1/H-01).
 * Pure — exported for the spec.
 */
export function evaluateRefreshGuard({
	mergeBase,
	shallow = false,
	baselineTip,
	baselineTipIsAncestor,
	newCommitCount,
	windowSize,
}) {
	const failures = []
	if (!mergeBase) {
		failures.push({
			id: "merge-base",
			message:
				`${UPSTREAM_REF} has no merge base with the fork ref${shallow ? " (this checkout is shallow)" : ""} — ` +
				`the diff range would be the fetch window, not the real backlog`,
		})
	}
	if (mergeBase && baselineTip && baselineTipIsAncestor !== true) {
		failures.push({
			id: "baseline-ancestry",
			message:
				`the register's recorded baseline tip \`${baselineTip}\` is NOT an ancestor of ${UPSTREAM_REF} — the ` +
				`recorded tip sits outside the fetched window, so \`${baselineTip}..${UPSTREAM_REF}\` would report the ` +
				`window instead of the advance`,
		})
	}
	let windowNote
	if (windowSize === null) {
		windowNote = "the local shallow window is gone (repository unshallowed) — the saturation clause is not applicable"
	} else if (mergeBase) {
		const saturated = !(newCommitCount < windowSize)
		if (saturated) {
			failures.push({
				id: "window-saturated",
				message:
					`the new-commit count (${newCommitCount}) is not strictly less than the local shallow window ` +
					`(${windowSize}) — the count is saturated by the graft boundary and under-reports the advance`,
			})
		}
		windowNote = `local shallow window ${windowSize} commit(s); new-commit count ${newCommitCount} ${saturated ? "≥" : "<"} window`
	}
	return { ok: failures.length === 0, failures, windowNote }
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
	const opts = {
		mode: null,
		json: false,
		strict: false,
		write: false,
		repoOnly: false,
		help: false,
		forkRef: null,
		/**
		 * WS-4: `--signature-strict` promotes an UNVERIFIABLE signature to a
		 * failure, and `--allow-signer <identity>` (repeatable) extends the signer
		 * allow-list. Defaults keep the tool advisory-only on a keyring-less machine.
		 */
		signatureStrict: false,
		allowSigners: [],
		unknown: [],
	}
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
			case "--signature-strict":
				opts.signatureStrict = true
				break
			case "--allow-signer": {
				const value = argv[i + 1]
				if (value === undefined || value.startsWith("-")) {
					opts.unknown.push(arg)
				} else {
					opts.allowSigners.push(value)
					i++
				}
				break
			}
			case "--write":
				opts.write = true
				break
			case "--repo-only":
				opts.repoOnly = true
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
				else if (arg.startsWith("--allow-signer=")) {
					const value = arg.slice("--allow-signer=".length)
					if (value) opts.allowSigners.push(value)
					else opts.unknown.push(arg)
				} else opts.unknown.push(arg)
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
	else if (ref === ORIGIN_FORK_REF)
		reason = `local ${FORK_REF} is an ancestor of ${ORIGIN_FORK_REF} (stale local ref)`
	else reason = `local ${FORK_REF}`
	return { ref, reason }
}

/**
 * Deepens/fetches upstream with the plan's argument array (H-01). Throws when the
 * fetch fails (no remote / no network). The default plan is the bounded fallback:
 * callers that can read the register first (`runRefresh`) pass the deterministic
 * `--shallow-since=<date>` plan instead.
 */
export function fetchUpstream(plan = planUpstreamDeepen({})) {
	if (gitQuiet(["remote", "get-url", "upstream"]) === null) {
		git(["remote", "add", "upstream", UPSTREAM_URL])
	}
	git(plan.args, { timeout: FETCH_TIMEOUT_MS })
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
	return [
		...new Set(
			out
				.split("\n")
				.map((line) => line.trim())
				.filter(Boolean),
		),
	]
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

/**
 * patch-id → commit SHA for the non-merge commits in `rangeSpec`, computed with
 * `git log -p | git patch-id --stable` in one passthrough (no shell, no per-commit
 * spawn). `--stable` is the same form `git cherry` uses internally, so the two
 * agree (F-C-6).
 */
function patchIdMap(rangeSpec) {
	const logOutput = gitQuiet(["log", "-p", "--no-merges", "--format=%H", rangeSpec]) ?? ""
	if (!logOutput.trim()) return new Map()
	let output = ""
	try {
		output = execFileSync("git", ["patch-id", "--stable"], {
			cwd: ROOT,
			input: logOutput,
			encoding: "utf8",
			maxBuffer: GIT_MAX_BUFFER,
		})
	} catch {
		return new Map()
	}
	const map = new Map()
	for (const line of output.split("\n")) {
		const [patchId, sha] = line.trim().split(/\s+/)
		if (patchId && sha && /^[0-9a-f]{40}$/.test(patchId) && /^[0-9a-f]{40}$/.test(sha) && !map.has(patchId)) {
			map.set(patchId, sha)
		}
	}
	return map
}

/**
 * Upstream commits whose patch-id is already present in the fork (CP1-2).
 *
 * `git cherry -v <forkRef> upstream/main` lists commits reachable from
 * `upstream/main` but not from `<forkRef>`, prefixing each with `-` when an
 * equivalent patch (same patch-id) already exists in the fork and `+` otherwise.
 * The fork commit is then resolved by intersecting the two patch-id maps, so the
 * evidence names the fork commit whose patch matched, not merely the fact — the
 * mechanism F-C-6 validated.
 */
function landedUpstreamByPatchId(forkRef, mergeBase) {
	const marked = gitQuiet(["cherry", "-v", forkRef, UPSTREAM_REF]) ?? ""
	const upstreamShas = []
	for (const line of marked.split("\n")) {
		const match = /^([-+])\s+([0-9a-f]{40})\b/.exec(line.trim())
		if (match && match[1] === "-") upstreamShas.push(match[2])
	}
	if (upstreamShas.length === 0) return []
	const upstreamMap = patchIdMap(`${mergeBase}..${UPSTREAM_REF}`)
	const forkMap = patchIdMap(`${mergeBase}..${forkRef}`)
	const patchByUpstream = new Map([...upstreamMap.entries()].map(([patchId, sha]) => [sha, patchId]))
	return upstreamShas.map((upstreamSha) => {
		const patchId = patchByUpstream.get(upstreamSha)
		const forkSha = patchId ? (forkMap.get(patchId) ?? null) : null
		return { upstreamSha, forkSha }
	})
}

/**
 * Builds the repo probe consumed by validateRegister(), bound to `forkRef`.
 * Exported for the spec: `row-sha-resolves` and `header-tip` fail through
 * `commitType`, so the spec must be able to drive the REAL resolver (git
 * `cat-file -t`), not a stub that returns a constant (CP1-5).
 */
export function buildProbe(forkRef = FORK_REF) {
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
		landedByPatchId: () => {
			const mergeBase = mergeBaseOf(forkRef)
			if (!mergeBase) return []
			return landedUpstreamByPatchId(forkRef, mergeBase)
		},
		/**
		 * F-F-5/H-22: is the row's UPSTREAM SHA an ancestor of `upstream/main`?
		 * `merge-base --is-ancestor` (exit status, no output) — the same primitive
		 * the fork-side reachability check uses. References `upstream/main`, so it is
		 * consumed by FULL-profile checks only.
		 */
		isAncestorOfUpstream: (sha) => gitQuiet(["merge-base", "--is-ancestor", sha, UPSTREAM_REF]) !== null,
		/**
		 * F-F-1: git's signature fields for one commit — `%G?` (validity) and `%GS`
		 * (signer identity), in one `git log -1` call. `null` when git produces no
		 * line at all (the object is missing), which the provenance check reports as
		 * `unverifiable` rather than inventing a verdict. `%G?` returns `E` when no
		 * keyring is available, which is exactly what `unverifiable` exists for.
		 */
		commitSignature(sha) {
			const out = gitQuiet(["log", "-1", "--format=%G?%x1f%GS", sha])
			if (out === null || out.trim() === "") return null
			const [validity = "", signer = ""] = out.trim().split("\u001f")
			return { validity, signer }
		},
	}
}

/**
 * The production implementation of the `--refresh` IO port.
 *
 * `runRefresh` takes this as a defaulted parameter so the three H-01
 * post-conditions can be exercised on fixtures (a grafted window, an out-of-window
 * recorded tip, a saturated count) without touching git or the real register —
 * the same injected-seam pattern `validateRegister({ probe })` already uses
 * (F-A-1/F-B-2). Every member is a thin wrapper over one git command or one file
 * operation; no member decides policy.
 */
export function createRefreshIo() {
	return {
		readRegister: () => readFile(path.join(ROOT, REGISTER_PATH), "utf8"),
		writeRegister: (markdown) => writeFile(path.join(ROOT, REGISTER_PATH), markdown, "utf8"),
		resolveUpstreamRef,
		fetchUpstream,
		resolveForkRef: (override) => resolveForkRef(override),
		requireMergeBase: (forkRef) => requireMergeBase(forkRef),
		resolveCommit: (sha) => (gitQuiet(["rev-parse", "--verify", "--quiet", `${sha}^{commit}`]) ?? "").trim(),
		isAncestor: (ancestor, descendant) => gitQuiet(["merge-base", "--is-ancestor", ancestor, descendant]) !== null,
		revRange: (from, to) =>
			(gitQuiet(["rev-list", "--reverse", `${from}..${to}`]) ?? "")
				.split("\n")
				.map((line) => line.trim())
				.filter(Boolean),
		revListCount: (spec) => Number((gitQuiet(["rev-list", "--count", spec]) ?? "0").trim() || 0),
		upstreamTipSha,
		isShallow: isShallowRepository,
		commitMeta,
		commitChangedFiles,
		commitPatchText,
		commitSignature: (sha) => buildProbe().commitSignature(sha),
		conflictSurface: (mergeBase, forkRef) => computeConflictSurface(mergeBase, forkRef),
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
 * HARD failure: `rev-list` would report the local fetch window instead of the
 * real backlog, so every downstream number would be wrong. The counts are
 * deliberately not written here — they are properties of the clone, not of the
 * tool, and a hardcoded number goes stale the moment upstream advances (L3).
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
	/**
	 * `--repo-only` runs the `CHECK_IDS_REPO_ONLY` profile (merge-base-free) and
	 * deliberately does NOT resolve or fetch `upstream/main`: the profile exists so
	 * CI can gate the register in the clone shape the repo ships in — a `--depth=1`
	 * checkout with no usable merge base (F-D-2/F-G-5). The full profile keeps the
	 * old fail-closed behaviour.
	 */
	const profile = opts.repoOnly ? "repo-only" : "full"
	let merge = null
	let forkRef
	if (profile === "full") {
		const upstream = resolveUpstream({ strict: opts.strict, deepen: false })
		if (!upstream.ref) {
			const detail = upstream.fetchError ? upstream.fetchError.message : "no local upstream/main ref found"
			if (upstream.decision.fail) {
				if (!opts.json) {
					logError(
						TAG,
						`${UPSTREAM_REF} is unavailable and --strict is set — refusing to skip the register check.`,
					)
					logError(TAG, detail)
				}
				emitJson(opts, { mode: "verify", ok: false, skipped: true, strict: true, reason: detail })
				return 1
			}
			if (!opts.json) {
				logWarn(TAG, `${UPSTREAM_REF} is unavailable (no local ref; fetch failed or no network).`)
				logWarn(TAG, detail)
				logWarn(
					TAG,
					`Skipping the register check — CI is NOT blocked for an infra reason. Run \`${DEPTHEN_COMMAND}\` to enforce.`,
				)
			}
			emitJson(opts, { mode: "verify", ok: true, skipped: true, reason: detail })
			return 0
		}

		forkRef = resolveForkRef(opts.forkRef)
		if (!opts.json) logInfo(TAG, `fork ref ${forkRef.ref} (${forkRef.reason})`)

		merge = requireMergeBase(forkRef.ref)
		if (!merge.ok) {
			const message =
				`${UPSTREAM_REF} has no merge base with ${forkRef.ref}` +
				`${merge.shallow ? " (this checkout is shallow)" : ""}. ` +
				`\`git merge-base\` returns nothing, so the pending count would report the local fetch window ` +
				`instead of the real backlog. Deepen first: ${DEPTHEN_COMMAND} (or ${DEEPEN_SINCE_COMMAND})`
			emitJson(opts, { mode: "verify", ok: false, shallow: merge.shallow, error: message })
			if (!opts.json) logError(TAG, message)
			return 1
		}
		if (merge.shallow && !opts.json) {
			logWarn(
				TAG,
				"This checkout reports as shallow, but the merge base resolves — deepen anyway before triaging a real backlog.",
			)
		}
	} else {
		forkRef = resolveForkRef(opts.forkRef)
		if (!opts.json)
			logInfo(TAG, `fork ref ${forkRef.ref} (${forkRef.reason}) · repo-only profile (merge-base-free)`)
	}

	const markdown = await readFile(path.join(ROOT, REGISTER_PATH), "utf8")
	const pendingShas =
		profile === "full"
			? (gitQuiet(["rev-list", "--reverse", `${merge.mergeBase}..${UPSTREAM_REF}`]) ?? "")
					.split("\n")
					.map((line) => line.trim())
					.filter(Boolean)
			: null

	const report = validateRegister({
		markdown,
		pendingShas,
		probe: buildProbe(forkRef.ref),
		forkRef: forkRef.ref,
		profile,
		/**
		 * WS-4/F-F-1: provenance is configurable per run. `--signature-strict`
		 * promotes an UNVERIFIABLE signature (no keyring, `%G?` = `E`) from an
		 * advisory to a failure; an `invalid` signature always fails. The allow-list
		 * defaults to the GitHub web-flow identity.
		 */
		signatureStrict: Boolean(opts.signatureStrict),
		allowedSigners: resolveAllowedSigners(process.env, opts.allowSigners),
	})
	const strictFailure = Boolean(opts.strict) && report.staleInProgress.length > 0

	if (opts.json) {
		emitJson(opts, {
			mode: "verify",
			profile,
			ok: report.ok && !strictFailure,
			skipped: false,
			shallow: merge ? merge.shallow : null,
			forkRef: forkRef.ref,
			forkRefReason: forkRef.reason,
			register: REGISTER_PATH,
			mergeBase: merge ? merge.mergeBase.slice(0, 12) : null,
			upstreamTip: profile === "full" ? upstreamTipSha().slice(0, 12) : null,
			counts: report.counts,
			baseline: report.baseline,
			checks: report.checks,
			warnings: report.warnings,
			staleInProgress: report.staleInProgress,
			signatureCounts: report.signatureCounts,
			unverifiableProvenance: report.unverifiableProvenance,
			exceptions: report.exceptions,
			agedExceptions: report.agedExceptions,
			landedUnflipped: report.landedUnflipped,
			advisories: report.advisories,
			blockedByPending: report.blockedByPending,
			readySet: report.readySet,
			inspectFirst: report.inspectFirst,
			rollup: report.rollup,
			missing: report.missing,
			unexpected: report.unexpected,
			duplicates: report.duplicates,
		})
		return verifyExitCode({
			ok: report.ok,
			staleCount: report.staleInProgress.length,
			strict: Boolean(opts.strict),
		})
	}

	logStep(TAG, `Verifying ${REGISTER_PATH} (${profile} profile, ${report.checks.length} checks)`)
	if (merge) {
		logInfo(
			TAG,
			`merge base ${merge.mergeBase.slice(0, ROW_SHA_LENGTH)} · ${UPSTREAM_REF} @ ${upstreamTipSha().slice(0, ROW_SHA_LENGTH)}`,
		)
	}
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

	// F-F-1 provenance roll-up. An `invalid` signature has already failed the run
	// above; this prints the OUTCOME COUNTS so an operator can see how much of the
	// register was actually checkable here. A keyring-less machine reports every
	// row as `unverifiable` (advisory) — which must never be mistaken for a pass.
	if (profile === "full") {
		logStep(`${TAG}:PROVENANCE`, `signature provenance of ${SYNCED_MARKER} rows (F-F-1)`)
		logInfo(
			`${TAG}:PROVENANCE`,
			`${report.signatureCounts.valid} valid · ${report.signatureCounts.invalid} invalid · ` +
				`${report.signatureCounts.unverifiable} unverifiable` +
				`${opts.signatureStrict ? " (--signature-strict: an unverifiable signature fails)" : " (unverifiable is advisory)"}`,
		)
		for (const row of report.unverifiableProvenance) {
			logWarn(`${TAG}:PROVENANCE`, `\`${row.sha}\` — the signature cannot be checked in this checkout`)
		}
		logEndGroup()
	}

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

	// INFORMATIONAL level. The ready set is a DERIVED predicate (F-A-4), not a
	// class: it exists so the operator can read "what can be picked today" without
	// a `B-CAREFUL` row ever being called ready (which is empty by definition).
	// Neither this nor the inspect-first list participates in `ok` or the exit code.
	logStep(`${TAG}:READY`, "derived ready set (`A-CLEAN` ∧ Δ 0 ∧ no Blocked-by ∧ open) — INFORMATIONAL")
	if (report.readySet.length === 0) {
		logInfo(`${TAG}:READY`, "none — no open A-CLEAN row satisfies Δ 0 ∧ Blocked-by = ∅")
	}
	for (const row of report.readySet) {
		logInfo(`${TAG}:READY`, `\`${row.sha}\` ${row.priority} · ${row.sectionId ?? "?"} — ${row.subject}`)
	}
	logEndGroup()

	logStep(`${TAG}:INSPECT`, `inspect-first list — \`B-CAREFUL\` Δ outside 1–5 (ADVISORY, never fatal)`)
	if (report.inspectFirst.length === 0) {
		logInfo(`${TAG}:INSPECT`, "none")
	}
	for (const row of report.inspectFirst) {
		logWarn(
			`${TAG}:INSPECT`,
			`\`${row.sha}\` Δ ${row.delta === null ? "(not recorded)" : row.delta} · ${row.sectionId ?? "?"} — ${row.subject}`,
		)
	}
	logEndGroup()

	logStep(`${TAG}:EXCEPTIONS`, `dated ${EXCEPTION_COLUMN} cells — every excepted row is named by SHA`)
	if (report.exceptions.length === 0) {
		logInfo(`${TAG}:EXCEPTIONS`, "none")
	}
	for (const exception of report.exceptions) {
		logWarn(
			`${TAG}:EXCEPTIONS`,
			`\`${exception.sha}\` excepted ${exception.date} — ${exception.reason} (line ${exception.line})`,
		)
	}
	logEndGroup()

	// CP1-2 roll-up — a landed-but-unflipped row is a FAILURE (reported above under
	// its check), but naming the fork commit here makes the remedy copy-pasteable.
	logStep(`${TAG}:LANDED`, `rows already in ${forkRef.ref} by patch identity (need flipping to ${SYNCED_MARKER})`)
	if (report.landedUnflipped.length === 0) {
		logInfo(`${TAG}:LANDED`, "none")
	}
	for (const row of report.landedUnflipped) {
		logWarn(
			`${TAG}:LANDED`,
			`\`${row.sha}\` (line ${row.line})${row.forkSha ? ` → fork \`${row.forkSha}\`` : ""} — ${row.subject}`,
		)
	}
	logEndGroup()

	const { rows, duplicates, missing, unexpected, synced } = report.counts
	logInfo(
		TAG,
		`rows=${rows} duplicates=${duplicates} synced=${synced}` +
			(profile === "full"
				? ` missing=${missing} unexpected=${unexpected} pending-commits=${report.counts.pendingCommits}`
				: ` (coverage not computed in the ${profile} profile)`),
	)

	if (!report.ok) {
		logError(
			TAG,
			`Register check FAILED — ${report.checks.filter((check) => !check.ok).length} of ${report.checks.length} checks reported defects.`,
		)
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
	const tally =
		profile === "full"
			? `${rows} rows cover ${report.counts.pendingCommits} pending commits, 0 duplicates, 0 missing, 0 unexpected`
			: `${rows} rows, 0 duplicates`
	logSuccess(
		TAG,
		`Register verified (${profile}): ${tally}` +
			`${report.staleInProgress.length > 0 ? ` (${report.staleInProgress.length} stale ${IN_PROGRESS_MARKER} warning(s))` : ""}.`,
	)
	return verifyExitCode({ ok: report.ok, staleCount: report.staleInProgress.length, strict: Boolean(opts.strict) })
}

/**
 * `--refresh` — the guarded refresh (H-01).
 *
 * Three post-conditions are asserted AFTER deepening and BEFORE any write:
 *
 *   (i)   a real merge base resolves;
 *   (ii)  the register's recorded baseline tip IS an ancestor of `upstream/main`;
 *   (iii) the new-commit count is NOT saturated — it must be strictly less than
 *         the local shallow window (when the clone is unshallowed the window is
 *         gone, and that is stated explicitly in `windowNote`).
 *
 * A failure REFUSES — `--write` included — prints the exact remediation
 * (`git fetch --unshallow` / `--shallow-since=<date>`) and leaves the register
 * byte-identical. The deepen itself is deterministic (`--shallow-since=<date>`
 * derived from the register's baseline dates) and the chosen command is reported.
 *
 * All repo access goes through the injected `io` port (`createRefreshIo()` in
 * production), which is what makes the refusals testable on fixtures instead of
 * on the live clone — the defect F-A-1 named (the old acceptance test passed on
 * unmodified code because `requireMergeBase` already aborted before the write).
 */
export async function runRefresh(opts, io = createRefreshIo()) {
	const markdown = await io.readRegister()
	const baseline = parseBaseline(markdown)
	if (!baseline.upstreamTip) {
		const message = `the register header has no parseable "Upstream tip" — cannot derive the refresh baseline`
		if (!opts.json) logError(TAG, message)
		return { code: 1, payload: { mode: "refresh", ok: false, error: message } }
	}

	// H-01 deterministic deepen, derived from the register's own baseline dates so
	// the window can never be an arbitrary constant (the old `--deepen=400`).
	const deepen = planUpstreamDeepen({
		mergeBaseDate: baseline.mergeBaseDate,
		upstreamTipDate: baseline.upstreamTipDate,
	})
	if (!opts.json) {
		logStep(TAG, `Refreshing the register against ${UPSTREAM_REF}`)
		logInfo(TAG, `deepen strategy "${deepen.strategy}": ${deepen.command}`)
	}

	let fetchError = null
	try {
		io.fetchUpstream(deepen)
	} catch (error) {
		fetchError = error
	}
	const ref = io.resolveUpstreamRef()
	const decision = decideRunMode({ localRef: Boolean(ref), fetchSucceeded: ref !== null, strict: opts.strict })
	if (!ref) {
		const detail = fetchError ? fetchError.message : "no local upstream/main ref found"
		if (decision.fail) {
			if (!opts.json) {
				logError(TAG, `${UPSTREAM_REF} is unavailable and --strict is set — refusing to skip the refresh.`)
				logError(TAG, detail)
			}
			return {
				code: 1,
				payload: {
					mode: "refresh",
					ok: false,
					skipped: true,
					strict: true,
					deepenCommand: deepen.command,
					error: detail,
				},
			}
		}
		if (!opts.json) {
			logWarn(TAG, `${UPSTREAM_REF} is unavailable (no local ref; fetch failed or no network).`)
			logWarn(TAG, detail)
			logWarn(TAG, "Skipping the refresh — CI is NOT blocked for an infra reason.")
			logWarn(TAG, `Re-run with network (or after \`${DEPTHEN_COMMAND}\`) to refresh.`)
		}
		return {
			code: 0,
			payload: { mode: "refresh", ok: true, skipped: true, deepenCommand: deepen.command, reason: detail },
		}
	}
	if (fetchError && !opts.json) {
		logWarn(
			TAG,
			`fetching upstream failed (${fetchError.message}) — falling back to the local ${UPSTREAM_REF} ref.`,
		)
	}

	const forkRef = io.resolveForkRef(opts.forkRef)
	if (!opts.json) logInfo(TAG, `fork ref ${forkRef.ref} (${forkRef.reason})`)

	const merge = io.requireMergeBase(forkRef.ref)
	const baselineFull = merge.ok ? io.resolveCommit(baseline.upstreamTip) : ""
	const newShas = baselineFull ? io.revRange(baselineFull, UPSTREAM_REF) : []
	/** `null` when the repository is not shallow: the window is gone. */
	const windowSize = io.isShallow() ? io.revListCount(UPSTREAM_REF) : null

	const guard = evaluateRefreshGuard({
		mergeBase: merge.mergeBase,
		shallow: merge.shallow,
		baselineTip: baseline.upstreamTip,
		baselineTipIsAncestor: baselineFull ? io.isAncestor(baselineFull, UPSTREAM_REF) : false,
		newCommitCount: newShas.length,
		windowSize,
	})
	if (!guard.ok) {
		const remediation = `${DEPTHEN_COMMAND}   # or: ${DEEPEN_SINCE_COMMAND}`
		if (!opts.json) {
			logError(TAG, "refresh REFUSED — the fetched window is not safe to re-baseline on.")
			for (const failure of guard.failures) logError(TAG, `  · ${failure.id}: ${failure.message}`)
			logError(TAG, `Remediation: ${remediation}`)
			logError(TAG, "The register was NOT modified (--write refuses too).")
			logEndGroup()
		}
		return {
			code: 1,
			payload: {
				mode: "refresh",
				ok: false,
				refused: true,
				wrote: false,
				register: REGISTER_PATH,
				baselineTip: baseline.upstreamTip,
				deepenCommand: deepen.command,
				windowSize,
				windowNote: guard.windowNote,
				guard: { ok: guard.ok, failures: guard.failures },
				remediation,
			},
		}
	}
	if (!opts.json && guard.windowNote) logInfo(TAG, guard.windowNote)

	// H-22 + H-01 interaction (WS-4 item 8): `--refresh --write` REFUSES when any
	// NEW commit's signature is INVALID (present but bad/expired/revoked/unsigned,
	// or good but not allow-listed). `unverifiable` (no keyring here) NEVER refuses —
	// otherwise the refresh would be unusable on a keyring-less machine — but the
	// outcome counts are always printed so the operator knows how much of the window
	// was actually checkable.
	const refreshSigners = resolveAllowedSigners(process.env, opts.allowSigners)
	const signatureCounts = { valid: 0, invalid: 0, unverifiable: 0 }
	const invalidSignatures = []
	if (typeof io.commitSignature === "function") {
		for (const sha of newShas) {
			const raw = io.commitSignature(sha)
			const decision = raw
				? decideProvenance({ validity: raw.validity, signer: raw.signer, allowedSigners: refreshSigners })
				: { outcome: "unverifiable", code: "?", reason: "the signature could not be read at all" }
			signatureCounts[decision.outcome] += 1
			if (decision.outcome === "invalid") {
				invalidSignatures.push({ sha: sha.slice(0, ROW_SHA_LENGTH), code: decision.code, reason: decision.reason })
			}
		}
	}
	const signatureSummary =
		`signature provenance (F-F-1) over ${newShas.length} new commit(s): ` +
		`${signatureCounts.valid} valid · ${signatureCounts.invalid} invalid · ${signatureCounts.unverifiable} unverifiable`
	if (!opts.json) logInfo(TAG, signatureSummary)
	if (invalidSignatures.length > 0) {
		if (!opts.json) {
			logError(TAG, "refresh REFUSED — the new commits carry INVALID signature provenance.")
			for (const entry of invalidSignatures) {
				logError(TAG, `  · \`${entry.sha}\` (\`%G?\` = ${entry.code}): ${entry.reason}`)
			}
			logError(TAG, "The register was NOT modified (--write refuses too).")
			logEndGroup()
		}
		return {
			code: 1,
			payload: {
				mode: "refresh",
				ok: false,
				refused: true,
				wrote: false,
				register: REGISTER_PATH,
				deepenCommand: deepen.command,
				newCommitCount: newShas.length,
				signatureCounts,
				invalidSignatures,
				signatureSummary,
				error:
					`refusing to advance the register: ${invalidSignatures.length} new commit(s) carry INVALID ` +
					`signature provenance`,
			},
		}
	}

	const tipSha = io.upstreamTipSha()
	const conflictSurface = newShas.length > 0 ? io.conflictSurface(merge.mergeBase, forkRef.ref) : new Set()
	const proposals = newShas.map((sha) => {
		const meta = io.commitMeta(sha)
		const evidence = computeCommitEvidence({
			sha,
			subject: meta.subject,
			files: io.commitChangedFiles(sha),
			conflictSurface,
			patchText: io.commitPatchText(sha),
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

	const tipMeta = io.commitMeta(tipSha)
	const pendingCount = io.revListCount(`${forkRef.ref}..${UPSTREAM_REF}`)
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
		await io.writeRegister(applyRefreshWrite(markdown, plan))
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
				deepenCommand: deepen.command,
				upstreamTip: tipSha.slice(0, 12),
				pendingCount,
				newCommitCount: proposals.length,
				signatureCounts,
				signatureSummary,
				windowSize,
				windowNote: guard.windowNote,
				nextSectionNumber: plan.sectionNumber,
				proposals: proposals.map(({ evidence, ...rest }) => ({ ...rest, evidence })),
				diff: renderRegisterDiff(plan, markdown),
			},
		}
	}

	logInfo(
		TAG,
		`baseline tip (from the register header) ${baseline.upstreamTip} → ${baselineFull.slice(0, ROW_SHA_LENGTH)}`,
	)
	logInfo(TAG, `${UPSTREAM_REF} @ ${tipSha.slice(0, ROW_SHA_LENGTH)} (${tipMeta.date}, "${tipMeta.subject}")`)
	logInfo(TAG, `merge base ${merge.mergeBase.slice(0, ROW_SHA_LENGTH)}`)

	if (proposals.length === 0) {
		logOk(TAG, "No new commits since the recorded baseline tip — the register already covers upstream/main.")
		logEndGroup()
		return {
			code: 0,
			payload: {
				mode: "refresh",
				ok: true,
				skipped: false,
				deepenCommand: deepen.command,
				newCommitCount: 0,
				signatureCounts,
				pendingCount,
			},
		}
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
		logSuccess(
			TAG,
			`Register updated: section SYNC-${plan.sectionNumber} appended, header tip/count rewritten (${proposals.length} row(s)).`,
		)
		logWarn(
			TAG,
			"Review the proposals by hand, move rows into their thematic batch, update the Summary tables, and add the README §9 changelog line.",
		)
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
			deepenCommand: deepen.command,
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
  node scripts/upstream-sync-triage.mjs --verify --repo-only   # merge-base-free subset
  node scripts/upstream-sync-triage.mjs --refresh [--write] [--json] [--strict] [--fork-ref <ref>]
  node scripts/upstream-sync-triage.mjs --help

Modes:
  --verify   (default) Assert the register against the repo, reporting
             ${CHECK_IDS_FULL.length} independent checks: canonical 9-character row SHAs, row SHAs that
             resolve, every data row parsing into a register row (row-parse),
             coverage of merge-base..${UPSTREAM_REF} (missing / unexpected), duplicate
             rows, every ${SYNCED_MARKER} row carrying a fork SHA reachable from the fork ref AND
             recording ${RESOLVED_COLUMN}/${VERSION_COLUMN}, every ${IN_PROGRESS_MARKER} row whose recorded
             fork SHA is already reachable from the fork ref (stale-in-progress),
             the HARD class invariant (class-ladder: \`A-CLEAN\` ⇒ Δ = 0), the
             ADVISORY B-CAREFUL ladder (class-ladder-advisory), the exception
             re-confirmation advisory (exception-advisory), ${BLOCKED_BY_COLUMN} closure
             (blocked-by), its readiness advisory (blocked-by-pending), a rationale
             for every ${DISCARD_MARKER} row, the header tip resolving, the header's pending count /
             merge base / tip matching git, and landed-unflipped: a ${PENDING_MARKER}/${IN_PROGRESS_MARKER} row
             whose change is ALREADY in the fork by patch identity (git cherry) or
             that already records ${RESOLVED_COLUMN}/${VERSION_COLUMN} — the "update the table to
             ☑ when the commit lands" control. landed-unflipped needs history, so
             it runs ONLY in the full profile; --repo-only skips it.
             Provenance is validated, not merely asserted (F-F-5/F-F-1): every ☑ row's
             upstream SHA must resolve AND be an ancestor of ${UPSTREAM_REF}
             (synced-upstream-ancestry), and its commit must carry a signature from an
             allow-listed signer (provenance) — invalid FAILS, unverifiable is an
             advisory unless --signature-strict. Both reference ${UPSTREAM_REF}, so
             both are FULL-profile only. Also prints the per-batch roll-up, the
             derived READY SET and every dated EXCEPTION.
  --refresh  Deepen/fetch upstream (deterministically: --shallow-since=<date>
             derived from the register's baseline dates, falling back to a
             bounded --deepen; the chosen command is printed), diff ${UPSTREAM_REF}
             against the baseline tip recorded in the register header, compute
             per-commit evidence (Δ, file count, hot-file hits, CORE_FILES hits,
             telemetry / version / CHANGELOG / lockfile / .github / .coderabbit
             signals) and propose a class + priority using README §3's rules.
             GUARDED (H-01): before ANY write it asserts that a real merge base
             resolves, that the recorded baseline tip is an ancestor of
             ${UPSTREAM_REF}, and that the new-commit count is not saturated by the
             shallow window. Any failure refuses (--write included), prints the
             remediation and leaves the register untouched. Dry run by default:
             it prints a ready-to-paste register diff.

Options:
  --write    (with --refresh) Apply the proposal section and header rewrite to
             the register. Never re-classifies or deletes existing rows.
  --repo-only
             (with --verify) Run ONLY the ${CHECK_IDS_REPO_ONLY.length} merge-base-free checks —
             ${CHECK_IDS_REPO_ONLY.join(", ")} —
             and never issue a git command that references ${UPSTREAM_REF} or computes
             the upstream merge base. This is the profile CI can gate in the clone
             shape the repo ships in (a --depth=1 checkout has no merge base), so
             it exits 0 where the full profile fails closed. \`row-parse\` and
             \`exception-advisory\` are pure-markdown, so they run here too, which is
             what stops the profile going blind to a row whose SHA cell lost its
             backticks. Quantities this profile cannot evaluate (pendingCommits,
             missing, unexpected) are reported as \`null\` in --json, never as \`0\`.
             PR CI runs this profile with FULL fork history (fetch-depth: 0): the
             profile is merge-base-free but NOT object-free — row-sha-resolves still
             needs the register's commit objects, so a --depth=1 checkout fails every
             row for the wrong reason. The two provenance checks reference
             ${UPSTREAM_REF} and therefore belong to the full profile.
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
  --signature-strict
             Promote an UNVERIFIABLE commit signature (\`%G?\` = \`E\`, i.e. no keyring
             in this checkout) from an advisory to a hard failure. An INVALID
             signature — bad/expired/revoked/unsigned, or a good signature from a
             signer outside the allow-list — always fails. Default: advisory, so the
             tool stays usable on a machine with no keyring. Applies to --verify and
             --refresh (where an invalid signature refuses --write).
  --allow-signer <identity>
             Add a signer identity to the allow-list used by the provenance check
             (repeatable, or --allow-signer=<identity>). Default: the GitHub web-flow
             identity \`GitHub <noreply@github.com>\`. The comma-separated
             UPSTREAM_SIGNER_ALLOWLIST env var is used when no flag is given.
  --help     Show this help message

Finding levels (every finding an operator sees is one of these four):
  fail          an error-severity check reported a defect — a false claim about
                the register (a bad row SHA, a \`☑\` row with no reachability or no
                Resolved:/Version, a hard class violation, a \`Blocked-by\` that is
                not a different row of this register). Exit 1.
  advisory      a warning-severity check reported a judgement call:
                stale-in-progress, class-ladder-advisory, exception-advisory and
                blocked-by-pending. Printed, never fatal — a judgement is not a
                defect. Only stale in-progress rows are promoted by --strict.
  informational the derived ready set (\`A-CLEAN\` ∧ Δ 0 ∧ no ${BLOCKED_BY_COLUMN} ∧ open) and
                the inspect-first list. Printed; NEVER affects the exit code.
  exception     a dated ${EXCEPTION_COLUMN} cell, e.g.
                \`excepted 2026-09-16 — merged with Δ2 under the pre-ladder classifier\`.
                Its only permitted use is honouring a decision already recorded for
                a row that violates \`A-CLEAN\` ⇒ Δ = 0; an undated token, or one on a
                row that does not violate it, is a hard failure. Every excepted row
                is printed BY SHA so an exception can never be silent.

Note on stale-in-progress: a ${IN_PROGRESS_MARKER} (in-progress) row whose recorded fork SHA
is already reachable from the fork ref is stale and must be flipped to ${SYNCED_MARKER}.
It is a WARNING by default (exit 0); pass --strict to fail on it.

Note on ${BLOCKED_BY_COLUMN}: the column records the prerequisite row SHA(s) that must land
first. A token that is not a row of this register (or is the row itself) is a hard
failure; the literal \`unknown\` is FORBIDDEN (write ${EMPTY_CELL} instead). A prerequisite that
simply has not landed yet is a warning — that is what "blocked" means.

Precondition (runbook R1):
  This clone is shallow by default. Without a usable merge base the pending
  count reports the local fetch window, not the real backlog. Deepen first:
    ${DEPTHEN_COMMAND}                       # or a bounded:
    ${DEEPEN_SINCE_COMMAND}
    git rev-parse --is-shallow-repository
    git merge-base ${UPSTREAM_REF} ${FORK_REF}     # must print a SHA

Exit codes:
  0  register verified / refreshed / skipped (upstream unavailable); advisories
     (stale in-progress, B-CAREFUL Δ>5, unlanded prerequisite) and the
     informational ready set / exceptions alone do NOT fail
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
	if (opts.repoOnly && opts.mode !== "verify") {
		emitJson(opts, { mode: opts.mode, ok: false, error: "--repo-only is only valid with --verify" })
		if (!opts.json) logError(TAG, "--repo-only is only valid with --verify")
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
