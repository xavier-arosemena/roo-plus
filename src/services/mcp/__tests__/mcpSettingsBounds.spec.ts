import { ZodError, z } from "zod"

import {
	MAX_MCP_ALWAYS_ALLOW,
	MAX_MCP_DISABLED_TOOLS,
	MAX_MCP_ENV_VARS,
	MAX_MCP_SERVER_ARGS,
	MAX_MCP_SERVERS,
	MAX_MCP_WATCH_PATHS,
	ServerConfigSchema,
	assertMcpSettingsBounded,
} from "../McpHub"

/**
 * Decision D7 (SYNC-23 CP2 F-01): the `.max()` caps on the leaf arrays are
 * product limits, not a parsing bound — zod v3 records one `too_big` issue and
 * still walks every element, and `z.record(ServerConfigSchema)` (the
 * `mcpServers` record itself) has no cap at all. `assertMcpSettingsBounded` is
 * the bound that holds: it runs before `safeParse` and rejects in O(1) per field.
 *
 * These tests measure that, rather than asserting it: every element of the
 * oversized payload is behind a getter (or an index-counting proxy) that would
 * fire if anything walked the collection.
 */

/** A record whose values throw on access, so a single element read is detectable. */
function guardedRecord(size: number) {
	let reads = 0
	const record: Record<string, unknown> = {}
	for (let index = 0; index < size; index += 1) {
		Object.defineProperty(record, `entry-${index}`, {
			enumerable: true,
			configurable: true,
			get() {
				reads += 1
				throw new Error("the gate read an element")
			},
		})
	}
	return { record, reads: () => reads }
}

const catchError = (run: () => void): unknown => {
	try {
		run()
		return undefined
	} catch (error) {
		return error
	}
}

describe(".roo/mcp.json pre-parse length gate (D7)", () => {
	it("refuses 200 000 servers without reading a single element", () => {
		const { record, reads } = guardedRecord(200_000)

		const thrown = catchError(() => assertMcpSettingsBounded({ mcpServers: record }))

		expect(reads()).toBe(0)
		expect(thrown).toBeInstanceOf(Error)
		// A plain Error, not a ZodError: zero issue objects were allocated, where
		// `z.record(ServerConfigSchema)` alone would have produced one per element.
		expect(thrown instanceof ZodError).toBe(false)
		expect((thrown as Error).message).toContain("mcpServers")
		expect((thrown as Error).message).toContain(String(MAX_MCP_SERVERS))
	})

	it("refuses an oversized env record without reading a single variable", () => {
		const { record, reads } = guardedRecord(200_000)

		const thrown = catchError(() =>
			assertMcpSettingsBounded({ mcpServers: { docs: { command: "node", env: record } } }),
		)

		expect(reads()).toBe(0)
		expect(thrown instanceof ZodError).toBe(false)
		expect((thrown as Error).message).toContain("mcpServers.docs.env")
		expect((thrown as Error).message).toContain(String(MAX_MCP_ENV_VARS))
	})

	it.each([
		["args", MAX_MCP_SERVER_ARGS],
		["alwaysAllow", MAX_MCP_ALWAYS_ALLOW],
		["watchPaths", MAX_MCP_WATCH_PATHS],
		["disabledTools", MAX_MCP_DISABLED_TOOLS],
	])("refuses an oversized %s array before the schema walks it", (field, cap) => {
		const oversized = Array.from({ length: 200_000 }, (_, index) => `value-${index}`)

		const thrown = catchError(() =>
			assertMcpSettingsBounded({ mcpServers: { docs: { command: "node", [field]: oversized } } }),
		)

		expect(thrown).toBeInstanceOf(Error)
		expect(thrown instanceof ZodError).toBe(false)
		expect((thrown as Error).message).toContain(`mcpServers.docs.${field}`)
		expect((thrown as Error).message).toContain(String(cap))
	})

	it("shows why the gate exists: the schema alone emits one issue per invalid server", () => {
		const servers = Object.fromEntries(Array.from({ length: 2_000 }, (_, index) => [`server-${index}`, {}]))

		const result = z.record(ServerConfigSchema).safeParse(servers)

		expect(result.success).toBe(false)
		expect(result.error?.issues.length).toBeGreaterThanOrEqual(2_000)
	})

	it("accepts every field exactly at its cap and refuses cap + 1", () => {
		const fill = (length: number) => Array.from({ length }, (_, index) => `v-${index}`)

		const atCap = Object.fromEntries(
			Array.from({ length: MAX_MCP_SERVERS }, (_, index) => [
				`server-${index}`,
				{
					command: "node",
					args: fill(MAX_MCP_SERVER_ARGS),
					env: Object.fromEntries(fill(MAX_MCP_ENV_VARS).map((key) => [key, "1"])),
				},
			]),
		)
		expect(() => assertMcpSettingsBounded({ mcpServers: atCap })).not.toThrow()

		const oneMoreServer = { ...atCap, "server-extra": { command: "node" } }
		expect(() => assertMcpSettingsBounded({ mcpServers: oneMoreServer })).toThrow(/mcpServers/)

		expect(() =>
			assertMcpSettingsBounded({
				mcpServers: { docs: { command: "node", args: fill(MAX_MCP_SERVER_ARGS + 1) } },
			}),
		).toThrow(/args/)
	})

	it("leaves legitimate shapes and non-owned shapes to the schema", () => {
		expect(() => assertMcpSettingsBounded({ mcpServers: {} })).not.toThrow()
		expect(() =>
			assertMcpSettingsBounded({
				mcpServers: {
					docs: { command: "npx", args: ["-y", "docs-server"], env: { TOKEN: "x" }, disabledTools: ["x"] },
				},
			}),
		).not.toThrow()
		expect(() => assertMcpSettingsBounded(undefined)).not.toThrow()
		expect(() => assertMcpSettingsBounded(null)).not.toThrow()
		expect(() => assertMcpSettingsBounded({})).not.toThrow()
		expect(() => assertMcpSettingsBounded({ mcpServers: "not a record" })).not.toThrow()
	})
})
