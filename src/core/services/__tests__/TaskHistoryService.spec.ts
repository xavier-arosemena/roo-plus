// npx vitest run core/services/__tests__/TaskHistoryService.spec.ts

import { type HistoryItem, parseExtensionMessage } from "@roo-code/types"

import {
	TaskHistoryService,
	boundTaskHistoryForWebview,
	isShippableHistoryItem,
	projectTaskHistoryForWebview,
	selectOlderTaskHistory,
	MAX_TASK_HISTORY_BYTES_SHIPPED_TO_WEBVIEW,
	MAX_TASK_HISTORY_SHIPPED_TO_WEBVIEW,
	MIN_TASK_HISTORY_ROWS_SHIPPED_TO_WEBVIEW,
	type RecentTasksCachePort,
	type TaskHistoryServiceDeps,
	type TaskHistoryStoreLike,
} from "../TaskHistoryService"
import { estimateArrayRowBytes } from "../../../shared/payloadSize"

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
	isViewLaunched: ReturnType<typeof vi.fn>
	cache: { current: string[] | undefined }
	createService: (overrides?: Partial<TaskHistoryServiceDeps>) => TaskHistoryService
}

const makeHarness = (): TestHarness => {
	const store = makeStore()
	const postMessageToWebview = vi.fn().mockResolvedValue(undefined)
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
		recentTasksCache,
	}

	return {
		service: new TaskHistoryService(baseDeps),
		store,
		postMessageToWebview,
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

	it("emits task-history payloads that satisfy the registered outbound schemas (Phase 2, Domain 1)", async () => {
		const h = makeHarness()
		const item = makeHistoryItem({ id: "task-1", task: "Test task" })
		h.store.get.mockReturnValue(item)

		await h.service.updateTaskHistory(item)

		// The producer's payload must survive the typed boundary — a schema
		// regression here (e.g. a missing required HistoryItem field) would fail
		// loudly at the webview/CLI boundary.
		const itemMessage = h.postMessageToWebview.mock.calls.find(
			(call: unknown[]) => (call[0] as { type?: string })?.type === "taskHistoryItemUpdated",
		)?.[0]
		expect(itemMessage).toBeDefined()
		expect(parseExtensionMessage(itemMessage).ok).toBe(true)
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

describe("TaskHistoryService broadcast bounding", () => {
	it("caps taskHistoryUpdated broadcasts to the newest MAX_TASK_HISTORY_SHIPPED_TO_WEBVIEW items", async () => {
		const h = makeHarness()
		const now = Date.now()
		const items: HistoryItem[] = Array.from({ length: MAX_TASK_HISTORY_SHIPPED_TO_WEBVIEW + 50 }, (_, i) =>
			makeHistoryItem({ id: `task-${i}`, ts: now - i, task: `Task ${i}`, number: i + 1 }),
		)
		h.store.getAll.mockReturnValue(items)

		await h.service.broadcastTaskHistoryUpdate()

		const sent = h.postMessageToWebview.mock.calls[0][0].taskHistory as HistoryItem[]
		expect(sent).toHaveLength(MAX_TASK_HISTORY_SHIPPED_TO_WEBVIEW)
		// Newest item (task-0 has the latest ts) is kept; the oldest is dropped.
		expect(sent[0].id).toBe("task-0")
		expect(sent.some((item) => item.id === `task-${MAX_TASK_HISTORY_SHIPPED_TO_WEBVIEW + 49}`)).toBe(false)
	})

	it("does not truncate the store when broadcasting (store remains the full source of truth)", async () => {
		const h = makeHarness()
		const now = Date.now()
		const items: HistoryItem[] = Array.from({ length: MAX_TASK_HISTORY_SHIPPED_TO_WEBVIEW + 20 }, (_, i) =>
			makeHistoryItem({ id: `store-task-${i}`, ts: now - i, task: `Store task ${i}`, number: i + 1 }),
		)
		h.store.getAll.mockReturnValue(items)

		await h.service.broadcastTaskHistoryUpdate()

		// The service only bounds what it posts; it never mutates/truncates the store.
		expect(h.store.upsert).not.toHaveBeenCalled()
		expect(h.store.getAll).toHaveBeenCalledTimes(1)
	})
})

describe("boundTaskHistoryForWebview", () => {
	it("filters out items without a ts or task and sorts newest first", () => {
		const now = Date.now()
		const items: HistoryItem[] = [
			makeHistoryItem({ id: "old", ts: now - 1000, task: "Old task" }),
			makeHistoryItem({ id: "new", ts: now, task: "New task", number: 2 }),
			makeHistoryItem({ id: "no-ts", ts: 0, task: "No ts", number: 3 }),
			makeHistoryItem({ id: "no-task", ts: now, task: "", number: 4 }),
		]

		const result = boundTaskHistoryForWebview(items)

		expect(result.map((item) => item.id)).toEqual(["new", "old"])
	})

	it("caps to the newest N items using the provided max", () => {
		const now = Date.now()
		const items: HistoryItem[] = Array.from({ length: 150 }, (_, i) =>
			makeHistoryItem({ id: `task-${i}`, ts: now - i, task: `Task ${i}`, number: i + 1 }),
		)

		const result = boundTaskHistoryForWebview(items, 100)

		expect(result).toHaveLength(100)
		expect(result[0].id).toBe("task-0")
		expect(result[99].id).toBe("task-99")
	})

	it("defaults to MAX_TASK_HISTORY_SHIPPED_TO_WEBVIEW", () => {
		const now = Date.now()
		const items: HistoryItem[] = Array.from({ length: MAX_TASK_HISTORY_SHIPPED_TO_WEBVIEW * 2 }, (_, i) =>
			makeHistoryItem({ id: `task-${i}`, ts: now - i, task: `Task ${i}`, number: i + 1 }),
		)

		expect(boundTaskHistoryForWebview(items)).toHaveLength(MAX_TASK_HISTORY_SHIPPED_TO_WEBVIEW)
	})
})

describe("projectTaskHistoryForWebview (count + byte budget)", () => {
	const now = Date.now()

	const rows = (count: number, taskBytes: number): HistoryItem[] =>
		Array.from({ length: count }, (_, i) =>
			makeHistoryItem({
				id: `row-${i}`,
				ts: now - i,
				task: `Row ${i} ${"t".repeat(taskBytes)}`,
				number: i + 1,
			}),
		)

	it("still ships the full count cap when the rows fit the byte budget", () => {
		// Terse rows must NOT be silently shrunk: the count cap (100) binds first.
		const projection = projectTaskHistoryForWebview(rows(150, 0))

		expect(projection.items).toHaveLength(MAX_TASK_HISTORY_SHIPPED_TO_WEBVIEW)
		expect(projection.total).toBe(150)
		expect(projection.bounded).toBe(true)
		expect(projection.items[0].id).toBe("row-0")
		expect(projection.items.at(-1)?.id).toBe(`row-${MAX_TASK_HISTORY_SHIPPED_TO_WEBVIEW - 1}`)
	})

	it("stops at the byte budget for oversized rows while staying newest-first", () => {
		const items = rows(40, 2 * 1024)

		const projection = projectTaskHistoryForWebview(items)

		expect(projection.items.length).toBeGreaterThanOrEqual(MIN_TASK_HISTORY_ROWS_SHIPPED_TO_WEBVIEW)
		expect(projection.items.length).toBeLessThan(items.length)
		expect(projection.items.map((item) => item.id)).toEqual(
			Array.from({ length: projection.items.length }, (_, i) => `row-${i}`),
		)

		// The window stops exactly when the NEXT row would exceed the budget —
		// i.e. the shipped bytes never exceed the budget by more than one row.
		const shipped = projection.items.reduce((sum, item) => sum + estimateArrayRowBytes(item), 0)
		expect(shipped).toBeLessThanOrEqual(MAX_TASK_HISTORY_BYTES_SHIPPED_TO_WEBVIEW)
		const nextRow = items[projection.items.length]
		expect(shipped + estimateArrayRowBytes(nextRow)).toBeGreaterThan(MAX_TASK_HISTORY_BYTES_SHIPPED_TO_WEBVIEW)
	})

	it("never drops the newest row, even when it alone exceeds the byte budget", () => {
		const items = [
			makeHistoryItem({ id: "huge", ts: now, task: `Huge ${"x".repeat(20 * 1024)}` }),
			...rows(3, 2 * 1024).slice(1),
		]

		const projection = projectTaskHistoryForWebview(items, { maxBytes: 1024, minRows: 1 })

		expect(projection.items).toHaveLength(1)
		expect(projection.items[0].id).toBe("huge")
		expect(projection.bounded).toBe(true)
	})

	it("fills the row floor with the newest rows when they exceed the budget", () => {
		const items = rows(20, 8 * 1024)

		const projection = projectTaskHistoryForWebview(items, { maxBytes: 1 })

		// With maxBytes below a single row the floor is the only thing bound.
		expect(projection.items).toHaveLength(MIN_TASK_HISTORY_ROWS_SHIPPED_TO_WEBVIEW)
		expect(projection.items.map((item) => item.id)).toEqual(
			Array.from({ length: MIN_TASK_HISTORY_ROWS_SHIPPED_TO_WEBVIEW }, (_, i) => `row-${i}`),
		)
	})

	it("never JSON.stringify's while sizing rows (cheap estimator only)", () => {
		const spy = vi.spyOn(JSON, "stringify")
		try {
			const projection = projectTaskHistoryForWebview(rows(120, 4 * 1024))
			expect(projection.items.length).toBeGreaterThan(0)
			expect(spy).not.toHaveBeenCalled()
		} finally {
			spy.mockRestore()
		}
	})

	it("does not mutate the store array it is given", () => {
		const items = [
			makeHistoryItem({ id: "old", ts: now - 100, task: "Old" }),
			makeHistoryItem({ id: "new", ts: now, task: "New" }),
		]
		const snapshot = items.map((item) => item.id)

		projectTaskHistoryForWebview(items)

		expect(items.map((item) => item.id)).toEqual(snapshot)
	})
})

describe("projectTaskHistoryForWebview (DEBT C: the byte bound must not split a task tree)", () => {
	const now = Date.now()

	/**
	 * The invariant the History panel depends on: `useGroupedTasks` groups on
	 * `parentTaskId` and promotes a child whose parent is missing to a ROOT row, so
	 * a shipped child without its shipped parent renders as a top-level task.
	 * Returns the ids that would render as orphaned children.
	 */
	const orphans = (items: HistoryItem[]): string[] => {
		const shippedIds = new Set(items.map((item) => item.id))
		return items.filter((item) => item.parentTaskId && !shippedIds.has(item.parentTaskId)).map((item) => item.id)
	}

	/**
	 * Newest-first store: three cheap children, then a row the count cap refuses
	 * (`middle`, NEWER than the parent), then the parent, then an older row.
	 * The window admits only the three children, so `parent` used to be dropped.
	 */
	const treeFixture = () => {
		const children = [0, 1, 2].map((i) =>
			makeHistoryItem({ id: `child-${i}`, ts: now - i, task: `Child ${i}`, parentTaskId: "parent" }),
		)
		const middle = makeHistoryItem({ id: "middle", ts: now - 5, task: "Middle" })
		const parent = makeHistoryItem({ id: "parent", ts: now - 10, task: "Parent" })
		const oldest = makeHistoryItem({ id: "oldest", ts: now - 20, task: "Oldest" })

		return { children, middle, parent, oldest, all: [...children, middle, parent, oldest] }
	}

	it("re-attaches the parent the byte/count budget would orphan, keeping newest-first order", () => {
		const { children, parent, all } = treeFixture()

		const projection = projectTaskHistoryForWebview(all, { maxItems: 3 })

		expect(projection.items.map((item) => item.id)).toEqual([...children.map((child) => child.id), parent.id])
		expect(orphans(projection.items)).toEqual([])
		expect(projection.total).toBe(all.length)
		expect(projection.bounded).toBe(true)
	})

	it("re-attaches a whole chain (grandparent included), oldest last", () => {
		const grandparent = makeHistoryItem({ id: "grandparent", ts: now - 30, task: "Grandparent" })
		const parent = makeHistoryItem({ id: "parent", ts: now - 20, task: "Parent", parentTaskId: "grandparent" })
		const child = makeHistoryItem({ id: "child", ts: now, task: "Child", parentTaskId: "parent" })

		const projection = projectTaskHistoryForWebview([child, parent, grandparent], { maxItems: 1 })

		expect(projection.items.map((item) => item.id)).toEqual(["child", "parent", "grandparent"])
		expect(orphans(projection.items)).toEqual([])
	})

	it("does not invent a parent that is not in the store (a deleted parent stays a root row)", () => {
		const child = makeHistoryItem({ id: "child", ts: now, task: "Child", parentTaskId: "deleted-parent" })

		const projection = projectTaskHistoryForWebview([child])

		expect(projection.items.map((item) => item.id)).toEqual(["child"])
		expect(projection.bounded).toBe(false)
		expect(projection.pagingAnchorTs).toBeUndefined()
	})

	it("pages from the contiguous cutoff, so the rows the window skipped stay reachable", () => {
		const { all, parent, middle, oldest } = treeFixture()
		const projection = projectTaskHistoryForWebview(all, { maxItems: 3 })

		// The re-attached parent is OLDER than the cutoff, so the anchor must be the
		// last CONTIGUOUS row (child-2) — not the last row present (the parent).
		expect(projection.pagingAnchorTs).toBe(now - 2)

		const fromAnchor = selectOlderTaskHistory(all, projection.pagingAnchorTs as number)
		expect(fromAnchor.items.map((item) => item.id)).toEqual([middle.id, parent.id, oldest.id])

		// Paging from the last row present would skip `middle` entirely, and no later
		// page could reach it (pages only move further down in `ts`).
		const fromLastRow = selectOlderTaskHistory(all, projection.items.at(-1)!.ts)
		expect(fromLastRow.items.map((item) => item.id)).toEqual([oldest.id])
	})

	it("leaves a chain split rather than breaching the byte budget when the parent cannot fit", () => {
		const parent = makeHistoryItem({ id: "parent", ts: now - 100, task: `Parent ${"p".repeat(30 * 1024)}` })
		const child = makeHistoryItem({
			id: "child",
			ts: now,
			task: `Child ${"c".repeat(4 * 1024)}`,
			parentTaskId: "parent",
		})

		const projection = projectTaskHistoryForWebview([child, parent], { maxBytes: 4 * 1024, minRows: 1 })

		expect(projection.items.map((item) => item.id)).toEqual(["child"])
		// The anchor still points at the single contiguous row, so the parent (and
		// its oversized payload) remains fetchable through the paging flow.
		expect(projection.pagingAnchorTs).toBe(now)
		expect(
			selectOlderTaskHistory([child, parent], projection.pagingAnchorTs as number).items.map((i) => i.id),
		).toEqual(["parent"])
	})

	it("charges re-attached ancestors to the same byte budget", () => {
		const child = makeHistoryItem({ id: "child", ts: now, task: "Child", parentTaskId: "parent" })
		const parent = makeHistoryItem({ id: "parent", ts: now - 1, task: `Parent ${"p".repeat(3 * 1024)}` })

		const projection = projectTaskHistoryForWebview([child, parent], { maxBytes: 1024, minRows: 1 })

		// The floor admits the child even though it alone exceeds the budget; the
		// ancestor is NOT added on top of it (that is what would breach the payload
		// budget the projection exists to enforce).
		expect(projection.items.map((item) => item.id)).toEqual(["child"])
		expect(orphans(projection.items)).toEqual(["child"])
	})

	it("omits the paging anchor when the window is the whole history", () => {
		const projection = projectTaskHistoryForWebview([makeHistoryItem({ id: "only", ts: now, task: "Only" })])

		expect(projection.bounded).toBe(false)
		expect(projection.pagingAnchorTs).toBeUndefined()
	})
})

describe("selectOlderTaskHistory", () => {
	const now = Date.now()
	const items = Array.from({ length: 30 }, (_, i) =>
		makeHistoryItem({ id: `row-${i}`, ts: now - i, task: `Row ${i}`, number: i + 1 }),
	)

	it("returns the newest rows STRICTLY older than the bound, plus hasMore", () => {
		const page = selectOlderTaskHistory(items, now - 10, { maxItems: 5 })

		expect(page.items.map((item) => item.id)).toEqual(["row-11", "row-12", "row-13", "row-14", "row-15"])
		expect(page.hasMore).toBe(true)
	})

	it("reports hasMore=false once the history tail is reached", () => {
		const page = selectOlderTaskHistory(items, now - 28, { maxItems: 50 })

		expect(page.items.map((item) => item.id)).toEqual(["row-29"])
		expect(page.hasMore).toBe(false)
	})

	it("excludes unusable rows from the page and its hasMore accounting", () => {
		const withNoise = [
			makeHistoryItem({ id: "no-task", ts: now - 1, task: "" }),
			makeHistoryItem({ id: "good", ts: now - 2, task: "Good" }),
		]

		const page = selectOlderTaskHistory(withNoise, now)

		expect(page.items.map((item) => item.id)).toEqual(["good"])
		expect(page.hasMore).toBe(false)
	})
})

describe("isShippableHistoryItem", () => {
	it("requires both a timestamp and a task description", () => {
		expect(isShippableHistoryItem(makeHistoryItem({ id: "ok", task: "Task" }))).toBe(true)
		expect(isShippableHistoryItem(makeHistoryItem({ id: "no-ts", task: "Task", ts: 0 }))).toBe(false)
		expect(isShippableHistoryItem(makeHistoryItem({ id: "no-task", task: "" }))).toBe(false)
	})
})
