import { describe, it, expect, vi, beforeEach } from "vitest"
import * as path from "path"
import { SembleProvider } from "../provider"
import { SembleCLI } from "../semble-cli"
import { SEMBLE_DEFAULTS } from "../types"

// Mock SembleCLI - use a shared mock instance
const sharedMockCli = {
	checkInstalled: vi.fn(),
	search: vi.fn(),
	abort: vi.fn(),
}

vi.mock("../semble-cli", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../semble-cli")>()
	return {
		...actual,
		// Only the class is faked — the pure version-gating helpers
		// (supportsMaxSnippetLinesFlag) stay real so searchIndex's gating logic
		// is exercised against the actual implementation.
		SembleCLI: vi.fn().mockImplementation(function () {
			return sharedMockCli
		}),
	}
})

// Mock semble-downloader
vi.mock("../semble-downloader", () => ({
	isSembleSupportedPlatform: vi.fn().mockReturnValue(true),
	downloadSemble: vi.fn().mockResolvedValue("/mock/storage/semble/semble"),
	getInstalledSembleVersion: vi.fn().mockResolvedValue("v0.5.2"),
	SEMBLE_VERSION: "v0.5.2",
}))

// Mock TelemetryService
vi.mock("@roo-code/telemetry", () => ({
	TelemetryService: {
		instance: {
			captureEvent: vi.fn(),
		},
	},
}))

// Mock vscode
vi.mock("vscode", () => ({
	ExtensionContext: vi.fn(),
}))

// Mock i18n — semble provider state messages are internationalized via t().
// Return the English strings so existing message-content assertions stay stable.
vi.mock("../../../../i18n", () => ({
	t: (key: string, params?: any) => {
		switch (key) {
			case "embeddings:semble.downloadingBinary":
				return "Downloading semble binary..."
			case "embeddings:semble.ready":
				return `Semble ${params?.version ?? ""} is ready. Searches index on-the-fly.`
			case "embeddings:semble.unsupportedPlatform":
				return `Semble is not supported on this platform (${params?.platform ?? ""}-${params?.arch ?? ""}).`
			case "embeddings:semble.downloadFailed":
				return `Failed to download semble: ${params?.errorMessage ?? ""}`
			case "embeddings:semble.checkFailed":
				return `Semble check failed: ${params?.errorMessage ?? ""}`
			case "embeddings:semble.searchFailed":
				return `Semble search failed: ${params?.errorMessage ?? ""}`
			case "embeddings:semble.providerReset":
				return "Semble provider reset. On-disk cache remains until next rebuild."
			default:
				return key
		}
	},
}))

import { TelemetryService } from "@roo-code/telemetry"
import { TelemetryEventName } from "@roo-code/types"
import { getInstalledSembleVersion, isSembleSupportedPlatform, downloadSemble } from "../semble-downloader"

describe("SembleProvider", () => {
	let provider: SembleProvider
	let mockCli: any
	let mockStateManager: any
	let mockContext: any

	beforeEach(() => {
		vi.clearAllMocks()
		;(isSembleSupportedPlatform as any).mockReturnValue(true)
		;(downloadSemble as any).mockResolvedValue("/mock/storage/semble/semble")
		vi.mocked(getInstalledSembleVersion).mockResolvedValue("v0.5.2")

		// Closure-backed shared state: provider.state is now a passthrough to the
		// state manager, so the mock must track state itself for the assertions to
		// observe transitions. setSystemStateSilent mirrors the real manager's
		// "update without firing a progress event" method used by reset().
		let currentState = "Standby"
		mockStateManager = {
			get state() {
				return currentState
			},
			setSystemState: vi.fn((newState: string, _message?: string) => {
				currentState = newState
			}),
			setSystemStateSilent: vi.fn((newState: string) => {
				currentState = newState
			}),
		}

		mockContext = {
			globalStorageUri: { fsPath: "/mock/storage" },
		}

		provider = new SembleProvider("/workspace", mockContext, mockStateManager)
		mockCli = sharedMockCli
	})

	describe("constructor", () => {
		it("should create provider with default options", () => {
			const p = new SembleProvider("/workspace", mockContext, mockStateManager)
			expect(p).toBeDefined()
			expect(p.state).toBe("Standby")
		})

		it("should create provider with custom topK and content", () => {
			const p = new SembleProvider("/workspace", mockContext, mockStateManager, {
				topK: 5,
				content: "all",
			})
			expect(p).toBeDefined()
		})

		it("should create provider with binaryPath option", () => {
			const p = new SembleProvider("/workspace", mockContext, mockStateManager, {
				binaryPath: "/custom/path/semble",
			})
			expect(p).toBeDefined()
			expect(p.state).toBe("Standby")
		})

		it("should create provider with search config options", () => {
			const p = new SembleProvider("/workspace", mockContext, mockStateManager, {
				searchMinScore: 0.5,
				searchMaxResults: 25,
			})
			expect(p).toBeDefined()
			expect(p.state).toBe("Standby")
		})
	})

	describe("initialize", () => {
		it("should auto-download and set state to Indexed when semble works", async () => {
			mockCli.checkInstalled.mockResolvedValue({ installed: true })

			await provider.initialize()

			expect(downloadSemble).toHaveBeenCalledWith("/mock/storage", undefined)
			expect(provider.state).toBe("Indexed")
			expect(mockStateManager.setSystemState).toHaveBeenCalledWith(
				"Indexed",
				"Semble v0.5.2 is ready. Searches index on-the-fly.",
			)
		})

		it("should pass binaryPath to downloadSemble when configured", async () => {
			mockCli.checkInstalled.mockResolvedValue({ installed: true })

			const customProvider = new SembleProvider("/workspace", mockContext, mockStateManager, {
				binaryPath: "/custom/path/semble",
			})

			await customProvider.initialize()

			expect(downloadSemble).toHaveBeenCalledWith("/mock/storage", "/custom/path/semble")
			expect(customProvider.state).toBe("Indexed")
		})

		it("should pass undefined binaryPath to downloadSemble when not configured", async () => {
			mockCli.checkInstalled.mockResolvedValue({ installed: true })

			await provider.initialize()

			// The second argument should be undefined when no binaryPath is provided
			expect(downloadSemble).toHaveBeenCalledWith("/mock/storage", undefined)
			expect(provider.state).toBe("Indexed")
		})

		it("should set state to Error when platform is unsupported", async () => {
			;(isSembleSupportedPlatform as any).mockReturnValue(false)

			await provider.initialize()

			expect(provider.state).toBe("Error")
			expect(mockStateManager.setSystemState).toHaveBeenCalledWith(
				"Error",
				expect.stringContaining("not supported on this platform"),
			)
		})

		it("should set state to Error when download fails", async () => {
			;(downloadSemble as any).mockRejectedValue(new Error("network error"))

			await provider.initialize()

			expect(provider.state).toBe("Error")
			expect(mockStateManager.setSystemState).toHaveBeenCalledWith(
				"Error",
				expect.stringContaining("Failed to download semble"),
			)
		})

		it("should set state to Error when semble check fails after download", async () => {
			mockCli.checkInstalled.mockResolvedValue({
				installed: false,
				error: "binary not functional",
			})

			await provider.initialize()

			expect(provider.state).toBe("Error")
			expect(mockStateManager.setSystemState).toHaveBeenCalledWith(
				"Error",
				expect.stringContaining("binary not functional"),
			)
		})

		it("should not re-initialize if already initialized", async () => {
			mockCli.checkInstalled.mockResolvedValue({ installed: true })

			await provider.initialize()
			await provider.initialize()

			expect(mockCli.checkInstalled).toHaveBeenCalledTimes(1)
		})

		it("should include the semble version in the ready status message", async () => {
			mockCli.checkInstalled.mockResolvedValue({ installed: true })

			await provider.initialize()

			// The ready message interpolates the active SEMBLE_VERSION so the UI
			// (CodeIndexPopover) surfaces which release is installed.
			expect(mockStateManager.setSystemState).toHaveBeenCalledWith("Indexed", expect.stringContaining("v0.5.2"))
		})

		it("should surface the actually-installed version when it differs from SEMBLE_VERSION", async () => {
			mockCli.checkInstalled.mockResolvedValue({ installed: true })
			// Simulate a "latest" install that resolved to a newer tag than the
			// hardcoded SEMBLE_VERSION — the ready message must reflect the real one.
			vi.mocked(getInstalledSembleVersion).mockResolvedValue("v0.6.0")

			await provider.initialize()

			expect(getInstalledSembleVersion).toHaveBeenCalledWith("/mock/storage")
			expect(mockStateManager.setSystemState).toHaveBeenCalledWith("Indexed", expect.stringContaining("v0.6.0"))
			expect(mockStateManager.setSystemState).not.toHaveBeenCalledWith(
				"Indexed",
				expect.stringContaining("v0.5.2"),
			)
		})
	})

	describe("startIndexing", () => {
		it("should initialize if not already initialized", async () => {
			mockCli.checkInstalled.mockResolvedValue({ installed: true })

			await provider.startIndexing()

			expect(provider.state).toBe("Indexed")
		})

		it("should not change state if in Error state", async () => {
			;(isSembleSupportedPlatform as any).mockReturnValue(false)

			await provider.initialize()
			await provider.startIndexing()

			expect(provider.state).toBe("Error")
		})

		it("should mark as Indexed when already initialized", async () => {
			mockCli.checkInstalled.mockResolvedValue({ installed: true })

			await provider.initialize()
			await provider.startIndexing()

			expect(provider.state).toBe("Indexed")
		})
	})

	describe("failure caching (R6)", () => {
		it("should cache an init failure and not re-run the download on repeat startIndexing", async () => {
			vi.mocked(downloadSemble).mockRejectedValue(new Error("network error"))

			await provider.initialize()
			expect(provider.state).toBe("Error")
			expect(downloadSemble).toHaveBeenCalledTimes(1)

			// Repeated startIndexing must NOT re-run the full download pipeline
			await provider.startIndexing()
			await provider.startIndexing()
			expect(downloadSemble).toHaveBeenCalledTimes(1)
		})

		it("should cache an init failure and not re-download on repeat initialize", async () => {
			vi.mocked(downloadSemble).mockRejectedValue(new Error("network error"))

			await provider.initialize()
			expect(downloadSemble).toHaveBeenCalledTimes(1)

			await provider.initialize()
			expect(downloadSemble).toHaveBeenCalledTimes(1)
		})

		it("should allow an explicit retry via reset() after a failure", async () => {
			vi.mocked(downloadSemble).mockRejectedValue(new Error("network error"))

			await provider.initialize()
			expect(provider.state).toBe("Error")

			// User fixes the network and retries explicitly
			provider.reset()
			vi.mocked(downloadSemble).mockResolvedValue("/mock/storage/semble/semble")
			mockCli.checkInstalled.mockResolvedValue({ installed: true })

			await provider.initialize()
			expect(provider.state).toBe("Indexed")
			expect(downloadSemble).toHaveBeenCalledTimes(2)
		})
	})

	describe("stopIndexing", () => {
		it("should be a no-op", () => {
			provider.stopIndexing()
			// No error thrown, no state change
			expect(provider.state).toBe("Standby")
		})
	})

	describe("searchIndex", () => {
		beforeEach(async () => {
			mockCli.checkInstalled.mockResolvedValue({ installed: true })
			await provider.initialize()
		})

		it("should return empty array when not initialized", async () => {
			const uninitializedProvider = new SembleProvider("/workspace", mockContext, mockStateManager)
			const results = await uninitializedProvider.searchIndex("test query")
			expect(results).toEqual([])
		})

		it("should search using CLI and convert results", async () => {
			const mockResults = [
				{
					content: "function authenticate() {}",
					file_path: "src/auth.ts",
					start_line: 10,
					end_line: 25,
					score: 0.92,
				},
				{
					content: "export function login() {}",
					file_path: "src/login.ts",
					start_line: 5,
					end_line: 15,
					score: 0.78,
				},
			]

			mockCli.search.mockResolvedValue(mockResults)

			const results = await provider.searchIndex("authentication")

			expect(mockCli.search).toHaveBeenCalledWith("authentication", "/workspace", {
				topK: SEMBLE_DEFAULTS.DEFAULT_TOP_K,
				content: SEMBLE_DEFAULTS.DEFAULT_CONTENT,
				maxSnippetLines: SEMBLE_DEFAULTS.DEFAULT_MAX_SNIPPET_LINES,
			})

			expect(results).toHaveLength(2)
			expect(results[0]).toEqual({
				id: "semble-0",
				score: 0.92,
				payload: {
					filePath: "/workspace/src/auth.ts",
					codeChunk: "function authenticate() {}",
					startLine: 10,
					endLine: 25,
				},
			})
			expect(results[1]).toEqual({
				id: "semble-1",
				score: 0.78,
				payload: {
					filePath: "/workspace/src/login.ts",
					codeChunk: "export function login() {}",
					startLine: 5,
					endLine: 15,
				},
			})
		})

		it("should filter out results with missing file_path", async () => {
			const mockResults = [
				{
					content: "good result",
					file_path: "src/good.ts",
					start_line: 1,
					end_line: 10,
					score: 0.8,
				},
				{
					content: "no file path result",
					file_path: "",
					start_line: 1,
					end_line: 5,
					score: 0.5,
				},
				{
					content: "null file path result",
					file_path: null,
					start_line: 1,
					end_line: 5,
					score: 0.3,
				},
			]

			mockCli.search.mockResolvedValue(mockResults)

			const results = await provider.searchIndex("test")

			expect(results).toHaveLength(1)
			expect(results[0].payload?.filePath).toBe("/workspace/src/good.ts")
		})

		it("should always search workspace root regardless of directoryPrefix", async () => {
			mockCli.search.mockResolvedValue([])

			await provider.searchIndex("test", "/custom/path")

			// Should always pass workspace root to semble, not the directoryPrefix
			expect(mockCli.search).toHaveBeenCalledWith("test", "/workspace", {
				topK: SEMBLE_DEFAULTS.DEFAULT_TOP_K,
				content: SEMBLE_DEFAULTS.DEFAULT_CONTENT,
				maxSnippetLines: SEMBLE_DEFAULTS.DEFAULT_MAX_SNIPPET_LINES,
			})
		})

		it("should always search workspace root with relative directoryPrefix", async () => {
			mockCli.search.mockResolvedValue([])

			await provider.searchIndex("test", "src/subdir")

			// Should always pass workspace root to semble
			expect(mockCli.search).toHaveBeenCalledWith("test", "/workspace", {
				topK: SEMBLE_DEFAULTS.DEFAULT_TOP_K,
				content: SEMBLE_DEFAULTS.DEFAULT_CONTENT,
				maxSnippetLines: SEMBLE_DEFAULTS.DEFAULT_MAX_SNIPPET_LINES,
			})
		})

		it("should filter results by directoryPrefix when provided", async () => {
			const mockResults = [
				{
					content: "code in src/auth",
					file_path: "src/auth/login.ts",
					start_line: 1,
					end_line: 10,
					score: 0.95,
				},
				{
					content: "code in src/utils",
					file_path: "src/utils/helper.ts",
					start_line: 5,
					end_line: 15,
					score: 0.8,
				},
				{
					content: "code in root",
					file_path: "README.md",
					start_line: 1,
					end_line: 5,
					score: 0.6,
				},
			]

			mockCli.search.mockResolvedValue(mockResults)

			const results = await provider.searchIndex("test", "src/auth")

			// Only the src/auth result should pass the filter
			expect(results).toHaveLength(1)
			expect(results[0].payload?.filePath).toBe("/workspace/src/auth/login.ts")
		})

		it("should not filter results when no directoryPrefix is provided", async () => {
			const mockResults = [
				{
					content: "code in src/auth",
					file_path: "src/auth/login.ts",
					start_line: 1,
					end_line: 10,
					score: 0.95,
				},
				{
					content: "code in src/utils",
					file_path: "src/utils/helper.ts",
					start_line: 5,
					end_line: 15,
					score: 0.8,
				},
			]

			mockCli.search.mockResolvedValue(mockResults)

			const results = await provider.searchIndex("test")

			// All results should be returned
			expect(results).toHaveLength(2)
		})

		it("should surface a genuine search failure: rethrow, log telemetry, and set Error state", async () => {
			// Use a fresh provider so the Error state doesn't leak into the shared
			// instance used by the surrounding tests.
			const freshProvider = new SembleProvider("/workspace", mockContext, mockStateManager)
			await freshProvider.initialize()

			mockCli.search.mockRejectedValue(new Error("Search failed"))

			await expect(freshProvider.searchIndex("test")).rejects.toThrow("Search failed")

			// The provider must flip to Error so the UI (CodeIndexPopover) reflects
			// the failure instead of staying "Indexed".
			expect(freshProvider.state).toBe("Error")
			expect(mockStateManager.setSystemState).toHaveBeenCalledWith("Error", "Semble search failed: Search failed")
			expect(TelemetryService.instance.captureEvent).toHaveBeenCalledWith(
				TelemetryEventName.CODE_INDEX_ERROR,
				expect.objectContaining({
					location: "SembleProvider.searchIndex",
				}),
			)
		})

		it("should set Error state and surface the original value for non-Error rejections", async () => {
			// A non-Error rejection exercises the `error instanceof Error` false
			// branch of the telemetry payload (stack: undefined).
			const freshProvider = new SembleProvider("/workspace", mockContext, mockStateManager)
			await freshProvider.initialize()

			mockCli.search.mockRejectedValue("string error")

			await expect(freshProvider.searchIndex("test")).rejects.toBe("string error")

			expect(freshProvider.state).toBe("Error")
			expect(mockStateManager.setSystemState).toHaveBeenCalledWith("Error", "Semble search failed: string error")
			expect(TelemetryService.instance.captureEvent).toHaveBeenCalledWith(
				TelemetryEventName.CODE_INDEX_ERROR,
				expect.objectContaining({
					error: "string error",
					stack: undefined,
					location: "SembleProvider.searchIndex",
				}),
			)
		})

		it("should return empty array when in Error state", async () => {
			;(isSembleSupportedPlatform as any).mockReturnValue(false)
			const errorProvider = new SembleProvider("/workspace", mockContext, mockStateManager)
			await errorProvider.initialize()
			;(isSembleSupportedPlatform as any).mockReturnValue(true) // reset for other tests
			const results = await errorProvider.searchIndex("test")
			expect(results).toEqual([])
		})

		it("should return empty array for genuine 'no results' and keep Indexed state", async () => {
			// A genuine "no results" (e.g. semble JSON {"error": "No results found."})
			// surfaces as [] from the CLI — the empty-array contract must be preserved.
			mockCli.search.mockResolvedValue([])

			const results = await provider.searchIndex("test")

			expect(results).toEqual([])
			// Not an error: state remains Indexed and no error telemetry is captured.
			expect(provider.state).toBe("Indexed")
			expect(TelemetryService.instance.captureEvent).not.toHaveBeenCalled()
		})
	})

	describe("clearIndexData", () => {
		it("should reset state to Standby", async () => {
			mockCli.checkInstalled.mockResolvedValue({ installed: true })
			await provider.initialize()

			await provider.clearIndexData()

			expect(provider.state).toBe("Standby")
			expect(mockStateManager.setSystemState).toHaveBeenCalledWith(
				"Standby",
				"Semble provider reset. On-disk cache remains until next rebuild.",
			)
		})
	})

	describe("dispose", () => {
		it("should reset initialization state", async () => {
			mockCli.checkInstalled.mockResolvedValue({ installed: true })
			await provider.initialize()

			provider.dispose()

			// After dispose, searchIndex should return empty array
			const results = await provider.searchIndex("test")
			expect(results).toEqual([])
		})

		it("should abort the CLI to terminate any in-flight child process", async () => {
			mockCli.checkInstalled.mockResolvedValue({ installed: true })
			await provider.initialize()

			provider.dispose()

			expect(mockCli.abort).toHaveBeenCalled()
		})

		it("should be safe when disposed before initialization (no CLI yet)", () => {
			expect(() => provider.dispose()).not.toThrow()
			expect(mockCli.abort).not.toHaveBeenCalled()
		})
	})

	describe("_convertResults edge cases", () => {
		beforeEach(async () => {
			mockCli.checkInstalled.mockResolvedValue({ installed: true })
			await provider.initialize()
		})

		it("should handle results with null content using empty string fallback", async () => {
			const mockResults = [
				{
					content: null,
					file_path: "src/file.ts",
					// Non-null line numbers exercise the flat-field access path
					// (r.start_line / r.end_line). With null/undefined values the old
					// nested `r.chunk?.start_line ?? 0` shape would coalesce to 0
					// identically, so a regression to the wrapped schema would slip
					// past unnoticed. Real values must round-trip through unchanged.
					start_line: 5,
					end_line: 20,
					score: 0.6,
				},
			]

			mockCli.search.mockResolvedValue(mockResults)

			const results = await provider.searchIndex("test")

			expect(results).toHaveLength(1)
			expect(results[0].payload?.codeChunk).toBe("")
			expect(results[0].payload?.startLine).toBe(5)
			expect(results[0].payload?.endLine).toBe(20)
		})

		it("should handle results with undefined content fields", async () => {
			const mockResults = [
				{
					content: undefined,
					file_path: "src/file.ts",
					start_line: undefined,
					end_line: undefined,
					score: 0.5,
				},
			]

			mockCli.search.mockResolvedValue(mockResults)

			const results = await provider.searchIndex("test")

			expect(results).toHaveLength(1)
			expect(results[0].payload?.codeChunk).toBe("")
			expect(results[0].payload?.startLine).toBe(0)
			expect(results[0].payload?.endLine).toBe(0)
		})

		it("should normalize backslashes in file paths", async () => {
			const mockResults = [
				{
					content: "code",
					file_path: "src\\nested\\file.ts",
					start_line: 1,
					end_line: 10,
					score: 0.8,
				},
			]

			mockCli.search.mockResolvedValue(mockResults)

			const results = await provider.searchIndex("test")

			expect(results).toHaveLength(1)
			expect(results[0].payload?.filePath).not.toContain("\\")
			expect(results[0].payload?.filePath).toContain("/")
		})

		it("should reject file paths that escape the workspace via traversal", async () => {
			// A path-traversal payload (../../etc/passwd) resolves outside the
			// workspace base. The guard at provider.ts must exclude it so semble
			// results can never surface files outside the indexed workspace.
			const mockResults = [
				{
					content: "secret",
					file_path: "../../etc/passwd",
					start_line: 1,
					end_line: 10,
					score: 0.9,
				},
				{
					content: "safe",
					file_path: "src/file.ts",
					start_line: 1,
					end_line: 10,
					score: 0.8,
				},
			]

			mockCli.search.mockResolvedValue(mockResults)

			const results = await provider.searchIndex("test")

			// Only the in-workspace result survives; the traversal entry is dropped.
			expect(results).toHaveLength(1)
			expect(results[0].payload?.filePath).toBe("/workspace/src/file.ts")
		})

		it("should always join file paths against workspace root, even with directoryPrefix", async () => {
			const mockResults = [
				{
					content: "code",
					file_path: "src/file.ts",
					start_line: 1,
					end_line: 5,
					score: 0.9,
				},
			]

			mockCli.search.mockResolvedValue(mockResults)

			// Even with a directoryPrefix, file paths are joined against workspace root
			const results = await provider.searchIndex("test", "src")

			expect(results[0].payload?.filePath).toBe("/workspace/src/file.ts")
		})

		it("should assign sequential semble-N IDs to results", async () => {
			const mockResults = [
				{
					content: "a",
					file_path: "a.ts",
					start_line: 1,
					end_line: 2,
					score: 0.9,
				},
				{
					content: "b",
					file_path: "b.ts",
					start_line: 1,
					end_line: 2,
					score: 0.8,
				},
				{
					content: "c",
					file_path: "c.ts",
					start_line: 1,
					end_line: 2,
					score: 0.7,
				},
			]

			mockCli.search.mockResolvedValue(mockResults)

			const results = await provider.searchIndex("test")

			expect(results[0].id).toBe("semble-0")
			expect(results[1].id).toBe("semble-1")
			expect(results[2].id).toBe("semble-2")
		})

		it("should truncate oversized code chunks to the hard character cap", async () => {
			const oversized = "x".repeat(SEMBLE_DEFAULTS.MAX_SNIPPET_CHARS + 100)
			const mockResults = [
				{
					content: oversized,
					file_path: "src/file.ts",
					start_line: 1,
					end_line: 2,
					score: 0.9,
				},
				{
					content: "short snippet",
					file_path: "src/short.ts",
					start_line: 1,
					end_line: 2,
					score: 0.8,
				},
			]

			mockCli.search.mockResolvedValue(mockResults)

			const results = await provider.searchIndex("test")

			// Defense-in-depth: even if the CLI ignored --max-snippet-lines, an
			// oversized chunk is capped to MAX_SNIPPET_CHARS while short snippets
			// pass through unchanged — a single search never yields unbounded content.
			expect(results[0].payload?.codeChunk).toHaveLength(SEMBLE_DEFAULTS.MAX_SNIPPET_CHARS)
			expect(results[0].payload?.codeChunk).toBe(oversized.slice(0, SEMBLE_DEFAULTS.MAX_SNIPPET_CHARS))
			expect(results[1].payload?.codeChunk).toBe("short snippet")
		})

		it("should pass maxSnippetLines default when installed version supports --max-snippet-lines (v0.4.1+)", async () => {
			vi.mocked(getInstalledSembleVersion).mockResolvedValue("v0.4.1")
			const gateProvider = new SembleProvider("/workspace", mockContext, mockStateManager)
			mockCli.checkInstalled.mockResolvedValue({ installed: true })
			await gateProvider.initialize()
			mockCli.search.mockResolvedValue([])

			await gateProvider.searchIndex("test")

			// v0.4.1 is the documented minimum for the flag — the default 150-line
			// snippet bound still applies.
			expect(mockCli.search).toHaveBeenCalledWith("test", "/workspace", {
				topK: SEMBLE_DEFAULTS.DEFAULT_TOP_K,
				content: SEMBLE_DEFAULTS.DEFAULT_CONTENT,
				maxSnippetLines: SEMBLE_DEFAULTS.DEFAULT_MAX_SNIPPET_LINES,
			})
		})

		it("should omit maxSnippetLines when installed version predates --max-snippet-lines (v0.4.1)", async () => {
			vi.mocked(getInstalledSembleVersion).mockResolvedValue("v0.3.1")
			const gateProvider = new SembleProvider("/workspace", mockContext, mockStateManager)
			mockCli.checkInstalled.mockResolvedValue({ installed: true })
			await gateProvider.initialize()
			mockCli.search.mockResolvedValue([])

			await gateProvider.searchIndex("test")

			// Older binaries reject unknown flags — the provider must not forward
			// a snippet bound, or every search would fail loudly.
			expect(mockCli.search).toHaveBeenCalledWith("test", "/workspace", {
				topK: SEMBLE_DEFAULTS.DEFAULT_TOP_K,
				content: SEMBLE_DEFAULTS.DEFAULT_CONTENT,
				maxSnippetLines: undefined,
			})
		})

		it("should fall back to SEMBLE_VERSION and pass maxSnippetLines when version metadata is absent", async () => {
			vi.mocked(getInstalledSembleVersion).mockResolvedValue(undefined)
			const gateProvider = new SembleProvider("/workspace", mockContext, mockStateManager)
			mockCli.checkInstalled.mockResolvedValue({ installed: true })
			await gateProvider.initialize()
			mockCli.search.mockResolvedValue([])

			await gateProvider.searchIndex("test")

			// _installedVersion falls back to SEMBLE_VERSION (v0.5.2), which
			// advertises --max-snippet-lines, so the default bound still applies.
			expect(mockCli.search).toHaveBeenCalledWith("test", "/workspace", {
				topK: SEMBLE_DEFAULTS.DEFAULT_TOP_K,
				content: SEMBLE_DEFAULTS.DEFAULT_CONTENT,
				maxSnippetLines: SEMBLE_DEFAULTS.DEFAULT_MAX_SNIPPET_LINES,
			})
		})
	})

	describe("initialize error edge cases", () => {
		it("should set Error state when download returns no path (undefined)", async () => {
			;(downloadSemble as any).mockResolvedValue(undefined)

			await provider.initialize()

			expect(provider.state).toBe("Error")
			expect(mockStateManager.setSystemState).toHaveBeenCalledWith(
				"Error",
				expect.stringContaining("Failed to download semble"),
			)
		})

		it("should set Error state with default message when checkInstalled returns no error string", async () => {
			mockCli.checkInstalled.mockResolvedValue({
				installed: false,
				error: undefined,
			})

			await provider.initialize()

			expect(provider.state).toBe("Error")
			expect(mockStateManager.setSystemState).toHaveBeenCalledWith(
				"Error",
				expect.stringContaining("Semble binary is not functional"),
			)
		})
	})

	describe("custom config options", () => {
		it("should pass custom topK to CLI search", async () => {
			const customProvider = new SembleProvider("/workspace", mockContext, mockStateManager, {
				topK: 5,
			})

			mockCli.checkInstalled.mockResolvedValue({ installed: true })
			await customProvider.initialize()
			mockCli.search.mockResolvedValue([])

			await customProvider.searchIndex("test")

			expect(mockCli.search).toHaveBeenCalledWith("test", "/workspace", {
				topK: 5,
				content: "code",
				maxSnippetLines: SEMBLE_DEFAULTS.DEFAULT_MAX_SNIPPET_LINES,
			})
		})

		it("should pass custom content type to CLI search", async () => {
			const customProvider = new SembleProvider("/workspace", mockContext, mockStateManager, {
				content: "all",
			})

			mockCli.checkInstalled.mockResolvedValue({ installed: true })
			await customProvider.initialize()
			mockCli.search.mockResolvedValue([])

			await customProvider.searchIndex("test")

			expect(mockCli.search).toHaveBeenCalledWith("test", "/workspace", {
				topK: 10,
				content: "all",
				maxSnippetLines: SEMBLE_DEFAULTS.DEFAULT_MAX_SNIPPET_LINES,
			})
		})

		it("should pass custom maxSnippetLines to CLI search", async () => {
			const customProvider = new SembleProvider("/workspace", mockContext, mockStateManager, {
				maxSnippetLines: 200,
			})

			mockCli.checkInstalled.mockResolvedValue({ installed: true })
			await customProvider.initialize()
			mockCli.search.mockResolvedValue([])

			await customProvider.searchIndex("test")

			// The provider forwards the configured snippet cap to the CLI so
			// --max-snippet-lines bounds each result's content payload.
			expect(mockCli.search).toHaveBeenCalledWith("test", "/workspace", {
				topK: 10,
				content: "code",
				maxSnippetLines: 200,
			})
		})
	})

	describe("search config (reference alignment: min score / max results ignored)", () => {
		it("should keep all results when no min score or max results configured", async () => {
			mockCli.checkInstalled.mockResolvedValue({ installed: true })
			await provider.initialize()

			mockCli.search.mockResolvedValue([
				{ content: "a", file_path: "a.ts", start_line: 1, end_line: 2, score: 0.9 },
				{ content: "b", file_path: "b.ts", start_line: 1, end_line: 2, score: 0.5 },
				{ content: "c", file_path: "c.ts", start_line: 1, end_line: 2, score: 0.2 },
			])

			const results = await provider.searchIndex("test")

			// No score threshold and no cap when config is unset — all converted
			// results (up to the default topK) are returned, as before.
			expect(results).toHaveLength(3)
			expect(mockCli.search).toHaveBeenCalledWith("test", "/workspace", {
				topK: SEMBLE_DEFAULTS.DEFAULT_TOP_K,
				content: SEMBLE_DEFAULTS.DEFAULT_CONTENT,
				maxSnippetLines: SEMBLE_DEFAULTS.DEFAULT_MAX_SNIPPET_LINES,
			})
		})

		it("should return results regardless of their score — even when searchMinScore is configured (Zoo-Code reference)", async () => {
			// The Semble path applies NO score threshold, matching Zoo-Code. A raw
			// response with scores far below the (Qdrant-tuned) 0.4 threshold is
			// returned in full — this is the regression guard for F1, where the
			// previously-added 0.4 score filter produced recurring empty results.
			const customProvider = new SembleProvider("/workspace", mockContext, mockStateManager, {
				searchMinScore: 0.4,
			})

			mockCli.checkInstalled.mockResolvedValue({ installed: true })
			await customProvider.initialize()

			mockCli.search.mockResolvedValue([
				{ content: "a", file_path: "a.ts", start_line: 1, end_line: 2, score: 0.1 },
				{ content: "b", file_path: "b.ts", start_line: 1, end_line: 2, score: 0.2 },
				{ content: "c", file_path: "c.ts", start_line: 1, end_line: 2, score: 0.3 },
			])

			const results = await customProvider.searchIndex("test")

			expect(results).toHaveLength(3)
			expect(results.map((r) => r.score)).toEqual([0.1, 0.2, 0.3])
			// Plain topK is forwarded even though searchMinScore is configured.
			expect(mockCli.search).toHaveBeenCalledWith("test", "/workspace", {
				topK: SEMBLE_DEFAULTS.DEFAULT_TOP_K,
				content: SEMBLE_DEFAULTS.DEFAULT_CONTENT,
				maxSnippetLines: SEMBLE_DEFAULTS.DEFAULT_MAX_SNIPPET_LINES,
			})
		})

		it("should NOT over-fetch or cap when searchMaxResults is configured (Zoo-Code reference)", async () => {
			const customProvider = new SembleProvider("/workspace", mockContext, mockStateManager, {
				searchMaxResults: 2,
			})

			mockCli.checkInstalled.mockResolvedValue({ installed: true })
			await customProvider.initialize()

			mockCli.search.mockResolvedValue([
				{ content: "a", file_path: "a.ts", start_line: 1, end_line: 2, score: 0.9 },
				{ content: "b", file_path: "b.ts", start_line: 1, end_line: 2, score: 0.8 },
				{ content: "c", file_path: "c.ts", start_line: 1, end_line: 2, score: 0.7 },
			])

			const results = await customProvider.searchIndex("test")

			// No cap: all 3 raw results are returned (up to the plain topK).
			expect(results).toHaveLength(3)
			// No over-fetch: plain topK is forwarded, not searchMaxResults.
			expect(mockCli.search).toHaveBeenCalledWith("test", "/workspace", {
				topK: SEMBLE_DEFAULTS.DEFAULT_TOP_K,
				content: SEMBLE_DEFAULTS.DEFAULT_CONTENT,
				maxSnippetLines: SEMBLE_DEFAULTS.DEFAULT_MAX_SNIPPET_LINES,
			})
		})

		it("should log the raw score distribution once per provider instance on the first search", async () => {
			const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
			const customProvider = new SembleProvider("/workspace", mockContext, mockStateManager)

			mockCli.checkInstalled.mockResolvedValue({ installed: true })
			await customProvider.initialize()

			mockCli.search.mockResolvedValue([
				{ content: "a", file_path: "a.ts", start_line: 1, end_line: 2, score: 0.9 },
				{ content: "b", file_path: "b.ts", start_line: 1, end_line: 2, score: 0.5 },
			])

			await customProvider.searchIndex("first query")
			await customProvider.searchIndex("second query")

			const distributionLogs = logSpy.mock.calls.filter(
				(call) => typeof call[0] === "string" && call[0].includes("Raw score distribution"),
			)
			// Logged exactly once (first search only), not per-query.
			expect(distributionLogs).toHaveLength(1)
			expect(distributionLogs[0][0]).toContain("count=2")
			expect(distributionLogs[0][0]).toContain("min=0.5")
			expect(distributionLogs[0][0]).toContain("max=0.9")
			logSpy.mockRestore()
		})
	})
})
