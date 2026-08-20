import { useQuery } from "@tanstack/react-query"

import { type ModelRecord, type ExtensionMessage, OllamaModelsMessageType, parseExtensionMessage } from "@roo-code/types"

import { isTrustedMessage } from "@src/utils/trustedMessages"
import { vscode } from "@src/utils/vscode"

const getOllamaModels = async () =>
	new Promise<ModelRecord>((resolve, reject) => {
		const cleanup = () => {
			window.removeEventListener("message", handler)
		}

		const timeout = setTimeout(() => {
			cleanup()
			reject(new Error("Ollama models request timed out"))
		}, 10000)

		const handler = (event: MessageEvent) => {
			if (!isTrustedMessage(event)) return
			// Boundary-validate registered model/status messages (Phase 2, Domain 2).
			const parsed = parseExtensionMessage(event.data)
			if (!parsed.ok) {
				console.error(`[useOllamaModels] Rejected malformed extension message: ${parsed.error}`)
				return
			}
			const message = parsed.message

			if (message.type === OllamaModelsMessageType.ollamaModels) {
				clearTimeout(timeout)
				cleanup()

				if (message.ollamaModels) {
					resolve(message.ollamaModels)
				} else {
					reject(new Error("No Ollama models in response"))
				}
			}
		}

		window.addEventListener("message", handler)
		vscode.postMessage({ type: OllamaModelsMessageType.requestOllamaModels })
	})

export const useOllamaModels = (modelId?: string) =>
	useQuery({ queryKey: ["ollamaModels"], queryFn: () => (modelId ? getOllamaModels() : {}) })
