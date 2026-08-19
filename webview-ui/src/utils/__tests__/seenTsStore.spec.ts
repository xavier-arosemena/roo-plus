import { createSeenTsStore } from "../seenTsStore"

describe("createSeenTsStore", () => {
	const makeStore = () => createSeenTsStore()

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

	describe("unbounded by capacity (LRU churn regression, issue #250)", () => {
		it("should_keep_every_added_timestamp_regardless_of_how_many_are_added", () => {
			// Arrange: previously the store was an LRUCache(max=100); once more
			// than 100 timestamps were added, older ones were evicted — which
			// un-hid still-visible messages and re-added them forever.
			const store = makeStore()

			// Act: add far more than any prior capacity
			for (let ts = 0; ts < 1000; ts++) {
				store.add(ts)
			}

			// Assert: every single timestamp is still seen — no eviction
			for (let ts = 0; ts < 1000; ts++) {
				expect(store.has(ts)).toBe(true)
			}
		})

		it("should_keep_timestamps_of_messages_in_the_current_message_set_after_prune", () => {
			// Arrange
			const store = makeStore()
			for (let ts = 0; ts < 1000; ts++) {
				store.add(ts)
			}

			// Act: prune against a message set that contains every timestamp
			const keep = new Set(Array.from({ length: 1000 }, (_, i) => i))
			store.prune(keep)

			// Assert: nothing removed because everything is still a message
			for (let ts = 0; ts < 1000; ts++) {
				expect(store.has(ts)).toBe(true)
			}
		})
	})

	describe("re-adding an existing timestamp", () => {
		it("should_be_a_no_op_and_not_notify", () => {
			// Arrange
			const store = makeStore()
			store.add(1)
			store.add(2)
			const listener = vi.fn()
			store.subscribe(listener)
			const snapshot = store.getSnapshot()

			// Act: re-adding an already-seen timestamp (mirrors the viewport
			// write pattern, which re-adds visible timestamps on every render)
			store.add(1)

			// Assert: no-op, no notify, no snapshot bump
			expect(listener).not.toHaveBeenCalled()
			expect(store.getSnapshot()).toBe(snapshot)
			expect(store.has(1)).toBe(true)
			expect(store.has(2)).toBe(true)
		})
	})
})
