#!/usr/bin/env node

/**
 * verify-doc-links.mjs
 *
 * CI guard for the in-app "learn more" help links (docs/help-pages-plan.md §5).
 *
 * Every `buildDocLink(path, campaign)` call site in the production webview must
 * resolve to a real Markdown page under `docs/help/`, and the shipped resolution
 * map (`webview-ui/src/utils/docLinkMap.generated.ts`) must stay in sync with
 * that tree. This gate fails the build when:
 *
 *   1. an enumerated slug has no `docs/help/<slug>.md` (and is not on the
 *      explicit FALLBACK_ALLOWLIST), or
 *   2. the generated map's keys do not equal the set of existing help pages, or
 *   3. a call-site anchor has no matching (GitHub-slugified) heading in its page.
 *
 * Check 5 (a page that no call site references) is reported as a WARNING only:
 * proactively-authored pages should not fail CI.
 *
 * Scope of the call-site inventory: `webview-ui/src/**` for `*.ts`/`*.tsx`,
 * excluding `__tests__` and `*.spec.*` (the four `vi.mock("@/utils/docLinks")`
 * definitions are test-only and are not real slugs).
 *
 * Usage (repo root):
 *   node scripts/verify-doc-links.mjs
 *   ROO_HELP_ROOT=/tmp/fixture node scripts/verify-doc-links.mjs
 *
 * Env overrides (used by the spec):
 *   ROO_HELP_ROOT        docs/help root           (default: <repo>/docs/help)
 *   ROO_DOC_LINK_MAP     generated map path       (default: <repo>/webview-ui/src/utils/docLinkMap.generated.ts)
 *   ROO_WEBVIEW_SRC      webview src root         (default: <repo>/webview-ui/src)
 */

import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

import { logStep, logEndGroup, logInfo, logOk, logWarn, logError, logSuccess } from "./lib/logger.mjs"
import { DYNAMIC_PREFIXES, PROVIDER_DOC_SLUGS, FALLBACK_ALLOWLIST } from "./lib/help-pages.mjs"

const TAG = "VERIFY:DOC-LINKS"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")

const DEFAULT_HELP_ROOT = path.join(ROOT, "docs", "help")
const DEFAULT_MAP_PATH = path.join(ROOT, "webview-ui", "src", "utils", "docLinkMap.generated.ts")
const DEFAULT_WEBVIEW_SRC = path.join(ROOT, "webview-ui", "src")

/** Directory names never descended into while enumerating call sites. */
export const EXCLUDED_DIRS = new Set(["node_modules", "__tests__", "build", "out", "dist", ".turbo", ".vitest"])

/**
 * Normalises a raw `buildDocLink` path literal into slug + anchor, mirroring
 * `normaliseDocSlug` in webview-ui/src/utils/docLinks.ts (plan §4.3).
 * @param {string} raw
 * @returns {{ slug: string; anchor: string }}
 */
export function normaliseSlug(raw) {
	const withoutLeading = raw.replace(/^\/+/, "")
	const hashIndex = withoutLeading.indexOf("#")
	const rawSlug = hashIndex >= 0 ? withoutLeading.slice(0, hashIndex) : withoutLeading
	const anchor = hashIndex >= 0 ? withoutLeading.slice(hashIndex + 1) : ""
	return { slug: rawSlug.replace(/\/+$/, "").trim().toLowerCase(), anchor }
}

/**
 * GitHub's heading-to-anchor slugification: lowercase, drop anything that is
 * not a word character / space / hyphen, then spaces -> hyphens.
 * @param {string} heading
 * @returns {string}
 */
export function slugifyHeading(heading) {
	return heading
		.trim()
		.toLowerCase()
		.replace(/[^\w\- ]+/g, "")
		.replace(/ /g, "-")
}

/**
 * Extracts the slugified anchor of every ATX/Setext heading in a Markdown page.
 * @param {string} content
 * @returns {Set<string>}
 */
export function headingSlugs(content) {
	const out = new Set()
	for (const line of content.split(/\r?\n/)) {
		const m = /^#{1,6}\s+(.+?)\s*#*\s*$/.exec(line)
		if (m) out.add(slugifyHeading(m[1]))
	}
	return out
}

/**
 * Recursively enumerates call-site files.
 * @param {string} dir
 * @returns {string[]}
 */
export function collectSourceFiles(dir) {
	if (!fs.existsSync(dir)) return []
	const out = []
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		if (entry.isDirectory()) {
			if (EXCLUDED_DIRS.has(entry.name)) continue
			out.push(...collectSourceFiles(path.join(dir, entry.name)))
		} else if (entry.isFile()) {
			if (!/\.tsx?$/.test(entry.name)) continue
			if (/\.spec\.tsx?$/.test(entry.name)) continue
			out.push(path.join(dir, entry.name))
		}
	}
	return out
}

/** 1-based line number of a character offset within `content`. */
function lineAt(content, index) {
	let line = 1
	for (let i = 0; i < index; i++) if (content.charCodeAt(i) === 10) line++
	return line
}

/**
 * Enumerates every `buildDocLink(...)` call site and the literal path it passes
 * as its first argument (string or template literal; dynamic templates are
 * flagged). Pure — exported for the spec.
 * @param {string} srcRoot
 * @returns {{ file: string; line: number; raw: string; slug: string; anchor: string; dynamicPrefix: string | null }[]}
 */
export function collectCallSites(srcRoot) {
	const sites = []
	for (const file of collectSourceFiles(srcRoot)) {
		const content = fs.readFileSync(file, "utf-8")
		const callRe = /buildDocLink\s*\(/g
		for (const match of content.matchAll(callRe)) {
			const afterIndex = match.index + match[0].length
			const literal = content.slice(afterIndex).match(/^\s*(["'`])([\s\S]*?)\1/)
			if (!literal) continue
			const raw = literal[2]
			const line = lineAt(content, match.index)
			const rel = path.relative(ROOT, file).split(path.sep).join("/")
			const dynamicIndex = raw.indexOf("${")
			if (dynamicIndex >= 0) {
				sites.push({
					file: rel,
					line,
					raw,
					slug: "",
					anchor: "",
					dynamicPrefix: raw.slice(0, dynamicIndex),
				})
			} else {
				const { slug, anchor } = normaliseSlug(raw)
				sites.push({ file: rel, line, raw, slug, anchor, dynamicPrefix: null })
			}
		}
	}
	return sites
}

/**
 * Recursively collects every `docs/help/**` Markdown page as a normalised slug.
 * @param {string} helpRoot
 * @returns {Set<string>}
 */
export function collectHelpSlugs(helpRoot) {
	const out = new Set()
	if (!fs.existsSync(helpRoot)) return out
	const walk = (dir, base) => {
		for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
			const abs = path.join(dir, entry.name)
			if (entry.isDirectory()) {
				walk(abs, base)
			} else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
				const rel = path.relative(base, abs).split(path.sep).join("/")
				out.add(rel.replace(/\.md$/i, "").trim().toLowerCase())
			}
		}
	}
	walk(helpRoot, helpRoot)
	return out
}

/**
 * Reads the keys of the generated map module.
 * @param {string} mapPath
 * @returns {Set<string>}
 */
export function parseMapKeys(mapPath) {
	const content = fs.readFileSync(mapPath, "utf-8")
	const out = new Set()
	for (const m of content.matchAll(/"([^"]+)"\s*:\s*\{\s*path:/g)) out.add(m[1])
	return out
}

/**
 * Runs every doc-link check against the given roots. Pure enough for the spec
 * to point at temp fixtures.
 * @param {{ helpRoot: string; mapPath: string; srcRoot: string }} opts
 * @returns {{ ok: boolean; errors: string[]; warnings: string[]; counts: object }}
 */
export function verifyDocLinks({ helpRoot, mapPath, srcRoot }) {
	const errors = []
	const warnings = []

	const sites = collectCallSites(srcRoot)
	const staticSlugs = new Set()
	const providerSlugs = new Set()
	const anchors = []
	const referenced = new Set()

	for (const site of sites) {
		if (site.dynamicPrefix !== null) {
			if (!DYNAMIC_PREFIXES.includes(site.dynamicPrefix)) {
				errors.push(
					`${site.file}:${site.line}: unrecognised dynamic buildDocLink prefix "${site.dynamicPrefix}\${...}" (known: ${DYNAMIC_PREFIXES.join(", ")})`,
				)
				continue
			}
			for (const provider of PROVIDER_DOC_SLUGS) {
				const slug = `${site.dynamicPrefix}${provider}`
				providerSlugs.add(slug)
				referenced.add(slug)
			}
			continue
		}
		staticSlugs.add(site.slug)
		referenced.add(site.slug)
		if (site.anchor) anchors.push({ slug: site.slug, anchor: site.anchor, file: site.file, line: site.line })
	}

	const helpSlugs = collectHelpSlugs(helpRoot)

	// Check 2 — existence (or explicit fallback allowlist).
	const allEnumerated = new Set([...staticSlugs, ...providerSlugs])
	for (const slug of [...allEnumerated].sort()) {
		if (helpSlugs.has(slug)) continue
		if (FALLBACK_ALLOWLIST.includes(slug)) continue
		const site = sites.find((s) => s.slug === slug)
		const origin = site ? `${site.file}:${site.line}` : "a dynamic provider expansion"
		errors.push(
			`missing help page for slug "${slug}"\n` +
				`  referenced by ${origin}\n` +
				`  expected docs/help/${slug}.md\n` +
				`  fix: author the page (see docs/help-pages-plan.md §2), OR add the slug to\n` +
				`       FALLBACK_ALLOWLIST in scripts/verify-doc-links.mjs with a justification comment.`,
		)
	}

	// Check 3 — generated map in sync with the docs/help tree.
	let mapKeys = new Set()
	try {
		mapKeys = parseMapKeys(mapPath)
	} catch (error) {
		errors.push(`cannot read generated map ${mapPath}: ${error.message}`)
	}
	if (mapKeys.size > 0 || helpSlugs.size === 0) {
		for (const slug of helpSlugs) {
			if (!mapKeys.has(slug)) {
				errors.push(
					`generated map is missing "${slug}" (page exists but is not in docLinkMap.generated.ts)\n` +
						`  fix: run \`node scripts/generate-doc-link-map.mjs\``,
				)
			}
		}
		for (const key of mapKeys) {
			if (!helpSlugs.has(key)) {
				errors.push(
					`generated map has stale key "${key}" (no docs/help/${key}.md)\n` +
						`  fix: run \`node scripts/generate-doc-link-map.mjs\``,
				)
			}
		}
	}

	// Check 4 — every referenced anchor resolves to a matching heading.
	for (const { slug, anchor, file, line } of anchors) {
		const page = path.join(helpRoot, `${slug}.md`)
		if (!fs.existsSync(page)) continue // already reported by check 2
		const slugs = headingSlugs(fs.readFileSync(page, "utf-8"))
		if (!slugs.has(anchor)) {
			errors.push(
				`anchor "#${anchor}" has no matching heading in docs/help/${slug}.md\n` +
					`  referenced by ${file}:${line}\n` +
					`  the page must contain a heading that slugifies to "${anchor}" (see docs/help-pages-plan.md §4.5).`,
			)
		}
	}

	// Check 5 — pages no call site references (warning only, prevents rot).
	for (const slug of [...helpSlugs].sort()) {
		if (!referenced.has(slug)) {
			warnings.push(`docs/help/${slug}.md is not referenced by any buildDocLink call site`)
		}
	}

	return {
		ok: errors.length === 0,
		errors,
		warnings,
		counts: {
			callSites: sites.length,
			staticSlugs: staticSlugs.size,
			providerSlugs: providerSlugs.size,
			pages: helpSlugs.size,
			mapKeys: mapKeys.size,
			anchors: anchors.length,
		},
	}
}

async function main() {
	const helpRoot = process.env.ROO_HELP_ROOT ? path.resolve(process.env.ROO_HELP_ROOT) : DEFAULT_HELP_ROOT
	const mapPath = process.env.ROO_DOC_LINK_MAP ? path.resolve(process.env.ROO_DOC_LINK_MAP) : DEFAULT_MAP_PATH
	const srcRoot = process.env.ROO_WEBVIEW_SRC ? path.resolve(process.env.ROO_WEBVIEW_SRC) : DEFAULT_WEBVIEW_SRC

	logStep(TAG, "Verifying in-app help links (docs/help-pages-plan.md §5)")
	logInfo(TAG, `docs/help root: ${helpRoot}`)
	logInfo(TAG, `generated map:  ${mapPath}`)
	logInfo(TAG, `webview src:    ${srcRoot}`)

	let result
	try {
		result = verifyDocLinks({ helpRoot, mapPath, srcRoot })
	} catch (error) {
		logError(TAG, `verification failed: ${error.message}`)
		process.exit(1)
	}

	const { counts } = result
	for (const warning of result.warnings) logWarn(TAG, warning)

	if (!result.ok) {
		for (const err of result.errors) logError(TAG, err)
		logError(
			TAG,
			`${result.errors.length} problem(s) found across ${counts.staticSlugs + counts.providerSlugs} enumerated slugs.`,
		)
		process.exit(1)
	}

	logOk(
		TAG,
		`${counts.callSites} call site(s): ${counts.staticSlugs} static + ${counts.providerSlugs} provider slug(s); ` +
			`${counts.pages} page(s); ${counts.anchors} anchor(s) verified`,
	)
	logEndGroup()
	logSuccess(TAG, "All buildDocLink slugs resolve to docs/help pages and anchors resolve to headings.")
	process.exit(0)
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
	main().catch((error) => {
		logError(TAG, `verification failed: ${error.message}`)
		process.exit(1)
	})
}
