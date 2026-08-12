import { describe, it, expect } from "vitest"

import {
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
	worktreeMessageSchema,
	parseWebviewMessage,
} from "../index.js"

describe("createWorktreeMessageSchema", () => {
	it("accepts a valid message with only the required path", () => {
		const result = createWorktreeMessageSchema.safeParse({ type: "createWorktree", worktreePath: "/repo/wt" })
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.worktreePath).toBe("/repo/wt")
		}
	})

	it("accepts a valid message with all optional fields", () => {
		const result = createWorktreeMessageSchema.safeParse({
			type: "createWorktree",
			worktreePath: "/repo/wt",
			worktreeBranch: "feature/x",
			worktreeBaseBranch: "main",
			worktreeCreateNewBranch: true,
		})
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.worktreeBranch).toBe("feature/x")
			expect(result.data.worktreeBaseBranch).toBe("main")
			expect(result.data.worktreeCreateNewBranch).toBe(true)
		}
	})

	it("rejects a message missing the required worktreePath", () => {
		const result = createWorktreeMessageSchema.safeParse({ type: "createWorktree", worktreeBranch: "feature/x" })
		expect(result.success).toBe(false)
	})

	it("rejects a non-string worktreePath", () => {
		expect(createWorktreeMessageSchema.safeParse({ type: "createWorktree", worktreePath: 42 }).success).toBe(false)
	})

	it("rejects a wrong-type worktreeBranch", () => {
		expect(
			createWorktreeMessageSchema.safeParse({ type: "createWorktree", worktreePath: "/wt", worktreeBranch: 42 })
				.success,
		).toBe(false)
	})

	it("rejects a message with the wrong type literal", () => {
		expect(createWorktreeMessageSchema.safeParse({ type: "deleteWorktree", worktreePath: "/wt" }).success).toBe(
			false,
		)
	})

	it("rejects a non-object payload", () => {
		expect(createWorktreeMessageSchema.safeParse("createWorktree").success).toBe(false)
	})
})

describe("deleteWorktreeMessageSchema", () => {
	it("accepts a valid message with only the required path", () => {
		const result = deleteWorktreeMessageSchema.safeParse({ type: "deleteWorktree", worktreePath: "/repo/wt" })
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.worktreePath).toBe("/repo/wt")
		}
	})

	it("accepts a valid message with worktreeForce", () => {
		const result = deleteWorktreeMessageSchema.safeParse({
			type: "deleteWorktree",
			worktreePath: "/repo/wt",
			worktreeForce: true,
		})
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.worktreeForce).toBe(true)
		}
	})

	it("rejects a message missing the required worktreePath", () => {
		expect(deleteWorktreeMessageSchema.safeParse({ type: "deleteWorktree" }).success).toBe(false)
	})

	it("rejects a non-string worktreePath", () => {
		expect(deleteWorktreeMessageSchema.safeParse({ type: "deleteWorktree", worktreePath: ["/wt"] }).success).toBe(
			false,
		)
	})

	it("rejects a message with the wrong type literal", () => {
		expect(deleteWorktreeMessageSchema.safeParse({ type: "switchWorktree", worktreePath: "/wt" }).success).toBe(
			false,
		)
	})
})

describe("switchWorktreeMessageSchema", () => {
	it("accepts a valid message with only the required path", () => {
		const result = switchWorktreeMessageSchema.safeParse({ type: "switchWorktree", worktreePath: "/repo/wt" })
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.worktreePath).toBe("/repo/wt")
		}
	})

	it("accepts a valid message with worktreeNewWindow", () => {
		const result = switchWorktreeMessageSchema.safeParse({
			type: "switchWorktree",
			worktreePath: "/repo/wt",
			worktreeNewWindow: false,
		})
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.worktreeNewWindow).toBe(false)
		}
	})

	it("rejects a message missing the required worktreePath", () => {
		expect(switchWorktreeMessageSchema.safeParse({ type: "switchWorktree" }).success).toBe(false)
	})

	it("rejects a message with the wrong type literal", () => {
		expect(switchWorktreeMessageSchema.safeParse({ type: "createWorktree", worktreePath: "/wt" }).success).toBe(
			false,
		)
	})
})

describe("checkoutBranchMessageSchema", () => {
	it("accepts a valid message with the required branch", () => {
		const result = checkoutBranchMessageSchema.safeParse({ type: "checkoutBranch", worktreeBranch: "main" })
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.worktreeBranch).toBe("main")
		}
	})

	it("rejects a message missing the required worktreeBranch", () => {
		expect(checkoutBranchMessageSchema.safeParse({ type: "checkoutBranch" }).success).toBe(false)
	})

	it("rejects a non-string worktreeBranch", () => {
		expect(checkoutBranchMessageSchema.safeParse({ type: "checkoutBranch", worktreeBranch: null }).success).toBe(
			false,
		)
	})

	it("rejects a message with the wrong type literal", () => {
		expect(
			checkoutBranchMessageSchema.safeParse({ type: "checkBranchWorktreeInclude", worktreeBranch: "main" })
				.success,
		).toBe(false)
	})
})

describe("checkBranchWorktreeIncludeMessageSchema", () => {
	it("accepts a valid message with a branch", () => {
		const result = checkBranchWorktreeIncludeMessageSchema.safeParse({
			type: "checkBranchWorktreeInclude",
			worktreeBranch: "feature/x",
		})
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.worktreeBranch).toBe("feature/x")
		}
	})

	it("accepts a message without the optional branch (matches the interface guard)", () => {
		expect(checkBranchWorktreeIncludeMessageSchema.safeParse({ type: "checkBranchWorktreeInclude" }).success).toBe(
			true,
		)
	})

	it("rejects a non-string worktreeBranch", () => {
		expect(
			checkBranchWorktreeIncludeMessageSchema.safeParse({
				type: "checkBranchWorktreeInclude",
				worktreeBranch: 42,
			}).success,
		).toBe(false)
	})

	it("rejects a message with the wrong type literal", () => {
		expect(
			checkBranchWorktreeIncludeMessageSchema.safeParse({ type: "checkoutBranch", worktreeBranch: "main" })
				.success,
		).toBe(false)
	})
})

describe("createWorktreeIncludeMessageSchema", () => {
	it("accepts a valid message with content", () => {
		const result = createWorktreeIncludeMessageSchema.safeParse({
			type: "createWorktreeInclude",
			worktreeIncludeContent: ".clinerules/",
		})
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.worktreeIncludeContent).toBe(".clinerules/")
		}
	})

	it("accepts a message without the optional content (handler defaults to empty string)", () => {
		expect(createWorktreeIncludeMessageSchema.safeParse({ type: "createWorktreeInclude" }).success).toBe(true)
	})

	it("rejects a non-string content", () => {
		expect(
			createWorktreeIncludeMessageSchema.safeParse({ type: "createWorktreeInclude", worktreeIncludeContent: 42 })
				.success,
		).toBe(false)
	})

	it("rejects a message with the wrong type literal", () => {
		expect(createWorktreeIncludeMessageSchema.safeParse({ type: "listWorktrees" }).success).toBe(false)
	})
})

describe("empty-payload worktree schemas", () => {
	const emptySchemas = [
		["listWorktrees", listWorktreesMessageSchema, "listWorktrees"],
		["getAvailableBranches", getAvailableBranchesMessageSchema, "getAvailableBranches"],
		["getWorktreeDefaults", getWorktreeDefaultsMessageSchema, "getWorktreeDefaults"],
		["getWorktreeIncludeStatus", getWorktreeIncludeStatusMessageSchema, "getWorktreeIncludeStatus"],
		["browseForWorktreePath", browseForWorktreePathMessageSchema, "browseForWorktreePath"],
	] as const

	it.each(emptySchemas)("%s accepts a valid message", (_name, schema, type) => {
		const result = schema.safeParse({ type })
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.type).toBe(type)
		}
	})

	it.each(emptySchemas)("%s rejects a message with the wrong type literal", (_name, schema, _type) => {
		expect(schema.safeParse({ type: "createWorktree", worktreePath: "/wt" }).success).toBe(false)
	})

	it.each(emptySchemas)("%s rejects a non-object payload", (_name, schema, _type) => {
		expect(schema.safeParse(null).success).toBe(false)
		expect(schema.safeParse("listWorktrees").success).toBe(false)
	})
})

describe("worktreeMessageSchema (discriminated union)", () => {
	it("narrows to createWorktree with the required path", () => {
		const parsed = worktreeMessageSchema.safeParse({
			type: "createWorktree",
			worktreePath: "/repo/wt",
			worktreeBranch: "feature/x",
		})
		expect(parsed.success).toBe(true)
		if (parsed.success && parsed.data.type === "createWorktree") {
			expect(parsed.data.worktreePath).toBe("/repo/wt")
			expect(parsed.data.worktreeBranch).toBe("feature/x")
		}
	})

	it("narrows to deleteWorktree", () => {
		const parsed = worktreeMessageSchema.safeParse({ type: "deleteWorktree", worktreePath: "/repo/wt" })
		expect(parsed.success).toBe(true)
		if (parsed.success && parsed.data.type === "deleteWorktree") {
			expect(parsed.data.worktreePath).toBe("/repo/wt")
		}
	})

	it("narrows to switchWorktree", () => {
		const parsed = worktreeMessageSchema.safeParse({
			type: "switchWorktree",
			worktreePath: "/repo/wt",
			worktreeNewWindow: true,
		})
		expect(parsed.success).toBe(true)
		if (parsed.success && parsed.data.type === "switchWorktree") {
			expect(parsed.data.worktreeNewWindow).toBe(true)
		}
	})

	it("narrows to checkoutBranch", () => {
		const parsed = worktreeMessageSchema.safeParse({ type: "checkoutBranch", worktreeBranch: "main" })
		expect(parsed.success).toBe(true)
		if (parsed.success && parsed.data.type === "checkoutBranch") {
			expect(parsed.data.worktreeBranch).toBe("main")
		}
	})

	it("narrows to an empty-payload member (listWorktrees)", () => {
		const parsed = worktreeMessageSchema.safeParse({ type: "listWorktrees" })
		expect(parsed.success).toBe(true)
		if (parsed.success) {
			expect(parsed.data.type).toBe("listWorktrees")
		}
	})

	it("rejects malformed members (createWorktree missing path)", () => {
		expect(worktreeMessageSchema.safeParse({ type: "createWorktree" }).success).toBe(false)
		expect(worktreeMessageSchema.safeParse({ type: "checkoutBranch" }).success).toBe(false)
	})

	it("rejects a type outside the domain", () => {
		expect(worktreeMessageSchema.safeParse({ type: "newTask", text: "hi" }).success).toBe(false)
	})
})

describe("parseWebviewMessage boundary for worktree", () => {
	it("accepts a valid listWorktrees message at the boundary", () => {
		const result = parseWebviewMessage({ type: "listWorktrees" })
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.message.type).toBe("listWorktrees")
		}
	})

	it("accepts a valid createWorktree message at the boundary", () => {
		const result = parseWebviewMessage({ type: "createWorktree", worktreePath: "/repo/wt" })
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.message.type).toBe("createWorktree")
		}
	})

	it("rejects a malformed createWorktree (missing path) at the boundary", () => {
		const result = parseWebviewMessage({ type: "createWorktree", worktreeBranch: "feature/x" })
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.error).toContain("createWorktree")
		}
	})

	it("rejects a malformed checkoutBranch (missing branch) at the boundary", () => {
		const result = parseWebviewMessage({ type: "checkoutBranch" })
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.error).toContain("checkoutBranch")
		}
	})

	it("accepts a valid switchWorktree message at the boundary", () => {
		const result = parseWebviewMessage({ type: "switchWorktree", worktreePath: "/repo/wt" })
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.message.type).toBe("switchWorktree")
		}
	})

	it("accepts a valid getWorktreeDefaults message at the boundary", () => {
		const result = parseWebviewMessage({ type: "getWorktreeDefaults" })
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.message.type).toBe("getWorktreeDefaults")
		}
	})
})
