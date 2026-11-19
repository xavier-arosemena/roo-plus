# Red-team review — routing closing round (E13-R), before the run

| Field                                     | Value                                                                                                                                                                                                                                                                                                                                                   |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Object under review**                   | [`2026-11-12-routing-closing-round-preregistration.md`](2026-11-12-routing-closing-round-preregistration.md), including **Amendment 1** (six cells, 2×2 factorial, two models)                                                                                                                                                                          |
| **Question asked**                        | Can this round answer the question it registers, and can its statistics bear the reading it pre-commits to?                                                                                                                                                                                                                                             |
| **Method**                                | Read the registration and Amendment 1 against the experiment log (§11, D-1…D-10, F-1, F-2); derived each cell's manipulation by inspection; recomputed the power and multiplicity implications; checked each objection against the error species already recorded in this programme. No model call, no network, no file edited.                         |
| **Verdict**                               | **AMEND BEFORE RUNNING**                                                                                                                                                                                                                                                                                                                                |
| **Independence caveat — read this first** | **This review was written by the same author as the design.** The programme's own precedent is that independent reviews found what self-reviews did not. Three of the objections below are ones I would probably have shipped. A second, independent pass is still owed before the run; treat this document as a necessary filter, not as the red team. |

---

> **SUPERSEDED 2026-11-12.** An independent review was completed at
> [`2026-11-12-routing-closing-round-red-team-independent.md`](2026-11-12-routing-closing-round-red-team-independent.md).
> It found all of this document's valid objections, added two fatal findings this one missed (the §6
> readings table was non-exhaustive and keyed to stale cell names; the primary interaction is
> underpowered at 30 draws), and corrected two of its factual claims (the plain line is 77 characters,
> not 84, and it does contain a requirement). **Read the independent review as the authority.** This
> document is retained only as the record of what a self-review caught and what it missed.

## 1. Verdict and why

The round is worth running and the factorial was the right correction. But **the control cells do not share a routing line with the treatment cells**, so the primary interaction compares two different manipulations while calling them the same one. That defect sits in frozen material and cannot be repaired at analysis time.

Two further issues would produce publishable-looking but unreliable results: the replication rule is asymmetric for no principled reason, and the binary datum discards the one signal this programme has consistently found.

---

## 2. Objections

### O-1 — FATAL: the control cells change the routing line too, so the interaction is not estimable

**What is wrong.** The primary claim is (C2 − C1) − (C6 − C5), described as "is the verb-versus-noun effect larger on the ambiguous brief than on the unambiguous one". But the two halves are not the same manipulation:

| Pair    | Brief       | What differs between the two cells                                                                     |
| ------- | ----------- | ------------------------------------------------------------------------------------------------------ |
| C1 → C2 | ambiguous   | **slug + name only** — the line is held at the _constraint_ form, so this is a clean register contrast |
| C5 → C6 | unambiguous | **slug + name _and_ the routing line** — `debug`'s native line versus `bug-report`'s native line       |

So (C6 − C5) measures form _plus_ an uncontrolled change of wording, while (C2 − C1) measures form alone. Subtracting one from the other subtracts a clean contrast from a contaminated one. The difference of differences would be uninterpretable whichever way it came out.

**Evidence.** Amendment 1 §A1.2 lists C5 as "native line from the axis fixture, verbatim" and C6 as "native line from the artefact fixture, verbatim". Those are different sentences with different lengths and different verbs. The registration itself asserts byte-identity to each fixture, which guarantees the two lines differ.

**What would fix it.** Make the control pair differ in **form only**, exactly as C1 → C2 does: take `debug`'s native line and use the _same sentence_ for the `bug-report` cell, changing nothing but slug and name. Then both halves are single-field manipulations and the interaction is estimable. Cost: zero extra calls, one fixture requirement.

**Registered material?** Yes — a fixture specification in §A1.2.

### O-2 — SERIOUS: the replication rule is asymmetric without a reason, and that invites cherry-picking

**What is wrong.** §A1.4 designates the cross-vendor model as the sole basis for the primary claim, with Gemini reported as "replication" and any opposing Gemini result labelled "heterogeneity". But nothing justifies preferring DeepSeek a priori — it was chosen to _strengthen_ the claim, not as the more trustworthy instrument. The rule as written permits: a positive DeepSeek result is "supported", while a positive Gemini result with a null DeepSeek is "not supported". Two identical datasets would be read differently depending on which model happened to be designated primary.

**What would fix it.** Make the claim **conjunctive and symmetric**: the interaction interval must exclude zero **with the same sign in both models**. Anything else — one positive, one null, or opposite signs — is recorded as **not established across models**, with both intervals reported in full. This is strictly stricter, needs no extra calls, and removes the discretion.

**Registered material?** Yes — §A1.4.

### O-3 — SERIOUS: the clustering risk is admitted and then not acted on

**What is wrong.** §8.1 concedes that draws from one prompt may cluster and that the bootstrap resamples "the very draws whose independence is in doubt". R-3 asks for a clustering check — but the check has **no consequence**. If caching produces near-identical outputs, the interval is too narrow, α is inflated, and the check merely reports the fact after the claim has been made.

**What would fix it.** Pre-commit a threshold and an action: if the longest run of identical consecutive outputs within a cell exceeds **5**, or the exact-duplicate transcript rate exceeds **20%**, the cell is declared **clustered**, its bootstrap interval is **not reported as an interval**, and the round's verdict becomes "clustered, effect not estimable at this n". A silent widening is worse than a refusal.

**Registered material?** Yes — R-3 needs an action clause.

### O-4 — SERIOUS: the binary datum discards the signal the programme actually found

**What is wrong.** The datum is "declared mode equals the sealed key". That collapses three distinct outcomes — chose the wrong mode, chose an adjacent mode, **declined to choose** — into "not a hit". The log records that abstention is the quantity that moved in every observation so far (E11: 3 of 5 in the ambiguous cell; the probe: 2 of 3). A design that scores abstention as a failure cannot report the phenomenon that motivates it, and its "hit rate" will fall whenever abstention rises, which is exactly the effect under test.

**What would fix it.** Register **abstention rate as a co-primary outcome**, with its own interaction test on the same model for the same cells, and state the multiplicity handling explicitly: two outcomes, so either designate one primary with the other secondary, or apply a Bonferroni-style α of 0.025 to each. Reporting it as "descriptive" while the primary statistic conflates it is not enough.

**Registered material?** Yes — §5 and §A1.4.

### O-5 — SERIOUS: the register × line interaction is almost certainly underpowered, and the registration does not say so

**What is wrong.** §A1.4 lists the register × line interaction as a secondary estimate. Interactions need roughly **four times** the sample of main effects for the same power, because the standard error of a difference of differences is about twice that of a single difference. With 30 draws per cell, a register × line interaction of moderate size is unlikely to be distinguishable from zero, and reporting it as an estimate invites over-reading.

**What would fix it.** One sentence in §A1.4: the register × line interaction is **reported as underpowered by design**, is not used to choose between register and constraint, and any claim about which of the two did the work requires a dedicated round.

**Registered material?** Yes — cheap.

### O-6 — SERIOUS: the line contrast confounds "constraint" with "negation and length"

**What is wrong.** The two lines differ in more than the presence of a constraint:

|            | Length    | Contains                                                               |
| ---------- | --------- | ---------------------------------------------------------------------- |
| constraint | 103 chars | imperative requirement ("must cite") **and a negation** ("not recall") |
| plain      | 84 chars  | neither                                                                |

So a C1-versus-C3 difference cannot be attributed to constraint-bearing versus plain; it may be the **negation**, or the 19-character length difference, either of which has its own literature. §A1.2 normalised away the definite article but stopped there.

**What would fix it.** Either accept and record the confound explicitly as a threat (cheap, honest), or specify a third plain line matched in length and free of negation as a diagnostic arm (expensive). Given that the round's primary question is the _form_ interaction, recording it is proportionate — but it must be in §8, not discovered later.

**Registered material?** Yes — §8.

### O-7 — MINOR: "abstention" is not operationally defined in the registration

**What is wrong.** O-4 asks for abstention as a co-primary outcome, but the registration never defines the string that counts as one. The instrument derives it as "declared no mode", which is mechanical and sound — but it must be written down, or a later reader will score a response that names three candidate modes differently from one that names none.

**What would fix it.** Add the definition to §5: abstention = **the response commits to no mode**, including the case where it lists candidates without selecting. Echoing a picker line counts as a declaration.

**Registered material?** Yes — one sentence.

---

## 3. What the design gets right

These should survive any rewrite.

1. **The factorial replaces a first-match sequence.** Two extra arms were requested; expressing them as a 2×2 estimates both main effects and their interaction from the same calls, which no sequential design can.
2. **One base picker, one rewritten entry.** This is the single most important structural improvement over E12: neighbour count, list length and byte density are all held constant, so a cell difference cannot be an artefact of list shape.
3. **A scorer-free decision path.** With a sealed key, every count and every stop is mechanical. Given that judgement layers have moved results twice in this programme (D-9), removing them entirely is the right call.
4. **The control brief is a real control.** Including an unambiguous brief is what makes the conditional hypothesis falsifiable at all; without it the round could only measure a main effect and call it a mechanism.
5. **No peeking, stated in advance.** Optional stopping would invalidate the very intervals the design depends on, and it is pre-committed.
6. **Power was computed before n was chosen**, and the moderate-effect column was included rather than only the flattering one.
7. **The cross-vendor model was added for the right reason** — same-family agreement would not support the claim the extra spend is meant to buy. O-2 attacks how it is used, not why it is there.

---

## 4. The single most damaging objection

**The control pair does not hold the routing line constant, so the primary statistic compares a clean manipulation against a contaminated one.** (C2 − C1) varies slug and name while the line stays fixed; (C6 − C5) varies slug, name **and** the entire routing sentence. Their difference is therefore not "the form effect on an ambiguous brief minus the form effect on an unambiguous one" — it is that, plus an uncontrolled wording difference of unknown size and sign. Everything else in this review can be repaired without changing the question; this cannot be repaired after the fact, because the two cells will already have been run.

**Smallest change that neutralises it:** specify that the `bug-report` control cell uses **`debug`'s own routing line, verbatim, with only slug and name changed** — mirroring exactly how C2 is built from C1. No extra calls, one sentence in §A1.2, and it converts a confounded contrast into a single-field manipulation.

---

## 5. What I could not check

- **Whether 30 draws actually behave as independent Bernoulli trials.** No model was called, and the design's own clustering check exists precisely because this is unknown.
- **Whether `deepseek-chat` is the current model id.** The registration requires verification at run time (R-7); until then the id is unverified, exactly as the Gemini model id was before it was listed.
- **Whether the "unambiguous" control brief is unambiguous to the models.** The maintainer chose to accept this as asserted; the review records that the control's validity rests on an assumption rather than a measurement.
- **The cost of 360 calls.** The per-call figure is E11's measured mean; E13-R's prompts are slightly larger, and reasoning-capable models vary in thinking-token volume by a factor this design cannot bound.
