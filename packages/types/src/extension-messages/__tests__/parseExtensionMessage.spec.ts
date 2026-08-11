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
			const raw = { type: "mcpServers", mcpServers: [] }
			const result = parseExtensionMessage(raw)
			expect(result.ok).toBe(true)
			if (result.ok) {
				expect(result.message.type).toBe("mcpServers")
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

	it("seeds the schema registry with the Phase-0 baseline plus the Phase-2 Domain-1 through Domain-8 types", () => {
		const expected: ExtensionMessageType[] = [
			"state",
			"commandExecutionStatus",
			"mcpExecutionStatus",
			"fileContent",
			"indexingStatusUpdate",
			// Phase 2, Domain 1 — UI/navigation + state variants.
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
			// Phase 2, Domain 2 — model/status responses.
			"routerModels",
			"singleRouterModelFetchResponse",
			"openAiModels",
			"ollamaModels",
			"lmStudioModels",
			"vsCodeLmModels",
			"vsCodeSetting",
			"systemPrompt",
			"enhancedPrompt",
			"terminalProfiles",
			"vsCodeLmApiAvailable",
			"authenticatedUser",
			// Phase 2, Domain 3 — task/chat/history responses.
			"commitSearchResults",
			"fileSearchResults",
			"listApiConfig",
			"mcpServers",
			"showDeleteMessageDialog",
			"showEditMessageDialog",
			"commands",
			"insertTextIntoTextarea",
			"dismissedUpsells",
			"customToolsResult",
			"modes",
			"taskWithAggregatedCosts",
			"openAiCodexRateLimits",
			"interactionRequired",
			"organizationSwitchResult",
			// Phase 2, Domain 4 — checkpoint/modes responses.
			"currentCheckpointUpdated",
			"checkpointInitWarning",
			"updateCustomMode",
			"deleteCustomMode",
			"deleteCustomModeCheck",
			"exportModeResult",
			"importModeResult",
			"checkRulesDirectoryResult",
			// Phase 2, Domain 5 — marketplace responses.
			"marketplaceInstallResult",
			"marketplaceBulkInstallResult",
			"marketplaceRemoveResult",
			"marketplaceData",
			"shareTaskSuccess",
			// Phase 2, Domain 6 — code-index responses.
			"codeIndexSettingsSaved",
			"codeIndexSecretStatus",
			"indexCleared",
			"codebaseIndexConfig",
			// Phase 2, Domain 7 — worktree responses.
			"worktreeList",
			"worktreeResult",
			"worktreeCopyProgress",
			"branchList",
			"worktreeDefaults",
			"worktreeIncludeStatus",
			"branchWorktreeIncludeResult",
			"folderSelected",
			// Phase 2, Domain 8 — skills/rules/history-import responses.
			"skills",
			"rules",
			"rooHistoryImportProgress",
		]

		for (const type of expected) {
			expect(extensionMessageSchemas[type]).toBeDefined()
		}
		expect(Object.keys(extensionMessageSchemas)).toHaveLength(77)
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
