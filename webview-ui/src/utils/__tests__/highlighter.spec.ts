import { normalizeLanguage, isLanguageLoaded } from "../highlighter"
import { getLanguageFromPath } from "../getLanguageFromPath"

describe("normalizeLanguage (curated Shiki surface)", () => {
	it("defaults to txt for undefined and the plain-text sentinel", () => {
		expect(normalizeLanguage(undefined)).toBe("txt")
		expect(normalizeLanguage("txt")).toBe("txt")
	})

	it("maps plain text aliases to the txt sentinel", () => {
		expect(normalizeLanguage("text")).toBe("txt")
		expect(normalizeLanguage("plaintext")).toBe("txt")
		expect(normalizeLanguage("plain")).toBe("txt")
	})

	it("returns curated language ids unchanged (case-insensitive)", () => {
		const curated = [
			"c",
			"clojure",
			"cpp",
			"csharp",
			"css",
			"csv",
			"dart",
			"diff",
			"dockerfile",
			"elixir",
			"elm",
			"erlang",
			"gdscript",
			"go",
			"graphql",
			"haskell",
			"html",
			"ini",
			"java",
			"javascript",
			"json",
			"jsx",
			"julia",
			"kotlin",
			"latex",
			"log",
			"lua",
			"markdown",
			"mermaid",
			"objective-c",
			"php",
			"powershell",
			"python",
			"r",
			"ruby",
			"rust",
			"scala",
			"shellscript",
			"shellsession",
			"sql",
			"swift",
			"toml",
			"tsx",
			"typescript",
			"xml",
			"yaml",
		]

		for (const lang of curated) {
			expect(normalizeLanguage(lang)).toBe(lang)
		}

		expect(normalizeLanguage("TypeScript")).toBe("typescript")
		expect(normalizeLanguage("JSON")).toBe("json")
	})

	it("resolves aliases to their canonical curated language", () => {
		expect(normalizeLanguage("bash")).toBe("shellscript")
		expect(normalizeLanguage("sh")).toBe("shellscript")
		expect(normalizeLanguage("shell")).toBe("shellscript")
		expect(normalizeLanguage("shell-session")).toBe("shellsession")
		expect(normalizeLanguage("js")).toBe("javascript")
		expect(normalizeLanguage("ts")).toBe("typescript")
		expect(normalizeLanguage("py")).toBe("python")
		expect(normalizeLanguage("rb")).toBe("ruby")
		expect(normalizeLanguage("md")).toBe("markdown")
		expect(normalizeLanguage("c++")).toBe("cpp")
		expect(normalizeLanguage("cs")).toBe("csharp")
		expect(normalizeLanguage("htm")).toBe("html")
		expect(normalizeLanguage("yml")).toBe("yaml")
		expect(normalizeLanguage("docker")).toBe("dockerfile")
		expect(normalizeLanguage("jsonc")).toBe("json")
		expect(normalizeLanguage("svg")).toBe("xml")
		expect(normalizeLanguage("mysql")).toBe("sql")
		expect(normalizeLanguage("objectivec")).toBe("objective-c")
	})

	it("falls back to txt for unknown languages without throwing", () => {
		expect(normalizeLanguage("invalid-lang")).toBe("txt")
		expect(normalizeLanguage("jupyter")).toBe("txt")
		expect(normalizeLanguage("vue")).toBe("txt")
	})
})

describe("getLanguageFromPath coverage", () => {
	const extensions = [
		"html",
		"htm",
		"css",
		"js",
		"jsx",
		"ts",
		"tsx",
		"py",
		"rb",
		"php",
		"java",
		"cs",
		"go",
		"rs",
		"scala",
		"kt",
		"swift",
		"json",
		"xml",
		"yaml",
		"yml",
		"md",
		"csv",
		"sh",
		"bash",
		"zsh",
		"ps1",
		"toml",
		"ini",
		"cfg",
		"conf",
		"sql",
		"graphql",
		"gql",
		"tex",
		"svg",
		"c",
		"cpp",
		"h",
		"hpp",
		"hs",
		"lhs",
		"elm",
		"clj",
		"cljs",
		"erl",
		"ex",
		"exs",
		"dart",
		"m",
		"mm",
		"lua",
		"gd",
		"unity",
		"r",
		"jl",
	]

	it("resolves every mapped extension to a highlightable language", () => {
		for (const ext of extensions) {
			const lang = getLanguageFromPath(`file.${ext}`)
			expect(lang).toBeDefined()
			expect(normalizeLanguage(lang)).not.toBe("txt")
		}
	})

	it("degrades only the Shiki-unbacked ids to plaintext", () => {
		// `.txt` intentionally maps to plain text.
		expect(normalizeLanguage(getLanguageFromPath("file.txt"))).toBe("txt")
		// `.ipynb` maps to "jupyter", which has no Shiki grammar.
		expect(normalizeLanguage(getLanguageFromPath("file.ipynb"))).toBe("txt")
	})
})

describe("isLanguageLoaded", () => {
	it("reports only the eagerly tracked languages as loaded before init", () => {
		expect(isLanguageLoaded("txt")).toBe(true)
		expect(isLanguageLoaded("typescript")).toBe(false)
		expect(isLanguageLoaded("TS")).toBe(false)
		// Unknown languages normalize to txt, which is always considered loaded.
		expect(isLanguageLoaded("unknown")).toBe(true)
	})
})
