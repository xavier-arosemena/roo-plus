// This test directly tests the logic of the ContextWindowProgress component calculations
// without needing to render the full component
import { calculateTokenDistribution } from "@src/utils/model-utils"

export {} // This makes the file a proper TypeScript module

describe("ContextWindowProgress Logic", () => {
	// Using the shared utility function from model-utils.ts instead of reimplementing it

	test("calculates correct token distribution with default 8192 reservation", () => {
		const contextWindow = 10000
		const contextTokens = 1000

		const result = calculateTokenDistribution(contextWindow, contextTokens)

		// Expected calculations:
		// reservedForOutput = 8192 (ANTHROPIC_DEFAULT_MAX_TOKENS)
		// availableSize = 10000 - 1000 - 8192 = 808
		// total = 1000 + 8192 + 808 = 10000
		expect(result.reservedForOutput).toBe(8192)
		expect(result.availableSize).toBe(808)

		// Check percentages
		expect(result.currentPercent).toBeCloseTo(10) // 1000/10000 * 100 = 10%
		expect(result.reservedPercent).toBeCloseTo(81.92) // 8192/10000 * 100 = 81.92%
		expect(result.availablePercent).toBeCloseTo(8.08) // 808/10000 * 100 = 8.08%

		// Verify percentages sum to 100%
		expect(result.currentPercent + result.reservedPercent + result.availablePercent).toBeCloseTo(100)
	})

	test("uses provided maxTokens when available instead of default calculation", () => {
		const contextWindow = 10000
		const contextTokens = 1000

		// First calculate with default 8192 reservation (no maxTokens provided)
		const defaultResult = calculateTokenDistribution(contextWindow, contextTokens)

		// Then calculate with custom maxTokens value
		const customMaxTokens = 1500 // Custom maxTokens instead of default 8192
		const customResult = calculateTokenDistribution(contextWindow, contextTokens, customMaxTokens)

		// VERIFY MAXTOKEN PROP EFFECT: Custom maxTokens should be used directly instead of 8192 calculation
		const defaultReserved = 8192 // ANTHROPIC_DEFAULT_MAX_TOKENS
		expect(defaultResult.reservedForOutput).toBe(defaultReserved)
		expect(customResult.reservedForOutput).toBe(customMaxTokens) // Should use exact provided value

		// Explicitly confirm the tooltip content would be different
		const defaultTooltip = `Reserved for model response: ${defaultReserved} tokens`
		const customTooltip = `Reserved for model response: ${customMaxTokens} tokens`
		expect(defaultTooltip).not.toBe(customTooltip)

		// Verify the effect on available space
		expect(customResult.availableSize).toBe(10000 - 1000 - 1500) // 7500 tokens available
		expect(defaultResult.availableSize).toBe(10000 - 1000 - 8192) // 808 tokens available

		// Verify the effect on percentages
		// With custom maxTokens (1500), the reserved percentage should be lower than default
		expect(defaultResult.reservedPercent).toBeCloseTo(81.92) // 8192/10000 * 100 = 81.92%
		expect(customResult.reservedPercent).toBeCloseTo(15) // 1500/10000 * 100 = 15%

		// Verify percentages still sum to 100%
		expect(customResult.currentPercent + customResult.reservedPercent + customResult.availablePercent).toBeCloseTo(
			100,
		)
	})

	test("handles negative input values", () => {
		const contextWindow = 10000
		const contextTokens = -500 // Negative tokens should be handled gracefully

		const result = calculateTokenDistribution(contextWindow, contextTokens)

		// Expected calculations:
		// safeContextTokens = Math.max(0, -500) = 0
		// reservedForOutput = 8192 (ANTHROPIC_DEFAULT_MAX_TOKENS)
		// availableSize = 10000 - 0 - 8192 = 1808
		// total = 0 + 8192 + 1808 = 10000
		expect(result.currentPercent).toBeCloseTo(0) // 0/10000 * 100 = 0%
		expect(result.reservedPercent).toBeCloseTo(81.92) // 8192/10000 * 100 = 81.92%
		expect(result.availablePercent).toBeCloseTo(18.08) // 1808/10000 * 100 = 18.08%
	})

	test("computes current percent relative to the real context window when tokens < window", () => {
		const contextWindow = 20000
		const contextTokens = 5000

		const result = calculateTokenDistribution(contextWindow, contextTokens)

		// currentPercent is always contextTokens / contextWindow * 100
		expect(result.currentPercent).toBe(25)
		// reserved + available fill the remaining width without exceeding 100%
		expect(result.reservedPercent).toBeCloseTo((8192 / 20000) * 100)
		expect(result.availablePercent).toBeCloseTo(100 - 25 - (8192 / 20000) * 100)
		expect(result.currentPercent + result.reservedPercent + result.availablePercent).toBeCloseTo(100)
	})

	test("shows 100% current and 0 available when tokens fill the context window", () => {
		const contextWindow = 10000
		const contextTokens = 10000

		const result = calculateTokenDistribution(contextWindow, contextTokens)

		expect(result.currentPercent).toBe(100)
		expect(result.reservedPercent).toBe(0)
		expect(result.availablePercent).toBe(0)
		expect(result.availableSize).toBe(0)
	})

	test("clamps to 100% without overflow when tokens exceed the context window", () => {
		const contextWindow = 10000
		const contextTokens = 12000 // More tokens than the window size

		const result = calculateTokenDistribution(contextWindow, contextTokens)

		// reservedForOutput = 8192 (ANTHROPIC_DEFAULT_MAX_TOKENS)
		// availableSize = Math.max(0, 10000 - 12000 - 8192) = 0
		expect(result.reservedForOutput).toBe(8192)
		expect(result.availableSize).toBe(0)

		// The bar is always relative to the real context window: current is clamped
		// to 100% and reserved never pushes past the end of the bar.
		expect(result.currentPercent).toBe(100)
		expect(result.reservedPercent).toBe(0)
		expect(result.availablePercent).toBe(0)

		// The three sections never exceed 100% of the bar width
		expect(result.currentPercent + result.reservedPercent + result.availablePercent).toBe(100)
	})

	test("returns all-zero values when the context window is zero", () => {
		const contextWindow = 0
		const contextTokens = 1000

		const result = calculateTokenDistribution(contextWindow, contextTokens)

		// No meaningful window means no meaningful bar: every value is zero so the
		// UI renders an empty bar instead of a full/overflowing one.
		expect(result).toEqual({
			currentPercent: 0,
			reservedPercent: 0,
			availablePercent: 0,
			reservedForOutput: 0,
			availableSize: 0,
		})
	})

	test("returns all-zero values for a non-finite context window", () => {
		const result = calculateTokenDistribution(Number.NaN, 1000)

		expect(result).toEqual({
			currentPercent: 0,
			reservedPercent: 0,
			availablePercent: 0,
			reservedForOutput: 0,
			availableSize: 0,
		})
	})
})
