import { z } from "zod"

import { checkoutDiffPayloadSchema, checkoutRestorePayloadSchema } from "../vscode-extension-host.js"

/**
 * Seed schemas for the checkpoint domain.
 *
 * These prove the boundary reject-path end-to-end: the webview posts these as
 * top-level `{ type, payload }` messages and the payloads reuse the existing
 * schemas declared in `vscode-extension-host.ts` (single source of truth).
 */
export const checkpointDiffMessageSchema = z.object({
	type: z.literal("checkpointDiff"),
	payload: checkoutDiffPayloadSchema,
})

export const checkpointRestoreMessageSchema = z.object({
	type: z.literal("checkpointRestore"),
	payload: checkoutRestorePayloadSchema,
})

/** Discriminated union of the checkpoint domain's fully-typed messages. */
export const checkpointMessageSchema = z.discriminatedUnion("type", [
	checkpointDiffMessageSchema,
	checkpointRestoreMessageSchema,
])

export type CheckpointMessage = z.infer<typeof checkpointMessageSchema>
