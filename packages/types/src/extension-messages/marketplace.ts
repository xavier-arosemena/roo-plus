import { z } from "zod"

import { marketplaceInstalledMetadataSchema, marketplaceItemSchema } from "../marketplace.js"

/**
 * Outbound marketplace response message schemas (Phase 2, Domain 5).
 *
 * These are the extension→webview|CLI messages that carry marketplace install
 * results (`marketplaceInstallResult`, `marketplaceBulkInstallResult`,
 * `marketplaceRemoveResult`), the on-demand marketplace data payload
 * (`marketplaceData`), and the direction-mixed `shareTaskSuccess` (registered
 * outbound for ratchet completeness — see its schema's note).
 *
 * Every schema uses a `z.literal("type")` discriminator and reuses the existing
 * `marketplaceItemSchema` / `marketplaceInstalledMetadataSchema` for the payload
 * shapes. The flat `ExtensionMessage` interface in
 * `packages/types/src/vscode-extension-host.ts` is the single source of truth
 * for the `type` union; these schemas mirror its payload fields plus the fields
 * the webview consumers actually read (zod strips unknown keys, so a field the
 * consumer reads MUST be in the schema).
 */

/**
 * Single marketplace item install result (`marketplaceInstallResult`).
 *
 * The producer (`src/core/webview/handlers/marketplace.ts`, `installMarketplaceItem`
 * handler) posts `{ type, success, slug }` on success and `{ type, success:
 * false, slug, error }` on failure. The webview (`MarketplaceInstallModal.tsx`)
 * reads `message.slug` (to match the pending install) and `message.success` /
 * `message.error` — all three MUST be in the schema so zod does not strip them.
 */
export const marketplaceInstallResultMessageSchema = z.object({
	type: z.literal("marketplaceInstallResult"),
	success: z.boolean(),
	slug: z.string(),
	error: z.string().optional(),
})

/**
 * Bulk marketplace install results (`marketplaceBulkInstallResult`).
 *
 * The producer (`src/core/webview/handlers/marketplace.ts`, `installMarketplaceItems`
 * handler) posts `{ type, results }` where `results` is an array of
 * `{ slug, success, error? }` — one entry per installed item. The webview
 * (`BulkInstallModal.tsx`) reads `message.results` to render per-item success/
 * failure state.
 */
export const marketplaceBulkInstallResultMessageSchema = z.object({
	type: z.literal("marketplaceBulkInstallResult"),
	results: z.array(
		z.object({
			slug: z.string(),
			success: z.boolean(),
			error: z.string().optional(),
		}),
	),
})

/**
 * Marketplace item removal result (`marketplaceRemoveResult`).
 *
 * The producer (`src/core/webview/handlers/marketplace.ts`, `removeInstalledMarketplaceItem`
 * handler) posts `{ type, success, slug }` on success and `{ type, success:
 * false, slug, error }` on failure (including the "manager not available"
 * branch). The webview (`MarketplaceItemCard.tsx`) reads `message.slug` (to
 * match the pending removal), `message.success` and `message.error` — all three
 * MUST be in the schema so zod does not strip them.
 */
export const marketplaceRemoveResultMessageSchema = z.object({
	type: z.literal("marketplaceRemoveResult"),
	success: z.boolean(),
	slug: z.string(),
	error: z.string().optional(),
})

/**
 * On-demand marketplace data payload (`marketplaceData`).
 *
 * The producer (`src/core/services/MarketplaceService.ts`, `fetchMarketplaceData`)
 * posts `{ type, organizationMcps, marketplaceItems, marketplaceInstalledMetadata,
 * errors }` on both the success path and the empty-data-on-error path. The
 * webview (`ExtensionStateContext.tsx`) reads `message.marketplaceItems` (only
 * when defined — `undefined` means "no data yet") and
 * `message.marketplaceInstalledMetadata`. All four fields are modeled (all
 * optional per the flat interface) so no consumer-read field is stripped by zod
 * and the producer's real shape round-trips.
 */
export const marketplaceDataMessageSchema = z.object({
	type: z.literal("marketplaceData"),
	marketplaceItems: z.array(marketplaceItemSchema).optional(),
	organizationMcps: z.array(marketplaceItemSchema).optional(),
	marketplaceInstalledMetadata: marketplaceInstalledMetadataSchema.optional(),
	errors: z.array(z.string()).optional(),
})

/**
 * Share-task success acknowledgment (`shareTaskSuccess`) — OUTBOUND variant.
 *
 * Direction-mixed: `shareTaskSuccess` is a member of BOTH the inbound
 * `WebviewMessage` union (where the webview acknowledges a successful share —
 * registered inbound in Phase 1 with a minimal schema in
 * `packages/types/src/webview-messages/loose.ts`) and the outbound
 * `ExtensionMessage` union. There is NO outbound producer in `src/` or
 * `apps/cli/` — the outbound registration is authoritative for completeness
 * (the union is the source of truth and the ratchet demands every member be
 * registered). Modeled with the same minimal `{ type }` shape as the inbound
 * schema. The schema name collides with the inbound one in
 * `packages/types/src/index.ts` and is disambiguated there in favor of the
 * inbound schema (the `CodeIndexMessage` precedent); this outbound variant
 * remains available directly from `./extension-messages/index.js`.
 */
export const shareTaskSuccessMessageSchema = z.object({
	type: z.literal("shareTaskSuccess"),
})

/** Discriminated union of the outbound marketplace domain's fully-typed messages. */
export const marketplaceMessageSchema = z.discriminatedUnion("type", [
	marketplaceInstallResultMessageSchema,
	marketplaceBulkInstallResultMessageSchema,
	marketplaceRemoveResultMessageSchema,
	marketplaceDataMessageSchema,
	shareTaskSuccessMessageSchema,
])

export type MarketplaceMessage = z.infer<typeof marketplaceMessageSchema>
