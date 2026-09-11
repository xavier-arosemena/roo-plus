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
 * Maximum number of task-history entries shipped to the webview in a single
 * `state` / `taskHistoryUpdated` message.
 *
 * Post-launch monitoring found the extension sending the FULL task-history
 * array (≈3.5 MB on a long-lived install) to the webview on every state
 * message. Over remote-SSH IPC that payload saturated the webview renderer
 * (the recurring "pale gray / unresponsive" symptom). The UI History panel
 * only needs recent tasks, and the per-task file store remains the full
 * source of truth for deeper access — so we bound what crosses the wire.
 *
 * 100 matches the cap already used for the recent-tasks cache
 * ({@link TaskHistoryService.getRecentTasks}) and the prompt-history fallback.
 */
export const MAX_TASK_HISTORY_SHIPPED_TO_WEBVIEW = 100

/**
 * Returns at most {@link MAX_TASK_HISTORY_SHIPPED_TO_WEBVIEW} history entries
 * that have both a timestamp (`ts`) and a task description (`task`), sorted
 * newest-first.
 *
 * Shared by {@link TaskHistoryService.broadcastTaskHistoryUpdate} and
 * `ClineProvider#getStateToPostToWebview` / `ClineProvider#getState` so every
 * webview-visible snapshot is bounded to the same recent window. The store
 * itself is never truncated — this only bounds what is serialized to the
 * webview.
 */
export function boundTaskHistoryForWebview(
	items: readonly HistoryItem[],
	max: number = MAX_TASK_HISTORY_SHIPPED_TO_WEBVIEW,
): HistoryItem[] {
	return items
		.filter((item: HistoryItem) => item.ts && item.task)
		.sort((a: HistoryItem, b: HistoryItem) => b.ts - a.ts)
		.slice(0, max)
}

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
	/** Accessor for the provider-owned recent-tasks cache. */
	recentTasksCache: RecentTasksCachePort
}

/**
 * Owns task-history mutation and webview broadcast for task history.
 *
 * Extracted from the `ClineProvider` god-object (S3a). Per-task files in
 * `TaskHistoryStore` are the single source of truth; the service mutates the
 * store and pushes *bounded* snapshots to the webview. It no longer maintains
 * the former debounced globalState "taskHistory" mirror — that ~3.5 MB blob
 * tripped VS Code's "[mainThreadStorage] large extension state" warning and
 * was redundant with the file store.
 */
export class TaskHistoryService {
	private readonly deps: TaskHistoryServiceDeps

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
	 * Broadcasts a task history update to the webview.
	 * This sends a lightweight message with just the task history, rather than the full state.
	 * @param history The task history to broadcast (if not provided, reads from the store)
	 */
	async broadcastTaskHistoryUpdate(history?: HistoryItem[]): Promise<void> {
		if (!this.deps.isViewLaunched()) {
			return
		}

		const taskHistory = history ?? this.deps.taskHistoryStore.getAll()

		// Bound what we ship to the webview the same way as getStateToPostToWebview —
		// the full store can be ~3.5 MB, which saturates the renderer over remote-SSH
		// IPC. The UI History panel only needs the most recent tasks.
		const boundedHistory = boundTaskHistoryForWebview(taskHistory)

		await this.deps.postMessageToWebview({
			type: "taskHistoryUpdated",
			taskHistory: boundedHistory,
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
