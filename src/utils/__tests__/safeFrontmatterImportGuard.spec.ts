import fs from "fs"
import path from "path"

/**
 * Architecture guard for the SYNC-23 frontmatter hardening (CP1 finding F-01).
 *
 * `gray-matter`'s default export executes whichever engine a document's own header
 * names (`---js`, `---toml`, `---coffee`, …), so parsing an untrusted workspace file
 * with it is remote code execution. The fork's only control is the pre-check inside
 * `src/utils/safeFrontmatter.ts`; passing `{ language: "yaml" }` is a parse-cache
 * bypass, not a security control (gray-matter 4.0.3 overwrites `file.language` from
 * the document header).
 *
 * This test fails if any other module under `src/` holds the module object — a
 * default import, a namespace import, `require(...)`, a dynamic `import(...)`, a
 * side-effect import or a re-export — so a future frontmatter reader cannot
 * silently reopen the vulnerability with every other gate green.
 *
 * Named `stringify`-only imports stay allowed: `stringify` never parses a document.
 */
const SRC_ROOT = path.resolve(__dirname, "..", "..")
const SAFE_FRONTMATTER = path.join(SRC_ROOT, "utils", "safeFrontmatter.ts")
const SELF = path.resolve(__filename)
const MODULE_NAME = "gray-matter"
const ALLOWED_NAMED_BINDINGS = new Set(["stringify"])
const SCANNED_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"])
const SKIPPED_DIRECTORIES = new Set(["node_modules", "dist", "out", "coverage", ".git"])

interface Statement {
	text: string
	line: number
}

interface Verdict {
	forbidden: boolean
	reason: string
}

interface Violation {
	file: string
	line: number
	statement: string
	reason: string
}

function listSourceFiles(directory: string): string[] {
	const files: string[] = []
	for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
		const fullPath = path.join(directory, entry.name)
		if (entry.isDirectory()) {
			if (!SKIPPED_DIRECTORIES.has(entry.name)) {
				files.push(...listSourceFiles(fullPath))
			}
			continue
		}
		if (entry.isFile() && SCANNED_EXTENSIONS.has(path.extname(entry.name))) {
			files.push(fullPath)
		}
	}
	return files
}

/** Reassembles a statement that mentions the module, following obvious continuations upwards. */
function statementAt(lines: string[], index: number): Statement {
	const current = lines[index].trim()
	if (!/^[},]/.test(current)) {
		return { text: current, line: index + 1 }
	}
	let start = index
	while (start > 0) {
		const previous = lines[start - 1].trim()
		const continues =
			/^(import|export)\b/.test(previous) ||
			/(?:from|require\(|import\()$/.test(previous) ||
			previous.endsWith("{") ||
			previous.endsWith(",")
		if (!continues) {
			break
		}
		start -= 1
		if (/^(import|export)\b/.test(previous)) {
			break
		}
	}
	return {
		text: lines
			.slice(start, index + 1)
			.join("\n")
			.trim(),
		line: start + 1,
	}
}

function classifyStatement(statement: string): Verdict {
	if (!/\b(?:import|require|export)\b/.test(statement)) {
		return { forbidden: false, reason: "not a module statement" }
	}
	if (/(?:require|import)\s*\(\s*["']gray-matter["']\s*\)/.test(statement)) {
		return { forbidden: true, reason: "requires or dynamically imports the module object" }
	}
	if (/^import\s+["']gray-matter["']/.test(statement)) {
		return { forbidden: true, reason: "side-effect-imports the module object" }
	}
	if (/^export\b/.test(statement)) {
		return { forbidden: true, reason: "re-exports the module object" }
	}
	if (/^import\s+type\b/.test(statement)) {
		return { forbidden: false, reason: "type-only import" }
	}

	const staticImport = /^import\s+(?:type\s+)?([\s\S]+?)\s+from\s*["']gray-matter["']/.exec(statement)
	if (!staticImport) {
		return { forbidden: true, reason: "unrecognised gray-matter import form" }
	}

	const clause = staticImport[1].trim()
	if (clause.startsWith("*")) {
		return { forbidden: true, reason: `namespace import (${clause}) exposes the callable export` }
	}
	if (clause.startsWith("{")) {
		const names = clause
			.replace(/^\{/, "")
			.replace(/\}$/, "")
			.split(",")
			.map((specifier) => specifier.trim().replace(/^type\s+/, ""))
			.filter(Boolean)
			.map((specifier) => specifier.split(/\s+as\s+/)[0].trim())
		const disallowed = names.filter((name) => !ALLOWED_NAMED_BINDINGS.has(name))
		return disallowed.length === 0
			? { forbidden: false, reason: "stringify-only named import" }
			: { forbidden: true, reason: `imports ${disallowed.join(", ")} from the module object` }
	}

	return { forbidden: true, reason: `default import (${clause}) exposes the callable export` }
}

function findViolations(): Violation[] {
	const violations: Violation[] = []
	for (const file of listSourceFiles(SRC_ROOT).sort()) {
		// The guard's own source mentions the module name in its patterns and fixtures.
		if (file === SAFE_FRONTMATTER || file === SELF) {
			continue
		}
		const content = fs.readFileSync(file, "utf8")
		if (!content.includes(MODULE_NAME)) {
			continue
		}
		const lines = content.split("\n")
		const seen = new Set<number>()
		lines.forEach((lineText, index) => {
			if (!lineText.includes(MODULE_NAME)) {
				return
			}
			const trimmed = lineText.trim()
			if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) {
				return
			}
			const statement = statementAt(lines, index)
			if (seen.has(statement.line)) {
				return
			}
			seen.add(statement.line)
			const verdict = classifyStatement(statement.text)
			if (verdict.forbidden) {
				violations.push({
					file: path.relative(SRC_ROOT, file).split(path.sep).join("/"),
					line: statement.line,
					statement: statement.text,
					reason: verdict.reason,
				})
			}
		})
	}
	return violations
}

describe("gray-matter import guard", () => {
	it("keeps the callable gray-matter export inside safeFrontmatter.ts", () => {
		const violations = findViolations().map(
			(violation) => `${violation.file}:${violation.line} — ${violation.reason}\n${violation.statement}`,
		)
		expect(
			violations,
			"parseFrontmatter() from src/utils/safeFrontmatter.ts is the only supported entry point: " +
				"gray-matter's default export executes a document-selected engine (SYNC-23)",
		).toEqual([])
	})

	it.each([
		['import matter from "gray-matter"', true],
		['import matter, { stringify } from "gray-matter"', true],
		['import * as matter from "gray-matter"', true],
		['import "gray-matter"', true],
		['export { default as matter } from "gray-matter"', true],
		['const matter = require("gray-matter")', true],
		['const matter = await import("gray-matter")', true],
		['import { stringify } from "gray-matter"', false],
		['import { stringify as toMarkdown } from "gray-matter"', false],
		['import type { GrayMatterFile } from "gray-matter"', false],
	])("classifies %s as forbidden=%s", (statement, forbidden) => {
		expect(classifyStatement(statement).forbidden).toBe(forbidden)
	})

	it("reassembles a multi-line named import", () => {
		const lines = ["import {", "\tstringify,", '} from "gray-matter"', ""]
		const statement = statementAt(lines, 2)
		expect(statement.line).toBe(1)
		expect(classifyStatement(statement.text).forbidden).toBe(false)
	})
})
