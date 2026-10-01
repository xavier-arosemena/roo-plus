// npx vitest run core/webview/__tests__/webviewBootGuard.spec.ts

import {
	BOOT_FALLBACK_CLEAR_MAX_MS,
	BOOT_FALLBACK_CLEAR_POLL_MS,
	BOOT_WATCHDOG_TIMEOUT_MS,
	WEBVIEW_BOOT_DISARM_MESSAGE_TYPE,
	WEBVIEW_BOOT_FAILURE_MESSAGE_TYPE,
	buildWebviewBootGuardScript,
	buildWebviewBootGuardScriptBody,
} from "../webviewBootGuard"

describe("buildWebviewBootGuardScript", () => {
	it("wraps the guard body in a nonce'd classic inline script", () => {
		const html = buildWebviewBootGuardScript("test-nonce")

		expect(html).toContain('<script nonce="test-nonce">')
		expect(html).toContain("</script>")
		// Classic inline script: no module syntax (the CSP only permits the
		// per-response nonce; the guard must not need 'unsafe-inline').
		expect(html).not.toContain('type="module"')
		expect(html).not.toContain("import ")
		expect(html).not.toContain("export ")
	})

	it("embeds the bounded watchdog constant and the #root emptiness check", () => {
		const body = buildWebviewBootGuardScriptBody()

		// The watchdog window must be a bounded ~4-8s delay.
		expect(BOOT_WATCHDOG_TIMEOUT_MS).toBeGreaterThanOrEqual(4000)
		expect(BOOT_WATCHDOG_TIMEOUT_MS).toBeLessThanOrEqual(8000)
		expect(body).toContain(`var WATCHDOG_TIMEOUT_MS = ${BOOT_WATCHDOG_TIMEOUT_MS};`)
		expect(body).toContain("childElementCount === 0")
		expect(body).toContain("setTimeout")
		expect(body).toContain("clearTimeout")
	})

	it("contains the self-contained fallback markup and a keyboard-focusable Reload button", () => {
		const body = buildWebviewBootGuardScriptBody()

		expect(body).toContain("The Roo+ view failed to load")
		expect(body).toContain("<button")
		expect(body).toContain('aria-label="Reload the Roo+ view"')
		expect(body).toContain("window.location.reload()")
		// Inline CSS is the deliberate styling exception for this dead-bundle
		// path (Tailwind lives in the bundle that failed).
		expect(body).toContain("style=")
	})

	it("posts exactly one typed boot-failure message and reuses webviewDidLaunch to disarm", () => {
		const body = buildWebviewBootGuardScriptBody()

		expect(body).toContain(`FAILURE_MESSAGE_TYPE = "${WEBVIEW_BOOT_FAILURE_MESSAGE_TYPE}"`)
		expect(body).toContain(`DISARM_MESSAGE_TYPE = "${WEBVIEW_BOOT_DISARM_MESSAGE_TYPE}"`)
		// Exactly-once posting is enforced by the `postedFailure` latch.
		expect(body).toContain("if (postedFailure) {")
		// The three detector reasons from the protocol.
		expect(body).toContain('handleFailure("watchdog")')
		expect(body).toContain('reason = "load"')
		expect(body).toContain('handleFailure("throw")')
	})

	it("installs the secondary detectors and guards acquireVsCodeApi", () => {
		const body = buildWebviewBootGuardScriptBody()

		expect(body).toContain('window.addEventListener("error", onWindowError, true)')
		expect(body).toContain('window.addEventListener("unhandledrejection", onUnhandledRejection)')
		expect(body).toContain("window.acquireVsCodeApi")
	})

	it("never mutates the object returned by the real acquireVsCodeApi (DEF-1)", () => {
		const body = buildWebviewBootGuardScriptBody()

		// VS Code returns a FROZEN handle and the guard IIFE is strict-mode, so
		// any assignment to a member of that object throws a TypeError and aborts
		// the bundle before React mounts. The guard must never do this.
		// `[^=]` keeps this from matching the read-only comparisons the guard
		// legitimately makes (e.g. `typeof api.postMessage === "function"`).
		expect(body).not.toMatch(/\.postMessage\s*=[^=]/)
		expect(body).not.toMatch(/\.getState\s*=[^=]/)
		expect(body).not.toMatch(/\.setState\s*=[^=]/)

		// Instead it returns a fresh delegating wrapper that forwards to the real
		// (frozen) handle with correct `this`/arguments and return values.
		expect(body).toContain("real.postMessage.apply(real, arguments)")
		expect(body).toContain("real.getState.apply(real, arguments)")
		expect(body).toContain("real.setState.apply(real, arguments)")
	})

	it("clears a previously-painted fallback when the boot disarms (DEF-4)", () => {
		const body = buildWebviewBootGuardScriptBody()

		expect(body).toContain("function clearFallback()")
		expect(body).toContain("document.getElementById(FALLBACK_ID)")
		expect(body).toContain("removeChild(existing)")
		expect(body).toContain("function onBootDisarm()")
	})

	it("clears a stale fallback from the bounded #root poll, independent of the disarm message (NEW-1)", () => {
		const body = buildWebviewBootGuardScriptBody()

		expect(body).toContain(`var FALLBACK_CLEAR_POLL_MS = ${BOOT_FALLBACK_CLEAR_POLL_MS};`)
		expect(body).toContain(`var FALLBACK_CLEAR_MAX_MS = ${BOOT_FALLBACK_CLEAR_MAX_MS};`)
		expect(body).toContain("function watchRootForLateMount()")
		expect(body).toContain("function stopFallbackPoll()")
		expect(body).toContain("setInterval")
		expect(body).toContain("clearInterval")
		// The independent observation runs in its OWN bootstrap step, BEFORE the
		// (possibly failing) wrapper install, so a non-writable handle cannot skip it.
		expect(body.indexOf("watchRootForLateMount();")).toBeLessThan(body.indexOf("installApiWrapper();"))
		// Bounded: the poll can never outlive the 60 s maximum.
		expect(BOOT_FALLBACK_CLEAR_MAX_MS).toBeLessThanOrEqual(60_000)
	})

	it("arms the watchdog independently of the API-wrapper install and reports step failures (F-4)", () => {
		const body = buildWebviewBootGuardScriptBody()

		// The watchdog is armed BEFORE the wrapper install, and in its own step, so
		// a failure to install the wrapper can never leave the guard inert.
		const armIndex = body.indexOf("armWatchdog();")
		const wrapperIndex = body.indexOf("installApiWrapper();")
		expect(armIndex).toBeGreaterThan(-1)
		expect(wrapperIndex).toBeGreaterThan(armIndex)

		// Every install-step failure leaves a LOCAL static diagnostic line.
		expect(body).toContain("function logGuardDiagnostic(stage)")
		expect(body).toContain('"[webview-boot-guard] install step failed: " + stage')
	})

	it("does not reference external assets", () => {
		const body = buildWebviewBootGuardScriptBody()

		expect(body).not.toContain("http://")
		expect(body).not.toContain("https://")
		expect(body).not.toContain("Content-Security-Policy")
	})
})
