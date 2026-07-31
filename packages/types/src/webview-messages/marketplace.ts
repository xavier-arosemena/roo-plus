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

/** Discriminated union of the marketplace-install domain's fully-typed messages. */
export const marketplaceMessageSchema = z.discriminatedUnion("type", [
	installMarketplaceItemMessageSchema,
	installMarketplaceItemsMessageSchema,
	installMarketplaceItemWithParametersMessageSchema,
])

export type MarketplaceMessage = z.infer<typeof marketplaceMessageSchema>
