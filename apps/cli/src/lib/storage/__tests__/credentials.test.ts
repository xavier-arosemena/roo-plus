import fs from "fs/promises"
import path from "path"

// Use vi.hoisted to make the test directory available to the mock
// This must return the path synchronously since CREDENTIALS_FILE is computed at import time
const { getTestConfigDir } = vi.hoisted(() => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const os = require("os")
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const path = require("path")
	const testRunId = Date.now().toString()
	const testConfigDir = path.join(os.tmpdir(), `roo-cli-test-${testRunId}`)
	return { getTestConfigDir: () => testConfigDir }
})

vi.mock("../config-dir.js", () => ({
	getConfigDir: getTestConfigDir,
}))

// Import after mocking
import { loadToken, loadCredentials, clearToken, hasToken, getCredentialsPath } from "../credentials.js"

// Re-derive the test config dir for use in tests (must match the hoisted one)
const actualTestConfigDir = getTestConfigDir()

describe("Token Storage", () => {
	const expectedCredentialsFile = path.join(actualTestConfigDir, "cli-credentials.json")

	beforeEach(async () => {
		// Clear test directory before each test
		await fs.rm(actualTestConfigDir, { recursive: true, force: true })
	})

	afterAll(async () => {
		// Clean up test directory
		await fs.rm(actualTestConfigDir, { recursive: true, force: true })
	})

	// Write a legacy credentials fixture directly on disk, since saveToken was removed.
	async function writeCredentialsFile(data: Record<string, unknown>): Promise<void> {
		await fs.mkdir(actualTestConfigDir, { recursive: true })
		await fs.writeFile(expectedCredentialsFile, JSON.stringify(data))
	}

	describe("getCredentialsPath", () => {
		it("should return the correct credentials file path", () => {
			expect(getCredentialsPath()).toBe(expectedCredentialsFile)
		})
	})

	describe("loadToken", () => {
		it("should load saved token", async () => {
			const token = "test-token-abc"
			await writeCredentialsFile({ token, createdAt: "2026-01-01T00:00:00.000Z" })

			const loaded = await loadToken()
			expect(loaded).toBe(token)
		})

		it("should return null if no token exists", async () => {
			const loaded = await loadToken()
			expect(loaded).toBeNull()
		})
	})

	describe("loadCredentials", () => {
		it("should load full credentials", async () => {
			const token = "test-token-def"
			await writeCredentialsFile({ token, createdAt: "2026-01-01T00:00:00.000Z", userId: "user_789" })

			const credentials = await loadCredentials()

			expect(credentials).not.toBeNull()
			expect(credentials?.token).toBe(token)
			expect(credentials?.userId).toBe("user_789")
			expect(credentials?.createdAt).toBeDefined()
		})

		it("should return null if no credentials exist", async () => {
			const credentials = await loadCredentials()
			expect(credentials).toBeNull()
		})
	})

	describe("clearToken", () => {
		it("should remove saved token", async () => {
			const token = "test-token-ghi"
			await writeCredentialsFile({ token, createdAt: "2026-01-01T00:00:00.000Z" })

			await clearToken()

			const loaded = await loadToken()
			expect(loaded).toBeNull()
		})

		it("should not throw if no token exists", async () => {
			await expect(clearToken()).resolves.not.toThrow()
		})
	})

	describe("hasToken", () => {
		it("should return true if token exists", async () => {
			await writeCredentialsFile({ token: "test-token-jkl", createdAt: "2026-01-01T00:00:00.000Z" })

			const exists = await hasToken()
			expect(exists).toBe(true)
		})

		it("should return false if no token exists", async () => {
			const exists = await hasToken()
			expect(exists).toBe(false)
		})
	})
})
