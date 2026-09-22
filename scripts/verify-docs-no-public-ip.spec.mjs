/**
 * verify-docs-no-public-ip.spec.mjs
 *
 * Tests for scripts/verify-docs-no-public-ip.mjs — the CI guard for the
 * disclosed-infrastructure privacy leak (DEBT.md item G).
 *
 * Covers:
 *   - the allow-list (loopback / unspecified / RFC 5737 documentation ranges),
 *   - that routable AND private addresses are flagged,
 *   - line/column reporting and that allow-listed literals are ignored,
 *   - that version strings and hash fragments are not false positives,
 *   - a real pass run against the CURRENT repo `docs/` tree (must be clean),
 *   - deterministic failure cases against a self-contained temp fixture,
 *   - the repo-wide `*.md` sweep (`scanRepoMarkdown`): a leak OUTSIDE docs/ is
 *     flagged, allow-listed values and generated/vendored trees are not.
 *
 * NOTE: flagged-address fixtures deliberately use generic, well-known routable
 * examples (Google DNS `8.8.8.8`, RFC 2544 benchmarking `198.18.0.1`) — never
 * the real disclosed address, which must not be reintroduced into the tree.
 *
 * Run with: node --test scripts/verify-docs-no-public-ip.spec.mjs
 * (scripts/ has no vitest runner, so Node 22's built-in node:test is used —
 * same pattern as scripts/verify-locale-readmes.spec.mjs.)
 */
import { test } from "node:test"
import assert from "node:assert/strict"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

import {
	ALLOWED_RANGES,
	EXCLUDED_DIRS,
	IPV4_RE,
	findOffendingIpv4,
	isAllowedIpv4,
	scanDirectory,
	scanRepoMarkdown,
} from "./verify-docs-no-public-ip.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")

/** A generic routable address used as a flagged example throughout this spec. */
const FLAGGED_EXAMPLE = "198.18.0.1"

/** Runs `fn(docsRoot)` against a fresh temp `<tmp>/docs` tree, always cleaned up. */
async function withDocsFixture(files, fn) {
	const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "verify-docs-no-public-ip-"))
	const docs = path.join(tmp, "docs")
	try {
		for (const [rel, content] of Object.entries(files)) {
			const abs = path.join(docs, rel)
			await fs.promises.mkdir(path.dirname(abs), { recursive: true })
			await fs.promises.writeFile(abs, content, "utf-8")
		}
		await fn(docs)
	} finally {
		await fs.promises.rm(tmp, { recursive: true, force: true })
	}
}

/** Runs `fn(tmpRoot)` against a fresh temp repo root, always cleaned up. */
async function withRepoFixture(files, fn) {
	const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "verify-repo-markdown-"))
	try {
		for (const [rel, content] of Object.entries(files)) {
			const abs = path.join(tmp, rel)
			await fs.promises.mkdir(path.dirname(abs), { recursive: true })
			await fs.promises.writeFile(abs, content, "utf-8")
		}
		await fn(tmp)
	} finally {
		await fs.promises.rm(tmp, { recursive: true, force: true })
	}
}

// ---------------------------------------------------------------------------
// Allow-list
// ---------------------------------------------------------------------------

test("allow-list names each permitted range explicitly", () => {
	assert.deepEqual(
		ALLOWED_RANGES.map((r) => r.cidr),
		["127.0.0.0/8", "0.0.0.0/32", "192.0.2.0/24", "198.51.100.0/24", "203.0.113.0/24"],
	)
})

test("isAllowedIpv4 permits loopback, unspecified, and RFC 5737 documentation ranges", () => {
	for (const ip of ["127.0.0.1", "127.1.2.3", "0.0.0.0", "192.0.2.1", "198.51.100.7", "203.0.113.255"]) {
		assert.equal(isAllowedIpv4(ip), true, `expected ${ip} to be allowed`)
	}
})

test("isAllowedIpv4 flags routable and private addresses", () => {
	for (const ip of [FLAGGED_EXAMPLE, "8.8.8.8", "10.0.0.1", "192.168.1.10", "172.16.5.5", "169.254.1.1"]) {
		assert.equal(isAllowedIpv4(ip), false, `expected ${ip} to be flagged`)
	}
})

test("isAllowedIpv4 rejects malformed input", () => {
	for (const bad of ["1.2.3", "1.2.3.4.5", "256.1.1.1", "1.2.3.x", ""]) {
		assert.equal(isAllowedIpv4(bad), false, `expected ${bad} to be rejected`)
	}
})

// ---------------------------------------------------------------------------
// findOffendingIpv4
// ---------------------------------------------------------------------------

test("findOffendingIpv4 reports line/column and skips allow-listed literals", () => {
	const content = ["# heading", "localhost is 127.0.0.1 and bind is 0.0.0.0", `leak = ${FLAGGED_EXAMPLE} here`].join(
		"\n",
	)
	const findings = findOffendingIpv4(content)
	assert.equal(findings.length, 1)
	assert.equal(findings[0].ip, FLAGGED_EXAMPLE)
	assert.equal(findings[0].line, 3)
	assert.equal(findings[0].column, content.split("\n")[2].indexOf(FLAGGED_EXAMPLE) + 1)
})

test("findOffendingIpv4 does not match version strings, hashes, or longer dotted runs", () => {
	const content = [
		"node 22.22.2 · git 2.53.0 · Linux 6.8.0-107-generic",
		"commit 676a71a0b9132b211352b2c78b9b19a58bada36e",
		"not an ip: 1.2.3.4.5",
	].join("\n")
	assert.deepEqual(findOffendingIpv4(content), [])
})

test("IPV4_RE is reusable but stateless across calls", () => {
	assert.equal([...[FLAGGED_EXAMPLE].join("").matchAll(IPV4_RE)].length, 1)
	assert.equal([...[FLAGGED_EXAMPLE].join("").matchAll(IPV4_RE)].length, 1)
})

// ---------------------------------------------------------------------------
// scanDirectory
// ---------------------------------------------------------------------------

test("scanDirectory finds a public IP inside a fixture docs/ tree", async () => {
	await withDocsFixture({ "incidents/x.md": "host 203.0.113.9 is fine\nbut 198.18.0.2 is not\n" }, (docs) => {
		const findings = scanDirectory(docs)
		assert.equal(findings.length, 1)
		assert.equal(findings[0].ip, "198.18.0.2")
		assert.equal(findings[0].line, 2)
		assert.ok(findings[0].file.endsWith("incidents/x.md"))
	})
})

test("scanDirectory reports nothing for an allow-listed-only fixture", async () => {
	await withDocsFixture({ "a.md": "127.0.0.1 / 0.0.0.0 / 192.0.2.4 / 198.51.100.9 / 203.0.113.1\n" }, (docs) => {
		assert.deepEqual(scanDirectory(docs), [])
	})
})

// ---------------------------------------------------------------------------
// scanRepoMarkdown — the repo-wide *.md sweep (docs/ AND everywhere else)
// ---------------------------------------------------------------------------

test("EXCLUDED_DIRS prunes exactly the documented generated/vendored trees", () => {
	assert.deepEqual([...EXCLUDED_DIRS].sort(), [
		".git",
		".turbo",
		".vinxi",
		"build",
		"coverage",
		"dist",
		"node_modules",
		"out",
	])
})

test("scanRepoMarkdown flags a public IP in a *.md OUTSIDE docs/", async () => {
	const line = "upstream DNS is 8.8.4.4"
	await withRepoFixture({ "README.md": `${line}\n` }, (root) => {
		const findings = scanRepoMarkdown(root)
		assert.equal(findings.length, 1)
		assert.equal(findings[0].ip, "8.8.4.4")
		assert.equal(findings[0].line, 1)
		assert.equal(findings[0].column, line.indexOf("8.8.4.4") + 1)
		assert.ok(findings[0].file.endsWith("README.md"), `unexpected file: ${findings[0].file}`)
	})
})

test("scanRepoMarkdown ignores allow-listed literals outside docs/", async () => {
	await withRepoFixture(
		{ "custom-modes/README.md": "127.0.0.1 / 0.0.0.0 / 192.0.2.7 / 198.51.100.8 / 203.0.113.9\n" },
		(root) => {
			assert.deepEqual(scanRepoMarkdown(root), [])
		},
	)
})

test("scanRepoMarkdown reads only *.md and prunes generated/vendored directories", async () => {
	await withRepoFixture(
		{
			"src/notes.txt": "leak 198.18.0.1 in a non-Markdown file\n",
			"docs/runbook.md": "leak 198.18.0.5 in docs Markdown\n",
			"node_modules/dep/README.md": "leak 198.18.0.2 in vendored Markdown\n",
			"dist/built.md": "leak 198.18.0.3 in build output\n",
			".turbo/cache.md": "leak 198.18.0.4 in a tool cache\n",
			"coverage/report.md": "leak 198.18.0.6 in a coverage report\n",
			"custom-modes/readme.md": "leak 8.8.4.4 in hand-written Markdown\n",
			"guides/guide.MD": "leak 8.8.4.5 in upper-case Markdown\n",
		},
		(root) => {
			assert.deepEqual(
				scanRepoMarkdown(root)
					.map((f) => f.ip)
					.sort(),
				["198.18.0.5", "8.8.4.4", "8.8.4.5"],
			)
		},
	)
})

// ---------------------------------------------------------------------------
// Real repo state — the gate must pass on the committed docs/ and Markdown
// ---------------------------------------------------------------------------

test("the committed docs/ tree contains no non-localhost IPv4 literals", () => {
	const findings = scanDirectory(path.join(ROOT, "docs"))
	assert.deepEqual(
		findings,
		[],
		`offending literals: ${findings.map((f) => `${f.file}:${f.line} ${f.ip}`).join(", ")}`,
	)
})

test("the committed repo Markdown contains no non-allow-listed IPv4 literals", () => {
	const findings = scanRepoMarkdown(ROOT)
	assert.deepEqual(
		findings,
		[],
		`offending literals: ${findings.map((f) => `${f.file}:${f.line} ${f.ip}`).join(", ")}`,
	)
})
