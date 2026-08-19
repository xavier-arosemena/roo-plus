import { useState } from "react"
import { renderHook } from "@testing-library/react"

import { usePrimitiveSync } from "../usePrimitiveSync"

describe("usePrimitiveSync", () => {
	it("should_not_fire_on_mount_when_trigger_matches_initial_value", () => {
		// Arrange
		const callback = vi.fn()

		// Act
		renderHook(() => usePrimitiveSync("initial", callback))

		// Assert
		expect(callback).not.toHaveBeenCalled()
	})

	it("should_fire_once_when_trigger_changes_to_a_different_primitive", () => {
		// Arrange
		const callback = vi.fn()
		let trigger: string | undefined = "a"

		// Act
		const { rerender } = renderHook(() => usePrimitiveSync(trigger, callback))
		trigger = "b"
		rerender()

		// Assert
		expect(callback).toHaveBeenCalledTimes(1)
	})

	it("should_pass_prev_and_next_values_to_the_callback", () => {
		// Arrange
		const callback = vi.fn()
		let trigger: string | undefined = "a"

		// Act
		const { rerender } = renderHook(() => usePrimitiveSync(trigger, callback))
		trigger = "b"
		rerender()
		trigger = undefined
		rerender()

		// Assert
		expect(callback).toHaveBeenNthCalledWith(1, "a", "b")
		expect(callback).toHaveBeenNthCalledWith(2, "b", undefined)
	})

	it("should_not_fire_on_unrelated_rerenders_with_the_same_trigger", () => {
		// Arrange
		const callback = vi.fn()
		const trigger = "stable"

		// Act: many unrelated re-renders while the trigger is value-stable
		const { rerender } = renderHook(() => usePrimitiveSync(trigger, callback))
		for (let i = 0; i < 10; i++) {
			rerender()
		}

		// Assert
		expect(callback).not.toHaveBeenCalled()
	})

	it("should_fire_again_when_trigger_changes_back_and_forth", () => {
		// Arrange
		const callback = vi.fn()
		let trigger: string | undefined = undefined

		// Act
		const { rerender } = renderHook(() => usePrimitiveSync(trigger, callback))
		trigger = "on"
		rerender()
		trigger = undefined
		rerender()
		trigger = "on"
		rerender()

		// Assert
		expect(callback).toHaveBeenCalledTimes(3)
		expect(callback).toHaveBeenNthCalledWith(3, undefined, "on")
	})

	it("should_handle_boolean_transitions", () => {
		// Arrange
		const callback = vi.fn()
		let trigger = false

		// Act
		const { rerender } = renderHook(() => usePrimitiveSync(trigger, callback))
		trigger = true
		rerender()

		// Assert
		expect(callback).toHaveBeenCalledTimes(1)
		expect(callback).toHaveBeenCalledWith(false, true)
	})

	it("should_converge_without_render_loops_when_callback_sets_state", () => {
		// Arrange: mirror the real usage where the callback calls setState
		let trigger: string | undefined = "a"

		// Act
		const { result, rerender } = renderHook(() => {
			const [count, setCount] = useState(0)
			usePrimitiveSync(trigger, () => setCount((current) => current + 1))
			return count
		})

		expect(result.current).toBe(0)

		trigger = "b"
		rerender()
		// Callback fires once during the change render; converges immediately
		expect(result.current).toBe(1)

		// Subsequent re-renders with the same trigger must not cascade
		rerender()
		rerender()
		rerender()
		expect(result.current).toBe(1)
	})

	it("should_accept_numbers_as_triggers", () => {
		// Arrange
		const callback = vi.fn()
		let trigger: number | undefined = 1

		// Act
		const { rerender } = renderHook(() => usePrimitiveSync(trigger, callback))
		trigger = 2
		rerender()

		// Assert
		expect(callback).toHaveBeenCalledTimes(1)
		expect(callback).toHaveBeenCalledWith(1, 2)
	})
})
