/**
 * Work counter for the summary pipeline.
 *
 * The counter is a plain number incremented by the reference-data lookups, so a
 * run can be compared with another run on a different machine: the input is
 * fixed, therefore the total is fixed.
 */
export const stats = { comparisons: 0 }

export function resetStats() {
	stats.comparisons = 0
}
