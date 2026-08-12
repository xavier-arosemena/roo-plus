import { describe, it, expect } from "vitest"

import {
	openImageMessageSchema,
	saveImageMessageSchema,
	selectImagesMessageSchema,
	imagesMessageSchema,
	parseWebviewMessage,
} from "../index.js"

describe("openImageMessageSchema", () => {
	it("accepts a valid message with only the required text", () => {
		const result = openImageMessageSchema.safeParse({ type: "openImage", text: "/repo/img.png" })
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.text).toBe("/repo/img.png")
			expect(result.data.values).toBeUndefined()
		}
	})

	it("accepts a data-URI text", () => {
		const result = openImageMessageSchema.safeParse({
			type: "openImage",
			text: "data:image/png;base64,abc",
		})
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.text).toBe("data:image/png;base64,abc")
		}
	})

	it("accepts the legacy free-form values record", () => {
		const result = openImageMessageSchema.safeParse({
			type: "openImage",
			text: "/repo/img.png",
			values: { action: "copy" },
		})
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.values).toEqual({ action: "copy" })
		}
	})

	it("rejects a message missing the required text", () => {
		expect(openImageMessageSchema.safeParse({ type: "openImage" }).success).toBe(false)
	})

	it("rejects a non-string text", () => {
		expect(openImageMessageSchema.safeParse({ type: "openImage", text: 42 }).success).toBe(false)
		expect(openImageMessageSchema.safeParse({ type: "openImage", text: null }).success).toBe(false)
	})

	it("rejects a non-object values payload", () => {
		expect(openImageMessageSchema.safeParse({ type: "openImage", text: "/img.png", values: "copy" }).success).toBe(
			false,
		)
	})

	it("rejects a message with the wrong type literal", () => {
		expect(openImageMessageSchema.safeParse({ type: "saveImage", text: "/img.png" }).success).toBe(false)
	})

	it("rejects a non-object payload", () => {
		expect(openImageMessageSchema.safeParse("openImage").success).toBe(false)
		expect(openImageMessageSchema.safeParse(null).success).toBe(false)
	})
})

describe("saveImageMessageSchema", () => {
	it("accepts a valid message with a dataUri", () => {
		const result = saveImageMessageSchema.safeParse({
			type: "saveImage",
			dataUri: "data:image/png;base64,abc",
		})
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.dataUri).toBe("data:image/png;base64,abc")
		}
	})

	it("accepts a message without the optional dataUri (matches the interface guard)", () => {
		expect(saveImageMessageSchema.safeParse({ type: "saveImage" }).success).toBe(true)
	})

	it("rejects a non-string dataUri", () => {
		expect(saveImageMessageSchema.safeParse({ type: "saveImage", dataUri: 42 }).success).toBe(false)
		expect(saveImageMessageSchema.safeParse({ type: "saveImage", dataUri: ["data:"] }).success).toBe(false)
	})

	it("rejects a message with the wrong type literal", () => {
		expect(saveImageMessageSchema.safeParse({ type: "openImage", dataUri: "data:" }).success).toBe(false)
	})

	it("rejects a non-object payload", () => {
		expect(saveImageMessageSchema.safeParse("saveImage").success).toBe(false)
		expect(saveImageMessageSchema.safeParse([]).success).toBe(false)
	})
})

describe("selectImagesMessageSchema", () => {
	it("accepts an empty message (no context/messageTs)", () => {
		const result = selectImagesMessageSchema.safeParse({ type: "selectImages" })
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.context).toBeUndefined()
			expect(result.data.messageTs).toBeUndefined()
		}
	})

	it("accepts a message with context and messageTs", () => {
		const result = selectImagesMessageSchema.safeParse({ type: "selectImages", context: "edit", messageTs: 42 })
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.context).toBe("edit")
			expect(result.data.messageTs).toBe(42)
		}
	})

	it("rejects a non-string context", () => {
		expect(selectImagesMessageSchema.safeParse({ type: "selectImages", context: 42 }).success).toBe(false)
		expect(selectImagesMessageSchema.safeParse({ type: "selectImages", context: ["edit"] }).success).toBe(false)
	})

	it("rejects a non-number messageTs", () => {
		expect(selectImagesMessageSchema.safeParse({ type: "selectImages", messageTs: "42" }).success).toBe(false)
		expect(selectImagesMessageSchema.safeParse({ type: "selectImages", messageTs: null }).success).toBe(false)
	})

	it("rejects a message with the wrong type literal", () => {
		expect(selectImagesMessageSchema.safeParse({ type: "openImage", context: "edit" }).success).toBe(false)
	})

	it("rejects a non-object payload", () => {
		expect(selectImagesMessageSchema.safeParse("selectImages").success).toBe(false)
		expect(selectImagesMessageSchema.safeParse(null).success).toBe(false)
	})
})

describe("imagesMessageSchema (discriminated union)", () => {
	it("narrows to openImage", () => {
		const parsed = imagesMessageSchema.safeParse({ type: "openImage", text: "/img.png" })
		expect(parsed.success).toBe(true)
		if (parsed.success && parsed.data.type === "openImage") {
			expect(parsed.data.text).toBe("/img.png")
		}
	})

	it("narrows to saveImage", () => {
		const parsed = imagesMessageSchema.safeParse({ type: "saveImage", dataUri: "data:image/png;base64,abc" })
		expect(parsed.success).toBe(true)
		if (parsed.success && parsed.data.type === "saveImage") {
			expect(parsed.data.dataUri).toBe("data:image/png;base64,abc")
		}
	})

	it("narrows to selectImages", () => {
		const parsed = imagesMessageSchema.safeParse({ type: "selectImages", context: "edit", messageTs: 7 })
		expect(parsed.success).toBe(true)
		if (parsed.success && parsed.data.type === "selectImages") {
			expect(parsed.data.context).toBe("edit")
			expect(parsed.data.messageTs).toBe(7)
		}
	})

	it("rejects malformed members", () => {
		expect(imagesMessageSchema.safeParse({ type: "openImage" }).success).toBe(false)
		expect(imagesMessageSchema.safeParse({ type: "saveImage", dataUri: 42 }).success).toBe(false)
		expect(imagesMessageSchema.safeParse({ type: "selectImages", messageTs: "x" }).success).toBe(false)
	})

	it("rejects a type outside the domain", () => {
		expect(imagesMessageSchema.safeParse({ type: "newTask", text: "hi" }).success).toBe(false)
	})
})

describe("parseWebviewMessage boundary for images", () => {
	it("accepts a valid openImage message at the boundary", () => {
		const result = parseWebviewMessage({ type: "openImage", text: "/repo/img.png" })
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.message.type).toBe("openImage")
		}
	})

	it("rejects a crafted malformed openImage message at the boundary", () => {
		const result = parseWebviewMessage({ type: "openImage" })
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.error).toContain("openImage")
		}
	})

	it("accepts a valid saveImage message at the boundary", () => {
		const result = parseWebviewMessage({ type: "saveImage", dataUri: "data:image/png;base64,abc" })
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.message.type).toBe("saveImage")
		}
	})

	it("rejects a crafted malformed saveImage message at the boundary", () => {
		const result = parseWebviewMessage({ type: "saveImage", dataUri: 42 })
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.error).toContain("saveImage")
		}
	})

	it("accepts a valid selectImages message at the boundary", () => {
		const result = parseWebviewMessage({ type: "selectImages", context: "edit", messageTs: 42 })
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.message.type).toBe("selectImages")
			expect(result.message.context).toBe("edit")
			expect(result.message.messageTs).toBe(42)
		}
	})

	it("rejects a crafted malformed selectImages message at the boundary", () => {
		const result = parseWebviewMessage({ type: "selectImages", messageTs: "not-a-number" })
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.error).toContain("selectImages")
		}
	})
})
