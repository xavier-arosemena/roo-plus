import { z } from "zod"

/**
 * Terminal-domain messages.
 *
 * The webview posts `terminalOperation` to continue/abort the running
 * command/tool, and requests the terminal profile picker / profile list
 * server-side. Registered so a crafted payload (e.g. a non-enum
 * `terminalOperation` or extra junk) is rejected at the boundary instead of
 * passing through structurally. `terminalOperation` stays optional to match the
 * `WebviewMessage` interface field exactly — the sender always provides it, but
 * the guard semantics in the handler (`if (message.terminalOperation)`) rely on
 * it being optional.
 */
export const terminalOperationMessageSchema = z.object({
	type: z.literal("terminalOperation"),
	terminalOperation: z.enum(["continue", "abort"]).optional(),
})

/** Request the sanitized VS Code terminal profile names (empty payload). */
export const requestTerminalProfilesMessageSchema = z.object({
	type: z.literal("requestTerminalProfiles"),
})

/** Open VS Code's native terminal profile picker (empty payload). */
export const openTerminalProfilePickerMessageSchema = z.object({
	type: z.literal("openTerminalProfilePicker"),
})

/** Discriminated union of the terminal domain's fully-typed messages. */
export const terminalMessageSchema = z.discriminatedUnion("type", [
	terminalOperationMessageSchema,
	requestTerminalProfilesMessageSchema,
	openTerminalProfilePickerMessageSchema,
])

export type TerminalMessage = z.infer<typeof terminalMessageSchema>
