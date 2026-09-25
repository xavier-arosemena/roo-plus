/**
 * upstream-sync-triage.spec.mjs
 *
 * Unit tests for the register-triage automation in
 * scripts/upstream-sync-triage.mjs (README §8 of docs/upstream-sync/README.md).
 *
 * Run with: node --test scripts/upstream-sync-triage.spec.mjs
 * (scripts/ has no vitest runner, so node:test built into Node 22 is used —
 * same as scripts/verify-upstream-code-index-alignment.spec.mjs.)
 *
 * Every case here is a regression test for a defect that actually occurred
 * while the strategy was authored:
 *   - a 10-character row SHA silently fails 9-character prefix matching, so the
 *     commit looks absent from the register (4 such rows existed);
 *   - grepping for "any backticked hex token" instead of a row-scoped cell
 *     reports ~29 false duplicates, because SHAs legitimately repeat in Notes,
 *     in the execution order and as the baseline tips.
 * Both are asserted explicitly below.
 */

import { spawnSync } from "node:child_process"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { describe, it } from "node:test"
import assert from "node:assert/strict"

import {
	applyRefreshWrite,
	buildBatchRollup,
	buildInspectFirst,
	buildProbe,
	buildReadySet,
	buildRefreshPlan,
	CHECK_IDS_FULL,
	CHECK_IDS_REPO_ONLY,
	chooseForkRef,
	cleanCell,
	computeCommitEvidence,
	crossCheckRows,
	daysBetween,
	decideProvenance,
	decideRunMode,
	DEFAULT_ALLOWED_SIGNERS,
	GITHUB_WEBFLOW_SIGNER,
	normaliseSignerIdentity,
	resolveAllowedSigners,
	DEEPEN_FALLBACK,
	emitJson,
	evaluateRefreshGuard,
	EXCEPTION_RECONFIRM_DAYS,
	extractForkSha,
	extractMarkerSha,
	findUnparsedRowLines,
	formatRegisterRow,
	headerColumnMap,
	intentPrefix,
	isQuickWin,
	MIN_EXCEPTION_REASON_LENGTH,
	nextSectionNumber,
	normaliseHeaderName,
	PENDING_MARKER,
	parseArgs,
	parseBaseline,
	parseBlockedBy,
	parseException,
	parseRegister,
	planUpstreamDeepen,
	proposeClass,
	proposePriority,
	renderRegisterDiff,
	runRefresh,
	splitRowCells,
	validateRegister,
	verifyExitCode,
	EMPTY_CELL,
	EXCEPTION_COLUMN,
	FORK_REF,
	HOT_FILES,
	IN_PROGRESS_MARKER,
	ORIGIN_FORK_REF,
	REGISTER_PATH,
	ROOT,
	ROW_SHA_LENGTH,
	UNKNOWN_BLOCKED_BY_TOKEN,
	UPSTREAM_REF,
} from "./upstream-sync-triage.mjs"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Full 40-char SHAs whose 9-char prefixes are the canonical row SHAs. */
const SHA_A = "c747c024b0123456789abcdef0123456789abcd"
const SHA_B = "c6eb8fb5723456789abcdef0123456789abcdef"
const SHA_C = "e12a42e7a3456789abcdef0123456789abcdef"
const PREFIX_A = SHA_A.slice(0, ROW_SHA_LENGTH)
const PREFIX_B = SHA_B.slice(0, ROW_SHA_LENGTH)
const PREFIX_C = SHA_C.slice(0, ROW_SHA_LENGTH)

const TIP = "500152b7845d791cf762fa06d12bc2de51fef685"
const MERGE_BASE = "252c69b520825ae6cc3c9f3aec5671520c85037f"

/** Builds a register row in the register's exact column order. */
function makeRow(
	sha,
	subject,
	{
		klass = "A-CLEAN",
		priority = "P1",
		delta = 0,
		status = "☐",
		blockedBy = EMPTY_CELL,
		resolved = EMPTY_CELL,
		version = EMPTY_CELL,
		exception = EMPTY_CELL,
	} = {},
) {
	return (
		`| \`${sha}\` | 2026-09-01 | ${subject} | \`${klass}\` | ${priority} | ${delta} | ${status} | ` +
		`${blockedBy} | ${resolved} | ${version} | ${exception} |`
	)
}

/**
 * Builds a register document shaped like the real one, including a Notes block
 * and a recommended-execution-order section that legitimately repeat row SHAs.
 */
function buildRegister({ rows, pendingCount, notes = [], tip = TIP.slice(0, 9), mergeBase = MERGE_BASE.slice(0, 9) }) {
	const lines = [
		"# Pending Upstream Commits — Sync Register",
		"",
		"## Baseline",
		"",
		"| Field | Value |",
		"| ----- | ----- |",
		`| Merge base | \`${mergeBase}\` (2026-08-20, "fix: stream reasoning_content (#1175)") |`,
		`| Upstream tip | \`${tip}\` (2026-09-16, "[Fix] DeepSeek Flash cannot read attached images (#1618)") |`,
		`| Fork tip | \`77a670196\` (2026-09-15, \`release/v3.88.3-prerelease\` merge) |`,
		`| Pending upstream commits | **${pendingCount}** |`,
		"",
		"## Legend",
		"",
		"| Class | Mechanism |",
		"| ----- | --------- |",
		"| `A-CLEAN` | No overlap with any fork-touched file → direct cherry-pick |",
		"| `E-SKIP` | Upstream-org automation the fork does not run |",
		"",
		"## Summary",
		"",
		"| Class | Count |",
		"| ----- | ----- |",
		"| `A-CLEAN` | 1 |",
		"| **Total** | **1** |",
		"",
		"## SYNC-1 — Security & Safety Features (`P0`/`P1`)",
		"",
		"| SHA | Date | Subject | Class | Pri | Δ | Status | Blocked-by | Resolved: | Version | Exception |",
		"| --- | ---- | ------- | ----- | --- | - | ------ | ---------- | --------- | ------- | --------- |",
		...rows,
		"",
	]
	for (const note of notes) lines.push(note, "")
	lines.push("## Recommended execution order", "", `1. Start with \`${PREFIX_A}\`.`, "")
	return lines.join("\n")
}

/**
 * Stub repo probe. `commits` are the row SHAs that resolve to a commit,
 * `reachable` the fork SHAs that are ancestors of master.
 */
function makeProbe({
	commits = [],
	reachable = [],
	upstreamTip = TIP,
	mergeBase = MERGE_BASE,
	/**
	 * WS-4 (F-F-5): ancestry of a row's upstream SHA w.r.t. `upstream/main`.
	 * Defaults to `true`: the fixtures here are about parsing and invariants, not
	 * provenance — the provenance tests override it per case.
	 */
	isAncestorOfUpstream = () => true,
	/**
	 * WS-4 (F-F-1): git's signature fields (`%G?`, `%GS`). Defaults to a good
	 * signature from the GitHub web-flow identity so unrelated fixtures stay green;
	 * each signature test overrides it with the case under test.
	 */
	commitSignature = () => ({ validity: "G", signer: GITHUB_WEBFLOW_SIGNER }),
} = {}) {
	const commitSet = new Set(commits)
	const reachableSet = new Set(reachable)
	return {
		// `git cat-file -t` resolves a PREFIX, so the stub must too: the register
		// header records 9-character prefixes while the probe knows full SHAs.
		commitType: (sha) => {
			const candidates = [...commitSet, upstreamTip, mergeBase].filter(Boolean)
			return candidates.some((candidate) => candidate === sha || candidate.startsWith(sha)) ? "commit" : null
		},
		isReachableFromForkRef: (sha) => reachableSet.has(sha),
		upstreamTip: () => upstreamTip,
		mergeBase: () => mergeBase,
		isAncestorOfUpstream,
		commitSignature,
	}
}

/** A well-formed three-row register over the three fixture commits. */
function healthyRegister(overrides = {}) {
	return buildRegister({
		rows: [
			makeRow(PREFIX_A, "feat: Add Read+Write allowlists (#1274)", {
				klass: "C-REIMPLEMENT",
				priority: "P0",
				delta: 28,
			}),
			makeRow(PREFIX_B, "feat(file-safety): file version token (#1383)", { priority: "P0" }),
			// `B-CAREFUL` with Δ 2 keeps the fixture ladder-consistent: an
			// `A-CLEAN` row with Δ > 0 is exactly what `class-ladder` rejects.
			makeRow(PREFIX_C, "feat(api): abort signal support for bedrock (#1292)", { klass: "B-CAREFUL", delta: 2 }),
		],
		pendingCount: 3,
		...overrides,
	})
}

const HEALTHY_PENDING = [SHA_A, SHA_B, SHA_C]
const HEALTHY_PROBE = makeProbe({ commits: [PREFIX_A, PREFIX_B, PREFIX_C] })

/** The check with the given id from a validation report. */
function checkById(report, id) {
	const check = report.checks.find((candidate) => candidate.id === id)
	assert.ok(check, `expected a check with id "${id}"`)
	return check
}

// ---------------------------------------------------------------------------
// Row-scoped parsing
// ---------------------------------------------------------------------------

describe("row-scoped register parsing", () => {
	it("counts only table rows, not backticked SHAs in prose", () => {
		// The trap that produced ~29 false duplicates: the same SHAs repeat in
		// Notes, in the execution order and as the baseline tips.
		const markdown = healthyRegister({
			notes: [
				`**Notes.** \`${PREFIX_A}\` / \`${PREFIX_B}\` are the highest-value low-risk picks in the batch.`,
				`Revisit \`${PREFIX_A}\` once \`${PREFIX_C}\` lands.`,
			],
		})
		const { rows } = parseRegister(markdown)
		assert.equal(rows.length, 3)
		assert.deepEqual(
			rows.map((row) => row.sha),
			[PREFIX_A, PREFIX_B, PREFIX_C],
		)

		// Documents WHY the row-scoped matcher is mandatory.
		const naive = markdown.match(/`[0-9a-f]{9}`/g) ?? []
		assert.ok(
			naive.length > rows.length,
			`expected a naive hex-token grep to over-count (got ${naive.length} vs ${rows.length} rows)`,
		)
	})

	it("does not treat the Legend / Summary class cells as commit rows", () => {
		const { rows } = parseRegister(healthyRegister())
		assert.equal(rows.length, 3)
		assert.ok(rows.every((row) => /^[0-9a-f]{9}$/.test(row.sha)))
	})

	it("parses the row cells in the register's column order", () => {
		const { rows } = parseRegister(healthyRegister())
		assert.deepEqual(rows[0], {
			line: rows[0].line,
			sha: PREFIX_A,
			raw: rows[0].raw,
			date: "2026-09-01",
			subject: "feat: Add Read+Write allowlists (#1274)",
			klass: "C-REIMPLEMENT",
			priority: "P0",
			delta: "28",
			status: "☐",
			synced: false,
			forkSha: null,
			inProgress: false,
			inProgressSha: null,
			discarded: false,
			blockedBy: "",
			blockedByTokens: [],
			resolved: "",
			version: "",
			exception: "",
			exceptionInfo: null,
			sectionId: "SYNC-1",
		})
	})

	it("splits a row into eleven content cells, with the schema appended after Status", () => {
		assert.deepEqual(
			splitRowCells(
				makeRow(PREFIX_A, "fix: x", {
					status: "☑ `abc1234`",
					blockedBy: "`abc1234`",
					resolved: "2026-09-16",
					version: "3.88.4",
					exception: "excepted 2026-09-16 — a recorded decision",
				}),
			),
			[
				`\`${PREFIX_A}\``,
				"2026-09-01",
				"fix: x",
				"`A-CLEAN`",
				"P1",
				"0",
				"☑ `abc1234`",
				"`abc1234`",
				"2026-09-16",
				"3.88.4",
				"excepted 2026-09-16 — a recorded decision",
			],
		)
	})

	// F-B-1 / HD-06 regression. The old parser read `status` at `cells[6]`; with a
	// column inserted before `Status` that cell holds `Blocked-by`, so `synced`
	// read false and the ☑ reachability checks went QUIET (a false negative).
	// Columns are now resolved by header NAME, so both the new order and an
	// inserted column parse correctly.
	it("resolves status by header name after the new columns (regression: cells[6] went quiet)", () => {
		const register = buildRegister({
			rows: [makeRow(PREFIX_A, "fix: a", { status: "☑ `abc1234`", resolved: "2026-09-16", version: "3.88.4" })],
			pendingCount: 1,
		})
		const { rows } = parseRegister(register)
		assert.equal(rows.length, 1)
		assert.equal(rows[0].status, "☑ `abc1234`", "status must come from the Status column, not a fixed index")
		assert.equal(rows[0].synced, true)
		assert.equal(rows[0].forkSha, "abc1234")
		assert.equal(rows[0].resolved, "2026-09-16")
		assert.equal(rows[0].version, "3.88.4")
	})

	it("still parses status when a column is inserted BEFORE Status", () => {
		// The exact hazard F-B-1 describes: `Blocked-by` before `Status` makes
		// `cells[6]` the Blocked-by cell. Name-based lookup must not care.
		const insertedHeader =
			"| SHA | Date | Subject | Class | Pri | Δ | Blocked-by | Status | Resolved: | Version | Exception |"
		const insertedSeparator =
			"| --- | ---- | ------- | ----- | --- | - | ---------- | ------ | --------- | ------- | --------- |"
		const row =
			`| \`${PREFIX_A}\` | 2026-09-01 | fix: a | \`A-CLEAN\` | P1 | 0 | ${EMPTY_CELL} | ☑ \`abc1234\` | ` +
			`2026-09-16 | 3.88.4 | ${EMPTY_CELL} |`
		const register = buildRegister({ rows: [] })
			.replace(
				"| SHA | Date | Subject | Class | Pri | Δ | Status | Blocked-by | Resolved: | Version | Exception |",
				insertedHeader,
			)
			.replace(
				"| --- | ---- | ------- | ----- | --- | - | ------ | ---------- | --------- | ------- | --------- |",
				insertedSeparator,
			)
			.replace(/\n\n## Recommended/, `\n${row}\n\n## Recommended`)
		const { rows } = parseRegister(register)
		assert.equal(rows.length, 1)
		assert.equal(rows[0].status, "☑ `abc1234`", "status must be found by name at index 7")
		assert.equal(rows[0].synced, true)
		assert.equal(rows[0].blockedBy, "", "the Blocked-by column is empty, not the status cell")
		assert.equal(rows[0].version, "3.88.4")
		assert.equal(headerColumnMap(insertedHeader).get("status"), 7)
		assert.equal(normaliseHeaderName("Resolved:"), "resolved")
	})

	it('maps an empty appended cell to "" and keeps `unknown` as a token', () => {
		assert.equal(cleanCell(EMPTY_CELL), "")
		assert.equal(cleanCell("  "), "")
		assert.deepEqual(parseBlockedBy(EMPTY_CELL), [])
		assert.deepEqual(parseBlockedBy("`a80b3b3ab`, `7e85e2793`"), ["a80b3b3ab", "7e85e2793"])
		// The PARSER keeps the token (a checker must be able to name it); the
		// CHECK is what forbids it in the column.
		assert.deepEqual(parseBlockedBy(UNKNOWN_BLOCKED_BY_TOKEN), [UNKNOWN_BLOCKED_BY_TOKEN])
	})

	it("parses a dated Exception token and refuses anything undated or under-substantiated", () => {
		assert.equal(parseException(EMPTY_CELL), null, "the placeholder means no exception")
		assert.equal(parseException(""), null)
		assert.deepEqual(parseException("excepted 2026-09-16 — merged under the pre-ladder classifier"), {
			date: "2026-09-16",
			reason: "merged under the pre-ladder classifier",
		})
		// CP1-9: a dated token with a token-length reason is NOT a decision record.
		// It must be reported as malformed, not quietly accepted.
		assert.deepEqual(parseException("EXCEPTED 2026-09-16 - too short"), {
			malformed: "EXCEPTED 2026-09-16 - too short",
			reasonTooShort: true,
			reason: "too short",
		})
		assert.ok(
			"a reason of at least the minimum length".length >= MIN_EXCEPTION_REASON_LENGTH,
			"the fixture reason length must clear the minimum so the boundary is meaningful",
		)
		// An undated exception must be distinguishable from "no exception": it is a
		// failure, never a silent skip.
		assert.deepEqual(parseException("excepted because I said so"), {
			malformed: "excepted because I said so",
		})
	})

	it("still reads a table that predates the appended columns", () => {
		// The schema has grown twice (`Blocked-by`/`Resolved:`/`Version`, then
		// `Exception`). A legacy table must keep parsing, with every appended cell
		// reading as "not recorded" — name-based lookup means a missing column can
		// never leak another cell's value into it (F-B-1).
		const legacy = [
			"# Register",
			"",
			"| Merge base | `252c69b5` (2026-08-20) |",
			"| Upstream tip | `500152b78` (2026-09-16) |",
			"| Pending upstream commits | **1** |",
			"",
			"## SYNC-1 — legacy table",
			"",
			"| SHA | Date | Subject | Class | Pri | Δ | Status |",
			"| --- | ---- | ------- | ----- | --- | - | ------ |",
			`| \`${PREFIX_A}\` | 2026-09-01 | fix: legacy | \`A-CLEAN\` | P1 | 0 | ☐ |`,
			"",
		].join("\n")
		const { rows } = parseRegister(legacy)
		assert.equal(rows.length, 1)
		assert.equal(rows[0].status, "☐")
		assert.equal(rows[0].klass, "A-CLEAN")
		assert.equal(rows[0].blockedBy, "")
		assert.equal(rows[0].resolved, "")
		assert.equal(rows[0].version, "")
		assert.equal(rows[0].exception, "")
		assert.equal(rows[0].exceptionInfo, null)
	})

	it("extracts the fork SHA from a ☑ status cell", () => {
		assert.equal(extractForkSha("☑ `abc1234`"), "abc1234")
		assert.equal(extractForkSha("☑ abc1234"), "abc1234")
		assert.equal(extractForkSha("☑"), null)
		assert.equal(extractForkSha("☐"), null)
	})

	it("parses the baseline table", () => {
		const baseline = parseBaseline(healthyRegister())
		assert.equal(baseline.mergeBase, MERGE_BASE.slice(0, 9))
		assert.equal(baseline.upstreamTip, TIP.slice(0, 9))
		assert.equal(baseline.forkTip, "77a670196")
		assert.equal(baseline.pendingCount, 3)
	})

	it("builds a per-batch roll-up of resolved vs pending", () => {
		const { sections } = parseRegister(
			buildRegister({
				rows: [makeRow(PREFIX_A, "fix: a", { status: "☑ `abc1234`" }), makeRow(PREFIX_B, "fix: b")],
				pendingCount: 2,
			}),
		)
		assert.deepEqual(buildBatchRollup(sections), [
			{
				id: "SYNC-1",
				suffix: "— Security & Safety Features (`P0`/`P1`)",
				total: 2,
				resolved: 1,
				pending: 1,
				other: 0,
			},
		])
	})
})

// ---------------------------------------------------------------------------
// validateRegister — the check set (counts derive from CHECK_IDS_*, never prose)
// ---------------------------------------------------------------------------

describe("validateRegister — well-formed register", () => {
	it("passes, reporting 3 rows / 0 duplicates / 0 missing / 0 unexpected", () => {
		const report = validateRegister({
			markdown: healthyRegister(),
			pendingShas: HEALTHY_PENDING,
			probe: HEALTHY_PROBE,
		})
		assert.equal(report.ok, true)
		assert.ok(report.checks.every((check) => check.ok))
		assert.deepEqual(report.counts, {
			rows: 3,
			pendingCommits: 3,
			duplicates: 0,
			missing: 0,
			unexpected: 0,
			synced: 0,
		})
	})

	it("exposes every full-profile check in CHECK_IDS_FULL order", () => {
		const report = validateRegister({
			markdown: healthyRegister(),
			pendingShas: HEALTHY_PENDING,
			probe: HEALTHY_PROBE,
		})
		assert.deepEqual(
			report.checks.map((check) => check.id),
			CHECK_IDS_FULL,
		)
		assert.equal(report.profile, "full")
	})

	it("the repo-only profile reports exactly the merge-base-free checks", () => {
		// Passed no pending list on purpose: the profile must not need one, and it
		// must not invent `missing`/`unexpected` from an empty range (F-A-7, CP1-7).
		const report = validateRegister({
			markdown: healthyRegister(),
			pendingShas: null,
			probe: HEALTHY_PROBE,
			profile: "repo-only",
		})
		assert.equal(report.profile, "repo-only")
		assert.deepEqual(
			report.checks.map((check) => check.id),
			CHECK_IDS_REPO_ONLY,
		)
		assert.ok(
			!report.checks.some((check) => check.id === "coverage"),
			"coverage is merge-base-derived and must not be reported in the repo-only profile",
		)
		// CP1-7: unevaluated quantities are `null`, NOT `0` — a consumer must never
		// read "0 pending" from a profile that never measured the range.
		assert.equal(report.missing, null)
		assert.equal(report.unexpected, null)
		assert.equal(report.counts.pendingCommits, null)
		assert.equal(report.counts.missing, null)
		assert.equal(report.counts.unexpected, null)
		// Real, evaluable quantities stay numbers.
		assert.equal(report.counts.rows, 3)
		assert.equal(report.counts.duplicates, 0)
		assert.equal(report.ok, true)
	})
})

describe("validateRegister — 10-character row SHA (the silent-failure defect)", () => {
	// Exactly one character too long: it RESOLVES in git, but never matches the
	// canonical 9-character prefix used for coverage.
	const LONG = `${PREFIX_B}7`
	const markdown = buildRegister({
		rows: [
			makeRow(PREFIX_A, "feat: Add Read+Write allowlists (#1274)"),
			makeRow(LONG, "feat(file-safety): file version token (#1383)"),
			makeRow(PREFIX_C, "feat(api): abort signal support for bedrock (#1292)"),
		],
		pendingCount: 3,
	})
	const report = validateRegister({
		markdown,
		pendingShas: HEALTHY_PENDING,
		probe: makeProbe({ commits: [PREFIX_A, LONG, PREFIX_C] }),
	})

	it("fails hard", () => {
		assert.equal(report.ok, false)
	})

	it("names the offending row (line, SHA and subject)", () => {
		const format = checkById(report, "row-sha-format")
		assert.equal(format.ok, false)
		assert.equal(format.failures.length, 1)
		const [failure] = format.failures
		assert.match(failure, /10-character SHA/)
		assert.ok(failure.includes(LONG), "must name the 10-character SHA")
		assert.match(failure, /file version token/, "must name the row by subject")
		assert.match(failure, /line \d+/)
	})

	it("still resolves, which is exactly why the format check must exist", () => {
		// A longer prefix is a valid git object name — resolution cannot catch it.
		assert.equal(checkById(report, "row-sha-resolves").ok, true)
	})

	it("also reports the commit as missing and the row as unexpected", () => {
		assert.deepEqual(report.missing, [PREFIX_B])
		assert.deepEqual(report.unexpected, [LONG])
		assert.equal(checkById(report, "coverage").ok, false)
	})
})

describe("validateRegister — coverage", () => {
	it("fails when a pending commit has no row", () => {
		const markdown = buildRegister({
			rows: [makeRow(PREFIX_A, "fix: a"), makeRow(PREFIX_C, "fix: c")],
			pendingCount: 3,
		})
		const report = validateRegister({
			markdown,
			pendingShas: HEALTHY_PENDING,
			probe: makeProbe({ commits: [PREFIX_A, PREFIX_C] }),
		})
		assert.equal(report.ok, false)
		assert.deepEqual(report.missing, [PREFIX_B])
		const coverage = checkById(report, "coverage")
		assert.equal(coverage.ok, false)
		assert.match(coverage.failures.join("\n"), new RegExp(PREFIX_B))
		assert.match(coverage.failures.join("\n"), /has no row/)
	})

	it("fails when a row references a commit outside merge-base..upstream/main", () => {
		const markdown = buildRegister({
			rows: [
				makeRow(PREFIX_A, "fix: a"),
				makeRow(PREFIX_B, "fix: b"),
				makeRow(PREFIX_C, "fix: c"),
				makeRow("deadbeef1", "fix: stale row"),
			],
			pendingCount: 4,
		})
		const report = validateRegister({
			markdown,
			pendingShas: HEALTHY_PENDING,
			probe: makeProbe({ commits: [PREFIX_A, PREFIX_B, PREFIX_C, "deadbeef1"] }),
		})
		assert.equal(report.ok, false)
		assert.deepEqual(report.unexpected, ["deadbeef1"])
		assert.match(checkById(report, "coverage").failures.join("\n"), /is not in merge-base/)
	})

	it("cross-checks rows against the pending list in isolation", () => {
		const { rows } = parseRegister(healthyRegister())
		const cross = crossCheckRows([...rows, rows[0]], HEALTHY_PENDING)
		assert.deepEqual(cross.missing, [])
		assert.deepEqual(cross.unexpected, [])
		assert.deepEqual(cross.duplicates, [{ sha: PREFIX_A, count: 2 }])
	})
})

describe("validateRegister — duplicate rows", () => {
	it("fails and reports every duplicated SHA", () => {
		const markdown = buildRegister({
			rows: [
				makeRow(PREFIX_A, "fix: a"),
				makeRow(PREFIX_B, "fix: b"),
				makeRow(PREFIX_C, "fix: c"),
				makeRow(PREFIX_B, "fix: b (duplicate row)"),
			],
			pendingCount: 4,
		})
		const report = validateRegister({
			markdown,
			pendingShas: HEALTHY_PENDING,
			probe: makeProbe({ commits: [PREFIX_A, PREFIX_B, PREFIX_C] }),
		})
		assert.equal(report.ok, false)
		assert.deepEqual(report.duplicates, [{ sha: PREFIX_B, count: 2 }])
		const duplicates = checkById(report, "duplicates")
		assert.equal(duplicates.ok, false)
		assert.match(duplicates.failures[0], /appears 2×/)
		assert.match(duplicates.failures[0], /lines \d+, \d+/)
	})
})

describe("validateRegister — ☑ rows must carry a fork SHA reachable from master", () => {
	it("fails when a ☑ row has no fork SHA", () => {
		const markdown = buildRegister({
			rows: [
				makeRow(PREFIX_A, "fix: a", { status: "☑" }),
				makeRow(PREFIX_B, "fix: b"),
				makeRow(PREFIX_C, "fix: c"),
			],
			pendingCount: 3,
		})
		const report = validateRegister({
			markdown,
			pendingShas: HEALTHY_PENDING,
			probe: makeProbe({ commits: [PREFIX_A, PREFIX_B, PREFIX_C] }),
		})
		assert.equal(report.ok, false)
		const synced = checkById(report, "synced-fork-sha")
		assert.equal(synced.ok, false)
		assert.match(synced.failures[0], /marked ☑ but records no fork SHA/)
		assert.match(synced.failures[0], /R9/)
	})

	it("fails when the fork SHA is not reachable from master", () => {
		const markdown = buildRegister({
			rows: [
				makeRow(PREFIX_A, "fix: a", { status: "☑ `deadbeef1`" }),
				makeRow(PREFIX_B, "fix: b"),
				makeRow(PREFIX_C, "fix: c"),
			],
			pendingCount: 3,
		})
		const report = validateRegister({
			markdown,
			pendingShas: HEALTHY_PENDING,
			probe: makeProbe({ commits: [PREFIX_A, PREFIX_B, PREFIX_C], reachable: [] }),
		})
		assert.equal(report.ok, false)
		assert.match(checkById(report, "synced-fork-sha").failures[0], /not reachable from master/)
	})

	it("passes when the fork SHA is reachable and Resolved:/Version are recorded", () => {
		const markdown = buildRegister({
			rows: [
				makeRow(PREFIX_A, "fix: a", { status: "☑ `abc1234`", resolved: "2026-09-16", version: "3.88.4" }),
				makeRow(PREFIX_B, "fix: b"),
				makeRow(PREFIX_C, "fix: c"),
			],
			pendingCount: 3,
		})
		const report = validateRegister({
			markdown,
			pendingShas: HEALTHY_PENDING,
			probe: makeProbe({ commits: [PREFIX_A, PREFIX_B, PREFIX_C], reachable: ["abc1234"] }),
		})
		assert.equal(report.ok, true)
		assert.equal(report.counts.synced, 1)
	})
})

describe("validateRegister — stale-in-progress (◐ rows already merged)", () => {
	const stalenessRegister = (status) =>
		buildRegister({
			rows: [makeRow(PREFIX_A, "fix: a", { status }), makeRow(PREFIX_B, "fix: b"), makeRow(PREFIX_C, "fix: c")],
			pendingCount: 3,
		})
	const probeWithReachable = (reachable) => makeProbe({ commits: [PREFIX_A, PREFIX_B, PREFIX_C], reachable })

	it("warns (but does not fail) when a ◐ row's fork SHA is reachable from the fork ref", () => {
		const report = validateRegister({
			markdown: stalenessRegister("◐ deadbee11"),
			pendingShas: HEALTHY_PENDING,
			probe: probeWithReachable(["deadbee11"]),
		})
		// Structurally consistent: correct row count, no duplicates — so the hard
		// verdict stays green...
		assert.equal(report.ok, true)
		assert.equal(report.hasWarnings, true)
		// ...but the stale row is surfaced, naming BOTH the row and the SHA.
		const stale = checkById(report, "stale-in-progress")
		assert.equal(stale.ok, true)
		assert.equal(stale.severity, "warning")
		assert.equal(stale.warnings.length, 1)
		assert.match(stale.warnings[0], new RegExp(PREFIX_A))
		assert.match(stale.warnings[0], /deadbee11/)
		assert.match(stale.warnings[0], /flip it to ☑/)
		assert.match(stale.warnings[0], /line \d+/)
		assert.equal(report.staleInProgress.length, 1)
		assert.equal(report.staleInProgress[0].forkSha, "deadbee11")
	})

	it("does NOT warn when a ◐ row's fork SHA is not reachable from the fork ref", () => {
		const report = validateRegister({
			markdown: stalenessRegister("◐ deadbee11"),
			pendingShas: HEALTHY_PENDING,
			probe: probeWithReachable([]),
		})
		assert.equal(report.ok, true)
		assert.equal(report.hasWarnings, false)
		assert.deepEqual(checkById(report, "stale-in-progress").warnings, [])
		assert.deepEqual(report.staleInProgress, [])
	})

	it("does NOT warn for a bare ◐ with no SHA (the operator may be mid-pick)", () => {
		const report = validateRegister({
			markdown: stalenessRegister("◐"),
			pendingShas: HEALTHY_PENDING,
			probe: probeWithReachable(["deadbee11"]),
		})
		assert.equal(report.ok, true)
		assert.deepEqual(report.staleInProgress, [])
		assert.deepEqual(checkById(report, "stale-in-progress").warnings, [])
	})

	it("ignores ☐ and ✖ rows entirely", () => {
		for (const status of ["☐", "✖"]) {
			const report = validateRegister({
				markdown: stalenessRegister(status),
				pendingShas: HEALTHY_PENDING,
				probe: probeWithReachable(["deadbee11"]),
			})
			assert.deepEqual(report.staleInProgress, [], `status ${status} must not be treated as in-progress`)
		}
	})

	it("parses the ◐ fork SHA from the same status cell", () => {
		assert.equal(extractMarkerSha("◐ f4287ff4f", IN_PROGRESS_MARKER), "f4287ff4f")
		assert.equal(extractMarkerSha("◐ `f4287ff4f`", IN_PROGRESS_MARKER), "f4287ff4f")
		assert.equal(extractMarkerSha("◐", IN_PROGRESS_MARKER), null)
		assert.equal(extractMarkerSha("☑ abc1234", IN_PROGRESS_MARKER), null)
	})

	it("keeps the existing ☑ behaviour unchanged (and still requires the metadata)", () => {
		const report = validateRegister({
			markdown: buildRegister({
				rows: [
					makeRow(PREFIX_A, "fix: a", { status: "☑ `deadbeef1`", resolved: "2026-09-16", version: "3.88.4" }),
					makeRow(PREFIX_B, "fix: b"),
					makeRow(PREFIX_C, "fix: c"),
				],
				pendingCount: 3,
			}),
			pendingShas: HEALTHY_PENDING,
			probe: probeWithReachable(["deadbeef1"]),
		})
		assert.deepEqual(report.staleInProgress, [])
		assert.equal(checkById(report, "synced-fork-sha").ok, true)
		assert.equal(report.counts.synced, 1)
	})
})

describe("verifyExitCode — stale-in-progress warns by default, fails under --strict", () => {
	it("exits 0 for a structurally-clean register with stale rows when --strict is absent", () => {
		assert.equal(verifyExitCode({ ok: true, staleCount: 6, strict: false }), 0)
	})

	it("promotes the same warning to exit 1 under --strict", () => {
		assert.equal(verifyExitCode({ ok: true, staleCount: 6, strict: true }), 1)
	})

	it("exits 0 with no stale rows even under --strict", () => {
		assert.equal(verifyExitCode({ ok: true, staleCount: 0, strict: true }), 0)
	})

	it("exits 1 for a structural failure regardless of --strict", () => {
		assert.equal(verifyExitCode({ ok: false, staleCount: 0, strict: false }), 1)
		assert.equal(verifyExitCode({ ok: false, staleCount: 6, strict: false }), 1)
	})
})

describe("chooseForkRef — shared fork-ref resolution (regression: stale local master)", () => {
	it("prefers origin/master when local master is a stale ancestor of it", () => {
		const ref = chooseForkRef({
			override: null,
			originResolves: true,
			localMasterResolves: true,
			localMasterIsAncestorOfOrigin: true,
		})
		assert.equal(ref, ORIGIN_FORK_REF)
		assert.equal(ref, "origin/master")
	})

	it("falls back to local master when master is ahead or diverged (not an ancestor)", () => {
		assert.equal(
			chooseForkRef({
				override: null,
				originResolves: true,
				localMasterResolves: true,
				localMasterIsAncestorOfOrigin: false,
			}),
			FORK_REF,
		)
		assert.equal(FORK_REF, "master")
	})

	it("falls back to local master when origin/master does not resolve", () => {
		assert.equal(
			chooseForkRef({
				override: null,
				originResolves: false,
				localMasterResolves: true,
				localMasterIsAncestorOfOrigin: false,
			}),
			FORK_REF,
		)
	})

	it("honours the --fork-ref override above both defaults", () => {
		assert.equal(
			chooseForkRef({
				override: "release/v3.88.3-stable",
				originResolves: true,
				localMasterResolves: true,
				localMasterIsAncestorOfOrigin: true,
			}),
			"release/v3.88.3-stable",
		)
	})

	it("threads the resolved ref into BOTH the ☑ and ◐ check titles/messages", () => {
		const markdown = buildRegister({
			rows: [
				makeRow(PREFIX_A, "fix: a", { status: "☑ `deadbeef1`" }),
				makeRow(PREFIX_B, "fix: b", { status: "◐ deadbee11" }),
				makeRow(PREFIX_C, "fix: c"),
			],
			pendingCount: 3,
		})
		const report = validateRegister({
			markdown,
			pendingShas: HEALTHY_PENDING,
			probe: makeProbe({ commits: [PREFIX_A, PREFIX_B, PREFIX_C], reachable: ["deadbee11"] }),
			forkRef: "origin/master",
		})
		assert.match(checkById(report, "synced-fork-sha").title, /origin\/master/)
		assert.match(checkById(report, "synced-fork-sha").failures[0], /not reachable from origin\/master/)
		assert.match(checkById(report, "stale-in-progress").title, /origin\/master/)
		assert.match(checkById(report, "stale-in-progress").warnings[0], /already reachable from origin\/master/)
	})
})

describe("validateRegister — header-tip (merge-base-free) and header-pending-count (deep)", () => {
	it("header-pending-count fails when the pending count drifts from reality", () => {
		const report = validateRegister({
			markdown: healthyRegister({ pendingCount: 102 }),
			pendingShas: HEALTHY_PENDING,
			probe: HEALTHY_PROBE,
		})
		assert.equal(report.ok, false)
		const header = checkById(report, "header-pending-count")
		assert.equal(header.ok, false)
		assert.match(header.failures.join("\n"), /Pending upstream commits: 102/)
		assert.match(header.failures.join("\n"), /contains 3 commits/)
	})

	it("header-pending-count fails when the recorded baseline tip drifts", () => {
		const report = validateRegister({
			markdown: healthyRegister({ tip: "aaaaaaaaa" }),
			pendingShas: HEALTHY_PENDING,
			probe: HEALTHY_PROBE,
		})
		assert.equal(report.ok, false)
		assert.match(checkById(report, "header-pending-count").failures.join("\n"), /records baseline tip `aaaaaaaaa`/)
	})

	it("header-pending-count fails when the merge base drifts", () => {
		const report = validateRegister({
			markdown: healthyRegister({ mergeBase: "bbbbbbbbb" }),
			pendingShas: HEALTHY_PENDING,
			probe: HEALTHY_PROBE,
		})
		assert.equal(report.ok, false)
		assert.match(checkById(report, "header-pending-count").failures.join("\n"), /records merge base `bbbbbbbbb`/)
	})

	// F-A-7 / F-G-5: the split exists so the repo-only profile is GREEN at
	// `--depth=1`. A tip that no longer matches upstream (the normal state
	// between an upstream advance and a refresh) must not fail it — only a tip
	// that does not resolve in this repo may.
	it("header-tip passes for a stale-but-real tip and is reported in the repo-only profile", () => {
		const report = validateRegister({
			markdown: healthyRegister({ tip: "500152b78" }),
			pendingShas: null,
			probe: makeProbe({
				commits: [PREFIX_A, PREFIX_B, PREFIX_C, "500152b78"],
				upstreamTip: "f7806475331fcae5f4e8b5558d04415eeb5da88c",
			}),
			profile: "repo-only",
		})
		assert.equal(report.ok, true, "a recorded tip that is merely behind upstream is not a defect")
		assert.equal(checkById(report, "header-tip").ok, true)
	})

	it("header-tip fails when the recorded tip does not resolve in this repo", () => {
		const report = validateRegister({
			markdown: healthyRegister({ tip: "aaaaaaaaa" }),
			pendingShas: null,
			probe: makeProbe({ commits: [PREFIX_A, PREFIX_B, PREFIX_C] }),
			profile: "repo-only",
		})
		assert.equal(report.ok, false)
		assert.match(checkById(report, "header-tip").failures.join("\n"), /does not resolve to a commit/)
	})

	it("header-tip fails when the header records no tip at all", () => {
		const report = validateRegister({
			markdown: healthyRegister().replace(/^\| Upstream tip \|.*$/m, ""),
			pendingShas: null,
			probe: HEALTHY_PROBE,
			profile: "repo-only",
		})
		assert.equal(report.ok, false)
		assert.match(checkById(report, "header-tip").failures.join("\n"), /no parseable "Upstream tip"/)
	})
})

// ---------------------------------------------------------------------------
// Enforced register invariants — one describe per invariant (H-02 / F-C-2)
// ---------------------------------------------------------------------------

/** The three fixture rows, with row A's status/extra cells overridable. */
function invariantRegister(overrides = {}) {
	return buildRegister({
		rows: [
			makeRow(PREFIX_A, "fix: a", { klass: "B-CAREFUL", delta: 2, ...overrides.a }),
			makeRow(PREFIX_B, "fix: b", { klass: "B-CAREFUL", delta: 1 }),
			makeRow(PREFIX_C, "fix: c", { klass: "B-CAREFUL", delta: 3 }),
		],
		pendingCount: 3,
	})
}

/** Runs the full profile over the invariant fixture. Rejects ladder-adjacent noise. */
function invariantReport(overrides) {
	return validateRegister({
		markdown: invariantRegister(overrides),
		pendingShas: HEALTHY_PENDING,
		probe: makeProbe({ commits: [PREFIX_A, PREFIX_B, PREFIX_C], reachable: ["abc1234"] }),
	})
}

// WS-1b / H-02 amendment: `A-CLEAN` ⇒ Δ = 0 stays HARD (an `A-CLEAN` label
// asserts pickability, so Δ > 0 is a false claim); the `Blocked-by` clause that
// used to live here moved to the readiness split, because `A-CLEAN` plus a
// recorded prerequisite is not a class defect — a correctly blocked row is
// precisely one whose blocker has not landed.
describe("invariant — A-CLEAN ⇒ Δ = 0 is hard (class-ladder)", () => {
	it("names the row SHA when an A-CLEAN row carries Δ > 0", () => {
		const report = invariantReport({ a: { klass: "A-CLEAN", delta: 28 } })
		assert.equal(report.ok, false)
		const ladder = checkById(report, "class-ladder")
		assert.equal(ladder.ok, false)
		assert.match(ladder.failures.join("\n"), new RegExp(PREFIX_A))
		assert.match(ladder.failures.join("\n"), /A-CLEAN requires Δ = 0/)
		// The failure must point at the remedy, not merely complain.
		assert.match(ladder.failures.join("\n"), new RegExp(`dated \`${EXCEPTION_COLUMN}\``))
	})

	it("does NOT fail an A-CLEAN row merely for recording a prerequisite", () => {
		// The exact SYNC-13 shape: A-CLEAN, Δ 0, prerequisite recorded. This is a
		// READINESS fact — the row is correctly blocked — so the hard check passes
		// and the ready set excludes it.
		const report = invariantReport({ a: { klass: "A-CLEAN", delta: 0, blockedBy: `\`${PREFIX_B}\`` } })
		assert.equal(checkById(report, "class-ladder").ok, true)
		assert.equal(report.ok, true)
		assert.ok(
			!report.readySet.some((row) => row.sha === PREFIX_A),
			"a row with a recorded prerequisite is not in the ready set",
		)
	})
})

// WS-1b item 2: the `B-CAREFUL` half of the ladder is an ADVISORY. Δ > 5 means
// "inspect before picking" — a judgement, not a misclassification to
// auto-correct — so it is reported and the run stays green (and exit 0).
describe("advisory — B-CAREFUL ⇒ 1 ≤ Δ ≤ 5 (class-ladder-advisory)", () => {
	it("reports Δ > 5 as an advisory naming the row SHA and exits 0", () => {
		const report = invariantReport({ a: { klass: "B-CAREFUL", delta: 6 } })
		assert.equal(report.ok, true, "an advisory is not a defect")
		assert.equal(checkById(report, "class-ladder").ok, true, "the hard half says nothing about B-CAREFUL")
		const advisory = checkById(report, "class-ladder-advisory")
		assert.equal(advisory.severity, "warning")
		assert.equal(advisory.ok, true)
		assert.equal(advisory.failures.length, 0, "an advisory never records a failure")
		assert.match(advisory.warnings.join("\n"), new RegExp(PREFIX_A))
		assert.match(advisory.warnings.join("\n"), /inspect before picking/)
		assert.equal(report.advisories.length, 1)
		assert.equal(report.advisories[0].sha, PREFIX_A)
		assert.equal(
			verifyExitCode({ ok: report.ok, staleCount: report.staleInProgress.length, strict: false }),
			0,
			"a B-CAREFUL Δ>5 row must never fail the run",
		)
		assert.equal(
			verifyExitCode({ ok: report.ok, staleCount: report.staleInProgress.length, strict: true }),
			0,
			"even --strict promotes only stale ◐ rows, not advisories",
		)
	})

	it("reports Δ 0 and a non-numeric Δ as advisories too, never failures", () => {
		for (const delta of [0, 8, ""]) {
			const report = invariantReport({ a: { klass: "B-CAREFUL", delta } })
			assert.equal(report.ok, true, `Δ ${JSON.stringify(delta)} must not fail the run`)
			const advisory = checkById(report, "class-ladder-advisory")
			assert.match(advisory.warnings.join("\n"), new RegExp(PREFIX_A))
		}
	})

	it("accepts the boundary values Δ 1 and Δ 5 with no advisory at all", () => {
		for (const delta of [1, 5]) {
			const report = invariantReport({ a: { klass: "B-CAREFUL", delta } })
			const advisory = checkById(report, "class-ladder-advisory")
			assert.equal(advisory.warnings.length, 0, `Δ ${delta} is inside the ladder`)
			assert.equal(report.advisories.length, 0)
		}
	})

	it("does not constrain C-REIMPLEMENT / D-LOCAL / E-SKIP / X-REJECT", () => {
		for (const klass of ["C-REIMPLEMENT", "D-LOCAL", "E-SKIP", "X-REJECT"]) {
			const report = invariantReport({ a: { klass, delta: 53 } })
			assert.equal(checkById(report, "class-ladder").ok, true, `${klass} may carry any Δ`)
			assert.equal(checkById(report, "class-ladder-advisory").warnings.length, 0)
		}
	})

	it("buildInspectFirst and the advisory check cannot diverge", () => {
		const { rows } = parseRegister(invariantRegister({ a: { klass: "B-CAREFUL", delta: 9 } }))
		assert.deepEqual(
			buildInspectFirst(rows).map((row) => row.sha),
			[PREFIX_A],
		)
	})
})

// WS-1b item 3: the dated exception. Its ONLY permitted use is a row that
// violates the hard `A-CLEAN` ⇒ Δ = 0 clause, and `--verify` prints every
// excepted row by SHA so an exception can never be silent.
describe("exception — a dated Exception honours a recorded decision", () => {
	const DATED = "excepted 2026-09-16 — merged with Δ2 under the pre-ladder classifier (2026-09-16 triage)"

	it("suppresses the hard ladder failure and reports the row BY SHA", () => {
		const report = invariantReport({ a: { klass: "A-CLEAN", delta: 2, exception: DATED } })
		assert.equal(checkById(report, "class-ladder").ok, true)
		assert.equal(report.ok, true)
		assert.equal(report.exceptions.length, 1)
		assert.equal(report.exceptions[0].sha, PREFIX_A, "the excepted row must be named by SHA")
		assert.equal(report.exceptions[0].date, "2026-09-16")
		assert.match(report.exceptions[0].reason, /pre-ladder classifier/)
		assert.equal(
			verifyExitCode({ ok: report.ok, staleCount: report.staleInProgress.length, strict: false }),
			0,
		)
	})

	it("fails when the exception token is not dated (an exception can never be silent)", () => {
		const report = invariantReport({ a: { klass: "A-CLEAN", delta: 2, exception: "excepted, trust me" } })
		assert.equal(report.ok, false)
		const ladder = checkById(report, "class-ladder")
		assert.match(ladder.failures.join("\n"), new RegExp(PREFIX_A))
		assert.match(ladder.failures.join("\n"), /not a dated token/)
		assert.equal(report.exceptions.length, 0, "an unparseable token is not a usable exception")
	})

	it("fails when the row does not violate A-CLEAN ⇒ Δ = 0 (no gratuitous exceptions)", () => {
		for (const override of [
			{ klass: "A-CLEAN", delta: 0 },
			{ klass: "B-CAREFUL", delta: 2 },
			{ klass: "D-LOCAL", delta: 53 },
		]) {
			const report = invariantReport({ a: { ...override, exception: DATED } })
			assert.equal(report.ok, false, `${override.klass} Δ ${override.delta} must not be exceptable`)
			assert.match(checkById(report, "class-ladder").failures.join("\n"), /does not violate/)
		}
	})
})

// WS-1b item 5: the ready set is DERIVED (F-A-4), informational, and must never
// change the exit code. `B-CAREFUL` ⇒ Δ ≥ 1 makes `B-CAREFUL` ∧ Δ 0 empty by
// definition, so B-CAREFUL rows are reported separately as inspect-first.
describe("informational — the derived ready set (F-A-4)", () => {
	it("selects only A-CLEAN ∧ Δ 0 ∧ no Blocked-by ∧ open rows", () => {
		// Four shapes: ready, already merged, B-CAREFUL (never ready — Δ ≥ 1 by
		// definition) and A-CLEAN-but-blocked-on-an-unlanded-prerequisite.
		const BLOCKED = "aaaaaaaaa"
		const markdown = buildRegister({
			rows: [
				makeRow(PREFIX_A, "fix: ready"),
				makeRow(PREFIX_B, "fix: merged", {
					status: "☑ `abc1234`",
					resolved: "2026-09-16",
					version: "3.88.4",
				}),
				makeRow(PREFIX_C, "fix: careful", { klass: "B-CAREFUL", delta: 2 }),
				makeRow(BLOCKED, "fix: blocked", { blockedBy: `\`${PREFIX_C}\`` }),
			],
			pendingCount: 4,
		})
		const report = validateRegister({
			markdown,
			pendingShas: [
				"c747c024b0123456789abcdef0123456789abcd",
				SHA_B,
				SHA_C,
				"aaaaaaaaa0123456789abcdef0123456789abcd",
			],
			probe: makeProbe({
				commits: [PREFIX_A, PREFIX_B, PREFIX_C, BLOCKED],
				reachable: ["abc1234"],
			}),
		})
		assert.deepEqual(
			report.readySet.map((row) => row.sha),
			[PREFIX_A],
			"only the open A-CLEAN Δ 0 unblocked row is ready",
		)
		assert.deepEqual(
			report.inspectFirst.map((row) => row.sha),
			[],
			"Δ 2 is inside the ladder, so it is not inspect-first either",
		)
		assert.equal(report.ok, true)
	})

	it("excludes resolved, in-flight and deferred rows from the ready set", () => {
		const { rows } = parseRegister(
			buildRegister({
				rows: [
					makeRow(PREFIX_A, "fix: done", { status: "☑ `abc1234`" }),
					makeRow(PREFIX_B, "fix: in flight", { status: "◐ `abc1234`" }),
					makeRow(PREFIX_C, "fix: deferred", { status: "⏸ parked" }),
				],
				pendingCount: 3,
			}),
		)
		assert.deepEqual(
			buildReadySet(rows).map((row) => row.sha),
			[],
			"already-picked, in-flight and parked rows are not 'pickable today'",
		)
	})

	it("never changes the exit code, even with B-CAREFUL advisories present", () => {
		const { rows } = parseRegister(
			buildRegister({
				rows: [
					makeRow(PREFIX_A, "fix: ready"),
					makeRow(PREFIX_B, "fix: inspect me", { klass: "B-CAREFUL", delta: 6 }),
					makeRow(PREFIX_C, "fix: careful", { klass: "B-CAREFUL", delta: 1 }),
				],
				pendingCount: 3,
			}),
		)
		const report = validateRegister({
			markdown: buildRegister({
				rows: [
					makeRow(PREFIX_A, "fix: ready"),
					makeRow(PREFIX_B, "fix: inspect me", { klass: "B-CAREFUL", delta: 6 }),
					makeRow(PREFIX_C, "fix: careful", { klass: "B-CAREFUL", delta: 1 }),
				],
				pendingCount: 3,
			}),
			pendingShas: HEALTHY_PENDING,
			probe: makeProbe({ commits: [PREFIX_A, PREFIX_B, PREFIX_C] }),
		})
		assert.deepEqual(
			report.readySet.map((row) => row.sha),
			[PREFIX_A],
			"a B-CAREFUL row is never in the ready set",
		)
		assert.equal(report.advisories.length, 1, "the advisory is reported")
		assert.equal(checkById(report, "class-ladder-advisory").warnings.length, 1)
		assert.equal(buildInspectFirst(rows).length, 1)
		assert.equal(report.ok, true)
		assert.equal(verifyExitCode({ ok: report.ok, staleCount: 0, strict: false }), 0)
		assert.equal(verifyExitCode({ ok: report.ok, staleCount: 0, strict: true }), 0)
	})
})

// WS-1b item 4: `Blocked-by` is two different things. HARD: the token must name
// a DIFFERENT row of the register (and the literal `unknown` is forbidden).
// ADVISORY: the named prerequisite has not landed — readiness, not a defect.
describe("invariant — Blocked-by = X ⇒ X is a different row of this register (hard)", () => {
	it("names the row SHA when the token is not a register row", () => {
		const report = invariantReport({ a: { blockedBy: "deadbeef1" } })
		assert.equal(report.ok, false)
		const blocked = checkById(report, "blocked-by")
		assert.equal(blocked.ok, false)
		assert.match(blocked.failures.join("\n"), new RegExp(PREFIX_A))
		assert.match(blocked.failures.join("\n"), /not a\s+row in this register/)
	})

	it("fails on the literal `unknown` — a named unknown is worse than an empty cell", () => {
		const report = invariantReport({ a: { blockedBy: UNKNOWN_BLOCKED_BY_TOKEN } })
		assert.equal(report.ok, false)
		const blocked = checkById(report, "blocked-by")
		assert.equal(blocked.ok, false)
		assert.match(blocked.failures.join("\n"), /literal `unknown`/)
		assert.match(blocked.failures.join("\n"), new RegExp(PREFIX_A))
	})

	it("fails when the row is its own prerequisite", () => {
		const report = invariantReport({ a: { blockedBy: `\`${PREFIX_A}\`` } })
		assert.equal(report.ok, false)
		const blocked = checkById(report, "blocked-by")
		assert.equal(blocked.ok, false)
		assert.match(blocked.failures.join("\n"), /cannot be its\s+own prerequisite/)
	})

	it("accepts a 40-character token that resolves to a register row", () => {
		const markdown = buildRegister({
			rows: [
				makeRow(PREFIX_A, "fix: a", { status: "☑ `abc1234`", resolved: "2026-09-16", version: "3.88.4" }),
				makeRow(PREFIX_B, "fix: b", { blockedBy: `\`${SHA_A}\`` }),
				makeRow(PREFIX_C, "fix: c", { klass: "B-CAREFUL", delta: 2 }),
			],
			pendingCount: 3,
		})
		const report = validateRegister({
			markdown,
			pendingShas: HEALTHY_PENDING,
			probe: makeProbe({ commits: [PREFIX_A, PREFIX_B, PREFIX_C], reachable: ["abc1234"] }),
		})
		assert.equal(checkById(report, "blocked-by").ok, true)
	})
})

describe("advisory — an unlanded Blocked-by prerequisite is readiness (blocked-by-pending)", () => {
	it("warns naming both rows and exits 0 when the prerequisite has not landed", () => {
		const report = invariantReport({ a: { blockedBy: `\`${PREFIX_B}\`` } })
		assert.equal(report.ok, true, "a correctly blocked row is not a defect")
		assert.equal(checkById(report, "blocked-by").ok, true)
		const pending = checkById(report, "blocked-by-pending")
		assert.equal(pending.severity, "warning")
		assert.equal(pending.failures.length, 0)
		assert.match(pending.warnings.join("\n"), new RegExp(PREFIX_A))
		assert.match(pending.warnings.join("\n"), new RegExp(PREFIX_B))
		assert.match(pending.warnings.join("\n"), /land the prerequisite first/)
		assert.deepEqual(
			report.blockedByPending.map((row) => `${row.sha}<-${row.blocker}`),
			[`${PREFIX_A}<-${PREFIX_B}`],
		)
		assert.equal(verifyExitCode({ ok: report.ok, staleCount: 0, strict: false }), 0)
		assert.equal(verifyExitCode({ ok: report.ok, staleCount: 0, strict: true }), 0)
	})

	it("says nothing when the prerequisite is a ☑ row of this register", () => {
		const markdown = buildRegister({
			rows: [
				makeRow(PREFIX_A, "fix: a", {
					klass: "A-CLEAN",
					status: "☑ `abc1234`",
					resolved: "2026-09-16",
					version: "3.88.4",
				}),
				makeRow(PREFIX_B, "fix: b", { klass: "B-CAREFUL", delta: 1, blockedBy: `\`${PREFIX_A}\`` }),
				makeRow(PREFIX_C, "fix: c", { klass: "B-CAREFUL", delta: 2 }),
			],
			pendingCount: 3,
		})
		const report = validateRegister({
			markdown,
			pendingShas: HEALTHY_PENDING,
			probe: makeProbe({ commits: [PREFIX_A, PREFIX_B, PREFIX_C], reachable: ["abc1234"] }),
		})
		assert.equal(checkById(report, "blocked-by").ok, true)
		assert.equal(checkById(report, "blocked-by-pending").warnings.length, 0)
		assert.deepEqual(report.blockedByPending, [])
	})
})

describe("invariant — ☑ ⇒ fork SHA reachable ∧ Resolved: present ∧ Version present", () => {
	it("names the row SHA when a ☑ row records no Resolved: date", () => {
		const report = invariantReport({
			a: { klass: "A-CLEAN", status: "☑ `abc1234`", resolved: EMPTY_CELL, version: "3.88.4" },
		})
		assert.equal(report.ok, false)
		const synced = checkById(report, "synced-fork-sha")
		assert.equal(synced.ok, false)
		assert.match(synced.failures.join("\n"), new RegExp(PREFIX_A))
		assert.match(synced.failures.join("\n"), /records no Resolved: date/)
	})

	it("names the row SHA when a ☑ row records no Version", () => {
		const report = invariantReport({
			a: { klass: "A-CLEAN", status: "☑ `abc1234`", resolved: "2026-09-16", version: EMPTY_CELL },
		})
		assert.equal(report.ok, false)
		assert.match(checkById(report, "synced-fork-sha").failures.join("\n"), /records no Version/)
		assert.match(checkById(report, "synced-fork-sha").failures.join("\n"), new RegExp(PREFIX_A))
	})

	it("passes when all three parts of the contract hold", () => {
		const report = invariantReport({
			a: { klass: "A-CLEAN", delta: 0, status: "☑ `abc1234`", resolved: "2026-09-16", version: "3.88.4" },
		})
		assert.equal(checkById(report, "synced-fork-sha").ok, true)
		assert.equal(report.ok, true)
	})
})

describe("invariant — ✖ ⇒ non-empty rationale (discard-rationale)", () => {
	it("names the row SHA when a ✖ row carries no rationale anywhere", () => {
		const report = invariantReport({ a: { klass: "D-LOCAL", status: "✖", blockedBy: EMPTY_CELL } })
		assert.equal(report.ok, false)
		const discard = checkById(report, "discard-rationale")
		assert.equal(discard.ok, false)
		assert.match(discard.failures.join("\n"), new RegExp(PREFIX_A))
		assert.match(discard.failures.join("\n"), /carries no rationale/)
	})

	it("accepts an inline rationale in the Status cell", () => {
		const report = invariantReport({ a: { klass: "D-LOCAL", status: "✖ fork removed packages/cloud" } })
		assert.equal(checkById(report, "discard-rationale").ok, true)
	})

	it("accepts a batch-level **Rationale.** block", () => {
		const markdown = invariantRegister({ a: { klass: "D-LOCAL", status: "✖" } }).replace(
			"## SYNC-1 — Security & Safety Features (`P0`/`P1`)",
			"## SYNC-1 — Security & Safety Features (`P0`/`P1`)\n\n**Rationale.** The fork owns this concern already.",
		)
		const report = validateRegister({
			markdown,
			pendingShas: HEALTHY_PENDING,
			probe: makeProbe({ commits: [PREFIX_A, PREFIX_B, PREFIX_C] }),
		})
		assert.equal(checkById(report, "discard-rationale").ok, true)
	})

	it("does not require a rationale from a bare ☐/◐/⏸ row", () => {
		const report = invariantReport({ a: { klass: "B-CAREFUL", delta: 2, status: "⏸ deferred" } })
		assert.equal(checkById(report, "discard-rationale").ok, true)
	})
})

// ---------------------------------------------------------------------------
// New-commit evidence (Δ, file count) + classification proposals
// ---------------------------------------------------------------------------

/** Fixture conflict surface: files both sides touched since the merge base. */
const CONFLICT_SURFACE = new Set([
	"src/core/webview/ClineProvider.ts",
	"src/package.json",
	"src/services/api/providers/deepseek.ts",
	"pnpm-lock.yaml",
])

describe("computeCommitEvidence (fixture-based)", () => {
	it("computes Δ, file count and the Δ file list for a partially-overlapping commit", () => {
		const evidence = computeCommitEvidence({
			sha: "abc1234567890abcdef1234567890abcdef12345",
			subject: "fix: deepseek image handling (#1618)",
			files: [
				"src/services/api/providers/deepseek.ts", // in the conflict surface
				"src/services/api/providers/__tests__/deepseek.spec.ts", // not
				"src/package.json", // in the conflict surface
			],
			conflictSurface: CONFLICT_SURFACE,
		})
		assert.equal(evidence.fileCount, 3)
		assert.equal(evidence.delta, 2)
		assert.deepEqual(evidence.deltaFiles, ["src/services/api/providers/deepseek.ts", "src/package.json"])
		assert.equal(evidence.sha9, "abc123456")
	})

	it("returns Δ 0 and a full file count for a commit the fork never touched", () => {
		const evidence = computeCommitEvidence({
			sha: "abc1234567890abcdef1234567890abcdef12345",
			subject: "feat: new helper",
			files: ["src/utils/brand-new.ts", "src/utils/__tests__/brand-new.spec.ts"],
			conflictSurface: CONFLICT_SURFACE,
		})
		assert.equal(evidence.delta, 0)
		assert.equal(evidence.fileCount, 2)
		assert.deepEqual(evidence.deltaFiles, [])
	})

	it("de-duplicates the file list before counting", () => {
		const evidence = computeCommitEvidence({
			sha: "abc1234567890abcdef1234567890abcdef12345",
			subject: "fix: x",
			files: ["src/a.ts", "src/a.ts", ""],
			conflictSurface: CONFLICT_SURFACE,
		})
		assert.equal(evidence.fileCount, 1)
	})

	it("detects hot-file hits", () => {
		const evidence = computeCommitEvidence({
			sha: "abc1234567890abcdef1234567890abcdef12345",
			subject: "fix: provider",
			files: ["src/core/webview/ClineProvider.ts", "src/utils/other.ts"],
			conflictSurface: CONFLICT_SURFACE,
		})
		assert.deepEqual(evidence.hotFileHits, ["src/core/webview/ClineProvider.ts"])
		assert.ok(HOT_FILES.includes("src/core/webview/ClineProvider.ts"))
	})

	it("detects CORE_FILES hits from the code-index gate", () => {
		const evidence = computeCommitEvidence({
			sha: "abc1234567890abcdef1234567890abcdef12345",
			subject: "fix: qdrant",
			files: ["src/services/code-index/orchestrator.ts", "src/services/code-index/embedders/openai.ts"],
			conflictSurface: CONFLICT_SURFACE,
		})
		assert.equal(evidence.touchesCoreFile, true)
		assert.deepEqual(evidence.coreFileHits, [
			"src/services/code-index/orchestrator.ts",
			"src/services/code-index/embedders/openai.ts",
		])
	})

	it("detects telemetry, structural, version and automation signals", () => {
		const telemetry = computeCommitEvidence({
			sha: "abc1234567890abcdef1234567890abcdef12345",
			subject: "feat: track event",
			files: ["src/utils/thing.ts"],
			conflictSurface: new Set(),
			patchText: "+ TelemetryService.instance.captureEvent(TelemetryEventName.TASK_CREATED)",
		})
		assert.equal(telemetry.touchesTelemetry, true)

		const structural = computeCommitEvidence({
			sha: "abc1234567890abcdef1234567890abcdef12345",
			subject: "fix: handler",
			files: ["src/core/webview/webviewMessageHandler.ts"],
			conflictSurface: new Set(),
		})
		assert.equal(structural.touchesStructural, true)

		const version = computeCommitEvidence({
			sha: "abc1234567890abcdef1234567890abcdef12345",
			subject: "chore: prepare v3.82.1",
			files: ["src/package.json", "CHANGELOG.md"],
			conflictSurface: new Set(),
		})
		assert.deepEqual(version.touchesVersionOrChangelog, ["src/package.json", "CHANGELOG.md"])
		assert.equal(version.touchesRuntimeSource, false, "a release commit is not a runtime source change")

		const automation = computeCommitEvidence({
			sha: "abc1234567890abcdef1234567890abcdef12345",
			subject: "ci: rework merge queue",
			files: [".github/workflows/code-qa.yml", ".coderabbit.yaml"],
			conflictSurface: new Set(),
		})
		assert.equal(automation.touchesUpstreamAutomationOnly, true)
	})
})

describe("proposeClass (README §3)", () => {
	const evidenceFor = (files, extra = {}) =>
		computeCommitEvidence({
			sha: "abc1234567890abcdef1234567890abcdef12345",
			subject: extra.subject ?? "fix: x",
			files,
			conflictSurface: extra.conflictSurface ?? CONFLICT_SURFACE,
			patchText: extra.patchText ?? "",
		})

	it("proposes A-CLEAN for Δ 0", () => {
		assert.equal(proposeClass(evidenceFor(["src/untouched/new.ts"])).klass, "A-CLEAN")
	})

	it("proposes B-CAREFUL for 1 ≤ Δ ≤ 3", () => {
		const proposal = proposeClass(evidenceFor(["src/services/api/providers/deepseek.ts"]))
		assert.equal(proposal.klass, "B-CAREFUL")
		assert.ok(!proposal.needsInspection)
	})

	it("proposes B-CAREFUL but flags Δ 4–5 for inspection", () => {
		const surface = new Set(["a.ts", "b.ts", "c.ts", "d.ts"])
		const proposal = proposeClass(evidenceFor(["a.ts", "b.ts", "c.ts", "d.ts"], { conflictSurface: surface }))
		assert.equal(proposal.klass, "B-CAREFUL")
		assert.equal(proposal.needsInspection, true)
	})

	it("proposes C-REIMPLEMENT and flags Δ > 5 (runbook §2 stop condition)", () => {
		const surface = new Set(["a.ts", "b.ts", "c.ts", "d.ts", "e.ts", "f.ts", "g.ts"])
		const proposal = proposeClass(evidenceFor([...surface], { conflictSurface: surface }))
		assert.equal(proposal.klass, "C-REIMPLEMENT")
		assert.equal(proposal.needsInspection, true)
		assert.match(proposal.reason, /stop condition/)
	})

	it("proposes E-SKIP for upstream-automation-only commits", () => {
		assert.equal(proposeClass(evidenceFor([".github/workflows/x.yml", ".coderabbit.yaml"])).klass, "E-SKIP")
	})

	it("proposes D-LOCAL for lockfile/manifest-only commits", () => {
		assert.equal(proposeClass(evidenceFor(["pnpm-lock.yaml", "src/package.json"])).klass, "D-LOCAL")
		assert.equal(proposeClass(evidenceFor(["package.json"])).klass, "D-LOCAL")
	})

	it("proposes D-LOCAL for a release commit with no runtime source change", () => {
		assert.equal(proposeClass(evidenceFor(["src/package.json", "CHANGELOG.md"])).klass, "D-LOCAL")
	})

	it("does NOT let a release-side file mask a real code change", () => {
		const proposal = proposeClass(evidenceFor(["CHANGELOG.md", "src/core/webview/webviewMessageHandler.ts"]))
		assert.equal(proposal.klass, "C-REIMPLEMENT")
	})

	it("proposes C-REIMPLEMENT for telemetry hits", () => {
		const proposal = proposeClass(evidenceFor(["src/utils/thing.ts"], { patchText: "+ captureEvent(X)" }))
		assert.equal(proposal.klass, "C-REIMPLEMENT")
		assert.match(proposal.reason, /telemetry/)
	})

	it("proposes C-REIMPLEMENT for structural path hits", () => {
		assert.equal(proposeClass(evidenceFor(["src/core/webview/ClineProvider.ts"])).klass, "C-REIMPLEMENT")
		assert.equal(proposeClass(evidenceFor(["src/core/webview/handlers/chat.ts"])).klass, "C-REIMPLEMENT")
	})
})

describe("proposePriority (README §3)", () => {
	const priorityFor = (subject, { klass = "B-CAREFUL", files = ["src/x.ts"] } = {}) => {
		const evidence = computeCommitEvidence({
			sha: "abc1234567890abcdef1234567890abcdef12345",
			subject,
			files,
			conflictSurface: CONFLICT_SURFACE,
		})
		return proposePriority(evidence, klass)
	}

	it("maps intent prefixes", () => {
		assert.equal(priorityFor("fix: a bug").priority, "P1")
		assert.equal(priorityFor("perf: faster").priority, "P1")
		assert.equal(priorityFor("feat: new thing").priority, "P2")
		assert.equal(priorityFor("chore: tidy").priority, "P3")
		assert.equal(priorityFor("test: add coverage").priority, "P3")
		assert.equal(priorityFor("ci: pipeline").priority, "P3")
	})

	it("handles bracketed upstream subjects", () => {
		assert.equal(priorityFor("[Fix] DeepSeek Flash cannot read attached images (#1618)").priority, "P1")
		assert.equal(priorityFor("[Chore] Refine CodeRabbit review checks (#1571)").priority, "P3")
	})

	it("applies the P0 value override even on a hygiene prefix", () => {
		assert.equal(priorityFor("chore: prevent data loss on write").priority, "P0")
		assert.equal(priorityFor("fix: patch a security vulnerability").priority, "P0")
		assert.equal(priorityFor("fix: avoid crash on stall").priority, "P0")
	})

	it("forces P4 for E-SKIP", () => {
		assert.equal(priorityFor("fix: rework merge queue", { klass: "E-SKIP" }).priority, "P4")
	})

	it("defaults to P3 with a surfaced reason for an unknown prefix", () => {
		const proposal = priorityFor("wibble: something")
		assert.equal(proposal.priority, "P3")
		assert.match(proposal.reason, /unrecognised/)
	})

	it("extracts intent prefixes", () => {
		assert.equal(intentPrefix("fix(api): x"), "fix")
		assert.equal(intentPrefix("[Fix] x"), "fix")
		assert.equal(intentPrefix("feat!: x"), "feat")
		assert.equal(intentPrefix("Merge pull request #1"), "")
	})
})

describe("quick-win flag", () => {
	it("requires A-CLEAN + P0–P2 + a small diff", () => {
		assert.equal(isQuickWin("A-CLEAN", "P1", 3), true)
		assert.equal(isQuickWin("A-CLEAN", "P0", 0), true)
		assert.equal(isQuickWin("A-CLEAN", "P3", 1), false)
		assert.equal(isQuickWin("B-CAREFUL", "P1", 1), false)
		assert.equal(isQuickWin("A-CLEAN", "P1", 4), false)
	})
})

// ---------------------------------------------------------------------------
// Refresh planning / writing
// ---------------------------------------------------------------------------

describe("refresh plan", () => {
	const plan = buildRefreshPlan({
		proposals: [
			{
				sha9: "abc123456",
				date: "2026-09-17",
				subject: "fix: prevent data loss on save (#2000)",
				klass: "A-CLEAN",
				priority: "P0",
				delta: 0,
				fileCount: 1,
				reason: "Δ 0; value override",
				needsInspection: false,
				quickWin: true,
			},
		],
		baseline: {
			upstreamTip: TIP.slice(0, 9),
			mergeBase: MERGE_BASE.slice(0, 9),
			forkTip: "77a670196",
			pendingCount: 3,
		},
		upstreamTip: TIP,
		upstreamTipDate: "2026-09-16",
		pendingCount: 4,
		date: "2026-09-17",
		nextSectionNumber: 13,
	})
	plan.upstreamTipSubject = "[Fix] something"

	it("continues batch numbering forward", () => {
		assert.equal(nextSectionNumber(healthyRegister()), 2)
	})

	it("formats a row in the register's exact column order, with the appended schema", () => {
		assert.equal(
			formatRegisterRow({
				sha9: "abc123456",
				date: "2026-09-17",
				subject: "fix: x",
				klass: "A-CLEAN",
				priority: "P1",
				delta: 2,
			}),
			"| `abc123456` | 2026-09-17 | fix: x | `A-CLEAN` | P1 | 2 | ☐ | — | — | — | — |",
			"a proposed row must carry the Exception cell too, or it is born one cell short of its header",
		)
	})

	it("renders a ready-to-paste diff that quotes the real old header lines", () => {
		const diff = renderRegisterDiff(plan, healthyRegister())
		assert.match(diff, /^\+\| Upstream tip \| `500152b78` \(2026-09-16,/m)
		assert.match(diff, /^\+\| Pending upstream commits \| \*\*4\*\* \|$/m)
		assert.match(diff, /^-\| Pending upstream commits \| \*\*3\*\* \|/m)
		assert.match(diff, /## SYNC-13 — Refresh 2026-09-17/)
		assert.match(diff, /README\.md §9 'Register changelog'/)
	})

	// The refresh writer must emit the CURRENT schema, otherwise every proposed
	// row would be born without `Blocked-by`/`Resolved:`/`Version` and the new
	// name-based parser would read them as "not recorded".
	it("writes the proposal section with the full column header", () => {
		const diff = renderRegisterDiff(plan, healthyRegister())
		assert.match(
			diff,
			/^\+\| SHA \| Date \| Subject \| Class \| Pri \| Δ \| Status \| Blocked-by \| Resolved: \| Version \| Exception \|$/m,
		)
		const parsed = parseRegister(applyRefreshWrite(healthyRegister(), plan))
		const proposal = parsed.rows.find((row) => row.sha === "abc123456")
		assert.equal(proposal.status, "☐")
		assert.equal(proposal.resolved, "")
		assert.equal(proposal.version, "")
		assert.deepEqual(proposal.blockedByTokens, [])
	})

	it("appends the new section before the recommended execution order", () => {
		const updated = applyRefreshWrite(healthyRegister(), plan)
		assert.ok(updated.includes("## SYNC-13 — Refresh 2026-09-17"))
		assert.ok(
			updated.indexOf("## SYNC-13") < updated.indexOf("## Recommended execution order"),
			"new section must precede the execution order",
		)
	})

	it("rewrites the header tip and pending count", () => {
		const updated = applyRefreshWrite(healthyRegister(), plan)
		assert.match(updated, /\| Upstream tip\s*\| `500152b78` \(2026-09-16, "\[Fix\] something"\)\s*\|/)
		assert.match(updated, /\| Pending upstream commits\s*\| \*\*4\*\*\s*\|/)
	})

	it("NEVER reclassifies, rewrites or deletes an existing row", () => {
		const original = healthyRegister()
		const rowLines = parseRegister(original).rows.map((row) => row.raw)
		const updated = applyRefreshWrite(original, plan)
		for (const rowLine of rowLines) {
			assert.ok(updated.includes(rowLine), `existing row must survive verbatim: ${rowLine}`)
		}
		// Existing rows keep their class/priority/status: only new rows are appended.
		const after = parseRegister(updated)
		assert.equal(after.rows.length, 4)
		assert.deepEqual(after.rows[0], parseRegister(original).rows[0])
	})

	it("does not append a section when there are no new commits", () => {
		const updated = applyRefreshWrite(healthyRegister(), { ...plan, rows: [] })
		assert.ok(!updated.includes("## SYNC-13"), "no proposal section should be created")
		assert.equal(parseRegister(updated).rows.length, 3)
	})
})

// ---------------------------------------------------------------------------
// runRefresh — the H-01 refresh post-conditions (F-A-1 / F-A-2 / HD-04)
// ---------------------------------------------------------------------------
//
// These are the DISCRIMINATING tests the plan's original acceptance test was not.
// "In this shallow checkout `--refresh --write` exits non-zero and writes nothing"
// passed on unmodified code, because `requireMergeBase` already aborted before the
// only write (F-A-1). Each case below drives `runRefresh` through its injected IO
// port, so the guard — not the clone — is what is under test.

/** A full 40-char tip for a stubbed advance (its 9-char prefix is the new header tip). */
const REFRESH_TIP = "9ec139cd87f35f40b62ff154fc9926f7299c8601"
/** Two NEW upstream commits, 40-char form; the register only ever stores prefixes. */
const NEW_SHA_1 = "10b45abf7000000000000000000000000000000"
const NEW_SHA_2 = "77e422faf000000000000000000000000000000"

/** Builds a `--refresh` options object. */
function refreshOpts(overrides = {}) {
	return {
		mode: "refresh",
		json: true,
		strict: false,
		write: false,
		repoOnly: false,
		help: false,
		forkRef: null,
		unknown: [],
		...overrides,
	}
}

/**
 * A fake `refreshIo`. Defaults describe a healthy, just-deepened window: a real
 * merge base, the recorded tip still an ancestor, no new commits and no write.
 * `state.writes` counts `writeRegister` calls so a refusal can be proven to have
 * left the register untouched.
 */
function makeRefreshIo(overrides = {}) {
	const { markdown = healthyRegister(), ...rest } = overrides
	const state = { markdown, writes: 0 }
	const io = {
		readRegister: async () => state.markdown,
		writeRegister: async (next) => {
			state.writes += 1
			state.markdown = next
		},
		resolveUpstreamRef: () => "refs/remotes/upstream/main",
		fetchUpstream: () => {},
		resolveForkRef: () => ({ ref: "master", reason: "local master (stub)" }),
		requireMergeBase: () => ({ ok: true, shallow: true, mergeBase: MERGE_BASE }),
		resolveCommit: () => TIP,
		isAncestor: () => true,
		revRange: () => [],
		revListCount: (spec) => (spec === UPSTREAM_REF ? 500 : 3),
		upstreamTipSha: () => REFRESH_TIP,
		isShallow: () => true,
		commitMeta: (sha) => ({
			date: "2026-09-24",
			subject: `fix: provider tweak ${sha.slice(0, ROW_SHA_LENGTH)}`,
			author: "tester",
		}),
		commitChangedFiles: () => ["src/api/providers/foo.ts"],
		commitPatchText: () => "",
		// WS-4/H-22: a good GitHub web-flow signature by default, so the refresh
		// tests that are not about provenance are unaffected; the write-refusal test
		// overrides this with an invalid one.
		commitSignature: () => ({ validity: "G", signer: GITHUB_WEBFLOW_SIGNER }),
		conflictSurface: () => new Set(),
	}
	return { io: { ...io, ...rest }, state }
}

describe("runRefresh — H-01: a recorded tip outside the window refuses and writes nothing", () => {
	it("refuses with the baseline-ancestry failure and leaves the register byte-identical", async () => {
		const before = healthyRegister()
		const { io, state } = makeRefreshIo({
			markdown: before,
			isAncestor: () => false,
			revRange: () => [NEW_SHA_1, NEW_SHA_2],
			revListCount: (spec) => (spec === UPSTREAM_REF ? 500 : 3),
		})

		const { code, payload } = await runRefresh(refreshOpts({ write: true }), io)

		assert.equal(code, 1, "a recorded tip outside the fetched window must refuse")
		assert.equal(payload.ok, false)
		assert.equal(payload.refused, true)
		assert.equal(payload.wrote, false)
		assert.deepEqual(payload.guard.failures.map((failure) => failure.id), ["baseline-ancestry"])
		assert.match(payload.remediation, /git fetch --unshallow upstream main/)
		assert.match(payload.remediation, /--shallow-since=<date>/)
		assert.equal(state.writes, 0, "--write must refuse: the register is never opened for writing")
		assert.equal(state.markdown, before, "the register must be byte-identical after a refusal")
	})
})

describe("runRefresh — H-01: a saturated window refuses", () => {
	it("refuses when the new-commit count is not strictly less than the shallow window", async () => {
		const before = healthyRegister()
		const { io, state } = makeRefreshIo({
			markdown: before,
			isAncestor: () => true,
			revRange: () => [NEW_SHA_1, NEW_SHA_2],
			// The whole window is inside the diff range: the count is a graft artefact.
			revListCount: () => 2,
		})

		const { code, payload } = await runRefresh(refreshOpts({ write: true }), io)

		assert.equal(code, 1)
		assert.deepEqual(payload.guard.failures.map((failure) => failure.id), ["window-saturated"])
		assert.match(payload.guard.failures[0].message, /not strictly less than the local shallow window/)
		assert.equal(state.writes, 0)
		assert.equal(state.markdown, before)
	})
})

describe("runRefresh — a genuine advance proposes NEW rows only", () => {
	it("appends the new commits and leaves every existing row untouched", async () => {
		const before = healthyRegister()
		const { io, state } = makeRefreshIo({
			markdown: before,
			isAncestor: () => true,
			revRange: () => [NEW_SHA_1, NEW_SHA_2],
			revListCount: (spec) => (spec === UPSTREAM_REF ? 500 : 4),
		})

		const { code, payload } = await runRefresh(refreshOpts({ write: true }), io)

		assert.equal(code, 0)
		assert.equal(payload.ok, true)
		assert.equal(payload.wrote, true)
		assert.equal(payload.newCommitCount, 2)
		assert.deepEqual(payload.proposals.map((row) => row.sha9), [
			NEW_SHA_1.slice(0, ROW_SHA_LENGTH),
			NEW_SHA_2.slice(0, ROW_SHA_LENGTH),
		])
		assert.equal(payload.deepenCommand, "git fetch --shallow-since=2026-08-19 upstream main")
		assert.equal(payload.windowNote, "local shallow window 500 commit(s); new-commit count 2 < window")
		assert.equal(state.writes, 1)

		const originalRows = parseRegister(before).rows
		const after = parseRegister(state.markdown)
		for (const row of originalRows) {
			assert.ok(state.markdown.includes(row.raw), `existing row must survive verbatim: ${row.raw}`)
			assert.deepEqual(after.rows.find((candidate) => candidate.sha === row.sha), row)
		}
		assert.equal(after.rows.length, originalRows.length + 2, "exactly the NEW commits are appended")
		for (const sha of [NEW_SHA_1, NEW_SHA_2].map((full) => full.slice(0, ROW_SHA_LENGTH))) {
			const row = after.rows.find((candidate) => candidate.sha === sha)
			assert.ok(row, `expected a new row for \`${sha}\``)
			assert.equal(row.status, "☐")
			assert.equal(row.blockedBy, "", "an unknown prerequisite is written as the empty cell, never `unknown`")
			assert.equal(row.resolved, "")
			assert.equal(row.version, "")
			assert.equal(row.exception, "")
		}
	})
})

describe("runRefresh — the baseline-ancestry clause is load-bearing", () => {
	// DISCRIMINATING (F-A-1). The pre-H-01 code had NO ancestry clause at all:
	// `runRefresh` only checked that the recorded tip RESOLVED. The first assertion
	// below fails if that clause is removed; the second proves the clause (not some
	// other failure) is what refuses, by flipping only that fact.
	it("fails if the `--is-ancestor` post-condition is dropped, and accepts the same facts once it holds", () => {
		const facts = {
			mergeBase: MERGE_BASE,
			shallow: true,
			baselineTip: TIP.slice(0, ROW_SHA_LENGTH),
			baselineTipIsAncestor: false,
			newCommitCount: 2,
			windowSize: 500,
		}

		const refused = evaluateRefreshGuard(facts)
		assert.equal(refused.ok, false)
		assert.deepEqual(refused.failures.map((failure) => failure.id), ["baseline-ancestry"])
		assert.match(refused.failures[0].message, /NOT an ancestor/)
		assert.equal(evaluateRefreshGuard({ ...facts, baselineTipIsAncestor: true }).ok, true)
	})
})

describe("planUpstreamDeepen — deterministic deepen, not a fixed window", () => {
	it("derives --shallow-since from the earlier baseline date, with one day of margin", () => {
		assert.equal(
			planUpstreamDeepen({ mergeBaseDate: "2026-08-20", upstreamTipDate: "2026-09-16" }).command,
			"git fetch --shallow-since=2026-08-19 upstream main",
			"the merge base is an ancestor of the tip, so the tip's date would slice it off",
		)
		assert.equal(planUpstreamDeepen({ mergeBaseDate: "2026-08-20" }).since, "2026-08-19")
	})

	it("falls back to a bounded --deepen only when no usable date exists", () => {
		const plan = planUpstreamDeepen({})
		assert.equal(plan.strategy, "deepen")
		assert.equal(plan.command, `git fetch --deepen=${DEEPEN_FALLBACK} upstream main`)
		assert.deepEqual(plan.args, ["fetch", `--deepen=${DEEPEN_FALLBACK}`, "upstream", "main"])
	})

	it("reports the chosen command on a refresh (the operator can see what was fetched)", async () => {
		const { io } = makeRefreshIo({ revRange: () => [] })
		const { code, payload } = await runRefresh(refreshOpts(), io)
		assert.equal(code, 0)
		assert.equal(payload.newCommitCount, 0)
		assert.equal(payload.deepenCommand, "git fetch --shallow-since=2026-08-19 upstream main")
	})
})

// ---------------------------------------------------------------------------
// Upstream-unavailable semantics + CLI
// ---------------------------------------------------------------------------

describe("decideRunMode — skip on unreachable upstream", () => {
	it("runs when the local upstream ref exists (offline-safe)", () => {
		assert.deepEqual(decideRunMode({ localRef: true, fetchSucceeded: false, strict: false }), {
			run: true,
			fail: false,
		})
	})

	it("runs when the fetch succeeded", () => {
		assert.deepEqual(decideRunMode({ localRef: false, fetchSucceeded: true, strict: false }), {
			run: true,
			fail: false,
		})
	})

	it("SKIPS (exit 0) when upstream is unreachable and --strict is absent", () => {
		assert.deepEqual(decideRunMode({ localRef: false, fetchSucceeded: false, strict: false }), {
			run: false,
			fail: false,
		})
	})

	it("FAILS (exit 1) when upstream is unreachable and --strict is set", () => {
		assert.deepEqual(decideRunMode({ localRef: false, fetchSucceeded: false, strict: true }), {
			run: false,
			fail: true,
		})
	})
})

describe("--json output purity", () => {
	/** Captures whatever a function writes to process.stdout. */
	function captureStdout(fn) {
		const original = process.stdout.write
		let captured = ""
		process.stdout.write = (chunk) => {
			captured += chunk
			return true
		}
		try {
			fn()
		} finally {
			process.stdout.write = original
		}
		return captured
	}

	it("emitJson writes nothing unless --json is set", () => {
		assert.equal(
			captureStdout(() => emitJson({ json: false }, { a: 1 })),
			"",
		)
	})

	it("emitJson writes exactly one parseable JSON document", () => {
		const captured = captureStdout(() => emitJson({ json: true }, { mode: "verify", ok: true }))
		assert.deepEqual(JSON.parse(captured), { mode: "verify", ok: true })
	})

	/**
	 * Runs the real CLI and returns its stdout plus exit status. `spawnSync` — not
	 * `execFileSync` — because the CLI exits 1 whenever it cannot fully verify
	 * (e.g. a depth-1 CI checkout with no `upstream` remote); a non-zero status
	 * must not throw and mask the stdout-purity contract under test.
	 */
	function runVerifyJson(...extra) {
		const result = spawnSync(
			process.execPath,
			["scripts/upstream-sync-triage.mjs", "--verify", "--json", ...extra],
			{
				cwd: ROOT,
				encoding: "utf8",
				timeout: 120_000,
			},
		)
		assert.equal(result.error, undefined, `failed to spawn the triage CLI: ${result.error}`)
		return result
	}

	// Regression: a logger call that fires before the payload (e.g. the
	// shallow-checkout warning) used to be written to stdout and made
	// `--verify --json` unparseable for consumers. stdout must be EXACTLY one
	// JSON document on BOTH the success path and the loud-failure path — CI
	// checks out at depth 1 with no `upstream` remote and hits the failure path.
	it("--verify --json prints pure JSON on stdout with no log leakage", () => {
		const { stdout } = runVerifyJson()
		const parsed = JSON.parse(stdout)
		assert.equal(parsed.mode, "verify")
		assert.equal(typeof parsed.ok, "boolean")
	})

	// F-B-2: the old live-register test early-returned whenever the merge base was
	// unusable, which is the shape CI (and this checkout) actually has — so every
	// spec test could pass while the live register was never asserted. The
	// repo-only profile needs no merge base, so this test runs UNCONDITIONALLY and
	// is the register assertion the suite was missing (HD-03 / HD-06).
	it("--verify --repo-only asserts the REAL register unconditionally and exits 0", () => {
		const result = runVerifyJson("--repo-only")
		assert.equal(result.status, 0, `repo-only must be green in a --depth=1 checkout: ${result.stderr}`)
		const parsed = JSON.parse(result.stdout)
		assert.equal(parsed.mode, "verify")
		assert.equal(parsed.profile, "repo-only")
		assert.equal(parsed.ok, true)
		assert.equal(parsed.skipped, false)
		assert.deepEqual(
			parsed.checks.map((check) => check.id),
			CHECK_IDS_REPO_ONLY,
		)
		assert.ok(
			parsed.checks.every((check) => check.ok),
			`every repo-only check must be green: ${JSON.stringify(parsed.checks.filter((check) => !check.ok))}`,
		)

		// `synced` describes the REGISTER, not the tool: derive it from the
		// register on disk and cross-check the spawned CLI's report against it, so
		// a legitimate future flip cannot fail this test the way a pinned snapshot
		// would — while a genuinely missing row still can.
		const { rows } = parseRegister(fs.readFileSync(path.join(ROOT, REGISTER_PATH), "utf8"))
		const expectedSynced = rows.filter((row) => row.synced).length
		// DERIVED, never pinned: the register grows with every refresh, so a literal
		// row count is a stale literal waiting to go off — the "102" that used to sit
		// here was falsified by the 2026-09-24 advance (L3). The assertion is that
		// the CLI sees every row the FILE contains, not that the file has a size.
		assert.ok(rows.length > 0, "the real register must parse at least one row")
		assert.ok(rows.length >= expectedSynced, "resolved rows are a subset of all rows")
		assert.equal(
			new Set(rows.map((row) => row.sha)).size,
			rows.length,
			"the real register must have 0 duplicate rows",
		)
		assert.ok(expectedSynced > 0, "the real register should carry ☑ rows once a batch has landed")
		assert.equal(parsed.counts.rows, rows.length, "the CLI must report every row the file contains")
		assert.equal(parsed.counts.duplicates, 0)
		assert.equal(parsed.counts.synced, expectedSynced)

		// The status contract, asserted against the live data: every ☑ row carries
		// both the resolution date and the released version (F-A-3 / HD-06).
		for (const row of rows.filter((candidate) => candidate.synced)) {
			assert.ok(row.resolved, `☑ row \`${row.sha}\` must record Resolved:`)
			assert.ok(row.version, `☑ row \`${row.sha}\` must record Version`)
		}
	})

	// WS-1b: the live register asserted against the ADJUDICATED invariants. The
	// deep profile aborts before its checks in this clone shape (no merge base), so
	// the register-only checks are driven directly here. Resolution and fork-ref
	// reachability are already asserted by the repo-only CLI test above (they need
	// the real clone), so the probe stubs them TRUE and the merge-base-derived
	// cells (coverage, header-pending-count) are deliberately out of scope.
	it("the live register satisfies every adjudicated invariant (hard ladder, blocked-by, advisories, ready set)", () => {
		const markdown = fs.readFileSync(path.join(ROOT, REGISTER_PATH), "utf8")
		const { rows } = parseRegister(markdown)
		const report = validateRegister({
			markdown,
			pendingShas: null,
			probe: {
				commitType: () => "commit",
				isReachableFromForkRef: () => true,
				upstreamTip: () => null,
				mergeBase: () => null,
			},
		})

		// Every error-severity check is green on live data: WS-1's literal invariants
		// were red here (16 class-ladder + 4 blocked-by failures) before the ruling.
		assert.equal(
			report.ok,
			true,
			`live register must satisfy every hard invariant: ${JSON.stringify(
				report.checks.filter((check) => !check.ok).map((check) => check.failures),
			)}`,
		)
		assert.equal(checkById(report, "class-ladder").ok, true, "no A-CLEAN row claims Δ > 0 without an exception")
		assert.equal(checkById(report, "blocked-by").ok, true, "every Blocked-by token names a different register row")
		assert.equal(verifyExitCode({ ok: report.ok, staleCount: 0, strict: false }), 0)

		// The five F-C-2 rows stay classified as they are and are reported as
		// ADVISORIES — the whole point of the hard/advisory split.
		const expectedAdvisories = rows
			.filter((row) => row.klass === "B-CAREFUL" && Number(row.delta) > 5)
			.map((row) => row.sha)
			.sort()
		assert.ok(expectedAdvisories.length > 0, "the advisory must actually fire on the live register")
		assert.deepEqual(report.advisories.map((row) => row.sha).sort(), expectedAdvisories)
		assert.equal(checkById(report, "class-ladder-advisory").severity, "warning")
		assert.equal(verifyExitCode({ ok: report.ok, staleCount: 0, strict: true }), 0)

		// The two data defects the ruling names: no literal `unknown`, and every
		// token resolving to a DIFFERENT row.
		for (const row of rows) {
			for (const token of row.blockedByTokens) {
				const resolved = token.slice(0, ROW_SHA_LENGTH)
				assert.notEqual(token.toLowerCase(), UNKNOWN_BLOCKED_BY_TOKEN, `row \`${row.sha}\` still records \`unknown\``)
				assert.ok(
					rows.some((candidate) => candidate.sha === resolved),
					`row \`${row.sha}\` names \`${token}\`, which is not a register row`,
				)
				assert.notEqual(resolved, row.sha, `row \`${row.sha}\` names itself as its prerequisite`)
			}
		}
		// Readiness is reported, never failed: the rows whose named blocker is open.
		assert.deepEqual(
			report.blockedByPending.map((row) => row.sha).sort(),
			["7bb14e44e", "cc9c0afe9"],
			"only rows whose named prerequisite has not landed are pending",
		)

		// Exactly one dated exception, reported BY SHA.
		assert.deepEqual(
			report.exceptions.map((entry) => entry.sha),
			["a5f4192bf"],
			"the register records exactly one dated exception",
		)
		assert.equal(report.exceptions[0].date, "2026-09-16")
		assert.match(report.exceptions[0].reason, /pre-ladder classifier/)

		// The ready set is derived and informational, never a class.
		assert.ok(report.readySet.length > 0, "the live register has at least one pickable-today row")
		for (const entry of report.readySet) {
			const row = rows.find((candidate) => candidate.sha === entry.sha)
			assert.equal(row.klass, "A-CLEAN", `ready row \`${entry.sha}\` must be A-CLEAN`)
			assert.equal(Number(row.delta), 0, `ready row \`${entry.sha}\` must have Δ 0`)
			assert.deepEqual(row.blockedByTokens, [], `ready row \`${entry.sha}\` must not be blocked`)
			assert.ok(!row.synced && !row.discarded && !row.inProgress, `ready row \`${entry.sha}\` must be open`)
		}
		assert.ok(
			report.readySet.some((row) => row.sha === "a80b3b3ab"),
			"the opencode-go root has no prerequisite row, so it is ready",
		)
		assert.ok(!report.readySet.some((row) => row.sha === "7bb14e44e"), "a blocked row is not ready")
		assert.ok(!report.readySet.some((row) => row.sha === "a5f4192bf"), "the excepted merged row is not ready")
	})

	// Full-profile verification is only observable where the history needed to
	// resolve the rows is present. Where it is absent the CLI must fail loudly
	// with an actionable message instead of silently reporting the size of the
	// local fetch window as the backlog — never a crash, never log leakage.
	// Discriminate on the presence of `checks`, not the `shallow` flag: that flag
	// reflects the presence of `.git/shallow`, which is set even in a deepened
	// checkout.
	it("--verify reports every check when the history is present, and fails closed when it is not", () => {
		const result = runVerifyJson()
		const parsed = JSON.parse(result.stdout)
		if (Array.isArray(parsed.checks)) {
			assert.equal(parsed.profile, "full")
			assert.equal(parsed.skipped, false)
			assert.deepEqual(
				parsed.checks.map((check) => check.id),
				CHECK_IDS_FULL,
			)
			const registerRows = parseRegister(fs.readFileSync(path.join(ROOT, REGISTER_PATH), "utf8")).rows
			assert.equal(
				parsed.counts.rows,
				registerRows.length,
				"the tool must report every row the register file contains",
			)
			assert.equal(parsed.counts.duplicates, 0)
			// The pending range belongs to GIT, not to the register: it grows the
			// moment upstream advances, so a register that has not been refreshed
			// yet legitimately reports `missing` rows. Pinning `pendingCommits` or
			// `missing` to a snapshot turns a healthy-but-stale register into a
			// false red — exactly what deepening this clone produced before the
			// baseline advance. What must hold for the TOOL is the bookkeeping: no
			// row outside the range, and `rows` + `missing` partitioning the
			// pending set.
			assert.equal(parsed.counts.unexpected, 0, "no row may point outside merge-base..upstream/main")
			assert.equal(
				parsed.counts.rows + parsed.counts.missing,
				parsed.counts.pendingCommits,
				"rows + missing must partition merge-base..upstream/main",
			)
			assert.equal(checkById(parsed, "row-sha-format").ok, true)
			return
		}
		assert.equal(parsed.ok, false)
		assert.equal(result.status, 1, "an unusable merge base must fail closed")
		assert.match(String(parsed.error), /deepen/i)
	})

	it("--verify --repo-only --json reports the row-sha-format check green", () => {
		const parsed = JSON.parse(runVerifyJson("--repo-only").stdout)
		const format = parsed.checks.find((check) => check.id === "row-sha-format")
		assert.equal(format.ok, true)
		assert.deepEqual(format.failures, [])
	})

	it("--repo-only outside --verify fails loudly instead of being ignored", () => {
		const result = spawnSync(
			process.execPath,
			["scripts/upstream-sync-triage.mjs", "--refresh", "--repo-only", "--json"],
			{
				cwd: ROOT,
				encoding: "utf8",
				timeout: 120_000,
			},
		)
		assert.equal(result.status, 1)
		assert.match(JSON.parse(result.stdout).error, /--repo-only is only valid with --verify/)
	})
})

// ---------------------------------------------------------------------------
// CP-1 remediation regression tests (one per finding)
// ---------------------------------------------------------------------------

/**
 * Drives the real CLI for the repo-only profile. `spawnSync` (not execFileSync)
 * because a non-zero status must not throw and mask the payload under test.
 */
function runRepoOnlyJson(extraEnv = {}) {
	const result = spawnSync(
		process.execPath,
		["scripts/upstream-sync-triage.mjs", "--verify", "--repo-only", "--json"],
		{ cwd: ROOT, encoding: "utf8", timeout: 120_000, env: { ...process.env, ...extraEnv } },
	)
	assert.equal(result.error, undefined, `failed to spawn the triage CLI: ${result.error}`)
	return result
}

// CP1-4: profile membership asserted against an INDEPENDENT expected list. The
// old assertions compared CHECK_IDS_* to itself, so dropping an id was
// undetectable; these fail BY NAME on any drop or addition.
describe("CP1-4 — check-id profile membership is pinned independently", () => {
	const EXPECTED_FULL = [
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
	const EXPECTED_REPO_ONLY = [
		"row-sha-format",
		"row-sha-resolves",
		"row-parse",
		"duplicates",
		"synced-fork-sha",
		"stale-in-progress",
		"exception-advisory",
		"header-tip",
	]

	it("CHECK_IDS_FULL equals the independent expectation", () => {
		assert.deepEqual([...CHECK_IDS_FULL].sort(), [...EXPECTED_FULL].sort())
	})

	it("CHECK_IDS_REPO_ONLY equals the independent expectation", () => {
		assert.deepEqual([...CHECK_IDS_REPO_ONLY].sort(), [...EXPECTED_REPO_ONLY].sort())
	})

	it("repo-only is a subset of full and omits every history-dependent id", () => {
		for (const id of CHECK_IDS_REPO_ONLY) {
			assert.ok(CHECK_IDS_FULL.includes(id), `repo-only id "${id}" must also exist in the full profile`)
		}
		for (const id of ["coverage", "header-pending-count", "landed-unflipped"]) {
			assert.ok(!CHECK_IDS_REPO_ONLY.includes(id), `"${id}" is history-dependent and must be full-profile only`)
		}
	})
})

// CP1-1: coverage freshness asserted with a FIXTURE, never a re-pinned live
// number. The register omits a commit that IS in the pending range, so `missing`
// must be non-empty and name the SHA. The test fails if `missing` computes empty —
// the discriminating case the live-register assertion could never produce.
describe("CP1-1 — a fixture register that omits a pending commit fails freshness and names the SHA", () => {
	it("reports the omitted commit missing and names it under coverage", () => {
		const markdown = buildRegister({
			rows: [makeRow(PREFIX_A, "fix: a"), makeRow(PREFIX_C, "fix: c")],
			pendingCount: 2,
		})
		const report = validateRegister({
			markdown,
			pendingShas: HEALTHY_PENDING,
			probe: makeProbe({ commits: [PREFIX_A, PREFIX_C] }),
		})
		assert.equal(report.ok, false)
		assert.ok(
			report.missing.length > 0,
			"a register that omits a pending commit cannot compute an EMPTY missing list",
		)
		assert.deepEqual(report.missing, [PREFIX_B])
		const coverage = checkById(report, "coverage")
		assert.equal(coverage.ok, false)
		assert.match(coverage.failures.join("\n"), new RegExp(PREFIX_B))
		assert.match(coverage.failures.join("\n"), /has no row/)
	})
})

// CP1-2: the "update the table to ☑ when the commit lands" control. A `☐`/`◐`
// row whose change is already in the fork by patch identity (`git cherry` marks
// the upstream commit `-`) must fail BY ROW SHA, with the matching fork commit as
// the evidence. Full-profile only (needs history / a merge base).
describe("CP1-2 — landed-unflipped fails a landed-but-open row by SHA", () => {
	const FORK_SHA = "abcdef1234567890abcdef1234567890abcdef12"
	const probeWithLanded = (landed) => ({
		...makeProbe({ commits: [PREFIX_A, PREFIX_B, PREFIX_C] }),
		landedByPatchId: () => landed,
	})

	it("fails a ☐ row whose patch is already in the fork, naming the matching fork commit", () => {
		const report = validateRegister({
			markdown: healthyRegister(),
			pendingShas: HEALTHY_PENDING,
			probe: probeWithLanded([{ upstreamSha: SHA_A, forkSha: FORK_SHA }]),
		})
		assert.equal(report.ok, false)
		const check = checkById(report, "landed-unflipped")
		assert.equal(check.ok, false)
		assert.match(check.failures.join("\n"), new RegExp(PREFIX_A))
		assert.match(check.failures.join("\n"), new RegExp(PENDING_MARKER))
		assert.match(check.failures.join("\n"), /git cherry/)
		assert.match(check.failures.join("\n"), /abcdef123/, "the fork commit whose patch-id matched must be named")
		assert.deepEqual(
			report.landedUnflipped.map((row) => row.sha),
			[PREFIX_A],
		)
	})

	it("fails a ☐ row that already records Resolved:/Version even with no patch-id match", () => {
		const markdown = buildRegister({
			rows: [
				makeRow(PREFIX_A, "fix: landed", { resolved: "2026-09-16", version: "3.88.4" }),
				makeRow(PREFIX_B, "fix: b"),
				makeRow(PREFIX_C, "fix: c"),
			],
			pendingCount: 3,
		})
		const report = validateRegister({
			markdown,
			pendingShas: HEALTHY_PENDING,
			probe: probeWithLanded([]),
		})
		assert.equal(report.ok, false)
		assert.match(
			checkById(report, "landed-unflipped").failures.join("\n"),
			/already records Resolved: 2026-09-16 and Version 3.88.4/,
		)
	})

	it("does NOT fire for a ☑ row (already flipped)", () => {
		const markdown = buildRegister({
			rows: [
				makeRow(PREFIX_A, "fix: a", { status: "☑ `abc1234`", resolved: "2026-09-16", version: "3.88.4" }),
				makeRow(PREFIX_B, "fix: b"),
				makeRow(PREFIX_C, "fix: c"),
			],
			pendingCount: 3,
		})
		const report = validateRegister({
			markdown,
			pendingShas: HEALTHY_PENDING,
			probe: { ...probeWithLanded([{ upstreamSha: SHA_A, forkSha: FORK_SHA }]), isReachableFromForkRef: () => true },
		})
		assert.equal(checkById(report, "landed-unflipped").ok, true)
	})

	it("is not evaluated and not reported in the repo-only profile", () => {
		let called = false
		const report = validateRegister({
			markdown: healthyRegister(),
			pendingShas: null,
			profile: "repo-only",
			probe: {
				...makeProbe({ commits: [PREFIX_A, PREFIX_B, PREFIX_C] }),
				landedByPatchId: () => {
					called = true
					return []
				},
			},
		})
		assert.equal(called, false, "landed-unflipped needs history, so repo-only must not call it")
		assert.ok(!report.checks.some((check) => check.id === "landed-unflipped"))
	})
})

// CP1-8: a data-looking row whose SHA cell lost its backticks parses as nothing,
// so coverage cannot see it and the repo-only profile used to go BLIND and exit 0.
describe("CP1-8 — an unparsed data row is named, in BOTH profiles", () => {
	const brokenRegister = () =>
		buildRegister({
			rows: [
				makeRow(PREFIX_A, "fix: parses fine"),
				`| ${PREFIX_B} | 2026-09-05 | fix: lost its backticks | \`A-CLEAN\` | P1 | 0 | ☐ | — | — | — | — |`,
			],
			pendingCount: 2,
		})

	it("findUnparsedRowLines names the exact line and text, and is empty when healthy", () => {
		const unparsed = findUnparsedRowLines(brokenRegister())
		assert.equal(unparsed.length, 1)
		assert.match(unparsed[0].text, /lost its backticks/)
		assert.ok(unparsed[0].line > 0)
		assert.deepEqual(findUnparsedRowLines(healthyRegister()), [], "a well-formed register yields no unparsed rows")
	})

	it("fails row-parse in the full profile, naming the line", () => {
		const report = validateRegister({
			markdown: brokenRegister(),
			pendingShas: HEALTHY_PENDING,
			probe: makeProbe({ commits: [PREFIX_A, PREFIX_B] }),
		})
		assert.equal(report.ok, false)
		const check = checkById(report, "row-parse")
		assert.equal(check.ok, false)
		assert.match(check.failures.join("\n"), /lost its backticks/)
		assert.match(check.failures.join("\n"), /line \d+/)
	})

	it("fails row-parse in the repo-only profile too (it used to exit 0 blind)", () => {
		const report = validateRegister({
			markdown: brokenRegister(),
			pendingShas: null,
			probe: makeProbe({ commits: [PREFIX_A] }),
			profile: "repo-only",
		})
		assert.equal(report.ok, false)
		assert.equal(checkById(report, "row-parse").ok, false)
	})
})

// CP1-9: an exception needs an ISO date AND a substantial reason, and an aged
// exception is reported for re-confirmation — advisory, never fatal.
describe("CP1-9 — an exception needs substance and is re-confirmed when old", () => {
	it("fails class-ladder when the reason is below the minimum length", () => {
		const report = invariantReport({
			a: { klass: "A-CLEAN", delta: 2, exception: "excepted 2026-01-01 — too short" },
		})
		assert.equal(report.ok, false)
		const ladder = checkById(report, "class-ladder")
		assert.match(ladder.failures.join("\n"), new RegExp(PREFIX_A))
		assert.match(ladder.failures.join("\n"), new RegExp(`${MIN_EXCEPTION_REASON_LENGTH}-character minimum`))
		assert.equal(report.exceptions.length, 0, "an under-substantiated token is not a usable exception")
	})

	it("reports an exception older than the window as an advisory, never a failure", () => {
		const report = validateRegister({
			markdown: invariantRegister({
				a: {
					klass: "A-CLEAN",
					delta: 2,
					exception: "excepted 2026-01-01 — merged with Δ2 under the pre-ladder classifier",
				},
			}),
			pendingShas: HEALTHY_PENDING,
			probe: makeProbe({ commits: [PREFIX_A, PREFIX_B, PREFIX_C] }),
			today: "2026-09-25",
		})
		assert.equal(report.ok, true, "an aged exception is a judgement, not a defect")
		const age = checkById(report, "exception-advisory")
		assert.equal(age.severity, "warning")
		assert.equal(age.failures.length, 0)
		assert.match(age.warnings.join("\n"), new RegExp(PREFIX_A))
		assert.equal(report.agedExceptions.length, 1)
		assert.ok(report.agedExceptions[0].ageDays > EXCEPTION_RECONFIRM_DAYS)

		const recent = validateRegister({
			markdown: invariantRegister({
				a: {
					klass: "A-CLEAN",
					delta: 2,
					exception: "excepted 2026-09-20 — merged with Δ2 under the pre-ladder classifier",
				},
			}),
			pendingShas: HEALTHY_PENDING,
			probe: makeProbe({ commits: [PREFIX_A, PREFIX_B, PREFIX_C] }),
			today: "2026-09-25",
		})
		assert.equal(checkById(recent, "exception-advisory").warnings.length, 0)
		assert.deepEqual(recent.agedExceptions, [])
	})

	it("daysBetween is exact and refuses a malformed date", () => {
		assert.equal(daysBetween("2026-09-16", "2026-09-25"), 9)
		assert.equal(daysBetween("2026-01-01", "2026-09-25"), 267)
		assert.equal(daysBetween("nope", "2026-09-25"), null)
	})
})

// CP1-3: the repo-only path must issue NO git command that references
// `upstream/main` (and therefore no upstream↔fork merge base). A PATH shim
// records every git invocation and forwards to the real binary.
describe("CP1-3 — --repo-only issues no git command that references upstream", () => {
	it("records every git call and finds none referencing upstream", () => {
		const shimDir = fs.mkdtempSync(path.join(os.tmpdir(), "triage-shim-"))
		const logPath = path.join(shimDir, "git-calls.log")
		const realGit = spawnSync("sh", ["-c", "command -v git"], { encoding: "utf8" }).stdout.trim()
		assert.ok(realGit, "could not locate the real git binary for the shim")
		const shim = ["#!/bin/sh", `printf '%s\\n' "$*" >> "$TRIAGE_GIT_LOG"`, `exec "$TRIAGE_REAL_GIT" "$@"`, ""].join("\n")
		const shimPath = path.join(shimDir, "git")
		fs.writeFileSync(shimPath, shim, { mode: 0o755 })

		const result = runRepoOnlyJson({
			PATH: `${shimDir}:${process.env.PATH}`,
			TRIAGE_GIT_LOG: logPath,
			TRIAGE_REAL_GIT: realGit,
		})
		assert.equal(result.status, 0, `repo-only must stay green through the shim: ${result.stderr}`)
		const calls = fs.readFileSync(logPath, "utf8").split("\n").filter(Boolean)
		assert.ok(calls.length > 0, "the shim must have observed at least one git call (else the test is vacuous)")
		const upstreamCalls = calls.filter((line) => /upstream/.test(line))
		assert.deepEqual(upstreamCalls, [], `--repo-only must not reference upstream: ${JSON.stringify(upstreamCalls)}`)
		// Reachability still ran, proving the absence is not "git was never called":
		// the fork-only `merge-base --is-ancestor <sha> <forkRef>` is legitimate.
		assert.ok(
			calls.some((line) => /merge-base --is-ancestor/.test(line)),
			"the fork-only reachability check must still have run",
		)
	})
})

// CP1-5: drive the PRODUCTION resolver. `commitType` returning a constant would
// pass every probe-injected test, so `row-sha-resolves` / `header-tip` could never
// fail through the real seam. This exercises real git state.
describe("CP1-5 — the production git resolver discriminates a real SHA from a bogus token", () => {
	it("buildProbe().commitType resolves a real object and rejects a bogus token", () => {
		const head = spawnSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).stdout.trim()
		assert.match(head, /^[0-9a-f]{40}$/, "expected a real HEAD SHA in this checkout")
		const probe = buildProbe("master")
		assert.equal(probe.commitType(head), "commit", "a real SHA must resolve to a commit")
		assert.equal(probe.commitType("0000000000000000000000000000000000000000"), null, "an absent object must not resolve")
		assert.equal(probe.commitType("not-a-sha"), null, "a bogus token must not resolve")
	})

	it("row-sha-resolves fails through the REAL seam for a bogus row SHA", () => {
		const BOGUS = "000000000"
		const markdown = buildRegister({ rows: [makeRow(BOGUS, "fix: bogus row")], pendingCount: 1 })
		const report = validateRegister({
			markdown,
			pendingShas: null,
			probe: buildProbe("master"),
			profile: "repo-only",
		})
		assert.equal(report.ok, false, "a bogus row SHA must fail via the real resolver, not a constant stub")
		const check = checkById(report, "row-sha-resolves")
		assert.equal(check.ok, false)
		assert.match(check.failures.join("\n"), new RegExp(BOGUS))
	})
})

// CP1-7: the CI profile must not lie. An unevaluated quantity is `null` in --json,
// never `0`, so no consumer reads "0 pending" from a profile that never measured it.
describe("CP1-7 — --verify --repo-only --json reports unmeasured quantities as null", () => {
	it("emits null (never 0) for pendingCommits, missing and unexpected", () => {
		const result = runRepoOnlyJson()
		assert.equal(result.status, 0, `repo-only must be green: ${result.stderr}`)
		const parsed = JSON.parse(result.stdout)
		assert.equal(parsed.profile, "repo-only")
		assert.equal(parsed.counts.pendingCommits, null)
		assert.equal(parsed.counts.missing, null)
		assert.equal(parsed.counts.unexpected, null)
		assert.equal(parsed.missing, null)
		assert.equal(parsed.unexpected, null)
		assert.notEqual(parsed.counts.pendingCommits, 0, "0 would read as 'zero pending upstream commits'")
	})
})

describe("parseArgs", () => {
	it("defaults to --verify", () => {
		assert.equal(parseArgs([]).mode, "verify")
	})

	it("accepts the documented flags", () => {
		assert.deepEqual(parseArgs(["--refresh", "--write", "--json", "--strict"]), {
			mode: "refresh",
			json: true,
			strict: true,
			write: true,
			repoOnly: false,
			help: false,
			forkRef: null,
			signatureStrict: false,
			allowSigners: [],
			unknown: [],
		})
	})

	it("parses --repo-only", () => {
		assert.equal(parseArgs(["--verify", "--repo-only"]).repoOnly, true)
		assert.equal(parseArgs(["--verify"]).repoOnly, false)
		assert.equal(parseArgs(["--repo-only"]).mode, "verify", "--repo-only alone defaults to --verify")
	})

	it("parses --fork-ref in both --fork-ref <ref> and --fork-ref=<ref> forms", () => {
		assert.equal(parseArgs(["--verify", "--fork-ref", "origin/master"]).forkRef, "origin/master")
		assert.equal(parseArgs(["--fork-ref=upstream/main"]).forkRef, "upstream/main")
		assert.equal(parseArgs(["--verify"]).forkRef, null)
	})

	it("records a dangling --fork-ref as an unknown flag", () => {
		assert.deepEqual(parseArgs(["--fork-ref"]).unknown, ["--fork-ref"])
		assert.deepEqual(parseArgs(["--fork-ref", "--strict"]).unknown, ["--fork-ref"])
	})

	it("records unknown flags so typos fail loudly", () => {
		assert.deepEqual(parseArgs(["--verfiy"]).unknown, ["--verfiy"])
	})

	it("recognises --help", () => {
		assert.equal(parseArgs(["--help"]).help, true)
		assert.equal(parseArgs(["-h"]).help, true)
	})

	it("parses --signature-strict and --allow-signer (both forms, repeatable)", () => {
		assert.equal(parseArgs(["--signature-strict"]).signatureStrict, true)
		assert.equal(parseArgs(["--verify"]).signatureStrict, false)
		assert.deepEqual(parseArgs(["--allow-signer", "A <a@b>", "--allow-signer=C <c@d>"]).allowSigners, [
			"A <a@b>",
			"C <c@d>",
		])
		assert.deepEqual(parseArgs(["--verify"]).allowSigners, [])
		assert.deepEqual(parseArgs(["--allow-signer"]).unknown, ["--allow-signer"])
		assert.deepEqual(parseArgs(["--allow-signer="]).unknown, ["--allow-signer="])
	})
})

// ---------------------------------------------------------------------------
// WS-4 — provenance (F-F-1 / F-F-5 / H-22)
// ---------------------------------------------------------------------------

/** A one-row register whose single row is `☑` (so the provenance checks apply). */
function syncedRegister() {
	return buildRegister({
		rows: [makeRow(PREFIX_A, "fix: a synced row", { status: "☑ `abc1234`", resolved: "2026-09-16", version: "3.88.4" })],
		pendingCount: 1,
	})
}

/** The probe that makes `syncedRegister()` internally consistent. */
function syncedProbe(overrides = {}) {
	return makeProbe({ commits: [PREFIX_A], reachable: ["abc1234"], ...overrides })
}

describe("WS-4 — the signature decision maps every git `%G?` code (F-F-1)", () => {
	it("decides G/U/E/B/N — and never conflates 'no keyring' with 'bad'", () => {
		const cases = [
			{ validity: "G", outcome: "valid" },
			{ validity: "U", outcome: "valid" },
			{ validity: "E", outcome: "unverifiable" },
			{ validity: "B", outcome: "invalid" },
			{ validity: "N", outcome: "invalid" },
		]
		for (const { validity, outcome } of cases) {
			const decision = decideProvenance({ validity, signer: GITHUB_WEBFLOW_SIGNER })
			assert.equal(decision.outcome, outcome, `%G? = ${validity} must decide "${outcome}"`)
			assert.ok(decision.reason.length > 0, "every outcome must explain itself")
		}
	})

	it("treats a good signature from an UNLISTED signer as invalid, not unverifiable", () => {
		const decision = decideProvenance({ validity: "G", signer: "Mallory <mallory@example.com>" })
		assert.equal(decision.outcome, "invalid")
		assert.match(decision.reason, /not in the allow-list/)
	})

	it("matches the allow-list on the email when the display name differs", () => {
		const decision = decideProvenance({ validity: "G", signer: "Some Body <noreply@github.com>" })
		assert.equal(decision.outcome, "valid")
		assert.equal(normaliseSignerIdentity("Some Body <noreply@github.com>").email, "noreply@github.com")
	})

	it("fails closed on an unknown `%G?` code and on an empty allow-list", () => {
		assert.equal(decideProvenance({ validity: "Z", signer: GITHUB_WEBFLOW_SIGNER }).outcome, "invalid")
		assert.equal(
			decideProvenance({ validity: "G", signer: GITHUB_WEBFLOW_SIGNER, allowedSigners: [] }).outcome,
			"invalid",
		)
	})

	it("resolves the allow-list: flag, then UPSTREAM_SIGNER_ALLOWLIST, then the default", () => {
		assert.deepEqual(resolveAllowedSigners({ UPSTREAM_SIGNER_ALLOWLIST: "A <a@b>, C <c@d>" }), ["A <a@b>", "C <c@d>"])
		assert.deepEqual(resolveAllowedSigners({}, ["X <x@y>"]), ["X <x@y>"])
		assert.deepEqual(resolveAllowedSigners({}), DEFAULT_ALLOWED_SIGNERS)
	})
})

describe("WS-4 — `--verify` validates the upstream half of the ☑ contract (F-F-1 / F-F-5)", () => {
	it("passes when the recorded upstream SHA is an ancestor of upstream/main and signature-valid", () => {
		const report = validateRegister({ markdown: syncedRegister(), pendingShas: [SHA_A], probe: syncedProbe() })
		assert.equal(report.ok, true)
		assert.equal(checkById(report, "synced-upstream-ancestry").ok, true)
		assert.equal(checkById(report, "provenance").ok, true)
		assert.deepEqual(report.signatureCounts, { valid: 1, invalid: 0, unverifiable: 0 })
	})

	it("fails an INVALID signature and names the row SHA", () => {
		const report = validateRegister({
			markdown: syncedRegister(),
			pendingShas: [SHA_A],
			probe: syncedProbe({ commitSignature: () => ({ validity: "B", signer: GITHUB_WEBFLOW_SIGNER }) }),
		})
		assert.equal(report.ok, false, "an invalid signature must fail the register")
		const check = checkById(report, "provenance")
		assert.match(check.failures.join("\n"), new RegExp(PREFIX_A))
		assert.match(check.failures.join("\n"), /not good/)
		assert.equal(report.signatureCounts.invalid, 1)
	})

	it("reports an E signature as an ADVISORY, and fails it only under --signature-strict", () => {
		const probe = syncedProbe({ commitSignature: () => ({ validity: "E", signer: "" }) })
		const lenient = validateRegister({ markdown: syncedRegister(), pendingShas: [SHA_A], probe })
		assert.equal(lenient.ok, true, "no keyring must not turn the run red")
		assert.equal(checkById(lenient, "provenance").ok, true)
		assert.match(checkById(lenient, "provenance").warnings.join("\n"), /--signature-strict/)
		assert.deepEqual(lenient.signatureCounts, { valid: 0, invalid: 0, unverifiable: 1 })
		assert.equal(lenient.unverifiableProvenance[0].sha, PREFIX_A)

		const strict = validateRegister({
			markdown: syncedRegister(),
			pendingShas: [SHA_A],
			probe,
			signatureStrict: true,
		})
		assert.equal(strict.ok, false, "--signature-strict is the explicit opt-in that makes it fatal")
		assert.match(checkById(strict, "provenance").failures.join("\n"), /--signature-strict/)
	})

	it("fails a ☑ row whose upstream SHA is NOT an ancestor of upstream/main, by row SHA", () => {
		const report = validateRegister({
			markdown: syncedRegister(),
			pendingShas: [SHA_A],
			probe: syncedProbe({ isAncestorOfUpstream: () => false }),
		})
		assert.equal(report.ok, false)
		const check = checkById(report, "synced-upstream-ancestry")
		assert.match(check.failures.join("\n"), new RegExp(PREFIX_A))
		assert.match(check.failures.join("\n"), /NOT an ancestor of upstream\/main/)
	})

	it("fails a ☑ row whose upstream SHA does not resolve, by row SHA", () => {
		const report = validateRegister({
			markdown: syncedRegister(),
			pendingShas: [SHA_A],
			probe: makeProbe({ commits: [], reachable: ["abc1234"] }),
		})
		assert.equal(report.ok, false)
		assert.match(checkById(report, "synced-upstream-ancestry").failures.join("\n"), /does not resolve to a commit/)
	})

	it("keeps both provenance checks OUT of the repo-only profile (merge-base-free guarantee)", () => {
		const report = validateRegister({
			markdown: syncedRegister(),
			pendingShas: null,
			probe: syncedProbe(),
			profile: "repo-only",
		})
		for (const id of ["synced-upstream-ancestry", "provenance"]) {
			assert.ok(!report.checks.some((check) => check.id === id), `${id} must not run in the repo-only profile`)
		}
	})
})

describe("WS-4 — `--refresh --write` refuses on an INVALID signature (H-22)", () => {
	it("refuses the write, states the outcome counts and leaves the register byte-identical", async () => {
		const before = healthyRegister()
		const { io, state } = makeRefreshIo({
			markdown: before,
			isAncestor: () => true,
			revRange: () => [NEW_SHA_1, NEW_SHA_2],
			revListCount: (spec) => (spec === UPSTREAM_REF ? 500 : 4),
			commitSignature: (sha) =>
				sha === NEW_SHA_2
					? { validity: "B", signer: GITHUB_WEBFLOW_SIGNER }
					: { validity: "G", signer: GITHUB_WEBFLOW_SIGNER },
		})

		const { code, payload } = await runRefresh(refreshOpts({ write: true }), io)

		assert.equal(code, 1, "an invalid signature must refuse the refresh")
		assert.equal(payload.refused, true)
		assert.equal(payload.wrote, false)
		assert.deepEqual(payload.signatureCounts, { valid: 1, invalid: 1, unverifiable: 0 })
		assert.equal(payload.invalidSignatures.length, 1)
		assert.equal(payload.invalidSignatures[0].sha, NEW_SHA_2.slice(0, ROW_SHA_LENGTH))
		assert.match(payload.signatureSummary, /1 valid · 1 invalid · 0 unverifiable/)
		assert.equal(state.writes, 0, "--write must refuse: the register is never opened for writing")
		assert.equal(state.markdown, before, "the register must be byte-identical after a refusal")
	})

	it("never refuses for an UNVERIFIABLE signature (no keyring), and reports the counts", async () => {
		const { io, state } = makeRefreshIo({
			isAncestor: () => true,
			revRange: () => [NEW_SHA_1],
			revListCount: (spec) => (spec === UPSTREAM_REF ? 500 : 4),
			commitSignature: () => ({ validity: "E", signer: "" }),
		})

		const { code, payload } = await runRefresh(refreshOpts({ write: true }), io)

		assert.equal(code, 0, "a missing keyring must not block a refresh")
		assert.equal(payload.wrote, true)
		assert.deepEqual(payload.signatureCounts, { valid: 0, invalid: 0, unverifiable: 1 })
		assert.equal(state.writes, 1)
	})
})
