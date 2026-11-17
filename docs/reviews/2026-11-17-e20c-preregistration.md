# Pre-registration — E20c: is the last slot a magnet, or is `explain` special?

| Field          | Value                                                                    |
| -------------- | ------------------------------------------------------------------------ |
| **Drafted**    | 2026-11-17, after E20 and E20b, before any E20c call                     |
| **Status**     | Registered. No calls made. Run only on explicit approval                 |
| **Depends on** | E20 and E20b results (report §4), log §22 method rules                   |
| **Calls**      | 600 (three arms × 200) ≈ **€3.1** at the measured rate of €5.1 per 1,000 |

## 1. The question this exists to settle

E20b found that `explain` committed **29.0 points more often** when it sat at the **last** position than the first (45.0% against 16.0%, 12 wrong commits against 0). That is the largest effect the programme has measured, and it contradicts the literature's direction.

It also has an unresolved alternative. Moving `explain` to an extreme changed three things at once:

1. **its own index** in the list;
2. **its neighbours** — at the ends it loses a predecessor or a successor entirely;
3. **the index of every other mode**, because moving one item shifts the rest.

Any of the three could produce the observed gap. The practical consequence differs sharply:

- If the effect belongs to **the item being last**, catalogue advice is "put the recommended mode at the end".
- If it belongs to **the slot being last**, the advice is instead "the last slot attracts traffic whoever occupies it", which is a much weaker and more fragile design lever — and it predicts that a rival placed last will start winning.

This design tests the second prediction with a **different occupant**, which is the only way to separate the two without rearranging forty-two modes and creating a fresh confound.

## 2. Design

Three arms, 200 draws each. `explain` stays at **index 6 in all three arms**, with the **same line** in all three. What changes is **who occupies index 44**.

| Arm   | `explain` at    | Index 44 occupied by                                      | Role                                                             |
| ----- | --------------- | --------------------------------------------------------- | ---------------------------------------------------------------- |
| **X** | index 6, line B | its original occupant                                     | Control — replicates E20 arm B (59.3% declared) at a new date    |
| **Y** | index 6, line B | `documentation` — a **non-competing** mode for this brief | Tests whether moving any item to the end disturbs `explain`      |
| **Z** | index 6, line B | `architecture-reviewer` — the **plausible rival**         | Tests whether the last slot pulls selection towards its occupant |

Line B, verbatim, in all three arms: `Use when someone asks why code behaves as it does and the answer must cite evidence, not recall.` (96 ch)

Brief, verbatim, in all three arms: `Explain why this module is structured the way it is.` (52 ch)

Everything except the occupant of index 44 is byte-identical to E20's arm B picker. The moved mode is swapped with whoever held index 44, so the list length and every other index are preserved — a clean swap, not a removal.

200 draws per arm, round-robin interleaved, one call in flight at a time, `gemini-3.5-flash`, one `maxOutputTokens` value fixed before the first call.

## 3. Outcomes

Two co-primary outcomes, because the two arms answer different questions:

| Outcome           | Definition                                 | Arm         |
| ----------------- | ------------------------------------------ | ----------- |
| **Rival capture** | the reply declares `architecture-reviewer` | Z against X |
| **Explain shift** | the reply declares `explain`               | Y against X |

`asked` and `wrong commit` are recorded for every arm. Extraction uses the pinned `routing-round-parser/2`, and every undetermined reply is adjudicated through the anonymised packet described in Amendment 2 §4.

## 4. Design rules, not step counts

A list of fixed length cannot hold one item's index, its neighbours, and every other item's index constant at once. This design therefore does **not** test "position versus adjacency" in the abstract; it tests the specific alternative that would change the advice:

> If the last slot attracts selection regardless of occupant, then moving a rival there should raise that rival's share, and moving a filler there should not disturb `explain`.

Neither prediction can be produced by `explain`'s own index, because its index never changes.

## 5. Statistics

- Two-sided Fisher exact on each contrast, Holm-corrected across the two, so the primary is evaluated at α = 0.025.
- Smallest detectable difference at n = 200 per arm: **14.0 points** at 80% power, 16.2 at 90%.
- A "no movement" reading therefore means _no effect larger than about 14 points_, and will be written that way.
- Guards as before: exclusion rate above 5% in any arm stops the sweep; a longest identical verbatim run above 5 clusters the arm; a per-arm runs test on the outcome sequence is reported beside the clustering guard.

## 6. Decision rules — both signs, as M-6 requires

**Rival capture (Z against X):**

| Observation                                                       | Reading                                                                                                                                                              |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `architecture-reviewer` declared **≥ 20 points more** in Z than X | **The last slot is a magnet.** Catalogue advice becomes "the end of the list attracts selection, whoever sits there", and E20b's number is restated as a slot effect |
| **≤ 10 points** more                                              | The slot is not a general magnet. E20b's effect belongs to `explain` occupying the end, and the advice "put the recommended mode last" survives                      |
| 10–20 points                                                      | Indecisive; recorded with the magnitude, not re-run without a new registration                                                                                       |
| **Any decrease**                                                  | Recorded as a reversal of the prediction, with the same discipline E20 applied to its own reversal: a large negative is a finding, not a null                        |

**Explain shift (Y against X):**

| Observation                                                                       | Reading                                                                                                                                                            |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `explain` moves **≥ 20 points** when a **non-competing** mode is moved to the end | The list as a whole is sensitive to composition, not just to the occupant of the last slot; every earlier routing result becomes conditional on its exact ordering |
| **≤ 10 points**                                                                   | Composition elsewhere is inert at this brief, which isolates any slot effect to the slot itself                                                                    |
| 10–20 points                                                                      | Indecisive; recorded                                                                                                                                               |

Both contrasts are reported whatever they show. If X drifts far from E20 arm B's 59.3%, that drift is reported as a batch-to-batch difference and the other contrasts are interpreted against X, not against 59.3%.

## 7. What this does not test

- **Whether `explain` at a middle position behaves differently from a middle position generally.** That needs several items moved, and each such move re-creates the confound this design exists to avoid.
- **Why** the last slot might attract selection. Recency of reading, list termination, and prompt structure are all candidates and none is separable here.
- Any brief other than the one registered, and any model other than `gemini-3.5-flash`.

## 8. Cost and stop rules

| Item                   | Calls | ≈ Cost   |
| ---------------------- | ----- | -------- |
| E20c, three arms × 200 | 600   | **€3.1** |

Stop before spending if: the fixture fails schema validation; the three arms do not differ at exactly one index; the swap changes any index other than the two involved; or the extractor cannot round-trip the E20 runs at their recorded residual.

A 60-draw gate (six cycles, ≈€0.31) runs first and stops the sweep on the same thresholds as Amendment 2 §1.

## 9. Preconditions

- [ ] Fixture built from E20's arm B picker by a **swap**, with an assertion that exactly two indices changed
- [ ] Three distinct `promptSha256` values, and a prompt diff showing the moved line and nothing else
- [ ] Answer key sealed before the run, with no arm letter and no line text
- [ ] Gate at 60 draws passed
- [ ] Adjudication packet built with the blindness assertion passing

## 10. Amendment log

_(empty — no amendments)_
