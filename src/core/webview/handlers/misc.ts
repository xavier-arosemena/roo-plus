import * as vscode from "vscode"
import * as path from "path"
import * as os from "os"
import * as fs from "fs/promises"
import { type WebviewMessage, type WebviewMessageType } from "@roo-code/types"
import { customToolRegistry } from "@roo-code/core"
import { TelemetryService } from "@roo-code/telemetry"

import { checkExistKey } from "../../../shared/checkExistApiConfig"
import { getTheme } from "../../../integrations/theme/getTheme"
import { openFile } from "../../../integrations/misc/open-file"
import { searchWorkspaceFiles } from "../../../services/search/file-search"
import { isPathOutsideWorkspace } from "../../../utils/pathUtils"
import { openMention } from "../../mentions"
import { importRooTaskHistory } from "../../task-persistence/importRooTaskHistory"
import { RooIgnoreController } from "../../ignore/RooIgnoreController"
import { getRooDirectoriesForCwd } from "../../../services/roo-config/index.js"
import { getCommand } from "../../../utils/commands"
import { t } from "../../../i18n"
import type { ClineProvider } from "../ClineProvider"
import type { MarketplaceManager } from "../../../services/marketplace"
import { getCurrentCwd, getGlobalState, updateGlobalState } from "./shared"

export const miscMessageTypes: ReadonlySet<WebviewMessageType> = new Set([
	"didShowAnnouncement",
	"dismissUpsell",
	"focusPanelRequest",
	"getDismissedUpsells",
	"importRooHistory",
	"insertTextIntoTextarea",
	"openExternal",
	"openFile",
	"openKeyboardShortcuts",
	"openMarkdownPreview",
	"openMention",
	"readFileContent",
	"refreshCustomTools",
	"requestModes",
	"resetState",
	"searchFiles",
	"switchTab",
	"taskSyncEnabled",
	"webviewDidLaunch",
])

export async function handleMiscMessages(
	provider: Pick<
		ClineProvider,
		| "customModesManager"
		| "contextProxy"
		| "postStateToWebview"
		| "workspaceTracker"
		| "postMessageToWebview"
		| "getMcpHub"
		| "providerSettingsManager"
		| "getState"
		| "getStateToPostToWebview"
		| "isViewLaunched"
		| "log"
		| "latestAnnouncementId"
		| "taskHistoryStore"
		| "resetState"
		| "getCurrentTask"
		| "cwd"
		| "getModes"
		| "activateProviderProfile"
	>,
	_marketplaceManager: MarketplaceManager | undefined,
	message: WebviewMessage,
): Promise<void> {
	switch (message.type) {
		case "webviewDidLaunch":
			// Load custom modes first
			const customModes = await provider.customModesManager.getCustomModes()
			await updateGlobalState(provider, "customModes", customModes)

			await provider.postStateToWebview()
			void provider.workspaceTracker
				?.initializeFilePaths()
				.catch((err) => provider.log(`Workspace initialization error: ${err}`)) // Don't await.

			await getTheme().then((theme) =>
				provider.postMessageToWebview({ type: "theme", text: JSON.stringify(theme) }),
			)

			// If MCP Hub is already initialized, update the webview with
			// current server list.
			const mcpHub = provider.getMcpHub()

			if (mcpHub) {
				await provider.postMessageToWebview({ type: "mcpServers", mcpServers: mcpHub.getAllServers() })
			}

			provider.providerSettingsManager
				.listConfig()
				.then(async (listApiConfig) => {
					if (!listApiConfig) {
						return
					}

					if (listApiConfig.length === 1) {
						// Check if first time init then sync with exist config.
						if (!checkExistKey(listApiConfig[0])) {
							const { apiConfiguration } = await provider.getState()

							// Only save if the current configuration has meaningful settings
							// (e.g., API keys). This prevents saving a default "anthropic"
							// fallback when no real config exists, which can happen during
							// CLI initialization before provider settings are applied.
							if (checkExistKey(apiConfiguration)) {
								await provider.providerSettingsManager.saveConfig(
									listApiConfig[0].name ?? "default",
									apiConfiguration,
								)

								listApiConfig[0].apiProvider = apiConfiguration.apiProvider
							}
						}
					}

					const currentConfigName = getGlobalState(provider, "currentApiConfigName")

					if (currentConfigName) {
						if (!(await provider.providerSettingsManager.hasConfig(currentConfigName))) {
							// Current config name not valid, get first config in list.
							const name = listApiConfig[0]?.name
							await updateGlobalState(provider, "currentApiConfigName", name)

							if (name) {
								await provider.activateProviderProfile({ name })
								return
							}
						}
					}

					await Promise.all([
						await updateGlobalState(provider, "listApiConfigMeta", listApiConfig),
						await provider.postMessageToWebview({ type: "listApiConfig", listApiConfig }),
					])
				})
				.catch((error) =>
					provider.log(
						`Error list api configuration: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
					),
				)

			// Enable telemetry by default (when unset) or when explicitly enabled
			await provider.getStateToPostToWebview().then((state) => {
				const { telemetrySetting } = state
				const isOptedIn = telemetrySetting !== "disabled"
				TelemetryService.instance.updateTelemetryState(isOptedIn)
			})

			provider.isViewLaunched = true
			break
		case "didShowAnnouncement":
			await updateGlobalState(provider, "lastShownAnnouncementId", provider.latestAnnouncementId)
			await provider.postStateToWebview()
			break
		case "importRooHistory": {
			let latestProgress = {
				copiedFileCount: 0,
				totalFileCount: 0,
				importedTaskCount: 0,
				totalTaskCount: 0,
			}

			try {
				await provider.postMessageToWebview({
					type: "rooHistoryImportProgress",
					rooHistoryImportProgress: {
						status: "starting",
						...latestProgress,
					},
				})

				const result = await importRooTaskHistory(
					provider.contextProxy.globalStorageUri.fsPath,
					async (progress) => {
						latestProgress = progress
						await provider.postMessageToWebview({
							type: "rooHistoryImportProgress",
							rooHistoryImportProgress: {
								status: "copying",
								...progress,
							},
						})
					},
				)

				if (result.foundTaskCount === 0) {
					await provider.postMessageToWebview({
						type: "rooHistoryImportProgress",
						rooHistoryImportProgress: {
							status: "finished",
							...latestProgress,
						},
					})
					vscode.window.showWarningMessage(
						t("common:warnings.rooHistoryImport.nothingFound", { domain: result.rooExtensionDomain }),
					)
					break
				}

				// Refresh history whenever Roo tasks were found — even if all already existed —
				// so a retry after a partial-copy failure still reconciles the store.
				await provider.taskHistoryStore.invalidateAll()
				await provider.taskHistoryStore.reconcile()
				await provider.taskHistoryStore.flushIndex()
				await provider.postStateToWebview()
				await provider.postMessageToWebview({
					type: "rooHistoryImportProgress",
					rooHistoryImportProgress: {
						status: "finished",
						...latestProgress,
						copiedFileCount: result.importedFileCount,
						totalFileCount: latestProgress.totalFileCount || result.importedFileCount,
						importedTaskCount: result.importedTaskCount,
						totalTaskCount: latestProgress.totalTaskCount || result.importedTaskCount,
					},
				})

				if (result.importedTaskCount === 0) {
					vscode.window.showWarningMessage(
						t("common:warnings.rooHistoryImport.alreadyImported", { count: result.foundTaskCount }),
					)
				} else {
					vscode.window.showInformationMessage(
						t("common:info.rooHistoryImport.success", { count: result.importedTaskCount }),
					)
				}
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error)
				provider.log(`[importRooHistory] failed: ${message}`)
				await provider.postMessageToWebview({
					type: "rooHistoryImportProgress",
					rooHistoryImportProgress: {
						status: "failed",
						...latestProgress,
					},
				})
				vscode.window.showErrorMessage(t("common:errors.rooHistoryImport", { error: message }))
			}
			break
		}
		case "resetState":
			await provider.resetState()
			break
		case "openFile":
			let filePath: string = message.text!
			if (!path.isAbsolute(filePath)) {
				filePath = path.join(getCurrentCwd(provider), filePath)
			}
			await openFile(filePath, message.values as { create?: boolean; content?: string; line?: number })
			break
		case "readFileContent": {
			const relPath = message.text || ""
			if (!relPath) {
				await provider.postMessageToWebview({
					type: "fileContent",
					fileContent: { path: relPath, content: null, error: "No path provided" },
				})
				break
			}
			try {
				const cwd = getCurrentCwd(provider)
				if (!cwd) {
					await provider.postMessageToWebview({
						type: "fileContent",
						fileContent: { path: relPath, content: null, error: "No workspace path available" },
					})
					break
				}
				const absPath = path.resolve(cwd, relPath)
				// Workspace-boundary validation: prevent path traversal attacks
				if (isPathOutsideWorkspace(absPath)) {
					await provider.postMessageToWebview({
						type: "fileContent",
						fileContent: { path: relPath, content: null, error: "Path is outside workspace" },
					})
					break
				}
				const content = await fs.readFile(absPath, "utf-8")
				await provider.postMessageToWebview({ type: "fileContent", fileContent: { path: relPath, content } })
			} catch (err) {
				const errorMsg = err instanceof Error ? err.message : String(err)
				await provider.postMessageToWebview({
					type: "fileContent",
					fileContent: { path: relPath, content: null, error: errorMsg },
				})
			}
			break
		}
		case "openMention":
			await openMention(getCurrentCwd(provider), message.text)
			break
		case "openExternal":
			if (message.url) {
				vscode.env.openExternal(vscode.Uri.parse(message.url))
			}
			break
		case "openKeyboardShortcuts": {
			// Open VSCode keyboard shortcuts settings and optionally filter to show the Roo Code commands
			const searchQuery = message.text || ""
			if (searchQuery) {
				// Open with a search query pre-filled
				await vscode.commands.executeCommand("workbench.action.openGlobalKeybindings", searchQuery)
			} else {
				// Just open the keyboard shortcuts settings
				await vscode.commands.executeCommand("workbench.action.openGlobalKeybindings")
			}
			break
		}
		case "taskSyncEnabled":
			provider.log("Ignoring taskSyncEnabled update because cloud task sync is disabled")
			break

		case "searchFiles": {
			const workspacePath = getCurrentCwd(provider)

			if (!workspacePath) {
				// Handle case where workspace path is not available
				await provider.postMessageToWebview({
					type: "fileSearchResults",
					results: [],
					requestId: message.requestId,
					error: "No workspace path available",
				})
				break
			}
			try {
				// Call file search service with query from message
				const results = await searchWorkspaceFiles(
					message.query || "",
					workspacePath,
					20, // Use default limit, as filtering is now done in the backend
				)

				// Get the RooIgnoreController from the current task, or create a new one
				const currentTask = provider.getCurrentTask()
				let rooIgnoreController = currentTask?.rooIgnoreController
				let tempController: RooIgnoreController | undefined

				// If no current task or no controller, create a temporary one
				if (!rooIgnoreController) {
					tempController = new RooIgnoreController(workspacePath)
					await tempController.initialize()
					rooIgnoreController = tempController
				}

				try {
					// Get showRooIgnoredFiles setting from state
					const { showRooIgnoredFiles = false } = (await provider.getState()) ?? {}

					// Filter results using RooIgnoreController if showRooIgnoredFiles is false
					let filteredResults = results
					if (!showRooIgnoredFiles && rooIgnoreController) {
						const allowedPaths = rooIgnoreController.filterPaths(results.map((r) => r.path))
						filteredResults = results.filter((r) => allowedPaths.includes(r.path))
					}

					// Send results back to webview
					await provider.postMessageToWebview({
						type: "fileSearchResults",
						results: filteredResults,
						requestId: message.requestId,
					})
				} finally {
					// Dispose temporary controller to prevent resource leak
					tempController?.dispose()
				}
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)

				// Send error response to webview
				await provider.postMessageToWebview({
					type: "fileSearchResults",
					results: [],
					error: errorMessage,
					requestId: message.requestId,
				})
			}
			break
		}
		case "refreshCustomTools": {
			try {
				const toolDirs = getRooDirectoriesForCwd(getCurrentCwd(provider)).map((dir) => path.join(dir, "tools"))
				await customToolRegistry.loadFromDirectories(toolDirs)

				await provider.postMessageToWebview({
					type: "customToolsResult",
					tools: customToolRegistry.getAllSerialized(),
				})
			} catch (error) {
				await provider.postMessageToWebview({
					type: "customToolsResult",
					tools: [],
					error: error instanceof Error ? error.message : String(error),
				})
			}

			break
		}
		case "focusPanelRequest": {
			// Execute the focusPanel command to focus the WebView
			await vscode.commands.executeCommand(getCommand("focusPanel"))
			break
		}
		case "switchTab": {
			if (message.tab) {
				// Capture tab shown event for all switchTab messages (which are user-initiated).
				if (TelemetryService.hasInstance()) {
					TelemetryService.instance.captureTabShown(message.tab)
				}

				await provider.postMessageToWebview({
					type: "action",
					action: "switchTab",
					tab: message.tab,
					values: message.values,
				})
			}
			break
		}
		case "requestModes": {
			try {
				const modes = await provider.getModes()
				await provider.postMessageToWebview({ type: "modes", modes })
			} catch (error) {
				provider.log(`Error fetching modes: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`)
				await provider.postMessageToWebview({ type: "modes", modes: [] })
			}
			break
		}
		case "insertTextIntoTextarea": {
			const text = message.text
			if (text) {
				// Send message to insert text into the chat textarea
				await provider.postMessageToWebview({
					type: "insertTextIntoTextarea",
					text: text,
				})
			}
			break
		}
		case "dismissUpsell": {
			if (message.upsellId) {
				try {
					// Get current list of dismissed upsells
					const dismissedUpsells = getGlobalState(provider, "dismissedUpsells") || []

					// Add the new upsell ID if not already present
					let updatedList = dismissedUpsells
					if (!dismissedUpsells.includes(message.upsellId)) {
						updatedList = [...dismissedUpsells, message.upsellId]
						await updateGlobalState(provider, "dismissedUpsells", updatedList)
					}

					// Send updated list back to webview (use the already computed updatedList)
					await provider.postMessageToWebview({
						type: "dismissedUpsells",
						list: updatedList,
					})
				} catch (error) {
					// Fail silently as per Bruno's comment - it's OK to fail silently in this case
					provider.log(`Failed to dismiss upsell: ${error instanceof Error ? error.message : String(error)}`)
				}
			}
			break
		}
		case "getDismissedUpsells": {
			// Send the current list of dismissed upsells to the webview
			const dismissedUpsells = getGlobalState(provider, "dismissedUpsells") || []
			await provider.postMessageToWebview({
				type: "dismissedUpsells",
				list: dismissedUpsells,
			})
			break
		}

		case "openMarkdownPreview": {
			if (message.text) {
				try {
					// Create a private temporary directory (mode 0700) so the temp
					// file is not written with a predictable name into the shared
					// os.tmpdir(). mkdtemp creates a unique directory atomically,
					// avoiding insecure temp-file creation and symlink attacks.
					const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "roo-preview-"))
					const tempFilePath = path.join(tmpDir, "preview.md")

					await fs.writeFile(tempFilePath, message.text, { encoding: "utf8", mode: 0o600 })

					const doc = await vscode.workspace.openTextDocument(tempFilePath)
					await vscode.commands.executeCommand("markdown.showPreview", doc.uri)
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : String(error)
					provider.log(`Error opening markdown preview: ${errorMessage}`)
					vscode.window.showErrorMessage(`Failed to open markdown preview: ${errorMessage}`)
				}
			}
			break
		}
	}
}
