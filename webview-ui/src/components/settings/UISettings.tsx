import { HTMLAttributes, useMemo } from "react"
import { useAppTranslation } from "@/i18n/TranslationContext"
import { VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react"
import {
	DEFAULT_AUTO_CLOSE_ROO_OPENED_FILES,
	DEFAULT_AUTO_CLOSE_ROO_OPENED_FILES_AFTER_USER_EDITED,
	DEFAULT_AUTO_CLOSE_ROO_OPENED_NEW_FILES,
} from "@roo-code/types"

import { SetCachedStateField } from "./types"
import { SectionHeader } from "./SectionHeader"
import { Section } from "./Section"
import { SearchableSetting } from "./SearchableSetting"
import { Slider, Button } from "../ui"
import { ExtensionStateContextType } from "@/context/ExtensionStateContext"

export const CHAT_FONT_SIZE_MIN = 8
export const CHAT_FONT_SIZE_MAX = 32
export const CHAT_FONT_SIZE_DEFAULT = 13

interface UISettingsProps extends HTMLAttributes<HTMLDivElement> {
	reasoningBlockCollapsed: boolean
	enterBehavior: "send" | "newline"
	chatFontSize?: number
	autoCloseRooOpenedFiles?: boolean
	autoCloseRooOpenedFilesAfterUserEdited?: boolean
	autoCloseRooOpenedNewFiles?: boolean
	setCachedStateField: SetCachedStateField<keyof ExtensionStateContextType>
}

export const UISettings = ({
	reasoningBlockCollapsed,
	enterBehavior,
	chatFontSize,
	autoCloseRooOpenedFiles,
	autoCloseRooOpenedFilesAfterUserEdited,
	autoCloseRooOpenedNewFiles,
	setCachedStateField,
	...props
}: UISettingsProps) => {
	const { t } = useAppTranslation()

	// Detect platform for dynamic modifier key display
	const primaryMod = useMemo(() => {
		const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0
		return isMac ? "⌘" : "Ctrl"
	}, [])

	const handleReasoningBlockCollapsedChange = (value: boolean) => {
		setCachedStateField("reasoningBlockCollapsed", value)
	}

	const handleEnterBehaviorChange = (requireCtrlEnter: boolean) => {
		const newBehavior = requireCtrlEnter ? "newline" : "send"
		setCachedStateField("enterBehavior", newBehavior)
	}

	const handleChatFontSizeChange = (value: number) => {
		setCachedStateField("chatFontSize", value)
	}

	const handleChatFontSizeReset = () => {
		setCachedStateField("chatFontSize", undefined)
	}

	return (
		<div {...props}>
			<SectionHeader>{t("settings:sections.ui")}</SectionHeader>

			<Section>
				<div className="space-y-6">
					{/* Collapse Thinking Messages Setting */}
					<SearchableSetting
						settingId="ui-collapse-thinking"
						section="ui"
						label={t("settings:ui.collapseThinking.label")}>
						<div className="flex flex-col gap-1">
							<VSCodeCheckbox
								checked={reasoningBlockCollapsed}
								onChange={(e: any) => handleReasoningBlockCollapsedChange(e.target.checked)}
								data-testid="collapse-thinking-checkbox">
								<span className="font-medium">{t("settings:ui.collapseThinking.label")}</span>
							</VSCodeCheckbox>
							<div className="text-vscode-descriptionForeground text-sm ml-5 mt-1">
								{t("settings:ui.collapseThinking.description")}
							</div>
						</div>
					</SearchableSetting>

					{/* Enter Key Behavior Setting */}
					<SearchableSetting
						settingId="ui-enter-behavior"
						section="ui"
						label={t("settings:ui.requireCtrlEnterToSend.label", { primaryMod })}>
						<div className="flex flex-col gap-1">
							<VSCodeCheckbox
								checked={enterBehavior === "newline"}
								onChange={(e: any) => handleEnterBehaviorChange(e.target.checked)}
								data-testid="enter-behavior-checkbox">
								<span className="font-medium">
									{t("settings:ui.requireCtrlEnterToSend.label", { primaryMod })}
								</span>
							</VSCodeCheckbox>
							<div className="text-vscode-descriptionForeground text-sm ml-5 mt-1">
								{t("settings:ui.requireCtrlEnterToSend.description", { primaryMod })}
							</div>
						</div>
					</SearchableSetting>

					{/* Chat Font Size Setting */}
					<SearchableSetting
						settingId="ui-chat-font-size"
						section="ui"
						label={t("settings:ui.chatFontSize.label")}>
						<div className="flex flex-col gap-1">
							<label className="block font-medium mb-1">{t("settings:ui.chatFontSize.label")}</label>
							<div className="flex items-center gap-2">
								<Slider
									min={CHAT_FONT_SIZE_MIN}
									max={CHAT_FONT_SIZE_MAX}
									step={1}
									value={[chatFontSize ?? CHAT_FONT_SIZE_DEFAULT]}
									onValueChange={([value]) => handleChatFontSizeChange(value)}
									data-testid="chat-font-size-slider"
								/>
								<span className="w-12 text-right">{chatFontSize ?? CHAT_FONT_SIZE_DEFAULT}px</span>
								<Button
									variant="secondary"
									size="sm"
									disabled={chatFontSize === undefined}
									onClick={handleChatFontSizeReset}
									data-testid="chat-font-size-reset">
									{t("settings:ui.chatFontSize.reset")}
								</Button>
							</div>
							<div className="text-vscode-descriptionForeground text-sm mt-1">
								{t("settings:ui.chatFontSize.description")}
							</div>
						</div>
					</SearchableSetting>

					{/* Auto-close Roo opened files */}
					<SearchableSetting
						settingId="ui-auto-close-roo-opened-files"
						section="ui"
						label={t("settings:ui.autoCloseRooOpenedFiles.label")}>
						<div className="flex flex-col gap-1">
							<VSCodeCheckbox
								checked={autoCloseRooOpenedFiles ?? DEFAULT_AUTO_CLOSE_ROO_OPENED_FILES}
								onChange={(e: any) => setCachedStateField("autoCloseRooOpenedFiles", e.target.checked)}
								data-testid="auto-close-roo-opened-files-checkbox">
								<span className="font-medium">{t("settings:ui.autoCloseRooOpenedFiles.label")}</span>
							</VSCodeCheckbox>
							<div className="text-vscode-descriptionForeground text-sm ml-5 mt-1">
								{t("settings:ui.autoCloseRooOpenedFiles.description")}
							</div>
						</div>
					</SearchableSetting>

					{/* Auto-close Roo opened files after user interaction */}
					<SearchableSetting
						settingId="ui-auto-close-roo-opened-files-after-user-edited"
						section="ui"
						label={t("settings:ui.autoCloseRooOpenedFilesAfterUserEdited.label")}>
						<div className="flex flex-col gap-1">
							<VSCodeCheckbox
								checked={
									autoCloseRooOpenedFilesAfterUserEdited ??
									DEFAULT_AUTO_CLOSE_ROO_OPENED_FILES_AFTER_USER_EDITED
								}
								onChange={(e: any) =>
									setCachedStateField("autoCloseRooOpenedFilesAfterUserEdited", e.target.checked)
								}
								data-testid="auto-close-roo-opened-files-after-user-edited-checkbox">
								<span className="font-medium">
									{t("settings:ui.autoCloseRooOpenedFilesAfterUserEdited.label")}
								</span>
							</VSCodeCheckbox>
							<div className="text-vscode-descriptionForeground text-sm ml-5 mt-1">
								{t("settings:ui.autoCloseRooOpenedFilesAfterUserEdited.description")}
							</div>
						</div>
					</SearchableSetting>

					{/* Auto-close Roo opened new files */}
					<SearchableSetting
						settingId="ui-auto-close-roo-opened-new-files"
						section="ui"
						label={t("settings:ui.autoCloseRooOpenedNewFiles.label")}>
						<div className="flex flex-col gap-1">
							<VSCodeCheckbox
								checked={autoCloseRooOpenedNewFiles ?? DEFAULT_AUTO_CLOSE_ROO_OPENED_NEW_FILES}
								onChange={(e: any) =>
									setCachedStateField("autoCloseRooOpenedNewFiles", e.target.checked)
								}
								data-testid="auto-close-roo-opened-new-files-checkbox">
								<span className="font-medium">{t("settings:ui.autoCloseRooOpenedNewFiles.label")}</span>
							</VSCodeCheckbox>
							<div className="text-vscode-descriptionForeground text-sm ml-5 mt-1">
								{t("settings:ui.autoCloseRooOpenedNewFiles.description")}
							</div>
						</div>
					</SearchableSetting>
				</div>
			</Section>
		</div>
	)
}
