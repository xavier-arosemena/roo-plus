#!/usr/bin/env node

/**
 * help-pages.mjs
 *
 * Single source of truth for the per-provider in-app help pages
 * (`docs/help/providers/<slug>.md`) and for the provider slug set the
 * doc-link CI guard expands `buildDocLink("providers/<slug>")` against.
 *
 * The provider pages are emitted from PROVIDER_PAGES by
 * `scripts/generate-doc-link-map.mjs` so all 32 pages share one template
 * (plan §2.11) instead of drifting independently. This module is deliberately
 * side-effect free at import time: it is imported by the generator, by the
 * verifier, and by their node:test specs.
 *
 * `slug` is the value produced by `getProviderDocsSlug(provider)` in
 * `webview-ui/src/components/settings/utils/providerModelConfig.ts` — i.e. the
 * provider identifier with the two documented overrides applied
 * (`openai-native → openai`, `openai → openai-compatible`). Because the
 * resolved slugs are unique, the set below is the exact 32 slugs the provider
 * docs button can request.
 *
 * Content fidelity: every `models` entry below is an id that exists in
 * `packages/types/src/providers/<provider>.ts` (the per-provider registry),
 * and every `baseUrl` is the default endpoint defined by
 * `src/api/providers/<provider>.ts` (or its provider registry constant). When
 * a provider's catalog is fetched dynamically at runtime, the page lists the
 * built-in default/fallback model and a placeholder instead of inventing ids.
 *
 * `baseUrl` is recorded ONLY when the handler itself supplies a literal default
 * (e.g. `options.xBaseUrl || "https://…"` or a registry constant). A URL that
 * is merely an SDK fallback (`options.xBaseUrl || undefined`) or a webview input
 * placeholder is NOT a code default and MUST be omitted — otherwise the page
 * advertises an endpoint the handler never defines (bug found in review: Poe,
 * Anthropic).
 *
 * Guardrail: Roo+ is a GitHub-only fork. These pages reference no third-party
 * vendor URL; the user opens their provider console from the provider card in
 * Roo+ and follows the provider's own instructions there.
 */

/**
 * @typedef {Object} ProviderPage
 * @property {string} slug - Resolved docs slug (unique across all providers).
 * @property {string} label - User-facing provider name (matches PROVIDERS.label).
 * @property {string} blurb - One-sentence "what this provider is".
 * @property {string} auth - How the user authenticates ("How you connect").
 * @property {string} setupHeading - Heading for the "get access" section.
 * @property {string[]} steps - Numbered setup steps (no vendor URLs).
 * @property {string[]} models - Verified model ids (default first), or a
 *   placeholder when the catalog is resolved dynamically from the endpoint.
 * @property {string} pricing - One-sentence pricing note.
 * @property {string} [baseUrl] - Default base URL / endpoint, when one exists
 *   in code. Omitted for providers with no single default endpoint.
 */

/** @type {ProviderPage[]} */
export const PROVIDER_PAGES = [
	{
		slug: "openrouter",
		label: "OpenRouter",
		blurb: "an aggregation gateway that routes one API key to hundreds of models from many vendors.",
		auth: "an OpenRouter API key",
		setupHeading: "Get an OpenRouter API key",
		steps: [
			"Sign in to your OpenRouter account.",
			"Create an API key on the Keys page.",
			"Copy the key for the next step.",
		],
		baseUrl: "https://openrouter.ai/api/v1",
		models: ["anthropic/claude-sonnet-4.5", "(the rest of the catalog is fetched from OpenRouter)"],
		pricing: "Pass-through per-token pricing per model; some models are free.",
	},
	{
		slug: "anthropic",
		label: "Anthropic",
		blurb: "serves the Claude family of models directly through the Anthropic API.",
		auth: "an Anthropic API key (or an auth token when you set a custom base URL)",
		setupHeading: "Get an Anthropic API key",
		steps: ["Sign in to your Anthropic account console.", "Create an API key.", "Copy the key for the next step."],
		models: ["claude-sonnet-4-5", "claude-opus-4-1-20250805", "claude-haiku-4-5-20251001"],
		pricing: "Priced per token by Anthropic; see your Anthropic account for current rates.",
	},
	{
		slug: "gemini",
		label: "Google Gemini",
		blurb: "serves Google's Gemini models through the Gemini API.",
		auth: "a Google AI Studio (Gemini) API key",
		setupHeading: "Get a Gemini API key",
		steps: [
			"Open Google AI Studio with your Google account.",
			"Create an API key.",
			"Copy the key for the next step.",
		],
		models: ["gemini-3.1-pro-preview", "gemini-2.5-pro", "gemini-2.5-flash"],
		pricing: "Free tier plus paid per-token pricing per Google's published rates.",
	},
	{
		slug: "deepseek",
		label: "DeepSeek",
		blurb: "serves the DeepSeek chat and reasoning models through the DeepSeek API.",
		auth: "a DeepSeek API key",
		setupHeading: "Get a DeepSeek API key",
		steps: [
			"Sign in to the DeepSeek platform.",
			"Create an API key under API Keys.",
			"Copy the key for the next step.",
		],
		baseUrl: "https://api.deepseek.com",
		models: ["deepseek-v4-flash", "deepseek-v4-pro", "deepseek-v4-flash-vision-exp"],
		pricing: "Low per-token pricing; see the DeepSeek platform for current rates.",
	},
	{
		slug: "moonshot",
		label: "Moonshot",
		blurb: "serves Moonshot's Kimi language models through the Moonshot API.",
		auth: "a Moonshot API key",
		setupHeading: "Get a Moonshot API key",
		steps: ["Sign in to the Moonshot platform.", "Create an API key.", "Copy the key for the next step."],
		baseUrl: "https://api.moonshot.ai/v1",
		models: ["kimi-k2-0905-preview", "kimi-k2-thinking", "kimi-k2.7-code"],
		pricing: "Per-token pricing tiered by context length.",
	},
	{
		slug: "kimi-code",
		label: "Kimi Code",
		blurb: "targets Kimi's coding-oriented models and agent endpoint.",
		auth: "a Kimi Code API key",
		setupHeading: "Get a Kimi Code API key",
		steps: ["Sign in to the Kimi Code platform.", "Create an API key.", "Copy the key for the next step."],
		baseUrl: "https://api.kimi.com/coding/v1",
		models: ["kimi-for-coding", "k3", "kimi-for-coding-highspeed"],
		pricing: "Per-token pricing published by the Kimi platform.",
	},
	{
		slug: "openai",
		label: "OpenAI",
		blurb: "serves the official OpenAI GPT models through the OpenAI API.",
		auth: "an OpenAI API key",
		setupHeading: "Get an OpenAI API key",
		steps: [
			"Sign in to the OpenAI platform.",
			"Create an API key under API keys.",
			"Copy the key for the next step.",
		],
		baseUrl: "https://api.openai.com/v1",
		models: ["gpt-5.6-sol", "gpt-5", "o4-mini"],
		pricing: "Priced per token by OpenAI; see your account for current rates.",
	},
	{
		slug: "openai-codex",
		label: "OpenAI - ChatGPT Plus/Pro",
		blurb: "signs in with your ChatGPT Plus or Pro subscription instead of an API key.",
		auth: "a ChatGPT Plus/Pro sign-in; no API key is stored",
		setupHeading: "Sign in with ChatGPT",
		steps: [
			"Choose OpenAI - ChatGPT Plus/Pro in Settings → Providers.",
			"Click Sign in and complete the ChatGPT authorization flow in your browser.",
			"Return to Roo+ once the sign-in succeeds; no API key is stored.",
		],
		models: ["gpt-5.6-sol", "gpt-5-codex", "gpt-5"],
		pricing: "Uses your ChatGPT Plus/Pro subscription quota rather than per-token API billing.",
	},
	{
		slug: "openai-compatible",
		label: "OpenAI Compatible",
		blurb: "connects to any endpoint that speaks the OpenAI Chat Completions API.",
		auth: "the base URL your endpoint uses, plus an API key if it requires one",
		setupHeading: "Point Roo+ at your endpoint",
		steps: [
			"Choose OpenAI Compatible in Settings → Providers.",
			"Enter the Base URL of your endpoint.",
			"Paste an API key if your endpoint requires one, then save.",
		],
		models: ["(whatever your endpoint exposes)"],
		pricing: "Whatever your endpoint charges; Roo+ adds no markup.",
	},
	{
		slug: "qwen-code",
		label: "Qwen Code",
		blurb: "serves Qwen's coding models through the Qwen Code endpoint.",
		auth: "a Qwen Code (DashScope) API key, or the Qwen OAuth sign-in",
		setupHeading: "Get a Qwen Code API key",
		steps: [
			"Sign in to the Qwen Code / DashScope console.",
			"Create an API key.",
			"Copy the key for the next step.",
		],
		baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
		models: ["qwen3-coder-plus", "qwen3-coder-flash"],
		pricing: "Per-token pricing published by Alibaba Cloud.",
	},
	{
		slug: "vertex",
		label: "GCP Vertex AI",
		blurb: "serves Google and partner models through a Google Cloud Vertex AI project.",
		auth: "a Google Cloud service-account JSON key plus the project id and region",
		setupHeading: "Prepare a Vertex AI project",
		steps: [
			"Enable the Vertex AI API in your Google Cloud project.",
			"Create a service account with the Vertex AI User role and download its JSON key.",
			"In Roo+ paste the JSON key and set the project id and region.",
		],
		models: ["claude-sonnet-4-5@20250929", "gemini-3.1-pro-preview", "gemini-2.5-pro"],
		pricing: "Billed by Google Cloud per token / per model.",
	},
	{
		slug: "bedrock",
		label: "Amazon Bedrock",
		blurb: "serves Amazon Bedrock foundation models through AWS credentials.",
		auth: "AWS credentials (access keys, or a profile/ARN) with Bedrock invoke permissions",
		setupHeading: "Prepare AWS credentials",
		steps: [
			"Request model access for the Bedrock models you need in the AWS console.",
			"Create an IAM principal with Bedrock invoke permissions and obtain access keys.",
			"In Roo+ enter the region and credentials, or a custom ARN.",
		],
		models: [
			"anthropic.claude-sonnet-4-5-20250929-v1:0",
			"anthropic.claude-sonnet-4-20250514-v1:0",
			"amazon.nova-pro-v1:0",
		],
		pricing: "Billed by AWS per token / per provisioned throughput.",
	},
	{
		slug: "vscode-lm",
		label: "VS Code LM API",
		blurb: "uses the language models exposed by your VS Code installation (for example Copilot).",
		auth: "no credential — Roo+ uses the models your VS Code extensions expose",
		setupHeading: "Enable the VS Code language model API",
		steps: [
			"Install and sign in to an extension that provides VS Code language models.",
			"Choose VS Code LM API in Settings → Providers.",
			"Select one of the models VS Code reports.",
		],
		models: ["(models provided by your VS Code extensions)"],
		pricing: "Billed by the extension that provides the model; Roo+ adds no markup.",
	},
	{
		slug: "mistral",
		label: "Mistral",
		blurb: "serves the Mistral and Codestral models through the Mistral API.",
		auth: "a Mistral API key",
		setupHeading: "Get a Mistral API key",
		steps: [
			"Sign in to the Mistral console.",
			"Create an API key under API Keys.",
			"Copy the key for the next step.",
		],
		baseUrl: "https://api.mistral.ai",
		models: ["codestral-latest", "mistral-large-latest", "devstral-medium-latest"],
		pricing: "Per-token pricing published by Mistral.",
	},
	{
		slug: "lmstudio",
		label: "LM Studio",
		blurb: "runs models locally and exposes an OpenAI-compatible server.",
		auth: "no credential — the server runs on your own machine",
		setupHeading: "Run the local LM Studio server",
		steps: [
			"Open LM Studio and load a model.",
			"Start the local server from the Developer tab.",
			"Choose LM Studio in Roo+, confirm the base URL, and save.",
		],
		baseUrl: "http://localhost:1234/v1",
		models: ["mistralai/devstral-small-2505", "(whatever you loaded in LM Studio)"],
		pricing: "Free — inference runs on your own machine.",
	},
	{
		slug: "ollama",
		label: "Ollama",
		blurb: "runs open models locally and exposes them over a local HTTP API.",
		auth: "no credential — the server runs on your own machine",
		setupHeading: "Run Ollama locally",
		steps: [
			"Install Ollama and pull a model, for example a coding model.",
			"Confirm the Ollama server is running.",
			"Choose Ollama in Roo+, confirm the base URL, and save.",
		],
		baseUrl: "http://localhost:11434",
		models: ["devstral:24b", "(any model you have pulled with Ollama)"],
		pricing: "Free — inference runs on your own machine.",
	},
	{
		slug: "requesty",
		label: "Requesty",
		blurb: "is a routing gateway that offers one key for many models with failover and analytics.",
		auth: "a Requesty API key",
		setupHeading: "Get a Requesty API key",
		steps: ["Sign in to Requesty.", "Create an API key.", "Copy the key for the next step."],
		baseUrl: "https://router.requesty.ai/v1",
		models: ["coding/claude-4-sonnet", "(the routed models enabled on your key)"],
		pricing: "Pass-through routing; see Requesty for current rates.",
	},
	{
		slug: "xai",
		label: "xAI (Grok)",
		blurb: "serves the Grok models through the xAI API.",
		auth: "an xAI API key",
		setupHeading: "Get an xAI API key",
		steps: ["Sign in to the xAI console.", "Create an API key.", "Copy the key for the next step."],
		baseUrl: "https://api.x.ai/v1",
		models: ["grok-4.5", "grok-code-fast-1", "grok-4.20"],
		pricing: "Per-token pricing published by xAI.",
	},
	{
		slug: "litellm",
		label: "LiteLLM",
		blurb: "is a self-hosted proxy that presents one OpenAI-compatible API over many providers.",
		auth: "your proxy base URL and its master/virtual key",
		setupHeading: "Run your LiteLLM proxy",
		steps: [
			"Deploy the LiteLLM proxy and configure the models you want to expose.",
			"Note the proxy base URL and its master/virtual key.",
			"Choose LiteLLM in Roo+, enter both, and save.",
		],
		baseUrl: "http://localhost:4000",
		models: ["claude-3-7-sonnet-20250219", "(the models configured in your proxy)"],
		pricing: "Whatever the underlying providers charge; the proxy adds no markup.",
	},
	{
		slug: "sambanova",
		label: "SambaNova",
		blurb: "serves fast open-model inference through the SambaNova Cloud API.",
		auth: "a SambaNova Cloud API key",
		setupHeading: "Get a SambaNova API key",
		steps: ["Sign in to SambaNova Cloud.", "Create an API key.", "Copy the key for the next step."],
		baseUrl: "https://api.sambanova.ai/v1",
		models: ["Meta-Llama-3.3-70B-Instruct", "DeepSeek-R1", "Llama-4-Maverick-17B-128E-Instruct"],
		pricing: "Per-token pricing published by SambaNova.",
	},
	{
		slug: "zai",
		label: "Z.ai",
		blurb: "serves the GLM family of models through the Z.ai API.",
		auth: "a Z.ai API key for your chosen API line (international or mainland China)",
		setupHeading: "Get a Z.ai API key",
		steps: [
			"Sign in to the Z.ai platform and pick your API line (international or mainland).",
			"Create an API key.",
			"Copy the key for the next step.",
		],
		models: ["glm-4.7", "glm-4.6", "glm-4.5-air"],
		pricing: "Per-token pricing published by Z.ai.",
	},
	{
		slug: "fireworks",
		label: "Fireworks AI",
		blurb: "serves fast hosted inference for popular open models.",
		auth: "a Fireworks AI API key",
		setupHeading: "Get a Fireworks API key",
		steps: ["Sign in to Fireworks AI.", "Create an API key.", "Copy the key for the next step."],
		baseUrl: "https://api.fireworks.ai/inference/v1",
		models: [
			"accounts/fireworks/models/kimi-k2-instruct-0905",
			"accounts/fireworks/models/deepseek-v3",
			"accounts/fireworks/models/qwen3-coder-480b-a35b-instruct",
		],
		pricing: "Per-token pricing published by Fireworks.",
	},
	{
		slug: "friendli",
		label: "Friendli",
		blurb: "serves optimized inference through the Friendli engine and cloud.",
		auth: "a Friendli API key",
		setupHeading: "Get a Friendli API key",
		steps: ["Sign in to Friendli.", "Create an API key.", "Copy the key for the next step."],
		baseUrl: "https://api.friendli.ai/serverless/v1",
		models: ["zai-org/GLM-5.2", "deepseek-ai/DeepSeek-V3.2", "MiniMaxAI/MiniMax-M2.5"],
		pricing: "Per-token pricing published by FriendliAI.",
	},
	{
		slug: "vercel-ai-gateway",
		label: "Vercel AI Gateway",
		blurb: "routes one credential to many providers through Vercel's AI Gateway.",
		auth: "a Vercel AI Gateway API key",
		setupHeading: "Get a Vercel AI Gateway key",
		steps: [
			"Open the AI Gateway section of your Vercel dashboard.",
			"Create an API key.",
			"Copy the key for the next step.",
		],
		baseUrl: "https://ai-gateway.vercel.sh/v1",
		models: ["anthropic/claude-sonnet-4", "anthropic/claude-sonnet-4.5", "openai/gpt-5"],
		pricing: "Pass-through provider pricing plus Vercel gateway terms.",
	},
	{
		slug: "opencode-go",
		label: "Opencode Go",
		blurb: "is a coding-agent provider that exposes its models through an OpenAI-compatible API.",
		auth: "an Opencode Go API key",
		setupHeading: "Get an Opencode Go key",
		steps: [
			"Sign in to the Opencode Go service.",
			"Create an API key.",
			"Choose Opencode Go in Roo+, paste the key, and save.",
		],
		baseUrl: "https://opencode.ai/zen/go/v1",
		models: ["glm-5.2", "kimi-k3", "deepseek-v4-pro"],
		pricing: "Per the Opencode Go service terms.",
	},
	{
		slug: "kenari",
		label: "Kenari",
		blurb: "is a model provider exposed through an OpenAI-compatible endpoint.",
		auth: "a Kenari API key",
		setupHeading: "Get a Kenari API key",
		steps: ["Sign in to Kenari.", "Create an API key.", "Copy the key for the next step."],
		baseUrl: "https://kenari.id/v1",
		models: ["glm-5-2", "(the rest of the catalog is fetched from the Kenari endpoint)"],
		pricing: "Per the Kenari service terms.",
	},
	{
		slug: "nanogpt",
		label: "NanoGPT",
		blurb: "is a lightweight gateway that offers one key for a range of hosted models.",
		auth: "a NanoGPT API key",
		setupHeading: "Get a NanoGPT API key",
		steps: ["Sign in to NanoGPT.", "Create an API key.", "Choose NanoGPT in Roo+, paste the key, and save."],
		baseUrl: "https://nano-gpt.com/api/v1",
		models: ["openai/gpt-5.6-sol", "(the rest of the catalog is fetched from the NanoGPT endpoint)"],
		pricing: "Pass-through gateway pricing; see NanoGPT for current rates.",
	},
	{
		slug: "minimax",
		label: "MiniMax",
		blurb: "serves the MiniMax text models through the MiniMax API.",
		auth: "a MiniMax API key",
		setupHeading: "Get a MiniMax API key",
		steps: [
			"Sign in to the MiniMax platform.",
			"Create an API key and note the group id if required.",
			"Copy the key for the next step.",
		],
		baseUrl: "https://api.minimax.io/anthropic",
		models: ["MiniMax-M3", "MiniMax-M2.7", "MiniMax-M2.5"],
		pricing: "Per-token pricing published by MiniMax.",
	},
	{
		slug: "mimo",
		label: "Xiaomi MiMo",
		blurb: "serves Xiaomi's MiMo models through an OpenAI-compatible endpoint.",
		auth: "a Xiaomi MiMo API key",
		setupHeading: "Get a MiMo API key",
		steps: ["Sign in to the Xiaomi MiMo platform.", "Create an API key.", "Copy the key for the next step."],
		models: ["mimo-v2.5-pro", "mimo-v2.5"],
		pricing: "Per the Xiaomi MiMo service terms.",
	},
	{
		slug: "baseten",
		label: "Baseten",
		blurb: "hosts and serves models through the Baseten inference API.",
		auth: "a Baseten API key",
		setupHeading: "Get a Baseten API key",
		steps: ["Sign in to Baseten.", "Create an API key.", "Copy the key for the next step."],
		baseUrl: "https://inference.baseten.co/v1",
		models: ["zai-org/GLM-4.6", "moonshotai/Kimi-K2-Thinking", "(the rest of your deployments)"],
		pricing: "Billed by Baseten per deployment / per token.",
	},
	{
		slug: "unbound",
		label: "Unbound",
		blurb: "is a gateway that provides one key for a curated set of models.",
		auth: "an Unbound API key",
		setupHeading: "Get an Unbound API key",
		steps: ["Sign in to Unbound.", "Create an API key.", "Choose Unbound in Roo+, paste the key, and save."],
		baseUrl: "https://api.getunbound.ai/v1",
		models: ["anthropic/claude-sonnet-4-5", "(the models enabled on your key)"],
		pricing: "Pass-through gateway pricing; see Unbound for current rates.",
	},
	{
		slug: "poe",
		label: "Poe",
		blurb: "provides access to many chat models through a single Poe account and API.",
		auth: "a Poe API key",
		setupHeading: "Get a Poe API key",
		steps: [
			"Sign in to Poe and open the API section of your settings.",
			"Create an API key.",
			"Choose Poe in Roo+, paste the key, and save.",
		],
		models: ["(the bots/models available on your Poe account)"],
		pricing: "Metered against your Poe subscription / compute points.",
	},
]

/** The resolved provider doc slugs, in catalog order (32). */
export const PROVIDER_DOC_SLUGS = PROVIDER_PAGES.map((page) => page.slug)

/**
 * Dynamic `buildDocLink` prefixes whose `<slug>` placeholder must be expanded
 * to the concrete provider set by the verifier.
 */
export const DYNAMIC_PREFIXES = ["providers/"]

/**
 * Slugs that may legitimately have no local `docs/help` page and therefore
 * resolve through the deterministic GitHub Discussions fallback in
 * `buildDocLink`. Empty by design: all 32 providers are authored, so every
 * enumerated slug resolves to a real page. The constant is retained (and the
 * Discussions fallback remains in `buildDocLink`) so a future unmapped slug has
 * an explicit, reviewed escape hatch instead of a silent 404.
 */
export const FALLBACK_ALLOWLIST = []

/**
 * Renders the Markdown for one provider help page (plan §2.11 template).
 *
 * The leading one-line summary (directly under the H1) is the page's lead
 * sentence. "What this provider is" deliberately does NOT repeat it: it expands
 * the same idea with the verified connection facts (auth + default endpoint),
 * so the page never ships the same sentence twice.
 * @param {ProviderPage} page
 * @returns {string}
 */
export function renderProviderPage(page) {
	const lines = []
	lines.push(`# Provider setup: ${page.label}`)
	lines.push("")
	lines.push(`${page.label} ${page.blurb}`)
	lines.push("")
	lines.push("> Roo+ is a GitHub-only fork and links only to Roo+ GitHub resources. Open your")
	lines.push("> provider's own console from the provider card in **Settings → Providers** to create")
	lines.push("> credentials; this page does not restate third-party URLs.")
	lines.push("")
	lines.push("## What this provider is")
	lines.push("")
	lines.push(`- **How you connect** — ${page.auth}.`)
	if (page.baseUrl) {
		lines.push(`- **Default endpoint** — \`${page.baseUrl}\`.`)
	}
	lines.push("")
	lines.push(`## ${page.setupHeading}`)
	lines.push("")
	page.steps.forEach((step, index) => {
		lines.push(`${index + 1}. ${step}`)
	})
	lines.push("")
	lines.push("> Keep credentials out of your repository. Roo+ stores provider secrets in VS Code")
	lines.push("> secret storage, not in a committed settings file.")
	lines.push("")
	lines.push("## Configure in Roo+")
	lines.push("")
	lines.push("1. Open **Settings → Providers**.")
	lines.push(`2. Select **${page.label}** from the provider list.`)
	lines.push("3. Provide the credential or endpoint described above.")
	if (page.baseUrl) {
		lines.push(`4. Confirm the base URL (default \`${page.baseUrl}\`) if the field is shown.`)
	}
	lines.push(`${page.baseUrl ? 5 : 4}. Choose a model (see below) and press **Save**.`)
	lines.push("")
	lines.push("## Recommended models")
	lines.push("")
	for (const model of page.models) {
		lines.push(`- \`${model}\``)
	}
	lines.push("")
	lines.push("## Pricing notes")
	lines.push("")
	lines.push(page.pricing)
	lines.push("")
	return lines.join("\n")
}
