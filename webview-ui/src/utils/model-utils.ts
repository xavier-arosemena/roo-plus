import { ANTHROPIC_DEFAULT_MAX_TOKENS } from "@roo-code/types"

/**
 * Result of token distribution calculation
 */
export interface TokenDistributionResult {
	/**
	 * Percentage of context window used by current tokens (0-100)
	 */
	currentPercent: number

	/**
	 * Percentage of context window reserved for model output (0-100)
	 */
	reservedPercent: number

	/**
	 * Percentage of context window still available (0-100)
	 */
	availablePercent: number

	/**
	 * Number of tokens reserved for model output
	 */
	reservedForOutput: number

	/**
	 * Number of tokens still available in the context window
	 */
	availableSize: number
}

/**
 * Calculates distribution of tokens within the context window
 * This is used for visualizing the token distribution in the UI
 *
 * @param contextWindow The total size of the context window
 * @param contextTokens The number of tokens currently used
 * @param maxTokens Optional override for tokens reserved for model output (otherwise uses 8192)
 * @returns Distribution of tokens with percentages and raw numbers
 */
export const calculateTokenDistribution = (
	contextWindow: number,
	contextTokens: number,
	maxTokens?: number,
): TokenDistributionResult => {
	// Handle potential invalid inputs with positive fallbacks
	const safeContextWindow = Math.max(0, contextWindow)
	const safeContextTokens = Math.max(0, contextTokens)

	// Get the actual max tokens value from the model
	// If maxTokens is valid (positive and not equal to context window), use it, otherwise reserve 8192 tokens as a default
	const reservedForOutput =
		maxTokens && maxTokens > 0 && maxTokens !== safeContextWindow ? maxTokens : ANTHROPIC_DEFAULT_MAX_TOKENS

	// Calculate sizes directly without buffer display
	const availableSize = Math.max(0, safeContextWindow - safeContextTokens - reservedForOutput)

	// Defensive: a missing, zero, or non-finite window leaves nothing meaningful to
	// draw. Return all-zero values so the bar renders empty instead of overflowing.
	if (!Number.isFinite(safeContextWindow) || safeContextWindow <= 0) {
		return {
			currentPercent: 0,
			reservedPercent: 0,
			availablePercent: 0,
			reservedForOutput: 0,
			availableSize: 0,
		}
	}

	// Percentages are always relative to the real context window. Clamp current to
	// 100 so cache + output tokens exceeding the window can never overflow the bar.
	const currentPercent = Math.min((safeContextTokens / safeContextWindow) * 100, 100)

	// Only reserve output room within the width left after the used section, so the
	// three segments never overlap and never exceed 100% of the bar width.
	const remainingPercent = Math.max(0, 100 - currentPercent)
	const reservedPercent = Math.min((reservedForOutput / safeContextWindow) * 100, remainingPercent)
	const availablePercent = Math.max(0, remainingPercent - reservedPercent)

	return {
		currentPercent,
		reservedPercent,
		availablePercent,
		reservedForOutput,
		availableSize,
	}
}
