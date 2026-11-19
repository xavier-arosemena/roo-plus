/**
 * scorer-rubric.mjs — the single source of `rubric.md` for both scorer bundles.
 *
 * WHY ONE CONSTANT
 *   Registration §5 item 5 requires "the scoring rubric is copied verbatim into
 *   both scorers' briefs before scoring, so the rubric itself is not a free
 *   variable". Two bundles written from two code paths could drift; both are
 *   written from this string or the run fails.
 *
 * WHAT CHANGED, AND WHY (objection 12 — FATAL)
 *   The shipped rubric was not Amendment 1's rubric. It re-anchored `MATCH` to
 *   "what a reader would expect" — a judgement about a hypothetical reader, the
 *   exact failure mode E2 diagnosed — dropped `NO_SELECTION`, dropped the
 *   out-of-vocabulary clause from `MISS`, added `AMBIGUOUS` / `HELP` / `INVALID`
 *   as owner levels, and reduced the five framing categories to one-line glosses.
 *   Amendment 1 is frozen and says "may not be edited afterwards", so the fix is
 *   to copy it, not to improve it:
 *     §A1.1 categories  -> FRAMING_CATEGORIES + FRAMING_TIE_BREAKS, verbatim
 *     §A1.2 levels      -> OWNER_LEVELS + OWNER_RULES, verbatim
 *     §A1.3 limitation  -> quoted in section 2 below
 *   `AMBIGUOUS`, `HELP` and `INVALID` survive as recorded FLAGS, never as owner
 *   levels, so a response can be `NO_SELECTION` + `help` without inventing a
 *   fifth level.
 *
 * WHAT WAS DELETED (objection 13)
 *   The parent registration's MODE-X blind-scoring rule and its B1/B2/B3
 *   task-outcome rubric were copied into this bundle and contradicted it: the
 *   outcome rubric judges a transcript of work, which a 3–1,558 byte mode
 *   declaration can never satisfy, and the blind-scoring rule implies every case
 *   here is de-blinded because the pickers carry real slugs. Both are gone,
 *   replaced by one line: this bundle scores routing only.
 *
 * THE ECHO DEFINITION IS SHARED, NOT RESTATED (objection 16)
 *   The harness detector and this rubric previously named two different strings
 *   (one with the leading bullet, one without), so "a high echo rate" named two
 *   quantities. Both now use `pickerLine`, and the rubric states the rendered
 *   form so a scorer and the detector cannot diverge.
 *
 * No dependencies. Node 22 ESM.
 */

import { pickerLine } from "./framing-pretest.mjs"

/** Amendment 1 §A1.1 — five categories, verbatim. */
const FRAMING_CATEGORIES = `| Category | Definition |
| --- | --- |
| \`GOAL\` | The response states an intended outcome in the requester's own voice — "I want…", "Goal:", "Objective:". It says what is wanted, not what will be handed back. |
| \`DELIVERABLE\` | The response names an artefact to be produced — "Deliverable:", or a noun phrase naming a report, reproduction, spec or document. |
| \`IMPLICIT\` | No framing is stated. A mode may be named, including after a third-person narration. |
| \`BARE\` | The response is essentially only a mode name, with no framing statement and no narration. |
| \`HELP\` | The response asks for information instead of committing to a mode. |`

/** Amendment 1 §A1.1 — the structural test and the two tie-breaks, verbatim. */
const FRAMING_TIE_BREAKS = `\`BARE\` and \`IMPLICIT\` differ in structure, not in framing: a single slug versus a narration. A long response that narrates and states no framing is \`IMPLICIT\` regardless of length. A response that both names a mode and asks a question takes the category reflecting its **commitment**, with \`help_seeking\` recorded separately.`

/** Amendment 1 §A1.2 — four owner levels, verbatim. */
const OWNER_LEVELS = `| Level | Definition |
| --- | --- |
| \`MATCH\` | The declared mode is the mode in that prompt's list whose routing line most directly answers the brief. |
| \`PLAUSIBLE\` | A defensible adjacent choice: it could serve the brief, but another listed mode answers it more directly. |
| \`MISS\` | The declared mode does not serve the brief, **or** is not present in that prompt's list. |
| \`NO_SELECTION\` | No mode was declared. |`

/** Amendment 1 §A1.2 — ambiguity, out-of-vocabulary and echo rules, verbatim. */
const OWNER_RULES = `**Ambiguity rule.** Where a scorer cannot separate \`MATCH\` from \`PLAUSIBLE\`, it records \`PLAUSIBLE\` and notes why — the conservative direction, consistent with §5's disagreement rule.

**Out-of-vocabulary rule.** A slug absent from the prompt's list is \`MISS\` plus a note. It is never \`PLAUSIBLE\`, because it cannot be adjacent to a catalogue it is not in.

**Echo rule.** A response reproducing the picker's own \`slug — Name — routing line\` counts as a declaration, is flagged \`echoed\`, and is judged on the same rubric. A high echo rate is reported as an engagement signal, never as a correctness signal.`

/** Registration §5 — the conservative resolution rule, verbatim. */
const DISAGREEMENT_RULE = `**Disagreement rule, fixed in advance.** Where the two scorers differ on \`owner_judgement\`, the resolution is **conservative toward the null**: \`MATCH\` vs \`PLAUSIBLE\` → \`PLAUSIBLE\`; \`MATCH\` vs \`MISS\` → \`MISS\`; \`PLAUSIBLE\` vs \`MISS\` → \`MISS\`. Conservative resolution cannot manufacture an effect.`

/** Registration §6 — the edge-case table, verbatim. */
const EDGE_CASES = `| Case | Rule |
| --- | --- |
| Response names two modes | Score the mode **after the marker** if a marker exists; otherwise \`AMBIGUOUS\`, and \`AMBIGUOUS\` counts against MATCH |
| Response names a slug absent from its picker | \`MISS\`, with a note — never silently ignored |
| Response echoes the picker line (as run-16 did) | Counts as a selection, flagged \`echo\`; a high echo rate is reported as an engagement signal |
| Response is a question instead of a choice | \`HELP\`, \`declared_mode = null\` |
| \`finishReason = MAX_TOKENS\` | \`INVALID\`, never partially scored |
| Response is not in English | Recorded; scored on meaning; language reported per arm, since persona 5 may induce it |
| Empty or missing transcript | \`INVALID\`; never repaired |`

/**
 * The rendered picker-line form, taken from the same renderer the harness uses.
 * `- slug — Name — routing line` is what a prompt actually contains.
 */
export const ECHO_LINE_FORM = pickerLine({ slug: "slug", name: "Name", whenToUse: "routing line" })

/** The recorded flags. Not owner levels: objection 12. */
const FLAGS = `| Flag | Raised when |
| --- | --- |
| \`help\` | No mode was declared (\`owner_judgement = NO_SELECTION\`). The mechanical definition of HELP. |
| \`ambiguous\` | Two or more modes are named and no marker selects between them (§6). |
| \`invalid\` | Truncated (\`finishReason\` other than \`STOP\`), empty or missing (§6). Never partially scored. |
| \`echoed\` | The response reproduces a whole picker line, in the form below. |
| \`out_of_vocabulary\` | The named slug is not in that prompt's list (§6 says this is \`MISS\`). |
| \`two_framings\` | Two stated framings are present. Record the first and flag the second. |
| \`help_seeking\` | A mode is named **and** a question is asked. The framing category follows the commitment. |`

export const RUBRIC_MD = `# Scoring brief — comprehension routing

You are scoring a set of cases. Each case is one folder containing:

- \`prompt.txt\` — exactly what a model was shown: one persona directive, one standing
  request, one brief, and one list of modes in the form \`slug — Name — routing line\`.
- \`response.txt\` — what the model returned, verbatim. A file with no content means no
  usable response was recorded.
- \`rubric.md\` — this brief.

**Do not look for, infer, or ask for an arm label, a condition name, a catalogue name,
a plan, a sealed owners file, or a run id.** None of them is in your bundle, and the case
order you have is not the order another scorer has. Score each case on its own text.

**This bundle scores routing only; no answer text is being judged.** There is no
pass/fail for the quality of an answer here, and no task-outcome rubric applies.

## 1. What to record, per case

| Field | Value |
| --- | --- |
| \`declared_mode\` | the \`slug\` the response selects, exactly as it appears in that case's \`prompt.txt\`, or \`null\` |
| \`owner_judgement\` | exactly one of \`MATCH\` / \`PLAUSIBLE\` / \`MISS\` / \`NO_SELECTION\` |
| \`framing\` | exactly one of \`GOAL\` / \`DELIVERABLE\` / \`IMPLICIT\` / \`BARE\` / \`HELP\` |
| \`flags\` | zero or more of the flags in §4 |
| \`notes\` | one line. Required for \`MISS\`, \`NO_SELECTION\`, and whenever a flag is raised |

You are **recording** a declared mode, not deciding who owns the brief. The expected
owner is held in a sealed key you do not receive; where your reading differs from it, the
difference is a finding to report, not a reason to change your reading of the text.

## 2. Owner judgement — four levels, exactly one per response

${OWNER_LEVELS}

${OWNER_RULES}

Amendment 1 also states what the rubric may not be used for, in its own words: it "judges
one response against one prompt. It cannot compare arms, rank catalogues, or score a
batch."

## 3. Framing — five categories, exactly one per response

Record the category that describes how the response presents its choice.

${FRAMING_CATEGORIES}

${FRAMING_TIE_BREAKS}

## 4. Recorded flags — never additional owner levels

The four levels in §2 are the whole scale. These are observations attached to a case:

${FLAGS}

## 5. Edge cases, decided before they occurred

${EDGE_CASES}

**Open wording item OW-1.** The echo row above says a high echo rate "is reported as an
engagement signal". This bundle goes one step further and states that an echo is **not scored as correctness**: the \`echoed\` flag never moves \`owner_judgement\`. The row's own
wording is preserved verbatim because the edge-case table is frozen; the difference is
recorded as an open item against that table rather than edited into the registration.

**The echo string, stated once.** \`echoed\` is \`true\` only if the response contains one
whole picker line from its own \`prompt.txt\`, in exactly this form, leading hyphen
included: \`${ECHO_LINE_FORM}\`. The harness computes the same string from the same
renderer, so the record and your flag measure one quantity, not two.

## 6. Disagreement between the two scorers

${DISAGREEMENT_RULE}

The resolution is applied to \`owner_judgement\` only. In this bundle the rule is biased
downward in every case, so it can lower a judgement and never raise one.

## 7. Duplicate cases

Five responses appear **twice**, under two different case ids, in different positions.
Score them as you find them and do not try to match pairs: the duplicate map is sealed
and stays sealed until both scorers have returned. The pairs exist to measure how stable
one scorer is on identical text, so a difference between two identical cases is a
finding about the rubric, not about the model.

## 8. What these cases cannot settle

The population, the developers, the doctrine, and which catalogue is "better" are all
outside what this bundle can show. Answer only the question each case asks: was the
declared mode the mode whose routing line most directly answers the brief?
`
