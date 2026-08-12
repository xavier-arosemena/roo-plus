import { z } from "zod"

/**
 * Outbound skills/rules/history-import response message schemas (Phase 2, Domain 8).
 *
 * These are the extension→webview|CLI messages that carry the full skill
 * metadata list (`skills`), the full rule metadata list (`rules`) and the Roo
 * history-import progress stream (`rooHistoryImportProgress`).
 *
 * Every schema uses a `z.literal("type")` discriminator. The `SkillMetadata`
 * (`packages/types/src/skills.ts`) and `RuleMetadata`
 * (`packages/types/src/rules.ts`) flat interfaces have no zod counterparts, so
 * they are modeled precisely here; the `rooHistoryImportProgress` payload
 * mirrors the inline shape on the flat `ExtensionMessage` interface in
 * `packages/types/src/vscode-extension-host.ts` (single source of truth).
 * The webview consumers read every modeled field (zod strips unknown keys, so
 * a field the consumer reads MUST be in the schema).
 *
 * NOTE — naming: `skillsMessageSchema` and `rulesMessageSchema` are ALSO the
 * names of the INBOUND webview-messages domain unions (S1 — the webview→
 * extension request schemas). The package-root barrel disambiguates the
 * collision in favor of the inbound schemas (the `CodeIndexMessage`
 * precedent); these outbound variants remain available directly from
 * "./extension-messages/index.js".
 */

/**
 * Zod schema for `SkillMetadata` (`packages/types/src/skills.ts`). The producer
 * (`src/core/webview/skillsMessageHandler.ts`) posts `SkillMetadata[]` and the
 * webview reads every field, so all interface members are modeled.
 */
export const skillMetadataSchema = z.object({
	name: z.string(),
	description: z.string(),
	path: z.string(),
	source: z.enum(["global", "project"]),
	/** @deprecated Use modeSlugs instead. Kept for backward compatibility. */
	mode: z.string().optional(),
	modeSlugs: z.array(z.string()).optional(),
})

/**
 * Full skill metadata list response (`skills`). The producer always posts a
 * `skills` array (possibly empty) — see `src/core/webview/skillsMessageHandler.ts`.
 * The array is optional to mirror the flat `ExtensionMessage` interface
 * (`skills?`) and the webview consumer's omission fallback
 * (`if (message.skills)` — `ExtensionStateContext.tsx`); elements are still
 * strictly validated when present.
 */
export const skillsMessageSchema = z.object({
	type: z.literal("skills"),
	skills: z.array(skillMetadataSchema).optional(),
})

/**
 * Zod schema for `RuleMetadata` (`packages/types/src/rules.ts`). The producer
 * (`src/core/webview/rulesMessageHandler.ts`) posts `RuleMetadata[]` and the
 * webview reads every field, so all interface members are modeled.
 */
export const ruleMetadataSchema = z.object({
	id: z.string(),
	name: z.string(),
	scope: z.enum(["global", "project"]),
	kind: z.enum(["generic", "mode"]),
	modeSlug: z.string().optional(),
	modeName: z.string().optional(),
	filePath: z.string(),
	relativePath: z.string(),
	directoryPath: z.string(),
	description: z.string().optional(),
	isSymlink: z.boolean().optional(),
})

/**
 * Full rule metadata list response (`rules`). The producer always posts a
 * `rules` array (possibly empty) — see `src/core/webview/rulesMessageHandler.ts`.
 * The array is optional to mirror the flat `ExtensionMessage` interface
 * (`rules?`) and the webview consumer's omission fallback
 * (`message.rules ?? []` — `ExtensionStateContext.tsx`); elements are still
 * strictly validated when present.
 */
export const rulesMessageSchema = z.object({
	type: z.literal("rules"),
	rules: z.array(ruleMetadataSchema).optional(),
})

/**
 * Inner `rooHistoryImportProgress` payload, mirroring the inline shape on the
 * flat `ExtensionMessage` interface. The producer
 * (`src/core/webview/handlers/misc.ts`, `importRooHistory` handler) streams
 * this from `importRooTaskHistory`'s `RooHistoryImportProgress` callback, and
 * the webview (`About.tsx`) reads every field (including the optional
 * `currentTaskId`/`currentFileName`), so all members are modeled.
 */
export const rooHistoryImportProgressSchema = z.object({
	status: z.enum(["starting", "copying", "finished", "failed"]),
	copiedFileCount: z.number(),
	totalFileCount: z.number(),
	importedTaskCount: z.number(),
	totalTaskCount: z.number(),
	currentTaskId: z.string().optional(),
	currentFileName: z.string().optional(),
})

/**
 * Roo history-import progress stream (`rooHistoryImportProgress`). Status
 * values mirror the flat interface union (`"starting" | "copying" |
 * "finished" | "failed"`).
 */
export const rooHistoryImportProgressMessageSchema = z.object({
	type: z.literal("rooHistoryImportProgress"),
	rooHistoryImportProgress: rooHistoryImportProgressSchema,
})

/** Discriminated union of the outbound skills/rules/history-import domain's fully-typed messages. */
export const skillsRulesMessageSchema = z.discriminatedUnion("type", [
	skillsMessageSchema,
	rulesMessageSchema,
	rooHistoryImportProgressMessageSchema,
])

export type SkillsRulesMessage = z.infer<typeof skillsRulesMessageSchema>
