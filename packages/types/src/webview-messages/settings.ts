import { z } from "zod"

import { rooCodeSettingsSchema } from "../global-settings.js"

/**
 * Bulk settings update message.
 *
 * `updatedSettings` is validated against the full `RooCodeSettings` schema, so
 * known fields' TYPES are checked at the boundary (e.g. a string `terminalProfile`
 * or a boolean `soundEnabled`). The underlying `rooCodeSettingsSchema` uses
 * `.passthrough()`, so unknown future settings fields are RETAINED rather than
 * stripped — a settings update must be forward-compatible.
 */
export const updateSettingsMessageSchema = z.object({
	type: z.literal("updateSettings"),
	updatedSettings: rooCodeSettingsSchema.optional(),
})

export type SettingsMessage = z.infer<typeof updateSettingsMessageSchema>
