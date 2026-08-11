// npx vitest run src/core/webview/__tests__/debugMessageHandler.spec.ts

import type { WebviewMessage } from "@roo-code/types"
import type { ClineProvider } from "../ClineProvider"

// Mock vscode first
vi.mock("vscode", () => ({
	window: {
		showErrorMessage: vi.fn(),
		showTextDocument: vi.fn(),
	},
	workspace: {
		openTextDocument: vi.fn(),
	},
}))

// Mock the diagnostics handler so downloadErrorDiagnostics never touches real IO
vi.mock("../diagnosticsHandler", () => ({
	generateErrorDiagnostics: vi.fn().mockResolvedValue({ success: true, filePath: "/tmp/diagnostics.json" }),
}))

// Mock fs/promises + storage helpers so the history-openers never touch the real filesystem
vi.mock("fs/promises", () => ({
	readFile: vi.fn(),
	writeFile: vi.fn(),
	mkdtemp: vi.fn(),
}))

vi.mock("../../../utils/fs", () => ({
	fileExistsAtPath: vi.fn().mockResolvedValue(true),
}))

vi.mock("../../../utils/storage", () => ({
	getTaskDirectoryPath: vi.fn().mockResolvedValue("/mock/task-dir"),
}))

import { generateErrorDiagnostics } from "../diagnosticsHandler"
import { handleDebugMessages } from "../handlers/debug"

describe("debugMessageHandler", () => {
	const mockLog = vi.fn()

	const createMockProvider = (): ClineProvider =>
		({
			getCurrentTask: vi.fn().mockReturnValue(undefined),
			contextProxy: { globalStorageUri: { fsPath: "/mock/storage" } },
			log: mockLog,
		}) as unknown as ClineProvider

	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe("downloadErrorDiagnostics", () => {
		it("passes the parsed values through to generateErrorDiagnostics", async () => {
			const provider = createMockProvider()
			vi.mocked(provider.getCurrentTask).mockReturnValue({ taskId: "task-1" } as never)

			await handleDebugMessages(provider, undefined, {
				type: "downloadErrorDiagnostics",
				values: { provider: "anthropic", model: "claude", details: "boom" },
			})

			expect(generateErrorDiagnostics).toHaveBeenCalledTimes(1)
			expect(generateErrorDiagnostics).toHaveBeenCalledWith({
				taskId: "task-1",
				globalStoragePath: "/mock/storage",
				values: { provider: "anthropic", model: "claude", details: "boom" },
				log: expect.any(Function),
			})
		})

		it("passes undefined values when the message has none", async () => {
			const provider = createMockProvider()
			vi.mocked(provider.getCurrentTask).mockReturnValue({ taskId: "task-1" } as never)

			await handleDebugMessages(provider, undefined, { type: "downloadErrorDiagnostics" })

			expect(generateErrorDiagnostics).toHaveBeenCalledWith({
				taskId: "task-1",
				globalStoragePath: "/mock/storage",
				values: undefined,
				log: expect.any(Function),
			})
		})

		it("rejects a malformed payload (non-object values) before any side effects", async () => {
			const provider = createMockProvider()
			vi.mocked(provider.getCurrentTask).mockReturnValue({ taskId: "task-1" } as never)

			await handleDebugMessages(provider, undefined, {
				type: "downloadErrorDiagnostics",
				values: "nope",
			} as unknown as WebviewMessage)

			expect(mockLog).toHaveBeenCalledWith(
				expect.stringContaining("Rejected malformed downloadErrorDiagnostics message"),
			)
			expect(generateErrorDiagnostics).not.toHaveBeenCalled()
		})

		it("shows an error when there is no active task", async () => {
			const provider = createMockProvider()

			await handleDebugMessages(provider, undefined, { type: "downloadErrorDiagnostics" })

			expect(generateErrorDiagnostics).not.toHaveBeenCalled()
		})
	})
})
