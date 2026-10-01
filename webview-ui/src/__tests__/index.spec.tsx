// npx vitest run src/__tests__/index.spec.tsx

/**
 * Defensive bootstrap path (T1.2/T1.5).
 *
 * `webview-ui/src/index.tsx` auto-mounts on import, so its module-level side
 * effect runs once when the module is first imported (with an empty body → the
 * missing-root fallback). The tests below exercise `mountWebviewApp()` directly
 * with the DOM state they require.
 */
import type { ReactNode } from "react"

const { createRootMock } = vi.hoisted(() => ({ createRootMock: vi.fn() }))

vi.mock("react-dom/client", () => ({
	createRoot: (container: Element) => createRootMock(container),
}))

vi.mock("../App", () => ({ default: () => <div data-testid="app" /> }))
vi.mock("../utils/highlighter", () => ({ getHighlighter: vi.fn(() => Promise.resolve({})) }))
vi.mock("../components/ErrorBoundary", () => ({
	default: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

import { mountWebviewApp } from "../index"

describe("webview bootstrap (index.tsx)", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		document.body.innerHTML = ""
		vi.spyOn(console, "error").mockImplementation(() => {})
	})

	afterEach(() => {
		vi.restoreAllMocks()
		document.body.innerHTML = ""
	})

	it("paints the inline fallback when #root is missing (no non-null assertion crash)", () => {
		mountWebviewApp()

		expect(createRootMock).not.toHaveBeenCalled()
		expect(document.getElementById("roo-webview-bootstrap-error")).not.toBeNull()
	})

	it("paints the inline fallback when createRoot(...).render(...) throws", () => {
		document.body.innerHTML = '<div id="root"></div>'
		createRootMock.mockImplementation(() => {
			throw new Error("boom")
		})

		mountWebviewApp()

		expect(document.getElementById("roo-webview-bootstrap-error")).not.toBeNull()
	})

	it("mounts into #root when the container exists and render succeeds", () => {
		document.body.innerHTML = '<div id="root"></div>'
		const render = vi.fn()
		createRootMock.mockReturnValue({ render })

		mountWebviewApp()

		expect(createRootMock).toHaveBeenCalledTimes(1)
		expect(render).toHaveBeenCalledTimes(1)
		expect(document.getElementById("roo-webview-bootstrap-error")).toBeNull()
	})
})
