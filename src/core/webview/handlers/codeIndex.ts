import { type WebviewMessage, type WebviewMessageType } from "@roo-code/types"

import { CodeIndexManager } from "../../../services/code-index/manager"
import { t } from "../../../i18n"
import type { ClineProvider } from "../ClineProvider"
import type { MarketplaceManager } from "../../../services/marketplace"
import { getGlobalState, updateGlobalState } from "./shared"

export const codeIndexMessageTypes: ReadonlySet<WebviewMessageType> = new Set([
	"clearIndexData",
	"requestCodeIndexSecretStatus",
	"requestIndexingStatus",
	"saveCodeIndexSettingsAtomic",
	"setAutoEnableDefault",
	"startIndexing",
	"stopIndexing",
	"toggleWorkspaceIndexing",
])

export async function handleCodeIndexMessages(
	provider: Pick<
		ClineProvider,
		| "contextProxy"
		| "context"
		| "postMessageToWebview"
		| "postStateToWebview"
		| "getCurrentWorkspaceCodeIndexManager"
		| "log"
	>,
	_marketplaceManager: MarketplaceManager | undefined,
	message: WebviewMessage,
): Promise<void> {
	switch (message.type) {
		case "saveCodeIndexSettingsAtomic": {
			if (!message.codeIndexSettings) {
				break
			}

			const settings = message.codeIndexSettings

			try {
				// Check if embedder provider has changed
				const currentConfig = getGlobalState(provider, "codebaseIndexConfig") || {}
				const embedderProviderChanged =
					currentConfig.codebaseIndexEmbedderProvider !== settings.codebaseIndexEmbedderProvider

				// Save global state settings atomically
				const globalStateConfig = {
					...currentConfig,
					codebaseIndexEnabled: settings.codebaseIndexEnabled,
					codebaseIndexQdrantUrl: settings.codebaseIndexQdrantUrl,
					codebaseIndexEmbedderProvider: settings.codebaseIndexEmbedderProvider,
					codebaseIndexEmbedderBaseUrl: settings.codebaseIndexEmbedderBaseUrl,
					codebaseIndexEmbedderModelId: settings.codebaseIndexEmbedderModelId,
					codebaseIndexEmbedderModelDimension: settings.codebaseIndexEmbedderModelDimension, // Generic dimension
					codebaseIndexOpenAiCompatibleBaseUrl: settings.codebaseIndexOpenAiCompatibleBaseUrl,
					codebaseIndexBedrockRegion: settings.codebaseIndexBedrockRegion,
					codebaseIndexBedrockProfile: settings.codebaseIndexBedrockProfile,
					codebaseIndexSearchMaxResults: settings.codebaseIndexSearchMaxResults,
					codebaseIndexSearchMinScore: settings.codebaseIndexSearchMinScore,
					codebaseIndexOpenRouterSpecificProvider: settings.codebaseIndexOpenRouterSpecificProvider,
					codebaseIndexSembleBinaryPath: settings.codebaseIndexSembleBinaryPath,
				}

				// Save global state first
				await updateGlobalState(provider, "codebaseIndexConfig", globalStateConfig)

				// Save secrets directly using context proxy
				if (settings.codeIndexOpenAiKey !== undefined) {
					await provider.contextProxy.storeSecret("codeIndexOpenAiKey", settings.codeIndexOpenAiKey)
				}
				if (settings.codeIndexQdrantApiKey !== undefined) {
					await provider.contextProxy.storeSecret("codeIndexQdrantApiKey", settings.codeIndexQdrantApiKey)
				}
				if (settings.codebaseIndexOpenAiCompatibleApiKey !== undefined) {
					await provider.contextProxy.storeSecret(
						"codebaseIndexOpenAiCompatibleApiKey",
						settings.codebaseIndexOpenAiCompatibleApiKey,
					)
				}
				if (settings.codebaseIndexGeminiApiKey !== undefined) {
					await provider.contextProxy.storeSecret(
						"codebaseIndexGeminiApiKey",
						settings.codebaseIndexGeminiApiKey,
					)
				}
				if (settings.codebaseIndexMistralApiKey !== undefined) {
					await provider.contextProxy.storeSecret(
						"codebaseIndexMistralApiKey",
						settings.codebaseIndexMistralApiKey,
					)
				}
				if (settings.codebaseIndexVercelAiGatewayApiKey !== undefined) {
					await provider.contextProxy.storeSecret(
						"codebaseIndexVercelAiGatewayApiKey",
						settings.codebaseIndexVercelAiGatewayApiKey,
					)
				}
				if (settings.codebaseIndexOpenRouterApiKey !== undefined) {
					await provider.contextProxy.storeSecret(
						"codebaseIndexOpenRouterApiKey",
						settings.codebaseIndexOpenRouterApiKey,
					)
				}

				// Send success response first - settings are saved regardless of validation
				await provider.postMessageToWebview({
					type: "codeIndexSettingsSaved",
					success: true,
					settings: globalStateConfig,
				})

				// Update webview state
				await provider.postStateToWebview()

				// Then handle validation and initialization for the current workspace
				const currentCodeIndexManager = provider.getCurrentWorkspaceCodeIndexManager()
				if (currentCodeIndexManager) {
					// If embedder provider changed, perform proactive validation
					if (embedderProviderChanged) {
						try {
							// Force handleSettingsChange which will trigger validation
							await currentCodeIndexManager.handleSettingsChange(provider.contextProxy)
						} catch (error) {
							// Validation failed - the error state is already set by handleSettingsChange
							provider.log(
								`Embedder validation failed after provider change: ${error instanceof Error ? error.message : String(error)}`,
							)
							// Send validation error to webview
							await provider.postMessageToWebview({
								type: "indexingStatusUpdate",
								values: currentCodeIndexManager.getCurrentStatus(),
							})
							// Exit early - don't try to start indexing with invalid configuration
							break
						}
					} else {
						// No provider change, just handle settings normally
						try {
							await currentCodeIndexManager.handleSettingsChange(provider.contextProxy)
						} catch (error) {
							// Log but don't fail - settings are saved
							provider.log(
								`Settings change handling error: ${error instanceof Error ? error.message : String(error)}`,
							)
						}
					}

					// Wait a bit more to ensure everything is ready
					await new Promise((resolve) => setTimeout(resolve, 200))

					// Auto-start indexing if now enabled and configured
					if (currentCodeIndexManager.isFeatureEnabled && currentCodeIndexManager.isFeatureConfigured) {
						if (!currentCodeIndexManager.isInitialized) {
							try {
								await currentCodeIndexManager.initialize(provider.contextProxy)
								provider.log(`Code index manager initialized after settings save`)
							} catch (error) {
								provider.log(
									`Code index initialization failed: ${error instanceof Error ? error.message : String(error)}`,
								)
								// Send error status to webview
								await provider.postMessageToWebview({
									type: "indexingStatusUpdate",
									values: currentCodeIndexManager.getCurrentStatus(),
								})
							}
						}
					}
				} else {
					// No workspace open - send error status
					provider.log("Cannot save code index settings: No workspace folder open")
					await provider.postMessageToWebview({
						type: "indexingStatusUpdate",
						values: {
							systemStatus: "Error",
							message: t("embeddings:orchestrator.indexingRequiresWorkspace"),
							processedItems: 0,
							totalItems: 0,
							currentItemUnit: "items",
						},
					})
				}
			} catch (error) {
				provider.log(`Error saving code index settings: ${error.message || error}`)
				await provider.postMessageToWebview({
					type: "codeIndexSettingsSaved",
					success: false,
					error: error.message || "Failed to save settings",
				})
			}
			break
		}

		case "requestIndexingStatus": {
			const manager = provider.getCurrentWorkspaceCodeIndexManager()
			if (!manager) {
				// No workspace open - send error status
				await provider.postMessageToWebview({
					type: "indexingStatusUpdate",
					values: {
						systemStatus: "Error",
						message: t("embeddings:orchestrator.indexingRequiresWorkspace"),
						processedItems: 0,
						totalItems: 0,
						currentItemUnit: "items",
						workspacePath: undefined,
					},
				})
				return
			}

			const status = manager
				? manager.getCurrentStatus()
				: {
						systemStatus: "Standby",
						message: "No workspace folder open",
						processedItems: 0,
						totalItems: 0,
						currentItemUnit: "items",
						workspacePath: undefined,
					}

			await provider.postMessageToWebview({
				type: "indexingStatusUpdate",
				values: status,
			})
			break
		}
		case "requestCodeIndexSecretStatus": {
			// Check if secrets are set using the VSCode context directly for async access
			const hasOpenAiKey = !!(await provider.context.secrets.get("codeIndexOpenAiKey"))
			const hasQdrantApiKey = !!(await provider.context.secrets.get("codeIndexQdrantApiKey"))
			const hasOpenAiCompatibleApiKey = !!(await provider.context.secrets.get(
				"codebaseIndexOpenAiCompatibleApiKey",
			))
			const hasGeminiApiKey = !!(await provider.context.secrets.get("codebaseIndexGeminiApiKey"))
			const hasMistralApiKey = !!(await provider.context.secrets.get("codebaseIndexMistralApiKey"))
			const hasVercelAiGatewayApiKey = !!(await provider.context.secrets.get(
				"codebaseIndexVercelAiGatewayApiKey",
			))
			const hasOpenRouterApiKey = !!(await provider.context.secrets.get("codebaseIndexOpenRouterApiKey"))

			await provider.postMessageToWebview({
				type: "codeIndexSecretStatus",
				values: {
					hasOpenAiKey,
					hasQdrantApiKey,
					hasOpenAiCompatibleApiKey,
					hasGeminiApiKey,
					hasMistralApiKey,
					hasVercelAiGatewayApiKey,
					hasOpenRouterApiKey,
				},
			})
			break
		}
		case "startIndexing": {
			try {
				const manager = provider.getCurrentWorkspaceCodeIndexManager()
				if (!manager) {
					await provider.postMessageToWebview({
						type: "indexingStatusUpdate",
						values: {
							systemStatus: "Error",
							message: t("embeddings:orchestrator.indexingRequiresWorkspace"),
							processedItems: 0,
							totalItems: 0,
							currentItemUnit: "items",
						},
					})
					provider.log("Cannot start indexing: No workspace folder open")
					return
				}

				// "Start Indexing" implicitly enables the workspace
				await manager.setWorkspaceEnabled(true)

				// Initialize unconditionally (idempotent) BEFORE evaluating feature
				// flags, so a manager that was never initialized (fresh remote session,
				// swallowed background init, post recoverFromError) reflects real config.
				await manager.initialize(provider.contextProxy)

				if (manager.isFeatureEnabled && manager.isFeatureConfigured) {
					const currentState = manager.state
					if (currentState === "Standby" || currentState === "Error") {
						void manager.startIndexing().catch((err) => provider.log(`Indexing error: ${err}`))
					} else {
						provider.log(
							`[CodeIndex] startIndexing: already in state ${currentState}, not restarting. status=${JSON.stringify(manager.getCurrentStatus())}`,
						)
					}
				} else {
					provider.log(
						`[CodeIndex] startIndexing skipped: enabled=${manager.isFeatureEnabled}, configured=${manager.isFeatureConfigured}, status=${JSON.stringify(manager.getCurrentStatus())}`,
					)
				}

				// Always reflect the actual state to the UI (not only via the emitter)
				await provider.postMessageToWebview({
					type: "indexingStatusUpdate",
					values: manager.getCurrentStatus(),
				})
			} catch (error) {
				provider.log(`Error starting indexing: ${error instanceof Error ? error.message : String(error)}`)
				const manager = provider.getCurrentWorkspaceCodeIndexManager()
				if (manager) {
					await provider.postMessageToWebview({
						type: "indexingStatusUpdate",
						values: manager.getCurrentStatus(),
					})
				}
			}
			break
		}
		case "stopIndexing": {
			try {
				const manager = provider.getCurrentWorkspaceCodeIndexManager()
				if (!manager) {
					provider.log("Cannot stop indexing: No workspace folder open")
					return
				}
				manager.stopIndexing()
				await provider.postMessageToWebview({
					type: "indexingStatusUpdate",
					values: manager.getCurrentStatus(),
				})
			} catch (error) {
				provider.log(`Error stopping indexing: ${error instanceof Error ? error.message : String(error)}`)
				const manager = provider.getCurrentWorkspaceCodeIndexManager()
				if (manager) {
					await provider.postMessageToWebview({
						type: "indexingStatusUpdate",
						values: manager.getCurrentStatus(),
					})
				}
			}
			break
		}
		case "toggleWorkspaceIndexing": {
			try {
				const manager = provider.getCurrentWorkspaceCodeIndexManager()
				if (!manager) {
					provider.log("Cannot toggle workspace indexing: No workspace folder open")
					return
				}
				const enabled = message.bool ?? false
				await manager.setWorkspaceEnabled(enabled)
				// Initialize unconditionally (idempotent) before evaluating feature flags
				await manager.initialize(provider.contextProxy)
				if (enabled && manager.isFeatureEnabled && manager.isFeatureConfigured) {
					void manager.startIndexing().catch((err) => provider.log(`Indexing error: ${err}`))
				} else if (!enabled) {
					manager.stopIndexing()
				} else {
					provider.log(
						`[CodeIndex] toggleWorkspaceIndexing skipped: enabled=${manager.isFeatureEnabled}, configured=${manager.isFeatureConfigured}, status=${JSON.stringify(manager.getCurrentStatus())}`,
					)
				}
				await provider.postMessageToWebview({
					type: "indexingStatusUpdate",
					values: manager.getCurrentStatus(),
				})
			} catch (error) {
				provider.log(
					`Error toggling workspace indexing: ${error instanceof Error ? error.message : String(error)}`,
				)
				const manager = provider.getCurrentWorkspaceCodeIndexManager()
				if (manager) {
					await provider.postMessageToWebview({
						type: "indexingStatusUpdate",
						values: manager.getCurrentStatus(),
					})
				}
			}
			break
		}
		case "setAutoEnableDefault": {
			try {
				const manager = provider.getCurrentWorkspaceCodeIndexManager()
				if (!manager) {
					provider.log("Cannot set auto-enable default: No workspace folder open")
					return
				}
				// Capture prior state for every manager before persisting the global change
				const allManagers = CodeIndexManager.getAllInstances()
				const priorStates = new Map(allManagers.map((m) => [m, m.isWorkspaceEnabled]))
				await manager.setAutoEnableDefault(message.bool ?? true)
				// Apply stop/start to every affected manager
				for (const m of allManagers) {
					const wasEnabled = priorStates.get(m)!
					const isNowEnabled = m.isWorkspaceEnabled
					if (wasEnabled && !isNowEnabled) {
						m.stopIndexing()
					} else if (!wasEnabled && isNowEnabled) {
						// Initialize unconditionally (idempotent) before evaluating feature flags
						await m.initialize(provider.contextProxy)
						if (m.isFeatureEnabled && m.isFeatureConfigured) {
							void m.startIndexing().catch((err) => provider.log(`Indexing error: ${err}`))
						} else {
							provider.log(
								`[CodeIndex] setAutoEnableDefault: manager not started, enabled=${m.isFeatureEnabled}, configured=${m.isFeatureConfigured}, status=${JSON.stringify(m.getCurrentStatus())}`,
							)
						}
					}
				}
				await provider.postMessageToWebview({
					type: "indexingStatusUpdate",
					values: manager.getCurrentStatus(),
				})
			} catch (error) {
				provider.log(
					`Error setting auto-enable default: ${error instanceof Error ? error.message : String(error)}`,
				)
				const currentManager = provider.getCurrentWorkspaceCodeIndexManager()
				if (currentManager) {
					await provider.postMessageToWebview({
						type: "indexingStatusUpdate",
						values: currentManager.getCurrentStatus(),
					})
				}
			}
			break
		}
		case "clearIndexData": {
			try {
				const manager = provider.getCurrentWorkspaceCodeIndexManager()
				if (!manager) {
					provider.log("Cannot clear index data: No workspace folder open")
					await provider.postMessageToWebview({
						type: "indexCleared",
						values: {
							success: false,
							error: t("embeddings:orchestrator.indexingRequiresWorkspace"),
						},
					})
					return
				}
				await manager.clearIndexData()
				await provider.postMessageToWebview({ type: "indexCleared", values: { success: true } })
			} catch (error) {
				provider.log(`Error clearing index data: ${error instanceof Error ? error.message : String(error)}`)
				await provider.postMessageToWebview({
					type: "indexCleared",
					values: {
						success: false,
						error: error instanceof Error ? error.message : String(error),
					},
				})
			}
			break
		}
	}
}
