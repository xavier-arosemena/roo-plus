import { render, waitFor } from "@testing-library/react"

import { ExtensionStateContext } from "@/context/ExtensionStateContext"
import { vscode } from "@/utils/vscode"

import { MarketplaceView } from "../MarketplaceView"
import { MarketplaceViewStateManager } from "../MarketplaceViewStateManager"
import { DEFAULT_CHECKPOINT_TIMEOUT_SECONDS } from "@roo-code/types"

vi.mock("@/utils/vscode", () => ({
	vscode: {
		postMessage: vi.fn(),
	},
}))

vi.mock("@/i18n/TranslationContext", () => ({
	useAppTranslation: () => ({
		t: (key: string) => key,
	}),
}))

describe("MarketplaceView", () => {
	let stateManager: MarketplaceViewStateManager
	let mockExtensionState: any

	beforeEach(() => {
		vi.clearAllMocks()
		stateManager = new MarketplaceViewStateManager()

		// Initialize state manager with some test data
		stateManager.transition({
			type: "FETCH_COMPLETE",
			payload: {
				items: [
					{
						id: "test-mcp",
						name: "Test MCP",
						type: "mcp" as const,
						description: "Test MCP server",
						tags: ["test"],
						content: "Test content",
						url: "https://test.com",
						author: "Test Author",
					},
				],
			},
		})

		mockExtensionState = {
			organizationSettingsVersion: 1,
			// Add other required properties for the context
			didHydrateState: true,
			showWelcome: false,
			theme: {},
			mcpServers: [],
			filePaths: [],
			openedTabs: [],
			commands: [],
			organizationAllowList: { allowAll: true, providers: {} },
			cloudIsAuthenticated: false,
			sharingEnabled: false,
			hasOpenedModeSelector: false,
			setHasOpenedModeSelector: vi.fn(),
			alwaysAllowFollowupQuestions: false,
			setAlwaysAllowFollowupQuestions: vi.fn(),
			followupAutoApproveTimeoutMs: 60000,
			setFollowupAutoApproveTimeoutMs: vi.fn(),
			profileThresholds: {},
			setProfileThresholds: vi.fn(),
			checkpointTimeout: DEFAULT_CHECKPOINT_TIMEOUT_SECONDS,
			// ... other required context properties
		}
	})

	it("should not trigger fetchMarketplaceData on mount when items already exist", async () => {
		render(
			<ExtensionStateContext.Provider value={mockExtensionState}>
				<MarketplaceView stateManager={stateManager} />
			</ExtensionStateContext.Provider>,
		)

		// State already has items from FETCH_COMPLETE, so no fetch should be triggered
		expect(vscode.postMessage).not.toHaveBeenCalledWith({
			type: "fetchMarketplaceData",
		})
	})

	it("should trigger fetchMarketplaceData on mount when items are empty", async () => {
		// Create a fresh state manager with no items loaded
		const emptyStateManager = new MarketplaceViewStateManager()

		render(
			<ExtensionStateContext.Provider value={mockExtensionState}>
				<MarketplaceView stateManager={emptyStateManager} />
			</ExtensionStateContext.Provider>,
		)

		// Should trigger fetch when no items exist
		await waitFor(() => {
			expect(vscode.postMessage).toHaveBeenCalledWith({
				type: "fetchMarketplaceData",
			})
		})
	})

	it("should display MCP and Modes tabs", () => {
		const { container } = render(
			<ExtensionStateContext.Provider value={mockExtensionState}>
				<MarketplaceView stateManager={stateManager} />
			</ExtensionStateContext.Provider>,
		)

		expect(container.textContent).toContain("MCP")
		expect(container.textContent).toContain("Modes")
	})
})
