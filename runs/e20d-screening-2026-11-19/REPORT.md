# Task C final attempt — ownership-ambiguous brief screen

Date: 2026-11-19 · model `gemini-3.5-flash` · temperature 0 · cap 4096 · 5 draws per arm, cycle `B C` · 30 calls, all `RUN`.

## Outcome

**None of the three briefs qualified. The 400-call sweep was not run, and no adjudication packet was built.**

A brief had to produce, across its ten replies, at least two asks under the v2 selection rule **and** at least three declarations of `explain`. Brief 1 and brief 3 keep `explain` plausible but never ask; brief 2 opens the ask channel but is owned by `architecture-reviewer`, not `explain`.

## Screening table

Counts are hand readings under the v2 selection rule: a reply that selects a mode and then asks for the code is a **declaration**; a reply that requests information while enumerating candidate modes without selecting one is an **ask**. Arm B is E20's "must cite evidence, not recall" line; arm C is "must not merely describe the code".

| Brief                                                            | Arm |  asks |                    declares `explain` | other modes declared      |
| ---------------------------------------------------------------- | --- | ----: | ------------------------------------: | ------------------------- |
| 1. Why does this service handle retries in two different places? | B   |     0 |                                   5/5 | none                      |
|                                                                  | C   |     0 |                                   5/5 | none                      |
| **brief total**                                                  |     | **0** |                             **10/10** | —                         |
| 2. Why is this module so hard to change?                         | B   |     1 |                                   0/5 | `architecture-reviewer` 4 |
|                                                                  | C   |     4 |                                   0/5 | `architecture-reviewer` 1 |
| **brief total**                                                  |     | **5** |                              **0/10** | `architecture-reviewer` 5 |
| 3. Why does this subsystem have three layers of caching?         | B   |     0 |                                   5/5 | none                      |
|                                                                  | C   |     0 |       4/5 mechanical (5/5 on reading) | none                      |
| **brief total**                                                  |     | **0** | **9/10 mechanical, 10/10 on reading** | —                         |

Notes on the two readings:

- Brief 2's asks contain no question mark; they say "I need the following information…" and list modes as options. The analyzer's `asks` column (a `?` test on undetermined replies) is 0 for all three briefs, so the ask counts above are the v2 hand reading, not that column.
- Brief 3, ARM-1-d002 is the bare token `explain`. That is not one of the v2 extractor's six accepted shapes, so it is mechanically undetermined and would go to adjudication; read by eye it is an unambiguous `explain` declaration. Both figures are shown; neither changes the acceptance.

## Acceptance check

| Brief | ≥2 asks | ≥3 `explain` declarations | Qualifies |
| ----- | ------- | ------------------------- | --------- |
| 1     | no (0)  | yes (10)                  | no        |
| 2     | yes (5) | no (0)                    | no        |
| 3     | no (0)  | yes (9–10)                | no        |

No tie-break was needed: the two conditions never hold for the same brief.

## What this establishes

The effect did not travel to either of the two ownership ambiguities tried here, and the two failures are different in kind.

- **Mechanism ownership is not ambiguous in practice.** "Retries in two different places" and "three layers of caching" were meant to be owned jointly by `explain`, `architect` and `architecture-reviewer`, but the model treated both as explanation-with-evidence questions and committed 20 of 20 times. These are the §28 briefs again in a different subject: the only thing missing is the code, which is requested after the line has already decided. The line therefore had nothing to decide, and no ask channel opened.
- **Change-friction ownership is ambiguous, but its owner is not `explain`.** "Why is this module so hard to change?" is genuinely contested: the replies name `architecture-reviewer`, `codebase-cartographer`, `refactoring` and `explain` as live candidates. That is where asks appear — 5 of 10 replies, with B 1/5 and C 4/5. But all five selections are `architecture-reviewer`; `explain` is the candidate the replies drop, not the one they pick. This reproduces the first-attempt failure recorded in D-27: the ambiguity exists, but the target is wrong.
- **The one observation worth carrying forward, stated with its limits.** On brief 2 the arm difference in commit-versus-ask runs in the opposite direction to E20 (there C asks more; in E20 B asked more), at five draws per arm. That is a description of ten replies, not an estimate, and it is measured against an owner that is not `explain`, so it is not a replication of the headline effect in either direction.
- **The programme still has one brief that satisfies both conditions.** E20's "Explain why this module is structured the way it is" is the only string in the record that both keeps `explain` plausible and opens the ask channel (40.8% of B and 14.0% of C undetermined). On this evidence the effect may be specific to that brief, or to a kind of ambiguity this screen has not yet characterised — one where `explain` is the _preferred_ owner but not the exclusive one. The two classes tried here bracket that condition without landing on it: mechanism questions resolve to `explain` without asking, and change-friction questions ask while resolving away from `explain`.

## Costs and mechanics

| Brief     | wall clock | mean / median per call |     prompt | candidates |   thinking | total tokens |
| --------- | ---------- | ---------------------- | ---------: | ---------: | ---------: | -----------: |
| 1         | 0.8 min    | 4.9 s / 4.4 s          |     12,820 |        558 |      5,847 |       19,225 |
| 2         | 1.2 min    | 7.4 s / 7.9 s          |     12,790 |        924 |     10,692 |       24,406 |
| 3         | 0.8 min    | 4.9 s / 5.3 s          |     12,800 |        376 |      6,795 |       19,971 |
| **total** | —          | 5.8 s mean (max 9.4 s) | **38,410** |  **1,858** | **23,334** |   **63,602** |

Calls: **30** (3 briefs × 10; 5 per arm), all `RUN`, no `UNRUN`, no `INVALID`, no truncation. Interleaving 9 transitions across 10 calls in each brief, max concurrency 1. Every usage sidecar records the 4096 cap. Key length 53; the key was never printed.

The two lines and the pickers are E20's: the generator re-derived both arms and asserted byte-identity against `test-fixtures/frames/e20/{B,C}.roomodes` before writing, and an independent `cmp` against those files confirmed it for all three screening fixtures.

## Deviations

1. Artefacts were written under `runs/e20d-screening-2026-11-19/` (one `brief-N/` per brief, each with its own plan, sealed key and label map), not under the `2026-11-18` directory used by the previous screen. The canonical `test-fixtures/frames/e20d` fixture was not regenerated.
2. A shell driver [`runs/e20d-screen-2026-11-19.sh`](runs/e20d-screen-2026-11-19.sh) and a variable-name lister [`runs/list-env-names.sh`](runs/list-env-names.sh) were added as run artefacts. The key is extracted from `.env` inside the shell and only its length is printed.
3. The ask counts are hand readings under the v2 selection rule because the analyzer's mechanical `asks` column is a `?` test and brief 2's asks carry no question mark. This is a reporting choice about the existing instrument, not a change to the rule.
4. Brief 3's `ARM-1-d002` (bare `explain`) is mechanically undetermined and would reach adjudication; it is reported as `explain` on reading alongside the mechanical 4/5.
5. Every screening brief is recorded with the generator's fixed brief id `D1`, as in the previous screen; the text itself is in `brief.txt` and `plan.briefs`.
6. No sweep, no adjudication packet, no second reading and no docs edits were made; nothing was committed.
