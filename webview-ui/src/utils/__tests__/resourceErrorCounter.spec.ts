import { getResourceErrorCount, installResourceErrorCounter } from "../resourceErrorCounter"

/**
 * T2.3 (gray-webview follow-up): the renderer counts RESOURCE load failures
 * (asset 401s) as an integer so the `livenessPong` can carry it. Only element
 * `error` events count; a script exception (window target) is not a resource
 * failure and must not inflate the count.
 */
describe("resourceErrorCounter", () => {
	beforeEach(() => {
		installResourceErrorCounter()
	})

	it("counts element-targeted resource errors (script/link/img)", () => {
		const before = getResourceErrorCount()

		const img = document.createElement("img")
		document.body.appendChild(img)
		// Resource `error` events do not bubble; the counter uses the capture phase.
		img.dispatchEvent(new Event("error"))
		img.remove()

		expect(getResourceErrorCount()).toBe(before + 1)
	})

	it("ignores a window-targeted script exception", () => {
		const before = getResourceErrorCount()

		window.dispatchEvent(new Event("error"))

		expect(getResourceErrorCount()).toBe(before)
	})

	it("is idempotent (installing twice never double-counts)", () => {
		installResourceErrorCounter()

		const before = getResourceErrorCount()
		const img = document.createElement("img")
		document.body.appendChild(img)
		img.dispatchEvent(new Event("error"))
		img.remove()

		expect(getResourceErrorCount()).toBe(before + 1)
	})
})
