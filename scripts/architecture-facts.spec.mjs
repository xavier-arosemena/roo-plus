/**
 * architecture-facts.spec.mjs
 *
 * Unit tests for the pure derivation logic in architecture-facts.mjs.
 * Run with: node --test scripts/architecture-facts.spec.mjs
 */

import { describe, it } from "node:test"
import assert from "node:assert/strict"

import {
	END_MARKER,
	START_MARKER,
	computeDrift,
	parseRegistryKeys,
	parseUnionMembers,
	replaceFactsBlock,
} from "./architecture-facts.mjs"

const REGISTRY_SOURCE = [
	"export const webviewMessageSchemas: Partial<Record<WebviewMessageType, z.ZodType>> = {",
	"\talpha: alphaMessageSchema,",
	"\tbeta: betaMessageSchema,",
	"\t// a comment is ignored",
	"\tgamma: gammaMessageSchema,",
	"}",
].join("\n")

const UNION_SOURCE = [
	'export const webviewMessageSchema = z.discriminatedUnion("type", [',
	"\talphaMessageSchema,",
	"\tbetaMessageSchema,",
	"\tgammaMessageSchema,",
	"])",
].join("\n")

describe("parseRegistryKeys", () => {
	it("returns registry keys in file order and ignores comments", () => {
		assert.deepEqual(parseRegistryKeys(REGISTRY_SOURCE, "webviewMessageSchemas"), ["alpha", "beta", "gamma"])
	})

	it("throws when the binding is missing", () => {
		assert.throws(() => parseRegistryKeys(REGISTRY_SOURCE, "nopeSchemas"), /Could not find/)
	})

	it("throws when the object literal is unterminated", () => {
		assert.throws(() => parseRegistryKeys("export const x = {\n\ta: b,", "x"), /Could not find the end/)
	})
})

describe("parseUnionMembers", () => {
	it("counts schema members of a discriminated union", () => {
		assert.equal(parseUnionMembers(UNION_SOURCE, "webviewMessageSchema"), 3)
	})

	it("throws when the union is missing", () => {
		assert.throws(() => parseUnionMembers(UNION_SOURCE, "otherMessageSchema"), /discriminatedUnion/)
	})
})

describe("computeDrift", () => {
	it("reports a protected type that lost its schema", () => {
		const drift = computeDrift(["alpha", "beta"], ["alpha"])
		assert.deepEqual(drift.missingFromRegistry, ["beta"])
		assert.deepEqual(drift.notInBaseline, [])
	})

	it("reports a registered type that is unprotected", () => {
		const drift = computeDrift(["alpha"], ["alpha", "delta"])
		assert.deepEqual(drift.missingFromRegistry, [])
		assert.deepEqual(drift.notInBaseline, ["delta"])
	})

	it("is clean when both sides agree", () => {
		const drift = computeDrift(["alpha", "beta"], ["beta", "alpha"])
		assert.deepEqual(drift, { missingFromRegistry: [], notInBaseline: [] })
	})
})

describe("replaceFactsBlock", () => {
	const document = ["# Doc", "", START_MARKER, "", "old table", "", END_MARKER, "", "tail"].join("\n")

	it("replaces only the marked block and preserves the surrounding document", () => {
		const result = replaceFactsBlock(document, "| new |")
		assert.match(result, /# Doc/)
		assert.match(result, /\| new \|/)
		assert.doesNotMatch(result, /old table/)
		assert.match(result, /tail/)
		assert.equal(result.indexOf(START_MARKER) < result.indexOf(END_MARKER), true)
	})

	it("throws rather than appending when markers are missing", () => {
		assert.throws(() => replaceFactsBlock("# Doc\n\nno markers", "| x |"), /markers/)
	})

	it("is idempotent", () => {
		const once = replaceFactsBlock(document, "| new |")
		assert.equal(replaceFactsBlock(once, "| new |"), once)
	})
})
