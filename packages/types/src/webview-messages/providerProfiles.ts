import { z } from "zod"

import { providerSettingsSchema } from "../provider-settings.js"

/**
 * Provider-profiles domain messages (S1 sub-task 8).
 *
 * These are the API-configuration/profile-management messages handled by
 * `src/core/webview/handlers/providerProfiles.ts`. Field shapes were extracted
 * from the handler guards: `text` drives name/id-based lookups (`if (text)`),
 * `bool` drives the across-modes lock (`bool ?? false`), and
 * `renameApiConfiguration` reads a typed `values` record plus the full provider
 * settings.
 *
 * Fields stay OPTIONAL to match the `WebviewMessage` interface and the handler
 * guards — presence is still validated inside the handler. `apiConfiguration`
 * reuses the same `providerSettingsSchema` as `saveApiConfiguration` (with
 * `.passthrough()` so provider-specific settings fields are retained when the
 * renamed profile is re-saved). NEVER `z.unknown()`: an invalid `values` /
 * `apiConfiguration` shape is rejected at the boundary.
 */

/** Delete an API configuration profile by name (`text`). */
export const deleteApiConfigurationMessageSchema = z.object({
	type: z.literal("deleteApiConfiguration"),
	text: z.string().optional(),
})

/** Set the API configuration profile used for prompt enhancement (`text` = profile name). */
export const enhancementApiConfigIdMessageSchema = z.object({
	type: z.literal("enhancementApiConfigId"),
	text: z.string().optional(),
})

/** Request the full list of API configurations (empty payload). */
export const getListApiConfigurationMessageSchema = z.object({
	type: z.literal("getListApiConfiguration"),
})

/** Sign in to Kimi Code (empty payload). */
export const kimiCodeSignInMessageSchema = z.object({
	type: z.literal("kimiCodeSignIn"),
})

/** Sign out of Kimi Code (empty payload). */
export const kimiCodeSignOutMessageSchema = z.object({
	type: z.literal("kimiCodeSignOut"),
})

/** Load/activate an API configuration profile by name (`text`). */
export const loadApiConfigurationMessageSchema = z.object({
	type: z.literal("loadApiConfiguration"),
	text: z.string().optional(),
})

/** Load/activate an API configuration profile by id (`text`). */
export const loadApiConfigurationByIdMessageSchema = z.object({
	type: z.literal("loadApiConfigurationById"),
	text: z.string().optional(),
})

/** Lock the active API configuration across modes (`bool`, defaults to false). */
export const lockApiConfigAcrossModesMessageSchema = z.object({
	type: z.literal("lockApiConfigAcrossModes"),
	bool: z.boolean().optional(),
})

/** Sign in to OpenAI Codex (empty payload). */
export const openAiCodexSignInMessageSchema = z.object({
	type: z.literal("openAiCodexSignIn"),
})

/** Sign out of OpenAI Codex (empty payload). */
export const openAiCodexSignOutMessageSchema = z.object({
	type: z.literal("openAiCodexSignOut"),
})

/** `values` shape for `renameApiConfiguration` (old → new profile name). */
const renameApiConfigurationValuesSchema = z.object({
	oldName: z.string().optional(),
	newName: z.string().optional(),
})

/**
 * Rename an API configuration profile: `values.oldName` → `values.newName`,
 * re-saving with the same id under the new name. `apiConfiguration` reuses the
 * full `ProviderSettings` schema (same as `saveApiConfiguration`) with
 * `.passthrough()` so provider-specific fields are retained.
 */
export const renameApiConfigurationMessageSchema = z.object({
	type: z.literal("renameApiConfiguration"),
	values: renameApiConfigurationValuesSchema.optional(),
	apiConfiguration: providerSettingsSchema.passthrough().optional(),
})

/** Request OpenAI Codex rate-limit info (empty payload). */
export const requestOpenAiCodexRateLimitsMessageSchema = z.object({
	type: z.literal("requestOpenAiCodexRateLimits"),
})

/** Toggle the pinned state of an API configuration profile (`text` = profile id). */
export const toggleApiConfigPinMessageSchema = z.object({
	type: z.literal("toggleApiConfigPin"),
	text: z.string().optional(),
})

/** Discriminated union of the provider-profiles domain's fully-typed messages. */
export const providerProfilesMessageSchema = z.discriminatedUnion("type", [
	deleteApiConfigurationMessageSchema,
	enhancementApiConfigIdMessageSchema,
	getListApiConfigurationMessageSchema,
	kimiCodeSignInMessageSchema,
	kimiCodeSignOutMessageSchema,
	loadApiConfigurationMessageSchema,
	loadApiConfigurationByIdMessageSchema,
	lockApiConfigAcrossModesMessageSchema,
	openAiCodexSignInMessageSchema,
	openAiCodexSignOutMessageSchema,
	renameApiConfigurationMessageSchema,
	requestOpenAiCodexRateLimitsMessageSchema,
	toggleApiConfigPinMessageSchema,
])

export type ProviderProfilesMessage = z.infer<typeof providerProfilesMessageSchema>
export type RenameApiConfigurationValues = z.infer<typeof renameApiConfigurationValuesSchema>
