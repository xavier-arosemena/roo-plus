import { z } from "zod"

/**
 * Worktree-domain messages.
 *
 * The webview drives git-worktree management (list/create/delete/switch) plus
 * branch discovery, defaults, `.worktreeinclude` handling and the native folder
 * picker. Registered so crafted payloads (e.g. a `createWorktree` without a
 * `worktreePath`, or a non-string path) are rejected at the boundary instead of
 * reaching the handler, where the path/branch fields were previously consumed
 * via non-null assertions (`message.worktreePath!`, `message.worktreeBranch!`).
 * Fields the handler reads with `!` are REQUIRED here so the handler can drop
 * the assertion; every webview sender provides them (see the construction sites
 * in `webview-ui/src/components/worktrees/`).
 */

/** List the worktrees in the current repository (empty payload). */
export const listWorktreesMessageSchema = z.object({
	type: z.literal("listWorktrees"),
})

/** Create a new git worktree at the given path. */
export const createWorktreeMessageSchema = z.object({
	type: z.literal("createWorktree"),
	worktreePath: z.string(),
	worktreeBranch: z.string().optional(),
	worktreeBaseBranch: z.string().optional(),
	worktreeCreateNewBranch: z.boolean().optional(),
})

/** Delete the git worktree at the given path (optionally force). */
export const deleteWorktreeMessageSchema = z.object({
	type: z.literal("deleteWorktree"),
	worktreePath: z.string(),
	worktreeForce: z.boolean().optional(),
})

/** Switch to the git worktree at the given path (optionally in a new window). */
export const switchWorktreeMessageSchema = z.object({
	type: z.literal("switchWorktree"),
	worktreePath: z.string(),
	worktreeNewWindow: z.boolean().optional(),
})

/** Request the available local/remote branches (empty payload). */
export const getAvailableBranchesMessageSchema = z.object({
	type: z.literal("getAvailableBranches"),
})

/** Request the suggested worktree branch/path defaults (empty payload). */
export const getWorktreeDefaultsMessageSchema = z.object({
	type: z.literal("getWorktreeDefaults"),
})

/** Request whether the current worktree has a `.worktreeinclude` file (empty payload). */
export const getWorktreeIncludeStatusMessageSchema = z.object({
	type: z.literal("getWorktreeIncludeStatus"),
})

/**
 * Check whether the given branch has a `.worktreeinclude` file. `worktreeBranch`
 * stays optional to match the `WebviewMessage` interface field exactly — the
 * handler guards on its presence (`if (!branch)`) and posts a result either way.
 */
export const checkBranchWorktreeIncludeMessageSchema = z.object({
	type: z.literal("checkBranchWorktreeInclude"),
	worktreeBranch: z.string().optional(),
})

/** Create the `.worktreeinclude` file from the provided content (optional). */
export const createWorktreeIncludeMessageSchema = z.object({
	type: z.literal("createWorktreeInclude"),
	worktreeIncludeContent: z.string().optional(),
})

/** Check out the given branch in the current worktree (branch REQUIRED). */
export const checkoutBranchMessageSchema = z.object({
	type: z.literal("checkoutBranch"),
	worktreeBranch: z.string(),
})

/** Open VS Code's native folder picker to select a worktree location (empty payload). */
export const browseForWorktreePathMessageSchema = z.object({
	type: z.literal("browseForWorktreePath"),
})

/** Discriminated union of the worktree domain's fully-typed messages. */
export const worktreeMessageSchema = z.discriminatedUnion("type", [
	listWorktreesMessageSchema,
	createWorktreeMessageSchema,
	deleteWorktreeMessageSchema,
	switchWorktreeMessageSchema,
	getAvailableBranchesMessageSchema,
	getWorktreeDefaultsMessageSchema,
	getWorktreeIncludeStatusMessageSchema,
	checkBranchWorktreeIncludeMessageSchema,
	createWorktreeIncludeMessageSchema,
	checkoutBranchMessageSchema,
	browseForWorktreePathMessageSchema,
])

export type WorktreeMessage = z.infer<typeof worktreeMessageSchema>
