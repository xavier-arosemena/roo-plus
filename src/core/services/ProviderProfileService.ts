import * as vscode from "vscode"

import type { HistoryItem, ProviderName, ProviderSettings, ProviderSettingsEntry } from "@roo-code/types"

import { t } from "../../i18n"

import { ContextProxy } from "../config/ContextProxy"
import { ProviderSettingsManager } from "../config/ProviderSettingsManager"
import type { Task } from "../task/Task"

/**
 * Dependencies injected into {@link ProviderProfileService}.
 *
 * Narrow ports are injected for anything owned by `ClineProvider` (state
 * pushes, task-history persistence, mode/task accessors, API-handler rebuild,
 * logging, and the `ProviderProfileChanged` event) so the service stays
 * decoupled (mirroring the S2 `Pick<ClineProvider, ...>` pattern).
 */
export interface ProviderProfileServiceDeps {
	/** Global/secret state proxy used as the settings source of truth. */
	contextProxy: ContextProxy
	/**
	 * Getter for the provider profile manager.
	 *
	 * Read at call time (not captured) because callers/tests replace
	 * `provider.providerSettingsManager` with doubles after construction; the
	 * original implementation read `this.providerSettingsManager` dynamically.
	 */
	getProviderSettingsManager: () => ProviderSettingsManager
	/** Port that pushes full state to the webview. */
	postStateToWebview: () => Promise<void>
	/** Port that persists a task-history item (provider's public `updateTaskHistory`). */
	updateTaskHistory: (item: HistoryItem, options?: { broadcast?: boolean }) => Promise<HistoryItem[]>
	/** Port that reads the current mode. */
	getMode: () => Promise<string>
	/** Port that returns the current task (if any). */
	getCurrentTask: () => Task | undefined
	/** Port that rebuilds/syncs the current task's API handler. */
	updateTaskApiHandlerIfNeeded: (providerSettings: ProviderSettings, options?: { forceRebuild?: boolean }) => void
	/** Port that reads a single history item from the per-task store. */
	getTaskHistoryItem: (taskId: string) => HistoryItem | undefined
	/** Port that reads the globalState mirror of task history (downgrade fallback). */
	getGlobalTaskHistory: () => HistoryItem[]
	/** Log sink. */
	log: (message: string) => void
	/** Port that emits the `ProviderProfileChanged` event. */
	onProviderProfileChanged: (event: { name: string; provider?: string }) => void
}

/**
 * Owns provider-profile CRUD, activation, and sticky-profile persistence
 * previously embedded in `ClineProvider`.
 *
 * Extracted from the `ClineProvider` god-object (S3a). Public behavior,
 * error messages, and side-effect ordering are identical to the original
 * implementation; `ClineProvider` delegates to this service.
 */
export class ProviderProfileService {
	private readonly deps: ProviderProfileServiceDeps

	constructor(deps: ProviderProfileServiceDeps) {
		this.deps = deps
	}

	getProviderProfileEntries(): ProviderSettingsEntry[] {
		return this.deps.contextProxy.getValues().listApiConfigMeta || []
	}

	getProviderProfileEntry(name: string): ProviderSettingsEntry | undefined {
		return this.getProviderProfileEntries().find((profile) => profile.name === name)
	}

	hasProviderProfileEntry(name: string): boolean {
		return !!this.getProviderProfileEntry(name)
	}

	async upsertProviderProfile(
		name: string,
		providerSettings: ProviderSettings,
		activate: boolean = true,
	): Promise<string | undefined> {
		try {
			const providerSettingsManager = this.deps.getProviderSettingsManager()

			// TODO: Do we need to be calling `activateProfile`? It's not
			// clear to me what the source of truth should be; in some cases
			// we rely on the `ContextProxy`'s data store and in other cases
			// we rely on the `ProviderSettingsManager`'s data store. It might
			// be simpler to unify these two.
			const id = await providerSettingsManager.saveConfig(name, providerSettings)

			if (activate) {
				const mode = await this.deps.getMode()

				// These promises do the following:
				// 1. Adds or updates the list of provider profiles.
				// 2. Sets the current provider profile.
				// 3. Sets the current mode's provider profile.
				// 4. Copies the provider settings to the context.
				//
				// Note: 1, 2, and 4 can be done in one `ContextProxy` call:
				// this.contextProxy.setValues({ ...providerSettings, listApiConfigMeta: ..., currentApiConfigName: ... })
				// We should probably switch to that and verify that it works.
				// I left the original implementation in just to be safe.
				await Promise.all([
					this.deps.contextProxy.setValue("listApiConfigMeta", await providerSettingsManager.listConfig()),
					this.deps.contextProxy.setValue("currentApiConfigName", name),
					providerSettingsManager.setModeConfig(mode, id),
					this.deps.contextProxy.setProviderSettings(providerSettings),
				])

				// Change the provider for the current task.
				// TODO: We should rename `buildApiHandler` for clarity (e.g. `getProviderClient`).
				this.deps.updateTaskApiHandlerIfNeeded(providerSettings, { forceRebuild: true })

				// Keep the current task's sticky provider profile in sync with the newly-activated profile.
				await this.persistStickyProviderProfileToCurrentTask(name)
			} else {
				await this.deps.contextProxy.setValue("listApiConfigMeta", await providerSettingsManager.listConfig())
			}

			await this.deps.postStateToWebview()
			return id
		} catch (error) {
			this.deps.log(
				`Error create new api configuration: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
			)

			vscode.window.showErrorMessage(t("common:errors.create_api_config"))
			return undefined
		}
	}

	async deleteProviderProfile(profileToDelete: ProviderSettingsEntry) {
		const globalSettings = this.deps.contextProxy.getValues()
		let profileToActivate: string | undefined = globalSettings.currentApiConfigName

		if (profileToDelete.name === profileToActivate) {
			profileToActivate = this.getProviderProfileEntries().find(({ name }) => name !== profileToDelete.name)?.name
		}

		if (!profileToActivate) {
			throw new Error("You cannot delete the last profile")
		}

		const entries = this.getProviderProfileEntries().filter(({ name }) => name !== profileToDelete.name)

		await this.deps.contextProxy.setValues({
			...globalSettings,
			currentApiConfigName: profileToActivate,
			listApiConfigMeta: entries,
		})

		await this.deps.postStateToWebview()
	}

	async activateProviderProfile(
		args: { name: string } | { id: string },
		options?: { persistModeConfig?: boolean; persistTaskHistory?: boolean },
	): Promise<void> {
		const providerSettingsManager = this.deps.getProviderSettingsManager()

		const { name, id, ...providerSettings } = await providerSettingsManager.activateProfile(args)

		const persistModeConfig = options?.persistModeConfig ?? true
		const persistTaskHistory = options?.persistTaskHistory ?? true

		// See `upsertProviderProfile` for a description of what this is doing.
		await Promise.all([
			this.deps.contextProxy.setValue("listApiConfigMeta", await providerSettingsManager.listConfig()),
			this.deps.contextProxy.setValue("currentApiConfigName", name),
			this.deps.contextProxy.setProviderSettings(providerSettings),
		])

		const mode = await this.deps.getMode()

		if (id && persistModeConfig) {
			await providerSettingsManager.setModeConfig(mode, id)
		}

		// Change the provider for the current task.
		this.deps.updateTaskApiHandlerIfNeeded(providerSettings, { forceRebuild: true })

		// Update the current task's sticky provider profile, unless this activation is
		// being used purely as a non-persisting restoration (e.g., reopening a task from history).
		if (persistTaskHistory) {
			await this.persistStickyProviderProfileToCurrentTask(name)
		}

		await this.deps.postStateToWebview()

		if (providerSettings.apiProvider) {
			this.deps.onProviderProfileChanged({
				name,
				provider: providerSettings.apiProvider as ProviderName,
			})
		}
	}

	private async persistStickyProviderProfileToCurrentTask(apiConfigName: string): Promise<void> {
		const task = this.deps.getCurrentTask()
		if (!task) {
			return
		}

		try {
			// Update in-memory state immediately so sticky behavior works even before the task has
			// been persisted into taskHistory (it will be captured on the next save).
			task.setTaskApiConfigName(apiConfigName)

			const taskHistoryItem =
				this.deps.getTaskHistoryItem(task.taskId) ??
				this.deps.getGlobalTaskHistory().find((item) => item.id === task.taskId)

			if (taskHistoryItem) {
				await this.deps.updateTaskHistory({ ...taskHistoryItem, apiConfigName })
			}
		} catch (error) {
			// If persistence fails, log the error but don't fail the profile switch.
			this.deps.log(
				`Failed to persist provider profile switch for task ${task.taskId}: ${
					error instanceof Error ? error.message : String(error)
				}`,
			)
		}
	}
}
