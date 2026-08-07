import { describe, it, expect } from "vitest"

import {
	fetchMarketplaceDataMessageSchema,
	filterMarketplaceItemsMessageSchema,
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

describe("fetchMarketplaceDataMessageSchema", () => {
	it("accepts the empty-payload fetch request", () => {
		expect(fetchMarketplaceDataMessageSchema.safeParse({ type: "fetchMarketplaceData" }).success).toBe(true)
	})

	it("rejects a message missing the type", () => {
		expect(fetchMarketplaceDataMessageSchema.safeParse({}).success).toBe(false)
	})

	it("rejects a message with a different type", () => {
		expect(fetchMarketplaceDataMessageSchema.safeParse({ type: "fetchMarketplaceData2" }).success).toBe(false)
	})
})

describe("filterMarketplaceItemsMessageSchema", () => {
	it("accepts a message with all filter fields", () => {
		const result = filterMarketplaceItemsMessageSchema.safeParse({
			type: "filterMarketplaceItems",
			filters: { type: "mcp", search: "server", tags: ["test", "tools"] },
		})
		expect(result.success).toBe(true)
	})

	it("accepts a message with empty filters", () => {
		const result = filterMarketplaceItemsMessageSchema.safeParse({
			type: "filterMarketplaceItems",
			filters: {},
		})
		expect(result.success).toBe(true)
	})

	it("accepts a message without filters", () => {
		const result = filterMarketplaceItemsMessageSchema.safeParse({ type: "filterMarketplaceItems" })
		expect(result.success).toBe(true)
	})

	it("accepts the real sender payload including extra fields (regression guard)", () => {
		// The webview sender (MarketplaceViewStateManager UPDATE_FILTERS) always
		// includes `installed`; the schema must never be stricter than the sender.
		const result = filterMarketplaceItemsMessageSchema.safeParse({
			type: "filterMarketplaceItems",
			filters: { type: "mcp", search: "", tags: [], installed: "all" },
		})
		expect(result.success).toBe(true)
	})

	it.each([
		{ type: "filterMarketplaceItems", filters: { search: 42 } },
		{ type: "filterMarketplaceItems", filters: { tags: "not-an-array" } },
		{ type: "filterMarketplaceItems", filters: { type: 7 } },
	])("rejects malformed filter payload %j", (raw) => {
		expect(filterMarketplaceItemsMessageSchema.safeParse(raw).success).toBe(false)
	})

	it("rejects a message missing the type", () => {
		expect(filterMarketplaceItemsMessageSchema.safeParse({ filters: {} }).success).toBe(false)
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

describe("parseWebviewMessage boundary for marketplace fetch/filter", () => {
	it("accepts a valid fetchMarketplaceData message", () => {
		const result = parseWebviewMessage({ type: "fetchMarketplaceData" })
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.message.type).toBe("fetchMarketplaceData")
		}
	})

	it("rejects a fetchMarketplaceData message missing the type", () => {
		const result = parseWebviewMessage({})
		expect(result.ok).toBe(false)
	})

	it("accepts a valid filterMarketplaceItems message with filters", () => {
		const result = parseWebviewMessage({
			type: "filterMarketplaceItems",
			filters: { type: "mcp", search: "test", tags: ["a"] },
		})
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.message.type).toBe("filterMarketplaceItems")
		}
	})

	it("accepts a valid filterMarketplaceItems message without filters", () => {
		const result = parseWebviewMessage({ type: "filterMarketplaceItems" })
		expect(result.ok).toBe(true)
	})

	it("accepts the real sender filterMarketplaceItems payload (regression guard)", () => {
		const result = parseWebviewMessage({
			type: "filterMarketplaceItems",
			filters: { type: "mcp", search: "", tags: [], installed: "all" },
		})
		expect(result.ok).toBe(true)
	})

	it("rejects a filterMarketplaceItems message with a non-string search", () => {
		const result = parseWebviewMessage({
			type: "filterMarketplaceItems",
			filters: { search: 42 },
		})
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.error).toContain("filterMarketplaceItems")
		}
	})
})
