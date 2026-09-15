// npx vitest run core/webview/__tests__/extensionHostHealthMetrics.spec.ts

import type { ExtensionMessage, WebviewPayloadSizeEvent } from "@roo-code/types"

import {
	ELU_ERROR_MAX_MS,
	ELU_ERROR_P99_MS,
	ELU_WARN_P99_MS,
	HEARTBEAT_INTERVAL_MS,
	HOST_HEALTH_DEBUG_ENV,
	HOST_HEALTH_WINDOW_MS,
	JITTER_ERROR_MAX_MS,
	JITTER_WARN_MAX_MS,
	ExtensionHostHealthMetrics,
	isHostHealthDebugEnabled,
	type CpuUsage,
	type EventLoopDelayHistogram,
	type ExtensionHostHealthMetricsDeps,
} from "../extensionHostHealthMetrics"
import { METRICS_WINDOW_MS, WebviewPayloadMetrics } from "../webviewPayloadMetrics"

const MB = 1024 * 1024
const KB = 1024
const START_TIME = 1_000_000

/** The §4.6 periodic summary line, exactly: static labels + integers only. */
const PERIODIC_LINE_PATTERN =
	/^\[host-health\] elu_ms p50=\d+ p95=\d+ p99=\d+ max=\d+ mean=\d+ \| jitter_ms max=\d+ \| cpu_pct=\d+ \| heap_mb=\d+ rss_mb=\d+ ext_mb=\d+ \| state_serialize_ms p50=\d+ p99=\d+ max=\d+ n=\d+$/

/**
 * The complete static vocabulary a `[host-health]` line may contain (privacy
 * contract): metric labels, the severity words, and the runbook path segments.
 * Anything else — content, IDs, paths, provider config — is a leak.
 */
const HOST_HEALTH_ALLOWED_IDENTIFIERS = new Set([
	"host",
	"health",
	"elu_ms",
	"p50",
	"p95",
	"p99",
	"max",
	"mean",
	"jitter_ms",
	"cpu_pct",
	"heap_mb",
	"rss_mb",
	"ext_mb",
	"state_serialize_ms",
	"n",
	"WARN",
	"ERROR",
	"window",
	"runbook",
	"docs",
	"runbooks",
	"gray",
	"webview",
	"md",
])

/** A `state` message whose `clineMessages` text carries the sentinel + filler. */
function fakeStateMessage(bytes: number, extraText = ""): ExtensionMessage {
	const payload = "x".repeat(Math.max(0, bytes - extraText.length))
	// Partial `ExtensionState` fixture: a double assertion is the narrowest way
	// to type a deliberately incomplete state without fabricating 20 fields.
	return {
		type: "state",
		state: { version: "3.88.2", clineMessages: [{ ts: 1, type: "say", say: "text", text: payload + extraText }] },
	} as unknown as ExtensionMessage
}

/** Fake `perf_hooks.monitorEventLoopDelay()` histogram — no real perf_hooks. */
class FakeHistogram implements EventLoopDelayHistogram {
	count = 0
	mean = 0
	max = 0
	enabled = false
	enableCalls = 0
	disableCalls = 0
	resetCalls = 0
	private readonly percentiles = new Map<number, number>()

	enable(): void {
		this.enabled = true
		this.enableCalls++
	}

	disable(): void {
		this.enabled = false
		this.disableCalls++
	}

	reset(): void {
		this.resetCalls++
		this.percentiles.clear()
		this.count = 0
		this.mean = 0
		this.max = 0
	}

	percentile(percentile: number): number {
		return this.percentiles.get(percentile) ?? 0
	}

	/** Feeds one window of lag samples (inputs in ms; the API is nanoseconds). */
	setWindowMs(window: { p50: number; p95: number; p99: number; max: number; mean: number }): void {
		const ns = (ms: number) => ms * 1_000_000
		this.percentiles.set(50, ns(window.p50))
		this.percentiles.set(95, ns(window.p95))
		this.percentiles.set(99, ns(window.p99))
		this.max = ns(window.max)
		this.mean = ns(window.mean)
		this.count = 10
	}
}

interface Harness {
	metrics: ExtensionHostHealthMetrics
	histogram: FakeHistogram
	logLines: string[]
	now: () => number
	schedule: ExtensionHostHealthMetricsDeps["schedule"]
	advance: (ms: number) => void
	runDueTimers: () => void
	tickSecond: () => void
	/** Advances in 1 s steps to `windowEndAbs`, then lands on it and flushes. */
	runWindowTo: (windowEndAbs: number, cpuPct: number, windowElapsedMs: number) => void
	pendingTimers: () => number
	scheduleCallCount: () => number
	histogramCreateCount: () => number
	setMemoryMb: (sizes: { heap: number; rss: number; external: number }) => void
}

function createHarness(options: { enabled: boolean }): Harness {
	let virtualNow = START_TIME
	const timers: Array<{ at: number; callback: () => void }> = []
	const logLines: string[] = []
	const histogram = new FakeHistogram()
	const cpuUsage: CpuUsage = { user: 0, system: 0 }
	const memoryBytes = { heapUsed: 412 * MB, rss: 780 * MB, external: 64 * MB }
	const counters = { scheduleCalls: 0, createHistogramCalls: 0 }

	const runDueTimers = () => {
		for (;;) {
			let next: { at: number; callback: () => void } | undefined
			for (const timer of timers) {
				if (timer.at <= virtualNow && (!next || timer.at < next.at)) {
					next = timer
				}
			}
			if (!next) {
				return
			}
			timers.splice(timers.indexOf(next), 1)
			next.callback()
		}
	}

	const setCpuUsagePercent = (pct: number, elapsedMs: number) => {
		cpuUsage.user = (pct / 100) * elapsedMs * 1_000
		cpuUsage.system = 0
	}

	const schedule: ExtensionHostHealthMetricsDeps["schedule"] = (callback, delayMs) => {
		counters.scheduleCalls++
		const timer = { at: virtualNow + delayMs, callback }
		timers.push(timer)
		return () => {
			const index = timers.indexOf(timer)
			if (index !== -1) {
				timers.splice(index, 1)
			}
		}
	}

	const metrics = new ExtensionHostHealthMetrics({
		enabled: options.enabled,
		now: () => virtualNow,
		log: (line) => logLines.push(line),
		schedule,
		cpuUsage: () => ({ ...cpuUsage }),
		memoryUsage: () => memoryBytes,
		createEventLoopHistogram: () => {
			counters.createHistogramCalls++
			return histogram
		},
	})

	return {
		metrics,
		histogram,
		logLines,
		now: () => virtualNow,
		schedule,
		advance: (ms) => {
			virtualNow += ms
		},
		runDueTimers,
		tickSecond: () => {
			virtualNow += HEARTBEAT_INTERVAL_MS
			runDueTimers()
		},
		runWindowTo: (windowEndAbs, cpuPct, windowElapsedMs) => {
			// Stop one 1 s step SHORT of the boundary: landing exactly on it would
			// let the flush timer fire before the CPU counters are baselined.
			while (virtualNow + HEARTBEAT_INTERVAL_MS < windowEndAbs) {
				virtualNow += HEARTBEAT_INTERVAL_MS
				runDueTimers()
			}
			setCpuUsagePercent(cpuPct, windowElapsedMs)
			virtualNow = windowEndAbs
			runDueTimers()
		},
		pendingTimers: () => timers.length,
		scheduleCallCount: () => counters.scheduleCalls,
		histogramCreateCount: () => counters.createHistogramCalls,
		setMemoryMb: ({ heap, rss, external }) => {
			memoryBytes.heapUsed = heap * MB
			memoryBytes.rss = rss * MB
			memoryBytes.external = external * MB
		},
	}
}

describe("ExtensionHostHealthMetrics", () => {
	test("gate: ROO_HOST_HEALTH_DEBUG accepts 1/true (case-insensitive) and nothing else", () => {
		expect(HOST_HEALTH_DEBUG_ENV).toBe("ROO_HOST_HEALTH_DEBUG")
		expect(isHostHealthDebugEnabled("1")).toBe(true)
		expect(isHostHealthDebugEnabled("true")).toBe(true)
		expect(isHostHealthDebugEnabled("TRUE")).toBe(true)
		expect(isHostHealthDebugEnabled("0")).toBe(false)
		expect(isHostHealthDebugEnabled("false")).toBe(false)
		expect(isHostHealthDebugEnabled("")).toBe(false)
		expect(isHostHealthDebugEnabled(undefined)).toBe(false)
	})

	test("exports the §8.2 thresholds and the ~60 s window shared with the payload SLI", () => {
		expect(HOST_HEALTH_WINDOW_MS).toBe(60_000)
		expect(HOST_HEALTH_WINDOW_MS).toBe(METRICS_WINDOW_MS)
		expect(HEARTBEAT_INTERVAL_MS).toBe(1_000)
		expect(ELU_WARN_P99_MS).toBe(200)
		expect(ELU_ERROR_P99_MS).toBe(500)
		expect(ELU_ERROR_MAX_MS).toBe(3_000)
		expect(JITTER_WARN_MAX_MS).toBe(500)
		expect(JITTER_ERROR_MAX_MS).toBe(2_000)
	})

	test("flag off ⇒ completely inert: no histogram, no timers, no samples, no output", () => {
		const h = createHarness({ enabled: false })
		expect(h.metrics.enabled).toBe(false)

		for (let i = 0; i < 50; i++) {
			h.metrics.recordStateSerialize(12)
		}
		h.advance(HOST_HEALTH_WINDOW_MS * 3)
		h.runDueTimers()

		expect(h.logLines).toEqual([])
		expect(h.scheduleCallCount()).toBe(0)
		expect(h.histogramCreateCount()).toBe(0)
		expect(h.histogram.enableCalls).toBe(0)
		expect(h.histogram.resetCalls).toBe(0)
		expect(h.pendingTimers()).toBe(0)
	})

	test("flag on: one periodic summary line per window, exactly the §4.6 shape", () => {
		const h = createHarness({ enabled: true })
		h.histogram.setWindowMs({ p50: 3, p95: 18, p99: 42, max: 210, mean: 6 })
		h.setMemoryMb({ heap: 412, rss: 780, external: 64 })

		// 24 pushes: 23 × 9 ms + 1 × 19 ms ⇒ p50=9 p99=19 max=19 n=24.
		for (let i = 0; i < 23; i++) {
			h.metrics.recordStateSerialize(9)
		}
		h.metrics.recordStateSerialize(19)

		// Heartbeats fire exactly on time in this window, so jitter max is 0.
		h.runWindowTo(START_TIME + HOST_HEALTH_WINDOW_MS, 38, HOST_HEALTH_WINDOW_MS)

		expect(h.logLines).toEqual([
			"[host-health] elu_ms p50=3 p95=18 p99=42 max=210 mean=6 | jitter_ms max=0 | cpu_pct=38 | heap_mb=412 rss_mb=780 ext_mb=64 | state_serialize_ms p50=9 p99=19 max=19 n=24",
		])
		expect(h.logLines[0]).toMatch(PERIODIC_LINE_PATTERN)

		// The window is re-armed and window-local state is reset.
		expect(h.histogram.resetCalls).toBe(1)
		expect(h.pendingTimers()).toBe(2)
	})

	test("flag on: WARN when elu_ms p99 > 200 (or jitter max > 500)", () => {
		const h = createHarness({ enabled: true })
		h.histogram.setWindowMs({ p50: 30, p95: 120, p99: 238, max: 1_480, mean: 60 })

		// 101 pushes: 100 × 11 ms + 1 × 19 ms ⇒ p99=11 max=19 n=101.
		for (let i = 0; i < 100; i++) {
			h.metrics.recordStateSerialize(11)
		}
		h.metrics.recordStateSerialize(19)

		// One heartbeat fires 920 ms late (a blocked event loop ⇒ timer drift).
		h.advance(HEARTBEAT_INTERVAL_MS + 920)
		h.runDueTimers()

		h.runWindowTo(START_TIME + HOST_HEALTH_WINDOW_MS, 71, HOST_HEALTH_WINDOW_MS)

		expect(h.logLines).toEqual([
			"[host-health] WARN elu_ms p99=238 max=1480 | jitter_ms max=920 | cpu_pct=71 | state_serialize_ms p99=11 max=19 n=101",
		])
	})

	test("flag on: WARN from heartbeat jitter alone (lag below the WARN threshold)", () => {
		const h = createHarness({ enabled: true })
		h.histogram.setWindowMs({ p50: 1, p95: 2, p99: 100, max: 150, mean: 3 })

		h.metrics.recordStateSerialize(5)
		h.metrics.recordStateSerialize(5)
		h.metrics.recordStateSerialize(5)

		h.advance(HEARTBEAT_INTERVAL_MS + 920)
		h.runDueTimers()

		h.runWindowTo(START_TIME + HOST_HEALTH_WINDOW_MS, 12, HOST_HEALTH_WINDOW_MS)

		expect(h.logLines).toEqual([
			"[host-health] WARN elu_ms p99=100 max=150 | jitter_ms max=920 | cpu_pct=12 | state_serialize_ms p99=5 max=5 n=3",
		])
	})

	test("flag on: ERROR dominates WARN, and the ERROR line keeps the §4.6 shape", () => {
		const h = createHarness({ enabled: true })
		// elu p99 612 (> 500 AND > 200) and max 3420 (> 3000); jitter 2610 (> 2000).
		h.histogram.setWindowMs({ p50: 90, p95: 300, p99: 612, max: 3_420, mean: 140 })

		h.metrics.recordStateSerialize(12)
		h.advance(HEARTBEAT_INTERVAL_MS + 2_610)
		h.runDueTimers()

		h.runWindowTo(START_TIME + HOST_HEALTH_WINDOW_MS, 74, HOST_HEALTH_WINDOW_MS)

		expect(h.logLines).toEqual([
			"[host-health] ERROR elu_ms p99=612 max=3420 | jitter_ms max=2610 | cpu_pct=74 | window runbook=docs/runbooks/gray-webview.md",
		])
		expect(h.logLines.filter((line) => line.includes("WARN"))).toEqual([])
	})

	test("thresholds are strict (>) : p99=200, max=3000 and jitter=500 stay periodic", () => {
		const h = createHarness({ enabled: true })
		h.histogram.setWindowMs({
			p50: 10,
			p95: 100,
			p99: ELU_WARN_P99_MS,
			max: ELU_ERROR_MAX_MS,
			mean: 20,
		})

		h.metrics.recordStateSerialize(4)
		// Exactly JITTER_WARN_MAX_MS of drift: not enough for WARN.
		h.advance(HEARTBEAT_INTERVAL_MS + JITTER_WARN_MAX_MS)
		h.runDueTimers()

		h.runWindowTo(START_TIME + HOST_HEALTH_WINDOW_MS, 20, HOST_HEALTH_WINDOW_MS)

		expect(h.logLines).toHaveLength(1)
		expect(h.logLines[0]).toMatch(PERIODIC_LINE_PATTERN)
		expect(h.logLines[0]).toContain(`elu_ms p50=10 p95=100 p99=${ELU_WARN_P99_MS} max=${ELU_ERROR_MAX_MS}`)
		expect(h.logLines[0]).toContain(`jitter_ms max=${JITTER_WARN_MAX_MS}`)
	})

	test("a WARN/ERROR latch is re-armed by the next window flush", () => {
		const h = createHarness({ enabled: true })
		h.histogram.setWindowMs({ p50: 30, p95: 120, p99: 238, max: 1_480, mean: 60 })
		h.metrics.recordStateSerialize(11)

		h.runWindowTo(START_TIME + HOST_HEALTH_WINDOW_MS, 38, HOST_HEALTH_WINDOW_MS)
		expect(h.logLines.filter((line) => line.includes("WARN"))).toHaveLength(1)

		// Second, identical window: the latch must be clear again.
		h.histogram.setWindowMs({ p50: 30, p95: 120, p99: 238, max: 1_480, mean: 60 })
		h.metrics.recordStateSerialize(11)
		h.runWindowTo(START_TIME + 2 * HOST_HEALTH_WINDOW_MS, 38, HOST_HEALTH_WINDOW_MS)

		expect(h.logLines.filter((line) => line.includes("WARN"))).toHaveLength(2)
		expect(h.logLines).toHaveLength(2)
		expect(h.histogram.resetCalls).toBe(2)
	})

	test("a push past the window deadline flushes the elapsed window and re-arms once", () => {
		const h = createHarness({ enabled: true })
		h.metrics.recordStateSerialize(5)

		// No timer turn (as if the loop was blocked), then a late push.
		h.advance(HOST_HEALTH_WINDOW_MS + 1_000)
		h.metrics.recordStateSerialize(5)

		expect(h.logLines).toEqual([
			"[host-health] elu_ms p50=0 p95=0 p99=0 max=0 mean=0 | jitter_ms max=0 | cpu_pct=0 | heap_mb=412 rss_mb=780 ext_mb=64 | state_serialize_ms p50=5 p99=5 max=5 n=1",
		])
		// One flush timer (re-armed, not duplicated) + one heartbeat timer.
		expect(h.pendingTimers()).toBe(2)

		h.metrics.recordStateSerialize(5)
		expect(h.logLines).toHaveLength(1)
	})

	test("dispose cancels both timers, disables the histogram, and silences output", () => {
		const h = createHarness({ enabled: true })
		h.metrics.recordStateSerialize(5)
		expect(h.pendingTimers()).toBe(2)

		h.metrics.dispose()

		expect(h.pendingTimers()).toBe(0)
		expect(h.histogram.disableCalls).toBe(1)
		expect(h.histogram.enabled).toBe(false)

		h.metrics.recordStateSerialize(5_000)
		h.advance(HOST_HEALTH_WINDOW_MS * 2)
		h.runDueTimers()

		expect(h.logLines).toEqual([])
	})

	test("privacy: no message content or identifier can reach any emitted line", () => {
		const h = createHarness({ enabled: true })
		const SECRET = "SECRET-TASK-TEXT"

		// The full hook chain of `postMessageToWebview()`: the payload SLI sees
		// the message; host-health is handed a duration only.
		const payloadLines: string[] = []
		const payloadEvents: WebviewPayloadSizeEvent[] = []
		const payloadMetrics = new WebviewPayloadMetrics({
			now: h.now,
			log: (line) => payloadLines.push(line),
			showWarning: (message) => payloadLines.push(message),
			emitEvent: (payload) => payloadEvents.push(payload),
			schedule: h.schedule,
		})

		const message = fakeStateMessage(1.2 * 1024 * KB, SECRET)
		payloadMetrics.recordStateMessage(message)
		h.metrics.recordStateSerialize(7)

		h.runWindowTo(START_TIME + HOST_HEALTH_WINDOW_MS, 38, HOST_HEALTH_WINDOW_MS)

		// The window really did emit both SLIs (otherwise this test is vacuous).
		expect(h.logLines).toHaveLength(1)
		expect(payloadLines.some((line) => line.includes("ERROR"))).toBe(true)

		for (const line of [...h.logLines, ...payloadLines]) {
			expect(line).not.toContain(SECRET)
			// No long content run may leak (the payload is a run of "x").
			expect(line).not.toMatch(/x{10,}/)
		}
		for (const line of h.logLines) {
			for (const token of line.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? []) {
				expect(HOST_HEALTH_ALLOWED_IDENTIFIERS.has(token)).toBe(true)
			}
		}
		expect(JSON.stringify(payloadEvents)).not.toContain(SECRET)
		expect(h.logLines[0]).toMatch(PERIODIC_LINE_PATTERN)
	})
})
