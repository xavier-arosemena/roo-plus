import { isTrustedMessage } from "../trustedMessages"

describe("isTrustedMessage", () => {
	let parentFrame: Window
	let topFrame: Window

	beforeEach(() => {
		// jsdom reports window.parent and window.top as the window itself, which
		// would make the remote-webview regression case pass trivially against
		// the old source check. Override them with distinct objects so the real
		// identity comparisons (own frame tree) are actually exercised.
		parentFrame = Object.create(window) as Window
		topFrame = Object.create(window) as Window
		Object.defineProperty(window, "parent", { configurable: true, value: parentFrame })
		Object.defineProperty(window, "top", { configurable: true, value: topFrame })
	})

	const makeEvent = (source: MessageEventSource | null, origin: string) =>
		new MessageEvent("message", { source, origin })

	it("trusts a message from the current window with a matching origin", () => {
		expect(isTrustedMessage(makeEvent(window, window.origin))).toBe(true)
	})

	it("trusts a message delivered via the parent frame with a matching origin (remote webviews)", () => {
		// THE regression case: remote/server webviews (VSCodium server, Remote
		// SSH over the web) deliver extension-host messages via the parent frame.
		expect(isTrustedMessage(makeEvent(window.parent, window.origin))).toBe(true)
	})

	it("trusts a message delivered via the top frame with a matching origin", () => {
		expect(isTrustedMessage(makeEvent(window.top, window.origin))).toBe(true)
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

	it("rejects a message from an unrelated frame/window even with a matching origin", () => {
		const otherFrame = Object.create(window) as Window
		expect(isTrustedMessage(makeEvent(otherFrame, window.origin))).toBe(false)
	})

	it("rejects a message from a non-frame source (e.g. a MessagePort) even with a matching origin", () => {
		// jsdom does not allow `new MessagePort()`, so build one via its prototype.
		const port = Object.create(MessagePort.prototype) as MessagePort
		expect(isTrustedMessage(makeEvent(port, window.origin))).toBe(false)
	})

	it("rejects a cross-origin message even when the source is the current window", () => {
		expect(isTrustedMessage(makeEvent(window, "https://evil.example.com"))).toBe(false)
	})

	it("rejects a cross-origin message even when delivered via the parent frame", () => {
		expect(isTrustedMessage(makeEvent(window.parent, "https://evil.example.com"))).toBe(false)
	})

	it("trusts a vscode-webview:// origin from the current window", () => {
		expect(isTrustedMessage(makeEvent(window, "vscode-webview://0a1b2c3d4e5f"))).toBe(true)
	})

	it("trusts a vscode-webview:// origin delivered via the parent frame", () => {
		expect(isTrustedMessage(makeEvent(window.parent, "vscode-webview://0a1b2c3d4e5f"))).toBe(true)
	})

	it("rejects a vscode-webview-prefixed but foreign source", () => {
		const otherFrame = Object.create(window) as Window
		expect(isTrustedMessage(makeEvent(otherFrame, "vscode-webview://0a1b2c3d4e5f"))).toBe(false)
	})
})
