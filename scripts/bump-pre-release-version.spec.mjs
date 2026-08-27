/**
 * bump-pre-release-version.spec.mjs
 *
 * Unit tests for the pure version-computation logic in
 * scripts/bump-pre-release-version.mjs (iterate-then-stabilize release policy;
 * see docs/adr/adr-release-versioning-policy.md).
 *
 * Run with: node --test scripts/bump-pre-release-version.spec.mjs
 * (scripts/ has no vitest runner, so node:test built into Node 22 is used.)
 */

import { describe, it } from "node:test"
import assert from "node:assert/strict"

import { computeNextVersion, MODE_LINE, MODE_PRE_RELEASE } from "./bump-pre-release-version.mjs"

describe("computeNextVersion", () => {
	it("bumps the patch by 1 on the current minor (pre-release)", () => {
		assert.equal(computeNextVersion("3.86.0"), "3.86.1")
		assert.equal(computeNextVersion("3.86.19", MODE_PRE_RELEASE), "3.86.20")
		assert.equal(computeNextVersion("3.88.1", MODE_PRE_RELEASE), "3.88.2")
	})

	it("starts a new minor line with patch 0 (line)", () => {
		assert.equal(computeNextVersion("3.86.19", MODE_LINE), "3.87.0")
		assert.equal(computeNextVersion("3.88.3", MODE_LINE), "3.89.0")
	})

	it("returns null for a version that is not a plain major.minor.patch", () => {
		assert.equal(computeNextVersion("3.86"), null)
		assert.equal(computeNextVersion("3.86.0.1"), null)
		assert.equal(computeNextVersion("not-a-version"), null)
	})
})
