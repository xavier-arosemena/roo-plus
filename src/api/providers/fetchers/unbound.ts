import axios from "axios"

import type { ModelInfo } from "@roo-code/types"

import { parseApiPrice } from "../../../shared/cost"

/** Raw entries returned by the Unbound catalog. Every field is optional/unknown. */
type UnboundRawModel = {
	id?: unknown
	max_output_tokens?: unknown
	context_window?: unknown
	supports_caching?: unknown
	supports_vision?: unknown
	input_price?: unknown
	output_price?: unknown
	description?: unknown
	caching_price?: unknown
	cached_price?: unknown
}

const asFiniteNumber = (value: unknown, fallback: number): number => {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value
	}
	if (typeof value === "string" && value.trim() !== "") {
		const parsed = Number(value)
		if (Number.isFinite(parsed)) {
			return parsed
		}
	}
	return fallback
}

const asBoolean = (value: unknown, fallback: boolean): boolean => (typeof value === "boolean" ? value : fallback)

const asOptionalString = (value: unknown): string | undefined => (typeof value === "string" ? value : undefined)

/**
 * Normalizes the many shapes the Unbound `/models` endpoint can return into an
 * iterable array.
 *
 * Historically this endpoint has returned a bare array, an OpenAI-style
 * `{ data: [...] }` envelope, a `{ models: [...] }` envelope, or a map keyed by
 * model id. Iterating a non-array directly threw `TypeError: ... is not
 * iterable`, which the call site caught while logging
 * `Error fetching Unbound models` — silently losing the entire model list.
 */
export const toUnboundModelList = (payload: unknown): UnboundRawModel[] => {
	if (Array.isArray(payload)) {
		return payload as UnboundRawModel[]
	}
	if (payload && typeof payload === "object") {
		const record = payload as Record<string, unknown>
		if (Array.isArray(record.models)) {
			return record.models as UnboundRawModel[]
		}
		// Map keyed by model id — recover the id from the key when the value
		// omits it, otherwise the entry would be dropped by the id guard below.
		return Object.entries(record)
			.filter(([, value]) => value !== null && typeof value === "object" && !Array.isArray(value))
			.map(([key, value]): UnboundRawModel => {
				const model = value as Record<string, unknown>
				if (typeof model.id === "string" && model.id !== "") {
					return model as UnboundRawModel
				}
				return { ...model, id: key } as UnboundRawModel
			})
	}
	return []
}

export async function getUnboundModels(apiKey?: string | null): Promise<Record<string, ModelInfo>> {
	const models: Record<string, ModelInfo> = {}

	try {
		const headers: Record<string, string> = {}

		if (apiKey) {
			headers["Authorization"] = `Bearer ${apiKey}`
		}

		const response = await axios.get("https://api.getunbound.ai/models", { headers })
		const rawModels = toUnboundModelList(response.data?.data ?? response.data)

		for (const rawModel of rawModels) {
			const id = asOptionalString(rawModel.id)
			if (!id) {
				continue
			}

			const modelInfo: ModelInfo = {
				maxTokens: asFiniteNumber(rawModel.max_output_tokens, 8192),
				contextWindow: asFiniteNumber(rawModel.context_window, 200_000),
				supportsPromptCache: asBoolean(rawModel.supports_caching, false),
				supportsImages: asBoolean(rawModel.supports_vision, false),
				inputPrice: parseApiPrice(rawModel.input_price),
				outputPrice: parseApiPrice(rawModel.output_price),
				description: asOptionalString(rawModel.description),
				cacheWritesPrice: parseApiPrice(rawModel.caching_price),
				cacheReadsPrice: parseApiPrice(rawModel.cached_price),
			}

			models[id] = modelInfo
		}
	} catch (error) {
		console.error(`Error fetching Unbound models: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`)
	}

	return models
}
