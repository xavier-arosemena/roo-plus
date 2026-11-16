# Pre-registration — isolating the B3 effect (E12)

| Field              | Value                                                                                                                                                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **What this is**   | A registration filed **before** any run, for the second experiment in the modes programme. It exists because E11 produced one discriminating observation and an unknown number of explanations for it.                                                 |
| **Parent**         | [`2026-11-09-frame-decision-preregistration.md`](2026-11-09-frame-decision-preregistration.md). That document's decision rule and amendments 4–6 stand unchanged. This one registers a _new_ question and cannot retroactively change the old reading. |
| **Prior evidence** | [`modes-experiment-log.md`](../research/modes-experiment-log.md) E11: axis × stance 1/5 MATCH, artefact 4/5 MATCH on brief B3, with all three help-seeking responses in the axis cell.                                                                 |
| **Status**         | **REGISTERED, NOT RUN.** No call has been made for this design.                                                                                                                                                                                        |

---

## 1. The question, and why it is not "which frame wins"

E11's only discriminating signal sits in one brief. Before that signal can be treated as a fact about catalogues, it has to survive the question: _what exactly about that cell caused it?_

Five candidate causes, all present simultaneously in the original contrast:

| Id    | Candidate cause                                                                                                       | Why it is plausible                                                                            |
| ----- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **M** | **Morphology** — the axis catalogue's owner is `explain` (a verb), the artefact catalogue's is `explanation` (a noun) | The artefact-frame thesis is that deliverable-nouns route better than activity-verbs           |
| **L** | **Routing-line wording** — "the answer must cite evidence, not recall" vs "evidence must be cited"                    | The second is shorter and states the artefact rather than the constraint                       |
| **S** | **Picker size** — 45 modes vs 47                                                                                      | Position and count effects are well documented in long-context selection                       |
| **X** | **Lexical overlap** — the brief says "Explain…", and one catalogue contains a mode literally named `explain`          | Word overlap was the decisive objection to the bake-off (E2)                                   |
| **N** | **None of the above** — some structural property of the axis picker (competition among neighbouring modes)            | `architecture-reviewer`, `codebase-cartographer` and `code` all sit near the brief's semantics |

**H0 — the null.** The original 1/5 vs 4/5 was sampling noise at five observations. With n=5 per cell, this is a serious possibility and is tested first.

## 2. Design — material variants, one brief

The brief is held **byte-identical** across arms wherever the arm is not about the brief. Only the picker material varies. Five personas, one run each, temperature 0.

| Arm    | Material                                                                        | Isolates                      | Prediction if that cause is the driver |
| ------ | ------------------------------------------------------------------------------- | ----------------------------- | -------------------------------------- |
| **A0** | Unmodified axis × stance (45 modes, `explain`)                                  | Replication of E11            | 1/5 — required for the rest to matter  |
| **A1** | Axis × stance with `explain` renamed to `explanation`; **route line unchanged** | **M**                         | ≈4–5/5                                 |
| **A2** | A1 **plus** the artefact's routing line                                         | **L** given M                 | ≈4–5/5                                 |
| **A3** | Axis × stance unchanged, plus **two neutral padding modes** to reach 47         | **S**                         | ≈4–5/5                                 |
| **A4** | Axis × stance unchanged, brief paraphrased to remove the verb "Explain"         | **X**                         | ≈4–5/5                                 |
| **A5** | Unmodified artefact × stance (47 modes, `explanation`)                          | Reference for the target rate | 4/5 — replication of E11               |

Plus two controls:

| Control         | Material                                                  | Expectation | Purpose                                                                                                  |
| --------------- | --------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------- |
| **C1 positive** | Unmodified axis × stance with brief **B1** ("CI is red…") | 5/5         | Detects a degraded run: if C1 drops, the whole batch is suspect and is discarded rather than interpreted |
| **C2 order**    | A0 with the picker order reversed (seeded)                | ≈1/5        | Detects a position effect masquerading as a content effect                                               |

**Runs: 6 arms × 5 personas + C1 (5) + C2 (5) = 40 calls.** At E11's measured ≈2,228 tokens per call, ≈89k tokens.

**Why not split B3 first.** Splitting into several comprehension briefs varies _content_ while the unknown is _material_. Every cell holds one run per persona, so extra briefs add ambiguous cells rather than power inside the cell that failed. Splitting is the correct **second** step, and only for whichever cause survives.

## 3. Pre-committed reading

The whole design reduces to one pattern table, fixed now so that no result can be reinterpreted later.

| Observation                                 | Reading                                                                                                               |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| A0 ≥ 4/5                                    | **H0.** No gap to explain; the E11 result was noise. Close E12; do not run A1–A5 in future trials of this kind.       |
| A0 ≤ 2/5 and A1 ≥ 4/5                       | **M** — morphology. The noun-vs-verb difference routes better.                                                        |
| A0 ≤ 2/5, A1 ≤ 2/5 and A2 ≥ 4/5             | **L** — routing-line wording, not the slug.                                                                           |
| A0 ≤ 2/5 and A3 ≥ 4/5 with A1 ≤ 2/5         | **S** — picker size / position.                                                                                       |
| A0 ≤ 2/5 and A4 ≥ 4/5                       | **X** — lexical overlap between brief and slug.                                                                       |
| A0, A1, A2, A3, A4 all ≤ 2/5 while A5 ≥ 4/5 | **N** — a structural property not exercised by any arm; report the gap as real but unexplained, and do not act on it. |
| C1 < 4/5                                    | Batch invalid. Report as an instrument failure, not a finding.                                                        |
| C2 differs from A0 by ≥ 3/5                 | Position effect dominates; all arms are re-read as order-sensitive, and no content conclusion is drawn.               |

**This is a registered exploration, not a confirmatory test.** Six arms invite multiple comparisons, so no p-value is offered as a decision. The **pattern** decides, and a Fisher exact test per contrast is reported as description only. Stating this in advance is what stops an exploratory sweep being reported as a confirmed effect.

## 4. Instrument changes required before the run

| #   | Change                                                                         | Reason                                                                        |
| --- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| I-1 | Support **arm × persona** plans, not only `persona × brief × catalogue`        | The design is material-variant-based                                          |
| I-2 | Record **`finishReason`** and language per run in the results record           | Truncation and code-switching must be visible rather than assumed absent      |
| I-3 | Support **k repetitions** of the same cell                                     | Determinism check; temperature 0 is not a guarantee on hosted APIs            |
| I-4 | Rename the framing category `NARRATIVE` → **`IMPLICIT`** in the scoring rubric | It is the absence of stated framing, not a distinct framing                   |
| I-5 | Emit a **scorer bundle** with case ids only (no arm labels, no plan)           | E11 proved `plan.json` de-blinds instantly; the mitigation must be structural |
| I-6 | Two scorers, **independent**, with the disagreement rule below                 | D-9 showed the judgement layer can move a result by one or two cases          |

## 5. Controls and blinding

**Controls.** C1 and C2 above. Also: A0 is itself a replication control for E11, and A5 is a replication control for the artefact reference rate.

**Order randomisation.** Within each picker, mode order is **fixed per arm and recorded**, with C2 reversing it. Order is not randomised per run, because a fixed order makes the material auditable; the cost is that order effects are estimated only by C2, and that limitation is accepted and stated.

**Blinding, in layers.**

1. The model never sees an arm name, a frame name, or a label — already true in E11 and preserved.
2. Each scorer receives a bundle of case files with **no arm assignment**; cases are **shuffled independently per scorer** so the two orderings cannot align.
3. The arm map and the frame map stay sealed until **both** scorers have returned.
4. Scorers are **not told which arm is expected to succeed**, so the hypothesis cannot bias plausibility judgements.
5. The scoring rubric is **copied verbatim** into both scorers' briefs before scoring, so the rubric itself is not a free variable.

**Disagreement rule, fixed in advance.** Where the two scorers differ on `owner_judgement`, the resolution is **conservative toward the null**: `MATCH` vs `PLAUSIBLE` → `PLAUSIBLE`; `MATCH` vs `MISS` → `MISS`; `PLAUSIBLE` vs `MISS` → `MISS`. Conservative resolution cannot manufacture an effect.

## 6. Edge cases, decided before they occur

| Case                                            | Rule                                                                                                                |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Response names two modes                        | Score the mode **after the marker** if a marker exists; otherwise `AMBIGUOUS`, and `AMBIGUOUS` counts against MATCH |
| Response names a slug absent from its picker    | `MISS`, with a note — never silently ignored                                                                        |
| Response echoes the picker line (as run-16 did) | Counts as a selection, flagged `echo`; a high echo rate is reported as an engagement signal                         |
| Response is a question instead of a choice      | `HELP`, `declared_mode = null`                                                                                      |
| `finishReason = MAX_TOKENS`                     | `INVALID`, never partially scored                                                                                   |
| Response is not in English                      | Recorded; scored on meaning; language reported per arm, since persona 5 may induce it                               |
| Empty or missing transcript                     | `INVALID`; never repaired                                                                                           |

## 7. Threats this design does not remove

1. **One model.** All claims are scoped to `gemini-3.5-flash`. A second model is a separate registration.
2. **Thinking tokens.** Reasoning happens before the visible answer, so a persona effect could be absorbed inside reasoning and be invisible in the output. E11 cannot distinguish "persona did not affect the decision" from "persona affected the reasoning, which then converged".
3. **Determinism is assumed, not proven.** I-3 exists to test it; if k repetitions diverge at temperature 0, every single-draw claim in E11 must be softened.
4. **Contamination.** The model may have seen this repository or Roo Code. Briefs are generic English requests, which limits but does not eliminate the risk.
5. **Small n.** Five personas per arm are five conditions, not five independent samples of a population. No arm can support a claim about readers in general.
6. **Scorer mediation.** Even with two scorers and a conservative rule, "is this the obvious owner?" remains a judgement. The rule reduces its influence; it does not remove it.

## 8. Stopping rules and falsifiers

**Stop before A1–A5 are interpreted** if A0 ≥ 4/5 — the premise is gone.
**Stop the batch** if C1 < 4/5.
**Report as unexplained** if the pattern matches no row of §3; do not pick the closest row.

**Falsifiers of this registration itself.** It is a bad registration if: the paraphrase in A4 changes the task rather than the wording (check by having a third party confirm the two briefs ask the same thing); the padding modes in A3 are not neutral (they must be plausibly irrelevant to comprehension); or A1's rename changes any other field besides `slug` and where it is referenced.

## 9. What this registration may and may not conclude

**May:** which material property of a picker drives a routing difference, if one is present, at the level of one model and five directives.

**May not:** which frame is better overall; anything about readers; anything about doctrine; any rate or probability claim; any generalisation beyond the two fixtures under test.

### Amendment 1 — the scoring rubric, frozen before any run (2026-11-11)

**Why this amendment exists.** Constructing the instrument revealed that this registration uses `MATCH`, `PLAUSIBLE`, `MISS` and `NO_SELECTION`, and speaks of framing categories, **without defining any of them** (gaps IN-5 and IN-6 below). The definitions existed only in the previous experiment's scoring attempt. Left there, the rubric would be a free variable chosen _after_ the fixtures were built — exactly the class of choice a registration exists to prevent. The rubric below was drafted during construction and is ratified **here, before any run**. It may not be edited afterwards.

#### A1.1 Framing categories — exactly one per response

| Category      | Definition                                                                                                                                                     |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GOAL`        | The response states an intended outcome in the requester's own voice — "I want…", "Goal:", "Objective:". It says what is wanted, not what will be handed back. |
| `DELIVERABLE` | The response names an artefact to be produced — "Deliverable:", or a noun phrase naming a report, reproduction, spec or document.                              |
| `IMPLICIT`    | No framing is stated. A mode may be named, including after a third-person narration.                                                                           |
| `BARE`        | The response is essentially only a mode name, with no framing statement and no narration.                                                                      |
| `HELP`        | The response asks for information instead of committing to a mode.                                                                                             |

`BARE` and `IMPLICIT` differ in structure, not in framing: a single slug versus a narration. A long response that narrates and states no framing is `IMPLICIT` regardless of length. A response that both names a mode and asks a question takes the category reflecting its **commitment**, with `help_seeking` recorded separately.

#### A1.2 Owner judgement — exactly one per response

| Level          | Definition                                                                                                |
| -------------- | --------------------------------------------------------------------------------------------------------- |
| `MATCH`        | The declared mode is the mode in that prompt's list whose routing line most directly answers the brief.   |
| `PLAUSIBLE`    | A defensible adjacent choice: it could serve the brief, but another listed mode answers it more directly. |
| `MISS`         | The declared mode does not serve the brief, **or** is not present in that prompt's list.                  |
| `NO_SELECTION` | No mode was declared.                                                                                     |

**Ambiguity rule.** Where a scorer cannot separate `MATCH` from `PLAUSIBLE`, it records `PLAUSIBLE` and notes why — the conservative direction, consistent with §5's disagreement rule.

**Out-of-vocabulary rule.** A slug absent from the prompt's list is `MISS` plus a note. It is never `PLAUSIBLE`, because it cannot be adjacent to a catalogue it is not in.

**Echo rule.** A response reproducing the picker's own `slug — Name — routing line` counts as a declaration, is flagged `echoed`, and is judged on the same rubric. A high echo rate is reported as an engagement signal, never as a correctness signal.

#### A1.3 What the rubric may not be used for

It judges one response against one prompt. It cannot compare arms, rank catalogues, or score a batch. That is done by the pattern table in §3, after both scorers have returned.

#### A1.4 Acknowledged gaps found during construction

| Id    | Gap                                                                                        | Disposition                                                                                                     |
| ----- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| IN-5  | Framing categories used but never defined                                                  | Fixed by A1.1, frozen before any run                                                                            |
| IN-6  | Owner levels undefined; the bundle rubric had to supply definitions                        | Fixed by A1.2                                                                                                   |
| IN-7  | "Independent scorers" is procedural, not script-enforceable                                | Accepted as stated threat §7.6; separation is by separate delegation and separate shuffle seeds, not by sandbox |
| IN-8  | C2 was called "seeded" with no seed given; implemented as an exact reversal                | Accepted; recorded in the implementation notes                                                                  |
| IN-9  | The registered 40 runs assume k=1                                                          | Accepted; any k>1 run is a separate registration                                                                |
| IN-10 | `frame` demoted from failing token to counted-only                                         | Consistent with Amendment 6 of the parent registration                                                          |
| IN-11 | A3's picker is a superset of A0's, so the parent's two-catalogue check needed generalising | Accepted as an instrument change; no effect on interpretation                                                   |
| IN-12 | `plan.json` gained `repetitions` and `planFile`                                            | Accepted; both recorded so k is auditable                                                                       |

#### A1.5 Frozen from here

After this amendment the following may not change before the run: the five category names, the four owner levels, the ambiguity / out-of-vocabulary / echo rules, the eight conditions in `arms.json`, the brief strings, the five persona directives, and the pattern table in §3. Any change is a new registration, not an edit.

### Amendment 2 — §3 is withdrawn and replaced by a sequential procedure (2026-11-11)

Filed after the adversarial review at [`2026-11-11-b3-isolation-red-team.md`](2026-11-11-b3-isolation-red-team.md). **No run has been executed.** The §3 pattern table is withdrawn entirely; it may not be used to read any result.

**Why — verified, not accepted on trust.** I re-derived the review's enumeration myself over all 6⁶ count vectors under this design's own null (every arm at the pooled B3 rate of 1 in 2). The numbers reproduce exactly, and the mass sums to 1.0000:

| Outcome class                | Probability under H0                              |
| ---------------------------- | ------------------------------------------------- |
| A0 ≥ 4/5, so H0 closes       | **18.8%**                                         |
| No row matches               | **56.8%**                                         |
| Two or more rows match       | **4.1%**                                          |
| Exactly one causal row fires | **20.4%** (M 7.6 · X 6.0 · L 3.1 · S 3.1 · N 0.6) |

And **P(A0 = exactly 3/5) = 31.25%**, an outcome the table could not read at all. A rule that names one cause in five when there is no cause is not a decision rule; §3 is therefore void.

#### A2.1 The datum changes from a rate to a vector

Each persona's answer is recorded as one of `MATCH` / `PLAUSIBLE` / `HELP` / `MISS`. The datum is the **five-element vector**, not its sum. Consequences: a change of _which_ persona routes correctly is informative; no outcome falls into a dead band; and E11's actual observation — three abstentions, not three wrong answers — becomes measurable rather than invisible.

#### A2.2 The procedure — pre-committed order, first match wins, stop on failure

**Step 0 — instrument control.** Run **C1** (B1 on the unmodified axis picker) **first**. Require 5/5 `MATCH`. Below that: **stop**, report an instrument failure, read no arm.

**Step 1 — determinism.** Run **A0 three times, interleaved** so repeats are not consecutive. If the three vectors are not identical, **stop**: single-draw measurement is unavailable at this model and these settings, and no arm may be read. This is a finding about the instrument, not about catalogues, and it retires every single-draw claim in the experiment that follows.

**Step 2 — the contrast exists.** Run **A5** once (five personas). Require ≥ 4/5 `MATCH`. Below that: the difference this experiment exists to explain was not reproduced, and **no arm may be read**.

**Step 3 — the noise floor.** Run **P** (the placebo arm, A2.4). Require P's vector to be **identical to A0's**. Any movement means that material change alone moves answers, so no arm's movement can be attributed without subtracting it; report the floor and read no causal arm.

**Step 4 — replication of E11.** Compare A0's vector with E11's recorded vector — P1 `HELP`, P2 `HELP`, P3 `PLAUSIBLE` (`architecture-reviewer`), P4 `MATCH` (`explain`), P5 `HELP`. Replication criterion, fixed now: **at least 4 of 5 personas agree and `HELP` ≥ 2**. If not met: **stop**, report that the cell did not replicate, and name no cause.

**Step 5 — ordered causal evaluation, first match wins.** Evaluate in the fixed order **M → L → X → N**, and **stop at the first arm that meets its criterion**. An arm meets it when **at least 3 of the 5 personas change from `HELP` or `PLAUSIBLE` to `MATCH` on the comprehension owner, and no persona changes away from `MATCH`**. Arms after the first match are reported **NOT RUN**, never as negative results.

**Step 6 — if no arm meets its criterion** in step 5, the reading is **N: unexplained at this instrument**, and the candidate set is declared non-exhaustive. No cause is named, and no "most likely" ranking is offered.

Because only one arm is ever read, **no multiplicity correction is needed and no second cause may be claimed.** This is the property §3 lacked.

#### A2.3 The candidate set changes — S is withdrawn, T is added

Measured by the review and re-checked here: A0 → A3 adds two modes, **+242 picker bytes**, owner position unchanged; A0 → A5 adds two modes, **−536 picker bytes**, owner position +7 lines. A3 therefore models neither component of the contrast it was built to stand for.

- **S (picker size) is withdrawn** as a candidate for this run. A3 is **not run**. It is not reported as refuting S; S is **untested**, and the fixture is retained for a future registration that pads both pickers to a common size.
- **T (routing-line terseness / picker byte density) is added.** A5's picker is 536 bytes shorter with two more modes, so its lines are materially terser. **No arm in this registration tests T**, so if N is reached, T is recorded as an untested member of the non-exhaustive set rather than a refuted one.

#### A2.4 Two arms change

- **A4's brief is replaced.** The registered text would have been `This module is structured the way it is. I want to understand the reasoning behind that.` — which deletes "Explain", deletes "why", changes the speech act from imperative to desiderative, adds a first-person subject and a stated desire, and uses `I want…`, the experiment's **own `GOAL` marker**. It therefore varied framing register as well as lexical overlap. The registered replacement is: **`Set out the reasons this module is arranged as it is.`** — same length band as B3, no first person, no `GOAL` marker, and one substantive change (the verb) rather than five.
- **A new placebo arm P** is added: the unmodified axis picker with **two unrelated modes renamed** — neither the comprehension mode nor any mode adjacent to the brief's semantics. Five personas, brief B3. Its only job is the noise floor in step 3. (The review suggested renaming `supply-evidence` or swapping two non-comprehension modes; the exact choice is recorded in the plan before the run.)

#### A2.5 A sealed answer key is added

A file records, for each `(arm, brief)` pair, the **expected owner**: the comprehension mode in that picker — `explain` for A0, C2 and P; `explanation` for A1, A2 and A5; and for A4 on the unmodified picker, `explain`. Scorers never see it. Two scorers **record** the declared mode; they do not decide the owner. Where a scorer's judgement differs from the key, that is a finding about the catalogue, not a licence to move the key.

#### A2.6 Cost

| Path                      | Calls                                      |
| ------------------------- | ------------------------------------------ |
| Step 0 C1                 | 5                                          |
| Step 1 A0 × 3 interleaved | 15                                         |
| Step 2 A5                 | 5                                          |
| Step 3 P                  | 5                                          |
| Steps 5 M → L → X         | 5 each, stopping at the first match (5–15) |
| **Total**                 | **35 minimum, 45 maximum**                 |

The 40-call unconditional batch is withdrawn. No further call is spent after a stop, and a stop is a reportable result.

#### A2.7 What is frozen now

C1 → A0×3 → A5 → P → M → L → X → N, in that order. The replication criterion in step 4, the first-match criterion in step 5, the withdrawal of S, the addition of T as untested, A4's replacement brief, and the answer key. Any further change is a new registration.

#### A2.8 Objections accepted without amendment

Ten code-level objections from the review need no registration change and are carried as instrument fixes: the shipped rubric must be replaced by Amendment 1's text verbatim (the shipped version re-anchors `MATCH` to "what a reader would expect", which is the E2 failure mode); `MAX_TOKENS` must be enforced rather than recorded; the bundle's default output must not sit inside the run directory; the parent's `MODE-X` and task-outcome rubric sections must be removed from this bundle; five responses must be duplicated under fresh case ids as a scorer-reliability check; the two `echo` definitions must be aligned; C1 must run first; repeats must be interleaved; and the three guard nits (the `explanation` ban, unvalidated `B3P`, the self-satisfying assertion) must be closed.

## 10. Document history

| Date       | Change                                                                                                                                                                                                                                                                                                                                                                            |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-11 | Registered before any run. Five candidate causes, six arms, two controls, a pre-committed pattern table, six instrument changes, a layered blinding protocol with a conservative disagreement rule, seven edge cases, six stated threats, and explicit falsifiers.                                                                                                                |
| 2026-11-11 | **Amendment 1**: scoring rubric and framing taxonomy frozen before any run; eight construction gaps (IN-5…IN-12) dispositioned; the frozen-material list added.                                                                                                                                                                                                                   |
| 2026-11-11 | **Amendment 2**: §3 withdrawn after adversarial review — enumeration reproduced (18.8% / 56.8% / 4.1% / 20.4%; P(A0=3/5)=31.25%). Replaced by a six-step sequential procedure on persona-level vectors. S withdrawn, T added as untested, A4's brief replaced, placebo arm added, sealed answer key added, cost cut to 35–45 calls with stops. Ten code fixes carried separately. |
