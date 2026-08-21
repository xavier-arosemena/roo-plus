import { z } from "zod"

import { promptComponentSchema } from "../mode.js"

/**
 * Settings-domain messages (S1 sub-task 9) — the remaining 22 untyped types
 * handled by `src/core/webview/handlers/settings.ts`.
 *
 * Field shapes were extracted from the handler guards (see the sub-task spec):
 * `bool` drives toggles (`bool ?? <default>`), `text`/`setting`/`slug` drive
 * string-keyed lookups, `source` is the mode-import scope enum, and the four
 * model-fetch messages carry a precisely-typed `values` record (NEVER
 * `z.unknown()`) so invalid shapes are rejected at the boundary instead of
 * surfacing as optional-chain soup in the handler.
 *
 * Fields stay OPTIONAL to match the `WebviewMessage` interface and the handler
 * guards — presence is still validated inside the handler.
 *
 * The existing `updateSettingsMessageSchema` lives in `settings.ts` (bulk
 * settings update, already registered); this module uses a distinct name
 * (`settingsExtraMessageSchema`) so the two stay separate.
 */

/** `values` shape for `requestLmStudioModels` (optional baseUrl override). */
const requestLmStudioModelsValuesSchema = z.object({
	baseUrl: z.string().optional(),
})

/** `values` shape for `requestOllamaModels` (unsaved form state wins over saved config). */
const requestOllamaModelsValuesSchema = z.object({
	baseUrl: z.string().optional(),
	apiKey: z.string().optional(),
})

/** `values` shape for `requestOpenAiModels` (baseUrl/apiKey + optional custom headers). */
const requestOpenAiModelsValuesSchema = z.object({
	baseUrl: z.string().optional(),
	apiKey: z.string().optional(),
	openAiHeaders: z.record(z.string(), z.string()).optional(),
})

/**
 * `values` shape for `requestRouterModels`: optional single-provider filter
 * (`provider`) + `refresh` flag plus per-router credentials (LiteLLM, Poe,
 * DeepSeek, Moonshot, Opencode Go, Kenari, Kimi Code). Every field matches a
 * handler read (`message?.values?.<field>`) exactly.
 */
const requestRouterModelsValuesSchema = z.object({
	provider: z.string().optional(),
	refresh: z.boolean().optional(),
	litellmApiKey: z.string().optional(),
	litellmBaseUrl: z.string().optional(),
	poeApiKey: z.string().optional(),
	poeBaseUrl: z.string().optional(),
	deepSeekApiKey: z.string().optional(),
	deepSeekBaseUrl: z.string().optional(),
	moonshotApiKey: z.string().optional(),
	moonshotBaseUrl: z.string().optional(),
	opencodeGoApiKey: z.string().optional(),
	kenariApiKey: z.string().optional(),
	nanoGptApiKey: z.string().optional(),
	kimiCodeAuthMethod: z.string().optional(),
	kimiCodeApiKey: z.string().optional(),
})

/** Auto-approval toggle (`bool`, handler defaults to false). */
export const autoApprovalEnabledMessageSchema = z.object({
	type: z.literal("autoApprovalEnabled"),
	bool: z.boolean().optional(),
})

/** Check whether a custom mode's rules directory has content (`slug`). */
export const checkRulesDirectoryMessageSchema = z.object({
	type: z.literal("checkRulesDirectory"),
	slug: z.string().optional(),
})

/** Update the custom instructions (`text`). */
export const customInstructionsMessageSchema = z.object({
	type: z.literal("customInstructions"),
	text: z.string().optional(),
})

/** Toggle the `debug` setting (`bool`, handler defaults to false). */
export const debugSettingMessageSchema = z.object({
	type: z.literal("debugSetting"),
	bool: z.boolean().optional(),
})

/** Export a mode to a YAML file (`slug`). */
export const exportModeMessageSchema = z.object({
	type: z.literal("exportMode"),
	slug: z.string().optional(),
})

/** Export all settings (empty payload). */
export const exportSettingsMessageSchema = z.object({
	type: z.literal("exportSettings"),
})

/** Flush the router-model cache (`text` = router name, via `toRouterName`). */
export const flushRouterModelsMessageSchema = z.object({
	type: z.literal("flushRouterModels"),
	text: z.string().optional(),
})

/** Read a VS Code setting by key (`setting`). */
export const getVSCodeSettingMessageSchema = z.object({
	type: z.literal("getVSCodeSetting"),
	setting: z.string().optional(),
})

/** Record that the mode selector has been opened (`bool`, handler defaults to true). */
export const hasOpenedModeSelectorMessageSchema = z.object({
	type: z.literal("hasOpenedModeSelector"),
	bool: z.boolean().optional(),
})

/** Import a mode from a YAML file (`source` scope, handler defaults to "project"). */
export const importModeMessageSchema = z.object({
	type: z.literal("importMode"),
	source: z.enum(["global", "project"]).optional(),
})

/** Import settings from a file (empty payload). */
export const importSettingsMessageSchema = z.object({
	type: z.literal("importSettings"),
})

/** Switch the active mode (`text` = mode slug, cast to `Mode` in the handler). */
export const modeMessageSchema = z.object({
	type: z.literal("mode"),
	text: z.string().optional(),
})

/** Open the custom-modes settings file (empty payload). */
export const openCustomModesSettingsMessageSchema = z.object({
	type: z.literal("openCustomModesSettings"),
})

/** Fetch LM Studio models (`values.baseUrl` override). */
export const requestLmStudioModelsMessageSchema = z.object({
	type: z.literal("requestLmStudioModels"),
	values: requestLmStudioModelsValuesSchema.optional(),
})

/** Fetch Ollama models (`values` = unsaved baseUrl/apiKey). */
export const requestOllamaModelsMessageSchema = z.object({
	type: z.literal("requestOllamaModels"),
	values: requestOllamaModelsValuesSchema.optional(),
})

/** Fetch OpenAI-compatible models (`values` = baseUrl/apiKey/openAiHeaders). */
export const requestOpenAiModelsMessageSchema = z.object({
	type: z.literal("requestOpenAiModels"),
	values: requestOpenAiModelsValuesSchema.optional(),
})

/** Fetch Roo router models (empty payload; returns an explicit removal message). */
export const requestRooModelsMessageSchema = z.object({
	type: z.literal("requestRooModels"),
})

/** Fetch router models (`values` = optional provider filter + per-router credentials). */
export const requestRouterModelsMessageSchema = z.object({
	type: z.literal("requestRouterModels"),
	values: requestRouterModelsValuesSchema.optional(),
})

/** Fetch VS Code LM models (empty payload). */
export const requestVsCodeLmModelsMessageSchema = z.object({
	type: z.literal("requestVsCodeLmModels"),
})

/** Set the telemetry setting (`text`, cast to `TelemetrySetting` in the handler). */
export const telemetrySettingMessageSchema = z.object({
	type: z.literal("telemetrySetting"),
	text: z.string().optional(),
})

/**
 * Update a custom-mode prompt (`promptMode` key + `customPrompt` component).
 * `customPrompt` reuses the exported `promptComponentSchema` (the same
 * `PromptComponent` the `WebviewMessage` interface types and the webview
 * `ModesView` sender constructs), so invalid shapes are rejected at the
 * boundary.
 */
export const updatePromptMessageSchema = z.object({
	type: z.literal("updatePrompt"),
	promptMode: z.string().optional(),
	customPrompt: promptComponentSchema.optional(),
})

/**
 * Update an allowlisted VS Code setting (`setting` key + `value`).
 *
 * `value` accepts number OR boolean: the `WebviewMessage` interface types
 * `value?: number`, but the live sender (`TerminalSettings` inheritEnv
 * checkbox) passes `e.target.checked` (a boolean) for the boolean
 * `terminal.integrated.inheritEnv` setting. Both are accepted so the boundary
 * never rejects real traffic; anything else (string/object/null) is rejected.
 */
export const updateVSCodeSettingMessageSchema = z.object({
	type: z.literal("updateVSCodeSetting"),
	setting: z.string().optional(),
	value: z.union([z.number(), z.boolean()]).optional(),
})

/** Discriminated union of the settings domain's newly-typed messages. */
export const settingsExtraMessageSchema = z.discriminatedUnion("type", [
	autoApprovalEnabledMessageSchema,
	checkRulesDirectoryMessageSchema,
	customInstructionsMessageSchema,
	debugSettingMessageSchema,
	exportModeMessageSchema,
	exportSettingsMessageSchema,
	flushRouterModelsMessageSchema,
	getVSCodeSettingMessageSchema,
	hasOpenedModeSelectorMessageSchema,
	importModeMessageSchema,
	importSettingsMessageSchema,
	modeMessageSchema,
	openCustomModesSettingsMessageSchema,
	requestLmStudioModelsMessageSchema,
	requestOllamaModelsMessageSchema,
	requestOpenAiModelsMessageSchema,
	requestRooModelsMessageSchema,
	requestRouterModelsMessageSchema,
	requestVsCodeLmModelsMessageSchema,
	telemetrySettingMessageSchema,
	updatePromptMessageSchema,
	updateVSCodeSettingMessageSchema,
])

export type SettingsExtraMessage = z.infer<typeof settingsExtraMessageSchema>
export type RequestRouterModelsValues = z.infer<typeof requestRouterModelsValuesSchema>
