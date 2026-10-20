import React from "react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { TooltipProvider } from "@radix-ui/react-tooltip"

import { OpenMarkdownPreviewButton } from "../OpenMarkdownPreviewButton"

const { postMessageMock } = vi.hoisted(() => ({
	postMessageMock: vi.fn(),
}))

vi.mock("@src/utils/vscode", () => ({
	vscode: {
		postMessage: postMessageMock,
	},
}))

// The component translates its aria-label/tooltip; return the key so the
// assertions stay independent of the locale resources.
vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
	initReactI18next: { type: "3rdParty", init: () => {} },
}))

const LABEL = "openMarkdownPreviewButton.label"

describe("OpenMarkdownPreviewButton", () => {
	const complex = "# One\n## Two"
	const simple = "Just text"

	beforeEach(() => {
		postMessageMock.mockClear()
	})

	it("does not render when markdown has fewer than 2 headings", () => {
		render(
			<TooltipProvider>
				<OpenMarkdownPreviewButton markdown={simple} />
			</TooltipProvider>,
		)
		expect(screen.queryByLabelText(LABEL)).toBeNull()
	})

	it("renders when markdown has 2+ headings", () => {
		render(
			<TooltipProvider>
				<OpenMarkdownPreviewButton markdown={complex} />
			</TooltipProvider>,
		)
		expect(screen.getByLabelText(LABEL)).toBeInTheDocument()
	})

	it("posts message on click", () => {
		render(
			<TooltipProvider>
				<OpenMarkdownPreviewButton markdown={complex} />
			</TooltipProvider>,
		)
		fireEvent.click(screen.getByLabelText(LABEL))
		expect(postMessageMock).toHaveBeenCalledWith({ type: "openMarkdownPreview", text: complex })
	})
})
