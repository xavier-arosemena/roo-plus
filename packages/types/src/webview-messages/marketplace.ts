import { z } from "zod"

import { installMarketplaceItemOptionsSchema, marketplaceItemSchema } from "../marketplace.js"

/**
 * Marketplace installation messages.
 *
 * `mpItem`/`mpItems` reuse the canonical `marketplaceItemSchema` (discriminated
 * union over mode/mcp items) and `mpInstallOptions` reuses
 * `installMarketplaceItemOptionsSchema`. Once registered, a crafted payload with
 * a non-object item or a malformed install target is rejected at the boundary.
 */
export const installMarketplaceItemMessageSchema = z.object({
	type: z.literal("installMarketplaceItem"),
	mpItem: marketplaceItemSchema,
	mpInstallOptions: installMarketplaceItemOptionsSchema.optional(),
})

export const installMarketplaceItemsMessageSchema = z.object({
	type: z.literal("installMarketplaceItems"),
	mpItems: z.array(marketplaceItemSchema).min(1),
	mpInstallOptions: installMarketplaceItemOptionsSchema.optional(),
})

export const installMarketplaceItemWithParametersMessageSchema = z.object({
	type: z.literal("installMarketplaceItemWithParameters"),
	payload: z.object({
		item: marketplaceItemSchema,
		parameters: z.record(z.string(), z.string()).optional(),
	}),
})

/**
 * Marketplace fetch request. Empty-payload message — the sender posts exactly
 * `{ type: "fetchMarketplaceData" }` (see MarketplaceView.tsx) and the
 * extension responds with a `marketplaceData` message. Registered so protocol
 * drift on this request fails loudly at the boundary instead of passing
 * through structurally.
 */
export const fetchMarketplaceDataMessageSchema = z.object({
	type: z.literal("fetchMarketplaceData"),
})

/**
 * Marketplace filter request. Mirrors the exact sender payload (see
 * MarketplaceViewStateManager UPDATE_FILTERS): `filters` is optional and every
 * filter field is optional. Zod strips unknown keys by default, so real sender
 * payloads carrying extra fields (e.g. an `installed` status) are never
 * rejected — the schema must never be stricter than the sender.
 */
export const filterMarketplaceItemsMessageSchema = z.object({
	type: z.literal("filterMarketplaceItems"),
	filters: z
		.object({
			type: z.string().optional(),
			search: z.string().optional(),
			tags: z.array(z.string()).optional(),
		})
		.optional(),
})

/** Discriminated union of the marketplace-install domain's fully-typed messages. */
export const marketplaceMessageSchema = z.discriminatedUnion("type", [
	installMarketplaceItemMessageSchema,
	installMarketplaceItemsMessageSchema,
	installMarketplaceItemWithParametersMessageSchema,
])

export type MarketplaceMessage = z.infer<typeof marketplaceMessageSchema>
