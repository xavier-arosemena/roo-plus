# Routing report (E17 draft) — does the picker's wording or its order decide whether a model commits?

| Field                | Value                                                                                                                                                                                                                   |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**           | **Draft for review.** Not a release note; numbers are final, interpretation is open to challenge                                                                                                                        |
| **Built from**       | E21 (closing round, 598/600 appropriate), E20 (artefact polarity, 900 calls), E20b (position, 200 calls), E20c (slot occupant, 600 calls)                                                                               |
| **Evidence**         | [`runs/e20-2026-11-17`](../../runs/e20-2026-11-17) · [`runs/e20b-2026-11-16`](../../runs/e20b-2026-11-16) · [`runs/e20c-2026-11-17`](../../runs/e20c-2026-11-17) · [`runs/e13r-2026-11-12`](../../runs/e13r-2026-11-12) |
| **Registration**     | [`2026-11-13-e20-preregistration.md`](2026-11-13-e20-preregistration.md:1), Amendments 1 and 2; [`2026-11-17-e20c-preregistration.md`](2026-11-17-e20c-preregistration.md:1)                                            |
| **Canonical record** | [`modes-experiment-log.md` §23](../research/modes-experiment-log.md:809) — every E20c figure in this report is taken from there or from `runs/`                                                                         |
| **Calls paid**       | 2,591 output-producing calls in the E20 family; **3,191 across the whole programme including the closed round**, ≈€16.3. Cost, wall clock and deviations are in Annex A                                                 |

---

## 0. What to take away

1. **Wording decides.** With the brief, the model and the position of the entry held fixed, changing only what the line requires moved commitment by **27.5 points** (89.0% against 61.5%). That is far beyond the ~10-point resolution of the design. Every arm stayed at 100% "appropriate": what changed was commit versus ask, not which mode was chosen.
2. **The first entry is penalised; the last slot is not a magnet.** E20b measured a 29.0-point gap between the first and the last entry. E20c then changed only **who occupied the last entry**, and a plausible rival placed there gained nothing (**1 against 1**, zero points). Read together, the gap is mostly a penalty for occupying the first entry (E20b, exploratory) rather than a reward for the last (E20c, registered).
3. **Order has a cost that wording does not.** The last entry produced **12% wrong commits**; the first produced **none**. Commitment is not the same thing as correct commitment.
4. **Every contrast here is within one run.** The same condition on an identical prompt scored **47.0% in E20c** and **59.3% in E20** — 12.3 points apart, z = 2.85. The practical resolution is about **12 points of batch noise**, not the 10 the power calculation promised. Within-run contrasts stand; comparisons across batches do not exist for this programme.
5. **Nothing here is reproducible per request.** The same prompt at `temperature: 0`, run hours apart, produced **zero** byte-identical transcripts and matched its own commit/ask outcome only at chance (~53–71%). A mode that works once may ask next time.

---

## 1. What we are trying to assess

### 1.1 The user-facing situation

The catalogue offers 45 modes. What the model receives is a **picker**: one line per mode — slug, name, `whenToUse` — in file order, about 45 entries. A mode's **position** is simply which line it occupies. This report names positions by what they are ("the first entry", "the seventh entry", "the last entry") rather than by number; a reader who needs the fixture's own zero-based numbering will find it in Annex H, which is the only place it appears.

From that list and the user's request, the model must decide whether to **commit** to one mode or **ask** for what the request left out. The closing round showed that on an unambiguous brief the model commits almost always (598 of 600 appropriate). The interesting regime is therefore the _ambiguous_ brief, which is the only regime in which the picker line can matter.

### 1.2 The experiments at a glance

Four experiments carry this report. Each varies one thing and holds the others fixed, which is the reason they can be read separately at all.

| Experiment                | What varied                                                                                    | What was held                                          | n               |
| ------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------ | --------------- |
| **E13-R** (closing round) | the wording of the line, six cells                                                             | position, brief, model                                 | 6 × 100         |
| **E20**                   | the line's requirement: artefact absent, artefact stated, artefact excluded                    | position (the seventh entry), brief, model             | 400 / 400 / 100 |
| **E20b**                  | the position of `explain`: first entry against last entry                                      | the line, brief, model                                 | 100 / 100       |
| **E20c**                  | the occupant of the last entry: its original mode, a non-competing filler, the plausible rival | `explain` at the seventh entry, its line, brief, model | 200 / 200 / 200 |

### 1.3 Two candidate mechanisms

There are exactly two levers an author controls when publishing a picker:

- **Wording** — what the `whenToUse` line says.
- **Order** — where the mode sits in the list the model reads.

Prior work left both unsettled. The label-form literature documents polarity at _request_ level but never inside a _selection list_. The only factor-isolated tool-selection study reports the first-listed entry being chosen in 78.7–96.0% of trials — larger than any label effect ever measured — as summarised in [`modes-label-form-2026-11.md`](../research/modes-label-form-2026-11.md:35). Our own numbers had never been tested against it: **E20b was the first experiment in which list order was varied; the closing round had held it fixed.**

### 1.4 The three questions this report has to answer

1. **Does the wording of a line change whether the model commits or asks?**
2. **Does the position of a line change it?**
3. **What does commitment cost?** Specifically: does the model commit to the _right_ mode, or merely to _a_ mode?

### 1.5 What counts as an answer

Fixed before the data (registration §5–§6): exact Fisher tests on pre-declared contrasts, Holm-corrected within each experiment; a difference of **≥ 20 points** with adjusted _p_ < .025 counts as an effect, **< 10 points** counts as no detectable effect, and the band between them is recorded as indecisive and not re-run without a new registration. The E20c registration reuses the same band, so a shift inside 10–20 points there is recorded as indecisive rather than as an effect, and states its own smallest detectable difference as **14.0 points** at 200 draws per arm.

The E20 design resolves about **10 points** at n = 400 per arm and about **19.8 points** at n = 100. Those rulers are per contrast within a run; §4.6 shows that the batch-to-batch ruler is coarser.

---

## 2. What we measured and how

### 2.1 The wording arm (E20)

One slug (`explain`), one entry name, one brief, one position (the seventh entry), three lines that differ only in what they say about evidence:

| Arm   | Line                                                 | Length | Role                                |
| ----- | ---------------------------------------------------- | ------ | ----------------------------------- |
| **A** | `Use when someone asks why code behaves as it does.` | 50 ch  | Artefact absent — **baseline only** |
| **B** | `…and the answer must cite evidence, not recall.`    | 96 ch  | Artefact **stated**                 |
| **C** | `…and the answer must not merely describe the code.` | 99 ch  | Artefact **excluded**               |

Brief, identical in all three arms: _"Explain why this module is structured the way it is."_

**B vs C is the primary contrast and it is length-matched** (96 against 99 characters; three characters apart). A vs B differs by 46 characters and therefore cannot separate "states an artefact" from "is longer" — it is reported as a magnitude with that confound named, and can never falsify anything on its own.

Draws: A = 100, B = 400, C = 400, interleaved on the registered nine-call cycle `A B C B C B C B C` repeated 100 times. `temperature: 0`, recorded but not assumed deterministic.

### 2.2 The position arm (E20b)

Same slug, same brief, line held at B. `explain` placed at the **first entry** or the **last entry** of the 45-entry picker. 100 draws per arm, interleaved two-call cycles.

### 2.3 The slot-occupant arm (E20c)

E20b moved `explain` to an extreme, which changed three things at once: its own position, its neighbours, and the position of every other mode. E20c isolates the one alternative that would change the advice — whether the **last slot** attracts selection whoever occupies it.

600 calls, 200 per arm, all `RUN`. `explain` stayed at the **seventh entry** with line B in all three arms; only the **occupant of the last entry** changed, and it changed by a **swap**, so the list kept its length and no other entry moved.

| Arm   | Last entry holds              | Role                                                                             |
| ----- | ----------------------------- | -------------------------------------------------------------------------------- |
| **X** | `ai-cost-engineer` (original) | Control — the same condition as E20's arm B, at a later date                     |
| **Y** | `documentation`               | Non-competing filler for this brief: does any move to the end disturb `explain`? |
| **Z** | `architecture-reviewer`       | Plausible rival: does the last slot pull selection towards its occupant?         |

### 2.4 The measurement contract

Replies are **unconstrained** — no `MODE:` slot, because a labelled slot presents a choice where the model might otherwise ask and would bias the very ask rate being measured. Extraction is `routing-round-parser/2`, pinned; every reply it cannot resolve goes to **hand adjudication**, blind: the packet carries a hashed id, the brief and the reply, with no arm, draw or timestamp, and the id-to-run mapping stays outside the packet until every judgement is recorded. Judgements are `DECLARATION`, `ASK` or `OTHER`, with the tie-break fixed in advance: a declaration marker anywhere makes it a `DECLARATION` even if the reply asks afterwards.

### 2.5 Instrument proof (this is what licenses reading the numbers)

| Check                                     | Result                                                                                              |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Mid-run gate at 90 draws (Amendment 2 §1) | exclusion **0.0%** in all three arms; longest identical verbatim run **1** (threshold 5)            |
| Excluded records, published batches       | **0 of 1,700**; every record `finishReason: STOP`                                                   |
| Verbatim clustering                       | longest identical-transcript run **1** in all five E20/E20b arms; 879/900 and 193/200 distinct      |
| E20c verbatim clustering                  | **192–198 of 200** distinct transcripts per arm; no arm clusters                                    |
| Interleaving                              | **899 transitions across 900 calls**, **199 across 200**, and **599 across 600**; max concurrency 1 |
| Token cap / model                         | one value, 4096, throughout; `gemini-3.5-flash`; `temperature: 0`                                   |
| Runs test on each arm's outcome sequence  | B _p_ = .79 · A _p_ = .69 · C _p_ = .67 · P1 _p_ = .24 · P45 _p_ = .76 — no outcome dependence      |

Two instrument numbers are deliberately **not** results. The 60-draw E20c gate produced declaration rates of X 65.0%, Y 45.0%, Z 65.0%, which invert two arms relative to the sweep: the gate exists for exclusion and verbatim clustering only, and its rates are 20-draw noise (Annex H, D-20). And 21 of the 600 E20c replies are a bare slug, which the pinned extractor cannot resolve; they are corrected by rule in §3.5, so every E20c mechanical count is a lower bound (D-19).

Costs, wall clock and deviations are in Annex A. They are published because every finding here is credible partly because the cost of finding it is visible.

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

### 3.4 The position arm (E20b)

**P1 (first entry) 16.0% against P45 (last entry) 45.0% — 29.0 points, last ahead** (95% CI 16.4–40.4; exact _p_ = 1.3 × 10⁻⁵).

Two details matter more than the headline:

- **Both arms stayed "appropriate" at or near saturation** — P1 100%, P45 88%. The model almost never chose an unrelated mode; it either committed or asked.
- **All the harm is in the last position: 12 wrong commits of 100 against 0 of 100** (exact _p_ = 3.4 × 10⁻⁴). Twelve of those replies named some other mode outright rather than asking.

### 3.5 The slot-occupant arm (E20c)

`explain` sat at the seventh entry in all three arms with the same line. Only the last entry's occupant changed.

| Arm | Last entry holds                | `explain` declared (mechanical) | Bare-slug correction | Corrected             | Undetermined |
| --- | ------------------------------- | ------------------------------- | -------------------- | --------------------- | ------------ |
| X   | `ai-cost-engineer` (original)   | 94 / 200 = 47.0%                | +3                   | **98 / 200 = 49.0%**  | 105          |
| Y   | `documentation` (non-competing) | 120 / 200 = 60.0%               | +10                  | **130 / 200 = 65.0%** | 80           |
| Z   | `architecture-reviewer` (rival) | 143 / 200 = 71.5%               | +8                   | **152 / 200 = 76.0%** | 56           |

The registered readings, in the order they were fixed:

1. **Rival capture (Z against X): 1 against 1 — zero points.** The registered reading applies: _the last slot is not a general magnet; a rival placed there gains nothing._ E20b's effect therefore belongs to `explain` occupying the end, not to the slot.
2. **Explain shift (Y against X): +13.0 points mechanical, +16.0 corrected.** Both sit inside the registered **10–20 indecisive band** — neither supported nor refuted, and not re-run without a new registration.
3. **Unregistered and larger than both: Z against X on `explain` is +24.5 mechanical, +27.0 corrected.** Moving the _rival_ to the end released the target by more than moving a filler did. No reading exists for it, and none is manufactured here.

The gate and the extractor both constrain what can be quoted from this table. At the 60-draw gate the arms read X 65.0%, Y 45.0%, Z 65.0%, an ordering that inverts two arms against the sweep; those rates are not quotable (D-20). 21 replies consisting of a bare slug were scored undetermined and corrected by rule, unevenly (X 3, Y 10, Z 8); 220 further replies remain undetermined pending adjudication, so every mechanical count here is a **lower bound** (D-19).

### 3.6 Reliability: `temperature: 0` is not reproducibility

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

E20 targeted the 10–20 point band that the earlier design could not resolve. At 400 draws per arm that band is inside the ruler, so a difference there counts as an effect rather than an indecisive reading. E20 found one at 27.5 points, with a confidence interval that excludes any reading below 21 points. **The effect is large and its direction is clear; it is the prediction's sign that was wrong.** The programme's hypothesis — that a line stating a required artefact pulls commitment towards the mode — failed in the direction it was stated. What actually pulled commitment was a line that **excluded** an artefact.

The most parsimonious description: a line that says _"not merely describe the code"_ reads as a **prohibition to be complied with**, and prohibition is a stronger instruction than a requirement to include something. This is consistent with the negotiation behaviour seen in the adjudication: replies that ask are overwhelmingly replies that cannot decide _between_ modes, and a prohibition narrows the field.

### 4.2 Position: the first entry is penalised (exploratory)

29.0 points against 27.5. A design that varied wording while holding position fixed — which is every earlier round here — was measuring an effect **of the same order and not distinguishable at these precisions** from the one it held constant.

E20c then changed the occupant of the last entry and found no pull, which forces the E20b gap to be re-read. With the rival held away from the end, `explain` declared **15–16% at the first entry, 47–49% at the seventh and 42–45% at the last**. Seventh and last sit within a few points of each other; the first sits about thirty points below both. The 29-point "first versus last" gap is therefore mostly **a penalty for occupying the first entry**, not a reward for the last. This decomposition is **exploratory**, not confirmatory: it leans on a comparison between batches, which §4.6 rules out of the ordinary reading, and the seventh-entry figure comes from E20c rather than from E20b.

The direction contradicts the literature's 78.7–96.0% first-listed dominance. We cannot say why from this data. Two candidates, both testable: (i) the model reads the list as a set of _candidate descriptions_ rather than an ordered menu, so position carries no preference and the last line read is the most recent context; (ii) recency within the prompt — the last line is nearest the request. Neither is established here, and the registration deliberately did not cross position with wording (§8).

### 4.3 E20c: the last slot is not a magnet

The registered question was whether the **slot** attracts traffic whoever occupies it. The registered answer is no: moving a plausible rival to the end produced **one declaration against one**, zero points, and the frozen reading applies verbatim — _the last slot is not a general magnet; a rival placed there gains nothing_. The catalogue advice "put the recommended mode at the end" therefore does not survive; what survives is the weaker and stranger statement that the **first** entry is expensive.

The secondary contrast came in at +13.0 mechanical and +16.0 corrected for `explain` when a non-competing filler moved to the end. That is inside the 10–20 band, so it is recorded as indecisive: the composition of the list may matter a little, but this design cannot say so.

The third number has no registered reading and is the largest of the three: moving the **rival** to the end raised `explain` by **+24.5 mechanical, +27.0 corrected**. It sits awkwardly beside the null on rival capture — the rival did not win, but the target gained — and this report does not choose an explanation for it. It is recorded, with its magnitude, as a result the registration cannot classify.

### 4.4 Commitment is not correctness

The last position bought 29 points of commitment and paid for it with 12 points of wrong commits. The first position bought 0 wrong commits and a great deal of asking. For a catalogue whose worst outcome is _acting in the wrong mode_, that trade is not obviously favourable, and it is the one policy-relevant number in this report that is measured rather than inferred.

### 4.5 Consequences for earlier readings

By the pre-committed reading for a ≥ 20-point position effect, **the routing conclusion must be restated as being about list order**, and every earlier label-form reading is demoted to _"measured at an uncontrolled position."_ That demotion applies to this programme's own earlier results, including the closing round's label-form contrast.

### 4.6 Batch drift: every claim is within-run, and the resolution is about 12 points

Arm X of E20c is the **same condition** as E20's arm B: identical picker, line, brief, model and index. It scored **47.0% against 59.3% — 12.3 points apart, z = 2.85**. That is a batch-to-batch difference on an identical prompt, not sampling error, and it is larger than the ~10-point resolution the power calculation promised.

Three consequences follow, and they are not negotiable:

1. **Every contrast this programme may claim is within one run** — E20's B vs C, E20b's first vs last, E20c's three arms. Those stand.
2. **Comparisons across batches do not exist.** Any sentence of the form "this batch showed X, that batch showed Y, therefore Z" is unavailable, which is why §4.2's decomposition and the comparison of arm X with E20's arm B are flagged exploratory rather than read as effects.
3. **The practical resolution is about 12 points of batch noise before any effect is measured.** A 10-point claim cannot be made from a comparison that crosses batches.

This is the honest answer to "is this a reliable system". Per request it is not: the same request matched its own outcome only at chance (§3.6). Per batch it is not stable either: an identical condition moved 12.3 points. What is reliable is narrower — a within-run contrast that clears the band, measured on one model and one brief, and interpreted as a direction rather than a rate.

---

## 5. What this does not mean

- **Not a confirmation.** The primary result is a result the registration cannot classify; the interpretation is exploratory.
- **Not a null result either.** The effect is measured, replicated in direction by a second wording arm, and its magnitude is well outside the ruler. What is missing is a pre-registered reading, not an effect.
- **Not about humans.** Every inference is about one model on one brief. No claim is made about human selection from the same picker.
- **Not about interaction.** Position and polarity were deliberately not crossed; nothing here says what their combination does. §8 lists that as the next experiment rather than as a finding.
- **Not generalisable across positions — including E20's own claim.** The polarity contrast was measured with the line held at **the seventh entry in all three arms**. It is a valid statement _at that position_ and nowhere else. By the same rule §4.5 applies to earlier work, this report's own wording result is **position-controlled, not position-randomised**; it must not be read as "C beats B wherever C sits".
- **Not a fix for a vague brief.** Every arm in E20 stayed at 100% "appropriate". The manipulations changed _whether the model committed_, not whether it stayed out of unrelated modes.
- **Not resolution at 10 points.** Effects below ~10 points remain out of reach at n = 400 and below ~19.8 points at n = 100 (E20b), and about 12 points of batch noise sits above that ruler for any claim that crosses batches (§4.6).
- **Not adjudicated beyond the bare-slug rule in E20c.** 21 replies consisting of a bare slug were corrected by rule; the remaining 220 undetermined replies await a blind adjudication pass, so every E20c count in §3.5 and Annex H is a lower bound.
- **Not one model's general behaviour.** Every number here is one model (`gemini-3.5-flash`) and one brief. The literature's 78.7–96.0% position result came from five models on tool selection; model-specificity is untested here. A second provider is provisioned, and replicating one contrast on it would test this.

---

## 6. Advice, for users and for mode authors

Everything below follows from a measured number, and where it does not, it says so.

### 6.1 If you are choosing a mode (as a user)

1. **Assume the picker is doing some of the choosing for you.** Two systems with identical instructions but different list order committed at 16% and 45% on the same request. If two modes look plausible for your task, name the outcome you want in the request ("find the cause and prove it" versus "map the dependencies") rather than relying on the mode you clicked.
2. **A clarifying question is not a failure.** Across the 900 calls of the E20 wording arms the model never selected an unrelated mode; when it did not commit, it asked. That is not a general property of this system: E20c produced 2 wrong commits in 600 calls and E20b's last-entry arm produced 12 in 100. Asking is not free — it costs the user a turn — but it is usually cheaper than a wrong commit.
3. **Do not expect the same answer twice.** The same request, same model, same settings, hours apart matched its own commit/ask outcome only at chance. A retry is a fresh sample, not a repeat.

### 6.2 If you are writing `whenToUse` lines (as an author)

1. **Make lines mutually exclusive, not merely descriptive.** The ask regime is dominated by candidate lists: replies that ask are replies that cannot separate `explain`, `architecture-reviewer`, `codebase-cartographer` and `decision-record`. Two lines that both plausibly cover "why is this like this" manufacture asking.
2. **Do not expect "must include X" to increase commitment.** It did the opposite of what our registration predicted. A line that excludes something ("not merely describe the code") read as the stronger instruction. This is one brief and one model — treat it as a hypothesis, not a rule.
3. **Do not promote a mode by moving it to the end.** E20c moved a rival into the last slot and the rival gained nothing (1 against 1). E20b's advantage came from the first entry being penalised, not from the last being favoured. Placement is still load-bearing — the first entry is the expensive one — but "put it last" is not the lever.
4. **Weigh placement by harm, not by commitment.** The last position committed 29 points more and produced 12% wrong commits against none at the first. If a mode is expensive to invoke wrongly, placement that suppresses wrong commits is worth more than placement that maximises uptake.
5. **Do not expect length alone to decide.** The 50-character line committed more than the 96-character line (75.0% against 61.5%) and less than the 99-character one (89.0%), so length does not order the arms; the 96-versus-99 contrast is length-matched, which is why the polarity reading rests on it and the length reading does not exist.

---

## 7. Turning the results into a line

This section is **guidance derived from the results above, with their caveats attached** — not a validated recipe. The wording evidence comes from one model, one brief and one position (the seventh entry), at 400 draws per arm; §4.2 and §4.6 say how little of it survives being moved or re-batched. Read the rules as constraints on what an author may claim, not as a method that produces commitment.

### 7.1 Four rules, each tied to a number

| Rule                                                                            | The number behind it                                                                                                                                                                             |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Make the line discriminate against its neighbours, not state a quality bar.** | C out-committed B by 27.5 points while every arm stayed at 100% "appropriate". The lever moved commit-versus-ask; it did not change which mode was chosen.                                       |
| **Do not add a requirement clause the other modes could also satisfy.**         | A (50 characters, artefact absent) out-committed B (96 characters, artefact stated) at 73–75% against 59–62%. Adding a requirement clause did not help; the clause that helped was an exclusion. |
| **Do not rely on placing your mode at the end.**                                | E20c changed only the last entry's occupant and the rival gained **zero points** (1 against 1). The slot is not a magnet.                                                                        |
| **Expect the first entry to be penalised.**                                     | E20b: `explain` declared 15–16% at the first entry against 42–49% at the seventh and last (exploratory, §4.2).                                                                                   |

### 7.2 A skeleton

```
Use when <the situation in which this mode, and not its nearest neighbour, owns the outcome>,
and the answer must not <the thing the neighbouring modes produce instead>.
```

The gaps are deliberate. `<…>` is a placeholder, not text to publish. The first gap names a trigger narrow enough that a neighbouring line does not also match it; the second names an exclusion the neighbours do not impose — which is the form that measured 27.5 points ahead of the same clause stated as a requirement (line C against line B).

### 7.3 One worked example

The measured line C, annotated:

> `Use when someone asks why code behaves as it does, and the answer must not merely describe the code.` (99 characters)

- **The trigger** — "why code behaves as it does" — names a situation rather than a quality ("expert explanation"). It is the form line C took; because C and B differ only in their second clause, the 27.5-point gap between them belongs to the exclusion, not to the trigger.
- **The exclusion** — "not merely describe the code" — names what the answer must avoid, which is the form that measured 27.5 points ahead of the equivalent requirement (C 89.0% against B 61.5%, length-matched at 99 against 96 characters). Read as a design instruction, it is the one clause in the line that a neighbouring mode's line would not also satisfy.
- **What it does not do** — it does not claim the answer must cite evidence. That clause (line B) committed **least** of the three (61.5%), and it is a requirement other modes could satisfy.
- **What it costs** — nothing here says this line would win from the first entry. Line B — the same clause family, held as the wording in E20b — declared 15–16% at the first entry and 42–49% at the seventh and last (E20b, exploratory); placement can swamp wording, and E20c says the fix is not to move the line to the end.

---

## 8. Recommended next experiments

These are the four that would change what this report can say. All of them are within-run designs; none requires new machinery.

1. **`explain` at the first entry with the rival at the last.** E20c found that the rival gains nothing at the end (1 against 1) yet `explain` gains 24.5 mechanical / 27.0 corrected when the rival moves there, and E20b's 29-point gap may be a first-entry penalty. One arm with `explain` first and `architecture-reviewer` last, against a control in the same batch, separates "the first entry penalises" from "a rival at the end releases the target".
2. **A second brief.** Everything here is one point in ambiguity space. A brief with a different ambiguity shape — two plausible modes that are not neighbours — would test whether the 27.5-point polarity is a property of the line or of this request.
3. **One contrast on a second model.** A second provider is provisioned. Replicating the B-versus-C contrast on it would test the caveat in §5 that all of this is one model, which is also the caveat on the literature's five-model position result.
4. **Position crossed with wording.** Neither lever has been tested in the presence of the other. The registration forbids re-running E20 without a new one, so this needs a fresh registration — and, given §4.6, all arms in a single batch.

---

## 9. Open items

1. **Second adjudication pass is incomplete.** Pass 1 covers all 378 adjudicated E20 replies; pass 2 covers 50 (13.2%) — every declaration plus sampled asks — with **100% agreement**. The registration requires a full second pass with a published agreement rate. It should be run in a fresh session with no access to the join, the label map or the pass-1 file; the machinery is in place.
2. **E20c has no adjudication pass at all yet.** 241 replies are undetermined, of which 21 bare slugs are corrected by rule; the packet is built and unopened. Until it is adjudicated, §3.5's counts are lower bounds.
3. **The reversal needs replication within one batch.** §4.1 reports an effect whose sign contradicts the registration, and §4.6 shows that a cross-batch replication would be unreadable. Any replication needs a new registration — preferably with a second brief, since one brief is a single point of the ambiguity space.
4. **The harm measure is underpowered.** 12% against 0% is the most policy-relevant number here and the least precise: E20b's design resolves ~19.8 points. A wrong-commit arm at n = 400 is the cheapest useful follow-up.
5. **Extractor v3 is needed** before any further round: 28 of 378 adjudicated replies (7.4%) were commitments the pinned parser missed, and 21 of 600 E20c replies were bare slugs. The merge step also cannot represent an adjudicated commitment to a non-`explain` slug (Annex G).

---

## Annex A — Provenance, cost, and deviations

The costs are published because every finding here is credible partly because the cost of finding it is visible: a programme that hides its spend is asking to be believed on trust.

| Item                           | Value                                                                                                                                                                |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Published E20 batch            | [`runs/e20-2026-11-17`](../../runs/e20-2026-11-17) — 900 records, 16M                                                                                                |
| Published E20b batch           | [`runs/e20b-2026-11-16`](../../runs/e20b-2026-11-16) — 200 records, 3.7M                                                                                             |
| Published E20c batch           | [`runs/e20c-2026-11-17`](../../runs/e20c-2026-11-17) — 600 records, 600 `RUN`                                                                                        |
| Gate (E20)                     | [`runs/e20-gate-2026-11-16`](../../runs/e20-gate-2026-11-16) — 90 records, 1.9M                                                                                      |
| Gate (E20c)                    | [`runs/e20c-gate-2026-11-17`](../../runs/e20c-gate-2026-11-17) — 60 records, exclusion and clustering only                                                           |
| Aborted E20 attempt (excluded) | [`runs/e20-2026-11-16`](../../runs/e20-2026-11-16) — 781 records, 15M                                                                                                |
| Closing round preserved        | [`runs/e13r-2026-11-12`](../../runs/e13r-2026-11-12) — 600 records, 600 prompts, 5.5M                                                                                |
| Calls producing output         | **2,591** (90 gate + 741 aborted + 900 E20 + 200 E20b + 60 E20c gate + 600 E20c). The closed round's **600** are excluded here and are accounted in log §23 and §5.1 |
| Cost                           | ≈ **€13.2** at €5.1 / 1,000 — rate-derived, not read from billing                                                                                                    |
| Wall clock                     | gate 13.2 min · E20 135.8 min · E20b 32.3 min · aborted attempt 106.9 min · E20c gate 9.3 min · E20c 100.0 min = **6.62 h**                                          |
| Mean duration per call         | gate 8.83 s · E20 9.05 s · E20b 9.70 s · E20c 10.00 s; weighted **9.43 s** over 1,850 published calls vs 9.6 s estimated                                             |

**Deviations, all recorded rather than smoothed:**

1. **The first E20 batch aborted** at 781/900 when prepayment credits were depleted (HTTP 402), leaving 40 `UNRUN` records (5.1%; 5.2% per long arm). Under §5 that batch refuses and publishes no estimate; it is preserved untouched. A **fresh full batch** was dispatched after top-up into a **new** directory, because the instrument has no resume path and a spliced tail would place a fixed block of failures inside the outcome sequence the runs test is meant to inspect.
2. **Pooling was declined**, and this is now evidenced rather than cautious: the two batches are independent draws (Annex F), so pooling would legitimately add information — it would move the primary contrast from 27.5 to 25.7 points and leave the verdict unchanged — but it breaks the registered n and would require adjudicating 223 more replies. The comparison is reported here instead.
3. **Cost overran the combined €9.4 estimate** for E20 and E20c (€6.3 + €3.1) because of the discarded partial batch (741 paid calls ≈ €3.8) and because E20c's published batch ran 100.0 minutes.

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

| Arm   | Position    | n   | Mechanical declared         | Adjudicated declarations | Final declared key | Asked | Wrong commit | Appropriate |
| ----- | ----------- | --- | --------------------------- | ------------------------ | ------------------ | ----- | ------------ | ----------- |
| ARM-2 | first entry | 100 | 15                          | +1                       | **16 (16.0%)**     | 84    | 0            | 100%        |
| ARM-1 | last entry  | 100 | 53 (42 `explain`, 11 other) | +4                       | **45 (45.0%)**     | 43    | **12**       | 88%         |

> The merge tool prints 46 declared / 11 wrong for ARM-1 because the verdict vocabulary carries no slug and counts an adjudicated declaration as a declared key. The reply in question named `architecture-reviewer`, so it is a wrong commit. The corrected split is shown above and is used in every test.

## Annex D — Pre-declared statistical tests

| Contrast                                                 | Declared rates | Difference    | 95% CI         | Exact two-sided _p_ | Holm-adjusted |
| -------------------------------------------------------- | -------------- | ------------- | -------------- | ------------------- | ------------- |
| **E20 primary: B vs C**                                  | 61.5% vs 89.0% | **−27.5 pts** | [−33.1, −21.7] | 7.1 × 10⁻²⁰         | < 10⁻¹⁹       |
| E20 secondary: A vs B _(length-confounded, descriptive)_ | 75.0% vs 61.5% | +13.5 pts     | [+3.1, +22.4]  | .0141               | .0141         |
| **E20b: P1 vs P45**                                      | 16.0% vs 45.0% | **−29.0 pts** | [−40.4, −16.4] | 1.3 × 10⁻⁵          | 1.3 × 10⁻⁵    |
| E20b harm: wrong commits P45 vs P1                       | 12.0% vs 0.0%  | +12.0 pts     | —              | 3.4 × 10⁻⁴          | —             |
| **E20c rival capture: Z vs X**                           | 1 vs 1         | **0.0 pts**   | —              | —                   | —             |
| E20c explain shift: Y vs X                               | 60.0% vs 47.0% | +13.0 pts     | —              | —                   | —             |
| E20c explain shift, corrected: Y vs X                    | 65.0% vs 49.0% | +16.0 pts     | —              | —                   | —             |
| E20c explain shift, unregistered: Z vs X                 | 71.5% vs 47.0% | +24.5 pts     | —              | —                   | —             |
| E20c explain shift, unregistered, corrected: Z vs X      | 76.0% vs 49.0% | +27.0 pts     | —              | —                   | —             |

Holm within each experiment (E20: two tests, primary evaluated at α = .025; E20b: one; E20c: two). Minimum detectable difference: **~10 points at n = 400**; **~19.8 points at n = 100**; **14.0 points at n = 200**, per the E20c registration. The E20c rows carry no interval and no adjusted _p_ because the reported contrasts rest on mechanical counts plus a bare-slug rule, not on adjudicated verdicts (Annex H).

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

**Defect 1 — the pinned extractor misses commitments.** 28 of 378 (7.4%) were commitments it could not parse: bare slug, bare backticked slug, `**mode: slug**`, unbolded `Selected mode:`, slug followed by prose. All but one named `explain`. It recurred in E20c, where 21 of 600 replies were a bare slug (D-19).

**Defect 2 — the merge cannot represent an adjudicated wrong commit.** [`mergeJudgements`](../../scripts/lib/adjudication.mjs:535) counts every adjudicated `DECLARATION` as a declared key, justified by the claim that a non-key slug "never reaches the packet". That held in E20 and failed once in E20b. Any published table must carry the corrected split (Annex C).

**Defect 3 — the registration is sign-blind in its thresholds and sign-specific in its readings.** §6 supplies a reading for "≥ 20 points" that asserts a direction. A reversed ≥ 20-point result therefore has no pre-registered reading. Recorded as a gap in the registration, not as evidence for the original hypothesis.

**Defect 4 — a gate can be quoted out of context.** The 60-draw E20c gate inverted two arms against the sweep (X 65.0%, Y 45.0%, Z 65.0%). The gate is registered for exclusion and clustering only; its declaration rates carry no reading (D-20).

**Note — vocabulary size.** The sealed key carries **45** slugs; registration §4.2 describes the union as **47**. No declaration was affected (the vocabulary used is the one the key supplies, which is what the extractor was given), but the fixture and the registration disagree and one of them should be corrected before re-sealing.

## Annex H — E20c: three arms, one slot

600 calls, 200 per arm, all `RUN`, interleaving proved at 599 transitions. `explain` at the seventh entry with line B in every arm; only the last entry's occupant changed, by a swap.

| Arm   | Last entry holds                          | `explain` declared (mechanical) | Bare-slug correction | Corrected           | Undetermined |
| ----- | ----------------------------------------- | ------------------------------- | -------------------- | ------------------- | ------------ |
| **X** | `ai-cost-engineer` (original)             | 94/200 = 47.0%                  | +3                   | **98/200 = 49.0%**  | 105          |
| **Y** | `documentation` (non-competing filler)    | 120/200 = 60.0%                 | +10                  | **130/200 = 65.0%** | 80           |
| **Z** | `architecture-reviewer` (plausible rival) | 143/200 = 71.5%                 | +8                   | **152/200 = 76.0%** | 56           |

**Registered readings.**

| Contrast               | Mechanical        | Corrected | Registered reading                                                                    |
| ---------------------- | ----------------- | --------- | ------------------------------------------------------------------------------------- |
| Rival capture (Z vs X) | 1 vs 1 — 0 points | —         | The last slot is not a general magnet; a rival placed there gains nothing.            |
| Explain shift (Y vs X) | +13.0             | +16.0     | Inside the 10–20 indecisive band: neither supported nor refuted.                      |
| Explain shift (Z vs X) | +24.5             | +27.0     | **Unregistered.** No reading exists; reported with its magnitude and not interpreted. |

**Zero-based numbering.** This is the only place the fixture's own indexing appears. The fixture counts entries from zero: with 45 entries, the first entry is 0, the seventh is 6, and the last is 44.

**Gate (60 draws, 20 per arm).** X 65.0%, Y 45.0%, Z 65.0% — the gate exists for exclusion and verbatim clustering only; those rates are noise and are not quotable (D-20).

**Extraction (D-19).** 241 replies are undetermined. Of these, 21 consist of a bare slug and were corrected by rule, unevenly (X 3, Y 10, Z 8); the remaining 220 are unadjudicated. Mechanical counts are therefore lower bounds, and the correction column is a rule applied to one failure mode, not an adjudication.

**Provenance.** [`runs/e20c-2026-11-17`](../../runs/e20c-2026-11-17) — 600 records, 600 `RUN`, 100.0 min, 10.00 s mean; [`runs/e20c-gate-2026-11-17`](../../runs/e20c-gate-2026-11-17) — 60 records, 9.3 min. Canonical record: [`modes-experiment-log.md` §23](../research/modes-experiment-log.md:809).
