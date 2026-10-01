import { z } from "zod"

import type { ExtensionState } from "../vscode-extension-host.js"

/**
 * Structural subset of `ExtensionState` for the outbound `state` message.
 *
 * The full `ExtensionState` interface (`packages/types/src/vscode-extension-host.ts`)
 * is large and only partially covered by zod schemas, so during the transitional
 * phase the boundary validates a SUBSET of well-known scalar fields while leaving
 * the complex nested payloads permissive (`z.unknown()`). `.passthrough()` retains
 * unknown/forward-compatible fields rather than stripping them — a `state` push is
 * a partial update that the webview merges, so it must never lose data.
 *
 * T2.1 (gray-webview follow-up) note. Extra/unknown fields were investigated as a
 * hydration-veto source and are NOT one: `.passthrough()` already accepts them
 * without rejecting, and stripping them here would DROP legitimate, unmodeled
 * `ExtensionState` fields (e.g. `soundEnabled`, `ttsEnabled`, `allowedCommands`,
 * `listApiConfigMeta`, …) that the webview still merges. The schema therefore
 * keeps `.passthrough()`; the degraded path for a payload that instead fails a
 * KNOWN field's type is {@link salvageExtensionState}, which strips unknown keys
 * and drops only the malformed ones.
 */
export const extensionStateSubsetSchema = z
	.object({
		version: z.string().optional(),
		uriScheme: z.string().optional(),
		language: z.string().optional(),
		cwd: z.string().optional(),
		mode: z.string().optional(),
		currentTaskId: z.string().optional(),
		apiModelId: z.string().optional(),
		renderContext: z.enum(["sidebar", "editor"]).optional(),
		platform: z.string().optional(),
		arch: z.string().optional(),
		mcpEnabled: z.boolean().optional(),
		taskSyncEnabled: z.boolean().optional(),
		autoCondenseContext: z.boolean().optional(),
		autoCondenseContextPercent: z.number().optional(),
		enableCheckpoints: z.boolean().optional(),
		checkpointTimeout: z.number().optional(),
		terminalShellIntegrationTimeout: z.number().optional(),
		maxOpenTabsContext: z.number().optional(),
		maxWorkspaceFiles: z.number().optional(),
		maxImageFileSize: z.number().optional(),
		maxTotalImageSize: z.number().optional(),
		writeDelayMs: z.number().optional(),
		diffFuzzyThreshold: z.number().optional(),
		showRooIgnoredFiles: z.boolean().optional(),
		enableSubfolderRules: z.boolean().optional(),
		hasOpenedModeSelector: z.boolean().optional(),
		mdmCompliant: z.boolean().optional(),
		debug: z.boolean().optional(),
		// Complex payloads — permissive during the transitional period.
		clineMessages: z.unknown().optional(),
		// Tail-anchored `clineMessages` window metadata (2026-09-15 payload incident).
		clineMessagesBounded: z.boolean().optional(),
		clineMessagesTotal: z.number().optional(),
		// Count+byte-bounded `taskHistory` window metadata (2026-09-17 incident).
		taskHistoryBounded: z.boolean().optional(),
		taskHistoryTotal: z.number().optional(),
		// Exclusive paging cursor for that window (tree-closed ancestor re-attachment).
		taskHistoryPagingAnchorTs: z.number().optional(),
		taskHistory: z.unknown().optional(),
		currentTaskItem: z.unknown().optional(),
		currentTaskTodos: z.unknown().optional(),
		apiConfiguration: z.unknown().optional(),
		customModes: z.unknown().optional(),
		experiments: z.unknown().optional(),
		organizationAllowList: z.unknown().optional(),
		messageQueue: z.unknown().optional(),
		marketplaceItems: z.unknown().optional(),
		marketplaceInstalledMetadata: z.unknown().optional(),
		profileThresholds: z.unknown().optional(),
		codebaseIndexConfig: z.unknown().optional(),
		codebaseIndexModels: z.unknown().optional(),
	})
	.passthrough()

export const stateMessageSchema = z.object({
	type: z.literal("state"),
	state: extensionStateSubsetSchema,
})

export type StateMessage = z.infer<typeof stateMessageSchema>

/**
 * Best-effort salvage for a `state` message whose payload FAILED the strict
 * {@link extensionStateSubsetSchema} validation (T2.1, gray-webview follow-up —
 * see `docs/incidents/2026-09-18-gray-webview.md`).
 *
 * WHY. The webview used to drop ANY `state` push that failed strict validation
 * and never hydrated, which leaves the panel permanently blank (`App.tsx` returns
 * `null` until `didHydrateState`). A single wrong-typed known scalar (e.g.
 * `currentTaskId: null`) was therefore enough to veto hydration forever. This
 * helper lets the caller hydrate with whatever is usable instead.
 *
 * SEMANTICS.
 * - Unknown/extra keys are STRIPPED: only keys declared on
 *   {@link extensionStateSubsetSchema} can survive.
 * - A KNOWN key whose value does not match its declared type is DROPPED rather
 *   than propagated (so one bad scalar cannot sink the whole push).
 * - A non-object `rawState` salvages to `{}` (hydrate with defaults), so a
 *   `state` message can never veto hydration.
 *
 * This is intentionally separate from {@link extensionStateSubsetSchema}: the
 * strict schema stays the boundary contract (and keeps `.passthrough()` so a
 * VALID push retains unmodeled `ExtensionState` fields), while salvage is only
 * the degraded path for a payload that would otherwise be rejected outright.
 */
export function salvageExtensionState(rawState: unknown): Partial<ExtensionState> {
	if (typeof rawState !== "object" || rawState === null || Array.isArray(rawState)) {
		return {}
	}

	const source = rawState as Record<string, unknown>
	const fields = Object.entries(extensionStateSubsetSchema.shape) as Array<[string, z.ZodType]>
	const salvaged: Record<string, unknown> = {}

	for (const [key, fieldSchema] of fields) {
		if (!Object.prototype.hasOwnProperty.call(source, key)) {
			continue
		}

		const parsed = fieldSchema.safeParse(source[key])
		if (parsed.success) {
			salvaged[key] = parsed.data
		}
	}

	// Every surviving key is declared on `extensionStateSubsetSchema` and its
	// value already passed that field's schema, so the result is a valid (partial)
	// `ExtensionState`; the single assertion only removes the record index type.
	return salvaged as Partial<ExtensionState>
}
