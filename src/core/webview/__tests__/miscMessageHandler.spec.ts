// npx vitest run src/core/webview/__tests__/miscMessageHandler.spec.ts

import type { WebviewMessage } from "@roo-code/types"
import type { ClineProvider } from "../ClineProvider"

// Mock vscode first
vi.mock("vscode", () => ({
	window: {
		showErrorMessage: vi.fn(),
		showInformationMessage: vi.fn(),
		showWarningMessage: vi.fn(),
		showTextDocument: vi.fn(),
	},
	workspace: {
		openTextDocument: vi.fn(),
		workspaceFolders: [{ uri: { fsPath: "/mock/workspace" } }],
	},
	env: {
		openExternal: vi.fn(),
	},
	Uri: {
		parse: vi.fn((s: string) => ({ toString: () => s })),
	},
	commands: {
		executeCommand: vi.fn(),
	},
}))

// Mock the misc handler's module dependencies
vi.mock("../../../integrations/misc/open-file", () => ({
	openFile: vi.fn(),
}))

vi.mock("../../mentions", () => ({
	openMention: vi.fn(),
}))

vi.mock("../../../services/search/file-search", () => ({
	searchWorkspaceFiles: vi.fn().mockResolvedValue([]),
}))

vi.mock("../../ignore/RooIgnoreController", () => ({
	RooIgnoreController: vi.fn().mockImplementation(() => ({
		initialize: vi.fn().mockResolvedValue(undefined),
		filterPaths: vi.fn((paths: string[]) => paths),
		dispose: vi.fn(),
	})),
}))

vi.mock("../../../services/roo-config/index.js", () => ({
	getRooDirectoriesForCwd: vi.fn(() => []),
}))

vi.mock("../../../utils/commands", () => ({
	getCommand: vi.fn((name: string) => name),
}))

vi.mock("../../task-persistence/importRooTaskHistory", () => ({
	importRooTaskHistory: vi.fn(),
}))

vi.mock("../../../shared/checkExistApiConfig", () => ({
	checkExistKey: vi.fn(() => true),
}))

vi.mock("../../../integrations/theme/getTheme", () => ({
	getTheme: vi.fn().mockResolvedValue({}),
}))

vi.mock("@roo-code/core", () => ({
	customToolRegistry: {
		loadFromDirectories: vi.fn(),
		getAllSerialized: vi.fn(() => []),
	},
}))

vi.mock("@roo-code/telemetry", () => ({
	TelemetryService: {
		hasInstance: vi.fn(() => false),
		instance: { captureTabShown: vi.fn() },
	},
}))

vi.mock("fs/promises", () => ({
	readFile: vi.fn(),
	writeFile: vi.fn(),
	mkdtemp: vi.fn(),
}))

// Mock the shared state helpers used by the misc handler
vi.mock("../handlers/shared", () => ({
	getCurrentCwd: vi.fn(() => "/mock/workspace"),
	getGlobalState: vi.fn(),
	updateGlobalState: vi.fn(),
}))

import { openFile } from "../../../integrations/misc/open-file"
import { getGlobalState } from "../handlers/shared"
import { handleMiscMessages } from "../handlers/misc"

describe("miscMessageHandler", () => {
	const mockLog = vi.fn()
	const mockPostMessageToWebview = vi.fn()

	const createMockProvider = (): ClineProvider =>
		({
			getCurrentTask: vi.fn().mockReturnValue(undefined),
			contextProxy: { globalStorageUri: { fsPath: "/mock/storage" } },
			log: mockLog,
			postMessageToWebview: mockPostMessageToWebview,
			postStateToWebview: vi.fn().mockResolvedValue(undefined),
			getState: vi.fn().mockResolvedValue({}),
			getModes: vi.fn().mockResolvedValue([]),
			getMcpHub: vi.fn().mockReturnValue(undefined),
			workspaceTracker: undefined,
			isViewLaunched: false,
			latestAnnouncementId: "announcement-1",
		}) as unknown as ClineProvider

	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe("openFile", () => {
		it("opens an absolute path with the typed values (cast removed)", async () => {
			const provider = createMockProvider()

			await handleMiscMessages(provider, undefined, {
				type: "openFile",
				text: "/abs/path/file.ts",
				values: { create: true, content: "hello", line: 42 },
			})

			expect(openFile).toHaveBeenCalledWith("/abs/path/file.ts", { create: true, content: "hello", line: 42 })
		})

		it("resolves a relative path against the current cwd", async () => {
			const provider = createMockProvider()

			await handleMiscMessages(provider, undefined, { type: "openFile", text: "./src/file.ts" })

			expect(openFile).toHaveBeenCalledWith("/mock/workspace/src/file.ts", undefined)
		})

		it("rejects a malformed openFile message (missing text) before opening", async () => {
			const provider = createMockProvider()

			await handleMiscMessages(provider, undefined, { type: "openFile" } as unknown as WebviewMessage)

			expect(mockLog).toHaveBeenCalledWith(expect.stringContaining("Rejected malformed openFile message"))
			expect(openFile).not.toHaveBeenCalled()
		})
	})

	describe("switchTab", () => {
		it("posts the switchTab action with the typed enum tab and values", async () => {
			const provider = createMockProvider()

			await handleMiscMessages(provider, undefined, {
				type: "switchTab",
				tab: "settings",
				values: { section: "api" },
			})

			expect(mockPostMessageToWebview).toHaveBeenCalledWith({
				type: "action",
				action: "switchTab",
				tab: "settings",
				values: { section: "api" },
			})
		})

		it("rejects a malformed switchTab message (invalid tab enum) before posting", async () => {
			const provider = createMockProvider()

			await handleMiscMessages(provider, undefined, {
				type: "switchTab",
				tab: "bogus",
			} as unknown as WebviewMessage)

			expect(mockLog).toHaveBeenCalledWith(expect.stringContaining("Rejected malformed switchTab message"))
			expect(mockPostMessageToWebview).not.toHaveBeenCalled()
		})

		it("does nothing when tab is absent (guard preserved)", async () => {
			const provider = createMockProvider()

			await handleMiscMessages(provider, undefined, { type: "switchTab" })

			expect(mockPostMessageToWebview).not.toHaveBeenCalled()
		})
	})

	describe("requestModes", () => {
		it("posts the fetched modes back to the webview", async () => {
			const provider = createMockProvider()
			const modes = [{ slug: "code", name: "Code" }]
			vi.mocked(provider.getModes).mockResolvedValue(modes as never)

			await handleMiscMessages(provider, undefined, { type: "requestModes" })

			expect(mockPostMessageToWebview).toHaveBeenCalledWith({ type: "modes", modes })
		})

		it("posts an empty modes list when fetching fails", async () => {
			const provider = createMockProvider()
			vi.mocked(provider.getModes).mockRejectedValue(new Error("boom"))

			await handleMiscMessages(provider, undefined, { type: "requestModes" })

			expect(mockPostMessageToWebview).toHaveBeenCalledWith({ type: "modes", modes: [] })
		})
	})

	describe("getDismissedUpsells", () => {
		it("posts the stored dismissed upsells list", async () => {
			const provider = createMockProvider()
			vi.mocked(getGlobalState).mockReturnValue(["upsell-a", "upsell-b"])

			await handleMiscMessages(provider, undefined, { type: "getDismissedUpsells" })

			expect(mockPostMessageToWebview).toHaveBeenCalledWith({
				type: "dismissedUpsells",
				list: ["upsell-a", "upsell-b"],
			})
		})

		it("posts an empty list when nothing is stored", async () => {
			const provider = createMockProvider()
			vi.mocked(getGlobalState).mockReturnValue(undefined)

			await handleMiscMessages(provider, undefined, { type: "getDismissedUpsells" })

			expect(mockPostMessageToWebview).toHaveBeenCalledWith({ type: "dismissedUpsells", list: [] })
		})
	})

	describe("openExternal", () => {
		it("opens the URL when provided", async () => {
			const provider = createMockProvider()

			await handleMiscMessages(provider, undefined, { type: "openExternal", url: "https://example.com" })

			expect(provider.log).not.toHaveBeenCalledWith(
				expect.stringContaining("Rejected malformed openExternal message"),
			)
		})

		it("rejects a malformed openExternal message (non-string url)", async () => {
			const provider = createMockProvider()

			await handleMiscMessages(provider, undefined, {
				type: "openExternal",
				url: 42,
			} as unknown as WebviewMessage)

			expect(mockLog).toHaveBeenCalledWith(expect.stringContaining("Rejected malformed openExternal message"))
		})
	})
})
