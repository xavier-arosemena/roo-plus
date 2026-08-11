import {
	type WebviewMessage,
	type WebviewMessageType,
	createRuleMessageSchema,
	deleteRuleMessageSchema,
	openRuleFileMessageSchema,
	openRulesDirectoryMessageSchema,
} from "@roo-code/types"

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
			// `values` is a typed object — an invalid `scope`/`kind` enum value is
			// rejected here before any side effects (the helper re-validates too).
			const result = createRuleMessageSchema.safeParse(message)
			if (!result.success) {
				provider.log(`[webviewMessageHandler] Rejected malformed createRule message: ${result.error.message}`)
				break
			}
			await handleCreateRule(provider, getCurrentCwd(provider), result.data)
			break
		}
		case "deleteRule": {
			const result = deleteRuleMessageSchema.safeParse(message)
			if (!result.success) {
				provider.log(`[webviewMessageHandler] Rejected malformed deleteRule message: ${result.error.message}`)
				break
			}
			await handleDeleteRule(provider, getCurrentCwd(provider), result.data)
			break
		}
		case "openRuleFile": {
			const result = openRuleFileMessageSchema.safeParse(message)
			if (!result.success) {
				provider.log(`[webviewMessageHandler] Rejected malformed openRuleFile message: ${result.error.message}`)
				break
			}
			await handleOpenRuleFile(provider, getCurrentCwd(provider), result.data)
			break
		}
		case "openRulesDirectory": {
			const result = openRulesDirectoryMessageSchema.safeParse(message)
			if (!result.success) {
				provider.log(
					`[webviewMessageHandler] Rejected malformed openRulesDirectory message: ${result.error.message}`,
				)
				break
			}
			await handleOpenRulesDirectory(provider, getCurrentCwd(provider), result.data)
			break
		}
	}
}
