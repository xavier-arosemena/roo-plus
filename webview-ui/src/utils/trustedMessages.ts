/**
 * Validate that a window "message" event originated from the VS Code extension
 * host (or from the current window in the browser dev-server mock).
 *
 * The extension host posts messages to the webview's own frame tree, but the
 * way those messages are delivered differs between environments:
 *
 * - Desktop VS Code delivers extension-host messages directly to the webview's
 *   own window, so `event.source === window`.
 * - Remote/server webviews (VSCodium server, Remote SSH over the web) route
 *   extension-host messages through the frame hierarchy, so they arrive with
 *   `event.source === window.parent` (or `window.top`).
 *
 * A null source is accepted for events dispatched programmatically (e.g. by
 * tests or same-context code), since those cannot originate from an external
 * frame. Any OTHER source (an embedded cross-origin frame) is rejected.
 *
 * The ORIGIN check below is the authoritative security boundary. When the
 * browser reports an origin, it must be the webview's own origin — a
 * "vscode-webview://" origin, or the same origin in the browser dev-server
 * mock. An empty/null origin (programmatically-dispatched events) is accepted.
 *
 * This prevents untrusted content embedded in the webview from injecting
 * messages (missing-origin-check) while still accepting the parent/top-frame
 * delivery used by remote webviews.
 */
export function isTrustedMessage(event: MessageEvent): boolean {
	const { source, origin } = event

	// Accept messages delivered to the webview's own frame tree. Desktop VS Code
	// delivers extension-host messages with source === window; remote/server
	// webviews (VSCodium server, Remote SSH over the web) deliver them via the
	// parent/top frame. A null source is accepted for programmatic dispatch
	// (tests, same-context code). Any OTHER source (an embedded cross-origin
	// frame) is rejected. The ORIGIN check below is the security boundary that
	// prevents untrusted content from injecting messages.
	const sourceIsOwnFrame = source === null || source === window || source === window.parent || source === window.top
	if (!sourceIsOwnFrame) {
		return false
	}

	return origin === "" || origin === "null" || origin === window.origin || origin.startsWith("vscode-webview://")
}
