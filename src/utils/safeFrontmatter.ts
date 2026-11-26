import matter from "gray-matter"

/**
 * Parse Markdown metadata without allowing document-selected executable engines.
 *
 * This module is the fork's ONLY sanctioned holder of gray-matter's callable export
 * (SYNC-23, upstream `5e32badca`): the pre-check below is the security control, and
 * `src/utils/__tests__/safeFrontmatterImportGuard.spec.ts` enforces that no other
 * module under `src/` imports it. The `{ language: "yaml" }` argument is parse-cache
 * plumbing only — gray-matter 4.0.3 overwrites `file.language` from the document's
 * own header, so it can never pin the engine of an untrusted file.
 */
export function parseFrontmatter(content: string) {
	// gray-matter strips a leading BOM before detecting the opening delimiter.
	const normalized = content.replace(/^\uFEFF/, "")
	if (normalized.startsWith("---") && normalized[3] !== "-") {
		const { name } = matter.language(normalized)
		if (name && !["yaml", "yml", "json"].includes(name.toLowerCase())) {
			throw new Error(`Unsupported frontmatter language: ${name}`)
		}
	}

	// Passing options also bypasses gray-matter's shared, input-only parse cache.
	return matter(content, { language: "yaml" })
}
