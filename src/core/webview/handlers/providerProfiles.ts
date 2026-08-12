import * as vscode from "vscode"
import {
	type WebviewMessage,
	type WebviewMessageType,
	deleteApiConfigurationMessageSchema,
	enhancementApiConfigIdMessageSchema,
	loadApiConfigurationByIdMessageSchema,
	loadApiConfigurationMessageSchema,
	lockApiConfigAcrossModesMessageSchema,
	renameApiConfigurationMessageSchema,
	saveApiConfigurationMessageSchema,
	toggleApiConfigPinMessageSchema,
	upsertApiConfigurationMessageSchema,
} from "@roo-code/types"

import { t } from "../../../i18n"
import type { ClineProvider } from "../ClineProvider"
import type { MarketplaceManager } from "../../../services/marketplace"
import { getGlobalState, updateGlobalState } from "./shared"

export const providerProfilesMessageTypes: ReadonlySet<WebviewMessageType> = new Set([
	"deleteApiConfiguration",
	"enhancementApiConfigId",
	"getListApiConfiguration",
	"kimiCodeSignIn",
	"kimiCodeSignOut",
	"loadApiConfiguration",
	"loadApiConfigurationById",
	"lockApiConfigAcrossModes",
	"openAiCodexSignIn",
	"openAiCodexSignOut",
	"renameApiConfiguration",
	"requestOpenAiCodexRateLimits",
	"saveApiConfiguration",
	"toggleApiConfigPin",
	"upsertApiConfiguration",
])

export async function handleProviderProfilesMessages(
	provider: Pick<
		ClineProvider,
		| "context"
		| "postStateToWebview"
		| "contextProxy"
		| "providerSettingsManager"
		| "upsertProviderProfile"
		| "activateProviderProfile"
		| "postMessageToWebview"
		| "log"
	>,
	_marketplaceManager: MarketplaceManager | undefined,
	message: WebviewMessage,
): Promise<void> {
	switch (message.type) {
		case "lockApiConfigAcrossModes": {
			const result = lockApiConfigAcrossModesMessageSchema.safeParse(message)

			if (!result.success) {
				provider.log(
					`[webviewMessageHandler] Rejected malformed lockApiConfigAcrossModes message: ${result.error.message}`,
				)
				break
			}

			const enabled = result.data.bool ?? false
			await provider.context.workspaceState.update("lockApiConfigAcrossModes", enabled)

			await provider.postStateToWebview()
			break
		}

		case "toggleApiConfigPin": {
			const result = toggleApiConfigPinMessageSchema.safeParse(message)

			if (!result.success) {
				provider.log(
					`[webviewMessageHandler] Rejected malformed toggleApiConfigPin message: ${result.error.message}`,
				)
				break
			}

			const { text } = result.data
			if (text) {
				const currentPinned = getGlobalState(provider, "pinnedApiConfigs") ?? {}
				const updatedPinned: Record<string, boolean> = { ...currentPinned }

				if (currentPinned[text]) {
					delete updatedPinned[text]
				} else {
					updatedPinned[text] = true
				}

				await updateGlobalState(provider, "pinnedApiConfigs", updatedPinned)
				await provider.postStateToWebview()
			}
			break
		}
		case "enhancementApiConfigId": {
			const result = enhancementApiConfigIdMessageSchema.safeParse(message)

			if (!result.success) {
				provider.log(
					`[webviewMessageHandler] Rejected malformed enhancementApiConfigId message: ${result.error.message}`,
				)
				break
			}

			await updateGlobalState(provider, "enhancementApiConfigId", result.data.text)
			await provider.postStateToWebview()
			break
		}

		case "saveApiConfiguration": {
			const result = saveApiConfigurationMessageSchema.safeParse(message)

			if (!result.success) {
				provider.log(
					`[webviewMessageHandler] Rejected malformed saveApiConfiguration message: ${result.error.message}`,
				)
				break
			}

			const m = result.data
			try {
				await provider.providerSettingsManager.saveConfig(m.text, m.apiConfiguration)
				const listApiConfig = await provider.providerSettingsManager.listConfig()
				await updateGlobalState(provider, "listApiConfigMeta", listApiConfig)
			} catch (error) {
				provider.log(
					`Error save api configuration: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
				)
				vscode.window.showErrorMessage(t("common:errors.save_api_config"))
			}
			break
		}
		case "upsertApiConfiguration": {
			const result = upsertApiConfigurationMessageSchema.safeParse(message)

			if (!result.success) {
				provider.log(
					`[webviewMessageHandler] Rejected malformed upsertApiConfiguration message: ${result.error.message}`,
				)
				break
			}

			const m = result.data
			await provider.upsertProviderProfile(m.text, m.apiConfiguration)
			break
		}
		case "renameApiConfiguration": {
			const result = renameApiConfigurationMessageSchema.safeParse(message)

			if (!result.success) {
				provider.log(
					`[webviewMessageHandler] Rejected malformed renameApiConfiguration message: ${result.error.message}`,
				)
				break
			}

			const { values, apiConfiguration } = result.data
			if (values && apiConfiguration) {
				try {
					const { oldName, newName } = values

					if (!oldName || !newName || oldName === newName) {
						break
					}

					// Load the old configuration to get its ID.
					const { id } = await provider.providerSettingsManager.getProfile({ name: oldName })

					// Create a new configuration with the new name and old ID.
					await provider.providerSettingsManager.saveConfig(newName, { ...apiConfiguration, id })

					// Delete the old configuration.
					await provider.providerSettingsManager.deleteConfig(oldName)

					// Re-activate to update the global settings related to the
					// currently activated provider profile.
					await provider.activateProviderProfile({ name: newName })
				} catch (error) {
					provider.log(
						`Error rename api configuration: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
					)

					vscode.window.showErrorMessage(t("common:errors.rename_api_config"))
				}
			}
			break
		}
		case "loadApiConfiguration": {
			const result = loadApiConfigurationMessageSchema.safeParse(message)

			if (!result.success) {
				provider.log(
					`[webviewMessageHandler] Rejected malformed loadApiConfiguration message: ${result.error.message}`,
				)
				break
			}

			const { text } = result.data
			if (text) {
				try {
					await provider.activateProviderProfile({ name: text })
				} catch (error) {
					provider.log(
						`Error load api configuration: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
					)
					vscode.window.showErrorMessage(t("common:errors.load_api_config"))
				}
			}
			break
		}
		case "loadApiConfigurationById": {
			const result = loadApiConfigurationByIdMessageSchema.safeParse(message)

			if (!result.success) {
				provider.log(
					`[webviewMessageHandler] Rejected malformed loadApiConfigurationById message: ${result.error.message}`,
				)
				break
			}

			const { text } = result.data
			if (text) {
				try {
					await provider.activateProviderProfile({ id: text })
				} catch (error) {
					provider.log(
						`Error load api configuration by ID: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
					)
					vscode.window.showErrorMessage(t("common:errors.load_api_config"))
				}
			}
			break
		}
		case "deleteApiConfiguration": {
			const result = deleteApiConfigurationMessageSchema.safeParse(message)

			if (!result.success) {
				provider.log(
					`[webviewMessageHandler] Rejected malformed deleteApiConfiguration message: ${result.error.message}`,
				)
				break
			}

			const { text } = result.data
			if (text) {
				const answer = await vscode.window.showInformationMessage(
					t("common:confirmation.delete_config_profile"),
					{ modal: true },
					t("common:answers.yes"),
				)

				if (answer !== t("common:answers.yes")) {
					break
				}

				const oldName = text

				const newName = (await provider.providerSettingsManager.listConfig()).filter(
					(c) => c.name !== oldName,
				)[0]?.name

				if (!newName) {
					vscode.window.showErrorMessage(t("common:errors.delete_api_config"))
					return
				}

				try {
					await provider.providerSettingsManager.deleteConfig(oldName)
					await provider.activateProviderProfile({ name: newName })
				} catch (error) {
					provider.log(
						`Error delete api configuration: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
					)

					vscode.window.showErrorMessage(t("common:errors.delete_api_config"))
				}
			}
			break
		}
		case "getListApiConfiguration":
			try {
				const listApiConfig = await provider.providerSettingsManager.listConfig()
				await updateGlobalState(provider, "listApiConfigMeta", listApiConfig)
				await provider.postMessageToWebview({ type: "listApiConfig", listApiConfig })
			} catch (error) {
				provider.log(
					`Error get list api configuration: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
				)
				vscode.window.showErrorMessage(t("common:errors.list_api_config"))
			}
			break

		case "openAiCodexSignIn": {
			try {
				const { openAiCodexOAuthManager } = await import("../../../integrations/openai-codex/oauth")
				const authUrl = openAiCodexOAuthManager.startAuthorizationFlow()

				// Open the authorization URL in the browser
				await vscode.env.openExternal(vscode.Uri.parse(authUrl))

				// Wait for the callback in a separate promise (non-blocking)
				openAiCodexOAuthManager
					.waitForCallback()
					.then(async () => {
						vscode.window.showInformationMessage("Successfully signed in to OpenAI Codex")
						await provider.postStateToWebview()
					})
					.catch((error) => {
						provider.log(`OpenAI Codex OAuth callback failed: ${error}`)
						if (!String(error).includes("timed out")) {
							vscode.window.showErrorMessage(`OpenAI Codex sign in failed: ${error.message || error}`)
						}
					})
			} catch (error) {
				provider.log(`OpenAI Codex OAuth failed: ${error}`)
				vscode.window.showErrorMessage("OpenAI Codex sign in failed.")
			}
			break
		}
		case "openAiCodexSignOut": {
			try {
				const { openAiCodexOAuthManager } = await import("../../../integrations/openai-codex/oauth")
				await openAiCodexOAuthManager.clearCredentials()
				vscode.window.showInformationMessage("Signed out from OpenAI Codex")
				await provider.postStateToWebview()
			} catch (error) {
				provider.log(`OpenAI Codex sign out failed: ${error}`)
				vscode.window.showErrorMessage("OpenAI Codex sign out failed.")
			}
			break
		}
		case "kimiCodeSignIn": {
			try {
				const { kimiCodeOAuthManager } = await import("../../../integrations/kimi-code/oauth")
				const device = await kimiCodeOAuthManager.startAuthorization()
				await provider.postStateToWebview()
				await vscode.env.openExternal(
					vscode.Uri.parse(device.verificationUriComplete ?? device.verificationUri),
				)
				void kimiCodeOAuthManager
					.waitForAuthorization()
					.then(async () => {
						vscode.window.showInformationMessage("Successfully signed in to Kimi Code")
						await provider.postStateToWebview()
					})
					.catch(async (error) => {
						provider.log(`Kimi Code OAuth failed: ${error}`)
						await provider.postStateToWebview()
					})
			} catch (error) {
				provider.log(`Kimi Code OAuth failed: ${error}`)
				vscode.window.showErrorMessage(
					`Kimi Code sign in failed: ${error instanceof Error ? error.message : error}`,
				)
				await provider.postStateToWebview()
			}
			break
		}
		case "kimiCodeSignOut": {
			try {
				const { kimiCodeOAuthManager } = await import("../../../integrations/kimi-code/oauth")
				await kimiCodeOAuthManager.clearCredentials()
				vscode.window.showInformationMessage("Signed out from Kimi Code")
				await provider.postStateToWebview()
			} catch (error) {
				provider.log(`Kimi Code sign out failed: ${error}`)
				vscode.window.showErrorMessage("Kimi Code sign out failed.")
			}
			break
		}

		case "requestOpenAiCodexRateLimits": {
			try {
				const { openAiCodexOAuthManager } = await import("../../../integrations/openai-codex/oauth")
				const accessToken = await openAiCodexOAuthManager.getAccessToken()

				if (!accessToken) {
					await provider.postMessageToWebview({
						type: "openAiCodexRateLimits",
						error: "Not authenticated with OpenAI Codex",
					})
					break
				}

				const accountId = await openAiCodexOAuthManager.getAccountId()
				const { fetchOpenAiCodexRateLimitInfo } = await import("../../../integrations/openai-codex/rate-limits")
				const rateLimits = await fetchOpenAiCodexRateLimitInfo(accessToken, { accountId })

				await provider.postMessageToWebview({
					type: "openAiCodexRateLimits",
					// `ExtensionMessage.values` is `Record<string, unknown>`; spread the
					// typed info object into a plain object so the interface record
					// accepts it (an `interface` has no implicit index signature).
					values: { ...rateLimits },
				})
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				provider.log(`Error fetching OpenAI Codex rate limits: ${errorMessage}`)
				await provider.postMessageToWebview({
					type: "openAiCodexRateLimits",
					error: errorMessage,
				})
			}
			break
		}
	}
}
