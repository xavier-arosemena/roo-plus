// npx vitest run src/core/webview/__tests__/webviewMessageHandler.task.spec.ts

import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("../../../i18n", () => ({
	t: vi.fn((key: string) => key),
	changeLanguage: vi.fn(),
}))

vi.mock("vscode", () => ({
	window: {
		showErrorMessage: vi.fn(),
		showInformationMessage: vi.fn(),
	},
	workspace: {
		workspaceFolders: undefined,
		getConfiguration: vi.fn(() => ({
			get: vi.fn(),
			update: vi.fn(),
		})),
	},
	env: {
		clipboard: { writeText: vi.fn() },
	},
	ConfigurationTarget: {
		Global: 1,
		Workspace: 2,
		WorkspaceFolder: 3,
	},
}))

vi.mock("../../../utils/git", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../../../utils/git")>()
	return {
		...actual,
		searchCommits: vi.fn(),
	}
})

vi.mock("../../mentions/resolveImageMentions", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../../mentions/resolveImageMentions")>()
	return {
		...actual,
		resolveImageMentions: vi.fn(async ({ text, images }: { text: string; images?: string[] }) => ({
			text,
			images,
		})),
	}
})

import { webviewMessageHandler } from "../webviewMessageHandler"
import type { ClineProvider } from "../ClineProvider"
import { searchCommits } from "../../../utils/git"

const mockSearchCommits = vi.mocked(searchCommits)

describe("webviewMessageHandler - task domain", () => {
	const createProvider = (overrides: Record<string, unknown> = {}) =>
		Object.assign(
			{
				getCurrentTask: vi.fn(),
				getState: vi.fn().mockResolvedValue({}),
				cwd: "/mock/workspace",
				createTask: vi.fn().mockResolvedValue(undefined),
				postMessageToWebview: vi.fn().mockResolvedValue(true),
				clearTask: vi.fn().mockResolvedValue(undefined),
				postStateToWebview: vi.fn().mockResolvedValue(undefined),
				showTaskWithId: vi.fn().mockResolvedValue(undefined),
				log: vi.fn(),
			},
			overrides,
		) as unknown as ClineProvider

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("clearTask clears the current task and posts state", async () => {
		const provider = createProvider()

		await webviewMessageHandler(provider, { type: "clearTask" })

		expect(provider.clearTask).toHaveBeenCalledTimes(1)
		expect(provider.postStateToWebview).toHaveBeenCalledTimes(1)
	})

	it("searchCommits posts commitSearchResults", async () => {
		const provider = createProvider()
		mockSearchCommits.mockResolvedValue([{ hash: "abc123", subject: "fix typo" }] as never)

		await webviewMessageHandler(provider, { type: "searchCommits", query: "fix" })

		expect(mockSearchCommits).toHaveBeenCalledWith("fix", "/mock/workspace")
		expect(provider.postMessageToWebview).toHaveBeenCalledWith({
			type: "commitSearchResults",
			commits: [{ hash: "abc123", subject: "fix typo" }],
		})
	})

	it("rejects a malformed showTaskWithId (missing text) before dispatch", async () => {
		const provider = createProvider()

		await webviewMessageHandler(provider, { type: "showTaskWithId" } as never)

		expect(provider.showTaskWithId).not.toHaveBeenCalled()
		expect(provider.log).toHaveBeenCalledWith(expect.stringContaining("showTaskWithId"))
	})

	it("newTask creates a task with the typed payload", async () => {
		const provider = createProvider()

		await webviewMessageHandler(provider, {
			type: "newTask",
			text: "Build the feature",
			images: ["data:image/png;base64,abc"],
			taskId: "task-123",
		})

		expect(provider.createTask).toHaveBeenCalledWith(
			"Build the feature",
			["data:image/png;base64,abc"],
			undefined,
			{ taskId: "task-123" },
			undefined,
		)
		expect(provider.postMessageToWebview).toHaveBeenCalledWith({ type: "invoke", invoke: "newChat" })
	})

	it("newTask handles a create failure by resetting the UI and showing an error", async () => {
		const provider = createProvider({
			createTask: vi.fn().mockRejectedValue(new Error("boom")),
		})

		await webviewMessageHandler(provider, { type: "newTask", text: "Build" })

		expect(provider.postMessageToWebview).toHaveBeenCalledWith({ type: "invoke", invoke: "newChat" })
	})
})
