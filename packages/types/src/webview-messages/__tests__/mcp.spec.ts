import { describe, it, expect } from "vitest"

import {
	deleteMcpServerMessageSchema,
	openMcpSettingsMessageSchema,
	openProjectMcpSettingsMessageSchema,
	refreshAllMcpServersMessageSchema,
	restartMcpServerMessageSchema,
	toggleMcpServerMessageSchema,
	toggleToolAlwaysAllowMessageSchema,
	toggleToolEnabledForPromptMessageSchema,
	updateMcpTimeoutMessageSchema,
	mcpMessageSchema,
	parseWebviewMessage,
} from "../index.js"

describe("deleteMcpServerMessageSchema", () => {
	it("accepts a valid message with serverName and source", () => {
		const result = deleteMcpServerMessageSchema.safeParse({
			type: "deleteMcpServer",
			serverName: "my-server",
			source: "project",
		})
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.serverName).toBe("my-server")
			expect(result.data.source).toBe("project")
		}
	})

	it("accepts a message without the optional serverName/source (matches the interface)", () => {
		expect(deleteMcpServerMessageSchema.safeParse({ type: "deleteMcpServer" }).success).toBe(true)
	})

	it("rejects a non-string serverName", () => {
		expect(deleteMcpServerMessageSchema.safeParse({ type: "deleteMcpServer", serverName: 42 }).success).toBe(false)
	})

	it("rejects an invalid source enum", () => {
		expect(
			deleteMcpServerMessageSchema.safeParse({ type: "deleteMcpServer", serverName: "s", source: "workspace" })
				.success,
		).toBe(false)
	})

	it("rejects a message with the wrong type literal", () => {
		expect(deleteMcpServerMessageSchema.safeParse({ type: "restartMcpServer", text: "s" }).success).toBe(false)
	})

	it("rejects a non-object payload", () => {
		expect(deleteMcpServerMessageSchema.safeParse("deleteMcpServer").success).toBe(false)
	})
})

describe("openMcpSettingsMessageSchema", () => {
	it("accepts a valid empty message", () => {
		const result = openMcpSettingsMessageSchema.safeParse({ type: "openMcpSettings" })
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.type).toBe("openMcpSettings")
		}
	})

	it("rejects a message with the wrong type literal", () => {
		expect(openMcpSettingsMessageSchema.safeParse({ type: "openProjectMcpSettings" }).success).toBe(false)
	})

	it("rejects a non-object payload", () => {
		expect(openMcpSettingsMessageSchema.safeParse(null).success).toBe(false)
	})
})

describe("openProjectMcpSettingsMessageSchema", () => {
	it("accepts a valid empty message", () => {
		const result = openProjectMcpSettingsMessageSchema.safeParse({ type: "openProjectMcpSettings" })
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.type).toBe("openProjectMcpSettings")
		}
	})

	it("rejects a message with the wrong type literal", () => {
		expect(openProjectMcpSettingsMessageSchema.safeParse({ type: "openMcpSettings" }).success).toBe(false)
	})

	it("rejects a non-object payload", () => {
		expect(openProjectMcpSettingsMessageSchema.safeParse([]).success).toBe(false)
	})
})

describe("restartMcpServerMessageSchema", () => {
	it("accepts a valid message with text and source", () => {
		const result = restartMcpServerMessageSchema.safeParse({
			type: "restartMcpServer",
			text: "my-server",
			source: "global",
		})
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.text).toBe("my-server")
			expect(result.data.source).toBe("global")
		}
	})

	it("rejects a message missing the required text", () => {
		expect(restartMcpServerMessageSchema.safeParse({ type: "restartMcpServer" }).success).toBe(false)
	})

	it("rejects a non-string text", () => {
		expect(restartMcpServerMessageSchema.safeParse({ type: "restartMcpServer", text: 42 }).success).toBe(false)
	})

	it("rejects an invalid source enum", () => {
		expect(
			restartMcpServerMessageSchema.safeParse({ type: "restartMcpServer", text: "s", source: "workspace" })
				.success,
		).toBe(false)
	})

	it("rejects a message with the wrong type literal", () => {
		expect(restartMcpServerMessageSchema.safeParse({ type: "deleteMcpServer", serverName: "s" }).success).toBe(
			false,
		)
	})

	it("rejects a non-object payload", () => {
		expect(restartMcpServerMessageSchema.safeParse("restartMcpServer").success).toBe(false)
	})
})

describe("toggleToolAlwaysAllowMessageSchema", () => {
	const valid = {
		type: "toggleToolAlwaysAllow",
		serverName: "s",
		toolName: "tool",
		source: "global",
		alwaysAllow: true,
	}

	it("accepts a valid message", () => {
		const result = toggleToolAlwaysAllowMessageSchema.safeParse(valid)
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.serverName).toBe("s")
			expect(result.data.toolName).toBe("tool")
			expect(result.data.alwaysAllow).toBe(true)
		}
	})

	it("accepts a message without the optional alwaysAllow/source", () => {
		expect(
			toggleToolAlwaysAllowMessageSchema.safeParse({
				type: "toggleToolAlwaysAllow",
				serverName: "s",
				toolName: "t",
			}).success,
		).toBe(true)
	})

	it("rejects a message missing the required serverName", () => {
		expect(
			toggleToolAlwaysAllowMessageSchema.safeParse({ type: "toggleToolAlwaysAllow", toolName: "t" }).success,
		).toBe(false)
	})

	it("rejects a message missing the required toolName", () => {
		expect(
			toggleToolAlwaysAllowMessageSchema.safeParse({ type: "toggleToolAlwaysAllow", serverName: "s" }).success,
		).toBe(false)
	})

	it("rejects a non-string serverName", () => {
		expect(
			toggleToolAlwaysAllowMessageSchema.safeParse({
				type: "toggleToolAlwaysAllow",
				serverName: 42,
				toolName: "t",
			}).success,
		).toBe(false)
	})

	it("rejects a non-boolean alwaysAllow", () => {
		expect(
			toggleToolAlwaysAllowMessageSchema.safeParse({
				type: "toggleToolAlwaysAllow",
				serverName: "s",
				toolName: "t",
				alwaysAllow: "yes",
			}).success,
		).toBe(false)
	})

	it("rejects an invalid source enum", () => {
		expect(
			toggleToolAlwaysAllowMessageSchema.safeParse({
				type: "toggleToolAlwaysAllow",
				serverName: "s",
				toolName: "t",
				source: "workspace",
			}).success,
		).toBe(false)
	})

	it("rejects a message with the wrong type literal", () => {
		expect(
			toggleToolAlwaysAllowMessageSchema.safeParse({
				type: "toggleToolEnabledForPrompt",
				serverName: "s",
				toolName: "t",
			}).success,
		).toBe(false)
	})
})

describe("toggleToolEnabledForPromptMessageSchema", () => {
	const valid = {
		type: "toggleToolEnabledForPrompt",
		serverName: "s",
		toolName: "tool",
		source: "project",
		isEnabled: true,
	}

	it("accepts a valid message", () => {
		const result = toggleToolEnabledForPromptMessageSchema.safeParse(valid)
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.serverName).toBe("s")
			expect(result.data.toolName).toBe("tool")
			expect(result.data.isEnabled).toBe(true)
		}
	})

	it("accepts a message without the optional isEnabled/source", () => {
		expect(
			toggleToolEnabledForPromptMessageSchema.safeParse({
				type: "toggleToolEnabledForPrompt",
				serverName: "s",
				toolName: "t",
			}).success,
		).toBe(true)
	})

	it("rejects a message missing the required serverName", () => {
		expect(
			toggleToolEnabledForPromptMessageSchema.safeParse({
				type: "toggleToolEnabledForPrompt",
				toolName: "t",
			}).success,
		).toBe(false)
	})

	it("rejects a message missing the required toolName", () => {
		expect(
			toggleToolEnabledForPromptMessageSchema.safeParse({
				type: "toggleToolEnabledForPrompt",
				serverName: "s",
			}).success,
		).toBe(false)
	})

	it("rejects a non-boolean isEnabled", () => {
		expect(
			toggleToolEnabledForPromptMessageSchema.safeParse({
				type: "toggleToolEnabledForPrompt",
				serverName: "s",
				toolName: "t",
				isEnabled: 1,
			}).success,
		).toBe(false)
	})

	it("rejects an invalid source enum", () => {
		expect(
			toggleToolEnabledForPromptMessageSchema.safeParse({
				type: "toggleToolEnabledForPrompt",
				serverName: "s",
				toolName: "t",
				source: "bogus",
			}).success,
		).toBe(false)
	})
})

describe("toggleMcpServerMessageSchema", () => {
	it("accepts a valid message", () => {
		const result = toggleMcpServerMessageSchema.safeParse({
			type: "toggleMcpServer",
			serverName: "s",
			disabled: true,
			source: "global",
		})
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.serverName).toBe("s")
			expect(result.data.disabled).toBe(true)
		}
	})

	it("rejects a message missing the required disabled", () => {
		expect(toggleMcpServerMessageSchema.safeParse({ type: "toggleMcpServer", serverName: "s" }).success).toBe(false)
	})

	it("rejects a message missing the required serverName", () => {
		expect(toggleMcpServerMessageSchema.safeParse({ type: "toggleMcpServer", disabled: true }).success).toBe(false)
	})

	it("rejects a non-boolean disabled", () => {
		expect(
			toggleMcpServerMessageSchema.safeParse({
				type: "toggleMcpServer",
				serverName: "s",
				disabled: "yes",
			}).success,
		).toBe(false)
	})

	it("rejects a non-string serverName", () => {
		expect(
			toggleMcpServerMessageSchema.safeParse({ type: "toggleMcpServer", serverName: 42, disabled: true }).success,
		).toBe(false)
	})

	it("rejects an invalid source enum", () => {
		expect(
			toggleMcpServerMessageSchema.safeParse({
				type: "toggleMcpServer",
				serverName: "s",
				disabled: true,
				source: "workspace",
			}).success,
		).toBe(false)
	})

	it("rejects a message with the wrong type literal", () => {
		expect(toggleMcpServerMessageSchema.safeParse({ type: "restartMcpServer", text: "s" }).success).toBe(false)
	})
})

describe("refreshAllMcpServersMessageSchema", () => {
	it("accepts a valid empty message", () => {
		const result = refreshAllMcpServersMessageSchema.safeParse({ type: "refreshAllMcpServers" })
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.type).toBe("refreshAllMcpServers")
		}
	})

	it("rejects a message with the wrong type literal", () => {
		expect(refreshAllMcpServersMessageSchema.safeParse({ type: "openMcpSettings" }).success).toBe(false)
	})

	it("rejects a non-object payload", () => {
		expect(refreshAllMcpServersMessageSchema.safeParse("refreshAllMcpServers").success).toBe(false)
	})
})

describe("updateMcpTimeoutMessageSchema", () => {
	it("accepts a valid message", () => {
		const result = updateMcpTimeoutMessageSchema.safeParse({
			type: "updateMcpTimeout",
			serverName: "s",
			timeout: 60,
			source: "project",
		})
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.serverName).toBe("s")
			expect(result.data.timeout).toBe(60)
			expect(result.data.source).toBe("project")
		}
	})

	it("accepts a message without the optional serverName/timeout/source (matches the interface)", () => {
		expect(updateMcpTimeoutMessageSchema.safeParse({ type: "updateMcpTimeout" }).success).toBe(true)
	})

	it("rejects a non-number timeout", () => {
		expect(
			updateMcpTimeoutMessageSchema.safeParse({ type: "updateMcpTimeout", serverName: "s", timeout: "60" })
				.success,
		).toBe(false)
	})

	it("rejects a non-string serverName", () => {
		expect(
			updateMcpTimeoutMessageSchema.safeParse({ type: "updateMcpTimeout", serverName: 42, timeout: 60 }).success,
		).toBe(false)
	})

	it("rejects an invalid source enum", () => {
		expect(
			updateMcpTimeoutMessageSchema.safeParse({
				type: "updateMcpTimeout",
				serverName: "s",
				timeout: 60,
				source: "workspace",
			}).success,
		).toBe(false)
	})

	it("rejects a message with the wrong type literal", () => {
		expect(updateMcpTimeoutMessageSchema.safeParse({ type: "deleteMcpServer", serverName: "s" }).success).toBe(
			false,
		)
	})
})

describe("mcpMessageSchema (discriminated union)", () => {
	it("narrows to restartMcpServer", () => {
		const parsed = mcpMessageSchema.safeParse({ type: "restartMcpServer", text: "s" })
		expect(parsed.success).toBe(true)
		if (parsed.success && parsed.data.type === "restartMcpServer") {
			expect(parsed.data.text).toBe("s")
		}
	})

	it("narrows to toggleMcpServer", () => {
		const parsed = mcpMessageSchema.safeParse({ type: "toggleMcpServer", serverName: "s", disabled: true })
		expect(parsed.success).toBe(true)
		if (parsed.success && parsed.data.type === "toggleMcpServer") {
			expect(parsed.data.disabled).toBe(true)
		}
	})

	it("narrows to toggleToolAlwaysAllow", () => {
		const parsed = mcpMessageSchema.safeParse({
			type: "toggleToolAlwaysAllow",
			serverName: "s",
			toolName: "t",
			alwaysAllow: true,
		})
		expect(parsed.success).toBe(true)
		if (parsed.success && parsed.data.type === "toggleToolAlwaysAllow") {
			expect(parsed.data.alwaysAllow).toBe(true)
		}
	})

	it("rejects malformed members", () => {
		expect(mcpMessageSchema.safeParse({ type: "restartMcpServer" }).success).toBe(false)
		expect(mcpMessageSchema.safeParse({ type: "toggleMcpServer", serverName: "s" }).success).toBe(false)
		expect(mcpMessageSchema.safeParse({ type: "notAnMcpType" }).success).toBe(false)
	})

	it("rejects a type outside the domain", () => {
		expect(mcpMessageSchema.safeParse({ type: "newTask", text: "hi" }).success).toBe(false)
	})
})

describe("parseWebviewMessage boundary for mcp", () => {
	it("accepts a valid restartMcpServer message at the boundary", () => {
		const result = parseWebviewMessage({ type: "restartMcpServer", text: "my-server", source: "global" })
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.message.type).toBe("restartMcpServer")
		}
	})

	it("rejects a crafted restartMcpServer message missing text at the boundary", () => {
		const result = parseWebviewMessage({ type: "restartMcpServer" })
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.error).toContain("restartMcpServer")
		}
	})

	it("accepts a valid toggleMcpServer message at the boundary", () => {
		const result = parseWebviewMessage({ type: "toggleMcpServer", serverName: "s", disabled: true })
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.message.type).toBe("toggleMcpServer")
		}
	})

	it("rejects a crafted toggleMcpServer message with a non-boolean disabled at the boundary", () => {
		const result = parseWebviewMessage({ type: "toggleMcpServer", serverName: "s", disabled: "yes" })
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.error).toContain("toggleMcpServer")
		}
	})

	it("accepts a valid openMcpSettings message at the boundary", () => {
		const result = parseWebviewMessage({ type: "openMcpSettings" })
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.message.type).toBe("openMcpSettings")
		}
	})

	it("rejects a crafted updateMcpTimeout message with a non-number timeout at the boundary", () => {
		const result = parseWebviewMessage({ type: "updateMcpTimeout", serverName: "s", timeout: "60" })
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.error).toContain("updateMcpTimeout")
		}
	})
})
