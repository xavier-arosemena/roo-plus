import { describe, it, expect } from "vitest"

import {
	installMarketplaceItemMessageSchema,
	installMarketplaceItemsMessageSchema,
	installMarketplaceItemWithParametersMessageSchema,
	parseWebviewMessage,
} from "../index.js"

const modeItem = {
	id: "item-1",
	name: "Item 1",
	description: "Test mode item",
	type: "mode",
	content: "slug: item-1",
}

describe("installMarketplaceItemMessageSchema", () => {
	it("accepts a valid message", () => {
		const result = installMarketplaceItemMessageSchema.safeParse({
			type: "installMarketplaceItem",
			mpItem: modeItem,
			mpInstallOptions: { target: "project" },
		})
		expect(result.success).toBe(true)
	})

	it("accepts a message without install options", () => {
		const result = installMarketplaceItemMessageSchema.safeParse({
			type: "installMarketplaceItem",
			mpItem: modeItem,
		})
		expect(result.success).toBe(true)
	})

	it.each([
		{ type: "installMarketplaceItem", mpItem: "nope" },
		{ type: "installMarketplaceItem", mpItem: { id: "x" }, mpInstallOptions: { target: "project" } },
		{ type: "installMarketplaceItem", mpItem: modeItem, mpInstallOptions: { target: "bogus" } },
	])("rejects malformed payload %j", (raw) => {
		expect(installMarketplaceItemMessageSchema.safeParse(raw).success).toBe(false)
	})
})

describe("installMarketplaceItemsMessageSchema", () => {
	it("accepts a valid message", () => {
		const result = installMarketplaceItemsMessageSchema.safeParse({
			type: "installMarketplaceItems",
			mpItems: [modeItem],
			mpInstallOptions: { target: "global" },
		})
		expect(result.success).toBe(true)
	})

	it("rejects an empty mpItems array", () => {
		expect(
			installMarketplaceItemsMessageSchema.safeParse({ type: "installMarketplaceItems", mpItems: [] }).success,
		).toBe(false)
	})

	it("rejects a non-array mpItems", () => {
		expect(
			installMarketplaceItemsMessageSchema.safeParse({ type: "installMarketplaceItems", mpItems: modeItem })
				.success,
		).toBe(false)
	})
})

describe("installMarketplaceItemWithParametersMessageSchema", () => {
	it("accepts a valid message", () => {
		const result = installMarketplaceItemWithParametersMessageSchema.safeParse({
			type: "installMarketplaceItemWithParameters",
			payload: { item: modeItem, parameters: { key: "value" } },
		})
		expect(result.success).toBe(true)
	})

	it("accepts a payload without parameters", () => {
		const result = installMarketplaceItemWithParametersMessageSchema.safeParse({
			type: "installMarketplaceItemWithParameters",
			payload: { item: modeItem },
		})
		expect(result.success).toBe(true)
	})

	it("rejects a payload without an item", () => {
		expect(
			installMarketplaceItemWithParametersMessageSchema.safeParse({
				type: "installMarketplaceItemWithParameters",
				payload: { parameters: { key: "value" } },
			}).success,
		).toBe(false)
	})
})

describe("parseWebviewMessage boundary for marketplace installs", () => {
	it("accepts a valid installMarketplaceItem message", () => {
		const result = parseWebviewMessage({ type: "installMarketplaceItem", mpItem: modeItem })
		expect(result.ok).toBe(true)
	})

	it("rejects a crafted malformed installMarketplaceItem message", () => {
		const result = parseWebviewMessage({ type: "installMarketplaceItem", mpItem: "nope" })
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.error).toContain("installMarketplaceItem")
		}
	})
})
