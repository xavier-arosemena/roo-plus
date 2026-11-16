# Pre-registration — E20 (artefact polarity) and E20b (position)

| Field          | Value                                                                                                   |
| -------------- | ------------------------------------------------------------------------------------------------------- |
| **Registered** | 2026-11-13, before any model call                                                                       |
| **Supersedes** | The E19 sketch in [`modes-programme-roadmap.md`](../modes-programme-roadmap.md:1), withdrawn in log §15 |
| **Status**     | Frozen. Amendments append in §11; nothing above it is edited                                            |
| **Calls**      | 500 (E20 300, E20b 200) ≈ **$1.4** at the Tier-1 Gemini rate observed in E13-R                          |
| **Depends on** | Log §16 (instrument verification), §17 (closing number)                                                 |

## 1. Why these two tests, and why separately

The routing round closed at **598 of 600 appropriate** (log §17.3): the model either commits to the expected mode or asks for what the brief omitted, and never selects an unrelated mode. What remains is not a question about _outcomes_ but about _mechanism_, and there are two candidate mechanisms of different size.

1. **The line's artefact polarity.** Log §17.4 puts the register effect at 14–17 points on commit-versus-ask, with a larger interaction term. The literature (log §15.5) documents the polarity at request level but never in a selection list. That is E20.
2. **Position in the picker.** The only factor-isolated study reports the first-listed entry chosen in 78.7–96.0% of trials, which is larger than any label effect anyone has measured. Every round we have run held position fixed — verified from timestamps in log §16.1. That is E20b.

They are **not crossed**. Crossing would produce an interaction we cannot power at our budget, and the two manipulations have no reason to be additive. Two clean single-field designs beat one underpowered factorial; that lesson cost 43.7% power the last time we ignored it.

## 2. Design

### 2.1 E20 — three lines, one slug, one brief

| Arm   | Line (verbatim)                                                                                       | Length    | Role                                               |
| ----- | ----------------------------------------------------------------------------------------------------- | --------- | -------------------------------------------------- |
| **A** | `Use when someone asks why code behaves as it does.`                                                  | **50 ch** | Artefact absent                                    |
| **B** | `Use when someone asks why code behaves as it does and the answer must cite evidence, not recall.`    | **96 ch** | Artefact stated — identical to the round's IN line |
| **C** | `Use when someone asks why code behaves as it does and the answer must not merely describe the code.` | **99 ch** | Artefact excluded                                  |

- Entry name and slug: `Explain` / `explain` in all three arms.
- Brief, verbatim, identical in all three: `Explain why this module is structured the way it is.` (52 ch) — the ambiguous brief, which is the only regime in which the line can matter.
- Picker: 45 entries, `explain` held at **index 7 (0-based 6)** in every arm — the position it had in the closing round.
- n = 100 draws per arm, **round-robin interleaved**, one call in flight at a time, `temperature 0` recorded but not assumed deterministic.

### 2.2 Why B versus C is primary

A (50 ch) differs from B (96 ch) by 46 characters, so "the line states an artefact" is **inseparable from "the line is longer"** in the A-vs-B contrast. B (96 ch) and C (99 ch) differ by 3 characters and differ only in **polarity**: B names what the answer must contain, C names what it must not be. That contrast is length-matched and it is the one that answers the question the programme actually has.

**Primary contrast: B vs C.** Secondary, descriptive: A vs B, declared length-confounded in advance and never to be reported as a causal effect.

### 2.3 E20b — two positions, one line

| Arm     | Position of `explain` | Line |
| ------- | --------------------- | ---- |
| **P1**  | index 0 (first entry) | B    |
| **P45** | index 44 (last entry) | B    |

Brief and slug identical to E20. n = 100 per arm, interleaved. This is a straight replication of the literature's largest reported effect, run against our own picker, with our own brief.

## 3. Outcomes

Recorded for every draw, in this order of precedence:

| Outcome          | Definition                                           | Status                                                    |
| ---------------- | ---------------------------------------------------- | --------------------------------------------------------- |
| **Declared key** | the reply names `explain` as the mode it will use    | **Primary** (E20 and E20b)                                |
| **Asked**        | the reply requests information without naming a mode | Co-reported; the complement of the primary                |
| **Appropriate**  | declared key **or** asked                            | Reported, never tested for significance — it is saturated |
| **Wrong commit** | names a slug other than `explain`                    | Counted with an exact interval; the harm measure          |

No turn-to-resolution metric: it cannot be observed in a single-turn harness, and inventing a proxy for it would repeat the abstention error in a new costume.

## 4. Measurement protocol — the frozen contract

This is the part that would have invalidated the closing round had it not been found in time (log §16.4).

1. **Replies are not constrained.** No required format, no `MODE:` slot. A slot labelled _mode_ presents a choice where the model might otherwise ask, and would bias the very ask rate E20 measures. The cost of a free-form reply is an extraction residual, which is paid for by rule 3 rather than by changing the task.
2. **Extractor v2, pinned** as `routing-round-parser/2`:
    - slug vocabulary = the **union** of all arm pickers (47, not any single picker's 45);
    - formats recognised: `**Mode:** \`slug\``, `**Mode:** slug`, `Mode: \`slug\``, `Mode: slug`, `**Selected Mode:** …`, and a bare bold slug on its own line;
    - a match is accepted only if the token is in the arm's own picker.
3. **Every undetermined reply is adjudicated by hand before publication**, and the count is reported. In the closing round this class ran to 58–60 of 100 in the noun cells — far too large to leave to a regex.
4. **Two independent readings**, disagreements adjudicated, and the residual published. The closing round's residual was −3/0/+4/−4/+1/0 across cells, confined to commit-versus-ask; the same residual class is expected and will be reported, not rounded.

## 5. Statistics

- **Test:** two-sided Fisher exact, for the pre-declared contrasts only. Chosen for the same reasons as in the closing round — small cells, fixed margins, conservative at n = 100.
- **Multiplicity:** two contrasts in E20 (primary B vs C, secondary A vs B) and one in E20b, Holm-corrected within each experiment. With two tests, the primary is evaluated at α = 0.025.
- **Smallest detectable difference:** 19.8 points at n = 100 per arm, α = .05 two-sided, power .80, worst-case variance. **Any effect smaller than about 20 points is not detectable by this design** and its absence will be reported as absence of evidence, never as evidence of absence.
- **No bootstrap.** With three independent arms and a binary outcome there is nothing for it to add, and log §16.2 shows it buys nothing at a boundary.
- **Guards, all pre-committed:**
    - exclusion rate above 5% in any arm → the experiment refuses and no estimate is published;
    - a cell whose longest identical verbatim run exceeds 5, or whose duplicate rate exceeds 20%, is clustered: no estimate for it;
    - **a runs test on the outcome sequence is reported per arm**, because log §16.3 shows the verbatim guard cannot see outcome dependence;
    - a cell at 0 or 100 is reported as "not estimable at this n", never as a null.

## 6. Decision rules, fixed before the data

**E20, primary (B vs C):**

| Observation                                    | Registered reading                                                                                                  |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Difference ≥ 20 points, Holm-adjusted p < .025 | Polarity is supported: naming what the answer _must contain_ moves commitment more than naming what it must _avoid_ |
| Difference < 10 points                         | No detectable polarity effect at this brief and this n. Reported as such, with the MDE stated                       |
| 10–20 points                                   | Indecisive. Neither supported nor refuted; **not re-run** without a new registration                                |

**E20, secondary (A vs B):** reported as a magnitude with its length confound named in the same sentence. It cannot falsify anything on its own.

**E20b (P1 vs P45):**

| Observation            | Registered reading                                                                                                                                                          |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Difference ≥ 20 points | Position dominates. The routing conclusion is restated as being about list order, and every earlier label-form reading is demoted to "measured at an uncontrolled position" |
| Difference < 10 points | Our picker is not position-sensitive at this brief — which contradicts the literature and must be reported as a contradiction, not a null                                   |
| 10–20 points           | Indecisive; recorded as T-POS with a magnitude                                                                                                                              |

## 7. What this does not test

- Human selection. Every inference is about one model's behaviour on one brief.
- Whether a good line **rescues** a vague brief. That needs a line strong enough to move a saturated cell, and nothing we have measured suggests one exists.
- Any mode other than `explain`, and any brief that is unambiguous — where the closing round already showed commitment at 98–100 of 100.
- Whether position and polarity interact. Deliberately not tested (§1).

## 8. Cost and stop rules

| Item                | Calls   | ≈ Cost     |
| ------------------- | ------- | ---------- |
| E20 (3 arms × 100)  | 300     | $0.85      |
| E20b (2 arms × 100) | 200     | $0.57      |
| **Total**           | **500** | **≈ $1.4** |

Stop before spending if: the fixture fails schema validation; the six prompts do not hash distinctly; the executor cannot prove the interleaving (§16.1 is now a regression test); or the extractor cannot round-trip the closing round's 600 saved replies without exceeding the recorded residual.

## 9. Deviations that would void this registration

Any of the following makes the run exploratory rather than confirmatory, and it must be said so in the report:

1. changing an arm's text, the brief, or the position after the first call;
2. selecting or dropping draws;
3. reporting the secondary contrast as if it were primary;
4. publishing an extraction number without the adjudication count beside it;
5. adding a fourth arm mid-run.

## 10. Preconditions before the first call

- [ ] Extractor v2 implemented, tested, and round-tripped against the 600 saved replies from the closing round
- [ ] Runs test in the report, not the appendix
- [ ] Interleaving assertion (599 transitions in 600 calls) added as a regression test
- [ ] Fixture generated, schema-valid, six distinct `promptSha256` values
- [ ] Answer key sealed before the run
- [ ] `.env` verified: Gemini key present and valid; DeepSeek base URL and model correct, or Stage 2 not attempted

## 11. Amendment log

### Amendment 1 — 2026-11-16: draws per arm

Registered before any call. Supersedes three statements above: the "n = 100 draws per arm" line in §2.1, the 19.8-point sentence in §5, and the cost table in §8. Everything else stands unchanged.

**1. Draws.** Arm A stays at **100**. Arms B and C move to **400 each**. E20 totals 900 calls; E20b is unchanged at 200.

**2. Why.** At n = 100 the smallest detectable difference was 19.8 points and a 15-point effect had only 57% power. The closing round measured a label-form effect of 14–17 points (log §17.4) and was then described as "second-order" — which describes the design's resolution, not the label. Spending 300 calls to produce a number that cannot separate a 15-point effect from noise is the mistake this amendment removes.

**3. What 400 buys**, measured at α = .05 two-sided, baseline .50:

| True effect | Power at n = 100 | Power at n = 400 |
| ----------- | ---------------- | ---------------- |
| 10 points   | 29%              | 81%              |
| 12 points   | 40%              | 93%              |
| 15 points   | 57%              | 99%              |
| 20 points   | 82%              | ~100%            |

The 10–20 point band becomes answerable. Effects below about 10 points remain out of reach — 8 points sits at 62% — and that limit is reported with every result.

**4. Why A stays at 100.** A is a descriptive reference level, not an inference: it differs from B in length as well as in content (50 against 96 characters), and a length-matched inert clause cannot be written without adding meaning. Its precision therefore buys no causal claim, so 400 draws would sharpen a number that cannot be used for one. One hundred gives ±10 points, which is enough to state the baseline.

**5. Interleaving.** Three arms in a 1:4:4 ratio cannot alternate pairwise. The registered cycle is **A B C B C B C B C**, repeated 100 times: 900 calls, every consecutive pair a different arm, counts exact, and 899 transitions across 900 calls. Any other order is a deviation under §9.

**6. Cost** at the measured rate of €5.1 per 1,000 calls (log §5.1):

| Item                      | Calls     | ≈ Cost     |
| ------------------------- | --------- | ---------- |
| E20 — B and C at 400 each | 800       | €4.2       |
| E20 — A at 100            | 100       | €0.5       |
| E20b — position           | 200       | €1.1       |
| **Total**                 | **1,100** | **≈ €5.7** |

Every earlier figure in this file was in dollars and roughly half the true cost. The platform-reported €3.24 for 635 calls is the only measured number the programme has.

**7. Two added preconditions**, beyond §10:

- the executor must take the expected number of calls from the plan rather than from a constant, and the interleaving assertion must accept the 9-cycle (899 transitions in 900 calls);
- the fixture must prove the 1:4:4 counts and the cycle order before the answer key is sealed.
