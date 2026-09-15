import type { ClineMessage } from "@roo-code/types"

/**
 * Webview-side merge helpers for the BOUNDED `clineMessages` window shipped by
 * host `state` pushes (2026-09-15 `state` payload incident).
 *
 * The host no longer serializes a task's full transcript on every push: it
 * ships a tail-anchored, byte-bounded window (`clineMessagesBounded: true`)
 * consisting of the NEWEST messages plus the transcript's first message (the
 * chat header anchor). Two things must therefore hold in the webview:
 *
 * 1. **A new window must not erase what is already rendered.** Streaming adds
 *    one message at a time, so older rows continuously fall out of the window;
 *    replacing the array wholesale would make a long conversation visibly
 *    disappear from the top as it grows. {@link mergeClineMessagesState} keeps
 *    the messages the webview already holds that are older than the incoming
 *    window's tail, which also fills the window's "gap" as pages arrive.
 * 2. **Paging must stay ordered and duplicate-free.**
 *    {@link mergeOlderClineMessagesPage} inserts a lazy-fetched page
 *    (`olderClineMessages`) by timestamp, ignoring entries already present.
 *
 * Both helpers sort ascending by `ts`, which is the transcript's canonical
 * order (the host serializes `Task#clineMessages` in creation order and the
 * webview updates rows by timestamp), so neither can re-order rendered rows.
 */

/** Sorts a transcript ascending by `ts` (stable for equal timestamps). */
export function sortClineMessagesByTs(messages: readonly ClineMessage[]): ClineMessage[] {
	return [...messages].sort((a, b) => a.ts - b.ts)
}

/**
 * Merges an incoming `state`-push transcript into the previously-known list.
 *
 * - `incoming === undefined` → the push did not carry messages; return the
 *   previous list (callers normally skip the merge entirely in that case).
 * - `bounded !== true` (a complete transcript, e.g. a short task or a launch
 *   push) → take the incoming list verbatim, preserving the pre-bound
 *   behaviour of replacing the transcript.
 * - `bounded === true` → keep previous messages that are NOT in the incoming
 *   window and are older than its oldest tail message, then append the window
 *   and re-sort. The window's first element is the head anchor, so this
 *   reconstructs `[head, …previously-known older messages…, …new tail]`.
 */
export function mergeClineMessagesState(
	previous: readonly ClineMessage[] | undefined,
	incoming: ClineMessage[] | undefined,
	bounded: boolean | undefined,
): ClineMessage[] {
	if (incoming === undefined) {
		return previous ? [...previous] : []
	}

	if (bounded !== true || !previous?.length) {
		// A complete transcript (or a task with nothing rendered yet) replaces as
		// before — including keeping the incoming array identity, which the
		// existing sequence-guard/merge assertions rely on.
		return incoming
	}

	const windowTs = new Set(incoming.map((message) => message.ts))
	// With a bounded window the host guarantees `incoming[0]` is the first
	// message of the transcript and `incoming[1]` the first retained tail
	// message, so everything older than that is safe to preserve.
	const tailStartTs = incoming.length > 1 ? incoming[1].ts : Number.POSITIVE_INFINITY
	const preserved = previous.filter((message) => !windowTs.has(message.ts) && message.ts < tailStartTs)

	return sortClineMessagesByTs([...preserved, ...incoming])
}

/**
 * Inserts a lazy-fetched page of older messages into the current transcript.
 *
 * Entries already present (same `ts`) are refreshed from the incoming page
 * (the page is read from the live task, so it is at least as fresh) and the
 * result is re-sorted, keeping the rendered order stable while the "load
 * earlier messages" pages fill in upward.
 */
export function mergeOlderClineMessagesPage(
	current: readonly ClineMessage[] | undefined,
	page: readonly ClineMessage[] | undefined,
): ClineMessage[] {
	const base = current ?? []
	if (!page?.length) {
		return [...base]
	}

	const pageTs = new Set(page.map((message) => message.ts))
	const retained = base.filter((message) => !pageTs.has(message.ts))

	return sortClineMessagesByTs([...retained, ...page])
}
