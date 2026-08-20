import { useQuery } from "@tanstack/react-query"

import { type ModelRecord, type ExtensionMessage, LmStudioModelsMessageType, parseExtensionMessage } from "@roo-code/types"

import { isTrustedMessage } from "@src/utils/trustedMessages"
import { vscode } from "@src/utils/vscode"

export const requestLmStudioModels = (baseUrl?: string) =>
	vscode.postMessage({
		type: LmStudioModelsMessageType.requestLmStudioModels,
		values: typeof baseUrl === "string" ? { baseUrl } : undefined,
	})

const getLmStudioModels = async (baseUrl?: string) =>
	new Promise<ModelRecord>((resolve, reject) => {
		const cleanup = () => {
			window.removeEventListener("message", handler)
		}

		const timeout = setTimeout(() => {
			cleanup()
			reject(new Error("LM Studio models request timed out"))
		}, 10000)

		const handler = (event: MessageEvent) => {
			if (!isTrustedMessage(event)) return
			// Boundary-validate registered model/status messages (Phase 2, Domain 2).
			const parsed = parseExtensionMessage(event.data)
			if (!parsed.ok) {
				console.error(`[useLmStudioModels] Rejected malformed extension message: ${parsed.error}`)
				return
			}
			const message = parsed.message

			if (message.type === LmStudioModelsMessageType.lmStudioModels) {
				clearTimeout(timeout)
				cleanup()

				if (message.lmStudioModels) {
					resolve(message.lmStudioModels)
				} else {
					reject(new Error("No LMStudio models in response"))
				}
			}
		}

		window.addEventListener("message", handler)
		requestLmStudioModels(baseUrl)
	})

export const useLmStudioModels = (modelId?: string) =>
	useQuery({
		queryKey: ["lmStudioModels"],
		queryFn: () => (modelId ? getLmStudioModels() : {}),
	})
