/**
 * verify-doc-links.spec.mjs
 *
 * Tests for scripts/verify-doc-links.mjs (the CI guard for in-app "learn more"
 * help links — docs/help-pages-plan.md §5).
 *
 * Covers:
 *   - the pure helpers (normaliseSlug, slugifyHeading, headingSlugs,
 *     parseMapKeys, collectHelpSlugs),
 *   - call-site enumeration (string, multiline, and dynamic template literals;
 *     test-only `__tests__` / `*.spec.*` files excluded),
 *   - a real pass run against the CURRENT repo state,
 *   - deterministic failure cases against self-contained temp fixtures:
 *     a missing page, an anchor with no matching heading, and a map that is out
 *     of sync with the docs/help tree.
 *   - M1: generate-doc-link-map `--check` byte-compares every rendered provider
 *     page against the committed file, so a stale/hand-edited provider page
 *     fails the gate (existence alone was not enough).
 *
 * Run with: node --test scripts/verify-doc-links.spec.mjs
 * (scripts/ has no vitest runner; Node 22's built-in node:test is used — same
 * pattern as scripts/verify-locale-readmes.spec.mjs.)
 */

import { test } from "node:test"
import assert from "node:assert/strict"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

import {
	collectCallSites,
	collectHelpSlugs,
	headingSlugs,
	normaliseSlug,
	parseMapKeys,
	slugifyHeading,
	verifyDocLinks,
} from "./verify-doc-links.mjs"
import {
	buildEntries,
	checkDocLinkMap,
	RELEASED_SLUGS_FILE,
	readReleasedSlugs,
	renderMapModule,
	writeProviderPages,
	writeReleasedSlugs,
} from "./generate-doc-link-map.mjs"
import { PROVIDER_DOC_SLUGS, PROVIDER_PAGES } from "./lib/help-pages.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")
const REPO_HELP_ROOT = path.join(ROOT, "docs", "help")
const REPO_MAP_PATH = path.join(ROOT, "webview-ui", "src", "utils", "docLinkMap.generated.ts")
const REPO_WEBVIEW_SRC = path.join(ROOT, "webview-ui", "src")

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

test("normaliseSlug strips a trailing slash, lowercases, and splits the anchor", () => {
	assert.deepEqual(normaliseSlug("troubleshooting/shell-integration/"), {
		slug: "troubleshooting/shell-integration",
		anchor: "",
	})
	assert.deepEqual(normaliseSlug("/Features/Skills#Why-Skills"), {
		slug: "features/skills",
		anchor: "Why-Skills",
	})
	assert.deepEqual(normaliseSlug("  features/checkpoints  "), { slug: "features/checkpoints", anchor: "" })
})

test("slugifyHeading matches GitHub's heading-anchor rules", () => {
	assert.equal(slugifyHeading("Use inline terminal (recommended)"), "use-inline-terminal-recommended")
	assert.equal(slugifyHeading("Clear Zsh EOL mark"), "clear-zsh-eol-mark")
	assert.equal(slugifyHeading("Setting Up Global Rules"), "setting-up-global-rules")
	assert.equal(slugifyHeading("Terminal shell integration timeout"), "terminal-shell-integration-timeout")
})

test("headingSlugs collects every ATX heading level", () => {
	const slugs = headingSlugs("# Title\n\n## Sub Heading\n\n### Third-Level (x)\n")
	assert.ok(slugs.has("title"))
	assert.ok(slugs.has("sub-heading"))
	assert.ok(slugs.has("third-level-x"))
})

test("collectHelpSlugs walks nested directories and strips .md", () => {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "doc-links-slugs-"))
	try {
		fs.mkdirSync(path.join(tmp, "features", "mcp"), { recursive: true })
		fs.writeFileSync(path.join(tmp, "features", "mcp", "using-mcp-in-roo.md"), "# x")
		fs.writeFileSync(path.join(tmp, "features", "skills.md"), "# y")
		const slugs = collectHelpSlugs(tmp)
		assert.deepEqual([...slugs].sort(), ["features/mcp/using-mcp-in-roo", "features/skills"])
	} finally {
		fs.rmSync(tmp, { recursive: true, force: true })
	}
})

test("parseMapKeys reads the generated map keys", () => {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "doc-links-map-"))
	try {
		const file = path.join(tmp, "map.ts")
		fs.writeFileSync(file, 'export const DOC_LINK_MAP = {\n\t"a/b": { path: "a/b" },\n}\n')
		assert.deepEqual([...parseMapKeys(file)], ["a/b"])
	} finally {
		fs.rmSync(tmp, { recursive: true, force: true })
	}
})

// ---------------------------------------------------------------------------
// Call-site enumeration
// ---------------------------------------------------------------------------

test("collectCallSites finds string, multiline, and dynamic template literals and skips test files", () => {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "doc-links-src-"))
	try {
		fs.writeFileSync(
			path.join(tmp, "Component.tsx"),
			[
				'const a = buildDocLink("features/skills", "c1")',
				"const b = buildDocLink(",
				'    "troubleshooting/shell-integration/",',
				'    "error_tooltip",',
				")",
				'const c = buildDocLink(`providers/${slug}`, "provider_docs")',
			].join("\n"),
		)
		fs.mkdirSync(path.join(tmp, "__tests__"), { recursive: true })
		fs.writeFileSync(
			path.join(tmp, "__tests__", "Mock.spec.tsx"),
			'vi.mock("@/utils/docLinks", () => ({ buildDocLink: (p: string) => p }))',
		)

		const sites = collectCallSites(tmp)
		// The __tests__ mock is excluded; three real call sites remain.
		assert.equal(sites.length, 3)

		const staticSlugs = sites.filter((s) => s.dynamicPrefix === null).map((s) => s.slug)
		assert.ok(staticSlugs.includes("features/skills"))
		assert.ok(staticSlugs.includes("troubleshooting/shell-integration"))

		const dynamic = sites.find((s) => s.dynamicPrefix !== null)
		assert.ok(dynamic)
		assert.equal(dynamic.dynamicPrefix, "providers/")
	} finally {
		fs.rmSync(tmp, { recursive: true, force: true })
	}
})

// ---------------------------------------------------------------------------
// Fixture harness
// ---------------------------------------------------------------------------

/**
 * Builds a temp fixture with a webview source tree, a docs/help tree (the given
 * pages + all 32 provider pages), and a generated map covering them. `mutators`
 * can reshape the map/pages for the failure cases.
 */
async function withFixture({ pages = {}, mapKeys, mutators = {} }, fn) {
	const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "verify-doc-links-"))
	const helpRoot = path.join(root, "docs", "help")
	const srcRoot = path.join(root, "webview-ui", "src")
	const mapPath = path.join(root, "docLinkMap.generated.ts")
	try {
		const allPages = {
			alpha: "# Alpha\n\n## Heading Two\n\nBody.\n",
			beta: "# Beta\n\n## Heading Two\n",
			...pages,
		}
		for (const provider of PROVIDER_DOC_SLUGS) {
			allPages[`providers/${provider}`] = `# Provider setup: ${provider}\n`
		}
		for (const [slug, content] of Object.entries(allPages)) {
			const file = path.join(helpRoot, `${slug}.md`)
			await fs.promises.mkdir(path.dirname(file), { recursive: true })
			await fs.promises.writeFile(file, content, "utf-8")
		}

		await fs.promises.mkdir(srcRoot, { recursive: true })
		await fs.promises.writeFile(
			path.join(srcRoot, "Component.tsx"),
			[
				'buildDocLink("alpha", "c1")',
				'buildDocLink("beta#heading-two", "c2")',
				'buildDocLink(`providers/${slug}`, "provider_docs")',
			].join("\n"),
			"utf-8",
		)

		const keys = mapKeys ?? Object.keys(allPages)
		await fs.promises.writeFile(
			mapPath,
			`export const DOC_LINK_MAP = {\n${keys.map((k) => `\t"${k}": { path: "${k}" },`).join("\n")}\n}\n`,
			"utf-8",
		)

		if (mutators.afterWrite) await mutators.afterWrite({ root, helpRoot, srcRoot, mapPath })
		await fn({ root, helpRoot, srcRoot, mapPath })
	} finally {
		await fs.promises.rm(root, { recursive: true, force: true })
	}
}

// ---------------------------------------------------------------------------
// verifyDocLinks verdicts
// ---------------------------------------------------------------------------

test("verifyDocLinks passes a complete fixture and warns about unreferenced pages", async () => {
	await withFixture({ pages: { gamma: "# Gamma\n" } }, async ({ helpRoot, srcRoot, mapPath }) => {
		const result = verifyDocLinks({ helpRoot, mapPath, srcRoot })
		assert.equal(result.ok, true, result.errors.join("\n"))
		assert.equal(result.counts.staticSlugs, 2) // alpha, beta
		assert.equal(result.counts.providerSlugs, PROVIDER_DOC_SLUGS.length)
		assert.equal(result.errors.length, 0)
		assert.ok(result.warnings.some((w) => w.includes("gamma")))
	})
})

test("verifyDocLinks fails when an enumerated slug has no page", async () => {
	await withFixture(
		{
			mutators: {
				afterWrite: async ({ helpRoot, mapPath }) => {
					await fs.promises.rm(path.join(helpRoot, "alpha.md"))
					const keys = [...PROVIDER_DOC_SLUGS.map((p) => `providers/${p}`), "beta"]
					await fs.promises.writeFile(
						mapPath,
						`export const DOC_LINK_MAP = {\n${keys.map((k) => `\t"${k}": { path: "${k}" },`).join("\n")}\n}\n`,
					)
				},
			},
		},
		async ({ helpRoot, srcRoot, mapPath }) => {
			const result = verifyDocLinks({ helpRoot, mapPath, srcRoot })
			assert.equal(result.ok, false)
			assert.ok(result.errors.some((e) => e.includes('missing help page for slug "alpha"')))
		},
	)
})

test("verifyDocLinks fails when an anchor has no matching heading", async () => {
	await withFixture(
		{
			mutators: {
				afterWrite: async ({ helpRoot }) =>
					fs.promises.writeFile(path.join(helpRoot, "beta.md"), "# Beta\n\n## Different Heading\n"),
			},
		},
		async ({ helpRoot, srcRoot, mapPath }) => {
			const result = verifyDocLinks({ helpRoot, mapPath, srcRoot })
			assert.equal(result.ok, false)
			assert.ok(result.errors.some((e) => e.includes('anchor "#heading-two" has no matching heading')))
		},
	)
})

test("verifyDocLinks fails when the generated map is out of sync", async () => {
	await withFixture(
		{ mapKeys: ["beta", ...PROVIDER_DOC_SLUGS.map((p) => `providers/${p}`)] },
		async ({ helpRoot, srcRoot, mapPath }) => {
			const result = verifyDocLinks({ helpRoot, mapPath, srcRoot })
			assert.equal(result.ok, false)
			assert.ok(result.errors.some((e) => e.includes('generated map is missing "alpha"')))
		},
	)
})

test("verifyDocLinks fails when the map has a stale key", async () => {
	await withFixture(
		{ mapKeys: ["alpha", "beta", "stale/page", ...PROVIDER_DOC_SLUGS.map((p) => `providers/${p}`)] },
		async ({ helpRoot, srcRoot, mapPath }) => {
			const result = verifyDocLinks({ helpRoot, mapPath, srcRoot })
			assert.equal(result.ok, false)
			assert.ok(result.errors.some((e) => e.includes('generated map has stale key "stale/page"')))
		},
	)
})

// ---------------------------------------------------------------------------
// Real repo state
// ---------------------------------------------------------------------------

test("the CURRENT repo passes verifyDocLinks", () => {
	const result = verifyDocLinks({
		helpRoot: REPO_HELP_ROOT,
		mapPath: REPO_MAP_PATH,
		srcRoot: REPO_WEBVIEW_SRC,
	})
	assert.equal(result.ok, true, result.errors.join("\n"))
	assert.equal(result.counts.staticSlugs, 10)
	assert.equal(result.counts.providerSlugs, PROVIDER_DOC_SLUGS.length)
	assert.equal(result.counts.pages, result.counts.mapKeys)
})

// ---------------------------------------------------------------------------
// M1: generate-doc-link-map --check byte-compares provider pages
// ---------------------------------------------------------------------------

/** Builds a temp docs/help tree + generated map that a fresh run would accept. */
function withGeneratedMap(fn) {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "doc-link-map-check-"))
	try {
		const helpRoot = path.join(tmp, "docs", "help")
		const mapPath = path.join(tmp, "docLinkMap.generated.ts")
		writeProviderPages(helpRoot, true)
		fs.writeFileSync(mapPath, renderMapModule(buildEntries(helpRoot)), "utf-8")
		return fn({ root: tmp, helpRoot, mapPath })
	} finally {
		fs.rmSync(tmp, { recursive: true, force: true })
	}
}

test("checkDocLinkMap passes the CURRENT repo (map in sync, provider pages byte-identical)", () => {
	const result = checkDocLinkMap({ helpRoot: REPO_HELP_ROOT, mapPath: REPO_MAP_PATH })
	assert.equal(result.ok, true, result.problems.join("\n"))
	assert.equal(result.entries, 42)
})

test("checkDocLinkMap fails when a committed provider page drifts from the rendered template", () => {
	withGeneratedMap(({ helpRoot, mapPath }) => {
		// A freshly generated tree is accepted.
		assert.equal(checkDocLinkMap({ helpRoot, mapPath }).ok, true)

		// Hand-edit a provider page — the exact failure mode M1 must catch.
		const target = path.join(helpRoot, "providers", `${PROVIDER_PAGES[0].slug}.md`)
		fs.appendFileSync(target, "\nHand-edited stale content.\n")

		const result = checkDocLinkMap({ helpRoot, mapPath })
		assert.equal(result.ok, false)
		assert.ok(
			result.problems.some((p) => p.includes("stale provider page") && p.includes(PROVIDER_PAGES[0].slug)),
			result.problems.join("\n"),
		)
	})
})

test("checkDocLinkMap fails when a provider page is missing", () => {
	withGeneratedMap(({ helpRoot, mapPath }) => {
		fs.rmSync(path.join(helpRoot, "providers", `${PROVIDER_PAGES[0].slug}.md`))
		const result = checkDocLinkMap({ helpRoot, mapPath })
		assert.equal(result.ok, false)
		assert.ok(result.problems.some((p) => p.includes("missing provider page")))
	})
})

// ---------------------------------------------------------------------------
// F4: released-slug stability (plan §4.6)
// ---------------------------------------------------------------------------

test("checkDocLinkMap fails when a recorded released slug no longer has a page", () => {
	withGeneratedMap(({ helpRoot, mapPath }) => {
		// A tree with no history file is accepted (enforcement skipped).
		assert.equal(readReleasedSlugs(helpRoot), null)
		assert.equal(checkDocLinkMap({ helpRoot, mapPath }).ok, true)

		// Record a slug that is not present — the rename/delete failure F4 forbids.
		fs.writeFileSync(
			path.join(helpRoot, RELEASED_SLUGS_FILE),
			JSON.stringify({ releasedSlugs: ["features/skills"] }),
			"utf-8",
		)
		const result = checkDocLinkMap({ helpRoot, mapPath })
		assert.equal(result.ok, false)
		assert.ok(
			result.problems.some((p) => p.includes('released slug "features/skills"') && p.includes("§4.6")),
			result.problems.join("\n"),
		)
	})
})

test("writeReleasedSlugs records, sorts, and is idempotent", () => {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "released-slugs-"))
	try {
		assert.deepEqual(writeReleasedSlugs(tmp, ["b/page", "a/page"]), ["a/page", "b/page"])
		// Second run adds only the genuinely new slug — no churn.
		assert.deepEqual(writeReleasedSlugs(tmp, ["b/page", "c/page"]), ["c/page"])
		assert.deepEqual([...readReleasedSlugs(tmp)], ["a/page", "b/page", "c/page"])
	} finally {
		fs.rmSync(tmp, { recursive: true, force: true })
	}
})

test("the CURRENT repo keeps every released slug (plan §4.6)", () => {
	const released = readReleasedSlugs(REPO_HELP_ROOT)
	assert.ok(released && released.size > 0, "docs/help/released-slugs.json must exist")
	const present = new Set(buildEntries(REPO_HELP_ROOT).map((entry) => entry.slug))
	for (const slug of released) {
		assert.ok(present.has(slug), `released slug "${slug}" has no docs/help page`)
	}
})
