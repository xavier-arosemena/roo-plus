import * as vscode from "vscode"

import { type WebviewMessage } from "@roo-code/types"

import type { ClineProvider } from "../core/webview/ClineProvider"
import { webviewMessageHandler } from "../core/webview/webviewMessageHandler"

/**
 * Test-only command IDs that bridge the e2e suite (apps/vscode-e2e) to the
 * extension host.
 *
 * The public RooCodeAPI deliberately exposes no code-index surface, and the
 * e2e runner cannot import extension internals, so these two commands are the
 * minimal bridge:
 *
 * - {@link CODE_INDEX_TEST_DISPATCH_COMMAND} routes a real `WebviewMessage`
 *   through the production `webviewMessageHandler`, exercising the exact
 *   `saveCodeIndexSettingsAtomic` -> `handleCodeIndexMessages` ->
 *   `CodeIndexManager` -> `SembleProvider` path the webview uses.
 * - {@link CODE_INDEX_TEST_STATUS_COMMAND} returns the live manager status so
 *   the suite can assert the "Indexed" transition without a webview.
 *
 * They are inert unless invoked by their explicit command IDs and carry no
 * production behavior; the `roo-plus.testing.` prefix keeps them out of any
 * user-facing command palette flow.
 */
export const CODE_INDEX_TEST_DISPATCH_COMMAND = "roo-plus.testing.dispatchCodeIndexMessage"
export const CODE_INDEX_TEST_STATUS_COMMAND = "roo-plus.testing.getCodeIndexStatus"

export function registerCodeIndexTestCommands(provider: ClineProvider): vscode.Disposable[] {
	return [
		vscode.commands.registerCommand(CODE_INDEX_TEST_DISPATCH_COMMAND, (message: WebviewMessage) =>
			webviewMessageHandler(provider, message, undefined),
		),
		vscode.commands.registerCommand(CODE_INDEX_TEST_STATUS_COMMAND, () => {
			const manager = provider.getCurrentWorkspaceCodeIndexManager()
			return manager ? manager.getCurrentStatus() : undefined
		}),
	]
}
