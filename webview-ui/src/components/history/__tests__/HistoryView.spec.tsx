import { render, screen, fireEvent } from "@/utils/test-utils"

import { useExtensionState } from "@src/context/ExtensionStateContext"
import { vscode } from "@src/utils/vscode"

import HistoryView from "../HistoryView"

vi.mock("@src/context/ExtensionStateContext")
vi.mock("@src/utils/vscode")

vi.mock("@src/i18n/TranslationContext", () => ({
	useAppTranslation: () => ({
		t: (key: string) => key,
	}),
}))

const mockTaskHistory = [
	{
		id: "1",
		task: "Test task 1",
		ts: Date.now(),
		tokensIn: 100,
		tokensOut: 50,
		totalCost: 0.002,
		workspace: "/test/workspace",
	},
	{
		id: "2",
		task: "Test task 2",
		ts: Date.now() + 1000,
		tokensIn: 200,
		tokensOut: 100,
		totalCost: 0.003,
		workspace: "/test/workspace",
	},
]

describe("HistoryView", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		;(useExtensionState as ReturnType<typeof vi.fn>).mockReturnValue({
			taskHistory: mockTaskHistory,
			cwd: "/test/workspace",
		})
	})

	it("renders the history interface", () => {
		const onDone = vi.fn()
		render(<HistoryView onDone={onDone} />)

		// Check for main UI elements
		expect(screen.getByText("history:history")).toBeInTheDocument()
		expect(screen.getByText("history:done")).toBeInTheDocument()
		expect(screen.getByPlaceholderText("history:searchPlaceholder")).toBeInTheDocument()
	})

	it("calls onDone when done button is clicked", () => {
		const onDone = vi.fn()
		render(<HistoryView onDone={onDone} />)

		const doneButton = screen.getByText("history:done")
		fireEvent.click(doneButton)

		expect(onDone).toHaveBeenCalled()
	})

	describe("bounded taskHistory window (2026-09-17 state payload incident)", () => {
		// Newest-first, as the host ships it.
		const sortedHistory = [
			{ ...mockTaskHistory[1], id: "new", ts: 2000 },
			{ ...mockTaskHistory[0], id: "old", ts: 1000 },
		]

		it("offers 'load older tasks' when the host window is bounded, and pages from the oldest loaded row", () => {
			;(useExtensionState as ReturnType<typeof vi.fn>).mockReturnValue({
				taskHistory: sortedHistory,
				taskHistoryBounded: true,
				taskHistoryTotal: 40,
				cwd: "/test/workspace",
			})

			render(<HistoryView onDone={vi.fn()} />)

			fireEvent.click(screen.getByTestId("load-older-tasks-button"))

			expect(vscode.postMessage).toHaveBeenCalledWith({ type: "getOlderTaskHistory", beforeTs: 1000 })
		})

		it("pages from the host's paging anchor, not the oldest row present (tree-closed window)", () => {
			// The window ends with a re-attached ancestor row (ts 100) that is older
			// than the byte cutoff (ts 3000). Paging from the oldest row present would
			// skip every row between the ancestor and the cutoff and make them
			// unreachable, so the host's anchor wins.
			;(useExtensionState as ReturnType<typeof vi.fn>).mockReturnValue({
				taskHistory: [
					{ ...mockTaskHistory[1], id: "child", ts: 3000, parentTaskId: "parent" },
					{ ...mockTaskHistory[0], id: "parent", ts: 100 },
				],
				taskHistoryBounded: true,
				taskHistoryTotal: 40,
				taskHistoryPagingAnchorTs: 3000,
				cwd: "/test/workspace",
			})

			render(<HistoryView onDone={vi.fn()} />)

			fireEvent.click(screen.getByTestId("load-older-tasks-button"))

			expect(vscode.postMessage).toHaveBeenCalledWith({ type: "getOlderTaskHistory", beforeTs: 3000 })
		})

		it("hides the affordance when the whole history is already loaded", () => {
			;(useExtensionState as ReturnType<typeof vi.fn>).mockReturnValue({
				taskHistory: sortedHistory,
				taskHistoryBounded: true,
				taskHistoryTotal: sortedHistory.length,
				cwd: "/test/workspace",
			})

			render(<HistoryView onDone={vi.fn()} />)

			expect(screen.queryByTestId("load-older-tasks-button")).not.toBeInTheDocument()
		})

		it("hides the affordance for an unbounded (complete) history", () => {
			render(<HistoryView onDone={vi.fn()} />)

			expect(screen.queryByTestId("load-older-tasks-button")).not.toBeInTheDocument()
		})
	})
})
