import { describe, it, expect } from "vitest"

import {
	checkpointInitWarningMessageSchema,
	checkpointModesMessageSchema,
	checkRulesDirectoryResultMessageSchema,
	currentCheckpointUpdatedMessageSchema,
	deleteCustomModeCheckMessageSchema,
	deleteCustomModeMessageSchema,
	extensionMessageSchemas,
	exportModeResultMessageSchema,
	importModeResultMessageSchema,
	parseExtensionMessage,
	updateCustomModeMessageSchema,
} from "../index.js"

const validModeConfig = {
	slug: "test-mode",
	name: "Test Mode",
	roleDefinition: "Test role",
	groups: [],
}

describe("checkpoint/modes domain (Phase 2, Domain 4) schemas", () => {
	describe("valid messages", () => {
		it.each([
			[
				"currentCheckpointUpdated",
				currentCheckpointUpdatedMessageSchema,
				{ type: "currentCheckpointUpdated", text: "abc123" },
			],
			[
				"currentCheckpointUpdated (suppressMessage)",
				currentCheckpointUpdatedMessageSchema,
				{ type: "currentCheckpointUpdated", text: "abc123", suppressMessage: true },
			],
			[
				"checkpointInitWarning (object form)",
				checkpointInitWarningMessageSchema,
				{ type: "checkpointInitWarning", checkpointWarning: { type: "WAIT_TIMEOUT", timeout: 5 } },
			],
			[
				"checkpointInitWarning (INIT_TIMEOUT object form)",
				checkpointInitWarningMessageSchema,
				{ type: "checkpointInitWarning", checkpointWarning: { type: "INIT_TIMEOUT", timeout: 10 } },
			],
			[
				"checkpointInitWarning (string form, from tests/older producers)",
				checkpointInitWarningMessageSchema,
				{
					type: "checkpointInitWarning",
					checkpointWarning: "Checkpoint initialization is taking longer than 5 seconds...",
				},
			],
			[
				"checkpointInitWarning (empty-string clear form)",
				checkpointInitWarningMessageSchema,
				{ type: "checkpointInitWarning", checkpointWarning: "" },
			],
			[
				"checkpointInitWarning (no payload)",
				checkpointInitWarningMessageSchema,
				{ type: "checkpointInitWarning" },
			],
			[
				"updateCustomMode (outbound, vestigial — full)",
				updateCustomModeMessageSchema,
				{
					type: "updateCustomMode",
					slug: "test-mode",
					mode: "test-mode",
					customMode: validModeConfig,
					success: true,
				},
			],
			[
				"updateCustomMode (outbound, vestigial — minimal)",
				updateCustomModeMessageSchema,
				{ type: "updateCustomMode" },
			],
			[
				"deleteCustomMode (outbound, vestigial — full)",
				deleteCustomModeMessageSchema,
				{ type: "deleteCustomMode", slug: "test-mode", success: true },
			],
			[
				"deleteCustomMode (outbound, vestigial — minimal)",
				deleteCustomModeMessageSchema,
				{ type: "deleteCustomMode" },
			],
			[
				"deleteCustomModeCheck (with rulesFolderPath)",
				deleteCustomModeCheckMessageSchema,
				{ type: "deleteCustomModeCheck", slug: "test-mode", rulesFolderPath: "/tmp/.roo/rules-test-mode" },
			],
			[
				"deleteCustomModeCheck (no rules folder)",
				deleteCustomModeCheckMessageSchema,
				{ type: "deleteCustomModeCheck", slug: "test-mode" },
			],
			[
				"exportModeResult (success)",
				exportModeResultMessageSchema,
				{ type: "exportModeResult", success: true, slug: "test-mode" },
			],
			[
				"exportModeResult (error)",
				exportModeResultMessageSchema,
				{ type: "exportModeResult", success: false, slug: "test-mode", error: "Export cancelled" },
			],
			[
				"importModeResult (success with slug)",
				importModeResultMessageSchema,
				{ type: "importModeResult", success: true, slug: "test-mode" },
			],
			[
				"importModeResult (error, no slug)",
				importModeResultMessageSchema,
				{ type: "importModeResult", success: false, error: "cancelled" },
			],
			[
				"checkRulesDirectoryResult (hasContent)",
				checkRulesDirectoryResultMessageSchema,
				{ type: "checkRulesDirectoryResult", slug: "test-mode", hasContent: true },
			],
			[
				"checkRulesDirectoryResult (no content)",
				checkRulesDirectoryResultMessageSchema,
				{ type: "checkRulesDirectoryResult", slug: "test-mode", hasContent: false },
			],
		])("accepts %s", (_name, schema, payload) => {
			const result = schema.safeParse(payload)
			expect(result.success).toBe(true)
		})
	})

	describe("malformed messages", () => {
		it.each([
			[
				"currentCheckpointUpdated (missing text)",
				currentCheckpointUpdatedMessageSchema,
				{ type: "currentCheckpointUpdated" },
			],
			[
				"currentCheckpointUpdated (non-string text)",
				currentCheckpointUpdatedMessageSchema,
				{ type: "currentCheckpointUpdated", text: 42 },
			],
			[
				"checkpointInitWarning (bad warning type)",
				checkpointInitWarningMessageSchema,
				{ type: "checkpointInitWarning", checkpointWarning: { type: "BOGUS", timeout: 5 } },
			],
			[
				"checkpointInitWarning (non-numeric timeout)",
				checkpointInitWarningMessageSchema,
				{ type: "checkpointInitWarning", checkpointWarning: { type: "WAIT_TIMEOUT", timeout: "5" } },
			],
			[
				"updateCustomMode (bad customMode shape)",
				updateCustomModeMessageSchema,
				{ type: "updateCustomMode", customMode: { slug: "x" } },
			],
			[
				"deleteCustomMode (non-string slug)",
				deleteCustomModeMessageSchema,
				{ type: "deleteCustomMode", slug: 42 },
			],
			[
				"deleteCustomModeCheck (missing slug)",
				deleteCustomModeCheckMessageSchema,
				{ type: "deleteCustomModeCheck" },
			],
			[
				"deleteCustomModeCheck (non-string rulesFolderPath)",
				deleteCustomModeCheckMessageSchema,
				{ type: "deleteCustomModeCheck", slug: "test-mode", rulesFolderPath: 42 },
			],
			["exportModeResult (missing success)", exportModeResultMessageSchema, { type: "exportModeResult" }],
			[
				"exportModeResult (non-boolean success)",
				exportModeResultMessageSchema,
				{ type: "exportModeResult", success: "yes" },
			],
			["importModeResult (missing success)", importModeResultMessageSchema, { type: "importModeResult" }],
			[
				"checkRulesDirectoryResult (missing slug)",
				checkRulesDirectoryResultMessageSchema,
				{ type: "checkRulesDirectoryResult" },
			],
			[
				"checkRulesDirectoryResult (non-boolean hasContent)",
				checkRulesDirectoryResultMessageSchema,
				{ type: "checkRulesDirectoryResult", slug: "test-mode", hasContent: "yes" },
			],
		])("rejects %s", (_name, schema, payload) => {
			const result = schema.safeParse(payload)
			expect(result.success).toBe(false)
		})
	})

	describe("parseExtensionMessage boundary", () => {
		it("strictly validates a registered checkpointInitWarning (object form)", () => {
			const result = parseExtensionMessage({
				type: "checkpointInitWarning",
				checkpointWarning: { type: "WAIT_TIMEOUT", timeout: 5 },
			})
			expect(result.ok).toBe(true)
			if (result.ok) {
				expect(result.message.type).toBe("checkpointInitWarning")
			}
		})

		it("strictly validates a registered checkpointInitWarning (string form)", () => {
			const result = parseExtensionMessage({
				type: "checkpointInitWarning",
				checkpointWarning: "Checkpoint initialization is taking longer than 5 seconds...",
			})
			expect(result.ok).toBe(true)
			if (result.ok) {
				expect(result.message.type).toBe("checkpointInitWarning")
			}
		})

		it("rejects a malformed registered checkpointInitWarning", () => {
			const result = parseExtensionMessage({
				type: "checkpointInitWarning",
				checkpointWarning: { type: "BOGUS", timeout: 5 },
			})
			expect(result.ok).toBe(false)
			if (!result.ok) {
				expect(result.error).toContain("checkpointInitWarning")
			}
		})

		it("rejects a malformed registered exportModeResult", () => {
			const result = parseExtensionMessage({ type: "exportModeResult" })
			expect(result.ok).toBe(false)
			if (!result.ok) {
				expect(result.error).toContain("exportModeResult")
			}
		})
	})

	describe("registry seeding", () => {
		const domainTypes = [
			"currentCheckpointUpdated",
			"checkpointInitWarning",
			"updateCustomMode",
			"deleteCustomMode",
			"deleteCustomModeCheck",
			"exportModeResult",
			"importModeResult",
			"checkRulesDirectoryResult",
		] as const

		it("seeds every checkpoint/modes type into the registry", () => {
			for (const type of domainTypes) {
				expect(extensionMessageSchemas[type]).toBeDefined()
			}
		})

		it("builds a discriminated union over the domain's registered types", () => {
			const parsed = checkpointModesMessageSchema.safeParse({
				type: "checkRulesDirectoryResult",
				slug: "test-mode",
				hasContent: true,
			})
			expect(parsed.success).toBe(true)
			if (parsed.success) {
				expect(parsed.data.type).toBe("checkRulesDirectoryResult")
			}
		})
	})
})
