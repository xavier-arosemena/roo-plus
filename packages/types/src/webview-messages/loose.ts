import { z } from "zod"

/**
 * Loose / transitional inbound message types (S1 sub-task 13).
 *
 * These 11 `WebviewMessage.type` members have NO handler case in any domain
 * router (verified 2026-08-10 against `ClineProvider.setWebviewMessageListener`
 * routing everything through `webviewMessageHandler`, whose per-domain dispatch
 * map has no entry for them — they currently hit the debug-only fall-through).
 *
 * Each is registered with a MINIMAL structural schema
 * (`{ type: z.literal("X") }`, empty payload) so the registry is COMPLETE
 * (inbound untyped count → 0) while preserving behavior:
 *  - zod strips unknown keys by default, so any legacy sender payload still passes;
 *  - no handler consumes them, so an empty payload cannot break anything.
 *
 * This is exactly the "transitional, documented" case from the S1 migration
 * plan: minimal empty-payload schemas are safe precisely BECAUSE no handler
 * reads their payload. Do NOT remove these from the `WebviewMessage.type`
 * union (out of scope).
 */

/** GLOBAL-STATE KEY only (`currentApiConfigName`) — never dispatched as a message. Registered minimally. */
export const currentApiConfigNameMessageSchema = z.object({
	type: z.literal("currentApiConfigName"),
})

/** Unhandled inbound message — no dispatcher case. Registered minimally. */
export const updateCondensingPromptMessageSchema = z.object({
	type: z.literal("updateCondensingPrompt"),
})

/** Unhandled inbound message — no dispatcher case. Registered minimally. */
export const playSoundMessageSchema = z.object({
	type: z.literal("playSound"),
})

/** Unhandled inbound message — no dispatcher case. Registered minimally. */
export const draggedImagesMessageSchema = z.object({
	type: z.literal("draggedImages"),
})

/** Unhandled inbound message — no dispatcher case. Registered minimally. */
export const setopenAiCustomModelInfoMessageSchema = z.object({
	type: z.literal("setopenAiCustomModelInfo"),
})

/**
 * Unhandled as a message — the code-index feature uses
 * `saveCodeIndexSettingsAtomic` instead. Registered minimally.
 */
export const codebaseIndexEnabledMessageSchema = z.object({
	type: z.literal("codebaseIndexEnabled"),
})

/**
 * DIRECTION-MIXED: used as an OUTBOUND `action` value
 * (`{ type: "action", action: "marketplaceButtonClicked" }` from
 * `src/activate/registerCommands.ts`), not dispatched inbound. Registered
 * minimally; belongs to the Phase-2 direction-mixing cleanup.
 */
export const marketplaceButtonClickedMessageSchema = z.object({
	type: z.literal("marketplaceButtonClicked"),
})

/** Unhandled inbound message — no dispatcher case. Registered minimally. */
export const cancelMarketplaceInstallMessageSchema = z.object({
	type: z.literal("cancelMarketplaceInstall"),
})

/** Unhandled inbound message — no dispatcher case. Registered minimally. */
export const imageGenerationSettingsMessageSchema = z.object({
	type: z.literal("imageGenerationSettings"),
})

/**
 * Unhandled as a message — `switchMode` is a TOOL name (`tool: "switchMode"`),
 * not a dispatched inbound message. Registered minimally.
 */
export const switchModeMessageSchema = z.object({
	type: z.literal("switchMode"),
})

/** Unhandled / outbound-leaning inbound union member. Registered minimally. */
export const shareTaskSuccessMessageSchema = z.object({
	type: z.literal("shareTaskSuccess"),
})

/** Discriminated union of the loose / transitional message schemas. */
export const looseMessageSchema = z.discriminatedUnion("type", [
	currentApiConfigNameMessageSchema,
	updateCondensingPromptMessageSchema,
	playSoundMessageSchema,
	draggedImagesMessageSchema,
	setopenAiCustomModelInfoMessageSchema,
	codebaseIndexEnabledMessageSchema,
	marketplaceButtonClickedMessageSchema,
	cancelMarketplaceInstallMessageSchema,
	imageGenerationSettingsMessageSchema,
	switchModeMessageSchema,
	shareTaskSuccessMessageSchema,
])

export type LooseMessage = z.infer<typeof looseMessageSchema>
