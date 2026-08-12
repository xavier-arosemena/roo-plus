import { z } from "zod"

/**
 * Loose / transitional inbound message types (S1 sub-task 13).
 *
 * After Phase 3 (2026-08-12) only `draggedImages` remains. The other 8 loose
 * members (`currentApiConfigName`, `updateCondensingPrompt`, `playSound`,
 * `setopenAiCustomModelInfo`, `codebaseIndexEnabled`, `cancelMarketplaceInstall`,
 * `imageGenerationSettings`, `switchMode`) were confirmed dead — no sender in
 * `webview-ui/`, no handler, no consumer — and removed from the union/registry.
 *
 * `draggedImages` is GENUINELY INBOUND: the webview sends it via
 * `vscode.postMessage({ type: "draggedImages", dataUrls })` at
 * `webview-ui/src/components/chat/ChatTextArea.tsx:911`. It has NO handler case
 * in any domain router (verified 2026-08-10 against
 * `ClineProvider.setWebviewMessageListener` routing everything through
 * `webviewMessageHandler`, whose per-domain dispatch map has no entry for it —
 * it hits the debug-only fall-through by design). Because it is registered with
 * a REAL payload schema (not a minimal empty one), the boundary validates its
 * `dataUrls` strictly while preserving existing behavior.
 */

/**
 * Genuinely inbound — the webview posts `{ type: "draggedImages", dataUrls }`
 * from the chat textarea (drag-and-drop images). No handler consumes it (hits
 * the router debug fall-through — existing behavior, unchanged), but it is
 * registered + typed properly so the inbound registry stays complete.
 *
 * The live sender (`ChatTextArea.tsx`) always posts `dataUrls` as a `string[]`
 * (data-URLs), so the field is required.
 */
export const draggedImagesMessageSchema = z.object({
	type: z.literal("draggedImages"),
	dataUrls: z.array(z.string()),
})

/** Discriminated union of the loose / transitional message schemas. */
export const looseMessageSchema = z.discriminatedUnion("type", [draggedImagesMessageSchema])

export type LooseMessage = z.infer<typeof looseMessageSchema>
