import { z } from "zod"

/**
 * Skills-domain messages.
 *
 * The webview drives skill management (list/create/delete/move/update-modes/
 * open-file). Every skill operation carries `skillName` and `source`
 * (global|project) as REQUIRED fields — the previous handlers null-checked the
 * payload and cast `message.source as SkillSource`; registering the schemas
 * means a crafted message without `skillName`/`source` (or with an invalid
 * `source` value) is rejected at the boundary instead of reaching the handler.
 * `skillModeSlugs` and the legacy `skillMode` fallback stay optional to match
 * the `WebviewMessage` interface fields exactly (see the construction sites in
 * `webview-ui/src/components/settings/`).
 */

/** Request the full list of skill metadata (empty payload). */
export const requestSkillsMessageSchema = z.object({
	type: z.literal("requestSkills"),
})

/**
 * Create a new skill. `skillName`, `source` and `skillDescription` are REQUIRED;
 * `skillModeSlugs` restricts the skill to specific modes, with the deprecated
 * `skillMode` kept as a legacy fallback (the handler merges them).
 */
export const createSkillMessageSchema = z.object({
	type: z.literal("createSkill"),
	skillName: z.string(),
	source: z.enum(["global", "project"]),
	skillDescription: z.string(),
	skillModeSlugs: z.array(z.string()).optional(),
	/** @deprecated Use skillModeSlugs instead. */
	skillMode: z.string().optional(),
})

/**
 * Delete a skill. `skillName` and `source` are REQUIRED; `skillModeSlugs`
 * (or the legacy `skillMode`) narrows a mode-scoped skill.
 */
export const deleteSkillMessageSchema = z.object({
	type: z.literal("deleteSkill"),
	skillName: z.string(),
	source: z.enum(["global", "project"]),
	skillModeSlugs: z.array(z.string()).optional(),
	/** @deprecated Use skillModeSlugs instead. */
	skillMode: z.string().optional(),
})

/** Move a skill to a different mode. `skillName` and `source` are REQUIRED. */
export const moveSkillMessageSchema = z.object({
	type: z.literal("moveSkill"),
	skillName: z.string(),
	source: z.enum(["global", "project"]),
	skillMode: z.string().optional(),
	newSkillMode: z.string().optional(),
})

/**
 * Update the mode associations for a skill. `skillName` and `source` are
 * REQUIRED; `newSkillModeSlugs` is the target mode list.
 */
export const updateSkillModesMessageSchema = z.object({
	type: z.literal("updateSkillModes"),
	skillName: z.string(),
	source: z.enum(["global", "project"]),
	newSkillModeSlugs: z.array(z.string()).optional(),
})

/** Open a skill file in the editor. `skillName` and `source` are REQUIRED. */
export const openSkillFileMessageSchema = z.object({
	type: z.literal("openSkillFile"),
	skillName: z.string(),
	source: z.enum(["global", "project"]),
})

/** Discriminated union of the skills domain's fully-typed messages. */
export const skillsMessageSchema = z.discriminatedUnion("type", [
	requestSkillsMessageSchema,
	createSkillMessageSchema,
	deleteSkillMessageSchema,
	moveSkillMessageSchema,
	updateSkillModesMessageSchema,
	openSkillFileMessageSchema,
])

export type SkillsMessage = z.infer<typeof skillsMessageSchema>
