import * as vscode from "vscode"
import * as os from "os"
import * as path from "path"
import * as fs from "fs/promises"
import { type WebviewMessage, type WebviewMessageType } from "@roo-code/types"

import { fileExistsAtPath } from "../../../utils/fs"
import { generateErrorDiagnostics } from "../diagnosticsHandler"
import type { ClineProvider } from "../ClineProvider"
import type { MarketplaceManager } from "../../../services/marketplace"

export const debugMessageTypes: ReadonlySet<WebviewMessageType> = new Set([
	"downloadErrorDiagnostics",
	"openDebugApiHistory",
	"openDebugUiHistory",
])

export async function handleDebugMessages(
	provider: Pick<ClineProvider, "getCurrentTask" | "contextProxy" | "log">,
	_marketplaceManager: MarketplaceManager | undefined,
	message: WebviewMessage,
): Promise<void> {
	switch (message.type) {
		case "openDebugApiHistory":
		case "openDebugUiHistory": {
			const currentTask = provider.getCurrentTask()
			if (!currentTask) {
				vscode.window.showErrorMessage("No active task to view history for")
				break
			}

			try {
				const { getTaskDirectoryPath } = await import("../../../utils/storage")
				const globalStoragePath = provider.contextProxy.globalStorageUri.fsPath
				const taskDirPath = await getTaskDirectoryPath(globalStoragePath, currentTask.taskId)

				const fileName =
					message.type === "openDebugApiHistory" ? "api_conversation_history.json" : "ui_messages.json"
				const sourceFilePath = path.join(taskDirPath, fileName)

				// Check if file exists
				if (!(await fileExistsAtPath(sourceFilePath))) {
					vscode.window.showErrorMessage(`File not found: ${fileName}`)
					break
				}

				// Read the source file
				const content = await fs.readFile(sourceFilePath, "utf8")
				let jsonContent: unknown

				try {
					jsonContent = JSON.parse(content)
				} catch {
					vscode.window.showErrorMessage(`Failed to parse ${fileName}`)
					break
				}

				// Prettify the JSON
				const prettifiedContent = JSON.stringify(jsonContent, null, 2)

				// Create a private temporary directory (mode 0700) so the temp
				// file is not written with a predictable name into the shared
				// os.tmpdir(). mkdtemp creates a unique directory atomically,
				// avoiding insecure temp-file creation and symlink attacks.
				const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "roo-debug-"))
				const tempFileName = `${message.type === "openDebugApiHistory" ? "api" : "ui"}_conversation_history.json`
				const tempFilePath = path.join(tmpDir, tempFileName)

				await fs.writeFile(tempFilePath, prettifiedContent, { encoding: "utf8", mode: 0o600 })

				// Open the temp file in VS Code
				const doc = await vscode.workspace.openTextDocument(tempFilePath)
				await vscode.window.showTextDocument(doc, { preview: true })
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				provider.log(`Error opening debug history: ${errorMessage}`)
				vscode.window.showErrorMessage(`Failed to open debug history: ${errorMessage}`)
			}
			break
		}

		case "downloadErrorDiagnostics": {
			const currentTask = provider.getCurrentTask()
			if (!currentTask) {
				vscode.window.showErrorMessage("No active task to generate diagnostics for")
				break
			}

			await generateErrorDiagnostics({
				taskId: currentTask.taskId,
				globalStoragePath: provider.contextProxy.globalStorageUri.fsPath,
				values: message.values,
				log: (msg) => provider.log(msg),
			})
			break
		}
	}
}
