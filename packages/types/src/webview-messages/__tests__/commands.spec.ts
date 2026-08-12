import { describe, it, expect } from "vitest"

import {
	allowedCommandsMessageSchema,
	deniedCommandsMessageSchema,
	commandsMessageSchema,
	commandFilesMessageSchema,
	createCommandMessageSchema,
	deleteCommandMessageSchema,
	openCommandFileMessageSchema,
	requestCommandsMessageSchema,
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

describe("requestCommandsMessageSchema", () => {
	it("accepts an empty-payload message", () => {
		const result = requestCommandsMessageSchema.safeParse({ type: "requestCommands" })
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.type).toBe("requestCommands")
		}
	})

	it("rejects a message with the wrong type literal", () => {
		expect(requestCommandsMessageSchema.safeParse({ type: "createCommand" }).success).toBe(false)
	})

	it("rejects a non-object payload", () => {
		expect(requestCommandsMessageSchema.safeParse("requestCommands").success).toBe(false)
		expect(requestCommandsMessageSchema.safeParse(null).success).toBe(false)
	})
})

describe("openCommandFileMessageSchema", () => {
	it("accepts a valid message with text and values", () => {
		const result = openCommandFileMessageSchema.safeParse({
			type: "openCommandFile",
			text: "deploy",
			values: { source: "global" },
		})
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.text).toBe("deploy")
			expect(result.data.values?.source).toBe("global")
		}
	})

	it("accepts a message without text or values (handler guards presence)", () => {
		expect(openCommandFileMessageSchema.safeParse({ type: "openCommandFile" }).success).toBe(true)
	})

	it("rejects an invalid source enum value", () => {
		expect(
			openCommandFileMessageSchema.safeParse({
				type: "openCommandFile",
				text: "deploy",
				values: { source: "built-in" },
			}).success,
		).toBe(false)
	})

	it("rejects a non-string text", () => {
		expect(openCommandFileMessageSchema.safeParse({ type: "openCommandFile", text: 42 }).success).toBe(false)
	})

	it("rejects a non-object values payload", () => {
		expect(openCommandFileMessageSchema.safeParse({ type: "openCommandFile", values: "nope" }).success).toBe(false)
	})

	it("rejects a message with the wrong type literal", () => {
		expect(openCommandFileMessageSchema.safeParse({ type: "deleteCommand", text: "x" }).success).toBe(false)
	})
})

describe("deleteCommandMessageSchema", () => {
	it("accepts a valid message with text and values", () => {
		const result = deleteCommandMessageSchema.safeParse({
			type: "deleteCommand",
			text: "old",
			values: { source: "project" },
		})
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.text).toBe("old")
			expect(result.data.values?.source).toBe("project")
		}
	})

	it("accepts a message with only text (no values)", () => {
		expect(deleteCommandMessageSchema.safeParse({ type: "deleteCommand", text: "old" }).success).toBe(true)
	})

	it("rejects an invalid source enum value", () => {
		expect(
			deleteCommandMessageSchema.safeParse({
				type: "deleteCommand",
				text: "old",
				values: { source: "team" },
			}).success,
		).toBe(false)
	})

	it("rejects a non-string text", () => {
		expect(deleteCommandMessageSchema.safeParse({ type: "deleteCommand", text: ["old"] }).success).toBe(false)
	})

	it("rejects a message with the wrong type literal", () => {
		expect(deleteCommandMessageSchema.safeParse({ type: "createCommand", text: "old" }).success).toBe(false)
	})
})

describe("createCommandMessageSchema", () => {
	it("accepts a valid message with text and values", () => {
		const result = createCommandMessageSchema.safeParse({
			type: "createCommand",
			text: "new.md",
			values: { source: "global" },
		})
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.text).toBe("new.md")
			expect(result.data.values?.source).toBe("global")
		}
	})

	it("accepts a message without text (handler generates a name)", () => {
		expect(
			createCommandMessageSchema.safeParse({ type: "createCommand", values: { source: "project" } }).success,
		).toBe(true)
	})

	it("rejects an invalid source enum value", () => {
		expect(
			createCommandMessageSchema.safeParse({
				type: "createCommand",
				text: "new.md",
				values: { source: "built-in" },
			}).success,
		).toBe(false)
	})

	it("rejects a non-string text", () => {
		expect(createCommandMessageSchema.safeParse({ type: "createCommand", text: 42 }).success).toBe(false)
	})

	it("rejects a non-object values payload", () => {
		expect(createCommandMessageSchema.safeParse({ type: "createCommand", values: 42 }).success).toBe(false)
	})

	it("rejects a message with the wrong type literal", () => {
		expect(createCommandMessageSchema.safeParse({ type: "openCommandFile", text: "new.md" }).success).toBe(false)
	})
})

describe("commandFilesMessageSchema (discriminated union)", () => {
	it("narrows to createCommand with typed values", () => {
		const parsed = commandFilesMessageSchema.safeParse({
			type: "createCommand",
			text: "new.md",
			values: { source: "project" },
		})
		expect(parsed.success).toBe(true)
		if (parsed.success && parsed.data.type === "createCommand") {
			expect(parsed.data.values?.source).toBe("project")
			expect(parsed.data.text).toBe("new.md")
		}
	})

	it("narrows to requestCommands", () => {
		const parsed = commandFilesMessageSchema.safeParse({ type: "requestCommands" })
		expect(parsed.success).toBe(true)
		if (parsed.success) {
			expect(parsed.data.type).toBe("requestCommands")
		}
	})

	it("rejects malformed members (createCommand with invalid source enum)", () => {
		expect(commandFilesMessageSchema.safeParse({ type: "createCommand", values: { source: "team" } }).success).toBe(
			false,
		)
		expect(commandFilesMessageSchema.safeParse({ type: "deleteCommand", text: 7 }).success).toBe(false)
	})

	it("rejects a type outside the domain", () => {
		expect(commandFilesMessageSchema.safeParse({ type: "allowedCommands", commands: [] }).success).toBe(false)
	})
})

describe("parseWebviewMessage boundary for command files", () => {
	it("accepts a valid requestCommands message at the boundary", () => {
		const result = parseWebviewMessage({ type: "requestCommands" })
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.message.type).toBe("requestCommands")
		}
	})

	it("accepts a valid createCommand message at the boundary", () => {
		const result = parseWebviewMessage({ type: "createCommand", text: "new.md", values: { source: "global" } })
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.message.type).toBe("createCommand")
		}
	})

	it("rejects a malformed createCommand (invalid source enum) at the boundary", () => {
		const result = parseWebviewMessage({ type: "createCommand", text: "new.md", values: { source: "team" } })
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.error).toContain("createCommand")
		}
	})

	it("rejects a malformed deleteCommand (non-string text) at the boundary", () => {
		const result = parseWebviewMessage({ type: "deleteCommand", text: 42, values: { source: "global" } })
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.error).toContain("deleteCommand")
		}
	})
})
