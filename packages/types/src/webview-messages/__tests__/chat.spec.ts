import { describe, it, expect } from "vitest"

import {
	askResponseMessageSchema,
	chatMessageSchema,
	completionCheckpointDiffMessageSchema,
	completionCheckpointRestoreMessageSchema,
	deleteMessageConfirmMessageSchema,
	deleteMessageMessageSchema,
	editMessageConfirmMessageSchema,
	enhancePromptMessageSchema,
	parseWebviewMessage,
	playTtsMessageSchema,
	stopTtsMessageSchema,
	submitEditedMessageMessageSchema,
	ttsEnabledMessageSchema,
	ttsSpeedMessageSchema,
} from "../index.js"

describe("empty-payload chat schemas", () => {
	it.each([
		["completionCheckpointDiff", completionCheckpointDiffMessageSchema],
		["completionCheckpointRestore", completionCheckpointRestoreMessageSchema],
		["stopTts", stopTtsMessageSchema],
	] as const)("accepts %s with only the type literal", (type, schema) => {
		const result = schema.safeParse({ type })
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.type).toBe(type)
		}
	})

	it.each([
		["completionCheckpointDiff", completionCheckpointDiffMessageSchema],
		["completionCheckpointRestore", completionCheckpointRestoreMessageSchema],
		["stopTts", stopTtsMessageSchema],
	] as const)("rejects %s with the wrong type literal", (type, schema) => {
		expect(schema.safeParse({ type: "stopTts" }).success).toBe(type === "stopTts")
	})
})

describe("askResponseMessageSchema", () => {
	it("accepts a full payload (text, images, askResponse)", () => {
		const result = askResponseMessageSchema.safeParse({
			type: "askResponse",
			text: "Looks good",
			images: ["data:image/png;base64,abc"],
			askResponse: "messageResponse",
		})
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.askResponse).toBe("messageResponse")
			expect(result.data.text).toBe("Looks good")
			expect(result.data.images).toEqual(["data:image/png;base64,abc"])
		}
	})

	it("accepts each of the four ClineAskResponse values", () => {
		for (const askResponse of ["yesButtonClicked", "noButtonClicked", "messageResponse", "objectResponse"]) {
			expect(askResponseMessageSchema.safeParse({ type: "askResponse", askResponse }).success).toBe(true)
		}
	})

	it("accepts a message without text/images (required askResponse only)", () => {
		expect(
			askResponseMessageSchema.safeParse({ type: "askResponse", askResponse: "yesButtonClicked" }).success,
		).toBe(true)
	})

	it("rejects a message missing the required askResponse", () => {
		expect(askResponseMessageSchema.safeParse({ type: "askResponse", text: "hi" }).success).toBe(false)
	})

	it("rejects an invalid askResponse shape", () => {
		expect(askResponseMessageSchema.safeParse({ type: "askResponse", askResponse: "maybeClicked" }).success).toBe(
			false,
		)
	})

	it("rejects a non-string text field", () => {
		expect(
			askResponseMessageSchema.safeParse({ type: "askResponse", askResponse: "messageResponse", text: 42 })
				.success,
		).toBe(false)
	})

	it("rejects a non-array images field", () => {
		expect(
			askResponseMessageSchema.safeParse({
				type: "askResponse",
				askResponse: "messageResponse",
				images: "data:image/png;base64,abc",
			}).success,
		).toBe(false)
	})

	it("rejects the wrong type literal", () => {
		expect(askResponseMessageSchema.safeParse({ type: "playTts", askResponse: "messageResponse" }).success).toBe(
			false,
		)
	})
})

describe("deleteMessageMessageSchema", () => {
	it("accepts a message with a numeric value", () => {
		const result = deleteMessageMessageSchema.safeParse({ type: "deleteMessage", value: 123456789 })
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.value).toBe(123456789)
		}
	})

	it("accepts a message without value (handler guards on it)", () => {
		expect(deleteMessageMessageSchema.safeParse({ type: "deleteMessage" }).success).toBe(true)
	})

	it("rejects a non-number value", () => {
		expect(deleteMessageMessageSchema.safeParse({ type: "deleteMessage", value: "nope" }).success).toBe(false)
	})

	it("rejects the wrong type literal", () => {
		expect(deleteMessageMessageSchema.safeParse({ type: "submitEditedMessage", value: 1 }).success).toBe(false)
	})
})

describe("submitEditedMessageMessageSchema", () => {
	it("accepts a full payload", () => {
		const result = submitEditedMessageMessageSchema.safeParse({
			type: "submitEditedMessage",
			value: 123,
			editedMessageContent: "Edited text",
			images: ["data:image/png;base64,abc"],
		})
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.value).toBe(123)
			expect(result.data.editedMessageContent).toBe("Edited text")
			expect(result.data.images).toEqual(["data:image/png;base64,abc"])
		}
	})

	it("rejects a non-number value", () => {
		expect(
			submitEditedMessageMessageSchema.safeParse({
				type: "submitEditedMessage",
				value: "invalid",
				editedMessageContent: "Edited text",
			}).success,
		).toBe(false)
	})

	it("rejects a non-string editedMessageContent", () => {
		expect(
			submitEditedMessageMessageSchema.safeParse({
				type: "submitEditedMessage",
				value: 123,
				editedMessageContent: 42,
			}).success,
		).toBe(false)
	})

	it("rejects a non-array images field", () => {
		expect(
			submitEditedMessageMessageSchema.safeParse({
				type: "submitEditedMessage",
				value: 123,
				editedMessageContent: "Edited text",
				images: "data:image/png;base64,abc",
			}).success,
		).toBe(false)
	})

	it("rejects the wrong type literal", () => {
		expect(
			submitEditedMessageMessageSchema.safeParse({
				type: "deleteMessage",
				value: 123,
				editedMessageContent: "Edited text",
			}).success,
		).toBe(false)
	})
})

describe("deleteMessageConfirmMessageSchema", () => {
	it("accepts a full payload (messageTs + restoreCheckpoint)", () => {
		const result = deleteMessageConfirmMessageSchema.safeParse({
			type: "deleteMessageConfirm",
			messageTs: 1000,
			restoreCheckpoint: true,
		})
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.messageTs).toBe(1000)
			expect(result.data.restoreCheckpoint).toBe(true)
		}
	})

	it("accepts a message without optional fields", () => {
		expect(deleteMessageConfirmMessageSchema.safeParse({ type: "deleteMessageConfirm" }).success).toBe(true)
	})

	it("rejects a non-number messageTs", () => {
		expect(
			deleteMessageConfirmMessageSchema.safeParse({ type: "deleteMessageConfirm", messageTs: "nope" }).success,
		).toBe(false)
	})

	it("rejects a non-boolean restoreCheckpoint", () => {
		expect(
			deleteMessageConfirmMessageSchema.safeParse({
				type: "deleteMessageConfirm",
				messageTs: 1000,
				restoreCheckpoint: "yes",
			}).success,
		).toBe(false)
	})

	it("rejects the wrong type literal", () => {
		expect(
			deleteMessageConfirmMessageSchema.safeParse({ type: "editMessageConfirm", messageTs: 1000 }).success,
		).toBe(false)
	})
})

describe("editMessageConfirmMessageSchema", () => {
	it("accepts a full payload", () => {
		const result = editMessageConfirmMessageSchema.safeParse({
			type: "editMessageConfirm",
			messageTs: 1000,
			text: "Edited",
			images: ["data:image/png;base64,abc"],
			restoreCheckpoint: false,
		})
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.messageTs).toBe(1000)
			expect(result.data.text).toBe("Edited")
			expect(result.data.restoreCheckpoint).toBe(false)
		}
	})

	it("rejects a non-number messageTs", () => {
		expect(
			editMessageConfirmMessageSchema.safeParse({ type: "editMessageConfirm", messageTs: "nope" }).success,
		).toBe(false)
	})

	it("rejects a non-string text field", () => {
		expect(
			editMessageConfirmMessageSchema.safeParse({ type: "editMessageConfirm", messageTs: 1000, text: 42 })
				.success,
		).toBe(false)
	})

	it("rejects a non-array images field", () => {
		expect(
			editMessageConfirmMessageSchema.safeParse({
				type: "editMessageConfirm",
				messageTs: 1000,
				text: "Edited",
				images: "data:image/png;base64,abc",
			}).success,
		).toBe(false)
	})

	it("rejects a non-boolean restoreCheckpoint", () => {
		expect(
			editMessageConfirmMessageSchema.safeParse({
				type: "editMessageConfirm",
				messageTs: 1000,
				text: "Edited",
				restoreCheckpoint: 1,
			}).success,
		).toBe(false)
	})

	it("rejects the wrong type literal", () => {
		expect(
			editMessageConfirmMessageSchema.safeParse({ type: "deleteMessageConfirm", messageTs: 1000, text: "Edited" })
				.success,
		).toBe(false)
	})
})

describe("enhancePromptMessageSchema", () => {
	it("accepts a message with text", () => {
		const result = enhancePromptMessageSchema.safeParse({ type: "enhancePrompt", text: "Make it better" })
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.text).toBe("Make it better")
		}
	})

	it("accepts a message without text (handler guards on it)", () => {
		expect(enhancePromptMessageSchema.safeParse({ type: "enhancePrompt" }).success).toBe(true)
	})

	it("rejects a non-string text field", () => {
		expect(enhancePromptMessageSchema.safeParse({ type: "enhancePrompt", text: 42 }).success).toBe(false)
	})

	it("rejects the wrong type literal", () => {
		expect(enhancePromptMessageSchema.safeParse({ type: "playTts", text: "hi" }).success).toBe(false)
	})
})

describe("ttsEnabledMessageSchema", () => {
	it("accepts a boolean bool field", () => {
		expect(ttsEnabledMessageSchema.safeParse({ type: "ttsEnabled", bool: true }).success).toBe(true)
		expect(ttsEnabledMessageSchema.safeParse({ type: "ttsEnabled", bool: false }).success).toBe(true)
	})

	it("accepts a message without bool (handler defaults to true)", () => {
		expect(ttsEnabledMessageSchema.safeParse({ type: "ttsEnabled" }).success).toBe(true)
	})

	it("rejects a non-boolean bool field", () => {
		expect(ttsEnabledMessageSchema.safeParse({ type: "ttsEnabled", bool: "yes" }).success).toBe(false)
	})

	it("rejects the wrong type literal", () => {
		expect(ttsEnabledMessageSchema.safeParse({ type: "ttsSpeed", bool: true }).success).toBe(false)
	})
})

describe("ttsSpeedMessageSchema", () => {
	it("accepts a numeric value field", () => {
		const result = ttsSpeedMessageSchema.safeParse({ type: "ttsSpeed", value: 0.75 })
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.value).toBe(0.75)
		}
	})

	it("accepts a message without value (handler defaults to 1.0)", () => {
		expect(ttsSpeedMessageSchema.safeParse({ type: "ttsSpeed" }).success).toBe(true)
	})

	it("rejects a non-number value field", () => {
		expect(ttsSpeedMessageSchema.safeParse({ type: "ttsSpeed", value: "fast" }).success).toBe(false)
	})

	it("rejects the wrong type literal", () => {
		expect(ttsSpeedMessageSchema.safeParse({ type: "ttsEnabled", value: 1 }).success).toBe(false)
	})
})

describe("playTtsMessageSchema", () => {
	it("accepts a message with text", () => {
		const result = playTtsMessageSchema.safeParse({ type: "playTts", text: "Hello" })
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.text).toBe("Hello")
		}
	})

	it("accepts a message without text (handler guards on it)", () => {
		expect(playTtsMessageSchema.safeParse({ type: "playTts" }).success).toBe(true)
	})

	it("rejects a non-string text field", () => {
		expect(playTtsMessageSchema.safeParse({ type: "playTts", text: 42 }).success).toBe(false)
	})

	it("rejects the wrong type literal", () => {
		expect(playTtsMessageSchema.safeParse({ type: "stopTts", text: "hi" }).success).toBe(false)
	})
})

describe("chatMessageSchema (discriminated union)", () => {
	it("narrows an askResponse payload to its member type", () => {
		const result = chatMessageSchema.safeParse({ type: "askResponse", askResponse: "yesButtonClicked" })
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.type).toBe("askResponse")
		}
	})

	it("narrows an editMessageConfirm payload to its member type", () => {
		const result = chatMessageSchema.safeParse({ type: "editMessageConfirm", messageTs: 1, text: "x" })
		expect(result.success).toBe(true)
		if (result.success && result.data.type === "editMessageConfirm") {
			expect(result.data.messageTs).toBe(1)
			expect(result.data.text).toBe("x")
		}
	})

	it("narrows an empty-payload ttsSpeed payload to its member type", () => {
		const result = chatMessageSchema.safeParse({ type: "ttsSpeed" })
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.type).toBe("ttsSpeed")
		}
	})

	it("rejects an unknown chat type literal", () => {
		expect(chatMessageSchema.safeParse({ type: "notAChatType" }).success).toBe(false)
	})

	it("rejects a member with a malformed required payload", () => {
		expect(chatMessageSchema.safeParse({ type: "askResponse" }).success).toBe(false)
	})
})

describe("parseWebviewMessage boundary", () => {
	it("accepts a valid askResponse message through the boundary", () => {
		const result = parseWebviewMessage({ type: "askResponse", askResponse: "messageResponse", text: "hi" })
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.message.type).toBe("askResponse")
		}
	})

	it("rejects an askResponse message with an invalid askResponse shape", () => {
		const result = parseWebviewMessage({ type: "askResponse", askResponse: "bogusResponse" })
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.error).toContain("askResponse")
		}
	})

	it("rejects a deleteMessage message with a non-number value", () => {
		const result = parseWebviewMessage({ type: "deleteMessage", value: "nope" })
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.error).toContain("deleteMessage")
		}
	})

	it("accepts a valid empty-payload stopTts message through the boundary", () => {
		const result = parseWebviewMessage({ type: "stopTts" })
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.message.type).toBe("stopTts")
		}
	})

	it("accepts a valid ttsEnabled message through the boundary", () => {
		const result = parseWebviewMessage({ type: "ttsEnabled", bool: true })
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.message.type).toBe("ttsEnabled")
		}
	})

	it("rejects a playTts message with a non-string text", () => {
		const result = parseWebviewMessage({ type: "playTts", text: 42 })
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.error).toContain("playTts")
		}
	})
})
