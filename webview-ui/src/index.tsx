import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import App from "./App"
import "../node_modules/@vscode/codicons/dist/codicon.css"

import ErrorBoundary from "./components/ErrorBoundary"
import { getHighlighter } from "./utils/highlighter"
import { renderWebviewBootstrapError } from "./utils/webviewBootstrapError"
import { installResourceErrorCounter } from "./utils/resourceErrorCounter"

// Renderer-liveness probe (2026-09-18 gray-webview capture): count resource load
// failures (asset 401s) from the earliest point so the env-gated `livenessPong`
// can carry an integer the host probe surfaces. Local-only, integer only.
installResourceErrorCounter()

// Initialize Shiki early to hide initialization latency (async)
getHighlighter().catch((error: Error) => console.error("Failed to initialize Shiki highlighter:", error))

/**
 * Mount the webview React tree into the host-injected `#root` container.
 *
 * Defensive by design (T1.2/T1.5):
 *  - a missing `#root` (or a throwing `render()`) paints a self-contained
 *    fallback instead of dying on a non-null assertion / unhandled exception;
 *  - the outermost `<ErrorBoundary>` catches errors thrown while rendering
 *    `<App/>` and its provider tree, while this function's `try/catch` covers
 *    the `createRoot(...).render(...)` call itself — which React error
 *    boundaries cannot.
 *
 * NOTE on i18n: this outer boundary sits OUTSIDE `TranslationProvider` (which
 * lives inside `<App/>`). `ErrorBoundary` is `withTranslation("common")`-wrapped
 * and `webview-ui/src/i18n/setup.ts` initializes the default i18next instance at
 * import time, so the HOC always receives a callable `t`. Before
 * `loadTranslations()` runs, `t` renders translation keys verbatim; the
 * boundary's critical control (the Reload button) uses a literal string and does
 * not depend on translations at all.
 */
export function mountWebviewApp(): void {
	const container = document.getElementById("root")

	if (!container) {
		renderWebviewBootstrapError()
		return
	}

	try {
		createRoot(container).render(
			<StrictMode>
				<ErrorBoundary>
					<App />
				</ErrorBoundary>
			</StrictMode>,
		)
	} catch {
		renderWebviewBootstrapError()
	}
}

mountWebviewApp()
