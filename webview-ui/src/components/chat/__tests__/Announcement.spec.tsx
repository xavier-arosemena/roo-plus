import React from "react"

import { render, screen } from "@/utils/test-utils"
import { EXTERNAL_LINKS } from "@/constants/externalLinks"

import Announcement from "../Announcement"

vi.mock("@src/utils/vscode", () => ({
	vscode: {
		postMessage: vi.fn(),
	},
}))

vi.mock("@roo/package", () => ({
	Package: {
		version: "3.77.4",
	},
}))

vi.mock("@vscode/webview-ui-toolkit/react", () => ({
	VSCodeLink: ({ children, href, onClick, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
		<a href={href} onClick={onClick} {...props}>
			{children}
		</a>
	),
}))

vi.mock("react-i18next", () => ({
	Trans: ({ i18nKey, components }: { i18nKey: string; components?: Record<string, React.ReactElement> }) => {
		if (i18nKey === "chat:announcement.support" && components?.githubLink) {
			return React.cloneElement(components.githubLink, undefined, "GitHub")
		}

		return <span>{i18nKey}</span>
	},
}))

vi.mock("@src/i18n/TranslationContext", () => ({
	useAppTranslation: () => ({
		t: (key: string, options?: { version?: string }) => {
			const translations: Record<string, string> = {
				"chat:announcement.release.heading": "What's New:",
				"chat:announcement.release.highlight1":
					"Cloud services removed, and stability fixed. The extension no longer waits on the retired cloud backend, so startup and remote connections are faster and more reliable.",
				"chat:announcement.release.highlight2":
					"Semble and code-index made reliable. Codebase search is checksum-verified and resilient — no more stalled searches or a broken context-window bar.",
				"chat:announcement.release.highlight3":
					"Custom modes upgraded. Every mode now shows a description, and you can install multiple marketplace modes in bulk.",
			}

			if (key === "chat:announcement.title") {
				return `Roo+ ${options?.version ?? ""} Released`
			}

			return translations[key] ?? key
		},
	}),
}))

describe("Announcement", () => {
	it("renders the announcement title and highlights", () => {
		render(<Announcement hideAnnouncement={vi.fn()} />)

		expect(screen.getByText("Roo+ 3.77.4 Released")).toBeInTheDocument()
		expect(
			screen.getByText(
				"Cloud services removed, and stability fixed. The extension no longer waits on the retired cloud backend, so startup and remote connections are faster and more reliable.",
			),
		).toBeInTheDocument()
		expect(
			screen.getByText(
				"Semble and code-index made reliable. Codebase search is checksum-verified and resilient — no more stalled searches or a broken context-window bar.",
			),
		).toBeInTheDocument()
		expect(
			screen.getByText(
				"Custom modes upgraded. Every mode now shows a description, and you can install multiple marketplace modes in bulk.",
			),
		).toBeInTheDocument()
	})

	it("renders exactly three release highlight bullets", () => {
		render(<Announcement hideAnnouncement={vi.fn()} />)

		expect(screen.getAllByRole("listitem")).toHaveLength(3)
	})

	it("links support users to the Roo+ GitHub repository", () => {
		render(<Announcement hideAnnouncement={vi.fn()} />)

		// The announcement renders a GitHub link both in the social-link row and
		// in the support/Trans footer — every one must point at the repo.
		const githubLinks = screen.getAllByRole("link", { name: "GitHub" })
		expect(githubLinks.length).toBeGreaterThan(0)
		for (const link of githubLinks) {
			expect(link).toHaveAttribute("href", EXTERNAL_LINKS.GITHUB_REPO)
		}
	})
})
