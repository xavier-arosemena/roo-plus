import { describe, it, expect } from "vitest"

import { updateSettingsMessageSchema, parseWebviewMessage } from "../index.js"

describe("updateSettingsMessageSchema", () => {
	it("accepts a valid settings update", () => {
		const result = updateSettingsMessageSchema.safeParse({
			type: "updateSettings",
			updatedSettings: { soundEnabled: true, terminalProfile: "Git Bash" },
		})
		expect(result.success).toBe(true)
	})

	it("retains unknown future settings fields (passthrough)", () => {
		const result = updateSettingsMessageSchema.safeParse({
			type: "updateSettings",
			updatedSettings: { soundEnabled: true, someFutureSetting: "future-value" },
		})
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.updatedSettings).toMatchObject({ someFutureSetting: "future-value" })
		}
	})

	it("accepts a message without updatedSettings", () => {
		expect(updateSettingsMessageSchema.safeParse({ type: "updateSettings" }).success).toBe(true)
	})

	it.each([
		{ type: "updateSettings", updatedSettings: { soundEnabled: "yes" } },
		{ type: "updateSettings", updatedSettings: { terminalProfile: 42 } },
		{ type: "updateSettings", updatedSettings: { allowedCommands: "npm test" } },
		{ type: "updateSettings", updatedSettings: null },
	])("rejects malformed known-field types %j", (raw) => {
		expect(updateSettingsMessageSchema.safeParse(raw).success).toBe(false)
	})
})

describe("parseWebviewMessage boundary for updateSettings", () => {
	it("accepts a valid updateSettings message", () => {
		const result = parseWebviewMessage({ type: "updateSettings", updatedSettings: { soundEnabled: false } })
		expect(result.ok).toBe(true)
	})

	it("rejects a crafted malformed updateSettings message (wrong known-field type)", () => {
		const result = parseWebviewMessage({ type: "updateSettings", updatedSettings: { terminalProfile: 42 } })
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.error).toContain("updateSettings")
		}
	})
})
