// npx vitest run extension-messages/__tests__/liveness.spec.ts

import { parseWebviewMessage } from "../../webview-messages/index.js"
import { livenessPongMessageSchema } from "../../webview-messages/misc.js"
import { parseExtensionMessage } from "../index.js"

/**
 * Boundary specs for the renderer-liveness probe pair (2026-09-18 gray-webview
 * capture): `livenessPing` (host → webview) and `livenessPong`
 * (webview → host). Both carry a single monotonic sequence NUMBER — the specs
 * assert that nothing else can cross, because a string that reaches the probe
 * would be a privacy leak by construction.
 */
describe("renderer-liveness probe messages", () => {
	describe("livenessPing (host → webview)", () => {
		it("round-trips through the boundary with the sequence number", () => {
			const parsed = parseExtensionMessage({ type: "livenessPing", livenessPingSeq: 7 })

			expect(parsed.ok).toBe(true)

			if (!parsed.ok) {
				return
			}

			expect(parsed.message.type).toBe("livenessPing")
			expect(parsed.message.livenessPingSeq).toBe(7)
		})

		it("rejects a missing or non-numeric sequence number", () => {
			// Also proves the schema is REGISTERED: an unregistered type would pass
			// through structurally and `{ type: "livenessPing" }` would parse.
			expect(parseExtensionMessage({ type: "livenessPing" }).ok).toBe(false)
			expect(parseExtensionMessage({ type: "livenessPing", livenessPingSeq: "7" }).ok).toBe(false)
		})
	})

	describe("livenessPong (webview → host)", () => {
		it("round-trips through the boundary with the sequence number", () => {
			const parsed = parseWebviewMessage({ type: "livenessPong", livenessPongSeq: 7 })

			expect(parsed.ok).toBe(true)

			if (!parsed.ok) {
				return
			}

			expect(parsed.message.type).toBe("livenessPong")
			expect(parsed.message.livenessPongSeq).toBe(7)
		})

		it("rejects a non-numeric sequence number at the schema level", () => {
			expect(livenessPongMessageSchema.safeParse({ type: "livenessPong", livenessPongSeq: "7" }).success).toBe(
				false,
			)
			expect(livenessPongMessageSchema.safeParse({ type: "livenessPong" }).success).toBe(false)
		})

		it("carries the OPTIONAL integer resource-error count (T2.3)", () => {
			const parsed = parseWebviewMessage({ type: "livenessPong", livenessPongSeq: 9, resourceErrorCount: 3 })

			expect(parsed.ok).toBe(true)

			if (parsed.ok) {
				expect(parsed.message.resourceErrorCount).toBe(3)
			}
		})

		it("stays backward-compatible when the resource-error count is omitted", () => {
			const parsed = parseWebviewMessage({ type: "livenessPong", livenessPongSeq: 9 })

			expect(parsed.ok).toBe(true)

			if (parsed.ok) {
				expect(parsed.message.resourceErrorCount).toBeUndefined()
			}
		})

		it("rejects a non-integer / negative / string resource-error count", () => {
			for (const resourceErrorCount of [1.5, -1, "3", Number.NaN]) {
				expect(
					livenessPongMessageSchema.safeParse({
						type: "livenessPong",
						livenessPongSeq: 1,
						resourceErrorCount,
					}).success,
				).toBe(false)
			}
		})

		it("rejects a counter ABOVE the upper bound (F-3)", () => {
			// The bound is symmetric: `nonnegative()` caps the bottom, `max()` caps the
			// top, so a hostile/corrupt renderer cannot inject an unbounded integer.
			expect(
				livenessPongMessageSchema.safeParse({
					type: "livenessPong",
					livenessPongSeq: 1,
					resourceErrorCount: 1_000_001,
				}).success,
			).toBe(false)

			expect(
				livenessPongMessageSchema.safeParse({
					type: "livenessPong",
					livenessPongSeq: 1,
					salvagedStateCount: 1_000_001,
				}).success,
			).toBe(false)

			// The exact maximum is still accepted (inclusive bound).
			expect(
				livenessPongMessageSchema.safeParse({
					type: "livenessPong",
					livenessPongSeq: 1,
					resourceErrorCount: 1_000_000,
				}).success,
			).toBe(true)
		})

		it("carries the OPTIONAL integer salvaged-state count (F-2)", () => {
			const parsed = parseWebviewMessage({
				type: "livenessPong",
				livenessPongSeq: 9,
				resourceErrorCount: 0,
				salvagedStateCount: 2,
			})

			expect(parsed.ok).toBe(true)

			if (parsed.ok) {
				expect(parsed.message.salvagedStateCount).toBe(2)
			}

			// Backward-compatible when omitted.
			const omitted = parseWebviewMessage({ type: "livenessPong", livenessPongSeq: 9 })
			expect(omitted.ok).toBe(true)

			if (omitted.ok) {
				expect(omitted.message.salvagedStateCount).toBeUndefined()
			}
		})
	})
})
