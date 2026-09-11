/**
 * Regression tests for the source map initializer.
 *
 * Guards the fix for postmortem item 4
 * (docs/postmortems/2026-09-09-webview-grayout-console-warnings.md):
 * production startup used to inject FIVE guessed source map preload URLs per
 * script and re-fetch the full script text, causing console 404 noise and
 * multi-MB wasted fetches over the remote-SSH webview channel. Preloading is
 * now opt-in (localStorage debug flag) and requests only the canonical
 * `<script src>.map` emitted by the Vite build.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { initializeSourceMaps } from "../sourceMapInitializer"

vi.mock("../sourceMapUtils", () => ({
	enhanceErrorWithSourceMaps: vi.fn(async (error: Error) => error),
}))

const SOURCEMAP_DEBUG_KEY = "roo-plus:sourcemap-debug"

function preloadLinks(): HTMLLinkElement[] {
	return Array.from(document.head.querySelectorAll<HTMLLinkElement>('link[rel="preload"]'))
}

function addExternalScript(src: string): void {
	const script = document.createElement("script")
	script.src = src
	document.body.appendChild(script)
}

describe("initializeSourceMaps", () => {
	let originalEnv: string | undefined
	let fetchSpy: ReturnType<typeof vi.spyOn>

	beforeEach(() => {
		originalEnv = process.env.NODE_ENV
		document.head.innerHTML = ""
		document.body.innerHTML = ""
		localStorage.clear()
		fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 200 }))
	})

	afterEach(() => {
		process.env.NODE_ENV = originalEnv
		vi.restoreAllMocks()
	})

	it("does nothing outside production builds", () => {
		process.env.NODE_ENV = "development"
		addExternalScript("https://example.com/assets/index.js")

		initializeSourceMaps()

		expect(preloadLinks()).toHaveLength(0)
		expect(fetchSpy).not.toHaveBeenCalled()
	})

	it("does not preload guessed source map URLs or fetch script text in production (regression: 404 noise + remote fetch waste)", () => {
		process.env.NODE_ENV = "production"
		addExternalScript("https://example.com/assets/index.js")

		initializeSourceMaps()

		// The old behavior injected five links per script:
		// `.map`, `?source-map=true`, `.map` (replace), `.map.json`, `.sourcemap`
		// plus a fetch of the full script text. None of that may happen without
		// the opt-in debug flag.
		expect(preloadLinks()).toHaveLength(0)
		expect(fetchSpy).not.toHaveBeenCalled()
	})

	it("still installs global error handlers in production so on-demand mapping works", () => {
		process.env.NODE_ENV = "production"
		const errorListener = vi.fn()
		window.addEventListener("error", errorListener)

		// initializeSourceMaps registers its own handlers first; dispatching an
		// error event must not throw even with no scripts on the page.
		addExternalScript("https://example.com/assets/index.js")
		expect(() => initializeSourceMaps()).not.toThrow()

		window.dispatchEvent(new Event("error"))
		expect(errorListener).toHaveBeenCalled()

		window.removeEventListener("error", errorListener)
	})

	it("preloads only the canonical <script src>.map when the debug flag is enabled", () => {
		process.env.NODE_ENV = "production"
		localStorage.setItem(SOURCEMAP_DEBUG_KEY, "1")
		addExternalScript("https://example.com/assets/index.js")
		addExternalScript("https://example.com/assets/vendor.js")
		// Inline scripts (no src) must be skipped.
		const inline = document.createElement("script")
		inline.textContent = "void 0"
		document.body.appendChild(inline)

		initializeSourceMaps()

		const links = preloadLinks()
		expect(links).toHaveLength(2)
		expect(links.map((link) => link.href)).toEqual([
			"https://example.com/assets/index.js.map",
			"https://example.com/assets/vendor.js.map",
		])
		// Even in debug mode we must not re-fetch full script text.
		expect(fetchSpy).not.toHaveBeenCalled()
	})

	it("treats an unset or malformed debug flag as disabled", () => {
		process.env.NODE_ENV = "production"
		localStorage.setItem(SOURCEMAP_DEBUG_KEY, "true")
		addExternalScript("https://example.com/assets/index.js")

		initializeSourceMaps()

		expect(preloadLinks()).toHaveLength(0)
	})
})
