import type { ExtensionMessage, HistoryItem } from "@roo-code/types"

/**
 * The subset of `TaskHistoryStore` that {@link TaskHistoryService} needs.
 * Kept intentionally narrow so the service can be unit-tested with a plain,
 * fully-typed double instead of a full store.
 */
export interface TaskHistoryStoreLike {
	upsert(item: HistoryItem): Promise<HistoryItem[]>
	get(taskId: string): HistoryItem | undefined
	getAll(): HistoryItem[]
}

/**
 * Debounce window (ms) for the debounced globalState write-through of task
 * history. Mirrors the former `ClineProvider.GLOBAL_STATE_WRITE_THROUGH_DEBOUNCE_MS`.
 */
export const DEFAULT_GLOBAL_STATE_WRITE_THROUGH_DEBOUNCE_MS = 5000 // 5 seconds

/**
 * Accessor port for the recent-tasks cache.
 *
 * The cache is owned by the provider (a single `recentTasksCache` field on
 * `ClineProvider`) because existing tests and delegation flows read/write it
 * directly. The service reads and invalidates it through this port so there is
 * exactly one source of truth.
 */
export interface RecentTasksCachePort {
	get: () => string[] | undefined
	set: (cache: string[] | undefined) => void
}

/**
 * Dependencies injected into {@link TaskHistoryService}.
 *
 * Narrow ports are injected instead of the full `ClineProvider` so the service
 * stays decoupled (mirroring the S2 `Pick<ClineProvider, ...>` pattern).
 */
export interface TaskHistoryServiceDeps {
	/** Per-task file-backed history store (source of truth). */
	taskHistoryStore: TaskHistoryStoreLike
	/** Whether the webview view is currently launched (read at call time). */
	isViewLaunched: () => boolean
	/** Port that posts a message to the webview. */
	postMessageToWebview: (message: ExtensionMessage) => Promise<void>
	/** Log sink. */
	log: (message: string) => void
	/** Debounced write-through target for the globalState mirror of task history. */
	writeGlobalTaskHistory: (items: HistoryItem[]) => Promise<void>
	/** Accessor for the provider-owned recent-tasks cache. */
	recentTasksCache: RecentTasksCachePort
	/** Debounce window (ms) for the globalState write-through. Defaults to 5s. */
	writeThroughDebounceMs?: number
}

/**
 * Owns task-history mutation, webview broadcast, and the debounced globalState
 * write-through previously embedded in `ClineProvider`.
 *
 * Extracted from the `ClineProvider` god-object (S3a). Public behavior is
 * identical to the original implementation; `ClineProvider` delegates to this
 * service.
 */
export class TaskHistoryService {
	private readonly deps: TaskHistoryServiceDeps
	private globalStateWriteThroughTimer: ReturnType<typeof setTimeout> | null = null

	constructor(deps: TaskHistoryServiceDeps) {
		this.deps = deps
	}

	/**
	 * Updates a task in the task history and optionally broadcasts the updated
	 * history to the webview.
	 *
	 * @param item The history item to update or add
	 * @param options.broadcast Whether to broadcast the updated history to the webview (default: true)
	 * @returns The updated task history array
	 */
	async updateTaskHistory(item: HistoryItem, options: { broadcast?: boolean } = {}): Promise<HistoryItem[]> {
		const { broadcast = true } = options

		const history = await this.deps.taskHistoryStore.upsert(item)
		this.deps.recentTasksCache.set(undefined)

		// Broadcast the updated history to the webview if requested.
		// Prefer per-item updates to avoid repeatedly cloning/sending the full history.
		if (broadcast && this.deps.isViewLaunched()) {
			const updatedItem = this.deps.taskHistoryStore.get(item.id) ?? item
			await this.deps.postMessageToWebview({ type: "taskHistoryItemUpdated", taskHistoryItem: updatedItem })
		}

		return history
	}

	/**
	 * Schedule a debounced write-through of task history to globalState.
	 * Only used for backward compatibility during the transition period.
	 * Per-task files are authoritative; globalState is the downgrade fallback.
	 */
	scheduleGlobalStateWriteThrough(): void {
		if (this.globalStateWriteThroughTimer) {
			clearTimeout(this.globalStateWriteThroughTimer)
		}

		this.globalStateWriteThroughTimer = setTimeout(async () => {
			this.globalStateWriteThroughTimer = null
			try {
				const items = this.deps.taskHistoryStore.getAll()
				await this.deps.writeGlobalTaskHistory(items)
			} catch (err) {
				this.deps.log(
					`[scheduleGlobalStateWriteThrough] Failed: ${err instanceof Error ? err.message : String(err)}`,
				)
			}
		}, this.deps.writeThroughDebounceMs ?? DEFAULT_GLOBAL_STATE_WRITE_THROUGH_DEBOUNCE_MS)
	}

	/**
	 * Flush any pending debounced globalState write-through immediately.
	 */
	flushGlobalStateWriteThrough(): void {
		if (this.globalStateWriteThroughTimer) {
			clearTimeout(this.globalStateWriteThroughTimer)
			this.globalStateWriteThroughTimer = null
		}

		const items = this.deps.taskHistoryStore.getAll()
		this.deps.writeGlobalTaskHistory(items).catch((err) => {
			this.deps.log(`[flushGlobalStateWriteThrough] Failed: ${err instanceof Error ? err.message : String(err)}`)
		})
	}

	/**
	 * Broadcasts a task history update to the webview.
	 * This sends a lightweight message with just the task history, rather than the full state.
	 * @param history The task history to broadcast (if not provided, reads from the store)
	 */
	async broadcastTaskHistoryUpdate(history?: HistoryItem[]): Promise<void> {
		if (!this.deps.isViewLaunched()) {
			return
		}

		const taskHistory = history ?? this.deps.taskHistoryStore.getAll()

		// Sort and filter the history the same way as getStateToPostToWebview
		const sortedHistory = taskHistory
			.filter((item: HistoryItem) => item.ts && item.task)
			.sort((a: HistoryItem, b: HistoryItem) => b.ts - a.ts)

		await this.deps.postMessageToWebview({
			type: "taskHistoryUpdated",
			taskHistory: sortedHistory,
		})
	}

	/**
	 * Returns the IDs of the most recent tasks for the given workspace,
	 * cached in the provider-owned recent-tasks cache.
	 */
	getRecentTasks(cwd: string): string[] {
		const cached = this.deps.recentTasksCache.get()
		if (cached) {
			return cached
		}

		const history = this.deps.taskHistoryStore.getAll()
		const workspaceTasks: HistoryItem[] = []

		for (const item of history) {
			if (!item.ts || !item.task || item.workspace !== cwd) {
				continue
			}

			workspaceTasks.push(item)
		}

		if (workspaceTasks.length === 0) {
			this.deps.recentTasksCache.set([])
			return []
		}

		workspaceTasks.sort((a, b) => b.ts - a.ts)
		let recentTaskIds: string[] = []

		if (workspaceTasks.length >= 100) {
			// If we have at least 100 tasks, return tasks from the last 7 days.
			const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

			for (const item of workspaceTasks) {
				// Stop when we hit tasks older than 7 days.
				if (item.ts < sevenDaysAgo) {
					break
				}

				recentTaskIds.push(item.id)
			}
		} else {
			// Otherwise, return the most recent 100 tasks (or all if less than 100).
			recentTaskIds = workspaceTasks.slice(0, Math.min(100, workspaceTasks.length)).map((item) => item.id)
		}

		this.deps.recentTasksCache.set(recentTaskIds)
		return recentTaskIds
	}
}
