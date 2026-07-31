import type { ExtensionMessage, MarketplaceInstalledMetadata } from "@roo-code/types"

import type { MarketplaceManager } from "../../services/marketplace"

/**
 * Dependencies injected into {@link MarketplaceService}.
 *
 * Narrow ports are injected instead of the full `ClineProvider` so the service
 * stays decoupled (mirroring the S2 `Pick<ClineProvider, ...>` pattern).
 */
export interface MarketplaceServiceDeps {
	/**
	 * Getter for the marketplace manager.
	 *
	 * Read at call time (not captured) so the provider's current manager
	 * instance is always used, matching the original `this.marketplaceManager`
	 * dynamic access.
	 */
	getMarketplaceManager: () => MarketplaceManager
	/** Port that posts a message to the webview. */
	postMessageToWebview: (message: ExtensionMessage) => Promise<void>
	/** Log sink. */
	log: (message: string) => void
	/** Port that shows the user-friendly timeout warning message. */
	showTimeoutWarning: (message: string) => void
}

/**
 * Owns on-demand marketplace data fetching previously embedded in
 * `ClineProvider`.
 *
 * Extracted from the `ClineProvider` god-object (S3a). The marketplace-manager
 * interaction, the timeout warning, and the empty-data-on-error notifications
 * are preserved exactly; `ClineProvider` delegates to this service.
 */
export class MarketplaceService {
	private readonly deps: MarketplaceServiceDeps

	constructor(deps: MarketplaceServiceDeps) {
		this.deps = deps
	}

	/**
	 * Fetches marketplace data on demand to avoid blocking main state updates.
	 */
	async fetchMarketplaceData(): Promise<void> {
		const marketplaceManager = this.deps.getMarketplaceManager()

		try {
			const [marketplaceResult, marketplaceInstalledMetadata] = await Promise.all([
				marketplaceManager.getMarketplaceItems().catch((error) => {
					this.deps.log(`Failed to fetch marketplace items: ${String(error)}`)
					return { organizationMcps: [], marketplaceItems: [], errors: [error.message] }
				}),
				marketplaceManager.getInstallationMetadata().catch((error) => {
					this.deps.log(`Failed to fetch installation metadata: ${String(error)}`)
					return { project: {}, global: {} } as MarketplaceInstalledMetadata
				}),
			])

			// Send marketplace data separately
			await this.deps.postMessageToWebview({
				type: "marketplaceData",
				organizationMcps: marketplaceResult.organizationMcps || [],
				marketplaceItems: marketplaceResult.marketplaceItems || [],
				marketplaceInstalledMetadata: marketplaceInstalledMetadata || { project: {}, global: {} },
				errors: marketplaceResult.errors,
			})
		} catch (error) {
			this.deps.log(`Failed to fetch marketplace data: ${String(error)}`)

			// Send empty data on error to prevent UI from hanging
			await this.deps.postMessageToWebview({
				type: "marketplaceData",
				organizationMcps: [],
				marketplaceItems: [],
				marketplaceInstalledMetadata: { project: {}, global: {} },
				errors: [error instanceof Error ? error.message : String(error)],
			})

			// Show user-friendly error notification for network issues
			if (error instanceof Error && error.message.includes("timeout")) {
				this.deps.showTimeoutWarning(
					"Marketplace data could not be loaded due to network restrictions. Core functionality remains available.",
				)
			}
		}
	}
}
