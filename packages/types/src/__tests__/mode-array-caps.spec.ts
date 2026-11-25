import { MAX_CUSTOM_MODES, MAX_MODE_ALLOWED_MCP_SERVERS, customModesSettingsSchema, modeConfigSchema } from "../mode.js"

/**
 * Decision D4 of the dependency security sweep: arrays that a cloned repository
 * can supply through `.roomodes` must be bounded before zod walks them. These
 * cases pin both directions — the cap itself is accepted, one element past it is
 * rejected with zod's "too_big" issue — so the limit cannot be raised or removed
 * silently.
 */
const modeAt = (index: number) => ({
	slug: `mode-${index}`,
	name: `Mode ${index}`,
	roleDefinition: "role definition",
	groups: ["read"],
})

describe("externally supplied .roomodes array caps", () => {
	it("accepts a .roomodes file exactly at the custom-mode cap", () => {
		const modes = Array.from({ length: MAX_CUSTOM_MODES }, (_, index) => modeAt(index))
		const result = customModesSettingsSchema.safeParse({ customModes: modes })
		expect(result.success).toBe(true)
	})

	it("rejects a .roomodes file one mode past the cap", () => {
		const modes = Array.from({ length: MAX_CUSTOM_MODES + 1 }, (_, index) => modeAt(index))
		const result = customModesSettingsSchema.safeParse({ customModes: modes })
		expect(result.success).toBe(false)
		expect(result.error?.issues[0]?.code).toBe("too_big")
	})

	it("rejects a mode listing more MCP servers than the cap", () => {
		const servers = Array.from({ length: MAX_MODE_ALLOWED_MCP_SERVERS + 1 }, (_, index) => `server-${index}`)
		const result = modeConfigSchema.safeParse({ ...modeAt(0), allowedMcpServers: servers })
		expect(result.success).toBe(false)
		expect(result.error?.issues[0]?.code).toBe("too_big")
	})

	it("accepts a mode listing MCP servers exactly at the cap", () => {
		const servers = Array.from({ length: MAX_MODE_ALLOWED_MCP_SERVERS }, (_, index) => `server-${index}`)
		const result = modeConfigSchema.safeParse({ ...modeAt(0), allowedMcpServers: servers })
		expect(result.success).toBe(true)
	})
})
