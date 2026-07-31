import { describe, it, expect } from "vitest"

import {
	updateTodoListMessageSchema,
	updateCustomModeMessageSchema,
	deleteCustomModeMessageSchema,
	parseWebviewMessage,
} from "../index.js"

const validModeConfig = {
	slug: "test-mode",
	name: "Test Mode",
	roleDefinition: "Test role",
	groups: ["read"],
}

const validTodo = { id: "t1", content: "Task", status: "pending" }

describe("updateTodoListMessageSchema", () => {
	it("accepts a valid message", () => {
		const result = updateTodoListMessageSchema.safeParse({
			type: "updateTodoList",
			payload: { todos: [validTodo] },
		})
		expect(result.success).toBe(true)
	})

	it("accepts an empty todos array", () => {
		expect(updateTodoListMessageSchema.safeParse({ type: "updateTodoList", payload: { todos: [] } }).success).toBe(
			true,
		)
	})

	it.each([
		{ type: "updateTodoList", payload: { todos: "not-array" } },
		{ type: "updateTodoList", payload: { todos: [{ id: "t1" }] } },
		{ type: "updateTodoList", payload: {} },
		{ type: "updateTodoList" },
	])("rejects malformed payload %j", (raw) => {
		expect(updateTodoListMessageSchema.safeParse(raw).success).toBe(false)
	})
})

describe("updateCustomModeMessageSchema", () => {
	it("accepts a valid message", () => {
		const result = updateCustomModeMessageSchema.safeParse({
			type: "updateCustomMode",
			slug: "test-mode",
			modeConfig: validModeConfig,
		})
		expect(result.success).toBe(true)
	})

	it.each([
		{ type: "updateCustomMode", slug: "test-mode" },
		{ type: "updateCustomMode", slug: 42, modeConfig: validModeConfig },
		{ type: "updateCustomMode", slug: "test-mode", modeConfig: { slug: "x" } },
	])("rejects malformed payload %j", (raw) => {
		expect(updateCustomModeMessageSchema.safeParse(raw).success).toBe(false)
	})
})

describe("deleteCustomModeMessageSchema", () => {
	it("accepts a valid message without checkOnly", () => {
		expect(deleteCustomModeMessageSchema.safeParse({ type: "deleteCustomMode", slug: "test-mode" }).success).toBe(
			true,
		)
	})

	it("accepts a checkOnly message", () => {
		const result = deleteCustomModeMessageSchema.safeParse({
			type: "deleteCustomMode",
			slug: "test-mode",
			checkOnly: true,
		})
		expect(result.success).toBe(true)
	})

	it("rejects a missing slug", () => {
		expect(deleteCustomModeMessageSchema.safeParse({ type: "deleteCustomMode" }).success).toBe(false)
	})

	it("rejects a non-boolean checkOnly", () => {
		expect(
			deleteCustomModeMessageSchema.safeParse({ type: "deleteCustomMode", slug: "test-mode", checkOnly: "yes" })
				.success,
		).toBe(false)
	})
})

describe("parseWebviewMessage boundary for todos/custom modes", () => {
	it("accepts a valid updateCustomMode message", () => {
		const result = parseWebviewMessage({
			type: "updateCustomMode",
			slug: "test-mode",
			modeConfig: validModeConfig,
		})
		expect(result.ok).toBe(true)
	})

	it("rejects a crafted malformed updateTodoList message", () => {
		const result = parseWebviewMessage({ type: "updateTodoList", payload: { todos: "nope" } })
		expect(result.ok).toBe(false)
	})

	it("rejects a crafted malformed updateCustomMode message (missing modeConfig)", () => {
		const result = parseWebviewMessage({ type: "updateCustomMode", slug: "test-mode" })
		expect(result.ok).toBe(false)
	})
})
