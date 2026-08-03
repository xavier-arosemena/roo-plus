// npx vitest run core/services/__tests__/TaskHistoryService.spec.ts

import type { HistoryItem } from "@roo-code/types"

import {
	TaskHistoryService,
	type RecentTasksCachePort,
	type TaskHistoryServiceDeps,
	type TaskHistoryStoreLike,
} from "../TaskHistoryService"

const makeHistoryItem = (overrides: Partial<HistoryItem> & { id: string; task: string }): HistoryItem => ({
	number: 1,
	ts: Date.now(),
	tokensIn: 100,
	tokensOut: 50,
	totalCost: 0.01,
	...overrides,
})

type StoreLike = TaskHistoryStoreLike & {
	upsert: ReturnType<typeof vi.fn>
	get: ReturnType<typeof vi.fn>
	getAll: ReturnType<typeof vi.fn>
}

const makeStore = (): StoreLike => ({
	upsert: vi.fn(async (item: HistoryItem): Promise<HistoryItem[]> => [item]),
	get: vi.fn(() => undefined),
	getAll: vi.fn((): HistoryItem[] => []),
})

interface TestHarness {
	service: TaskHistoryService
	store: StoreLike
	postMessageToWebview: ReturnType<typeof vi.fn>
	log: ReturnType<typeof vi.fn>
	writeGlobalTaskHistory: ReturnType<typeof vi.fn>
	isViewLaunched: ReturnType<typeof vi.fn>
	cache: { current: string[] | undefined }
	createService: (overrides?: Partial<TaskHistoryServiceDeps>) => TaskHistoryService
}

const makeHarness = (): TestHarness => {
	const store = makeStore()
	const postMessageToWebview = vi.fn().mockResolvedValue(undefined)
	const log = vi.fn()
	const writeGlobalTaskHistory = vi.fn().mockResolvedValue(undefined)
	const isViewLaunched = vi.fn(() => true)
	const cache: { current: string[] | undefined } = { current: undefined }
	const recentTasksCache: RecentTasksCachePort = {
		get: () => cache.current,
		set: (value) => {
			cache.current = value
		},
	}

	const baseDeps: TaskHistoryServiceDeps = {
		taskHistoryStore: store,
		isViewLaunched,
		postMessageToWebview,
		log,
		writeGlobalTaskHistory,
		recentTasksCache,
	}

	return {
		service: new TaskHistoryService(baseDeps),
		store,
		postMessageToWebview,
		log,
		writeGlobalTaskHistory,
		isViewLaunched,
		cache,
		createService: (overrides = {}) => new TaskHistoryService({ ...baseDeps, ...overrides }),
	}
}

describe("TaskHistoryService.updateTaskHistory", () => {
	it("broadcasts a taskHistoryItemUpdated message by default when the view is launched", async () => {
		const h = makeHarness()
		const item = makeHistoryItem({ id: "task-1", task: "Test task" })
		h.store.get.mockReturnValue(item)

		await h.service.updateTaskHistory(item)

		expect(h.store.upsert).toHaveBeenCalledWith(item)
		expect(h.postMessageToWebview).toHaveBeenCalledWith({
			type: "taskHistoryItemUpdated",
			taskHistoryItem: item,
		})
	})

	it("does not broadcast when broadcast: false", async () => {
		const h = makeHarness()
		const item = makeHistoryItem({ id: "task-2", task: "Test task 2" })

		await h.service.updateTaskHistory(item, { broadcast: false })

		expect(h.postMessageToWebview).not.toHaveBeenCalled()
	})

	it("does not broadcast when the view is not launched", async () => {
		const h = makeHarness()
		h.isViewLaunched.mockReturnValue(false)
		const item = makeHistoryItem({ id: "task-3", task: "Test task 3" })

		await h.service.updateTaskHistory(item)

		expect(h.postMessageToWebview).not.toHaveBeenCalled()
	})

	it("invalidates the recent-tasks cache on every update", async () => {
		const h = makeHarness()
		h.cache.current = ["cached-id"]

		await h.service.updateTaskHistory(makeHistoryItem({ id: "task-4", task: "Task 4" }), { broadcast: false })

		expect(h.cache.current).toBeUndefined()
	})

	it("returns the updated task history array from the store", async () => {
		const h = makeHarness()
		const item = makeHistoryItem({ id: "task-return", task: "Return test task" })
		h.store.upsert.mockResolvedValue([item])

		const result = await h.service.updateTaskHistory(item, { broadcast: false })

		expect(Array.isArray(result)).toBe(true)
		expect(result.some((entry) => entry.id === "task-return")).toBe(true)
	})
})

describe("TaskHistoryService.getRecentTasks", () => {
	it("returns the cached value when present", async () => {
		const h = makeHarness()
		h.cache.current = ["cached-1", "cached-2"]

		const result = h.service.getRecentTasks("/workspace")

		expect(result).toEqual(["cached-1", "cached-2"])
		expect(h.store.getAll).not.toHaveBeenCalled()
	})

	it("computes and caches recent task ids for the workspace", async () => {
		const h = makeHarness()
		const now = Date.now()
		h.store.getAll.mockReturnValue([
			makeHistoryItem({ id: "in-ws", ts: now, task: "In workspace", workspace: "/ws" }),
			makeHistoryItem({ id: "other-ws", ts: now, task: "Other workspace", workspace: "/other" }),
			makeHistoryItem({ id: "no-ts", ts: 0, task: "No timestamp", workspace: "/ws" }),
			makeHistoryItem({ id: "no-task", ts: now, task: "", workspace: "/ws" }),
		])

		const result = h.service.getRecentTasks("/ws")

		expect(result).toEqual(["in-ws"])
		expect(h.cache.current).toEqual(["in-ws"])
	})

	it("caches an empty array when the workspace has no valid tasks", async () => {
		const h = makeHarness()
		h.store.getAll.mockReturnValue([
			makeHistoryItem({ id: "other", ts: Date.now(), task: "Other", workspace: "/other" }),
		])

		const result = h.service.getRecentTasks("/ws")

		expect(result).toEqual([])
		expect(h.cache.current).toEqual([])
	})

	it("returns all workspace tasks (most recent first) when fewer than 100 exist", async () => {
		const h = makeHarness()
		const now = Date.now()
		const items: HistoryItem[] = []
		for (let i = 0; i < 50; i++) {
			items.push(
				makeHistoryItem({ id: `task-${i}`, ts: now - i, task: `Task ${i}`, workspace: "/ws", number: i }),
			)
		}
		h.store.getAll.mockReturnValue(items)

		const result = h.service.getRecentTasks("/ws")

		expect(result).toHaveLength(50)
		expect(result[0]).toBe("task-0") // newest first
	})

	it("limits to the last 7 days when there are at least 100 workspace tasks", async () => {
		const h = makeHarness()
		const now = Date.now()
		const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
		const items: HistoryItem[] = []
		// 100 tasks within the last 7 days, plus older tasks beyond the window.
		for (let i = 0; i < 100; i++) {
			items.push(
				makeHistoryItem({ id: `recent-${i}`, ts: now - i, task: `Recent ${i}`, workspace: "/ws", number: i }),
			)
		}
		for (let i = 0; i < 10; i++) {
			items.push(
				makeHistoryItem({
					id: `stale-${i}`,
					ts: now - sevenDaysMs - 1000,
					task: `Stale ${i}`,
					workspace: "/ws",
					number: 200 + i,
				}),
			)
		}
		h.store.getAll.mockReturnValue(items)

		const result = h.service.getRecentTasks("/ws")

		expect(result).toHaveLength(100)
		expect(result[0]).toBe("recent-0")
		expect(result.some((id) => id.startsWith("stale-"))).toBe(false)
	})
})

describe("TaskHistoryService.broadcastTaskHistoryUpdate", () => {
	it("sends a sorted taskHistoryUpdated message (newest first)", async () => {
		const h = makeHarness()
		const now = Date.now()
		const items: HistoryItem[] = [
			makeHistoryItem({ id: "old", ts: now - 10000, task: "Old task" }),
			makeHistoryItem({ id: "new", ts: now, task: "New task", number: 2 }),
		]

		await h.service.broadcastTaskHistoryUpdate(items)

		expect(h.postMessageToWebview).toHaveBeenCalledWith({
			type: "taskHistoryUpdated",
			taskHistory: [expect.objectContaining({ id: "new" }), expect.objectContaining({ id: "old" })],
		})
	})

	it("filters out items without a ts or task", async () => {
		const h = makeHarness()
		const now = Date.now()
		const items: HistoryItem[] = [
			makeHistoryItem({ id: "valid", ts: now, task: "Valid task" }),
			makeHistoryItem({ id: "no-ts", ts: 0, task: "No timestamp", number: 2 }),
			makeHistoryItem({ id: "no-task", ts: now, task: "", number: 3 }),
		]

		await h.service.broadcastTaskHistoryUpdate(items)

		const sent = h.postMessageToWebview.mock.calls[0][0]
		expect(sent.taskHistory).toEqual([expect.objectContaining({ id: "valid" })])
	})

	it("reads from the store when no history is provided", async () => {
		const h = makeHarness()
		h.store.getAll.mockReturnValue([makeHistoryItem({ id: "from-store", ts: Date.now(), task: "Store task" })])

		await h.service.broadcastTaskHistoryUpdate()

		expect(h.postMessageToWebview).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "taskHistoryUpdated",
				taskHistory: [expect.objectContaining({ id: "from-store" })],
			}),
		)
	})

	it("does nothing when the view is not launched", async () => {
		const h = makeHarness()
		h.isViewLaunched.mockReturnValue(false)

		await h.service.broadcastTaskHistoryUpdate()

		expect(h.postMessageToWebview).not.toHaveBeenCalled()
	})
})

describe("TaskHistoryService globalState write-through", () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it("debounces scheduleGlobalStateWriteThrough writes to the target", async () => {
		const h = makeHarness()
		const item = makeHistoryItem({ id: "write-1", task: "Write task" })
		h.store.getAll.mockReturnValue([item])

		h.service.scheduleGlobalStateWriteThrough()
		h.service.scheduleGlobalStateWriteThrough() // second call resets the debounce timer

		expect(h.writeGlobalTaskHistory).not.toHaveBeenCalled()

		await vi.advanceTimersByTimeAsync(5000)
		expect(h.writeGlobalTaskHistory).toHaveBeenCalledTimes(1)
		expect(h.writeGlobalTaskHistory).toHaveBeenCalledWith([item])
	})

	it("flushGlobalStateWriteThrough writes immediately and clears the pending timer", async () => {
		const h = makeHarness()
		const item = makeHistoryItem({ id: "flush-1", task: "Flush task" })
		h.store.getAll.mockReturnValue([item])

		h.service.scheduleGlobalStateWriteThrough()
		h.service.flushGlobalStateWriteThrough()

		expect(h.writeGlobalTaskHistory).toHaveBeenCalledTimes(1)
		expect(h.writeGlobalTaskHistory).toHaveBeenCalledWith([item])

		// Advancing time must not trigger a second (stale) write.
		await vi.advanceTimersByTimeAsync(5000)
		expect(h.writeGlobalTaskHistory).toHaveBeenCalledTimes(1)
	})

	it("logs when the write-through target rejects", async () => {
		const h = makeHarness()
		h.writeGlobalTaskHistory.mockRejectedValue(new Error("globalState write failed"))

		h.service.flushGlobalStateWriteThrough()
		await vi.runOnlyPendingTimersAsync()
		await Promise.resolve()

		expect(h.log).toHaveBeenCalledWith(expect.stringContaining("[flushGlobalStateWriteThrough] Failed"))
	})
})
