#!/usr/bin/env node

/**
 * verify-doc-links.mjs
 *
 * CI guard for the in-app "learn more" help links (docs/help-pages-plan.md §5).
 *
 * Every `buildDocLink(path, campaign)` call site in the scanned source must
 * resolve to a real Markdown page under `docs/help/`, and the shipped resolution
 * map (`webview-ui/src/utils/docLinkMap.generated.ts`) must stay in sync with
 * that tree. This gate fails the build when:
 *
 *   1. an enumerated slug has no `docs/help/<slug>.md` (and is not on the
 *      explicit FALLBACK_ALLOWLIST), or
 *   2. the generated map's keys do not equal the set of existing help pages, or
 *   3. a call-site anchor has no matching (GitHub-slugified) heading in its page, or
 *   4. a `buildDocLink()` first argument is not a string/template literal — a
 *      dynamic expression is FAIL-CLOSED (fails unless the exact expression is
 *      listed in ALLOWED_NON_LITERAL_ARGS), never silently skipped, or
 *   5. an in-page (`#anchor`) or cross-page (`other.md#anchor`) link inside a
 *      help page points at a missing page or a missing heading.
 *
 * Check 6 (a page that no call site references) is reported as a WARNING only:
 * proactively-authored pages should not fail CI.
 *
 * Scope of the call-site inventory: `webview-ui/src/**` plus `apps/**` and
 * `packages/**` for `*.ts`/`*.tsx`, excluding `__tests__`, `*.spec.*`, and build
 * output (`build`/`out`/`dist`). The test-only `vi.mock("@/utils/docLinks")`
 * definitions are excluded (they are not real slugs); function *declarations*
 * (`function buildDocLink(...)`) are not call sites and are ignored.
 *
 * Usage (repo root):
 *   node scripts/verify-doc-links.mjs
 *   ROO_HELP_ROOT=/tmp/fixture node scripts/verify-doc-links.mjs
 *
 * Env overrides (used by the spec):
 *   ROO_HELP_ROOT        docs/help root           (default: <repo>/docs/help)
 *   ROO_DOC_LINK_MAP     generated map path       (default: <repo>/webview-ui/src/utils/docLinkMap.generated.ts)
 *   ROO_WEBVIEW_SRC      webview src root         (default: <repo>/webview-ui/src)
 *   ROO_SCAN_ROOTS       extra scan roots         (default: <repo>/apps + <repo>/packages)
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

/**
 * Additional roots scanned for `buildDocLink` call sites beyond the webview
 * source: a call site can live in an app or a shared package, and a slug that
 * is only reachable from there must still resolve (F5 hardening).
 */
const DEFAULT_EXTRA_SCAN_ROOTS = [path.join(ROOT, "apps"), path.join(ROOT, "packages")]

/** Directory names never descended into while enumerating call sites. */
export const EXCLUDED_DIRS = new Set([
	"node_modules",
	"__tests__",
	"build",
	"out",
	"dist",
	"lib",
	"coverage",
	".turbo",
	".vitest",
])

/**
 * Exact non-literal first-argument expressions that are knowingly accepted.
 * Empty by default: an unlisted dynamic argument is a hard failure (F5), so a
 * new `buildDocLink(someVar, ...)` cannot slip through unverified. Add the
 * verbatim expression (e.g. `"providerSlug"`) with a justification comment when
 * the value cannot be statically enumerated.
 */
export const ALLOWED_NON_LITERAL_ARGS = []

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
 * The punctuation GitHub's slugger (`github-slugger`) strips: ASCII punctuation
 * plus the Unicode general-punctuation ranges it also removes. Unicode letters
 * and numbers are deliberately kept (e.g. `café` -> `café`), matching GitHub.
 */
const SLUG_PUNCTUATION_RE = /[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,./:;<=>?@[\]^`{|}~]/g

/**
 * GitHub's heading-to-anchor slugification, in parity with `github-slugger`:
 * lowercase, strip HTML tags, drop punctuation, keep Unicode letters/numbers,
 * then replace whitespace runs with single hyphens.
 * @param {string} heading
 * @returns {string}
 */
export function slugifyHeading(heading) {
	return heading
		.trim()
		.toLowerCase()
		.replace(/<[!/a-z].*?>/gi, "")
		.replace(SLUG_PUNCTUATION_RE, "")
		.replace(/\s/g, "-")
}

/**
 * Extracts the slugified anchor of every ATX heading in a Markdown page.
 * Fenced code blocks (``` / ~~~) are ignored, and duplicate headings get
 * GitHub's sequential `-1`, `-2`, … suffixes (a real page can therefore
 * legitimately contain `## Foo`, `## Foo`, `## Foo` -> foo, foo-1, foo-2).
 * @param {string} content
 * @returns {Set<string>}
 */
export function headingSlugs(content) {
	const out = new Set()
	const occurrences = new Map()
	let fenceChar = null
	for (const line of content.split(/\r?\n/)) {
		const fence = /^\s{0,3}(`{3,}|~{3,})/.exec(line)
		if (fence) {
			const char = fence[1][0]
			if (fenceChar === null) fenceChar = char
			else if (fenceChar === char) fenceChar = null
			continue
		}
		if (fenceChar !== null) continue
		const m = /^ {0,3}#{1,6}\s+(.+?)\s*#*\s*$/.exec(line)
		if (!m) continue
		const base = slugifyHeading(m[1])
		if (!base) continue
		const count = occurrences.get(base) ?? 0
		occurrences.set(base, count + 1)
		out.add(count === 0 ? base : `${base}-${count}`)
	}
	return out
}

/**
 * Removes fenced code blocks from a Markdown document (their content is not
 * Markdown and must not be scanned for links or headings). Line count is
 * preserved so callers can still report sensible positions.
 * @param {string} content
 * @returns {string}
 */
export function stripFencedBlocks(content) {
	let fenceChar = null
	return content
		.split(/\r?\n/)
		.map((line) => {
			const fence = /^\s{0,3}(`{3,}|~{3,})/.exec(line)
			if (fence) {
				const char = fence[1][0]
				if (fenceChar === null) fenceChar = char
				else if (fenceChar === char) fenceChar = null
				return ""
			}
			return fenceChar === null ? line : ""
		})
		.join("\n")
}

/**
 * Extracts the target of every Markdown inline link `[text](target)`, excluding
 * fenced code blocks. Links carrying a title (`[x](url "title")`) are handled.
 * @param {string} content
 * @returns {string[]} raw link targets (e.g. `#anchor`, `../other.md#x`).
 */
export function extractLinkTargets(content) {
	const out = []
	const re = /\[[^\]]*\]\(\s*([^)\s]+)(?:\s+"[^"]*")?\s*\)/g
	let match
	while ((match = re.exec(stripFencedBlocks(content))) !== null) out.push(match[1])
	return out
}

/**
 * Verifies every in-page (`#anchor`) and cross-page (`other.md#anchor`) link
 * found in `docs/help/**` resolves to a real page and heading (F5: previously
 * unguarded). External links, images, and non-Markdown relative links are
 * ignored. Pure — exported for the spec.
 * @param {string} helpRoot
 * @returns {{ checked: number; errors: string[] }}
 */
export function verifyCrossLinks(helpRoot) {
	const errors = []
	const headingCache = new Map()
	const headingsFor = (slug) => {
		if (!headingCache.has(slug)) {
			const page = path.join(helpRoot, `${slug}.md`)
			headingCache.set(slug, fs.existsSync(page) ? headingSlugs(fs.readFileSync(page, "utf-8")) : null)
		}
		return headingCache.get(slug)
	}

	let checked = 0
	if (!fs.existsSync(helpRoot)) return { checked, errors }

	const walk = (dir, base) => {
		for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
			const abs = path.join(dir, entry.name)
			if (entry.isDirectory()) {
				walk(abs, base)
				continue
			}
			if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".md")) continue
			const rel = path.relative(base, abs).split(path.sep).join("/")
			const slug = rel.replace(/\.md$/i, "").trim().toLowerCase()
			const content = fs.readFileSync(abs, "utf-8")

			for (const target of extractLinkTargets(content)) {
				if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(target)) continue // external / protocol-relative
				const hashIndex = target.indexOf("#")
				if (hashIndex < 0) continue // plain page link — no anchor to guard
				const pathPart = target.slice(0, hashIndex)
				const anchor = target.slice(hashIndex + 1)
				if (!anchor) continue

				let targetSlug = slug
				if (pathPart) {
					if (!/\.md$/i.test(pathPart)) continue // assets / images / code files
					const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(slug), pathPart))
					targetSlug = resolved.replace(/\.md$/i, "").trim().toLowerCase()
				}
				checked++
				const slugs = headingsFor(targetSlug)
				if (slugs === null) {
					errors.push(
						`docs/help/${rel}: cross-link "${target}" points at docs/help/${targetSlug}.md, which does not exist`,
					)
				} else if (!slugs.has(anchor)) {
					errors.push(
						`docs/help/${rel}: cross-link anchor "#${anchor}" has no matching heading in docs/help/${targetSlug}.md\n` +
							`  link: ${target}`,
					)
				}
			}
		}
	}
	walk(helpRoot, helpRoot)
	return { checked, errors }
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
 * flagged). A **non-literal** first argument (e.g. `buildDocLink(someVar, …)`)
 * is recorded with `nonLiteral` set so the caller can fail closed rather than
 * silently skip it (F5). Function *declarations* (`function buildDocLink(...)`)
 * are ignored. `roots` may be a single directory or a list of them. Pure —
 * exported for the spec.
 * @param {string | string[]} roots
 * @returns {{ file: string; line: number; raw: string; slug: string; anchor: string; dynamicPrefix: string | null; nonLiteral: string | null }[]}
 */
export function collectCallSites(roots) {
	const sites = []
	const rootList = Array.isArray(roots) ? roots : [roots]
	for (const root of rootList) {
		if (!root) continue
		for (const file of collectSourceFiles(root)) {
			const content = fs.readFileSync(file, "utf-8")
			const callRe = /buildDocLink\s*\(/g
			for (const match of content.matchAll(callRe)) {
				// Skip the function declaration itself (`function buildDocLink(...)`).
				const before = content.slice(Math.max(0, match.index - 40), match.index)
				if (/function\s*$/.test(before)) continue

				const afterIndex = match.index + match[0].length
				const rest = content.slice(afterIndex)
				const line = lineAt(content, match.index)
				const rel = path.relative(ROOT, file).split(path.sep).join("/")
				const literal = rest.match(/^\s*(["'`])([\s\S]*?)\1/)
				if (!literal) {
					const expr = rest.match(/^\s*([^,)\n]+)/)
					const nonLiteral = expr ? expr[1].trim() : ""
					sites.push({
						file: rel,
						line,
						raw: nonLiteral,
						slug: "",
						anchor: "",
						dynamicPrefix: null,
						nonLiteral: nonLiteral || "<unknown>",
					})
					continue
				}
				const raw = literal[2]
				const dynamicIndex = raw.indexOf("${")
				if (dynamicIndex >= 0) {
					sites.push({
						file: rel,
						line,
						raw,
						slug: "",
						anchor: "",
						dynamicPrefix: raw.slice(0, dynamicIndex),
						nonLiteral: null,
					})
				} else {
					const { slug, anchor } = normaliseSlug(raw)
					sites.push({ file: rel, line, raw, slug, anchor, dynamicPrefix: null, nonLiteral: null })
				}
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
 * @param {{ helpRoot: string; mapPath: string; srcRoot: string; extraRoots?: string[] }} opts
 * @returns {{ ok: boolean; errors: string[]; warnings: string[]; counts: object }}
 */
export function verifyDocLinks({ helpRoot, mapPath, srcRoot, extraRoots = [] }) {
	const errors = []
	const warnings = []

	const sites = collectCallSites([srcRoot, ...extraRoots])
	const staticSlugs = new Set()
	const providerSlugs = new Set()
	const anchors = []
	const referenced = new Set()

	for (const site of sites) {
		if (site.nonLiteral !== null && site.nonLiteral !== undefined) {
			// F5: fail closed on a dynamic first argument instead of silently
			// skipping the call site (the previous fail-open behaviour).
			if (ALLOWED_NON_LITERAL_ARGS.includes(site.nonLiteral)) continue
			errors.push(
				`${site.file}:${site.line}: non-literal buildDocLink() first argument "${site.nonLiteral}" cannot be verified\n` +
					`  fix: pass a string/template literal, or add the exact expression to\n` +
					`       ALLOWED_NON_LITERAL_ARGS in scripts/verify-doc-links.mjs with a justification comment.`,
			)
			continue
		}
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

	// Check 5 — in-page / cross-page link anchors inside the help pages (F5).
	const crossLinks = verifyCrossLinks(helpRoot)
	errors.push(...crossLinks.errors)

	// Check 6 — pages no call site references (warning only, prevents rot).
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
			crossLinks: crossLinks.checked,
		},
	}
}

async function main() {
	const helpRoot = process.env.ROO_HELP_ROOT ? path.resolve(process.env.ROO_HELP_ROOT) : DEFAULT_HELP_ROOT
	const mapPath = process.env.ROO_DOC_LINK_MAP ? path.resolve(process.env.ROO_DOC_LINK_MAP) : DEFAULT_MAP_PATH
	const srcRoot = process.env.ROO_WEBVIEW_SRC ? path.resolve(process.env.ROO_WEBVIEW_SRC) : DEFAULT_WEBVIEW_SRC
	const extraRoots = process.env.ROO_SCAN_ROOTS
		? process.env.ROO_SCAN_ROOTS.split(path.delimiter).map((root) => path.resolve(root))
		: DEFAULT_EXTRA_SCAN_ROOTS

	logStep(TAG, "Verifying in-app help links (docs/help-pages-plan.md §5)")
	logInfo(TAG, `docs/help root: ${helpRoot}`)
	logInfo(TAG, `generated map:  ${mapPath}`)
	logInfo(TAG, `webview src:    ${srcRoot}`)
	logInfo(TAG, `extra roots:    ${extraRoots.join(", ") || "(none)"}`)

	let result
	try {
		result = verifyDocLinks({ helpRoot, mapPath, srcRoot, extraRoots })
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
			`${counts.pages} page(s); ${counts.anchors} anchor(s) + ${counts.crossLinks} cross-link(s) verified`,
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
