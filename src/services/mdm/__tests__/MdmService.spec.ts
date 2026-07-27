import * as path from "path"

// Mock dependencies
vi.mock("fs", () => ({
	existsSync: vi.fn(),
	readFileSync: vi.fn(),
}))

vi.mock("os", () => ({
	platform: vi.fn(),
}))

vi.mock("vscode", () => ({
	workspace: {
		getConfiguration: vi.fn(),
	},
	ConfigurationTarget: {
		Global: 1,
	},
}))

vi.mock("../../../shared/package", () => ({
	Package: {
		publisher: "xavier-arosemena",
		name: "roo-plus",
		version: "1.0.0",
		outputChannel: "Roo-Plus",
		sha: undefined,
	},
}))

vi.mock("../../../i18n", () => ({
	t: vi.fn((key: string) => {
		const translations: Record<string, string> = {
			"mdm.errors.cloud_auth_required":
				"Your organization requires Roo Code Cloud authentication. Please sign in to continue.",
		}
		return translations[key] || key
	}),
}))

import * as fs from "fs"
import * as os from "os"
import * as vscode from "vscode"
import { MdmService } from "../MdmService"

const mockFs = fs as any
const mockOs = os as any
const mockVscode = vscode as any

describe("MdmService", () => {
	let originalPlatform: string

	beforeEach(() => {
		// Reset singleton
		MdmService.resetInstance()

		// Store original platform
		originalPlatform = process.platform

		// Set default platform for tests
		mockOs.platform.mockReturnValue("darwin")

		// Setup VSCode mocks
		const mockConfig = {
			get: vi.fn().mockReturnValue(false),
			update: vi.fn().mockResolvedValue(undefined),
		}
		mockVscode.workspace.getConfiguration.mockReturnValue(mockConfig)

		// Reset mocks
		vi.clearAllMocks()
	})

	afterEach(() => {
		// Restore original platform
		Object.defineProperty(process, "platform", {
			value: originalPlatform,
		})
	})

	describe("initialization", () => {
		it("should create instance successfully", async () => {
			mockFs.existsSync.mockReturnValue(false)

			const service = await MdmService.createInstance()
			expect(service).toBeInstanceOf(MdmService)
		})

		it("should load MDM config if file exists", async () => {
			const mockConfig = {
				requireCloudAuth: true,
				organizationId: "test-org-123",
			}

			mockFs.existsSync.mockReturnValue(true)
			mockFs.readFileSync.mockReturnValue(JSON.stringify(mockConfig))

			const service = await MdmService.createInstance()

			expect(service.requiresCloudAuth()).toBe(true)
			expect(service.getRequiredOrganizationId()).toBe("test-org-123")
		})

		it("should handle missing MDM config file gracefully", async () => {
			mockFs.existsSync.mockReturnValue(false)

			const service = await MdmService.createInstance()

			expect(service.requiresCloudAuth()).toBe(false)
			expect(service.getRequiredOrganizationId()).toBeUndefined()
		})

		it("should handle invalid JSON gracefully", async () => {
			mockFs.existsSync.mockReturnValue(true)
			mockFs.readFileSync.mockReturnValue("invalid json")

			const service = await MdmService.createInstance()

			expect(service.requiresCloudAuth()).toBe(false)
		})
	})

	describe("platform-specific config paths", () => {
		it("should use correct path for Windows", async () => {
			mockOs.platform.mockReturnValue("win32")
			process.env.PROGRAMDATA = "C:\\ProgramData"

			mockFs.existsSync.mockReturnValue(false)

			await MdmService.createInstance()

			expect(mockFs.existsSync).toHaveBeenCalledWith(path.join("C:\\ProgramData", "RooCode", "mdm.json"))
		})

		it("should use correct path for macOS", async () => {
			mockOs.platform.mockReturnValue("darwin")

			mockFs.existsSync.mockReturnValue(false)

			await MdmService.createInstance()

			expect(mockFs.existsSync).toHaveBeenCalledWith("/Library/Application Support/RooCode/mdm.json")
		})

		it("should use correct path for Linux", async () => {
			mockOs.platform.mockReturnValue("linux")

			mockFs.existsSync.mockReturnValue(false)

			await MdmService.createInstance()

			expect(mockFs.existsSync).toHaveBeenCalledWith("/etc/roo-code/mdm.json")
		})
	})

	describe("compliance checking", () => {
		it("should be compliant when no MDM policy exists", async () => {
			mockFs.existsSync.mockReturnValue(false)

			const service = await MdmService.createInstance()
			const compliance = service.isCompliant()

			expect(compliance.compliant).toBe(true)
		})

		it("should be non-compliant when requireCloudAuth is true", async () => {
			const mockConfig = { requireCloudAuth: true }
			mockFs.existsSync.mockReturnValue(true)
			mockFs.readFileSync.mockReturnValue(JSON.stringify(mockConfig))

			const service = await MdmService.createInstance()
			const compliance = service.isCompliant()

			expect(compliance.compliant).toBe(false)
			if (!compliance.compliant) {
				expect(compliance.reason).toContain("Your organization requires Roo Code Cloud authentication")
			}
		})
	})

	describe("singleton pattern", () => {
		it("should throw error when accessing instance before creation", () => {
			expect(() => MdmService.getInstance()).toThrow("MdmService not initialized")
		})

		it("should throw error when creating instance twice", async () => {
			mockFs.existsSync.mockReturnValue(false)

			await MdmService.createInstance()

			await expect(MdmService.createInstance()).rejects.toThrow("instance already exists")
		})

		it("should return same instance", async () => {
			mockFs.existsSync.mockReturnValue(false)

			const service1 = await MdmService.createInstance()
			const service2 = MdmService.getInstance()

			expect(service1).toBe(service2)
		})
	})
})
