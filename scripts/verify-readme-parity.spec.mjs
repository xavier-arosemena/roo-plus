/**
 * verify-readme-parity.spec.mjs
 * Run with: node --test scripts/verify-readme-parity.spec.mjs
 */

import { describe, it } from "node:test"
import assert from "node:assert/strict"

import { compareReadmes } from "./verify-readme-parity.mjs"

describe("compareReadmes", () => {
	it("passes for identical content", () => {
		const result = compareReadmes({ rootText: "# Roo+\n", packagedText: "# Roo+\n" })
		assert.equal(result.equal, true)
	})

	it("ignores line-ending style", () => {
		const result = compareReadmes({ rootText: "# Roo+\nbody\n", packagedText: "# Roo+\r\nbody\r\n" })
		assert.equal(result.equal, true)
	})

	it("fails on real editorial drift and says how to fix it", () => {
		const result = compareReadmes({ rootText: "# Roo+\nnew\n", packagedText: "# Roo+\nold\n" })
		assert.equal(result.equal, false)
		assert.match(result.reason ?? "", /--fix/)
	})

	it("fails when the packaged copy is only whitespace-different", () => {
		const result = compareReadmes({ rootText: "a b", packagedText: "a  b" })
		assert.equal(result.equal, false)
	})
})
