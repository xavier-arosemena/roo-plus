import { describe, it, expect } from "vitest"

import {
	extensionMessageSchemas,
	marketplaceBulkInstallResultMessageSchema,
	marketplaceDataMessageSchema,
	marketplaceInstallResultMessageSchema,
	marketplaceMessageSchema,
	marketplaceRemoveResultMessageSchema,
	parseExtensionMessage,
	shareTaskSuccessMessageSchema,
} from "../index.js"

const validModeItem = {
	id: "item-1",
	name: "Item 1",
	description: "A test mode item",
	type: "mode",
	content: "slug: item-1",
}

const validMcpItem = {
	id: "mcp-1",
	name: "MCP 1",
	description: "A test MCP item",
	type: "mcp",
	url: "https://example.com/mcp.json",
	content: [{ name: "method", content: "npx -y example" }],
}

describe("marketplace domain (Phase 2, Domain 5) schemas", () => {
	describe("valid messages", () => {
		it.each([
			[
				"marketplaceInstallResult (success)",
				marketplaceInstallResultMessageSchema,
				{ type: "marketplaceInstallResult", success: true, slug: "item-1" },
			],
			[
				"marketplaceInstallResult (error)",
				marketplaceInstallResultMessageSchema,
				{ type: "marketplaceInstallResult", success: false, slug: "item-1", error: "install failed" },
			],
			[
				"marketplaceBulkInstallResult (all succeeded)",
				marketplaceBulkInstallResultMessageSchema,
				{ type: "marketplaceBulkInstallResult", results: [{ slug: "a", success: true }] },
			],
			[
				"marketplaceBulkInstallResult (mixed with error)",
				marketplaceBulkInstallResultMessageSchema,
				{
					type: "marketplaceBulkInstallResult",
					results: [
						{ slug: "a", success: true },
						{ slug: "b", success: false, error: "boom" },
					],
				},
			],
			[
				"marketplaceRemoveResult (success)",
				marketplaceRemoveResultMessageSchema,
				{ type: "marketplaceRemoveResult", success: true, slug: "item-1" },
			],
			[
				"marketplaceRemoveResult (error)",
				marketplaceRemoveResultMessageSchema,
				{ type: "marketplaceRemoveResult", success: false, slug: "item-1", error: "remove failed" },
			],
			[
				"marketplaceData (full payload)",
				marketplaceDataMessageSchema,
				{
					type: "marketplaceData",
					marketplaceItems: [validModeItem],
					organizationMcps: [validMcpItem],
					marketplaceInstalledMetadata: { project: {}, global: {} },
					errors: [],
				},
			],
			[
				"marketplaceData (marketplaceItems only)",
				marketplaceDataMessageSchema,
				{ type: "marketplaceData", marketplaceItems: [validModeItem] },
			],
			[
				"marketplaceData (organizationMcps only)",
				marketplaceDataMessageSchema,
				{ type: "marketplaceData", organizationMcps: [validMcpItem] },
			],
			[
				"marketplaceData (minimal — no payload fields)",
				marketplaceDataMessageSchema,
				{ type: "marketplaceData" },
			],
			[
				"shareTaskSuccess (outbound, vestigial — minimal)",
				shareTaskSuccessMessageSchema,
				{ type: "shareTaskSuccess" },
			],
		])("accepts %s", (_name, schema, payload) => {
			const result = schema.safeParse(payload)
			expect(result.success).toBe(true)
		})
	})

	describe("malformed messages", () => {
		it.each([
			[
				"marketplaceInstallResult (missing success)",
				marketplaceInstallResultMessageSchema,
				{ type: "marketplaceInstallResult", slug: "item-1" },
			],
			[
				"marketplaceInstallResult (non-boolean success)",
				marketplaceInstallResultMessageSchema,
				{ type: "marketplaceInstallResult", success: "yes", slug: "item-1" },
			],
			[
				"marketplaceInstallResult (missing slug)",
				marketplaceInstallResultMessageSchema,
				{ type: "marketplaceInstallResult", success: true },
			],
			[
				"marketplaceBulkInstallResult (missing results)",
				marketplaceBulkInstallResultMessageSchema,
				{ type: "marketplaceBulkInstallResult" },
			],
			[
				"marketplaceBulkInstallResult (result missing slug)",
				marketplaceBulkInstallResultMessageSchema,
				{ type: "marketplaceBulkInstallResult", results: [{ success: true }] },
			],
			[
				"marketplaceRemoveResult (missing success)",
				marketplaceRemoveResultMessageSchema,
				{ type: "marketplaceRemoveResult", slug: "item-1" },
			],
			[
				"marketplaceData (marketplaceItems entry missing id)",
				marketplaceDataMessageSchema,
				{ type: "marketplaceData", marketplaceItems: [{ name: "Item 1", description: "desc", type: "mode" }] },
			],
			[
				"marketplaceData (organizationMcps entry wrong discriminator)",
				marketplaceDataMessageSchema,
				{ type: "marketplaceData", organizationMcps: [{ ...validMcpItem, type: "bogus" }] },
			],
			[
				"shareTaskSuccess (wrong type discriminator)",
				shareTaskSuccessMessageSchema,
				{ type: "shareTaskSuccessX" },
			],
		])("rejects %s", (_name, schema, payload) => {
			const result = schema.safeParse(payload)
			expect(result.success).toBe(false)
		})
	})

	describe("parseExtensionMessage boundary", () => {
		it("strictly validates a registered marketplaceInstallResult", () => {
			const result = parseExtensionMessage({ type: "marketplaceInstallResult", success: true, slug: "item-1" })
			expect(result.ok).toBe(true)
			if (result.ok) {
				expect(result.message.type).toBe("marketplaceInstallResult")
			}
		})

		it("strictly validates a registered marketplaceBulkInstallResult", () => {
			const result = parseExtensionMessage({
				type: "marketplaceBulkInstallResult",
				results: [{ slug: "a", success: true }],
			})
			expect(result.ok).toBe(true)
			if (result.ok) {
				expect(result.message.type).toBe("marketplaceBulkInstallResult")
			}
		})

		it("strictly validates a registered marketplaceData and retains consumer-read fields", () => {
			const result = parseExtensionMessage({
				type: "marketplaceData",
				marketplaceItems: [validModeItem],
				marketplaceInstalledMetadata: { project: { "item-1": { type: "mode" } }, global: {} },
			})
			expect(result.ok).toBe(true)
			if (result.ok) {
				expect(result.message.type).toBe("marketplaceData")
				// The consumer (`ExtensionStateContext.tsx`) reads both fields — zod
				// must NOT strip them.
				expect(result.message.marketplaceItems).toEqual([validModeItem])
				expect(result.message.marketplaceInstalledMetadata).toEqual({
					project: { "item-1": { type: "mode" } },
					global: {},
				})
			}
		})

		it("strictly validates a registered shareTaskSuccess (outbound authoritative)", () => {
			const result = parseExtensionMessage({ type: "shareTaskSuccess" })
			expect(result.ok).toBe(true)
			if (result.ok) {
				expect(result.message.type).toBe("shareTaskSuccess")
			}
		})

		it("rejects a malformed registered marketplaceRemoveResult", () => {
			const result = parseExtensionMessage({ type: "marketplaceRemoveResult", slug: "item-1" })
			expect(result.ok).toBe(false)
			if (!result.ok) {
				expect(result.error).toContain("marketplaceRemoveResult")
			}
		})

		it("rejects a malformed registered marketplaceBulkInstallResult", () => {
			const result = parseExtensionMessage({ type: "marketplaceBulkInstallResult" })
			expect(result.ok).toBe(false)
			if (!result.ok) {
				expect(result.error).toContain("marketplaceBulkInstallResult")
			}
		})
	})

	describe("registry seeding", () => {
		const domainTypes = [
			"marketplaceInstallResult",
			"marketplaceBulkInstallResult",
			"marketplaceRemoveResult",
			"marketplaceData",
			"shareTaskSuccess",
		] as const

		it("seeds every marketplace type into the registry", () => {
			for (const type of domainTypes) {
				expect(extensionMessageSchemas[type]).toBeDefined()
			}
		})

		it("builds a discriminated union over the domain's registered types", () => {
			const parsed = marketplaceMessageSchema.safeParse({
				type: "marketplaceRemoveResult",
				success: true,
				slug: "item-1",
			})
			expect(parsed.success).toBe(true)
			if (parsed.success) {
				expect(parsed.data.type).toBe("marketplaceRemoveResult")
			}
		})
	})
})
