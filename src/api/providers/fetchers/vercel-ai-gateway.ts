import axios from "axios"
import { z } from "zod"

import type { ModelInfo } from "@roo-code/types"
import { VERCEL_AI_GATEWAY_VISION_ONLY_MODELS, VERCEL_AI_GATEWAY_VISION_AND_TOOLS_MODELS } from "@roo-code/types"

import type { ApiHandlerOptions } from "../../../shared/api"
import { parseApiPrice } from "../../../shared/cost"

/**
 * VercelAiGatewayPricing
 */

const vercelAiGatewayPricingSchema = z.object({
	input: z.string().optional(), // Image models don't have an input price.
	output: z.string().optional(), // Embedding and image models don't have an output price.
	input_cache_write: z.string().optional(),
	input_cache_read: z.string().optional(),
	image: z.string().optional(), // Only image models have an image price.
})

/**
 * VercelAiGatewayModel
 */

const vercelAiGatewayModelSchema = z.object({
	id: z.string(),
	object: z.string(),
	// Zoo Gateway / Bedrock catalog entries omit these; they are not used for routing.
	created: z.number().optional(),
	owned_by: z.string(),
	name: z.string(),
	description: z.string().optional(),
	// Zoo Gateway / Bedrock entries can omit the limits entirely (absent OR
	// null); both are tolerated and backfilled with defaults in the parser.
	context_window: z.number().nullish(),
	max_tokens: z.number().nullish(),
	type: z.string(),
	tags: z.array(z.string()).optional(),
	// Some catalog entries omit pricing entirely (absent or null).
	pricing: vercelAiGatewayPricingSchema.nullish(),
})

export type VercelAiGatewayModel = z.infer<typeof vercelAiGatewayModelSchema>

/**
 * VercelAiGatewayModelsResponse
 */

export const vercelAiGatewayModelsResponseSchema = z.object({
	object: z.string(),
	data: z.array(vercelAiGatewayModelSchema),
})

type VercelAiGatewayModelsResponse = z.infer<typeof vercelAiGatewayModelsResponseSchema>

/**
 * Conservative defaults for catalog entries that omit their limits. The Vercel
 * AI Gateway (and its Zoo Gateway / Bedrock mirrors) returns language models
 * without `context_window`/`max_tokens`; the strict schema previously rejected
 * the whole response and the lossy fallback fed `undefined` into `ModelInfo`.
 */
const VERCEL_AI_GATEWAY_DEFAULT_CONTEXT_WINDOW = 200_000
const VERCEL_AI_GATEWAY_DEFAULT_MAX_TOKENS = 8_192

/**
 * getVercelAiGatewayModels
 */

export async function getVercelAiGatewayModels(options?: ApiHandlerOptions): Promise<Record<string, ModelInfo>> {
	const models: Record<string, ModelInfo> = {}
	const baseURL = "https://ai-gateway.vercel.sh/v1"

	try {
		const response = await axios.get<VercelAiGatewayModelsResponse>(`${baseURL}/models`)
		const result = vercelAiGatewayModelsResponseSchema.safeParse(response.data)

		if (result.success) {
			for (const model of result.data.data) {
				// Only include language models for chat inference.
				// Embedding models are statically defined in embeddingModels.ts.
				if (model.type !== "language") {
					continue
				}

				models[model.id] = parseVercelAiGatewayModel({ id: model.id, model })
			}
		} else {
			// Per-entry fallback: a single malformed entry must not discard the
			// whole catalog. The previous wholesale raw fallback masked the
			// schema failure and fed `undefined` limits into `ModelInfo`.
			const rawEntries: unknown[] = Array.isArray(response.data?.data) ? response.data.data : []

			for (const rawEntry of rawEntries) {
				const parsed = vercelAiGatewayModelSchema.safeParse(rawEntry)
				if (!parsed.success || parsed.data.type !== "language") {
					continue
				}

				models[parsed.data.id] = parseVercelAiGatewayModel({ id: parsed.data.id, model: parsed.data })
			}

			if (rawEntries.length === 0) {
				console.warn("Vercel AI Gateway models response did not contain a model list")
			}
		}
	} catch (error) {
		console.error(
			`Error fetching Vercel AI Gateway models: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
		)
	}

	return models
}

/**
 * parseVercelAiGatewayModel
 */

export const parseVercelAiGatewayModel = ({ id, model }: { id: string; model: VercelAiGatewayModel }): ModelInfo => {
	const cacheWritesPrice = model.pricing?.input_cache_write
		? parseApiPrice(model.pricing?.input_cache_write)
		: undefined

	const cacheReadsPrice = model.pricing?.input_cache_read ? parseApiPrice(model.pricing?.input_cache_read) : undefined

	const supportsPromptCache = typeof cacheWritesPrice !== "undefined" && typeof cacheReadsPrice !== "undefined"
	const supportsImages = Array.isArray(model.tags)
		? model.tags.includes("vision")
		: VERCEL_AI_GATEWAY_VISION_ONLY_MODELS.has(id) || VERCEL_AI_GATEWAY_VISION_AND_TOOLS_MODELS.has(id)

	const modelInfo: ModelInfo = {
		maxTokens: model.max_tokens ?? VERCEL_AI_GATEWAY_DEFAULT_MAX_TOKENS,
		contextWindow: model.context_window ?? VERCEL_AI_GATEWAY_DEFAULT_CONTEXT_WINDOW,
		supportsImages,
		supportsPromptCache,
		inputPrice: parseApiPrice(model.pricing?.input),
		outputPrice: parseApiPrice(model.pricing?.output),
		cacheWritesPrice,
		cacheReadsPrice,
		description: model.description ?? model.name,
	}

	if (id === "anthropic/claude-fable-5") {
		modelInfo.supportsTemperature = false
	}

	if (id === "anthropic/claude-sonnet-5") {
		modelInfo.supportsTemperature = false
	}

	if (id === "anthropic/claude-opus-5") {
		modelInfo.supportsTemperature = false
	}

	return modelInfo
}
