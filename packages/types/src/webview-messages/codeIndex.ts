import { z } from "zod"

/**
 * Code-index domain messages.
 *
 * The webview drives codebase indexing through the `CodeIndexPopover`:
 * start/stop/clear indexing, request live status, toggle workspace indexing,
 * set the auto-enable default, query secret presence, and atomically persist
 * the full codebase-index settings object (global-state settings + secrets).
 *
 * Registered so crafted payloads (e.g. a `saveCodeIndexSettingsAtomic` missing
 * `codebaseIndexEnabled`, an invalid `codebaseIndexEmbedderProvider` enum, or a
 * non-string secret) are rejected at the boundary and in the handler before any
 * global-state or secret write. Every field below is a string/boolean/number/
 * enum — never `z.unknown()`.
 */

/**
 * The full codebase-index settings payload sent by
 * `webview-ui/src/components/chat/CodeIndexPopover.tsx` on
 * `saveCodeIndexSettingsAtomic`. Faithfully mirrors the inline
 * `codeIndexSettings` object on the `WebviewMessage` interface: the four
 * global-state fields the handler reads unconditionally are REQUIRED (every
 * sender provides them), the rest are optional and passed through as-is.
 */
export const codeIndexSettingsSchema = z.object({
	// Global state settings
	codebaseIndexEnabled: z.boolean(),
	codebaseIndexQdrantUrl: z.string(),
	codebaseIndexEmbedderProvider: z.enum([
		"openai",
		"ollama",
		"openai-compatible",
		"gemini",
		"mistral",
		"vercel-ai-gateway",
		"bedrock",
		"openrouter",
		"semble",
	]),
	codebaseIndexEmbedderBaseUrl: z.string().optional(),
	codebaseIndexEmbedderModelId: z.string(),
	codebaseIndexEmbedderModelDimension: z.number().optional(), // Generic dimension for all providers
	codebaseIndexOpenAiCompatibleBaseUrl: z.string().optional(),
	codebaseIndexBedrockRegion: z.string().optional(),
	codebaseIndexBedrockProfile: z.string().optional(),
	codebaseIndexSearchMaxResults: z.number().optional(),
	codebaseIndexSearchMinScore: z.number().optional(),
	codebaseIndexOpenRouterSpecificProvider: z.string().optional(), // OpenRouter provider routing
	codebaseIndexSembleBinaryPath: z.string().optional(), // Semble binary path override

	// Secret settings
	codeIndexOpenAiKey: z.string().optional(),
	codeIndexQdrantApiKey: z.string().optional(),
	codebaseIndexOpenAiCompatibleApiKey: z.string().optional(),
	codebaseIndexGeminiApiKey: z.string().optional(),
	codebaseIndexMistralApiKey: z.string().optional(),
	codebaseIndexVercelAiGatewayApiKey: z.string().optional(),
	codebaseIndexOpenRouterApiKey: z.string().optional(),
})

export type CodeIndexSettings = z.infer<typeof codeIndexSettingsSchema>

/** Clear all indexed data for the current workspace (empty payload). */
export const clearIndexDataMessageSchema = z.object({
	type: z.literal("clearIndexData"),
})

/** Request whether the code-index secrets are set (empty payload). */
export const requestCodeIndexSecretStatusMessageSchema = z.object({
	type: z.literal("requestCodeIndexSecretStatus"),
})

/** Request the current indexing status (empty payload). */
export const requestIndexingStatusMessageSchema = z.object({
	type: z.literal("requestIndexingStatus"),
})

/** Atomically persist the full code-index settings object (settings REQUIRED). */
export const saveCodeIndexSettingsAtomicMessageSchema = z.object({
	type: z.literal("saveCodeIndexSettingsAtomic"),
	codeIndexSettings: codeIndexSettingsSchema,
})

/** Set whether indexing auto-enables on workspace open (`bool ?? true`). */
export const setAutoEnableDefaultMessageSchema = z.object({
	type: z.literal("setAutoEnableDefault"),
	bool: z.boolean().optional(),
})

/** Start indexing the current workspace (empty payload). */
export const startIndexingMessageSchema = z.object({
	type: z.literal("startIndexing"),
})

/** Stop indexing the current workspace (empty payload). */
export const stopIndexingMessageSchema = z.object({
	type: z.literal("stopIndexing"),
})

/** Toggle workspace indexing for the current workspace (`bool ?? false`). */
export const toggleWorkspaceIndexingMessageSchema = z.object({
	type: z.literal("toggleWorkspaceIndexing"),
	bool: z.boolean().optional(),
})

/** Discriminated union of the code-index domain's fully-typed messages. */
export const codeIndexMessageSchema = z.discriminatedUnion("type", [
	clearIndexDataMessageSchema,
	requestCodeIndexSecretStatusMessageSchema,
	requestIndexingStatusMessageSchema,
	saveCodeIndexSettingsAtomicMessageSchema,
	setAutoEnableDefaultMessageSchema,
	startIndexingMessageSchema,
	stopIndexingMessageSchema,
	toggleWorkspaceIndexingMessageSchema,
])

export type CodeIndexMessage = z.infer<typeof codeIndexMessageSchema>
