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
 * Install an `acquireVsCodeApi` the guard CANNOT wrap: it is a NON-WRITABLE data
 * property, so the guard's strict-mode assignment
 * `window.acquireVsCodeApi = function () { ... }` throws a TypeError (F-4).
 *
 * Before the fix, that throw was swallowed by the single install `try` block and
 * skipped `armWatchdog()`, leaving the guard with ZERO protection. The real
 * `acquireVsCodeApi` is still callable, so the guard can still post its report.
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

	it("still arms the watchdog when the API wrapper cannot be installed (F-4 regression)", () => {
		const { realPostMessage } = installNonWritableVsCodeApiStub()
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

		// Installing the guard must not throw even though the strict-mode wrapper
		// assignment onto the non-writable property fails.
		expect(() => new Function(buildWebviewBootGuardScriptBody())()).not.toThrow()

		// F-4: the wrapper-install failure is REPORTED on a local static line, never
		// silently swallowed.
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining("[webview-boot-guard] install step failed: api-wrapper"),
		)

		// The watchdog was armed FIRST and independently, so a dead boot is still
		// detected: the fallback is painted and exactly one failure is reported.
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

	it("clears a late-mounted fallback via the #root poll even when the wrapper cannot install (NEW-1)", () => {
		const { realPostMessage } = installNonWritableVsCodeApiStub()
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

		new Function(buildWebviewBootGuardScriptBody())()

		// The wrapper could not be installed, so the webviewDidLaunch disarm hook is
		// never live…
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining("[webview-boot-guard] install step failed: api-wrapper"),
		)

		// …yet the watchdog still paints the fallback, and the independent #root
		// poll still clears it once the app mounts late.
		vi.advanceTimersByTime(BOOT_WATCHDOG_TIMEOUT_MS + 1)
		expect(document.getElementById("roo-webview-boot-fallback")).not.toBeNull()
		expect(realPostMessage).toHaveBeenCalledWith({ type: "webviewBootFailure", reason: "watchdog" })

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
})
