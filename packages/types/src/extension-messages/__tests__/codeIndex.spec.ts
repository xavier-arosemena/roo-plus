import { describe, it, expect } from "vitest"

import {
	codeIndexMessageSchema,
	codeIndexSecretStatusMessageSchema,
	codeIndexSettingsSavedMessageSchema,
	codebaseIndexConfigMessageSchema,
	extensionMessageSchemas,
	indexClearedMessageSchema,
	parseExtensionMessage,
} from "../index.js"

const validSettings = {
	codebaseIndexEnabled: true,
	codebaseIndexQdrantUrl: "http://localhost:6333",
	codebaseIndexEmbedderProvider: "openai",
	codebaseIndexEmbedderModelId: "text-embedding-3-small",
	codebaseIndexEmbedderModelDimension: 1536,
	codebaseIndexSearchMaxResults: 50,
	codebaseIndexSearchMinScore: 0.4,
	codebaseIndexSembleBinaryPath: "",
}

const allSecretStatus = {
	hasOpenAiKey: true,
	hasQdrantApiKey: false,
	hasOpenAiCompatibleApiKey: true,
	hasGeminiApiKey: false,
	hasMistralApiKey: true,
	hasVercelAiGatewayApiKey: false,
	hasOpenRouterApiKey: true,
}

describe("code-index domain (Phase 2, Domain 6) schemas", () => {
	describe("valid messages", () => {
		it.each([
			[
				"codeIndexSettingsSaved (success with settings)",
				codeIndexSettingsSavedMessageSchema,
				{ type: "codeIndexSettingsSaved", success: true, settings: validSettings },
			],
			[
				"codeIndexSettingsSaved (success without settings — optional)",
				codeIndexSettingsSavedMessageSchema,
				{ type: "codeIndexSettingsSaved", success: true },
			],
			[
				"codeIndexSettingsSaved (error form)",
				codeIndexSettingsSavedMessageSchema,
				{ type: "codeIndexSettingsSaved", success: false, error: "Failed to save settings" },
			],
			[
				"codeIndexSecretStatus (all booleans)",
				codeIndexSecretStatusMessageSchema,
				{ type: "codeIndexSecretStatus", values: allSecretStatus },
			],
			["indexCleared (success)", indexClearedMessageSchema, { type: "indexCleared", values: { success: true } }],
			[
				"indexCleared (error)",
				indexClearedMessageSchema,
				{ type: "indexCleared", values: { success: false, error: "No workspace folder open" } },
			],
			[
				"codebaseIndexConfig (vestigial — minimal)",
				codebaseIndexConfigMessageSchema,
				{ type: "codebaseIndexConfig" },
			],
		])("accepts %s", (_name, schema, payload) => {
			const result = schema.safeParse(payload)
			expect(result.success).toBe(true)
		})
	})

	describe("malformed messages", () => {
		it.each([
			[
				"codeIndexSettingsSaved (missing success)",
				codeIndexSettingsSavedMessageSchema,
				{ type: "codeIndexSettingsSaved" },
			],
			[
				"codeIndexSettingsSaved (non-boolean success)",
				codeIndexSettingsSavedMessageSchema,
				{ type: "codeIndexSettingsSaved", success: "yes" },
			],
			[
				"codeIndexSettingsSaved (invalid settings — non-string qdrant url)",
				codeIndexSettingsSavedMessageSchema,
				{
					type: "codeIndexSettingsSaved",
					success: true,
					settings: { ...validSettings, codebaseIndexQdrantUrl: 42 },
				},
			],
			[
				"codeIndexSettingsSaved (invalid settings — bogus embedder provider)",
				codeIndexSettingsSavedMessageSchema,
				{
					type: "codeIndexSettingsSaved",
					success: true,
					settings: { ...validSettings, codebaseIndexEmbedderProvider: "bogus" },
				},
			],
			[
				"codeIndexSecretStatus (missing a boolean field)",
				codeIndexSecretStatusMessageSchema,
				{ type: "codeIndexSecretStatus", values: { hasOpenAiKey: true } },
			],
			[
				"codeIndexSecretStatus (non-boolean field)",
				codeIndexSecretStatusMessageSchema,
				{ type: "codeIndexSecretStatus", values: { ...allSecretStatus, hasGeminiApiKey: "yes" } },
			],
			[
				"codeIndexSecretStatus (non-object values)",
				codeIndexSecretStatusMessageSchema,
				{ type: "codeIndexSecretStatus", values: "nope" },
			],
			["indexCleared (missing success)", indexClearedMessageSchema, { type: "indexCleared", values: {} }],
			[
				"indexCleared (non-boolean success)",
				indexClearedMessageSchema,
				{ type: "indexCleared", values: { success: "yes" } },
			],
			["indexCleared (non-object values)", indexClearedMessageSchema, { type: "indexCleared", values: 42 }],
			[
				"codebaseIndexConfig (wrong type discriminator)",
				codebaseIndexConfigMessageSchema,
				{ type: "codebaseIndexConfigX" },
			],
		])("rejects %s", (_name, schema, payload) => {
			const result = schema.safeParse(payload)
			expect(result.success).toBe(false)
		})
	})

	describe("parseExtensionMessage boundary", () => {
		it("strictly validates a registered codeIndexSettingsSaved success with settings retained", () => {
			const result = parseExtensionMessage({
				type: "codeIndexSettingsSaved",
				success: true,
				settings: validSettings,
			})
			expect(result.ok).toBe(true)
			if (result.ok) {
				expect(result.message.type).toBe("codeIndexSettingsSaved")
				// `settings` is modeled with `codebaseIndexConfigSchema` — zod must
				// NOT strip the consumer-read/persisted config fields.
				expect(result.message.settings).toEqual(validSettings)
			}
		})

		it("strictly validates a registered codeIndexSettingsSaved error form", () => {
			const result = parseExtensionMessage({
				type: "codeIndexSettingsSaved",
				success: false,
				error: "boom",
			})
			expect(result.ok).toBe(true)
			if (result.ok) {
				expect(result.message.type).toBe("codeIndexSettingsSaved")
				expect(result.message.success).toBe(false)
				expect(result.message.error).toBe("boom")
			}
		})

		it("strictly validates a registered codeIndexSecretStatus and retains all seven values", () => {
			const result = parseExtensionMessage({ type: "codeIndexSecretStatus", values: allSecretStatus })
			expect(result.ok).toBe(true)
			if (result.ok) {
				expect(result.message.type).toBe("codeIndexSecretStatus")
				// The consumer (`CodeIndexPopover.tsx`) reads every field — zod must
				// NOT strip any of them.
				expect(result.message.values).toEqual(allSecretStatus)
			}
		})

		it("strictly validates a registered indexCleared", () => {
			const result = parseExtensionMessage({ type: "indexCleared", values: { success: true } })
			expect(result.ok).toBe(true)
			if (result.ok) {
				expect(result.message.type).toBe("indexCleared")
			}
		})

		it("strictly validates a registered vestigial codebaseIndexConfig", () => {
			const result = parseExtensionMessage({ type: "codebaseIndexConfig" })
			expect(result.ok).toBe(true)
			if (result.ok) {
				expect(result.message.type).toBe("codebaseIndexConfig")
			}
		})

		it("rejects a malformed registered codeIndexSecretStatus", () => {
			const result = parseExtensionMessage({ type: "codeIndexSecretStatus", values: { hasOpenAiKey: true } })
			expect(result.ok).toBe(false)
			if (!result.ok) {
				expect(result.error).toContain("codeIndexSecretStatus")
			}
		})

		it("rejects a malformed registered codeIndexSettingsSaved", () => {
			const result = parseExtensionMessage({ type: "codeIndexSettingsSaved", success: "yes" })
			expect(result.ok).toBe(false)
			if (!result.ok) {
				expect(result.error).toContain("codeIndexSettingsSaved")
			}
		})

		it("rejects a malformed registered indexCleared", () => {
			const result = parseExtensionMessage({ type: "indexCleared", values: {} })
			expect(result.ok).toBe(false)
			if (!result.ok) {
				expect(result.error).toContain("indexCleared")
			}
		})
	})

	describe("registry seeding", () => {
		const domainTypes = [
			"codeIndexSettingsSaved",
			"codeIndexSecretStatus",
			"indexCleared",
			"codebaseIndexConfig",
		] as const

		it("seeds every code-index response type into the registry", () => {
			for (const type of domainTypes) {
				expect(extensionMessageSchemas[type]).toBeDefined()
			}
		})

		it("builds a discriminated union over the domain's registered types", () => {
			const parsed = codeIndexMessageSchema.safeParse({
				type: "indexCleared",
				values: { success: true },
			})
			expect(parsed.success).toBe(true)
			if (parsed.success) {
				expect(parsed.data.type).toBe("indexCleared")
			}
		})
	})
})
