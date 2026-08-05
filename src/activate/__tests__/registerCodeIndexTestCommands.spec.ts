import type { Mock } from "vitest"
import * as vscode from "vscode"

import type { ClineProvider } from "../../core/webview/ClineProvider"
import { webviewMessageHandler } from "../../core/webview/webviewMessageHandler"
import {
	CODE_INDEX_TEST_DISPATCH_COMMAND,
	CODE_INDEX_TEST_STATUS_COMMAND,
	registerCodeIndexTestCommands,
} from "../registerCodeIndexTestCommands"

vi.mock("vscode", () => ({
	commands: {
		registerCommand: vi.fn(() => ({ dispose: vi.fn() })),
	},
}))

vi.mock("../../core/webview/webviewMessageHandler", () => ({
	webviewMessageHandler: vi.fn(),
}))

describe("registerCodeIndexTestCommands", () => {
	let mockProvider: { getCurrentWorkspaceCodeIndexManager: Mock }
	let disposables: vscode.Disposable[]

	const dispatchHandler = (): ((message: unknown) => Promise<void>) => {
		const call = (vscode.commands.registerCommand as Mock).mock.calls.find(
			(c) => c[0] === CODE_INDEX_TEST_DISPATCH_COMMAND,
		)
		return call![1] as (message: unknown) => Promise<void>
	}

	const statusHandler = (): (() => unknown) => {
		const call = (vscode.commands.registerCommand as Mock).mock.calls.find(
			(c) => c[0] === CODE_INDEX_TEST_STATUS_COMMAND,
		)
		return call![1] as () => unknown
	}

	beforeEach(() => {
		vi.clearAllMocks()
		mockProvider = {
			getCurrentWorkspaceCodeIndexManager: vi.fn(),
		}
		disposables = registerCodeIndexTestCommands(mockProvider as unknown as ClineProvider)
	})

	it("registers the dispatch and status commands with the test-only ids", () => {
		const ids = (vscode.commands.registerCommand as Mock).mock.calls.map((call) => call[0])
		expect(ids).toContain(CODE_INDEX_TEST_DISPATCH_COMMAND)
		expect(ids).toContain(CODE_INDEX_TEST_STATUS_COMMAND)
		expect(disposables).toHaveLength(2)
	})

	it("dispatches a WebviewMessage through the real webviewMessageHandler", async () => {
		const message = { type: "saveCodeIndexSettingsAtomic" }

		await dispatchHandler()(message)

		expect(webviewMessageHandler).toHaveBeenCalledWith(mockProvider, message, undefined)
	})

	it("returns the manager status from the status command", () => {
		const status = { systemStatus: "Indexed", message: "ready" }
		mockProvider.getCurrentWorkspaceCodeIndexManager.mockReturnValue({ getCurrentStatus: () => status })

		expect(statusHandler()()).toEqual(status)
	})

	it("returns undefined from the status command when no manager is available", () => {
		mockProvider.getCurrentWorkspaceCodeIndexManager.mockReturnValue(undefined)

		expect(statusHandler()()).toBeUndefined()
	})
})
