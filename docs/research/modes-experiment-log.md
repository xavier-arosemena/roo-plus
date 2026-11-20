# Modes experiment log — a methodical record

| Field              | Value                                                                                                                                                                                                                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What this is**   | A lab notebook for the modes-catalogue experiments, kept so the programme can be written up later without reconstruction. Every entry is dated, every number names its instrument, every deviation is logged where it happened.                                                                         |
| **Conventions**    | Entries are numbered `E<n>` and are append-only. A measurement is stated with its instrument in the same line. A departure from a registered protocol is a **deviation** and gets its own row in §6, even when it is my own error. Nothing here is a result unless a registered reading rule covers it. |
| **What it is not** | Not a paper, not a summary of intent. Results that contradict an earlier entry are added as new entries rather than edited into old ones.                                                                                                                                                               |
| **Status**         | Live. Last entry: **§33 (2026-11-20)**.                                                                                                                                                                                                                                                                 |

---

## Current state — read this before anything else (2026-11-13)

The log is append-only and therefore contains superseded readings. **This block is the only summary that should be quoted.**

**Established — routing.**

| Finding                                                                                                                                                                                                                            | Evidence              | Strength                                                    |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ----------------------------------------------------------- |
| **Brief clarity dominates.** An unambiguous brief gets a committed mode in **98–99 of 100** draws and a question in **0–1**; an ambiguous brief gets a question in **21–50 of 100**                                                | E13-R, 600 calls, §13 | High — 100 draws per cell                                   |
| **Every routing decision in the round was sound.** 598 of 600 replies either committed to the expected mode or asked for the information the brief omitted. The 2 exceptions were an adjacent mode, not an unrelated one           | E21b, §17.3           | High — dual-coded, two independent readings                 |
| **Label form is second-order.** Activity-vs-artefact naming and imperative-vs-declarative wording shift routing by single digits to about 20 points, and much of that shift lands in _whether it asks_, not in which mode it picks | E13-R, §12–13         | Medium — the 2×2 was pre-declared underpowered              |
| **Persona directives change wording, not routing.** 20 concordant picks across five directives                                                                                                                                     | E11, F-1              | High for the variable tested; one draw per persona per cell |
| **Exact lexical overlap does not guarantee selection.** A brief containing "Explain" still failed to reach the entry named `explain`                                                                                               | E11 + probe           | High                                                        |

**Corrected or withdrawn — do not quote these.**

| Withdrawn claim                             | Status                                                                                                                                                                                                       |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| "F-2 is refuted" (§12)                      | **Withdrawn.** It was a measurement artefact: responses that asked for information while naming candidate modes were scored as wrong picks. §13 carries the corrected classification, and **F-2 replicates** |
| "1/5 versus 4/5" as a rate difference (E11) | **Withdrawn.** Two single draws. Their Fisher p was 0.206                                                                                                                                                    |
| The four-cell reading table in §11          | **Superseded** by Amendments 1–2 of the registration. Retained as reasoning history only                                                                                                                     |
| "Temperature 0 is deterministic"            | **False**, measured: three identical prompts gave three different answers                                                                                                                                    |

**Closed.** The routing benchmark **on label form**, on the number in §17.3: **598 of 600 appropriate**. Stage 2 (DeepSeek) is **not run**, because the registered condition — a Stage 1 primary interval excluding zero — was not met.

**The next round's resolution, stated before it runs.** E20 varies the line's artefact polarity at 400 draws for the two long arms. That catches a **12-point difference 93% of the time and 15 points 99% of the time**. Below about **10 points it cannot separate an effect from noise** — 8 points sits at 62%. So a "no detectable effect" result from E20 is a statement about the ruler, not evidence that labels do nothing, and it must be written that way.

**Not established, and not to be quoted.** Any per-cell rate from E11; anything about human users; and whether a good name can _rescue_ a vague brief, because the control cells sat at 99–100% and the interaction therefore had no room to vary.

**Why there are two benchmarks — recorded so it is not lost.** The catalogue was proposed as two rival frames, axis × stance (45 entries) and artefact (47), and the routing benchmark began as the test that would choose between them. E11 returned a 0-point difference at a ceiling in both arms, so the registered rule returned **H3 — one catalogue, two views** (§2, E11). That is why the programme moved on to what might actually make a difference: the picker's line and order first, then the mode's doctrine. Settled since: the **preload is 45** (2026-11-19, superseding 60–90) and **includes the 16 non-coding entries** (budget, not judgement); language and framework modes are **marketplace installables**. Not settled: the switch itself — E11 compared names, while the frames define a mode differently, so reconciliation of **45 against 47** (count, slugs, and coverage: 13 jobs uncovered against 4) belongs to whoever builds the catalogue, and the set may grow beyond 45. See [`modes-architecture.md`](../modes-architecture.md:795) §10.8 and the roadmap's D-5/D-6.

**Next.** E20, already approved, tests the artefact-stating line on a maximally ambiguous brief; it must freeze a declaration contract first (§16.4). After that, the capability benchmark: doctrine and tooling, not vocabulary.

**Document map.** §2 (E1–E11) is history — read it for how the programme got here, not for numbers. §11–§13 are the round, §16 is its instrument verification, §17 is its closing number. Deviations D-1…D-12 live in §6 and should be read by anyone auditing the reasoning.

**2026-11-20 — three entries added after the closing round.** §31: our own 45-entry preload is lexically reachable for only **6 of 20** ordinary requests (coverage 0.30), and three requests captured a wrong owner before the anchor rule was declared. §32: the picker every experiment rendered is **not** the picker the extension emits — the advice in §7 of the routing report is advice for the fixture form. §33: the hidden-intent class opens the commit-versus-ask channel (**7 of 10**), which supplies the second-brief generator the programme lacked. **No contrast changes; §32 amends the report's external validity and does not retract it.** Deviations D-29…D-31 are recorded inside §31–§33, because §6 is append-only.

---

## 1. Instrument register

| Id  | Instrument                                                                                                       | Purpose                                                   | State                                     |
| --- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ----------------------------------------- |
| I-1 | [`modes-needs-baseline-2026-11.md`](modes-needs-baseline-2026-11.md)                                             | 12 axes, 119 jobs, S/A/C/N quantities                     | Built, not independently re-measured      |
| I-2 | Frame fixtures: `test-fixtures/frames/axis-stance.roomodes` (45 modes), `artefact.roomodes` (47 modes)           | The two candidate catalogues                              | Built, schema-valid, idempotent generator |
| I-3 | [`2026-11-09-frame-decision-preregistration.md`](../reviews/2026-11-09-frame-decision-preregistration.md)        | Hypotheses, decision rule, amendments 1–6                 | Registered; amendments 1–6 logged         |
| I-4 | `test-fixtures/frames/outcome-arm/run-b1-pilot.sh`                                                               | Six-run behavioural pilot over three snapshots            | Built; **six runs UNRUN**                 |
| I-5 | [`scripts/run-framing-pretest.mjs`](../../scripts/run-framing-pretest.mjs) + `scripts/lib/framing-pretest-*.mjs` | 30-run framing pretest                                    | Built; **30 runs RUN** (E8)               |
| I-6 | [`scripts/lib/gemini-runner.mjs`](../../scripts/lib/gemini-runner.mjs)                                           | Provider boundary for I-5; writes a usage sidecar per run | Built; used for E8                        |

## 2. Chronological entries

### E1 — Frame bake-off (2026-11-09)

18 selection trials across both catalogues. Both frames chose the intended owner 3/3 on every brief.
**Instrument:** delegated execution, word-overlap scoring. **Result:** conclusive on stability, silent on frame choice.

### E2 — Bake-off red team (2026-11-09)

12 objections, verdict HARDEN. Decisive objection: ownership was tested by word overlap at every stage, so the run could only confirm the author recognises his own names. Also corrected my estimates: artefact Σ was 3,836 measured, not 3,917 estimated.
**Consequence:** a behavioural outcome arm is required; more briefs are not.

### E3 — Pre-registration registered (2026-11-09)

H1/H2/H3, two arms with byte-identical doctrine, a decision rule with a third row for doctrine failure, and a first-run observation protocol with five developers.

### E4 — Outcome pilot material built (2026-11-09)

Three snapshots; six arm files with doctrine and grants verified identical by hashing; a blinded harness with a fixed interleaving `a b b a a b`.
**Result: six runs UNRUN.** No credentials. Per Amendment 4 that is _no result_, not a null.

### E5 — Pretest supersedes the human protocol (2026-11-10, Amendment 5)

No external developers exist. The instrument becomes an **agent framing pretest**: 5 personas × 3 briefs × 2 catalogues = 30 runs. H1's evidential status is downgraded from population inference to instrument sensitivity. The asymmetry is recorded: a _failing_ gate is strong evidence, a _passing_ gate is weak.

### E6 — Independent verification and Amendment 6 (2026-11-11)

I re-ran the dry run rather than trusting the build report.

| Check                        | Measurement                                                        |
| ---------------------------- | ------------------------------------------------------------------ |
| Design                       | 5 × 3 × 2 confirmed in code, not just in prose                     |
| Prompts                      | 30; bytes min 5,745 / max 6,364 / mean 6,064.93                    |
| Picker lines                 | 45 (axis×stance) and 47 (artefact)                                 |
| Doctrine / grants in prompts | 0 occurrences of `roleDefinition`, `customInstructions`, `groups:` |
| Encoding                     | no NUL, no invalid UTF-8; 282 non-ASCII bytes are the 47 em dashes |

Three findings, each recorded **before** any run:

1. **`frame` is not a blindness token.** The 60 reported hits are 45 × "framed" (the `requirements` routing line) + 15 × "framework" (a stack description). Legitimate picker language.
2. **B3 withdrawn from discriminability.** Both catalogues carry an obvious comprehension owner with near-verbatim routing lines — `explain` ("Use when someone asks why code behaves as it does…") and `explanation` ("Use when someone asks why the code behaves as it does…"). A brief whose answer is obvious in both arms is a **ceiling test**, not a discrimination test.
3. **The persona manipulation is directive-only.** All 30 prompts carry the §3.1 briefs verbatim; only the one-line directive differs. A null gate would therefore be ambiguous between a dead instrument and a too-weak manipulation, and the discriminating observation is specified in advance.

### E7 — Provider boundary written (2026-11-11)

`scripts/lib/gemini-runner.mjs`. The harness deliberately has no provider protocol; this file is the operator-supplied command. It writes a **usage sidecar** per run so cost is measured rather than estimated, never writes output on failure (so the harness records `UNRUN` rather than scoring a fabrication), and never prints the key.

### E8 — Framing pretest executed (2026-11-11 09:41–09:45 UTC)

| Parameter        | Value                                                                |
| ---------------- | -------------------------------------------------------------------- |
| Provider / model | Google, `gemini-3.5-flash` (versioned, not `-latest`, not a preview) |
| Temperature      | 0, pinned by the harness                                             |
| Blind seed       | `20261111` (fixed, recorded in the plan)                             |
| Runs             | 30                                                                   |
| Status           | **RUN 30 / UNRUN 0 / INVALID 0**                                     |
| Wall clock       | ≈4 minutes                                                           |

**Why this model.** A versioned, stable, mid-tier instruction-follower. A weaker model risks a floor result that would be indistinguishable from a dead instrument; a `-latest` alias would defeat reproducibility.

## 3. Run record — what each run declared

Extraction rule: the declared mode is the slug introduced by a `Mode:` marker, or the sole bare slug on its own line, or (verbose persona) the slug line closing the narration. Persona and brief are **not** the blinded variable; the catalogue label is, and the label → frame map has **not** been opened.

| Run    | Persona | Brief | Catalogue   | Declared mode                          | Intent match |
| ------ | ------- | ----- | ----------- | -------------------------------------- | ------------ |
| run-01 | P1      | B1    | CATALOGUE-1 | `debug`                                | ✅           |
| run-02 | P1      | B1    | CATALOGUE-2 | `bug-report`                           | ✅           |
| run-03 | P1      | B2    | CATALOGUE-2 | `benchmark`                            | ✅           |
| run-04 | P1      | B2    | CATALOGUE-1 | `performance`                          | ✅           |
| run-05 | P1      | B3    | CATALOGUE-1 | _none — asked for information_         | help-seeking |
| run-06 | P1      | B3    | CATALOGUE-2 | `explanation`                          | ✅           |
| run-07 | P2      | B1    | CATALOGUE-2 | `bug-report`                           | ✅           |
| run-08 | P2      | B1    | CATALOGUE-1 | `debug`                                | ✅           |
| run-09 | P2      | B2    | CATALOGUE-1 | `performance`                          | ✅           |
| run-10 | P2      | B2    | CATALOGUE-2 | `benchmark`                            | ✅           |
| run-11 | P2      | B3    | CATALOGUE-2 | `explanation`                          | ✅           |
| run-12 | P2      | B3    | CATALOGUE-1 | _none — asked for information_         | help-seeking |
| run-13 | P3      | B1    | CATALOGUE-1 | `debug`                                | ✅           |
| run-14 | P3      | B1    | CATALOGUE-2 | `bug-report`                           | ✅           |
| run-15 | P3      | B2    | CATALOGUE-2 | `benchmark`                            | ✅           |
| run-16 | P3      | B2    | CATALOGUE-1 | `performance` (echoed the picker line) | ✅           |
| run-17 | P3      | B3    | CATALOGUE-1 | `architecture-reviewer`                | ❌           |
| run-18 | P3      | B3    | CATALOGUE-2 | `explanation`                          | ✅           |
| run-19 | P4      | B1    | CATALOGUE-2 | `bug-report`                           | ✅           |
| run-20 | P4      | B1    | CATALOGUE-1 | `debug`                                | ✅           |
| run-21 | P4      | B2    | CATALOGUE-1 | `performance`                          | ✅           |
| run-22 | P4      | B2    | CATALOGUE-2 | `benchmark`                            | ✅           |
| run-23 | P4      | B3    | CATALOGUE-2 | `explanation`                          | ✅           |
| run-24 | P4      | B3    | CATALOGUE-1 | `explain`                              | ✅           |
| run-25 | P5      | B1    | CATALOGUE-1 | `debug`                                | ✅           |
| run-26 | P5      | B1    | CATALOGUE-2 | `bug-report`                           | ✅           |
| run-27 | P5      | B2    | CATALOGUE-2 | `benchmark`                            | ✅           |
| run-28 | P5      | B2    | CATALOGUE-1 | `performance`                          | ✅           |
| run-29 | P5      | B3    | CATALOGUE-1 | _none — asked for information_         | help-seeking |
| run-30 | P5      | B3    | CATALOGUE-2 | `adr`                                  | ❌           |

**Tally:** 27 selections declared, 3 help-seeking. Of the 27: **25 match** the intended owner, **2 miss** — and both misses are on **B3**, the brief Amendment 6 excluded from discriminability before the run.

## 4. The sensitivity gate — recorded first (pre-registered)

Amendment 5 item 7 requires this to be read and recorded **before** any discriminability claim. It is recorded here, and the blind map is still sealed.

**Question.** Do the five persona directives separate goal-framing from deliverable-framing _at all_?

**Observation — response form by persona:**

| Persona                    | Framing stated                                                                                                  | Form                                                       |
| -------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| P1 goal-only explorer      | **5 of 6 state a goal** ("I want to…", "Objective:", "Goal:")                                                   | first-person objective, 1 help-seeking                     |
| P2 artefact-only deliverer | **2 of 6 state a deliverable** ("**Deliverable:** A minimal reproduction…"); 3 give a bare slug; 1 help-seeking | noun-phrase deliverable                                    |
| P3 terse one-liner         | 0 of 6                                                                                                          | bare slug, 3–21 bytes                                      |
| P4 verbose context dump    | 0 of 6                                                                                                          | third-person narrative, 1,036–1,558 bytes, mode named last |
| P5 imprecise vocabulary    | 0 of 6                                                                                                          | bare slug, 1 help-seeking                                  |

**Gate reading: PASS, on the weak criterion.** The directives produced five distinct response regimes, and among the 12 runs that stated a frame at all, goal-framing occurred **5 times under P1 and 0 times under P2** — a clean separation.

**Two limits that must travel with that reading:**

1. **Framing is unmeasurable in 18 of 30 runs** (14 bare slugs, 6 narratives minus zero statements, 3 help-seeking overlapping). The gate therefore rests on 12 observations, not 30.
2. Per Amendment 5 item 6, **a pass is weak evidence**. It shows the instrument can separate the conditions it was built to separate, nothing about developers, and it is **not** a green light for either frame.

Under Amendment 6's first branch — personas differ in response _shape_, so the manipulation moved something, and the framing measure is what carried the difference.

## 5. Cost ledger — measured, not estimated

Source: usage sidecars written by I-6, one per run.

| Quantity         | Value                                |
| ---------------- | ------------------------------------ |
| API calls        | 30 (no retries were needed)          |
| Prompt tokens    | 37,244                               |
| Output tokens    | 2,096                                |
| Thinking tokens  | 27,509                               |
| **Total tokens** | **66,849**                           |
| Mean per run     | ≈2,228 tokens                        |
| Coverage         | 100% — 30/30 runs billed, 0 failures |

The pre-run estimate was ≈45k input tokens and "cents to well under a dollar". The measured figure is 66,849 total, of which 27,509 are thinking tokens not present in the estimate. The estimate was low on output-side tokens and right on prompt-side tokens.

### 5.1 Reconciled platform spend (read 2026-11-16)

The Gemini console renders spending more than 24 hours late, so the figure was taken after a weekend rather than at the time of each run. It supersedes every estimate in this log and in the roadmap.

| Date       | Calls               | Reported spend |
| ---------- | ------------------- | -------------- |
| 2026-11-11 | 35 (E11 30 + E12 5) | €0.15          |
| 2026-11-12 | 600 (E13-R Stage 1) | €3.10          |
| **Total**  | **635**             | **€3.24**      |

Measured rate: **€5.1 per 1,000 calls**, about €0.0051 per call. The closing round had been estimated at $1.7; the measured spend is €3.10, so the estimate was low by a factor close to two even before any currency conversion. Forward planning in this programme uses the measured rate from here on.

## 6. Deviations and errors register

Every entry here is a departure that a reader of any later write-up should know about.

| #    | Date       | Deviation                                                                                                                                                                                                                                                    | Consequence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-1  | 2026-11-09 | Estimated artefact Σ as 3,917 when measurement gave 3,836                                                                                                                                                                                                    | Corrected in the response document; estimates replaced by measurements from then on                                                                                                                                                                                                                                                                                                                                                                                                                           |
| D-2  | 2026-11-10 | Told a delegated task to apply a "pilot reading rule" that did not exist                                                                                                                                                                                     | Amendment 4 (the pilot tier) added; the delegation error was the more serious of the two                                                                                                                                                                                                                                                                                                                                                                                                                      |
| D-3  | 2026-11-11 | Proposed `docs/help/released-slugs.json` as a home for mode aliases without opening it                                                                                                                                                                       | Withdrawn: it is a register of help-page routes, not mode slugs                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| D-4  | 2026-11-11 | Asserted the `explain` confound biased the artefact arm; verification showed `explain` exists only in the axis×stance arm                                                                                                                                    | Corrected in Amendment 6, which then withdrew B3 from discriminability for a different and better reason (ceiling in both arms)                                                                                                                                                                                                                                                                                                                                                                               |
| D-5  | 2026-11-11 | Assumed "explanation" contains the substring "explain"                                                                                                                                                                                                       | It does not (e-x-p-l-a-n-a-t-i-o-n). grep, awk and node were all correct; no encoding defect existed                                                                                                                                                                                                                                                                                                                                                                                                          |
| D-6  | 2026-11-11 | Read an exit code through a pipe, so `$?` reflected `tail` rather than the harness                                                                                                                                                                           | Repeat of an earlier failure mode; exit codes are now read after redirecting to a file                                                                                                                                                                                                                                                                                                                                                                                                                        |
| D-7  | 2026-11-11 | Interpreted "last known slug mentioned" as the declared mode during extraction                                                                                                                                                                               | Wrong: run-03 declared `benchmark` then discussed `performance`. Extraction rule restated in §3                                                                                                                                                                                                                                                                                                                                                                                                               |
| D-8  | 2026-11-11 | Amendment 6 withdrew B3 from discriminability on the premise that it was a ceiling **in both arms**                                                                                                                                                          | The data falsify the premise: it was a ceiling only in the artefact arm and the hardest cell in axis×stance. The exclusion was pre-registered so it stands; the B3 finding is exploratory and needs a new registration                                                                                                                                                                                                                                                                                        |
| D-9  | 2026-11-11 | I recorded `architecture-reviewer` and `adr` as MISS; the blind scorer judged both PLAUSIBLE                                                                                                                                                                 | The scorer's reading is the more defensible. Recorded, not overwritten; a second scorer is now warranted                                                                                                                                                                                                                                                                                                                                                                                                      |
| D-10 | 2026-11-11 | Described the persona finding as "identical across all five directives in 27 of 30 runs"                                                                                                                                                                     | 27 is the number of runs that declared a mode, not a measure of agreement. The correct measure is agreement within a (brief × catalogue) cell: 20/20 in the four unambiguous cells, 1/5 and 4/5 in the two ambiguous ones. Restated as F-1                                                                                                                                                                                                                                                                    |
| D-11 | 2026-11-13 | The clustering guard reads verbatim transcript text, while the bootstrap resamples outcomes                                                                                                                                                                  | Under within-cell dependence, coverage falls to 82.8% while the interval does not widen, and the guard cannot see it. A runs test on the outcome sequence moves into E20's report (§16.3)                                                                                                                                                                                                                                                                                                                     |
| D-12 | 2026-11-13 | My declaration extractor was keyed on one cell's slug list and recognised only the backticked reply format                                                                                                                                                   | It returns 0 for `explanation` and `bug-report`, which are absent from C1's list; six reply formats occur and the slug union is 47, not 45. Fixed, leaving a residual of −3/0/+4/−4/+1/0 against the manual pass, confined to commit-versus-ask (§16.4)                                                                                                                                                                                                                                                       |
| D-13 | 2026-11-16 | My commit's lint-staged prettier pass rewrote the three sealed routing-round fixtures from two spaces to tabs (`.prettierrc.json` sets `useTabs: true`)                                                                                                      | `--check` went red on formatting alone, and the bytes of an answer key sealed before the run had changed. Fixed by ignoring the directory and regenerating; values proved identical by canonical sha256 (§18.6)                                                                                                                                                                                                                                                                                               |
| D-14 | 2026-11-16 | The interleaving assertion I specified buffered every record and wrote once, after the check                                                                                                                                                                 | A crash at call 599 would have destroyed 600 paid calls. Replaced with a per-record invariant plus immediate append; the full-set 599-transition proof is retained (§18.6)                                                                                                                                                                                                                                                                                                                                    |
| D-15 | 2026-11-16 | My delegation spec gave the closed round's undetermined counts as "C1 50, C2 51, C3 26, C4 58"                                                                                                                                                               | Those four sum to 185, not the 183 the same sentence states. C2 is **49**: its two wrong commits are extracted mechanically and never reach the adjudication packet. Caught by the sub-task against the saved data, rather than propagated into a test that would have failed for the wrong reason                                                                                                                                                                                                            |
| D-16 | 2026-11-16 | The executor spawned the runner with its working directory set to the run output directory, so the runbook's documented relative runner path could not resolve                                                                                               | Every call exited 1 with no output. Caught by a 9-call smoke test before the sweep; would have written 900 `UNRUN` records for €4.7. Fixed by inheriting the operator directory, plus a preflight refusal and an abort on the first failed call                                                                                                                                                                                                                                                               |
| D-17 | 2026-11-16 | My own probe passed `undefined` as the slug vocabulary when re-extracting the smoke-test replies, because the E20 key carries one shared `slugVocabulary` rather than per-arm lists                                                                          | I read 9 of 9 as abstentions — a 0.2% coincidence under the closing round's rates — and nearly concluded a seventh reply format existed. Re-extracted correctly, 6 of 9 declared. The pipeline was sound; the check was not                                                                                                                                                                                                                                                                                   |
| D-18 | 2026-11-17 | E20's §6 decision table pairs a symmetric threshold ("≥ 20 points, adjusted p < .025") with a direction-specific reading ("naming what the answer must contain moves commitment more")                                                                       | A reversed ≥ 20-point result therefore has no reading: the rule as written would licence the opposite conclusion to the data. The registration is **not** amended post hoc; the defect is named in the report's limitations and the rule below forbids a repeat                                                                                                                                                                                                                                               |
| D-19 | 2026-11-17 | The extractor has no rule for a reply consisting only of a slug, so 21 E20c replies were scored undetermined — **unevenly across arms: X 3, Y 10, Z 8**                                                                                                      | Mechanical declaration counts are lower bounds, and the uneven distribution moves the contrasts. Corrected mechanically: X 98, Y 130, Z 152 of 200. Final numbers must come from adjudication with an explicit bare-slug rule                                                                                                                                                                                                                                                                                 |
| D-20 | 2026-11-17 | The 60-draw gate's declaration rates diverged from the sweep by up to 18 points (X 65.0% at the gate, 47.0% on the sweep)                                                                                                                                    | The gate may be used **only** for its registered purpose — exclusion rate and verbatim clustering. Its declaration rates are 20-draw noise and must never be quoted                                                                                                                                                                                                                                                                                                                                           |
| D-21 | 2026-11-17 | E20c's control arm is **not stationary**: 36% → 40% → 54% → 60% across four blocks of 50 (Cochran–Armitage z = 2.72, p ≈ .007), while Y is flat and Z declines                                                                                               | Both E20c contrasts decay as the run proceeds — Y−X goes +28, +22, 0, 0 points and Z−X +40, +34, +16, +8. The run cannot estimate its contrasts, and M-9's "within-run contrasts stand" is falsified as stated. **Status 2026-11-18: the ramp did not reproduce on a 200-call re-run (z = −0.06) — see §27**                                                                                                                                                                                                  |
| D-22 | 2026-11-17 | Every record in every batch stamps `parserVersion: routing-round-parser/1`, including the E20c batch                                                                                                                                                         | The report's claim that extraction was pinned to `routing-round-parser/2` is **not evidenced in the data**. Either the executor stamps a constant or the version was never propagated; the pin is a claim about the tool, not about the records                                                                                                                                                                                                                                                               |
| D-23 | 2026-11-17 | My §24 block table counted **any** declaration while the totals beside it counted only `explain`, so X's blocks summed to 95 against a total of 94, and Z's to 144 against 143                                                                               | The `explain`-only blocks are X 18/19/27/30 and Z 38/37/35/33, giving Y−X of +28/+24/0/0 and Z−X of +40/+36/+16/+6 points. The decay conclusion is unchanged; the corrected figures are stated below                                                                                                                                                                                                                                                                                                          |
| D-24 | 2026-11-18 | The second-provider sweep ran with the Gemini cap of 4096 output tokens against a **reasoning** model, whose hidden reasoning consumes the same budget                                                                                                       | Five replies truncated with empty content and `MAX_TOKENS`. Any future run against this provider needs a cap of at least 8192, and a truncation rate that differs by arm is itself an outcome, not noise                                                                                                                                                                                                                                                                                                      |
| D-25 | 2026-11-18 | The BC replication was launched before checking that the second model **has the outcome channel being replicated**                                                                                                                                           | 91 replies contained **zero questions**; the model returns a bare route name every time. Both arms sat at 95–100% commitment, so the 27.5-point contrast had no variance to move. Stopped at 109 of 800 calls; about 700 calls and 10 hours not spent                                                                                                                                                                                                                                                         |
| D-26 | 2026-11-18 | The registered adjudication tie-break — "if the reply names a mode anywhere, it is a DECLARATION" — is unusable on this corpus: an ask on an ambiguous brief almost always enumerates candidate modes, so the rule turns nearly every ask into a declaration | Under it, an independent model agreed with the first pass on **11.1%** of 378 replies; a manual read of twelve disagreements found the first pass right in all twelve. Corrected, agreement is **99.7%** (377/378). The published counts never used the faulty rule, so no number changes; the rule is replaced for all future passes                                                                                                                                                                         |
| D-27 | 2026-11-18 | The first second-brief attempt used a brief whose natural owner was `architecture-reviewer`, not `explain`; the retry screened three why-does-behaviour briefs and all thirty replies committed to `explain` without asking                                  | Neither could test the effect. The screening also produced the result in §28: the channel opens on mode-ownership ambiguity, not on missing context                                                                                                                                                                                                                                                                                                                                                           |
| D-28 | 2026-11-19 | Two published figures for E20b's last arm could not both be right — §26 printed 42 + 4 = **46.0%**, the report printed **45.0%** with 12 wrong commits                                                                                                       | Re-derived from the packet, its join and both judgement files: the pass returned four declarations, three naming `explain` and one the bare slug `architecture-reviewer`. Declared key **45**, wrong commits **12**, asks 43. The 46 counted a commit to another mode as a declared key; the report's 45 was right, its 29.0 was not, because the first arm's single adjudicated declaration is an ask on review (15, not 16). Final: **15.0% vs 45.0%, −30.0 points, p = 5.6 × 10⁻⁶, CI [17.5, 41.3]** (§30) |

## 7. What may and may not be claimed from this log

**May:** that a 30-run prompt-level pretest was executed at temperature 0 with a pinned model and a sealed blind map; that 27 of 30 runs declared a mode and 25 of those matched the intended owner; that the five directives produced five distinct response regimes; that the sensitivity gate passed on the weak criterion over 12 framable observations; that the two misses fall entirely on the brief excluded before the run.

**May not:** anything about developers, adoption or first-run abandonment; any claim that a passing gate validates the instrument; any claim about doctrine quality — the pretest never shows doctrine.

**Two tiers of claim, after E11.** _Confirmatory_ claims are those the registered decision rule covers: the B1+B2 comparison with B3 excluded. _Exploratory_ claims are those the rule does not cover — anything involving B3, and the help-seeking pattern. An exploratory claim may justify a **new pre-registration**; it may never be used to override a confirmatory result.

### E10 — Blind scoring (2026-11-11 10:22 UTC)

Scoring was delegated to an independent reader, working from a **sanitised bundle** at `/tmp/fp-scoring/`: 30 cases of `prompt.txt` + `response.txt`, with **no** `plan.json`, no labels and no map. The run directory's `plan.json` contains `catalogueLabels`, which would have de-blinded a scorer immediately, so it was excluded by construction rather than by instruction.

| Framing category                    | Count |
| ----------------------------------- | ----- |
| BARE (slug only)                    | 14    |
| NARRATIVE (third-person, mode last) | 6     |
| GOAL                                | 5     |
| HELP (asked instead of choosing)    | 3     |
| DELIVERABLE                         | 2     |

Judgements: **MATCH 25, NO_SELECTION 3, PLAUSIBLE 2, MISS 0.**

The scorer's framing tally reproduces my own independent extraction exactly — same five counts, same three help-seeking cases. It disagreed with me on exactly two cases: it judged `architecture-reviewer` (B3) and `adr` (B3) as **PLAUSIBLE** where I had recorded **MISS**. Its reading is the more defensible one: both are adjacent-but-not-obvious owners, not wrong ones. Logged as **D-9**, not overwritten.

### E11 — Map opened; the registered decision (2026-11-11 10:23 UTC)

The blind map: `CATALOGUE-1 = axis-stance` (45 modes), `CATALOGUE-2 = artefact` (47 modes).

**Confirmatory result — B3 excluded, as registered in Amendment 6:**

| Frame         | n   | MATCH | hit rate |
| ------------- | --- | ----- | -------- |
| axis × stance | 10  | 10    | **100%** |
| artefact      | 10  | 10    | **100%** |

Difference **0 pp**. Registered decision rule row 2 applies (`< 10 pp`, CI includes zero, no difference): **H3 — one catalogue, two views.**

> **Superseded 2026-11-19, and the entry stands as written.** The rule returned H3 on what the test
> could see: names. It could not see that the two frames define a mode differently — a stance applied
> to a domain in one, an artefact produced in the other — so 0 points on selection licenses "both lists
> are readable", not "one list". **The presentation switch is therefore withdrawn**, pending
> reconciliation of 45 against 47 by the builder of the catalogue
> ([`modes-architecture.md`](../modes-architecture.md:795) §10.8).

**Two qualifications that must travel with it.**

1. **The confirmatory test was at ceiling in both arms.** 20 of 20 selections matched. Per the spirit of Amendment 4, a 100%/100% outcome is a ceiling to investigate, not an equivalence demonstrated. H3 is therefore the _default the rule returns_, not a vindicated finding. The pretest had no power to separate the frames on B1/B2.
2. **The discriminating information is all in the excluded cell.** B3: axis × stance 1/5 MATCH, artefact 4/5 MATCH. Including B3 gives 11/15 (73%) vs 14/15 (93%).

**Exploratory finding — help-seeking is a prompt property, not a persona property.** All three help-seeking responses sit in **one cell**: axis × stance × B3, and they came from **three different personas** (P1, P2, P5). When a picker offers no clear owner for a goal-shaped brief, the reader asks for information instead of choosing; the persona directive does not determine this. If this holds, "does the reader ask instead of guessing?" is a catalogue-health signal obtainable with no telemetry at all — which is exactly what ADR-6 said did not exist.

**Deviation D-8, and it is mine.** Amendment 6 withdrew B3 from discriminability on the stated premise that it was a ceiling **in both arms**. The data falsify that: it was a ceiling only in the artefact arm and the hardest cell in axis × stance. The exclusion was registered before the run, so it stands and the B3 result remains exploratory. What the error costs is information, not validity — and the correct response is a _new_ pre-registration for comprehension-shaped briefs, not a re-reading of this one.

### Findings register (E10–E11)

Two substantive findings. Each is recorded with its measurement, its scope, and what would falsify it — a finding without a falsifier is an opinion.

#### F-1 — The persona directive changes the _form_ of the answer, not the routing decision

Agreement is measured **within a (brief × catalogue) cell**, where the five runs differ only in persona:

| Cell             | Declared modes across P1…P5                                       | Agreement |
| ---------------- | ----------------------------------------------------------------- | --------- |
| B1 × axis×stance | `debug`, `debug`, `debug`, `debug`, `debug`                       | **5/5**   |
| B1 × artefact    | `bug-report` ×5                                                   | **5/5**   |
| B2 × axis×stance | `performance` ×5                                                  | **5/5**   |
| B2 × artefact    | `benchmark` ×5                                                    | **5/5**   |
| B3 × axis×stance | _(none)_, _(none)_, `architecture-reviewer`, `explain`, _(none)_  | 1/5       |
| B3 × artefact    | `explanation`, `explanation`, `explanation`, `explanation`, `adr` | 4/5       |

**Reading.** In the four unambiguous cells the five directives produced **identical selections, 20 of 20 runs**. Variance appeared only in the two ambiguous cells, and it did **not track persona**: in B3 × axis×stance two different personas abstained, a third picked a neighbouring mode, and only one picked the owner. Meanwhile the directives changed packaging enormously — five distinct framing categories, responses from 3 bytes to 1,558 bytes. So the directive governs **how the answer is presented** and does not govern **which mode is chosen**, whenever the picker has a clear answer.

**Scope.** One model (`gemini-3.5-flash`), one brief per cell, n=1 per persona per cell, temperature 0. This is a statement about this instrument, not about persona prompting in general.

**Falsifier.** A second model, or a repetition of the same cell, in which different personas yield different selections for an unambiguous brief.

#### F-2 — Help-seeking is a property of the prompt, not of the reader

All three help-seeking responses sit in **one cell**: axis×stance × B3. They came from **three different personas** (P1 goal-only, P2 artefact-only, P5 imprecise). The two personas that state framing most explicitly (P1, P2) both abstained here; the persona with imprecise vocabulary abstained too; the verbose persona committed.

**Reading.** When a picker offers no clear owner for a goal-shaped brief, the reader asks for information instead of guessing, and the directive does not determine whether it does. If this holds, _"does the reader ask instead of guessing?"_ is a catalogue-health signal that needs no telemetry — the thing ADR-6 concluded did not exist.

**Scope.** n=3, one brief shape, one model. This is a pattern, not a rate.

**Falsifier.** A help-seeking response from a cell whose picker contains an obvious owner; or a goal-shaped brief in a well-covered cell that produces no help-seeking across all five personas.

## 9. Decision record

| Question                                              | Answer                                                                          | Tier                                  |
| ----------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------- |
| Which frame does the registered rule select?          | **H3 — one catalogue, two views**                                               | Confirmatory                          |
| Was that selection demonstrated or defaulted?         | Defaulted: both arms at ceiling on B1+B2                                        | Confirmatory                          |
| Is the artefact frame better at comprehension briefs? | Suggestive (4/5 vs 1/5), **not established**                                    | Exploratory                           |
| Does persona change which mode is chosen?             | No — identical selection in 20/20 unambiguous runs across five directives (F-1) | Confirmatory (within this instrument) |
| Does help-seeking track persona?                      | No — it tracked one prompt cell                                                 | Exploratory                           |

### E12 — Determinism probe: the model is not deterministic at temperature 0 (2026-11-11)

**Instrument.** The E12 plan's `A0-P1` prompt, sent three times, interleaved with `C1-P1` and `A5-P1` so provider-side caching cannot mask instability. Five calls, ≈11k tokens, every call exit 0. No `.env` value was printed and no other traffic was generated.

**Result — three draws, three transcripts, three distinct sha256:**

| Draw | sha256 (first 8) | Outcome class | What it did                                                                                                                                 |
| ---- | ---------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `70b63ee3`       | **HELP**      | Asked for the module's path, then listed three candidate modes (`explain`, `architecture-reviewer`, `codebase-cartographer`) and chose none |
| 2    | `8c4203aa`       | **KEY hit**   | "I want to uncover the design rationale… **Mode:** `explain`"                                                                               |
| 3    | `5646ed65`       | **HELP**      | "I want to understand the design choices… To select the precise mode, I need:" — then a request for more information                        |

The same prompt, the same pinned model (`gemini-3.5-flash`), the same temperature (0), and the same absence of tools produced **a correct selection once and an abstention twice.**

**Consequence 1 — E12 as registered cannot run.** Its step 1 requires the three repetition transcripts to be byte-identical and stops otherwise. That stop condition fired on the very prompt the sequence begins with, at a cost of five calls instead of thirty-five to forty-five. No amendment is needed to reach this verdict: the registration already contained the rule and the rule already answered.

**Consequence 2 — every single-draw measurement in this programme is provisional.** Amendment 6 §4 of the parent pre-registration anticipated exactly this: "if k repetitions diverge at temperature 0, every single-draw claim in E11 must be softened". That condition is now met. E11's per-cell compositions — 1 MATCH / 1 PLAUSIBLE / 3 HELP in axis×stance, 4 MATCH in artefact — are **single draws from a stochastic process**, not rates.

**Consequence 3 — what survives, and why.** The four unambiguous cells produced 20 identical selections across five persona directives (B1×axis `debug` ×5, B1×artefact `bug-report` ×5, B2×axis `performance` ×5, B2×artefact `benchmark` ×5). If those cells were as unstable as B3×axis appears to be — roughly two abstentions in three — the probability of 20 concordant draws is on the order of 3 × 10⁻⁴. So those cells are genuinely near-deterministic in **outcome**, and F-1's core claim stands: the persona directive changes how the answer is presented, not which mode is chosen.

**Consequence 4 — what does not survive: the magnitudes.** "1/5 versus 4/5" is two noisy draws, not two rates. The **direction** (the axis picker is harder than the artefact picker on B3) is supported by the probe itself, which found the instability in the axis cell. The **size** of the gap is not established and must not be quoted.

**Consequence 5 — a finding in its own right.** Temperature 0 does not imply determinism for hosted inference. **What mattered was where the wobble landed: not on wording, but on whether to pick a mode at all.** Benchmarks commonly assume otherwise, which is why it was worth five calls to find out. Any routing benchmark that measures a single draw per cell — including this programme's own E11 — is measuring a sample, not a property. This is the most portable result the programme has produced, and it is also the least flattering to its earlier work.

**Consequence 6 — the design question changes.** The causal test cannot be "five persona conditions, one draw each". It has to be repetitions per condition with a distributional comparison, and the persona dimension should leave the causal test entirely: it is already known not to move the routing decision, and at five conditions it consumes five sixths of the budget for a variable that is not the subject.

**Proposed redesign, not yet registered:** three conditions (A0 axis/`explain`, A1 renamed/`explanation`, A5 artefact/`explanation`), one fixed brief (B3), one neutral standing request, **and n = 30 independent draws per condition** — 90 calls, ≈200k tokens. The datum is the outcome distribution over `KEY` / `OTHER` / `HELP`, compared across conditions by a 3×3 test with the composition reported in full. This is a stronger design than the one it replaces on every dimension the red team measured: no dead band, no overlap, no single-draw premise, and a sample size chosen before the run rather than after.

## 10. Pending entries

| Entry   | Content                                                                                                                                                                                                                                                                                                                                                                                      | Blocked on                                                                        |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| E12     | **CLOSED** — determinism probe run; model is non-deterministic at temperature 0; the registered E12 sequence cannot proceed                                                                                                                                                                                                                                                                  | —                                                                                 |
| E12b    | Register the stochastic redesign: 3 conditions × 30 draws, distributional comparison, personas removed from the causal test                                                                                                                                                                                                                                                                  | Nothing (≈200k tokens)                                                            |
| E13     | Six B1 outcome-arm runs; blind scoring; second scorer                                                                                                                                                                                                                                                                                                                                        | Provider key (present) + built `apps/cli`                                         |
| E14     | Second scorer for the pretest, given D-9 (two PLAUSIBLE/MISS disagreements)                                                                                                                                                                                                                                                                                                                  | Delegation                                                                        |
| E15     | Frame decision recorded as an ADR                                                                                                                                                                                                                                                                                                                                                            | E13 outcome                                                                       |
| E16     | M2 gate report: warn-only gates across the whole catalogue                                                                                                                                                                                                                                                                                                                                   | Nothing                                                                           |
| ~~E19~~ | ~~Conditionality repair: three brief-difficulty levels × two label variants~~ — **replaced by E20** on the strength of the label-form research                                                                                                                                                                                                                                               | —                                                                                 |
| E20     | **Repaired routing test** — hold the brief maximally ambiguous and vary **only whether the entry line states the artefact**: activity-only vs artefact-stating vs artefact-excluding. n = 100 per arm, **300 calls** (≈$0.9). Primary outcome: **ask rate**, with hit rate secondary. Tests the mechanism rather than the correlation, and is powered against the only large effect observed | Classifier validation (E21)                                                       |
| E21     | **Closing step** — validate the ask/declare classifier by hand-labelling 30 responses and reporting agreement; then recompute the E13-R report with the combined outcome ("committed to the expected mode **or** asked for information") and publish that number as the routing benchmark's closing figure. **Compute only, no model calls**                                                 | Nothing — and it is a prerequisite for E20, whose primary outcome is the ask rate |
| E17     | **Routing report draft** — annex tables, the user-advice block, and a **two-prompt comparison**: one task rendered through the shipped mode's `roleDefinition` + `customInstructions` against the proposed bookended contract. The pair is chosen by _function_ (shipped `debug` vs proposed `debug`) and must say so, rather than implying a like-for-like that does not exist              | Closing step + E18                                                                |
| E18     | **Dispatch the label-form literature research** — brief written at [`modes-label-form-BRIEF.md`](modes-label-form-BRIEF.md) and not yet sent. Costs **none** of the Gemini budget, so it should run in parallel rather than in sequence                                                                                                                                                      | Nothing                                                                           |
| E19     | **Conditionality repair** — three brief-difficulty levels × two label variants at n = 100 (600 calls, ≈$1.72), which turns conditionality from a contrast that a ceiling can kill into a slope that it cannot. Optional, and preceded by a ~60-call pre-test that the three briefs really are ordered by difficulty                                                                          | Decision to spend                                                                 |

## 11. Routing benchmark — closing round: the statistical decisions (2026-11-12)

Four cells at n = 30. The reasoning behind each choice is recorded here so a later reader can contest the design rather than reverse-engineer it.

**Why two-sided.** The hypothesis predicts a direction, so a one-sided test would buy power — but that direction comes from the same five observations the round is meant to test, and the control cell shows the effect can vanish entirely. A one-sided test on a data-derived direction roughly halves the p-value that must be cleared, which is precisely how a programme confirms its own guess from noise. Two-sided costs little at this size (the 0.20-versus-0.80 contrast still reaches ~96% power at n = 20) and buys two things: a **reversal is detectable rather than discarded** — if the constraint-rich verb line routed _better_, that is a finding, not a nuisance — and the test stays honest when the direction was obtained post-hoc. Because the primary statistic is a difference of two differences, where a sign must be assumed for each component, two-sided is the only defensible default.

**Why Fisher.** The data are binary and the cells are small, so the real choice is Fisher's exact test against Pearson chi-square (with or without Yates) and a logistic model. Chi-square is asymptotic, and at n = 30 with proportions in the 0.2–0.8 band the expected counts in the smaller cells fall below five, where the approximation is known to degrade. Fisher assumes only fixed margins, which is exactly the situation: **how many draws each cell receives is fixed by design, and only the split is random.** It is also conservative rather than liberal — measured Type I error near 1.7% where the nominal rate is 5% — which biases toward _not_ claiming an effect. That is the direction a programme with this error record should be biased toward. Its one real weakness is the independence assumption, which Fisher cannot supply: draws from the same prompt may cluster through caching or model state, so interleaving is the mitigation and clustering must be checked by looking for long runs of identical consecutive outputs.

**A correction — Fisher does not test interactions.** An earlier statement named Fisher as the test of the interaction. Those do not match: Fisher tests a 2×2 table, not a difference of differences. The design is therefore: each contrast tested with Fisher and reported with Wilson intervals; the **interaction**, which is the actual hypothesis, estimated as the difference of those two differences and reported with a **bootstrap confidence interval** (with a logistic cell × brief interaction as a secondary check if it converges). Without the second step the hypothesis would go untested and only its two halves would be examined.

**Pre-committed readings.**

| Observation                                                            | Reading                                                            | Consequence                                                                                           |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Interaction CI excludes 0; B3 difference large, B1 difference ≈ 0      | **Conditional-ambiguity hypothesis supported**                     | Naming rule: an entry must state what it returns whenever the brief could mean activity _or_ artefact |
| Interaction CI excludes 0; both differences same sign and similar size | **General form effect** — the earlier "already excluded" was wrong | Simpler rule: prefer the noun form throughout                                                         |
| Interaction CI includes 0; B3 difference CI includes 0                 | No evidence at n = 30                                              | Close the routing benchmark; record the lead as noise                                                 |
| B3 difference reverses (verb routes better)                            | Direction falsified                                                | Report as a counter-result: the constraint-rich line may be the asset                                 |
| Abstention differs while selection does not                            | **Abstention is the metric**; accuracy was the wrong instrument    | Switch the benchmark's primary outcome to abstention rate                                             |
| Unambiguous control below 4/5 in either vocabulary                     | Instrument fault                                                   | Discard the batch rather than interpret it                                                            |

> **Superseded 2026-11-12.** The table above describes the original **four-cell, n = 30** design. The round was amended twice after independent review: **n = 100 per cell**; a **single-field control pair**; the second factor **renamed from "constraint versus plain" to "imperative-with-negation versus declarative"**, because both lines impose a requirement and the old name was wrong; abstention promoted to a **co-primary outcome**; and four statistical guards added. The authority for this round is now [`2026-11-12-routing-closing-round-preregistration.md`](../reviews/2026-11-12-routing-closing-round-preregistration.md), Amendments 1–2. This section is retained as the record of the reasoning that led there, not as a reading rule.

## 12. E13-R Stage 1 — executed (2026-11-12)

**Run receipt.** Model `gemini-3.5-flash`, temperature 0, output cap 4096, 100 draws per cell, **600 calls**, all executed in one interleaved batch. **600 `RUN`, 0 `UNRUN`, 0 `INVALID`**; every `finishReason` `STOP`. **7 duplicate transcripts of 600**, longest identical run of 1 in every cell — the clustering guard did not fire. Analysed only after the last call completed, as registered.

| Cell | Entry                                  | Line                       | Brief       | Hits    | Rate  | Wilson 95%    |
| ---- | -------------------------------------- | -------------------------- | ----------- | ------- | ----- | ------------- |
| C1   | `explain`                              | IN (imperative + negation) | ambiguous   | 44/100  | .440  | [.347, .538]  |
| C2   | `explanation`                          | IN                         | ambiguous   | 47/100  | .470  | [.375, .567]  |
| C3   | `explain`                              | DC (declarative)           | ambiguous   | 50/100  | .500  | [.404, .596]  |
| C4   | `explanation`                          | DC                         | ambiguous   | 30/100  | .300  | [.219, .396]  |
| C5   | `debug`                                | native                     | unambiguous | 99/100  | .990  | [.946, .998]  |
| C6   | `bug-report` (carrying `debug`'s line) | native                     | unambiguous | 100/100 | 1.000 | [.963, 1.000] |

**The registered reading, applied literally.** P1 interaction = (C2−C1) − (C6−C5) = +.030 − .010 = **+.020**; P2 abstention interaction = **.000**. Both ≈ 0 ⇒ §A2.5 **row 3: no evidence at this power — do not close the benchmark.** In addition **Guard 2 fired**: the control pair sits at a boundary (C6 = 100/100), so no bootstrap interval was emitted and the interaction was **structurally uninformative** rather than merely null. A ceiling in the control cannot express a difference, so this round's primary question was answered by a statistic that had no room to vary.

**What the data does show, and it is not about form.** Brief ambiguity dwarfs label form:

| Comparison                                         | Estimate         | Fisher        |
| -------------------------------------------------- | ---------------- | ------------- |
| Ambiguous cells pooled vs unambiguous cells pooled | **.427 vs .995** | p < 10⁻⁴⁰     |
| C4 vs C3 (noun vs verb, both DC)                   | −.20             | **p = .0059** |
| C4 vs C2 (DC vs IN, both noun)                     | −.17             | p = .0198     |
| C4 vs C1 (lowest vs highest ambiguous cell)        | −.14             | p = .0566     |

The four ambiguous cells cluster between .30 and .50 whatever the label; the two unambiguous cells sit at .99 and 1.00. **The brief decides whether the right mode is found; the entry's name and mood shift it by a few points at most.** The 2×2 decomposition (register +.030 / −.200, mood +.060 / −.170, interaction −.230) is descriptive and was pre-labelled underpowered; it is not consistent with a simple additive story — the worst cell is **noun + declarative**, which no hypothesis predicted.

**~~F-2 is refuted.~~ WITHDRAWN — see §13.** The abstention count of 0 was a **measurement artefact**, not a behavioural fact. The round's mechanical rule treats "names a picker slug anywhere" as a declaration, so a response that asks for information _while listing candidate modes_ counted as a declaration and then as a wrong pick. Under a classifier that separates asking from declaring, **29–59% of ambiguous-brief responses ask instead of choosing**, and **0–1% of unambiguous-brief responses do**. F-2 replicates; §13 carries the corrected table and the retraction of this paragraph.

**What survives, restated plainly.** Routing is dominated by how clearly the request states what it wants, not by whether the entry is named after an activity or an artefact. That is a usable rule — _make the brief unambiguous, and say what the entry returns_ — but the second half is now supported only weakly, and the first half is the one the data actually carries.

## 13. Correction — the abstention count was an artefact (2026-11-13)

The §12 paragraph asserting that F-2 was refuted is withdrawn. It rested on the report's abstention column reading 0 of 100 in every cell, which I read as behaviour. It was measurement.

**Why it happened.** The round's rule: a response is an _abstention_ only if it commits to no mode, and "naming a slug and then asking is a declaration" (interpretation #8). Many ambiguous-brief responses open with _"To select the correct mode, I need the following information:"_ and then name candidate modes in parentheses. Those satisfy "named a slug", so they were recorded as declarations, and when the last-named slug was not the expected owner they were scored as **misses**. The _hit rate_ is therefore a mixture of real picks and questions, and the abstention column measured almost nothing.

**Corrected classification of the same 600 transcripts** (ask = asks for information; declare = commits to a mode):

| Label  | Cell                  | Regime      | ask | declare | both | ask only | neither |
| ------ | --------------------- | ----------- | --- | ------- | ---- | -------- | ------- |
| CELL-4 | C1 `explain` + IN     | ambiguous   | 54  | 53      | 10   | **44**   | 3       |
| CELL-1 | C2 `explanation` + IN | ambiguous   | 50  | 52      | 8    | **42**   | 6       |
| CELL-3 | C3 `explain` + DC     | ambiguous   | 29  | 71      | 8    | **21**   | 8       |
| CELL-5 | C4 `explanation` + DC | ambiguous   | 59  | 46      | 9    | **50**   | 4       |
| CELL-2 | C5 `debug`            | unambiguous | 1   | 99      | 1    | **0**    | 1       |
| CELL-6 | C6 `bug-report`       | unambiguous | 0   | 98      | 0    | **0**    | 2       |

**What this shows.**

1. **The ambiguity effect is far larger than §12 reported, and it is an asking effect.** Unambiguous briefs: the model commits a mode in 98–99% of draws and asks in 0–1%. Ambiguous briefs: it asks instead of committing in **21–50 of every 100 draws**, and commits in only 46–71%. That is a 30–50 point swing driven by the brief alone.
2. **F-2 replicates rather than collapsing.** Help-seeking appears on ambiguous briefs and essentially never on unambiguous ones — which is precisely F-2's claim, now measured at n = 100 per cell instead of inferred from three events.
3. **The label's effect is real but second-order**, and it acts on _asking_ as much as on accuracy: the verb-plus-declarative cell (C3) asks least (21), the noun-plus-declarative cell (C4) asks most (50). The register × mood interaction seen in §12 therefore sits mostly in the ask column, not the hit column.

**The general lesson, for the third time in this programme.** A metric that is defined mechanically will silently absorb behaviour it was not built to see. The E11 scorer caught "asks while listing candidates"; the E13-R rule did not, and the result was a null where the underlying effect was the largest in the dataset. Outcome definitions deserve the same adversarial review as hypotheses.

## 14. Annex — tabulated data for the report

Everything below is report-ready. Figures marked **provisional** depend on a classifier that has not been validated; the rest are direct counts.

### A1. Run receipt

| Field                 | Value                                                                     |
| --------------------- | ------------------------------------------------------------------------- |
| Model                 | `gemini-3.5-flash`, temperature 0, output cap 4096                        |
| Design                | 6 cells × 100 draws, interleaved round-robin, one fixed persona directive |
| Calls                 | **600**                                                                   |
| Status                | **600 RUN · 0 UNRUN · 0 INVALID**                                         |
| `finishReason`        | `STOP` in all 600                                                         |
| Duplicate transcripts | 7 of 600; longest identical run 1 in every cell                           |
| Guard 2               | fired — no bootstrap interval emitted (a constituent cell at boundary)    |
| Analysis              | withheld until the final call completed                                   |

### A2. Per-cell outcome (direct counts)

| Cell | Entry         | Line                  | Brief       | Expected-mode picks | Rate  | Wilson 95%    |
| ---- | ------------- | --------------------- | ----------- | ------------------- | ----- | ------------- |
| C1   | `explain`     | imperative + negation | ambiguous   | 44/100              | .440  | [.347, .538]  |
| C2   | `explanation` | imperative + negation | ambiguous   | 47/100              | .470  | [.375, .567]  |
| C3   | `explain`     | declarative           | ambiguous   | 50/100              | .500  | [.404, .596]  |
| C4   | `explanation` | declarative           | ambiguous   | 30/100              | .300  | [.219, .396]  |
| C5   | `debug`       | native                | unambiguous | 99/100              | .990  | [.946, .998]  |
| C6   | `bug-report`  | native                | unambiguous | 100/100             | 1.000 | [.963, 1.000] |

### A3. Answer-versus-question split (**provisional** — heuristic classifier)

| Cell | Brief       | Asked for information | Committed to a mode | Both | Asked only |
| ---- | ----------- | --------------------- | ------------------- | ---- | ---------- |
| C1   | ambiguous   | 54                    | 53                  | 10   | 44         |
| C2   | ambiguous   | 50                    | 52                  | 8    | 42         |
| C3   | ambiguous   | 29                    | 71                  | 8    | 21         |
| C4   | ambiguous   | 59                    | 46                  | 9    | 50         |
| C5   | unambiguous | 1                     | 99                  | 1    | 0          |
| C6   | unambiguous | 0                     | 98                  | 0    | 0          |

### A4. Descriptive contrasts (**descriptive only**, pre-declared underpowered)

| Contrast                                       | Estimate      | Fisher              |
| ---------------------------------------------- | ------------- | ------------------- |
| Ambiguous pooled vs unambiguous pooled         | .427 vs .995  | p < 10⁻⁴⁰           |
| C4 − C3 (noun vs verb, both declarative)       | −.20          | p = .0059           |
| C4 − C2 (declarative vs imperative, both noun) | −.17          | p = .0198           |
| C4 − C1                                        | −.14          | p = .0566           |
| Register main effect                           | +.030 / −.200 | —                   |
| Mood main effect                               | +.060 / −.170 | —                   |
| Register × mood interaction                    | −.230         | —                   |
| Primary interaction P1                         | +.020         | interval suppressed |

### A5. What the annex may and may not support

**May:** that brief clarity separates committed picks from questions by 30–50 points; that label form moves routing by single digits to about 20; that the effect is not additive and the worst combination observed was noun plus declarative.

**May not:** conditionality — the control cells sat at 99–100%, so the interaction had no room to vary; nor any rate from the provisional classifier until it is validated against hand labels.

### A6. Advice for users (report-ready)

**Say what you want, and say what you want back.** The single largest determinant of whether a mode is chosen correctly is not which mode you pick — it is how specifically you describe the job. In 600 trials, a request that named its situation precisely was matched to the intended mode 98–99 times in 100; a request that could be read two ways was matched 30–50 times in 100, and in up to half of the remainder the assistant asked a clarifying question instead of guessing.

Two habits follow:

1. **Name the situation, not just the topic.** "CI is red on a test that passes locally" routes reliably; "explain why this module is structured this way" can mean _do the explaining_ or _give me an explanation_, and the assistant has to choose.
2. **Answer the clarifying question.** When the assistant asks instead of acting, it is usually because the request admitted two readings. That is the system working as intended, not failing.

The catalogue's job is to survive a vague request; the brief's job is to reduce ambiguity. Neither can do the other's work.

## 15. Label-form research — findings incorporated (2026-11-13)

Source: [`modes-label-form-2026-11.md`](modes-label-form-2026-11.md). Five things change the programme's position.

**1. The lead is unattested, and its nearest neighbours point elsewhere.** No study — human or model — compares a verb-named entry with a noun-named entry in a selection list and measures the choice. In the only factor-isolated tool-selection study (five LLMs, five tasks, metadata from 367,174 tools), **names were the weakest of four levers** — 6 of 29 estimates excluded zero — and when names were the only difference, **position decided**: the first-listed entry was chosen in 78.7–96.0% of trials. Where a name effect did appear, the study's own mediation test removed it: "once both fields carry the same description, the name no longer matters."

**2. Position becomes a first-class candidate cause — and this programme never varied it.** Every routing round from E1 onwards ran with a fixed picker order. That is a larger and better-evidenced confound than label form, and it was absent from every design we built. Recorded as threat **T-POS**, and it belongs in any future routing round as its own arm.

**3. Our brief's premise was stale, and the effect reversed at n = 100.** The research brief was written to explain "1 of 5 vs 4 of 5". The n = 100 round gave **.440 vs .300**: the noun cell picked _less_ and asked _more_. Morphology predicts the reversal — `explanation` is ambiguous between the act and its result, while `explain` is not. The original direction was a small-sample artefact, and the round meant to confirm it refuted it.

**4. The abstention artefact is documented in the benchmark literature, independently of us.** A major agent benchmark defines asking as the _expected_ response on missing-parameter turns and then **never scores that turn** — "asking earns nothing, guessing costs nothing". Instructing a model not to ask left decision accuracy unchanged while raising its official score by 13.5–23.5 points. This is the same mechanism as our E13-R false null, found by someone else, which is the strongest corroboration the correction could receive.

**5. Description quality matters more for under-specified queries than for specific ones**, and the artefact-stating polarity is documented at request level — _"can you suggest some changes"_ yields suggestions, _"Change this function"_ yields edits. Both are existence proofs for the refinement; neither tests labels.

**Consequences recorded.** E19 is replaced by **E20** (artefact-stating arms, ask rate primary, 300 calls); **T-POS** is added to the threat list; and the routing conclusion keeps its direction while resting on a magnitude that reversed. The closing number must therefore read _"label form has no large effect, and the effect first observed did not survive replication"_ — not a confirmation.

## 16. Instrument verification — execution order, the bootstrap, and the clustering guard (2026-11-13)

Three checks run against the 600 saved records. All three are free, all three concern the instrument rather than the result, and each produced one number that constrains E20.

### 16.1 Did execution follow the interleaved order?

Verified from the recorded `startedAt`/`endedAt` timestamps, not from the plan file.

| Property                                          | Measured                                                                 |
| ------------------------------------------------- | ------------------------------------------------------------------------ |
| Records                                           | 600                                                                      |
| Window                                            | 2026-11-12T16:27:01.843Z → 17:48:58.823Z (81.9 min)                      |
| Label transitions across the 600 calls            | **599 — every consecutive call was a different cell**                    |
| Longest same-cell block anywhere in the run       | 1                                                                        |
| Maximum concurrent in-flight calls                | 1 (strictly sequential)                                                  |
| Each cell's own draw order monotonic in time      | 6 of 6                                                                   |
| Position of each cell's draws 1–8 in global order | C1 0,6,12…; C2 1,7,13…; C3 2,8,14…; C4 3,9,15…; C5 4,10,16…; C6 5,11,17… |

The round-robin in the plan is what actually happened, to the call. Per-cell mean latency ran from 4.4 s (`debug`, C5) to 10.1 s (C2, C4), with no drift between the first and last fifty draws of any cell (C5 4.3 → 4.5 s; C4 10.0 → 10.1 s).

**Consequence.** Position in the picker was held constant throughout, so nothing in this round can attribute any part of the result to position. T-POS stands exactly as recorded in §15, untested — and D-2's decision to test it as its own arm is unaffected by this check either way.

### 16.2 Is the bootstrap correct?

Tested three ways against [`bootstrapInteraction()`](../../scripts/lib/routing-round.mjs:713).

1. **Degenerate case.** Six cells all at 1.0 → estimate 0, interval `[0, 0]`. Correct: a zero-variance contrast yields a point.
2. **Analytic case.** Rates .50/.60/.40/.45 at n = 100 → estimate **0.0500** exactly, bootstrap half-width **0.1900** against an analytic 1.96·SE of **0.1938** — 2% narrow, consistent with the floor-indexed quantile and immaterial at 10,000 resamples.
3. **Coverage simulation.** 400 replicates per scenario, 1,000 resamples each, nominal 95% interval:

| Data-generating process                       | Estimable | Coverage  | Mean width |
| --------------------------------------------- | --------- | --------- | ---------- |
| Independent, mid-range rates                  | 400/400   | **95.0%** | 0.385      |
| Independent, one cell near a boundary         | 342/400   | 95.3%     | 0.292      |
| Within-cell dependence, copy probability 0.30 | 400/400   | **88.5%** | 0.385      |
| Within-cell dependence, copy probability 0.50 | 400/400   | **82.8%** | 0.384      |

The interval is correctly calibrated when draws are independent, so the statistic itself is sound. The boundary row also shows Guard 2 discarding about 15% of replicates when a cell sits near a ceiling — which matters here, because C6 sat at 1.000.

The last two rows are the finding: **under within-cell dependence coverage collapses to 82.8% while the interval does not widen at all** (0.385 → 0.384). The failure is silent — it returns the same number with less assurance, which is the one failure mode a reader cannot see. That is a stronger case for Guard 1 than the registration made.

### 16.3 Do the clustering guards measure the right thing?

The guard reads `transcript.sha256` — verbatim text equality ([`transcriptStats()`](../../scripts/lib/routing-round.mjs:670), applied at [`routing-round.mjs:842`](../../scripts/lib/routing-round.mjs:842)). Measured on the real 600:

| Cell | Verbatim dup / run | Normalised dup / run | Courtesy-stripped dup / run |
| ---- | ------------------ | -------------------- | --------------------------- |
| C1   | .010 / 1           | .020 / 1             | .140 / 2                    |
| C2   | .010 / 1           | .010 / 1             | .120 / 1                    |
| C3   | .000 / 1           | .020 / 1             | .070 / 1                    |
| C4   | .020 / 1           | .030 / 1             | .180 / 2                    |
| C5   | .000 / 1           | .000 / 1             | .000 / 1                    |
| C6   | .000 / 1           | .000 / 1             | .000 / 1                    |

Near-duplicate pairs (5-gram Jaccard ≥ 0.80) within cells: **17 of 29,700, or 0.06%**; maximum Jaccard anywhere 1.000. Normalising for case, punctuation and courtesy tails raises the duplicate rate by at most 0.18 and never reaches the 0.20 limit. **The verbatim definition is not letting a near-duplicate epidemic through** — the replies genuinely vary in wording.

But the guard inspects the wrong variable for the assumption it protects. It reads text; the bootstrap resamples **outcomes**. Testing the outcome sequence directly (declare versus ask) with a Wald–Wolfowitz runs test:

| Cell | Declares / asks | Runs vs expected | z         | P(declare \| prev declare) | P(declare \| prev ask) |
| ---- | --------------- | ---------------- | --------- | -------------------------- | ---------------------- |
| C1   | 50 / 50         | 58 vs 51.0       | +1.41     | 0.429                      | 0.580                  |
| C2   | 49 / 51         | 48 vs 51.0       | −0.60     | 0.521                      | 0.471                  |
| C3   | 74 / 26         | 41 vs 39.5       | +0.40     | 0.726                      | 0.769                  |
| C4   | 40 / 60         | 43 vs 49.0       | −1.26     | 0.475                      | 0.356                  |
| C5   | 93 / 7          | 11 vs 14.0       | **−2.40** | 0.946                      | 0.714                  |
| C6   | 95 / 5          | 11 vs 10.5       | +0.55     | 0.947                      | 1.000                  |

Five of six cells are indistinguishable from independent draws. C5 is the exception; it does not survive a six-test correction (which needs |z| ≥ 2.64 for p < .0083) and it rests on seven ask-draws. **Verdict: no detectable clustering this round, so the intervals stand** — but the guard would not have told us if there had been, because it never looks at the sequence it is protecting. Recorded as deviation **D-11**.

### 16.4 What this forces in E20

1. **Freeze a declaration contract before the run.** Six reply formats appeared in 600 replies: `**Mode:** \`slug\``(193),`**Mode:** slug`(102),`Mode: slug`(53),`Mode: \`slug\``(26), a bare bold slug on its own line (C5 uses`**debug**`), and prose commits with no marker at all (8 in C4 alone). An extractor keyed on one cell's slug list also silently returns zero for `explanation`and`bug-report`, because each picker carries its own 45-slug list and the union is 47. My independent extraction agrees with the manual pass at 50/50/75/42/100/98 against 53/50/71/46/99/98 — a residual of −3/0/+4/−4/+1/0, confined to *commit-versus-ask* and never to *appropriate-versus-wrong*. E20 must state the required reply format and pin `parserVersion`, or its primary outcome inherits that residual.
2. **Move the dependence check into the report.** A runs test on the outcome sequence, per cell, is four lines of code and catches what the verbatim guard structurally cannot.
3. **Never read a Guard 2 suppression as a null.** At ceiling rates it discards roughly 15% of replicates; the honest output is "not estimable at this n", which is already what it prints.

## 17. E21 and E21b — the closing number for routing (2026-11-13)

### 17.1 What E21 validated

A hand-label of 30 replies (five per cell, across the run) against the automatic classifier: **27 of 30 agree**. The three disagreements are all about _commit versus ask_, never about _which mode_ — two false positives where a reply commits and then adds a courtesy "would you like me to proceed?", and one false negative, "I need the specific module source code", which asks without the interrogative the patterns expect. The classifier is fit for purpose with a known weakness on closing courtesies, which is where a future version should start.

### 17.2 Three hit metrics were in play, and they disagree

| Definition of a hit                | C1  | C2  | C3  | C4  | What it actually measures       |
| ---------------------------------- | --- | --- | --- | --- | ------------------------------- |
| Slug appears anywhere in the reply | 98  | 95  | 100 | 99  | whether the word was present    |
| Last slug mentioned                | 44  | 47  | 50  | 30  | which token came last in prose  |
| Declared mode = key                | 53  | 50  | 71  | 46  | what the reply said it would do |

The first inflates, because an ask that lists three candidates — "(fits `explanation`)" — scores as a hit for each of them. The second is worse: in an ask, the last slug named is an **option offered**, not a choice. Only the third answers the routing question. The harness reported the second kind of number while the log discussed the third, which is how "0 abstentions" survived a review; it is the same failure as §13, reached by a different route.

### 17.3 The combined outcome — the number that should have been primary

A routing decision is **appropriate** when the reply either commits to the expected owner **or** asks for the information the brief withheld. Only the remainder is an error.

| Cell | Entry         | Line                  | Correct commit | Asked | Wrong commit | Appropriate |
| ---- | ------------- | --------------------- | -------------- | ----- | ------------ | ----------- |
| C1   | `explain`     | verb, IN (96 ch)      | 53             | 47    | 0            | **100%**    |
| C2   | `explanation` | noun, IN (96 ch)      | 50             | 48    | 2            | **98%**     |
| C3   | `explain`     | verb, DC (77 ch)      | 71             | 29    | 0            | **100%**    |
| C4   | `explanation` | noun, DC (77 ch)      | 46             | 54    | 0            | **100%**    |
| C5   | `debug`       | control, shipped line | 99             | 1     | 0            | **100%**    |
| C6   | `bug-report`  | control, shipped line | 98             | 2     | 0            | **100%**    |

**Routing's closing number: 598 of 600 appropriate (99.7%), 2 wrong commits, and no wrong-mode answer to any unambiguous brief.**

An independent marker-based extraction (§16.4) reproduces it inside its known residual — 50/50/75/42/100/98 commits — with the same 2 wrong commits, in the same cell (C2), to the same adjacent mode, and the same 100%/98% appropriateness per cell. Two readings that differ by up to four items on the split agree completely on the judgement.

### 17.4 What label form does move

Commit rate over the verb/noun × IN/DC square, two ways:

| Effect                 | Manual             | Independent extraction |
| ---------------------- | ------------------ | ---------------------- |
| Register (verb − noun) | **+14** (62 vs 48) | +17 (62.5 vs 46)       |
| Mood (DC − IN)         | +7 (58.5 vs 51.5)  | +4 (58.5 vs 54.5)      |
| Interaction            | **+22**            | **+33**                |

Label form moves _whether the reply commits or asks_ — 14 to 17 points on register, with a larger interaction term. None of it reaches appropriateness, because asking on an ambiguous brief is not an error. The interaction is the one term worth carrying forward, and it is exactly the size of the extraction residual, so it enters E20 as a candidate mechanism rather than a finding.

### 17.5 The answer key validates itself

Commitments cluster exclusively on the expected owner: C1 `explain` 53, C2 `explanation` 50 plus `architecture-reviewer` 2, C3 `explain` 71, C4 `explanation` 46, C5 `debug` 99, C6 `bug-report` 98. No cell drifts to an unrelated mode, and the 2 exceptions are `architecture-reviewer` for a question about why a module is structured as it is — adjacent and defensible. A key that was wrong would not produce a distribution shaped like this one.

### 17.6 What this licenses

- The closing claim is: **brief clarity decides commit-or-ask; label form is second-order; the model almost never selects a wrong mode — 2 in 600, both adjacent.**
- It does **not** license "the names do not matter." It licenses the narrower claim that names did not change the _soundness_ of the decision, at one brief, one model, 100 draws per cell.
- The one routing question still open on its own merits is the artefact-stating polarity, which E20 was designed for.

## 18. E20-prep — implemented, verified, and two risks it exposed (2026-11-16)

### 18.1 What was built, and what I verified rather than accepted

The E20-prep contract from §16.4 is implemented: extractor `routing-round-parser/2` with six reply formats and caller-scoped vocabulary, the Wald–Wolfowitz runs test wired into the report, an interleaving assertion in the executor, and a round-trip verifier with a ±6 tolerance.

I re-ran every load-bearing claim instead of taking the report on trust. **61 of 61 tests pass.** The round-trip reproduces exactly: C1 50 correct / 50 asked / 0 wrong, C2 49/49/2, C3 74/26/0, C4 42/58/0, C5 100/0/0, C6 100/0/0 — and **183 of 600 replies matched no format**, which is the hand-adjudication workload and is now always printed.

### 18.2 v2 is the better instrument, and mine was the weak one

v2 reports **100** declarations in C5; my own extraction reported 93 and the manual pass 99. The instinct is to distrust the new number. Checked the seven-reply gap directly: of C5's 100 declarations, exactly **1** also reads as a request — the rest are plain commits. So v2 is right, my extractor was under-counting, and the manual pass was one item off. Recorded because the correct move here was to audit my own number, not the new one.

Of all declarations across the round, 36 (C1 10, C2 8, C3 10, C4 8) both commit and ask — the courtesy-question-after-commit class that E21 already identified. Under the primary outcome they are correct commits, so the closing number in §17.3 is unaffected.

### 18.3 Correction — the dependence check is unavailable where it is most wanted

With C5 at 100 declarations and 0 asks, and C6 likewise, the outcome sequence is all ones and the runs test returns `null`. That is arithmetically right — a constant sequence has no runs variance — but it means **the dependence check does not exist in the saturated cells**, the same place Guard 2 already withholds intervals. The report must print "no dependence test possible: saturated", not "degenerate", or a reader will take it for a defect in the statistic.

**Correction, 2026-11-16.** The renderer never printed the word `degenerate`; it printed `not defined (every scored outcome is identical)`. `degenerate` was my paraphrase of internal identifiers (`isDegenerate`, the `degenerateCells` report field), which describe Guard 2's boundary case and are data shape, not runs-test wording. The substance stands — the rendered string is now `no dependence test possible: saturated` — but the diagnosis named a string that did not exist.

### 18.4 Risk 1 — the instrument is not in version control

`git ls-files` returns nothing for `scripts/lib/routing-round.mjs`, `scripts/run-routing-round.mjs`, `scripts/report-routing-round.mjs`, `scripts/routing-round.spec.mjs` or `scripts/verify-extractor-round-trip.mjs`. The tree sits on branch `docs/architecture-overview`, the last commit is dated **2026-10-22**, and **26 script files, 28 documents and 2 fixtures are untracked** — among them every research document this programme has produced, and the registered parser itself.

A registration that names `routing-round-parser/2` means nothing if the file carrying that version has no git identity, and a single stray `git clean` would take 635 paid calls and the entire written record with it. **This outranks E20** and becomes the first item of E20's precondition list.

### 18.5 Risk 2 — the interleaving assertion, as built, costs the round on a crash

The executor now buffers every record and writes once, after the assertion. The guarantee is real and the failure message is good, but the price is that a crash at call 599 loses all 600 paid calls. The same invariant can be enforced per record — each new record must carry a different label from its predecessor and must not start before the predecessor ended — which catches drift at the moment it occurs, needs no buffering, and restores streaming. Required before E20.

### 18.6 Both corrections landed, and one of the two failures was mine

**Per-record invariant.** The buffered write is gone. `results.jsonl` is truncated once before the loop, each record is checked against its predecessor — different label, and `startedAt` not before the predecessor's `endedAt` — and appended immediately. The error names the call index, both labels and both instants. The full-set `assertInterleaved` remains at the end as the registered 599-transition proof; the per-record check is the early warning, not a replacement. A `--only` slice skips the label check, because such a slice is same-label by construction, while the overlap check still applies. Three tests prove the property that matters: on a repeated label and on overlapping timestamps the run throws **and the file on disk still holds every completed record**.

**Saturated wording.** A constant outcome sequence now renders `no dependence test possible: saturated`.

**The failure I caused.** The suite went red at 64 of 65 on `generate-routing-round-fixtures.mjs --check`, which reported all three sealed files as drifted. Attribution matters here: it was **not** pre-existing. [`.prettierrc.json`](../../.prettierrc.json:1) sets `useTabs: true`, and the lint-staged prettier pass during commit `336f965b77` rewrote `plan.json`, `answer-key.json` and `_label-map.json` from the generator's two-space form to tabs. The check is byte-exact, so it failed on formatting alone — and the bytes of an answer key sealed _before_ the run had changed. The sub-task's "fails identically at HEAD" was circular, because HEAD was my own post-formatting commit.

This is the sharpest instance of the programme's recurring failure mode: an automatic check goes red because a tool rewrote an artefact nobody meant to touch. It surfaced only because the check was byte-exact rather than semantic.

**What was also checked.** While diagnosing, a sub-task ran the generator in write mode over the sealed files and restored them with `git checkout --`. I did not accept that. Each working-tree file was compared by blob hash against the committed blob — all three identical — before I regenerated anything.

**Fix and proof.** `test-fixtures/frames/routing-round/` is now in [`.prettierignore`](../../.prettierignore:1) with the reason beside it; the fixtures were regenerated to the emitted form; and the values were proved unchanged by canonical-JSON sha256 before and after:

| Fixture           | sha256 (canonical, first 16) | Bytes                  |
| ----------------- | ---------------------------- | ---------------------- |
| `plan.json`       | `205219e4633b8322`           | restored to two spaces |
| `answer-key.json` | `3c9eb3f461851eb0`           | restored to two spaces |
| `_label-map.json` | `6c3e80deef6f0e31`           | restored to two spaces |

`--check` now reports all nine files byte-identical, and the suite is **65 of 65**. The round-trip residual is unchanged (−3/−1/+3/−4/+1/+2, 183 adjudicated), so none of this touched measurement.

## 19. E20 readiness — every precondition checked, no call made (2026-11-16)

Nothing here spent money. The Gemini key was verified with a free models-list call: HTTP 200, 50 models visible, `gemini-3.5-flash` available. That request generates nothing and bills nothing.

| Registration §10 precondition       | State                | Evidence                                                                                                                                     |
| ----------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Extractor v2, tested, round-tripped | **Met**              | `routing-round.spec.mjs` 65 of 65; round-trip residual −3/−1/+3/−4/+1/+2 with 183 replies awaiting hand adjudication                         |
| Runs test in the report             | **Met**              | Per arm, rendered beside the clustering guard; a saturated cell reads "no dependence test possible: saturated"                               |
| Interleaving assertion              | **Met**              | Expected total now comes from the plan (`cycle.length × cycles`); 899 transitions in 900 calls is tested, and one swapped pair throws at 897 |
| Fixture generated and hashed        | **Met**              | E20 900 entries, 3 distinct `promptSha256`, counts 100/400/400; E20b 200 entries, 2 distinct, 100/100                                        |
| Answer key sealed                   | **Met**              | `sealed: true` in both; neither key contains line text or a bare arm letter                                                                  |
| `.env` verified                     | **Met, Gemini only** | Gemini key present and valid. DeepSeek base URL and model are now filled but **unused** — Stage 2 was never authorised to run                |

Measured rather than copied: the three arm lines are **50, 96 and 99 characters**; `explain` sits at index 6 in all three E20 arms; the pickers are identical in slug order and differ only in that one line.

Two things a reader should know before the sweep:

1. **The 47-slug claim in §4.2 does not apply to E20.** A union of 47 is a property of the closing round's six pickers, which added `explanation` and `bug-report`. E20's three arms share one 45-slug picker, so the union is 45. Recorded rather than quietly reconciled.
2. **Blinding is weaker than it looks.** Because `plan.json` records the cycle, anyone holding it can tell which blind label is arm A — the arm that appears once in nine. The sealed key remains the only place the owner mapping lives, so counting is unaffected. But the hand adjudication of undetermined replies **must strip the arm label from its packet**, or the adjudicator can be biased by knowing which arm produced the reply.

## 20. Adjudication tooling — built and validated against the closed round (2026-11-16)

Amendment 2 §4 required an anonymised packet. It exists, and it was proved against the 600 saved replies rather than assumed.

**What it does.** `scripts/build-adjudication-packet.mjs` reads a run, extracts with the pinned `routing-round-parser/2` using each arm's own picker, and puts every unmatched reply into a packet. Ids are `sha256(seed:runId)` truncated to twelve hex characters, so the packet is reproducible byte for byte yet ordered by a hash that says nothing about arm, draw or time. Entries carry `{ id, brief, reply }` and nothing else, and the join is written outside the packet directory.

**Blindness is asserted, not intended.** After writing, the tool re-reads both files from disk and refuses if either contains an arm token, a run id, a timestamp, a registered line text, or an arm token adjacent to an id. Demonstrated in both directions:

| Injection                                | Result                                 |
| ---------------------------------------- | -------------------------------------- |
| A full E20 line text appended to a reply | **Refused**, exit 3, naming the line   |
| A `CELL-4-d001` run id added to an entry | **Refused**, exit 3, naming the run id |
| The clean packet                         | **PASS**, exit 0                       |

**Closed-round dry run.** 183 of 600 replies entered the packet — matching the §16.4 adjudication workload — with per-cell counts **50 / 49 / 26 / 58 / 0 / 0**. Applying synthetic all-ASK judgements recovers the published closing numbers: 415 declared, 183 asked, 2 wrong, **598 of 600 appropriate**. The §17.3 headline falls out of the tool rather than being retyped.

**A near-miss worth recording.** The scan matches _full_ registered line texts, and that choice was tested rather than assumed. Three closed-round replies contain the words "cite evidence" as ordinary prose — "I can determine whether this requires `explanation` (to cite evidence explaining why…)". A fragment-level scan would have refused three valid packets. Full-line matching is the correct granularity, and the reason is now recorded instead of looking like an oversight.

**One limitation stated in the tooling.** The verdict vocabulary is `DECLARATION | ASK | OTHER` and carries no slug, so an adjudicated _wrong commit_ is unrepresentable — every reply naming a non-key slug through a declaration marker is extracted mechanically and never reaches the packet. The wrong-commit column is therefore mechanical only, and the tool says so rather than printing a zero that reads as measured.

## 21. The 9-call smoke test — what it caught (2026-11-16)

Before committing €4.7 I ran one full cycle through the real provider rather than a stub. It cost about €0.05 and it found a defect that would have produced 900 `UNRUN` records.

**The defect.** The executor spawned the runner with its working directory set to the run output directory. The runbook's documented template names the runner as `node scripts/lib/gemini-runner.mjs`, which therefore resolved against the run directory, did not exist, and made every call exit 1 without producing output. Invoking the identical command by hand from the repository root worked at once, which isolated the cause. Recorded as **D-16**.

**Three guards now stand in front of it**, each verified rather than assumed:

| Guard       | Behaviour                                                                                                                                           |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Preflight   | A missing runner script is refused before the first call, exit 2, naming the resolved path and the working directory. No `results.jsonl` is created |
| Inherit cwd | The child runs in the operator's directory, so every relative token means what it means when typed                                                  |
| Abort       | A first-call `UNRUN` stops the batch: _"1 of 5 selected call(s) completed; the remaining 4 were never paid for"_                                    |

**The smoke result.** 9 of 9 `RUN`, `finishReason STOP`, cap 4096, and no key material anywhere in the run directory. Six replies declared `explain` and three asked. By arm: **C 4 of 4, B 1 of 4, A 1 of 1**. That is nine draws — noise, not a result — and it is recorded only so the real run can be compared against it.

**Two corrections it produced.**

1. **Time, not cost.** Mean call duration was **9.6 s**, so 900 calls is about **2.4 hours**, not the 60–80 minutes this log previously implied. The closing round averaged 8.2 s only because its unambiguous cells answered in 4–6 s; every E20 call receives the ambiguous brief, so every call is slow.
2. **My own probe was wrong.** Re-extracting the replies, I passed `undefined` as the slug vocabulary — the E20 key carries one shared `slugVocabulary`, not per-arm lists — and read 9 of 9 as abstentions. Under the closing round's rates that is a 0.2% coincidence, and I nearly concluded a seventh reply format existed. Corrected: 6 of 9 declared. Recorded as **D-17**.

**What E20 can and cannot detect — fixed before the run.** Power at α = .05 two-sided, baseline 50%, measured:

| True difference | Power at 100 draws | Power at 400 draws |
| --------------- | ------------------ | ------------------ |
| 8 points        | 15%                | 62%                |
| 10 points       | 29%                | 81%                |
| 12 points       | 40%                | **93%**            |
| 15 points       | 57%                | **99%**            |
| 20 points       | 82%                | ~100%              |

The smallest detectable difference at 400 draws is **9.9 points**, and 11.5 points at 90% power. The reading rules follow from this and are not negotiable after the fact: a difference under 10 points is reported as _no detectable effect at this resolution_, never as _labels do not matter_; a difference of 10–20 points is a magnitude, not a verdict; and only a difference above 20 points licenses a claim that polarity drives commitment. The closing round's measured 14–17 points sits inside the band where 100 draws had 57% power, which is why "second-order" described the ruler rather than the label.

**One measurement caveat.** The exit codes printed in this session were read through a pipe, so they reflect the last command in the pipeline rather than the executor. This is deviation D-6 recurring; the messages themselves are conclusive, and the codes are asserted in tests rather than read from shell output.

## 22. Method rules adopted from defects (2026-11-17)

Every rule here was bought with a specific failure. They are stated as checks so that a future round can be audited against them rather than trusted.

| #    | Rule                                                                                                                                                                                                                                                                                            | Bought by                                                                                                       |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| M-1  | **A headline automatic metric gets a manual pass before it is quoted.** Any rate produced by pattern matching is validated on a hand-labelled sample and the disagreement class is named                                                                                                        | §13, the abstention artefact; §16.4, three incompatible hit definitions; §21, my own undefined-vocabulary probe |
| M-2  | **A sealed artefact is never rewritten by a tool.** Sealed files are excluded from formatters, and a check that compares them is byte-exact or it is not a check                                                                                                                                | D-13, prettier reformatting the answer key and breaking `--check`                                               |
| M-3  | **A guard must inspect the variable it protects.** The clustering guard read transcript text while the bootstrap resampled outcomes; coverage fell to 82.8% with no widening of the interval                                                                                                    | §16.3, deviation D-11                                                                                           |
| M-4  | **An expectation comes from the plan, never from a constant.** A hard-coded batch size silently mis-validated a 900-call round                                                                                                                                                                  | D-16 and the plan-driven executor                                                                               |
| M-5  | **A guarantee must not cost the thing it protects.** The interleaving check buffered the batch, so a crash at call 599 would have discarded 600 paid calls                                                                                                                                      | D-14                                                                                                            |
| M-6  | **Every threshold in a decision table carries a reading for both signs**, or it is sign-agnostic by construction. A symmetric threshold with a one-directional reading cannot classify a reversal                                                                                               | **D-18**, E20                                                                                                   |
| M-7  | **A judgement that could be biased is made blind, with the tie-break fixed before the data.** The packet strips arm, draw and time; the rule that a declaration marker anywhere makes the reply a DECLARATION was written before adjudication                                                   | Amendment 2 §4                                                                                                  |
| M-8  | **A resolution limit is stated before the run, not in a caveat after it.** A "no detectable effect" result is a statement about the ruler                                                                                                                                                       | §21, and the report's §1                                                                                        |
| M-9  | **Every contrast is within-run, or it is not a contrast.** An identical condition scored 12.3 points apart in two batches, larger than the resolution the design claims                                                                                                                         | E20c arm X against E20 arm B, 47.0% vs 59.3%, z = 2.85                                                          |
| M-10 | **Stationarity is tested per arm, never assumed from interleaving.** Interleaving protects against a common trend; it does not protect against an arm × time interaction, and an arm that ramps while others do not will manufacture a contrast that decays                                     | **D-21**, E20c arm X                                                                                            |
| M-11 | **Before replicating a contrast on another model, verify the outcome channel exists there.** A measured difference lives inside a decision; if the second model never makes that decision, or makes it identically every time, the replication is a ceiling or floor and its null means nothing | **D-25**, the DeepSeek pilot                                                                                    |
| M-12 | **A classification rule must distinguish selection from mention, and be tested on known disagreements before any pass is spent.** "Names a mode" and "names the mode it will use" are different constructs, and the difference accounted for 88 points of measured effect                       | **D-26**, the second-reading experiment                                                                         |
| M-13 | **Before testing whether an effect travels, characterise the condition that opens its channel.** "A different brief" is not a condition; "a brief of the same kind" is                                                                                                                          | **D-27**, the three-brief screen                                                                                |
| M-14 | **Every published count is re-derived from its components by a second route before it is quoted.** A total and the columns beside it are re-added from the raw files, never from each other; and a "declared" figure names whose commitment it counts                                           | **D-19**, **D-23**, **D-28** — the three arithmetic defects one addition would have caught                      |

**M-6 is the one that bit hardest**, because it fails silently: the test was correctly powered, the effect was correctly measured, and the rule simply had no slot for the answer that arrived. The remedy is not to reinterpret this round — the registration stays frozen and the report says plainly that it has no reading for a reversed result — but to make the omission impossible in the next one.

## 23. E20c — the slot is not a magnet, and the batch drifts (2026-11-17)

600 calls, 200 per arm, all `RUN`, interleaving proved at 599 transitions. `explain` sat at the **seventh entry** in every arm; only the **last entry** changed.

| Arm   | Last entry holds                | `explain` declared (mechanical) | Bare-slug correction | Corrected       | Undetermined |
| ----- | ------------------------------- | ------------------------------- | -------------------- | --------------- | ------------ |
| **X** | `ai-cost-engineer` (original)   | 94 (47.0%)                      | +3                   | **98 (49.0%)**  | 105          |
| **Y** | `documentation` (non-competing) | 120 (60.0%)                     | +10                  | **130 (65.0%)** | 80           |
| **Z** | `architecture-reviewer` (rival) | 143 (71.5%)                     | +8                   | **152 (76.0%)** | 56           |

**Registered readings, in the order they were fixed.**

1. **Rival capture (Z vs X): 1 against 1 — zero points.** The registered reading applies: _the last slot is not a general magnet; a rival placed there gains nothing._ E20b's effect therefore belongs to `explain` occupying the end, not to the slot.
2. **Explain shift (Y vs X): +13.0 mechanical, +16.0 corrected.** Both sit inside the registered **10–20 indecisive band** — neither supported nor refuted, and not re-run without a new registration.
3. **Unregistered and larger than both: Z vs X on `explain` is +24.5 mechanical, +27.0 corrected.** Moving the _rival_ to the end released the target by more than moving a filler did. No reading exists for it and none is manufactured here.

**The batch drifts, and this is the most consequential number in the round.** Arm X is the **same condition** as E20's arm B — identical picker, line, brief, model and index. It scored **47.0% against 59.3%, 12.3 points apart, z = 2.85**. That is a batch-to-batch difference on an identical prompt, not sampling error. Every contrast this programme may claim was measured **within one run** — E20's B vs C, E20b's first vs last, E20c's three arms — and those stand. Comparisons **across** batches do not, and the practical resolution of the design is about **12 points of batch noise before any effect is measured**, not the 10 points the power calculation promised.

**Reframing E20b, flagged exploratory.** With the rival held early, `explain` declared **15%** at the first entry, **47–49%** at the seventh and **42–45%** at the last. Seventh and last are within a few points of each other; the first is about thirty points below both. E20b's 29-point "first versus last" gap therefore decomposes mostly into **a penalty for occupying the first entry**, not a reward for the last — consistent with E20c's finding that the last slot has no magnetic pull. Exploratory, not confirmatory.

**A caveat on the gate.** Twenty draws per arm gave X 65.0%, Y 45.0%, Z 65.0%, an ordering that inverts two arms relative to the sweep. The gate did its registered job and only that; its declaration rates are noise (**D-20**).

## 24. Red team verdict, and the instability it found (2026-11-17)

An independent adversarial review returned **revise before publishing**. It confirmed 22 of 24 recomputable claims to the unit and found the interpretation layer wrong in three places. Its most damaging finding was one the programme had not looked for: **a ramp inside a single arm**. I recomputed it and it holds.

**Stationarity, tested per arm in blocks, mechanical counts.** Percentages below are within block.

| Experiment          | Arm         | Blocks                       | Shape                            |
| ------------------- | ----------- | ---------------------------- | -------------------------------- |
| E20 (400/400/100)   | B           | 61 / 58 / 63 / 55 per 100    | flat                             |
| E20                 | C           | 83 / 87 / 84 / 90 per 100    | flat, drifting up                |
| E20                 | A           | 17 / 17 / 23 / 16 per 25     | flat                             |
| E20b (100 each)     | first entry | 2 / 3 / 6 / 4 per 25         | flat and low                     |
| E20b                | last entry  | 13 / 8 / 12 / 9 per 25       | flat and higher                  |
| **E20c (200 each)** | **X**       | **18 / 20 / 27 / 30 per 50** | **ramp, 36% → 60%, CA z = 2.72** |
| E20c                | Y           | 32 / 31 / 27 / 30 per 50     | flat                             |
| E20c                | Z           | 38 / 37 / 35 / 34 per 50     | declining                        |

**Contrasts per block, in points:**

| Contrast          | Block 1 | 2       | 3       | 4      |
| ----------------- | ------- | ------- | ------- | ------ |
| E20 B − C         | −22     | −29     | −21     | −35    |
| E20b last − first | +44     | +20     | +24     | +20    |
| E20c Y − X        | **+28** | **+22** | **0**   | **0**  |
| E20c Z − X        | **+40** | **+34** | **+16** | **+8** |

**What this settles.**

1. **E20's primary contrast is stable.** The B−C gap never changes sign and ranges 21–35 points across quarters. The report's headline does not depend on an unstable arm.
2. **E20b's contrast is stable in sign.** The first-versus-last gap is positive in every quartile, though it narrows from 44 to 20 points, so its magnitude is uncertain and its direction is not.
3. **E20c's contrasts are not estimable.** Both decay to zero or near it in the second half. Averaging across the run produces numbers dominated by the first hundred calls. Arm X ramping from 36% to 60% while Y stays flat and Z declines is an arm × time interaction; interleaving does not protect against it, which is why M-10 now exists.

**Two claims in the draft must be withdrawn, and one of them is mine.**

- The report's §4.3 quotes the registration's "≤ 10 points" reading as frozen and then concludes that the advice "does not survive", which is the opposite of what that reading says. That is outcome switching and it was introduced by my instruction, not by the drafting. Neither "survives" nor "does not survive" is earned: **the run is inconclusive**, and the honest sentence is that a rival placed last was not selected (2 replies in 600) while the effect of changing the occupant decayed to nothing.
- §4.2's reframing of E20b as a "penalty for the first entry" subtracts an arm from E20b against an arm from E20c — a cross-batch comparison that M-9 forbids and that the red team correctly identified. Within E20b, first is well below last; whether the mechanism is a first-entry penalty or a last-entry reward cannot be decided by comparing across batches.

**Also recorded from the review, not yet fixed:** the E20c runs tests are absent from the report (computed, Y gives z = +2.51); M-1 was violated for E20c because its headlines have had no full manual pass; E20b has 199 distinct transcripts of 200, not the 193 previously stated; and the debugger note's remaining figures need re-derivation (198 items is 189 bullets plus 9 numbered steps, the table cells read 260 and 145 rather than 286 and 162, and the "~1,700-character" proposal measures 1,308).

### 24.1 Correction to the block table above (2026-11-17)

Two definitions were mixed in §24's block rows. The totals (94, 120, 143) counted replies declaring `explain`; the blocks counted any declaration, which includes each arm's single wrong commit. Counted properly on the same definition as the totals:

| Arm | Blocks of 50, `explain` only | Sum |
| --- | ---------------------------- | --- |
| X   | 18 / 19 / 27 / 30            | 94  |
| Y   | 32 / 31 / 27 / 30            | 120 |
| Z   | 38 / 37 / 35 / 33            | 143 |

The contrasts therefore read **Y−X +28 / +24 / 0 / 0** and **Z−X +40 / +36 / +16 / +6** points, rather than the +22 and +34 previously printed in the second block. Nothing in the conclusion moves: both contrasts still decay to zero or near it, X still ramps (36% → 60%, z = 2.72), and the experiment remains inconclusive. Recorded as **D-23** rather than edited in place, because the log appends and does not overwrite.

## 25. Second-provider pilot — the channel did not exist (2026-11-18)

The second-model replication was stopped at **109 of 800 calls**, and the 400-call slot replication was never started. The reason is not cost or latency; it is that the question could not be asked.

**What the second model did.** 91 output-producing replies across the two wording arms:

| Arm                   | n   | Declared `explain`                                  | Other picks               | **Asks** |
| --------------------- | --- | --------------------------------------------------- | ------------------------- | -------- |
| B — artefact stated   | 43  | 38, plus 3 written `mode: explain` → **41 (95.3%)** | 2 `codebase-cartographer` | **0**    |
| C — artefact excluded | 48  | 46, plus 2 `mode: explain` → **48 (100%)**          | none                      | **0**    |

Across 91 replies there were **five distinct strings**, all of them a mode name. The model never asked a question, never hedged, and returned no prose.

**Why that ends the replication.** The contrast this programme has been measuring is a difference in **whether the reply commits or asks** — 61.5% against 89.0% on Gemini. On the second model both arms are at or near 100% commitment. There is no room for the difference to appear, and a null result there would say nothing about the effect; it would only restate the ceiling. The same applies to the slot replication, whose outcome is the same commit/ask channel.

**What the 91 calls did establish, for about €0.6:**

1. **The commit-or-ask channel is model-specific, and strongly so.** One model, on a maximally ambiguous brief, asks most of the time. Another, on the same brief and the same two lines, never asks. This is the single largest behavioural difference the programme has observed between two models, and it sits underneath the headline result: the 27.5-point effect is a difference in a threshold one model has and the other does not.
2. **Mode choice on the second model is near-deterministic** — five distinct replies in 91 — and independent of the line, which is consistent with the effect living in the ask threshold rather than in preference between modes.
3. **A reasoning model spends the output budget on reasoning.** Five replies truncated to empty content at a 4,096 cap. For this provider the cap must be at least 8,192, and a truncation rate that varies by arm is an outcome, not noise (**D-24**).

**Recorded as M-11**, because the mistake was mine and it was cheap only by luck: I specified a replication of a contrast without first checking that the second model _makes the decision the contrast lives in_. Screening that costs about twenty calls and should precede any future replication.

**What would actually test model-generality.** Not a bigger run on this provider. Either a model that asks at a comparable rate — screened first, at cents per model — or a reformulated outcome that transfers, such as which mode is chosen rather than whether the reply commits. On this provider that second outcome has two events in 91 replies, so it would need thousands of calls to estimate.

## 26. The construct experiment — the disagreement was in the rule, not the replies (2026-11-18)

The independent second reading was run twice over the same 619 undetermined replies, by the same model, changing only the classification rule.

**Attempt 1 — the registered rule.** _"If the reply names a mode anywhere, it is a DECLARATION."_ Agreement with the first pass: **11.1% of 378 replies** (42 of 378), with 328 of the 336 disagreements running ASK → DECLARATION. I then read twelve disagreements in full: every one opens "To determine the correct mode, I need the following information…" and then lists three or four modes as options. **The first pass was right in all twelve.**

**Attempt 2 — selection, not mention.** The rule now says that a reply _selects_ a mode only by naming one as the one to use, and that "a reply such as 'I need to know whether you want A, B, or C' is requesting information; it does not select, however many mode names it contains". Agreement: **99.7% (377 of 378)**, one disagreement in E20b.

**What this is.** An independent model, shown only the blind packet and a correct rule, reproduces the analyst reading almost exactly. The standing objection — that the second pass covered 13.2% and was made by the same person — is answered, at a cost of about €0.32 for both attempts.

**Why attempt 1 failed.** The rule was written to protect a real case: a reply that commits and _then_ asks for more. But on an ambiguous brief almost every ask enumerates candidates, so the protection swallowed the corpus. It is the fourth time in this programme that a measurement definition, not a calculation, decided the answer — exactly what **M-1** exists to prevent and what **M-12** now forbids.

**Corrected counts**, mechanical plus adjudicated DECLARATION under the selection rule:

| Experiment | Arm   | n   | Mechanical | + adjudicated | Total     |
| ---------- | ----- | --- | ---------- | ------------- | --------- |
| E20        | A     | 100 | 73         | +2            | **75.0%** |
| E20        | B     | 400 | 237        | +9            | **61.5%** |
| E20        | C     | 400 | 344        | +12           | **89.0%** |
| E20b       | first | 100 | 15         | +0            | **15.0%** |
| E20b       | last  | 100 | 42         | +4            | **46.0%** |
| E20c       | X     | 200 | 94         | +4            | **49.0%** |
| E20c       | Y     | 200 | 120        | +11           | **65.5%** |
| E20c       | Z     | 200 | 143        | +9            | **76.0%** |

E20's three arms are unchanged to the decimal, so the confirmatory finding stands and is now independently corroborated. One reconciliation remains: E20b's last arm is **46.0%** here against **45.0%** in the report, a one-reply difference to resolve before publication.

**The sensitivity, stated plainly.** Under a mention-anywhere construct the same replies give B 98.0% and C 97.75% — a gap of 0.25 points instead of 27.5. The effect is entirely a difference in _whether the model commits_, and vanishes if "mentions a candidate" is scored as committing. Any future report must name the construct in the same sentence as the number.

## 27. The X re-run — no ramp, but the level moved (2026-11-18)

Arm X was re-run alone: 200 calls, same plan, same model, same prompts. Prompt provenance was checked — all 200 prompt files are byte-identical to the originals and all 200 prompt hashes match, and no response is byte-identical to its counterpart.

| Run        | Block 1  | 2        | 3        | 4        | Total           | CA z      |
| ---------- | -------- | -------- | -------- | -------- | --------------- | --------- |
| Original X | 18 (36%) | 19 (38%) | 27 (54%) | 30 (60%) | 94/200 = 47.0%  | **+2.72** |
| Re-run X   | 27 (54%) | 31 (62%) | 19 (38%) | 31 (62%) | 108/200 = 54.0% | **−0.06** |

Counts are `explain`-only, the definition used throughout (D-23). The estimator was validated by reproducing 18/19/27/30 and z = +2.72 on the original series before being applied to the new one.

**What this settles.** The ramp is **not a stable property of the arm**. A 200-call re-run cannot prove an absence, but it can fail to find an effect that is there, and that is what happened: the blocks are non-monotone and the trend statistic collapses to zero.

**What it does not settle, and what it strengthens.** The overall rate moved from 47.0% to 54.0% on identical prompts — **seven points**, of the same order as the 12.3-point difference measured earlier between E20 arm B and E20c arm X. The instability finding therefore survives in a different shape: not a monotone ramp inside one arm, but a **batch-level shift in the mean** whenever the same condition is run twice.

**Consequences.**

1. **M-9 stands** — a batch mean is not a stable quantity.
2. **M-10 stands, but its first instance was a false alarm.** Its wording is too narrow: a ramp is one way to violate stationarity and a shift in level between batches is another, while a four-block trend test detects only the first.
3. **E20c remains inconclusive**, now for a cleaner reason: its contrasts averaged over a run whose control arm was unstable, and the re-run shows the instability is real even though the ramp shape was not.
4. **No full E20c re-run is proposed.** It would cost about €3.1 and settle a question outside the confirmatory finding. The remaining budget is better spent on the second brief.

## 28. The brief screen — the channel opens on ownership ambiguity, not on vagueness (2026-11-18)

Three second-brief candidates, 10 calls each, 5 per arm, the same two lines and the same pickers as E20. Every call `RUN`.

| Brief                                                     | Declared `explain` | Asked | Other modes |
| --------------------------------------------------------- | ------------------ | ----- | ----------- |
| Why does this worker retry every failed job three times?  | 10 / 10            | **0** | none        |
| Why does the cache expire after sixty seconds?            | 10 / 10            | **0** | none        |
| Why does this function allocate a new list on every call? | 10 / 10            | **0** | none        |

Against E20's own brief, where **40.8%** of arm B and **14.0%** of arm C were undetermined — that is, where the model asked instead of committing. Thirty of thirty drew a declaration here, and eight of them then asked for the source code _after_ selecting, which under the selection rule is a declaration (D-26) rather than an ask.

**Two different kinds of missing information.** E20's brief — "Explain why this module is structured the way it is" — is ambiguous about **which mode owns the request**: explain, architect, architecture-reviewer and codebase-cartographer all fit, and the model resolves that by asking. The three screened briefs are narrow mechanism questions: ownership is obvious and the only thing missing is the code, which the model requests after committing.

**What that means for the headline.** The 27.5-point effect is not about vague requests in general. It is about requests whose **mode ownership is ambiguous**, which is the only condition in which a line has anything to decide. Where ownership is obvious, the line has nothing to decide and both arms commit.

**It also refines §25.** The second provider is not missing the channel so much as resolving ownership ambiguity on its own far more readily — a difference of degree rather than of kind, and one that would vanish on a brief where only the code is missing.

**Consequence for the programme.** The population in which this effect applies is narrower than the report's language implied: briefs that could belong to several modes. That is still the population that matters, because it is where a catalogue has to help, but the report must say so rather than implying the effect holds for any request.

**M-13, recorded because the mistake was mine twice.** The first attempt changed the brief's subject and kept its form; the second changed the form and kept the class. Neither was a test of whether the effect travels, because neither first characterised the condition that opens the channel. A brief that fails to open it cannot refute the effect, and a brief that opens it the same way is not an independent test.

**What is left in the budget.** One further screen of three ownership-ambiguous briefs, at fifteen cents, would say whether the effect survives a _different_ ambiguity. If none opens the channel either, the honest conclusion is that this programme has one brief, and the report should say that instead of reaching for a second.

## 29. The second screen — the effect has one brief, not a class (2026-11-19)

Three ownership-ambiguous briefs, 10 calls each, 5 per arm, read under the selection rule (D-26). Every call `RUN`.

| Brief                                                         | asks (B / C) | declares `explain` | other modes declared             |
| ------------------------------------------------------------- | ------------ | ------------------ | -------------------------------- |
| Why does this service handle retries in two different places? | 0 / 0        | 10 / 10            | none                             |
| Why is this module so hard to change?                         | 1 / 4        | **0 / 0**          | `architecture-reviewer`, 5 of 10 |
| Why does this subsystem have three layers of caching?         | 0 / 0        | 9–10 / 10          | none                             |

**Neither acceptance condition held for the same brief**, and the two failures differ in kind:

1. **Mechanism questions close the channel.** Both the retry and the caching briefs were intended to be jointly owned by `explain`, `architect` and `architecture-reviewer`. The model committed 20 of 20 times and treated each as explanation-with-evidence: ownership was obvious, only the code was missing, and the code was requested after the line had decided.
2. **Change-friction questions open it, but not for `explain`.** "Why is this module so hard to change?" produces genuine candidate lists and 5 asks in 10 — the channel E20 needs — yet every selection is `architecture-reviewer`, and `explain` is the candidate the replies drop. This reproduces the first attempt's failure (D-27) with a different subject.

**The bracket.** Seven briefs have now been screened across three attempts, sixty calls, about €0.35. Exactly one opens both conditions: E20's own, _"Explain why this module is structured the way it is"_. The two classes tried here bracket the qualifying condition without landing on it — a brief about a **structural property** rather than a mechanism, where `explain` is the preferred owner but not the exclusive one.

**C closes as a negative.** There is no second brief. The effect is reported as **brief-specific within the screened set**, not as a general property of mode selection. That is a narrower claim than the report originally carried, and it is the honest one: six briefs that a reasonable person would have expected to behave the same way did not.

**What would reopen it.** A brief of the bracketed kind — structural, with `explain` preferred but contested — screened for both conditions before any sweep. Two of the six failures would have been avoided by that screen, at fifteen cents each, which is the argument for M-13 made concrete.

## 30. Reconciliation of the E20b counts — the last arm is 45.0%, not 46.0% (2026-11-19)

Two published figures for the same arm could not both be right: §26's table gave E20b's last arm as 42 mechanical + 4 adjudicated = **46.0%**, and the report gave **45.0%** with 12 wrong commits. Neither file was trusted for the reconciliation; it was re-derived from the raw material.

**What the files say.** `runs/e20b-2026-11-16/adjudication/packet.jsonl` holds 132 undetermined replies, its join maps them to the two blind arms, `judgements-e20b-pass1.jsonl` carries the analyst's verdicts, and `judgements-deepseek-v2.jsonl` carries the independent pass under the selection rule (the v2 log records 4 `DECLARATION` / 128 `ASK` across the packet, agreeing with pass 1 everywhere but one reply).

- **Last arm (ARM-1):** four declarations. Three are `explain` — two bare backticked slugs and one slug followed by goal prose. The fourth is the single line `architecture-reviewer`.
- **First arm (ARM-2):** one declaration, and it is an ask: _"I need the module's source code… Once you provide the module code… I will analyze … using the `explain` mode (or `architecture-reviewer` if assessing architectural trade-offs)"_. The independent pass read it as an ask, and so does this reading.

**The counts.** Last arm: 42 mechanical `explain` + 3 adjudicated = **45**, with 11 mechanical declarations of another mode plus the adjudicated `architecture-reviewer` = **12 wrong commits**, 43 asks. First arm: 15 mechanical + 0 = **15**, 85 asks, 0 wrong. Both sum to 100.

**Where 46.0% came from.** The merge step counts every adjudicated `DECLARATION` as a declared key, because the verdict vocabulary carries no slug. That is right for a reply that selects a mode and wrong for the rate this experiment defines, which is declarations of **the key**. The 46 therefore includes a commit to the mode the response was marked wrong for. The report's Annex C note identified the defect and then applied the correction twice: it subtracted the 11 mechanical non-`explain` declarations _and_ added the 4 adjudicated ones to a base that never contained them, landing on 45 for the wrong reason.

**Statistics, re-derived and checked against a published value.** The estimator reproduces the report's own 16-vs-45 result exactly (_p_ = 1.31 × 10⁻⁵, CI [16.4, 40.4]) before being applied:

| Contrast                 | Difference      | Fisher two-sided | Newcombe 95% CI  |
| ------------------------ | --------------- | ---------------- | ---------------- |
| **15 vs 45 (corrected)** | **30.0 points** | **5.55 × 10⁻⁶**  | **[17.5, 41.3]** |
| 16 vs 45 (as published)  | 29.0 points     | 1.31 × 10⁻⁵      | [16.4, 40.4]     |
| harm, 0 vs 12            | 12.0 points     | 3.44 × 10⁻⁴      | [5.8, 19.8]      |

The harm figure survives untouched, which is the check that the split is right: the arm has 12 wrong commits, not 11, and 46 declared keys would leave the three categories summing to 101.

**What else moves, and why it is the same defect.**

1. **The extractor-miss count is 27 of 378 (7.1%), not 28 (7.4%).** The 23 adjudicated `explain` declarations in E20 plus the 4 in E20b are the missed commitments; the old 28 counted the `architecture-reviewer` reply as a missed commitment to the key.
2. **E20c's corrected totals are 98 / 131 / 152 (49.0 / 65.5 / 76.0)**, which the v2 file confirms: 24 declarations across the 241 undetermined replies, matching §26's +4 / +11 / +9. The bare-slug column the report printed beside those totals (+3 / +10 / +8) did not add up to them either — 94 + 3 is 97, not 98 — and D-19's "X 98, Y 130, Z 152" carries the same error in the same place.
3. **Nothing about the effect changes**: the polarity contrast is untouched, the position arm's direction and rank order are unchanged, and the harm count of 12 was already published correctly.

**What this is.** The fifth time in this programme that a measurement definition, not a calculation, set the answer — and the second time a pair of adjacent columns that should have summed did not. Both are recorded below.

**Method rule M-14 — a published count is re-derived from its components by a second route before it is quoted.** A total and the columns beside it must be re-added from the raw files, not from each other. Three of the four arithmetic defects in this log (D-19, D-23, D-28) would have been caught by one addition.

**Status.** The report is corrected to **15.0% / 45.0% / −30.0 points** in every place the position arm is quoted, and the reconciliation note that stood in its §9 is deleted. Nothing here is retracted except the number 46.0 and the number 29.0 that came with it.

## 31. The model-free probe gate — what it measured, and which catalogue it measured (2026-11-20)

**Instrument.** [`scripts/mode-probe-gate.mjs`](../../scripts/mode-probe-gate.mjs:1) over [`test-fixtures/mode-probes/probes.json`](../../test-fixtures/mode-probes/probes.json:1), with the strict reader [`scripts/lib/roomodes-lite.mjs`](../../scripts/lib/roomodes-lite.mjs:1). It ranks the catalogue by BM25 over **name + slug + `whenToUse` only** — the three fields a picker line exposes — and compares the top-1 with an allowed-owner set. 11 tests pass; a mutated catalogue is refused on a SHA-256 digest.

**Which catalogue — ours, not ECC's.** The catalogue measured is **our 45-entry axis×stance picker**, [`test-fixtures/frames/axis-stance.roomodes`](../../test-fixtures/frames/axis-stance.roomodes:1) — the same file E13 and E20 rendered into their prompts. ECC's 327 skill descriptions and 72 agent descriptions were read during the review but **never ranked**; nothing in this section is a statement about ECC's catalogue. (ECC's resolver does implement an anchor rule of its own — `scripts/lib/context-selection.js:19-21` in the clone — which is where the idea came from; we did not run it.)

**The two sets.** 20 `gate` probes written as a user would type them, and the 7 briefs already screened in §28–§29 as `report` probes. Report probes never fail the gate.

**Result 1 — the finding is coverage, not accuracy.**

| Measure                                                                               | Value        |
| ------------------------------------------------------------------------------------- | ------------ |
| Gate probes                                                                           | 20           |
| Lexically reachable (expected owner shares a token with the request via name or slug) | **6 (0.30)** |
| On those 6: top-1 in the allowed set                                                  | **6 / 6**    |
| On those 6: wrong owners                                                              | **0**        |
| Unreachable                                                                           | 14           |

Fourteen of twenty ordinary requests contain no word from the name or slug of the mode that owns them. The catalogue is not beaten by its rivals on these requests; it is **invisible** to them. A user asking "the API returns 500, find out why" never types "debug".

**Result 2 — the captures that happened before the anchor rule was declared.** First run, all 20 gated:

| Probe   | Request                                          | Top-1             | Matched terms                              | Correct owner            |
| ------- | ------------------------------------------------ | ----------------- | ------------------------------------------ | ------------------------ |
| gate-01 | The API returns 500 … find out why it fails      | `requirements`    | request, work                              | `debug`                  |
| gate-13 | An API key leaked in a public commit             | `devops`          | pipeline? (no) — generic match on the line | `vulnerability-response` |
| gate-19 | Set up CI that lints, tests and publishes on tag | `pricing-analyst` | **set**                                    | `devops`                 |

`devops`'s line — "pipeline, build, environment or release automation" — contains neither "CI", "test", "tag" nor "publish". `debug`'s line never says "API" or "error". `vulnerability-response` says "leaked", so gate-13 loses on the _anchor_ (its name shares no token), not on the description. These are three concrete opportunities to make a wrong commit by making the line's vocabulary narrower than the user's.

**Result 3 — one function word is worth 57 points.** The tokenizer dropped "why" as a stopword in the first build, then kept it. On the report probes, top-1 moved from **0.286 to 0.857**. Definition, not arithmetic: this is the sixth time in the programme that a measurement definition decided an answer (M-1, M-12, §26, §30). Consequence adopted: the gate publishes **no absolute rate**, only baseline-to-baseline deltas, and its catalogue digest is fatal on mismatch.

**Result 4 — the proxy does not reproduce the model.** With "why" kept, all seven report probes top-1 `explain`, including the two the model answered with `architecture-reviewer` (§29). A selector that returns the same answer for every ambiguous brief is not evidence about ownership; it is a reason the 20-call screen exists.

**Deviation D-29, recorded because it was made after seeing data.** The anchor rule (name/slug token) was introduced after the first run produced three wrong owners. It is uniform, declared in code, and it does not convert those three into passes — they remain listed as unreachable. A reader who rejects the rule gets 3 wrong owners in 20 and a gate that cannot pass; a reader who accepts it gets a coverage metric. Both readings are printed by the tool (`--json` carries `reachable`, `top1Matched` and `summary.unreachable`).

**What it changes.** The gate is a catalogue instrument, not a routing result. It belongs beside the preload work: it can be run in seconds on every `whenToUse` edit, it fails on a moved top-1 against a recorded baseline, and it produces one number worth tracking — reachability.

## 32. The picker the experiments used is not the picker the product emits (2026-11-20)

**Instrument.** Read the renderer, then compared it with an archived prompt.

| Surface                                    | Rendered form                                                                                               | Source                                                                                                                                                                                                              |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product                                    | `  * "<name>" mode (<slug>) - <whenToUse>`, under `MODES`, after "These are the currently available modes:" | [`modes.ts:33`](../../src/core/prompts/sections/modes.ts:33)                                                                                                                                                        |
| Experiment fixtures (E13, E20, E20b, E20c) | `- <slug> — <name> — <whenToUse>`, no heading                                                               | `pickerLine`, [`framing-pretest.mjs:243`](../../scripts/lib/framing-pretest.mjs:243); used at [`routing-round.mjs:331`](../../scripts/lib/routing-round.mjs:331) and [`e20.mjs:301`](../../scripts/lib/e20.mjs:301) |

Archived evidence, verbatim from the published E20 batch: `- explain — Explain — Use when someone asks why code behaves as it does and the answer must cite evidence, not recall.` ([`runs/e20-2026-11-17/prompts/ARM-1-d001.txt:7`](../../runs/e20-2026-11-17/prompts/ARM-1-d001.txt:7)). **Grade High** — source and artefact.

**Three differences, not one.** (1) The line template (`* "Name" mode (slug) - line` vs `- slug — Name — line`). (2) The section framing: the product introduces the list as available modes under a `MODES` heading; the fixtures present it bare. (3) **Field order**: the fixtures put the slug first and the name second; the product puts the name first. Field order is part of the rendered line, so the position result and a _first-token_ effect are not separated by any experiment we have run.

**What is unaffected.** Every within-run contrast: all arms in each experiment shared the form, so the sign and size of B−C, P1−P45 and the E20c readings stand as statements about the fixture form. What is affected: any claim that the result transfers to what the extension shows; §7's authoring template, which prints the product form while the measured text was the fixture form; and the echo detector, whose canonical string is `pickerLine` ([`scorer-rubric.mjs:89`](../../scripts/lib/scorer-rubric.mjs:89)), so a product-form run would need a new echo reference or it would mis-score.

**Do we circulate this to the fixture owner? Yes — this is the comment to transmit.**

```text
Subject: E13/E20 picker format differs from the extension's rendered mode list

What I measured
1. The extension renders each mode as:
      * "<name>" mode (<slug>) - <whenToUse>
   inside a MODES section introduced by "These are the currently available
   modes:"  (src/core/prompts/sections/modes.ts:33).
2. Every experiment fixture renders it as:
      - <slug> — <name> — <whenToUse>
   with no heading (pickerLine, scripts/lib/framing-pretest.mjs:243), and that
   is what E13 (scripts/lib/routing-round.mjs:331) and E20
   (scripts/lib/e20.mjs:301) put in their prompts.
3. The published E20 prompt confirms it verbatim, line 7 of
   runs/e20-2026-11-17/prompts/ARM-1-d001.txt.

Why I am raising it
- Field order differs (slug-first vs name-first), so a first-entry effect and a
  first-token effect are confounded in the position result.
- The report's §7 authoring advice prints the product template while the 27.5
  points were measured on the fixture template. Read literally, §7 attributes a
  measured effect to a format that was never measured.
- The echo guard uses pickerLine as its canonical string
  (scripts/lib/scorer-rubric.mjs:89), so switching format silently changes what
  the guard recognises.

What I am not claiming
- That any within-run contrast is wrong. All arms shared the fixture form.
- That the fixture form is defensible or indefensible. I cannot find a written
  rationale for it in the repo; if there is one, this objection is answered.

What I need from you
1. Was the dash form deliberate? If so, what does it model — an earlier
   renderer, a token-budget choice, or a decision to avoid the "MODES" header
   being echoed back?
2. Was pickerLine ever validated against getModesSection? If yes, at which
   commit, and what changed since?
3. Which form should the next round use? If the answer is "product form", the
   change needs: a new registration (it is not comparable with E13/E20, M-9),
   a new echo reference, and a decision on whether the heading is included.
4. If the answer is "keep the fixture form", §7 of the routing report needs a
   sentence saying the advice is about the fixture form, not the product.

Cost of answering: no calls. Cost of acting: one 200–400-call run (≈€1–2).
```

**Deviation D-30.** Nothing was changed in the fixtures and no reply was re-scored: the divergence is recorded, not repaired. The **report now carries it** — §1.1 names both forms, §7 says its advice is about the measured form, §4.2 adds a rendered-form candidate, §8 carries R0 and §8.1 records the transfer as open (2026-11-20). The addendum in [`ecc-review-2026-11.md`](ecc-review-2026-11.md:238) carries the same finding and ranks a product-format replication above further authoring advice.

**Does this retract the routing report?** No, and the distinction is mechanical rather than diplomatic.

| Claim                                                                   | Status after this finding                                                                                                                      |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| "C out-committed B by 27.5 points"                                      | **Stands**, as a within-run contrast on the fixture form. Wording polarity is a property of the sentence, which was identical in both formats. |
| "First vs last differs by 30 points"                                    | **Stands within the run**; its mechanism list gains a fourth candidate (first _token_, not first entry).                                       |
| "99.7% independent agreement", "598/600 appropriate", extractor defects | **Unaffected** — none touches the rendered template.                                                                                           |
| §7's advice as advice for the extension                                 | **Needs an amendment**, not retraction: it is advice for the fixture form until R0 runs.                                                       |
| "One brief, one model, one position"                                    | **Understated**: add "one picker format".                                                                                                      |

## 33. The hidden-intent screen — the channel opens (2026-11-20)

**Instrument.** [`scripts/hidden-intent-screen.mjs`](../../scripts/hidden-intent-screen.mjs:1) with [`test-fixtures/hidden-intent/briefs.json`](../../test-fixtures/hidden-intent/briefs.json:1). Ten briefs whose deciding fact is held only by the user, plus B3 as an in-run control, interleaved `H K H K …`, one model (`gemini-3.5-flash`), 20 calls, all `STOP`, 1.9 minutes, 30,242 prompt + 1,746 candidate + 18,374 thought tokens, **≈€0.10**. Prompt hashes: 11 distinct (10 hidden + B3 replicated ten times), 20/20 transcripts distinct.

**Adjudication.** Mechanical rule first, then a hand pass on every reply. The first mechanical rule agreed with the hand pass on **15/20 (75%)** and failed in **both** directions: it missed two declarations written `Selected mode: **"Explain" mode (explain)**`, and it scored one ask as a declaration of `code` because the asker wrote "source code". A second rule over-corrected, scoring the goal sentence "without needing to ask for clarification" as a question. The rule now in the tool (v3) agrees on **19/20**, and its only residual is an ask left `UNRESOLVED` — it never over-counts asking. Record: `runs/hidden-intent-screen-2026-11-20/adjudication.json`.

| Arm           |   n |   ASK | DECLARATION |        Outside the authored owner set |
| ------------- | --: | ----: | ----------: | ------------------------------------: |
| Hidden intent |  10 | **7** |           3 | 1 (`requirements` on the audit brief) |
| Control (B3)  |  10 |     3 |           7 |                                     0 |

**Result — the class opens the channel, and that is all it establishes.** 7 of 10 hidden-intent briefs drew a question that named the missing fact ("is this CI/CD, database maintenance or a batch job?"; "pricing, invoicing or contract?"). Two of the three commits are briefs that failed the design — "make the API faster" and "the docs are out of date" state their owner in the brief, so nothing was withheld. Excluding them post hoc gives **7 of 8 (87.5%)**, which is a second finding about the _design_: a hidden-intent brief only works if the withheld fact is what decides ownership.

**Control consistency.** B3 declared in **7 of 10 (70%)** on the **product** form, against **61.5%** at 400 draws on the **fixture** form in E20 arm B. Two arms, different formats, nine points apart at n=10 versus n=400: this is a consistency observation, not a replication, and it is the cheapest evidence so far that the format gap of §32 does not by itself move the commit rate much for this brief. It does not license subtracting one from the other (M-9).

**Deviation D-31.** Post-hoc exclusion of hi-04 and hi-06 is disclosed above and must not be quoted as the headline; the headline is 7/10, with the two failures named.

**What it changes for the seven-brief problem.** The programme now has a _generator_ for the qualifying class rather than a search over hand-written briefs: withhold the fact that decides ownership, leave the repository intact. The next round should pre-register the owner sets (including whether `requirements` on an audit-scoping request is a wrong commit or an acceptable neighbour), because that judgement currently sits with the analyst.

**How these three sections improve the repository.**

| Finding                                               | Concrete change                                                                                                                                                                           | Where                                                                  |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Reachability 0.30; three captures                     | Add the user's words to the thinnest lines: `debug` gains "error", "API", "fails"; `devops` gains "CI", "tests", "tags", "publish"; `vulnerability-response` gains "leaked key", "secret" | `test-fixtures/frames/*.roomodes`, then `custom-modes/custom_modes.d/` |
| Anchor rule needs a vocabulary the name cannot supply | Add a curated `triggers` list per mode (3–6 words users actually type) and rank on it, as ECC does                                                                                        | new field in the catalogue schema; `scripts/mode-probe-gate.mjs`       |
| Definition sensitivity (57 points)                    | Keep the baseline digests; never publish an absolute rate; require a baseline for any claim                                                                                               | already implemented                                                    |
| Format gap                                            | One renderer, two formats, chosen by flag; echo reference follows the flag                                                                                                                | `framing-pretest.mjs`, `scorer-rubric.mjs`, R0 registration            |
| Hidden-intent class                                   | Use it as the brief generator for the next round; pre-register the owner sets                                                                                                             | `docs/reviews/<next>-preregistration.md`                               |
