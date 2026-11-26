# The artefact frame — a rival catalogue, written to be tested

| Field                                      | Value                                                                                                                                                                                                                                                                 |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                                 | Rival candidate, 2026-11-09. No decision. Written so that the two frames can be measured on the **same instruments** ([`modes-catalogue-brainstorm.md`](modes-catalogue-brainstorm.md) §12).                                                                          |
| **Question it organises the catalogue by** | **"What am I producing?"** — not "what kind of work am I doing?"                                                                                                                                                                                                      |
| **Method**                                 | Artefact classes derived from the **definition-of-done column** of the 119-job inventory ([needs baseline](research/modes-needs-baseline-2026-11.md) §5): each job names the thing that must exist when it is finished. Classes are the artefact kinds, not the jobs. |
| **Fairness rule**                          | Same granularity discipline as the rival frame: a class survives only if its artefact differs **and** it can be told apart from its nearest neighbour in one line. Pruning is shown, not hidden (§4).                                                                 |
| **Result**                                 | **40 classes → 28 after pruning**, against 44 owners in the stance frame. The pruning itself is the most interesting finding (§4).                                                                                                                                    |

---

## 1. The catalogue

Column `~chars` is the draft `whenToUse` length — the budgeted quantity. Drafts are 90–130 chars on
purpose: if the frame cannot be routed in that space, it cannot be routed at all.

### 1.1 Coding artefacts (24)

| #   | Mode              | Produces                                                   | Serves jobs                  | Draft `whenToUse`                                                                          | ~chars |
| --- | ----------------- | ---------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------ | ------ |
| A1  | `criteria`        | a testable acceptance-criteria set                         | R1 R4 R5 R7 R9               | Use when a request has no acceptance criteria and must become testable before work starts. | 96     |
| A2  | `legacy-spec`     | a behaviour inventory of an existing system                | R2                           | Use when undocumented legacy behaviour must be specified before it is changed.             | 81     |
| A3  | `options-memo`    | a scored options memo with a recommendation                | R3 R8 D6                     | Use when two technical or stakeholder options compete and a defensible choice is needed.   | 87     |
| A4  | `adr`             | a decision record (ADR)                                    | D1 D3 D10 K3                 | Use when a structural decision will be questioned later and needs a durable record.        | 83     |
| A5  | `contract`        | an interface contract with compatibility rules             | D5 T6 K2                     | Use when two components or teams must agree on an API shape and its compatibility rule.    | 87     |
| A6  | `migration`       | a reversible schema/data migration                         | D4 X1 X3 X5 X6               | Use when a schema or data change must be applied safely with rollback and verification.    | 86     |
| A7  | `design-note`     | a design note for a quality attribute or concurrency plan  | D2 D8 D9 D7                  | Use when a target cannot be met by the current structure and a tactic must be chosen.      | 83     |
| A8  | `feature-diff`    | a behaviour change with tests that fail first              | I1 I2 I3 I5 I9 I11 I12       | Use when acceptance criteria exist and the code does not yet implement them.               | 70     |
| A9  | `port`            | a parity-proven port to another runtime                    | I7                           | Use when code must move to another language or runtime with proven behaviour parity.       | 80     |
| A10 | `localisation`    | extracted and placeholder-safe string resources            | I8                           | Use when user-facing copy must be localised without breaking placeholders or fallbacks.    | 84     |
| A11 | `benchmark`       | a before/after measurement on a named workload             | I10 B5 B6 O7 O11             | Use when a performance, cost or build-time budget is missed and needs measurement first.   | 90     |
| A12 | `bug-report`      | a minimal reproduction plus a named root cause             | B1 B2 B3 B4 B7 B8 B9 B10 B11 | Use when something fails and the cause is unknown; produce evidence, not a guess.          | 79     |
| A13 | `codebase-map`    | a structural map with entry points and paths               | C1 C5 C8 C10                 | Use when an unfamiliar codebase must be mapped before a change or review.                  | 67     |
| A14 | `explanation`     | a cited answer about why code is the way it is             | C2 C3 C4 C6 C7 C9            | Use when someone asks why the code behaves as it does and evidence must be cited.          | 79     |
| A15 | `test-suite`      | tests mapped to criteria, failing before and passing after | T1 T2 T5 T6 T10 T11          | Use when behaviour needs executable evidence and acceptance criteria exist.                | 70     |
| A16 | `test-plan`       | a risk-based plan for what to test and what not to         | T2 T8 T9                     | Use when it is unclear what is worth testing and where the risk actually sits.             | 79     |
| A17 | `flake-record`    | a quarantine record with an owner and a fix-or-delete date | T4                           | Use when a test fails intermittently and blocks others from merging.                       | 68     |
| A18 | `refactor-diff`   | a behaviour-preserving change with unchanged tests         | I4 F1 F2 F6 F7 F8            | Use when code must change shape without changing behaviour, and tests must stay green.     | 86     |
| A19 | `upgrade-plan`    | a staged modernisation or deprecation plan                 | F3 F4 F5 F9                  | Use when a dependency, subsystem or API surface is being retired in stages.                | 77     |
| A20 | `review-findings` | findings by severity, each tied to a failure scenario      | Q1 Q2 Q3 Q4 Q5 Q7 Q8         | Use when a change or test suite must be reviewed and findings ranked by risk.              | 74     |
| A21 | `release-report`  | a release-readiness report with a go/no-go                 | Q9 O3 O10 T7                 | Use when a release candidate exists and someone must decide whether to ship it.            | 79     |
| A22 | `threat-model`    | threats with mitigations mapped to code locations          | S7 S5 S10                    | Use when a new trust boundary appears and its abuse cases must be named.                   | 70     |
| A23 | `security-fix`    | a patched finding with a regression test                   | S1 S2 S3 S4 S6 S8            | Use when a concrete vulnerability, secret or dependency risk must be fixed.                | 77     |
| A24 | `supply-evidence` | an SBOM plus provenance attestation                        | S9                           | Use when a release or audit requires supply-chain evidence.                                | 62     |

### 1.2 Operations and data artefacts (6)

| #   | Mode              | Produces                                            | Serves jobs    | Draft `whenToUse`                                                                | ~chars |
| --- | ----------------- | --------------------------------------------------- | -------------- | -------------------------------------------------------------------------------- | ------ |
| A25 | `pipeline-config` | CI/build/release automation and its guardrails      | O1 O6 O8 O9    | Use when the pipeline, build or environment configuration itself is the problem. | 78     |
| A26 | `incident-record` | a timeline, a mitigation and follow-ups             | O2 O4 O5       | Use when something is degraded in production and the goal is restoration first.  | 76     |
| A27 | `data-answer`     | a query, its result and its caveats                 | X4 X7 X8       | Use when a question can be answered from production data rather than code.       | 72     |
| A28 | `query-plan`      | a slow query rewritten with a measured plan         | X2             | Use when a query exceeds its budget and indexes or a rewrite must be justified.  | 78     |
| A29 | `doc-page`        | reader-facing documentation a newcomer can act on   | K1 K2 K4 K5 K9 | Use when a reader must be able to act without asking a follow-up question.       | 72     |
| A30 | `decision-log`    | legible history: commits, changelog, decision trail | K3 K8 K6 K7    | Use when the history of a change is unreadable and must be reconstructed.        | 74     |

### 1.3 Meta artefacts (5)

| #   | Mode               | Produces                                     | Serves jobs | Draft `whenToUse`                                                               | ~chars |
| --- | ------------------ | -------------------------------------------- | ----------- | ------------------------------------------------------------------------------- | ------ |
| A31 | `plan`             | an ordered plan with checkpoints             | —           | Use when the work spans several steps or modes and needs to be sequenced first. | 76     |
| A32 | `research-brief`   | a cited brief answering an external question | —           | Use when the answer lives outside this repository and must be sourced.          | 68     |
| A33 | `critique`         | objections ranked by severity                | —           | Use when a claim, plan or design must be attacked before it is trusted.         | 68     |
| A34 | `analysis`         | a reasoned conclusion with its verification  | —           | Use when a decision needs explicit reasoning rather than a quick answer.        | 68     |
| A35 | `delegation-brief` | task breakdown with self-contained briefs    | —           | Use when work must be split across modes or agents with complete context.       | 74     |

### 1.4 Non-coding artefacts (12)

| #   | Mode               | Produces                                      | Draft `whenToUse`                                                                                      | ~chars |
| --- | ------------------ | --------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------ |
| A36 | `legal-note`       | a legal review note with cited clauses        | Use when a contract, clause or obligation must be reviewed and summarised with the risk flagged.       | 102    |
| A37 | `control-map`      | obligations mapped to controls                | Use when a regulation or policy must be mapped to concrete controls and the evidence that proves them. | 107    |
| A38 | `campaign-brief`   | a campaign or positioning brief               | Use when a campaign or positioning must be planned against an audience, channel and budget.            | 97     |
| A39 | `content-piece`    | finished copy for a channel                   | Use when finished copy is needed for a channel, at the right length and in the right voice.            | 99     |
| A40 | `financial-model`  | a model with assumptions and sensitivity      | Use when numbers must be modelled with stated assumptions, sensitivity and a recommendation.           | 101    |
| A41 | `pricing-analysis` | a pricing recommendation                      | Use when a price or tier must be set or defended with willingness-to-pay reasoning.                    | 91     |
| A42 | `product-brief`    | discovery brief with evidence                 | Use when a problem must be framed into a product bet with evidence and a success measure.              | 95     |
| A43 | `market-analysis`  | competitor and market analysis                | Use when a market or competitor set must be analysed before a product or pricing decision.             | 100    |
| A44 | `synthesis-report` | a synthesis of sources with citations         | Use when several sources must become one cited brief a decision-maker can act on.                      | 88     |
| A45 | `career-plan`      | a career or negotiation plan                  | Use when a developer needs a plan for a role change, promotion or job search, with next steps.         | 101    |
| A46 | `ai-feature`       | a model-powered capability with an eval suite | Use when a model-powered capability must be built: prompts, retrieval, tool calls and an eval suite.   | 104    |
| A47 | `eval-suite`       | a model-behaviour eval suite with baselines   | Use when model behaviour must be measured against a baseline so regressions are detectable.            | 96     |

**Total: 47 classes before pruning** (24 coding + 6 ops/data + 5 meta + 12 non-coding). **All 47 now carry
a drafted `whenToUse`** — §1.4 was template-derived until 2026-11-09, which the bake-off run correctly
identified as making the artefact frame look cheaper than it was (derived mean 60.5 vs drafted 78.2).

## 2. Coverage check — which jobs the frame holds

| Frame region                  | Jobs covered  | Jobs that fit badly                                                                                                      |
| ----------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Requirements & design (A1–A7) | R1–R9, D1–D10 | R5 (bound scope), R6 (obligation→controls) — they produce _agreements_, not artefacts                                    |
| Implementation (A8–A11)       | I1–I12        | I6 (ship behind a switch) produces a _state_, not an artefact                                                            |
| Debugging (A11–A12)           | B1–B11        | **B5/B6 land in `benchmark`** because their artefact is a number, not a fix — the frame splits a family across two modes |
| Comprehension (A13–A14)       | C1–C10        | C7 (intended vs bug) produces a _judgement_                                                                              |
| Testing (A15–A17)             | T1–T11        | T3 (suite within budget) is a _benchmark_, so it lands in A11 — again a split family                                     |
| Evolution (A18–A19)           | F1–F9         | F5 (delete dead code) produces an _absence_                                                                              |
| Review (A20–A21)              | Q1–Q9         | Q6 (docs-code drift) is a _finding about a doc_, not a doc                                                               |
| Security (A22–A24)            | S1–S10        | S9 (supply-chain integrity) is evidence, not a change                                                                    |
| Ops (A25–A26)                 | O1–O11        | O10 (verify deployment) produces _confidence_, not an artefact                                                           |
| Data (A27–A28)                | X1–X8         | X3 (repair data) produces a _correction_, and lands in A6                                                                |
| Documentation (A29–A30)       | K1–K9         | K6 (triage an issue) produces a _classification_                                                                         |

**Every job is covered, but five families are split across classes** (debugging, testing, data, docs,
review) because the _artefact_ differs while the _stance_ does not. That is the frame's signature failure:
it separates work that feels like one job to the person doing it.

## 3. Pruning — 47 → 40 (and why it looks like the rival frame)

Pruning rule from the rival frame's discriminators: merge two classes when their **grant** and **stance**
are the same and only the artefact's file extension differs.

| Merged                              | Into                  | Reason                                                                      |
| ----------------------------------- | --------------------- | --------------------------------------------------------------------------- |
| A2 `legacy-spec`                    | A1 `criteria`         | Same grant, same stance; the artefact is "a written understanding"          |
| A9 `port`, A10 `localisation`       | A8 `feature-diff`     | Same grant and stance; the difference is which test proves parity           |
| A16 `test-plan`, A17 `flake-record` | A15 `test-suite`      | Deciding what to test and quarantining are both _test judgement_            |
| A28 `query-plan`                    | A11 `benchmark`       | A measured before/after is a benchmark, whatever the subject                |
| A30 `decision-log`                  | A29 `doc-page`        | Both are reader-facing text; stance identical                               |
| A33 `critique`, A34 `analysis`      | A31 `plan`?           | **Rejected** — challenge and analysis are genuinely different stances; kept |
| A37 `control-map`                   | A36 `legal-note`      | Same stance over the same domain                                            |
| A41 `pricing-analysis`              | A40 `financial-model` | Same stance, same domain                                                    |
| A43 `market-analysis`               | A42 `product-brief`   | Discovery and market evidence are one artefact class                        |
| A45 `career-plan`                   | A44?                  | **Rejected** — different domain, no shared artefact                         |

After pruning: **37 classes** (19 coding, 4 ops/data, 5 meta, 9 non-coding). The arithmetic: 47 − 10
merged classes.

**The finding, stated plainly:** every merge above was made by applying the **stance** discriminators to an
**artefact** catalogue. The artefact frame does not survive at its natural granularity; it collapses toward
the stance frame as soon as the same discipline is applied. Whether that means the stance frame is the real
structure or merely the pruning knife is precisely what the bake-off must decide — it is the strongest
argument **for** running T-F rather than reasoning it out. _(Flagged as prime material for the published
article: it is the moment the analysis stops being an argument and becomes a measurement problem.)_

### 3.1 The symmetry objection — and why it changes the conclusion

The reviewer's question — _would this change if we applied an artefact-friendly discriminator to both frames?_ —
is decisive, and the answer is **yes, and it weakens the finding above considerably.**

Run the mirror experiment mentally: prune the **stance** frame with the **artefact** rule ("merge two modes
that produce the same kind of object"):

| Stance-frame pair                              | Objects produced              | Verdict under the artefact rule |
| ---------------------------------------------- | ----------------------------- | ------------------------------- |
| `debug` / `performance`                        | both a _report of evidence_   | **merge** (24 → 23)             |
| `requirements` / `acceptance-criteria`         | both a _written criteria set_ | **merge** (→ 22)                |
| `code-reviewer` / `architecture-reviewer`      | both _findings by severity_   | **merge** (→ 21)                |
| `documentation` / `decision-record`            | both _reader-facing text_     | **merge** (→ 20)                |
| `test-author` / `test-strategist`              | _tests_ vs _a plan_           | keep                            |
| `refactor` / `modernisation`                   | _a diff_ vs _a staged plan_   | keep                            |
| `security-reviewer` / `vulnerability-response` | _a threat model_ vs _a patch_ | keep                            |
| `explain` / `codebase-cartographer`            | _an answer_ vs _a map_        | keep                            |

So the **stance frame collapses by ~4 owners** under the artefact knife, and the **artefact frame collapses
by 10** under the stance knife. Both frames over-segment when judged by the other frame's criterion.

**The corrected conclusion:** "the artefact frame collapses toward the stance frame" is _not_ evidence that
the stance frame is more true — it is evidence that **the two criteria disagree about where the joints are**,
and each criterion looks like the knife when you hold it. The right comparison is therefore a **2 × 2**:

| Frame \ pruned by  | Stance rule      | Artefact rule |
| ------------------ | ---------------- | ------------- |
| **Stance frame**   | 44 (as proposed) | ~40           |
| **Artefact frame** | 37               | 47 (as built) |

Neither diagonal wins by construction; the winner is whichever cell best predicts **routing agreement** and
**assimilation**, which is what T-C/T-F/T-H measure. The publication material is this symmetry, not the
one-directional claim — a lesson worth stating explicitly in the paper, because it is the same trap as
pruning a rival with your own categories and calling the result evidence.

## 4. Costs and shape (same instruments as the rival)

| Metric                                           | Artefact frame                                                                                                 | Axis × stance frame                            |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Owner modes                                      | **37** (after pruning; 47 unpruned)                                                                            | **44**                                         |
| Σ`whenToUse`                                     | **3,836 measured over all 47 classes** (mean 81.6) — was 2,736 over 35 before §1.4 was drafted                 | **4,208** measured over 45 classes (mean 93.5) |
| Routing headroom left for specialisations at 12k | **8,164**                                                                                                      | **7,792**                                      |
| Note on the `~chars` column                      | It is an **estimate** and drifts from the real string length in 18 of 47 rows; the measured Σ is authoritative | Measured directly                              |
| Does the frame cover every job?                  | Yes — with 5 split families                                                                                    | Yes — families stay together                   |
| Meta modes representable?                        | Awkwardly (a plan is an artefact; a critique is an _assessment_)                                               | Naturally (stances)                            |
| Non-coding representable?                        | Naturally (documents are artefacts)                                                                            | Naturally (domains + stances)                  |
| Distinct `groups` profiles available             | Fewer — most artefact modes are read+edit                                                                      | More — review modes are read-only by stance    |

## 5. Where the framework strains

1. **Diagnose and measure have no artefact.** A root cause is a _conclusion_; a benchmark is a _number_.
   Both had to be grafted on (A11, A12), and B5/B6/T3 end up in a class that also serves implementation.
2. **Review produces an assessment, not an object.** A1 `review-findings` is the closest artefact, but the
   value is the judgement, not the table.
3. **Split families.** Five job families that users experience as one job are separated by artefact
   boundaries — the exact failure mode D4 (assimilation) is designed to catch.
4. **Proliferation.** 47 classes unpruned, and each new artefact (a lockfile, a SBOM, a policy file) invites
   another class. The stance frame is closed at 16 stances; this frame has no natural closure.

## 5.1 The entry-point insight — the frames may not be rivals at all

The reviewer's first impression names something the analysis had missed: _the artefact frame is clear when
you already know what you want; it stops being intuitive while you are still conceptualising._ That is a
statement about **two different user states**, not about two catalogues:

| User state                                                                            | Question they can answer     | Frame that fits                                                     |
| ------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------- |
| **Decided** — "I need an ADR", "I need tests", "I need a threat model"                | "what am I producing?"       | **Artefact**                                                        |
| **Exploring** — "something is slow", "this is a mess", "I do not know where to start" | "what kind of work is this?" | **Stance**, or better: `planner`, which resolves the state for them |

If that holds, the bake-off may be the wrong test. The real design might be **one catalogue with two views**
— artefact labels as an index over the stance owners — plus `planner` as the default entry for the exploring
state. That is testable (T-H): show a new user five requests and ask whether they know what they want

- before\* they choose. If they do not, an artefact-first selector will fail them, however clean its list is.

**Recorded as a hypothesis to test, not a conclusion:** "frames are views, not rivals".

## 6. What each frame predicts — the falsifiable part

| Prediction                                  | Artefact frame                                                           | Axis × stance frame                                 |
| ------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------- |
| A user with "my tests fail" will pick       | `bug-report` (A12) — likely correct                                      | `debug` — likely correct                            |
| A user with "make it faster" will pick      | `benchmark` (A11) — ambiguous: do they want measurement or a fix?        | `performance` — likely correct                      |
| A user with "review my PR" will pick        | `review-findings` (A20) — correct, but also a candidate `release-report` | `code-reviewer` — correct                           |
| A user with "explain this module" will pick | `explanation` (A14) — correct                                            | `explain` — correct                                 |
| Selection **agreement** across runs         | Lower — two artefact classes often compete for one request               | Higher — one stance per situation                   |
| **Assimilation** (D4) for a new user        | Higher on criterion 1 ("what am I producing?" is concrete)               | Higher on criteria 3–4 (fewer competing neighbours) |

**If the artefact frame wins on agreement and assimilation, it is the better catalogue.** If it wins only on
criterion 1 while losing agreement, the stance frame wins — because a wrong choice costs a task, not a
sentence of reading.

## 7. Test-readiness

| Test                  | Ready? | Note                                                                                                     |
| --------------------- | ------ | -------------------------------------------------------------------------------------------------------- |
| T-C coin-flip         | ✅     | Pairs to test: A11/A12, A20/A21, A15/A16, A22/A23, A29/A30                                               |
| T-B routing budget    | ✅     | **3,836 over 47 classes** (mean 81.6) — inside 12k, but within ~9% of the stance frame, not 2.4× cheaper |
| T-I skills accounting | ✅     | Most classes carry ≤ 3 skills; the frame is _skills-poor_ because the artefact does the work             |
| T-G stranded triage   | ⚠️     | Artefact classes absorb different slugs; run after both frames are stable                                |
| T-F / T-H             | ✅     | Three briefs from §6, both catalogues materialised as `.roomodes`                                        |

### 7.1 Results — what ran, on 2026-11-09

Scripted over this document, so the numbers are reproducible rather than asserted.

**T-K (partial) — job coverage of the artefact catalogue.** 119 job assignments across 30 classes, but only
**115 unique jobs**: **four jobs are not covered at all** and **four are double-assigned**.

| Defect                  | Jobs                                                                                                                       | Why it happened                                                                                                                                                                                                             |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Uncovered (4)**       | **R6** (obligation → controls), **I6** (ship behind a switch), **T3** (suite within budget), **Q6** (docs-code drift)      | Each produces something that is **not an artefact**: a mapping, a state, a duration, a discrepancy. They are exactly the four this document's §2 flagged as "fits badly" — the strain points are where the frame drops work |
| **Double-assigned (4)** | K2 (`contract` + `doc-page`), K3 (`adr` + `decision-log`), T2 (`test-suite` + `test-plan`), T6 (`contract` + `test-suite`) | Artefact boundaries overlap: a contract _is_ documentation, a decision record _is_ history, coverage _is_ a test-plan concern                                                                                               |

**Verdict:** the artefact frame needs four judgement classes (or four explicit "owned by a skill of…"
assignments) before it can be called complete. The stance frame has the same test pending.

**T-B (budget solver) — costs, corrected twice.** Σ`whenToUse` = **3,836 over all 47 classes** (mean 81.6)
after §1.4 was drafted. Two corrections are recorded rather than smoothed: the first table said 2,736 over 35
(twelve lines were template-derived), and my first correction said 3,917 because it summed the `~chars`
**estimates** instead of the real strings — the red team caught that, and the measured figure is 3,836.
Headroom at the 12,000 budget is **8,164**, against **7,792** for the stance frame (4,208 over 45,
mean 93.5). **The frames are within ~9% of each other on routing cost**; the earlier "2.4× cheaper" reading
was an artefact of unwritten lines, not of the frame.

**T-C proxy (coin-flip risk).** Pairwise Jaccard over the drafted lines, stop-words removed: **zero pairs at
or above 0.34**, top pair below threshold. The artefact drafts are mutually distinct _as written_ — a
promising result, but a weak instrument: Jaccard on 78-character lines measures vocabulary overlap, not
whether two modes would be chosen for the same request. T-C proper still needs the three briefs.

**What this does not settle.** The stance frame has **no drafted `whenToUse` lines**, so T-C and T-B cannot
yet be run symmetrically, and the 2 × 2 in §3.1 is still an argument. Drafting those 44 lines is the next
task, and it is the last prerequisite before T-F can materialise both catalogues as `.roomodes`-compatible
files and compare them for real.

NOTE:
The axis-stance frame fails its own coverage test: 108 job ids assigned, 106 unique, so 13 jobs uncovered and 2 double-assigned (§6). That is worse than the artefact frame's 4 uncovered, and it fails differently — it drops evidence jobs and cross-cutting concerns (R6, Q6, S6, S9, I8, I9) rather than "things that are not artefacts". So it is not a draft to adopt wholesale.

The artefact frame's pruning section is headed "47 → 40" but its own arithmetic is 37 classes (47 − 10 merged, line 127). A stale heading, exactly the class of defect the count rules exist to prevent. Also, modes-units.md §11 still says "42 owners: 24 coding, 5 meta, 13 non-coding", which the frame's own correction superseded (16 non-coding, 45 total). Two documents, two totals, no reconciliation note.
