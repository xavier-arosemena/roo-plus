# How a single sentence in a mode menu changes what an autonomous coding agent selects: a pre-registered routing benchmark

**Manuscript prepared for submission. Not peer reviewed.**

> **DO NOT SUBMIT — revision required (2026-11-23).** Two claims in this draft are known to be incomplete or wrong after the R0 round. The reported position effect (30 points, first versus last entry) holds only in the picker layout the experiments rendered, which **is not the layout the product emits**; in the product's layout the same contrast is −9 points and not distinguishable from zero. The paper also reports Fisher intervals as primary, which assume independent draws; 100 identical calls subsequently moved 24 points inside one run, and the paired sign tests are now the primary statistic. The Abstract, §3.1–§3.8, §4.5, §5.2–§5.3, §6.4 and Table 5 all require amendment before submission. The itemised list is in **Revision required before submission**, at the end of this file. The wording result is unaffected and is larger in the product's rendering.

| Field                    | Value                                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------- |
| **Authors**              | [[AUTHOR 1]]¹, [[AUTHOR 2]]¹                                                                                  |
| **Affiliations**         | ¹ [[INSTITUTION, CITY, COUNTRY]]                                                                              |
| **Corresponding author** | [[NAME]], [[EMAIL]], ORCID [[0000-0000-0000-0000]]                                                            |
| **Article type**         | Original research (empirical benchmark study)                                                                 |
| **Keywords**             | agentic coding; mode selection; tool selection; LLM evaluation; pre-registration; reproducibility             |
| **Main text**            | ~6,400 words including tables, excluding abstract, references and supplementary material (abstract 426 words) |
| **Tables / figures**     | 8 tables, 3 figures, 12 supplementary sections                                                                |
| **Data and code**        | Public repository; DOIs to be minted before submission (see Declarations)                                     |

---

## Abstract

**Objective.** When an autonomous coding agent must select one of many behaviour presets ("modes") from a single line of metadata per mode, two author-controlled levers are available: the wording of the descriptive line, and the position of the entry in the list. Neither has been measured inside a mode menu. We estimate the causal effect of each lever on whether the agent **commits** to the target mode or **asks** for missing information, on a request whose mode ownership is ambiguous.

**Methods.** Three pre-registered, interleaved experiments using one model (`gemini-3.5-flash`, temperature 0), one 45-entry menu, and one ambiguous request. E20 (n = 900) varied one clause of the target mode's descriptive line across three arms, two of which were length-matched (96 vs 99 characters). E20b (n = 200) varied the target's position between the first and last entry. E20c (n = 600) varied the occupant of the last entry by swap. The outcome was defined on **selection** (naming a mode as the one to use), not on mention; all replies the pinned extractor could not resolve were adjudicated blind, and independently re-adjudicated by a second model.

**Results.** The primary contrast favoured the **negative** formulation: a line stating what the answer must not be produced commitment in 89.0% of replies against 61.5% for a length-matched line stating an evidence requirement (difference 27.5 percentage points, 95% CI 21.7–33.1, exact _p_ = 7.1 × 10⁻²⁰), opposite to the registered prediction and stable in sign across all four quarters of the run. Position produced a 30.0-point difference between the first and last entry (15.0% vs 45.0%, 95% CI 17.5–41.3, _p_ = 5.6 × 10⁻⁶) with no identified mechanism, and traded 12 wrong selections per 100 for that commitment. E20c was inconclusive because one arm drifted within the run (36.0% → 60.0%, Cochran–Armitage z = 2.72). Block-level dispersion ratios for the two confirmatory contrasts were ≤ 1.0, and both survive variance inflation by a factor of 6 or more. A second model asked for clarification in 0 of 91 replies, bounding the effect's channel to models with a comparable ask threshold. The effect was reproduced on 1 of 7 screened requests.

**Conclusions.** The descriptive line materially changes commitment on ambiguous requests, in a direction that contradicts the prevailing design heuristic that a requirement clause increases uptake. Position effects are large enough to invalidate cross-batch comparisons of menu designs but are not yet attributable to a mechanism. Both findings are conditional on one model, one request class and one construct, and we report the conditions under which each would be falsified.

---

## 1. Introduction

Autonomous coding agents increasingly expose a catalogue of behaviour presets — "modes" — that bundle instructions, tool permissions and role definitions. In a large catalogue the menu is a retrieval problem: the agent receives one line per mode and must map a natural-language request onto one of them, or decline to choose. The line is short. In the system studied it is assembled from three fields,

```text
  * "<name>" mode (<slug>) - <whenToUse>
```

where `whenToUse` is a sentence written by the catalogue author [modes.ts, line 33].

Two levers are therefore available to an author who wants a mode to be selected: what the sentence says, and where the entry sits. Design guidance asserts both. Interface conventions recommend verb-first, task-oriented labels; agent-framework documentation recommends describing _when_ to use a tool rather than _what_ it does. None of this guidance is supported by a measurement inside a selection menu, and the one factor-isolated study of tool selection reports that names matter little while position can dominate when names are the only difference.

The practical stakes are asymmetric in a way that the guidance does not acknowledge. A refusal to choose — a clarifying question — costs the user one turn and frequently resolves correctly on retry. A commitment to the wrong mode costs a task, because the agent then operates under the wrong instructions and permissions. A menu design that maximises uptake may therefore increase harm. This asymmetry motivates measuring **commitment and correctness separately**, which the automated evaluation literature has largely failed to do: the leading agent function-calling benchmark constructs turns on which asking is the expected response and then excludes those turns from scoring.

### 1.1 Contributions

1. The first factor-isolated measurement, to our knowledge, of descriptive-line polarity inside a mode menu, with a length-matched primary contrast and a pre-specified decision rule.
2. A within-run estimate of entry-position effects, together with a demonstration that the design required to explain them was destroyed by an arm × time interaction that interleaving cannot remove.
3. A quantified demonstration that the headline effect is **construct-dependent**: 27.5 points under a selection rule, 0.25 points under a mention-anywhere rule, on the same replies.
4. Block-level dispersion diagnostics showing that the two confirmatory contrasts show no evidence of overdispersion, while the arm that invalidated the third experiment does.
5. Negative and ceiling results reported in full: an inconclusive experiment, a six-request screening failure, and a second model for which the effect's channel does not exist.

### 1.2 Scope

We estimate the effect of menu wording and menu position on the response distribution **conditional on a fixed request, a fixed menu and a fixed model**. We do not estimate a population effect across requests, models or catalogues, and §6.4 states why the design cannot.

---

## 2. Background and related work

### 2.1 Metadata and tool selection

The only factor-isolated study of tool selection we identified varies metadata level (parameter schema, description, name) across five models and five tasks, with metadata drawn from 367,174 tools, balanced positions, and conditional logistic regression to recover position-adjusted effects. It ranks the levers schema > description > name, with names excluding zero in 6 of 29 estimates. The present study inherits that ordering: the descriptive sentence is the description lever, and the display name is the weakest available.

### 2.2 Position

The same study reports the first-listed entry selected in 78.7–96.0% of trials when names are the only difference between entries. No factor-isolated study we could locate had varied position inside a mode menu. Two literatures offer adjacent evidence without testing it: serial-position research in list selection, and information-scent research in menu search, which predicts that specificity rather than position governs choice. The direction of our position result (§4.5) is opposite to the tool-selection finding, and we cannot adjudicate between them.

### 2.3 Abstention and its measurement

Asking rather than acting is a named expectation on missing-parameter turns in the principal agent function-calling benchmark, whose scorer does not evaluate those turns. Instructing a model not to ask leaves decision quality unchanged while raising its official score by 13.5–23.5 points. This is the same instrument defect that produced a false null in the programme preceding this study (§3.7), and it is the reason the outcome here is defined on commitment rather than on accuracy.

### 2.4 Label form

Verb-first naming is a documented convention in several public design systems. Nominalisation research explains why a "-tion" noun is ambiguous between an event and its result, which is a plausible mechanism for label-form effects but not a measurement of them. We located no study comparing a verb-named with a noun-named entry while holding all else fixed, in any domain. We therefore do not test label form here; we vary only the sentence content, and §6.2 states the consequence.

### 2.5 Evidence appraisal

Table 1 grades each load-bearing source. Two of the four strongest sources are unpublished preprints, and three rest on a single study. This study is not a replication of any of them; it is the first measurement in a setting they do not cover.

**Table 1.** Appraisal of prior work bearing on the research question.

| Claim                                                                                            | Source                                              | Design                                                 | Status                 | Grade |
| ------------------------------------------------------------------------------------------------ | --------------------------------------------------- | ------------------------------------------------------ | ---------------------- | ----- |
| Description outranks name; schema outranks both                                                  | Li, Qiao & Gao (2026)                               | 5 models × 5 tasks, factor-isolated, position-adjusted | Preprint, unreplicated | B     |
| First-listed entry chosen in 78.7–96.0% under name-only comparison                               | Li, Qiao & Gao (2026)                               | as above                                               | Preprint, single study | B     |
| Benchmarks omit abstention turns from scoring; suppressing abstention raises score 13.5–23.5 pts | Asking Earns Nothing (2026)                         | one benchmark, one scorer variant                      | Preprint, unreplicated | B     |
| Verb-first labels are conventional                                                               | GOV.UK (n.d.); Microsoft Learn (n.d.); Kaley (n.d.) | style guidance, no measurement                         | Editorial guidance     | D     |
| Nominalisations are ambiguous between event and result                                           | Kawaletz & Plag (2015); Barsalou et al. (2010)      | linguistic theory and experiments outside this domain  | Established in domain  | C     |
| Specificity governs menu search; position does not                                               | Budiu (n.d.); Katz & Byrne (2003)                   | human menu search                                      | Adjacent domain        | C     |

Grade A: multiple independent replications. B: single study or unreplicated preprint. C: established in an adjacent domain. D: guidance without measurement.

### 2.6 Positioning

The literature predicts that descriptions matter, offers no measurement of line polarity or entry position inside a menu, and is itself unpublished in two load-bearing cases. The question addressed here had no prior measurement to confirm or deny, which cuts both ways: any result is new, and any result is unanchored. We therefore treat the study as **hypothesis-generating with one confirmatory test**, not as a benchmark of established effects.

---

## 3. Method

### 3.1 Design and estimands

All three experiments use a single-factor, multi-arm, individually randomised design with interleaved allocation. The unit of randomisation and of analysis is the **API call** (one request–response pair); the request, menu and model are fixed by design.

**Primary estimand.** For a fixed ambiguous request _q_, fixed menu _M_ and fixed model _m_, let _Y_ = 1 if a reply selects the target mode under the selection construct (§3.5), and 0 otherwise. The primary estimand is the difference in Pr(_Y_ = 1) between two menu variants that differ only in the closing clause of the target's descriptive line:

> τ = Pr(_Y_ = 1 | _M_<sub>C</sub>) − Pr(_Y_ = 1 | _M_<sub>B</sub>)

where _M_<sub>B</sub> states an evidence requirement and _M_<sub>C</sub> a prohibition of equal length. Because _q_, _M_ and _m_ are fixed rather than sampled, τ is a property of this (request, menu, model) triple and does not generalise over them by construction. §6.4 discusses the consequence.

**Table 2.** Design summary.

| Experiment | Factor                              | Levels                                            | Allocation                                  | n               | Estimand                                             |
| ---------- | ----------------------------------- | ------------------------------------------------- | ------------------------------------------- | --------------- | ---------------------------------------------------- |
| E20        | Closing clause of the target's line | Artefact absent (A), stated (B), excluded (C)     | 9-call cycle A B C B C B C B C, 100 repeats | 100 / 400 / 400 | τ (B vs C, primary); A vs B (secondary, descriptive) |
| E20b       | Position of target entry            | First (1st) vs last (45th)                        | 2-call alternation                          | 100 / 100       | Difference in Pr(_Y_ = 1) by position                |
| E20c       | Occupant of the last entry          | Original / non-competing filler / plausible rival | 3-call round robin                          | 200 / 200 / 200 | Contrast of target selection by last-slot occupant   |

### 3.2 Stimulus: the menu

The menu contains 45 modes rendered in file order, one line each, using the template in §1. The target entry is `explain`, at the seventh position in E20 and E20c and at the first or last in E20b. In E20c the last entry was exchanged with the target's slot-neighbour by **swap**, preserving list length and the position of every other entry.

**Table 3.** The three descriptive lines (E20). The brief was identical in all arms.

| Arm | Descriptive line                                   | Characters | Role                           |
| --- | -------------------------------------------------- | ---------- | ------------------------------ |
| A   | Use when someone asks why code behaves as it does. | 50         | Artefact absent; baseline only |
| B   | …and the answer must cite evidence, not recall.    | 96         | Artefact stated                |
| C   | …and the answer must not merely describe the code. | 99         | Artefact excluded              |

Request: _"Explain why this module is structured the way it is."_ B and C differ by three characters and are length-matched; A differs from B by 46 characters and is therefore **descriptive only**. The registration states that the A–B contrast "can never falsify anything on its own".

### 3.3 Request selection

The request was selected by screening seven candidates for two necessary conditions: a reply distribution that sometimes asks, and plausible ownership by the target mode. Six failed, in two classes. Mechanism questions ("why does this worker retry every failed job three times") closed the ask channel entirely: 30 of 30 replies committed, because ownership was unambiguous and only the source code was missing. Change-friction questions ("why is this module so hard to change") opened the channel but transferred ownership to a competing mode, and the target was never selected. Exactly one request opened both conditions. This is a **selection of the stimulus on the dependent variable's preconditions**, not on the effect; §6.4 states the bias it can and cannot introduce.

### 3.4 Procedure

Replies were unconstrained: no answer slot was provided, because a labelled slot presents a choice where the model might otherwise ask and would bias the measured ask rate. Model and decoding settings were held constant (one model, temperature 0, output cap 4,096 tokens). Two standing instructions were fixed in every prompt and never varied: a persona sentence, "You are exploring. Say what you want to achieve, not what you want handed back.", and the instruction to pick exactly one mode from the menu or state what information was missing instead of guessing. The latter is part of the stimulus rather than a courtesy: it is what makes `ASK` an admissible response, so the ask channel analysed in §4 is a property of the instruction as well as of the menu, and a replication that omitted it would estimate a different quantity. Allocation was interleaved at the call level with maximum concurrency 1, and interleaving was verified from timestamps (899 transitions across 900 calls; 199/200; 599/600).

### 3.5 Outcome definition and construct

Each reply is classified as `DECLARATION` (selects a mode as the one to use), `ASK` (requests information needed to decide), or `OTHER`.

The **selection construct** counts a reply as a declaration only if it names a mode as the one to use. The **mention construct** counts any reply that names a mode anywhere. On an ambiguous request most asks enumerate candidates ("whether you want `explain`, `architecture-reviewer` or `codebase-cartographer`"), so the two constructs diverge sharply. We pre-specified the selection construct because the estimand concerns commitment; §4.9 reports the mention construct as a sensitivity analysis and §5.4 argues that the divergence is itself a finding.

A tie-break registered before data collection ("a declaration marker anywhere makes the reply a declaration") proved unusable and was replaced before any count was published. §3.9 records this as a deviation.

### 3.6 Extraction, adjudication and blinding

A pinned parser (`routing-round-parser/2`) classified replies automatically. Every reply it could not resolve entered hand adjudication: the packet carried a hashed identifier, the request and the reply, with no arm label, draw number or timestamp; the identifier-to-run mapping was stored outside the packet directory and opened only after all verdicts were recorded. A second reader — a different model, given only the packet and the classification rule — re-adjudicated the same replies independently.

### 3.7 Pre-registration and its provenance

Hypotheses, arm sizes, decision thresholds, statistical tests and the analysis code were written before data collection and are held with the study materials. The registered decision rule was: exact Fisher tests on pre-declared contrasts, Holm-corrected within each experiment; a difference ≥ 20 points with adjusted _p_ < .025 constitutes an effect; < 10 points constitutes no detectable effect at this resolution; the intervening band is recorded as indecisive and not re-run without a new registration.

**The provenance of the registration must be stated plainly.** The registration documents bear the dates 2026-11-13 (E20, with two amendments dated 2026-11-16) and 2026-11-17 (E20c), and they were written before the runs they govern. However, they were **first deposited in public version control on 2026-11-19**, after data collection, as a bulk commit. Git history therefore does not independently certify that the documents preceded the data. The internal evidence for ordering is threefold and is weaker than a third-party timestamp: (i) the machine-written execution plan consumed by the runner embeds the amendment reference and the registered arm sizes, and per-call timestamps in the results place collection after that plan existed; (ii) the registrations specify arm sizes that the completed runs match, including a mid-run stop rule and a draw-ratio change that no post-hoc analysis could have invented without contradiction; (iii) the sequence of corrections in the appended experiment log records the registration's defects before the analysis that exposed them. We regard this as evidence of consistency, not proof of precedence, and we flag a post-hoc deposit with an independent timestamping service as a requirement for any venue that treats pre-registration as a condition of publication.

A further provenance limitation: the programme's earlier "closing round" (E13-R) was re-scored under a corrected outcome definition before this study began, and the correction was motivated by the same instrument defect documented in §2.3.

### 3.8 Statistical analysis

_Primary and secondary contrasts._ Two-sided Fisher exact tests on 2 × 2 tables of arm × outcome. Confidence intervals for differences in proportions use the Newcombe hybrid-score method. Multiplicity is controlled by Holm's procedure within each experiment; E20 evaluates its primary contrast at α = .025.

_Stationarity._ Each arm is decomposed into four equal blocks and tested for monotone trend with the Cochran–Armitage test. This was added after the pre-registration, as a **defect response** rather than a planned analysis, and is reported as such.

_Sequence dependence._ Wald–Wolfowitz runs tests on each arm's outcome sequence, to detect dependence that interleaving would not remove.

_Dispersion._ For each arm we compute the block-level dispersion ratio φ = observed between-block variance of proportions ÷ binomial variance _p̄_(1 − _p̄_)/_n_<sub>block</sub>, on 3 df. This is a low-powered diagnostic intended to detect gross overdispersion at the block scale; it is not a formal test and cannot detect dependence finer than block resolution.

_Robustness to unmodelled clustering._ For each contrast we report the variance-inflation factor at which the 95% interval would cease to exclude zero, computed as (|difference| ÷ half-width)². This is a bounded-influence statement, not an adjusted inference.

_Sensitivity to construct._ All primary and secondary contrasts are recomputed under the mention construct.

### 3.9 Deviations from registration, and corrections

1. **Classification tie-break replaced.** The registered rule counted any named mode as a declaration. It was replaced by the selection rule before any count was published (§3.5).
2. **First E20 batch aborted** at 781/900 due to payment depletion (HTTP 402), leaving 40 unrun records. The batch was preserved and a fresh full batch dispatched; pooling was declined (it would have moved the primary contrast from 27.5 to 25.7 points without changing the verdict).
3. **Stationarity testing and the runs test were added** after the registration, in response to an identified failure mode.
4. **Two counting errors were corrected** before publication: an interim figure of 46.0% for one arm (correct, 45.0%) and a block table that mixed two counting definitions. Both are reconciled in S4 and S6.
5. **The registration is sign-blind in its thresholds and sign-specific in its readings.** It provides a reading for "≥ 20 points" that asserts a direction. A reversed result therefore has no registered reading. This is a defect of the registration, not of the measurement, and it is the reason §5.1 is written as "effect confirmed, hypothesis refuted".

### 3.10 Power and resolution

Minimum detectable difference at 80% power: approximately 10 points at n = 400 per arm and 19.8 points at n = 100; the E20c registration states 14.0 points at n = 200. Batch-to-batch variation on an identical condition was 12.3 points (§4.7), which is larger than the within-run resolution, and no claim in this paper crosses batches.

---

## 4. Results

### 4.1 Provenance and instrument

All published batches were complete: 0 excluded records of 1,700, every record terminating normally. Verbatim clustering showed no duplicate transcripts (879/900 and 199/200 distinct in E20 and E20b; 192–198 of 200 per E20c arm). Concurrency was 1 throughout, and interleaving was verified from timestamps. These checks matter because a benchmark whose allocation is not verified cannot distinguish an effect of the menu from an effect of time.

### 4.2 Extraction performance

Of 378 replies entering hand adjudication, 27 (7.1%) were selections the pinned parser missed: bare slugs, backticked slugs, a bold span wrapping label and slug, unbolded labels, and slugs followed by prose. The failure is systematic (it concerns reply formatting, not content) and it biases automated counts downward in all arms. Table 4 reports mechanical and adjudicated counts separately.

**Table 4.** Selections by arm, mechanical and after blind adjudication.

| Experiment | Arm         | n   | Mechanical   | Adjudicated | Final       | Asks | Wrong selections |
| ---------- | ----------- | --- | ------------ | ----------- | ----------- | ---- | ---------------- |
| E20        | B (96 ch)   | 400 | 237 (59.3%)  | +9          | 246 (61.5%) | 154  | 0                |
| E20        | A (50 ch)   | 100 | 73 (73.0%)   | +2          | 75 (75.0%)  | 25   | 0                |
| E20        | C (99 ch)   | 400 | 344 (86.0%)  | +12         | 356 (89.0%) | 44   | 0                |
| E20b       | First entry | 100 | 15 (15.0%)   | +0          | 15 (15.0%)  | 85   | 0                |
| E20b       | Last entry  | 100 | 42 (42.0%)\* | +3          | 45 (45.0%)  | 43   | 12               |
| E20c       | X           | 200 | 94 (47.0%)   | +4          | 98 (49.0%)  | —    | —                |
| E20c       | Y           | 200 | 120 (60.0%)  | +11         | 131 (65.5%) | —    | —                |
| E20c       | Z           | 200 | 143 (71.5%)  | +9          | 152 (76.0%) | —    | —                |

\* Eleven further mechanical declarations named a different mode; they are the wrong selections reported in the adjacent column and are excluded from the numerator. Counting the four adjudicated declarations as declared keys yields 46.0%, which double-counts a commitment to the wrong mode; S4 reconciles this.

### 4.3 Primary contrast: polarity

The prohibition line (C) produced commitment in 89.0% of replies against 61.5% for the length-matched requirement line (B): **difference 27.5 points** (95% CI 21.7–33.1; exact two-sided _p_ = 7.1 × 10⁻²⁰; Holm-adjusted _p_ < 10⁻¹⁹). The registered reading for this magnitude asserted the opposite direction: _"naming what the answer must contain moves commitment more than naming what it must avoid."_ The prediction is refuted while the contrast is confirmatory, which is why the finding is reported as an effect without a registered interpretation.

**Table 5.** Pre-specified contrasts.

| Contrast                             | Rates          | Difference (pts) | 95% CI         | Exact _p_   | Holm       | Status                                        |
| ------------------------------------ | -------------- | ---------------- | -------------- | ----------- | ---------- | --------------------------------------------- |
| E20 B vs C (primary)                 | 61.5% vs 89.0% | −27.5            | −33.1 to −21.7 | 7.1 × 10⁻²⁰ | < 10⁻¹⁹    | Confirmatory, direction contradicted          |
| E20 A vs B (secondary)               | 75.0% vs 61.5% | +13.5            | +3.1 to +22.4  | .0141       | .0141      | Descriptive; length-confounded                |
| E20b first vs last                   | 15.0% vs 45.0% | −30.0            | −41.3 to −17.5 | 5.6 × 10⁻⁶  | 5.6 × 10⁻⁶ | Confirmatory contrast; mechanism unidentified |
| E20b wrong selections, last vs first | 12.0% vs 0.0%  | +12.0            | +5.8 to +19.8  | 3.4 × 10⁻⁴  | —          | Secondary                                     |
| E20c Z vs X, rival capture           | 1 vs 1         | —                | —              | —           | —          | Not estimable                                 |
| E20c Z vs X, target selection        | 71.5% vs 47.0% | —                | —              | —           | —          | Unregistered; not reported as an effect       |

### 4.4 Secondary contrast

Arm A (50 characters, artefact absent) produced 75.0% against 61.5% for B: +13.5 points (95% CI 3.1–22.4, _p_ = .0141). This contrast is confounded with length by 46 characters and cannot separate "states an artefact" from "is longer". It is reported because omitting it would misrepresent the arm structure, not as evidence that brevity helps. Length does not order the arms: the shortest line exceeded the middle one and fell below the longest.

### 4.5 Position

With the line, request, menu and model held fixed, the target at the **first** entry produced commitment in 15.0% of replies and at the **last** entry in 45.0%: 30.0 points (95% CI 17.5–41.3, _p_ = 5.6 × 10⁻⁶).

Two features qualify the headline. First, both arms remained appropriate at or near saturation (100% and 88%): the model almost never selected an unrelated mode, so the contrast is between committing and asking, not between right and wrong. Second, **all of the harm concentrated at the last position**: 12 wrong selections per 100 against 0 (95% CI for the difference 5.8–19.8, _p_ = 3.4 × 10⁻⁴). Ten of the twelve named one adjacent mode that is defensible for this request; the measured consequence is a 12-point increase in selections outside the expected set.

The mechanism is not identified. Three candidates remain: a penalty for the first entry, a reward for the last, and a neighbour effect from the adjacent entry. E20b moved three things at once (own position, neighbours, and the position of every other entry), and E20c — designed to separate them — was inconclusive.

### 4.6 Slot occupant: an inconclusive experiment

E20c varied only the occupant of the last entry by swap. The plausible rival placed last was selected 2 times in 600 replies, so it does not capture the slot. But the contrasts against control decayed across the run, and the control arm itself drifted.

**Table 6.** Stationarity by arm, blocks of equal size.

| Experiment | Arm   | Selections per block        | Shape          | CA z               |
| ---------- | ----- | --------------------------- | -------------- | ------------------ |
| E20        | B     | 61 / 58 / 63 / 55 (per 100) | flat           | —                  |
| E20        | C     | 83 / 87 / 84 / 90 (per 100) | flat           | —                  |
| E20        | A     | 17 / 17 / 23 / 16 (per 25)  | flat           | —                  |
| E20b       | First | 2 / 3 / 6 / 4 (per 25)      | flat, low      | —                  |
| E20b       | Last  | 13 / 8 / 12 / 9 (per 25)    | flat, higher   | —                  |
| E20c       | X     | 18 / 19 / 27 / 30 (per 50)  | ramp 36% → 60% | +2.72 (_p_ ≈ .007) |
| E20c       | Y     | 32 / 31 / 27 / 30 (per 50)  | flat           | −0.65              |
| E20c       | Z     | 38 / 37 / 35 / 33 (per 50)  | declining      | −0.99              |

Per-block contrasts, in points: E20 B − C = −22, −29, −21, −35; E20b last − first = +44, +20, +24, +20; E20c Y − X = +28, +24, 0, 0; E20c Z − X = +40, +36, +16, +6.

The same stationarity test therefore produces three different verdicts. The primary contrast holds its sign in every quarter and ranges 21–35 points. The position contrast is positive in every quarter, narrowing from 44 to 20 points. The slot-occupant contrasts decay to zero or near zero, so their averages are dominated by the first hundred calls and estimate nothing. **E20c is inconclusive**, no registered reading is applied to it, and the opposite of its registered reading is not claimed either.

A 200-call re-run of arm X on byte-identical prompts failed to reproduce the ramp (z = 2.72 → −0.06) but reproduced the instability in a different form: the same condition scored 47.0% and 54.0% in two runs. The instability is therefore a batch-level shift rather than a monotone trend, which is a weaker claim about shape and a stronger one about the reliability of batch means.

### 4.7 Reproducibility of individual calls

An aborted batch drew the same prompts as the published batch before stopping, permitting a draw-by-draw comparison across two dispatches.

**Table 7.** Agreement between two dispatches of identical prompts.

| Arm | Overlapping draws | Same outcome | Chance-level agreement | Identical transcripts |
| --- | ----------------- | ------------ | ---------------------- | --------------------- |
| B   | 329               | 175 (53.2%)  | 51.7%                  | 0                     |
| A   | 83                | 45 (54.2%)   | 55.3%                  | 0                     |
| C   | 329               | 234 (71.1%)  | 73.5%                  | 0                     |

Agreement sits at chance and no transcript repeats. Individual calls are therefore independent samples, not replicates. This has two consequences: pooling independent batches would legitimately add information (we declined, §3.9), and temperature 0 must not be reported as determinism by any study using this interface.

### 4.8 Inter-rater reliability

Under the registered tie-break, the independent second reader agreed with the first pass on 11.1% of 378 replies. Inspection of twelve disagreements showed every one to be an ask that enumerated candidates, which the registered rule scored as a declaration. Under the selection rule, agreement was **99.7% (377/378)**. The disagreement was located in the rule, not in the replies.

### 4.9 Sensitivity and robustness

**Construct sensitivity.** On the same replies, the mention construct gives B 98.0% and C 97.75%, a gap of **0.25 points** against 27.5 under the selection construct. The effect is thus a difference in _whether the reply commits_, not in which modes the reply discusses. This is not a nuisance: it localises the mechanism, and it means any comparison against an evaluation that scores mention-anywhere is invalid.

**Block dispersion.** Table 8 reports φ for every arm.

**Table 8.** Block-level dispersion ratios (3 df).

| Experiment | Arm   | _p̄_   | Block size | Observed variance | Binomial variance | φ        |
| ---------- | ----- | ----- | ---------- | ----------------- | ----------------- | -------- |
| E20        | B     | .5925 | 100        | .001225           | .002414           | **0.51** |
| E20        | C     | .8600 | 100        | .001000           | .001204           | **0.83** |
| E20        | A     | .7300 | 25         | .016400           | .007884           | 2.08     |
| E20b       | First | .1500 | 25         | .004667           | .005100           | **0.92** |
| E20b       | Last  | .4200 | 25         | .009067           | .009744           | **0.93** |
| E20c       | X     | .4700 | 50         | .014000           | .004982           | 2.81     |
| E20c       | Y     | .6000 | 50         | .001867           | .004800           | 0.39     |
| E20c       | Z     | .7150 | 50         | .001967           | .004076           | 0.48     |

The two confirmatory contrasts have φ ≤ 1 in both arms: no evidence of overdispersion at block resolution. The arm that invalidated E20c has φ = 2.81, and Y and Z are underdispersed (φ < 0.5), consistent with the excess runs observed in Y (114 observed vs 97 expected, z = +2.51, _p_ ≈ .012). The diagnostic is low-powered on 3 df and cannot detect dependence finer than the block; we report it as indicative.

**Robustness to unmodelled clustering.** If the intervals are nominally valid only under independent draws, the relevant question is how much variance inflation the conclusions tolerate. The primary contrast continues to exclude zero until the variance is inflated by a factor of ≈ 23.3; the position contrast until ≈ 6.4; the harm contrast until ≈ 2.9; the length-confounded secondary (A vs B) until only ≈ 2.0, which is a further reason not to rely on it. Given φ ≤ 1 at block resolution for the two confirmatory contrasts, neither conclusion is sensitive to plausible unmodelled clustering. The harm contrast is the most fragile claim in the paper and should be read as a direction with a wide interval.

### 4.10 Exploratory: a second model

A replication on a second model (`deepseek-v4-pro`) was stopped after 109 of 800 calls because the model never asked: 91 productive replies contained five distinct strings, all bare mode names, with zero questions (95% upper bound on ask rate ≈ 3.2%). Under the same request and the same two lines, 41/43 (95.3%) and 48/48 (100%) selected the target. Six failures occurred, all in one arm: five replies truncated to empty content at the 4,096-token cap, because a reasoning model spends the output budget before answering.

The exploratory conclusion is a **ceiling, not a null**: on a model with no measurable ask threshold, a contrast defined on commit-versus-ask cannot appear. This reframes the primary finding as a property of one model's decision threshold, and it is consistent with mode choice on that model being near-deterministic and line-independent.

---

## 5. Discussion

### 5.1 The polarity reversal

The observed direction — a prohibition out-committing a requirement — was not predicted, and the registration contains no reading for it. Two interpretations are consistent with the data and not separated by them. First, a prohibition may function as a **constraint on the candidate set**: "not merely describe the code" excludes the output of a neighbouring mode, narrowing the field in which the reply must decide between modes. A requirement does not narrow the field; every candidate can claim to cite evidence. Second, the effect may be a **compliance cue**: instructions phrased as prohibitions may be followed more reliably than instructions phrased as inclusion criteria, independent of content. The screening data favour the first interpretation, because mechanism questions in which no candidate could satisfy or violate the clause produced uniform commitment; but they do not test it.

The finding contradicts the prevailing heuristic that specifying a required artefact increases uptake. That heuristic appears in the catalogue-design guidance this study was commissioned to evaluate, and the reversal is the strongest practical result here.

### 5.2 Position without mechanism

We observe a 30-point difference between the first and last entry and cannot attribute it. Three candidates remain live, and the experiment that could separate them was destroyed by an arm × time interaction. Two inferences are nonetheless available. First, position effects are large enough that a menu-design comparison conducted across batches — the common practice of comparing one menu against another, collected at different times — is uninterpretable: an identical condition differed by 12.3 points between batches, and one arm moved 24 points inside a single run. Second, the direction is opposite to the tool-selection literature's first-listed dominance, which suggests that menu-length, task framing, or the presence of an abstention option condition the sign. We do not claim a general position effect.

### 5.3 Commitment and correctness

The last position bought 30 points of commitment and paid 12 points of wrong selections. For a system whose worst outcome is acting under the wrong instructions, this trade is not obviously favourable, and it inverts the objective that "uptake" implies. It also illustrates why abstention-sensitive scoring matters: a scorer that credits any commitment rewards precisely the arrangement that produced the wrong selections.

### 5.4 Construct dependence as a finding

The same replies yield 27.5 points under one scoring rule and 0.25 under another. Rather than a vulnerability to be managed in a limitations paragraph, this is a substantive result about measurement in agent evaluation: on ambiguous inputs, models almost always _discuss_ the candidate set, and menus differ in whether they _commit_. Benchmarks that score mention will systematically under-detect design effects of the kind measured here, and benchmarks that score commitment without scoring abstention will systematically reward the harmful arrangement in §5.3. We recommend that any menu-effect claim report both constructs.

### 5.5 Implications for catalogue design

1. Write lines that discriminate between neighbouring modes rather than lines that state a quality bar; on this evidence the exclusion clause is the higher-yield form.
2. Do not use placement as a silent promotion mechanism while the mechanism is unidentified.
3. Weigh placement by expected harm: a position that raises uptake and wrong selections by 12 points is a net loss for expensive-to-invoke modes.
4. Treat a clarifying question as a valid system output, and expect it to be model-dependent.
5. Audit the menu with an ask-rate probe (§7) rather than relying on designer judgement.

### 5.6 Implications for benchmarking practice

Four practices emerge from the failures encountered here, each of which cost a claim. Register a sign-specific reading for both directions of every threshold. Test stationarity per arm and publish the block decomposition beside every contrast. Screen a model for the channel the effect lives in before spending draws. Re-derive every published count from its components rather than from adjacent columns.

---

## 6. Threats to validity

### 6.1 Internal validity

Interleaving controls common trends but not arm × time interaction (§4.6). Allocation was verified from timestamps, and no excluded records were analysed. The principal internal threat is **batch-level drift**, quantified at 12.3 points on an identical condition; all confirmatory contrasts are therefore within-run, and the robustness analysis in §4.9 bounds the sensitivity of the conclusions to unmodelled clustering. A second threat is extractor error, which was systematic (7.1% missed selections) and corrected by adjudication rather than by a better parser; because the miss rate is similar across arms, the correction moves levels more than differences, but we cannot exclude an arm-specific component.

### 6.2 Construct validity

The outcome measures commitment, not task success. A reply that selects the target mode may still be a poor response, and a reply that asks may be the better response; we measure the decision, not its quality. The construct choice is consequential and quantified (§4.9). The stimulus varies one clause only; it does not test display-name form, menu length, ordering within a task group, or the interaction of wording with position, all of which remain untested.

### 6.3 Statistical conclusion validity

The design resolves ~10 points at n = 400 and ~19.8 at n = 100; the E20c band of 10–20 points is indecisive by construction. The primary and position intervals are nominal under independent draws, with block dispersion φ ≤ 1 and tolerance to variance inflation of 6–23×. The harm contrast tolerates only ~2.9× and is the least robust claim in the paper. Multiplicity is controlled within experiment but not across the paper's secondary claims, which are labelled descriptive or exploratory accordingly. No conclusion in this paper rests on a contrast crossing batches.

### 6.4 External validity

This is the binding limitation. The request, the menu and the model are fixed by design, so the estimands do not generalise over any of them. The effect was reproduced on **one of seven** screened requests, and six plausible candidates failed for two distinct reasons (§3.3), which brackets rather than samples the qualifying condition: a request about a _structural property_, where the target mode is the preferred owner but not the exclusive one. Selecting the stimulus on that precondition risks a selection effect in favour of finding a design effect at all; the mitigation is that the precondition was assessed from pilot draws before the registered arms, and that the direction of the resulting effect was the opposite of the prediction. It does not protect against the possibility that the effect exists only for stimulus-selected requests, and we do not claim otherwise.

Model generality is untested and, on the one available probe, sharply limited by the ask threshold (§4.10). One model, one session, one menu length.

### 6.5 Provenance

The registration was deposited in version control after data collection (§3.7). The ordering of registration and data rests on internal consistency, not on third-party timestamping. Readers who treat pre-registration as a condition of evidential weight should discount accordingly; the countervailing evidence is that the registered prediction was refuted and is reported as refuted.

---

## 7. Practical instrument

The measurements support a cheap audit that transfers beyond this study. Submit a set of real requests to the menu, record whether each reply commits or asks, and compare across a catalogue change. Five constraints make the probe interpretable: pin the model and report it; use requests whose ownership is ambiguous, since unambiguous requests commit at ceiling; state the scoring construct; repeat the probe on a separate occasion before believing a difference; and retain the reply text, because re-scoring under a better rule is the most common repair required.

A twenty-call screen is sufficient to reject a candidate request, model or line before a full sweep, at a cost of cents. The absence of such a screen is what allowed the second-model replication to discover its own impossibility at call 109.

---

## 8. Conclusion

Across 1,700 published calls on a 45-entry mode menu, one sentence in one entry changed whether an autonomous coding agent committed to that mode by 27.5 percentage points, in the direction opposite to the prediction: stating what the answer must **not** be outperformed a length-matched statement of what it must contain. Entry position produced a larger difference — 30 points between the first and last entry — with a 12-point increase in wrong selections at the end of the list, and with no identified mechanism. The effect is a difference in commitment rather than in which modes are discussed, is confined to requests whose mode ownership is ambiguous, reproduces on one request in seven, and requires a model with a measurable ask threshold. We report the conditions under which each claim would fail, and we report one experiment whose design did not survive its own stability check.

---

## Declarations

**Ethics.** No human participants, no human data, no personally identifying information. All prompts are synthetic fixtures authored for the study. No user requests, conversations or telemetry were used.

**Data availability.** All records underlying every reported number are published in the project repository: per-call records (`results.jsonl`), execution plans (`plan.json`), adjudication packets and verdicts, and the appended experiment log. Request transcripts and prompt files are excluded from the repository as regenerable from the records. **The fixture is burned by publication**: the menu and its expected key are public, so this stimulus cannot be reused as a blind test. DOIs will be minted for a frozen release prior to submission.

**Code availability.** Allocation, extraction, adjudication, analysis and fixture generation code is in the repository under `scripts/` (notably `run-routing-round.mjs`, `report-routing-round.mjs`, `lib/adjudication.mjs`, `lib/e20.mjs`, `analyze-e20c-run.mjs`). Analysis is deterministic given the records.

**Reporting guideline.** No reporting standard exists for menu-selection benchmarks. Supplementary S1 provides an itemised checklist covering design, registration, allocation verification, deviations, statistics, data and code, modelled on established reproducibility checklists.

**Funding.** [[FUNDER, GRANT NUMBER]] — or state "This work received no external funding."

**Competing interests.** [[AUTHORS ARE EMPLOYED BY / AFFILIATED WITH THE PROJECT THAT DEVELOPS THE SOFTWARE STUDIED. STATE THIS EXPLICITLY; IT IS A MATERIAL INTEREST IN AN EVALUATION OF THAT SOFTWARE'S DESIGN.]] No commercial sponsor influenced design, analysis or reporting.

**Author contributions.** [[A1]]: conceptualisation, methodology, software, investigation, formal analysis, writing — original draft. [[A2]]: methodology, validation, data curation, writing — review and editing. Both authors approved the submitted version and agree to be accountable for the work.

**Use of generative AI.** Generative models were the object of study and, separately, were used to assist with drafting and copy-editing of this manuscript. All reported numbers were computed from the published records and verified against them; no model generated or altered a result. [[ADJUST TO ACTUAL PRACTICE.]]

**Acknowledgements.** [[INDEPENDENT RED-TEAM REVIEWER, IF WILLING TO BE NAMED.]]

---

## References

Asking Earns Nothing: Scoring the Decision to Act in BFCL Multi-Turn. (2026). _arXiv_. https://arxiv.org/abs/2610.04429 [Preprint; unreplicated]

Barsalou, L. W., Wilson, C. D., & Hasenkamp, W. (2010). On the vices of nominalization and the virtues of contextualizing. In _The mind in context_. Guilford Press. https://barsaloulab.org/Online_Articles/2010-Barsalou_et_al-chap-nominalization_contextualizing.pdf

Budiu, R. (n.d.). _Information scent_. Nielsen Norman Group. https://www.nngroup.com/articles/information-scent

GOV.UK Design System. (n.d.). _Button_. https://design-system.service.gov.uk/components/button

Kaley, A. (n.d.). _UI copy: UX guidelines for command names_. Nielsen Norman Group. https://www.nngroup.com/articles/ui-copy

Katz, S. M., & Byrne, M. D. (2003). Effects of scent and breadth on use of site-specific search. _ACM Transactions on Computer-Human Interaction, 10_(3), 243–267. http://chil.rice.edu/research/pdf/KatzByrne03.pdf

Kawaletz, L., & Plag, I. (2015). Predicting the semantics of English nominalizations: A frame-based analysis of -ment suffixation. https://www.anglistik3.hhu.de/fileadmin/redaktion/Fakultaeten/Philosophische_Fakultaet/Anglistik_und_Amerikanistik/Ang3_Linguistics/Dateien/Detailseiten/Plag/Kawaletz_Plag2015_Predicting_the_semantics_of_English_nominalizations.pdf

Li, Qiao, & Gao. (2026). _Which metadata matters for LLM tool selection in MCP? Evidence from controlled factor-level interventions_. arXiv. https://arxiv.org/abs/2610.14334 [Preprint; unreplicated]

Microsoft Learn. (n.d.). _Menus: UI text guidelines_. https://learn.microsoft.com/en-us/previous-versions/windows/desktop/bb246448(v=vs.85)

Raskin, J. (2000). _The human interface: New directions for designing interactive systems_. Addison-Wesley.

VA.gov Design System. (n.d.). _Button_. https://design.va.gov/components/button

---

## Figure captions and specifications

**Figure 1.** Design and estimand. Three panels: (a) menu assembly showing the rendered template and the single varied clause; (b) allocation sequence for E20 (nine-call cycle) and E20b/E20c (alternation and round robin); (c) the two estimands and their units. To be drawn from Table 2 and Table 3; no data-dependent content.

**Figure 2.** Per-block contrasts. Grouped bars, four blocks on the abscissa, four contrasts as series (E20 B − C; E20b last − first; E20c Y − X; E20c Z − X). Values as in Table 6. Reference lines at 0 and at the ±10 and ±20-point decision thresholds. The figure's purpose is to make the decay of the E20c contrasts visible without reading the table.

**Figure 3.** Selection rates with 95% confidence intervals. Six point estimates with Newcombe intervals: A 75.0, B 61.5, C 89.0, first 15.0, last 45.0, and the E20c arms 49.0 / 65.5 / 76.0 plotted as hollow markers to denote non-estimable contrasts. Annotations state n per arm and flag the E20c markers as descriptive only.

---

# Supplementary material

## S1 — Reporting checklist

| Item                                                           | Status                             | Where             |
| -------------------------------------------------------------- | ---------------------------------- | ----------------- |
| Design stated before results                                   | Yes                                | §3.1              |
| Estimand defined formally                                      | Yes                                | §3.1              |
| Unit of analysis stated                                        | Yes                                | §3.1              |
| Sample size / resolution justified                             | Yes, ex ante                       | §3.10             |
| Registration deposited before data, with third-party timestamp | **No**                             | §3.7, §6.5        |
| All arms and allocation reported                               | Yes                                | Table 2           |
| Allocation verified from logs                                  | Yes                                | §4.1              |
| Exclusions reported                                            | Yes (0 of 1,700)                   | §4.1              |
| Deviations reported                                            | Yes (5)                            | §3.9              |
| Multiplicity controlled                                        | Yes, within experiment             | §3.8              |
| Interval method named                                          | Yes (Newcombe)                     | §3.8              |
| Stationarity tested per arm                                    | Yes                                | Table 6           |
| Overdispersion assessed                                        | Yes                                | Table 8           |
| Construct sensitivity reported                                 | Yes                                | §4.9              |
| Negative results reported                                      | Yes (E20c; second model; 6 briefs) | §4.6, §4.10, §3.3 |
| Data available                                                 | Yes, with burned-fixture caveat    | Declarations      |
| Code available                                                 | Yes                                | Declarations      |
| Costs and compute reported                                     | Yes                                | S2                |
| Figures reproducible from data                                 | Yes                                | Figure specs      |

## S2 — Provenance, cost and deviations

Published batches: E20 900 records (16 MB), E20b 200 (3.7 MB), E20c 600 (0.6 MB), E13-R 600 (5.5 MB); gates 90 and 60 records; aborted E20 batch 781 records, of which 741 paid. Output-producing calls in the E20 family: 2,591. Cost ≈ €13.21 at a measured rate of €5.1 per 1,000 calls (rate-derived, not read from billing). Wall clock 6.62 h across stages. Mean call duration 9.43 s weighted over 1,850 published calls.

Deviations: (1) first E20 batch aborted at 781/900 on payment depletion, 40 unrun records (5.1%); preserved, not spliced. (2) Pooling declined: batches are independent draws, pooling would move the primary contrast from 27.5 to 25.7 points and require 223 further adjudications. (3) Cost overran the combined €9.4 estimate for E20 and E20c; a sub-total in that estimate was itself wrong. All three are reported rather than smoothed.

## S3 — Gate table (first 90 E20 draws)

| Arm | Draws | Excluded | Longest identical transcript run | Declared | Extractor-null |
| --- | ----- | -------- | -------------------------------- | -------- | -------------- |
| B   | 40    | 0        | 1                                | 19       | 21             |
| A   | 10    | 0        | 1                                | 7        | 3              |
| C   | 40    | 0        | 1                                | 32       | 8              |

Pre-set stop thresholds: exclusion > 5% in any arm, or longest verbatim run > 5. Neither fired. The 60-draw E20c gate produced rates (X 65.0%, Y 45.0%, Z 65.0%) that invert two arms against the full sweep; those rates are not interpretable, because the gate is registered for exclusion and clustering only.

## S4 — Counting reconciliation

The last-entry arm of E20b is 45 selections of the key, not 46. The arm produced 53 mechanical declarations: 42 name the target, 11 name another mode (the wrong selections). Four adjudicated declarations: three name the target, one is the bare slug of a competing mode. Hence 42 + 3 = 45 selections of the key, 11 + 1 = 12 wrong selections, 43 asks; the three categories sum to 100. A figure of 46 arises from counting every adjudicated declaration as a selection of the key, which is correct for "did the reply select a mode" and incorrect for the estimand. The statistics were re-derived and the estimator validated by reproducing a previously published contrast: 15 vs 45 gives _p_ = 5.55 × 10⁻⁶, CI 17.5–41.3.

E20c's corrected totals are 98 / 131 / 152 (49.0 / 65.5 / 76.0), confirmed by 24 declarations across 241 undetermined replies (+4 / +11 / +9). An interim table printed a bare-slug column (+3 / +10 / +8) that did not sum to its own totals; the totals are correct and the column was wrong.

The extractor-miss count is 27 of 378 (7.1%), not 28: the older figure counted a reply naming a competing mode as a missed selection of the key.

## S5 — Registered hypotheses and readings

E20 primary, registered: "naming what the answer must contain moves commitment more than naming what it must avoid", ≥ 20 points, adjusted _p_ < .025. Observed: 27.5 points in the opposite direction. No registered reading applies.

E20 secondary, registered: A vs B descriptive only, never falsifying.

E20b, registered: ≤ 10-point difference in target selection by position would be read as no effect. Observed 30.0 points, direction descending from last to first, with the harm contrast secondary.

E20c, registered: rival capture ≤ 10 points → "the last slot is not a magnet"; explain shift within 10–20 points → indecisive. Neither reading was applied, because the control arm was not stationary; no opposite reading is claimed.

## S6 — Stationarity, including the any-mode variant

Per-block counts under two counting definitions:

| Arm    | Target-only             | Any mode                |
| ------ | ----------------------- | ----------------------- |
| E20c X | 18 / 19 / 27 / 30 (94)  | 18 / 20 / 27 / 30 (95)  |
| E20c Y | 32 / 31 / 27 / 30 (120) | 32 / 31 / 27 / 30 (120) |
| E20c Z | 38 / 37 / 35 / 33 (143) | 38 / 37 / 35 / 34 (144) |

Contrasts: target-only Y − X = +28 / +24 / 0 / 0 and Z − X = +40 / +36 / +16 / +6; any-mode Y − X = +28 / +22 / 0 / 0 and Z − X = +40 / +34 / +16 / +8. The conclusion is unchanged under either definition; the target-only definition is used throughout. Dispersion ratios under the any-mode definition are X 2.59, Y 0.39, Z 0.33.

## S7 — Runs tests

| Arm        | Observed runs | Expected | z     | _p_  |
| ---------- | ------------- | -------- | ----- | ---- |
| E20 B      | 193           | 190.42   | 0.27  | .79  |
| E20 A      | 37            | 38.50    | −0.40 | .69  |
| E20 C      | 81            | 79.32    | 0.43  | .67  |
| E20b first | 31            | 27.88    | 1.18  | .24  |
| E20b last  | 52            | 50.50    | 0.30  | .76  |
| E20c X     | 101           | 100.64   | 0.05  | .96  |
| E20c Y     | 114           | 97.00    | 2.51  | .012 |
| E20c Z     | 81            | 82.51    | −0.26 | .79  |

No dependence in E20 or E20b. E20c's Y arm alternates more than chance, which passes both the verbatim and exclusion guards and is detected only by this test. Runs tests detect dependence, not trend; the block decomposition, not this table, is what invalidated E20c.

## S8 — Cross-dispatch concordance

| Arm | Overlap | Same outcome | Chance | Identical transcripts |
| --- | ------- | ------------ | ------ | --------------------- |
| B   | 329     | 53.2%        | 51.7%  | 0                     |
| A   | 83      | 54.2%        | 55.3%  | 0                     |
| C   | 329     | 71.1%        | 73.5%  | 0                     |

## S9 — Adjudication protocol and defects

378 replies adjudicated (E20 246 of 900; E20b 132 of 200). Pass 1: 23 DECLARATION / 223 ASK (E20), 5 / 127 (E20b). Initial second-pass coverage 50 of 378 (13.2%), 100% agreement under the registered rule. Full independent pass: 378 of 378, different model, blind packet, 11.1% agreement under the registered rule and 99.7% under the selection rule. Blindness assertions passed on both packets. The join file is published beside the packet, so blindness is a property of the procedure, not of the artefact set; the same caveat applies to the published blinding seed, which must not be reused for an open packet.

Recorded defects: (1) pinned extractor misses 7.1% of selections; (2) the merge step cannot represent an adjudicated selection of a non-key mode; (3) the registration is sign-blind in thresholds and sign-specific in readings; (4) a gate can be quoted out of context; (5) records stamp parser version 1 while the analysis calls version 2, so the pin is not evidenced in the data; (6) the sealed key carries 45 slugs while the registration describes a union of 47.

## S10 — E20c detail

600 calls, 200 per arm, all completed, interleaving verified at 599 transitions. Target at the seventh entry with line B in all arms; only the last entry's occupant changed, by swap. Adjudicated totals 98 / 131 / 152 of 200. Blocks of 50: X 18 / 19 / 27 / 30 (CA z = 2.72), Y 32 / 31 / 27 / 30 (z = −0.65), Z 38 / 37 / 35 / 33 (z = −0.99). Undetermined replies 105 / 80 / 56 (241 total), of which 21 are bare slugs (X 3, Y 10, Z 8). Verdict: inconclusive; rival selected 2 in 600.

## S11 — Second-model pilot

Stopped at 109 of 800 calls. 91 productive replies: arm B 43 replies, 41 target (95.3%), 2 competing mode, 0 asks; arm C 48 replies, 48 target (100%), 0 asks. Five distinct strings, all mode names. Six failures (five truncated at the 4,096 cap, one empty completion), all in arm B; dropping them rather than raising the cap would have biased the comparison. Cost ≈ €0.6. The 709 unspent calls would have measured a ceiling.

## S12 — Data dictionary

`results.jsonl`, one JSON object per call: `index`, `runId`, `label` (arm), `draw`, `briefId`, `promptSha256`, `model`, `temperature`, `status`, `runnerStatus`, `reason`, `exitCode`, `startedAt`, `endedAt`, `transcript`, `response`, `finishReason`, `maxOutputTokens`, `parserVersion`. `plan.json`: `planSchema`, `instrument`, `experiment`, `registration`, `amendment`, `design`, `drawsPerArm`, `cycle`, `cycles`, `temperature`, `provider` (null), `model`, `blindSeed`, `persona`, `briefs`, `entries`. `adjudication/packet.jsonl`: `id` (hashed), `brief`, `reply`. `adjudication/judgements-*.jsonl`: `id`, `verdict`. `adjudication-join.json`: `id` → `runId`.

No credentials, request headers, endpoints, account identifiers or personal data appear in any published record.

---

# Editorial notes for the authors (not part of the manuscript)

**Required before submission.** (1) The pre-registration provenance problem in §3.7 and §6.5 is the paper's principal exposure. The registrations were first committed on 2026-11-19, after the runs; a reviewer who runs `git log` will find this. The mitigation that costs least is to deposit the dated documents with an independent timestamping service (OSF Registries accepts retrospective deposits but will mark them as such; Zenodo mints a DOI with a deposit date) and cite that deposit, stating plainly that it is retrospective. Do not submit a version that claims third-party pre-registration. (2) The competing-interest declaration currently states the authors are affiliated with the project that develops the software being evaluated; this is a material interest in a study that recommends design changes to that software, and it must not be softened. (3) Mint a frozen-release DOI for the records; the repository moves. (4) Confirm the reference entries for the two preprints, and resolve the incomplete author lists in Li, Qiao & Gao (2026); most venues will not accept a three-surname citation without initials.

**Revision required before submission (2026-11-23).** The manuscript was drafted before the R0 round. Five changes must land before any venue sees it; the first two are blocking.

1. **The picker the experiments rendered is not the picker the product emits.** Fixtures used `- <slug> — <Name> — <whenToUse>`; the extension renders `* "<Name>" mode (<slug>) - <whenToUse>` under a `MODES` heading. §1 and §3.2 currently describe the product template as what the model receives. Add the divergence to §3.2 and a defect entry to §3.9. No within-run contrast changes sign or size; what changes is the scope of every claim about "what the model sees".
2. **The position result does not transfer, and must be reported as format-specific.** In the product's rendering the first-versus-last contrast is 0.350 against 0.260 — **−9.0 points, not distinguishable from zero** — and the same line at the last slot declares **18.2 points less** than in the experiment form (z −2.65). The experiment form replicates at **+23.2 points** (z 3.29). §4.5, §5.2 and the Abstract must carry both, and the Discussion must not offer a placement recommendation.
3. **Replace the primary statistic with the paired sign test.** One hundred identical calls with nothing varied moved **24 points** across a single run (0.40 / 0.28 / 0.16 / 0.24). Fisher intervals assume independent draws and are optimistic. Add: wording C − B **238 of 288 adjacent pairs** (z 11.08); position last − first **94 of 107** (z 7.83), with the caveat that the re-classification reproduces the registered rate in one arm and not the other, so the paired z shows the contrast is not drift and does not replace the 45.0% figure. §3.8, §4.7 and Table 5 need a second statistic column, and §6.3 needs the caveat.
4. **Add the product-rendering result, which is the paper's strongest evidence.** Line C against B in the product form: **1.000 against 0.667, +33.3 points paired** (28 up, 0 down); in the experiment form +21.4. Line C in the product form committed **84 times in 84 calls with no asks and nothing unresolved** — the effect and its cost in one number. This belongs in the Abstract, §4.3 and §5.3–§5.4, and it is what makes the paper about the product rather than about a fixture.
5. **Add the token result and drop any advice about field order as a lever.** Three namings in one batch: name quoted **0.780**, slug-only **0.450**, slug-and-name **0.130** (+33.0, +65.0, +32.0 paired). Field order inside the experiment template was worth 3.2 points (not distinguishable from zero) and inside the product template 58; the pathological arm was malformed by its parenthetical, not by the slug. This supports a concrete catalogue recommendation and belongs in the Discussion as a mechanism candidate, not a law.

Also note for §3.6 and §6.1: the extractor moved to v4, which anchors every rule on the picker's vocabulary (the slug `code` had been defeating a "single slug anywhere" commit rule). All seven batches were re-derived at zero cost; 75 verdicts changed, none from a declaration to an ask, and no contrast reversed. Report the re-derivation rather than silently using the new numbers, and state the extractor version on every table — it is the same defect the paper already records for the parser pin.

**Formatting.** Structured abstract, APA 7 author–date, tables and figure captions at the end, declarations before references. Convert to the target venue's style; word count is roughly 6,400 for the main text including tables, which fits journals with 8,000-word limits and most SE and HCI venues. If the venue caps at 5,000, move §2 and §5.6 to supplementary and keep §4 intact — the contribution is in §4 and §5.1–5.3.

**Venue fit.** Empirical software engineering (EMSE, TSE, ICSE) fits the method and the artefact; HCI venues (CHI, CSCW) fit the menu-design framing; FAccT or a measurement venue fits §5.3–5.4 if the emphasis moves to abstention scoring. The manuscript's weakest fit is an ML venue: there is one model, one prompt and no benchmark release, which is deliberate but will be read as under-powered there.

**Two additions that would materially strengthen it, if budget exists before submission.** First, the harm arm at n = 400: 12% against 0% is the most consequential and least precise number, and it tolerates only ~2.9× variance inflation. Second, a second request that passes the screening conditions: 1 of 7 is the sentence a reviewer will circle. Neither requires new machinery.

**Do not delete §6.5 or S9's blindness caveat.** Both are the kind of disclosure that converts a hostile reviewer into a co-author of the revisions; removing them would be the one change that makes the paper less likely to survive review.
