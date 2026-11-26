import fs from "fs"
import path from "path"

import ts from "typescript"

/**
 * Architecture guard for the SYNC-23 frontmatter hardening (CP1 F-01, CP2 F-02/F-04).
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
 * side-effect import, a re-export, `import x = require(...)`, or a
 * `createRequire(...)` indirection — so a future frontmatter reader cannot silently
 * reopen the vulnerability with every other gate green.
 *
 * The scan is a TypeScript AST walk (`ts.createSourceFile` + a node visitor), not a
 * text/regex scan: the previous implementation missed a multi-line default import
 * and a `node:module`-mediated `require`, and rejected the legitimate
 * `import { type X } from "gray-matter"` (CP2 F-02, F-04). A regex scanner is being
 * asked to be a parser; this one is one.
 *
 * Allowed, because none of them reaches the callable export:
 *   - `import { stringify } from "gray-matter"` (and an alias of it),
 *   - `import { type X } from "gray-matter"` / `import type { X } from "gray-matter"`,
 *   - `export type { X } from "gray-matter"`,
 *   - `typeof import("gray-matter").X` (an ImportTypeNode — a type position).
 *
 * Anything else that names the package is default-denied: every remaining string
 * literal equal to `"gray-matter"` is reported, so an unrecognised shape fails
 * loudly instead of slipping through.
 */
const SRC_ROOT = path.resolve(__dirname, "..", "..")
const SAFE_FRONTMATTER = path.join(SRC_ROOT, "utils", "safeFrontmatter.ts")
const SELF = path.resolve(__filename)
const MODULE_NAME = "gray-matter"
const ALLOWED_NAMED_BINDINGS = new Set(["stringify"])
const SCANNED_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"])
const SKIPPED_DIRECTORIES = new Set(["node_modules", "dist", "out", "coverage", ".git"])

interface Verdict {
	line: number
	reason: string
}

interface Violation extends Verdict {
	file: string
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

/** The literal text of a module specifier node, or `null` for any other node. */
function specifierText(node: ts.Node): string | null {
	if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
		return node.text
	}
	return null
}

/** True for `"gray-matter"` and its subpaths (`"gray-matter/lib/…"`). */
function namesModule(node: ts.Node): boolean {
	const text = specifierText(node)
	return text !== null && (text === MODULE_NAME || text.startsWith(`${MODULE_NAME}/`))
}

function isCreateRequireCallee(node: ts.Expression): boolean {
	return (
		(ts.isIdentifier(node) && node.text === "createRequire") ||
		(ts.isPropertyAccessExpression(node) && node.name.text === "createRequire")
	)
}

/**
 * Every forbidden reference to `gray-matter` in one source text.
 *
 * Exported through the returned closure only — the spec builds fixtures in memory,
 * so no fixture file ever lands on disk where the whole-tree scan would read it.
 */
function findForbiddenReferences(source: string, fileName = "fixture.ts"): Verdict[] {
	const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true)
	const verdicts: Verdict[] = []

	/** Specifiers already classified, keyed by node position, so the deny-by-default pass does not re-report them. */
	const classified = new Set<number>()
	/** Identifier bound from `createRequire(...)` (`const req = createRequire(import.meta.url)`). */
	const requireAliases = new Set<string>()

	const lineOf = (node: ts.Node): number =>
		sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1
	const report = (node: ts.Node, reason: string): void => {
		verdicts.push({ line: lineOf(node), reason })
	}

	// Pass 1 — the aliases a `createRequire` indirection can hide behind.
	const collectRequireAliases = (node: ts.Node): void => {
		if (
			ts.isVariableDeclaration(node) &&
			ts.isIdentifier(node.name) &&
			node.initializer &&
			ts.isCallExpression(node.initializer) &&
			isCreateRequireCallee(node.initializer.expression)
		) {
			requireAliases.add(node.name.text)
		}
		ts.forEachChild(node, collectRequireAliases)
	}
	collectRequireAliases(sourceFile)

	// Pass 2 — classify every import/export/call that names the package.
	const classify = (node: ts.Node): void => {
		if (ts.isImportDeclaration(node)) {
			if (namesModule(node.moduleSpecifier)) {
				classified.add(node.moduleSpecifier.pos)
				classifyImportDeclaration(node, report)
			}
		} else if (ts.isExportDeclaration(node)) {
			if (node.moduleSpecifier && namesModule(node.moduleSpecifier)) {
				classified.add(node.moduleSpecifier.pos)
				if (!node.isTypeOnly) {
					report(node, "re-exports the module object")
				}
			}
		} else if (ts.isImportEqualsDeclaration(node)) {
			const reference = node.moduleReference
			if (ts.isExternalModuleReference(reference) && reference.expression && namesModule(reference.expression)) {
				classified.add(reference.expression.pos)
				report(node, "import x = require(...) binds the module object")
			}
		} else if (ts.isImportTypeNode(node)) {
			// `typeof import("gray-matter").X` — a type position, so no runtime value.
			if (ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) {
				classified.add(node.argument.literal.pos)
			}
		} else if (ts.isCallExpression(node)) {
			classifyCallExpression(node, requireAliases, classified, report)
		}

		ts.forEachChild(node, classify)
	}
	classify(sourceFile)

	// Pass 3 — deny by default: any remaining literal that names the package is
	// an unrecognised shape, so it fails rather than slipping through.
	const reportUnclassified = (node: ts.Node): void => {
		if (namesModule(node) && !classified.has(node.pos)) {
			report(node, "unrecognised gray-matter reference")
		}
		ts.forEachChild(node, reportUnclassified)
	}
	reportUnclassified(sourceFile)

	return verdicts
}

function classifyImportDeclaration(node: ts.ImportDeclaration, report: (node: ts.Node, reason: string) => void): void {
	const clause = node.importClause

	if (!clause) {
		report(node, "side-effect-imports the module object")
		return
	}

	if (clause.isTypeOnly) {
		return
	}

	if (clause.name) {
		report(node, `default import (${clause.name.text}) exposes the callable export`)
	}

	const bindings = clause.namedBindings
	if (!bindings) {
		return
	}

	if (ts.isNamespaceImport(bindings)) {
		report(node, `namespace import (* as ${bindings.name.text}) exposes the callable export`)
		return
	}

	for (const element of bindings.elements) {
		if (element.isTypeOnly) {
			continue
		}
		const imported = (element.propertyName ?? element.name).text
		if (!ALLOWED_NAMED_BINDINGS.has(imported)) {
			report(node, `imports ${imported} from the module object`)
		}
	}
}

function classifyCallExpression(
	node: ts.CallExpression,
	requireAliases: Set<string>,
	classified: Set<number>,
	report: (node: ts.Node, reason: string) => void,
): void {
	const firstArgument = node.arguments[0]
	if (!firstArgument || !namesModule(firstArgument)) {
		return
	}

	classified.add(firstArgument.pos)
	const callee = node.expression

	if (callee.kind === ts.SyntaxKind.ImportKeyword) {
		report(node, "dynamically imports the module object")
		return
	}

	if (ts.isIdentifier(callee)) {
		if (callee.text === "require") {
			report(node, "requires the module object")
			return
		}
		if (requireAliases.has(callee.text)) {
			report(node, `createRequire indirection (${callee.text}(…)) loads the module object`)
			return
		}
		report(node, `unrecognised gray-matter load call (${callee.text}(…))`)
		return
	}

	if (ts.isPropertyAccessExpression(callee) && callee.name.text === "require") {
		report(node, "requires the module object through a property access")
		return
	}

	report(node, "unrecognised gray-matter load call")
}

function findViolations(): Violation[] {
	const violations: Violation[] = []

	for (const file of listSourceFiles(SRC_ROOT).sort()) {
		// The guard's own source mentions the module name in its patterns and fixtures.
		if (file === SAFE_FRONTMATTER || file === SELF) {
			continue
		}

		const content = fs.readFileSync(file, "utf8")
		// Cheap pre-filter: a file cannot reach the package without naming it, and
		// parsing only the files that do keeps the whole-tree scan fast.
		if (!content.includes(MODULE_NAME)) {
			continue
		}

		for (const verdict of findForbiddenReferences(content, file)) {
			violations.push({
				file: path.relative(SRC_ROOT, file).split(path.sep).join("/"),
				line: verdict.line,
				reason: verdict.reason,
			})
		}
	}

	return violations
}

const reasonsFor = (source: string): string[] => findForbiddenReferences(source).map((verdict) => verdict.reason)

describe("gray-matter import guard", () => {
	it("keeps the callable gray-matter export inside safeFrontmatter.ts", () => {
		const violations = findViolations().map(
			(violation) => `${violation.file}:${violation.line} — ${violation.reason}`,
		)
		expect(
			violations,
			"parseFrontmatter() from src/utils/safeFrontmatter.ts is the only supported entry point: " +
				"gray-matter's default export executes a document-selected engine (SYNC-23)",
		).toEqual([])
	})

	it.each([
		["default import", ['import matter from "gray-matter"']],
		["multi-line default import (missed by the old text scan)", ["import matter", '\tfrom "gray-matter"']],
		["default + named import", ['import matter, { stringify } from "gray-matter"']],
		["namespace import", ['import * as matter from "gray-matter"']],
		["named import of the callable", ['import { default as gm } from "gray-matter"']],
		["named import of a non-stringify binding", ['import { safeLoad } from "gray-matter"']],
		["bare side-effect import", ['import "gray-matter"']],
		["re-export", ['export { default as matter } from "gray-matter"']],
		["export *", ['export * from "gray-matter"']],
		["export of a named binding", ['export { stringify } from "gray-matter"']],
		["require()", ['const matter = require("gray-matter")']],
		["dynamic import()", ['const matter = await import("gray-matter")']],
		["import x = require()", ['import matter = require("gray-matter")']],
		["subpath import", ['import matter from "gray-matter/lib/engines"']],
		[
			"createRequire indirection (missed by the old text scan)",
			[
				'import { createRequire } from "node:module"',
				"const req = createRequire(import.meta.url)",
				'const matter = req("gray-matter")',
			],
		],
		[
			"createRequire indirection through a template literal",
			["const load = createRequire(import.meta.url)", "const matter = load(`gray-matter`)"],
		],
		["module.require()", ['const matter = module.require("gray-matter")']],
		[
			"module.createRequire() then require",
			["const req = module.createRequire(import.meta.url)", 'req("gray-matter")'],
		],
		["an aliased loader the scan cannot attribute", ['const matter = loadModule("gray-matter")']],
	])("flags a %s", (_label, lines) => {
		expect(reasonsFor(lines.join("\n")).length).toBeGreaterThan(0)
	})

	it.each([
		["named stringify import", 'import { stringify } from "gray-matter"'],
		["aliased stringify import", 'import { stringify as toMarkdown } from "gray-matter"'],
		["inline type specifier", 'import { type GrayMatterFile } from "gray-matter"'],
		["inline type + stringify", 'import { stringify, type GrayMatterFile } from "gray-matter"'],
		["whole-clause type import", 'import type { GrayMatterFile } from "gray-matter"'],
		["type-only re-export", 'export type { GrayMatterFile } from "gray-matter"'],
		["type-position import()", 'type X = typeof import("gray-matter").GrayMatterFile'],
	])("allows a %s", (_label, source) => {
		expect(reasonsFor(source)).toEqual([])
	})

	it("is non-vacuous: each previously-missed shape is flagged with its own reason", () => {
		const multiLineDefault = reasonsFor(["import matter", '\tfrom "gray-matter"'].join("\n"))
		expect(multiLineDefault.join(" | ")).toMatch(/default import \(matter\)/)

		const createRequire = reasonsFor(
			[
				'import { createRequire } from "node:module"',
				"const req = createRequire(import.meta.url)",
				'const matter = req("gray-matter")',
			].join("\n"),
		)
		expect(createRequire.join(" | ")).toMatch(/createRequire indirection/)
	})

	it("does not rely on line shape: indentation, one-liners and comments all classify the same", () => {
		const indented = ["function load() {", '\treturn import("gray-matter")', "}"].join("\n")
		expect(reasonsFor(indented).length).toBe(1)

		const commentOnly = ['// import matter from "gray-matter" is forbidden', "const x = 1"].join("\n")
		expect(reasonsFor(commentOnly)).toEqual([])
	})

	it("reports the line of the offending statement", () => {
		const source = ["const a = 1", "const b = 2", 'const matter = require("gray-matter")'].join("\n")
		expect(findForbiddenReferences(source)).toEqual([{ line: 3, reason: "requires the module object" }])
	})

	it("ignores source that never names the package", () => {
		expect(reasonsFor('import fs from "fs"')).toEqual([])
	})
})
