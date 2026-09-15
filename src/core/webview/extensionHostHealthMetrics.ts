/**
 * Session-aggregated extension-host health SLI (`[host-health]`) for the
 * 2026-09-15 "Extension host (Remote) is unresponsive" investigation
 * (docs/incidents/2026-09-15-extension-host-unresponsive-diagnosis.md §4 and
 * §8.2).
 *
 * The incident recorded an `INFO Extension host (Remote) is unresponsive.` line
 * co-occurring with ~1.65 MB `state` payloads, but the metric could not be
 * attributed (payload CPU vs checkpoint I/O vs environmental contention vs GC).
 * This module turns the NEXT occurrence into a one-line verdict — local-only,
 * and only when an operator explicitly opts in:
 *
 * ```text
 * [host-health] elu_ms p50=3 p95=18 p99=42 max=210 mean=6 | jitter_ms max=52 | cpu_pct=38 | heap_mb=412 rss_mb=780 ext_mb=64 | state_serialize_ms p50=8 p99=12 max=19 n=24
 * [host-health] WARN elu_ms p99=238 max=1480 | jitter_ms max=920 | cpu_pct=71 | state_serialize_ms p99=11 max=19 n=31
 * [host-health] ERROR elu_ms p99=612 max=3420 | jitter_ms max=2610 | cpu_pct=74 | window runbook=docs/runbooks/gray-webview.md
 * ```
 *
 * PRIVACY CONTRACT (same bar as `webviewPayloadMetrics.ts`; this repo claims
 * "Zero telemetry by design" — PRIVACY.md line 33: "there is no telemetry
 * setting or consent prompt"):
 * - LOCAL-ONLY / NO EGRESS. Output goes exclusively to the local Roo+ output
 *   channel via `ClineProvider.log()`. There is no HTTP/socket call anywhere in
 *   this module, no new dependency, and no remote sink; routing these lines to a
 *   remote sink would require a privacy review.
 * - NO PERSISTENCE. State lives in session memory only. Nothing is ever written
 *   to `globalState`/Memento/`state.vscdb`, nothing is pushed through
 *   `ContextProxy.setValue`, and no persisted setting is introduced — a setting
 *   would contradict PRIVACY.md:33.
 * - NO IDENTIFIERS / NO CONTENT. The logged vocabulary is numeric measurements
 *   (nanoseconds → milliseconds, microseconds → percentage, bytes → MB, counts)
 *   plus the literal prefix `[host-health]` and static metric labels. Never
 *   logged: task IDs, message text, prompts, file paths, provider config, model
 *   names, stack traces, or thread dumps. The class never receives a message
 *   payload at all — {@link ExtensionHostHealthMetrics.recordStateSerialize} is
 *   handed a duration only — so it cannot leak what it never sees.
 * - GATE. `ROO_HOST_HEALTH_DEBUG=1|true`, read once via `process.env`
 *   ({@link isHostHealthDebugEnabled}), mirroring the `SEMBLE_DEBUG` pattern in
 *   `src/services/code-index/semble/provider.ts`. An env var rather than a
 *   setting deliberately skips the AGENTS.md "Persisted Setting Checklist" round
 *   trip (schema + `ExtensionState` + `SettingsView.cachedState` +
 *   `getStateToPostToWebview` + import/export) and guarantees zero persistence
 *   by construction (§4.4).
 * - OFF ⇒ COMPLETELY INERT. When the gate is false the instance creates no
 *   event-loop histogram, no sample arrays, schedules no timer, records nothing,
 *   and emits no output: object creation itself is guarded here in
 *   {@link ExtensionHostHealthMetrics.start}.
 * - LOG LINES ONLY. Deliberately NO new `RooCodeEventName` / event schema, so
 *   "zero telemetry by design" stays literally true (the payload SLI keeps its
 *   typed event; host-health does not).
 * - No auto-reload of the extension host (§8.3): log-only. WARN/ERROR are log
 *   lines, never popups.
 *
 * Secondary gate (§4.4, `extensionMode === ExtensionMode.Development`) is
 * deliberately NOT ANDed in: the documented remote-SSH procedure (§6.2) targets
 * an installed build, whose extension mode is not `Development`, so combining
 * the two would make the flag unusable exactly where the diagnosis is needed.
 * The env var alone is the gate, and it is off by default.
 *
 * Metrics (§4.1): event-loop lag (mean/p50/p95/p99/max) from
 * `perf_hooks.monitorEventLoopDelay({ resolution: 10 })`; heartbeat jitter (the
 * drift of a 1 s timer); `process.cpuUsage()` window delta as `cpu_pct`;
 * `process.memoryUsage()` as heap/rss/external MB; per-state-push serialize time
 * (`state_serialize_ms` p50/p99/max) and the window's `state_msgs` count.
 *
 * Cadence (§4.2): the histogram is enabled for the session and read once per
 * window; one health snapshot + log line per {@link HOST_HEALTH_WINDOW_MS}
 * (~60 s) window, reusing the `flushWindow()` pattern of the payload SLI; one
 * `hrtime` pair per `state` push, taken at the call site (ClineProvider) and
 * only while the gate is on.
 *
 * The clock, the histogram factory, and the `cpuUsage`/`memoryUsage` samplers
 * are injected so unit tests never touch real `perf_hooks`.
 */

/** Env var gate (primary and only gate). Mirrors the `SEMBLE_DEBUG` convention. */
export const HOST_HEALTH_DEBUG_ENV = "ROO_HOST_HEALTH_DEBUG"

/** Aggregation window (~60 s), the same cadence as the payload SLI. */
export const HOST_HEALTH_WINDOW_MS = 60_000

/**
 * Heartbeat probe interval. A 1 s timer models the mechanism VS Code uses to
 * declare the extension host unresponsive, so timer drift correlates lag →
 * heartbeat (§4.1 #2).
 */
export const HEARTBEAT_INTERVAL_MS = 1_000

/** WARN when event-loop lag p99 exceeds this (ms) — §8.2. */
export const ELU_WARN_P99_MS = 200

/** ERROR when event-loop lag p99 exceeds this (ms) — §8.2. */
export const ELU_ERROR_P99_MS = 500

/** ERROR when event-loop lag max exceeds this (ms) — §8.2. */
export const ELU_ERROR_MAX_MS = 3_000

/** WARN when heartbeat jitter max exceeds this (ms) — §8.2. */
export const JITTER_WARN_MAX_MS = 500

/** ERROR when heartbeat jitter max exceeds this (ms) — §8.2. */
export const JITTER_ERROR_MAX_MS = 2_000

/**
 * `ROO_HOST_HEALTH_DEBUG=1|true` enables the `[host-health]` lines. Read once by
 * the caller ({@link import("./ClineProvider").ClineProvider} at construction
 * time) so the flag is sampled exactly one time per session.
 *
 * Not a user-facing setting on purpose: PRIVACY.md:33 states there is no
 * telemetry setting or consent prompt, and an env var keeps this instrumentation
 * operator-initiated, off by default, and impossible to persist.
 */
export function isHostHealthDebugEnabled(raw: string | undefined = process.env[HOST_HEALTH_DEBUG_ENV]): boolean {
	return raw === "1" || raw?.toLowerCase() === "true"
}

/** Node's `perf_hooks` CPU-time counters, in microseconds. */
export interface CpuUsage {
	user: number
	system: number
}

/**
 * Structural subset of `perf_hooks.IntervalHistogram` used here. Declared
 * locally so this module imports no real `perf_hooks` symbol and unit tests can
 * inject a plain fake.
 */
export interface EventLoopDelayHistogram {
	/** Number of recorded samples. A fresh histogram reports 0 (see readEventLoopLag). */
	count: number
	/** Mean delay in nanoseconds (NaN while `count === 0`). */
	mean: number
	/** Maximum delay in nanoseconds. */
	max: number
	/** Percentile in nanoseconds (1–100). */
	percentile(percentile: number): number
	enable(): void
	disable(): void
	reset(): void
}

export interface ExtensionHostHealthMetricsDeps {
	/** Gate value, sampled once from {@link isHostHealthDebugEnabled}. */
	enabled: boolean
	/** Injectable clock (Date.now in production; fake values in tests). */
	now: () => number
	/** LOCAL output channel sink (ClineProvider.log). No other sink exists. */
	log: (line: string) => void
	/** Schedules a callback; returns a cancel function. Never holds the loop open. */
	schedule: (callback: () => void, delayMs: number) => () => void
	/** `process.cpuUsage` (cumulative microseconds). */
	cpuUsage: () => CpuUsage
	/** `process.memoryUsage` (bytes). */
	memoryUsage: () => { heapUsed: number; rss: number; external: number }
	/** `perf_hooks.monitorEventLoopDelay({ resolution: 10 })`. */
	createEventLoopHistogram: () => EventLoopDelayHistogram
}

const HOST_HEALTH_PREFIX = "[host-health]"

/** Static runbook pointer on the ERROR line, mirroring the payload SLI. */
const HOST_HEALTH_RUNBOOK = "docs/runbooks/gray-webview.md"

export class ExtensionHostHealthMetrics {
	/** Whether instrumentation is armed. `false` ⇒ every method is a no-op. */
	readonly enabled: boolean

	private windowStart: number
	private histogram?: EventLoopDelayHistogram
	private cancelFlushTimer?: () => void
	private cancelHeartbeatTimer?: () => void
	/** Created in {@link start} only, so a disabled instance allocates nothing. */
	private serializeSamplesMs!: number[]
	private jitterSamplesMs!: number[]
	private stateMessages = 0
	private lastCpuUsage?: CpuUsage
	private lastHeartbeatAt = 0
	private warnEmittedThisWindow = false
	private errorEmittedThisWindow = false
	private started = false
	private disposed = false

	constructor(private readonly deps: ExtensionHostHealthMetricsDeps) {
		this.enabled = deps.enabled
		this.windowStart = deps.now()
	}

	/**
	 * Lazily arms instrumentation (§4.3): creates the event-loop-delay histogram,
	 * baselines the CPU counters, and schedules the heartbeat + window timers.
	 *
	 * Off ⇒ no-op, and this is the ONLY place the histogram, the sample arrays,
	 * and both timers are created, so a disabled instance never allocates and
	 * never schedules.
	 */
	start(): void {
		if (!this.enabled || this.disposed || this.started) {
			return
		}

		const now = this.deps.now()
		this.started = true
		this.serializeSamplesMs = []
		this.jitterSamplesMs = []
		this.lastCpuUsage = this.deps.cpuUsage()
		this.lastHeartbeatAt = now
		// Measure the window from the first push, not from provider construction:
		// the provider can sit idle for minutes before its first `state` push.
		this.windowStart = now

		const histogram = this.deps.createEventLoopHistogram()
		histogram.enable()
		this.histogram = histogram

		this.armFlushTimer()
		this.armHeartbeatTimer()
	}

	/**
	 * Records how long one `state` push spent inside the payload-SLI
	 * serialization — the attribution bridge between payload work and host lag
	 * (§4.1 #5). Takes a duration ONLY: no message, no payload, no identifier.
	 *
	 * Off ⇒ returns immediately (no timing, no allocation, no window rollover).
	 */
	recordStateSerialize(durationMs: number): void {
		if (!this.enabled || this.disposed) {
			return
		}

		this.start()

		const now = this.deps.now()
		if (now - this.windowStart >= HOST_HEALTH_WINDOW_MS) {
			// A long block can carry a window past its deadline before the timer
			// gets a turn; flush and re-arm here so windows stay ~60 s wide.
			this.cancelFlushTimer?.()
			this.cancelFlushTimer = undefined
			this.flushWindow(now)
			this.armFlushTimer()
		}

		this.stateMessages++
		this.serializeSamplesMs.push(durationMs)
	}

	/** Disables the histogram, cancels both timers, and silences further output. */
	dispose(): void {
		this.disposed = true
		this.cancelFlushTimer?.()
		this.cancelFlushTimer = undefined
		this.cancelHeartbeatTimer?.()
		this.cancelHeartbeatTimer = undefined
		this.histogram?.disable()
		this.histogram = undefined
	}

	/**
	 * Emits one `[host-health]` line for the window (§4.6) and resets window-local
	 * state, re-arming the WARN/ERROR latches so the next window can alert again.
	 */
	private flushWindow(now: number): void {
		const elu = this.readEventLoopLag()
		const jitterMax = Math.round(maxOf(this.jitterSamplesMs))
		const cpuPct = this.readCpuPct(now)
		const memory = this.deps.memoryUsage()
		const serialize = summarize(this.serializeSamplesMs)
		const stateMsgs = this.stateMessages

		// §8.2: ERROR dominates; thresholds are strictly greater-than.
		const isError = elu.p99 > ELU_ERROR_P99_MS || elu.max > ELU_ERROR_MAX_MS || jitterMax > JITTER_ERROR_MAX_MS
		const isWarn = !isError && (elu.p99 > ELU_WARN_P99_MS || jitterMax > JITTER_WARN_MAX_MS)

		if (isError && !this.errorEmittedThisWindow) {
			this.errorEmittedThisWindow = true
			this.deps.log(
				`${HOST_HEALTH_PREFIX} ERROR elu_ms p99=${elu.p99} max=${elu.max} | jitter_ms max=${jitterMax} | cpu_pct=${cpuPct} | window runbook=${HOST_HEALTH_RUNBOOK}`,
			)
		} else if (isWarn && !this.warnEmittedThisWindow) {
			this.warnEmittedThisWindow = true
			this.deps.log(
				`${HOST_HEALTH_PREFIX} WARN elu_ms p99=${elu.p99} max=${elu.max} | jitter_ms max=${jitterMax} | cpu_pct=${cpuPct} | state_serialize_ms p99=${serialize.p99} max=${serialize.max} n=${stateMsgs}`,
			)
		} else {
			this.deps.log(
				`${HOST_HEALTH_PREFIX} elu_ms p50=${elu.p50} p95=${elu.p95} p99=${elu.p99} max=${elu.max} mean=${elu.mean} | jitter_ms max=${jitterMax} | cpu_pct=${cpuPct} | heap_mb=${toMb(memory.heapUsed)} rss_mb=${toMb(memory.rss)} ext_mb=${toMb(memory.external)} | state_serialize_ms p50=${serialize.p50} p99=${serialize.p99} max=${serialize.max} n=${stateMsgs}`,
			)
		}

		this.histogram?.reset()
		this.serializeSamplesMs = []
		this.jitterSamplesMs = []
		this.stateMessages = 0
		this.lastCpuUsage = this.deps.cpuUsage()
		this.windowStart = now
		this.warnEmittedThisWindow = false
		this.errorEmittedThisWindow = false
	}

	/**
	 * Window-local event-loop lag in ms. `count === 0` short-circuits to zeros on
	 * purpose: a fresh Node `IntervalHistogram` reports `mean === NaN` and a
	 * meaningless `percentile()` value (verified on v22.22.2), which would
	 * otherwise print `NaN` into the operator line.
	 */
	private readEventLoopLag(): { p50: number; p95: number; p99: number; max: number; mean: number } {
		const histogram = this.histogram
		if (!histogram || histogram.count === 0) {
			return { p50: 0, p95: 0, p99: 0, max: 0, mean: 0 }
		}

		return {
			p50: toMs(histogram.percentile(50)),
			p95: toMs(histogram.percentile(95)),
			p99: toMs(histogram.percentile(99)),
			max: toMs(histogram.max),
			mean: toMs(histogram.mean),
		}
	}

	/** `user + system` CPU-time delta across the window, as % of one core. */
	private readCpuPct(now: number): number {
		const current = this.deps.cpuUsage()
		const previous = this.lastCpuUsage ?? current
		const elapsedMicros = Math.max(1, (now - this.windowStart) * 1_000)
		const usedMicros = current.user - previous.user + (current.system - previous.system)
		return Math.round((usedMicros / elapsedMicros) * 100)
	}

	/** Arms (and self-re-arms) the ~60 s window flush. */
	private armFlushTimer(): void {
		const delay = Math.max(0, this.windowStart + HOST_HEALTH_WINDOW_MS - this.deps.now())
		this.cancelFlushTimer = this.deps.schedule(() => {
			this.cancelFlushTimer = undefined
			if (this.disposed) {
				return
			}
			this.flushWindow(this.deps.now())
			this.armFlushTimer()
		}, delay)
	}

	/**
	 * Arms (and self-re-arms) the 1 s heartbeat probe, recording `actual − 1000`
	 * as jitter. Magnitude is used so an early fire is as visible as a late one;
	 * late drift is the signal that co-occurs with VS Code declaring the host
	 * unresponsive.
	 */
	private armHeartbeatTimer(): void {
		this.cancelHeartbeatTimer = this.deps.schedule(() => {
			if (this.disposed) {
				return
			}

			const now = this.deps.now()
			this.jitterSamplesMs.push(Math.abs(now - this.lastHeartbeatAt - HEARTBEAT_INTERVAL_MS))
			this.lastHeartbeatAt = now
			this.armHeartbeatTimer()
		}, HEARTBEAT_INTERVAL_MS)
	}
}

function toMs(nanoseconds: number): number {
	return Math.round(nanoseconds / 1_000_000)
}

function toMb(bytes: number): number {
	return Math.round(bytes / (1024 * 1024))
}

function maxOf(samples: number[]): number {
	let max = 0
	for (const sample of samples) {
		if (sample > max) {
			max = sample
		}
	}
	return max
}

/** Nearest-rank p50/p99/max (ms) over the window's per-push serialize samples. */
function summarize(samplesMs: number[]): { p50: number; p99: number; max: number } {
	if (samplesMs.length === 0) {
		return { p50: 0, p99: 0, max: 0 }
	}

	const sorted = [...samplesMs].sort((a, b) => a - b)
	return {
		p50: Math.round(percentile(sorted, 50)),
		p99: Math.round(percentile(sorted, 99)),
		max: Math.round(sorted[sorted.length - 1]),
	}
}

/** Nearest-rank percentile over a pre-sorted (ascending) sample. */
function percentile(sorted: number[], p: number): number {
	const rank = Math.max(1, Math.ceil((p / 100) * sorted.length))
	return sorted[rank - 1]
}
