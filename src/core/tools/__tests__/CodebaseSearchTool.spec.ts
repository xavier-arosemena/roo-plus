import { describe, it, expect, vi, beforeEach } from "vitest"

import type { Task } from "../../task/Task"
import type { ToolCallbacks } from "../BaseTool"
import { CodebaseSearchTool } from "../CodebaseSearchTool"
import { CodeIndexManager } from "../../../services/code-index/manager"

// Mock the singleton accessor so the tool boundary can be driven directly with
// the manager's indexing state (the shared source of truth for both the Semble
// provider and the Qdrant search service).
vi.mock("../../../services/code-index/manager", () => ({
	CodeIndexManager: { getInstance: vi.fn() },
}))

vi.mock("../../../utils/path", () => ({
	getWorkspacePath: vi.fn().mockReturnValue("/test/workspace"),
}))

vi.mock("../../prompts/responses", () => ({
	formatResponse: {
		toolDenied: vi.fn().mockReturnValue("Tool denied"),
	},
}))

interface MockManager {
	isFeatureEnabled: boolean
	isFeatureConfigured: boolean
	state: string
	getCurrentStatus: ReturnType<typeof vi.fn>
	searchIndex: ReturnType<typeof vi.fn>
}

function createMockManager(overrides: Partial<MockManager> = {}): MockManager {
	return {
		isFeatureEnabled: true,
		isFeatureConfigured: true,
		state: "Indexed",
		getCurrentStatus: vi.fn().mockReturnValue({
			systemStatus: "Indexed",
			message: "Index up-to-date.",
		}),
		searchIndex: vi.fn().mockResolvedValue([]),
		...overrides,
	}
}

describe("CodebaseSearchTool", () => {
	let tool: CodebaseSearchTool
	let mockTask: Task
	let mockCallbacks: ToolCallbacks

	beforeEach(() => {
		vi.clearAllMocks()

		tool = new CodebaseSearchTool()

		mockTask = {
			cwd: "/test/workspace",
			consecutiveMistakeCount: 0,
			didToolFailInCurrentTurn: false,
			providerRef: {
				deref: vi.fn().mockReturnValue({ context: {} }),
			},
			say: vi.fn(),
			sayAndCreateMissingParamError: vi.fn().mockResolvedValue("Missing parameter error"),
		} as unknown as Task

		mockCallbacks = {
			askApproval: vi.fn().mockResolvedValue(true),
			handleError: vi.fn(),
			pushToolResult: vi.fn(),
		}

		vi.mocked(CodeIndexManager.getInstance).mockReturnValue(createMockManager() as unknown as CodeIndexManager)
	})

	it("surfaces an actionable error message when search returns empty while the index is in Error state", async () => {
		const manager = createMockManager({
			state: "Error",
			getCurrentStatus: vi.fn().mockReturnValue({
				systemStatus: "Error",
				message: "Search failed: fetch failed",
			}),
		})
		vi.mocked(CodeIndexManager.getInstance).mockReturnValue(manager as unknown as CodeIndexManager)

		await tool.execute({ query: "test" }, mockTask, mockCallbacks)

		expect(manager.searchIndex).toHaveBeenCalledWith("test", undefined)
		expect(mockCallbacks.pushToolResult).toHaveBeenCalledTimes(1)
		const [result] = vi.mocked(mockCallbacks.pushToolResult).mock.calls[0]
		expect(result).toContain("Code index is in an error state:")
		expect(result).toContain("Search failed: fetch failed")
		expect(result).toContain("Resolve the error")
		expect(result).not.toContain("No relevant code snippets found")
	})

	it.each(["Indexed", "Standby"])(
		"keeps the no-results message when search returns empty while state is %s",
		async (state) => {
			const manager = createMockManager({ state })
			vi.mocked(CodeIndexManager.getInstance).mockReturnValue(manager as unknown as CodeIndexManager)

			await tool.execute({ query: "test" }, mockTask, mockCallbacks)

			expect(manager.searchIndex).toHaveBeenCalledWith("test", undefined)
			expect(mockCallbacks.pushToolResult).toHaveBeenCalledWith(
				'No relevant code snippets found for the query: "test"',
			)
			expect(mockCallbacks.pushToolResult).not.toHaveBeenCalledWith(
				expect.stringContaining("Code index is in an error state"),
			)
		},
	)
})
