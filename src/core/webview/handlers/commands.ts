import * as vscode from "vscode"
import * as os from "os"
import * as path from "path"
import * as fs from "fs/promises"
import {
	type Command as SlashCommand,
	type WebviewMessage,
	type WebviewMessageType,
	createCommandMessageSchema,
	deleteCommandMessageSchema,
	openCommandFileMessageSchema,
} from "@roo-code/types"

import { openFile } from "../../../integrations/misc/open-file"
import { defaultModeSlug } from "../../../shared/modes"
import { t } from "../../../i18n"
import type { ClineProvider } from "../ClineProvider"
import type { MarketplaceManager } from "../../../services/marketplace"
import { getCurrentCwd } from "./shared"

export const commandsMessageTypes: ReadonlySet<WebviewMessageType> = new Set([
	"createCommand",
	"deleteCommand",
	"openCommandFile",
	"requestCommands",
])

const getCurrentMode = async (provider: Pick<ClineProvider, "getCurrentTask" | "getState" | "log">) => {
	const currentTask = provider.getCurrentTask()

	if (currentTask) {
		try {
			return await currentTask.getTaskMode()
		} catch (error) {
			provider.log(
				`Error resolving current task mode for command discovery: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
			)
		}
	}

	try {
		const state = await provider.getState()
		if (typeof state.mode === "string" && state.mode.length > 0) {
			return state.mode
		}
	} catch (error) {
		provider.log(
			`Error resolving global mode for command discovery: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
		)
	}

	return defaultModeSlug
}

const getDiscoveredCommands = async (
	provider: Pick<ClineProvider, "getCurrentTask" | "cwd" | "getSkillsManager" | "getState" | "log">,
): Promise<SlashCommand[]> => {
	const { getCommands } = await import("../../../services/command/commands")
	const commands = await getCommands(getCurrentCwd(provider))

	const commandList: SlashCommand[] = commands.map((command) => ({
		name: command.name,
		source: command.source,
		filePath: command.filePath,
		description: command.description,
		argumentHint: command.argumentHint,
	}))

	const existingCommandNames = new Set(commandList.map((command) => command.name))
	const skillsManager = provider.getSkillsManager()

	if (!skillsManager) {
		return commandList
	}

	const currentMode = await getCurrentMode(provider)
	const availableSkills = skillsManager.getSkillsForMode(currentMode)

	for (const skill of availableSkills) {
		if (existingCommandNames.has(skill.name)) {
			continue
		}

		existingCommandNames.add(skill.name)
		commandList.push({
			name: skill.name,
			source: skill.source,
			filePath: skill.path,
			description: skill.description,
		})
	}

	return commandList
}

export async function handleCommandsMessages(
	provider: Pick<
		ClineProvider,
		"getCurrentTask" | "cwd" | "getSkillsManager" | "getState" | "log" | "postMessageToWebview"
	>,
	_marketplaceManager: MarketplaceManager | undefined,
	message: WebviewMessage,
): Promise<void> {
	switch (message.type) {
		case "requestCommands": {
			try {
				const commandList = await getDiscoveredCommands(provider)
				await provider.postMessageToWebview({ type: "commands", commands: commandList })
			} catch (error) {
				provider.log(`Error fetching commands: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`)
				await provider.postMessageToWebview({ type: "commands", commands: [] })
			}
			break
		}
		case "openCommandFile": {
			// `text` is a string — a non-string `text` is rejected here before
			// any command lookup or file open.
			const result = openCommandFileMessageSchema.safeParse(message)
			if (!result.success) {
				provider.log(
					`[webviewMessageHandler] Rejected malformed openCommandFile message: ${result.error.message}`,
				)
				break
			}
			try {
				if (result.data.text) {
					const { getCommand } = await import("../../../services/command/commands")
					const command = await getCommand(getCurrentCwd(provider), result.data.text)

					if (command && command.filePath) {
						await openFile(command.filePath)
					} else {
						vscode.window.showErrorMessage(t("common:errors.command_not_found", { name: result.data.text }))
					}
				}
			} catch (error) {
				provider.log(
					`Error opening command file: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
				)
				vscode.window.showErrorMessage(t("common:errors.open_command_file"))
			}
			break
		}
		case "deleteCommand": {
			// `values.source` is a typed enum — an invalid `source` value is
			// rejected here before any file deletion.
			const result = deleteCommandMessageSchema.safeParse(message)
			if (!result.success) {
				provider.log(
					`[webviewMessageHandler] Rejected malformed deleteCommand message: ${result.error.message}`,
				)
				break
			}
			try {
				if (result.data.text && result.data.values?.source) {
					const { getCommand } = await import("../../../services/command/commands")
					const command = await getCommand(getCurrentCwd(provider), result.data.text)

					if (command && command.filePath) {
						// Delete the command file
						await fs.unlink(command.filePath)
						provider.log(`Deleted command file: ${command.filePath}`)
					} else {
						vscode.window.showErrorMessage(t("common:errors.command_not_found", { name: result.data.text }))
					}
				}
			} catch (error) {
				provider.log(`Error deleting command: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`)
				vscode.window.showErrorMessage(t("common:errors.delete_command"))
			}
			break
		}
		case "createCommand": {
			// `values.source` is a typed enum (`"global" | "project" | undefined`)
			// — the runtime `as "global" | "project"` cast is gone and an invalid
			// `source` value is rejected here before any directory/file write.
			const result = createCommandMessageSchema.safeParse(message)
			if (!result.success) {
				provider.log(
					`[webviewMessageHandler] Rejected malformed createCommand message: ${result.error.message}`,
				)
				break
			}
			try {
				const source = result.data.values?.source
				const fileName = result.data.text // Custom filename from user input

				if (!source) {
					provider.log("Missing source for createCommand")
					break
				}

				// Determine the commands directory based on source
				let commandsDir: string
				if (source === "global") {
					const globalConfigDir = path.join(os.homedir(), ".roo")
					commandsDir = path.join(globalConfigDir, "commands")
				} else {
					if (!vscode.workspace.workspaceFolders?.length) {
						vscode.window.showErrorMessage(t("common:errors.no_workspace"))
						return
					}
					// Project commands
					const workspaceRoot = getCurrentCwd(provider)
					if (!workspaceRoot) {
						vscode.window.showErrorMessage(t("common:errors.no_workspace_for_project_command"))
						break
					}
					commandsDir = path.join(workspaceRoot, ".roo", "commands")
				}

				// Ensure the commands directory exists
				await fs.mkdir(commandsDir, { recursive: true })

				// Use provided filename or generate a unique one
				let commandName: string
				if (fileName && fileName.trim()) {
					let cleanFileName = fileName.trim()

					// Strip leading slash if present
					if (cleanFileName.startsWith("/")) {
						cleanFileName = cleanFileName.substring(1)
					}

					// Remove .md extension if present BEFORE slugification
					if (cleanFileName.toLowerCase().endsWith(".md")) {
						cleanFileName = cleanFileName.slice(0, -3)
					}

					// Slugify the command name: lowercase, replace spaces with dashes, remove special characters
					commandName = cleanFileName
						.toLowerCase()
						.replace(/\s+/g, "-") // Replace spaces with dashes
						.replace(/[^a-z0-9-]/g, "") // Remove special characters except dashes
						.replace(/-+/g, "-") // Replace multiple dashes with single dash
						.replace(/^-|-$/g, "") // Remove leading/trailing dashes

					// Ensure we have a valid command name
					if (!commandName || commandName.length === 0) {
						commandName = "new-command"
					}
				} else {
					// Generate a unique command name
					commandName = "new-command"
					let counter = 1
					let filePath = path.join(commandsDir, `${commandName}.md`)

					while (
						await fs
							.access(filePath)
							.then(() => true)
							.catch(() => false)
					) {
						commandName = `new-command-${counter}`
						filePath = path.join(commandsDir, `${commandName}.md`)
						counter++
					}
				}

				const filePath = path.join(commandsDir, `${commandName}.md`)

				// Create the command file with template content. Use the "wx"
				// exclusive flag so the write fails atomically if the file already
				// exists, avoiding a check-then-act (TOCTOU) race between an
				// fs.access probe and the write.
				const templateContent = t("common:errors.command_template_content")

				try {
					await fs.writeFile(filePath, templateContent, { encoding: "utf8", flag: "wx" })
				} catch (error) {
					const code = (error as NodeJS.ErrnoException).code
					if (code === "EEXIST") {
						vscode.window.showErrorMessage(t("common:errors.command_already_exists", { commandName }))
						break
					}
					throw error
				}
				provider.log(`Created new command file: ${filePath}`)

				// Open the new file in the editor
				await openFile(filePath)

				// Refresh commands list
				const { getCommands } = await import("../../../services/command/commands")
				const commands = await getCommands(getCurrentCwd(provider) || "")
				const commandList = commands.map((command) => ({
					name: command.name,
					source: command.source,
					filePath: command.filePath,
					description: command.description,
					argumentHint: command.argumentHint,
				}))
				await provider.postMessageToWebview({
					type: "commands",
					commands: commandList,
				})
			} catch (error) {
				provider.log(`Error creating command: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`)
				vscode.window.showErrorMessage(t("common:errors.create_command_failed"))
			}
			break
		}
	}
}
