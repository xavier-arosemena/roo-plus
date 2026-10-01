/**
 * Session-only count of webview RESOURCE load failures (2026-09-18 gray-webview
 * capture: webview asset loads returned 401 on BOTH servers while `[host-health]`
 * showed the extension host idle).
 *
 * The RTT liveness probe is blind to this channel: a renderer can keep answering
 * `livenessPing` on time while its `<script>` / `<link>` / `<img>` resources 401.
 * This module counts those failed resource loads so the renderer-liveness
 * `livenessPong` can carry an integer the host probe surfaces.
 *
 * PRIVACY (same bar as the host-side probe): an INTEGER only. No URL, element
 * identity, file path, or content is recorded, logged, or transmitted. Nothing is
 * persisted (session memory only) and there is no egress. The counter is read
 * solely by the env-gated `livenessPong`; the host probe stays completely inert
 * unless `ROO_WEBVIEW_LIVENESS_DEBUG` is set.
 */
let resourceErrorCount = 0
let installed = false

/**
 * A resource load failure surfaces as an `error` event on the failing ELEMENT
 * (`script`/`link`/`img`), whereas a script exception surfaces on `window` with
 * `target === window`. Counting only element targets keeps this channel distinct
 * from ordinary exceptions (and prevents double-counting them).
 */
function handleResourceError(event: Event): void {
	const target = event.target
	if (target && target !== window && (target as Element).tagName) {
		resourceErrorCount += 1
	}
}

/** Installs the counting listener once. Idempotent, and safe outside a DOM. */
export function installResourceErrorCounter(): void {
	if (installed || typeof window === "undefined" || typeof window.addEventListener !== "function") {
		return
	}

	installed = true
	// Capture phase: resource `error` events do not bubble, so a bubble-phase
	// listener on `window` would never observe them.
	window.addEventListener("error", handleResourceError, true)
}

/** Current session resource-error count (a non-negative integer). */
export function getResourceErrorCount(): number {
	return resourceErrorCount
}
