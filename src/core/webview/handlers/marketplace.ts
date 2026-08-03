import * as vscode from "vscode"
import {
	type WebviewMessage,
	type WebviewMessageType,
	installMarketplaceItemMessageSchema,
	installMarketplaceItemsMessageSchema,
	installMarketplaceItemWithParametersMessageSchema,
} from "@roo-code/types"

import { MarketplaceManager, MarketplaceItemType } from "../../../services/marketplace"
import { t } from "../../../i18n"
import type { ClineProvider } from "../ClineProvider"

export const marketplaceMessageTypes: ReadonlySet<WebviewMessageType> = new Set([
	"fetchMarketplaceData",
	"filterMarketplaceItems",
	"installMarketplaceItem",
	"installMarketplaceItems",
	"installMarketplaceItemWithParameters",
	"removeInstalledMarketplaceItem",
	"showMdmAuthRequiredNotification",
])

export async function handleMarketplaceMessages(
	provider: Pick<ClineProvider, "postStateToWebview" | "fetchMarketplaceData" | "postMessageToWebview" | "log">,
	marketplaceManager: MarketplaceManager | undefined,
	message: WebviewMessage,
): Promise<void> {
	switch (message.type) {
		case "filterMarketplaceItems": {
			if (marketplaceManager && message.filters) {
				try {
					await marketplaceManager.updateWithFilteredItems({
						type: message.filters.type as MarketplaceItemType | undefined,
						search: message.filters.search,
						tags: message.filters.tags,
					})
					await provider.postStateToWebview()
				} catch (error) {
					console.error("Marketplace: Error filtering items:", error)
					vscode.window.showErrorMessage("Failed to filter marketplace items")
				}
			}
			break
		}

		case "fetchMarketplaceData": {
			// Fetch marketplace data on demand
			await provider.fetchMarketplaceData()
			break
		}

		case "installMarketplaceItem": {
			const result = installMarketplaceItemMessageSchema.safeParse(message)

			if (!result.success) {
				provider.log(
					`[webviewMessageHandler] Rejected malformed installMarketplaceItem message: ${result.error.message}`,
				)
				break
			}

			const m = result.data
			if (marketplaceManager) {
				try {
					const configFilePath = await marketplaceManager.installMarketplaceItem(m.mpItem, m.mpInstallOptions)
					await provider.postStateToWebview()
					console.log(`Marketplace item installed and config file opened: ${configFilePath}`)

					// Send success message to webview
					await provider.postMessageToWebview({
						type: "marketplaceInstallResult",
						success: true,
						slug: m.mpItem.id,
					})
				} catch (error) {
					console.error(`Error installing marketplace item: ${error}`)
					// Send error message to webview
					await provider.postMessageToWebview({
						type: "marketplaceInstallResult",
						success: false,
						error: error instanceof Error ? error.message : String(error),
						slug: m.mpItem.id,
					})
				}
			}
			break
		}

		case "installMarketplaceItems": {
			const result = installMarketplaceItemsMessageSchema.safeParse(message)

			if (!result.success) {
				provider.log(
					`[webviewMessageHandler] Rejected malformed installMarketplaceItems message: ${result.error.message}`,
				)
				break
			}

			const m = result.data
			if (marketplaceManager) {
				try {
					const results = await marketplaceManager.installMarketplaceItems(m.mpItems, m.mpInstallOptions)
					await provider.postStateToWebview()

					// Send bulk install results back to webview
					void provider.postMessageToWebview({
						type: "marketplaceBulkInstallResult",
						results,
					})
				} catch (error) {
					console.error(`Error installing marketplace items in bulk: ${error}`)
					void provider.postMessageToWebview({
						type: "marketplaceBulkInstallResult",
						results: m.mpItems.map((item) => ({
							slug: item.id,
							success: false,
							error: error instanceof Error ? error.message : String(error),
						})),
					})
				}
			}
			break
		}

		case "removeInstalledMarketplaceItem": {
			if (marketplaceManager && message.mpItem && message.mpInstallOptions) {
				try {
					await marketplaceManager.removeInstalledMarketplaceItem(message.mpItem, message.mpInstallOptions)
					await provider.postStateToWebview()

					// Send success message to webview
					await provider.postMessageToWebview({
						type: "marketplaceRemoveResult",
						success: true,
						slug: message.mpItem.id,
					})
				} catch (error) {
					console.error(`Error removing marketplace item: ${error}`)

					// Show error message to user
					vscode.window.showErrorMessage(
						`Failed to remove marketplace item: ${error instanceof Error ? error.message : String(error)}`,
					)

					// Send error message to webview
					await provider.postMessageToWebview({
						type: "marketplaceRemoveResult",
						success: false,
						error: error instanceof Error ? error.message : String(error),
						slug: message.mpItem.id,
					})
				}
			} else {
				// MarketplaceManager not available or missing required parameters
				const errorMessage = !marketplaceManager
					? "Marketplace manager is not available"
					: "Missing required parameters for marketplace item removal"
				console.error(errorMessage)

				vscode.window.showErrorMessage(errorMessage)

				if (message.mpItem?.id) {
					await provider.postMessageToWebview({
						type: "marketplaceRemoveResult",
						success: false,
						error: errorMessage,
						slug: message.mpItem.id,
					})
				}
			}
			break
		}

		case "installMarketplaceItemWithParameters": {
			const result = installMarketplaceItemWithParametersMessageSchema.safeParse(message)

			if (!result.success) {
				provider.log(
					`[webviewMessageHandler] Rejected malformed installMarketplaceItemWithParameters message: ${result.error.message}`,
				)
				break
			}

			const m = result.data
			if (marketplaceManager) {
				try {
					const configFilePath = await marketplaceManager.installMarketplaceItem(m.payload.item, {
						parameters: m.payload.parameters,
					})
					await provider.postStateToWebview()
					console.log(`Marketplace item with parameters installed and config file opened: ${configFilePath}`)
				} catch (error) {
					console.error(`Error installing marketplace item with parameters: ${error}`)
					vscode.window.showErrorMessage(
						`Failed to install marketplace item: ${error instanceof Error ? error.message : String(error)}`,
					)
				}
			}
			break
		}

		case "showMdmAuthRequiredNotification": {
			// Show notification that organization requires authentication
			vscode.window.showWarningMessage(t("common:mdm.info.organization_requires_auth"))
			break
		}
	}
}
