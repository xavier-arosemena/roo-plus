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
	MESSAGE_SCHEMA_BASELINE,
	UNTYPED_MESSAGE_LIMIT,
	analyzeRegistry,
	evaluateRatchet,
	extractMessageTypesFromSource,
} from "./message-schema-analysis.mjs"

const REGISTRY = Object.fromEntries(MESSAGE_SCHEMA_BASELINE.map((type) => [type, {}]))

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
		const analysis = analyzeRegistry({}, ["a", "b", "c", "d"], [])
		assert.equal(analysis.untypedCount, 4)
		assert.equal(evaluateRatchet(analysis, 3).ok, false)
	})

	it("passes when the untyped count decreases (at or below the limit)", () => {
		const analysis = analyzeRegistry({}, ["a", "b"], [])
		assert.equal(analysis.untypedCount, 2)
		assert.equal(evaluateRatchet(analysis, 2).ok, true)
		assert.equal(evaluateRatchet(analysis, 5).ok, true)
	})
})
