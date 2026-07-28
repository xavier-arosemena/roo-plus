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

	it("should trigger fetchMarketplaceData on mount when no items exist", async () => {
		// Reset state to have no items
		stateManager = new MarketplaceViewStateManager()

		render(
			<ExtensionStateContext.Provider value={mockExtensionState}>
				<MarketplaceView stateManager={stateManager} />
			</ExtensionStateContext.Provider>,
		)

		// Should trigger fetch on mount since there are no items and no initial state received
		await waitFor(() => {
			expect(vscode.postMessage).toHaveBeenCalledWith({
				type: "fetchMarketplaceData",
			})
		})
	})

	it("should not trigger fetchMarketplaceData on mount when items already exist", async () => {
		render(
			<ExtensionStateContext.Provider value={mockExtensionState}>
				<MarketplaceView stateManager={stateManager} />
			</ExtensionStateContext.Provider>,
		)

		// Should NOT trigger fetch because items already exist (state is pre-populated)
		await waitFor(() => {
			expect(vscode.postMessage).not.toHaveBeenCalledWith({
				type: "fetchMarketplaceData",
			})
		})
	})
})
