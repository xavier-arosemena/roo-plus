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
 *   - deterministic failure cases against a self-contained temp fixture.
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
	IPV4_RE,
	findOffendingIpv4,
	isAllowedIpv4,
	scanDirectory,
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
// Real repo state — the gate must pass on the committed docs/
// ---------------------------------------------------------------------------

test("the committed docs/ tree contains no non-localhost IPv4 literals", () => {
	const findings = scanDirectory(path.join(ROOT, "docs"))
	assert.deepEqual(
		findings,
		[],
		`offending literals: ${findings.map((f) => `${f.file}:${f.line} ${f.ip}`).join(", ")}`,
	)
})
