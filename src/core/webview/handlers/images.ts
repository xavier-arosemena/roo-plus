import * as vscode from "vscode"
import * as os from "os"
import * as path from "path"
import {
	type WebviewMessage,
	type WebviewMessageType,
	openImageMessageSchema,
	saveImageMessageSchema,
	selectImagesMessageSchema,
} from "@roo-code/types"

import { selectImages } from "../../../integrations/misc/process-images"
import { openImage, saveImage } from "../../../integrations/misc/image-handler"
import { resolveDefaultSaveUri, saveLastExportPath } from "../../../utils/export"
import type { ClineProvider } from "../ClineProvider"
import type { MarketplaceManager } from "../../../services/marketplace"

export const imagesMessageTypes: ReadonlySet<WebviewMessageType> = new Set(["openImage", "saveImage", "selectImages"])

export async function handleImagesMessages(
	provider: Pick<ClineProvider, "postMessageToWebview" | "contextProxy">,
	_marketplaceManager: MarketplaceManager | undefined,
	message: WebviewMessage,
): Promise<void> {
	switch (message.type) {
		case "selectImages": {
			// Boundary-validate the payload before use (see the terminal/marketplace
			// handler precedent): a crafted payload is dropped instead of reaching
			// the picker or being echoed back.
			const result = selectImagesMessageSchema.safeParse(message)
			if (result.success) {
				const { context, messageTs } = result.data
				const images = await selectImages()
				await provider.postMessageToWebview({
					type: "selectedImages",
					images,
					context,
					messageTs,
				})
			}
			break
		}
		case "saveImage": {
			const result = saveImageMessageSchema.safeParse(message)
			if (result.success) {
				const { dataUri } = result.data
				// Keep the original guard semantics — the field is optional on the
				// WebviewMessage interface, so only save when present.
				if (dataUri) {
					const matches = dataUri.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/)
					if (!matches) {
						// Let saveImage handle invalid URI error
						await saveImage(dataUri, vscode.Uri.file(""))
						break
					}
					const format = matches[1]
					const defaultFileName = `img_${Date.now()}.${format}`

					const defaultUri = await resolveDefaultSaveUri(
						provider.contextProxy,
						"lastImageSavePath",
						defaultFileName,
						{
							useWorkspace: false,
							fallbackDir: path.join(os.homedir(), "Downloads"),
						},
					)

					const savedUri = await saveImage(dataUri, defaultUri)

					if (savedUri) {
						await saveLastExportPath(provider.contextProxy, "lastImageSavePath", savedUri)
					}
				}
			}
			break
		}
		case "openImage": {
			const result = openImageMessageSchema.safeParse(message)
			if (result.success) {
				const { text, values } = result.data
				// `text` is required by the schema — no non-null assertion needed.
				await openImage(text, { values })
			}
			break
		}
	}
}
