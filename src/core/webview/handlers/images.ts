import * as vscode from "vscode"
import * as os from "os"
import * as path from "path"
import { type WebviewMessage, type WebviewMessageType } from "@roo-code/types"

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
		case "selectImages":
			const images = await selectImages()
			await provider.postMessageToWebview({
				type: "selectedImages",
				images,
				context: message.context,
				messageTs: message.messageTs,
			})
			break
		case "saveImage":
			if (message.dataUri) {
				const matches = message.dataUri.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/)
				if (!matches) {
					// Let saveImage handle invalid URI error
					await saveImage(message.dataUri, vscode.Uri.file(""))
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

				const savedUri = await saveImage(message.dataUri, defaultUri)

				if (savedUri) {
					await saveLastExportPath(provider.contextProxy, "lastImageSavePath", savedUri)
				}
			}
			break
		case "openImage":
			await openImage(message.text!, { values: message.values })
			break
	}
}
