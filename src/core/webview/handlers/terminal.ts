import * as vscode from "vscode"
import { type WebviewMessage, type WebviewMessageType } from "@roo-code/types"

import { Terminal } from "../../../integrations/terminal/Terminal"
import type { ClineProvider } from "../ClineProvider"
import type { MarketplaceManager } from "../../../services/marketplace"

export const terminalMessageTypes: ReadonlySet<WebviewMessageType> = new Set([
	"openTerminalProfilePicker",
	"requestTerminalProfiles",
	"terminalOperation",
])

export async function handleTerminalMessages(
	provider: Pick<ClineProvider, "getCurrentTask" | "postMessageToWebview">,
	_marketplaceManager: MarketplaceManager | undefined,
	message: WebviewMessage,
): Promise<void> {
	switch (message.type) {
		case "terminalOperation":
			if (message.terminalOperation) {
				await provider.getCurrentTask()?.handleTerminalOperation(message.terminalOperation)
			}
			break
		case "openTerminalProfilePicker": {
			// Open VS Code's native terminal profile picker so the user can set the
			// default shell without leaving VS Code's own settings UI.
			await vscode.commands.executeCommand("workbench.action.terminal.selectDefaultShell")
			break
		}
		case "requestTerminalProfiles": {
			// Allowlisted request: read VS Code's terminal profiles server-side and
			// return only the sanitized profile names. The terminal profile dropdown
			// only needs names, so this avoids routing it through the generic
			// `getVSCodeSetting` handler (which reads any key the webview supplies).
			// Only profiles with a resolvable `path` are returned — source-only
			// profiles (e.g. { source: "PowerShell" }) cannot be mapped to a shell
			// binary by an extension and would silently fall back to the default.
			try {
				await provider.postMessageToWebview({
					type: "terminalProfiles",
					profiles: Terminal.getAvailableProfileNames(),
				})
			} catch (error) {
				console.error("Failed to get terminal profiles:", error)
				await provider.postMessageToWebview({ type: "terminalProfiles", profiles: [] })
			}

			break
		}
	}
}
