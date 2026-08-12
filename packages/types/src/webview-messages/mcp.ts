import { z } from "zod"

/**
 * MCP-domain messages.
 *
 * These control the MCP hub server-side: opening the settings files, restarting
 * / toggling / deleting servers, toggling per-tool auto-approve and prompt
 * inclusion, refreshing all connections, and updating the network timeout.
 *
 * Required fields match the handler's actual usage so the `!` assertions and
 * `message.source as "global" | "project"` casts can be dropped in
 * `src/core/webview/handlers/mcp.ts`. `serverName`/`source` stay optional on
 * `deleteMcpServer`/`updateMcpTimeout` to preserve the handler guard semantics
 * (the handler bails when `serverName` is absent / `timeout` isn't a number).
 */

/** Delete an MCP server configuration. `serverName` stays optional to match the handler guard. */
export const deleteMcpServerMessageSchema = z.object({
	type: z.literal("deleteMcpServer"),
	serverName: z.string().optional(),
	source: z.enum(["global", "project"]).optional(),
})

/** Open the user-level MCP settings JSON file (empty payload). */
export const openMcpSettingsMessageSchema = z.object({
	type: z.literal("openMcpSettings"),
})

/** Open the project-level MCP settings JSON file (empty payload). */
export const openProjectMcpSettingsMessageSchema = z.object({
	type: z.literal("openProjectMcpSettings"),
})

/** Restart (reconnect) an MCP server. `text` is the server name and is REQUIRED. */
export const restartMcpServerMessageSchema = z.object({
	type: z.literal("restartMcpServer"),
	text: z.string(),
	source: z.enum(["global", "project"]).optional(),
})

/**
 * Toggle whether a tool is always allowed on an MCP server. `serverName` and
 * `toolName` are REQUIRED; `alwaysAllow` stays optional because the handler
 * coerces with `Boolean(...)` (absent → false).
 */
export const toggleToolAlwaysAllowMessageSchema = z.object({
	type: z.literal("toggleToolAlwaysAllow"),
	serverName: z.string(),
	toolName: z.string(),
	source: z.enum(["global", "project"]).optional(),
	alwaysAllow: z.boolean().optional(),
})

/**
 * Toggle whether a tool is enabled for prompt inclusion on an MCP server.
 * `serverName` and `toolName` are REQUIRED; `isEnabled` stays optional because
 * the handler coerces with `Boolean(...)` (absent → false).
 */
export const toggleToolEnabledForPromptMessageSchema = z.object({
	type: z.literal("toggleToolEnabledForPrompt"),
	serverName: z.string(),
	toolName: z.string(),
	source: z.enum(["global", "project"]).optional(),
	isEnabled: z.boolean().optional(),
})

/**
 * Enable/disable an MCP server. `serverName` and `disabled` are REQUIRED —
 * the handler previously used `message.disabled!`.
 */
export const toggleMcpServerMessageSchema = z.object({
	type: z.literal("toggleMcpServer"),
	serverName: z.string(),
	disabled: z.boolean(),
	source: z.enum(["global", "project"]).optional(),
})

/** Refresh all MCP server connections (empty payload). */
export const refreshAllMcpServersMessageSchema = z.object({
	type: z.literal("refreshAllMcpServers"),
})

/**
 * Update an MCP server's network timeout. `serverName`/`timeout` stay optional
 * to match the handler guard (`if (message.serverName && typeof message.timeout === "number")`).
 */
export const updateMcpTimeoutMessageSchema = z.object({
	type: z.literal("updateMcpTimeout"),
	serverName: z.string().optional(),
	timeout: z.number().optional(),
	source: z.enum(["global", "project"]).optional(),
})

/** Discriminated union of the MCP domain's fully-typed messages. */
export const mcpMessageSchema = z.discriminatedUnion("type", [
	deleteMcpServerMessageSchema,
	openMcpSettingsMessageSchema,
	openProjectMcpSettingsMessageSchema,
	restartMcpServerMessageSchema,
	toggleToolAlwaysAllowMessageSchema,
	toggleToolEnabledForPromptMessageSchema,
	toggleMcpServerMessageSchema,
	refreshAllMcpServersMessageSchema,
	updateMcpTimeoutMessageSchema,
])

export type McpMessage = z.infer<typeof mcpMessageSchema>
