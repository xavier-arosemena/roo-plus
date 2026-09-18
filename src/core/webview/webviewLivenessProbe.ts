/**
 * Session-aggregated renderer-liveness probe (`[webview-liveness]`) for the
 * 2026-09-18 gray-webview capture
 * (docs/incidents/2026-09-18-gray-webview.md).
 *
 * WHY THIS EXISTS
 * `extensionHostHealthMetrics.ts` instruments the EXTENSION HOST, and that is
 * the wrong process for this symptom: the capture shows
 * `Extension host (LocalProcess pid: N) is unresponsive.` and
 * `Extension host (Remote) is unresponsive.` firing TOGETHER while `[host-health]`
 * reported the remote host idle (`elu_ms p50=10`, `jitter <=50`, `cpu_pct 4-16`,
 * `state_serialize_ms p50=0`) and webview asset loads returned 401 on BOTH
 * servers. A host at 10 ms event-loop lag is not CPU-starved; the shared,
 * stressed component is the client-side webview renderer / transport. Nothing
 * measured that path, so this probe does: host -> webview `livenessPing`,
 * webview -> host `livenessPong`, timed end to end. A renderer that stops
 * servicing its message loop shows up first as rising RTT and then as missed
 * pongs — the failure payload bounding cannot see.
 *
 * LOG LINE SHAPE (one line per ~60 s window; static labels + integers only)
 *
 * ```text
 * [webview-liveness] rtt_ms p50=4 p99=210 max=410 | missed=0 n=12
 * [webview-liveness] WARN rtt_ms p50=9 p99=2140 max=4100 | missed=1 n=12
 * [webview-liveness] ERROR rtt_ms p50=0 p99=0 max=0 | missed=12 n=0 | window runbook=docs/runbooks/gray-webview.md
 * ```
 *
 * PRIVACY CONTRACT (the same bar as `webviewPayloadMetrics.ts` and
 * `extensionHostHealthMetrics.ts`; PRIVACY.md:33 — "Zero telemetry by design"):
 * - LOCAL-ONLY / NO EGRESS. The only sink is the local Roo+ output channel via
 *   `ClineProvider.log()`. There is no HTTP/socket call anywhere in this module
 *   and no remote sink; routing these lines anywhere else needs a privacy review.
 * - NO PERSISTENCE. State lives in session memory only — nothing is written to
 *   `globalState`/Memento/`state.vscdb`, nothing goes through
 *   `ContextProxy.setValue`, and no persisted setting is introduced (a setting
 *   would contradict PRIVACY.md:33).
 * - NO IDENTIFIERS / NO CONTENT. The logged vocabulary is integers (milliseconds,
 *   counts), the literal prefix `[webview-liveness]`, static metric labels and the
 *   static runbook path. Never logged: task ids, message text, prompts, file
 *   paths, provider config, model names, stack traces. The wire payload is a single
 *   monotonic sequence NUMBER and the class never receives a message object at all
 *   — {@link WebviewLivenessProbe.recordPong} is handed a number — so it cannot
 *   leak what it never sees.
 * - NO NEW TELEMETRY EVENT. Deliberately no `RooCodeEventName` / event schema, so
 *   "zero telemetry by design" stays literally true (mirrors host-health).
 * - GATE. `ROO_WEBVIEW_LIVENESS_DEBUG=1|true`, read once through
 *   {@link isWebviewLivenessDebugEnabledFromEnv}. An env var rather than a setting
 *   deliberately skips the AGENTS.md "Persisted Setting Checklist" and guarantees
 *   zero persistence by construction.
 * - OFF ⇒ COMPLETELY INERT. {@link WebviewLivenessProbe.start} is the only place a
 *   timer is created and it returns immediately when the gate is false, so a
 *   disabled probe schedules nothing, posts nothing, logs nothing and
 *   {@link WebviewLivenessProbe.recordPong} is a no-op.
 * - LOG LINES ONLY. No popup, no auto-reload: diagnosis §8.3 rules out an
 *   automatic host reload, and reloading the renderer would destroy the evidence
 *   and the user's in-flight work for the same reasons.
 *
 * TIMER SAFETY. Exactly ONE timer exists at a time: {@link
 * WebviewLivenessProbe.tick} re-arms it and stores the cancel function, so the
 * window can never leak a timer; `ClineProvider` wires `schedule` to a
 * `setTimeout` with `unref()` so a probe timer can never hold the event loop open,
 * and {@link WebviewLivenessProbe.dispose} cancels it and drops every pending
 * sample. Missed pongs are detected by AGE at the next tick rather than by a
 * per-ping timeout, which keeps the timer count at most one and the accounting
 * deterministic.
 *
 * THRESHOLD RATIONALE. A healthy renderer answers in single-digit milliseconds
 * (the payload SLI shows the renderer only degrading when a multi-MB push
 * saturates it), so p99 >= {@link WEBVIEW_LIVENESS_RTT_WARN_P99_MS} (2 s) is
 * already an order of magnitude worse than healthy and worth a WARN, while
 * p99 >= {@link WEBVIEW_LIVENESS_RTT_ERROR_P99_MS} (5 s) is a renderer that is
 * effectively frozen. The pong timeout
 * ({@link WEBVIEW_LIVENESS_PONG_TIMEOUT_MS}, 15 s) is deliberately 3x the WARN
 * threshold so a "missed" pong means "no answer at all", never merely "slow".
 * Pinging every {@link WEBVIEW_LIVENESS_PING_INTERVAL_MS} (5 s) yields 12 samples
 * per {@link WEBVIEW_LIVENESS_WINDOW_MS} (60 s) window, which is enough to see a
 * trend without turning the log into a stream.
 *
 * The clock and the scheduler are injected, so the unit tests never touch real
 * timers.
 */

/** Env var gate, the sibling of `ROO_HOST_HEALTH_DEBUG`. */
export const WEBVIEW_LIVENESS_DEBUG_ENV = "ROO_WEBVIEW_LIVENESS_DEBUG"

/** Aggregation window (~60 s), the same cadence as the payload and host SLIs. */
export const WEBVIEW_LIVENESS_WINDOW_MS = 60_000

/** How often a `livenessPing` is posted (12 samples per window). */
export const WEBVIEW_LIVENESS_PING_INTERVAL_MS = 5_000

/** A ping unanswered for this long is counted as a missed pong (3x the WARN threshold). */
export const WEBVIEW_LIVENESS_PONG_TIMEOUT_MS = 15_000

/** WARN when the window's RTT p99 exceeds this (ms). */
export const WEBVIEW_LIVENESS_RTT_WARN_P99_MS = 2_000

/** ERROR when the window's RTT p99 exceeds this (ms). */
export const WEBVIEW_LIVENESS_RTT_ERROR_P99_MS = 5_000

/** WARN when a window loses at least this many pongs. */
export const WEBVIEW_LIVENESS_MISSED_WARN = 1

/** ERROR when a window loses at least this many pongs. */
export const WEBVIEW_LIVENESS_MISSED_ERROR = 3

/** Static runbook pointer on the ERROR line, mirroring the payload and host SLIs. */
const WEBVIEW_LIVENESS_RUNBOOK = "docs/runbooks/gray-webview.md"

const WEBVIEW_LIVENESS_PREFIX = "[webview-liveness]"

/**
 * Pure gate predicate: `"1"` or `"true"` (case-insensitive) enables the
 * `[webview-liveness]` lines; every other value, `undefined` included, does not.
 *
 * Takes the raw value instead of reading the environment so the unit tests are
 * hermetic (DEBT entry E); production reads the env through
 * {@link isWebviewLivenessDebugEnabledFromEnv}.
 */
export function isWebviewLivenessDebugEnabled(raw: string | undefined): boolean {
	return raw === "1" || raw?.toLowerCase() === "true"
}

/**
 * Reads {@link WEBVIEW_LIVENESS_DEBUG_ENV} from an environment map and delegates to
 * {@link isWebviewLivenessDebugEnabled}. `env` is a parameter (defaulting to
 * `process.env`) so the ambient environment is touched in exactly one place.
 */
export function isWebviewLivenessDebugEnabledFromEnv(env: Record<string, string | undefined> = process.env): boolean {
	return isWebviewLivenessDebugEnabled(env[WEBVIEW_LIVENESS_DEBUG_ENV])
}

export interface WebviewLivenessProbeDeps {
	/** Gate value, sampled once from {@link isWebviewLivenessDebugEnabledFromEnv}. */
	enabled: boolean
	/** Injectable clock (Date.now in production; fake values in tests). */
	now: () => number
	/** LOCAL output channel sink (ClineProvider.log). No other sink exists. */
	log: (line: string) => void
	/** Sends the ping to the webview. Carries the sequence number ONLY. */
	postPing: (seq: number) => void
	/** Schedules a callback; returns a cancel function. Never holds the loop open. */
	schedule: (callback: () => void, delayMs: number) => () => void
}

/** Nearest-rank percentile, rounded to whole milliseconds. */
function percentile(sortedAscending: number[], rank: number): number {
	if (sortedAscending.length === 0) {
		return 0
	}

	const index = Math.min(
		sortedAscending.length - 1,
		Math.max(0, Math.ceil((rank / 100) * sortedAscending.length) - 1),
	)

	return sortedAscending[index]
}

export class WebviewLivenessProbe {
	/** Whether the probe is armed. `false` ⇒ every method is a no-op. */
	readonly enabled: boolean

	private seq = 0
	/** Pings awaiting a pong: sequence number → send time. Session memory only. */
	private readonly pending = new Map<number, number>()
	private rttSamplesMs: number[] = []
	private missedPongs = 0
	private cancelTickTimer?: () => void
	private windowStart: number
	private started = false
	private disposed = false

	constructor(private readonly deps: WebviewLivenessProbeDeps) {
		this.enabled = deps.enabled
		this.windowStart = deps.now()
	}

	/**
	 * Arms the probe: schedules the first tick, which pings and then re-arms
	 * itself. Off ⇒ no-op, and this is the ONLY place a timer is created, so a
	 * disabled probe never schedules, posts or logs anything.
	 */
	start(): void {
		if (!this.enabled || this.started || this.disposed) {
			return
		}

		this.started = true
		this.tick()
	}

	/**
	 * Records a pong. `seq` is the only input — no message, task, path or provider
	 * value ever reaches this class.
	 *
	 * Unknown, already-answered or already-expired sequence numbers are ignored, so
	 * a duplicate pong can never double-count an RTT.
	 */
	recordPong(seq: number): void {
		if (!this.enabled || this.disposed) {
			return
		}

		const sentAt = this.pending.get(seq)
		if (sentAt === undefined) {
			return
		}

		this.pending.delete(seq)
		this.rttSamplesMs.push(Math.max(0, this.deps.now() - sentAt))
	}

	/** Cancels the timer and drops every pending sample. Safe to call twice. */
	dispose(): void {
		if (this.disposed) {
			return
		}

		this.disposed = true
		this.cancelTickTimer?.()
		this.cancelTickTimer = undefined
		this.pending.clear()
		this.rttSamplesMs = []
		this.missedPongs = 0
		this.started = false
	}

	/**
	 * One probe tick: flush the window when it is due, age out unanswered pings,
	 * post the next ping, and re-arm.
	 */
	private tick(): void {
		if (this.disposed) {
			return
		}

		const now = this.deps.now()

		if (now - this.windowStart >= WEBVIEW_LIVENESS_WINDOW_MS) {
			this.flushWindow()
			this.windowStart = now
		}

		for (const [pendingSeq, sentAt] of this.pending) {
			if (now - sentAt >= WEBVIEW_LIVENESS_PONG_TIMEOUT_MS) {
				this.pending.delete(pendingSeq)
				this.missedPongs += 1
			}
		}

		this.seq += 1
		this.pending.set(this.seq, now)
		this.deps.postPing(this.seq)

		// Single self-re-arming timer: the cancel function is always stored, so the
		// probe can never leak a timer (and `dispose` always cancels the live one).
		this.cancelTickTimer = this.deps.schedule(() => this.tick(), WEBVIEW_LIVENESS_PING_INTERVAL_MS)
	}

	/** Emits the window's one log line, then resets the aggregation state. */
	private flushWindow(): void {
		const rtts = this.rttSamplesMs.sort((a, b) => a - b)
		const missed = this.missedPongs
		const n = rtts.length
		this.rttSamplesMs = []
		this.missedPongs = 0

		// A window that saw neither a pong nor a timeout has nothing to report.
		if (n === 0 && missed === 0) {
			return
		}

		const p50 = percentile(rtts, 50)
		const p99 = percentile(rtts, 99)
		const max = n === 0 ? 0 : rtts[n - 1]
		const metrics = `rtt_ms p50=${p50} p99=${p99} max=${max} | missed=${missed} n=${n}`

		// ERROR: the renderer answered nothing at all, or its tail latency is past
		// the point where it is effectively frozen.
		if (n === 0 || p99 >= WEBVIEW_LIVENESS_RTT_ERROR_P99_MS || missed >= WEBVIEW_LIVENESS_MISSED_ERROR) {
			this.deps.log(`${WEBVIEW_LIVENESS_PREFIX} ERROR ${metrics} | window runbook=${WEBVIEW_LIVENESS_RUNBOOK}`)
			return
		}

		if (p99 >= WEBVIEW_LIVENESS_RTT_WARN_P99_MS || missed >= WEBVIEW_LIVENESS_MISSED_WARN) {
			this.deps.log(`${WEBVIEW_LIVENESS_PREFIX} WARN ${metrics}`)
			return
		}

		this.deps.log(`${WEBVIEW_LIVENESS_PREFIX} ${metrics}`)
	}
}
