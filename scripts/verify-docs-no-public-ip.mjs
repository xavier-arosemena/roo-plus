#!/usr/bin/env node
/**
 * verify-docs-no-public-ip.mjs
 *
 * CI guard for the disclosed-infrastructure privacy leak (DEBT.md item G).
 *
 * Fails when a NON-localhost / NON-unspecified IPv4 literal appears anywhere
 * under docs/. This repository is PUBLIC, so a committed routable address is an
 * infrastructure-disclosure leak; this gate makes that class impossible to
 * reintroduce silently.
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

/** Recursively lists files under `dir` (absolute path). */
export function listFilesRecursive(dir) {
	const out = []
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const abs = path.join(dir, entry.name)
		if (entry.isDirectory()) out.push(...listFilesRecursive(abs))
		else if (entry.isFile()) out.push(abs)
	}
	return out
}

/**
 * Scans a directory tree for offending IPv4 literals. Binary files are skipped
 * with a cheap NUL-byte probe.
 * @param {string} root
 */
export function scanDirectory(root) {
	const findings = []
	for (const abs of listFilesRecursive(root)) {
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

function parseArgs(argv) {
	let root = path.join(REPO_ROOT, DOCS_DIR)
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
		return 0
	}
	if (!fs.existsSync(args.root)) {
		console.error(`::error::docs IPv4 guard: scan root does not exist: ${args.root}`)
		return 2
	}
	const rel = path.relative(REPO_ROOT, args.root) || args.root
	const findings = scanDirectory(args.root)
	if (findings.length === 0) {
		if (!args.quiet) console.log(`docs IPv4 guard: clean — no non-localhost IPv4 literals under ${rel}`)
		return 0
	}
	for (const f of findings) {
		console.error(
			`::error file=${f.file},line=${f.line},col=${f.column}::Non-localhost IPv4 literal "${f.ip}" in public docs — redact it (DEBT.md item G). Context: ${f.text}`,
		)
	}
	console.error(`::error::docs IPv4 guard: ${findings.length} offending IPv4 literal(s) found under ${rel}`)
	return 1
}

const invokedDirectly =
	process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
if (invokedDirectly) {
	process.exit(main())
}
