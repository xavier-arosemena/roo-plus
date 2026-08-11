import { z } from "zod"

import { historyItemSchema } from "../history.js"
import { clineMessageSchema } from "../message.js"
import { promptComponentSchema } from "../mode.js"

/**
 * Outbound UI/navigation + state-variant message schemas (Phase 2, Domain 1).
 *
 * These are the extension→webview|CLI messages that drive UI navigation
 * (`action`, `invoke`, `acceptInput`, …), broadcast state variants
 * (`taskHistoryUpdated`, `messageUpdated`, `theme`, `workspaceUpdated`, …) and
 * side-channel notifications (`ttsStart`/`ttsStop`, `condenseTaskContext*`).
 *
 * Every schema uses a `z.literal("type")` discriminator and reuses the existing
 * typed payload schemas/interfaces (`historyItemSchema`, `clineMessageSchema`,
 * `promptComponentSchema`) so the boundary validates the real shapes instead of
 * an opaque `payload`. The `action`/`invoke` string-literal unions mirror the
 * flat `ExtensionMessage` interface in `packages/types/src/vscode-extension-host.ts`
 * (single source of truth).
 */

/**
 * Narrow string-literal union for the `action` message, mirroring the flat
 * `ExtensionMessage` interface (`action?: "chatButtonClicked" | … | "toggleAutoApprove"`).
 */
export const actionMessageActionSchema = z.enum([
	"chatButtonClicked",
	"settingsButtonClicked",
	"historyButtonClicked",
	"marketplaceButtonClicked",
	"didBecomeVisible",
	"focusInput",
	"switchTab",
	"toggleAutoApprove",
])

export type ActionMessageAction = z.infer<typeof actionMessageActionSchema>

/**
 * UI navigation action (`action`). Most producers send only `type` + `action`;
 * the `switchTab` producer (`src/core/webview/handlers/misc.ts`) additionally
 * posts `tab` and `values`, both of which the webview reads — zod strips unknown
 * keys, so they must be part of the schema or they would be silently dropped.
 *
 * `values` is the interface's legacy generic
 * `values?: Record<string, any>` payload, posted through from the inbound
 * `switchTab` message untouched; it stays a free-form record of unknown values
 * (matching the inbound `switchTabMessageSchema` precedent) pending a precise
 * shape.
 */
export const actionMessageSchema = z.object({
	type: z.literal("action"),
	action: actionMessageActionSchema,
	tab: z.string().optional(),
	values: z.record(z.string(), z.unknown()).optional(),
})

/**
 * Command invocation (`invoke`). The `sendMessage`/`setChatBoxMessage`/
 * `primaryButtonClick`/`secondaryButtonClick` producers optionally carry
 * `text` and `images`, which the webview reads (e.g. `ChatView` feeds them into
 * the textarea), so both must be included.
 */
export const invokeMessageSchema = z.object({
	type: z.literal("invoke"),
	invoke: z.enum(["newChat", "sendMessage", "primaryButtonClick", "secondaryButtonClick", "setChatBoxMessage"]),
	text: z.string().optional(),
	images: z.array(z.string()).optional(),
})

/**
 * Single message update (`messageUpdated`). The payload is a full
 * `ClineMessage`; it is validated against `clineMessageSchema` while unknown
 * fields are retained via `.passthrough()` — the webview replaces the stored
 * message wholesale, so dropping unknown fields would silently corrupt state
 * (same rationale as the `state` schema's permissive `clineMessages` handling
 * during the transitional period).
 */
export const messageUpdatedMessageSchema = z.object({
	type: z.literal("messageUpdated"),
	clineMessage: clineMessageSchema.passthrough(),
})

/**
 * Full sorted task history push (`taskHistoryUpdated`).
 */
export const taskHistoryUpdatedMessageSchema = z.object({
	type: z.literal("taskHistoryUpdated"),
	taskHistory: z.array(historyItemSchema),
})

/**
 * Single updated/added history item (`taskHistoryItemUpdated`).
 */
export const taskHistoryItemUpdatedMessageSchema = z.object({
	type: z.literal("taskHistoryItemUpdated"),
	taskHistoryItem: historyItemSchema,
})

/**
 * Selected images echo (`selectedImages`). `context` and `messageTs` are echoed
 * back from the inbound `selectImages` message so the webview can attach the
 * chosen images to the right message/input (see `ChatView`/`ChatRow`).
 */
export const selectedImagesMessageSchema = z.object({
	type: z.literal("selectedImages"),
	images: z.array(z.string()),
	context: z.string().optional(),
	messageTs: z.number().optional(),
})

/**
 * Active VS Code theme push (`theme`). `text` carries `JSON.stringify` of the
 * theme object (from `getTheme()`), which the webview parses.
 */
export const themeMessageSchema = z.object({
	type: z.literal("theme"),
	text: z.string(),
})

/**
 * Workspace file/tab refresh (`workspaceUpdated`). Producers always send both
 * `filePaths` and `openedTabs`; `path` is optional on the flat interface.
 */
export const workspaceUpdatedMessageSchema = z.object({
	type: z.literal("workspaceUpdated"),
	filePaths: z.array(z.string()),
	openedTabs: z.array(
		z.object({
			label: z.string(),
			isActive: z.boolean(),
			path: z.string().optional(),
		}),
	),
})

/**
 * TTS playback started (`ttsStart`) — `text` is the utterance being spoken.
 */
export const ttsStartMessageSchema = z.object({
	type: z.literal("ttsStart"),
	text: z.string(),
})

/**
 * TTS playback stopped (`ttsStop`) — `text` is the utterance that stopped.
 */
export const ttsStopMessageSchema = z.object({
	type: z.literal("ttsStop"),
	text: z.string(),
})

/**
 * Context condensation started (`condenseTaskContextStarted`) — `text` carries
 * the task id.
 */
export const condenseTaskContextStartedMessageSchema = z.object({
	type: z.literal("condenseTaskContextStarted"),
	text: z.string(),
})

/**
 * Context condensation finished (`condenseTaskContextResponse`) — `text`
 * carries the task id.
 */
export const condenseTaskContextResponseMessageSchema = z.object({
	type: z.literal("condenseTaskContextResponse"),
	text: z.string(),
})

/**
 * Ask the webview to accept the current textarea input (`acceptInput` — no
 * payload; the extension routes it from a command e.g. enter-to-submit).
 */
export const acceptInputMessageSchema = z.object({
	type: z.literal("acceptInput"),
})

/**
 * Toggle the history-preview collapsed state (`setHistoryPreviewCollapsed`).
 *
 * Direction-mixed / vestigial: this type has NO outbound producer in `src/`
 * (the webview drives its own collapse state locally) and no payload field on
 * the flat `ExtensionMessage` interface. Registered outbound with a minimal
 * structural schema because the union is the source of truth and the ratchet
 * demands every member be registered; actual outbound traffic is
 * expected/vestigial.
 */
export const setHistoryPreviewCollapsedMessageSchema = z.object({
	type: z.literal("setHistoryPreviewCollapsed"),
})

/**
 * Auto-approval enabled toggle (`autoApprovalEnabled`).
 *
 * Direction-mixed: this type is a member of BOTH the inbound `WebviewMessage`
 * union (where the webview SENDS the toggle) and the outbound
 * `ExtensionMessage` union. No outbound producer exists in `src/` — registered
 * outbound for completeness (the union is the source of truth and the ratchet
 * demands it); actual outbound traffic is expected/vestigial. Schema mirrors
 * the inbound `autoApprovalEnabledMessageSchema`.
 */
export const autoApprovalEnabledMessageSchema = z.object({
	type: z.literal("autoApprovalEnabled"),
	bool: z.boolean().optional(),
})

/**
 * Pin/unpin an API configuration profile (`toggleApiConfigPin`).
 *
 * Direction-mixed: also a member of the inbound `WebviewMessage` union (the
 * webview sends it with `text` = profile id). No outbound producer exists in
 * `src/` — registered outbound for completeness; actual outbound traffic is
 * expected/vestigial. Schema mirrors the inbound `toggleApiConfigPinMessageSchema`.
 */
export const toggleApiConfigPinMessageSchema = z.object({
	type: z.literal("toggleApiConfigPin"),
	text: z.string().optional(),
})

/**
 * Update a custom-mode prompt (`updatePrompt`).
 *
 * Direction-mixed: also a member of the inbound `WebviewMessage` union (the
 * webview sends it). No outbound producer exists in `src/` — registered
 * outbound for completeness; actual outbound traffic is expected/vestigial.
 * Schema mirrors the inbound `updatePromptMessageSchema`, reusing the shared
 * `promptComponentSchema`.
 */
export const updatePromptMessageSchema = z.object({
	type: z.literal("updatePrompt"),
	promptMode: z.string().optional(),
	customPrompt: promptComponentSchema.optional(),
})

/** Discriminated union of the outbound UI/navigation + state-variant domain's fully-typed messages. */
export const navigationMessageSchema = z.discriminatedUnion("type", [
	actionMessageSchema,
	invokeMessageSchema,
	messageUpdatedMessageSchema,
	taskHistoryUpdatedMessageSchema,
	taskHistoryItemUpdatedMessageSchema,
	selectedImagesMessageSchema,
	themeMessageSchema,
	workspaceUpdatedMessageSchema,
	ttsStartMessageSchema,
	ttsStopMessageSchema,
	condenseTaskContextStartedMessageSchema,
	condenseTaskContextResponseMessageSchema,
	acceptInputMessageSchema,
	setHistoryPreviewCollapsedMessageSchema,
	autoApprovalEnabledMessageSchema,
	toggleApiConfigPinMessageSchema,
	updatePromptMessageSchema,
])

export type NavigationMessage = z.infer<typeof navigationMessageSchema>
