import * as vscode from "vscode"
import * as path from "path"
import * as os from "os"
import * as fs from "fs/promises"
import {
	type ExperimentId,
	type Language,
	type ModelRecord,
	type RooCodeSettings,
	type TelemetrySetting,
	type WebviewMessage,
	type WebviewMessageType,
	allowedCommandsMessageSchema,
	deleteCustomModeMessageSchema,
	deniedCommandsMessageSchema,
	updateCustomModeMessageSchema,
	updateSettingsMessageSchema,
} from "@roo-code/types"
import { TelemetryService } from "@roo-code/telemetry"

import { changeLanguage, t } from "../../../i18n"
import { Package } from "../../../shared/package"
import { type GetModelsOptions, type RouterName, toRouterName } from "../../../shared/api"
import { checkExistKey } from "../../../shared/checkExistApiConfig"
import { experimentDefault } from "../../../shared/experiments"
import { Terminal } from "../../../integrations/terminal/Terminal"
import { TerminalRegistry } from "../../../integrations/terminal/TerminalRegistry"
import { setTtsEnabled, setTtsSpeed } from "../../../utils/tts"
import { openFile } from "../../../integrations/misc/open-file"
import { fileExistsAtPath } from "../../../utils/fs"
import { exportSettings, importSettingsWithFeedback } from "../../config/importExport"
import { getOpenAiModels } from "../../../api/providers/openai"
import { getVsCodeLmModels } from "../../../api/providers/vscode-lm"
import { getRouterRemovalMessage } from "../../config/routerRemoval"
import { getModels, flushModels } from "../../../api/providers/fetchers/modelCache"
import { getLMStudioModels } from "../../../api/providers/fetchers/lmstudio"
import { getWorkspacePath } from "../../../utils/path"
import { defaultModeSlug, Mode } from "../../../shared/modes"
import { resolveDefaultSaveUri, saveLastExportPath } from "../../../utils/export"
import type { ClineProvider } from "../ClineProvider"
import type { MarketplaceManager } from "../../../services/marketplace"
import { getGlobalState, updateGlobalState } from "./shared"

const ALLOWED_VSCODE_SETTINGS = new Set(["terminal.integrated.inheritEnv"])

export const settingsMessageTypes: ReadonlySet<WebviewMessageType> = new Set([
	"allowedCommands",
	"autoApprovalEnabled",
	"checkRulesDirectory",
	"customInstructions",
	"debugSetting",
	"deleteCustomMode",
	"deniedCommands",
	"exportMode",
	"exportSettings",
	"flushRouterModels",
	"getVSCodeSetting",
	"hasOpenedModeSelector",
	"importMode",
	"importSettings",
	"mode",
	"openCustomModesSettings",
	"requestLmStudioModels",
	"requestOllamaModels",
	"requestOpenAiModels",
	"requestRooModels",
	"requestRouterModels",
	"requestVsCodeLmModels",
	"telemetrySetting",
	"updateCustomMode",
	"updatePrompt",
	"updateSettings",
	"updateVSCodeSetting",
])

export async function handleSettingsMessages(
	provider: Pick<
		ClineProvider,
		| "updateCustomInstructions"
		| "getMcpHub"
		| "contextProxy"
		| "postStateToWebview"
		| "customModesManager"
		| "postMessageToWebview"
		| "handleModeSwitch"
		| "getStateToPostToWebview"
		| "getState"
		| "providerSettingsManager"
		| "log"
	>,
	_marketplaceManager: MarketplaceManager | undefined,
	message: WebviewMessage,
): Promise<void> {
	switch (message.type) {
		case "customInstructions":
			await provider.updateCustomInstructions(message.text)
			break

		case "updateSettings": {
			// The schema validates known setting-field types (via rooCodeSettingsSchema)
			// while retaining unknown future fields (passthrough). Reject malformed
			// payloads before any side effects.
			const result = updateSettingsMessageSchema.safeParse(message)

			if (!result.success) {
				provider.log(
					`[webviewMessageHandler] Rejected malformed updateSettings message: ${result.error.message}`,
				)
				break
			}

			const m = result.data
			if (m.updatedSettings) {
				for (const [key, value] of Object.entries(m.updatedSettings)) {
					let newValue = value

					if (key === "language") {
						newValue = value ?? "en"
						changeLanguage(newValue as Language)
					} else if (key === "allowedCommands") {
						const commands = value ?? []

						newValue = Array.isArray(commands)
							? commands.filter((cmd) => typeof cmd === "string" && cmd.trim().length > 0)
							: []

						await vscode.workspace
							.getConfiguration(Package.name)
							.update("allowedCommands", newValue, vscode.ConfigurationTarget.Global)
					} else if (key === "deniedCommands") {
						const commands = value ?? []

						newValue = Array.isArray(commands)
							? commands.filter((cmd) => typeof cmd === "string" && cmd.trim().length > 0)
							: []

						await vscode.workspace
							.getConfiguration(Package.name)
							.update("deniedCommands", newValue, vscode.ConfigurationTarget.Global)
					} else if (key === "ttsEnabled") {
						newValue = value ?? true
						setTtsEnabled(newValue as boolean)
					} else if (key === "ttsSpeed") {
						newValue = value ?? 1.0
						setTtsSpeed(newValue as number)
					} else if (key === "terminalShellIntegrationTimeout") {
						if (value !== undefined) {
							Terminal.setShellIntegrationTimeout(value as number)
						}
					} else if (key === "terminalShellIntegrationDisabled") {
						if (value !== undefined) {
							Terminal.setShellIntegrationDisabled(value as boolean)
						}
					} else if (key === "terminalCommandDelay") {
						if (value !== undefined) {
							Terminal.setCommandDelay(value as number)
						}
					} else if (key === "terminalPowershellCounter") {
						if (value !== undefined) {
							Terminal.setPowershellCounter(value as boolean)
						}
					} else if (key === "terminalZshClearEolMark") {
						if (value !== undefined) {
							Terminal.setTerminalZshClearEolMark(value as boolean)
						}
					} else if (key === "terminalZshOhMy") {
						if (value !== undefined) {
							Terminal.setTerminalZshOhMy(value as boolean)
						}
					} else if (key === "terminalZshP10k") {
						if (value !== undefined) {
							Terminal.setTerminalZshP10k(value as boolean)
						}
					} else if (key === "terminalZdotdir") {
						if (value !== undefined) {
							Terminal.setTerminalZdotdir(value as boolean)
						}
					} else if (key === "terminalProfile") {
						const previousProfile = Terminal.getTerminalProfile()
						Terminal.setTerminalProfile(typeof value === "string" ? value : undefined)
						newValue = Terminal.getTerminalProfile()

						if (newValue !== previousProfile) {
							// Discard idle terminals so the next command gets a fresh
							// terminal using the new profile's shell instead of reusing
							// a stale one from the previous profile.
							TerminalRegistry.closeIdleTerminals()
						}
					} else if (key === "execaShellPath") {
						Terminal.setExecaShellPath(value as string | undefined)
					} else if (key === "mcpEnabled") {
						newValue = value ?? true
						const mcpHub = provider.getMcpHub()

						if (mcpHub) {
							await mcpHub.handleMcpEnabledChange(newValue as boolean)
						}
					} else if (key === "experiments") {
						if (!value) {
							continue
						}

						newValue = {
							...(getGlobalState(provider, "experiments") ?? experimentDefault),
							...(value as Record<ExperimentId, boolean>),
						}
					} else if (key === "customSupportPrompts") {
						if (!value) {
							continue
						}
					}

					await provider.contextProxy.setValue(key as keyof RooCodeSettings, newValue)
				}

				await provider.postStateToWebview()
			}

			break
		}

		case "importSettings": {
			await importSettingsWithFeedback({
				providerSettingsManager: provider.providerSettingsManager,
				contextProxy: provider.contextProxy,
				customModesManager: provider.customModesManager,
				provider: provider,
			})

			break
		}
		case "exportSettings":
			await exportSettings({
				providerSettingsManager: provider.providerSettingsManager,
				contextProxy: provider.contextProxy,
			})

			break
		case "flushRouterModels":
			const routerNameFlush: RouterName = toRouterName(message.text)
			// Note: flushRouterModels is a generic flush without credentials
			// For providers that need credentials, use their specific handlers
			await flushModels({ provider: routerNameFlush } as GetModelsOptions, true)
			break
		case "requestRouterModels": {
			const { apiConfiguration } = await provider.getState()

			// Optional single provider filter from webview
			const requestedProvider = message?.values?.provider
			const providerFilter = requestedProvider ? toRouterName(requestedProvider) : undefined

			// Optional refresh flag to flush cache before fetching (useful for providers requiring credentials)
			const shouldRefresh = message?.values?.refresh === true

			const routerModels: Record<RouterName, ModelRecord> = providerFilter
				? ({} as Record<RouterName, ModelRecord>)
				: {
						openrouter: {},
						"vercel-ai-gateway": {},
						litellm: {},
						requesty: {},
						unbound: {},
						ollama: {},
						lmstudio: {},
						poe: {},
						deepseek: {},
						moonshot: {},
						"opencode-go": {},
						kenari: {},
						"kimi-code": {},
					}

			const safeGetModels = async (options: GetModelsOptions): Promise<ModelRecord> => {
				try {
					return await getModels(options)
				} catch (error) {
					console.error(
						`Failed to fetch models in webviewMessageHandler requestRouterModels for ${options.provider}:`,
						error,
					)

					throw error // Re-throw to be caught by Promise.allSettled.
				}
			}

			// Base candidates (only those handled by this aggregate fetcher)
			const candidates: { key: RouterName; options: GetModelsOptions }[] = [
				{ key: "openrouter", options: { provider: "openrouter" } },
				{
					key: "requesty",
					options: {
						provider: "requesty",
						apiKey: apiConfiguration.requestyApiKey,
						baseUrl: apiConfiguration.requestyBaseUrl,
					},
				},
				{
					key: "unbound",
					options: {
						provider: "unbound",
						apiKey: apiConfiguration.unboundApiKey,
					},
				},
				{ key: "vercel-ai-gateway", options: { provider: "vercel-ai-gateway" } },
			]

			// LiteLLM is conditional on baseUrl+apiKey.
			// Prefer explicit values from message (current unsaved field state) over saved config,
			// matching the pattern used for DeepSeek and other credential-carrying providers.
			const litellmApiKey = message?.values?.litellmApiKey ?? apiConfiguration.litellmApiKey
			const litellmBaseUrl = message?.values?.litellmBaseUrl ?? apiConfiguration.litellmBaseUrl

			if (litellmApiKey && litellmBaseUrl) {
				// If explicit credentials are provided in message.values (from Refresh Models button),
				// flush the cache first to ensure we fetch fresh data with the new credentials
				if (message?.values?.litellmApiKey || message?.values?.litellmBaseUrl) {
					await flushModels({ provider: "litellm", apiKey: litellmApiKey, baseUrl: litellmBaseUrl }, true)
				}

				candidates.push({
					key: "litellm",
					options: { provider: "litellm", apiKey: litellmApiKey, baseUrl: litellmBaseUrl },
				})
			}

			// Poe is conditional on apiKey
			const poeApiKey = apiConfiguration.poeApiKey || message?.values?.poeApiKey
			const poeBaseUrl = apiConfiguration.poeBaseUrl || message?.values?.poeBaseUrl

			if (poeApiKey) {
				if (message?.values?.poeApiKey || message?.values?.poeBaseUrl) {
					await flushModels({ provider: "poe", apiKey: poeApiKey, baseUrl: poeBaseUrl }, true)
				}

				candidates.push({
					key: "poe",
					options: { provider: "poe", apiKey: poeApiKey, baseUrl: poeBaseUrl },
				})
			}

			// DeepSeek is conditional on apiKey
			const deepSeekApiKey = message?.values?.deepSeekApiKey ?? apiConfiguration.deepSeekApiKey
			const deepSeekBaseUrl = message?.values?.deepSeekBaseUrl ?? apiConfiguration.deepSeekBaseUrl

			if (deepSeekApiKey) {
				if (message?.values?.deepSeekApiKey || message?.values?.deepSeekBaseUrl) {
					await flushModels({ provider: "deepseek", apiKey: deepSeekApiKey, baseUrl: deepSeekBaseUrl }, true)
				}

				candidates.push({
					key: "deepseek",
					options: { provider: "deepseek", apiKey: deepSeekApiKey, baseUrl: deepSeekBaseUrl },
				})
			}

			// Moonshot is conditional on apiKey
			const moonshotApiKey = message?.values?.moonshotApiKey ?? apiConfiguration.moonshotApiKey
			const moonshotBaseUrl = message?.values?.moonshotBaseUrl ?? apiConfiguration.moonshotBaseUrl

			if (moonshotApiKey) {
				if (message?.values?.moonshotApiKey || message?.values?.moonshotBaseUrl) {
					await flushModels({ provider: "moonshot", apiKey: moonshotApiKey, baseUrl: moonshotBaseUrl }, true)
				}

				candidates.push({
					key: "moonshot",
					options: { provider: "moonshot", apiKey: moonshotApiKey, baseUrl: moonshotBaseUrl },
				})
			}

			// Opencode Go's /models endpoint is public — it returns the full model list with no
			// Authorization header — so it's fetched unconditionally like openrouter/vercel-ai-gateway
			// above. Gating it behind a key meant the picker stayed empty (and fell back to the default
			// model) whenever the key wasn't yet in apiConfiguration at fetch time. The key is still
			// forwarded when present.
			const opencodeGoApiKey = message?.values?.opencodeGoApiKey ?? apiConfiguration.opencodeGoApiKey

			// Refresh the cache when a new key is explicitly provided (e.g. the Refresh Models button).
			if (message?.values?.opencodeGoApiKey) {
				await flushModels({ provider: "opencode-go", apiKey: opencodeGoApiKey }, true)
			}

			candidates.push({
				key: "opencode-go",
				options: { provider: "opencode-go", apiKey: opencodeGoApiKey },
			})

			// Kenari's /models endpoint is public — it returns the full model list with no
			// Authorization header — so it's fetched unconditionally like openrouter/vercel-ai-gateway
			// above. Gating it behind a key meant the picker stayed empty (and fell back to the default
			// model) whenever the key wasn't yet in apiConfiguration at fetch time. The key is still
			// forwarded when present.
			const kenariApiKey = message?.values?.kenariApiKey ?? apiConfiguration.kenariApiKey

			// Refresh the cache when a new key is explicitly provided (e.g. the Refresh Models button).
			if (message?.values?.kenariApiKey) {
				await flushModels({ provider: "kenari", apiKey: kenariApiKey }, true)
			}

			candidates.push({
				key: "kenari",
				options: { provider: "kenari", apiKey: kenariApiKey },
			})

			if (!providerFilter || providerFilter === "kimi-code") {
				const { kimiCodeOAuthManager } = await import("../../../integrations/kimi-code/oauth")
				const kimiCodeAuthMethod =
					message?.values?.kimiCodeAuthMethod ?? apiConfiguration.kimiCodeAuthMethod ?? "oauth"
				const kimiCodeApiKey =
					kimiCodeAuthMethod === "api-key"
						? (message?.values?.kimiCodeApiKey ?? apiConfiguration.kimiCodeApiKey)
						: await kimiCodeOAuthManager.getAccessToken()
				if (kimiCodeApiKey) {
					candidates.push({
						key: "kimi-code",
						options: { provider: "kimi-code", apiKey: kimiCodeApiKey },
					})
				}
			}

			// Apply single provider filter if specified
			const modelFetchPromises = providerFilter
				? candidates.filter(({ key }) => key === providerFilter)
				: candidates

			// If refresh flag is set and we have a specific provider, flush its cache first
			if (shouldRefresh && providerFilter && modelFetchPromises.length > 0) {
				const targetCandidate = modelFetchPromises[0]
				await flushModels(targetCandidate.options, true)
			}

			const results = await Promise.allSettled(
				modelFetchPromises.map(async ({ key, options }) => {
					const models = await safeGetModels(options)
					return { key, models } // The key is `ProviderName` here.
				}),
			)

			results.forEach((result, index) => {
				const routerName = modelFetchPromises[index].key

				if (result.status === "fulfilled") {
					routerModels[routerName] = result.value.models

					// Ollama and LM Studio settings pages still need these events. They are not fetched here.
				} else {
					// Handle rejection: Post a specific error message for this provider.
					const errorMessage = result.reason instanceof Error ? result.reason.message : String(result.reason)
					console.error(`Error fetching models for ${routerName}:`, result.reason)

					routerModels[routerName] = {} // Ensure it's an empty object in the main routerModels message.

					void provider.postMessageToWebview({
						type: "singleRouterModelFetchResponse",
						success: false,
						error: errorMessage,
						values: { provider: routerName },
					})
				}
			})

			await provider.postMessageToWebview({
				type: "routerModels",
				routerModels,
				values: providerFilter ? { provider: requestedProvider } : undefined,
			})
			break
		}
		case "requestOllamaModels": {
			// Specific handler for Ollama models only.
			const { apiConfiguration: ollamaApiConfig } = await provider.getState()
			// Prefer the baseUrl/apiKey from the message values (which reflect
			// the user's unsaved edits in the settings form) over the saved
			// state, so the refresh uses the URL the user is actually looking
			// at — not the stale one from before they started editing.
			const baseUrl = message.values?.baseUrl ?? ollamaApiConfig.ollamaBaseUrl
			const apiKey = message.values?.apiKey ?? ollamaApiConfig.ollamaApiKey
			const logBaseUrl = baseUrl || "http://localhost:11434"
			const ollamaOptions = {
				provider: "ollama" as const,
				baseUrl,
				apiKey,
			}
			try {
				// Refresh the cache before reading the models. Keep this error
				// separate from the read below so diagnostics identify which
				// cache operation failed.
				await flushModels(ollamaOptions, true)
			} catch (error) {
				const errorMsg = error instanceof Error ? error.message : String(error)
				provider.log(`[requestOllamaModels] Failed to refresh model cache for ${logBaseUrl}: ${errorMsg}`)
				await provider.postMessageToWebview({
					type: "ollamaModels",
					ollamaModels: {},
					error: errorMsg,
				})
				break
			}

			try {
				const ollamaModels = await getModels(ollamaOptions)

				// Always post a response so the webview refresh status can
				// transition out of "loading" — even when no models are found.
				await provider.postMessageToWebview({ type: "ollamaModels", ollamaModels })
			} catch (error) {
				const errorMsg = error instanceof Error ? error.message : String(error)
				provider.log(`[requestOllamaModels] Failed to read models for ${logBaseUrl}: ${errorMsg}`)
				await provider.postMessageToWebview({
					type: "ollamaModels",
					ollamaModels: {},
					error: errorMsg,
				})
			}
			break
		}
		case "requestLmStudioModels": {
			// Specific handler for LM Studio models only.
			const { apiConfiguration: lmStudioApiConfig } = await provider.getState()
			try {
				const requestedBaseUrl = message.values?.baseUrl
				const hasPreviewBaseUrl = typeof requestedBaseUrl === "string"
				let lmStudioModels: ModelRecord
				if (hasPreviewBaseUrl) {
					lmStudioModels = await getLMStudioModels(requestedBaseUrl)
				} else {
					const lmStudioOptions = {
						provider: "lmstudio" as const,
						baseUrl: lmStudioApiConfig.lmStudioBaseUrl,
					}
					// Flush cache and refresh to ensure fresh models.
					await flushModels(lmStudioOptions, true)
					lmStudioModels = await getModels(lmStudioOptions)
				}

				if (Object.keys(lmStudioModels).length > 0) {
					await provider.postMessageToWebview({
						type: "lmStudioModels",
						lmStudioModels: lmStudioModels,
					})
				}
			} catch (error) {
				// Silently fail - user hasn't configured LM Studio yet.
				console.debug("LM Studio models fetch failed:", error)
			}
			break
		}
		case "requestRooModels": {
			await provider.postMessageToWebview({
				type: "singleRouterModelFetchResponse",
				success: false,
				error: getRouterRemovalMessage(),
				values: { provider: "roo" },
			})
			break
		}
		case "requestOpenAiModels":
			if (message?.values?.baseUrl && message?.values?.apiKey) {
				const openAiModels = await getOpenAiModels(
					message?.values?.baseUrl,
					message?.values?.apiKey,
					message?.values?.openAiHeaders,
				)

				await provider.postMessageToWebview({ type: "openAiModels", openAiModels })
			}

			break
		case "requestVsCodeLmModels":
			const vsCodeLmModels = await getVsCodeLmModels()
			// TODO: Cache like we do for OpenRouter, etc?
			await provider.postMessageToWebview({ type: "vsCodeLmModels", vsCodeLmModels })
			break
		case "allowedCommands": {
			// The schema guarantees `commands` is a string array; reject malformed
			// payloads at the boundary before any side effects.
			const result = allowedCommandsMessageSchema.safeParse(message)

			if (!result.success) {
				provider.log(
					`[webviewMessageHandler] Rejected malformed allowedCommands message: ${result.error.message}`,
				)
				break
			}

			const m = result.data
			const validCommands = m.commands.filter((cmd) => cmd.trim().length > 0)

			await updateGlobalState(provider, "allowedCommands", validCommands)

			// Also update workspace settings.
			await vscode.workspace
				.getConfiguration(Package.name)
				.update("allowedCommands", validCommands, vscode.ConfigurationTarget.Global)

			break
		}
		case "deniedCommands": {
			const result = deniedCommandsMessageSchema.safeParse(message)

			if (!result.success) {
				provider.log(
					`[webviewMessageHandler] Rejected malformed deniedCommands message: ${result.error.message}`,
				)
				break
			}

			const m = result.data
			const validCommands = m.commands.filter((cmd) => cmd.trim().length > 0)

			await updateGlobalState(provider, "deniedCommands", validCommands)

			// Also update workspace settings.
			await vscode.workspace
				.getConfiguration(Package.name)
				.update("deniedCommands", validCommands, vscode.ConfigurationTarget.Global)

			break
		}
		case "openCustomModesSettings": {
			const customModesFilePath = await provider.customModesManager.getCustomModesFilePath()

			if (customModesFilePath) {
				await openFile(customModesFilePath)
			}

			break
		}
		case "updateVSCodeSetting": {
			const { setting, value } = message

			if (setting !== undefined && value !== undefined) {
				if (ALLOWED_VSCODE_SETTINGS.has(setting)) {
					await vscode.workspace.getConfiguration().update(setting, value, true)
				} else {
					vscode.window.showErrorMessage(`Cannot update restricted VSCode setting: ${setting}`)
				}
			}

			break
		}
		case "getVSCodeSetting":
			const { setting } = message

			if (setting) {
				try {
					await provider.postMessageToWebview({
						type: "vsCodeSetting",
						setting,
						value: vscode.workspace.getConfiguration().get(setting),
					})
				} catch (error) {
					console.error(`Failed to get VSCode setting ${message.setting}:`, error)

					await provider.postMessageToWebview({
						type: "vsCodeSetting",
						setting,
						error: `Failed to get setting: ${error.message}`,
						value: undefined,
					})
				}
			}

			break

		case "mode":
			await provider.handleModeSwitch(message.text as Mode)
			break
		case "updatePrompt":
			if (message.promptMode && message.customPrompt !== undefined) {
				const existingPrompts = getGlobalState(provider, "customModePrompts") ?? {}
				const updatedPrompts = { ...existingPrompts, [message.promptMode]: message.customPrompt }
				await updateGlobalState(provider, "customModePrompts", updatedPrompts)
				const currentState = await provider.getStateToPostToWebview()
				const stateWithPrompts = {
					...currentState,
					customModePrompts: updatedPrompts,
					hasOpenedModeSelector: currentState.hasOpenedModeSelector ?? false,
				}
				await provider.postMessageToWebview({ type: "state", state: stateWithPrompts })

				if (TelemetryService.hasInstance()) {
					// Determine which setting was changed by comparing objects
					const oldPrompt = existingPrompts[message.promptMode] || {}
					const newPrompt = message.customPrompt
					const changedSettings = Object.keys(newPrompt).filter(
						(key) =>
							JSON.stringify((oldPrompt as Record<string, unknown>)[key]) !==
							JSON.stringify((newPrompt as Record<string, unknown>)[key]),
					)

					if (changedSettings.length > 0) {
						TelemetryService.instance.captureModeSettingChanged(changedSettings[0])
					}
				}
			}
			break
		case "hasOpenedModeSelector":
			await updateGlobalState(provider, "hasOpenedModeSelector", message.bool ?? true)
			await provider.postStateToWebview()
			break

		case "autoApprovalEnabled":
			await updateGlobalState(provider, "autoApprovalEnabled", message.bool ?? false)
			await provider.postStateToWebview()
			break
		case "updateCustomMode": {
			const result = updateCustomModeMessageSchema.safeParse(message)

			if (!result.success) {
				provider.log(
					`[webviewMessageHandler] Rejected malformed updateCustomMode message: ${result.error.message}`,
				)
				break
			}

			const m = result.data
			try {
				// Check if this is a new mode or an update to an existing mode
				const existingModes = await provider.customModesManager.getCustomModes()
				const isNewMode = !existingModes.some((mode) => mode.slug === m.modeConfig.slug)

				await provider.customModesManager.updateCustomMode(m.modeConfig.slug, m.modeConfig)
				// Update state after saving the mode
				const customModes = await provider.customModesManager.getCustomModes()
				await updateGlobalState(provider, "customModes", customModes)
				await updateGlobalState(provider, "mode", m.modeConfig.slug)
				await provider.postStateToWebview()

				// Track telemetry for custom mode creation or update
				if (TelemetryService.hasInstance()) {
					if (isNewMode) {
						// This is a new custom mode
						TelemetryService.instance.captureCustomModeCreated(m.modeConfig.slug, m.modeConfig.name)
					} else {
						// Determine which setting was changed by comparing objects
						const existingMode = existingModes.find((mode) => mode.slug === m.modeConfig.slug)
						const changedSettings = existingMode
							? Object.keys(m.modeConfig).filter(
									(key) =>
										JSON.stringify((existingMode as Record<string, unknown>)[key]) !==
										JSON.stringify((m.modeConfig as Record<string, unknown>)[key]),
								)
							: []

						if (changedSettings.length > 0) {
							TelemetryService.instance.captureModeSettingChanged(changedSettings[0])
						}
					}
				}
			} catch (error) {
				// Error already shown to user by updateCustomMode
				// Just prevent unhandled rejection and skip state updates
			}
			break
		}
		case "deleteCustomMode": {
			const result = deleteCustomModeMessageSchema.safeParse(message)

			if (!result.success) {
				provider.log(
					`[webviewMessageHandler] Rejected malformed deleteCustomMode message: ${result.error.message}`,
				)
				break
			}

			const m = result.data
			// Get the mode details to determine source and rules folder path
			const customModes = await provider.customModesManager.getCustomModes()
			const modeToDelete = customModes.find((mode) => mode.slug === m.slug)

			if (!modeToDelete) {
				break
			}

			// Determine the scope based on source (project or global)
			const scope = modeToDelete.source || "global"

			// Determine the rules folder path
			let rulesFolderPath: string
			if (scope === "project") {
				const workspacePath = getWorkspacePath()
				if (workspacePath) {
					rulesFolderPath = path.join(workspacePath, ".roo", `rules-${m.slug}`)
				} else {
					rulesFolderPath = path.join(".roo", `rules-${m.slug}`)
				}
			} else {
				// Global scope - use OS home directory
				const homeDir = os.homedir()
				rulesFolderPath = path.join(homeDir, ".roo", `rules-${m.slug}`)
			}

			// Check if the rules folder exists
			const rulesFolderExists = await fileExistsAtPath(rulesFolderPath)

			// If this is a check request, send back the folder info
			if (m.checkOnly) {
				await provider.postMessageToWebview({
					type: "deleteCustomModeCheck",
					slug: m.slug,
					rulesFolderPath: rulesFolderExists ? rulesFolderPath : undefined,
				})
				break
			}

			// Delete the mode
			await provider.customModesManager.deleteCustomMode(m.slug)

			// Delete the rules folder if it exists
			if (rulesFolderExists) {
				try {
					await fs.rm(rulesFolderPath, { recursive: true, force: true })
					provider.log(`Deleted rules folder for mode ${m.slug}: ${rulesFolderPath}`)
				} catch (error) {
					provider.log(`Failed to delete rules folder for mode ${m.slug}: ${error}`)
					// Notify the user about the failure
					vscode.window.showErrorMessage(
						t("common:errors.delete_rules_folder_failed", {
							rulesFolderPath,
							error: error instanceof Error ? error.message : String(error),
						}),
					)
					// Continue with mode deletion even if folder deletion fails
				}
			}

			// Switch back to default mode after deletion
			await updateGlobalState(provider, "mode", defaultModeSlug)
			await provider.postStateToWebview()
			break
		}
		case "exportMode":
			if (message.slug) {
				try {
					// Get custom mode prompts to check if built-in mode has been customized
					const customModePrompts = getGlobalState(provider, "customModePrompts") || {}
					const customPrompt = customModePrompts[message.slug]

					// Export the mode with any customizations merged directly
					const result = await provider.customModesManager.exportModeWithRules(message.slug, customPrompt)

					if (result.success && result.yaml) {
						const defaultUri = await resolveDefaultSaveUri(
							provider.contextProxy,
							"lastModeExportPath",
							`${message.slug}-export.yaml`,
							{
								useWorkspace: true,
								fallbackDir: path.join(os.homedir(), "Downloads"),
							},
						)

						// Show save dialog
						const saveUri = await vscode.window.showSaveDialog({
							defaultUri,
							filters: {
								"YAML files": ["yaml", "yml"],
							},
							title: "Save mode export",
						})

						if (saveUri && result.yaml) {
							// Save the directory for next time
							await saveLastExportPath(provider.contextProxy, "lastModeExportPath", saveUri)

							// Write the file to the selected location
							await fs.writeFile(saveUri.fsPath, result.yaml, "utf-8")

							// Send success message to webview
							await provider.postMessageToWebview({
								type: "exportModeResult",
								success: true,
								slug: message.slug,
							})

							// Show info message
							vscode.window.showInformationMessage(t("common:info.mode_exported", { mode: message.slug }))
						} else {
							// User cancelled the save dialog
							await provider.postMessageToWebview({
								type: "exportModeResult",
								success: false,
								error: "Export cancelled",
								slug: message.slug,
							})
						}
					} else {
						// Send error message to webview
						await provider.postMessageToWebview({
							type: "exportModeResult",
							success: false,
							error: result.error,
							slug: message.slug,
						})
					}
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : String(error)
					provider.log(`Failed to export mode ${message.slug}: ${errorMessage}`)

					// Send error message to webview
					await provider.postMessageToWebview({
						type: "exportModeResult",
						success: false,
						error: errorMessage,
						slug: message.slug,
					})
				}
			}
			break
		case "importMode":
			try {
				// Get last used directory for import
				const lastImportPath = getGlobalState(provider, "lastModeImportPath")
				let defaultUri: vscode.Uri | undefined

				if (lastImportPath) {
					// Use the directory from the last import
					const lastDir = path.dirname(lastImportPath)
					defaultUri = vscode.Uri.file(lastDir)
				} else {
					// Default to workspace or home directory
					const workspaceFolders = vscode.workspace.workspaceFolders
					if (workspaceFolders && workspaceFolders.length > 0) {
						defaultUri = vscode.Uri.file(workspaceFolders[0].uri.fsPath)
					}
				}

				// Show file picker to select YAML file
				const fileUri = await vscode.window.showOpenDialog({
					canSelectFiles: true,
					canSelectFolders: false,
					canSelectMany: false,
					defaultUri,
					filters: {
						"YAML files": ["yaml", "yml"],
					},
					title: "Select mode export file to import",
				})

				if (fileUri && fileUri[0]) {
					// Save the directory for next time
					await updateGlobalState(provider, "lastModeImportPath", fileUri[0].fsPath)

					// Read the file content
					const yamlContent = await fs.readFile(fileUri[0].fsPath, "utf-8")

					// Import the mode with the specified source level
					const result = await provider.customModesManager.importModeWithRules(
						yamlContent,
						message.source || "project", // Default to project if not specified
					)

					if (result.success) {
						// Update state after importing
						const customModes = await provider.customModesManager.getCustomModes()
						await updateGlobalState(provider, "customModes", customModes)
						await provider.postStateToWebview()

						// Send success message to webview, include the imported slug so UI can switch
						await provider.postMessageToWebview({
							type: "importModeResult",
							success: true,
							slug: result.slug,
						})

						// Show success message
						vscode.window.showInformationMessage(t("common:info.mode_imported"))
					} else {
						// Send error message to webview
						await provider.postMessageToWebview({
							type: "importModeResult",
							success: false,
							error: result.error,
						})

						// Show error message
						vscode.window.showErrorMessage(t("common:errors.mode_import_failed", { error: result.error }))
					}
				} else {
					// User cancelled the file dialog - reset the importing state
					await provider.postMessageToWebview({
						type: "importModeResult",
						success: false,
						error: "cancelled",
					})
				}
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				provider.log(`Failed to import mode: ${errorMessage}`)

				// Send error message to webview
				await provider.postMessageToWebview({
					type: "importModeResult",
					success: false,
					error: errorMessage,
				})

				// Show error message
				vscode.window.showErrorMessage(t("common:errors.mode_import_failed", { error: errorMessage }))
			}
			break
		case "checkRulesDirectory":
			if (message.slug) {
				const hasContent = await provider.customModesManager.checkRulesDirectoryHasContent(message.slug)

				await provider.postMessageToWebview({
					type: "checkRulesDirectoryResult",
					slug: message.slug,
					hasContent: hasContent,
				})
			}
			break
		case "telemetrySetting": {
			const telemetrySetting = message.text as TelemetrySetting
			const previousSetting = getGlobalState(provider, "telemetrySetting") || "unset"
			const isOptedIn = telemetrySetting !== "disabled"
			const wasPreviouslyOptedIn = previousSetting !== "disabled"

			// If turning telemetry OFF, fire event BEFORE disabling
			if (wasPreviouslyOptedIn && !isOptedIn && TelemetryService.hasInstance()) {
				TelemetryService.instance.captureTelemetrySettingsChanged(previousSetting, telemetrySetting)
			}

			// Update the telemetry state
			await updateGlobalState(provider, "telemetrySetting", telemetrySetting)

			if (TelemetryService.hasInstance()) {
				TelemetryService.instance.updateTelemetryState(isOptedIn)
			}

			// If turning telemetry ON, fire event AFTER enabling
			if (!wasPreviouslyOptedIn && isOptedIn && TelemetryService.hasInstance()) {
				TelemetryService.instance.captureTelemetrySettingsChanged(previousSetting, telemetrySetting)
			}

			await provider.postStateToWebview()
			break
		}
		case "debugSetting": {
			await vscode.workspace
				.getConfiguration(Package.name)
				.update("debug", message.bool ?? false, vscode.ConfigurationTarget.Global)
			await provider.postStateToWebview()
			break
		}
	}
}
