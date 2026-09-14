import * as vscode from "vscode"

import {
	type GroupEntry,
	type ModeConfig,
	type CustomModePrompts,
	type ToolGroup,
	type PromptComponent,
	DEFAULT_MODES,
} from "@roo-code/types"

import { addCustomInstructions } from "../core/prompts/sections/custom-instructions"

import { TOOL_GROUPS, ALWAYS_AVAILABLE_TOOLS } from "./tools"

export type Mode = string

// Helper to extract group name regardless of format
export function getGroupName(group: GroupEntry): ToolGroup {
	if (typeof group === "string") {
		return group
	}

	return group[0]
}

// Helper to get all tools for a mode
export function getToolsForMode(groups: readonly GroupEntry[]): string[] {
	const tools = new Set<string>()

	// Add tools from each group (excluding customTools which are opt-in only)
	groups.forEach((group) => {
		const groupName = getGroupName(group)
		const groupConfig = TOOL_GROUPS[groupName]
		groupConfig.tools.forEach((tool: string) => tools.add(tool))
	})

	// Always add required tools
	ALWAYS_AVAILABLE_TOOLS.forEach((tool) => tools.add(tool))

	return Array.from(tools)
}

// Main modes configuration as an ordered array
export const modes = DEFAULT_MODES

// Export the default mode slug
export const defaultModeSlug = modes[0].slug

// Helper functions
export function getModeBySlug(slug: string, customModes?: ModeConfig[]): ModeConfig | undefined {
	// Check custom modes first
	const customMode = customModes?.find((mode) => mode.slug === slug)
	if (customMode) {
		return customMode
	}
	// Then check built-in modes
	return modes.find((mode) => mode.slug === slug)
}

export function getModeConfig(slug: string, customModes?: ModeConfig[]): ModeConfig {
	const mode = getModeBySlug(slug, customModes)
	if (!mode) {
		throw new Error(`No mode found for slug: ${slug}`)
	}
	return mode
}

// Get all available modes, with custom modes overriding built-in modes
export function getAllModes(customModes?: ModeConfig[]): ModeConfig[] {
	if (!customModes?.length) {
		return [...modes]
	}

	// Start with built-in modes
	const allModes = [...modes]

	// Process custom modes
	customModes.forEach((customMode) => {
		const index = allModes.findIndex((mode) => mode.slug === customMode.slug)
		if (index !== -1) {
			// Override existing mode
			allModes[index] = customMode
		} else {
			// Add new mode
			allModes.push(customMode)
		}
	})

	return allModes
}

// Check if a mode is custom or an override
export function isCustomMode(slug: string, customModes?: ModeConfig[]): boolean {
	return !!customModes?.some((mode) => mode.slug === slug)
}

/**
 * Find a mode by its slug, don't fall back to built-in modes
 */
export function findModeBySlug(slug: string, modes: readonly ModeConfig[] | undefined): ModeConfig | undefined {
	return modes?.find((mode) => mode.slug === slug)
}

/**
 * Merge an incoming `state`-push customModes list into the webview's existing
 * list (issue #64 follow-up, postmortem §5a).
 *
 * Host state pushes carry a BOUNDED projection whose entries are flagged
 * `bounded: true` with `customInstructions` omitted (the ~691 KB body of the
 * shipped 90-mode catalog). The webview lazily fetches full configs via the
 * `getModesFullConfig` message for the ModesView editing flows, but a
 * streaming `state` push arriving afterwards must not silently re-strip those
 * bodies. So: when an incoming entry is bounded and the previous list already
 * holds a customInstructions value for that slug, re-attach it. Everything
 * else (adds, renames, deletions, non-bounded pushes) is taken from the
 * incoming list verbatim.
 */
export function mergeCustomModesState(
	previous: readonly ModeConfig[] | undefined,
	incoming: readonly ModeConfig[] | undefined,
): ModeConfig[] | undefined {
	if (!incoming) {
		return undefined as unknown as ModeConfig[] | undefined
	}
	if (!previous?.length) {
		return [...incoming]
	}

	return incoming.map((mode) => {
		if (!mode.bounded || mode.customInstructions !== undefined) {
			return mode
		}
		const prev = previous.find((p) => p.slug === mode.slug)
		return prev?.customInstructions !== undefined
			? { ...mode, customInstructions: prev.customInstructions, bounded: false }
			: mode
	})
}

/**
 * Get the mode selection based on the provided mode slug, prompt component, and custom modes.
 * If a custom mode is found, it takes precedence over the built-in modes.
 * If no custom mode is found, the built-in mode is used with partial merging from promptComponent.
 * If neither is found, the default mode is used.
 */
export function getModeSelection(mode: string, promptComponent?: PromptComponent, customModes?: ModeConfig[]) {
	const customMode = findModeBySlug(mode, customModes)
	const builtInMode = findModeBySlug(mode, modes)

	// If we have a custom mode, use it entirely
	if (customMode) {
		return {
			roleDefinition: customMode.roleDefinition || "",
			baseInstructions: customMode.customInstructions || "",
			description: customMode.description || "",
		}
	}

	// Otherwise, use built-in mode as base and merge with promptComponent
	const baseMode = builtInMode || modes[0] // fallback to default mode

	return {
		roleDefinition: promptComponent?.roleDefinition || baseMode.roleDefinition || "",
		baseInstructions: promptComponent?.customInstructions || baseMode.customInstructions || "",
		description: baseMode.description || "",
	}
}

// Custom error class for file restrictions
export class FileRestrictionError extends Error {
	constructor(mode: string, pattern: string, description: string | undefined, filePath: string, tool?: string) {
		const toolInfo = tool ? `Tool '${tool}' in mode '${mode}'` : `This mode (${mode})`
		super(
			`${toolInfo} can only edit files matching pattern: ${pattern}${description ? ` (${description})` : ""}. Got: ${filePath}`,
		)
		this.name = "FileRestrictionError"
	}
}

// Create the mode-specific default prompts
export const defaultPrompts: Readonly<CustomModePrompts> = Object.freeze(
	Object.fromEntries(
		modes.map((mode) => [
			mode.slug,
			{
				roleDefinition: mode.roleDefinition,
				whenToUse: mode.whenToUse,
				customInstructions: mode.customInstructions,
				description: mode.description,
			},
		]),
	),
)

/**
 * Returns the display description for a mode, falling back to `whenToUse` and
 * then the first line of `roleDefinition` when `description` is missing, empty,
 * or whitespace-only. This guarantees no mode ever renders a blank description
 * and mirrors the fallback used by the webview context-mentions util.
 */
export function getModeDisplayDescription(
	mode: Pick<ModeConfig, "description" | "whenToUse" | "roleDefinition">,
): string {
	const candidate = mode.description?.trim() || mode.whenToUse?.trim() || mode.roleDefinition.trim()
	return candidate.split("\n")[0]
}

// Helper function to get all modes with their prompt overrides.
//
// The custom-modes catalog is passed IN by callers from the file-backed
// source of truth (CustomModesManager.getCustomModes). It previously read the
// `customModes` globalState MIRROR, which was removed for issue #64 §5a (the
// ~760 KB catalog must not ride in the Memento). An empty/omitted list yields
// built-in modes only, exactly like the old empty-mirror behavior.
export async function getAllModesWithPrompts(
	context: vscode.ExtensionContext,
	customModes?: ModeConfig[],
): Promise<ModeConfig[]> {
	const customModePrompts = (await context.globalState.get<CustomModePrompts>("customModePrompts")) || {}

	const allModes = getAllModes(customModes)
	return allModes.map((mode) => {
		const overridden = {
			...mode,
			roleDefinition: customModePrompts[mode.slug]?.roleDefinition ?? mode.roleDefinition,
			whenToUse: customModePrompts[mode.slug]?.whenToUse ?? mode.whenToUse,
			customInstructions: customModePrompts[mode.slug]?.customInstructions ?? mode.customInstructions,
		}
		return {
			...overridden,
			// description is not overridable via customModePrompts, so we keep the
			// original and only fall back to a derived summary when it is blank.
			description: overridden.description?.trim() || getModeDisplayDescription(overridden),
		}
	})
}

// Helper function to get complete mode details with all overrides
export async function getFullModeDetails(
	modeSlug: string,
	customModes?: ModeConfig[],
	customModePrompts?: CustomModePrompts,
	options?: {
		cwd?: string
		globalCustomInstructions?: string
		language?: string
	},
): Promise<ModeConfig> {
	// First get the base mode config from custom modes or built-in modes
	const baseMode = getModeBySlug(modeSlug, customModes) || modes.find((m) => m.slug === modeSlug) || modes[0]

	// Check for any prompt component overrides
	const promptComponent = customModePrompts?.[modeSlug]

	// Get the base custom instructions
	const baseCustomInstructions = promptComponent?.customInstructions || baseMode.customInstructions || ""
	const baseWhenToUse = promptComponent?.whenToUse || baseMode.whenToUse || ""
	// description is not overridable via customModePrompts (same contract as
	// getAllModesWithPrompts) — keep the original and only fall back to a derived
	// summary when it is blank.
	const baseDescription = baseMode.description?.trim() || getModeDisplayDescription(baseMode)

	// If we have cwd, load and combine all custom instructions
	let fullCustomInstructions = baseCustomInstructions
	if (options?.cwd) {
		fullCustomInstructions = await addCustomInstructions(
			baseCustomInstructions,
			options.globalCustomInstructions || "",
			options.cwd,
			modeSlug,
			{ language: options.language },
		)
	}

	// Return mode with any overrides applied
	return {
		...baseMode,
		roleDefinition: promptComponent?.roleDefinition || baseMode.roleDefinition,
		whenToUse: baseWhenToUse,
		description: baseDescription,
		customInstructions: fullCustomInstructions,
	}
}

// Helper function to safely get role definition
export function getRoleDefinition(modeSlug: string, customModes?: ModeConfig[]): string {
	const mode = getModeBySlug(modeSlug, customModes)
	if (!mode) {
		console.warn(`No mode found for slug: ${modeSlug}`)
		return ""
	}
	return mode.roleDefinition
}

// Helper function to safely get description
export function getDescription(modeSlug: string, customModes?: ModeConfig[]): string {
	const mode = getModeBySlug(modeSlug, customModes)
	if (!mode) {
		console.warn(`No mode found for slug: ${modeSlug}`)
		return ""
	}
	return mode.description ?? ""
}

// Helper function to safely get whenToUse
export function getWhenToUse(modeSlug: string, customModes?: ModeConfig[]): string {
	const mode = getModeBySlug(modeSlug, customModes)
	if (!mode) {
		console.warn(`No mode found for slug: ${modeSlug}`)
		return ""
	}
	return mode.whenToUse ?? ""
}

// Helper function to safely get custom instructions
export function getCustomInstructions(modeSlug: string, customModes?: ModeConfig[]): string {
	const mode = getModeBySlug(modeSlug, customModes)
	if (!mode) {
		console.warn(`No mode found for slug: ${modeSlug}`)
		return ""
	}
	return mode.customInstructions ?? ""
}
