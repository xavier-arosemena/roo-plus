import { z } from "zod"

import { modeConfigSchema } from "../mode.js"
import { todoItemSchema } from "../todo.js"

/**
 * Todo-list and custom-mode management messages.
 *
 * `updateTodoList.payload.todos` reuses `todoItemSchema`; `updateCustomMode`
 * reuses `modeConfigSchema` (the webview already validates new modes against it)
 * and `deleteCustomMode` requires a `slug`.
 */
export const updateTodoListMessageSchema = z.object({
	type: z.literal("updateTodoList"),
	payload: z.object({
		todos: z.array(todoItemSchema),
	}),
})

export const updateCustomModeMessageSchema = z.object({
	type: z.literal("updateCustomMode"),
	slug: z.string(),
	modeConfig: modeConfigSchema,
})

export const deleteCustomModeMessageSchema = z.object({
	type: z.literal("deleteCustomMode"),
	slug: z.string(),
	checkOnly: z.boolean().optional(),
})

/** Discriminated union of the todo/custom-mode domain's fully-typed messages. */
export const customModesMessageSchema = z.discriminatedUnion("type", [
	updateTodoListMessageSchema,
	updateCustomModeMessageSchema,
	deleteCustomModeMessageSchema,
])

export type CustomModesMessage = z.infer<typeof customModesMessageSchema>
