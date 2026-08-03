import type { ExtensionMessage, ClineMessage } from "@roo-code/types"

import { MessageProcessor } from "../message-processor.js"
import { StateStore } from "../state-store.js"
import { TypedEventEmitter } from "../events.js"

function createStateMessage(messages: ClineMessage[] = [], mode?: string): ExtensionMessage {
	return { type: "state", state: { clineMessages: messages, mode } } as ExtensionMessage
}

describe("MessageProcessor boundary validation", () => {
	let store: StateStore
	let emitter: TypedEventEmitter
	let processor: MessageProcessor

	beforeEach(() => {
		store = new StateStore()
		emitter = new TypedEventEmitter()
		processor = new MessageProcessor(store, emitter, { debug: false })
	})

	it("dispatches a valid unregistered extension message", () => {
		const errorSpy = vi.spyOn(emitter, "emit")

		processor.processMessage(createStateMessage([], "code"))

		// The extension→CLI "state" type is not in the webview registry, so it
		// passes the boundary structurally and still dispatches.
		expect(store.getCurrentMode()).toBe("code")
		expect(errorSpy).not.toHaveBeenCalledWith("error", expect.anything())
	})

	it("rejects a malformed registered message without dispatching", () => {
		const errorSpy = vi.spyOn(emitter, "emit")

		expect(() => {
			// checkpointDiff is registered; this payload is missing commitHash.
			processor.processMessage({ type: "checkpointDiff", payload: { mode: "full" } })
		}).not.toThrow()

		// Nothing was dispatched: no state change and no error routed.
		expect(store.getCurrentMode()).toBeUndefined()
		expect(store.getMessages()).toEqual([])
		expect(errorSpy).not.toHaveBeenCalledWith("error", expect.anything())
	})

	it("rejects non-object input without throwing", () => {
		const errorSpy = vi.spyOn(emitter, "emit")

		expect(() => {
			processor.processMessage(null)
		}).not.toThrow()
		expect(() => {
			processor.processMessage(undefined)
		}).not.toThrow()

		expect(errorSpy).not.toHaveBeenCalledWith("error", expect.anything())
	})

	it("rejects an object missing its type field", () => {
		const errorSpy = vi.spyOn(emitter, "emit")

		expect(() => {
			processor.processMessage({ text: "no type here" })
		}).not.toThrow()

		expect(store.getMessages()).toEqual([])
		expect(errorSpy).not.toHaveBeenCalledWith("error", expect.anything())
	})

	it("passes through unregistered types (ignored by the dispatcher)", () => {
		const errorSpy = vi.spyOn(emitter, "emit")

		expect(() => {
			processor.processMessage({ type: "someUnknownType", value: 1 })
		}).not.toThrow()

		expect(store.getMessages()).toEqual([])
		expect(errorSpy).not.toHaveBeenCalledWith("error", expect.anything())
	})

	it("processMessages routes every message through the boundary", () => {
		const errorSpy = vi.spyOn(emitter, "emit")

		processor.processMessages([
			createStateMessage([], "architect"),
			null,
			{ type: "checkpointRestore", payload: { ts: 1, commitHash: "abc", mode: "bogus" } },
		])

		// The valid message dispatches; the malformed ones are rejected.
		expect(store.getCurrentMode()).toBe("architect")
		expect(errorSpy).not.toHaveBeenCalledWith("error", expect.anything())
	})
})
