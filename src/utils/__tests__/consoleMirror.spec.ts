// npx vitest run src/utils/__tests__/consoleMirror.spec.ts

import {
	CONSOLE_MIRROR_DEBUG_ENV,
	CONSOLE_MIRROR_PREFIXES,
	isConsoleMirrorDebugEnabled,
	shouldMirrorToConsole,
} from "../consoleMirror"

describe("consoleMirror", () => {
	it("gate: ROO_DEBUG_CONSOLE accepts 1/true (case-insensitive) and nothing else", () => {
		expect(isConsoleMirrorDebugEnabled({ [CONSOLE_MIRROR_DEBUG_ENV]: "1" })).toBe(true)
		expect(isConsoleMirrorDebugEnabled({ [CONSOLE_MIRROR_DEBUG_ENV]: "TRUE" })).toBe(true)
		expect(isConsoleMirrorDebugEnabled({ [CONSOLE_MIRROR_DEBUG_ENV]: "0" })).toBe(false)
		expect(isConsoleMirrorDebugEnabled({})).toBe(false)
	})

	it("mirrors everything when the debug gate is on", () => {
		expect(shouldMirrorToConsole("anything at all", { [CONSOLE_MIRROR_DEBUG_ENV]: "1" })).toBe(true)
	})

	it("by default mirrors only the runbook SLI prefixes", () => {
		expect(shouldMirrorToConsole("[webview-metrics] state_msgs=2", {})).toBe(true)
		expect(shouldMirrorToConsole("[host-health] elu_ms p50=10", {})).toBe(true)
		expect(shouldMirrorToConsole("[webview-liveness] pong", {})).toBe(true)
		expect(shouldMirrorToConsole("[webview-boot] failure reason=load", {})).toBe(true)
		expect(shouldMirrorToConsole("   [webview-metrics] indented", {})).toBe(true)
	})

	it("by default silences unrelated verbose logs", () => {
		expect(shouldMirrorToConsole("[Task#getCheckpointService] initializing", {})).toBe(false)
		expect(shouldMirrorToConsole("Loaded translations for languages: en", {})).toBe(false)
		expect(shouldMirrorToConsole("[SembleProvider] Semble found and ready.", {})).toBe(false)
	})

	it("keeps exactly the four runbook prefixes in the allowlist", () => {
		expect(CONSOLE_MIRROR_PREFIXES).toEqual([
			"[webview-metrics]",
			"[host-health]",
			"[webview-liveness]",
			"[webview-boot]",
		])
	})
})
