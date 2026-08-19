import { useState } from "react"

/**
 * React-18 + react-hooks v7 + React Compiler safe "sync state when a
 * primitive input changes" hook.
 *
 * Replaces `useEffect(() => { setState(...) }, [trigger])` which trips
 * `react-hooks/set-state-in-effect`.
 *
 * Convergence: `trigger` MUST be a primitive (number | string | boolean |
 * null | undefined) whose value is stable across unrelated re-renders.
 * When it changes, the new value is written into state in the SAME render
 * pass, so the `trigger !== prevTrigger` guard is false on the very next
 * render. There is no feedback loop because the guard input is value-stable
 * (primitives compare by value, unlike object references which are recreated
 * every render).
 *
 * The `onTriggerChange` callback must be pure except for calling setState on
 * this same component (the React-endorsed "adjust state during render"
 * contract). Do NOT postMessage / mutate refs / run timers inside it.
 *
 * Note: the conditional render-phase setState is exactly the pattern
 * `react-hooks/set-state-in-render` permits — it only flags setState in
 * unconditional blocks or inside useMemo.
 */
export function usePrimitiveSync<T extends string | number | boolean | null | undefined>(
	trigger: T,
	onTriggerChange: (prev: T, next: T) => void,
): void {
	const [prevTrigger, setPrevTrigger] = useState<T>(trigger)

	if (trigger !== prevTrigger) {
		setPrevTrigger(trigger)
		onTriggerChange(prevTrigger, trigger)
	}
}
