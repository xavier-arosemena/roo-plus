import type { HistoryItem } from "@roo-code/types"

import { appendOlderTaskHistoryPage, mergeTaskHistoryState, sortTaskHistoryByTsDesc } from "../mergeTaskHistoryState"

const item = (id: string, ts: number): HistoryItem => ({
	id,
	number: 1,
	ts,
	task: `task-${id}`,
	tokensIn: 0,
	tokensOut: 0,
	totalCost: 0,
})

const ids = (items: readonly HistoryItem[] | undefined) => (items ?? []).map((i) => i.id)

describe("sortTaskHistoryByTsDesc", () => {
	it("sorts newest-first without mutating the input", () => {
		const input = [item("a", 1), item("b", 3), item("c", 2)]

		expect(ids(sortTaskHistoryByTsDesc(input))).toEqual(["b", "c", "a"])
		expect(ids(input)).toEqual(["a", "b", "c"])
	})
})

describe("mergeTaskHistoryState", () => {
	it("returns the previous list when the push carried no history", () => {
		const previous = [item("a", 1)]

		expect(ids(mergeTaskHistoryState(previous, undefined, true))).toEqual(["a"])
		expect(mergeTaskHistoryState(undefined, undefined, true)).toEqual([])
	})

	it("replaces wholesale for an unbounded (complete) history", () => {
		const previous = [item("old", 1)]
		const incoming = [item("new", 5)]

		// Identity is preserved: the non-bounded path keeps today's replace
		// semantics (including delete flows that ship a shrunken list).
		expect(mergeTaskHistoryState(previous, incoming, undefined)).toBe(incoming)
		expect(mergeTaskHistoryState(previous, incoming, false)).toBe(incoming)
	})

	it("replaces when nothing is loaded yet", () => {
		const incoming = [item("a", 1), item("b", 2)]

		expect(mergeTaskHistoryState([], incoming, true)).toBe(incoming)
	})

	describe("bounded window", () => {
		it("keeps rows the webview already loaded that fell out of the window", () => {
			// The panel had paged three older rows in, then a new state push
			// shipped only the newest window.
			const previous = [item("n2", 100), item("n1", 99), item("o1", 5), item("o2", 4)]
			const incoming = [item("n3", 101), item("n2", 100), item("n1", 99)]

			const merged = mergeTaskHistoryState(previous, incoming, true)

			expect(ids(merged)).toEqual(["n3", "n2", "n1", "o1", "o2"])
		})

		it("refreshes rows present in both the window and the loaded list", () => {
			const previous = [item("n1", 99) as HistoryItem]
			const refreshed = { ...item("n1", 99), task: "renamed" } as HistoryItem
			const incoming = [refreshed, item("n2", 100)]

			const merged = mergeTaskHistoryState(previous, incoming, true)

			expect(ids(merged)).toEqual(["n2", "n1"])
			expect(merged.find((i) => i.id === "n1")).toBe(refreshed)
		})

		it("never resurrects rows newer than the window's oldest row", () => {
			// A row that is NOT in the window but sits inside its ts range was
			// deliberately omitted (e.g. deleted); it must not come back.
			const previous = [item("deleted", 100), item("keep", 5)]
			const incoming = [item("a", 101), item("b", 99)]

			const merged = mergeTaskHistoryState(previous, incoming, true)

			expect(ids(merged)).toEqual(["a", "b", "keep"])
		})
	})
})

describe("appendOlderTaskHistoryPage", () => {
	it("appends a page newest-first and without duplicates", () => {
		const current = [item("n1", 100), item("n2", 99)]
		const page = [item("o1", 50), item("n2", 99)]

		const merged = appendOlderTaskHistoryPage(current, page)

		expect(ids(merged)).toEqual(["n1", "n2", "o1"])
	})

	it("returns a copy when the page is empty or missing", () => {
		const current = [item("a", 1)]

		expect(ids(appendOlderTaskHistoryPage(current, []))).toEqual(["a"])
		expect(ids(appendOlderTaskHistoryPage(current, undefined))).toEqual(["a"])
		expect(appendOlderTaskHistoryPage(undefined, [item("a", 2)])).toHaveLength(1)
	})
})
