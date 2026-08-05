/**
 * verify-semble-release-coupling.spec.mjs
 *
 * Unit tests for the pure coupling logic in
 * scripts/verify-semble-release-coupling.mjs (the SEMBLE_VERSION ↔
 * SEMBLE_SHA256 release-governance diff-gate).
 *
 * Run with: node --test scripts/verify-semble-release-coupling.spec.mjs
 * (scripts/ has no vitest runner, so node:test built into Node 22 is used —
 * same as scripts/verify-upstream-code-index-alignment.spec.mjs.)
 */

import { describe, it } from "node:test"
import assert from "node:assert/strict"

import {
	assessCoupling,
	decideRunMode,
	extractConstants,
	extractSha256,
	extractVersion,
} from "./verify-semble-release-coupling.mjs"

// Minimal but realistic downloader snippets. The v0.5.2 source pins the
// version and four platform hashes; the v0.5.3 variants bump the version, the
// hashes, or both.
const V0_5_2 = `export const SEMBLE_VERSION = "v0.5.2"
export const SEMBLE_SHA256: Record<string, string> = {
	"linux-x64": "aaaa",
	"linux-arm64": "bbbb",
	"darwin-arm64": "cccc",
	"win32-x64": "dddd",
}
`

const V0_5_3 = V0_5_2.replace('"v0.5.2"', '"v0.5.3"')
const V0_5_3_NEW_HASHES = V0_5_2.replace('"v0.5.2"', '"v0.5.3"').replace('"aaaa"', '"eeee"')
const V0_5_2_NEW_HASHES = V0_5_2.replace('"aaaa"', '"eeee"')
const V0_5_2_REORDERED_KEYS = `export const SEMBLE_VERSION = "v0.5.2"
export const SEMBLE_SHA256: Record<string, string> = {
	"win32-x64": "dddd",
	"darwin-arm64": "cccc",
	"linux-arm64": "bbbb",
	"linux-x64": "aaaa",
}
`

describe("extractVersion", () => {
	it("parses the pinned version constant", () => {
		assert.equal(extractVersion(V0_5_2), "v0.5.2")
	})

	it("throws when SEMBLE_VERSION is missing", () => {
		assert.throws(() => extractVersion("export const OTHER = 1\n"), /SEMBLE_VERSION/)
	})
})

describe("extractSha256", () => {
	it("parses every platform hash", () => {
		const hashes = extractSha256(V0_5_2)
		assert.deepEqual(hashes, {
			"linux-x64": "aaaa",
			"linux-arm64": "bbbb",
			"darwin-arm64": "cccc",
			"win32-x64": "dddd",
		})
	})

	it("throws when the hash table is empty or missing", () => {
		assert.throws(() => extractSha256('export const SEMBLE_SHA256: Record<string, string> = {}\n'), /SEMBLE_SHA256/)
	})
})

describe("assessCoupling — version bump + checksum bump", () => {
	it("passes when version and hashes change together", () => {
		const verdict = assessCoupling(extractConstants(V0_5_2), extractConstants(V0_5_3_NEW_HASHES))
		assert.equal(verdict.ok, true)
		assert.equal(verdict.status, "coupled")
	})
})

describe("assessCoupling — version bump without checksum change", () => {
	it("fails when SEMBLE_VERSION changes but SEMBLE_SHA256 does not", () => {
		const verdict = assessCoupling(extractConstants(V0_5_2), extractConstants(V0_5_3))
		assert.equal(verdict.ok, false)
		assert.equal(verdict.status, "version-without-checksum")
		assert.match(verdict.reason, /SEMBLE_SHA256/)
	})
})

describe("assessCoupling — checksum change without version change", () => {
	it("fails when SEMBLE_SHA256 changes but SEMBLE_VERSION does not", () => {
		const verdict = assessCoupling(extractConstants(V0_5_2), extractConstants(V0_5_2_NEW_HASHES))
		assert.equal(verdict.ok, false)
		assert.equal(verdict.status, "checksum-without-version")
		assert.match(verdict.reason, /immutable-tags|re-upload/i)
	})
})

describe("assessCoupling — no change", () => {
	it("passes when neither constant changed", () => {
		const verdict = assessCoupling(extractConstants(V0_5_2), extractConstants(V0_5_2))
		assert.equal(verdict.ok, true)
		assert.equal(verdict.status, "unchanged")
	})

	it("passes when the hash table only reordered its keys", () => {
		const verdict = assessCoupling(extractConstants(V0_5_2), extractConstants(V0_5_2_REORDERED_KEYS))
		assert.equal(verdict.ok, true)
		assert.equal(verdict.status, "unchanged")
	})
})

describe("assessCoupling — file newly added", () => {
	it("passes when the downloader is absent at the base (added constants count as coupled)", () => {
		const verdict = assessCoupling(null, extractConstants(V0_5_2))
		assert.equal(verdict.ok, true)
		assert.equal(verdict.status, "coupled")
	})
})

describe("decideRunMode (no base ref → skip, not fail)", () => {
	it("runs when a base commit is available", () => {
		assert.deepEqual(decideRunMode({ baseResolved: true, strict: false }), { run: true, fail: false })
	})

	it("skips (never fails CI) when no base commit is available by default", () => {
		assert.deepEqual(decideRunMode({ baseResolved: false, strict: false }), { run: false, fail: false })
	})

	it("fails only when no base commit is available AND --strict is set", () => {
		assert.deepEqual(decideRunMode({ baseResolved: false, strict: true }), { run: false, fail: true })
	})
})
