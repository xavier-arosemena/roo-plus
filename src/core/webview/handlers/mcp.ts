import * as vscode from "vscode"
import * as path from "path"
import * as fs from "fs/promises"
import { type WebviewMessage, type WebviewMessageType } from "@roo-code/types"

import { safeWriteJson } from "../../../utils/safeWriteJson"
import { openFile } from "../../../integrations/misc/open-file"
import { fileExistsAtPath } from "../../../utils/fs"
import { t } from "../../../i18n"
import type { ClineProvider } from "../ClineProvider"
import type { MarketplaceManager } from "../../../services/marketplace"
import { getCurrentCwd } from "./shared"

export const mcpMessageTypes: ReadonlySet<WebviewMessageType> = new Set([
	"deleteMcpServer",
	"openMcpSettings",
	"openProjectMcpSettings",
	"refreshAllMcpServers",
	"restartMcpServer",
	"toggleMcpServer",
	"toggleToolAlwaysAllow",
	"toggleToolEnabledForPrompt",
	"updateMcpTimeout",
])

export async function handleMcpMessages(
	provider: Pick<ClineProvider, "getMcpHub" | "getCurrentTask" | "cwd" | "log" | "postStateToWebview">,
	_marketplaceManager: MarketplaceManager | undefined,
	message: WebviewMessage,
): Promise<void> {
	switch (message.type) {
		case "openMcpSettings": {
			const mcpSettingsFilePath = await provider.getMcpHub()?.getMcpSettingsFilePath()

			if (mcpSettingsFilePath) {
				await openFile(mcpSettingsFilePath)
			}

			break
		}
		case "openProjectMcpSettings": {
			if (!vscode.workspace.workspaceFolders?.length) {
				vscode.window.showErrorMessage(t("common:errors.no_workspace"))
				return
			}

			const workspaceFolder = getCurrentCwd(provider)
			const rooDir = path.join(workspaceFolder, ".roo")
			const mcpPath = path.join(rooDir, "mcp.json")

			try {
				await fs.mkdir(rooDir, { recursive: true })
				const exists = await fileExistsAtPath(mcpPath)

				if (!exists) {
					await safeWriteJson(mcpPath, { mcpServers: {} }, { prettyPrint: true })
				}

				await openFile(mcpPath)
			} catch (error) {
				vscode.window.showErrorMessage(t("mcp:errors.create_json", { error: `${error}` }))
			}

			break
		}
		case "deleteMcpServer": {
			if (!message.serverName) {
				break
			}

			try {
				provider.log(`Attempting to delete MCP server: ${message.serverName}`)
				await provider.getMcpHub()?.deleteServer(message.serverName, message.source as "global" | "project")
				provider.log(`Successfully deleted MCP server: ${message.serverName}`)

				// Refresh the webview state
				await provider.postStateToWebview()
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				provider.log(`Failed to delete MCP server: ${errorMessage}`)
				// Error messages are already handled by McpHub.deleteServer
			}
			break
		}
		case "restartMcpServer": {
			try {
				await provider.getMcpHub()?.restartConnection(message.text!, message.source as "global" | "project")
			} catch (error) {
				provider.log(
					`Failed to retry connection for ${message.text}: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
				)
			}
			break
		}
		case "toggleToolAlwaysAllow": {
			try {
				await provider
					.getMcpHub()
					?.toggleToolAlwaysAllow(
						message.serverName!,
						message.source as "global" | "project",
						message.toolName!,
						Boolean(message.alwaysAllow),
					)
			} catch (error) {
				provider.log(
					`Failed to toggle auto-approve for tool ${message.toolName}: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
				)
			}
			break
		}
		case "toggleToolEnabledForPrompt": {
			try {
				await provider
					.getMcpHub()
					?.toggleToolEnabledForPrompt(
						message.serverName!,
						message.source as "global" | "project",
						message.toolName!,
						Boolean(message.isEnabled),
					)
			} catch (error) {
				provider.log(
					`Failed to toggle enabled for prompt for tool ${message.toolName}: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
				)
			}
			break
		}
		case "toggleMcpServer": {
			try {
				await provider
					.getMcpHub()
					?.toggleServerDisabled(
						message.serverName!,
						message.disabled!,
						message.source as "global" | "project",
					)
			} catch (error) {
				provider.log(
					`Failed to toggle MCP server ${message.serverName}: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
				)
			}
			break
		}
		case "refreshAllMcpServers": {
			const mcpHub = provider.getMcpHub()

			if (mcpHub) {
				await mcpHub.refreshAllConnections()
			}

			break
		}

		case "updateMcpTimeout":
			if (message.serverName && typeof message.timeout === "number") {
				try {
					await provider
						.getMcpHub()
						?.updateServerTimeout(
							message.serverName,
							message.timeout,
							message.source as "global" | "project",
						)
				} catch (error) {
					provider.log(
						`Failed to update timeout for ${message.serverName}: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
					)
					vscode.window.showErrorMessage(t("common:errors.update_server_timeout"))
				}
			}
			break
	}
}
