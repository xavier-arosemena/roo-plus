import { describe, it, expect } from "vitest"

import {
	authenticatedUserMessageSchema,
	enhancedPromptMessageSchema,
	extensionMessageSchemas,
	lmStudioModelsMessageSchema,
	modelStatusMessageSchema,
	ollamaModelsMessageSchema,
	openAiModelsMessageSchema,
	parseExtensionMessage,
	routerModelsMessageSchema,
	singleRouterModelFetchResponseMessageSchema,
	systemPromptMessageSchema,
	terminalProfilesMessageSchema,
	vsCodeLmApiAvailableMessageSchema,
	vsCodeLmModelsMessageSchema,
	vsCodeSettingMessageSchema,
} from "../index.js"

const validModelRecord = {
	"model-x": { contextWindow: 200000, supportsPromptCache: true },
}

describe("model/status domain (Phase 2, Domain 2) schemas", () => {
	describe("valid messages", () => {
		it.each([
			[
				"routerModels",
				routerModelsMessageSchema,
				{
					type: "routerModels",
					routerModels: { openrouter: validModelRecord },
					values: { provider: "openrouter" },
				},
			],
			[
				"routerModels (no values — full push)",
				routerModelsMessageSchema,
				{ type: "routerModels", routerModels: { openrouter: validModelRecord } },
			],
			[
				"routerModels (empty record — failed provider placeholder)",
				routerModelsMessageSchema,
				{ type: "routerModels", routerModels: { openrouter: {} } },
			],
			[
				"singleRouterModelFetchResponse (failure)",
				singleRouterModelFetchResponseMessageSchema,
				{
					type: "singleRouterModelFetchResponse",
					success: false,
					error: "Invalid API key",
					values: { provider: "opencode-go" },
				},
			],
			[
				"singleRouterModelFetchResponse (failure, no error)",
				singleRouterModelFetchResponseMessageSchema,
				{ type: "singleRouterModelFetchResponse", success: false, values: { provider: "moonshot" } },
			],
			[
				"singleRouterModelFetchResponse (success)",
				singleRouterModelFetchResponseMessageSchema,
				{ type: "singleRouterModelFetchResponse", success: true },
			],
			[
				"openAiModels",
				openAiModelsMessageSchema,
				{ type: "openAiModels", openAiModels: ["gpt-4o", "gpt-4o-mini"] },
			],
			[
				"ollamaModels (partial ModelInfo retained)",
				ollamaModelsMessageSchema,
				{ type: "ollamaModels", ollamaModels: { "llama3:latest": {} } },
			],
			[
				"ollamaModels (error)",
				ollamaModelsMessageSchema,
				{ type: "ollamaModels", ollamaModels: {}, error: "Connection refused" },
			],
			[
				"lmStudioModels",
				lmStudioModelsMessageSchema,
				{ type: "lmStudioModels", lmStudioModels: { "local-model": { maxTokens: 4096 } } },
			],
			[
				"vsCodeLmModels",
				vsCodeLmModelsMessageSchema,
				{ type: "vsCodeLmModels", vsCodeLmModels: [{ vendor: "copilot", family: "gpt-4o" }] },
			],
			[
				"vsCodeSetting (boolean value)",
				vsCodeSettingMessageSchema,
				{ type: "vsCodeSetting", setting: "terminal.integrated.inheritEnv", value: true },
			],
			[
				"vsCodeSetting (number value)",
				vsCodeSettingMessageSchema,
				{ type: "vsCodeSetting", setting: "editor.tabSize", value: 4 },
			],
			[
				"vsCodeSetting (error, no value)",
				vsCodeSettingMessageSchema,
				{ type: "vsCodeSetting", setting: "terminal.integrated.inheritEnv", error: "Failed to get setting" },
			],
			["systemPrompt", systemPromptMessageSchema, { type: "systemPrompt", text: "You are Roo.", mode: "code" }],
			["systemPrompt (no mode)", systemPromptMessageSchema, { type: "systemPrompt", text: "You are Roo." }],
			[
				"enhancedPrompt (with text)",
				enhancedPromptMessageSchema,
				{ type: "enhancedPrompt", text: "Enhanced prompt" },
			],
			["enhancedPrompt (no text — error path)", enhancedPromptMessageSchema, { type: "enhancedPrompt" }],
			[
				"terminalProfiles",
				terminalProfilesMessageSchema,
				{ type: "terminalProfiles", profiles: ["Git Bash", "zsh"] },
			],
			["vsCodeLmApiAvailable (vestigial)", vsCodeLmApiAvailableMessageSchema, { type: "vsCodeLmApiAvailable" }],
			[
				"authenticatedUser (vestigial)",
				authenticatedUserMessageSchema,
				{
					type: "authenticatedUser",
					userInfo: { id: "u1", name: "Test User" },
					organizationAllowList: { allowAll: true, providers: {} },
					visibility: "public",
					errors: [],
				},
			],
			["authenticatedUser (minimal)", authenticatedUserMessageSchema, { type: "authenticatedUser" }],
		])("accepts a valid %s message", (_name, schema, raw) => {
			const result = schema.safeParse(raw)
			expect(result.success).toBe(true)
		})
	})

	describe("malformed messages", () => {
		it.each([
			["routerModels without routerModels", routerModelsMessageSchema, { type: "routerModels" }],
			[
				"routerModels with non-object routerModels",
				routerModelsMessageSchema,
				{ type: "routerModels", routerModels: "nope" },
			],
			[
				"routerModels with invalid values shape",
				routerModelsMessageSchema,
				{ type: "routerModels", routerModels: {}, values: { provider: 42 } },
			],
			[
				"singleRouterModelFetchResponse without success",
				singleRouterModelFetchResponseMessageSchema,
				{ type: "singleRouterModelFetchResponse" },
			],
			[
				"singleRouterModelFetchResponse with non-boolean success",
				singleRouterModelFetchResponseMessageSchema,
				{ type: "singleRouterModelFetchResponse", success: "yes" },
			],
			["openAiModels with non-array", openAiModelsMessageSchema, { type: "openAiModels", openAiModels: "nope" }],
			["ollamaModels with non-object", ollamaModelsMessageSchema, { type: "ollamaModels", ollamaModels: "nope" }],
			[
				"ollamaModels with non-string error",
				ollamaModelsMessageSchema,
				{ type: "ollamaModels", ollamaModels: {}, error: 42 },
			],
			[
				"lmStudioModels with non-object",
				lmStudioModelsMessageSchema,
				{ type: "lmStudioModels", lmStudioModels: "nope" },
			],
			[
				"vsCodeLmModels with non-array",
				vsCodeLmModelsMessageSchema,
				{ type: "vsCodeLmModels", vsCodeLmModels: "nope" },
			],
			["vsCodeSetting without setting", vsCodeSettingMessageSchema, { type: "vsCodeSetting", value: true }],
			[
				"vsCodeSetting with non-boolean/number value",
				vsCodeSettingMessageSchema,
				{ type: "vsCodeSetting", setting: "x", value: "yes" },
			],
			["systemPrompt without text", systemPromptMessageSchema, { type: "systemPrompt" }],
			["enhancedPrompt with non-string text", enhancedPromptMessageSchema, { type: "enhancedPrompt", text: 42 }],
			[
				"terminalProfiles with non-array profiles",
				terminalProfilesMessageSchema,
				{ type: "terminalProfiles", profiles: "nope" },
			],
			[
				"authenticatedUser with non-object userInfo",
				authenticatedUserMessageSchema,
				{ type: "authenticatedUser", userInfo: "nope" },
			],
			[
				"authenticatedUser with invalid organizationAllowList",
				authenticatedUserMessageSchema,
				{ type: "authenticatedUser", organizationAllowList: { allowAll: "yes", providers: {} } },
			],
		])("rejects a malformed %s message", (_name, schema, raw) => {
			const result = schema.safeParse(raw)
			expect(result.success).toBe(false)
		})
	})

	it("seeds the registry with all 12 model/status domain types", () => {
		const expected: Array<keyof typeof extensionMessageSchemas> = [
			"routerModels",
			"singleRouterModelFetchResponse",
			"openAiModels",
			"ollamaModels",
			"lmStudioModels",
			"vsCodeLmModels",
			"vsCodeSetting",
			"systemPrompt",
			"enhancedPrompt",
			"terminalProfiles",
			"vsCodeLmApiAvailable",
			"authenticatedUser",
		]
		for (const type of expected) {
			expect(extensionMessageSchemas[type]).toBeDefined()
		}
	})

	it("builds a discriminated union over the model/status domain", () => {
		const parsed = modelStatusMessageSchema.safeParse({
			type: "systemPrompt",
			text: "You are Roo.",
			mode: "code",
		})
		expect(parsed.success).toBe(true)
		if (parsed.success) {
			expect(parsed.data.type).toBe("systemPrompt")
		}
	})

	it("parses through the shared boundary (registered types fail loudly when malformed)", () => {
		expect(parseExtensionMessage({ type: "terminalProfiles", profiles: ["Git Bash"] }).ok).toBe(true)
		const malformed = parseExtensionMessage({ type: "ollamaModels" })
		expect(malformed.ok).toBe(false)
		if (!malformed.ok) {
			expect(malformed.error).toContain("ollamaModels")
		}
		// Unregistered types still pass through structurally.
		expect(parseExtensionMessage({ type: "mcpServers", mcpServers: [] }).ok).toBe(true)
	})

	it("retains unknown ModelInfo fields on the model record (transitional passthrough)", () => {
		const result = routerModelsMessageSchema.safeParse({
			type: "routerModels",
			routerModels: {
				openrouter: { "model-x": { contextWindow: 200000, supportsPromptCache: true, someFutureField: 123 } },
			},
		})
		expect(result.success).toBe(true)
		if (result.success) {
			const model = result.data.routerModels["openrouter"]?.["model-x"]
			expect((model as Record<string, unknown> | undefined)?.someFutureField).toBe(123)
		}
	})
})
