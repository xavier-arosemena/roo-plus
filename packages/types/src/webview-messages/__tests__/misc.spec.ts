import { describe, it, expect } from "vitest"

import {
	didShowAnnouncementMessageSchema,
	dismissUpsellMessageSchema,
	focusPanelRequestMessageSchema,
	getDismissedUpsellsMessageSchema,
	importRooHistoryMessageSchema,
	insertTextIntoTextareaMessageSchema,
	miscMessageSchema,
	openExternalMessageSchema,
	openFileMessageSchema,
	openKeyboardShortcutsMessageSchema,
	openMarkdownPreviewMessageSchema,
	openMentionMessageSchema,
	parseWebviewMessage,
	readFileContentMessageSchema,
	refreshCustomToolsMessageSchema,
	requestModesMessageSchema,
	resetStateMessageSchema,
	searchFilesMessageSchema,
	switchTabMessageSchema,
	taskSyncEnabledMessageSchema,
	webviewDidLaunchMessageSchema,
} from "../index.js"

describe("empty-payload misc schemas", () => {
	it.each([
		["webviewDidLaunch", webviewDidLaunchMessageSchema],
		["didShowAnnouncement", didShowAnnouncementMessageSchema],
		["importRooHistory", importRooHistoryMessageSchema],
		["resetState", resetStateMessageSchema],
		["refreshCustomTools", refreshCustomToolsMessageSchema],
		["focusPanelRequest", focusPanelRequestMessageSchema],
		["requestModes", requestModesMessageSchema],
		["getDismissedUpsells", getDismissedUpsellsMessageSchema],
	] as const)("accepts %s with only the type literal", (type, schema) => {
		const result = schema.safeParse({ type })
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.type).toBe(type)
		}
	})

	it.each([
		["webviewDidLaunch", webviewDidLaunchMessageSchema],
		["didShowAnnouncement", didShowAnnouncementMessageSchema],
		["importRooHistory", importRooHistoryMessageSchema],
		["resetState", resetStateMessageSchema],
		["refreshCustomTools", refreshCustomToolsMessageSchema],
		["focusPanelRequest", focusPanelRequestMessageSchema],
		["requestModes", requestModesMessageSchema],
		["getDismissedUpsells", getDismissedUpsellsMessageSchema],
	] as const)("rejects %s with the wrong type literal", (type, schema) => {
		expect(schema.safeParse({ type: "webviewDidLaunch" }).success).toBe(type === "webviewDidLaunch")
		expect(schema.safeParse({ type }).success).toBe(true)
	})

	it("rejects a non-object payload", () => {
		expect(webviewDidLaunchMessageSchema.safeParse(null).success).toBe(false)
		expect(requestModesMessageSchema.safeParse("requestModes").success).toBe(false)
	})
})

describe("openFileMessageSchema", () => {
	it("accepts a message with text (required) and typed values", () => {
		const result = openFileMessageSchema.safeParse({
			type: "openFile",
			text: "./src/file.ts",
			values: { create: true, content: "hello", line: 42 },
		})
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.text).toBe("./src/file.ts")
			expect(result.data.values?.create).toBe(true)
			expect(result.data.values?.content).toBe("hello")
			expect(result.data.values?.line).toBe(42)
		}
	})

	it("rejects a message missing the required text", () => {
		expect(openFileMessageSchema.safeParse({ type: "openFile" }).success).toBe(false)
	})

	it("rejects a non-string text", () => {
		expect(openFileMessageSchema.safeParse({ type: "openFile", text: 42 }).success).toBe(false)
	})

	it("rejects non-object values", () => {
		expect(openFileMessageSchema.safeParse({ type: "openFile", text: "a.ts", values: "nope" }).success).toBe(false)
	})

	it("rejects invalid values field types", () => {
		expect(
			openFileMessageSchema.safeParse({ type: "openFile", text: "a.ts", values: { create: "yes" } }).success,
		).toBe(false)
		expect(
			openFileMessageSchema.safeParse({ type: "openFile", text: "a.ts", values: { line: "42" } }).success,
		).toBe(false)
	})

	it("accepts values with a subset of fields", () => {
		expect(openFileMessageSchema.safeParse({ type: "openFile", text: "a.ts", values: { line: 5 } }).success).toBe(
			true,
		)
	})

	it("rejects the wrong type literal", () => {
		expect(openFileMessageSchema.safeParse({ type: "readFileContent", text: "a.ts" }).success).toBe(false)
	})
})

describe("optional-text misc schemas", () => {
	it.each([
		["readFileContent", readFileContentMessageSchema],
		["openMention", openMentionMessageSchema],
		["openKeyboardShortcuts", openKeyboardShortcutsMessageSchema],
		["insertTextIntoTextarea", insertTextIntoTextareaMessageSchema],
		["openMarkdownPreview", openMarkdownPreviewMessageSchema],
	] as const)("accepts %s with and without text (handler guards)", (type, schema) => {
		expect(schema.safeParse({ type }).success).toBe(true)
		expect(schema.safeParse({ type, text: "hello" }).success).toBe(true)
	})

	it.each([
		["readFileContent", readFileContentMessageSchema],
		["openMention", openMentionMessageSchema],
		["openKeyboardShortcuts", openKeyboardShortcutsMessageSchema],
		["insertTextIntoTextarea", insertTextIntoTextareaMessageSchema],
		["openMarkdownPreview", openMarkdownPreviewMessageSchema],
	] as const)("rejects %s with a non-string text", (type, schema) => {
		expect(schema.safeParse({ type, text: 42 }).success).toBe(false)
	})
})

describe("openExternalMessageSchema", () => {
	it("accepts a message with url", () => {
		const result = openExternalMessageSchema.safeParse({ type: "openExternal", url: "https://example.com" })
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.url).toBe("https://example.com")
		}
	})

	it("accepts a message without url (handler guards)", () => {
		expect(openExternalMessageSchema.safeParse({ type: "openExternal" }).success).toBe(true)
	})

	it("rejects a non-string url", () => {
		expect(openExternalMessageSchema.safeParse({ type: "openExternal", url: 42 }).success).toBe(false)
	})
})

describe("taskSyncEnabledMessageSchema", () => {
	it("accepts with or without bool (handler ignores the payload)", () => {
		expect(taskSyncEnabledMessageSchema.safeParse({ type: "taskSyncEnabled" }).success).toBe(true)
		expect(taskSyncEnabledMessageSchema.safeParse({ type: "taskSyncEnabled", bool: true }).success).toBe(true)
	})

	it("rejects a non-boolean bool", () => {
		expect(taskSyncEnabledMessageSchema.safeParse({ type: "taskSyncEnabled", bool: "yes" }).success).toBe(false)
	})
})

describe("searchFilesMessageSchema", () => {
	it("accepts query and requestId", () => {
		const result = searchFilesMessageSchema.safeParse({ type: "searchFiles", query: "index", requestId: "r1" })
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.query).toBe("index")
			expect(result.data.requestId).toBe("r1")
		}
	})

	it("accepts with only the type (handler defaults query to '')", () => {
		expect(searchFilesMessageSchema.safeParse({ type: "searchFiles" }).success).toBe(true)
	})

	it("rejects a non-string query", () => {
		expect(searchFilesMessageSchema.safeParse({ type: "searchFiles", query: 42 }).success).toBe(false)
	})

	it("rejects a non-string requestId", () => {
		expect(searchFilesMessageSchema.safeParse({ type: "searchFiles", requestId: 42 }).success).toBe(false)
	})
})

describe("switchTabMessageSchema", () => {
	it("accepts each valid tab enum value", () => {
		for (const tab of ["settings", "history", "mcp", "modes", "chat", "marketplace", "cloud"]) {
			expect(switchTabMessageSchema.safeParse({ type: "switchTab", tab }).success).toBe(true)
		}
	})

	it("accepts without tab (handler guards)", () => {
		expect(switchTabMessageSchema.safeParse({ type: "switchTab" }).success).toBe(true)
	})

	it("rejects an invalid tab enum value", () => {
		expect(switchTabMessageSchema.safeParse({ type: "switchTab", tab: "bogus" }).success).toBe(false)
	})

	it("accepts arbitrary values (posted through transitionally)", () => {
		expect(
			switchTabMessageSchema.safeParse({ type: "switchTab", tab: "settings", values: { section: "api" } })
				.success,
		).toBe(true)
	})

	it("rejects a non-object values field", () => {
		expect(switchTabMessageSchema.safeParse({ type: "switchTab", values: "nope" }).success).toBe(false)
	})
})

describe("dismissUpsellMessageSchema", () => {
	it("accepts with or without upsellId (handler guards)", () => {
		expect(dismissUpsellMessageSchema.safeParse({ type: "dismissUpsell" }).success).toBe(true)
		expect(dismissUpsellMessageSchema.safeParse({ type: "dismissUpsell", upsellId: "u1" }).success).toBe(true)
	})

	it("rejects a non-string upsellId", () => {
		expect(dismissUpsellMessageSchema.safeParse({ type: "dismissUpsell", upsellId: 42 }).success).toBe(false)
	})
})

describe("miscMessageSchema union", () => {
	it("narrows to openFile", () => {
		const parsed = miscMessageSchema.safeParse({ type: "openFile", text: "a.ts" })
		expect(parsed.success).toBe(true)
		if (parsed.success && parsed.data.type === "openFile") {
			expect(parsed.data.text).toBe("a.ts")
		}
	})

	it("narrows to switchTab", () => {
		const parsed = miscMessageSchema.safeParse({ type: "switchTab", tab: "history" })
		expect(parsed.success).toBe(true)
		if (parsed.success && parsed.data.type === "switchTab") {
			expect(parsed.data.tab).toBe("history")
		}
	})

	it("narrows to searchFiles", () => {
		const parsed = miscMessageSchema.safeParse({ type: "searchFiles", query: "q" })
		expect(parsed.success).toBe(true)
		if (parsed.success && parsed.data.type === "searchFiles") {
			expect(parsed.data.query).toBe("q")
		}
	})

	it("rejects a type outside the domain", () => {
		expect(miscMessageSchema.safeParse({ type: "newTask", text: "hi" }).success).toBe(false)
	})
})

describe("parseWebviewMessage boundary for misc", () => {
	it("accepts a valid openFile message at the boundary", () => {
		const result = parseWebviewMessage({ type: "openFile", text: "./src/file.ts", values: { line: 42 } })
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.message.type).toBe("openFile")
		}
	})

	it("rejects a crafted openFile message missing text at the boundary", () => {
		const result = parseWebviewMessage({ type: "openFile" })
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.error).toContain("openFile")
		}
	})

	it("accepts a valid switchTab message at the boundary", () => {
		const result = parseWebviewMessage({ type: "switchTab", tab: "mcp" })
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.message.type).toBe("switchTab")
		}
	})

	it("rejects a crafted switchTab message with an invalid tab at the boundary", () => {
		const result = parseWebviewMessage({ type: "switchTab", tab: "bogus" })
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.error).toContain("switchTab")
		}
	})

	it("accepts a valid searchFiles message at the boundary", () => {
		const result = parseWebviewMessage({ type: "searchFiles", query: "index", requestId: "r1" })
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.message.type).toBe("searchFiles")
		}
	})

	it("rejects a crafted searchFiles message with a non-string query at the boundary", () => {
		const result = parseWebviewMessage({ type: "searchFiles", query: 42 })
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.error).toContain("searchFiles")
		}
	})

	it("accepts a valid webviewDidLaunch message at the boundary", () => {
		const result = parseWebviewMessage({ type: "webviewDidLaunch" })
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.message.type).toBe("webviewDidLaunch")
		}
	})
})
