# The axis × stance frame — the catalogue, with drafted routing lines

| Field                                      | Value                                                                                                                                                                                                                         |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                                 | Candidate catalogue, 2026-11-09. Written so both frames can be measured on identical instruments ([`modes-catalogue-brainstorm.md`](modes-catalogue-brainstorm.md) §12). No decision.                                         |
| **Question it organises the catalogue by** | **"What kind of work am I doing, in which area?"** — not "what am I producing?".                                                                                                                                              |
| **Unit**                                   | A mode is a **stance applied to a domain** (axis). Jobs are served by skills under each owner.                                                                                                                                |
| **Owner count**                            | **45** — 24 coding, 5 meta, 16 non-coding. _(Correction: earlier text said 44 with 15 non-coding; the per-axis list has always summed to 16, so the total is 45. Recorded here rather than silently reconciled — see §5.)_    |
| **Why this file exists**                   | The artefact frame has drafted `whenToUse` lines; this frame had only estimates. T-B and T-C cannot compare a real catalogue with an estimate, so the lines are drafted now — at the same ~78-char mean, for the same reason. |

---

## 1. Coding owners (24)

| #   | Mode                     | Axis | Stance    | Jobs owned                | Draft `whenToUse`                                                                                                | ~chars |
| --- | ------------------------ | ---- | --------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | `requirements`           | REQ  | frame     | R1 R5 R9                  | Use when a request lacks acceptance criteria and must be framed into a testable scope before work starts.        | 107    |
| 2   | `acceptance-criteria`    | REQ  | verify    | R4 R7                     | Use when criteria exist but are untestable and must become observable conditions with one check each.            | 106    |
| 3   | `architect`              | ARC  | design    | D1 D2 D3 D5 D6 D9         | Use when a design decision must be made: boundaries, quality attributes or a contract, with trade-offs recorded. | 113    |
| 4   | `architecture-reviewer`  | ARC  | review    | D10 Q4                    | Use when a design or an existing structure must be reviewed for risk, before build or after drift.               | 99     |
| 5   | `code`                   | IMP  | construct | I1 I2 I3 I5 I11 I12       | Use when specified behaviour must be implemented here with tests that fail before and pass after.                | 101    |
| 6   | `integration-engineer`   | IMP  | construct | I3 I6 I7                  | Use when third-party APIs, dependencies or protocol boundaries must be integrated or kept working.               | 103    |
| 7   | `explain`                | UND  | document  | C2 C3 C6 C7               | Use when someone asks why code behaves as it does and the answer must cite evidence, not recall.                 | 97     |
| 8   | `codebase-cartographer`  | UND  | research  | C1 C5 C8 C9 C10           | Use when an unfamiliar or large codebase must be mapped: entry points, flows, dependents, blast radius.          | 107    |
| 9   | `debug`                  | DBG  | diagnose  | B1 B2 B3 B4 B7 B8 B10 B11 | Use when something fails and the cause is unknown: produce a reproduction and a named root cause.                | 98     |
| 10  | `performance`            | DBG  | measure   | B5 B6 I10 O7 O11 T3       | Use when a performance, latency, memory or cost budget is missed and must be measured before changing.           | 106    |
| 11  | `test-author`            | TST  | verify    | T1 T5 T10                 | Use when behaviour needs executable evidence: tests mapped to criteria, failing before and passing after.        | 110    |
| 12  | `test-strategist`        | TST  | verify    | T2 T4 T6 T8 T9 T11        | Use when it is unclear what is worth testing: plan the suite by risk, cost and flakiness, not coverage.          | 108    |
| 13  | `refactoring`            | REF  | evolve    | I4 F1 F2 F6 F7 F8         | Use when code must change shape without changing behaviour and tests must stay green throughout.                 | 98     |
| 14  | `modernisation`          | REF  | evolve    | F3 F4 F5 F9               | Use when a dependency, framework or subsystem must be upgraded or retired in shippable stages.                   | 98     |
| 15  | `code-reviewer`          | REV  | review    | Q1 Q2 Q3 Q5 Q7 Q8         | Use when a change must be reviewed for defects, risk and convention before it merges, findings by severity.      | 112    |
| 16  | `release-readiness`      | REV  | review    | Q9 O3 O10 T7              | Use when a release candidate exists and someone must decide go or no-go with evidence.                           | 90     |
| 17  | `security-reviewer`      | SEC  | secure    | S7 S5 S10 Q4              | Use when a trust boundary, threat model or abuse case must be assessed before or after build.                    | 99     |
| 18  | `vulnerability-response` | SEC  | respond   | S1 S2 S3 S4 S8            | Use when a vulnerability, leaked secret or CVE must be reproduced, fixed and regression-tested.                  | 102    |
| 19  | `devops`                 | OPS  | deliver   | O1 O6 O8 O9               | Use when the pipeline, build, environment or release automation is the problem to fix.                           | 83     |
| 20  | `incident-commander`     | OPS  | operate   | O2 O4 O5                  | Use when production is degraded and restoration, timeline and follow-ups matter more than root cause.            | 104    |
| 21  | `data-analyst`           | DAT  | analyse   | X4 X2 X8                  | Use when a question can be answered from production data and the answer needs stated caveats.                    | 95     |
| 22  | `database-migration`     | DAT  | evolve    | D4 X1 X3 X5 X6 X7         | Use when a schema or data change must land safely: expand and contract, reversible, verified.                    | 99     |
| 23  | `documentation`          | DOC  | document  | K1 K2 K4 K5 K9            | Use when a reader must be able to act without asking: guides, references, runbooks, onboarding notes.            | 106    |
| 24  | `decision-record`        | DOC  | document  | K3 K8 K6 K7               | Use when a choice will be questioned later and must be recorded with context, options and consequences.          | 110    |

## 2. Meta owners (5)

| #   | Mode           | Stance   | Draft `whenToUse`                                                                               | ~chars |
| --- | -------------- | -------- | ----------------------------------------------------------------------------------------------- | ------ |
| 25  | `orchestrator` | delegate | Use when work spans several modes or agents and must be split into self-contained briefs.       | 90     |
| 26  | `planner`      | plan     | Use when the goal is known but the sequence is not: produce an ordered plan with checkpoints.   | 93     |
| 27  | `researcher`   | research | Use when the answer lives outside this repository or needs sources that can be cited.           | 88     |
| 28  | `critic`       | critique | Use when a claim, plan or design must be attacked before it is trusted.                         | 70     |
| 29  | `reasoner`     | reason   | Use when a decision needs explicit reasoning: hypotheses, verification and a stated conclusion. | 95     |

## 3. Non-coding owners (16)

| #   | Mode                   | Axis | Stance    | Draft `whenToUse`                                                                                 | ~chars |
| --- | ---------------------- | ---- | --------- | ------------------------------------------------------------------------------------------------- | ------ |
| 30  | `legal-review`         | A13  | review    | Use when a contract, clause or obligation must be read and summarised with the risk flagged.      | 93     |
| 31  | `compliance-mapping`   | A13  | verify    | Use when a regulation or policy must be mapped to concrete controls and evidence.                 | 87     |
| 32  | `marketing-strategist` | A14  | frame     | Use when positioning, channels or a campaign must be planned against a target audience.           | 92     |
| 33  | `content-writer`       | A14  | construct | Use when finished copy is needed for a channel, in a voice and length that fits it.               | 88     |
| 34  | `financial-analyst`    | A15  | measure   | Use when numbers must be modelled with assumptions, sensitivity and a recommendation.             | 94     |
| 35  | `pricing-analyst`      | A15  | analyse   | Use when a price or tier must be set or defended with willingness-to-pay reasoning.               | 91     |
| 36  | `product-manager`      | A16  | frame     | Use when a problem must be framed into a product bet with evidence and a success measure.         | 95     |
| 37  | `venture-analyst`      | A16  | analyse   | Use when a business idea must be tested for market, model and viability before building.          | 94     |
| 38  | `synthesis-writer`     | A17  | document  | Use when several sources must become one cited brief a decision-maker can act on.                 | 88     |
| 39  | `career-coach`         | A18  | plan      | Use when a developer needs a plan for a role change, promotion or job search.                     | 80     |
| 40  | `contract-negotiation` | A18  | frame     | Use when an employment or client contract must be negotiated with terms and fallbacks prepared.   | 99     |
| 41  | `science-advisor`      | A19  | reason    | Use when a scientific question in physics, chemistry or biology needs an evidence-based answer.   | 97     |
| 42  | `engineering-physics`  | A19  | analyse   | Use when a physical or engineering calculation must be checked against units and assumptions.     | 97     |
| 43  | `logic-math`           | A20  | reason    | Use when a formal argument, proof or quantitative derivation must be constructed or checked.      | 92     |
| 44  | `ai-feature-engineer`  | A22  | construct | Use when a model-powered capability must be built: prompts, retrieval, tool calls and evals.      | 99     |
| 45  | `ai-cost-engineer`     | A22  | measure   | Use when token spend, latency or model routing must be measured and reduced without quality loss. | 102    |

## 4. Stance vocabulary actually used

The closed list claimed 12, then 16. The assignments above use **19 labels**: frame, design, construct,
diagnose, measure, verify, review, evolve, operate, secure, document, analyse, delegate, plan, research,
critique, reason, deliver, respond.

That is the red team's O-10 objection confirmed by construction: **the stance vocabulary is not closed, it is
derived** — and it grows when new domains are added (non-coding work brought `respond` and `deliver` into
use). Recording it here rather than hiding it: a "closed list of stances" is a design aspiration, not a fact,
unless the list is fixed before assignment and assignments are forced into it.

## 5. Arithmetic correction

Earlier documents said 44 owners and 15 non-coding. The per-axis list (A13 2, A14 2, A15 2, A16 2, A17 1,
A18 2, A19 2, A20 1, A22 2) sums to **16**, so the catalogue is **45 owners**. The brainstorm is corrected in
the same pass; T-K exists to catch exactly this class of drift, and it caught one.

## 6. Job coverage — T-K on this frame (measured, and it does not flatter the frame)

A script over the tables above: **108 job ids assigned, 106 unique** — so **2 double-assigned** and
**13 jobs uncovered**. My first draft of this section claimed full coverage; that was wrong, and the
correction is the point of running the test rather than asserting the result.

| Missing            | Why they fell through                                                                                                                              |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **R2, R3, R8**     | requirements recovery, trade-off resolution and estimation were assumed to sit inside `requirements` or the meta modes — never explicitly assigned |
| **R6, Q6, S6, S9** | obligation→controls, docs-code drift, privacy flows, supply-chain evidence: all **evidence** jobs that no single stance naturally claims           |
| **D7, D8**         | spike and concurrency design appeared under `architect` in the units table but were not carried into this owner line                               |
| **I8, I9**         | i18n and accessibility fell between `code` and `integration-engineer`                                                                              |
| **C4, B9**         | failure-path tracing and race diagnosis were left to `explain`/`debug` implicitly                                                                  |

**Double-assigned:** Q4 (`architecture-reviewer` + `security-reviewer`), I3 (`code` + `integration-engineer`).

**This is worse than the artefact frame** (4 uncovered vs 13), and it fails in a different place: the stance
frame does not drop "things that are not artefacts" — it drops **evidence jobs and cross-cutting concerns**
that belong to no single stance. That is a substantive point against the frame I have been arguing for.

## 7. Costs — T-B (measured)

| Metric                        | Axis × stance                   | Artefact frame                                                          |
| ----------------------------- | ------------------------------- | ----------------------------------------------------------------------- |
| Owner modes                   | **45**                          | 47 (37 pruned)                                                          |
| Σ`whenToUse`                  | **4,208** over 45 drafted lines | **2,736** over 35 drafted lines                                         |
| Mean per line                 | **93.5** (max 112, min 71)      | 78.2 (max 90)                                                           |
| Headroom at the 12,000 budget | **7,792**                       | ~8,700                                                                  |
| Cost ratio                    | —                               | artefact is **1.27× cheaper**, not the 2.4× an earlier estimate implied |

The earlier claim of "~4k headroom" for this frame was an estimate from a 180-char mean; the drafted reality
(93.5) is almost twice as generous. **Drafted numbers beat estimates in both directions.**

## 8. Corrected comparison (both T-K and T-B run on both frames)

| Metric                                | Axis × stance                                       | Artefact                |
| ------------------------------------- | --------------------------------------------------- | ----------------------- |
| Owners                                | 45                                                  | 47 (37 pruned)          |
| Σ`whenToUse`                          | 4,208 (mean 93.5)                                   | 2,736 over 35 (mean 78) |
| **Jobs uncovered (T-K)**              | **13**                                              | **4**                   |
| **Double-assigned**                   | **2** (Q4, I3)                                      | **4** (K2, K3, T2, T6)  |
| Near-duplicate pairs (Jaccard ≥ 0.34) | **0**                                               | **0**                   |
| Labels used                           | 19 stances                                          | 47 artefact classes     |
| Family coherence                      | **intact** (11 of 12 axes keep their jobs together) | **5 families split**    |

**Honest reading:** the artefact frame wins on **coverage** and **cost**; the stance frame wins on **family
coherence** and on being a **closed vocabulary** (once §4's drift is fixed). Neither catalogue is ready, and
the two failures are complementary — which, taken with the reviewer's entry-point insight, is the strongest
argument so far for **one catalogue with two views rather than a winner**.
