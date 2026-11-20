# Does a mode line's wording, or its position, decide what an agent picks?

**A pre-registered routing benchmark on a 45-mode picker: 2,591 calls, one confirmatory result, and a list of findings that did not survive their own controls.**

**Keywords:** `agentic-coding` · `agentic-ide` · `coding` · `vscodium-extension` · `llm-evaluation` · `reproducibility`

| Field                | Value                                                                                                                                                                                                                                                                                                                                                                |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**           | Published research report. Empirical; interpretation is open to challenge and three earlier claims are withdrawn in §10.1                                                                                                                                                                                                                                            |
| **Programme**        | Modes catalogue programme, routing workstream. Followed by the capability benchmark                                                                                                                                                                                                                                                                                  |
| **Built from**       | E21b (closing round, 598/600 appropriate), E13-R (label form, 600 calls), E20 (artefact polarity, 900 calls), E20b (position, 200 calls), E20c (slot occupant, 600 calls)                                                                                                                                                                                            |
| **Data**             | [E20](https://github.com/xavier-arosemena/roo-plus/tree/master/runs/e20-2026-11-17) · [E20b](https://github.com/xavier-arosemena/roo-plus/tree/master/runs/e20b-2026-11-16) · [E20c](https://github.com/xavier-arosemena/roo-plus/tree/master/runs/e20c-2026-11-17) · [closing round](https://github.com/xavier-arosemena/roo-plus/tree/master/runs/e13r-2026-11-12) |
| **Pre-registration** | [E20 registration](https://github.com/xavier-arosemena/roo-plus/blob/master/docs/reviews/2026-11-13-e20-preregistration.md), Amendments 1–2; [E20c registration](https://github.com/xavier-arosemena/roo-plus/blob/master/docs/reviews/2026-11-17-e20c-preregistration.md)                                                                                           |
| **Working record**   | [Experiment log §§23–30](https://github.com/xavier-arosemena/roo-plus/blob/master/docs/research/modes-experiment-log.md#L831) — what was verified, what was corrected, and in what order                                                                                                                                                                             |
| **Cost**             | 2,591 output-producing calls in the E20 family; **3,200 calls** and **≈€16.32** across the whole programme. Full accounting in Annex A                                                                                                                                                                                                                               |

---

## Abstract

**Question.** When a user's request could belong to more than one mode, does the wording of the mode lines — or their order in the list — change which one the model chooses? The literature offers no measurement of this inside a mode picker. It establishes that descriptions outrank names in tool selection, that position can dominate when names are the only difference, and that agent benchmarks routinely fail to score the turn on which asking is the correct answer.

**Method.** Three experiments on one model, one 45-entry picker and one deliberately ambiguous brief, varying one clause of the list at a time: 900 draws across three wordings, 200 across two list positions, and 600 across three occupants of the last slot. Every contrast was pre-registered, interleaved, and judged twice — the second time blind, by a different model, under a rule that distinguishes _selecting_ a mode from _mentioning_ one.

**Result.** One finding survives. A line stating what the answer must **not** be committed the model to that mode **27.5 percentage points** more often than a length-matched line stating an evidence standard — 89.0% against 61.5% — which is the **reverse** of the prediction. The sign held in every quarter of the run, and the second reader reproduced the first reading on **99.7%** of the replies it re-read. Order produced a large difference without an identified mechanism. Everything else narrowed: the effect holds on **one brief out of seven screened**, for one model, at one list position, with batch-to-batch variation of the same order as the design's stated resolution.

**Consequence.** The report yields a measurable probe for a catalogue (§7.3), a testable template for writing a single mode line (§8), and an explicit list of what the numbers cannot support (§6).

---

## At a glance

| Quantity                                                  | Value                                           | Where |
| --------------------------------------------------------- | ----------------------------------------------- | ----- |
| Prohibition vs requirement, commit rate                   | **89.0% vs 61.5%** (27.5 pts, _p_ ≈ 7 × 10⁻²⁰)  | §4.2  |
| First entry vs last entry, commit rate                    | **15.0% vs 45.0%** (30.0 pts, _p_ = 5.6 × 10⁻⁶) | §4.4  |
| Wrong commits, last entry vs first                        | **12 per 100 vs 0 per 100** (_p_ = 3.4 × 10⁻⁴)  | §4.4  |
| Independent agreement on adjudicated replies              | **377 of 378** (99.7%)                          | §4.7  |
| Same prompt, two dispatches, identical transcript         | **0 of 741** overlapping draws                  | §4.6  |
| Briefs screened before the effect reproduced              | **1 of 7**                                      | §5.6  |
| Resolution of the design (smallest detectable difference) | ~10 pts at n = 400; ~19.8 pts at n = 100        | §3.5  |

---

## How to read this report

The report is technical, but it can be read without a statistics background if you accept eight definitions. They are used exactly as written below, throughout.

| Term                 | What it means here                                                                                                                                                                                       |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mode**             | A named behaviour preset for the agent (its instructions, tool access and role). A user picks one; or the agent picks one from the user's request.                                                       |
| **Picker**           | The single block of text the model receives when it has to choose: one line per mode, about 45 of them. That is the entire input to the decision.                                                        |
| **Commit / ask**     | The model either names a mode (**commit**) or asks for the information it is missing (**ask**). These are the two outcomes this report measures — not "right" and "wrong".                               |
| **Appropriate**      | `commit to the expected mode` **or** `ask`. A reply that names an unrelated mode is _not_ appropriate. This definition matters in §6, because it makes 100% appropriate arithmetic rather than a result. |
| **Arm**              | One condition of an experiment. Three arms means three variants, each run many times.                                                                                                                    |
| **Draw**             | One API call producing one reply. 900 draws means 900 calls.                                                                                                                                             |
| **Pre-registration** | The predictions, thresholds and statistical tests, written and frozen _before_ the data are collected. You can lose against your own registration; that is the point of it.                              |
| **Resolution (MDE)** | The smallest difference a design can reliably detect. A "no effect" finding below that size is a statement about the ruler, not about the world.                                                         |

Two conventions: percentages are **commit rates** unless marked otherwise, and "points" always means percentage points. Every count in this report can be recomputed from the `results.jsonl` file in the run directory named beside it; [Appendix 1](#appendix-1--check-any-number-in-ten-minutes) maps each claim to its file.

---

## 1. The question

### 1.1 The situation

A catalogue with hundreds of installable modes has a search problem before it has a capability problem. The user must express a task; the system must map that task onto one of many candidates, several of which overlap. Two levers are available to whoever authors the catalogue:

- **Wording** — what the `whenToUse` sentence of each entry says.
- **Order** — where each entry sits in the list the model reads.

This report measures both, and measures them on the case where they can matter.

### 1.2 What the model actually receives

The extension renders the catalogue as a flat list, one line per mode, in file order:

```text
  * "<name>" mode (<slug>) - <whenToUse>
```

That template is [`modes.ts`](https://github.com/xavier-arosemena/roo-plus/blob/master/src/core/prompts/sections/modes.ts#L33), and one property of it is worth noting before any result: if `whenToUse` is empty, the extension substitutes the first sentence of the mode's `roleDefinition`. A missing `whenToUse` is therefore not a neutral omission — it is a silently different line, written for a different purpose.

Of the three fields, only `whenToUse` varied between the arms of every experiment here. Nothing in this report can speak to the display name or the slug; they were held fixed, which is also why they carry no result.

### 1.3 The residual case

On a clear request the question is answered before it is asked. In the closing round of the programme — recomputed under the combined outcome and published as E21b — 598 of 600 replies were appropriate on an unambiguous brief: the model commits, and it commits correctly, and no wording or ordering trick changes that.

The interesting regime is therefore **a brief ambiguous enough that the model could reasonably ask instead of choosing**. That is the only regime in which a picker line has anything to decide, and it is where all three experiments live. It is also, as §5.6 shows, a much narrower regime than "vague requests" in general.

### 1.4 Three questions

1. Does the **wording** of a line change whether the model commits or asks?
2. Does the **position** of a line change it?
3. What does commitment **cost** — does the model commit to the _right_ mode, or merely to _a_ mode?

---

## 2. What was already known

Four findings bear on the question, each stated with the strength of the evidence behind it. Three of the four rest on a single study; two are unpublished preprints. That matters for how this report is read: it is not a replication.

**1. Selection from a list is a metadata problem, and the metadata is unequal.** The only factor-isolated study of tool selection — five models, five tasks, metadata drawn from 367,174 tools, positions balanced, conditional logistic regression for position-adjusted effects — ranks the levers **parameter schema > description > name**, with names excluding zero in only **6 of 29** estimates (Li, Qiao & Gao, 2026; preprint, unreplicated). Our framing inherits that ranking: `whenToUse` is the description lever, and the entry name is the weakest one available.

**2. Position can dominate when names are all that differ.** The same study reports the first-listed entry chosen in **78.7–96.0%** of trials under name-only comparisons — a larger effect than any label-form effect ever measured. No factor-isolated study we could reach had varied position _inside a mode picker_ before this programme, which is why §4.4 exists and why it is reported as a difference without an identified mechanism.

**3. Benchmarks systematically fail to score abstention.** The leading agent function-calling benchmark builds turns on which asking is the _expected_ behaviour, then skips them in scoring: asking earns nothing, and guessing costs nothing on that turn. Instructing a model not to ask produces no detectable change in decision quality while raising its official score by **13.5 to 23.5 points** (Asking Earns Nothing, 2026; preprint, one benchmark, unreplicated). This is not an aside. It is the same instrument defect that manufactured this programme's own false null, described in §10.

**4. Grammatical form has guidance but no measurement.** Verb-first naming is a documented interface convention (GOV.UK Design System, n.d.; Microsoft Learn, n.d.; Kaley, n.d.), and nominalisation research explains why a "-tion" noun is ambiguous between an event and its result (Kawaletz & Plag, 2015; Barsalou et al., 2010). But **no study compares a verb-named entry with a noun-named one while holding everything else fixed**, in any domain we could reach.

**What that leaves.** The literature predicts that descriptions matter more than names, offers no measurement of name or line form inside a picker, and is itself unpublished in two of the four load-bearing cases. The question this report answers had no prior measurement to confirm or deny — which cuts both ways: any result here is new, and any result here is unanchored.

---

## 3. Method

### 3.1 The three experiments

Four experiments carry the report; each varies one thing and holds the others fixed, which is the only reason they can be read separately.

| Experiment                            | What varied                                                                          | What was held                                          | n               |
| ------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------ | --------------- |
| **E13-R** (closing round, label form) | the wording of the line, six cells                                                   | position, brief, model                                 | 6 × 100         |
| **E20**                               | the line's requirement: artefact absent, artefact stated, artefact excluded          | position (the seventh entry), brief, model             | 100 / 400 / 400 |
| **E20b**                              | the position of `explain`: first entry vs last entry                                 | the line, brief, model                                 | 100 / 100       |
| **E20c**                              | the occupant of the last entry: original mode, non-competing filler, plausible rival | `explain` at the seventh entry, its line, brief, model | 200 / 200 / 200 |

One model throughout: `gemini-3.5-flash`, `temperature: 0`, a single output cap of 4,096 tokens. One brief throughout: _"Explain why this module is structured the way it is."_

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

> **A design defect, declared up front.** E20c assumed that draws inside an arm were exchangeable — the premise interleaving is meant to secure. Arm X is not: its commit rate rises from 36.0% to 60.0% across the run while Y holds flat and Z declines (§5.2). E20c is therefore **inconclusive**, and its figures are published as counts and readings, never as effects.

### 3.2 The measurement contract

Replies are **unconstrained**. There is no `MODE:` slot, because a labelled slot presents a choice where the model might otherwise ask, and would bias the very ask rate being measured.

Extraction is a pinned parser (`routing-round-parser/2`). Every reply it cannot resolve goes to **hand adjudication, blind**: the packet carries a hashed id, the brief and the reply — no arm, no draw number, no timestamp — and the id-to-run mapping stays outside the packet until every judgement is recorded. Judgements are `DECLARATION`, `ASK` or `OTHER`.

The tie-break was fixed in advance, and it failed. The rule "a declaration marker anywhere makes the reply a `DECLARATION`, even if the reply asks afterwards" was written to protect a real case: a reply that commits and then asks for more. On this corpus it swallowed almost everything, because an ask on an ambiguous brief typically _enumerates_ candidate modes ("whether you want `explain`, `architecture-reviewer` or `codebase-cartographer`"). The rule was replaced — before any count was published — by one that separates **selection** from **mention** (§4.7).

This is the single most consequential methodological fact in the report: the headline number is not a property of the replies, it is a property of the replies **under a stated construct**. §4.7 and §5.5 give the alternative construct's number alongside.

### 3.3 Decision rules, fixed before the data

- Exact Fisher tests on pre-declared contrasts, Holm-corrected within each experiment.
- A difference of **≥ 20 points** with adjusted _p_ < .025 counts as an effect.
- **< 10 points** counts as no detectable effect.
- The band between them is recorded as **indecisive** and not re-run without a new registration.
- Every arm is tested for **stationarity** (drift within the run) before its contrast is read.

### 3.4 Instrument proof

These checks are what license reading the numbers at all. They are reported because a benchmark that cannot show its own instrument is healthy is a benchmark of its own noise.

| Check                                    | Result                                                                                          |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Mid-run gate at 90 draws                 | exclusion **0.0%** in all three arms; longest identical verbatim run **1** (threshold 5)        |
| Excluded records, published batches      | **0 of 1,700**; every record `finishReason: STOP`                                               |
| Verbatim clustering                      | longest identical-transcript run **1** in all five E20/E20b arms; 879/900 and 199/200 distinct  |
| E20c verbatim clustering                 | **192–198 of 200** distinct transcripts per arm; no arm clusters                                |
| Interleaving                             | **899** transitions across 900 calls, **199** across 200, **599** across 600; max concurrency 1 |
| Token cap / model                        | one value, 4,096, throughout; `gemini-3.5-flash`; `temperature: 0`                              |
| Runs test on each arm's outcome sequence | B _p_ = .79 · A _p_ = .69 · C _p_ = .67 · first _p_ = .24 · last _p_ = .76                      |

Two instrument outputs are deliberately **not** results. The 60-draw E20c gate produced commit rates of X 65.0%, Y 45.0%, Z 65.0%, which inverts two arms relative to the full sweep — the gate exists to check exclusion and clustering only, and its rates are 20-draw noise (Annex H). And 21 of the 600 E20c replies are a bare slug, which the pinned extractor cannot resolve at all; they sit inside the 241 replies adjudicated blind in §4.5, so those counts are readings rather than bounds, but they still cannot be turned into a contrast.

### 3.5 What the design cannot do

The ruler is stated before the run, not in a caveat after it:

- E20 resolves about **10 points** at n = 400 per arm, and about **19.8 points** at n = 100.
- E20c's registration states **14.0 points** at 200 draws per arm.
- The **batch-to-batch** ruler is coarser than any of these and is not a constant (§5.2). No claim in this report crosses batches.

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

### 4.2 Primary contrast: a prohibition out-commits a requirement

**B 61.5% against C 89.0% — a difference of 27.5 points, C ahead** (95% CI 21.7–33.1 points; exact two-sided _p_ = 7.1 × 10⁻²⁰; Holm-adjusted _p_ < 10⁻¹⁹).

The registered reading for "≥ 20 points" was written as _"naming what the answer must contain moves commitment more than naming what it must avoid"_. The observation is the mirror image: **the line that said what the answer must avoid committed 27.5 points more often.** The registration therefore has no reading for this result. That is a defect in the registration (§10.2), not a defect in the measurement, and it is the reason this section is written as "confirmed effect, refuted hypothesis" rather than as a confirmation.

_Effect is falsified if_ a length-matched line naming a required artefact, rather than a quality standard, reverses the gap.

### 4.3 Secondary contrast, reported as magnitude only

**A 75.0% against B 61.5% — 13.5 points, A ahead** (95% CI 3.1–22.4; _p_ = .0141). The shorter line is _not_ the weaker one. But A and B differ in length by 46 characters, so this is descriptive and length-confounded. It is recorded because omitting it would look like concealment, not because it establishes that short lines work.

### 4.4 Position: 15.0% against 45.0%

**First entry 15.0% against last entry 45.0% — 30.0 points, last ahead** (95% CI 17.5–41.3; exact _p_ = 5.6 × 10⁻⁶).

Two details matter more than the headline:

- **Both arms stayed appropriate at or near saturation** — first 100%, last 88%. The model almost never chose an unrelated mode; it either committed or asked.
- **All the harm is in the last position: 12 wrong commits per 100 against 0 per 100** (exact _p_ = 3.4 × 10⁻⁴). Twelve replies named some other mode outright rather than asking.

This is the number with the clearest practical reading, and the least precise one: the design resolves about 19.8 points at n = 100. Ten of the twelve named `architecture-reviewer`, which is adjacent and defensible for this brief — "wrong" here means _a mode the key does not name_, not _incoherent_.

### 4.5 The slot-occupant arm: a count, not an effect

`explain` sat at the seventh entry in all three arms with the same line. Only the last entry's occupant changed.

| Arm   | Last entry holds                | `explain` declared (mechanical) | Adjudicated | Corrected             | Extractor-undetermined |
| ----- | ------------------------------- | ------------------------------- | ----------- | --------------------- | ---------------------- |
| **X** | `ai-cost-engineer` (original)   | 94 / 200 = 47.0%                | +4          | **98 / 200 = 49.0%**  | 105                    |
| **Y** | `documentation` (non-competing) | 120 / 200 = 60.0%               | +11         | **131 / 200 = 65.5%** | 80                     |
| **Z** | `architecture-reviewer` (rival) | 143 / 200 = 71.5%               | +9          | **152 / 200 = 76.0%** | 56                     |

The registered readings, and what this run can say about them:

1. **Rival capture (Z against X): 1 against 1.** The count sits on a metric with 56 of Z's 200 replies and 105 of X's unresolved, so it is a bound, not a zero. The registered reading for a "≤ 10 points" difference is **not applied** — not because the count contradicts it, but because the run it comes from is not stable (§5.2) — and its opposite is not claimed either.
2. **Explain shift (Y against X): +13.0 points mechanical, +16.5 corrected.** Both sit inside the registered 10–20 indecisive band, which would make the observation indecisive; because the arms are not stationary, not even that verdict is applied.
3. **Unregistered: Z against X on `explain`, +24.5 mechanical, +27.0 corrected.** No reading exists for it and none is manufactured here. §5.2 shows the figure is the average of a decaying contrast (+40, +36, +16, +6 points), so it is not a magnitude to quote either.

The gate and the extractor both constrain what can be quoted. At the 60-draw gate the arms read X 65.0%, Y 45.0%, Z 65.0%, an ordering that inverts two arms against the sweep; those rates are not quotable. Of the 241 replies the extractor could not resolve — 21 of them a bare slug (X 3, Y 10, Z 8) — all have now been adjudicated blind under the selection rule, and the adjudicated column above is the result. The counts are readings rather than bounds; what they still cannot be used for is a **contrast**, because the arms are not stationary.

### 4.6 `temperature: 0` is not reproducibility

The aborted first attempt (billing, Annex A) drew the **same prompts** as the published batch before it stopped. Comparing draw by draw:

| Arm | Overlapping draws | Same commit/ask outcome | Chance-level agreement | Identical transcript |
| --- | ----------------- | ----------------------- | ---------------------- | -------------------- |
| B   | 329               | 53.2%                   | 51.7%                  | **0.0%**             |
| A   | 83                | 54.2%                   | 55.3%                  | 0.0%                 |
| C   | 329               | 71.1%                   | 73.5%                  | 0.0%                 |

Agreement sits **at chance**, and not one transcript repeats. Two consequences. Each call is an _independent sample_, not a replicate — so pooling batches would legitimately add information (it was declined, Annex A). And a single request is genuinely unstable: a mode that committed once may ask next time.

### 4.7 Independent corroboration, and what it says about the construct

Every count above rests on replies the mechanical extractor could not classify. Those replies were judged twice: once by the analyst, and once by a **different model reading a blind packet** carrying no arm, draw or time.

Under the rule registered for the second pass, the two readings agreed on **11.1%** of 378 replies. Reading twelve disagreements in full showed the first pass right in all twelve: each was an ask that enumerated candidate modes, and the registered tie-break counted any named mode as a declaration. Under a rule that distinguishes **selection from mention**, agreement is **99.7% — 377 of 378**.

Two things follow. The adjudicated counts stand, and are now corroborated by an independent reader rather than merely asserted. And the result is **construct-dependent**, in a way that belongs beside every number: scored on a mention-anywhere construct, the same replies give B 98.0% and C 97.75% — a gap of **0.25 points** instead of 27.5. The effect is entirely a difference in _whether the reply commits_; it vanishes if "mentions a candidate" is scored as committing.

---

## 5. Interpretation

### 5.1 Why a prohibition might beat a requirement

E20 targeted the 10–20 point band the earlier design could not resolve. At 400 draws per arm that band is inside the ruler, so a difference there counts as an effect rather than an indecisive reading. E20 found one at 27.5 points, with a confidence interval that excludes any reading below 21 points. **The effect is large and its direction is clear; it is the prediction's sign that was wrong.**

The most parsimonious description: a line that says _"not merely describe the code"_ reads as a **prohibition to be complied with**, and a prohibition is a stronger instruction than a requirement to include something. This is consistent with the negotiation behaviour seen in adjudication — the replies that ask are overwhelmingly replies that cannot decide _between_ modes, so a prohibition narrows the field, while a requirement leaves the field as it was.

It is a hypothesis, not a mechanism established here. Two things would break it: a length-matched line naming a _required artefact_ that reverses the gap, and a line whose exclusion is satisfied by a neighbouring mode (in which case the clause narrows nothing).

### 5.2 Within-run is necessary, not sufficient

Arm X of E20c is the **same condition** as E20's arm B: identical picker, line, brief, model and index, byte-identical prompts. It scored **47.0% against 59.3% — 12.3 points apart, z = 2.85**.

That is a batch-to-batch difference on an identical condition, and it is the observation from which this programme's rule **M-9** was written: _a contrast is within-run, or it is not a contrast._

Interleaving protects a design against a **common** trend: if the whole batch drifts, the round-robin spreads that drift evenly and a within-run contrast survives it. It does **not** protect against one arm drifting while the others hold — an arm × time interaction — and the run that could have tested this contained exactly one.

| Experiment | Arm         | Declarations per block       | Shape                            |
| ---------- | ----------- | ---------------------------- | -------------------------------- |
| E20        | B           | 61 / 58 / 63 / 55 per 100    | flat                             |
| E20        | C           | 83 / 87 / 84 / 90 per 100    | flat, drifting up                |
| E20        | A           | 17 / 17 / 23 / 16 per 25     | flat                             |
| E20b       | first entry | 2 / 3 / 6 / 4 per 25         | flat and low                     |
| E20b       | last entry  | 13 / 8 / 12 / 9 per 25       | flat and higher                  |
| **E20c**   | **X**       | **18 / 20 / 27 / 30 per 50** | **ramp, 36% → 60%, CA z = 2.72** |
| E20c       | Y           | 32 / 31 / 27 / 30 per 50     | flat                             |
| E20c       | Z           | 38 / 37 / 35 / 34 per 50     | declining                        |

Contrasts per block, in points:

| Contrast          | Block 1 | Block 2 | Block 3 | Block 4 |
| ----------------- | ------- | ------- | ------- | ------- |
| E20 B − C         | −22     | −29     | −21     | −35     |
| E20b last − first | +44     | +20     | +24     | +20     |
| E20c Y − X        | +28     | +22     | 0       | 0       |
| E20c Z − X        | +40     | +34     | +16     | +8      |

**The same test was applied to all three experiments, and the difference in outcome is the point.** E20's B − C gap holds its sign in every quarter and ranges 21–35 points; E20b's first-versus-last gap is positive in every quarter, so its direction is stable even though its magnitude narrows. Both survive. E20c's two contrasts decay to 0 and +8 points, so neither does: averaging them over the run produces numbers dominated by the first hundred calls, and the honest report of an average of +28, +22, 0, 0 is "it decayed", not "+13 points". X ramps 36.0 → 40.0 → 54.0 → 60.0 across its own blocks (Cochran–Armitage z = 2.72, _p_ ≈ .007), while Y is flat (64 / 62 / 54 / 60, z = −0.65) and Z declines (76 / 74 / 70 / 68, z = −0.99).

**A counting note for that table.** The E20c rows count mechanical declarations naming **any** mode, which is how the block decomposition was computed; X and Z each contain one reply naming a mode other than `explain`, so those rows total 95 and 144 against the 94 and 143 published above. On the `explain`-only counts the rows read X 18 / 19 / 27 / 30 and Z 38 / 37 / 35 / 33, making the Y − X contrast +28 / +24 / 0 / 0 and Z − X +40 / +36 / +16 / +6. Nothing in this section depends on the difference; the decay does not.

**The 12.3 points is not a constant.** It is a time-average of a ramp: X's own rate moves 24 points inside a single run, so a batch-to-batch difference compares two points on two unknown trend lines. It should be quoted as _tens of points_ — enough to establish that a cross-batch comparison is unavailable, not a resolution to plan the next design against.

**Method rule M-10: stationarity is tested per arm, never assumed from interleaving.** An arm that ramps while its neighbours hold manufactures a contrast that decays, and no interleaving cadence can detect it.

### 5.3 The re-run: the ramp did not reproduce, the level moved

Arm X was re-run alone, 200 calls, identical prompts — all 200 prompt hashes match the originals.

| Run      | Block 1  | 2        | 3        | 4        | Total | Trend z   |
| -------- | -------- | -------- | -------- | -------- | ----- | --------- |
| Original | 18 (36%) | 19 (38%) | 27 (54%) | 30 (60%) | 47.0% | **+2.72** |
| Re-run   | 27 (54%) | 31 (62%) | 19 (38%) | 31 (62%) | 54.0% | **−0.06** |

The ramp was **not a stable property of the arm**. What did reproduce is the instability, in a different shape: the same condition scored 47.0% and 54.0% in two runs — the same order as the 12.3-point gap between two earlier batches. So §5.2 stands — a batch mean is not a stable quantity — while the specific monotone pattern does not. The four-block trend test detects a ramp and cannot detect a shift in level, which is why the rule's wording has since been widened.

### 5.4 The second model: the channel is a property of the model

A replication was attempted on `deepseek-v4-pro` — the same vendor that served as the independent second reader in §4.7, in an unrelated role — and stopped after 109 of 800 calls, for a reason worth stating plainly: **the second model never asked**.

| Arm               | n   | Declared `explain` | Other | Asked |
| ----------------- | --- | ------------------ | ----- | ----- |
| artefact stated   | 43  | 41 (95.3%)         | 2     | **0** |
| artefact excluded | 48  | 48 (100%)          | 0     | **0** |

Zero asks in 91 replies puts the 95% upper bound on that model's ask rate at **≈3.2%**. For the model this report uses, the ask rate over the same brief was 11–39% on E20's three lines and 43–85% on E20b's two positions — not a like-for-like magnitude, but the same kind of quantity.

The effect measured here is a difference in _whether the reply commits_, and a model that always commits has no room for it. Two things follow: the 27.5-point result is a statement about one model's ask threshold, not about routing in general; and mode choice on the second model was near-deterministic and independent of the line, which is consistent with the effect living in the threshold rather than in preference between modes.

A methodological consequence, recorded as **M-11**: a replication should screen for the channel first — about twenty calls, cents — rather than discover its absence at call 109. The 91 calls cost ≈€0.6; the 709 unspent calls would have measured a ceiling.

### 5.5 The construct decides the number

The same replies, two scoring rules:

| Construct                                      | B     | C      | Gap          |
| ---------------------------------------------- | ----- | ------ | ------------ |
| **Selection** (names a mode as the one to use) | 61.5% | 89.0%  | **27.5 pts** |
| **Mention-anywhere** (any mode name at all)    | 98.0% | 97.75% | 0.25 pts     |

Neither rule is wrong. They answer different questions, and the difference between them is the finding: on an ambiguous brief, both lines cause the model to _talk about_ the same modes almost always, and the two lines differ in whether it **commits**. Any future report must name the construct in the same sentence as the number. Readers comparing this figure against another benchmark's should check which rule that benchmark uses before treating the numbers as comparable.

### 5.6 Where the effect lives: ownership ambiguity

Six further briefs were screened for the two conditions the effect needs — a reply that sometimes asks, and `explain` as a plausible owner. **None passed both.** The failures came in two kinds, and the kinds are the useful part:

- **Mechanism questions close the ask channel.** "Why does this worker retry three times", "Why does the cache expire after sixty seconds", "Why does this function allocate a new list on every call" — thirty of thirty committed. Ownership is obvious, only the code is missing, and the code is requested _after_ the line has decided.
- **Change-friction questions open the channel but not for `explain`.** "Why is this module so hard to change?" produced genuine candidate lists and five asks in ten — exactly the channel E20 needs — yet every selection was `architecture-reviewer`, and `explain` was the candidate the replies dropped.

Seven briefs have now been screened across three attempts, sixty calls, about €0.35. Exactly one opens both conditions: E20's own brief, _"Explain why this module is structured the way it is."_ That is a **structural** question, where `explain` is the preferred owner but not the exclusive one.

The consequence is a narrowing, not a caveat: the 27.5 points are established on **one brief out of seven**, and any claim beyond that brief is an extrapolation. The population in which the effect applies is _requests whose mode ownership is ambiguous_ — still the population that matters, because it is where a catalogue has to help, but much narrower than "vague requests".

---

## 6. What this does not mean

- **Not a confirmation of the prediction.** The contrast is confirmatory — pre-declared, length-matched, clear of the ≥ 20-point threshold, same sign in all four quarters — and the prediction it was built to test is refuted. What is confirmed is that the line form matters; what is not confirmed is the mechanism the registration named.
- **Not a null result either.** The effect is measured, well outside the ruler, and its direction is stable across the run. What is missing is a pre-registered reading for its sign, not an effect.
- **Not a replication by the neighbouring arm.** A is artefact-_absent_, not artefact-_excluded_; its contrast against B is 46 characters confounded, and the registration says it "can never falsify anything on its own". Two lines that are _not_ the C form, on either side of B, both out-committed B (§4.3); neither is a replication of the exclusion effect.
- **Not about humans.** Every inference is about one model on one brief. No claim is made about human selection from the same picker.
- **Not about interaction.** Position and polarity were deliberately not crossed; nothing here says what their combination does. §9 lists that as the next experiment rather than as a finding.
- **Not generalisable across positions — including E20's own claim.** The polarity contrast was measured with the line held at **the seventh entry in all three arms**. It is a valid statement _at that position_ and nowhere else; the wording result is position-controlled, not position-randomised. It must not be read as "C beats B wherever C sits".
- **Not a fix for a vague brief.** Every arm in E20 stayed at 100% "appropriate", which is a definition rather than a result: "appropriate" is `declared ∨ asked`, so with no wrong commits in E20 the figure is arithmetic.
- **Not resolution at 10 points.** Effects below ~10 points remain out of reach at n = 400 and below ~19.8 points at n = 100; batch-to-batch variation is tens of points, so no claim may cross batches at all.
- **Not a clean instrument record.** Every record in every batch stamps `parserVersion: routing-round-parser/1`, not `/2`. The analysis code calls the v2 extractor, so the counts are probably what the pin promises, but the pin is a claim about the tool and is not evidenced in the data (§10.2, Defect 5).
- **Not one model's general behaviour.** Every number here is one model (`gemini-3.5-flash`) and one brief. The literature's 78.7–96.0% position result came from five models on tool selection; model-specificity is untested here, and §5.4 is the evidence that it is large.

---

## 7. What to do with it

Every item below rests on a number measured within one run. Items that rested on a withdrawn reading were **deleted rather than softened**, which is why the list is short.

### 7.1 If you are choosing a mode

**The brief matters more than the catalogue.** A request that says what is wanted gets the right mode almost every time; nothing in this report makes an unclear brief as good as a clear one. Everything below applies only to the ambiguous case.

1. **Assume the picker is doing some of the choosing for you.** Two systems with identical instructions but different list order committed at 15% and 45% on the same request, inside one run. If two modes look plausible for your task, name the outcome you want in the request ("find the cause and prove it" versus "map the dependencies") rather than relying on the mode you clicked.
2. **A clarifying question is not a failure.** Across 900 calls of the E20 wording arms the model never selected an unrelated mode; when it did not commit, it asked. Asking costs a turn — but it is usually cheaper than a commit to the wrong mode, and §4.4 shows the costly error is the wrong commit, not the question.
3. **Do not expect the same answer twice.** The same request, same model, same settings, hours apart matched its own commit/ask outcome only at chance, and two dispatches of 90 identical prompts agreed at or below chance. A retry is a fresh sample, not a repeat.

### 7.2 If you are writing `whenToUse` lines

1. **Make lines mutually exclusive, not merely descriptive.** The ask regime is dominated by candidate lists: replies that ask are replies that cannot separate `explain`, `architecture-reviewer`, `codebase-cartographer` and `decision-record`. Two lines that both plausibly cover "why is this like this" manufacture asking.
2. **Do not expect "must include X" to increase commitment.** The line naming what the answer must avoid out-committed the length-matched line naming what it must contain, by 27.5 points, in every quarter of the run. This is the report's one confirmatory result, and it is one brief, one model, one position: treat it as a hypothesis with a strong number behind it, not a rule.
3. **Weigh placement by harm, not by commitment.** Inside one run the last position committed 30 points more and produced 12 wrong commits per 100 against none at the first. If a mode is expensive to invoke wrongly, placement that suppresses wrong commits is worth more than placement that maximises uptake — but the harm arm resolves only ~19.8 points, so this is a judgement on a wide interval.
4. **Do not expect length alone to decide.** The 50-character line committed more than the 96-character line (75.0% against 61.5%) and less than the 99-character one (89.0%), so length does not order the arms. The 96-versus-99 contrast is length-matched, which is why the polarity reading rests on it and the length reading does not exist.

### 7.3 Auditing a mode line, or a class of requests

The instrument in this report has a practical use that costs almost nothing, and it is the most transferable output here.

**Feed a set of real requests to your picker and record whether the reply commits or asks.** A high ask rate on a request class means the catalogue cannot decide from it — which is actionable for the lines, the documentation and onboarding, and re-running the probe after a catalogue change shows whether it helped.

Five constraints make the difference between an honest probe and a magic number:

1. **Pin the model and report it.** The ask rate is model-specific (§5.4). The probe measures how often _this_ model asks with _this_ catalogue, not an absolute property of vagueness.
2. **Use ownership-ambiguous requests.** On a request with an obvious owner, both wordings commit and the probe reads 100% by construction (§5.6).
3. **Report the construct.** Selection and mention-anywhere differ by 27 points on the same replies (§5.5). State the rule.
4. **Ask twice, hours apart, before believing a difference.** Identical prompts agree at chance (§4.6). A single run cannot distinguish a catalogue change from sampling noise.
5. **Keep the replies.** The adjudication in this report cost more than the calls did; a probe that discards its text cannot be re-scored under a better rule.

A twenty-call screen of this kind is enough to reject a candidate brief, a candidate model, or a candidate line before spending money on a sweep. It is also the reason the second-provider replication stopped at call 109 for €0.6 rather than at call 800.

---

## 8. A template for one mode line

**What follows is untested guidance, not a recipe.** Each mode reaches the model as one line, assembled from three fields — the display **name**, the **slug** the reply is expected to return, and the **`whenToUse`** sentence. Only the last of the three varied in any experiment here, so it is the only part this report can speak to.

### 8.1 Four hypotheses, each with what stands behind it

| Hypothesis                                                                      | What stands behind it                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Make the line discriminate against its neighbours, not state a quality bar.** | **Confirmatory.** C out-committed B by 27.5 points (89.0% against 61.5%, _p_ ≈ 7 × 10⁻²⁰), length-matched at 99 against 96 characters, sign stable in every quarter (21–35 points). The lever moved commit-versus-ask; it did not change which mode was chosen.                   |
| **Do not add a requirement clause the other modes could also satisfy.**         | **Descriptive only, and length-confounded.** A (50 characters, artefact absent) out-committed B (96 characters, artefact stated) at 73–75% against 59–62%, but the lines differ by 46 characters and the registration says this contrast "can never falsify anything on its own". |
| **Do not rely on placing your mode at the end.**                                | **Withdrawn.** The experiment that would have supported it is inconclusive: its control arm ramped 36% → 60% inside the run, and the contrasts against control decayed to 0 (filler) and +8 (rival) points.                                                                       |
| **Expect the first entry to be penalised.**                                     | **Withdrawn.** That claim was a subtraction across two batches. What stands is within-run only: 15.0% at the first entry against 45.0% at the last, gap positive in all four quarters; the mechanism is not identified.                                                           |

### 8.2 The skeleton

```text
Name | slug | Use when <the situation in which this mode, and not its nearest neighbour, owns the outcome>,
and the answer must not <the thing the neighbouring modes produce instead>.
```

In the line the model actually receives, both gaps sit inside the `whenToUse` sentence — the first is its opening clause, the second its closing one — while the name and slug in front of them carry no effect this report can measure.

The gaps are deliberate; `<…>` is a placeholder, not text to publish. The first gap names a trigger narrow enough that a neighbouring line does not also match it. The second names an exclusion the neighbours do not impose — which is the form that measured 27.5 points ahead of the same clause stated as a requirement. Nothing here shows that either gap generalises, and no experiment has yet compared this skeleton against a line written any other way.

### 8.3 One worked example

Line C, annotated in the same three fields. The name and the slug were held fixed across all three wording arms — the entry was `explain` at the seventh position — so everything the experiment moved sits inside the `whenToUse` sentence:

```text
Explain | explain | Use when someone asks why code behaves as it does, and the answer must not merely describe the code.
```

- **The trigger** — "why code behaves as it does" — names a situation rather than a quality ("expert explanation"). Because C and B differ only in their second clause, the 27.5-point gap belongs to the exclusion, not to the trigger.
- **The exclusion** — "not merely describe the code" — names what the answer must avoid. Read as a design instruction, it is the one clause in the line that a neighbouring mode's line would not also satisfy.
- **What it does not do** — it does not claim the answer must cite evidence. That clause (line B) committed **least** of the three (61.5%), and it is a requirement other modes could satisfy.
- **What it costs** — nothing here says this line would win from the first entry. Placement can swamp wording, and no experiment yet shows how to buy position.

---

## 9. Recommended next experiments

Five would change what this report can say. Two have partly been run since the first draft — the X re-run (§5.3) and the second-provider pilot (§5.4) — and their outcomes are folded into the items rather than removed, so each item states what is left of the question. All five are within-run designs that publish a per-arm block decomposition beside every contrast; none requires new machinery.

1. **Why one arm ramped — asked, partly answered.** Arm X of E20c rose 24 points inside a 100-minute run while the arms interleaved with it did not. Three candidates were named, none observable from the client side: warm-up, provider-side caching or batching, and quota shaping. The 200-call re-run answers the first question and not the second: the ramp does not reproduce (z = 2.72 → −0.06) but the level moves 47.0% → 54.0%. What is left is not "does it ramp" but "what makes one batch sit seven points above another", and that needs a design which varies batch conditions deliberately and records them, not another trend test.
2. **`explain` first with the rival last, against a control in the same batch.** The first-versus-last difference is unexplained, and the slot-occupant experiment was inconclusive because its control arm ramped. One batch, three arms — `explain` first with the rival last, `explain` last with the rival first, and the same control — each tested for stationarity before any contrast is read, would separate a first-entry penalty from a last-entry reward from a neighbour effect.
3. **A brief that passes the screen.** Everything here is one point in ambiguity space, and six further briefs were screened without producing a second one. The next step is therefore not "another brief" but a brief that both opens the ask channel and leaves `explain` a plausible owner; until one is found, the 27.5 points remain a result about a question of one kind.
4. **A model that asks.** The second provider is provisioned and was tried: it asked not once in 91 replies, so the channel this effect lives in does not exist there and the contrast cannot be measured on it. What is needed is a provider with a comparable ask rate, established before any draws are spent.
5. **Position crossed with wording.** Neither lever has been tested in the presence of the other. Given §5.2, this needs a fresh registration and all arms in a single batch, with the block decomposition published beside every contrast.

### 9.1 Still open

1. **The reversal needs a within-batch replication, on a brief that passes the screen.** §5.1's effect contradicts the registration's prediction and §5.2 rules out reading a cross-batch copy of it, so the replication needs a new registration; one brief out of seven makes finding the second brief the binding constraint.
2. **The harm measure is underpowered.** 12% against 0% is the most policy-relevant number here and the least precise: the design resolves about 19.8 points at n = 100. A wrong-commit arm at n = 400 is the cheapest useful follow-up and needs no new machinery.
3. **Extractor v3.** 27 of 378 adjudicated replies (7.1%) were commitments the pinned parser missed, and 21 of 600 E20c replies were bare slugs. The merge step also cannot represent an adjudicated commitment to a non-key slug (§10.3). This should land before the next round spends money.

---

## 10. Self-audit

This section exists because a benchmark that only publishes what survived is publishing a highlight reel. Everything below was found by the programme's own red-team pass or by reconciling its own files, and each item changed the report.

### 10.1 Three claims withdrawn

1. **"A penalty for the first entry."** An earlier draft derived this from comparing an arm of the position experiment against an arm of the slot-occupant experiment — a subtraction **across two batches**. The identical condition then measured 12.3 points apart in two batches (§5.2), which is larger than the design's own resolution, so the subtraction estimates nothing. Withdrawn. What remains is the within-run difference in §4.4, with the mechanism unidentified.
2. **"The placement advice does not survive."** An earlier draft quoted the registration's "≤ 10 points" reading as frozen and then concluded the opposite of what that reading says. That is outcome switching regardless of who wrote it. Neither "survives" nor "does not survive" is earned: the run is **inconclusive**, and the honest sentence is that a plausible rival placed last was not selected, while the effect of changing the occupant decayed to nothing.
3. **"Order effects are about the first entry."** Same defect as (1), stated differently. Withdrawn with it.

A fourth item was corrected rather than withdrawn: the extractor-miss count is **27 of 378 (7.1%)**, not 28 (7.4%) — the older figure counted a reply naming `architecture-reviewer` as a missed commitment to the key.

### 10.2 Recorded defects

| #     | Defect                                                                                                                                                                                                                                                                                                                                                    | Status                                                              |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| **1** | **The pinned extractor misses commitments.** 27 of 378 (7.1%) were commitments it could not parse: bare slug, bare backticked slug, `**mode: slug**`, unbolded `Selected mode:`, slug followed by prose. All but one named `explain`. It recurred in E20c, where 21 of 600 replies were a bare slug.                                                      | Open — extractor v3 (§9.1)                                          |
| **2** | **The merge step cannot represent an adjudicated wrong commit.** [`mergeJudgements`](https://github.com/xavier-arosemena/roo-plus/blob/master/scripts/lib/adjudication.mjs#L551) counts every adjudicated `DECLARATION` as a declared key, justified by the claim that a non-key slug never reaches the packet. That held in E20 and failed once in E20b. | Open — every published table carries the corrected split (§10.3)    |
| **3** | **The registration is sign-blind in its thresholds and sign-specific in its readings.** The decision table supplies a reading for "≥ 20 points" that asserts a direction, so a reversed ≥ 20-point result has no pre-registered reading.                                                                                                                  | Fixed for the next round: **M-6** requires a reading for both signs |
| **4** | **A gate can be quoted out of context.** The 60-draw E20c gate inverted two arms against the full sweep (X 65.0%, Y 45.0%, Z 65.0%). The gate is registered for exclusion and clustering only; its rates carry no reading.                                                                                                                                | Documented — rates not quotable                                     |
| **5** | **The extraction pin is not evidenced in the data.** Every record stamps `parserVersion: routing-round-parser/1`, while the analysis calls the v2 extractor. The counts are probably what the pin promises; the pin is not attested by the records.                                                                                                       | Open                                                                |
| **6** | **The sealed key and the registration disagree on vocabulary size.** The key carries **45** slugs; the registration describes the union as **47**. No declaration was affected — the vocabulary used is the one the key supplies — but one of the two should be corrected before re-sealing.                                                              | Open                                                                |

### 10.3 The counting reconciliation

Two published numbers could not both be right, so both were re-derived from the raw files rather than from each other.

**The last-entry arm of E20b is 45.0%, not 46.0%.** `runs/e20b-2026-11-16/adjudication/packet.jsonl` holds 132 undetermined replies; the join maps them to the two blind arms; `judgements-deepseek.jsonl` carries the analyst's verdicts and `judgements-deepseek-v2.jsonl` the independent pass under the selection rule. The last arm has four declarations: three name `explain` (two bare backticked slugs, one slug followed by goal prose) and one is the single line `architecture-reviewer`.

- Last arm: 42 mechanical `explain` + 3 adjudicated = **45**, with 11 mechanical declarations of another mode plus the adjudicated `architecture-reviewer` = **12 wrong commits**, 43 asks.
- First arm: 15 mechanical + 0 = **15**, 85 asks, 0 wrong.

Both sum to 100. The 46.0% came from a merge step that counts _every_ adjudicated declaration as a declared key, which is right for "did the reply select a mode" and wrong for "did the reply select **the key**" — the 46 includes a commit to the mode the reply was marked wrong for. The statistics were re-derived and validated by reproducing a previously published contrast before being applied: 15 against 45 gives _p_ = 5.55 × 10⁻⁶ and CI [17.5, 41.3]; the harm figure of 12 is untouched, which is the check that the split is right.

**E20c's corrected totals are 98 / 131 / 152 (49.0 / 65.5 / 76.0)**, confirmed by 24 declarations across the 241 undetermined replies, matching the +4 / +11 / +9 column. An interim table printed a bare-slug column of +3 / +10 / +8 beside those totals, which did not add up (94 + 3 is 97, not 98); the totals are right and the column was wrong.

### 10.4 Method rules that came out of it

Each of these was bought with a specific failure in this programme. They are stated as checks so that a future round can be audited against them rather than trusted.

| Rule                                                                                                                 | Bought by                                                       |
| -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **M-1** A headline automatic metric gets a manual pass before it is quoted; the disagreement class is named          | the abstention artefact, and three incompatible hit definitions |
| **M-6** Every threshold in a decision table carries a reading for both signs, or it is sign-agnostic by construction | Defect 3                                                        |
| **M-7** A judgement that could be biased is made blind, with the tie-break fixed before the data                     | the adjudication protocol                                       |
| **M-8** A resolution limit is stated before the run, not in a caveat after it                                        | §3.5                                                            |
| **M-9** Every contrast is within-run, or it is not a contrast                                                        | E20c arm X against E20 arm B, 47.0% vs 59.3%                    |
| **M-10** Stationarity is tested per arm, never assumed from interleaving                                             | the ramp in E20c arm X                                          |
| **M-11** A replication screens for the channel that carries the effect before it spends draws                        | the second-provider pilot, stopped at call 109                  |
| **M-12** A classification rule is validated on a sample before it scores a corpus                                    | the 11.1% agreement under the mention rule                      |
| **M-13** A brief is screened for both conditions the effect needs before it is swept                                 | six screen failures across three attempts                       |
| **M-14** A published count is re-derived from its components by a second route before it is quoted                   | the 46.0% figure, and two adjacent columns that did not sum     |

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

Costs are published because every finding here is credible partly because the cost of finding it is visible. A programme that hides its spend is asking to be believed on trust.

| Item                           | Value                                                                                                               |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Published E20 batch            | `runs/e20-2026-11-17` — 900 records, 16M                                                                            |
| Published E20b batch           | `runs/e20b-2026-11-16` — 200 records, 3.7M                                                                          |
| Published E20c batch           | `runs/e20c-2026-11-17` — 600 records, 600 `RUN`                                                                     |
| Gate (E20)                     | `runs/e20-gate-2026-11-16` — 90 records, 1.9M                                                                       |
| Gate (E20c)                    | `runs/e20c-gate-2026-11-17` — 60 records, exclusion and clustering only                                             |
| Aborted E20 attempt (excluded) | `runs/e20-2026-11-16` — 781 records, 15M                                                                            |
| Closing round preserved        | `runs/e13r-2026-11-12` — 600 records, 600 prompts, 5.5M                                                             |
| Calls producing output         | **2,591** (90 gate + 741 aborted + 900 E20 + 200 E20b + 60 E20c gate + 600 E20c)                                    |
| Cost                           | ≈ **€13.21** (2,591 calls at €5.1 per 1,000) — rate-derived, not read from billing                                  |
| Wall clock                     | gate 13.2 min · E20 135.8 min · E20b 32.3 min · aborted 106.9 min · E20c gate 9.3 min · E20c 100.0 min = **6.62 h** |
| Mean duration per call         | 8.83 s gate · 9.05 s E20 · 9.70 s E20b · 10.00 s E20c; weighted **9.43 s** over 1,850 published calls               |

**Programme-wide**, including the closing round's 600 calls and a 9-call smoke test: **3,200 calls**, ≈**€16.32** at the same rate.

**Deviations, all recorded rather than smoothed:**

1. **The first E20 batch aborted** at 781/900 when prepayment credits were depleted (HTTP 402), leaving 40 `UNRUN` records (5.1%; 5.2% per long arm). That batch refuses and publishes no estimate; it is preserved untouched. A fresh full batch was dispatched after top-up into a **new** directory, because the instrument has no resume path and a spliced tail would place a fixed block of failures inside the outcome sequence the runs test is meant to inspect.
2. **Pooling was declined**, and this is evidenced rather than cautious: the two batches are independent draws (§4.6), so pooling would legitimately add information — it would move the primary contrast from 27.5 to 25.7 points and leave the verdict unchanged — but it breaks the registered n and would require adjudicating 223 more replies. The comparison is reported instead.
3. **Cost overran the combined €9.4 estimate for E20 and E20c, and a sub-total inside that estimate was wrong.** The overrun has two causes: the discarded partial batch (741 paid calls ≈ €3.8) and E20c's published batch running 100.0 minutes at 600 calls (€3.06) plus its 60-call gate (€0.31). Counts per stage as they stand on disk: E20 gate 90, aborted E20 781 records of which 741 paid, published E20 900, E20b 200, E20c gate 60, E20c 600, closing round 600, smoke test 9.

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

| Arm   | Line      | n   | Mechanical declared | Adjudicated | Final declared key | Asked | Wrong commit | Appropriate |
| ----- | --------- | --- | ------------------- | ----------- | ------------------ | ----- | ------------ | ----------- |
| ARM-1 | B (96 ch) | 400 | 237                 | +9          | **246 (61.5%)**    | 154   | 0            | 100%        |
| ARM-2 | A (50 ch) | 100 | 73                  | +2          | **75 (75.0%)**     | 25    | 0            | 100%        |
| ARM-3 | C (99 ch) | 400 | 344                 | +12         | **356 (89.0%)**    | 44    | 0            | 100%        |

**E20b** (same brief, line held at B)

| Arm   | Position    | n   | Mechanical declared         | Adjudicated | Final declared key | Asked | Wrong commit | Appropriate |
| ----- | ----------- | --- | --------------------------- | ----------- | ------------------ | ----- | ------------ | ----------- |
| ARM-2 | first entry | 100 | 15                          | +0          | **15 (15.0%)**     | 85    | 0            | 100%        |
| ARM-1 | last entry  | 100 | 53 (42 `explain`, 11 other) | +3          | **45 (45.0%)**     | 43    | **12**       | 88%         |

> **Two counting definitions meet here, and only one is a declared key.** The last arm's 53 mechanical declarations are not all of `explain`: 42 name it, 11 name another mode and are the wrong commits. Of the 47 undetermined replies, the blind pass returned four declarations — three naming `explain` and one the bare slug `architecture-reviewer`. The declared-key total is therefore **45**, the wrong-commit total **12** (11 mechanical + 1 adjudicated), and the asks **43**. Counting all four adjudicated declarations as declared keys gives 46; that is the merge tool's figure, it double-counts a commit to a different mode, and it is not used (§10.3).

---

## Annex D — Pre-declared statistical tests

| Contrast                                                 | Declared rates | Difference    | 95% CI         | Exact two-sided _p_ | Holm-adjusted |
| -------------------------------------------------------- | -------------- | ------------- | -------------- | ------------------- | ------------- |
| **E20 primary: B vs C**                                  | 61.5% vs 89.0% | **−27.5 pts** | [−33.1, −21.7] | 7.1 × 10⁻²⁰         | < 10⁻¹⁹       |
| E20 secondary: A vs B _(length-confounded, descriptive)_ | 75.0% vs 61.5% | +13.5 pts     | [+3.1, +22.4]  | .0141               | .0141         |
| **E20b: first vs last**                                  | 15.0% vs 45.0% | **−30.0 pts** | [−41.3, −17.5] | 5.6 × 10⁻⁶          | 5.6 × 10⁻⁶    |
| E20b harm: wrong commits, last vs first                  | 12.0% vs 0.0%  | +12.0 pts     | [+5.8, +19.8]  | 3.4 × 10⁻⁴          | —             |
| E20c rival capture: Z vs X                               | 1 vs 1         | not estimated | —              | —                   | —             |
| E20c explain shift: Y vs X                               | 60.0% vs 47.0% | not estimated | —              | —                   | —             |
| E20c explain shift, unregistered: Z vs X                 | 71.5% vs 47.0% | not estimated | —              | —                   | —             |

Holm within each experiment (E20: two tests, primary evaluated at α = .025; E20b: one). Minimum detectable difference: **~10 points at n = 400**; **~19.8 points at n = 100**; **14.0 points at n = 200**, per the E20c registration.

The E20c rows carry **no difference, no interval and no adjusted _p_**, for three reasons, one per column: the control arm is not stationary, so a difference between two arms averaged over the run is not an estimate of anything (M-10); both contrasts decay across the blocks (§5.2), so no interval would describe them; and the counts behind them are mechanical, with 241 of 600 replies unresolved by the extractor. The declared rates are printed for traceability, not as an effect.

---

## Annex E — Runs tests (outcome dependence)

| Arm                 | Runs observed | Runs expected | z         | _p_  |
| ------------------- | ------------- | ------------- | --------- | ---- |
| ARM-1 (B)           | 193           | 190.42        | 0.27      | .79  |
| ARM-2 (A)           | 37            | 38.50         | −0.40     | .69  |
| ARM-3 (C)           | 81            | 79.32         | 0.43      | .67  |
| ARM-2 (first entry) | 31            | 27.88         | 1.18      | .24  |
| ARM-1 (last entry)  | 52            | 50.50         | 0.30      | .76  |
| E20c X              | 101           | 100.64        | +0.05     | .96  |
| E20c Y              | 114           | 97.00         | **+2.51** | .012 |
| E20c Z              | 81            | 82.51         | −0.26     | .79  |

No E20 or E20b arm shows sequence dependence, and that is the guard the verbatim check cannot provide. The E20c rows are not a comfort: they are computed on the mechanical `explain` sequence, and **Y has more runs than chance** — 114 against 97 expected, z = +2.51, _p_ ≈ .012 — which is dependence in the _alternating_ direction rather than the clustered one, and would pass both the verbatim guard and the exclusion guard. Counting declarations to any slug instead moves X to z = −0.25 and Z to z = −0.11 and leaves Y unchanged.

A runs test detects dependence, not trend: that is why §5.2's block decomposition, and not this table, is what demoted E20c.

---

## Annex F — Run-to-run concordance (same prompts, two dispatches)

| Arm | Overlapping draws | Same commit/ask outcome | Chance-level agreement | Identical transcript |
| --- | ----------------- | ----------------------- | ---------------------- | -------------------- |
| B   | 329               | 175 (53.2%)             | 51.7%                  | 0 (0.0%)             |
| A   | 83                | 45 (54.2%)              | 55.3%                  | 0 (0.0%)             |
| C   | 329               | 234 (71.1%)             | 73.5%                  | 0 (0.0%)             |

Agreement at chance and zero verbatim repetition together establish that calls are independent samples. This is a free by-product of the aborted batch, and it is the strongest available statement about `temperature: 0` on this model.

---

## Annex G — Adjudication protocol and recorded defects

| Item                                | Value                                                                                                                                  |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Replies adjudicated                 | 378 (E20: 246 of 900; E20b: 132 of 200)                                                                                                |
| Pass 1                              | 246 + 132 verdicts; E20 **23 DECLARATION / 223 ASK**; E20b **5 DECLARATION / 127 ASK**                                                 |
| Pass 2 coverage (initial)           | 50 of 378 (13.2%) — all 28 declarations plus 22 sampled asks — 100% agreement under the registered rule                                |
| Pass 2 coverage (independent, full) | **378 of 378**, different model, blind packet — 11.1% agreement under the registered rule, **99.7%** under selection-vs-mention (§4.7) |
| Blindness assertion                 | **PASS** on both packets: no arm label, no run id, no timestamp, no registered line text                                               |
| Join discipline                     | outside the packet directory; opened only after every verdict was recorded                                                             |

**What "blind" means after publication, and what it does not.** The packet carries no arm, no draw number and no timestamp, and the join was opened only after every verdict was recorded — but `adjudication-join.json` is now published beside the packet, so any reader can join the two. Blindness here is a property of the **procedure**, not of the published artefact set, and the distinction is worth keeping in view when this protocol is cited. The same caveat applies to `blindSeed` in `plan.json`: publishing the seed of a completed packet is harmless, but the seeding scheme should not be reused for a packet that is still open.

Defects 1–6 are tabulated in §10.2. The two that touched a published number are Defect 2 (the merge step's treatment of a non-key declaration) and Defect 3 (a sign-blind threshold with a sign-specific reading); both are reconciled in §10.3 and neither changes the effect.

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

The X and Z rows count declarations naming any mode (95 and 144 in total); the `explain`-only totals are 94 and 143, and §5.2 prints both versions of the per-block contrasts.

**Readings, and their status.**

| Contrast               | Mechanical | Corrected | Status                                                                                                                      |
| ---------------------- | ---------- | --------- | --------------------------------------------------------------------------------------------------------------------------- |
| Rival capture (Z vs X) | 1 vs 1     | —         | **Not estimable at this n** — 56 of Z's 200 replies unresolved. The reading is not applied and its opposite is not claimed. |
| Explain shift (Y vs X) | +13.0      | +16.5     | Inside the 10–20 indecisive band by construction, but the arms are not stationary, so not even "indecisive" is applied.     |
| Explain shift (Z vs X) | +24.5      | +27.0     | Unregistered, and the per-block contrast decays (+40, +36, +16, +6), so the average is not a magnitude to quote.            |

**Verdict: inconclusive.** Arm X ramps 36% → 60% inside its own run and both contrasts decay to 0 and +8 points, so no average of them estimates anything. The 241 undetermined replies have since been adjudicated, which moves the levels to 49.0 / 65.5 / 76.0 without touching the decay — the arms are still not stationary, which is why the verdict does not change. What survives is narrower than the registration anticipated: a plausible rival placed in the last slot was selected twice in 600 replies, so it does not capture the slot.

**Zero-based numbering.** This is the only place the fixture's own indexing appears. The fixture counts entries from zero: with 45 entries, the first entry is 0, the seventh is 6, and the last is 44.

**Gate (60 draws, 20 per arm).** X 65.0%, Y 45.0%, Z 65.0% — the gate exists for exclusion and verbatim clustering only; those rates are noise and are not quotable.

**Provenance.** `runs/e20c-2026-11-17` — 600 records, 600 `RUN`, 100.0 min, 10.00 s mean; `runs/e20c-gate-2026-11-17` — 60 records, 9.3 min.

---

## Annex I — The second-provider pilot

Run on 2026-11-18 against a second provider, stopped at 109 of 800 calls. All 91 output-producing replies across the two wording arms:

| Arm                   | n   | Declared `explain` | Other picks               | Asked | Distinct strings |
| --------------------- | --- | ------------------ | ------------------------- | ----- | ---------------- |
| B — artefact stated   | 43  | 41 (95.3%)         | 2 `codebase-cartographer` | 0     | —                |
| C — artefact excluded | 48  | 48 (100%)          | none                      | 0     | —                |

Five distinct strings across 91 replies, every one a mode name. Failures: five replies truncated to empty content at a 4,096 cap, because a reasoning model spends the output budget on hidden reasoning before answering; one empty completion. All six failures were in arm B, which is why dropping them rather than raising the cap would have biased the comparison.

Cost: ≈€0.6. The 709 calls not spent would have measured a ceiling.

---

## Appendix 1 — check any number in ten minutes

The point of pre-registration is that a reader can audit the result without re-running it. Each row names the claim, the file that holds the evidence, and what to look at.

**What is in these files, and what is not.** Per call, `results.jsonl` records the index, run id, arm label, draw number, brief id, the prompt's SHA-256, the model and temperature, status and exit code, timestamps, the full request transcript, the full reply, the finish reason, the output cap and the parser version; `plan.json` carries the 45-entry picker with the expected key for each arm. They contain **no credentials, no API keys, no request headers, no hostnames or endpoints, no account or project identifiers, and no user data**. Every prompt is a synthetic fixture; the sweep scripts read keys from an untracked `.env` and print only a key's length.

The exposure is instead scientific, and it should be stated rather than discovered: the fixture is **burned**. A reader can now see which line belongs to which arm and which slug the key expects, so this picker and this brief cannot be reused as a blind test. A replication needs a new fixture. That is the cost of publishing the evidence, not a reason to withhold it.

| Claim                                              | File                                                                                                                                     | What to look at                                                       |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 246/400, 75/100, 356/400                           | `runs/e20-2026-11-17/results.jsonl`                                                                                                      | one record per call: `finishReason`, `content`, arm label in the plan |
| The wording of each arm                            | `runs/e20-2026-11-17/plan.json`                                                                                                          | the three `whenToUse` variants and the interleaved cycle              |
| Adjudicated replies and their verdicts             | `runs/e20-2026-11-17/adjudication/`                                                                                                      | `packet.jsonl` (blind), `judgements-*.jsonl`, `join.json`             |
| 15/100 against 45/100, 12 wrong commits            | `runs/e20b-2026-11-16/results.jsonl`                                                                                                     | arm label per draw; count replies naming a non-key mode               |
| 94/120/143 mechanical                              | `runs/e20c-2026-11-17/results.jsonl`                                                                                                     | block boundaries are every 50th draw                                  |
| The ramp, and the re-run that did not reproduce it | `runs/e20c-2026-11-17`, `runs/e20c-x-rerun-2026-11-18`                                                                                   | per-block counts, then the same computation on the re-run             |
| The 99.7% agreement                                | `runs/adjudication-work/`                                                                                                                | the second-reading report and the two judgement files                 |
| The seventeen corrections and their order          | [`modes-experiment-log.md` §§23–30](https://github.com/xavier-arosemena/roo-plus/blob/master/docs/research/modes-experiment-log.md#L831) | append-only; corrections are recorded, not edited in place            |

`prompts/` and `transcripts/` are excluded from the repository because they are regenerable from `results.jsonl`. If a count and its neighbouring column disagree, the count is re-derived from the raw file — that is **M-14**, and it caught two errors here.

---

_Prepared for the Research Reports discussion category. Keywords: `agentic-coding`, `agentic-ide`, `coding`, `vscodium-extension`, `llm-evaluation`, `reproducibility`._
