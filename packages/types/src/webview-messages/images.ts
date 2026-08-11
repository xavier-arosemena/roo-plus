import { z } from "zod"

/**
 * Images-domain messages.
 *
 * The webview posts `openImage` / `saveImage` to open or save an image in VS
 * Code, and `selectImages` to launch the native multi-select image picker (the
 * selected data URIs are echoed back as a `selectedImages` ExtensionMessage).
 * All three were previously untyped inbound types; registering them lets the
 * boundary reject crafted payloads instead of passing them through
 * structurally.
 */
export const openImageMessageSchema = z.object({
	type: z.literal("openImage"),
	text: z.string(),
	// transitional: `values` is the interface's legacy generic
	// `values?: Record<string, any>` payload. No current sender populates it,
	// but the handler forwards it to the `openImage` helper (which consumes
	// `values.action` for the copy-to-clipboard flow). It must NOT be dropped:
	// zod strips unknown keys, so omitting it here would silently lose the
	// legacy payload at the boundary. Modelled as a free-form record of unknown
	// values; `z.unknown()` is acceptable only here, pending a precise shape.
	values: z.record(z.string(), z.unknown()).optional(),
})

/**
 * Save the current image (as a data URI) to a user-chosen location.
 *
 * `dataUri` stays optional to match the `WebviewMessage` interface field
 * exactly — the sender always provides it, but the handler guard
 * (`if (message.dataUri)`) relies on it being optional.
 */
export const saveImageMessageSchema = z.object({
	type: z.literal("saveImage"),
	dataUri: z.string().optional(),
})

/**
 * Open the native multi-select image picker. The handler echoes `context` and
 * `messageTs` back in its `selectedImages` response so the webview can attach
 * the chosen images to the right message/input.
 */
export const selectImagesMessageSchema = z.object({
	type: z.literal("selectImages"),
	context: z.string().optional(),
	messageTs: z.number().optional(),
})

/** Discriminated union of the images domain's fully-typed messages. */
export const imagesMessageSchema = z.discriminatedUnion("type", [
	openImageMessageSchema,
	saveImageMessageSchema,
	selectImagesMessageSchema,
])

export type ImagesMessage = z.infer<typeof imagesMessageSchema>
