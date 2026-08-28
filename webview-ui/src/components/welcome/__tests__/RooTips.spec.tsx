import React from "react"
import { fireEvent, render, screen } from "@/utils/test-utils"

import { EXTERNAL_LINKS } from "@src/constants/externalLinks"
import { vscode } from "@src/utils/vscode"
import RooTips from "../RooTips"

vi.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (key: string) => {
			const labels: Record<string, string> = {
				"support.reportIssue": "Report an issue",
				"support.discussions": "Join discussions",
				"support.starUs": "Star us on GitHub",
				"support.reviewUsOpenVsx": "Review us on Open VSX",
				"support.reviewUsMarketplace": "Review us on VS Code Marketplace",
			}
			return labels[key] ?? key
		},
	}),
	// The welcome screen's intro line renders via <Trans> with a <br/>.
	Trans: ({ i18nKey }: { i18nKey: string }) => <>{i18nKey}</>,
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
		// Three support links + the two split review links.
		expect(screen.getAllByRole("link")).toHaveLength(5)

		expect(screen.getByRole("link", { name: "Report an issue" }).getAttribute("href")).toBe(
			EXTERNAL_LINKS.GITHUB_ISSUES_CHOOSER,
		)
		expect(screen.getByRole("link", { name: "Join discussions" }).getAttribute("href")).toBe(
			EXTERNAL_LINKS.GITHUB_DISCUSSIONS,
		)
		expect(screen.getByRole("link", { name: "Star us on GitHub" }).getAttribute("href")).toBe(
			EXTERNAL_LINKS.GITHUB_REPO,
		)
		expect(screen.getByRole("link", { name: "Review us on VS Code Marketplace" }).getAttribute("href")).toBe(
			EXTERNAL_LINKS.MARKETPLACE_REVIEW,
		)
		expect(screen.getByRole("link", { name: "Review us on Open VSX" }).getAttribute("href")).toBe(
			EXTERNAL_LINKS.OPEN_VSX_REGISTRY,
		)
	})

	it("posts an openExternal message when a link is clicked", () => {
		render(<RooTips />)
		fireEvent.click(screen.getByRole("link", { name: "Report an issue" }))
		expect(vscode.postMessage).toHaveBeenCalledWith({
			type: "openExternal",
			url: EXTERNAL_LINKS.GITHUB_ISSUES_CHOOSER,
		})
	})
})
