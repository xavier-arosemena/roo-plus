import { describe, it, expect } from "vitest"

import {
	aggregatedCostsSchema,
	commitSearchResultsMessageSchema,
	commandsMessageSchema,
	customToolsResultMessageSchema,
	dismissedUpsellsMessageSchema,
	extensionMessageSchemas,
	fileSearchResultsMessageSchema,
	insertTextIntoTextareaMessageSchema,
	interactionRequiredMessageSchema,
	listApiConfigMessageSchema,
	mcpServersMessageSchema,
	modesMessageSchema,
	openAiCodexRateLimitsMessageSchema,
	organizationSwitchResultMessageSchema,
	parseExtensionMessage,
	showDeleteMessageDialogMessageSchema,
	showEditMessageDialogMessageSchema,
	taskResponsesMessageSchema,
	taskWithAggregatedCostsMessageSchema,
} from "../index.js"

const validCommit = { hash: "abc123", shortHash: "abc123", subject: "fix typo", author: "Roo", date: "2026-01-01" }
const validCommand = { name: "test", source: "project" as const, description: "Run tests" }
const validServer = { name: "filesystem", config: "{}", status: "connected" as const }
const validProviderEntry = { id: "prof-1", name: "Default" }
const validHistoryItem = {
	id: "task-1",
	number: 1,
	ts: 1700000000000,
	task: "Initial task",
	tokensIn: 10,
	tokensOut: 20,
	totalCost: 0.5,
}

describe("task/chat/history domain (Phase 2, Domain 3) schemas", () => {
	describe("valid messages", () => {
		it.each([
			[
				"commitSearchResults",
				commitSearchResultsMessageSchema,
				{ type: "commitSearchResults", commits: [validCommit] },
			],
			[
				"fileSearchResults",
				fileSearchResultsMessageSchema,
				{
					type: "fileSearchResults",
					results: [{ path: "src/index.ts", type: "file", label: "index.ts" }],
					requestId: "req-1",
				},
			],
			[
				"fileSearchResults (folder + error)",
				fileSearchResultsMessageSchema,
				{
					type: "fileSearchResults",
					results: [{ path: "src", type: "folder" }],
					error: "No workspace path available",
				},
			],
			[
				"listApiConfig",
				listApiConfigMessageSchema,
				{ type: "listApiConfig", listApiConfig: [validProviderEntry] },
			],
			["mcpServers", mcpServersMessageSchema, { type: "mcpServers", mcpServers: [validServer] }],
			[
				"showDeleteMessageDialog",
				showDeleteMessageDialogMessageSchema,
				{ type: "showDeleteMessageDialog", messageTs: 123, hasCheckpoint: false },
			],
			[
				"showEditMessageDialog (full payload)",
				showEditMessageDialogMessageSchema,
				{
					type: "showEditMessageDialog",
					messageTs: 123,
					text: "edited",
					hasCheckpoint: true,
					images: ["data:image/png;base64,x"],
				},
			],
			[
				"showEditMessageDialog (minimal payload)",
				showEditMessageDialogMessageSchema,
				{ type: "showEditMessageDialog", messageTs: 123 },
			],
			["commands", commandsMessageSchema, { type: "commands", commands: [validCommand] }],
			[
				"insertTextIntoTextarea",
				insertTextIntoTextareaMessageSchema,
				{ type: "insertTextIntoTextarea", text: "/test" },
			],
			["dismissedUpsells", dismissedUpsellsMessageSchema, { type: "dismissedUpsells", list: ["upsell-a"] }],
			[
				"customToolsResult",
				customToolsResultMessageSchema,
				{ type: "customToolsResult", tools: [{ name: "my-tool", description: "Does a thing" }] },
			],
			[
				"customToolsResult (error)",
				customToolsResultMessageSchema,
				{ type: "customToolsResult", tools: [], error: "Failed to load" },
			],
			["modes", modesMessageSchema, { type: "modes", modes: [{ slug: "code", name: "Code" }] }],
			[
				"taskWithAggregatedCosts (success)",
				taskWithAggregatedCostsMessageSchema,
				{
					type: "taskWithAggregatedCosts",
					text: "task-1",
					historyItem: validHistoryItem,
					aggregatedCosts: { totalCost: 1.5, ownCost: 1, childrenCost: 0.5 },
				},
			],
			[
				"taskWithAggregatedCosts (error)",
				taskWithAggregatedCostsMessageSchema,
				{ type: "taskWithAggregatedCosts", text: "task-1", error: "boom" },
			],
			[
				"openAiCodexRateLimits (values)",
				openAiCodexRateLimitsMessageSchema,
				{
					type: "openAiCodexRateLimits",
					values: {
						primary: { usedPercent: 12.3, windowMinutes: 300, resetsAt: Date.now() + 60_000 },
						secondary: { usedPercent: 45.6 },
						credits: { hasCredits: true, unlimited: true, balance: "0.50" },
						planType: "pro",
						fetchedAt: Date.now(),
					},
				},
			],
			[
				"openAiCodexRateLimits (error)",
				openAiCodexRateLimitsMessageSchema,
				{ type: "openAiCodexRateLimits", error: "Not authenticated with OpenAI Codex" },
			],
			["interactionRequired", interactionRequiredMessageSchema, { type: "interactionRequired" }],
			[
				"organizationSwitchResult (full)",
				organizationSwitchResultMessageSchema,
				{
					type: "organizationSwitchResult",
					organizationId: "org-1",
					organizationAllowList: { allowAll: true, providers: {} },
					success: true,
				},
			],
			[
				"organizationSwitchResult (minimal)",
				organizationSwitchResultMessageSchema,
				{ type: "organizationSwitchResult", success: false, error: "Not allowed" },
			],
		])("accepts %s", (_name, schema, payload) => {
			const result = schema.safeParse(payload)
			expect(result.success).toBe(true)
		})
	})

	describe("malformed messages", () => {
		it.each([
			[
				"commitSearchResults (missing commits)",
				commitSearchResultsMessageSchema,
				{ type: "commitSearchResults" },
			],
			[
				"commitSearchResults (commit missing fields)",
				commitSearchResultsMessageSchema,
				{ type: "commitSearchResults", commits: [{ hash: "x" }] },
			],
			["fileSearchResults (missing results)", fileSearchResultsMessageSchema, { type: "fileSearchResults" }],
			[
				"fileSearchResults (bad result type)",
				fileSearchResultsMessageSchema,
				{ type: "fileSearchResults", results: [{ path: "x", type: "filee" }] },
			],
			["listApiConfig (missing listApiConfig)", listApiConfigMessageSchema, { type: "listApiConfig" }],
			["mcpServers (missing mcpServers)", mcpServersMessageSchema, { type: "mcpServers" }],
			[
				"showDeleteMessageDialog (missing messageTs)",
				showDeleteMessageDialogMessageSchema,
				{ type: "showDeleteMessageDialog" },
			],
			[
				"showEditMessageDialog (missing messageTs)",
				showEditMessageDialogMessageSchema,
				{ type: "showEditMessageDialog", text: "x" },
			],
			["commands (missing commands)", commandsMessageSchema, { type: "commands" }],
			[
				"commands (bad source)",
				commandsMessageSchema,
				{ type: "commands", commands: [{ name: "x", source: "nope" }] },
			],
			[
				"insertTextIntoTextarea (non-string text)",
				insertTextIntoTextareaMessageSchema,
				{ type: "insertTextIntoTextarea", text: 42 },
			],
			["dismissedUpsells (missing list)", dismissedUpsellsMessageSchema, { type: "dismissedUpsells" }],
			["customToolsResult (missing tools)", customToolsResultMessageSchema, { type: "customToolsResult" }],
			["modes (missing modes)", modesMessageSchema, { type: "modes" }],
			[
				"taskWithAggregatedCosts (missing text)",
				taskWithAggregatedCostsMessageSchema,
				{ type: "taskWithAggregatedCosts" },
			],
			[
				"taskWithAggregatedCosts (bad aggregatedCosts)",
				taskWithAggregatedCostsMessageSchema,
				{ type: "taskWithAggregatedCosts", text: "t", aggregatedCosts: { totalCost: "x" } },
			],
			[
				"openAiCodexRateLimits (values missing fetchedAt)",
				openAiCodexRateLimitsMessageSchema,
				{ type: "openAiCodexRateLimits", values: { primary: { usedPercent: 1 } } },
			],
		])("rejects %s", (_name, schema, payload) => {
			const result = schema.safeParse(payload)
			expect(result.success).toBe(false)
		})
	})

	describe("parseExtensionMessage boundary", () => {
		it("strictly validates a registered task/chat/history message", () => {
			const result = parseExtensionMessage({
				type: "mcpServers",
				mcpServers: [{ name: "filesystem", config: "{}", status: "connected" }],
			})
			expect(result.ok).toBe(true)
			if (result.ok) {
				expect(result.message.type).toBe("mcpServers")
			}
		})

		it("rejects a malformed registered message", () => {
			const result = parseExtensionMessage({ type: "showDeleteMessageDialog" })
			expect(result.ok).toBe(false)
			if (!result.ok) {
				expect(result.error).toContain("showDeleteMessageDialog")
			}
		})
	})

	describe("registry seeding", () => {
		const domainTypes = [
			"commitSearchResults",
			"fileSearchResults",
			"listApiConfig",
			"mcpServers",
			"showDeleteMessageDialog",
			"showEditMessageDialog",
			"commands",
			"insertTextIntoTextarea",
			"dismissedUpsells",
			"customToolsResult",
			"modes",
			"taskWithAggregatedCosts",
			"openAiCodexRateLimits",
			"interactionRequired",
			"organizationSwitchResult",
		] as const

		it("seeds every task/chat/history type into the registry", () => {
			for (const type of domainTypes) {
				expect(extensionMessageSchemas[type]).toBeDefined()
			}
		})

		it("builds a discriminated union over the domain's registered types", () => {
			const parsed = taskResponsesMessageSchema.safeParse({
				type: "openAiCodexRateLimits",
				error: "Not authenticated",
			})
			expect(parsed.success).toBe(true)
			if (parsed.success) {
				expect(parsed.data.type).toBe("openAiCodexRateLimits")
			}
		})
	})

	describe("shared helper schemas", () => {
		it("aggregatedCostsSchema requires all three numeric costs", () => {
			expect(aggregatedCostsSchema.safeParse({ totalCost: 1, ownCost: 0.5, childrenCost: 0.5 }).success).toBe(
				true,
			)
			expect(aggregatedCostsSchema.safeParse({ totalCost: 1, ownCost: 0.5 }).success).toBe(false)
		})
	})
})
