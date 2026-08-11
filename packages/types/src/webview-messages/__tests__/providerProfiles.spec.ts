import { describe, it, expect } from "vitest"

import {
	deleteApiConfigurationMessageSchema,
	enhancementApiConfigIdMessageSchema,
	getListApiConfigurationMessageSchema,
	kimiCodeSignInMessageSchema,
	kimiCodeSignOutMessageSchema,
	loadApiConfigurationMessageSchema,
	loadApiConfigurationByIdMessageSchema,
	lockApiConfigAcrossModesMessageSchema,
	openAiCodexSignInMessageSchema,
	openAiCodexSignOutMessageSchema,
	renameApiConfigurationMessageSchema,
	requestOpenAiCodexRateLimitsMessageSchema,
	toggleApiConfigPinMessageSchema,
	providerProfilesMessageSchema,
	parseWebviewMessage,
} from "../index.js"

const validApiConfig = { apiProvider: "anthropic", apiKey: "test-key" }

const emptyPayloadSchemas = [
	{ schema: getListApiConfigurationMessageSchema, type: "getListApiConfiguration" },
	{ schema: kimiCodeSignInMessageSchema, type: "kimiCodeSignIn" },
	{ schema: kimiCodeSignOutMessageSchema, type: "kimiCodeSignOut" },
	{ schema: openAiCodexSignInMessageSchema, type: "openAiCodexSignIn" },
	{ schema: openAiCodexSignOutMessageSchema, type: "openAiCodexSignOut" },
	{ schema: requestOpenAiCodexRateLimitsMessageSchema, type: "requestOpenAiCodexRateLimits" },
] as const

describe("provider-profiles message schemas", () => {
	it.each([
		[
			"deleteApiConfiguration",
			deleteApiConfigurationMessageSchema,
			{ type: "deleteApiConfiguration", text: "cfg" },
		],
		[
			"enhancementApiConfigId",
			enhancementApiConfigIdMessageSchema,
			{ type: "enhancementApiConfigId", text: "cfg" },
		],
		["loadApiConfiguration", loadApiConfigurationMessageSchema, { type: "loadApiConfiguration", text: "cfg" }],
		[
			"loadApiConfigurationById",
			loadApiConfigurationByIdMessageSchema,
			{ type: "loadApiConfigurationById", text: "id-1" },
		],
		[
			"lockApiConfigAcrossModes",
			lockApiConfigAcrossModesMessageSchema,
			{ type: "lockApiConfigAcrossModes", bool: true },
		],
		[
			"renameApiConfiguration",
			renameApiConfigurationMessageSchema,
			{
				type: "renameApiConfiguration",
				values: { oldName: "old", newName: "new" },
				apiConfiguration: validApiConfig,
			},
		],
		["toggleApiConfigPin", toggleApiConfigPinMessageSchema, { type: "toggleApiConfigPin", text: "id-1" }],
	])("accepts a valid %s message", (_name, schema, raw) => {
		expect(schema.safeParse(raw).success).toBe(true)
	})

	it.each(emptyPayloadSchemas)("accepts an empty-payload %s message", ({ schema, type }) => {
		expect(schema.safeParse({ type }).success).toBe(true)
	})

	it("accepts optional fields omitted (matches interface optionality)", () => {
		expect(deleteApiConfigurationMessageSchema.safeParse({ type: "deleteApiConfiguration" }).success).toBe(true)
		expect(lockApiConfigAcrossModesMessageSchema.safeParse({ type: "lockApiConfigAcrossModes" }).success).toBe(true)
		expect(renameApiConfigurationMessageSchema.safeParse({ type: "renameApiConfiguration" }).success).toBe(true)
	})

	it("retains provider-specific passthrough fields on renameApiConfiguration", () => {
		const result = renameApiConfigurationMessageSchema.safeParse({
			type: "renameApiConfiguration",
			values: { oldName: "old", newName: "new" },
			apiConfiguration: { ...validApiConfig, someProviderField: "x" },
		})
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.apiConfiguration).toMatchObject({ someProviderField: "x" })
		}
	})
})

describe("provider-profiles malformed payloads", () => {
	it.each([
		{ type: "deleteApiConfiguration", text: 42 },
		{ type: "enhancementApiConfigId", text: {} },
		{ type: "loadApiConfiguration", text: ["not-a-string"] },
		{ type: "loadApiConfigurationById", text: null },
		{ type: "toggleApiConfigPin", text: 123 },
	])("rejects non-string text %j", (raw) => {
		expect(deleteApiConfigurationMessageSchema.safeParse(raw).success).toBe(false)
	})

	it("rejects a non-boolean bool", () => {
		expect(
			lockApiConfigAcrossModesMessageSchema.safeParse({ type: "lockApiConfigAcrossModes", bool: "yes" }).success,
		).toBe(false)
		expect(
			lockApiConfigAcrossModesMessageSchema.safeParse({ type: "lockApiConfigAcrossModes", bool: 1 }).success,
		).toBe(false)
	})

	it("rejects renameApiConfiguration with a non-object values", () => {
		expect(
			renameApiConfigurationMessageSchema.safeParse({
				type: "renameApiConfiguration",
				values: "not-an-object",
				apiConfiguration: validApiConfig,
			}).success,
		).toBe(false)
	})

	it("rejects renameApiConfiguration with an invalid oldName type", () => {
		expect(
			renameApiConfigurationMessageSchema.safeParse({
				type: "renameApiConfiguration",
				values: { oldName: 42, newName: "new" },
				apiConfiguration: validApiConfig,
			}).success,
		).toBe(false)
	})

	it("rejects renameApiConfiguration with a non-object apiConfiguration", () => {
		expect(
			renameApiConfigurationMessageSchema.safeParse({
				type: "renameApiConfiguration",
				values: { oldName: "old", newName: "new" },
				apiConfiguration: "nope",
			}).success,
		).toBe(false)
	})

	it("rejects renameApiConfiguration with an invalid apiProvider", () => {
		expect(
			renameApiConfigurationMessageSchema.safeParse({
				type: "renameApiConfiguration",
				values: { oldName: "old", newName: "new" },
				apiConfiguration: { apiProvider: "bogus-provider" },
			}).success,
		).toBe(false)
	})

	it("rejects a wrong type literal", () => {
		expect(
			deleteApiConfigurationMessageSchema.safeParse({ type: "loadApiConfiguration", text: "cfg" }).success,
		).toBe(false)
		expect(getListApiConfigurationMessageSchema.safeParse({ type: "kimiCodeSignIn" }).success).toBe(false)
	})
})

describe("providerProfilesMessageSchema discriminated union", () => {
	it("narrows on the type discriminator", () => {
		const parsed = providerProfilesMessageSchema.safeParse({
			type: "lockApiConfigAcrossModes",
			bool: false,
		})
		expect(parsed.success).toBe(true)
		if (parsed.success && parsed.data.type === "lockApiConfigAcrossModes") {
			expect(parsed.data.bool).toBe(false)
		}
	})

	it("rejects a malformed member", () => {
		const parsed = providerProfilesMessageSchema.safeParse({
			type: "renameApiConfiguration",
			values: { oldName: "old" },
			apiConfiguration: "nope",
		})
		expect(parsed.success).toBe(false)
	})

	it("rejects a type outside the domain", () => {
		const parsed = providerProfilesMessageSchema.safeParse({ type: "saveApiConfiguration", text: "cfg" })
		expect(parsed.success).toBe(false)
	})
})

describe("parseWebviewMessage boundary for provider profiles", () => {
	it("accepts a valid deleteApiConfiguration message", () => {
		const result = parseWebviewMessage({ type: "deleteApiConfiguration", text: "cfg" })
		expect(result.ok).toBe(true)
	})

	it("accepts a valid renameApiConfiguration message", () => {
		const result = parseWebviewMessage({
			type: "renameApiConfiguration",
			values: { oldName: "old", newName: "new" },
			apiConfiguration: validApiConfig,
		})
		expect(result.ok).toBe(true)
	})

	it("accepts a valid empty-payload getListApiConfiguration message", () => {
		const result = parseWebviewMessage({ type: "getListApiConfiguration" })
		expect(result.ok).toBe(true)
	})

	it("rejects a crafted malformed lockApiConfigAcrossModes message", () => {
		const result = parseWebviewMessage({ type: "lockApiConfigAcrossModes", bool: "yes" })
		expect(result.ok).toBe(false)
	})

	it("rejects a crafted malformed renameApiConfiguration message", () => {
		const result = parseWebviewMessage({
			type: "renameApiConfiguration",
			values: { oldName: "old", newName: "new" },
			apiConfiguration: "nope",
		})
		expect(result.ok).toBe(false)
	})

	it("rejects a crafted malformed deleteApiConfiguration message", () => {
		const result = parseWebviewMessage({ type: "deleteApiConfiguration", text: 42 })
		expect(result.ok).toBe(false)
	})
})
