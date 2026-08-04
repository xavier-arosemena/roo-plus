import { describe, it, expect, vi, beforeEach } from "vitest"
import type { Mock } from "vitest"
import type { WebviewMessage } from "@roo-code/types"
import { handleCodeIndexMessages } from "../handlers/codeIndex"
import { CodeIndexManager } from "../../../services/code-index/manager"

vi.mock("../../../i18n", () => ({
	t: (key: string, _params?: unknown) => key,
}))

vi.mock("../../../services/code-index/manager", () => ({
	CodeIndexManager: {
		getAllInstances: vi.fn(() => []),
	},
}))

type CodeIndexProvider = Parameters<typeof handleCodeIndexMessages>[0]

/**
 * Fake manager exposing the surface the codeIndex handler touches.
 * `isWorkspaceEnabled` is backed by a mutable flag so enable/disable toggles
 * can be observed like the real manager.
 */
interface MockIndexManager {
	setWorkspaceEnabled: Mock
	setAutoEnableDefault: Mock
	readonly isWorkspaceEnabled: boolean
	initialize: Mock
	isFeatureEnabled: boolean
	isFeatureConfigured: boolean
	state: string
	isInitialized: boolean
	startIndexing: Mock
	stopIndexing: Mock
	getCurrentStatus: Mock
}

function createManager(overrides: Partial<MockIndexManager> = {}): MockIndexManager {
	const { isWorkspaceEnabled, ...rest } = overrides
	let workspaceEnabled = isWorkspaceEnabled ?? false
	return {
		setWorkspaceEnabled: vi.fn().mockImplementation(async (v: boolean) => {
			workspaceEnabled = v
		}),
		setAutoEnableDefault: vi.fn().mockImplementation(async (v: boolean) => {
			if (v) workspaceEnabled = true
		}),
		initialize: vi.fn().mockResolvedValue({ requiresRestart: false }),
		get isWorkspaceEnabled() {
			return workspaceEnabled
		},
		isFeatureEnabled: false,
		isFeatureConfigured: false,
		state: "Standby",
		isInitialized: false,
		startIndexing: vi.fn().mockResolvedValue(undefined),
		stopIndexing: vi.fn(),
		getCurrentStatus: vi.fn().mockReturnValue({
			systemStatus: "Standby",
			message: "",
			processedItems: 0,
			totalItems: 0,
			currentItemUnit: "items",
		}),
		// The spread of Partial<T> widens required fields to optional, so cast the
		// merged object back to the concrete interface.
		...rest,
	} as MockIndexManager
}

function createProvider(manager: MockIndexManager): CodeIndexProvider {
	const provider = {
		contextProxy: { storeSecret: vi.fn() },
		context: { secrets: { get: vi.fn().mockResolvedValue("") } },
		postMessageToWebview: vi.fn().mockResolvedValue(undefined),
		postStateToWebview: vi.fn().mockResolvedValue(undefined),
		getCurrentWorkspaceCodeIndexManager: vi.fn().mockReturnValue(manager),
		log: vi.fn(),
	}
	// Test-only: the handler only needs a subset of ClineProvider's surface.
	return provider as unknown as CodeIndexProvider
}

describe("handleCodeIndexMessages — indexing regression (VSIX #117)", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(CodeIndexManager.getAllInstances).mockReturnValue([])
	})

	describe("startIndexing", () => {
		it("calls initialize() before evaluating feature flags and always posts status (R1/R4)", async () => {
			// Simulate a manager that was never initialized (fresh remote session,
			// swallowed background init) — feature flags are false.
			const manager = createManager({ isFeatureEnabled: false, isFeatureConfigured: false })
			const provider = createProvider(manager)

			await handleCodeIndexMessages(provider, undefined, { type: "startIndexing" } as unknown as WebviewMessage)

			// "Start Indexing" implicitly enables the workspace first
			expect(manager.setWorkspaceEnabled).toHaveBeenCalledWith(true)
			// Unconditional initialize — the regression: even unconfigured managers get initialized
			expect(manager.initialize).toHaveBeenCalledWith(provider.contextProxy)
			// Not started because feature isn't enabled/configured yet
			expect(manager.startIndexing).not.toHaveBeenCalled()
			// The UI always receives a status update (not only via the emitter)
			expect(provider.postMessageToWebview).toHaveBeenCalledWith(
				expect.objectContaining({ type: "indexingStatusUpdate", values: manager.getCurrentStatus() }),
			)
		})

		it("starts indexing when enabled and configured and posts status (R1/R4)", async () => {
			const manager = createManager({
				isFeatureEnabled: true,
				isFeatureConfigured: true,
				state: "Standby",
				isInitialized: true,
			})
			const provider = createProvider(manager)

			await handleCodeIndexMessages(provider, undefined, { type: "startIndexing" } as unknown as WebviewMessage)

			expect(manager.initialize).toHaveBeenCalled()
			expect(manager.startIndexing).toHaveBeenCalled()
			expect(provider.postMessageToWebview).toHaveBeenCalledWith(
				expect.objectContaining({ type: "indexingStatusUpdate" }),
			)
		})
	})

	describe("toggleWorkspaceIndexing", () => {
		it("initializes before evaluating feature flags (R1)", async () => {
			const manager = createManager({ isFeatureEnabled: false, isFeatureConfigured: false })
			const provider = createProvider(manager)

			await handleCodeIndexMessages(provider, undefined, {
				type: "toggleWorkspaceIndexing",
				bool: true,
			} as unknown as WebviewMessage)

			expect(manager.setWorkspaceEnabled).toHaveBeenCalledWith(true)
			expect(manager.initialize).toHaveBeenCalled()
			expect(manager.startIndexing).not.toHaveBeenCalled()
			expect(provider.postMessageToWebview).toHaveBeenCalledWith(
				expect.objectContaining({ type: "indexingStatusUpdate" }),
			)
		})
	})

	describe("stopIndexing", () => {
		it("posts a status update (R4)", async () => {
			const manager = createManager()
			const provider = createProvider(manager)

			await handleCodeIndexMessages(provider, undefined, { type: "stopIndexing" } as unknown as WebviewMessage)

			expect(manager.stopIndexing).toHaveBeenCalled()
			expect(provider.postMessageToWebview).toHaveBeenCalledWith(
				expect.objectContaining({ type: "indexingStatusUpdate" }),
			)
		})
	})

	describe("setAutoEnableDefault", () => {
		it("initializes a newly-enabled manager before the feature check (R1)", async () => {
			const manager = createManager()
			// Test-only: the mocked manager is not a real CodeIndexManager.
			vi.mocked(CodeIndexManager.getAllInstances).mockReturnValue([manager as unknown as CodeIndexManager])
			const provider = createProvider(manager)

			// The manager starts disabled; enabling auto-enable flips its enablement.
			await handleCodeIndexMessages(provider, undefined, {
				type: "setAutoEnableDefault",
				bool: true,
			} as unknown as WebviewMessage)

			expect(manager.setAutoEnableDefault).toHaveBeenCalledWith(true)
			expect(manager.initialize).toHaveBeenCalled()
			expect(provider.postMessageToWebview).toHaveBeenCalledWith(
				expect.objectContaining({ type: "indexingStatusUpdate" }),
			)
		})
	})
})
