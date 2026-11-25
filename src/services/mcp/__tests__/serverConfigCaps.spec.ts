import {
	MAX_MCP_ALWAYS_ALLOW,
	MAX_MCP_DISABLED_TOOLS,
	MAX_MCP_SERVER_ARGS,
	MAX_MCP_WATCH_PATHS,
	ServerConfigSchema,
} from "../McpHub"

/**
 * Decision D4 of the dependency security sweep: `.roo/mcp.json` is workspace
 * content, so a cloned repository must not be able to hand the extension an
 * unbounded array to validate. Each cap is pinned in both directions.
 */
const fill = (length: number) => Array.from({ length }, (_, index) => `value-${index}`)
const stdio = (overrides: Record<string, unknown> = {}) => ({ command: "node", ...overrides })

describe(".roo/mcp.json array caps", () => {
	it.each([
		["args", MAX_MCP_SERVER_ARGS],
		["alwaysAllow", MAX_MCP_ALWAYS_ALLOW],
		["disabledTools", MAX_MCP_DISABLED_TOOLS],
		["watchPaths", MAX_MCP_WATCH_PATHS],
	])("accepts %s exactly at its cap", (field, cap) => {
		expect(ServerConfigSchema.safeParse(stdio({ [field]: fill(cap) })).success).toBe(true)
	})

	it.each([
		["args", MAX_MCP_SERVER_ARGS],
		["alwaysAllow", MAX_MCP_ALWAYS_ALLOW],
		["disabledTools", MAX_MCP_DISABLED_TOOLS],
		["watchPaths", MAX_MCP_WATCH_PATHS],
	])("rejects %s one element past its cap", (field, cap) => {
		const result = ServerConfigSchema.safeParse(stdio({ [field]: fill(cap + 1) }))
		expect(result.success).toBe(false)
	})
})
