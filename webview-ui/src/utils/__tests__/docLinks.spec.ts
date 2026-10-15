import { buildDocLink } from "../docLinks"
import { EXTERNAL_LINKS } from "../../constants/externalLinks"

const BASE = EXTERNAL_LINKS.GITHUB_REPO
const UTM = (campaign: string) => `utm_source=extension&utm_medium=ide&utm_campaign=${campaign}`

describe("buildDocLink", () => {
	it("resolves a mapped slug to a blob URL under docs/help on master", () => {
		expect(buildDocLink("features/skills", "skills_settings")).toBe(
			`${BASE}/blob/master/docs/help/features/skills.md?${UTM("skills_settings")}`,
		)
	})

	it("appends the fragment after the query string", () => {
		expect(buildDocLink("features/shell-integration#enable-zdotdir-handling", "settings_terminal_zdotdir")).toBe(
			`${BASE}/blob/master/docs/help/features/shell-integration.md?${UTM(
				"settings_terminal_zdotdir",
			)}#enable-zdotdir-handling`,
		)
	})

	it("normalises a trailing slash before resolving (error-tooltip call site)", () => {
		expect(buildDocLink("troubleshooting/shell-integration/", "error_tooltip")).toBe(
			`${BASE}/blob/master/docs/help/troubleshooting/shell-integration.md?${UTM("error_tooltip")}`,
		)
	})

	it("lowercases and trims the slug", () => {
		expect(buildDocLink("  Features/SKILLS  ", "c")).toBe(
			`${BASE}/blob/master/docs/help/features/skills.md?${UTM("c")}`,
		)
	})

	it("resolves every authored provider slug", () => {
		expect(buildDocLink("providers/openai-codex", "provider_docs")).toBe(
			`${BASE}/blob/master/docs/help/providers/openai-codex.md?${UTM("provider_docs")}`,
		)
	})

	it("falls back to a GitHub Discussions search for an unmapped slug", () => {
		expect(buildDocLink("features/does-not-exist", "c")).toBe(
			`${BASE}/discussions?discussions_q=features%20does%20not%20exist&${UTM("c")}`,
		)
	})

	it("derives the Discussions query by stripping the providers prefix and dashes", () => {
		expect(buildDocLink("providers/some-brand-new-provider", "c")).toBe(
			`${BASE}/discussions?discussions_q=some%20brand%20new%20provider&${UTM("c")}`,
		)
	})

	it("URL-encodes the campaign in both the blob and fallback links", () => {
		expect(buildDocLink("features/skills", "a b/c")).toContain("utm_campaign=a%20b%2Fc")
		expect(buildDocLink("unmapped/slug", "a b/c")).toContain("utm_campaign=a%20b%2Fc")
	})
})

describe("normalisation (via buildDocLink)", () => {
	it("strips leading and trailing slashes and splits the anchor", () => {
		expect(buildDocLink("/Features/Skills/#why-skills", "c")).toBe(
			`${BASE}/blob/master/docs/help/features/skills.md?${UTM("c")}#why-skills`,
		)
	})
})

describe("discussions query derivation (via buildDocLink)", () => {
	it("collapses dash and slash runs into single spaces", () => {
		expect(buildDocLink("providers/brand-new-gateway", "c")).toBe(
			`${BASE}/discussions?discussions_q=brand%20new%20gateway&${UTM("c")}`,
		)
	})
})

describe("empty-slug and anchor-only fallbacks (via buildDocLink)", () => {
	// A path with no slug (empty, slash-only, or anchor-only) has nothing to
	// resolve, so it must take the deterministic Discussions fallback with an
	// empty query rather than build a blob URL for a page that cannot exist.
	it("falls back to Discussions for an empty path", () => {
		expect(buildDocLink("", "c")).toBe(`${BASE}/discussions?discussions_q=&${UTM("c")}`)
	})

	it("falls back to Discussions for a slash-only path (empty slug)", () => {
		expect(buildDocLink("/", "c")).toBe(`${BASE}/discussions?discussions_q=&${UTM("c")}`)
	})

	it("falls back to Discussions for an anchor-only path (no slug before the #)", () => {
		expect(buildDocLink("#section", "c")).toBe(`${BASE}/discussions?discussions_q=&${UTM("c")}`)
	})
})
