/**
 * Dependency-free, allocation-light byte estimator for host→webview `state`
 * payload fields.
 *
 * Extracted from `core/webview/webviewPayloadMetrics.ts` (2026-09-17
 * taskHistory payload hardening) so the SAME estimator can be shared by
 * non-webview consumers — notably the byte-budgeted task-history projection in
 * `core/services/TaskHistoryService.ts` — without a service importing a
 * webview-metrics module. It has NO imports on purpose: it must stay safe to use
 * from any layer of the extension host, and it never touches VS Code APIs.
 *
 * Contract (unchanged from the original probe guard, diagnosis 2026-09-15 §3.5):
 * - NEVER `JSON.stringify` an array longer than {@link EXACT_ARRAY_MAX_LENGTH}
 *   elements. The estimator runs on the per-push hot path; serializing a
 *   ~1.5 MB transcript merely to size it was ~3.9 ms of event-loop-blocking CPU
 *   per push on a path already under suspicion.
 * - Exact for scalars, strings, short arrays, and plain objects (never the
 *   byte-dominant case).
 * - For long arrays it sums the known long-text fields of each element plus a
 *   fixed per-element envelope. The documented worst-case relative error is
 *   `ESTIMATE_TOLERANCE` in `webviewPayloadMetrics.ts`.
 */

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
 * error is bounded by `ESTIMATE_TOLERANCE`.
 */
export const EXACT_ARRAY_MAX_LENGTH = 8

/**
 * Fixed per-element allowance for the cheap proxy: JSON punctuation (`{}`,
 * quotes, `:`, `,`) plus the scalar metadata of a message/history-shaped object
 * (`ts`, `type`, `say`, `partial`, token counts, …) that is not one of
 * {@link ARRAY_TEXT_FIELDS}. 112 B/message is the non-`text` envelope observed
 * in the 2026-09-15 microbenchmark, which keeps the dominant-text case accurate
 * to ~1 %.
 */
export const ELEMENT_ENVELOPE_BYTES = 112

/**
 * String-valued fields that carry the byte mass of the known-bloat arrays
 * (messages and task-history rows). Reading `.length` on these is the
 * allocation-free core of the proxy; the key names themselves are covered by
 * {@link ELEMENT_ENVELOPE_BYTES}.
 */
export const ARRAY_TEXT_FIELDS = [
	"text",
	"reasoning",
	"task",
	"id",
	"name",
	"slug",
	"description",
	"roleDefinition",
] as const

/** Exact JSON byte size of a single value (the pre-guard probe). */
export function jsonSizeBytes(value: unknown): number {
	if (value === undefined || value === null) {
		return 0
	}
	// Cheap probe: serialize ONLY the one value being measured, then measure
	// bytes. Never call this on a whole payload.
	return Buffer.byteLength(JSON.stringify(value) ?? "", "utf8")
}

/**
 * Σ `.length` of one array element's {@link ARRAY_TEXT_FIELDS} entries.
 * Scalar fields (numbers, booleans) are accounted for by
 * {@link ELEMENT_ENVELOPE_BYTES} instead of being measured.
 */
export function estimateElementTextBytes(element: unknown): number {
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

/**
 * Cheap per-row size of one element of a long array — the building block for
 * incremental byte budgets (e.g. the task-history window).
 *
 * Deliberately the CHEAP proxy only: it never calls `JSON.stringify`, so a
 * budget loop can size thousands of rows without a single serialization. For an
 * array with more than {@link EXACT_ARRAY_MAX_LENGTH} elements,
 * `estimateFieldBytes(array) === 2 + Σ estimateArrayRowBytes(element)` — the
 * `2` being the array's own `[`/`]` — which lets a bound be enforced row by row
 * against the same number the field probe would report.
 */
export function estimateArrayRowBytes(element: unknown): number {
	return ELEMENT_ENVELOPE_BYTES + 1 + estimateElementTextBytes(element)
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
			bytes += estimateArrayRowBytes(value[i])
		}
		return bytes
	}

	return jsonSizeBytes(value)
}
