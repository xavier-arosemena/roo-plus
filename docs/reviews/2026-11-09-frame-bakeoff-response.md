# Response to the bake-off red team — HARDEN accepted, with three corrections of my own

| Field                        | Value                                                                                                                                                                                     |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                   | Author response, 2026-11-09. The [red-team review](2026-11-09-frame-bakeoff-red-team.md) stands. This file records what changes, and where the review's own numbers had to be reconciled. |
| **Verdict accepted**         | **HARDEN.** The run's three claims are not equally supportable: stability must be narrowed, "neither frame is better" was never tested, and the proposed next-test criterion was broken.  |
| **Biggest consequence**      | **No frame decision can come from a naming test.** The run measured whether a model recognises the author's vocabulary, not which catalogue is better.                                    |
| **What changes in the plan** | The next test is a **behavioural outcome arm**, not more briefs; the "one catalogue, two views" hypothesis gains weight by default.                                                       |

---

## 1. The objection that reorganises everything

> _"Ownership is tested by word overlap at every stage — briefs, key, rubric and the proposed remedy — so the
> run can only confirm that its author recognises his own names."_

**Accepted, and it is correct at every one of those four stages.** The briefs contain the nouns that the
catalogue lines contain ("tests fail", "endpoint faster", "why is this module"). The correctness key was
written by the same person who wrote the lines. The rubric credits repeated words. And the proposed
stem-filter remedy would have reproduced the same bias one level up.

**Consequence, stated plainly:** the bake-off cannot choose a frame, and no future version of it will — as
long as the dependent variable is _the label a model picks_. The variable that matters is **whether the agent
placed in the chosen mode then does the job**. That is the outcome arm the review asks for, and it is now the
only test in the queue that can decide anything.

## 2. Objection-by-objection

| #   | Objection                                                                                            | Severity             | Response                                               | Effect                                                                            |
| --- | ---------------------------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------- |
| 1   | Briefs had an equivalent owner in both frames → could not discriminate                               | FATAL                | **Accepted**                                           | The run is a null by design; "both stable" is not a result about frames           |
| 2   | Author wrote briefs, key and rubric; nothing pre-registered                                          | SERIOUS              | **Accepted**                                           | Future runs pre-register briefs, key and rubric before any trial (Appendix B)     |
| 3   | n = 3, one model; 3/3 indistinguishable from determinism                                             | SERIOUS              | **Accepted** — the *p*¹⁸ bound is decisive             | "Stable" narrows to "identical three times on one model with one string"          |
| 4   | Built-in slugs (`debug`, `code`) prime the stance frame                                              | SERIOUS              | **Accepted**                                           | Any future run must mask built-in slugs or use frames with no built-in overlap    |
| 5   | The tested artefact frame no longer exists (12 lines drafted after the run)                          | SERIOUS              | **Accepted** — and caused by me                        | Recorded in §3; a re-run on the current fixture is required before any cost claim |
| 6   | Same agent ran trials and scored the rubric                                                          | NOTABLE              | **Accepted**                                           | Independent scorer in the next run                                                |
| 7   | Cost proxy ≠ production surface                                                                      | NOTABLE              | **Accepted** — recomputed +9.2%, not +19.4%            | The proxy is a proxy; production rendering is the number that matters             |
| 8   | No outcome arm                                                                                       | SERIOUS              | **Accepted**                                           | Becomes the next test (Appendix A of the review)                                  |
| 9   | Fixture fidelity: doctrine and grants are generator templates                                        | NOTABLE              | **Accepted**                                           | Fixtures are routing vehicles only; no behavioural claim may rest on them         |
| 10  | "Conclusive on stability, inconclusive on frame choice" is a failed test reported as partial success | SERIOUS              | **Accepted** — the honest sentence is **"not tested"** | Replaces the run's summary line                                                   |
| 11  | Correctness key ("intended owner") is contestable — `flake-record` is a credible B1 owner            | SERIOUS              | **Accepted**                                           | The key must be pre-registered with alternatives allowed                          |
| 12  | The proposed remedy's stem filter admits B2 and rejects B1 for the wrong slugs                       | FATAL for the remedy | **Accepted**                                           | Remedy withdrawn; the review's Appendix A replaces it                             |

## 3. Where the review's numbers had to be reconciled (corrections of mine)

| Claim                         | Run said                                    | Review said                      | Verified                          | Verdict                                                                                                        |
| ----------------------------- | ------------------------------------------- | -------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Artefact Σ`whenToUse`         | 2,736 (35 lines) → 3,674 corrected estimate | **3,836**                        | **3,836 measured** (mean 81.6)    | **Review wins.** My 3,917 summed the `~chars` _estimates_; 18 of 47 rows drift by more than 3 chars            |
| Artefact fixture hash         | `4b209f1b…`, 4,275 chars                    | `3ee56735…`, 4,649 chars on disk | Confirmed                         | **Review wins.** I re-drafted 12 lines and re-ran the generator _after_ the run, so the run's fixture is stale |
| Production rendering cost gap | 19.4%                                       | **9.2%**                         | Not independently recomputed here | Provisional — the review's method is sound; treat 9.2% as the working figure                                   |
| T-H rubric                    | stance 6/6, artefact 3/6                    | **3/3 on measured criteria**     | Arithmetic checked                | **Review wins.** The stance margin is one synonym credit, one boundary credit, one unmeasured criterion        |

**The pattern worth naming:** in every reconciliation the review's number beat mine, and in each case my
figure came from an **estimate** rather than a measurement. That is the same failure the whole programme is
trying to remove from mode budgets — and it recurred in the thing measuring them.

## 4. What the run does establish (narrowly)

1. **Both catalogues are routable**: on three easy briefs, with an equivalent owner present in each, every
   trial returned a mode and the intended one.
2. **Three identical trials agree** on one model with one fixed prompt — a fact about determinism, not about
   stability across wording.
3. **The generator is faithful**: it reproduces each catalogue's own Σ figures exactly and emits schema-valid
   `.roomodes` (45 and 47 entries).
4. **Twelve artefact lines were unwritten**, which was a real defect in that frame and is now fixed.

Nothing about frame choice. Nothing about users.

## 5. What replaces the next test

Adopted from the review's Appendix A, with the acceptance criteria pre-registered:

1. **Briefs whose wording contains no catalogue noun** — written from user transcripts or issue text, not by
   the frame's author.
2. **A cross-model panel**, so model-specific vocabulary effects cannot decide it.
3. **An independent scorer** using a key that permits alternatives ("`debug` or `flake-record` both count for
   B1").
4. **The outcome arm**: place the agent in the chosen mode and check whether the job is done — green CI, a
   measured improvement, or a cited explanation. The mode is a hypothesis; the outcome is the verdict.
5. **Pre-registration**, filed before the first trial, including what result would make the frame question
   moot.

**The result that would make the frame question moot:** if both catalogues lead to **equal outcome rates**
under (1)–(4), the labels do not matter to behaviour, and the choice should be made on **assimilation alone** —
which, given the reviewer's entry-point insight, points at **one catalogue with two views** rather than a
winner.

## 6. Why this strengthens the two-view hypothesis

The bake-off could not separate the frames on naming, the red team could not separate them on method, and
both frames routed the same three briefs correctly. Three independent attempts have now failed to make the
labels matter. That is weak evidence, but it is evidence — and it is exactly what the two-view hypothesis
predicts: artefact names as an index over stance owners, with `planner` for the exploring user.

**Next test therefore has two arms, not one:** the outcome arm (§5) to see whether labels change behaviour at
all, and a **first-run observation** to test whether users know what they want before they choose.
