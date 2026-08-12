// npx vitest run src/core/webview/__tests__/commandsMessageHandler.spec.ts

import type { WebviewMessage } from "@roo-code/types"
import type { ClineProvider } from "../ClineProvider"

// Mock vscode first
vi.mock("vscode", () => {
	const showErrorMessage = vi.fn()

	return {
		window: {
			showErrorMessage,
		},
		workspace: {
			workspaceFolders: [{ uri: { fsPath: "/mock/workspace" } }],
		},
	}
})

// Mock open-file
vi.mock("../../../integrations/misc/open-file", () => ({
	openFile: vi.fn(),
}))

// Mock i18n
vi.mock("../../../i18n", () => ({
	t: (key: string, params?: { name?: string }) => {
		const translations: Record<string, string> = {
			"common:errors.command_not_found": `Command "${params?.name}" not found`,
			"common:errors.command_template_content": "# Command template",
		}
		return translations[key] || key
	},
}))

// Mock fs/promises so the handler never touches the real filesystem
vi.mock("fs/promises", () => ({
	mkdir: vi.fn(),
	writeFile: vi.fn(),
	unlink: vi.fn(),
	access: vi.fn(),
}))

// Mock the command service (dynamically imported by the handler)
vi.mock("../../../services/command/commands", () => ({
	getCommands: vi.fn(),
	getCommand: vi.fn(),
}))

import * as vscode from "vscode"
import { openFile } from "../../../integrations/misc/open-file"
import * as fs from "fs/promises"
import { getCommands, getCommand } from "../../../services/command/commands"
import { handleCommandsMessages } from "../handlers/commands"

describe("commandsMessageHandler", () => {
	const mockLog = vi.fn()
	const mockPostMessageToWebview = vi.fn()
	const mockGetCommands = vi.mocked(getCommands)
	const mockGetCommand = vi.mocked(getCommand)
	const mockMkdir = vi.mocked(fs.mkdir)
	const mockWriteFile = vi.mocked(fs.writeFile)
	const mockUnlink = vi.mocked(fs.unlink)

	const createMockProvider = (): ClineProvider =>
		({
			getCurrentTask: vi.fn().mockReturnValue(undefined),
			cwd: "/mock/workspace",
			getSkillsManager: vi.fn().mockReturnValue(undefined),
			getState: vi.fn(),
			log: mockLog,
			postMessageToWebview: mockPostMessageToWebview,
		}) as unknown as ClineProvider

	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe("handleRequestCommands", () => {
		it("posts the discovered commands to the webview", async () => {
			const provider = createMockProvider()
			mockGetCommands.mockResolvedValue([
				{
					name: "deploy",
					content: "deploy content",
					source: "project",
					filePath: "/mock/workspace/.roo/commands/deploy.md",
					description: "Deploy command",
					argumentHint: "staging | production",
				},
			])

			await handleCommandsMessages(provider, undefined, { type: "requestCommands" })

			expect(mockGetCommands).toHaveBeenCalledWith("/mock/workspace")
			expect(mockPostMessageToWebview).toHaveBeenCalledWith({
				type: "commands",
				commands: [
					{
						name: "deploy",
						source: "project",
						filePath: "/mock/workspace/.roo/commands/deploy.md",
						description: "Deploy command",
						argumentHint: "staging | production",
					},
				],
			})
		})

		it("posts an empty command list when the service throws", async () => {
			const provider = createMockProvider()
			mockGetCommands.mockRejectedValue(new Error("boom"))

			await handleCommandsMessages(provider, undefined, { type: "requestCommands" })

			expect(mockPostMessageToWebview).toHaveBeenCalledWith({ type: "commands", commands: [] })
		})
	})

	describe("handleCreateCommand", () => {
		it("rejects a malformed createCommand (invalid source enum) before any file write", async () => {
			const provider = createMockProvider()

			// Intentionally malformed — bypass the type system to exercise the schema rejection.
			const malformed = {
				type: "createCommand",
				text: "new.md",
				values: { source: "team" },
			} as unknown as WebviewMessage

			await handleCommandsMessages(provider, undefined, malformed)

			expect(mockLog).toHaveBeenCalledWith(expect.stringContaining("Rejected malformed createCommand message"))
			expect(mockMkdir).not.toHaveBeenCalled()
			expect(mockWriteFile).not.toHaveBeenCalled()
			expect(openFile).not.toHaveBeenCalled()
			expect(vscode.window.showErrorMessage).not.toHaveBeenCalled()
		})

		it("rejects a createCommand with a non-string text before any file write", async () => {
			const provider = createMockProvider()

			const malformed = {
				type: "createCommand",
				text: 42,
				values: { source: "global" },
			} as unknown as WebviewMessage

			await handleCommandsMessages(provider, undefined, malformed)

			expect(mockLog).toHaveBeenCalledWith(expect.stringContaining("Rejected malformed createCommand message"))
			expect(mockMkdir).not.toHaveBeenCalled()
			expect(mockWriteFile).not.toHaveBeenCalled()
			expect(openFile).not.toHaveBeenCalled()
		})
	})

	describe("handleDeleteCommand", () => {
		it("rejects a malformed deleteCommand (invalid source enum) before any file deletion", async () => {
			const provider = createMockProvider()

			const malformed = {
				type: "deleteCommand",
				text: "old",
				values: { source: "built-in" },
			} as unknown as WebviewMessage

			await handleCommandsMessages(provider, undefined, malformed)

			expect(mockLog).toHaveBeenCalledWith(expect.stringContaining("Rejected malformed deleteCommand message"))
			expect(mockGetCommand).not.toHaveBeenCalled()
			expect(mockUnlink).not.toHaveBeenCalled()
		})
	})

	describe("handleOpenCommandFile", () => {
		it("rejects a malformed openCommandFile (non-string text) before any lookup or open", async () => {
			const provider = createMockProvider()

			const malformed = {
				type: "openCommandFile",
				text: 42,
			} as unknown as WebviewMessage

			await handleCommandsMessages(provider, undefined, malformed)

			expect(mockLog).toHaveBeenCalledWith(expect.stringContaining("Rejected malformed openCommandFile message"))
			expect(mockGetCommand).not.toHaveBeenCalled()
			expect(openFile).not.toHaveBeenCalled()
			expect(vscode.window.showErrorMessage).not.toHaveBeenCalled()
		})
	})
})
