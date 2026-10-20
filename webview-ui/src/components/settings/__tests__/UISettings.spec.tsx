import { render, fireEvent, waitFor } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { UISettings } from "../UISettings"

describe("UISettings", () => {
	const defaultProps = {
		reasoningBlockCollapsed: false,
		enterBehavior: "send" as const,
		setCachedStateField: vi.fn(),
	}

	it("renders the collapse thinking checkbox", () => {
		const { getByTestId } = render(<UISettings {...defaultProps} />)
		const checkbox = getByTestId("collapse-thinking-checkbox")
		expect(checkbox).toBeTruthy()
	})

	it("displays the correct initial state", () => {
		const { getByTestId } = render(<UISettings {...defaultProps} reasoningBlockCollapsed={true} />)
		const checkbox = getByTestId("collapse-thinking-checkbox") as HTMLInputElement
		expect(checkbox.checked).toBe(true)
	})

	it("calls setCachedStateField when checkbox is toggled", async () => {
		const setCachedStateField = vi.fn()
		const { getByTestId } = render(<UISettings {...defaultProps} setCachedStateField={setCachedStateField} />)

		const checkbox = getByTestId("collapse-thinking-checkbox")
		fireEvent.click(checkbox)

		await waitFor(() => {
			expect(setCachedStateField).toHaveBeenCalledWith("reasoningBlockCollapsed", true)
		})
	})

	it("updates checkbox state when prop changes", () => {
		const { getByTestId, rerender } = render(<UISettings {...defaultProps} reasoningBlockCollapsed={false} />)
		const checkbox = getByTestId("collapse-thinking-checkbox") as HTMLInputElement
		expect(checkbox.checked).toBe(false)

		rerender(<UISettings {...defaultProps} reasoningBlockCollapsed={true} />)
		expect(checkbox.checked).toBe(true)
	})

	describe("chat font size", () => {
		it("shows the default font size when unset (init)", () => {
			const { getByText, getByTestId } = render(<UISettings {...defaultProps} chatFontSize={undefined} />)
			expect(getByTestId("chat-font-size-slider")).toBeTruthy()
			// Default falls back to VS Code-equivalent default value.
			expect(getByText("13px")).toBeTruthy()
		})

		it("shows the configured font size when set", () => {
			const { getByText } = render(<UISettings {...defaultProps} chatFontSize={20} />)
			expect(getByText("20px")).toBeTruthy()
		})

		it("persists a user-edited font size via setCachedStateField", () => {
			const setCachedStateField = vi.fn()
			const { getByTestId } = render(
				<UISettings {...defaultProps} chatFontSize={14} setCachedStateField={setCachedStateField} />,
			)

			const slider = getByTestId("chat-font-size-slider").querySelector('[role="slider"]') as HTMLElement
			slider.focus()
			fireEvent.keyDown(slider, { key: "ArrowRight" })

			expect(setCachedStateField).toHaveBeenCalledWith("chatFontSize", 15)
		})

		it("disables reset when unset and clears the value on reset", () => {
			const setCachedStateField = vi.fn()
			const { getByTestId, rerender } = render(
				<UISettings {...defaultProps} chatFontSize={undefined} setCachedStateField={setCachedStateField} />,
			)

			const resetUnset = getByTestId("chat-font-size-reset") as HTMLButtonElement
			expect(resetUnset.disabled).toBe(true)

			rerender(<UISettings {...defaultProps} chatFontSize={18} setCachedStateField={setCachedStateField} />)
			const resetSet = getByTestId("chat-font-size-reset") as HTMLButtonElement
			expect(resetSet.disabled).toBe(false)

			fireEvent.click(resetSet)
			expect(setCachedStateField).toHaveBeenCalledWith("chatFontSize", undefined)
		})
	})

	describe("auto-close Roo-opened files checkboxes", () => {
		it("renders all three auto-close checkboxes", () => {
			const { getByTestId } = render(
				<UISettings
					{...defaultProps}
					autoCloseRooOpenedFiles={true}
					autoCloseRooOpenedFilesAfterUserEdited={false}
					autoCloseRooOpenedNewFiles={false}
				/>,
			)
			expect(getByTestId("auto-close-roo-opened-files-checkbox")).toBeTruthy()
			expect(getByTestId("auto-close-roo-opened-files-after-user-edited-checkbox")).toBeTruthy()
			expect(getByTestId("auto-close-roo-opened-new-files-checkbox")).toBeTruthy()
		})

		it("exposes the new data-setting-id values for search indexing", () => {
			const { container } = render(<UISettings {...defaultProps} />)

			for (const settingId of [
				"ui-auto-close-roo-opened-files",
				"ui-auto-close-roo-opened-files-after-user-edited",
				"ui-auto-close-roo-opened-new-files",
			]) {
				expect(container.querySelector(`[data-setting-id="${settingId}"]`)).toBeTruthy()
			}
		})

		it("autoCloseRooOpenedFiles checkbox reflects true prop", () => {
			const { getByTestId } = render(<UISettings {...defaultProps} autoCloseRooOpenedFiles={true} />)
			const checkbox = getByTestId("auto-close-roo-opened-files-checkbox") as HTMLInputElement
			expect(checkbox.checked).toBe(true)
		})

		it("autoCloseRooOpenedFiles checkbox reflects false prop", () => {
			const { getByTestId } = render(<UISettings {...defaultProps} autoCloseRooOpenedFiles={false} />)
			const checkbox = getByTestId("auto-close-roo-opened-files-checkbox") as HTMLInputElement
			expect(checkbox.checked).toBe(false)
		})

		it("autoCloseRooOpenedFiles checkbox defaults to unchecked when prop is unset", () => {
			// Omitting the prop simulates the opt-in default (false). A regression that
			// flips the fallback back to `?? true` would make this checkbox checked.
			const { getByTestId } = render(<UISettings {...defaultProps} />)
			const checkbox = getByTestId("auto-close-roo-opened-files-checkbox") as HTMLInputElement
			expect(checkbox.checked).toBe(false)
		})

		it("calls setCachedStateField with autoCloseRooOpenedFiles when toggled", async () => {
			const setCachedStateField = vi.fn()
			const { getByTestId } = render(
				<UISettings
					{...defaultProps}
					autoCloseRooOpenedFiles={true}
					setCachedStateField={setCachedStateField}
				/>,
			)
			const checkbox = getByTestId("auto-close-roo-opened-files-checkbox")
			fireEvent.click(checkbox)
			await waitFor(() => {
				expect(setCachedStateField).toHaveBeenCalledWith("autoCloseRooOpenedFiles", false)
			})
		})

		it("calls setCachedStateField with autoCloseRooOpenedFilesAfterUserEdited when toggled", async () => {
			const setCachedStateField = vi.fn()
			const { getByTestId } = render(
				<UISettings
					{...defaultProps}
					autoCloseRooOpenedFilesAfterUserEdited={false}
					setCachedStateField={setCachedStateField}
				/>,
			)
			const checkbox = getByTestId("auto-close-roo-opened-files-after-user-edited-checkbox")
			fireEvent.click(checkbox)
			await waitFor(() => {
				expect(setCachedStateField).toHaveBeenCalledWith("autoCloseRooOpenedFilesAfterUserEdited", true)
			})
		})

		it("calls setCachedStateField with autoCloseRooOpenedNewFiles when toggled", async () => {
			const setCachedStateField = vi.fn()
			const { getByTestId } = render(
				<UISettings
					{...defaultProps}
					autoCloseRooOpenedNewFiles={false}
					setCachedStateField={setCachedStateField}
				/>,
			)
			const checkbox = getByTestId("auto-close-roo-opened-new-files-checkbox")
			fireEvent.click(checkbox)
			await waitFor(() => {
				expect(setCachedStateField).toHaveBeenCalledWith("autoCloseRooOpenedNewFiles", true)
			})
		})
	})
})
