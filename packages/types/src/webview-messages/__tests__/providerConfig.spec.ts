import { describe, it, expect } from "vitest"

import {
	saveApiConfigurationMessageSchema,
	upsertApiConfigurationMessageSchema,
	parseWebviewMessage,
} from "../index.js"

const validApiConfig = { apiProvider: "anthropic", apiKey: "test-key" }

describe("saveApiConfigurationMessageSchema", () => {
	it("accepts a valid message", () => {
		const result = saveApiConfigurationMessageSchema.safeParse({
			type: "saveApiConfiguration",
			text: "test-config",
			apiConfiguration: validApiConfig,
		})
		expect(result.success).toBe(true)
	})

	it("retains provider-specific passthrough fields", () => {
		const result = saveApiConfigurationMessageSchema.safeParse({
			type: "saveApiConfiguration",
			text: "test-config",
			apiConfiguration: { ...validApiConfig, someProviderField: "x" },
		})
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.apiConfiguration).toMatchObject({ someProviderField: "x" })
		}
	})

	it.each([
		{ type: "saveApiConfiguration", apiConfiguration: validApiConfig },
		{ type: "saveApiConfiguration", text: 42, apiConfiguration: validApiConfig },
		{ type: "saveApiConfiguration", text: "test-config", apiConfiguration: "nope" },
		{ type: "saveApiConfiguration", text: "test-config", apiConfiguration: { apiProvider: "not-a-provider" } },
	])("rejects malformed payload %j", (raw) => {
		expect(saveApiConfigurationMessageSchema.safeParse(raw).success).toBe(false)
	})
})

describe("upsertApiConfigurationMessageSchema", () => {
	it("accepts a valid message", () => {
		const result = upsertApiConfigurationMessageSchema.safeParse({
			type: "upsertApiConfiguration",
			text: "default",
			apiConfiguration: validApiConfig,
		})
		expect(result.success).toBe(true)
	})

	it("rejects a non-string text", () => {
		expect(
			upsertApiConfigurationMessageSchema.safeParse({
				type: "upsertApiConfiguration",
				text: 123,
				apiConfiguration: validApiConfig,
			}).success,
		).toBe(false)
	})
})

describe("parseWebviewMessage boundary for provider config", () => {
	it("accepts a valid saveApiConfiguration message", () => {
		const result = parseWebviewMessage({
			type: "saveApiConfiguration",
			text: "test-config",
			apiConfiguration: validApiConfig,
		})
		expect(result.ok).toBe(true)
	})

	it("rejects a crafted malformed saveApiConfiguration message", () => {
		const result = parseWebviewMessage({ type: "saveApiConfiguration", text: "test-config", apiConfiguration: "x" })
		expect(result.ok).toBe(false)
	})

	it("rejects a crafted malformed upsertApiConfiguration message", () => {
		const result = parseWebviewMessage({
			type: "upsertApiConfiguration",
			text: "default",
			apiConfiguration: { apiProvider: "bogus" },
		})
		expect(result.ok).toBe(false)
	})
})
