import type { ExtensionMessage, WebviewPayloadFieldSize, WebviewPayloadSizeEvent } from "@roo-code/types"

/**
 * Session-aggregated SLI for host→webview `type: "state"` IPC payloads.
 *
 * local-only; routing this event (or these log lines) to any remote sink
 * requires a privacy review.
 *
 * Privacy contract (issue #64, postmortem 2026-09-09 §5):
 * - Metrics live in session memory ONLY. Nothing is ever written to
 *   globalState/Memento/state.vscdb — a growing persisted state blob is the
 *   exact bug this branch fixed.
 * - Logged data is restricted to byte-size integers, the literal message kind
 *   "state", and static ExtensionState field names. Message content, task
 *   text, prompts, file paths, task IDs, provider config values, and any
 *   identifier are NEVER serialized into a log line or the event payload.
 * - Output goes to the LOCAL output channel via `ClineProvider.log()` and to
 *   typed local event consumers (extension host / local CLI event stream)
 *   only. There is no network egress of any metric, event, or log line.
 *
 * Background: the 2026-09-09 gray-webview incident was a multi-MB `state`
 * payload saturating the webview renderer over remote-SSH IPC while the
 * extension host stayed healthy. This SLI makes that failure mode loud before
 * the renderer dies: WARN at > 256 KB, ERROR + one-time user notification at
 * > 1 MB (runbook: docs/runbooks/gray-webview.md).
 *
 * Probe guard (P1, diagnosis 2026-09-15 §3.5): monitoring must not amplify the
 * failure it watches. Every push used to `JSON.stringify` each known-bloat field
 * (~3.9 ms for a ~1.5 MB `clineMessages`) and then `JSON.stringify` the whole
 * message again (~3.7 ms) — ~7.6 ms of event-loop-blocking CPU per push on the
 * exact path already under suspicion. The per-push WARN/ERROR decision and the
 * rolling window histogram now use a CHEAP O(n) byte proxy
 * ({@link estimateFieldBytes}) that never `JSON.stringify`s an array longer than
 * {@link EXACT_ARRAY_MAX_LENGTH} elements. The exact probe ({@link jsonSizeBytes})
 * and the full-message stringify run ONLY when a WARN/ERROR line is actually
 * about to be emitted — at most once per window per severity, already bounded by
 * `warnEmittedThisWindow` / `errorEmittedThisWindow` / `userNotified`.
 *
 * Consequences of the probe guard:
 * - The emitted WARN/ERROR `messageBytes`, the `top[...]` attribution, and the
 *   one-time popup remain EXACT — same `[webview-metrics]` line shape, same
 *   {@link webviewPayloadSizeEventSchema} event, same thresholds.
 * - The periodic `state_msgs=… p50=… p99=… max=…` percentiles are now cheap
 *   ESTIMATES within {@link ESTIMATE_TOLERANCE} of the exact size; read them as a
 *   trend, not as a legal-size number. The alerting decision they drive is
 *   unchanged and still reports exact bytes.
 */

const KB = 1024

/** WARN threshold for a single `state` message (bytes). */
export const STATE_WARN_BYTES = 256 * KB

/** ERROR threshold for a single `state` message (bytes). */
export const STATE_ERROR_BYTES = 1024 * KB

/** Aggregation window (~60 s) used to avoid log/event spam. */
export const METRICS_WINDOW_MS = 60_000

/**
 * Static overhead estimate for the non-probed remainder of a state message
 * (settings envelope + message wrapper). Healthy payloads are reported as
 * probe-sum + this constant instead of being fully serialized (see
 * {@link estimateMessageBytes}).
 */
const BASE_ENVELOPE_BYTES = 2 * KB

/** How many field-size pairs to include in a WARN/ERROR breakdown. */
const TOP_FIELD_LIMIT = 3

/**
 * Arrays at or below this length are still measured with the exact
 * `JSON.stringify` (see {@link estimateFieldBytes}).
 *
 * Why 8: at this size exactness is effectively free. An 8-element array
 * serializes in well under a microsecond — below timer noise — so the estimator
 * returns the exact size for small, common payloads (including the
 * "one oversized newest message" shape, where a 1-element array IS the whole
 * field) and removes all estimation error from the threshold decision there.
 * Above 8 elements the O(n) proxy is ~1000× cheaper than serializing and its
 * error is bounded by {@link ESTIMATE_TOLERANCE}.
 */
export const EXACT_ARRAY_MAX_LENGTH = 8

/**
 * Documented worst-case relative error of the cheap array proxy,
 * `|estimate - exact| / exact`, for message/history-shaped arrays. It is well
 * under 1 % when a string `text` run dominates (the 2026-09-15 microbenchmark
 * measured +0.2 % for a ~1.5 MB transcript: proxy 1,596,672 B vs exact
 * 1,593,649 B) and stays under this bound for short-text arrays, where the
 * fixed per-element envelope constant dominates the sum.
 */
export const ESTIMATE_TOLERANCE = 0.15

/**
 * Fixed per-element allowance for the cheap proxy: JSON punctuation (`{}`,
 * quotes, `:`, `,`) plus the scalar metadata of a message-shaped object (`ts`,
 * `type`, `say`, `partial`, …) that is not one of {@link ARRAY_TEXT_FIELDS}.
 * 112 B/message is the non-`text` envelope observed in the 2026-09-15
 * microbenchmark, which keeps the dominant-text case accurate to ~1 %.
 */
const ELEMENT_ENVELOPE_BYTES = 112

/**
 * String-valued fields that carry the byte mass of the known-bloat arrays.
 * Reading `.length` on these is the allocation-free core of the proxy; the key
 * names themselves are covered by {@link ELEMENT_ENVELOPE_BYTES}.
 */
const ARRAY_TEXT_FIELDS = ["text", "reasoning", "task", "id", "name", "slug", "description", "roleDefinition"] as const

export interface WebviewPayloadMetricsDeps {
	/** Injectable clock (Date.now in production; fake values in tests). */
	now: () => number
	/** LOCAL output channel sink (ClineProvider.log). */
	log: (line: string) => void
	/** One-time vscode.window.showWarningMessage sink. */
	showWarning: (message: string) => void
	/** Typed local event sink (RooCodeEventName.WebviewPayloadSize). */
	emitEvent: (payload: WebviewPayloadSizeEvent) => void
	/** Schedules the window-flush callback; returns a cancel function. */
	schedule: (callback: () => void, delayMs: number) => () => void
}

/**
 * Static, schema-defined ExtensionState fields probed for size (bytes only).
 *
 * 2026-09-11 follow-up (v3.88.1 post-deploy watch): an ERROR fired at 1410 KB
 * while the breakdown only attributed `taskHistory=649KB` — the residual ~760 KB
 * was the full `customModes` catalog (90 bundled modes, ~762 KB JSON) riding
 * un-probed on every `state` message. `customModes`, `messageQueue` and
 * `marketplaceItems` are therefore probed now so WARN/ERROR attribution closes
 * the gap between the total and the named fields. `undefined`/null fields cost
 * nothing (see {@link jsonSizeBytes} / {@link estimateFieldBytes}).
 */
const KNOWN_BLOAT_FIELDS = [
	{ name: "clineMessages", read: (m: ExtensionMessage) => m.state?.clineMessages },
	{ name: "taskHistory", read: (m: ExtensionMessage) => m.state?.taskHistory },
	{ name: "customModes", read: (m: ExtensionMessage) => m.state?.customModes },
	{ name: "messageQueue", read: (m: ExtensionMessage) => m.state?.messageQueue },
	{ name: "marketplaceItems", read: (m: ExtensionMessage) => m.state?.marketplaceItems },
] as const

/** Exact JSON byte size of a single value (the pre-guard probe). */
function jsonSizeBytes(value: unknown): number {
	if (value === undefined || value === null) {
		return 0
	}
	// Cheap probe: serialize ONLY the known-bloat field, then measure bytes.
	// This catches arrays of message/history objects without touching the
	// rest of the payload. Never call this on the full message.
	return Buffer.byteLength(JSON.stringify(value) ?? "", "utf8")
}

/**
 * Cheap, O(n) byte proxy for one known-bloat field — the hot-path probe.
 *
 * Never calls `JSON.stringify` on an array longer than
 * {@link EXACT_ARRAY_MAX_LENGTH} elements; that is the whole point of the probe
 * guard (diagnosis 2026-09-15 §3.5): the probe must not serialize ~1.5 MB of
 * `clineMessages` on every push merely to decide the push is healthy.
 *
 * - `undefined` / `null` → 0
 * - `string` → `.length`
 * - short `array` → exact {@link jsonSizeBytes} (exactness is free at this size)
 * - longer `array` → Σ known string-field lengths + a fixed per-element envelope
 * - anything else (number/boolean/plain object) → exact {@link jsonSizeBytes};
 *   these are never the byte-dominant case.
 */
export function estimateFieldBytes(value: unknown): number {
	if (value === undefined || value === null) {
		return 0
	}

	if (typeof value === "string") {
		return value.length
	}

	if (Array.isArray(value)) {
		if (value.length <= EXACT_ARRAY_MAX_LENGTH) {
			return jsonSizeBytes(value)
		}

		// "[" + "]" plus one "," per element; each element contributes its known
		// string fields plus the fixed envelope allowance. No per-element
		// allocation and no string building.
		let bytes = 2
		for (let i = 0; i < value.length; i++) {
			bytes += ELEMENT_ENVELOPE_BYTES + 1 + estimateElementTextBytes(value[i])
		}
		return bytes
	}

	return jsonSizeBytes(value)
}

/**
 * Σ `.length` of one array element's {@link ARRAY_TEXT_FIELDS} entries.
 * Scalar fields (numbers, booleans) are accounted for by
 * {@link ELEMENT_ENVELOPE_BYTES} instead of being measured.
 */
function estimateElementTextBytes(element: unknown): number {
	if (typeof element === "string") {
		return element.length
	}
	if (typeof element !== "object" || element === null) {
		return 0
	}

	let bytes = 0
	const record = element as Record<string, unknown>
	for (const field of ARRAY_TEXT_FIELDS) {
		const text = record[field]
		if (typeof text === "string") {
			bytes += text.length
		}
	}
	return bytes
}

/** Largest {@link TOP_FIELD_LIMIT} non-empty field sizes, descending. */
function selectTopFields(fieldSizes: WebviewPayloadFieldSize[]): WebviewPayloadFieldSize[] {
	return fieldSizes
		.filter((f) => f.bytes > 0)
		.sort((a, b) => b.bytes - a.bytes)
		.slice(0, TOP_FIELD_LIMIT)
}

function toKb(bytes: number): number {
	return Math.round(bytes / KB)
}

/**
 * Exact size of the full `state` message.
 *
 * Reached ONLY on the alert path: {@link WebviewPayloadMetrics.recordStateMessage}
 * has already decided that a WARN/ERROR line is about to be emitted, so this
 * full-message `JSON.stringify` happens at most once per window per severity
 * instead of on every push. When the exact probe sum plus the static envelope is
 * itself below the WARN threshold the stringify is skipped entirely — the exact
 * probe already showed the payload is healthy.
 */
function estimateMessageBytes(message: ExtensionMessage, probeSum: number): number {
	if (probeSum + BASE_ENVELOPE_BYTES < STATE_WARN_BYTES) {
		return probeSum + BASE_ENVELOPE_BYTES
	}
	return JSON.stringify(message).length
}

function formatTopFields(fieldSizes: WebviewPayloadFieldSize[]): string {
	return fieldSizes.map((f) => `${f.name}=${toKb(f.bytes)}KB`).join(" ")
}

export class WebviewPayloadMetrics {
	private windowStart: number
	private windowSizes: number[] = []
	private cancelFlushTimer?: () => void
	private warnEmittedThisWindow = false
	private errorEmittedThisWindow = false
	private userNotified = false
	private disposed = false

	constructor(private readonly deps: WebviewPayloadMetricsDeps) {
		this.windowStart = deps.now()
	}

	/**
	 * Records one host→webview `type: "state"` message. Callers pass the full
	 * message ONLY for the size estimate; this class never retains it, never
	 * persists it, and never logs its content.
	 *
	 * Hot path = cheap proxy only (no full serialize). The exact path runs only
	 * when a WARN/ERROR line (or the one-time popup) is about to be emitted.
	 */
	recordStateMessage(message: ExtensionMessage): void {
		if (this.disposed) {
			return
		}

		const now = this.deps.now()
		if (now - this.windowStart >= METRICS_WINDOW_MS) {
			this.flushWindow(now)
		}

		// Cheap probe: decides WARN/ERROR (and feeds the window histogram) from an
		// O(n) proxy, so a ~1.5 MB array is never serialized on the hot path.
		const cheapFieldSizes = this.probeFields(message, false)
		const cheapProbeSum = cheapFieldSizes.reduce((sum, f) => sum + f.bytes, 0)
		let bytes = cheapProbeSum + BASE_ENVELOPE_BYTES
		let exactFieldSizes: WebviewPayloadFieldSize[] | undefined

		// Only pay for the exact numbers when an alert is actually about to fire.
		// `errorEmittedThisWindow` / `warnEmittedThisWindow` / `userNotified`
		// bound the exact path to at most once per window per severity.
		const errorCandidate = bytes >= STATE_ERROR_BYTES
		const warnCandidate = !errorCandidate && bytes >= STATE_WARN_BYTES
		const needsExact =
			(errorCandidate && (!this.errorEmittedThisWindow || !this.userNotified)) ||
			(warnCandidate && !this.warnEmittedThisWindow)

		if (needsExact) {
			exactFieldSizes = this.probeFields(message, true)
			const exactProbeSum = exactFieldSizes.reduce((sum, f) => sum + f.bytes, 0)
			bytes = estimateMessageBytes(message, exactProbeSum)
		}

		this.windowSizes.push(bytes)
		this.armFlushTimer(now)

		if (bytes >= STATE_ERROR_BYTES) {
			if (!this.errorEmittedThisWindow || !this.userNotified) {
				const fieldSizes = exactFieldSizes ?? this.probeFields(message, true)
				if (!this.errorEmittedThisWindow) {
					this.errorEmittedThisWindow = true
					this.deps.log(
						`[webview-metrics] ERROR "state" payload ${toKb(bytes)}KB > 1MB top[${formatTopFields(fieldSizes)}] runbook=docs/runbooks/gray-webview.md`,
					)
					this.emitEvent(2, bytes, fieldSizes)
				}
				if (!this.userNotified) {
					this.userNotified = true
					this.deps.showWarning(
						`Roo+ sent a "state" message over 1 MB (${toKb(bytes)}KB: ${formatTopFields(fieldSizes) || "n/a"}) to the webview. The panel may turn gray or stop responding. Runbook: docs/runbooks/gray-webview.md (immediate mitigation: "Developer: Reload Window").`,
					)
				}
			}
			return
		}

		if (bytes >= STATE_WARN_BYTES && !this.warnEmittedThisWindow) {
			this.warnEmittedThisWindow = true
			const fieldSizes = exactFieldSizes ?? this.probeFields(message, true)
			this.deps.log(
				`[webview-metrics] WARN "state" payload ${toKb(bytes)}KB > 256KB top[${formatTopFields(fieldSizes)}] runbook=docs/runbooks/gray-webview.md`,
			)
			this.emitEvent(1, bytes, fieldSizes)
		}
	}

	/**
	 * Per-field sizes for the payload, top-{@link TOP_FIELD_LIMIT} ranked.
	 * `exact: false` uses the cheap proxy (hot path); `exact: true` uses the
	 * exact `JSON.stringify` probe (alert path only).
	 */
	private probeFields(message: ExtensionMessage, exact: boolean): WebviewPayloadFieldSize[] {
		return selectTopFields(
			KNOWN_BLOAT_FIELDS.map((field) => {
				const value = field.read(message)
				return {
					name: field.name,
					bytes: exact ? jsonSizeBytes(value) : estimateFieldBytes(value),
				}
			}),
		)
	}

	/** Stops the flush timer and silences all further recording (provider dispose). */
	dispose(): void {
		this.disposed = true
		this.cancelFlushTimer?.()
		this.cancelFlushTimer = undefined
	}

	private emitEvent(severity: 1 | 2, messageBytes: number, fieldSizes: WebviewPayloadFieldSize[]): void {
		const sorted = [...this.windowSizes].sort((a, b) => a - b)
		this.deps.emitEvent({
			severity,
			messageBytes,
			windowMessages: sorted.length,
			p50Bytes: percentile(sorted, 50),
			p99Bytes: percentile(sorted, 99),
			maxBytes: sorted[sorted.length - 1] ?? 0,
			fieldSizes,
		})
	}

	private armFlushTimer(now: number): void {
		if (this.cancelFlushTimer) {
			return
		}
		const delay = Math.max(0, this.windowStart + METRICS_WINDOW_MS - now)
		this.cancelFlushTimer = this.deps.schedule(() => {
			this.cancelFlushTimer = undefined
			this.flushWindow(this.deps.now())
		}, delay)
	}

	/**
	 * Emits the periodic window summary line and resets window-local flags.
	 *
	 * The percentile figures are cheap estimates ({@link estimateFieldBytes}) for
	 * every push except the ≤2 alerting pushes per window, which contribute their
	 * exact byte count; treat them as a trend within {@link ESTIMATE_TOLERANCE}.
	 */
	private flushWindow(now: number): void {
		const n = this.windowSizes.length
		if (n > 0) {
			const sorted = [...this.windowSizes].sort((a, b) => a - b)
			this.deps.log(
				`[webview-metrics] state_msgs=${n} p50=${toKb(percentile(sorted, 50))}KB p99=${toKb(percentile(sorted, 99))}KB max=${toKb(sorted[sorted.length - 1])}KB`,
			)
		}
		this.windowSizes = []
		this.windowStart = now
		this.warnEmittedThisWindow = false
		this.errorEmittedThisWindow = false
	}
}

/** Nearest-rank percentile over a pre-sorted (ascending) integer sample. */
function percentile(sorted: number[], p: number): number {
	if (sorted.length === 0) {
		return 0
	}
	const rank = Math.max(1, Math.ceil((p / 100) * sorted.length))
	return sorted[rank - 1]
}
