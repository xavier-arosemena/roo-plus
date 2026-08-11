import { describe, it, expect } from "vitest"

import {
	navigationMessageSchema,
	actionMessageSchema,
	invokeMessageSchema,
	messageUpdatedMessageSchema,
	taskHistoryUpdatedMessageSchema,
	taskHistoryItemUpdatedMessageSchema,
	selectedImagesMessageSchema,
	themeMessageSchema,
	workspaceUpdatedMessageSchema,
	ttsStartMessageSchema,
	ttsStopMessageSchema,
	condenseTaskContextStartedMessageSchema,
	condenseTaskContextResponseMessageSchema,
	acceptInputMessageSchema,
	setHistoryPreviewCollapsedMessageSchema,
	autoApprovalEnabledMessageSchema,
	toggleApiConfigPinMessageSchema,
	updatePromptMessageSchema,
	extensionMessageSchemas,
	parseExtensionMessage,
} from "../index.js"

const validHistoryItem = {
	id: "task-1",
	number: 1,
	ts: 1,
	task: "Do the thing",
	tokensIn: 10,
	tokensOut: 20,
	totalCost: 0.5,
	status: "completed",
}

describe("navigation domain (Phase 2, Domain 1) schemas", () => {
	describe("valid messages", () => {
		it.each([
			["action", actionMessageSchema, { type: "action", action: "chatButtonClicked" }],
			[
				"action (switchTab with tab + values)",
				actionMessageSchema,
				{ type: "action", action: "switchTab", tab: "settings", values: { section: "providers" } },
			],
			["invoke", invokeMessageSchema, { type: "invoke", invoke: "newChat" }],
			[
				"invoke (sendMessage with text + images)",
				invokeMessageSchema,
				{ type: "invoke", invoke: "sendMessage", text: "hi", images: ["data:image/png;base64,abc"] },
			],
			[
				"messageUpdated",
				messageUpdatedMessageSchema,
				{ type: "messageUpdated", clineMessage: { ts: 1, type: "say", say: "text", text: "hi" } },
			],
			[
				"taskHistoryUpdated",
				taskHistoryUpdatedMessageSchema,
				{ type: "taskHistoryUpdated", taskHistory: [validHistoryItem] },
			],
			[
				"taskHistoryItemUpdated",
				taskHistoryItemUpdatedMessageSchema,
				{ type: "taskHistoryItemUpdated", taskHistoryItem: validHistoryItem },
			],
			[
				"selectedImages",
				selectedImagesMessageSchema,
				{ type: "selectedImages", images: ["data:image/png;base64,abc"], context: "edit", messageTs: 5 },
			],
			["theme", themeMessageSchema, { type: "theme", text: '{"name":"Default Dark Modern"}' }],
			[
				"workspaceUpdated",
				workspaceUpdatedMessageSchema,
				{
					type: "workspaceUpdated",
					filePaths: ["src/a.ts"],
					openedTabs: [{ label: "a.ts", isActive: true, path: "src/a.ts" }],
				},
			],
			["ttsStart", ttsStartMessageSchema, { type: "ttsStart", text: "hello" }],
			["ttsStop", ttsStopMessageSchema, { type: "ttsStop", text: "hello" }],
			[
				"condenseTaskContextStarted",
				condenseTaskContextStartedMessageSchema,
				{ type: "condenseTaskContextStarted", text: "task-1" },
			],
			[
				"condenseTaskContextResponse",
				condenseTaskContextResponseMessageSchema,
				{ type: "condenseTaskContextResponse", text: "task-1" },
			],
			["acceptInput", acceptInputMessageSchema, { type: "acceptInput" }],
			[
				"setHistoryPreviewCollapsed",
				setHistoryPreviewCollapsedMessageSchema,
				{ type: "setHistoryPreviewCollapsed" },
			],
			["autoApprovalEnabled", autoApprovalEnabledMessageSchema, { type: "autoApprovalEnabled", bool: true }],
			["toggleApiConfigPin", toggleApiConfigPinMessageSchema, { type: "toggleApiConfigPin", text: "id-1" }],
			[
				"updatePrompt",
				updatePromptMessageSchema,
				{ type: "updatePrompt", promptMode: "code", customPrompt: { roleDefinition: "You are a coder" } },
			],
		])("accepts a valid %s message", (_name, schema, raw) => {
			const result = schema.safeParse(raw)
			expect(result.success).toBe(true)
		})
	})

	describe("malformed messages", () => {
		it.each([
			["action without action", actionMessageSchema, { type: "action" }],
			["action with unknown action value", actionMessageSchema, { type: "action", action: "bogus" }],
			["invoke without invoke", invokeMessageSchema, { type: "invoke" }],
			["invoke with unknown invoke value", invokeMessageSchema, { type: "invoke", invoke: "bogus" }],
			["invoke with non-string text", invokeMessageSchema, { type: "invoke", invoke: "newChat", text: 42 }],
			["messageUpdated without clineMessage", messageUpdatedMessageSchema, { type: "messageUpdated" }],
			[
				"messageUpdated with malformed clineMessage",
				messageUpdatedMessageSchema,
				{ type: "messageUpdated", clineMessage: { ts: "x" } },
			],
			[
				"taskHistoryUpdated with non-array taskHistory",
				taskHistoryUpdatedMessageSchema,
				{ type: "taskHistoryUpdated", taskHistory: {} },
			],
			[
				"taskHistoryItemUpdated with invalid item",
				taskHistoryItemUpdatedMessageSchema,
				{ type: "taskHistoryItemUpdated", taskHistoryItem: { id: "task-1" } },
			],
			["selectedImages without images", selectedImagesMessageSchema, { type: "selectedImages" }],
			[
				"selectedImages with non-string images",
				selectedImagesMessageSchema,
				{ type: "selectedImages", images: [1] },
			],
			["theme without text", themeMessageSchema, { type: "theme" }],
			[
				"workspaceUpdated without filePaths",
				workspaceUpdatedMessageSchema,
				{ type: "workspaceUpdated", openedTabs: [] },
			],
			[
				"workspaceUpdated with invalid openedTabs entry",
				workspaceUpdatedMessageSchema,
				{ type: "workspaceUpdated", filePaths: [], openedTabs: [{ label: "a.ts" }] },
			],
			["ttsStart without text", ttsStartMessageSchema, { type: "ttsStart" }],
			["ttsStop without text", ttsStopMessageSchema, { type: "ttsStop" }],
			[
				"condenseTaskContextStarted without text",
				condenseTaskContextStartedMessageSchema,
				{ type: "condenseTaskContextStarted" },
			],
			[
				"condenseTaskContextResponse without text",
				condenseTaskContextResponseMessageSchema,
				{ type: "condenseTaskContextResponse" },
			],
			[
				"autoApprovalEnabled with non-boolean bool",
				autoApprovalEnabledMessageSchema,
				{ type: "autoApprovalEnabled", bool: "yes" },
			],
			[
				"toggleApiConfigPin with non-string text",
				toggleApiConfigPinMessageSchema,
				{ type: "toggleApiConfigPin", text: 42 },
			],
			[
				"updatePrompt with non-object customPrompt",
				updatePromptMessageSchema,
				{ type: "updatePrompt", promptMode: "code", customPrompt: "nope" },
			],
		])("rejects a malformed %s message", (_name, schema, raw) => {
			const result = schema.safeParse(raw)
			expect(result.success).toBe(false)
		})
	})

	it("seeds the registry with all 17 navigation-domain types", () => {
		const expected: Array<keyof typeof extensionMessageSchemas> = [
			"action",
			"invoke",
			"messageUpdated",
			"taskHistoryUpdated",
			"taskHistoryItemUpdated",
			"selectedImages",
			"theme",
			"workspaceUpdated",
			"ttsStart",
			"ttsStop",
			"condenseTaskContextStarted",
			"condenseTaskContextResponse",
			"acceptInput",
			"setHistoryPreviewCollapsed",
			"autoApprovalEnabled",
			"toggleApiConfigPin",
			"updatePrompt",
		]
		for (const type of expected) {
			expect(extensionMessageSchemas[type]).toBeDefined()
		}
	})

	it("builds a discriminated union over the navigation domain", () => {
		const parsed = navigationMessageSchema.safeParse({ type: "action", action: "focusInput" })
		expect(parsed.success).toBe(true)
		if (parsed.success) {
			expect(parsed.data.type).toBe("action")
		}
	})

	it("parses through the shared boundary (registered types fail loudly when malformed)", () => {
		expect(parseExtensionMessage({ type: "theme", text: "{}" }).ok).toBe(true)
		const malformed = parseExtensionMessage({ type: "ttsStart" })
		expect(malformed.ok).toBe(false)
		if (!malformed.ok) {
			expect(malformed.error).toContain("ttsStart")
		}
		// Unregistered types still pass through structurally.
		expect(parseExtensionMessage({ type: "mcpServers", mcpServers: [] }).ok).toBe(true)
	})
})
