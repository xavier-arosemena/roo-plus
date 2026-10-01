/**
 * Last-resort bootstrap failure UI for the webview entry point.
 *
 * Used by `webview-ui/src/index.tsx` when the React tree cannot mount at all:
 * the host-injected `#root` container is missing, or `createRoot(...).render(...)`
 * throws on the bootstrap path. It paints into `document.body` using plain DOM
 * and inline styles because the Tailwind stylesheet — and the whole app bundle —
 * may be exactly what failed to load.
 *
 * STYLING EXCEPTION: this module intentionally uses inline styles instead of
 * Tailwind utilities. Tailwind lives in the bundle that just failed, so it is
 * unavailable here. Tailwind remains required for the React markup (e.g. the
 * ErrorBoundary reload button); it is only unavailable for this dead-bundle path.
 *
 * LOCAL-ONLY: the log line is static and identifier-free. No error content, no
 * task data, no telemetry, no egress.
 */

const BOOTSTRAP_ERROR_ID = "roo-webview-bootstrap-error"

/**
 * Paint a minimal, self-contained error UI (title + Reload button) into
 * `document.body`. Idempotent; never throws.
 */
export function renderWebviewBootstrapError(): void {
	try {
		if (document.getElementById(BOOTSTRAP_ERROR_ID)) {
			return
		}

		// Static message only — deliberately no error content or identifiers.
		console.error("Roo+ webview failed to mount")

		const host = document.body || document.documentElement
		if (!host) {
			return
		}

		const wrapper = document.createElement("div")
		wrapper.id = BOOTSTRAP_ERROR_ID
		wrapper.setAttribute("role", "alert")
		wrapper.style.cssText =
			"box-sizing:border-box;font-family:var(--vscode-font-family,sans-serif);" +
			"color:var(--vscode-foreground,#cccccc);background:var(--vscode-editor-background,#1e1e1e);" +
			"padding:24px;min-height:100vh;"

		const heading = document.createElement("h1")
		heading.style.cssText = "font-size:1.1em;font-weight:600;margin:0 0 8px;"
		heading.textContent = "The Roo+ view failed to load"

		const message = document.createElement("p")
		message.style.cssText = "margin:0 0 16px;opacity:0.8;"
		message.textContent = "The interface did not start. Reload the view to try again."

		const reloadButton = document.createElement("button")
		reloadButton.type = "button"
		reloadButton.setAttribute("aria-label", "Reload the Roo+ view")
		reloadButton.style.cssText =
			"cursor:pointer;font:inherit;padding:6px 14px;" +
			"border:1px solid var(--vscode-button-border,transparent);border-radius:4px;" +
			"color:var(--vscode-button-foreground,#ffffff);background:var(--vscode-button-background,#0e639c);"
		reloadButton.textContent = "Reload"
		reloadButton.addEventListener("click", () => {
			window.location.reload()
		})

		wrapper.appendChild(heading)
		wrapper.appendChild(message)
		wrapper.appendChild(reloadButton)
		host.appendChild(wrapper)
	} catch {
		// Never throw from the last-resort bootstrap handler.
	}
}
