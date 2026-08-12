/**
 * message-schema-analysis.mjs
 *
 * Pure analysis logic for the webview↔extension message-schema ratchet (S1-M4).
 *
 * Split out of the executable (`verify-message-schemas.mjs`) so the ratchet
 * decisions are unit-testable without importing the built `@roo-code/types`
 * package or reading files.
 */

/**
 * Security-sensitive message types that MUST always have a schema in
 * `webviewMessageSchemas` (see `packages/types/src/webview-messages/index.ts`).
 *
 * This list must only ever GROW: once a type is added here, unregistering it is
 * a regression that fails CI. Newly typed domains are appended here during
 * follow-up migration work (S1-M4).
 */
export const MESSAGE_SCHEMA_BASELINE = [
	"checkpointDiff",
	"checkpointRestore",
	"allowedCommands",
	"deniedCommands",
	"updateSettings",
	"saveApiConfiguration",
	"upsertApiConfiguration",
	"installMarketplaceItem",
	"installMarketplaceItems",
	"installMarketplaceItemWithParameters",
	"queueMessage",
	"removeQueuedMessage",
	"editQueuedMessage",
	"updateTodoList",
	"updateCustomMode",
	"deleteCustomMode",
	"terminalOperation",
	"requestTerminalProfiles",
	"openTerminalProfilePicker",
	// Worktree domain (S1 sub-task 2)
	"listWorktrees",
	"createWorktree",
	"deleteWorktree",
	"switchWorktree",
	"getAvailableBranches",
	"getWorktreeDefaults",
	"getWorktreeIncludeStatus",
	"checkBranchWorktreeInclude",
	"createWorktreeInclude",
	"checkoutBranch",
	"browseForWorktreePath",
	// Code-index domain (S1 sub-task 3)
	"clearIndexData",
	"requestCodeIndexSecretStatus",
	"requestIndexingStatus",
	"saveCodeIndexSettingsAtomic",
	"setAutoEnableDefault",
	"startIndexing",
	"stopIndexing",
	"toggleWorkspaceIndexing",
	// Marketplace remaining domain (S1 sub-task 4)
	"removeInstalledMarketplaceItem",
	"showMdmAuthRequiredNotification",
	// Images domain (S1 sub-task 5)
	"openImage",
	"saveImage",
	"selectImages",
	// Skills domain (S1 sub-task 6)
	"requestSkills",
	"createSkill",
	"deleteSkill",
	"moveSkill",
	"updateSkillModes",
	"openSkillFile",
	// Rules domain (S1 sub-task 6)
	"requestRules",
	"createRule",
	"deleteRule",
	"openRuleFile",
	"openRulesDirectory",
	// Commands domain (S1 sub-task 7)
	"requestCommands",
	"openCommandFile",
	"deleteCommand",
	"createCommand",
	// Provider-profiles domain (S1 sub-task 8)
	"deleteApiConfiguration",
	"enhancementApiConfigId",
	"getListApiConfiguration",
	"kimiCodeSignIn",
	"kimiCodeSignOut",
	"loadApiConfiguration",
	"loadApiConfigurationById",
	"lockApiConfigAcrossModes",
	"openAiCodexSignIn",
	"openAiCodexSignOut",
	"renameApiConfiguration",
	"requestOpenAiCodexRateLimits",
	"toggleApiConfigPin",
	// Settings domain (S1 sub-task 9)
	"autoApprovalEnabled",
	"checkRulesDirectory",
	"customInstructions",
	"debugSetting",
	"exportMode",
	"exportSettings",
	"flushRouterModels",
	"getVSCodeSetting",
	"hasOpenedModeSelector",
	"importMode",
	"importSettings",
	"mode",
	"openCustomModesSettings",
	"requestLmStudioModels",
	"requestOllamaModels",
	"requestOpenAiModels",
	"requestRooModels",
	"requestRouterModels",
	"requestVsCodeLmModels",
	"telemetrySetting",
	"updatePrompt",
	"updateVSCodeSetting",
	// Task domain (S1 sub-task 10)
	"newTask",
	"clearTask",
	"exportCurrentTask",
	"shareCurrentTask",
	"showTaskWithId",
	"condenseTaskContextRequest",
	"deleteTaskWithId",
	"abandonSubtaskWithId",
	"deleteMultipleTasksWithIds",
	"exportTaskWithId",
	"getTaskWithAggregatedCosts",
	"cancelTask",
	"cancelAutoApproval",
	"getSystemPrompt",
	"copySystemPrompt",
	"searchCommits",
	// Chat domain (S1 sub-task 11)
	"askResponse",
	"completionCheckpointDiff",
	"completionCheckpointRestore",
	"deleteMessage",
	"submitEditedMessage",
	"deleteMessageConfirm",
	"editMessageConfirm",
	"enhancePrompt",
	"ttsEnabled",
	"ttsSpeed",
	"playTts",
	"stopTts",
	// MCP domain (S1 sub-task 12)
	"deleteMcpServer",
	"openMcpSettings",
	"openProjectMcpSettings",
	"restartMcpServer",
	"toggleToolAlwaysAllow",
	"toggleToolEnabledForPrompt",
	"toggleMcpServer",
	"refreshAllMcpServers",
	"updateMcpTimeout",
	// Debug domain (S1 sub-task 13)
	"openDebugApiHistory",
	"openDebugUiHistory",
	"downloadErrorDiagnostics",
	// Misc domain (S1 sub-task 13)
	"webviewDidLaunch",
	"didShowAnnouncement",
	"importRooHistory",
	"resetState",
	"openFile",
	"readFileContent",
	"openMention",
	"openExternal",
	"openKeyboardShortcuts",
	"taskSyncEnabled",
	"searchFiles",
	"refreshCustomTools",
	"focusPanelRequest",
	"switchTab",
	"requestModes",
	"insertTextIntoTextarea",
	"dismissUpsell",
	"getDismissedUpsells",
	"openMarkdownPreview",
	// Loose / transitional types (S1 sub-task 13) — no handler; typed + registered.
	// (marketplaceButtonClicked + shareTaskSuccess removed in Phase 3; the other 8
	// dead members removed in Phase 3 — see loose.ts.)
	"draggedImages",
]

/**
	* Maximum permitted number of UNTYPED message types (WebviewMessageType members
	* without a schema in the registry).
	*
	* Verified derivation (2026-08-11): 165 literal members of the
	* `WebviewMessage.type` union minus 165 registered in the zod registry
	* (`packages/types/src/webview-messages/index.ts`) = 0 untyped. This is the
	* current count as of S1-M13 (the final sub-task: Debug + Misc + Loose
	* domains landed) and must only ever DECREASE as domains migrate; increasing
	* it is a ratchet regression (the guard goal is "the count of untyped message
	* types must not increase"). Never raise this number — adjust it only when a
	* type is newly registered, keeping the derivation above in sync.
	*/
export const UNTYPED_MESSAGE_LIMIT = 0

/**
 * Outbound (extension→webview|CLI) message types that MUST always have a schema
 * in `extensionMessageSchemas` (see `packages/types/src/extension-messages/index.ts`).
 *
 * Same rule as `MESSAGE_SCHEMA_BASELINE`: this list must only ever GROW. These
 * are the Phase-0 baseline types from docs/architecture-review-protocol-migration.md;
 * newly typed outbound domains are appended here during follow-up migration work.
 */
export const EXTENSION_MESSAGE_BASELINE = [
	"state",
	"commandExecutionStatus",
	"mcpExecutionStatus",
	"fileContent",
	"indexingStatusUpdate",
	// UI/navigation + state-variant domain (Phase 2, Domain 1)
	"action",
	"invoke",
	"messageUpdated",
	"taskHistoryUpdated",
	"taskHistoryItemUpdated",
	"selectedImages",
	"theme",
	"workspaceUpdated",
	"ttsStart",
	"ttsStop",
	"condenseTaskContextStarted",
	"condenseTaskContextResponse",
	"acceptInput",
	"setHistoryPreviewCollapsed",
	"autoApprovalEnabled",
	"toggleApiConfigPin",
	"updatePrompt",
	// Model/status responses domain (Phase 2, Domain 2)
	"routerModels",
	"singleRouterModelFetchResponse",
	"openAiModels",
	"ollamaModels",
	"lmStudioModels",
	"vsCodeLmModels",
	"vsCodeSetting",
	"systemPrompt",
	"enhancedPrompt",
	"terminalProfiles",
	"vsCodeLmApiAvailable",
	"authenticatedUser",
	// Task/chat/history responses domain (Phase 2, Domain 3)
	"commitSearchResults",
	"fileSearchResults",
	"listApiConfig",
	"mcpServers",
	"showDeleteMessageDialog",
	"showEditMessageDialog",
	"commands",
	"insertTextIntoTextarea",
	"dismissedUpsells",
	"customToolsResult",
	"modes",
	"taskWithAggregatedCosts",
	"openAiCodexRateLimits",
	"interactionRequired",
	"organizationSwitchResult",
	// Checkpoint/modes responses domain (Phase 2, Domain 4)
	"currentCheckpointUpdated",
	"checkpointInitWarning",
	"updateCustomMode",
	"deleteCustomMode",
	"deleteCustomModeCheck",
	"exportModeResult",
	"importModeResult",
	"checkRulesDirectoryResult",
	// Marketplace responses domain (Phase 2, Domain 5)
	"marketplaceInstallResult",
	"marketplaceBulkInstallResult",
	"marketplaceRemoveResult",
	"marketplaceData",
	"shareTaskSuccess",
	// Code-index responses domain (Phase 2, Domain 6)
	"codeIndexSettingsSaved",
	"codeIndexSecretStatus",
	"indexCleared",
	"codebaseIndexConfig",
	// Worktree responses domain (Phase 2, Domain 7)
	"worktreeList",
	"worktreeResult",
	"worktreeCopyProgress",
	"branchList",
	"worktreeDefaults",
	"worktreeIncludeStatus",
	"branchWorktreeIncludeResult",
	"folderSelected",
	// Skills/Rules/history-import responses domain (Phase 2, Domain 8)
	"skills",
	"rules",
	"rooHistoryImportProgress",
]

/**
 * Maximum permitted number of UNTYPED outbound message types
 * (ExtensionMessageType members without a schema in the registry).
 *
 * Verified derivation (2026-08-11): 77 literal members of the
 * `ExtensionMessage.type` union minus 77 registered in the zod registry
 * (`packages/types/src/extension-messages/index.ts`) = 0 untyped. This is the
 * current count as of Phase 2, Domain 8 (skills/rules/history-import responses
 * landed — the final domain) and must only ever DECREASE as domains migrate;
 * increasing it is a ratchet regression. Never raise this number — adjust it
 * only when a type is newly registered, keeping the derivation above in sync.
 * Phase 2 is COMPLETE: all 77 outbound `ExtensionMessage` types are registered.
 */
export const UNTYPED_EXTENSION_MESSAGE_LIMIT = 0

/**
 * Extract the string-literal members of `WebviewMessage["type"]` from the
 * `WebviewMessage` interface in the package source. The union is type-only
 * (erased at runtime), so the source is the authoritative message-type list.
 *
 * @param {string} source  contents of packages/types/src/vscode-extension-host.ts
 * @returns {string[]} every quoted member of the interface's `type` union
 */
export function extractMessageTypesFromSource(source) {
	const interfaceStart = source.indexOf("export interface WebviewMessage {")
	if (interfaceStart === -1) {
		throw new Error('Could not find "export interface WebviewMessage" in the source')
	}
	const fieldsStart = source.indexOf("text?: string", interfaceStart)
	if (fieldsStart === -1) {
		throw new Error('Could not find the end of the WebviewMessage "type" union in the source')
	}
	const union = source.slice(interfaceStart, fieldsStart)
	const types = []
	for (const line of union.split("\n")) {
		const match = line.match(/^\s*\|\s*"([^"]+)"\s*$/)
		if (match) {
			types.push(match[1])
		}
	}
	return types
}

/**
 * Extract the string-literal members of `ExtensionMessage["type"]` from the
 * `ExtensionMessage` interface in the package source. The union is type-only
 * (erased at runtime), so the source is the authoritative message-type list.
 *
 * @param {string} source  contents of packages/types/src/vscode-extension-host.ts
 * @returns {string[]} every quoted member of the interface's `type` union
 */
export function extractExtensionMessageTypesFromSource(source) {
	const interfaceStart = source.indexOf("export interface ExtensionMessage {")
	if (interfaceStart === -1) {
		throw new Error('Could not find "export interface ExtensionMessage" in the source')
	}
	const fieldsStart = source.indexOf("text?: string", interfaceStart)
	if (fieldsStart === -1) {
		throw new Error('Could not find the end of the ExtensionMessage "type" union in the source')
	}
	const union = source.slice(interfaceStart, fieldsStart)
	const types = []
	for (const line of union.split("\n")) {
		const match = line.match(/^\s*\|\s*"([^"]+)"\s*$/)
		if (match) {
			types.push(match[1])
		}
	}
	return types
}

/**
 * Analyze a message-schema registry against the full message-type list and the
 * baseline. Pure — no I/O.
 *
 * @param {Record<string, unknown>} registry  e.g. webviewMessageSchemas (keyed by type)
 * @param {string[]} typeList  every WebviewMessageType member
 * @param {string[]} baseline  security-sensitive types that must stay registered
 * @returns {{ registered: string[], missingBaseline: string[], untyped: string[], untypedCount: number }}
 */
export function analyzeRegistry(registry, typeList, baseline) {
	const registered = new Set(Object.keys(registry))
	const missingBaseline = baseline.filter((type) => !registered.has(type))
	const untyped = typeList.filter((type) => !registered.has(type))
	return {
		registered: [...registered].sort(),
		missingBaseline: [...missingBaseline].sort(),
		untyped: [...untyped].sort(),
		untypedCount: untyped.length,
	}
}

/**
 * Decide whether the ratchet passes for the given analysis.
 *
 * Generic across directions: the same function guards both the inbound
 * `webviewMessageSchemas` registry and the outbound `extensionMessageSchemas`
 * registry (the registry name is only used in the human-readable problem text).
 *
 * @param {{ missingBaseline: string[], untypedCount: number }} analysis
 * @param {number} untypedLimit
 * @param {string} [registryLabel="webviewMessageSchemas"]  registry name for error text
 * @returns {{ ok: boolean, problems: string[] }}
 */
export function evaluateRatchet({ missingBaseline, untypedCount }, untypedLimit, registryLabel = "webviewMessageSchemas") {
	const problems = []
	if (missingBaseline.length > 0) {
		problems.push(
			`Registered-schema regression: baseline type(s) missing from ${registryLabel}: ${missingBaseline.join(", ")}`,
		)
	}
	if (untypedCount > untypedLimit) {
		problems.push(`Untyped message count increased: ${untypedCount} > ${untypedLimit}`)
	}
	return { ok: problems.length === 0, problems }
}
