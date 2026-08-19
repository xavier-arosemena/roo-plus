/**
 * External store backing the ChatView "ever-visible messages" seen-set.
 *
 * Read it during render via `useSyncExternalStore` and mutate it only from
 * effects. All mutations are idempotent — they notify subscribers only when
 * something actually changed — which is what makes the render→effect→render
 * cycle converge instead of looping.
 *
 * Memory is bounded by the current message set, NOT by a small capacity LRU:
 * `prune()` (called periodically by ChatView keyed on the message set) drops
 * every timestamp no longer present in the current messages/viewport, so the
 * set can never outgrow the messages that exist. A capacity/ttl-bounded LRU
 * would instead evict timestamps of messages that are still visible, which
 * un-hides those messages, which re-adds them on the next viewport effect,
 * evicting other still-visible timestamps in turn — an endless
 * render→effect→render churn (UI freeze) with more than `max` messages.
 */
export interface SeenTsStore {
	/** Monotonically increasing version; stable between actual mutations. */
	getSnapshot: () => number
	/** Standard useSyncExternalStore subscribe; returns an unsubscribe fn. */
	subscribe: (onStoreChange: () => void) => () => void
	has: (ts: number) => boolean
	/** Idempotent: no-op (and no notify) when the timestamp is already seen. */
	add: (ts: number) => void
	/** Idempotent: notifies only when entries were actually removed. */
	clear: () => void
	/** Delete every key not present in `keep`; notifies only on actual removal. */
	prune: (keep: ReadonlySet<number>) => void
}

export function createSeenTsStore(): SeenTsStore {
	const seen = new Set<number>()
	let version = 0
	const listeners = new Set<() => void>()

	const emit = () => {
		version += 1
		listeners.forEach((listener) => listener())
	}

	return {
		getSnapshot: () => version,
		subscribe: (listener) => {
			listeners.add(listener)
			return () => {
				listeners.delete(listener)
			}
		},
		has: (ts) => seen.has(ts),
		add: (ts) => {
			if (!seen.has(ts)) {
				seen.add(ts)
				emit()
			}
		},
		clear: () => {
			if (seen.size > 0) {
				seen.clear()
				emit()
			}
		},
		prune: (keep) => {
			let changed = false
			for (const key of seen) {
				if (!keep.has(key)) {
					seen.delete(key)
					changed = true
				}
			}
			if (changed) {
				emit()
			}
		},
	}
}
