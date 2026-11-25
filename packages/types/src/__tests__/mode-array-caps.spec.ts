import { ZodError } from "zod"

import {
	MAX_CUSTOM_MODES,
	MAX_MODE_ALLOWED_MCP_SERVERS,
	assertRoomodesBounded,
	customModesSettingsSchema,
	modeConfigSchema,
} from "../mode.js"

/**
 * Decision D4 of the dependency security sweep: arrays that a cloned repository
 * can supply through `.roomodes` must be bounded before zod walks them. These
 * cases pin both directions — the cap itself is accepted, one element past it is
 * rejected with zod's "too_big" issue — so the limit cannot be raised or removed
 * silently.
 *
 * The second block pins the actual mitigation (decision D7, SYNC-23 CP2 F-01):
 * the `.max()` caps do NOT bound an oversized *invalid* payload, because zod v3
 * records one `too_big` issue and still visits every element. `assertRoomodesBounded`
 * rejects before `safeParse`, and the tests measure that no element is read.
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

/**
 * An array standing in for an attacker-supplied list that counts every index
 * read. `Array.isArray()` is still true (the proxy target is an array), so the
 * gate runs its real `length` branch, and any element access shows up in
 * `reads()`.
 */
function countedArray(length: number, fill: () => unknown = () => null) {
	let reads = 0
	const proxy = new Proxy(Array.from({ length }, fill), {
		get(target, property, receiver) {
			if (typeof property === "string" && /^\d+$/.test(property)) {
				reads += 1
			}
			return Reflect.get(target, property, receiver)
		},
	})
	return { proxy, reads: () => reads }
}

describe("pre-parse length gate (D7 — the mitigation the caps are not)", () => {
	it("refuses 200 000 custom modes without reading a single element", () => {
		const { proxy, reads } = countedArray(200_000)

		let thrown: unknown
		try {
			assertRoomodesBounded({ customModes: proxy })
		} catch (error) {
			thrown = error
		}

		expect(reads()).toBe(0)
		expect(thrown).toBeInstanceOf(Error)
		// A plain Error, not a ZodError: no issue list was built, so the number of
		// "issues" is exactly zero rather than one per element.
		expect(thrown instanceof ZodError).toBe(false)
		expect((thrown as Error).message).toContain("customModes")
		expect((thrown as Error).message).toContain("200000")
		expect((thrown as Error).message).toContain(String(MAX_CUSTOM_MODES))
	})

	it("refuses an oversized allowedMcpServers list without reading a single element", () => {
		const { proxy, reads } = countedArray(200_000)
		const modes = [{ ...modeAt(0), allowedMcpServers: proxy }]

		let thrown: unknown
		try {
			assertRoomodesBounded({ customModes: modes })
		} catch (error) {
			thrown = error
		}

		expect(reads()).toBe(0)
		expect(thrown instanceof ZodError).toBe(false)
		expect((thrown as Error).message).toContain('allowedMcpServers of mode "mode-0"')
		expect((thrown as Error).message).toContain(String(MAX_MODE_ALLOWED_MCP_SERVERS))
	})

	it("shows why the gate exists: the schema alone accumulates one issue per invalid mode", () => {
		const modes = Array.from({ length: 2_000 }, () => ({}))
		const result = customModesSettingsSchema.safeParse({ customModes: modes })

		expect(result.success).toBe(false)
		// 4 issues per invalid mode (slug, name, roleDefinition, groups) — 8 000
		// objects with a path array each, for a payload the gate rejects with one
		// error and zero issues.
		expect(result.error?.issues.length).toBeGreaterThanOrEqual(8_000)
	})

	it("lets the cap through and refuses cap + 1, so the gate is not stricter than the schema", () => {
		const atCap = Array.from({ length: MAX_CUSTOM_MODES }, (_, index) => modeAt(index))
		expect(() => assertRoomodesBounded({ customModes: atCap })).not.toThrow()

		const pastCap = Array.from({ length: MAX_CUSTOM_MODES + 1 }, (_, index) => modeAt(index))
		expect(() => assertRoomodesBounded({ customModes: pastCap })).toThrow(/customModes/)

		const serversAtCap = Array.from({ length: MAX_MODE_ALLOWED_MCP_SERVERS }, (_, index) => `s-${index}`)
		expect(() =>
			assertRoomodesBounded({ customModes: [{ ...modeAt(0), allowedMcpServers: serversAtCap }] }),
		).not.toThrow()

		const serversPastCap = [...serversAtCap, "one-too-many"]
		expect(() =>
			assertRoomodesBounded({ customModes: [{ ...modeAt(0), allowedMcpServers: serversPastCap }] }),
		).toThrow(/allowedMcpServers/)
	})

	it("ignores shapes it does not own, leaving them to schema validation", () => {
		expect(() => assertRoomodesBounded(undefined)).not.toThrow()
		expect(() => assertRoomodesBounded(null)).not.toThrow()
		expect(() => assertRoomodesBounded("not an object")).not.toThrow()
		expect(() => assertRoomodesBounded({})).not.toThrow()
		expect(() => assertRoomodesBounded({ customModes: "not an array" })).not.toThrow()
	})
})
