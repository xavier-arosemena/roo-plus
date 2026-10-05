/**
 * Boot guard for the served webview HTML.
 *
 * The React bundle in `webview-ui/build/assets/index.js` is a single deferred
 * module. If it fails to load (missing/corrupt assets, a theme-broken resource
 * route, an extension-host restart between HTML delivery and asset fetch) the
 * document stays at the bare `<div id="root"></div>` — a pale-grey, permanently
 * dead panel with no user-facing recovery affordance.
 *
 * This module produces a nonce'd inline classic script that:
 *  - paints a self-contained fallback UI using inline CSS/HTML strings, so it
 *    still works when EVERY `/assets/*` request fails (STYLING EXCEPTION: the
 *    fallback may use inline CSS because Tailwind lives in the bundle that just
 *    failed; Tailwind is only required for the React markup, not this guard);
 *  - primarily detects failure with a bounded watchdog timeout that checks
 *    `#root` for children (error events alone are insufficient);
 *  - secondarily observes `window` `error` (capture) and `unhandledrejection`;
 *    ISSUE #416: only a failed `<script>` element is fatal — benign resource
 *    errors (modulepreload hints, stylesheets, images, fonts) are ignored so
 *    the guard cannot false-positive over a healthy boot;
 *  - posts exactly one `webviewBootFailure` message to the host. On the normal
 *    path it posts ONLY via a handle obtained through its own memoizing
 *    `acquireVsCodeApi` wrapper (never by acquiring the raw single-use handle
 *    ahead of the app). H1 residual: if the wrapper cannot be installed at all,
 *    ONLY a `<script>`/entry-module LOAD error (`reason === "load"` — the module
 *    provably never ran) falls back to a last-resort raw acquire. A `watchdog`
 *    trip may be a slow-but-healthy mount, so it must NEVER steal the app's
 *    single-use handle: in that abnormal environment a watchdog stays silent to
 *    the host by design (the in-panel fallback + the bounded `#root` poll remain
 *    the user-facing signals) — see `postBootFailure` for the documented trade-off;
 *  - is disarmed when the app posts its existing `webviewDidLaunch` success
 *    signal (T1.4 — reused rather than inventing a second "boot OK" type), and
 *    removes any fallback it painted during a slow-but-healthy boot;
 *  - ALSO observes `#root` directly with a bounded short-interval poll (NEW-1),
 *    so a late mount clears a stale fallback even when the `acquireVsCodeApi`
 *    wrapper could not be installed (a non-writable handle) and the
 *    `webviewDidLaunch` disarm therefore never arrives;
 *  - NEVER mutates the FROZEN object returned by the real `acquireVsCodeApi()`
 *    (DEF-1): it memoizes the global so the guard and the app share ONE session
 *    handle, but returns a fresh delegating wrapper instead of writing to the
 *    frozen handle (which throws under strict mode and aborts the bundle).
 *
 * The script is factored into a pure helper so it can be unit-tested without a
 * browser (`buildWebviewBootGuardScriptBody`) and injected verbatim by
 * `ClineProvider#getHtmlContent` (`buildWebviewBootGuardScript`).
 */

/**
 * Watchdog delay (ms) before the boot guard checks whether React has mounted
 * into `#root`. Kept as a named constant so the unit tests assert the same
 * value the injected script embeds.
 */
export const BOOT_WATCHDOG_TIMEOUT_MS = 6000

/**
 * Interval (ms) of the independent `#root`-mount poll that clears a stale
 * fallback (NEW-1). Short enough to feel instantaneous after a late mount,
 * long enough not to spin.
 */
export const BOOT_FALLBACK_CLEAR_POLL_MS = 250

/**
 * Upper bound (ms) on the independent `#root`-mount poll (NEW-1). The poll
 * always stops once it clears a fallback OR after this window, so it can never
 * leak a timer for the life of the document.
 */
export const BOOT_FALLBACK_CLEAR_MAX_MS = 60_000

/** Inbound message type posted when the webview fails to boot. */
export const WEBVIEW_BOOT_FAILURE_MESSAGE_TYPE = "webviewBootFailure"

/** Existing inbound success signal that disarms the watchdog (T1.4). */
export const WEBVIEW_BOOT_DISARM_MESSAGE_TYPE = "webviewDidLaunch"

/**
 * Pure JavaScript body of the boot guard (no imports, no ES module syntax).
 *
 * Intentionally written in ES5-compatible style (`var`, `function`) so it can
 * execute as a classic inline script regardless of the module bundle that may
 * have failed to load.
 */
export function buildWebviewBootGuardScriptBody(): string {
	const watchdogTimeoutMs = BOOT_WATCHDOG_TIMEOUT_MS
	const fallbackClearPollMs = BOOT_FALLBACK_CLEAR_POLL_MS
	const fallbackClearMaxMs = BOOT_FALLBACK_CLEAR_MAX_MS
	const failureType = WEBVIEW_BOOT_FAILURE_MESSAGE_TYPE
	const disarmType = WEBVIEW_BOOT_DISARM_MESSAGE_TYPE

	// NOTE: this string is injected verbatim into the webview HTML. It must not
	// contain template literals or backticks (it is itself a TS template
	// literal) and must never interpolate untrusted data.
	return `(function () {
	"use strict";

	var WATCHDOG_TIMEOUT_MS = ${watchdogTimeoutMs};
	var FALLBACK_CLEAR_POLL_MS = ${fallbackClearPollMs};
	var FALLBACK_CLEAR_MAX_MS = ${fallbackClearMaxMs};
	var FAILURE_MESSAGE_TYPE = "${failureType}";
	var DISARM_MESSAGE_TYPE = "${disarmType}";
	var FALLBACK_ID = "roo-webview-boot-fallback";
	var RELOAD_BUTTON_ID = "roo-webview-boot-reload";

	var armed = false;
	var failed = false;
	var postedFailure = false;
	var watchdogTimer = null;
	var fallbackPollTimer = null;
	var fallbackPollDeadlineTimer = null;
	// FIX-2: only true once the delegating wrapper is actually installed. The
	// guard may ONLY post through a handle it obtained via that wrapper; if the
	// wrapper install failed it must NOT acquire the raw handle ahead of the app
	// (see postBootFailure), because acquireVsCodeApi is single-use per document.
	var apiWrapperInstalled = false;

	function rootIsEmpty() {
		try {
			var root = document.getElementById("root");
			return !root || root.childElementCount === 0;
		} catch (error) {
			return true;
		}
	}

	function clearWatchdog() {
		armed = false;
		if (watchdogTimer !== null) {
			clearTimeout(watchdogTimer);
			watchdogTimer = null;
		}
	}

	// Removes a fallback this guard painted earlier. A slow-but-healthy boot can
	// momentarily trip the watchdog; when the app finally mounts we must not
	// leave a permanent "failed to load" block over a working UI (DEF-4).
	function clearFallback() {
		try {
			var existing = document.getElementById(FALLBACK_ID);
			if (existing && existing.parentNode) {
				existing.parentNode.removeChild(existing);
			}
		} catch (error) {
			// Never throw from the guard itself.
		}
	}

	// NEW-1: stops the independent #root-mount poll. Called as soon as the
	// fallback is cleared (late mount observed) or when the bounded window
	// elapses, and on the normal webviewDidLaunch disarm. Idempotent: every
	// handle is nulled, so it can never leak a timer and safe to call twice.
	function stopFallbackPoll() {
		if (fallbackPollTimer !== null) {
			clearInterval(fallbackPollTimer);
			fallbackPollTimer = null;
		}
		if (fallbackPollDeadlineTimer !== null) {
			clearTimeout(fallbackPollDeadlineTimer);
			fallbackPollDeadlineTimer = null;
		}
	}

	// NEW-1: has React mounted into #root? Mutates nothing.
	function rootHasMounted() {
		try {
			var root = document.getElementById("root");
			return !!(root && root.childElementCount > 0);
		} catch (error) {
			return false;
		}
	}

	// NEW-1: watches #root DIRECTLY, independent of the acquireVsCodeApi
	// wrapper (which may fail to install when the handle is non-writable, so the
	// webviewDidLaunch disarm is never observed). On a late mount it stops the
	// watchdog and removes any stale fallback; the poll stops as soon as that
	// happens OR after FALLBACK_CLEAR_MAX_MS, whichever comes first, so it can
	// never leak a timer for the life of the document.
	function watchRootForLateMount() {
		if (fallbackPollTimer !== null || fallbackPollDeadlineTimer !== null) {
			return;
		}
		fallbackPollTimer = setInterval(function () {
			if (rootHasMounted()) {
				clearWatchdog();
				clearFallback();
				stopFallbackPoll();
			}
		}, FALLBACK_CLEAR_POLL_MS);
		fallbackPollDeadlineTimer = setTimeout(function () {
			stopFallbackPoll();
		}, FALLBACK_CLEAR_MAX_MS);
	}

	// The app mounted successfully (it posted the existing webviewDidLaunch
	// signal): stop the watchdog and clear any stale fallback node.
	//
	// F-5: the app emits webviewDidLaunch from TWO places (App.tsx and the
	// ExtensionStateContext provider), so this runs twice on a normal boot. It is
	// deliberately IDEMPOTENT — clearWatchdog only cancels a live timer and
	// clearFallback only removes an existing node — so no dedupe is needed.
	function onBootDisarm() {
		clearWatchdog();
		clearFallback();
		stopFallbackPoll();
	}

	// H1 residual (issue #416 follow-up): is "reason" a failure that proves the
	// entry module NEVER RAN, so consuming the app's single-use handle is safe?
	// ONLY "load" qualifies: the entry <script>/module failed to FETCH, so the
	// module never executed and the app can never need its own acquireVsCodeApi()
	// handle.
	//
	// "watchdog" is DELIBERATELY EXCLUDED: an empty #root after WATCHDOG_TIMEOUT_MS
	// may still be a slow-but-healthy mount. Because the real handle is single-use,
	// a raw acquire here would make the app's own acquireVsCodeApi() throw when it
	// finally initializes -> a DEF-1-class dead panel. We prefer NOT stealing the
	// handle over reporting a possible false positive.
	//
	// "throw" is EXCLUDED for the same reason: an unhandled rejection or a one-off
	// script exception can still be followed by a successful mount.
	function isTerminalFailure(reason) {
		return reason === "load";
	}

	// Post a boot-failure message through a handle (the memoizing wrapper on the
	// normal path, or the last-resort raw acquire below).
	function postBootFailureMessage(api, reason) {
		if (api && typeof api.postMessage === "function") {
			api.postMessage({ type: FAILURE_MESSAGE_TYPE, reason: reason });
		}
	}

	// FIX-2: post the failure ONLY through a handle obtained via the guard's own
	// delegating wrapper. acquireVsCodeApi is single-use per document; on the
	// normal path we must NOT call window.acquireVsCodeApi() raw, because doing so
	// would consume the app's one handle and make the app's own
	// acquireVsCodeApi() throw.
	//
	// H1 residual: but when the wrapper install ALSO failed (a non-writable AND
	// non-configurable handle, so installApiWrapper could neither assign nor
	// Object.defineProperty it) a genuinely dead panel was COMPLETELY silent to
	// the host — only the in-panel fallback remained. ONLY a "load" failure (the
	// entry <script>/module never executed, so the app can never need its own
	// handle) accepts the documented trade-off of one last-resort raw acquire, so
	// the host still sees the typed boot-failure message.
	//
	// A "watchdog" failure is NOT terminal here: it may be a slow-but-healthy
	// mount, so stealing the single-use handle could break a boot that would
	// otherwise succeed. In this abnormal environment a watchdog therefore stays
	// SILENT to the host BY DESIGN -- the in-panel fallback and the bounded #root
	// poll remain the user-facing signals. This path is unreachable on the normal
	// path (apiWrapperInstalled is true) and for the recoverable "throw" reason,
	// so the no-handle-theft guarantee for every healthy boot is intact.
	function postBootFailure(reason) {
		if (postedFailure) {
			return;
		}
		postedFailure = true;
		try {
			if (typeof window.acquireVsCodeApi !== "function") {
				// No handle factory at all (abnormal environment): nothing can be
				// posted. The local fallback UI remains the only affordance.
				return;
			}
			if (apiWrapperInstalled) {
				// Normal path: the installed wrapper memoizes the handle, so the
				// app's later acquireVsCodeApi() call reuses this same object.
				postBootFailureMessage(window.acquireVsCodeApi(), reason);
				return;
			}
			// H1 residual: wrapper could not be installed. ONLY a "load" failure
			// (the entry module provably never ran) justifies consuming the raw
			// single-use handle; a "watchdog" may be a slow-but-healthy mount and
			// must never steal the app's handle, and "throw" may still recover.
			if (!isTerminalFailure(reason)) {
				return;
			}
			postBootFailureMessage(window.acquireVsCodeApi(), reason);
		} catch (error) {
			// Host channel unavailable; the local fallback UI still renders.
		}
	}

	function renderFallback() {
		try {
			if (document.getElementById(FALLBACK_ID)) {
				return;
			}
			var host = document.body || document.documentElement;
			if (!host) {
				return;
			}
			var wrapper = document.createElement("div");
			wrapper.id = FALLBACK_ID;
			wrapper.setAttribute("role", "alert");
			wrapper.innerHTML =
				'<div style="box-sizing:border-box;font-family:var(--vscode-font-family,sans-serif);color:var(--vscode-foreground,#cccccc);background:var(--vscode-editor-background,#1e1e1e);padding:24px;min-height:100vh;">' +
					'<h1 style="font-size:1.1em;font-weight:600;margin:0 0 8px;">The Roo+ view failed to load</h1>' +
					'<p style="margin:0 0 16px;opacity:0.8;">The interface did not start. This usually means a resource could not be loaded.</p>' +
					'<button id="' + RELOAD_BUTTON_ID + '" type="button" aria-label="Reload the Roo+ view" style="cursor:pointer;font:inherit;padding:6px 14px;border:1px solid var(--vscode-button-border,transparent);border-radius:4px;color:var(--vscode-button-foreground,#ffffff);background:var(--vscode-button-background,#0e639c);">Reload</button>' +
				"</div>";
			host.appendChild(wrapper);
			var reloadButton = document.getElementById(RELOAD_BUTTON_ID);
			if (reloadButton) {
				reloadButton.addEventListener("click", function () {
					window.location.reload();
				});
			}
		} catch (error) {
			// Never throw from the guard itself.
		}
	}

	function handleFailure(reason) {
		if (failed) {
			return;
		}
		failed = true;
		clearWatchdog();
		if (!rootIsEmpty()) {
			// The app is already rendering into #root; a late error must not
			// replace a working UI.
			return;
		}
		renderFallback();
		postBootFailure(reason);
	}

	function onWindowError(event) {
		var reason = "throw";
		try {
			var target = event && event.target;
			// FIX-1 (issue #416): only a failed script element — the entry module
			// or a dynamically imported chunk — is fatal. A resource "error" on
			// ANY other element (a modulepreload hint emitted by the preload
			// helper, a stylesheet, an image, a web font) is NON-FATAL: the app
			// can still mount, so treating it as a dead boot is a false positive.
			// These element errors must be ignored outright (no fallback, no
			// failure report, no failed latch). Script exceptions still surface
			// on window with a "message" and fall through as reason="throw".
			if (target && target !== window && target.tagName) {
				var tagName = String(target.tagName).toLowerCase();
				if (tagName !== "script") {
					return;
				}
				reason = "load";
			}
		} catch (error) {
			reason = "throw";
		}
		handleFailure(reason);
	}

	function onUnhandledRejection() {
		handleFailure("throw");
	}

	// Wrap acquireVsCodeApi so the guard can (a) reuse the app's single instance
	// and (b) disarm the watchdog when the app posts its own boot success signal
	// (DISARM_MESSAGE_TYPE = "webviewDidLaunch", already emitted at app mount).
	//
	// The object returned by the REAL acquireVsCodeApi() is FROZEN by VS Code and
	// this IIFE is strict-mode, so it must NEVER be mutated: assigning to it threw
	// "Cannot assign to read only property 'postMessage'" and aborted the entire
	// bundle before React mounted (DEF-1). Instead the memoized wrapper returns a
	// fresh plain delegating object; the observed postMessage lives on that
	// delegating object, not on the frozen handle.
	function installApiWrapper() {
		var original = window.acquireVsCodeApi;
		if (typeof original !== "function") {
			return;
		}
		var cached = null;
		var wrapper = function () {
			if (cached) {
				return cached;
			}
			var real = original.apply(this, arguments);
			cached = {
				postMessage: function (message, transfer) {
					try {
						if (message && message.type === DISARM_MESSAGE_TYPE) {
							onBootDisarm();
						}
					} catch (error) {
						// Disarming is best-effort.
					}
					return real.postMessage.apply(real, arguments);
				},
				getState: function () {
					return real.getState.apply(real, arguments);
				},
				setState: function (state) {
					return real.setState.apply(real, arguments);
				},
			};
			return cached;
		};
		// Preferred install: a plain assignment works when the property is
		// writable, and only then is apiWrapperInstalled set. The wrapper
		// MEMOIZES the handle, so the app's own acquireVsCodeApi() reuses the
		// same object — the single-use guarantee is preserved.
		try {
			window.acquireVsCodeApi = wrapper;
			apiWrapperInstalled = true;
			return;
		} catch (error) {
			// Non-writable property: fall through to the defineProperty path.
		}
		// H1: a NON-WRITABLE-but-CONFIGURABLE handle can still be wrapped
		// NON-DESTRUCTIVELY via Object.defineProperty. The replacement is the
		// SAME memoizing delegating wrapper, so the guard and the app still share
		// ONE real handle and the app's acquireVsCodeApi() keeps working. It is
		// only attempted after the plain assignment failed and only when the
		// property is configurable, so a truly frozen global is left untouched
		// (apiWrapperInstalled stays false and postBootFailure uses its
		// terminal-only last-resort raw acquire instead).
		try {
			var descriptor = Object.getOwnPropertyDescriptor(window, "acquireVsCodeApi");
			if (descriptor && descriptor.configurable) {
				Object.defineProperty(window, "acquireVsCodeApi", {
					configurable: true,
					enumerable: descriptor.enumerable,
					writable: true,
					value: wrapper,
				});
				apiWrapperInstalled = true;
			}
		} catch (error) {
			// Non-configurable: apiWrapperInstalled stays false.
		}
		// F-4: report the (still) failed install locally so an inert guard is
		// never silent. Only reached when NEITHER install strategy worked.
		if (!apiWrapperInstalled) {
			logGuardDiagnostic("api-wrapper");
		}
	}

	// F-4: a failure in ANY install step is reported on a LOCAL static line. It is
	// never swallowed silently: an inert guard is indistinguishable from a healthy
	// boot, so the failure must at least be visible in the webview devtools console.
	function logGuardDiagnostic(stage) {
		try {
			if (typeof console !== "undefined" && console && typeof console.warn === "function") {
				console.warn("[webview-boot-guard] install step failed: " + stage);
			}
		} catch (error) {
			// Diagnostics are best-effort and must never throw.
		}
	}

	function armWatchdog() {
		if (armed) {
			return;
		}
		armed = true;
		watchdogTimer = setTimeout(function () {
			if (rootIsEmpty()) {
				handleFailure("watchdog");
			} else {
				clearWatchdog();
			}
		}, WATCHDOG_TIMEOUT_MS);
	}

	// F-4: ARM THE WATCHDOG FIRST and in its OWN step. It is the only detector
	// that catches a silently dead boot, so it must never be skipped because a
	// LATER step failed. Concretely, when window.acquireVsCodeApi is a
	// NON-WRITABLE property, installing the delegating wrapper throws under strict
	// mode; the previous single try block swallowed that throw and left the
	// watchdog unarmed (zero protection). Each step is now isolated, and every
	// failure leaves a local diagnostic line instead of being silently swallowed.
	try {
		armWatchdog();
	} catch (error) {
		logGuardDiagnostic("watchdog");
	}

	try {
		window.addEventListener("error", onWindowError, true);
		window.addEventListener("unhandledrejection", onUnhandledRejection);
	} catch (error) {
		logGuardDiagnostic("listeners");
	}

	// NEW-1: its OWN step, BEFORE the wrapper install, so the #root observation
	// can never be skipped because installing the wrapper failed.
	try {
		watchRootForLateMount();
	} catch (error) {
		logGuardDiagnostic("late-mount-watch");
	}

	try {
		installApiWrapper();
	} catch (error) {
		logGuardDiagnostic("api-wrapper");
	}
})();`
}

/**
 * Build the complete nonce'd `<script>` tag injected into the served webview
 * HTML. The nonce is REQUIRED because the production CSP only allows scripts
 * carrying the per-response nonce (no `'unsafe-inline'`), and the caller must
 * NOT weaken the CSP to accommodate this guard.
 */
export function buildWebviewBootGuardScript(nonce: string): string {
	return `<script nonce="${nonce}">
${buildWebviewBootGuardScriptBody()}
</script>`
}
