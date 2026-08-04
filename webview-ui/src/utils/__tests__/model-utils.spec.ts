// npx vitest src/utils/__tests__/model-utils.spec.ts

import { calculateTokenDistribution } from "../model-utils"

describe("calculateTokenDistribution", () => {
	it("should calculate token distribution correctly", () => {
		const contextWindow = 10000
		const contextTokens = 5000
		const maxTokens = 2000

		const result = calculateTokenDistribution(contextWindow, contextTokens, maxTokens)

		expect(result.reservedForOutput).toBe(maxTokens)
		expect(result.availableSize).toBe(3000) // 10000 - 5000 - 2000

		// Percentages should sum to 100%
		expect(Math.round(result.currentPercent + result.reservedPercent + result.availablePercent)).toBe(100)
	})

	it("should default to 8192 when maxTokens not provided", () => {
		const contextWindow = 20000
		const contextTokens = 5000

		const result = calculateTokenDistribution(contextWindow, contextTokens)

		expect(result.reservedForOutput).toBe(8192)
		expect(result.availableSize).toBe(6808) // 20000 - 5000 - 8192
	})

	it("should handle negative or zero inputs by returning all-zero values", () => {
		const result = calculateTokenDistribution(-1000, -500)

		// An invalid (non-positive) window leaves nothing meaningful to draw: every
		// value is zero so the UI renders an empty bar instead of a full/overflowing one.
		expect(result).toEqual({
			currentPercent: 0,
			reservedPercent: 0,
			availablePercent: 0,
			reservedForOutput: 0,
			availableSize: 0,
		})
	})

	it("should handle zero context window without division by zero errors", () => {
		const result = calculateTokenDistribution(0, 0)

		// When contextWindow is 0, all values are zero (empty bar) rather than
		// fabricating a full/overflowing bar.
		expect(result).toEqual({
			currentPercent: 0,
			reservedPercent: 0,
			availablePercent: 0,
			reservedForOutput: 0,
			availableSize: 0,
		})
	})
})
