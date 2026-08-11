import { describe, it, expect } from "vitest"

import {
	extensionMessageSchemas,
	parseExtensionMessage,
	rooHistoryImportProgressMessageSchema,
	rulesMessageSchema,
	skillsMessageSchema,
	skillsRulesMessageSchema,
} from "../index.js"

const validSkill = {
	name: "frontend",
	description: "Use for React/Tailwind work",
	path: "/workspace/.roo/skills/frontend/SKILL.md",
	source: "project" as const,
	modeSlugs: ["code", "ui-expert"],
}

const validSkillWithLegacyMode = {
	...validSkill,
	source: "global" as const,
	mode: "architect",
}

const validRule = {
	id: "project.generic",
	name: "Project Conventions",
	scope: "project" as const,
	kind: "generic" as const,
	filePath: "/workspace/.roo/rules/project.generic.md",
	relativePath: ".roo/rules/project.generic.md",
	directoryPath: "/workspace/.roo/rules",
}

const validRuleWithMode = {
	...validRule,
	scope: "global" as const,
	kind: "mode" as const,
	modeSlug: "code",
	modeName: "Code",
	description: "Mode-scoped rule",
	isSymlink: true,
}

const validImportProgress = {
	status: "copying" as const,
	copiedFileCount: 2,
	totalFileCount: 8,
	importedTaskCount: 1,
	totalTaskCount: 3,
	currentTaskId: "task-1",
	currentFileName: "ui_messages.json",
}

describe("skills/rules/history-import domain (Phase 2, Domain 8) schemas", () => {
	describe("valid messages", () => {
		it.each([
			["skills (full metadata with modeSlugs)", skillsMessageSchema, { type: "skills", skills: [validSkill] }],
			["skills (legacy mode field)", skillsMessageSchema, { type: "skills", skills: [validSkillWithLegacyMode] }],
			["skills (empty list)", skillsMessageSchema, { type: "skills", skills: [] }],
			[
				"skills (omitted skills array — mirrors the optional flat interface)",
				skillsMessageSchema,
				{ type: "skills" },
			],
			["rules (generic project rule)", rulesMessageSchema, { type: "rules", rules: [validRule] }],
			[
				"rules (mode-scoped rule with optional fields)",
				rulesMessageSchema,
				{ type: "rules", rules: [validRuleWithMode] },
			],
			["rules (empty list)", rulesMessageSchema, { type: "rules", rules: [] }],
			[
				"rules (omitted rules array — mirrors the optional flat interface)",
				rulesMessageSchema,
				{ type: "rules" },
			],
			[
				"rooHistoryImportProgress (starting, minimal)",
				rooHistoryImportProgressMessageSchema,
				{
					type: "rooHistoryImportProgress",
					rooHistoryImportProgress: {
						status: "starting",
						copiedFileCount: 0,
						totalFileCount: 0,
						importedTaskCount: 0,
						totalTaskCount: 0,
					},
				},
			],
			[
				"rooHistoryImportProgress (copying with optional fields)",
				rooHistoryImportProgressMessageSchema,
				{ type: "rooHistoryImportProgress", rooHistoryImportProgress: validImportProgress },
			],
			[
				"rooHistoryImportProgress (finished)",
				rooHistoryImportProgressMessageSchema,
				{
					type: "rooHistoryImportProgress",
					rooHistoryImportProgress: {
						status: "finished",
						copiedFileCount: 8,
						totalFileCount: 8,
						importedTaskCount: 3,
						totalTaskCount: 3,
					},
				},
			],
			[
				"rooHistoryImportProgress (failed)",
				rooHistoryImportProgressMessageSchema,
				{
					type: "rooHistoryImportProgress",
					rooHistoryImportProgress: {
						status: "failed",
						copiedFileCount: 1,
						totalFileCount: 4,
						importedTaskCount: 0,
						totalTaskCount: 2,
					},
				},
			],
		])("accepts %s", (_name, schema, payload) => {
			const result = schema.safeParse(payload)
			expect(result.success).toBe(true)
		})
	})

	describe("malformed messages", () => {
		it.each([
			[
				"skills (skill missing name)",
				skillsMessageSchema,
				{ type: "skills", skills: [{ description: "desc", path: "/p", source: "project" }] },
			],
			[
				"skills (invalid source enum)",
				skillsMessageSchema,
				{ type: "skills", skills: [{ ...validSkill, source: "bogus" }] },
			],
			["skills (non-array skills)", skillsMessageSchema, { type: "skills", skills: "nope" }],
			[
				"rules (rule missing id)",
				rulesMessageSchema,
				{ type: "rules", rules: [{ name: "x", scope: "project", kind: "generic" }] },
			],
			[
				"rules (invalid kind enum)",
				rulesMessageSchema,
				{ type: "rules", rules: [{ ...validRule, kind: "bogus" }] },
			],
			["rules (non-array rules)", rulesMessageSchema, { type: "rules", rules: "nope" }],
			[
				"rooHistoryImportProgress (missing payload)",
				rooHistoryImportProgressMessageSchema,
				{ type: "rooHistoryImportProgress" },
			],
			[
				"rooHistoryImportProgress (invalid status)",
				rooHistoryImportProgressMessageSchema,
				{
					type: "rooHistoryImportProgress",
					rooHistoryImportProgress: {
						status: "in-progress",
						copiedFileCount: 0,
						totalFileCount: 0,
						importedTaskCount: 0,
						totalTaskCount: 0,
					},
				},
			],
			[
				"rooHistoryImportProgress (non-numeric copiedFileCount)",
				rooHistoryImportProgressMessageSchema,
				{
					type: "rooHistoryImportProgress",
					rooHistoryImportProgress: { ...validImportProgress, copiedFileCount: "two" },
				},
			],
			[
				"rooHistoryImportProgress (wrong type discriminator)",
				rooHistoryImportProgressMessageSchema,
				{ type: "rooHistoryImportProgressX", rooHistoryImportProgress: validImportProgress },
			],
		])("rejects %s", (_name, schema, payload) => {
			const result = schema.safeParse(payload)
			expect(result.success).toBe(false)
		})
	})

	describe("parseExtensionMessage boundary", () => {
		it("strictly validates a registered skills message and retains consumer-read fields", () => {
			const result = parseExtensionMessage({ type: "skills", skills: [validSkill] })
			expect(result.ok).toBe(true)
			if (result.ok) {
				expect(result.message.type).toBe("skills")
				// The consumer (`ExtensionStateContext.tsx`) reads `message.skills` —
				// zod must NOT strip it.
				expect(result.message.skills).toEqual([validSkill])
			}
		})

		it("strictly validates a registered rules message and retains consumer-read fields", () => {
			const result = parseExtensionMessage({ type: "rules", rules: [validRuleWithMode] })
			expect(result.ok).toBe(true)
			if (result.ok) {
				expect(result.message.type).toBe("rules")
				expect(result.message.rules).toEqual([validRuleWithMode])
			}
		})

		it("strictly validates a registered rooHistoryImportProgress and retains consumer-read fields", () => {
			const result = parseExtensionMessage({
				type: "rooHistoryImportProgress",
				rooHistoryImportProgress: validImportProgress,
			})
			expect(result.ok).toBe(true)
			if (result.ok) {
				expect(result.message.type).toBe("rooHistoryImportProgress")
				// The consumer (`About.tsx`) reads `status`, `copiedFileCount`,
				// `totalFileCount`, `importedTaskCount` and `totalTaskCount` — zod
				// must NOT strip any of them.
				expect(result.message.rooHistoryImportProgress).toEqual(validImportProgress)
			}
		})

		it("rejects a malformed registered skills message", () => {
			const result = parseExtensionMessage({ type: "skills", skills: "nope" })
			expect(result.ok).toBe(false)
			if (!result.ok) {
				expect(result.error).toContain("skills")
			}
		})

		it("rejects a malformed registered rules message", () => {
			const result = parseExtensionMessage({ type: "rules", rules: "nope" })
			expect(result.ok).toBe(false)
			if (!result.ok) {
				expect(result.error).toContain("rules")
			}
		})

		it("rejects a malformed registered rooHistoryImportProgress message", () => {
			const result = parseExtensionMessage({
				type: "rooHistoryImportProgress",
				rooHistoryImportProgress: { status: "starting" },
			})
			expect(result.ok).toBe(false)
			if (!result.ok) {
				expect(result.error).toContain("rooHistoryImportProgress")
			}
		})
	})

	describe("registry seeding", () => {
		const domainTypes = ["skills", "rules", "rooHistoryImportProgress"] as const

		it("seeds every skills/rules/history-import type into the registry", () => {
			for (const type of domainTypes) {
				expect(extensionMessageSchemas[type]).toBeDefined()
			}
		})

		it("builds a discriminated union over the domain's registered types", () => {
			const parsed = skillsRulesMessageSchema.safeParse({
				type: "rooHistoryImportProgress",
				rooHistoryImportProgress: validImportProgress,
			})
			expect(parsed.success).toBe(true)
			if (parsed.success) {
				expect(parsed.data.type).toBe("rooHistoryImportProgress")
			}
		})
	})
})
