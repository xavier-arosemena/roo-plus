import { z } from "zod"

/**
 * Maximum number of MCP tools that can be enabled before showing a warning.
 * LLMs tend to perform poorly when given too many tools to choose from.
 */
export const MAX_MCP_TOOLS_THRESHOLD = 60

/**
 * McpServerUse
 */

export interface McpServerUse {
	type: string
	serverName: string
	toolName?: string
	uri?: string
}

/**
 * McpExecutionStatus
 */

export const mcpExecutionStatusSchema = z.discriminatedUnion("status", [
	z.object({
		executionId: z.string(),
		status: z.literal("started"),
		serverName: z.string(),
		toolName: z.string(),
	}),
	z.object({
		executionId: z.string(),
		status: z.literal("output"),
		response: z.string(),
	}),
	z.object({
		executionId: z.string(),
		status: z.literal("completed"),
		response: z.string().optional(),
	}),
	z.object({
		executionId: z.string(),
		status: z.literal("error"),
		error: z.string().optional(),
	}),
])

export type McpExecutionStatus = z.infer<typeof mcpExecutionStatusSchema>

/**
 * McpServer
 */

export type McpServer = {
	name: string
	config: string
	status: "connected" | "connecting" | "disconnected"
	error?: string
	errorHistory?: McpErrorEntry[]
	tools?: McpTool[]
	resources?: McpResource[]
	resourceTemplates?: McpResourceTemplate[]
	disabled?: boolean
	timeout?: number
	source?: "global" | "project"
	projectPath?: string
	instructions?: string
}

/**
 * Zod schema mirroring `McpServer` for payload validation at the outbound
 * message boundary (e.g. the `mcpServers` extension message).
 *
 * The tool `inputSchema` is an open JSON-Schema document produced by the MCP
 * SDK — there is no closed shape — so it is modeled as a free-form string-keyed
 * record of unknown values (transitional; a precise JSON-Schema type is out of
 * scope for the message boundary). The server object itself uses `.passthrough()`
 * so any future MCP fields the producer adds survive the boundary instead of
 * being silently stripped.
 */
export const mcpServerSchema = z
	.object({
		name: z.string(),
		config: z.string(),
		status: z.enum(["connected", "connecting", "disconnected"]),
		error: z.string().optional(),
		errorHistory: z
			.array(
				z.object({
					message: z.string(),
					timestamp: z.number(),
					level: z.enum(["error", "warn", "info"]),
				}),
			)
			.optional(),
		tools: z
			.array(
				z
					.object({
						name: z.string(),
						description: z.string().optional(),
						inputSchema: z.record(z.string(), z.unknown()).optional(),
						alwaysAllow: z.boolean().optional(),
						enabledForPrompt: z.boolean().optional(),
					})
					.passthrough(),
			)
			.optional(),
		resources: z
			.array(
				z.object({
					uri: z.string(),
					name: z.string(),
					mimeType: z.string().optional(),
					description: z.string().optional(),
				}),
			)
			.optional(),
		resourceTemplates: z
			.array(
				z.object({
					uriTemplate: z.string(),
					name: z.string(),
					description: z.string().optional(),
					mimeType: z.string().optional(),
				}),
			)
			.optional(),
		disabled: z.boolean().optional(),
		timeout: z.number().optional(),
		source: z.enum(["global", "project"]).optional(),
		projectPath: z.string().optional(),
		instructions: z.string().optional(),
	})
	.passthrough()

export type McpTool = {
	name: string
	description?: string
	inputSchema?: object
	alwaysAllow?: boolean
	enabledForPrompt?: boolean
}

export type McpResource = {
	uri: string
	name: string
	mimeType?: string
	description?: string
}

export type McpResourceTemplate = {
	uriTemplate: string
	name: string
	description?: string
	mimeType?: string
}

export type McpResourceResponse = {
	_meta?: Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
	contents: Array<{
		uri: string
		mimeType?: string
		text?: string
		blob?: string
	}>
}

export type McpResourceLinkAnnotations = {
	audience?: ("user" | "assistant")[]
	priority?: number
	lastModified?: string
}

// Defined in MCP spec 2025-06-18: https://modelcontextprotocol.io/specification/2025-06-18/server/tools
export type McpResourceLink = {
	type: "resource_link"
	uri: string
	name: string
	description?: string
	mimeType?: string
	title?: string
	size?: number
	annotations?: McpResourceLinkAnnotations
}

export type McpToolCallResponse = {
	_meta?: Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
	content: Array<
		| { type: "text"; text: string }
		| { type: "image"; data: string; mimeType: string }
		| { type: "audio"; data: string; mimeType: string }
		| { type: "resource"; resource: { uri: string; mimeType?: string; text?: string; blob?: string } }
		| McpResourceLink
	>
	isError?: boolean
}

export type McpErrorEntry = {
	message: string
	timestamp: number
	level: "error" | "warn" | "info"
}

/**
 * Result of counting enabled MCP tools across servers.
 */
export interface EnabledMcpToolsCount {
	/** Number of enabled and connected MCP servers */
	enabledServerCount: number
	/** Total number of enabled tools across all enabled servers */
	enabledToolCount: number
}

/**
 * Count the number of enabled MCP tools across all enabled and connected servers.
 * This is a pure function that can be used in both backend and frontend contexts.
 *
 * @param servers - Array of MCP server objects
 * @returns Object with enabledToolCount and enabledServerCount
 *
 * @example
 * const { enabledToolCount, enabledServerCount } = countEnabledMcpTools(mcpServers)
 * if (enabledToolCount > MAX_MCP_TOOLS_THRESHOLD) {
 *   // Show warning
 * }
 */
export function countEnabledMcpTools(servers: McpServer[]): EnabledMcpToolsCount {
	let serverCount = 0
	let toolCount = 0

	for (const server of servers) {
		// Skip disabled servers
		if (server.disabled) continue

		// Skip servers that are not connected
		if (server.status !== "connected") continue

		serverCount++

		// Count enabled tools on this server
		if (server.tools) {
			for (const tool of server.tools) {
				// Tool is enabled if enabledForPrompt is undefined (default) or true
				if (tool.enabledForPrompt !== false) {
					toolCount++
				}
			}
		}
	}

	return { enabledToolCount: toolCount, enabledServerCount: serverCount }
}
