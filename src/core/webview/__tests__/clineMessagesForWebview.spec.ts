// npx vitest run core/webview/__tests__/clineMessagesForWebview.spec.ts

import type { ClineMessage } from "@roo-code/types"

import {
	MAX_CLINE_MESSAGES_BYTES_SHIPPED_TO_WEBVIEW,
	MAX_CLINE_MESSAGES_SHIPPED_TO_WEBVIEW,
	boundClineMessagesForWebview,
	estimateClineMessageBytes,
	isShippableClineMessage,
	projectClineMessagesForWebview,
	selectOlderClineMessages,
} from "../clineMessagesForWebview"

/** Seq-numbered transcript message (`ts` doubles as the index). */
function message(ts: number, text = `message-${ts}`): ClineMessage {
	return { ts, type: "say", say: "text", text }
}

/** Transcript of `count` messages whose `ts` runs 1..count. */
function transcript(count: number, textOf: (ts: number) => string = (ts) => `message-${ts}`): ClineMessage[] {
	return Array.from({ length: count }, (_, i) => message(i + 1, textOf(i + 1)))
}

describe("isShippableClineMessage", () => {
	test.each([
		["null", null],
		["undefined", undefined],
		["a string", "message"],
		["a message without ts", { type: "say", say: "text" }],
		["a message with a non-numeric ts", { ts: "1", type: "say", say: "text" }],
		["a message with NaN", { ts: Number.NaN, type: "say", say: "text" }],
		["a message without type", { ts: 1, say: "text" }],
		["a message with an unknown type", { ts: 1, type: "other" }],
	])("rejects %s", (_name, value) => {
		expect(isShippableClineMessage(value)).toBe(false)
	})

	test("accepts ask/say messages carrying a finite ts", () => {
		expect(isShippableClineMessage({ ts: 1, type: "say", say: "text" })).toBe(true)
		expect(isShippableClineMessage({ ts: 2, type: "ask", ask: "followup" })).toBe(true)
	})
})

describe("projectClineMessagesForWebview", () => {
	test("ships the whole transcript unbounded when it fits the budget", () => {
		const messages = transcript(5)
		const result = projectClineMessagesForWebview(messages)

		expect(result.bounded).toBe(false)
		expect(result.total).toBe(5)
		expect(result.messages.map((m) => m.ts)).toEqual([1, 2, 3, 4, 5])
		// A complete transcript must be the same array shape the webview replaced
		// before bounding existed (no head-anchor duplication).
		expect(result.messages).toEqual(messages)
	})

	test("tail-anchors to the newest N messages and keeps the head anchor", () => {
		const result = projectClineMessagesForWebview(transcript(500), { maxMessages: 10 })

		expect(result.bounded).toBe(true)
		expect(result.total).toBe(500)
		// Head anchor (the chat header's `messages.at(0)`) + newest 10.
		expect(result.messages).toHaveLength(11)
		expect(result.messages[0].ts).toBe(1)
		expect(result.messages.slice(1).map((m) => m.ts)).toEqual([491, 492, 493, 494, 495, 496, 497, 498, 499, 500])
	})

	test("never loses the newest message, even when it exceeds the byte budget", () => {
		const oversized = message(2, "x".repeat(MAX_CLINE_MESSAGES_BYTES_SHIPPED_TO_WEBVIEW * 2))
		const result = projectClineMessagesForWebview([message(1), oversized])

		// Nothing was withheld (the whole 2-message transcript still ships), so
		// the webview must still replace — the byte budget is exceeded by the
		// single oversized active row rather than by truncation.
		expect(result.bounded).toBe(false)
		expect(result.messages.map((m) => m.ts)).toEqual([1, 2])
		expect(result.messages.at(-1)).toBe(oversized)
	})

	test("holds the byte budget for realistically sized messages (>= 1 MB transcript)", () => {
		// ~1.1 MB across 900 messages ≈ 1.2 KB each — the shape that produced the
		// 962 KB `clineMessages` field in the 2026-09-15 incident.
		const result = projectClineMessagesForWebview(transcript(900, () => "y".repeat(1200)))

		expect(result.bounded).toBe(true)
		const shippedBytes = result.messages.reduce((total, m) => total + estimateClineMessageBytes(m), 0)
		expect(shippedBytes).toBeLessThanOrEqual(MAX_CLINE_MESSAGES_BYTES_SHIPPED_TO_WEBVIEW)
		// Tail-anchored: the newest message is always present.
		expect(result.messages.at(-1)?.ts).toBe(900)
		expect(result.messages[0].ts).toBe(1)
	})

	test("filters invalid entries without claiming the window is partial", () => {
		// Nothing older is withheld here, so the projection stays `bounded: false`
		// (the webview replaces wholesale); only the unusable entry is dropped.
		const withInvalid = [...transcript(3), { type: "say", say: "text" } as unknown as ClineMessage]
		const result = projectClineMessagesForWebview(withInvalid)

		expect(result.total).toBe(3)
		expect(result.bounded).toBe(false)
		expect(result.messages.map((m) => m.ts)).toEqual([1, 2, 3])
	})

	test("handles undefined/empty transcripts", () => {
		expect(projectClineMessagesForWebview(undefined)).toEqual({ messages: [], bounded: false, total: 0 })
		expect(projectClineMessagesForWebview([])).toEqual({ messages: [], bounded: false, total: 0 })
	})

	test("boundClineMessagesForWebview returns the projection's message array", () => {
		const result = projectClineMessagesForWebview(transcript(50), { maxMessages: 4 })
		expect(boundClineMessagesForWebview(transcript(50), { maxMessages: 4 })).toEqual(result.messages)
		expect(MAX_CLINE_MESSAGES_SHIPPED_TO_WEBVIEW).toBeGreaterThan(0)
	})
})

describe("selectOlderClineMessages", () => {
	test("returns the page immediately older than beforeTs (exclusive)", () => {
		const page = selectOlderClineMessages(transcript(500), 490, { maxMessages: 10 })

		expect(page.messages.map((m) => m.ts)).toEqual([480, 481, 482, 483, 484, 485, 486, 487, 488, 489])
		expect(page.hasMore).toBe(true)
	})

	test("reports hasMore=false once the transcript head is reached", () => {
		const page = selectOlderClineMessages(transcript(5), 3, { maxMessages: 10 })

		expect(page.messages.map((m) => m.ts)).toEqual([1, 2])
		expect(page.hasMore).toBe(false)
	})

	test("respects the byte budget so a page can never trip the payload SLI", () => {
		const messages = transcript(400, () => "z".repeat(1200))
		const page = selectOlderClineMessages(messages, 400)

		const shippedBytes = page.messages.reduce((total, m) => total + estimateClineMessageBytes(m), 0)
		expect(shippedBytes).toBeLessThanOrEqual(MAX_CLINE_MESSAGES_BYTES_SHIPPED_TO_WEBVIEW)
		expect(page.hasMore).toBe(true)
		// The page ends exactly where the requester asked it to.
		expect(page.messages.at(-1)?.ts).toBe(399)
	})

	test("ignores invalid entries and empty inputs", () => {
		const withInvalid = [...transcript(4), { ts: Number.NaN, type: "say" } as unknown as ClineMessage]
		expect(selectOlderClineMessages(withInvalid, 3).messages.map((m) => m.ts)).toEqual([1, 2])

		expect(selectOlderClineMessages(undefined, 3)).toEqual({ messages: [], hasMore: false })
		expect(selectOlderClineMessages(transcript(3), 1)).toEqual({ messages: [], hasMore: false })
	})
})
