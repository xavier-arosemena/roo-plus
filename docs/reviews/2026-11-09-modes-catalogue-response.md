# Response to the red-team review: what is accepted, what is corrected, what is kept

| Field                        | Value                                                                                                                                                                                                             |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                   | Author response, 2026-11-09. The [red-team review](2026-11-09-modes-catalogue-red-team.md) stands as written; this file records what changes because of it and where the review's arithmetic is itself corrected. |
| **Verdict accepted**         | **Do not run T-A…T-H in the given order.** The plan needed reconciliation before testing, and three of the objections were load-bearing.                                                                          |
| **Verdict on the direction** | Unchanged: jobs measure need, modes are interventions, the comprehension gap is real, the debugging test holds. The _implementation arithmetic_ changed materially.                                               |
| **Net effect**               | One objection accepted in a **sharper** form than raised; two accepted as raised; one **rejected with evidence**; one deferred; five tests added (T-I…T-M).                                                       |

---

## 1. The three that broke, and what happens to them

### O-01 — "The saving is an accounting transfer, not a saving" — **ACCEPTED, premise corrected, conclusion sharpened**

The review computed 119 skills × 148 chars ≈ **17,600 chars against a 2,000-char skills budget (8.8×)**.

**Premise corrected:** the skills index is **not global**. [`getSkillsSection()`](../../src/core/prompts/sections/skills.ts)
calls `skillsManager.getSkillsForMode(currentMode)`, so a mode sees only its own skills. The 119-skill sum
never appears in a prompt.

**But the objection survives in a sharper form, and this is the review's most valuable finding:**

| Correction                                                                                                      | Evidence                                                                                                                                                   |
| --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The per-skill cost is not the description — it is description **+ name + full `<location>` path + XML wrapper** | [`skills.ts`](../../src/core/prompts/sections/skills.ts) emits `<skill><name/><description/><location>…</location></skill>`; the path alone is 40–80 chars |
| So the real per-skill cost is ≈ **description + 150 chars**                                                     | 148-char mean description → ~300 chars per skill                                                                                                           |
| The `debug` owner carrying 11 skills costs ≈ **3,300 chars in a prompt section budgeted at 2,000**              | 11 × 300                                                                                                                                                   |
| The skills budget was written as a **global** number; it must be **per mode**                                   | The current rule cannot express the real constraint                                                                                                        |

**Consequence — a change to the model, not a patch:** "one skill per job" is not affordable. A mode may carry
**at most 6 skills**, and those skills must be **merged** where they share a procedure. The 119 jobs become
~119 _job definitions_ but a smaller number of _skills_ (target ≤ 6 per owner, ≤ ~90 total). The skills
index budget becomes per-mode: **≤ 1,200 chars including markup**.

This is the red team's clearest hit: the plan moved cost from a gated surface to an ungated one. It is now
gated.

### O-02 — "There are two plans (21 vs 24 owners, and 11 of 12 axes differ)" — **ACCEPTED**

Two documents described different catalogues. **Single source of truth: the brainstorm's 42 owners**
(24 coding + 5 meta + 13 non-coding). [`modes-units.md`](../modes-units.md) is corrected to reference it
rather than assert 21. The two jobs left unowned in the review's audit — **S6** (where personal data flows)
and **O11** (cost regression) — are restored explicitly:

- **S6** → `security-reviewer` owns it as a skill (privacy flow mapping is a review artefact, not a separate stance).
- **O11** → `devops` owns it, with `finops` as a **specialisation** rather than a vanished owner.

### O-03 — "T-B cannot fail at the assumption it is given" — **ACCEPTED, and the arithmetic restated**

The review is right that the 5.7k figure assumed an unstated 38 modes at 150 chars. Honest restatement at
the real ceiling (250 chars hard cap):

| Configuration       | Arithmetic                 | Verdict                                                                 |
| ------------------- | -------------------------- | ----------------------------------------------------------------------- |
| 42 owners × 250     | 10,500                     | leaves **1,500** for every specialisation — impossible                  |
| 42 × 200 + 18 × 150 | 8,400 + 2,700 = **11,100** | fits, with an authoring mean ≤ 200                                      |
| 42 × 220 + 25 × 150 | 9,240 + 3,750 = **12,990** | **fails**                                                               |
| 61 × 150            | 9,150                      | passes — the review's point: T-B passes trivially when the count is low |

**Therefore T-B is not a pass/fail test but a budget solver:** it must output the _maximum_ specialisation
count for a given authoring mean, and the catalogue must declare the mean it commits to. Proposal:
**mean ≤ 180 chars, hard cap 250, ≤ 20 specialisations in the preload.**

## 2. Objection-by-objection

| ID   | Objection (short)                                                   | Severity raised | Response                                                                  | What changes                                                                                                                                |
| ---- | ------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| O-01 | Skills accounting transfer                                          | FATAL           | **Accepted, sharpened**: per-mode index, real per-skill cost ≈ desc + 150 | Per-mode skills budget; ≤ 6 skills per owner; skills must merge                                                                             |
| O-02 | Two plans                                                           | SERIOUS         | **Accepted**                                                              | One owner set (42); S6 and O11 assigned; units.md corrected                                                                                 |
| O-03 | T-B unfalsifiable as specified                                      | SERIOUS         | **Accepted**                                                              | T-B becomes a solver; authoring mean ≤ 180 declared                                                                                         |
| O-04 | Discriminator gaming                                                | SERIOUS         | **Accepted**                                                              | G1 must be evidenced by a capability-map diff or a charter clause — an author's assertion does not count                                    |
| O-05 | Coarseness harm (78 → 2)                                            | SERIOUS         | **Accepted as a real risk**                                               | Specialisations are the valve; T-J measures the capability lost per retired slug                                                            |
| O-06 | Non-coding expansion (liability, positioning)                       | SERIOUS         | **Accepted with scope cut**                                               | A13–A17 only; A18–A21 deferred pending research; legal/medical carry advisory labels and **no preload**; a mode never owns _accountability_ |
| O-07 | D4 has no scorer and cannot be measured by a bake-off               | SERIOUS         | **Accepted**                                                              | D4 is scored by a human review of the selector UI plus 5 first-run observations; it is recorded as **unmeasured** until then                |
| O-08 | Deletion harm is unmeasurable                                       | SERIOUS         | **Accepted**                                                              | Aliases + T-J (capability-diff before/after per retired slug)                                                                               |
| O-09 | Goodhart: "measure the savings" optimises counts                    | SERIOUS         | **Accepted**                                                              | Scorecard gains three anti-Goodhart counters (§4)                                                                                           |
| O-10 | 14 of 24 split justifications use stances outside the closed twelve | SERIOUS         | **Accepted**                                                              | Either the stance list extends (`deliver`, `respond`, `explain`, `record`) or the rows are renamed; the list is now **16 stances, closed**  |
| O-11 | G2 (failing eval) dropped between documents                         | SERIOUS         | **Accepted**                                                              | G2 reinstated in the admission test _and_ named in the ADR                                                                                  |
| O-12 | 302 mapping tables disagree (40.1% vs 34.1%; "≈50" = 16.6%)         | NOTABLE         | **Accepted**                                                              | One definition, one number (§3)                                                                                                             |
| O-13 | `ux-analytics-scientist` is not in the catalogue                    | MINOR           | **Accepted**                                                              | Removed from the stranded list                                                                                                              |
| O-14 | Baseline excludes legal accountability, A13 adds legal owners       | NOTABLE         | **Accepted**                                                              | A13 owns _artefacts_ (review notes, control maps), never accountability; stated in A13's charter template                                   |
| O-15 | Preload size never stated, so costs are unanchored                  | NOTABLE         | **Accepted**                                                              | Preload is stated as a _variable_ in T-B, not a constant                                                                                    |

## 3. The 302 mapping — one number, one definition

The review caught two different denominators in two tables. The definitions are:

| Definition                                                                            | Count                                           | What it means                                                      |
| ------------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------ |
| **Jobless by the needs baseline's boundary rule**                                     | **121 / 302 (40.1%)**                           | Slugs with no job in the 119-job inventory — the figure ADR-6 used |
| **Not coding-functional by the slug-bucket classifier**                               | **103 / 302 (34.1%)** = 59 non-coding + 44 meta | What the brainstorm's §4 table measured                            |
| **Genuinely non-coding** (after removing `*auditor`, `contract`, `agent` mis-buckets) | **≈50 / 302 (16.6%)**                           | What "≈50" was meant to say                                        |

All three are now labelled by definition in the brainstorm. **The number to cite in the decision is 121
(40.1%)**, because it is the only one computed against an explicit rule rather than keyword matching —
and it carries the baseline's own caveat that 18 of the 119 jobs are derived.

## 4. Anti-Goodhart counters added to the migration scorecard

The review's point stands: every metric in the scorecard improves when the catalogue shrinks, whether or
not the product improves. Three additions that cannot be won by shrinkage:

| Counter                                               | What it catches                                           |
| ----------------------------------------------------- | --------------------------------------------------------- |
| **Tasks completed per mode used**                     | A catalogue that shrinks by making work fail              |
| **Switch-away rate per mode** (from the local ledger) | A catalogue that is small because modes are mis-described |
| **Alias resolve rate**                                | Retirements that broke people's saved selections          |

## 5. Tests adopted from the review (T-I…T-M)

| Test                            | Question                                                                                   | Effort                    |
| ------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------- |
| **T-I skills accounting**       | For each owner, compute Σ(description + markup) for its skills against the per-mode budget | S — arithmetic on a draft |
| **T-J alias behaviour diff**    | For every retired slug: what capability does the alias _not_ preserve?                     | M — one line per slug     |
| **T-K plan reconciliation**     | Do the owner sets in every document agree, job by job?                                     | S — a diff script         |
| **T-L non-coding scope review** | Are A13–A17 defensible on liability, quality and positioning?                              | M — review                |
| **T-M pre-registration**        | Every test states its hypothesis, metric and falsifier _before_ running                    | S — file per test         |

**Revised order:** T-K (reconcile documents) → T-I (skills arithmetic) → T-G (stranded triage) →
T-B solver / T-C → T-F / T-H → T-A / T-D / T-E.

## 6. What the red team got wrong (recorded for calibration)

- **The 8.8× skills index:** the index is per-mode, not global (verified in code). The objection's _shape_
  was right, its magnitude was not. Recorded because a review that overstates one number invites
  discounting all of them.
- **"The plan should stop":** stopping is wrong; the direction survives the attack (comprehension gap,
  debugging test, jobs-vs-interventions). The correct instruction was "reconcile, then test", which is what
  we are doing.
- **Nothing else was rejected.** O-05's harm is real but not remediable by design alone — it is remediable
  by measurement (T-J), which is why it is accepted as a risk rather than as a blocker.

## 7. Changes to make (edit list)

| File                                                                        | Change                                                                                                         |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| [`modes-units.md`](../../docs/modes-units.md)                               | Replace the 21-owner claim with a pointer to the 42-owner set; reinstate G2; add the ≤ 6 skills-per-owner rule |
| [`modes-catalogue-brainstorm.md`](../../docs/modes-catalogue-brainstorm.md) | Label the three 302-mapping definitions; drop the phantom slug; add T-I…T-M; add the per-mode skills budget    |
| [`modes-target-state.md`](../../docs/modes-target-state.md)                 | Skills index budget becomes **per mode**: ≤ 1,200 chars including markup, ≤ 6 skills                           |
| [`modes-architecture.md`](../../docs/modes-architecture.md)                 | §7.1 skills row and Phase 2 gain the per-mode skills gate (2.10)                                               |
| [`adr-target-catalogue.md`](../../docs/adr/adr-target-catalogue.md)         | Note the skills constraint in Consequences (thin modes are only affordable if skills merge)                    |
