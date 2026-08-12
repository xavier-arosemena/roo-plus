import { describe, it, expect } from "vitest"

import {
	newTaskMessageSchema,
	clearTaskMessageSchema,
	showTaskWithIdMessageSchema,
	condenseTaskContextRequestMessageSchema,
	deleteTaskWithIdMessageSchema,
	abandonSubtaskWithIdMessageSchema,
	deleteMultipleTasksWithIdsMessageSchema,
	exportTaskWithIdMessageSchema,
	getTaskWithAggregatedCostsMessageSchema,
	getSystemPromptMessageSchema,
	copySystemPromptMessageSchema,
	searchCommitsMessageSchema,
	cancelTaskMessageSchema,
	cancelAutoApprovalMessageSchema,
	exportCurrentTaskMessageSchema,
	shareCurrentTaskMessageSchema,
	taskMessageSchema,
	parseWebviewMessage,
} from "../index.js"

describe("empty-payload task schemas", () => {
	it.each([
		["clearTask", clearTaskMessageSchema],
		["exportCurrentTask", exportCurrentTaskMessageSchema],
		["shareCurrentTask", shareCurrentTaskMessageSchema],
		["cancelTask", cancelTaskMessageSchema],
		["cancelAutoApproval", cancelAutoApprovalMessageSchema],
	] as const)("accepts %s with only the type literal", (_type, schema) => {
		const result = schema.safeParse({ type: _type })
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.type).toBe(_type)
		}
	})

	it("rejects an empty-payload schema with the wrong type literal", () => {
		expect(clearTaskMessageSchema.safeParse({ type: "cancelTask" }).success).toBe(false)
	})
})

describe("newTaskMessageSchema", () => {
	it("accepts a minimal message (empty payload)", () => {
		const result = newTaskMessageSchema.safeParse({ type: "newTask" })
		expect(result.success).toBe(true)
	})

	it("accepts the full payload (text, images, taskId, taskConfiguration)", () => {
		const result = newTaskMessageSchema.safeParse({
			type: "newTask",
			text: "Build the feature",
			images: ["data:image/png;base64,abc"],
			taskId: "task-123",
			taskConfiguration: { apiProvider: "anthropic" },
		})
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.text).toBe("Build the feature")
			expect(result.data.images).toEqual(["data:image/png;base64,abc"])
			expect(result.data.taskId).toBe("task-123")
			expect(result.data.taskConfiguration).toEqual({ apiProvider: "anthropic" })
		}
	})

	it("rejects a non-array images field", () => {
		expect(newTaskMessageSchema.safeParse({ type: "newTask", images: "data:image/png;base64,abc" }).success).toBe(
			false,
		)
	})

	it("rejects non-string image entries", () => {
		expect(newTaskMessageSchema.safeParse({ type: "newTask", images: [42] }).success).toBe(false)
	})

	it("rejects a non-string text field", () => {
		expect(newTaskMessageSchema.safeParse({ type: "newTask", text: 42 }).success).toBe(false)
	})

	it("rejects the wrong type literal", () => {
		expect(newTaskMessageSchema.safeParse({ type: "clearTask" }).success).toBe(false)
	})
})

describe("required-text task schemas", () => {
	it.each([
		["showTaskWithId", showTaskWithIdMessageSchema],
		["condenseTaskContextRequest", condenseTaskContextRequestMessageSchema],
		["deleteTaskWithId", deleteTaskWithIdMessageSchema],
		["abandonSubtaskWithId", abandonSubtaskWithIdMessageSchema],
		["exportTaskWithId", exportTaskWithIdMessageSchema],
		["getTaskWithAggregatedCosts", getTaskWithAggregatedCostsMessageSchema],
	] as const)("accepts %s with the required text", (type, schema) => {
		expect(schema.safeParse({ type, text: "task-42" }).success).toBe(true)
	})

	it.each([
		["showTaskWithId", showTaskWithIdMessageSchema],
		["condenseTaskContextRequest", condenseTaskContextRequestMessageSchema],
		["deleteTaskWithId", deleteTaskWithIdMessageSchema],
		["abandonSubtaskWithId", abandonSubtaskWithIdMessageSchema],
		["exportTaskWithId", exportTaskWithIdMessageSchema],
		["getTaskWithAggregatedCosts", getTaskWithAggregatedCostsMessageSchema],
	] as const)("rejects %s with the required text missing", (type, schema) => {
		expect(schema.safeParse({ type }).success).toBe(false)
	})

	it.each([
		["showTaskWithId", showTaskWithIdMessageSchema],
		["condenseTaskContextRequest", condenseTaskContextRequestMessageSchema],
		["deleteTaskWithId", deleteTaskWithIdMessageSchema],
		["abandonSubtaskWithId", abandonSubtaskWithIdMessageSchema],
		["exportTaskWithId", exportTaskWithIdMessageSchema],
		["getTaskWithAggregatedCosts", getTaskWithAggregatedCostsMessageSchema],
	] as const)("rejects %s with a non-string text", (type, schema) => {
		expect(schema.safeParse({ type, text: 42 }).success).toBe(false)
	})

	it("rejects a required-text schema with the wrong type literal", () => {
		expect(showTaskWithIdMessageSchema.safeParse({ type: "deleteTaskWithId", text: "task-42" }).success).toBe(false)
	})
})

describe("deleteMultipleTasksWithIdsMessageSchema", () => {
	it("accepts a message with the required ids array", () => {
		const result = deleteMultipleTasksWithIdsMessageSchema.safeParse({
			type: "deleteMultipleTasksWithIds",
			ids: ["task-1", "task-2"],
		})
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.ids).toEqual(["task-1", "task-2"])
		}
	})

	it("rejects a message with the ids missing", () => {
		expect(deleteMultipleTasksWithIdsMessageSchema.safeParse({ type: "deleteMultipleTasksWithIds" }).success).toBe(
			false,
		)
	})

	it("rejects a non-array ids field", () => {
		expect(
			deleteMultipleTasksWithIdsMessageSchema.safeParse({ type: "deleteMultipleTasksWithIds", ids: "task-1" })
				.success,
		).toBe(false)
	})

	it("rejects non-string ids entries", () => {
		expect(
			deleteMultipleTasksWithIdsMessageSchema.safeParse({ type: "deleteMultipleTasksWithIds", ids: [42] })
				.success,
		).toBe(false)
	})
})

describe("getSystemPromptMessageSchema / copySystemPromptMessageSchema", () => {
	it("accepts a message without mode (defaults to active mode)", () => {
		expect(getSystemPromptMessageSchema.safeParse({ type: "getSystemPrompt" }).success).toBe(true)
		expect(copySystemPromptMessageSchema.safeParse({ type: "copySystemPrompt" }).success).toBe(true)
	})

	it("accepts a message with a string mode", () => {
		const result = getSystemPromptMessageSchema.safeParse({ type: "getSystemPrompt", mode: "architect" })
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.mode).toBe("architect")
		}
	})

	it("rejects a non-string mode", () => {
		expect(getSystemPromptMessageSchema.safeParse({ type: "getSystemPrompt", mode: 42 }).success).toBe(false)
		expect(copySystemPromptMessageSchema.safeParse({ type: "copySystemPrompt", mode: 42 }).success).toBe(false)
	})
})

describe("searchCommitsMessageSchema", () => {
	it("accepts a message without query (handler defaults to empty string)", () => {
		const result = searchCommitsMessageSchema.safeParse({ type: "searchCommits" })
		expect(result.success).toBe(true)
	})

	it("accepts a message with a string query", () => {
		const result = searchCommitsMessageSchema.safeParse({ type: "searchCommits", query: "fix" })
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.query).toBe("fix")
		}
	})

	it("rejects a non-string query", () => {
		expect(searchCommitsMessageSchema.safeParse({ type: "searchCommits", query: 42 }).success).toBe(false)
	})
})

describe("taskMessageSchema (discriminated union)", () => {
	it("narrows a newTask payload to its member type", () => {
		const result = taskMessageSchema.safeParse({ type: "newTask", text: "hi", images: [] })
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.type).toBe("newTask")
		}
	})

	it("narrows a showTaskWithId payload to its member type", () => {
		const result = taskMessageSchema.safeParse({ type: "showTaskWithId", text: "task-42" })
		expect(result.success).toBe(true)
		if (result.success && result.data.type === "showTaskWithId") {
			expect(result.data.text).toBe("task-42")
		}
	})

	it("rejects an unknown task type literal", () => {
		expect(taskMessageSchema.safeParse({ type: "notATaskType" }).success).toBe(false)
	})

	it("rejects a member with a malformed required payload", () => {
		expect(taskMessageSchema.safeParse({ type: "showTaskWithId" }).success).toBe(false)
	})
})

describe("parseWebviewMessage boundary", () => {
	it("accepts a valid newTask message through the boundary", () => {
		const result = parseWebviewMessage({
			type: "newTask",
			text: "Build it",
			images: ["data:image/png;base64,abc"],
			taskId: "task-123",
		})
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.message.type).toBe("newTask")
		}
	})

	it("rejects a showTaskWithId message missing the required text", () => {
		const result = parseWebviewMessage({ type: "showTaskWithId" })
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.error).toContain("showTaskWithId")
		}
	})

	it("rejects a deleteMultipleTasksWithIds message with a non-array ids", () => {
		const result = parseWebviewMessage({ type: "deleteMultipleTasksWithIds", ids: "task-1" })
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.error).toContain("deleteMultipleTasksWithIds")
		}
	})

	it("accepts a valid searchCommits message through the boundary", () => {
		const result = parseWebviewMessage({ type: "searchCommits", query: "fix" })
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.message.type).toBe("searchCommits")
		}
	})

	it("rejects a searchCommits message with a non-string query", () => {
		const result = parseWebviewMessage({ type: "searchCommits", query: 42 })
		expect(result.ok).toBe(false)
	})

	it("accepts a valid empty-payload cancelTask message through the boundary", () => {
		const result = parseWebviewMessage({ type: "cancelTask" })
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.message.type).toBe("cancelTask")
		}
	})
})
