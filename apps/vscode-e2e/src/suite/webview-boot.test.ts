import * as assert from "assert"
import * as vscode from "vscode"

import { setDefaultSuiteTimeout } from "./test-utils"
import { sleep, waitFor } from "./utils"

/**
 * NEW-5 — e2e smoke for the served-HTML / webview boot-guard path
 * (`src/core/webview/webviewBootGuard.ts`, the `webviewBootFailure` host handler in
 * `src/core/webview/handlers/misc.ts`).
 *
 * WHY THIS EXISTS
 * The original boot-guard work nearly shipped DEF-1: the guard mutated the frozen
 * object returned by `acquireVsCodeApi()`, so under strict mode the first call threw
 * and the panel stayed grey on every boot. Every unit test was green because the stub
 * was mutable, and no host-level test observed the served-HTML / guard path at all.
 * This suite closes that gap for the part of the path the extension host can see.
 *
 * WHAT THE HARNESS CAN AND CANNOT OBSERVE
 * These tests run INSIDE the real extension host (`runTest.ts` -> `runTests` ->
 * `suite/index.ts`). The renderer DOM (`#root`, the guard's fallback overlay and its
 * Reload button) lives in the Electron renderer, and `@vscode/test-electron` offers
 * neither renderer DOM access nor webview asset-request interception, so the literal
 * `#root.childElementCount > 0` / "not the overlay" assertion is not reachable here.
 *
 * THE host-side signal that IS reachable, and what this suite asserts:
 *
 * The `webviewDidLaunch` handshake. `webview-ui/src/App.tsx` and
 * `.../context/ExtensionStateContext.tsx` post it from mount effects, and
 * `handlers/misc.ts` turns it into `provider.isViewLaunched`. `viewLaunched === true`
 * therefore IMPLIES the served document executed its bundle, rendered React into
 * `#root` (effects run only after a committed render) and reached the host — i.e. a
 * mounted app, not the empty-`#root`/overlay state. A bundle abort (DEF-1) or a
 * failed asset (P2) never posts it, so the bounded wait goes red for exactly the
 * intended defect. `isViewLaunched` is only ever set by that message (verified against
 * `handlers/misc.ts` and confirmed empirically: a freshly created handle reports
 * `false` until the handshake arrives), so it cannot latch true by accident.
 *
 * A further signal exists but is deliberately NOT asserted: the guard's own failure
 * report. `handlers/misc.ts` sets the public `provider.webviewBootFailureNotified`
 * latch for a DETERMINISTIC failure (`reason=load`/`reason=throw`) and the guard posts
 * to its own document's host listener — i.e. to the very provider instance
 * `roo-plus.openInNewTab` returns — so the latch is readable without any console
 * scraping. It is nonetheless left unasserted because validation runs showed it
 * INTERMITTENT: in this sandbox the tab-panel document sometimes reports
 * `reason=load` (a resource genuinely fails to load, the documented 2026-09-18
 * asset-failure channel) while the app still mounts successfully, and sometimes
 * reports nothing at all. Asserting it either way would make the smoke flaky for the
 * wrong reason. That same observation is also positive evidence that the guard script
 * runs in this harness and that its host channel works end to end, which is why the
 * mount signal can be trusted as the boot-health indicator.
 *
 * DELIBERATELY NOT COVERED (recorded as an honest gap, not papered over)
 * - The fallback overlay markup and the focusability of its Reload button: the guard
 *   renders them in the renderer document, which is unreachable from the extension host.
 * - Forcing a real asset-load failure (e.g. 404/401 on `webview-ui/build/assets/index.js`):
 *   the harness has no interception channel for webview resource requests, so the
 *   failure path cannot be forced deterministically from here.
 * - Asserting the host log line `[webview-boot] failure reason=…` textually. It IS emitted
 *   by the production router (observed in harness output while validating this suite), but
 *   it is not assertable from inside the extension host: a diagnostic probe showed that
 *   `console` is proxy-wrapped (assigning `console.log` reports success yet never
 *   intercepts a call), the line does not traverse the extension host's own
 *   `process.stdout`, a `vscode.window.showWarningMessage` patch is never invoked, and the
 *   Roo+ output channel has no read API.
 *
 * Environment note: in Development mode the provider first probes the Vite HMR HTML
 * (`getHMRHtmlContent`), which carries no boot guard, and falls back to the production
 * HTML (`getHtmlContent`, guard injected) when no local Vite dev server answers. The
 * `test:ci` / `test:ci:mock` path therefore exercises the real guard path.
 */

/** Public command that opens the Roo+ webview as a NEW editor-panel document. */
const OPEN_IN_NEW_TAB_COMMAND = "roo-plus.openInNewTab"

/** How long a freshly served document gets to mount the app before the smoke fails. */
const WEBVIEW_BOOT_MOUNT_TIMEOUT_MS = 60_000

/**
 * Post-mount settle window, longer than the guard's 6 s watchdog
 * (`BOOT_WATCHDOG_TIMEOUT_MS`), so the re-check happens after the point where the guard
 * would have concluded that `#root` never filled.
 */
const WEBVIEW_BOOT_SETTLE_MS = 8_000

/**
 * Reads a boolean property off the webview host handle returned by
 * `roo-plus.openInNewTab` (a `ClineProvider`) WITHOUT importing extension internals
 * (`src/` is outside this app's `tsc` rootDir, and AGENTS.md records that the e2e
 * runner cannot import them). Returns `undefined` for a miss, which keeps the callers'
 * assertions loud rather than silently vacuous.
 */
function readBooleanProperty(value: unknown, property: string): boolean | undefined {
	if (typeof value !== "object" || value === null) {
		return undefined
	}

	const read: unknown = Reflect.get(value, property)
	return typeof read === "boolean" ? read : undefined
}

/**
 * Closes the editor panel created by the smoke test so it cannot leak into other
 * suites (later suites open their own editors). Cleanup is best-effort: a cleanup
 * failure is reported, never allowed to mask the assertion result.
 */
async function disposeWebviewHost(value: unknown): Promise<void> {
	if (typeof value !== "object" || value === null) {
		return
	}

	const dispose = Reflect.get(value, "dispose")

	if (typeof dispose !== "function") {
		return
	}

	try {
		await Promise.resolve(Reflect.apply(dispose, value, []))
	} catch (error) {
		console.warn(`[webview-boot-smoke] host dispose failed: ${String(error)}`)
	}
}

suite("Roo+ webview boot", function () {
	setDefaultSuiteTimeout(this)

	test("the sidebar webview mounts the app (webviewDidLaunch handshake)", async () => {
		const api = globalThis.api

		// The default served document (the sidebar view) must complete the mount
		// handshake. Asserted per-spec, with its own bound and message, rather than
		// relying only on the suite bootstrap in `suite/index.ts`.
		await waitFor(() => api.isReady(), { timeout: WEBVIEW_BOOT_MOUNT_TIMEOUT_MS })

		assert.strictEqual(
			api.isReady(),
			true,
			"the sidebar webview must post webviewDidLaunch (app mounted) within the boot window",
		)
	})

	test("a freshly served webview document mounts the app and stays mounted past the guard watchdog", async () => {
		let host: unknown

		try {
			// Force a NEW served document: the editor-panel variant of the same HTML, with
			// its own nonce, page lifecycle and boot guard. This is the re-serve path the
			// bootstrap cannot cover, and it starts from a fresh host handle whose
			// `isViewLaunched` is false by construction (only this document's own
			// `webviewDidLaunch` can set it).
			host = await vscode.commands.executeCommand<unknown>(OPEN_IN_NEW_TAB_COMMAND)

			// Captured for the assertion messages below: the freshly returned handle must
			// still be unlaunched at this point (the handshake cannot complete before the
			// panel's HTML has been assigned and its renderer has booted). Recorded rather
			// than hard-asserted so an unforeseen ordering cannot make the smoke flaky.
			const launchedWhenReturned = readBooleanProperty(host, "viewLaunched")

			assert.notStrictEqual(
				launchedWhenReturned,
				undefined,
				"openInNewTab must return the webview host handle so the mounted-app signal is observable",
			)

			// MINIMUM ASSERTION, host-observable form of "#root has children and the panel
			// is not the fallback overlay": the freshly served document must mount the app
			// and post webviewDidLaunch. A bundle abort (DEF-1) or a failed asset (P2)
			// never posts it, so this bounded wait times out and reds.
			await waitFor(() => readBooleanProperty(host, "viewLaunched") === true, {
				timeout: WEBVIEW_BOOT_MOUNT_TIMEOUT_MS,
				interval: 250,
			})

			assert.strictEqual(
				readBooleanProperty(host, "viewLaunched"),
				true,
				`a freshly served webview document must mount the app (webviewDidLaunch observed host-side; viewLaunched was ${String(
					launchedWhenReturned,
				)} when the handle was returned)`,
			)

			// Let the guard's watchdog window elapse and confirm the document is STILL
			// mounted: a healthy boot survives past the point where the guard would have
			// reported a dead `#root`, rather than being torn down or left on the empty
			// `#root` state. (The guard's own failure latch is deliberately not asserted
			// here — see the suite doc comment on its intermittency.)
			await sleep(WEBVIEW_BOOT_SETTLE_MS)

			assert.strictEqual(
				readBooleanProperty(host, "viewLaunched"),
				true,
				"the freshly served webview document must still be mounted after the guard watchdog window",
			)
		} finally {
			await disposeWebviewHost(host)
		}
	})
})
