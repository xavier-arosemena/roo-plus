/**
 * Pre-parse length gates for schemas that validate workspace-controlled content
 * (SYNC-23 CP2 finding F-01).
 *
 * WHY THIS EXISTS
 *   zod v3's `.max()` on an array or record is a *product limit*, not a parsing
 *   bound: the parser records one `too_big` issue and then walks every element
 *   anyway, so a 200 000-element `.roomodes` / `.roo/mcp.json` can allocate
 *   hundreds of thousands of issue objects (each with a `path` array) before the
 *   input is finally rejected. The `.max()` caps stay in place — they give a
 *   clean "too big" error for a legitimately oversized file — but the bound that
 *   actually holds is this gate, which refuses the value *before* `safeParse` is
 *   called and never reads an element.
 *
 * COST
 *   O(1) for an array (`length` is a property, not a walk) and at most `cap + 1`
 *   own-key reads for a record (`for…in` stops as soon as the cap is passed). No
 *   element is materialised, copied or validated, so an absurd payload costs the
 *   same as a small one plus a bounded loop.
 *
 * SCOPE
 *   This helper only bounds *this* check. Any future schema that parses an
 *   unbounded array or record from workspace content without calling it is still
 *   exposed to the zod accumulation behaviour.
 */

/**
 * Throws when `value` holds more than `cap` entries.
 *
 * - Arrays are measured by `length` (O(1)).
 * - Plain objects are measured by own enumerable keys, stopping at `cap + 1`.
 * - Any other value (including `undefined`, the valid "field absent" case) is
 *   ignored, so callers can gate an optional field without a null check.
 *
 * The message names the field and the cap and is safe to show to the user.
 */
export function assertBounded(value: unknown, cap: number, label: string): void {
	if (Array.isArray(value)) {
		if (value.length > cap) {
			throw new Error(`${label} has ${value.length} entries; the allowed maximum is ${cap}`)
		}
		return
	}

	if (value === null || typeof value !== "object") {
		return
	}

	let count = 0
	for (const key in value as Record<string, unknown>) {
		if (!Object.prototype.hasOwnProperty.call(value, key)) {
			continue
		}
		count += 1
		if (count > cap) {
			throw new Error(`${label} has more than ${cap} keys; the allowed maximum is ${cap}`)
		}
	}
}
