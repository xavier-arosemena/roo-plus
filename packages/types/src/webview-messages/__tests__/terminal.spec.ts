import { describe, it, expect } from "vitest"

import {
	terminalOperationMessageSchema,
	requestTerminalProfilesMessageSchema,
	openTerminalProfilePickerMessageSchema,
	terminalMessageSchema,
	parseWebviewMessage,
} from "../index.js"

describe("terminalOperationMessageSchema", () => {
	it("accepts a valid continue message", () => {
		const result = terminalOperationMessageSchema.safeParse({
			type: "terminalOperation",
			terminalOperation: "continue",
		})
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.terminalOperation).toBe("continue")
		}
	})

	it("accepts a valid abort message", () => {
		const result = terminalOperationMessageSchema.safeParse({
			type: "terminalOperation",
			terminalOperation: "abort",
		})
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.terminalOperation).toBe("abort")
		}
	})

	it("accepts a message without the optional terminalOperation field (matches the interface)", () => {
		expect(terminalOperationMessageSchema.safeParse({ type: "terminalOperation" }).success).toBe(true)
	})

	it.each([
		{ type: "terminalOperation", terminalOperation: "pause" },
		{ type: "terminalOperation", terminalOperation: 42 },
		{ type: "terminalOperation", terminalOperation: null },
		{ type: "terminalOperation", terminalOperation: { continue: true } },
	])("rejects malformed payload %j", (raw) => {
		expect(terminalOperationMessageSchema.safeParse(raw).success).toBe(false)
	})

	it("rejects a message with the wrong type literal", () => {
		expect(terminalOperationMessageSchema.safeParse({ type: "requestTerminalProfiles" }).success).toBe(false)
	})

	it("rejects a non-object payload", () => {
		expect(terminalOperationMessageSchema.safeParse("terminalOperation").success).toBe(false)
	})
})

describe("requestTerminalProfilesMessageSchema", () => {
	it("accepts a valid message", () => {
		const result = requestTerminalProfilesMessageSchema.safeParse({ type: "requestTerminalProfiles" })
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.type).toBe("requestTerminalProfiles")
		}
	})

	it("rejects a message with the wrong type literal", () => {
		expect(requestTerminalProfilesMessageSchema.safeParse({ type: "openTerminalProfilePicker" }).success).toBe(
			false,
		)
	})

	it("rejects a non-object payload", () => {
		expect(requestTerminalProfilesMessageSchema.safeParse(null).success).toBe(false)
		expect(requestTerminalProfilesMessageSchema.safeParse("requestTerminalProfiles").success).toBe(false)
	})
})

describe("openTerminalProfilePickerMessageSchema", () => {
	it("accepts a valid message", () => {
		const result = openTerminalProfilePickerMessageSchema.safeParse({ type: "openTerminalProfilePicker" })
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.type).toBe("openTerminalProfilePicker")
		}
	})

	it("rejects a message with the wrong type literal", () => {
		expect(openTerminalProfilePickerMessageSchema.safeParse({ type: "requestTerminalProfiles" }).success).toBe(
			false,
		)
	})

	it("rejects a non-object payload", () => {
		expect(openTerminalProfilePickerMessageSchema.safeParse([]).success).toBe(false)
	})
})

describe("terminalMessageSchema (discriminated union)", () => {
	it("narrows by type", () => {
		const parsed = terminalMessageSchema.safeParse({ type: "terminalOperation", terminalOperation: "abort" })
		expect(parsed.success).toBe(true)
		if (parsed.success && parsed.data.type === "terminalOperation") {
			expect(parsed.data.terminalOperation).toBe("abort")
		}
	})

	it("narrows to requestTerminalProfiles", () => {
		const parsed = terminalMessageSchema.safeParse({ type: "requestTerminalProfiles" })
		expect(parsed.success).toBe(true)
		if (parsed.success) {
			expect(parsed.data.type).toBe("requestTerminalProfiles")
		}
	})

	it("narrows to openTerminalProfilePicker", () => {
		const parsed = terminalMessageSchema.safeParse({ type: "openTerminalProfilePicker" })
		expect(parsed.success).toBe(true)
		if (parsed.success) {
			expect(parsed.data.type).toBe("openTerminalProfilePicker")
		}
	})

	it("rejects malformed members", () => {
		expect(terminalMessageSchema.safeParse({ type: "terminalOperation", terminalOperation: "bogus" }).success).toBe(
			false,
		)
		expect(terminalMessageSchema.safeParse({ type: "notATerminalType" }).success).toBe(false)
	})

	it("rejects a type outside the domain", () => {
		expect(terminalMessageSchema.safeParse({ type: "newTask", text: "hi" }).success).toBe(false)
	})
})

describe("parseWebviewMessage boundary for terminal", () => {
	it("accepts a valid terminalOperation message at the boundary", () => {
		const result = parseWebviewMessage({ type: "terminalOperation", terminalOperation: "continue" })
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.message.type).toBe("terminalOperation")
		}
	})

	it("rejects a crafted malformed terminalOperation message at the boundary", () => {
		const result = parseWebviewMessage({ type: "terminalOperation", terminalOperation: "pause" })
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.error).toContain("terminalOperation")
		}
	})

	it("accepts a valid requestTerminalProfiles message at the boundary", () => {
		const result = parseWebviewMessage({ type: "requestTerminalProfiles" })
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.message.type).toBe("requestTerminalProfiles")
		}
	})

	it("accepts a valid openTerminalProfilePicker message at the boundary", () => {
		const result = parseWebviewMessage({ type: "openTerminalProfilePicker" })
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.message.type).toBe("openTerminalProfilePicker")
		}
	})
})
