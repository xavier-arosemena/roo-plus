import { describe, it, expect } from "vitest"

import {
	queueMessageMessageSchema,
	removeQueuedMessageMessageSchema,
	editQueuedMessageMessageSchema,
	parseWebviewMessage,
} from "../index.js"

describe("queueMessageMessageSchema", () => {
	it("accepts a valid message with images", () => {
		const result = queueMessageMessageSchema.safeParse({
			type: "queueMessage",
			text: "hello",
			images: ["data:image/png;base64,abc"],
		})
		expect(result.success).toBe(true)
	})

	it("accepts a message without images", () => {
		const result = queueMessageMessageSchema.safeParse({ type: "queueMessage", text: "hello" })
		expect(result.success).toBe(true)
	})

	it.each([
		{ type: "queueMessage", text: 42 },
		{ type: "queueMessage", text: "hi", images: "data:image/png;base64,abc" },
		{ type: "queueMessage" },
	])("rejects malformed payload %j", (raw) => {
		expect(queueMessageMessageSchema.safeParse(raw).success).toBe(false)
	})
})

describe("removeQueuedMessageMessageSchema", () => {
	it("accepts a valid message", () => {
		expect(removeQueuedMessageMessageSchema.safeParse({ type: "removeQueuedMessage", text: "id-1" }).success).toBe(
			true,
		)
	})

	it("rejects a missing text", () => {
		expect(removeQueuedMessageMessageSchema.safeParse({ type: "removeQueuedMessage" }).success).toBe(false)
	})
})

describe("editQueuedMessageMessageSchema", () => {
	it("accepts a valid message", () => {
		const result = editQueuedMessageMessageSchema.safeParse({
			type: "editQueuedMessage",
			payload: { id: "id-1", text: "new text", images: ["data:image/png;base64,abc"] },
		})
		expect(result.success).toBe(true)
	})

	it("accepts a payload without images", () => {
		const result = editQueuedMessageMessageSchema.safeParse({
			type: "editQueuedMessage",
			payload: { id: "id-1", text: "new text" },
		})
		expect(result.success).toBe(true)
	})

	it("rejects a payload missing id", () => {
		expect(
			editQueuedMessageMessageSchema.safeParse({ type: "editQueuedMessage", payload: { text: "x" } }).success,
		).toBe(false)
	})
})

describe("parseWebviewMessage boundary for message queue", () => {
	it("accepts a valid queueMessage message", () => {
		const result = parseWebviewMessage({ type: "queueMessage", text: "hello" })
		expect(result.ok).toBe(true)
	})

	it("rejects a crafted malformed queueMessage message (non-string text)", () => {
		const result = parseWebviewMessage({ type: "queueMessage", text: 42 })
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.error).toContain("queueMessage")
		}
	})
})
