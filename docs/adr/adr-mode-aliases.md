# ADR: Mode aliases — retiring a slug without breaking a saved selection

**Date**: 2026-11-11

**Status**: ✅ **ACCEPTED** (2026-11-13) — this is ADR-8. It supersedes the "aliases are mandatory" clause in [`adr-target-catalogue.md`](adr-target-catalogue.md) by giving it a mechanism. Accepted with **clause 10 added**, prompted by an external review comment distinguishing name resolution from capability continuity.

**Decision owners**: Repository maintainer

## Context

### The decision that forces this one

[ADR-6](adr-target-catalogue.md) decides that the catalogue is curated per job, that size is an output, and — after the 2026-11-10 scope widening — that **the whole catalogue** is restructured, not only the preload. The needs baseline measured 121 of 302 slugs (40.1%) holding no coding job. Under the demand-by-failure rule each of those receives a disposition: `keep`, `merge` → target, `thin to skill`, `retire`, or `create`.

Merging and retiring **removes slugs that users have already selected**. ADR-6 calls aliases and a deprecation window "mandatory" and orders them in its migration step 4. What has never been decided is _how_.

### What a retired slug can break

A slug is not only a key in the picker. It is written into state that outlives the release that wrote it:

| Surface                          | Stored form                                   | Verified at                                                                 |
| -------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------- |
| The user's selected mode         | `mode: z.string().optional()`                 | [`global-settings.ts:228`](../../packages/types/src/global-settings.ts:228) |
| Every historical task            | `mode: z.string().optional()`                 | [`history.ts:21`](../../packages/types/src/history.ts:21)                   |
| Project files shared through git | `.roomodes` / `custom_modes.yaml`             | catalogue loaders                                                           |
| The curation manifest            | `includeSlugs[]`                              | [`manifest.json:7`](../../custom-modes/manifest.json:7)                     |
| Prompt overrides                 | keyed by slug                                 | prompt-component store                                                      |
| Evaluations and frame fixtures   | slug-named mode blocks                        | [`test-fixtures/frames/`](../../test-fixtures/frames)                       |
| Delegation calls                 | a slug argument to `new_task` / `switch_mode` | tool argument                                                               |

Both persisted surfaces are **optional strings**, so no schema change and no data migration is required. Resolution can happen at read time. That is the single most important fact in this ADR: aliases are a _lookup_, not a _rewrite_.

### A correction to an earlier proposal

[The 2026-11-10 review](../reviews/2026-11-10-programme-state-review.md) suggested [`docs/help/released-slugs.json`](../help/released-slugs.json) as the natural home for a `retired → replacement` table. **That was wrong.** The file is a register of _help-page routes_ (`features/skills`, `providers/anthropic`); it has nothing to do with mode slugs and must not be overloaded. It is recorded here so the mistake is not repeated in the migration.

### Why this cannot be left to the migration batch

A missing alias is invisible at build time and catastrophic at run time: the user's saved selection stops resolving and the extension either falls back to a different mode or refuses to start a task. Both are silent-ish failures in the one area where the announcement promises "nothing you rely on just disappears" (F4 in the press fact table). The mechanism must exist **before** the first disposition ships, not alongside it.

## Decision

**Aliases are a cumulative, additive table shipped with the catalogue, resolved in core at read time, with a hard failure when nothing resolves.**

1. **One map, in the vendored catalogue.** A single `aliases.json` lives beside the vendored catalogue and is shipped inside the VSIX with it. Shape: `{ "retired-slug": "current-slug", ... }`. It is **cumulative and additive-only**: entries are never removed, because a stored selection may be arbitrarily old and there is no census that could prove otherwise.
2. **Direction is old → current, resolved transitively, bounded.** A chain `A → B → C` resolves `A` to `C`. Cycles are a load error, not a warning, and a chain longer than **4** hops is a failure — a long chain means the catalogue is drifting, not consolidating.
3. **Resolution happens at read boundaries, not at write boundaries.** Core resolves the slug when reading the selected mode, when reading a task's recorded mode **for display**, and when importing a `.roomodes`/`custom_modes.yaml`. Nothing rewrites stored state: upgrading must not mutate a user's settings, and downgrading must remain possible.
4. **Task history is display-only.** A historical task's recorded slug is preserved verbatim in the record; the alias is applied only to what the UI shows. A retired mode must never be resurrected into the picker by a history entry.
5. **A retired slug with no alias is a hard error, not a fallback.** If a stored selection names a slug that is neither live nor aliased, the extension surfaces an explicit "this mode is no longer available" state and names the closest available alternative if one exists. **It must not silently substitute the default mode.** Silent substitution is the behaviour this ADR exists to prevent: it changes what the user asked for without telling them.
6. **The user is told once, and told what merged.** The first time a saved selection resolves through an alias, a one-time notice names the replacement and — where several slugs consolidated into one target — **names which modes merged**: `debug (was: bug-hunter, ci-triage)`. A merge that is invisible cannot be audited, and the saved-project test in migration step 6 asserts the notice's content. Afterwards the resolution is silent. Task-history display is always silent (rule 4).
7. **An alias never enters the prompt.** Aliased slugs are excluded from the rendered modes section and from the routing budget. An alias that costs routing characters defeats the purpose of retiring the mode.
8. **The manifest must not name a retired slug.** `includeSlugs` is a build-time list; a retired slug there would re-vendor the very mode being retired. The gate in clause 9 enforces this.
9. **One gate: `verify:mode-aliases`.** Runs in CI and fails on: an alias whose target does not exist; a cycle; a chain longer than 4; a retired slug with no entry; an alias that appears in the rendered modes section; a manifest `includeSlugs` entry that is retired; an alias entry whose key equals its value; or **an alias that resolves to a target with strictly broader grants than the retired mode declared** (clause 10).
10. **An alias resolves a name; it never carries a capability.** Three promises are separated, because conflating them is how "keep working" becomes an overclaim:

    | Promise                                                          | Made?   | What it means                                                                                                         |
    | ---------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------- |
    | **Name resolution** — a saved slug still resolves                | **yes** | the lookup in clause 1 always succeeds or fails loudly (clause 5)                                                     |
    | **Capability continuity** — the same operations remain permitted | **no**  | the _replacement's_ grants apply, and they may be narrower or broader                                                 |
    | **Behavioural continuity** — the same output quality             | **no**  | consolidation exists precisely to change it; carrying the old behaviour forward would be a regression, not a courtesy |

    The dangerous direction is **widening**: a retired read-only mode resolving to a replacement with `edit` or `command` grants silently grants more than the user originally chose. That is a security regression wearing a compatibility promise, so it is forbidden by clause 9's gate unless the user is explicitly told at the moment of resolution. Narrowing is permitted and surfaces through clause 5's "no longer available" path rather than silently degrading.

## Alternatives rejected

| Alternative                                         | Why rejected                                                                                                                                                                                    |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Silent fallback to the default mode**             | Violates the product's stated posture ("no silent surprises") and changes behaviour without notice. A user who selected a security-review mode must not be quietly handed a general coding mode |
| **Rewrite stored settings on upgrade**              | Destructive, one-way, and it cannot touch historical task records or other people's `.roomodes` files. It also breaks downgrade, which the versioning policy explicitly supports                |
| **`supersededBy` inside each mode file**            | The field dies with the file it annotates. A retired mode's file is exactly what gets deleted, so the reference cannot survive the retirement it describes                                      |
| **A `renames` block in a versioned `.roomodes`**    | Same reasoning that rejected the versioned-file route in [ADR-3](adr-mode-capability-enforcement.md): older readers reject the whole file, losing every mode rather than one                    |
| **Keep retired slugs as empty-`groups` tombstones** | They stay in the registry and remain selectable, so the picker still shows a mode that does nothing. A tombstone is a worse experience than an alias and does not shrink anything               |
| **Use `docs/help/released-slugs.json`**             | It is a help-page register, not a mode register. Corrected in Context above                                                                                                                     |

## Consequences

### Positive

- The promise in the announcement has a mechanism behind it: retiring a mode stops breaking saved selections.
- No data migration, no write path, no settings surgery — the change is a lookup plus a gate.
- The additive-only rule makes retroactive breakage impossible: an alias added once works for every future client that ships it.
- The gate makes the invariant checkable in CI rather than trusted to review.

### Negative

- **The map only grows.** Cumulative entries are cheap (~40 bytes each) but the file becomes a permanent record of every rename, and it will outlive the people who made them. Acceptable, but it needs a header comment saying so.
- **Aliases cannot help forward-compatibility.** A user with a newer shared `.roomodes` on an older client meets a slug that client has never heard of. Aliases fix _backwards_ references only, and the interop research already found this to be the real exposure.
- **Unaliased retirement produces a visible failure.** Rule 5 guarantees a bad user experience in the one case where the migration was careless. That is deliberate: a loud error gets fixed, a silent substitution never does.
- **A one-time notice is a UI surface that must be designed, translated and tested** — seven locale directories at minimum.

### Neutral

- Aliases are a catalogue concern; resolution is a core concern. The split is intentional and means the resolver must be tested without the catalogue present.

## Falsifier

Revisit if any of these hold:

1. **Alias entries approach live preload entries in number.** That means consolidation is not consolidating, and the map has become a second catalogue.
2. **The hard-error path fires for recent selections** — a saved mode set within the last release resolving to nothing. That is a migration defect, not an alias defect, and it means dispositions are shipping without their aliases.
3. **Chains keep hitting the 4-hop limit.** That indicates the catalogue is drifting between names rather than converging, and the naming discipline needs an ADR of its own.

## Migration Strategy

1. Add `aliases.json` with an empty table plus its header comment; wire `verify:mode-aliases` in **warn-only** mode (mirroring M2 in [`modes-target-state.md §10`](../modes-target-state.md)).
2. Implement resolution in core at the three read boundaries (clause 3) with tests for: live slug, one hop, three hops, cycle, over-long chain, missing target, unaliased retired slug.
3. Add the one-time notice and the "no longer available" state; translate.
4. Flip the gate to **fail** only after a full violation report has been produced and reviewed.
5. First disposition batch ships **with** its aliases in the same change set. Any batch that retires a slug without an entry, or that resolves to a target with broader grants, fails CI by construction (clause 10).
6. **Run a saved-project compatibility test as part of the first migration batch**, because "keep working" is otherwise an undefined promise. A fixture project carrying saved selections that reference retired slugs is run before and after resolution, asserting: the slug resolves; the deprecation notice fires once and names the replacement; a fixed task list behaves as the _replacement_ declares; applied grants equal the replacement's own and are **never broader** than the retired mode's; and a retired slug with no alias fails loudly rather than falling back. This test is the operational definition of the promise, and it belongs in CI rather than in a review checklist.

## See Also

- [ADR-6: the target catalogue](adr-target-catalogue.md) — the decision this one implements; §Migration step 4.
- [ADR-3: mode capability enforcement](adr-mode-capability-enforcement.md) — the same fail-closed reasoning applied to grants.
- [ADR-7: vendor the catalogue](adr-modes-catalogue-vendored.md) — why the map travels with the catalogue.
- [Programme state review, §5](../reviews/2026-11-10-programme-state-review.md) — the eight candidate surfaces this ADR narrows to three read boundaries plus the manifest.
- [Modes target state, §10](../modes-target-state.md) — M2 warn-then-fail, and M6's alias requirement.
- [Mode files interoperability](../research/modes-interop-2026-11.md) — why aliases cannot fix forward compatibility.
