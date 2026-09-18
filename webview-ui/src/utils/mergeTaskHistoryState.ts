import type { HistoryItem } from "@roo-code/types"

/**
 * Webview-side merge helpers for the COUNT+BYTE-bounded `taskHistory` window
 * shipped by host `state` pushes (2026-09-17 taskHistory payload incident — the
 * byte half of the 3.88.1 count-only bound).
 *
 * The host no longer serializes the whole task store on every push: it ships
 * the newest rows that fit a 48 KB budget (`taskHistoryBounded: true`). Two
 * things must therefore hold in the webview:
 *
 * 1. **A new window must not erase what the panel already has.**
 *    {@link mergeTaskHistoryState} keeps previously-known rows older than the
 *    incoming window's oldest row, so rows loaded via the "load older tasks"
 *    affordance survive every subsequent `state` push — otherwise the panel
 *    would visibly reset to ~5 rows whenever a push arrived.
 * 2. **Paging must stay ordered and duplicate-free.**
 *    {@link appendOlderTaskHistoryPage} inserts a lazy-fetched page
 *    (`olderTaskHistory`) by id, ignoring entries already present.
 *
 * Both helpers sort DESCENDING by `ts`, which is the host's canonical
 * task-history order (`boundTaskHistoryForWebview` / `TaskHistoryStore.getAll`)
 * and the order the panel renders, so neither can re-order rows.
 */

/** Sorts task history newest-first (stable for equal timestamps). */
export function sortTaskHistoryByTsDesc(items: readonly HistoryItem[]): HistoryItem[] {
	return [...items].sort((a, b) => b.ts - a.ts)
}

/**
 * Merges an incoming `state`-push history window into the previously-known list.
 *
 * - `incoming === undefined` → the push did not carry history; return the
 *   previous list (callers normally skip the merge entirely in that case).
 * - `bounded !== true` (a complete, within-budget history) → take the incoming
 *   list verbatim, preserving the pre-bound behaviour of replacing the list.
 * - `bounded === true` → keep previous rows that are NOT in the incoming window
 *   and are older than its oldest row, then append the window and re-sort.
 */
export function mergeTaskHistoryState(
	previous: readonly HistoryItem[] | undefined,
	incoming: HistoryItem[] | undefined,
	bounded: boolean | undefined,
): HistoryItem[] {
	if (incoming === undefined) {
		return previous ? [...previous] : []
	}

	if (bounded !== true || !previous?.length) {
		return incoming
	}

	const windowIds = new Set(incoming.map((item) => item.id))
	const oldestIncomingTs = incoming.length > 0 ? incoming[incoming.length - 1].ts : Number.NEGATIVE_INFINITY
	const preserved = previous.filter((item) => !windowIds.has(item.id) && item.ts < oldestIncomingTs)

	return sortTaskHistoryByTsDesc([...preserved, ...incoming])
}

/**
 * Appends a lazy-fetched page of older rows to the current list.
 *
 * Entries already present (same `id`) are refreshed from the incoming page (the
 * page is read from the file-backed store, so it is at least as fresh) and the
 * result is re-sorted newest-first, keeping the rendered order stable while the
 * "load older tasks" pages fill in downward.
 */
export function appendOlderTaskHistoryPage(
	current: readonly HistoryItem[] | undefined,
	page: readonly HistoryItem[] | undefined,
): HistoryItem[] {
	const base = current ?? []
	if (!page?.length) {
		return [...base]
	}

	const pageIds = new Set(page.map((item) => item.id))
	const retained = base.filter((item) => !pageIds.has(item.id))

	return sortTaskHistoryByTsDesc([...retained, ...page])
}
