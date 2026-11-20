/**
 * r0-extract.mjs — the declaration extractor R0 scores with.
 *
 * It does not reinvent the classifier. Section 32 of the log records that a
 * from-scratch rule was written for R0 and scored 14/20 against the hand pass,
 * while the rule already in the repo scores 19/20. So this module borrows
 * `classify` from the R2 screen and adds **exactly one declared rule** for the
 * single reply that rule leaves unresolved.
 *
 * THE ONE ADDED RULE
 *   A reply whose opening is a request for information ("Required information:",
 *   "Please provide", "I need…") is an ASK, even when it names one candidate.
 *   R2's r10-B3 is the case: it opens with a required-information list and names
 *   `codebase-cartographer` as a possibility, and v3 leaves it UNRESOLVED. M-12
 *   says a reply that asks is an ASK however many slugs it contains.
 *
 * VALIDATION
 *   `scripts/r0-extract.spec.mjs` requires this to reproduce all 20 hand verdicts
 *   in R2's batch. If that spec fails, R0 does not run.
 */

import { classify } from "../hidden-intent-screen.mjs"

// The lead-in may open a line rather than the reply: R2's r10-B3 opens with a
// sentence, then puts "**Required Information:**" on its own line. Anchoring at
// the start of the reply alone missed it, which is the whole reason this rule exists.
export const ASK_LEADIN =
	/(^|\n)\s*(?:\*\*)?(required information|information needed|clarification(?: needed)?|what i need|please provide)\b/i

export function classifyProductReply(reply, slugs) {
	const text = String(reply ?? "")
	const base = classify(text, slugs)
	if (base.verdict !== "UNRESOLVED") return { ...base, rule: base.verdict === "ASK" ? "v3-ask" : "v3-declaration" }
	if (ASK_LEADIN.test(text)) return { verdict: "ASK", slug: null, rule: "ask-leadin" }
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
