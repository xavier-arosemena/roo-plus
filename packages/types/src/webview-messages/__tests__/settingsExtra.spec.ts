import { describe, it, expect } from "vitest"

import {
	autoApprovalEnabledMessageSchema,
	checkRulesDirectoryMessageSchema,
	customInstructionsMessageSchema,
	debugSettingMessageSchema,
	exportModeMessageSchema,
	exportSettingsMessageSchema,
	flushRouterModelsMessageSchema,
	getVSCodeSettingMessageSchema,
	hasOpenedModeSelectorMessageSchema,
	importModeMessageSchema,
	importSettingsMessageSchema,
	modeMessageSchema,
	openCustomModesSettingsMessageSchema,
	requestLmStudioModelsMessageSchema,
	requestOllamaModelsMessageSchema,
	requestOpenAiModelsMessageSchema,
	requestRooModelsMessageSchema,
	requestRouterModelsMessageSchema,
	requestVsCodeLmModelsMessageSchema,
	telemetrySettingMessageSchema,
	updatePromptMessageSchema,
	updateVSCodeSettingMessageSchema,
	settingsExtraMessageSchema,
	parseWebviewMessage,
} from "../index.js"

const emptyPayloadSchemas = [
	{ schema: exportSettingsMessageSchema, type: "exportSettings" },
	{ schema: importSettingsMessageSchema, type: "importSettings" },
	{ schema: openCustomModesSettingsMessageSchema, type: "openCustomModesSettings" },
	{ schema: requestRooModelsMessageSchema, type: "requestRooModels" },
	{ schema: requestVsCodeLmModelsMessageSchema, type: "requestVsCodeLmModels" },
] as const

describe("settings-extra message schemas", () => {
	it.each([
		["autoApprovalEnabled", autoApprovalEnabledMessageSchema, { type: "autoApprovalEnabled", bool: true }],
		["checkRulesDirectory", checkRulesDirectoryMessageSchema, { type: "checkRulesDirectory", slug: "architect" }],
		["customInstructions", customInstructionsMessageSchema, { type: "customInstructions", text: "do the thing" }],
		["debugSetting", debugSettingMessageSchema, { type: "debugSetting", bool: true }],
		["exportMode", exportModeMessageSchema, { type: "exportMode", slug: "code" }],
		["flushRouterModels", flushRouterModelsMessageSchema, { type: "flushRouterModels", text: "openrouter" }],
		["getVSCodeSetting", getVSCodeSettingMessageSchema, { type: "getVSCodeSetting", setting: "editor.fontSize" }],
		["hasOpenedModeSelector", hasOpenedModeSelectorMessageSchema, { type: "hasOpenedModeSelector", bool: true }],
		["importMode", importModeMessageSchema, { type: "importMode", source: "global" }],
		["mode", modeMessageSchema, { type: "mode", text: "code" }],
		["telemetrySetting", telemetrySettingMessageSchema, { type: "telemetrySetting", text: "enabled" }],
		[
			"updatePrompt",
			updatePromptMessageSchema,
			{ type: "updatePrompt", promptMode: "code", customPrompt: { roleDefinition: "You are a coder" } },
		],
		[
			"updateVSCodeSetting (number)",
			updateVSCodeSettingMessageSchema,
			{ type: "updateVSCodeSetting", setting: "terminal.integrated.inheritEnv", value: 1 },
		],
		[
			"updateVSCodeSetting (boolean — live sender shape)",
			updateVSCodeSettingMessageSchema,
			{ type: "updateVSCodeSetting", setting: "terminal.integrated.inheritEnv", value: true },
		],
	])("accepts a valid %s message", (_name, schema, raw) => {
		expect(schema.safeParse(raw).success).toBe(true)
	})

	it.each(emptyPayloadSchemas)("accepts an empty-payload %s message", ({ schema, type }) => {
		expect(schema.safeParse({ type }).success).toBe(true)
	})

	it("accepts optional fields omitted (matches interface optionality)", () => {
		expect(customInstructionsMessageSchema.safeParse({ type: "customInstructions" }).success).toBe(true)
		expect(autoApprovalEnabledMessageSchema.safeParse({ type: "autoApprovalEnabled" }).success).toBe(true)
		expect(importModeMessageSchema.safeParse({ type: "importMode" }).success).toBe(true)
		expect(updateVSCodeSettingMessageSchema.safeParse({ type: "updateVSCodeSetting" }).success).toBe(true)
		expect(updatePromptMessageSchema.safeParse({ type: "updatePrompt" }).success).toBe(true)
	})
})

describe("settings-extra model-fetch values records", () => {
	it("accepts a full requestRouterModels values record (all credentials)", () => {
		const result = requestRouterModelsMessageSchema.safeParse({
			type: "requestRouterModels",
			values: {
				provider: "kimi-code",
				refresh: true,
				litellmApiKey: "k1",
				litellmBaseUrl: "u1",
				poeApiKey: "k2",
				poeBaseUrl: "u2",
				deepSeekApiKey: "k3",
				deepSeekBaseUrl: "u3",
				moonshotApiKey: "k4",
				moonshotBaseUrl: "u4",
				opencodeGoApiKey: "k5",
				kenariApiKey: "k6",
				kimiCodeAuthMethod: "api-key",
				kimiCodeApiKey: "k7",
			},
		})
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.values?.provider).toBe("kimi-code")
			expect(result.data.values?.refresh).toBe(true)
			expect(result.data.values?.litellmApiKey).toBe("k1")
			expect(result.data.values?.kimiCodeApiKey).toBe("k7")
		}
	})

	it("accepts a provider-only requestRouterModels values record", () => {
		expect(
			requestRouterModelsMessageSchema.safeParse({
				type: "requestRouterModels",
				values: { provider: "unbound", refresh: true },
			}).success,
		).toBe(true)
	})

	it("accepts requestOllamaModels with baseUrl+apiKey values", () => {
		expect(
			requestOllamaModelsMessageSchema.safeParse({
				type: "requestOllamaModels",
				values: { baseUrl: "http://localhost:11434", apiKey: "sk-1" },
			}).success,
		).toBe(true)
	})

	it("accepts requestLmStudioModels with a baseUrl override", () => {
		expect(
			requestLmStudioModelsMessageSchema.safeParse({
				type: "requestLmStudioModels",
				values: { baseUrl: "http://127.0.0.1:1234" },
			}).success,
		).toBe(true)
	})

	it("accepts requestOpenAiModels with baseUrl+apiKey+openAiHeaders", () => {
		const result = requestOpenAiModelsMessageSchema.safeParse({
			type: "requestOpenAiModels",
			values: { baseUrl: "https://api.openai.com/v1", apiKey: "sk-1", openAiHeaders: { "X-Custom": "v" } },
		})
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.values?.openAiHeaders).toEqual({ "X-Custom": "v" })
		}
	})

	it("strips unknown sender-only values fields (e.g. requestOpenAiModels customHeaders) without rejecting", () => {
		// The webview ApiOptions sender includes a reserved `customHeaders` field;
		// it is not part of the typed record but must not break the boundary.
		const result = requestOpenAiModelsMessageSchema.safeParse({
			type: "requestOpenAiModels",
			values: { baseUrl: "https://api.openai.com/v1", apiKey: "sk-1", customHeaders: {} },
		})
		expect(result.success).toBe(true)
	})
})

describe("settings-extra malformed payloads", () => {
	it.each([
		{ type: "customInstructions", text: 42 },
		{ type: "flushRouterModels", text: {} },
		{ type: "mode", text: ["not-a-string"] },
		{ type: "telemetrySetting", text: null },
	])("rejects non-string text %j", (raw) => {
		expect(customInstructionsMessageSchema.safeParse(raw).success).toBe(false)
		expect(flushRouterModelsMessageSchema.safeParse(raw).success).toBe(false)
		expect(modeMessageSchema.safeParse(raw).success).toBe(false)
		expect(telemetrySettingMessageSchema.safeParse(raw).success).toBe(false)
	})

	it("rejects non-string setting/slug", () => {
		expect(getVSCodeSettingMessageSchema.safeParse({ type: "getVSCodeSetting", setting: 42 }).success).toBe(false)
		expect(updateVSCodeSettingMessageSchema.safeParse({ type: "updateVSCodeSetting", setting: {} }).success).toBe(
			false,
		)
		expect(checkRulesDirectoryMessageSchema.safeParse({ type: "checkRulesDirectory", slug: 42 }).success).toBe(
			false,
		)
		expect(exportModeMessageSchema.safeParse({ type: "exportMode", slug: ["x"] }).success).toBe(false)
	})

	it("rejects non-boolean bool", () => {
		expect(autoApprovalEnabledMessageSchema.safeParse({ type: "autoApprovalEnabled", bool: "yes" }).success).toBe(
			false,
		)
		expect(debugSettingMessageSchema.safeParse({ type: "debugSetting", bool: 1 }).success).toBe(false)
		expect(
			hasOpenedModeSelectorMessageSchema.safeParse({ type: "hasOpenedModeSelector", bool: "true" }).success,
		).toBe(false)
	})

	it("rejects a non-number/non-boolean updateVSCodeSetting value", () => {
		expect(
			updateVSCodeSettingMessageSchema.safeParse({
				type: "updateVSCodeSetting",
				setting: "terminal.integrated.inheritEnv",
				value: "yes",
			}).success,
		).toBe(false)
		expect(
			updateVSCodeSettingMessageSchema.safeParse({
				type: "updateVSCodeSetting",
				setting: "terminal.integrated.inheritEnv",
				value: { nested: true },
			}).success,
		).toBe(false)
	})

	it("rejects an invalid importMode source enum", () => {
		expect(importModeMessageSchema.safeParse({ type: "importMode", source: "workspace" }).success).toBe(false)
		expect(importModeMessageSchema.safeParse({ type: "importMode", source: 42 }).success).toBe(false)
	})

	it("rejects requestRouterModels with a non-object values", () => {
		expect(
			requestRouterModelsMessageSchema.safeParse({ type: "requestRouterModels", values: "not-an-object" })
				.success,
		).toBe(false)
	})

	it("rejects requestRouterModels with a non-string provider", () => {
		expect(
			requestRouterModelsMessageSchema.safeParse({ type: "requestRouterModels", values: { provider: 42 } })
				.success,
		).toBe(false)
	})

	it("rejects requestRouterModels with a non-boolean refresh", () => {
		expect(
			requestRouterModelsMessageSchema.safeParse({ type: "requestRouterModels", values: { refresh: "yes" } })
				.success,
		).toBe(false)
	})

	it("rejects a non-string credential in requestRouterModels values", () => {
		expect(
			requestRouterModelsMessageSchema.safeParse({
				type: "requestRouterModels",
				values: { litellmApiKey: 42 },
			}).success,
		).toBe(false)
	})

	it("rejects malformed values in the other model-fetch records", () => {
		expect(
			requestOllamaModelsMessageSchema.safeParse({ type: "requestOllamaModels", values: "nope" }).success,
		).toBe(false)
		expect(
			requestOllamaModelsMessageSchema.safeParse({ type: "requestOllamaModels", values: { apiKey: 42 } }).success,
		).toBe(false)
		expect(
			requestLmStudioModelsMessageSchema.safeParse({ type: "requestLmStudioModels", values: [] }).success,
		).toBe(false)
		expect(
			requestOpenAiModelsMessageSchema.safeParse({
				type: "requestOpenAiModels",
				values: { openAiHeaders: { "X-A": 1 } },
			}).success,
		).toBe(false)
	})

	it("rejects a malformed updatePrompt customPrompt", () => {
		expect(
			updatePromptMessageSchema.safeParse({
				type: "updatePrompt",
				promptMode: "code",
				customPrompt: { roleDefinition: 42 },
			}).success,
		).toBe(false)
	})

	it("rejects a wrong type literal", () => {
		expect(modeMessageSchema.safeParse({ type: "updatePrompt", text: "code" }).success).toBe(false)
		expect(importSettingsMessageSchema.safeParse({ type: "exportSettings" }).success).toBe(false)
	})
})

describe("settingsExtraMessageSchema discriminated union", () => {
	it("narrows on the type discriminator", () => {
		const parsed = settingsExtraMessageSchema.safeParse({
			type: "requestRouterModels",
			values: { provider: "openrouter", refresh: true },
		})
		expect(parsed.success).toBe(true)
		if (parsed.success && parsed.data.type === "requestRouterModels") {
			expect(parsed.data.values?.provider).toBe("openrouter")
			expect(parsed.data.values?.refresh).toBe(true)
		}
	})

	it("rejects a malformed member", () => {
		const parsed = settingsExtraMessageSchema.safeParse({ type: "updateVSCodeSetting", value: "yes" })
		expect(parsed.success).toBe(false)
	})

	it("rejects a type outside the domain", () => {
		const parsed = settingsExtraMessageSchema.safeParse({ type: "updateSettings" })
		expect(parsed.success).toBe(false)
	})
})

describe("parseWebviewMessage boundary for settings-extra messages", () => {
	it("accepts a valid requestRouterModels message", () => {
		const result = parseWebviewMessage({ type: "requestRouterModels", values: { provider: "openrouter" } })
		expect(result.ok).toBe(true)
	})

	it("accepts a valid empty-payload exportSettings message", () => {
		const result = parseWebviewMessage({ type: "exportSettings" })
		expect(result.ok).toBe(true)
	})

	it("accepts a valid updateVSCodeSetting boolean value (live sender shape)", () => {
		const result = parseWebviewMessage({
			type: "updateVSCodeSetting",
			setting: "terminal.integrated.inheritEnv",
			value: true,
		})
		expect(result.ok).toBe(true)
	})

	it("rejects a crafted malformed requestRouterModels message (non-object values)", () => {
		const result = parseWebviewMessage({ type: "requestRouterModels", values: "not-an-object" })
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.error).toContain("requestRouterModels")
		}
	})

	it("rejects a crafted malformed mode message (non-string text)", () => {
		const result = parseWebviewMessage({ type: "mode", text: 42 })
		expect(result.ok).toBe(false)
	})

	it("rejects a crafted malformed importMode message (invalid source enum)", () => {
		const result = parseWebviewMessage({ type: "importMode", source: "workspace" })
		expect(result.ok).toBe(false)
	})
})
