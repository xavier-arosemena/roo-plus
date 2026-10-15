import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

/**
 * Guard for the marketplace tag-filter placeholder shape.
 *
 * The bulk "Clear tags" button and the per-tag remove tooltip live in the same
 * `filters.tags` namespace but require opposite placeholder shapes:
 *
 *   - `filters.tags.clear`  MUST be token-free. It is rendered verbatim, so a
 *     stray `{{count}}` breaks the button — this is exactly what shipped in
 *     `fr` and motivated splitting the key.
 *   - `filters.tags.remove` MUST keep exactly ONE `{{count}}` (the tooltip
 *     interpolates the number of selected tags).
 *
 * i18next renders a missing or extra placeholder without complaint, so a
 * translation PR can silently regress either invariant. These assertions read
 * the real locale files from disk (no mocks, no i18n runtime) so the drift is
 * caught at review time instead of in a user's editor.
 *
 * Failures are reported as a list of per-locale offenders, so the assertion
 * diff names the offending locale(s) and the offending token count.
 */

const LOCALES_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../locales")

// Keep in sync with the locale directories under webview-ui/src/i18n/locales.
const EXPECTED_LOCALES = [
	"ca",
	"de",
	"en",
	"es",
	"fr",
	"hi",
	"id",
	"it",
	"ja",
	"ko",
	"nl",
	"pl",
	"pt-BR",
	"ru",
	"tr",
	"vi",
	"zh-CN",
	"zh-TW",
].sort()

type MarketplaceJson = {
	filters?: {
		tags?: Record<string, string | undefined>
	}
}

const locales = fs
	.readdirSync(LOCALES_DIR, { withFileTypes: true })
	.filter((entry) => entry.isDirectory())
	.map((entry) => entry.name)
	.sort()

const readMarketplaceTags = (locale: string): Record<string, string | undefined> => {
	const file = path.join(LOCALES_DIR, locale, "marketplace.json")
	const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as MarketplaceJson

	return parsed.filters?.tags ?? {}
}

const countOccurrences = (haystack: string, needle: string): number => haystack.split(needle).length - 1

describe("marketplace tag placeholder shape", () => {
	it("covers every supported locale", () => {
		expect(locales).toEqual(EXPECTED_LOCALES)
	})

	it("keeps filters.tags.clear token-free in every locale", () => {
		const offenders = locales.flatMap((locale) => {
			const clear = readMarketplaceTags(locale).clear

			if (typeof clear !== "string") {
				return [`${locale}: filters.tags.clear is missing or not a string`]
			}

			const tokens = clear.match(/\{\{[^}]*\}\}/g) ?? []

			return tokens.length === 0
				? []
				: [`${locale}: filters.tags.clear has ${tokens.length} token(s): ${tokens.join(", ")}`]
		})

		expect(offenders).toEqual([])
	})

	it("keeps exactly one {{count}} in filters.tags.remove in every locale", () => {
		const offenders = locales.flatMap((locale) => {
			const remove = readMarketplaceTags(locale).remove

			if (typeof remove !== "string") {
				return [`${locale}: filters.tags.remove is missing or not a string`]
			}

			const count = countOccurrences(remove, "{{count}}")

			return count === 1
				? []
				: [`${locale}: filters.tags.remove has ${count} "{{count}}" occurrence(s) in "${remove}"`]
		})

		expect(offenders).toEqual([])
	})

	it("keeps the filters.tags key set in sync with en", () => {
		const expectedKeys = Object.keys(readMarketplaceTags("en")).sort()

		const offenders = locales
			.filter((locale) => locale !== "en")
			.map((locale) => ({ locale, keys: Object.keys(readMarketplaceTags(locale)).sort() }))
			.filter(({ keys }) => JSON.stringify(keys) !== JSON.stringify(expectedKeys))
			.map(
				({ locale, keys }) => `${locale}: expected [${expectedKeys.join(", ")}] but found [${keys.join(", ")}]`,
			)

		expect(offenders).toEqual([])
	})
})
