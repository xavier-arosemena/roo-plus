import { z } from "zod"

import type { WebviewMessage } from "../vscode-extension-host.js"
import { checkpointDiffMessageSchema, checkpointRestoreMessageSchema } from "./checkpoint.js"
import {
	allowedCommandsMessageSchema,
	deniedCommandsMessageSchema,
	requestCommandsMessageSchema,
	openCommandFileMessageSchema,
	deleteCommandMessageSchema,
	createCommandMessageSchema,
} from "./commands.js"
import { updateSettingsMessageSchema } from "./settings.js"
import {
	autoApprovalEnabledMessageSchema,
	checkRulesDirectoryMessageSchema,
	customInstructionsMessageSchema,
	debugSettingMessageSchema,
	exportModeMessageSchema,
	exportSettingsMessageSchema,
	flushRouterModelsMessageSchema,
	getVSCodeSettingMessageSchema,
	hasOpenedModeSelectorMessageSchema,
	importModeMessageSchema,
	importSettingsMessageSchema,
	modeMessageSchema,
	openCustomModesSettingsMessageSchema,
	requestLmStudioModelsMessageSchema,
	requestOllamaModelsMessageSchema,
	requestOpenAiModelsMessageSchema,
	requestRooModelsMessageSchema,
	requestRouterModelsMessageSchema,
	requestVsCodeLmModelsMessageSchema,
	telemetrySettingMessageSchema,
	updatePromptMessageSchema,
	updateVSCodeSettingMessageSchema,
} from "./settingsExtra.js"
import { saveApiConfigurationMessageSchema, upsertApiConfigurationMessageSchema } from "./providerConfig.js"
import {
	fetchMarketplaceDataMessageSchema,
	filterMarketplaceItemsMessageSchema,
	installMarketplaceItemMessageSchema,
	installMarketplaceItemsMessageSchema,
	installMarketplaceItemWithParametersMessageSchema,
	removeInstalledMarketplaceItemMessageSchema,
	showMdmAuthRequiredNotificationMessageSchema,
} from "./marketplace.js"
import {
	queueMessageMessageSchema,
	removeQueuedMessageMessageSchema,
	editQueuedMessageMessageSchema,
} from "./messageQueue.js"
import {
	updateTodoListMessageSchema,
	updateCustomModeMessageSchema,
	deleteCustomModeMessageSchema,
} from "./customModes.js"
import {
	terminalOperationMessageSchema,
	requestTerminalProfilesMessageSchema,
	openTerminalProfilePickerMessageSchema,
} from "./terminal.js"
import {
	listWorktreesMessageSchema,
	createWorktreeMessageSchema,
	deleteWorktreeMessageSchema,
	switchWorktreeMessageSchema,
	getAvailableBranchesMessageSchema,
	getWorktreeDefaultsMessageSchema,
	getWorktreeIncludeStatusMessageSchema,
	checkBranchWorktreeIncludeMessageSchema,
	createWorktreeIncludeMessageSchema,
	checkoutBranchMessageSchema,
	browseForWorktreePathMessageSchema,
} from "./worktree.js"
import {
	clearIndexDataMessageSchema,
	requestCodeIndexSecretStatusMessageSchema,
	requestIndexingStatusMessageSchema,
	saveCodeIndexSettingsAtomicMessageSchema,
	setAutoEnableDefaultMessageSchema,
	startIndexingMessageSchema,
	stopIndexingMessageSchema,
	toggleWorkspaceIndexingMessageSchema,
} from "./codeIndex.js"
import { openImageMessageSchema, saveImageMessageSchema, selectImagesMessageSchema } from "./images.js"
import {
	requestSkillsMessageSchema,
	createSkillMessageSchema,
	deleteSkillMessageSchema,
	moveSkillMessageSchema,
	updateSkillModesMessageSchema,
	openSkillFileMessageSchema,
} from "./skills.js"
import {
	requestRulesMessageSchema,
	createRuleMessageSchema,
	deleteRuleMessageSchema,
	openRuleFileMessageSchema,
	openRulesDirectoryMessageSchema,
} from "./rules.js"
import {
	deleteApiConfigurationMessageSchema,
	enhancementApiConfigIdMessageSchema,
	getListApiConfigurationMessageSchema,
	kimiCodeSignInMessageSchema,
	kimiCodeSignOutMessageSchema,
	loadApiConfigurationMessageSchema,
	loadApiConfigurationByIdMessageSchema,
	lockApiConfigAcrossModesMessageSchema,
	openAiCodexSignInMessageSchema,
	openAiCodexSignOutMessageSchema,
	renameApiConfigurationMessageSchema,
	requestOpenAiCodexRateLimitsMessageSchema,
	toggleApiConfigPinMessageSchema,
} from "./providerProfiles.js"
import {
	abandonSubtaskWithIdMessageSchema,
	cancelAutoApprovalMessageSchema,
	cancelTaskMessageSchema,
	clearTaskMessageSchema,
	condenseTaskContextRequestMessageSchema,
	copySystemPromptMessageSchema,
	deleteMultipleTasksWithIdsMessageSchema,
	deleteTaskWithIdMessageSchema,
	exportCurrentTaskMessageSchema,
	exportTaskWithIdMessageSchema,
	getSystemPromptMessageSchema,
	getTaskWithAggregatedCostsMessageSchema,
	newTaskMessageSchema,
	searchCommitsMessageSchema,
	shareCurrentTaskMessageSchema,
	showTaskWithIdMessageSchema,
} from "./task.js"
import {
	askResponseMessageSchema,
	completionCheckpointDiffMessageSchema,
	completionCheckpointRestoreMessageSchema,
	deleteMessageConfirmMessageSchema,
	deleteMessageMessageSchema,
	editMessageConfirmMessageSchema,
	enhancePromptMessageSchema,
	playTtsMessageSchema,
	stopTtsMessageSchema,
	submitEditedMessageMessageSchema,
	ttsEnabledMessageSchema,
	ttsSpeedMessageSchema,
} from "./chat.js"
import {
	deleteMcpServerMessageSchema,
	openMcpSettingsMessageSchema,
	openProjectMcpSettingsMessageSchema,
	refreshAllMcpServersMessageSchema,
	restartMcpServerMessageSchema,
	toggleMcpServerMessageSchema,
	toggleToolAlwaysAllowMessageSchema,
	toggleToolEnabledForPromptMessageSchema,
	updateMcpTimeoutMessageSchema,
} from "./mcp.js"
import {
	downloadErrorDiagnosticsMessageSchema,
	openDebugApiHistoryMessageSchema,
	openDebugUiHistoryMessageSchema,
} from "./debug.js"
import {
	didShowAnnouncementMessageSchema,
	dismissUpsellMessageSchema,
	focusPanelRequestMessageSchema,
	getDismissedUpsellsMessageSchema,
	importRooHistoryMessageSchema,
	insertTextIntoTextareaMessageSchema,
	openExternalMessageSchema,
	openFileMessageSchema,
	openKeyboardShortcutsMessageSchema,
	openMarkdownPreviewMessageSchema,
	openMentionMessageSchema,
	readFileContentMessageSchema,
	refreshCustomToolsMessageSchema,
	requestModesMessageSchema,
	resetStateMessageSchema,
	searchFilesMessageSchema,
	switchTabMessageSchema,
	taskSyncEnabledMessageSchema,
	webviewDidLaunchMessageSchema,
} from "./misc.js"
import {
	cancelMarketplaceInstallMessageSchema,
	codebaseIndexEnabledMessageSchema,
	currentApiConfigNameMessageSchema,
	draggedImagesMessageSchema,
	imageGenerationSettingsMessageSchema,
	marketplaceButtonClickedMessageSchema,
	playSoundMessageSchema,
	setopenAiCustomModelInfoMessageSchema,
	shareTaskSuccessMessageSchema,
	switchModeMessageSchema,
	updateCondensingPromptMessageSchema,
} from "./loose.js"

/**
 * String-literal union of every webview message type.
 *
 * Derived from the existing `WebviewMessage.type` union so the literal list
 * stays in sync with the sender-facing interface (single source of truth).
 */
export type WebviewMessageType = WebviewMessage["type"]

/**
 * Registry of zod schemas keyed by message type.
 *
 * A type only appears here once its payload is fully typed (see S1-M3 for the
 * migration of the remaining domains). The boundary (`parseWebviewMessage`)
 * validates registered types strictly and passes unregistered ones through
 * structurally.
 */
export const webviewMessageSchemas: Partial<Record<WebviewMessageType, z.ZodType>> = {
	checkpointDiff: checkpointDiffMessageSchema,
	checkpointRestore: checkpointRestoreMessageSchema,
	allowedCommands: allowedCommandsMessageSchema,
	deniedCommands: deniedCommandsMessageSchema,
	updateSettings: updateSettingsMessageSchema,
	// Settings domain (S1 sub-task 9)
	autoApprovalEnabled: autoApprovalEnabledMessageSchema,
	checkRulesDirectory: checkRulesDirectoryMessageSchema,
	customInstructions: customInstructionsMessageSchema,
	debugSetting: debugSettingMessageSchema,
	exportMode: exportModeMessageSchema,
	exportSettings: exportSettingsMessageSchema,
	flushRouterModels: flushRouterModelsMessageSchema,
	getVSCodeSetting: getVSCodeSettingMessageSchema,
	hasOpenedModeSelector: hasOpenedModeSelectorMessageSchema,
	importMode: importModeMessageSchema,
	importSettings: importSettingsMessageSchema,
	mode: modeMessageSchema,
	openCustomModesSettings: openCustomModesSettingsMessageSchema,
	requestLmStudioModels: requestLmStudioModelsMessageSchema,
	requestOllamaModels: requestOllamaModelsMessageSchema,
	requestOpenAiModels: requestOpenAiModelsMessageSchema,
	requestRooModels: requestRooModelsMessageSchema,
	requestRouterModels: requestRouterModelsMessageSchema,
	requestVsCodeLmModels: requestVsCodeLmModelsMessageSchema,
	telemetrySetting: telemetrySettingMessageSchema,
	updatePrompt: updatePromptMessageSchema,
	updateVSCodeSetting: updateVSCodeSettingMessageSchema,
	saveApiConfiguration: saveApiConfigurationMessageSchema,
	upsertApiConfiguration: upsertApiConfigurationMessageSchema,
	installMarketplaceItem: installMarketplaceItemMessageSchema,
	installMarketplaceItems: installMarketplaceItemsMessageSchema,
	installMarketplaceItemWithParameters: installMarketplaceItemWithParametersMessageSchema,
	fetchMarketplaceData: fetchMarketplaceDataMessageSchema,
	filterMarketplaceItems: filterMarketplaceItemsMessageSchema,
	removeInstalledMarketplaceItem: removeInstalledMarketplaceItemMessageSchema,
	showMdmAuthRequiredNotification: showMdmAuthRequiredNotificationMessageSchema,
	queueMessage: queueMessageMessageSchema,
	removeQueuedMessage: removeQueuedMessageMessageSchema,
	editQueuedMessage: editQueuedMessageMessageSchema,
	updateTodoList: updateTodoListMessageSchema,
	updateCustomMode: updateCustomModeMessageSchema,
	deleteCustomMode: deleteCustomModeMessageSchema,
	terminalOperation: terminalOperationMessageSchema,
	requestTerminalProfiles: requestTerminalProfilesMessageSchema,
	openTerminalProfilePicker: openTerminalProfilePickerMessageSchema,
	listWorktrees: listWorktreesMessageSchema,
	createWorktree: createWorktreeMessageSchema,
	deleteWorktree: deleteWorktreeMessageSchema,
	switchWorktree: switchWorktreeMessageSchema,
	getAvailableBranches: getAvailableBranchesMessageSchema,
	getWorktreeDefaults: getWorktreeDefaultsMessageSchema,
	getWorktreeIncludeStatus: getWorktreeIncludeStatusMessageSchema,
	checkBranchWorktreeInclude: checkBranchWorktreeIncludeMessageSchema,
	createWorktreeInclude: createWorktreeIncludeMessageSchema,
	checkoutBranch: checkoutBranchMessageSchema,
	browseForWorktreePath: browseForWorktreePathMessageSchema,
	clearIndexData: clearIndexDataMessageSchema,
	requestCodeIndexSecretStatus: requestCodeIndexSecretStatusMessageSchema,
	requestIndexingStatus: requestIndexingStatusMessageSchema,
	saveCodeIndexSettingsAtomic: saveCodeIndexSettingsAtomicMessageSchema,
	setAutoEnableDefault: setAutoEnableDefaultMessageSchema,
	startIndexing: startIndexingMessageSchema,
	stopIndexing: stopIndexingMessageSchema,
	toggleWorkspaceIndexing: toggleWorkspaceIndexingMessageSchema,
	openImage: openImageMessageSchema,
	saveImage: saveImageMessageSchema,
	selectImages: selectImagesMessageSchema,
	// Skills domain (S1 sub-task 6)
	requestSkills: requestSkillsMessageSchema,
	createSkill: createSkillMessageSchema,
	deleteSkill: deleteSkillMessageSchema,
	moveSkill: moveSkillMessageSchema,
	updateSkillModes: updateSkillModesMessageSchema,
	openSkillFile: openSkillFileMessageSchema,
	// Rules domain (S1 sub-task 6)
	requestRules: requestRulesMessageSchema,
	createRule: createRuleMessageSchema,
	deleteRule: deleteRuleMessageSchema,
	openRuleFile: openRuleFileMessageSchema,
	openRulesDirectory: openRulesDirectoryMessageSchema,
	// Commands domain (S1 sub-task 7)
	requestCommands: requestCommandsMessageSchema,
	openCommandFile: openCommandFileMessageSchema,
	deleteCommand: deleteCommandMessageSchema,
	createCommand: createCommandMessageSchema,
	// Provider-profiles domain (S1 sub-task 8)
	deleteApiConfiguration: deleteApiConfigurationMessageSchema,
	enhancementApiConfigId: enhancementApiConfigIdMessageSchema,
	getListApiConfiguration: getListApiConfigurationMessageSchema,
	kimiCodeSignIn: kimiCodeSignInMessageSchema,
	kimiCodeSignOut: kimiCodeSignOutMessageSchema,
	loadApiConfiguration: loadApiConfigurationMessageSchema,
	loadApiConfigurationById: loadApiConfigurationByIdMessageSchema,
	lockApiConfigAcrossModes: lockApiConfigAcrossModesMessageSchema,
	openAiCodexSignIn: openAiCodexSignInMessageSchema,
	openAiCodexSignOut: openAiCodexSignOutMessageSchema,
	renameApiConfiguration: renameApiConfigurationMessageSchema,
	requestOpenAiCodexRateLimits: requestOpenAiCodexRateLimitsMessageSchema,
	toggleApiConfigPin: toggleApiConfigPinMessageSchema,
	// Task domain (S1 sub-task 10)
	newTask: newTaskMessageSchema,
	clearTask: clearTaskMessageSchema,
	exportCurrentTask: exportCurrentTaskMessageSchema,
	shareCurrentTask: shareCurrentTaskMessageSchema,
	showTaskWithId: showTaskWithIdMessageSchema,
	condenseTaskContextRequest: condenseTaskContextRequestMessageSchema,
	deleteTaskWithId: deleteTaskWithIdMessageSchema,
	abandonSubtaskWithId: abandonSubtaskWithIdMessageSchema,
	deleteMultipleTasksWithIds: deleteMultipleTasksWithIdsMessageSchema,
	exportTaskWithId: exportTaskWithIdMessageSchema,
	getTaskWithAggregatedCosts: getTaskWithAggregatedCostsMessageSchema,
	cancelTask: cancelTaskMessageSchema,
	cancelAutoApproval: cancelAutoApprovalMessageSchema,
	getSystemPrompt: getSystemPromptMessageSchema,
	copySystemPrompt: copySystemPromptMessageSchema,
	searchCommits: searchCommitsMessageSchema,
	// Chat domain (S1 sub-task 11)
	askResponse: askResponseMessageSchema,
	completionCheckpointDiff: completionCheckpointDiffMessageSchema,
	completionCheckpointRestore: completionCheckpointRestoreMessageSchema,
	deleteMessage: deleteMessageMessageSchema,
	submitEditedMessage: submitEditedMessageMessageSchema,
	deleteMessageConfirm: deleteMessageConfirmMessageSchema,
	editMessageConfirm: editMessageConfirmMessageSchema,
	enhancePrompt: enhancePromptMessageSchema,
	ttsEnabled: ttsEnabledMessageSchema,
	ttsSpeed: ttsSpeedMessageSchema,
	playTts: playTtsMessageSchema,
	stopTts: stopTtsMessageSchema,
	// MCP domain (S1 sub-task 12)
	deleteMcpServer: deleteMcpServerMessageSchema,
	openMcpSettings: openMcpSettingsMessageSchema,
	openProjectMcpSettings: openProjectMcpSettingsMessageSchema,
	restartMcpServer: restartMcpServerMessageSchema,
	toggleToolAlwaysAllow: toggleToolAlwaysAllowMessageSchema,
	toggleToolEnabledForPrompt: toggleToolEnabledForPromptMessageSchema,
	toggleMcpServer: toggleMcpServerMessageSchema,
	refreshAllMcpServers: refreshAllMcpServersMessageSchema,
	updateMcpTimeout: updateMcpTimeoutMessageSchema,
	// Debug domain (S1 sub-task 13)
	openDebugApiHistory: openDebugApiHistoryMessageSchema,
	openDebugUiHistory: openDebugUiHistoryMessageSchema,
	downloadErrorDiagnostics: downloadErrorDiagnosticsMessageSchema,
	// Misc domain (S1 sub-task 13)
	webviewDidLaunch: webviewDidLaunchMessageSchema,
	didShowAnnouncement: didShowAnnouncementMessageSchema,
	importRooHistory: importRooHistoryMessageSchema,
	resetState: resetStateMessageSchema,
	openFile: openFileMessageSchema,
	readFileContent: readFileContentMessageSchema,
	openMention: openMentionMessageSchema,
	openExternal: openExternalMessageSchema,
	openKeyboardShortcuts: openKeyboardShortcutsMessageSchema,
	taskSyncEnabled: taskSyncEnabledMessageSchema,
	searchFiles: searchFilesMessageSchema,
	refreshCustomTools: refreshCustomToolsMessageSchema,
	focusPanelRequest: focusPanelRequestMessageSchema,
	switchTab: switchTabMessageSchema,
	requestModes: requestModesMessageSchema,
	insertTextIntoTextarea: insertTextIntoTextareaMessageSchema,
	dismissUpsell: dismissUpsellMessageSchema,
	getDismissedUpsells: getDismissedUpsellsMessageSchema,
	openMarkdownPreview: openMarkdownPreviewMessageSchema,
	// Loose / transitional types (S1 sub-task 13) — no handler; registered minimally.
	currentApiConfigName: currentApiConfigNameMessageSchema,
	updateCondensingPrompt: updateCondensingPromptMessageSchema,
	playSound: playSoundMessageSchema,
	draggedImages: draggedImagesMessageSchema,
	setopenAiCustomModelInfo: setopenAiCustomModelInfoMessageSchema,
	codebaseIndexEnabled: codebaseIndexEnabledMessageSchema,
	marketplaceButtonClicked: marketplaceButtonClickedMessageSchema,
	cancelMarketplaceInstall: cancelMarketplaceInstallMessageSchema,
	imageGenerationSettings: imageGenerationSettingsMessageSchema,
	switchMode: switchModeMessageSchema,
	shareTaskSuccess: shareTaskSuccessMessageSchema,
}

/**
 * Fully-typed subset of the protocol as a discriminated union, built from the
 * registered schemas. Grows over time as domains migrate (S1-M3+).
 */
export const webviewMessageSchema = z.discriminatedUnion("type", [
	checkpointDiffMessageSchema,
	checkpointRestoreMessageSchema,
	allowedCommandsMessageSchema,
	deniedCommandsMessageSchema,
	updateSettingsMessageSchema,
	autoApprovalEnabledMessageSchema,
	checkRulesDirectoryMessageSchema,
	customInstructionsMessageSchema,
	debugSettingMessageSchema,
	exportModeMessageSchema,
	exportSettingsMessageSchema,
	flushRouterModelsMessageSchema,
	getVSCodeSettingMessageSchema,
	hasOpenedModeSelectorMessageSchema,
	importModeMessageSchema,
	importSettingsMessageSchema,
	modeMessageSchema,
	openCustomModesSettingsMessageSchema,
	requestLmStudioModelsMessageSchema,
	requestOllamaModelsMessageSchema,
	requestOpenAiModelsMessageSchema,
	requestRooModelsMessageSchema,
	requestRouterModelsMessageSchema,
	requestVsCodeLmModelsMessageSchema,
	telemetrySettingMessageSchema,
	updatePromptMessageSchema,
	updateVSCodeSettingMessageSchema,
	saveApiConfigurationMessageSchema,
	upsertApiConfigurationMessageSchema,
	installMarketplaceItemMessageSchema,
	installMarketplaceItemsMessageSchema,
	installMarketplaceItemWithParametersMessageSchema,
	fetchMarketplaceDataMessageSchema,
	filterMarketplaceItemsMessageSchema,
	removeInstalledMarketplaceItemMessageSchema,
	showMdmAuthRequiredNotificationMessageSchema,
	queueMessageMessageSchema,
	removeQueuedMessageMessageSchema,
	editQueuedMessageMessageSchema,
	updateTodoListMessageSchema,
	updateCustomModeMessageSchema,
	deleteCustomModeMessageSchema,
	terminalOperationMessageSchema,
	requestTerminalProfilesMessageSchema,
	openTerminalProfilePickerMessageSchema,
	listWorktreesMessageSchema,
	createWorktreeMessageSchema,
	deleteWorktreeMessageSchema,
	switchWorktreeMessageSchema,
	getAvailableBranchesMessageSchema,
	getWorktreeDefaultsMessageSchema,
	getWorktreeIncludeStatusMessageSchema,
	checkBranchWorktreeIncludeMessageSchema,
	createWorktreeIncludeMessageSchema,
	checkoutBranchMessageSchema,
	browseForWorktreePathMessageSchema,
	clearIndexDataMessageSchema,
	requestCodeIndexSecretStatusMessageSchema,
	requestIndexingStatusMessageSchema,
	saveCodeIndexSettingsAtomicMessageSchema,
	setAutoEnableDefaultMessageSchema,
	startIndexingMessageSchema,
	stopIndexingMessageSchema,
	toggleWorkspaceIndexingMessageSchema,
	openImageMessageSchema,
	saveImageMessageSchema,
	selectImagesMessageSchema,
	requestSkillsMessageSchema,
	createSkillMessageSchema,
	deleteSkillMessageSchema,
	moveSkillMessageSchema,
	updateSkillModesMessageSchema,
	openSkillFileMessageSchema,
	requestRulesMessageSchema,
	createRuleMessageSchema,
	deleteRuleMessageSchema,
	openRuleFileMessageSchema,
	openRulesDirectoryMessageSchema,
	requestCommandsMessageSchema,
	openCommandFileMessageSchema,
	deleteCommandMessageSchema,
	createCommandMessageSchema,
	deleteApiConfigurationMessageSchema,
	enhancementApiConfigIdMessageSchema,
	getListApiConfigurationMessageSchema,
	kimiCodeSignInMessageSchema,
	kimiCodeSignOutMessageSchema,
	loadApiConfigurationMessageSchema,
	loadApiConfigurationByIdMessageSchema,
	lockApiConfigAcrossModesMessageSchema,
	openAiCodexSignInMessageSchema,
	openAiCodexSignOutMessageSchema,
	renameApiConfigurationMessageSchema,
	requestOpenAiCodexRateLimitsMessageSchema,
	toggleApiConfigPinMessageSchema,
	newTaskMessageSchema,
	clearTaskMessageSchema,
	exportCurrentTaskMessageSchema,
	shareCurrentTaskMessageSchema,
	showTaskWithIdMessageSchema,
	condenseTaskContextRequestMessageSchema,
	deleteTaskWithIdMessageSchema,
	abandonSubtaskWithIdMessageSchema,
	deleteMultipleTasksWithIdsMessageSchema,
	exportTaskWithIdMessageSchema,
	getTaskWithAggregatedCostsMessageSchema,
	cancelTaskMessageSchema,
	cancelAutoApprovalMessageSchema,
	getSystemPromptMessageSchema,
	copySystemPromptMessageSchema,
	searchCommitsMessageSchema,
	// Chat domain (S1 sub-task 11)
	askResponseMessageSchema,
	completionCheckpointDiffMessageSchema,
	completionCheckpointRestoreMessageSchema,
	deleteMessageMessageSchema,
	submitEditedMessageMessageSchema,
	deleteMessageConfirmMessageSchema,
	editMessageConfirmMessageSchema,
	enhancePromptMessageSchema,
	ttsEnabledMessageSchema,
	ttsSpeedMessageSchema,
	playTtsMessageSchema,
	stopTtsMessageSchema,
	// MCP domain (S1 sub-task 12)
	deleteMcpServerMessageSchema,
	openMcpSettingsMessageSchema,
	openProjectMcpSettingsMessageSchema,
	restartMcpServerMessageSchema,
	toggleToolAlwaysAllowMessageSchema,
	toggleToolEnabledForPromptMessageSchema,
	toggleMcpServerMessageSchema,
	refreshAllMcpServersMessageSchema,
	updateMcpTimeoutMessageSchema,
	// Debug domain (S1 sub-task 13)
	openDebugApiHistoryMessageSchema,
	openDebugUiHistoryMessageSchema,
	downloadErrorDiagnosticsMessageSchema,
	// Misc domain (S1 sub-task 13)
	webviewDidLaunchMessageSchema,
	didShowAnnouncementMessageSchema,
	importRooHistoryMessageSchema,
	resetStateMessageSchema,
	openFileMessageSchema,
	readFileContentMessageSchema,
	openMentionMessageSchema,
	openExternalMessageSchema,
	openKeyboardShortcutsMessageSchema,
	taskSyncEnabledMessageSchema,
	searchFilesMessageSchema,
	refreshCustomToolsMessageSchema,
	focusPanelRequestMessageSchema,
	switchTabMessageSchema,
	requestModesMessageSchema,
	insertTextIntoTextareaMessageSchema,
	dismissUpsellMessageSchema,
	getDismissedUpsellsMessageSchema,
	openMarkdownPreviewMessageSchema,
	// Loose / transitional types (S1 sub-task 13) — no handler; registered minimally.
	currentApiConfigNameMessageSchema,
	updateCondensingPromptMessageSchema,
	playSoundMessageSchema,
	draggedImagesMessageSchema,
	setopenAiCustomModelInfoMessageSchema,
	codebaseIndexEnabledMessageSchema,
	marketplaceButtonClickedMessageSchema,
	cancelMarketplaceInstallMessageSchema,
	imageGenerationSettingsMessageSchema,
	switchModeMessageSchema,
	shareTaskSuccessMessageSchema,
])

export type ParseWebviewMessageResult = { ok: true; message: WebviewMessage } | { ok: false; error: string }

/**
 * Boundary validation for webview→extension messages.
 *
 * Three modes:
 *  - non-object input or a missing/invalid `type` field → rejected
 *  - `type` with a registered schema → strict `safeParse`; failure → rejected
 *  - `type` unregistered → structural pass-through (transitional, never reject)
 *
 * This is the fail-closed gate that closes the webview→extension "Input Gap"
 * without breaking the existing `WebviewMessage` interface or its senders.
 */
export function parseWebviewMessage(raw: unknown): ParseWebviewMessageResult {
	if (typeof raw !== "object" || raw === null) {
		return { ok: false, error: "Webview message must be an object" }
	}

	const type = (raw as { type?: unknown }).type
	if (typeof type !== "string") {
		return { ok: false, error: "Webview message is missing a string 'type' field" }
	}

	const schema = webviewMessageSchemas[type as WebviewMessageType]
	if (schema) {
		const result = schema.safeParse(raw)
		if (!result.success) {
			return { ok: false, error: `Invalid '${type}' message: ${result.error.message}` }
		}
		return { ok: true, message: result.data as WebviewMessage }
	}

	// Transitional pass-through for unregistered types — keeps the migration
	// incremental without breaking the existing sender construction sites.
	return { ok: true, message: raw as WebviewMessage }
}

export { checkpointDiffMessageSchema, checkpointRestoreMessageSchema } from "./checkpoint.js"
export type { CheckpointMessage } from "./checkpoint.js"
export {
	allowedCommandsMessageSchema,
	deniedCommandsMessageSchema,
	commandsMessageSchema,
	requestCommandsMessageSchema,
	openCommandFileMessageSchema,
	deleteCommandMessageSchema,
	createCommandMessageSchema,
	commandFilesMessageSchema,
} from "./commands.js"
export type { CommandsMessage, CommandFilesMessage, CommandFileValues } from "./commands.js"
export { updateSettingsMessageSchema } from "./settings.js"
export type { SettingsMessage } from "./settings.js"
export {
	autoApprovalEnabledMessageSchema,
	checkRulesDirectoryMessageSchema,
	customInstructionsMessageSchema,
	debugSettingMessageSchema,
	exportModeMessageSchema,
	exportSettingsMessageSchema,
	flushRouterModelsMessageSchema,
	getVSCodeSettingMessageSchema,
	hasOpenedModeSelectorMessageSchema,
	importModeMessageSchema,
	importSettingsMessageSchema,
	modeMessageSchema,
	openCustomModesSettingsMessageSchema,
	requestLmStudioModelsMessageSchema,
	requestOllamaModelsMessageSchema,
	requestOpenAiModelsMessageSchema,
	requestRooModelsMessageSchema,
	requestRouterModelsMessageSchema,
	requestVsCodeLmModelsMessageSchema,
	telemetrySettingMessageSchema,
	updatePromptMessageSchema,
	updateVSCodeSettingMessageSchema,
	settingsExtraMessageSchema,
} from "./settingsExtra.js"
export type { SettingsExtraMessage, RequestRouterModelsValues } from "./settingsExtra.js"
export {
	saveApiConfigurationMessageSchema,
	upsertApiConfigurationMessageSchema,
	providerConfigMessageSchema,
} from "./providerConfig.js"
export type { ProviderConfigMessage } from "./providerConfig.js"
export {
	fetchMarketplaceDataMessageSchema,
	filterMarketplaceItemsMessageSchema,
	installMarketplaceItemMessageSchema,
	installMarketplaceItemsMessageSchema,
	installMarketplaceItemWithParametersMessageSchema,
	removeInstalledMarketplaceItemMessageSchema,
	showMdmAuthRequiredNotificationMessageSchema,
	marketplaceMessageSchema,
} from "./marketplace.js"
export type { MarketplaceMessage } from "./marketplace.js"
export {
	queueMessageMessageSchema,
	removeQueuedMessageMessageSchema,
	editQueuedMessageMessageSchema,
	messageQueueMessageSchema,
} from "./messageQueue.js"
export type { MessageQueueMessage } from "./messageQueue.js"
export {
	updateTodoListMessageSchema,
	updateCustomModeMessageSchema,
	deleteCustomModeMessageSchema,
	customModesMessageSchema,
} from "./customModes.js"
export type { CustomModesMessage } from "./customModes.js"
export {
	terminalOperationMessageSchema,
	requestTerminalProfilesMessageSchema,
	openTerminalProfilePickerMessageSchema,
	terminalMessageSchema,
} from "./terminal.js"
export type { TerminalMessage } from "./terminal.js"
export {
	listWorktreesMessageSchema,
	createWorktreeMessageSchema,
	deleteWorktreeMessageSchema,
	switchWorktreeMessageSchema,
	getAvailableBranchesMessageSchema,
	getWorktreeDefaultsMessageSchema,
	getWorktreeIncludeStatusMessageSchema,
	checkBranchWorktreeIncludeMessageSchema,
	createWorktreeIncludeMessageSchema,
	checkoutBranchMessageSchema,
	browseForWorktreePathMessageSchema,
	worktreeMessageSchema,
} from "./worktree.js"
export type { WorktreeMessage } from "./worktree.js"
export {
	clearIndexDataMessageSchema,
	requestCodeIndexSecretStatusMessageSchema,
	requestIndexingStatusMessageSchema,
	saveCodeIndexSettingsAtomicMessageSchema,
	setAutoEnableDefaultMessageSchema,
	startIndexingMessageSchema,
	stopIndexingMessageSchema,
	toggleWorkspaceIndexingMessageSchema,
	codeIndexMessageSchema,
} from "./codeIndex.js"
export type { CodeIndexMessage } from "./codeIndex.js"
export {
	openImageMessageSchema,
	saveImageMessageSchema,
	selectImagesMessageSchema,
	imagesMessageSchema,
} from "./images.js"
export type { ImagesMessage } from "./images.js"
export {
	requestSkillsMessageSchema,
	createSkillMessageSchema,
	deleteSkillMessageSchema,
	moveSkillMessageSchema,
	updateSkillModesMessageSchema,
	openSkillFileMessageSchema,
	skillsMessageSchema,
} from "./skills.js"
export type { SkillsMessage } from "./skills.js"
export {
	requestRulesMessageSchema,
	createRuleMessageSchema,
	deleteRuleMessageSchema,
	openRuleFileMessageSchema,
	openRulesDirectoryMessageSchema,
	rulesMessageSchema,
} from "./rules.js"
export type { RulesMessage, CreateRuleValues, DeleteRuleValues, OpenRulesDirectoryValues } from "./rules.js"
export {
	deleteApiConfigurationMessageSchema,
	enhancementApiConfigIdMessageSchema,
	getListApiConfigurationMessageSchema,
	kimiCodeSignInMessageSchema,
	kimiCodeSignOutMessageSchema,
	loadApiConfigurationMessageSchema,
	loadApiConfigurationByIdMessageSchema,
	lockApiConfigAcrossModesMessageSchema,
	openAiCodexSignInMessageSchema,
	openAiCodexSignOutMessageSchema,
	renameApiConfigurationMessageSchema,
	requestOpenAiCodexRateLimitsMessageSchema,
	toggleApiConfigPinMessageSchema,
	providerProfilesMessageSchema,
} from "./providerProfiles.js"
export type { ProviderProfilesMessage, RenameApiConfigurationValues } from "./providerProfiles.js"
export {
	newTaskMessageSchema,
	clearTaskMessageSchema,
	exportCurrentTaskMessageSchema,
	shareCurrentTaskMessageSchema,
	showTaskWithIdMessageSchema,
	condenseTaskContextRequestMessageSchema,
	deleteTaskWithIdMessageSchema,
	abandonSubtaskWithIdMessageSchema,
	deleteMultipleTasksWithIdsMessageSchema,
	exportTaskWithIdMessageSchema,
	getTaskWithAggregatedCostsMessageSchema,
	cancelTaskMessageSchema,
	cancelAutoApprovalMessageSchema,
	getSystemPromptMessageSchema,
	copySystemPromptMessageSchema,
	searchCommitsMessageSchema,
	taskMessageSchema,
} from "./task.js"
export type { TaskMessage } from "./task.js"
export {
	askResponseMessageSchema,
	completionCheckpointDiffMessageSchema,
	completionCheckpointRestoreMessageSchema,
	deleteMessageMessageSchema,
	submitEditedMessageMessageSchema,
	deleteMessageConfirmMessageSchema,
	editMessageConfirmMessageSchema,
	enhancePromptMessageSchema,
	ttsEnabledMessageSchema,
	ttsSpeedMessageSchema,
	playTtsMessageSchema,
	stopTtsMessageSchema,
	chatMessageSchema,
} from "./chat.js"
export type { ChatMessage } from "./chat.js"
export {
	deleteMcpServerMessageSchema,
	openMcpSettingsMessageSchema,
	openProjectMcpSettingsMessageSchema,
	restartMcpServerMessageSchema,
	toggleToolAlwaysAllowMessageSchema,
	toggleToolEnabledForPromptMessageSchema,
	toggleMcpServerMessageSchema,
	refreshAllMcpServersMessageSchema,
	updateMcpTimeoutMessageSchema,
	mcpMessageSchema,
} from "./mcp.js"
export type { McpMessage } from "./mcp.js"
export {
	downloadErrorDiagnosticsMessageSchema,
	openDebugApiHistoryMessageSchema,
	openDebugUiHistoryMessageSchema,
	debugMessageSchema,
} from "./debug.js"
export type { DebugMessage } from "./debug.js"
export {
	didShowAnnouncementMessageSchema,
	dismissUpsellMessageSchema,
	focusPanelRequestMessageSchema,
	getDismissedUpsellsMessageSchema,
	importRooHistoryMessageSchema,
	insertTextIntoTextareaMessageSchema,
	openExternalMessageSchema,
	openFileMessageSchema,
	openKeyboardShortcutsMessageSchema,
	openMarkdownPreviewMessageSchema,
	openMentionMessageSchema,
	readFileContentMessageSchema,
	refreshCustomToolsMessageSchema,
	requestModesMessageSchema,
	resetStateMessageSchema,
	searchFilesMessageSchema,
	switchTabMessageSchema,
	taskSyncEnabledMessageSchema,
	webviewDidLaunchMessageSchema,
	miscMessageSchema,
} from "./misc.js"
export type { MiscMessage } from "./misc.js"
export {
	cancelMarketplaceInstallMessageSchema,
	codebaseIndexEnabledMessageSchema,
	currentApiConfigNameMessageSchema,
	draggedImagesMessageSchema,
	imageGenerationSettingsMessageSchema,
	marketplaceButtonClickedMessageSchema,
	playSoundMessageSchema,
	setopenAiCustomModelInfoMessageSchema,
	shareTaskSuccessMessageSchema,
	switchModeMessageSchema,
	updateCondensingPromptMessageSchema,
	looseMessageSchema,
} from "./loose.js"
export type { LooseMessage } from "./loose.js"
