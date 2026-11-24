# Does a mode line's wording, or its position, decide what an agent picks?

**A pre-registered routing benchmark on a 45-mode picker: three experiments, two follow-up rounds, one confirmatory result, and a list of findings that did not survive their own controls.**

**Keywords:** `agentic-coding` · `agentic-ide` · `coding` · `vscodium-extension` · `llm-evaluation` · `reproducibility`

| Field                        | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                   | Published research report. **Revised 2026-11-23**: the product-rendering round (R0) has run, the drift is measured, and every table has been re-derived under a new extractor. Five earlier claims are withdrawn in §10.1                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Programme**                | Modes catalogue programme, routing workstream. Followed by the capability benchmark                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Built from**               | E21b (closing round), E13-R (label form), E20 (wording, 900 calls), E20b (position, 200), E20c (slot occupant, 600), **R0 (product rendering: six batches, 1,588 calls)**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Data**                     | [E20](https://github.com/xavier-arosemena/roo-plus/tree/master/runs/e20-2026-11-17) · [E20b](https://github.com/xavier-arosemena/roo-plus/tree/master/runs/e20b-2026-11-16) · [E20c](https://github.com/xavier-arosemena/roo-plus/tree/master/runs/e20c-2026-11-17) · [closing round](https://github.com/xavier-arosemena/roo-plus/tree/master/runs/e13r-2026-11-12) · [R0 position](https://github.com/xavier-arosemena/roo-plus/tree/master/runs/r0-position-both-2026-11-20) · [R0 drift](https://github.com/xavier-arosemena/roo-plus/tree/master/runs/r0-drift-product-2026-11-20) · [R0 naming](https://github.com/xavier-arosemena/roo-plus/tree/master/runs/r0-naming-both-2026-11-20) |
| **Pre-registration**         | [E20 registration](https://github.com/xavier-arosemena/roo-plus/blob/master/docs/reviews/2026-11-13-e20-preregistration.md), Amendments 1–2; [E20c registration](https://github.com/xavier-arosemena/roo-plus/blob/master/docs/reviews/2026-11-17-e20c-preregistration.md); [R0 registration](https://github.com/xavier-arosemena/roo-plus/blob/master/docs/reviews/2026-11-20-r0-picker-format-preregistration.md)                                                                                                                                                                                                                                                                            |
| **Working record**           | [Experiment log §§23–44](https://github.com/xavier-arosemena/roo-plus/blob/master/docs/research/modes-experiment-log.md#L831) — append-only; corrections are recorded, not edited in place                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Plain-language companion** | [The day our ruler wobbled](2026-11-20-the-ruler-wobbled.md:1) — the drift story, written for readers who do not work on language models                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Cost**                     | **2,591** output-producing calls in the E20 family (≈€13.21) plus **≈€9.0** for the R0 family including one failed batch. Full accounting in Annex A and Annex J                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

---

## Abstract

**Question.** When a user's request could belong to more than one mode, does the wording of the mode lines — or their order in the list — change which one the model chooses? The literature offers no measurement of this inside a mode picker. It establishes that descriptions outrank names in tool selection, that position can dominate when names are the only difference, and that agent benchmarks routinely fail to score the turn on which asking is the correct answer.

**Method.** Three experiments on one model, one 45-entry picker and one deliberately ambiguous brief, varying one clause of the list at a time: 900 draws across three wordings, 200 across two list positions, 600 across three occupants of the last slot. Every contrast was pre-registered, interleaved, and judged twice — the second time blind, by a different model, under a rule that distinguishes _selecting_ a mode from _mentioning_ one. A follow-up round (R0, 1,588 calls) then repeated the two headline contrasts in **the rendering the product actually emits**, which the original experiments did not use, and measured the instrument itself.

**Result.** The wording finding survives everything. A line stating what the answer must **not** be committed the model to that mode **27.5 points** more often than a length-matched line stating an evidence standard (89.0% against 61.5%), the reverse of the prediction; it holds in every quarter; a second reader reproduces 99.7% of the first reading; and it is **larger in the product's own rendering (+33.3 points)**, where it also silences the clarifying question entirely — 84 commitments in 84 calls, no asks.

The position finding does **not** transfer. In the rendering the experiments used, the last entry out-committed the first by 30 points. In the rendering the product emits, the difference is **−9 points and indistinguishable from zero**, and the same line at the last slot declares 18 points _less_ than in the experiment format.

And the instrument moves: **100 identical calls with nothing varied differed by 24 points** across one run. Both headline directions survive a paired, time-aware test (238 of 288 adjacent pairs; 94 of 107), but no absolute percentage in this report should be compared across runs.

**Consequence.** The report yields a measured line-format rule (§7), a probe that costs cents (§7.3), and an explicit list of what the numbers cannot support (§6).

---

## What changed on 2026-11-23

This report was first published on 2026-11-19. Five things have changed, and four of them were found by testing our own instrument rather than the model.

1. **The experiments rendered a different picker from the one the product emits.** Fixtures used `- <slug> — <Name> — <whenToUse>`; the extension renders `* "<Name>" mode (<slug>) - <whenToUse>`, name first, under a `MODES` heading. No arm in E13, E20, E20b or E20c used the product's form. Within-run contrasts are unaffected; claims about what users see were untested until §4.8.
2. **The instrument drifts.** One hundred identical calls moved 24 points (§4.9). The p-values in Annex D assumed independent draws and are optimistic; both headline directions survive a paired test that knows about time.
3. **The wording effect is larger in the product's rendering** — and in that rendering the discriminating line stops the model asking at all (§4.10).
4. **The position effect is absent in the product's rendering** (§4.8), so the placement advice built on it is withdrawn as advice for users (§10.1).
5. **Which token sits in the quotes is a routing lever worth up to 65 points** (§4.11), which resolves the format question into a concrete rule: print the form the extension already prints.

Everything else — the 27.5-point contrast, the 30-point position difference within the experiment format, the 12 wrong commits at the last position, the 99.7% adjudication agreement, the 1-of-7 brief screening, the second model that never asks — stands as published, with the extractor re-derivation recorded in Annex J.

---

## At a glance

| Quantity                                       | Value                                        | Where |
| ---------------------------------------------- | -------------------------------------------- | ----- |
| Prohibition vs requirement, experiment form    | **89.0% vs 61.5%** (27.5 pts)                | §4.3  |
| Prohibition vs requirement, **product form**   | **1.000 vs 0.667** (+33.3 pts paired)        | §4.10 |
| Adjacent-pair test, wording contrast           | **238 of 288 pairs** (z = 11.08)             | §4.3  |
| First vs last entry, experiment form           | **15.0% vs 45.0%** (30.0 pts)                | §4.5  |
| First vs last entry, **product form**          | **35.0% vs 26.0%** (−9 pts, not significant) | §4.8  |
| Wrong commits, last entry vs first             | **12 per 100 vs 0**                          | §4.5  |
| Drift: 100 identical calls, nothing varied     | **24 points** across one run                 | §4.9  |
| Name vs slug vs slug-and-name in the quotes    | **0.780 / 0.450 / 0.130**                    | §4.11 |
| Independent agreement on adjudicated replies   | **377 of 378** (99.7%)                       | §4.7  |
| Requests screened before the effect reproduced | **1 of 7**                                   | §5.6  |

---

## How to read this report

The report is technical, but it can be read without a statistics background if you accept nine definitions. They are used exactly as written below, throughout.

| Term                 | What it means here                                                                                                                                                                                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mode**             | A named behaviour preset for the agent (its instructions, tool access and role). A user picks one; or the agent picks one from the user's request.                                                                                       |
| **Picker**           | The single block of text the model receives when it has to choose: one line per mode, about 45 of them. That is the entire input to the decision.                                                                                        |
| **Rendering**        | How a picker line is laid out. This report measures two: the **experiment form** `- <slug> — <Name> — <whenToUse>`, and the **product form** `* "<Name>" mode (<slug>) - <whenToUse>`. They are not interchangeable, and §4.8 shows why. |
| **Commit / ask**     | The model either names a mode (**commit**) or asks for the information it is missing (**ask**). These are the two outcomes this report measures — not "right" and "wrong".                                                               |
| **Appropriate**      | `commit to the expected mode` **or** `ask`. A reply that names an unrelated mode is _not_ appropriate. This definition matters in §6, because it makes 100% appropriate arithmetic rather than a result.                                 |
| **Arm**              | One condition of an experiment. Three arms means three variants, each run many times.                                                                                                                                                    |
| **Draw**             | One API call producing one reply. 900 draws means 900 calls.                                                                                                                                                                             |
| **Paired test**      | Comparing two arms call-by-call where they are adjacent in time, rather than comparing two totals. It cancels drift that moves the whole run (§4.9).                                                                                     |
| **Pre-registration** | The predictions, thresholds and statistical tests, written and frozen _before_ the data are collected. You can lose against your own registration; that is the point of it.                                                              |

Two conventions: percentages are **commit rates** unless marked otherwise, and "points" always means percentage points. **No absolute rate in this report should be compared across runs** (§4.9). Every count can be recomputed from the `results.jsonl` file in the run directory named beside it; [Appendix 1](#appendix-1--check-any-number-in-ten-minutes) maps each claim to its file.

---

## 1. The question

### 1.1 The situation

A catalogue with hundreds of installable modes has a search problem before it has a capability problem. The user must express a task; the system must map that task onto one of many candidates, several of which overlap. Two levers are available to whoever authors the catalogue:

- **Wording** — what the `whenToUse` sentence of each entry says.
- **Order** — where each entry sits in the list the model reads.

This report measures both, measures them on the case where they can matter, and then measures them again in the layout the product actually uses.

### 1.2 What the model actually receives

There are two answers to this, and the gap between them is one of the findings.

**What the extension emits.** One line per mode, name first, with the slug parenthesised:

```text
* "<name>" mode (<slug>) - <whenToUse>
```

That is [`modes.ts`](https://github.com/xavier-arosemena/roo-plus/blob/master/src/core/prompts/sections/modes.ts#L33), rendered under a `MODES` heading introduced by "These are the currently available modes:". If `whenToUse` is empty the extension substitutes the first sentence of `roleDefinition`, which is itself a reason to treat a missing `whenToUse` as a defect rather than a style choice.

**What the experiments rendered.** Every arm of E13-R, E20, E20b and E20c used a different line, slug first and unquoted, with no heading:

```text
- explain — Explain — Use when someone asks why code behaves as it does and the answer must cite evidence, not recall.
```

The archived prompt from the published E20 batch confirms it verbatim. Three things differ, not one: the template, the section framing, and **the field order**.

**Why this matters, and what it does not.** Within every experiment all arms shared one form, so the sign and size of each contrast stand as statements about that form. What was untested until R0 (§4.8) is whether any of it transfers to what the extension shows. It also means one sentence of earlier advice — "write your line like this" — was printing the product template while the measured text was the fixture template. §7 now states which is which.

### 1.3 The residual case

On a clear request the question is answered before it is asked. In the closing round, 598 of 600 replies were appropriate on an unambiguous brief: the model commits, and it commits correctly, and no wording or ordering trick changes that.

The interesting regime is therefore **a brief ambiguous enough that the model could reasonably ask instead of choosing**. That is the only regime in which a picker line has anything to decide, and it is where all three experiments live. It is also, as §5.6 shows, a much narrower regime than "vague requests" in general.

### 1.4 Three questions

1. Does the **wording** of a line change whether the model commits or asks?
2. Does the **position** of a line change it?
3. What does commitment **cost** — does the model commit to the _right_ mode, or merely to _a_ mode?

Questions 4 and 5 were added by the revision:

4. Does any of this hold in the **rendering the product emits**?
5. Is the instrument itself **stable** enough to compare anything?

---

## 2. What was already known

Four findings bear on the question, each stated with the strength of the evidence behind it. Three of the four rest on a single study; two are unpublished preprints. That matters for how this report is read: it is not a replication.

**1. Selection from a list is a metadata problem, and the metadata is unequal.** The only factor-isolated study of tool selection — five models, five tasks, metadata drawn from 367,174 tools, positions balanced, conditional logistic regression for position-adjusted effects — ranks the levers **parameter schema > description > name**, with names excluding zero in only **6 of 29** estimates (Li, Qiao & Gao, 2026; preprint, unreplicated). Our framing inherits that ranking: `whenToUse` is the description lever, and the entry name is the weakest one available.

**2. Position can dominate when names are all that differ.** The same study reports the first-listed entry chosen in **78.7–96.0%** of trials under name-only comparisons — a larger effect than any label-form effect ever measured. No factor-isolated study we could reach had varied position _inside a mode picker_ before this programme, which is why §4.5 exists and why it is reported as a difference without an identified mechanism.

**3. Benchmarks systematically fail to score abstention.** The leading agent function-calling benchmark builds turns on which asking is the _expected_ behaviour, then skips them in scoring: asking earns nothing, and guessing costs nothing on that turn. Instructing a model not to ask produces no detectable change in decision quality while raising its official score by **13.5 to 23.5 points** (Asking Earns Nothing, 2026; preprint, one benchmark, unreplicated). This is not an aside. It is the same instrument defect that manufactured this programme's own false null, described in §10.

**4. Grammatical form has guidance but no measurement.** Verb-first naming is a documented interface convention (GOV.UK Design System, n.d.; Microsoft Learn, n.d.; Kaley, n.d.), and nominalisation research explains why a "-tion" noun is ambiguous between an event and its result (Kawaletz & Plag, 2015; Barsalou et al., 2010). But **no study compares a verb-named entry with a noun-named one while holding everything else fixed**, in any domain we could reach.

**What that leaves.** The literature predicts that descriptions matter more than names, offers no measurement of line form inside a picker, and is itself unpublished in two of the four load-bearing cases. The question this report answers had no prior measurement to confirm or deny — which cuts both ways: any result here is new, and any result here is unanchored.

---

## 3. Method

### 3.1 The experiments

Each varies one thing and holds the others fixed, which is the only reason they can be read separately. The first four predate the revision; the R0 batches were run afterwards, in the product's rendering.

| Experiment                            | What varied                                                                 | What was held                                               | n               |
| ------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------- | --------------- |
| **E13-R** (closing round, label form) | the wording of the line, six cells                                          | position, brief, model                                      | 6 × 100         |
| **E20**                               | the line's requirement: artefact absent, artefact stated, artefact excluded | position (seventh entry), brief, model, **experiment form** | 100 / 400 / 400 |
| **E20b**                              | the position of `explain`: first entry vs last entry                        | the line, brief, model, experiment form                     | 100 / 100       |
| **E20c**                              | the occupant of the last entry                                              | `explain` at the seventh entry, its line, brief, model      | 200 / 200 / 200 |
| **R0-position**                       | position × rendering                                                        | line B, seventh-entry slot, brief, model                    | 400             |
| **R0-drift**                          | **nothing** — one condition, 100 identical calls                            | everything                                                  | 100             |
| **R0-attribution**                    | four rendered forms                                                         | line B, position 7, brief, model                            | 251             |
| **R0-wording**                        | line B vs C × rendering                                                     | position 7, brief, model                                    | 337             |
| **R0-slug-lead**                      | quoted token                                                                | line B, product template                                    | 200             |
| **R0-naming**                         | three namings                                                               | line B, product template                                    | 300             |

One model throughout: `gemini-3.5-flash`, `temperature: 0`, a single output cap of 4,096 tokens. One brief throughout: _"Explain why this module is structured the way it is."_

One more factor was fixed and is easy to miss: every prompt opens with a **persona sentence** — "You are exploring. Say what you want to achieve, not what you want handed back." — followed by the instruction to pick exactly one mode or say what information is missing. Both are part of the stimulus, neither varied, and the second is what makes asking an admissible reply at all. A design that omitted it would be measuring a different question.

**The wording arm (E20).** One slug (`explain`), one display name, one brief, one position (the seventh entry), three lines that differ only in what they say about evidence:

| Arm   | Line                                                 | Length | Role                                |
| ----- | ---------------------------------------------------- | ------ | ----------------------------------- |
| **A** | `Use when someone asks why code behaves as it does.` | 50 ch  | Artefact absent — **baseline only** |
| **B** | `…and the answer must cite evidence, not recall.`    | 96 ch  | Artefact **stated**                 |
| **C** | `…and the answer must not merely describe the code.` | 99 ch  | Artefact **excluded**               |

**B against C is the primary contrast, and it is length-matched**: 96 characters against 99, three apart. A against B differs by 46 characters, so it cannot separate "states an artefact" from "is longer"; it is reported as a magnitude with that confound named, and can never falsify anything on its own.

Draws were interleaved on the registered nine-call cycle `A B C B C B C B C`, repeated 100 times.

**The slot-occupant arm (E20c).** E20b moved `explain` to an extreme, which changed three things at once: its own position, its neighbours, and the position of every other mode. E20c isolates the one alternative that could have changed what an author should do — whether the **last slot attracts selection whoever occupies it**. `explain` stayed at the seventh entry with line B in all three arms; only the last entry's occupant changed, and it changed by a **swap**, so the list kept its length and no other entry moved.

| Arm   | Last entry holds              | Role                                                                     |
| ----- | ----------------------------- | ------------------------------------------------------------------------ |
| **X** | `ai-cost-engineer` (original) | Control — the same condition as E20's arm B, at a later date             |
| **Y** | `documentation`               | Non-competing filler: does any move to the end disturb `explain`?        |
| **Z** | `architecture-reviewer`       | Plausible rival: does the last slot pull selection towards its occupant? |

> **A design defect, declared up front.** E20c assumed that draws inside an arm were exchangeable — the premise interleaving is meant to secure. Arm X is not: its commit rate rises from 36.0% to 60.0% across the run while Y holds flat and Z declines (§4.6). E20c is therefore **inconclusive**, and its figures are published as counts and readings, never as effects. §4.9 explains what moved.

**The R0 batches.** After the divergence in §1.2 was found, one registration covered four contrasts in the product's rendering — position, wording, attribution and drift — and two follow-up batches closed questions the first three raised. Arms were rotated every four calls so that every comparison had adjacent-in-time partners.

### 3.2 The measurement contract

Replies are **unconstrained**. There is no `MODE:` slot, because a labelled slot presents a choice where the model might otherwise ask, and would bias the very ask rate being measured.

Extraction is a pinned parser. Every reply it cannot resolve goes to **hand adjudication, blind**: the packet carries a hashed id, the brief and the reply — no arm, no draw number, no timestamp — and the id-to-run mapping stays outside the packet until every judgement is recorded. Judgements are `DECLARATION`, `ASK` or `OTHER`.

The tie-break was fixed in advance, and it failed. The rule "a declaration marker anywhere makes the reply a `DECLARATION`, even if the reply asks afterwards" was written to protect a real case: a reply that commits and then asks for more. On this corpus it swallowed almost everything, because an ask on an ambiguous brief typically _enumerates_ candidate modes ("whether you want `explain`, `architecture-reviewer` or `codebase-cartographer`"). The rule was replaced — before any count was published — by one that separates **selection** from **mention** (§4.7).

This is the single most consequential methodological fact in the report: the headline number is not a property of the replies, it is a property of the replies **under a stated construct**. §4.7 and §5.5 give the alternative construct's number alongside.

The extractor itself has since moved from v3 to v4 (Annex J). v3 had a rule that committed when exactly one slug appeared anywhere in a reply; `code` is one of the 45 slugs, so every reply mentioning "the source code" gave it two candidates and fell silent. v4 anchors every rule on the picker's own vocabulary and reads the label forms v3 missed. **Every batch in this report was re-derived under v4 at zero cost**, raw records were never rewritten, and 75 verdicts changed — none of them from a declaration to an ask.

### 3.3 Decision rules, fixed before the data

- Exact Fisher tests on pre-declared contrasts, Holm-corrected within each experiment.
- A difference of **≥ 20 points** with adjusted _p_ < .025 counts as an effect.
- **< 10 points** counts as no detectable effect.
- The band between them is recorded as **indecisive** and not re-run without a new registration.
- Every arm is tested for **stationarity** (drift within the run) before its contrast is read.

Two rules were added after the drift was measured, and they change which statistic is primary:

- **M-15 — stationarity is tested on the contrast, not on the arm.** A balanced rotation makes each pair adjacent in time, so a paired comparison cancels drift that arm-level rates display. Voiding a batch because one arm's level moved is the over-correction §4.6 documents.
- **M-16 — publish arm rates _and_ the paired sign test, and never compare a level across runs.**

The Fisher intervals in Annex D are retained for traceability and are **optimistic**: they assume independent draws, and §4.9 shows the draws are not independent in time. The paired sign test is the primary statistic where both exist.

### 3.4 Instrument proof

| Check                                    | Result                                                                                          |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Mid-run gate at 90 draws                 | exclusion **0.0%** in all three arms; longest identical verbatim run **1** (threshold 5)        |
| Excluded records, published batches      | **0 of 1,700**; every record `finishReason: STOP`                                               |
| Verbatim clustering                      | longest identical-transcript run **1** in all five E20/E20b arms; 879/900 and 199/200 distinct  |
| E20c verbatim clustering                 | **192–198 of 200** distinct transcripts per arm; no arm clusters                                |
| Interleaving                             | **899** transitions across 900 calls, **199** across 200, **599** across 600; max concurrency 1 |
| Token cap / model                        | one value, 4,096, throughout; `gemini-3.5-flash`; `temperature: 0`                              |
| Runs test on each arm's outcome sequence | B _p_ = .79 · A _p_ = .69 · C _p_ = .67 · first _p_ = .24 · last _p_ = .76                      |
| Extractor validation                     | 16 of 16 replaying a hand-labelled 20-reply wall, with and without the vocabulary               |

Two instrument outputs are deliberately **not** results. The 60-draw E20c gate produced commit rates of X 65.0%, Y 45.0%, Z 65.0%, which inverts two arms relative to the full sweep — the gate exists to check exclusion and clustering only, and its rates are 20-draw noise (Annex H). And 21 of the 600 E20c replies are a bare slug, which the pinned extractor could not resolve at all; they sit inside the 241 replies adjudicated blind in §4.6.

One further instrument output must be declared: **a batch-runner defect** recorded the R0 attribution batch's failed calls as rows until it was fixed. One call of 400 in the position batch failed and was scored anyway; it is excluded, and the count that follows is 99 in that arm.

### 3.5 What the design cannot do

The ruler is stated before the run, not in a caveat after it:

- E20 resolves about **10 points** at n = 400 per arm, and about **19.8 points** at n = 100.
- E20c's registration states **14.0 points** at 200 draws per arm.
- The **batch-to-batch** ruler is coarser than any of these, and the drift measurement in §4.9 puts it at **tens of points**. No claim in this report crosses batches.
- The paired tests in §4.3 and §4.5 compare adjacent calls, which are not strictly independent: four calls sit inside one rotation cycle, so their errors are correlated and the _p_-values are optimistic by an unquantified amount. The direction and the size are the findings; the _p_-values are supporting evidence.

---

## 4. Results

### 4.1 The extractor is not enough to count

Of 378 replies reaching hand adjudication, **27 were commitments the pinned extractor missed** (7.1%). The failure modes are mundane, and worth recording because they define what a v3 extractor must accept:

- a bare slug with no decoration — `explain`, or `` `explain` `` alone;
- a bold span wrapping label _and_ slug — `**mode: explain**` — which never matches `**Mode:**`;
- an unbolded label — `Selected mode: explain`;
- a slug followed by a paragraph of goal prose.

All but one named `explain`; the exception named `architecture-reviewer` outright. Adjudication added declarations in every E20 arm — +2 in A, +9 in B and +12 in C, two to three points each.

| Arm         | Mechanical only   | After adjudication              |
| ----------- | ----------------- | ------------------------------- |
| B           | 237 / 400 = 59.3% | **246 / 400 = 61.5%**           |
| A           | 73 / 100 = 73.0%  | **75 / 100 = 75.0%**            |
| C           | 344 / 400 = 86.0% | **356 / 400 = 89.0%**           |
| first entry | 15 / 100 = 15.0%  | **15 / 100 = 15.0%**            |
| last entry  | 42 / 100 = 42.0%  | **45 / 100 = 45.0%** (12 wrong) |

The last row is the one that requires care, and it is the one where a public number was almost wrong. The arm produced **53 mechanical declarations**, but only 42 name `explain`; the other 11 name a different mode and are the wrong commits the harm measure depends on. Three of the four adjudicated declarations name `explain`; the fourth _is_ the bare slug `architecture-reviewer`. So the declared-key total is 42 + 3 = **45**, the wrong-commit total is 11 + 1 = **12**, and the asks are **43** — which sums to 100, as it must. A published interim figure of 46.0% counted the fourth declaration as a commitment to the key; §10.3 records the reconciliation.

### 4.2 The extractor moved, and the numbers barely did

v4 re-read every stored transcript across seven batches — 1,840 usable rows — and changed 75 verdicts. The effect on this report's tables is small and worth stating exactly, because a reader comparing this revision to the last should see where the decimal places moved.

| Batch       | Arm                          | As first published    | Re-derived (v4)   |
| ----------- | ---------------------------- | --------------------- | ----------------- |
| position    | fixture first / last         | 0.210 / 0.440         | 0.210 / 0.440     |
| position    | product first / last         | 0.340 / 0.250         | **0.350 / 0.260** |
| attribution | fixture / fixture-name-first | 0.500 / 0.452         | 0.500 / **0.468** |
| attribution | product-slug-first / product | 0.190 / 0.714         | 0.190 / **0.778** |
| wording     | fixture B / C                | 0.647 / 0.869         | **0.659** / 0.869 |
| wording     | product B / C                | 0.667 / 0.988         | 0.667 / **1.000** |
| slug-lead   | slug-only / slug-and-name    | 0.440 / 0.190         | **0.450** / 0.190 |
| naming      | name / slug / slug-and-name  | 0.780 / 0.450 / 0.130 | unchanged         |

**Nothing reverses, and one number reaches a ceiling.** Every contrast keeps its sign and size to within a couple of points. Line C in the product form became 84 declarations in 84 calls — no asks, and nothing unresolved — which turns §4.10's reading from "nearly exact" into exact.

The lesson outlives the round: batches had been scored by different extractor versions and nothing on the record said which. The runner now stamps an `extractor` field on every row.

### 4.3 The primary contrast: a prohibition out-commits a requirement

**B 61.5% against C 89.0% — a difference of 27.5 points, C ahead** (95% CI 21.7–33.1 points; exact two-sided _p_ = 7.1 × 10⁻²⁰). Under the time-aware statistic the margin is larger: **C wins 238 of 288 adjacent pairs** (z = 11.08). Re-classified under the R0 extractor, the two arms read 61.8% and 88.2% — within a point of the registered figures, which is what a consistent extractor should do.

The registered reading for "≥ 20 points" was written as _"naming what the answer must contain moves commitment more than naming what it must avoid"_. The observation is the mirror image: **the line that said what the answer must avoid committed 27.5 points more often.** The registration therefore has no reading for this result. That is a defect in the registration (§10.2), not a defect in the measurement, and it is the reason this section is written as "confirmed effect, refuted hypothesis" rather than as a confirmation.

_Effect is falsified if_ a length-matched line naming a required artefact, rather than a quality standard, reverses the gap.

And it holds in the product's rendering, where it is larger: §4.10.

### 4.4 The secondary contrast, reported as magnitude only

**A 75.0% against B 61.5% — 13.5 points, A ahead** (95% CI 3.1–22.4; _p_ = .0141). The shorter line is _not_ the weaker one. But A and B differ in length by 46 characters, so this is descriptive and length-confounded. It is recorded because omitting it would look like concealment, not because it establishes that short lines work.

### 4.5 Position: 15.0% against 45.0%, in the experiment's format

**First entry 15.0% against last entry 45.0% — 30.0 points, last ahead** (95% CI 17.5–41.3; exact _p_ = 5.6 × 10⁻⁶). The paired test gives 94 of 107 adjacent pairs (z = 7.83), so the direction is not drift.

Two details matter more than the headline:

- **Both arms stayed appropriate at or near saturation** — first 100%, last 88%. The model almost never chose an unrelated mode; it either committed or asked.
- **All the harm is in the last position: 12 wrong commits per 100 against 0 per 100** (exact _p_ = 3.4 × 10⁻⁴). Twelve replies named some other mode outright rather than asking.

**The paired test carries a caveat that must travel with it.** Re-classified under the R0 extractor, the first arm reconciles (16% against 15%) and the second does not (57% against 45%). So the paired result establishes that the contrast is not an artefact of time-position; it does not replace the registered 45.0%, and anyone quoting z = 7.83 should quote this sentence with it.

And the effect does not exist in the product's rendering: §4.8.

### 4.6 The slot-occupant arm: a count, not an effect

`explain` sat at the seventh entry in all three arms with the same line. Only the last entry's occupant changed.

| Arm   | Last entry holds                | `explain` declared (mechanical) | Adjudicated | Corrected             | Extractor-undetermined |
| ----- | ------------------------------- | ------------------------------- | ----------- | --------------------- | ---------------------- |
| **X** | `ai-cost-engineer` (original)   | 94 / 200 = 47.0%                | +4          | **98 / 200 = 49.0%**  | 105                    |
| **Y** | `documentation` (non-competing) | 120 / 200 = 60.0%               | +11         | **131 / 200 = 65.5%** | 80                     |
| **Z** | `architecture-reviewer` (rival) | 143 / 200 = 71.5%               | +9          | **152 / 200 = 76.0%** | 56                     |

The registered readings, and what this run can say about them:

1. **Rival capture (Z against X): 1 against 1.** The count sits on a metric with 56 of Z's 200 replies and 105 of X's unresolved, so it is a bound, not a zero. The registered reading for a "≤ 10 points" difference is **not applied** — not because the count contradicts it, but because the run it comes from is not stable (§4.9) — and its opposite is not claimed either.
2. **Explain shift (Y against X): +13.0 points mechanical, +16.5 corrected.** Both sit inside the registered 10–20 indecisive band, which would make the observation indecisive; because the arms are not stationary, not even that verdict is applied.
3. **Unregistered: Z against X on `explain`, +24.5 mechanical, +27.0 corrected.** No reading exists for it and none is manufactured here. §4.9 shows the figure is the average of a decaying contrast (+40, +36, +16, +6 points), so it is not a magnitude to quote either.

The counts are readings rather than bounds; what they still cannot be used for is a **contrast**, because the arms are not stationary.

### 4.7 Independent corroboration, and what it says about the construct

Every count above rests on replies the mechanical extractor could not classify. Those replies were judged twice: once by the analyst, and once by a **different model reading a blind packet** carrying no arm, draw or time.

Under the rule registered for the second pass, the two readings agreed on **11.1%** of 378 replies. Reading twelve disagreements in full showed the first pass right in all twelve: each was an ask that enumerated candidate modes, and the registered tie-break counted any named mode as a declaration. Under a rule that distinguishes **selection from mention**, agreement is **99.7% — 377 of 378**.

Two things follow. The adjudicated counts stand, and are now corroborated by an independent reader rather than merely asserted. And the result is **construct-dependent**, in a way that belongs beside every number: scored on a mention-anywhere construct, the same replies give B 98.0% and C 97.75% — a gap of **0.25 points** instead of 27.5. The effect is entirely a difference in _whether the reply commits_; it vanishes if "mentions a candidate" is scored as committing.

### 4.8 Position in the rendering the product emits: no effect

The same contrast, run in both renderings inside one batch of 400 calls, arms rotated every four calls:

| Arm                    | Declarations | Rate  | Paired against its partner           |
| ---------------------- | ------------ | ----- | ------------------------------------ |
| experiment form, first | 21 / 99      | 0.212 | last − first: **+23.2 pts** (z 3.29) |
| experiment form, last  | 44 / 100     | 0.440 |                                      |
| product form, first    | 35 / 100     | 0.350 | last − first: **−9.0 pts** (z −1.37) |
| product form, last     | 26 / 100     | 0.260 |                                      |

**The experiment form's advantage replicates** (+23.2 against E20b's +30, and the same direction and rough size). **The product form shows nothing** — a 9-point difference in the _opposite_ direction, not distinguishable from zero on 17 up against 26 down.

**And the format itself matters at the last slot: −18.2 points** (z −2.65). The same line, in the same position, declared 18 points less often in the product's rendering than in the experiment's. That is not a position effect; it is a rendering effect, and it is the reason the placement advice in the previous revision is withdrawn.

**Reading the arm rates alone would have thrown this batch away.** The fixture-first arm fell from 32% to 8% inside the run, which under the earlier rule (test the arm) voids the experiment. Testing the contrast instead shows all four comparisons keeping sign and magnitude across the two halves — the arms oscillate, which is not what a shared drift looks like. That distinction is M-15 (§4.9).

**A fourth mechanism candidate enters the list.** E20b moved `explain`'s position and also changed which token the model read first, because the experiment template led with the slug. In the product template the name leads. So the position result is confounded, in the experiment format, with a _first-token_ effect, and §4.11 shows the token matters enormously. We cannot separate them with the data in hand.

### 4.9 The ruler moves: nothing varied, 24 points

One condition, one hundred identical calls — same mode, same position, same line, same format, same brief, same model, same settings. Nothing was varied.

| Quarter | Declarations | Rate     |
| ------- | ------------ | -------- |
| 1       | 10 / 25      | **0.40** |
| 2       | 7 / 25       | 0.28     |
| 3       | 4 / 25       | **0.16** |
| 4       | 6 / 25       | 0.24     |

**A 24-point range with nothing varied.** This is the size of the confound every multi-arm batch in this programme has been carrying. It explains E20c's ramping control (§4.6), the R0 fixture-first arm's fall (§4.8), and the 47.0-versus-59.3 cross-batch gap that the "no cross-batch contrasts" rule was written from.

**The contrast does not use arm levels; it uses differences, and the difference cancels the drift.** With a balanced rotation the two members of each comparison sit about forty seconds apart, so pairing them gives a sign test that does not depend on the level being stable. Applied to the replies already on disk, at no cost: the wording contrast wins **238 of 288** adjacent pairs, the position contrast **94 of 107**. Both headline directions survive a statistic that knows about time. The Fisher _p_-values in Annex D were optimistic in their assumptions; their conclusions were not.

**What follows for any reader.** Levels are not comparable across runs: "47.0% here, 59.3% there" describes two afternoons, not two conditions. Absolute percentages in this report are one batch's level and should be quoted with their batch, or not at all.

Three documented provider behaviours fit the size and shape of this, and none can be separated from the client side: non-determinism at a fixed seed, implicit context caching with variable hit rates, and batch-dependent computation. Our measurement is one model on one provider; whether another moves as much is untested. The plain-language account is [the companion note](2026-11-20-the-ruler-wobbled.md:1).

### 4.10 The wording effect in the product's rendering: larger, and it silences the question

Line B against line C, position held at the seventh entry, both renderings, one interleaved batch of 337 calls.

| Arm                      | Rate      | Asks  |
| ------------------------ | --------- | ----- |
| experiment form, line B  | 0.659     | 27    |
| experiment form, line C  | 0.869     | 9     |
| product form, line B     | 0.667     | 25    |
| **product form, line C** | **1.000** | **0** |

Paired within cycle: **C − B is +21.4 points in the experiment form** (18 up, 5 down, z 3.40) and **+33.3 points in the product form** (28 up, 0 down, z 5.29). The effect survives the change of rendering and grows in it. The format alone does nothing for line B: **+1.2 points**, 19 up against 18 down. An earlier pass reported +2.4 for that comparison; the re-derivation under extractor v4 moved one reply (19 up, 17 down became 19 up, 18 down), and the conclusion — indistinguishable from zero — is the same under either reading.

**And in the product's rendering, the discriminating line removes the alternative.** Line C committed **84 times in 84 calls — no questions, nothing unresolved** — while line B asked 25 times in the same batch, in the same form. On an ambiguous brief, asking is the _appropriate_ behaviour by this report's own definition. So the strongest wording lever measured in the whole programme is also the one that suppresses the behaviour the system needs when the user has not said enough.

That is not a reason to discard it; it is a reason to pair it with an ask rule. A catalogue needs both: a line that discriminates among neighbours, and a route back to the user when the line genuinely cannot decide.

### 4.11 Which token sits in the quotes decides the answer

Three renderings of the same `explain` line and position, in one interleaved batch of 300 calls, 100 per arm, all in the product template:

| Rendered as    | `explain`'s line                      | Rate      | Asks |
| -------------- | ------------------------------------- | --------- | ---- |
| **name-first** | `* "Explain" mode (explain) - <line>` | **0.780** | 22   |
| slug-only      | `* "explain" mode - <line>`           | 0.450     | 55   |
| slug-and-name  | `* "explain" mode (Explain) - <line>` | 0.130     | 85   |

Paired within cycle: **name-first beats slug-only by 33.0 points of rate** (45 up, 12 down, z 4.37), beats slug-and-name by **65.0** (71 to 6, z 7.41), and slug-only beats slug-and-name by **32.0** (38 to 6, z 4.82). Those nets are also the unpaired rate differences, so the two routes agree — the check this programme's own counting rule demands.

**The lever is the quoted slot, not the presence of the name.** `slug-and-name` prints the display name too, in the parentheses, and is the worst of the three. So "printing a human-readable name helps" is false as stated. What separates the arms is _which token is inside the quotes_.

**A related arm narrows the mechanism.** In the attribution batch, field order inside the _experiment_ template was worth 3.2 points (17 up, 15 down — indistinguishable from zero), while field order inside the _product_ template was worth 58 points. The same field, in the same position, is inert in one layout and decisive in the other. And one arm of that batch — `* "slug" mode (Name)` — collapsed to 0.190 with 51 asks in 63; a follow-up arm removing the parenthetical recovered 26 of those points, which is how we know the collapse was the malformed parenthetical rather than the slug leading the line.

**The practical rule that comes out of it** is therefore not "prefer names to slugs" but "print the form the extension already prints, and keep the slug in the parenthesis". A slug-only line saves 761 characters across 45 modes and costs 33 points of commitment: a trade, not a saving.

### 4.12 `temperature: 0` is not reproducibility

The aborted first E20 attempt drew the **same prompts** as the published batch before it stopped. Comparing draw by draw:

| Arm | Overlapping draws | Same commit/ask outcome | Chance-level agreement | Identical transcript |
| --- | ----------------- | ----------------------- | ---------------------- | -------------------- |
| B   | 329               | 53.2%                   | 51.7%                  | **0.0%**             |
| A   | 83                | 54.2%                   | 55.3%                  | 0.0%                 |
| C   | 329               | 71.1%                   | 73.5%                  | 0.0%                 |

Agreement sits **at chance**, and not one transcript repeats. Two consequences. Each call is an _independent sample_, not a replicate — so pooling batches would legitimately add information (it was declined, Annex A). And a single request is genuinely unstable: a mode that committed once may ask next time. §4.9 is the same finding at the level of a run rather than a call.

---

## 5. Interpretation

### 5.1 Why a prohibition might beat a requirement

E20 targeted the 10–20 point band the earlier design could not resolve. At 400 draws per arm that band is inside the ruler, so a difference there counts as an effect rather than an indecisive reading. E20 found one at 27.5 points, with a confidence interval that excludes any reading below 21 points, and §4.10 found a larger one in the product's rendering.

The most parsimonious description: a line that says _"not merely describe the code"_ reads as a **prohibition to be complied with**, and a prohibition is a stronger instruction than a requirement to include something. This is consistent with the negotiation behaviour seen in adjudication — the replies that ask are overwhelmingly replies that cannot decide _between_ modes, so a prohibition narrows the field, while a requirement leaves the field as it was.

It is a hypothesis, not a mechanism established here. Two things would break it: a length-matched line naming a _required artefact_ that reverses the gap, and a line whose exclusion is satisfied by a neighbouring mode (in which case the clause narrows nothing). The second is now testable in principle, because §4.11 shows the rendering decides how much weight the sentence carries at all.

### 5.2 Within-run is necessary, not sufficient — and pairs are better than runs

Arm X of E20c is the **same condition** as E20's arm B: identical picker, line, brief, model and index, byte-identical prompts. It scored **47.0% against 59.3% — 12.3 points apart**. That is a batch-to-batch difference on an identical condition, and it is the observation from which the rule _a contrast is within-run, or it is not a contrast_ was written.

§4.9 then showed that even a within-run contrast computed on arm totals is exposed, because levels move 24 points inside a run. The repair is not a bigger sample; it is a different statistic. Pairing adjacent calls in a balanced rotation cancels the movement, which is why the two headline results survive and why the arm-level test alone was too blunt: it voided a batch (§4.8) whose contrasts were stationary.

| Experiment  | Arm           | Declarations per block       | Shape                            |
| ----------- | ------------- | ---------------------------- | -------------------------------- |
| E20         | B             | 61 / 58 / 63 / 55 per 100    | flat                             |
| E20         | C             | 83 / 87 / 84 / 90 per 100    | flat, drifting up                |
| E20         | A             | 17 / 17 / 23 / 16 per 25     | flat                             |
| E20b        | first entry   | 2 / 3 / 6 / 4 per 25         | flat and low                     |
| E20b        | last entry    | 13 / 8 / 12 / 9 per 25       | flat and higher                  |
| E20c        | **X**         | **18 / 20 / 27 / 30 per 50** | **ramp, 36% → 60%, CA z = 2.72** |
| E20c        | Y             | 32 / 31 / 27 / 30 per 50     | flat                             |
| E20c        | Z             | 38 / 37 / 35 / 34 per 50     | declining                        |
| R0-position | fixture first | 0.32 / 0.32 / 0.13 / 0.08    | **falls, range 0.24**            |
| R0-drift    | one condition | 0.40 / 0.28 / 0.16 / 0.24    | **moves, nothing varied**        |

Contrasts per block, in points:

| Contrast          | Block 1 | Block 2 | Block 3 | Block 4 |
| ----------------- | ------- | ------- | ------- | ------- |
| E20 B − C         | −22     | −29     | −21     | −35     |
| E20b last − first | +44     | +20     | +24     | +20     |
| E20c Y − X        | +28     | +24     | 0       | 0       |
| E20c Z − X        | +40     | +36     | +16     | +6      |

**The same test, three different verdicts, and the difference is the point.** E20's B − C gap holds its sign in every quarter and ranges 21–35 points; E20b's first-versus-last gap is positive in every quarter. Both survive. E20c's two contrasts decay to 0 and +6 points, so neither does: averaging them produces numbers dominated by the first hundred calls.

### 5.3 The re-run: the ramp did not reproduce, the level moved

Arm X was re-run alone, 200 calls, identical prompts — all 200 prompt hashes match the originals.

| Run      | Block 1  | 2        | 3        | 4        | Total | Trend z   |
| -------- | -------- | -------- | -------- | -------- | ----- | --------- |
| Original | 18 (36%) | 19 (38%) | 27 (54%) | 30 (60%) | 47.0% | **+2.72** |
| Re-run   | 27 (54%) | 31 (62%) | 19 (38%) | 31 (62%) | 54.0% | **−0.06** |

The ramp was **not a stable property of the arm**. What did reproduce is the instability, in a different shape: the same condition scored 47.0% and 54.0% in two runs. That is the same order as the 24-point range measured with nothing varied (§4.9), and it is why M-15 replaced the arm-level test as the deciding one.

### 5.4 The second model: the channel is a property of the model

A replication was attempted on a second provider and stopped after 109 of 800 calls, for a reason worth stating plainly: **the second model never asked.** In 91 productive replies it returned one of five strings, all bare mode names, with zero questions.

| Arm               | n   | Declared `explain` | Other | Asked |
| ----------------- | --- | ------------------ | ----- | ----- |
| artefact stated   | 43  | 41 (95.3%)         | 2     | **0** |
| artefact excluded | 48  | 48 (100%)          | 0     | **0** |

Zero asks in 91 replies puts the 95% upper bound on that model's ask rate at **≈3.2%**. For the model this report uses, the ask rate over the same brief was 11–39% on E20's three lines and 43–85% on E20b's two positions.

The effect measured here is a difference in _whether the reply commits_, and a model that always commits has no room for it. Two things follow: the result is a statement about one model's ask threshold, not about routing in general; and mode choice on the second model was near-deterministic and independent of the line.

There is a corollary that the revision makes sharper: **on a model that never asks, a line that maximises commitment cannot be distinguished from a line that routes well** (§4.10). The recommendation to keep an ask route is therefore also an argument for measuring on models that can use one.

### 5.5 The construct decides the number

| Construct                                      | B     | C      | Gap          |
| ---------------------------------------------- | ----- | ------ | ------------ |
| **Selection** (names a mode as the one to use) | 61.5% | 89.0%  | **27.5 pts** |
| **Mention-anywhere** (any mode name at all)    | 98.0% | 97.75% | 0.25 pts     |

Neither rule is wrong. They answer different questions, and the difference between them is the finding: on an ambiguous brief, both lines cause the model to _talk about_ the same modes almost always, and the two lines differ in whether it **commits**. Any menu-effect claim must name its construct in the same sentence as its number.

The revision adds a ceiling to this table. In the product's rendering, line C reached 1.000 — every reply committed — so the construct gap cannot widen further there, and the natural question changes from "which line wins" to "what does the system do when the line settles the matter".

### 5.6 Where the effect lives: ownership ambiguity

Six further briefs were screened for the two conditions the effect needs — a reply that sometimes asks, and `explain` as a plausible owner. **None passed both.** The failures came in two kinds, and the kinds are the useful part:

- **Mechanism questions close the ask channel.** "Why does this worker retry three times", "Why does the cache expire after sixty seconds", "Why does this function allocate a new list on every call" — thirty of thirty committed. Ownership is obvious, only the code is missing, and the code is requested _after_ the line has decided.
- **Change-friction questions open the channel but not for `explain`.** "Why is this module so hard to change?" produced genuine candidate lists and five asks in ten — exactly the channel E20 needs — yet every selection was `architecture-reviewer`, and `explain` was the candidate the replies dropped.

Seven briefs have now been screened across three attempts. Exactly one opens both conditions: E20's own brief, _"Explain why this module is structured the way it is."_ That is a **structural** question, where `explain` is the preferred owner but not the exclusive one.

The consequence is a narrowing, not a caveat: the 27.5 points are established on **one brief out of seven**, and any claim beyond that brief is an extrapolation. The population in which the effect applies is _requests whose mode ownership is ambiguous_ — still the population that matters, because it is where a catalogue has to help.

---

## 6. What this does not mean

- **Not a confirmation of the prediction.** The contrast is confirmatory — pre-declared, length-matched, clear of the ≥ 20-point threshold, same sign in all four quarters — and the prediction it was built to test is refuted. What is confirmed is that the line form matters; what is not confirmed is the mechanism the registration named.
- **Not a null result either.** The effect is measured, well outside the ruler, stable across quarters, and reproduced in a second rendering.
- **Not a replication by the neighbouring arm.** A is artefact-_absent_, not artefact-_excluded_; its contrast against B is 46 characters confounded, and the registration says it "can never falsify anything on its own".
- **Not about humans.** Every inference is about one model on one brief. No claim is made about human selection from the same picker.
- **Not about interaction.** Position and wording were not crossed; nothing here says what their combination does.
- **Not a transferable placement rule.** The 30-point first-versus-last difference is real in the rendering the experiments used and **absent** in the rendering the product emits (§4.8). Placement advice for users is withdrawn; what remains is a warning that placement is not a free lever.
- **Not a general statement across renderings.** Any claim here is about a specific line layout. The wording result was measured in both and grew; the position result was measured in both and vanished. Neither can be extended to a third layout without a new run.
- **Not a fix for a vague brief.** Every arm in E20 stayed at 100% "appropriate", which is a definition rather than a result: "appropriate" is `declared ∨ asked`, so with no wrong commits in E20 the figure is arithmetic.
- **Not resolution at 10 points.** Effects below ~10 points remain out of reach at n = 400 and below ~19.8 points at n = 100; drift is tens of points, so no claim may cross batches at all.
- **Not a clean instrument record.** Records in the E20 family stamp parser version 1 while the analysis called version 2, so that pin is not evidenced in the data. The R0 batches fixed this by stamping an extractor field on every row, and every batch has since been re-derived (§4.2).
- **Not one model's general behaviour.** Every number here is one model (`gemini-3.5-flash`) and one brief. A second model is the standing requirement this work creates, not a result it contains.
- **Not a benchmark release.** The fixture is burned by publication (§Appendix 1), and no held-out set exists.

---

## 7. What to do with it

Every item below rests on a number measured within one run. Items that rested on a withdrawn reading were **deleted rather than softened**.

### 7.1 If you are choosing a mode

**The brief matters more than the catalogue.** A request that says what is wanted gets the right mode almost every time; nothing in this report makes an unclear brief as good as a clear one. Everything below applies only to the ambiguous case.

1. **Name the outcome you want in the request.** Two renderings of the same list committed at 35% and 26% on the same ambiguous request; the picker is doing some of the choosing for you. "Find the cause and prove it" versus "map the dependencies" is a stronger signal than the mode you clicked.
2. **A clarifying question is not a failure.** Across 900 calls of the E20 wording arms the model never selected an unrelated mode; when it did not commit, it asked. Asking costs a turn; the costly error is the wrong commit, and §4.5 puts that at 12 per 100 at the end of the list.
3. **Do not expect the same answer twice.** Identical prompts agree only at chance across dispatches, and one unchanged condition moved 24 points inside a single run. A retry is a fresh sample, not a repeat.

### 7.2 If you are writing `whenToUse` lines

1. **Make lines mutually exclusive, not merely descriptive.** The ask regime is dominated by candidate lists: replies that ask are replies that cannot separate `explain`, `architecture-reviewer`, `codebase-cartographer` and `decision-record`.
2. **Do not expect "must include X" to increase commitment.** The line naming what the answer must avoid out-committed the length-matched line naming what it must contain, by 27.5 points in the experiment form and 33.3 in the product's. One brief, one model, one position: a hypothesis with a strong number behind it, not a rule.
3. **Write it in the product's rendering and keep the name in the quotes.** Name-first with the slug parenthesised declared 27 points more often than the experiment's form in the same batch, and the quoted token is worth up to 65 points (§4.11). Do not move the budget from the line to the parenthesis: the 761 characters a slug-only line saves cost 33 points of commitment.
4. **Pair a discriminating clause with an ask route.** In the product's rendering the best-performing line committed in 84 of 84 calls and asked nothing. For an ambiguous request that is the wrong failure mode to design in, however good the commitment number looks.
5. **Do not weigh placement.** Inside one run, at the end of the list, commitment rose 30 points and wrong commits rose 12 — and in the product's rendering the rise disappeared. There is no measured placement rule to follow.

### 7.3 Auditing a mode line, or a class of requests

Two probes exist and they cost cents.

**The ask-rate probe.** Feed a set of real requests to the picker and record whether the reply commits or asks. A high ask rate on a request class means the catalogue cannot decide from it — actionable for the lines, the documentation and onboarding, and re-running the probe after a catalogue change shows whether it helped. Five constraints make it honest: pin the model and report it; use ownership-ambiguous requests; state the construct; repeat on a separate occasion before believing a difference; and keep the reply text, because re-scoring under a better rule is the most common repair required.

**The contrast probe.** If you are comparing two lines, two positions or two renderings, **do not compare two totals collected at different times**. Rotate the arms every few calls and compare each arm against its immediate neighbour. That is what turned an unreadable 400-call batch into a clear answer in §4.8, and it is the single most transferable lesson in this report.

A twenty-call screen is enough to reject a candidate request, model or line before a full sweep. The absence of such a screen is what allowed a second-model replication to discover its own impossibility at call 109.

---

## 8. A template for one mode line

Each mode reaches the model as one line, assembled from three fields — the display **name**, the **slug** the reply is expected to return, and the **`whenToUse`** sentence:

```
* "<name>" mode (<slug>) - <whenToUse>
```

**This is the product's template, and it is now also a measured one**: §4.10 and §4.11 were run in this form, and this form out-committed the experiment's form by 27.4 points in the same batch. The `whenToUse` sentence is where all of the wording variation lives; the quoted token is the second lever, and the parenthesis is inert.

### 8.1 Four hypotheses, each with what stands behind it

| Hypothesis                                                                      | What stands behind it                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Make the line discriminate against its neighbours, not state a quality bar.** | **Confirmatory.** C out-committed B by 27.5 points (89.0% against 61.5%), length-matched at 99 against 96 characters, sign stable in every quarter; paired test 238 of 288. In the product's rendering: 1.000 against 0.667, +33.3 paired. |
| **Print the product's rendering, with the display name in the quotes.**         | **Measured in one batch.** Name-first 0.780, slug-only 0.450, slug-and-name 0.130; +33.0 and +65.0 paired. Product form beat the experiment form by 27.4 points in the same batch. Not yet replicated on a second brief or model.          |
| **Do not add a requirement clause the other modes could also satisfy.**         | **Descriptive only, and length-confounded.** A (50 characters) out-committed B (96 characters) at 73–75% against 59–62%, but the lines differ by 46 characters.                                                                            |
| **Do not rely on placing your mode at the end.**                                | **Withdrawn.** True in the experiment's rendering (+23 to +30 points); absent in the product's (−9, not distinguishable from zero), and the same line at the last slot declares 18 points less there.                                      |

### 8.2 The skeleton

```text
* "<Name>" mode (<slug>) - Use when <the situation in which this mode, and not its nearest neighbour, owns the outcome>,
and the answer must not <the thing the neighbouring modes produce instead>.
```

Both gaps sit inside the `whenToUse` sentence — the first is its opening clause, the second its closing one. The quoted name and the parenthesised slug are shown because the layout is now measured; the slug itself is inert, and the parenthesis costs nothing.

The gaps are deliberate. `<…>` is a placeholder, not text to publish. The first names a trigger narrow enough that a neighbouring line does not also match it; the second names an exclusion the neighbours do not impose — the form that measured 27.5 points ahead of the same clause stated as a requirement, and 33.3 in the product's rendering. Nothing shows that either gap generalises, and no experiment has compared this skeleton against a line written any other way.

### 8.3 One worked example

Line C, annotated in the three fields, in the rendering that was measured:

```text
* "Explain" mode (explain) - Use when someone asks why code behaves as it does, and the answer must not merely describe the code.
```

- **The trigger** — "why code behaves as it does" — names a situation rather than a quality ("expert explanation"). Because C and B differ only in their second clause, the gap belongs to the exclusion, not to the trigger.
- **The exclusion** — "not merely describe the code" — names what the answer must avoid. It is the one clause in the line that a neighbouring mode's line would not also satisfy.
- **What it does not do** — it does not claim the answer must cite evidence. That clause (line B) committed least of the three, and it is a requirement other modes could satisfy.
- **What it costs** — in the product's rendering this line committed in 84 of 84 calls on an ambiguous brief. It will not ask. Pair it with an ask route, or accept that the catalogue has stopped consulting the user.

---

## 9. Recommended next experiments

Four remain, and the revision closed three. All are within-run designs that publish arm rates and a paired test beside every contrast.

1. **Why the level moves.** A 24-point range with nothing varied is now the largest uncontrolled quantity in the programme. Three candidates are documented and none is observable from the client side: non-determinism at a fixed seed, caching with variable hit rates, and batch-dependent computation. The design that would separate them varies batch conditions deliberately and records them — not another trend test.
2. **A second brief that passes the screen.** Everything here is one point in ambiguity space, and six further briefs failed. A generator now exists — withhold the fact that decides ownership, leave the repository intact — and it produced 7 of 10 asks in a twenty-call screen. The next round should pre-register the owner sets, because that judgement currently sits with the analyst.
3. **A model that asks.** The second provider asked not once in 91 replies. What is needed is a provider with a comparable ask rate, established before any draws are spent, and — for the non-asking models — a different outcome: which mode is chosen, rather than whether the reply commits.
4. **The harm arm at n = 400.** 12% against 0% is the most policy-relevant number here and the least precise: the design resolves about 19.8 points at n = 100. It needs no new machinery.

Two former items are closed: the product-rendering question (§4.8–§4.11), and the extractor gap (§4.2). Two remain open in principle: the reversal wants a within-batch replication on a second brief, and the position contrast wants a design that separates first-entry, last-entry, neighbour and **first-token** effects, which are confounded in the experiment format (§4.8).

---

## 10. Self-audit

### 10.1 Five claims withdrawn

1. **"A penalty for the first entry."** Derived from a subtraction across two batches. Withdrawn; what remains is a within-run difference with no identified mechanism.
2. **"The placement advice does not survive."** An earlier draft quoted the registration's "≤ 10 points" reading as frozen and concluded the opposite of what it says. The run is **inconclusive**; a plausible rival placed last was not selected, and the effect of changing the occupant decayed to nothing.
3. **"Order effects are about the first entry."** Same defect as (1).
4. **"The position effect applies to users of the extension."** Withdrawn on 2026-11-23 by measurement: in the product's rendering the difference is −9 points and not distinguishable from zero (§4.8).
5. **"Absolute percentages can be compared between rounds."** Withdrawn: 100 identical calls moved 24 points (§4.9). Levels are batch-specific; only directions, intervals and paired tests travel.

A fourth item was corrected rather than withdrawn: the extractor-miss count is **27 of 378 (7.1%)**, not 28.

### 10.2 Recorded defects

| #     | Defect                                                                                                                                                                                                                                                      | Status                                                                                                                     |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **1** | **The pinned extractor misses commitments.** 27 of 378 (7.1%) in E20/E20b; 21 of 600 E20c replies were bare slugs. A later variant also committed on "exactly one slug anywhere", which the slug `code` defeats in every reply that says "the source code". | **Fixed** — extractor v4, 16/16 replay of the hand wall, all batches re-derived (§4.2)                                     |
| **2** | **The merge step cannot represent an adjudicated wrong commit.** It counts every adjudicated `DECLARATION` as a declared key. That held in E20 and failed once in E20b.                                                                                     | Open — every published table carries the corrected split (§10.3)                                                           |
| **3** | **The registration is sign-blind in its thresholds and sign-specific in its readings.** A reversed ≥ 20-point result has no pre-registered reading.                                                                                                         | Fixed for future rounds: a reading for both signs is now required                                                          |
| **4** | **A gate can be quoted out of context.** The 60-draw E20c gate inverted two arms against the full sweep.                                                                                                                                                    | Documented — rates not quotable                                                                                            |
| **5** | **The extraction pin is not evidenced in the data.** E20-family records stamp parser version 1 while the analysis called version 2.                                                                                                                         | **Fixed** — R0 rows stamp an `extractor` field; the E20 family remains as-published and is annotated                       |
| **6** | **The sealed key and the registration disagree on vocabulary size** (45 against 47).                                                                                                                                                                        | Open — no declaration affected                                                                                             |
| **7** | **The experiments rendered a picker the product does not emit**, so every pre-revision claim about "what the model receives" was about a fixture (§1.2).                                                                                                    | **Recorded, not repaired** — no reply was re-scored; the gap is closed by measurement (§4.8–§4.11), not by editing history |
| **8** | **An arm-level stationarity test voided a batch whose contrasts were stationary.**                                                                                                                                                                          | **Fixed as a rule** — M-15: test the contrast                                                                              |
| **9** | **A batch was scored with rules it was never run under**, and nothing on the record said which extractor version scored it.                                                                                                                                 | **Fixed** — extractor stamped per row                                                                                      |

### 10.3 The counting reconciliation

**The last-entry arm of E20b is 45.0%, not 46.0%.** The arm produced 42 mechanical declarations naming `explain`, 11 naming another mode, and four adjudicated declarations: three name `explain`, one is the bare slug `architecture-reviewer`. So 42 + 3 = **45** selections of the key, 11 + 1 = **12** wrong commits, **43** asks — which sums to 100. The 46 arises from counting every adjudicated declaration as a selection of the key, which answers a different question.

**E20c's corrected totals are 98 / 131 / 152 (49.0 / 65.5 / 76.0)**, confirmed by 24 declarations across the 241 undetermined replies. An interim table printed a bare-slug column (+3 / +10 / +8) that did not sum to its own totals; the totals were right and the column was wrong.

**R0's tables were re-derived twice** — once when the ask rules landed, once under v4 — and the concordance is in §4.2. The rule that caught both errors: re-derive a published count from its components by a second route, and re-add a total from the raw file rather than from the columns beside it.

### 10.4 Method rules that came out of it

| Rule                                                                                             | Bought by                                                   |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| **M-1** A headline automatic metric gets a manual pass before it is quoted                       | the abstention artefact; three incompatible hit definitions |
| **M-6** Every threshold carries a reading for both signs                                         | Defect 3                                                    |
| **M-7** A judgement that could be biased is made blind, with the tie-break fixed before the data | the adjudication protocol                                   |
| **M-8** A resolution limit is stated before the run                                              | §3.5                                                        |
| **M-9** Every contrast is within-run, or it is not a contrast                                    | E20c arm X against E20 arm B, 47.0% vs 59.3%                |
| **M-11** A replication screens for the channel that carries the effect before spending draws     | the second-provider pilot, stopped at call 109              |
| **M-12** A classification rule is validated on a sample before it scores a corpus                | 11.1% agreement under the mention rule                      |
| **M-13** A brief is screened for both conditions the effect needs before it is swept             | six screen failures across three attempts                   |
| **M-14** A published count is re-derived from its components by a second route                   | 46.0%; two adjacent columns that did not sum                |
| **M-15** Stationarity is tested on the contrast, not on the arm                                  | the R0 position batch, voided and then recovered            |
| **M-16** Publish arm rates **and** the paired test; never compare a level across runs            | the 24-point drift probe                                    |

---

## Citations

Only the sources used in this report are listed. Two entries are given by surname only where the full author list could not be verified; they are left incomplete rather than guessed.

Asking Earns Nothing: Scoring the Decision to Act in BFCL Multi-Turn. (2026). _arXiv_. https://arxiv.org/abs/2610.04429

Barsalou, L. W., et al. (2010). _On the vices of nominalization and the virtues of contextualizing_ [Book chapter]. https://barsaloulab.org/Online_Articles/2010-Barsalou_et_al-chap-nominalization_contextualizing.pdf

Budiu, R. (n.d.). _Information scent_. Nielsen Norman Group. https://www.nngroup.com/articles/information-scent

GOV.UK Design System. (n.d.). _Button_. https://design-system.service.gov.uk/components/button

Kaley, A. (n.d.). _UI copy: UX guidelines for command names_. Nielsen Norman Group. https://www.nngroup.com/articles/ui-copy

Katz, S. M., & Byrne, M. D. (2003). Effects of scent and breadth on use of site-specific search. _ACM Transactions on Computer-Human Interaction, 10_(3). http://chil.rice.edu/research/pdf/KatzByrne03.pdf

Kawaletz, L., & Plag, I. (2015). _Predicting the semantics of English nominalizations_. https://www.anglistik3.hhu.de/fileadmin/redaktion/Fakultaeten/Philosophische_Fakultaet/Anglistik_und_Amerikanistik/Ang3_Linguistics/Dateien/Detailseiten/Plag/Kawaletz_Plag2015_Predicting_the_semantics_of_English_nominalizations.pdf

Li, Qiao, & Gao. (2026). _Which metadata matters for LLM tool selection in MCP? Evidence from controlled factor-level interventions_. arXiv. https://arxiv.org/abs/2610.14334

Microsoft Learn. (n.d.). _Menus: UI text guidelines_. https://learn.microsoft.com/en-us/previous-versions/windows/desktop/bb246448(v=vs.85)

Raskin, J. (2000). _The human interface_. Addison-Wesley. Read via a secondary exposition: https://flylib.com/books/en/4.378.1.22/1

VA.gov Design System. (n.d.). _Button_. https://design.va.gov/components/button

---

## Annex A — Provenance, cost, and deviations

| Item                           | Value                                                                                                                               |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Published E20 / E20b / E20c    | 900 / 200 / 600 records; gates 90 and 60                                                                                            |
| Aborted E20 attempt (excluded) | 781 records, of which 741 paid                                                                                                      |
| Closing round preserved        | 600 records                                                                                                                         |
| Calls, E20 family              | **2,591** output-producing (90 gate + 741 aborted + 900 + 200 + 60 + 600)                                                           |
| Cost, E20 family               | ≈ **€13.21** at €5.1 per 1,000 calls (rate-derived, not read from billing)                                                          |
| R0 family                      | position 400, drift 100, attribution 251, wording 337, slug-lead 200, naming 300 = **1,588 calls**; one failed batch, 176 paid rows |
| Cost, R0 family                | ≈ **€9.0** including ≈€0.90 for the failed batch                                                                                    |
| Wall clock, E20 family         | 6.62 h across stages                                                                                                                |
| Re-derivations                 | 7 batches, 1,840 usable rows, 75 verdicts changed, **zero cost**                                                                    |

**Deviations, all recorded rather than smoothed:**

1. **The first E20 batch aborted** at 781/900 on payment depletion (HTTP 402), leaving 40 unrun records. Preserved untouched; a fresh batch dispatched into a new directory. Pooling was declined — it would move the primary contrast from 27.5 to 25.7 points and require 223 further adjudications.
2. **Cost overran the combined €9.4 estimate for E20 and E20c**, for two reasons: the discarded partial batch and E20c's long published batch.
3. **The R0 batches were short of plan** — 251 of 400 on attribution (quota stop), 337 of 400 on wording (tool timeout). Both remained balanced, which is what makes the paired analysis legitimate.
4. **One call of 400 in the position batch failed and was scored**, then excluded; the arm reports 99, not 100.

---

## Annex B — Gate table (first 90 E20 draws)

| Arm       | Draws | Excluded | Exclusion rate | Longest identical transcript run | Declared | Extractor-null |
| --------- | ----- | -------- | -------------- | -------------------------------- | -------- | -------------- |
| ARM-1 (B) | 40    | 0        | 0.0%           | 1                                | 19       | 21             |
| ARM-2 (A) | 10    | 0        | 0.0%           | 1                                | 7        | 3              |
| ARM-3 (C) | 40    | 0        | 0.0%           | 1                                | 32       | 8              |

Thresholds: exclusion > 5% in any arm, or longest verbatim run > 5. **Neither fired.**

---

## Annex C — Outcome counts, mechanical against adjudicated

**E20** (brief: _Explain why this module is structured the way it is._)

| Arm | Line  | n   | Mechanical | Adjudicated | Final declared key | Asked | Wrong commit | Appropriate |
| --- | ----- | --- | ---------- | ----------- | ------------------ | ----- | ------------ | ----------- |
| B   | 96 ch | 400 | 237        | +9          | **246 (61.5%)**    | 154   | 0            | 100%        |
| A   | 50 ch | 100 | 73         | +2          | **75 (75.0%)**     | 25    | 0            | 100%        |
| C   | 99 ch | 400 | 344        | +12         | **356 (89.0%)**    | 44    | 0            | 100%        |

**E20b** (same brief, line held at B)

| Arm   | Position    | n   | Mechanical                  | Adjudicated | Final declared key | Asked | Wrong commit | Appropriate |
| ----- | ----------- | --- | --------------------------- | ----------- | ------------------ | ----- | ------------ | ----------- |
| first | first entry | 100 | 15                          | +0          | **15 (15.0%)**     | 85    | 0            | 100%        |
| last  | last entry  | 100 | 53 (42 `explain`, 11 other) | +3          | **45 (45.0%)**     | 43    | **12**       | 88%         |

> The last arm's declared-key total is 45, not 46; §10.3 gives the split, and counting all four adjudicated declarations as keys double-counts a commit to a different mode.

---

## Annex D — Pre-declared statistical tests

| Contrast                                    | Declared rates | Difference    | 95% CI         | Exact two-sided _p_ | Paired sign test                    |
| ------------------------------------------- | -------------- | ------------- | -------------- | ------------------- | ----------------------------------- |
| **E20 primary: B vs C**                     | 61.5% vs 89.0% | **−27.5 pts** | [−33.1, −21.7] | 7.1 × 10⁻²⁰         | **238 / 288 pairs, z 11.08**        |
| E20 secondary: A vs B _(length-confounded)_ | 75.0% vs 61.5% | +13.5 pts     | [+3.1, +22.4]  | .0141               | —                                   |
| **E20b: first vs last**                     | 15.0% vs 45.0% | **−30.0 pts** | [−41.3, −17.5] | 5.6 × 10⁻⁶          | 94 / 107 pairs, z 7.83 (see caveat) |
| E20b harm: wrong commits                    | 12.0% vs 0.0%  | +12.0 pts     | [+5.8, +19.8]  | 3.4 × 10⁻⁴          | —                                   |
| E20c, all contrasts                         | —              | not estimated | —              | —                   | —                                   |

The Fisher columns assume independent draws and are **optimistic** (§4.9); they are retained for traceability. The paired column is the time-aware statistic and is primary. The E20b paired figure carries the re-classification caveat in §4.5: it shows the contrast is not drift, and does not replace the registered 45.0%.

---

## Annex E — Runs tests (outcome dependence)

| Arm        | Runs observed | Runs expected | z         | _p_  |
| ---------- | ------------- | ------------- | --------- | ---- |
| E20 B      | 193           | 190.42        | 0.27      | .79  |
| E20 A      | 37            | 38.50         | −0.40     | .69  |
| E20 C      | 81            | 79.32         | 0.43      | .67  |
| E20b first | 31            | 27.88         | 1.18      | .24  |
| E20b last  | 52            | 50.50         | 0.30      | .76  |
| E20c X     | 101           | 100.64        | +0.05     | .96  |
| E20c Y     | 114           | 97.00         | **+2.51** | .012 |
| E20c Z     | 81            | 82.51         | −0.26     | .79  |

No E20 or E20b arm shows sequence dependence. E20c's Y arm alternates more than chance, which passes both the verbatim and exclusion guards and is detected only by this test. A runs test detects dependence, not trend; the block decomposition, not this table, is what demoted E20c.

---

## Annex F — Run-to-run concordance (same prompts, two dispatches)

| Arm | Overlapping draws | Same commit/ask outcome | Chance-level agreement | Identical transcript |
| --- | ----------------- | ----------------------- | ---------------------- | -------------------- |
| B   | 329               | 175 (53.2%)             | 51.7%                  | 0 (0.0%)             |
| A   | 83                | 45 (54.2%)              | 55.3%                  | 0 (0.0%)             |
| C   | 329               | 234 (71.1%)             | 73.5%                  | 0 (0.0%)             |

Agreement at chance and zero verbatim repetition together establish that calls are independent samples at the call level, while §4.9 shows they are not independent in time. Both statements are needed.

---

## Annex G — Adjudication protocol and recorded defects

| Item                       | Value                                                                                                                 |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Replies adjudicated        | 378 (E20: 246 of 900; E20b: 132 of 200)                                                                               |
| Pass 1                     | E20 **23 DECLARATION / 223 ASK**; E20b **5 / 127**                                                                    |
| Pass 2 (initial)           | 50 of 378 (13.2%), 100% agreement under the registered rule                                                           |
| Pass 2 (independent, full) | **378 of 378**, different model, blind packet — 11.1% under the registered rule, **99.7%** under selection-vs-mention |
| Blindness assertion        | **PASS** — no arm label, run id, timestamp or registered line text                                                    |
| Join discipline            | outside the packet directory; opened only after every verdict was recorded                                            |

**What "blind" means after publication, and what it does not.** The packet carries no arm, draw number or timestamp, and the join was opened only after every verdict was recorded — but `adjudication-join.json` is now published beside the packet, so any reader can join the two. Blindness here is a property of the **procedure**, not of the published artefact set. The same caveat applies to `blindSeed` in `plan.json`: publishing the seed of a completed packet is harmless, but the seeding scheme should not be reused for a packet that is still open.

Defects 1–9 are tabulated in §10.2. The two that touched a published number are Defect 2 (the merge step's treatment of a non-key declaration) and Defect 3 (a sign-blind threshold with a sign-specific reading); both are reconciled in §10.3, and neither changes the effect.

---

## Annex H — E20c: three arms, one slot

600 calls, 200 per arm, all `RUN`, interleaving proved at 599 transitions. `explain` at the seventh entry with line B in every arm; only the last entry's occupant changed, by a swap.

| Arm   | Last entry holds                          | `explain` declared (mechanical) | Adjudicated | Corrected           | Extractor-undetermined |
| ----- | ----------------------------------------- | ------------------------------- | ----------- | ------------------- | ---------------------- |
| **X** | `ai-cost-engineer` (original)             | 94/200 = 47.0%                  | +4          | **98/200 = 49.0%**  | 105                    |
| **Y** | `documentation` (non-competing filler)    | 120/200 = 60.0%                 | +11         | **131/200 = 65.5%** | 80                     |
| **Z** | `architecture-reviewer` (plausible rival) | 143/200 = 71.5%                 | +9          | **152/200 = 76.0%** | 56                     |

**Stability (mechanical, blocks of 50 draws).**

| Arm | Declarations per block | Rate shape                    | Read as                         |
| --- | ---------------------- | ----------------------------- | ------------------------------- |
| X   | 18 / 20 / 27 / 30      | 36.0% → 40.0% → 54.0% → 60.0% | ramps (CA z = 2.72, _p_ ≈ .007) |
| Y   | 32 / 31 / 27 / 30      | 64.0% → 62.0% → 54.0% → 60.0% | flat (CA z = −0.65)             |
| Z   | 38 / 37 / 35 / 34      | 76.0% → 74.0% → 70.0% → 68.0% | declining (CA z = −0.99)        |

The X and Z rows count declarations naming any mode (95 and 144); the `explain`-only totals are 94 and 143, which give per-block contrasts of X 18/19/27/30 and Z 38/37/35/33.

**Verdict: inconclusive.** Arm X ramps 36% → 60% inside its own run and both contrasts decay to 0 and +8 points. The 241 undetermined replies have since been adjudicated, which moves the levels to 49.0 / 65.5 / 76.0 without touching the decay. What survives is narrower than the registration anticipated: a plausible rival placed in the last slot was selected twice in 600 replies, so it does not capture the slot.

**Zero-based numbering.** The fixture counts entries from zero: with 45 entries, the first entry is 0, the seventh is 6, and the last is 44.

**Gate (60 draws, 20 per arm).** X 65.0%, Y 45.0%, Z 65.0% — exclusion and clustering only; those rates are noise and are not quotable.

---

## Annex I — The second-provider pilot

Run 2026-11-18, stopped at 109 of 800 calls. All 91 output-producing replies across the two wording arms:

| Arm                   | n   | Declared `explain` | Other picks               | Asked | Distinct strings |
| --------------------- | --- | ------------------ | ------------------------- | ----- | ---------------- |
| B — artefact stated   | 43  | 41 (95.3%)         | 2 `codebase-cartographer` | 0     | —                |
| C — artefact excluded | 48  | 48 (100%)          | none                      | 0     | —                |

Five distinct strings across 91 replies, every one a mode name. Failures: five replies truncated to empty content at a 4,096 cap, because a reasoning model spends the output budget on hidden reasoning before answering; one empty completion. All six failures were in arm B, which is why dropping them rather than raising the cap would have biased the comparison.

Cost ≈ €0.6. The 709 calls not spent would have measured a ceiling.

---

## Annex J — The product-rendering round (R0)

Six batches, 1,588 calls, one model, one brief, `explain` at the seventh entry unless stated. Rates are extractor v4's output (§4.2). All contrasts are paired within rotation cycle; _z_ is optimistic because adjacent pairs are correlated.

**Position × rendering** (400 calls, 99–100 per arm)

| Arm                    | Rate  | Paired contrast                                  |
| ---------------------- | ----- | ------------------------------------------------ |
| experiment form, first | 0.212 | last − first **+23.2** (z 3.29)                  |
| experiment form, last  | 0.440 |                                                  |
| product form, first    | 0.350 | last − first **−9.0** (z −1.37)                  |
| product form, last     | 0.260 | product − experiment at last **−18.2** (z −2.65) |

**Drift** (100 calls, one condition, nothing varied): 0.40 / 0.28 / 0.16 / 0.24 across quarters — a 24-point range.

**Attribution** (251 calls, four renderings, 62–63 per arm)

| Rendered form                               | Rate      |
| ------------------------------------------- | --------- |
| `- slug — Name — line` (experiment)         | 0.500     |
| `- Name — slug — line`                      | 0.468     |
| `* "slug" mode (Name) - line`               | 0.190     |
| `* "Name" mode (slug) - line` (**product**) | **0.778** |

Paired: product − experiment **+27.4** (z 3.05); product − slug-first **+58.1** (z 5.55); experiment − name-first +3.2 (z 0.35, indistinguishable from zero). The slug-first arm is confounded by a malformed parenthetical, and a follow-up arm removing it recovered 26 points (§4.11).

**Wording × rendering** (337 calls, 84–85 per arm)

| Arm                | Rate      | Asks  | Paired C − B       |
| ------------------ | --------- | ----- | ------------------ |
| experiment form, B | 0.659     | 27    | +21.4 (z 3.40)     |
| experiment form, C | 0.869     | 9     |                    |
| product form, B    | 0.667     | 25    | **+33.3 (z 5.29)** |
| product form, C    | **1.000** | **0** |                    |

Format effect on line B: +1.2 points (19 up, 18 down, z 0.16) — nothing.

**Slug-lead** (200 calls): slug-only 0.450 against slug-and-name 0.190; paired **+26.0** (z 3.61).

**Naming** (300 calls, 100 per arm): name-first 0.780, slug-only 0.450, slug-and-name 0.130; paired **+33.0** (z 4.37), **+65.0** (z 7.41), **+32.0** (z 4.82).

---

## Appendix 1 — check any number in ten minutes

The point of pre-registration is that a reader can audit the result without re-running it. Each row names the claim, the file that holds the evidence, and what to look at.

**What is in these files, and what is not.** Per call, `results.jsonl` records the index, run id, arm label, draw number, brief id, the prompt's SHA-256, the model and temperature, status and exit code, timestamps, the full request transcript, the full reply, the finish reason, the output cap, the parser version and — for R0 — the extractor version. `plan.json` carries the 45-entry picker with the expected key for each arm. They contain **no credentials, no API keys, no request headers, no hostnames or endpoints, no account or project identifiers, and no user data**. Every prompt is a synthetic fixture.

The exposure is instead scientific, and it should be stated rather than discovered: the fixture is **burned**. A reader can see which line belongs to which arm and which slug the key expects, so this picker and this brief cannot be reused as a blind test. A replication needs a new fixture. That is the cost of publishing the evidence, not a reason to withhold it.

| Claim                                   | File                                                                                                                                                                                | What to look at                                                                                                      |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 246/400, 75/100, 356/400                | `runs/e20-2026-11-17/results.jsonl`                                                                                                                                                 | one record per call: `finishReason`, `response`, arm label in the plan                                               |
| The wording of each arm                 | `runs/e20-2026-11-17/plan.json`                                                                                                                                                     | the three `whenToUse` variants and the interleaved cycle                                                             |
| The rendered picker line, verbatim      | `runs/e20-2026-11-17/prompts/ARM-1-d001.txt`, line 13                                                                                                                               | the `explain` entry in the `- slug — Name — line` form; line 1 is the persona sentence and lines 3–5 the instruction |
| Adjudicated replies and verdicts        | `runs/e20-2026-11-17/adjudication/`                                                                                                                                                 | `packet.jsonl` (blind), `judgements-*.jsonl`, `join.json`                                                            |
| 15/100 against 45/100, 12 wrong commits | `runs/e20b-2026-11-16/results.jsonl`                                                                                                                                                | arm label per draw; count replies naming a non-key mode                                                              |
| 94/120/143 mechanical                   | `runs/e20c-2026-11-17/results.jsonl`                                                                                                                                                | block boundaries are every 50th draw                                                                                 |
| Every R0 rate in Annex J                | `runs/r0-position-both-2026-11-20`, `runs/r0-attribution-both-2026-11-20`, `runs/r0-wording-both-2026-11-20`, `runs/r0-slug-lead-both-2026-11-20`, `runs/r0-naming-both-2026-11-20` | `results.jsonl` per batch, plus `reclass-r0-extract-4.json` for the v4 re-derivation                                 |
| The 24-point drift                      | `runs/r0-drift-product-2026-11-20`                                                                                                                                                  | 25-call quarters of a single unchanged condition                                                                     |
| The 99.7% agreement                     | `runs/adjudication-work/`                                                                                                                                                           | the second-reading report and both judgement files                                                                   |
| Every correction, in order              | [`modes-experiment-log.md` §§23–44](https://github.com/xavier-arosemena/roo-plus/blob/master/docs/research/modes-experiment-log.md#L831)                                            | append-only; corrections are recorded, not edited in place                                                           |

`prompts/` and `transcripts/` are excluded from the repository because they are regenerable from `results.jsonl`. If a count and its neighbouring column disagree, re-derive the count from the raw file — that rule caught three errors here.

---

_Prepared for the Research Reports discussion category. Revised 2026-11-23. Keywords: `agentic-coding`, `agentic-ide`, `coding`, `vscodium-extension`, `llm-evaluation`, `reproducibility`._
