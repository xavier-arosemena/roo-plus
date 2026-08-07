/**
 * Validate that a window "message" event originated from the VS Code extension
 * host (or from the current window in the browser dev-server mock).
 *
 * The extension host posts messages into the webview's own frame tree, but the
 * exact delivering window differs by environment:
 *
 * - Desktop VS Code delivers directly to the webview's own window
 *   (`event.source === window`).
 * - Remote/server webviews (VSCodium server, Remote SSH) forward the message
 *   through an intermediate same-origin window — observed as `srcCtor=Window`
 *   with `origin === window.origin`, but the source object is neither `window`,
 *   `window.parent`, nor `window.top`.
 *
 * Because the delivering source can be ANY same-origin window in the webview's
 * frame tree, the source identity is NOT a reliable trust signal (it produced
 * false rejections that silently dropped every extension-host message in remote
 * webviews). Trust is therefore decided purely on ORIGIN: browsers set
 * `MessageEvent.origin` to the sender's real origin, and cross-origin embedded
 * content cannot spoof it (window.postMessage enforces the sender's origin).
 *
 *   - `origin === window.origin` — the webview's own origin (desktop, remote,
 *     dev-server mock) → trusted.
 *   - `origin` starts with "vscode-webview://" — VS Code webview origin →
 *     trusted.
 *   - empty / "null" origin — programmatically-dispatched events (tests,
 *     same-context code) → trusted.
 *   - anything else (a cross-origin frame, an attacker page) → rejected.
 *
 * This still blocks the original threat (untrusted cross-origin content
 * embedded in the webview injecting messages) while accepting the same-origin
 * frame-tree delivery used by remote/server webviews.
 */
export function isTrustedMessage(event: MessageEvent): boolean {
	const { origin } = event
	return origin === "" || origin === "null" || origin === window.origin || origin.startsWith("vscode-webview://")
}
