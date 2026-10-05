// npx vitest run src/__tests__/webviewBootGuard.dom.spec.ts

/**
 * jsdom behavioural test for the served-HTML boot guard.
 *
 * The guard's source of truth lives in the extension workspace
 * (`src/core/webview/webviewBootGuard.ts`), which has no jsdom dependency (its
 * vitest project runs on the `node` environment). jsdom IS installed here in
 * webview-ui, so this test evaluates the guard body exactly as a browser would
 * — as a classic inline script against the real jsdom window — while the pure,
 * string-level assertions for the same helper live in
 * `src/core/webview/__tests__/webviewBootGuard.spec.ts`.
 */
import {
	BOOT_FALLBACK_CLEAR_MAX_MS,
	BOOT_FALLBACK_CLEAR_POLL_MS,
	BOOT_WATCHDOG_TIMEOUT_MS,
	buildWebviewBootGuardScriptBody,
} from "../../../src/core/webview/webviewBootGuard"

type GuardApi = {
	postMessage: (message: unknown, transfer?: unknown) => void
	getState: () => unknown
	setState: (state: unknown) => unknown
}

type MockSpy = ReturnType<typeof vi.fn>

type GuardHarness = {
	/** The handle the app receives from the (memoized) `acquireVsCodeApi`. */
	handle: GuardApi
	/** The memoized `window.acquireVsCodeApi` installed by the guard. */
	acquire: () => GuardApi
	realPostMessage: MockSpy
	realGetState: MockSpy
	realSetState: MockSpy
	acquireCallCount: () => number
}

/**
 * Install a VS Code-faithful `acquireVsCodeApi` double on the jsdom window:
 *  - it may be called ONLY ONCE per session (a second direct call throws);
 *  - the handle it returns is FROZEN, exactly like VS Code's real return value.
 *
 * The pre-fix guard wrote `real.postMessage = ...` onto that frozen handle from
 * inside a strict-mode IIFE, which threw
 * `TypeError: Cannot assign to read only property 'postMessage'` and aborted the
 * whole bundle before React mounted (DEF-1). This double reproduces that
 * contract so the regression can never silently return.
 */
function installFrozenVsCodeApiStub(): Omit<GuardHarness, "handle" | "acquire"> {
	const realPostMessage = vi.fn()
	const realGetState = vi.fn(() => ({ persisted: true }))
	const realSetState = vi.fn((state: unknown) => state)
	const frozenApi: GuardApi = Object.freeze({
		postMessage: realPostMessage,
		getState: realGetState,
		setState: realSetState,
	})

	let acquireCalls = 0
	const acquireReal = () => {
		acquireCalls += 1
		if (acquireCalls > 1) {
			throw new Error("acquireVsCodeApi() can only be called once per session")
		}
		return frozenApi
	}
	Object.assign(window, { acquireVsCodeApi: acquireReal })

	return {
		realPostMessage,
		realGetState,
		realSetState,
		acquireCallCount: () => acquireCalls,
	}
}

/**
 * Install a NON-WRITABLE (but CONFIGURABLE) `acquireVsCodeApi`, so the guard's
 * strict-mode assignment `window.acquireVsCodeApi = function () { ... }` throws
 * a TypeError (F-4).
 *
 * H1 (issue #416 hardening): because the property is configurable, the guard can
 * still install its memoizing wrapper NON-DESTRUCTIVELY via `Object.defineProperty`.
 * The app keeps a working shared handle (the wrapper memoizes the real handle),
 * so a terminal failure IS host-visible again — asserted by the H1 tests below.
 */
function installNonWritableVsCodeApiStub(): { realPostMessage: MockSpy } {
	const realPostMessage = vi.fn()
	const frozenApi: GuardApi = Object.freeze({
		postMessage: realPostMessage,
		getState: vi.fn(() => ({})),
		setState: vi.fn((state: unknown) => state),
	})

	Object.defineProperty(window, "acquireVsCodeApi", {
		configurable: true,
		enumerable: false,
		writable: false,
		value: () => frozenApi,
	})

	return { realPostMessage }
}

/**
 * Install an `acquireVsCodeApi` the guard CANNOT wrap AT ALL: NON-WRITABLE and
 * NON-CONFIGURABLE, so neither the strict-mode assignment nor
 * `Object.defineProperty` can replace it.
 *
 * H1 residual: to keep a provably dead panel from being silent, the guard falls
 * back to ONE raw `acquireVsCodeApi()` call on the TERMINAL path only. That does
 * consume the app's single-use handle — the documented trade-off for this
 * abnormal environment (see `postBootFailure`).
 *
 * NOTE: a non-configurable global cannot be removed in `afterEach`, so the test
 * that uses this helper MUST be the LAST test in the file (it is).
 */
function installNonConfigurableVsCodeApiStub(): { realPostMessage: MockSpy; acquireCallCount: () => number } {
	const realPostMessage = vi.fn()
	const frozenApi: GuardApi = Object.freeze({
		postMessage: realPostMessage,
		getState: vi.fn(() => ({})),
		setState: vi.fn((state: unknown) => state),
	})

	let acquireCalls = 0
	const acquireReal = () => {
		acquireCalls += 1
		if (acquireCalls > 1) {
			throw new Error("acquireVsCodeApi() can only be called once per session")
		}
		return frozenApi
	}
	Object.defineProperty(window, "acquireVsCodeApi", {
		configurable: false,
		enumerable: false,
		writable: false,
		value: acquireReal,
	})

	return { realPostMessage, acquireCallCount: () => acquireCalls }
}

/**
 * Instantiate the guard the way the webview does, then emulate the app's
 * `new VSCodeAPIWrapper()` (a single `acquireVsCodeApi()` call at startup) so the
 * delegating wrapper — and therefore the `webviewDidLaunch` disarm hook — is live.
 *
 * NOTE: the guard registers anonymous window listeners that cannot be removed.
 * Each test gets a fresh frozen stub so cross-test listener leakage cannot
 * corrupt assertions; the DOM is reset in `afterEach`.
 */
function evaluateGuard(): GuardHarness {
	const spies = installFrozenVsCodeApiStub()

	// Classic inline script in the page realm (same as the nonce'd <script>).
	new Function(buildWebviewBootGuardScriptBody())()

	const acquire = Reflect.get(window, "acquireVsCodeApi") as () => GuardApi
	const handle = acquire()

	return { handle, acquire, ...spies }
}

describe("webview boot guard (jsdom)", () => {
	beforeEach(() => {
		vi.useFakeTimers()
		document.body.innerHTML = '<div id="root"></div>'
	})

	afterEach(() => {
		vi.useRealTimers()
		document.body.innerHTML = ""
		Reflect.deleteProperty(window, "acquireVsCodeApi")
	})

	it("installs without throwing and hands the app a usable handle when the real API is FROZEN (DEF-1)", () => {
		const spies = installFrozenVsCodeApiStub()

		// (a) Installing the guard must not throw, even though the real handle is
		// frozen: the guard may never write to it.
		expect(() => new Function(buildWebviewBootGuardScriptBody())()).not.toThrow()

		const acquire = Reflect.get(window, "acquireVsCodeApi") as () => GuardApi

		// (b) The app's single startup call must succeed and return a usable handle.
		const handle = acquire()
		expect(typeof handle.postMessage).toBe("function")
		expect(typeof handle.getState).toBe("function")
		expect(typeof handle.setState).toBe("function")

		// The real API is consulted exactly once; the memoized wrapper is shared
		// with every later caller (so the "already acquired" throw never fires).
		expect(spies.acquireCallCount()).toBe(1)
		expect(acquire()).toBe(handle)
		expect(spies.acquireCallCount()).toBe(1)
	})

	it("delegates postMessage/getState/setState to the frozen real handle with forwarded args (DEF-1)", () => {
		const { handle, realPostMessage, realGetState, realSetState } = evaluateGuard()

		handle.postMessage({ type: "ping" }, ["transfer"])
		expect(realPostMessage).toHaveBeenCalledTimes(1)
		expect(realPostMessage).toHaveBeenCalledWith({ type: "ping" }, ["transfer"])

		expect(handle.getState()).toEqual({ persisted: true })
		expect(realGetState).toHaveBeenCalledTimes(1)

		expect(handle.setState({ hydrated: true })).toEqual({ hydrated: true })
		expect(realSetState).toHaveBeenCalledWith({ hydrated: true })
	})

	it("renders the fallback and posts exactly one webviewBootFailure when #root stays empty", () => {
		const { realPostMessage } = evaluateGuard()

		vi.advanceTimersByTime(BOOT_WATCHDOG_TIMEOUT_MS + 1)

		const fallback = document.getElementById("roo-webview-boot-fallback")
		expect(fallback).not.toBeNull()
		expect(fallback?.textContent).toContain("The Roo+ view failed to load")

		const reloadButton = document.getElementById("roo-webview-boot-reload")
		expect(reloadButton).not.toBeNull()
		expect(reloadButton?.getAttribute("aria-label")).toBe("Reload the Roo+ view")

		expect(realPostMessage).toHaveBeenCalledTimes(1)
		expect(realPostMessage).toHaveBeenCalledWith({ type: "webviewBootFailure", reason: "watchdog" })
	})

	it("does not show the fallback or post when React has mounted into #root", () => {
		const root = document.getElementById("root")
		expect(root).not.toBeNull()
		root?.appendChild(document.createElement("div"))

		const { realPostMessage } = evaluateGuard()

		vi.advanceTimersByTime(BOOT_WATCHDOG_TIMEOUT_MS + 1)

		expect(document.getElementById("roo-webview-boot-fallback")).toBeNull()
		expect(realPostMessage).not.toHaveBeenCalled()
	})

	it("disarms the watchdog when the app posts its webviewDidLaunch success signal", () => {
		const { handle, realPostMessage } = evaluateGuard()

		// The app posts the existing boot-success signal at mount; the guard
		// must reuse it (T1.4) rather than inventing a new OK type.
		handle.postMessage({ type: "webviewDidLaunch" })
		vi.advanceTimersByTime(BOOT_WATCHDOG_TIMEOUT_MS + 1)

		expect(document.getElementById("roo-webview-boot-fallback")).toBeNull()
		expect(realPostMessage).toHaveBeenCalledTimes(1)
		expect(realPostMessage).toHaveBeenCalledWith({ type: "webviewDidLaunch" })
	})

	it("clears a stale fallback when a late webviewDidLaunch arrives (DEF-4)", () => {
		const { handle, realPostMessage } = evaluateGuard()

		// Watchdog trips: the fallback is painted and one failure is posted.
		vi.advanceTimersByTime(BOOT_WATCHDOG_TIMEOUT_MS + 1)
		expect(document.getElementById("roo-webview-boot-fallback")).not.toBeNull()
		expect(realPostMessage).toHaveBeenCalledWith({ type: "webviewBootFailure", reason: "watchdog" })

		// The bundle finally mounts and posts the success signal: the guard must
		// remove the stale "failed to load" block over the now-working app.
		handle.postMessage({ type: "webviewDidLaunch" })

		expect(document.getElementById("roo-webview-boot-fallback")).toBeNull()
		expect(realPostMessage).toHaveBeenCalledTimes(2)
		expect(realPostMessage).toHaveBeenLastCalledWith({ type: "webviewDidLaunch" })
	})

	it("shows the fallback and posts reason=throw on an unhandled rejection", () => {
		const { realPostMessage } = evaluateGuard()

		window.dispatchEvent(new Event("unhandledrejection"))

		expect(document.getElementById("roo-webview-boot-fallback")).not.toBeNull()
		expect(realPostMessage).toHaveBeenCalledWith({ type: "webviewBootFailure", reason: "throw" })
	})

	it("ignores non-fatal resource errors (modulepreload/img) but treats a <script> error as a load failure (issue #416)", () => {
		const { realPostMessage } = evaluateGuard()

		// A benign, non-fatal modulepreload hint failing must NOT paint the
		// fallback and must NOT post a webviewBootFailure — the app can still
		// mount (this is the #416 false-positive the guard used to latch on).
		const preload = document.createElement("link")
		preload.rel = "modulepreload"
		preload.href = "/assets/missing-chunk.js"
		document.body.appendChild(preload)
		preload.dispatchEvent(new Event("error"))

		// Same for an <img> (and, by the same element-agnostic rule, fonts).
		const img = document.createElement("img")
		img.src = "/assets/missing.png"
		document.body.appendChild(img)
		img.dispatchEvent(new Event("error"))

		expect(document.getElementById("roo-webview-boot-fallback")).toBeNull()
		expect(realPostMessage).not.toHaveBeenCalled()

		// A genuinely failed <script> (the entry module or a dynamically
		// imported chunk) IS fatal: paint the fallback and post reason=load.
		const script = document.createElement("script")
		script.src = "/assets/index.js"
		document.body.appendChild(script)
		script.dispatchEvent(new Event("error"))

		expect(document.getElementById("roo-webview-boot-fallback")).not.toBeNull()
		expect(realPostMessage).toHaveBeenCalledTimes(1)
		expect(realPostMessage).toHaveBeenCalledWith({ type: "webviewBootFailure", reason: "load" })
	})

	it("H1: wraps a non-writable but CONFIGURABLE acquireVsCodeApi via defineProperty and reports a terminal failure", () => {
		const { realPostMessage } = installNonWritableVsCodeApiStub()
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

		// Installing the guard must not throw even though the strict-mode wrapper
		// assignment onto the non-writable property fails.
		expect(() => new Function(buildWebviewBootGuardScriptBody())()).not.toThrow()

		// H1: the configurable handle is re-wrapped NON-DESTRUCTIVELY, so the
		// install SUCCEEDS and no failure diagnostic is logged.
		expect(warnSpy).not.toHaveBeenCalledWith(
			expect.stringContaining("[webview-boot-guard] install step failed: api-wrapper"),
		)

		// The app still receives a working, MEMOIZED handle (no theft).
		const acquire = Reflect.get(window, "acquireVsCodeApi") as () => GuardApi
		const handle = acquire()
		expect(typeof handle.postMessage).toBe("function")
		expect(acquire()).toBe(handle)

		// A terminal watchdog failure is now HOST-VISIBLE through the wrapper.
		vi.advanceTimersByTime(BOOT_WATCHDOG_TIMEOUT_MS + 1)

		expect(document.getElementById("roo-webview-boot-fallback")).not.toBeNull()
		expect(realPostMessage).toHaveBeenCalledTimes(1)
		expect(realPostMessage).toHaveBeenCalledWith({ type: "webviewBootFailure", reason: "watchdog" })

		warnSpy.mockRestore()
	})

	it("clears a late-mounted fallback via the independent #root poll when no disarm arrives (NEW-1)", () => {
		const { realPostMessage } = evaluateGuard()

		// Watchdog trips on an empty #root: the fallback is painted.
		vi.advanceTimersByTime(BOOT_WATCHDOG_TIMEOUT_MS + 1)
		expect(document.getElementById("roo-webview-boot-fallback")).not.toBeNull()
		expect(realPostMessage).toHaveBeenCalledWith({ type: "webviewBootFailure", reason: "watchdog" })

		// The app finally mounts, but NO webviewDidLaunch is posted (the guard's
		// wrapper never observes the disarm). Only the independent #root poll can
		// clear the stale "failed to load" block over the now-working UI.
		document.getElementById("root")?.appendChild(document.createElement("div"))
		vi.advanceTimersByTime(BOOT_FALLBACK_CLEAR_POLL_MS)

		expect(document.getElementById("roo-webview-boot-fallback")).toBeNull()
	})

	it("H1: still clears a late-mounted fallback via the #root poll when the wrapper is installed via defineProperty (NEW-1)", () => {
		const { realPostMessage } = installNonWritableVsCodeApiStub()
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

		new Function(buildWebviewBootGuardScriptBody())()

		// H1: the configurable handle was re-wrapped, so the install succeeded and
		// no failure diagnostic is logged…
		expect(warnSpy).not.toHaveBeenCalledWith(
			expect.stringContaining("[webview-boot-guard] install step failed: api-wrapper"),
		)

		// …the watchdog paints the fallback and reports it…
		vi.advanceTimersByTime(BOOT_WATCHDOG_TIMEOUT_MS + 1)
		expect(document.getElementById("roo-webview-boot-fallback")).not.toBeNull()
		expect(realPostMessage).toHaveBeenCalledWith({ type: "webviewBootFailure", reason: "watchdog" })

		// …and the independent #root poll still clears it once the app mounts late.
		document.getElementById("root")?.appendChild(document.createElement("div"))
		vi.advanceTimersByTime(BOOT_FALLBACK_CLEAR_POLL_MS)

		expect(document.getElementById("roo-webview-boot-fallback")).toBeNull()

		warnSpy.mockRestore()
	})

	it("stops the #root poll after clearing and leaks no timer (NEW-1)", () => {
		evaluateGuard()

		vi.advanceTimersByTime(BOOT_WATCHDOG_TIMEOUT_MS + 1)
		document.getElementById("root")?.appendChild(document.createElement("div"))
		vi.advanceTimersByTime(BOOT_FALLBACK_CLEAR_POLL_MS)

		// The interval AND its bounded deadline are both cancelled on clear.
		expect(vi.getTimerCount()).toBe(0)

		// And nothing is re-armed afterwards, even well past the maximum window.
		vi.advanceTimersByTime(BOOT_FALLBACK_CLEAR_MAX_MS * 2)
		expect(vi.getTimerCount()).toBe(0)
		expect(document.getElementById("roo-webview-boot-fallback")).toBeNull()
	})

	it("gives up the #root poll at the bounded maximum when the app never mounts (NEW-1)", () => {
		evaluateGuard()

		vi.advanceTimersByTime(BOOT_WATCHDOG_TIMEOUT_MS + 1)
		expect(document.getElementById("roo-webview-boot-fallback")).not.toBeNull()

		// Past the bound the poll stops: no timer may survive it.
		vi.advanceTimersByTime(BOOT_FALLBACK_CLEAR_MAX_MS)
		expect(vi.getTimerCount()).toBe(0)
	})

	it("H1 residual: only a load failure posts via a last-resort raw acquire when the wrapper cannot be installed at all", () => {
		// MUST be the LAST test in this file: the non-configurable global cannot be
		// removed in `afterEach`, so nothing later may redefine it.
		const { realPostMessage, acquireCallCount } = installNonConfigurableVsCodeApiStub()
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

		// --- Phase 1: a watchdog trip must NOT steal the single-use handle ---
		new Function(buildWebviewBootGuardScriptBody())()

		// Neither the assignment nor defineProperty could wrap the handle, so the
		// F-4 diagnostic fires…
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining("[webview-boot-guard] install step failed: api-wrapper"),
		)
		// …and the guard has NOT touched the handle yet.
		expect(acquireCallCount()).toBe(0)

		vi.advanceTimersByTime(BOOT_WATCHDOG_TIMEOUT_MS + 1)

		// The in-panel fallback is still painted (the user-facing signal remains)…
		expect(document.getElementById("roo-webview-boot-fallback")).not.toBeNull()
		// …but a watchdog may be a slow-but-healthy mount, so the guard must NOT
		// consume the app's single-use handle and must NOT post a possibly
		// false-positive failure to the host. A watchdog is deliberately SILENT to
		// the host in this abnormal environment.
		expect(realPostMessage).not.toHaveBeenCalled()
		expect(acquireCallCount()).toBe(0)

		// --- Phase 2: a <script>/entry-module load failure DOES post ---
		// A fresh guard instance (its own `failed`/`postedFailure` latches) proves
		// the load path independently, because a single instance latches on its
		// first failure and would ignore the later trigger.
		document.body.innerHTML = '<div id="root"></div>'
		new Function(buildWebviewBootGuardScriptBody())()

		const script = document.createElement("script")
		script.src = "/assets/index.js"
		document.body.appendChild(script)
		script.dispatchEvent(new Event("error"))

		// "load" unambiguously means the entry module never ran, so consuming the
		// raw single-use handle is safe: the host DOES see the typed failure.
		expect(realPostMessage).toHaveBeenCalledTimes(1)
		expect(realPostMessage).toHaveBeenCalledWith({ type: "webviewBootFailure", reason: "load" })
		expect(acquireCallCount()).toBe(1)

		warnSpy.mockRestore()
	})
})
