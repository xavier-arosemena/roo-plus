import { z } from "zod"

/**
 * Structural subset of `ExtensionState` for the outbound `state` message.
 *
 * The full `ExtensionState` interface (`packages/types/src/vscode-extension-host.ts`)
 * is large and only partially covered by zod schemas, so during the transitional
 * phase the boundary validates a SUBSET of well-known scalar fields while leaving
 * the complex nested payloads permissive (`z.unknown()`). `.passthrough()` retains
 * unknown/forward-compatible fields rather than stripping them — a `state` push is
 * a partial update that the webview merges, so it must never lose data.
 */
export const extensionStateSubsetSchema = z
	.object({
		version: z.string().optional(),
		uriScheme: z.string().optional(),
		language: z.string().optional(),
		cwd: z.string().optional(),
		machineId: z.string().optional(),
		mode: z.string().optional(),
		currentTaskId: z.string().optional(),
		apiModelId: z.string().optional(),
		renderContext: z.enum(["sidebar", "editor"]).optional(),
		telemetrySetting: z.string().optional(),
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
