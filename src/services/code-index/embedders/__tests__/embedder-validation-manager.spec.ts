import { t } from "../../../../i18n"
import embeddings from "../../../../i18n/locales/en/embeddings.json"
import { OpenAiEmbedder } from "../openai"
import { EmbedderValidationManager } from "../embedder-validation-manager"

vi.mock("../openai")
vi.mock("../../../../i18n", () => ({ t: vi.fn() }))

describe("EmbedderValidationManager", () => {
	const manager = new EmbedderValidationManager()

	beforeEach(() => vi.clearAllMocks())

	it.each([{ valid: true }, { valid: false, error: "Invalid credentials" }])(
		"preserves the validation result %j without reporting an exception",
		async (result) => {
			const embedder = new OpenAiEmbedder({ openAiNativeApiKey: "test-key" })
			vi.mocked(embedder.validateConfiguration).mockResolvedValue(result)

			expect(await manager.validateEmbedder(embedder)).toBe(result)
			expect(embedder.validateConfiguration).toHaveBeenCalledExactlyOnceWith()
		},
	)

	it("preserves an exception's message", async () => {
		const embedder = new OpenAiEmbedder({ openAiNativeApiKey: "test-key" })
		const error = new Error("Connection failed")
		vi.mocked(embedder.validateConfiguration).mockRejectedValue(error)

		expect(await manager.validateEmbedder(embedder)).toEqual({ valid: false, error: error.message })
		expect(t).not.toHaveBeenCalled()
	})

	it.each(["unavailable", null, undefined])("handles non-Error rejection %s", async (error) => {
		const embedder = new OpenAiEmbedder({ openAiNativeApiKey: "test-key" })
		vi.mocked(embedder.validateConfiguration).mockRejectedValue(error)
		vi.mocked(t).mockReturnValue(embeddings.validation.configurationError)

		expect(await manager.validateEmbedder(embedder)).toEqual({
			valid: false,
			error: embeddings.validation.configurationError,
		})
		expect(t).toHaveBeenCalledExactlyOnceWith("embeddings:validation.configurationError")
	})
})
