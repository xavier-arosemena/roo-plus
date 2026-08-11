import { z } from "zod"

/**
 * Command allow/deny messages (security-critical).
 *
 * The webview posts these with the array of command prefixes to allow/deny for
 * auto-approval. Once registered, the boundary rejects any message whose
 * `commands` is not an array of strings — a crafted non-array payload can no
 * longer reach the handler.
 */
export const allowedCommandsMessageSchema = z.object({
	type: z.literal("allowedCommands"),
	commands: z.array(z.string()),
})

export const deniedCommandsMessageSchema = z.object({
	type: z.literal("deniedCommands"),
	commands: z.array(z.string()),
})

/** Discriminated union of the command allow/deny domain's fully-typed messages. */
export const commandsMessageSchema = z.discriminatedUnion("type", [
	allowedCommandsMessageSchema,
	deniedCommandsMessageSchema,
])

export type CommandsMessage = z.infer<typeof commandsMessageSchema>

/**
 * Command-FILE management messages (S1 sub-task 7).
 *
 * The webview drives slash-command management (list/open/delete/create) with a
 * distinct set of messages from the allow/deny pair above. `deleteCommand` /
 * `createCommand` carry their `source` under the `values` record, which the
 * previous handler read with a `message.values?.source as "global" | "project"`
 * cast. The fields are precisely known from the handler guards
 * (`src/core/webview/handlers/commands.ts`), so `values` is modeled as a typed
 * object (NOT `z.unknown()`): an invalid `source` enum value is rejected at the
 * boundary and the handler cast is removed.
 *
 * `text` and `values.source` stay OPTIONAL here — presence is still validated
 * inside the handler (`if (message.text)`, `if (message.text &&
 * message.values?.source)`, `if (!source)`), matching the `WebviewMessage`
 * interface fields and the handler guards.
 */

/** `source` for command-file operations: global (`~/.roo/commands`) or project (workspace `.roo/commands`). */
const commandSourceSchema = z.enum(["global", "project"])

/** `values` shape for command-file operations (create/delete/open). */
const commandFileValuesSchema = z.object({
	source: commandSourceSchema.optional(),
})

/** Request the full list of discovered commands (empty payload). */
export const requestCommandsMessageSchema = z.object({
	type: z.literal("requestCommands"),
})

/** Open a command's markdown file by name (`text` is the command name). */
export const openCommandFileMessageSchema = z.object({
	type: z.literal("openCommandFile"),
	text: z.string().optional(),
	values: commandFileValuesSchema.optional(),
})

/** Delete a command's markdown file by name + source. */
export const deleteCommandMessageSchema = z.object({
	type: z.literal("deleteCommand"),
	text: z.string().optional(),
	values: commandFileValuesSchema.optional(),
})

/** Create a command markdown file; `text` is the custom filename, `values.source` selects the directory. */
export const createCommandMessageSchema = z.object({
	type: z.literal("createCommand"),
	text: z.string().optional(),
	values: commandFileValuesSchema.optional(),
})

/** Discriminated union of the command-file management domain's fully-typed messages. */
export const commandFilesMessageSchema = z.discriminatedUnion("type", [
	requestCommandsMessageSchema,
	openCommandFileMessageSchema,
	deleteCommandMessageSchema,
	createCommandMessageSchema,
])

export type CommandFilesMessage = z.infer<typeof commandFilesMessageSchema>
export type CommandFileValues = z.infer<typeof commandFileValuesSchema>
