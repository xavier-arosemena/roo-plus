import { z } from "zod"

import { providerSettingsSchema } from "../provider-settings.js"

/**
 * Provider configuration messages (security-sensitive — prevents injecting
 * arbitrary provider config).
 *
 * `apiConfiguration` reuses the full `ProviderSettings` schema (validating key
 * fields incl. the `apiProvider` enum) with `.passthrough()` so provider-specific
 * settings fields that aren't fully modeled are retained, never stripped.
 */
export const saveApiConfigurationMessageSchema = z.object({
	type: z.literal("saveApiConfiguration"),
	text: z.string(),
	apiConfiguration: providerSettingsSchema.passthrough(),
})

export const upsertApiConfigurationMessageSchema = z.object({
	type: z.literal("upsertApiConfiguration"),
	text: z.string(),
	apiConfiguration: providerSettingsSchema.passthrough(),
})

/**
 * `setApiConfigPassword` currently has no handler case (no-op), but registering it
 * still validates the shape so a crafted payload is rejected at the boundary.
 * Fields are optional to stay compatible with future senders, but their types are
 * checked when present.
 */
export const setApiConfigPasswordMessageSchema = z.object({
	type: z.literal("setApiConfigPassword"),
	text: z.string().optional(),
	apiConfiguration: providerSettingsSchema.passthrough().optional(),
})

/** Discriminated union of the provider-config domain's fully-typed messages. */
export const providerConfigMessageSchema = z.discriminatedUnion("type", [
	saveApiConfigurationMessageSchema,
	upsertApiConfigurationMessageSchema,
	setApiConfigPasswordMessageSchema,
])

export type ProviderConfigMessage = z.infer<typeof providerConfigMessageSchema>
