# Independent red-team review — routing closing round (E13-R), before the run

| Field                    | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Object under review**  | [`2026-11-12-routing-closing-round-preregistration.md`](2026-11-12-routing-closing-round-preregistration.md:1), including **Amendment 1** (six cells, 2×2 factorial, two models)                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Question asked of me** | Can this experiment answer the question it registers, and can its statistics bear the readings it pre-commits to?                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Method**               | Read the registration and Amendment 1; read log §11 and D-1…D-10; read E11/E12/F-1/F-2; read the B3 isolation red team for the expected standard; measured every line length and diffed every entry the design names against [`axis-stance.roomodes`](../../test-fixtures/frames/axis-stance.roomodes:1) and [`artefact.roomodes`](../../test-fixtures/frames/artefact.roomodes:1); re-derived Fisher's exact size and the power of a difference of differences by exact enumeration; read the author's self-review **only after** forming the view below. No model call. No network. No file edited except this report. |
| **Date**                 | 2026-11-12                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Independence**         | This is not a self-review. I have no authorship role in the registration and did not see the self-review before writing §0–§8.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Verdict**              | **AMEND BEFORE RUNNING**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

---

## 0. Verdict and why

**AMEND BEFORE RUNNING.**

The round is worth running and the single-picker factorial is the right structural correction to E12. But three defects sit in frozen material and one sits in the statistics:

1. the **control pair changes the routing line as well as the name**, so the primary interaction compares a clean manipulation with a contaminated one (objection 3);
2. the **§6 decision table is non-exhaustive, overlapping, and still keyed to the superseded four-cell names**, so several of the most likely outcomes match no row at all (objection 2);
3. the **primary interaction is underpowered** — 43.7% at a .30 interaction, and 67–85% even at the .40 difference §7's 84% figure assumes, depending on where the control sits — and §6 row 3 converts that null into “close the benchmark” (objection 1);
4. the **“plain” line is not plain**: it still says evidence must be cited, so the factorial does not separate register from constraint, which is the reason Amendment 1 was filed (objection 4).

All four are repairable by text and fixture changes, without new model calls. That is why the verdict is _amend_, not _do not run_. If the maintainer is unwilling to rewrite §6 and the control pair, the verdict becomes **DO NOT RUN**, because the round would then have a pre-printed results section that its own arithmetic cannot reach.

---

## 1. Restatement and assumption register

**In one sentence:** _Six cells of 30 draws each, two models, all inside one 45-entry picker with only the target entry rewritten, are meant to show that a verb-named entry routes worse than a noun-named entry when the brief is ambiguous about answer type, and not when it is unambiguous — tested as a difference of differences on DeepSeek, with Gemini as replication._

### 1.1 Explicit claims

| #   | Claim                                                                                    | Where                                                                                                                                        |
| --- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| E-1 | Persona framing does not change the chosen mode (20 concordant picks, four cells)        | [prereg:16](2026-11-12-routing-closing-round-preregistration.md:16)                                                                          |
| E-2 | The model is not deterministic at temperature 0; the instability sits on pick-versus-ask | [prereg:17](2026-11-12-routing-closing-round-preregistration.md:17)                                                                          |
| E-3 | Exact lexical overlap does not guarantee selection                                       | [prereg:18](2026-11-12-routing-closing-round-preregistration.md:18)                                                                          |
| E-4 | The hypothesis is conditional and is a claim about the difference of differences         | [prereg:26](2026-11-12-routing-closing-round-preregistration.md:26)                                                                          |
| E-5 | Exactly one hypothesis is assessed; no multiplicity correction is needed                 | [prereg:70](2026-11-12-routing-closing-round-preregistration.md:70)                                                                          |
| E-6 | The primary claim is the interaction on the cross-vendor model; Gemini is replication    | [prereg:160](2026-11-12-routing-closing-round-preregistration.md:160), [prereg:170](2026-11-12-routing-closing-round-preregistration.md:170) |
| E-7 | The datum is binary: declared mode equals a sealed key; no scorers                       | [prereg:190](2026-11-12-routing-closing-round-preregistration.md:190)                                                                        |

### 1.2 Hidden assumptions

| #    | Assumption                                                                     | Status                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H-1  | The six cells differ only in the target entry                                  | **Partly false.** List length and neighbour count are held; the target entry's line length and content are not (96 vs 77 chars in the ambiguous pair; 97 vs 81 in the control pair). The “byte density” clause at [prereg:124](2026-11-12-routing-closing-round-preregistration.md:124) is therefore overstated.                                                                                                            |
| H-2  | “Constraint line” vs “plain line” is a presence/absence contrast               | **False.** Both lines require evidence citation: see [prereg:137-138](2026-11-12-routing-closing-round-preregistration.md:137).                                                                                                                                                                                                                                                                                             |
| H-3  | The control pair is the same manipulation as the treatment pair                | **False.** C1→C2 holds the line fixed; C5→C6 changes slug, Name, deliverable clause, punctuation and 16 characters. See [prereg:144-145](2026-11-12-routing-closing-round-preregistration.md:144).                                                                                                                                                                                                                          |
| H-4  | “Declared mode” is well defined                                                | **Untested.** The term is not defined in the registration; the only mechanical definitions in the repository live in the E12 key ([`answer-key.json:115`](../../test-fixtures/frames/b3-isolation/answer-key.json:115)) and are not imported.                                                                                                                                                                               |
| H-5  | Draws within a cell are independent Bernoulli trials                           | **Admitted doubtful** ([prereg:102](2026-11-12-routing-closing-round-preregistration.md:102)); R-3 checks but does not correct.                                                                                                                                                                                                                                                                                             |
| H-6  | A percentile bootstrap on a difference of differences is valid at the boundary | **False at the boundary.** The control cells are expected at or near ceiling (E11: 5/5 and 20/20 concordant, [log:212-213](../research/modes-experiment-log.md:212), [log:236-241](../research/modes-experiment-log.md:236)). At a true rate of .97 the probability that all 30 draws in a cell are identical is 40.1%; the bootstrap then returns a zero-variance control and an artificially narrow interaction interval. |
| H-7  | n = 30 powers the primary statistic at 84%                                     | **Misleading.** 84% is the power of a _single_ 2×2 contrast at 0.30 vs 0.70 ([prereg:98](2026-11-12-routing-closing-round-preregistration.md:98)); the registered interaction at the same .40 difference has 67–85% depending on the control level, and 43.7% at a .30 interaction and 20.8% at .20.                                                                                                                        |
| H-8  | The replication model can veto the claim                                       | **False.** [prereg:170](2026-11-12-routing-closing-round-preregistration.md:170) gives Gemini no veto; a Gemini result in the same direction as a null DeepSeek is not covered at all.                                                                                                                                                                                                                                      |
| H-9  | `deepseek-chat` is a pinned model                                              | **Unverified and probably false.** Unlike `gemini-3.5-flash`, `deepseek-chat` is a moving alias; R-8's “model id” may return the alias itself ([prereg:186](2026-11-12-routing-closing-round-preregistration.md:186)).                                                                                                                                                                                                      |
| H-10 | The two sweeps are comparable                                                  | **Untested.** They are “separate batches” ([prereg:149](2026-11-12-routing-closing-round-preregistration.md:149)); the model comparison is confounded with time.                                                                                                                                                                                                                                                            |
| H-11 | “No peeking” and the instrument-fault gate are compatible                      | **Tension.** The gate [prereg:88](2026-11-12-routing-closing-round-preregistration.md:88) can only be read after all 360 calls, because the design forbids peeking until then ([prereg:190](2026-11-12-routing-closing-round-preregistration.md:190)).                                                                                                                                                                      |
| H-12 | “No scorers” means no judgement                                                | **Partly false.** There is still a parser, and its rules are not frozen (objection 6).                                                                                                                                                                                                                                                                                                                                      |

### 1.3 Stated success criterion and the implied “this will work” claim

The design succeeds if the DeepSeek interaction interval excludes zero and the Gemini sweep does not contradict it. The implied claim is stronger than that: that 360 calls buy an _interpretable, adequately powered_ test, and that a null licenses closing the routing benchmark. Objection 1 shows the second half of that claim is false.

---

## 2. Attack tree

Each branch names how the assumption breaks and the evidence level: **CONFIRMED** (demonstrable in-repo), **LIKELY** (derivation shown), **SPECULATIVE** (hypothesis).

| Assumption / claim                         | Attack branch                                                                                           | Evidence                                    |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| H-3 control pair is a matched manipulation | The control lines differ in deliverable and length, so the subtracted contrast is not the same quantity | **CONFIRMED** by diff (objection 3)         |
| H-7 n=30 powers the interaction            | Power is computed for a single contrast; the interaction's SE is ~2× larger                             | **CONFIRMED** by enumeration (objection 1)  |
| E-5 exactly one hypothesis                 | Abstention is separately tested and has a pre-committed metric-switch row                               | **CONFIRMED** text (objection 5 / §9)       |
| H-2 plain line is constraint-free          | The plain line says “evidence must be cited”                                                            | **CONFIRMED** text (objection 4)            |
| H-4 declared mode is defined               | No parser, no extraction rule, no tie-break in the registration                                         | **CONFIRMED** absence (objection 6)         |
| H-6 bootstrap is valid at the boundary     | Control cells are expected at ceiling; the bootstrap degenerates                                        | **LIKELY** (objection 9)                    |
| H-8 replication can veto                   | Rule is silent on same-direction significance + null; opposite-direction + positive can co-exist        | **CONFIRMED** text (objection 5)            |
| H-9 `deepseek-chat` is pinned              | Alias drift between registration and run, or mid-run                                                    | **LIKELY** (objection 8; no network)        |
| H-10 sweeps comparable                     | Time-varying provider state changes between batches                                                     | **LIKELY** (objection 5)                    |
| H-11 no peeking + fault gate               | A dead endpoint burns the full budget before the gate is readable                                       | **CONFIRMED** text (objection 11)           |
| H-1 cells differ only in the target entry  | Target line length changes; prompt byte density moves                                                   | **CONFIRMED** by measurement (objection 13) |
| E-7 binary datum                           | Abstention and wrong-selection are pooled; the phenomenon is abstention                                 | **CONFIRMED** by E11/E12 (objection 6)      |

---

## 3. Findings table (FMEA)

Risk = Severity × Likelihood × (6 − Detectability). Lower detectability = more dangerous.

| ID  | Attack                                                                                                                                       | S   | L   | D   | Risk    | Evidence                          | Reference                                                                                                                                  |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------- | --- | --- | --- | ------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 3   | Control pair changes name **and** line, so the interaction is not estimable                                                                  | 5   | 5   | 1   | **125** | CONFIRMED (diff)                  | [prereg:144](2026-11-12-routing-closing-round-preregistration.md:144)                                                                      |
| 1   | Primary interaction has 43.7% power at a .30 effect (67–85% at the .40 difference §7 assumes); row 3 turns a null into “close the benchmark” | 5   | 5   | 2   | **100** | CONFIRMED (enumeration)           | [prereg:98](2026-11-12-routing-closing-round-preregistration.md:98), [prereg:85](2026-11-12-routing-closing-round-preregistration.md:85)   |
| 2   | §6 readings are non-exhaustive, overlapping, and keyed to stale cell names; row 2 is unreachable                                             | 5   | 5   | 2   | **100** | CONFIRMED (text + enumeration)    | [prereg:83](2026-11-12-routing-closing-round-preregistration.md:83), [prereg:190](2026-11-12-routing-closing-round-preregistration.md:190) |
| 4   | “Plain” line still constrains; the factorial does not separate register from constraint                                                      | 4   | 5   | 2   | **80**  | CONFIRMED (text)                  | [prereg:137](2026-11-12-routing-closing-round-preregistration.md:137)                                                                      |
| 5   | Replication rule is non-exhaustive and the sweeps are separated in time                                                                      | 4   | 4   | 2   | **64**  | CONFIRMED (text)                  | [prereg:170](2026-11-12-routing-closing-round-preregistration.md:170)                                                                      |
| 6   | Binary datum is under-defined; the parser is an unregistered scorer                                                                          | 4   | 4   | 2   | **64**  | CONFIRMED (absence)               | [prereg:190](2026-11-12-routing-closing-round-preregistration.md:190)                                                                      |
| 9   | Bootstrap degenerates when a cell is all-identical; control is expected at ceiling                                                           | 4   | 5   | 3   | **60**  | LIKELY (binomial)                 | [prereg:68](2026-11-12-routing-closing-round-preregistration.md:68)                                                                        |
| 10  | Log §11 still describes the four-cell design; two sources of truth                                                                           | 3   | 5   | 2   | **60**  | CONFIRMED (text)                  | [log:310](../research/modes-experiment-log.md:310)                                                                                         |
| 7   | R-5 specifies four labels for six cells; C1/C2 collide with the E12 key                                                                      | 4   | 4   | 3   | **48**  | CONFIRMED (text)                  | [prereg:63](2026-11-12-routing-closing-round-preregistration.md:63)                                                                        |
| 11  | Fault gate unexecutable under no-peeking; `finishReason` recorded not enforced                                                               | 4   | 4   | 3   | **48**  | CONFIRMED (text)                  | [prereg:88](2026-11-12-routing-closing-round-preregistration.md:88), [prereg:62](2026-11-12-routing-closing-round-preregistration.md:62)   |
| 8   | `deepseek-chat` is a moving alias; “same pinned model” is false for the cross-vendor arm                                                     | 4   | 4   | 4   | **32**  | LIKELY (no network)               | [prereg:39](2026-11-12-routing-closing-round-preregistration.md:39)                                                                        |
| 12  | “Type I ≈ 1.7%” is unsourced and conditional-dependent                                                                                       | 2   | 4   | 4   | **16**  | CONFIRMED (computed alternatives) | [prereg:75](2026-11-12-routing-closing-round-preregistration.md:75)                                                                        |
| 13  | R-1 and §7 still say 120 calls / four cells                                                                                                  | 2   | 5   | 4   | **20**  | CONFIRMED (text)                  | [prereg:59](2026-11-12-routing-closing-round-preregistration.md:59)                                                                        |
| 14  | No retry / rate-limit semantics; a retried call duplicates a draw                                                                            | 3   | 4   | 4   | **24**  | CONFIRMED (absence)               | [prereg:62](2026-11-12-routing-closing-round-preregistration.md:62)                                                                        |
| 15  | R-3's “consecutive” and “beyond chance” are undefined                                                                                        | 2   | 4   | 4   | **16**  | CONFIRMED (text)                  | [prereg:61](2026-11-12-routing-closing-round-preregistration.md:61)                                                                        |

---

## 4. Objections

### 1 — FATAL: the primary interaction is underpowered, and §6 row 3 converts its null into a programme-closing decision

**What is wrong.** §7 states power “at n = 30” as ~100% against .20 vs .80 and 84% against .30 vs .70 ([prereg:98](2026-11-12-routing-closing-round-preregistration.md:98)). Those are powers of a **single 2×2 contrast**. The registered primary statistic is a **difference of two differences** ([prereg:68](2026-11-12-routing-closing-round-preregistration.md:68)), whose standard error is larger. I re-derived both by exact enumeration over four independent binomial cells at n = 30:

| Statistic (n = 30/cell)                                  | Power                  |
| -------------------------------------------------------- | ---------------------- |
| Single contrast, .30 vs .70 (Δ = .40)                    | **83.8%** — matches §7 |
| Single contrast, .20 vs .80 (Δ = .60)                    | **99.8%** — matches §7 |
| Interaction, Δ = .40, control at .70                     | **67.4%**              |
| Interaction, Δ = .40, control at .80                     | **72.2%**              |
| Interaction, Δ = .40, control at .90                     | **80.1%**              |
| Interaction, Δ = .40, control at .95                     | **85.2%**              |
| Interaction, Δ = .30, control diff 0                     | **43.7%**              |
| Interaction, Δ = .20, control diff 0                     | **20.8%**              |
| Interaction, both diffs .30 (a true general form effect) | **5.8%**               |

So the 84% figure is approximately right only in the best case — a .40 difference with the control at .95 — which is precisely the region where the bootstrap degenerates (objection 9). At a mid-range control it falls to ~67–72%, at a .30 interaction to ~44%, and at .20 to ~21%. The registration never states which effect size the interaction is powered for, so a reader is invited to carry the 84% label onto a statistic it does not describe.

§6 row 3 then says: “Interaction CI includes 0 and cells 1–2 do not differ → **No evidence at n = 30** → **Close the routing benchmark; record the lead as noise; move to capability**” ([prereg:85](2026-11-12-routing-closing-round-preregistration.md:85)). Under a true .30 effect the interaction is null about 56% of the time. When the C1–C2 contrast is also null — the only case row 3 admits — the programme closes its own lead on a false negative and calls it the pre-committed reading. When C1–C2 differ, as they usually will under a true effect, row 3 does not fire and the outcome matches no row at all (objection 2). Both branches are failure modes: a false closure or an unreadable run.

The log's parallel statement — “the .20-versus-.80 contrast still reaches ~96% power at n = 20” ([log:312](../research/modes-experiment-log.md:312)) — is arithmetically right (I get 96.1%) and equally irrelevant to the interaction.

**What would fix it (smallest).** Two sentences and no new calls: (a) add a minimum detectable effect statement to §5/§7 — “at n = 30 the interaction has 44% power against .30 and 21% against .20” — and (b) rewrite row 3's consequence to “**inconclusive; the lead is neither confirmed nor closed**.” If the maintainer wants 80% power at .30, the honest requirement is ~90 draws per cell (~1,080 calls, ~3× the budget); if the budget is fixed, the design should be labelled a pilot and row 3 must lose its closure consequence.

**Registered material?** Yes — §5, §6, §7.

---

### 2 — FATAL: §6 is non-exhaustive, overlapping, and still keyed to the four-cell names; the “general form effect” row is unreachable

**What is wrong.** Three distinct defects in one frozen table ([prereg:83-88](2026-11-12-routing-closing-round-preregistration.md:83)):

**(a) Stale identifiers.** A1.8 says “the six readings of §6, with C1 and C2 taking the place of the old cells 1 and 2, and C5/C6 the place of the old control pair” ([prereg:190](2026-11-12-routing-closing-round-preregistration.md:190)). But §6 row 1 says “cells 1–2 differ, **cells 3–4 ≈ equal**” ([prereg:83](2026-11-12-routing-closing-round-preregistration.md:83)). Under the old design cells 3–4 _were_ the control pair; under the new design the control pair is C5/C6, and C3/C4 are two **ambiguous** factorial cells that did not exist before. A1.8 does not say what replaces “cells 3–4.” Read literally, row 1 now requires C3 ≈ C4 — a third ambiguous contrast — not the control. That is a different test.

**(b) Row 2 is logically unreachable for the effect it names.** Row 2 says “Interaction CI excludes 0; all four cells differ in the same direction → **General form effect**” ([prereg:84](2026-11-12-routing-closing-round-preregistration.md:84)). A general form effect means the verb–noun difference is similar on both briefs, so the interaction is ≈ 0. Requiring the interaction CI to exclude 0 contradicts the reading. My enumeration confirms it: when both diffs are .30, the interaction is 0 and the chance of the CI excluding 0 is 5.8% — the nominal size. Row 2 can only fire for a _non-general_ pattern (both same direction, unequal sizes), which is not what its label says. “All four cells” is also undefined once there are six.

**(c) No precedence and a dead band.** Rows 1 and 2 can co-fire when the control difference is small but nonzero; rows 3 and 5 can co-fire (abstention differs while selection does not); row 6 can co-fire with anything; row 4 conflicts with row 3 on a small reversal. And the most likely outcome under a true conditional effect that misses the interaction threshold — interaction CI includes 0, C1 vs C2 differ by .25, C5 vs C6 ≈ 0 — matches **no row**: row 3 requires C1–C2 not to differ, row 2 requires the CI to exclude 0, row 4 requires C1 > C2. This is the same species as the prior round's §3 table, where 56.8% of null outcomes matched no row (see [B3 red team:98-115](2026-11-11-b3-isolation-red-team.md:98)).

**What would fix it.** Rewrite §6 with explicit C1–C6 names, a pre-committed precedence list, an explicit “indeterminate” row for the near-miss band, and the general-form reading conditioned on the two **contrasts** (both nonzero, same direction) rather than on the interaction CI. This is text-only.

**Registered material?** Yes — §6.

---

### 3 — FATAL: the control pair is not a single-field manipulation, so the interaction is not estimable

**What is wrong.** The primary claim is (C2 − C1) − (C6 − C5) ([prereg:160](2026-11-12-routing-closing-round-preregistration.md:160)). The two halves are not the same manipulation:

| Pair    | What differs between the cells                                          | Measured                                                                                                                                                                                                                                             |
| ------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1 → C2 | slug and Name only; the routing line is held at the **constraint** form | line = 96 chars in both                                                                                                                                                                                                                              |
| C5 → C6 | slug, Name, **and the entire routing line**                             | `debug` line = 97 chars, `bug-report` line = 81 chars; common prefix = 49 chars; the deliverable clause changes from “produce a reproduction and a named root cause” to “produce evidence, not a guess”; punctuation changes from colon to semicolon |

C5's line is “Use when something fails and the cause is unknown: produce a reproduction and a named root cause.” ([axis-stance.roomodes:78](../../test-fixtures/frames/axis-stance.roomodes:78)); C6's is “Use when something fails and the cause is unknown; produce evidence, not a guess.” ([artefact.roomodes:105](../../test-fixtures/frames/artefact.roomodes:105)). The registration _requires_ byte-identity to each fixture ([prereg:144-145](2026-11-12-routing-closing-round-preregistration.md:144)), so the difference is guaranteed, not accidental.

So (C6 − C5) measures form **plus** an uncontrolled wording change; (C2 − C1) measures form alone. Subtracting one from the other does not yield “the form effect on an ambiguous brief minus the form effect on an unambiguous one.” It yields that, plus a nuisance term of unknown size and sign. The hypothesis is explicitly about the _form of the name_ ([prereg:24](2026-11-12-routing-closing-round-preregistration.md:24)), so the confound attacks the claim's meaning, not just its precision.

**What would fix it.** Specify that the `bug-report` control cell uses **`debug`'s own routing line, verbatim, with only slug and Name changed** — mirroring exactly how C2 is built from C1. Zero extra calls; one sentence in §A1.2 plus a builder assertion. Cost: C6 is no longer a replication of E11's artefact entry, which should be stated.

**Registered material?** Yes — §A1.2 and the fixture assertion.

---

### 4 — SERIOUS (fatal to Amendment 1's stated purpose): the “plain” line is not constraint-free, so the factorial does not separate register from constraint

**What is wrong.** Amendment 1 was filed to “add the two arms that separate register from constraint” ([prereg:120](2026-11-12-routing-closing-round-preregistration.md:120)), and A1.5 claims “the two extra arms were requested to separate register from constraint. As a factorial they answer that” ([prereg:174](2026-11-12-routing-closing-round-preregistration.md:174)). They do not. The two lines are:

- constraint: `Use when someone asks why code behaves as it does and the answer must cite evidence, not recall.` (96 chars)
- plain: `Use when someone asks why code behaves as it does and evidence must be cited.` (77 chars)

**Both require evidence citation.** The difference is active/agentive + negative contrast (“the answer must cite evidence, not recall”) versus passive requirement (“evidence must be cited”). That is a _form-of-constraint_ contrast, not a _presence-of-constraint_ contrast. The registration's own §8 threat 3 says “Cell 1's line carries a constraint … and cell 2's does not” ([prereg:104](2026-11-12-routing-closing-round-preregistration.md:104)) — which is false on its own text, and was already false in the four-cell version. A1.5 inherits the error and then claims the factorial resolves it.

Consequence: the “line main effect” is not a constraint effect; the register × line interaction is not a “register × constraint” interaction; and the maintainer's request is not answered. The primary interaction (C2 − C1) − (C6 − C5) does **not** use C3/C4, so this does not invalidate the primary claim — but it invalidates the reason the extra 120 calls were bought, and it leaves a false reassurance in §8.

**What would fix it (smallest).** Make the plain line genuinely plain — `Use when someone asks why code behaves as it does.` — a one-line text change, no extra calls. That restores the 2×2's meaning, at the cost that C4 is no longer close to the E11 artefact entry (A1.6 already abandons the catalogue comparison). Alternative: relabel the factor as “constraint form (active prohibition vs passive requirement),” delete A1.5's claim, and restore §8 threat 3.

**Registered material?** Yes — §A1.2, §A1.5, §8.

---

### 5 — SERIOUS: the replication rule is non-exhaustive, gives the replication no veto, and confounds model with time

**What is wrong.** A1.4 fixes: “A supported primary claim requires the interaction interval to exclude zero in the DeepSeek model. A Gemini result in the opposite direction is reported as heterogeneity between models” ([prereg:170](2026-11-12-routing-closing-round-preregistration.md:170)). Four defects:

1. **Same-direction significance + null is undefined.** Gemini positive and significant while DeepSeek is null is not covered by the rule at all. That is arguably the most likely discordant case. The executor has no reading.
2. **Opposite-direction + positive can co-exist.** If DeepSeek excludes zero one way and Gemini excludes zero the other way, the claim is “supported” (DeepSeek) _and_ “heterogeneity” (Gemini). Nothing downgrades the claim.
3. **The replication cannot veto.** Gemini is called a “replication check” but has no power to withhold the claim. Cross-vendor robustness was the reason for the extra spend; as written, it is decorative.
4. **The sweeps are separate batches** ([prereg:149](2026-11-12-routing-closing-round-preregistration.md:149)), so the cross-model comparison is confounded with time. R-1's own rationale — provider drift masquerading as a cell difference ([prereg:59](2026-11-12-routing-closing-round-preregistration.md:59)) — applies with equal force to the model comparison, and the design does not apply it.

**What would fix it.** Pre-state the _reason_ for DeepSeek primary (independence from the instrument that generated the hypothesis — see §9, where I reject the self-review's claim that there is no reason), define all four concordance/discordance cases, require Gemini's sign not to contradict for a “supported” claim (not Gemini's significance — E12 makes that too costly), and interleave the two sweeps call-by-call or block-by-block with timestamps.

**Registered material?** Yes — §A1.4 and §A1.3.

---

### 6 — SERIOUS: the binary datum is under-defined, and “no scorers” hides an unregistered parser

**What is wrong.** The datum is “declared mode equals the sealed key” ([prereg:190](2026-11-12-routing-closing-round-preregistration.md:190)). The registration never defines “declared mode”: not the string that counts, not what happens when the response names several slugs, not whether an echoed line counts, not whether a truncated response counts. The repository already contains a mechanical definition set — `HELP`, `keyHit`, `nonKey`, `ambiguous` (“more than one picker slug appears; the sequence uses the last-mentioned and records the flag”) — in the E12 key ([`answer-key.json:115-120`](../../test-fixtures/frames/b3-isolation/answer-key.json:115)), and the new registration neither imports nor supersedes it. D-7 is the recorded instance of this exact seam being misread ([log:175](../research/modes-experiment-log.md:175)).

Second, “no scorers” is accurate only in the human sense. The extractor is a scorer: it decides whether a response declared a mode and which one. That decision is not frozen and not unit-tested in this registration. Removing two human scorers and installing one un-audited parser trades D-9's disagreement for D-7's silent misread.

**What would fix it.** Import the E12 key's mechanical definitions verbatim into §5, freeze the parser, and add unit tests on synthetic transcripts (a declaration, an echo, a multi-slug list, an empty response, a truncated response). This is a text-plus-test change, no model calls.

**Registered material?** Yes — §5's outcome definition.

---

### 7 — SERIOUS: R-5 specifies four labels for a six-cell design, and C1/C2 collide with the E12 key

**What is wrong.** R-5 says “Labels `CELL-1` … `CELL-4` assigned by hash, mapping sealed” ([prereg:63](2026-11-12-routing-closing-round-preregistration.md:63)). Amendment 1 defines **six** cells, C1–C6 ([prereg:130-133](2026-11-12-routing-closing-round-preregistration.md:130)), and A1.7 adds R-6–R-8 without updating R-5. Worse, the letters collide across documents: in the E12 key, **C1 = `debug` on B1** and **C2 = `explain` on B3** ([`answer-key.json:11-16`](../../test-fixtures/frames/b3-isolation/answer-key.json:11), [`answer-key.json:62-67`](../../test-fixtures/frames/b3-isolation/answer-key.json:62)); in E13-R, **C1 = `explain` on the ambiguous brief** and **C2 = `explanation`**. The E12 key even records the collision as a known hazard: “Amendment 2 §A2.5 lists `explain` for C1 as well; that is inconsistent with C1 carrying B1” ([`answer-key.json:16`](../../test-fixtures/frames/b3-isolation/answer-key.json:16)). Re-using C1–C6 in the next registration makes a wrong-key scoring pass easy and silent.

**What would fix it.** Update R-5 to six labels and use names that cannot collide with E12 — e.g. `AMB-VC`, `AMB-NC`, `AMB-VP`, `AMB-NP`, `UNA-V`, `UNA-N`.

**Registered material?** Yes — R-5.

---

### 8 — SERIOUS: `deepseek-chat` is a moving alias, not a pinned model

**What is wrong.** §3 says “the same pinned model” is fixed across all cells ([prereg:39](2026-11-12-routing-closing-round-preregistration.md:39)). That is true for `gemini-3.5-flash`, which is versioned. It is not established for `deepseek-chat`, which is an alias: the provider resolves it to the current model generation and can change the underlying weights without changing the string. R-7 checks that the id exists ([prereg:185](2026-11-12-routing-closing-round-preregistration.md:185)); existence is not pinning. R-8 records “model id” ([prereg:186](2026-11-12-routing-closing-round-preregistration.md:186)), but if the API returns the alias, the record is circular.

**Evidence level.** LIKELY, from the known behaviour of the DeepSeek API; no network was used, so this is not verified in-repo.

**What would fix it.** Record the _resolved_ model version from the response metadata, not just the requested id; pin a dated id if the endpoint offers one; and state in §8 that cross-vendor results are reproducible only within the alias's lifetime.

**Registered material?** Yes — §3 and R-8.

---

### 9 — SERIOUS: the bootstrap degenerates where the control cells are expected to live, and “bootstrap governs” is backwards

**What is wrong.** The interaction is estimated with a percentile bootstrap over draws within cells ([prereg:68](2026-11-12-routing-closing-round-preregistration.md:68)), and if it disagrees with a logistic interaction the bootstrap governs ([prereg:71](2026-11-12-routing-closing-round-preregistration.md:71)). But the control cells are expected at or near ceiling: E11's control pair was 5/5 in both arms ([log:212-213](../research/modes-experiment-log.md:212)), and the four unambiguous cells were 20/20 concordant ([log:236-241](../research/modes-experiment-log.md:236)). At a true rate of .97, P(all 30 draws identical) = 40.1%; at .95, 21.5%; at .99, 74.0%. In those runs every bootstrap resample of the control cell is identical, the control difference has zero variance, and the interaction interval is just the ambiguous contrast's interval — too narrow, because the control's true uncertainty is invisible.

So the design has a choice between two bad outcomes: if the control has variance, the interaction's power is ~44% at .30; if the control is at ceiling, the bootstrap reports a false precision. The logistic model is the estimator that behaves correctly here, and the registration subordinates it to the one that fails.

The clustering check has the same shape: R-3 asks for the longest run and the duplicate rate “beyond chance” ([prereg:61](2026-11-12-routing-closing-round-preregistration.md:61)) but attaches no action, and §8.1 concedes the interval “may be too narrow” ([prereg:102](2026-11-12-routing-closing-round-preregistration.md:102)).

**What would fix it.** Pre-commit an add-2 / Agresti–Coull correction or a logistic cell × brief interaction as the **primary** interval; report the fraction of cells with zero variance; and attach a consequence to R-3 (e.g., if the longest within-cell run exceeds 5 or the duplicate rate exceeds 20%, the interval is not reported as an interval and the round is “clustered, not estimable at this n”).

**Registered material?** Yes — §5, R-3, §8.1.

---

### 10 — SERIOUS: the log's §11 was not amended, so the programme has two sources of truth

**What is wrong.** The log's §11 is titled “the statistical decisions” and still says “Four cells at n = 30” ([log:310](../research/modes-experiment-log.md:310)), still explains the four-cell readings ([log:318-327](../research/modes-experiment-log.md:318)), and still quotes the single-contrast power figure ([log:312](../research/modes-experiment-log.md:312)). It does not mention the second model, the 2×2 factorial, or the primary-claim designation. The registration's own document history says Amendment 1 was filed ([prereg:197](2026-11-12-routing-closing-round-preregistration.md:197)). A reader following the log — which the task treats as the record — would run the wrong design. This is the D-2 species: directing a task with a rule that does not match the material.

**What would fix it.** Mark log §11 superseded, point it at Amendment 1, and restate the six-cell readings there; or make §11 explicitly a historical entry.

**Registered material?** No — it is the log, not the registration. But it must be fixed before the run.

---

### 11 — SERIOUS: the instrument-fault gate is unexecutable under “no peeking,” and `finishReason` is recorded but not enforced

**What is wrong.** §6 row 6 says “Either control cell below 4/5 selection → **Instrument fault** → Discard the batch” ([prereg:88](2026-11-12-routing-closing-round-preregistration.md:88)). But the design also says “no peeking until all 360 calls complete” ([prereg:190](2026-11-12-routing-closing-round-preregistration.md:190)), and the draws are interleaved. So the fault is only readable after the full spend; the “discard the batch” rule cannot save anything. The gate also has no prior for DeepSeek: at a true control rate of .85 the probability of falling below 24/30 is 15.3%; at .90 it is 2.6%; at .95 it is 0.1%. A perfectly good DeepSeek batch dies one run in seven at .85.

Separately, R-4 records `finishReason` “so truncation … must be visible” ([prereg:62](2026-11-12-routing-closing-round-preregistration.md:62)) but no rule excludes a non-`STOP` or empty run from the denominator. That is the exact defect the prior round called FATAL — “`MAX_TOKENS` is recorded and never enforced” ([B3 red team:316-326](2026-11-11-b3-isolation-red-team.md:316)). A truncated response with exit 0 is scored.

**What would fix it.** (a) Allow a narrow, pre-registered instrument-health peek — `finishReason`, empty response, HTTP error only, never the declared mode — so a dead endpoint stops the run early. (b) Set the gate from a measured control rate or a Wilson lower bound rather than a bare 4/5. (c) Add: “any run with `finishReason ≠ STOP`, or with an empty/unparseable transcript, is INVALID and excluded from the denominator; the count is reported per cell.”

**Registered material?** Yes — R-4 and §6 row 6.

---

### 12 — MINOR: “Type I ≈ 1.7%” is unsourced and conditioning-dependent

**What is wrong.** §5 says Fisher is “conservative here (measured Type I ≈ 1.7% at n = 30)” ([prereg:75](2026-11-12-routing-closing-round-preregistration.md:75)). I enumerated the two-sided Fisher test at n = 30 per arm under p = .5: the **unconditional** size at α = .05 is **2.74%**. Conditional sizes at fixed margins (rows 30/30) range from 1.27% (col1 = 20) to 1.94% (col1 = 30), so 1.7% is plausible for some margins but not for the design as a whole. The direction of the claim (conservative) survives; the number does not, as stated.

**What would fix it.** State the conditioning, or delete the number and say “conservative under the margins this design fixes.”

**Registered material?** Yes — §5.

---

### 13 — MINOR: R-1 and §7 still describe the four-cell design

**What is wrong.** R-1 says “Interleave the 120 calls across the four cells” ([prereg:59](2026-11-12-routing-closing-round-preregistration.md:59)) and §7's cost table is the four-cell table ([prereg:94-98](2026-11-12-routing-closing-round-preregistration.md:94)). A1.3 and A1.7 add the second model and two runners but do not update R-1 or §7. Also, A1.1's claim that “a cell difference cannot be produced by neighbour count, list length or **byte density**” ([prereg:124](2026-11-12-routing-closing-round-preregistration.md:124)) is false at the entry level: the target line is 96 chars in C1/C2 and 77 in C3/C4, and 97 vs 81 in the control pair.

**What would fix it.** Update R-1 and §7 to 360 calls / six cells / two runners, and narrow the byte-density claim to “list length and neighbour count” (or add a line-length covariate).

**Registered material?** Yes — R-1, §7, §A1.1.

---

### 14 — MINOR: no retry or rate-limit semantics

**What is wrong.** R-4 records usage but not attempts ([prereg:62](2026-11-12-routing-closing-round-preregistration.md:62)). A rate-limited DeepSeek endpoint will retry; a retried call is a second draw from the same prompt, so it both duplicates the denominator and correlates with the failed attempt. The design says nothing about whether retries count, are excluded, or are modelled. This is the D-6 species (instrument orchestration error) waiting to recur on a new endpoint.

**What would fix it.** Record `attempt` per run; pre-commit that only the first successful attempt counts and that retried draws are reported separately; state the retry cap and the behaviour on exhausting it.

**Registered material?** Yes — R-4.

---

### 15 — MINOR: R-3's clustering metrics are undefined

**What is wrong.** “Longest run of identical consecutive outputs within each cell” ([prereg:61](2026-11-12-routing-closing-round-preregistration.md:61)) is ambiguous under round-robin interleaving: it can mean consecutive in the cell's subsequence or consecutive in wall-clock order. The first conflates within-cell homogeneity with temporal clustering; the second is what caching would produce. “Beyond chance” has no null model.

**What would fix it.** Define both: the longest run in the cell's draw-index subsequence, and the lag-1 autocorrelation of outcomes by wall-clock index; and compare the duplicate count to a simulated iid-Bernoulli null at the cell's observed rate.

**Registered material?** Yes — R-3.

---

## 5. Pre-mortem: it is twelve months later and this failed

**Story A — the rule was silent on the case that happened.** The round ran. DeepSeek's interaction interval included zero; Gemini's excluded zero in the predicted direction. A1.4 covers only “a Gemini result in the opposite direction” ([prereg:170](2026-11-12-routing-closing-round-preregistration.md:170)); it has no reading for same-direction significance with a null primary. The maintainer read Gemini as the replication succeeding and shipped the naming rule. A third-vendor run eight months later found nothing. The root cause was objection 5's non-exhaustive rule, not the data.

**Story B — the bootstrap was confidently wrong.** Both control cells returned 30/30. The bootstrap had no control variance, so the interaction interval was just the ambiguous contrast's interval. C1 vs C2 was .45 vs .65; the interval excluded zero; the “hypothesis supported” row fired and the naming rule entered the catalogue. A later run with a non-ceiling control showed the interaction was within noise. The root cause was objection 9: the design chose the estimator that is invalid exactly where its controls are expected to be.

**Story C — the near-miss had no row.** The interaction interval included zero. C1 vs C2 was .40 vs .65; C5 vs C6 was .95 vs .95. No §6 row matched: row 3 required C1–C2 not to differ, row 2 required the interval to exclude zero, row 4 required C1 > C2. The report inventing a reading post hoc was the end of the programme's pre-registration discipline. The root cause was objection 2's dead band.

**Story D — the labels were reused.** An executor scored E13-R's C1 (`explain`) against the E12 key's C1 (`debug`) and got 0/30. The report concluded the verb form was catastrophic; a reader spotted the collision months later. The root cause was objection 7.

**Story E — the vendor moved.** `deepseek-chat` resolved to a newer generation between registration and run. The “heterogeneity between models” was a version change. The root cause was objection 8.

**Story F — the budget died at the gate.** The DeepSeek control cell returned 23/30 at a true rate of .85. Because peeking was forbidden, the fault was discovered after 360 calls; the batch was discarded and the budget was gone, with no information about the treatment. The root cause was objection 11.

---

## 6. Weakest link and seams

**Weakest link: the control pair (C5/C6).** It is the only part of the primary estimand that is not a controlled manipulation (objection 3), it is the part with no prior on the cross-vendor model (objection 11), and it is the part most likely to sit at a boundary where the bootstrap fails (objection 9). Three independent failure modes converge on the same two cells.

**Seams most likely to break first:**

1. **Treatment factorial ↔ control pair.** One holds the line fixed; the other does not. This is a boundary between two different experimental structures inside one claimed difference-of-differences.
2. **Registration ↔ log.** §11 still describes four cells; the registration describes six (objection 10). Two sources of truth is how D-2 recurs.
3. **E13-R ↔ E12 key.** C1/C2 mean different things in the two documents, and the only mechanical definitions of the datum live in the older one (objections 6, 7).
4. **Estimator ↔ boundary.** The bootstrap is the registered primary interval, and the control's expected location is the one place it is invalid (objection 9).

---

## 7. What the design gets right

These should survive any rewrite; a future reviewer who wants to start over should have to argue against them.

1. **One base picker, one rewritten entry.** This is the single most important structural control: list length and neighbour count are held, so a cell difference cannot be an artefact of list shape. (The byte-density clause is overstated — objection 13 — but the structural instinct is right.)
2. **A scorer-free mechanical key.** With the key being the target entry itself, the datum is trivial to compute and immune to D-9-style disagreement — _provided_ the parser is frozen (objection 6). The direction is right even though the execution is incomplete.
3. **Two-sided tests.** The reasoning at [prereg:73](2026-11-12-routing-closing-round-preregistration.md:73) is sound: the direction comes from the same observations, the control shows it can vanish, and a reversal should be visible rather than discarded. This is a genuine improvement on the programme's earlier one-sided habits.
4. **The correction that Fisher does not test interactions** is recorded honestly ([log:316](../research/modes-experiment-log.md:316)), and the bootstrap step was added because of it. That is the deviation discipline working.
5. **Pre-committed readings and no peeking.** The discipline is right even though the table needs repair. Optional stopping would invalidate the intervals.
6. **The factorial replaces a first-match sequence.** Two extra arms were requested; a 2×2 estimates both main effects and their interaction from the same calls. That is the right way to spend the extra budget.
7. **The falsifiers in §9 are unusually good** — interleaving, abstention reporting, control-brief ambiguity, bootstrap resampling level ([prereg:110](2026-11-12-routing-closing-round-preregistration.md:110)) — even though they do not include the control-line confound or the plain-line constraint.
8. **The cross-vendor model was added for the right reason** — same-family agreement would not support the claim the extra spend is meant to buy. The defect is how the replication is used, not why it is there.
9. **D-8 is recorded against the author** ([log:176](../research/modes-experiment-log.md:176)), and the log separates “what the code path does” from “what was observed.” That is what makes this review possible.
10. **R-2 and R-3 are the right instincts.** Abstention as a first-class outcome and a clustering check are exactly what the prior round's findings demand; they need completion, not replacement.

---

## 8. The single most damaging objection, and the smallest neutralising change

**The control pair does not hold the routing line constant, so the primary interaction compares a clean manipulation with a contaminated one (objection 3).**

(C2 − C1) changes slug and Name while the line stays at 96 characters. (C6 − C5) changes slug, Name, the deliverable clause, the punctuation, and 16 characters of routing line. Their difference is therefore not “the name-form effect on an ambiguous brief minus the name-form effect on an unambiguous one”; it is that plus an uncontrolled wording difference of unknown size and sign. This is the highest-risk finding (125) and it cannot be repaired at analysis time, because both cells will already have been run.

**Smallest change that neutralises it:** one sentence in §A1.2 — _the `bug-report` control cell uses `debug`'s routing line, verbatim, with only slug and Name changed_ — plus the builder assertion that enforces it. Zero extra calls. It costs the E11 artefact-entry replication for C6, which should be stated in §8.

I rank this above the power defect (objection 1) only because it destroys the _meaning_ of the primary statistic, while objection 1 destroys its _reliability_. Both are fatal to the claim; objection 3 has the smaller fix and is the one I would insist on first.

---

## 9. The self-review: which objections I reject, and what it missed

I read [`2026-11-12-routing-closing-round-red-team.md`](2026-11-12-routing-closing-round-red-team.md:1) only after writing §0–§8. It is a good review — it catches the control confound (O-1), the clustering-without-action (O-3), the binary datum (O-4), and the line confound (O-6), and its verdict matches mine. But it is a self-review, and three of its objections are weaker or wrong in ways that matter.

### 9.1 Objections I reject

**O-2 — I reject the premise, though not the conclusion.** O-2 says “nothing justifies preferring DeepSeek a priori — it was chosen to _strengthen_ the claim, not as the more trustworthy instrument” ([self-review:42](2026-11-12-routing-closing-round-red-team.md:42)). There **is** a principled reason: Gemini is the instrument that generated the hypothesis (E11, E12), so it is not an independent test of it. A fresh vendor is the right confirmatory instrument, and pre-registering it as primary avoids the circularity the programme has been trying to escape. The asymmetry is defensible _if it is stated_; what is indefensible is the rule's non-exhaustiveness and the absence of a sign-concordance requirement. O-2's proposed fix — require the interval to exclude zero with the same sign in **both** models — over-corrects: E12 measured Gemini's instability at roughly two abstentions in three ([log:281](../research/modes-experiment-log.md:281)), so requiring Gemini significance would make the claim nearly untestable for a reason unrelated to the hypothesis. The right fix is: state the independence rationale, require Gemini's **sign** not to contradict (not its significance), and define all four discordance cases.

**O-5 — I reject the target.** O-5 says the **register × line interaction** is underpowered ([self-review:64](2026-11-12-routing-closing-round-red-team.md:64)). That is true, but it is the _secondary_ estimate, and the registration already calls it “secondary and descriptive only” ([prereg:162](2026-11-12-routing-closing-round-preregistration.md:162)). Underpowering a quantity you have labelled descriptive is not a defect. The real defect is that the **primary** interaction is underpowered (43.7% at .30), and the registration's 84%/100% power figures are single-contrast figures. By aiming at the secondary interaction, O-5 lets the primary power claim stand — and item 6 of its “what the design gets right” then praises the power computation (“Power was computed before n was chosen,” [self-review:106](2026-11-12-routing-closing-round-red-team.md:106)) that was computed for the wrong statistic.

**O-6 — I reject its factual content.** O-6's table says the plain line contains “neither” a constraint nor a negation, and gives lengths 103 and 84 ([self-review:76-81](2026-11-12-routing-closing-round-red-team.md:76)). Both are wrong. The plain line is 77 characters and **does** contain a constraint: “evidence must be cited.” The constraint line is 96 characters. The delta (19) is right; the absolutes are not. The correct objection is stronger than O-6's: the factorial does not separate constraint _presence_ at all — it separates two forms of the same constraint (active prohibition vs passive requirement). O-6 is right that negation and length are confounded, but wrong about what the “plain” line contains, and therefore misses the failure of A1.5's stated purpose (objection 4).

**“What the design gets right,” item 2 — I reject the byte-density claim.** It says “neighbour count, list length and byte density are all held constant” ([self-review:102](2026-11-12-routing-closing-round-red-team.md:102)). Neighbour count and list length are held; byte density is not. The target line is 96 vs 77 characters in the ambiguous pair and 97 vs 81 in the control pair, so the prompt's byte count moves by design. The claim is true at the list level, false at the entry level.

**“What the design gets right,” item 6 — I reject the inference.** “Power was computed before n was chosen, and the moderate-effect column was included” ([self-review:106](2026-11-12-routing-closing-round-red-team.md:106)). True, and irrelevant: the column is for a single contrast, not for the registered interaction. Praising it invites the reader to skip the only power check that matters.

### 9.2 What the self-review missed

1. **The primary interaction's power** (43.7% at a .30 effect; 20.8% at .20; 67–85% even at the .40 difference §7 assumes) and the false-negative consequence of §6 row 3. This is the most important miss.
2. **§6's non-exhaustive/overlapping structure**, the stale “cells 3–4” identifier, the dead band, and row 2's unreachable condition.
3. **The “plain” line still constrains** — it asserts the opposite in O-6.
4. **R-5's four labels for six cells**, R-1's “120 calls / four cells,” and §7's four-cell cost table.
5. **The C1/C2 label collision with the E12 key** and the key's warning about it.
6. **The E12 key's mechanical definitions** (`HELP`, `keyHit`, `nonKey`, `ambiguous`) are not imported, and “no scorers” hides a parser.
7. **`deepseek-chat` is a moving alias**, not a pinned model; it treats the id only as a 404 risk.
8. **The two sweeps are separate batches**, so the model comparison is confounded with time — the design's own R-1 rationale, unapplied.
9. **Bootstrap boundary degeneracy** — P(all 30 identical | p = .97) = 40.1%; the control is expected there.
10. **The replication rule's non-exhaustiveness** — Gemini positive + DeepSeek null is undefined; Gemini opposite + DeepSeek positive can co-exist.
11. **The log's §11 is stale** — two sources of truth.
12. **`finishReason` is recorded but not enforced** — a repeat of the prior round's FATAL finding.
13. **The instrument-fault gate is unexecutable under no-peeking**, and at a true control rate of .85 it discards 15.3% of good batches.
14. **“Type I ≈ 1.7%”** is conditional-dependent; the unconditional size is 2.74%.
15. **Retry/rate-limit semantics** are absent.
16. **R-3's clustering metrics are undefined** (“consecutive,” “beyond chance”).

### 9.3 Where I agree with the self-review

O-1 (control confound) is correct and is the top finding; I independently measured the same lines and reached the same fix. O-3 (clustering check without action) is correct; my objection 9 extends it to the bootstrap boundary. O-4 (binary datum discards abstention) is correct; objection 6 makes the missing definition explicit. O-7 (abstention undefined) is correct; objection 6 notes that a definition already exists in the E12 key and was not imported. Its verdict and its honesty about being a self-review are both right.

---

## 10. D-1…D-10 species audit

| Deviation | Species                                                      | Does E13-R repeat it?                                                                                                                        | Where                                                                                                                                                                                          |
| --------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-1       | Estimate asserted as measurement                             | **Yes, mildly.** The 2,228-token cost is Gemini's measured mean applied to DeepSeek; the “1.7% Type I” is unsourced.                         | [prereg:96](2026-11-12-routing-closing-round-preregistration.md:96), [prereg:75](2026-11-12-routing-closing-round-preregistration.md:75)                                                       |
| D-2       | A delegated rule that does not match the material            | **Yes.** §6 still uses four-cell names; A1.8's remap is incomplete; the log §11 is stale; R-1/R-5 are stale.                                 | [prereg:83](2026-11-12-routing-closing-round-preregistration.md:83), [prereg:190](2026-11-12-routing-closing-round-preregistration.md:190), [log:310](../research/modes-experiment-log.md:310) |
| D-3       | Asserting a property of an external thing without opening it | **Yes.** `deepseek-chat` treated as pinned; “OpenAI-compatible” unverified; “byte density held” false.                                       | [prereg:39](2026-11-12-routing-closing-round-preregistration.md:39), [prereg:124](2026-11-12-routing-closing-round-preregistration.md:124)                                                     |
| D-4       | A confound asserted that verification disproves              | **Yes.** “Cell 2's line does not [carry a constraint]” is false.                                                                             | [prereg:104](2026-11-12-routing-closing-round-preregistration.md:104)                                                                                                                          |
| D-5       | Substring slip (`explain`/`explanation`)                     | **Latent.** No guard is specified in E13-R; if the prior generator is reused, the bug is still there.                                        | [B3 red team:358](2026-11-11-b3-isolation-red-team.md:358)                                                                                                                                     |
| D-6       | Exit code / orchestration read wrong                         | **Latent.** A new DeepSeek runner, no retry/exit-code discipline specified.                                                                  | [prereg:184](2026-11-12-routing-closing-round-preregistration.md:184)                                                                                                                          |
| D-7       | Extraction rule misread                                      | **Yes.** “Declared mode” is undefined; the E12 key's “last-mentioned” rule is not imported.                                                  | [prereg:190](2026-11-12-routing-closing-round-preregistration.md:190), [`answer-key.json:115`](../../test-fixtures/frames/b3-isolation/answer-key.json:115)                                    |
| D-8       | Premise falsified by its own arithmetic                      | **Yes.** The power claim is for the wrong statistic; row 2 is unreachable; 56.8%-style dead bands return.                                    | [prereg:98](2026-11-12-routing-closing-round-preregistration.md:98), [prereg:84](2026-11-12-routing-closing-round-preregistration.md:84)                                                       |
| D-9       | Judgement disagreement                                       | **Addressed by construction**, but the parser is now the single unreliability point.                                                         | [prereg:190](2026-11-12-routing-closing-round-preregistration.md:190)                                                                                                                          |
| D-10      | A count misdescribed                                         | **Partly.** “Exactly one hypothesis” is contradicted by the abstention test and the metric-switch row; “one primary claim” is therefore two. | [prereg:70](2026-11-12-routing-closing-round-preregistration.md:70), [prereg:87](2026-11-12-routing-closing-round-preregistration.md:87)                                                       |

---

## 11. What I could not check, and why

- **Every claim about what a model will do.** No model call was made, as instructed. All power figures are properties of an iid-binomial model, not measurements of `gemini-3.5-flash` or `deepseek-chat`. If the draws cluster, the effective n is smaller and every power number here is optimistic.
- **The bootstrap's coverage under clustering.** I computed the boundary-degeneracy probabilities analytically and the interaction power by exact enumeration under independence; I did not run a clustered simulation, because the cluster structure is unmeasured.
- **`deepseek-chat`'s current resolved version and the `/models` response shape.** No network. R-7's check is the design's own mitigation, and it does not resolve the alias problem.
- **External precedent.** No network, so I could not look up prior art on verb-versus-noun menu labelling, tool-name selection, or provider alias behaviour. The registration's only unsourced empirical claim — “position and count effects are well documented” — was already flagged by the prior round and is not load-bearing here.
- **The harness and runner code.** I read the fixtures and the E12 key, not the E13-R runner (which does not yet exist). Whether R-1's round-robin, R-3's run-length check, and R-5's labelling are actually implemented is unverifiable until the code is written; the prior round found a recorded-but-unenforced rule, and the same failure is available here (objection 11).
- **Whether the “unambiguous” brief is unambiguous to either model.** E11's 10/10 is consistent with it ([log:212-213](../research/modes-experiment-log.md:212)), but that is n = 5 per cell and the `explain` entry is present in the same picker. The registration records this as a judgement ([prereg:105](2026-11-12-routing-closing-round-preregistration.md:105)); I accept the record and do not claim to have measured it.
- **The accuracy of the 800k-token cost.** I verified the arithmetic (360 × 2,228 = 802,080) and the provenance of 2,228 (E11's measured mean, [log:158](../research/modes-experiment-log.md:158)), but DeepSeek's tokenizer and thinking-token volume are unmeasured, so the cross-vendor half of the estimate is not checkable.
- **The two scorers' independence in the prior round.** Moot here (no human scorers), and I did not audit E12's scoring pass.
- **`.env`.** Not read, as instructed.

---

## 12. Final verdict

**AMEND BEFORE RUNNING.**

The round is a real improvement on E12: one picker, one rewritten entry, a mechanical datum, a second vendor, and pre-committed readings. It is worth the 360 calls _after_ four changes:

1. hold the control pair's line constant (objection 3);
2. rewrite §6 with explicit C1–C6 names, a precedence list, an indeterminate row, and a general-form reading conditioned on the contrasts (objection 2);
3. state the interaction's true power (43.7% at a .30 effect; 67–85% at the .40 difference §7 assumes) and remove the “close the benchmark” consequence from a null (objection 1);
4. make the plain line genuinely plain, or relabel the factor and restore §8 threat 3 (objection 4).

The remaining serious objections — the replication rule, the parser, the labels, the alias, the boundary bootstrap, the log, the fault gate — should be fixed in the same amendment; none requires a new model call. If the first four are not fixed, the round should not run: it would produce a pre-printed results section that its own arithmetic cannot reach.
