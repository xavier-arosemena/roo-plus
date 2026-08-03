import * as vscode from "vscode"
import { type WebviewMessage, type WebviewMessageType } from "@roo-code/types"

import {
	handleCheckBranchWorktreeInclude,
	handleCheckoutBranch,
	handleCreateWorktree,
	handleCreateWorktreeInclude,
	handleDeleteWorktree,
	handleGetAvailableBranches,
	handleGetWorktreeDefaults,
	handleGetWorktreeIncludeStatus,
	handleListWorktrees,
	handleSwitchWorktree,
} from "../worktree"
import { t } from "../../../i18n"
import type { ClineProvider } from "../ClineProvider"
import type { MarketplaceManager } from "../../../services/marketplace"

export const worktreeMessageTypes: ReadonlySet<WebviewMessageType> = new Set([
	"browseForWorktreePath",
	"checkBranchWorktreeInclude",
	"checkoutBranch",
	"createWorktree",
	"createWorktreeInclude",
	"deleteWorktree",
	"getAvailableBranches",
	"getWorktreeDefaults",
	"getWorktreeIncludeStatus",
	"listWorktrees",
	"switchWorktree",
])

export async function handleWorktreeMessages(
	provider: Pick<ClineProvider, "postMessageToWebview" | "log" | "cwd" | "contextProxy">,
	_marketplaceManager: MarketplaceManager | undefined,
	message: WebviewMessage,
): Promise<void> {
	switch (message.type) {
		case "listWorktrees": {
			try {
				const { worktrees, isGitRepo, isMultiRoot, isSubfolder, gitRootPath, error } =
					await handleListWorktrees(provider)

				await provider.postMessageToWebview({
					type: "worktreeList",
					worktrees,
					isGitRepo,
					isMultiRoot,
					isSubfolder,
					gitRootPath,
					error,
				})
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)

				await provider.postMessageToWebview({
					type: "worktreeList",
					worktrees: [],
					isGitRepo: false,
					isMultiRoot: false,
					isSubfolder: false,
					gitRootPath: "",
					error: errorMessage,
				})
			}

			break
		}

		case "createWorktree": {
			try {
				const { success, message: text } = await handleCreateWorktree(
					provider,
					{
						path: message.worktreePath!,
						branch: message.worktreeBranch,
						baseBranch: message.worktreeBaseBranch,
						createNewBranch: message.worktreeCreateNewBranch,
					},
					(progress) => {
						void provider.postMessageToWebview({
							type: "worktreeCopyProgress",
							copyProgressBytesCopied: progress.bytesCopied,
							copyProgressItemName: progress.itemName,
						})
					},
				)

				await provider.postMessageToWebview({ type: "worktreeResult", success, text })
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				await provider.postMessageToWebview({ type: "worktreeResult", success: false, text: errorMessage })
			}

			break
		}

		case "deleteWorktree": {
			try {
				const { success, message: text } = await handleDeleteWorktree(
					provider,
					message.worktreePath!,
					message.worktreeForce ?? false,
				)

				await provider.postMessageToWebview({ type: "worktreeResult", success, text })
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				await provider.postMessageToWebview({ type: "worktreeResult", success: false, text: errorMessage })
			}

			break
		}

		case "switchWorktree": {
			try {
				const { success, message: text } = await handleSwitchWorktree(
					provider,
					message.worktreePath!,
					message.worktreeNewWindow ?? true,
				)

				await provider.postMessageToWebview({ type: "worktreeResult", success, text })
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				await provider.postMessageToWebview({ type: "worktreeResult", success: false, text: errorMessage })
			}

			break
		}

		case "getAvailableBranches": {
			try {
				const { localBranches, remoteBranches, currentBranch } = await handleGetAvailableBranches(provider)

				await provider.postMessageToWebview({
					type: "branchList",
					localBranches,
					remoteBranches,
					currentBranch,
				})
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)

				await provider.postMessageToWebview({
					type: "branchList",
					localBranches: [],
					remoteBranches: [],
					currentBranch: "",
					error: errorMessage,
				})
			}

			break
		}

		case "getWorktreeDefaults": {
			try {
				const { suggestedBranch, suggestedPath } = await handleGetWorktreeDefaults(provider)
				await provider.postMessageToWebview({ type: "worktreeDefaults", suggestedBranch, suggestedPath })
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)

				await provider.postMessageToWebview({
					type: "worktreeDefaults",
					suggestedBranch: "",
					suggestedPath: "",
					error: errorMessage,
				})
			}

			break
		}

		case "getWorktreeIncludeStatus": {
			try {
				const worktreeIncludeStatus = await handleGetWorktreeIncludeStatus(provider)
				await provider.postMessageToWebview({ type: "worktreeIncludeStatus", worktreeIncludeStatus })
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)

				await provider.postMessageToWebview({
					type: "worktreeIncludeStatus",
					worktreeIncludeStatus: {
						exists: false,
						hasGitignore: false,
						gitignoreContent: undefined,
					},
					error: errorMessage,
				})
			}

			break
		}

		case "checkBranchWorktreeInclude": {
			try {
				const branch = message.worktreeBranch
				if (!branch) {
					await provider.postMessageToWebview({
						type: "branchWorktreeIncludeResult",
						hasWorktreeInclude: false,
						error: "No branch specified",
					})
					break
				}
				const hasWorktreeInclude = await handleCheckBranchWorktreeInclude(provider, branch)
				await provider.postMessageToWebview({
					type: "branchWorktreeIncludeResult",
					branch,
					hasWorktreeInclude,
				})
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				await provider.postMessageToWebview({
					type: "branchWorktreeIncludeResult",
					hasWorktreeInclude: false,
					error: errorMessage,
				})
			}

			break
		}

		case "createWorktreeInclude": {
			try {
				const { success, message: text } = await handleCreateWorktreeInclude(
					provider,
					message.worktreeIncludeContent ?? "",
				)

				await provider.postMessageToWebview({ type: "worktreeResult", success, text })
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				provider.log(`Error creating worktree include: ${errorMessage}`)
				await provider.postMessageToWebview({ type: "worktreeResult", success: false, text: errorMessage })
			}

			break
		}

		case "checkoutBranch": {
			try {
				const { success, message: text } = await handleCheckoutBranch(provider, message.worktreeBranch!)
				await provider.postMessageToWebview({ type: "worktreeResult", success, text })
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				await provider.postMessageToWebview({ type: "worktreeResult", success: false, text: errorMessage })
			}

			break
		}

		case "browseForWorktreePath": {
			try {
				const options: vscode.OpenDialogOptions = {
					canSelectFiles: false,
					canSelectFolders: true,
					canSelectMany: false,
					openLabel: t("worktrees:selectWorktreeLocation"),
					title: t("worktrees:selectFolderForWorktree"),
					defaultUri: vscode.workspace.workspaceFolders?.[0]?.uri
						? vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, "..")
						: undefined,
				}

				const result = await vscode.window.showOpenDialog(options)
				if (result && result[0]) {
					await provider.postMessageToWebview({
						type: "folderSelected",
						path: result[0].fsPath,
					})
				}
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				provider.log(`Error opening folder picker: ${errorMessage}`)
			}

			break
		}
	}
}
