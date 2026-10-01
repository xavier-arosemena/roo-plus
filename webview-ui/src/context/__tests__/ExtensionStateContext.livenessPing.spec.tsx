import { render, act } from "@/utils/test-utils"

import { vscode } from "@src/utils/vscode"
import { installResourceErrorCounter } from "@src/utils/resourceErrorCounter"

import { ExtensionStateContextProvider } from "../ExtensionStateContext"

vi.mock("@src/utils/vscode")

/**
 * Renderer-liveness probe, webview half (2026-09-18 gray-webview capture): the
 * provider must echo a `livenessPing` back as a `livenessPong` with the SAME
 * sequence number and send nothing else — the host times that round trip.
 */
describe("ExtensionStateContext: renderer-liveness reply", () => {
	const dispatch = (data: Record<string, unknown>) =>
		act(() => {
			window.dispatchEvent(new MessageEvent("message", { data }))
		})

	const renderProvider = () =>
		render(
			<ExtensionStateContextProvider>
				<div data-testid="probe" />
			</ExtensionStateContextProvider>,
		)

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("answers a livenessPing with a livenessPong carrying the same sequence number", () => {
		renderProvider()

		dispatch({ type: "livenessPing", livenessPingSeq: 42 })

		// T2.3: the pong also carries the integer resource-error count (0 here —
		// no resource load failed in this test). F-2: the salvaged-state count is
		// carried on every pong too (0 here — no salvage happened).
		expect(vscode.postMessage).toHaveBeenCalledWith({
			type: "livenessPong",
			livenessPongSeq: 42,
			resourceErrorCount: 0,
			salvagedStateCount: 0,
		})
	})

	it("sends no pong for a ping without a numeric sequence number", () => {
		renderProvider()

		dispatch({ type: "livenessPing" })

		expect(vscode.postMessage).not.toHaveBeenCalledWith(expect.objectContaining({ type: "livenessPong" }))
	})

	it("carries a non-zero resource-error count after a resource load failure (T2.3)", () => {
		installResourceErrorCounter()
		const img = document.createElement("img")
		document.body.appendChild(img)
		img.dispatchEvent(new Event("error"))
		img.remove()

		renderProvider()
		dispatch({ type: "livenessPing", livenessPingSeq: 7 })

		expect(vscode.postMessage).toHaveBeenCalledWith(
			expect.objectContaining({ type: "livenessPong", livenessPongSeq: 7, resourceErrorCount: 1 }),
		)
	})

	it("counts a salvaged malformed `state` and reports it on the next pong (F-2)", () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
		renderProvider()

		// A KNOWN `state` message whose body fails strict validation: `cwd` must be
		// a string, so the whole message is rejected and the T2.1 salvage path runs.
		dispatch({ type: "state", state: { version: "1.0.0", cwd: 42 } })
		dispatch({ type: "livenessPing", livenessPingSeq: 8 })

		// The repair is observable host-side as an integer count, not just a
		// webview-console warning.
		expect(vscode.postMessage).toHaveBeenCalledWith(
			expect.objectContaining({ type: "livenessPong", livenessPongSeq: 8, salvagedStateCount: 1 }),
		)

		warnSpy.mockRestore()
	})
})
