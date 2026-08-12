import { z } from "zod"

import { organizationAllowListSchema } from "../cloud.js"
import { modelInfoSchema } from "../model.js"

/**
 * Outbound model/status response message schemas (Phase 2, Domain 2).
 *
 * These are the extension→webview|CLI messages that carry model-list/status
 * payloads back to the settings UI (`routerModels`, `ollamaModels`,
 * `lmStudioModels`, `vsCodeLmModels`, `openAiModels`,
 * `singleRouterModelFetchResponse`, …), system-prompt responses
 * (`systemPrompt`, `enhancedPrompt`), VS Code terminal/settings reads
 * (`terminalProfiles`, `vsCodeSetting`) and the vestigial auth/availability
 * notifications (`vsCodeLmApiAvailable`, `authenticatedUser`).
 *
 * Every schema uses a `z.literal("type")` discriminator and reuses the existing
 * typed payload schemas where one exists (`modelInfoSchema`, …). The flat
 * `ExtensionMessage` interface in `packages/types/src/vscode-extension-host.ts`
 * is the single source of truth for the `type` union; these schemas mirror its
 * payload fields so the boundary validates the real shapes instead of an opaque
 * `payload`/`values` bag.
 */

/**
 * `ModelRecord` = `Record<string, ModelInfo>` (type-only in `packages/types/src/model.ts`).
 * `modelInfoSchema` exists in the same module and is what `ModelInfo` is inferred
 * from. The record is modeled with `z.record(z.string(), ...)` over a PARTIAL,
 * passthrough `ModelInfo`: the provider fetchers are the producers here and
 * they do not guarantee every `modelInfoSchema` field (e.g.
 * `src/api/providers/fetchers/openrouter.ts` sets `contextWindow` directly from
 * the API's `context_length`, which can be absent for a given model). Because
 * the webview boundary DROPS messages that fail to parse, a strict `ModelInfo`
 * would silently break the whole model-list UI when one model lacks a field —
 * so the outbound record is deliberately tolerant (transitional): known fields
 * are still type-checked, unknown/partial fields are retained rather than
 * stripped or rejected.
 */
const modelRecordSchema = z.record(z.string(), modelInfoSchema.partial().passthrough())

/**
 * `RouterModels` = `Record<DynamicProvider | LocalProvider, ModelRecord>`
 * (type-only). Modeled as a string-keyed record of `modelRecordSchema`; the
 * provider-key union is open (router providers are registered dynamically).
 */
const routerModelsSchema = z.record(z.string(), modelRecordSchema)

/**
 * `LanguageModelChatSelector` = `{ vendor?, family?, version?, id? }` — a
 * type-only interface on `vscode-extension-host.ts`. The producer posts full
 * VS Code `LanguageModelChat` objects; the webview reads only `vendor`/`family`
 * (`VSCodeLM.tsx`), so the schema mirrors the selector shape exactly.
 */
const languageModelChatSelectorSchema = z.object({
	vendor: z.string().optional(),
	family: z.string().optional(),
	version: z.string().optional(),
	id: z.string().optional(),
})

/**
 * `CloudUserInfo` is a type-only interface (no zod schema exists in
 * `packages/types/src/cloud.ts`); modeled structurally with all-optional fields
 * mirroring the interface. Only used by the vestigial `authenticatedUser`
 * message.
 */
const cloudUserInfoSchema = z.object({
	id: z.string().optional(),
	name: z.string().optional(),
	email: z.string().optional(),
	picture: z.string().optional(),
	organizationId: z.string().optional(),
	organizationName: z.string().optional(),
	organizationRole: z.string().optional(),
	organizationImageUrl: z.string().optional(),
})

/** `ShareVisibility` is a type-only union in `cloud.ts`. */
const shareVisibilitySchema = z.enum(["organization", "public"])

/**
 * Full router model list push (`routerModels`).
 *
 * The producer (`src/core/webview/handlers/settings.ts`) posts
 * `routerModels` plus `values: { provider }` when the request was filtered to a
 * single provider. The webview (`ExtensionStateContext.tsx`) reads
 * `message.values?.provider` to merge only that provider's record into the
 * stored router models — zod strips unknown keys, so `values` MUST be part of
 * the schema or the merge branch would silently break.
 */
export const routerModelsMessageSchema = z.object({
	type: z.literal("routerModels"),
	routerModels: routerModelsSchema,
	values: z.object({ provider: z.string() }).optional(),
})

/**
 * Per-provider router model fetch result (`singleRouterModelFetchResponse`).
 *
 * Posted on failure (the producer always sends `success: false` with an
 * `error` and `values: { provider }`). Provider components (LiteLLM, Poe,
 * OpenCodeGo, Moonshot, …) read `message.success` and
 * `message.values?.provider` to surface per-provider errors, so both fields are
 * required parts of the schema.
 */
export const singleRouterModelFetchResponseMessageSchema = z.object({
	type: z.literal("singleRouterModelFetchResponse"),
	success: z.boolean(),
	error: z.string().optional(),
	values: z.object({ provider: z.string() }).optional(),
})

/**
 * OpenAI-compatible model list (`openAiModels`) — a plain array of model ids.
 */
export const openAiModelsMessageSchema = z.object({
	type: z.literal("openAiModels"),
	openAiModels: z.array(z.string()),
})

/**
 * Ollama model list (`ollamaModels`). The producer posts `error` on failure
 * alongside an empty record; the webview (`Ollama.tsx`) reads `message.error`
 * to show the backend failure and `message.ollamaModels` otherwise.
 */
export const ollamaModelsMessageSchema = z.object({
	type: z.literal("ollamaModels"),
	ollamaModels: modelRecordSchema,
	error: z.string().optional(),
})

/**
 * LM Studio model list (`lmStudioModels`) — a `ModelRecord`.
 */
export const lmStudioModelsMessageSchema = z.object({
	type: z.literal("lmStudioModels"),
	lmStudioModels: modelRecordSchema,
})

/**
 * VS Code Language Model list (`vsCodeLmModels`) — an array of
 * `LanguageModelChatSelector`-shaped objects.
 */
export const vsCodeLmModelsMessageSchema = z.object({
	type: z.literal("vsCodeLmModels"),
	vsCodeLmModels: z.array(languageModelChatSelectorSchema),
})

/**
 * VS Code setting read response (`vsCodeSetting`).
 *
 * The producer posts `value` (a boolean/number — the only requested setting is
 * the boolean `terminal.integrated.inheritEnv`) or `value: undefined` +
 * `error` on failure. The webview (`TerminalSettings.tsx`) reads both
 * `message.setting` and `message.value`.
 */
export const vsCodeSettingMessageSchema = z.object({
	type: z.literal("vsCodeSetting"),
	setting: z.string(),
	value: z.union([z.boolean(), z.number()]).optional(),
	error: z.string().optional(),
})

/**
 * Generated system prompt response (`systemPrompt`).
 *
 * The producer (`src/core/webview/handlers/task.ts`) posts `text` plus `mode`
 * (the mode the prompt was generated for); the webview (`ModesView.tsx`) reads
 * `message.mode` to title the preview dialog, so `mode` is part of the schema.
 */
export const systemPromptMessageSchema = z.object({
	type: z.literal("systemPrompt"),
	text: z.string(),
	mode: z.string().optional(),
})

/**
 * Enhanced prompt response (`enhancedPrompt`).
 *
 * `text` is OPTIONAL: the success path posts `{ type, text }`, while the
 * error path posts bare `{ type: "enhancedPrompt" }` with NO text
 * (`src/core/webview/handlers/chat.ts`). The webview (`ChatTextArea.tsx`) reads
 * `message.text` only when present.
 */
export const enhancedPromptMessageSchema = z.object({
	type: z.literal("enhancedPrompt"),
	text: z.string().optional(),
})

/**
 * Sanitized VS Code terminal profile names (`terminalProfiles`).
 */
export const terminalProfilesMessageSchema = z.object({
	type: z.literal("terminalProfiles"),
	profiles: z.array(z.string()),
})

/**
 * VS Code LM API availability (`vsCodeLmApiAvailable`).
 *
 * Vestigial: this type has NO producer anywhere in `src/`, `apps/cli/` or
 * `webview-ui/`, and no payload field on the flat `ExtensionMessage` interface.
 * Registered outbound with a minimal structural schema because the union is the
 * source of truth and the ratchet demands every member be registered; actual
 * outbound traffic is expected/vestigial.
 */
export const vsCodeLmApiAvailableMessageSchema = z.object({
	type: z.literal("vsCodeLmApiAvailable"),
})

/**
 * Authenticated cloud user push (`authenticatedUser`).
 *
 * Vestigial: this type has NO producer anywhere in `src/`, `apps/cli/` or
 * `webview-ui/`. The flat `ExtensionMessage` interface carries
 * `userInfo`/`organizationAllowList`/`visibility`/`errors` for it, so those are
 * included as optional fields per the interface; actual outbound traffic is
 * expected/vestigial (Roo Code Cloud is deprecated).
 */
export const authenticatedUserMessageSchema = z.object({
	type: z.literal("authenticatedUser"),
	userInfo: cloudUserInfoSchema.optional(),
	organizationAllowList: organizationAllowListSchema.optional(),
	visibility: shareVisibilitySchema.optional(),
	errors: z.array(z.string()).optional(),
})

/** Discriminated union of the outbound model/status domain's fully-typed messages. */
export const modelStatusMessageSchema = z.discriminatedUnion("type", [
	routerModelsMessageSchema,
	singleRouterModelFetchResponseMessageSchema,
	openAiModelsMessageSchema,
	ollamaModelsMessageSchema,
	lmStudioModelsMessageSchema,
	vsCodeLmModelsMessageSchema,
	vsCodeSettingMessageSchema,
	systemPromptMessageSchema,
	enhancedPromptMessageSchema,
	terminalProfilesMessageSchema,
	vsCodeLmApiAvailableMessageSchema,
	authenticatedUserMessageSchema,
])

export type ModelStatusMessage = z.infer<typeof modelStatusMessageSchema>
