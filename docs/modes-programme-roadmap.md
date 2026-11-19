# Modes programme — roadmap

| Field              | Value                                                                                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What this is**   | The followable plan for the modes work. One page, kept current. Not the public [`ROADMAP.md`](../ROADMAP.md), which is user-facing marketing with a different audience and a different job. |
| **How to read it** | §1 says where we are. §4 is the only section that needs acting on. Everything else is context for a reader who has been away.                                                               |
| **Last updated**   | 2026-11-13                                                                                                                                                                                  |

---

## 1. Where we are, in one line

**Routing has been measured and closed. Capability has not been started. The catalogue migration is blocked behind capability.**

## 2. The two benchmarks

The programme answers two different questions, and conflating them caused most of the confusion in October.

| Benchmark      | Question                                   | Status                                                  |
| -------------- | ------------------------------------------ | ------------------------------------------------------- |
| **Routing**    | given a request, is the right mode chosen? | **Closed.** 600 calls, six cells, n = 100               |
| **Capability** | given a mode, does the job get done?       | **Not started.** Research brief written, not dispatched |

## 3. What routing established

| Finding                                                                                                                                                                     | Strength                                                                       |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **Every routing decision was sound: 598 of 600 appropriate** (committed to the expected mode, or asked for the missing information); the 2 exceptions were an adjacent mode | High — dual-coded, two independent readings                                    |
| Brief clarity dominates: unambiguous briefs get a committed mode 98–99 times in 100; ambiguous ones 46–71, and ask instead 21–50 times                                      | High, 100 draws per cell                                                       |
| Label form is second-order — activity-vs-artefact naming and imperative-vs-declarative wording move routing by single digits to about 20 points                             | Medium                                                                         |
| The effect first observed (1/5 vs 4/5) **reversed** at n = 100 (.440 vs .300)                                                                                               | High — the original was a small-sample artefact                                |
| Persona directives change wording, not routing                                                                                                                              | High for the variable tested                                                   |
| Temperature 0 is not deterministic                                                                                                                                          | High                                                                           |
| Asking on an ambiguous brief is **appropriate**, and benchmarks systematically fail to score it                                                                             | High, corroborated externally                                                  |
| **Position** decides selection when names are the only difference — and we never varied picker order                                                                        | Reported, from the only factor-isolated study; a threat we have not yet tested |

## 4. Next, in order

| #                | Action                                                                                                                                                                                                                                                                                                                                                         | Cost                      | Why now                                                                                                                                                                                                                                                      |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| ~~E21~~          | **Done 2026-11-13** — classifier validated at 27/30, combined outcome published as routing's closing number: **598 of 600 appropriate** (log §17.3)                                                                                                                                                                                                            | **Free** — compute only   | Closed. Every later claim about routing rests on this number                                                                                                                                                                                                 |
| **E20-prep**     | **Freeze the declaration contract** — done 2026-11-16: extractor `routing-round-parser/2`, runs test in the report, interleaving assertion, round-trip verifier (61/61 tests, residual −3/−1/+3/−4/+1/+2)                                                                                                                                                      | **Free**                  | Six reply formats and a 47-slug union: unpinned, the primary outcome carried up to 4 items per cell of extraction residual (log §16.4, §18.1)                                                                                                                |
| ~~BLOCKER~~      | **Done 2026-11-16** — committed as `336f965b77`: 134 files, 35,678 insertions. All 27 scripts, 32 documents and the fixtures are tracked, so `routing-round-parser/2` has a git identity                                                                                                                                                                       | **Free**                  | 635 paid calls and the written record now have history (log §18.4)                                                                                                                                                                                           |
| ~~E20-prep (2)~~ | **Done 2026-11-16** — per-record interleaving invariant with immediate append, proved by a test that throws mid-batch and still finds every completed record on disk; full-set 599-transition proof retained                                                                                                                                                   | **Free**                  | The guarantee no longer costs the round it protects (log §18.5–18.6)                                                                                                                                                                                         |
| **E20**          | **Repaired routing test** — registered in [`2026-11-13-e20-preregistration.md`](reviews/2026-11-13-e20-preregistration.md:1), amended to 400 draws for the two long arms. Three lines: artefact absent (50 ch) / stated (96 ch) / excluded (99 ch); brief held maximally ambiguous; **primary contrast is the length-matched B vs C**; cycle A B C B C B C B C | **900 calls ≈ €4.7**      | The 10–20 point band becomes answerable (12 points at 93% power); at 100 draws it was not                                                                                                                                                                    |
| **E20b**         | **Position arm** — `explain` first vs last in a 45-entry picker, line and brief held at B                                                                                                                                                                                                                                                                      | **200 calls ≈ €1.1**      | The literature's largest effect is position (78.7–96.0%), and we have never varied it                                                                                                                                                                        |
| **E20c**         | **Slot versus item** — is the last position a magnet for whichever mode occupies it? `explain` held at index 6 in all three arms; index 44 occupied by its original occupant, a non-competing filler, or the plausible rival                                                                                                                                   | **600 calls ≈ €3.1**      | E20b's 30-point effect could not then be told apart from a slot effect, and the catalogue advice differs depending on which it is. **Run: inconclusive** — the control arm was not stationary, and the re-run did not reproduce the ramp (report §4.3, §4.7) |
| **E17**          | **Routing report draft** — annex tables, user advice, and a two-prompt comparison (shipped `debug` vs proposed `debug`, chosen by function)                                                                                                                                                                                                                    | Free                      | Needs E21 and E20 to be worth writing                                                                                                                                                                                                                        |
| **E18**          | **Dispatch the capability research** — brief at [`modes-capability-benchmark-BRIEF.md`](research/modes-capability-benchmark-BRIEF.md)                                                                                                                                                                                                                          | **Free** — no model calls | Can run in parallel with E21/E20                                                                                                                                                                                                                             | [docs/research/modes-capability-benchmark-2026-11.md] |
| **E22**          | **Capability design** — after the research lands: pick the doctrine pair, the fixture, the statistic and n                                                                                                                                                                                                                                                     | Unknown                   | Cannot be scoped before the research answers whether a doctrine effect is detectable at our budget                                                                                                                                                           |

When the catalogue is defined, refine it by applying both benchmarks, and check it for ambiguity and other weaknesses. The routing benchmark has a cheap standing use for this: feed a set of real requests to the picker and record whether the reply commits or asks. A high ask rate on a request class means the catalogue cannot decide from it, which is actionable for the lines, the onboarding and the documentation — and re-running the probe after a change shows whether the change helped. The probe must pin its model, because the ask rate is model-specific (report §6.3).

## 5. Open decisions, for the maintainer

| #   | Decision                                                                                       | Default if undecided                                                                                                                                                                                 |
| --- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| D-1 | Run **E20** (900 calls, ≈€4.7)?                                                                | **Decided: run.** Registration amended (§11 of the pre-registration) to 400 draws for B and C, A kept at 100 as a baseline                                                                           |
| D-2 | Test **position** as its own arm? It is the largest known confound and we have never varied it | **Decided: run as E20b, not crossed with E20** (200 calls ≈ $0.57). The closing round held position constant, so T-POS is untested (log §16.1)                                                       |
| D-3 | Has the **Gemini key** been rotated, and is the **DeepSeek** base URL valid?                   | **Resolved 2026-11-16:** Gemini key verified by a free models-list call (HTTP 200, `gemini-3.5-flash` available); DeepSeek base URL and model are set but unused, since Stage 2 was never authorised | Verified without printing any key value |
| D-4 | Accept the **capability** definition of success once the research proposes one                 | Awaiting research                                                                                                                                                                                    |

## 6. Costs to date — reconciled against the provider

The Gemini console lags more than 24 hours, so spend was read on 2026-11-16 after a weekend. This supersedes every earlier estimate in this file.

| Date       | Calls   | Reported spend | What it paid for                               |
| ---------- | ------- | -------------- | ---------------------------------------------- |
| 2026-11-11 | 35      | €0.15          | E11 pretest (30) and E12 determinism probe (5) |
| 2026-11-12 | 600     | €3.10          | E13-R Stage 1, the closing round               |
| **Total**  | **635** | **€3.24**      | Measured rate: **€5.1 per 1,000 calls**        |

Every earlier projection here was low. The closing round was estimated at $1.7; measured spend is €3.10 — close to double before any currency conversion. The E20 family is therefore re-costed at €5.2 per 1,000 calls:

| Round                              | Calls | ≈ Cost at the measured rate |
| ---------------------------------- | ----- | --------------------------- |
| E20 — B vs C at 400 draws each     | 800   | ≈ €4.2                      |
| E20 — arm A at 100 draws, if kept  | 100   | ≈ €0.5                      |
| E20b — position arm, first vs last | 200   | ≈ €1.1                      |

Stage 2 (DeepSeek) was authorised but **not run**, because the registered condition — a Stage 1 primary interval excluding zero — was not met.

## 7. Deliberately not doing

- **A second label-form round beyond E20.** The literature says the effect is small and position is larger; another naming round would be polishing a minor variable.
- **Migrating the catalogue before capability evidence.** We would be renaming 45 modes on the strength of a routing result that says naming barely matters.
- **Publishing the routing result as a confirmation.** It is a negative on label form plus a reversal; it must be written that way.
- **Treating asking as failure.** It is the correct response to an ambiguous brief, and the metric will say so.

## 8. What would make this roadmap wrong

- The capability research finding that doctrine effects are **not detectable** at a few hundred calls — in which case capability closes as "not measurable here" and the migration proceeds on judgement, documented as such.
- Position turning out to explain most of the routing variance — in which case the routing conclusion is about list order, not wording, and E20's design changes.
- The catalogue shrinking below a size where preload allocation matters — in which case several open questions become moot.
