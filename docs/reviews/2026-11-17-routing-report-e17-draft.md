# Routing report (E17 draft) — does the picker's wording or its order decide whether a model commits?

| Field            | Value                                                                                                                                                            |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**       | **Draft for review.** Not a release note; numbers are final, interpretation is open to challenge                                                                 |
| **Built from**   | E21 (closing round, 598/600 appropriate), E20 (artefact polarity, 900 calls), E20b (position, 200 calls)                                                         |
| **Evidence**     | [`runs/e20-2026-11-17`](../../runs/e20-2026-11-17) · [`runs/e20b-2026-11-16`](../../runs/e20b-2026-11-16) · [`runs/e13r-2026-11-12`](../../runs/e13r-2026-11-12) |
| **Registration** | [`2026-11-13-e20-preregistration.md`](2026-11-13-e20-preregistration.md:1), Amendments 1 and 2                                                                   |
| **Calls paid**   | 1,931 output-producing calls ≈ **€9.8** (measured rate €5.1 / 1,000); 4.80 h wall clock including one aborted batch                                              |

[I am putting my comments in brackets]

---

## 0. What to take away

1. **The picker decides.** Two manipulations of a single field each moved commitment by roughly 27–29 points — far beyond the ~10-point resolution of the design. The picker is not a neutral index. [A note in the preliminary: What is a picker?]
2. **Both effects point the opposite way to the prediction.** a) Naming what the answer must _avoid_ committed more than naming what it must _contain_; b) the **last** entry committed more than the first. The literature and our own registration expected the reverse.
3. **Order and wording cannot be told apart at these precisions.** [a and b are indistinguishable?] Position reproduced the artefact effect almost exactly — 29.0 points (CI ± 12.0) against 27.5 points (CI ± 5.7). The E20b interval is wide because it ran 100 draws per arm, so "the same size" is the correct reading only in the sense that **neither is distinguishable from the other**; it is not a claim that the two are equal. Any future label experiment must control position, and any future position experiment must control wording.
4. **Order has a cost that wording does not.** The last position produced **12% wrong commits**; the first produced **none**. Commitment is not the same thing as correct commitment.
5. **Nothing here is reproducible per request.** The same prompt at `temperature: 0`, run hours apart, produced **zero** byte-identical transcripts and matched its own commit/ask outcome only at chance (~53–71%). A mode that works once may ask next time.

---

## 1. What we are trying to assess

### 1.1 The user-facing situation

The catalogue offers 45 modes. Each is presented as one line — a `whenToUse` sentence — and the model must decide, from that list and the user's request, whether to **commit** to one mode or **ask** for what the request left out. The closing round showed that on an unambiguous brief the model commits almost always (598 of 600 appropriate). So the interesting regime is the _ambiguous_ brief, which is the only regime in which the picker line can matter.

### 1.2 Two candidate mechanisms

There are exactly two levers an author controls when publishing a picker:

- **Wording** — what the `whenToUse` line says.
- **Order** — where the mode sits in the list the model reads.

Prior work left both unsettled. The label-form literature documents polarity at _request_ level but never inside a _selection list_ [citation needed]. The only factor-isolated position study reports the first-listed entry being chosen in 78.7–96.0% of trials [citation needed] — larger than any label effect ever measured — and every round this programme has run held position fixed, so our own numbers were never tested against it. [I'm not sure I understand this. This is saying we did not test position?]

### 1.3 The three questions this report has to answer

1. **Does the wording of a line change whether the model commits or asks?**
2. **Does the position of a line change it?**
3. **What does commitment cost?** Specifically: does the model commit to the _right_ mode, or merely to _a_ mode?

### 1.4 What counts as an answer

Fixed before the data (registration §5–§6): exact Fisher tests [citation needed] on pre-declared contrasts, Holm-corrected [citation needed] within each experiment; a difference of **≥ 20 points** with adjusted _p_ < .025 counts as an effect, **< 10 points** counts as no detectable effect, and the band between them is recorded as indecisive and not re-run without a new registration [Didn't we say we were also testing between 1- and 20?]. The design resolves about **10 points** at n = 400 per arm, and about **19.8 points** at n = 100.

---

## 2. What we measured and how

### 2.1 The wording arm (E20)

One slug (`explain`), one entry name, one brief, one position (index 6), three lines that differ only in what they say about evidence:

| Arm   | Line                                                 | Length | Role                                |
| ----- | ---------------------------------------------------- | ------ | ----------------------------------- |
| **A** | `Use when someone asks why code behaves as it does.` | 50 ch  | Artefact absent — **baseline only** |
| **B** | `…and the answer must cite evidence, not recall.`    | 96 ch  | Artefact **stated**                 |
| **C** | `…and the answer must not merely describe the code.` | 99 ch  | Artefact **excluded**               |

Brief, identical in all three arms: _"Explain why this module is structured the way it is."_

**B vs C is the primary contrast and it is length-matched** (96 against 99 characters; three characters apart). A vs B differs by 46 characters and therefore cannot separate "states an artefact" from "is longer" — it is reported as a magnitude with that confound named, and can never falsify anything on its own.

Draws: A = 100, B = 400, C = 400, interleaved on the registered nine-call cycle `A B C B C B C B C` repeated 100 times. `temperature: 0`, recorded but not assumed deterministic.

### 2.2 The position arm (E20b)

Same slug, same brief, line held at B. `explain` placed **first** (index 0) or **last** (index 44) of the 45-entry picker. 100 draws per arm, interleaved two-call cycles.

### 2.3 The measurement contract

Replies are **unconstrained** — no `MODE:` slot, because a labelled slot presents a choice where the model might otherwise ask and would bias the very ask rate being measured. Extraction is `routing-round-parser/2`, pinned; every reply it cannot resolve goes to **hand adjudication**, blind: the packet carries a hashed id, the brief and the reply, with no arm, draw or timestamp, and the id-to-run mapping stays outside the packet until every judgement is recorded. Judgements are `DECLARATION`, `ASK` or `OTHER`, with the tie-break fixed in advance: a declaration marker anywhere makes it a `DECLARATION` even if the reply asks afterwards.

### 2.4 Instrument proof (this is what licenses reading the numbers)

| Check                                     | Result                                                                                         |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Mid-run gate at 90 draws (Amendment 2 §1) | exclusion **0.0%** in all three arms; longest identical verbatim run **1** (threshold 5)       |
| Excluded records, published batches       | **0 of 1,100**; every record `finishReason: STOP`                                              |
| Verbatim clustering                       | longest identical-transcript run **1** in all five arms; 879/900 and 193/200 distinct          |
| Interleaving                              | **899 transitions across 900 calls** and **199 across 200**; max concurrency 1                 |
| Token cap / model                         | one value, 4096, throughout; `gemini-3.5-flash`; `temperature: 0`                              |
| Runs test on each arm's outcome sequence  | B _p_ = .79 · A _p_ = .69 · C _p_ = .67 · P1 _p_ = .24 · P45 _p_ = .76 — no outcome dependence |

---

## 3. What we found

### 3.1 The regex was not enough — and here is the size of the problem

Of 378 replies reaching hand adjudication, **28 were commitments the extractor missed** (7.4%). The failure modes are mundane and worth recording, because they are the modes a v3 extractor must accept:

- a bare slug with no decoration — `explain`, or `` `explain` `` alone;
- a bold span wrapping label _and_ slug — `**mode: explain**` — which never matches `**Mode:**`;
- an unbolded label — `Selected mode: explain`;
- a slug followed by a paragraph of goal prose — `` `explain` `` then a description.

All 28 named `explain` but one, which named `architecture-reviewer` outright.

Adjudication moved every arm, and it moved them together, so it did not change any direction:

| Arm | Mechanical only   | After adjudication              |
| --- | ----------------- | ------------------------------- |
| B   | 237 / 400 = 59.3% | **246 / 400 = 61.5%**           |
| A   | 73 / 100 = 73.0%  | **75 / 100 = 75.0%**            |
| C   | 344 / 400 = 86.0% | **356 / 400 = 89.0%**           |
| P1  | 15 / 100 = 15.0%  | **16 / 100 = 16.0%**            |
| P45 | 53 / 100 = 53.0%  | **45 / 100 = 45.0%** (12 wrong) |

### 3.2 The primary contrast: wording polarity

**B 61.5% against C 89.0% — a difference of 27.5 points, C ahead** (95% CI 21.7–33.1 points; exact two-sided _p_ = 7.1 × 10⁻²⁰; Holm-adjusted _p_ < 10⁻¹⁹).

The registered reading for "≥ 20 points" was written as _"naming what the answer must contain moves commitment more than naming what it must avoid"_. The observation is the mirror image: **the line that said what the answer must avoid committed 27.5 points more often**. The registration therefore has no reading for this result; §6's thresholds are sign-blind while its readings are sign-specific (Annex G, Defect 3).

### 3.3 The secondary contrast, reported as magnitude only

**A 75.0% against B 61.5% — 13.5 points, A ahead** (95% CI 3.1–22.4; _p_ = .0141). The shorter line is _not_ the weaker one. But A and B differ in length by 46 characters, so this is **descriptive and length-confounded**; it is recorded here because omitting it would look like concealment, not because it establishes that short lines work.

### 3.4 The position arm

**P1 (first) 16.0% against P45 (last) 45.0% — 29.0 points, last ahead** (95% CI 16.4–40.4; exact _p_ = 1.3 × 10⁻⁵).

Two details matter more than the headline:

- **Both arms stayed "appropriate" at or near saturation** — P1 100%, P45 88%. The model almost never chose an unrelated mode; it either committed or asked.
- **All the harm is in the last position: 12 wrong commits of 100 against 0 of 100** (exact _p_ = 3.4 × 10⁻⁴). Twelve of those replies named some other mode outright rather than asking.

### 3.5 Reliability: `temperature: 0` is not reproducibility

The aborted first attempt (billing, see Annex A) drew the **same prompts** as the published batch before it stopped. Comparing draw by draw:

| Arm | Overlapping draws | Same commit/ask outcome | Identical transcript |
| --- | ----------------- | ----------------------- | -------------------- |
| B   | 329               | 53.2% (chance 51.7%)    | **0.0%**             |
| A   | 83                | 54.2% (chance 55.3%)    | 0.0%                 |
| C   | 329               | 71.1% (chance 73.5%)    | 0.0%                 |

Agreement sits **at chance** and not one transcript repeats. Two consequences: each call is an _independent_ sample, not a replicate (so pooling batches would legitimately add information — it was declined, see Annex A); and a single request is genuinely unstable, so a mode that committed once may ask next time.

---

## 4. What it means

### 4.1 Polarity exists — reversed

E20 was designed to detect a 10–20 point effect that the earlier design could not resolve. It found one at 27.5 points, with a confidence interval that excludes any reading below 21 points. **The effect is not in doubt; its sign is.** [I think I understand now this line: we are saying the that polarity does have an effect, but our research is antagonizing what the hypothesis says, and thus the sign is in doubt. So the "its sign is (in doubt) refers to the contradictions between the hipothesis and the results. AM I right?] The programme's hypothesis — that a line stating a required artefact pulls commitment towards the mode — failed in the direction it was stated. What actually pulled commitment was a line that **excluded** an artefact. [If I am correct in how I am understanding this, maybe we can clarify the text a bit.]

The most parsimonious description: a line that says _"not merely describe the code"_ reads as a **prohibition to be complied with**, and prohibition is a stronger instruction than a requirement to include something. This is consistent with the negotiation behaviour seen in the adjudication: replies that ask are overwhelmingly replies that cannot decide _between_ modes, and a prohibition narrows the field.

### 4.2 Position exists, reversed, and it is the same size

29.0 points against 27.5. A design that varied wording while holding position fixed — which is every earlier round here — was measuring an effect of the same magnitude as the one it held constant.

The direction contradicts the literature's 78.7–96.0% first-listed dominance [citation needed]. We cannot say why from this data. Two candidates, both testable: (i) the model reads the list as a set of _candidate descriptions_ rather than an ordered menu, so position carries no preference and the last line read is the most recent context; (ii) recency within the prompt — the last line is nearest the request. Neither is established here, and the registration deliberately did not cross position with wording. [This is what we are trying to clarify with the lasts tests right?]

### 4.3 Commitment is not correctness

The last position bought 29 points of commitment and paid for it with 12 points of wrong commits. The first position bought 0 wrong commits and a great deal of asking. For a catalogue whose worst outcome is _acting in the wrong mode_, that trade is not obviously favourable, and it is the one policy-relevant number in this report that is measured rather than inferred.

### 4.4 Consequences for earlier readings

By the pre-committed reading for a ≥ 20-point position effect, **the routing conclusion must be restated as being about list order**, and every earlier label-form reading is demoted to _"measured at an uncontrolled position."_ That demotion applies to this programme's own earlier results, including the closing round's label-form contrast.

---

## 5. What this does not mean

- **Not a null result, and not a confirmation.** An effect was found with the sign the registration did not anticipate. §6 of the registration has no reading for a reversed ≥ 20-point difference; that gap is recorded rather than papered over. [Not a confirmation? Or this is because the "reversed reading" was not anticipated? But it in practice *do* gives us a reading. Right?]
- **Not about humans.** Every inference is about one model on one brief. No claim is made about human selection from the same picker.
- **Not about interaction.** Position and polarity were deliberately not crossed; nothing here says what their combination does. [That is a very interesting conclusion and next experiment. But not for us, better for a section on recommended next experiments (for anybody that wants to continue testing this.)]
- **Not generalisable across positions — including E20's own claim.** The polarity contrast was measured with the line held at **index 6 in all three arms**. It is a valid statement _at that position_ and nowhere else. By the same rule §4.4 applies to earlier work, this report's own wording result is **position-controlled, not position-randomised**; it must not be read as "C beats B wherever C sits".
- **Not a fix for a vague brief.** Every arm in E20 stayed at 100% "appropriate". The manipulations changed _whether the model committed_, not whether it stayed out of unrelated modes.
- **Not resolution at 10 points.** Effects below ~10 points remain out of reach at n = 400, and below ~19.8 points at n = 100 (E20b). The 12-point harm difference is recorded as observed but is **below the E20b design's resolution** and should not be quoted as an established magnitude.

---

## 6. Advice, for users and for mode authors

Everything below follows from a measured number, and where it does not, it says so.

### 6.1 If you are choosing a mode (as a user)

1. **Assume the picker is doing some of the choosing for you.** Two systems with identical instructions but different list order committed at 16% and 45% on the same request. If two modes look plausible for your task, name the outcome you want in the request ("find the cause and prove it" versus "map the dependencies") rather than relying on the mode you clicked.
2. **A clarifying question is not a failure.** Across 1,100 calls, the model never selected an unrelated mode in the wording arms; when it did not commit it asked. Answering its question is usually cheaper than a wrong commit.
3. **Do not expect the same answer twice.** The same request, same model, same settings, hours apart matched its own commit/ask outcome only at chance. If a mode behaved oddly once, it may behave differently on a retry. [I am courious of what this means to users? There is a lot of randomness in the system's behaviour? Is this a reliable system?]

### 6.2 If you are writing `whenToUse` lines (as an author)

1. **Make lines mutually exclusive, not merely descriptive.** The ask regime is dominated by candidate lists: replies that ask are replies that cannot separate `explain`, `architecture-reviewer`, `codebase-cartographer` and `decision-record`. Two lines that both plausibly cover "why is this like this" manufacture asking.
2. **Do not expect "must include X" to increase commitment.** It did the opposite of what our registration predicted. A line that excludes something ("not merely describe the code") read as the stronger instruction. This is one brief and one model — treat it as a hypothesis, not a rule.
3. **Do not promote a mode by moving it up.** In this picker the _last_ position committed most. Whatever the mechanism, position effects of ~29 points mean placement is a load-bearing decision and should be recorded and tested, not inherited from a template.
4. **Weigh placement by harm, not by commitment.** The last position committed 29 points more and produced 12% wrong commits against none at the first. If a mode is expensive to invoke wrongly, placement that suppresses wrong commits is worth more than placement that maximises uptake.
5. **Keep the line short enough to be read as one idea.** Descriptive only and length-confounded, but the 50-character line committed more often than either long line (75% against 61.5% and 89%) [89% is more than 75%... Is this correctly worded?]. It is a hint, not an established effect.

---

## 7. The two-prompt comparison: shipped `debugger` against a proposed `debug`

[Please move this comparison to an independent file. I don't think it adds much to the paper so far, and it can be made its own publilcation note.]

### 7.1 Why this pair, and what it is not

The pair is chosen **by function**, not by similarity: both are meant to make a model diagnose a failure rather than describe one. They are **not like-for-like**. The shipped entry is a 8,067-character taxonomy; the proposal is a ~1,700-character bookended contract. The comparison is of _doctrine structure_, and must be read as an illustration of a design argument, **not as a measurement** — no calls were spent on it and nothing below is a result.

### 7.2 The shipped mode

[`custom_modes.d/debug/debugger.yaml`](../../custom-modes/custom_modes.d/debug/debugger.yaml:1) — slug `debugger`, name "🐛 Debugging Expert".

| Property             | Value                                                                                                                                                                                                                                                                                                                               |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `description`        | "Systematically troubleshoots code issues using breakpoints, logging, and root-cause analysis."                                                                                                                                                                                                                                     |
| `roleDefinition`     | 286 characters of persona ("You are an Expert debugger specializing in…")                                                                                                                                                                                                                                                           |
| `whenToUse`          | 162 characters, quoting the `roleDefinition` back to itself                                                                                                                                                                                                                                                                         |
| `customInstructions` | **~8,067 characters**: 22 headed sections, **170 list items**, 2 embedded JSON blocks                                                                                                                                                                                                                                               |
| Order                | persona → "when invoked" steps → checklist → **eight technique taxonomies** (error analysis, memory, concurrency, performance, production, tools, strategies, cross-platform) → JSON communication protocol → workflow → mindset → postmortem → knowledge management → preventive measures → agent integration → SPARC → tool usage |

The shape is a **taxonomy dump with the operative rules in the middle**: the two things that decide whether the mode behaves correctly — reproduce before fixing, and what counts as done — sit among 170 sibling bullets, while the beginning is persona and the end is generic tool advice.

### 7.3 The proposed contract

Same function, bookended structure (non-negotiables first, definition of done last), inside the target-state budget of ≤ 4k characters and ≤ 12 constraints [citation needed: we decided this somewhen/somewhere. Do we have a user-facing publication or report about this?]:

```
You debug. You find the cause of a failure and prove it; you do not describe the failure.

## Non-negotiables
1. Reproduce before you fix. A cause is not accepted without a command, test or trace
   that fails now and passes after.
2. State the cause in one sentence with evidence: file, symbol, and observed against
   expected.
3. Change one thing at a time and record what each change did.
4. If two hypotheses survive the evidence, say so and run the cheaper discriminating
   experiment.
5. Fix the reported failure. List adjacent defects; do not fix them.
6. Do not claim a fix works until the reproduction passes and the neighbouring tests
   still pass.
7. Read the code and the logs before adding instrumentation. Add logging only where
   evidence is missing.
8. State what you still do not know.

## Method
Reproduce → locate → explain → minimal fix → re-run the reproduction and the
neighbouring tests → report the diff.

## Handoff
If the failure depends on an environment, credential or data you cannot reach, name it,
say what you would run first with it, and stop.

## Definition of done
- [ ] reproduction recorded: failing before, passing after
- [ ] cause stated in one sentence, with evidence
- [ ] diff limited to the cause
- [ ] neighbouring tests re-run
- [ ] residual unknowns listed
```

### 7.4 The argument this comparison makes, and its status

Three structural claims, none of them measured:

1. **Position inside the contract is a design variable**, by analogy with §4.2: if ~29 points of behavioural difference can come from where a line sits in a 45-item list, the ordering inside a long instruction block is unlikely to be inert. This is an analogy, and the analogy is the weakest link in this section.
2. **Constraint count binds before character count** (the literature's finding, not ours): 170 list items is far past any plausible binding limit, so most of the shipped contract cannot be doing work.
3. **A definition of done is checkable; a mindset list is not.** Only the proposal ends with conditions that can be verified by reading the transcript.

**What would settle it:** a single-factor ablation of one mode — same model, same brief, same repository, contract order the only change — with the outcome being whether the fix holds under re-run. That is E22's job and cannot be scoped before the capability research answers whether doctrine effects are detectable at our budget.

---

## 8. Open items

1. **Second adjudication pass is incomplete.** Pass 1 covers all 378 adjudicated replies; pass 2 covers 50 (13.2%) — every declaration plus sampled asks — with **100% agreement**. The registration requires a full second pass with a published agreement rate. It should be run in a fresh session with no access to the join, the label map or the pass-1 file; the machinery is in place.
2. **Reversal needs replication.** §4.1 and §4.2 report effects whose sign contradicts the registration. The registration forbids re-running E20 without a new registration, so any replication needs one — preferably with a second brief, since one brief is a single point of the ambiguity space.
3. **The harm measure is underpowered.** 12% against 0% is the most policy-relevant number here and the least precise: E20b's design resolves ~19.8 points. A wrong-commit arm at n = 400 is the cheapest useful follow-up.
4. **Extractor v3 is needed** before any further round: 28 of 378 adjudicated replies (7.4%) were commitments the pinned parser missed, and the merge step cannot represent an adjudicated commitment to a non-`explain` slug (Annex G).
5. **Position × wording is untested by design.** If position matters as much as wording, the interaction may matter more than either and cannot be assumed additive.

[This is a very interesting report so far. I am very enthusiast of where it is going, and of seeing the final report after closing these items.]

---

## Annex A — Provenance, cost, and deviations

| Item                           | Value                                                                                                     |
| ------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Published E20 batch            | [`runs/e20-2026-11-17`](../../runs/e20-2026-11-17) — 900 records, 16M                                     |
| Published E20b batch           | [`runs/e20b-2026-11-16`](../../runs/e20b-2026-11-16) — 200 records, 3.7M                                  |
| Gate                           | [`runs/e20-gate-2026-11-16`](../../runs/e20-gate-2026-11-16) — 90 records, 1.9M                           |
| Aborted E20 attempt (excluded) | [`runs/e20-2026-11-16`](../../runs/e20-2026-11-16) — 781 records, 15M                                     |
| Closing round preserved        | [`runs/e13r-2026-11-12`](../../runs/e13r-2026-11-12) — 600 records, 600 prompts, 5.5M                     |
| Calls producing output         | **1,931** (90 gate + 741 aborted + 900 E20 + 200 E20b)                                                    |
| Cost                           | ≈ **€9.8** at €5.1 / 1,000 — rate-derived, not read from billing                                          |
| Wall clock                     | gate 13.2 min · E20 135.8 min · E20b 32.3 min · aborted attempt 106.9 min = **4.80 h**                    |
| Mean duration per call         | gate 8.83 s · E20 9.05 s · E20b 9.70 s; weighted **9.15 s** over 1,190 published calls vs 9.6 s estimated |

**Deviations, all recorded rather than smoothed:**

1. **The first E20 batch aborted** at 781/900 when prepayment credits were depleted (HTTP 402), leaving 40 `UNRUN` records (5.1%; 5.2% per long arm). Under §5 that batch refuses and publishes no estimate; it is preserved untouched. A **fresh full batch** was dispatched after top-up into a **new** directory, because the instrument has no resume path and a spliced tail would place a fixed block of failures inside the outcome sequence the runs test is meant to inspect.
2. **Pooling was declined**, and this is now evidenced rather than cautious: the two batches are independent draws (Annex F), so pooling would legitimately add information — it would move the primary contrast from 27.5 to 25.7 points and leave the verdict unchanged — but it breaks the registered n and would require adjudicating 223 more replies. The comparison is reported here instead.
3. **Cost overran the €6.3 estimate** because of the discarded partial batch (741 paid calls ≈ €3.8). [Maybe we shouldn't publish the costs incurred.]

## Annex B — Gate table (Amendment 2 §1, first 90 draws)

| Arm       | Draws | Excluded | Exclusion rate | Longest identical `transcript.sha256` run | Declared | Extractor-null |
| --------- | ----- | -------- | -------------- | ----------------------------------------- | -------- | -------------- |
| ARM-1 (B) | 40    | 0        | 0.0%           | 1                                         | 19       | 21             |
| ARM-2 (A) | 10    | 0        | 0.0%           | 1                                         | 7        | 3              |
| ARM-3 (C) | 40    | 0        | 0.0%           | 1                                         | 32       | 8              |

Thresholds: exclusion > 5% in any arm, or longest verbatim run > 5. **Neither fired.**

## Annex C — Outcome counts, mechanical against adjudicated

**E20** (brief: _Explain why this module is structured the way it is._)

| Arm   | Line      | n   | Mechanical declared | Adjudicated declarations | Final declared key | Asked | Wrong commit | Appropriate |
| ----- | --------- | --- | ------------------- | ------------------------ | ------------------ | ----- | ------------ | ----------- |
| ARM-1 | B (96 ch) | 400 | 237                 | +9                       | **246 (61.5%)**    | 154   | 0            | 100%        |
| ARM-2 | A (50 ch) | 100 | 73                  | +2                       | **75 (75.0%)**     | 25    | 0            | 100%        |
| ARM-3 | C (99 ch) | 400 | 344                 | +12                      | **356 (89.0%)**    | 44    | 0            | 100%        |

**E20b** (same brief, line held at B)

| Arm   | Position        | n   | Mechanical declared         | Adjudicated declarations | Final declared key | Asked | Wrong commit | Appropriate |
| ----- | --------------- | --- | --------------------------- | ------------------------ | ------------------ | ----- | ------------ | ----------- |
| ARM-2 | index 0 (first) | 100 | 15                          | +1                       | **16 (16.0%)**     | 84    | 0            | 100%        |
| ARM-1 | index 44 (last) | 100 | 53 (42 `explain`, 11 other) | +4                       | **45 (45.0%)**     | 43    | **12**       | 88%         |

> The merge tool prints 46 declared / 11 wrong for ARM-1 because the verdict vocabulary carries no slug and counts an adjudicated declaration as a declared key. The reply in question named `architecture-reviewer`, so it is a wrong commit. The corrected split is shown above and is used in every test.

## Annex D — Pre-declared statistical tests

| Contrast                                                 | Declared rates | Difference    | 95% CI         | Exact two-sided _p_ | Holm-adjusted |
| -------------------------------------------------------- | -------------- | ------------- | -------------- | ------------------- | ------------- |
| **E20 primary: B vs C**                                  | 61.5% vs 89.0% | **−27.5 pts** | [−33.1, −21.7] | 7.1 × 10⁻²⁰         | < 10⁻¹⁹       |
| E20 secondary: A vs B _(length-confounded, descriptive)_ | 75.0% vs 61.5% | +13.5 pts     | [+3.1, +22.4]  | .0141               | .0141         |
| **E20b: P1 vs P45**                                      | 16.0% vs 45.0% | **−29.0 pts** | [−40.4, −16.4] | 1.3 × 10⁻⁵          | 1.3 × 10⁻⁵    |
| E20b harm: wrong commits P45 vs P1                       | 12.0% vs 0.0%  | +12.0 pts     | —              | 3.4 × 10⁻⁴          | —             |

Holm within each experiment (E20: two tests, primary evaluated at α = .025; E20b: one). Minimum detectable difference: **~10 points at n = 400**; **~19.8 points at n = 100**.

## Annex E — Runs tests (outcome dependence)

| Arm         | Runs observed | Runs expected | z     | _p_ |
| ----------- | ------------- | ------------- | ----- | --- |
| ARM-1 (B)   | 193           | 190.42        | 0.27  | .79 |
| ARM-2 (A)   | 37            | 38.50         | −0.40 | .69 |
| ARM-3 (C)   | 81            | 79.32         | 0.43  | .67 |
| ARM-2 (P1)  | 31            | 27.88         | 1.18  | .24 |
| ARM-1 (P45) | 52            | 50.50         | 0.30  | .76 |

No arm shows sequence dependence. This is the guard the verbatim check cannot provide.

## Annex F — Run-to-run concordance (same prompts, two dispatches)

| Arm | Overlapping draws | Same commit/ask outcome | Chance-level agreement | Identical transcript |
| --- | ----------------- | ----------------------- | ---------------------- | -------------------- |
| B   | 329               | 175 (53.2%)             | 51.7%                  | 0 (0.0%)             |
| A   | 83                | 45 (54.2%)              | 55.3%                  | 0 (0.0%)             |
| C   | 329               | 234 (71.1%)             | 73.5%                  | 0 (0.0%)             |

Agreement at chance and zero verbatim repetition together establish that calls are independent samples. This is a free by-product of the aborted batch and is the strongest available statement about `temperature: 0` on this model.

## Annex G — Adjudication protocol and recorded defects

| Item                | Value                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------- |
| Replies adjudicated | 378 (E20 246 of 900; E20b 132 of 200)                                                    |
| Pass 1              | 246 + 132 verdicts; E20 **23 DECLARATION / 223 ASK**; E20b **5 DECLARATION / 127 ASK**   |
| Pass 2 coverage     | 50 of 378 (13.2%) — all 28 declarations plus 22 sampled asks — **100% agreement**        |
| Blindness assertion | **PASS** on both packets: no arm label, no run id, no timestamp, no registered line text |
| Join discipline     | outside the packet directory; opened only after every verdict was recorded               |

**Defect 1 — the pinned extractor misses commitments.** 28 of 378 (7.4%) were commitments it could not parse: bare slug, bare backticked slug, `**mode: slug**`, unbolded `Selected mode:`, slug followed by prose. All but one named `explain`.

**Defect 2 — the merge cannot represent an adjudicated wrong commit.** [`mergeJudgements`](../../scripts/lib/adjudication.mjs:535) counts every adjudicated `DECLARATION` as a declared key, justified by the claim that a non-key slug "never reaches the packet". That held in E20 and failed once in E20b. Any published table must carry the corrected split (Annex C).

**Defect 3 — the registration is sign-blind in its thresholds and sign-specific in its readings.** §6 supplies a reading for "≥ 20 points" that asserts a direction. A reversed ≥ 20-point result therefore has no pre-registered reading. Recorded as a gap in the registration, not as evidence for the original hypothesis.

**Note — vocabulary size.** The sealed key carries **45** slugs; registration §4.2 describes the union as **47**. No declaration was affected (the vocabulary used is the one the key supplies, which is what the extractor was given), but the fixture and the registration disagree and one of them should be corrected before re-sealing.
