import * as vscode from "vscode"
import * as path from "path"
import * as fs from "fs/promises"
import {
	type WebviewMessage,
	type WebviewMessageType,
	deleteMcpServerMessageSchema,
	openMcpSettingsMessageSchema,
	openProjectMcpSettingsMessageSchema,
	refreshAllMcpServersMessageSchema,
	restartMcpServerMessageSchema,
	toggleMcpServerMessageSchema,
	toggleToolAlwaysAllowMessageSchema,
	toggleToolEnabledForPromptMessageSchema,
	updateMcpTimeoutMessageSchema,
} from "@roo-code/types"

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
			const result = deleteMcpServerMessageSchema.safeParse(message)

			if (!result.success) {
				provider.log(
					`[webviewMessageHandler] Rejected malformed deleteMcpServer message: ${result.error.message}`,
				)
				break
			}

			const { serverName, source } = result.data

			if (!serverName) {
				break
			}

			try {
				provider.log(`Attempting to delete MCP server: ${serverName}`)
				await provider.getMcpHub()?.deleteServer(serverName, source)
				provider.log(`Successfully deleted MCP server: ${serverName}`)

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
			const result = restartMcpServerMessageSchema.safeParse(message)

			if (!result.success) {
				provider.log(
					`[webviewMessageHandler] Rejected malformed restartMcpServer message: ${result.error.message}`,
				)
				break
			}

			const { text, source } = result.data

			try {
				await provider.getMcpHub()?.restartConnection(text, source)
			} catch (error) {
				provider.log(
					`Failed to retry connection for ${text}: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
				)
			}
			break
		}
		case "toggleToolAlwaysAllow": {
			const result = toggleToolAlwaysAllowMessageSchema.safeParse(message)

			if (!result.success) {
				provider.log(
					`[webviewMessageHandler] Rejected malformed toggleToolAlwaysAllow message: ${result.error.message}`,
				)
				break
			}

			const { serverName, source, toolName, alwaysAllow } = result.data

			try {
				// `source` is optional on the message (matches the WebviewMessage
				// interface) but McpHub requires it — default to "global" (the
				// sender always provides it; this only covers hand-crafted payloads).
				await provider
					.getMcpHub()
					?.toggleToolAlwaysAllow(serverName, source ?? "global", toolName, Boolean(alwaysAllow))
			} catch (error) {
				provider.log(
					`Failed to toggle auto-approve for tool ${toolName}: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
				)
			}
			break
		}
		case "toggleToolEnabledForPrompt": {
			const result = toggleToolEnabledForPromptMessageSchema.safeParse(message)

			if (!result.success) {
				provider.log(
					`[webviewMessageHandler] Rejected malformed toggleToolEnabledForPrompt message: ${result.error.message}`,
				)
				break
			}

			const { serverName, source, toolName, isEnabled } = result.data

			try {
				// `source` is optional on the message (matches the WebviewMessage
				// interface) but McpHub requires it — default to "global" (the
				// sender always provides it; this only covers hand-crafted payloads).
				await provider
					.getMcpHub()
					?.toggleToolEnabledForPrompt(serverName, source ?? "global", toolName, Boolean(isEnabled))
			} catch (error) {
				provider.log(
					`Failed to toggle enabled for prompt for tool ${toolName}: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
				)
			}
			break
		}
		case "toggleMcpServer": {
			const result = toggleMcpServerMessageSchema.safeParse(message)

			if (!result.success) {
				provider.log(
					`[webviewMessageHandler] Rejected malformed toggleMcpServer message: ${result.error.message}`,
				)
				break
			}

			const { serverName, disabled, source } = result.data

			try {
				await provider.getMcpHub()?.toggleServerDisabled(serverName, disabled, source)
			} catch (error) {
				provider.log(
					`Failed to toggle MCP server ${serverName}: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
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

		case "updateMcpTimeout": {
			const result = updateMcpTimeoutMessageSchema.safeParse(message)

			if (!result.success) {
				provider.log(
					`[webviewMessageHandler] Rejected malformed updateMcpTimeout message: ${result.error.message}`,
				)
				break
			}

			const { serverName, timeout, source } = result.data

			if (serverName && typeof timeout === "number") {
				try {
					await provider.getMcpHub()?.updateServerTimeout(serverName, timeout, source)
				} catch (error) {
					provider.log(
						`Failed to update timeout for ${serverName}: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
					)
					vscode.window.showErrorMessage(t("common:errors.update_server_timeout"))
				}
			}
			break
		}
	}
}
