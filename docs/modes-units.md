# What is the right unit for a mode catalogue?

| Field            | Value                                                                                                                                                                                                                                                 |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**       | Analysis, 2026-11-06. **Not a decision.** Input to a revision of [ADR-6](adr/adr-target-catalogue.md), which currently says "one primary owner per job" and therefore over-counts owners.                                                             |
| **Question**     | Is a _job_ the right unit for the catalogue, or is it a need-granularity that we mistakenly turned into a supply plan?                                                                                                                                |
| **Evidence**     | [Needs baseline](research/modes-needs-baseline-2026-11.md) — 12 axes, 119 jobs. [Architecture](modes-architecture.md) — the three-plane model and the gates. [ADR-3](adr/adr-mode-capability-enforcement.md) — capability is the only enforced plane. |
| **Short answer** | No. Jobs measure **need**; modes are **interventions**. Conflating them produces one mode per job, which the debugging axis alone shows to be waste (11 jobs, 2 modes, 11 skills).                                                                    |

---

## 1. Why this matters

ADR-6 said: _"Every mode declares the job(s) it owns (`ownerOf: [jobId]`). One primary owner per job."_
Read literally, that yields up to 119 owner modes. The baseline softened it to "119 jobs collapse to ~35–47
owners" — but 35–47 is still an inference, not a rule, and the phrase "owner per job" invites exactly the
outcome the question worries about: **eleven debugging modes.**

The debugging case is decidable, so decide it first, then generalise.

## 2. What actually distinguishes one mode from another

A mode is worth existing only if it changes something that survives contact with the runtime:

| #      | Discriminator                                                       | Why it is load-bearing                                                                                                     | Where it lives                                             |
| ------ | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **D1** | **Capability grant** — what it may touch                            | The only _enforced_ plane. A mode that cannot touch different things is a prompt, not a mode                               | `groups`, `fileRegex`, `allowedMcpServers`, capability map |
| **D2** | **Stance** — what "done" means, what it refuses, where it hands off | Changes the _shape_ of the work, not just its steps: diagnose-before-fix, measure-before-change, review-without-writing    | `roleDefinition` (charter) + output contract               |
| **D3** | **Routing discriminability**                                        | If a chooser cannot separate it from its neighbour in ≤200 characters, it will be chosen at random — the coin-flip problem | `whenToUse` + `gate:routing`                               |

A **skill** differs by none of these: it changes _how_ a job is done (steps, checklists, tool recipes),
loaded on demand, and it inherits the mode's grant and stance.

**Corollary:** jobs differ from each other mostly in _procedure_. That is precisely the dimension skills
exist for. So the default is: **jobs → skills; families → modes.**

## 3. Three candidate units, tested

| Unit                  | Count      | What it gets right                                                                      | What it gets wrong                                                                                                                                  | Verdict                                             |
| --------------------- | ---------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| **U1 Job** (119)      | 119 owners | Nothing is left unowned; measurement is direct                                          | One mode per job; near-identical grants and stances; ~119 × 150 chars ≈ **17.9k routing chars** for the skeleton alone (1.5× the entire 12k budget) | ❌ as a supply unit. ✅ as the **measurement** unit |
| **U2 Axis** (12)      | 12 owners  | Small, stable, easy to explain; cheap routing                                           | Too coarse to route (a single "debugging" mode must hold 11 jobs of procedure → doctrine bloat, which the 6k ceiling forbids)                       | ❌ as the only unit                                 |
| **U3 (axis, stance)** | **~20–30** | Each mode is separable by D1/D2/D3; procedures move to skills; routing stays affordable | Requires an explicit stance model (below), and a few axes legitimately host 2–3 stances                                                             | ✅ **recommended**                                  |

### The stance model

A small, closed list of _ways of working_. A mode is a **stance applied to a domain**; the domain is the
axis, the stance is what the charter and contract encode:

| Stance           | "Done" means                                                            | Typical grant shape                 |
| ---------------- | ----------------------------------------------------------------------- | ----------------------------------- |
| **Frame**        | A problem/requirement statement with acceptance criteria                | read-only (+ docs edits)            |
| **Design**       | An option set with trade-offs and a decision record                     | read-only (+ docs edits)            |
| **Construct**    | Behaviour implemented, with tests that fail before and pass after       | read + edit + command               |
| **Diagnose**     | Root cause named with evidence, and a fix or a named escalation         | read + command (+ edit for the fix) |
| **Measure**      | A number before and after, on a named workload                          | read + command, benchmark harness   |
| **Verify**       | Evidence that a claim holds (tests, migrations, non-functional targets) | read + command (+ targeted edit)    |
| **Review**       | Findings by severity, **no writes**                                     | read-only, explicitly               |
| **Evolve**       | Behaviour-preserving change, proven by unchanged tests                  | read + edit + command               |
| **Operate**      | Service restored / pipeline green, timeline recorded                    | read + command (+ restricted edit)  |
| **Secure**       | Threat or control mapped to code locations                              | read (+ restricted edit)            |
| **Document**     | Reader can act without asking                                           | read (+ docs edits)                 |
| **Analyse data** | Query, result, and stated caveats                                       | read (+ read-only DB access)        |

**A mode = one stance over one axis, or over a small set of axes where the stance dominates.** Twelve axes
× one dominant stance each, plus the stances that cross axes (Review, Secure, Operate, Measure), gives
**~20–30 modes** — before declared specialisations.

## 4. The debugging test (11 jobs)

Apply D1/D2/D3 to each of the 11 debugging jobs:

| Job                                           | Grant differs?                                 | Stance differs?                             | Verdict                                                                    |
| --------------------------------------------- | ---------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------- |
| **B1** failing test, no local repro           | no                                             | no — evidence-then-fix                      | **skill** under the debug mode                                             |
| **B2** production crash / stack trace         | no                                             | no                                          | **skill**                                                                  |
| **B3** intermittent failure characterisation  | marginal (stress loops)                        | no                                          | **skill** (may need a command-timeout grant note)                          |
| **B4** works locally, fails in CI/prod        | no                                             | no                                          | **skill**                                                                  |
| **B5** performance regression attribution     | **yes** — needs profiling/benchmark discipline | **yes** — _measure_ stance                  | **separate mode** (`performance`, the Measure stance over several axes)    |
| **B6** leak / resource exhaustion             | yes (same as B5)                               | yes                                         | merged into `performance`                                                  |
| **B7** vague report → reproduction            | no                                             | no                                          | **skill**                                                                  |
| **B8** find the introducing change (bisect)   | no                                             | no                                          | **skill**                                                                  |
| **B9** race / deadlock                        | marginal                                       | marginal — stress/model-checking discipline | **skill** in v1; a candidate split only if evals show a generalist failing |
| **B10** decode an opaque error                | no                                             | no                                          | **skill**                                                                  |
| **B11** attribute failure to owning component | no                                             | no                                          | **skill** (coordination)                                                   |

**Answer to the question asked:** eleven debugging _modes_ would not improve the catalogue. They would add
~11 × 150 ≈ **1,650 routing characters (13.8% of the budget)** while eight of eleven fail D1 and D2. The
catalogue improves with **two** modes (`debug` for correctness, `performance` for the measure stance) and
**eleven skills** — each of which can be loaded exactly when its trigger fires.

The same test applied to the other axes gives the counts in §5.

## 5. Jobs → families → owners → skills (all 12 axes)

Families are the **intermediate** unit: jobs that share a done-artefact _kind_ and a capability profile.
They are not modes; an owner mode may cover one family or several.

| Axis                              | Jobs    | Families (grouping by done-artefact kind)                                                                                                          | Owner modes                                        | Skills                          |
| --------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------- |
| **REQ** Requirements & framing    | 9       | frame/scope · recover-from-system · trade-off & estimate · measurable requirement                                                                  | **1** (`requirements`)                             | 9                               |
| **ARC** Architecture & design     | 10      | boundary & options · quality attribute · conformance · interface contract · design review · spike                                                  | **2** (`architect`, `api-designer`)                | 10                              |
| **IMP** Implementation            | 12      | core construct · integration · failure behaviour · release mechanics · port · i18n · a11y · performance budget · concurrency                       | **2** (`code`, + specialisations)                  | 12                              |
| **UND** Comprehension             | 10      | system map · locate · rationale/history · trace (control & data) · dependents · onboarding                                                         | **1** (`explain`)\*\*                              | 10                              |
| **DBG** Debugging                 | 11      | correctness diagnosis · intermittent/concurrency · performance attribution                                                                         | **2** (`debug`, `performance`)                     | 11                              |
| **TST** Testing & verification    | 11      | new/regression tests · coverage gaps · suite economics & flake · compatibility · migration verification · exploratory · test data · non-functional | **2** (`qa`, `test-automator`)                     | 11                              |
| **REF** Refactoring & evolution   | 9       | simplify/dedupe · dependency upgrade · legacy modernisation · dead code · rename/move · decouple · types · deprecate own API                       | **1** (`refactoring`)                              | 9                               |
| **REV** Review & QA               | 9       | code review · static triage · architecture review · test review · docs drift · release readiness                                                   | **2** (`code-reviewer`, `release-governance`)      | 9                               |
| **SEC** Security & privacy        | 10      | input hardening · dependency/secret response · authn/authz · LLM threat · privacy flow · threat model · vuln response · supply chain · crypto      | **2** (`security-auditor`, `privacy`)              | 10                              |
| **OPS** Delivery & operations     | 11      | pipeline/build · deploy & recover · release · incident · alerting · infra change · env parity · cost                                               | **3** (`devops`, `incident-commander`, `finops`)   | 11                              |
| **DAT** Data & persistence        | 8       | schema change · query performance · repair/backfill · data questions · retention · formats · cache coherence                                       | **2** (`database-administrator`, `data-migration`) | 8                               |
| **DOC** Documentation & knowledge | 9       | change description · API docs · decision record · runnable repo · comments · issue triage · status · history · usage answers                       | **1** (`documentation`)                            | 9                               |
| **Totals**                        | **119** | **~70 families**                                                                                                                                   | **45 owners** (24 + 5 + 16; corrected 2026-11-19)  | **≤ 90 skills** (≤ 6 per owner) |

\*\* **UND has no mode today** — this is the largest single gap in the catalogue: 10 jobs, 0 modes, 0
preloaded, and the best-documented need in the research (182 of 371 hard questions are rationale/intent/
history).

## 6. The admission test for a new mode

A proposed mode must pass **all three**, plus a cost rule:

| Gate                  | Question                                                                             | Fails when                                           |
| --------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| **G1 — D1 or D2**     | Does it need a different grant or a different stance from the nearest existing mode? | "It has different steps" → skill                     |
| **G2 — failing eval** | Is there a task the current owner demonstrably fails?                                | No failing eval → not yet a mode (demand by failure) |
| **G3 — routable**     | Can `whenToUse` separate it from its nearest neighbour in ≤200 chars?                | Not separable → merge (the coin-flip problem)        |
| **Cost**              | Funded from the axis's routing allocation                                            | Adding it pushes Σ`whenToUse` over budget → not now  |

## 7. Non-coding axes — keep, label, and do not preload

The baseline's 12 axes are coding axes; the catalogue also ships 69 non-coding professions that are
currently "jobless" **because no axis describes them.** That is a measurement gap, not a verdict. Two axes
close it:

| #       | Axis                                       | What it holds                                                                                                           | Source stance             |
| ------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| **A13** | **Knowledge work, documents & compliance** | legal review, contracts, IP, compliance mapping, technical writing, research synthesis, translation/localisation review | Document / Review stances |
| **A14** | **Business, product & market decisions**   | product discovery, market and competitor analysis, pricing, financial modelling, sales enablement, growth experiments   | Frame / Analyse stances   |

Rules that keep them from distorting the product:

1. **They get families and owners like everything else** — a non-coding mode must still name the job(s) it
   serves, which is what stops the catalogue drifting back into supply-first accumulation.
2. **They take no preload slot by default.** Roo+ is a coding extension; the preload stays coding-first
   because that is what the product is. The preload share for A13/A14 is **0** until the local ledger
   shows real demand.

    > **Reversed 2026-11-19.** The 45-entry preload **includes** the 16 non-coding entries of the
    > axis × stance frame. The reason is budget rather than a change of view about the product: the 45
    > lines cost 4,208 of the 12,000 `whenToUse` characters, so the slot rule was protecting a budget
    > that is not under pressure. The labelling requirement stands, and the ledger rule above is
    > retired with it ([`modes-architecture.md`](modes-architecture.md:795) §10.8).

3. **They stay in the marketplace, labelled.** Breadth remains a selling point; the label prevents a user
   from expecting coding behaviour.
4. **They are exempt from the coding-specific gates** where those do not apply (`groups` still applies;
   `fileRegex` on `docs/**` is normal here).
5. **Revisit with evidence:** if the ledger shows ≥ 5% of selections landing on A13/A14, that is a preload
   argument — and the first real demand signal the product would have.

## 8. What this changes in ADR-6

| ADR-6 currently says                         | Proposed revision                                                                                                                                                            |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "One primary owner per **job**"              | "One primary owner per **job family**; every job is served by a **skill** under that owner, or by a declared specialisation"                                                 |
| "~35–47 owners"                              | **~21 coding owners + declared specialisations + 2 non-coding axes** (count derived per axis in §5)                                                                          |
| "Preload 60–90 slots if ≤40 specialisations" | Unchanged arithmetic, but the _jobs covered_ denominator becomes clear: 12 coding axes × ~2 owners ≈ 21, so 60–90 slots means **40–70 specialisations or variants** — see §9 |
| Non-coding modes "labelled non-coding"       | **A13/A14 with preload share 0**, revisit on ledger evidence                                                                                                                 |

## 9. The uncomfortable arithmetic, stated plainly

If the skeleton is ~21 coding owners, then a 60–90-slot preload is **39–69 slots of specialisation**
(70–77% of the preload), not the ≤40 ADR-6 assumed. Either:

- **reduce the preload** toward 25–40 (2–3 modes per axis at most), which is my recommendation and matches
  the routing budget; or
- **keep 60–90** and accept that the preload is mostly stack/domain variants — which then needs its own
  rule ("no two variants of the same family in the preload without a documented user segment").

I recommend the first: **preload ≈ 25–40**, and let the marketplace carry the long tail. It respects the
12k budget, keeps routing discriminable, and makes "curated core" a true statement rather than a
description of 90 modes.

## 10. How to test this rather than argue about it

| Test                          | Method                                                                                                                                             | Falsifies                                                                         |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **T-A — discriminator audit** | Apply D1/D2 to all 119 jobs against the proposed ~21 owners; count how many jobs require a _different_ grant or stance                             | More than ~30 → owners are too few; the stance model is under-split               |
| **T-B — routing capacity**    | Compute Σ`whenToUse` for ~21 owners + N specialisations at 150 chars each                                                                          | If 21 + 40 exceeds 12k, the specialisation budget must shrink                     |
| **T-C — coin-flip test**      | For each neighbouring pair of proposed modes, ask whether a competent engineer can pick between them from `whenToUse` alone                        | Any pair that cannot is a merge, not a mode                                       |
| **T-D — eval separation**     | For the top candidates (esp. `debug` vs `performance`, `qa` vs `test-automator`, `code-reviewer` vs `architect-reviewer`), run the Phase 1 harness | If a generalist passes, the split is unjustified (G2 fails)                       |
| **T-E — skill sufficiency**   | Take one family (debugging, 11 skills) and check whether the 11 skills cover the 11 jobs without a mode split                                      | If a job cannot be expressed as a skill, it needs a stance, not a longer contract |

T-A, T-B and T-C can be done now, on paper. T-D waits for the harness. T-E is the cheapest real
experiment: write the 11 debugging skills and see whether they need more than one stance.

## 11. Summary

- **Jobs are the measurement unit.** They stay at 119 and never become the catalogue.
- **Families are the ownership unit** (~70), grouped by done-artefact and grant.
- **Modes are stances over domains** — **45 owners: 24 coding, 5 meta, 16 non-coding** (corrected 2026-11-19; the earlier "42" predates the frame's own arithmetic check, [`axis-stance §5`](modes-catalogue-axis-stance-frame.md:84)), admitted only by G1–G3.
- **Skills carry the job-level procedure**, merged to ≤ 6 per owner (a skill costs ~description + 150 chars of markup and path, so 119 separate skills are unaffordable — red-team O-01), which is exactly the "thin modes, fat skills" thesis
  arriving at its logical conclusion.
- **Eleven debugging modes would be a mistake;** two modes and eleven skills is the same coverage at a
  fraction of the routing cost.
- **Non-coding work keeps a home** (A13/A14), labelled, marketplace-only, revisitable on evidence.
