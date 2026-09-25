/**
 * verify-resolutions.spec.mjs
 *
 * Regression tests for the resolution-record integrity gate (H-23) and the
 * resolution-integrity scan (H-28).
 *
 * The defect being guarded: R4 ("never resolve a conflict by picking a side")
 * had no witness. A record could omit a field, carry a resolution outside the
 * closed set, justify itself with a 4-character rationale, cite a SHA that does
 * not exist, attribute the fork intent to a rebrand sweep commit, drop a hunk
 * outside R5's refused paths, omit a conflicted file, invent a path the batch
 * never touched, or close a `C-REIMPLEMENT` row with `divergence: none` — and
 * every one of those passed the gate chain. One discriminating fixture per rule,
 * each asserting the report NAMES the offender (a finding an agent cannot act on
 * is not a finding).
 *
 * The marker fixtures build their markers programmatically (`"<".repeat(7)`)
 * on purpose: a literal marker line in this file would be caught by the very
 * scan it tests, and the in-tree `--integrity` step of `pnpm gate:sync` scans
 * every file the batch touched.
 *
 * Run with: node --test scripts/verify-resolutions.spec.mjs
 * (scripts/ has no vitest runner, so node:test built into Node 22 is used — same
 * as the sibling gate specs.)
 */

import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { describe, it } from "node:test"
import assert from "node:assert/strict"

import {
	RATIONALE_MIN_LENGTH,
	RESOLUTION_VALUES,
	ROOT,
	closedCReimplementRows,
	createGitProbe,
	isR5RefusedPath,
	parseDroppedEntries,
	parseRegisterBatches,
	parseResolutionRecord,
	parseWhitespaceErrors,
	scanFilesForConflictMarkers,
	scanTextForConflictMarkers,
	validateRecord,
	DEFAULT_REGISTER,
} from "./verify-resolutions.mjs"

const SCRIPT = path.join(ROOT, "scripts/verify-resolutions.mjs")
const RECORD_PATH = "docs/upstream-sync/resolutions/SYNC-3.md"
const TASK_FILE = "src/core/task/Task.ts"
const RANGE = [TASK_FILE]
const UPSTREAM_SHA = "21d35c4a9"
const FORK_SHA = "4a455eeeb"
const REGISTER_ROWS = [{ sha: UPSTREAM_SHA, klass: "C-REIMPLEMENT", status: "☑ f4287ff4f", line: 199 }]

/** A probe whose every answer is healthy. Each fixture overrides one member. */
function cleanProbe(overrides = {}) {
	return {
		commitExists: () => true,
		commitSubject: (sha) => `fix: substantive subject for ${sha}`,
		isReachableFromForkRef: () => true,
		...overrides,
	}
}

/** Renders one block. `null` as a field value OMITS the field (the fixture). */
function block({ file = TASK_FILE, shape = "modify/modify", fields = {} } = {}) {
	const merged = {
		upstream: `${UPSTREAM_SHA} — atomic per-task merge so a crash cannot split the index`,
		fork: `${FORK_SHA} — scope the history window and paging per workspace`,
		fork_locus: "none",
		resolution: "both-re-expressed",
		rationale: "The fork scoping and upstream atomicity are independent concerns.",
		dropped: "none",
		evidence: "Task.spec.ts atomic-merge fails before, passes after. Gates: gate:sync.",
		divergence: `promoted-to-row:${UPSTREAM_SHA}`,
		...fields,
	}
	const lines = [`### ${file} [shape: ${shape}]`, ""]
	for (const [key, value] of Object.entries(merged)) {
		if (value === null) continue
		lines.push(`- ${key}: ${value}`)
	}
	return lines.join("\n")
}

/** Renders a record. `null` as a metadata value OMITS the key (the fixture). */
function recordText({ metadata = {}, blocks = [block()] } = {}) {
	const merged = {
		batch: "SYNC-3",
		base: "origin/master",
		head: "sync/sync-3-task-history",
		conflicted_files: RANGE.join(", "),
		...metadata,
	}
	const lines = ["# SYNC-3 — Task-History Durability", ""]
	for (const [key, value] of Object.entries(merged)) {
		if (value === null) continue
		lines.push(`- ${key}: ${value}`)
	}
	lines.push("", ...blocks)
	return lines.join("\n")
}

function findingsFor(overrides = {}) {
	return validateRecord({
		record: parseResolutionRecord(overrides.text ?? recordText(overrides.record)),
		batch: "SYNC-3",
		base: "origin/master",
		head: "HEAD",
		rangeFiles: overrides.rangeFiles ?? RANGE,
		registerRows: overrides.registerRows ?? REGISTER_ROWS,
		probe: overrides.probe ?? cleanProbe(),
		recordPath: RECORD_PATH,
	})
}

const rulesOf = (findings) => findings.map((finding) => finding.rule)
const offenders = (findings, rule) => findings.filter((finding) => finding.rule === rule).map((f) => f.offender)

describe("resolution records — the gate is not red by construction", () => {
	it("a clean record passes with zero findings", () => {
		assert.deepEqual(findingsFor(), [])
	})

	it("pins the closed set and the rationale floor independently", () => {
		assert.deepEqual([...RESOLUTION_VALUES], [
			"both-re-expressed",
			"upstream-adapted",
			"fork-wins-forever",
			"upstream-wins",
		])
		assert.equal(RATIONALE_MIN_LENGTH, 20)
	})
})

describe("resolution records — one discriminating fixture per rule", () => {
	it("missing field: an omitted `fork_locus:` fails BY FILE and names the field", () => {
		const findings = findingsFor({ record: { blocks: [block({ fields: { fork_locus: null } })] } })
		assert.deepEqual(offenders(findings, "block-fields"), [TASK_FILE])
		assert.match(findings.find((f) => f.rule === "block-fields").message, /missing `fork_locus:`/)
	})

	it("invalid resolution value: names the file AND the offending value", () => {
		const findings = findingsFor({ record: { blocks: [block({ fields: { resolution: "upstream-picked" } })] } })
		assert.deepEqual(rulesOf(findings), ["resolution-value"])
		assert.match(offenders(findings, "resolution-value")[0], /upstream-picked/)
	})

	it("short rationale: reports the actual length against the floor", () => {
		const findings = findingsFor({ record: { blocks: [block({ fields: { rationale: "too short" } })] } })
		assert.deepEqual(rulesOf(findings), ["rationale-length"])
		assert.match(offenders(findings, "rationale-length")[0], /9 chars/)
	})

	it("unresolvable SHA: names the SHA that `git cat-file -e` rejects", () => {
		const probe = cleanProbe({ commitExists: (sha) => sha !== "fffffffff" })
		const findings = findingsFor({
			probe,
			record: { blocks: [block({ fields: { upstream: "fffffffff — a commit that does not exist" } })] },
		})
		assert.deepEqual(offenders(findings, "sha-resolves"), ["fffffffff"])
		assert.match(findings.find((f) => f.rule === "sha-resolves").message, /cat-file/)
	})

	it("fork SHA that is a rebrand commit: names the SHA and quotes the subject", () => {
		const probe = cleanProbe({ commitSubject: () => "chore(rebrand): normalise upstream tokens" })
		const findings = findingsFor({ probe })
		assert.deepEqual(offenders(findings, "fork-sha-not-rebrand"), [FORK_SHA])
		assert.match(findings.find((f) => f.rule === "fork-sha-not-rebrand").message, /rebrand commit/)
	})

	it("fork SHA not reachable from the fork ref: names the SHA and the ref", () => {
		const probe = cleanProbe({ isReachableFromForkRef: () => false })
		const findings = findingsFor({ probe })
		assert.deepEqual(offenders(findings, "fork-sha-reachable"), [FORK_SHA])
		assert.match(findings.find((f) => f.rule === "fork-sha-reachable").message, /origin\/master/)
	})

	it("`dropped:` outside R5: names the illegal path", () => {
		const findings = findingsFor({
			record: { blocks: [block({ fields: { dropped: `${TASK_FILE} — dropped the telemetry hunk` } })] },
		})
		assert.deepEqual(offenders(findings, "dropped-path-r5"), [TASK_FILE])
	})

	it("a batch file with no block: names the file the batch touched", () => {
		const findings = findingsFor({
			rangeFiles: [TASK_FILE, "src/core/task/HistoryStore.ts"],
			record: { metadata: { conflicted_files: `${TASK_FILE}, src/core/task/HistoryStore.ts` } },
		})
		assert.deepEqual(offenders(findings, "record-range-missing"), ["src/core/task/HistoryStore.ts"])
	})

	it("a declared path the batch never touched: names the padded path", () => {
		const findings = findingsFor({
			record: { metadata: { conflicted_files: `${TASK_FILE}, src/core/task/Ghost.ts` } },
		})
		assert.deepEqual(offenders(findings, "record-range-extra"), ["src/core/task/Ghost.ts"])
	})

	it("`conflicted_files:` and the block list disagreeing: names the file", () => {
		const findings = findingsFor({
			record: { metadata: { conflicted_files: TASK_FILE }, blocks: [block({ file: "src/core/task/HistoryStore.ts" })] },
		})
		assert.ok(
			offenders(findings, "record-declared-mismatch").includes("src/core/task/HistoryStore.ts"),
			"a block whose path is not in `conflicted_files:` must be reported",
		)
	})

	it("a closed `C-REIMPLEMENT` row with `divergence: none`: names the row SHA", () => {
		const findings = findingsFor({ record: { blocks: [block({ fields: { divergence: "none" } })] } })
		assert.deepEqual(offenders(findings, "c-reimplement-divergence"), [UPSTREAM_SHA])
		assert.match(findings.find((f) => f.rule === "c-reimplement-divergence").message, /register line 199/)
	})

	it("a record with no metadata and no blocks is reported as missing metadata, never as a pass", () => {
		const findings = findingsFor({
			rangeFiles: [],
			registerRows: [],
			record: { metadata: { batch: null, conflicted_files: null }, blocks: [] },
		})
		assert.equal(offenders(findings, "record-metadata").length, 3)
		assert.ok(rulesOf(findings).every((rule) => rule === "record-metadata"))
	})
})

describe("resolution integrity — markers and whitespace, reported by file:line", () => {
	it("a leftover conflict marker: names the file AND every offending line", () => {
		const text = [
			"const a = 1",
			`${"<".repeat(7)} HEAD`,
			"const b = 2",
			"=".repeat(7),
			"const c = 3",
			`${">".repeat(7)} upstream/main`,
		].join("\n")
		const findings = scanFilesForConflictMarkers([TASK_FILE], () => text)
		assert.deepEqual(offenders(findings, "conflict-marker"), [
			`${TASK_FILE}:2`,
			`${TASK_FILE}:4`,
			`${TASK_FILE}:6`,
		])
	})

	it("quoted/escaped markers and setext underlines are NOT markers (no false positives)", () => {
		assert.deepEqual(scanTextForConflictMarkers(`\\${"<".repeat(7)} HEAD`), [])
		assert.deepEqual(scanTextForConflictMarkers(`Escape conflict markers with \`\\${"<".repeat(7)}\` in diffs`), [])
		assert.deepEqual(scanTextForConflictMarkers("=".repeat(8)), [])
	})

	it("`git diff --check` output is reported by path:line", () => {
		const findings = parseWhitespaceErrors("src/a.ts:12: trailing whitespace.\n+   \n", "git diff --check")
		assert.deepEqual(offenders(findings, "whitespace"), ["src/a.ts:12"])
		assert.equal(findings[0].message, "trailing whitespace. (git diff --check)")
	})

	it("an unreadable/deleted file is skipped instead of crashing the scan", () => {
		const findings = scanFilesForConflictMarkers(["gone.ts"], () => {
			throw new Error("ENOENT")
		})
		assert.deepEqual(findings, [])
	})
})

describe("R5 path matching and `dropped:` parsing", () => {
	it("R5's refused paths are the only legal `dropped:` targets", () => {
		for (const allowed of [
			"src/package.json",
			"CHANGELOG.md",
			"src/CHANGELOG.md",
			"locales/es/README.md",
			"pnpm-lock.yaml",
			".github/workflows/code-qa.yml",
			".coderabbit.yaml",
		]) {
			assert.ok(isR5RefusedPath(allowed), `${allowed} must be R5-refused`)
		}
		for (const refused of ["src/core/task/Task.ts", "docs/runbooks/upstream-sync.md", "src/eslint-suppressions.json"]) {
			assert.equal(isR5RefusedPath(refused), false, `${refused} must NOT be R5-refused`)
		}
	})

	it("`dropped:` parses each path with its hunk summary", () => {
		assert.deepEqual(parseDroppedEntries("none"), [])
		assert.deepEqual(parseDroppedEntries("pnpm-lock.yaml — the whole lockfile hunk"), ["pnpm-lock.yaml"])
		assert.deepEqual(parseDroppedEntries(".github/workflows/code-qa.yml — CI hunk; CHANGELOG.md — release note"), [
			".github/workflows/code-qa.yml",
			"CHANGELOG.md",
		])
	})
})

describe("the register is read by header name, and the live one parses", () => {
	it("closed C-REIMPLEMENT rows are derived from Class + Status, not from column index", () => {
		const text = [
			"## SYNC-9 — synthetic",
			"",
			"| SHA | Date | Subject | Class | Pri | Δ | Status | Blocked-by | Resolved: | Version | Exception |",
			"| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
			"| `a1b2c3d4e` | 2026-01-01 | hand-port a | `C-REIMPLEMENT` | P1 | 3 | ☑ feedface1 | — | 2026-01-02 | 3.88.1 | — |",
			"| `f5e6d7c8b` | 2026-01-01 | hand-port b | `C-REIMPLEMENT` | P1 | 3 | ☐ | — | — | — | — |",
			"| `0011aabbc` | 2026-01-01 | pick c | `A-CLEAN` | P2 | 0 | ☑ deadbeef2 | — | 2026-01-02 | 3.88.1 | — |",
			"",
			"## SYNC-10 — synthetic",
			"",
			"| SHA | Date | Subject | Class | Pri | Δ | Status | Blocked-by | Resolved: | Version | Exception |",
			"| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
			"| `223344556` | 2026-01-01 | pick d | `B-CAREFUL` | P2 | 1 | ☐ | — | — | — | — |",
		].join("\n")
		const batches = parseRegisterBatches(text)
		assert.deepEqual(closedCReimplementRows(batches.get("SYNC-9")).map((row) => row.sha), ["a1b2c3d4e"])
		assert.deepEqual(batches.get("SYNC-9")[0].klass, "C-REIMPLEMENT")
		assert.equal(batches.get("SYNC-10").length, 1)
	})

	it("the live register parses (SYNC-3 rows, canonical 9-character SHAs)", () => {
		const batches = parseRegisterBatches(fs.readFileSync(path.join(ROOT, DEFAULT_REGISTER), "utf8"))
		const sy3 = batches.get("SYNC-3")
		assert.ok(Array.isArray(sy3) && sy3.length >= 5, "SYNC-3 must parse its rows")
		assert.ok(sy3.every((row) => /^[0-9a-f]{9}$/.test(row.sha)), "row SHAs must be canonical 9-character prefixes")
		assert.ok(sy3.some((row) => row.klass === "C-REIMPLEMENT"), "SYNC-3 holds hand-ports")
	})
})

describe("the git probe fails closed where it must", () => {
	it("an unresolvable range returns null (never an empty list that passes)", () => {
		const probe = createGitProbe({ root: ROOT })
		assert.deepEqual(probe.changedFiles("HEAD", "HEAD"), [])
		assert.equal(probe.changedFiles("no-such-ref-xyz", "HEAD"), null)
		assert.equal(probe.commitExists("HEAD"), true)
		assert.equal(probe.commitExists("no-such-ref-xyz"), false)
	})
})

describe("the CLI is usable and never silently passes", () => {
	it("`--help` documents the batch parameters and exits 0", () => {
		const out = execFileSync(process.execPath, [SCRIPT, "--help"], { cwd: ROOT, encoding: "utf8" })
		assert.match(out, /--batch SYNC-n/)
		assert.match(out, /--integrity/)
		assert.match(out, /record-range-missing/)
	})

	it("a batch with no record yet exits 1 with an actionable message", () => {
		let status = 0
		let out = ""
		try {
			out = execFileSync(
				process.execPath,
				[SCRIPT, "--batch", "SYNC-99", "--base", "origin/master", "--head", "HEAD"],
				{ cwd: ROOT, encoding: "utf8" },
			)
		} catch (error) {
			status = typeof error.status === "number" ? error.status : 1
			out = `${error.stdout ?? ""}${error.stderr ?? ""}`
		}
		assert.equal(status, 1)
		assert.match(out, /no resolution record for SYNC-99/)
		assert.match(out, /SYNC-99\.md/)
		assert.match(out, /_TEMPLATE\.md/)
	})

	it("an unknown flag exits 2 instead of guessing", () => {
		let status = 0
		try {
			execFileSync(process.execPath, [SCRIPT, "--nope"], { cwd: ROOT, encoding: "utf8" })
		} catch (error) {
			status = typeof error.status === "number" ? error.status : 1
		}
		assert.equal(status, 2)
	})
})
