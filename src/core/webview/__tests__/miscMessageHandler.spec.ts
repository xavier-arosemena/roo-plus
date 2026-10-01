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

import * as vscode from "vscode"
import { openFile } from "../../../integrations/misc/open-file"
import { getGlobalState, updateGlobalState } from "../handlers/shared"
import { WEBVIEW_BOOT_FAILURE_NOTIFY_WINDOW_MS, handleMiscMessages } from "../handlers/misc"

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
			// F-3: the one-per-session boot-failure notification latch starts unset.
			webviewBootFailureNotified: false,
			latestAnnouncementId: "announcement-1",
			recordWebviewLivenessPong: vi.fn(),
			// Minimal webviewDidLaunch deps so the latch re-arm can be exercised.
			customModesManager: { getCustomModes: vi.fn().mockResolvedValue([]) },
			providerSettingsManager: { listConfig: vi.fn().mockResolvedValue([]) },
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

	describe("webviewBootFailure", () => {
		it("logs the watchdog reason locally but does NOT notify (F-1: heuristic, retracted by DEF-4)", async () => {
			const provider = createMockProvider()

			await handleMiscMessages(provider, undefined, { type: "webviewBootFailure", reason: "watchdog" })

			expect(mockLog).toHaveBeenCalledWith("[webview-boot] failure reason=watchdog")
			// The watchdog is a heuristic over a slow-but-healthy mount and the guard
			// retracts it when the app finally mounts, so it must stay LOG-ONLY.
			expect(vscode.window.showWarningMessage).not.toHaveBeenCalled()
		})

		it.each(["load", "throw"] as const)(
			"logs reason=%s and shows exactly one non-modal notification (deterministic failure)",
			async (reason) => {
				const provider = createMockProvider()

				await handleMiscMessages(provider, undefined, { type: "webviewBootFailure", reason })

				expect(mockLog).toHaveBeenCalledWith(`[webview-boot] failure reason=${reason}`)
				expect(vscode.window.showWarningMessage).toHaveBeenCalledTimes(1)
			},
		)

		it("notifies at most ONCE within the rate-limit window even if the message is duplicated (NEW-2)", async () => {
			const provider = createMockProvider()

			await handleMiscMessages(provider, undefined, { type: "webviewBootFailure", reason: "load" })
			await handleMiscMessages(provider, undefined, { type: "webviewBootFailure", reason: "throw" })

			// Both reasons are still logged (the diagnostic channel is unaffected) …
			expect(mockLog).toHaveBeenCalledWith("[webview-boot] failure reason=load")
			expect(mockLog).toHaveBeenCalledWith("[webview-boot] failure reason=throw")
			// … but the user is warned exactly once inside the window.
			expect(vscode.window.showWarningMessage).toHaveBeenCalledTimes(1)
		})

		it("rate-limits to one per 60 s window per webview and always logs locally (NEW-2)", async () => {
			const provider = createMockProvider()

			vi.useFakeTimers()
			vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"))

			try {
				// First deterministic failure: shown.
				await handleMiscMessages(provider, undefined, { type: "webviewBootFailure", reason: "load" })
				expect(vscode.window.showWarningMessage).toHaveBeenCalledTimes(1)

				// Duplicate inside the window: suppressed, but STILL logged locally.
				await handleMiscMessages(provider, undefined, { type: "webviewBootFailure", reason: "throw" })
				expect(vscode.window.showWarningMessage).toHaveBeenCalledTimes(1)
				expect(mockLog).toHaveBeenCalledWith("[webview-boot] failure reason=load")
				expect(mockLog).toHaveBeenCalledWith("[webview-boot] failure reason=throw")

				// Just inside the window (window − 1 ms): still suppressed.
				vi.advanceTimersByTime(WEBVIEW_BOOT_FAILURE_NOTIFY_WINDOW_MS - 1)
				await handleMiscMessages(provider, undefined, { type: "webviewBootFailure", reason: "load" })
				expect(vscode.window.showWarningMessage).toHaveBeenCalledTimes(1)

				// Window elapsed: allowed again.
				vi.advanceTimersByTime(1)
				await handleMiscMessages(provider, undefined, { type: "webviewBootFailure", reason: "throw" })
				expect(vscode.window.showWarningMessage).toHaveBeenCalledTimes(2)
			} finally {
				vi.useRealTimers()
			}
		})

		it("re-arms the notification throttle when a fresh document mounts (NEW-2)", async () => {
			const provider = createMockProvider()

			await handleMiscMessages(provider, undefined, { type: "webviewBootFailure", reason: "load" })
			expect(vscode.window.showWarningMessage).toHaveBeenCalledTimes(1)

			// A reload arrives as a new document whose app posts webviewDidLaunch.
			await handleMiscMessages(provider, undefined, { type: "webviewDidLaunch" })
			expect(provider.webviewBootFailureNotified).toBe(false)

			await handleMiscMessages(provider, undefined, { type: "webviewBootFailure", reason: "throw" })
			expect(vscode.window.showWarningMessage).toHaveBeenCalledTimes(2)
		})

		it("rejects a malformed webviewBootFailure (out-of-enum reason) without logging a boot line", async () => {
			const provider = createMockProvider()

			await handleMiscMessages(provider, undefined, {
				type: "webviewBootFailure",
				reason: "bogus",
			} as unknown as WebviewMessage)

			expect(mockLog).toHaveBeenCalledWith(
				expect.stringContaining("Rejected malformed webviewBootFailure message"),
			)
			expect(mockLog).not.toHaveBeenCalledWith(expect.stringContaining("[webview-boot] failure reason="))
			expect(vscode.window.showWarningMessage).not.toHaveBeenCalled()
		})
	})

	describe("livenessPong", () => {
		it("forwards the sequence number and the optional resource-error count to the probe (T2.3)", async () => {
			const provider = createMockProvider()

			await handleMiscMessages(provider, undefined, {
				type: "livenessPong",
				livenessPongSeq: 11,
				resourceErrorCount: 2,
			})

			expect(provider.recordWebviewLivenessPong).toHaveBeenCalledWith(11, 2, undefined)
		})

		it("forwards the optional salvaged-state count to the probe (F-2)", async () => {
			const provider = createMockProvider()

			await handleMiscMessages(provider, undefined, {
				type: "livenessPong",
				livenessPongSeq: 12,
				resourceErrorCount: 0,
				salvagedStateCount: 1,
			})

			expect(provider.recordWebviewLivenessPong).toHaveBeenCalledWith(12, 0, 1)
		})

		it("rejects a livenessPong above the F-3 counter ceiling instead of forwarding it", async () => {
			const provider = createMockProvider()

			await handleMiscMessages(provider, undefined, {
				type: "livenessPong",
				livenessPongSeq: 13,
				resourceErrorCount: 1_000_001,
			})

			expect(mockLog).toHaveBeenCalledWith(expect.stringContaining("Rejected malformed livenessPong message"))
			expect(provider.recordWebviewLivenessPong).not.toHaveBeenCalled()
		})

		it("rejects a livenessPong whose SALVAGED-state count is above the counter ceiling (NEW-3)", async () => {
			const provider = createMockProvider()

			await handleMiscMessages(provider, undefined, {
				type: "livenessPong",
				livenessPongSeq: 14,
				salvagedStateCount: 1_000_001,
			})

			expect(mockLog).toHaveBeenCalledWith(expect.stringContaining("Rejected malformed livenessPong message"))
			expect(provider.recordWebviewLivenessPong).not.toHaveBeenCalled()
		})
	})

	describe("didShowAnnouncement", () => {
		it("persists the computed version-derived announcement id and re-posts state", async () => {
			const provider = createMockProvider()
			// The mock provider exposes latestAnnouncementId as a plain property
			// (the real class exposes a getter derived from Package.version); the
			// handler must persist whatever value it reads.
			Object.assign(provider, { latestAnnouncementId: "v3.81.0" })

			await handleMiscMessages(provider, undefined, { type: "didShowAnnouncement" })

			expect(updateGlobalState).toHaveBeenCalledWith(provider, "lastShownAnnouncementId", "v3.81.0")
			expect(vi.mocked(provider.postStateToWebview)).toHaveBeenCalled()
		})

		it("uses the provider's current id so a version bump re-arms the popup once", async () => {
			const provider = createMockProvider()
			Object.assign(provider, { latestAnnouncementId: "v3.82.0" })

			await handleMiscMessages(provider, undefined, { type: "didShowAnnouncement" })

			expect(updateGlobalState).toHaveBeenCalledWith(provider, "lastShownAnnouncementId", "v3.82.0")
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
