import { z } from "zod"

import { queuedMessageSchema } from "../message.js"

/**
 * Chat message queue messages (user-message content + image handling).
 *
 * `editQueuedMessage.payload` reuses `queuedMessageSchema.pick(...)` so the
 * payload type is derived from the single source of truth (`QueuedMessage`).
 */
export const queueMessageMessageSchema = z.object({
	type: z.literal("queueMessage"),
	text: z.string(),
	images: z.array(z.string()).optional(),
})

export const removeQueuedMessageMessageSchema = z.object({
	type: z.literal("removeQueuedMessage"),
	text: z.string(),
})

export const editQueuedMessageMessageSchema = z.object({
	type: z.literal("editQueuedMessage"),
	payload: queuedMessageSchema.pick({ id: true, text: true, images: true }),
})

/** Discriminated union of the message-queue domain's fully-typed messages. */
export const messageQueueMessageSchema = z.discriminatedUnion("type", [
	queueMessageMessageSchema,
	removeQueuedMessageMessageSchema,
	editQueuedMessageMessageSchema,
])

export type MessageQueueMessage = z.infer<typeof messageQueueMessageSchema>
