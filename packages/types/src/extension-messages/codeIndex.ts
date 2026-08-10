import { z } from "zod"

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

export type CodeIndexMessage = z.infer<typeof indexingStatusUpdateMessageSchema>
