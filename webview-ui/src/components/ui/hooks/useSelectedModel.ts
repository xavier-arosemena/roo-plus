import {
	type ProviderName,
	type ProviderSettings,
	type ModelInfo,
	type ModelRecord,
	type RouterModels,
	anthropicModels,
	bedrockModels,
	deepSeekModels,
	moonshotModels,
	minimaxModels,
	mimoModels,
	geminiModels,
	mistralModels,
	openAiModelInfoSaneDefaults,
	openAiNativeModels,
	vertexModels,
	xaiModels,
	vscodeLlmModels,
	vscodeLlmDefaultModelId,
	openAiCodexModels,
	sambaNovaModels,
	internationalZAiModels,
	mainlandZAiModels,
	fireworksModels,
	friendliModels,
	basetenModels,
	qwenCodeModels,
	getPoeDefaultModelInfo,
	kenariDefaultModelInfo,
	kimiCodeDefaultModelInfo,
	litellmDefaultModelInfo,
	lMStudioDefaultModelInfo,
	ollamaDefaultModelInfo,
	opencodeGoDefaultModelInfo,
	openRouterDefaultModelInfo,
	requestyDefaultModelInfo,
	unboundDefaultModelInfo,
	vercelAiGatewayDefaultModelInfo,
	BEDROCK_1M_CONTEXT_MODEL_IDS,
	VERTEX_1M_CONTEXT_MODEL_IDS,
	isDynamicProvider,
	isRetiredProvider,
	getProviderDefaultModelId,
	providerIdentifiers,
} from "@roo-code/types"

import { useRouterModels } from "./useRouterModels"
import { useOpenRouterModelProviders } from "./useOpenRouterModelProviders"
import { useLmStudioModels } from "./useLmStudioModels"
import { useOllamaModels } from "./useOllamaModels"

/**
 * Helper to get a validated model ID for dynamic providers.
 * Returns the configured model ID if it exists in the available models, otherwise returns the default.
 */
function getValidatedModelId(
	configuredId: string | undefined,
	availableModels: ModelRecord | undefined,
	defaultModelId: string,
): string {
	return configuredId && availableModels?.[configuredId] ? configuredId : defaultModelId
}

/**
 * Resolve a ModelInfo entry from a provider's static model table, preferring the
 * requested model ID and falling back to the provider's default entry (and, as a
 * last resort, `openAiModelInfoSaneDefaults`) so a configured ID that isn't in the
 * curated table never yields `undefined` for a valid configured provider. The
 * default IDs are typed as keys of their tables, so the default lookup is always
 * populated; the sane-defaults tail is purely defensive.
 */
function getTableModelInfo(table: Record<string, ModelInfo>, id: string, defaultModelId: string): ModelInfo {
	return table[id] ?? table[defaultModelId] ?? openAiModelInfoSaneDefaults
}

export const useSelectedModel = (apiConfiguration?: ProviderSettings) => {
	const provider = apiConfiguration?.apiProvider || "openrouter"
	const activeProvider: ProviderName | undefined = isRetiredProvider(provider) ? undefined : provider
	const dynamicProvider = activeProvider && isDynamicProvider(activeProvider) ? activeProvider : undefined
	const openRouterModelId = activeProvider === "openrouter" ? apiConfiguration?.openRouterModelId : undefined
	const lmStudioModelId = activeProvider === "lmstudio" ? apiConfiguration?.lmStudioModelId : undefined
	const ollamaModelId = activeProvider === "ollama" ? apiConfiguration?.ollamaModelId : undefined

	// Only fetch router models for dynamic providers
	const shouldFetchRouterModels = !!dynamicProvider
	const routerModels = useRouterModels({
		provider: dynamicProvider,
		enabled: shouldFetchRouterModels,
	})

	const openRouterModelProviders = useOpenRouterModelProviders(openRouterModelId)
	const lmStudioModels = useLmStudioModels(lmStudioModelId)
	const ollamaModels = useOllamaModels(ollamaModelId)

	// Compute readiness only for the data actually needed for the selected provider
	const needRouterModels = shouldFetchRouterModels
	const needOpenRouterProviders = activeProvider === "openrouter"
	const needLmStudio = typeof lmStudioModelId !== "undefined"
	const needOllama = typeof ollamaModelId !== "undefined"

	// Resolve the selected model for any configured provider even while data is still
	// loading: `getSelectedModel` now falls back to a defined provider default, so a
	// valid configured provider never yields `info: undefined` (which broke the
	// task-header token display). `info: undefined` is reserved for the true "no
	// configuration / retired provider" case below.
	const { id, info } =
		apiConfiguration && activeProvider
			? getSelectedModel({
					provider: activeProvider,
					apiConfiguration,
					routerModels: (routerModels.data || {}) as RouterModels,
					openRouterModelProviders: (openRouterModelProviders.data || {}) as Record<string, ModelInfo>,
					lmStudioModels: (lmStudioModels.data || undefined) as ModelRecord | undefined,
					ollamaModels: (ollamaModels.data || undefined) as ModelRecord | undefined,
				})
			: { id: getProviderDefaultModelId(activeProvider ?? "openrouter"), info: undefined }

	return {
		provider,
		id,
		info,
		isLoading:
			(needRouterModels && routerModels.isLoading) ||
			(needOpenRouterProviders && openRouterModelProviders.isLoading) ||
			(needLmStudio && lmStudioModels!.isLoading) ||
			(needOllama && ollamaModels!.isLoading),
		isError:
			(needRouterModels && routerModels.isError) ||
			(needOpenRouterProviders && openRouterModelProviders.isError) ||
			(needLmStudio && lmStudioModels!.isError) ||
			(needOllama && ollamaModels!.isError),
	}
}

function getSelectedModel({
	provider,
	apiConfiguration,
	routerModels,
	openRouterModelProviders,
	lmStudioModels,
	ollamaModels,
}: {
	provider: ProviderName
	apiConfiguration: ProviderSettings
	routerModels: RouterModels
	openRouterModelProviders: Record<string, ModelInfo>
	lmStudioModels: ModelRecord | undefined
	ollamaModels: ModelRecord | undefined
}): { id: string; info: ModelInfo | undefined } {
	// the `undefined` case are used to show the invalid selection to prevent
	// users from seeing the default model if their selection is invalid
	// this gives a better UX than showing the default model
	const defaultModelId = getProviderDefaultModelId(provider)
	switch (provider) {
		case providerIdentifiers.openrouter: {
			const id = getValidatedModelId(apiConfiguration.openRouterModelId, routerModels.openrouter, defaultModelId)
			// Fall back to the provider default while the model list is loading/empty
			// or the selected model isn't present, so the header always has a real window.
			let info = routerModels.openrouter?.[id] ?? openRouterDefaultModelInfo
			const specificProvider = apiConfiguration.openRouterSpecificProvider

			if (specificProvider && openRouterModelProviders[specificProvider]) {
				// Overwrite the info with the specific provider info. Some
				// fields are missing the model info for `openRouterModelProviders`
				// so we need to merge the two.
				info = { ...info, ...openRouterModelProviders[specificProvider] }
			}

			return { id, info }
		}
		case providerIdentifiers.requesty: {
			const id = getValidatedModelId(apiConfiguration.requestyModelId, routerModels.requesty, defaultModelId)
			const routerInfo = routerModels.requesty?.[id]
			return { id, info: routerInfo ?? requestyDefaultModelInfo }
		}
		case providerIdentifiers.unbound: {
			const id = getValidatedModelId(apiConfiguration.unboundModelId, routerModels.unbound, defaultModelId)
			const routerInfo = routerModels.unbound?.[id]
			return { id, info: routerInfo ?? unboundDefaultModelInfo }
		}
		case providerIdentifiers.litellm: {
			// When the model list is empty (not yet loaded or still loading),
			// preserve the configured model ID. LiteLLM is a proxy with no inherent
			// default model, so we never substitute a hardcoded default here -- when
			// nothing is configured we return an empty ID so the picker shows "no
			// selection" rather than a phantom model that does not exist on the server.
			const hasModels = routerModels.litellm && Object.keys(routerModels.litellm).length > 0
			const id = hasModels
				? getValidatedModelId(apiConfiguration.litellmModelId, routerModels.litellm, defaultModelId)
				: (apiConfiguration.litellmModelId ?? "")
			const routerInfo = routerModels.litellm?.[id]
			return { id, info: routerInfo ?? litellmDefaultModelInfo }
		}
		case providerIdentifiers.xai: {
			const id = apiConfiguration.apiModelId ?? defaultModelId
			return { id, info: getTableModelInfo(xaiModels, id, defaultModelId) }
		}
		case providerIdentifiers.baseten: {
			const id = apiConfiguration.apiModelId ?? defaultModelId
			return { id, info: getTableModelInfo(basetenModels, id, defaultModelId) }
		}
		case providerIdentifiers.bedrock: {
			const id = apiConfiguration.apiModelId ?? defaultModelId
			const baseInfo = bedrockModels[id as keyof typeof bedrockModels]

			// Special case for custom ARN.
			if (id === "custom-arn") {
				return {
					id,
					info: { maxTokens: 5000, contextWindow: 128_000, supportsPromptCache: true, supportsImages: true },
				}
			}

			// Apply 1M context for supported Claude 4 models when enabled
			if (BEDROCK_1M_CONTEXT_MODEL_IDS.includes(id as any) && apiConfiguration.awsBedrock1MContext && baseInfo) {
				// Create a new ModelInfo object with updated context window
				const info: ModelInfo = {
					...baseInfo,
					contextWindow: 1_000_000,
				}
				return { id, info }
			}

			return { id, info: baseInfo ?? bedrockModels[defaultModelId as keyof typeof bedrockModels] }
		}
		case providerIdentifiers.vertex: {
			const id = apiConfiguration.apiModelId ?? defaultModelId
			const baseInfo = vertexModels[id as keyof typeof vertexModels]

			// Apply 1M context for supported Claude 4 models when enabled
			if (VERTEX_1M_CONTEXT_MODEL_IDS.includes(id as any) && apiConfiguration.vertex1MContext && baseInfo) {
				const modelInfo: ModelInfo = baseInfo
				const tier = modelInfo.tiers?.[0]
				if (tier) {
					const info: ModelInfo = {
						...modelInfo,
						contextWindow: tier.contextWindow,
						inputPrice: tier.inputPrice,
						outputPrice: tier.outputPrice,
						cacheWritesPrice: tier.cacheWritesPrice,
						cacheReadsPrice: tier.cacheReadsPrice,
					}
					return { id, info }
				}
			}

			return { id, info: baseInfo ?? vertexModels[defaultModelId as keyof typeof vertexModels] }
		}
		case providerIdentifiers.gemini: {
			const id = apiConfiguration.apiModelId ?? defaultModelId
			return { id, info: getTableModelInfo(geminiModels, id, defaultModelId) }
		}
		case providerIdentifiers.deepseek: {
			const availableModels = routerModels.deepseek
				? { ...deepSeekModels, ...routerModels.deepseek }
				: deepSeekModels
			const id = getValidatedModelId(apiConfiguration.apiModelId, availableModels, defaultModelId)
			const routerInfo = routerModels.deepseek?.[id]
			const staticInfo = deepSeekModels[id as keyof typeof deepSeekModels]
			return {
				id,
				info: routerInfo ?? staticInfo ?? deepSeekModels[defaultModelId as keyof typeof deepSeekModels],
			}
		}
		case providerIdentifiers.moonshot: {
			const availableModels = routerModels.moonshot
				? { ...moonshotModels, ...routerModels.moonshot }
				: moonshotModels
			const id = getValidatedModelId(apiConfiguration.apiModelId, availableModels, defaultModelId)
			const routerInfo = routerModels.moonshot?.[id]
			const staticInfo = moonshotModels[id as keyof typeof moonshotModels]
			return {
				id,
				info: routerInfo ?? staticInfo ?? moonshotModels[defaultModelId as keyof typeof moonshotModels],
			}
		}
		case providerIdentifiers.kimiCode: {
			const configuredId = apiConfiguration.apiModelId
			const availableModels = routerModels["kimi-code"]
			const id = configuredId || defaultModelId
			return { id, info: availableModels?.[id] ?? kimiCodeDefaultModelInfo }
		}
		case providerIdentifiers.minimax: {
			const id = apiConfiguration.apiModelId ?? defaultModelId
			return { id, info: getTableModelInfo(minimaxModels, id, defaultModelId) }
		}
		case providerIdentifiers.mimo: {
			const id = apiConfiguration.apiModelId ?? defaultModelId
			const info = mimoModels[id as keyof typeof mimoModels] ?? mimoModels["mimo-v2.5-pro"]
			return { id, info }
		}
		case providerIdentifiers.zai: {
			const isChina = apiConfiguration.zaiApiLine === "china_coding"
			const models = isChina ? mainlandZAiModels : internationalZAiModels
			const defaultModelId = getProviderDefaultModelId(provider, { isChina })
			const id = apiConfiguration.apiModelId ?? defaultModelId
			return { id, info: getTableModelInfo(models, id, defaultModelId) }
		}
		case providerIdentifiers.openaiNative: {
			const id = apiConfiguration.apiModelId ?? defaultModelId
			return { id, info: getTableModelInfo(openAiNativeModels, id, defaultModelId) }
		}
		case providerIdentifiers.mistral: {
			const id = apiConfiguration.apiModelId ?? defaultModelId
			return { id, info: getTableModelInfo(mistralModels, id, defaultModelId) }
		}
		case providerIdentifiers.openai: {
			const id = apiConfiguration.openAiModelId ?? ""
			const customInfo = apiConfiguration?.openAiCustomModelInfo
			const info = customInfo ?? openAiModelInfoSaneDefaults
			return { id, info }
		}
		case providerIdentifiers.ollama: {
			const id = apiConfiguration.ollamaModelId ?? ""
			const info = ollamaModels && ollamaModels[apiConfiguration.ollamaModelId!]

			const adjustedInfo =
				info?.contextWindow &&
				apiConfiguration?.ollamaNumCtx &&
				apiConfiguration.ollamaNumCtx < info.contextWindow
					? { ...info, contextWindow: apiConfiguration.ollamaNumCtx }
					: info

			return {
				id,
				// Fall back to the provider default so a model missing from the fetched
				// list (or a still-loading list) never yields `info: undefined`.
				info: adjustedInfo || ollamaDefaultModelInfo,
			}
		}
		case providerIdentifiers.lmstudio: {
			const id = apiConfiguration.lmStudioModelId ?? ""
			const modelInfo = lmStudioModels && lmStudioModels[apiConfiguration.lmStudioModelId!]
			return {
				id,
				// Fall back to the provider default when the model list is empty or the
				// selected model isn't present (e.g. while the server is still loading).
				info: modelInfo ? { ...lMStudioDefaultModelInfo, ...modelInfo } : lMStudioDefaultModelInfo,
			}
		}
		case providerIdentifiers.vscodeLm: {
			const id = apiConfiguration?.vsCodeLmModelSelector
				? `${apiConfiguration.vsCodeLmModelSelector.vendor}/${apiConfiguration.vsCodeLmModelSelector.family}`
				: vscodeLlmDefaultModelId
			const modelFamily = apiConfiguration?.vsCodeLmModelSelector?.family ?? vscodeLlmDefaultModelId
			// On a family miss, fall back to the default model entry, not openAiModelInfoSaneDefaults
			// (whose 128K contextWindow would diverge from the gate and skew the bar).
			const listedModel =
				vscodeLlmModels[modelFamily as keyof typeof vscodeLlmModels] ?? vscodeLlmModels[vscodeLlmDefaultModelId]
			// Set contextWindow = maxInputTokens so the UI bar shares one source of truth with the gate,
			// whose primary window is getCondenseContextWindow() (static-table maxInputTokens); this
			// info.contextWindow is only the gate's fallback.
			const info: ModelInfo = {
				...openAiModelInfoSaneDefaults,
				...listedModel,
				contextWindow: listedModel.maxInputTokens,
				supportsImages: false, // VSCode LM API currently doesn't support images.
			}
			return { id, info }
		}
		case providerIdentifiers.sambanova: {
			const id = apiConfiguration.apiModelId ?? defaultModelId
			return { id, info: getTableModelInfo(sambaNovaModels, id, defaultModelId) }
		}
		case providerIdentifiers.fireworks: {
			const id = apiConfiguration.apiModelId ?? defaultModelId
			return { id, info: getTableModelInfo(fireworksModels, id, defaultModelId) }
		}
		case providerIdentifiers.friendli: {
			const id = apiConfiguration.apiModelId ?? defaultModelId
			return { id, info: getTableModelInfo(friendliModels, id, defaultModelId) }
		}
		case providerIdentifiers.poe: {
			const id = apiConfiguration.apiModelId ?? defaultModelId
			// Fall back to the provider default while the dynamic model list is loading.
			return { id, info: routerModels.poe?.[id] ?? getPoeDefaultModelInfo() }
		}
		case providerIdentifiers.qwenCode: {
			const id = apiConfiguration.apiModelId ?? defaultModelId
			return { id, info: getTableModelInfo(qwenCodeModels, id, defaultModelId) }
		}
		case providerIdentifiers.openaiCodex: {
			const id = apiConfiguration.apiModelId ?? defaultModelId
			return { id, info: getTableModelInfo(openAiCodexModels, id, defaultModelId) }
		}
		case providerIdentifiers.vercelAiGateway: {
			const id = getValidatedModelId(
				apiConfiguration.vercelAiGatewayModelId,
				routerModels["vercel-ai-gateway"],
				defaultModelId,
			)
			const info = routerModels["vercel-ai-gateway"]?.[id] ?? vercelAiGatewayDefaultModelInfo
			return { id, info }
		}
		case providerIdentifiers.opencodeGo: {
			const id = getValidatedModelId(
				apiConfiguration.opencodeGoModelId,
				routerModels["opencode-go"],
				defaultModelId,
			)
			// Fall back to the provider's default ModelInfo so capability-driven UI
			// keeps working when the /models list is empty or unavailable.
			const info = routerModels["opencode-go"]?.[id] ?? opencodeGoDefaultModelInfo
			return { id, info }
		}
		case providerIdentifiers.kenari: {
			const id = getValidatedModelId(apiConfiguration.kenariModelId, routerModels["kenari"], defaultModelId)
			// Fall back to the provider's default ModelInfo so capability-driven UI
			// keeps working when the /models list is empty or unavailable.
			const info = routerModels["kenari"]?.[id] ?? kenariDefaultModelInfo
			return { id, info }
		}
		case providerIdentifiers.anthropic:
		case providerIdentifiers.geminiCli:
		case providerIdentifiers.fakeAi: {
			const id = apiConfiguration.apiModelId ?? defaultModelId
			const baseInfo = anthropicModels[id as keyof typeof anthropicModels]

			// Apply 1M context beta tier pricing for supported Claude 4 models
			if (
				provider === providerIdentifiers.anthropic &&
				(id === "claude-sonnet-4-20250514" ||
					id === "claude-sonnet-4-5" ||
					id === "claude-sonnet-4-6" ||
					id === "claude-opus-4-6") &&
				apiConfiguration.anthropicBeta1MContext &&
				baseInfo
			) {
				// Type assertion since supported Claude 4 models include 1M context pricing tiers.
				const modelWithTiers = baseInfo as typeof baseInfo & {
					tiers?: Array<{
						contextWindow: number
						inputPrice?: number
						outputPrice?: number
						cacheWritesPrice?: number
						cacheReadsPrice?: number
					}>
				}
				const tier = modelWithTiers.tiers?.[0]
				if (tier) {
					// Create a new ModelInfo object with updated values
					const info: ModelInfo = {
						...baseInfo,
						contextWindow: tier.contextWindow,
						inputPrice: tier.inputPrice ?? baseInfo.inputPrice,
						outputPrice: tier.outputPrice ?? baseInfo.outputPrice,
						cacheWritesPrice: tier.cacheWritesPrice ?? baseInfo.cacheWritesPrice,
						cacheReadsPrice: tier.cacheReadsPrice ?? baseInfo.cacheReadsPrice,
					}
					return { id, info }
				}
			}

			return { id, info: baseInfo ?? anthropicModels[defaultModelId as keyof typeof anthropicModels] }
		}
		default: {
			provider satisfies never
			throw new Error(`Unsupported provider: ${provider}`)
		}
	}
}
