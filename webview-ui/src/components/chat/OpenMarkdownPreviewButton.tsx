import React, { memo } from "react"
import { useTranslation } from "react-i18next"
import { SquareArrowOutUpRight } from "lucide-react"

import { vscode } from "@src/utils/vscode"
import { hasComplexMarkdown } from "@src/utils/markdown"
import { StandardTooltip } from "@src/components/ui"

interface OpenMarkdownPreviewButtonProps {
	markdown: string | undefined
	className?: string
}

export const OpenMarkdownPreviewButton = memo(({ markdown, className }: OpenMarkdownPreviewButtonProps) => {
	const { t } = useTranslation("chat")

	if (!hasComplexMarkdown(markdown)) {
		return null
	}

	const handleClick = (e: React.MouseEvent) => {
		e.stopPropagation()
		if (markdown) {
			vscode.postMessage({
				type: "openMarkdownPreview",
				text: markdown,
			})
		}
	}

	return (
		<StandardTooltip content={t("openMarkdownPreviewButton.label")}>
			<button
				onClick={handleClick}
				className={`opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ${className ?? ""}`}
				aria-label={t("openMarkdownPreviewButton.label")}>
				<SquareArrowOutUpRight className="w-4 h-4" />
			</button>
		</StandardTooltip>
	)
})
