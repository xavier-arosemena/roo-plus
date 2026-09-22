#!/usr/bin/env node
/**
 * verify-docs-no-public-ip.mjs
 *
 * CI guard for the disclosed-infrastructure privacy leak (DEBT.md item G).
 *
 * Fails when a NON-localhost / NON-unspecified IPv4 literal appears anywhere in
 * the text this PUBLIC repository publishes to readers:
 *
 *   1. every file under docs/  (recursive, all file types), and
 *   2. every *.md file under the repository root, wherever it lives
 *      (root and package READMEs, custom-modes/, plans/, …).
 *
 * The Markdown sweep is the post-incident widening: prose committed outside
 * docs/ is exactly as world-readable as prose inside it, so it leaks the same
 * way. Generated/vendored trees (node_modules, .git, dist, out, build, .turbo,
 * .vinxi, coverage) are pruned from that sweep. The rest of the working tree is
 * deliberately NOT scanned: test fixtures and tool configs legitimately hold
 * RFC 1918 addresses and 4-octet version strings.
 *
 * Allow-list (explicit and deliberately small):
 *   127.0.0.0/8      loopback ("localhost")                 e.g. 127.0.0.1
 *   0.0.0.0/32       unspecified / wildcard bind             e.g. 0.0.0.0
 *   192.0.2.0/24     RFC 5737 TEST-NET-1 (documentation-only)
 *   198.51.100.0/24  RFC 5737 TEST-NET-2 (documentation-only)
 *   203.0.113.0/24   RFC 5737 TEST-NET-3 (documentation-only)
 *
 * Everything else — including RFC 1918 private space — is FLAGGED. Private
 * space is not itself a disclosure risk, but the gate errs toward strictness:
 * there is no legitimate reason to commit any address literal into public docs.
 * If a real synthetic example is ever needed, add its range to ALLOWED_RANGES
 * below with an explanatory comment (that is the only sanctioned way to widen
 * the allow-list).
 *
 * Usage:  node scripts/verify-docs-no-public-ip.mjs [--root <dir>] [--quiet]
 *         --root <dir>  root to guard (default: the repository root). When
 *                       <dir>/docs is a directory that whole tree is scanned in
 *                       full; otherwise <dir> itself is scanned in full.
 * Exit:   0 = clean, 1 = offending literal(s) found, 2 = usage / IO error.
 * GitHub: emits ::error file=…,line=…,col=…:: annotations (mirrors the
 *         invisible-Unicode gate in .github/workflows/code-qa.yml).
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, "..")
const DOCS_DIR = "docs"

/**
 * Directory names pruned while walking for the repo-wide Markdown sweep: build
 * output, vendored dependencies, and VCS internals. None of these hold
 * hand-written prose, so a hit there is not something a PR should fail over.
 */
export const EXCLUDED_DIRS = new Set(["node_modules", ".git", "dist", "out", "build", ".turbo", ".vinxi", "coverage"])

/** Extensions treated as repository Markdown by the repo-wide sweep. */
export const MARKDOWN_EXTENSIONS = new Set([".md"])

/** True when `file` (a path) carries a Markdown extension, case-insensitively. */
export function isMarkdownFile(file) {
	return MARKDOWN_EXTENSIONS.has(path.extname(file).toLowerCase())
}

/**
 * IPv4 dotted-quad. The surrounding look-around avoids matching inside a longer
 * dotted run (e.g. "1.2.3.4.5") or a digit/hash fragment.
 */
export const IPV4_RE = /(?<![\d.])(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?![\d.])/g

/**
 * @typedef {{ cidr: string; label: string; test: (octets: number[]) => boolean }} AllowedRange
 */

/** @type {AllowedRange[]} */
export const ALLOWED_RANGES = [
	{ cidr: "127.0.0.0/8", label: "loopback (localhost)", test: (o) => o[0] === 127 },
	{ cidr: "0.0.0.0/32", label: "unspecified / wildcard bind", test: (o) => o.every((n) => n === 0) },
	{
		cidr: "192.0.2.0/24",
		label: "RFC 5737 TEST-NET-1 (documentation)",
		test: (o) => o[0] === 192 && o[1] === 0 && o[2] === 2,
	},
	{
		cidr: "198.51.100.0/24",
		label: "RFC 5737 TEST-NET-2 (documentation)",
		test: (o) => o[0] === 198 && o[1] === 51 && o[2] === 100,
	},
	{
		cidr: "203.0.113.0/24",
		label: "RFC 5737 TEST-NET-3 (documentation)",
		test: (o) => o[0] === 203 && o[1] === 0 && o[2] === 113,
	},
]

/**
 * True when a dotted-quad string is on the allow-list.
 * Malformed input (not four 0–255 octets) is treated as NOT allowed.
 * @param {string} dotted
 */
export function isAllowedIpv4(dotted) {
	const parts = dotted.split(".").map(Number)
	if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false
	return ALLOWED_RANGES.some((r) => r.test(parts))
}

/**
 * Finds every non-allow-listed IPv4 literal in `content`.
 * @param {string} content
 * @returns {{ line: number; column: number; ip: string; text: string }[]}
 */
export function findOffendingIpv4(content) {
	const out = []
	const lines = content.split(/\r?\n/)
	for (let i = 0; i < lines.length; i++) {
		for (const m of lines[i].matchAll(IPV4_RE)) {
			const ip = m[0]
			if (isAllowedIpv4(ip)) continue
			out.push({ line: i + 1, column: m.index + 1, ip, text: lines[i].trim() })
		}
	}
	return out
}

/**
 * Recursively lists files under `dir` (absolute path).
 *
 * With no options this is the historical, unfiltered walk. `options.excludeDirs`
 * prunes directory names by basename. Symlinked entries are neither followed nor
 * returned (they are neither `isDirectory()` nor `isFile()` under `withFileTypes`),
 * so the walk cannot escape `dir` or loop.
 *
 * @param {string} dir
 * @param {{ excludeDirs?: Iterable<string> }} [options]
 */
export function listFilesRecursive(dir, { excludeDirs } = {}) {
	const pruned = excludeDirs ? new Set(excludeDirs) : null
	const out = []
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		if (pruned && entry.isDirectory() && pruned.has(entry.name)) continue
		const abs = path.join(dir, entry.name)
		if (entry.isDirectory()) out.push(...listFilesRecursive(abs, { excludeDirs }))
		else if (entry.isFile()) out.push(abs)
	}
	return out
}

/**
 * Core traversal + scan. Binary files are skipped with a cheap NUL-byte probe.
 * `options.accept` filters candidates by absolute path; `options.excludeDirs`
 * prunes directory names during the walk.
 *
 * @param {string} root
 * @param {{ accept?: (absPath: string) => boolean; excludeDirs?: Iterable<string> }} [options]
 */
function scanFiles(root, { accept, excludeDirs } = {}) {
	const findings = []
	for (const abs of listFilesRecursive(root, { excludeDirs })) {
		if (accept && !accept(abs)) continue
		let buf
		try {
			buf = fs.readFileSync(abs)
		} catch {
			continue
		}
		if (buf.includes(0)) continue
		const content = buf.toString("utf8")
		for (const f of findOffendingIpv4(content)) {
			findings.push({ ...f, file: path.relative(REPO_ROOT, abs) })
		}
	}
	return findings
}

/**
 * Scans a directory tree for offending IPv4 literals across every file type.
 * Callers may narrow the sweep via `options` (an `accept` predicate and/or
 * `excludeDirs`); with no options the behaviour is unchanged from the original
 * guard — the whole tree is read and nothing is pruned.
 *
 * @param {string} root
 * @param {{ accept?: (absPath: string) => boolean; excludeDirs?: Iterable<string> }} [options]
 */
export function scanDirectory(root, options) {
	return scanFiles(root, options)
}

/**
 * Repo-wide Markdown half of the guard: scans every `*.md` file under `root`
 * (recursive), pruning `EXCLUDED_DIRS`. A README committed anywhere in a public
 * repository is published, so an address literal in it discloses infrastructure
 * exactly like one in docs/ does.
 *
 * @param {string} root
 * @returns {{ line: number; column: number; ip: string; text: string; file: string }[]}
 */
export function scanRepoMarkdown(root) {
	return scanFiles(root, { accept: isMarkdownFile, excludeDirs: EXCLUDED_DIRS })
}

/** True when `p` exists and is a directory. */
function isDirectory(p) {
	try {
		return fs.statSync(p).isDirectory()
	} catch {
		return false
	}
}

/**
 * Resolves the two sweep targets for a given `--root` value:
 *   - `docsRoot`     the documentation tree, scanned in FULL (all file types);
 *   - `markdownRoot` the root whose `*.md` files are swept repo-wide.
 *
 * `docsRoot` is `<root>/docs` when that is a directory, and `<root>` itself
 * otherwise — so a pre-widening `--root <dir>` invocation still scans exactly
 * the tree it used to (plus that tree's Markdown, which is a subset).
 */
function resolveScanTargets(root) {
	const docs = path.join(root, DOCS_DIR)
	return { docsRoot: isDirectory(docs) ? docs : root, markdownRoot: root }
}

/** De-duplicates findings; docs/ Markdown is covered by both sweeps. */
function dedupeFindings(findings) {
	const seen = new Set()
	return findings.filter((f) => {
		const key = `${f.file}:${f.line}:${f.column}:${f.ip}`
		if (seen.has(key)) return false
		seen.add(key)
		return true
	})
}

function parseArgs(argv) {
	let root = REPO_ROOT
	let quiet = false
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === "--root") root = path.resolve(argv[++i])
		else if (argv[i] === "--quiet") quiet = true
		else if (argv[i] === "--help" || argv[i] === "-h") return { help: true }
	}
	return { root, quiet }
}

function main() {
	const args = parseArgs(process.argv.slice(2))
	if (args.help) {
		console.log("usage: node scripts/verify-docs-no-public-ip.mjs [--root <dir>] [--quiet]")
		console.log("  scans all files under <root>/docs (or <root> when it has no docs/ child)")
		console.log("  plus every *.md file under <root>, pruning node_modules, .git, dist, out,")
		console.log("  build, .turbo, .vinxi, and coverage")
		return 0
	}
	if (!fs.existsSync(args.root)) {
		console.error(`::error::docs IPv4 guard: scan root does not exist: ${args.root}`)
		return 2
	}
	const { docsRoot, markdownRoot } = resolveScanTargets(args.root)
	const docsRel = path.relative(REPO_ROOT, docsRoot) || docsRoot
	const markdownRel = path.relative(REPO_ROOT, markdownRoot) || markdownRoot
	const scope =
		docsRoot === markdownRoot
			? `all files under ${docsRel}`
			: `all files under ${docsRel} and *.md files under ${markdownRel}`
	const findings = dedupeFindings([...scanDirectory(docsRoot), ...scanRepoMarkdown(markdownRoot)])
	if (findings.length === 0) {
		if (!args.quiet) console.log(`docs IPv4 guard: clean — no non-allow-listed IPv4 literals in ${scope}`)
		return 0
	}
	for (const f of findings) {
		console.error(
			`::error file=${f.file},line=${f.line},col=${f.column}::Non-localhost IPv4 literal "${f.ip}" in public docs/Markdown — redact it (DEBT.md item G). Context: ${f.text}`,
		)
	}
	console.error(`::error::docs IPv4 guard: ${findings.length} offending IPv4 literal(s) found in ${scope}`)
	return 1
}

const invokedDirectly =
	process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
if (invokedDirectly) {
	process.exit(main())
}
