#!/usr/bin/env node

/**
 * verify-resolutions.mjs — the resolution-record integrity gate (H-23) and the
 * resolution-integrity scan (H-28 / F-C-3).
 *
 * Why this file exists. R4 ("never resolve a conflict by picking a side") was
 * prose with no witness: nothing recorded the two intents, nothing recorded what
 * was dropped, and no gate could tell a half-ported fix from a complete one — a
 * `C-REIMPLEMENT` port that dropped half the upstream intent passed all seven
 * invariant gates (M6). This script makes the doctrine enforceable without
 * making it softer:
 *
 *   RECORD MODE  (`--batch SYNC-n --base <sha> --head <ref>`)
 *     Every `docs/upstream-sync/resolutions/SYNC-<n>.md` block must carry all
 *     fields; `resolution:` must be in the CLOSED set; `rationale:` must clear a
 *     length floor; every cited SHA must resolve (`git cat-file -e`) and the
 *     `fork:` SHA must be reachable from the fork ref and must NOT be a rebrand
 *     sweep commit (the rebrand erases the blame signal R4 now depends on);
 *     every `dropped:` path must be one of R5's refused paths; and the declared
 *     `conflicted_files:` list must equal the files the batch actually touched
 *     in `--base...--head` — so a record cannot be padded with unrelated paths
 *     and a batch cannot omit a record for a file it touched. Every
 *     `C-REIMPLEMENT` row the batch closes must be cited by a non-`none`
 *     `divergence:` value.
 *
 *   INTEGRITY MODE (`--integrity`, a step of `pnpm gate:sync`)
 *     Fails on an unmerged conflict marker inside any file the batch touched
 *     (committed range + working tree + untracked), and on `git diff --check`
 *     whitespace errors in the same range.
 *
 * Everything is offline and read-only. Findings are reported BY FILE OR SHA,
 * never generically: a report that does not name the offender is a report an
 * agent cannot act on.
 *
 * The default range is `origin/master...HEAD`, i.e. the batch branch's own
 * commits. It is deliberately NOT the fork merge base: the merge-base range is
 * ~1000 files of pre-existing whitespace churn (verified 2026-09-25), so a
 * merge-base default would be red by construction — the failure mode lens G
 * names ("do not ship a gate that is red or green by construction").
 *
 * Usage (from the repo root):
 *   node scripts/verify-resolutions.mjs --batch SYNC-3 --base origin/master --head HEAD
 *   node scripts/verify-resolutions.mjs --integrity
 *   node scripts/verify-resolutions.mjs --help
 *
 * Exit codes: 0 all checks passed · 1 a violation (named by file or SHA) or a
 * missing record · 2 unusable invocation (unknown flag, missing `--batch`).
 *
 * Conventions match the sibling gates: `TAG`-prefixed logging from
 * `scripts/lib/logger.mjs`, `--help`, explicit exit codes, a `node:test` spec in
 * `scripts/`, and the injected-probe seam (`validateRecord({ probe })`) so the
 * rules are unit-testable without touching git.
 */

import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

import { logEndGroup, logError, logInfo, logStep, logSuccess } from "./lib/logger.mjs"

/** Hierarchical tag identifying this process (same scheme as the sibling gates). */
export const TAG = "VERIFY:RESOLUTIONS"

/** Repository root (the workspace root, one level above scripts/). */
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

/** Default register (the batch sections are read from here). */
export const DEFAULT_REGISTER = "docs/upstream-sync/pending-upstream-commits.md"

/** Directory holding `_TEMPLATE.md` and the per-batch records. */
export const DEFAULT_RESOLUTIONS_DIR = "docs/upstream-sync/resolutions"

/** Batch range defaults — the batch branch's own commits, never the merge base. */
export const DEFAULT_BASE = "origin/master"
export const DEFAULT_HEAD = "HEAD"

/** Ref the `fork:` SHA must be reachable from. */
export const DEFAULT_FORK_REF = "origin/master"

/** The template is not a record; records are named exactly `SYNC-<n>.md`. */
export const TEMPLATE_NAME = "_TEMPLATE.md"

/** The CLOSED set of resolution values (deliverable 1 / H-23). */
export const RESOLUTION_VALUES = Object.freeze([
	"both-re-expressed",
	"upstream-adapted",
	"fork-wins-forever",
	"upstream-wins",
])

/** Length floor for `rationale:` — rejects `n/a` and other placeholders. */
export const RATIONALE_MIN_LENGTH = 20

/** Every field a `### <path> [shape: …]` block must carry. */
export const BLOCK_FIELDS = Object.freeze([
	"upstream",
	"fork",
	"fork_locus",
	"resolution",
	"rationale",
	"dropped",
	"evidence",
	"divergence",
])

/** Block-level metadata keys read before the first block. */
export const METADATA_KEYS = Object.freeze(["batch", "base", "head", "conflicted_files"])

/**
 * A live conflict marker, anchored to the whole line. The `=======` form is
 * pinned to exactly seven `=` so a Markdown setext underline cannot false-fire,
 * and a QUOTED marker (`\<<<<<<<`, or one inside a sentence) is not a marker.
 */
export const CONFLICT_MARKER_RE = /^(?:<{7}(?:\s.*)?|={7}|>{7}(?:\s.*)?)$/

/**
 * A rebrand sweep commit. R4's fork-intent query is `git blame -L`, and the
 * rebrand rewrites ~1000 tracked files per batch (F-C-9/F-F-2), so a rebrand
 * commit cited as fork intent is a defect, not a judgement call.
 */
export const REBRAND_SUBJECT_RE = /(^|\W)rebrand(\W|$)|normalise\s+upstream\s+tokens/i

/** The `C-REIMPLEMENT` class token as it appears in the register. */
export const C_REIMPLEMENT = "C-REIMPLEMENT"

/** The status marker the register uses for a merged row. */
export const SYNCED_MARKER = "☑"

/**
 * R5's refused paths (runbook R5). These are the ONLY paths a `dropped:` entry
 * may name — a drop anywhere else is an unrecorded divergence.
 */
export function isR5RefusedPath(filePath) {
	const candidate = String(filePath ?? "")
		.replace(/`/g, "")
		.trim()
		.replace(/^\.\//, "")
		.replace(/^\/+/, "")
	if (!candidate) return false
	if (candidate === "pnpm-lock.yaml") return true
	if (candidate === "src/package.json") return true
	if (candidate === ".github" || candidate.startsWith(".github/")) return true
	if (candidate.startsWith(".coderabbit")) return true
	const base = path.posix.basename(candidate)
	if (/^CHANGELOG/i.test(base)) return true
	if (/^locales\/[^/]+\/README\.md$/.test(candidate)) return true
	return false
}

/** Strips Markdown backticks and trims. */
function stripBackticks(value) {
	return String(value ?? "")
		.replace(/`/g, "")
		.trim()
}

/** Builds a finding. `offender` is ALWAYS a path or a SHA, never a sentence. */
function finding(rule, offender, message) {
	return { rule, offender, message }
}

/**
 * The first 7–40 character hex token in a field value — the cited SHA.
 * Returns null when the field cites no SHA (itself a defect for `upstream:`/
 * `fork:`, since both intents must be attributable).
 */
export function firstSha(value) {
	const match = /(?:^|[\s`(:])([0-9a-f]{7,40})(?=$|[\s`,.;:)])/i.exec(String(value ?? ""))
	return match ? match[1].toLowerCase() : null
}

/**
 * The SHA a `divergence:` value promotes to (`promoted-to-row:<sha>`), or null.
 * Deliberately NOT `firstSha`: `divergent-forever:<reason>` carries no SHA and a
 * reason word must never be mistaken for one.
 */
export function promotedRowSha(value) {
	const match = /promoted-to-row:\s*([0-9a-f]{7,40})/i.exec(String(value ?? ""))
	return match ? match[1].toLowerCase() : null
}

/** Splits a Markdown table line into trimmed cells. */
export function splitTableCells(line) {
	return String(line ?? "")
		.trim()
		.replace(/^\|/, "")
		.replace(/\|$/, "")
		.split("|")
		.map((cell) => cell.trim())
}

/** Parses a comma/semicolon separated path list (`conflicted_files:`). */
export function parsePathList(value) {
	const text = stripBackticks(value)
	if (!text || /^none$/i.test(text) || text === "—") return []
	return text
		.split(/[,;]/)
		.map((entry) => stripBackticks(entry))
		.filter(Boolean)
}

/**
 * Parses `dropped:` into path entries. Format:
 *   `none` | `<path> — <hunk summary>[; <path> — <hunk summary>]`
 */
export function parseDroppedEntries(value) {
	const text = stripBackticks(value)
	if (!text || /^none$/i.test(text)) return []
	return text
		.split(";")
		.map((entry) => entry.split(/\s+—\s+|\s+-\s+/)[0])
		.map((entry) => stripBackticks(entry))
		.filter(Boolean)
}

/**
 * Parses one resolution record. Pure — exported for the spec.
 * Metadata is read before the first block (and after any non-block heading);
 * every `### <path> [shape: …]` heading opens a block.
 */
export function parseResolutionRecord(text) {
	const record = { metadata: {}, blocks: [], batch: null, base: null, head: null, conflictedFiles: null }
	let current = null
	for (const raw of String(text ?? "").split("\n")) {
		const line = raw.replace(/\s+$/, "")
		const block = /^###\s+(.+?)\s*\[shape:\s*([^\]]+?)\s*\]\s*$/.exec(line)
		if (block) {
			current = { path: block[1].trim(), shape: block[2].trim(), fields: {} }
			record.blocks.push(current)
			continue
		}
		if (/^#{1,6}\s/.test(line)) {
			current = null
			continue
		}
		const field = /^[-*]\s+([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*(.*)$/.exec(line)
		if (field) {
			const key = field[1].toLowerCase()
			const value = field[2].trim()
			if (current) current.fields[key] = value
			else record.metadata[key] = value
			continue
		}
	}
	record.batch = record.metadata.batch ?? null
	record.base = record.metadata.base ?? null
	record.head = record.metadata.head ?? null
	record.conflictedFiles =
		record.metadata.conflicted_files === undefined ? null : parsePathList(record.metadata.conflicted_files)
	return record
}

/**
 * Parses the register's per-batch tables into `Map<batch, rows[]>`.
 * Columns are resolved BY HEADER NAME (never by index) and a table without a
 * `Class`/`Status` header pair is skipped rather than guessed. Pure.
 */
export function parseRegisterBatches(registerText) {
	const batches = new Map()
	let currentBatch = null
	let columns = null
	let lineNumber = 0
	for (const raw of String(registerText ?? "").split("\n")) {
		lineNumber += 1
		const line = raw.replace(/\s+$/, "")
		const batchHeading = /^##\s+(SYNC-\d+)\b/.exec(line)
		if (batchHeading) {
			currentBatch = batchHeading[1]
			columns = null
			if (!batches.has(currentBatch)) batches.set(currentBatch, [])
			continue
		}
		if (/^##\s/.test(line)) {
			currentBatch = null
			columns = null
			continue
		}
		if (!currentBatch) continue
		if (/^\|\s*SHA\s*\|/i.test(line)) {
			columns = splitTableCells(line)
			continue
		}
		if (!columns) continue
		const cells = splitTableCells(line)
		if (cells.length !== columns.length) continue
		const shaCell = stripBackticks(cells[0])
		if (!/^[0-9a-f]{7,40}$/.test(shaCell)) continue
		const classIndex = columns.findIndex((column) => /^class$/i.test(column))
		const statusIndex = columns.findIndex((column) => /^status$/i.test(column))
		if (classIndex === -1 || statusIndex === -1) continue
		batches.get(currentBatch).push({
			sha: shaCell.toLowerCase(),
			klass: stripBackticks(cells[classIndex]),
			status: cells[statusIndex],
			line: lineNumber,
		})
	}
	return batches
}

/** The `C-REIMPLEMENT` rows a batch has closed (status carries `☑`). */
export function closedCReimplementRows(rows = []) {
	return rows.filter((row) => row.klass === C_REIMPLEMENT && String(row.status ?? "").includes(SYNCED_MARKER))
}

/**
 * Validates one resolution record against the batch range, the register and an
 * injected `probe` (repo facts). Returns findings; empty means the record is
 * auditable. Pure.
 */
export function validateRecord({
	record,
	batch,
	base = DEFAULT_BASE,
	head = DEFAULT_HEAD,
	rangeFiles = [],
	registerRows = [],
	probe,
	forkRef = DEFAULT_FORK_REF,
	recordPath = null,
}) {
	const findings = []
	const label = recordPath ?? (batch ? `${batch}.md` : "resolution record")

	// --- metadata -----------------------------------------------------------------
	if (!record.batch) {
		findings.push(finding("record-metadata", label, `${label} has no \`batch:\` metadata line`))
	} else if (record.batch !== batch) {
		findings.push(
			finding(
				"record-batch-mismatch",
				record.batch,
				`${label} declares \`batch: ${record.batch}\` but was checked as \`${batch}\``,
			),
		)
	}
	if (record.conflictedFiles === null) {
		findings.push(
			finding(
				"record-metadata",
				label,
				`${label} has no \`conflicted_files:\` line — it is what ties the record to the batch range`,
			),
		)
	}
	if (record.blocks.length === 0) {
		findings.push(finding("record-metadata", label, `${label} has no \`### <path> [shape: …]\` block`))
	}

	// --- per block -----------------------------------------------------------------
	for (const block of record.blocks) {
		for (const field of BLOCK_FIELDS) {
			if (block.fields[field] === undefined || block.fields[field] === "") {
				findings.push(
					finding("block-fields", block.path, `${block.path}: missing \`${field}:\` (every block carries all fields)`),
				)
			}
		}

		const resolution = block.fields.resolution
		if (resolution !== undefined && !RESOLUTION_VALUES.includes(resolution)) {
			findings.push(
				finding(
					"resolution-value",
					`${block.path} → ${resolution}`,
					`${block.path}: \`resolution: ${resolution}\` is not one of the closed set (${RESOLUTION_VALUES.join(", ")})`,
				),
			)
		}

		const rationale = block.fields.rationale
		if (rationale !== undefined && rationale.trim().length < RATIONALE_MIN_LENGTH) {
			findings.push(
				finding(
					"rationale-length",
					`${block.path} (${rationale.trim().length} chars)`,
					`${block.path}: \`rationale:\` is ${rationale.trim().length} characters — the floor is ${RATIONALE_MIN_LENGTH}`,
				),
			)
		}

		// cited SHAs: the two intents must be attributable; `divergence:` only when
		// it promotes a row (`none` and `divergent-forever:<reason>` cite none).
		const cited = [
			{ field: "upstream", sha: firstSha(block.fields.upstream), required: true },
			{ field: "fork", sha: firstSha(block.fields.fork), required: true },
			{ field: "divergence", sha: promotedRowSha(block.fields.divergence), required: false },
		]
		for (const { field, sha, required } of cited) {
			if (block.fields[field] === undefined) continue
			if (!sha) {
				if (required) {
					findings.push(
						finding(
							"sha-cited",
							block.path,
							`${block.path}: \`${field}:\` cites no SHA — both intents must be attributable`,
						),
					)
				}
				continue
			}
			if (!probe.commitExists(sha)) {
				findings.push(
					finding(
						"sha-resolves",
						sha,
						`${block.path}: \`${field}: ${sha}\` does not resolve (\`git cat-file -e ${sha}^{commit}\`)`,
					),
				)
			}
		}

		const forkSha = firstSha(block.fields.fork)
		if (forkSha && probe.commitExists(forkSha)) {
			if (!probe.isReachableFromForkRef(forkSha, forkRef)) {
				findings.push(
					finding(
						"fork-sha-reachable",
						forkSha,
						`${block.path}: \`fork: ${forkSha}\` is not reachable from ${forkRef}`,
					),
				)
			}
			const subject = probe.commitSubject(forkSha)
			if (subject && REBRAND_SUBJECT_RE.test(subject)) {
				findings.push(
					finding(
						"fork-sha-not-rebrand",
						forkSha,
						`${block.path}: \`fork: ${forkSha}\` is a rebrand commit ("${subject}") — cite the substantive commit`,
					),
				)
			}
		}

		for (const droppedPath of parseDroppedEntries(block.fields.dropped)) {
			if (!isR5RefusedPath(droppedPath)) {
				findings.push(
					finding(
						"dropped-path-r5",
						droppedPath,
						`${block.path}: \`dropped: ${droppedPath}\` is outside R5's refused paths — a drop elsewhere is an unrecorded divergence`,
					),
				)
			}
		}
	}

	// --- the record must equal the batch range -------------------------------------
	const blockPaths = record.blocks.map((block) => block.path)
	const declared = record.conflictedFiles ?? []
	const range = new Set(rangeFiles)
	const extra = [...new Set([...declared, ...blockPaths].filter((file) => !range.has(file)))]
	for (const file of extra) {
		findings.push(
			finding(
				"record-range-extra",
				file,
				`${file} is recorded but the batch never touched it in ${base}...${head}`,
			),
		)
	}
	for (const file of rangeFiles) {
		if (!blockPaths.includes(file)) {
			findings.push(
				finding(
					"record-range-missing",
					file,
					`the batch touched ${file} in ${base}...${head} but the record has no block for it`,
				),
			)
		}
	}
	const declaredMismatch = [
		...declared.filter((file) => !blockPaths.includes(file)),
		...blockPaths.filter((file) => !declared.includes(file)),
	]
	for (const file of [...new Set(declaredMismatch)]) {
		findings.push(
			finding(
				"record-declared-mismatch",
				file,
				`${file} is in one of \`conflicted_files:\` / the block list but not the other`,
			),
		)
	}

	// --- every closed C-REIMPLEMENT row must carry a divergence --------------------
	for (const row of closedCReimplementRows(registerRows)) {
		const covered = record.blocks.some((block) => {
			const value = String(block.fields.divergence ?? "")
			if (/^none$/i.test(stripBackticks(value))) return false
			return value.toLowerCase().includes(row.sha)
		})
		if (!covered) {
			findings.push(
				finding(
					"c-reimplement-divergence",
					row.sha,
					`closed C-REIMPLEMENT row ${row.sha} (register line ${row.line}) has no block with a non-\`none\` \`divergence:\` value citing it`,
				),
			)
		}
	}

	return findings
}

/** Line numbers (1-based) carrying a live conflict marker. Pure. */
export function scanTextForConflictMarkers(text) {
	const hits = []
	String(text ?? "")
		.split("\n")
		.forEach((line, index) => {
			if (CONFLICT_MARKER_RE.test(line)) hits.push(index + 1)
		})
	return hits
}

/** Scans file contents for live conflict markers, naming `path:line`. Pure. */
export function scanFilesForConflictMarkers(files, readFile) {
	const findings = []
	for (const file of files) {
		let text
		try {
			text = readFile(file)
		} catch {
			continue // deleted/unreadable — not a marker defect
		}
		if (typeof text !== "string" || text.includes("\u0000")) continue // binary
		for (const line of scanTextForConflictMarkers(text)) {
			findings.push(finding("conflict-marker", `${file}:${line}`, `unmerged conflict marker at ${file}:${line}`))
		}
	}
	return findings
}

/** Turns `git diff --check` output into findings naming `path:line`. Pure. */
export function parseWhitespaceErrors(output, source = "git diff --check") {
	const findings = []
	for (const line of String(output ?? "").split("\n")) {
		const match = /^(.+?):(\d+): (.*)$/.exec(line)
		if (!match) continue
		findings.push(finding("whitespace", `${match[1]}:${match[2]}`, `${match[3]} (${source})`))
	}
	return findings
}

/**
 * The repo probe consumed by `validateRecord` and the integrity scan. Every
 * member is a thin wrapper over one git command, so the rules are testable with
 * a stub. `changedFiles` returns null when the range cannot be resolved — the
 * caller reports that (fail closed) instead of passing on an empty list.
 */
export function createGitProbe({ root = ROOT } = {}) {
	const capture = (args) => {
		try {
			const out = execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })
			return { code: 0, out }
		} catch (error) {
			const status = typeof error.status === "number" ? error.status : 1
			return { code: status || 1, out: `${error.stdout ?? ""}${error.stderr ?? ""}` }
		}
	}
	const lines = (out) =>
		String(out ?? "")
			.split("\n")
			.map((line) => line.trim())
			.filter(Boolean)
	const collect = (args) => {
		const result = capture(args)
		return result.code === 0 ? lines(result.out) : []
	}

	return {
		commitExists(sha) {
			return capture(["cat-file", "-e", `${sha}^{commit}`]).code === 0
		},
		commitSubject(sha) {
			const result = capture(["log", "-1", "--format=%s", sha])
			return result.code === 0 ? result.out.trim() : null
		},
		isReachableFromForkRef(sha, ref) {
			return capture(["merge-base", "--is-ancestor", sha, ref]).code === 0
		},
		changedFiles(base, head) {
			const result = capture(["diff", "--name-only", `${base}...${head}`])
			return result.code === 0 ? lines(result.out) : null
		},
		/** Committed range + working tree + untracked: everything the batch touched. */
		touchedFiles(base, head) {
			return [
				...new Set([
					...collect(["diff", "--name-only", `${base}...${head}`]),
					...collect(["diff", "--name-only"]),
					...collect(["diff", "--cached", "--name-only"]),
					...collect(["ls-files", "--others", "--exclude-standard"]),
				]),
			]
		},
		whitespaceErrors(base, head) {
			const working = capture(["diff", "--check"])
			const range = capture(["diff", "--check", `${base}...${head}`])
			return [
				...parseWhitespaceErrors(working.out, "git diff --check"),
				...parseWhitespaceErrors(range.out, `git diff --check ${base}...${head}`),
			]
		},
	}
}

function report(findings) {
	for (const item of findings) {
		logError(`${TAG}:${item.rule.toUpperCase()}`, item.message)
	}
}

function printHelp() {
	console.log(`
verify-resolutions.mjs — resolution records (H-23) + resolution integrity (H-28)

Usage:
  node scripts/verify-resolutions.mjs --batch SYNC-3 --base origin/master --head HEAD
  node scripts/verify-resolutions.mjs --integrity
  node scripts/verify-resolutions.mjs --help

Options:
  --batch SYNC-n        the batch whose record is checked (required in record mode)
  --base <sha|ref>      batch range start (default: ${DEFAULT_BASE})
  --head <sha|ref>      batch range end   (default: ${DEFAULT_HEAD})
  --fork-ref <ref>      ref the \`fork:\` SHA must be reachable from (default: ${DEFAULT_FORK_REF})
  --register <path>     register read for the C-REIMPLEMENT rows (default: ${DEFAULT_REGISTER})
  --resolutions-dir <p> directory holding \`SYNC-<n>.md\` (default: ${DEFAULT_RESOLUTIONS_DIR})
  --integrity           run the integrity scan only (markers + whitespace)
  --help, -h            this text

Record mode checks — every failure is reported BY FILE OR SHA:
  block-fields            every \`### <path> [shape: …]\` block carries all fields
  resolution-value        \`resolution:\` is in the closed set: ${RESOLUTION_VALUES.join(" · ")}
  rationale-length        \`rationale:\` clears ${RATIONALE_MIN_LENGTH} characters
  sha-cited / sha-resolves  \`upstream:\`/\`fork:\`/\`divergence:\` cite a SHA that \`git cat-file -e\` resolves
  fork-sha-reachable      \`fork:\` is reachable from --fork-ref
  fork-sha-not-rebrand    \`fork:\` is not a rebrand sweep commit (${String(REBRAND_SUBJECT_RE)})
  dropped-path-r5         every \`dropped:\` path is one of R5's refused paths
  record-range-extra      a recorded path the batch never touched in --base...--head
  record-range-missing    a file the batch touched with no block in the record
  record-declared-mismatch  \`conflicted_files:\` and the block list disagree
  c-reimplement-divergence  every closed C-REIMPLEMENT row is cited by a non-none \`divergence:\`

Integrity checks:
  conflict-marker         a live \`<<<<<<<\` / \`=======\` / \`>>>>>>>\` line in any file the batch touched
  whitespace              \`git diff --check\` whitespace errors in the batch range / working tree

R5's refused paths (the only legal \`dropped:\` targets): \`src/package.json\`,
\`CHANGELOG*\`, \`locales/*/README.md\`, \`pnpm-lock.yaml\`, \`.github/**\`, \`.coderabbit*\`.

Exit codes: 0 pass · 1 violation or missing record · 2 unusable invocation.
A batch with no record YET exits 1 with the path to create and the template to
copy — never a crash, never a silent pass.
`)
}

/** Parses argv. Returns `{ help, integrity, error }` or the resolved options. */
export function parseArgs(argv = []) {
	const options = {
		help: false,
		integrity: false,
		batch: null,
		base: null,
		head: null,
		forkRef: null,
		register: null,
		resolutionsDir: null,
		error: null,
	}
	const takesValue = new Map([
		["--batch", "batch"],
		["--base", "base"],
		["--head", "head"],
		["--fork-ref", "forkRef"],
		["--register", "register"],
		["--resolutions-dir", "resolutionsDir"],
	])
	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index]
		if (arg === "--help" || arg === "-h") {
			options.help = true
			continue
		}
		if (arg === "--integrity") {
			options.integrity = true
			continue
		}
		const key = takesValue.get(arg)
		if (key) {
			const value = argv[index + 1]
			if (value === undefined || value.startsWith("--")) {
				options.error = `${arg} needs a value — run with --help`
				return options
			}
			options[key] = value
			index += 1
			continue
		}
		options.error = `unknown argument(s): ${arg} — run with --help`
		return options
	}
	if (options.integrity && options.batch) {
		options.error = "--integrity and --batch are separate modes — pick one"
		return options
	}
	if (options.batch && !/^SYNC-[0-9]+$/.test(options.batch)) {
		options.error = `--batch expects SYNC-<n>, got "${options.batch}" — run with --help`
		return options
	}
	return options
}

/** The integrity scan: markers in every touched file + `git diff --check`. */
export function runIntegrity({ probe, base, head, root = ROOT }) {
	logStep(TAG, `Resolution integrity — unmerged markers + whitespace over ${base}...${head} and the working tree`)
	const files = probe.touchedFiles(base, head)
	const markerFindings = scanFilesForConflictMarkers(files, (file) => fs.readFileSync(path.join(root, file), "utf8"))
	const findings = [...markerFindings, ...probe.whitespaceErrors(base, head)]
	if (findings.length > 0) {
		report(findings)
		logEndGroup()
		logError(
			TAG,
			`resolution integrity FAILED — ${findings.length} finding(s) in files the batch touched. ` +
				`Resolve the marker/whitespace defect (never suppress it), then re-run.`,
		)
		return 1
	}
	logEndGroup()
	logSuccess(TAG, `no conflict markers and no whitespace errors in the ${files.length} file(s) the batch touched`)
	return 0
}

/** Record mode: validate `SYNC-<n>.md` against the range and the register. */
export function runRecord({ options, probe, base, head, root = ROOT }) {
	const batch = options.batch
	const resolutionsDir = options.resolutionsDir ?? DEFAULT_RESOLUTIONS_DIR
	const recordRel = path.join(resolutionsDir, `${batch}.md`)
	const recordPath = path.isAbsolute(recordRel) ? recordRel : path.join(root, recordRel)

	if (!fs.existsSync(recordPath)) {
		logError(TAG, `no resolution record for ${batch} at ${recordRel}`)
		logInfo(TAG, `create it from ${path.join(resolutionsDir, TEMPLATE_NAME)} (runbook R4 / TASK 3(c)):`)
		logInfo(TAG, `  cp ${path.join(resolutionsDir, TEMPLATE_NAME)} ${recordRel}`)
		logInfo(TAG, "  one `### <path> [shape: …]` block per conflicted file, then re-run:")
		logInfo(TAG, `  node scripts/verify-resolutions.mjs --batch ${batch} --base ${base} --head ${head}`)
		return 1
	}

	const rangeFiles = probe.changedFiles(base, head)
	if (rangeFiles === null) {
		logError(
			TAG,
			`cannot resolve the batch range ${base}...${head} — fix the range (R1: deepen first), then re-run; ` +
				`a record cannot be checked against a range that does not exist`,
		)
		return 1
	}

	const registerRel = options.register ?? DEFAULT_REGISTER
	const registerPath = path.isAbsolute(registerRel) ? registerRel : path.join(root, registerRel)
	const registerRows = fs.existsSync(registerPath)
		? parseRegisterBatches(fs.readFileSync(registerPath, "utf8")).get(batch) ?? []
		: []
	const record = parseResolutionRecord(fs.readFileSync(recordPath, "utf8"))
	const findings = validateRecord({
		record,
		batch,
		base,
		head,
		rangeFiles,
		registerRows,
		probe,
		forkRef: options.forkRef ?? DEFAULT_FORK_REF,
		recordPath: recordRel,
	})

	logStep(TAG, `${batch}: ${record.blocks.length} block(s) vs ${rangeFiles.length} file(s) touched in ${base}...${head}`)
	if (findings.length > 0) {
		report(findings)
		logEndGroup()
		logError(TAG, `${batch}: resolution record FAILED — ${findings.length} finding(s), each named above by file or SHA`)
		return 1
	}
	logEndGroup()
	logSuccess(TAG, `${batch}: resolution record verified — every field, SHA, drop and divergence accounted for`)
	return 0
}

export function main(argv = process.argv.slice(2), { root = ROOT } = {}) {
	const options = parseArgs(argv)
	if (options.help) {
		printHelp()
		return 0
	}
	if (options.error) {
		logError(TAG, options.error)
		return 2
	}
	const base = options.base ?? DEFAULT_BASE
	const head = options.head ?? DEFAULT_HEAD
	const probe = createGitProbe({ root })
	if (options.integrity) return runIntegrity({ probe, base, head, root })
	if (!options.batch) {
		logError(TAG, "--batch SYNC-<n> is required (or use --integrity) — run with --help")
		return 2
	}
	return runRecord({ options, probe, base, head, root })
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
	process.exit(main())
}
