// npx vitest run src/core/webview/__tests__/mcpMessageHandler.spec.ts

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
	t: (key: string, params?: { error?: string }) => {
		const translations: Record<string, string> = {
			"common:errors.no_workspace": "No workspace",
			"common:errors.update_server_timeout": "Failed to update server timeout",
			"mcp:errors.create_json": `Failed to create ${params?.error}`,
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
	readFile: vi.fn(),
}))

import { handleMcpMessages } from "../handlers/mcp"

describe("mcpMessageHandler", () => {
	const mockLog = vi.fn()
	const mockPostStateToWebview = vi.fn()
	const mockRefreshAllConnections = vi.fn()
	const mockDeleteServer = vi.fn()
	const mockToggleServerDisabled = vi.fn()
	const mockRestartConnection = vi.fn()
	const mockUpdateServerTimeout = vi.fn()
	const mockToggleToolAlwaysAllow = vi.fn()
	const mockToggleToolEnabledForPrompt = vi.fn()

	const createMockHub = () => ({
		refreshAllConnections: mockRefreshAllConnections,
		deleteServer: mockDeleteServer,
		toggleServerDisabled: mockToggleServerDisabled,
		restartConnection: mockRestartConnection,
		updateServerTimeout: mockUpdateServerTimeout,
		toggleToolAlwaysAllow: mockToggleToolAlwaysAllow,
		toggleToolEnabledForPrompt: mockToggleToolEnabledForPrompt,
	})

	const createMockProvider = (): ClineProvider =>
		({
			getMcpHub: vi.fn().mockReturnValue(createMockHub()),
			getCurrentTask: vi.fn().mockReturnValue(undefined),
			cwd: "/mock/workspace",
			log: mockLog,
			postStateToWebview: mockPostStateToWebview,
		}) as unknown as ClineProvider

	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe("refreshAllMcpServers", () => {
		it("refreshes all MCP server connections", async () => {
			const provider = createMockProvider()

			await handleMcpMessages(provider, undefined, { type: "refreshAllMcpServers" })

			expect(mockRefreshAllConnections).toHaveBeenCalledTimes(1)
		})

		it("does nothing when there is no MCP hub", async () => {
			const provider = createMockProvider()
			vi.mocked(provider.getMcpHub).mockReturnValue(undefined)

			await handleMcpMessages(provider, undefined, { type: "refreshAllMcpServers" })

			expect(mockRefreshAllConnections).not.toHaveBeenCalled()
		})
	})

	describe("toggleMcpServer", () => {
		it("toggles the server with the typed source", async () => {
			const provider = createMockProvider()

			await handleMcpMessages(provider, undefined, {
				type: "toggleMcpServer",
				serverName: "my-server",
				disabled: true,
				source: "project",
			})

			expect(mockToggleServerDisabled).toHaveBeenCalledWith("my-server", true, "project")
		})

		it("rejects a malformed payload (missing disabled) before any side effects", async () => {
			const provider = createMockProvider()

			await handleMcpMessages(provider, undefined, { type: "toggleMcpServer", serverName: "my-server" })

			expect(mockToggleServerDisabled).not.toHaveBeenCalled()
		})

		it("rejects a malformed payload (non-boolean disabled) before any side effects", async () => {
			const provider = createMockProvider()

			await handleMcpMessages(provider, undefined, {
				type: "toggleMcpServer",
				serverName: "my-server",
				disabled: "yes",
			} as unknown as WebviewMessage)

			expect(mockToggleServerDisabled).not.toHaveBeenCalled()
		})
	})

	describe("deleteMcpServer", () => {
		it("deletes the server with the typed source", async () => {
			const provider = createMockProvider()

			await handleMcpMessages(provider, undefined, {
				type: "deleteMcpServer",
				serverName: "my-server",
				source: "project",
			})

			expect(mockDeleteServer).toHaveBeenCalledWith("my-server", "project")
			expect(mockPostStateToWebview).toHaveBeenCalled()
		})

		it("does nothing when serverName is absent (guard preserved)", async () => {
			const provider = createMockProvider()

			await handleMcpMessages(provider, undefined, { type: "deleteMcpServer" })

			expect(mockDeleteServer).not.toHaveBeenCalled()
		})
	})

	describe("restartMcpServer", () => {
		it("restarts the connection with text and source", async () => {
			const provider = createMockProvider()

			await handleMcpMessages(provider, undefined, {
				type: "restartMcpServer",
				text: "my-server",
				source: "global",
			})

			expect(mockRestartConnection).toHaveBeenCalledWith("my-server", "global")
		})

		it("rejects a malformed payload (missing text) before any side effects", async () => {
			const provider = createMockProvider()

			await handleMcpMessages(provider, undefined, { type: "restartMcpServer" })

			expect(mockRestartConnection).not.toHaveBeenCalled()
		})
	})

	describe("updateMcpTimeout", () => {
		it("updates the timeout when serverName and a number timeout are present", async () => {
			const provider = createMockProvider()

			await handleMcpMessages(provider, undefined, {
				type: "updateMcpTimeout",
				serverName: "my-server",
				timeout: 60,
				source: "project",
			})

			expect(mockUpdateServerTimeout).toHaveBeenCalledWith("my-server", 60, "project")
		})

		it("does nothing when timeout is not a number (guard preserved)", async () => {
			const provider = createMockProvider()

			await handleMcpMessages(provider, undefined, {
				type: "updateMcpTimeout",
				serverName: "my-server",
				timeout: "60",
			} as unknown as WebviewMessage)

			expect(mockUpdateServerTimeout).not.toHaveBeenCalled()
		})
	})

	describe("toggleToolAlwaysAllow / toggleToolEnabledForPrompt", () => {
		it("toggles always-allow with serverName, source, toolName and coerced alwaysAllow", async () => {
			const provider = createMockProvider()

			await handleMcpMessages(provider, undefined, {
				type: "toggleToolAlwaysAllow",
				serverName: "my-server",
				source: "global",
				toolName: "my-tool",
				alwaysAllow: true,
			})

			expect(mockToggleToolAlwaysAllow).toHaveBeenCalledWith("my-server", "global", "my-tool", true)
		})

		it("toggles enabled-for-prompt with serverName, source, toolName and coerced isEnabled", async () => {
			const provider = createMockProvider()

			await handleMcpMessages(provider, undefined, {
				type: "toggleToolEnabledForPrompt",
				serverName: "my-server",
				source: "project",
				toolName: "my-tool",
				isEnabled: false,
			})

			expect(mockToggleToolEnabledForPrompt).toHaveBeenCalledWith("my-server", "project", "my-tool", false)
		})

		it("rejects a malformed toggleToolAlwaysAllow payload (missing toolName) before side effects", async () => {
			const provider = createMockProvider()

			await handleMcpMessages(provider, undefined, {
				type: "toggleToolAlwaysAllow",
				serverName: "my-server",
			})

			expect(mockToggleToolAlwaysAllow).not.toHaveBeenCalled()
		})
	})
})
