# ADR: The target catalogue — one owner per job, a curated preload, no privileged built-ins

**Date**: 2026-11-06

**Status**: ✅ ACCEPTED — ⚠️ **partially under revision**: (a) the unit clause (one owner per _job_) is being revised to one owner per _job family_, with skills per job ([`docs/modes-units.md`](../modes-units.md)); (b) **scope widened 2026-11-10** — the whole catalogue is being restructured, not only the preload, so **marketplace size is affected** ([review](../reviews/2026-11-10-programme-state-review.md)).

**Decision owners**: Repository maintainer

## Context

The catalogue has 302 modes, 90 preloaded, and five hardcoded "built-in" modes in the extension core. It
was built supply-first: authors added modes, and the preload accumulated around them. The needs baseline
([`docs/research/modes-needs-baseline-2026-11.md`](../research/modes-needs-baseline-2026-11.md)) measured
the result against an external taxonomy for the first time.

**The needs baseline:** 12 axes of coding work, each with an external source; **119 jobs** (83 clustered,
18 adopted, 18 derived — 15.1%), each with a trigger and a definition of done. Those 119 jobs collapse to
roughly **35–47 job-owner modes**.

**What the current catalogue looks like against it:**

| Finding                    | Measurement                                                                                                           |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Slugs with no coding job   | **121 of 302 (40.1%)** — 69 non-coding professions, 20 non-software artefacts, 32 agent-process modes                 |
| Their share of the preload | 25 of 90 slots, **27.9% of preload routing characters**                                                               |
| Comprehension axis         | 10 jobs — **0 modes, 0 preloaded** — while rationale/intent/history questions are 182 of 371 hard developer questions |
| Debugging axis             | 11 jobs — **2 modes, 0 preloaded** — while 62.7% of SWE-bench questions are location/bug identification               |
| Implementation axis        | 78 slugs against **12 jobs**; 43 of them are stack specialisations                                                    |
| Routing budget             | Σ`whenToUse` = **13,306 chars against a 12,000 budget** — already 10.9% over                                          |

Two structural defects follow from the same cause:

1. **A privileged tier that duplicates itself.** The five built-ins need a `BUILT_IN_SLUGS` guard in the
   sync script, which duplicates knowledge the core already holds (DEBT #14), and the collision guard
   exists only because two sources of truth exist.
2. **An accidental default.** `defaultModeSlug = modes[0].slug` means `architect` is the default because
   of array order, not because anyone chose it.

> **Measurement note.** This ADR uses three distinct quantities: Σ`whenToUse` (13,306 / 57,824 — the
> budgeted one), Σ plus identifiers (17,028 / 70,987), and the rendered section (18,648 / 76,423). An
> earlier discrepancy (C-7 in the needs baseline, 13,307 vs 17,028) was a definition mismatch, not an
> arithmetic error; the architecture document now carries all three measures.

Per the product-first rule, the decision below is made on _what makes the best catalogue_, not on what the
current shape makes easy.

## Decision

**The catalogue is defined by jobs, not by modes; the preload is a portfolio, not a sample; and nothing is
privileged by being built in.**

1. **Jobs are the unit of curation.** Every mode declares the job(s) it owns (`ownerOf: [jobId]`) in
   catalogue-side metadata. **One primary owner per job.** A second mode for the same job is permitted only
   as a **declared specialisation** (a stack or framework variant), labelled as such and counted separately.
2. **Three tiers, and no privileged built-ins.** Core ships a **bootstrap baseline of two modes** (default
   write-capable, read-only fallback) so a zero-file, zero-config start always works. Today's five built-ins
   become **ordinary preload entries** — same slugs, same budgets, same evals. The `BUILT_IN_SLUGS` guard
   shrinks to the two baseline slugs and DEBT #14 closes.
3. **The default mode is a decision, not an index.** The baseline's write-capable mode is the default:
   a first-run user needs to _change something_, not to run a reasoning protocol.
   `core-reasoning-architect` becomes a preload entry and an opt-in default for users who want plan-first
   behaviour. Recorded here so no future refactor re-derives it from `modes[0]`.
4. **The preload is jobs plus declared specialisations.** Target 60–90 slots only if **≤ 40 are
   specialisations**. The preload must cover **≥ 80% of jobs in the deep-need bands** (comprehension,
   debugging, testing, implementation, architecture) _before_ any specialisation slot is allocated.
5. **Catalogue size is an output, not a target — and that applies to the marketplace too.** Target ≈ jobs
   (35–47 owners) + declared specialisations + a small number of deliberate variants, **for the catalogue as
   a whole**. The marketplace may exceed that target by carrying declared specialisations and labelled
   non-coding modes, but it is not exempt from it: an undeclared surplus is a defect wherever it sits.
   "302" is retired as a goal and retained only as a current fact until the migration lands.
6. **Jobless modes are not deleted by fiat, but none of them is exempt from disposition.** Each gets one —
   `keep` (labelled non-coding), `merge`, `thin to skill`, `retire`, `create` — under the demand-by-failure
   admission test, **and each keeps the same contract, budget and grant rules as any other mode**. Non-coding
   professions may stay in the **marketplace**, explicitly labelled, and take **no preload slot**. The
   marketplace is a lower bar for _admission_, not a lower bar for _quality_.
7. **The routing budget ratchets.** No new preload entry until Σ`whenToUse` is back under 12,000 chars; the
   current 10.9% overage is paid down first (Phase 3), not amortised by adding modes.
8. **The 12 axes become the catalogue spine.** Stored as `categories` in [`manifest.json`](../../custom-modes/manifest.json),
   with per-mode `ownerOf` job ids. This is what makes **S** (jobs with an owner), **A** (preload slots and
   routing chars) and eventually **C** (eval coverage) measurable per axis — and it is the input the
   coverage map renders.

## Alternatives rejected

| Alternative                                  | Why rejected                                                                                                                                                                                                                                                       |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Keep 302 as the target**                   | Supply-driven: 40.1% of slugs serve no coding job yet consume 27.9% of preload routing cost, while comprehension — the best-documented need — has zero coverage                                                                                                    |
| **Delete the non-coding modes outright**     | They are legitimate marketplace breadth and a differentiator, and we cannot measure who uses them. The problem is that they consume preload allocation while sitting outside the job model — so the fix is disposition, labelling and contract rules, not deletion |
| **Preload = top-N by popularity**            | No per-mode demand metric exists on any surveyed surface, and where counters exist they are inflatable. Popularity would be invented                                                                                                                               |
| **One mode per job with no specialisations** | 43 of 78 implementation slugs are stack specialisations; that demand is real. The failure was calling them job owners, not having them                                                                                                                             |
| **Keep the built-in tier**                   | It duplicates slug knowledge into a guard list, creates a privileged budget exemption, and hides the default decision inside array order                                                                                                                           |

## Consequences

### Positive

- The catalogue acquires a **rationale that survives review**: every mode either owns a job, declares a
  specialisation, or is explicitly labelled non-coding.
- The preload becomes a **portfolio with a stated allocation**, so "why is this preloaded?" has an answer
  other than "someone added it".
- The **default mode stops being an accident**, and the duplicated built-in guard list disappears.
- The 12-axis spine makes coverage measurable from metadata alone, before any eval exists.

### Negative

- **Thin modes are only affordable if skills merge.** A skill costs ~description + 150 chars of markup and path, and the per-mode skills index is capped at 1,200 chars; the catalogue therefore targets **≤ 6 skills per owner**, not one skill per job (red-team O-01).

- **User-visible retirement, at catalogue scale.** With the widened scope, merging and retiring removes slugs
  users have selected **and** shrinks what is discoverable on the marketplace. Aliases, a deprecation window
  and a resolution-surface list are mandatory, and each disposition needs a decision, not a script
  ([review §5](../reviews/2026-11-10-programme-state-review.md)).
- **121 jobless modes need individual judgement** — the largest single piece of work in the whole
  programme (L effort), and the one most likely to be argued about.
- **The specialisation cap constrains marketing.** "300+" is a time-bound fact, not a capability claim, and it
  expires with the migration. Breadth becomes a consequence of declared specialisations and labelled
  non-coding modes — breadth of variants, not breadth of promises.
- Small teams will feel the preload discipline as friction: no new preload entry while the budget is over.

### Neutral

- Marketplace size is a **consequence of per-slug dispositions**, not a fixed quantity. The catalogue shrinks
  where a slug owns no job, grows where the job inventory exposes a gap, and retains declared specialisations
  and labelled non-coding modes. The preload keeps a hard budget; the marketplace gets a target instead of a
  licence.
- Non-coding modes keep a home but lose their claim on first-run context.

## Falsifier

Revisit if **eval coverage contradicts ownership**: a mode with no `ownerOf` job repeatedly wins tasks that
no owner mode handles (the job set is incomplete), or a preload restricted to ≤ 40 specialisations plus
≥ 80% deep-band job coverage **measurably underperforms** today's 90-mode preload on the routing and
behavioural evals. Either result means the job model is the wrong abstraction for part of the catalogue,
and the specialisation rule must loosen.

Third condition, specific to the widened scope: if users keep installing marketplace modes that a disposition
proposed to retire, at a rate that makes the alias table the de facto product, then the disposition was wrong
and the marketplace — not the preload — is where the job model fails.

## Migration Strategy

1. Publish the 12 axes and 119 jobs as manifest metadata (`categories`, `jobs`, `ownerOf`); every existing
   slug gets `ownerOf` or an explicit `nonCoding: true`.
2. Pay down the routing budget: Σ`whenToUse` from 13,306 → ≤ 12,000 (Phase 3, before any new entry).
3. Batch the dispositions **by axis**, not by alphabetical order, so each batch is reviewable and
   independently shippable: comprehension and debugging first (thin supply, strong need), then the
   jobless clusters.
4. Ship aliases for every retired slug — in the **preload and the marketplace** — keep the deprecated name
   resolving for at least one minor, and gate it: every retired slug has an alias, every alias target exists,
   no chain exceeds its limit, and no alias re-enters the rendered modes section.
5. Move today's five built-ins into the preload; shrink core to the two-mode baseline; choose and document
   the default.
6. Re-derive the preload from the job inventory and freeze it for a release cycle.
7. Regenerate the coverage map from the metadata; publish it with `C` and `N` honestly blank.

## See Also

- [Needs baseline (2026-11)](../research/modes-needs-baseline-2026-11.md) — 12 axes, 119 jobs, S/A/C/N instrument.
- [Modes Target State](../modes-target-state.md) §5 (tiers, target catalogue spec), §5.5 (J1–J4).
- [Modes Architecture](../modes-architecture.md) §10 (tiers, demand by failure), §12 Phase 3.
- [Mode capability policy ADR](adr-mode-capability-enforcement.md) — what a mode's grants may claim.
- [`custom-modes/manifest.json`](../../custom-modes/manifest.json) — where the metadata lands.
