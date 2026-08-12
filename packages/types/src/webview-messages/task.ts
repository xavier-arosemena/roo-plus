import { z } from "zod"

import { rooCodeSettingsSchema } from "../global-settings.js"

/**
 * Task-domain messages.
 *
 * The webview drives the task lifecycle: creating/clearing a task, showing,
 * condensing, deleting, exporting and sharing tasks, cancelling execution,
 * previewing/copying the system prompt and searching commit history.
 *
 * The REQUIRED-field types (`showTaskWithId`, `condenseTaskContextRequest`,
 * `deleteTaskWithId`, `abandonSubtaskWithId`, `deleteMultipleTasksWithIds`,
 * `exportTaskWithId`, `getTaskWithAggregatedCosts`) carry `text`/`ids` that the
 * handler previously accessed with `message.text!` (or threw "Task ID is
 * required" when absent). Making them REQUIRED lets the handler drop the
 * non-null assertions — a crafted message missing the payload is rejected at
 * the boundary instead of reaching the handler.
 */

/** Start a new task. All fields optional — `text`/`images`/`taskId`/`taskConfiguration` are forwarded to `createTask`. */
export const newTaskMessageSchema = z.object({
	type: z.literal("newTask"),
	text: z.string().optional(),
	images: z.array(z.string()).optional(),
	taskId: z.string().optional(),
	/** Task configuration applied via `createTask()`. */
	taskConfiguration: rooCodeSettingsSchema.optional(),
})

/** Clear the current task session (empty payload). */
export const clearTaskMessageSchema = z.object({
	type: z.literal("clearTask"),
})

/** Export the current task (empty payload — the task id is read from provider state). */
export const exportCurrentTaskMessageSchema = z.object({
	type: z.literal("exportCurrentTask"),
})

/** Share the current task (empty payload). */
export const shareCurrentTaskMessageSchema = z.object({
	type: z.literal("shareCurrentTask"),
})

/** Show a task by id. `text` is REQUIRED (the task id). */
export const showTaskWithIdMessageSchema = z.object({
	type: z.literal("showTaskWithId"),
	text: z.string(),
})

/** Condense the context of a task by id. `text` is REQUIRED (the task id). */
export const condenseTaskContextRequestMessageSchema = z.object({
	type: z.literal("condenseTaskContextRequest"),
	text: z.string(),
})

/** Delete a task by id. `text` is REQUIRED (the task id). */
export const deleteTaskWithIdMessageSchema = z.object({
	type: z.literal("deleteTaskWithId"),
	text: z.string(),
})

/** Abandon a subtask by id. `text` is REQUIRED (the subtask id). */
export const abandonSubtaskWithIdMessageSchema = z.object({
	type: z.literal("abandonSubtaskWithId"),
	text: z.string(),
})

/** Delete multiple tasks by id. `ids` is REQUIRED (the task ids to delete). */
export const deleteMultipleTasksWithIdsMessageSchema = z.object({
	type: z.literal("deleteMultipleTasksWithIds"),
	ids: z.array(z.string()),
})

/** Export a task by id. `text` is REQUIRED (the task id). */
export const exportTaskWithIdMessageSchema = z.object({
	type: z.literal("exportTaskWithId"),
	text: z.string(),
})

/** Fetch a task's aggregated costs by id. `text` is REQUIRED (the task id). */
export const getTaskWithAggregatedCostsMessageSchema = z.object({
	type: z.literal("getTaskWithAggregatedCosts"),
	text: z.string(),
})

/** Cancel the current task (empty payload). */
export const cancelTaskMessageSchema = z.object({
	type: z.literal("cancelTask"),
})

/** Cancel any pending auto-approval timeout (empty payload). */
export const cancelAutoApprovalMessageSchema = z.object({
	type: z.literal("cancelAutoApproval"),
})

/** Preview the system prompt. `mode` optionally overrides the active mode. */
export const getSystemPromptMessageSchema = z.object({
	type: z.literal("getSystemPrompt"),
	mode: z.string().optional(),
})

/** Copy the system prompt to the clipboard. `mode` optionally overrides the active mode. */
export const copySystemPromptMessageSchema = z.object({
	type: z.literal("copySystemPrompt"),
	mode: z.string().optional(),
})

/** Search commit history. `query` is optional (the handler defaults to an empty string). */
export const searchCommitsMessageSchema = z.object({
	type: z.literal("searchCommits"),
	query: z.string().optional(),
})

/** Discriminated union of the task domain's fully-typed messages. */
export const taskMessageSchema = z.discriminatedUnion("type", [
	newTaskMessageSchema,
	clearTaskMessageSchema,
	exportCurrentTaskMessageSchema,
	shareCurrentTaskMessageSchema,
	showTaskWithIdMessageSchema,
	condenseTaskContextRequestMessageSchema,
	deleteTaskWithIdMessageSchema,
	abandonSubtaskWithIdMessageSchema,
	deleteMultipleTasksWithIdsMessageSchema,
	exportTaskWithIdMessageSchema,
	getTaskWithAggregatedCostsMessageSchema,
	cancelTaskMessageSchema,
	cancelAutoApprovalMessageSchema,
	getSystemPromptMessageSchema,
	copySystemPromptMessageSchema,
	searchCommitsMessageSchema,
])

export type TaskMessage = z.infer<typeof taskMessageSchema>
