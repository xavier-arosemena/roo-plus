// npx vitest run src/__tests__/webviewBootstrapError.spec.ts

import { renderWebviewBootstrapError } from "../utils/webviewBootstrapError"

describe("renderWebviewBootstrapError", () => {
	beforeEach(() => {
		vi.spyOn(console, "error").mockImplementation(() => {})
		document.body.innerHTML = ""
	})

	afterEach(() => {
		vi.restoreAllMocks()
		document.body.innerHTML = ""
	})

	it("paints a self-contained error UI with a Reload button into document.body", () => {
		renderWebviewBootstrapError()

		const fallback = document.getElementById("roo-webview-bootstrap-error")
		expect(fallback).not.toBeNull()
		expect(fallback?.getAttribute("role")).toBe("alert")
		expect(fallback?.textContent).toContain("The Roo+ view failed to load")

		const reloadButton = fallback?.querySelector("button")
		expect(reloadButton).not.toBeNull()
		expect(reloadButton?.getAttribute("aria-label")).toBe("Reload the Roo+ view")
	})

	it("is idempotent (never paints two fallbacks)", () => {
		renderWebviewBootstrapError()
		renderWebviewBootstrapError()

		expect(document.querySelectorAll("#roo-webview-bootstrap-error")).toHaveLength(1)
	})

	it("logs a static, identifier-free message (no error content)", () => {
		renderWebviewBootstrapError()

		expect(console.error).toHaveBeenCalledWith("Roo+ webview failed to mount")
	})
})
