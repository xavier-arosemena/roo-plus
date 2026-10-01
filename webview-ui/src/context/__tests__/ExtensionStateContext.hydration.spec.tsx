import { render, screen, act } from "@/utils/test-utils"

import { ExtensionStateContextProvider, useExtensionState, HYDRATION_TIMEOUT_MS } from "../ExtensionStateContext"

vi.mock("@src/utils/vscode")

/**
 * T2.1 (gray-webview follow-up): hydration is NEVER permanently vetoed.
 *
 *  - a valid `state` hydrates;
 *  - a malformed `state` (bad known scalar + unknown extras) still hydrates via
 *    salvage instead of vetoing hydration forever;
 *  - an unknown message TYPE is still rejected (fail-closed allowlist unchanged);
 *  - if no `state` arrives within {@link HYDRATION_TIMEOUT_MS}, the provider
 *    hydrates with defaults and shows a non-blocking banner (fake-timer test).
 */
const HydrationProbe = () => {
	const { didHydrateState, hydrationTimedOut, version, mode } = useExtensionState()

	return (
		<div>
			<div data-testid="hydrated">{String(didHydrateState)}</div>
			<div data-testid="timed-out">{String(hydrationTimedOut)}</div>
			<div data-testid="version">{version}</div>
			<div data-testid="mode">{mode}</div>
		</div>
	)
}

describe("ExtensionStateContext: hydration is never vetoed (T2.1)", () => {
	const dispatch = (data: Record<string, unknown>) =>
		act(() => {
			window.dispatchEvent(new MessageEvent("message", { data }))
		})

	const renderProvider = () =>
		render(
			<ExtensionStateContextProvider>
				<HydrationProbe />
			</ExtensionStateContextProvider>,
		)

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("hydrates from a valid `state` message", () => {
		renderProvider()

		expect(screen.getByTestId("hydrated").textContent).toBe("false")

		dispatch({ type: "state", state: { version: "1.0.0", mode: "code" } })

		expect(screen.getByTestId("hydrated").textContent).toBe("true")
		expect(screen.getByTestId("timed-out").textContent).toBe("false")
		expect(screen.getByTestId("version").textContent).toBe("1.0.0")
		expect(screen.getByTestId("mode").textContent).toBe("code")
	})

	it("still hydrates a malformed `state` via salvage (bad known scalar + unknown extras)", () => {
		renderProvider()
		const initialMode = screen.getByTestId("mode").textContent

		dispatch({
			type: "state",
			state: {
				version: "1.0.0",
				mode: 42, // wrong type for a known scalar — dropped by salvage
				someUnknownField: { not: "modeled" }, // stripped by salvage
			},
		})

		// The whole push would have failed strict validation; salvage keeps it.
		expect(screen.getByTestId("hydrated").textContent).toBe("true")
		expect(screen.getByTestId("version").textContent).toBe("1.0.0")
		// The malformed `mode` was dropped (the pre-existing value is retained),
		// not propagated and not reset to the malformed value.
		expect(screen.getByTestId("mode").textContent).toBe(initialMode)
		expect(initialMode).not.toBe("42")
	})

	it("still REJECTS an unknown message TYPE (fail-closed allowlist unchanged)", () => {
		renderProvider()

		dispatch({ type: "totallyUnknownOutboundType", someField: 123 })

		// No hydration from an unregistered type — the allowlist stays fail-closed.
		expect(screen.getByTestId("hydrated").textContent).toBe("false")
	})

	it("hydrates with defaults and shows the banner when no `state` arrives in time", () => {
		vi.useFakeTimers()
		try {
			renderProvider()

			expect(screen.getByTestId("hydrated").textContent).toBe("false")

			act(() => {
				vi.advanceTimersByTime(HYDRATION_TIMEOUT_MS + 1)
			})

			expect(screen.getByTestId("hydrated").textContent).toBe("true")
			expect(screen.getByTestId("timed-out").textContent).toBe("true")
			expect(screen.getByTestId("hydration-timeout-banner")).toBeTruthy()
		} finally {
			vi.useRealTimers()
		}
	})

	it("does not show the timeout banner once a valid `state` has hydrated", () => {
		vi.useFakeTimers()
		try {
			renderProvider()

			dispatch({ type: "state", state: { version: "2.0.0" } })

			act(() => {
				vi.advanceTimersByTime(HYDRATION_TIMEOUT_MS + 1)
			})

			expect(screen.getByTestId("timed-out").textContent).toBe("false")
			expect(screen.queryByTestId("hydration-timeout-banner")).toBeNull()
		} finally {
			vi.useRealTimers()
		}
	})
})
