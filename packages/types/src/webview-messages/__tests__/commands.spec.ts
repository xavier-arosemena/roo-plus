import { describe, it, expect } from "vitest"

import {
	allowedCommandsMessageSchema,
	deniedCommandsMessageSchema,
	commandsMessageSchema,
	parseWebviewMessage,
} from "../index.js"

describe("allowedCommandsMessageSchema", () => {
	const valid = { type: "allowedCommands", commands: ["npm test", "git push"] }

	it("accepts a valid message", () => {
		const result = allowedCommandsMessageSchema.safeParse(valid)
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.commands).toEqual(["npm test", "git push"])
		}
	})

	it("accepts an empty commands array", () => {
		const result = allowedCommandsMessageSchema.safeParse({ type: "allowedCommands", commands: [] })
		expect(result.success).toBe(true)
	})

	it.each([
		{ type: "allowedCommands", commands: "npm test" },
		{ type: "allowedCommands", commands: [42, "npm test"] },
		{ type: "allowedCommands" },
		{ type: "allowedCommands", commands: [null] },
	])("rejects malformed payload %j", (raw) => {
		expect(allowedCommandsMessageSchema.safeParse(raw).success).toBe(false)
	})

	it("rejects a message with the wrong type literal", () => {
		expect(allowedCommandsMessageSchema.safeParse({ type: "deniedCommands", commands: [] }).success).toBe(false)
	})
})

describe("deniedCommandsMessageSchema", () => {
	it("accepts a valid message", () => {
		const result = deniedCommandsMessageSchema.safeParse({ type: "deniedCommands", commands: ["rm -rf"] })
		expect(result.success).toBe(true)
	})

	it("rejects a non-array commands payload", () => {
		expect(deniedCommandsMessageSchema.safeParse({ type: "deniedCommands", commands: "rm -rf" }).success).toBe(
			false,
		)
	})
})

describe("commandsMessageSchema (discriminated union)", () => {
	it("narrows by type", () => {
		const parsed = commandsMessageSchema.safeParse({ type: "allowedCommands", commands: ["npm test"] })
		expect(parsed.success).toBe(true)
		if (parsed.success) {
			expect(parsed.data.type).toBe("allowedCommands")
		}
	})

	it("rejects malformed members", () => {
		expect(commandsMessageSchema.safeParse({ type: "deniedCommands", commands: "nope" }).success).toBe(false)
	})
})

describe("parseWebviewMessage boundary for commands", () => {
	it("accepts a valid allowedCommands message at the boundary", () => {
		const result = parseWebviewMessage({ type: "allowedCommands", commands: ["npm test"] })
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.message.type).toBe("allowedCommands")
		}
	})

	it("rejects a crafted malformed allowedCommands message at the boundary", () => {
		const result = parseWebviewMessage({ type: "allowedCommands", commands: "npm test" })
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.error).toContain("allowedCommands")
		}
	})

	it("rejects a crafted malformed deniedCommands message at the boundary", () => {
		const result = parseWebviewMessage({ type: "deniedCommands", commands: [123] })
		expect(result.ok).toBe(false)
	})
})
