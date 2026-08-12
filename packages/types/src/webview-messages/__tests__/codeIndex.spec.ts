import { describe, it, expect } from "vitest"

import {
	clearIndexDataMessageSchema,
	requestCodeIndexSecretStatusMessageSchema,
	requestIndexingStatusMessageSchema,
	saveCodeIndexSettingsAtomicMessageSchema,
	setAutoEnableDefaultMessageSchema,
	startIndexingMessageSchema,
	stopIndexingMessageSchema,
	toggleWorkspaceIndexingMessageSchema,
	codeIndexMessageSchema,
	parseWebviewMessage,
} from "../index.js"

/** A minimal but valid code-index settings payload (all required fields). */
const validSettings = {
	codebaseIndexEnabled: true,
	codebaseIndexQdrantUrl: "http://localhost:6333",
	codebaseIndexEmbedderProvider: "openai" as const,
	codebaseIndexEmbedderModelId: "text-embedding-3-small",
}

describe("saveCodeIndexSettingsAtomicMessageSchema", () => {
	it("accepts a valid message with only the required settings fields", () => {
		const result = saveCodeIndexSettingsAtomicMessageSchema.safeParse({
			type: "saveCodeIndexSettingsAtomic",
			codeIndexSettings: validSettings,
		})
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.codeIndexSettings.codebaseIndexEnabled).toBe(true)
			expect(result.data.codeIndexSettings.codebaseIndexEmbedderProvider).toBe("openai")
		}
	})

	it("accepts a valid message with all optional settings fields", () => {
		const result = saveCodeIndexSettingsAtomicMessageSchema.safeParse({
			type: "saveCodeIndexSettingsAtomic",
			codeIndexSettings: {
				...validSettings,
				codebaseIndexEmbedderProvider: "semble",
				codebaseIndexEmbedderBaseUrl: "http://localhost:11434",
				codebaseIndexEmbedderModelDimension: 768,
				codebaseIndexOpenAiCompatibleBaseUrl: "http://localhost:8080",
				codebaseIndexBedrockRegion: "us-east-1",
				codebaseIndexBedrockProfile: "default",
				codebaseIndexSearchMaxResults: 50,
				codebaseIndexSearchMinScore: 0.4,
				codebaseIndexOpenRouterSpecificProvider: "openrouter/auto",
				codebaseIndexSembleBinaryPath: "/usr/local/bin/semble",
				codeIndexOpenAiKey: "sk-test",
				codeIndexQdrantApiKey: "qdrant-test",
				codebaseIndexOpenAiCompatibleApiKey: "sk-compat",
				codebaseIndexGeminiApiKey: "gemini-test",
				codebaseIndexMistralApiKey: "mistral-test",
				codebaseIndexVercelAiGatewayApiKey: "vercel-test",
				codebaseIndexOpenRouterApiKey: "or-test",
			},
		})
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.codeIndexSettings.codebaseIndexSembleBinaryPath).toBe("/usr/local/bin/semble")
			expect(result.data.codeIndexSettings.codebaseIndexSearchMinScore).toBe(0.4)
		}
	})

	it("rejects a message missing codeIndexSettings", () => {
		expect(
			saveCodeIndexSettingsAtomicMessageSchema.safeParse({ type: "saveCodeIndexSettingsAtomic" }).success,
		).toBe(false)
	})

	it("rejects a message missing the required codebaseIndexEnabled", () => {
		const { codebaseIndexEnabled: _removed, ...rest } = validSettings
		expect(
			saveCodeIndexSettingsAtomicMessageSchema.safeParse({
				type: "saveCodeIndexSettingsAtomic",
				codeIndexSettings: rest,
			}).success,
		).toBe(false)
	})

	it("rejects a message missing the required codebaseIndexQdrantUrl", () => {
		const { codebaseIndexQdrantUrl: _removed, ...rest } = validSettings
		expect(
			saveCodeIndexSettingsAtomicMessageSchema.safeParse({
				type: "saveCodeIndexSettingsAtomic",
				codeIndexSettings: rest,
			}).success,
		).toBe(false)
	})

	it("rejects an invalid codebaseIndexEmbedderProvider enum", () => {
		expect(
			saveCodeIndexSettingsAtomicMessageSchema.safeParse({
				type: "saveCodeIndexSettingsAtomic",
				codeIndexSettings: { ...validSettings, codebaseIndexEmbedderProvider: "bogus-provider" },
			}).success,
		).toBe(false)
	})

	it("rejects a non-string codebaseIndexQdrantUrl", () => {
		expect(
			saveCodeIndexSettingsAtomicMessageSchema.safeParse({
				type: "saveCodeIndexSettingsAtomic",
				codeIndexSettings: { ...validSettings, codebaseIndexQdrantUrl: 42 },
			}).success,
		).toBe(false)
	})

	it("rejects a non-boolean codebaseIndexEnabled", () => {
		expect(
			saveCodeIndexSettingsAtomicMessageSchema.safeParse({
				type: "saveCodeIndexSettingsAtomic",
				codeIndexSettings: { ...validSettings, codebaseIndexEnabled: "yes" },
			}).success,
		).toBe(false)
	})

	it("rejects a non-string secret field", () => {
		expect(
			saveCodeIndexSettingsAtomicMessageSchema.safeParse({
				type: "saveCodeIndexSettingsAtomic",
				codeIndexSettings: { ...validSettings, codeIndexOpenAiKey: 12345 },
			}).success,
		).toBe(false)
	})

	it("rejects a non-number codebaseIndexSearchMaxResults", () => {
		expect(
			saveCodeIndexSettingsAtomicMessageSchema.safeParse({
				type: "saveCodeIndexSettingsAtomic",
				codeIndexSettings: { ...validSettings, codebaseIndexSearchMaxResults: "many" },
			}).success,
		).toBe(false)
	})

	it("rejects a message with the wrong type literal", () => {
		expect(
			saveCodeIndexSettingsAtomicMessageSchema.safeParse({
				type: "startIndexing",
				codeIndexSettings: validSettings,
			}).success,
		).toBe(false)
	})

	it("rejects a non-object payload", () => {
		expect(saveCodeIndexSettingsAtomicMessageSchema.safeParse(null).success).toBe(false)
	})
})

describe("setAutoEnableDefaultMessageSchema", () => {
	it("accepts a valid message with a bool", () => {
		const result = setAutoEnableDefaultMessageSchema.safeParse({ type: "setAutoEnableDefault", bool: true })
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.bool).toBe(true)
		}
	})

	it("accepts a message without bool (handler defaults to true)", () => {
		expect(setAutoEnableDefaultMessageSchema.safeParse({ type: "setAutoEnableDefault" }).success).toBe(true)
	})

	it("rejects a non-boolean bool", () => {
		expect(setAutoEnableDefaultMessageSchema.safeParse({ type: "setAutoEnableDefault", bool: "yes" }).success).toBe(
			false,
		)
	})

	it("rejects a message with the wrong type literal", () => {
		expect(setAutoEnableDefaultMessageSchema.safeParse({ type: "toggleWorkspaceIndexing" }).success).toBe(false)
	})
})

describe("toggleWorkspaceIndexingMessageSchema", () => {
	it("accepts a valid message with a bool", () => {
		const result = toggleWorkspaceIndexingMessageSchema.safeParse({ type: "toggleWorkspaceIndexing", bool: false })
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.bool).toBe(false)
		}
	})

	it("accepts a message without bool (handler defaults to false)", () => {
		expect(toggleWorkspaceIndexingMessageSchema.safeParse({ type: "toggleWorkspaceIndexing" }).success).toBe(true)
	})

	it("rejects a non-boolean bool", () => {
		expect(
			toggleWorkspaceIndexingMessageSchema.safeParse({ type: "toggleWorkspaceIndexing", bool: 1 }).success,
		).toBe(false)
	})

	it("rejects a message with the wrong type literal", () => {
		expect(toggleWorkspaceIndexingMessageSchema.safeParse({ type: "setAutoEnableDefault" }).success).toBe(false)
	})
})

describe("empty-payload code-index schemas", () => {
	const emptySchemas = [
		["clearIndexData", clearIndexDataMessageSchema, "clearIndexData"],
		["requestCodeIndexSecretStatus", requestCodeIndexSecretStatusMessageSchema, "requestCodeIndexSecretStatus"],
		["requestIndexingStatus", requestIndexingStatusMessageSchema, "requestIndexingStatus"],
		["startIndexing", startIndexingMessageSchema, "startIndexing"],
		["stopIndexing", stopIndexingMessageSchema, "stopIndexing"],
	] as const

	it.each(emptySchemas)("%s accepts a valid message", (_name, schema, type) => {
		const result = schema.safeParse({ type })
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.type).toBe(type)
		}
	})

	it.each(emptySchemas)("%s rejects a message with the wrong type literal", (_name, schema, _type) => {
		expect(schema.safeParse({ type: "setAutoEnableDefault" }).success).toBe(false)
	})

	it.each(emptySchemas)("%s rejects a non-object payload", (_name, schema, _type) => {
		expect(schema.safeParse(null).success).toBe(false)
		expect(schema.safeParse("clearIndexData").success).toBe(false)
	})
})

describe("codeIndexMessageSchema (discriminated union)", () => {
	it("narrows to saveCodeIndexSettingsAtomic with the typed settings", () => {
		const parsed = codeIndexMessageSchema.safeParse({
			type: "saveCodeIndexSettingsAtomic",
			codeIndexSettings: validSettings,
		})
		expect(parsed.success).toBe(true)
		if (parsed.success && parsed.data.type === "saveCodeIndexSettingsAtomic") {
			expect(parsed.data.codeIndexSettings.codebaseIndexEnabled).toBe(true)
			expect(parsed.data.codeIndexSettings.codebaseIndexEmbedderProvider).toBe("openai")
		}
	})

	it("narrows to setAutoEnableDefault", () => {
		const parsed = codeIndexMessageSchema.safeParse({ type: "setAutoEnableDefault", bool: true })
		expect(parsed.success).toBe(true)
		if (parsed.success && parsed.data.type === "setAutoEnableDefault") {
			expect(parsed.data.bool).toBe(true)
		}
	})

	it("narrows to toggleWorkspaceIndexing", () => {
		const parsed = codeIndexMessageSchema.safeParse({ type: "toggleWorkspaceIndexing", bool: false })
		expect(parsed.success).toBe(true)
		if (parsed.success && parsed.data.type === "toggleWorkspaceIndexing") {
			expect(parsed.data.bool).toBe(false)
		}
	})

	it("narrows to an empty-payload member (requestIndexingStatus)", () => {
		const parsed = codeIndexMessageSchema.safeParse({ type: "requestIndexingStatus" })
		expect(parsed.success).toBe(true)
		if (parsed.success) {
			expect(parsed.data.type).toBe("requestIndexingStatus")
		}
	})

	it("rejects malformed members (saveCodeIndexSettingsAtomic missing required field)", () => {
		expect(codeIndexMessageSchema.safeParse({ type: "saveCodeIndexSettingsAtomic" }).success).toBe(false)
		expect(
			codeIndexMessageSchema.safeParse({
				type: "saveCodeIndexSettingsAtomic",
				codeIndexSettings: { ...validSettings, codebaseIndexEmbedderProvider: "nope" },
			}).success,
		).toBe(false)
	})

	it("rejects a type outside the domain", () => {
		expect(codeIndexMessageSchema.safeParse({ type: "newTask", text: "hi" }).success).toBe(false)
	})
})

describe("parseWebviewMessage boundary for code-index", () => {
	it("accepts a valid requestIndexingStatus message at the boundary", () => {
		const result = parseWebviewMessage({ type: "requestIndexingStatus" })
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.message.type).toBe("requestIndexingStatus")
		}
	})

	it("accepts a valid saveCodeIndexSettingsAtomic message at the boundary", () => {
		const result = parseWebviewMessage({
			type: "saveCodeIndexSettingsAtomic",
			codeIndexSettings: validSettings,
		})
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.message.type).toBe("saveCodeIndexSettingsAtomic")
		}
	})

	it("rejects a malformed saveCodeIndexSettingsAtomic (missing required field) at the boundary", () => {
		const result = parseWebviewMessage({
			type: "saveCodeIndexSettingsAtomic",
			codeIndexSettings: { ...validSettings, codebaseIndexEnabled: undefined },
		})
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.error).toContain("saveCodeIndexSettingsAtomic")
		}
	})

	it("rejects an invalid embedder provider at the boundary", () => {
		const result = parseWebviewMessage({
			type: "saveCodeIndexSettingsAtomic",
			codeIndexSettings: { ...validSettings, codebaseIndexEmbedderProvider: "bogus" },
		})
		expect(result.ok).toBe(false)
	})

	it("rejects a non-boolean bool on toggleWorkspaceIndexing at the boundary", () => {
		const result = parseWebviewMessage({ type: "toggleWorkspaceIndexing", bool: "on" })
		expect(result.ok).toBe(false)
	})
})
