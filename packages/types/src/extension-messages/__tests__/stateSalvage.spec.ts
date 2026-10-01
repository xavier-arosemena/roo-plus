// npx vitest run extension-messages/__tests__/stateSalvage.spec.ts

import { salvageExtensionState, parseExtensionMessage } from "../index.js"

/**
 * T2.1 (gray-webview follow-up): a `state` push that FAILS strict validation must
 * still be salvable so the webview can hydrate instead of staying blank forever.
 *
 * The salvage helper STRIPS unknown keys and DROPS only the malformed known
 * values; the strict schema itself is untouched (it keeps `.passthrough()` so a
 * VALID push never loses unmodeled `ExtensionState` fields).
 */
describe("salvageExtensionState", () => {
	it("strips unknown/extra keys and keeps known valid fields", () => {
		const salvaged = salvageExtensionState({
			version: "1.0.0",
			mode: "code",
			cwd: "/workspace",
			// Unknown to the subset — must NOT survive the salvage.
			someFutureField: 123,
			anotherUnknown: { nested: true },
		})

		expect(salvaged).toEqual({ version: "1.0.0", mode: "code", cwd: "/workspace" })
		expect(salvaged).not.toHaveProperty("someFutureField")
		expect(salvaged).not.toHaveProperty("anotherUnknown")
	})

	it("drops a malformed known scalar but keeps the other known fields", () => {
		const salvaged = salvageExtensionState({
			version: "1.0.0",
			mode: 42, // wrong type for a known scalar → dropped
			cwd: "/workspace",
			showRooIgnoredFiles: true,
		})

		expect(salvaged).toEqual({ version: "1.0.0", cwd: "/workspace", showRooIgnoredFiles: true })
		expect(salvaged).not.toHaveProperty("mode")
	})

	it("returns {} for a non-object / array / nullish body (hydrate with defaults)", () => {
		expect(salvageExtensionState(undefined)).toEqual({})
		expect(salvageExtensionState(null)).toEqual({})
		expect(salvageExtensionState("nope")).toEqual({})
		expect(salvageExtensionState([1, 2, 3])).toEqual({})
	})

	it("salvages the usable subset of a `state` message the strict boundary rejects", () => {
		const raw = { type: "state", state: { version: "1.0.0", mode: 42, cwd: "/workspace" } }

		// The strict boundary rejects the whole push (one bad scalar)…
		expect(parseExtensionMessage(raw).ok).toBe(false)

		// …but the salvage path recovers what is usable, so hydration is not vetoed.
		const body = (raw as { state: unknown }).state
		expect(salvageExtensionState(body)).toEqual({ version: "1.0.0", cwd: "/workspace" })
	})
})
