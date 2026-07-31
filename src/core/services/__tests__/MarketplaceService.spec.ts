// npx vitest run core/services/__tests__/MarketplaceService.spec.ts

import type { MarketplaceManager } from "../../../services/marketplace"

import { MarketplaceService, type MarketplaceServiceDeps } from "../MarketplaceService"

type MarketplaceManagerLike = Pick<MarketplaceManager, "getMarketplaceItems" | "getInstallationMetadata"> & {
	getMarketplaceItems: ReturnType<typeof vi.fn>
	getInstallationMetadata: ReturnType<typeof vi.fn>
}

interface TestHarness {
	service: MarketplaceService
	marketplaceManager: MarketplaceManagerLike
	postMessageToWebview: ReturnType<typeof vi.fn>
	log: ReturnType<typeof vi.fn>
	showTimeoutWarning: ReturnType<typeof vi.fn>
	createService: (overrides?: Partial<MarketplaceServiceDeps>) => MarketplaceService
}

const makeHarness = (): TestHarness => {
	const marketplaceManager: MarketplaceManagerLike = {
		getMarketplaceItems: vi.fn().mockResolvedValue({
			organizationMcps: [],
			marketplaceItems: [{ name: "Item 1", description: "desc", type: "mode" }],
		}),
		getInstallationMetadata: vi.fn().mockResolvedValue({ project: {}, global: {} }),
	}
	const postMessageToWebview = vi.fn().mockResolvedValue(undefined)
	const log = vi.fn()
	const showTimeoutWarning = vi.fn()

	const baseDeps: MarketplaceServiceDeps = {
		// Test double for the concrete MarketplaceManager class; only the two
		// methods the service uses are provided.
		getMarketplaceManager: () => marketplaceManager as unknown as MarketplaceManager,
		postMessageToWebview,
		log,
		showTimeoutWarning,
	}

	return {
		service: new MarketplaceService(baseDeps),
		marketplaceManager,
		postMessageToWebview,
		log,
		showTimeoutWarning,
		createService: (overrides = {}) => new MarketplaceService({ ...baseDeps, ...overrides }),
	}
}

describe("MarketplaceService.fetchMarketplaceData", () => {
	it("posts marketplace data with fetched items and metadata on success", async () => {
		const h = makeHarness()

		await h.service.fetchMarketplaceData()

		expect(h.marketplaceManager.getMarketplaceItems).toHaveBeenCalledTimes(1)
		expect(h.marketplaceManager.getInstallationMetadata).toHaveBeenCalledTimes(1)
		expect(h.postMessageToWebview).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "marketplaceData",
				marketplaceItems: [expect.objectContaining({ name: "Item 1" })],
			}),
		)
	})

	it("collects errors from getMarketplaceItems when that call rejects", async () => {
		const h = makeHarness()
		h.marketplaceManager.getMarketplaceItems.mockRejectedValue(new Error("items fetch failed"))

		await h.service.fetchMarketplaceData()

		expect(h.postMessageToWebview).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "marketplaceData",
				marketplaceItems: [],
				errors: ["items fetch failed"],
			}),
		)
		// The per-call catch must not trigger the warning or the outer error branch.
		expect(h.showTimeoutWarning).not.toHaveBeenCalled()
	})

	it("shows the timeout warning and posts empty data when the outer flow times out", async () => {
		const h = makeHarness()
		// The success-path post rejects with a timeout, which escapes the
		// per-call catches and lands in the outer catch.
		h.postMessageToWebview.mockRejectedValueOnce(new Error("network timeout"))

		await h.service.fetchMarketplaceData()

		expect(h.postMessageToWebview).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({
				type: "marketplaceData",
				marketplaceItems: [],
				errors: ["network timeout"],
			}),
		)
		expect(h.showTimeoutWarning).toHaveBeenCalledWith(expect.stringContaining("network restrictions"))
	})

	it("posts empty data without a warning for a non-timeout outer error", async () => {
		const h = makeHarness()
		h.postMessageToWebview.mockRejectedValueOnce(new Error("boom"))

		await h.service.fetchMarketplaceData()

		expect(h.postMessageToWebview).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({
				type: "marketplaceData",
				marketplaceItems: [],
				errors: ["boom"],
			}),
		)
		expect(h.showTimeoutWarning).not.toHaveBeenCalled()
	})

	it("logs the outer failure", async () => {
		const h = makeHarness()
		h.postMessageToWebview.mockRejectedValueOnce(new Error("boom"))

		await h.service.fetchMarketplaceData()

		expect(h.log).toHaveBeenCalledWith(expect.stringContaining("Failed to fetch marketplace data"))
	})
})
