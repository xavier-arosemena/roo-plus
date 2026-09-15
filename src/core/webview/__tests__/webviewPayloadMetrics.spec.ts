// npx vitest run core/webview/__tests__/webviewPayloadMetrics.spec.ts

import type { ExtensionMessage, WebviewPayloadSizeEvent } from "@roo-code/types"
import { RooCodeEventName, webviewPayloadSizeEventSchema } from "@roo-code/types"

import {
	ESTIMATE_TOLERANCE,
	EXACT_ARRAY_MAX_LENGTH,
	METRICS_WINDOW_MS,
	STATE_WARN_BYTES,
	WebviewPayloadMetrics,
	estimateFieldBytes,
	type WebviewPayloadMetricsDeps,
} from "../webviewPayloadMetrics"
import { projectClineMessagesForWebview } from "../clineMessagesForWebview"

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

	test("regression 2026-09-11: customModes is attributed in the WARN/ERROR breakdown", () => {
		// v3.88.1 post-deploy watch: an ERROR reported 1410KB while the
		// breakdown only attributed `taskHistory=649KB` — the residual ~762KB
		// was the full `customModes` mode catalog riding un-probed on every
		// `state` message. customModes must now appear in top[...] and, for an
		// even larger catalog, be able to single-handedly cross the WARN
		// threshold (previously invisible: unprobed fields estimated as 0).
		const h = createHarness()
		const catalog = Array.from({ length: 90 }, (_, i) => ({ slug: `m${i}`, roleDefinition: "r".repeat(8 * KB) }))
		const history = Array.from({ length: 100 }, (_, i) => ({ id: String(i), ts: i, task: "t".repeat(6 * KB) }))

		h.metrics.recordStateMessage({
			type: "state",
			state: { version: "3.88.1", customModes: catalog, taskHistory: history },
		} as unknown as ExtensionMessage)

		const errorLines = h.logLines.filter((l) => l.includes("ERROR"))
		expect(errorLines).toHaveLength(1)
		expect(errorLines[0]).toContain("customModes=")
		expect(errorLines[0]).toContain("taskHistory=")

		const [event] = h.events.filter((e) => e.severity === 2)
		expect(() => webviewPayloadSizeEventSchema.parse(event)).not.toThrow()
		expect(event.fieldSizes.map((f) => f.name)).toContain("customModes")
		// The attributed top fields now close the gap to the reported total
		// (the exact complaint from the incident report).
		const attributedKb = event.fieldSizes.reduce((s, f) => s + Math.round(f.bytes / KB), 0)
		const totalKb = Math.round(event.messageBytes / KB)
		expect(totalKb - attributedKb).toBeLessThan(100)

		// A big catalog with small history still alerts (old probe would have
		// estimated it as healthy ~2KB and stayed silent).
		const h2 = createHarness()
		h2.metrics.recordStateMessage({
			type: "state",
			state: { version: "3.88.1", customModes: catalog, clineMessages: [], taskHistory: [] },
		} as unknown as ExtensionMessage)
		expect(h2.logLines.some((l) => l.includes("WARN") && l.includes("customModes="))).toBe(true)
	})

	test("regression 2026-09-15: the bounded clineMessages window keeps the SLI silent", () => {
		// The incident: a long task's FULL transcript (~962KB) rode EVERY `state`
		// push — reopening it from history produced a 1045KB ERROR. The bounded
		// projection must keep the same transcript's push under the WARN
		// threshold, while an unbounded transcript must still be attributed to
		// `clineMessages` so the field stays named in the breakdown.
		const longTranscript = Array.from({ length: 800 }, (_, i) => ({
			ts: i + 1,
			type: "say" as const,
			say: "text" as const,
			text: "x".repeat(1400), // ≈ 1.1 MB total (≥ the 1 MB ERROR threshold)
		}))
		const bounded = projectClineMessagesForWebview(longTranscript)

		expect(bounded.bounded).toBe(true)
		expect(bounded.messages.length).toBeLessThan(longTranscript.length)

		const h = createHarness()
		h.metrics.recordStateMessage({
			type: "state",
			state: { version: "3.88.2", clineMessages: bounded.messages },
		} as unknown as ExtensionMessage)

		expect(h.logLines).toEqual([])
		expect(h.warnings).toEqual([])
		expect(h.events).toEqual([])

		const h2 = createHarness()
		h2.metrics.recordStateMessage({
			type: "state",
			state: { version: "3.88.2", clineMessages: longTranscript },
		} as unknown as ExtensionMessage)

		const errorLines = h2.logLines.filter((l) => l.includes("ERROR"))
		expect(errorLines).toHaveLength(1)
		expect(errorLines[0]).toContain("clineMessages=")
		expect(h2.events[0]?.fieldSizes.map((f) => f.name)).toContain("clineMessages")
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
				expect(["clineMessages", "taskHistory", "customModes", "messageQueue", "marketplaceItems"]).toContain(
					field.name,
				)
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

			// Exactly one stringify call: the short-array exact fallback of the
			// cheap probe (a 1-element array is serialized exactly because
			// exactness is free at that size). The full message object must NOT
			// be serialized for healthy payloads (no double serialization on the
			// hot path), and arrays above EXACT_ARRAY_MAX_LENGTH make no call at
			// all (see the probe-guard tests below).
			expect(stringifySpy).toHaveBeenCalledTimes(1)
			expect(seen[0]).not.toBe(message)
			expect(Array.isArray(seen[0])).toBe(true)
		} finally {
			stringifySpy.mockRestore()
		}
	})

	test("probe guard: a healthy payload with a large array is never fully serialized", () => {
		const stringifySpy = vi.spyOn(JSON, "stringify")

		try {
			const h = createHarness()
			// ~145 KB of `clineMessages` in 200 elements: under the 256 KB WARN
			// threshold, but far above the exact-fallback length, so the
			// pre-guard probe would have `JSON.stringify`d the whole array on
			// EVERY push just to decide the push is healthy.
			const clineMessages = Array.from({ length: EXACT_ARRAY_MAX_LENGTH * 25 }, (_, i) => ({
				ts: i + 1,
				type: "say",
				say: "text",
				text: "x".repeat(600),
			}))

			h.metrics.recordStateMessage({
				type: "state",
				state: { version: "3.88.2", clineMessages },
			} as unknown as ExtensionMessage)

			// Healthy ⇒ silent, and the hot path made NO full serialize at all.
			expect(h.logLines).toEqual([])
			expect(h.warnings).toEqual([])
			expect(h.events).toEqual([])
			expect(stringifySpy).not.toHaveBeenCalled()
		} finally {
			stringifySpy.mockRestore()
		}
	})

	test("probe guard: an over-threshold push pays a bounded number of exact serializes, once per window", () => {
		const realStringify = JSON.stringify
		const seen: unknown[] = []
		const stringifySpy = vi.spyOn(JSON, "stringify").mockImplementation((...args: unknown[]) => {
			seen.push(args[0])
			return realStringify(...(args as Parameters<typeof JSON.stringify>))
		})

		try {
			const h = createHarness()
			const clineMessages = Array.from({ length: 400 }, (_, i) => ({
				ts: i + 1,
				type: "say",
				say: "text",
				text: "x".repeat(700),
			}))
			const message = {
				type: "state",
				state: { version: "3.88.2", clineMessages },
			} as unknown as ExtensionMessage

			h.metrics.recordStateMessage(message)

			// The alert path pays exactly two full serializes — the exact field
			// probe + the full-message stringify. The hot-path probe that decided
			// to alert serialized nothing, and the big array was serialized at
			// most once (not once per stage/twice per push).
			expect(stringifySpy).toHaveBeenCalledTimes(2)
			expect(seen.filter((value) => value === clineMessages)).toHaveLength(1)
			expect(seen.some((value) => value === message)).toBe(true)
			expect(h.logLines.filter((l) => l.includes("WARN"))).toHaveLength(1)

			// A second over-threshold push in the SAME window adds no further
			// exact serialization: the WARN already fired for this window.
			h.metrics.recordStateMessage(message)
			expect(stringifySpy).toHaveBeenCalledTimes(2)
			expect(h.logLines.filter((l) => l.includes("WARN"))).toHaveLength(1)
		} finally {
			stringifySpy.mockRestore()
		}
	})

	test("probe guard: the cheap estimate stays within the documented tolerance", () => {
		const representative = Array.from({ length: 300 }, (_, i) => ({
			ts: i + 1,
			type: "say",
			say: "text",
			text: "x".repeat(1200),
		}))
		const exact = Buffer.byteLength(JSON.stringify(representative), "utf8")
		const estimate = estimateFieldBytes(representative)

		expect(estimate).toBeGreaterThan(0)
		expect(Math.abs(estimate - exact) / exact).toBeLessThanOrEqual(ESTIMATE_TOLERANCE)

		// Text-dominated arrays (the real `clineMessages` byte shape) are far
		// tighter than the documented bound.
		const textDominated = Array.from({ length: 300 }, (_, i) => ({
			ts: i + 1,
			type: "say",
			say: "text",
			text: "x".repeat(8 * KB),
		}))
		const exactBig = Buffer.byteLength(JSON.stringify(textDominated), "utf8")
		expect(Math.abs(estimateFieldBytes(textDominated) - exactBig) / exactBig).toBeLessThan(0.01)
	})

	test("probe guard: emitted WARN/ERROR lines keep the exact KB and top[...] attribution", () => {
		const warnMessages = Array.from({ length: 400 }, (_, i) => ({
			ts: i + 1,
			type: "say",
			say: "text",
			text: "x".repeat(700),
		}))
		const warnMessage = {
			type: "state",
			state: { version: "3.88.2", clineMessages: warnMessages },
		} as unknown as ExtensionMessage

		const h = createHarness()
		h.metrics.recordStateMessage(warnMessage)

		// Byte-for-byte the pre-guard line: exact total KB, exact field KB.
		expect(h.logLines).toEqual([
			`[webview-metrics] WARN "state" payload ${Math.round(JSON.stringify(warnMessage).length / KB)}KB > 256KB top[clineMessages=${Math.round(Buffer.byteLength(JSON.stringify(warnMessages), "utf8") / KB)}KB] runbook=docs/runbooks/gray-webview.md`,
		])
		expect(() => webviewPayloadSizeEventSchema.parse(h.events[0])).not.toThrow()
		expect(h.events[0].messageBytes).toBe(JSON.stringify(warnMessage).length)
		expect(h.events[0].fieldSizes).toEqual([
			{ name: "clineMessages", bytes: Buffer.byteLength(JSON.stringify(warnMessages), "utf8") },
		])

		const errorMessages = Array.from({ length: 900 }, (_, i) => ({
			ts: i + 1,
			type: "say",
			say: "text",
			text: "x".repeat(1400),
		}))
		const errorMessage = {
			type: "state",
			state: { version: "3.88.2", clineMessages: errorMessages },
		} as unknown as ExtensionMessage

		const h2 = createHarness()
		h2.metrics.recordStateMessage(errorMessage)

		expect(h2.logLines).toEqual([
			`[webview-metrics] ERROR "state" payload ${Math.round(JSON.stringify(errorMessage).length / KB)}KB > 1MB top[clineMessages=${Math.round(Buffer.byteLength(JSON.stringify(errorMessages), "utf8") / KB)}KB] runbook=docs/runbooks/gray-webview.md`,
		])
		expect(() => webviewPayloadSizeEventSchema.parse(h2.events[0])).not.toThrow()

		// The one-time popup still fires exactly once.
		expect(h2.warnings).toHaveLength(1)
		h2.metrics.recordStateMessage(errorMessage)
		expect(h2.warnings).toHaveLength(1)
		expect(h2.logLines.filter((l) => l.includes("ERROR"))).toHaveLength(1)
	})

	test("probe guard: edge cases — empty, tiny, string and single-oversized-message fields", () => {
		expect(estimateFieldBytes(undefined)).toBe(0)
		expect(estimateFieldBytes(null)).toBe(0)
		expect(estimateFieldBytes([])).toBe(Buffer.byteLength("[]", "utf8"))
		expect(estimateFieldBytes("")).toBe(0)
		expect(estimateFieldBytes("y".repeat(1000))).toBe(1000)

		// Short arrays take the exact fallback: no estimate error at that size.
		const short = [{ ts: 1, type: "say", say: "text", text: "x".repeat(300) }]
		expect(estimateFieldBytes(short)).toBe(Buffer.byteLength(JSON.stringify(short), "utf8"))

		// A message with no known-bloat fields stays silent.
		const silent = createHarness()
		silent.metrics.recordStateMessage({
			type: "state",
			state: { version: "3.88.2" },
		} as unknown as ExtensionMessage)
		expect(silent.logLines).toEqual([])
		expect(silent.events).toEqual([])

		// Residual risk from the incident: ONE oversized newest message must still
		// be detected, with exact numbers, even though it is a 1-element array.
		const oversized = [{ ts: 1, type: "say", say: "text", text: "z".repeat(2 * KB * KB) }]
		const oversizedMessage = {
			type: "state",
			state: { version: "3.88.2", clineMessages: oversized },
		} as unknown as ExtensionMessage

		const h = createHarness()
		h.metrics.recordStateMessage(oversizedMessage)

		const [error] = h.logLines.filter((l) => l.includes("ERROR"))
		expect(error).toContain(
			`top[clineMessages=${Math.round(Buffer.byteLength(JSON.stringify(oversized), "utf8") / KB)}KB]`,
		)
		expect(h.events[0].messageBytes).toBe(JSON.stringify(oversizedMessage).length)
		expect(h.warnings).toHaveLength(1)
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
