import { z } from "zod"

/**
 * Command allow/deny messages (security-critical).
 *
 * The webview posts these with the array of command prefixes to allow/deny for
 * auto-approval. Once registered, the boundary rejects any message whose
 * `commands` is not an array of strings — a crafted non-array payload can no
 * longer reach the handler.
 */
export const allowedCommandsMessageSchema = z.object({
	type: z.literal("allowedCommands"),
	commands: z.array(z.string()),
})

export const deniedCommandsMessageSchema = z.object({
	type: z.literal("deniedCommands"),
	commands: z.array(z.string()),
})

/** Discriminated union of the command allow/deny domain's fully-typed messages. */
export const commandsMessageSchema = z.discriminatedUnion("type", [
	allowedCommandsMessageSchema,
	deniedCommandsMessageSchema,
])

export type CommandsMessage = z.infer<typeof commandsMessageSchema>
