import * as vscode from "vscode"
import pWaitFor from "p-wait-for"

import { Anthropic } from "@anthropic-ai/sdk"

import {
	type ClineMessage,
	type CreateTaskOptions,
	type ExtensionMessage,
	type GlobalState,
	type HistoryItem,
	type ModeConfig,
	type OrganizationAllowList,
	type ProviderSettings,
	type RooCodeSettings,
	RooCodeEventName,
	type TodoItem,
} from "@roo-code/types"

import { ContextProxy } from "../config/ContextProxy"
import { ProviderSettingsManager } from "../config/ProviderSettingsManager"
import { Task } from "../task/Task"
import { TaskRegistry } from "../task/TaskRegistry"
import { TaskScheduler } from "../task/TaskScheduler"
import { type RateLimitClock } from "../task/RateLimitClock"
import { type ApiMessage, assertValidTransition } from "../task-persistence"
import { readTaskMessages } from "../task-persistence/taskMessages"
import { readApiMessages, saveApiMessages, saveTaskMessages } from "../task-persistence"
import { validateAndFixToolResultIds } from "../task/validateToolResultIds"
import { type PendingEditOperationInput } from "../webview/PendingEditOperationStore"

import { Package } from "../../shared/package"
import { type Mode, defaultModeSlug, getModeBySlug } from "../../shared/modes"
import { ProfileValidator } from "../../shared/ProfileValidator"
import { OrganizationAllowListViolationError } from "../../utils/errors"
import { t } from "../../i18n"

// Type-only import to break the value-level module cycle: TaskOrchestrator (value)
// imports Task (value) which imports ClineProvider (value, type-only used). Keeping
// this import type-only avoids adding a runtime edge to the existing ClineProvider↔Task cycle.
import type { ClineProvider } from "../webview/ClineProvider"

/**
 * Serializes delegation transitions per parent task.
 *
 * Fail-forward: run `fn` even if the previous transition rejected. A failed
 * cancelTask must not permanently block a subsequent reopenParentFromDelegation.
 * The `cancelledDelegationChildIds` guard inside each `fn` is the safety net.
 */
function runDelegationTransition<T>(
	locks: Map<string, Promise<void>>,
	parentTaskId: string,
	fn: () => Promise<T>,
): Promise<T> {
	const previous = locks.get(parentTaskId) ?? Promise.resolve()
	const current = previous.then(fn, fn)
	const tail = current.then(
		() => {},
		() => {},
	)

	locks.set(parentTaskId, tail)

	void tail.finally(() => {
		if (locks.get(parentTaskId) === tail) {
			locks.delete(parentTaskId)
		}
	})

	return current
}

function scheduleTask(scheduler: TaskScheduler, task: Task, source: string): void {
	void scheduler
		.schedule(task, () => task.run())
		.catch((error) => console.error(`[${source}] taskScheduler.schedule failed:`, error))
}

/**
 * The subset of `TaskHistoryStore` that {@link TaskOrchestrator} needs.
 * Kept intentionally narrow so the service can be unit-tested with a plain,
 * fully-typed double instead of a full store.
 */
export interface TaskHistoryStoreLike {
	get(id: string): HistoryItem | undefined
	atomicReadAndUpdate(id: string, updater: (current: HistoryItem) => HistoryItem): Promise<HistoryItem[]>
	atomicUpdatePair(
		firstId: string,
		secondId: string,
		firstUpdater: (item: HistoryItem) => HistoryItem,
		secondUpdater: (item: HistoryItem) => HistoryItem,
	): Promise<HistoryItem[]>
}

/**
 * The subset of `ExtensionState` returned by the provider's `getState` that the
 * moved orchestration methods read. Kept narrow so the port can be faked with a
 * plain object in unit tests.
 */
export interface TaskOrchestratorState {
	apiConfiguration: ProviderSettings
	enableCheckpoints: boolean
	checkpointTimeout: number
	experiments: Record<string, boolean>
	organizationAllowList: OrganizationAllowList
	diffFuzzyThreshold?: number
	taskSyncEnabled?: boolean
	mode?: string
}

/**
 * Dependencies injected into {@link TaskOrchestrator}.
 *
 * Narrow ports are injected instead of the full `ClineProvider` (mirroring the
 * S3a `TaskHistoryService`/`ProviderProfileService` DI pattern). Every port is a
 * function or getter that resolves `this.<member>` at call time so:
 * - `vi.spyOn(provider, "getState")` / `getGlobalState` / `updateTaskHistory` /
 *   `getTaskWithId` / `getCurrentTask` still intercept (the closures read the
 *   current provider member dynamically), and
 * - specs that replace `provider.taskRegistry` / `provider.taskScheduler` after
 *   construction are honored (getter ports).
 *
 * The only member that is the full provider is `provider`: `Task`'s constructor
 * types its `provider` option as `ClineProvider` (see TaskOptions), so task
 * instantiation fundamentally requires it. Everything else is a narrow port.
 */
export interface TaskOrchestratorDeps {
	/** Provider instance (required by Task's constructor). */
	provider: ClineProvider

	// ---- State access ----
	/** Getter port for the current task. */
	getCurrentTask: () => Task | undefined
	/** Getter port for the task registry (read at call time). */
	getTaskRegistry: () => TaskRegistry
	/** Getter port for the task scheduler (read at call time). */
	getTaskScheduler: () => TaskScheduler
	/** Getter port for the per-task file-backed history store. */
	getTaskHistoryStore: () => TaskHistoryStoreLike
	/** Getter port for the provider profile manager. */
	getProviderSettingsManager: () => ProviderSettingsManager
	/** Getter port for the VSCode extension context. */
	getContext: () => vscode.ExtensionContext
	/** Getter port for the context proxy (global storage path, etc.). */
	getContextProxy: () => ContextProxy
	/** Port that reads state (via `provider.getState` so spies intercept). */
	getState: () => Promise<TaskOrchestratorState>
	/** Port that reads global state (via `provider.getGlobalState` so spies intercept). */
	getGlobalState: <K extends keyof GlobalState>(key: K) => GlobalState[K]
	/** Port that writes global state (via `provider.updateGlobalState`). */
	updateGlobalState: <K extends keyof GlobalState>(key: K, value: GlobalState[K]) => Promise<void>

	// ---- Side effects ----
	/** Port that posts a message to the webview. */
	postMessageToWebview: (message: ExtensionMessage) => Promise<void>
	/**
	 * Port that emits a provider-level task event. Loosely typed because the
	 * provider's emitter is tuple-typed per event; the orchestrator only emits
	 * delegation events (TaskDelegated / TaskDelegationCompleted / TaskDelegationResumed).
	 */
	emit: (event: string, ...args: unknown[]) => boolean
	/** Log sink. */
	log: (message: string) => void

	// ---- Provider methods (delegated so fakes/tests can override them) ----
	evictCurrentTask: () => Promise<void>
	markDelegatedChildInterrupted: (params: { childTaskId: string; parentTaskId: string }) => Promise<void>
	removeClineFromStack: () => Promise<void>
	addClineToStack: (task: Task) => Promise<void>
	performPreparationTasks: (task: Task) => Promise<void>
	createTask: (
		text?: string,
		images?: string[],
		parentTask?: Task,
		options?: CreateTaskOptions,
		configuration?: RooCodeSettings,
	) => Promise<Task>
	createTaskWithHistoryItem: (
		historyItem: HistoryItem & { rootTask?: Task; parentTask?: Task },
		options?: { startTask?: boolean },
	) => Promise<Task | undefined>
	getTaskWithId: (id: string) => Promise<{ historyItem: HistoryItem }>
	deleteTaskWithId: (id: string, cascadeSubtasks?: boolean) => Promise<void>
	handleModeSwitch: (mode: Mode) => Promise<void>
	updateTaskHistory: (item: HistoryItem, options?: { broadcast?: boolean }) => Promise<HistoryItem[]>
	setValues: (values: RooCodeSettings) => Promise<void>
	setProviderProfile: (name: string) => Promise<void>
	activateProviderProfile: (
		args: { name: string } | { id: string },
		options?: { persistModeConfig?: boolean; persistTaskHistory?: boolean },
	) => Promise<void>
	showTaskWithId: (id: string) => Promise<void>
	getCustomModes: () => Promise<ModeConfig[]>
	updateCustomMode: (slug: string, config: ModeConfig) => Promise<void>
	getPendingEditOperation: (operationId: string) => PendingEditOperationInput | undefined
	clearPendingEditOperation: (operationId: string) => boolean
	/** Port that runs a serialized delegation transition (routes to provider's lock helper). */
	runDelegationTransition: <T>(parentTaskId: string, fn: () => Promise<T>) => Promise<T>

	// ---- Provider-owned state (accessed via ports; kept on the provider for test compat) ----
	/** Port for the per-task creation callback (provider event wiring). */
	getTaskCreationCallback: () => ((task: Task) => void) | undefined
	/** Port for the per-task event-listener cleanup registry. */
	getTaskEventListeners: () => WeakMap<Task, Array<() => void>>
	hasCancelledDelegationChildId: (childTaskId: string) => boolean
	addCancelledDelegationChildId: (childTaskId: string) => void
	deleteCancelledDelegationChildId: (childTaskId: string) => void
	/** Port that resets the provider-owned recent-tasks cache. */
	resetRecentTasksCache: () => void
	/** Port for the provider-owned rate limit clock. */
	getRateLimitClock: () => RateLimitClock
}

/**
 * Owns the task lifecycle and delegation/subtask state machine previously
 * embedded in `ClineProvider` (S3b extraction).
 *
 * Public behavior, error messages, `assertValidTransition` ordering, log output,
 * and side-effect ordering are identical to the original implementation.
 * `ClineProvider` delegates its public methods to this service.
 *
 * Cross-method calls always go through the injected ports (which route back to
 * the provider's public methods) rather than to sibling orchestrator methods, so
 * tests that stub e.g. `provider.createTask` / `provider.removeClineFromStack`
 * on a fake provider keep observing the same calls.
 */
export class TaskOrchestrator {
	private readonly deps: TaskOrchestratorDeps
	private delegationTransitionLocks?: Map<string, Promise<void>>

	constructor(deps: TaskOrchestratorDeps) {
		this.deps = deps
	}

	/**
	 * Serializes delegation transitions per parent task. Read via the injected
	 * `runDelegationTransition` port by delegation methods so fake providers can
	 * wrap it (e.g. the TOCTOU specs), and exposed here so `ClineProvider`'s thin
	 * private helper can delegate to it.
	 */
	runDelegationTransition<T>(parentTaskId: string, fn: () => Promise<T>): Promise<T> {
		this.delegationTransitionLocks ??= new Map()
		return runDelegationTransition(this.delegationTransitionLocks, parentTaskId, fn)
	}

	// Adds a new Task instance to the registry, marking the start of a new task.
	// The instance is pushed to the top of the stack (LIFO order).
	// When the task is completed, the top instance is removed, reactivating the
	// previous task.
	async addClineToStack(task: Task) {
		// Add this cline instance into the stack that represents the order of
		// all the called tasks.
		this.deps.getTaskRegistry().push(task)
		task.emit(RooCodeEventName.TaskFocused)

		// Perform special setup provider specific tasks.
		await this.deps.performPreparationTasks(task)

		// Ensure getState() resolves correctly.
		const state = await this.deps.getState()

		if (!state || typeof state.mode !== "string") {
			throw new Error(t("common:errors.retrieve_current_mode"))
		}
	}

	// Removes and destroys the top Cline instance (the current finished task),
	// activating the previous one (resuming the parent task).
	async removeClineFromStack() {
		const taskRegistry = this.deps.getTaskRegistry()
		if (taskRegistry.length === 0) {
			return
		}

		// Remove the focused Cline instance from the stack.
		let task = taskRegistry.current
		if (task) {
			task = taskRegistry.remove(task.taskId)
		}

		if (task) {
			task.emit(RooCodeEventName.TaskUnfocused)

			try {
				// Abort the running task and set isAbandoned to true so
				// all running promises will exit as well.
				await task.abortTask(true)
			} catch (e) {
				this.deps.log(
					`[ClineProvider#removeClineFromStack] abortTask() failed ${task.taskId}.${task.instanceId}: ${e.message}`,
				)
			}

			// Remove event listeners before clearing the reference.
			const cleanupFunctions = this.deps.getTaskEventListeners().get(task)

			if (cleanupFunctions) {
				cleanupFunctions.forEach((cleanup) => cleanup())
				this.deps.getTaskEventListeners().delete(task)
			}

			// Make sure no reference kept, once promises end it will be
			// garbage collected.
			task = undefined
		}
	}

	/**
	 * Evicts the current task from the stack and, if it was an active delegated child,
	 * marks it interrupted so the parent stays delegated (rather than silently losing the link).
	 *
	 * Use this in place of bare removeClineFromStack() at any call site that is not itself
	 * part of a delegation transition (i.e. everywhere except delegateParentAndOpenChild,
	 * createTask with a parentTask, and reopenParentFromDelegation).
	 */
	public async evictCurrentTask(): Promise<void> {
		const current = this.deps.getCurrentTask()
		const storedHistory = current ? this.deps.getTaskHistoryStore().get(current.taskId) : undefined
		await this.deps.removeClineFromStack()
		if (storedHistory?.status === "active" && storedHistory.parentTaskId) {
			await this.deps.markDelegatedChildInterrupted({
				childTaskId: storedHistory.id,
				parentTaskId: storedHistory.parentTaskId,
			})
		}
	}

	/**
	 * Marks a live delegated child as "interrupted" when it is evicted without completing
	 * (e.g. user hits + for a new task, or navigates away while the child is still active).
	 *
	 * This preserves the delegation link — the parent stays "delegated" with awaitingChildId
	 * intact — so the user can later resume or abandon the interrupted child. It is the live-
	 * eviction counterpart to cancelTask()'s interruption path and to reopenParentFromDelegation()
	 * (which handles normal child completion).
	 *
	 * Must be called AFTER removeClineFromStack() so the live Task's final saveClineMessages()
	 * does not reattach the child's parentTaskId/rootTaskId over the interrupted status.
	 */
	public async markDelegatedChildInterrupted({
		childTaskId,
		parentTaskId,
	}: {
		childTaskId: string
		parentTaskId: string
	}): Promise<void> {
		// Fast path: already interrupted (cancelTask beat us to it), nothing to do.
		if (this.deps.getTaskHistoryStore().get(childTaskId)?.status === "interrupted") {
			this.deps.log(`[markDelegatedChildInterrupted] Child ${childTaskId} already interrupted — skipping`)
			return
		}

		try {
			await this.deps.runDelegationTransition(parentTaskId, async () => {
				const { historyItem: parentHistory } = await this.deps.getTaskWithId(parentTaskId)

				if (parentHistory?.status !== "delegated" || parentHistory?.awaitingChildId !== childTaskId) {
					this.deps.log(
						`[markDelegatedChildInterrupted] Parent ${parentTaskId} no longer delegated to child ${childTaskId} — skipping`,
					)
					return
				}

				// Prefer the in-memory store entry: it is written by delegateParentAndOpenChild
				// with the correct parentTaskId before the child saves its first message.
				// getTaskWithId reads from disk and may return an incomplete record (missing
				// parentTaskId) if the child was evicted before its first saveClineMessages().
				const childHistory =
					this.deps.getTaskHistoryStore().get(childTaskId) ??
					(await this.deps.getTaskWithId(childTaskId)).historyItem

				// Re-check inside the lock to close the TOCTOU window with cancelTask() or
				// a concurrent completion. Only proceed when the child is still "active";
				// any other terminal status (interrupted, completed) must not be overwritten.
				if (childHistory?.status !== "active") {
					this.deps.log(
						`[markDelegatedChildInterrupted] Child ${childTaskId} is no longer active (status=${childHistory?.status}) — skipping`,
					)
					return
				}

				const interruptedChild = { ...childHistory, status: "interrupted" as const }
				await this.deps.updateTaskHistory(interruptedChild)
				await this.deps.postMessageToWebview({
					type: "taskHistoryItemUpdated",
					taskHistoryItem: interruptedChild,
				})
				await this.deps.postMessageToWebview({ type: "taskHistoryItemUpdated", taskHistoryItem: parentHistory })
				this.deps.log(
					`[markDelegatedChildInterrupted] Marked child ${childTaskId} interrupted; parent ${parentTaskId} stays delegated`,
				)
			})
		} catch (err) {
			this.deps.log(
				`[markDelegatedChildInterrupted] Failed for child ${childTaskId}: ${err instanceof Error ? err.message : String(err)}`,
			)
		}
	}

	public async createTaskWithHistoryItem(
		historyItem: HistoryItem & { rootTask?: Task; parentTask?: Task },
		options?: { startTask?: boolean },
	) {
		const isCliRuntime = process.env.ROO_CLI_RUNTIME === "1"
		// CLI injects runtime provider settings from command flags/env at startup.
		// Restoring provider profiles from task history can overwrite those
		// runtime settings with stale/incomplete persisted profiles.
		const skipProfileRestoreFromHistory = isCliRuntime

		// Check if we're rehydrating the current task to avoid flicker
		const currentTask = this.deps.getCurrentTask()
		const isRehydratingCurrentTask = currentTask && currentTask.taskId === historyItem.id

		if (!isRehydratingCurrentTask) {
			await this.deps.evictCurrentTask()
		}

		// If the history item has a saved mode, restore it and its associated API configuration.
		if (historyItem.mode) {
			// Validate that the mode still exists
			const customModes = await this.deps.getCustomModes()
			const modeExists = getModeBySlug(historyItem.mode, customModes) !== undefined

			if (!modeExists) {
				// Mode no longer exists, fall back to default mode.
				this.deps.log(
					`Mode '${historyItem.mode}' from history no longer exists. Falling back to default mode '${defaultModeSlug}'.`,
				)
				historyItem.mode = defaultModeSlug
			}

			await this.deps.updateGlobalState("mode", historyItem.mode)

			// Load the saved API config for the restored mode if it exists.
			// Skip mode-based profile activation if historyItem.apiConfigName exists,
			// since the task's specific provider profile will override it anyway.
			const lockApiConfigAcrossModes = this.deps
				.getContext()
				.workspaceState.get("lockApiConfigAcrossModes", false)

			if (!historyItem.apiConfigName && !lockApiConfigAcrossModes && !skipProfileRestoreFromHistory) {
				const savedConfigId = await this.deps.getProviderSettingsManager().getModeConfigId(historyItem.mode)
				const listApiConfig = await this.deps.getProviderSettingsManager().listConfig()

				// Update listApiConfigMeta first to ensure UI has latest data.
				await this.deps.updateGlobalState("listApiConfigMeta", listApiConfig)

				// If this mode has a saved config, use it.
				if (savedConfigId) {
					const profile = listApiConfig.find(({ id }) => id === savedConfigId)

					if (profile?.name) {
						try {
							// Check if the profile has actual API configuration (not just an id).
							// In CLI mode, the ProviderSettingsManager may return empty default profiles
							// that only contain 'id' and 'name' fields. Activating such a profile would
							// overwrite the CLI's working API configuration with empty settings.
							const fullProfile = await this.deps
								.getProviderSettingsManager()
								.getProfile({ name: profile.name })
							const hasActualSettings = !!fullProfile.apiProvider

							if (hasActualSettings) {
								await this.deps.activateProviderProfile({ name: profile.name })
							} else {
								// The task will continue with the current/default configuration.
							}
						} catch (error) {
							// Log the error but continue with task restoration.
							this.deps.log(
								`Failed to restore API configuration for mode '${historyItem.mode}': ${
									error instanceof Error ? error.message : String(error)
								}. Continuing with default configuration.`,
							)
							// The task will continue with the current/default configuration.
						}
					}
				}
			}
		}

		// If the history item has a saved API config name (provider profile), restore it.
		// This overrides any mode-based config restoration above, because the task's
		// specific provider profile takes precedence over mode defaults.
		if (historyItem.apiConfigName && !skipProfileRestoreFromHistory) {
			const listApiConfig = await this.deps.getProviderSettingsManager().listConfig()
			// Keep global state/UI in sync with latest profiles for parity with mode restoration above.
			await this.deps.updateGlobalState("listApiConfigMeta", listApiConfig)
			const profile = listApiConfig.find(({ name }) => name === historyItem.apiConfigName)

			if (profile?.name) {
				try {
					if (profile.apiProvider) {
						await this.deps.activateProviderProfile(
							{ name: profile.name },
							{ persistModeConfig: false, persistTaskHistory: false },
						)
					}
				} catch (error) {
					// Log the error but continue with task restoration.
					this.deps.log(
						`Failed to restore API configuration '${historyItem.apiConfigName}' for task: ${
							error instanceof Error ? error.message : String(error)
						}. Continuing with current configuration.`,
					)
				}
			} else {
				// Profile no longer exists, log warning but continue
				this.deps.log(
					`Provider profile '${historyItem.apiConfigName}' from history no longer exists. Using current configuration.`,
				)
			}
		} else if (historyItem.apiConfigName && skipProfileRestoreFromHistory) {
			this.deps.log(
				`Skipping restore of provider profile '${historyItem.apiConfigName}' for task ${historyItem.id} in CLI runtime.`,
			)
		}

		const {
			apiConfiguration,
			enableCheckpoints,
			checkpointTimeout,
			experiments,
			taskSyncEnabled,
			diffFuzzyThreshold,
		} = await this.deps.getState()

		const task = new Task({
			provider: this.deps.provider,
			apiConfiguration,
			enableCheckpoints,
			checkpointTimeout,
			consecutiveMistakeLimit: apiConfiguration.consecutiveMistakeLimit,
			historyItem,
			experiments,
			rootTask: historyItem.rootTask,
			parentTask: historyItem.parentTask,
			taskNumber: historyItem.number,
			workspacePath: historyItem.workspace,
			onCreated: this.deps.getTaskCreationCallback(),
			startTask: false,
			// Preserve the status from the history item to avoid overwriting it when the task saves messages
			initialStatus: historyItem.status,
			rateLimitClock: this.deps.getRateLimitClock(),
			diffFuzzyThreshold,
		})

		if (isRehydratingCurrentTask) {
			// Replace the current task in-place to avoid UI flicker
			const taskRegistry = this.deps.getTaskRegistry()
			const oldTask = taskRegistry.current

			if (oldTask) {
				// Abort the old task to stop running processes and mark as abandoned
				try {
					await oldTask.abortTask(true)
				} catch (e) {
					this.deps.log(
						`[createTaskWithHistoryItem] abortTask() failed for old task ${oldTask.taskId}.${oldTask.instanceId}: ${e.message}`,
					)
				}

				// Remove event listeners from the old task
				const cleanupFunctions = this.deps.getTaskEventListeners().get(oldTask)
				if (cleanupFunctions) {
					cleanupFunctions.forEach((cleanup) => cleanup())
					this.deps.getTaskEventListeners().delete(oldTask)
				}

				// Replace in-place: preserves stack index and current pointer
				taskRegistry.replace(oldTask.taskId, task)
			}

			task.emit(RooCodeEventName.TaskFocused)

			// Perform preparation tasks and set up event listeners
			await this.deps.performPreparationTasks(task)

			this.deps.log(
				`[createTaskWithHistoryItem] rehydrated task ${task.taskId}.${task.instanceId} in-place (flicker-free)`,
			)

			if (options?.startTask !== false) {
				scheduleTask(this.deps.getTaskScheduler(), task, "createTaskWithHistoryItem")
			}
		} else {
			await this.deps.addClineToStack(task)

			this.deps.log(
				`[createTaskWithHistoryItem] ${task.parentTask ? "child" : "parent"} task ${task.taskId}.${task.instanceId} instantiated`,
			)

			if (options?.startTask !== false) {
				scheduleTask(this.deps.getTaskScheduler(), task, "createTaskWithHistoryItem")
			}
		}

		// Check if there's a pending edit after checkpoint restoration
		const operationId = `task-${task.taskId}`
		const pendingEdit = this.deps.getPendingEditOperation(operationId)
		if (pendingEdit) {
			this.deps.clearPendingEditOperation(operationId) // Clear the pending edit

			this.deps.log(`[createTaskWithHistoryItem] Processing pending edit after checkpoint restoration`)

			// Process the pending edit after a short delay to ensure the task is fully initialized
			setTimeout(async () => {
				try {
					// Find the message index in the restored state
					const { messageIndex, apiConversationHistoryIndex } = (() => {
						const messageIndex = task.clineMessages.findIndex((msg) => msg.ts === pendingEdit.messageTs)
						const apiConversationHistoryIndex = task.apiConversationHistory.findIndex(
							(msg) => msg.ts === pendingEdit.messageTs,
						)
						return { messageIndex, apiConversationHistoryIndex }
					})()

					if (messageIndex !== -1) {
						// Remove the target message and all subsequent messages
						await task.overwriteClineMessages(task.clineMessages.slice(0, messageIndex))

						if (apiConversationHistoryIndex !== -1) {
							await task.overwriteApiConversationHistory(
								task.apiConversationHistory.slice(0, apiConversationHistoryIndex),
							)
						}

						// Process the edited message
						await task.handleWebviewAskResponse(
							"messageResponse",
							pendingEdit.editedContent,
							pendingEdit.images,
						)
					}
				} catch (error) {
					this.deps.log(`[createTaskWithHistoryItem] Error processing pending edit: ${error}`)
				}
			}, 100) // Small delay to ensure task is fully ready
		}

		return task
	}

	public async createTask(
		text?: string,
		images?: string[],
		parentTask?: Task,
		options: CreateTaskOptions = {},
		configuration: RooCodeSettings = {},
	): Promise<Task> {
		if (configuration) {
			await this.deps.setValues(configuration)

			if (configuration.allowedCommands) {
				await vscode.workspace
					.getConfiguration(Package.name)
					.update("allowedCommands", configuration.allowedCommands, vscode.ConfigurationTarget.Global)
			}

			if (configuration.deniedCommands) {
				await vscode.workspace
					.getConfiguration(Package.name)
					.update("deniedCommands", configuration.deniedCommands, vscode.ConfigurationTarget.Global)
			}

			if (configuration.commandExecutionTimeout !== undefined) {
				await vscode.workspace
					.getConfiguration(Package.name)
					.update(
						"commandExecutionTimeout",
						configuration.commandExecutionTimeout,
						vscode.ConfigurationTarget.Global,
					)
			}

			if (configuration.currentApiConfigName) {
				await this.deps.setProviderProfile(configuration.currentApiConfigName)
			}

			// Register custom modes so the CustomModesManager knows about them.
			// setValues writes to global state, but the manager overwrites that
			// when it merges .roomodes + global settings on refresh.  Persisting
			// via updateCustomMode ensures modes survive the merge cycle.
			if (configuration.customModes?.length) {
				for (const mode of configuration.customModes) {
					await this.deps.updateCustomMode(mode.slug, mode)
				}
			}
		}

		const {
			apiConfiguration,
			enableCheckpoints,
			checkpointTimeout,
			experiments,
			organizationAllowList,
			diffFuzzyThreshold,
		} = await this.deps.getState()

		// Single-open-task invariant: always enforce for user-initiated top-level tasks.
		if (!parentTask) {
			await this.deps.evictCurrentTask().catch(() => {
				// Non-fatal
			})
		}

		if (!ProfileValidator.isProfileAllowed(apiConfiguration, organizationAllowList)) {
			throw new OrganizationAllowListViolationError(t("common:errors.violated_organization_allowlist"))
		}

		const task = new Task({
			provider: this.deps.provider,
			apiConfiguration,
			enableCheckpoints,
			checkpointTimeout,
			consecutiveMistakeLimit: apiConfiguration.consecutiveMistakeLimit,
			task: text,
			images,
			experiments,
			rootTask: this.deps.getTaskRegistry().getAll()[0],
			parentTask,
			taskNumber: this.deps.getTaskRegistry().length + 1,
			onCreated: this.deps.getTaskCreationCallback(),
			initialTodos: options.initialTodos,
			// Ensure this task is present in the registry before startTask() emits
			// its initial state update, so state.currentTaskId is available ASAP.
			startTask: false,
			diffFuzzyThreshold,
			...options,
			rateLimitClock: this.deps.getRateLimitClock(),
		})

		await this.deps.addClineToStack(task)
		if (options.startTask !== false) {
			scheduleTask(this.deps.getTaskScheduler(), task, "createTask")
		}

		this.deps.log(
			`[createTask] ${task.parentTask ? "child" : "parent"} task ${task.taskId}.${task.instanceId} instantiated`,
		)

		return task
	}

	public async cancelTask(): Promise<void> {
		const task = this.deps.getCurrentTask()

		if (!task) {
			return
		}

		console.log(`[cancelTask] cancelling task ${task.taskId}.${task.instanceId}`)
		await this.cancelTaskInternal(task)
	}

	public async cancelTaskInternal(task: Task): Promise<void> {
		let historyItem: HistoryItem | undefined
		try {
			const history = await this.deps.getTaskWithId(task.taskId)
			historyItem = history.historyItem
		} catch (error) {
			// During task startup there is a short window where currentTask exists
			// but task history has not been persisted yet. Cancelling should still
			// abort safely; we just skip post-cancel rehydration in that case.
			if (error instanceof Error && error.message === "Task not found") {
				this.deps.log(`[cancelTask] task history missing for ${task.taskId}; skipping rehydrate`)
			} else {
				throw error
			}
		}

		// Preserve parent and root task information for history item.
		let rootTask = task.rootTask
		let parentTask = task.parentTask

		// Mark this as a user-initiated cancellation so provider-only rehydration can occur
		task.abortReason = "user_cancelled"

		// Capture the current instance to detect if rehydrate already occurred elsewhere
		const originalInstanceId = task.instanceId

		// Immediately cancel the underlying HTTP request if one is in progress
		// This ensures the stream fails quickly rather than waiting for network timeout
		task.cancelCurrentRequest()

		// Kick off abort (sets abort flag synchronously; stream exit and final saveClineMessages
		// happen asynchronously). We capture the promise so we can await its completion below —
		// this ensures task.initialStatus ("active") cannot overwrite "interrupted" after we
		// persist it (issue #560).
		const abortPromise = task.abortTask()

		// Immediately mark the original instance as abandoned to prevent any residual activity
		task.abandoned = true

		await pWaitFor(
			() =>
				this.deps.getCurrentTask()! === undefined ||
				this.deps.getCurrentTask()!.isStreaming === false ||
				this.deps.getCurrentTask()!.didFinishAbortingStream ||
				// If only the first chunk is processed, then there's no
				// need to wait for graceful abort (closes edits, browser,
				// etc).
				this.deps.getCurrentTask()!.isWaitingForFirstChunk,
			{
				timeout: 3_000,
			},
		).catch(() => {
			console.error("Failed to abort task")
		})

		// Wait for abortTask to fully settle (including its final saveClineMessages write)
		// before we persist "interrupted", so our write is always the last one.
		await abortPromise.catch(() => {})

		// Defensive safeguard: if current instance already changed, skip rehydrate
		const current = this.deps.getCurrentTask()
		if (current && current.instanceId !== originalInstanceId) {
			this.deps.log(
				`[cancelTask] Skipping rehydrate: current instance ${current.instanceId} != original ${originalInstanceId}`,
			)
			return
		}

		// Final race check before rehydrate to avoid duplicate rehydration
		{
			const currentAfterCheck = this.deps.getCurrentTask()
			if (currentAfterCheck && currentAfterCheck.instanceId !== originalInstanceId) {
				this.deps.log(
					`[cancelTask] Skipping rehydrate after final check: current instance ${currentAfterCheck.instanceId} != original ${originalInstanceId}`,
				)
				return
			}
		}

		if (!historyItem) {
			return
		}

		if (task.parentTaskId) {
			try {
				await this.deps.runDelegationTransition(task.parentTaskId, async () => {
					const { historyItem: parentHistory } = await this.deps.getTaskWithId(task.parentTaskId!)

					if (parentHistory?.status === "delegated" && parentHistory?.awaitingChildId === task.taskId) {
						// Mark the child interrupted and leave parent delegated with awaitingChildId
						// intact — the user can resume this child later and it will report back.
						historyItem = { ...historyItem!, status: "interrupted" }
						await this.deps.updateTaskHistory(historyItem)
						// Clear any stale fail-closed entry from a prior failed cancel attempt so
						// reopenParentFromDelegation is not incorrectly blocked on resume.
						this.deps.deleteCancelledDelegationChildId(task.taskId)
						this.deps.log(
							`[cancelTask] Marked child ${task.taskId} interrupted; parent ${task.parentTaskId} stays delegated`,
						)
					}
				})
			} catch (error) {
				// Fail closed: if we cannot persist the interrupted status, sever the link
				// so later completions don't reopen a stale delegated parent.
				parentTask = undefined
				rootTask = undefined
				this.deps.addCancelledDelegationChildId(task.taskId)
				historyItem = {
					...historyItem,
					parentTaskId: undefined,
					rootTaskId: undefined,
				}
				try {
					await this.deps.updateTaskHistory(historyItem)
				} catch (historyError) {
					this.deps.log(
						`[cancelTask] Failed to persist interrupted child state for ${task.taskId}: ${
							historyError instanceof Error ? historyError.message : String(historyError)
						}`,
					)
					throw historyError
				}
				this.deps.log(
					`[cancelTask] Failed to mark child interrupted for ${task.taskId}: ${
						error instanceof Error ? error.message : String(error)
					}`,
				)
			}
		}

		// Clears task again, so we need to abortTask manually above.
		await this.deps.createTaskWithHistoryItem({ ...historyItem, rootTask, parentTask })
	}

	// Clear the current task without treating it as a subtask.
	// This is used when the user cancels a task that is not a subtask.
	public async clearTask(): Promise<void> {
		const task = this.deps.getTaskRegistry().current
		if (task) {
			console.log(`[clearTask] clearing task ${task.taskId}.${task.instanceId}`)
			await this.deps.removeClineFromStack()
		}
	}

	public resumeTask(taskId: string): void {
		// Use the existing showTaskWithId method which handles both current and
		// historical tasks.
		this.deps.showTaskWithId(taskId).catch((error) => {
			this.deps.log(`Failed to resume task ${taskId}: ${error.message}`)
		})
	}

	public async delegateParentAndOpenChild(params: {
		parentTaskId: string
		message: string
		initialTodos: TodoItem[]
		mode: string
	}): Promise<Task> {
		const { parentTaskId, message, initialTodos, mode } = params

		// Metadata-driven delegation is always enabled

		// 1) Get parent (must be current task)
		const parent = this.deps.getCurrentTask()
		if (!parent) {
			throw new Error("[delegateParentAndOpenChild] No current task")
		}
		if (parent.taskId !== parentTaskId) {
			throw new Error(
				`[delegateParentAndOpenChild] Parent mismatch: expected ${parentTaskId}, current ${parent.taskId}`,
			)
		}
		// 2) Flush pending tool results to API history BEFORE disposing the parent.
		//    This is critical: when tools are called before new_task,
		//    their tool_result blocks are in userMessageContent but not yet saved to API history.
		//    If we don't flush them, the parent's API conversation will be incomplete and
		//    cause 400 errors when resumed (missing tool_result for tool_use blocks).
		//
		//    NOTE: We do NOT pass the assistant message here because the assistant message
		//    is already added to apiConversationHistory by the normal flow in
		//    recursivelyMakeClineRequests BEFORE tools start executing. We only need to
		//    flush the pending user message with tool_results.
		try {
			const flushSuccess = await parent.flushPendingToolResultsToHistory()

			if (!flushSuccess) {
				console.warn(`[delegateParentAndOpenChild] Flush failed for parent ${parentTaskId}, retrying...`)
				const retrySuccess = await parent.retrySaveApiConversationHistory()

				if (!retrySuccess) {
					console.error(
						`[delegateParentAndOpenChild] CRITICAL: Parent ${parentTaskId} API history not persisted to disk. Child return may produce stale state.`,
					)
					vscode.window.showWarningMessage(
						"Warning: Parent task state could not be saved. The parent task may lose recent context when resumed.",
					)
				}
			}
		} catch (error) {
			this.deps.log(
				`[delegateParentAndOpenChild] Error flushing pending tool results (non-fatal): ${
					error instanceof Error ? error.message : String(error)
				}`,
			)
		}

		// 3) Enforce single-open invariant by closing/disposing the parent first
		//    This ensures we never have >1 tasks open at any time during delegation.
		//    Await abort completion to ensure clean disposal and prevent unhandled rejections.
		try {
			await this.deps.removeClineFromStack()
		} catch (error) {
			this.deps.log(
				`[delegateParentAndOpenChild] Error during parent disposal (non-fatal): ${
					error instanceof Error ? error.message : String(error)
				}`,
			)
			// Non-fatal: proceed with child creation even if parent cleanup had issues
		}

		// 3) Switch provider mode to child's requested mode BEFORE creating the child task
		//    This ensures the child's system prompt and configuration are based on the correct mode.
		//    The mode switch must happen before createTask() because the Task constructor
		//    initializes its mode from provider.getState() during initializeTaskMode().
		try {
			await this.deps.handleModeSwitch(mode as Mode)
		} catch (e) {
			this.deps.log(
				`[delegateParentAndOpenChild] handleModeSwitch failed for mode '${mode}': ${
					(e as Error)?.message ?? String(e)
				}`,
			)
		}

		// 4) Create child as sole active (parent reference preserved for lineage)
		// Pass initialStatus: "active" to ensure the child task's historyItem is created
		// with status from the start, avoiding race conditions where the task might
		// call attempt_completion before status is persisted separately.
		//
		// Pass startTask: false to prevent the child from beginning its task loop
		// (and writing to globalState via saveClineMessages → updateTaskHistory)
		// before we persist the parent's delegation metadata in step 5.
		// Without this, the child's fire-and-forget startTask() races with step 5,
		// and the last writer to globalState overwrites the other's changes—
		// causing the parent's delegation fields to be lost.
		const child = await this.deps.createTask(message, undefined, parent, {
			initialTodos,
			initialStatus: "active",
			startTask: false,
		})

		// 5) Persist parent delegation metadata BEFORE the child starts writing.
		//    atomicReadAndUpdate reads from the in-memory cache and writes back within a
		//    single lock acquisition — no concurrent writer can slip between the read and
		//    write, and the pure updater cannot re-enter the lock (no deadlock).
		//    Broadcast and cache invalidation happen outside the lock after it releases.
		//
		//    If the parent is already "delegated" to a previous interrupted child (the user
		//    navigated back to the parent and continued working), we implicitly sever the old
		//    link here (delegated → active → delegated) so no explicit Abandon step is needed.
		//    The old awaited child's status is re-read INSIDE the updater (which runs
		//    synchronously under the store lock) so a concurrent abandon or completion cannot
		//    slip between the status snapshot and the write. An active child must never be
		//    silently detached.
		try {
			await this.deps.getTaskHistoryStore().atomicReadAndUpdate(parentTaskId, (historyItem) => {
				let base = historyItem
				if (historyItem.status === "delegated") {
					// Re-read the awaited child's current status under the store lock.
					const awaitedChildStatus = historyItem.awaitingChildId
						? this.deps.getTaskHistoryStore().get(historyItem.awaitingChildId)?.status
						: undefined
					// Only sever the stale link when the old child is confirmed interrupted.
					// If it is still active, throw so the rollback path cleans up the new child
					// rather than silently detaching a live task.
					if (awaitedChildStatus !== "interrupted") {
						throw new Error(
							`[delegateParentAndOpenChild] Cannot re-delegate: existing child ${historyItem.awaitingChildId} is ${awaitedChildStatus}, not interrupted`,
						)
					}
					// Implicit sever of the stale interrupted-child link.
					// The old child keeps its interrupted status; we just clear the parent's pointer.
					base = {
						...historyItem,
						status: "active" as const,
						awaitingChildId: undefined,
						delegatedToId: undefined,
					}
				}
				assertValidTransition(base.status, "delegated")
				const childIds = Array.from(new Set([...(base.childIds ?? []), child.taskId]))
				return {
					...base,
					status: "delegated" as const,
					delegatedToId: child.taskId,
					awaitingChildId: child.taskId,
					childIds,
				}
			})
			this.deps.resetRecentTasksCache()
			if (this.deps.provider.isViewLaunched) {
				const updatedItem = this.deps.getTaskHistoryStore().get(parentTaskId)
				if (updatedItem) {
					await this.deps.postMessageToWebview({
						type: "taskHistoryItemUpdated",
						taskHistoryItem: updatedItem,
					})
				}
			}
		} catch (err) {
			this.deps.log(
				`[delegateParentAndOpenChild] Failed to persist parent metadata for ${parentTaskId} -> ${child.taskId}: ${
					(err as Error)?.message ?? String(err)
				}`,
			)
			try {
				// Only pop the stack if the child we just created is still on top.
				// A concurrent delegation could have pushed another child since we created ours.
				if (this.deps.getCurrentTask()?.taskId === child.taskId) {
					await this.deps.removeClineFromStack()
				}
			} catch (cleanupError) {
				this.deps.log(
					`[delegateParentAndOpenChild] Failed to close paused child ${child.taskId} during rollback: ${
						(cleanupError as Error)?.message ?? String(cleanupError)
					}`,
				)
			}
			try {
				await this.deps.deleteTaskWithId(child.taskId, false)
			} catch (cleanupError) {
				this.deps.log(
					`[delegateParentAndOpenChild] Failed to delete paused child ${child.taskId} during rollback: ${
						(cleanupError as Error)?.message ?? String(cleanupError)
					}`,
				)
			}
			try {
				const { historyItem: parentHistory } = await this.deps.getTaskWithId(parentTaskId)
				await this.deps.createTaskWithHistoryItem(parentHistory)
			} catch (rollbackError) {
				this.deps.log(
					`[delegateParentAndOpenChild] Failed to restore parent ${parentTaskId} during rollback: ${
						(rollbackError as Error)?.message ?? String(rollbackError)
					}`,
				)
			}
			throw err
		}

		// 6) Start the child task now that parent metadata is safely persisted.
		scheduleTask(this.deps.getTaskScheduler(), child, "delegateParentAndOpenChild")

		// 7) Emit TaskDelegated (provider-level)
		try {
			this.deps.emit(RooCodeEventName.TaskDelegated, parentTaskId, child.taskId)
		} catch {
			// non-fatal
		}

		return child
	}

	/**
	 * Reopen parent task from delegation with write-back and events.
	 */
	public async reopenParentFromDelegation(params: {
		parentTaskId: string
		childTaskId: string
		completionResultSummary: string
	}): Promise<boolean> {
		const { parentTaskId, childTaskId, completionResultSummary } = params
		return this.deps.runDelegationTransition(parentTaskId, async () => {
			const globalStoragePath = this.deps.getContextProxy().globalStorageUri.fsPath

			// 1) Load parent from history and current persisted messages
			const { historyItem } = await this.deps.getTaskWithId(parentTaskId)

			// Guard: re-validate delegation state after the async approval gap.
			// cancelTask() or removeClineFromStack() may have already detached the parent
			// (setting status → "active", awaitingChildId → undefined) while the user was
			// approving the subtask finish.  If the parent no longer awaits this child,
			// routing output back would corrupt an unrelated task.
			if (
				this.deps.hasCancelledDelegationChildId(childTaskId) ||
				(historyItem.status !== "delegated" && historyItem.status !== "active") ||
				historyItem.awaitingChildId !== childTaskId
			) {
				this.deps.log(
					`[reopenParentFromDelegation] Aborting: parent ${parentTaskId} is no longer delegated to child ${childTaskId} ` +
						`(status=${historyItem.status}, awaitingChildId=${historyItem.awaitingChildId})`,
				)
				return false
			}

			let parentClineMessages: ClineMessage[] = []
			try {
				parentClineMessages = await readTaskMessages({
					taskId: parentTaskId,
					globalStoragePath,
				})
			} catch {
				parentClineMessages = []
			}

			let parentApiMessages: ApiMessage[] = []
			try {
				parentApiMessages = await readApiMessages({
					taskId: parentTaskId,
					globalStoragePath,
				})
			} catch {
				parentApiMessages = []
			}

			// 2) Inject synthetic records: UI subtask_result and update API tool_result
			const ts = Date.now()

			// Defensive: ensure arrays
			if (!Array.isArray(parentClineMessages)) parentClineMessages = []
			if (!Array.isArray(parentApiMessages)) parentApiMessages = []

			const subtaskUiMessage: ClineMessage = {
				type: "say",
				say: "subtask_result",
				text: completionResultSummary,
				ts,
			}
			const lastParentClineMessage = parentClineMessages.at(-1)
			if (
				lastParentClineMessage?.type !== "say" ||
				lastParentClineMessage.say !== "subtask_result" ||
				lastParentClineMessage.text !== completionResultSummary
			) {
				parentClineMessages.push(subtaskUiMessage)
			}
			await saveTaskMessages({ messages: parentClineMessages, taskId: parentTaskId, globalStoragePath })

			// Find the tool_use_id from the last assistant message's new_task tool_use
			let toolUseId: string | undefined
			for (let i = parentApiMessages.length - 1; i >= 0; i--) {
				const msg = parentApiMessages[i]
				if (msg.role === "assistant" && Array.isArray(msg.content)) {
					for (const block of msg.content) {
						if (block.type === "tool_use" && block.name === "new_task") {
							toolUseId = block.id
							break
						}
					}
					if (toolUseId) break
				}
			}

			// Preferred: if the parent history contains the native tool_use for new_task,
			// inject a matching tool_result for the Anthropic message contract:
			// user → assistant (tool_use) → user (tool_result)
			if (toolUseId) {
				// Check if the last message is already a user message with a tool_result for this tool_use_id
				// (in case this is a retry or the history was already updated)
				const lastMsg = parentApiMessages[parentApiMessages.length - 1]
				let alreadyHasToolResult = false
				if (lastMsg?.role === "user" && Array.isArray(lastMsg.content)) {
					for (const block of lastMsg.content) {
						if (block.type === "tool_result" && block.tool_use_id === toolUseId) {
							// Update the existing tool_result content
							block.content = `Subtask ${childTaskId} completed.\n\nResult:\n${completionResultSummary}`
							alreadyHasToolResult = true
							break
						}
					}
				}

				// If no existing tool_result found, create a NEW user message with the tool_result
				if (!alreadyHasToolResult) {
					parentApiMessages.push({
						role: "user",
						content: [
							{
								type: "tool_result" as const,
								tool_use_id: toolUseId,
								content: `Subtask ${childTaskId} completed.\n\nResult:\n${completionResultSummary}`,
							},
						],
						ts,
					})
				}

				// Validate the newly injected tool_result against the preceding assistant message.
				// This ensures the tool_result's tool_use_id matches a tool_use in the immediately
				// preceding assistant message (Anthropic API requirement).
				const lastMessage = parentApiMessages[parentApiMessages.length - 1]
				if (lastMessage?.role === "user") {
					const validatedMessage = validateAndFixToolResultIds(lastMessage, parentApiMessages.slice(0, -1))
					parentApiMessages[parentApiMessages.length - 1] = validatedMessage
				}
			} else {
				// If there is no corresponding tool_use in the parent API history, we cannot emit a
				// tool_result. Fall back to a plain user text note so the parent can still resume.
				const fallbackText = `Subtask ${childTaskId} completed.\n\nResult:\n${completionResultSummary}`
				const lastParentApiMessage = parentApiMessages.at(-1)
				const alreadyHasFallback =
					lastParentApiMessage?.role === "user" &&
					Array.isArray(lastParentApiMessage.content) &&
					lastParentApiMessage.content.some(
						(block: { type?: string; text?: string }) =>
							block.type === "text" && block.text === fallbackText,
					)
				if (!alreadyHasFallback) {
					parentApiMessages.push({
						role: "user",
						content: [
							{
								type: "text" as const,
								text: fallbackText,
							},
						],
						ts,
					})
				}
			}

			await saveApiMessages({ messages: parentApiMessages, taskId: parentTaskId, globalStoragePath })

			// 4) Close child instance if still open (single-open-task invariant).
			//    This MUST happen BEFORE marking the child "completed" because
			//    removeClineFromStack() → abortTask(true) → saveClineMessages() writes
			//    the historyItem with initialStatus (typically "active"), which would
			//    overwrite a "completed" status set later.
			const current = this.deps.getCurrentTask()
			if (current?.taskId === childTaskId) {
				await this.deps.removeClineFromStack()
			}

			// 3+5) Atomically mark child completed and parent active in one lock acquisition.
			//      No intermediate state is ever persisted — no sentinel needed.
			//      Build the parent update inside the updater from the locked snapshot so
			//      any concurrent write that landed between step 1 and the lock acquisition
			//      is preserved rather than silently overwritten.
			let updatedHistory!: typeof historyItem
			await this.deps.getTaskHistoryStore().atomicUpdatePair(
				childTaskId,
				parentTaskId,
				(child) => {
					assertValidTransition(child.status, "completed")
					return { ...child, status: "completed" as const, completionResultSummary }
				},
				(parent) => {
					if (parent.status !== "active") {
						assertValidTransition(parent.status, "active")
					}
					const childIds = Array.from(new Set([...(parent.childIds ?? []), childTaskId]))
					updatedHistory = {
						...parent,
						status: "active" as const,
						completedByChildId: childTaskId,
						completionResultSummary,
						awaitingChildId: undefined,
						delegatedToId: undefined,
						childIds,
					}
					return updatedHistory
				},
			)
			this.deps.resetRecentTasksCache()

			// Notify the webview of both updated items so its in-memory history stays current.
			if (this.deps.provider.isViewLaunched) {
				const updatedChild = this.deps.getTaskHistoryStore().get(childTaskId)
				const updatedParent = this.deps.getTaskHistoryStore().get(parentTaskId)
				if (updatedChild) {
					await this.deps.postMessageToWebview({
						type: "taskHistoryItemUpdated",
						taskHistoryItem: updatedChild,
					})
				}
				if (updatedParent) {
					await this.deps.postMessageToWebview({
						type: "taskHistoryItemUpdated",
						taskHistoryItem: updatedParent,
					})
				}
			}

			// 6) Emit TaskDelegationCompleted (provider-level)
			try {
				this.deps.emit(
					RooCodeEventName.TaskDelegationCompleted,
					parentTaskId,
					childTaskId,
					completionResultSummary,
				)
			} catch {
				// non-fatal
			}

			// 7) Reopen the parent from history as the sole active task (restores saved mode)
			//    IMPORTANT: startTask=false to suppress resume-from-history ask scheduling
			const parentInstance = await this.deps.createTaskWithHistoryItem(updatedHistory, { startTask: false })

			// 8) Inject restored histories into the in-memory instance before resuming
			if (parentInstance) {
				try {
					await parentInstance.overwriteClineMessages(parentClineMessages)
				} catch {
					// non-fatal
				}
				try {
					await parentInstance.overwriteApiConversationHistory(parentApiMessages)
				} catch {
					// non-fatal
				}

				// Auto-resume parent without ask("resume_task")
				await parentInstance.resumeAfterDelegation()
			}

			// 9) Emit TaskDelegationResumed (provider-level)
			try {
				this.deps.emit(RooCodeEventName.TaskDelegationResumed, parentTaskId, childTaskId)
			} catch {
				// non-fatal
			}

			this.deps.deleteCancelledDelegationChildId(childTaskId)
			return true
		})
	}

	/**
	 * Explicitly sever a delegated parent-child link, e.g. when the user gives up on
	 * an "interrupted" subtask instead of resuming it. Unlike removeClineFromStack()'s
	 * automatic repair, this is user-initiated and works even while the child is
	 * "interrupted" (which removeClineFromStack intentionally leaves alone so the child
	 * can still resume and report back). Only interrupted children can be abandoned — a
	 * still-running child must be cancelled first, so its link is never severed mid-stream.
	 *
	 * Parent transitions delegated → active (its normal "no longer awaiting a child"
	 * state). The child's own status is left untouched (interrupted stays interrupted;
	 * VALID_TRANSITIONS only allows interrupted → completed) — only its parent/root
	 * links are cleared so a later resume-and-complete cannot reattach it.
	 */
	public async abandonSubtask(childTaskId: string): Promise<boolean> {
		const { historyItem: childHistory } = await this.deps.getTaskWithId(childTaskId)
		const parentTaskId = childHistory.parentTaskId

		if (!parentTaskId) {
			return false
		}

		// Only an interrupted (cancelled, not running) child may be abandoned. A still-running
		// child must be cancelled first — severing the link out from under a live stream would
		// orphan it silently instead of giving the user the normal cancel/resume flow.
		if (childHistory.status !== "interrupted") {
			this.deps.log(
				`[abandonSubtask] Aborting: child ${childTaskId} is not interrupted (status=${childHistory.status})`,
			)
			return false
		}

		return this.deps.runDelegationTransition(parentTaskId, async () => {
			const { historyItem: parentHistory } = await this.deps.getTaskWithId(parentTaskId)

			if (parentHistory?.status !== "delegated" || parentHistory?.awaitingChildId !== childTaskId) {
				this.deps.log(
					`[abandonSubtask] Aborting: parent ${parentTaskId} is no longer delegated to child ${childTaskId} ` +
						`(status=${parentHistory?.status}, awaitingChildId=${parentHistory?.awaitingChildId})`,
				)
				return false
			}

			// Re-check inside the lock: the child may have been resumed (and be streaming again,
			// or have completed) between the check above and acquiring the delegation transition lock.
			const freshChild = this.deps.getTaskHistoryStore().get(childTaskId)
			if (freshChild?.status !== "interrupted") {
				this.deps.log(
					`[abandonSubtask] Aborting: child ${childTaskId} is no longer interrupted (status=${freshChild?.status})`,
				)
				return false
			}

			assertValidTransition(parentHistory.status, "active")

			// Close the live child instance (if it's still the open task — the common case,
			// since an interrupted child is rehydrated onto the stack after cancelTask) BEFORE
			// clearing its persisted links. Task#saveClineMessages() rebuilds parentTaskId/
			// rootTaskId from the live (readonly) Task fields on every save, so any save that
			// happens after we clear the persisted links — including abortTask's own final
			// save — would silently reattach the child to its old parent.
			const current = this.deps.getCurrentTask()
			if (current?.taskId === childTaskId) {
				await this.deps.removeClineFromStack()
			}

			await this.deps.getTaskHistoryStore().atomicUpdatePair(
				childTaskId,
				parentTaskId,
				(child) => ({ ...child, parentTaskId: undefined, rootTaskId: undefined }),
				(parent) => ({
					...parent,
					status: "active" as const,
					awaitingChildId: undefined,
					delegatedToId: undefined,
				}),
			)
			this.deps.resetRecentTasksCache()

			// Guard against a stale in-flight resume/completion (e.g. a resume that was already
			// in progress when abandon was clicked) reattaching the child after the link above
			// was cleared. AttemptCompletionTool re-reads parent status from the persisted store,
			// not the live task's readonly parentTaskId field, so this is the authoritative gate.
			this.deps.addCancelledDelegationChildId(childTaskId)

			if (this.deps.provider.isViewLaunched) {
				const updatedChild = this.deps.getTaskHistoryStore().get(childTaskId)
				const updatedParent = this.deps.getTaskHistoryStore().get(parentTaskId)
				if (updatedChild) {
					await this.deps.postMessageToWebview({
						type: "taskHistoryItemUpdated",
						taskHistoryItem: updatedChild,
					})
				}
				if (updatedParent) {
					await this.deps.postMessageToWebview({
						type: "taskHistoryItemUpdated",
						taskHistoryItem: updatedParent,
					})
				}
			}

			this.deps.log(`[abandonSubtask] Severed link between parent ${parentTaskId} and child ${childTaskId}`)
			return true
		})
	}
}
