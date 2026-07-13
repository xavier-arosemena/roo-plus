import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import * as vscode from "vscode"

import {
	clearRooPlusToken,
	clearRooPlusUserInfo,
	disconnectRooPlus,
	getCachedRooPlusToken,
	getCachedRooPlusUserInfo,
	getRooPlusBaseUrl,
	handleAuthCallback,
	initRooPlusAuth,
	resolveZooGatewaySessionToken,
	setRooPlusToken,
	setRooPlusUserInfo,
	verifyRooPlusToken,
} from "../roo-plus-auth"

vi.mock("vscode", () => ({
	workspace: {
		getConfiguration: vi.fn(() => ({
			get: vi.fn((key: string, defaultValue?: string) => defaultValue),
		})),
	},
	window: {
		showErrorMessage: vi.fn(),
		showInformationMessage: vi.fn(),
	},
}))

vi.mock("../i18n", () => ({
	t: vi.fn((key: string) => key),
}))

const mockFetch = vi.fn()
global.fetch = mockFetch as any

describe("zoo-code-auth", () => {
	let mockSecrets: any
	let mockContext: any

	beforeEach(() => {
		vi.clearAllMocks()
		mockFetch.mockReset()

		const secretStore: Record<string, string> = {}
		mockSecrets = {
			get: vi.fn(async (key: string) => secretStore[key]),
			store: vi.fn(async (key: string, value: string) => {
				secretStore[key] = value
			}),
			delete: vi.fn(async (key: string) => {
				delete secretStore[key]
			}),
			onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
		}

		mockContext = {
			secrets: mockSecrets,
		}
	})

	afterEach(async () => {
		await clearRooPlusToken()
		await clearRooPlusUserInfo()
		vi.restoreAllMocks()
	})

	describe("getCachedRooPlusToken", () => {
		it("returns an empty string when no token is set", async () => {
			await clearRooPlusToken()

			expect(getCachedRooPlusToken()).toBe("")
		})

		it("preloads the cached token during initialization", async () => {
			await mockSecrets.store("roo-plus-session-token", "zoo_ext_cached_token")
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ valid: true }),
			})

			await initRooPlusAuth(mockContext)
			await Promise.resolve()

			expect(getCachedRooPlusToken()).toBe("zoo_ext_cached_token")
		})
	})

	describe("initRooPlusAuth", () => {
		it("clears stored user info and token when the cached token is invalid", async () => {
			await mockSecrets.store("roo-plus-session-token", "zoo_ext_stale_token")
			await mockSecrets.store("roo-plus-user-name", "Jane Doe")
			await mockSecrets.store("roo-plus-user-email", "jane@example.com")
			await mockSecrets.store("roo-plus-user-image", "https://example.com/avatar.png")
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ valid: false }),
			})

			await initRooPlusAuth(mockContext)

			// Both token and user info should be cleared on a definitive invalid response
			expect(getCachedRooPlusToken()).toBe("")
			expect(getCachedRooPlusUserInfo()).toEqual({
				name: undefined,
				email: undefined,
				image: undefined,
			})
		})

		it("clears stored user info and token when backend returns HTTP error (invalid token)", async () => {
			await mockSecrets.store("roo-plus-session-token", "zoo_ext_stale_token")
			await mockSecrets.store("roo-plus-user-name", "Jane Doe")
			await mockSecrets.store("roo-plus-user-email", "jane@example.com")
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 401,
				statusText: "Unauthorized",
			})

			await initRooPlusAuth(mockContext)

			expect(getCachedRooPlusToken()).toBe("")
			expect(getCachedRooPlusUserInfo()).toEqual({
				name: undefined,
				email: undefined,
				image: undefined,
			})
		})

		it("preserves token and user info when the backend is temporarily unreachable", async () => {
			await mockSecrets.store("roo-plus-session-token", "zoo_ext_valid_token")
			await mockSecrets.store("roo-plus-user-name", "Jane Doe")
			await mockSecrets.store("roo-plus-user-email", "jane@example.com")
			// Simulate a network error during verification
			mockFetch.mockRejectedValueOnce(new Error("Network error"))

			await initRooPlusAuth(mockContext)

			expect(getCachedRooPlusToken()).toBe("zoo_ext_valid_token")
			expect(getCachedRooPlusUserInfo().name).toBe("Jane Doe")
		})

		it("preserves token and user info when verify returns 5xx (transient backend error)", async () => {
			await mockSecrets.store("roo-plus-session-token", "zoo_ext_valid_token")
			await mockSecrets.store("roo-plus-user-name", "Jane Doe")
			await mockSecrets.store("roo-plus-user-email", "jane@example.com")
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 503,
				statusText: "Service Unavailable",
			})

			await initRooPlusAuth(mockContext)

			expect(getCachedRooPlusToken()).toBe("zoo_ext_valid_token")
			expect(getCachedRooPlusUserInfo().name).toBe("Jane Doe")
		})
	})

	describe("clearRooPlusToken", () => {
		it("clears the cached token", async () => {
			await initRooPlusAuth(mockContext)
			await setRooPlusToken("zoo_ext_test_token")

			await clearRooPlusToken()

			expect(getCachedRooPlusToken()).toBe("")
		})
	})

	describe("getRooPlusBaseUrl", () => {
		it("returns the default URL when ZOO_CODE_BASE_URL is not set", () => {
			const originalEnv = process.env.ZOO_CODE_BASE_URL
			delete process.env.ZOO_CODE_BASE_URL

			expect(getRooPlusBaseUrl()).toBe("https://www.zoocode.dev")

			if (originalEnv) {
				process.env.ZOO_CODE_BASE_URL = originalEnv
			}
		})

		it("respects ZOO_CODE_BASE_URL", () => {
			const originalEnv = process.env.ZOO_CODE_BASE_URL
			process.env.ZOO_CODE_BASE_URL = "https://staging.zoocode.dev"

			expect(getRooPlusBaseUrl()).toBe("https://staging.zoocode.dev")

			if (originalEnv) {
				process.env.ZOO_CODE_BASE_URL = originalEnv
			} else {
				delete process.env.ZOO_CODE_BASE_URL
			}
		})
	})

	describe("handleAuthCallback", () => {
		it("does not persist a token when backend verification fails", async () => {
			await initRooPlusAuth(mockContext)
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ valid: false }),
			})

			const success = await handleAuthCallback("zoo_ext_fake_token")

			expect(success).toBe(false)
			expect(getCachedRooPlusToken()).toBe("")
			expect(mockSecrets.store).not.toHaveBeenCalledWith("roo-plus-session-token", "zoo_ext_fake_token")
		})

		it("persists a token only after backend verification succeeds", async () => {
			await initRooPlusAuth(mockContext)
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ valid: true }),
			})

			const success = await handleAuthCallback("zoo_ext_real_token")

			expect(success).toBe(true)
			expect(getCachedRooPlusToken()).toBe("zoo_ext_real_token")
			expect(mockSecrets.store).toHaveBeenCalledWith("roo-plus-session-token", "zoo_ext_real_token")
		})
	})

	describe("verifyRooPlusToken", () => {
		it("returns 'valid' when the backend confirms the token", async () => {
			await initRooPlusAuth(mockContext)
			await setRooPlusToken("zoo_ext_valid_token")
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ valid: true }),
			})

			expect(await verifyRooPlusToken()).toBe("valid")
			// Token should NOT be cleared — no side effects
			expect(getCachedRooPlusToken()).toBe("zoo_ext_valid_token")
		})

		it("returns 'invalid' when the backend reports valid: false", async () => {
			await initRooPlusAuth(mockContext)
			await setRooPlusToken("zoo_ext_invalid_token")
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ valid: false }),
			})

			expect(await verifyRooPlusToken()).toBe("invalid")
			// No side effects — caller decides what to do
			expect(getCachedRooPlusToken()).toBe("zoo_ext_invalid_token")
		})

		it("returns 'invalid' when the backend returns 4xx", async () => {
			await initRooPlusAuth(mockContext)
			await setRooPlusToken("zoo_ext_invalid_token")
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 401,
				statusText: "Unauthorized",
			})

			expect(await verifyRooPlusToken()).toBe("invalid")
		})

		it("returns 'unreachable' when the backend returns 5xx (transient)", async () => {
			await initRooPlusAuth(mockContext)
			await setRooPlusToken("zoo_ext_token")
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 503,
				statusText: "Service Unavailable",
			})

			expect(await verifyRooPlusToken()).toBe("unreachable")
			expect(getCachedRooPlusToken()).toBe("zoo_ext_token")
		})

		it("returns 'unreachable' when a network error occurs", async () => {
			await initRooPlusAuth(mockContext)
			await setRooPlusToken("zoo_ext_token")
			mockFetch.mockRejectedValueOnce(new Error("Network error"))

			expect(await verifyRooPlusToken()).toBe("unreachable")
			// Token must NOT be cleared on network error
			expect(getCachedRooPlusToken()).toBe("zoo_ext_token")
		})

		it("returns 'invalid' when no token is stored", async () => {
			await initRooPlusAuth(mockContext)

			expect(await verifyRooPlusToken()).toBe("invalid")
		})
	})

	describe("setRooPlusUserInfo", () => {
		it("clears email when passed null", async () => {
			await initRooPlusAuth(mockContext)
			await setRooPlusUserInfo({
				name: "Jane Doe",
				email: "jane@example.com",
				image: "https://example.com/avatar.png",
			})

			// Verify email is set
			expect(getCachedRooPlusUserInfo().email).toBe("jane@example.com")

			// Clear email with null
			await setRooPlusUserInfo({ email: null })

			// Email should be cleared, but other fields should remain
			const info = getCachedRooPlusUserInfo()
			expect(info.email).toBeUndefined()
			expect(info.name).toBe("Jane Doe")
			expect(info.image).toBe("https://example.com/avatar.png")
		})

		it("does not clear email when passed undefined", async () => {
			await initRooPlusAuth(mockContext)
			await setRooPlusUserInfo({
				name: "Jane Doe",
				email: "jane@example.com",
				image: "https://example.com/avatar.png",
			})

			// Pass undefined for email - should preserve existing value
			await setRooPlusUserInfo({ name: "John Doe", email: undefined })

			const info = getCachedRooPlusUserInfo()
			expect(info.email).toBe("jane@example.com")
			expect(info.name).toBe("John Doe")
		})
	})

	describe("resolveZooGatewaySessionToken", () => {
		it("prefers the cached token over a profile token", async () => {
			await initRooPlusAuth(mockContext)
			await setRooPlusToken("zoo_ext_cached")

			expect(resolveZooGatewaySessionToken("zoo_ext_profile")).toBe("zoo_ext_cached")
		})

		it("ignores profile tokens after an explicit sign-out clear", async () => {
			await initRooPlusAuth(mockContext)
			await setRooPlusToken("zoo_ext_cached")
			await clearRooPlusToken()

			expect(resolveZooGatewaySessionToken("zoo_ext_stale_profile")).toBeUndefined()
		})

		it("falls back to the profile token when the cache is empty and not cleared", async () => {
			await initRooPlusAuth(mockContext)

			expect(resolveZooGatewaySessionToken("zoo_ext_profile")).toBe("zoo_ext_profile")
		})
	})

	describe("disconnectRooPlus", () => {
		it("revokes the current token and clears cached auth state", async () => {
			await initRooPlusAuth(mockContext)
			await setRooPlusToken("zoo_ext_real_token")
			await setRooPlusUserInfo({
				name: "Jane Doe",
				email: "jane@example.com",
				image: "https://example.com/avatar.png",
			})
			mockFetch.mockResolvedValueOnce({ ok: true })

			await disconnectRooPlus()

			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining("/api/extension/auth/revoke"),
				expect.objectContaining({
					method: "POST",
					headers: { Authorization: "Bearer zoo_ext_real_token" },
				}),
			)
			expect(getCachedRooPlusToken()).toBe("")
			expect(getCachedRooPlusUserInfo()).toEqual({
				name: undefined,
				email: undefined,
				image: undefined,
			})
		})
	})
})
