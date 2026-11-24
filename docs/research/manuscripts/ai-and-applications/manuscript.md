# Wording and layout of a mode list steer an autonomous coding agent's choice

**Running title:** Mode-list wording and layout in autonomous coding agents

**Authors:** Xavier Arosemena<sup>1\*</sup>

**Affiliations:** <sup>1</sup> Audare est Facere, Barendrecht, The Netherlands

**Corresponding author:** Xavier Arosemena, xaroseme@espol.edu.ec

**ORCID:** Xavier Arosemena https://orcid.org/0009-0004-8308-8198

**Article type:** Research Article

**Keywords:** mode selection; autonomous coding agent; prompt sensitivity; list layout; measurement invariance; reproducibility

---

## Abstract

**Introduction:** Autonomous coding agents select a behaviour preset, or mode, from a list in which each entry is a single line of text. Catalogue authors control the wording of that line and its position in the list, and published interface conventions advise on both without any measurement taken inside a mode list. We asked whether wording, position and line layout change whether an agent commits to a mode or asks for the information its request omitted.

**Materials and methods:** Three pre-registered, interleaved experiments used one model, one 45-entry list and one ambiguous request (n = 900, 200 and 600 calls). A follow-up round of 1,588 calls repeated the two primary contrasts in the layout the shipping extension emits, and 100 calls with nothing varied measured the stability of the instrument itself. Replies were classified by a pinned extractor and, where unresolved, adjudicated blind by two independent readers. Paired sign tests within rotation cycle were the primary statistic; exact tests are reported as optimistic bounds.

**Results:** A line stating what the answer must not be produced commitment in 89.0% of replies, against 61.5% for a length-matched line stating an evidence requirement: 27.5 percentage points, 238 of 288 adjacent pairs, z = 11.08. The direction was the reverse of the registered prediction. In the shipping layout the same contrast was larger, 100% against 66.7%, and the winning line asked no questions at all. Entry position produced 45.0% against 15.0% in the experimental layout, 23.2 points on paired comparison, but not in the shipping layout, where the difference was 9.0 points in the opposite direction and not distinguishable from zero. The token placed inside quotation marks was worth up to 65 points. One hundred identical calls moved 24 points across a single run.

**Conclusions:** Mode-list wording is a strong and layout-dependent lever on agent behaviour; entry position is not transferable across layouts; and single-run percentages from commercial model endpoints should not be compared. These results are conditional on one model, one request class and one list length, and we state the conditions under which each claim would fail.

---

## 1. Introduction

Autonomous coding agents increasingly expose a catalogue of behaviour presets, here called **modes**, which bundle instructions, tool permissions and a role definition. In a large catalogue the menu is a retrieval problem. The agent receives one line per mode and must map a natural-language request onto one of them, or decline to choose. In the system studied the line is short, rendered as

> `* "<name>" mode (<slug>) - <whenToUse>`

where `whenToUse` is a sentence written by the catalogue author [1].

Two levers are therefore available to an author who wants a mode to be selected: what the sentence says, and where the entry sits. Published guidance asserts both. Interface conventions recommend verb-first, task-oriented labels [2–4], and agent-framework documentation recommends describing _when_ a tool should be used rather than _what_ it does [1]. None of this guidance is supported by a measurement taken inside a selection list. The one factor-isolated study of tool selection that we could locate reports that entry names matter little and that position can dominate when names are the only difference between entries [5].

The practical stakes are asymmetric in a way that the guidance does not acknowledge. A refusal to choose, that is a clarifying question, costs the user one turn and frequently resolves correctly on retry. A commitment to the wrong mode costs a task, because the agent then operates under the wrong instructions and permissions. A menu design that maximises uptake may therefore increase harm. This asymmetry motivates measuring **commitment and correctness separately**, which the automated evaluation literature has largely failed to do: the principal agent function-calling benchmark constructs turns on which asking is the expected response and then excludes those turns from scoring [6].

Three further literatures bear on the question. Prompt-format sensitivity studies show that surface features of a prompt can move model behaviour by margins comparable to those usually attributed to content [7], and that reported effects frequently fail to replicate under changed formatting [8]. Position and order effects are well documented for ranked evaluation, where the order of presented items changes judge output [9,10], and in human list selection, where the serial position of an item and the information scent of its label both influence retrieval [11–13]. Benchmark-reproducibility work documents that evaluation results depend on harness configuration, decoding settings and run-level conditions that are rarely reported [14–16].

Our contribution is fourfold. First, we provide what we believe is the first factor-isolated measurement of descriptive-line polarity inside a mode menu, with a length-matched primary contrast and a decision rule fixed before data collection. Second, we give a within-run estimate of entry-position effects and show that the design required to explain them was destroyed by an arm-by-time interaction that interleaving cannot remove. Third, we show that the headline effect is **construct-dependent**: 27.5 points under a selection rule and 0.25 points under a mention-anywhere rule, on the same replies. Fourth, we show that the effect is **layout-dependent**: it grows in the rendering the product emits, while the position effect vanishes there. A fifth, methodological contribution is a measured bound on instrument stability, without which none of the above can be interpreted.

The scope is deliberately narrow. We estimate the effect of menu wording and menu position on the response distribution conditional on a fixed request, a fixed menu and a fixed model. We do not estimate a population effect across requests, models or catalogues, and section 4.6 states why the design cannot.

## 2. Materials and methods

### 2.1 Study design and estimands

All experiments use a single-factor, multi-arm, individually randomised design with interleaved allocation. The unit of randomisation and of analysis is the **application programming interface call**, that is one request-response pair; the request, the menu and the model are fixed by design.

The primary estimand is the difference in the probability that a reply selects the target mode, between two menu variants that differ only in the closing clause of the target's descriptive line:

τ = Pr(_Y_ = 1 | _M_<sub>C</sub>) − Pr(_Y_ = 1 | _M_<sub>B</sub>)

where _Y_ = 1 if a reply selects the target mode under the selection construct defined in section 2.4, and _M_<sub>B</sub> and _M_<sub>C</sub> state an evidence requirement and a prohibition of the same length respectively. Because the request, the menu and the model are fixed rather than sampled, τ is a property of that triple and does not generalise over any of them.

Table 1 lists all batches. The first four experiments predate the layout investigation; the six R0 batches were run afterwards, in the layout the extension emits.

**Table 1.** Batches, allocation and sample sizes.

| Batch          | Factor varied                     | Levels                            | Allocation                   | Calls |
| -------------- | --------------------------------- | --------------------------------- | ---------------------------- | ----- |
| E13-R          | Line wording, six cells           | Label-form variants               | Interleaved                  | 600   |
| E20            | Closing clause of the target line | Artefact absent, stated, excluded | Nine-call cycle, 100 repeats | 900   |
| E20b           | Position of the target entry      | First, last                       | Two-call alternation         | 200   |
| E20c           | Occupant of the last entry        | Original, filler, rival           | Three-call round robin       | 600   |
| R0-position    | Position by layout                | Four combinations                 | Rotation every four calls    | 400   |
| R0-drift       | Nothing                           | One condition                     | None                         | 100   |
| R0-attribution | Rendered form                     | Four forms                        | Rotation every four calls    | 251   |
| R0-wording     | Line by layout                    | Four combinations                 | Rotation every four calls    | 337   |
| R0-slug-lead   | Quoted token                      | Two forms                         | Rotation every four calls    | 200   |
| R0-naming      | Quoted token and parenthetical    | Three forms                       | Rotation every four calls    | 300   |

### 2.2 Stimuli

The menu contains 45 modes rendered in file order, one line each. The target entry is `explain`, at the seventh position in E20, E20c and all R0 batches, and at the first or last position in E20b and R0-position. In E20c the last entry was exchanged with the target's slot-neighbour by swap, preserving list length and the position of every other entry.

Two line layouts are used. The **experimental layout** renders `- <slug> — <Name> — <whenToUse>` with no section heading, slug first. The **shipping layout** renders `* "<Name>" mode (<slug>) - <whenToUse>` under a `MODES` heading introduced by the sentence "These are the currently available modes:". The two differ in three respects: the template, the section framing, and field order. Every arm within any single batch shared one layout, so all within-batch contrasts are statements about that layout.

Table 2 gives the three descriptive lines used in E20. B and C differ by three characters and are therefore length-matched; A differs from B by 46 characters and is descriptive only, and no inference is drawn from it.

**Table 2.** Descriptive lines used in E20, with the identical request.

| Arm | Descriptive line                                   | Characters | Role                           |
| --- | -------------------------------------------------- | ---------- | ------------------------------ |
| A   | Use when someone asks why code behaves as it does. | 50         | Artefact absent; baseline only |
| B   | …and the answer must cite evidence, not recall.    | 96         | Artefact stated                |
| C   | …and the answer must not merely describe the code. | 99         | Artefact excluded              |

Request, used in every batch: "Explain why this module is structured the way it is."

### 2.3 Procedure and stimulus text

Replies were unconstrained. No answer slot was provided, because a labelled slot presents a choice where the model might otherwise ask and would bias the measured ask rate. Decoding settings were held constant at one model, temperature 0, and an output cap of 4,096 tokens.

The prompt has four parts, two of them prose. Every call opens with a persona sentence, "You are exploring. Say what you want to achieve, not what you want handed back.", followed by the standing instruction to pick exactly one mode from the list or to say what information is needed instead of guessing; the brief follows, then the rendered picker. Neither prose part was varied in any arm. The pick-or-ask instruction is not a courtesy to the model: it is what makes a question an **admissible** reply, so the ask rate is a property of the instruction as well as of the menu. A replication that omitted it would estimate a different quantity, and because it was never varied here its contribution is unmeasured.

Allocation was interleaved at the call level with a maximum concurrency of one, and interleaving was verified from response timestamps: 899 transitions across 900 calls, 199 across 200, and 599 across 600. In the R0 batches, arms were rotated every four calls so that every comparison had adjacent-in-time partners.

### 2.4 Outcome definition and constructs

Each reply is classified as a declaration, which selects a mode as the one to use; an ask, which requests information needed to decide; or other.

The **selection construct** counts a reply as a declaration only if it names a mode as the one to use. The **mention construct** counts any reply that names a mode anywhere. On an ambiguous request most asks enumerate candidates, for example "whether you want `explain`, `architecture-reviewer` or `codebase-cartographer`", so the two constructs diverge sharply. We pre-specified the selection construct because the estimand concerns commitment; section 3.8 reports the mention construct as a sensitivity analysis and section 4.4 argues that the divergence is itself a finding.

A tie-break registered before data collection, namely that a declaration marker anywhere makes the reply a declaration, proved unusable and was replaced before any count was published; section 2.6 records this as a deviation.

### 2.5 Extraction, adjudication and blinding

A pinned parser classified replies automatically. Every reply it could not resolve entered hand adjudication. The adjudication packet carried a hashed identifier, the request and the reply, with no arm label, draw number or timestamp; the identifier-to-run mapping was stored outside the packet directory and opened only after all verdicts were recorded. A second reader, a different model supplied only with the packet and the classification rule, re-adjudicated the same replies independently.

The extractor was subsequently revised to version 4, which anchors every rule on the picker's own vocabulary: a token that is neither a slug nor a display name cannot be read as a mode. The revision was required because the earlier rule, which committed when exactly one slug appeared anywhere in a reply, was defeated by the slug `code` in every reply mentioning "the source code". Version 4 replays a hand-labelled 20-reply validation set without error, with and without the vocabulary, and was applied to every batch at zero cost.

### 2.6 Pre-registration, deviations and provenance

Hypotheses, arm sizes, decision thresholds, statistical tests and analysis code were written before data collection and are held with the study materials. Two registration documents exist: one for the wording and position experiments with two amendments, and one for the slot-occupant experiment. The registered decision rule was: exact tests on pre-declared contrasts, Holm-corrected within each experiment; a difference of at least 20 percentage points with adjusted _p_ < .025 constitutes an effect; less than 10 points constitutes no detectable effect at this resolution; the intervening band is recorded as indecisive and not re-run without a new registration.

**The provenance of the registrations must be stated plainly.** The documents bear the dates on which they were written and precede the runs they govern. They were, however, first deposited in public version control on 19 November 2026, after data collection, as part of a bulk commit; version-control history therefore does not independently certify that they preceded the data. The internal evidence for ordering is threefold and weaker than a third-party timestamp. First, the machine-written execution plan consumed by the runner embeds the amendment reference and the registered arm sizes, and per-call timestamps place collection after that plan existed. Second, the registrations specify arm sizes that the completed runs match, including a mid-run stop rule and a change to the draw ratio that no post-hoc analysis could have introduced without contradiction. Third, the appended experiment log records the registrations' defects before the analysis that exposed them. We regard this as evidence of consistency rather than proof of precedence, and we declare a retrospective deposit with an independent timestamping service as outstanding.

Five deviations from registration are reported. The classification tie-break was replaced. The first E20 batch aborted at 781 of 900 calls after the exhaustion of pre-paid credit, leaving 40 unrun records; the batch was preserved untouched and a fresh complete batch was dispatched into a new directory, and pooling was declined. Stationarity testing and the paired sign test were added after the registration in response to an identified failure mode. Two counting errors were corrected before publication. The registration is sign-blind in its thresholds and sign-specific in its readings, so a reversed result of the pre-declared size has no registered interpretation; this is a defect of the registration, not of the measurement, and section 4.1 is written accordingly.

### 2.7 Statistical analysis

Two-sided exact tests were applied to 2 × 2 tables of arm by outcome, with confidence intervals for differences in proportions computed by the Newcombe hybrid-score method and multiplicity controlled by Holm's procedure within each experiment.

Because arm-level rates proved unstable (section 3.7), the primary statistic is the **paired sign test within rotation cycle**: each arm is compared with the arm that occupied the adjacent position in the same cycle, about 40 seconds apart, so that drift common to the run affects both members of the pair equally. Differences are reported in percentage points as the net proportion of discordant pairs, and the normal approximation to the sign test provides z. Adjacent pairs are not strictly independent, since four calls sit within one cycle, so the resulting _p_-values are optimistic by an unquantified amount; direction and size are the findings and the _p_-values are supporting evidence.

Stationarity is tested on each **contrast** rather than on each arm: arm-level movement is evidence that levels are unstable, not that a contrast computed from adjacent pairs is invalid. Block-level dispersion ratios were computed as the observed between-block variance of proportions divided by the binomial variance, on three degrees of freedom. Robustness to unmodelled clustering is reported as the variance-inflation factor at which a 95% interval would cease to exclude zero, computed as the squared ratio of the difference to its half-width.

Minimum detectable differences at 80% power are approximately 10 points at 400 calls per arm and 19.8 points at 100.

**Software and AI assistance in the analysis.** All allocation, extraction, adjudication, analysis and fixture-generation code is published with the records. The analysis scripts were drafted with AI assistance and reviewed line by line before use; the models under test took no part in their production. Every reported quantity was produced by executing that code against the stored records rather than transcribed by hand, and every published count was re-derived from its components by a second route before publication, which caught three arithmetic discrepancies that are corrected in the figures reported here. A re-scoring pass never rewrites a raw record: it writes a sidecar file beside the batch.

## 3. Results

### 3.1 Instrument validation and extractor performance

All published batches were complete: 0 excluded records of 1,700 in the E20 family, every record terminating normally, no duplicate transcripts beyond chance (879 of 900 and 199 of 200 distinct), and no clustering within any arm. Of the 378 replies entering hand adjudication in the E20 family, 27 (7.1%) were selections the pinned parser missed, in five recurring formats: a bare slug, a backticked slug, a bold span wrapping label and slug, an unbolded label, and a slug followed by prose.

Under the registered tie-break the independent second reader agreed with the first pass on 11.1% of the 378 replies. Inspection of twelve disagreements showed every one to be an ask that enumerated candidates, which the registered rule scored as a declaration. Under the selection rule, agreement was 99.7%, that is 377 of 378. The disagreement was located in the rule rather than in the replies.

Re-deriving every batch under extractor version 4 changed 75 verdicts across 1,840 usable rows; no declaration became an ask, and no contrast reversed. Table 3 reports the effect on the quantities used in this paper.

**Table 3.** Re-derivation under the revised extractor, for the quantities used in this paper.

| Batch          | Arm                          | As first scored | Re-derived |
| -------------- | ---------------------------- | --------------- | ---------- |
| R0-position    | Shipping layout, first       | 0.340           | 0.350      |
| R0-position    | Shipping layout, last        | 0.250           | 0.260      |
| R0-attribution | Shipping layout, name quoted | 0.714           | 0.778      |
| R0-wording     | Experimental layout, line B  | 0.647           | 0.659      |
| R0-wording     | Shipping layout, line C      | 0.988           | 1.000      |
| R0-slug-lead   | Slug only                    | 0.440           | 0.450      |

### 3.2 Wording: the primary contrast

Arm C produced commitment in 246 of 400 replies (61.5%) and arm B in 356 of 400 (89.0%): a difference of 27.5 percentage points in favour of the prohibition (95% confidence interval 21.7 to 33.1; exact two-sided _p_ = 7.1 × 10⁻²⁰; Holm-adjusted _p_ < 10⁻¹⁹). Under the time-aware statistic the margin is larger: C won 238 of 288 adjacent pairs (z = 11.08). Re-classified under the revised extractor the two arms read 61.8% and 88.2%, within one point of the registered figures.

The registered reading for a difference of at least 20 points asserted the opposite direction, namely that naming what the answer must contain moves commitment more than naming what it must avoid. The prediction is therefore refuted while the contrast is confirmatory, and no registered interpretation applies to the magnitude observed.

Arm A, the shorter artefact-absent line, produced 75 of 100 commitments (75.0%) against 61.5% for arm B, a difference of 13.5 points (95% confidence interval 3.1 to 22.4; _p_ = .0141). The two lines differ in length by 46 characters, so this contrast cannot separate the content of the clause from the length of the line and is reported as a description only. Length does not order the arms: the shortest line exceeded the middle one and fell below the longest.

### 3.3 Wording in the shipping layout

Line B was then compared with line C in both layouts within one interleaved batch of 337 calls. Table 4 gives the rates and Table 5 the paired contrasts.

**Table 4.** Commitment rate by line and layout.

| Layout       | Line B        | Line C        | Asks under B | Asks under C |
| ------------ | ------------- | ------------- | ------------ | ------------ |
| Experimental | 0.659 (56/85) | 0.869 (73/84) | 27           | 9            |
| Shipping     | 0.667 (56/84) | 1.000 (84/84) | 25           | 0            |

**Table 5.** Paired contrasts within rotation cycle.

| Contrast                        | Difference, points | Up/down | z    |
| ------------------------------- | ------------------ | ------- | ---- |
| C − B, experimental layout      | +21.4              | 18/5    | 3.40 |
| C − B, shipping layout          | +33.3              | 28/0    | 5.29 |
| Shipping − experimental, line B | +1.2               | 19/18   | 0.16 |
| Shipping − experimental, line C | +13.1              | 11/0    | 3.32 |

The effect survives the change of layout and grows in it. The layout alone does not make line B more decisive, as the third row shows. But in the shipping layout the discriminating line removed the alternative entirely: line C committed in 84 of 84 replies, asked nothing, and left nothing unresolved, while line B asked in 25 replies within the same batch and layout. On an ambiguous request, asking is the appropriate behaviour under this paper's own definition, so the strongest wording lever measured here is also the one that suppresses the behaviour a system needs when the user has not said enough.

### 3.4 Position

With the line, request, menu and model held fixed and the experimental layout used, the target at the first entry produced commitment in 15 of 100 replies (15.0%) and at the last entry in 45 of 100 (45.0%): 30.0 points (95% confidence interval 17.5 to 41.3; exact two-sided _p_ = 5.6 × 10⁻⁶). The paired test gives 94 of 107 adjacent pairs (z = 7.83).

Both arms remained appropriate at or near saturation, 100% and 88%, so the contrast is between committing and asking rather than between right and wrong. All of the harm concentrated at the last position: 12 wrong selections per 100 against none (95% confidence interval for the difference 5.8 to 19.8; _p_ = 3.4 × 10⁻⁴). Ten of the twelve named one adjacent mode that is defensible for this request; the measured consequence is a 12-point increase in selections outside the expected set.

The paired result carries a caveat that must travel with it. Re-classified under the revised extractor, the first arm reconciles at 16% against the registered 15%, but the second does not, at 57% against 45%. The paired test therefore establishes that the contrast is not an artefact of time position; it does not replace the registered 45.0% figure.

### 3.5 Position in the shipping layout

The same contrast was then run in both layouts inside one batch of 400 calls, arms rotated every four calls (Table 6).

**Table 6.** Position by layout, with paired contrasts.

| Layout       | First entry    | Last entry     | Contrast              |
| ------------ | -------------- | -------------- | --------------------- |
| Experimental | 0.212 (21/99)  | 0.440 (44/100) | +23.2 points (z 3.29) |
| Shipping     | 0.350 (35/100) | 0.260 (26/100) | −9.0 points (z −1.37) |

The experimental layout's advantage replicates at 23.2 points against 30.0 in E20b. The shipping layout shows nothing: a 9-point difference in the opposite direction, not distinguishable from zero on 17 up against 26 down. The layout also matters at the last slot in its own right, where the same line declared 18.2 points less often than in the experimental layout (z = −2.65).

Reading the arm rates alone would have discarded this batch, because the experimental-first arm fell from 32% to 8% within the run. Testing the contrast rather than the arm recovers it: all four comparisons keep sign and magnitude across the two halves, and the arms oscillate, which is not what a shared drift looks like.

A fourth mechanism candidate therefore enters the list. E20b moved the entry's position and simultaneously changed which token the model read first, because the experimental layout leads with the slug. The shipping layout leads with the name. The position result is thus confounded, in the experimental layout, with a first-token effect, and section 3.6 shows that the token matters considerably.

### 3.6 The token in the quoted slot

Three renderings of the same line and position, in one interleaved batch of 300 calls with 100 per arm, all in the shipping template (Table 7).

**Table 7.** Naming variants in the shipping template.

| Rendered as                     | Target line                           | Rate  | Asks |
| ------------------------------- | ------------------------------------- | ----- | ---- |
| Name quoted                     | `* "Explain" mode (explain) - <line>` | 0.780 | 22   |
| Slug only                       | `* "explain" mode - <line>`           | 0.450 | 55   |
| Slug quoted, name parenthesised | `* "explain" mode (Explain) - <line>` | 0.130 | 85   |

Paired within cycle, the name-quoted form exceeded the slug-only form by 33.0 points (45 up, 12 down; z = 4.37), exceeded the slug-and-name form by 65.0 points (71 up, 6 down; z = 7.41), and the slug-only form exceeded the slug-and-name form by 32.0 points (38 up, 6 down; z = 4.82). The net discordant proportions equal the unpaired rate differences, so the two routes agree.

The lever is the quoted slot rather than the presence of the name. The slug-and-name form prints the display name too, in the parenthesis, and is the worst of the three. Two related arms narrow the mechanism. In the attribution batch, field order inside the experimental template was worth 3.2 points (17 up, 15 down, not distinguishable from zero), while field order inside the shipping template was worth 58.1 points (39 up, 3 down; z = 5.55); the same field, in the same position, was inert in one layout and decisive in the other. One arm of that batch, `* "slug" mode (Name)`, collapsed to 0.190 with 51 asks in 63, and a follow-up arm that removed the parenthetical recovered 26.0 of those points (39 up, 13 down; z = 3.61), which locates the collapse in the malformed parenthesis rather than in the slug leading the line.

Finally, the shipping layout's own line outperformed the experimental layout's line by 27.4 points in the same batch (24 up, 7 down; z = 3.05): 0.778 against 0.500 for the same sentence and the same position.

### 3.7 Stability of the instrument

One condition was run 100 times with nothing varied: same mode, same position, same line, same layout, same request, same model, same settings. Table 8 gives the result by quarter.

**Table 8.** One unchanged condition, 100 calls, by quarter.

| Quarter | Declarations | Rate |
| ------- | ------------ | ---- |
| 1       | 10/25        | 0.40 |
| 2       | 7/25         | 0.28 |
| 3       | 4/25         | 0.16 |
| 4       | 6/25         | 0.24 |

The range is 24 percentage points with nothing varied. This is the size of the confound that any multi-arm batch using arm totals carries. It accounts for the ramping control arm of E20c, for the fall of the experimental-first arm in section 3.5, and for the earlier cross-batch difference of 12.3 points on an identical condition that motivated the rule that contrasts must be within-run.

Also observed: two dispatches of identical prompts in the E20 family agreed on the same commit-or-ask outcome at 53.2%, 54.2% and 71.1%, against chance levels of 51.7%, 55.3% and 73.5%, and produced no identical transcripts. Individual calls are independent samples, not replicates.

Robustness to unmodelled clustering was assessed for each contrast. The primary wording contrast continues to exclude zero until the variance is inflated by a factor of about 23; the position contrast until about 6.4; the harm contrast until about 2.9; and the length-confounded secondary until about 2.0. Block-level dispersion ratios for the two confirmatory contrasts were at or below 1.0 in both arms, against 2.8 for the arm that invalidated E20c.

### 3.8 Construct sensitivity

On the same replies, the mention construct gives 98.0% for line B and 97.75% for line C, a gap of 0.25 percentage points against 27.5 under the selection construct. The effect is thus a difference in whether the reply commits, not in which modes the reply discusses. This is not a nuisance: it localises the mechanism, and it means that any comparison against an evaluation that scores mention-anywhere is invalid. In the shipping layout the ceiling is reached — line C committed in every reply — so the gap cannot widen further there.

### 3.9 Model dependence and scope of the effect

A replication was attempted on a second model and stopped after 109 of 800 calls because the model never asked: in 91 productive replies it returned one of five strings, all bare mode names, with zero questions (95% upper bound on the ask rate, 3.2%). Under the same request and the same two lines, 41 of 43 replies (95.3%) and 48 of 48 (100%) selected the target.

This is a ceiling rather than a null. On a model with no measurable ask threshold, a contrast defined on commitment versus asking cannot appear, and mode choice was near-deterministic and independent of the line. The result is therefore a statement about one model's ask threshold, not about routing in general.

The effect is also request-specific within the screened set. Six further requests were screened for the two conditions the effect requires, namely a reply distribution that sometimes asks and plausible ownership by the target mode, and none satisfied both. Mechanism questions closed the ask channel entirely, with 30 of 30 replies committing; change-friction questions opened it but transferred ownership to a competing mode. One request in seven therefore qualifies, namely a question about a structural property where the target mode is the preferred owner but not the exclusive one.

## 4. Discussion

### 4.1 The polarity reversal

The observed direction was not predicted and the registration contains no reading for it. Two interpretations are consistent with the data and are not separated by them. A prohibition may function as a constraint on the candidate set: "not merely describe the code" excludes the output of a neighbouring mode and narrows the field in which the reply must choose, whereas a requirement does not narrow the field, since every candidate can claim to cite evidence. Alternatively, the effect may be a compliance cue, in which instructions phrased as prohibitions are followed more reliably than instructions phrased as inclusion criteria, independently of content. The screening data favour the first, because requests in which no candidate could satisfy or violate the clause produced uniform commitment; they do not test it.

The finding contradicts the prevailing heuristic that specifying a required artefact increases uptake, and it is consistent with the prompt-sensitivity literature in which surface form carries effects usually attributed to content [7,8].

### 4.2 Position without mechanism

We observe a 30-point difference between the first and last entry in the experimental layout and cannot attribute it. Four candidates remain: a penalty for the first entry, a reward for the last, a neighbour effect from the adjacent entry, and a first-token effect arising from the slug leading the line. The design that could have separated the first three was destroyed by an arm-by-time interaction, and the fourth is confounded by the layout itself.

Two inferences are nonetheless available. Position effects are large enough that a menu-design comparison conducted across batches, which is the common practice of comparing one menu against another collected at different times, is uninterpretable. And the direction is opposite to that reported for tool selection under name-only comparison [5], which suggests that list length, task framing or the presence of an abstention option conditions the sign. We do not claim a general position effect.

### 4.3 Layout as a moderator, and why it matters practically

The wording effect was larger in the layout the product emits and the position effect was absent there. This is a case of measurement non-invariance across presentation formats, and it has a direct practical consequence: advice derived from one layout does not transfer to another. It also explains why the earlier inference that the last position was advantageous could survive four within-run quarterly checks and still be wrong about the product.

For catalogue authors the practical rule follows from section 3.6 rather than from position: print the form the extension already prints, keep the display name in the quoted slot and the slug in the parenthesis, and spend the available line budget on the discriminating clause. A slug-only line saves 761 characters across 45 modes and costs 33 points of commitment; it is a trade, not a saving.

### 4.4 Commitment, correctness and the ask channel

The last position in the experimental layout bought 30 points of commitment and paid 12 points of wrong selections. For a system whose worst outcome is acting under the wrong instructions, this trade is not obviously favourable, and it inverts the objective that uptake implies. The shipping layout resolves the tension by removing it: a line that commits in every reply cannot produce a wrong selection on this request, but neither can it obtain the file it needs.

Two implications follow for evaluation practice. First, a scorer that credits any commitment rewards the arrangement that produced the wrong selections. Second, a scorer that credits mention will systematically under-detect design effects of the kind measured here, because on ambiguous inputs models almost always _discuss_ the candidate set and menus differ only in whether they _commit_. Abstention-aware scoring is therefore a prerequisite for menu research, as it is for function-calling evaluation [6,17,18].

### 4.5 Implications for benchmark design

Five practices emerged from the failures encountered here, each of which cost a claim. Register a sign-specific reading for both directions of every threshold. Test stationarity on contrasts and publish the block decomposition beside every contrast. Screen a model for the channel in which the effect lives before spending draws. Re-derive every published count from its components rather than from adjacent columns. Report the presentation format as part of the stimulus, because the same list in a different layout is a different list.

The stability measurement in section 3.7 is the most transferable result. A 24-point range on an invariant condition is larger than every effect this study reports except the wording contrast, and it implies that single-run percentages from commercial endpoints should not be compared across sessions, however carefully the prompt is held constant.

### 4.6 Limitations

The request, the menu and the model are fixed by design, so the estimands do not generalise over any of them. The effect reproduced on one of seven screened requests, and six plausible candidates failed for two distinct reasons; selecting the stimulus on the precondition risks a selection effect in favour of finding a design effect at all, mitigated only by the fact that the resulting direction contradicted the prediction. Model generality is untested, and the one available probe suggests it is sharply limited by the ask threshold. One model, one session and one list length were used.

The outcome measures commitment, not task success: a reply that selects the target may still be poor, and a reply that asks may be better. The stimulus varies one clause; it does not test display-name morphology, list length, grouping, or the interaction of wording with position.

The exact intervals assume independent draws and are optimistic; the paired tests assume that adjacent pairs are independent, which they are not, so those _p_-values are also optimistic, though the direction and size of the paired effects do not depend on them. The harm contrast tolerates variance inflation of only about 2.9 and is the least robust claim in the paper.

Finally, the pre-registration was deposited in version control after data collection, as recorded in section 2.6. Readers who treat third-party timestamping as a condition of evidential weight should discount accordingly. The countervailing evidence is that the registered prediction was refuted and is reported as refuted.

## 5. Conclusions

Across 4,179 output-producing calls on a 45-entry mode menu, one sentence in one entry changed whether an autonomous coding agent committed to that mode by 27.5 percentage points, in the direction opposite to the prediction: stating what the answer must not be outperformed a length-matched statement of what it must contain. The effect was larger in the layout the shipping product emits and, in that layout, removed the clarifying question entirely. Entry position produced a 30-point difference in the experimental layout, with a 12-point increase in wrong selections at the end of the list, and no difference in the shipping layout. The token inside the quotation marks was worth up to 65 points.

The practical conclusion is narrow and usable: write the line, not the list order; write it in the form the product renders; make it discriminate against its nearest neighbour; and keep a route back to the user. The methodological conclusion is broader: a list-rendering study that does not report its layout, its instrument stability and its scoring construct is not reporting a quantity that can be compared with anything.

---

## Statements

**Funding.** This research received no external funding.

**Author contributions.** Xavier Arosemena is the sole author and carried out all roles: conceptualization; methodology; software; validation; formal analysis; investigation; data curation; writing—original draft preparation; writing—review and editing; visualization; project administration. The author has read and agreed to the published version of the manuscript.

**Conflict of interest.** Xavier Arosemena is affiliated with the project that develops the software whose mode catalogue is evaluated in this study. That project did not participate in the design, execution, analysis or interpretation of the experiments reported here, and no commercial sponsor influenced the decision to publish. The paper's central recommendation contradicts advice the same programme published five days before this submission, which the author offers as evidence of independence rather than of alignment. The author declares no other financial or personal competing interests.

**Institutional review board statement.** Ethical approval was not sought for the present study because it involved no human participants, no human material and no human data; all prompts are synthetic fixtures written for the study, and no user requests, conversations or telemetry were used.

**Informed consent.** Not applicable. The study involved no human participants.

**Data availability statement.** The data supporting the findings of this publication have been made available within a publicly accessible repository at https://github.com/xavier-arosemena/roo-plus; an archived release of the exact records analysed here is deposited at [[DOI]]. The repository contains, for every call, the arm label, draw number, request identifier, prompt hash, model, temperature, status, timestamps, full request transcript, full reply, finish reason, output cap and extractor version, together with the execution plans, adjudication packets, adjudication verdicts and the re-derivation sidecars. Prompt files and transcript copies are excluded as regenerable from the records. Note that publication of the menu and its expected key means the fixture can no longer serve as a blind test; replications require a new fixture.

**Use of artificial intelligence.** The author acknowledges the use of the AI tool Roo+ (version 3.89.3), an AI-assisted coding client running in VSCodium with deepseek-v4-flash as the underlying model, for language editing, as well as for drafting assistance and for drafting of the analysis scripts, as declared in section 2.7. The tool was applied to enhance clarity and scholarly tone, and all edits were carefully reviewed and validated by the author to ensure accuracy, compliance with academic standards, and research integrity. No model selected, altered or interpreted a reported quantity: every reported figure was produced by executing the declared code against the published records, and every published count was re-derived by a second route before publication. The author fully supports Academia.edu Journals' adherence to COPE guidelines on AI in publication ethics and confirms that this use has been managed responsibly and ethically.

**Supplementary materials.** The supplementary materials are available at [[DOI]]. They contain the reporting checklist, the full outcome tables, the stationarity and dispersion analyses, the runs tests, the cross-dispatch concordance analysis, the adjudication protocol and recorded defects, the slot-occupant experiment in full, the second-model pilot and the data dictionary.

---

## References

1. Roo+ (roo-plus) contributors. Mode list rendering: the modes prompt section, commit 1b55142 [Internet]. 2026 [cited 2026 Nov 24]. Available from: https://github.com/xavier-arosemena/roo-plus/blob/1b55142e05/src/core/prompts/sections/modes.ts

2. GOV.UK Design System. Button [Internet]. [cited 2026 Nov 23]. Available from: https://design-system.service.gov.uk/components/button

3. Microsoft. Menus: UI text guidelines [Internet]. [cited 2026 Nov 23]. Available from: https://learn.microsoft.com/en-us/previous-versions/windows/desktop/bb246448(v=vs.85)

4. Kaley A. UI copy: UX guidelines for command names [Internet]. Nielsen Norman Group; [cited 2026 Nov 23]. Available from: https://www.nngroup.com/articles/ui-copy

5. Li X, Qiao F, Gao X. Which metadata matters for LLM tool selection in MCP? Evidence from controlled factor-level interventions. arXiv:2610.14334 [Preprint]. 2026 [cited 2026 Nov 24]. Available from: https://arxiv.org/abs/2610.14334

6. Liu Y, Han Z. Asking earns nothing: scoring the decision to act in BFCL multi-turn. arXiv:2610.04429 [Preprint]. 2026 [cited 2026 Nov 24]. Available from: https://arxiv.org/abs/2610.04429

7. Sclar M, Choi Y, Tsvetkov Y, Suhr A. Quantifying language models' sensitivity to spurious features in prompt design: or, how I learned to start worrying about prompt formatting. arXiv:2310.11324 [Preprint]. 2023 [cited 2026 Nov 23]. Available from: https://arxiv.org/abs/2310.11324

8. Biderman S, Schoelkopf H, Sutawika L, Gao L, Tow J, Abbasi B, et al. Lessons from the trenches on reproducible evaluation of language models. arXiv:2405.14782 [Preprint]. 2024 [cited 2026 Nov 23]. Available from: https://arxiv.org/abs/2405.14782

9. Zheng L, Chiang WL, Sheng Y, Zhuang S, Wu Z, Zhuang Y, et al. Judging LLM-as-a-judge with MT-Bench and Chatbot Arena. arXiv:2306.05685 [Preprint]. 2023 [cited 2026 Nov 23]. Available from: https://arxiv.org/abs/2306.05685

10. Wang P, Li L, Chen L, Cai Z, Sun D, Wang C, et al. Large language models are not fair evaluators. arXiv:2305.17926 [Preprint]. 2023 [cited 2026 Nov 23]. Available from: https://arxiv.org/abs/2305.17926

11. Murdock BB Jr. The serial position effect of free recall. J Exp Psychol. 1962;64(5):482–8. doi:10.1037/h0045106

12. Pirolli P, Card S. Information foraging. Psychol Rev. 1999;106(4):643–75. doi:10.1037/0033-295X.106.4.643

13. Katz MA, Byrne MD. Effects of scent and breadth on use of site-specific search on e-commerce web sites. ACM Trans Comput-Hum Interact. 2003;10(3):198–220. doi:10.1145/937549.937551

14. Liang P, Bommasani R, Lee T, Tsipras D, Soylu D, Yasunaga M, et al. Holistic evaluation of language models. arXiv:2211.09110 [Preprint]. 2022 [cited 2026 Nov 23]. Available from: https://arxiv.org/abs/2211.09110

15. Pineau J, Vincent-Lamarre P, Sinha K, Larivière V, Beygelzimer A, d'Alché-Buc F, et al. Improving reproducibility in machine learning research: a report from the NeurIPS 2019 reproducibility program. arXiv:2003.12206 [Preprint]. 2020 [cited 2026 Nov 23]. Available from: https://arxiv.org/abs/2003.12206

16. Sculley D, Holt G, Golovin D, Davydov E, Phillips T, Ebner D, et al. Hidden technical debt in machine learning systems. arXiv:1503.05991 [Preprint]. 2015 [cited 2026 Nov 23]. Available from: https://arxiv.org/abs/1503.05991

17. Kirichenko P, Ibrahim M, Chaudhuri K, et al. AbstentionBench: reasoning LLMs fail on unanswerable questions. arXiv:2506.09038 [Preprint]. 2025 [cited 2026 Nov 23]. Available from: https://arxiv.org/abs/2506.09038

18. Kadavath S, Conerly T, Askell A, Henighan T, Drain D, Perez E, et al. Language models (mostly) know what they know. arXiv:2207.05221 [Preprint]. 2022 [cited 2026 Nov 23]. Available from: https://arxiv.org/abs/2207.05221

19. Farquhar S, Kossen J, Kuhn L, Gal Y. Detecting hallucinations in large language models using semantic entropy. Nature. 2024;630(8017):625–30. doi:10.1038/s41586-024-07421-0

20. Kuhn L, Gal Y, Farquhar S. Semantic uncertainty: linguistic invariances for uncertainty estimation in natural language generation. arXiv:2302.09664 [Preprint]. 2023 [cited 2026 Nov 23]. Available from: https://arxiv.org/abs/2302.09664

21. Schick T, Dwivedi-Yu J, Dessì R, Raileanu R, Lomeli M, Hambro E, et al. Toolformer: language models can teach themselves to use tools. arXiv:2302.04761 [Preprint]. 2023 [cited 2026 Nov 23]. Available from: https://arxiv.org/abs/2302.04761

22. Qin Y, Liang S, Ye Y, Zhu K, Yan L, Lu Y, et al. ToolLLM: facilitating large language models to master 16000+ real-world APIs. arXiv:2307.16789 [Preprint]. 2023 [cited 2026 Nov 23]. Available from: https://arxiv.org/abs/2307.16789

23. Patil SG, Zhang T, Wang X, Gonzalez JE. Gorilla: large language model connected with massive APIs. arXiv:2305.15334 [Preprint]. 2023 [cited 2026 Nov 23]. Available from: https://arxiv.org/abs/2305.15334

24. Li M, Zhao Y, Yu B, Song F, Li H, Guo H, et al. API-Bank: a comprehensive benchmark for tool-augmented LLMs. arXiv:2304.08244 [Preprint]. 2023 [cited 2026 Nov 23]. Available from: https://arxiv.org/abs/2304.08244

25. Liu NF, Lin K, Hewitt J, Paranjape A, Bevilacqua M, Petroni F, et al. Lost in the middle: how language models use long contexts. arXiv:2307.03172 [Preprint]. 2023 [cited 2026 Nov 23]. Available from: https://arxiv.org/abs/2307.03172

26. Ouyang L, Wu J, Jiang X, Almeida D, Wainwright C, Mishkin P, et al. Training language models to follow instructions with human feedback. arXiv:2203.02155 [Preprint]. 2022 [cited 2026 Nov 23]. Available from: https://arxiv.org/abs/2203.02155

27. Wei J, Wang X, Schuurmans D, Bosma M, Ichter B, Xia F, et al. Chain-of-thought prompting elicits reasoning in large language models. arXiv:2201.11903 [Preprint]. 2022 [cited 2026 Nov 23]. Available from: https://arxiv.org/abs/2201.11903

28. Geirhos R, Jacobsen JH, Michaelis C, Zemel R, Brendel W, Bethge M, et al. Shortcut learning in deep neural networks. Nat Mach Intell. 2020;2(11):665–73. doi:10.1038/s42256-020-00257-z

29. Hooker S. The hardware lottery. Commun ACM. 2021;64(12):58–65. doi:10.1145/3467017

30. Mitchell M, Wu S, Zaldivar A, Barnes P, Vasserman L, Hutchinson B, et al. Model cards for model reporting. arXiv:1810.03993 [Preprint]. 2018 [cited 2026 Nov 23]. Available from: https://arxiv.org/abs/1810.03993

31. Kawaletz L, Plag I. Predicting the semantics of English nominalizations [Internet]. 2015 [cited 2026 Nov 23]. Available from: https://www.anglistik3.hhu.de/fileadmin/redaktion/Fakultaeten/Philosophische_Fakultaet/Anglistik_und_Amerikanistik/Ang3_Linguistics/Dateien/Detailseiten/Plag/Kawaletz_Plag2015_Predicting_the_semantics_of_English_nominalizations.pdf

32. Barsalou LW, Wilson CD, Hasenkamp W. On the vices of nominalization and the virtues of contextualizing [Internet]. 2010 [cited 2026 Nov 23]. Available from: https://barsaloulab.org/Online_Articles/2010-Barsalou_et_al-chap-nominalization_contextualizing.pdf

33. Raskin J. The humane interface: new directions for designing interactive systems. Boston (MA): Addison-Wesley Professional; 2000.

---

## Figure captions

**Figure 1.** Design and estimand. (a) The rendered menu line, showing the three author-controlled fields and the single clause varied between arms; (b) the allocation sequences for interleaved batches, with the nine-call cycle of E20 and the four-call rotation of the R0 batches; (c) the two estimands and their unit of analysis. To be supplied as a 600 dpi PNG or SVG, colour-free, with panel labels inside the image.

**Figure 2.** Commitment rate by arm and layout, with 95% confidence intervals. Eight point estimates: E20 arms A, B and C; E20b first and last entries; and the four R0-wording arms. Fill distinguishes layout by texture rather than colour.

**Figure 3.** Per-block contrasts across the four quarters of each run, in percentage points. Four series: E20 C − B; E20b last − first; E20c filler − control; E20c rival − control. Reference lines at 0 and at the ±10 and ±20 point decision thresholds.

## Table notes

Table 1 gives the batch inventory; the E13-R batch is discussed only as the source of the unambiguous-brief rate of 598 of 600 appropriate replies and is not used for any contrast here. Table 3 reports only quantities used in this paper; the complete re-derivation, including batches not used here, is in the supplementary materials. Rates in Tables 4, 6 and 7 are proportions of calls, not of replies with a resolved verdict, because the denominator is the whole arm.
