import * as vscode from "vscode"
import { ContextProxy } from "../../core/config/ContextProxy"
import { VectorStoreSearchResult } from "./interfaces"
import { IndexingState } from "./interfaces/manager"
import { CodeIndexConfigManager } from "./config-manager"
import { CodeIndexStateManager } from "./state-manager"
import { CodeIndexServiceFactory } from "./service-factory"
import { CodeIndexSearchService } from "./search-service"
import { CodeIndexOrchestrator } from "./orchestrator"
import { CacheManager } from "./cache-manager"
import { SembleProvider } from "./semble"
import { RooIgnoreController } from "../../core/ignore/RooIgnoreController"
import fs from "fs/promises"
import ignore from "ignore"
import path from "path"
import { t } from "../../i18n"
import { TelemetryService } from "@roo-code/telemetry"
import { TelemetryEventName } from "@roo-code/types"

export class CodeIndexManager {
	// --- Singleton Implementation ---
	private static instances = new Map<string, CodeIndexManager>() // Map workspace path to instance

	// Specialized class instances
	private _configManager: CodeIndexConfigManager | undefined
	private _contextProxy: ContextProxy | undefined
	private readonly _stateManager: CodeIndexStateManager
	private _serviceFactory: CodeIndexServiceFactory | undefined
	private _orchestrator: CodeIndexOrchestrator | undefined
	private _searchService: CodeIndexSearchService | undefined
	private _cacheManager: CacheManager | undefined
	private _sembleProvider: SembleProvider | undefined

	// Flag to prevent race conditions during error recovery
	private _isRecoveringFromError = false

	// In-flight guard so concurrent initialize() calls (e.g. two rapid
	// "Start Indexing" clicks while a background init is still running) share a
	// single run instead of recreating services / starting indexing twice.
	private _initializePromise: Promise<{ requiresRestart: boolean }> | undefined

	public static getInstance(context: vscode.ExtensionContext, workspacePath?: string): CodeIndexManager | undefined {
		// Resolve the workspace folder to get both fsPath and the real URI
		let folder: vscode.WorkspaceFolder | undefined

		if (workspacePath) {
			// Exact workspace-folder match first (fast path, avoids a URI round-trip).
			folder = vscode.workspace.workspaceFolders?.find((f) => f.uri.fsPath === workspacePath)
			// When workspacePath is a contained path (e.g. a project subdirectory) rather than
			// a workspace-folder root, resolve it to its containing folder so every call site
			// (tool filtering, activation, webview, search tool) converges on the SAME instance
			// keyed by the real workspace root. Without this, a subdirectory cwd would create a
			// separate, never-initialized instance keyed by the subdir path (F3).
			if (!folder) {
				folder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(workspacePath))
			}
			if (folder) {
				workspacePath = folder.uri.fsPath
			}
		} else {
			const activeEditor = vscode.window.activeTextEditor
			if (activeEditor) {
				folder = vscode.workspace.getWorkspaceFolder(activeEditor.document.uri)
			}
			if (!folder) {
				const workspaceFolders = vscode.workspace.workspaceFolders
				if (!workspaceFolders || workspaceFolders.length === 0) {
					return undefined
				}
				folder = workspaceFolders[0]
			}
			workspacePath = folder.uri.fsPath
		}

		if (!CodeIndexManager.instances.has(workspacePath)) {
			// folder is undefined here only when workspacePath was provided but doesn't resolve
			// to any workspace folder (e.g. a path outside all open workspaces). Fall back to a
			// synthetic file:// URI so the standalone instance still works. A typed double-cast is
			// used because vscode.Uri is an opaque class and there is no typed factory for a
			// guaranteed out-of-workspace URI — the fallback is a structural stand-in only.
			const folderUri =
				folder?.uri ??
				({
					fsPath: workspacePath,
					scheme: "file",
					authority: "",
					path: workspacePath,
					toString: () => `file://${workspacePath}`,
				} as unknown as vscode.Uri)
			CodeIndexManager.instances.set(workspacePath, new CodeIndexManager(workspacePath, folderUri, context))
		}
		return CodeIndexManager.instances.get(workspacePath)!
	}

	public static getAllInstances(): CodeIndexManager[] {
		return Array.from(CodeIndexManager.instances.values())
	}

	public static disposeAll(): void {
		for (const instance of CodeIndexManager.instances.values()) {
			instance.dispose()
		}
		CodeIndexManager.instances.clear()
	}

	private readonly workspacePath: string
	private readonly _folderUri: vscode.Uri
	private readonly context: vscode.ExtensionContext

	// Private constructor for singleton pattern
	private constructor(workspacePath: string, folderUri: vscode.Uri, context: vscode.ExtensionContext) {
		this.workspacePath = workspacePath
		this._folderUri = folderUri
		this.context = context
		this._stateManager = new CodeIndexStateManager()
	}

	// --- Public API ---

	/**
	 * Returns the workspaceState key for per-folder indexing enablement,
	 * keyed by the real workspace folder URI so local/remote schemes cannot collide.
	 */
	private _workspaceEnabledKey(): string {
		return "codeIndexWorkspaceEnabled:" + this._folderUri.toString(true)
	}

	public get isWorkspaceEnabled(): boolean {
		const explicit = this.context.workspaceState.get<boolean | undefined>(this._workspaceEnabledKey(), undefined)
		if (explicit !== undefined) return explicit
		return this.autoEnableDefault
	}

	public async setWorkspaceEnabled(enabled: boolean): Promise<void> {
		await this.context.workspaceState.update(this._workspaceEnabledKey(), enabled)
	}

	public get autoEnableDefault(): boolean {
		return this.context.globalState.get("codeIndexAutoEnableDefault", true)
	}

	public async setAutoEnableDefault(enabled: boolean): Promise<void> {
		await this.context.globalState.update("codeIndexAutoEnableDefault", enabled)
	}

	public get onProgressUpdate() {
		return this._stateManager.onProgressUpdate
	}

	private assertInitialized() {
		if (this._sembleProvider) {
			// When semble is active, we don't need orchestrator/searchService
			return
		}
		if (!this._configManager || !this._orchestrator || !this._searchService || !this._cacheManager) {
			throw new Error("CodeIndexManager not initialized. Call initialize() first.")
		}
	}

	public get state(): IndexingState {
		if (!this.isFeatureEnabled) {
			return "Standby"
		}
		// Single source of truth: both the orchestrator and the SembleProvider
		// write to the shared state manager, so this can never diverge from
		// getCurrentStatus().systemStatus — and it never throws when the manager
		// has not been initialized yet.
		return this._stateManager.state
	}

	public get isFeatureEnabled(): boolean {
		return this._configManager?.isFeatureEnabled ?? false
	}

	public get isFeatureConfigured(): boolean {
		return this._configManager?.isFeatureConfigured ?? false
	}

	public get isInitialized(): boolean {
		try {
			this.assertInitialized()
			return true
		} catch (error) {
			return false
		}
	}

	/**
	 * Initializes the manager with configuration and dependent services.
	 * Must be called before using any other methods.
	 *
	 * Concurrent calls are coalesced onto a single in-flight run so rapid
	 * user actions (e.g. two "Start Indexing" clicks) cannot recreate the
	 * service stack or start indexing twice.
	 * @returns Object indicating if a restart is needed
	 */
	public async initialize(contextProxy: ContextProxy): Promise<{ requiresRestart: boolean }> {
		// Serialize concurrent initialize() calls onto one shared run.
		if (this._initializePromise) {
			return this._initializePromise
		}

		// Keep the ContextProxy around so handleSettingsChange() can lazily create
		// the config manager when this manager was never initialized.
		this._contextProxy = contextProxy

		this._initializePromise = this._initializeInternal()
		try {
			return await this._initializePromise
		} finally {
			this._initializePromise = undefined
		}
	}

	/**
	 * Internal initialization logic, executed under the shared in-flight guard.
	 */
	private async _initializeInternal(): Promise<{ requiresRestart: boolean }> {
		// 1. ConfigManager Initialization and Configuration Loading
		if (!this._configManager) {
			this._configManager = new CodeIndexConfigManager(this._contextProxy!)
		}
		// Load configuration once to get current state and restart requirements
		const { requiresRestart } = await this._configManager.loadConfiguration()

		// 2. Check if feature is enabled
		if (!this.isFeatureEnabled) {
			if (this._orchestrator) {
				this._orchestrator.stopWatcher()
			}
			if (this._sembleProvider) {
				this._sembleProvider.stopIndexing()
			}
			return { requiresRestart }
		}

		// 3. Check if workspace is available
		const workspacePath = this.workspacePath
		if (!workspacePath) {
			this._stateManager.setSystemState("Standby", "No workspace folder open")
			return { requiresRestart }
		}

		// 4. Check workspace-level enablement (before creating expensive services)
		if (!this.isWorkspaceEnabled) {
			this._stateManager.setSystemState("Standby", "Indexing not enabled for this workspace")
			return { requiresRestart }
		}

		// 5. CacheManager Initialization
		if (!this._cacheManager) {
			this._cacheManager = new CacheManager(this.context, this.workspacePath)
			await this._cacheManager.initialize()
		}

		// 6. Determine if Core Services Need Recreation
		const needsServiceRecreation =
			(!this._serviceFactory && !this._sembleProvider) || requiresRestart || !this._serviceStateMatchesConfig()

		if (needsServiceRecreation) {
			await this._recreateServices()
		}

		// 7. Handle Indexing Start/Restart
		if (this._sembleProvider) {
			// For semble, start indexing if needed
			const shouldStartIndexing = requiresRestart || needsServiceRecreation
			if (shouldStartIndexing) {
				await this._sembleProvider.startIndexing()
			}
		} else {
			const shouldStartOrRestartIndexing =
				requiresRestart ||
				(needsServiceRecreation && (!this._orchestrator || this._orchestrator.state !== "Indexing"))

			if (shouldStartOrRestartIndexing) {
				this._orchestrator?.startIndexing()
			}
		}

		return { requiresRestart }
	}

	/**
	 * Initiates the indexing process (initial scan and starts watcher).
	 * Automatically recovers from error state if needed before starting.
	 *
	 * @important This method should NEVER be awaited as it starts a long-running background process.
	 * The indexing will continue asynchronously and progress will be reported through events.
	 */
	public async startIndexing(): Promise<void> {
		if (!this.isFeatureEnabled || !this.isWorkspaceEnabled) {
			console.warn(
				`[CodeIndexManager] startIndexing short-circuit: enabled=${this.isFeatureEnabled}, workspaceEnabled=${this.isWorkspaceEnabled}, status=${JSON.stringify(this.getCurrentStatus())}`,
			)
			return
		}

		// Delegate to semble provider if active
		if (this._sembleProvider) {
			// A cached init failure (e.g. a transient download/network error) is
			// sticky by design so status polls don't re-run the slow download, but
			// an explicit user-initiated start must be able to retry. Reset the
			// provider so the download/validation pipeline runs again.
			if (this._stateManager.state === "Error") {
				this._sembleProvider.reset()
			}
			await this._sembleProvider.startIndexing()
			return
		}

		// Check if we're in error state and recover if needed
		const currentStatus = this.getCurrentStatus()
		if (currentStatus.systemStatus === "Error") {
			await this.recoverFromError()

			// After recovery, we need to reinitialize since recoverFromError clears all services
			// This will be handled by the caller (webviewMessageHandler) checking isInitialized
			return
		}

		this.assertInitialized()
		await this._orchestrator!.startIndexing()
	}

	/**
	 * Stops any in-progress indexing operation and the file watcher.
	 */
	public stopIndexing(): void {
		if (this._sembleProvider) {
			this._sembleProvider.stopIndexing()
			return
		}
		if (this._orchestrator) {
			this._orchestrator.stopIndexing()
		}
	}

	/**
	 * Stops the file watcher and potentially cleans up resources.
	 */
	public stopWatcher(): void {
		if (!this.isFeatureEnabled) {
			return
		}
		if (this._orchestrator) {
			this._orchestrator.stopWatcher()
		}
	}

	/**
	 * Recovers from error state by clearing the error and resetting internal state.
	 * This allows the manager to be re-initialized after a recoverable error.
	 *
	 * This method clears all service instances (configManager, serviceFactory, orchestrator, searchService)
	 * to force a complete re-initialization on the next operation. This ensures a clean slate
	 * after recovering from errors such as network failures or configuration issues.
	 *
	 * @remarks
	 * - Safe to call even when not in error state (idempotent)
	 * - Does not restart indexing automatically - call initialize() after recovery
	 * - Service instances will be recreated on next initialize() call
	 * - Prevents race conditions from multiple concurrent recovery attempts
	 */
	public async recoverFromError(): Promise<void> {
		// Prevent race conditions from multiple rapid recovery attempts
		if (this._isRecoveringFromError) {
			return
		}

		this._isRecoveringFromError = true
		try {
			// Clear error state
			this._stateManager.setSystemState("Standby", "")
		} catch (error) {
			// Log error but continue with recovery - clearing service instances is more important
			console.error("Failed to clear error state during recovery:", error)
		} finally {
			// Force re-initialization by clearing service instances
			// This ensures a clean slate even if state update failed
			this._configManager = undefined
			this._serviceFactory = undefined
			this._orchestrator = undefined
			this._searchService = undefined
			this._sembleProvider = undefined

			// Reset the flag after recovery is complete
			this._isRecoveringFromError = false
		}
	}

	/**
	 * Cleans up the manager instance.
	 */
	public dispose(): void {
		this.stopIndexing()
		if (this._sembleProvider) {
			this._sembleProvider.dispose()
			this._sembleProvider = undefined
		}
		this._stateManager.dispose()
	}

	/**
	 * Clears all index data by stopping the watcher, clearing the Qdrant collection,
	 * and deleting the cache file.
	 */
	public async clearIndexData(): Promise<void> {
		if (!this.isFeatureEnabled) {
			return
		}
		if (this._sembleProvider) {
			await this._sembleProvider.clearIndexData()
			return
		}
		this.assertInitialized()
		await this._orchestrator!.clearIndexData()
		await this._cacheManager!.clearCacheFile()
	}

	// --- Private Helpers ---

	public getCurrentStatus() {
		const status = this._stateManager.getCurrentStatus()
		return {
			...status,
			workspacePath: this.workspacePath,
			workspaceEnabled: this.isWorkspaceEnabled,
			autoEnableDefault: this.autoEnableDefault,
		}
	}

	public async searchIndex(query: string, directoryPrefix?: string): Promise<VectorStoreSearchResult[]> {
		if (!this.isFeatureEnabled) {
			return []
		}
		if (this._sembleProvider) {
			return this._sembleProvider.searchIndex(query, directoryPrefix)
		}
		this.assertInitialized()
		return this._searchService!.searchIndex(query, directoryPrefix)
	}

	/**
	 * Reconciliation check: does the currently active service set match the
	 * configured embedder provider? If the config says "semble" but no
	 * SembleProvider is active (or vice versa), services must be recreated.
	 */
	private _serviceStateMatchesConfig(): boolean {
		const provider = this._configManager?.currentEmbedderProvider
		if (provider === "semble") {
			return !!this._sembleProvider
		}
		return !this._sembleProvider && !!this._orchestrator && !!this._searchService
	}

	/**
	 * Private helper method to recreate services with current configuration.
	 * Used by both initialize() and handleSettingsChange().
	 */
	private async _recreateServices(): Promise<void> {
		// Stop watcher if it exists
		if (this._orchestrator) {
			this.stopWatcher()
		}
		// Dispose existing semble provider if switching away
		if (this._sembleProvider) {
			this._sembleProvider.dispose()
			this._sembleProvider = undefined
		}
		// Clear existing services to ensure clean state
		this._orchestrator = undefined
		this._searchService = undefined

		// Branch: if provider is "semble", create SembleProvider instead of external services
		if (this._configManager!.currentEmbedderProvider === "semble") {
			// Reference-aligned (Zoo-Code): do NOT forward searchMinScore /
			// searchMaxResults to the Semble provider. The Semble search path
			// applies no score filter and no result cap — those settings are
			// consumed only by the Qdrant path (search-service.ts / qdrant-client.ts).
			this._sembleProvider = new SembleProvider(this.workspacePath, this.context, this._stateManager, {
				binaryPath: this._configManager!.sembleBinaryPath,
			})
			await this._sembleProvider.initialize()
			return
		}

		// (Re)Initialize service factory for external providers
		this._serviceFactory = new CodeIndexServiceFactory(
			this._configManager!,
			this.workspacePath,
			this._cacheManager!,
		)

		const ignoreInstance = ignore()
		const workspacePath = this.workspacePath

		if (!workspacePath) {
			this._stateManager.setSystemState("Standby", "")
			return
		}

		// Create .gitignore instance
		const ignorePath = path.join(workspacePath, ".gitignore")
		try {
			const content = await fs.readFile(ignorePath, "utf8")
			ignoreInstance.add(content)
			ignoreInstance.add(".gitignore")
		} catch (error) {
			// Should never happen: reading file failed even though it exists
			console.error("Unexpected error loading .gitignore:", error)
			TelemetryService.instance.captureEvent(TelemetryEventName.CODE_INDEX_ERROR, {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				location: "_recreateServices",
			})
		}

		// Create RooIgnoreController instance
		const rooIgnoreController = new RooIgnoreController(workspacePath)
		await rooIgnoreController.initialize()

		// (Re)Create shared service instances
		const { embedder, vectorStore, scanner, fileWatcher } = this._serviceFactory.createServices(
			this.context,
			this._cacheManager!,
			ignoreInstance,
			rooIgnoreController,
		)

		// Validate embedder configuration before proceeding
		const validationResult = await this._serviceFactory.validateEmbedder(embedder)
		if (!validationResult.valid) {
			const errorMessage = validationResult.error || "Embedder configuration validation failed"
			this._stateManager.setSystemState("Error", errorMessage)
			throw new Error(errorMessage)
		}

		// (Re)Initialize orchestrator
		this._orchestrator = new CodeIndexOrchestrator(
			this._configManager!,
			this._stateManager,
			this.workspacePath,
			this._cacheManager!,
			vectorStore,
			scanner,
			fileWatcher,
		)

		// (Re)Initialize search service
		this._searchService = new CodeIndexSearchService(
			this._configManager!,
			this._stateManager,
			embedder,
			vectorStore,
		)

		// Clear any error state after successful recreation
		this._stateManager.setSystemState("Standby", "")
	}

	/**
	 * Handle code index settings changes.
	 * This method should be called when code index settings are updated
	 * to ensure the CodeIndexConfigManager picks up the new configuration.
	 * If the configuration changes require a restart, the service will be restarted.
	 *
	 * The config manager is created lazily when missing so a settings save always
	 * loads the current configuration — even if this manager was never initialized
	 * (e.g. a swallowed background init or a fresh remote session).
	 */
	public async handleSettingsChange(contextProxy?: ContextProxy): Promise<void> {
		if (!this._configManager) {
			const resolvedContextProxy = contextProxy ?? this._contextProxy
			if (!resolvedContextProxy) {
				console.error(
					"[CodeIndexManager] handleSettingsChange called without a ContextProxy; cannot load configuration.",
				)
				TelemetryService.instance.captureEvent(TelemetryEventName.CODE_INDEX_ERROR, {
					error: "handleSettingsChange called without a ContextProxy",
					location: "handleSettingsChange",
				})
				return
			}
			this._configManager = new CodeIndexConfigManager(resolvedContextProxy)
		}

		const { requiresRestart, configSnapshot, currentConfig } = await this._configManager.loadConfiguration()

		const isFeatureEnabled = this.isFeatureEnabled

		// If feature is disabled, stop the service (including any active scan)
		if (!isFeatureEnabled) {
			console.warn(
				`[CodeIndexManager] handleSettingsChange short-circuit: feature disabled. status=${JSON.stringify(this.getCurrentStatus())}`,
			)
			this.stopIndexing()
			this._stateManager.setSystemState("Standby", "Code indexing is disabled")
			return
		}

		// A provider change always forces service recreation — even when the new
		// provider is not yet configured — so stale providers (e.g. an old Semble
		// provider) are disposed and the UI reflects the actual embedder.
		const providerChanged = configSnapshot?.embedderProvider !== currentConfig?.embedderProvider

		if (requiresRestart || providerChanged) {
			try {
				// Ensure cacheManager is initialized before recreating services
				if (!this._cacheManager) {
					this._cacheManager = new CacheManager(this.context, this.workspacePath)
					await this._cacheManager.initialize()
				}

				// Recreate services with new configuration
				await this._recreateServices()
			} catch (error) {
				// Error state already set in _recreateServices
				console.error("Failed to recreate services:", error)
				TelemetryService.instance.captureEvent(TelemetryEventName.CODE_INDEX_ERROR, {
					error: error instanceof Error ? error.message : String(error),
					stack: error instanceof Error ? error.stack : undefined,
					location: "handleSettingsChange",
				})
				// Re-throw the error so the caller knows validation failed
				throw error
			}
		} else {
			console.warn(
				`[CodeIndexManager] handleSettingsChange no-op: no restart required and provider unchanged. status=${JSON.stringify(this.getCurrentStatus())}`,
			)
		}
	}
}
