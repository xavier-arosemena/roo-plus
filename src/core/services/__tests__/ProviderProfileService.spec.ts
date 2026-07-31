// npx vitest run core/services/__tests__/ProviderProfileService.spec.ts

import * as vscode from "vscode"

import type { HistoryItem, ProviderSettings, ProviderSettingsEntry, RooCodeSettings } from "@roo-code/types"

import { ProviderProfileService, type ProviderProfileServiceDeps } from "../ProviderProfileService"
import { ContextProxy } from "../../config/ContextProxy"
import { ProviderSettingsManager } from "../../config/ProviderSettingsManager"
import type { Task } from "../../task/Task"

vi.mock("vscode", () => ({
	window: {
		showErrorMessage: vi.fn(),
		showWarningMessage: vi.fn(),
		showInformationMessage: vi.fn(),
	},
}))

vi.mock("../../../i18n", () => ({
	t: vi.fn((key: string) => key),
}))

const makeHistoryItem = (overrides: Partial<HistoryItem> & { id: string; task: string }): HistoryItem => ({
	number: 1,
	ts: Date.now(),
	tokensIn: 100,
	tokensOut: 50,
	totalCost: 0.01,
	...overrides,
})

const makeProfileEntry = (overrides: Partial<ProviderSettingsEntry> & { name: string }): ProviderSettingsEntry => ({
	id: `${overrides.name}-id`,
	apiProvider: "anthropic",
	...overrides,
})

const makeTask = (taskId: string) => {
	const task = {
		taskId,
		setTaskApiConfigName: vi.fn(),
	} as unknown as Task
	return task
}

interface TestHarness {
	service: ProviderProfileService
	contextProxy: {
		getValues: ReturnType<typeof vi.fn>
		setValue: ReturnType<typeof vi.fn>
		setValues: ReturnType<typeof vi.fn>
		setProviderSettings: ReturnType<typeof vi.fn>
		values: RooCodeSettings
	}
	providerSettingsManager: {
		saveConfig: ReturnType<typeof vi.fn>
		listConfig: ReturnType<typeof vi.fn>
		setModeConfig: ReturnType<typeof vi.fn>
		activateProfile: ReturnType<typeof vi.fn>
	}
	ports: {
		postStateToWebview: ReturnType<typeof vi.fn>
		updateTaskHistory: ReturnType<typeof vi.fn>
		getMode: ReturnType<typeof vi.fn>
		getCurrentTask: ReturnType<typeof vi.fn>
		updateTaskApiHandlerIfNeeded: ReturnType<typeof vi.fn>
		getTaskHistoryItem: ReturnType<typeof vi.fn>
		getGlobalTaskHistory: ReturnType<typeof vi.fn>
		log: ReturnType<typeof vi.fn>
		onProviderProfileChanged: ReturnType<typeof vi.fn>
	}
	createService: (overrides?: Partial<ProviderProfileServiceDeps>) => ProviderProfileService
}

const makeHarness = (): TestHarness => {
	const values: RooCodeSettings = {
		mode: "code",
		currentApiConfigName: "default",
		listApiConfigMeta: [makeProfileEntry({ name: "default" })],
	}
	const contextProxy = {
		getValues: vi.fn(() => values),
		setValue: vi.fn(async () => undefined),
		setValues: vi.fn(async () => undefined),
		setProviderSettings: vi.fn(async () => undefined),
		values,
	}
	const providerSettingsManager = {
		saveConfig: vi.fn(async (name: string) => `${name}-saved-id`),
		listConfig: vi.fn(async () => values.listApiConfigMeta),
		setModeConfig: vi.fn(async () => undefined),
		activateProfile: vi.fn(async (params: { name: string } | { id: string }) => ({
			name: "name" in params ? params.name : "default",
			id: "name" in params ? `${params.name}-id` : "default-id",
			apiProvider: "anthropic",
		})),
	}
	const ports = {
		postStateToWebview: vi.fn(async () => undefined),
		updateTaskHistory: vi.fn(async (item: HistoryItem) => [item]),
		getMode: vi.fn(async () => "code"),
		getCurrentTask: vi.fn(() => undefined),
		updateTaskApiHandlerIfNeeded: vi.fn(),
		getTaskHistoryItem: vi.fn(() => undefined),
		getGlobalTaskHistory: vi.fn(() => []),
		log: vi.fn(),
		onProviderProfileChanged: vi.fn(),
	}

	const baseDeps: ProviderProfileServiceDeps = {
		contextProxy: contextProxy as unknown as ContextProxy,
		getProviderSettingsManager: () => providerSettingsManager as unknown as ProviderSettingsManager,
		postStateToWebview: ports.postStateToWebview,
		updateTaskHistory: ports.updateTaskHistory,
		getMode: ports.getMode,
		getCurrentTask: ports.getCurrentTask,
		updateTaskApiHandlerIfNeeded: ports.updateTaskApiHandlerIfNeeded,
		getTaskHistoryItem: ports.getTaskHistoryItem,
		getGlobalTaskHistory: ports.getGlobalTaskHistory,
		log: ports.log,
		onProviderProfileChanged: ports.onProviderProfileChanged,
	}

	return {
		service: new ProviderProfileService(baseDeps),
		contextProxy,
		providerSettingsManager,
		ports,
		createService: (overrides = {}) => new ProviderProfileService({ ...baseDeps, ...overrides }),
	}
}

describe("ProviderProfileService profile listing", () => {
	it("returns the entries from contextProxy listApiConfigMeta", () => {
		const h = makeHarness()

		const entries = h.service.getProviderProfileEntries()

		expect(entries).toEqual([expect.objectContaining({ name: "default" })])
	})

	it("returns an empty array when listApiConfigMeta is undefined", () => {
		const h = makeHarness()
		delete h.contextProxy.values.listApiConfigMeta

		expect(h.service.getProviderProfileEntries()).toEqual([])
	})

	it("finds a profile entry by name and reports existence", () => {
		const h = makeHarness()
		h.contextProxy.values.listApiConfigMeta = [
			makeProfileEntry({ name: "alpha" }),
			makeProfileEntry({ name: "beta" }),
		]

		expect(h.service.getProviderProfileEntry("beta")?.name).toBe("beta")
		expect(h.service.getProviderProfileEntry("missing")).toBeUndefined()
		expect(h.service.hasProviderProfileEntry("alpha")).toBe(true)
		expect(h.service.hasProviderProfileEntry("missing")).toBe(false)
	})
})

describe("ProviderProfileService.upsertProviderProfile", () => {
	it("saves the config and activates it (default), setting list/mode/context state", async () => {
		const h = makeHarness()
		const providerSettings: ProviderSettings = { apiProvider: "anthropic", apiModelId: "claude-3-5-sonnet" }

		const id = await h.service.upsertProviderProfile("new-profile", providerSettings)

		expect(id).toBe("new-profile-saved-id")
		expect(h.providerSettingsManager.saveConfig).toHaveBeenCalledWith("new-profile", providerSettings)
		expect(h.providerSettingsManager.setModeConfig).toHaveBeenCalledWith("code", "new-profile-saved-id")
		expect(h.contextProxy.setValue).toHaveBeenCalledWith("currentApiConfigName", "new-profile")
		expect(h.contextProxy.setProviderSettings).toHaveBeenCalledWith(providerSettings)
		expect(h.ports.updateTaskApiHandlerIfNeeded).toHaveBeenCalledWith(providerSettings, { forceRebuild: true })
		expect(h.ports.postStateToWebview).toHaveBeenCalledTimes(1)
	})

	it("persists the sticky profile to the current task after activation", async () => {
		const h = makeHarness()
		const task = makeTask("task-1")
		h.ports.getCurrentTask.mockReturnValue(task)
		h.ports.getTaskHistoryItem.mockReturnValue(makeHistoryItem({ id: "task-1", task: "Task" }))

		await h.service.upsertProviderProfile("new-profile", { apiProvider: "anthropic" } satisfies ProviderSettings)

		expect(task.setTaskApiConfigName).toHaveBeenCalledWith("new-profile")
		expect(h.ports.updateTaskHistory).toHaveBeenCalledWith(
			expect.objectContaining({ id: "task-1", apiConfigName: "new-profile" }),
		)
	})

	it("only refreshes the list when activate is false (no sticky persistence)", async () => {
		const h = makeHarness()
		h.ports.getCurrentTask.mockReturnValue(makeTask("task-1"))

		const id = await h.service.upsertProviderProfile(
			"new-profile",
			{ apiProvider: "anthropic" } satisfies ProviderSettings,
			false,
		)

		expect(id).toBe("new-profile-saved-id")
		expect(h.providerSettingsManager.setModeConfig).not.toHaveBeenCalled()
		expect(h.contextProxy.setValue).not.toHaveBeenCalledWith("currentApiConfigName", "new-profile")
		expect(h.ports.updateTaskHistory).not.toHaveBeenCalled()
		expect(h.ports.postStateToWebview).toHaveBeenCalledTimes(1)
	})

	it("returns undefined, logs, and shows an error message when saveConfig rejects", async () => {
		const h = makeHarness()
		const error = new Error("boom")
		h.providerSettingsManager.saveConfig.mockRejectedValue(error)

		const id = await h.service.upsertProviderProfile("new-profile", {
			apiProvider: "anthropic",
		} satisfies ProviderSettings)

		expect(id).toBeUndefined()
		expect(h.ports.log).toHaveBeenCalledWith(expect.stringContaining("Error create new api configuration"))
		expect(vscode.window.showErrorMessage).toHaveBeenCalled()
		expect(h.ports.postStateToWebview).not.toHaveBeenCalled()
	})
})

describe("ProviderProfileService.deleteProviderProfile", () => {
	it("throws 'You cannot delete the last profile' when deleting the only profile", async () => {
		const h = makeHarness()
		h.contextProxy.values.currentApiConfigName = "default"
		h.contextProxy.values.listApiConfigMeta = [makeProfileEntry({ name: "default" })]

		await expect(h.service.deleteProviderProfile(makeProfileEntry({ name: "default" }))).rejects.toThrow(
			"You cannot delete the last profile",
		)
	})

	it("deletes the profile and activates a fallback when the current profile is removed", async () => {
		const h = makeHarness()
		h.contextProxy.values.currentApiConfigName = "alpha"
		h.contextProxy.values.listApiConfigMeta = [
			makeProfileEntry({ name: "alpha" }),
			makeProfileEntry({ name: "beta", apiProvider: "openrouter" }),
		]

		await h.service.deleteProviderProfile(makeProfileEntry({ name: "alpha" }))

		expect(h.contextProxy.setValues).toHaveBeenCalledWith(
			expect.objectContaining({
				currentApiConfigName: "beta",
				listApiConfigMeta: [expect.objectContaining({ name: "beta" })],
			}),
		)
		expect(h.ports.postStateToWebview).toHaveBeenCalledTimes(1)
	})

	it("keeps the current profile when deleting a different profile", async () => {
		const h = makeHarness()
		h.contextProxy.values.currentApiConfigName = "alpha"
		h.contextProxy.values.listApiConfigMeta = [
			makeProfileEntry({ name: "alpha" }),
			makeProfileEntry({ name: "beta" }),
		]

		await h.service.deleteProviderProfile(makeProfileEntry({ name: "beta" }))

		expect(h.contextProxy.setValues).toHaveBeenCalledWith(
			expect.objectContaining({ currentApiConfigName: "alpha" }),
		)
	})
})

describe("ProviderProfileService.activateProviderProfile", () => {
	it("activates the profile and persists mode + task history by default", async () => {
		const h = makeHarness()
		h.providerSettingsManager.activateProfile.mockResolvedValue({
			name: "new-profile",
			id: "new-id",
			apiProvider: "anthropic",
		})
		h.ports.getCurrentTask.mockReturnValue(makeTask("task-1"))
		h.ports.getTaskHistoryItem.mockReturnValue(makeHistoryItem({ id: "task-1", task: "Task" }))

		await h.service.activateProviderProfile({ name: "new-profile" })

		expect(h.contextProxy.setValue).toHaveBeenCalledWith("currentApiConfigName", "new-profile")
		expect(h.providerSettingsManager.setModeConfig).toHaveBeenCalledWith("code", "new-id")
		expect(h.ports.updateTaskApiHandlerIfNeeded).toHaveBeenCalled()
		expect(h.ports.updateTaskHistory).toHaveBeenCalledWith(
			expect.objectContaining({ id: "task-1", apiConfigName: "new-profile" }),
		)
		expect(h.ports.postStateToWebview).toHaveBeenCalledTimes(1)
		expect(h.ports.onProviderProfileChanged).toHaveBeenCalledWith({
			name: "new-profile",
			provider: "anthropic",
		})
	})

	it("skips mode persistence and task-history persistence when the flags are false", async () => {
		const h = makeHarness()
		h.providerSettingsManager.activateProfile.mockResolvedValue({
			name: "new-profile",
			id: "new-id",
			apiProvider: "openrouter",
		})

		await h.service.activateProviderProfile(
			{ name: "new-profile" },
			{ persistModeConfig: false, persistTaskHistory: false },
		)

		expect(h.providerSettingsManager.setModeConfig).not.toHaveBeenCalled()
		expect(h.ports.updateTaskHistory).not.toHaveBeenCalled()
		// Event still fires since apiProvider is present.
		expect(h.ports.onProviderProfileChanged).toHaveBeenCalled()
	})

	it("does not emit the event when the profile has no apiProvider", async () => {
		const h = makeHarness()
		h.providerSettingsManager.activateProfile.mockResolvedValue({ name: "empty", id: "empty-id" })

		await h.service.activateProviderProfile({ name: "empty" })

		expect(h.ports.onProviderProfileChanged).not.toHaveBeenCalled()
	})

	it("persists sticky profile from the globalState fallback when the store has no item", async () => {
		const h = makeHarness()
		const task = makeTask("task-9")
		h.ports.getCurrentTask.mockReturnValue(task)
		h.ports.getTaskHistoryItem.mockReturnValue(undefined)
		h.ports.getGlobalTaskHistory.mockReturnValue([makeHistoryItem({ id: "task-9", task: "Legacy task" })])

		await h.service.activateProviderProfile({ name: "new-profile" })

		expect(task.setTaskApiConfigName).toHaveBeenCalledWith("new-profile")
		expect(h.ports.updateTaskHistory).toHaveBeenCalledWith(
			expect.objectContaining({ id: "task-9", apiConfigName: "new-profile" }),
		)
	})

	it("logs and continues when sticky persistence throws", async () => {
		const h = makeHarness()
		const task = makeTask("task-10")
		h.ports.getCurrentTask.mockReturnValue(task)
		h.ports.getTaskHistoryItem.mockReturnValue(makeHistoryItem({ id: "task-10", task: "Task" }))
		h.ports.updateTaskHistory.mockRejectedValue(new Error("disk full"))

		await expect(h.service.activateProviderProfile({ name: "new-profile" })).resolves.not.toThrow()

		expect(h.ports.log).toHaveBeenCalledWith(
			expect.stringContaining("Failed to persist provider profile switch for task task-10"),
		)
		expect(h.ports.postStateToWebview).toHaveBeenCalledTimes(1)
	})
})
