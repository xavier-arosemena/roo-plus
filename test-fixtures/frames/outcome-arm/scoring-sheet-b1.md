# B1 pilot scoring sheet — outcome arm (blind)

**Status: unfilled.** No score, verdict, count or duration is entered in this file. It is a form.

## What this sheet scores

B1 only ("failing CI, no local repro"): six pilot runs, three per arm, executed in the
pre-registered interleaved order `a b b a a b`. One row per case in section 3.

Two rules for the scorer:

1. **Do not open `_blinded/BLIND-MAP-DO-NOT-SHOW-SCORERS.json`.** It maps case ids back to run ids
   and arms, and reading it de-blinds the whole sheet. If it is opened, say so in the de-blinding
   box in section 4 — the pre-registered blind-scoring rule requires any de-blinded run to be
   reported separately.
2. **Mode names appear as `MODE-X`.** Every blinded transcript has the arm names and mode labels
   replaced by `MODE-X`, and the workspace path replaced by `<WORKSPACE>`. If a case is somehow
   identifiable as an arm, stop and record that in section 4 rather than scoring as if it were blind.

**A scorer is given only `runs/_blinded/<case-id>.md`.** The raw run trees are de-blinded too: every
`runs/<run-id>/` directory holds a `meta.json` naming its `arm` and `mode`, and a `mode.roomodes` copy
carrying the arm's slug, so handing a scorer the `runs/` tree voids the blinding as surely as opening
the blind map. A transcript that quotes the installed `.roomodes` file name or its own slug is a
blinding failure: record it in the de-blinding events below and do not score it.

The harness that produced the cases is
[`run-b1-pilot.sh`](run-b1-pilot.sh); the cases themselves live in `runs/_blinded/`.

## 1. Rubric, copied verbatim from the pre-registration

Source: [`docs/reviews/2026-11-09-frame-decision-preregistration.md`](../../../docs/reviews/2026-11-09-frame-decision-preregistration.md),
lines 70–79, copied byte-for-byte with no re-wrapping and no separator changes.

```text
## 5. Outcome rubrics (written before the data)

| Brief | Pass | Fail |
| --- | --- | --- |
| **B1** | CI green **and** a named root cause with evidence (log line, bisect range, or trace) **and** a test or guard preventing recurrence | Green CI with no explanation; a guess presented as a cause; a fix that widens or skips the failing test |
| **B2** | Measured improvement ≥ 3× on the stated workload, with the measurement committed, and no regression in the test suite | A change with no measurement; a benchmark with no change; a change that breaks tests |
| **B3** | An answer citing `path:line` for each structural claim, and naming at least one decision the alternatives would have changed | A plausible narrative with no citations; a restatement of the code; a guess about intent |

**Blind-scoring rule:** the scorer receives the transcript with all mode names replaced by `MODE-X`. If
de-blinding happens for any run, that run is reported separately.
```

Copied verbatim from §6 — the pass/fail thresholds a scorer may want are implied by the brief's own pass
row, not by this table; §6 is the arm-versus-arm decision and is reproduced here only so the sheet is
self-contained.

```text
## 6. Decision rule (pre-registered)

| Result | Decision |
| --- | --- |
| One arm +≥ 10 pp, CI excluding zero, on ≥ 2 of 3 briefs | **Adopt that frame** for the catalogue structure |
| Difference < 10 pp, or CI includes zero, or mixed across briefs | **H3 stands: one catalogue, two views.** No frame wins; the next increment is UI and `planner`, not restructuring |
| Both arms fail a brief systematically (< 40% pass) | The *doctrine* is wrong, not the frame. Stop frame work; fix the six shared doctrines and re-run |

**No result permits "we need more data" as a conclusion** — the third row exists precisely to force a
different next action when the answer is "both are bad".
```

## 2. Cross-check: what the pre-registration does not contain

Three facts, checked by reading the pre-registration rather than assuming:

- **No pilot reading rule.** The pre-registration has section 6 (the arm-versus-arm decision rule) and
  section 9 (the separate first-run human observation). It defines nothing about how to read a small
  pilot of this kind. This sheet therefore does not invent one, and neither does the harness.
- **No brief text.** The pre-registration references the briefs by id and names the intended owner for
  B1 (`debug` / `bug-report`), but it never quotes the sentence a model would receive. The B1 wording
  does **not** live in the pre-registration.
- **The B1 wording used here is not pre-registered.** It comes from
  [`docs/reviews/2026-11-09-frame-bakeoff-run.md`](../../../docs/reviews/2026-11-09-frame-bakeoff-run.md)
  (the Step 2 brief table, around line 146) and is marked `CONSTRUCTED` under the pre-registration's
  own section 3 sourcing rule, which says such briefs must be disclosed as a limitation. The harness
  records the same provenance in every `meta.json` under `brief_source`, so a run cannot silently
  claim a frozen wording.

Consequence for a reader of this sheet: a result here is a result for **this** sentence, not for a
sentence the pre-registration fixed. If the sentence changes, the pilot is a different pilot.

## 3. Fill-in table — one row per case

Leave a cell empty when it does not apply; do not fill a cell from memory. "Evidence cited" means the
specific log line, bisect range or trace the transcript gives, quoted or cited as `path:line`.

| Case    | Pass/Fail (§5 B1) | Root cause named? | Evidence cited (log line / bisect range / trace) | Guard or test preventing recurrence? | Notes |
| ------- | ----------------- | ----------------- | ------------------------------------------------ | ------------------------------------ | ----- |
| case-01 |                   |                   |                                                  |                                      |       |
| case-02 |                   |                   |                                                  |                                      |       |
| case-03 |                   |                   |                                                  |                                      |       |
| case-04 |                   |                   |                                                  |                                      |       |
| case-05 |                   |                   |                                                  |                                      |       |
| case-06 |                   |                   |                                                  |                                      |       |

## 4. Verdicts and de-blinding

A `FAIL` verdict needs the §5 fail row that applies, not an impression. An `UNSCORABLE` verdict needs a
reason (for example: the transcript is empty, or the harness recorded `UNRUN` / `INVALID` so there is
nothing to score).

| Case    | Verdict (`PASS` / `FAIL` / `UNSCORABLE`) | Basis, one line |
| ------- | ---------------------------------------- | --------------- |
| case-01 |                                          |                 |
| case-02 |                                          |                 |
| case-03 |                                          |                 |
| case-04 |                                          |                 |
| case-05 |                                          |                 |
| case-06 |                                          |                 |

**De-blinding events.** Per the blind-scoring rule quoted in section 1: if de-blinding happened for any
run, that run is reported separately. Record the case id, what gave it away, and whether the score was
kept or set aside.

```text
de-blinding events: none recorded
```

## 5. Arithmetic footer — what this pilot cannot decide

With three runs per arm (six runs total), this pilot **cannot evaluate section 6**. The thresholds there
require a difference of at least ten percentage points with a confidence interval excluding zero. Three
versus three runs cannot produce a stable rate, let alone an interval narrow enough to exclude zero; the
pre-registration's own sizing section puts the comparison at fifty-four runs across three models, and
even that document calls the per-model comparison underpowered.

Therefore:

- The pilot reports **descriptive counts only** — for example "two of three cases named a root cause with
  a cited log line" — and those counts are all this sheet may ever contain.
- Any statement of the form "arm A beat arm B" cannot be made from this sheet, in either direction,
  whatever the six verdicts turn out to be.
- The third row of section 6 (both arms failing a brief systematically) is a statement about a rate; six
  runs can hint at it and cannot establish it. If the hint appears, the honest next step is the full
  panel the pre-registration describes, not a frame decision.
- No number in this sheet is a measurement until a transcript exists for the case. An `UNRUN` case has no
  score, and a missing score is not a failure.
