import { CodeIndexManager } from "../manager"
import { CodeIndexServiceFactory } from "../service-factory"
import { CodeIndexConfigManager } from "../config-manager"
import { CacheManager } from "../cache-manager"
import { SembleProvider } from "../semble"
import type { ContextProxy } from "../../../core/config/ContextProxy"
import type { MockedClass } from "vitest"
import type { ExtensionContext, WorkspaceFolder } from "vscode"
import * as path from "path"

// Helper: create a mock vscode.Uri from an fsPath
function mockUri(fsPath: string, scheme = "file") {
	return {
		fsPath,
		scheme,
		authority: "",
		path: fsPath,
		toString: (skipEncoding?: boolean) => `${scheme}://${fsPath}`,
	}
}

// Mock vscode module
vi.mock("vscode", () => {
	const testPath = require("path")
	const testWorkspacePath = testPath.join(testPath.sep, "test", "workspace")
	return {
		Uri: {
			file: (p: string) => ({
				fsPath: p,
				scheme: "file",
				authority: "",
				path: p,
				toString: (_skipEncoding?: boolean) => `file://${p}`,
			}),
			joinPath: vi.fn((...args: any[]) => ({ fsPath: args.join("/") })),
		},
		window: {
			activeTextEditor: null,
		},
		workspace: {
			workspaceFolders: [
				{
					uri: {
						fsPath: testWorkspacePath,
						scheme: "file",
						authority: "",
						path: testWorkspacePath,
						toString: (_skipEncoding?: boolean) => `file://${testWorkspacePath}`,
					},
					name: "test",
					index: 0,
				},
			],
			createFileSystemWatcher: vi.fn().mockReturnValue({
				onDidCreate: vi.fn().mockReturnValue({ dispose: vi.fn() }),
				onDidChange: vi.fn().mockReturnValue({ dispose: vi.fn() }),
				onDidDelete: vi.fn().mockReturnValue({ dispose: vi.fn() }),
				dispose: vi.fn(),
			}),
			getWorkspaceFolder: vi.fn(),
		},
		RelativePattern: vi.fn().mockImplementation(function (base: any, pattern: any) {
			return { base, pattern }
		}),
	}
})

// Mock only the essential dependencies
vi.mock("../../../utils/path", () => {
	const testPath = require("path")
	const testWorkspacePath = testPath.join(testPath.sep, "test", "workspace")
	return {
		getWorkspacePath: vi.fn(() => testWorkspacePath),
	}
})

// Mock fs/promises for RooIgnoreController
vi.mock("fs/promises", () => ({
	default: {
		readFile: vi.fn().mockRejectedValue(new Error("File not found")), // Simulate no .gitignore/.rooignore
	},
}))

// Mock file utils for RooIgnoreController
vi.mock("../../../utils/fs", () => ({
	fileExistsAtPath: vi.fn().mockResolvedValue(false), // Simulate no .rooignore file
}))

// Mock ignore module
vi.mock("ignore", () => ({
	default: vi.fn().mockReturnValue({
		add: vi.fn(),
		ignores: vi.fn().mockReturnValue(false),
	}),
}))

vi.mock("../state-manager", () => ({
	CodeIndexStateManager: vi.fn().mockImplementation(function () {
		// Closure-backed state so manager.state / getCurrentStatus() reflect the
		// shared state manager (single source of truth) in tests.
		let currentState = "Standby"
		let currentMessage = ""
		return {
			onProgressUpdate: vi.fn(),
			get state() {
				return currentState
			},
			getCurrentStatus: vi.fn().mockImplementation(() => ({
				systemStatus: currentState,
				message: currentMessage,
				processedItems: 0,
				totalItems: 0,
				currentItemUnit: "items",
			})),
			dispose: vi.fn(),
			setSystemState: vi.fn().mockImplementation((newState: string, message?: string) => {
				currentState = newState
				if (message !== undefined) currentMessage = message
			}),
		}
	}),
}))

// Mock the Semble provider so _recreateServices can exercise the semble branch.
vi.mock("../semble", () => {
	const mockSembleProvider = {
		initialize: vi.fn().mockResolvedValue(undefined),
		startIndexing: vi.fn().mockResolvedValue(undefined),
		stopIndexing: vi.fn(),
		searchIndex: vi.fn().mockResolvedValue([]),
		clearIndexData: vi.fn().mockResolvedValue(undefined),
		reset: vi.fn(),
		dispose: vi.fn(),
		state: "Indexed",
	}
	return {
		SembleProvider: vi.fn().mockImplementation(function () {
			return mockSembleProvider
		}),
	}
})

// Mock TelemetryService
vi.mock("@roo-code/telemetry", () => ({
	TelemetryService: {
		instance: {
			captureEvent: vi.fn(),
		},
	},
}))

vi.mock("../service-factory")
const MockedCodeIndexServiceFactory = CodeIndexServiceFactory as MockedClass<typeof CodeIndexServiceFactory>

describe("CodeIndexManager - handleSettingsChange regression", () => {
	let mockContext: any
	let manager: CodeIndexManager

	// Define test paths for use in tests
	const testWorkspacePath = path.join(path.sep, "test", "workspace")
	const testExtensionPath = path.join(path.sep, "test", "extension")
	const testStoragePath = path.join(path.sep, "test", "storage")
	const testGlobalStoragePath = path.join(path.sep, "test", "global-storage")
	const testLogPath = path.join(path.sep, "test", "log")

	beforeEach(() => {
		// Clear all instances before each test
		CodeIndexManager.disposeAll()

		const workspaceStateStore: Record<string, any> = {}
		const globalStateStore: Record<string, any> = {}
		mockContext = {
			subscriptions: [],
			workspaceState: {
				get: vi.fn((key: string, defaultValue?: any) => workspaceStateStore[key] ?? defaultValue),
				update: vi.fn(async (key: string, value: any) => {
					workspaceStateStore[key] = value
				}),
			} as any,
			globalState: {
				get: vi.fn((key: string, defaultValue?: any) => globalStateStore[key] ?? defaultValue),
				update: vi.fn(async (key: string, value: any) => {
					globalStateStore[key] = value
				}),
			} as any,
			extensionUri: {} as any,
			extensionPath: testExtensionPath,
			asAbsolutePath: vi.fn(),
			storageUri: {} as any,
			storagePath: testStoragePath,
			globalStorageUri: {} as any,
			globalStoragePath: testGlobalStoragePath,
			logUri: {} as any,
			logPath: testLogPath,
			extensionMode: 3, // vscode.ExtensionMode.Test
			secrets: {} as any,
			environmentVariableCollection: {} as any,
			extension: {} as any,
			languageModelAccessInformation: {} as any,
		}

		manager = CodeIndexManager.getInstance(mockContext)!
	})

	afterEach(() => {
		CodeIndexManager.disposeAll()
	})

	describe("handleSettingsChange", () => {
		it("should not throw when called on uninitialized manager (regression test)", async () => {
			// This is the core regression test: handleSettingsChange() should not throw
			// when called before the manager is initialized (during first-time configuration)

			// Ensure manager is not initialized
			expect(manager.isInitialized).toBe(false)

			// Mock a minimal config manager that simulates first-time configuration
			const mockConfigManager = {
				loadConfiguration: vi.fn().mockResolvedValue({ requiresRestart: true }),
				isFeatureConfigured: true,
				isFeatureEnabled: true,
				getConfig: vi.fn().mockReturnValue({
					isConfigured: true,
					embedderProvider: "openai",
					modelId: "text-embedding-3-small",
					openAiOptions: { openAiNativeApiKey: "test-key" },
					qdrantUrl: "http://localhost:6333",
					qdrantApiKey: "test-key",
					searchMinScore: 0.4,
				}),
			}
			;(manager as any)._configManager = mockConfigManager

			// Mock cache manager
			const mockCacheManager = {
				initialize: vi.fn(),
				clearCacheFile: vi.fn(),
			}
			;(manager as any)._cacheManager = mockCacheManager

			// Mock the feature state to simulate valid configuration that would normally trigger restart
			vi.spyOn(manager, "isFeatureEnabled", "get").mockReturnValue(true)
			vi.spyOn(manager, "isFeatureConfigured", "get").mockReturnValue(true)

			// Mock service factory to handle _recreateServices call
			const mockServiceFactoryInstance = {
				configManager: mockConfigManager,
				workspacePath: testWorkspacePath,
				cacheManager: mockCacheManager,
				createEmbedder: vi.fn().mockReturnValue({ embedderInfo: { name: "openai" } }),
				createVectorStore: vi.fn().mockReturnValue({}),
				createDirectoryScanner: vi.fn().mockReturnValue({}),
				createFileWatcher: vi.fn().mockReturnValue({
					onDidStartBatchProcessing: vi.fn(),
					onBatchProgressUpdate: vi.fn(),
					watch: vi.fn(),
					stopWatcher: vi.fn(),
					dispose: vi.fn(),
				}),
				createServices: vi.fn().mockReturnValue({
					embedder: { embedderInfo: { name: "openai" } },
					vectorStore: {},
					scanner: {},
					fileWatcher: {
						onDidStartBatchProcessing: vi.fn(),
						onBatchProgressUpdate: vi.fn(),
						watch: vi.fn(),
						stopWatcher: vi.fn(),
						dispose: vi.fn(),
					},
				}),
				validateEmbedder: vi.fn().mockResolvedValue({ valid: true }),
			}
			MockedCodeIndexServiceFactory.mockImplementation(function () {
				return mockServiceFactoryInstance as any
			})

			// The key test: this should NOT throw "CodeIndexManager not initialized" error
			await expect(manager.handleSettingsChange()).resolves.not.toThrow()

			// Verify that loadConfiguration was called (the method should still work)
			expect(mockConfigManager.loadConfiguration).toHaveBeenCalled()
		})

		it("should work normally when manager is initialized", async () => {
			// Mock a complete config manager with all required properties
			const mockConfigManager = {
				loadConfiguration: vi.fn().mockResolvedValue({ requiresRestart: true }),
				isFeatureConfigured: true,
				isFeatureEnabled: true,
				getConfig: vi.fn().mockReturnValue({
					isConfigured: true,
					embedderProvider: "openai",
					modelId: "text-embedding-3-small",
					openAiOptions: { openAiNativeApiKey: "test-key" },
					qdrantUrl: "http://localhost:6333",
					qdrantApiKey: "test-key",
					searchMinScore: 0.4,
				}),
			}
			;(manager as any)._configManager = mockConfigManager

			// Mock cache manager
			const mockCacheManager = {
				initialize: vi.fn(),
				clearCacheFile: vi.fn(),
			}
			;(manager as any)._cacheManager = mockCacheManager

			// Simulate an initialized manager by setting the required properties
			;(manager as any)._orchestrator = { stopWatcher: vi.fn(), stopIndexing: vi.fn() }
			;(manager as any)._searchService = {}

			// Verify manager is considered initialized
			expect(manager.isInitialized).toBe(true)

			// Mock the feature state
			vi.spyOn(manager, "isFeatureEnabled", "get").mockReturnValue(true)
			vi.spyOn(manager, "isFeatureConfigured", "get").mockReturnValue(true)

			// Mock service factory to handle _recreateServices call
			const mockServiceFactoryInstance = {
				configManager: mockConfigManager,
				workspacePath: testWorkspacePath,
				cacheManager: mockCacheManager,
				createEmbedder: vi.fn().mockReturnValue({ embedderInfo: { name: "openai" } }),
				createVectorStore: vi.fn().mockReturnValue({}),
				createDirectoryScanner: vi.fn().mockReturnValue({}),
				createFileWatcher: vi.fn().mockReturnValue({
					onDidStartBatchProcessing: vi.fn(),
					onBatchProgressUpdate: vi.fn(),
					watch: vi.fn(),
					stopWatcher: vi.fn(),
					dispose: vi.fn(),
				}),
				createServices: vi.fn().mockReturnValue({
					embedder: { embedderInfo: { name: "openai" } },
					vectorStore: {},
					scanner: {},
					fileWatcher: {
						onDidStartBatchProcessing: vi.fn(),
						onBatchProgressUpdate: vi.fn(),
						watch: vi.fn(),
						stopWatcher: vi.fn(),
						dispose: vi.fn(),
					},
				}),
				validateEmbedder: vi.fn().mockResolvedValue({ valid: true }),
			}
			MockedCodeIndexServiceFactory.mockImplementation(function () {
				return mockServiceFactoryInstance as any
			})

			// Mock the methods that would be called during restart
			const recreateServicesSpy = vi.spyOn(manager as any, "_recreateServices")

			await manager.handleSettingsChange()

			// Verify that the restart sequence was called
			expect(mockConfigManager.loadConfiguration).toHaveBeenCalled()
			// _recreateServices should be called when requiresRestart is true
			expect(recreateServicesSpy).toHaveBeenCalled()
			// Note: startIndexing is NOT called by handleSettingsChange - it's only called by initialize()
		})

		it("should handle case when config manager is not set", async () => {
			// Ensure config manager is not set (edge case)
			;(manager as any)._configManager = undefined

			// This should not throw an error
			await expect(manager.handleSettingsChange()).resolves.not.toThrow()
		})
	})

	describe("embedder validation integration", () => {
		let mockServiceFactoryInstance: any
		let mockStateManager: any
		let mockEmbedder: any
		let mockVectorStore: any
		let mockScanner: any
		let mockFileWatcher: any

		beforeEach(() => {
			// Mock service factory objects
			mockEmbedder = { embedderInfo: { name: "openai" } }
			mockVectorStore = {}
			mockScanner = {}
			mockFileWatcher = {
				onDidStartBatchProcessing: vi.fn(),
				onBatchProgressUpdate: vi.fn(),
				watch: vi.fn(),
				stopWatcher: vi.fn(),
				dispose: vi.fn(),
			}

			// Mock service factory instance
			mockServiceFactoryInstance = {
				createServices: vi.fn().mockReturnValue({
					embedder: mockEmbedder,
					vectorStore: mockVectorStore,
					scanner: mockScanner,
					fileWatcher: mockFileWatcher,
				}),
				validateEmbedder: vi.fn(),
			}

			// Mock the ServiceFactory constructor
			MockedCodeIndexServiceFactory.mockImplementation(function () {
				return mockServiceFactoryInstance
			})

			// Mock state manager methods directly on the existing instance
			mockStateManager = (manager as any)._stateManager
			mockStateManager.setSystemState = vi.fn()

			// Mock config manager
			const mockConfigManager = {
				loadConfiguration: vitest.fn().mockResolvedValue({ requiresRestart: false }),
				isFeatureConfigured: true,
				isFeatureEnabled: true,
				getConfig: vitest.fn().mockReturnValue({
					isConfigured: true,
					embedderProvider: "openai",
					modelId: "text-embedding-3-small",
					openAiOptions: { openAiNativeApiKey: "test-key" },
					qdrantUrl: "http://localhost:6333",
					qdrantApiKey: "test-key",
					searchMinScore: 0.4,
				}),
			}
			;(manager as any)._configManager = mockConfigManager
		})

		it("should validate embedder during _recreateServices when validation succeeds", async () => {
			// Arrange
			mockServiceFactoryInstance.validateEmbedder.mockResolvedValue({ valid: true })

			// Act - directly call the private method for testing
			await (manager as any)._recreateServices()

			// Assert
			expect(mockServiceFactoryInstance.createServices).toHaveBeenCalled()
			const createdEmbedder = mockServiceFactoryInstance.createServices.mock.results[0].value.embedder
			expect(mockServiceFactoryInstance.validateEmbedder).toHaveBeenCalledWith(createdEmbedder)
			expect(mockStateManager.setSystemState).not.toHaveBeenCalledWith("Error", expect.any(String))
		})

		it("should set error state when embedder validation fails", async () => {
			// Arrange
			mockServiceFactoryInstance.validateEmbedder.mockResolvedValue({
				valid: false,
				error: "embeddings:validation.authenticationFailed",
			})

			// Act & Assert
			await expect((manager as any)._recreateServices()).rejects.toThrow(
				"embeddings:validation.authenticationFailed",
			)

			// Assert other expectations
			expect(mockServiceFactoryInstance.createServices).toHaveBeenCalled()
			const createdEmbedder = mockServiceFactoryInstance.createServices.mock.results[0].value.embedder
			expect(mockServiceFactoryInstance.validateEmbedder).toHaveBeenCalledWith(createdEmbedder)
			expect(mockStateManager.setSystemState).toHaveBeenCalledWith(
				"Error",
				"embeddings:validation.authenticationFailed",
			)
		})

		it("should set generic error state when embedder validation throws", async () => {
			// Arrange
			// Since the real service factory catches exceptions, we should mock it to resolve with an error
			mockServiceFactoryInstance.validateEmbedder.mockResolvedValue({
				valid: false,
				error: "embeddings:validation.configurationError",
			})

			// Act & Assert
			await expect((manager as any)._recreateServices()).rejects.toThrow(
				"embeddings:validation.configurationError",
			)

			// Assert other expectations
			expect(mockServiceFactoryInstance.createServices).toHaveBeenCalled()
			const createdEmbedder = mockServiceFactoryInstance.createServices.mock.results[0].value.embedder
			expect(mockServiceFactoryInstance.validateEmbedder).toHaveBeenCalledWith(createdEmbedder)
			expect(mockStateManager.setSystemState).toHaveBeenCalledWith(
				"Error",
				"embeddings:validation.configurationError",
			)
		})

		it("should handle embedder creation failure", async () => {
			// Arrange
			mockServiceFactoryInstance.createServices.mockImplementation(() => {
				throw new Error("Invalid configuration")
			})

			// Act & Assert - should throw the error
			await expect((manager as any)._recreateServices()).rejects.toThrow("Invalid configuration")

			// Should not attempt validation if embedder creation fails
			expect(mockServiceFactoryInstance.validateEmbedder).not.toHaveBeenCalled()
		})
	})

	describe("recoverFromError", () => {
		let mockConfigManager: any
		let mockCacheManager: any
		let mockStateManager: any

		beforeEach(() => {
			// Mock config manager
			mockConfigManager = {
				loadConfiguration: vi.fn().mockResolvedValue({ requiresRestart: false }),
				isFeatureConfigured: true,
				isFeatureEnabled: true,
				getConfig: vi.fn().mockReturnValue({
					isConfigured: true,
					embedderProvider: "openai",
					modelId: "text-embedding-3-small",
					openAiOptions: { openAiNativeApiKey: "test-key" },
					qdrantUrl: "http://localhost:6333",
					qdrantApiKey: "test-key",
					searchMinScore: 0.4,
				}),
			}
			;(manager as any)._configManager = mockConfigManager

			// Mock cache manager
			mockCacheManager = {
				initialize: vi.fn(),
				clearCacheFile: vi.fn(),
			}
			;(manager as any)._cacheManager = mockCacheManager

			// Mock state manager
			mockStateManager = (manager as any)._stateManager
			mockStateManager.setSystemState = vi.fn()
			mockStateManager.getCurrentStatus = vi.fn().mockReturnValue({
				systemStatus: "Error",
				message: "Failed during initial scan: fetch failed",
				processedItems: 0,
				totalItems: 0,
				currentItemUnit: "items",
			})

			// Mock orchestrator and search service to simulate initialized state
			;(manager as any)._orchestrator = { stopWatcher: vi.fn(), stopIndexing: vi.fn(), state: "Error" }
			;(manager as any)._searchService = {}
			;(manager as any)._serviceFactory = {}
		})

		it("should clear error state when recoverFromError is called", async () => {
			// Act
			await manager.recoverFromError()

			// Assert
			expect(mockStateManager.setSystemState).toHaveBeenCalledWith("Standby", "")
		})

		it("should reset internal service instances", async () => {
			// Verify initial state
			expect((manager as any)._configManager).toBeDefined()
			expect((manager as any)._serviceFactory).toBeDefined()
			expect((manager as any)._orchestrator).toBeDefined()
			expect((manager as any)._searchService).toBeDefined()

			// Act
			await manager.recoverFromError()

			// Assert - all service instances should be undefined
			expect((manager as any)._configManager).toBeUndefined()
			expect((manager as any)._serviceFactory).toBeUndefined()
			expect((manager as any)._orchestrator).toBeUndefined()
			expect((manager as any)._searchService).toBeUndefined()
		})

		it("should make manager report as not initialized after recovery", async () => {
			// Verify initial state
			expect(manager.isInitialized).toBe(true)

			// Act
			await manager.recoverFromError()

			// Assert
			expect(manager.isInitialized).toBe(false)
		})

		it("should allow re-initialization after recovery", async () => {
			// Setup mock for re-initialization
			const mockServiceFactoryInstance = {
				createServices: vi.fn().mockReturnValue({
					embedder: { embedderInfo: { name: "openai" } },
					vectorStore: {},
					scanner: {},
					fileWatcher: {
						onDidStartBatchProcessing: vi.fn(),
						onBatchProgressUpdate: vi.fn(),
						watch: vi.fn(),
						stopWatcher: vi.fn(),
						dispose: vi.fn(),
					},
				}),
				validateEmbedder: vi.fn().mockResolvedValue({ valid: true }),
			}
			MockedCodeIndexServiceFactory.mockImplementation(function () {
				return mockServiceFactoryInstance as any
			})

			// Act - recover from error
			await manager.recoverFromError()

			// Verify manager is not initialized
			expect(manager.isInitialized).toBe(false)

			// Mock context proxy for initialization
			const mockContextProxy = {
				getValue: vi.fn(),
				setValue: vi.fn(),
				storeSecret: vi.fn(),
				getSecret: vi.fn(),
				refreshSecrets: vi.fn().mockResolvedValue(undefined),
				getGlobalState: vi.fn().mockReturnValue({
					codebaseIndexEnabled: true,
					codebaseIndexQdrantUrl: "http://localhost:6333",
					codebaseIndexEmbedderProvider: "openai",
					codebaseIndexEmbedderModelId: "text-embedding-3-small",
					codebaseIndexEmbedderModelDimension: 1536,
					codebaseIndexSearchMaxResults: 10,
					codebaseIndexSearchMinScore: 0.4,
				}),
			}

			// Enable workspace indexing before re-initialization
			await manager.setWorkspaceEnabled(true)

			// Re-initialize
			await manager.initialize(mockContextProxy as any)

			// Assert - manager should be initialized again
			expect(manager.isInitialized).toBe(true)
			expect(mockServiceFactoryInstance.createServices).toHaveBeenCalled()
			expect(mockServiceFactoryInstance.validateEmbedder).toHaveBeenCalled()
		})

		it("should be safe to call when not in error state (idempotent)", async () => {
			// Setup manager in non-error state
			mockStateManager.getCurrentStatus.mockReturnValue({
				systemStatus: "Standby",
				message: "",
				processedItems: 0,
				totalItems: 0,
				currentItemUnit: "items",
			})

			// Verify initial state is not error
			const initialStatus = manager.getCurrentStatus()
			expect(initialStatus.systemStatus).not.toBe("Error")

			// Act - call recoverFromError when not in error state
			await expect(manager.recoverFromError()).resolves.not.toThrow()

			// Assert - should still clear state and service instances
			expect(mockStateManager.setSystemState).toHaveBeenCalledWith("Standby", "")
			expect((manager as any)._configManager).toBeUndefined()
			expect((manager as any)._serviceFactory).toBeUndefined()
			expect((manager as any)._orchestrator).toBeUndefined()
			expect((manager as any)._searchService).toBeUndefined()
		})

		it("should continue recovery even if setSystemState throws", async () => {
			// Setup state manager to throw on setSystemState
			mockStateManager.setSystemState.mockImplementation(() => {
				throw new Error("State update failed")
			})

			// Setup manager with service instances
			;(manager as any)._configManager = mockConfigManager
			;(manager as any)._serviceFactory = {}
			;(manager as any)._orchestrator = { stopWatcher: vi.fn(), stopIndexing: vi.fn() }
			;(manager as any)._searchService = {}

			// Spy on console.error
			const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

			// Act - should not throw despite setSystemState error
			await expect(manager.recoverFromError()).resolves.not.toThrow()

			// Assert - error should be logged
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				"Failed to clear error state during recovery:",
				expect.any(Error),
			)

			// Assert - service instances should still be cleared
			expect((manager as any)._configManager).toBeUndefined()
			expect((manager as any)._serviceFactory).toBeUndefined()
			expect((manager as any)._orchestrator).toBeUndefined()
			expect((manager as any)._searchService).toBeUndefined()

			// Cleanup
			consoleErrorSpy.mockRestore()
		})
	})

	describe("workspace-enabled gating", () => {
		it("should not start indexing when workspace is not enabled", async () => {
			await manager.setAutoEnableDefault(false)

			const mockStateManager = (manager as any)._stateManager
			mockStateManager.setSystemState = vi.fn()
			mockStateManager.getCurrentStatus = vi.fn().mockReturnValue({
				systemStatus: "Standby",
				message: "",
				processedItems: 0,
				totalItems: 0,
				currentItemUnit: "items",
			})

			expect(manager.isWorkspaceEnabled).toBe(false)

			await manager.startIndexing()

			expect(mockStateManager.setSystemState).not.toHaveBeenCalledWith("Indexing", expect.any(String))
		})

		it("should include workspaceEnabled in getCurrentStatus", async () => {
			await manager.setAutoEnableDefault(false)

			const mockStateManager = (manager as any)._stateManager
			mockStateManager.getCurrentStatus = vi.fn().mockReturnValue({
				systemStatus: "Standby",
				message: "",
				processedItems: 0,
				totalItems: 0,
				currentItemUnit: "items",
			})

			const status = manager.getCurrentStatus()
			expect(status.workspaceEnabled).toBe(false)
		})

		it("should persist workspace enabled state", async () => {
			await manager.setAutoEnableDefault(false)
			expect(manager.isWorkspaceEnabled).toBe(false)

			await manager.setWorkspaceEnabled(true)
			expect(manager.isWorkspaceEnabled).toBe(true)

			await manager.setWorkspaceEnabled(false)
			expect(manager.isWorkspaceEnabled).toBe(false)
		})

		it("should store enablement per folder URI, not per window", async () => {
			CodeIndexManager.disposeAll()

			const vscode = await import("vscode")

			const folderAPath = path.join(path.sep, "test", "folderA")
			const folderBPath = path.join(path.sep, "test", "folderB")
			const folderAUri = mockUri(folderAPath)
			const folderBUri = mockUri(folderBPath)

			// Both folders share the same workspaceState (same window)
			const sharedStore: Record<string, any> = {}
			const sharedContext = {
				...mockContext,
				workspaceState: {
					get: vi.fn((key: string, defaultValue?: any) => sharedStore[key] ?? defaultValue),
					update: vi.fn(async (key: string, value: any) => {
						sharedStore[key] = value
					}),
				} as any,
				globalState: {
					get: vi.fn((_key: string, _defaultValue?: any) => false),
					update: vi.fn(),
				} as any,
			}

			// Patch workspaceFolders to include both folders
			;(vscode.workspace as any).workspaceFolders = [
				{ uri: folderAUri, name: "folderA", index: 0 },
				{ uri: folderBUri, name: "folderB", index: 1 },
			]

			const managerA = CodeIndexManager.getInstance(sharedContext as any, folderAPath)!
			const managerB = CodeIndexManager.getInstance(sharedContext as any, folderBPath)!

			// Both start disabled (autoEnableDefault is false via globalState mock)
			expect(managerA.isWorkspaceEnabled).toBe(false)
			expect(managerB.isWorkspaceEnabled).toBe(false)

			// Enable A only
			await managerA.setWorkspaceEnabled(true)

			expect(managerA.isWorkspaceEnabled).toBe(true)
			expect(managerB.isWorkspaceEnabled).toBe(false)

			// Enable B, disable A
			await managerB.setWorkspaceEnabled(true)
			await managerA.setWorkspaceEnabled(false)

			expect(managerA.isWorkspaceEnabled).toBe(false)
			expect(managerB.isWorkspaceEnabled).toBe(true)

			CodeIndexManager.disposeAll()
		})
	})

	describe("stopIndexing", () => {
		it("should delegate to orchestrator.stopIndexing()", () => {
			const mockOrchestrator = {
				stopIndexing: vi.fn(),
				stopWatcher: vi.fn(),
				state: "Indexing",
			}
			;(manager as any)._orchestrator = mockOrchestrator

			manager.stopIndexing()

			expect(mockOrchestrator.stopIndexing).toHaveBeenCalled()
		})

		it("should be safe to call when orchestrator is not set", () => {
			;(manager as any)._orchestrator = undefined

			expect(() => manager.stopIndexing()).not.toThrow()
		})
	})

	describe("handleSettingsChange - disable toggle bug fix", () => {
		it("should abort active indexing when feature is disabled", async () => {
			const mockOrchestrator = {
				stopIndexing: vi.fn(),
				stopWatcher: vi.fn(),
				state: "Indexing",
			}
			;(manager as any)._orchestrator = mockOrchestrator

			const mockConfigManager = {
				loadConfiguration: vi.fn().mockResolvedValue({ requiresRestart: false }),
				isFeatureConfigured: true,
				isFeatureEnabled: false,
			}
			;(manager as any)._configManager = mockConfigManager

			const mockStateManager = (manager as any)._stateManager
			mockStateManager.setSystemState = vi.fn()

			await manager.handleSettingsChange()

			expect(mockOrchestrator.stopIndexing).toHaveBeenCalled()
			expect(mockStateManager.setSystemState).toHaveBeenCalledWith("Standby", "Code indexing is disabled")
		})
	})

	describe("R2: handleSettingsChange lazy config manager", () => {
		it("should lazily create the config manager when missing (with contextProxy)", async () => {
			// Simulate a manager that was never initialized (swallowed background init)
			manager["_configManager"] = undefined
			manager["_contextProxy"] = undefined

			const mockContextProxy = {
				getGlobalState: vi.fn().mockReturnValue({ codebaseIndexEnabled: false }),
				getSecret: vi.fn().mockReturnValue(undefined),
				refreshSecrets: vi.fn().mockResolvedValue(undefined),
			}

			await manager.handleSettingsChange(mockContextProxy as unknown as ContextProxy)

			// A settings save must always load config by creating the config manager
			expect(manager["_configManager"]).toBeDefined()
		})

		it("should reuse the stored contextProxy from initialize() when none is passed", async () => {
			manager["_configManager"] = undefined

			const mockContextProxy = {
				getGlobalState: vi.fn().mockReturnValue({ codebaseIndexEnabled: false }),
				getSecret: vi.fn().mockReturnValue(undefined),
				refreshSecrets: vi.fn().mockResolvedValue(undefined),
			}
			await manager.initialize(mockContextProxy as unknown as ContextProxy)
			expect(manager["_configManager"]).toBeDefined()

			// Clear the config manager to force lazy recreation from the stored proxy
			manager["_configManager"] = undefined

			await manager.handleSettingsChange()
			expect(manager["_configManager"]).toBeDefined()
		})
	})

	describe("R3: provider change forces service recreation", () => {
		it("should dispose a stale Semble provider when switching to an unconfigured target", async () => {
			const disposeSpy = vi.fn()
			manager["_sembleProvider"] = {
				dispose: disposeSpy,
				stopIndexing: vi.fn(),
			} as unknown as SembleProvider

			const mockConfigManager = {
				loadConfiguration: vi.fn().mockResolvedValue({
					requiresRestart: false,
					configSnapshot: { embedderProvider: "semble" },
					currentConfig: { embedderProvider: "gemini" },
				}),
				isFeatureEnabled: true,
				isFeatureConfigured: false, // unconfigured target
				currentEmbedderProvider: "gemini",
				getConfig: vi.fn().mockReturnValue({}),
			}
			manager["_configManager"] = mockConfigManager as unknown as CodeIndexConfigManager
			manager["_cacheManager"] = {
				initialize: vi.fn().mockResolvedValue(undefined),
				clearCacheFile: vi.fn(),
			} as unknown as CacheManager

			const mockServiceFactoryInstance = {
				createServices: vi.fn().mockReturnValue({
					embedder: { embedderInfo: { name: "gemini" } },
					vectorStore: {},
					scanner: {},
					fileWatcher: {
						onDidStartBatchProcessing: vi.fn(),
						onBatchProgressUpdate: vi.fn(),
						watch: vi.fn(),
						stopWatcher: vi.fn(),
						dispose: vi.fn(),
					},
				}),
				validateEmbedder: vi.fn().mockResolvedValue({ valid: true }),
			}
			MockedCodeIndexServiceFactory.mockImplementation(function () {
				// Test-only factory double for the external-provider path.
				return mockServiceFactoryInstance as unknown as CodeIndexServiceFactory
			})

			await manager.handleSettingsChange()

			// Stale provider is disposed even though the new provider is unconfigured
			expect(disposeSpy).toHaveBeenCalled()
			expect(manager["_sembleProvider"]).toBeUndefined()
			// External gemini services are rebuilt
			expect(mockServiceFactoryInstance.createServices).toHaveBeenCalled()
			expect(manager["_orchestrator"]).toBeDefined()
		})

		it("should create a SembleProvider when switching to semble", async () => {
			manager["_sembleProvider"] = undefined
			manager["_cacheManager"] = {
				initialize: vi.fn().mockResolvedValue(undefined),
				clearCacheFile: vi.fn(),
			} as unknown as CacheManager

			const mockConfigManager = {
				loadConfiguration: vi.fn().mockResolvedValue({
					requiresRestart: false,
					configSnapshot: { embedderProvider: "openai" },
					currentConfig: { embedderProvider: "semble" },
				}),
				isFeatureEnabled: true,
				isFeatureConfigured: true,
				currentEmbedderProvider: "semble",
				sembleBinaryPath: undefined,
				getConfig: vi.fn().mockReturnValue({}),
			}
			manager["_configManager"] = mockConfigManager as unknown as CodeIndexConfigManager

			await manager.handleSettingsChange()

			// Reference-aligned (Zoo-Code): the Semble provider is created WITHOUT
			// searchMinScore/searchMaxResults — the Semble path applies no score
			// filter / result cap; those settings are consumed only by the Qdrant path.
			expect(SembleProvider).toHaveBeenCalledWith(
				manager["workspacePath"],
				manager["context"],
				manager["_stateManager"],
				expect.objectContaining({
					binaryPath: undefined,
				}),
			)
			expect(SembleProvider).not.toHaveBeenCalledWith(
				manager["workspacePath"],
				manager["context"],
				manager["_stateManager"],
				expect.objectContaining({
					searchMinScore: expect.anything(),
				}),
			)
			expect(manager["_sembleProvider"]).toBeDefined()
		})
	})

	describe("R5: unified state source of truth", () => {
		it("should not throw when feature is enabled but the manager is uninitialized", () => {
			vi.spyOn(manager, "isFeatureEnabled", "get").mockReturnValue(true)
			manager["_sembleProvider"] = undefined
			manager["_orchestrator"] = undefined

			expect(() => manager.state).not.toThrow()
			expect(manager.state).toBe("Standby")
		})

		it("should return Standby when feature is disabled and uninitialized", () => {
			vi.spyOn(manager, "isFeatureEnabled", "get").mockReturnValue(false)
			manager["_sembleProvider"] = undefined
			manager["_orchestrator"] = undefined

			expect(() => manager.state).not.toThrow()
			expect(manager.state).toBe("Standby")
		})

		it("should always mirror the shared state manager (single source of truth)", () => {
			vi.spyOn(manager, "isFeatureEnabled", "get").mockReturnValue(true)
			const mockStateManager = manager["_stateManager"]

			mockStateManager.setSystemState("Indexing", "Working...")
			expect(manager.state).toBe("Indexing")
			expect(manager.getCurrentStatus().systemStatus).toBe("Indexing")

			mockStateManager.setSystemState("Indexed", "Done")
			expect(manager.state).toBe("Indexed")
			expect(manager.getCurrentStatus().systemStatus).toBe("Indexed")
		})
	})

	describe("R7: Semble failed-init retry", () => {
		it("should reset and retry a failed Semble init on explicit startIndexing", async () => {
			manager["_configManager"] = {
				isFeatureEnabled: true,
				isFeatureConfigured: true,
			} as unknown as CodeIndexConfigManager

			const reset = vi.fn()
			const startIndexing = vi.fn().mockResolvedValue(undefined)
			manager["_sembleProvider"] = {
				reset,
				startIndexing,
				stopIndexing: vi.fn(),
				dispose: vi.fn(),
				state: "Error",
			} as unknown as SembleProvider

			// Shared state manager reflects a failed Semble init (Error)
			;(manager["_stateManager"] as { setSystemState: (s: string, m?: string) => void }).setSystemState(
				"Error",
				"download failed",
			)

			await manager.startIndexing()

			// An explicit user action must retry the previously-failed download
			expect(reset).toHaveBeenCalled()
			expect(startIndexing).toHaveBeenCalled()
		})

		it("should not reset a healthy Semble provider on startIndexing", async () => {
			manager["_configManager"] = {
				isFeatureEnabled: true,
				isFeatureConfigured: true,
			} as unknown as CodeIndexConfigManager

			const reset = vi.fn()
			const startIndexing = vi.fn().mockResolvedValue(undefined)
			manager["_sembleProvider"] = {
				reset,
				startIndexing,
				stopIndexing: vi.fn(),
				dispose: vi.fn(),
				state: "Indexed",
			} as unknown as SembleProvider
			;(manager["_stateManager"] as { setSystemState: (s: string, m?: string) => void }).setSystemState(
				"Indexed",
				"ready",
			)

			await manager.startIndexing()

			expect(reset).not.toHaveBeenCalled()
			expect(startIndexing).toHaveBeenCalled()
		})
	})

	describe("R8: concurrent initialize() coalescing", () => {
		it("should serialize concurrent initialize() calls into one service recreation", async () => {
			manager["_configManager"] = {
				loadConfiguration: vi.fn().mockResolvedValue({ requiresRestart: false }),
				isFeatureEnabled: true,
				isFeatureConfigured: true,
				currentEmbedderProvider: "semble",
				getConfig: vi.fn().mockReturnValue({}),
			} as unknown as CodeIndexConfigManager
			manager["_cacheManager"] = {
				initialize: vi.fn().mockResolvedValue(undefined),
				clearCacheFile: vi.fn(),
			} as unknown as CacheManager
			manager["_sembleProvider"] = undefined

			// Clear prior constructor counts so the assertion below is isolated to
			// this test (the module mock is shared across tests in this file).
			vi.mocked(SembleProvider).mockClear()

			const mockContextProxy = { getValue: vi.fn() } as unknown as ContextProxy

			// Two rapid calls without awaiting the first — must share one in-flight run,
			// so the provider is constructed (and services recreated) exactly once.
			const p1 = manager.initialize(mockContextProxy)
			const p2 = manager.initialize(mockContextProxy)
			await Promise.all([p1, p2])

			expect(SembleProvider).toHaveBeenCalledTimes(1)
		})
	})

	describe("searchIndex Semble error contract", () => {
		it("should propagate a genuine Semble search failure (not mask it as [])", async () => {
			manager["_configManager"] = {
				isFeatureEnabled: true,
				isFeatureConfigured: true,
			} as unknown as CodeIndexConfigManager

			const searchError = new Error("Semble search failed: spawn EACCES")
			manager["_sembleProvider"] = {
				searchIndex: vi.fn().mockRejectedValue(searchError),
				stopIndexing: vi.fn(),
				dispose: vi.fn(),
			} as unknown as SembleProvider

			// A genuine CLI/search failure must reach the caller (CodebaseSearchTool
			// routes it through handleError) rather than being masked as an empty
			// result — consistent with the Qdrant path (CodeIndexSearchService)
			// which already throws.
			await expect(manager.searchIndex("query")).rejects.toThrow("spawn EACCES")
		})

		it("should return [] for a genuine 'no results' from the Semble provider", async () => {
			manager["_configManager"] = {
				isFeatureEnabled: true,
				isFeatureConfigured: true,
			} as unknown as CodeIndexConfigManager

			manager["_sembleProvider"] = {
				searchIndex: vi.fn().mockResolvedValue([]),
				stopIndexing: vi.fn(),
				dispose: vi.fn(),
			} as unknown as SembleProvider

			await expect(manager.searchIndex("query")).resolves.toEqual([])
		})

		it("should return [] when the feature is disabled", async () => {
			manager["_configManager"] = {
				isFeatureEnabled: false,
				isFeatureConfigured: true,
			} as unknown as CodeIndexConfigManager
			manager["_sembleProvider"] = {
				searchIndex: vi.fn().mockResolvedValue([]),
				stopIndexing: vi.fn(),
				dispose: vi.fn(),
			} as unknown as SembleProvider

			await expect(manager.searchIndex("query")).resolves.toEqual([])
		})
	})
})

describe("getInstance workspace-folder resolution (F2/F3)", () => {
	// Matches the workspace folder path used by the vscode mock in this file.
	const workspacePath = path.join(path.sep, "test", "workspace")

	let testContext: ExtensionContext

	beforeEach(async () => {
		CodeIndexManager.disposeAll()

		const workspaceStateStore: Record<string, unknown> = {}
		const globalStateStore: Record<string, unknown> = {}
		// Minimal ExtensionContext double — getInstance only stores it on the instance.
		testContext = {
			subscriptions: [],
			workspaceState: {
				get: vi.fn((key: string, defaultValue?: unknown) => workspaceStateStore[key] ?? defaultValue),
				update: vi.fn(async (key: string, value: unknown) => {
					workspaceStateStore[key] = value
				}),
			},
			globalState: {
				get: vi.fn((key: string, defaultValue?: unknown) => globalStateStore[key] ?? defaultValue),
				update: vi.fn(async (key: string, value: unknown) => {
					globalStateStore[key] = value
				}),
			},
		} as unknown as ExtensionContext

		const vscode = await import("vscode")
		// Restore a single workspace folder root and a "no containing folder" default so
		// earlier tests that mutated workspace.workspaceFolders don't leak in here.
		;(vscode.workspace as unknown as { workspaceFolders: WorkspaceFolder[] | undefined }).workspaceFolders = [
			{
				uri: vscode.Uri.file(workspacePath),
				name: "test",
				index: 0,
			},
		]
		vi.mocked(vscode.workspace.getWorkspaceFolder).mockReset()
	})

	afterEach(() => {
		CodeIndexManager.disposeAll()
	})

	it("resolves a subdirectory path to the SAME instance as its workspace-folder root (F3)", async () => {
		const vscode = await import("vscode")
		const subdirPath = path.join(workspacePath, "packages", "app")

		// getWorkspaceFolder(Uri.file(subdirPath)) → the containing workspace folder
		// (the root), exactly as VS Code does for a project subdirectory.
		const containingFolder: WorkspaceFolder = {
			uri: vscode.Uri.file(workspacePath),
			name: "test",
			index: 0,
		}
		vi.mocked(vscode.workspace.getWorkspaceFolder).mockImplementation((uri) =>
			uri.fsPath === subdirPath ? containingFolder : undefined,
		)

		const rootManager = CodeIndexManager.getInstance(testContext, workspacePath)!
		const subdirManager = CodeIndexManager.getInstance(testContext, subdirPath)!

		// F3 regression: the subdir call must NOT create a duplicate, never-initialized
		// instance keyed by the subdir path — both resolve to the workspace-root instance.
		expect(subdirManager).toBe(rootManager)
		expect(CodeIndexManager.getAllInstances()).toHaveLength(1)
	})

	it("creates a standalone instance for a path outside all workspaces (synthetic URI fallback)", async () => {
		const vscode = await import("vscode")
		const outsidePath = path.join(path.sep, "outside", "project")

		// No workspace folder contains the outside path.
		vi.mocked(vscode.workspace.getWorkspaceFolder).mockImplementation(() => undefined)

		const outsideManager = CodeIndexManager.getInstance(testContext, outsidePath)!
		const rootManager = CodeIndexManager.getInstance(testContext, workspacePath)!

		// Standalone fallback preserved: distinct from the workspace-root instance and
		// stable across repeat calls (cached by the outside path).
		expect(outsideManager).toBeDefined()
		expect(CodeIndexManager.getInstance(testContext, outsidePath)).toBe(outsideManager)
		expect(outsideManager).not.toBe(rootManager)
		expect(CodeIndexManager.getAllInstances()).toHaveLength(2)
	})

	it("resolves to the first workspace folder when no workspacePath is given", async () => {
		const manager = CodeIndexManager.getInstance(testContext)!
		expect(manager).toBeDefined()
		expect(manager["workspacePath"]).toBe(workspacePath)
		// Same instance as explicitly resolving the workspace root.
		expect(CodeIndexManager.getInstance(testContext, workspacePath)).toBe(manager)
	})
})
