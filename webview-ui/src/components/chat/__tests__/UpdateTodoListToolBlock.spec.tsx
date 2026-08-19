import { render, screen, act } from "@/utils/test-utils"

import UpdateTodoListToolBlock from "../UpdateTodoListToolBlock"

const BASE_TODOS = [
	{ id: "1", content: "First", status: "" },
	{ id: "2", content: "Second", status: "in_progress" },
]

describe("UpdateTodoListToolBlock - todos sync (loop-safe hardening)", () => {
	it("renders the initial todos", () => {
		render(<UpdateTodoListToolBlock todos={BASE_TODOS} onChange={vi.fn()} />)

		expect(screen.getByText("First")).toBeInTheDocument()
		expect(screen.getByText("Second")).toBeInTheDocument()
	})

	it("re-syncs the editable list when the todos content changes", () => {
		const { rerender } = render(<UpdateTodoListToolBlock todos={BASE_TODOS} onChange={vi.fn()} />)
		expect(screen.getByText("First")).toBeInTheDocument()

		const updated = [
			{ id: "1", content: "First (edited)", status: "" },
			{ id: "2", content: "Second", status: "in_progress" },
		]
		rerender(<UpdateTodoListToolBlock todos={updated} onChange={vi.fn()} />)

		expect(screen.getByText("First (edited)")).toBeInTheDocument()
		expect(screen.queryByText("First")).not.toBeInTheDocument()
		expect(screen.getByText("Second")).toBeInTheDocument()
	})

	it("does not loop when the parent passes a fresh todos array reference with identical content", () => {
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
		try {
			const { rerender } = render(<UpdateTodoListToolBlock todos={BASE_TODOS} onChange={vi.fn()} />)

			// Pump many consecutive re-renders with a NEW array reference but
			// identical logical content (the prop array may be recreated on
			// every parent render). The render-phase guard compares a stable
			// content key, so it must not cascade into a render loop.
			for (let i = 0; i < 20; i++) {
				act(() => {
					rerender(
						<UpdateTodoListToolBlock todos={BASE_TODOS.map((todo) => ({ ...todo }))} onChange={vi.fn()} />,
					)
				})
			}

			expect(
				errorSpy.mock.calls.some(
					([message]) =>
						typeof message === "string" &&
						(message.includes("Too many re-renders") || message.includes("Maximum update depth exceeded")),
				),
			).toBe(false)

			expect(screen.getByText("First")).toBeInTheDocument()
			expect(screen.getByText("Second")).toBeInTheDocument()
		} finally {
			errorSpy.mockRestore()
		}
	})
})
