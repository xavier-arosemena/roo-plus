import { describe, it, expect } from "vitest"

import {
	downloadErrorDiagnosticsMessageSchema,
	debugMessageSchema,
	openDebugApiHistoryMessageSchema,
	openDebugUiHistoryMessageSchema,
	parseWebviewMessage,
} from "../index.js"

describe("empty-payload debug schemas", () => {
	it.each([
		["openDebugApiHistory", openDebugApiHistoryMessageSchema],
		["openDebugUiHistory", openDebugUiHistoryMessageSchema],
	] as const)("accepts %s with only the type literal", (type, schema) => {
		const result = schema.safeParse({ type })
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.type).toBe(type)
		}
	})

	it.each([
		["openDebugApiHistory", openDebugApiHistoryMessageSchema],
		["openDebugUiHistory", openDebugUiHistoryMessageSchema],
	] as const)("rejects %s with the wrong type literal", (type, schema) => {
		expect(schema.safeParse({ type: "downloadErrorDiagnostics" }).success).toBe(false)
		expect(schema.safeParse({ type }).success).toBe(true)
	})

	it("rejects a non-object payload", () => {
		expect(openDebugApiHistoryMessageSchema.safeParse(null).success).toBe(false)
		expect(openDebugUiHistoryMessageSchema.safeParse("openDebugUiHistory").success).toBe(false)
	})
})

describe("downloadErrorDiagnosticsMessageSchema", () => {
	it("accepts a full error-metadata payload (the ErrorRow.tsx sender shape)", () => {
		const result = downloadErrorDiagnosticsMessageSchema.safeParse({
			type: "downloadErrorDiagnostics",
			values: {
				timestamp: "2025-01-01T00:00:00.000Z",
				version: "1.2.3",
				provider: "test-provider",
				model: "test-model",
				details: "Sample error details",
			},
		})
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.values?.provider).toBe("test-provider")
			expect(result.data.values?.details).toBe("Sample error details")
		}
	})

	it("accepts a message without values (handler defaults each field)", () => {
		expect(downloadErrorDiagnosticsMessageSchema.safeParse({ type: "downloadErrorDiagnostics" }).success).toBe(true)
	})

	it("accepts an empty values object", () => {
		expect(
			downloadErrorDiagnosticsMessageSchema.safeParse({ type: "downloadErrorDiagnostics", values: {} }).success,
		).toBe(true)
	})

	it("rejects a non-object values field", () => {
		expect(
			downloadErrorDiagnosticsMessageSchema.safeParse({ type: "downloadErrorDiagnostics", values: "nope" })
				.success,
		).toBe(false)
	})

	it("rejects non-string metadata fields", () => {
		expect(
			downloadErrorDiagnosticsMessageSchema.safeParse({
				type: "downloadErrorDiagnostics",
				values: { version: 42 },
			}).success,
		).toBe(false)
	})

	it("rejects the wrong type literal", () => {
		expect(
			downloadErrorDiagnosticsMessageSchema.safeParse({ type: "openDebugApiHistory", values: {} }).success,
		).toBe(false)
	})
})

describe("debugMessageSchema union", () => {
	it("narrows to openDebugApiHistory", () => {
		const parsed = debugMessageSchema.safeParse({ type: "openDebugApiHistory" })
		expect(parsed.success).toBe(true)
		if (parsed.success) {
			expect(parsed.data.type).toBe("openDebugApiHistory")
		}
	})

	it("narrows to downloadErrorDiagnostics", () => {
		const parsed = debugMessageSchema.safeParse({
			type: "downloadErrorDiagnostics",
			values: { model: "m" },
		})
		expect(parsed.success).toBe(true)
		if (parsed.success && parsed.data.type === "downloadErrorDiagnostics") {
			expect(parsed.data.values?.model).toBe("m")
		}
	})

	it("rejects a type outside the domain", () => {
		expect(debugMessageSchema.safeParse({ type: "webviewDidLaunch" }).success).toBe(false)
	})
})

describe("parseWebviewMessage boundary for debug", () => {
	it("accepts a valid openDebugApiHistory message at the boundary", () => {
		const result = parseWebviewMessage({ type: "openDebugApiHistory" })
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.message.type).toBe("openDebugApiHistory")
		}
	})

	it("accepts a valid openDebugUiHistory message at the boundary", () => {
		const result = parseWebviewMessage({ type: "openDebugUiHistory" })
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.message.type).toBe("openDebugUiHistory")
		}
	})

	it("accepts a valid downloadErrorDiagnostics message at the boundary", () => {
		const result = parseWebviewMessage({
			type: "downloadErrorDiagnostics",
			values: { details: "boom" },
		})
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.message.type).toBe("downloadErrorDiagnostics")
		}
	})

	it("rejects a crafted downloadErrorDiagnostics message with a non-object values at the boundary", () => {
		const result = parseWebviewMessage({ type: "downloadErrorDiagnostics", values: "nope" })
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.error).toContain("downloadErrorDiagnostics")
		}
	})
})
