import { isTrustedMessage } from "../trustedMessages"

describe("isTrustedMessage", () => {
	const makeEvent = (source: MessageEventSource | null, origin: string) =>
		new MessageEvent("message", { source, origin })

	it("trusts a message from the current window with a matching origin", () => {
		expect(isTrustedMessage(makeEvent(window, window.origin))).toBe(true)
	})

	it("trusts a message delivered via the parent frame with a matching origin (remote webviews)", () => {
		expect(isTrustedMessage(makeEvent(window.parent, window.origin))).toBe(true)
	})

	it("trusts a message delivered via the top frame with a matching origin", () => {
		expect(isTrustedMessage(makeEvent(window.top, window.origin))).toBe(true)
	})

	it("trusts a message from a DIFFERENT same-origin window (VSCodium Remote-SSH forwarding)", () => {
		// THE regression case: on VSCodium Desktop + Remote-SSH the extension-host
		// message is forwarded through an intermediate window with srcCtor=Window
		// that is neither window, window.parent, nor window.top — but its origin
		// equals window.origin. Trust must be decided by origin, not source.
		const forwardingFrame = Object.create(window) as Window
		expect(isTrustedMessage(makeEvent(forwardingFrame, window.origin))).toBe(true)
	})

	it("trusts a message with a null source (programmatic dispatch)", () => {
		expect(isTrustedMessage(makeEvent(null, ""))).toBe(true)
	})

	it("trusts a message with a null source and 'null' origin", () => {
		expect(isTrustedMessage(makeEvent(null, "null"))).toBe(true)
	})

	it("trusts a message with an empty origin and the current window as source", () => {
		expect(isTrustedMessage(makeEvent(window, ""))).toBe(true)
	})

	it("rejects a cross-origin message even when the source is the current window", () => {
		expect(isTrustedMessage(makeEvent(window, "https://evil.example.com"))).toBe(false)
	})

	it("rejects a cross-origin message even when delivered via the parent frame", () => {
		expect(isTrustedMessage(makeEvent(window.parent, "https://evil.example.com"))).toBe(false)
	})

	it("rejects a cross-origin message from a foreign same-shape window", () => {
		const otherFrame = Object.create(window) as Window
		expect(isTrustedMessage(makeEvent(otherFrame, "https://evil.example.com"))).toBe(false)
	})

	it("trusts a vscode-webview:// origin from the current window", () => {
		expect(isTrustedMessage(makeEvent(window, "vscode-webview://0a1b2c3d4e5f"))).toBe(true)
	})

	it("trusts a vscode-webview:// origin delivered via the parent frame", () => {
		expect(isTrustedMessage(makeEvent(window.parent, "vscode-webview://0a1b2c3d4e5f"))).toBe(true)
	})

	it("trusts a vscode-webview:// origin from any same-origin window", () => {
		const otherFrame = Object.create(window) as Window
		expect(isTrustedMessage(makeEvent(otherFrame, "vscode-webview://0a1b2c3d4e5f"))).toBe(true)
	})
})
