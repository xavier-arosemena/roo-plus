// npx vitest run core/webview/__tests__/webviewPayloadMetrics.spec.ts

import type { ExtensionMessage, WebviewPayloadSizeEvent } from "@roo-code/types"
import { RooCodeEventName, webviewPayloadSizeEventSchema } from "@roo-code/types"

import {
	METRICS_WINDOW_MS,
	STATE_WARN_BYTES,
	WebviewPayloadMetrics,
	type WebviewPayloadMetricsDeps,
} from "../webviewPayloadMetrics"

const KB = 1024

/**
 * Builds a fake `state` message whose `clineMessages` field serializes to
 * approximately `bytes` bytes of JSON. Content is a single repeated "x" run —
 * tests assert it NEVER appears in any output (privacy contract).
 */
function fakeStateMessage(bytes: number, extraText = ""): ExtensionMessage {
	const overhead = '{"text":"","partial":false}' /* rough per-element wrapper */
	const payload = "x".repeat(Math.max(0, bytes - overhead.length - extraText.length))
	const message: ExtensionMessage = {
		type: "state",
		state: {
			version: "9.9.9",
			clineMessages: [{ ts: 1, type: "say", say: "text", text: payload + extraText }],
		},
	}
	return message
}

interface Harness {
	metrics: WebviewPayloadMetrics
	now: () => number
	setNow: (t: number) => void
	logLines: string[]
	warnings: string[]
	events: WebviewPayloadSizeEvent[]
	runDueTimers: () => void
}

function createHarness(startTime = 1_000_000): Harness {
	let current = startTime
	let virtualNow = startTime
	const timers: Array<{ id: number; at: number; callback: () => void }> = []
	let nextId = 1
	const logLines: string[] = []
	const warnings: string[] = []
	const events: WebviewPayloadSizeEvent[] = []

	const deps: WebviewPayloadMetricsDeps = {
		now: () => current,
		log: (line) => logLines.push(line),
		showWarning: (message) => warnings.push(message),
		emitEvent: (payload) => events.push(payload),
		schedule: (callback, delayMs) => {
			const timer = { id: nextId++, at: virtualNow + delayMs, callback }
			timers.push(timer)
			return () => {
				const idx = timers.indexOf(timer)
				if (idx !== -1) {
					timers.splice(idx, 1)
				}
			}
		},
	}

	return {
		metrics: new WebviewPayloadMetrics(deps),
		now: () => current,
		setNow: (t) => {
			virtualNow = t
			current = t
		},
		logLines,
		warnings,
		events,
		runDueTimers: () => {
			const due = timers.filter((t) => t.at <= virtualNow).sort((a, b) => a.at - b.at)
			for (const t of due) {
				const idx = timers.indexOf(t)
				if (idx !== -1) {
					timers.splice(idx, 1)
					t.callback()
				}
			}
		},
	}
}

describe("WebviewPayloadMetrics", () => {
	test("exports the alert thresholds used by the SLI", () => {
		expect(STATE_WARN_BYTES).toBe(256 * KB)
		expect(METRICS_WINDOW_MS).toBeCloseTo(60_000, -3)
	})

	test("under-threshold state messages are silent (no log, no warning, no event)", () => {
		const h = createHarness()

		h.metrics.recordStateMessage(fakeStateMessage(10 * KB))
		h.metrics.recordStateMessage(fakeStateMessage(20 * KB))

		expect(h.logLines).toEqual([])
		expect(h.warnings).toEqual([])
		expect(h.events).toEqual([])
	})

	test("300 KB fake state produces one windowed WARN with a field-size breakdown", () => {
		const h = createHarness()

		h.metrics.recordStateMessage(fakeStateMessage(300 * KB, "SECRET-TASK-TEXT"))
		// A second large message in the same window must NOT spam a second WARN.
		h.metrics.recordStateMessage(fakeStateMessage(310 * KB))

		const warnLines = h.logLines.filter((l) => l.includes("WARN"))
		expect(warnLines).toHaveLength(1)
		expect(warnLines[0]).toContain('"state"')
		expect(warnLines[0]).toContain("> 256KB")
		expect(warnLines[0]).toContain("clineMessages=")
		expect(warnLines[0]).toContain("runbook=docs/runbooks/gray-webview.md")

		// WARN is accompanied by exactly one typed event, validated by the
		// strictly-numeric zod schema from @roo-code/types.
		expect(h.events).toHaveLength(1)
		expect(() => webviewPayloadSizeEventSchema.parse(h.events[0])).not.toThrow()
		expect(h.events[0].severity).toBe(1)
		expect(h.events[0].messageBytes).toBeGreaterThanOrEqual(STATE_WARN_BYTES)
		expect(h.events[0].fieldSizes.length).toBeLessThanOrEqual(3)
	})

	test(">1 MB produces one ERROR log line and the user notification fires only once", () => {
		const h = createHarness()

		h.metrics.recordStateMessage(fakeStateMessage(1.2 * 1024 * KB))
		h.metrics.recordStateMessage(fakeStateMessage(1.5 * 1024 * KB))

		const errorLines = h.logLines.filter((l) => l.includes("ERROR"))
		expect(errorLines).toHaveLength(1)
		expect(errorLines[0]).toContain("runbook=docs/runbooks/gray-webview.md")

		expect(h.warnings).toHaveLength(1)
		expect(h.warnings[0]).toContain("gray-webview.md")
		expect(h.warnings[0]).toContain("Developer: Reload Window")

		const errorEvents = h.events.filter((e) => e.severity === 2)
		expect(errorEvents).toHaveLength(1)
		expect(() => webviewPayloadSizeEventSchema.parse(errorEvents[0])).not.toThrow()
	})

	test("window flush emits the periodic summary line and re-arms WARN for the next window", () => {
		const h = createHarness(1_000_000)

		h.metrics.recordStateMessage(fakeStateMessage(5 * KB))
		h.metrics.recordStateMessage(fakeStateMessage(300 * KB))

		// Advance past the window and run the scheduled flush.
		h.setNow(1_000_000 + METRICS_WINDOW_MS + 1)
		h.runDueTimers()

		const summary = h.logLines.filter((l) => l.includes("state_msgs="))
		expect(summary).toHaveLength(1)
		expect(summary[0]).toMatch(/state_msgs=2 p50=\d+KB p99=\d+KB max=\d+KB/)

		// WARN was consumed in the previous window; a new window may warn again.
		h.metrics.recordStateMessage(fakeStateMessage(400 * KB))
		expect(h.logLines.filter((l) => l.includes("WARN"))).toHaveLength(2)
	})

	test("flushing an empty window logs nothing", () => {
		const h = createHarness(1_000_000)

		h.metrics.recordStateMessage(fakeStateMessage(5 * KB))
		h.setNow(1_000_000 + METRICS_WINDOW_MS + 1)
		h.runDueTimers()
		expect(h.logLines.filter((l) => l.includes("state_msgs="))).toHaveLength(1)

		// Idle past another window: no messages recorded, no summary logged.
		h.setNow(1_000_000 + 2 * (METRICS_WINDOW_MS + 1))
		h.runDueTimers()
		expect(h.logLines.filter((l) => l.includes("state_msgs="))).toHaveLength(1)
	})

	test("after dispose the recorder is inert and the flush timer is cancelled", () => {
		const h = createHarness(1_000_000)

		h.metrics.recordStateMessage(fakeStateMessage(5 * KB))
		h.metrics.dispose()
		h.metrics.recordStateMessage(fakeStateMessage(2 * 1024 * KB))

		h.setNow(1_000_000 + METRICS_WINDOW_MS + 1)
		h.runDueTimers()

		expect(h.logLines).toEqual([])
		expect(h.warnings).toEqual([])
		expect(h.events).toEqual([])
	})

	test("privacy: log lines and event payloads contain only numbers, the literal kind, and known field names", () => {
		const h = createHarness(1_000_000)
		const SECRET = "SECRET-TASK-TEXT"

		h.metrics.recordStateMessage(fakeStateMessage(5 * KB, SECRET))
		h.metrics.recordStateMessage(fakeStateMessage(300 * KB, SECRET))
		h.metrics.recordStateMessage(fakeStateMessage(1.2 * 1024 * KB, SECRET))
		h.setNow(1_000_000 + METRICS_WINDOW_MS + 1)
		h.runDueTimers()

		// Every emitted line may only contain identifiers from this static
		// allow-list plus digits/punctuation. The sentinel "x" run and the
		// embedded secret text must never appear.
		const allowedIdentifiers = new Set([
			"webview",
			"metrics",
			"state_msgs",
			"p50",
			"p99",
			"max",
			"KB",
			"WARN",
			"ERROR",
			"state",
			"payload",
			"top",
			"clineMessages",
			"taskHistory",
			"runbook",
			"docs",
			"runbooks",
			"gray",
			"webview",
			"md",
			"Developer",
			"Reload",
			"Window",
			"Roo",
			"sent",
			"over",
			"MB",
			"message",
			"to",
			"the",
			"stop",
			"responding",
			"The",
			"panel",
			"may",
			"turn",
			"gray",
			"or",
			"stop",
			"responding",
			"Runbook",
			"immediate",
			"mitigation",
			"n",
			"a",
		])
		const lines = [...h.logLines, ...h.warnings]
		expect(lines.length).toBeGreaterThan(0)
		for (const line of lines) {
			expect(line).not.toContain(SECRET)
			// No long content runs may leak (the payload is a 300KB+ run of "x").
			expect(line).not.toMatch(/x{10,}/)
			for (const token of line.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? []) {
				expect(allowedIdentifiers.has(token)).toBe(true)
			}
		}
		// The windowed summary line has the exact documented shape.
		const summary = h.logLines.find((l) => l.includes("state_msgs="))
		expect(summary).toMatch(/^\[webview-metrics\] state_msgs=\d+ p50=\d+KB p99=\d+KB max=\d+KB$/)

		for (const event of h.events) {
			const serialized = JSON.stringify(event)
			expect(serialized).not.toContain(SECRET)
			expect(serialized).not.toMatch(/x{10,}/)
			// Only allow-listed static field names may appear.
			for (const field of event.fieldSizes) {
				expect(["clineMessages", "taskHistory", "messageQueue", "marketplaceItems"]).toContain(field.name)
				expect(typeof field.bytes).toBe("number")
			}
		}
	})

	test("privacy: healthy payloads are never fully serialized (single-probe path)", () => {
		const realStringify = JSON.stringify
		const seen: unknown[] = []
		const stringifySpy = vi.spyOn(JSON, "stringify").mockImplementation((...args: unknown[]) => {
			seen.push(args[0])
			return realStringify(...(args as Parameters<typeof JSON.stringify>))
		})

		try {
			const h = createHarness()
			const message = fakeStateMessage(10 * KB)
			h.metrics.recordStateMessage(message)

			// Exactly one stringify call: the cheap per-field probe. The full
			// message object must NOT be serialized for healthy payloads
			// (no double serialization on the hot path).
			expect(stringifySpy).toHaveBeenCalledTimes(1)
			expect(seen[0]).not.toBe(message)
			expect(Array.isArray(seen[0])).toBe(true)
		} finally {
			stringifySpy.mockRestore()
		}
	})
})

describe("RooCodeEventName.WebviewPayloadSize wiring", () => {
	test("event name constant is stable and schema rejects free-form strings", () => {
		expect(RooCodeEventName.WebviewPayloadSize).toBe("webviewPayloadSize")
		expect(() =>
			webviewPayloadSizeEventSchema.parse({
				severity: 1,
				messageBytes: 300_000,
				windowMessages: 3,
				p50Bytes: 100,
				p99Bytes: 200,
				maxBytes: 300,
				// name outside the static enum must fail (strictly numeric + enum)
				fieldSizes: [{ name: "whatever", bytes: 1 }],
			}),
		).toThrow()
		expect(() =>
			webviewPayloadSizeEventSchema.parse({
				severity: 1,
				messageBytes: 300_000,
				windowMessages: 3,
				p50Bytes: 100,
				p99Bytes: 200,
				maxBytes: 300,
				fieldSizes: [{ name: "clineMessages", bytes: 1 }],
			}),
		).not.toThrow()
	})
})
