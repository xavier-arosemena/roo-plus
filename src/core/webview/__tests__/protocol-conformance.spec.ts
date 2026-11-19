import fs from "node:fs"
import path from "node:path"

import { parseExtensionMessage, parseWebviewMessage } from "@roo-code/types"

/**
 * Protocol conformance at the two boundaries.
 *
 * Why this exists: the extension host and the CLI both validate protocol
 * messages, and they are separate code paths (see ADR
 * `docs/adr/adr-cli-second-implementation.md`). Parity used to be a convention
 * that nothing checked. These tests pin the behaviour that both boundaries must
 * share:
 *
 * - a known type with a valid payload is accepted;
 * - a known type with a malformed payload is rejected;
 * - an unknown type is rejected (fail-closed, no pass-through);
 * - non-object input never throws.
 *
 * The last test is structural: it asserts the CLI still consumes the shared
 * parser instead of hand-rolling its own, which is the only thing stopping the
 * two boundaries from drifting silently.
 */
describe("protocol conformance", () => {
	describe("inbound (webview → host)", () => {
		it("accepts a well-formed message", () => {
			expect(parseWebviewMessage({ type: "webviewDidLaunch" }).ok).toBe(true)
		})

		it("rejects a registered type whose payload is malformed", () => {
			// `updateTodoList` requires `payload.todos`.
			expect(parseWebviewMessage({ type: "updateTodoList" }).ok).toBe(false)
		})

		it("rejects an unknown type instead of passing it through", () => {
			expect(parseWebviewMessage({ type: "definitelyNotARealMessageType" }).ok).toBe(false)
		})

		it("rejects non-object input without throwing", () => {
			expect(() => parseWebviewMessage("not-a-message")).not.toThrow()
			expect(parseWebviewMessage("not-a-message").ok).toBe(false)
			expect(parseWebviewMessage(null).ok).toBe(false)
			expect(parseWebviewMessage(undefined).ok).toBe(false)
		})
	})

	describe("outbound (host → webview)", () => {
		it("accepts a well-formed message", () => {
			expect(parseExtensionMessage({ type: "livenessPing", livenessPingSeq: 1 }).ok).toBe(true)
		})

		it("rejects a liveness ping without its sequence number", () => {
			expect(parseExtensionMessage({ type: "livenessPing" }).ok).toBe(false)
		})

		it("rejects a registered type whose payload is malformed", () => {
			// `state` requires a `state` payload.
			expect(parseExtensionMessage({ type: "state" }).ok).toBe(false)
		})

		it("rejects an unknown type instead of passing it through", () => {
			expect(parseExtensionMessage({ type: "definitelyNotARealMessageType" }).ok).toBe(false)
		})
	})

	describe("single boundary (ADR: CLI as a supported second implementation)", () => {
		it("the CLI message processor uses the shared parser rather than hand-rolling one", () => {
			const candidates = [
				path.resolve(process.cwd(), "apps/cli/src/agent/message-processor.ts"),
				path.resolve(process.cwd(), "../apps/cli/src/agent/message-processor.ts"),
			]
			const processorPath = candidates.find((candidate) => fs.existsSync(candidate))

			expect(processorPath, `CLI message processor not found from cwd ${process.cwd()}`).toBeTruthy()

			const source = fs.readFileSync(processorPath as string, "utf8")

			expect(source).toMatch(/parseWebviewMessage|parseExtensionMessage/)
		})
	})
})
