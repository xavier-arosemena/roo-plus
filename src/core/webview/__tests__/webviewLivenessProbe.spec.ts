// npx vitest run core/webview/__tests__/webviewLivenessProbe.spec.ts

import {
	WEBVIEW_LIVENESS_DEBUG_ENV,
	WEBVIEW_LIVENESS_MISSED_ERROR,
	WEBVIEW_LIVENESS_PING_INTERVAL_MS,
	WEBVIEW_LIVENESS_PONG_TIMEOUT_MS,
	WEBVIEW_LIVENESS_RTT_ERROR_P99_MS,
	WEBVIEW_LIVENESS_RTT_WARN_P99_MS,
	WEBVIEW_LIVENESS_WINDOW_MS,
	WebviewLivenessProbe,
	isWebviewLivenessDebugEnabled,
	isWebviewLivenessDebugEnabledFromEnv,
} from "../webviewLivenessProbe"

const START_TIME = 1_000_000

/**
 * Every `[webview-liveness]` line, in both shapes (periodic / WARN / ERROR):
 * the literal prefix, static labels, integers and the static runbook path ONLY.
 * Anything else — a task id, a path, message text, a provider value — is a leak.
 */
const LIVENESS_LINE_PATTERN =
	/^\[webview-liveness\] (WARN |ERROR )?rtt_ms p50=\d+ p99=\d+ max=\d+ \| missed=\d+ n=\d+( \| window runbook=docs\/runbooks\/gray-webview\.md)?$/

interface Harness {
	probe: WebviewLivenessProbe
	logLines: string[]
	pings: number[]
	/** Advances the fake clock to the armed timer and fires it (one ping tick). */
	runDueTick: () => void
	hasTimer: () => boolean
	scheduleCalls: () => number
	/** Runs `count` ping ticks, i.e. `count * WEBVIEW_LIVENESS_PING_INTERVAL_MS`. */
	runTicks: (count: number) => void
}

/**
 * Fake clock + single-slot scheduler. `replyLatencyMs` makes the fake renderer
 * answer each ping that many milliseconds after it was posted, delivered on the
 * way to the next tick (so nothing depends on real timers).
 */
const createHarness = (options: { enabled: boolean; replyLatencyMs?: number }): Harness => {
	let now = START_TIME
	const logLines: string[] = []
	const pings: number[] = []
	const pendingReplies = new Map<number, number>()
	let scheduledTimer: { at: number; callback: () => void } | null = null
	let scheduleCalls = 0

	const probe = new WebviewLivenessProbe({
		enabled: options.enabled,
		now: () => now,
		log: (line) => logLines.push(line),
		postPing: (seq) => {
			pings.push(seq)
			if (options.replyLatencyMs !== undefined) {
				pendingReplies.set(seq, now)
			}
		},
		schedule: (callback, delayMs) => {
			scheduleCalls++
			const timer = { at: now + delayMs, callback }
			scheduledTimer = timer
			return () => {
				if (scheduledTimer === timer) {
					scheduledTimer = null
				}
			}
		},
	})

	/**
	 * Delivers every fake reply due at or before `target`, stepping the fake clock
	 * to each reply's EXACT due time first — otherwise a reply would be recorded at
	 * the next tick boundary and the measured RTT would be the ping interval.
	 */
	const deliverDueReplies = (target: number) => {
		for (;;) {
			let nextSeq: number | undefined
			let nextDue = Number.POSITIVE_INFINITY

			for (const [seq, sentAt] of pendingReplies) {
				const due = sentAt + (options.replyLatencyMs ?? 0)
				if (due <= target && due < nextDue) {
					nextDue = due
					nextSeq = seq
				}
			}

			if (nextSeq === undefined) {
				return
			}

			now = Math.max(now, nextDue)
			pendingReplies.delete(nextSeq)
			probe.recordPong(nextSeq)
		}
	}

	const runDueTick = () => {
		const timer = scheduledTimer
		if (!timer) {
			return
		}

		scheduledTimer = null
		deliverDueReplies(timer.at)
		now = timer.at
		timer.callback()
	}

	return {
		probe,
		logLines,
		pings,
		runDueTick,
		hasTimer: () => scheduledTimer !== null,
		scheduleCalls: () => scheduleCalls,
		runTicks: (count) => {
			for (let i = 0; i < count; i++) {
				runDueTick()
			}
		},
	}
}

/** Ticks needed for the probe to flush exactly one window. */
const TICKS_PER_WINDOW = WEBVIEW_LIVENESS_WINDOW_MS / WEBVIEW_LIVENESS_PING_INTERVAL_MS + 1

describe("WebviewLivenessProbe", () => {
	describe("gate", () => {
		test("accepts 1/true (case-insensitive) and nothing else", () => {
			expect(WEBVIEW_LIVENESS_DEBUG_ENV).toBe("ROO_WEBVIEW_LIVENESS_DEBUG")
			expect(isWebviewLivenessDebugEnabled("1")).toBe(true)
			expect(isWebviewLivenessDebugEnabled("true")).toBe(true)
			expect(isWebviewLivenessDebugEnabled("TRUE")).toBe(true)
			expect(isWebviewLivenessDebugEnabled("0")).toBe(false)
			expect(isWebviewLivenessDebugEnabled("")).toBe(false)
			// Explicit `undefined` is an input, not a fall-through to the ambient env.
			expect(isWebviewLivenessDebugEnabled(undefined)).toBe(false)
		})

		test("reads the env through an injected map, so the suite never touches the ambient environment", () => {
			expect(isWebviewLivenessDebugEnabledFromEnv({ ROO_WEBVIEW_LIVENESS_DEBUG: "1" })).toBe(true)
			expect(isWebviewLivenessDebugEnabledFromEnv({ ROO_WEBVIEW_LIVENESS_DEBUG: "0" })).toBe(false)
			expect(isWebviewLivenessDebugEnabledFromEnv({})).toBe(false)
		})
	})

	test("flag off ⇒ completely inert: no timer, no ping, no output", () => {
		const h = createHarness({ enabled: false })

		h.probe.start()
		h.probe.recordPong(1)
		h.runTicks(20)

		expect(h.probe.enabled).toBe(false)
		expect(h.pings).toEqual([])
		expect(h.logLines).toEqual([])
		expect(h.scheduleCalls()).toBe(0)
		expect(h.hasTimer()).toBe(false)
	})

	test("flag on: pings on the interval and re-arms a single timer", () => {
		const h = createHarness({ enabled: true })

		h.probe.start()

		// `start` pings immediately and arms exactly one timer.
		expect(h.pings).toEqual([1])
		expect(h.hasTimer()).toBe(true)
		expect(h.scheduleCalls()).toBe(1)

		h.runDueTick()

		expect(h.pings).toEqual([1, 2])
		expect(h.scheduleCalls()).toBe(2)
		expect(h.logLines).toEqual([])
	})

	test("computes RTT percentiles from the injected clock", () => {
		const h = createHarness({ enabled: true, replyLatencyMs: 250 })

		h.probe.start()
		// One ping per 5 s tick, reply after 250 ms; the 13th tick flushes the 60 s window.
		h.runTicks(TICKS_PER_WINDOW)

		expect(h.logLines).toEqual(["[webview-liveness] rtt_ms p50=250 p99=250 max=250 | missed=0 n=12"])
	})

	test("WARNs when the tail RTT exceeds the WARN threshold", () => {
		const h = createHarness({ enabled: true, replyLatencyMs: WEBVIEW_LIVENESS_RTT_WARN_P99_MS })

		h.probe.start()
		h.runTicks(TICKS_PER_WINDOW)

		expect(h.logLines).toEqual([
			`[webview-liveness] WARN rtt_ms p50=${WEBVIEW_LIVENESS_RTT_WARN_P99_MS} p99=${WEBVIEW_LIVENESS_RTT_WARN_P99_MS} max=${WEBVIEW_LIVENESS_RTT_WARN_P99_MS} | missed=0 n=12`,
		])
	})

	test("ERRORs (with the runbook) when the tail RTT exceeds the ERROR threshold", () => {
		const h = createHarness({ enabled: true, replyLatencyMs: WEBVIEW_LIVENESS_RTT_ERROR_P99_MS })

		h.probe.start()
		h.runTicks(TICKS_PER_WINDOW)

		expect(h.logLines).toEqual([
			`[webview-liveness] ERROR rtt_ms p50=${WEBVIEW_LIVENESS_RTT_ERROR_P99_MS} p99=${WEBVIEW_LIVENESS_RTT_ERROR_P99_MS} max=${WEBVIEW_LIVENESS_RTT_ERROR_P99_MS} | missed=0 n=12 | window runbook=docs/runbooks/gray-webview.md`,
		])
	})

	test("ERRORs when pongs stop arriving altogether", () => {
		const h = createHarness({ enabled: true })

		h.probe.start()
		h.runTicks(TICKS_PER_WINDOW)

		expect(h.logLines).toHaveLength(1)
		expect(h.logLines[0]).toMatch(LIVENESS_LINE_PATTERN)
		expect(h.logLines[0]).toContain("[webview-liveness] ERROR")
		expect(h.logLines[0]).toContain("n=0")
		expect(h.logLines[0]).toContain("window runbook=docs/runbooks/gray-webview.md")

		const missed = Number(/missed=(\d+)/.exec(h.logLines[0])?.[1])
		expect(missed).toBeGreaterThanOrEqual(WEBVIEW_LIVENESS_MISSED_ERROR)
	})

	test("ages an unanswered ping out as missed only after the pong timeout", () => {
		const h = createHarness({ enabled: true })

		h.probe.start()

		// Just under the timeout: the ping is still pending, so the window closes with
		// no missed pong and no RTT sample — and stays silent.
		h.runTicks(Math.floor(WEBVIEW_LIVENESS_PONG_TIMEOUT_MS / WEBVIEW_LIVENESS_PING_INTERVAL_MS) - 1)
		const beforeTimeout = h.logLines.length
		h.runDueTick()
		expect(h.logLines.length).toBe(beforeTimeout)

		// Past the timeout the same ping is counted missed (a WARN, still no RTT).
		h.runTicks(TICKS_PER_WINDOW)
		expect(h.logLines.some((line) => line.includes("WARN") || line.includes("ERROR"))).toBe(true)
	})

	test("ignores unknown and duplicate pongs instead of double-counting", () => {
		const h = createHarness({ enabled: true })

		h.probe.start()
		h.probe.recordPong(999) // never sent
		h.probe.recordPong(1)
		h.probe.recordPong(1) // duplicate
		h.probe.recordPong(Number.NaN)
		h.runTicks(TICKS_PER_WINDOW)

		// Exactly one RTT sample from seq 1 → n=1 on the flushed line.
		expect(h.logLines.some((line) => line.includes("n=1"))).toBe(true)
	})

	test("privacy: every emitted line is numbers + the literal prefix + static labels", () => {
		const h = createHarness({ enabled: true, replyLatencyMs: 40 })

		h.probe.start()
		h.runTicks(TICKS_PER_WINDOW * 2)

		expect(h.logLines.length).toBeGreaterThan(0)
		for (const line of h.logLines) {
			expect(line).toMatch(LIVENESS_LINE_PATTERN)
		}
	})

	test("dispose cancels the timer, stops pinging and drops pending samples", () => {
		const h = createHarness({ enabled: true, replyLatencyMs: 10 })

		h.probe.start()
		h.runDueTick()
		h.probe.dispose()

		expect(h.hasTimer()).toBe(false)

		const pingsAtDispose = h.pings.length
		const logsAtDispose = h.logLines.length

		h.runTicks(TICKS_PER_WINDOW * 2)
		h.probe.recordPong(1)

		expect(h.pings.length).toBe(pingsAtDispose)
		expect(h.logLines.length).toBe(logsAtDispose)
	})
})
