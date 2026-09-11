/**
 * Source Map Initializer
 *
 * This utility sets up global error handlers that enhance errors with source
 * maps on demand (via StackTrace.js, which resolves the real
 * `//# sourceMappingURL=` comment). Eager source map *preloading* is opt-in
 * behind a debug flag because the previous strategy — guessing five map URLs
 * per script and re-fetching the full script text — produced console 404
 * noise and multi-MB wasted fetches over the remote-SSH webview channel.
 * See docs/postmortems/2026-09-09-webview-grayout-console-warnings.md (item 4).
 *
 * This implementation is compatible with VSCode's Content Security Policy.
 */

import { enhanceErrorWithSourceMaps } from "./sourceMapUtils"

/**
 * Opt-in key for eager source map preloading. Enable from the webview
 * devtools console with:
 *   localStorage.setItem("roo-plus:sourcemap-debug", "1")
 * When enabled, only the canonical `<script src>.map` URL emitted by the
 * Vite build is preloaded (no guessing, no script-text fetches).
 */
const SOURCEMAP_DEBUG_KEY = "roo-plus:sourcemap-debug"

function isSourceMapPreloadDebugEnabled(): boolean {
	try {
		return localStorage.getItem(SOURCEMAP_DEBUG_KEY) === "1"
	} catch {
		// localStorage can be unavailable depending on webview storage state.
		return false
	}
}

/**
 * Initialize source map support for production builds
 */
export function initializeSourceMaps(): void {
	if (process.env.NODE_ENV !== "production") {
		// Only needed in production builds
		return
	}

	console.debug("Initializing CSP-compatible source map support for production build")

	// Set up global error handler
	window.addEventListener("error", async (event) => {
		if (event.error && event.error instanceof Error) {
			try {
				// Apply source maps to the error
				const enhancedError = await enhanceErrorWithSourceMaps(event.error)

				// Log the enhanced error
				console.error("Source mapped error:", enhancedError)

				// Don't prevent default handling - let the ErrorBoundary catch it
			} catch (e) {
				console.error("Error enhancing error with source maps:", e)
			}
		}
	})

	// Set up unhandled promise rejection handler
	window.addEventListener("unhandledrejection", async (event) => {
		if (event.reason && event.reason instanceof Error) {
			try {
				// Apply source maps to the error
				const enhancedError = await enhanceErrorWithSourceMaps(event.reason)

				// Log the enhanced error
				console.error("Source mapped rejection:", enhancedError)
			} catch (e) {
				console.error("Error enhancing rejection with source maps:", e)
			}
		}
	})

	// Eager preload is opt-in only: the error handlers above already resolve
	// the real map on demand, so warming the cache up-front is a debugging
	// convenience, not a functional requirement.
	if (isSourceMapPreloadDebugEnabled()) {
		try {
			for (const script of Array.from(document.getElementsByTagName("script"))) {
				if (!script.src) {
					continue
				}

				// Vite (build.sourcemap + sourcemapPlugin) always emits the map
				// as a sibling `<script file>.map`, so this single URL is the
				// real one — no guessed-variants list.
				const link = document.createElement("link")
				link.rel = "preload"
				link.as = "fetch"
				link.href = `${script.src}.map`
				link.crossOrigin = "anonymous"
				document.head.appendChild(link)
			}
		} catch (e) {
			console.error("Error preloading source maps:", e)
		}
	}
}

/**
 * Expose source maps on the window object for debugging
 */
export function exposeSourceMapsForDebugging(): void {
	if (process.env.NODE_ENV !== "production") {
		return
	}

	try {
		// Add a global function to manually apply source maps to an error
		;(window as any).__applySourceMaps = async (error: Error) => {
			if (!(error instanceof Error)) {
				console.error("Not an Error object:", error)
				return error
			}
			return await enhanceErrorWithSourceMaps(error)
		}

		// Add a global function to test source map functionality
		;(window as any).__testSourceMaps = () => {
			try {
				// Intentionally cause an error
				const obj: any = undefined
				obj.nonExistentMethod()
			} catch (e) {
				if (e instanceof Error) {
					console.log("Original error:", e)
					;(window as any).__applySourceMaps(e).then((enhanced: Error) => {
						console.log("Enhanced error:", enhanced)

						// Log the source mapped stack if available
						if ("sourceMappedStack" in enhanced) {
							console.log("Source mapped stack:", enhanced.sourceMappedStack)
						}

						// Log the source mapped component stack if available
						if ("sourceMappedComponentStack" in enhanced) {
							console.log("Source mapped component stack:", enhanced.sourceMappedComponentStack)
						}
					})
				}
			}
		}

		// Add a global function to check if source maps are available for a script
		;(window as any).__checkSourceMap = async (scriptUrl: string) => {
			try {
				const response = await fetch(`${scriptUrl}.map`)
				if (response.ok) {
					const sourceMap = await response.json()
					const originalFileName =
						sourceMap.sources && sourceMap.sources.length > 0 ? sourceMap.sources[0] : "unknown"
					console.log(`Source map found for ${scriptUrl}. Original file: ${originalFileName}`)
					return true
				} else {
					console.log(`No source map found for ${scriptUrl}`)
					return false
				}
			} catch (e) {
				console.error(`Error checking source map for ${scriptUrl}:`, e)
				return false
			}
		}

		console.debug("Source map debugging utilities exposed on window object")
	} catch (e) {
		console.error("Error exposing source maps for debugging:", e)
	}
}
