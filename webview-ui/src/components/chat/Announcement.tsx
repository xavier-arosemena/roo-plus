import { memo, type ReactNode, useState } from "react"
import { Trans } from "react-i18next"
import { FaStar } from "react-icons/fa"
import { SiGithub } from "react-icons/si"
import { GoLinkExternal, GoPackage } from "react-icons/go"
import { VSCodeLink } from "@vscode/webview-ui-toolkit/react"

import { Package } from "@roo/package"
import { getAnnouncementForVersion } from "@roo/announcements"
import { useAppTranslation } from "@src/i18n/TranslationContext"
import { vscode } from "@src/utils/vscode"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@src/components/ui"
import { EXTERNAL_LINKS } from "@src/constants/externalLinks"

interface AnnouncementProps {
	hideAnnouncement: () => void
}

/**
 * LINE-KEYED announcement content (iterate-then-stabilize release policy).
 *
 * The popup trigger is version-derived (`ClineProvider.latestAnnouncementId`
 * returns the RESOLVED line base `v<major>.<minor>.0`, arming once per minor)
 * and the content is changelog-derived (`@roo/announcements`). Announcements
 * are keyed once per MINOR LINE at the line base `<major>.<minor>.0`; ANY patch
 * on the minor (pre-release patches like 3.86.19 or the stable patch like
 * 3.88.3) resolves to the line base's highlights at runtime via
 * `getAnnouncementForVersion`, so a version bump needs NO manual announcement
 * edits for the English release channel.
 *
 * Localisation: the per-line highlights are auto-generated from the English
 * changelog (src/CHANGELOG.md → src/shared/announcements.ts) and act as the
 * CANONICAL source, but each bullet resolves through i18n first
 * (`chat:announcement.release.lines.<line>.hN`) so a translated line renders in
 * the user's language. `defaultValue` keeps the English bullet as a per-entry
 * fallback, so a locale only translates the bullets it actually has. The
 * `highlight1..3` keys remain the fallback when no generated data exists.
 *
 * The MARKETING slot (`chat:announcement.marketing`) sits ABOVE the "What's
 * New" heading, is translatable, and may embed links. It is intentionally not
 * a changelog bullet: rewriting marketing copy must not require a release, and
 * it must not consume a highlight slot or leak into the GitHub release notes.
 */

const Announcement = ({ hideAnnouncement }: AnnouncementProps) => {
	const { t, i18n } = useAppTranslation()
	const [open, setOpen] = useState(true)

	// Per-line highlights resolved from Package.version to its line base
	// <major>.<minor>.0. The generated list is the canonical source; each entry is
	// translated when the locale provides it, with the English bullet as the
	// per-entry fallback. Falls back to the highlight1..3 keys when the current
	// line has no generated data at all.
	const announcement = getAnnouncementForVersion(Package.version)
	// i18next uses "." as its key separator, so the dotted version cannot be used
	// as a literal key segment.
	const lineKey = announcement?.version.replace(/\./g, "_")
	const generatedHighlights = announcement?.highlights.map((english, index) => {
		const key = `chat:announcement.release.lines.${lineKey}.h${index + 1}`
		// Only swap in a locale string when the key really exists. A missing
		// translation must fall back to the English canonical bullet — never to
		// the raw key id, which is what `t()` returns before i18n finishes
		// loading (the popup can paint on the first state message).
		return i18n?.exists?.(key) ? t(key) : english
	})

	return (
		<Dialog
			open={open}
			onOpenChange={(open) => {
				setOpen(open)

				if (!open) {
					hideAnnouncement()
				}
			}}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t("chat:announcement.title", { version: Package.version })}</DialogTitle>
				</DialogHeader>
				<div>
					<div className="mb-4">
						{/* Standing marketing slot — translatable, may embed links. */}
						<p className="mb-3">
							<Trans
								i18nKey="chat:announcement.marketing"
								components={{
									star: <FaStar className="inline-block w-3.5 h-3.5 align-text-bottom" aria-hidden />,
									githubLink: <GitHubLink />,
								}}
							/>
						</p>
						<p className="mb-3">{t("chat:announcement.release.heading")}</p>
						<ul className="list-disc list-inside text-sm space-y-1.5">
							{generatedHighlights?.length ? (
								generatedHighlights.map((highlight) => <li key={highlight}>{highlight}</li>)
							) : (
								<>
									<li>{t("chat:announcement.release.highlight1")}</li>
									<li>{t("chat:announcement.release.highlight2")}</li>
									<li>{t("chat:announcement.release.highlight3")}</li>
								</>
							)}
						</ul>
					</div>

					<div className="mt-4 text-sm text-center text-vscode-descriptionForeground">
						<div className="flex items-center justify-center gap-4">
							<SocialLink
								icon={<SiGithub className="w-4 h-4" aria-hidden />}
								label="GitHub"
								href={EXTERNAL_LINKS.GITHUB_REPO}
							/>
							<SocialLink
								icon={<GoLinkExternal className="w-4 h-4" aria-hidden />}
								label="Open VSX Registry"
								href={EXTERNAL_LINKS.OPEN_VSX_REGISTRY}
							/>
							<SocialLink
								icon={<GoPackage className="w-4 h-4" aria-hidden />}
								label="VS Code Marketplace"
								href={EXTERNAL_LINKS.MARKETPLACE}
							/>
						</div>
					</div>

					<div className="mt-3 text-sm text-center text-vscode-descriptionForeground">
						<Trans
							i18nKey="chat:announcement.support"
							components={{
								githubLink: <GitHubLink />,
								marketplaceLink: <MarketplaceLink />,
								openVsxLink: <OpenVSXLink />,
							}}
						/>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}

const SocialLink = ({ icon, label, href }: { icon: ReactNode; label: string; href: string }) => (
	<VSCodeLink
		href={href}
		className="inline-flex items-center gap-1"
		onClick={(e) => {
			e.preventDefault()
			vscode.postMessage({ type: "openExternal", url: href })
		}}>
		{icon}
		<span className="sr-only">{label}</span>
	</VSCodeLink>
)

const GitHubLink = ({ children }: { children?: ReactNode }) => (
	<VSCodeLink
		href={EXTERNAL_LINKS.GITHUB_REPO}
		onClick={(e) => {
			e.preventDefault()
			vscode.postMessage({ type: "openExternal", url: EXTERNAL_LINKS.GITHUB_REPO })
		}}>
		{children}
	</VSCodeLink>
)

const OpenVSXLink = ({ children }: { children?: ReactNode }) => (
	<VSCodeLink
		href={EXTERNAL_LINKS.OPEN_VSX_REGISTRY}
		onClick={(e) => {
			e.preventDefault()
			vscode.postMessage({ type: "openExternal", url: EXTERNAL_LINKS.OPEN_VSX_REGISTRY })
		}}>
		{children}
	</VSCodeLink>
)

const MarketplaceLink = ({ children }: { children?: ReactNode }) => (
	<VSCodeLink
		href={EXTERNAL_LINKS.MARKETPLACE}
		onClick={(e) => {
			e.preventDefault()
			vscode.postMessage({ type: "openExternal", url: EXTERNAL_LINKS.MARKETPLACE })
		}}>
		{children}
	</VSCodeLink>
)

export default memo(Announcement)
