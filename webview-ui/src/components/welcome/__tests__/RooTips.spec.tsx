import React from "react"
import { fireEvent, render, screen } from "@/utils/test-utils"

import { EXTERNAL_LINKS } from "@src/constants/externalLinks"
import { vscode } from "@src/utils/vscode"
import RooTips from "../RooTips"

vi.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (key: string) => key, // Simple mock that returns the key
	}),
	// The welcome screen's review link renders via <Trans> with two inline
	// links; clone those components (with their link text) so the test can
	// assert both hrefs.
	Trans: ({ i18nKey, components }: { i18nKey: string; components?: Record<string, React.ReactElement> }) => {
		if (i18nKey === "chat:support.reviewUs" && components?.marketplaceLink) {
			return (
				<>
					{React.cloneElement(components.marketplaceLink, undefined, "VS Code Marketplace")}
					{React.cloneElement(components.openVsxLink, undefined, "Open VSX")}
				</>
			)
		}
		return <>{i18nKey}</>
	},
}))

vi.mock("@vscode/webview-ui-toolkit/react", () => ({
	VSCodeLink: ({
		href,
		children,
		onClick,
	}: {
		href: string
		children: React.ReactNode
		onClick?: (e: React.MouseEvent) => void
	}) => (
		<a href={href} onClick={onClick}>
			{children}
		</a>
	),
}))

vi.mock("@src/utils/vscode", () => ({
	vscode: {
		postMessage: vi.fn(),
	},
}))

describe("RooTips Component", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("renders the intro paragraph", () => {
		render(<RooTips />)
		expect(screen.getByText("chat:about")).toBeInTheDocument()
	})

	it("renders the community links with the correct hrefs and labels", () => {
		render(<RooTips />)
		// Three support links + the two links inside the combined review line.
		expect(screen.getAllByRole("link")).toHaveLength(5)

		expect(screen.getByRole("link", { name: "support.reportIssue" }).getAttribute("href")).toBe(
			EXTERNAL_LINKS.GITHUB_ISSUES_CHOOSER,
		)
		expect(screen.getByRole("link", { name: "support.discussions" }).getAttribute("href")).toBe(
			EXTERNAL_LINKS.GITHUB_DISCUSSIONS,
		)
		expect(screen.getByRole("link", { name: "support.starUs" }).getAttribute("href")).toBe(
			EXTERNAL_LINKS.GITHUB_REPO,
		)
		expect(screen.getByRole("link", { name: "VS Code Marketplace" }).getAttribute("href")).toBe(
			EXTERNAL_LINKS.MARKETPLACE_REVIEW,
		)
		expect(screen.getByRole("link", { name: "Open VSX" }).getAttribute("href")).toBe(
			EXTERNAL_LINKS.OPEN_VSX_REGISTRY,
		)
	})

	it("posts an openExternal message when a link is clicked", () => {
		render(<RooTips />)
		fireEvent.click(screen.getByRole("link", { name: "support.reportIssue" }))
		expect(vscode.postMessage).toHaveBeenCalledWith({
			type: "openExternal",
			url: EXTERNAL_LINKS.GITHUB_ISSUES_CHOOSER,
		})
	})
})
