#!/usr/bin/env node

/**
 * verify-semble-release-coupling.mjs
 *
 * CI diff-gate that enforces the SEMBLE_VERSION ↔ SEMBLE_SHA256 coupling rule
 * for the Semble code-index feature (release-governance item 2c of
 * docs/architecture-review-code-index-semble.md; full policy in
 * docs/SEMBLE-RELEASE-GOVERNANCE.md).
 *
 * The Semble downloader pins two constants that MUST always move together:
 *   - SEMBLE_VERSION   (src/services/code-index/semble/semble-downloader.ts)
 *   - SEMBLE_SHA256    (platform-keyed hashes pinned to SEMBLE_VERSION)
 *
 * Rule — BOTH directions fail, no exceptions:
 *   - A change to SEMBLE_VERSION must be accompanied by a change to
 *     SEMBLE_SHA256 in the SAME diff.
 *   - A change to SEMBLE_SHA256 without a SEMBLE_VERSION change is ALSO a
 *     hard failure.
 *
 * Rationale for NOT exempting the checksum-only direction (deliberate,
 * reviewed decision): under the immutable-tags rule (docs/
 * SEMBLE-RELEASE-GOVERNANCE.md §1) the ONLY legitimate way to change artifact
 * bytes is to publish a NEW tag (v0.5.2 → v0.5.3) — which necessarily means
 * bumping SEMBLE_VERSION. A checksum change without a version change therefore
 * implies an artifact was re-uploaded or "corrected in place" under an
 * existing tag — the exact stub-era anti-pattern that silently breaks cached
 * installs (the downloader fast path trusts `.semble-version` + file
 * existence, so a fixed-in-place tag is invisible to machines that already
 * downloaded the broken binary) and breaks the fork's checksum contract.
 * Because there is no legitimate same-version case, the direction is enforced
 * rather than exempted.
 *
 * Comparison semantics:
 *   - The downloader file in the working tree (HEAD) is diffed against the
 *     same file at the merge base with a base ref. Base resolution order:
 *       --base <ref>  →  SEMBLE_COUPLING_BASE env  →  GITHUB_BASE_REF
 *       (origin/<ref>)  →  origin/main  →  origin/master.
 *   - If the downloader does not exist at the base commit (file newly added),
 *     the added constants count as changed on BOTH sides → coupled → pass.
 *   - If no base commit can be resolved (fresh checkout, shallow clone, no
 *     origin refs, or not a git repo), the check SKIPs with exit 0 by default
 *     so an infra reason never blocks CI. --strict turns that into a hard
 *     failure.
 *   - HARD FAIL (exit 1) whenever the diff IS verifiable and exactly one of
 *     SEMBLE_VERSION / SEMBLE_SHA256 changed.
 *
 * Constants are extracted with the same regex-based parser as
 * scripts/verify-semble-checksums.mjs / scripts/semble-smoke.mjs — no
 * TypeScript build, no fs/https side effects.
 *
 * Usage (repo root):
 *   node scripts/verify-semble-release-coupling.mjs            # default (skip when no base ref)
 *   node scripts/verify-semble-release-coupling.mjs --base <ref>   # explicit base (e.g. the PR merge-base)
 *   node scripts/verify-semble-release-coupling.mjs --strict   # fail when no base ref is resolvable
 *   node scripts/verify-semble-release-coupling.mjs --help
 *
 * Exit codes:
 *   0  coupled / unchanged, or (default) skipped because no base ref
 *   1  coupling violated (version w/o checksum, or checksum w/o version), or
 *      --strict + no base ref
 *
 * Env overrides:
 *   SEMBLE_DOWNLOADER_PATH  path to semble-downloader.ts (default src/...)
 *   SEMBLE_COUPLING_BASE    explicit base ref (same as --base)
 */

import { execFileSync } from "node:child_process"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")

// Repo-relative path (used for `git show <commit>:<path>`); overridable
// absolute path (used for the working-tree read), e.g. by tests.
export const DOWNLOADER_REPO_PATH = "src/services/code-index/semble/semble-downloader.ts"
const DOWNLOADER_PATH = process.env.SEMBLE_DOWNLOADER_PATH
	? path.resolve(process.env.SEMBLE_DOWNLOADER_PATH)
	: path.resolve(ROOT, DOWNLOADER_REPO_PATH)

// ---------------------------------------------------------------------------
// Constant extraction (regex-based, no TS build — mirrors verify-semble-checksums)
// ---------------------------------------------------------------------------

/**
 * Extracts a single quoted string constant, e.g. `SEMBLE_VERSION = "v0.5.2"`.
 * Pure — exported for the spec.
 */
export function extractVersion(source) {
	const match = source.match(/SEMBLE_VERSION\s*=\s*"([^"]+)"/)
	if (!match) {
		throw new Error("Could not parse SEMBLE_VERSION from the downloader source")
	}
	return match[1]
}

/**
 * Returns the source text spanning an object literal, given the index just past
 * the opening `{` (already consumed by the caller). Depth starts at 1 to
 * account for the consumed opening brace, so inner entry braces do not
 * terminate the block early.
 */
function readObjectBlock(source, openBraceIndex) {
	let depth = 1
	for (let i = openBraceIndex; i < source.length; i++) {
		if (source[i] === "{") depth++
		else if (source[i] === "}") {
			depth--
			if (depth === 0) return source.slice(openBraceIndex, i)
		}
	}
	throw new Error("Unterminated object literal in the downloader source")
}

/**
 * Returns the source text of an object literal body, given a regex that matched
 * up to (but not including) the literal's opening `{`. We anchor on the LAST
 * `{` of the matched assignment `= {` so generic type parameters containing
 * braces are not mistaken for the literal's opening brace.
 */
function extractObjectBody(source, headerPattern, label) {
	const match = source.match(headerPattern)
	if (!match) {
		throw new Error(`Could not parse ${label} from the downloader source`)
	}
	const openBraceInMatch = match[0].lastIndexOf("{")
	if (openBraceInMatch === -1) {
		throw new Error(`Could not locate object literal for ${label} in the downloader source`)
	}
	return readObjectBlock(source, match.index + openBraceInMatch + 1)
}

/**
 * Extracts SEMBLE_SHA256: platform key -> lowercase hex digest. Pure — exported
 * for the spec.
 */
export function extractSha256(source) {
	const block = extractObjectBody(source, /SEMBLE_SHA256[\s\S]*?=\s*{/, "SEMBLE_SHA256")
	const hashes = {}
	const entryPattern = /"([^"]+)":\s*"([^"]+)"/g
	for (const entry of block.matchAll(entryPattern)) {
		hashes[entry[1]] = entry[2]
	}
	if (Object.keys(hashes).length === 0) {
		throw new Error("No SEMBLE_SHA256 entries parsed from the downloader source")
	}
	return hashes
}

/**
 * Extracts both coupled constants from a downloader source text.
 * Pure — exported for the spec. Throws when either constant is unparsable.
 */
export function extractConstants(source) {
	return { version: extractVersion(source), sha256: extractSha256(source) }
}

/**
 * Canonical JSON of a sha256 table with keys sorted, so an equivalent hash
 * table whose keys merely changed order compares as unchanged.
 */
function canonicalHashes(sha256) {
	if (!sha256) return null
	const out = {}
	for (const key of Object.keys(sha256).sort()) out[key] = sha256[key]
	return JSON.stringify(out)
}

/**
 * Verdict for the version↔checksum coupling. `baseConstants`/`headConstants`
 * are the extractConstants() results, or null when the downloader file is
 * absent on that side (only the base side can be null in practice). Pure —
 * exported for the spec.
 *
 * Returns:
 *   { ok: true,  status: "coupled"   }   — both changed together
 *   { ok: true,  status: "unchanged" }   — neither changed
 *   { ok: false, status: "version-without-checksum", reason }
 *   { ok: false, status: "checksum-without-version", reason }
 */
export function assessCoupling(baseConstants, headConstants) {
	const versionChanged = baseConstants?.version !== headConstants?.version
	const checksumChanged = canonicalHashes(baseConstants?.sha256) !== canonicalHashes(headConstants?.sha256)

	if (versionChanged && checksumChanged) {
		return { ok: true, status: "coupled", versionChanged, checksumChanged }
	}
	if (!versionChanged && !checksumChanged) {
		return { ok: true, status: "unchanged", versionChanged, checksumChanged }
	}
	if (versionChanged && !checksumChanged) {
		return {
			ok: false,
			status: "version-without-checksum",
			versionChanged,
			checksumChanged,
			reason:
				"SEMBLE_VERSION changed but SEMBLE_SHA256 did not — the pinned checksums still describe the OLD release artifacts, so a fresh install would verify the new tag's binary against the wrong hashes. Regenerate SEMBLE_SHA256 from the new tag's published artifacts in the SAME commit.",
		}
	}
	return {
		ok: false,
		status: "checksum-without-version",
		versionChanged,
		checksumChanged,
		reason:
			"SEMBLE_SHA256 changed but SEMBLE_VERSION did not — changing artifact bytes without a version bump implies a re-upload 'in place' under an existing tag, which violates the immutable-tags rule (cached installs keep the old binary and the checksum contract silently breaks). Publish a NEW tag and bump SEMBLE_VERSION together with SEMBLE_SHA256.",
	}
}

/**
 * Decides whether to enforce or skip the gate when no base commit is
 * available. Pure — exported for the spec.
 *
 *   - base commit available → run (and fail hard if the coupling is violated).
 *   - otherwise (default)   → skip (exit 0); with --strict → fail (exit 1).
 */
export function decideRunMode({ baseResolved, strict }) {
	if (baseResolved) return { run: true, fail: false }
	return { run: false, fail: Boolean(strict) }
}

// ---------------------------------------------------------------------------
// Git helpers
// ---------------------------------------------------------------------------

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

function gitAvailable() {
	try {
		git(["rev-parse", "--is-inside-work-tree"])
		return true
	} catch {
		return false
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

/**
 * Resolves a base ref: explicit --base, then SEMBLE_COUPLING_BASE, then
 * GITHUB_BASE_REF (GitHub PR target branch) → origin/<ref>, then the fork's
 * default branches (origin/main, origin/master). Returns { ref, source } or
 * null when no candidate exists.
 */
export function resolveBaseRef({ explicitBase, env }) {
	if (explicitBase) return { ref: explicitBase, source: "--base" }
	const envBase = env?.SEMBLE_COUPLING_BASE
	if (envBase) return { ref: envBase, source: "SEMBLE_COUPLING_BASE" }
	const candidates = []
	if (env?.GITHUB_BASE_REF) {
		candidates.push(`refs/remotes/origin/${env.GITHUB_BASE_REF}`, `origin/${env.GITHUB_BASE_REF}`)
	}
	candidates.push("refs/remotes/origin/main", "origin/main", "refs/remotes/origin/master", "origin/master")
	for (const ref of candidates) {
		if (refExists(ref)) return { ref, source: "auto" }
	}
	return null
}

/**
 * The merge base between HEAD and `ref` — the commit the current diff diverged
 * from (the correct "before this PR" snapshot even when the base ref has since
 * advanced). Returns null when no merge base exists (unrelated histories).
 */
function baseCommitFor(ref) {
	try {
		return git(["merge-base", "HEAD", ref]).trim()
	} catch {
		return null
	}
}

/**
 * Content of a repo-relative file at a commit, or null when the file does not
 * exist there.
 */
function fileContentAt(commit, repoPath) {
	try {
		return git(["show", `${commit}:${repoPath}`])
	} catch {
		return null
	}
}

function printHelp() {
	console.log(`
verify-semble-release-coupling.mjs

Enforces the SEMBLE_VERSION ↔ SEMBLE_SHA256 coupling rule for the Semble
code-index downloader: a diff that changes SEMBLE_VERSION without
SEMBLE_SHA256 (or vice versa) in
src/services/code-index/semble/semble-downloader.ts is rejected. Both
directions fail — there is no legitimate same-version checksum change under
the immutable-tags rule (docs/SEMBLE-RELEASE-GOVERNANCE.md §1). Compares the
working tree against the merge base with a base ref (--base, or
SEMBLE_COUPLING_BASE, or GITHUB_BASE_REF → origin/<ref>, or origin/main,
origin/master). SKIPs (exit 0) when no base commit is resolvable so an infra
reason never blocks CI; HARD FAILS (exit 1) whenever the diff is verifiable
and the coupling is violated.

Usage:
  node scripts/verify-semble-release-coupling.mjs [options]

Options:
  --base <ref>  Compare against this base ref (e.g. the PR merge-base).
  --strict      Exit 1 if no base commit can be resolved. Without --strict,
                that condition SKIPs with exit 0.
  --help        Show this help message

Env:
  SEMBLE_DOWNLOADER_PATH  path to semble-downloader.ts (default src/...)
  SEMBLE_COUPLING_BASE    explicit base ref (same as --base)
`)
}

async function main() {
	const args = process.argv.slice(2)
	const isStrict = args.includes("--strict")
	const isHelp = args.includes("--help") || args.includes("-h")
	const baseIdx = args.indexOf("--base")
	const explicitBase = baseIdx !== -1 ? args[baseIdx + 1] : undefined

	if (isHelp) {
		printHelp()
		process.exit(0)
	}

	console.log("🔗 Verifying SEMBLE_VERSION ↔ SEMBLE_SHA256 coupling in the Semble downloader...")

	// 1. Resolve the base commit: explicit/base ref → merge base with HEAD.
	let baseCommit = null
	let baseDetail = "no base ref found (try --base <ref>, SEMBLE_COUPLING_BASE, or origin/main|origin/master)"
	if (explicitBase || gitAvailable()) {
		const base = resolveBaseRef({ explicitBase, env: process.env })
		if (base) {
			baseCommit = baseCommitFor(base.ref)
			baseDetail = `resolved ${base.source} ref ${base.ref}${baseCommit ? ` (merge base ${baseCommit.slice(0, 12)})` : " but could not compute a merge base with HEAD"}`
		}
	} else {
		baseDetail = "not inside a git work tree"
	}

	if (baseCommit === null) {
		const decision = decideRunMode({ baseResolved: false, strict: isStrict })
		if (decision.fail) {
			console.error(`✖ No base commit is available and --strict is set — refusing to skip the coupling gate.`)
			console.error(`   ${baseDetail}`)
			process.exit(1)
		}
		console.warn(`⚠ No base commit to diff against (${baseDetail}).`)
		console.warn("   Skipping the coupling check — CI is NOT blocked for an infra reason.")
		console.warn("   Re-run with --base <ref> (e.g. the PR merge-base) to enforce.")
		process.exit(0)
	}

	// 2. Read both sides of the downloader.
	let headSource
	try {
		headSource = await readFile(DOWNLOADER_PATH, "utf-8")
	} catch (error) {
		console.error(`✖ Cannot read ${DOWNLOADER_PATH}: ${error.message}`)
		process.exit(1)
	}
	const baseSource = fileContentAt(baseCommit, DOWNLOADER_REPO_PATH)

	let headConstants
	let baseConstants
	try {
		headConstants = extractConstants(headSource)
	} catch (error) {
		console.error(`✖ Cannot parse SEMBLE constants at HEAD: ${error.message}`)
		process.exit(1)
	}
	if (baseSource === null) {
		baseConstants = null
		console.log(`   ${DOWNLOADER_REPO_PATH} is newly added in this diff (absent at base ${baseCommit.slice(0, 12)}) — added constants count as coupled.`)
	} else {
		try {
			baseConstants = extractConstants(baseSource)
		} catch (error) {
			console.error(`✖ Cannot parse SEMBLE constants at base ${baseCommit.slice(0, 12)}: ${error.message}`)
			process.exit(1)
		}
	}

	// 3. Assess the coupling.
	const verdict = assessCoupling(baseConstants, headConstants)
	const baseVersion = baseConstants?.version ?? "<absent>"
	const baseHashes = baseConstants ? `${Object.keys(baseConstants.sha256).length} hash(es)` : "<absent>"
	console.log(`   SEMBLE_VERSION : ${baseVersion} -> ${headConstants.version}`)
	console.log(`   SEMBLE_SHA256  : ${baseHashes} -> ${Object.keys(headConstants.sha256).length} hash(es)`)

	if (verdict.ok) {
		const note = verdict.status === "coupled" ? "version and checksums moved together" : "no SEMBLE version/checksum change in this diff"
		console.log(`\n✅ Semble release coupling OK — ${note}.`)
		process.exit(0)
	}

	console.error(`\n✖ Semble release coupling VIOLATED (${verdict.status}):`)
	console.error(`   ${verdict.reason}`)
	console.error("\n   Release procedure (docs/SEMBLE-RELEASE-GOVERNANCE.md §2):")
	console.error("     1. Publish fixed assets to Audare-est-Facere/sembleexec under a NEW tag.")
	console.error("     2. Regenerate SEMBLE_SHA256 from the published artifacts (`shasum -a 256 <archive>`).")
	console.error("     3. Bump SEMBLE_VERSION and SEMBLE_SHA256 in the SAME commit in semble-downloader.ts.")
	process.exit(1)
}

// Only run when executed directly (not when imported by the spec).
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
	main().catch((error) => {
		console.error(`✖ Unexpected error: ${error instanceof Error ? error.message : String(error)}`)
		process.exit(1)
	})
}
