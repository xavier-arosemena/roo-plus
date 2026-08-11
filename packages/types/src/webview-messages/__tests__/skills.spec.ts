import { describe, it, expect } from "vitest"

import {
	requestSkillsMessageSchema,
	createSkillMessageSchema,
	deleteSkillMessageSchema,
	moveSkillMessageSchema,
	updateSkillModesMessageSchema,
	openSkillFileMessageSchema,
	skillsMessageSchema,
	parseWebviewMessage,
} from "../index.js"

describe("requestSkillsMessageSchema", () => {
	it("accepts an empty-payload message", () => {
		const result = requestSkillsMessageSchema.safeParse({ type: "requestSkills" })
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.type).toBe("requestSkills")
		}
	})

	it("rejects a message with the wrong type literal", () => {
		expect(requestSkillsMessageSchema.safeParse({ type: "createSkill" }).success).toBe(false)
	})

	it("rejects a non-object payload", () => {
		expect(requestSkillsMessageSchema.safeParse("requestSkills").success).toBe(false)
		expect(requestSkillsMessageSchema.safeParse(null).success).toBe(false)
	})
})

describe("createSkillMessageSchema", () => {
	it("accepts a valid message with only the required fields", () => {
		const result = createSkillMessageSchema.safeParse({
			type: "createSkill",
			skillName: "my-skill",
			source: "global",
			skillDescription: "A skill",
		})
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.skillName).toBe("my-skill")
			expect(result.data.source).toBe("global")
			expect(result.data.skillDescription).toBe("A skill")
		}
	})

	it("accepts a valid message with skillModeSlugs and the legacy skillMode fallback", () => {
		const result = createSkillMessageSchema.safeParse({
			type: "createSkill",
			skillName: "my-skill",
			source: "project",
			skillDescription: "A skill",
			skillModeSlugs: ["code", "architect"],
			skillMode: "code",
		})
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.skillModeSlugs).toEqual(["code", "architect"])
			expect(result.data.skillMode).toBe("code")
		}
	})

	it("rejects a message missing the required skillName", () => {
		expect(
			createSkillMessageSchema.safeParse({
				type: "createSkill",
				source: "global",
				skillDescription: "A skill",
			}).success,
		).toBe(false)
	})

	it("rejects a message missing the required source", () => {
		expect(
			createSkillMessageSchema.safeParse({
				type: "createSkill",
				skillName: "my-skill",
				skillDescription: "A skill",
			}).success,
		).toBe(false)
	})

	it("rejects a message missing the required skillDescription", () => {
		expect(
			createSkillMessageSchema.safeParse({
				type: "createSkill",
				skillName: "my-skill",
				source: "global",
			}).success,
		).toBe(false)
	})

	it("rejects an invalid source enum value", () => {
		expect(
			createSkillMessageSchema.safeParse({
				type: "createSkill",
				skillName: "my-skill",
				source: "team",
				skillDescription: "A skill",
			}).success,
		).toBe(false)
	})

	it("rejects a non-string skillName", () => {
		expect(
			createSkillMessageSchema.safeParse({
				type: "createSkill",
				skillName: 42,
				source: "global",
				skillDescription: "A skill",
			}).success,
		).toBe(false)
	})

	it("rejects non-string skillModeSlugs array elements", () => {
		expect(
			createSkillMessageSchema.safeParse({
				type: "createSkill",
				skillName: "my-skill",
				source: "global",
				skillDescription: "A skill",
				skillModeSlugs: ["code", 42],
			}).success,
		).toBe(false)
	})

	it("rejects a message with the wrong type literal", () => {
		expect(
			createSkillMessageSchema.safeParse({
				type: "deleteSkill",
				skillName: "my-skill",
				source: "global",
				skillDescription: "A skill",
			}).success,
		).toBe(false)
	})

	it("rejects a non-object payload", () => {
		expect(createSkillMessageSchema.safeParse("createSkill").success).toBe(false)
		expect(createSkillMessageSchema.safeParse([]).success).toBe(false)
	})
})

describe("deleteSkillMessageSchema", () => {
	it("accepts a valid message with only the required fields", () => {
		const result = deleteSkillMessageSchema.safeParse({
			type: "deleteSkill",
			skillName: "my-skill",
			source: "project",
		})
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.skillName).toBe("my-skill")
			expect(result.data.source).toBe("project")
		}
	})

	it("accepts a valid message with skillModeSlugs", () => {
		const result = deleteSkillMessageSchema.safeParse({
			type: "deleteSkill",
			skillName: "my-skill",
			source: "global",
			skillModeSlugs: ["code"],
		})
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.skillModeSlugs).toEqual(["code"])
		}
	})

	it("rejects a message missing the required source", () => {
		expect(deleteSkillMessageSchema.safeParse({ type: "deleteSkill", skillName: "my-skill" }).success).toBe(false)
	})

	it("rejects an invalid source enum value", () => {
		expect(
			deleteSkillMessageSchema.safeParse({ type: "deleteSkill", skillName: "my-skill", source: "built-in" })
				.success,
		).toBe(false)
	})

	it("rejects non-string skillModeSlugs array elements", () => {
		expect(
			deleteSkillMessageSchema.safeParse({
				type: "deleteSkill",
				skillName: "my-skill",
				source: "global",
				skillModeSlugs: [1],
			}).success,
		).toBe(false)
	})

	it("rejects a message with the wrong type literal", () => {
		expect(
			deleteSkillMessageSchema.safeParse({ type: "moveSkill", skillName: "my-skill", source: "global" }).success,
		).toBe(false)
	})
})

describe("moveSkillMessageSchema", () => {
	it("accepts a valid message with only the required fields", () => {
		const result = moveSkillMessageSchema.safeParse({ type: "moveSkill", skillName: "my-skill", source: "global" })
		expect(result.success).toBe(true)
	})

	it("accepts a valid message with skillMode and newSkillMode", () => {
		const result = moveSkillMessageSchema.safeParse({
			type: "moveSkill",
			skillName: "my-skill",
			source: "project",
			skillMode: "code",
			newSkillMode: "architect",
		})
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.skillMode).toBe("code")
			expect(result.data.newSkillMode).toBe("architect")
		}
	})

	it("rejects a message missing the required skillName", () => {
		expect(moveSkillMessageSchema.safeParse({ type: "moveSkill", source: "global" }).success).toBe(false)
	})

	it("rejects a non-string newSkillMode", () => {
		expect(
			moveSkillMessageSchema.safeParse({
				type: "moveSkill",
				skillName: "my-skill",
				source: "global",
				newSkillMode: 42,
			}).success,
		).toBe(false)
	})

	it("rejects a message with the wrong type literal", () => {
		expect(
			moveSkillMessageSchema.safeParse({ type: "updateSkillModes", skillName: "my-skill", source: "global" })
				.success,
		).toBe(false)
	})
})

describe("updateSkillModesMessageSchema", () => {
	it("accepts a valid message with only the required fields", () => {
		const result = updateSkillModesMessageSchema.safeParse({
			type: "updateSkillModes",
			skillName: "my-skill",
			source: "global",
		})
		expect(result.success).toBe(true)
	})

	it("accepts a valid message with newSkillModeSlugs", () => {
		const result = updateSkillModesMessageSchema.safeParse({
			type: "updateSkillModes",
			skillName: "my-skill",
			source: "project",
			newSkillModeSlugs: ["code"],
		})
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.newSkillModeSlugs).toEqual(["code"])
		}
	})

	it("rejects a message missing the required source", () => {
		expect(
			updateSkillModesMessageSchema.safeParse({ type: "updateSkillModes", skillName: "my-skill" }).success,
		).toBe(false)
	})

	it("rejects non-string newSkillModeSlugs array elements", () => {
		expect(
			updateSkillModesMessageSchema.safeParse({
				type: "updateSkillModes",
				skillName: "my-skill",
				source: "global",
				newSkillModeSlugs: ["code", null],
			}).success,
		).toBe(false)
	})

	it("rejects a message with the wrong type literal", () => {
		expect(
			updateSkillModesMessageSchema.safeParse({ type: "openSkillFile", skillName: "my-skill", source: "global" })
				.success,
		).toBe(false)
	})
})

describe("openSkillFileMessageSchema", () => {
	it("accepts a valid message with the required fields", () => {
		const result = openSkillFileMessageSchema.safeParse({
			type: "openSkillFile",
			skillName: "my-skill",
			source: "global",
		})
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.skillName).toBe("my-skill")
			expect(result.data.source).toBe("global")
		}
	})

	it("rejects a message missing the required skillName", () => {
		expect(openSkillFileMessageSchema.safeParse({ type: "openSkillFile", source: "global" }).success).toBe(false)
	})

	it("rejects a message missing the required source", () => {
		expect(openSkillFileMessageSchema.safeParse({ type: "openSkillFile", skillName: "my-skill" }).success).toBe(
			false,
		)
	})

	it("rejects an invalid source enum value", () => {
		expect(
			openSkillFileMessageSchema.safeParse({ type: "openSkillFile", skillName: "my-skill", source: "other" })
				.success,
		).toBe(false)
	})

	it("rejects a message with the wrong type literal", () => {
		expect(
			openSkillFileMessageSchema.safeParse({ type: "deleteSkill", skillName: "my-skill", source: "global" })
				.success,
		).toBe(false)
	})
})

describe("skillsMessageSchema (discriminated union)", () => {
	it("narrows to createSkill with typed fields", () => {
		const parsed = skillsMessageSchema.safeParse({
			type: "createSkill",
			skillName: "my-skill",
			source: "global",
			skillDescription: "A skill",
		})
		expect(parsed.success).toBe(true)
		if (parsed.success && parsed.data.type === "createSkill") {
			expect(parsed.data.skillName).toBe("my-skill")
			expect(parsed.data.source).toBe("global")
			expect(parsed.data.skillDescription).toBe("A skill")
		}
	})

	it("narrows to requestSkills (empty payload)", () => {
		const parsed = skillsMessageSchema.safeParse({ type: "requestSkills" })
		expect(parsed.success).toBe(true)
		if (parsed.success) {
			expect(parsed.data.type).toBe("requestSkills")
		}
	})

	it("rejects malformed members (createSkill missing source)", () => {
		expect(skillsMessageSchema.safeParse({ type: "createSkill", skillName: "my-skill" }).success).toBe(false)
		expect(skillsMessageSchema.safeParse({ type: "deleteSkill" }).success).toBe(false)
	})

	it("rejects a type outside the domain", () => {
		expect(skillsMessageSchema.safeParse({ type: "createRule", values: {} }).success).toBe(false)
	})
})

describe("parseWebviewMessage boundary for skills", () => {
	it("accepts a valid requestSkills message at the boundary", () => {
		const result = parseWebviewMessage({ type: "requestSkills" })
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.message.type).toBe("requestSkills")
		}
	})

	it("accepts a valid createSkill message at the boundary", () => {
		const result = parseWebviewMessage({
			type: "createSkill",
			skillName: "my-skill",
			source: "global",
			skillDescription: "A skill",
		})
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.message.type).toBe("createSkill")
		}
	})

	it("rejects a malformed createSkill (missing source) at the boundary", () => {
		const result = parseWebviewMessage({ type: "createSkill", skillName: "my-skill" })
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.error).toContain("createSkill")
		}
	})

	it("rejects a malformed deleteSkill (invalid source enum) at the boundary", () => {
		const result = parseWebviewMessage({ type: "deleteSkill", skillName: "my-skill", source: "team" })
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.error).toContain("deleteSkill")
		}
	})
})
