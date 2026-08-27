import { memo, type ReactNode, useState } from "react"
import { Trans } from "react-i18next"
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
 * Localisation trade-off: the per-line highlights are auto-generated from the
 * English changelog (src/CHANGELOG.md → src/shared/announcements.ts) and are
 * therefore English-only. When the resolved line has generated highlights they
 * are shown to every locale. The translated
 * `chat:announcement.release.highlightN` keys are used only as a fallback when
 * no generated data exists for the current minor line.
 */

const Announcement = ({ hideAnnouncement }: AnnouncementProps) => {
	const { t } = useAppTranslation()
	const [open, setOpen] = useState(true)

	// Per-line highlights derived from the changelog (English-only), resolved
	// from Package.version to its line base <major>.<minor>.0; falls back to the
	// translated i18n highlights when the current minor line has no generated
	// data.
	const generatedHighlights = getAnnouncementForVersion(Package.version)?.highlights

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
								openVsxLink: <OpenVSXLink />,
								br: <br />,
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

export default memo(Announcement)
