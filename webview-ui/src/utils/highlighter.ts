import { createdBundledHighlighter } from "shiki/core"
import { createOnigurumaEngine } from "shiki/engine/oniguruma"

// ---------------------------------------------------------------------------
// Curated Shiki language surface.
//
// Importing `bundledLanguages` (or `shiki/bundle/web`) makes the bundler emit a
// chunk for every grammar in the dynamic-import map, even though each chunk is
// only fetched lazily. The webview renders a small, fixed set of languages — the
// extension map in `getLanguageFromPath.ts`, the alias map below, and the
// languages used by the product's own docs/code blocks — so the import surface
// is curated explicitly here. Every entry stays a lazy dynamic import: a grammar
// is loaded on demand, never all upfront, and unknown languages fall back to
// `txt`.
// ---------------------------------------------------------------------------
const curatedLanguageModules = {
	c: () => import("shiki/langs/c.mjs"),
	clojure: () => import("shiki/langs/clojure.mjs"),
	cpp: () => import("shiki/langs/cpp.mjs"),
	csharp: () => import("shiki/langs/csharp.mjs"),
	css: () => import("shiki/langs/css.mjs"),
	csv: () => import("shiki/langs/csv.mjs"),
	dart: () => import("shiki/langs/dart.mjs"),
	diff: () => import("shiki/langs/diff.mjs"),
	dockerfile: () => import("shiki/langs/dockerfile.mjs"),
	elixir: () => import("shiki/langs/elixir.mjs"),
	elm: () => import("shiki/langs/elm.mjs"),
	erlang: () => import("shiki/langs/erlang.mjs"),
	gdscript: () => import("shiki/langs/gdscript.mjs"),
	go: () => import("shiki/langs/go.mjs"),
	graphql: () => import("shiki/langs/graphql.mjs"),
	haskell: () => import("shiki/langs/haskell.mjs"),
	html: () => import("shiki/langs/html.mjs"),
	ini: () => import("shiki/langs/ini.mjs"),
	java: () => import("shiki/langs/java.mjs"),
	javascript: () => import("shiki/langs/javascript.mjs"),
	json: () => import("shiki/langs/json.mjs"),
	jsx: () => import("shiki/langs/jsx.mjs"),
	julia: () => import("shiki/langs/julia.mjs"),
	kotlin: () => import("shiki/langs/kotlin.mjs"),
	latex: () => import("shiki/langs/latex.mjs"),
	log: () => import("shiki/langs/log.mjs"),
	lua: () => import("shiki/langs/lua.mjs"),
	markdown: () => import("shiki/langs/markdown.mjs"),
	mermaid: () => import("shiki/langs/mermaid.mjs"),
	"objective-c": () => import("shiki/langs/objective-c.mjs"),
	php: () => import("shiki/langs/php.mjs"),
	powershell: () => import("shiki/langs/powershell.mjs"),
	python: () => import("shiki/langs/python.mjs"),
	r: () => import("shiki/langs/r.mjs"),
	ruby: () => import("shiki/langs/ruby.mjs"),
	rust: () => import("shiki/langs/rust.mjs"),
	scala: () => import("shiki/langs/scala.mjs"),
	shellscript: () => import("shiki/langs/shellscript.mjs"),
	shellsession: () => import("shiki/langs/shellsession.mjs"),
	sql: () => import("shiki/langs/sql.mjs"),
	swift: () => import("shiki/langs/swift.mjs"),
	toml: () => import("shiki/langs/toml.mjs"),
	tsx: () => import("shiki/langs/tsx.mjs"),
	typescript: () => import("shiki/langs/typescript.mjs"),
	xml: () => import("shiki/langs/xml.mjs"),
	yaml: () => import("shiki/langs/yaml.mjs"),
} as const

// Every canonical id above is a valid Shiki `BundledLanguage`; `txt` is Shiki's
// plain-text sentinel, which is supported but not listed among the grammars.
type CuratedLanguage = keyof typeof curatedLanguageModules

export type ExtendedLanguage = CuratedLanguage | "txt"

// Map common language aliases to their curated Shiki language equivalent. All
// non-`txt` targets must be keys of `curatedLanguageModules`.
const languageAliases: Record<string, ExtendedLanguage> = {
	// Plain text variants (resolve to the `txt` sentinel; no grammar chunk).
	text: "txt",
	plaintext: "txt",
	plain: "txt",

	// Shell/Bash variants
	sh: "shellscript",
	bash: "shellscript",
	zsh: "shellscript",
	shell: "shellscript",
	console: "shellscript",
	terminal: "shellscript",
	"shell-script": "shellscript",
	"shell-session": "shellsession",

	// JavaScript variants
	js: "javascript",
	node: "javascript",
	nodejs: "javascript",

	// TypeScript variants
	ts: "typescript",

	// Python variants
	py: "python",
	python3: "python",
	py3: "python",

	// Ruby variants
	rb: "ruby",

	// Markdown variants
	md: "markdown",

	// C++ variants
	"c++": "cpp",
	cc: "cpp",

	// C# variants
	"c#": "csharp",
	cs: "csharp",

	// HTML variants
	htm: "html",

	// YAML variants
	yml: "yaml",

	// Docker variants
	docker: "dockerfile",

	// CSS variants
	styles: "css",
	style: "css",

	// JSON variants
	jsonc: "json",
	json5: "json",

	// XML variants
	xaml: "xml",
	xhtml: "xml",
	svg: "xml",

	// SQL variants
	mysql: "sql",
	postgresql: "sql",
	postgres: "sql",
	pgsql: "sql",
	plsql: "sql",
	oracle: "sql",

	// Objective-C (the file-extension map yields "objectivec")
	objectivec: "objective-c",
}

// Only the two GitHub themes that `CodeBlock`/`highlightDiff` actually request
// are bundled; the remaining Shiki themes are dropped.
const curatedThemes = {
	"github-dark": () => import("shiki/themes/github-dark.mjs"),
	"github-light": () => import("shiki/themes/github-light.mjs"),
}

const createCuratedHighlighter = createdBundledHighlighter<string, string>({
	langs: curatedLanguageModules,
	themes: curatedThemes,
	engine: () => createOnigurumaEngine(import("shiki/wasm")),
})

type Highlighter = Awaited<ReturnType<typeof createCuratedHighlighter>>

// Track which languages we've warned about to avoid duplicate warnings
const warnedLanguages = new Set<string>()

// Normalize language to a valid Shiki language
export function normalizeLanguage(language: string | undefined): ExtendedLanguage {
	if (language === undefined) {
		return "txt"
	}

	// Convert to lowercase for consistent matching
	const normalizedInput = language.toLowerCase()

	// If it's a curated bundled language, return it
	if (normalizedInput in curatedLanguageModules) {
		return normalizedInput as CuratedLanguage
	}

	// Check if it's an alias
	if (normalizedInput in languageAliases) {
		return languageAliases[normalizedInput]
	}

	// Warn about unrecognized language and default to txt (only once per language)
	if (language !== "txt" && !warnedLanguages.has(language)) {
		console.warn(`[Shiki] Unrecognized language '${language}', defaulting to txt.`)
		warnedLanguages.add(language)
	}

	return "txt"
}

// Export function to check if a language is loaded
export const isLanguageLoaded = (language: string): boolean => {
	return state.loadedLanguages.has(normalizeLanguage(language))
}

// Artificial delay for testing language loading (ms) - for testing
const LANGUAGE_LOAD_DELAY = 0

// Common languages for first-stage initialization
const initialLanguages: CuratedLanguage[] = ["shellscript", "log"]

// Singleton state
const state: {
	instance: Highlighter | null
	instanceInitPromise: Promise<Highlighter> | null
	loadedLanguages: Set<ExtendedLanguage>
	pendingLanguageLoads: Map<ExtendedLanguage, Promise<void>>
} = {
	instance: null,
	instanceInitPromise: null,
	loadedLanguages: new Set<ExtendedLanguage>(["txt"]),
	pendingLanguageLoads: new Map(),
}

export const getHighlighter = async (language?: string): Promise<Highlighter> => {
	try {
		const shikilang = normalizeLanguage(language)

		// Initialize highlighter if needed
		if (!state.instanceInitPromise) {
			state.instanceInitPromise = (async () => {
				// const startTime = performance.now()
				// console.debug("[Shiki] Initialization started...")

				const instance = await createCuratedHighlighter({
					themes: ["github-light", "github-dark"],
					langs: initialLanguages,
				})

				// const elapsed = Math.round(performance.now() - startTime)
				// console.debug(`[Shiki] Initialization complete (${elapsed}ms)`)

				state.instance = instance

				// Track initially loaded languages
				initialLanguages.forEach((lang) => state.loadedLanguages.add(lang))

				return instance
			})()
		}

		// Wait for initialization to complete
		const instance = await state.instanceInitPromise

		// Load requested language if needed (txt is already in loadedLanguages)
		if (!state.loadedLanguages.has(shikilang)) {
			// Check for existing pending load
			let loadingPromise = state.pendingLanguageLoads.get(shikilang)

			if (!loadingPromise) {
				// const loadStart = performance.now()
				// Create new loading promise
				loadingPromise = (async () => {
					try {
						// Add artificial delay for testing if nonzero
						if (LANGUAGE_LOAD_DELAY > 0) {
							await new Promise((resolve) => setTimeout(resolve, LANGUAGE_LOAD_DELAY))
						}

						await instance.loadLanguage(shikilang)
						state.loadedLanguages.add(shikilang)

						// const loadTime = Math.round(performance.now() - loadStart)
						// console.debug(`[Shiki] Loaded language ${shikilang} (${loadTime}ms)`)
					} catch (error) {
						console.error(`[Shiki] Failed to load language ${shikilang}:`, error)
						throw error
					} finally {
						// Clean up pending promise after completion
						state.pendingLanguageLoads.delete(shikilang)
					}
				})()

				// Store the promise
				state.pendingLanguageLoads.set(shikilang, loadingPromise)
			}

			await loadingPromise
		}

		return instance
	} catch (error) {
		console.error("[Shiki] Error in getHighlighter:", error)
		throw error
	}
}
