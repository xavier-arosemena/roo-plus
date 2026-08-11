/**
 * verify-message-schemas.spec.mjs
 *
 * Unit tests for the pure ratchet logic in message-schema-analysis.mjs.
 *
 * Run with: node --test scripts/verify-message-schemas.spec.mjs
 * The repo's scripts/ directory has no vitest runner, so node:test (built into
 * Node 22) is used — no new dependencies or configuration.
 */

import { describe, it } from "node:test"
import assert from "node:assert/strict"

import {
	EXTENSION_MESSAGE_BASELINE,
	MESSAGE_SCHEMA_BASELINE,
	UNTYPED_EXTENSION_MESSAGE_LIMIT,
	UNTYPED_MESSAGE_LIMIT,
	analyzeRegistry,
	evaluateRatchet,
	extractExtensionMessageTypesFromSource,
	extractMessageTypesFromSource,
} from "./message-schema-analysis.mjs"

const REGISTRY = Object.fromEntries(MESSAGE_SCHEMA_BASELINE.map((type) => [type, {}]))
const EXTENSION_REGISTRY = Object.fromEntries(EXTENSION_MESSAGE_BASELINE.map((type) => [type, {}]))

describe("extractMessageTypesFromSource", () => {
	it("parses the literal union from the WebviewMessage interface source", () => {
		const source = [
			"export interface WebviewMessage {",
			"\ttype:",
			'\t\t| "updateTodoList"',
			'\t\t| "allowedCommands"',
			"\t\t// a comment line is skipped",
			'\t\t| "openRulesDirectory"',
			"\ttext?: string",
			"}",
		].join("\n")
		assert.deepEqual(extractMessageTypesFromSource(source), [
			"updateTodoList",
			"allowedCommands",
			"openRulesDirectory",
		])
	})

	it("throws a clear error when the interface is missing", () => {
		assert.throws(() => extractMessageTypesFromSource("export interface SomethingElse {}"), /WebviewMessage/)
	})
})

describe("analyzeRegistry", () => {
	const typeList = [...MESSAGE_SCHEMA_BASELINE, "newTask", "askResponse", "webviewDidLaunch"]

	it("passes when every type in the list is registered (all registered → pass)", () => {
		const analysis = analyzeRegistry(REGISTRY, [...MESSAGE_SCHEMA_BASELINE], MESSAGE_SCHEMA_BASELINE)
		assert.deepEqual(analysis.missingBaseline, [])
		assert.equal(analysis.untypedCount, 0)
		assert.equal(evaluateRatchet(analysis, UNTYPED_MESSAGE_LIMIT).ok, true)
	})

	it("fails when a baseline type is missing from the registry (regression)", () => {
		const registryWithoutOne = { ...REGISTRY }
		delete registryWithoutOne.allowedCommands
		const analysis = analyzeRegistry(registryWithoutOne, typeList, MESSAGE_SCHEMA_BASELINE)
		assert.deepEqual(analysis.missingBaseline, ["allowedCommands"])
		const verdict = evaluateRatchet(analysis, UNTYPED_MESSAGE_LIMIT)
		assert.equal(verdict.ok, false)
		assert.match(verdict.problems.join("\n"), /allowedCommands/)
	})

	it("fails when the untyped count increases past the limit", () => {
		const overLimit = Array.from({ length: UNTYPED_MESSAGE_LIMIT + 1 }, (_, i) => `t${i}`)
		const analysis = analyzeRegistry({}, overLimit, [])
		assert.equal(analysis.untypedCount, UNTYPED_MESSAGE_LIMIT + 1)
		assert.equal(evaluateRatchet(analysis, UNTYPED_MESSAGE_LIMIT).ok, false)
	})

	it("passes when the untyped count decreases (at or below the limit)", () => {
		// The inbound limit is now 0 (all 165 types registered), so "at or below"
		// means 0 untyped — a count above 0 must fail.
		const analysis = analyzeRegistry({}, [], [])
		assert.equal(analysis.untypedCount, 0)
		assert.equal(evaluateRatchet(analysis, 2).ok, true)
		assert.equal(evaluateRatchet(analysis, UNTYPED_MESSAGE_LIMIT).ok, true)

		const aboveLimit = analyzeRegistry({}, ["a", "b"], [])
		assert.equal(aboveLimit.untypedCount, 2)
		assert.equal(evaluateRatchet(aboveLimit, UNTYPED_MESSAGE_LIMIT).ok, false)
	})

	it(`passes exactly at the untyped limit and fails one above (${UNTYPED_MESSAGE_LIMIT}/${UNTYPED_MESSAGE_LIMIT + 1} boundary)`, () => {
		const atLimitTypes = Array.from({ length: UNTYPED_MESSAGE_LIMIT }, (_, i) => `t${i}`)
		const atLimit = analyzeRegistry({}, atLimitTypes, [])
		assert.equal(atLimit.untypedCount, UNTYPED_MESSAGE_LIMIT)
		assert.equal(evaluateRatchet(atLimit, UNTYPED_MESSAGE_LIMIT).ok, true)

		const oneAboveTypes = Array.from({ length: UNTYPED_MESSAGE_LIMIT + 1 }, (_, i) => `t${i}`)
		const oneAbove = analyzeRegistry({}, oneAboveTypes, [])
		assert.equal(oneAbove.untypedCount, UNTYPED_MESSAGE_LIMIT + 1)
		assert.equal(evaluateRatchet(oneAbove, UNTYPED_MESSAGE_LIMIT).ok, false)
	})
})

describe("extractExtensionMessageTypesFromSource", () => {
	it("parses the literal union from the ExtensionMessage interface source", () => {
		const source = [
			"export interface ExtensionMessage {",
			"\ttype:",
			'\t\t| "action"',
			'\t\t| "state"',
			"\t\t// a comment line is skipped",
			'\t\t| "fileContent"',
			"\ttext?: string",
			"}",
		].join("\n")
		assert.deepEqual(extractExtensionMessageTypesFromSource(source), ["action", "state", "fileContent"])
	})

	it("throws a clear error when the interface is missing", () => {
		assert.throws(
			() => extractExtensionMessageTypesFromSource("export interface SomethingElse {}"),
			/ExtensionMessage/,
		)
	})
})

describe("outbound extension-message ratchet (Phase 0)", () => {
	const outboundTypeList = [...EXTENSION_MESSAGE_BASELINE, "taskHistoryUpdated", "theme", "mcpServers"]

	it("passes when every baseline outbound type is registered", () => {
		const analysis = analyzeRegistry(EXTENSION_REGISTRY, [...EXTENSION_MESSAGE_BASELINE], EXTENSION_MESSAGE_BASELINE)
		assert.deepEqual(analysis.missingBaseline, [])
		assert.equal(analysis.untypedCount, 0)
		const verdict = evaluateRatchet(analysis, UNTYPED_EXTENSION_MESSAGE_LIMIT, "extensionMessageSchemas")
		assert.equal(verdict.ok, true)
	})

	it("fails when a baseline outbound type loses its schema (regression)", () => {
		const registryWithoutOne = { ...EXTENSION_REGISTRY }
		delete registryWithoutOne.state
		const analysis = analyzeRegistry(registryWithoutOne, outboundTypeList, EXTENSION_MESSAGE_BASELINE)
		assert.deepEqual(analysis.missingBaseline, ["state"])
		const verdict = evaluateRatchet(analysis, UNTYPED_EXTENSION_MESSAGE_LIMIT, "extensionMessageSchemas")
		assert.equal(verdict.ok, false)
		assert.match(verdict.problems.join("\n"), /state/)
		assert.match(verdict.problems.join("\n"), /extensionMessageSchemas/)
	})

	it("fails when the outbound untyped count increases past the limit", () => {
		const overLimit = Array.from({ length: UNTYPED_EXTENSION_MESSAGE_LIMIT + 1 }, (_, i) => `t${i}`)
		const analysis = analyzeRegistry({}, overLimit, [])
		assert.equal(analysis.untypedCount, UNTYPED_EXTENSION_MESSAGE_LIMIT + 1)
		const verdict = evaluateRatchet(analysis, UNTYPED_EXTENSION_MESSAGE_LIMIT, "extensionMessageSchemas")
		assert.equal(verdict.ok, false)
	})

	it("the outbound baseline is exactly the Phase-0 type set", () => {
		assert.deepEqual(EXTENSION_MESSAGE_BASELINE, [
			"state",
			"commandExecutionStatus",
			"mcpExecutionStatus",
			"fileContent",
			"indexingStatusUpdate",
		])
	})
})
