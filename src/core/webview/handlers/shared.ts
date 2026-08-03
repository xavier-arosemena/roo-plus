import type { GlobalState } from "@roo-code/types"
import { resolveImageMentions } from "../../mentions/resolveImageMentions"
import type { ClineProvider } from "../ClineProvider"

/**
 * Reads a value from the provider's global state via contextProxy.
 * Synchronous (contextProxy.getValue is sync) — mirrors the former
 * `webviewMessageHandler` pre-switch helper exactly, so call sites that use
 * `?? {}` / `|| fallback` without awaiting keep their existing behavior.
 */
export const getGlobalState = <K extends keyof GlobalState>(provider: Pick<ClineProvider, "contextProxy">, key: K) =>
	provider.contextProxy.getValue(key)

/**
 * Writes a value to the provider's global state via contextProxy.
 * Extracted from the former `webviewMessageHandler` pre-switch setup.
 */
export const updateGlobalState = async <K extends keyof GlobalState>(
	provider: Pick<ClineProvider, "contextProxy">,
	key: K,
	value: GlobalState[K],
): Promise<void> => {
	await provider.contextProxy.setValue(key, value)
}

/**
 * Returns the working directory of the current task if present, otherwise the
 * provider's workspace cwd. Extracted from the former `webviewMessageHandler`
 * pre-switch setup.
 */
export const getCurrentCwd = (provider: Pick<ClineProvider, "getCurrentTask" | "cwd">) => {
	return provider.getCurrentTask()?.cwd || provider.cwd
}

/**
 * Resolves image file mentions in incoming messages.
 * Matches read_file behavior: respects size limits and model capabilities.
 * Extracted from the former `webviewMessageHandler` pre-switch setup.
 */
export const resolveIncomingImages = async (
	provider: Pick<ClineProvider, "getCurrentTask" | "getState" | "cwd">,
	payload: { text?: string; images?: string[] },
) => {
	const text = payload.text ?? ""
	const images = payload.images
	const currentTask = provider.getCurrentTask()
	const state = await provider.getState()
	const resolved = await resolveImageMentions({
		text,
		images,
		cwd: getCurrentCwd(provider),
		rooIgnoreController: currentTask?.rooIgnoreController,
		maxImageFileSize: state.maxImageFileSize,
		maxTotalImageSize: state.maxTotalImageSize,
	})
	return resolved
}
