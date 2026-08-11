import * as vscode from "vscode"

import type { SkillMetadata } from "@roo-code/types"
import {
	type SkillsMessage,
	createSkillMessageSchema,
	deleteSkillMessageSchema,
	moveSkillMessageSchema,
	openSkillFileMessageSchema,
	updateSkillModesMessageSchema,
} from "@roo-code/types"

import type { ClineProvider } from "./ClineProvider"
import { openFile } from "../../integrations/misc/open-file"
import { t } from "../../i18n"

export type SkillsProvider = Pick<ClineProvider, "getSkillsManager" | "postMessageToWebview" | "log">

/**
 * Handles the requestSkills message - returns all skills metadata
 */
export async function handleRequestSkills(provider: SkillsProvider): Promise<SkillMetadata[]> {
	try {
		const skillsManager = provider.getSkillsManager()
		if (skillsManager) {
			const skills = skillsManager.getSkillsMetadata()
			await provider.postMessageToWebview({ type: "skills", skills })
			return skills
		} else {
			await provider.postMessageToWebview({ type: "skills", skills: [] })
			return []
		}
	} catch (error) {
		provider.log(`Error fetching skills: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`)
		await provider.postMessageToWebview({ type: "skills", skills: [] })
		return []
	}
}

/**
 * Handles the createSkill message - creates a new skill
 */
export async function handleCreateSkill(
	provider: SkillsProvider,
	message: SkillsMessage,
): Promise<SkillMetadata[] | undefined> {
	// `skillName`, `source` and `skillDescription` are required — reject malformed
	// payloads before any side effects (source is now a z.enum, no cast needed).
	const result = createSkillMessageSchema.safeParse(message)
	if (!result.success) {
		provider.log(`[skillsMessageHandler] Rejected malformed createSkill message: ${result.error.message}`)
		return undefined
	}

	const { skillName, source, skillDescription, skillModeSlugs, skillMode } = result.data
	// Support new modeSlugs array or fall back to legacy skillMode
	const modeSlugs = skillModeSlugs ?? (skillMode ? [skillMode] : undefined)

	try {
		const skillsManager = provider.getSkillsManager()
		if (!skillsManager) {
			throw new Error(t("skills:errors.manager_unavailable"))
		}

		const createdPath = await skillsManager.createSkill(skillName, source, skillDescription, modeSlugs)

		// Open the created file in the editor
		await openFile(createdPath)

		// Send updated skills list
		const skills = skillsManager.getSkillsMetadata()
		await provider.postMessageToWebview({ type: "skills", skills })
		return skills
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error)
		provider.log(`Error creating skill: ${errorMessage}`)
		vscode.window.showErrorMessage(`Failed to create skill: ${errorMessage}`)
		return undefined
	}
}

/**
 * Handles the deleteSkill message - deletes a skill
 */
export async function handleDeleteSkill(
	provider: SkillsProvider,
	message: SkillsMessage,
): Promise<SkillMetadata[] | undefined> {
	// `skillName` and `source` are required — reject malformed payloads first.
	const result = deleteSkillMessageSchema.safeParse(message)
	if (!result.success) {
		provider.log(`[skillsMessageHandler] Rejected malformed deleteSkill message: ${result.error.message}`)
		return undefined
	}

	const { skillName, source, skillModeSlugs, skillMode } = result.data
	// Support new skillModeSlugs array or fall back to legacy skillMode
	const skillModeToDelete = skillModeSlugs?.[0] ?? skillMode

	try {
		const skillsManager = provider.getSkillsManager()
		if (!skillsManager) {
			throw new Error(t("skills:errors.manager_unavailable"))
		}

		await skillsManager.deleteSkill(skillName, source, skillModeToDelete)

		// Send updated skills list
		const skills = skillsManager.getSkillsMetadata()
		await provider.postMessageToWebview({ type: "skills", skills })
		return skills
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error)
		provider.log(`Error deleting skill: ${errorMessage}`)
		vscode.window.showErrorMessage(`Failed to delete skill: ${errorMessage}`)
		return undefined
	}
}

/**
 * Handles the moveSkill message - moves a skill to a different mode
 */
export async function handleMoveSkill(
	provider: SkillsProvider,
	message: SkillsMessage,
): Promise<SkillMetadata[] | undefined> {
	// `skillName` and `source` are required — reject malformed payloads first.
	const result = moveSkillMessageSchema.safeParse(message)
	if (!result.success) {
		provider.log(`[skillsMessageHandler] Rejected malformed moveSkill message: ${result.error.message}`)
		return undefined
	}

	const { skillName, source, skillMode, newSkillMode } = result.data

	try {
		const skillsManager = provider.getSkillsManager()
		if (!skillsManager) {
			throw new Error(t("skills:errors.manager_unavailable"))
		}

		await skillsManager.moveSkill(skillName, source, skillMode, newSkillMode)

		// Send updated skills list
		const skills = skillsManager.getSkillsMetadata()
		await provider.postMessageToWebview({ type: "skills", skills })
		return skills
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error)
		provider.log(`Error moving skill: ${errorMessage}`)
		vscode.window.showErrorMessage(`Failed to move skill: ${errorMessage}`)
		return undefined
	}
}

/**
 * Handles the updateSkillModes message - updates the mode associations for a skill
 */
export async function handleUpdateSkillModes(
	provider: SkillsProvider,
	message: SkillsMessage,
): Promise<SkillMetadata[] | undefined> {
	// `skillName` and `source` are required — reject malformed payloads first.
	const result = updateSkillModesMessageSchema.safeParse(message)
	if (!result.success) {
		provider.log(`[skillsMessageHandler] Rejected malformed updateSkillModes message: ${result.error.message}`)
		return undefined
	}

	const { skillName, source, newSkillModeSlugs } = result.data

	try {
		const skillsManager = provider.getSkillsManager()
		if (!skillsManager) {
			throw new Error(t("skills:errors.manager_unavailable"))
		}

		await skillsManager.updateSkillModes(skillName, source, newSkillModeSlugs)

		// Send updated skills list
		const skills = skillsManager.getSkillsMetadata()
		await provider.postMessageToWebview({ type: "skills", skills })
		return skills
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error)
		provider.log(`Error updating skill modes: ${errorMessage}`)
		vscode.window.showErrorMessage(`Failed to update skill modes: ${errorMessage}`)
		return undefined
	}
}

/**
 * Handles the openSkillFile message - opens a skill file in the editor
 */
export async function handleOpenSkillFile(provider: SkillsProvider, message: SkillsMessage): Promise<void> {
	// `skillName` and `source` are required — reject malformed payloads first.
	const result = openSkillFileMessageSchema.safeParse(message)
	if (!result.success) {
		provider.log(`[skillsMessageHandler] Rejected malformed openSkillFile message: ${result.error.message}`)
		return
	}

	const { skillName, source } = result.data

	try {
		const skillsManager = provider.getSkillsManager()
		if (!skillsManager) {
			throw new Error(t("skills:errors.manager_unavailable"))
		}

		// Find skill by name and source (skills may have modeSlugs arrays now)
		const skill = skillsManager.findSkillByNameAndSource(skillName, source)
		if (!skill) {
			throw new Error(t("skills:errors.skill_not_found", { name: skillName }))
		}

		await openFile(skill.path)
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error)
		provider.log(`Error opening skill file: ${errorMessage}`)
		vscode.window.showErrorMessage(`Failed to open skill file: ${errorMessage}`)
	}
}
