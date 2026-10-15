import { EXTERNAL_LINKS } from "../constants/externalLinks"
import { DOC_LINK_MAP } from "./docLinkMap.generated"

/**
 * Builds the UTM query string appended to every documentation link.
 * Convention (unchanged): `utm_source=extension&utm_medium=ide&utm_campaign=<campaign>`.
 */
function utm(campaign: string): string {
	return `utm_source=extension&utm_medium=ide&utm_campaign=${encodeURIComponent(campaign)}`
}

/**
 * Normalises a `buildDocLink` path argument into its slug + optional anchor.
 *
 * Rules (docs/help-pages-plan.md §4.3):
 *   1. strip leading slashes
 *   2. split off the fragment (everything after the first `#`)
 *   3. strip a trailing slash from the slug (handles `troubleshooting/shell-integration/`)
 *   4. trim + lowercase the slug
 */
function normaliseDocSlug(path: string): { slug: string; anchor: string } {
	const withoutLeading = path.replace(/^\/+/, "")
	const hashIndex = withoutLeading.indexOf("#")
	const rawSlug = hashIndex >= 0 ? withoutLeading.slice(0, hashIndex) : withoutLeading
	const anchor = hashIndex >= 0 ? withoutLeading.slice(hashIndex + 1) : ""
	const slug = rawSlug.replace(/\/+$/, "").trim().toLowerCase()
	return { slug, anchor }
}

/**
 * Derives the deterministic GitHub Discussions search query for a slug that has
 * no local help page: strip a leading `providers/`, then collapse runs of `-`
 * or `/` into single spaces. Example: `providers/poe` -> `poe`.
 */
function discussionsQueryForSlug(slug: string): string {
	return slug
		.replace(/^providers\//, "")
		.replace(/[-/]+/g, " ")
		.trim()
}

/**
 * Utility for building Roo+ documentation links.
 *
 * Roo+ is a GitHub-only fork and hosts its in-app help pages as Markdown under
 * `docs/help/` in this repository. A link therefore resolves to a GitHub blob
 * URL when the slug is present in the generated map
 * (`webview-ui/src/utils/docLinkMap.generated.ts`), and otherwise falls back to
 * a deterministic GitHub Discussions search. Resolution is a pure function of
 * the shipped static map — there is no network or filesystem access at runtime.
 */
export function buildDocLink(path: string, campaign: string): string {
	const { slug, anchor } = normaliseDocSlug(path)
	const entry = DOC_LINK_MAP[slug]

	if (entry) {
		let url = `${EXTERNAL_LINKS.GITHUB_REPO}/blob/master/docs/help/${entry.path}.md?${utm(campaign)}`
		if (anchor) {
			url += `#${anchor}`
		}
		return url
	}

	const query = discussionsQueryForSlug(slug)
	return `${EXTERNAL_LINKS.GITHUB_REPO}/discussions?discussions_q=${encodeURIComponent(query)}&${utm(campaign)}`
}
