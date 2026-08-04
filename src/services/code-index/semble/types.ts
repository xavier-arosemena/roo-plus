import { IndexingState } from "../interfaces/manager"
import { VectorStoreSearchResult } from "../interfaces/vector-store"

/**
 * Content types supported by semble for indexing.
 * Maps to the `--content` CLI flag.
 */
export type SembleContentType = "code" | "docs" | "config" | "all"

/**
 * A single search result returned by semble v0.4.0+.
 *
 * As of v0.4.0, semble flattened its JSON output — the fields that were
 * previously nested under a `chunk` object are now top-level on each result
 * entry. The `language` and `location` fields are no longer emitted.
 *
 * Output format:
 *   { "query": "...", "results": [{ "file_path": "...", "start_line": N, "end_line": M, "score": X, "content": "..." }] }
 *
 * `content` is omitted when semble is invoked with `--max-snippet-lines 0`.
 */
export interface SembleSearchResult {
	file_path: string
	start_line: number
	end_line: number
	score: number
	content?: string
}

/**
 * Result from checking if semble is functional.
 */
export interface SembleCheckResult {
	installed: boolean
	error?: string
}

/**
 * Configuration for the Semble provider.
 */
export interface SembleConfig {
	/** Maximum search results to return. Default: 10. */
	topK: number
	/** Content types to index. Default: "code". */
	content: SembleContentType
	/** Optional path to a manually installed semble binary. When set, auto-download is skipped. */
	binaryPath?: string
	/**
	 * Minimum similarity score (0-1). KEPT for API stability / future providers
	 * — NOT applied by the Semble search path, which (matching the reference
	 * Zoo-Code provider) applies no score filter. Consumed only by the Qdrant
	 * path (`codebaseIndexSearchMinScore`).
	 */
	searchMinScore?: number
	/**
	 * Maximum number of results. KEPT for API stability / future providers —
	 * NOT applied by the Semble search path, which (matching the reference
	 * Zoo-Code provider) applies no result cap. Consumed only by the Qdrant
	 * path (`codebaseIndexSearchMaxResults`).
	 */
	searchMaxResults?: number
	/**
	 * Maximum number of snippet lines per result passed to the CLI via
	 * `--max-snippet-lines`. Bounds the size of each `content` payload so a
	 * single search never floods the agent context. Defaults to
	 * `SEMBLE_DEFAULTS.DEFAULT_MAX_SNIPPET_LINES`. Independent of the
	 * result-count semantics (`topK` / `searchMaxResults`).
	 */
	maxSnippetLines?: number
}

/**
 * Interface for the SembleProvider that wraps the semble CLI.
 */
export interface ISembleProvider {
	/** Initializes the provider — checks semble is installed. */
	initialize(): Promise<void>

	/** Marks the provider as ready (semble indexes on-the-fly). */
	startIndexing(): Promise<void>

	/** Stops indexing (no-op — semble has no background process). */
	stopIndexing(): void

	/** Searches the codebase for relevant code. */
	searchIndex(query: string, directoryPrefix?: string): Promise<VectorStoreSearchResult[]>

	/** Clears index data (no-op in current version). */
	clearIndexData(): Promise<void>

	/** Disposes resources. */
	dispose(): void

	/** Current state. */
	readonly state: IndexingState
}

/**
 * Default configuration values for Semble.
 */
export const SEMBLE_DEFAULTS = {
	DEFAULT_TOP_K: 10,
	DEFAULT_CONTENT: "code" as SembleContentType,
	/**
	 * Default `--max-snippet-lines` value passed to `semble search`. Keeps
	 * per-result snippets useful (~150 lines) without flooding the agent
	 * context (Roo+ addition beyond the reference provider).
	 */
	DEFAULT_MAX_SNIPPET_LINES: 150,
	/**
	 * Defensive hard cap on the character length of a single `codeChunk`.
	 * Applied in the provider regardless of the CLI flag so a single search
	 * can never return unbounded snippet content (e.g. if the CLI ignores
	 * `--max-snippet-lines` or an older binary returns full chunks).
	 */
	MAX_SNIPPET_CHARS: 4000,
}
