import * as path from "path"
import * as vscode from "vscode"

import { IndexingState } from "../interfaces/manager"
import { VectorStoreSearchResult } from "../interfaces/vector-store"
import { CodeIndexStateManager } from "../state-manager"
import { SembleCLI, supportsMaxSnippetLinesFlag } from "./semble-cli"
import {
	downloadSemble,
	getInstalledSembleVersion,
	isSembleSupportedPlatform,
	SEMBLE_VERSION,
} from "./semble-downloader"
import { ISembleProvider, SembleConfig, SembleContentType, SembleSearchResult, SEMBLE_DEFAULTS } from "./types"
import { TelemetryService } from "@roo-code/telemetry"
import { TelemetryEventName } from "@roo-code/types"
import { t } from "../../../i18n"

/**
 * Orchestrates code search via the semble CLI.
 *
 * Semble indexes on-the-fly with each search call — there is no separate
 * "indexing" step. The provider automatically downloads the semble binary
 * on first use, then delegates search queries to `semble search`.
 *
 * When `embedderProvider === "semble"`, the CodeIndexManager delegates
 * to this provider instead of the ServiceFactory → orchestrator pipeline.
 */
export class SembleProvider implements ISembleProvider {
	private cli!: SembleCLI
	private readonly workspacePath: string
	private readonly config: SembleConfig
	private readonly stateManager: CodeIndexStateManager
	private readonly context: vscode.ExtensionContext

	private _isInitialized = false
	private _initFailed = false
	private _initPromise: Promise<void> | undefined
	/** The version actually installed on disk (from the .semble-version file), or SEMBLE_VERSION when unknown. */
	private _installedVersion: string | undefined
	/**
	 * Once-per-provider-instance guard for the raw score distribution log, so a
	 * single search session never spams the console with per-query noise.
	 */
	private _loggedRawScoreDistribution = false

	constructor(
		workspacePath: string,
		context: vscode.ExtensionContext,
		stateManager: CodeIndexStateManager,
		options?: {
			topK?: number
			content?: SembleContentType
			binaryPath?: string
			searchMinScore?: number
			searchMaxResults?: number
			maxSnippetLines?: number
		},
	) {
		this.workspacePath = workspacePath
		this.context = context
		this.stateManager = stateManager

		this.config = {
			topK: options?.topK ?? SEMBLE_DEFAULTS.DEFAULT_TOP_K,
			content: options?.content ?? SEMBLE_DEFAULTS.DEFAULT_CONTENT,
			binaryPath: options?.binaryPath,
			searchMinScore: options?.searchMinScore,
			searchMaxResults: options?.searchMaxResults,
			maxSnippetLines: options?.maxSnippetLines,
		}
	}

	get state(): IndexingState {
		// Single source of truth: the shared CodeIndexStateManager is the only
		// place system state lives, so this can never drift from the
		// CodeIndexManager's view (manager.state reads the same stateManager).
		return this.stateManager.state
	}

	/**
	 * Initializes the provider: downloads semble, then validates it works.
	 * Uses an _initPromise to prevent concurrent initialization races.
	 *
	 * Once initialization has completed (success OR failure) the result is
	 * cached, so repeated calls do not re-run the (potentially slow) download
	 * pipeline. Use {@link reset} to explicitly retry after a failure.
	 */
	async initialize(): Promise<void> {
		if (this._isInitialized) {
			return
		}

		// If initialization is already in progress, wait for it
		if (this._initPromise) {
			return this._initPromise
		}

		this._initPromise = this._doInitialize()
		try {
			await this._initPromise
		} finally {
			this._initPromise = undefined
		}
	}

	/**
	 * Internal initialization logic, called only once via _initPromise guard.
	 */
	private async _doInitialize(): Promise<void> {
		// Check platform support
		if (!isSembleSupportedPlatform()) {
			this._isInitialized = true
			this._initFailed = true
			this.stateManager.setSystemState(
				"Error",
				t("embeddings:semble.unsupportedPlatform", { platform: process.platform, arch: process.arch }),
			)
			console.error(`[SembleProvider] Unsupported platform: ${process.platform}-${process.arch}`)
			return
		}

		// Download semble binary
		try {
			this.stateManager.setSystemState("Indexing", t("embeddings:semble.downloadingBinary"))
			const storageDir = this.context.globalStorageUri.fsPath
			const binaryPath = await downloadSemble(storageDir, this.config.binaryPath)
			if (!binaryPath) {
				throw new Error("Download returned no path")
			}
			// Surface the actually-installed version (may differ from SEMBLE_VERSION
			// when the opt-in "latest" resolution resolves a newer tag). Fall back to
			// SEMBLE_VERSION when no version metadata exists (e.g. a manual
			// binaryPathOverride with no prior download).
			this._installedVersion = (await getInstalledSembleVersion(storageDir)) ?? SEMBLE_VERSION
			this.cli = new SembleCLI(binaryPath)
		} catch (error) {
			this._isInitialized = true
			this._initFailed = true
			// The fallback chain produces a multi-line error with per-source details.
			// Truncate to the first line for the UI status message, log full details.
			const errorMsg = error instanceof Error ? error.message : String(error)
			const displayMessage = errorMsg.split("\n")[0] || errorMsg
			this.stateManager.setSystemState(
				"Error",
				t("embeddings:semble.downloadFailed", { errorMessage: displayMessage }),
			)
			console.error("[SembleProvider] Download failed from all sources:", errorMsg)
			return
		}

		// Verify the binary works
		const checkResult = await this.cli.checkInstalled()

		if (!checkResult.installed) {
			const errorMsg = checkResult.error || "Semble binary is not functional"
			this._isInitialized = true
			this._initFailed = true
			this.stateManager.setSystemState("Error", t("embeddings:semble.checkFailed", { errorMessage: errorMsg }))
			console.error("[SembleProvider] Semble check failed:", errorMsg)
			return
		}

		console.log("[SembleProvider] Semble found and ready.")

		// Semble indexes on-the-fly, so we mark as "Indexed" (ready for search).
		// The version is included in the status message so the UI (CodeIndexPopover)
		// surfaces which semble release is active.
		this._initFailed = false
		this.stateManager.setSystemState("Indexed", this._readyMessage())

		this._isInitialized = true
	}

	/**
	 * Starts indexing. Since semble indexes on-the-fly with each search,
	 * this just validates the installation and marks as ready.
	 *
	 * If a previous initialization failed, the failure is cached and this
	 * returns immediately instead of re-running the full download pipeline.
	 */
	async startIndexing(): Promise<void> {
		if (this._initFailed) {
			return
		}

		if (!this._isInitialized) {
			await this.initialize()
		}

		if (this.state === "Error") {
			return
		}

		// Semble indexes on-the-fly — no separate indexing step needed.
		// Mark as indexed/ready.
		this.stateManager.setSystemState("Indexed", this._readyMessage())
	}

	/**
	 * Stops indexing (no-op — semble has no background indexing process).
	 */
	stopIndexing(): void {
		// No-op: semble indexes on-the-fly per search call
	}

	/**
	 * Searches the codebase using `semble search`.
	 *
	 * Always searches the full workspace root to avoid creating separate
	 * Semble cache directories for each subdirectory. When directoryPrefix
	 * is provided, results are filtered post-search to only include files
	 * within that directory.
	 */
	async searchIndex(query: string, directoryPrefix?: string): Promise<VectorStoreSearchResult[]> {
		if (!this._isInitialized) {
			console.warn("[SembleProvider] searchIndex called before initialization")
			return []
		}

		if (this.state === "Error") {
			return []
		}

		try {
			// Always search the full workspace to maintain a single Semble cache.
			// Semble creates a separate cache directory per path (SHA-256 of the
			// resolved absolute path), so passing subdirectories would create
			// redundant indexes and waste disk space.
			console.log(`[SembleProvider] Searching in ${this.workspacePath}`)

			// Reference-aligned (Zoo-Code SembleProvider): request exactly the
			// configured topK. NO min-score filter and NO max-results slice are
			// applied to Semble results — searchMinScore/searchMaxResults are
			// consumed ONLY by the Qdrant path (search-service.ts / qdrant-client.ts).
			// The 0.4 score filter this repo previously added (to "mirror the Qdrant
			// path") was the most likely cause of F1: recurring empty search results
			// whenever Semble's raw scores sat below the Qdrant-tuned threshold.
			//
			// Roo+ addition beyond the reference: bound the per-result snippet size
			// via --max-snippet-lines (defaulting to a sane cap) so each result
			// carries a small `content` payload instead of a full code chunk. This
			// is defensive hardening only — it does not change result-count
			// semantics (topK only).
			//
			// The flag is version-gated: only forwarded when the installed binary
			// advertises it (>= v0.4.1). Older binaries reject unknown flags, which
			// would fail every search loudly. Omitting it only means full-chunk
			// snippets, which _truncateSnippet caps defensively at MAX_SNIPPET_CHARS.
			const maxSnippetLines = supportsMaxSnippetLinesFlag(this._installedVersion)
				? (this.config.maxSnippetLines ?? SEMBLE_DEFAULTS.DEFAULT_MAX_SNIPPET_LINES)
				: undefined
			const results = await this.cli.search(query, this.workspacePath, {
				topK: this.config.topK,
				content: this.config.content,
				maxSnippetLines,
			})

			// One-time raw score diagnostics (Roo+ addition beyond the reference).
			// Semble's score semantics are undocumented in this repo. Log the RAW
			// CLI score distribution once per provider instance (first search with
			// results) so a scale mismatch is visible to a log scan / VSIX test.
			// Skipped when the CLI returned nothing (nothing to diagnose).
			if (!this._loggedRawScoreDistribution && results.length > 0) {
				this._loggedRawScoreDistribution = true
				console.log(
					`[SembleProvider] Raw score distribution (first search, before filtering): ${this._describeScoreDistribution(results)}`,
				)
			}

			// Semble returns file paths relative to the search path (workspace root).
			// We join against workspacePath to produce correct absolute paths.
			let converted = this._convertResults(results, this.workspacePath)

			// Filter results to the requested directory prefix, if any.
			if (directoryPrefix) {
				const normalizedPrefix = path.join(this.workspacePath, directoryPrefix).replace(/\\/g, "/")
				converted = converted.filter((r) => {
					const filePath = (r.payload?.filePath ?? "").replace(/\\/g, "/")
					return filePath.startsWith(normalizedPrefix + "/") || filePath === normalizedPrefix
				})
				console.log(
					`[SembleProvider] Filtered to "${directoryPrefix}": ${converted.length} of ${results.length} results`,
				)
			}

			// NOTE: searchMinScore/searchMaxResults are intentionally NOT applied
			// here. They are consumed only by the Qdrant path (search-service.ts /
			// qdrant-client.ts); the reference Zoo-Code SembleProvider applies no
			// score filter and no result cap to Semble results.

			console.log(
				`[SembleProvider] Search returned ${converted.length} results (raw: ${results.length}). Sample path: ${converted[0]?.payload?.filePath ?? "none"}`,
			)
			return converted
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			console.error("[SembleProvider] Search failed:", errorMessage)

			TelemetryService.instance.captureEvent(TelemetryEventName.CODE_INDEX_ERROR, {
				error: errorMessage,
				stack: error instanceof Error ? error.stack : undefined,
				location: "SembleProvider.searchIndex",
			})

			// A genuine search failure must not be masked as an empty result — the
			// agent tool would otherwise report "no relevant snippets" and the UI
			// would stay "Indexed". Surface the error to the caller (CodebaseSearchTool)
			// by throwing for THIS call.
			//
			// R2: a single transient search failure (e.g. the first search
			// downloading the HuggingFace embedding model past the 120s timeout)
			// must NOT flip the shared state to a permanent "Error" — that would
			// brick every subsequent search until a manual reset. Keep the state
			// "Indexed" (the installation/index is healthy; only this call failed)
			// so the next search proceeds normally. "Error" is reserved for
			// install-time failures (unsupported platform / download / checkInstalled).
			throw error
		}
	}

	/**
	 * Clears index data. Semble manages its own cache at ~/Library/Caches/semble/
	 * (or equivalent per-platform). This resets the provider state but does not
	 * delete semble's on-disk cache — use `semble clear-cache` for that.
	 */
	async clearIndexData(): Promise<void> {
		this.stateManager.setSystemState("Standby", t("embeddings:semble.providerReset"))
	}

	/**
	 * Explicit retry path: clears the cached initialization/failure state so a
	 * subsequent initialize() re-runs the download/validation pipeline. Use this
	 * instead of silent re-attempts — e.g. after the user fixes the network and
	 * clicks a "Reset/Retry Semble" action.
	 */
	reset(): void {
		this._isInitialized = false
		this._initFailed = false
		this._initPromise = undefined
		// Reflect the reset in the shared state without firing a progress event,
		// so the UI doesn't flash a transient "Standby" before the retried
		// initialize() re-runs the download/validation pipeline.
		this.stateManager.setSystemStateSilent("Standby")
	}

	/**
	 * Disposes resources.
	 */
	dispose(): void {
		this._isInitialized = false
		// Terminate any in-flight semble child process (search/check). Without
		// this, disposal on manager teardown or a provider switch
		// (_recreateServices) would leave an orphaned child running for up to
		// its 120s timeout, consuming memory/CPU and holding file descriptors
		// in the extension host. Safe no-op when the CLI hasn't been created
		// yet (e.g. dispose during initialization) or no child is active.
		this.cli?.abort()
	}

	// --- Private Helpers ---

	/**
	 * Builds the "Indexed" status message.
	 *
	 * Appends an explicit cold-start hint (R3/R4): the first `semble search` may
	 * download the HuggingFace embedding model and can take a while. Surfacing
	 * this as part of the ready message — a non-Error state — means a slow cold
	 * start is not misreported as a broken index, and the UI (CodeIndexPopover)
	 * explains why the first search is slow.
	 */
	private _readyMessage(): string {
		return `${t("embeddings:semble.ready", { version: this._installedVersion ?? SEMBLE_VERSION })} ${t(
			"embeddings:semble.firstSearchDownloadsModel",
		)}`
	}

	/**
	 * Converts Semble CLI results to Zoo's VectorStoreSearchResult format.
	 *
	 * Semble v0.4.0+ returns results in a flat format (no `chunk` wrapper):
	 *   { file_path, start_line, end_line, score, content }
	 *
	 * Note: semble returns file paths relative to the path it was invoked with.
	 * We join against `basePath` (the actual path passed to semble) to produce
	 * correct absolute paths for the rest of the pipeline.
	 * Results with missing file paths or paths that escape the workspace are excluded.
	 */
	private _convertResults(results: SembleSearchResult[], basePath: string): VectorStoreSearchResult[] {
		// Resolve basePath to an absolute canonical form for the traversal check.
		const resolvedBase = path.resolve(basePath).replace(/\\/g, "/")

		const converted: VectorStoreSearchResult[] = []

		for (const [index, r] of results.entries()) {
			if (!r.file_path) {
				continue
			}

			// Use path.join for the displayed path (preserves basePath format).
			const filePath = path.join(basePath, r.file_path).replace(/\\/g, "/")

			// Use path.resolve to normalize any ../ for the security check.
			const resolvedFilePath = path.resolve(basePath, r.file_path).replace(/\\/g, "/")

			// Guard against path traversal: reject file paths that resolve outside the workspace
			if (!resolvedFilePath.startsWith(resolvedBase + "/") && resolvedFilePath !== resolvedBase) {
				continue
			}

			converted.push({
				id: `semble-${index}`,
				score: r.score,
				payload: {
					filePath,
					codeChunk: this._truncateSnippet(r.content),
					startLine: r.start_line ?? 0,
					endLine: r.end_line ?? 0,
				},
			})
		}

		return converted
	}

	/**
	 * Bounds a single snippet to SEMBLE_DEFAULTS.MAX_SNIPPET_CHARS characters.
	 *
	 * This is the defensive hard cap that guarantees a single search can never
	 * return unbounded snippet content, independent of the `--max-snippet-lines`
	 * CLI flag. It stays a ceiling: typical short snippets pass through
	 * unchanged, and only oversized chunks are cut.
	 */
	private _truncateSnippet(content?: string): string {
		if (!content) {
			return ""
		}
		return content.length > SEMBLE_DEFAULTS.MAX_SNIPPET_CHARS
			? content.slice(0, SEMBLE_DEFAULTS.MAX_SNIPPET_CHARS)
			: content
	}

	/**
	 * Builds a compact, cheap description of a raw score distribution: count,
	 * min, max, and a percentile sketch (p25 / median / p75) of the numeric
	 * scores. Used by the once-per-session raw score diagnostics (Roo+ addition
	 * beyond the reference). Runs on the CLI result set (bounded by topK), so
	 * the O(n log n) sort is negligible.
	 */
	private _describeScoreDistribution(results: SembleSearchResult[]): string {
		const scores = results
			.map((r) => r.score)
			.filter((s): s is number => typeof s === "number" && Number.isFinite(s))
			.sort((a, b) => a - b)

		if (scores.length === 0) {
			return "count=0 (no numeric scores)"
		}

		const percentile = (p: number): number => {
			const index = Math.min(scores.length - 1, Math.floor((p / 100) * scores.length))
			return scores[index]
		}

		return `count=${scores.length} min=${scores[0]} p25=${percentile(25)} median=${percentile(50)} p75=${percentile(75)} max=${scores[scores.length - 1]}`
	}
}
