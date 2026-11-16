# Pre-registration — the routing benchmark's closing round (E13-R)

| Field             | Value                                                                                                                                                                                                            |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What this is**  | The final round of the routing benchmark: four cells, thirty draws each, with the statistics and readings fixed before any call.                                                                                 |
| **Why it exists** | Exit E11 produced one discriminating cell resting on a single draw per prompt, and the determinism probe (E12) proved single draws are samples. This round replaces every single draw it depends on with a rate. |
| **Supersedes**    | Nothing. [`2026-11-11-b3-isolation-preregistration.md`](2026-11-11-b3-isolation-preregistration.md) is **not run** and is retained as the record of a design that the determinism probe invalidated.             |
| **Status**        | **REGISTERED, NOT RUN.** No call has been made for this design.                                                                                                                                                  |

---

## 1. What this round is allowed to assume

Three results are treated as established because they survived a manipulation-based check rather than a sample-size one:

1. **Persona framing does not change the chosen mode.** Twenty concordant picks across five directives in four cells, with persona the only variable. So persona is dropped from the design and one fixed directive is used.
2. **The model is not deterministic at temperature 0**, and the instability sits on _pick versus ask_. Measured over three repeats.
3. **Exact lexical overlap does not guarantee selection.** The brief containing the word "Explain" produced two abstentions out of three against an entry named `explain`.

Nothing else is assumed. In particular, **no rate from E11 is carried forward**, because every cell there was a single draw per prompt.

## 2. The question

> When a brief is ambiguous about what kind of answer it wants, does the **form of the entry's name** — activity or artefact — change whether the model picks it?

The hypothesis is **conditional**: the difference should appear on an ambiguous brief and not on an unambiguous one. That is a claim about the **difference of differences**, and it is the only claim this round can confirm or reject.

## 3. Design

| Cell | Brief       | Entry shown                               | Role     |
| ---- | ----------- | ----------------------------------------- | -------- |
| 1    | ambiguous   | `explain` — verb, constraint-bearing line | the lead |
| 2    | ambiguous   | `explanation` — noun, plain line          | the lead |
| 3    | unambiguous | `debug`                                   | control  |
| 4    | unambiguous | `bug-report`                              | control  |

**n = 30 independent draws per cell. 120 calls in total.**

**Fixed across all cells:** one persona directive (goal-only explorer, copied byte-for-byte from the E11 `PERSONAS` constant), the same standing request, the same picker contents apart from the one entry under test, temperature 0, the same pinned model.

**Brief texts, verbatim:**

- ambiguous — `Explain why this module is structured the way it is.`
- unambiguous — `CI is red on a test that passes locally. I have no idea why.`

**Entry pairs, verbatim:**

| Cell | slug          | name          | routing line                                                                                       |
| ---- | ------------- | ------------- | -------------------------------------------------------------------------------------------------- |
| 1    | `explain`     | `Explain`     | `Use when someone asks why code behaves as it does and the answer must cite evidence, not recall.` |
| 2    | `explanation` | `Explanation` | `Use when someone asks why the code behaves as it does and evidence must be cited.`                |
| 3    | `debug`       | `Debug`       | as in `axis-stance.roomodes`                                                                       |
| 4    | `bug-report`  | `Bug Report`  | as in `artefact.roomodes`                                                                          |

## 4. Instrument requirements

| #   | Requirement                                                                                                                                                       | Reason                                                                                   |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| R-1 | **Interleave the 120 calls across the four cells** — round-robin by draw index, not by block                                                                      | Block-by-block execution lets provider drift masquerade as a cell difference             |
| R-2 | **Count abstentions as a first-class outcome** per cell, not as a miss                                                                                            | Abstention is the quantity that has moved in every observation so far                    |
| R-3 | **Check for clustering.** Report the longest run of identical consecutive outputs within each cell and the number of exactly-duplicated transcripts beyond chance | Fisher assumes independence that caching can break; the report must show whether it held |
| R-4 | Record `finishReason`, transcript hash and usage per run                                                                                                          | Truncation and cost must be visible                                                      |
| R-5 | Labels `CELL-1` … `CELL-4` assigned by hash, mapping sealed                                                                                                       | A reader must not know which vocabulary they are scoring                                 |

## 5. Statistics — fixed now

- **Each contrast** (cell 1 vs 2; cell 3 vs 4) is tested with **Fisher's exact test, two-sided**, α = 0.05, and reported with **Wilson 95% intervals** on each proportion.
- **The hypothesis** is tested as the **difference of differences**: (p₂ − p₁) − (p₄ − p₃), reported with a **bootstrap 95% interval** (10,000 resamples over draws within cells).
- **Abstention** rates are reported per cell with Wilson intervals, and their contrast is tested the same way.
- **No multiplicity correction is claimed or needed**, because exactly **one** hypothesis is assessed — the interaction. The two Fisher contrasts are descriptive halves of it.
- If the bootstrap interval and a logistic cell × brief interaction term disagree on the sign of the interaction, **the bootstrap governs** and the disagreement is reported.

**Why two-sided.** The predicted direction comes from the same observations being tested, and the control cell shows it can vanish. A one-sided test on a data-derived direction would roughly halve the threshold and is how a programme confirms its own guess. Two-sided also makes a **reversal** visible instead of discarding it.

**Why Fisher.** Binary data, small cells, and **fixed margins by design** — exactly Fisher's assumption. Chi-square's expected counts fall below five in the smaller cells at these proportions. Fisher is conservative here (measured Type I ≈ 1.7% at n = 30), which biases toward _not_ claiming an effect.

**Why Fisher is not enough.** Fisher tests a 2×2 table and cannot test a difference of differences. Without the bootstrap step the hypothesis would remain untested.

## 6. Pre-committed readings

| Observation                                                            | Reading                                                   | Consequence                                                                                         |
| ---------------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Interaction CI excludes 0; cells 1–2 differ, cells 3–4 ≈ equal         | **Hypothesis supported**                                  | Naming rule: an entry must state what it returns whenever a brief could mean activity _or_ artefact |
| Interaction CI excludes 0; all four cells differ in the same direction | **General form effect** — the earlier exclusion was wrong | Prefer the noun form throughout                                                                     |
| Interaction CI includes 0 and cells 1–2 do not differ                  | No evidence at n = 30                                     | **Close the routing benchmark**; record the lead as noise; move to capability                       |
| Cell 1 exceeds cell 2                                                  | Direction falsified                                       | Report as a counter-result: the constraint-bearing line may be the asset                            |
| Abstention differs while selection does not                            | **Abstention is the metric**                              | Re-base the benchmark on abstention rate                                                            |
| Either control cell below 4/5 selection                                | Instrument fault                                          | **Discard the batch**; do not interpret                                                             |

No row may be read as a rate for a catalogue beyond these four cells. This round is about one entry pair per brief, not about the frames as wholes.

## 7. Cost

| Path         | Calls | Tokens                                        |
| ------------ | ----- | --------------------------------------------- |
| 4 cells × 30 | 120   | ≈270k at E11's measured 2,228 tokens per call |

Power at n = 30, two-sided Fisher: ~100% against 0.20 vs 0.80; 84% against 0.30 vs 0.70. At n = 20 the moderate contrast would be caught only 60% of the time, which is why 30 was chosen.

## 8. Threats this design does not remove

1. **Independence may not hold.** Draws from one prompt can cluster; the bootstrap resamples the very draws whose independence is in doubt, so its interval may be too narrow. R-3 exists to show whether clustering occurred, not to correct it.
2. **One model, one brief pair, one language.** No generalisation beyond `gemini-3.5-flash`, these two briefs, English.
3. **The entries differ in two ways.** Cell 1's line carries a constraint ("the answer must cite evidence, not recall") and cell 2's does not. If the interaction is supported, this round cannot say whether the **register** or the **constraint** did the work — that needs a further arm, and is explicitly out of scope.
4. **Ambiguity is my judgement, not a measurement.** The two briefs were classified by hand. If the "unambiguous" control is in fact ambiguous to the model, the interaction test loses its control.
5. **No human data.** Nothing here says anything about users.

## 9. Falsifiers of this registration

It is a bad registration if: the interleaving is not actually round-robin in the executor; abstention is recorded but not reported per cell; the control brief turns out to admit two readings on inspection; or the bootstrap is resampled at the wrong level (per cell rather than per draw).

## 10. What this may and may not conclude

**May:** whether the effect of entry form on selection differs between an ambiguous and an unambiguous brief, at n = 30 per cell, for one model and one entry pair per brief.

**May not:** which frame is better; anything about the catalogue as a whole; whether register or constraint caused the effect; any user-facing claim.

### Amendment 1 — the six-cell factorial, and a second model (2026-11-12)

Filed after the maintainer's decisions: **add a second, cross-vendor model**, and **add the two arms that separate register from constraint**. No run has executed.

#### A1.1 What changes

§3's four cells become **six**, and the ambiguous half becomes a **2×2 factorial**. All six cells run inside **one base picker** — the axis×stance list, 45 entries — with **only the target entry rewritten**. Nothing else in the list changes, so a cell difference cannot be produced by neighbour count, list length or byte density.

#### A1.2 The cells

**Ambiguous brief:** `Explain why this module is structured the way it is.`

|          | constraint line                        | plain line                             |
| -------- | -------------------------------------- | -------------------------------------- |
| **verb** | **C1** — `explain` / `Explain`         | **C3** — `explain` / `Explain`         |
| **noun** | **C2** — `explanation` / `Explanation` | **C4** — `explanation` / `Explanation` |

The two lines, normalised so the **only** difference is the constraint clause:

- constraint — `Use when someone asks why code behaves as it does and the answer must cite evidence, not recall.`
- plain — `Use when someone asks why code behaves as it does and evidence must be cited.`

**Deliberate deviation from the artefact fixture:** its line reads "why **the** code", which would add a definite article as a second difference. The plain variant here drops it, so the contrast is one clause and no article.

**Unambiguous brief:** `CI is red on a test that passes locally. I have no idea why.`

- **C5** — `debug` / `Debug`, with its native line from the axis fixture, verbatim.
- **C6** — `bug-report` / `Bug Report`, with its native line from the artefact fixture, verbatim. The builder must assert that line is byte-identical to the fixture's.

#### A1.3 Models

Two full sweeps, run as separate batches:

| Sweep        | Provider          | Model              |
| ------------ | ----------------- | ------------------ |
| Primary      | Gemini API        | `gemini-3.5-flash` |
| Cross-vendor | OpenAI-compatible | `deepseek-chat`    |

6 cells × 30 draws × 2 models = **360 calls**, ≈800k tokens at the measured 2,228 tokens per call.

#### A1.4 Statistics

**One primary claim, assessed on the cross-vendor model only:** the **conditional-ambiguity interaction** — is the verb-versus-noun effect larger on the ambiguous brief than on the unambiguous one? Estimated as a bootstrap 95% interval on (C2 − C1) − (C6 − C5), 10,000 resamples over draws within cells.

**Secondary and descriptive only:** within the ambiguous brief, the 2×2 decomposition —

| Quantity                    | Estimate                |
| --------------------------- | ----------------------- |
| register main effect        | (C2 − C1) and (C4 − C3) |
| line main effect            | (C3 − C1) and (C4 − C2) |
| register × line interaction | (C4 − C3) − (C2 − C1)   |

**Replication rule, fixed now:** the Gemini sweep is a **replication check**. A supported primary claim requires the interaction interval to exclude zero **in the DeepSeek model**. A Gemini result in the opposite direction is reported as **heterogeneity between models** — not averaged away, and not resolved by preference for either.

#### A1.5 Why this replaces the four-cell design

The two extra arms were requested to separate register from constraint. As a factorial they answer that with the same calls as two sequential arms while additionally estimating the register × line interaction, which a first-match sequence cannot.

#### A1.6 A cost this design now carries

By holding the picker constant, this round **no longer compares the axis list against the artefact list**. It measures **entry form**, not catalogue choice. The catalogue-level contrast was at ceiling in every cell but one and is not re-run; any claim about the frames as wholes is out of scope here and must come from the capability benchmark.

#### A1.7 Instrument additions

| #   | Requirement                                                                                                                                                                                                                                                                                    |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R-6 | A second runner for an OpenAI-compatible endpoint, reading `SECOND_PROVIDER_API_KEY`, `SECOND_PROVIDER_BASE_URL`, `SECOND_PROVIDER_MODEL`. The Gemini runner keeps `FRAMING_PRETEST_API_KEY`. **Neither runner may print a key**, and neither may include it in an error message or a sidecar. |
| R-7 | **Verify the DeepSeek model id before the sweep** by listing `GET /models` on that endpoint. A guessed id that 404s would read as an instrument failure after 180 calls.                                                                                                                       |
| R-8 | Record per run: model id, endpoint host (not the key), `finishReason`, transcript hash, usage.                                                                                                                                                                                                 |

#### A1.8 Unchanged

n = 30 per cell; interleaved round-robin draws; the clustering check; the **binary datum** (declared mode equals the sealed key); **no scorers**; **no peeking** until all 360 calls complete; and the six readings of §6, with C1 and C2 taking the place of the old cells 1 and 2, and C5/C6 the place of the old control pair.

### Amendment 2 — closing the independent red team (2026-11-12)

The independent review returned **AMEND BEFORE RUNNING** with three FATAL findings. All are accepted. No run has executed.

#### A2.1 n = 100 per cell, and the sweeps are staged

The 84% figure quoted in §7 was a **single-contrast** statistic. An **interaction** needs roughly three to four times the draws for the same power: at n = 30 the register × line and conditional-ambiguity interactions sit near 44% power at a Δ of .30. The design therefore moves to **100 draws per cell**.

| Stage       | Scope                                                                                        | Calls | ≈ Cost  |
| ----------- | -------------------------------------------------------------------------------------------- | ----- | ------- |
| **Stage 1** | 6 cells × 100, **Gemini only**                                                               | 600   | ≈ $1.72 |
| **Stage 2** | 6 cells × 100, DeepSeek — **only if** the Stage 1 primary interaction interval excludes zero | +600  | ≈ $1.50 |

Stage 2 is a **replication**, never a second attempt at the same claim. If Stage 1 shows nothing, there is nothing to replicate and the round closes.

#### A2.2 The control pair becomes a single-field manipulation

C5 and C6 previously used each fixture's **native** line, which differ in length, clause structure and punctuation, so (C6 − C5) was not a form-only contrast. Fixed:

> **C5** — `debug` / `Debug` with its native line, verbatim.
> **C6** — `bug-report` / `Bug Report` with **`debug`'s line verbatim** — only slug and name change.

Both halves of the interaction are now single-field manipulations, exactly as C1 → C2 already was.

#### A2.3 The second factor is renamed, because it is not "constraint versus plain"

Both routing lines impose a requirement. What differs is **mood and polarity**:

| Code                           | Line                                              | Chars | Contains                                                           |
| ------------------------------ | ------------------------------------------------- | ----- | ------------------------------------------------------------------ |
| **IN** — imperative + negation | `…and the answer must cite evidence, not recall.` | 103   | imperative requirement **and** a negation                          |
| **DC** — declarative           | `…and evidence must be cited.`                    | 77    | a requirement, stated without imperative mood and without negation |

Consequences, all binding:

1. The factor is **IN versus DC**, not constraint versus none. No claim may be phrased as "presence of a constraint".
2. **Length (26 chars) and negation travel with mood** and cannot be separated in this round. This enters §8 as an explicit threat.
3. The **register × line interaction is reported as underpowered by design** and may never be used to say whether register or mood "did the work". That requires a dedicated round.

#### A2.4 Statistics — two co-primary outcomes, and four guards

**Co-primary, Bonferroni α = 0.025 each:**

| #   | Outcome                                               | Estimand                        |
| --- | ----------------------------------------------------- | ------------------------------- |
| P1  | **hit-rate** conditional-ambiguity interaction        | (C2 − C1) − (C6 − C5)           |
| P2  | **abstention-rate** conditional-ambiguity interaction | the same contrast on abstention |

**Abstention is defined operationally:** the response **commits to no mode**, including the case where it lists candidates without selecting. Echoing a picker line counts as a declaration.

**Guard 1 — clustering has a consequence.** If the longest run of identical consecutive outputs in a cell exceeds **5**, or its exact-duplicate transcript rate exceeds **20%**, that cell is **clustered**: its interval is **not reported**, and the round's verdict for that contrast becomes _"not estimable at this n"_ rather than a number.

**Guard 2 — the bootstrap may degenerate.** Where a cell's outcome rate is at or near a boundary (for example the unambiguous control at 95% or above, where 30 identical draws arise 40% of the time), a bootstrap interval carries no information. In that case the interval is **not reported** and the contrast is reported as a difference in counts with an exact test.

**Guard 3 — replication is symmetric.** A cross-model claim requires the interval to exclude zero **with the same sign in both models**. One positive and one null, or opposite signs, is **not established across models**, with both intervals reported in full.

**Guard 4 — `finishReason` is enforced.** Any run whose reason is neither `STOP` nor `null` is `INVALID` and excluded from every cell's denominator; the excluded count is reported per cell. Recording it without acting on it repeated the previous round's FATAL and will not be repeated here.

#### A2.5 §6 is replaced — readings that are exhaustive and keyed to real cells

The previous table referred to "cells 3–4" for the control after Amendment 1 had already reassigned those names, and it converted a null into a closure. Replaced in full:

| #   | Observation                                               | Reading                                                                                                     | Consequence                                                                                             |
| --- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1   | P1 interval excludes 0, negative on the ambiguous brief   | **Conditional form effect**                                                                                 | Naming rule: state what an entry returns whenever the brief could mean activity _or_ artefact           |
| 2   | P1 ≈ 0 but **P2** interval excludes 0                     | **Abstention is the conditional signal**                                                                    | Rule targets reducing abstention, not improving hit rate                                                |
| 3   | Both P1 and P2 ≈ 0                                        | **No evidence at this power.** Report both intervals and the smallest effect the design could have detected | **Do not close the benchmark.** Absence of evidence at 80% power for Δ = .30 is not evidence of absence |
| 4   | P1 interval excludes 0 with the **opposite** sign         | **Direction falsified** — the IN line aids selection on ambiguous briefs                                    | Report as a counter-result; the imperative-negation form may be the asset                               |
| 5   | Within the 2×2, register effect large and mood effect ≈ 0 | Form of the **noun** matters                                                                                | Adopt noun-form names, with the length/negation caveat attached                                         |
| 6   | Mood effect large and register ≈ 0                        | **Mood** matters, not noun versus verb                                                                      | Rule is about imperative/declarative phrasing                                                           |
| 7   | Both main effects large, interaction non-zero             | **Not attributable at this n**                                                                              | Report both; claim neither as the cause                                                                 |
| 8   | Control cells differ in form                              | The effect is **general, not conditional**                                                                  | Prefer the noun form throughout; the conditional reading fails                                          |
| 9   | Any cell clustered per Guard 1                            | Not estimable                                                                                               | Report the clustering statistics and no interval for that cell                                          |
| 10  | `finishReason` exclusions exceed 5% in a cell             | Batch is partial                                                                                            | Report per-cell denominators; do not compare cells with differing exclusion rates                       |

#### A2.6 Bookkeeping and confounds closed

| #   | Item                                   | Resolution                                                                                                     |
| --- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| B-1 | Six cells, four labels                 | Labels `CELL-1` … `CELL-6`, generated per sweep and distinct from the E12 keys                                 |
| B-2 | `deepseek-chat` is a moving alias      | Pin a versioned id from `GET /models` before Stage 2; record the resolved id                                   |
| B-3 | Two sweeps are separate batches        | Model is confounded with time. Stage 2 is therefore a **replication only** and never a head-to-head comparison |
| B-4 | Log §11 describes the four-cell design | Superseded by this amendment; the log records the pointer                                                      |

#### A2.7 Still unaddressed

Length and negation travel with mood (A2.3); one brief pair stands for all ambiguous briefs; the control brief's unambiguity remains asserted rather than measured; and no human data exists or will.

## 11. Document history

| Date       | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-12 | Registered before any run. Four cells, n = 30, two-sided Fisher per contrast, bootstrap interaction, abstention as a first-class outcome, six pre-committed readings, five stated threats.                                                                                                                                                                                                                                                                                                      |
| 2026-11-12 | **Amendment 1**: six cells as a 2×2 factorial plus an unambiguous control pair, all within one base picker; a second cross-vendor model with a fixed replication rule; primary claim designated; two runners; model-id verification before the sweep. Cost rises from 120 to 360 calls.                                                                                                                                                                                                         |
| 2026-11-12 | **Amendment 2**: n raised to 100 per cell after the independent review showed the interaction underpowered at 30; control pair made single-field; second factor renamed IN versus DC; two co-primary outcomes at α = 0.025; four statistical guards (clustering, bootstrap degeneracy, symmetric replication, enforced `finishReason`); §6 replaced with an exhaustive ten-row table that no longer converts a null into a closure; sweeps staged with Stage 2 conditional on a Stage 1 signal. |
