import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

/**
 * Guard for the `escapeValue: false` × `dangerouslySetInnerHTML` seam.
 *
 * `src/i18n/setup.ts` initialises i18next with `interpolation.escapeValue: false`
 * (React escapes by default), so a translated string is NOT HTML-escaped. That is
 * safe as long as translated text only ever reaches the DOM through React's
 * normal text/attribute channels.
 *
 * If a translation were ever routed into `dangerouslySetInnerHTML` (`__html`), a
 * locale file — third-party content we do not control — would become an XSS
 * vector, because `escapeValue: false` deliberately strips the escaping that would
 * otherwise neutralise it.
 *
 * This spec pins the seam from the source side:
 *   1. the raw-HTML sink inventory is closed — a NEW sink fails until it is
 *      reviewed and added to REVIEWED_SINKS below,
 *   2. no `__html` expression may reference a translation call
 *      (`t(...)`, `i18n.t(...)`, `translate(...)`).
 *
 * Residual risk: this is a source-level check, so it cannot see a translation
 * string that travels through a variable/indirection before reaching a sink
 * (e.g. `const html = someI18nString; <div dangerouslySetInnerHTML={{ __html: html }} />`).
 * The three reviewed sinks all derive their HTML from terminal output, search
 * highlights, and Mermaid SVG — never from a locale file — so the indirect path
 * does not apply today.
 */

const SRC_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")

const EXTENSIONS = new Set([".ts", ".tsx"])

/**
 * Every file that legitimately renders raw HTML, with its data source. Any file
 * that gains a `dangerouslySetInnerHTML={{ __html: … }}` sink must be added here
 * after confirming the HTML cannot originate from a translation.
 */
const REVIEWED_SINKS: Record<string, string> = {
	"components/chat/TerminalOutput.tsx": "terminal output converted to HTML",
	"components/history/TaskItem.tsx": "sanitized search-highlight markup",
	"components/common/MermaidButton.tsx": "sanitized Mermaid SVG",
}

/** Looks like a call into the translation layer. */
const I18N_CALL_RE = /\bt\s*\(|i18n\.|useAppTranslation|translate\s*\(/

const isTestFile = (file: string) =>
	file.includes(`${path.sep}__tests__${path.sep}`) || /\.(test|spec)\.[cm]?[jt]sx?$/.test(file)

const collectSourceFiles = (dir: string): string[] => {
	const out: string[] = []
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const abs = path.join(dir, entry.name)
		if (isTestFile(abs) || entry.name === "node_modules") continue
		if (entry.isDirectory()) out.push(...collectSourceFiles(abs))
		else if (EXTENSIONS.has(path.extname(abs))) out.push(abs)
	}
	return out
}

/**
 * Extract the `__html` expression of every `dangerouslySetInnerHTML={{ … }}` sink.
 * The search is anchored on `dangerouslySetInnerHTML={`, so a bare mention in a
 * comment (e.g. CodeBlock.tsx) is not treated as a sink.
 */
export const extractHtmlExpressions = (source: string): string[] => {
	const marker = "dangerouslySetInnerHTML={"
	const expressions: string[] = []

	let index = source.indexOf(marker)
	while (index !== -1) {
		const body = source.slice(index + marker.length)

		// Walk the object literal to its matching closing brace.
		let depth = 1
		let end = 0
		for (; end < body.length; end++) {
			const char = body[end]
			if (char === "{") depth++
			else if (char === "}") {
				depth--
				if (depth === 0) break
			}
		}

		const literal = body.slice(0, end)
		const htmlIndex = literal.indexOf("__html:")
		if (htmlIndex !== -1) {
			expressions.push(literal.slice(htmlIndex + "__html:".length).trim())
		}

		index = source.indexOf(marker, index + marker.length)
	}

	return expressions
}

const filesWithSinks = collectSourceFiles(SRC_DIR)
	.map((abs) => ({
		relative: path.relative(SRC_DIR, abs).split(path.sep).join("/"),
		content: fs.readFileSync(abs, "utf8"),
	}))
	.map((entry) => ({ ...entry, expressions: extractHtmlExpressions(entry.content) }))
	.filter((entry) => entry.expressions.length > 0)

describe("i18n text and dangerouslySetInnerHTML", () => {
	it("only the reviewed files render raw HTML", () => {
		const found = filesWithSinks.map((entry) => entry.relative).sort()
		expect(found).toEqual(Object.keys(REVIEWED_SINKS).sort())
	})

	it("no raw-HTML sink consumes a translation string", () => {
		const offenders = filesWithSinks.flatMap((entry) =>
			entry.expressions
				.filter((expression) => I18N_CALL_RE.test(expression))
				.map((expression) => `${entry.relative}: __html: ${expression}`),
		)

		expect(offenders).toEqual([])
	})

	it("keeps escapeValue disabled (the reason this guard exists)", () => {
		const setup = fs.readFileSync(path.resolve(SRC_DIR, "i18n/setup.ts"), "utf8")
		expect(setup).toMatch(/escapeValue:\s*false/)
	})
})
