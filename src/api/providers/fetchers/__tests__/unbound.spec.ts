// npx vitest run src/api/providers/fetchers/__tests__/unbound.spec.ts

import axios from "axios"

import { getUnboundModels, toUnboundModelList } from "../unbound"

vitest.mock("axios")

describe("Unbound Fetchers", () => {
	beforeEach(() => {
		vitest.clearAllMocks()
	})

	describe("toUnboundModelList", () => {
		it("returns a bare array as-is", () => {
			expect(toUnboundModelList([{ id: "a" }])).toEqual([{ id: "a" }])
		})

		it("unwraps a { models: [...] } envelope", () => {
			expect(toUnboundModelList({ models: [{ id: "a" }] })).toEqual([{ id: "a" }])
		})

		it("maps an object keyed by id to its values", () => {
			expect(toUnboundModelList({ a: { id: "a" }, b: { id: "b" } })).toEqual([{ id: "a" }, { id: "b" }])
		})

		it("recovers the model id from the map key when the value omits it", () => {
			expect(toUnboundModelList({ "gpt-4o": { max_output_tokens: 100 } })).toEqual([
				{ max_output_tokens: 100, id: "gpt-4o" },
			])
		})

		it("returns [] for null/primitive payloads instead of throwing", () => {
			expect(toUnboundModelList(null)).toEqual([])
			expect(toUnboundModelList(undefined)).toEqual([])
			expect(toUnboundModelList("nope")).toEqual([])
			expect(toUnboundModelList(42)).toEqual([])
		})
	})

	describe("getUnboundModels", () => {
		it("maps the OpenAI-style { data: [...] } response and sends the Bearer header", async () => {
			vi.mocked(axios.get).mockResolvedValue({
				data: {
					data: [
						{
							id: "unbound-large",
							max_output_tokens: 32000,
							context_window: 200000,
							supports_caching: true,
							supports_vision: true,
							input_price: "1.5",
							output_price: "7.5",
							description: "Big model",
						},
					],
				},
			})

			const models = await getUnboundModels("test-key")

			expect(vi.mocked(axios.get)).toHaveBeenCalledWith("https://api.getunbound.ai/models", {
				headers: { Authorization: "Bearer test-key" },
			})
			expect(models["unbound-large"]).toMatchObject({
				maxTokens: 32000,
				contextWindow: 200000,
				supportsPromptCache: true,
				supportsImages: true,
				description: "Big model",
			})
		})

		it("normalizes a non-iterable map payload without throwing or losing the list", async () => {
			vi.mocked(axios.get).mockResolvedValue({
				data: { data: { "model-a": { id: "model-a" }, "model-b": { id: "model-b" } } },
			})

			const models = await getUnboundModels()

			expect(Object.keys(models).sort()).toEqual(["model-a", "model-b"])
		})

		it("applies defaults for missing metadata", async () => {
			vi.mocked(axios.get).mockResolvedValue({ data: { data: [{ id: "bare" }] } })

			const models = await getUnboundModels()

			expect(models["bare"]).toMatchObject({
				maxTokens: 8192,
				contextWindow: 200_000,
				supportsPromptCache: false,
				supportsImages: false,
			})
		})

		it("skips entries with no id", async () => {
			vi.mocked(axios.get).mockResolvedValue({ data: [{ id: "ok" }, { not_a_field: true }, {}] })

			const models = await getUnboundModels()

			expect(Object.keys(models)).toEqual(["ok"])
		})

		it("returns an empty map and logs once on network error", async () => {
			vi.mocked(axios.get).mockRejectedValue(new Error("network"))
			const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)

			expect(await getUnboundModels()).toEqual({})
			expect(errorSpy).toHaveBeenCalledTimes(1)

			errorSpy.mockRestore()
		})
	})
})
