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

// Mutable data source mirroring src/shared/announcements.ts so tests can
// exercise both the generated-highlights path and the i18n fallback path.
vi.mock("@roo/announcements", () => {
	const announcements: Record<string, { version: string; highlights: string[] }> = {
		"3.77.4": {
			version: "3.77.4",
			highlights: ["Generated highlight one", "Generated highlight two", "Generated highlight three"],
		},
	}

	return {
		Announcements: announcements,
		hasAnnouncementForVersion: (version: string) => {
			const entry = announcements[version]
			return entry !== undefined && entry.highlights.length > 0
		},
	}
})

import { Announcements } from "@roo/announcements"

const GENERATED_HIGHLIGHTS = ["Generated highlight one", "Generated highlight two", "Generated highlight three"]

const I18N_HIGHLIGHTS = [
	"Cloud services removed, and stability fixed. The extension no longer waits on the retired cloud backend, so startup and remote connections are faster and more reliable.",
	"Semble and code-index made reliable. Codebase search is checksum-verified and resilient — no more stalled searches or a broken context-window bar.",
	"Custom modes upgraded. Every mode now shows a description, and you can install multiple marketplace modes in bulk.",
]

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
				"chat:announcement.release.highlight1": I18N_HIGHLIGHTS[0],
				"chat:announcement.release.highlight2": I18N_HIGHLIGHTS[1],
				"chat:announcement.release.highlight3": I18N_HIGHLIGHTS[2],
			}

			if (key === "chat:announcement.title") {
				return `Roo+ ${options?.version ?? ""} Released`
			}

			return translations[key] ?? key
		},
	}),
}))

describe("Announcement", () => {
	beforeEach(() => {
		// Reset the data source to the default "data present" state.
		Announcements["3.77.4"] = { version: "3.77.4", highlights: [...GENERATED_HIGHLIGHTS] }
	})

	it("renders the announcement title with the current version", () => {
		render(<Announcement hideAnnouncement={vi.fn()} />)

		expect(screen.getByText("Roo+ 3.77.4 Released")).toBeInTheDocument()
	})

	it("renders the changelog-derived highlights when data exists for the current version", () => {
		render(<Announcement hideAnnouncement={vi.fn()} />)

		for (const highlight of GENERATED_HIGHLIGHTS) {
			expect(screen.getByText(highlight)).toBeInTheDocument()
		}
		// The i18n fallback highlights must NOT render when generated data exists.
		expect(screen.queryByText(I18N_HIGHLIGHTS[0])).not.toBeInTheDocument()
	})

	it("renders exactly the generated number of highlight bullets", () => {
		render(<Announcement hideAnnouncement={vi.fn()} />)

		expect(screen.getAllByRole("listitem")).toHaveLength(GENERATED_HIGHLIGHTS.length)
	})

	it("falls back to the translated i18n highlights when no generated data exists for the current version", () => {
		// Simulate a version without generated announcement data (e.g. a
		// pre-release/preview build whose version is absent from the data source).
		delete Announcements["3.77.4"]

		render(<Announcement hideAnnouncement={vi.fn()} />)

		for (const highlight of I18N_HIGHLIGHTS) {
			expect(screen.getByText(highlight)).toBeInTheDocument()
		}
		expect(screen.getAllByRole("listitem")).toHaveLength(3)
		expect(screen.queryByText(GENERATED_HIGHLIGHTS[0])).not.toBeInTheDocument()
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
