import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

/**
 * Locale-integrity gate for the "What's New" popup's marketing slot.
 *
 * Regression for the raw-key defect shipped in 3.89.5: Announcement.tsx
 * rendered `<Trans i18nKey="chat:announcement.marketing">` while NO locale
 * defined the key — including `en`, which is also the i18next fallback — so
 * users saw the literal string `chat:announcement.marketing`.
 *
 * Three existing gates were structurally unable to catch it:
 *   1. scripts/find-missing-translations.js compares non-English locales to
 *      English, so a key missing from English is never reported.
 *   2. scripts/find-missing-i18n-key.js does detect it, but is not wired into
 *      CI (see DEBT.md item 19).
 *   3. Announcement.spec.tsx mocks `Trans` with hardcoded English, so it
 *      asserted the behaviour of the mock rather than of the locale data.
 *
 * This spec reads the REAL locale files. A rotation that lands in only some
 * locales, drops the `<merchLink>` token, or reintroduces the dead
 * `support.marketing` key fails here.
 */

const resolveLocalesDir = (): string => {
	const candidates = [
		path.resolve(process.cwd(), "src/i18n/locales"),
		path.resolve(process.cwd(), "webview-ui/src/i18n/locales"),
	]

	try {
		// `import.meta.url` is unavailable when the test is transformed to CJS,
		// in which case the cwd-relative candidates are the answer anyway.
		candidates.push(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../i18n/locales"))
	} catch {
		// Ignore: cwd candidates remain.
	}

	const found = candidates.find((dir) => fs.existsSync(path.join(dir, "en", "chat.json")))

	if (found === undefined) {
		throw new Error(`Could not locate the webview locale directory. Tried: ${candidates.join(", ")}`)
	}

	return found
}

interface ChatLocale {
	announcement?: { title?: string; marketing?: string }
	support?: { marketing?: string; merch?: string; merchBlurb?: string }
}

const LOCALES_DIR = resolveLocalesDir()

const locales = fs
	.readdirSync(LOCALES_DIR)
	.filter((entry) => fs.statSync(path.join(LOCALES_DIR, entry)).isDirectory())
	.sort()

const readChatLocale = (locale: string): ChatLocale =>
	JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, locale, "chat.json"), "utf8"))

describe("marketing slot locale integrity", () => {
	it("discovers every shipped locale", () => {
		expect(locales).toContain("en")
		// 18 locales today: ca, de, en, es, fr, hi, id, it, ja, ko, nl, pl,
		// pt-BR, ru, tr, vi, zh-CN, zh-TW. A new locale must ship the same keys.
		expect(locales.length).toBeGreaterThanOrEqual(18)
	})

	describe.each(locales)("%s", (locale) => {
		const chat = readChatLocale(locale)

		it("defines a non-empty announcement.marketing string", () => {
			const marketing = chat.announcement?.marketing

			expect(typeof marketing).toBe("string")
			expect((marketing ?? "").trim().length).toBeGreaterThan(0)
		})

		it("carries exactly one <merchLink> pair so the shop link renders", () => {
			const marketing = chat.announcement?.marketing ?? ""

			expect(marketing.match(/<merchLink>/g)).toHaveLength(1)
			expect(marketing.match(/<\/merchLink>/g)).toHaveLength(1)
		})

		it("defines the permanent merch link label and blurb", () => {
			expect(typeof chat.support?.merch).toBe("string")
			expect((chat.support?.merch ?? "").trim().length).toBeGreaterThan(0)
			expect(typeof chat.support?.merchBlurb).toBe("string")
			expect((chat.support?.merchBlurb ?? "").trim().length).toBeGreaterThan(0)
		})

		it("no longer defines the dead support.marketing key", () => {
			expect(chat.support ?? {}).not.toHaveProperty("marketing")
		})
	})
})
