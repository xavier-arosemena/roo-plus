# Pre-registration: the frame decision test (outcome arm + first-run observation)

| Field          | Value                                                                                                                                                                                                                                                                                                                           |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**     | Pre-registration, 2026-11-09. **Filed before any trial runs.** Nothing here may be changed after the first run without a dated amendment explaining what changed and why. **The human protocol in §9 is superseded by Amendment 5 (2026-11-10): no human sample is available, and the instrument is an agent framing pretest.** |
| **Why**        | Three attempts have failed to separate two candidate catalogues on _labelling_ (T-C, the bake-off, and the bake-off red team). The only remaining variable that can decide anything is **behaviour**: does placing an agent in a mode produce the job, or not?                                                                  |
| **Supersedes** | The bake-off's next-test recommendation, whose criterion 1 was shown to be broken ([red team](../reviews/2026-11-09-frame-bakeoff-red-team.md) §5).                                                                                                                                                                             |
| **Decides**    | One of three outcomes: **frame A** (axis × stance), **frame B** (artefact), or **neither** — in which case the design is **one catalogue with two views** and the decision moves to UI work, not catalogue work.                                                                                                                |

---

## 1. Hypotheses, stated before the data

| ID                       | Hypothesis                                                                                                                            | Prediction if true                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| **H1**                   | The stance frame produces better outcomes because its charters encode a _way of working_ (diagnose-before-fix, measure-before-change) | Arm A task-success rate exceeds B's by ≥ 10 percentage points       |
| **H2**                   | The artefact frame produces better outcomes because an artefact names the _deliverable_, which constrains output shape                | Arm B exceeds A by ≥ 10 pp                                          |
| **H3 (null / two-view)** | Labels do not change outcomes; what changes outcomes is the doctrine and the capability grant, which both frames can express          | The difference is < 10 pp with a confidence interval including zero |

**Pre-commitment:** if H3 holds, the frame choice is not a catalogue question. We adopt **one catalogue with
two views** (artefact names as an index over stance owners) and spend the next increment on `planner` as the
exploring-state entry rather than on restructuring.

## 2. Variables

| Role                  | Definition                                                                                                                                                                          |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Independent**       | Catalogue frame: **A** = axis × stance, **B** = artefact. Only the _names and grouping_ differ; doctrine and grants are held constant (§3)                                          |
| **Primary dependent** | **Task success** — a binary per run, scored against a pre-written outcome rubric (§4)                                                                                               |
| **Secondary**         | Turns to completion, tokens spent, human interventions needed, and whether the mode chosen matched the intended owner                                                               |
| **Controls**          | Same model set, same brief text (verbatim in §3.1), same workspace snapshot, same tool grants, same doctrine (see §3), temperature pinned, runs interleaved A/B/B/A to cancel drift |

## 3. Materials — and the scoping trick that makes this feasible

The bake-off's fatal flaw was comparing _catalogues_ by their labels while their doctrine was never written.
The outcome arm does not need 45 or 47 complete modes: it needs **the six modes the three briefs can reach**.

| Brief                                                   | Arm A mode    | Arm B mode    | Shared doctrine source                                                |
| ------------------------------------------------------- | ------------- | ------------- | --------------------------------------------------------------------- |
| **B1** — failing CI, no local repro                     | `debug`       | `bug-report`  | The same charter and contract, differing only in name and `whenToUse` |
| **B2** — make this endpoint 3× faster                   | `performance` | `benchmark`   | Same, with the _measure-then-change_ procedure                        |
| **B3** — explain why this module is structured this way | `explain`     | `explanation` | Same, with the evidence-citation rule                                 |

**The control that makes the comparison mean something:** both arms use **byte-identical doctrine and
capability grants**; only `slug`, `name` and `whenToUse` differ. If doctrine were allowed to differ, any
result would be attributable to the prose, not the frame — the mistake the bake-off could not avoid.

**Brief sourcing rule:** the three texts must be adapted from real issue or chat text, not written from the
catalogue. If no tracker text can be used, the brief is marked `CONSTRUCTED` and that is recorded as a
limitation. _(Current status: all three marked `CONSTRUCTED` — no tracker text was available in-session.)_

**Test units** live in `test-fixtures/frames/outcome-arm/` as six real `.roomodes` files:
[`arm-a.roomodes`](../../test-fixtures/frames/outcome-arm/arm-a.roomodes) and
[`arm-b.roomodes`](../../test-fixtures/frames/outcome-arm/arm-b.roomodes). _(Amended 2026-11-10: they are
**hand-written**, not generated — a `scripts/generate-frame-fixtures.mjs --outcome-arm` mode was anticipated
and never built.)_ Fixtures remain routing vehicles; **these six are real modes**.

### 3.1 Brief texts (verbatim)

These are the exact strings the harness passes; nothing may be prepended or appended.

| ID     | Text                                                           | Provenance                                                        |
| ------ | -------------------------------------------------------------- | ----------------------------------------------------------------- |
| **B1** | `CI is red on a test that passes locally. I have no idea why.` | `CONSTRUCTED` — adapted in-session; no tracker text was available |
| **B2** | `Make this endpoint 3× faster.`                                | `CONSTRUCTED`                                                     |
| **B3** | `Explain why this module is structured the way it is.`         | `CONSTRUCTED`                                                     |

**Why this section exists:** §2 listed "same brief text" as a control while containing no brief text, which
made the control unfalsifiable. The deficit was reported by the sub-task that built the harness, correctly —
the pre-registration is the author's document, not the builder's.

## 4. Procedure

1. **Snapshot** a workspace at a fixed commit with a task that is demonstrably failing (for B1), a known
   slow path (B2), and a module with non-obvious structure (B3). One snapshot per brief.
2. **Interleave** runs: A, B, B, A, … so model drift affects both arms equally.
3. **Panel**: ≥ 3 models from different families. Each model runs each brief in each arm **3 times**
   (6 modes × 3 briefs-arms… total 54 runs per model). Record everything; discard nothing.
4. **Score** each run with the rubric below, by a scorer who does **not** know which arm produced it
   (arm labels removed from transcripts).
5. **Analyse** success-rate difference with a confidence interval; report per-model results separately
   before pooling.
6. **Publish** raw transcripts under `test-fixtures/frames/outcome-arm/runs/<run-id>/` and a report at
   `docs/reviews/<date>-frame-outcome-pilot.md` for the six-run pilot, and
   `docs/reviews/<date>-frame-outcome-arm.md` for the full panel.

## 5. Outcome rubrics (written before the data)

| Brief  | Pass                                                                                                                               | Fail                                                                                                    |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **B1** | CI green **and** a named root cause with evidence (log line, bisect range, or trace) **and** a test or guard preventing recurrence | Green CI with no explanation; a guess presented as a cause; a fix that widens or skips the failing test |
| **B2** | Measured improvement ≥ 3× on the stated workload, with the measurement committed, and no regression in the test suite              | A change with no measurement; a benchmark with no change; a change that breaks tests                    |
| **B3** | An answer citing `path:line` for each structural claim, and naming at least one decision the alternatives would have changed       | A plausible narrative with no citations; a restatement of the code; a guess about intent                |

**Blind-scoring rule:** the scorer receives the transcript with all mode names replaced by `MODE-X`. If
de-blinding happens for any run, that run is reported separately.

## 6. Decision rule (pre-registered)

| Result                                                          | Decision                                                                                                          |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| One arm +≥ 10 pp, CI excluding zero, on ≥ 2 of 3 briefs         | **Adopt that frame** for the catalogue structure                                                                  |
| Difference < 10 pp, or CI includes zero, or mixed across briefs | **H3 stands: one catalogue, two views.** No frame wins; the next increment is UI and `planner`, not restructuring |
| Both arms fail a brief systematically (< 40% pass)              | The _doctrine_ is wrong, not the frame. Stop frame work; fix the six shared doctrines and re-run                  |

**No result permits "we need more data" as a conclusion** — the third row exists precisely to force a
different next action when the answer is "both are bad".

## 7. Sample size and stopping

- 3 models × 3 runs × 2 arms × 3 briefs = **54 runs**. At an expected 60–80% pass rate, this detects a
  10 pp difference at roughly 80% power for the pooled comparison; per-model comparisons are **underpowered
  and will be reported as descriptive only**.
- **Stopping rule:** no early stopping, no dropping of briefs after seeing results, no run excluded except
  for a documented harness failure (and then it is recorded as `INVALID`, never deleted).

## 8. Threats and mitigations

| Threat                                                                      | Mitigation                                                                                                                                                              |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Built-in slug priming** (`debug`, `code`, `architect` are Roo+ built-ins) | Neither arm's chosen slugs are built-ins except `debug`; run a control arm where both labels are neutralised (`mode-a`/`mode-b`) to measure the priming effect directly |
| **Author wrote the doctrine**                                               | Doctrine is shared across arms, so author bias cannot favour one arm; briefs are `CONSTRUCTED` and that is disclosed                                                    |
| **Model-specific vocabulary**                                               | Cross-family panel; per-model results reported before pooling                                                                                                           |
| **Scorer bias**                                                             | Blind scoring with `MODE-X` placeholders; a second scorer on 20% of runs; disagreement reported                                                                         |
| **Snapshot leakage** (the model finds the answer in git history)            | Fresh clone per run; history trimmed to the commit under test                                                                                                           |
| **Fixtures are not real modes**                                             | The six outcome-arm modes are real (charter + contract + grants); the routing fixtures are not used here                                                                |

## 9. First-run observation (the second arm of the decision)

Separate, cheaper, and it answers the entry-point question the frames cannot:

| Element                | Design                                                                                                                                                                                  |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Participants           | 5 developers who have not read either catalogue                                                                                                                                         |
| Task                   | "You have a slow endpoint and a confusing module. Show me how you would pick an assistant for each."                                                                                    |
| Instrument             | Think-aloud, screen recording; **no catalogue is shown until they ask for one**                                                                                                         |
| Measures               | (a) do they state a **goal** or a **deliverable** first; (b) time to first selection; (c) whether they ask for help choosing; (d) whether `planner`/`orchestrator` is used when offered |
| Pre-registered reading | If ≥ 3 of 5 state a goal and not a deliverable, the **exploring state dominates** and an artefact-first selector is the wrong default regardless of the outcome arm's result            |

## 10. What this test does not cover

- Non-coding axes (A13–A22) — a separate design question, deferred.
- Preload selection — decided after the structure, per the brainstorm's sizing rule.
- Long-run effects (week-two habit, fatigue) — unobservable without telemetry.
- Whether the six shared doctrines are _good_ — this test compares frames, not doctrine quality.

---

**Filing note.** This document is the pre-registration. The first trial may not run until: the six
outcome-arm modes exist, the three snapshots are fixed, and the two blind-scoring rubrics above are copied
into the scoring sheet unchanged.

---

## Amendment log

| Date       | Change                                                                                                                                                                                                  | Reason                                                                                                                                                                                                                                              | Before any data?    |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| 2026-11-10 | §2 control points at §3.1; §3.1 added with the three brief texts verbatim                                                                                                                               | §2 named "same brief text" as a control while the text appeared nowhere — an unfalsifiable control                                                                                                                                                  | ✅ no runs executed |
| 2026-11-10 | §3 no longer claims a generator `--outcome-arm` mode; the six modes are hand-written                                                                                                                    | The mode was anticipated and never built; hand-writing was auditable at this size                                                                                                                                                                   | ✅                  |
| 2026-11-10 | §4 step 6 names both report paths (`…-pilot.md` for six runs, `…-outcome-arm.md` for the full panel)                                                                                                    | One path had been named for two different scopes                                                                                                                                                                                                    | ✅                  |
| 2026-11-10 | **Pilot tier added** (below)                                                                                                                                                                            | §6's ≥10 pp rule cannot be reached by six runs, so a pilot needs its own reading rule; its absence caused a delegation to cite a rule that did not exist                                                                                            | ✅                  |
| 2026-11-10 | Arm-file headers corrected: `description` also differs between arms                                                                                                                                     | The headers claimed only `slug`, `name` and `whenToUse` differ; all three pairs also differ in `description`                                                                                                                                        | ✅                  |
| 2026-11-10 | **Amendment 5 — the agent framing pretest** (below); §9's human protocol superseded, top-level status line updated                                                                                      | No human sample is available. The five-developer observation cannot be run, and reusing its name would invite a population reading this instrument cannot support                                                                                   | ✅ no runs executed |
| 2026-11-11 | **Amendment 6 — what pre-run verification changed** (below): B3 withdrawn from discriminability; `frame` retired as a blindness token; the directive-only manipulation and the ambiguity of a null gate | Independent verification of the 30 prompts found the B3 caveat was a bias claim where the evidence shows a ceiling; and found the persona manipulation moves only the directive, which makes a null sensitivity result ambiguous between two causes | ✅ no runs executed |

### Amendment 4 — the pilot tier

A six-run pilot (2 arms × 3 runs, one model, one brief) is **descriptive only**. It cannot evaluate §6's
±10 pp threshold and must not be reported as if it could.

| Pilot observation                      | Permitted reading                                                                                            | Not permitted         |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------- |
| 6/6 or 0/6 to one arm                  | Possible ceiling or floor effect — investigate whether the brief or the doctrine is the cause before scaling | "That arm wins"       |
| Mixed, no obvious pattern              | No signal at this sample size                                                                                | "Neither frame works" |
| Both arms fail the same rubric element | Doctrine problem, not frame problem — §6 row 3 applies                                                       | "Inconclusive"        |

**A pilot with zero executed runs returns no result.** That is distinct from "no difference" and from
"needs more data": it means the instrument was not exercised.

### Amendment 5 — the agent framing pretest (2026-11-10)

**1. No human sample is available.** The five-developer first-run observation specified in §9 cannot be
run. No external developers will be observed, and there is no date on which that changes. §9 is
retained unedited as the record of what was registered on 2026-11-09; its **Participants** row is void,
and this amendment supersedes it.

**2. The instrument is an agent framing pretest.** Everything built from this point is a pretest
against a prompt-level instrument. The name **"first-run observation" must not be reused** for it in
any document: reusing it would invite the result to be quoted for something it cannot support.

**3. Replacement protocol: 5 declared personas × 3 repetitions × 2 catalogues = 30 runs.** The
personas are **framing conditions, not demographics**: (1) goal-only explorer, (2) artefact-only
deliverer, (3) terse one-liner, (4) verbose context dump, (5) imprecise vocabulary / non-native
phrasing. The three repetition slots carry the three fixed briefs of §3.1, one each, so within one
persona × catalogue the three runs are three _different_ briefs. **Repetition and brief are therefore
not separable**, and no within-persona variance estimate may be reported from these 30 runs.

**4. Persona is added as a variable**, alongside catalogue frame. **§6's decision rule survives
unchanged**, including its third row: a result where both catalogues fail the same rubric element
still means the _doctrine_ is wrong rather than the frame. The rule survives because it compares
catalogues with each other, not a catalogue against a population.

**5. H1's evidential status is downgraded** from population inference to **instrument sensitivity**.
H1's ≥10 pp arithmetic stays in §1 and §6 as the decision rule's threshold; what it may no longer be
read as is a claim about how people behave. The question H1 now asks is whether the five directives
separate goal-framing from deliverable-framing **at all**.

**6. The asymmetry, stated explicitly.** A **failing** sensitivity result is **strong** evidence: if
the personas do not diverge on framing, the instrument is dead and no catalogue comparison built on
it is meaningful. A **passing** sensitivity result is **weak** evidence: it shows the instrument can
separate the conditions it was designed to separate, and nothing whatever about developers. **A pass
must not be read as a green light** for either frame, and no announcement may cite one.

**7. The gate order is part of the protocol.** The sensitivity gate is evaluated **first** and
**recorded before any discriminability claim is made**. A discriminability figure produced before
that record exists is not a result of this pre-registration, regardless of how it was obtained.

**8. Blinding.** Each run sees only **one** catalogue's `slug` / `name` / `whenToUse`, the persona
instruction, and one brief. It does not see `roleDefinition`, `customInstructions`, `groups`, or any
arm or frame name. Labels are assigned by a deterministic hash sort, and the label → frame mapping is
written to a file that scorers must not open.

**What this amendment does not change.** H1–H3 stand. §3.1's brief texts are reused verbatim rather
than rewritten, because a new brief set would be a different experiment. §5's rubrics, §6's decision
rule, §7's stopping rule and §8's threat table stand. Only §9's participants and the instrument
change.

**Known limitation, recorded before any data.** One registered brief's verb (`Explain`, in B3)
coincides with a slug that exists in one of the two catalogues. It is _reported_ by the harness's
blindness audit rather than sanitised: editing the brief would change registered material, and
removing the word would remove the word-overlap signal the bake-off already identified. Any
discriminability result on B3 must be read with that overlap in view.

**Where the instrument lives, and its state.** [`scripts/run-framing-pretest.mjs`](../../scripts/run-framing-pretest.mjs),
its material and audit in [`scripts/lib/framing-pretest.mjs`](../../scripts/lib/framing-pretest.mjs),
and the operator procedure in [`scripts/RUN-FRAMING-PRETEST.md`](../../scripts/RUN-FRAMING-PRETEST.md).
**State: `UNRUN`.** The 30 prompts, the plan and the blind map have been produced in dry-run; no model
has been called and no response exists. The rule added by Amendment 4 applies to this instrument too:
a pretest with zero executed runs returns no result.

### Amendment 6 — what pre-run verification changed (2026-11-11)

Verification was performed by re-running the dry-run independently and inspecting the produced bytes, not by
reading the harness's own report. Four findings, all recorded **before** any run.

**1. Verified, independently.** The harness is 5 personas × 3 briefs × 2 catalogues
([`framing-pretest.mjs:242`](../../scripts/lib/framing-pretest.mjs:242)); 30 prompts are produced; byte
statistics reproduce exactly at min 5,745 / max 6,364 / mean 6,064.93; picker line counts are 45 and 47,
matching the two fixtures; no `roleDefinition`, `customInstructions` or `groups` text appears in any prompt;
there is no NUL byte and no invalid UTF-8. The 282 non-ASCII bytes are the 47 em dashes that separate
slug, name and routing line.

**2. `frame` is retired as a blindness token.** The audit reports 60 occurrences of `frame` in pickers. They
are 45 × **"framed"** (the `requirements` routing line: "must be framed into a testable scope") and
15 × **"framework"** (a stack description). Both sit inside picker text, which is the material under test,
and neither is a leak. Consequence: `frame` must not be used as a leak indicator in future audits — it is
an ordinary English word that appears legitimately in routing lines. Only `CATALOGUE-` labels, the
fixture names and the doctrine/grant markers are valid leak tokens.

**3. B3 is withdrawn from the discriminability comparison.** This supersedes the closing sentence of
Amendment 5's known limitation. The claim there — that the brief's verb "coincides with a slug that exists
in one of the two catalogues" — is true but points the wrong way: **both** catalogues carry an obvious
comprehension owner, with near-verbatim routing lines.

| Catalogue     | Owner         | Routing line                                                                                       |
| ------------- | ------------- | -------------------------------------------------------------------------------------------------- |
| axis × stance | `explain`     | "Use when someone asks why code behaves as it does and the answer must cite evidence, not recall." |
| artefact      | `explanation` | "Use when someone asks why the code behaves as it does and evidence must be cited."                |

A brief whose answer is obvious in both arms is a **ceiling test, not a discrimination test**, so it carries
no information about which frame routes better. B3 therefore remains in the **sensitivity** analysis (framing
can still be read from its response) and is **excluded from any per-brief hit rate**. No substitution brief
is invented: §3.1 was registered, and adding a fourth brief mid-protocol would be a different experiment.

**4. The persona manipulation is directive-only, so a null gate is ambiguous.** All 30 prompts carry the
§3.1 briefs **verbatim**; the only difference between personas is the one-line directive above them. This
was a deliberate control (holding the request constant), but it has a consequence that must be stated in
advance: **if the sensitivity gate fails, two explanations fit**, and Amendment 5 item 6 calls a failing gate
"strong evidence" — which holds only for the first.

| If personas differ…                                                                                                       | Reading                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| in **response shape** (length, hedging, whether they ask for missing information) but **not** in goal/deliverable framing | The manipulation moved something, so the **framing measure** is what failed — instrument problem      |
| in **nothing measurable at all**                                                                                          | The manipulation was too weak to move a fixed brief — **protocol** problem, not an instrument problem |

Neither reading permits a catalogue conclusion, and the distinction must be recorded from the observed
responses rather than chosen afterwards.

**No other change.** H1–H3, §5's rubrics, §6's decision rule (all three rows), §7's stopping rule, §8's
threat table and Amendment 4 stand. The instrument remains **`UNRUN`**.
