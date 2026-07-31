import type { WebviewMessage, WebviewMessageType } from "@roo-code/types"

import type { ClineProvider } from "./ClineProvider"
import type { MarketplaceManager } from "../../services/marketplace"

import { chatMessageTypes, handleChatMessages } from "./handlers/chat"
import { taskMessageTypes, handleTaskMessages } from "./handlers/task"
import { settingsMessageTypes, handleSettingsMessages } from "./handlers/settings"
import { providerProfilesMessageTypes, handleProviderProfilesMessages } from "./handlers/providerProfiles"
import { mcpMessageTypes, handleMcpMessages } from "./handlers/mcp"
import { marketplaceMessageTypes, handleMarketplaceMessages } from "./handlers/marketplace"
import { worktreeMessageTypes, handleWorktreeMessages } from "./handlers/worktree"
import { codeIndexMessageTypes, handleCodeIndexMessages } from "./handlers/codeIndex"
import { skillsMessageTypes, handleSkillsMessages } from "./handlers/skills"
import { rulesMessageTypes, handleRulesMessages } from "./handlers/rules"
import { commandsMessageTypes, handleCommandsMessages } from "./handlers/commands"
import { terminalMessageTypes, handleTerminalMessages } from "./handlers/terminal"
import { imagesMessageTypes, handleImagesMessages } from "./handlers/images"
import { debugMessageTypes, handleDebugMessages } from "./handlers/debug"
import { miscMessageTypes, handleMiscMessages } from "./handlers/misc"

/**
 * Router for inbound webview messages. The former single-file `switch`
 * (webviewMessageHandler) has been split into per-domain handler modules under
 * `handlers/`; this file only maps each message type to its owning module and
 * delegates. `webviewMessageHandler` keeps its exact exported signature so the
 * existing boundary call sites and spec files remain unchanged.
 */
type MessageHandler = (
	provider: ClineProvider,
	marketplaceManager: MarketplaceManager | undefined,
	message: WebviewMessage,
) => Promise<void>

const domainHandlers: Array<{ types: ReadonlySet<WebviewMessageType>; handler: MessageHandler }> = [
	{
		types: chatMessageTypes,
		handler: (provider, marketplaceManager, message) => handleChatMessages(provider, marketplaceManager, message),
	},
	{
		types: taskMessageTypes,
		handler: (provider, marketplaceManager, message) => handleTaskMessages(provider, marketplaceManager, message),
	},
	{
		types: settingsMessageTypes,
		handler: (provider, marketplaceManager, message) =>
			handleSettingsMessages(provider, marketplaceManager, message),
	},
	{
		types: providerProfilesMessageTypes,
		handler: (provider, marketplaceManager, message) =>
			handleProviderProfilesMessages(provider, marketplaceManager, message),
	},
	{
		types: mcpMessageTypes,
		handler: (provider, marketplaceManager, message) => handleMcpMessages(provider, marketplaceManager, message),
	},
	{
		types: marketplaceMessageTypes,
		handler: (provider, marketplaceManager, message) =>
			handleMarketplaceMessages(provider, marketplaceManager, message),
	},
	{
		types: worktreeMessageTypes,
		handler: (provider, marketplaceManager, message) =>
			handleWorktreeMessages(provider, marketplaceManager, message),
	},
	{
		types: codeIndexMessageTypes,
		handler: (provider, marketplaceManager, message) =>
			handleCodeIndexMessages(provider, marketplaceManager, message),
	},
	{
		types: skillsMessageTypes,
		handler: (provider, marketplaceManager, message) => handleSkillsMessages(provider, marketplaceManager, message),
	},
	{
		types: rulesMessageTypes,
		handler: (provider, marketplaceManager, message) => handleRulesMessages(provider, marketplaceManager, message),
	},
	{
		types: commandsMessageTypes,
		handler: (provider, marketplaceManager, message) =>
			handleCommandsMessages(provider, marketplaceManager, message),
	},
	{
		types: terminalMessageTypes,
		handler: (provider, marketplaceManager, message) =>
			handleTerminalMessages(provider, marketplaceManager, message),
	},
	{
		types: imagesMessageTypes,
		handler: (provider, marketplaceManager, message) => handleImagesMessages(provider, marketplaceManager, message),
	},
	{
		types: debugMessageTypes,
		handler: (provider, marketplaceManager, message) => handleDebugMessages(provider, marketplaceManager, message),
	},
	{
		types: miscMessageTypes,
		handler: (provider, marketplaceManager, message) => handleMiscMessages(provider, marketplaceManager, message),
	},
]

const dispatchMap = new Map<WebviewMessageType, MessageHandler>()
for (const { types, handler } of domainHandlers) {
	for (const type of types) {
		dispatchMap.set(type, handler)
	}
}

export const webviewMessageHandler = async (
	provider: ClineProvider,
	message: WebviewMessage,
	marketplaceManager?: MarketplaceManager,
) => {
	const handler = dispatchMap.get(message.type)

	if (handler) {
		await handler(provider, marketplaceManager, message)
	} else {
		// console.log(`Unhandled message type: ${message.type}`)
		//
		// Currently unhandled:
		//
		// "currentApiConfigName" |
		// "codebaseIndexEnabled" |
		// "enhancedPrompt" |
		// "systemPrompt" |
		// "exportModeResult" |
		// "importModeResult" |
		// "checkRulesDirectoryResult" |
		// "browserConnectionResult" |
		// "vsCodeSetting" |
		// "indexingStatusUpdate" |
		// "indexCleared" |
		// "marketplaceInstallResult" |
		// "shareTaskSuccess" |
		// "playSound" |
		// "draggedImages" |
		// "setApiConfigPassword" |
		// "setopenAiCustomModelInfo" |
		// "marketplaceButtonClicked" |
		// "cancelMarketplaceInstall" |
		// "imageGenerationSettings"
	}
}
