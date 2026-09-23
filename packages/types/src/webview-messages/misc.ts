import { z } from "zod"

/**
 * Misc-domain messages (S1 sub-task 13).
 *
 * The catch-all inbound domain handled by `src/core/webview/handlers/misc.ts`.
 * Required/optional fields match the handler's actual usage so the `!`
 * assertions and `as { create?: ... }` casts can be dropped:
 *  - `openFile.text` is REQUIRED (every sender provides a path and the handler
 *    previously used `message.text!`); `values` is typed so the handler's cast
 *    is removed.
 *  - `switchTab.tab` is the strict enum from the `WebviewMessage` interface;
 *    `values` stays a transitional `Record<string, unknown>` because the
 *    handler posts it through to the webview untouched.
 *  - All other text/url/query/upsellId fields stay optional to preserve the
 *    handler guard semantics (the handler bails when the field is absent).
 */

/** Webview finished launching (empty payload). */
export const webviewDidLaunchMessageSchema = z.object({
	type: z.literal("webviewDidLaunch"),
})

/** The announcement banner was shown/dismissed (empty payload). */
export const didShowAnnouncementMessageSchema = z.object({
	type: z.literal("didShowAnnouncement"),
})

/** Import history from the legacy Roo extension (empty payload). */
export const importRooHistoryMessageSchema = z.object({
	type: z.literal("importRooHistory"),
})

/** Reset all extension state (empty payload). */
export const resetStateMessageSchema = z.object({
	type: z.literal("resetState"),
})

/**
 * Open a file in the editor. `text` is REQUIRED — every sender provides a path
 * and the handler previously used `message.text!`. Optional `values` carries
 * `{ create?, content?, line? }`; typing it removes the handler's
 * `as { create?: boolean; content?: string; line?: number }` cast.
 */
export const openFileMessageSchema = z.object({
	type: z.literal("openFile"),
	text: z.string(),
	values: z
		.object({
			create: z.boolean().optional(),
			content: z.string().optional(),
			line: z.number().optional(),
		})
		.optional(),
})

/** Read a file's content back to the webview. `text` stays optional to match the handler guard. */
export const readFileContentMessageSchema = z.object({
	type: z.literal("readFileContent"),
	text: z.string().optional(),
})

/** Open a @-mention target (file, issue, etc.). `text` stays optional to match the handler guard. */
export const openMentionMessageSchema = z.object({
	type: z.literal("openMention"),
	text: z.string().optional(),
})

/** Open an external URL in the system browser. `url` stays optional to match the handler guard. */
export const openExternalMessageSchema = z.object({
	type: z.literal("openExternal"),
	url: z.string().optional(),
})

/** Open the VS Code keyboard-shortcuts editor, optionally pre-filtered by `text`. */
export const openKeyboardShortcutsMessageSchema = z.object({
	type: z.literal("openKeyboardShortcuts"),
	text: z.string().optional(),
})

/** Cloud task-sync toggle. The handler ignores the payload (feature disabled) — field kept optional. */
export const taskSyncEnabledMessageSchema = z.object({
	type: z.literal("taskSyncEnabled"),
	bool: z.boolean().optional(),
})

/** Search workspace files. `query`/`requestId` stay optional to match the handler's `|| ""` usage. */
export const searchFilesMessageSchema = z.object({
	type: z.literal("searchFiles"),
	query: z.string().optional(),
	requestId: z.string().optional(),
})

/** Reload custom tools from the tool directories (empty payload). */
export const refreshCustomToolsMessageSchema = z.object({
	type: z.literal("refreshCustomTools"),
})

/** Focus the webview panel (empty payload). */
export const focusPanelRequestMessageSchema = z.object({
	type: z.literal("focusPanelRequest"),
})

/**
 * Switch the active webview tab. `tab` is the strict enum from the
 * `WebviewMessage` interface and `values` is posted through to the webview
 * untouched — transitional, so it stays a `Record<string, unknown>`.
 */
export const switchTabMessageSchema = z.object({
	type: z.literal("switchTab"),
	tab: z.enum(["settings", "history", "mcp", "modes", "chat", "marketplace", "cloud"]).optional(),
	// Transitional: arbitrary values are posted through (action switchTab).
	values: z.record(z.string(), z.unknown()).optional(),
})

/** Request the current custom-modes list (empty payload). */
export const requestModesMessageSchema = z.object({
	type: z.literal("requestModes"),
})

/**
 * Request the FULL custom-modes catalog including bulky per-mode bodies
 * (empty payload).
 *
 * Lazy-fetch companion to the bounded `state` pushes (issue #64 follow-up,
 * postmortem §5a): `state.customModes` now carries only a metadata projection,
 * so the ModesView editing flows ask for full configs on demand. The response
 * is the outbound `modesFullConfig` message.
 */
export const getModesFullConfigMessageSchema = z.object({
	type: z.literal("getModesFullConfig"),
})

/**
 * Request the page of chat messages immediately older than `beforeTs`.
 *
 * Lazy-fetch companion to the tail-anchored `state.clineMessages` window
 * (2026-09-15 `state` payload incident): `state` pushes now ship only the newest
 * messages (bounded by count and bytes) plus the transcript's first message, so
 * the chat view asks for the omitted middle on up-scroll. The response is the
 * outbound `olderClineMessages` message. `beforeTs` is the requester's oldest
 * loaded message timestamp and is EXCLUSIVE.
 */
export const getOlderClineMessagesMessageSchema = z.object({
	type: z.literal("getOlderClineMessages"),
	beforeTs: z.number().optional(),
})

/**
 * Request the page of task-history rows immediately older than `beforeTs`.
 *
 * Lazy-fetch companion to the count+byte-bounded `state.taskHistory` window
 * (2026-09-17 taskHistory payload incident — the byte half of the 3.88.1 count
 * bound): `state` pushes now ship only the newest rows that fit the byte
 * budget, so the History panel asks for the omitted tail on demand. The
 * response is the outbound `olderTaskHistory` message. `beforeTs` is the
 * requester's oldest loaded row timestamp and is EXCLUSIVE.
 *
 * `scope` (2026-09-23 per-workspace history review) selects the workspace pool
 * to page within: `"current"` (default) for the active workspace folder,
 * `"all"` for every workspace. With `beforeTs` omitted the reply is the FIRST
 * bounded page of that scope, which the panel uses to reset on a scope switch.
 */
export const getOlderTaskHistoryMessageSchema = z.object({
	type: z.literal("getOlderTaskHistory"),
	beforeTs: z.number().optional(),
	scope: z.enum(["current", "all"]).optional(),
})

/** Insert text into the chat textarea. `text` stays optional to match the handler guard. */
export const insertTextIntoTextareaMessageSchema = z.object({
	type: z.literal("insertTextIntoTextarea"),
	text: z.string().optional(),
})

/** Dismiss an upsell by id. `upsellId` stays optional to match the handler guard. */
export const dismissUpsellMessageSchema = z.object({
	type: z.literal("dismissUpsell"),
	upsellId: z.string().optional(),
})

/** Request the list of dismissed upsells (empty payload). */
export const getDismissedUpsellsMessageSchema = z.object({
	type: z.literal("getDismissedUpsells"),
})

/** Open a markdown preview. `text` stays optional to match the handler guard. */
export const openMarkdownPreviewMessageSchema = z.object({
	type: z.literal("openMarkdownPreview"),
	text: z.string().optional(),
})

/** Discriminated union of the misc domain's fully-typed messages. */
export const miscMessageSchema = z.discriminatedUnion("type", [
	webviewDidLaunchMessageSchema,
	didShowAnnouncementMessageSchema,
	importRooHistoryMessageSchema,
	resetStateMessageSchema,
	openFileMessageSchema,
	readFileContentMessageSchema,
	openMentionMessageSchema,
	openExternalMessageSchema,
	openKeyboardShortcutsMessageSchema,
	taskSyncEnabledMessageSchema,
	searchFilesMessageSchema,
	refreshCustomToolsMessageSchema,
	focusPanelRequestMessageSchema,
	switchTabMessageSchema,
	requestModesMessageSchema,
	getModesFullConfigMessageSchema,
	getOlderClineMessagesMessageSchema,
	getOlderTaskHistoryMessageSchema,
	insertTextIntoTextareaMessageSchema,
	dismissUpsellMessageSchema,
	getDismissedUpsellsMessageSchema,
	openMarkdownPreviewMessageSchema,
])

export type MiscMessage = z.infer<typeof miscMessageSchema>

/**
 * Renderer-liveness probe, webview → host half: the webview's reply to a
 * `livenessPing` (2026-09-18 gray-webview capture; see the host-side probe in
 * `src/core/webview/webviewLivenessProbe.ts`).
 *
 * Handled by `src/core/webview/handlers/misc.ts`, which forwards the sequence
 * number to the probe. Numbers only — no identifiers, no content, no persistence.
 */
export const livenessPongMessageSchema = z.object({
	type: z.literal("livenessPong"),
	livenessPongSeq: z.number(),
})
