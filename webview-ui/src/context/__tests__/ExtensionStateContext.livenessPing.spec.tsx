import { render, act } from "@/utils/test-utils"

import { vscode } from "@src/utils/vscode"

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

		expect(vscode.postMessage).toHaveBeenCalledWith({ type: "livenessPong", livenessPongSeq: 42 })
	})

	it("sends no pong for a ping without a numeric sequence number", () => {
		renderProvider()

		dispatch({ type: "livenessPing" })

		expect(vscode.postMessage).not.toHaveBeenCalledWith(expect.objectContaining({ type: "livenessPong" }))
	})
})
