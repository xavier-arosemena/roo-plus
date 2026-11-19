# Programme state review — modes catalogue and modes architecture (2026-11-10)

| Field                   | Value                                                                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What this file is**   | A consolidation after a context condensation, plus the correction queue produced by two maintainer corrections received on 2026-11-10.                                                                                       |
| **Why it exists**       | The programme has produced ~20 documents across four research passes, two red teams and one bake-off. Recall is not evidence. This file states what is decided, what is provisional, what is pending, and what is now wrong. |
| **How to use it**       | §2 is the ledger — read it before writing anything new. §4 is the only section that authorises edits. §6 specifies the next instrument.                                                                                      |
| **Verification status** | §3 contradictions are **verified by reading** the cited lines. §4 is _not_ claimed exhaustive: three documents were not re-read (see §4.3).                                                                                  |
| **Status**              | Current as of 2026-11-10. Superseded only by a later review, not by edits to individual documents.                                                                                                                           |

---

## 1. The programme in six lines

1. The catalogue grew supply-first to **302 modes / 90 preloaded**, organised by who added what.
2. Measurement showed the cost: **40.1% of slugs hold no coding job** yet take 25 preload slots and 27.9% of preload routing characters; comprehension has 10 jobs and 0 modes; the preload routing budget is **10.9% over**.
3. The response is a **restructure toward jobs**, with a preload chosen as a portfolio, and modes as **contracts** (job, budget, boundary) rather than personas.
4. Reliability comes first, then routing cost, then catalogue governance, then capability safety.
5. Nothing in the design is accepted on assertion: two adversarial passes (**STOP/HARDEN**, then **HARDEN**) each forced a narrower claim, and one claim (T-K frame coverage) was **reversed by measurement**.
6. The frame question (**axis×stance** vs **artefact**) is **not decided** and is being tested, not argued.

## 2. Decision ledger

### 2.1 Decided

| #   | Decision                                                                                                                                                                                      | Where                                                                                            |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| D1  | Three planes — routing (`whenToUse`), doctrine (`roleDefinition`/`customInstructions`/rules), capability (`groups`/`fileRegex`/`allowedMcpServers`); only capability is mechanically enforced | [`modes-architecture.md §1`](../modes-architecture.md)                                           |
| D2  | Fail-closed capability policy: `legacyGrant ⊆ policy`; edit refinements ride in group options bounded by `fileRegex`; command/MCP via loader or empty-`groups`                                | [`adr-mode-capability-enforcement.md`](../adr/adr-mode-capability-enforcement.md)                |
| D3  | Catalogue is **vendored** (git subtree), submodule pinning retired, gates split, `verify:catalogue-integrity` added                                                                           | [`adr-modes-catalogue-vendored.md`](../adr/adr-modes-catalogue-vendored.md)                      |
| D4  | Jobs are the unit of curation; **one primary owner per job**; a second mode only as a declared specialisation                                                                                 | [`adr-target-catalogue.md`](../adr/adr-target-catalogue.md) — _partially under revision_, see P1 |
| D5  | Built-ins absorbed into the preload; core keeps a **two-mode bootstrap baseline**; the default mode is a decision, not `modes[0]`                                                             | ADR-6 §Decision 2–3                                                                              |
| D6  | Catalogue size is an **output**; `302` retained only as a current fact until migration                                                                                                        | ADR-6 §Decision 5                                                                                |
| D7  | **Aliases and a deprecation window are mandatory** for every retired slug                                                                                                                     | ADR-6 §Consequences, §Migration 4                                                                |
| D8  | Preload covers **≥80% of deep-band jobs before** any specialisation slot; **≤40 specialisations**                                                                                             | ADR-6 §Decision 4                                                                                |
| D9  | Non-coding modes may stay in the marketplace, labelled, with **no preload slot**                                                                                                              | ADR-6 §Decision 6                                                                                |
| D10 | **Routing budget ratchet**: no new preload entry while Σ`whenToUse` > 12,000                                                                                                                  | ADR-6 §Decision 7                                                                                |
| D11 | Skills are **per-mode**, index ≤ **1,200 chars** including markup, **≤6 skills per owner**                                                                                                    | Accepted from red team O-01                                                                      |
| D12 | Measurement is **local and on demand**; no telemetry is added                                                                                                                                 | [`modes-target-state.md §9.3`](../modes-target-state.md)                                         |

### 2.2 Provisional

| #   | Provisional                                                                            | Blocks                                         |
| --- | -------------------------------------------------------------------------------------- | ---------------------------------------------- |
| P1  | Unit = **one owner per job family**, skills per job (revises D4's "one owner per job") | The 45-owner catalogue, the preload derivation |
| P2  | Frame = artefact vs axis×stance vs **two views of one catalogue (H3)**                 | The catalogue's shape, the onboarding message  |
| P3  | Mode retrieval (`search_modes` / stage-1 index, option B)                              | Routing phase 2                                |
| P4  | Onboarding entry point "start with the planning mode"                                  | Depends on P2 and on F9                        |
| P5  | Published coverage view (format undecided)                                             | Nothing yet                                    |

### 2.3 Pending

- The **frame decision** — pre-registered, instrument built, **no data** ([`pre-registration`](2026-11-09-frame-decision-preregistration.md)).
- The **outcome-arm pilot**: six runs, harness built, **`UNRUN`**, credential-blocked.
- A **second blind scorer** for the blinded cases.
- The **first-run observation** — now **redesigned** (§6), because there are no external developers.

### 2.4 Rejected (do not re-propose without new evidence)

Keep 302 as the target · delete non-coding modes outright · preload = top-N by popularity · keep the built-in tier ·
Route B (versioned-file capability policy) · submodule pinning · treating mode count as a coverage measure.

## 3. What the 2026-11-10 corrections invalidate

Two maintainer corrections: **(a) the whole catalogue changes, not only the curated pre-installed set**; **(b) aliases must be in the plans**.

### 3.1 Verified contradictions

| #   | File                                                                                                                                                           | Current text                                                                                               | Why it is now false                                                                                                                                                                                   |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| X1  | [`press — proof point`](../press/2026-11-modes-announcement-seeds.md) (line 76) vs [`suggested shape`](../press/2026-11-modes-announcement-seeds.md) (line 86) | "reducing both the _default_ set, and the whole _available_ set" vs "reassurance (aliases, breadth stays)" | Two sentences in one file that cannot both be true. The shape line would have a writer promise the opposite of the scope.                                                                             |
| X2  | [press line 119](../press/2026-11-modes-announcement-seeds.md)                                                                                                 | Coverage line maps 4 bullets; the list has **5** (Efficiency added at line 117)                            | The file violates its own rule: "a bullet with no row here must be cut".                                                                                                                              |
| X3  | [press line 61](../press/2026-11-modes-announcement-seeds.md)                                                                                                  | "A smaller, curated **default**… The modes **installed for you** will be fewer"                            | Understates a whole-catalogue restructure as a preload-only change.                                                                                                                                   |
| X4  | [`adr-target-catalogue.md`](../adr/adr-target-catalogue.md) line 114                                                                                           | "**Marketplace size is unaffected**; the change is in what ships preloaded"                                | If 121 jobless slugs receive `merge` / `retire` / `thin to skill` dispositions, marketplace size cannot be unaffected. A whole-catalogue restructure makes this section wrong, not merely incomplete. |

Secondary, not a contradiction but a gap: [`ADR-6 line 66`](../adr/adr-target-catalogue.md) — "the marketplace may exceed that; **the preload may not**" — reads as licence for unrestructured marketplace entries. Under correction (a), marketplace breadth is not an exemption from contract, budget or grant rules.

### 3.2 Aliases are already decided — the mechanism is not

D7 exists. What does not exist: a mapping location, a resolution order, a surface list, or a gate. See §5.

## 4. Correction queue

### 4.1 Verified — apply on approval

| #    | File                   | Change                                                                                                                                                               | Blocking?                                  |
| ---- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| CQ-1 | press line 86          | "reassurance (aliases, breadth stays)" → "reassurance (aliases; no loss of capability)"                                                                              | Yes — publishable text                     |
| CQ-2 | press line 119         | Add **F12** (efficiency is a design constraint, `IN PROGRESS`) and map bullet 5 → F12                                                                                | Yes — traceability rule                    |
| CQ-3 | press line 61          | "curated default" → "curated catalogue", and drop "installed for you" as the only unit of change                                                                     | Yes                                        |
| CQ-4 | press F1               | Attach a **validity window**: true until the migration ships; after that the row is retracted, not reworded                                                          | Yes — announcements are public commitments |
| CQ-5 | press F2               | "the pre-installed set is being rethought" → "the catalogue is being restructured, starting with the pre-installed set"                                              | Yes                                        |
| CQ-6 | ADR-6 line 114         | Replace the Neutral bullet with "Marketplace size is a consequence of per-slug dispositions, not a fixed quantity"                                                   | Yes — ADR correctness                      |
| CQ-7 | ADR-6 §Decision 6      | State explicitly that marketplace entries are also in scope for contract, budget and grant rules                                                                     | Yes                                        |
| CQ-8 | press lines 8, 76, 117 | Four token-level defects in inserted prose: "user's"→"users", "failiar"→"familiar", "loose"→"lose", "we do are working"→"we are working", "conciously"→"consciously" | No — grammar only; proposed, not applied   |

### 4.2 Not yet verified — must be read before editing

| #     | Document                                                                    | The question                                                                                                                   |
| ----- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| CQ-9  | [`modes-target-state.md`](../modes-target-state.md) §5 tiers, §10 migration | Does the tier model or the M0–M6 stages assume breadth is preserved? Do the stages carry alias work at the right point?        |
| CQ-10 | [`modes-architecture.md`](../modes-architecture.md) §10.1–10.4              | Does the "three tiers" recommendation assume the marketplace keeps today's breadth?                                            |
| CQ-11 | [`ROADMAP.md`](../../ROADMAP.md)                                            | The public roadmap says "a curated core, not a pile" — does it imply breadth is untouched, and does it mention aliases at all? |

### 4.3 Why this queue is not claimed exhaustive

Three documents were not re-read (CQ-9…CQ-11). Naming a document as wrong from recall is the exact error already made once in this programme, when the T-K coverage claim was asserted from memory and then reversed by the script. The queue is therefore authoritative only for §3.1's verified rows.

## 5. Aliases — from principle to mechanism

D7 mandates aliases. The following is what "included in our plans" must actually mean.

**Resolution surfaces** (each must be enumerated before the migration starts):

1. Saved selection — the persisted mode setting.
2. Task history entries, which store the slug they ran under.
3. Project files (`.roomodes`, `custom_modes.yaml`) that still name an old slug.
4. `manifest.json` `includeSlugs`, which drives what is vendored/preloaded.
5. ~~[`docs/help/released-slugs.json`](../help/released-slugs.json)~~ — **withdrawn 2026-11-11**: verified to be a register of _help-page routes_
   (`features/skills`, `providers/anthropic`), not mode slugs. The alias table lives in the vendored
   catalogue instead — see [`ADR-8`](../adr/adr-mode-aliases.md).
6. Eval and frame fixtures that reference slugs by name.
7. Documentation links and the help pages.
8. Any delegation call that passes a mode slug to a sub-task.

**Design questions that are decisions, not implementation details:**

- **Where the map lives.** A single `aliases` table in the catalogue manifest, or a per-slug `supersededBy` field. The manifest is already the vendored artefact (D3), so the table travels with it.
- **Direction of resolution.** Old→new only (simple, lossy for chains) or transitive with cycle detection. Consolidation creates chains: A→B and B→C must resolve A→C.
- **What the user sees.** Silent resolution (saved selection keeps working, invisible) or a one-time notice naming the new mode. D7's deprecation window implies a notice; silence would be indistinguishable from a bug.
- **Lifetime.** ADR-6 says "at least one minor". A retirement with no expiry becomes permanent debt; a retirement with too short an expiry breaks users who upgrade late.
- **What must fail loudly.** A slug that is retired with _no_ alias must be a hard error at load, not a silent fallback to the default mode — otherwise a user's saved selection degrades into a different mode without notice.
- **Aliased slugs and the routing budget.** An alias must not re-enter the prompt's mode list; otherwise retirement saves nothing.

**Gate.** A CI check that every retired slug in the manifest has an alias, every alias target exists, no alias chain exceeds its length limit, and no alias appears in the rendered modes section. This is the only way D7 stays true after the first migration batch.

## 6. The first-run observation, redesigned for agents

There are no external developers; everything is run with agents. That changes what the instrument is allowed to claim.

### 6.1 What an agent panel can and cannot establish

| Establishes                                                                                        | Does not establish                                                                                              |
| -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Instrument sensitivity** — do the briefs separate goal-framing from deliverable-framing at all?  | Human abandonment: closing the picker in frustration                                                            |
| **Catalogue discriminability** — from picker text alone, does a reader land on the intended owner? | Real developers' first-run behaviour or adoption                                                                |
| **Help-seeking** — does a reader ask which mode to use when offered?                               | A population estimate: five personas on one model family are five conditions, not five independent observations |

The honest framing: this is an **agent framing pretest**, not a first-run observation. Reusing the name would invite the result to be quoted for something it cannot support.

### 6.2 Design

- **Five declared personas**, chosen as _framing conditions_, not demographics: (1) goal-only explorer, (2) artefact-only deliverer, (3) terse one-liner, (4) verbose context dump, (5) imprecise vocabulary / non-native phrasing.
- **Each persona × 3 repetitions × 2 catalogues = 30 runs.** Blinded: slug, name and `whenToUse` only — no doctrine, no grants.
- **Measures**: framing stated (goal / deliverable / ambiguous); selection equals intended owner; entries consulted before choosing (search-cost proxy); explicit request for help choosing.
- **Sensitivity gate, first**: if personas 1 and 2 do not diverge on framing, the instrument is dead and no catalogue comparison is meaningful. This gate is the reason to run the pretest at all.
- **Discriminability, second**: per-catalogue hit rate on the intended owner, compared against the bake-off's word-overlap result rather than against a fresh baseline.

### 6.3 Pre-registration amendments required

The pre-registration's H1–H3, decision rule and §9 protocol assume a human sample. Amendments needed before any run: replace §9 (participants) with §6.2 above; add persona as a variable; downgrade H1's evidential status from population inference to instrument sensitivity; add **Amendment 5** recording that no human sample is available and that any result is a pretest. The decision rule itself — including the third row for doctrine failure — survives unchanged, because it compares catalogues, not populations.

## 7. Open decisions blocking migration

| #   | Decision                                                       | Owner                   | Blocks                                          |
| --- | -------------------------------------------------------------- | ----------------------- | ----------------------------------------------- |
| O1  | Frame: artefact vs stance vs two views (P2)                    | Maintainer, on evidence | Catalogue shape, onboarding, announcement F9    |
| O2  | Unit: job vs job family (P1)                                   | Maintainer              | Owner count, preload derivation, ADR-6 revision |
| O3  | Alias map location and resolution semantics (§5)               | Maintainer              | First migration batch                           |
| O4  | Whether the whole-catalogue scope changes the frame comparison | Maintainer, on §3       | The observation's two catalogues                |
| O5  | Default mode for first run (D5 names the rule, not the slug)   | Maintainer              | Onboarding copy                                 |

## 8. Sequence, one at a time

1. **This review** — approve or amend the correction queue. _(current)_
2. Apply §4.1 corrections CQ-1…CQ-7; then read and correct CQ-9…CQ-11.
3. Build the alias mechanism specification (§5) as an ADR.
4. Build the agent framing pretest (§6), amend the pre-registration (§6.3).
5. Run the pretest; record sensitivity gate before any discriminability claim.
6. Credentials → six B1 runs → second blind scorer → pre-registered reading.

Gates: step 2 cannot start the migration; step 4 cannot run before step 2, because the observation's catalogues inherit whatever the scope correction changes in the seeds.

## 9. What would falsify this plan

- **The job model fails its own falsifier**: eval coverage contradicts ownership, or a ≥80%-deep-band preload underperforms today's 90-mode preload.
- **The frame question turns out to be empty**: the pretest shows personas do not diverge on framing, so neither catalogue can be tested by this instrument.
- **Aliases cannot be made honest**: if resolution chains outlive their deprecation window in practice, the "nothing you rely on disappears" promise becomes unkeepable and the scope must shrink.
- **Whole-catalogue scope proves unaffordable**: if dispositions for 121 jobless slugs cannot be decided per-slug, the restructure stalls and the announcement is premature.

## 10. Resolution log — what was applied

Applied 2026-11-10 in the same session as this review. Line references in §3.1 and §4.1 point at the
_pre-correction_ files and are now stale by design; this table is the authority.

| #     | Status     | Where it landed                                                                                                                         |
| ----- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| CQ-1  | ✅ applied | press "suggested shape" — "breadth stays" removed by the maintainer, wording confirmed                                                  |
| CQ-2  | ✅ applied | press §0 — **F12** added; Seed B coverage now maps bullet 5 → F12                                                                       |
| CQ-3  | ✅ applied | press Seed A bullet 1 — "A smaller, curated catalogue", maintainer's "smaller overall catalogue" folded in                              |
| CQ-4  | ✅ applied | press F1 — `SHIPPED (time-bound)` with an explicit retraction rule                                                                      |
| CQ-5  | ✅ applied | press F2 — "catalogue as a whole", preload changes first                                                                                |
| CQ-6  | ✅ applied | ADR-6 §Neutral — marketplace size is a consequence of per-slug dispositions                                                             |
| CQ-7  | ✅ applied | ADR-6 §Decision 6 — marketplace is a lower bar for _admission_, not for _quality_                                                       |
| CQ-8  | ✅ applied | press grammar: "users", "familiar", "losing", "we are aiming", "consciously"                                                            |
| CQ-9  | ✅ applied | target-state §5.1 marketplace row; §10 M6 covers the whole catalogue and requires aliases; §10 gains a "marketplace is not exempt" note |
| CQ-10 | ✅ applied | architecture §10.1 — "The catalogue may be large" replaced; marketplace row is target-bearing                                           |
| CQ-11 | ✅ applied | ROADMAP — tagline, section lead, curated-core bullets (now three), "Get involved"                                                       |

### 10.1 Also changed, beyond the queue

| File                | Change                                                                                                                |
| ------------------- | --------------------------------------------------------------------------------------------------------------------- |
| ADR-6 §Status       | records the 2026-11-10 scope widening explicitly                                                                      |
| ADR-6 §Decision 5   | marketplace may exceed the target only via declared specialisations and labelled non-coding modes                     |
| ADR-6 §Alternatives | the "delete non-coding modes" rationale no longer implies marketplace breadth escapes review                          |
| ADR-6 §Consequences | retirement bullet is now "at catalogue scale" and points at §5 here                                                   |
| ADR-6 §Falsifier    | third condition: users reinstalling modes a disposition proposed to retire falsifies the job model in the marketplace |
| ADR-6 §Migration 4  | aliases required in preload **and** marketplace, with a four-part gate                                                |
| ADR-6 §Negative     | "300+" treated as time-bound, not a capability claim                                                                  |

### 10.2 Deliberately not changed

- **`CHANGELOG.md` and `src/CHANGELOG.md`** still say "300+ modes". They are release-history records of what
  shipped, not forward-looking claims, and [`AGENTS.md`](../../AGENTS.md) forbids per-PR changelog edits.
- **`custom-modes/AGENT_CATALOG.md`** is generated; it follows the catalogue rather than leading it.

## 11. Document history

| Date       | Change                                                                                                         |
| ---------- | -------------------------------------------------------------------------------------------------------------- |
| 2026-11-10 | Created. Consolidation after condensation; correction queue; agent-only redesign of the first-run observation. |
| 2026-11-10 | §10 resolution log added; CQ-1…CQ-11 applied across press, ADR-6, target-state, architecture and ROADMAP.      |
