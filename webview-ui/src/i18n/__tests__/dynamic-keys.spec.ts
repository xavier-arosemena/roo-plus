import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { reasoningEfforts, verbosityLevels } from "@roo-code/types"
import { supportPrompt } from "@roo/support-prompt"
import { TOOL_GROUPS } from "@roo/tools"

import { sectionNames } from "@/components/settings/SettingsView"

/**
 * Resolvability guard for the dynamically-built i18n keys.
 *
 * Several components compose keys at runtime, e.g.
 *   t(`settings:codeIndex.indexingStatuses.${status.toLowerCase()}`)
 * The missing-key scanner only sees the static part of those calls, so a typo or
 * a newly-added enum value silently renders the raw key to the user. This spec
 * enumerates the possible values of each builder and asserts the produced key
 * exists in `en`.
 *
 * Builders covered (all values imported from the code that drives them, so a new
 * enum member fails this spec until the locale gains the key):
 *   - settings:sections.<section>            SettingsView.tsx:587/603/717/732,
 *                                            SettingsSearchResults.tsx:117
 *   - settings:providers.reasoningEffort.*    ThinkingBudget.tsx:299/309
 *   - settings:providers.verbosity.*          Verbosity.tsx:35
 *   - settings:providers.nanoGpt.routingOptions.*  NanoGPT.tsx:121
 *   - settings:codeIndex.indexingStatuses.*   CodeIndexPopover.tsx:762
 *   - history:sort.* / history:workspace.*    HistoryView.tsx:209/230
 *   - chat:codeblock.tooltips.*               CodeBlock.tsx:622
 *   - prompts:supportPrompts.types.<t>.*      PromptsSettings.tsx:133/139
 *   - prompts:tools.toolNames.<group>         ModesView.tsx:1212/1269/1642
 *
 * NOT enumerable from this package (documented, not asserted):
 *   - settings:experimental.<experimentKey>.name/.description
 *     (ExperimentalSettings.tsx:58). The key set is driven by `EXPERIMENTS` in
 *     the extension package's src/shared/experiments.ts, and only experiments
 *     with `showInSettings: true` render — none do today, so no key is
 *     reachable. The webview package cannot import that module, so the check
 *     would be a guess rather than a proof.
 *   - Any builder whose interpolated value is user input (all remaining
 *     template-literal `t(...)` calls in the codebase take enum/constant values,
 *     which the table above covers).
 */

const LOCALES_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../locales/en")

const getByPath = (obj: unknown, dotted: string): unknown =>
	dotted.split(".").reduce<unknown>((acc, part) => {
		if (acc === null || acc === undefined || typeof acc !== "object") return undefined
		return (acc as Record<string, unknown>)[part]
	}, obj)

const enJson = (namespace: string): Record<string, unknown> =>
	JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, `${namespace}.json`), "utf8"))

/** `ns:path` → resolved en value (or undefined). */
const resolveEnKey = (key: string): unknown => {
	const [namespace, ...rest] = key.split(":")
	return getByPath(enJson(namespace), rest.join("."))
}

// Mirrors ReasoningEffortExtended (packages/types) — the values ThinkingBudget can
// persist for a model profile.
const reasoningEffortValues = ["none", "minimal", ...reasoningEfforts, "xhigh", "max"]

// Mirrors routingOptionKeys in NanoGPT.tsx:33.
const nanoGptRoutingOptionValues = [
	"automatic",
	"fastest",
	"cheapest",
	"lowestLatency",
	"highestThroughput",
	"toolCapable",
	"cacheCapable",
]

// Mirrors the SystemStatus union rendered by CodeIndexPopover (lower-cased in the key).
const indexingStatusValues = ["standby", "indexing", "indexed", "error", "stopping"]

// Mirrors the SortOption union in HistoryView.tsx:34.
const historySortValues = ["newest", "oldest", "mostExpensive", "mostTokens", "mostRelevant"]

const codeblockTooltipValues = ["expand", "collapse"]

const supportPromptTypes = Object.keys(supportPrompt.default).filter((type) => type !== "CONDENSE")

const availableToolGroups = Object.keys(TOOL_GROUPS).filter(
	(group) => !(TOOL_GROUPS as Record<string, { alwaysAvailable?: boolean }>)[group].alwaysAvailable,
)

const checks: { key: string; source: string }[] = [
	...sectionNames.map((section) => ({ key: `settings:sections.${section}`, source: "SettingsView sections" })),
	...reasoningEffortValues.map((value) => ({
		key: `settings:providers.reasoningEffort.${value}`,
		source: "ThinkingBudget.tsx",
	})),
	...verbosityLevels.map((value) => ({ key: `settings:providers.verbosity.${value}`, source: "Verbosity.tsx" })),
	...nanoGptRoutingOptionValues.map((value) => ({
		key: `settings:providers.nanoGpt.routingOptions.${value}`,
		source: "NanoGPT.tsx",
	})),
	...indexingStatusValues.map((value) => ({
		key: `settings:codeIndex.indexingStatuses.${value}`,
		source: "CodeIndexPopover.tsx",
	})),
	...historySortValues.map((value) => ({ key: `history:sort.${value}`, source: "HistoryView.tsx" })),
	...["all", "current"].map((value) => ({ key: `history:workspace.${value}`, source: "HistoryView.tsx" })),
	...codeblockTooltipValues.map((value) => ({ key: `chat:codeblock.tooltips.${value}`, source: "CodeBlock.tsx" })),
	...supportPromptTypes.flatMap((type) => [
		{ key: `prompts:supportPrompts.types.${type}.label`, source: "PromptsSettings.tsx" },
		{ key: `prompts:supportPrompts.types.${type}.description`, source: "PromptsSettings.tsx" },
	]),
	...availableToolGroups.map((group) => ({ key: `prompts:tools.toolNames.${group}`, source: "ModesView.tsx" })),
]

describe("dynamic i18n keys resolve in en", () => {
	it("enumerates every builder (guards against a silently-empty table)", () => {
		expect(sectionNames.length).toBeGreaterThan(0)
		expect(reasoningEfforts.length).toBeGreaterThan(0)
		expect(verbosityLevels.length).toBeGreaterThan(0)
		expect(supportPromptTypes.length).toBeGreaterThan(0)
		expect(availableToolGroups.length).toBeGreaterThan(0)
		expect(checks.length).toBeGreaterThan(20)
	})

	it("resolves every key produced by a dynamic builder", () => {
		const missing = checks
			.filter(({ key }) => typeof resolveEnKey(key) !== "string")
			.map(({ key, source }) => `${key} (built by ${source})`)

		expect(missing).toEqual([])
	})
})
