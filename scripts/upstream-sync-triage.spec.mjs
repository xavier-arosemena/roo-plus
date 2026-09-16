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

import { execFileSync } from "node:child_process"
import { describe, it } from "node:test"
import assert from "node:assert/strict"

import {
	applyRefreshWrite,
	buildBatchRollup,
	buildRefreshPlan,
	computeCommitEvidence,
	crossCheckRows,
	decideRunMode,
	emitJson,
	extractForkSha,
	formatRegisterRow,
	intentPrefix,
	isQuickWin,
	nextSectionNumber,
	parseArgs,
	parseBaseline,
	parseRegister,
	proposeClass,
	proposePriority,
	renderRegisterDiff,
	splitRowCells,
	validateRegister,
	HOT_FILES,
	ROOT,
	ROW_SHA_LENGTH,
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
function makeRow(sha, subject, { klass = "A-CLEAN", priority = "P1", delta = 0, status = "☐" } = {}) {
	return `| \`${sha}\` | 2026-09-01 | ${subject} | \`${klass}\` | ${priority} | ${delta} | ${status} |`
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
		"| SHA | Date | Subject | Class | Pri | Δ | Status |",
		"| --- | ---- | ------- | ----- | --- | - | ------ |",
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
function makeProbe({ commits = [], reachable = [], upstreamTip = TIP, mergeBase = MERGE_BASE } = {}) {
	const commitSet = new Set(commits)
	const reachableSet = new Set(reachable)
	return {
		commitType: (sha) => (commitSet.has(sha) ? "commit" : null),
		isReachableFromMaster: (sha) => reachableSet.has(sha),
		upstreamTip: () => upstreamTip,
		mergeBase: () => mergeBase,
	}
}

/** A well-formed three-row register over the three fixture commits. */
function healthyRegister(overrides = {}) {
	return buildRegister({
		rows: [
			makeRow(PREFIX_A, "feat: Add Read+Write allowlists (#1274)", { klass: "C-REIMPLEMENT", priority: "P0", delta: 28 }),
			makeRow(PREFIX_B, "feat(file-safety): file version token (#1383)", { priority: "P0" }),
			makeRow(PREFIX_C, "feat(api): abort signal support for bedrock (#1292)", { delta: 2 }),
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
			sectionId: "SYNC-1",
		})
	})

	it("splits a row into seven content cells", () => {
		assert.deepEqual(splitRowCells(makeRow(PREFIX_A, "fix: x", { status: "☑ `abc1234`" })), [
			`\`${PREFIX_A}\``,
			"2026-09-01",
			"fix: x",
			"`A-CLEAN`",
			"P1",
			"0",
			"☑ `abc1234`",
		])
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
				rows: [
					makeRow(PREFIX_A, "fix: a", { status: "☑ `abc1234`" }),
					makeRow(PREFIX_B, "fix: b"),
				],
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
// validateRegister — the six independent checks
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

	it("exposes the six checks independently", () => {
		const report = validateRegister({ markdown: healthyRegister(), pendingShas: HEALTHY_PENDING, probe: HEALTHY_PROBE })
		assert.deepEqual(
			report.checks.map((check) => check.id),
			["row-sha-format", "row-sha-resolves", "coverage", "duplicates", "synced-fork-sha", "header-counts"],
		)
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
			rows: [makeRow(PREFIX_A, "fix: a", { status: "☑" }), makeRow(PREFIX_B, "fix: b"), makeRow(PREFIX_C, "fix: c")],
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

	it("passes when the fork SHA is reachable", () => {
		const markdown = buildRegister({
			rows: [
				makeRow(PREFIX_A, "fix: a", { status: "☑ `abc1234`" }),
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

describe("validateRegister — header counts", () => {
	it("fails when the pending count drifts from reality", () => {
		const report = validateRegister({
			markdown: healthyRegister({ pendingCount: 102 }),
			pendingShas: HEALTHY_PENDING,
			probe: HEALTHY_PROBE,
		})
		assert.equal(report.ok, false)
		const header = checkById(report, "header-counts")
		assert.equal(header.ok, false)
		assert.match(header.failures.join("\n"), /Pending upstream commits: 102/)
		assert.match(header.failures.join("\n"), /contains 3 commits/)
	})

	it("fails when the recorded baseline tip drifts", () => {
		const report = validateRegister({
			markdown: healthyRegister({ tip: "aaaaaaaaa" }),
			pendingShas: HEALTHY_PENDING,
			probe: HEALTHY_PROBE,
		})
		assert.equal(report.ok, false)
		assert.match(checkById(report, "header-counts").failures.join("\n"), /records baseline tip `aaaaaaaaa`/)
	})

	it("fails when the merge base drifts", () => {
		const report = validateRegister({
			markdown: healthyRegister({ mergeBase: "bbbbbbbbb" }),
			pendingShas: HEALTHY_PENDING,
			probe: HEALTHY_PROBE,
		})
		assert.equal(report.ok, false)
		assert.match(checkById(report, "header-counts").failures.join("\n"), /records merge base `bbbbbbbbb`/)
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
		assert.deepEqual(evidence.deltaFiles, [
			"src/services/api/providers/deepseek.ts",
			"src/package.json",
		])
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
		baseline: { upstreamTip: TIP.slice(0, 9), mergeBase: MERGE_BASE.slice(0, 9), forkTip: "77a670196", pendingCount: 3 },
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

	it("formats a row in the register's exact column order", () => {
		assert.equal(
			formatRegisterRow({ sha9: "abc123456", date: "2026-09-17", subject: "fix: x", klass: "A-CLEAN", priority: "P1", delta: 2 }),
			"| `abc123456` | 2026-09-17 | fix: x | `A-CLEAN` | P1 | 2 | ☐ |",
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
// Upstream-unavailable semantics + CLI
// ---------------------------------------------------------------------------

describe("decideRunMode — skip on unreachable upstream", () => {
	it("runs when the local upstream ref exists (offline-safe)", () => {
		assert.deepEqual(decideRunMode({ localRef: true, fetchSucceeded: false, strict: false }), { run: true, fail: false })
	})

	it("runs when the fetch succeeded", () => {
		assert.deepEqual(decideRunMode({ localRef: false, fetchSucceeded: true, strict: false }), { run: true, fail: false })
	})

	it("SKIPS (exit 0) when upstream is unreachable and --strict is absent", () => {
		assert.deepEqual(decideRunMode({ localRef: false, fetchSucceeded: false, strict: false }), { run: false, fail: false })
	})

	it("FAILS (exit 1) when upstream is unreachable and --strict is set", () => {
		assert.deepEqual(decideRunMode({ localRef: false, fetchSucceeded: false, strict: true }), { run: false, fail: true })
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
		assert.equal(captureStdout(() => emitJson({ json: false }, { a: 1 })), "")
	})

	it("emitJson writes exactly one parseable JSON document", () => {
		const captured = captureStdout(() => emitJson({ json: true }, { mode: "verify", ok: true }))
		assert.deepEqual(JSON.parse(captured), { mode: "verify", ok: true })
	})

	// Regression: a logger call that fires before the payload (e.g. the
	// shallow-checkout warning) used to be written to stdout and made
	// `--verify --json` unparseable for consumers.
	it("--verify --json prints pure JSON on stdout with no log leakage", () => {
		const stdout = execFileSync(process.execPath, ["scripts/upstream-sync-triage.mjs", "--verify", "--json"], {
			cwd: ROOT,
			encoding: "utf8",
			timeout: 120_000,
		})
		const parsed = JSON.parse(stdout)
		assert.equal(parsed.mode, "verify")
		assert.equal(typeof parsed.ok, "boolean")
		// The real register in this repo must verify fully (not skip).
		assert.equal(parsed.skipped, false)
		assert.deepEqual(parsed.counts, {
			rows: 102,
			pendingCommits: 102,
			duplicates: 0,
			missing: 0,
			unexpected: 0,
			synced: 0,
		})
		assert.equal(parsed.checks.length, 6)
		assert.ok(parsed.checks.every((check) => check.ok))
	})

	it("--verify --json reports a failing check with the row named", () => {
		const stdout = execFileSync(process.execPath, ["scripts/upstream-sync-triage.mjs", "--verify", "--json"], {
			cwd: ROOT,
			encoding: "utf8",
			timeout: 120_000,
		})
		const parsed = JSON.parse(stdout)
		const format = parsed.checks.find((check) => check.id === "row-sha-format")
		assert.equal(format.ok, true)
		assert.deepEqual(format.failures, [])
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
			help: false,
			unknown: [],
		})
	})

	it("records unknown flags so typos fail loudly", () => {
		assert.deepEqual(parseArgs(["--verfiy"]).unknown, ["--verfiy"])
	})

	it("recognises --help", () => {
		assert.equal(parseArgs(["--help"]).help, true)
		assert.equal(parseArgs(["-h"]).help, true)
	})
})
