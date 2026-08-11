import {
	type WebviewMessage,
	type WebviewMessageType,
	createSkillMessageSchema,
	deleteSkillMessageSchema,
	moveSkillMessageSchema,
	openSkillFileMessageSchema,
	updateSkillModesMessageSchema,
} from "@roo-code/types"

import {
	handleCreateSkill,
	handleDeleteSkill,
	handleMoveSkill,
	handleOpenSkillFile,
	handleRequestSkills,
	handleUpdateSkillModes,
} from "../skillsMessageHandler"
import type { ClineProvider } from "../ClineProvider"
import type { MarketplaceManager } from "../../../services/marketplace"

export const skillsMessageTypes: ReadonlySet<WebviewMessageType> = new Set([
	"createSkill",
	"deleteSkill",
	"moveSkill",
	"openSkillFile",
	"requestSkills",
	"updateSkillModes",
])

export async function handleSkillsMessages(
	provider: Pick<ClineProvider, "getSkillsManager" | "postMessageToWebview" | "log">,
	_marketplaceManager: MarketplaceManager | undefined,
	message: WebviewMessage,
): Promise<void> {
	switch (message.type) {
		case "requestSkills": {
			await handleRequestSkills(provider)
			break
		}
		case "createSkill": {
			// `skillName`, `source` and `skillDescription` are required — the handler
			// previously null-checked them, so a crafted message is rejected here
			// before any side effects (the helper re-validates defensively too).
			const result = createSkillMessageSchema.safeParse(message)
			if (!result.success) {
				provider.log(`[webviewMessageHandler] Rejected malformed createSkill message: ${result.error.message}`)
				break
			}
			await handleCreateSkill(provider, result.data)
			break
		}
		case "deleteSkill": {
			// `skillName` and `source` are required.
			const result = deleteSkillMessageSchema.safeParse(message)
			if (!result.success) {
				provider.log(`[webviewMessageHandler] Rejected malformed deleteSkill message: ${result.error.message}`)
				break
			}
			await handleDeleteSkill(provider, result.data)
			break
		}
		case "moveSkill": {
			// `skillName` and `source` are required.
			const result = moveSkillMessageSchema.safeParse(message)
			if (!result.success) {
				provider.log(`[webviewMessageHandler] Rejected malformed moveSkill message: ${result.error.message}`)
				break
			}
			await handleMoveSkill(provider, result.data)
			break
		}
		case "updateSkillModes": {
			// `skillName` and `source` are required.
			const result = updateSkillModesMessageSchema.safeParse(message)
			if (!result.success) {
				provider.log(
					`[webviewMessageHandler] Rejected malformed updateSkillModes message: ${result.error.message}`,
				)
				break
			}
			await handleUpdateSkillModes(provider, result.data)
			break
		}
		case "openSkillFile": {
			// `skillName` and `source` are required.
			const result = openSkillFileMessageSchema.safeParse(message)
			if (!result.success) {
				provider.log(
					`[webviewMessageHandler] Rejected malformed openSkillFile message: ${result.error.message}`,
				)
				break
			}
			await handleOpenSkillFile(provider, result.data)
			break
		}
	}
}
