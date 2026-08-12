import { z } from "zod"

import { codebaseIndexConfigSchema } from "../codebase-index.js"

/**
 * Outbound code-index response message schemas (Phase 2, Domain 6).
 *
 * These are the extension→webview|CLI messages that carry code-index state
 * changes and query responses: `indexingStatusUpdate` (Phase 0 baseline),
 * `codeIndexSettingsSaved` (settings-persist acknowledgment), `codeIndexSecretStatus`
 * (which provider secrets exist), `indexCleared` (index-wipe result), and the
 * vestigial `codebaseIndexConfig` (see its schema's note).
 *
 * Every schema uses a `z.literal("type")` discriminator and reuses the existing
 * `codebaseIndexConfigSchema` from `packages/types/src/codebase-index.ts` for
 * the settings payload. The flat `ExtensionMessage` interface in
 * `packages/types/src/vscode-extension-host.ts` is the single source of truth
 * for the `type` union; these schemas mirror its payload fields plus the fields
 * the webview consumers actually read (zod strips unknown keys, so a field the
 * consumer reads MUST be in the schema).
 */

/**
 * Indexing status payload — mirrors the `IndexingStatus` interface in
 * `packages/types/src/vscode-extension-host.ts` (single source of truth for the
 * runtime shape produced by the code-index manager's `getCurrentStatus()`).
 */
export const indexingStatusSchema = z.object({
	systemStatus: z.string(),
	message: z.string().optional(),
	processedItems: z.number(),
	totalItems: z.number(),
	currentItemUnit: z.string().optional(),
	workspacePath: z.string().optional(),
	workspaceEnabled: z.boolean().optional(),
	autoEnableDefault: z.boolean().optional(),
})

export const indexingStatusUpdateMessageSchema = z.object({
	type: z.literal("indexingStatusUpdate"),
	values: indexingStatusSchema,
})

/**
 * Settings-persist acknowledgment (`codeIndexSettingsSaved`).
 *
 * The producer (`src/core/webview/handlers/codeIndex.ts`,
 * `saveCodeIndexSettingsAtomic` handler) posts `{ type, success: true,
 * settings }` on success and `{ type, success: false, error }` on failure.
 * `settings` carries the persisted global-state `codebaseIndexConfig` object —
 * modeled with the shared `codebaseIndexConfigSchema` (NOT `z.unknown()`),
 * draining the flat interface's `settings?: any` escape on this path. The
 * webview (`CodeIndexPopover.tsx`) reads `message.success` (to flip the save
 * indicator) and `message.error` (to surface the failure) — both MUST be in the
 * schema so zod does not strip them. `settings` is included so the producer's
 * real shape round-trips even though the webview reads it from the `state`
 * message instead.
 */
export const codeIndexSettingsSavedMessageSchema = z.object({
	type: z.literal("codeIndexSettingsSaved"),
	success: z.boolean(),
	settings: codebaseIndexConfigSchema.optional(),
	error: z.string().optional(),
})

/**
 * Secret-presence status (`codeIndexSecretStatus`) — `values` payload.
 *
 * The producer (`src/core/webview/handlers/codeIndex.ts`,
 * `requestCodeIndexSecretStatus` handler) posts one boolean per provider secret
 * (true when a non-empty secret is stored). The webview (`CodeIndexPopover.tsx`)
 * reads ALL SEVEN fields to decide whether to show the "••••••••••••••••"
 * placeholder for each secret field — every field MUST be in the schema or zod
 * would strip it and the placeholder logic would always show empty inputs.
 */
export const codeIndexSecretStatusValuesSchema = z.object({
	hasOpenAiKey: z.boolean(),
	hasQdrantApiKey: z.boolean(),
	hasOpenAiCompatibleApiKey: z.boolean(),
	hasGeminiApiKey: z.boolean(),
	hasMistralApiKey: z.boolean(),
	hasVercelAiGatewayApiKey: z.boolean(),
	hasOpenRouterApiKey: z.boolean(),
})

export const codeIndexSecretStatusMessageSchema = z.object({
	type: z.literal("codeIndexSecretStatus"),
	values: codeIndexSecretStatusValuesSchema,
})

/**
 * Index-wipe result (`indexCleared`) — `values` payload.
 *
 * The producer (`src/core/webview/handlers/codeIndex.ts`, `clearIndexData`
 * handler) posts `{ type, values: { success: true } }` on success and
 * `{ type, values: { success: false, error } }` on failure. Mirrors the
 * `IndexClearedPayload` interface in `packages/types/src/vscode-extension-host.ts`.
 * There is currently no webview consumer for this message, but the schema
 * carries the producer's real fields so the payload round-trips at the
 * `parseExtensionMessage` boundary.
 */
export const indexClearedMessageSchema = z.object({
	type: z.literal("indexCleared"),
	values: z.object({
		success: z.boolean(),
		error: z.string().optional(),
	}),
})

/**
 * Codebase-index config push (`codebaseIndexConfig`) — OUTBOUND variant.
 *
 * Vestigial union member: there is NO outbound producer in `src/` or
 * `apps/cli/` — the `codebaseIndexConfig` value is carried inside the `state`
 * payload (see `ClineProvider.postStateToWebview`), never posted as a
 * standalone message. The outbound registration exists because the
 * `ExtensionMessage` union is the source of truth and the ratchet demands every
 * member be registered. Modeled minimally (`{ type }`) per the flat interface —
 * no payload fields exist on the union's producer side.
 */
export const codebaseIndexConfigMessageSchema = z.object({
	type: z.literal("codebaseIndexConfig"),
})

/** Discriminated union of the outbound code-index domain's fully-typed messages. */
export const codeIndexMessageSchema = z.discriminatedUnion("type", [
	indexingStatusUpdateMessageSchema,
	codeIndexSettingsSavedMessageSchema,
	codeIndexSecretStatusMessageSchema,
	indexClearedMessageSchema,
	codebaseIndexConfigMessageSchema,
])

export type CodeIndexMessage = z.infer<typeof codeIndexMessageSchema>
