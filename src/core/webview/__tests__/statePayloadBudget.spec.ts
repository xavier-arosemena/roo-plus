// npx vitest run core/webview/__tests__/statePayloadBudget.spec.ts

import type { ClineMessage, HistoryItem, ModeConfig } from "@roo-code/types"
import { parseExtensionMessage } from "@roo-code/types"

import { STATE_WARN_BYTES } from "../webviewPayloadMetrics"
import { projectClineMessagesForWebview } from "../clineMessagesForWebview"
import { boundCustomModesForWebview } from "../../config/CustomModesManager"
import { projectTaskHistoryForWebview, selectOlderTaskHistory } from "../../services/TaskHistoryService"

/**
 * ANTI-WHACK-A-MOLE REGRESSION — the composite `state` payload budget.
 *
 * Three separate incidents shipped the SAME defect class one array field at a
 * time, each fixed by bounding that one field:
 *
 * - 3.88.1 `taskHistory` (count-only; ≈3.5 MB store)
 * - 3.88.2 `customModes` (~762 KB catalog on every push)
 * - 3.88.3 `clineMessages` (~962 KB transcript on every push)
 *
 * Each fix was verified in isolation, which is exactly why the next field got
 * missed: the fields ride the SAME `state` message, so their budgets COMPOSE.
 * This test asserts the composition, not the parts: with every known-bloat field
 * populated at the maximum its shipping projection allows, one serialized
 * `state` message must stay under `STATE_WARN_BYTES` (256 KB).
 *
 * It is deliberately the only place that measures the whole message; the field
 * projections keep their own focused tests.
 */

const KB = 1024

/** A realistic full `HistoryItem` (~1 KB of envelope) with a sized `task`. */
function makeHistoryItem(index: number, ts: number, taskBytes: number): HistoryItem {
	return {
		id: `task-${index}`,
		number: index,
		ts,
		task: `Task ${index}: ${"t".repeat(taskBytes)}`,
		tokensIn: 123_456,
		tokensOut: 78_901,
		cacheWrites: 2_345,
		cacheReads: 6_789,
		totalCost: 1.2345,
		size: 987_654,
		workspace: "/home/dev/workspaces/very-long-project-name-for-a-realistic-row-envelope",
		mode: "code",
		apiConfigName: "work-profile",
		status: "completed",
		childIds: [`child-${index}-a`, `child-${index}-b`],
		awaitingChildId: undefined,
		completedByChildId: `child-${index}-b`,
		completionResultSummary: `Summary for task ${index}`,
	}
}

/** A realistic transcript row (~600 B of `text`). */
function makeClineMessage(index: number, ts: number, textBytes: number): ClineMessage {
	return {
		ts,
		type: "say",
		say: "text",
		text: `Message ${index}: ${"m".repeat(textBytes)}`,
		partial: false,
	}
}

/**
 * A realistic custom mode: bulky `customInstructions` (stripped by the bounded
 * projection) with metadata sized like the shipped catalog (~700 B retained per
 * mode, the documented ~66 KB for 90 modes).
 */
function makeMode(index: number): ModeConfig {
	return {
		slug: `mode-${index}`,
		name: `Specialist Mode ${index}`,
		roleDefinition: `You are a specialist engineer for domain ${index}. ${"r".repeat(220)}`,
		whenToUse: `${"w".repeat(200)}`,
		description: `${"d".repeat(200)}`,
		customInstructions: "c".repeat(8 * KB),
		groups: [],
		source: "global",
	}
}

/**
 * Worst-case raw inputs, sized from the incidents' field evidence: a ~900 KB
 * transcript, a ~1.2 MB task store (~10 KB/row, the row size that made the
 * 100-row count-only cap ship 1067 KB) and a ~762 KB mode catalog. If any
 * projection regresses to shipping its raw array, the composite assertion
 * below fails.
 */
const RAW_TRANSCRIPT = Array.from({ length: 1_500 }, (_, i) => makeClineMessage(i, i + 1, 600))
const RAW_HISTORY = Array.from({ length: 120 }, (_, i) => makeHistoryItem(i, 1_000_000 - i, 10 * KB))
const RAW_MODES = Array.from({ length: 90 }, (_, i) => makeMode(i))

function jsonBytes(value: unknown): number {
	return Buffer.byteLength(JSON.stringify(value) ?? "", "utf8")
}

describe("worst-case `state` payload budget", () => {
	const boundedClineMessages = projectClineMessagesForWebview(RAW_TRANSCRIPT)
	const boundedTaskHistory = projectTaskHistoryForWebview(RAW_HISTORY)
	const boundedCustomModes = boundCustomModesForWebview(RAW_MODES, "code", undefined)
	const messageQueue = Array.from({ length: 5 }, (_, i) => ({
		id: `queued-${i}`,
		timestamp: 1_700_000_000_000 + i,
		text: `Queued user message ${i}: ${"q".repeat(1_000)}`,
	}))
	const olderTaskHistoryPage = selectOlderTaskHistory(RAW_HISTORY, 999_950).items

	const stateMessage = {
		type: "state" as const,
		state: {
			version: "3.88.7",
			clineMessages: boundedClineMessages.messages,
			clineMessagesBounded: boundedClineMessages.bounded,
			clineMessagesTotal: boundedClineMessages.total,
			taskHistory: boundedTaskHistory.items,
			taskHistoryBounded: boundedTaskHistory.bounded,
			taskHistoryTotal: boundedTaskHistory.total,
			customModes: boundedCustomModes,
			messageQueue,
			marketplaceItems: undefined,
			apiConfiguration: { apiProvider: "anthropic", apiModelId: "claude-sonnet-4-20250514" },
			shouldShowAnnouncement: false,
			soundEnabled: false,
		},
	}

	it("keeps the whole serialized `state` message under STATE_WARN_BYTES", () => {
		const bytes = jsonBytes(stateMessage)

		// Sanity: the test is only meaningful if the RAW fields are genuinely
		// over budget — this is the incident shape, not a toy payload.
		expect(jsonBytes(RAW_TRANSCRIPT)).toBeGreaterThan(STATE_WARN_BYTES)
		expect(jsonBytes(RAW_HISTORY)).toBeGreaterThan(STATE_WARN_BYTES)
		expect(jsonBytes(RAW_MODES)).toBeGreaterThan(STATE_WARN_BYTES)

		expect(bytes).toBeLessThan(STATE_WARN_BYTES)
		// Headroom matters: squeaking under the threshold is how the previous
		// three incidents hid. Require a real margin for the rest of `state`
		// (settings, mcpServers, …) and for whatever gets added next.
		expect(STATE_WARN_BYTES - bytes).toBeGreaterThan(16 * KB)
	})

	it("keeps every bounded field individually under the composite threshold", () => {
		// Localizes a failure: whichever field regressed is named by its own
		// assertion instead of only failing the composite total.
		expect(jsonBytes(boundedClineMessages.messages)).toBeLessThanOrEqual(128 * KB)
		expect(jsonBytes(boundedTaskHistory.items)).toBeLessThan(40 * KB)
		expect(jsonBytes(boundedCustomModes)).toBeLessThan(80 * KB)
		expect(jsonBytes(olderTaskHistoryPage)).toBeLessThan(STATE_WARN_BYTES)
	})

	it("reports the bounded window markers through the typed message boundary", () => {
		// The webview's merge/load-older behaviour depends on these markers
		// surviving `parseExtensionMessage`; `.passthrough()` + the explicit
		// schema entries must not drop them.
		const parsed = parseExtensionMessage(stateMessage)

		expect(parsed.ok).toBe(true)
		if (!parsed.ok) {
			return
		}

		expect(parsed.message.type).toBe("state")
		const state = parsed.message.state as Record<string, unknown>
		expect(state.taskHistoryBounded).toBe(boundedTaskHistory.bounded)
		expect(state.taskHistoryTotal).toBe(boundedTaskHistory.total)
	})
})
