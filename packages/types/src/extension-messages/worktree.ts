import { z } from "zod"

/**
 * Outbound worktree response message schemas (Phase 2, Domain 7).
 *
 * These are the extension→webview|CLI messages that carry git-worktree
 * management results: the worktree list (`worktreeList`), operation results
 * (`worktreeResult`), file-copy progress (`worktreeCopyProgress`), branch
 * discovery (`branchList`), suggested defaults (`worktreeDefaults`),
 * `.worktreeinclude` status (`worktreeIncludeStatus`,
 * `branchWorktreeIncludeResult`) and the native folder-picker result
 * (`folderSelected`).
 *
 * Every schema uses a `z.literal("type")` discriminator and models the payload
 * shapes after the platform-agnostic interfaces in
 * `packages/types/src/worktree.ts` (`Worktree`, `BranchInfo`,
 * `WorktreeIncludeStatus`, `WorktreeListResponse`, `WorktreeDefaultsResponse`).
 * The flat `ExtensionMessage` interface in
 * `packages/types/src/vscode-extension-host.ts` is the single source of truth
 * for the `type` union; these schemas mirror its payload fields plus the fields
 * the webview consumers actually read (zod strips unknown keys, so a field the
 * consumer reads MUST be in the schema).
 */

/**
 * A single git worktree — mirrors the `Worktree` interface in
 * `packages/types/src/worktree.ts` (single source of truth for the runtime
 * shape produced by `handleListWorktrees`).
 */
export const worktreeSchema = z.object({
	path: z.string(),
	branch: z.string(),
	commitHash: z.string(),
	isCurrent: z.boolean(),
	isBare: z.boolean(),
	isDetached: z.boolean(),
	isLocked: z.boolean(),
	lockReason: z.string().optional(),
})

/**
 * `.worktreeinclude` status — mirrors the `WorktreeIncludeStatus` interface in
 * `packages/types/src/worktree.ts`.
 */
export const worktreeIncludeStatusSchema = z.object({
	exists: z.boolean(),
	hasGitignore: z.boolean(),
	gitignoreContent: z.string().optional(),
})

/**
 * Available local/remote branches — mirrors the `BranchInfo` interface in
 * `packages/types/src/worktree.ts`.
 */
export const branchInfoSchema = z.object({
	localBranches: z.array(z.string()),
	remoteBranches: z.array(z.string()),
	currentBranch: z.string(),
})

/**
 * Worktree list payload — mirrors the `WorktreeListResponse` interface in
 * `packages/types/src/worktree.ts`. The producer (`handleListWorktrees`
 * handler) also posts `error` on its catch path, so it is modeled optional
 * here.
 */
export const worktreeListResponseSchema = z.object({
	worktrees: z.array(worktreeSchema),
	isGitRepo: z.boolean(),
	error: z.string().optional(),
	isMultiRoot: z.boolean(),
	isSubfolder: z.boolean(),
	gitRootPath: z.string(),
})

/**
 * Suggested worktree defaults — mirrors the `WorktreeDefaultsResponse`
 * interface in `packages/types/src/worktree.ts`; `error` is posted on the
 * catch path of the `getWorktreeDefaults` handler.
 */
export const worktreeDefaultsResponseSchema = z.object({
	suggestedBranch: z.string(),
	suggestedPath: z.string(),
	error: z.string().optional(),
})

/**
 * Worktree list push (`worktreeList`).
 *
 * The producer (`src/core/webview/handlers/worktree.ts`, `listWorktrees`
 * handler) posts `{ type, worktrees, isGitRepo, isMultiRoot, isSubfolder,
 * gitRootPath, error? }` on both the success path and the empty-list-on-error
 * path. The webview consumers (`WorktreesView.tsx`, `WorktreeSelector.tsx`)
 * read every field to decide git-repo/multi-root/subfolder rendering and to
 * populate the worktree list — all MUST be in the schema so zod does not strip
 * them.
 */
export const worktreeListMessageSchema = z.object({
	type: z.literal("worktreeList"),
	...worktreeListResponseSchema.shape,
})

/**
 * Worktree operation result (`worktreeResult`).
 *
 * IMPORTANT producer-subtlety: the producer posts TOP-LEVEL `success`/`text`
 * fields (`{ type, success, text }`), NOT a nested `worktreeResult` object as
 * the flat `ExtensionMessage.worktreeResult?: { success, message, worktree? }`
 * field suggests. Every construction site in
 * `src/core/webview/handlers/worktree.ts` (create/delete/switch/checkout/
 * create-include handlers) posts `{ type, success, text }`, and the webview
 * consumers (`CreateWorktreeModal.tsx`, `DeleteWorktreeModal.tsx`) read
 * `message.success` and `message.text` — so the schema models the ACTUAL
 * producer shape, draining the interface's misleading `worktreeResult` field on
 * this path.
 */
export const worktreeResultMessageSchema = z.object({
	type: z.literal("worktreeResult"),
	success: z.boolean(),
	text: z.string(),
})

/**
 * Worktree file-copy progress (`worktreeCopyProgress`).
 *
 * The producer (`createWorktree` handler progress callback) posts
 * `{ type, copyProgressBytesCopied, copyProgressItemName }`; the flat
 * interface also declares `copyProgressTotalBytes` (size-based progress), which
 * is modeled optional so the full interface shape round-trips. The webview
 * (`CreateWorktreeModal.tsx`) reads `copyProgressBytesCopied` and
 * `copyProgressItemName` — both MUST be in the schema.
 */
export const worktreeCopyProgressMessageSchema = z.object({
	type: z.literal("worktreeCopyProgress"),
	copyProgressBytesCopied: z.number(),
	copyProgressTotalBytes: z.number().optional(),
	copyProgressItemName: z.string().optional(),
})

/**
 * Available-branches push (`branchList`).
 *
 * The producer (`getAvailableBranches` handler) posts `{ type, localBranches,
 * remoteBranches, currentBranch }` on success and an empty-branch error form
 * with `error` on its catch path. The webview (`CreateWorktreeModal.tsx`) reads
 * all three branch fields to populate the branch selector — all MUST be in the
 * schema.
 */
export const branchListMessageSchema = z.object({
	type: z.literal("branchList"),
	...branchInfoSchema.shape,
})

/**
 * Suggested worktree defaults push (`worktreeDefaults`).
 *
 * The producer (`getWorktreeDefaults` handler) posts `{ type, suggestedBranch,
 * suggestedPath }` on success and `{ type, suggestedBranch: "", suggestedPath:
 * "", error }` on its catch path. The webview (`CreateWorktreeModal.tsx`) reads
 * `suggestedBranch`/`suggestedPath` to prefill the create form — both MUST be
 * in the schema.
 */
export const worktreeDefaultsMessageSchema = z.object({
	type: z.literal("worktreeDefaults"),
	...worktreeDefaultsResponseSchema.shape,
})

/**
 * `.worktreeinclude` status push (`worktreeIncludeStatus`).
 *
 * The producer (`getWorktreeIncludeStatus` handler) posts `{ type,
 * worktreeIncludeStatus }` on success and a default
 * `{ exists: false, hasGitignore: false }` status with `error` on its catch
 * path. The webview (`CreateWorktreeModal.tsx`, `WorktreesView.tsx`) reads
 * `worktreeIncludeStatus` directly — it MUST be in the schema.
 */
export const worktreeIncludeStatusMessageSchema = z.object({
	type: z.literal("worktreeIncludeStatus"),
	worktreeIncludeStatus: worktreeIncludeStatusSchema,
	error: z.string().optional(),
})

/**
 * Branch `.worktreeinclude` check result (`branchWorktreeIncludeResult`).
 *
 * The producer (`checkBranchWorktreeInclude` handler) posts `{ type, branch,
 * hasWorktreeInclude }` on success, `{ type, hasWorktreeInclude: false, error }
 *` when no branch is specified, and `{ type, hasWorktreeInclude: false, error
 * }` on its catch path. `branch` is optional to match the guard semantics (the
 * "No branch specified" path omits it).
 */
export const branchWorktreeIncludeResultMessageSchema = z.object({
	type: z.literal("branchWorktreeIncludeResult"),
	branch: z.string().optional(),
	hasWorktreeInclude: z.boolean(),
	error: z.string().optional(),
})

/**
 * Native folder-picker result (`folderSelected`).
 *
 * The producer (`browseForWorktreePath` handler) posts `{ type, path }` with
 * the picked folder's fsPath. The webview (`CreateWorktreeModal.tsx`) reads
 * `path` to fill the worktree-path input — it MUST be in the schema.
 */
export const folderSelectedMessageSchema = z.object({
	type: z.literal("folderSelected"),
	path: z.string(),
})

/** Discriminated union of the outbound worktree domain's fully-typed messages. */
export const worktreeMessageSchema = z.discriminatedUnion("type", [
	worktreeListMessageSchema,
	worktreeResultMessageSchema,
	worktreeCopyProgressMessageSchema,
	branchListMessageSchema,
	worktreeDefaultsMessageSchema,
	worktreeIncludeStatusMessageSchema,
	branchWorktreeIncludeResultMessageSchema,
	folderSelectedMessageSchema,
])

export type WorktreeMessage = z.infer<typeof worktreeMessageSchema>
