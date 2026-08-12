import { z } from "zod"

/**
 * Outbound command execution status message.
 *
 * The sender serializes a `CommandExecutionStatus` (see `terminal.ts`) to JSON in
 * the `text` field. During the transitional phase the boundary validates the
 * envelope structurally (`text` is a string); narrowing it to validate the
 * embedded JSON against `commandExecutionStatusSchema` is a follow-up step.
 */
export const commandExecutionStatusMessageSchema = z.object({
	type: z.literal("commandExecutionStatus"),
	text: z.string(),
})

/**
 * Outbound MCP execution status message.
 *
 * The sender serializes a `McpExecutionStatus` (see `mcp.ts`) to JSON in the
 * `text` field. Validated structurally during the transitional phase.
 */
export const mcpExecutionStatusMessageSchema = z.object({
	type: z.literal("mcpExecutionStatus"),
	text: z.string(),
})

/** Discriminated union of the outbound execution-status domain's fully-typed messages. */
export const executionMessageSchema = z.discriminatedUnion("type", [
	commandExecutionStatusMessageSchema,
	mcpExecutionStatusMessageSchema,
])

export type ExecutionMessage = z.infer<typeof executionMessageSchema>
