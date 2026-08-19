import { render, screen, fireEvent, waitFor, act } from "@/utils/test-utils"
import { Settings } from "lucide-react"

import { SettingsSearch } from "../SettingsSearch"
import type { SearchableSettingData } from "../useSettingsSearch"

vi.mock("@/i18n/TranslationContext", () => ({
	useAppTranslation: () => ({
		t: (key: string) => key,
	}),
}))

const INDEX: SearchableSettingData[] = [
	{ settingId: "api-key", section: "providers", label: "API Key", sectionLabel: "Providers" },
	{ settingId: "model", section: "providers", label: "Model", sectionLabel: "Providers" },
]

const SECTIONS = [{ id: "providers" as const, icon: Settings }]

describe("SettingsSearch - results highlight sync (loop-safe hardening)", () => {
	it("highlights the first result when a query matches, and clears it on empty results", async () => {
		render(<SettingsSearch index={INDEX} onNavigate={vi.fn()} sections={SECTIONS} />)

		const input = screen.getByTestId("settings-search-input")
		fireEvent.focus(input)
		fireEvent.change(input, { target: { value: "api" } })

		await waitFor(() => {
			const firstOption = screen.getByRole("option", { name: /API Key/i })
			expect(firstOption).toHaveAttribute("aria-selected", "true")
		})

		// Clearing the query empties the results and the highlight resets
		// without erroring.
		fireEvent.change(input, { target: { value: "" } })

		await waitFor(() => {
			expect(screen.queryByRole("option")).not.toBeInTheDocument()
		})
	})

	it("does not loop when the parent re-emits a fresh index reference with identical content", async () => {
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
		try {
			const { rerender } = render(<SettingsSearch index={INDEX} onNavigate={vi.fn()} sections={SECTIONS} />)

			const input = screen.getByTestId("settings-search-input")
			fireEvent.focus(input)
			fireEvent.change(input, { target: { value: "api" } })
			await waitFor(() => {
				expect(screen.getByRole("option")).toBeInTheDocument()
			})

			// Pump fresh index/sections references (identical logical content).
			// The results array reference is recreated on every search re-run,
			// but the render-phase guard compares a stable settingId key.
			for (let i = 0; i < 20; i++) {
				act(() => {
					rerender(<SettingsSearch index={[...INDEX]} onNavigate={vi.fn()} sections={[...SECTIONS]} />)
				})
			}

			expect(
				errorSpy.mock.calls.some(
					([message]) =>
						typeof message === "string" &&
						(message.includes("Too many re-renders") || message.includes("Maximum update depth exceeded")),
				),
			).toBe(false)

			// Results and highlight survive the churn.
			expect(screen.getByRole("option", { name: /API Key/i })).toHaveAttribute("aria-selected", "true")
		} finally {
			errorSpy.mockRestore()
		}
	})
})
