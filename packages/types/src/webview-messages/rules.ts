import { z } from "zod"

/**
 * Rules-domain messages.
 *
 * The webview drives rule management (list/create/delete/open-file/open-
 * directory). Rule operations carry their payload under the `values` record,
 * which the previous handlers read with `message.values ?? {}` and an
 * `as CreateRuleInput` cast. The fields are precisely known from
 * `parseCreateRuleInput` / `parseDeleteRuleInput` / `handleOpenRulesDirectory`
 * in `src/core/webview/rulesMessageHandler.ts`, so `values` is modeled as a
 * typed object (NOT `z.unknown()`): invalid `scope`/`kind` enum values are
 * rejected at the boundary and the `as CreateRuleInput` cast is removed.
 *
 * `scope`/`kind`/`fileName`/`relativePath` stay OPTIONAL here — presence is
 * still validated inside the handler (it throws "Missing required fields…"),
 * matching the `WebviewMessage` interface fields. `text` is the legacy
 * fallback for `fileName`/`relativePath`.
 */

const ruleScopeSchema = z.enum(["global", "project"])
const ruleKindSchema = z.enum(["generic", "mode"])

/** `values` shape for `createRule` (matches `parseCreateRuleInput`). */
const createRuleValuesSchema = z.object({
	scope: ruleScopeSchema.optional(),
	kind: ruleKindSchema.optional(),
	fileName: z.string().optional(),
	modeSlug: z.string().optional(),
})

/** `values` shape for `deleteRule` / `openRuleFile` (matches `parseDeleteRuleInput`). */
const deleteRuleValuesSchema = z.object({
	scope: ruleScopeSchema.optional(),
	kind: ruleKindSchema.optional(),
	relativePath: z.string().optional(),
	id: z.string().optional(),
	modeSlug: z.string().optional(),
})

/** `values` shape for `openRulesDirectory` (scope/kind/modeSlug only). */
const openRulesDirectoryValuesSchema = z.object({
	scope: ruleScopeSchema.optional(),
	kind: ruleKindSchema.optional(),
	modeSlug: z.string().optional(),
})

/** Request the full list of rule metadata (empty payload). */
export const requestRulesMessageSchema = z.object({
	type: z.literal("requestRules"),
})

/** Create a rule file. `values`/`text` are validated by the handler. */
export const createRuleMessageSchema = z.object({
	type: z.literal("createRule"),
	values: createRuleValuesSchema.optional(),
	text: z.string().optional(),
})

/** Delete a rule file. `values`/`text` are validated by the handler. */
export const deleteRuleMessageSchema = z.object({
	type: z.literal("deleteRule"),
	values: deleteRuleValuesSchema.optional(),
	text: z.string().optional(),
})

/** Open a rule file (reuses the delete-rule `values` shape). */
export const openRuleFileMessageSchema = z.object({
	type: z.literal("openRuleFile"),
	values: deleteRuleValuesSchema.optional(),
	text: z.string().optional(),
})

/** Open the rules directory for the given scope/kind/mode. */
export const openRulesDirectoryMessageSchema = z.object({
	type: z.literal("openRulesDirectory"),
	values: openRulesDirectoryValuesSchema.optional(),
})

/** Discriminated union of the rules domain's fully-typed messages. */
export const rulesMessageSchema = z.discriminatedUnion("type", [
	requestRulesMessageSchema,
	createRuleMessageSchema,
	deleteRuleMessageSchema,
	openRuleFileMessageSchema,
	openRulesDirectoryMessageSchema,
])

export type RulesMessage = z.infer<typeof rulesMessageSchema>

export type CreateRuleValues = z.infer<typeof createRuleValuesSchema>
export type DeleteRuleValues = z.infer<typeof deleteRuleValuesSchema>
export type OpenRulesDirectoryValues = z.infer<typeof openRulesDirectoryValuesSchema>
