# Outcome-arm test material

Pre-registration: [`docs/reviews/2026-11-09-frame-decision-preregistration.md`](../../../docs/reviews/2026-11-09-frame-decision-preregistration.md).

This directory holds the **six real modes** the outcome arm compares. They are not routing fixtures: they
have charters, contracts and grants, because the test asks whether an agent _placed_ in a mode does the job.

## The control that makes the comparison mean something

| Pair | Arm A (stance label) | Arm B (artefact label) | Doctrine + grants  |
| ---- | -------------------- | ---------------------- | ------------------ |
| B1   | `debug`              | `bug-report`           | **byte-identical** |
| B2   | `performance`        | `benchmark`            | **byte-identical** |
| B3   | `explain`            | `explanation`          | **byte-identical** |

Verified on 2026-11-09 by hashing `roleDefinition` + `customInstructions` + `groups` per pair: all three
**IDENTICAL**. Only `slug`, `name`, `description` and `whenToUse` differ.

Consequence: any difference in outcome is attributable to **label and routing line**, not to prose. That is
the flaw the first bake-off could not avoid, and this design exists to remove it.

## Disclosed asymmetries

| Asymmetry                              | Magnitude                                      | Why it is disclosed rather than fixed                                                                                                       |
| -------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Routing-line length favours arm B here | B1 97 vs 81 · B2 102 vs 88 · B3 96 vs 81 chars | Equalising length would require padding one arm artificially; instead the direction of the bias is stated, and it favours the _rival_ frame |
| `debug` is a Roo+ built-in slug        | arm A only                                     | The pre-registration adds a **neutralised control** (`mode-a`/`mode-b`) to measure priming directly                                         |
| Doctrine quality is untested           | both arms                                      | This test compares frames, not doctrine; a shared bad doctrine fails both arms equally                                                      |

## Status

| Prerequisite                                                                 | State                                                                                                                                        |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Six real modes with identical doctrine                                       | ✅ present, hashes verified                                                                                                                  |
| Pre-registration filed                                                       | ✅ 2026-11-09                                                                                                                                |
| Three workspace snapshots (B1 failing CI, B2 slow path, B3 confusing module) | ✅ built — `snapshots/b1-failing-ci`, `snapshots/b2-slow-path`, `snapshots/b3-confusing-module`; each ships `history.bundle`, no live `.git` |
| B1 pilot harness                                                             | ✅ `run-b1-pilot.sh` — `--dry-run` exercised; no real runner supplied                                                                        |
| Scoring sheet copied from the pre-registration                               | ✅ `scoring-sheet-b1.md` — §5/§6 copied verbatim; unfilled form                                                                              |
| B1 pilot (six runs, three per arm)                                           | **UNRUN — no model run has been executed**; no `runs/` tree, no transcript, no score                                                         |
| Cross-model panel credentials                                                | ❌ pending                                                                                                                                   |

## How to run (once the snapshots exist)

1. For each brief, clone the snapshot fresh per run (`git clone` + trim history to the commit under test).
2. Install one arm's `.roomodes` into the clone, selecting the single mode for that brief.
3. Run the agent with the brief verbatim, same tool grants, temperature pinned.
4. Record the transcript to `runs/<run-id>/` with `arm`, `model`, `brief`, `mode` in `meta.json`.
5. Before scoring, replace every mode name in the transcript with `MODE-X` (blinding), then score against the
   rubric in the pre-registration §5.

**Interleaving:** A, B, B, A, … so model drift affects both arms equally. 3 models × 3 runs × 2 arms ×
3 briefs = **54 runs**.

## Operational notes

Established by the 2026-11-10 audit of the material; they are what the human running the sweep needs
to know before treating an output as a failure.

- **History is bundled, not checked out.** Each snapshot ships a real `history.bundle` and no live
  `.git`, because a parent repository cannot track an embedded repository's contents. Run
  `./run.sh --init-history` before `git log`, `git blame` or `git bisect`; until then those commands
  see the enclosing repository, not the snapshot.
- **One dirty line is expected.** After `--init-history`, `git status --porcelain` prints exactly one
  line, ` M history.bundle`, because a bundle cannot contain the bytes of the commit that adds it.
  That is by design and is not a harness failure. (Installing an arm's `.roomodes` into the same
  workspace adds a second, untracked line.)
- **The B1 harness pins its order.** `run-b1-pilot.sh` runs `a b b a a b` and `--runs` accepts only
  `3`; any other value is rejected rather than silently changing the experiment.
- **Blinding writes two things.** `runs/_blinded/case-NN.md` is what a scorer receives;
  `runs/_blinded/BLIND-MAP-DO-NOT-SHOW-SCORERS.json` maps cases back to run ids and must not be
  opened by the scorer. The raw `runs/<run-id>/` trees are de-blinded (they contain `meta.json` and
  the installed arm file), so they are not scoring material.

## Amendment log

| Date       | Change                                                                                                                                                                                                                                                             | Reason                                                                                                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-09 | The six modes were **hand-written** rather than emitted by `generate-frame-fixtures.mjs --outcome-arm`                                                                                                                                                             | Pre-registration §3 anticipated generator support; hand-writing was cheaper and more auditable at this size. Filed **before** any trial, as the pre-registration requires |
| 2026-11-10 | Added the three workspace snapshots (`b1-failing-ci`, `b2-slow-path`, `b3-confusing-module`), the B1 harness `run-b1-pilot.sh` and the B1 scoring sheet `scoring-sheet-b1.md`. The two `.roomodes` files were **not** touched. The pilot has **not** been executed | The material supply the pre-registration's filing note requires; no doctrine, arm file or rubric changed, and there is no run, transcript or score to report              |

## What must not happen here

- No edit to a mode's doctrine between arms. If a doctrine is wrong, both arms are updated together and the
  change is logged above.
- No runs excluded except documented harness failures, which are recorded as `INVALID`, never deleted.
- No scoring by the person who wrote the modes, where it can be avoided.
