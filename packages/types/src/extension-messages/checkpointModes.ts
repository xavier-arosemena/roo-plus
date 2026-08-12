import { z } from "zod"

import { modeConfigSchema } from "../mode.js"

/**
 * Outbound checkpoint/modes response message schemas (Phase 2, Domain 4).
 *
 * These are the extension→webview|CLI messages that carry checkpoint
 * initialization progress (`checkpointInitWarning`, `currentCheckpointUpdated`)
 * and custom-mode management results (`deleteCustomModeCheck`,
 * `exportModeResult`, `importModeResult`, `checkRulesDirectoryResult`), plus
 * the direction-mixed `updateCustomMode` / `deleteCustomMode` (registered
 * outbound for ratchet completeness — see each schema's note).
 *
 * Every schema uses a `z.literal("type")` discriminator and reuses the existing
 * `modeConfigSchema` for the custom-mode payload. The flat `ExtensionMessage`
 * interface in `packages/types/src/vscode-extension-host.ts` is the single
 * source of truth for the `type` union; these schemas mirror its payload fields
 * plus the fields the webview consumers actually read (zod strips unknown keys,
 * so a field the consumer reads MUST be in the schema).
 */

/**
 * `checkpointWarning` payload for `checkpointInitWarning` — an inline union on
 * the flat interface (`{ type: "WAIT_TIMEOUT" | "INIT_TIMEOUT", timeout:
 * number }`), widened to ALSO accept a bare string and `undefined`.
 *
 * The production producer (`src/core/checkpoints/index.ts`,
 * `sendCheckpointInitWarn`) only ever posts the object form or `undefined`, but
 * the existing checkpoint tests (`src/core/checkpoints/__tests__/checkpoint.test.ts`)
 * post STRING forms (localized messages and `""`), and the webview consumer
 * (`ChatView.tsx`) stores `message.checkpointWarning` directly. Both forms must
 * validate at the boundary so registered strict parsing never rejects live
 * traffic.
 */
export const checkpointWarningSchema = z.union([
	z.object({
		type: z.enum(["WAIT_TIMEOUT", "INIT_TIMEOUT"]),
		timeout: z.number(),
	}),
	z.string(),
])

/**
 * Checkpoint hash push (`currentCheckpointUpdated`).
 *
 * Producers (`src/core/checkpoints/index.ts` — the `checkpoint` event handler
 * and `checkpointSave`) post `{ type, text }` with `text` = the commit hash;
 * the checkpoint event handler ALSO posts `suppressMessage` (the event data has
 * the flag, and the producer mirrors it into the outbound message — the webview
 * does not currently read it from THIS message, but the schema keeps it so the
 * producer's real shape round-trips). The webview (`ExtensionStateContext.tsx`)
 * reads `message.text` and stores it as the current checkpoint hash.
 */
export const currentCheckpointUpdatedMessageSchema = z.object({
	type: z.literal("currentCheckpointUpdated"),
	text: z.string(),
	suppressMessage: z.boolean().optional(),
})

/**
 * Checkpoint initialization warning (`checkpointInitWarning`).
 *
 * The producer (`src/core/checkpoints/index.ts`, `sendCheckpointInitWarn`)
 * posts `checkpointWarning: { type, timeout } | undefined`; the webview
 * (`ChatView.tsx`) reads `message.checkpointWarning` and stores it directly.
 * The schema accepts BOTH the object form and the string form (posted by
 * existing tests / older producers) so registered strict parsing never rejects
 * them — see `checkpointWarningSchema`.
 */
export const checkpointInitWarningMessageSchema = z.object({
	type: z.literal("checkpointInitWarning"),
	checkpointWarning: checkpointWarningSchema.optional(),
})

/**
 * Update a custom mode (`updateCustomMode`) — OUTBOUND variant.
 *
 * Direction-mixed: `updateCustomMode` is a member of BOTH the inbound
 * `WebviewMessage` union (where the webview sends the update — the inbound
 * `updateCustomModeMessageSchema` in `packages/types/src/webview-messages/`
 * requires `slug` + `modeConfig`) and the outbound `ExtensionMessage` union.
 * There is NO outbound producer in `src/` or `apps/cli/` — the outbound
 * registration exists because the union is the source of truth and the ratchet
 * demands every member be registered. Modeled on the flat interface's payload
 * fields (`mode?`, `customMode?`, `slug?`, `success?`, `error?`), all optional
 * to reflect the vestigial outbound traffic. The schema name collides with the
 * inbound one in `packages/types/src/index.ts` and is disambiguated there in
 * favor of the inbound schema (the `CodeIndexMessage` precedent); this outbound
 * variant remains available directly from `./extension-messages/index.js`.
 */
export const updateCustomModeMessageSchema = z.object({
	type: z.literal("updateCustomMode"),
	slug: z.string().optional(),
	mode: z.string().optional(),
	customMode: modeConfigSchema.optional(),
	success: z.boolean().optional(),
	error: z.string().optional(),
})

/**
 * Delete a custom mode (`deleteCustomMode`) — OUTBOUND variant.
 *
 * Direction-mixed, same shape as `updateCustomMode`: no outbound producer
 * exists; registered for ratchet completeness and modeled on the interface
 * payload fields (`slug?`, `success?`, `error?`). The schema name collides with
 * the inbound one and is disambiguated in `packages/types/src/index.ts` in
 * favor of the inbound schema.
 */
export const deleteCustomModeMessageSchema = z.object({
	type: z.literal("deleteCustomMode"),
	slug: z.string().optional(),
	success: z.boolean().optional(),
	error: z.string().optional(),
})

/**
 * Custom-mode deletion pre-check response (`deleteCustomModeCheck`).
 *
 * The producer (`src/core/webview/handlers/settings.ts`, `deleteCustomMode`
 * handler with `checkOnly`) posts `{ type, slug, rulesFolderPath }` where
 * `rulesFolderPath` is present only when the rules folder exists; the webview
 * (`ModesView.tsx`) reads `message.slug` (to match the pending deletion) and
 * `message.rulesFolderPath` (to pre-fill the confirm dialog).
 */
export const deleteCustomModeCheckMessageSchema = z.object({
	type: z.literal("deleteCustomModeCheck"),
	slug: z.string(),
	rulesFolderPath: z.string().optional(),
})

/**
 * Mode-export result (`exportModeResult`).
 *
 * The producer (`src/core/webview/handlers/settings.ts`, `exportMode` handler)
 * posts `{ type, success, slug }` on success and `{ type, success: false,
 * slug, error }` on failure/cancel; the webview (`ModesView.tsx`) reads
 * `message.success` (to clear the exporting state) and `message.error` (to log
 * the failure). `slug` is included so the producer's real shape round-trips.
 */
export const exportModeResultMessageSchema = z.object({
	type: z.literal("exportModeResult"),
	success: z.boolean(),
	slug: z.string().optional(),
	error: z.string().optional(),
})

/**
 * Mode-import result (`importModeResult`).
 *
 * The producer (`src/core/webview/handlers/settings.ts`, `importMode` handler)
 * posts `{ type, success, slug }` on success (slug = imported mode slug so the
 * webview can auto-switch) and `{ type, success: false, error }` on
 * failure/cancel. The webview (`ModesView.tsx`) reads `message.success`,
 * `message.slug` (to auto-switch to the imported mode) and `message.error` —
 * all three MUST be in the schema so zod does not strip them.
 */
export const importModeResultMessageSchema = z.object({
	type: z.literal("importModeResult"),
	success: z.boolean(),
	slug: z.string().optional(),
	error: z.string().optional(),
})

/**
 * Rules-directory content check result (`checkRulesDirectoryResult`).
 *
 * The producer (`src/core/webview/handlers/settings.ts`, `checkRulesDirectory`
 * handler) posts `{ type, slug, hasContent }`; the webview (`ModesView.tsx`)
 * reads `message.slug` (Map key) and `message.hasContent` (defaults to `false`
 * via `?? false`). `hasContent` is optional to mirror the flat interface, but
 * MUST be present in the schema or zod would strip it and the consumer would
 * always see `false`.
 */
export const checkRulesDirectoryResultMessageSchema = z.object({
	type: z.literal("checkRulesDirectoryResult"),
	slug: z.string(),
	hasContent: z.boolean().optional(),
})

/** Discriminated union of the outbound checkpoint/modes domain's fully-typed messages. */
export const checkpointModesMessageSchema = z.discriminatedUnion("type", [
	currentCheckpointUpdatedMessageSchema,
	checkpointInitWarningMessageSchema,
	updateCustomModeMessageSchema,
	deleteCustomModeMessageSchema,
	deleteCustomModeCheckMessageSchema,
	exportModeResultMessageSchema,
	importModeResultMessageSchema,
	checkRulesDirectoryResultMessageSchema,
])

export type CheckpointModesMessage = z.infer<typeof checkpointModesMessageSchema>
