import * as vscode from "vscode"
import pWaitFor from "p-wait-for"
import {
	type ClineMessage,
	type WebviewMessage,
	type WebviewMessageType,
	checkoutDiffPayloadSchema,
	checkoutRestorePayloadSchema,
	editQueuedMessageMessageSchema,
	getCompletionCheckpoint,
	queueMessageMessageSchema,
	removeQueuedMessageMessageSchema,
} from "@roo-code/types"

import { saveTaskMessages } from "../../task-persistence"
import { type ApiMessage } from "../../task-persistence/apiMessages"
import { handleCheckpointRestoreOperation } from "../checkpointRestoreHandler"
import { MessageEnhancer } from "../messageEnhancer"
import { t } from "../../../i18n"
import { playTts, setTtsEnabled, setTtsSpeed, stopTts } from "../../../utils/tts"
import type { ClineProvider } from "../ClineProvider"
import type { MarketplaceManager } from "../../../services/marketplace"
import { resolveIncomingImages, updateGlobalState } from "./shared"

export const chatMessageTypes: ReadonlySet<WebviewMessageType> = new Set([
	"askResponse",
	"checkpointDiff",
	"checkpointRestore",
	"completionCheckpointDiff",
	"completionCheckpointRestore",
	"deleteMessage",
	"deleteMessageConfirm",
	"editMessageConfirm",
	"editQueuedMessage",
	"enhancePrompt",
	"playTts",
	"queueMessage",
	"removeQueuedMessage",
	"stopTts",
	"submitEditedMessage",
	"ttsEnabled",
	"ttsSpeed",
])

const resolveCompletionCheckpoint = (currentCline: { clineMessages: ClineMessage[] }) => {
	return getCompletionCheckpoint(currentCline.clineMessages)
}

/**
 * Shared utility to find message indices based on timestamp.
 * When multiple messages share the same timestamp (e.g., after condense),
 * this function prefers non-summary messages to ensure user operations
 * target the intended message rather than the summary.
 */
const findMessageIndices = (messageTs: number, currentCline: any) => {
	// Find the exact message by timestamp, not the first one after a cutoff
	const messageIndex = currentCline.clineMessages.findIndex((msg: ClineMessage) => msg.ts === messageTs)

	// Find all matching API messages by timestamp
	const allApiMatches = currentCline.apiConversationHistory
		.map((msg: ApiMessage, idx: number) => ({ msg, idx }))
		.filter(({ msg }: { msg: ApiMessage }) => msg.ts === messageTs)

	// Prefer non-summary message if multiple matches exist (handles timestamp collision after condense)
	const preferred = allApiMatches.find(({ msg }: { msg: ApiMessage }) => !msg.isSummary) || allApiMatches[0]
	const apiConversationHistoryIndex = preferred?.idx ?? -1

	return { messageIndex, apiConversationHistoryIndex }
}

/**
 * Fallback: find first API history index at or after a timestamp.
 * Used when the exact user message isn't present in apiConversationHistory (e.g., after condense).
 */
const findFirstApiIndexAtOrAfter = (ts: number, currentCline: any) => {
	if (typeof ts !== "number") return -1
	return currentCline.apiConversationHistory.findIndex(
		(msg: ApiMessage) => typeof msg?.ts === "number" && (msg.ts as number) >= ts,
	)
}

/**
 * Handles message deletion operations with user confirmation
 */
const handleDeleteOperation = async (
	provider: Pick<ClineProvider, "getCurrentTask" | "postMessageToWebview">,
	messageTs: number,
): Promise<void> => {
	// Check if there's a checkpoint before this message
	const currentCline = provider.getCurrentTask()
	let hasCheckpoint = false

	if (!currentCline) {
		await vscode.window.showErrorMessage(t("common:errors.message.no_active_task_to_delete"))
		return
	}

	const { messageIndex } = findMessageIndices(messageTs, currentCline)

	if (messageIndex !== -1) {
		// Find the last checkpoint before this message
		const checkpoints = currentCline.clineMessages.filter(
			(msg) => msg.say === "checkpoint_saved" && msg.ts > messageTs,
		)
		hasCheckpoint = checkpoints.length > 0
	}

	// Send message to webview to show delete confirmation dialog
	await provider.postMessageToWebview({
		type: "showDeleteMessageDialog",
		messageTs,
		hasCheckpoint,
	})
}

/**
 * Handles confirmed message deletion from webview dialog
 */
const handleDeleteMessageConfirm = async (
	provider: Pick<
		ClineProvider,
		| "getCurrentTask"
		| "contextProxy"
		| "postStateToWebview"
		| "setPendingEditOperation"
		| "getTaskWithId"
		| "createTaskWithHistoryItem"
	>,
	messageTs: number,
	restoreCheckpoint?: boolean,
): Promise<void> => {
	const currentCline = provider.getCurrentTask()
	if (!currentCline) {
		console.error("[handleDeleteMessageConfirm] No current cline available")
		return
	}

	const { messageIndex, apiConversationHistoryIndex } = findMessageIndices(messageTs, currentCline)
	// Determine API truncation index with timestamp fallback if exact match not found
	let apiIndexToUse = apiConversationHistoryIndex
	const tsThreshold = currentCline.clineMessages[messageIndex]?.ts
	if (apiIndexToUse === -1 && typeof tsThreshold === "number") {
		apiIndexToUse = findFirstApiIndexAtOrAfter(tsThreshold, currentCline)
	}

	if (messageIndex === -1) {
		await vscode.window.showErrorMessage(t("common:errors.message.message_not_found", { messageTs }))
		return
	}

	try {
		const targetMessage = currentCline.clineMessages[messageIndex]

		// If checkpoint restoration is requested, find and restore to the last checkpoint before this message
		if (restoreCheckpoint) {
			// Find the last checkpoint before this message
			const checkpoints = currentCline.clineMessages.filter(
				(msg) => msg.say === "checkpoint_saved" && msg.ts > messageTs,
			)

			const nextCheckpoint = checkpoints[0]

			if (nextCheckpoint && nextCheckpoint.text) {
				await handleCheckpointRestoreOperation({
					provider,
					currentCline,
					messageTs: targetMessage.ts!,
					messageIndex,
					checkpoint: { hash: nextCheckpoint.text },
					operation: "delete",
				})
			} else {
				// No checkpoint found before this message
				console.log("[handleDeleteMessageConfirm] No checkpoint found before message")
				vscode.window.showWarningMessage("No checkpoint found before this message")
			}
		} else {
			// For non-checkpoint deletes, preserve checkpoint associations for remaining messages
			// Store checkpoints from messages that will be preserved
			const preservedCheckpoints = new Map<number, any>()
			for (let i = 0; i < messageIndex; i++) {
				const msg = currentCline.clineMessages[i]
				if (msg?.checkpoint && msg.ts) {
					preservedCheckpoints.set(msg.ts, msg.checkpoint)
				}
			}

			// Delete this message and all subsequent messages using MessageManager
			await currentCline.messageManager.rewindToTimestamp(targetMessage.ts!, { includeTargetMessage: false })

			// Restore checkpoint associations for preserved messages
			for (const [ts, checkpoint] of preservedCheckpoints) {
				const msgIndex = currentCline.clineMessages.findIndex((msg) => msg.ts === ts)
				if (msgIndex !== -1) {
					currentCline.clineMessages[msgIndex].checkpoint = checkpoint
				}
			}

			// Save the updated messages with restored checkpoints
			await saveTaskMessages({
				messages: currentCline.clineMessages,
				taskId: currentCline.taskId,
				globalStoragePath: provider.contextProxy.globalStorageUri.fsPath,
			})

			// Update the UI to reflect the deletion
			await provider.postStateToWebview()
		}
	} catch (error) {
		console.error("Error in delete message:", error)
		vscode.window.showErrorMessage(
			t("common:errors.message.error_deleting_message", {
				error: error instanceof Error ? error.message : String(error),
			}),
		)
	}
}

/**
 * Handles message editing operations with user confirmation
 */
const handleEditOperation = async (
	provider: Pick<ClineProvider, "getCurrentTask" | "postMessageToWebview">,
	messageTs: number,
	editedContent: string,
	images?: string[],
): Promise<void> => {
	// Check if there's a checkpoint before this message
	const currentCline = provider.getCurrentTask()
	let hasCheckpoint = false
	if (currentCline) {
		const { messageIndex } = findMessageIndices(messageTs, currentCline)
		if (messageIndex !== -1) {
			// Find the last checkpoint before this message
			const checkpoints = currentCline.clineMessages.filter(
				(msg) => msg.say === "checkpoint_saved" && msg.ts > messageTs,
			)

			hasCheckpoint = checkpoints.length > 0
		} else {
			console.log("[webviewMessageHandler] Edit - Message not found in clineMessages!")
		}
	} else {
		console.log("[webviewMessageHandler] Edit - No currentCline available!")
	}

	// Send message to webview to show edit confirmation dialog
	await provider.postMessageToWebview({
		type: "showEditMessageDialog",
		messageTs,
		text: editedContent,
		hasCheckpoint,
		images,
	})
}

/**
 * Handles confirmed message editing from webview dialog
 */
const handleEditMessageConfirm = async (
	provider: Pick<
		ClineProvider,
		| "getCurrentTask"
		| "contextProxy"
		| "postStateToWebview"
		| "setPendingEditOperation"
		| "getTaskWithId"
		| "createTaskWithHistoryItem"
	>,
	messageTs: number,
	editedContent: string,
	restoreCheckpoint?: boolean,
	images?: string[],
): Promise<void> => {
	const currentCline = provider.getCurrentTask()
	if (!currentCline) {
		console.error("[handleEditMessageConfirm] No current cline available")
		return
	}

	// Use findMessageIndices to find messages based on timestamp
	const { messageIndex, apiConversationHistoryIndex } = findMessageIndices(messageTs, currentCline)

	if (messageIndex === -1) {
		const errorMessage = t("common:errors.message.message_not_found", { messageTs })
		console.error("[handleEditMessageConfirm]", errorMessage)
		await vscode.window.showErrorMessage(errorMessage)
		return
	}

	try {
		const targetMessage = currentCline.clineMessages[messageIndex]

		// If checkpoint restoration is requested, find and restore to the last checkpoint before this message
		if (restoreCheckpoint) {
			// Find the last checkpoint before this message
			const checkpoints = currentCline.clineMessages.filter(
				(msg) => msg.say === "checkpoint_saved" && msg.ts > messageTs,
			)

			const nextCheckpoint = checkpoints[0]

			if (nextCheckpoint && nextCheckpoint.text) {
				await handleCheckpointRestoreOperation({
					provider,
					currentCline,
					messageTs: targetMessage.ts!,
					messageIndex,
					checkpoint: { hash: nextCheckpoint.text },
					operation: "edit",
					editData: {
						editedContent,
						images,
						apiConversationHistoryIndex,
					},
				})
				// The task will be cancelled and reinitialized by checkpointRestore
				// The pending edit will be processed in the reinitialized task
				return
			} else {
				// No checkpoint found before this message
				console.log("[handleEditMessageConfirm] No checkpoint found before message")
				vscode.window.showWarningMessage("No checkpoint found before this message")
				// Continue with non-checkpoint edit
			}
		}

		// For non-checkpoint edits, remove the ORIGINAL user message being edited and all subsequent messages
		// Determine the correct starting index to delete from (prefer the last preceding user_feedback message)
		let deleteFromMessageIndex = messageIndex
		let deleteFromApiIndex = apiConversationHistoryIndex

		// Find the nearest preceding user message to ensure we replace the original, not just the assistant reply
		for (let i = messageIndex; i >= 0; i--) {
			const m = currentCline.clineMessages[i]
			if (m?.say === "user_feedback") {
				deleteFromMessageIndex = i
				// Align API history truncation to the same user message timestamp if present
				const userTs = m.ts
				if (typeof userTs === "number") {
					const apiIdx = currentCline.apiConversationHistory.findIndex((am: ApiMessage) => am.ts === userTs)
					if (apiIdx !== -1) {
						deleteFromApiIndex = apiIdx
					}
				}
				break
			}
		}

		// Timestamp fallback for API history when exact user message isn't present
		if (deleteFromApiIndex === -1) {
			const tsThresholdForEdit = currentCline.clineMessages[deleteFromMessageIndex]?.ts
			if (typeof tsThresholdForEdit === "number") {
				deleteFromApiIndex = findFirstApiIndexAtOrAfter(tsThresholdForEdit, currentCline)
			}
		}

		// Store checkpoints from messages that will be preserved
		const preservedCheckpoints = new Map<number, any>()
		for (let i = 0; i < deleteFromMessageIndex; i++) {
			const msg = currentCline.clineMessages[i]
			if (msg?.checkpoint && msg.ts) {
				preservedCheckpoints.set(msg.ts, msg.checkpoint)
			}
		}

		// Delete the original (user) message and all subsequent messages using MessageManager
		const rewindTs = currentCline.clineMessages[deleteFromMessageIndex]?.ts
		if (rewindTs) {
			await currentCline.messageManager.rewindToTimestamp(rewindTs, { includeTargetMessage: false })
		}

		// Restore checkpoint associations for preserved messages
		for (const [ts, checkpoint] of preservedCheckpoints) {
			const msgIndex = currentCline.clineMessages.findIndex((msg) => msg.ts === ts)
			if (msgIndex !== -1) {
				currentCline.clineMessages[msgIndex].checkpoint = checkpoint
			}
		}

		// Save the updated messages with restored checkpoints
		await saveTaskMessages({
			messages: currentCline.clineMessages,
			taskId: currentCline.taskId,
			globalStoragePath: provider.contextProxy.globalStorageUri.fsPath,
		})

		// Update the UI to reflect the deletion
		await provider.postStateToWebview()

		await currentCline.submitUserMessage(editedContent, images)
	} catch (error) {
		console.error("Error in edit message:", error)
		vscode.window.showErrorMessage(
			t("common:errors.message.error_editing_message", {
				error: error instanceof Error ? error.message : String(error),
			}),
		)
	}
}

/**
 * Handles message modification operations (delete or edit) with confirmation dialog
 * @param messageTs Timestamp of the message to operate on
 * @param operation Type of operation ('delete' or 'edit')
 * @param editedContent New content for edit operations
 * @returns Promise<void>
 */
const handleMessageModificationsOperation = async (
	provider: Pick<ClineProvider, "getCurrentTask" | "postMessageToWebview">,
	messageTs: number,
	operation: "delete" | "edit",
	editedContent?: string,
	images?: string[],
): Promise<void> => {
	if (operation === "delete") {
		await handleDeleteOperation(provider, messageTs)
	} else if (operation === "edit" && editedContent) {
		await handleEditOperation(provider, messageTs, editedContent, images)
	}
}

export async function handleChatMessages(
	provider: Pick<
		ClineProvider,
		| "getCurrentTask"
		| "getState"
		| "cwd"
		| "postMessageToWebview"
		| "postStateToWebview"
		| "contextProxy"
		| "cancelTask"
		| "log"
		| "providerSettingsManager"
		| "setPendingEditOperation"
		| "getTaskWithId"
		| "createTaskWithHistoryItem"
	>,
	_marketplaceManager: MarketplaceManager | undefined,
	message: WebviewMessage,
): Promise<void> {
	switch (message.type) {
		case "askResponse":
			{
				const resolved = await resolveIncomingImages(provider, {
					text: message.text,
					images: message.images,
				})
				provider
					.getCurrentTask()
					?.handleWebviewAskResponse(message.askResponse!, resolved.text, resolved.images)
			}
			break

		case "checkpointDiff":
			const result = checkoutDiffPayloadSchema.safeParse(message.payload)

			if (result.success) {
				await provider.getCurrentTask()?.checkpointDiff(result.data)
			}

			break
		case "checkpointRestore": {
			const result = checkoutRestorePayloadSchema.safeParse(message.payload)

			if (result.success) {
				await provider.cancelTask()

				try {
					await pWaitFor(() => provider.getCurrentTask()?.isInitialized === true, { timeout: 3_000 })
				} catch (error) {
					vscode.window.showErrorMessage(t("common:errors.checkpoint_timeout"))
					return
				}

				try {
					await provider.getCurrentTask()?.checkpointRestore(result.data)
				} catch (error) {
					vscode.window.showErrorMessage(t("common:errors.checkpoint_failed"))
				}
			}

			break
		}
		case "completionCheckpointDiff": {
			const currentCline = provider.getCurrentTask()
			const checkpoint = currentCline ? resolveCompletionCheckpoint(currentCline) : undefined

			if (currentCline && checkpoint) {
				await currentCline.checkpointDiff({
					ts: checkpoint.ts,
					commitHash: checkpoint.commitHash,
					mode: "to-current",
				})
			}

			break
		}
		case "completionCheckpointRestore": {
			const currentCline = provider.getCurrentTask()
			const checkpoint = currentCline ? resolveCompletionCheckpoint(currentCline) : undefined

			if (currentCline && checkpoint) {
				const originalTaskId = currentCline.taskId
				await provider.cancelTask()

				try {
					await pWaitFor(() => provider.getCurrentTask()?.isInitialized === true, { timeout: 3_000 })
				} catch (error) {
					vscode.window.showErrorMessage(t("common:errors.checkpoint_timeout"))
					return
				}

				try {
					const restoredTask = provider.getCurrentTask()

					if (!restoredTask || restoredTask.taskId !== originalTaskId) {
						vscode.window.showErrorMessage(t("common:errors.checkpoint_failed"))
						return
					}

					await restoredTask.checkpointRestore({
						ts: checkpoint.ts,
						commitHash: checkpoint.commitHash,
						mode: "restore",
					})
				} catch (error) {
					console.error("[completionCheckpointRestore] checkpointRestore failed:", error)
					vscode.window.showErrorMessage(t("common:errors.checkpoint_failed"))
				}
			}

			break
		}
		case "deleteMessage": {
			if (!provider.getCurrentTask()) {
				await vscode.window.showErrorMessage(t("common:errors.message.no_active_task_to_delete"))
				break
			}

			if (typeof message.value !== "number" || !message.value) {
				await vscode.window.showErrorMessage(t("common:errors.message.invalid_timestamp_for_deletion"))
				break
			}

			await handleMessageModificationsOperation(provider, message.value, "delete")
			break
		}
		case "submitEditedMessage": {
			if (
				provider.getCurrentTask() &&
				typeof message.value === "number" &&
				message.value &&
				message.editedMessageContent
			) {
				await handleMessageModificationsOperation(
					provider,
					message.value,
					"edit",
					message.editedMessageContent,
					message.images,
				)
			}
			break
		}
		case "deleteMessageConfirm":
			if (!message.messageTs) {
				await vscode.window.showErrorMessage(t("common:errors.message.cannot_delete_missing_timestamp"))
				break
			}

			if (typeof message.messageTs !== "number") {
				await vscode.window.showErrorMessage(t("common:errors.message.cannot_delete_invalid_timestamp"))
				break
			}

			await handleDeleteMessageConfirm(provider, message.messageTs, message.restoreCheckpoint)
			break
		case "editMessageConfirm":
			if (message.messageTs && message.text) {
				const resolved = await resolveIncomingImages(provider, {
					text: message.text,
					images: message.images,
				})
				await handleEditMessageConfirm(
					provider,
					message.messageTs,
					resolved.text,
					message.restoreCheckpoint,
					resolved.images,
				)
			}
			break

		case "enhancePrompt":
			if (message.text) {
				try {
					const state = await provider.getState()

					const {
						apiConfiguration,
						customSupportPrompts,
						listApiConfigMeta = [],
						enhancementApiConfigId,
						includeTaskHistoryInEnhance,
					} = state

					const currentCline = provider.getCurrentTask()

					const result = await MessageEnhancer.enhanceMessage({
						text: message.text,
						apiConfiguration,
						customSupportPrompts,
						listApiConfigMeta,
						enhancementApiConfigId,
						includeTaskHistoryInEnhance,
						currentClineMessages: currentCline?.clineMessages,
						providerSettingsManager: provider.providerSettingsManager,
					})

					if (result.success && result.enhancedText) {
						MessageEnhancer.captureTelemetry(currentCline?.taskId, includeTaskHistoryInEnhance)
						await provider.postMessageToWebview({ type: "enhancedPrompt", text: result.enhancedText })
					} else {
						throw new Error(result.error || "Unknown error")
					}
				} catch (error) {
					provider.log(
						`Error enhancing prompt: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`,
					)

					vscode.window.showErrorMessage(t("common:errors.enhance_prompt"))
					await provider.postMessageToWebview({ type: "enhancedPrompt" })
				}
			}
			break

		case "ttsEnabled":
			const ttsEnabled = message.bool ?? true
			await updateGlobalState(provider, "ttsEnabled", ttsEnabled)
			setTtsEnabled(ttsEnabled)
			await provider.postStateToWebview()
			break
		case "ttsSpeed":
			const ttsSpeed = message.value ?? 1.0
			await updateGlobalState(provider, "ttsSpeed", ttsSpeed)
			setTtsSpeed(ttsSpeed)
			await provider.postStateToWebview()
			break
		case "playTts":
			if (message.text) {
				void playTts(message.text, {
					onStart: () => provider.postMessageToWebview({ type: "ttsStart", text: message.text }),
					onStop: () => provider.postMessageToWebview({ type: "ttsStop", text: message.text }),
				})
			}

			break
		case "stopTts":
			stopTts()
			break

		/**
		 * Chat Message Queue
		 */

		case "queueMessage": {
			const result = queueMessageMessageSchema.safeParse(message)

			if (!result.success) {
				provider.log(`[webviewMessageHandler] Rejected malformed queueMessage message: ${result.error.message}`)
				break
			}

			const m = result.data
			const resolved = await resolveIncomingImages(provider, { text: m.text, images: m.images })
			provider.getCurrentTask()?.messageQueueService.addMessage(resolved.text, resolved.images)
			break
		}
		case "removeQueuedMessage": {
			const result = removeQueuedMessageMessageSchema.safeParse(message)

			if (!result.success) {
				provider.log(
					`[webviewMessageHandler] Rejected malformed removeQueuedMessage message: ${result.error.message}`,
				)
				break
			}

			const m = result.data
			provider.getCurrentTask()?.messageQueueService.removeMessage(m.text)
			break
		}
		case "editQueuedMessage": {
			const result = editQueuedMessageMessageSchema.safeParse(message)

			if (!result.success) {
				provider.log(
					`[webviewMessageHandler] Rejected malformed editQueuedMessage message: ${result.error.message}`,
				)
				break
			}

			const m = result.data
			const { id, text, images } = m.payload
			provider.getCurrentTask()?.messageQueueService.updateMessage(id, text, images)
			break
		}
	}
}
