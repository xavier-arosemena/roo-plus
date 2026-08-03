import { type WebviewMessage, type WebviewMessageType } from "@roo-code/types"

import {
	handleCreateRule,
	handleDeleteRule,
	handleOpenRuleFile,
	handleOpenRulesDirectory,
	handleRequestRules,
} from "../rulesMessageHandler"
import type { ClineProvider } from "../ClineProvider"
import type { MarketplaceManager } from "../../../services/marketplace"
import { getCurrentCwd } from "./shared"

export const rulesMessageTypes: ReadonlySet<WebviewMessageType> = new Set([
	"createRule",
	"deleteRule",
	"openRuleFile",
	"openRulesDirectory",
	"requestRules",
])

export async function handleRulesMessages(
	provider: Pick<ClineProvider, "getModes" | "postMessageToWebview" | "log" | "getCurrentTask" | "cwd">,
	_marketplaceManager: MarketplaceManager | undefined,
	message: WebviewMessage,
): Promise<void> {
	switch (message.type) {
		case "requestRules": {
			await handleRequestRules(provider, getCurrentCwd(provider))
			break
		}
		case "createRule": {
			await handleCreateRule(provider, getCurrentCwd(provider), message)
			break
		}
		case "deleteRule": {
			await handleDeleteRule(provider, getCurrentCwd(provider), message)
			break
		}
		case "openRuleFile": {
			await handleOpenRuleFile(provider, getCurrentCwd(provider), message)
			break
		}
		case "openRulesDirectory": {
			await handleOpenRulesDirectory(provider, getCurrentCwd(provider), message)
			break
		}
	}
}
