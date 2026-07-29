vi.mock("vscode", () => ({
	window: {
		showInformationMessage: vi.fn(),
	},
}))

import * as vscode from "vscode"

const { mockGetVisibleInstance, mockGetAllInstances, mockVisibleProvider } = vi.hoisted(() => {
	const mockVisibleProvider = {
		handleOpenRouterCallback: vi.fn(),
		handleRequestyCallback: vi.fn(),
	} as any

	return {
		mockGetVisibleInstance: vi.fn(() => mockVisibleProvider),
		mockGetAllInstances: vi.fn(() => [mockVisibleProvider]),
		mockVisibleProvider,
	}
})

vi.mock("../../core/webview/ClineProvider", () => ({
	ClineProvider: {
		getVisibleInstance: mockGetVisibleInstance,
		getAllInstances: mockGetAllInstances,
	},
}))

import { handleUri } from "../handleUri"

describe("handleUri", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockGetVisibleInstance.mockReturnValue(mockVisibleProvider)
		mockGetAllInstances.mockReturnValue([mockVisibleProvider])
	})

	it("ignores legacy cloud auth callback", async () => {
		await handleUri({
			path: "/auth/clerk/callback",
			query: "code=test-code&state=test-state&organizationId=test-org",
		} as any)

		expect(mockVisibleProvider.handleOpenRouterCallback).not.toHaveBeenCalled()
		expect(mockVisibleProvider.handleRequestyCallback).not.toHaveBeenCalled()
		expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
			"Roo Code Cloud sign-in is currently unavailable. Configure another provider to continue.",
		)
	})

	it("shows deprecation message for zoo gateway auth callback", async () => {
		await handleUri({
			path: "/auth-callback",
			query: "token=zoo_ext_test_token&name=Jane%20Doe&email=jane%40example.com",
		} as any)

		expect(vscode.window.showInformationMessage).toHaveBeenCalledWith("Roo+ authentication is no longer supported.")
	})

	it("handles OpenRouter callback", async () => {
		await handleUri({
			path: "/openrouter",
			query: "code=test-code",
		} as any)

		expect(mockVisibleProvider.handleOpenRouterCallback).toHaveBeenCalledWith("test-code")
	})

	it("handles Requesty callback", async () => {
		await handleUri({
			path: "/requesty",
			query: "code=test-code&baseUrl=https://example.com",
		} as any)

		expect(mockVisibleProvider.handleRequestyCallback).toHaveBeenCalledWith("test-code", "https://example.com")
	})

	it("does nothing when no visible provider exists for OpenRouter callback", async () => {
		mockGetVisibleInstance.mockReturnValue(null)

		await handleUri({
			path: "/openrouter",
			query: "code=test-code",
		} as any)

		expect(mockVisibleProvider.handleOpenRouterCallback).not.toHaveBeenCalled()
	})

	it("handles unknown paths gracefully", async () => {
		await handleUri({
			path: "/unknown/path",
			query: "",
		} as any)

		expect(vscode.window.showInformationMessage).not.toHaveBeenCalled()
		expect(mockVisibleProvider.handleOpenRouterCallback).not.toHaveBeenCalled()
		expect(mockVisibleProvider.handleRequestyCallback).not.toHaveBeenCalled()
	})
})
