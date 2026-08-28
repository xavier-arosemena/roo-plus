import type { MouseEvent } from "react"
import { VSCodeLink } from "@vscode/webview-ui-toolkit/react"
import { Bug, MessagesSquare, Star, Store } from "lucide-react"
import { Trans, useTranslation } from "react-i18next"

import { EXTERNAL_LINKS } from "@src/constants/externalLinks"
import { vscode } from "@src/utils/vscode"

const openExternal = (url: string) => (event: MouseEvent) => {
	event.preventDefault()
	vscode.postMessage({ type: "openExternal", url })
}

const supportLinks = [
	{
		icon: <Bug className="size-4 shrink-0" aria-hidden />,
		labelKey: "support.reportIssue",
		href: EXTERNAL_LINKS.GITHUB_ISSUES_CHOOSER,
	},
	{
		icon: <MessagesSquare className="size-4 shrink-0" aria-hidden />,
		labelKey: "support.discussions",
		href: EXTERNAL_LINKS.GITHUB_DISCUSSIONS,
	},
	{
		icon: <Star className="size-4 shrink-0" aria-hidden />,
		labelKey: "support.starUs",
		href: EXTERNAL_LINKS.GITHUB_REPO,
	},
	{
		icon: <Store className="size-4 shrink-0" aria-hidden />,
		labelKey: "support.reviewUsOpenVsx",
		href: EXTERNAL_LINKS.OPEN_VSX_REGISTRY,
	},
	{
		icon: <Store className="size-4 shrink-0" aria-hidden />,
		labelKey: "support.reviewUsMarketplace",
		href: EXTERNAL_LINKS.MARKETPLACE_REVIEW,
	},
]

const RooTips = () => {
	const { t } = useTranslation("chat")

	return (
		<div className="flex flex-col gap-2 mb-4 max-w-[500px] text-vscode-descriptionForeground">
			<p className="my-0 pr-2">
				<Trans i18nKey="chat:about" components={{ br: <br /> }} />
			</p>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
				{supportLinks.map((link) => (
					<VSCodeLink
						key={link.labelKey}
						href={link.href}
						className="text-muted-foreground underline"
						onClick={openExternal(link.href)}>
						<span className="inline-flex items-center gap-1.5 whitespace-nowrap">
							{link.icon}
							<span>{t(link.labelKey)}</span>
						</span>
					</VSCodeLink>
				))}
			</div>
		</div>
	)
}

export default RooTips
