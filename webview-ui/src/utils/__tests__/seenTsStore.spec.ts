import { createSeenTsStore } from "../seenTsStore"

describe("createSeenTsStore", () => {
	const makeStore = () => createSeenTsStore(3, 1000 * 60 * 5)

	describe("has/add", () => {
		it("should_report_added_timestamps_as_seen_and_absent_ones_as_not_seen", () => {
			// Arrange
			const store = makeStore()

			// Act
			store.add(101)
			store.add(202)

			// Assert
			expect(store.has(101)).toBe(true)
			expect(store.has(202)).toBe(true)
			expect(store.has(303)).toBe(false)
		})

		it("should_be_idempotent_adding_same_timestamp_should_not_notify_listeners", () => {
			// Arrange
			const store = makeStore()
			const listener = vi.fn()
			store.subscribe(listener)

			// Act
			store.add(101)
			const snapshotAfterFirstAdd = store.getSnapshot()
			store.add(101) // duplicate add — must be a no-op

			// Assert
			expect(store.getSnapshot()).toBe(snapshotAfterFirstAdd)
			expect(listener).toHaveBeenCalledTimes(1)
		})
	})

	describe("getSnapshot", () => {
		it("should_return_stable_snapshot_when_nothing_changes", () => {
			// Arrange
			const store = makeStore()

			// Act
			store.add(1)
			const a = store.getSnapshot()
			const b = store.getSnapshot()

			// Assert
			expect(a).toBe(b)
		})

		it("should_increment_snapshot_only_when_a_mutation_actually_happens", () => {
			// Arrange
			const store = makeStore()
			const s0 = store.getSnapshot()

			// Act
			store.add(1)
			const s1 = store.getSnapshot()
			store.add(1) // duplicate — no-op
			const s2 = store.getSnapshot()
			store.add(2)
			const s3 = store.getSnapshot()

			// Assert
			expect(s1).not.toBe(s0)
			expect(s2).toBe(s1)
			expect(s3).not.toBe(s2)
		})
	})

	describe("subscribe", () => {
		it("should_notify_listeners_when_store_changes", () => {
			// Arrange
			const store = makeStore()
			const listener = vi.fn()

			// Act
			store.subscribe(listener)
			store.add(42)

			// Assert
			expect(listener).toHaveBeenCalledTimes(1)
		})

		it("should_stop_notifying_after_unsubscribe", () => {
			// Arrange
			const store = makeStore()
			const listener = vi.fn()

			// Act
			const unsubscribe = store.subscribe(listener)
			unsubscribe()
			store.add(42)

			// Assert
			expect(listener).not.toHaveBeenCalled()
		})
	})

	describe("prune", () => {
		it("should_delete_keys_not_in_the_keep_set_and_keep_the_rest", () => {
			// Arrange
			const store = makeStore()
			store.add(1)
			store.add(2)
			store.add(3)

			// Act
			store.prune(new Set([2, 3, 99]))

			// Assert
			expect(store.has(1)).toBe(false)
			expect(store.has(2)).toBe(true)
			expect(store.has(3)).toBe(true)
		})

		it("should_not_notify_when_nothing_is_pruned", () => {
			// Arrange
			const store = makeStore()
			store.add(1)
			const listener = vi.fn()
			store.subscribe(listener)
			const snapshot = store.getSnapshot()

			// Act
			store.prune(new Set([1, 2, 3]))

			// Assert
			expect(listener).not.toHaveBeenCalled()
			expect(store.getSnapshot()).toBe(snapshot)
		})

		it("should_notify_once_when_something_is_pruned", () => {
			// Arrange
			const store = makeStore()
			store.add(1)
			store.add(2)
			const listener = vi.fn()
			store.subscribe(listener)

			// Act
			store.prune(new Set([1]))

			// Assert
			expect(listener).toHaveBeenCalledTimes(1)
			expect(store.has(2)).toBe(false)
		})
	})

	describe("clear", () => {
		it("should_remove_all_keys_and_notify_once", () => {
			// Arrange
			const store = makeStore()
			store.add(1)
			store.add(2)
			const listener = vi.fn()
			store.subscribe(listener)

			// Act
			store.clear()

			// Assert
			expect(store.has(1)).toBe(false)
			expect(store.has(2)).toBe(false)
			expect(listener).toHaveBeenCalledTimes(1)
		})

		it("should_not_notify_when_already_empty", () => {
			// Arrange
			const store = makeStore()
			const listener = vi.fn()
			store.subscribe(listener)
			const snapshot = store.getSnapshot()

			// Act
			store.clear()

			// Assert
			expect(listener).not.toHaveBeenCalled()
			expect(store.getSnapshot()).toBe(snapshot)
		})
	})

	describe("bounded memory", () => {
		it("should_evict_least_recently_used_entries_beyond_max", () => {
			// Arrange
			const store = makeStore() // max = 3

			// Act
			store.add(1)
			store.add(2)
			store.add(3)
			store.add(4) // evicts 1 (LRU)

			// Assert
			expect(store.has(1)).toBe(false)
			expect(store.has(2)).toBe(true)
			expect(store.has(3)).toBe(true)
			expect(store.has(4)).toBe(true)
		})

		it("should_expire_entries_after_ttl", async () => {
			// Arrange: lru-cache clocks via performance.now(), which vitest fake
			// timers do not advance, so use a real short ttl + real delay.
			const store = createSeenTsStore(100, 25) // 25ms ttl

			// Act
			store.add(1)
			expect(store.has(1)).toBe(true)
			await new Promise((resolve) => setTimeout(resolve, 120)) // 4x ttl

			// Assert
			expect(store.has(1)).toBe(false)
		})
	})

	describe("LRU reordering", () => {
		it("should_refresh_recency_when_re_adding_an_existing_key", () => {
			// Arrange
			const store = makeStore() // max = 3

			// Act: re-adding 1 refreshes its recency (mirrors the viewport write
			// pattern, which re-adds visible timestamps on every render)
			store.add(1)
			store.add(2)
			store.add(3)
			store.add(1) // 1 becomes MRU; 2 is now LRU
			store.add(4) // evicts 2

			// Assert
			expect(store.has(1)).toBe(true)
			expect(store.has(2)).toBe(false)
			expect(store.has(3)).toBe(true)
			expect(store.has(4)).toBe(true)
		})
	})
})
