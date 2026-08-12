// npx vitest core/webview/__tests__/webviewMessageHandler.spec.ts

import type { Mock } from "vitest"

// Mock dependencies - must come before imports
vi.mock("../../../api/providers/fetchers/modelCache")
vi.mock("../../../api/providers/fetchers/lmstudio", () => ({
	getLMStudioModels: vi.fn(),
}))

vi.mock("../../../integrations/openai-codex/oauth", () => ({
	openAiCodexOAuthManager: {
		getAccessToken: vi.fn(),
		getAccountId: vi.fn(),
	},
}))

vi.mock("../../../integrations/openai-codex/rate-limits", () => ({
	fetchOpenAiCodexRateLimitInfo: vi.fn(),
}))

vi.mock("../../../services/command/commands", () => ({
	getCommands: vi.fn(),
}))

vi.mock("@anthropic-ai/vertex-sdk", () => ({
	AnthropicVertex: vi.fn(),
}))

vi.mock("google-auth-library", () => ({
	GoogleAuth: vi.fn(),
}))

vi.mock("ollama", () => ({
	Ollama: vi.fn(),
}))

// Mock the diagnosticsHandler module
vi.mock("../diagnosticsHandler", () => ({
	generateErrorDiagnostics: vi.fn().mockResolvedValue({ success: true, filePath: "/tmp/diagnostics.json" }),
}))

vi.mock("../rulesMessageHandler", () => ({
	handleRequestRules: vi.fn(),
	handleCreateRule: vi.fn(),
	handleDeleteRule: vi.fn(),
	handleOpenRuleFile: vi.fn(),
	handleOpenRulesDirectory: vi.fn(),
}))

vi.mock("../worktree", () => ({
	handleCheckBranchWorktreeInclude: vi.fn(),
	handleCheckoutBranch: vi.fn(),
	handleCreateWorktree: vi.fn(),
	handleCreateWorktreeInclude: vi.fn(),
	handleDeleteWorktree: vi.fn(),
	handleGetAvailableBranches: vi.fn(),
	handleGetWorktreeDefaults: vi.fn(),
	handleGetWorktreeIncludeStatus: vi.fn(),
	handleListWorktrees: vi.fn(),
	handleSwitchWorktree: vi.fn(),
}))

vi.mock("../../tools/UpdateTodoListTool", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../../tools/UpdateTodoListTool")>()
	return {
		...actual,
		setPendingTodoList: vi.fn(),
	}
})

vi.mock("../../../utils/tts", () => ({
	playTts: vi.fn().mockResolvedValue(undefined),
	setTtsEnabled: vi.fn(),
	setTtsSpeed: vi.fn(),
	stopTts: vi.fn(),
}))

import { parseExtensionMessage, type ModelRecord } from "@roo-code/types"

import { webviewMessageHandler } from "../webviewMessageHandler"
import type { ClineProvider } from "../ClineProvider"
import { setPendingTodoList } from "../../tools/UpdateTodoListTool"
import { flushModels, getModels } from "../../../api/providers/fetchers/modelCache"
import { getLMStudioModels } from "../../../api/providers/fetchers/lmstudio"
import { getCommands } from "../../../services/command/commands"
import {
	handleCreateRule,
	handleDeleteRule,
	handleOpenRuleFile,
	handleOpenRulesDirectory,
	handleRequestRules,
} from "../rulesMessageHandler"
import {
	handleCheckBranchWorktreeInclude,
	handleCreateWorktree,
	handleDeleteWorktree,
	handleGetAvailableBranches,
	handleGetWorktreeDefaults,
	handleGetWorktreeIncludeStatus,
	handleListWorktrees,
} from "../worktree"
import { MessageEnhancer } from "../messageEnhancer"
import { playTts, setTtsEnabled, setTtsSpeed } from "../../../utils/tts"
const { openAiCodexOAuthManager } = await import("../../../integrations/openai-codex/oauth")
const { fetchOpenAiCodexRateLimitInfo } = await import("../../../integrations/openai-codex/rate-limits")

const mockGetModels = getModels as Mock<typeof getModels>
const mockFlushModels = flushModels as Mock<typeof flushModels>
const mockGetLMStudioModels = getLMStudioModels as Mock<typeof getLMStudioModels>
const mockGetCommands = vi.mocked(getCommands)
const mockGetAccessToken = vi.mocked(openAiCodexOAuthManager.getAccessToken)
const mockGetAccountId = vi.mocked(openAiCodexOAuthManager.getAccountId)
const mockFetchOpenAiCodexRateLimitInfo = vi.mocked(fetchOpenAiCodexRateLimitInfo)
const mockSetPendingTodoList = vi.mocked(setPendingTodoList)
const mockHandleListWorktrees = vi.mocked(handleListWorktrees)
const mockHandleCreateWorktree = vi.mocked(handleCreateWorktree)
const mockHandleDeleteWorktree = vi.mocked(handleDeleteWorktree)
const mockHandleGetAvailableBranches = vi.mocked(handleGetAvailableBranches)
const mockHandleGetWorktreeDefaults = vi.mocked(handleGetWorktreeDefaults)
const mockHandleGetWorktreeIncludeStatus = vi.mocked(handleGetWorktreeIncludeStatus)
const mockHandleCheckBranchWorktreeInclude = vi.mocked(handleCheckBranchWorktreeInclude)

// Mock ClineProvider
const mockClineProvider = {
	getState: vi.fn(),
	postMessageToWebview: vi.fn(),
	customModesManager: {
		getCustomModes: vi.fn(),
		deleteCustomMode: vi.fn(),
	},
	context: {
		extensionPath: "/mock/extension/path",
		globalStorageUri: { fsPath: "/mock/global/storage" },
	},
	contextProxy: {
		context: {
			extensionPath: "/mock/extension/path",
			globalStorageUri: { fsPath: "/mock/global/storage" },
		},
		setValue: vi.fn(),
		getValue: vi.fn(),
	},
	log: vi.fn(),
	postStateToWebview: vi.fn(),
	getCurrentTask: vi.fn(),
	getTaskWithId: vi.fn(),
	createTaskWithHistoryItem: vi.fn(),
	getSkillsManager: vi.fn(),
	cwd: "/mock/workspace",
} as unknown as ClineProvider

import { t } from "../../../i18n"

vi.mock("vscode", () => {
	const showInformationMessage = vi.fn()
	const showErrorMessage = vi.fn()
	const openTextDocument = vi.fn().mockResolvedValue({})
	const showTextDocument = vi.fn().mockResolvedValue(undefined)
	const showOpenDialog = vi.fn()

	return {
		ConfigurationTarget: { Global: 1, Workspace: 2, WorkspaceFolder: 3 },
		Uri: {
			// The worktree `browseForWorktreePath` handler joins the first
			// workspace folder to build the picker's defaultUri. Deliberately a
			// plain (non-`vi.fn`) function: earlier describes call
			// `vi.restoreAllMocks()`, which would clear a mock implementation
			// and break the handler before `showOpenDialog` is reached.
			joinPath: () => ({ fsPath: "/mock/workspace/.." }),
		},
		window: {
			showInformationMessage,
			showErrorMessage,
			showTextDocument,
			showOpenDialog,
		},
		workspace: {
			workspaceFolders: [{ uri: { fsPath: "/mock/workspace" } }],
			openTextDocument,
			getConfiguration: vi.fn(() => ({ get: vi.fn(), update: vi.fn() })),
		},
		commands: {
			executeCommand: vi.fn().mockResolvedValue(undefined),
		},
	}
})

vi.mock("../../../i18n", () => ({
	t: vi.fn((key: string, args?: Record<string, any>) => {
		// For the delete confirmation with rules, we need to return the interpolated string
		if (key === "common:confirmation.delete_custom_mode_with_rules" && args) {
			return `Are you sure you want to delete this ${args.scope} mode?\n\nThis will also delete the associated rules folder at:\n${args.rulesFolderPath}`
		}
		// Return the translated value for "Yes"
		if (key === "common:answers.yes") {
			return "Yes"
		}
		// Return the translated value for "Cancel"
		if (key === "common:answers.cancel") {
			return "Cancel"
		}
		return key
	}),
}))

vi.mock("fs/promises", () => {
	const mockRm = vi.fn().mockResolvedValue(undefined)
	const mockMkdir = vi.fn().mockResolvedValue(undefined)
	const mockReadFile = vi.fn().mockResolvedValue("[]")
	const mockWriteFile = vi.fn().mockResolvedValue(undefined)

	return {
		default: {
			rm: mockRm,
			mkdir: mockMkdir,
			readFile: mockReadFile,
			writeFile: mockWriteFile,
		},
		rm: mockRm,
		mkdir: mockMkdir,
		readFile: mockReadFile,
		writeFile: mockWriteFile,
	}
})

import * as vscode from "vscode"
import * as fs from "fs/promises"
import * as os from "os"
import * as path from "path"
import * as fsUtils from "../../../utils/fs"
import { getWorkspacePath } from "../../../utils/path"
import { ensureSettingsDirectoryExists } from "../../../utils/globalContext"
import { generateErrorDiagnostics } from "../diagnosticsHandler"
import type { ModeConfig } from "@roo-code/types"

vi.mock("../../../utils/fs")
vi.mock("../../../utils/path")
vi.mock("../../../utils/globalContext")

vi.mock("../../mentions/resolveImageMentions", () => ({
	resolveImageMentions: vi.fn(async ({ text, images }: { text: string; images?: string[] }) => ({
		text,
		images: [...(images ?? []), "data:image/png;base64,from-mention"],
	})),
}))

vi.mock("../../../integrations/misc/image-handler", () => ({
	openImage: vi.fn().mockResolvedValue(undefined),
	saveImage: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("../../../integrations/misc/process-images", () => ({
	selectImages: vi.fn().mockResolvedValue(["data:image/png;base64,abc"]),
}))

vi.mock("../../../utils/export", () => ({
	resolveDefaultSaveUri: vi.fn().mockReturnValue({ fsPath: "/mock/downloads/img.png" }),
	saveLastExportPath: vi.fn().mockResolvedValue(undefined),
}))

import { resolveImageMentions } from "../../mentions/resolveImageMentions"
import { openImage, saveImage } from "../../../integrations/misc/image-handler"
import { selectImages } from "../../../integrations/misc/process-images"
import { resolveDefaultSaveUri, saveLastExportPath } from "../../../utils/export"
import { Terminal } from "../../../integrations/terminal/Terminal"
import { TerminalRegistry } from "../../../integrations/terminal/TerminalRegistry"

describe("webviewMessageHandler - requestLmStudioModels", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockGetLMStudioModels.mockReset()
		mockClineProvider.getState = vi.fn().mockResolvedValue({
			apiConfiguration: {
				lmStudioModelId: "model-1",
				lmStudioBaseUrl: "http://localhost:1234",
			},
		})
	})

	it("successfully fetches models from LMStudio", async () => {
		const mockModels: ModelRecord = {
			"model-1": {
				maxTokens: 4096,
				contextWindow: 8192,
				supportsPromptCache: false,
				description: "Test model 1",
			},
			"model-2": {
				maxTokens: 8192,
				contextWindow: 16384,
				supportsPromptCache: false,
				description: "Test model 2",
			},
		}

		mockGetModels.mockResolvedValue(mockModels)

		await webviewMessageHandler(mockClineProvider, {
			type: "requestLmStudioModels",
		})

		expect(mockGetModels).toHaveBeenCalledWith({ provider: "lmstudio", baseUrl: "http://localhost:1234" })

		expect(mockClineProvider.postMessageToWebview).toHaveBeenCalledWith({
			type: "lmStudioModels",
			lmStudioModels: mockModels,
		})
	})

	it("prefers the request payload base URL over persisted settings", async () => {
		mockGetLMStudioModels.mockResolvedValue({})

		await webviewMessageHandler(mockClineProvider, {
			type: "requestLmStudioModels",
			values: { baseUrl: "http://127.0.0.1:4321" },
		})

		expect(mockGetLMStudioModels).toHaveBeenCalledWith("http://127.0.0.1:4321")
		expect(mockGetModels).not.toHaveBeenCalled()
	})

	it("treats an empty-string base URL as an explicit preview request", async () => {
		mockGetLMStudioModels.mockResolvedValue({})

		await webviewMessageHandler(mockClineProvider, {
			type: "requestLmStudioModels",
			values: { baseUrl: "" },
		})

		expect(mockGetLMStudioModels).toHaveBeenCalledWith("")
		expect(mockGetModels).not.toHaveBeenCalled()
	})
})

describe("webviewMessageHandler - image mentions", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockClineProvider.getState = vi.fn().mockResolvedValue({
			maxImageFileSize: 5,
			maxTotalImageSize: 20,
		})
	})

	it("should resolve image mentions for askResponse payloads", async () => {
		const mockHandleWebviewAskResponse = vi.fn()
		vi.mocked(mockClineProvider.getCurrentTask).mockReturnValue({
			cwd: "/mock/workspace",
			rooIgnoreController: undefined,
			handleWebviewAskResponse: mockHandleWebviewAskResponse,
		} as any)

		await webviewMessageHandler(mockClineProvider, {
			type: "askResponse",
			askResponse: "messageResponse",
			text: "See @/img.png",
			images: [],
		})

		expect(vi.mocked(resolveImageMentions)).toHaveBeenCalled()
		expect(mockHandleWebviewAskResponse).toHaveBeenCalledWith("messageResponse", "See @/img.png", [
			"data:image/png;base64,from-mention",
		])
	})
})

describe("webviewMessageHandler - requestOllamaModels", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockFlushModels.mockReset()
		mockFlushModels.mockResolvedValue(undefined)
		mockGetModels.mockReset()
		mockClineProvider.getState = vi.fn().mockResolvedValue({
			apiConfiguration: {
				ollamaModelId: "model-1",
				ollamaBaseUrl: "http://localhost:1234",
			},
		})
	})

	it("successfully fetches models from Ollama", async () => {
		const mockModels: ModelRecord = {
			"model-1": {
				maxTokens: 4096,
				contextWindow: 8192,
				supportsPromptCache: false,
				description: "Test model 1",
			},
			"model-2": {
				maxTokens: 8192,
				contextWindow: 16384,
				supportsPromptCache: false,
				description: "Test model 2",
			},
		}

		mockGetModels.mockResolvedValue(mockModels)

		await webviewMessageHandler(mockClineProvider, {
			type: "requestOllamaModels",
		})

		expect(mockGetModels).toHaveBeenCalledWith({ provider: "ollama", baseUrl: "http://localhost:1234" })

		expect(mockClineProvider.postMessageToWebview).toHaveBeenCalledWith({
			type: "ollamaModels",
			ollamaModels: mockModels,
		})
	})

	it("posts empty models response when no models are found", async () => {
		mockGetModels.mockResolvedValue({})

		await webviewMessageHandler(mockClineProvider, {
			type: "requestOllamaModels",
		})

		expect(mockClineProvider.postMessageToWebview).toHaveBeenCalledWith({
			type: "ollamaModels",
			ollamaModels: {},
		})
	})

	it("posts empty models response with error message and logs to output on fetch failure", async () => {
		mockGetModels.mockRejectedValue(new Error("Connection refused"))

		await webviewMessageHandler(mockClineProvider, {
			type: "requestOllamaModels",
		})

		expect(mockClineProvider.postMessageToWebview).toHaveBeenCalledWith({
			type: "ollamaModels",
			ollamaModels: {},
			error: "Connection refused",
		})

		expect(mockClineProvider.log).toHaveBeenCalledWith(
			"[requestOllamaModels] Failed to read models for http://localhost:1234: Connection refused",
		)
	})

	it("distinguishes a model cache refresh failure from a model read failure", async () => {
		mockFlushModels.mockRejectedValue(new Error("Cache write failed"))

		await webviewMessageHandler(mockClineProvider, {
			type: "requestOllamaModels",
			values: { baseUrl: "https://ollama.example.com" },
		})

		expect(mockGetModels).not.toHaveBeenCalled()
		expect(mockClineProvider.log).toHaveBeenCalledWith(
			"[requestOllamaModels] Failed to refresh model cache for https://ollama.example.com: Cache write failed",
		)
		expect(mockClineProvider.postMessageToWebview).toHaveBeenCalledWith({
			type: "ollamaModels",
			ollamaModels: {},
			error: "Cache write failed",
		})
	})

	it("uses baseUrl from message values over saved state", async () => {
		const mockModels: ModelRecord = {
			"remote-model": {
				maxTokens: 4096,
				contextWindow: 8192,
				supportsPromptCache: false,
				description: "Remote model",
			},
		}

		mockGetModels.mockResolvedValue(mockModels)

		await webviewMessageHandler(mockClineProvider, {
			type: "requestOllamaModels",
			values: {
				baseUrl: "https://ollama.example.com",
				apiKey: "secret-key",
			},
		})

		// Should use the URL from message values, not the saved state
		expect(mockFlushModels).toHaveBeenCalledWith(
			{
				provider: "ollama",
				baseUrl: "https://ollama.example.com",
				apiKey: "secret-key",
			},
			true,
		)
		expect(mockGetModels).toHaveBeenCalledWith({
			provider: "ollama",
			baseUrl: "https://ollama.example.com",
			apiKey: "secret-key",
		})

		expect(mockClineProvider.postMessageToWebview).toHaveBeenCalledWith({
			type: "ollamaModels",
			ollamaModels: mockModels,
		})
	})
})

describe("webviewMessageHandler - requestRouterModels", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockClineProvider.getState = vi.fn().mockResolvedValue({
			apiConfiguration: {
				openRouterApiKey: "openrouter-key",
				requestyApiKey: "requesty-key",
				litellmApiKey: "litellm-key",
				litellmBaseUrl: "http://localhost:4000",
			},
		})
	})

	it("successfully fetches models from all providers", async () => {
		const mockModels: ModelRecord = {
			"model-1": {
				maxTokens: 4096,
				contextWindow: 8192,
				supportsPromptCache: false,
				description: "Test model 1",
			},
			"model-2": {
				maxTokens: 8192,
				contextWindow: 16384,
				supportsPromptCache: false,
				description: "Test model 2",
			},
		}

		mockGetModels.mockResolvedValue(mockModels)

		await webviewMessageHandler(mockClineProvider, {
			type: "requestRouterModels",
		})

		// Verify getModels was called for each provider
		expect(mockGetModels).toHaveBeenCalledWith({ provider: "openrouter" })
		expect(mockGetModels).toHaveBeenCalledWith({ provider: "requesty", apiKey: "requesty-key" })
		expect(mockGetModels).toHaveBeenCalledWith(
			expect.objectContaining({
				provider: "unbound",
			}),
		)
		expect(mockGetModels).toHaveBeenCalledWith({ provider: "vercel-ai-gateway" })
		expect(mockGetModels).toHaveBeenCalledWith({
			provider: "litellm",
			apiKey: "litellm-key",
			baseUrl: "http://localhost:4000",
		})
		// Opencode Go's /models endpoint is public, so it is fetched like the other no-auth routers.
		expect(mockGetModels).toHaveBeenCalledWith(expect.objectContaining({ provider: "opencode-go" }))
		// Kenari's /models endpoint is public, so it is fetched like the other no-auth routers.
		expect(mockGetModels).toHaveBeenCalledWith(expect.objectContaining({ provider: "kenari" }))

		// Verify response was sent
		expect(mockClineProvider.postMessageToWebview).toHaveBeenCalledWith({
			type: "routerModels",
			routerModels: {
				openrouter: mockModels,
				requesty: mockModels,
				unbound: mockModels,
				"vercel-ai-gateway": mockModels,
				litellm: mockModels,
				ollama: {},
				lmstudio: {},
				poe: {},
				deepseek: {},
				moonshot: {},
				"opencode-go": mockModels,
				kenari: mockModels,
				"kimi-code": {},
			},
			values: undefined,
		})
	})

	it("fetches Opencode Go models without an API key (public /models endpoint, regression for empty picker)", async () => {
		mockClineProvider.getState = vi.fn().mockResolvedValue({
			apiConfiguration: {
				openRouterApiKey: "openrouter-key",
				// Deliberately no opencodeGoApiKey — the endpoint is public.
			},
		})

		const mockModels: ModelRecord = {
			"glm-5.1": {
				maxTokens: 4096,
				contextWindow: 8192,
				supportsPromptCache: false,
				description: "GLM 5.1",
			},
		}
		mockGetModels.mockResolvedValue(mockModels)

		await webviewMessageHandler(mockClineProvider, { type: "requestRouterModels" })

		// Must be fetched despite no configured key, forwarding apiKey: undefined.
		expect(mockGetModels).toHaveBeenCalledWith({ provider: "opencode-go", apiKey: undefined })

		const routerModelsCall = (mockClineProvider.postMessageToWebview as any).mock.calls.find(
			([msg]: [{ type: string }]) => msg.type === "routerModels",
		)
		expect(routerModelsCall?.[0].routerModels["opencode-go"]).toEqual(mockModels)
	})

	it("flushes and fetches Opencode Go models when an explicit API key is supplied", async () => {
		mockClineProvider.getState = vi.fn().mockResolvedValue({
			apiConfiguration: {},
		})
		mockGetModels.mockResolvedValue({
			"opencode/model": {
				maxTokens: 4096,
				contextWindow: 8192,
				supportsPromptCache: false,
				description: "Opencode model",
			},
		})

		await webviewMessageHandler(mockClineProvider, {
			type: "requestRouterModels",
			values: {
				provider: "opencode-go",
				opencodeGoApiKey: "fresh-key",
			},
		})

		expect(mockFlushModels).toHaveBeenCalledWith({ provider: "opencode-go", apiKey: "fresh-key" }, true)
		expect(mockGetModels).toHaveBeenCalledWith({ provider: "opencode-go", apiKey: "fresh-key" })
		expect(mockClineProvider.postMessageToWebview).toHaveBeenCalledWith({
			type: "routerModels",
			routerModels: {
				"opencode-go": {
					"opencode/model": expect.objectContaining({ description: "Opencode model" }),
				},
			},
			values: { provider: "opencode-go" },
		})
	})

	it("flushes and fetches Kenari models when an explicit API key is supplied", async () => {
		mockClineProvider.getState = vi.fn().mockResolvedValue({
			apiConfiguration: {},
		})
		mockGetModels.mockResolvedValue({
			"glm-5-2": {
				maxTokens: 32768,
				contextWindow: 1048576,
				supportsPromptCache: false,
				description: "Kenari model",
			},
		})

		await webviewMessageHandler(mockClineProvider, {
			type: "requestRouterModels",
			values: {
				provider: "kenari",
				kenariApiKey: "fresh-kenari-key",
			},
		})

		expect(mockFlushModels).toHaveBeenCalledWith({ provider: "kenari", apiKey: "fresh-kenari-key" }, true)
		expect(mockGetModels).toHaveBeenCalledWith({ provider: "kenari", apiKey: "fresh-kenari-key" })
		expect(mockClineProvider.postMessageToWebview).toHaveBeenCalledWith({
			type: "routerModels",
			routerModels: {
				kenari: {
					"glm-5-2": expect.objectContaining({ description: "Kenari model" }),
				},
			},
			values: { provider: "kenari" },
		})
	})

	it("handles LiteLLM models with values from message when config is missing", async () => {
		mockClineProvider.getState = vi.fn().mockResolvedValue({
			apiConfiguration: {
				openRouterApiKey: "openrouter-key",
				requestyApiKey: "requesty-key",
				// Missing litellm config
			},
		})

		const mockModels: ModelRecord = {
			"model-1": {
				maxTokens: 4096,
				contextWindow: 8192,
				supportsPromptCache: false,
				description: "Test model 1",
			},
		}

		mockGetModels.mockResolvedValue(mockModels)

		await webviewMessageHandler(mockClineProvider, {
			type: "requestRouterModels",
			values: {
				litellmApiKey: "message-litellm-key",
				litellmBaseUrl: "http://message-url:4000",
			},
		})

		// Verify LiteLLM was called with values from message
		expect(mockGetModels).toHaveBeenCalledWith({
			provider: "litellm",
			apiKey: "message-litellm-key",
			baseUrl: "http://message-url:4000",
		})
	})

	it("skips LiteLLM when both config and message values are missing", async () => {
		mockClineProvider.getState = vi.fn().mockResolvedValue({
			apiConfiguration: {
				openRouterApiKey: "openrouter-key",
				requestyApiKey: "requesty-key",
				// Missing litellm config
			},
		})

		const mockModels: ModelRecord = {
			"model-1": {
				maxTokens: 4096,
				contextWindow: 8192,
				supportsPromptCache: false,
				description: "Test model 1",
			},
		}

		mockGetModels.mockResolvedValue(mockModels)

		await webviewMessageHandler(mockClineProvider, {
			type: "requestRouterModels",
			// No values provided
		})

		// Verify LiteLLM was NOT called
		expect(mockGetModels).not.toHaveBeenCalledWith(
			expect.objectContaining({
				provider: "litellm",
			}),
		)

		// Verify response includes empty object for LiteLLM
		expect(mockClineProvider.postMessageToWebview).toHaveBeenCalledWith({
			type: "routerModels",
			routerModels: {
				openrouter: mockModels,
				requesty: mockModels,
				unbound: mockModels,
				"vercel-ai-gateway": mockModels,
				litellm: {},
				ollama: {},
				lmstudio: {},
				poe: {},
				deepseek: {},
				moonshot: {},
				"opencode-go": mockModels,
				kenari: mockModels,
				"kimi-code": {},
			},
			values: undefined,
		})
	})

	it("handles individual provider failures gracefully", async () => {
		const mockModels: ModelRecord = {
			"model-1": {
				maxTokens: 4096,
				contextWindow: 8192,
				supportsPromptCache: false,
				description: "Test model 1",
			},
		}

		// Mock some providers to succeed and others to fail
		mockGetModels
			.mockResolvedValueOnce(mockModels) // openrouter
			.mockRejectedValueOnce(new Error("Requesty API error")) // requesty
			.mockResolvedValueOnce(mockModels) // unbound
			.mockResolvedValueOnce(mockModels) // vercel-ai-gateway
			.mockRejectedValueOnce(new Error("LiteLLM connection failed")) // litellm
			.mockResolvedValueOnce(mockModels) // opencode-go

		await webviewMessageHandler(mockClineProvider, {
			type: "requestRouterModels",
		})

		// Verify error messages were sent for failed providers (these come first)
		expect(mockClineProvider.postMessageToWebview).toHaveBeenCalledWith({
			type: "singleRouterModelFetchResponse",
			success: false,
			error: "Requesty API error",
			values: { provider: "requesty" },
		})

		expect(mockClineProvider.postMessageToWebview).toHaveBeenCalledWith({
			type: "singleRouterModelFetchResponse",
			success: false,
			error: "LiteLLM connection failed",
			values: { provider: "litellm" },
		})

		// Verify final routerModels response includes successful providers and empty objects for failed ones
		expect(mockClineProvider.postMessageToWebview).toHaveBeenCalledWith({
			type: "routerModels",
			routerModels: {
				openrouter: mockModels,
				requesty: {},
				unbound: mockModels,
				"vercel-ai-gateway": mockModels,
				litellm: {},
				ollama: {},
				lmstudio: {},
				poe: {},
				deepseek: {},
				moonshot: {},
				"opencode-go": mockModels,
				kenari: mockModels,
				"kimi-code": {},
			},
			values: undefined,
		})
	})

	it("handles Error objects and string errors correctly", async () => {
		// Mock providers to fail with different error types
		mockGetModels
			.mockRejectedValueOnce(new Error("Structured error message")) // openrouter
			.mockRejectedValueOnce(new Error("Requesty API error")) // requesty
			.mockRejectedValueOnce(new Error("Unbound error")) // unbound
			.mockRejectedValueOnce(new Error("Vercel AI Gateway error")) // vercel-ai-gateway
			.mockRejectedValueOnce(new Error("LiteLLM connection failed")) // litellm

		await webviewMessageHandler(mockClineProvider, {
			type: "requestRouterModels",
		})

		// Verify error handling for different error types
		expect(mockClineProvider.postMessageToWebview).toHaveBeenCalledWith({
			type: "singleRouterModelFetchResponse",
			success: false,
			error: "Structured error message",
			values: { provider: "openrouter" },
		})

		expect(mockClineProvider.postMessageToWebview).toHaveBeenCalledWith({
			type: "singleRouterModelFetchResponse",
			success: false,
			error: "Requesty API error",
			values: { provider: "requesty" },
		})

		expect(mockClineProvider.postMessageToWebview).toHaveBeenCalledWith({
			type: "singleRouterModelFetchResponse",
			success: false,
			error: "Unbound error",
			values: { provider: "unbound" },
		})

		expect(mockClineProvider.postMessageToWebview).toHaveBeenCalledWith({
			type: "singleRouterModelFetchResponse",
			success: false,
			error: "Vercel AI Gateway error",
			values: { provider: "vercel-ai-gateway" },
		})

		expect(mockClineProvider.postMessageToWebview).toHaveBeenCalledWith({
			type: "singleRouterModelFetchResponse",
			success: false,
			error: "LiteLLM connection failed",
			values: { provider: "litellm" },
		})
	})

	it("returns an explicit removal error for requestRooModels", async () => {
		await webviewMessageHandler(mockClineProvider, {
			type: "requestRooModels",
		})

		expect(mockClineProvider.postMessageToWebview).toHaveBeenCalledWith({
			type: "singleRouterModelFetchResponse",
			success: false,
			error: "Roo Code Router has been removed. Please select and configure a different provider.",
			values: { provider: "roo" },
		})
	})

	it("prefers message values over config values for LiteLLM", async () => {
		const mockModels: ModelRecord = {}
		mockGetModels.mockResolvedValue(mockModels)

		await webviewMessageHandler(mockClineProvider, {
			type: "requestRouterModels",
			values: {
				litellmApiKey: "message-key",
				litellmBaseUrl: "http://message-url",
			},
		})

		// Verify message values take precedence over saved config (current unsaved field state wins)
		expect(mockGetModels).toHaveBeenCalledWith({
			provider: "litellm",
			apiKey: "message-key", // From message.values
			baseUrl: "http://message-url", // From message.values
		})
	})
})

describe("webviewMessageHandler - requestOpenAiCodexRateLimits", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockGetAccessToken.mockResolvedValue(null)
		mockGetAccountId.mockResolvedValue(null)
	})

	it("posts error when not authenticated", async () => {
		await webviewMessageHandler(mockClineProvider, { type: "requestOpenAiCodexRateLimits" } as any)

		expect(mockClineProvider.postMessageToWebview).toHaveBeenCalledWith({
			type: "openAiCodexRateLimits",
			error: "Not authenticated with OpenAI Codex",
		})
	})

	it("posts values when authenticated", async () => {
		mockGetAccessToken.mockResolvedValue("token")
		mockGetAccountId.mockResolvedValue("acct_123")
		mockFetchOpenAiCodexRateLimitInfo.mockResolvedValue({
			primary: { usedPercent: 10, resetsAt: 1700000000000 },
			fetchedAt: 1700000000000,
		})

		await webviewMessageHandler(mockClineProvider, { type: "requestOpenAiCodexRateLimits" } as any)

		expect(mockFetchOpenAiCodexRateLimitInfo).toHaveBeenCalledWith("token", { accountId: "acct_123" })
		expect(mockClineProvider.postMessageToWebview).toHaveBeenCalledWith({
			type: "openAiCodexRateLimits",
			values: {
				primary: { usedPercent: 10, resetsAt: 1700000000000 },
				fetchedAt: 1700000000000,
			},
		})
	})

	it("posts error when fetching the access token fails", async () => {
		mockGetAccessToken.mockRejectedValueOnce(new Error("token failed"))

		await webviewMessageHandler(mockClineProvider, { type: "requestOpenAiCodexRateLimits" })

		expect(mockClineProvider.postMessageToWebview).toHaveBeenCalledWith({
			type: "openAiCodexRateLimits",
			error: "token failed",
		})
	})

	it("posts an openAiCodexRateLimits payload that parses cleanly at the boundary", async () => {
		mockGetAccessToken.mockResolvedValue("token")
		mockGetAccountId.mockResolvedValue("acct_123")
		mockFetchOpenAiCodexRateLimitInfo.mockResolvedValue({
			primary: { usedPercent: 10, resetsAt: 1700000000000 },
			fetchedAt: 1700000000000,
		})

		await webviewMessageHandler(mockClineProvider, { type: "requestOpenAiCodexRateLimits" })

		const posted = vi.mocked(mockClineProvider.postMessageToWebview).mock.calls.map((call) => call[0])
		const rateLimitMessage = posted.find((message: { type?: string }) => message.type === "openAiCodexRateLimits")
		expect(rateLimitMessage).toBeDefined()

		const parsed = parseExtensionMessage(rateLimitMessage)
		expect(parsed.ok).toBe(true)
		if (parsed.ok) {
			// `values` is drained from the flat `any` to the typed
			// OpenAiCodexRateLimitInfo shape at the boundary.
			expect((parsed.message as { values?: { fetchedAt?: number } }).values?.fetchedAt).toBe(1700000000000)
		}
	})
})

describe("webviewMessageHandler - deleteCustomMode", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(getWorkspacePath).mockReturnValue("/mock/workspace")
		vi.mocked(vscode.window.showErrorMessage).mockResolvedValue(undefined)
		vi.mocked(ensureSettingsDirectoryExists).mockResolvedValue("/mock/global/storage/.roo")
	})

	it("should delete a project mode and its rules folder", async () => {
		const slug = "test-project-mode"
		const rulesFolderPath = path.join("/mock/workspace", ".roo", `rules-${slug}`)

		vi.mocked(mockClineProvider.customModesManager.getCustomModes).mockResolvedValue([
			{
				name: "Test Project Mode",
				slug,
				roleDefinition: "Test Role",
				groups: [],
				source: "project",
			} as ModeConfig,
		])
		vi.mocked(fsUtils.fileExistsAtPath).mockResolvedValue(true)
		vi.mocked(mockClineProvider.customModesManager.deleteCustomMode).mockResolvedValue(undefined)

		await webviewMessageHandler(mockClineProvider, { type: "deleteCustomMode", slug })

		// The confirmation dialog is now handled in the webview, so we don't expect showInformationMessage to be called
		expect(vscode.window.showInformationMessage).not.toHaveBeenCalled()
		expect(mockClineProvider.customModesManager.deleteCustomMode).toHaveBeenCalledWith(slug)
		expect(fs.rm).toHaveBeenCalledWith(rulesFolderPath, { recursive: true, force: true })
	})

	it("should delete a global mode and its rules folder", async () => {
		const slug = "test-global-mode"
		const homeDir = os.homedir()
		const rulesFolderPath = path.join(homeDir, ".roo", `rules-${slug}`)

		vi.mocked(mockClineProvider.customModesManager.getCustomModes).mockResolvedValue([
			{
				name: "Test Global Mode",
				slug,
				roleDefinition: "Test Role",
				groups: [],
				source: "global",
			} as ModeConfig,
		])
		vi.mocked(fsUtils.fileExistsAtPath).mockResolvedValue(true)
		vi.mocked(mockClineProvider.customModesManager.deleteCustomMode).mockResolvedValue(undefined)

		await webviewMessageHandler(mockClineProvider, { type: "deleteCustomMode", slug })

		// The confirmation dialog is now handled in the webview, so we don't expect showInformationMessage to be called
		expect(vscode.window.showInformationMessage).not.toHaveBeenCalled()
		expect(mockClineProvider.customModesManager.deleteCustomMode).toHaveBeenCalledWith(slug)
		expect(fs.rm).toHaveBeenCalledWith(rulesFolderPath, { recursive: true, force: true })
	})

	it("should only delete the mode when rules folder does not exist", async () => {
		const slug = "test-mode-no-rules"
		vi.mocked(mockClineProvider.customModesManager.getCustomModes).mockResolvedValue([
			{
				name: "Test Mode No Rules",
				slug,
				roleDefinition: "Test Role",
				groups: [],
				source: "project",
			} as ModeConfig,
		])
		vi.mocked(fsUtils.fileExistsAtPath).mockResolvedValue(false)
		vi.mocked(mockClineProvider.customModesManager.deleteCustomMode).mockResolvedValue(undefined)

		await webviewMessageHandler(mockClineProvider, { type: "deleteCustomMode", slug })

		// The confirmation dialog is now handled in the webview, so we don't expect showInformationMessage to be called
		expect(vscode.window.showInformationMessage).not.toHaveBeenCalled()
		expect(mockClineProvider.customModesManager.deleteCustomMode).toHaveBeenCalledWith(slug)
		expect(fs.rm).not.toHaveBeenCalled()
	})

	it("should handle errors when deleting rules folder", async () => {
		const slug = "test-mode-error"
		const rulesFolderPath = path.join("/mock/workspace", ".roo", `rules-${slug}`)
		const error = new Error("Permission denied")

		vi.mocked(mockClineProvider.customModesManager.getCustomModes).mockResolvedValue([
			{
				name: "Test Mode Error",
				slug,
				roleDefinition: "Test Role",
				groups: [],
				source: "project",
			} as ModeConfig,
		])
		vi.mocked(fsUtils.fileExistsAtPath).mockResolvedValue(true)
		vi.mocked(mockClineProvider.customModesManager.deleteCustomMode).mockResolvedValue(undefined)
		vi.mocked(fs.rm).mockRejectedValue(error)

		await webviewMessageHandler(mockClineProvider, { type: "deleteCustomMode", slug })

		expect(mockClineProvider.customModesManager.deleteCustomMode).toHaveBeenCalledWith(slug)
		expect(fs.rm).toHaveBeenCalledWith(rulesFolderPath, { recursive: true, force: true })
		// Verify error message is shown to the user
		expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
			t("common:errors.delete_rules_folder_failed", {
				rulesFolderPath,
				error: error.message,
			}),
		)
		// No error response is sent anymore - we just continue with deletion
		expect(mockClineProvider.postMessageToWebview).not.toHaveBeenCalled()
	})

	it("should send a deleteCustomModeCheck response (with rulesFolderPath) for checkOnly requests", async () => {
		const slug = "test-check-mode"
		const rulesFolderPath = path.join("/mock/workspace", ".roo", `rules-${slug}`)

		vi.mocked(mockClineProvider.customModesManager.getCustomModes).mockResolvedValue([
			{
				name: "Test Check Mode",
				slug,
				roleDefinition: "Test Role",
				groups: [],
				source: "project",
			} as ModeConfig,
		])
		vi.mocked(fsUtils.fileExistsAtPath).mockResolvedValue(true)

		await webviewMessageHandler(mockClineProvider, { type: "deleteCustomMode", slug, checkOnly: true })

		// The pre-check response is posted and the mode is NOT deleted.
		expect(mockClineProvider.customModesManager.deleteCustomMode).not.toHaveBeenCalled()
		const posted = vi.mocked(mockClineProvider.postMessageToWebview).mock.calls.map((call) => call[0])
		const checkMessage = posted.find((message: { type?: string }) => message.type === "deleteCustomModeCheck")
		expect(checkMessage).toEqual({ type: "deleteCustomModeCheck", slug, rulesFolderPath })

		// The outbound deleteCustomModeCheck must pass the typed boundary (Phase 2, Domain 4).
		const parsed = parseExtensionMessage(checkMessage)
		expect(parsed.ok).toBe(true)
	})

	it("should omit rulesFolderPath from the check response when the folder is missing", async () => {
		const slug = "test-check-mode-missing"
		vi.mocked(mockClineProvider.customModesManager.getCustomModes).mockResolvedValue([
			{
				name: "Test Check Mode Missing",
				slug,
				roleDefinition: "Test Role",
				groups: [],
				source: "project",
			} as ModeConfig,
		])
		vi.mocked(fsUtils.fileExistsAtPath).mockResolvedValue(false)

		await webviewMessageHandler(mockClineProvider, { type: "deleteCustomMode", slug, checkOnly: true })

		expect(mockClineProvider.customModesManager.deleteCustomMode).not.toHaveBeenCalled()
		const posted = vi.mocked(mockClineProvider.postMessageToWebview).mock.calls.map((call) => call[0])
		const checkMessage = posted.find((message: { type?: string }) => message.type === "deleteCustomModeCheck")
		expect(checkMessage).toMatchObject({ type: "deleteCustomModeCheck", slug })
		expect((checkMessage as { rulesFolderPath?: string }).rulesFolderPath).toBeUndefined()

		// The schema allows the optional rulesFolderPath to be absent.
		const parsed = parseExtensionMessage(checkMessage)
		expect(parsed.ok).toBe(true)
	})
})

describe("webviewMessageHandler - message dialog preferences", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		// Mock a current Cline instance
		vi.mocked(mockClineProvider.getCurrentTask).mockReturnValue({
			taskId: "test-task-id",
			apiConversationHistory: [],
			clineMessages: [],
		} as any)
		// Reset getValue mock
		vi.mocked(mockClineProvider.contextProxy.getValue).mockReturnValue(false)
	})

	describe("deleteMessage", () => {
		it("should always show dialog for delete confirmation", async () => {
			vi.mocked(mockClineProvider.getCurrentTask).mockReturnValue({
				clineMessages: [],
				apiConversationHistory: [],
			} as any) // Mock current cline with proper structure

			await webviewMessageHandler(mockClineProvider, {
				type: "deleteMessage",
				value: 123456789, // Changed from messageTs to value
			})

			expect(mockClineProvider.postMessageToWebview).toHaveBeenCalledWith({
				type: "showDeleteMessageDialog",
				messageTs: 123456789,
				hasCheckpoint: false,
			})
		})
	})

	describe("submitEditedMessage", () => {
		it("should always show dialog for edit confirmation", async () => {
			vi.mocked(mockClineProvider.getCurrentTask).mockReturnValue({
				clineMessages: [],
				apiConversationHistory: [],
			} as any) // Mock current cline with proper structure

			await webviewMessageHandler(mockClineProvider, {
				type: "submitEditedMessage",
				value: 123456789,
				editedMessageContent: "edited content",
			})

			expect(mockClineProvider.postMessageToWebview).toHaveBeenCalledWith({
				type: "showEditMessageDialog",
				messageTs: 123456789,
				text: "edited content",
				hasCheckpoint: false,
				images: undefined,
			})
		})
	})
})

describe("webviewMessageHandler - mcpEnabled", () => {
	let mockMcpHub: any

	beforeEach(() => {
		vi.clearAllMocks()

		// Create a mock McpHub instance
		mockMcpHub = {
			handleMcpEnabledChange: vi.fn().mockResolvedValue(undefined),
		}

		// Ensure provider exposes getMcpHub and returns our mock
		;(mockClineProvider as any).getMcpHub = vi.fn().mockReturnValue(mockMcpHub)
	})

	it("delegates enable=true to McpHub and posts updated state", async () => {
		await webviewMessageHandler(mockClineProvider, {
			type: "updateSettings",
			updatedSettings: { mcpEnabled: true },
		})

		expect((mockClineProvider as any).getMcpHub).toHaveBeenCalledTimes(1)
		expect(mockMcpHub.handleMcpEnabledChange).toHaveBeenCalledTimes(1)
		expect(mockMcpHub.handleMcpEnabledChange).toHaveBeenCalledWith(true)
		expect(mockClineProvider.postStateToWebview).toHaveBeenCalledTimes(1)
	})

	it("delegates enable=false to McpHub and posts updated state", async () => {
		await webviewMessageHandler(mockClineProvider, {
			type: "updateSettings",
			updatedSettings: { mcpEnabled: false },
		})

		expect((mockClineProvider as any).getMcpHub).toHaveBeenCalledTimes(1)
		expect(mockMcpHub.handleMcpEnabledChange).toHaveBeenCalledTimes(1)
		expect(mockMcpHub.handleMcpEnabledChange).toHaveBeenCalledWith(false)
		expect(mockClineProvider.postStateToWebview).toHaveBeenCalledTimes(1)
	})

	it("handles missing McpHub instance gracefully and still posts state", async () => {
		;(mockClineProvider as any).getMcpHub = vi.fn().mockReturnValue(undefined)

		await webviewMessageHandler(mockClineProvider, {
			type: "updateSettings",
			updatedSettings: { mcpEnabled: true },
		})

		expect((mockClineProvider as any).getMcpHub).toHaveBeenCalledTimes(1)
		expect(mockClineProvider.postStateToWebview).toHaveBeenCalledTimes(1)
	})
})

describe("webviewMessageHandler - terminalProfile", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		Terminal.setTerminalProfile(undefined)
	})

	afterEach(() => {
		Terminal.setTerminalProfile(undefined)
		vi.restoreAllMocks()
	})

	it("normalizes and persists a saved terminalProfile, then closes stale idle terminals", async () => {
		const closeIdleTerminalsSpy = vi.spyOn(TerminalRegistry, "closeIdleTerminals").mockImplementation(() => {})

		await webviewMessageHandler(mockClineProvider, {
			type: "updateSettings",
			updatedSettings: { terminalProfile: " Git Bash " },
		})

		expect(Terminal.getTerminalProfile()).toBe("Git Bash")
		expect(mockClineProvider.contextProxy.setValue).toHaveBeenCalledWith("terminalProfile", "Git Bash")
		expect(closeIdleTerminalsSpy).toHaveBeenCalledTimes(1)
	})

	it("does not close idle terminals when hydration sends the unchanged profile", async () => {
		Terminal.setTerminalProfile("Git Bash")
		const closeIdleTerminalsSpy = vi.spyOn(TerminalRegistry, "closeIdleTerminals").mockImplementation(() => {})

		await webviewMessageHandler(mockClineProvider, {
			type: "updateSettings",
			updatedSettings: { terminalProfile: " Git Bash " },
		})

		expect(mockClineProvider.contextProxy.setValue).toHaveBeenCalledWith("terminalProfile", "Git Bash")
		expect(closeIdleTerminalsSpy).not.toHaveBeenCalled()
	})

	it("clears the persisted profile when SettingsView sends the empty-string sentinel", async () => {
		Terminal.setTerminalProfile("Git Bash")
		const closeIdleTerminalsSpy = vi.spyOn(TerminalRegistry, "closeIdleTerminals").mockImplementation(() => {})

		await webviewMessageHandler(mockClineProvider, {
			type: "updateSettings",
			updatedSettings: { terminalProfile: "" },
		})

		expect(Terminal.getTerminalProfile()).toBeUndefined()
		expect(mockClineProvider.contextProxy.setValue).toHaveBeenCalledWith("terminalProfile", undefined)
		expect(closeIdleTerminalsSpy).toHaveBeenCalledTimes(1)
	})

	it("does not close idle terminals when the empty-string sentinel leaves the profile unset", async () => {
		const closeIdleTerminalsSpy = vi.spyOn(TerminalRegistry, "closeIdleTerminals").mockImplementation(() => {})

		await webviewMessageHandler(mockClineProvider, {
			type: "updateSettings",
			updatedSettings: { terminalProfile: "" },
		})

		expect(mockClineProvider.contextProxy.setValue).toHaveBeenCalledWith("terminalProfile", undefined)
		expect(closeIdleTerminalsSpy).not.toHaveBeenCalled()
	})

	it("rejects a malformed updateSettings message with a non-string terminalProfile", async () => {
		Terminal.setTerminalProfile("Git Bash")
		const closeIdleTerminalsSpy = vi.spyOn(TerminalRegistry, "closeIdleTerminals").mockImplementation(() => {})

		const malformed = { type: "updateSettings", updatedSettings: { terminalProfile: 42 } } as never

		await webviewMessageHandler(mockClineProvider, malformed)

		// Malformed payload is rejected before any side effects: profile unchanged,
		// nothing persisted, no terminal churn.
		expect(mockClineProvider.log).toHaveBeenCalledWith(
			expect.stringContaining("Rejected malformed updateSettings message"),
		)
		expect(Terminal.getTerminalProfile()).toBe("Git Bash")
		expect(mockClineProvider.contextProxy.setValue).not.toHaveBeenCalled()
		expect(closeIdleTerminalsSpy).not.toHaveBeenCalled()
	})
})

describe("webviewMessageHandler - command allow/deny", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("persists allowedCommands and filters blank entries", async () => {
		await webviewMessageHandler(mockClineProvider, {
			type: "allowedCommands",
			commands: ["npm test", "  ", ""],
		})

		expect(mockClineProvider.contextProxy.setValue).toHaveBeenCalledWith("allowedCommands", ["npm test"])
	})

	it("persists deniedCommands", async () => {
		await webviewMessageHandler(mockClineProvider, {
			type: "deniedCommands",
			commands: ["rm -rf"],
		})

		expect(mockClineProvider.contextProxy.setValue).toHaveBeenCalledWith("deniedCommands", ["rm -rf"])
	})

	it("rejects a malformed allowedCommands message without side effects", async () => {
		const malformed = { type: "allowedCommands", commands: "npm test" } as never

		await webviewMessageHandler(mockClineProvider, malformed)

		expect(mockClineProvider.log).toHaveBeenCalledWith(
			expect.stringContaining("Rejected malformed allowedCommands message"),
		)
		expect(mockClineProvider.contextProxy.setValue).not.toHaveBeenCalled()
	})

	it("rejects a malformed deniedCommands message without side effects", async () => {
		const malformed = { type: "deniedCommands", commands: [42] } as never

		await webviewMessageHandler(mockClineProvider, malformed)

		expect(mockClineProvider.log).toHaveBeenCalledWith(
			expect.stringContaining("Rejected malformed deniedCommands message"),
		)
		expect(mockClineProvider.contextProxy.setValue).not.toHaveBeenCalled()
	})
})

describe("webviewMessageHandler - message queue", () => {
	const mockTaskWithQueue = () => {
		const messageQueueService = {
			addMessage: vi.fn(),
			removeMessage: vi.fn(),
			updateMessage: vi.fn(),
		}
		vi.mocked(mockClineProvider.getCurrentTask).mockReturnValue({
			messageQueueService,
		} as unknown as ReturnType<ClineProvider["getCurrentTask"]>)
		return messageQueueService
	}

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("queues a message with resolved images", async () => {
		const messageQueueService = mockTaskWithQueue()

		await webviewMessageHandler(mockClineProvider, {
			type: "queueMessage",
			text: "hello",
			images: ["data:image/png;base64,abc"],
		})

		expect(messageQueueService.addMessage).toHaveBeenCalledWith("hello", [
			"data:image/png;base64,abc",
			"data:image/png;base64,from-mention",
		])
	})

	it("removes a queued message by id", async () => {
		const messageQueueService = mockTaskWithQueue()

		await webviewMessageHandler(mockClineProvider, { type: "removeQueuedMessage", text: "id-1" })

		expect(messageQueueService.removeMessage).toHaveBeenCalledWith("id-1")
	})

	it("edits a queued message", async () => {
		const messageQueueService = mockTaskWithQueue()

		await webviewMessageHandler(mockClineProvider, {
			type: "editQueuedMessage",
			payload: { id: "id-1", text: "new text", images: [] },
		})

		expect(messageQueueService.updateMessage).toHaveBeenCalledWith("id-1", "new text", [])
	})

	it("rejects a malformed queueMessage without side effects", async () => {
		const messageQueueService = mockTaskWithQueue()
		const malformed = { type: "queueMessage", text: 42 } as never

		await webviewMessageHandler(mockClineProvider, malformed)

		expect(mockClineProvider.log).toHaveBeenCalledWith(expect.stringContaining("Rejected malformed queueMessage"))
		expect(messageQueueService.addMessage).not.toHaveBeenCalled()
	})
})

describe("webviewMessageHandler - updateTodoList", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("sets the pending todo list from a valid message", async () => {
		await webviewMessageHandler(mockClineProvider, {
			type: "updateTodoList",
			payload: { todos: [{ id: "t1", content: "Task", status: "pending" }] },
		})

		expect(mockSetPendingTodoList).toHaveBeenCalledWith([{ id: "t1", content: "Task", status: "pending" }])
	})

	it("rejects a malformed updateTodoList message without side effects", async () => {
		const malformed = { type: "updateTodoList", payload: { todos: "nope" } } as never

		await webviewMessageHandler(mockClineProvider, malformed)

		expect(mockClineProvider.log).toHaveBeenCalledWith(
			expect.stringContaining("Rejected malformed updateTodoList message"),
		)
		expect(mockSetPendingTodoList).not.toHaveBeenCalled()
	})
})

describe("webviewMessageHandler - requestTerminalProfiles", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	it("posts available profile names", async () => {
		vi.spyOn(Terminal, "getAvailableProfileNames").mockReturnValue(["Git Bash", "bash"])

		await webviewMessageHandler(mockClineProvider, { type: "requestTerminalProfiles" })

		expect(mockClineProvider.postMessageToWebview).toHaveBeenCalledWith({
			type: "terminalProfiles",
			profiles: ["Git Bash", "bash"],
		})
	})

	it("posts an empty array when profile discovery throws", async () => {
		vi.spyOn(Terminal, "getAvailableProfileNames").mockImplementation(() => {
			throw new Error("config error")
		})

		await webviewMessageHandler(mockClineProvider, { type: "requestTerminalProfiles" })

		expect(mockClineProvider.postMessageToWebview).toHaveBeenCalledWith({
			type: "terminalProfiles",
			profiles: [],
		})
	})
})

describe("webviewMessageHandler - openTerminalProfilePicker", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("executes the VS Code selectDefaultShell command", async () => {
		await webviewMessageHandler(mockClineProvider, { type: "openTerminalProfilePicker" })
		expect(vscode.commands.executeCommand).toHaveBeenCalledWith("workbench.action.terminal.selectDefaultShell")
	})
})

describe("webviewMessageHandler - terminalOperation", () => {
	const mockTaskWithTerminalOperation = () => {
		const task = {
			handleTerminalOperation: vi.fn().mockResolvedValue(undefined),
		}
		vi.mocked(mockClineProvider.getCurrentTask).mockReturnValue(
			task as unknown as ReturnType<ClineProvider["getCurrentTask"]>,
		)
		return task
	}

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("forwards a valid continue to the current task's handleTerminalOperation", async () => {
		const task = mockTaskWithTerminalOperation()

		await webviewMessageHandler(mockClineProvider, { type: "terminalOperation", terminalOperation: "continue" })

		expect(task.handleTerminalOperation).toHaveBeenCalledWith("continue")
	})

	it("forwards a valid abort to the current task's handleTerminalOperation", async () => {
		const task = mockTaskWithTerminalOperation()

		await webviewMessageHandler(mockClineProvider, { type: "terminalOperation", terminalOperation: "abort" })

		expect(task.handleTerminalOperation).toHaveBeenCalledWith("abort")
	})

	it("does not forward when terminalOperation is absent (guard semantics)", async () => {
		const task = mockTaskWithTerminalOperation()

		await webviewMessageHandler(mockClineProvider, { type: "terminalOperation" } as never)

		expect(task.handleTerminalOperation).not.toHaveBeenCalled()
	})

	it("does not forward a malformed non-enum terminalOperation", async () => {
		const task = mockTaskWithTerminalOperation()

		await webviewMessageHandler(mockClineProvider, {
			type: "terminalOperation",
			terminalOperation: "pause",
		} as never)

		expect(task.handleTerminalOperation).not.toHaveBeenCalled()
	})
})

describe("webviewMessageHandler - requestCommands", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("includes skill slug commands and dedupes duplicate skill names while preserving first skill entry", async () => {
		mockGetCommands.mockResolvedValue([])

		const getTaskMode = vi.fn().mockResolvedValue("code")
		vi.mocked(mockClineProvider.getCurrentTask).mockReturnValue({
			cwd: "/mock/workspace",
			getTaskMode,
		} as unknown as ReturnType<ClineProvider["getCurrentTask"]>)

		const getSkillsForMode = vi.fn().mockReturnValue([
			{
				name: "skill-slug-entry",
				description: "Primary skill slug",
				path: "/mock/.roo/skills/skill-slug-entry/SKILL.md",
				source: "project",
				modeSlugs: ["code"],
			},
			{
				name: "skill-slug-entry",
				description: "Duplicate skill slug",
				path: "/mock/.roo/skills/duplicate-skill/SKILL.md",
				source: "global",
				modeSlugs: ["code"],
			},
			{
				name: "another-skill-slug",
				description: "Another skill-generated command",
				path: "/mock/.roo/skills/another-skill-slug/SKILL.md",
				source: "global",
				modeSlugs: ["code"],
			},
		])

		vi.mocked(mockClineProvider.getSkillsManager).mockReturnValue({
			getSkillsForMode,
		} as unknown as ReturnType<ClineProvider["getSkillsManager"]>)

		await webviewMessageHandler(mockClineProvider, { type: "requestCommands" })

		const commandMessageCall = vi
			.mocked(mockClineProvider.postMessageToWebview)
			.mock.calls.find(([postedMessage]) => postedMessage.type === "commands")
		expect(commandMessageCall).toBeDefined()

		const commandMessage = commandMessageCall?.[0]
		expect(commandMessage?.commands).toEqual(
			expect.arrayContaining([
				{
					name: "skill-slug-entry",
					source: "project",
					filePath: "/mock/.roo/skills/skill-slug-entry/SKILL.md",
					description: "Primary skill slug",
				},
				{
					name: "another-skill-slug",
					source: "global",
					filePath: "/mock/.roo/skills/another-skill-slug/SKILL.md",
					description: "Another skill-generated command",
				},
			]),
		)

		expect(commandMessage?.commands?.filter((command) => command.name === "skill-slug-entry")).toHaveLength(1)
	})

	it("adds skill-backed command entries without overriding existing command names", async () => {
		mockGetCommands.mockResolvedValue([
			{
				name: "deploy",
				content: "existing command",
				source: "project",
				filePath: "/mock/workspace/.roo/commands/deploy.md",
				description: "Deploy command",
				argumentHint: "staging | production",
			},
		])

		const getTaskMode = vi.fn().mockResolvedValue("code")
		vi.mocked(mockClineProvider.getCurrentTask).mockReturnValue({
			cwd: "/mock/workspace",
			getTaskMode,
		} as unknown as ReturnType<ClineProvider["getCurrentTask"]>)

		const getSkillsForMode = vi.fn().mockReturnValue([
			{
				name: "deploy",
				description: "Deploy skill",
				path: "/mock/.roo/skills/deploy/SKILL.md",
				source: "global",
				modeSlugs: ["code"],
			},
			{
				name: "skill-only",
				description: "Skill-generated command",
				path: "/mock/.roo/skills/skill-only/SKILL.md",
				source: "project",
				modeSlugs: ["code"],
			},
		])

		vi.mocked(mockClineProvider.getSkillsManager).mockReturnValue({
			getSkillsForMode,
		} as unknown as ReturnType<ClineProvider["getSkillsManager"]>)

		await webviewMessageHandler(mockClineProvider, { type: "requestCommands" })

		expect(getSkillsForMode).toHaveBeenCalledWith("code")

		expect(mockClineProvider.postMessageToWebview).toHaveBeenCalledWith({
			type: "commands",
			commands: expect.arrayContaining([
				{
					name: "deploy",
					source: "project",
					filePath: "/mock/workspace/.roo/commands/deploy.md",
					description: "Deploy command",
					argumentHint: "staging | production",
				},
				{
					name: "skill-only",
					source: "project",
					filePath: "/mock/.roo/skills/skill-only/SKILL.md",
					description: "Skill-generated command",
				},
			]),
		})

		const commandMessageCall = vi
			.mocked(mockClineProvider.postMessageToWebview)
			.mock.calls.find(([postedMessage]) => postedMessage.type === "commands")
		expect(commandMessageCall).toBeDefined()

		const commandMessage = commandMessageCall?.[0]
		expect(commandMessage?.commands?.filter((command) => command.name === "deploy")).toHaveLength(1)
	})

	it("preserves existing behavior when skills manager is unavailable", async () => {
		mockGetCommands.mockResolvedValue([
			{
				name: "build",
				content: "build command",
				source: "built-in",
				filePath: "<built-in:build>",
				description: "Build command",
				argumentHint: "target",
			},
		])

		vi.mocked(mockClineProvider.getCurrentTask).mockReturnValue({
			cwd: "/mock/workspace",
		} as unknown as ReturnType<ClineProvider["getCurrentTask"]>)

		vi.mocked(mockClineProvider.getSkillsManager).mockReturnValue(undefined)

		await webviewMessageHandler(mockClineProvider, { type: "requestCommands" })

		expect(mockClineProvider.postMessageToWebview).toHaveBeenCalledWith({
			type: "commands",
			commands: [
				{
					name: "build",
					source: "built-in",
					filePath: "<built-in:build>",
					description: "Build command",
					argumentHint: "target",
				},
			],
		})
	})
})

describe("webviewMessageHandler - rules", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(mockClineProvider.getCurrentTask).mockReturnValue(undefined)
		;(mockClineProvider as any).cwd = "/mock/workspace"
	})

	it("routes rules management messages with the current workspace", async () => {
		const messages = [
			{ type: "requestRules" },
			{ type: "createRule", values: { scope: "project", kind: "generic", fileName: "new.md" } },
			{ type: "deleteRule", values: { scope: "project", kind: "generic", relativePath: "old.md" } },
			{ type: "openRuleFile", values: { scope: "global", kind: "generic", relativePath: "global.md" } },
			{ type: "openRulesDirectory", values: { scope: "project", kind: "mode", modeSlug: "code" } },
		] as const

		for (const message of messages) {
			await webviewMessageHandler(mockClineProvider, message as any)
		}

		expect(handleRequestRules).toHaveBeenCalledWith(mockClineProvider, "/mock/workspace")
		expect(handleCreateRule).toHaveBeenCalledWith(mockClineProvider, "/mock/workspace", messages[1])
		expect(handleDeleteRule).toHaveBeenCalledWith(mockClineProvider, "/mock/workspace", messages[2])
		expect(handleOpenRuleFile).toHaveBeenCalledWith(mockClineProvider, "/mock/workspace", messages[3])
		expect(handleOpenRulesDirectory).toHaveBeenCalledWith(mockClineProvider, "/mock/workspace", messages[4])
	})

	it("uses the active task cwd when routing rule messages", async () => {
		vi.mocked(mockClineProvider.getCurrentTask).mockReturnValue({
			cwd: "/mock/task-workspace",
		} as unknown as ReturnType<ClineProvider["getCurrentTask"]>)

		const message = { type: "requestRules" } as const
		await webviewMessageHandler(mockClineProvider, message as any)

		expect(handleRequestRules).toHaveBeenCalledWith(mockClineProvider, "/mock/task-workspace")
	})
})

describe("webviewMessageHandler - downloadErrorDiagnostics", () => {
	beforeEach(() => {
		vi.clearAllMocks()

		// Ensure contextProxy has a globalStorageUri for the handler
		;(mockClineProvider as any).contextProxy.globalStorageUri = { fsPath: "/mock/global/storage" }

		// Provide a current task with a stable ID
		vi.mocked(mockClineProvider.getCurrentTask).mockReturnValue({
			taskId: "test-task-id",
		} as any)
	})

	it("calls generateErrorDiagnostics with correct parameters", async () => {
		await webviewMessageHandler(mockClineProvider, {
			type: "downloadErrorDiagnostics",
			values: {
				timestamp: "2025-01-01T00:00:00.000Z",
				version: "1.2.3",
				provider: "test-provider",
				model: "test-model",
				details: "Sample error details",
			},
		} as any)

		// Verify generateErrorDiagnostics was called with the correct parameters
		expect(generateErrorDiagnostics).toHaveBeenCalledTimes(1)
		expect(generateErrorDiagnostics).toHaveBeenCalledWith({
			taskId: "test-task-id",
			globalStoragePath: "/mock/global/storage",
			values: {
				timestamp: "2025-01-01T00:00:00.000Z",
				version: "1.2.3",
				provider: "test-provider",
				model: "test-model",
				details: "Sample error details",
			},
			log: expect.any(Function),
		})
	})

	it("shows error when no active task", async () => {
		vi.mocked(mockClineProvider.getCurrentTask).mockReturnValue(null as any)

		await webviewMessageHandler(mockClineProvider, {
			type: "downloadErrorDiagnostics",
			values: {},
		} as any)

		expect(vscode.window.showErrorMessage).toHaveBeenCalledWith("No active task to generate diagnostics for")
		expect(generateErrorDiagnostics).not.toHaveBeenCalled()
	})
})

describe("webviewMessageHandler - kimiCodeSignIn", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.resetModules()
	})

	it("starts OAuth authorization and opens browser", async () => {
		const mockStartAuthorization = vi.fn().mockResolvedValue({
			userCode: "TEST-CODE",
			verificationUri: "https://auth.kimi.com/device",
			expiresAt: Date.now() + 600000,
		})
		const mockWaitForAuthorization = vi.fn().mockResolvedValue({
			type: "kimi-code",
			accessToken: "token",
			refreshToken: "refresh",
			expiresAt: Date.now() + 3600000,
		})

		vi.doMock("../../../integrations/kimi-code/oauth", () => ({
			kimiCodeOAuthManager: {
				startAuthorization: mockStartAuthorization,
				waitForAuthorization: mockWaitForAuthorization,
			},
		}))

		const mockOpenExternal = vi.fn().mockResolvedValue(true)
		;(vscode as any).env = { openExternal: mockOpenExternal }
		;(vscode as any).Uri = { parse: vi.fn((url: string) => url) }

		await webviewMessageHandler(mockClineProvider, { type: "kimiCodeSignIn" })

		expect(mockStartAuthorization).toHaveBeenCalled()
		expect(mockOpenExternal).toHaveBeenCalled()
		expect(mockClineProvider.postStateToWebview).toHaveBeenCalled()
	})

	it("shows success message after successful authorization", async () => {
		const mockStartAuthorization = vi.fn().mockResolvedValue({
			userCode: "TEST-CODE",
			verificationUri: "https://auth.kimi.com/device",
			expiresAt: Date.now() + 600000,
		})
		const mockWaitForAuthorization = vi.fn().mockResolvedValue({
			type: "kimi-code",
			accessToken: "token",
			refreshToken: "refresh",
			expiresAt: Date.now() + 3600000,
		})

		vi.doMock("../../../integrations/kimi-code/oauth", () => ({
			kimiCodeOAuthManager: {
				startAuthorization: mockStartAuthorization,
				waitForAuthorization: mockWaitForAuthorization,
			},
		}))

		const mockOpenExternal = vi.fn().mockResolvedValue(true)
		;(vscode as any).env = { openExternal: mockOpenExternal }
		;(vscode as any).Uri = { parse: vi.fn((url: string) => url) }

		await webviewMessageHandler(mockClineProvider, { type: "kimiCodeSignIn" })
		await new Promise((resolve) => setTimeout(resolve, 10))

		expect(vscode.window.showInformationMessage).toHaveBeenCalledWith("Successfully signed in to Kimi Code")
	})

	it("handles authorization failure", async () => {
		const mockStartAuthorization = vi.fn().mockResolvedValue({
			userCode: "TEST-CODE",
			verificationUri: "https://auth.kimi.com/device",
			expiresAt: Date.now() + 600000,
		})
		const mockWaitForAuthorization = vi.fn().mockRejectedValue(new Error("Authorization cancelled"))

		vi.doMock("../../../integrations/kimi-code/oauth", () => ({
			kimiCodeOAuthManager: {
				startAuthorization: mockStartAuthorization,
				waitForAuthorization: mockWaitForAuthorization,
			},
		}))

		const mockOpenExternal = vi.fn().mockResolvedValue(true)
		;(vscode as any).env = { openExternal: mockOpenExternal }
		;(vscode as any).Uri = { parse: vi.fn((url: string) => url) }

		await webviewMessageHandler(mockClineProvider, { type: "kimiCodeSignIn" })
		await new Promise((resolve) => setTimeout(resolve, 10))

		expect(mockClineProvider.postStateToWebview).toHaveBeenCalled()
	})

	it("handles startAuthorization error", async () => {
		const mockStartAuthorization = vi.fn().mockRejectedValue(new Error("Network error"))

		vi.doMock("../../../integrations/kimi-code/oauth", () => ({
			kimiCodeOAuthManager: {
				startAuthorization: mockStartAuthorization,
			},
		}))

		await webviewMessageHandler(mockClineProvider, { type: "kimiCodeSignIn" })

		expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(expect.stringContaining("Kimi Code sign in failed"))
		expect(mockClineProvider.postStateToWebview).toHaveBeenCalled()
	})
})

describe("webviewMessageHandler - kimiCodeSignOut", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.resetModules()
	})

	it("clears credentials and shows success message", async () => {
		const mockClearCredentials = vi.fn().mockResolvedValue(undefined)

		vi.doMock("../../../integrations/kimi-code/oauth", () => ({
			kimiCodeOAuthManager: {
				clearCredentials: mockClearCredentials,
			},
		}))

		await webviewMessageHandler(mockClineProvider, { type: "kimiCodeSignOut" })

		expect(mockClearCredentials).toHaveBeenCalled()
		expect(vscode.window.showInformationMessage).toHaveBeenCalledWith("Signed out from Kimi Code")
		expect(mockClineProvider.postStateToWebview).toHaveBeenCalled()
	})

	it("handles sign out error", async () => {
		const mockClearCredentials = vi.fn().mockRejectedValue(new Error("Clear failed"))

		vi.doMock("../../../integrations/kimi-code/oauth", () => ({
			kimiCodeOAuthManager: {
				clearCredentials: mockClearCredentials,
			},
		}))

		await webviewMessageHandler(mockClineProvider, { type: "kimiCodeSignOut" })

		expect(vscode.window.showErrorMessage).toHaveBeenCalledWith("Kimi Code sign out failed.")
	})
})

describe("webviewMessageHandler - unhandled message observability", () => {
	const unhandledMessage = { type: "someUnregisteredMessageType" } as never

	beforeEach(() => {
		vi.clearAllMocks()
		// Default: roo-plus.debug is OFF.
		vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
			get: vi.fn(),
			update: vi.fn(),
		} as unknown as vscode.WorkspaceConfiguration)
	})

	it("drops an unhandled type silently when debug is disabled", async () => {
		await webviewMessageHandler(mockClineProvider, unhandledMessage)

		expect(mockClineProvider.log).not.toHaveBeenCalled()
	})

	it("logs the unhandled type when debug is enabled", async () => {
		vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
			get: vi.fn((key: string, defaultValue?: boolean) => (key === "debug" ? true : defaultValue)),
			update: vi.fn(),
		} as unknown as vscode.WorkspaceConfiguration)

		await webviewMessageHandler(mockClineProvider, unhandledMessage)

		expect(mockClineProvider.log).toHaveBeenCalledTimes(1)
		expect(mockClineProvider.log).toHaveBeenCalledWith(expect.stringContaining("someUnregisteredMessageType"))
	})
})

describe("webviewMessageHandler - worktree", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("listWorktrees posts worktreeList", async () => {
		mockHandleListWorktrees.mockResolvedValue({
			worktrees: [],
			isGitRepo: true,
			isMultiRoot: false,
			isSubfolder: false,
			gitRootPath: "/mock/repo",
		})

		await webviewMessageHandler(mockClineProvider, { type: "listWorktrees" })

		expect(mockHandleListWorktrees).toHaveBeenCalledTimes(1)
		expect(mockClineProvider.postMessageToWebview).toHaveBeenCalledWith(
			expect.objectContaining({ type: "worktreeList", isGitRepo: true, gitRootPath: "/mock/repo" }),
		)
	})

	it("deleteWorktree with worktreePath posts worktreeResult", async () => {
		mockHandleDeleteWorktree.mockResolvedValue({ success: true, message: "Deleted worktree" })

		await webviewMessageHandler(mockClineProvider, {
			type: "deleteWorktree",
			worktreePath: "/mock/wt",
			worktreeForce: true,
		})

		expect(mockHandleDeleteWorktree).toHaveBeenCalledWith(mockClineProvider, "/mock/wt", true)
		expect(mockClineProvider.postMessageToWebview).toHaveBeenCalledWith(
			expect.objectContaining({ type: "worktreeResult", success: true, text: "Deleted worktree" }),
		)
	})

	it("rejects a malformed createWorktree (missing path) before side effects", async () => {
		await webviewMessageHandler(mockClineProvider, {
			type: "createWorktree",
			worktreeBranch: "feature/x",
		})

		expect(mockHandleCreateWorktree).not.toHaveBeenCalled()
		expect(mockClineProvider.log).toHaveBeenCalledWith(expect.stringContaining("createWorktree"))
		expect(mockClineProvider.postMessageToWebview).not.toHaveBeenCalledWith(
			expect.objectContaining({ type: "worktreeResult" }),
		)
	})

	it("createWorktree with worktreePath posts worktreeResult", async () => {
		mockHandleCreateWorktree.mockResolvedValue({ success: true, message: "Created worktree" })

		await webviewMessageHandler(mockClineProvider, {
			type: "createWorktree",
			worktreePath: "/mock/wt",
			worktreeBranch: "feature/x",
			worktreeBaseBranch: "main",
			worktreeCreateNewBranch: true,
		})

		expect(mockHandleCreateWorktree).toHaveBeenCalledWith(
			mockClineProvider,
			expect.objectContaining({
				path: "/mock/wt",
				branch: "feature/x",
				baseBranch: "main",
				createNewBranch: true,
			}),
			expect.any(Function),
		)
		expect(mockClineProvider.postMessageToWebview).toHaveBeenCalledWith(
			expect.objectContaining({ type: "worktreeResult", success: true, text: "Created worktree" }),
		)
	})

	it("createWorktree progress callback posts worktreeCopyProgress", async () => {
		mockHandleCreateWorktree.mockImplementation((_provider, _options, onProgress) => {
			onProgress?.({ bytesCopied: 512, itemName: "big-file.ts" })
			return Promise.resolve({ success: true, message: "Created worktree" })
		})

		await webviewMessageHandler(mockClineProvider, {
			type: "createWorktree",
			worktreePath: "/mock/wt",
			worktreeBranch: "feature/x",
			worktreeBaseBranch: "main",
			worktreeCreateNewBranch: true,
		})

		expect(mockClineProvider.postMessageToWebview).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "worktreeCopyProgress",
				copyProgressBytesCopied: 512,
				copyProgressItemName: "big-file.ts",
			}),
		)
	})

	it("getAvailableBranches posts branchList", async () => {
		mockHandleGetAvailableBranches.mockResolvedValue({
			localBranches: ["main", "feature/x"],
			remoteBranches: ["origin/main"],
			currentBranch: "main",
		})

		await webviewMessageHandler(mockClineProvider, { type: "getAvailableBranches" })

		expect(mockHandleGetAvailableBranches).toHaveBeenCalledTimes(1)
		expect(mockClineProvider.postMessageToWebview).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "branchList",
				localBranches: ["main", "feature/x"],
				remoteBranches: ["origin/main"],
				currentBranch: "main",
			}),
		)
	})

	it("getWorktreeDefaults posts worktreeDefaults", async () => {
		mockHandleGetWorktreeDefaults.mockResolvedValue({
			suggestedBranch: "worktree/feature",
			suggestedPath: "/mock/wt",
		})

		await webviewMessageHandler(mockClineProvider, { type: "getWorktreeDefaults" })

		expect(mockHandleGetWorktreeDefaults).toHaveBeenCalledTimes(1)
		expect(mockClineProvider.postMessageToWebview).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "worktreeDefaults",
				suggestedBranch: "worktree/feature",
				suggestedPath: "/mock/wt",
			}),
		)
	})

	it("getWorktreeIncludeStatus posts worktreeIncludeStatus", async () => {
		mockHandleGetWorktreeIncludeStatus.mockResolvedValue({
			exists: false,
			hasGitignore: true,
			gitignoreContent: "node_modules\n",
		})

		await webviewMessageHandler(mockClineProvider, { type: "getWorktreeIncludeStatus" })

		expect(mockHandleGetWorktreeIncludeStatus).toHaveBeenCalledTimes(1)
		expect(mockClineProvider.postMessageToWebview).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "worktreeIncludeStatus",
				worktreeIncludeStatus: { exists: false, hasGitignore: true, gitignoreContent: "node_modules\n" },
			}),
		)
	})

	it("checkBranchWorktreeInclude posts branchWorktreeIncludeResult with the branch", async () => {
		mockHandleCheckBranchWorktreeInclude.mockResolvedValue(true)

		await webviewMessageHandler(mockClineProvider, {
			type: "checkBranchWorktreeInclude",
			worktreeBranch: "feature/x",
		})

		expect(mockHandleCheckBranchWorktreeInclude).toHaveBeenCalledWith(mockClineProvider, "feature/x")
		expect(mockClineProvider.postMessageToWebview).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "branchWorktreeIncludeResult",
				branch: "feature/x",
				hasWorktreeInclude: true,
			}),
		)
	})

	it("browseForWorktreePath posts folderSelected with the picked path", async () => {
		// Earlier describes in this file call `vi.restoreAllMocks()`, which
		// restores the vscode mock's `Uri.joinPath` (used by the handler to
		// build the picker's defaultUri) to `undefined`. Re-install it so the
		// handler reaches `showOpenDialog` regardless of test order.
		;(vscode.Uri as { joinPath: (uri: unknown, ...paths: string[]) => unknown }).joinPath = () => ({
			fsPath: "/mock/workspace/..",
		})
		vi.mocked(vscode.window.showOpenDialog).mockResolvedValue([{ fsPath: "/picked/worktree" }] as never)

		await webviewMessageHandler(mockClineProvider, { type: "browseForWorktreePath" })

		expect(vscode.window.showOpenDialog).toHaveBeenCalledTimes(1)
		expect(mockClineProvider.postMessageToWebview).toHaveBeenCalledWith(
			expect.objectContaining({ type: "folderSelected", path: "/picked/worktree" }),
		)
	})
})

describe("webviewMessageHandler - images", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("selectImages posts selectedImages echoing context/messageTs", async () => {
		vi.mocked(selectImages).mockResolvedValue(["data:image/png;base64,abc"])

		await webviewMessageHandler(mockClineProvider, {
			type: "selectImages",
			context: "edit",
			messageTs: 42,
		})

		expect(selectImages).toHaveBeenCalledOnce()
		expect(mockClineProvider.postMessageToWebview).toHaveBeenCalledWith({
			type: "selectedImages",
			images: ["data:image/png;base64,abc"],
			context: "edit",
			messageTs: 42,
		})
	})

	it("selectImages without context/messageTs posts selectedImages with undefined echo fields", async () => {
		await webviewMessageHandler(mockClineProvider, { type: "selectImages" })

		expect(mockClineProvider.postMessageToWebview).toHaveBeenCalledWith({
			type: "selectedImages",
			images: ["data:image/png;base64,abc"],
			context: undefined,
			messageTs: undefined,
		})
	})

	it("saveImage with a dataUri triggers the save path", async () => {
		await webviewMessageHandler(mockClineProvider, {
			type: "saveImage",
			dataUri: "data:image/png;base64,abc",
		})

		expect(resolveDefaultSaveUri).toHaveBeenCalledWith(
			mockClineProvider.contextProxy,
			"lastImageSavePath",
			expect.stringMatching(/^img_\d+\.png$/),
			{ useWorkspace: false, fallbackDir: expect.stringContaining("Downloads") },
		)
		expect(saveImage).toHaveBeenCalledWith("data:image/png;base64,abc", { fsPath: "/mock/downloads/img.png" })
		expect(saveLastExportPath).not.toHaveBeenCalled()
	})

	it("saveImage without a dataUri does not trigger the save path (guard semantics)", async () => {
		await webviewMessageHandler(mockClineProvider, { type: "saveImage" })

		expect(saveImage).not.toHaveBeenCalled()
		expect(resolveDefaultSaveUri).not.toHaveBeenCalled()
	})

	it("openImage opens the image with text and passes values through", async () => {
		await webviewMessageHandler(mockClineProvider, {
			type: "openImage",
			text: "/test/image.png",
			values: { action: "copy" },
		})

		expect(openImage).toHaveBeenCalledWith("/test/image.png", { values: { action: "copy" } })
	})

	it("rejects a malformed openImage (missing text) without opening", async () => {
		await webviewMessageHandler(mockClineProvider, { type: "openImage" })

		expect(openImage).not.toHaveBeenCalled()
	})

	it("rejects a malformed openImage (non-string text) without opening", async () => {
		await webviewMessageHandler(mockClineProvider, { type: "openImage", text: 42 } as never)

		expect(openImage).not.toHaveBeenCalled()
	})
})

describe("webviewMessageHandler - settings domain", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		// Default configuration mock (each test may override for update assertions).
		vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
			get: vi.fn(),
			update: vi.fn(),
		} as unknown as vscode.WorkspaceConfiguration)
	})

	it("getVSCodeSetting posts a vsCodeSetting response", async () => {
		await webviewMessageHandler(mockClineProvider, {
			type: "getVSCodeSetting",
			setting: "terminal.integrated.inheritEnv",
		})

		expect(mockClineProvider.postMessageToWebview).toHaveBeenCalledWith({
			type: "vsCodeSetting",
			setting: "terminal.integrated.inheritEnv",
			value: undefined,
		})
	})

	it("rejects a malformed requestRouterModels (non-object values) without side effects", async () => {
		await webviewMessageHandler(mockClineProvider, {
			type: "requestRouterModels",
			values: "not-an-object",
		} as never)

		expect(mockClineProvider.log).toHaveBeenCalledWith(
			expect.stringContaining("Rejected malformed requestRouterModels"),
		)
		expect(mockClineProvider.postMessageToWebview).not.toHaveBeenCalledWith(
			expect.objectContaining({ type: "routerModels" }),
		)
	})

	it("hasOpenedModeSelector updates global state and posts state", async () => {
		await webviewMessageHandler(mockClineProvider, { type: "hasOpenedModeSelector", bool: true })

		expect(mockClineProvider.contextProxy.setValue).toHaveBeenCalledWith("hasOpenedModeSelector", true)
		expect(mockClineProvider.postStateToWebview).toHaveBeenCalled()
	})

	it("updateVSCodeSetting updates the configuration for an allowed setting", async () => {
		const configUpdate = vi.fn()
		vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
			get: vi.fn(),
			update: configUpdate,
		} as unknown as vscode.WorkspaceConfiguration)

		// The `WebviewMessage` interface types `value?: number`, but the live
		// sender passes a boolean — the schema accepts both, so the handler
		// must too (tested via `as never` to bypass the interface's narrow type).
		await webviewMessageHandler(mockClineProvider, {
			type: "updateVSCodeSetting",
			setting: "terminal.integrated.inheritEnv",
			value: true,
		} as never)

		expect(configUpdate).toHaveBeenCalledWith("terminal.integrated.inheritEnv", true, true)
	})

	it("updateVSCodeSetting rejects a restricted setting without updating", async () => {
		const configUpdate = vi.fn()
		vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
			get: vi.fn(),
			update: configUpdate,
		} as unknown as vscode.WorkspaceConfiguration)

		await webviewMessageHandler(mockClineProvider, {
			type: "updateVSCodeSetting",
			setting: "roo-plus.someRestrictedSetting",
			value: 1,
		})

		expect(configUpdate).not.toHaveBeenCalled()
		expect(vscode.window.showErrorMessage).toHaveBeenCalled()
	})
})

describe("webviewMessageHandler - chat domain (S1 sub-task 11)", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("ttsEnabled updates global state, enables TTS and posts state", async () => {
		await webviewMessageHandler(mockClineProvider, { type: "ttsEnabled", bool: true })

		expect(mockClineProvider.contextProxy.setValue).toHaveBeenCalledWith("ttsEnabled", true)
		expect(setTtsEnabled).toHaveBeenCalledWith(true)
		expect(mockClineProvider.postStateToWebview).toHaveBeenCalled()
	})

	it("ttsEnabled defaults to true when bool is absent", async () => {
		await webviewMessageHandler(mockClineProvider, { type: "ttsEnabled" })

		expect(mockClineProvider.contextProxy.setValue).toHaveBeenCalledWith("ttsEnabled", true)
		expect(setTtsEnabled).toHaveBeenCalledWith(true)
	})

	it("ttsEnabled rejects a malformed non-boolean bool", async () => {
		await webviewMessageHandler(mockClineProvider, { type: "ttsEnabled", bool: "yes" } as never)

		expect(mockClineProvider.log).toHaveBeenCalledWith(expect.stringContaining("Rejected malformed ttsEnabled"))
		expect(mockClineProvider.contextProxy.setValue).not.toHaveBeenCalledWith("ttsEnabled", "yes")
		expect(setTtsEnabled).not.toHaveBeenCalled()
	})

	it("ttsSpeed updates global state, sets the speed and posts state", async () => {
		await webviewMessageHandler(mockClineProvider, { type: "ttsSpeed", value: 0.75 })

		expect(mockClineProvider.contextProxy.setValue).toHaveBeenCalledWith("ttsSpeed", 0.75)
		expect(setTtsSpeed).toHaveBeenCalledWith(0.75)
		expect(mockClineProvider.postStateToWebview).toHaveBeenCalled()
	})

	it("playTts with text triggers TTS", async () => {
		await webviewMessageHandler(mockClineProvider, { type: "playTts", text: "Hello world" })

		expect(playTts).toHaveBeenCalledWith("Hello world", expect.any(Object))
	})

	it("playTts rejects a malformed non-string text", async () => {
		await webviewMessageHandler(mockClineProvider, { type: "playTts", text: 42 } as never)

		expect(mockClineProvider.log).toHaveBeenCalledWith(expect.stringContaining("Rejected malformed playTts"))
		expect(playTts).not.toHaveBeenCalled()
	})

	it("deleteMessage rejects a malformed non-number value", async () => {
		vi.mocked(mockClineProvider.getCurrentTask).mockReturnValue({
			clineMessages: [],
			apiConversationHistory: [],
		} as never)

		await webviewMessageHandler(mockClineProvider, { type: "deleteMessage", value: "nope" } as never)

		expect(mockClineProvider.log).toHaveBeenCalledWith(expect.stringContaining("Rejected malformed deleteMessage"))
		expect(mockClineProvider.postMessageToWebview).not.toHaveBeenCalledWith(
			expect.objectContaining({ type: "showDeleteMessageDialog" }),
		)
	})

	it("enhancePrompt with text triggers the enhancer", async () => {
		vi.mocked(mockClineProvider.getState).mockResolvedValue({} as never)
		vi.mocked(mockClineProvider.getCurrentTask).mockReturnValue(undefined)

		const enhanceSpy = vi
			.spyOn(MessageEnhancer, "enhanceMessage")
			.mockResolvedValue({ success: true, enhancedText: "Enhanced!" })
		const telemetrySpy = vi.spyOn(MessageEnhancer, "captureTelemetry").mockImplementation(() => {})

		try {
			await webviewMessageHandler(mockClineProvider, { type: "enhancePrompt", text: "Write a test" })

			expect(enhanceSpy).toHaveBeenCalledWith(expect.objectContaining({ text: "Write a test" }))
			expect(mockClineProvider.postMessageToWebview).toHaveBeenCalledWith({
				type: "enhancedPrompt",
				text: "Enhanced!",
			})
		} finally {
			enhanceSpy.mockRestore()
			telemetrySpy.mockRestore()
		}
	})
})
