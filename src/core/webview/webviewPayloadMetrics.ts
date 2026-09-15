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
 * nothing (see {@link jsonSizeBytes}).
 */
const KNOWN_BLOAT_FIELDS = [
	{ name: "clineMessages", read: (m: ExtensionMessage) => m.state?.clineMessages },
	{ name: "taskHistory", read: (m: ExtensionMessage) => m.state?.taskHistory },
	{ name: "customModes", read: (m: ExtensionMessage) => m.state?.customModes },
	{ name: "messageQueue", read: (m: ExtensionMessage) => m.state?.messageQueue },
	{ name: "marketplaceItems", read: (m: ExtensionMessage) => m.state?.marketplaceItems },
] as const

function jsonSizeBytes(value: unknown): number {
	if (value === undefined || value === null) {
		return 0
	}
	// Cheap probe: serialize ONLY the known-bloat field, then measure bytes.
	// This catches arrays of message/history objects without touching the
	// rest of the payload. Never call this on the full message.
	return Buffer.byteLength(JSON.stringify(value) ?? "", "utf8")
}

function toKb(bytes: number): number {
	return Math.round(bytes / KB)
}

/**
 * Two-stage payload-size estimation:
 *
 * 1. Cheap probe — `Buffer.byteLength` of the JSON of each known-bloat field
 *    (sizes only; values never retained or logged). If the probe sum plus the
 *    static envelope constant stays below the WARN threshold, the payload is
 *    healthy and we return that estimate WITHOUT a second serialization.
 * 2. Exact path — only when the probe suggests the payload is at/over the
 *    threshold do we pay for a full `JSON.stringify(message).length`.
 *
 * Rationale for not double-serializing healthy payloads: `postMessage`
 * already serializes the message once (structured clone); eagerly running a
 * full `JSON.stringify` on every state push would roughly double the
 * serialization CPU cost on the hottest host→webview path — the exact path
 * implicated in the gray-webview postmortem. Large payloads, which are rare
 * and already expensive, justify one extra stringify to report precise bytes
 * in the WARN/ERROR breakdown.
 */
function estimateMessageBytes(message: ExtensionMessage, probeSum: number): number {
	if (probeSum + BASE_ENVELOPE_BYTES < STATE_WARN_BYTES) {
		// Healthy payload: report the estimate, skip full serialization.
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
	 */
	recordStateMessage(message: ExtensionMessage): void {
		if (this.disposed) {
			return
		}

		const now = this.deps.now()
		if (now - this.windowStart >= METRICS_WINDOW_MS) {
			this.flushWindow(now)
		}

		const fieldSizes: WebviewPayloadFieldSize[] = KNOWN_BLOAT_FIELDS.map((field) => ({
			name: field.name,
			bytes: jsonSizeBytes(field.read(message)),
		}))
			.filter((f) => f.bytes > 0)
			.sort((a, b) => b.bytes - a.bytes)
			.slice(0, TOP_FIELD_LIMIT)

		const probeSum = fieldSizes.reduce((sum, f) => sum + f.bytes, 0)
		const bytes = estimateMessageBytes(message, probeSum)
		this.windowSizes.push(bytes)
		this.armFlushTimer(now)

		if (bytes >= STATE_ERROR_BYTES) {
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
			return
		}

		if (bytes >= STATE_WARN_BYTES && !this.warnEmittedThisWindow) {
			this.warnEmittedThisWindow = true
			this.deps.log(
				`[webview-metrics] WARN "state" payload ${toKb(bytes)}KB > 256KB top[${formatTopFields(fieldSizes)}] runbook=docs/runbooks/gray-webview.md`,
			)
			this.emitEvent(1, bytes, fieldSizes)
		}
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

	/** Emits the periodic window summary line and resets window-local flags. */
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
