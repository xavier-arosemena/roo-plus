# Routing report (E17 draft) — does the picker's wording or its order decide whether a model commits?

| Field                | Value                                                                                                                                                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Status**           | **Draft for review.** Not a release note; numbers are final where they are mechanical counts, interpretation is open to challenge and partly withdrawn (§4.2, §4.3, §4.6)                                                                              |
| **Built from**       | E21 (closing round, 598/600 appropriate), E20 (artefact polarity, 900 calls), E20b (position, 200 calls), E20c (slot occupant, 600 calls)                                                                                                              |
| **Evidence**         | [`runs/e20-2026-11-17`](../../runs/e20-2026-11-17) · [`runs/e20b-2026-11-16`](../../runs/e20b-2026-11-16) · [`runs/e20c-2026-11-17`](../../runs/e20c-2026-11-17) · [`runs/e13r-2026-11-12`](../../runs/e13r-2026-11-12)                                |
| **Registration**     | [`2026-11-13-e20-preregistration.md`](2026-11-13-e20-preregistration.md:1), Amendments 1 and 2; [`2026-11-17-e20c-preregistration.md`](2026-11-17-e20c-preregistration.md:1)                                                                           |
| **Canonical record** | [`modes-experiment-log.md` §23](../research/modes-experiment-log.md:812) and [§24](../research/modes-experiment-log.md:834) — the red-team round, which is the record of what was verified. Every E20c figure here is taken from there or from `runs/` |
| **Calls paid**       | 2,591 output-producing calls in the E20 family; **3,200 across the whole programme including the closed round and the 9-call smoke test**, ≈€16.32. Cost, wall clock and deviations are in Annex A                                                     |

---

## Abstract

**Question.** When a request could belong to more than one mode, does the wording of the mode lines — or their order in the list — change which one is chosen? The literature offers no measurement. It establishes that descriptions outrank names in tool selection, that position can dominate when names are all that differ, and that benchmarks routinely fail to score the turn on which asking is the correct answer.

**Method.** Three experiments, one model, one forty-five-entry picker and one deliberately ambiguous brief, varying the lines one clause at a time: 900 draws across three wordings, 200 across two list positions, and 600 across three occupants of the last slot. Every contrast was pre-registered, interleaved, and judged twice — the second time by a different model reading a blind packet.

**Result.** One finding survives. A line stating what the answer must **not** be committed **27.5 points** more often than one stating an evidence standard — 89.0% against 61.5%, the reverse of the prediction — holding its sign throughout the run and reproduced by the second reader on **99.7%** of the replies it re-read. Order produced a difference without an identified mechanism. Everything else narrowed: the effect holds on **one brief out of seven screened**, for one model, at one list position, with batch-to-batch variation of the same order as the design's stated resolution.

**For authors.** §7 turns that finding into a template for writing a mode line; §6 turns it into advice for choosing one.

## 0. What to take away

**The simplest fact comes first, because everything below is a refinement of it: the clarity of the brief decides the outcome.** A request that says what is wanted gets the right mode almost every time, and no wording or ordering trick measured here makes an unclear brief as good as a clear one. What this report is about is the residual case — a brief ambiguous enough that the model could reasonably ask instead of choosing — and the question of which levers, if any, improve the choice when the brief itself cannot.

1. **Exactly one result here is confirmatory, and it fits in one sentence.** A mode line that names what the answer must **not** be gets the model to commit to that mode **27.5 points** more often than a line of the same length that names what the answer must **contain** — 89.0% against 61.5%, _p_ ≈ 7 × 10⁻²⁰. That is the finding; it hints at nothing larger, and every other number in this report is narrower than it first appeared (§5). Three properties make it a result rather than an observation, and each is stated because the claim is large: it holds its sign in **every quarter** of the run (21–35 points); it is **independently corroborated**, a second model re-reading the same replies blind agreeing with the first pass on **99.7%** of them; and its direction is the **reverse of the prediction we registered**. It also **reproduces and strengthens in the rendering the product actually emits**: +21.4 points in the experiment form, **+33.3** in the product form, measured in one batch (§4.10). _Falsified if_ a length-matched line naming a required artefact, rather than a quality standard, reverses the gap.
2. **On an ambiguous brief the model asks rather than guesses — and whether it asks at all belongs to the model, not to the routing.** Every one of the 900 E20 wording calls either committed to the expected mode or asked for the missing information; none selected an unrelated one. That behaviour is not a property of the system: a second model, on the same brief and the same lines, asked **not once in 91 replies** and committed every time (§4.8). The channel the headline result lives in is therefore a model's willingness to ask, and it should be read that way wherever it is quoted. _Falsified if_ wrong commits are shown to outnumber asks on ambiguous briefs at this scale, for a model that asks at a comparable rate.
3. For list order the programme has a difference, no identified mechanism, and a **format that changes it**. First and last entries differ within one run, with the gap positive in every quarter (+44, +20, +24, +20 points). Rendered the way the extension renders it, the difference **is not there** (−9 points, indistinguishable from zero), and the same line at the last slot declares **18 points less** than in the experiment format (§4.9). The effect is real for the line that was measured and does not transfer to the line users see. Falsified by a stationary re-run on the product form that reproduces it.
4. The same prompt does not get the same answer. On 90 identical prompts two dispatches agreed at 50.0 / 50.0 / 62.5% against chance levels of 54.5 / 50.1 / 63.8%, and one unchanged condition ran at 59.3% in one batch and 47.0% in another. That gap is a time-average of a drift, so it is quoted as tens of points and never as a constant. Falsified if two dispatches of the same prompts agree far above chance.
5. Every number here is one model, one brief, one session and one rendered picker format — and one of those turns out to be channel-specific. A second model, given the same brief and the same two lines, asked **no questions at all** in 91 replies and returned a bare route name every time, which is why the replication was stopped. The commit-versus-ask channel, where the 27.5 points live, depends on the model's willingness to ask, not only on the route. Falsified by a model that asks at a comparable rate and still shows the gap.
6. **The ruler moves.** One hundred identical calls, nothing varied, moved **24 points** across one run (§4.9). The two headline results survive a time-aware paired test — the wording contrast wins 238 of 288 adjacent pairs, the position contrast 94 of 107 — so the _directions_ stand. The _absolute percentages_ do not survive being compared across runs, and no rate in this report should be quoted without its batch. **Quote directions, intervals and batch identity; never a bare percentage.**
7. **Which token sits in the quotes is a routing lever, and the catalogue should print the name.** Three namings of the same line, one batch of 300 calls (§4.11): name quoted **0.780**, slug quoted with no parenthetical **0.450**, slug quoted with the name in parentheses **0.130**. Paired within cycle: +33.0, +65.0 and +32.0 points of rate. Printing the display name in the quoted slot is worth **33 points** over a slug-only line that saves 761 characters — so the shorter line is a trade, not a saving. _Falsified if_ a product-form batch at this size shows name-first and slug-only within ten points of each other.

---

### How large is this in practice?

Two different numbers get confused here.

**What moves is the choice.** On a brief too vague to decide from, the line and the position shifted _whether the reply commits or asks_ by **27.5 and 30 points**. That is a shift in the majority behaviour on such a brief, not a marginal effect: the same model, the same request, and the commit rate went from 61.5% to 89.0% on wording alone. §6.3 turns that measurement into a probe an author can run against a real catalogue.

**What goes wrong is rare.** Measured wrong selections — a mode the request did not fit — were **2 in 600** in the closing round, **0 in 900** in E20, **2 in 600** in E20c, and **12 in 100** only in E20b's last-entry arm. So the risk sits between a third of a percent and about one in eight, depending on where the entry sits in the list.

**How often a real brief is vague, we have not measured.** Our brief was written to be maximally ambiguous, because that is the only regime in which the line can matter. Whether that describes 2% or 40% of what users actually type is unknown, and nothing here can settle it — it is the largest open question in §8.1.

**How widely this applies is itself measured, and narrowly.** Six further briefs were screened for the two conditions the effect needs — a reply that sometimes asks, and `explain` as a plausible owner — and **none passed both**. Mechanism questions ("why does this worker retry three times") closed the ask channel: thirty of thirty committed. A change-friction question opened it but handed ownership to `architecture-reviewer`, and `explain` was dropped. So the 27.5 points are established on **one brief out of seven screened**, and any claim beyond that brief is an extrapolation, not a result.

**The two errors are not symmetric.** A question costs the user one turn and often lands on the right mode on the retry. A wrong commit costs a task. That asymmetry is why §6 favours lines that discriminate between neighbouring modes, and why 12 wrong commits in 100 matters more than a 27.5-point swing in how often the model asks.

---

## 1. What we are trying to assess

**Start with the simplest fact, because everything below is a refinement of it.** The clarity of the brief decides the outcome. When a request says what is wanted, the model commits to the right mode almost every time — 98 to 100 draws in 100, measured here — and no wording or ordering trick changes that. This report is about the remaining case: a brief ambiguous enough that the model could reasonably ask instead of choosing, and about which levers, if any, improve the choice when the brief cannot.

### What is already known, and what is not

Four things bear on the question this report asks. Each is stated with its grade, because three of the four rest on a single study and two are unpublished preprints. Sources are listed under Citations, before the annexes.

**1. Selection from a list is a metadata problem, and the metadata is unequal.** The only factor-isolated study of tool selection — five models, five tasks, metadata drawn from 367,174 tools, positions balanced, conditional logistic regression for position-adjusted effects — ranks the levers **parameter schema > description > name**, with names excluding zero in only **6 of 29** estimates (Li, Qiao, & Gao, 2026 — a preprint, unreplicated). Our own framing inherits that ranking: `whenToUse` is the description lever, and the entry name is the weakest one available.

**2. Position can dominate when names are all that differ.** The same study reports the first-listed entry chosen in **78.7–96.0%** of trials under name-only comparisons. No factor-isolated study we could reach had varied position inside a mode picker before this programme — which is why §4.2 exists, and why it is reported as a difference without an identified mechanism.

**3. Benchmarks systematically fail to score abstention.** The leading agent-function-calling benchmark builds turns on which asking is the _expected_ behaviour, and then its scorer skips them: _"asking earns nothing, guessing costs nothing on that turn"_. Instructing a model not to ask produces no detectable change in decision quality while raising its official score by **13.5 to 23.5 points** (Asking Earns Nothing, 2026 — a preprint, one benchmark, unreplicated). This is not an aside. It is the same instrument defect that manufactured this programme's own false null, recorded in §13.

**4. Grammatical form has guidance but no measurement.** Verb-first naming is a documented interface convention (GOV.UK Design System, n.d.; Microsoft Learn, n.d.; Kaley, n.d.), and nominalisation research explains why a "-tion" noun is ambiguous between an event and its result (Kawaletz & Plag, 2015; Barsalou et al., 2010). But **no study compares a verb-named entry with a noun-named one while holding everything else fixed**, in any domain we could reach.

**What that leaves.** The literature predicts that descriptions matter more than names, offers no measurement of name form inside a picker, and is itself unpublished in two of the four load-bearing cases. The question this report was built to answer had no prior measurement to confirm or deny — which cuts both ways: any result here is new, and any result here is unanchored.

### 1.1 The user-facing situation

The catalogue offers 45 modes. What the model received in **every experiment in this report** is a picker: one line per mode, `- <slug> — <Name> — <whenToUse>`, in file order, about 45 entries. **The extension renders a different line** — `* "<Name>" mode (<slug>) - <whenToUse>`, name first, under a `MODES` heading ([`modes.ts:33`](../../src/core/prompts/sections/modes.ts:33)) — and no arm of any experiment used that form, so every result below is a result about the form the experiments rendered, not about the form the product shows (log §32; R0 in §8 is the test that would close the gap). A mode's **position** is simply which line it occupies in the list. This report names positions by what they are ("the first entry", "the seventh entry", "the last entry") rather than by number; a reader who needs the fixture's own zero-based numbering will find it in Annex H, which is the only place it appears.

From that list and the user's request, the model must decide whether to **commit** to one mode or **ask** for what the request left out. The closing round showed that on an unambiguous brief the model commits almost always (598 of 600 appropriate). The interesting regime is therefore the _ambiguous_ brief, which is the only regime in which the picker line can matter.

### 1.2 The experiments at a glance

Four experiments carry this report. Each varies one thing and holds the others fixed, which is the reason they can be read separately at all.

| Experiment                | What varied                                                                                    | What was held                                          | n               |
| ------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------ | --------------- |
| **E13-R** (closing round) | the wording of the line, six cells                                                             | position, brief, model                                 | 6 × 100         |
| **E20**                   | the line's requirement: artefact absent, artefact stated, artefact excluded                    | position (the seventh entry), brief, model             | 400 / 400 / 100 |
| **E20b**                  | the position of `explain`: first entry against last entry                                      | the line, brief, model                                 | 100 / 100       |
| **E20c**                  | the occupant of the last entry: its original mode, a non-competing filler, the plausible rival | `explain` at the seventh entry, its line, brief, model | 200 / 200 / 200 |

> **E20c's design did not anticipate an arm drifting.** Its three arms were interleaved and read as exchangeable draws, which is what the round-robin is for. Arm X turned out to ramp from 36.0% to 60.0% across its own four blocks (§4.6) — an arm × time interaction that interleaving cannot remove — so **E20c's result is inconclusive for that reason**, and none of its contrasts is carried into §0 or §6.

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

**The prompt is not only the brief.** Every call opens with a fixed persona sentence — "You are exploring. Say what you want to achieve, not what you want handed back." — followed by the standing instruction to pick exactly one mode from the list, or to say what information is needed instead of guessing. Neither sentence was varied in any arm. The second is not a courtesy to the model: it is what makes an ASK an admissible reply at all, so the ask channel this report spends most of its space on is a property of the instruction as much as of the menu. A design that dropped it would be measuring a different question, and any replication should carry both sentences verbatim.

**B vs C is the primary contrast and it is length-matched** (96 against 99 characters; three characters apart). A vs B differs by 46 characters and therefore cannot separate "states an artefact" from "is longer" — it is reported as a magnitude with that confound named, and can never falsify anything on its own.

Draws: A = 100, B = 400, C = 400, interleaved on the registered nine-call cycle `A B C B C B C B C` repeated 100 times. `temperature: 0`, recorded but not assumed deterministic.

### 2.2 The position arm (E20b)

Same slug, same brief, line held at B. `explain` placed at the **first entry** or the **last entry** of the 45-entry picker. 100 draws per arm, interleaved two-call cycles.

### 2.3 The slot-occupant arm (E20c)

E20b moved `explain` to an extreme, which changed three things at once: its own position, its neighbours, and the position of every other mode. E20c isolates the one alternative that could have changed what an author should do — whether the **last slot** attracts selection whoever occupies it.

600 calls, 200 per arm, all `RUN`. `explain` stayed at the **seventh entry** with line B in all three arms; only the **occupant of the last entry** changed, and it changed by a **swap**, so the list kept its length and no other entry moved.

| Arm   | Last entry holds              | Role                                                                             |
| ----- | ----------------------------- | -------------------------------------------------------------------------------- |
| **X** | `ai-cost-engineer` (original) | Control — the same condition as E20's arm B, at a later date                     |
| **Y** | `documentation`               | Non-competing filler for this brief: does any move to the end disturb `explain`? |
| **Z** | `architecture-reviewer`       | Plausible rival: does the last slot pull selection towards its occupant?         |

**What this design did not anticipate.** E20c assumed that draws inside an arm were exchangeable — the premise interleaving is meant to secure. Arm X is not: its declaration rate rises from 36.0% to 60.0% across the run while Y holds flat and Z declines (§4.6). E20c is therefore **inconclusive**, and its figures are published as counts and readings, never as effects.

### 2.4 The measurement contract

Replies are **unconstrained** — no `MODE:` slot, because a labelled slot presents a choice where the model might otherwise ask and would bias the very ask rate being measured. Extraction is `routing-round-parser/2`, pinned; every reply it cannot resolve goes to **hand adjudication**, blind: the packet carries a hashed id, the brief and the reply, with no arm, draw or timestamp, and the id-to-run mapping stays outside the packet until every judgement is recorded. Judgements are `DECLARATION`, `ASK` or `OTHER`, with the tie-break fixed in advance: a declaration marker anywhere makes it a `DECLARATION` even if the reply asks afterwards. That tie-break proved unusable on this corpus and was replaced — before any count was published — by a rule that separates selection from mention (§3.7, D-26).

### 2.5 Instrument proof (this is what licenses reading the numbers)

| Check                                     | Result                                                                                                                                    |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Mid-run gate at 90 draws (Amendment 2 §1) | exclusion **0.0%** in all three arms; longest identical verbatim run **1** (threshold 5)                                                  |
| Excluded records, published batches       | **0 of 1,700**; every record `finishReason: STOP`                                                                                         |
| Verbatim clustering                       | longest identical-transcript run **1** in all five E20/E20b arms; 879/900 and 199/200 distinct                                            |
| E20c verbatim clustering                  | **192–198 of 200** distinct transcripts per arm; no arm clusters                                                                          |
| Interleaving                              | **899 transitions across 900 calls**, **199 across 200**, and **599 across 600**; max concurrency 1                                       |
| Token cap / model                         | one value, 4096, throughout; `gemini-3.5-flash`; `temperature: 0`                                                                         |
| Runs test on each arm's outcome sequence  | B _p_ = .79 · A _p_ = .69 · C _p_ = .67 · P1 _p_ = .24 · P45 _p_ = .76 — no outcome dependence in these arms; E20c's tests are in Annex E |

Two instrument numbers are deliberately **not** results. The 60-draw E20c gate produced declaration rates of X 65.0%, Y 45.0%, Z 65.0%, which invert two arms relative to the sweep: the gate exists for exclusion and verbatim clustering only, and its rates are 20-draw noise (Annex H, D-20). And 21 of the 600 E20c replies are a bare slug, which the pinned extractor cannot resolve at all; they sit inside the 241 replies adjudicated blind in §3.5, so those counts are readings rather than bounds — but they still cannot be turned into a contrast (§4.3, D-19).

Costs, wall clock and deviations are in Annex A. They are published because every finding here is credible partly because the cost of finding it is visible.

---

## 3. What we found

### 3.1 The regex was not enough — and here is the size of the problem

Of 378 replies reaching hand adjudication, **27 were commitments the extractor missed** (7.1%). The failure modes are mundane and worth recording, because they are the modes a v3 extractor must accept:

- a bare slug with no decoration — `explain`, or `` `explain` `` alone;
- a bold span wrapping label _and_ slug — `**mode: explain**` — which never matches `**Mode:**`;
- an unbolded label — `Selected mode: explain`;
- a slug followed by a paragraph of goal prose — `` `explain` `` then a description.

All but one named `explain`, which named `architecture-reviewer` outright.

Adjudication added declarations in every E20 arm — +2 in A, +9 in B and +12 in C, which is 2 to 3 points each. P45 is the exception, and it is the exception in two directions at once: adjudication added three declarations that name `explain`, while the arm's 53 mechanical declarations were never all of the key — 42 name `explain` and 11 name another mode, which are the wrong commits the harm measure depends on (Annex C):

| Arm | Mechanical only   | After adjudication              |
| --- | ----------------- | ------------------------------- |
| B   | 237 / 400 = 59.3% | **246 / 400 = 61.5%**           |
| A   | 73 / 100 = 73.0%  | **75 / 100 = 75.0%**            |
| C   | 344 / 400 = 86.0% | **356 / 400 = 89.0%**           |
| P1  | 15 / 100 = 15.0%  | **15 / 100 = 15.0%**            |
| P45 | 42 / 100 = 42.0%¹ | **45 / 100 = 45.0%** (12 wrong) |

¹ ARM-1's 53 mechanical declarations are not all of the key: 42 name `explain` and 11 name another mode. Those 11 are wrong commits, and adjudication contributes a twelfth — the reply that is the bare slug `architecture-reviewer`. The declared-key total is therefore 45, not 46 (Annex C, log §30).

### 3.2 The primary contrast: wording polarity

**B 61.5% against C 89.0% — a difference of 27.5 points, C ahead** (95% CI 21.7–33.1 points; exact two-sided _p_ = 7.1 × 10⁻²⁰; Holm-adjusted _p_ < 10⁻¹⁹).

The registered reading for "≥ 20 points" was written as _"naming what the answer must contain moves commitment more than naming what it must avoid"_. The observation is the mirror image: **the line that said what the answer must avoid committed 27.5 points more often**. The registration therefore has no reading for this result; §6's thresholds are sign-blind while its readings are sign-specific (Annex G, Defect 3).

### 3.3 The secondary contrast, reported as magnitude only

**A 75.0% against B 61.5% — 13.5 points, A ahead** (95% CI 3.1–22.4; _p_ = .0141). The shorter line is _not_ the weaker one. But A and B differ in length by 46 characters, so this is **descriptive and length-confounded**; it is recorded here because omitting it would look like concealment, not because it establishes that short lines work.

### 3.4 The position arm (E20b)

**P1 (first entry) 15.0% against P45 (last entry) 45.0% — 30.0 points, last ahead** (95% CI 17.5–41.3; exact _p_ = 5.6 × 10⁻⁶).

Two details matter more than the headline:

- **Both arms stayed "appropriate" at or near saturation** — P1 100%, P45 88%. The model almost never chose an unrelated mode; it either committed or asked.
- **All the harm is in the last position: 12 wrong commits of 100 against 0 of 100** (exact _p_ = 3.4 × 10⁻⁴). Twelve of those replies named some other mode outright rather than asking.

### 3.5 The slot-occupant arm (E20c)

`explain` sat at the seventh entry in all three arms with the same line. Only the last entry's occupant changed.

| Arm | Last entry holds                | `explain` declared (mechanical) | Adjudicated (+) | Corrected             | Extractor-undetermined |
| --- | ------------------------------- | ------------------------------- | --------------- | --------------------- | ---------------------- |
| X   | `ai-cost-engineer` (original)   | 94 / 200 = 47.0%                | +4              | **98 / 200 = 49.0%**  | 105                    |
| Y   | `documentation` (non-competing) | 120 / 200 = 60.0%               | +11             | **131 / 200 = 65.5%** | 80                     |
| Z   | `architecture-reviewer` (rival) | 143 / 200 = 71.5%               | +9              | **152 / 200 = 76.0%** | 56                     |

The registered readings, and what this run can say about them:

1. **Rival capture (Z against X): 1 against 1.** The count sits on a metric with 56 of Z's 200 replies and 105 of X's unresolved, so it is a bound, not a zero. The registered reading for a ≤ 10-point difference is **not applied** — not because the count contradicts it, but because the run it comes from is not stable (§4.6) — and its opposite is not claimed either (§4.3).
2. **Explain shift (Y against X): +13.0 points mechanical, +16.5 corrected.** Both sit inside the registered 10–20 indecisive band, which would make the observation indecisive; because the arms are not stationary, not even that verdict is applied.
3. **Unregistered: Z against X on `explain`, +24.5 mechanical, +27.0 corrected.** No reading exists for it and none is manufactured here. §4.6 shows the figure is the average of a decaying contrast (+40, +34, +16, +8 points), so it is not a magnitude to quote either.

The gate and the extractor both constrain what can be quoted from this table. At the 60-draw gate the arms read X 65.0%, Y 45.0%, Z 65.0%, an ordering that inverts two arms against the sweep; those rates are not quotable (D-20). Of the 241 replies the extractor could not resolve — 21 of them a bare slug (X 3, Y 10, Z 8) — all have now been adjudicated blind under the selection rule, and the adjudicated column above is the result (D-19, log §26). The counts are readings rather than bounds; what they still cannot be used for is a contrast, because the arms are not stationary (§4.6).

### 3.6 Reliability: `temperature: 0` is not reproducibility

The aborted first attempt (billing, see Annex A) drew the **same prompts** as the published batch before it stopped. Comparing draw by draw:

| Arm | Overlapping draws | Same commit/ask outcome | Identical transcript |
| --- | ----------------- | ----------------------- | -------------------- |
| B   | 329               | 53.2% (chance 51.7%)    | **0.0%**             |
| A   | 83                | 54.2% (chance 55.3%)    | 0.0%                 |
| C   | 329               | 71.1% (chance 73.5%)    | 0.0%                 |

Agreement sits **at chance** and not one transcript repeats. Two consequences: each call is an _independent_ sample, not a replicate (so pooling batches would legitimately add information — it was declined, see Annex A); and a single request is genuinely unstable, so a mode that committed once may ask next time.

---

### 3.7 Independent corroboration of the adjudicated counts

Every count above rests on replies the mechanical extractor could not classify. Those replies were judged twice: once by the analyst, and once by a different model reading a blind packet that carries no arm, draw or time.

Under the rule registered for the second pass, the two readings agreed on **11.1%** of 378 replies. Reading twelve disagreements in full showed the first pass right in all twelve: each was an ask that enumerated candidate modes ("whether you want `explain`, `architecture-reviewer` or `codebase-cartographer`"), and the registered tie-break counted any named mode as a declaration. Under a rule that distinguishes **selection from mention**, agreement is **99.7% — 377 of 378**.

Two things follow. The adjudicated counts stand, and are now corroborated by an independent reader rather than merely asserted. And the result is **construct-dependent** in a way that belongs beside every number: scored on a mention-anywhere construct, the same replies give B 98.0% and C 97.75% — a gap of 0.25 points instead of 27.5.

## 4. What it means

### 4.1 Polarity exists — reversed

E20 targeted the 10–20 point band that the earlier design could not resolve. At 400 draws per arm that band is inside the ruler, so a difference there counts as an effect rather than an indecisive reading. E20 found one at 27.5 points, with a confidence interval that excludes any reading below 21 points. **The effect is large and its direction is clear; it is the prediction's sign that was wrong.** The programme's hypothesis — that a line stating a required artefact pulls commitment towards the mode — failed in the direction it was stated. What actually pulled commitment was a line that **excluded** an artefact.

The most parsimonious description: a line that says _"not merely describe the code"_ reads as a **prohibition to be complied with**, and prohibition is a stronger instruction than a requirement to include something. This is consistent with the negotiation behaviour seen in the adjudication: replies that ask are overwhelmingly replies that cannot decide _between_ modes, and a prohibition narrows the field.

### 4.2 Position: a difference within the run, and no identified mechanism

Inside one run, with the line, the brief and the model held fixed, `explain` at the **first entry** declared at **15.0%** and at the **last entry** at **45.0%** — **30 points** (Annex C). The mechanical block contrast is positive in all four quarters of the run (+44, +20, +24, +20 points) and averages 27; the headline is three points larger because adjudication added three declarations to the last arm and none to the first. That is the whole of the within-run evidence, and it stops short of an explanation.

**The mechanism is not identified.** Four candidates remain open — a penalty for occupying the first entry, a reward for occupying the last, a neighbour effect from whatever sits adjacent to the target, and a **rendered-form effect**: the experiment lines lead with the slug, which is the exact string the reply must return, while the extension leads with the display name, so a leading-token effect and a positional one are confounded in every experiment run here (log §32). Each would need its own stationary experiment (M-10) to separate. Interleaving guarantees that none of them is favoured by a shared trend (§4.6); it does not tell us which is at work. The fourth is the only one with a directional prediction already on record: if leading-token recency is the cause, the last-entry advantage should shrink or reverse when the same contrast is run on the product form.

An earlier draft of this report drew the mechanism from a comparison **across two batches** — an arm from the position experiment against an arm from the slot-occupant experiment — and called the residue "a penalty for the first entry". That is a cross-batch subtraction, and it is exactly what method rule **M-9** forbids: a contrast is within-run, or it is not a contrast. The claim is withdrawn, and what remains is the within-run difference above.

The direction also runs against the literature's 78.7–96.0% first-listed dominance, and this data cannot say why. §8 lists the experiment that would separate "the first entry is penalised" from "the last entry is favoured" from "the neighbour did it".

### 4.3 E20c: inconclusive, and what it still licenses

The rival placed in the last slot was selected **twice in 600 replies**, so it does not capture the slot. But the effect of changing the occupant is not stable: the contrast against control falls from **+28 to 0 points** for the filler arm and from **+40 to +6** for the rival arm across the four quarters of the run. **The experiment is inconclusive.**

The registration's reading for a ≤ 10-point difference is therefore **not applied**, and its opposite is **not claimed** either. What the run licenses is narrow: a plausible rival placed last does not win.

**The mechanism error, stated plainly.** An earlier draft quoted that reading as frozen and then concluded the opposite of what the reading says — that the advice does not survive. That is outcome switching, whoever wrote it, and it is recorded here rather than repaired by reinterpretation.

### 4.4 Commitment is not correctness

The last position bought 30 points of commitment and paid for it with 12 points of wrong commits. The first position bought 0 wrong commits and a great deal of asking. For a catalogue whose worst outcome is _acting in the wrong mode_, that trade is not obviously favourable, and it is a policy-relevant number measured within one run rather than inferred — on an arm that resolves only ~19.8 points (Annex G, §8.1).

### 4.5 Consequences for earlier readings

By the pre-committed reading for a ≥ 20-point position effect, **the routing conclusion must be restated as being about list order**, and every earlier label-form reading is demoted to _"measured at one untested position."_ A position that was held constant is not an uncontrolled position: it makes those readings position-specific, not unreliable. That demotion applies to this programme's own earlier results, including the closing round's label-form contrast. What the position contrast itself licenses is a within-run difference with no identified mechanism (§4.2), so "about list order" describes where the reading was taken, not why the difference appears.

### 4.6 Stability: within-run is necessary, not sufficient

Arm X of E20c is the **same condition** as E20's arm B: identical picker, line, brief, model and index, and byte-identical prompts. It scored **47.0% against 59.3% — 12.3 points apart, z = 2.85**. That is a batch-to-batch difference on an identical condition, and it is the observation rule **M-9** was written from: a contrast is within-run, or it is not a contrast. It is used here as a statement about variance — what two dispatches of one condition can differ by — not as a contrast of its own.

**Within-run is necessary but not sufficient.** Interleaving protects a design against a **common** trend: if the whole batch drifts, the round-robin spreads that drift evenly and a within-run contrast survives it. It does **not** protect against one arm drifting while the others hold — an arm × time interaction — and the run that could have tested this contained exactly one.

| Experiment | Arm         | Declarations per block       | Shape                            |
| ---------- | ----------- | ---------------------------- | -------------------------------- |
| E20        | B           | 61 / 58 / 63 / 55 per 100    | flat                             |
| E20        | C           | 83 / 87 / 84 / 90 per 100    | flat, drifting up                |
| E20        | A           | 17 / 17 / 23 / 16 per 25     | flat                             |
| E20b       | first entry | 2 / 3 / 6 / 4 per 25         | flat and low                     |
| E20b       | last entry  | 13 / 8 / 12 / 9 per 25       | flat and higher                  |
| **E20c**   | **X**       | **18 / 20 / 27 / 30 per 50** | **ramp, 36% → 60%, CA z = 2.72** |
| E20c       | Y           | 32 / 31 / 27 / 30 per 50     | flat                             |
| E20c       | Z           | 38 / 37 / 35 / 34 per 50     | declining                        |

Contrasts per block, in points:

| Contrast          | Block 1 | Block 2 | Block 3 | Block 4 |
| ----------------- | ------- | ------- | ------- | ------- |
| E20 B − C         | −22     | −29     | −21     | −35     |
| E20b last − first | +44     | +20     | +24     | +20     |
| E20c Y − X        | +28     | +22     | 0       | 0       |
| E20c Z − X        | +40     | +34     | +16     | +8      |

**The same test was applied to all three experiments, and the difference in outcome is the point.** E20's B − C gap holds its sign in every quarter and ranges 21–35 points; E20b's first-versus-last gap is positive in every quarter (+44, +20, +24, +20), so its direction is stable even though its magnitude narrows. Both survive. E20c's two contrasts decay to 0 and +8 points, so neither does: averaging them over the run produces numbers dominated by the first hundred calls, and the honest report of an average of +28, +22, 0, 0 is "it decayed", not "+13 points". X ramps 36.0 → 40.0 → 54.0 → 60.0 across its own blocks (Cochran–Armitage z = 2.72, p ≈ .007), while Y is flat (64 / 62 / 54 / 60, z = −0.65) and Z declines (76 / 74 / 70 / 68, z = −0.99).

**A counting rule for that table.** The E20c rows count mechanical declarations naming **any** mode, which is how the block decomposition was computed; X and Z each contain one reply naming a mode other than `explain` (the wrong commits of §3.5), so those two rows total 95 and 144 against the 94 and 143 `explain` declarations published there. On the `explain`-only counts X reads 18 / 19 / 27 / 30 and Z 38 / 37 / 35 / 33, which makes the Y − X row +28 / +24 / 0 / 0 and the Z − X row +40 / +36 / +16 / +6. Nothing in this section depends on the difference; the decay does not.

**The 12.3 points is not a constant.** It is a time-average of a ramp: X's own rate moves 24 points inside a single run, so a batch-to-batch difference compares two points on two unknown trend lines. It should be quoted as **tens of points** — enough to establish that a cross-batch comparison is unavailable, not a resolution to plan the next design against.

**Method rule M-10: stationarity is tested per arm, never assumed from interleaving** — an arm that ramps while its neighbours hold manufactures a contrast that decays, and no interleaving cadence can detect it.

---

### 4.7 The X re-run: the ramp did not reproduce, the level moved

Arm X was re-run alone, 200 calls, identical prompts — all 200 prompt hashes match the originals.

| Run      | Block 1  | 2        | 3        | 4        | Total | Trend z   |
| -------- | -------- | -------- | -------- | -------- | ----- | --------- |
| Original | 18 (36%) | 19 (38%) | 27 (54%) | 30 (60%) | 47.0% | **+2.72** |
| Re-run   | 27 (54%) | 31 (62%) | 19 (38%) | 31 (62%) | 54.0% | **−0.06** |

The ramp was **not a stable property of the arm**. What did reproduce is the instability in a different shape: the same condition scored 47.0% and 54.0% in two runs, the same order as the 12.3-point gap between two earlier batches. So §4.6 stands — a batch mean is not a stable quantity — while the specific monotone pattern does not.

### 4.8 The second provider: the channel is model-specific

A replication was attempted on a second model and stopped after 109 of 800 calls, for a reason worth stating plainly: **the second model never asked.** In 91 productive replies it returned one of five strings, all bare mode names, with zero questions.

| Arm               | n   | Declared `explain` | Other | Asked |
| ----------------- | --- | ------------------ | ----- | ----- |
| artefact stated   | 43  | 41 (95.3%)         | 2     | **0** |
| artefact excluded | 48  | 48 (100%)          | 0     | **0** |

Zero asks in 91 replies puts the 95% upper bound on that model's ask rate at **≈3.2%**. For the model this report uses, the ask rate over the same brief was 11–39% on E20's three lines and 43–85% on E20b's two positions — not a like-for-like magnitude, but the same kind of quantity. The effect measured here is a difference in _whether the reply commits_, and a model that always commits has no room for it. Under the practice recorded as M-11, a replication should screen for the channel first — about twenty calls, cents — rather than discover its absence at call 109.

**Two things follow.** The 27.5-point result is a statement about one model's ask threshold, not about routing in general. And mode choice on the second model was near-deterministic and independent of the line, which is consistent with the effect living in the ask threshold rather than in preference between modes.

### 4.9 The instrument moves — a measurement note added 2026-11-23

**One hundred identical calls, nothing varied, moved 24 points.** Same line, same position, same brief, same model, same settings: 0.40, 0.28, 0.16, 0.24 across four quarters (log §36). The movement is a property of _when_ a call is made, not of what is in it.

**Four consequences, and none of them is a retraction.**

1. **Levels are not comparable across runs.** "47.0% here, 59.3% there" describes two afternoons, not two conditions. This report already forbids cross-batch contrasts (M-9); the drift is what that rule was protecting against, now measured.
2. **The intervals in Annex D are optimistic, and the conclusions are not affected.** Those intervals assume independent draws. Re-tested as adjacent-pair sign tests over the replies already on disk: **C − B wins 238 of 288 pairs** (z = 11.08) and **P45 − P1 wins 94 of 107** (z = 7.83). Both headline directions survive a statistic that knows about time. The position figure carries a caveat: the re-classification reproduces the registered rate in one arm and not the other, so its z is indicative rather than a replacement.
3. **The position result is specific to the line that was measured.** In the product's own rendering, the last-entry advantage **is not there** (−9.0 points, indistinguishable from zero), and the same line at the last slot declares **18 points less** than in the experiment format. §4.2's within-run statement stands; the advice built on it does not transfer.
4. **Two method rules follow.** _M-15:_ stationarity is tested on the contrast, not on the arm — a balanced, adjacent-in-time comparison cancels drift that arm rates show. _M-16:_ publish arm rates **and** the paired sign test, and never compare a level across runs.

**What a publisher may say.** That the wording result is a within-run contrast which survives a time-aware test at overwhelming margin. That the position result is real in the format the experiments rendered and absent in the format the product emits. That every absolute rate in this report is one batch's level and should be quoted with its batch.

**What a publisher may not say.** That a specific percentage would be reproduced next week. That the position effect applies to users of the extension. That a difference of ten points between two runs is a finding.

### 4.10 The headline in the product rendering — larger, and it silences the ask (2026-11-23)

Line B against line C, `explain` held at the seventh entry, both renderings, one interleaved batch of 337 calls (log §41):

| Arm                      |      Rate |  Asks |
| ------------------------ | --------: | ----: |
| experiment form, line B  |     0.659 |    27 |
| experiment form, line C  |     0.869 |     9 |
| product form, line B     |     0.667 |    25 |
| **product form, line C** | **1.000** | **0** |

Paired within cycle: **C − B is +21.4 points in the experiment form and +33.3 in the product form** (28 pairs to 1, re-derived under extractor v4). The headline survives the change of rendering and grows. The format alone does nothing (+1.2 points for line B — 19 up, 18 down, z 0.16 — and 0.667 against 0.659 unpaired; superseded 2026-11-23: the draft quoted +2.4 from an earlier pass, and the log's re-derived +1.2 is the figure to use).

**And the product's rendering of a discriminating line removes the question entirely: 84 commitments in 84 calls — no asks, and nothing left unresolved.** That is the tension the catalogue has to hold. On an ambiguous brief §0 calls asking the right behaviour; a line that always commits is not the same thing as a line that routes well.

### 4.11 Which token belongs in the quotes — three namings, one batch (2026-11-23)

The product template reserves a quoted slot for the mode's name. Three renderings of the same `explain` line (B, seventh entry), one interleaved batch of 300 calls, 100 per arm (log §43):

| Rendered as    | `explain`'s line                      |      Rate | Asks |
| -------------- | ------------------------------------- | --------: | ---: |
| **name-first** | `* "Explain" mode (explain) - <line>` | **0.780** |   22 |
| slug-only      | `* "explain" mode - <line>`           |     0.450 |   55 |
| slug-and-name  | `* "explain" mode (Explain) - <line>` |     0.130 |   85 |

Paired within cycle: **name-first beats slug-only by 33.0 points of rate** (45 up, 12 down, z 4.37), beats slug-and-name by **65.0** (71 to 6, z 7.41), and slug-only beats slug-and-name by **32.0** (38 to 6, z 4.82). Those nets are the unpaired rate differences as well, so the two routes agree.

**The parenthetical is inert; the quoted slot is not.** `slug-and-name` prints the display name too — in the parentheses — and is the worst of the three. So the effect is not "a human-readable name helps", it is "the token inside the quotes is what the model treats as the name". The catalogue should therefore print the form the extension already emits, `* "<Name>" mode (<slug>) - <whenToUse>`, and keep the slug in parentheses, which costs nothing measurable.

**A caveat, recorded because it cuts the wrong way for the recommendation.** The pinned extractor mislabels declarations that print a bare `**"Explain" mode (explain)**` header before asking for the source file: eight of the ten unresolved replies in this batch are declarations. Hand adjudication moves the rates to the figures above from 0.730 / 0.420 / 0.130. Extractor v4 (log §44) now reproduces all eight mechanically, so the rates in this section are its output rather than only a hand pass, and §4.10's rates have since been re-derived in the same pass: line B 0.659 and line C 1.000 in the product form.

## 5. What this does not mean

- **Not a confirmation of the prediction.** The contrast is confirmatory — pre-declared, length-matched, clear of the ≥ 20-point threshold, same sign in all four quarters — and the prediction it was built to test is refuted: the registration's reading asserts that stating a required artefact pulls commitment, and the observed gap runs the other way. What is confirmed is that the line form matters; what is not confirmed is the mechanism the registration named, and no registered reading describes the direction that arrived (Annex G, Defect 3).
- **Not a null result either.** The effect is measured, well outside the ruler, and its direction is stable across the run. What is missing is a pre-registered reading for its sign, not an effect.
- **Not a replication by the neighbouring arm.** A is artefact-_absent_, not artefact-_excluded_; its contrast against B is 46 characters confounded, and the registration says it "can never falsify anything on its own". Two lines that are _not_ the C form, on either side of B, both out-committed B (§3.3); neither is a replication of the exclusion effect.
- **Not about humans.** Every inference is about one model on one brief. No claim is made about human selection from the same picker.
- **Not about interaction.** Position and polarity were deliberately not crossed; nothing here says what their combination does. §8 lists that as the next experiment rather than as a finding.
- **Not generalisable across positions — including E20's own claim.** The polarity contrast was measured with the line held at **the seventh entry in all three arms**. It is a valid statement _at that position_ and nowhere else. By the same rule §4.5 applies to earlier work, this report's own wording result is **position-controlled, not position-randomised**; it must not be read as "C beats B wherever C sits".
- **Not a fix for a vague brief.** Every arm in E20 stayed at 100% "appropriate", which is a definition rather than a result: "appropriate" is `declared ∨ asked`, so with no wrong commits in E20 the figure is arithmetic.
- **Not resolution at 10 points.** Effects below ~10 points remain out of reach at n = 400 and below ~19.8 points at n = 100, and §4.6's batch-to-batch variation is **tens of points**, so no claim may cross batches at all.
- **Not an adjudicated contrast, in E20c.** The 241 replies the extractor could not resolve have since been adjudicated blind (log §26), so the E20c counts in §3.5 and Annex H are readings rather than bounds, and method rule **M-1** is complied with for them. That is a weaker statement than it sounds: adjudication moved the levels (49.0 / 65.5 / 76.0) without touching the reason the experiment is inconclusive, which is that its arms are not stationary (§4.6).
- **Not attested by the records as pinned extraction (D-22).** Every record in every batch, E20c included, stamps `parserVersion: routing-round-parser/1`, not `/2`. The analysis code calls the v2 extractor, so the counts are probably what the pin promises, but the pin is a claim about the tool and is not evidenced in the data (D-22).
- **Not one model's general behaviour.** Every number here is one model (`gemini-3.5-flash`) and one brief. The literature's 78.7–96.0% position result came from five models on tool selection; model-specificity is untested here. A second provider is provisioned, and replicating one contrast on it would test this.

---

- **One brief out of seven screened.** Six further briefs were tried and none produced both conditions the effect requires; the failures were of two kinds and are recorded in log §29. The finding is therefore about a brief of one kind — a question about a structural property, where `explain` is preferred but contested — and not about mode selection generally.

## 6. Advice, for users and for mode authors

Every item below rests on a number measured within one run. Items that rested on a withdrawn reading have been **deleted rather than softened**, which is why the list is shorter than it was.

### 6.1 If you are choosing a mode

**The brief matters more than the catalogue.** A request that says what is wanted gets the right mode almost every time; nothing in this report makes an unclear brief as good as a clear one. Everything below applies only to the ambiguous case.

1. **Assume the picker is doing some of the choosing for you.** Two systems with identical instructions but different list order committed at 15% and 45% on the same request, inside one run. If two modes look plausible for your task, name the outcome you want in the request ("find the cause and prove it" versus "map the dependencies") rather than relying on the mode you clicked.
2. **A clarifying question is not a failure.** Across the 900 calls of the E20 wording arms the model never selected an unrelated mode; when it did not commit, it asked. That is not a general property of this system: the last-entry arm of E20b named a mode the key does not name in 12 of 100 replies. The slot-occupant sweep produced at least 2 in 600. Asking is not free — it costs the user a turn — but it is usually cheaper than a commit to the wrong mode. "Wrong" here means _a mode the key does not name_: ten of E20b's twelve named `architecture-reviewer`, which log §17.5 calls adjacent and defensible for this brief.
3. **Do not expect the same answer twice.** The same request, same model, same settings, hours apart matched its own commit/ask outcome only at chance, and two dispatches of 90 identical prompts agreed at or below chance (§3.6, Annex F). A retry is a fresh sample, not a repeat.

### 6.2 If you are writing `whenToUse` lines (as an author)

1. **Make lines mutually exclusive, not merely descriptive.** The ask regime is dominated by candidate lists: replies that ask are replies that cannot separate `explain`, `architecture-reviewer`, `codebase-cartographer` and `decision-record`. Two lines that both plausibly cover "why is this like this" manufacture asking.
2. **Do not expect "must include X" to increase commitment.** The line naming what the answer must avoid out-committed the length-matched line naming what it must contain, by 27.5 points, in every quarter of the run. This is the report's one confirmatory result, and it is one brief, one model, one position: treat it as a hypothesis with a strong number behind it, not a rule.
3. **Weigh placement by harm, not by commitment.** Inside one run the last position committed 30 points more and produced 12 wrong commits of 100 against none at the first. If a mode is expensive to invoke wrongly, placement that suppresses wrong commits is worth more than placement that maximises uptake — but the harm arm resolves only ~19.8 points, so this is a judgement on a wide interval.
4. **Do not expect length alone to decide.** The 50-character line committed more than the 96-character line (75.0% against 61.5%) and less than the 99-character one (89.0%), so length does not order the arms; the 96-versus-99 contrast is length-matched, which is why the polarity reading rests on it and the length reading does not exist.

---

### 6.3 Auditing a mode line, or a class of requests

The instrument in this report has a practical use that costs almost nothing: **feed a set of real requests to the picker and record whether the reply commits or asks.** A high ask rate on a request class means the catalogue cannot decide from it — which is actionable for the lines, the documentation and onboarding, and re-running the probe after a catalogue change shows whether it helped.

One constraint makes the difference between an honest probe and a magic number: **the ask rate is model-specific** (§4.8). The audit must pin its model and report it. It measures how often _this_ model asks with _this_ catalogue, not an absolute property of vagueness.

## 7. Turning the results into hypotheses

**What follows is a way to write one line of a mode entry.** Each mode reaches the model as one line, assembled from three fields of its definition — the display **name**, the **slug** the reply is expected to return, and the **`whenToUse`** sentence:

```
* "<name>" mode (<slug>) - <whenToUse>
```

That is the template in [`modes.ts`](../../src/core/prompts/sections/modes.ts:33); if `whenToUse` is empty the extension substitutes the first sentence of `roleDefinition`, which is itself a reason to treat a missing `whenToUse` as a defect rather than a style choice. Of the three fields, only the `whenToUse` sentence differed between the arms of every experiment here, so it is the only part this report can speak to. §7.2 writes the skeleton in that vocabulary, and §7.3 annotates the measured line the same way.

**The template above is the product's, and the measured lines were not.** The experiments rendered `- <slug> — <Name> — <whenToUse>` with no heading and the slug first (log §32). So this section is advice about the form that was measured: its content claims come from the `whenToUse` sentence, which was identical in both forms, but its implied claim that the extension's own line has been tested is not supported by anything here.

This section is **untested guidance, not a recipe**. It is derived from the results above with their caveats attached, and only one of its four items rests on a result this report calls confirmatory. The wording evidence comes from one model, one brief, one position (the seventh entry) and one rendered picker format, at 400 draws per arm; §4.2 and §4.6 say how little of it survives being moved or re-batched. Read the items as constraints on what an author may claim, not as a method that produces commitment.

### 7.1 Four hypotheses, each with what actually stands behind it

| Hypothesis                                                                      | What stands behind it                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Make the line discriminate against its neighbours, not state a quality bar.** | **Confirmatory.** C out-committed B by 27.5 points (89.0% against 61.5%, p ≈ 7 × 10⁻²⁰), length-matched at 99 against 96 characters, and the gap keeps its sign in every quarter of the run (21–35 points). The lever moved commit-versus-ask; it did not change which mode was chosen.                              |
| **Do not add a requirement clause the other modes could also satisfy.**         | **Descriptive only, and length-confounded.** A (50 characters, artefact absent) out-committed B (96 characters, artefact stated) at 73–75% against 59–62%, but the lines differ by 46 characters and the registration says this contrast "can never falsify anything on its own". It is an observation, not support. |
| **Do not rely on placing your mode at the end.**                                | **Withdrawn.** The experiment that would have supported it is inconclusive: its control arm ramped 36% → 60% inside the run, the contrast against control decayed to 0 points (filler) and +8 (rival), and the rival count is 1 against 1 on a metric with 28% of one arm unresolved (§4.3, §4.6).                   |
| **Expect the first entry to be penalised.**                                     | **Withdrawn.** The claim was a subtraction across two batches, which M-9 forbids. What stands is within-run only: 15.0% at the first entry against 45.0% at the last (Annex C), with the gap positive in all four quarters; the mechanism is not identified (§4.2).                                                  |

### 7.2 A skeleton, untested

The skeleton is the `whenToUse` field written as two clauses, shown in the order the **extension** renders it — name, then slug — followed by the sentence that carries all of the variation. The measured lines put the slug first and the name second; that ordering is the one part of this skeleton the programme has not tested, which is why §4.2 carries a rendered-form candidate and §8 carries R0.

```
Name | slug | Use when <the situation in which this mode, and not its nearest neighbour, owns the outcome>,
and the answer must not <the thing the neighbouring modes produce instead>.
```

In the line the model actually receives, both gaps sit inside the `whenToUse` sentence — the first is its opening clause, the second its closing one — while the name and slug in front of them carry no effect this report can measure.

The gaps are deliberate. `<…>` is a placeholder, not text to publish. The first gap names a trigger narrow enough that a neighbouring line does not also match it; the second names an exclusion the neighbours do not impose — which is the form that measured 27.5 points ahead of the same clause stated as a requirement (line C against line B), at the seventh entry, on this brief. Nothing here shows that either gap generalises, and no experiment has yet compared this skeleton against a line written any other way.

### 7.3 One worked example, untested

Line C, annotated in the same three fields. The name and the slug were held fixed across all three wording arms — the entry was `explain` at the seventh position — so everything the experiment moved sits inside the `whenToUse` sentence:

```
Explain | explain | Use when someone asks why code behaves as it does, and the answer must not merely describe the code.
```

The sentence is 99 characters; the name and slug are shown only to mark where the measured text sits, and nothing in the results is about either of them.

- **The trigger** — "why code behaves as it does" — names a situation rather than a quality ("expert explanation"). It is the form line C took; because C and B differ only in their second clause, the 27.5-point gap between them belongs to the exclusion, not to the trigger.
- **The exclusion** — "not merely describe the code" — names what the answer must avoid, which is the form that measured 27.5 points ahead of the equivalent requirement (C 89.0% against B 61.5%, length-matched at 99 against 96 characters). Read as a design instruction, it is the one clause in the line that a neighbouring mode's line would not also satisfy.
- **What it does not do** — it does not claim the answer must cite evidence. That clause (line B) committed **least** of the three (61.5%), and it is a requirement other modes could satisfy.
- **What it costs** — nothing here says this line would win from the first entry. The position experiment moved this clause family to both extremes and found a difference whose mechanism is unidentified (§4.2); placement can swamp wording, and no experiment yet shows how to buy position.

---

## 8. Recommended next experiments, and what is still open

These six would change what this report can say. Two of them have partly been run since the draft — the X re-run (§4.7) and the second-provider replication (§4.8) — and their outcomes are folded into the items rather than removed, so each item now states what is left of the question. All six are within-run designs that publish a per-arm block decomposition beside every contrast; none requires new machinery.

0. **The same contrast on the line the extension actually renders (R0).** Every experiment here used `- <slug> — <Name> — <whenToUse>`; the product renders `* "<Name>" mode (<slug>) - <whenToUse>` under a `MODES` heading, name first (log §32). One new registration, two arms — the C-versus-B pair, the first-versus-last pair, or both — rendered in the product form, with a new echo reference and an extractor profile re-derived on product-form replies before any contrast is read. It is cheap (200–400 calls, ≈€1–2) and it is a mechanism test as well as a validity check, because two directional predictions are already on record: if the last-entry advantage rests on leading-token recency it should shrink or reverse, and if leading each line with the slug had been flattering the wording contrast then C−B should be **larger** on the product form. Registering those two before the run is what makes either outcome informative.

    **Partly answered (2026-11-23).** The registration ran and so did three follow-up batches. Both predictions were borne out in direction: the wording contrast is larger in the product form (+33.3 against +21.4, §4.10), and the last-entry advantage is absent there (−9, and the same line declares 18 points less at the last slot, §4.9). Two further questions were settled in the same rendering — field order inside the experiment template is inert and the product's own line beats the experiment form by +27.4 (§4.5, log §40), and the quoted slot decides which token the model names (§4.11). The extractor gap that F-15 identified has since been closed: v4 reads the label form, the twenty-reply wall still passes, and every batch has been re-derived at no cost (log §44). R0 is complete; what it leaves open is replication on a second brief and a second model, not the instrument.

1. **Why one arm ramped — asked, partly answered.** Arm X of E20c rose 24 points inside a 100-minute run while the arms interleaved with it did not. Three candidates were named, none of them observable from the client side: **warm-up**, **provider-side caching or batching**, and **quota shaping**. The 200-call re-run answers the first question and not the second: the ramp does not reproduce (z = 2.72 → −0.06) but the level moves 47.0% → 54.0% (§4.7). What is left is not "does it ramp" but "what makes one batch sit seven points above another", and that needs a design which varies batch conditions deliberately and records them, not another trend test.
2. **`explain` first, the rival last, against a control in the same batch.** The first-versus-last difference is unexplained, and the slot-occupant experiment was inconclusive because its control arm ramped. One batch, three arms — `explain` first with the rival last, `explain` last with the rival first, and the same control as before — each tested for stationarity before any contrast is read, would separate a first-entry penalty from a last-entry reward from a neighbour effect.
3. **A brief that passes the screen.** Everything here is one point in ambiguity space, and six further briefs were screened without producing a second one (log §29). The next step is therefore not "another brief" but a brief that both opens the ask channel and leaves `explain` a plausible owner; until one is found, the 27.5 points remain a result about a question of one kind.
4. **A model that asks.** The second provider is provisioned and was tried: it asked not once in 91 replies, so the channel this effect lives in does not exist there and the contrast cannot be measured on it (§4.8). What is needed now is a provider with a comparable ask rate, established before any draws are spent.
5. **Position crossed with wording.** Neither lever has been tested in the presence of the other. The registration forbids re-running E20 without a new one, so this needs a fresh registration — and, given §4.6, all arms in a single batch with the block decomposition published beside every contrast.

### 8.1 Still open, and who owns it

Two of the five items that stood in this position in the draft are now closed. They are recorded as closed rather than deleted, because each was an objection a reader may still hold.

1. **Closed — the second adjudication pass.** The draft reported 13.2% coverage from the same reader. A full independent pass has since run: a different model, a blind packet, 378 E20 replies, **99.7%** agreement under the corrected rule (§3.7, log §26). The objection is answered, not deferred.
2. **Closed — E20c's adjudication, without changing its verdict.** The 241 undetermined E20c replies have been adjudicated, which moves the rates to 49.0 / 65.5 / 76.0 (Annex H). The arms are still not stationary, so §4.3 remains inconclusive and those rates still cannot be quoted as a contrast.
3. **Open — the reversal needs a within-batch replication, on a brief that passes the screen.** §4.1's effect contradicts the registration's prediction and §4.6 rules out reading a cross-batch copy of it, so the replication needs a new registration; one brief out of seven makes finding the second brief the binding constraint. Owner: the experiment programme.
4. **Open — the harm measure is underpowered.** 12% against 0% is the most policy-relevant number here and the least precise: E20b's design resolves about 19.8 points at n = 100. A wrong-commit arm at n = 400 is the cheapest useful follow-up and needs no new machinery. Owner: the experiment programme.
5. **Open — extractor v3.** 27 of 378 adjudicated replies (7.1%) were commitments the pinned parser missed, and 21 of 600 E20c replies were bare slugs. The merge step also cannot represent an adjudicated commitment to a non-`explain` slug, which is what produced the 46-versus-45 discrepancy (Annex C, log §30). Owner: instrument work, and it should land before the next round spends money.
6. **Closed in part — the rendered form.** No arm had used the line the extension emits when this report was drafted, so the transfer of both headline results to the product was untested (log §32). R0 (§4.9–§4.11) has since run in that form: the wording contrast is larger there, the position difference is absent there, the product's own line out-commits the experiment's, and the quoted slot decides which token is named. The instrument gap is closed as well: extractor v4 reads the label form under a vocabulary anchor, R2's twenty-reply wall still passes 16/16, and every batch has been re-derived at zero cost (log §44). What R0 leaves open is replication — a second brief, a second model, and a strength question the four-arm design could not ask.

## Citations

Only the sources used in this report are listed. Initials and full author lists are recorded in the programme register at [`modes-label-form-2026-11.md`](../research/modes-label-form-2026-11.md) §12, where two entries are given by surname only; they are left incomplete here rather than guessed.

Asking Earns Nothing: Scoring the Decision to Act in BFCL Multi-Turn. (2026). _arXiv_. https://arxiv.org/abs/2610.04429

Barsalou, L. W., et al. (2010). _On the vices of nominalization and the virtues of contextualizing_ [Book chapter]. https://barsaloulab.org/Online_Articles/2010-Barsalou_et_al-chap-nominalization_contextualizing.pdf

Budiu, R. (n.d.). _Information scent_. Nielsen Norman Group. https://www.nngroup.com/articles/information-scent

GOV.UK Design System. (n.d.). _Button_. https://design-system.service.gov.uk/components/button

Kaley, A. (n.d.). _UI copy: UX guidelines for command names_. Nielsen Norman Group. https://www.nngroup.com/articles/ui-copy

Katz, S. M., & Byrne, M. D. (2003). Effects of scent and breadth on use of site-specific search. _ACM Transactions on Computer-Human Interaction, 10_(3). http://chil.rice.edu/research/pdf/KatzByrne03.pdf

Kawaletz, L., & Plag, I. (2015). _Predicting the semantics of English nominalizations_. https://www.anglistik3.hhu.de/fileadmin/redaktion/Fakultaeten/Philosophische_Fakultaet/Anglistik_und_Amerikanistik/Ang3_Linguistics/Dateien/Detailseiten/Plag/Kawaletz_Plag2015_Predicting_the_semantics_of_English_nominalizations.pdf

Li, Qiao, & Gao. (2026). _Which metadata matters for LLM tool selection in MCP? Evidence from controlled factor-level interventions_. arXiv. https://arxiv.org/abs/2610.14334

Microsoft Learn. (n.d.). _Menus: UI text guidelines_. https://learn.microsoft.com/en-us/previous-versions/windows/desktop/bb246448(v=vs.85)

Raskin, J. (2000). _The human interface_. Addison-Wesley. Read via a secondary exposition: https://flylib.com/books/en/4.378.1.22/1

VA.gov Design System. (n.d.). _Button_. https://design.va.gov/components/button

## Annex A — Provenance, cost, and deviations

The costs are published because every finding here is credible partly because the cost of finding it is visible: a programme that hides its spend is asking to be believed on trust.

| Item                           | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Published E20 batch            | [`runs/e20-2026-11-17`](../../runs/e20-2026-11-17) — 900 records, 16M                                                                                                                                                                                                                                                                                                                                                                                                          |
| Published E20b batch           | [`runs/e20b-2026-11-16`](../../runs/e20b-2026-11-16) — 200 records, 3.7M                                                                                                                                                                                                                                                                                                                                                                                                       |
| Published E20c batch           | [`runs/e20c-2026-11-17`](../../runs/e20c-2026-11-17) — 600 records, 600 `RUN`                                                                                                                                                                                                                                                                                                                                                                                                  |
| Gate (E20)                     | [`runs/e20-gate-2026-11-16`](../../runs/e20-gate-2026-11-16) — 90 records, 1.9M                                                                                                                                                                                                                                                                                                                                                                                                |
| Gate (E20c)                    | [`runs/e20c-gate-2026-11-17`](../../runs/e20c-gate-2026-11-17) — 60 records, exclusion and clustering only                                                                                                                                                                                                                                                                                                                                                                     |
| Aborted E20 attempt (excluded) | [`runs/e20-2026-11-16`](../../runs/e20-2026-11-16) — 781 records, 15M                                                                                                                                                                                                                                                                                                                                                                                                          |
| Closing round preserved        | [`runs/e13r-2026-11-12`](../../runs/e13r-2026-11-12) — 600 records, 600 prompts, 5.5M                                                                                                                                                                                                                                                                                                                                                                                          |
| Calls producing output         | **2,591** (90 gate + 741 aborted + 900 E20 + 200 E20b + 60 E20c gate + 600 E20c). The closed round's **600** are excluded here and are accounted in log §23 and §5.1                                                                                                                                                                                                                                                                                                           |
| Cost                           | ≈ **€13.21** (2,591 calls × €5.1 / 1,000) — rate-derived, not read from billing                                                                                                                                                                                                                                                                                                                                                                                                |
| Wall clock                     | gate 13.2 min · E20 135.8 min · E20b 32.3 min · aborted attempt 106.9 min · E20c gate 9.3 min · E20c 100.0 min = **6.62 h**                                                                                                                                                                                                                                                                                                                                                    |
| Mean duration per call         | gate 8.83 s · E20 9.05 s · E20b 9.70 s · E20c 10.00 s; weighted **9.43 s** over 1,850 published calls vs 9.6 s estimated                                                                                                                                                                                                                                                                                                                                                       |
| Picker form rendered           | `- <slug> — <Name> — <whenToUse>`, no heading ([`pickerLine`](../../scripts/lib/framing-pretest.mjs:243)), confirmed verbatim at [`ARM-1-d001.txt:13`](../../runs/e20-2026-11-17/prompts/ARM-1-d001.txt:13) (line 13; line 7 is `requirements` — corrected 2026-11-23, log D-29). The extension renders `* "<Name>" mode (<slug>) - <whenToUse>` under `MODES` ([`modes.ts:33`](../../src/core/prompts/sections/modes.ts:33)). Divergence recorded in log §32 and not repaired |

**Programme-wide**, including the closed round's 600 and the 9-call smoke test: **3,200 calls**, ≈€16.32 at the same rate.

**Deviations, all recorded rather than smoothed:**

1. **The first E20 batch aborted** at 781/900 when prepayment credits were depleted (HTTP 402), leaving 40 `UNRUN` records (5.1%; 5.2% per long arm). Under §5 that batch refuses and publishes no estimate; it is preserved untouched. A **fresh full batch** was dispatched after top-up into a **new** directory, because the instrument has no resume path and a spliced tail would place a fixed block of failures inside the outcome sequence the runs test is meant to inspect.
2. **Pooling was declined**, and this is now evidenced rather than cautious: the two batches are independent draws (Annex F), so pooling would legitimately add information — it would move the primary contrast from 27.5 to 25.7 points and leave the verdict unchanged — but it breaks the registered n and would require adjudicating 223 more replies. The comparison is reported here instead.
3. **Cost overran the combined €9.4 estimate for E20 and E20c, and a sub-total inside that estimate was wrong.** The figure printed here as €6.3 implies **1,235 calls** at €5.1 / 1,000; E20's published batch is **900 calls (€4.59)** and its gate **90 (€0.46)**. The overrun is real, and it has two causes: the discarded partial batch (741 paid calls ≈ €3.8) and E20c's published batch running 100.0 minutes at 600 calls (€3.06) plus its 60-call gate (€0.31). The counts per stage as they stand on disk are: E20 gate 90, aborted E20 781 records of which 741 paid, published E20 900, E20b 200, E20c gate 60, E20c 600, closing round 600, smoke test 9.

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
| ARM-2 | first entry | 100 | 15                          | +0                       | **15 (15.0%)**     | 85    | 0            | 100%        |
| ARM-1 | last entry  | 100 | 53 (42 `explain`, 11 other) | +3                       | **45 (45.0%)**     | 43    | **12**       | 88%         |

> **Two counting definitions meet here, and only one is a declared key.** ARM-1's 53 mechanical declarations are not all of `explain`: 42 name it, 11 name another mode and are the wrong commits. The 47 undetermined replies were adjudicated blind, and that pass returned four declarations — three naming `explain` and one consisting of the bare slug `architecture-reviewer`. The declared-key total is therefore **45**, and the wrong-commit total **12** (11 mechanical + 1 adjudicated), with 43 asks. Counting all four adjudicated declarations as declared keys gives **46**; that is the merge tool's figure, because the verdict vocabulary carries no slug, and it is not used. Anything reading "46.0% for the last entry" is the merge tool's number and double-counts a commit to a different mode (log §30).

## Annex D — Pre-declared statistical tests

| Contrast                                                 | Declared rates | Difference    | 95% CI         | Exact two-sided _p_ | Holm-adjusted |
| -------------------------------------------------------- | -------------- | ------------- | -------------- | ------------------- | ------------- |
| **E20 primary: B vs C**                                  | 61.5% vs 89.0% | **−27.5 pts** | [−33.1, −21.7] | 7.1 × 10⁻²⁰         | < 10⁻¹⁹       |
| E20 secondary: A vs B _(length-confounded, descriptive)_ | 75.0% vs 61.5% | +13.5 pts     | [+3.1, +22.4]  | .0141               | .0141         |
| **E20b: P1 vs P45**                                      | 15.0% vs 45.0% | **−30.0 pts** | [−41.3, −17.5] | 5.6 × 10⁻⁶          | 5.6 × 10⁻⁶    |
| E20b harm: wrong commits P45 vs P1                       | 12.0% vs 0.0%  | +12.0 pts     | [+5.8, +19.8]  | 3.4 × 10⁻⁴          | —             |
| E20c rival capture: Z vs X                               | 1 vs 1         | not estimated | —              | —                   | —             |
| E20c explain shift: Y vs X                               | 60.0% vs 47.0% | not estimated | —              | —                   | —             |
| E20c explain shift, unregistered: Z vs X                 | 71.5% vs 47.0% | not estimated | —              | —                   | —             |

Holm within each experiment (E20: two tests, primary evaluated at α = .025; E20b: one). Minimum detectable difference: **~10 points at n = 400**; **~19.8 points at n = 100**; **14.0 points at n = 200**, per the E20c registration.

The E20c rows carry **no difference, no interval and no adjusted _p_**. Three reasons, one per column: the control arm is not stationary, so a difference between two arms averaged over the run is not an estimate of anything (M-10); both contrasts decay across the blocks (§4.6), so no interval would describe them; and the counts behind them are mechanical, with 241 of 600 replies unresolved and no manual pass yet (M-1, D-19). The declared rates are printed for traceability, not as an effect.

## Annex E — Runs tests (outcome dependence)

| Arm         | Runs observed | Runs expected | z         | _p_  |
| ----------- | ------------- | ------------- | --------- | ---- |
| ARM-1 (B)   | 193           | 190.42        | 0.27      | .79  |
| ARM-2 (A)   | 37            | 38.50         | −0.40     | .69  |
| ARM-3 (C)   | 81            | 79.32         | 0.43      | .67  |
| ARM-2 (P1)  | 31            | 27.88         | 1.18      | .24  |
| ARM-1 (P45) | 52            | 50.50         | 0.30      | .76  |
| E20c X      | 101           | 100.64        | +0.05     | .96  |
| E20c Y      | 114           | 97.00         | **+2.51** | .012 |
| E20c Z      | 81            | 82.51         | −0.26     | .79  |

No E20 or E20b arm shows sequence dependence, and that is the guard the verbatim check cannot provide. The E20c rows are not a comfort: they are computed on the mechanical `explain` sequence, because E20c has no adjudication, and **Y has more runs than chance** — 114 against 97 expected, z = +2.51, _p_ ≈ .012 — which is dependence in the _alternating_ direction rather than the clustered one, and would pass both the verbatim guard and the exclusion guard. Counting declarations to any slug instead moves X to z = −0.25 and Z to z = −0.11 and leaves Y unchanged. A runs test detects dependence, not trend: that is why §4.6's block decomposition, and not this table, is what demoted E20c.

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

**Defect 1 — the pinned extractor misses commitments.** 27 of 378 (7.1%) were commitments it could not parse: bare slug, bare backticked slug, `**mode: slug**`, unbolded `Selected mode:`, slug followed by prose. All but one named `explain`. It recurred in E20c, where 21 of 600 replies were a bare slug (D-19).

**Defect 2 — the merge cannot represent an adjudicated wrong commit.** [`mergeJudgements`](../../scripts/lib/adjudication.mjs:535) counts every adjudicated `DECLARATION` as a declared key, justified by the claim that a non-key slug "never reaches the packet". That held in E20 and failed once in E20b. Any published table must carry the corrected split (Annex C).

**Defect 3 — the registration is sign-blind in its thresholds and sign-specific in its readings.** §6 supplies a reading for "≥ 20 points" that asserts a direction. A reversed ≥ 20-point result therefore has no pre-registered reading. Recorded as a gap in the registration, not as evidence for the original hypothesis.

**Defect 4 — a gate can be quoted out of context.** The 60-draw E20c gate inverted two arms against the sweep (X 65.0%, Y 45.0%, Z 65.0%). The gate is registered for exclusion and clustering only; its declaration rates carry no reading (D-20).

**Note — vocabulary size.** The sealed key carries **45** slugs; registration §4.2 describes the union as **47**. No declaration was affected (the vocabulary used is the one the key supplies, which is what the extractor was given), but the fixture and the registration disagree and one of them should be corrected before re-sealing.

## Annex H — E20c: three arms, one slot

600 calls, 200 per arm, all `RUN`, interleaving proved at 599 transitions. `explain` at the seventh entry with line B in every arm; only the last entry's occupant changed, by a swap.

| Arm   | Last entry holds                          | `explain` declared (mechanical) | Adjudicated (+) | Corrected           | Extractor-undetermined |
| ----- | ----------------------------------------- | ------------------------------- | --------------- | ------------------- | ---------------------- |
| **X** | `ai-cost-engineer` (original)             | 94/200 = 47.0%                  | +4              | **98/200 = 49.0%**  | 105                    |
| **Y** | `documentation` (non-competing filler)    | 120/200 = 60.0%                 | +11             | **131/200 = 65.5%** | 80                     |
| **Z** | `architecture-reviewer` (plausible rival) | 143/200 = 71.5%                 | +9              | **152/200 = 76.0%** | 56                     |

**Stability (mechanical, blocks of 50 draws).**

| Arm | Declarations per block | Rate shape                    | Read as                         |
| --- | ---------------------- | ----------------------------- | ------------------------------- |
| X   | 18 / 20 / 27 / 30      | 36.0% → 40.0% → 54.0% → 60.0% | ramps (CA z = 2.72, _p_ ≈ .007) |
| Y   | 32 / 31 / 27 / 30      | 64.0% → 62.0% → 54.0% → 60.0% | flat (CA z = −0.65)             |
| Z   | 38 / 37 / 35 / 34      | 76.0% → 74.0% → 70.0% → 68.0% | declining (CA z = −0.99)        |

The X and Z rows count declarations naming any mode (95 and 144 in total); the `explain`-only totals are 94 and 143, and §4.6 prints both versions of the per-block contrasts.

**Readings, and their status.**

| Contrast               | Mechanical | Corrected | Status                                                                                                                                 |
| ---------------------- | ---------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Rival capture (Z vs X) | 1 vs 1     | —         | **Not estimable at this n** — 56 of Z's 200 replies are unresolved. The reading is not applied and its opposite is not claimed (§4.3). |
| Explain shift (Y vs X) | +13.0      | +16.5     | Inside the 10–20 indecisive band by construction, but the arms are not stationary, so not even "indecisive" is applied (§4.6).         |
| Explain shift (Z vs X) | +24.5      | +27.0     | Unregistered, and the per-block contrast decays (+40, +34, +16, +8), so the average is not a magnitude to quote.                       |

**Verdict: inconclusive.** Arm X ramps 36% → 60% inside its own run and both contrasts decay to 0 and +8 points, so no average of them estimates anything. The 241 undetermined replies have since been adjudicated (log §26), which moves the levels to 49.0 / 65.5 / 76.0 without touching the decay — the arms are still not stationary, which is why the verdict does not change. What survives is narrower than the registration anticipated: a plausible rival placed in the last slot was selected twice in 600 replies, so it does not capture the slot.

**Zero-based numbering.** This is the only place the fixture's own indexing appears. The fixture counts entries from zero: with 45 entries, the first entry is 0, the seventh is 6, and the last is 44.

**Gate (60 draws, 20 per arm).** X 65.0%, Y 45.0%, Z 65.0% — the gate exists for exclusion and verbatim clustering only; those rates are noise and are not quotable (D-20).

**Extraction (D-19).** 241 replies were undetermined by the pinned extractor. 21 of them consist of a bare slug, which it cannot resolve at all (X 3, Y 10, Z 8). All 241 were then re-read blind under the selection rule (log §26), and that pass resolved them into the adjudicated column above: +4, +11 and +9. The corrected counts are therefore adjudicated rather than bounds; what they still cannot support is a contrast, because the arms are not stationary (§4.6).

**Provenance.** [`runs/e20c-2026-11-17`](../../runs/e20c-2026-11-17) — 600 records, 600 `RUN`, 100.0 min, 10.00 s mean; [`runs/e20c-gate-2026-11-17`](../../runs/e20c-gate-2026-11-17) — 60 records, 9.3 min. Canonical record: [`modes-experiment-log.md` §23](../research/modes-experiment-log.md:812) and [§24](../research/modes-experiment-log.md:834).

## Annex I — The second-provider pilot

Run on 2026-11-18 against a second provider, stopped at 109 of 800 calls (log §25). All 91 output-producing replies across the two wording arms:

| Arm                   | n   | Declared `explain` | Other picks               | Asked | Distinct strings |
| --------------------- | --- | ------------------ | ------------------------- | ----- | ---------------- |
| B — artefact stated   | 43  | 41 (95.3%)         | 2 `codebase-cartographer` | 0     | —                |
| C — artefact excluded | 48  | 48 (100%)          | none                      | 0     | —                |

Five distinct strings across 91 replies, every one a mode name. Failures: five replies truncated to empty content at a 4,096 cap, because a reasoning model spends the output budget on hidden reasoning before answering (D-24); one empty completion. All six failures were in arm B, which is why dropping them rather than raising the cap would have biased the comparison.

Cost: ≈€0.6. The 709 calls not spent would have measured a ceiling.
