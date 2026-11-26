/**
 * r0-extract.mjs — the declaration extractor R0 scores with.
 *
 * It does not reinvent the classifier. Section 32 of the log records that a
 * from-scratch rule was written for R0 and scored 14/20 against the hand pass,
 * while the rule already in the repo scores 19/20. So this module borrows
 * `classify` from the R2 screen and adds **two declared rule families** for the
 * replies that rule leaves unresolved.
 *
 * THE FIRST FAMILY (v3.1) — an ask written mid-sentence
 *   A reply whose opening is a request for information ("Required information:",
 *   "Please provide", "I need…") is an ASK, even when it names one candidate.
 *   R2's r10-B3 is the case: it opens with a required-information list and names
 *   `codebase-cartographer` as a possibility, and v3 leaves it UNRESOLVED. M-12
 *   says a reply that asks is an ASK however many slugs it contains.
 *
 * THE SECOND FAMILY (v4) — the choice written as a label, not a sentence
 *   The product rendering elicits replies that commit in a heading and then ask
 *   for the artefact: `**"Explain" mode (explain)**` on its own line, then "to
 *   proceed I need the source code". v3's markers are sentence-shaped (`Mode:`,
 *   `Selected mode:`), so the label form fell through to UNRESOLVED. Log §43
 *   (F-15) records eight such replies in one batch of 300.
 *
 *   EVERY V4 RULE IS ANCHORED ON THE CATALOGUE'S OWN VOCABULARY. That is not a
 *   refinement — it is what makes the rules safe. The naive version of the
 *   "I will use X" rule read *"using concrete evidence from its implementation"*
 *   and treated `concrete` as a mode name, manufacturing a declaration out of
 *   prose. With the token required to be a slug or a display name from the
 *   picker, `concrete` cannot match and `explain` does.
 *
 *   Without a `modes` argument every v4 rule is inert, so a caller that has no
 *   vocabulary behaves exactly as v3.1 did.
 *
 * ORDER OF AUTHORITY
 *   v3 first, unchanged. Where v3 cannot decide, the earliest signal in the
 *   reply wins — a heading that precedes an ask is a commitment followed by a
 *   material ask; an ask that precedes a heading is a question. That position
 *   rule is what keeps r10-B3 an ASK while making `**"Explain" mode (explain)**`
 *   followed by "I need the file" a DECLARATION.
 *
 * VALIDATION
 *   `scripts/r0-extract.spec.mjs` requires this to reproduce all 20 hand verdicts
 *   in R2's batch, plus every v4 case named here and the false positive above.
 *   If that spec fails, R0 does not run.
 */

import { classify } from "../hidden-intent-screen.mjs"

/** Bumped whenever a rule changes; stamped beside any re-derived count. */
export const EXTRACTOR_VERSION = "r0-extract/4"

// The lead-in may open a line rather than the reply: R2's r10-B3 opens with a
// sentence, then puts "**Required Information:**" on its own line. Anchoring at
// the start of the reply alone missed it, which is the whole reason this rule exists.
export const ASK_LEADIN =
	/(^|\n)\s*(?:\*\*)?(required information|information needed|clarification(?: needed)?|what i need|please provide)\b/i

// R0's first position batch produced 16 to 25 reply-level "unresolved" per arm, and
// every one sampled was an ask written mid-sentence: "To determine the correct mode,
// I need the following information: …". This catches that family without touching a
// reply that names one mode and does not ask.
export const ASK_PHRASE =
	/\b(i need (?:the following|more information|additional)|which mode|to determine (?:the|which) (?:correct |appropriate )?mode|to select the (?:correct |appropriate )?mode)\b/i

/**
 * A line that is only a quoted token: `**"Explain" mode (explain)**`,
 * `"explain"`, or `- "Explain" mode`. Captures the quoted token and the
 * parenthetical separately, because either may carry the vocabulary entry.
 */
export const BARE_HEADER =
	/^[ \t]*[*_`]{0,2}[ \t]*["“”']([^"“”'\n]{1,60})["“”'][ \t]*(?:mode\b)?[ \t]*(?:\(([^)\n]{1,60})\))?[ \t]*[*_`]{0,2}[ \t]*$/gim

/** A line that is only an emphasised token: `**explain**`, `__Explain__`. */
export const BARE_TOKEN = /^[ \t]*[*_`]{1,3}[ \t]*([A-Za-z][A-Za-z0-9 _-]{1,40}?)[ \t]*[*_`]{1,3}[ \t]*$/gim

/**
 * A label that introduces the choice: `Selected Mode:`, `Chosen mode —`, `Mode:`.
 * At least one punctuation character is REQUIRED. Without that requirement the
 * bare word "mode" in "to determine the exact mode and complete this analysis"
 * matched, the 120-character window found the word "code", and a genuine
 * clarification ask was scored as a declaration to `code` (r0-naming 032 and 064).
 */
export const LABELLED_MODE = /\b(?:(?:selected|chosen)\s+mode|mode)\b\s*[:*_-]+/gi

/** A sentence that announces the choice. Bare "using" is deliberately absent. */
export const WILL_USE =
	/\b(?:i will use|i'll use|i am using|i will go with|i'll go with|i will proceed with|i'll proceed with)\b/gi

/** How far past a label or announcement a mode name may sit. */
const WINDOW = 120

/**
 * Map every acceptable way of naming a mode to its slug: the display name and
 * the slug, both lower-cased. Unknown tokens are absent by construction, which
 * is what stops a word like "concrete" from being read as a mode.
 */
export function buildVocabulary(modes) {
	const byToken = new Map()
	for (const mode of modes ?? []) {
		if (!mode || typeof mode.slug !== "string" || typeof mode.name !== "string") continue
		byToken.set(mode.slug.trim().toLowerCase(), mode.slug)
		byToken.set(mode.name.trim().toLowerCase(), mode.slug)
	}
	return byToken
}

function slugFor(byToken, raw) {
	if (!raw) return null
	return byToken.get(String(raw).trim().toLowerCase()) ?? null
}

/** The first vocabulary member inside `window`, with its position in it. */
function firstModeIn(byToken, window) {
	const lower = window.toLowerCase()
	let best = null
	for (const [token, slug] of byToken) {
		const at = lower.indexOf(token)
		if (at === -1) continue
		if (!best || at < best.at) best = { at, slug }
	}
	return best
}

function bareHeader(text, byToken) {
	BARE_HEADER.lastIndex = 0
	for (let match = BARE_HEADER.exec(text); match; match = BARE_HEADER.exec(text)) {
		const slug = slugFor(byToken, match[1]) ?? slugFor(byToken, match[2])
		if (slug) return { index: match.index, slug, rule: "v4-bare-header" }
	}
	return null
}

function bareToken(text, byToken) {
	BARE_TOKEN.lastIndex = 0
	for (let match = BARE_TOKEN.exec(text); match; match = BARE_TOKEN.exec(text)) {
		const slug = slugFor(byToken, match[1])
		if (slug) return { index: match.index, slug, rule: "v4-bare-token" }
	}
	return null
}

function labelled(text, byToken) {
	LABELLED_MODE.lastIndex = 0
	for (let match = LABELLED_MODE.exec(text); match; match = LABELLED_MODE.exec(text)) {
		const hit = firstModeIn(byToken, text.slice(match.index, match.index + WINDOW))
		if (hit) return { index: match.index + hit.at, slug: hit.slug, rule: "v4-labelled-mode" }
	}
	return null
}

function willUse(text, byToken) {
	WILL_USE.lastIndex = 0
	for (let match = WILL_USE.exec(text); match; match = WILL_USE.exec(text)) {
		const hit = firstModeIn(byToken, text.slice(match.index, match.index + 80))
		if (hit) return { index: match.index + hit.at, slug: hit.slug, rule: "v4-will-use" }
	}
	return null
}

/**
 * Classify one reply.
 *
 * @param {string} reply the reply text
 * @param {Set<string>} slugs every slug the picker offered (what v3 needs)
 * @param {Array<{slug: string, name: string}>} [modes] the picker's entries. Omit
 *        and the v4 rules cannot fire — the exact behaviour of the pinned rule.
 */
export function classifyProductReply(reply, slugs, modes = []) {
	const text = String(reply ?? "")
	const base = classify(text, slugs)
	if (base.verdict !== "UNRESOLVED") {
		// EMPTY and other non-choice verdicts must not be labelled as declarations:
		// an empty reply was reported as "v3-declaration" in the failed batch.
		const rule =
			base.verdict === "ASK" ? "v3-ask" : base.verdict === "DECLARATION" ? "v3-declaration" : "v3-no-signal"
		return { ...base, rule }
	}

	const byToken = buildVocabulary(modes)
	const declaration = byToken.size
		? [bareHeader(text, byToken), bareToken(text, byToken), labelled(text, byToken), willUse(text, byToken)]
				.filter(Boolean)
				.sort((left, right) => left.index - right.index)[0] ?? null
		: null

	const asks = [text.search(ASK_LEADIN), text.search(ASK_PHRASE)].filter((at) => at >= 0)
	const askAt = asks.length ? Math.min(...asks) : -1

	// The earliest signal wins. A heading before an ask is a commitment followed by
	// a material request; an ask before a heading is a question (M-12).
	if (declaration && (askAt < 0 || declaration.index < askAt)) {
		return { verdict: "DECLARATION", slug: declaration.slug, rule: declaration.rule }
	}
	if (askAt >= 0) return { verdict: "ASK", slug: null, rule: "ask-leadin" }
	return { ...base, rule: "unresolved" }
}

/**
 * Whether a reply echoes a whole picker line, in the format that was rendered.
 * The echo guard must follow the renderer, or a format change silently changes
 * what it recognises (log §32).
 */
export function echoesLine(reply, format, renderer) {
	const sample = renderer({ slug: "slug", name: "Name", whenToUse: "routing line" }, format)
	return String(reply ?? "").includes(sample)
}
