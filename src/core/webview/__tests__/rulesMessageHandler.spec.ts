import type { RuleMetadata, RulesMessage } from "@roo-code/types"
import type { ClineProvider } from "../ClineProvider"

vi.mock("vscode", () => ({
	window: {
		showErrorMessage: vi.fn(),
		showWarningMessage: vi.fn(),
	},
}))

vi.mock("../../../integrations/misc/open-file", () => ({
	openFile: vi.fn(),
}))

vi.mock("../../../services/rules/rules", () => ({
	getRules: vi.fn(),
	createRule: vi.fn(),
	deleteRule: vi.fn(),
	resolveRuleFile: vi.fn(),
	getRulesDirectoryPath: vi.fn(),
}))

import * as vscode from "vscode"
import { openFile } from "../../../integrations/misc/open-file"
import { createRule, deleteRule, getRules, getRulesDirectoryPath, resolveRuleFile } from "../../../services/rules/rules"
import {
	handleCreateRule,
	handleDeleteRule,
	handleOpenRuleFile,
	handleOpenRulesDirectory,
	handleRequestRules,
} from "../rulesMessageHandler"

const mockRules: RuleMetadata[] = [
	{
		id: "global:generic:generic:rule.md",
		name: "rule.md",
		scope: "global",
		kind: "generic",
		filePath: "/home/.roo/rules/rule.md",
		relativePath: "rule.md",
		directoryPath: "/home/.roo/rules",
	},
]

describe("rulesMessageHandler", () => {
	const mockLog = vi.fn()
	const mockPostMessageToWebview = vi.fn()
	const mockGetModes = vi.fn()

	const createMockProvider = (): ClineProvider =>
		({
			log: mockLog,
			postMessageToWebview: mockPostMessageToWebview,
			getModes: mockGetModes,
		}) as unknown as ClineProvider

	beforeEach(() => {
		vi.clearAllMocks()
		mockGetModes.mockResolvedValue([{ slug: "code", name: "Code" }])
		vi.mocked(getRules).mockResolvedValue(mockRules)
	})

	it("handleRequestRules posts rules", async () => {
		const provider = createMockProvider()

		const result = await handleRequestRules(provider, "/workspace")

		expect(result).toEqual(mockRules)
		expect(getRules).toHaveBeenCalledWith("/workspace", { modes: [{ slug: "code", name: "Code" }] })
		expect(mockPostMessageToWebview).toHaveBeenCalledWith({ type: "rules", rules: mockRules })
	})

	it("handleRequestRules posts an empty list on failure", async () => {
		const provider = createMockProvider()
		vi.mocked(getRules).mockRejectedValue(new Error("scan failed"))

		const result = await handleRequestRules(provider, "/workspace")

		expect(result).toEqual([])
		expect(mockLog).toHaveBeenCalled()
		expect(mockPostMessageToWebview).toHaveBeenCalledWith({ type: "rules", rules: [] })
	})

	it("handleCreateRule creates, opens, and posts refreshed rules", async () => {
		const provider = createMockProvider()
		vi.mocked(createRule).mockResolvedValue("/workspace/.roo/rules/new.md")

		const result = await handleCreateRule(provider, "/workspace", {
			type: "createRule",
			values: { scope: "project", kind: "generic", fileName: "new.md" },
		})

		expect(result).toEqual(mockRules)
		expect(createRule).toHaveBeenCalledWith("/workspace", { scope: "project", kind: "generic", fileName: "new.md" })
		expect(openFile).toHaveBeenCalledWith("/workspace/.roo/rules/new.md")
		expect(mockPostMessageToWebview).toHaveBeenCalledWith({ type: "rules", rules: mockRules })
	})

	it("handleDeleteRule deletes and posts refreshed rules", async () => {
		const provider = createMockProvider()

		const result = await handleDeleteRule(provider, "/workspace", {
			type: "deleteRule",
			values: { scope: "global", kind: "generic", relativePath: "rule.md" },
		})

		expect(result).toEqual(mockRules)
		expect(deleteRule).toHaveBeenCalledWith("/workspace", {
			scope: "global",
			kind: "generic",
			relativePath: "rule.md",
		})
		expect(mockPostMessageToWebview).toHaveBeenCalledWith({ type: "rules", rules: mockRules })
	})

	it("handleOpenRuleFile safely resolves and opens the rule file", async () => {
		const provider = createMockProvider()
		vi.mocked(resolveRuleFile).mockResolvedValue("/workspace/.roo/rules/rule.md")

		await handleOpenRuleFile(provider, "/workspace", {
			type: "openRuleFile",
			values: { scope: "project", kind: "generic", relativePath: "rule.md" },
		})

		expect(resolveRuleFile).toHaveBeenCalledWith("/workspace", {
			scope: "project",
			kind: "generic",
			relativePath: "rule.md",
		})
		expect(openFile).toHaveBeenCalledWith("/workspace/.roo/rules/rule.md")
	})

	it("handleDeleteRule shows an error when required delete values are missing", async () => {
		const provider = createMockProvider()

		const result = await handleDeleteRule(provider, "/workspace", {
			type: "deleteRule",
			values: { scope: "global", kind: "generic" },
		})

		expect(result).toBeUndefined()
		expect(deleteRule).not.toHaveBeenCalled()
		expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
			"Failed to delete rule: Missing required fields: scope, kind, or relativePath",
		)
	})

	it("handleOpenRuleFile shows an error when the resolved rule file is missing", async () => {
		const provider = createMockProvider()
		vi.mocked(resolveRuleFile).mockResolvedValue(undefined)

		await handleOpenRuleFile(provider, "/workspace", {
			type: "openRuleFile",
			values: { scope: "project", kind: "generic", relativePath: "missing.md" },
		})

		expect(openFile).not.toHaveBeenCalled()
		expect(vscode.window.showErrorMessage).toHaveBeenCalledWith("Failed to open rule file: Rule file not found")
	})

	it("rejects a malformed openRulesDirectory (invalid scope enum) before side effects", async () => {
		const provider = createMockProvider()

		// Intentionally malformed — bypass the type system to exercise the schema rejection.
		await handleOpenRulesDirectory(provider, "/workspace", {
			type: "openRulesDirectory",
			values: { scope: "team", kind: "generic" },
		} as unknown as RulesMessage)

		expect(mockLog).toHaveBeenCalledWith(expect.stringContaining("Rejected malformed openRulesDirectory message"))
		expect(getRulesDirectoryPath).not.toHaveBeenCalled()
		expect(openFile).not.toHaveBeenCalled()
		expect(vscode.window.showErrorMessage).not.toHaveBeenCalled()
	})

	it("handleCreateRule shows an error for missing required values before creating", async () => {
		const provider = createMockProvider()

		const result = await handleCreateRule(provider, "/workspace", {
			type: "createRule",
			values: { scope: "project", kind: "generic" },
		})

		expect(result).toBeUndefined()
		expect(createRule).not.toHaveBeenCalled()
		expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
			"Failed to create rule: Missing required fields: scope, kind, or fileName",
		)
	})

	it("rejects a malformed createRule (invalid scope/kind enums) before side effects", async () => {
		const provider = createMockProvider()

		// Intentionally malformed — bypass the type system to exercise the schema rejection.
		const result = await handleCreateRule(provider, "/workspace", {
			type: "createRule",
			values: { scope: "team", kind: "workspace", fileName: "new.md" },
		} as unknown as RulesMessage)

		expect(result).toBeUndefined()
		expect(mockLog).toHaveBeenCalledWith(expect.stringContaining("Rejected malformed createRule message"))
		expect(createRule).not.toHaveBeenCalled()
		expect(vscode.window.showErrorMessage).not.toHaveBeenCalled()
	})

	it("handleCreateRule shows an error for missing workspace project rules and does not refresh", async () => {
		const provider = createMockProvider()
		vi.mocked(createRule).mockRejectedValue(new Error("Workspace rules require an open workspace"))

		const result = await handleCreateRule(provider, "", {
			type: "createRule",
			values: { scope: "project", kind: "generic", fileName: "new.md" },
		})

		expect(result).toBeUndefined()
		expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
			"Failed to create rule: Workspace rules require an open workspace",
		)
		expect(mockPostMessageToWebview).not.toHaveBeenCalled()
	})
	it("handleRequestRules safely handles nullish errors", async () => {
		const provider = createMockProvider()
		vi.mocked(getRules).mockRejectedValue(null)

		const result = await handleRequestRules(provider, "/workspace")

		expect(result).toEqual([])
		expect(mockLog).toHaveBeenCalledWith("Error fetching rules: null")
		expect(mockPostMessageToWebview).toHaveBeenCalledWith({ type: "rules", rules: [] })
	})

	it("handleCreateRule warns when refresh fails after creation succeeds", async () => {
		const provider = createMockProvider()
		vi.mocked(createRule).mockResolvedValue("/workspace/.roo/rules/new.md")
		vi.mocked(getRules).mockRejectedValue(new Error("refresh failed"))

		const result = await handleCreateRule(provider, "/workspace", {
			type: "createRule",
			values: { scope: "project", kind: "generic", fileName: "new.md" },
		})

		expect(result).toBeUndefined()
		expect(createRule).toHaveBeenCalledWith("/workspace", { scope: "project", kind: "generic", fileName: "new.md" })
		expect(openFile).toHaveBeenCalledWith("/workspace/.roo/rules/new.md")
		expect(vscode.window.showErrorMessage).not.toHaveBeenCalled()
		expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
			"Rule created, but refreshing the rules list failed.",
		)
	})

	it("handleDeleteRule warns when refresh fails after deletion succeeds", async () => {
		const provider = createMockProvider()
		vi.mocked(getRules).mockRejectedValue(new Error("refresh failed"))

		const result = await handleDeleteRule(provider, "/workspace", {
			type: "deleteRule",
			values: { scope: "global", kind: "generic", relativePath: "rule.md" },
		})

		expect(result).toBeUndefined()
		expect(deleteRule).toHaveBeenCalledWith("/workspace", {
			scope: "global",
			kind: "generic",
			relativePath: "rule.md",
		})
		expect(vscode.window.showErrorMessage).not.toHaveBeenCalled()
		expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
			"Rule deleted, but refreshing the rules list failed.",
		)
	})

	it("handleOpenRulesDirectory resolves and opens the requested rules directory", async () => {
		const provider = createMockProvider()
		vi.mocked(getRulesDirectoryPath).mockReturnValue("/workspace/.roo/rules-code")

		await handleOpenRulesDirectory(provider, "/workspace", {
			type: "openRulesDirectory",
			values: { scope: "project", kind: "mode", modeSlug: "code" },
		})

		expect(getRulesDirectoryPath).toHaveBeenCalledWith("/workspace", {
			scope: "project",
			kind: "mode",
			modeSlug: "code",
		})
		expect(openFile).toHaveBeenCalledWith("/workspace/.roo/rules-code")
	})
})
