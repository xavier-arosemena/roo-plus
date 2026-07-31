// npx vitest run core/services/__tests__/TaskOrchestrator.spec.ts

import { describe, it, expect, vi, beforeEach } from "vitest"

import { RooCodeEventName } from "@roo-code/types"
import type { HistoryItem } from "@roo-code/types"

import { TaskOrchestrator, type TaskOrchestratorDeps, type TaskHistoryStoreLike } from "../TaskOrchestrator"
import type { Task } from "../../task/Task"
import type { ClineProvider } from "../../webview/ClineProvider"

vi.mock("vscode", () => ({
	window: {
		showWarningMessage: vi.fn(),
		showErrorMessage: vi.fn(),
		showInformationMessage: vi.fn(),
	},
	workspace: {
		getConfiguration: vi.fn(() => ({ update: vi.fn().mockResolvedValue(undefined) })),
	},
	ConfigurationTarget: { Global: 1 },
}))

vi.mock("../../../i18n", () => ({
	t: vi.fn((key: string) => key),
}))

vi.mock("../../task/Task", () => {
	class TaskStub {
		public taskId: string
		public instanceId = "inst"
		public parentTask?: unknown
		public apiConfiguration: unknown
		constructor(opts: {
			historyItem?: { id?: string }
			parentTask?: unknown
			apiConfiguration?: unknown
			onCreated?: (t: TaskStub) => void
		}) {
			this.taskId = opts.historyItem?.id ?? `task-${Math.random().toString(36).slice(2, 8)}`
			this.parentTask = opts.parentTask
			this.apiConfiguration = opts.apiConfiguration ?? { apiProvider: "anthropic" }
			opts.onCreated?.(this)
		}
		emit() {}
		on() {}
		off() {}
		abortTask() {
			return Promise.resolve()
		}
	}
	return { Task: TaskStub }
})

vi.mock("../../task-persistence", async (importOriginal) => {
	const real = await importOriginal<typeof import("../../task-persistence")>()
	return {
		...real,
		readApiMessages: vi.fn().mockResolvedValue([]),
		saveApiMessages: vi.fn().mockResolvedValue(undefined),
		saveTaskMessages: vi.fn().mockResolvedValue(undefined),
	}
})

vi.mock("../../task-persistence/taskMessages", () => ({
	readTaskMessages: vi.fn().mockResolvedValue([]),
}))

vi.mock("../../task/validateToolResultIds", () => ({
	validateAndFixToolResultIds: vi.fn((msg) => msg),
}))

import { readTaskMessages } from "../../task-persistence/taskMessages"
import { readApiMessages, saveApiMessages, saveTaskMessages } from "../../task-persistence"
import { validateAndFixToolResultIds } from "../../task/validateToolResultIds"

const makeTask = (overrides: Record<string, unknown> = {}): Task =>
	({
		taskId: "task-1",
		instanceId: "inst-1",
		abortReason: undefined,
		abandoned: false,
		rootTask: undefined,
		parentTask: undefined,
		parentTaskId: undefined,
		isStreaming: false,
		didFinishAbortingStream: false,
		isWaitingForFirstChunk: false,
		cancelCurrentRequest: vi.fn(),
		abortTask: vi.fn().mockResolvedValue(undefined),
		emit: vi.fn(),
		...overrides,
	}) as unknown as Task

const makeHistoryItem = (overrides: Partial<HistoryItem> & { id: string; task?: string }): HistoryItem =>
	({
		ts: Date.now(),
		tokensIn: 0,
		tokensOut: 0,
		totalCost: 0,
		task: overrides.task ?? "Task",
		...overrides,
	}) as HistoryItem

interface Harness {
	orchestrator: TaskOrchestrator
	provider: { isViewLaunched: boolean }
	store: {
		get: ReturnType<typeof vi.fn>
		atomicReadAndUpdate: ReturnType<typeof vi.fn>
		atomicUpdatePair: ReturnType<typeof vi.fn>
	}
	scheduler: { schedule: ReturnType<typeof vi.fn> }
	ports: {
		getCurrentTask: ReturnType<typeof vi.fn>
		getTaskWithId: ReturnType<typeof vi.fn>
		createTask: ReturnType<typeof vi.fn>
		createTaskWithHistoryItem: ReturnType<typeof vi.fn>
		evictCurrentTask: ReturnType<typeof vi.fn>
		removeClineFromStack: ReturnType<typeof vi.fn>
		addClineToStack: ReturnType<typeof vi.fn>
		handleModeSwitch: ReturnType<typeof vi.fn>
		updateTaskHistory: ReturnType<typeof vi.fn>
		postMessageToWebview: ReturnType<typeof vi.fn>
		emit: ReturnType<typeof vi.fn>
		log: ReturnType<typeof vi.fn>
		runDelegationTransition: TaskOrchestratorDeps["runDelegationTransition"]
		hasCancelledDelegationChildId: ReturnType<typeof vi.fn>
		addCancelledDelegationChildId: ReturnType<typeof vi.fn>
		deleteCancelledDelegationChildId: ReturnType<typeof vi.fn>
		resetRecentTasksCache: ReturnType<typeof vi.fn>
		setValues: ReturnType<typeof vi.fn>
	}
	createService: (overrides?: Partial<TaskOrchestratorDeps>) => TaskOrchestrator
}

const makeHarness = (): Harness => {
	const provider = { isViewLaunched: false }
	const store: Harness["store"] = {
		get: vi.fn(),
		atomicReadAndUpdate: vi.fn(async (_id: string, updater: (h: HistoryItem) => HistoryItem) => {
			updater({ id: "parent-1" } as HistoryItem)
			return []
		}),
		atomicUpdatePair: vi.fn(),
	}
	const scheduler = { schedule: vi.fn().mockResolvedValue(undefined) }

	const runDelegationTransition = async <T>(_parentTaskId: string, fn: () => Promise<T>): Promise<T> => fn()

	const ports = {
		getCurrentTask: vi.fn(),
		getTaskWithId: vi.fn().mockRejectedValue(new Error("Task not found")),
		createTask: vi.fn(),
		createTaskWithHistoryItem: vi.fn(),
		evictCurrentTask: vi.fn().mockResolvedValue(undefined),
		removeClineFromStack: vi.fn().mockResolvedValue(undefined),
		addClineToStack: vi.fn().mockResolvedValue(undefined),
		handleModeSwitch: vi.fn().mockResolvedValue(undefined),
		updateTaskHistory: vi.fn().mockResolvedValue([]),
		postMessageToWebview: vi.fn().mockResolvedValue(undefined),
		emit: vi.fn(),
		log: vi.fn(),
		runDelegationTransition,
		hasCancelledDelegationChildId: vi.fn().mockReturnValue(false),
		addCancelledDelegationChildId: vi.fn(),
		deleteCancelledDelegationChildId: vi.fn(),
		resetRecentTasksCache: vi.fn(),
		setValues: vi.fn().mockResolvedValue(undefined),
	}

	const baseDeps: TaskOrchestratorDeps = {
		provider: provider as never,
		getCurrentTask: ports.getCurrentTask,
		getTaskRegistry: vi.fn().mockReturnValue({
			push: vi.fn(),
			remove: vi.fn(),
			replace: vi.fn(),
			getAll: vi.fn(() => []),
			setCurrent: vi.fn(),
			get taskIds() {
				return []
			},
			get length() {
				return 0
			},
			get current() {
				return undefined
			},
		}),
		getTaskScheduler: vi.fn().mockReturnValue(scheduler),
		getTaskHistoryStore: vi.fn().mockReturnValue(store as unknown as TaskHistoryStoreLike),
		getProviderSettingsManager: vi.fn(),
		getContext: vi.fn(),
		getContextProxy: vi.fn().mockReturnValue({ globalStorageUri: { fsPath: "/tmp" } }),
		getState: vi.fn().mockResolvedValue({
			apiConfiguration: { apiProvider: "anthropic", consecutiveMistakeLimit: 0 },
			enableCheckpoints: true,
			checkpointTimeout: 60,
			experiments: {},
			organizationAllowList: { allowAll: true, providers: {} },
		}),
		getGlobalState: vi.fn(),
		updateGlobalState: vi.fn().mockResolvedValue(undefined),
		postMessageToWebview: ports.postMessageToWebview,
		emit: ports.emit,
		log: ports.log,
		evictCurrentTask: ports.evictCurrentTask,
		markDelegatedChildInterrupted: vi.fn().mockResolvedValue(undefined),
		removeClineFromStack: ports.removeClineFromStack,
		addClineToStack: ports.addClineToStack,
		performPreparationTasks: vi.fn().mockResolvedValue(undefined),
		createTask: ports.createTask,
		createTaskWithHistoryItem: ports.createTaskWithHistoryItem,
		getTaskWithId: ports.getTaskWithId,
		deleteTaskWithId: vi.fn().mockResolvedValue(undefined),
		handleModeSwitch: ports.handleModeSwitch,
		updateTaskHistory: ports.updateTaskHistory,
		setValues: ports.setValues,
		setProviderProfile: vi.fn().mockResolvedValue(undefined),
		activateProviderProfile: vi.fn().mockResolvedValue(undefined),
		showTaskWithId: vi.fn().mockResolvedValue(undefined),
		getCustomModes: vi.fn().mockResolvedValue([]),
		updateCustomMode: vi.fn().mockResolvedValue(undefined),
		getPendingEditOperation: vi.fn(),
		clearPendingEditOperation: vi.fn(),
		runDelegationTransition: ports.runDelegationTransition,
		getTaskCreationCallback: vi.fn(),
		getTaskEventListeners: vi.fn().mockReturnValue(new WeakMap()),
		hasCancelledDelegationChildId: ports.hasCancelledDelegationChildId,
		addCancelledDelegationChildId: ports.addCancelledDelegationChildId,
		deleteCancelledDelegationChildId: ports.deleteCancelledDelegationChildId,
		resetRecentTasksCache: ports.resetRecentTasksCache,
		getRateLimitClock: vi.fn(),
	}

	const createService = (overrides: Partial<TaskOrchestratorDeps> = {}): TaskOrchestrator =>
		new TaskOrchestrator({ ...baseDeps, ...overrides })

	return {
		orchestrator: createService(),
		provider,
		store,
		scheduler,
		ports,
		createService,
	}
}

describe("TaskOrchestrator.createTask() — single-open invariant", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("evicts the current task before creating a user-initiated top-level task", async () => {
		const h = makeHarness()
		h.ports.getCurrentTask.mockReturnValue(undefined)
		h.createService({
			getTaskRegistry: vi.fn().mockReturnValue({
				getAll: vi.fn(() => []),
				push: vi.fn(),
				get length() {
					return 0
				},
			}),
		})

		const task = await h.orchestrator.createTask("New task")

		expect(h.ports.evictCurrentTask).toHaveBeenCalledTimes(1)
		expect(h.ports.addClineToStack).toHaveBeenCalledTimes(1)
		expect(h.scheduler.schedule).toHaveBeenCalledTimes(1)
		expect(task).toBeTruthy()
	})

	it("does NOT evict the current task when a parentTask is provided (subtask)", async () => {
		const h = makeHarness()
		const parentTask = makeTask({ taskId: "parent-1" })

		const task = await h.orchestrator.createTask("Subtask", undefined, parentTask)

		expect(h.ports.evictCurrentTask).not.toHaveBeenCalled()
		expect(h.ports.addClineToStack).toHaveBeenCalledTimes(1)
		expect(task).toBeTruthy()
	})
})

describe("TaskOrchestrator.cancelTask() / cancelTaskInternal()", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("rehydrates the cancelled task via createTaskWithHistoryItem", async () => {
		const h = makeHarness()
		const task = makeTask({ taskId: "task-1", instanceId: "inst-1" })
		const historyItem = makeHistoryItem({ id: "task-1" })

		h.ports.getCurrentTask.mockReturnValueOnce(task).mockReturnValue(undefined)
		h.ports.getTaskWithId.mockResolvedValue({ historyItem })

		await h.orchestrator.cancelTask()

		expect(task.abortTask).toHaveBeenCalled()
		expect(task.abandoned).toBe(true)
		expect(h.ports.createTaskWithHistoryItem).toHaveBeenCalledWith(expect.objectContaining({ id: "task-1" }))
	})

	it("skips rehydration when the current instance changed during cancel (instanceId guard)", async () => {
		const h = makeHarness()
		const task = makeTask({ taskId: "task-1", instanceId: "inst-1" })
		const historyItem = makeHistoryItem({ id: "task-1" })
		const differentInstance = makeTask({ taskId: "task-1", instanceId: "inst-2" })

		// cancelTask reads the task; pWaitFor reads undefined (condition true);
		// the instanceId guard reads a DIFFERENT instance.
		h.ports.getCurrentTask
			.mockReturnValueOnce(task)
			.mockReturnValueOnce(undefined)
			.mockReturnValue(differentInstance)
		h.ports.getTaskWithId.mockResolvedValue({ historyItem })

		await h.orchestrator.cancelTask()

		expect(h.ports.createTaskWithHistoryItem).not.toHaveBeenCalled()
		expect(h.ports.log).toHaveBeenCalledWith(expect.stringContaining("Skipping rehydrate"))
	})

	it("skips rehydrate (but still aborts) when task history is missing", async () => {
		const h = makeHarness()
		const task = makeTask({ taskId: "task-1", instanceId: "inst-1" })
		h.ports.getCurrentTask.mockReturnValueOnce(task).mockReturnValue(undefined)
		h.ports.getTaskWithId.mockRejectedValue(new Error("Task not found"))

		await h.orchestrator.cancelTask()

		expect(task.abortTask).toHaveBeenCalled()
		expect(h.ports.createTaskWithHistoryItem).not.toHaveBeenCalled()
		expect(h.ports.log).toHaveBeenCalledWith(expect.stringContaining("skipping rehydrate"))
	})
})

describe("TaskOrchestrator.delegateParentAndOpenChild()", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("persists parent delegation metadata, schedules the child, and emits TaskDelegated", async () => {
		const h = makeHarness()
		const parentTask = {
			taskId: "parent-1",
			flushPendingToolResultsToHistory: vi.fn().mockResolvedValue(true),
			retrySaveApiConversationHistory: vi.fn(),
			emit: vi.fn(),
		}
		const child = { taskId: "child-1", start: vi.fn(), run: vi.fn().mockResolvedValue(undefined) }
		h.ports.getCurrentTask.mockReturnValue(parentTask)
		h.ports.createTask.mockResolvedValue(child)

		const updaterCalls: HistoryItem[] = []
		h.store.atomicReadAndUpdate.mockImplementation(
			async (_id: string, updater: (cur: HistoryItem) => HistoryItem) => {
				const result = updater({ id: "parent-1", status: "active" } as HistoryItem)
				updaterCalls.push(result)
				return []
			},
		)

		const result = await h.orchestrator.delegateParentAndOpenChild({
			parentTaskId: "parent-1",
			message: "Do something",
			initialTodos: [],
			mode: "code",
		})

		expect(result).toBe(child)

		// Parent closed before child creation (single-open invariant).
		expect(h.ports.removeClineFromStack).toHaveBeenCalledTimes(1)
		expect(h.ports.handleModeSwitch).toHaveBeenCalledWith("code")

		// Child created with startTask: false + initialStatus: "active".
		expect(h.ports.createTask).toHaveBeenCalledWith("Do something", undefined, parentTask, {
			initialTodos: [],
			initialStatus: "active",
			startTask: false,
		})

		// Parent metadata persisted via atomicReadAndUpdate.
		expect(h.store.atomicReadAndUpdate).toHaveBeenCalledWith("parent-1", expect.any(Function))
		expect(updaterCalls[0]).toMatchObject({
			status: "delegated",
			delegatedToId: "child-1",
			awaitingChildId: "child-1",
			childIds: expect.arrayContaining(["child-1"]),
		})

		// Child scheduled AFTER metadata persisted.
		expect(h.scheduler.schedule).toHaveBeenCalledTimes(1)
		expect(h.ports.emit).toHaveBeenCalledWith(RooCodeEventName.TaskDelegated, "parent-1", "child-1")
		expect(h.ports.resetRecentTasksCache).toHaveBeenCalled()
	})

	it("throws when there is no current task", async () => {
		const h = makeHarness()
		h.ports.getCurrentTask.mockReturnValue(undefined)

		await expect(
			h.orchestrator.delegateParentAndOpenChild({
				parentTaskId: "parent-1",
				message: "Do something",
				initialTodos: [],
				mode: "code",
			}),
		).rejects.toThrow("[delegateParentAndOpenChild] No current task")
	})
})

describe("TaskOrchestrator.reopenParentFromDelegation()", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("injects a tool_result for the new_task tool_use and atomically completes the child", async () => {
		const h = makeHarness()
		const parentItem = {
			id: "parent-1",
			status: "delegated",
			awaitingChildId: "child-1",
			childIds: ["child-1"],
			ts: Date.now(),
			task: "Parent",
			tokensIn: 0,
			tokensOut: 0,
			totalCost: 0,
		} as HistoryItem

		h.ports.getTaskWithId.mockResolvedValue({ historyItem: parentItem })
		h.ports.getCurrentTask.mockReturnValue(makeTask({ taskId: "child-1" }))

		vi.mocked(readTaskMessages).mockResolvedValue([])
		vi.mocked(readApiMessages).mockResolvedValue([
			{ role: "assistant", content: [{ type: "tool_use", id: "toolu_1", name: "new_task" }] },
		] as never)

		h.store.atomicUpdatePair.mockImplementation(
			async (
				_childId: string,
				_parentId: string,
				childUpdater: (c: HistoryItem) => HistoryItem,
				parentUpdater: (p: HistoryItem) => HistoryItem,
			) => {
				childUpdater({ id: "child-1", status: "active" } as HistoryItem)
				parentUpdater(parentItem)
				return []
			},
		)

		const parentInstance = {
			overwriteClineMessages: vi.fn().mockResolvedValue(undefined),
			overwriteApiConversationHistory: vi.fn().mockResolvedValue(undefined),
			resumeAfterDelegation: vi.fn().mockResolvedValue(undefined),
		}
		h.ports.createTaskWithHistoryItem.mockResolvedValue(parentInstance)

		const ok = await h.orchestrator.reopenParentFromDelegation({
			parentTaskId: "parent-1",
			childTaskId: "child-1",
			completionResultSummary: "Child done",
		})

		expect(ok).toBe(true)

		// UI subtask_result injected and persisted.
		expect(saveTaskMessages).toHaveBeenCalledWith(
			expect.objectContaining({
				taskId: "parent-1",
				messages: expect.arrayContaining([
					expect.objectContaining({ type: "say", say: "subtask_result", text: "Child done" }),
				]),
			}),
		)

		// API tool_result injected for the new_task tool_use and validated.
		expect(saveApiMessages).toHaveBeenCalled()
		const saveArgs = vi.mocked(saveApiMessages).mock.calls[0][0] as {
			messages: { role: string; content: { type: string; tool_use_id: string }[] }[]
		}
		const lastUserMsg = saveArgs.messages.find((m) => m.role === "user")
		expect(lastUserMsg?.content[0]).toMatchObject({
			type: "tool_result",
			tool_use_id: "toolu_1",
		})
		expect(validateAndFixToolResultIds).toHaveBeenCalled()

		// Child closed before completion.
		expect(h.ports.removeClineFromStack).toHaveBeenCalledTimes(1)

		// Atomic pair: child completed, parent active.
		expect(h.store.atomicUpdatePair).toHaveBeenCalledWith(
			"child-1",
			"parent-1",
			expect.any(Function),
			expect.any(Function),
		)

		// Parent reopened with restored histories and resumed.
		expect(h.ports.createTaskWithHistoryItem).toHaveBeenCalledWith(expect.objectContaining({ status: "active" }), {
			startTask: false,
		})
		expect(parentInstance.resumeAfterDelegation).toHaveBeenCalled()
		expect(h.ports.emit).toHaveBeenCalledWith(
			RooCodeEventName.TaskDelegationCompleted,
			"parent-1",
			"child-1",
			"Child done",
		)
		expect(h.ports.emit).toHaveBeenCalledWith(RooCodeEventName.TaskDelegationResumed, "parent-1", "child-1")
		expect(h.ports.deleteCancelledDelegationChildId).toHaveBeenCalledWith("child-1")
	})

	it("aborts without persistence when the parent is no longer delegated (fail-closed guard)", async () => {
		const h = makeHarness()
		h.ports.hasCancelledDelegationChildId.mockReturnValue(true)
		h.ports.getTaskWithId.mockResolvedValue({
			historyItem: {
				id: "parent-1",
				status: "delegated",
				awaitingChildId: "child-1",
			} as HistoryItem,
		})

		const ok = await h.orchestrator.reopenParentFromDelegation({
			parentTaskId: "parent-1",
			childTaskId: "child-1",
			completionResultSummary: "ignored",
		})

		expect(ok).toBe(false)
		expect(saveTaskMessages).not.toHaveBeenCalled()
		expect(saveApiMessages).not.toHaveBeenCalled()
		expect(h.store.atomicUpdatePair).not.toHaveBeenCalled()
		expect(h.ports.log).toHaveBeenCalledWith(expect.stringContaining("[reopenParentFromDelegation] Aborting"))
	})
})

describe("TaskOrchestrator.abandonSubtask()", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("returns false for a standalone task with no parentTaskId (orphan)", async () => {
		const h = makeHarness()
		h.ports.getTaskWithId.mockResolvedValue({
			historyItem: { id: "standalone-1", status: "interrupted" } as HistoryItem,
		})

		await expect(h.orchestrator.abandonSubtask("standalone-1")).resolves.toBe(false)
		expect(h.store.atomicUpdatePair).not.toHaveBeenCalled()
	})

	it("returns false when the child is not interrupted", async () => {
		const h = makeHarness()
		h.ports.getTaskWithId.mockResolvedValue({
			historyItem: { id: "child-1", status: "active", parentTaskId: "parent-1" } as HistoryItem,
		})

		await expect(h.orchestrator.abandonSubtask("child-1")).resolves.toBe(false)
		expect(h.store.atomicUpdatePair).not.toHaveBeenCalled()
		expect(h.ports.log).toHaveBeenCalledWith(expect.stringContaining("is not interrupted"))
	})

	it("severs the link atomically and guards against stale reattachment", async () => {
		const h = makeHarness()
		const parentItem = {
			id: "parent-1",
			status: "delegated",
			awaitingChildId: "child-1",
			delegatedToId: "child-1",
		} as HistoryItem

		h.ports.getTaskWithId.mockImplementation(async (id: string) => {
			if (id === "child-1") {
				return {
					historyItem: { id: "child-1", status: "interrupted", parentTaskId: "parent-1" } as HistoryItem,
				}
			}
			return { historyItem: parentItem }
		})
		h.ports.getCurrentTask.mockReturnValue(makeTask({ taskId: "child-1" }))
		h.store.get.mockReturnValue({ id: "child-1", status: "interrupted" })

		const updated: { child?: HistoryItem; parent?: HistoryItem } = {}
		h.store.atomicUpdatePair.mockImplementation(
			async (
				_childId: string,
				_parentId: string,
				childUpdater: (c: HistoryItem) => HistoryItem,
				parentUpdater: (p: HistoryItem) => HistoryItem,
			) => {
				updated.child = childUpdater({
					id: "child-1",
					status: "interrupted",
					parentTaskId: "parent-1",
				} as HistoryItem)
				updated.parent = parentUpdater(parentItem)
				return []
			},
		)

		const ok = await h.orchestrator.abandonSubtask("child-1")

		expect(ok).toBe(true)
		// Child's parent/root links cleared.
		expect(updated.child).toMatchObject({ parentTaskId: undefined, rootTaskId: undefined })
		// Parent returns to active, awaitingChildId cleared.
		expect(updated.parent).toMatchObject({
			status: "active",
			awaitingChildId: undefined,
			delegatedToId: undefined,
		})
		// Live child closed before the link is severed.
		expect(h.ports.removeClineFromStack).toHaveBeenCalledTimes(1)
		// Fail-closed guard added so a stale in-flight resume cannot reattach.
		expect(h.ports.addCancelledDelegationChildId).toHaveBeenCalledWith("child-1")
		expect(h.ports.resetRecentTasksCache).toHaveBeenCalled()
	})
})
