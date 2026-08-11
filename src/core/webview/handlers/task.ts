import * as vscode from "vscode"
import {
	type WebviewMessage,
	type WebviewMessageType,
	abandonSubtaskWithIdMessageSchema,
	condenseTaskContextRequestMessageSchema,
	copySystemPromptMessageSchema,
	deleteMultipleTasksWithIdsMessageSchema,
	deleteTaskWithIdMessageSchema,
	exportTaskWithIdMessageSchema,
	getSystemPromptMessageSchema,
	getTaskWithAggregatedCostsMessageSchema,
	newTaskMessageSchema,
	searchCommitsMessageSchema,
	showTaskWithIdMessageSchema,
	updateTodoListMessageSchema,
} from "@roo-code/types"

import { generateSystemPrompt } from "../generateSystemPrompt"
import { setPendingTodoList } from "../../tools/UpdateTodoListTool"
import { searchCommits } from "../../../utils/git"
import { t } from "../../../i18n"
import type { ClineProvider } from "../ClineProvider"
import type { MarketplaceManager } from "../../../services/marketplace"
import { getCurrentCwd, resolveIncomingImages } from "./shared"

export const taskMessageTypes: ReadonlySet<WebviewMessageType> = new Set([
	"abandonSubtaskWithId",
	"cancelAutoApproval",
	"cancelTask",
	"clearTask",
	"condenseTaskContextRequest",
	"copySystemPrompt",
	"deleteMultipleTasksWithIds",
	"deleteTaskWithId",
	"exportCurrentTask",
	"exportTaskWithId",
	"getSystemPrompt",
	"getTaskWithAggregatedCosts",
	"newTask",
	"searchCommits",
	"shareCurrentTask",
	"showTaskWithId",
	"updateTodoList",
])

export async function handleTaskMessages(
	provider: Pick<
		ClineProvider,
		| "getCurrentTask"
		| "getState"
		| "cwd"
		| "createTask"
		| "postMessageToWebview"
		| "clearTask"
		| "postStateToWebview"
		| "exportTaskWithId"
		| "showTaskWithId"
		| "condenseTaskContext"
		| "deleteTaskWithId"
		| "abandonSubtask"
		| "log"
		| "getTaskWithAggregatedCosts"
		| "cancelTask"
		| "customModesManager"
		| "context"
		| "getMcpHub"
		| "getSkillsManager"
	>,
	_marketplaceManager: MarketplaceManager | undefined,
	message: WebviewMessage,
): Promise<void> {
	switch (message.type) {
		case "newTask": {
			const result = newTaskMessageSchema.safeParse(message)

			if (!result.success) {
				provider.log(`[webviewMessageHandler] Rejected malformed newTask message: ${result.error.message}`)
				break
			}

			const { text, images, taskId, taskConfiguration } = result.data
			// Initializing new instance of Cline will make sure that any
			// agentically running promises in old instance don't affect our new
			// task. This essentially creates a fresh slate for the new task.
			try {
				const resolved = await resolveIncomingImages(provider, {
					text,
					images,
				})
				await provider.createTask(resolved.text, resolved.images, undefined, { taskId }, taskConfiguration)
				// Task created successfully - notify the UI to reset
				await provider.postMessageToWebview({ type: "invoke", invoke: "newChat" })
			} catch (error) {
				// For all errors, reset the UI and show error
				await provider.postMessageToWebview({ type: "invoke", invoke: "newChat" })
				// Show error to user
				vscode.window.showErrorMessage(
					`Failed to create task: ${error instanceof Error ? error.message : String(error)}`,
				)
			}
			break
		}
		case "clearTask":
			// Clear task resets the current session. Delegation flows are
			// handled via metadata; parent resumption occurs through
			// reopenParentFromDelegation, not via finishSubTask.
			await provider.clearTask()
			await provider.postStateToWebview()
			break
		case "exportCurrentTask":
			const currentTaskId = provider.getCurrentTask()?.taskId
			if (currentTaskId) {
				await provider.exportTaskWithId(currentTaskId)
			}
			break
		case "shareCurrentTask":
			const shareTaskId = provider.getCurrentTask()?.taskId

			if (!shareTaskId) {
				vscode.window.showErrorMessage(t("common:errors.share_no_active_task"))
				break
			}

			vscode.window.showErrorMessage(t("common:errors.share_not_enabled"))
			break
		case "showTaskWithId": {
			const result = showTaskWithIdMessageSchema.safeParse(message)

			if (!result.success) {
				provider.log(
					`[webviewMessageHandler] Rejected malformed showTaskWithId message: ${result.error.message}`,
				)
				break
			}

			await provider.showTaskWithId(result.data.text)
			break
		}
		case "condenseTaskContextRequest": {
			const result = condenseTaskContextRequestMessageSchema.safeParse(message)

			if (!result.success) {
				provider.log(
					`[webviewMessageHandler] Rejected malformed condenseTaskContextRequest message: ${result.error.message}`,
				)
				break
			}

			await provider.condenseTaskContext(result.data.text)
			break
		}
		case "deleteTaskWithId": {
			const result = deleteTaskWithIdMessageSchema.safeParse(message)

			if (!result.success) {
				provider.log(
					`[webviewMessageHandler] Rejected malformed deleteTaskWithId message: ${result.error.message}`,
				)
				break
			}

			await provider.deleteTaskWithId(result.data.text)
			break
		}
		case "abandonSubtaskWithId": {
			const result = abandonSubtaskWithIdMessageSchema.safeParse(message)

			if (!result.success) {
				provider.log(
					`[webviewMessageHandler] Rejected malformed abandonSubtaskWithId message: ${result.error.message}`,
				)
				break
			}

			provider
				.abandonSubtask(result.data.text)
				.catch((error) =>
					provider.log(
						`[abandonSubtaskWithId] Failed: ${error instanceof Error ? error.message : String(error)}`,
					),
				)
			break
		}
		case "deleteMultipleTasksWithIds": {
			const result = deleteMultipleTasksWithIdsMessageSchema.safeParse(message)

			if (!result.success) {
				provider.log(
					`[webviewMessageHandler] Rejected malformed deleteMultipleTasksWithIds message: ${result.error.message}`,
				)
				break
			}

			const ids = result.data.ids

			// Process in batches of 20 (or another reasonable number)
			const batchSize = 20
			const results = []

			// Only log start and end of the operation
			console.log(`Batch deletion started: ${ids.length} tasks total`)

			for (let i = 0; i < ids.length; i += batchSize) {
				const batch = ids.slice(i, i + batchSize)

				const batchPromises = batch.map(async (id) => {
					try {
						await provider.deleteTaskWithId(id)
						return { id, success: true }
					} catch (error) {
						// Keep error logging for debugging purposes
						console.log(
							`Failed to delete task ${id}: ${error instanceof Error ? error.message : String(error)}`,
						)
						return { id, success: false }
					}
				})

				// Process each batch in parallel but wait for completion before starting the next batch
				const batchResults = await Promise.all(batchPromises)
				results.push(...batchResults)

				// Update the UI after each batch to show progress
				await provider.postStateToWebview()
			}

			// Log final results
			const successCount = results.filter((r) => r.success).length
			const failCount = results.length - successCount
			console.log(
				`Batch deletion completed: ${successCount}/${ids.length} tasks successful, ${failCount} tasks failed`,
			)
			break
		}
		case "exportTaskWithId": {
			const result = exportTaskWithIdMessageSchema.safeParse(message)

			if (!result.success) {
				provider.log(
					`[webviewMessageHandler] Rejected malformed exportTaskWithId message: ${result.error.message}`,
				)
				break
			}

			await provider.exportTaskWithId(result.data.text)
			break
		}
		case "getTaskWithAggregatedCosts": {
			const result = getTaskWithAggregatedCostsMessageSchema.safeParse(message)

			if (!result.success) {
				provider.log(
					`[webviewMessageHandler] Rejected malformed getTaskWithAggregatedCosts message: ${result.error.message}`,
				)
				break
			}

			try {
				const taskId = result.data.text
				const resultData = await provider.getTaskWithAggregatedCosts(taskId)
				await provider.postMessageToWebview({
					type: "taskWithAggregatedCosts",
					// IMPORTANT: ChatView stores aggregatedCostsMap keyed by message.text (taskId)
					// so we must include it here.
					text: taskId,
					historyItem: resultData.historyItem,
					aggregatedCosts: resultData.aggregatedCosts,
				})
			} catch (error) {
				console.error("Error getting task with aggregated costs:", error)
				await provider.postMessageToWebview({
					type: "taskWithAggregatedCosts",
					// Include taskId when available for correlation in UI logs.
					text: result.data.text,
					error: error instanceof Error ? error.message : String(error),
				})
			}
			break
		}
		case "cancelTask":
			await provider.cancelTask()
			break
		case "cancelAutoApproval":
			// Cancel any pending auto-approval timeout for the current task
			provider.getCurrentTask()?.cancelAutoApprovalTimeout()
			break
		case "getSystemPrompt": {
			const result = getSystemPromptMessageSchema.safeParse(message)

			if (!result.success) {
				provider.log(
					`[webviewMessageHandler] Rejected malformed getSystemPrompt message: ${result.error.message}`,
				)
				break
			}

			try {
				const systemPrompt = await generateSystemPrompt(provider, result.data)

				await provider.postMessageToWebview({
					type: "systemPrompt",
					text: systemPrompt,
					mode: result.data.mode,
				})
			} catch (error) {
				provider.log(
					`Error getting system prompt:  ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
				)
				vscode.window.showErrorMessage(t("common:errors.get_system_prompt"))
			}
			break
		}
		case "copySystemPrompt": {
			const result = copySystemPromptMessageSchema.safeParse(message)

			if (!result.success) {
				provider.log(
					`[webviewMessageHandler] Rejected malformed copySystemPrompt message: ${result.error.message}`,
				)
				break
			}

			try {
				const systemPrompt = await generateSystemPrompt(provider, result.data)

				await vscode.env.clipboard.writeText(systemPrompt)
				await vscode.window.showInformationMessage(t("common:info.clipboard_copy"))
			} catch (error) {
				provider.log(
					`Error getting system prompt:  ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
				)
				vscode.window.showErrorMessage(t("common:errors.get_system_prompt"))
			}
			break
		}
		case "searchCommits": {
			const result = searchCommitsMessageSchema.safeParse(message)

			if (!result.success) {
				provider.log(
					`[webviewMessageHandler] Rejected malformed searchCommits message: ${result.error.message}`,
				)
				break
			}

			const cwd = getCurrentCwd(provider)
			if (cwd) {
				try {
					const commits = await searchCommits(result.data.query || "", cwd)
					await provider.postMessageToWebview({
						type: "commitSearchResults",
						commits,
					})
				} catch (error) {
					provider.log(
						`Error searching commits: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
					)
					vscode.window.showErrorMessage(t("common:errors.search_commits"))
				}
			}
			break
		}
		case "updateTodoList": {
			const result = updateTodoListMessageSchema.safeParse(message)

			if (!result.success) {
				provider.log(
					`[webviewMessageHandler] Rejected malformed updateTodoList message: ${result.error.message}`,
				)
				break
			}

			const m = result.data
			await setPendingTodoList(m.payload.todos)
			break
		}
	}
}
