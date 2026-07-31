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

/** Discriminated union of the provider-config domain's fully-typed messages. */
export const providerConfigMessageSchema = z.discriminatedUnion("type", [
	saveApiConfigurationMessageSchema,
	upsertApiConfigurationMessageSchema,
])

export type ProviderConfigMessage = z.infer<typeof providerConfigMessageSchema>
