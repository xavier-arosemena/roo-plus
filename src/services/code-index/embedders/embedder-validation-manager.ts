import { t } from "../../../i18n"
import type { IEmbedder } from "../interfaces"

export class EmbedderValidationManager {
	public async validateEmbedder(embedder: IEmbedder): Promise<{ valid: boolean; error?: string }> {
		try {
			return await embedder.validateConfiguration()
		} catch (error) {
			return {
				valid: false,
				error: error instanceof Error ? error.message : t("embeddings:validation.configurationError"),
			}
		}
	}
}
