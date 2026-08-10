import { z } from "zod"

/**
 * Outbound file read result message.
 *
 * Matches the `fileContent` field on the flat `ExtensionMessage` interface
 * (`packages/types/src/vscode-extension-host.ts`): `content` is `null` when the
 * read failed, in which case `error` may carry the reason.
 */
export const fileContentMessageSchema = z.object({
	type: z.literal("fileContent"),
	fileContent: z.object({
		path: z.string(),
		content: z.string().nullable(),
		error: z.string().optional(),
	}),
})

export type FileContentMessage = z.infer<typeof fileContentMessageSchema>
