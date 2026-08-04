/**
 * Shared types for the code index manager.
 *
 * The `ICodeIndexManager` interface was previously declared here but nothing
 * implemented or referenced it — it only documented a stale `searchIndex`
 * contract (`limit: number`) that the runtime never honored. It has been
 * removed as dead code; the concrete `CodeIndexManager` and its collaborators
 * are the source of truth for the manager's public API.
 */

export type IndexingState = "Standby" | "Indexing" | "Indexed" | "Error" | "Stopping"
export type EmbedderProvider =
	| "openai"
	| "ollama"
	| "openai-compatible"
	| "gemini"
	| "mistral"
	| "vercel-ai-gateway"
	| "bedrock"
	| "openrouter"
	| "semble"

export interface IndexProgressUpdate {
	systemStatus: IndexingState
	message?: string
	processedBlockCount?: number
	totalBlockCount?: number
}
