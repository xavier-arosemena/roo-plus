import { describe, it, expect } from "vitest"

import {
	requestRulesMessageSchema,
	createRuleMessageSchema,
	deleteRuleMessageSchema,
	openRuleFileMessageSchema,
	openRulesDirectoryMessageSchema,
	rulesMessageSchema,
	parseWebviewMessage,
} from "../index.js"

describe("requestRulesMessageSchema", () => {
	it("accepts an empty-payload message", () => {
		const result = requestRulesMessageSchema.safeParse({ type: "requestRules" })
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.type).toBe("requestRules")
		}
	})

	it("rejects a message with the wrong type literal", () => {
		expect(requestRulesMessageSchema.safeParse({ type: "createRule" }).success).toBe(false)
	})

	it("rejects a non-object payload", () => {
		expect(requestRulesMessageSchema.safeParse("requestRules").success).toBe(false)
		expect(requestRulesMessageSchema.safeParse(null).success).toBe(false)
	})
})

describe("createRuleMessageSchema", () => {
	it("accepts a valid message with typed values", () => {
		const result = createRuleMessageSchema.safeParse({
			type: "createRule",
			values: { scope: "project", kind: "generic", fileName: "new.md", modeSlug: undefined },
		})
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.values?.scope).toBe("project")
			expect(result.data.values?.kind).toBe("generic")
			expect(result.data.values?.fileName).toBe("new.md")
		}
	})

	it("accepts a message with the legacy text fallback (no values)", () => {
		const result = createRuleMessageSchema.safeParse({ type: "createRule", text: "new.md" })
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.text).toBe("new.md")
		}
	})

	it("accepts a message without values or text (handler validates presence)", () => {
		expect(createRuleMessageSchema.safeParse({ type: "createRule" }).success).toBe(true)
	})

	it("rejects an invalid scope enum value", () => {
		expect(
			createRuleMessageSchema.safeParse({
				type: "createRule",
				values: { scope: "team", kind: "generic", fileName: "new.md" },
			}).success,
		).toBe(false)
	})

	it("rejects an invalid kind enum value", () => {
		expect(
			createRuleMessageSchema.safeParse({
				type: "createRule",
				values: { scope: "project", kind: "workspace", fileName: "new.md" },
			}).success,
		).toBe(false)
	})

	it("rejects a non-object values payload", () => {
		expect(createRuleMessageSchema.safeParse({ type: "createRule", values: "nope" }).success).toBe(false)
	})

	it("rejects a non-string fileName", () => {
		expect(
			createRuleMessageSchema.safeParse({
				type: "createRule",
				values: { scope: "project", kind: "generic", fileName: 42 },
			}).success,
		).toBe(false)
	})

	it("rejects a message with the wrong type literal", () => {
		expect(createRuleMessageSchema.safeParse({ type: "deleteRule", values: {} }).success).toBe(false)
	})

	it("rejects a non-object payload", () => {
		expect(createRuleMessageSchema.safeParse("createRule").success).toBe(false)
		expect(createRuleMessageSchema.safeParse([]).success).toBe(false)
	})
})

describe("deleteRuleMessageSchema", () => {
	it("accepts a valid message with typed values", () => {
		const result = deleteRuleMessageSchema.safeParse({
			type: "deleteRule",
			values: { scope: "global", kind: "generic", relativePath: "rule.md", id: "abc", modeSlug: undefined },
		})
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.values?.id).toBe("abc")
			expect(result.data.values?.relativePath).toBe("rule.md")
		}
	})

	it("accepts a message with the legacy text fallback (no values)", () => {
		const result = deleteRuleMessageSchema.safeParse({ type: "deleteRule", text: "rule.md" })
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.text).toBe("rule.md")
		}
	})

	it("rejects an invalid scope enum value", () => {
		expect(
			deleteRuleMessageSchema.safeParse({
				type: "deleteRule",
				values: { scope: "global", kind: "generic", relativePath: "rule.md" },
			}).success,
		).toBe(true)
		expect(
			deleteRuleMessageSchema.safeParse({
				type: "deleteRule",
				values: { scope: "team", kind: "generic", relativePath: "rule.md" },
			}).success,
		).toBe(false)
	})

	it("rejects a non-object values payload", () => {
		expect(deleteRuleMessageSchema.safeParse({ type: "deleteRule", values: 42 }).success).toBe(false)
	})

	it("rejects a non-string relativePath", () => {
		expect(
			deleteRuleMessageSchema.safeParse({
				type: "deleteRule",
				values: { scope: "global", kind: "generic", relativePath: ["rule.md"] },
			}).success,
		).toBe(false)
	})

	it("rejects a message with the wrong type literal", () => {
		expect(deleteRuleMessageSchema.safeParse({ type: "openRuleFile", values: {} }).success).toBe(false)
	})
})

describe("openRuleFileMessageSchema", () => {
	it("accepts a valid message with typed values", () => {
		const result = openRuleFileMessageSchema.safeParse({
			type: "openRuleFile",
			values: { scope: "project", kind: "mode", relativePath: "code/rule.md", modeSlug: "code" },
		})
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.values?.modeSlug).toBe("code")
		}
	})

	it("accepts a message with the legacy text fallback (no values)", () => {
		expect(openRuleFileMessageSchema.safeParse({ type: "openRuleFile", text: "rule.md" }).success).toBe(true)
	})

	it("rejects an invalid kind enum value", () => {
		expect(
			openRuleFileMessageSchema.safeParse({
				type: "openRuleFile",
				values: { scope: "global", kind: "special", relativePath: "rule.md" },
			}).success,
		).toBe(false)
	})

	it("rejects a message with the wrong type literal", () => {
		expect(openRuleFileMessageSchema.safeParse({ type: "openRulesDirectory", values: {} }).success).toBe(false)
	})
})

describe("openRulesDirectoryMessageSchema", () => {
	it("accepts a valid message with typed values", () => {
		const result = openRulesDirectoryMessageSchema.safeParse({
			type: "openRulesDirectory",
			values: { scope: "project", kind: "mode", modeSlug: "code" },
		})
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.values?.scope).toBe("project")
			expect(result.data.values?.kind).toBe("mode")
			expect(result.data.values?.modeSlug).toBe("code")
		}
	})

	it("accepts a message without values (handler validates)", () => {
		expect(openRulesDirectoryMessageSchema.safeParse({ type: "openRulesDirectory" }).success).toBe(true)
	})

	it("rejects an invalid scope enum value", () => {
		expect(
			openRulesDirectoryMessageSchema.safeParse({
				type: "openRulesDirectory",
				values: { scope: "team", kind: "generic" },
			}).success,
		).toBe(false)
	})

	it("rejects a non-object values payload", () => {
		expect(openRulesDirectoryMessageSchema.safeParse({ type: "openRulesDirectory", values: "x" }).success).toBe(
			false,
		)
	})

	it("rejects a message with the wrong type literal", () => {
		expect(openRulesDirectoryMessageSchema.safeParse({ type: "openRuleFile", values: {} }).success).toBe(false)
	})
})

describe("rulesMessageSchema (discriminated union)", () => {
	it("narrows to createRule with typed values", () => {
		const parsed = rulesMessageSchema.safeParse({
			type: "createRule",
			values: { scope: "project", kind: "generic", fileName: "new.md" },
		})
		expect(parsed.success).toBe(true)
		if (parsed.success && parsed.data.type === "createRule") {
			expect(parsed.data.values?.scope).toBe("project")
			expect(parsed.data.values?.kind).toBe("generic")
		}
	})

	it("narrows to openRulesDirectory", () => {
		const parsed = rulesMessageSchema.safeParse({
			type: "openRulesDirectory",
			values: { scope: "global", kind: "generic" },
		})
		expect(parsed.success).toBe(true)
		if (parsed.success && parsed.data.type === "openRulesDirectory") {
			expect(parsed.data.values?.scope).toBe("global")
		}
	})

	it("rejects malformed members (createRule with invalid scope enum)", () => {
		expect(
			rulesMessageSchema.safeParse({
				type: "createRule",
				values: { scope: "team", kind: "generic", fileName: "new.md" },
			}).success,
		).toBe(false)
		expect(
			rulesMessageSchema.safeParse({
				type: "openRulesDirectory",
				values: { scope: "project", kind: "bogus" },
			}).success,
		).toBe(false)
	})

	it("rejects a type outside the domain", () => {
		expect(rulesMessageSchema.safeParse({ type: "createSkill", skillName: "x", source: "global" }).success).toBe(
			false,
		)
	})
})

describe("parseWebviewMessage boundary for rules", () => {
	it("accepts a valid requestRules message at the boundary", () => {
		const result = parseWebviewMessage({ type: "requestRules" })
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.message.type).toBe("requestRules")
		}
	})

	it("accepts a valid createRule message at the boundary", () => {
		const result = parseWebviewMessage({
			type: "createRule",
			values: { scope: "project", kind: "generic", fileName: "new.md" },
		})
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.message.type).toBe("createRule")
		}
	})

	it("rejects a malformed createRule (invalid scope enum) at the boundary", () => {
		const result = parseWebviewMessage({
			type: "createRule",
			values: { scope: "team", kind: "generic", fileName: "new.md" },
		})
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.error).toContain("createRule")
		}
	})

	it("rejects a malformed openRuleFile (invalid kind enum) at the boundary", () => {
		const result = parseWebviewMessage({
			type: "openRuleFile",
			values: { scope: "global", kind: "special", relativePath: "rule.md" },
		})
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.error).toContain("openRuleFile")
		}
	})
})
