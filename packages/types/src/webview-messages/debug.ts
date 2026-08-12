import { z } from "zod"

/**
 * Debug-domain messages (S1 sub-task 13).
 *
 * Two empty-payload notifications open the API / UI conversation-history files
 * for the active task; `downloadErrorDiagnostics` carries optional error
 * metadata that is forwarded verbatim to `generateErrorDiagnostics` in
 * `src/core/webview/diagnosticsHandler.ts`. The `values` shape below mirrors
 * the `ErrorDiagnosticsValues` interface so the handler can drop its cast and
 * pass the parsed value straight through.
 */

/** Open the API conversation-history JSON for the active task (empty payload). */
export const openDebugApiHistoryMessageSchema = z.object({
	type: z.literal("openDebugApiHistory"),
})

/** Open the UI message-history JSON for the active task (empty payload). */
export const openDebugUiHistoryMessageSchema = z.object({
	type: z.literal("openDebugUiHistory"),
})

/**
 * Download error diagnostics for the active task. Optional `values` mirrors
 * `ErrorDiagnosticsValues` (`timestamp`/`version`/`provider`/`model`/`details`)
 * and is forwarded to `generateErrorDiagnostics`. The sender in
 * `webview-ui/src/components/chat/ErrorRow.tsx` always provides these five
 * string fields; every field stays optional to match the handler's
 * `values?.field ?? fallback` usage.
 */
export const downloadErrorDiagnosticsMessageSchema = z.object({
	type: z.literal("downloadErrorDiagnostics"),
	values: z
		.object({
			timestamp: z.string().optional(),
			version: z.string().optional(),
			provider: z.string().optional(),
			model: z.string().optional(),
			details: z.string().optional(),
		})
		.optional(),
})

/** Discriminated union of the debug domain's fully-typed messages. */
export const debugMessageSchema = z.discriminatedUnion("type", [
	openDebugApiHistoryMessageSchema,
	openDebugUiHistoryMessageSchema,
	downloadErrorDiagnosticsMessageSchema,
])

export type DebugMessage = z.infer<typeof debugMessageSchema>
