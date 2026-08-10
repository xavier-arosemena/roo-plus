import { describe, it, expect } from "vitest"

import {
	extensionMessageSchema,
	extensionMessageSchemas,
	parseExtensionMessage,
	type ExtensionMessageType,
} from "../index.js"

describe("parseExtensionMessage", () => {
	describe("non-object input", () => {
		it.each([null, undefined, 42, "hello", true])("rejects %j", (raw) => {
			const result = parseExtensionMessage(raw)
			expect(result.ok).toBe(false)
			if (!result.ok) {
				expect(result.error).toContain("object")
			}
		})

		it("rejects an array (no type field)", () => {
			const result = parseExtensionMessage([])
			expect(result.ok).toBe(false)
		})
	})

	describe("missing or invalid type", () => {
		it("rejects an object without a type", () => {
			const result = parseExtensionMessage({ text: "hi" })
			expect(result.ok).toBe(false)
			if (!result.ok) {
				expect(result.error).toContain("type")
			}
		})

		it("rejects a non-string type", () => {
			const result = parseExtensionMessage({ type: 42 })
			expect(result.ok).toBe(false)
			if (!result.ok) {
				expect(result.error).toContain("type")
			}
		})
	})

	describe("unregistered types (transitional pass-through)", () => {
		it("passes through a garbage type without rejecting", () => {
			const raw = { type: "totallyUnknownOutboundType", someField: 123 }
			const result = parseExtensionMessage(raw)
			expect(result.ok).toBe(true)
			if (result.ok) {
				expect(result.message).toBe(raw)
			}
		})

		it("passes through a real unregistered outbound type", () => {
			const raw = { type: "taskHistoryUpdated", taskHistory: [] }
			const result = parseExtensionMessage(raw)
			expect(result.ok).toBe(true)
			if (result.ok) {
				expect(result.message.type).toBe("taskHistoryUpdated")
			}
		})
	})

	describe("registered state", () => {
		const valid = {
			type: "state",
			state: { version: "1.0.0", mode: "code", cwd: "/workspace" },
		}

		it("accepts a valid state message", () => {
			const result = parseExtensionMessage(valid)
			expect(result.ok).toBe(true)
			if (result.ok) {
				expect(result.message.type).toBe("state")
				expect(result.message.state).toEqual(valid.state)
			}
		})

		it("retains unknown state fields (transitional passthrough)", () => {
			const result = parseExtensionMessage({
				type: "state",
				state: { version: "1.0.0", someFutureField: 123 },
			})
			expect(result.ok).toBe(true)
			if (result.ok) {
				expect((result.message.state as Record<string, unknown>).someFutureField).toBe(123)
			}
		})

		it("rejects a non-object state payload", () => {
			const result = parseExtensionMessage({ type: "state", state: "nope" })
			expect(result.ok).toBe(false)
			if (!result.ok) {
				expect(result.error).toContain("state")
			}
		})

		it("rejects a state with a wrong-typed known scalar", () => {
			const result = parseExtensionMessage({ type: "state", state: { version: 42 } })
			expect(result.ok).toBe(false)
			if (!result.ok) {
				expect(result.error).toContain("version")
			}
		})
	})

	describe("registered commandExecutionStatus", () => {
		const valid = { type: "commandExecutionStatus", text: JSON.stringify({ executionId: "1", status: "exited" }) }

		it("accepts a valid message", () => {
			const result = parseExtensionMessage(valid)
			expect(result.ok).toBe(true)
			if (result.ok) {
				expect(result.message.type).toBe("commandExecutionStatus")
			}
		})

		it("rejects a message missing the text field", () => {
			const result = parseExtensionMessage({ type: "commandExecutionStatus" })
			expect(result.ok).toBe(false)
			if (!result.ok) {
				expect(result.error).toContain("commandExecutionStatus")
			}
		})

		it("rejects a non-string text field", () => {
			const result = parseExtensionMessage({ type: "commandExecutionStatus", text: 42 })
			expect(result.ok).toBe(false)
		})
	})

	describe("registered mcpExecutionStatus", () => {
		it("accepts a valid message", () => {
			const result = parseExtensionMessage({ type: "mcpExecutionStatus", text: "{}" })
			expect(result.ok).toBe(true)
			if (result.ok) {
				expect(result.message.type).toBe("mcpExecutionStatus")
			}
		})

		it("rejects a message missing the text field", () => {
			const result = parseExtensionMessage({ type: "mcpExecutionStatus" })
			expect(result.ok).toBe(false)
		})
	})

	describe("registered fileContent", () => {
		it("accepts a valid message with content", () => {
			const result = parseExtensionMessage({ type: "fileContent", fileContent: { path: "a.ts", content: "x" } })
			expect(result.ok).toBe(true)
			if (result.ok) {
				expect(result.message.type).toBe("fileContent")
			}
		})

		it("accepts a null content with an error", () => {
			const result = parseExtensionMessage({
				type: "fileContent",
				fileContent: { path: "a.ts", content: null, error: "not found" },
			})
			expect(result.ok).toBe(true)
		})

		it("rejects a missing fileContent payload", () => {
			const result = parseExtensionMessage({ type: "fileContent" })
			expect(result.ok).toBe(false)
		})

		it("rejects a non-object fileContent payload", () => {
			const result = parseExtensionMessage({ type: "fileContent", fileContent: "nope" })
			expect(result.ok).toBe(false)
		})
	})

	describe("registered indexingStatusUpdate", () => {
		const valid = {
			type: "indexingStatusUpdate",
			values: { systemStatus: "Indexed", processedItems: 10, totalItems: 10 },
		}

		it("accepts a valid message", () => {
			const result = parseExtensionMessage(valid)
			expect(result.ok).toBe(true)
			if (result.ok) {
				expect(result.message.type).toBe("indexingStatusUpdate")
			}
		})

		it("rejects a message missing required values fields", () => {
			const result = parseExtensionMessage({
				type: "indexingStatusUpdate",
				values: { systemStatus: "Indexed" },
			})
			expect(result.ok).toBe(false)
		})

		it("rejects a non-object values payload", () => {
			const result = parseExtensionMessage({ type: "indexingStatusUpdate", values: "nope" })
			expect(result.ok).toBe(false)
		})
	})

	it("seeds the Phase-0 baseline schema registry", () => {
		const expected: ExtensionMessageType[] = [
			"state",
			"commandExecutionStatus",
			"mcpExecutionStatus",
			"fileContent",
			"indexingStatusUpdate",
		]

		for (const type of expected) {
			expect(extensionMessageSchemas[type]).toBeDefined()
		}
		expect(Object.keys(extensionMessageSchemas)).toHaveLength(5)
	})

	it("builds a discriminated union over the registered types", () => {
		const parsed = extensionMessageSchema.safeParse({
			type: "fileContent",
			fileContent: { path: "a.ts", content: "x" },
		})
		expect(parsed.success).toBe(true)
		if (parsed.success) {
			// Discriminator narrowing works on the typed subset.
			expect(parsed.data.type).toBe("fileContent")
		}
	})

	it("the exported literal union stays in sync with ExtensionMessage types", () => {
		// "state" must be a known ExtensionMessageType (still outbound).
		const type: ExtensionMessageType = "state"
		expect(type).toBe("state")
	})
})
