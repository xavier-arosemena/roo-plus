/**
 * Validate that a window "message" event originated from the VS Code extension
 * host (or from the current window in the browser dev-server mock).
 *
 * The extension host posts messages directly to the webview's own window, so a
 * trusted event must be sourced from that window. Events delivered from any
 * other window (e.g. cross-origin frames embedded in the webview) are rejected.
 * A null source is accepted for events dispatched programmatically (e.g. by
 * tests or same-context code), since those cannot originate from an external
 * frame.
 *
 * When the browser reports an origin, it must be the webview's own origin — a
 * "vscode-webview://" origin, or the same origin in the browser dev-server
 * mock. An empty/null origin (programmatically-dispatched events) is accepted.
 *
 * This prevents untrusted content embedded in the webview from injecting
 * messages (missing-origin-check).
 */
export function isTrustedMessage(event: MessageEvent): boolean {
	if (event.source !== null && event.source !== window) {
		return false
	}

	const { origin } = event
	return origin === "" || origin === "null" || origin === window.origin || origin.startsWith("vscode-webview://")
}
