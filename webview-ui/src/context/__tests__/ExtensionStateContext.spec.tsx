import { render, screen, act } from "@/utils/test-utils"
import React from "react"

import {
	type ProviderSettings,
	type ExperimentId,
	type ExtensionState,
	type ClineMessage,
	type HistoryItem,
	type MarketplaceItem,
	type MarketplaceInstalledMetadata,
	type RouterModels,
	DEFAULT_CHECKPOINT_TIMEOUT_SECONDS,
	DEFAULT_DIFF_FUZZY_THRESHOLD,
} from "@roo-code/types"

import { ExtensionStateContextProvider, useExtensionState, mergeExtensionState } from "../ExtensionStateContext"

const TestComponent = () => {
	const { allowedCommands, setAllowedCommands, soundEnabled, showRooIgnoredFiles, setShowRooIgnoredFiles } =
		useExtensionState()

	return (
		<div>
			<div data-testid="allowed-commands">{JSON.stringify(allowedCommands)}</div>
			<div data-testid="sound-enabled">{JSON.stringify(soundEnabled)}</div>
			<div data-testid="show-rooignored-files">{JSON.stringify(showRooIgnoredFiles)}</div>
			<button data-testid="update-button" onClick={() => setAllowedCommands(["npm install", "git status"])}>
				Update Commands
			</button>
			<button data-testid="toggle-rooignore-button" onClick={() => setShowRooIgnoredFiles(!showRooIgnoredFiles)}>
				Update Commands
			</button>
		</div>
	)
}

const RulesTestComponent = () => {
	const { rules } = useExtensionState()

	return <div data-testid="rules">{JSON.stringify(rules)}</div>
}

const ChatFontSizeTestComponent = () => {
	const { chatFontSize, setChatFontSize } = useExtensionState()

	return (
		<div>
			<div data-testid="chat-font-size">{JSON.stringify(chatFontSize ?? null)}</div>
			<button data-testid="set-font-size-button" onClick={() => setChatFontSize(20)}>
				Set Font Size
			</button>
			<button data-testid="reset-font-size-button" onClick={() => setChatFontSize(undefined)}>
				Reset Font Size
			</button>
		</div>
	)
}

const ApiConfigTestComponent = () => {
	const { apiConfiguration, setApiConfiguration } = useExtensionState()

	return (
		<div>
			<div data-testid="api-configuration">{JSON.stringify(apiConfiguration)}</div>
			<button
				data-testid="update-api-config-button"
				onClick={() => setApiConfiguration({ apiModelId: "new-model", apiProvider: "anthropic" })}>
				Update API Config
			</button>
			<button data-testid="partial-update-button" onClick={() => setApiConfiguration({ modelTemperature: 0.7 })}>
				Partial Update
			</button>
		</div>
	)
}

const InitialStateTestComponent = () => {
	const {
		alwaysAllowFollowupQuestions,
		followupAutoApproveTimeoutMs,
		includeTaskHistoryInEnhance,
		includeCurrentTime,
		includeCurrentCost,
		routerModels,
		marketplaceItems,
		marketplaceInstalledMetadata,
	} = useExtensionState()

	return (
		<div data-testid="initial-state">
			{JSON.stringify({
				alwaysAllowFollowupQuestions,
				followupAutoApproveTimeoutMs,
				includeTaskHistoryInEnhance,
				includeCurrentTime,
				includeCurrentCost,
				routerModels,
				marketplaceItems,
				marketplaceInstalledMetadata,
			})}
		</div>
	)
}

const NavigationTestComponent = () => {
	const { autoApprovalEnabled, filePaths } = useExtensionState()

	return (
		<div>
			<div data-testid="auto-approval-enabled">{JSON.stringify(autoApprovalEnabled ?? false)}</div>
			<div data-testid="file-paths">{JSON.stringify(filePaths)}</div>
		</div>
	)
}

describe("ExtensionStateContext", () => {
	it("initializes with empty allowedCommands array", () => {
		render(
			<ExtensionStateContextProvider>
				<TestComponent />
			</ExtensionStateContextProvider>,
		)

		expect(JSON.parse(screen.getByTestId("allowed-commands").textContent!)).toEqual([])
	})

	it("initializes with empty rules array", () => {
		render(
			<ExtensionStateContextProvider>
				<RulesTestComponent />
			</ExtensionStateContextProvider>,
		)

		expect(JSON.parse(screen.getByTestId("rules").textContent!)).toEqual([])
	})

	it("updates rules from incoming rules message", () => {
		render(
			<ExtensionStateContextProvider>
				<RulesTestComponent />
			</ExtensionStateContextProvider>,
		)

		act(() => {
			window.dispatchEvent(
				new MessageEvent("message", {
					data: {
						type: "rules",
						rules: [
							{
								id: "global:generic:generic:rule.md",
								name: "rule.md",
								scope: "global",
								kind: "generic",
								filePath: "/home/.roo/rules/rule.md",
								relativePath: "rule.md",
								directoryPath: "/home/.roo/rules",
							},
						],
					},
				}),
			)
		})

		expect(JSON.parse(screen.getByTestId("rules").textContent!)).toEqual([
			expect.objectContaining({ id: "global:generic:generic:rule.md", name: "rule.md" }),
		])
	})

	it("clears rules when incoming rules message omits rules", () => {
		render(
			<ExtensionStateContextProvider>
				<RulesTestComponent />
			</ExtensionStateContextProvider>,
		)

		act(() => {
			window.dispatchEvent(
				new MessageEvent("message", {
					data: {
						type: "rules",
						rules: [
							{
								id: "global:generic:generic:rule.md",
								name: "rule.md",
								scope: "global",
								kind: "generic",
								filePath: "/home/.roo/rules/rule.md",
								relativePath: "rule.md",
								directoryPath: "/home/.roo/rules",
							},
						],
					},
				}),
			)
			window.dispatchEvent(
				new MessageEvent("message", {
					data: { type: "rules" },
				}),
			)
		})

		expect(JSON.parse(screen.getByTestId("rules").textContent!)).toEqual([])
	})

	it("initializes with soundEnabled set to false", () => {
		render(
			<ExtensionStateContextProvider>
				<TestComponent />
			</ExtensionStateContextProvider>,
		)

		expect(JSON.parse(screen.getByTestId("sound-enabled").textContent!)).toBe(false)
	})

	it("initializes with showRooIgnoredFiles set to true", () => {
		render(
			<ExtensionStateContextProvider>
				<TestComponent />
			</ExtensionStateContextProvider>,
		)

		expect(JSON.parse(screen.getByTestId("show-rooignored-files").textContent!)).toBe(true)
	})

	it("initializes shadowed context fields from initialState", () => {
		const routerModels = {} as RouterModels
		const marketplaceItems: MarketplaceItem[] = [
			{
				id: "mode-item",
				name: "Test mode",
				description: "A test mode",
				type: "mode",
				content: "custom mode content",
			},
		]
		const marketplaceInstalledMetadata: MarketplaceInstalledMetadata = {
			project: { "mode-item": { type: "mode" } },
			global: {},
		}

		render(
			<ExtensionStateContextProvider
				initialState={{
					alwaysAllowFollowupQuestions: true,
					followupAutoApproveTimeoutMs: 1500,
					includeTaskHistoryInEnhance: false,
					includeCurrentTime: false,
					includeCurrentCost: false,
					routerModels,
					marketplaceItems,
					marketplaceInstalledMetadata,
				}}>
				<InitialStateTestComponent />
			</ExtensionStateContextProvider>,
		)

		expect(JSON.parse(screen.getByTestId("initial-state").textContent!)).toEqual({
			alwaysAllowFollowupQuestions: true,
			followupAutoApproveTimeoutMs: 1500,
			includeTaskHistoryInEnhance: false,
			includeCurrentTime: false,
			includeCurrentCost: false,
			routerModels: {},
			marketplaceItems,
			marketplaceInstalledMetadata,
		})
	})

	it("updates showRooIgnoredFiles through setShowRooIgnoredFiles", () => {
		render(
			<ExtensionStateContextProvider>
				<TestComponent />
			</ExtensionStateContextProvider>,
		)

		act(() => {
			screen.getByTestId("toggle-rooignore-button").click()
		})

		expect(JSON.parse(screen.getByTestId("show-rooignored-files").textContent!)).toBe(false)
	})

	it("does not set the chat font-size CSS variable when unset (init)", () => {
		document.documentElement.style.removeProperty("--zoo-chat-font-size")

		render(
			<ExtensionStateContextProvider>
				<ChatFontSizeTestComponent />
			</ExtensionStateContextProvider>,
		)

		expect(JSON.parse(screen.getByTestId("chat-font-size").textContent!)).toBe(null)
		expect(document.documentElement.style.getPropertyValue("--zoo-chat-font-size")).toBe("")
	})

	it("applies the chat font-size CSS variable when set, and clears it on reset", () => {
		document.documentElement.style.removeProperty("--zoo-chat-font-size")

		render(
			<ExtensionStateContextProvider>
				<ChatFontSizeTestComponent />
			</ExtensionStateContextProvider>,
		)

		act(() => {
			screen.getByTestId("set-font-size-button").click()
		})

		expect(JSON.parse(screen.getByTestId("chat-font-size").textContent!)).toBe(20)
		expect(document.documentElement.style.getPropertyValue("--zoo-chat-font-size")).toBe("20px")

		act(() => {
			screen.getByTestId("reset-font-size-button").click()
		})

		expect(JSON.parse(screen.getByTestId("chat-font-size").textContent!)).toBe(null)
		expect(document.documentElement.style.getPropertyValue("--zoo-chat-font-size")).toBe("")
	})

	it("updates allowedCommands through setAllowedCommands", () => {
		render(
			<ExtensionStateContextProvider>
				<TestComponent />
			</ExtensionStateContextProvider>,
		)

		act(() => {
			screen.getByTestId("update-button").click()
		})

		expect(JSON.parse(screen.getByTestId("allowed-commands").textContent!)).toEqual(["npm install", "git status"])
	})

	it("throws error when used outside provider", () => {
		const useContextSpy = vi.spyOn(React, "useContext").mockReturnValue(undefined)

		try {
			expect(() => useExtensionState()).toThrow(
				"useExtensionState must be used within an ExtensionStateContextProvider",
			)
		} finally {
			useContextSpy.mockRestore()
		}
	})

	it("updates apiConfiguration through setApiConfiguration", () => {
		render(
			<ExtensionStateContextProvider>
				<ApiConfigTestComponent />
			</ExtensionStateContextProvider>,
		)

		const initialContent = screen.getByTestId("api-configuration").textContent!
		expect(initialContent).toBeDefined()

		act(() => {
			screen.getByTestId("update-api-config-button").click()
		})

		const updatedContent = screen.getByTestId("api-configuration").textContent!
		const updatedConfig = JSON.parse(updatedContent || "{}")

		expect(updatedConfig).toEqual(
			expect.objectContaining({
				apiModelId: "new-model",
				apiProvider: "anthropic",
			}),
		)
	})

	it("correctly merges partial updates to apiConfiguration", () => {
		render(
			<ExtensionStateContextProvider>
				<ApiConfigTestComponent />
			</ExtensionStateContextProvider>,
		)

		// First set the initial configuration
		act(() => {
			screen.getByTestId("update-api-config-button").click()
		})

		// Verify initial update
		const initialContent = screen.getByTestId("api-configuration").textContent!
		const initialConfig = JSON.parse(initialContent || "{}")
		expect(initialConfig).toEqual(
			expect.objectContaining({
				apiModelId: "new-model",
				apiProvider: "anthropic",
			}),
		)

		// Now perform a partial update
		act(() => {
			screen.getByTestId("partial-update-button").click()
		})

		// Verify that the partial update was merged with the existing configuration
		const updatedContent = screen.getByTestId("api-configuration").textContent!
		const updatedConfig = JSON.parse(updatedContent || "{}")
		expect(updatedConfig).toEqual(
			expect.objectContaining({
				apiModelId: "new-model", // Should retain this from previous update
				apiProvider: "anthropic", // Should retain this from previous update
				modelTemperature: 0.7, // Should add this from partial update
			}),
		)
	})

	it("processes a valid registered 'action' toggleAutoApprove message", () => {
		render(
			<ExtensionStateContextProvider>
				<NavigationTestComponent />
			</ExtensionStateContextProvider>,
		)

		act(() => {
			window.dispatchEvent(
				new MessageEvent("message", {
					data: { type: "action", action: "toggleAutoApprove" },
				}),
			)
		})

		// The action is boundary-validated (registered in Phase 2, Domain 1) and
		// flips the auto-approval state.
		expect(JSON.parse(screen.getByTestId("auto-approval-enabled").textContent!)).toBe(true)
	})

	it("rejects a malformed registered 'workspaceUpdated' message without dispatching", () => {
		render(
			<ExtensionStateContextProvider>
				<NavigationTestComponent />
			</ExtensionStateContextProvider>,
		)

		act(() => {
			// `workspaceUpdated` requires `filePaths` (string[]) — a missing payload
			// must be rejected by the typed boundary instead of reaching the switch.
			window.dispatchEvent(
				new MessageEvent("message", {
					data: { type: "workspaceUpdated", openedTabs: [] },
				}),
			)
		})

		expect(JSON.parse(screen.getByTestId("file-paths").textContent!)).toEqual([])
	})
})

describe("mergeExtensionState", () => {
	it("should correctly merge extension states", () => {
		const baseState: ExtensionState = {
			version: "",
			mcpEnabled: false,
			clineMessages: [],
			taskHistory: [],
			shouldShowAnnouncement: false,
			enableCheckpoints: true,
			writeDelayMs: 1000,
			mode: "default",
			experiments: {} as Record<ExperimentId, boolean>,
			customModes: [],
			maxOpenTabsContext: 20,
			maxWorkspaceFiles: 100,
			apiConfiguration: { providerId: "openrouter" } as ProviderSettings,
			showRooIgnoredFiles: true,
			enableSubfolderRules: false,
			renderContext: "sidebar",
			organizationAllowList: { allowAll: true, providers: {} },
			autoCondenseContext: true,
			autoCondenseContextPercent: 100,
			profileThresholds: {},
			hasOpenedModeSelector: false, // Add the new required property
			maxImageFileSize: 5,
			maxTotalImageSize: 20,
			taskSyncEnabled: false,
			checkpointTimeout: DEFAULT_CHECKPOINT_TIMEOUT_SECONDS, // Add the checkpoint timeout property
			maxReadFileLine: -1,
			diffFuzzyThreshold: DEFAULT_DIFF_FUZZY_THRESHOLD,
		}

		const prevState: ExtensionState = {
			...baseState,
			apiConfiguration: { modelMaxTokens: 1234, modelMaxThinkingTokens: 123 },
			experiments: {} as Record<ExperimentId, boolean>,
			checkpointTimeout: DEFAULT_CHECKPOINT_TIMEOUT_SECONDS - 5,
		}

		const newState: ExtensionState = {
			...baseState,
			apiConfiguration: { modelMaxThinkingTokens: 456, modelTemperature: 0.3 },
			experiments: {
				preventFocusDisruption: false,
				imageGeneration: false,
				runSlashCommand: false,
				customTools: false,
			} as Record<ExperimentId, boolean>,
			checkpointTimeout: DEFAULT_CHECKPOINT_TIMEOUT_SECONDS + 5,
		}

		const result = mergeExtensionState(prevState, newState)

		expect(result.apiConfiguration).toEqual({
			modelMaxThinkingTokens: 456,
			modelTemperature: 0.3,
		})

		expect(result.experiments).toEqual({
			preventFocusDisruption: false,
			imageGeneration: false,
			runSlashCommand: false,
			customTools: false,
		})
	})

	describe("clineMessagesSeq protection", () => {
		const baseState: ExtensionState = {
			version: "",
			mcpEnabled: false,
			clineMessages: [],
			taskHistory: [],
			shouldShowAnnouncement: false,
			enableCheckpoints: true,
			writeDelayMs: 1000,
			mode: "default",
			experiments: {} as Record<ExperimentId, boolean>,
			customModes: [],
			maxOpenTabsContext: 20,
			maxWorkspaceFiles: 100,
			apiConfiguration: {},
			showRooIgnoredFiles: true,
			enableSubfolderRules: false,
			renderContext: "sidebar",
			organizationAllowList: { allowAll: true, providers: {} },
			autoCondenseContext: true,
			autoCondenseContextPercent: 100,
			profileThresholds: {},
			hasOpenedModeSelector: false,
			maxImageFileSize: 5,
			maxTotalImageSize: 20,
			taskSyncEnabled: false,
			checkpointTimeout: DEFAULT_CHECKPOINT_TIMEOUT_SECONDS,
			maxReadFileLine: -1,
			diffFuzzyThreshold: DEFAULT_DIFF_FUZZY_THRESHOLD,
		}

		const makeMessage = (ts: number, text: string): ClineMessage =>
			({ ts, type: "say", say: "text", text }) as ClineMessage

		it("rejects stale clineMessages when seq is not newer", () => {
			const newerMessages = [makeMessage(1, "hello"), makeMessage(2, "world")]
			const staleMessages = [makeMessage(1, "hello")]

			const prevState: ExtensionState = {
				...baseState,
				clineMessages: newerMessages,
				clineMessagesSeq: 5,
			}

			const result = mergeExtensionState(prevState, {
				clineMessages: staleMessages,
				clineMessagesSeq: 3, // stale seq
			})

			// Should keep the newer messages
			expect(result.clineMessages).toBe(newerMessages)
			expect(result.clineMessagesSeq).toBe(5)
		})

		it("rejects clineMessages when seq equals current (not strictly greater)", () => {
			const currentMessages = [makeMessage(1, "hello"), makeMessage(2, "world")]
			const sameSeqMessages = [makeMessage(1, "hello")]

			const prevState: ExtensionState = {
				...baseState,
				clineMessages: currentMessages,
				clineMessagesSeq: 5,
			}

			const result = mergeExtensionState(prevState, {
				clineMessages: sameSeqMessages,
				clineMessagesSeq: 5, // same seq, not strictly greater
			})

			expect(result.clineMessages).toBe(currentMessages)
			expect(result.clineMessagesSeq).toBe(5)
		})

		it("accepts clineMessages when seq is strictly greater", () => {
			const oldMessages = [makeMessage(1, "hello")]
			const newMessages = [makeMessage(1, "hello"), makeMessage(2, "world")]

			const prevState: ExtensionState = {
				...baseState,
				clineMessages: oldMessages,
				clineMessagesSeq: 3,
			}

			const result = mergeExtensionState(prevState, {
				clineMessages: newMessages,
				clineMessagesSeq: 4, // newer seq
			})

			expect(result.clineMessages).toBe(newMessages)
			expect(result.clineMessagesSeq).toBe(4)
		})

		it("applies clineMessages normally when neither state has seq (backward compat)", () => {
			const oldMessages = [makeMessage(1, "hello")]
			const newMessages = [makeMessage(1, "hello"), makeMessage(2, "world")]

			const prevState: ExtensionState = {
				...baseState,
				clineMessages: oldMessages,
			}

			const result = mergeExtensionState(prevState, {
				clineMessages: newMessages,
			})

			expect(result.clineMessages).toBe(newMessages)
		})

		it("applies clineMessages when prevState has no seq but newState does (first push)", () => {
			const prevState: ExtensionState = {
				...baseState,
				clineMessages: [],
			}

			const newMessages = [makeMessage(1, "hello")]
			const result = mergeExtensionState(prevState, {
				clineMessages: newMessages,
				clineMessagesSeq: 1,
			})

			expect(result.clineMessages).toBe(newMessages)
			expect(result.clineMessagesSeq).toBe(1)
		})
	})

	const ClineMessagesProbe = () => {
		const { clineMessages, clineMessagesBounded, clineMessagesTotal } = useExtensionState()

		return (
			<div>
				<div data-testid="cline-ts">{JSON.stringify(clineMessages.map((m) => m.ts))}</div>
				<div data-testid="cline-bounded">{JSON.stringify(clineMessagesBounded ?? null)}</div>
				<div data-testid="cline-total">{JSON.stringify(clineMessagesTotal ?? null)}</div>
			</div>
		)
	}

	describe("bounded clineMessages window (2026-09-15 state payload incident)", () => {
		const dispatch = (data: Record<string, unknown>) =>
			act(() => {
				window.dispatchEvent(new MessageEvent("message", { data }))
			})

		const say = (ts: number): ClineMessage => ({ ts, type: "say", say: "text", text: `m${ts}` })
		const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => say(from + i))
		const ts = () => JSON.parse(screen.getByTestId("cline-ts").textContent!)

		const renderProbe = () =>
			render(
				<ExtensionStateContextProvider>
					<ClineMessagesProbe />
				</ExtensionStateContextProvider>,
			)

		it("keeps the tail window, the head anchor, and messages already rendered", () => {
			renderProbe()

			dispatch({
				type: "state",
				state: {
					currentTaskId: "t1",
					clineMessagesBounded: true,
					clineMessagesTotal: 500,
					clineMessages: [say(1), ...range(491, 500)],
				},
			})

			expect(ts()).toEqual([1, ...range(491, 500).map((m) => m.ts)])
			expect(JSON.parse(screen.getByTestId("cline-bounded").textContent!)).toBe(true)
			expect(JSON.parse(screen.getByTestId("cline-total").textContent!)).toBe(500)

			// The next streaming push ships a window that no longer contains 491:
			// it must be preserved rather than dropped from the rendered transcript.
			dispatch({
				type: "state",
				state: {
					currentTaskId: "t1",
					clineMessagesBounded: true,
					clineMessagesTotal: 501,
					clineMessages: [say(1), ...range(492, 501)],
				},
			})

			expect(ts()).toEqual([1, 491, ...range(492, 501).map((m) => m.ts)])
		})

		it("drops the previous task's transcript when the task changes", () => {
			renderProbe()

			dispatch({
				type: "state",
				state: {
					currentTaskId: "t1",
					clineMessagesBounded: true,
					clineMessagesTotal: 500,
					clineMessages: [say(1), ...range(491, 500)],
				},
			})
			dispatch({
				type: "state",
				state: {
					currentTaskId: "t2",
					clineMessagesBounded: true,
					clineMessagesTotal: 30,
					clineMessages: [say(1001), ...range(1021, 1030)],
				},
			})

			expect(ts()).toEqual([1001, ...range(1021, 1030).map((m) => m.ts)])
		})

		it("still replaces the transcript for an unbounded push on the same task", () => {
			renderProbe()

			dispatch({
				type: "state",
				state: {
					currentTaskId: "t1",
					clineMessagesBounded: true,
					clineMessagesTotal: 500,
					clineMessages: [say(1), ...range(491, 500)],
				},
			})
			dispatch({ type: "state", state: { currentTaskId: "t1", clineMessages: [say(7)] } })

			expect(ts()).toEqual([7])
		})

		it("applies a lazily fetched older page in order and without duplicates", () => {
			renderProbe()

			dispatch({
				type: "state",
				state: {
					currentTaskId: "t1",
					clineMessagesBounded: true,
					clineMessagesTotal: 500,
					clineMessages: [say(1), ...range(491, 500)],
				},
			})
			dispatch({
				type: "olderClineMessages",
				olderClineMessagesTaskId: "t1",
				olderClineMessagesHasMore: true,
				olderClineMessages: range(481, 491), // 491 overlaps the window
			})

			expect(ts()).toEqual([1, ...range(481, 500).map((m) => m.ts)])
		})

		it("ignores a page belonging to a task the webview has left", () => {
			renderProbe()

			dispatch({
				type: "state",
				state: {
					currentTaskId: "t1",
					clineMessagesBounded: true,
					clineMessagesTotal: 500,
					clineMessages: [say(1), ...range(491, 500)],
				},
			})
			dispatch({
				type: "olderClineMessages",
				olderClineMessagesTaskId: "other-task",
				olderClineMessages: [say(2)],
			})

			expect(ts()).toEqual([1, ...range(491, 500).map((m) => m.ts)])
		})

		it("leaves the transcript untouched for an empty/error page", () => {
			renderProbe()

			dispatch({
				type: "state",
				state: {
					currentTaskId: "t1",
					clineMessagesBounded: true,
					clineMessagesTotal: 500,
					clineMessages: [say(1), ...range(491, 500)],
				},
			})
			dispatch({ type: "olderClineMessages", olderClineMessagesTaskId: "t1", error: "boom" })

			expect(ts()).toEqual([1, ...range(491, 500).map((m) => m.ts)])
		})
	})
})

describe("bounded taskHistory window (2026-09-17 state payload incident)", () => {
	const TaskHistoryProbe = () => {
		const { taskHistory, taskHistoryBounded, taskHistoryTotal } = useExtensionState()

		return (
			<div>
				<div data-testid="history-ids">{JSON.stringify(taskHistory.map((i) => i.id))}</div>
				<div data-testid="history-bounded">{JSON.stringify(taskHistoryBounded ?? null)}</div>
				<div data-testid="history-total">{JSON.stringify(taskHistoryTotal ?? null)}</div>
			</div>
		)
	}

	const dispatch = (data: Record<string, unknown>) =>
		act(() => {
			window.dispatchEvent(new MessageEvent("message", { data }))
		})

	const historyItem = (id: string, ts: number): HistoryItem => ({
		id,
		number: 1,
		ts,
		task: `task-${id}`,
		tokensIn: 0,
		tokensOut: 0,
		totalCost: 0,
	})
	const ids = () => JSON.parse(screen.getByTestId("history-ids").textContent!)

	const renderProbe = () =>
		render(
			<ExtensionStateContextProvider>
				<TaskHistoryProbe />
			</ExtensionStateContextProvider>,
		)

	it("keeps rows already loaded when a later bounded push ships a smaller window", () => {
		renderProbe()

		dispatch({
			type: "state",
			state: {
				taskHistoryBounded: true,
				taskHistoryTotal: 40,
				taskHistory: [historyItem("n2", 100), historyItem("n1", 99)],
			},
		})

		expect(ids()).toEqual(["n2", "n1"])
		expect(JSON.parse(screen.getByTestId("history-bounded").textContent!)).toBe(true)
		expect(JSON.parse(screen.getByTestId("history-total").textContent!)).toBe(40)

		// A push whose window no longer contains the older row must not erase it.
		dispatch({
			type: "state",
			state: {
				taskHistoryBounded: true,
				taskHistoryTotal: 40,
				taskHistory: [historyItem("n3", 101), historyItem("n2", 100)],
			},
		})

		expect(ids()).toEqual(["n3", "n2", "n1"])
	})

	it("appends a lazily fetched older page in order and without duplicates", () => {
		renderProbe()

		dispatch({
			type: "state",
			state: {
				taskHistoryBounded: true,
				taskHistoryTotal: 40,
				taskHistory: [historyItem("n2", 100), historyItem("n1", 99)],
			},
		})
		dispatch({
			type: "olderTaskHistory",
			olderTaskHistoryHasMore: true,
			olderTaskHistory: [historyItem("o1", 50), historyItem("n1", 99)],
		})

		expect(ids()).toEqual(["n2", "n1", "o1"])
	})

	it("leaves the list untouched for an empty or errored page", () => {
		renderProbe()

		dispatch({
			type: "state",
			state: { taskHistoryBounded: true, taskHistoryTotal: 40, taskHistory: [historyItem("n1", 99)] },
		})
		dispatch({ type: "olderTaskHistory", error: "boom" })

		expect(ids()).toEqual(["n1"])
	})

	it("still replaces the list for an unbounded (complete) history push", () => {
		renderProbe()

		dispatch({
			type: "state",
			state: { taskHistory: [historyItem("a", 1), historyItem("b", 2)] },
		})

		expect(ids()).toEqual(["a", "b"])

		dispatch({ type: "state", state: { taskHistory: [historyItem("c", 3)] } })

		expect(ids()).toEqual(["c"])
	})
})
