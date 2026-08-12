import type { ExtensionMessage, ClineMessage } from "@roo-code/types"

import { MessageProcessor } from "../message-processor.js"
import { StateStore } from "../state-store.js"
import { TypedEventEmitter } from "../events.js"

function createStateMessage(messages: ClineMessage[] = [], mode?: string): ExtensionMessage {
	return { type: "state", state: { clineMessages: messages, mode } } as ExtensionMessage
}

/**
 * Malformed payloads for the 5 baseline types registered in
 * `extensionMessageSchemas` (see packages/types/src/extension-messages). Each
 * violates its schema's required shape and must be rejected by the boundary.
 */
const malformedRegisteredMessages: Array<{ name: string; message: unknown }> = [
	{
		name: "state",
		// state schema requires a `state` object.
		message: { type: "state" },
	},
	{
		name: "commandExecutionStatus",
		// commandExecutionStatus schema requires a string `text`.
		message: { type: "commandExecutionStatus" },
	},
	{
		name: "mcpExecutionStatus",
		// mcpExecutionStatus schema requires a string `text`.
		message: { type: "mcpExecutionStatus", text: 123 },
	},
	{
		name: "fileContent",
		// fileContent schema requires `fileContent.{path, content}`.
		message: { type: "fileContent", fileContent: { path: "/repo/a.ts" } },
	},
	{
		name: "indexingStatusUpdate",
		// indexingStatusUpdate schema requires `values.{systemStatus, processedItems, totalItems}`.
		message: { type: "indexingStatusUpdate", values: { systemStatus: "working" } },
	},
	{
		name: "messageUpdated",
		// messageUpdated schema requires `clineMessage` (the real producer shape);
		// the legacy `message` field does not satisfy it.
		message: { type: "messageUpdated", message: { type: "say", say: "text" } },
	},
]

describe("MessageProcessor boundary validation", () => {
	let store: StateStore
	let emitter: TypedEventEmitter
	let processor: MessageProcessor

	beforeEach(() => {
		store = new StateStore()
		emitter = new TypedEventEmitter()
		processor = new MessageProcessor(store, emitter, { debug: false })
	})

	it("dispatches a valid registered 'state' message", () => {
		const errorSpy = vi.spyOn(emitter, "emit")

		processor.processMessage(createStateMessage([], "code"))

		// The extension→CLI "state" type is registered in the extension boundary
		// and validates strictly; the well-formed payload dispatches.
		expect(store.getCurrentMode()).toBe("code")
		expect(errorSpy).not.toHaveBeenCalledWith("error", expect.anything())
	})

	it.each(malformedRegisteredMessages)(
		"rejects a malformed registered '$name' message without dispatching",
		({ message }) => {
			const errorSpy = vi.spyOn(emitter, "emit")

			expect(() => {
				processor.processMessage(message)
			}).not.toThrow()

			// Nothing was dispatched: no state change and no error routed.
			expect(store.getCurrentMode()).toBeUndefined()
			expect(store.getMessages()).toEqual([])
			expect(errorSpy).not.toHaveBeenCalledWith("error", expect.anything())
		},
	)

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

	it("rejects unregistered types at the boundary (fail-closed, not dispatched)", () => {
		const errorSpy = vi.spyOn(emitter, "emit")

		// Not in the extension registry → rejected by the hard-allowlist boundary
		// (fail-closed), debug-logged and dropped — never dispatched, no error routed.
		expect(() => {
			processor.processMessage({ type: "someUnknownType", value: 1 })
		}).not.toThrow()

		expect(store.getMessages()).toEqual([])
		expect(errorSpy).not.toHaveBeenCalledWith("error", expect.anything())
	})

	it("dispatches a valid registered 'messageUpdated' message", () => {
		const errorSpy = vi.spyOn(emitter, "emit")

		// `messageUpdated` (Phase 2, Domain 1) is now registered — the real
		// producer shape (`clineMessage`) validates and is dispatched to the store.
		const message: ExtensionMessage = {
			type: "messageUpdated",
			clineMessage: { ts: 1, type: "say", say: "text", text: "hello" },
		}
		processor.processMessage(message)

		expect(store.getMessages()).toEqual([{ ts: 1, type: "say", say: "text", text: "hello" }])
		expect(errorSpy).toHaveBeenCalledWith("messageUpdated", expect.anything())
		expect(errorSpy).not.toHaveBeenCalledWith("error", expect.anything())
	})

	it("processMessages routes every message through the boundary", () => {
		const errorSpy = vi.spyOn(emitter, "emit")

		processor.processMessages([
			createStateMessage([], "architect"),
			null,
			// Malformed registered extension type — rejected, not dispatched.
			{ type: "commandExecutionStatus" },
		])

		// The valid message dispatches; the malformed ones are rejected.
		expect(store.getCurrentMode()).toBe("architect")
		expect(errorSpy).not.toHaveBeenCalledWith("error", expect.anything())
	})
})
