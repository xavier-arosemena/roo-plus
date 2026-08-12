import { z } from "zod"

import { organizationAllowListSchema } from "../cloud.js"
import { gitCommitSchema } from "../git.js"
import { historyItemSchema } from "../history.js"
import { mcpServerSchema } from "../mcp.js"
import { providerSettingsEntrySchema } from "../provider-settings.js"

/**
 * Outbound task/chat/history response message schemas (Phase 2, Domain 3).
 *
 * These are the extension→webview|CLI messages that carry task/chat/history
 * responses back to the webview: commit/file search results
 * (`commitSearchResults`, `fileSearchResults`), provider-profile and MCP
 * listings (`listApiConfig`, `mcpServers`), message-edit dialogs
 * (`showDeleteMessageDialog`, `showEditMessageDialog`), command/mode/upsell
 * state pushes (`commands`, `modes`, `dismissedUpsells`), textarea/custom-tool
 * replies (`insertTextIntoTextarea`, `customToolsResult`), the aggregated-costs
 * response (`taskWithAggregatedCosts`), the OpenAI Codex rate-limit response
 * (`openAiCodexRateLimits`), the interaction-required ping
 * (`interactionRequired`) and the vestigial `organizationSwitchResult`.
 *
 * Every schema uses a `z.literal("type")` discriminator and reuses the existing
 * typed payload schemas (`historyItemSchema`, `gitCommitSchema`,
 * `mcpServerSchema`, `providerSettingsEntrySchema`, `organizationAllowListSchema`)
 * so the boundary validates the real shapes instead of an opaque
 * `payload`/`values` bag. The flat `ExtensionMessage` interface in
 * `packages/types/src/vscode-extension-host.ts` is the single source of truth
 * for the `type` union; these schemas mirror its payload fields plus the fields
 * the webview consumers actually read (zod strips unknown keys, so a field the
 * consumer reads MUST be in the schema).
 */

/**
 * `Command` = `{ name, source: "global"|"project"|"built-in", filePath?,
 * description?, argumentHint? }` — a type-only interface on
 * `vscode-extension-host.ts`. Modeled structurally here (no shared schema
 * exists); used by the `commands` message.
 */
export const commandSchema = z.object({
	name: z.string(),
	source: z.enum(["global", "project", "built-in"]),
	filePath: z.string().optional(),
	description: z.string().optional(),
	argumentHint: z.string().optional(),
})

/**
 * One `fileSearchResults.results` entry = `{ path, type: "file"|"folder",
 * label? }` (mirrors the interface's `results` union member).
 */
export const fileSearchResultSchema = z.object({
	path: z.string(),
	type: z.enum(["file", "folder"]),
	label: z.string().optional(),
})

/**
 * `SerializedCustomToolDefinition` = `{ name, description, parameters?,
 * source? }` — a type-only interface in `custom-tool.ts`. `parameters` is an
 * open JSON-Schema document (`z.core.JSONSchema.JSONSchema`); the webview
 * consumer only reads `properties`/`required`, so it is modeled as a
 * passthrough object that retains the full JSON-Schema keys while type-checking
 * the known ones (transitional; a precise JSON-Schema type is out of scope for
 * the message boundary).
 */
export const serializedCustomToolDefinitionSchema = z.object({
	name: z.string(),
	description: z.string(),
	parameters: z
		.object({
			type: z.string().optional(),
			properties: z.record(z.string(), z.unknown()).optional(),
			required: z.array(z.string()).optional(),
		})
		.passthrough()
		.optional(),
	source: z.string().optional(),
})

/**
 * `OpenAiCodexRateLimitInfo` — a type-only interface in
 * `providers/openai-codex-rate-limits.ts` (no shared schema exists). Modeled
 * structurally mirroring the interface; used by the `openAiCodexRateLimits`
 * message, which drains the flat interface's `values?: any` escape for this
 * type.
 */
export const openAiCodexRateLimitInfoSchema = z.object({
	primary: z
		.object({
			usedPercent: z.number(),
			windowMinutes: z.number().optional(),
			resetsAt: z.number().optional(),
		})
		.optional(),
	secondary: z
		.object({
			usedPercent: z.number(),
			windowMinutes: z.number().optional(),
			resetsAt: z.number().optional(),
		})
		.optional(),
	credits: z
		.object({
			hasCredits: z.boolean(),
			unlimited: z.boolean(),
			balance: z.string().optional(),
		})
		.optional(),
	planType: z.string().optional(),
	fetchedAt: z.number(),
})

/**
 * `aggregatedCosts` payload for `taskWithAggregatedCosts`
 * (`{ totalCost, ownCost, childrenCost }`, all numbers).
 */
export const aggregatedCostsSchema = z.object({
	totalCost: z.number(),
	ownCost: z.number(),
	childrenCost: z.number(),
})

/**
 * Git commit search results (`commitSearchResults`).
 *
 * The producer (`src/core/webview/handlers/task.ts`, `searchCommits` handler)
 * posts `{ type, commits }` with full `GitCommit[]` objects from
 * `searchCommits`; the webview (`ChatTextArea.tsx`) reads `message.commits`
 * (hash/shortHash/subject/author/date).
 */
export const commitSearchResultsMessageSchema = z.object({
	type: z.literal("commitSearchResults"),
	commits: z.array(gitCommitSchema),
})

/**
 * Workspace file search results (`fileSearchResults`).
 *
 * The producer (`src/core/webview/handlers/misc.ts`, `searchFiles` handler)
 * posts `results` plus `requestId` and (on failure) `error`; the webview
 * (`ChatTextArea.tsx`) reads `message.requestId` (to match the in-flight
 * request) and `message.results` — zod strips unknown keys, so all three are
 * part of the schema.
 */
export const fileSearchResultsMessageSchema = z.object({
	type: z.literal("fileSearchResults"),
	results: z.array(fileSearchResultSchema),
	requestId: z.string().optional(),
	error: z.string().optional(),
})

/**
 * API configuration profile listing (`listApiConfig`).
 *
 * Producers (`src/core/webview/handlers/misc.ts` on webview launch and
 * `providerProfiles.ts` on `getListApiConfiguration`) post
 * `{ type, listApiConfig }`; the webview (`ExtensionStateContext.tsx`) reads
 * `message.listApiConfig`.
 */
export const listApiConfigMessageSchema = z.object({
	type: z.literal("listApiConfig"),
	listApiConfig: z.array(providerSettingsEntrySchema),
})

/**
 * MCP server list push (`mcpServers`).
 *
 * Producers (`src/services/mcp/McpHub.ts` and `src/core/webview/handlers/misc.ts`
 * on webview launch) post `{ type, mcpServers }`; the webview
 * (`ExtensionStateContext.tsx`) reads `message.mcpServers`.
 */
export const mcpServersMessageSchema = z.object({
	type: z.literal("mcpServers"),
	mcpServers: z.array(mcpServerSchema),
})

/**
 * Show the message-delete confirmation dialog (`showDeleteMessageDialog`).
 *
 * The producer (`src/core/webview/handlers/chat.ts`) posts
 * `{ type, messageTs, hasCheckpoint }`; the webview (`App.tsx`) reads
 * `message.messageTs` and `message.hasCheckpoint`.
 */
export const showDeleteMessageDialogMessageSchema = z.object({
	type: z.literal("showDeleteMessageDialog"),
	messageTs: z.number(),
	hasCheckpoint: z.boolean().optional(),
})

/**
 * Show the message-edit confirmation dialog (`showEditMessageDialog`).
 *
 * The producer (`src/core/webview/handlers/chat.ts`, `handleEditOperation`)
 * posts `{ type, messageTs, text, hasCheckpoint, images }`; the webview
 * (`App.tsx`) reads `message.messageTs`, `message.text`, `message.hasCheckpoint`
 * and `message.images`. All four payload fields are part of the schema so none
 * is stripped by zod.
 */
export const showEditMessageDialogMessageSchema = z.object({
	type: z.literal("showEditMessageDialog"),
	messageTs: z.number(),
	text: z.string().optional(),
	hasCheckpoint: z.boolean().optional(),
	images: z.array(z.string()).optional(),
})

/**
 * Discovered commands listing (`commands`).
 *
 * Producers (`src/core/webview/handlers/commands.ts`) post
 * `{ type, commands }`; the webview (`ExtensionStateContext.tsx`) reads
 * `message.commands`.
 */
export const commandsMessageSchema = z.object({
	type: z.literal("commands"),
	commands: z.array(commandSchema),
})

/**
 * Insert text into the chat textarea (`insertTextIntoTextarea`).
 *
 * The producer (`src/core/webview/handlers/misc.ts`, `insertTextIntoTextarea`
 * handler — it only posts when `text` is truthy) sends `{ type, text }`; the
 * webview (`ChatTextArea.tsx`) reads `message.text`. `text` stays optional to
 * mirror the flat interface and the consumer's truthiness guard.
 *
 * Direction-mixed: `insertTextIntoTextarea` is a member of BOTH the inbound
 * `WebviewMessage` union (where the webview asks the extension to insert text)
 * and the outbound `ExtensionMessage` union (where the extension echoes it back
 * after validation). The schema name collides with the inbound
 * `insertTextIntoTextareaMessageSchema` in `packages/types/src/index.ts` and is
 * disambiguated there in favor of the inbound schema (the `CodeIndexMessage`
 * precedent); this outbound variant remains available directly from
 * `./extension-messages/index.js`.
 */
export const insertTextIntoTextareaMessageSchema = z.object({
	type: z.literal("insertTextIntoTextarea"),
	text: z.string().optional(),
})

/**
 * Dismissed-upsell list push (`dismissedUpsells`).
 *
 * Producers (`src/core/webview/handlers/misc.ts`, `dismissUpsell` and
 * `getDismissedUpsells` handlers) post `{ type, list }`; the webview reads
 * `message.list` (via the `state` handler's `dismissedUpsells` merge).
 */
export const dismissedUpsellsMessageSchema = z.object({
	type: z.literal("dismissedUpsells"),
	list: z.array(z.string()),
})

/**
 * Custom-tool list response (`customToolsResult`).
 *
 * The producer (`src/core/webview/handlers/misc.ts`, `refreshCustomTools`
 * handler) posts `{ type, tools }` or `{ type, tools: [], error }` on failure;
 * the webview (`CustomToolsSettings.tsx`) reads `message.tools` and
 * `message.error`.
 */
export const customToolsResultMessageSchema = z.object({
	type: z.literal("customToolsResult"),
	tools: z.array(serializedCustomToolDefinitionSchema),
	error: z.string().optional(),
})

/**
 * Custom-modes listing (`modes`) — a plain `{ slug, name }[]`.
 *
 * The producer (`src/core/webview/handlers/misc.ts`, `requestModes` handler)
 * posts `{ type, modes }`; the webview reads `message.modes`.
 */
export const modesMessageSchema = z.object({
	type: z.literal("modes"),
	modes: z.array(
		z.object({
			slug: z.string(),
			name: z.string(),
		}),
	),
})

/**
 * Task aggregated-costs response (`taskWithAggregatedCosts`).
 *
 * The producer (`src/core/webview/handlers/task.ts`, `getTaskWithAggregatedCosts`
 * handler) posts `{ type, text, historyItem, aggregatedCosts }` on success or
 * `{ type, text, error }` on failure; the webview (`ChatView.tsx`) reads
 * `message.text` + `message.aggregatedCosts` (storing them keyed by taskId).
 */
export const taskWithAggregatedCostsMessageSchema = z.object({
	type: z.literal("taskWithAggregatedCosts"),
	text: z.string(),
	historyItem: historyItemSchema.optional(),
	aggregatedCosts: aggregatedCostsSchema.optional(),
	error: z.string().optional(),
})

/**
 * OpenAI Codex rate-limit info response (`openAiCodexRateLimits`).
 *
 * The producer (`src/core/webview/handlers/providerProfiles.ts`,
 * `requestOpenAiCodexRateLimits` handler) posts either
 * `{ type, values }` (success) or `{ type, error }` (failure); the webview
 * (`OpenAICodexRateLimitDashboard.tsx`) reads `message.values` / `message.error`.
 *
 * Mirrors the dedicated `OpenAiCodexRateLimitsMessage` interface on
 * `vscode-extension-host.ts` (`{ type, values?: OpenAiCodexRateLimitInfo,
 * error?: string }`) and drains its `values?: any` escape by typing the payload
 * precisely.
 */
export const openAiCodexRateLimitsMessageSchema = z.object({
	type: z.literal("openAiCodexRateLimits"),
	values: openAiCodexRateLimitInfoSchema.optional(),
	error: z.string().optional(),
})

/**
 * Interaction-required notification (`interactionRequired`).
 *
 * The producer (`src/core/task/Task.ts`) posts `{ type: "interactionRequired" }`
 * with NO payload; the webview (`ChatView.tsx`) plays a notification sound.
 */
export const interactionRequiredMessageSchema = z.object({
	type: z.literal("interactionRequired"),
})

/**
 * Organization-switch result (`organizationSwitchResult`).
 *
 * Vestigial: this type has NO producer anywhere in `src/`, `apps/cli/` or
 * `webview-ui/`. The flat `ExtensionMessage` interface carries
 * `organizationId?: string | null`, `organizationAllowList?`,
 * `success?: boolean` and `error?: string` for it, so those are included as
 * optional fields per the interface; actual outbound traffic is
 * expected/vestigial (Roo Code Cloud is deprecated). Registered because the
 * union is the source of truth and the ratchet demands every member be
 * registered.
 */
export const organizationSwitchResultMessageSchema = z.object({
	type: z.literal("organizationSwitchResult"),
	organizationId: z.string().nullable().optional(),
	organizationAllowList: organizationAllowListSchema.optional(),
	success: z.boolean().optional(),
	error: z.string().optional(),
})

/** Discriminated union of the outbound task/chat/history domain's fully-typed messages. */
export const taskResponsesMessageSchema = z.discriminatedUnion("type", [
	commitSearchResultsMessageSchema,
	fileSearchResultsMessageSchema,
	listApiConfigMessageSchema,
	mcpServersMessageSchema,
	showDeleteMessageDialogMessageSchema,
	showEditMessageDialogMessageSchema,
	commandsMessageSchema,
	insertTextIntoTextareaMessageSchema,
	dismissedUpsellsMessageSchema,
	customToolsResultMessageSchema,
	modesMessageSchema,
	taskWithAggregatedCostsMessageSchema,
	openAiCodexRateLimitsMessageSchema,
	interactionRequiredMessageSchema,
	organizationSwitchResultMessageSchema,
])

export type TaskResponsesMessage = z.infer<typeof taskResponsesMessageSchema>
