import { z } from "zod"

import type { ExtensionMessage } from "../vscode-extension-host.js"
import { stateMessageSchema } from "./state.js"
import { commandExecutionStatusMessageSchema, mcpExecutionStatusMessageSchema } from "./execution.js"
import { fileContentMessageSchema } from "./fileContent.js"
import {
	codeIndexSecretStatusMessageSchema,
	codeIndexSettingsSavedMessageSchema,
	codebaseIndexConfigMessageSchema,
	indexClearedMessageSchema,
	indexingStatusUpdateMessageSchema,
} from "./codeIndex.js"
import {
	acceptInputMessageSchema,
	actionMessageSchema,
	autoApprovalEnabledMessageSchema,
	condenseTaskContextResponseMessageSchema,
	condenseTaskContextStartedMessageSchema,
	invokeMessageSchema,
	messageUpdatedMessageSchema,
	selectedImagesMessageSchema,
	setHistoryPreviewCollapsedMessageSchema,
	taskHistoryItemUpdatedMessageSchema,
	taskHistoryUpdatedMessageSchema,
	themeMessageSchema,
	toggleApiConfigPinMessageSchema,
	ttsStartMessageSchema,
	ttsStopMessageSchema,
	updatePromptMessageSchema,
	workspaceUpdatedMessageSchema,
} from "./navigation.js"
import {
	authenticatedUserMessageSchema,
	enhancedPromptMessageSchema,
	lmStudioModelsMessageSchema,
	ollamaModelsMessageSchema,
	openAiModelsMessageSchema,
	routerModelsMessageSchema,
	singleRouterModelFetchResponseMessageSchema,
	systemPromptMessageSchema,
	terminalProfilesMessageSchema,
	vsCodeLmApiAvailableMessageSchema,
	vsCodeLmModelsMessageSchema,
	vsCodeSettingMessageSchema,
} from "./modelStatus.js"
import {
	commitSearchResultsMessageSchema,
	commandsMessageSchema,
	customToolsResultMessageSchema,
	dismissedUpsellsMessageSchema,
	fileSearchResultsMessageSchema,
	insertTextIntoTextareaMessageSchema,
	interactionRequiredMessageSchema,
	listApiConfigMessageSchema,
	mcpServersMessageSchema,
	modesMessageSchema,
	openAiCodexRateLimitsMessageSchema,
	organizationSwitchResultMessageSchema,
	showDeleteMessageDialogMessageSchema,
	showEditMessageDialogMessageSchema,
	taskWithAggregatedCostsMessageSchema,
} from "./taskResponses.js"
import {
	checkRulesDirectoryResultMessageSchema,
	checkpointInitWarningMessageSchema,
	currentCheckpointUpdatedMessageSchema,
	deleteCustomModeCheckMessageSchema,
	deleteCustomModeMessageSchema,
	exportModeResultMessageSchema,
	importModeResultMessageSchema,
	updateCustomModeMessageSchema,
} from "./checkpointModes.js"
import {
	marketplaceBulkInstallResultMessageSchema,
	marketplaceDataMessageSchema,
	marketplaceInstallResultMessageSchema,
	marketplaceRemoveResultMessageSchema,
	shareTaskSuccessMessageSchema,
} from "./marketplace.js"
import {
	branchListMessageSchema,
	branchWorktreeIncludeResultMessageSchema,
	folderSelectedMessageSchema,
	worktreeCopyProgressMessageSchema,
	worktreeDefaultsMessageSchema,
	worktreeIncludeStatusMessageSchema,
	worktreeListMessageSchema,
	worktreeResultMessageSchema,
} from "./worktree.js"
import { rooHistoryImportProgressMessageSchema, rulesMessageSchema, skillsMessageSchema } from "./skillsRules.js"

/**
 * String-literal union of every extension (outbound) message type.
 *
 * Derived from the existing `ExtensionMessage.type` union so the literal list
 * stays in sync with the sender-facing interface (single source of truth).
 */
export type ExtensionMessageType = ExtensionMessage["type"]

/**
 * Registry of zod schemas keyed by message type.
 *
 * A type only appears here once its payload is fully typed (see Phase 2 of
 * plans/architecture-review-protocol-migration.md for the migration of the
 * remaining domains). The boundary (`parseExtensionMessage`) validates
 * registered types strictly and passes unregistered ones through structurally.
 */
export const extensionMessageSchemas: Partial<Record<ExtensionMessageType, z.ZodType>> = {
	state: stateMessageSchema,
	commandExecutionStatus: commandExecutionStatusMessageSchema,
	mcpExecutionStatus: mcpExecutionStatusMessageSchema,
	fileContent: fileContentMessageSchema,
	indexingStatusUpdate: indexingStatusUpdateMessageSchema,
	// Code-index responses domain (Phase 2, Domain 6)
	codeIndexSettingsSaved: codeIndexSettingsSavedMessageSchema,
	codeIndexSecretStatus: codeIndexSecretStatusMessageSchema,
	indexCleared: indexClearedMessageSchema,
	codebaseIndexConfig: codebaseIndexConfigMessageSchema,
	// UI/navigation + state-variant domain (Phase 2, Domain 1)
	action: actionMessageSchema,
	invoke: invokeMessageSchema,
	messageUpdated: messageUpdatedMessageSchema,
	taskHistoryUpdated: taskHistoryUpdatedMessageSchema,
	taskHistoryItemUpdated: taskHistoryItemUpdatedMessageSchema,
	selectedImages: selectedImagesMessageSchema,
	theme: themeMessageSchema,
	workspaceUpdated: workspaceUpdatedMessageSchema,
	ttsStart: ttsStartMessageSchema,
	ttsStop: ttsStopMessageSchema,
	condenseTaskContextStarted: condenseTaskContextStartedMessageSchema,
	condenseTaskContextResponse: condenseTaskContextResponseMessageSchema,
	acceptInput: acceptInputMessageSchema,
	setHistoryPreviewCollapsed: setHistoryPreviewCollapsedMessageSchema,
	autoApprovalEnabled: autoApprovalEnabledMessageSchema,
	toggleApiConfigPin: toggleApiConfigPinMessageSchema,
	updatePrompt: updatePromptMessageSchema,
	// Model/status responses domain (Phase 2, Domain 2)
	routerModels: routerModelsMessageSchema,
	singleRouterModelFetchResponse: singleRouterModelFetchResponseMessageSchema,
	openAiModels: openAiModelsMessageSchema,
	ollamaModels: ollamaModelsMessageSchema,
	lmStudioModels: lmStudioModelsMessageSchema,
	vsCodeLmModels: vsCodeLmModelsMessageSchema,
	vsCodeSetting: vsCodeSettingMessageSchema,
	systemPrompt: systemPromptMessageSchema,
	enhancedPrompt: enhancedPromptMessageSchema,
	terminalProfiles: terminalProfilesMessageSchema,
	vsCodeLmApiAvailable: vsCodeLmApiAvailableMessageSchema,
	authenticatedUser: authenticatedUserMessageSchema,
	// Task/chat/history responses domain (Phase 2, Domain 3)
	commitSearchResults: commitSearchResultsMessageSchema,
	fileSearchResults: fileSearchResultsMessageSchema,
	listApiConfig: listApiConfigMessageSchema,
	mcpServers: mcpServersMessageSchema,
	showDeleteMessageDialog: showDeleteMessageDialogMessageSchema,
	showEditMessageDialog: showEditMessageDialogMessageSchema,
	commands: commandsMessageSchema,
	insertTextIntoTextarea: insertTextIntoTextareaMessageSchema,
	dismissedUpsells: dismissedUpsellsMessageSchema,
	customToolsResult: customToolsResultMessageSchema,
	modes: modesMessageSchema,
	taskWithAggregatedCosts: taskWithAggregatedCostsMessageSchema,
	openAiCodexRateLimits: openAiCodexRateLimitsMessageSchema,
	interactionRequired: interactionRequiredMessageSchema,
	organizationSwitchResult: organizationSwitchResultMessageSchema,
	// Checkpoint/modes responses domain (Phase 2, Domain 4)
	currentCheckpointUpdated: currentCheckpointUpdatedMessageSchema,
	checkpointInitWarning: checkpointInitWarningMessageSchema,
	updateCustomMode: updateCustomModeMessageSchema,
	deleteCustomMode: deleteCustomModeMessageSchema,
	deleteCustomModeCheck: deleteCustomModeCheckMessageSchema,
	exportModeResult: exportModeResultMessageSchema,
	importModeResult: importModeResultMessageSchema,
	checkRulesDirectoryResult: checkRulesDirectoryResultMessageSchema,
	// Marketplace responses domain (Phase 2, Domain 5)
	marketplaceInstallResult: marketplaceInstallResultMessageSchema,
	marketplaceBulkInstallResult: marketplaceBulkInstallResultMessageSchema,
	marketplaceRemoveResult: marketplaceRemoveResultMessageSchema,
	marketplaceData: marketplaceDataMessageSchema,
	shareTaskSuccess: shareTaskSuccessMessageSchema,
	// Worktree responses domain (Phase 2, Domain 7)
	worktreeList: worktreeListMessageSchema,
	worktreeResult: worktreeResultMessageSchema,
	worktreeCopyProgress: worktreeCopyProgressMessageSchema,
	branchList: branchListMessageSchema,
	worktreeDefaults: worktreeDefaultsMessageSchema,
	worktreeIncludeStatus: worktreeIncludeStatusMessageSchema,
	branchWorktreeIncludeResult: branchWorktreeIncludeResultMessageSchema,
	folderSelected: folderSelectedMessageSchema,
	// Skills/Rules/history-import responses domain (Phase 2, Domain 8)
	skills: skillsMessageSchema,
	rules: rulesMessageSchema,
	rooHistoryImportProgress: rooHistoryImportProgressMessageSchema,
}

/**
 * Fully-typed subset of the outbound protocol as a discriminated union, built
 * from the registered schemas. Grows over time as domains migrate (Phase 2+).
 */
export const extensionMessageSchema = z.discriminatedUnion("type", [
	stateMessageSchema,
	commandExecutionStatusMessageSchema,
	mcpExecutionStatusMessageSchema,
	fileContentMessageSchema,
	indexingStatusUpdateMessageSchema,
	codeIndexSettingsSavedMessageSchema,
	codeIndexSecretStatusMessageSchema,
	indexClearedMessageSchema,
	codebaseIndexConfigMessageSchema,
	actionMessageSchema,
	invokeMessageSchema,
	messageUpdatedMessageSchema,
	taskHistoryUpdatedMessageSchema,
	taskHistoryItemUpdatedMessageSchema,
	selectedImagesMessageSchema,
	themeMessageSchema,
	workspaceUpdatedMessageSchema,
	ttsStartMessageSchema,
	ttsStopMessageSchema,
	condenseTaskContextStartedMessageSchema,
	condenseTaskContextResponseMessageSchema,
	acceptInputMessageSchema,
	setHistoryPreviewCollapsedMessageSchema,
	autoApprovalEnabledMessageSchema,
	toggleApiConfigPinMessageSchema,
	updatePromptMessageSchema,
	routerModelsMessageSchema,
	singleRouterModelFetchResponseMessageSchema,
	openAiModelsMessageSchema,
	ollamaModelsMessageSchema,
	lmStudioModelsMessageSchema,
	vsCodeLmModelsMessageSchema,
	vsCodeSettingMessageSchema,
	systemPromptMessageSchema,
	enhancedPromptMessageSchema,
	terminalProfilesMessageSchema,
	vsCodeLmApiAvailableMessageSchema,
	authenticatedUserMessageSchema,
	commitSearchResultsMessageSchema,
	fileSearchResultsMessageSchema,
	listApiConfigMessageSchema,
	mcpServersMessageSchema,
	showDeleteMessageDialogMessageSchema,
	showEditMessageDialogMessageSchema,
	commandsMessageSchema,
	insertTextIntoTextareaMessageSchema,
	dismissedUpsellsMessageSchema,
	customToolsResultMessageSchema,
	modesMessageSchema,
	taskWithAggregatedCostsMessageSchema,
	openAiCodexRateLimitsMessageSchema,
	interactionRequiredMessageSchema,
	organizationSwitchResultMessageSchema,
	currentCheckpointUpdatedMessageSchema,
	checkpointInitWarningMessageSchema,
	updateCustomModeMessageSchema,
	deleteCustomModeMessageSchema,
	deleteCustomModeCheckMessageSchema,
	exportModeResultMessageSchema,
	importModeResultMessageSchema,
	checkRulesDirectoryResultMessageSchema,
	marketplaceInstallResultMessageSchema,
	marketplaceBulkInstallResultMessageSchema,
	marketplaceRemoveResultMessageSchema,
	marketplaceDataMessageSchema,
	shareTaskSuccessMessageSchema,
	worktreeListMessageSchema,
	worktreeResultMessageSchema,
	worktreeCopyProgressMessageSchema,
	branchListMessageSchema,
	worktreeDefaultsMessageSchema,
	worktreeIncludeStatusMessageSchema,
	branchWorktreeIncludeResultMessageSchema,
	folderSelectedMessageSchema,
	skillsMessageSchema,
	rulesMessageSchema,
	rooHistoryImportProgressMessageSchema,
])

export type ParseExtensionMessageResult = { ok: true; message: ExtensionMessage } | { ok: false; error: string }

/**
 * Boundary validation for extension→webview|CLI messages.
 *
 * Hard allowlist (fail-closed, mirroring `parseWebviewMessage`):
 *  - non-object input or a missing/invalid `type` field → rejected
 *  - `type` with a registered schema → strict `safeParse`; failure → rejected
 *  - `type` unregistered → rejected (unknown/forged message)
 *
 * Every `ExtensionMessageType` member is registered (ratchet enforces 0
 * untyped), so the allowlist cannot reject legitimate traffic.
 */
export function parseExtensionMessage(raw: unknown): ParseExtensionMessageResult {
	if (typeof raw !== "object" || raw === null) {
		return { ok: false, error: "Extension message must be an object" }
	}

	const type = (raw as { type?: unknown }).type
	if (typeof type !== "string") {
		return { ok: false, error: "Extension message is missing a string 'type' field" }
	}

	const schema = extensionMessageSchemas[type as ExtensionMessageType]
	if (schema) {
		const result = schema.safeParse(raw)
		if (!result.success) {
			return { ok: false, error: `Invalid '${type}' message: ${result.error.message}` }
		}
		return { ok: true, message: result.data as ExtensionMessage }
	}

	// Fail-closed: every `ExtensionMessageType` member is registered (ratchet: 0
	// untyped). A type with no schema is an unknown/forged message — reject it.
	return { ok: false, error: `Unregistered extension message type '${type}'` }
}

export { stateMessageSchema, extensionStateSubsetSchema } from "./state.js"
export type { StateMessage } from "./state.js"
export {
	commandExecutionStatusMessageSchema,
	mcpExecutionStatusMessageSchema,
	executionMessageSchema,
} from "./execution.js"
export type { ExecutionMessage } from "./execution.js"
export { fileContentMessageSchema } from "./fileContent.js"
export type { FileContentMessage } from "./fileContent.js"
export {
	codeIndexMessageSchema,
	codeIndexSecretStatusMessageSchema,
	codeIndexSecretStatusValuesSchema,
	codeIndexSettingsSavedMessageSchema,
	codebaseIndexConfigMessageSchema,
	indexClearedMessageSchema,
	indexingStatusSchema,
	indexingStatusUpdateMessageSchema,
} from "./codeIndex.js"
export type { CodeIndexMessage } from "./codeIndex.js"
export {
	acceptInputMessageSchema,
	actionMessageSchema,
	actionMessageActionSchema,
	autoApprovalEnabledMessageSchema,
	condenseTaskContextResponseMessageSchema,
	condenseTaskContextStartedMessageSchema,
	invokeMessageSchema,
	messageUpdatedMessageSchema,
	navigationMessageSchema,
	selectedImagesMessageSchema,
	setHistoryPreviewCollapsedMessageSchema,
	taskHistoryItemUpdatedMessageSchema,
	taskHistoryUpdatedMessageSchema,
	themeMessageSchema,
	toggleApiConfigPinMessageSchema,
	ttsStartMessageSchema,
	ttsStopMessageSchema,
	updatePromptMessageSchema,
	workspaceUpdatedMessageSchema,
} from "./navigation.js"
export {
	authenticatedUserMessageSchema,
	enhancedPromptMessageSchema,
	lmStudioModelsMessageSchema,
	modelStatusMessageSchema,
	ollamaModelsMessageSchema,
	openAiModelsMessageSchema,
	routerModelsMessageSchema,
	singleRouterModelFetchResponseMessageSchema,
	systemPromptMessageSchema,
	terminalProfilesMessageSchema,
	vsCodeLmApiAvailableMessageSchema,
	vsCodeLmModelsMessageSchema,
	vsCodeSettingMessageSchema,
} from "./modelStatus.js"
export type { ModelStatusMessage } from "./modelStatus.js"
export type { ActionMessageAction, NavigationMessage } from "./navigation.js"
export {
	aggregatedCostsSchema,
	commandSchema,
	commitSearchResultsMessageSchema,
	commandsMessageSchema,
	customToolsResultMessageSchema,
	dismissedUpsellsMessageSchema,
	fileSearchResultSchema,
	fileSearchResultsMessageSchema,
	insertTextIntoTextareaMessageSchema,
	interactionRequiredMessageSchema,
	listApiConfigMessageSchema,
	mcpServersMessageSchema,
	modesMessageSchema,
	openAiCodexRateLimitInfoSchema,
	openAiCodexRateLimitsMessageSchema,
	organizationSwitchResultMessageSchema,
	serializedCustomToolDefinitionSchema,
	showDeleteMessageDialogMessageSchema,
	showEditMessageDialogMessageSchema,
	taskResponsesMessageSchema,
	taskWithAggregatedCostsMessageSchema,
} from "./taskResponses.js"
export type { TaskResponsesMessage } from "./taskResponses.js"
export {
	checkRulesDirectoryResultMessageSchema,
	checkpointInitWarningMessageSchema,
	checkpointModesMessageSchema,
	checkpointWarningSchema,
	currentCheckpointUpdatedMessageSchema,
	deleteCustomModeCheckMessageSchema,
	deleteCustomModeMessageSchema,
	exportModeResultMessageSchema,
	importModeResultMessageSchema,
	updateCustomModeMessageSchema,
} from "./checkpointModes.js"
export type { CheckpointModesMessage } from "./checkpointModes.js"
export {
	marketplaceBulkInstallResultMessageSchema,
	marketplaceDataMessageSchema,
	marketplaceInstallResultMessageSchema,
	marketplaceMessageSchema,
	marketplaceRemoveResultMessageSchema,
	shareTaskSuccessMessageSchema,
} from "./marketplace.js"
export type { MarketplaceMessage } from "./marketplace.js"
export {
	branchInfoSchema,
	branchListMessageSchema,
	branchWorktreeIncludeResultMessageSchema,
	folderSelectedMessageSchema,
	worktreeCopyProgressMessageSchema,
	worktreeDefaultsMessageSchema,
	worktreeDefaultsResponseSchema,
	worktreeIncludeStatusMessageSchema,
	worktreeIncludeStatusSchema,
	worktreeListMessageSchema,
	worktreeListResponseSchema,
	worktreeMessageSchema,
	worktreeResultMessageSchema,
	worktreeSchema,
} from "./worktree.js"
export type { WorktreeMessage } from "./worktree.js"
export {
	rooHistoryImportProgressMessageSchema,
	rooHistoryImportProgressSchema,
	ruleMetadataSchema,
	rulesMessageSchema,
	skillMetadataSchema,
	skillsMessageSchema,
	skillsRulesMessageSchema,
} from "./skillsRules.js"
export type { SkillsRulesMessage } from "./skillsRules.js"
