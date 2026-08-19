import { LRUCache } from "lru-cache"

/**
 * External store backing the ChatView "ever-visible messages" seen-set.
 *
 * Read it during render via `useSyncExternalStore` and mutate it only from
 * effects. All mutations are idempotent — they notify subscribers only when
 * something actually changed — which is what makes the render→effect→render
 * cycle converge instead of looping.
 *
 * Memory is bounded by the LRUCache (`max` entries, `ttl` expiry) plus the
 * optional periodic `prune()` that drops keys no longer in the current
 * message/viewport sets.
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

export function createSeenTsStore(max = 100, ttlMs = 1000 * 60 * 5): SeenTsStore {
	const cache = new LRUCache<number, true>({ max, ttl: ttlMs })
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
		has: (ts) => cache.has(ts),
		add: (ts) => {
			const isNew = !cache.has(ts)
			// Always set() so existing keys refresh their recency (matches the
			// original `everVisibleMessagesTsRef.current.set(...)` behavior).
			cache.set(ts, true)
			if (isNew) {
				emit()
			}
		},
		clear: () => {
			if (cache.size > 0) {
				cache.clear()
				emit()
			}
		},
		prune: (keep) => {
			let changed = false
			for (const key of cache.keys()) {
				if (!keep.has(key)) {
					cache.delete(key)
					changed = true
				}
			}
			if (changed) {
				emit()
			}
		},
	}
}
