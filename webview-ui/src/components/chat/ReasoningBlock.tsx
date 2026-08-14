import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useExtensionState } from "@src/context/ExtensionStateContext"

import MarkdownBlock from "../common/MarkdownBlock"
import { Lightbulb, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface ReasoningBlockProps {
	content: string
	ts: number
	isStreaming: boolean
	isLast: boolean
	metadata?: any
}

export const ReasoningBlock = ({ content, isStreaming, isLast }: ReasoningBlockProps) => {
	const { t } = useTranslation()
	const { reasoningBlockCollapsed } = useExtensionState()

	const [isCollapsed, setIsCollapsed] = useState(reasoningBlockCollapsed)

	const startTimeRef = useRef<number | null>(null)
	const [elapsed, setElapsed] = useState<number>(0)
	const contentRef = useRef<HTMLDivElement>(null)

	// Sync collapse state from the global setting during render (React's
	// recommended "adjust state during render" pattern).
	const [prevCollapsedSetting, setPrevCollapsedSetting] = useState(reasoningBlockCollapsed)
	if (reasoningBlockCollapsed !== prevCollapsedSetting) {
		setPrevCollapsedSetting(reasoningBlockCollapsed)
		setIsCollapsed(reasoningBlockCollapsed)
	}

	useEffect(() => {
		if (isLast && isStreaming) {
			// Capture the start time in the effect (not during render, which
			// would be an impure Date.now() call).
			startTimeRef.current = startTimeRef.current ?? Date.now()
			const tick = () => setElapsed(Date.now() - (startTimeRef.current ?? 0))
			tick()
			const id = setInterval(tick, 1000)
			return () => clearInterval(id)
		}
	}, [isLast, isStreaming])

	const seconds = Math.floor(elapsed / 1000)
	const secondsLabel = t("chat:reasoning.seconds", { count: seconds })

	const handleToggle = () => {
		setIsCollapsed(!isCollapsed)
	}

	return (
		<div className="group">
			<div
				className="flex items-center justify-between mb-2.5 pr-2 cursor-pointer select-none"
				onClick={handleToggle}>
				<div className="flex items-center gap-2">
					<Lightbulb className="w-4" />
					<span className="font-bold text-vscode-foreground">{t("chat:reasoning.thinking")}</span>
					{elapsed > 0 && (
						<span className="text-sm text-vscode-descriptionForeground mt-0.5">{secondsLabel}</span>
					)}
				</div>
				<div className="flex items-center gap-2">
					<ChevronUp
						className={cn(
							"w-4 transition-all opacity-0 group-hover:opacity-100",
							isCollapsed && "-rotate-180",
						)}
					/>
				</div>
			</div>
			{(content?.trim()?.length ?? 0) > 0 && !isCollapsed && (
				<div
					ref={contentRef}
					className="border-l border-vscode-descriptionForeground/20 ml-2 pl-4 pb-1 text-vscode-descriptionForeground break-words">
					<MarkdownBlock markdown={content} />
				</div>
			)}
		</div>
	)
}
