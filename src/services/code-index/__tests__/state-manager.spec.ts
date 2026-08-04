import { describe, it, expect, beforeEach, vi } from "vitest"
import { CodeIndexStateManager } from "../state-manager"

// Minimal vscode.EventEmitter double so the real state manager can fire and
// observe progress events outside the extension host.
vi.mock("vscode", () => {
	class MockEventEmitter<T> {
		private listeners: Array<(data: T) => void> = []

		readonly event = (listener: (data: T) => void): (() => void) => {
			this.listeners.push(listener)
			return () => {
				this.listeners = this.listeners.filter((l) => l !== listener)
			}
		}

		fire = (data: T): void => {
			for (const listener of [...this.listeners]) {
				listener(data)
			}
		}

		dispose = vi.fn()
	}

	return { EventEmitter: MockEventEmitter }
})

describe("CodeIndexStateManager", () => {
	let stateManager: CodeIndexStateManager
	let statuses: Array<ReturnType<CodeIndexStateManager["getCurrentStatus"]>>

	beforeEach(() => {
		stateManager = new CodeIndexStateManager()
		statuses = []
		stateManager.onProgressUpdate((status) => statuses.push(status))
	})

	describe("setSystemState", () => {
		it("updates state and fires a progress event on change", () => {
			stateManager.setSystemState("Indexing", "Working...")

			expect(stateManager.state).toBe("Indexing")
			expect(statuses).toHaveLength(1)
			expect(statuses[0].systemStatus).toBe("Indexing")
			expect(statuses[0].message).toBe("Working...")
		})

		it("resets progress counters when leaving an indexing state", () => {
			stateManager.reportBlockIndexingProgress(5, 10)
			expect(stateManager.getCurrentStatus().processedItems).toBe(5)

			stateManager.setSystemState("Indexed", "Done")

			expect(stateManager.getCurrentStatus().systemStatus).toBe("Indexed")
			expect(stateManager.getCurrentStatus().processedItems).toBe(0)
			expect(stateManager.getCurrentStatus().totalItems).toBe(0)
		})
	})

	describe("setSystemStateSilent", () => {
		it("updates the shared state without firing a progress event", () => {
			stateManager.setSystemState("Error", "download failed")
			expect(statuses).toHaveLength(1)

			stateManager.setSystemStateSilent("Standby")

			expect(stateManager.state).toBe("Standby")
			// No additional event fired for the silent transition.
			expect(statuses).toHaveLength(1)
		})

		it("resets counters when leaving an indexing state, same as setSystemState", () => {
			stateManager.reportBlockIndexingProgress(3, 7)
			expect(stateManager.getCurrentStatus().processedItems).toBe(3)

			stateManager.setSystemStateSilent("Indexed")

			expect(stateManager.getCurrentStatus().systemStatus).toBe("Indexed")
			expect(stateManager.getCurrentStatus().processedItems).toBe(0)
			expect(stateManager.getCurrentStatus().totalItems).toBe(0)
		})
	})
})
