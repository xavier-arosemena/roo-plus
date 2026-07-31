import { type WebviewMessage, type WebviewMessageType } from "@roo-code/types"

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
			await handleCreateSkill(provider, message)
			break
		}
		case "deleteSkill": {
			await handleDeleteSkill(provider, message)
			break
		}
		case "moveSkill": {
			await handleMoveSkill(provider, message)
			break
		}
		case "updateSkillModes": {
			await handleUpdateSkillModes(provider, message)
			break
		}
		case "openSkillFile": {
			await handleOpenSkillFile(provider, message)
			break
		}
	}
}
