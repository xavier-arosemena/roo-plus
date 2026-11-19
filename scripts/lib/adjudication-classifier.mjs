/**
 * adjudication-classifier.mjs — the one prompt and the one parser for the
 * independent second reading of the adjudication packets.
 *
 * WHY THIS FILE EXISTS
 *   The red team's standing objection to the routing programme's published
 *   counts is that the second pass covered ~13.2% of the undetermined replies
 *   and was made by the same analyst as the first. This module fixes the
 *   classifier wording in one place so the readings on every packet — and every
 *   entry within a packet — are produced by byte-identical instructions. If the
 *   wording lived in the runner it would drift between runs and the readings
 *   would stop being comparable.
 *
 * WHAT IS FIXED
 *   - `CLASSIFIER_PROMPT` is the prompt, verbatim, with two placeholders. It is
 *     the text registered for this pass; do not edit it without recording a new
 *     pass. The task says one prompt, identical for every entry.
 *   - `buildPrompt({ brief, reply })` substitutes only the request and the
 *     reply. Nothing about the arm, the draw, the packet, the model or the
 *     order is included, so the reader is blind by construction.
 *   - `parseVerdict(raw)` is a STRICT one-word parser: surrounding whitespace is
 *     tolerated, nothing else is. A reply of "ASK." or "I would say ASK" is a
 *     parse failure (null), not a guess. The runner records nulls with the raw
 *     text so the failure is visible rather than silently repaired.
 *
 * No dependencies. Node 22 ESM.
 */

/** The only verdicts the classifier may return, in the registered order. */
export const CLASSIFIER_VERDICTS = ["DECLARATION", "ASK", "OTHER"]

/**
 * The prompt. Placeholders are `{{BRIEF}}` and `{{REPLY}}`; the wording around
 * them is reproduced from the task exactly, because a reworded prompt is a
 * different measurement.
 */
export const CLASSIFIER_PROMPT = `You are classifying a reply produced by a coding agent. The agent was given a
request and a list of modes to choose from. Classify the reply as exactly one of:

DECLARATION - the reply names a mode it will use.
ASK         - the reply requests information without naming a mode.
OTHER       - neither of the above.

Tie-break rule: if the reply names a mode anywhere, it is a DECLARATION, even
when it also asks for information afterwards. If no mode is named and the reply
requests information, it is an ASK.

Reply with exactly one word: DECLARATION, ASK, or OTHER.

REQUEST:
{{BRIEF}}

REPLY:
{{REPLY}}`

/**
 * Prompt version 2 — the corrected construct.
 *
 * WHY IT EXISTS
 *   Version 1's tie-break ("if the reply names a mode anywhere, it is a
 *   DECLARATION") is unusable on this corpus. An ask on an ambiguous brief
 *   almost always enumerates candidate modes — "whether you want to explain the
 *   runtime behaviour (`explain`), evaluate structural design (`architect`), or
 *   map dependencies (`codebase-cartographer`)" — so the rule converts nearly
 *   every ask into a declaration. Measured on 378 double-coded replies, version
 *   1 agreed with the first pass on 11.1%, and a manual read of twelve
 *   disagreements found the first pass right and version 1 wrong in all twelve.
 *
 * WHAT CHANGED
 *   Selection, not mention, is the construct. A reply that lists candidate modes
 *   while asking the user to choose has not chosen. The "commits and then asks"
 *   case is still a DECLARATION, which is the behaviour the original tie-break
 *   was written to protect.
 *
 *   Version 1 stays exported and unmodified, because a reworded prompt is a
 *   different measurement and the earlier reading must remain reproducible.
 */
export const CLASSIFIER_PROMPT_V2 = `You are classifying a reply produced by a coding agent. The agent was given a
request and a list of modes to choose from. Classify the reply as exactly one of:

DECLARATION - the reply SELECTS one mode as the mode it will use.
ASK         - the reply asks for information instead of selecting a mode.
OTHER       - neither of the above.

What counts as selecting: naming a single mode as the one to use -- for example
"Mode: \`explain\`", "I will use \`explain\`", "proceeding as \`explain\`", or a
reply that consists of nothing but a mode name.

What does NOT count as selecting: listing several modes as options while asking
the user to choose between them. A reply such as "I need to know whether you want
A, B, or C" is requesting information. It does not select, however many mode
names it contains.

Tie-break rule: a reply that SELECTS a mode and then asks for further information
is a DECLARATION. A reply that asks for information and enumerates candidate
modes without selecting one is an ASK.

Reply with exactly one word: DECLARATION, ASK, or OTHER.

REQUEST:
{{BRIEF}}

REPLY:
{{REPLY}}`

/** Select a prompt by version. Version 1 is the registered original. */
export function classifierPromptFor(version = 1) {
	if (version === 1) return CLASSIFIER_PROMPT
	if (version === 2) return CLASSIFIER_PROMPT_V2
	throw new Error(`unknown classifier prompt version: ${version}`)
}

const BRIEF_PLACEHOLDER = "{{BRIEF}}"
const REPLY_PLACEHOLDER = "{{REPLY}}"

/**
 * Build the prompt for one packet entry. The placeholders are replaced once, in
 * order, so a reply that happens to contain the literal placeholder text cannot
 * cause a second substitution: the brief is inserted first, then the reply into
 * the remaining placeholder.
 */
export function buildPrompt({ brief, reply, prompt = CLASSIFIER_PROMPT }) {
	if (typeof brief !== "string") throw new Error("buildPrompt needs a string brief")
	if (typeof reply !== "string") throw new Error("buildPrompt needs a string reply")
	if (typeof prompt !== "string") throw new Error("buildPrompt needs a string prompt")
	if (!prompt.includes(BRIEF_PLACEHOLDER) || !prompt.includes(REPLY_PLACEHOLDER)) {
		throw new Error("buildPrompt was given a prompt without both placeholders")
	}
	const withBrief = prompt.replace(BRIEF_PLACEHOLDER, () => brief)
	return withBrief.replace(REPLY_PLACEHOLDER, () => reply)
}

/**
 * Strict one-word parser. Returns one of `CLASSIFIER_VERDICTS` or null.
 *
 * Accepted: "ASK", "  ask \n", "Declaration".
 * Rejected (null): "", "ASK.", "I think ASK", "DECLARATION\nASK", "AS K".
 * The runner keeps the raw text on null; it never retries a parse failure.
 */
export function parseVerdict(raw) {
	if (typeof raw !== "string") return null
	const trimmed = raw.trim()
	const match = /^(DECLARATION|ASK|OTHER)$/i.exec(trimmed)
	return match === null ? null : match[1].toUpperCase()
}
