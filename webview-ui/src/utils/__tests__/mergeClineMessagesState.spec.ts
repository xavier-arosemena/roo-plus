import type { ClineMessage } from "@roo-code/types"

import { mergeClineMessagesState, mergeOlderClineMessagesPage, sortClineMessagesByTs } from "../mergeClineMessagesState"

const message = (ts: number, text = `message-${ts}`): ClineMessage => ({ ts, type: "say", say: "text", text })

const tsList = (messages: readonly ClineMessage[] | undefined) => (messages ?? []).map((m) => m.ts)

describe("sortClineMessagesByTs", () => {
	it("sorts ascending by ts without mutating the input", () => {
		const input = [message(3), message(1), message(2)]
		expect(tsList(sortClineMessagesByTs(input))).toEqual([1, 2, 3])
		expect(tsList(input)).toEqual([3, 1, 2])
	})
})

describe("mergeClineMessagesState", () => {
	it("returns the previous list when the push carried no messages", () => {
		const previous = [message(1)]
		expect(tsList(mergeClineMessagesState(previous, undefined, true))).toEqual([1])
		expect(mergeClineMessagesState(undefined, undefined, true)).toEqual([])
	})

	it("replaces wholesale for an unbounded (complete) transcript", () => {
		const previous = [message(1), message(2)]
		const incoming = [message(9)]
		// Identity is preserved: the sequence guard and existing state semantics
		// compare the incoming array by reference.
		expect(mergeClineMessagesState(previous, incoming, undefined)).toBe(incoming)
		expect(mergeClineMessagesState(previous, incoming, false)).toBe(incoming)
	})

	it("replaces when nothing has been rendered yet", () => {
		const incoming = [message(3), message(1)]
		expect(mergeClineMessagesState([], incoming, true)).toBe(incoming)
	})

	describe("bounded window", () => {
		// Host window shape: [head anchor, ...newest tail messages].
		const window = [message(1), message(491), message(492), message(493)]

		it("keeps previously rendered older messages instead of erasing them", () => {
			// The webview had streamed 1..493 before the window shrank.
			const previous = [
				message(1),
				message(2),
				message(3),
				...Array.from({ length: 100 }, (_, i) => message(391 + i)),
			]

			const merged = mergeClineMessagesState(previous, window, true)

			// Ascending, duplicate-free, and the messages older than the window's
			// tail start (491) survive — no visible "top disappearing" flicker.
			const mergedTs = tsList(merged)
			expect(mergedTs).toEqual([1, 2, 3, ...Array.from({ length: 100 }, (_, i) => 391 + i), 491, 492, 493])
			expect(new Set(mergedTs).size).toBe(merged.length)
			expect(mergedTs).toEqual([...mergedTs].sort((a, b) => a - b))
		})

		it("drops previously known messages that the incoming window supersedes", () => {
			const previous = [message(1), message(490, "stale"), message(491, "stale")]
			const merged = mergeClineMessagesState(previous, window, true)

			// 490 is older than the tail start and not in the window → preserved;
			// 491 is in the window → the fresher window copy wins.
			expect(tsList(merged)).toEqual([1, 490, 491, 492, 493])
			expect(merged?.find((m) => m.ts === 491)?.text).toBe("message-491")
		})

		it("preserves nothing older than the head anchor", () => {
			const previous = [message(1), message(2)]
			const merged = mergeClineMessagesState(previous, window, true)
			expect(tsList(merged)).toEqual([1, 2, 491, 492, 493])
		})
	})
})

describe("mergeOlderClineMessagesPage", () => {
	it("inserts a lazily fetched page in transcript order", () => {
		const current = [message(1), message(491), message(492)]
		const page = [message(489), message(490)]

		const merged = mergeOlderClineMessagesPage(current, page)

		expect(tsList(merged)).toEqual([1, 489, 490, 491, 492])
	})

	it("keeps the transcript duplicate-free by refreshing entries from the page", () => {
		const current = [message(1), message(490, "stale"), message(491)]
		const page = [message(490, "fresh")]

		const merged = mergeOlderClineMessagesPage(current, page)

		expect(tsList(merged)).toEqual([1, 490, 491])
		expect(merged.find((m) => m.ts === 490)?.text).toBe("fresh")
	})

	it("handles empty inputs", () => {
		expect(tsList(mergeOlderClineMessagesPage(undefined, [message(2)]))).toEqual([2])
		expect(tsList(mergeOlderClineMessagesPage([message(2)], []))).toEqual([2])
		expect(tsList(mergeOlderClineMessagesPage(undefined, undefined))).toEqual([])
	})
})
