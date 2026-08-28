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
// exercise both the generated-highlights path and the i18n fallback path. The
// data is LINE-KEYED: it lives at the line base "3.77.0" while Package.version
// is the patch "3.77.4", so the resolver (getAnnouncementForVersion) must map
// the patch to the line base — exactly the pre-release popup regression from
// the old derived-version scheme.
vi.mock("@roo/announcements", () => {
	const announcements: Record<string, { version: string; highlights: string[] }> = {
		"3.77.0": {
			version: "3.77.0",
			highlights: ["Generated highlight one", "Generated highlight two", "Generated highlight three"],
		},
	}

	const resolveLineVersion = (version: string): string | undefined => {
		const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version)
		if (!match) {
			return undefined
		}
		return `${match[1]}.${match[2]}.0`
	}

	const getAnnouncementForVersion = (version: string) => {
		const exact = announcements[version]
		if (exact !== undefined) {
			return exact
		}
		const lineBase = resolveLineVersion(version)
		if (lineBase === undefined) {
			return undefined
		}
		return announcements[lineBase]
	}

	return {
		Announcements: announcements,
		getAnnouncementForVersion,
		hasAnnouncementForVersion: (version: string) => {
			const entry = getAnnouncementForVersion(version)
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
			return (
				<>
					{React.cloneElement(components.githubLink, undefined, "GitHub")}
					{React.cloneElement(components.marketplaceLink, undefined, "Visual Studio")}
					{React.cloneElement(components.openVsxLink, undefined, "Open VSX Registry")}
				</>
			)
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
		// Reset the data source to the default "data present" state, keyed at the
		// line base (Package.version is the patch 3.77.4 and resolves to it).
		Announcements["3.77.0"] = { version: "3.77.0", highlights: [...GENERATED_HIGHLIGHTS] }
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

	it("resolves a pre-release patch version to its line base and renders the generated highlights", () => {
		// Package.version is the patch "3.77.4" while the data source is keyed
		// ONLY at the line base "3.77.0". The component must resolve the patch to
		// the line base via getAnnouncementForVersion and render the generated
		// highlights — NOT the i18n fallback. This is the pre-release "What's New"
		// popup regression: the old build-time derived version had no announcement
		// entry, so the popup fell back to i18n (or, before line-resolution,
		// never fired at all).
		render(<Announcement hideAnnouncement={vi.fn()} />)

		for (const highlight of GENERATED_HIGHLIGHTS) {
			expect(screen.getByText(highlight)).toBeInTheDocument()
		}
		expect(screen.queryByText(I18N_HIGHLIGHTS[0])).not.toBeInTheDocument()
	})

	it("falls back to the translated i18n highlights when the line has no generated data", () => {
		// Simulate a minor line without generated announcement data (e.g. a
		// preview build whose line base is absent from the data source). With the
		// line key removed, the resolved line base 3.77.0 has no content and the
		// component falls back to the translated i18n highlights.
		delete Announcements["3.77.0"]

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

	it("links support users to the VS Code Marketplace", () => {
		render(<Announcement hideAnnouncement={vi.fn()} />)

		// The support footer renders a "Visual Studio" link that must point at
		// the VS Code Marketplace (the social-link row uses a separate
		// "VS Code Marketplace" accessible name, so this targets the footer link).
		const marketplaceLinks = screen.getAllByRole("link", { name: "Visual Studio" })
		expect(marketplaceLinks.length).toBeGreaterThan(0)
		for (const link of marketplaceLinks) {
			expect(link).toHaveAttribute("href", EXTERNAL_LINKS.MARKETPLACE)
		}
	})
})
