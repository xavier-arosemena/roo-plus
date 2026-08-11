import { z } from "zod"

/**
 * Chat-domain messages.
 *
 * These cover the interactive conversation surface: responding to an in-flight
 * ask (`askResponse`), deleting/editing/confirming message mutations
 * (`deleteMessage`, `submitEditedMessage`, `deleteMessageConfirm`,
 * `editMessageConfirm`), enhancing a prompt (`enhancePrompt`), TTS controls
 * (`ttsEnabled`, `ttsSpeed`, `playTts`, `stopTts`) and the completion
 * checkpoint actions (`completionCheckpointDiff`, `completionCheckpointRestore`).
 *
 * All payload fields stay OPTIONAL to match the `WebviewMessage` interface and
 * the handler guards (e.g. `deleteMessage`/`submitEditedMessage` guard on
 * `value`, `editMessageConfirm` guards on `messageTs && text`, `enhancePrompt`
 * and `playTts` guard on `text`, `ttsEnabled`/`ttsSpeed` fall back to
 * `true`/`1.0`). The single exception is `askResponse`: every sender (webview
 * ChatView, CLI agent, tests) provides it, so it is REQUIRED — this lets the
 * handler drop the former `message.askResponse!` non-null assertion.
 */

/** The four possible answers a user can give to an in-flight ask. */
export const clineAskResponseSchema = z.enum([
	"yesButtonClicked",
	"noButtonClicked",
	"messageResponse",
	"objectResponse",
])

/** Respond to the active ask. `askResponse` is REQUIRED (every sender provides it). */
export const askResponseMessageSchema = z.object({
	type: z.literal("askResponse"),
	text: z.string().optional(),
	images: z.array(z.string()).optional(),
	askResponse: clineAskResponseSchema,
})

/** View the checkpoint diff at task completion (empty payload). */
export const completionCheckpointDiffMessageSchema = z.object({
	type: z.literal("completionCheckpointDiff"),
})

/** Restore the checkpoint at task completion (empty payload). */
export const completionCheckpointRestoreMessageSchema = z.object({
	type: z.literal("completionCheckpointRestore"),
})

/** Delete a message (opens the confirmation dialog). `value` is the message timestamp. */
export const deleteMessageMessageSchema = z.object({
	type: z.literal("deleteMessage"),
	value: z.number().optional(),
})

/** Submit an edited message (opens the edit confirmation dialog). */
export const submitEditedMessageMessageSchema = z.object({
	type: z.literal("submitEditedMessage"),
	value: z.number().optional(),
	editedMessageContent: z.string().optional(),
	images: z.array(z.string()).optional(),
})

/** Confirm message deletion from the dialog. `messageTs` is the message timestamp. */
export const deleteMessageConfirmMessageSchema = z.object({
	type: z.literal("deleteMessageConfirm"),
	messageTs: z.number().optional(),
	restoreCheckpoint: z.boolean().optional(),
})

/** Confirm message editing from the dialog. */
export const editMessageConfirmMessageSchema = z.object({
	type: z.literal("editMessageConfirm"),
	messageTs: z.number().optional(),
	text: z.string().optional(),
	images: z.array(z.string()).optional(),
	restoreCheckpoint: z.boolean().optional(),
})

/** Enhance a prompt via the configured enhancement API. */
export const enhancePromptMessageSchema = z.object({
	type: z.literal("enhancePrompt"),
	text: z.string().optional(),
})

/** Toggle TTS enabled (defaults to `true` in the handler when absent). */
export const ttsEnabledMessageSchema = z.object({
	type: z.literal("ttsEnabled"),
	bool: z.boolean().optional(),
})

/** Set the TTS speed (defaults to `1.0` in the handler when absent). */
export const ttsSpeedMessageSchema = z.object({
	type: z.literal("ttsSpeed"),
	value: z.number().optional(),
})

/** Speak the given text via TTS. */
export const playTtsMessageSchema = z.object({
	type: z.literal("playTts"),
	text: z.string().optional(),
})

/** Stop any in-flight TTS playback (empty payload). */
export const stopTtsMessageSchema = z.object({
	type: z.literal("stopTts"),
})

/** Discriminated union of the chat domain's fully-typed messages. */
export const chatMessageSchema = z.discriminatedUnion("type", [
	askResponseMessageSchema,
	completionCheckpointDiffMessageSchema,
	completionCheckpointRestoreMessageSchema,
	deleteMessageMessageSchema,
	submitEditedMessageMessageSchema,
	deleteMessageConfirmMessageSchema,
	editMessageConfirmMessageSchema,
	enhancePromptMessageSchema,
	ttsEnabledMessageSchema,
	ttsSpeedMessageSchema,
	playTtsMessageSchema,
	stopTtsMessageSchema,
])

export type ChatMessage = z.infer<typeof chatMessageSchema>
