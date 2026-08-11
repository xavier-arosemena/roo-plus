import { describe, it, expect } from "vitest"

import {
	cancelMarketplaceInstallMessageSchema,
	codebaseIndexEnabledMessageSchema,
	currentApiConfigNameMessageSchema,
	draggedImagesMessageSchema,
	imageGenerationSettingsMessageSchema,
	looseMessageSchema,
	marketplaceButtonClickedMessageSchema,
	parseWebviewMessage,
	playSoundMessageSchema,
	setopenAiCustomModelInfoMessageSchema,
	shareTaskSuccessMessageSchema,
	switchModeMessageSchema,
	updateCondensingPromptMessageSchema,
	webviewMessageSchemas,
} from "../index.js"

/**
 * Loose / transitional inbound types have NO handler case in any domain router
 * (verified 2026-08-10). They are registered with MINIMAL empty-payload schemas
 * so the registry is complete while preserving behavior: zod strips unknown
 * keys by default (any legacy sender payload still passes) and no handler
 * consumes them. These tests lock in registration + boundary acceptance.
 */
const LOOSE_SCHEMAS = [
	["currentApiConfigName", currentApiConfigNameMessageSchema],
	["updateCondensingPrompt", updateCondensingPromptMessageSchema],
	["playSound", playSoundMessageSchema],
	["draggedImages", draggedImagesMessageSchema],
	["setopenAiCustomModelInfo", setopenAiCustomModelInfoMessageSchema],
	["codebaseIndexEnabled", codebaseIndexEnabledMessageSchema],
	["marketplaceButtonClicked", marketplaceButtonClickedMessageSchema],
	["cancelMarketplaceInstall", cancelMarketplaceInstallMessageSchema],
	["imageGenerationSettings", imageGenerationSettingsMessageSchema],
	["switchMode", switchModeMessageSchema],
	["shareTaskSuccess", shareTaskSuccessMessageSchema],
] as const

describe("loose / transitional message schemas", () => {
	it("registers every loose type in the global registry", () => {
		for (const [type] of LOOSE_SCHEMAS) {
			expect(webviewMessageSchemas[type]).toBeDefined()
		}
	})

	it.each(LOOSE_SCHEMAS)("accepts %s with only the type literal", (type, schema) => {
		const result = schema.safeParse({ type })
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.type).toBe(type)
		}
	})

	it.each(LOOSE_SCHEMAS)(
		"strips unknown payload keys from %s (legacy sender payload still passes)",
		(type, schema) => {
			const result = schema.safeParse({ type, someLegacyField: 123, another: "x" })
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data).toEqual({ type })
			}
		},
	)

	it.each(LOOSE_SCHEMAS)("rejects %s with the wrong type literal", (type, schema) => {
		expect(schema.safeParse({ type: "playSound" }).success).toBe(type === "playSound")
	})

	it("rejects a non-object payload", () => {
		expect(playSoundMessageSchema.safeParse(null).success).toBe(false)
		expect(switchModeMessageSchema.safeParse("switchMode").success).toBe(false)
	})

	it("the loose union rejects a type outside the set", () => {
		expect(looseMessageSchema.safeParse({ type: "newTask" }).success).toBe(false)
	})

	it("the loose union narrows to each member", () => {
		for (const [type] of LOOSE_SCHEMAS) {
			const parsed = looseMessageSchema.safeParse({ type })
			expect(parsed.success).toBe(true)
			if (parsed.success) {
				expect(parsed.data.type).toBe(type)
			}
		}
	})
})

describe("parseWebviewMessage boundary for loose types", () => {
	it.each(LOOSE_SCHEMAS.map(([type]) => [type] as const))(
		"accepts %s at the boundary (registered, empty payload)",
		(type) => {
			const result = parseWebviewMessage({ type })
			expect(result.ok).toBe(true)
			if (result.ok) {
				expect(result.message.type).toBe(type)
			}
		},
	)

	it("accepts a loose type with legacy payload keys at the boundary (stripped)", () => {
		const result = parseWebviewMessage({ type: "draggedImages", dataUrls: ["data:image/png;base64,abc"] })
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.message.type).toBe("draggedImages")
		}
	})
})
