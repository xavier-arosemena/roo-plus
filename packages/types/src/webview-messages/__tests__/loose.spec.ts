import { describe, it, expect } from "vitest"

import { draggedImagesMessageSchema, looseMessageSchema, parseWebviewMessage, webviewMessageSchemas } from "../index.js"

/**
 * Loose / transitional inbound types have NO handler case in any domain router
 * (verified 2026-08-10). After Phase 3 (2026-08-12) only `draggedImages` remains:
 * it IS genuinely inbound (the webview posts `{ type: "draggedImages", dataUrls }`
 * from `ChatTextArea.tsx:911`) but has no handler (hits the debug fall-through by
 * design). It is registered with a REAL payload schema (`dataUrls: string[]`), so
 * the boundary validates it strictly while preserving existing behavior.
 *
 * The other 8 loose members were confirmed dead (no sender/handler/consumer) and
 * removed in Phase 3 — see `loose.ts` for details.
 */
const LOOSE_SCHEMAS = [["draggedImages", draggedImagesMessageSchema]] as const

describe("loose / transitional message schemas", () => {
	it("registers every loose type in the global registry", () => {
		for (const [type] of LOOSE_SCHEMAS) {
			expect(webviewMessageSchemas[type]).toBeDefined()
		}
	})

	it.each(LOOSE_SCHEMAS)("accepts %s with its required payload", (type, schema) => {
		const result = schema.safeParse({ type, dataUrls: [] })
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.type).toBe(type)
		}
	})

	it.each(LOOSE_SCHEMAS)(
		"preserves typed payload keys while stripping unknown keys from %s (legacy sender payload still passes)",
		(type, schema) => {
			const result = schema.safeParse({ type, dataUrls: ["a.png"], someLegacyField: 123, another: "x" })
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data).toEqual({ type, dataUrls: ["a.png"] })
			}
		},
	)

	it.each(LOOSE_SCHEMAS)("rejects %s with the wrong type literal", (type, schema) => {
		expect(schema.safeParse({ type: "playSound", dataUrls: [] }).success).toBe(false)
	})

	it.each(LOOSE_SCHEMAS)("rejects %s with a non-array dataUrls", (type, schema) => {
		expect(schema.safeParse({ type, dataUrls: "nope" }).success).toBe(false)
	})

	it("rejects a non-object payload", () => {
		expect(draggedImagesMessageSchema.safeParse(null).success).toBe(false)
		expect(draggedImagesMessageSchema.safeParse("draggedImages").success).toBe(false)
	})

	it("the loose union rejects a type outside the set", () => {
		expect(looseMessageSchema.safeParse({ type: "newTask" }).success).toBe(false)
	})

	it("the loose union narrows to each member", () => {
		for (const [type] of LOOSE_SCHEMAS) {
			const parsed = looseMessageSchema.safeParse({ type, dataUrls: [] })
			expect(parsed.success).toBe(true)
			if (parsed.success) {
				expect(parsed.data.type).toBe(type)
			}
		}
	})
})

describe("parseWebviewMessage boundary for loose types", () => {
	it.each(LOOSE_SCHEMAS.map(([type]) => [type] as const))(
		"accepts %s at the boundary (registered, required payload)",
		(type) => {
			const result = parseWebviewMessage({ type, dataUrls: [] })
			expect(result.ok).toBe(true)
			if (result.ok) {
				expect(result.message.type).toBe(type)
			}
		},
	)

	it("accepts a loose type with legacy payload keys at the boundary (stripped, dataUrls preserved)", () => {
		const result = parseWebviewMessage({
			type: "draggedImages",
			dataUrls: ["data:image/png;base64,abc"],
			someLegacyField: 1,
		})
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.message).toEqual({ type: "draggedImages", dataUrls: ["data:image/png;base64,abc"] })
		}
	})

	it("rejects a loose type with a non-array dataUrls at the boundary", () => {
		const result = parseWebviewMessage({ type: "draggedImages", dataUrls: "nope" })
		expect(result.ok).toBe(false)
	})
})
