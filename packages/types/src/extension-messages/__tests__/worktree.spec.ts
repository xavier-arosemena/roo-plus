import { describe, it, expect } from "vitest"

import {
	branchListMessageSchema,
	branchWorktreeIncludeResultMessageSchema,
	extensionMessageSchemas,
	folderSelectedMessageSchema,
	parseExtensionMessage,
	worktreeCopyProgressMessageSchema,
	worktreeDefaultsMessageSchema,
	worktreeIncludeStatusMessageSchema,
	worktreeListMessageSchema,
	worktreeResultMessageSchema,
	type ExtensionMessageType,
} from "../index.js"

const validWorktree = {
	path: "/path/to/worktree",
	branch: "feature/x",
	commitHash: "abc123",
	isCurrent: false,
	isBare: false,
	isDetached: false,
	isLocked: false,
}

const validWorktreeList = {
	type: "worktreeList",
	worktrees: [validWorktree],
	isGitRepo: true,
	isMultiRoot: false,
	isSubfolder: false,
	gitRootPath: "/path/to/repo",
}

const validWorktreeIncludeStatus = {
	exists: false,
	hasGitignore: true,
	gitignoreContent: "node_modules\n",
}

describe("worktree domain (Phase 2, Domain 7) schemas", () => {
	describe("valid messages", () => {
		it.each([
			["worktreeList (with worktrees)", worktreeListMessageSchema, validWorktreeList],
			[
				"worktreeList (empty with error — producer catch path)",
				worktreeListMessageSchema,
				{ ...validWorktreeList, worktrees: [], error: "Not a git repo" },
			],
			[
				"worktreeResult (success — TOP-LEVEL success/text)",
				worktreeResultMessageSchema,
				{ type: "worktreeResult", success: true, text: "Created worktree" },
			],
			[
				"worktreeResult (failure — TOP-LEVEL success/text)",
				worktreeResultMessageSchema,
				{ type: "worktreeResult", success: false, text: "Failed" },
			],
			[
				"worktreeCopyProgress (bytesCopied + itemName)",
				worktreeCopyProgressMessageSchema,
				{ type: "worktreeCopyProgress", copyProgressBytesCopied: 1024, copyProgressItemName: "a.ts" },
			],
			[
				"worktreeCopyProgress (with totalBytes — interface shape)",
				worktreeCopyProgressMessageSchema,
				{ type: "worktreeCopyProgress", copyProgressBytesCopied: 10, copyProgressTotalBytes: 100 },
			],
			[
				"branchList (branches)",
				branchListMessageSchema,
				{ type: "branchList", localBranches: ["main"], remoteBranches: ["origin/main"], currentBranch: "main" },
			],
			[
				"branchList (empty with error — producer catch path)",
				branchListMessageSchema,
				{ type: "branchList", localBranches: [], remoteBranches: [], currentBranch: "", error: "boom" },
			],
			[
				"worktreeDefaults (suggested branch/path)",
				worktreeDefaultsMessageSchema,
				{ type: "worktreeDefaults", suggestedBranch: "worktree/feature", suggestedPath: "/path/to/wt" },
			],
			[
				"worktreeDefaults (empty with error — producer catch path)",
				worktreeDefaultsMessageSchema,
				{ type: "worktreeDefaults", suggestedBranch: "", suggestedPath: "", error: "boom" },
			],
			[
				"worktreeIncludeStatus (with status)",
				worktreeIncludeStatusMessageSchema,
				{ type: "worktreeIncludeStatus", worktreeIncludeStatus: validWorktreeIncludeStatus },
			],
			[
				"worktreeIncludeStatus (default status with error — producer catch path)",
				worktreeIncludeStatusMessageSchema,
				{
					type: "worktreeIncludeStatus",
					worktreeIncludeStatus: { exists: false, hasGitignore: false },
					error: "boom",
				},
			],
			[
				"branchWorktreeIncludeResult (success with branch)",
				branchWorktreeIncludeResultMessageSchema,
				{ type: "branchWorktreeIncludeResult", branch: "feature/x", hasWorktreeInclude: true },
			],
			[
				"branchWorktreeIncludeResult (no-branch guard path)",
				branchWorktreeIncludeResultMessageSchema,
				{ type: "branchWorktreeIncludeResult", hasWorktreeInclude: false, error: "No branch specified" },
			],
			[
				"branchWorktreeIncludeResult (error path)",
				branchWorktreeIncludeResultMessageSchema,
				{ type: "branchWorktreeIncludeResult", hasWorktreeInclude: false, error: "boom" },
			],
			["folderSelected (path)", folderSelectedMessageSchema, { type: "folderSelected", path: "/path/to/picked" }],
		])("accepts %s", (_name, schema, payload) => {
			const result = schema.safeParse(payload)
			expect(result.success).toBe(true)
		})
	})

	describe("malformed messages", () => {
		it.each([
			[
				"worktreeList (missing worktrees)",
				worktreeListMessageSchema,
				{ type: "worktreeList", isGitRepo: true, isMultiRoot: false, isSubfolder: false, gitRootPath: "" },
			],
			[
				"worktreeList (non-array worktrees)",
				worktreeListMessageSchema,
				{
					type: "worktreeList",
					worktrees: "nope",
					isGitRepo: true,
					isMultiRoot: false,
					isSubfolder: false,
					gitRootPath: "",
				},
			],
			[
				"worktreeList (worktree with non-string branch)",
				worktreeListMessageSchema,
				{ ...validWorktreeList, worktrees: [{ ...validWorktree, branch: 42 }] },
			],
			["worktreeResult (missing success)", worktreeResultMessageSchema, { type: "worktreeResult", text: "hi" }],
			[
				"worktreeResult (non-boolean success)",
				worktreeResultMessageSchema,
				{ type: "worktreeResult", success: "yes", text: "hi" },
			],
			["worktreeResult (missing text)", worktreeResultMessageSchema, { type: "worktreeResult", success: true }],
			[
				"worktreeCopyProgress (non-number bytesCopied)",
				worktreeCopyProgressMessageSchema,
				{ type: "worktreeCopyProgress", copyProgressBytesCopied: "many" },
			],
			[
				"branchList (missing localBranches)",
				branchListMessageSchema,
				{ type: "branchList", remoteBranches: [], currentBranch: "main" },
			],
			[
				"branchList (non-array remoteBranches)",
				branchListMessageSchema,
				{ type: "branchList", localBranches: [], remoteBranches: "nope", currentBranch: "main" },
			],
			[
				"worktreeDefaults (missing suggestedBranch)",
				worktreeDefaultsMessageSchema,
				{ type: "worktreeDefaults", suggestedPath: "/x" },
			],
			[
				"worktreeIncludeStatus (non-object worktreeIncludeStatus)",
				worktreeIncludeStatusMessageSchema,
				{ type: "worktreeIncludeStatus", worktreeIncludeStatus: "nope" },
			],
			[
				"worktreeIncludeStatus (status missing exists)",
				worktreeIncludeStatusMessageSchema,
				{ type: "worktreeIncludeStatus", worktreeIncludeStatus: { hasGitignore: false } },
			],
			[
				"branchWorktreeIncludeResult (missing hasWorktreeInclude)",
				branchWorktreeIncludeResultMessageSchema,
				{ type: "branchWorktreeIncludeResult", branch: "main" },
			],
			[
				"branchWorktreeIncludeResult (non-boolean hasWorktreeInclude)",
				branchWorktreeIncludeResultMessageSchema,
				{ type: "branchWorktreeIncludeResult", hasWorktreeInclude: "yes" },
			],
			["folderSelected (missing path)", folderSelectedMessageSchema, { type: "folderSelected" }],
			["folderSelected (non-string path)", folderSelectedMessageSchema, { type: "folderSelected", path: 42 }],
			[
				"worktreeList (wrong type discriminator)",
				worktreeListMessageSchema,
				{ type: "worktreeListX", worktrees: [] },
			],
		])("rejects %s", (_name, schema, payload) => {
			const result = schema.safeParse(payload)
			expect(result.success).toBe(false)
		})
	})

	describe("parseExtensionMessage boundary", () => {
		it("strictly validates a registered worktreeList and retains all consumer-read fields", () => {
			const result = parseExtensionMessage(validWorktreeList)
			expect(result.ok).toBe(true)
			if (result.ok) {
				expect(result.message.type).toBe("worktreeList")
				// `WorktreesView`/`WorktreeSelector` read every list field — zod
				// must NOT strip any of them.
				expect(result.message.worktrees).toEqual([validWorktree])
				expect(result.message.isGitRepo).toBe(true)
				expect(result.message.gitRootPath).toBe("/path/to/repo")
			}
		})

		it("strictly validates a registered worktreeResult with TOP-LEVEL success/text retained", () => {
			const result = parseExtensionMessage({ type: "worktreeResult", success: true, text: "Created worktree" })
			expect(result.ok).toBe(true)
			if (result.ok) {
				expect(result.message.type).toBe("worktreeResult")
				expect(result.message.success).toBe(true)
				expect(result.message.text).toBe("Created worktree")
			}
		})

		it("strictly validates a registered worktreeCopyProgress and retains the item name", () => {
			const result = parseExtensionMessage({
				type: "worktreeCopyProgress",
				copyProgressBytesCopied: 2048,
				copyProgressItemName: "b.ts",
			})
			expect(result.ok).toBe(true)
			if (result.ok) {
				expect(result.message.type).toBe("worktreeCopyProgress")
				expect(result.message.copyProgressBytesCopied).toBe(2048)
				expect(result.message.copyProgressItemName).toBe("b.ts")
			}
		})

		it("strictly validates a registered branchWorktreeIncludeResult success", () => {
			const result = parseExtensionMessage({
				type: "branchWorktreeIncludeResult",
				branch: "feature/x",
				hasWorktreeInclude: true,
			})
			expect(result.ok).toBe(true)
			if (result.ok) {
				expect(result.message.type).toBe("branchWorktreeIncludeResult")
				expect(result.message.branch).toBe("feature/x")
			}
		})

		it("strictly validates a registered folderSelected", () => {
			const result = parseExtensionMessage({ type: "folderSelected", path: "/picked" })
			expect(result.ok).toBe(true)
			if (result.ok) {
				expect(result.message.type).toBe("folderSelected")
			}
		})

		it("rejects a malformed registered worktreeResult (missing text)", () => {
			const result = parseExtensionMessage({ type: "worktreeResult", success: true })
			expect(result.ok).toBe(false)
			if (!result.ok) {
				expect(result.error).toContain("worktreeResult")
			}
		})

		it("rejects a malformed registered worktreeList (missing worktrees)", () => {
			const result = parseExtensionMessage({ type: "worktreeList", isGitRepo: true })
			expect(result.ok).toBe(false)
			if (!result.ok) {
				expect(result.error).toContain("worktreeList")
			}
		})
	})

	it("seeds the schema registry with all eight worktree-domain types", () => {
		const types: ExtensionMessageType[] = [
			"worktreeList",
			"worktreeResult",
			"worktreeCopyProgress",
			"branchList",
			"worktreeDefaults",
			"worktreeIncludeStatus",
			"branchWorktreeIncludeResult",
			"folderSelected",
		]
		for (const type of types) {
			expect(extensionMessageSchemas[type]).toBeDefined()
		}
	})
})
