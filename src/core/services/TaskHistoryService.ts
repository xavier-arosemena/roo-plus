import type { ExtensionMessage, HistoryItem } from "@roo-code/types"

import { estimateArrayRowBytes } from "../../shared/payloadSize"

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
 * Maximum NUMBER of task-history entries shipped to the webview in a single
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
 * Byte budget for the `taskHistory` field of a single `state` push — the byte
 * half of the bound (2026-09-17 incident, the fourth and last instance of the
 * "unbounded array field" payload class after `taskHistory` in 3.88.1,
 * `customModes` in 3.88.2 and `clineMessages` in 3.88.3).
 *
 * The 3.88.1 fix bounded `taskHistory` by COUNT only. On a history-heavy
 * install each `HistoryItem` is the full record (~10 KB/row), so the 100-row
 * cap still shipped > 1 MB: 2026-09-17 field evidence recorded
 * `top[taskHistory=1011KB customModes=56KB clineMessages=0KB]` →
 * `state` = 1065 KB → `[webview-metrics] ERROR` + user popup, with the host
 * perfectly healthy (`elu p99 ≈ 12 ms`, `heap 167–192 MB`). This is a
 * payload-size fault, so the field needs a BYTE bound like
 * {@link MAX_CLINE_MESSAGES_BYTES_SHIPPED_TO_WEBVIEW}.
 *
 * Why 32 KB (and not the 128 KB used for `clineMessages`): the whole `state`
 * message must stay under `STATE_WARN_BYTES` (256 KB) with EVERY bounded field
 * at its maximum, because they ride the SAME message — that composite is what
 * the anti-whack-a-mole regression test asserts
 * (`__tests__/statePayloadBudget.spec.ts`). The clineMessages budget is 128 KB
 * (do not change) and the bounded customModes projection is ~71 KB for a
 * realistic catalog, so taskHistory gets what is left, with room for the
 * settings envelope: 128 + 32 + 71 + ~6 ≈ 237 KB (the measured synthetic
 * composite is 236 KB), leaving ~19 KB headroom. A 48 KB budget was tried first
 * and produced a 252 KB composite — only ~9 KB under the WARN threshold, too
 * fragile for a threshold that also carries every other `state` field.
 *
 * The bound is ADAPTIVE, not a flat shrink: the 100-row count cap still binds
 * whenever the rows are small (terse tasks ≈ 300 B/row), and only installations
 * with oversized rows see a shorter window. Those installations are exactly the
 * ones that were tripping the payload SLI. The row floor keeps the panel
 * usable, and older rows stay reachable via `getOlderTaskHistory` →
 * `olderTaskHistory` (the file-backed store remains the source of truth).
 */
export const MAX_TASK_HISTORY_BYTES_SHIPPED_TO_WEBVIEW = 32 * 1024

/**
 * Row floor for {@link projectTaskHistoryForWebview}: the newest few rows are
 * shipped even when they alone exceed
 * {@link MAX_TASK_HISTORY_BYTES_SHIPPED_TO_WEBVIEW}.
 *
 * Rationale (UX constraint): a 32 KB budget over ~10 KB rows fits only ~3 rows,
 * and the History panel must never come up empty or with a single row just
 * because the newest tasks are large — dropping to the active task only would
 * read as "my history is gone". The floor is deliberately small because EVERY
 * row it forces is spent from the composite `state` budget: 3 × ~10 KB ≈ 32 KB
 * is what the clineMessages-128 KB + customModes-71 KB headroom in
 * {@link MAX_TASK_HISTORY_BYTES_SHIPPED_TO_WEBVIEW} can absorb while keeping a
 * real margin under `STATE_WARN_BYTES` (a floor of 4 put the measured synthetic
 * composite at ~246 KB, only ~16 KB of headroom). A single row that exceeds the
 * budget on its own is still shipped (the newest row is never dropped): one
 * oversized row is a bounded, visible cost, whereas hiding the active task
 * breaks the panel.
 */
export const MIN_TASK_HISTORY_ROWS_SHIPPED_TO_WEBVIEW = 3

/**
 * Cap on the extra ANCESTOR rows {@link projectTaskHistoryForWebview} re-attaches
 * to close a parent/child tree that the byte budget would otherwise split (DEBT
 * entry C).
 *
 * Ancestors are charged to the SAME byte budget as the window, so this cap only
 * bounds a pathological fan-in (a deep chain of nested subtasks) — the byte
 * budget is the real limit. 8 covers realistic nesting (a subtask a few levels
 * deep) while keeping the closure pass cheap and its worst case known.
 */
export const MAX_TASK_HISTORY_ANCESTOR_ROWS_SHIPPED_TO_WEBVIEW = 8

/**
 * A task-history row is shippable when it carries a timestamp (`ts`) and a task
 * description (`task`) — the two fields the webview itself filters on
 * (`useTaskSearch`, `usePromptHistory`). Rows failing this are unusable to
 * every consumer, so dropping them is not a truncation. Mirrors
 * `isShippableClineMessage`.
 */
export function isShippableHistoryItem(item: HistoryItem): boolean {
	return Boolean(item.ts) && Boolean(item.task)
}

/** Result of {@link projectTaskHistoryForWebview}. */
export interface BoundedTaskHistoryForWebview {
	/** Newest-first window under the count and byte budgets. */
	items: HistoryItem[]
	/** `true` when `items` is NOT the whole history. */
	bounded: boolean
	/** Number of shippable rows in the full store. */
	total: number
	/**
	 * Exclusive paging cursor for the lazy "load older tasks" flow: the `ts` of
	 * the last CONTIGUOUSLY admitted window row.
	 *
	 * Re-attached ancestors are older than that cutoff, so the window is no longer
	 * contiguous in `ts` and `items[items.length - 1].ts` would skip every row
	 * between an ancestor and the cutoff, making them unreachable. `undefined`
	 * when `items` is the whole history.
	 */
	pagingAnchorTs?: number
}

/**
 * Bounds the task-history window for a `state` push by COUNT and BYTES.
 *
 * Newest-first; a row is admitted while both budgets allow it. The newest row
 * is ALWAYS admitted, and admission never stops before
 * {@link MIN_TASK_HISTORY_ROWS_SHIPPED_TO_WEBVIEW} rows, so a run of oversized
 * rows can never empty the panel. Rows are sized with the CHEAP shared
 * estimator ({@link estimateArrayRowBytes}) — never a per-row `JSON.stringify`
 * — so the projection is safe to run on every push.
 *
 * `bounded` tells the webview the window is partial: it keeps rows it already
 * has (e.g. lazy-fetched older pages) instead of replacing wholesale, and can
 * offer the `getOlderTaskHistory` affordance. The store itself is never
 * truncated — this only bounds what is serialized to the webview.
 *
 * TREE CLOSURE (DEBT entry C). The budget is byte-driven while the History panel
 * groups rows by `parentTaskId` (`useGroupedTasks`), so a boundary landing
 * inside a tree rendered the child as a parentless root row — a subtask shown
 * as a top-level task. A subtask's parent is always OLDER, i.e. exactly what a
 * newest-first byte budget drops first, so this pass re-attaches the ancestor
 * chain of every admitted row. Ancestors are charged to the SAME byte budget
 * (the composite `state` invariant is untouched) and capped at
 * {@link MAX_TASK_HISTORY_ANCESTOR_ROWS_SHIPPED_TO_WEBVIEW}, which makes closure
 * best-effort: a chain that no longer fits is left split rather than allowed to
 * breach the payload budget this projection exists to enforce.
 *
 * PAGING ANCHOR. Because re-attached ancestors are older than the cutoff, the
 * window is no longer contiguous in `ts`. {@link BoundedTaskHistoryForWebview.pagingAnchorTs}
 * therefore reports the `ts` of the last contiguously admitted row, and paging
 * MUST use it: paging from an ancestor's `ts` would skip every row between that
 * ancestor and the cutoff, leaving them unreachable from the panel.
 */
export function projectTaskHistoryForWebview(
	items: readonly HistoryItem[],
	options: { maxItems?: number; maxBytes?: number; minRows?: number; maxAncestorRows?: number } = {},
): BoundedTaskHistoryForWebview {
	const maxItems = options.maxItems ?? MAX_TASK_HISTORY_SHIPPED_TO_WEBVIEW
	const maxBytes = options.maxBytes ?? MAX_TASK_HISTORY_BYTES_SHIPPED_TO_WEBVIEW
	const minRows = options.minRows ?? MIN_TASK_HISTORY_ROWS_SHIPPED_TO_WEBVIEW
	const maxAncestorRows = options.maxAncestorRows ?? MAX_TASK_HISTORY_ANCESTOR_ROWS_SHIPPED_TO_WEBVIEW

	const shippable = items.filter(isShippableHistoryItem).sort((a, b) => b.ts - a.ts)
	const total = shippable.length
	const byId = new Map(shippable.map((item) => [item.id, item]))

	// 1. Contiguous newest-first prefix, bounded by COUNT and BYTES exactly as
	//    before (byte budget first, never below the row floor, newest always in).
	const window: HistoryItem[] = []
	let bytes = 0

	for (const item of shippable) {
		if (window.length >= maxItems) {
			break
		}

		const rowBytes = estimateArrayRowBytes(item)
		const rowFloorApplies = window.length < minRows

		if (!rowFloorApplies && bytes + rowBytes > maxBytes) {
			break
		}

		window.push(item)
		bytes += rowBytes
	}

	// 2. Tree closure (DEBT entry C). Discover the ancestor rows the window is
	//    missing, in window order so the result is deterministic and independent
	//    of `Map` iteration order.
	const shippedIds = new Set(window.map((item) => item.id))
	const requiredAncestors: HistoryItem[] = []

	for (const item of window) {
		let parentId = item.parentTaskId

		while (parentId && !shippedIds.has(parentId)) {
			const parent = byId.get(parentId)

			// Parent unknown to this projection (deleted, or not shippable, or not in
			// the store): there is nothing to re-attach, and the child is a genuine
			// root as far as the History panel is concerned.
			if (!parent) {
				break
			}

			requiredAncestors.push(parent)
			shippedIds.add(parent.id)
			parentId = parent.parentTaskId
		}
	}

	// 3. Attach them while the SAME byte budget allows. A first-come-first-served
	//    stop (no skipping) keeps the choice deterministic and bounded: a chain
	//    that no longer fits stays split rather than breaching the payload budget
	//    that this projection exists to enforce.
	const ancestors: HistoryItem[] = []

	for (const ancestor of requiredAncestors) {
		if (ancestors.length >= maxAncestorRows) {
			break
		}

		const rowBytes = estimateArrayRowBytes(ancestor)

		if (bytes + rowBytes > maxBytes) {
			break
		}

		ancestors.push(ancestor)
		bytes += rowBytes
	}

	// An ancestor is always older than its descendant, so appending preserves the
	// newest-first order the webview merge and grouping rely on.
	const shipped = [...window, ...ancestors]
	const bounded = shipped.length < total

	return {
		items: shipped,
		bounded,
		total,
		pagingAnchorTs: bounded ? window[window.length - 1]?.ts : undefined,
	}
}

/**
 * Array-only projection used by {@link TaskHistoryService.broadcastTaskHistoryUpdate}.
 *
 * Thin wrapper over {@link projectTaskHistoryForWebview} so the broadcast and
 * the `state` push are bounded by exactly the same count+byte contract. Call
 * sites that also need the `bounded` marker use the projection directly.
 *
 * `max` stays positional for backwards compatibility with existing callers;
 * the byte budget and row floor are always the shipping defaults (override them
 * through {@link projectTaskHistoryForWebview} when a different budget is
 * genuinely intended, e.g. in tests).
 */
export function boundTaskHistoryForWebview(
	items: readonly HistoryItem[],
	max: number = MAX_TASK_HISTORY_SHIPPED_TO_WEBVIEW,
): HistoryItem[] {
	return projectTaskHistoryForWebview(items, { maxItems: max }).items
}

/**
 * Selects the page of task-history rows immediately OLDER than `beforeTs` for
 * the webview's "load older tasks" flow (`getOlderTaskHistory`).
 *
 * Returns the newest rows below `beforeTs` that fit the SAME count+byte budget
 * as the `state` push (so a page can never itself trip the payload SLI), plus
 * `hasMore` so the caller can stop offering the affordance once the history
 * tail is reached. `beforeTs` is exclusive: the webview passes the `ts` of its
 * oldest loaded row and receives the contiguous block ending right before it.
 */
export function selectOlderTaskHistory(
	items: readonly HistoryItem[],
	beforeTs: number,
	options: { maxItems?: number; maxBytes?: number; minRows?: number } = {},
): { items: HistoryItem[]; hasMore: boolean } {
	const candidates = items.filter(isShippableHistoryItem).filter((item) => item.ts < beforeTs)
	const page = projectTaskHistoryForWebview(candidates, options).items

	return { items: page, hasMore: page.length < candidates.length }
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
