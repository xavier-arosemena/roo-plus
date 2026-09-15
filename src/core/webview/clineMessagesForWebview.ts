import type { ClineMessage } from "@roo-code/types"

/**
 * Bounded projection of the chat transcript for host→webview `state` pushes
 * (2026-09-15 incident: `state` payload > 1 MB after v3.88.2).
 *
 * `ClineProvider#getStateToPostToWebview` used to serialize the task's FULL
 * message array on every push. Reopening a long task from history therefore
 * shipped a ~962 KB `clineMessages` field (1045 KB total `state` payload →
 * `[webview-metrics] ERROR`), exactly the failure class already fixed for
 * `taskHistory` (3.88.1, {@link boundTaskHistoryForWebview}) and `customModes`
 * (3.88.2, {@link boundCustomModesForWebview}).
 *
 * Contract (mirrors the two established projections):
 * - The window is **tail-anchored**: the NEWEST messages are always shipped so
 *   the active turn is present and streaming updates never lose their target.
 * - The task's FIRST message (the `say: "task"` row the chat UI derives its
 *   header from via `messages.at(0)`) is always retained as a head anchor.
 * - `bounded: true` on the projection tells the webview that the window is NOT
 *   the whole transcript, so it (a) keeps the messages it already rendered and
 *   (b) can lazy-fetch the omitted middle via `getOlderClineMessages`.
 * - Older messages stay reachable on demand ({@link selectOlderClineMessages});
 *   the per-task files under `globalStorage/tasks/…` remain the source of
 *   truth.
 *
 * The projection is a pure function over already-in-memory messages: it never
 * mutates the task, never truncates persistence, and never logs content.
 */

/**
 * Maximum size of the tail window shipped to the webview in a single `state`
 * push (the window may be smaller when
 * {@link MAX_CLINE_MESSAGES_BYTES_SHIPPED_TO_WEBVIEW} binds first).
 *
 * 200 comfortably covers an active turn's read/write/command rows while
 * keeping the serialized array far below the 256 KB WARN threshold
 * ({@link STATE_WARN_BYTES}) for typical sizing. The retained head anchor (the
 * transcript's first message) is shipped IN ADDITION to this cap, with its
 * bytes reserved against the byte budget.
 */
export const MAX_CLINE_MESSAGES_SHIPPED_TO_WEBVIEW = 200

/**
 * Byte budget for the `clineMessages` field of a single `state` push.
 *
 * Sized so the whole `state` payload stays under the 256 KB WARN threshold even
 * with the bounded `customModes` projection (~66 KB for the shipped catalog),
 * the settings envelope, and the webview metrics' own probe overhead. A single
 * over-budget message is still shipped (see {@link boundTail}) so the active
 * turn is never dropped, but everything older is withheld.
 */
export const MAX_CLINE_MESSAGES_BYTES_SHIPPED_TO_WEBVIEW = 128 * 1024

/** Result of {@link projectClineMessagesForWebview}. */
export interface BoundedClineMessagesForWebview {
	/** Tail-anchored window (plus the head anchor when the window is partial). */
	messages: ClineMessage[]
	/** `true` when `messages` is NOT the whole transcript. */
	bounded: boolean
	/** Number of shippable messages in the task's full transcript. */
	total: number
}

/**
 * A message is shippable when it carries a finite numeric `ts` and an
 * `ask`/`say` `type`: the webview merges/updates the transcript by timestamp
 * (`findLastIndex(msg => msg.ts === …)`, `mergeClineMessagesState`), so an entry
 * without one can never be reconciled and would corrupt the ordering — and the
 * outbound boundary schema (`clineMessageSchema`) rejects the whole page if any
 * entry is malformed. Mirrors the "filter invalid entries" step of
 * `boundTaskHistoryForWebview`.
 */
export function isShippableClineMessage(message: unknown): message is ClineMessage {
	if (typeof message !== "object" || message === null) {
		return false
	}
	const { ts, type } = message as { ts?: unknown; type?: unknown }
	return typeof ts === "number" && Number.isFinite(ts) && (type === "ask" || type === "say")
}

/** Exact serialized size of one message (bytes), used to enforce the budget. */
export function estimateClineMessageBytes(message: ClineMessage): number {
	return Buffer.byteLength(JSON.stringify(message) ?? "", "utf8")
}

/**
 * Newest-first accumulation of `messages` within the count/byte budget.
 *
 * The newest message is always returned even when a single message exceeds the
 * byte budget: dropping the active turn would break the chat UI, whereas one
 * oversized row is a bounded, visible cost.
 */
function boundTail(messages: readonly ClineMessage[], maxMessages: number, maxBytes: number): ClineMessage[] {
	const tail: ClineMessage[] = []
	let bytes = 0

	for (let i = messages.length - 1; i >= 0; i--) {
		const message = messages[i]
		const size = estimateClineMessageBytes(message)
		const withinCount = tail.length < maxMessages
		const withinBytes = bytes + size <= maxBytes

		if (tail.length > 0 && (!withinCount || !withinBytes)) {
			break
		}

		tail.push(message)
		bytes += size
	}

	tail.reverse()
	return tail
}

/**
 * Bounds the task transcript for a `state` push.
 *
 * Returns the transcript's first message (head anchor) followed by the newest
 * messages that fit within the remaining budget. The head anchor exists because
 * `ChatView` derives the active task from `messages.at(0)` (task header, scroll
 * lifecycle, Virtuoso key): a pure tail would make a history-resumed long task
 * render as a brand-new/empty chat. Its bytes are reserved up front so the
 * SHIPPED array honours the byte budget.
 *
 * `bounded` reports whether the transcript was truncated, i.e. whether the
 * webview should merge/offer "load earlier messages" rather than replace. A
 * transcript that fits entirely — including one whose single newest message is
 * over the byte budget (the active turn is never dropped) — is NOT bounded.
 */
export function projectClineMessagesForWebview(
	messages: readonly ClineMessage[] | undefined,
	options: { maxMessages?: number; maxBytes?: number } = {},
): BoundedClineMessagesForWebview {
	const shippable = (messages ?? []).filter(isShippableClineMessage)
	// `total` counts shippable messages only, so filtering an unusable entry
	// (no `ts`/`type`) does not by itself mark the window partial — nothing older
	// was withheld and the webview may still replace wholesale.
	const total = shippable.length

	const head = shippable[0]
	if (head === undefined) {
		return { messages: [], bounded: false, total: 0 }
	}

	const maxMessages = options.maxMessages ?? MAX_CLINE_MESSAGES_SHIPPED_TO_WEBVIEW
	const maxBytes = options.maxBytes ?? MAX_CLINE_MESSAGES_BYTES_SHIPPED_TO_WEBVIEW

	// Everything after the head anchor is the pool the tail window is drawn from,
	// with the head's bytes subtracted from the budget.
	const tail = boundTail(shippable.slice(1), maxMessages, Math.max(0, maxBytes - estimateClineMessageBytes(head)))
	const window = tail.length > 0 ? [head, ...tail] : [head]

	return { messages: window, bounded: window.length < total, total }
}

/**
 * Tail-anchored projection of the transcript for a `state` push. Thin wrapper
 * over {@link projectClineMessagesForWebview} for the state-assembly site.
 */
export function boundClineMessagesForWebview(
	messages: readonly ClineMessage[] | undefined,
	options: { maxMessages?: number; maxBytes?: number } = {},
): ClineMessage[] {
	return projectClineMessagesForWebview(messages, options).messages
}

/**
 * Selects the page of messages immediately OLDER than `beforeTs` for the
 * webview's "load earlier messages" flow (`getOlderClineMessages`).
 *
 * Returns the newest messages below `beforeTs` that fit the same budget used by
 * the `state` push (so a page can never itself trip the payload SLI), plus
 * `hasMore` so the caller can stop offering the affordance once the transcript
 * head is reached. `beforeTs` is exclusive: the webview passes the `ts` of its
 * oldest loaded message and receives a contiguous block ending right before it.
 */
export function selectOlderClineMessages(
	messages: readonly ClineMessage[] | undefined,
	beforeTs: number,
	options: { maxMessages?: number; maxBytes?: number } = {},
): { messages: ClineMessage[]; hasMore: boolean } {
	const candidates = (messages ?? []).filter(isShippableClineMessage).filter((message) => message.ts < beforeTs)

	const page = boundTail(
		candidates,
		options.maxMessages ?? MAX_CLINE_MESSAGES_SHIPPED_TO_WEBVIEW,
		options.maxBytes ?? MAX_CLINE_MESSAGES_BYTES_SHIPPED_TO_WEBVIEW,
	)

	return { messages: page, hasMore: page.length < candidates.length }
}
