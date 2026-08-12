import { describe, it, expect } from "vitest"

import {
	fetchMarketplaceDataMessageSchema,
	filterMarketplaceItemsMessageSchema,
	installMarketplaceItemMessageSchema,
	installMarketplaceItemsMessageSchema,
	installMarketplaceItemWithParametersMessageSchema,
	marketplaceMessageSchema,
	parseWebviewMessage,
	removeInstalledMarketplaceItemMessageSchema,
	showMdmAuthRequiredNotificationMessageSchema,
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

describe("removeInstalledMarketplaceItemMessageSchema", () => {
	it("accepts a valid message with both fields", () => {
		const result = removeInstalledMarketplaceItemMessageSchema.safeParse({
			type: "removeInstalledMarketplaceItem",
			mpItem: modeItem,
			mpInstallOptions: { target: "project" },
		})
		expect(result.success).toBe(true)
	})

	it("accepts a message with global install options", () => {
		const result = removeInstalledMarketplaceItemMessageSchema.safeParse({
			type: "removeInstalledMarketplaceItem",
			mpItem: modeItem,
			mpInstallOptions: { target: "global" },
		})
		expect(result.success).toBe(true)
	})

	it("rejects a message missing mpItem", () => {
		expect(
			removeInstalledMarketplaceItemMessageSchema.safeParse({
				type: "removeInstalledMarketplaceItem",
				mpInstallOptions: { target: "project" },
			}).success,
		).toBe(false)
	})

	it("rejects a message missing mpInstallOptions", () => {
		expect(
			removeInstalledMarketplaceItemMessageSchema.safeParse({
				type: "removeInstalledMarketplaceItem",
				mpItem: modeItem,
			}).success,
		).toBe(false)
	})

	it.each([
		{ type: "removeInstalledMarketplaceItem", mpItem: "nope", mpInstallOptions: { target: "project" } },
		{ type: "removeInstalledMarketplaceItem", mpItem: { id: "x" }, mpInstallOptions: { target: "project" } },
		{ type: "removeInstalledMarketplaceItem", mpItem: modeItem, mpInstallOptions: { target: "bogus" } },
	])("rejects malformed removal payload %j", (raw) => {
		expect(removeInstalledMarketplaceItemMessageSchema.safeParse(raw).success).toBe(false)
	})
})

describe("showMdmAuthRequiredNotificationMessageSchema", () => {
	it("accepts the empty-payload notification", () => {
		const result = showMdmAuthRequiredNotificationMessageSchema.safeParse({
			type: "showMdmAuthRequiredNotification",
		})
		expect(result.success).toBe(true)
	})

	it("rejects a message missing the type", () => {
		expect(showMdmAuthRequiredNotificationMessageSchema.safeParse({}).success).toBe(false)
	})

	it("rejects a message with a different type", () => {
		expect(
			showMdmAuthRequiredNotificationMessageSchema.safeParse({ type: "showMdmAuthRequiredNotification2" })
				.success,
		).toBe(false)
	})
})

describe("marketplaceMessageSchema domain-union narrowing", () => {
	it("narrows removeInstalledMarketplaceItem to its typed payload", () => {
		const result = marketplaceMessageSchema.safeParse({
			type: "removeInstalledMarketplaceItem",
			mpItem: modeItem,
			mpInstallOptions: { target: "project" },
		})
		expect(result.success).toBe(true)
		if (result.success && result.data.type === "removeInstalledMarketplaceItem") {
			// Discriminator narrowing exposes the typed removal payload.
			expect(result.data.mpItem.id).toBe("item-1")
			expect(result.data.mpInstallOptions.target).toBe("project")
		} else {
			throw new Error("expected a removeInstalledMarketplaceItem message")
		}
	})

	it("narrows showMdmAuthRequiredNotification to its empty payload", () => {
		const result = marketplaceMessageSchema.safeParse({ type: "showMdmAuthRequiredNotification" })
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.type).toBe("showMdmAuthRequiredNotification")
		}
	})

	it("rejects a malformed removal payload in the domain union", () => {
		const result = marketplaceMessageSchema.safeParse({
			type: "removeInstalledMarketplaceItem",
			mpItem: modeItem,
		})
		expect(result.success).toBe(false)
	})
})

describe("parseWebviewMessage boundary for marketplace remove/notification", () => {
	it("accepts a valid removeInstalledMarketplaceItem message", () => {
		const result = parseWebviewMessage({
			type: "removeInstalledMarketplaceItem",
			mpItem: modeItem,
			mpInstallOptions: { target: "project" },
		})
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.message.type).toBe("removeInstalledMarketplaceItem")
		}
	})

	it("rejects a removeInstalledMarketplaceItem message missing mpItem", () => {
		const result = parseWebviewMessage({
			type: "removeInstalledMarketplaceItem",
			mpInstallOptions: { target: "project" },
		})
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.error).toContain("removeInstalledMarketplaceItem")
		}
	})

	it("rejects a removeInstalledMarketplaceItem message with a non-object mpItem", () => {
		const result = parseWebviewMessage({
			type: "removeInstalledMarketplaceItem",
			mpItem: "nope",
			mpInstallOptions: { target: "project" },
		})
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.error).toContain("removeInstalledMarketplaceItem")
		}
	})

	it("accepts a valid showMdmAuthRequiredNotification message", () => {
		const result = parseWebviewMessage({ type: "showMdmAuthRequiredNotification" })
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.message.type).toBe("showMdmAuthRequiredNotification")
		}
	})

	it("rejects an unknown type literal at the schema level", () => {
		// The registered schema's type literal rejects any other type value —
		// the boundary is a hard allowlist (fail-closed).
		expect(
			showMdmAuthRequiredNotificationMessageSchema.safeParse({ type: "showMdmAuthRequiredNotification2" })
				.success,
		).toBe(false)
	})
})
