import { describe, it, expect } from "vitest"

import { parseWebviewMessage, webviewMessageSchema, webviewMessageSchemas, type WebviewMessageType } from "../index.js"

describe("parseWebviewMessage", () => {
	describe("non-object input", () => {
		it.each([null, undefined, 42, "hello", true])("rejects %j", (raw) => {
			const result = parseWebviewMessage(raw)
			expect(result.ok).toBe(false)
			if (!result.ok) {
				expect(result.error).toContain("object")
			}
		})

		it("rejects an array (no type field)", () => {
			const result = parseWebviewMessage([])
			expect(result.ok).toBe(false)
		})
	})

	describe("missing or invalid type", () => {
		it("rejects an object without a type", () => {
			const result = parseWebviewMessage({ text: "hi" })
			expect(result.ok).toBe(false)
			if (!result.ok) {
				expect(result.error).toContain("type")
			}
		})

		it("rejects a non-string type", () => {
			const result = parseWebviewMessage({ type: 42 })
			expect(result.ok).toBe(false)
			if (!result.ok) {
				expect(result.error).toContain("type")
			}
		})
	})

	describe("unregistered types (transitional pass-through)", () => {
		it("passes through a garbage type without rejecting", () => {
			const raw = { type: "totallyUnknownType", someField: 123 }
			const result = parseWebviewMessage(raw)
			expect(result.ok).toBe(true)
			if (result.ok) {
				expect(result.message).toBe(raw)
			}
		})

		it("passes through a real unregistered inbound type", () => {
			const raw = { type: "newTask", text: "hi", images: [] }
			const result = parseWebviewMessage(raw)
			expect(result.ok).toBe(true)
			if (result.ok) {
				expect(result.message.type).toBe("newTask")
			}
		})
	})

	describe("registered checkpointDiff", () => {
		const valid = {
			type: "checkpointDiff",
			payload: { ts: 123, previousCommitHash: "prev", commitHash: "abc123", mode: "full" },
		}

		it("accepts a valid message", () => {
			const result = parseWebviewMessage(valid)
			expect(result.ok).toBe(true)
			if (result.ok) {
				expect(result.message.type).toBe("checkpointDiff")
				expect(result.message.payload).toEqual(valid.payload)
			}
		})

		it("rejects a malformed payload (missing required commitHash)", () => {
			const result = parseWebviewMessage({ type: "checkpointDiff", payload: { mode: "full" } })
			expect(result.ok).toBe(false)
			if (!result.ok) {
				expect(result.error).toContain("checkpointDiff")
			}
		})

		it("rejects a non-object payload", () => {
			const result = parseWebviewMessage({ type: "checkpointDiff", payload: "nope" })
			expect(result.ok).toBe(false)
		})

		it("rejects an invalid mode enum", () => {
			const result = parseWebviewMessage({
				type: "checkpointDiff",
				payload: { commitHash: "abc", mode: "bogus" },
			})
			expect(result.ok).toBe(false)
		})
	})

	describe("registered checkpointRestore", () => {
		const valid = { type: "checkpointRestore", payload: { ts: 1, commitHash: "abc", mode: "preview" } }

		it("accepts a valid message", () => {
			const result = parseWebviewMessage(valid)
			expect(result.ok).toBe(true)
			if (result.ok) {
				expect(result.message.type).toBe("checkpointRestore")
			}
		})

		it("rejects a malformed payload (missing required ts)", () => {
			const result = parseWebviewMessage({
				type: "checkpointRestore",
				payload: { commitHash: "abc", mode: "restore" },
			})
			expect(result.ok).toBe(false)
		})

		it("rejects an invalid mode", () => {
			const result = parseWebviewMessage({
				type: "checkpointRestore",
				payload: { ts: 1, commitHash: "abc", mode: "bogus" },
			})
			expect(result.ok).toBe(false)
		})
	})

	it("seeds exactly the two checkpoint schemas in the registry", () => {
		expect(webviewMessageSchemas.checkpointDiff).toBeDefined()
		expect(webviewMessageSchemas.checkpointRestore).toBeDefined()
		expect(Object.keys(webviewMessageSchemas)).toHaveLength(2)
	})

	it("builds a discriminated union over the registered types", () => {
		const parsed = webviewMessageSchema.safeParse({
			type: "checkpointDiff",
			payload: { commitHash: "abc", mode: "full" },
		})
		expect(parsed.success).toBe(true)
		if (parsed.success) {
			// Discriminator narrowing works on the typed subset.
			expect(parsed.data.type).toBe("checkpointDiff")
		}
	})

	it("the exported literal union stays in sync with WebviewMessage types", () => {
		// "checkpointDiff" must be a known WebviewMessageType (still inbound).
		const type: WebviewMessageType = "checkpointDiff"
		expect(type).toBe("checkpointDiff")
	})
})
