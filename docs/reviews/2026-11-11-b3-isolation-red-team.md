# Red-team review — B3 isolation (E12), before the run

| Field                    | Value                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Object under review**  | [`2026-11-11-b3-isolation-preregistration.md`](2026-11-11-b3-isolation-preregistration.md), its Amendment 1, the six fixtures in [`test-fixtures/frames/b3-isolation/`](../../test-fixtures/frames/b3-isolation/IMPLEMENTATION-NOTES.md:1), and the harness that would execute it                                                                                                                                      |
| **Question asked of me** | Can this experiment answer the question it claims to answer?                                                                                                                                                                                                                                                                                                                                                           |
| **Method**               | Read the registration, the prior log, the notes, the fixtures and the harness; re-derived every fixture by diff/`cmp`/`sha256`; re-ran the dry run and the fixture tests; re-computed the pattern table's behaviour under its own null by exact enumeration; attempted the bundle path end to end on a synthetic run directory. **No model call was made. No network was used. No file in the instrument was edited.** |
| **Date**                 | 2026-11-11                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Verdict**              | **AMEND BEFORE RUNNING**                                                                                                                                                                                                                                                                                                                                                                                               |

---

## 0. Verdict and why

**AMEND BEFORE RUNNING.**

The experiment is worth running and is closer to sound than most designs that reach a red team. The material is honestly derived, the brief really is held constant, the projection really is three fields, and the logistics of blinding are a genuine improvement on E11.

But the pre-committed reading in §3 cannot do the job it is registered to do, and that defect is in frozen material. Under the experiment's own null hypothesis — every cell routing at the pooled B3 rate of 1 in 2 — the pattern table, by exact enumeration:

- closes correctly as H0 in **18.8%** of outcomes;
- matches **no row at all** in **56.8%** of outcomes (mostly because an arm landing on exactly 3/5 is unreadable);
- matches **two or more rows** in **4.1%**;
- produces **exactly one causal attribution in 20.4%** — spread M 7.6, X 6.0, S 3.1, L 3.1, N 0.6.

A procedure that names a single cause roughly one time in five _when there is no cause_ is not a decision rule; it is a lottery with a pre-printed results section. That is fixable, but not by editing the harness.

Three objections below are likewise frozen-material defects (A4's paraphrase, A3's stand-in for "size", and the absence of a placebo arm), and four are code defects that do not need a new registration (the shipped rubric is not Amendment 1's rubric; `MAX_TOKENS` is not enforced; two contradictory scoring rules are in one bundle; the bundle's default path sits one directory below the sealed map). The split is why the verdict is _amend_, not _harden_: the code defects alone would merit HARDEN FIRST, and the table defects alone would merit DO NOT RUN only if they were unfixable — they are fixable, cheaply, without new fixtures or new model calls.

---

## 1. What the design assumes, and where I attacked it

Restated in one sentence: _six material variants of one picker plus two controls, five persona directives each, are meant to show which single property of the picker caused E11's 1/5 versus 4/5 routing difference on brief B3._

| Assumption                                                                                                                                       | Status after review                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| "The brief is held byte-identical across arms wherever the arm is not about the brief" ([reg:30](2026-11-11-b3-isolation-preregistration.md:30)) | **CONFIRMED.** Header hashes are identical across A0/A1/A2/A3/A5/C2; only A4 and C1 carry their own. Measured.                     |
| "Each arm isolates one material property" ([reg:32-39](2026-11-11-b3-isolation-preregistration.md:32))                                           | **FALSE for A1, A2, A3, A4** (objections 6–8). True for C2 and A5 as replications.                                                 |
| "A hit rate of ≥4/5 against ≤2/5 is a readable difference" ([reg:56-65](2026-11-11-b3-isolation-preregistration.md:56))                          | **FALSE at n=5** (objections 1–4). The modal 4/5-vs-1/5 contrast has p = 0.2063.                                                   |
| "Conservation resolution cannot manufacture an effect" ([reg:94](2026-11-11-b3-isolation-preregistration.md:94))                                 | **Mis-stated** (objection 15). Downgrading depresses A0, which is _how the causal rows open_.                                      |
| "Five personas are five conditions, not five samples" ([reg:114](2026-11-11-b3-isolation-preregistration.md:114))                                | **TRUE and then contradicted by §3**, which uses 5-as-sample thresholds and an unpaired test on a paired design (objections 3, 4). |
| "The rubric is copied verbatim into both scorers' briefs" ([reg:92](2026-11-11-b3-isolation-preregistration.md:92))                              | **Technically true, substantively false**: the text both bundles receive is not Amendment 1's rubric (objection 12).               |
| "`finishReason = MAX_TOKENS` → INVALID" ([reg:104](2026-11-11-b3-isolation-preregistration.md:104))                                              | **NOT IMPLEMENTED.** Demonstrated: a truncated record is bundled and scored (objection 17).                                        |
| "C1 detects a degraded batch" ([reg:45](2026-11-11-b3-isolation-preregistration.md:45))                                                          | True in principle, weak in practice, and run last (objection 9).                                                                   |
| "The blind map stays sealed" ([reg:90](2026-11-11-b3-isolation-preregistration.md:90))                                                           | Structurally true of `bundle-A/`; false of the directory the tool puts it in (objection 18).                                       |

---

## 2. Findings table

Risk = Severity × Likelihood × (6 − Detectability). "Evidence" is CONFIRMED (measured in-repo), LIKELY (derivation shown), SPECULATIVE (hypothesis).

| ID  | Attack                                                                                     | S   | L   | D   | Risk | Evidence                     |
| --- | ------------------------------------------------------------------------------------------ | --- | --- | --- | ---- | ---------------------------- |
| 2   | §3 has no reading for the most likely outcome (3/5), and 57% of null outcomes match no row | 5   | 5   | 1   | 125  | CONFIRMED (enumeration)      |
| 4   | No contrast in §3 is inferentially distinguishable at n=5                                  | 4   | 5   | 2   | 80   | CONFIRMED (Fisher)           |
| 10  | No placebo arm and no scorer-reliability duplicate: no noise floor exists                  | 4   | 5   | 2   | 80   | CONFIRMED (absent)           |
| 12  | The shipped rubric is not Amendment 1's rubric                                             | 5   | 5   | 3   | 75   | CONFIRMED (diff)             |
| 1   | §3 rows are not mutually exclusive; no precedence rule                                     | 4   | 4   | 2   | 64   | CONFIRMED (enumeration)      |
| 5   | The measured variable is MATCH count; E11's signal was mostly abstention                   | 4   | 4   | 2   | 64   | CONFIRMED (E11 table)        |
| 6   | A4 is an undisclosed multi-feature change, not present in the registration                 | 4   | 4   | 2   | 64   | CONFIRMED (grep + arms.json) |
| 13  | Parent's MODE-X rule and task-outcome rubric contradict the bundle                         | 4   | 4   | 2   | 64   | CONFIRMED (text)             |
| 14  | No frozen answer key; A4 moves the key with the brief                                      | 4   | 4   | 2   | 64   | CONFIRMED (absent)           |
| 17  | `MAX_TOKENS` recorded, never enforced                                                      | 4   | 4   | 2   | 64   | CONFIRMED (synthetic bundle) |
| 3   | The H0 gate has 19% power at the design's own null                                         | 4   | 5   | 3   | 60   | CONFIRMED (arithmetic)       |
| 7   | A3 does not reproduce the "size" contrast it stands for                                    | 4   | 4   | 3   | 60   | CONFIRMED (bytes)            |
| 19  | Determinism untested in the registered run (k=1); repeats would be consecutive             | 4   | 3   | 2   | 48   | CONFIRMED (plan)             |
| 9   | C1 runs 31st–35th; sensitivity 66%/26% at 20%/10% degradation                              | 3   | 3   | 2   | 36   | CONFIRMED (arithmetic)       |
| 8   | A1 and A2 change two things each; A1 trips its own falsifier                               | 3   | 5   | 4   | 30   | CONFIRMED (diff)             |
| 15  | Conservative rule biases toward "unexplained", not toward the null                         | 2   | 5   | 3   | 30   | LIKELY                       |
| 18  | Bundle default output is one `..` from `plan.json` and the map                             | 3   | 3   | 3   | 27   | CONFIRMED (dry run)          |
| 20  | 89k spent unconditionally; 87% of it is contingent on A0                                   | 2   | 5   | 4   | 20   | CONFIRMED (harness)          |
| 11  | A5 called a control but has no failure rule; A0 "replication" is rate-only                 | 2   | 3   | 3   | 18   | CONFIRMED (text)             |
| 16  | Two different `echo` definitions; "never a correctness signal" unsupported                 | 2   | 2   | 3   | 12   | CONFIRMED (code)             |
| 21  | Guard/loader nits: `explanation` not in the banned list; `B3P` unvalidated; dead assertion | 1   | 3   | 4   | 6    | CONFIRMED (code)             |

---

## 3. Objections

### 1 — FATAL: the §3 rows are not mutually exclusive, and the registration gives no precedence

**What is wrong.** Four pairs and one triple can fire simultaneously, and §3 says only what to do when _no_ row matches ([reg:121](2026-11-11-b3-isolation-preregistration.md:121)), never what to do when two do.

**Evidence.** Reading the rows literally ([reg:59-63](2026-11-11-b3-isolation-preregistration.md:59)):

- M ∧ X whenever A1 ≥ 4/5 **and** A4 ≥ 4/5 — both are "one property fixed the cell"; nothing ranks them.
- L ∧ S whenever A1 ≤ 2/5 **and** A2 ≥ 4/5 **and** A3 ≥ 4/5.
- L ∧ X, S ∧ X, and the triple L ∧ S ∧ X (A1 ≤ 2, A2 ≥ 4, A3 ≥ 4, A4 ≥ 4) all fire together.

Enumeration of the table under H0 puts a multiple-row outcome at 4.1% of all outcomes — small, but concentrated exactly in the "several arms worked" case, which is the case a maintainer most wants to act on.

**What it would take to fix.** A pre-committed precedence list (M → L → S → X → N) plus an explicit statement that a second matching row is reported as "not separable at this n" rather than as a second cause.

**Registered material?** Yes — this edits §3 and is an amendment.

### 2 — FATAL: §3 is not exhaustive in the band where results will most often land

**What is wrong.** Every causal row requires A0 ≤ 2/5 and every arm threshold is ≥ 4/5 or ≤ 2/5. A result of exactly **3/5**, in A0 or in any arm, matches nothing. §3's fallback ("report as unexplained", [reg:121](2026-11-11-b3-isolation-preregistration.md:121)) turns the single most likely single-cell outcome into a null report.

**Evidence.** Exact enumeration of §3 over all 6⁶ count vectors, each arm independent at p = 0.5 (the pooled B3 rate in E11 is 5/10 — [log:240-241](../research/modes-experiment-log.md:240)):

| Outcome class           | Probability under H0 |
| ----------------------- | -------------------- |
| Row 1 fires (H0 closed) | **18.8%**            |
| No row matches          | **56.8%**            |
| Two or more rows match  | **4.1%**             |
| Exactly one causal row  | **20.4%**            |

With P(A0 = 3/5) alone at 31.3% under H0, roughly a third of runs die on the first arm. This is the same species as D-8 in the prior log ([log:176](../research/modes-experiment-log.md:176)): a reading rule registered on a premise its own arithmetic does not support.

**What it would take to fix.** Either (a) read persona-level answers instead of a dichotomised count — any change in _which_ of the five personas route correctly becomes the datum, so 3/5 is informative rather than dead; or (b) add a registered "indeterminate" reading and require A0 to be run first with a stop.

**Registered material?** Yes.

### 3 — SERIOUS: the H0 gate has 19% power, and it is the wrong test for a paired design

**What is wrong.** The gate "A0 ≥ 4/5 closes the experiment" ([reg:58](2026-11-11-b3-isolation-preregistration.md:58)) is the only protection against reading noise as a cause. Under the null it fires 18.8% of the time. Conditional on H0 being true, the experiment therefore proceeds to a causal row **four times out of five**.

Separately, the design is _paired_: the same five persona directives are used in every arm, so each arm is five matched observations against A0. §3 says a "Fisher exact test per contrast" ([reg:67](2026-11-11-b3-isolation-preregistration.md:67)) — that is an unpaired test on paired data. The matched test (McNemar, or simply reporting how many personas changed answer) is both correct and, at n=5, more honest about how little can be said.

**Evidence.** Binomial(5, 0.5): P(≥4) = 0.1875. Independently, my enumeration in objection 2 uses the independent-cells model the registration implies; the pairing would widen, not narrow, the table's variability.

**What it would take to fix.** Register the paired unit (persona-level answer, A0 vs arm) and require exact replication of A0's _pattern_ before any arm is read.

**Registered material?** Yes.

### 4 — SERIOUS: no predicted contrast is distinguishable from A0 at n=5

**What is wrong.** §2 predicts "≈4–5/5" for four arms against "1/5" for A0. That is the modal predicted contrast and it is not distinguishable from noise.

**Evidence.** Two-sided Fisher exact, computed here:

| Contrast                           | p          |
| ---------------------------------- | ---------- |
| 4/5 vs 1/5 (the modal prediction)  | **0.2063** |
| 4/5 vs 2/5                         | 0.5238     |
| 5/5 vs 2/5                         | 0.1667     |
| 5/5 vs 0/5 or vs 1/5 (the ceiling) | 0.0476     |

So even a _perfect_ treatment arm against a _perfect_ replication of E11 sits at p ≈ 0.048 **before** any multiplicity across five causal contrasts plus two controls. Nothing in the design survives correction. The registration's disclaimer — "no p-value is offered as a decision … a Fisher exact test per contrast is reported as description only" ([reg:67](2026-11-11-b3-isolation-preregistration.md:67)) — is accurate and is exactly why the table may not speak in causes ("**M** — morphology. The noun-vs-verb difference routes better.", [reg:59](2026-11-11-b3-isolation-preregistration.md:59)). The disclaimer is being used to license the claim, not to limit it.

A one-case difference at n=5 means nothing: it is the difference between four and five coin flips. A two-case difference (4/5 vs 2/5) is p = 0.52.

**What it would take to fix.** Change the inferential unit (objection 2's option (a)) or raise n by repetition (k = 3 per cell on the arms that matter). Both are amendments.

**Registered material?** Yes.

### 5 — SERIOUS: the measured variable is not the phenomenon E11 observed

**What is wrong.** E11's axis×stance B3 cell was 1 MATCH, 1 PLAUSIBLE, **3 abstentions** ([log:240](../research/modes-experiment-log.md:240), [log:222](../research/modes-experiment-log.md:222)). Three of the four "non-matches" are the model declining to choose, not choosing wrongly. The new design scores only MATCH count ([reg:56-65](2026-11-11-b3-isolation-preregistration.md:56)); `HELP` and `PLAUSIBLE` appear in the rubric ([(scorer-rubric.mjs:72-79)](../../scripts/lib/scorer-rubric.mjs:72)) but no row of §3 reads them.

Consequence: an arm that converts three abstentions into three _wrong_ selections scores 1/5 and shows "no effect"; an arm that converts one abstention into the correct owner scores 2/5 and shows "no effect". Meanwhile the programme's own headline finding, F-2, is about abstention ([log:249](../research/modes-experiment-log.md:249)) — and E12 is built so that it cannot report it.

**Evidence.** The E11 cell composition above; §3 contains no abstention term; the registration's edge-case table records `HELP` ([reg:103](2026-11-11-b3-isolation-preregistration.md:103)) but never adjudicates it.

**What it would take to fix.** Report, per arm, the triple (MATCH, PLAUSIBLE, HELP/MISS) and pre-commit that a cause is named only if the _composition_ moves in the predicted way — e.g. M predicts abstentions become MATCHes, not that they become PLAUSIBLEs.

**Registered material?** Yes (§3's outcome definition).

### 6 — FATAL: A4 is not the registered manipulation, and its material exists only in the plan file

**What is wrong.** The registration's A4 row says only "brief paraphrased to remove the verb 'Explain'" ([reg:38](2026-11-11-b3-isolation-preregistration.md:38)). The actual text exists in exactly one place in the repository — [`arms.json:63`](../../test-fixtures/frames/b3-isolation/arms.json:63) — and it is not the paraphrase described:

> `This module is structured the way it is. I want to understand the reasoning behind that.`

Against B3 ("Explain why this module is structured the way it is.") this changes **at least five things**: (i) the imperative "Explain" is deleted, (ii) the interrogative "why" is deleted, (iii) the speech act changes from imperative to desiderative, (iv) a first-person subject and a stated desire are added, (v) length rises from 56 to 91 characters. By the experiment's _own_ frozen taxonomy (Amendment 1), "I want…" is the marker of `GOAL` ([reg:139](2026-11-11-b3-isolation-preregistration.md:139)) — so B3P is a goal-framed request and B3 is not, and A4 varies framing register as well as lexical overlap. It also echoes persona P1's directive ("Say what you want to achieve…"), which is the variable another part of the programme is manipulating.

The registration anticipated exactly this ("It is a bad registration if: the paraphrase in A4 changes the task rather than the wording (check by having a third party confirm the two briefs ask the same thing)", [reg:123](2026-11-11-b3-isolation-preregistration.md:123)) — and there is no record of that check. `grep` finds A4 in the registration, in `arms.json` and in the spec's condition-order assertion, and **nowhere** in [`IMPLEMENTATION-NOTES.md`](../../test-fixtures/frames/b3-isolation/IMPLEMENTATION-NOTES.md:1). The notes justify A1 at length and A3 at length; the one arm whose registered description is a one-line sketch received no note at all.

**Evidence.** [`arms.json:60-64`](../../test-fixtures/frames/b3-isolation/arms.json:60); [`arms.json:63`](../../test-fixtures/frames/b3-isolation/arms.json:63); emitted prompt `/tmp` dry run, `A4-P1-r1.txt` line 5; `grep -rn 'A4\|paraphrase\|third party'` over the notes returns nothing.

**What it would take to fix.** Write the A4 brief _into_ the registration, and choose a paraphrase that changes only the verb (e.g. "Set out the reasons this module is arranged as it is." — no first person, no "want", same length band), then have a second reader confirm the two ask the same question.

**Registered material?** Yes, and worse: the material is currently _outside_ the registration, so "frozen" ([reg:181](2026-11-11-b3-isolation-preregistration.md:181)) does not actually reach it.

### 7 — SERIOUS: A3 does not reproduce the contrast it is meant to model

**What is wrong.** §1 defines S as "Picker size — 45 modes vs 47" and cites position **and** count effects ([reg:22](2026-11-11-b3-isolation-preregistration.md:22)). A3 tests only count, by appending — [IN-2](../../test-fixtures/frames/b3-isolation/IMPLEMENTATION-NOTES.md:54) is explicit that existing lines must not move. But the contrast being modelled, A0 → A5, moves _both_ count **and** position, and does so in the opposite direction on the byte axis.

**Evidence (measured).**

| Picker            | Modes | Picker bytes | Owner's line in the prompt |
| ----------------- | ----- | ------------ | -------------------------- |
| A0 (axis)         | 45    | 6,045        | 13                         |
| A3 (A0 + padding) | 47    | 6,287        | 13                         |
| A5 (artefact)     | 47    | **5,509**    | **20**                     |
| C2 (A0 reversed)  | 45    | 6,045        | **45**                     |

So A0 → A5 is +2 modes but **−536 bytes** and +7 lines of position; A0 → A3 is +2 modes and **+242 bytes** with position unchanged. Whatever "size" did in E11, A3 changes the second component in the opposite direction and none of the first. If A3 ≥ 4/5 the honest reading is "adding two plausible modes at the end helped", which is not the S hypothesis and is not obviously generalisable. If A3 ≤ 2/5, S is **not** refuted, only untested.

The position component is not isolated by any arm: C2 reverses all 45 blocks at once (owner moves from line 13 to line 45), so it confounds recency, primacy, adjacency and count-symmetry simultaneously.

**Evidence.** `pickerTextFor` byte counts and prompt line indices from the dry run at `/tmp/rt-b3/prompts/`; [`IMPLEMENTATION-NOTES.md:83-90`](../../test-fixtures/frames/b3-isolation/IMPLEMENTATION-NOTES.md:83) (append-only rationale); [`IMPLEMENTATION-NOTES.md:172-176`](../../test-fixtures/frames/b3-isolation/IMPLEMENTATION-NOTES.md:172) (C2 = exact reversal).

**What it would take to fix.** One extra condition that moves the owner to position ~20 of 45 with no other change (e.g. moving `explain` to the middle of the axis picker, padding nowhere). That is a seventh arm — a new registration — or S must be dropped from the candidate set.

**Registered material?** Yes.

### 8 — SERIOUS: A1 and A2 each change two things, and A1 trips the registration's own falsifier on a plain reading

**What is wrong.** A1 is registered as "`explain` renamed to `explanation`; **route line unchanged**" ([reg:35](2026-11-11-b3-isolation-preregistration.md:35)). It changes `slug` **and** `name`. IN-1 argues `name` is "one of the places the slug is referenced" — but a field whose value is the display label is not a rendering of the slug; it is a second, independently editable field. §8's falsifier says the registration is bad if "A1's rename changes any other field besides `slug` and where it is referenced" ([reg:123](2026-11-11-b3-isolation-preregistration.md:123)). On the plain reading the falsifier is already tripped; only a generous redefinition of "referenced" saves it. Either way, the registration needed amending before the fixture was built.

A2 also changes more than one thing inside the one field: it adds a definite article ("why code" → "why **the** code") as well as replacing the clause. §1 quotes the two lines as differing only in the second clause ([reg:21](2026-11-11-b3-isolation-preregistration.md:21)); the diff shows two token-level changes.

A1 is defensible as _the_ test of "noun form as a reader sees it" — IN-1 says so well — but that is a different hypothesis from "morphology of the slug", and the registration should say which one it is testing.

**Evidence.** `diff A0 A1` → exactly lines 56–57 (`slug`, `name`); `diff A1 A2` → line 60 with `the code` added; [`IMPLEMENTATION-NOTES.md:34-45`](../../test-fixtures/frames/b3-isolation/IMPLEMENTATION-NOTES.md:34).

**What it would take to fix.** A one-line amendment redefining M as "noun in slug **and** label" and L as "article + clause", or a slug-only seventh condition (new registration).

**Registered material?** Yes for the wording; no for the fixtures (they already match IN-1's reading).

### 9 — SERIOUS: the batch-validity control runs last, and it is insensitive

**What is wrong.** C1 is the control whose failure invalidates the batch ([reg:64](2026-11-11-b3-isolation-preregistration.md:64)). In the plan it is the seventh condition ([`arms.json:71-76`](../../test-fixtures/frames/b3-isolation/arms.json:71)), i.e. calls **31–35 of 40**, because the executor walks conditions in plan order ([`framing-pretest-batch.mjs:38`](../../scripts/lib/framing-pretest-batch.mjs:38)). A degraded batch therefore burns 30 calls before anything notices.

Sensitivity: with the "C1 < 4/5" rule, a batch degraded to a true correct rate of 0.6 is caught 66% of the time; at 0.8, only 26%. And C1 pairs the axis picker with **B1**, a debugging brief — so a failure mode specific to comprehension prompts (the class under test) is invisible to it.

**Evidence.** Plan order [`arms.json:34-83`](../../test-fixtures/frames/b3-isolation/arms.json:34); threshold [`reg:64`](2026-11-11-b3-isolation-preregistration.md:64); binomial arithmetic above.

**What it would take to fix.** Move C1 first (no registration change: it changes execution order, not material), and add a comprehension positive control on the artefact picker with a known owner — e.g. B1 on A5 — so both pickers have a positive control on both brief shapes.

**Registered material?** Partly. Re-ordering is an instrument choice; adding a control is an arm-set change.

### 10 — SERIOUS: there is no placebo arm and no scorer-reliability duplicate, so no noise floor exists

**What is wrong.** Every one of the six arms is an _active_ manipulation designed to move the answer. If A1 moves 1/5 → 4/5, the table attributes it to morphology **by elimination** — but elimination assumes that a material change of no consequence would leave the rate alone. That assumption is untested and, given F-1's finding that directive changes move response form enormously ([log:232-243](../research/modes-experiment-log.md:232)), it is not safe.

Two cheap controls are missing:

1. **A placebo arm**: rename or reorder two _unrelated_ modes (e.g. swap `legal-review` and `career-coach`, or rename `supply-evidence` to `supply-chain-evidence`) with B3 on the axis picker. Five calls, ≈11k tokens. Any movement there is the floor below which no arm's movement means anything.
2. **A scorer-reliability duplicate**: put five of the forty responses into the bundle twice under different case ids. Zero model cost, only scoring effort. D-9 shows a judgement shift of one or two cases ([log:177](../research/modes-experiment-log.md:177)) — which is the size of the entire predicted effect. Without this, the disagreement rule's benefit cannot be measured.

**Evidence.** Arm list [`arms.json:34-83`](../../test-fixtures/frames/b3-isolation/arms.json:34) — no arm is material-irrelevant; bundle builder writes exactly the 40 runs with no duplication ([`build-scorer-bundle.mjs:84-96`](../../scripts/build-scorer-bundle.mjs:84)).

**What it would take to fix.** Adding a placebo arm is a registered-material change. The duplicate-case control is **not** — it is a bundle-construction change and can be done under HARDEN.

**Registered material?** Yes for the placebo; no for the duplicate.

### 11 — MINOR: A5 is called a control but has no failure rule, and A0's "replication" is rate-only

**What is wrong.** §5 calls A5 "a replication control for the artefact reference rate" ([reg:82](2026-11-11-b3-isolation-preregistration.md:82)), but §3 reads A5 only as a precondition of the N row ([reg:63](2026-11-11-b3-isolation-preregistration.md:63)). If A5 returns 3/5, nothing is triggered — the batch is neither invalidated nor explained, and the N reading is unavailable.

Similarly A0 is "Replication of E11" ([reg:34](2026-11-11-b3-isolation-preregistration.md:34)), but the table reads only its count. A0 could return 1/5 with a _different_ persona succeeding (say P3 instead of P4) and every row would read it as a faithful replication, although F-1/F-2 are claims about _which_ personas did what.

**What it would take to fix.** One sentence: "A5 < 4/5 invalidates the artefact reference and no arm is read"; and record the persona-level answer vector for A0 alongside its count.

**Registered material?** Yes (cheap amendment).

### 12 — FATAL: the rubric the scorers will actually read is not Amendment 1's rubric

**What is wrong.** Amendment 1 freezes four owner levels and five framing categories with specific definitions, and says it "may not be edited afterwards" ([reg:133](2026-11-11-b3-isolation-preregistration.md:133)); A1.5 freezes "the four owner levels" and the ambiguity/out-of-vocabulary/echo rules ([reg:181](2026-11-11-b3-isolation-preregistration.md:181)). The bundle ships a different document.

| Element            | Amendment 1 (frozen)                                                                                                                                    | Shipped `rubric.md`                                                                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MATCH`            | "the mode in that prompt's list whose **routing line** most directly answers the brief" ([reg:151](2026-11-11-b3-isolation-preregistration.md:151))     | "the obvious owner … a reader who knows nothing about the catalogue would expect that mode to be chosen" ([(scorer-rubric.mjs:74)](../../scripts/lib/scorer-rubric.mjs:74)) |
| `PLAUSIBLE`        | "another listed mode answers it more directly"                                                                                                          | "a reasonable reader could have expected another mode"                                                                                                                      |
| `MISS`             | "does not serve the brief, **or is not present in that prompt's list**" ([reg:153](2026-11-11-b3-isolation-preregistration.md:153))                     | "does not own this request at all" — **the out-of-vocabulary clause is gone**                                                                                               |
| `NO_SELECTION`     | the fourth frozen level ([reg:154](2026-11-11-b3-isolation-preregistration.md:154))                                                                     | **absent**                                                                                                                                                                  |
| Owner levels       | exactly four                                                                                                                                            | six: the four plus `AMBIGUOUS`, `HELP`, `INVALID` ([(scorer-rubric.mjs:77-79)](../../scripts/lib/scorer-rubric.mjs:77))                                                     |
| Framing categories | rich definitions with a mode+question tie-break and a `BARE`/`IMPLICIT` structural test ([reg:137-145](2026-11-11-b3-isolation-preregistration.md:137)) | five one-line glosses: "slug only", "states a goal", … ([(scorer-rubric.mjs:63-69)](../../scripts/lib/scorer-rubric.mjs:63))                                                |

The consequence is not pedantry. Amendment 1's `MATCH` is anchored to the picker's routing line, which is _visible and checkable_; the shipped `MATCH` is anchored to "what a reader would expect", which is a judgement about a hypothetical reader and is the exact failure mode E2 diagnosed ("ownership was tested by word overlap at every stage, so the run could only confirm the author recognises his own names", [log:32](../research/modes-experiment-log.md:32)). Two scorers applying the shipped wording will drift more than two scorers applying the frozen wording.

[IN-6](../../test-fixtures/frames/b3-isolation/IMPLEMENTATION-NOTES.md:156) describes the shipped definitions as "the narrowest reading consistent with the registration's own usage". That is not accurate: the shipped text drops a clause, drops a level, and adds three. This is the D-2/D-3 species — a confident statement about what a document says, made without diffing it.

**What it would take to fix.** Replace `JUDGEMENT_SCALE` and `FRAMING_CATEGORIES` with Amendment 1's text verbatim, keeping `AMBIGUOUS`/`HELP`/`INVALID` as separate recorded _flags_ rather than owner levels. Also add the two missing tie-breaks (two stated framings; mode named inside a question).

**Registered material?** **No.** This is a code fix and does not need a new registration — Amendment 1 already says what the rubric is.

### 13 — SERIOUS: two parent-registration rules were copied into the bundle where they contradict the instrument

**What is wrong.** [`scorer-rubric.mjs:49-56`](../../scripts/lib/scorer-rubric.mjs:49) copies the parent's B1/B2/B3 _task-outcome_ rubric and its blind-scoring rule verbatim. Both are wrong for this unit of analysis:

- The outcome rubric judges a _transcript of work_ ("An answer citing `path:line` for each structural claim"). An E12 response is a mode declaration of 3–1,558 bytes and can never satisfy it. A literal-minded scorer now has a pre-registered basis for calling every case a Fail.
- The blind-scoring rule says "the scorer receives the transcript with all mode names replaced by `MODE-X`" and "if de-blinding happens for any run, that run is reported separately". The bundle contains real slugs in `prompt.txt` and real slugs in `response.txt`, and §1 instructs the scorer to record `declared_mode` "exactly as it appears in that case's `prompt.txt`" ([(scorer-rubric.mjs:99)](../../scripts/lib/scorer-rubric.mjs:99)). A scorer reading both rules literally would conclude that de-blinding occurred in all 40 cases.

**Evidence.** The two texts side by side in one file; the parent's originals at [`2026-11-09-frame-decision-preregistration.md:93-95`](2026-11-09-frame-decision-preregistration.md:93).

**What it would take to fix.** Delete §6 of the bundle rubric and replace it with one line: "This bundle scores routing only; no answer text is being judged."

**Registered material?** No.

### 14 — SERIOUS: no answer key exists, so A4 can move the target rather than the arrow

**What is wrong.** `MATCH` is defined relative to "the mode … whose routing line most directly answers the brief". Nothing in the repository freezes _which_ mode that is for B3, B3P or B1, in any of the eight pickers. A `grep` for `answer key` / `intended owner` / `expected_owner` across `scripts/`, the registration and the fixtures returns nothing.

This matters most for A4, the arm that varies the brief. If B3P's best owner is judged to be something other than the comprehension mode — plausible, since "I want to understand the reasoning" reads as exploration rather than as evidence-citing explanation — then A4's MATCH rate is measured on a different scale from A0's, and a rise in A4 cannot be read as "the model routed better".

It also puts the two scorers' independence under strain: both are delegates of the same operator ([IN-7](../../test-fixtures/frames/b3-isolation/IMPLEMENTATION-NOTES.md:165) says so plainly), both receive the response they are judging, and neither is given a key to judge against. The response is therefore the strongest prior available about what "the obvious owner" is.

**What it would take to fix.** Pre-register the expected owner for each (arm, brief) pair, in a file the scorers never see, and have the two scorers _record_ rather than _decide_ the owner. Where they disagree with the key, that is a finding about the catalogue, not a reason to move the key.

**Registered material?** Yes — this adds registered material, but it can be added as a sealed appendix without changing any frozen string.

### 15 — MINOR: the conservative rule does not bias toward the null, and the stated justification is wrong

**What is wrong.** The rule lowers every judgement ([reg:94](2026-11-11-b3-isolation-preregistration.md:94), [(scorer-rubric.mjs:135-136)](../../scripts/lib/scorer-rubric.mjs:135)): `MATCH`+`PLAUSIBLE` → `PLAUSIBLE`, and anything else → `MISS`. Applied uniformly, it depresses every arm's MATCH rate. The null in §3 is _A0 ≥ 4/5_ — so depressing rates makes the null **harder** to establish and makes the causal gate (A0 ≤ 2/5) **easier** to open, while making every treatment target (≥ 4/5) harder to reach. The net bias is toward "no row matches", not toward the null. The sentence "Conservative resolution cannot manufacture an effect" is true only in the narrow sense that it cannot raise a rate; it can and does manufacture the _precondition_ for every causal row.

**What it would take to fix.** One sentence: "the rule is biased downward in all arms; the pattern table's asymmetric thresholds (A0 ≤ 2/5 versus arm ≥ 4/5) mean this direction makes attribution _harder_, not easier — but it also makes H0 closure harder, so a failure to close H0 is not evidence against noise."

**Registered material?** The rule is frozen; the _explanation_ is not. This can be fixed in the report template.

### 16 — MINOR: `echo` is two different variables, and "never a correctness signal" is stronger than the evidence

**What is wrong.** The harness detector requires the leading bullet: `text.includes("- slug — Name — whenToUse")` ([(framing-pretest-results.mjs:62)](../../scripts/lib/framing-pretest-results.mjs:62)). The rubric defines echo as reproducing "a whole `slug — Name — routing line`" with no bullet ([(scorer-rubric.mjs:102)](../../scripts/lib/scorer-rubric.mjs:102)). A response that copies the line without the hyphen scores `echoed: false` in the record and `echo: true` from the scorer. "A high echo rate" therefore names two different quantities.

On the substantive point: an echo is only possible after the model has picked a specific mode _and_ attended to its routing line, so it is at least a salience signal about the chosen line. The registration's flat "never a correctness signal" ([reg:102](2026-11-11-b3-isolation-preregistration.md:102)) is a stronger claim than n = 1 (E11 run-16) can carry.

**What it would take to fix.** Align the two definitions on one string and soften the claim to "not scored as correctness".

**Registered material?** No for the detector; the sentence is in the frozen edge-case table, so the softening needs an amendment (trivial).

### 17 — FATAL: `MAX_TOKENS` is recorded and never enforced

**What is wrong.** §6 says `finishReason = MAX_TOKENS` → `INVALID`, "never partially scored" ([reg:104](2026-11-11-b3-isolation-preregistration.md:104)). The code reads `finishReason` from the sidecar and puts it in the record ([(framing-pretest-results.mjs:127)](../../scripts/lib/framing-pretest-results.mjs:127)) but nothing acts on it: status comes only from the runner's exit code and file size ([(framing-pretest-runner.mjs:77-94)](../../scripts/lib/framing-pretest-runner.mjs:77)), and the bundle builder excludes only `status !== "RUN"` ([(build-scorer-bundle.mjs:87)](../../scripts/build-scorer-bundle.mjs:87)). A truncated answer with exit 0 and a non-empty file is scored.

The test suite appears to cover the rule and does not: the case at [`b3-isolation.spec.mjs:160-198`](../../scripts/b3-isolation.spec.mjs:160) supplies `finishReason: "MAX_TOKENS"` **and** an `INVALID` outcome, so the assertion `record.status === "INVALID"` passes for the wrong reason and would still pass if the finish-reason gate were deleted.

**Evidence (demonstrated).** Synthetic run directory from a real dry run, 40 records with `status: RUN`, one with `finishReason: MAX_TOKENS` and a truncated transcript; `node scripts/build-scorer-bundle.mjs --run /tmp/rt-bundle` → "bundle-A: **40 cases**", and the truncated text is present at `bundle-A/case-03/response.txt`.

**What it would take to fix.** In `buildResultRecord`, treat `finishReason === "MAX_TOKENS"` (or any non-`STOP` value other than `null`) as `INVALID`; or filter on it in the bundle builder. Either fix is a few lines.

**Registered material?** No.

### 18 — SERIOUS: the bundle's default output path sits one directory below the sealed map

**What is wrong.** "The map is a de-blinding document. It may not be written into a bundle" ([(build-scorer-bundle.mjs:122)](../../scripts/build-scorer-bundle.mjs:122)) is enforced — but only against `bundle-a`/`bundle-b` path segments ([(scorer-bundle-guards.mjs:56)](../../scripts/lib/scorer-bundle-guards.mjs:56)). The default output is `<run>/scoring-bundles` ([(build-scorer-bundle.mjs:120)](../../scripts/build-scorer-bundle.mjs:120)), i.e. **inside the run directory**, which also holds `plan.json` (`catalogueLabels` plus the full condition list), `_blind-map.json` and `blindness-report.json` — the last two both map condition → label.

E11's failure was "the directory still contained `plan.json`, which would have de-blinded a scorer immediately" ([reg:77](2026-11-11-b3-isolation-preregistration.md:77)). The E12 default reproduces the same directory shape and adds a subfolder: the obvious thing to hand a scorer is either `<run>` (everything) or `<run>/scoring-bundles` (which contains `_case-maps.json`, a complete case → run → arm map). The mitigation is structural only for the exact string `bundle-A/`.

**Evidence.** Dry run produced `_blind-map.json`, `blindness-report.json`, `plan.json` in `/tmp/rt-b3`; bundle build placed `_case-maps.json` beside `bundle-A/` and `bundle-B/`.

**What it would take to fix.** Default `--out` to a sibling outside the run directory, and refuse to write `_case-maps.json` anywhere the tool prints alongside a bundle path.

**Registered material?** No.

### 19 — MINOR: determinism is asserted, not tested, in the registered run — and repeats would be consecutive

**What is wrong.** I-3 registers k repetitions explicitly as the determinism check ([reg:75](2026-11-11-b3-isolation-preregistration.md:75)), and §7.3 says "if k repetitions diverge at temperature 0, every single-draw claim in E11 must be softened" ([reg:112](2026-11-11-b3-isolation-preregistration.md:112)). The registered plan is k = 1 ([(arms.json:6)](../../test-fixtures/frames/b3-isolation/arms.json:6), [IN-9](../../test-fixtures/frames/b3-isolation/IMPLEMENTATION-NOTES.md:178)). So the one instrument change that would license the single-draw design is specified and not used, while every arm's ≥ 4/5 versus ≤ 2/5 comparison presupposes a stable single draw.

If k were used, the loop places repeats consecutively ([(framing-pretest-plan.mjs:149-160)](../../scripts/lib/framing-pretest-plan.mjs:149)), so identical prompts are sent back to back — which is the arrangement most likely to hide non-determinism behind provider-side prompt caching or instance stickiness.

**What it would take to fix.** A0 only, k = 3, interleaved — 15 calls, ≈33k — before any other arm.

**Registered material?** k > 1 is a new registration by [IN-9](../../test-fixtures/frames/b3-isolation/IMPLEMENTATION-NOTES.md:182)'s own rule; the interleaving is a code fix.

### 20 — MINOR: the 89k is spent unconditionally, and most of it is contingent

**What is wrong.** §8's stopping rule says "stop before A1–A5 **are interpreted** if A0 ≥ 4/5" ([reg:119](2026-11-11-b3-isolation-preregistration.md:119)) — not _before they are run_. The executor walks all 40 runs ([`framing-pretest-batch.mjs:38-66`](../../scripts/lib/framing-pretest-batch.mjs:38)) with no filter, so the full ~89k is committed before the decisive 5-call test is read. Under H0, in 18.8% of worlds those 35 calls buy nothing; in a further 56.8% they buy an unreadable result.

**What it would take to fix.** Run C1 (5 calls), then A0 (5), then branch. The most likely branch costs ≈ 25 calls; the worst case ≈ 40. Also, dropping A3 would save 5 calls unless the position arm replaces it (objection 7).

**Registered material?** Execution order: no. The design: yes if arms are dropped.

### 21 — MINOR: three small guard defects

- The A3 neutrality check bans the substring `explain` but not `explanation` ([(generate-b3-isolation-fixtures.mjs:64)](../../scripts/generate-b3-isolation-fixtures.mjs:64), [(b3-isolation.spec.mjs:103)](../../scripts/b3-isolation.spec.mjs:103)). `explanation` does not contain `explain` — the exact slip recorded as D-5 ([log:173](../research/modes-experiment-log.md:173)). The current padding is clean, so this is latent, not active.
- The plan loader validates `B1` and `B3` against the frozen `BRIEFS` ([`framing-pretest-plan.mjs:67-75`](../../scripts/lib/framing-pretest-plan.mjs:67)); `B3P` is accepted unvalidated, so nothing prevents A4's brief from drifting away from `arms.json` (see objection 6).
- [`b3-isolation.spec.mjs:85`](../../scripts/b3-isolation.spec.mjs:85) asserts `a1[59] === a1[59].replace(explanation.whenToUse, a1[59])`, which is nearly self-satisfying and adds nothing to the real check at lines 72–74.

**Registered material?** No.

---

## 4. What the design gets right

These are not concessions; they are the parts a maintainer should defend against a future reviewer who wants to rewrite everything.

1. **The question is the right question.** "Which single property of the picker caused the difference" is exactly the level at which E11's observation can be made usable, and §9 scopes the answer correctly ([reg:127-129](2026-11-11-b3-isolation-preregistration.md:127)).
2. **The brief really is held constant.** I measured it: five identical header hashes in each of A0, A1, A2, A3, A5 and C2, with A4 and C1 carrying their own five each. Many designs assert this; this one can be verified in one command.
3. **A0 and A5 are the sources, byte for byte.** `cmp` reports no difference; `sha256(A0) = 30315cd2…` = `axis-stance.roomodes`; `sha256(A5) = 3d0d3974…` = `artefact.roomodes`. The generator asserts re-serialisation identity rather than claiming it ([(generate-b3-isolation-fixtures.mjs:158-159)](../../scripts/generate-b3-isolation-fixtures.mjs:158)).
4. **A3 appends instead of interleaving.** [IN-2](../../test-fixtures/frames/b3-isolation/IMPLEMENTATION-NOTES.md:83) argues this correctly: interleaving would have changed size _and_ position, and no arm could have separated them. The instinct is right even though the resulting arm does not match the real contrast (objection 7).
5. **The projection is genuinely three fields.** I read the emitted prompts: `- slug — Name — whenToUse` and nothing else. The audit re-checks the bytes rather than the intent, and it passes on all 40 prompts. My independent leak scan of the 40 prompts and of the rubric returned **0** hits.
6. **The bundle design is a real improvement on E11.** Case ids carrying no arm, two independent shuffles, the map kept out of the bundles, a refusal of `--out` inside a bundle, and a check that the two orders cannot align ([`build-scorer-bundle.mjs:137-142`](../../scripts/build-scorer-bundle.mjs:137)) — all correct, and all tested (`node --test scripts/b3-isolation.spec.mjs`: 18/18 pass).
7. **The registration's own falsifiers are unusually good.** §8 names the three ways the material could betray the design. Two of them (A1's field range, A4's paraphrase) turn out to be unexecuted — which is the strongest evidence available that the falsifiers were aimed at the right targets.
8. **The log's deviation discipline is intact.** D-8 is recorded against its author ([log:176](../research/modes-experiment-log.md:176)), and the implementation notes separate "what the code path does" from "what was observed" ([IMPLEMENTATION-NOTES.md:206-217](../../test-fixtures/frames/b3-isolation/IMPLEMENTATION-NOTES.md:206)). That separation is what makes this review possible at all.

---

## 5. The single most damaging objection

**§3's decision statistic cannot bear the reading it is registered to produce.** It dichotomises five persona _conditions_ into a rate, thresholds that rate at ≥ 4/5 and ≤ 2/5, and then names one of five causes — while leaving the modal outcome (3/5) unreadable and, by exact enumeration under its own null, naming exactly one cause 20.4% of the time, naming several 4.1%, matching nothing 56.8%, and closing correctly only 18.8%. Everything else in this review can be repaired without changing the question; this cannot, because a rule that turns a coin into a cause will keep doing so however well the fixtures are built and however clean the bundle is.

**Smallest change that neutralises it.** Do not change n, do not add an arm, do not rebuild a fixture. Replace the rate thresholds with a pre-committed _sequence_, and make the datum the persona-level answer rather than the count:

1. Run C1 first; require 5/5. If it fails, stop and report an instrument failure.
2. Run A0 and compare its five answers **one by one** with E11's recorded answers (`explain` from P4; abstentions from P1, P2, P5; `architecture-reviewer` from P3). Exact match → the cell replicated and the phenomenon is real; no match → H0 is not closed but the arm readings are unavailable, and the run stops.
3. Then evaluate arms in a fixed order — M (A1), L (A2), S (A3 or its replacement), X (A4) — and stop at the first arm whose five answers differ from A0's in the predicted direction. Report the arms not reached as _not run_.

This removes the dead band (any change is a datum), removes the overlap (first match wins, pre-committed), removes the multiplicity problem (one contrast is ever read), and costs fewer calls than the present design. It is a registration amendment, not a rebuild — which is why the verdict is **AMEND BEFORE RUNNING** rather than DO NOT RUN.

---

## 6. What I could not check, and why

- **Every claim about what a model would do.** No model call was made, as instructed. All quantities above are properties of the instrument's decision rules and material, not of behaviour. Whether `gemini-3.5-flash` at temperature 0 is deterministic is unmeasured — and by objection 19 the design does not measure it either.
- **External precedent.** No network access, so the registration's "position and count effects are well documented in long-context selection" ([reg:22](2026-11-11-b3-isolation-preregistration.md:22)) is unverified in both directions. It is the only unsourced empirical claim in an otherwise well-evidenced document, and it is load-bearing for the S candidate.
- **The 89k figure's accuracy.** I verified the arithmetic (40 × 2,228 = 89,120) and its provenance (E11's measured mean, [log:158](../research/modes-experiment-log.md:158)), but not the spend. E12's prompts are 4% larger than E11's by measurement (mean 6,306.48 bytes versus 6,064.93), so the estimate is a touch low; and 41% of E11's total was thinking tokens, which no linear estimate can bound.
- **Whether the two scorers are actually independent.** Not observable from the repository; [IN-7](../../test-fixtures/frames/b3-isolation/IMPLEMENTATION-NOTES.md:165) states the limitation honestly and assigns it to the operator. I attack the _consequence_ (no key, shared operator), not the claim of separation.
- **The parent registration's own compliance.** I read §5 only to verify the provenance of the two texts copied into the bundle. I did not audit E11's execution against the parent's amendments.
- **Rubric exhaustiveness empirically.** I judged mutual exclusivity of the framing categories analytically. No scoring pass was run, so I have no observed case where two categories genuinely compete.
- **`.env`.** Not read, as instructed.
