# Modes Target State — proposal

| Field                   | Value                                                                                                                                                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**              | **PROPOSAL** (2026-11-04). Not accepted, not implemented. Seven ADRs must decide the parts marked ⚖️ before any of this is coded.                                                                                 |
| **Supersedes**          | Nothing — it describes where [`docs/modes-architecture.md`](modes-architecture.md) v2.1 is _going_. Where they differ, the architecture document describes today and this document describes the target.          |
| **Why it exists**       | The architecture document is a framework; this is the **specification of the end state** and the path from 302 doctrine-heavy contracts to it. Without a written target, every refactor becomes a local argument. |
| **Grounded in**         | [`docs/modes-doctrine.md`](modes-doctrine.md) (findings + falsifiers) and [`docs/research/modes-research-2026-11.md`](research/modes-research-2026-11.md) (evidence + grades).                                    |
| **Ordering constraint** | **Target state → Workstream P (repository topology) → schema & gates → catalogue refactor.** Each step's output is the next step's input. Moving files after the refactor doubles the churn.                      |
| **What this is not**    | Not a design by committee: every non-obvious choice names the finding that forces it, and the ones that are genuinely open are marked ⚖️ with the ADR that settles them.                                          |

---

## 0. Executive summary

Five shifts, one sentence each:

1. **A mode becomes a contract, not a document.** Routing line + charter + capability + handoff. Procedure lives in skills that load only when relevant.
2. **Capability becomes a map, not a label.** `groups` survives as sugar; the real grant is path/command → `allow | ask | deny`, default-deny, with `all` written explicitly.
3. **Routing becomes retrieval, not enumeration.** A short always-on index plus a model-invocable `search_modes` for orchestrators; a budget that warns in the product and fails in CI.
4. **The catalogue becomes a portfolio, not a pile.** Tiers (built-in / preload / marketplace), one owner per job, counts computed, coverage measured in four separate quantities.
5. **Quality becomes measurable, not asserted.** Routing evals, behavioural evals, output-contract assertions, a delegation score that ratchets, and a ledger that measures misfires locally without telemetry.

**What does not change:** the three-plane model, the enforcement asymmetry (capability is the only plane a model cannot argue with), the canonical `custom_modes.d/` source, the sync pipeline, and the approval ladder.

**What this proposal explicitly does not do:** rename the product's concept of a "mode", or remove any
user-authored mode. The migration is additive and reversible at every step.

**Superseding the hardcoded built-in five ⚖️ (ADR-6).** `architect` · `code` · `ask` · `debug` ·
`orchestrator` stop being a privileged tier and become ordinary entries in the curated preload —
subject to the same budgets, ownership, review dates and evals as everything else. The **slugs**
survive (users have them selected, and conversation history and settings reference them); the
**provenance** does not. One piece cannot move: core must start with **zero configuration and zero
files**, so a minimal **bootstrap safety baseline** stays in core — a default mode plus a read-only
mode. Everything else, including today's five, is supplied by the seeded preload. That keeps
`defaultModeSlug` total, keeps first run working offline in an empty workspace, and lets the duplicated
`BUILT_IN_SLUGS` guard list (DEBT #14) shrink to the baseline instead of being preserved forever.

**What the baseline is — and is not.** The distinction is _where it lives_, not how many modes it holds:

|                                      | Bootstrap baseline                                                                                        | Preload                                                              |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Lives in                             | **Code**, compiled into the extension (`DEFAULT_MODES` in [`mode.ts`](../packages/types/src/mode.ts:189)) | **Data**, a seeded file (`.roomodes` / `pre-installed-modes.yml`)    |
| Can be absent at runtime?            | No — it is in the binary                                                                                  | Yes: user edits, a rejected file, a failed sync, fresh globalStorage |
| Budgeted, owned, dated, eval-backed? | No — minimal by mandate                                                                                   | Yes — that is the point of the tier                                  |
| Who can change it                    | Only a release                                                                                            | Anyone with write access to the workspace or settings                |

**Why not simply make the preload the baseline?** Because the preload is data, and data fails. Three
scenarios where the extension must still run on the very next message:

1. **First run, empty workspace** — no `.roomodes`, fresh global storage; the first message can arrive
   while the seeded asset is still being written.
2. **The `.roomodes` fails structurally** — a missing required field, a duplicate slug, or an unknown
   group name makes the **whole array fail**, so every mode in that file disappears at once. (Unknown
   _keys_ behave differently: they are stripped silently — see §3.2.)
3. **The user removed everything** — deleted the file, switched workspace, or a sync error left global
   settings empty.

In all three, `defaultModeSlug` must resolve to something real, and the user must be able to ask a
question _and_ make a change. That is the baseline's only job: **be the floor, not the catalogue.**

**What goes in it — two modes, not five:**

| Slot        | What it must be                                                            | Candidate              |
| ----------- | -------------------------------------------------------------------------- | ---------------------- |
| **Default** | write-capable generalist; works with no configuration, no skills, no rules | `code` (keep the slug) |
| **Safe**    | read-only; the fallback when a task must not mutate anything               | `ask` (keep the slug)  |

**On `core-reasoning-architect` as the default ⚖️.** Defensible, and it matches this product's
plan-first philosophy — but it is the wrong default for a _first_ user: it emits a heavy reasoning
scaffold (hypotheses, reflections, proof blocks) that is exactly what a beginner does not need on "fix
this typo". It is an excellent **preload** entry, and a plausible default for experienced users who opt
in. Either way the default must be an explicit decision in ADR-6, not an accident of array order — which
is how `architect` became the default today (`defaultModeSlug = modes[0].slug` in
[`modes.ts`](../src/shared/modes.ts:48)).

---

## 1. Design principles (inherited, not restated)

From [`modes-architecture.md`](modes-architecture.md) §3 and [`modes-doctrine.md`](modes-doctrine.md) Part IV, in the order that matters when two conflict:

1. Discriminability before depth.
2. Routing is a retrieval problem (filter the candidate set; do not enrich the descriptions).
3. Doctrine is a constraint budget (≤ 12 hard constraints; ≤ 3 per section).
4. Bookend the doctrine (non-negotiables first, pre-completion checklist last).
5. Positive directive plus named destination.
6. Thin modes, fat skills.
7. Least privilege only counts when it excludes something.
8. Temporal validity is a quality attribute.
9. Enforce by structure, not discipline.

---

## 2. The target architecture at a glance

```
                         ┌──────────────────────────────────────────┐
                         │  CORE PROMPT (unchanged)                 │
                         └──────────────────────────────────────────┘
                                            │
   ┌────────────────────────────────────────┼─────────────────────────────────────────┐
   │ ALWAYS ON (costed every request)       │ ON DEMAND (costed when used)             │
   │                                        │                                          │
   │  routing index  ◄── stage 1 ───────────┼──►  charter (roleDefinition)             │
   │   slug · name · ≤60-char gist · tags   │      doctrine (customInstructions)       │
   │                                        │      rules-<slug>/                       │
   │  skills index (name + description)     │      skill bodies                        │
   │                                        │                                          │
   │  ENFORCED PLANE ───────────────────────┼──►  capability map  (per call)           │
   └────────────────────────────────────────┴─────────────────────────────────────────┘
                                            │
                         ┌──────────────────┴───────────────────┐
                         │  MEASUREMENT LOOP                    │
                         │  routing evals · behaviour evals     │
                         │  output-contract checks · KPI score  │
                         │  local ledger (opt-in, no network)   │
                         └──────────────────────────────────────┘
```

Tiers:

```
bootstrap baseline (1–3, in core)  →  preload (45, budgeted, owned, dated)  →  marketplace (dynamic)
                                        │
                                   skills spine (~10)
                                        │
                                   rules (few, small)
```

---

## 3. Schema v2

### 3.1 Field-by-field

| Field                                      | Today                                                             | Target                                                                                                                      | Why                                                                                 |
| ------------------------------------------ | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------- | ---------------------------------------------------------------- |
| `slug`                                     | `^[a-zA-Z0-9-]+$` in core, `^[a-z0-9-]+$` in the published schema | **lowercase only, ≤ 40**, no double dashes, reserved built-ins                                                              | Two schemas disagree today; the published one is right                              |
| `name`                                     | free text                                                         | ≤ 40 chars + one emoji                                                                                                      | UI only, never a routing signal                                                     |
| `description`                              | optional, often a clone of the role                               | **required, 60–120, states _what + when_**                                                                                  | agentskills.io's checkable rule; the dominant description smell is unstated purpose |
| `whenToUse`                                | free text, 0–285 chars                                            | **trigger + domain noun, 100–200 (hard 250)**; a ≤ 40-char disambiguator **only** when nearest-neighbour similarity is high | It is the one field paid for every installed mode, every request                    |
| `roleDefinition`                           | persona prose                                                     | **charter**: scope · standard · refusal-with-destination · handoff                                                          | Persona text does not reliably improve objective accuracy                           |
| `customInstructions`                       | 0–49,299 chars                                                    | **bookended contract, ≤ 4k (hard 6k), ≤ 12 constraints**; procedure over 6 steps → skill                                    | Constraint count, not character count, is the binding limit                         |
| `groups`                                   | tool groups + one `fileRegex`                                     | **kept as sugar**; expands to a capability map                                                                              | 283/302 share one signature; one regex per mode cannot express per-path policy      |
| `allowedMcpServers`                        | optional allow-list; `undefined` = all                            | **explicit list, or the literal `all`**                                                                                     | Silent maximum-grant is a shipped anti-pattern elsewhere too                        |
| `capabilities` ⚖️                          | —                                                                 | \*\*path/command → `allow                                                                                                   | ask                                                                                 | deny`\*\*, default-deny, glob keys | The newer generation of products all express capability this way |
| `handoff` ⚖️                               | prose                                                             | **`handoffTo: [slug]`** + optional condition string                                                                         | Handoffs are first-class in the wider ecosystem; prose is not testable              |
| `owner`, `reviewed`, `category`, `tags` ⚖️ | —                                                                 | **catalogue-side only** (manifest), not persisted in the mode                                                               | `.roomodes` is strict; metadata does not need to reach the runtime                  |

⚖️ = requires an ADR before coding (§13).

### 3.2 Compatibility — the hard constraint nobody should skip

`.roomodes` is validated with a **strict** schema, and `bounded` must never persist, so **any new
persisted field can break a reader that has not been taught about it.**

**First, the good news, because it narrows the risk considerably.** The bundled preload travels _inside_
the VSIX: a user on an older Roo+ keeps their own older copy and never sees a newer file. So the
"user who has not updated the extension" is **not** the exposure for the preload path — you were right.

**Second, the marketplace question, answered plainly.** No other extension can read the Roo+ mode
marketplace: it is a **bundled YAML asset** inside our own VSIX, read from disk with no network call.
There is no shared store and no cross-extension marketplace for modes. What _is_ shared is the
**artefact**: installing a mode writes a `.roomodes` / `custom_modes.yaml`-shaped file that any fork in
this lineage can import. **Interoperability lives in the file format, not in the marketplace.**

That leaves three real exposures, none of which is "old extension, bundled modes":

| Exposure                | How it happens                                                                                                              | Why it matters                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **Team-shared file**    | One developer commits a `.roomodes` using new fields; a colleague runs an older Roo+, or a different fork, in the same repo | Their validator decides: strip-and-continue, or reject the whole file (all modes vanish) |
| **Cross-fork import**   | A user installs a mode from us, then imports it into Roo Code, Zoo Code, Cline, Kilo Code, or any importer of this lineage  | Same lineage of `ModeConfig`, different validators and different group vocabularies      |
| **Downgrade / pinning** | A user rolls back the extension while keeping a newer shared file                                                           | The older reader meets the newer file — the classic case                                 |

**So the ADR must test against _their_ validators, not only ours.** The required fixture matrix is:
one mode file per candidate route, run through (a) our strict `.roomodes` schema, (b) our
`CustomModesManager` load path, (c) the published schema of each fork we claim to interoperate with, and
(d) a group name the older validator has never seen. Three outcomes are possible per reader —
**ignore** (ideal), **strip** (acceptable), **reject the file** (disqualifying) — and the route is chosen
by the worst outcome across the matrix, not the best.

**First test result — executed against the built package (2026-11-05).** Not read from source: the
fixtures were run through `customModesSettingsSchema` exported by `@roo-code/types` (its built `dist`,
i.e. the schema the loader actually uses) and through the published JSON schema.

| Fixture                                        | Runtime (`customModesSettingsSchema`)                                                                  | Published schema (`schemas/roomodes.json`)                      |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| Baseline (valid)                               | ✅ loads                                                                                               | ✅ valid                                                        |
| Unknown **root** key (`foo: 1`)                | ✅ loads — **stripped silently**                                                                       | ❌ rejected                                                     |
| **Typo'd mode key** (`customInstrutions: "…"`) | ⚠️ loads — **field stripped silently**, instructions lost, no warning                                  | ❌ rejected                                                     |
| Extended group options (`allow`, `deny`)       | ✅ loads — extra keys **stripped**, `fileRegex` kept                                                   | ❌ rejected (`additionalProperties: false` at the options node) |
| `bounded: true` in a mode                      | ⚠️ loads and **keeps it** — the "must never persist" invariant is writer-enforced, not schema-enforced | ❌ rejected (field omitted by design)                           |
| Missing `roleDefinition` in one mode           | ❌ **whole file fails** — every mode lost                                                              | ❌ invalid                                                      |
| Duplicate slugs                                | ❌ **whole file fails**                                                                                | ❌ invalid                                                      |
| Unknown group name (`["bogus-group"]`)         | ❌ **whole file fails**                                                                                | ❌ invalid                                                      |
| Uppercase slug (`Demo-Case`)                   | ✅ loads (the known core/schema divergence)                                                            | ❌ rejected (lowercase pattern)                                 |
| Empty `groups: []`                             | ✅ loads                                                                                               | ✅ valid                                                        |

**Three conclusions, one of which corrects an earlier claim in this document.**

1. **Route A lives.** The runtime tolerates extra keys in group options and keeps the ones it knows —
   exactly the forward-compatible behaviour an old reader should exhibit. The capability map can ship
   inside `groups` with no file-format version and no user action.
2. **The published schema is the only strict reader, and it is ours.** It is generated from a _separate_
   zod definition (`roomodesZodSchema`, deliberately strict, `.omit({ bounded })`), introduced for
   authoring correctness. So there is nothing to "relax" at runtime — the two validators simply have
   different jobs, and the earlier statement that "our schema is strict, so one bad field fails the
   file" was **wrong about runtime**: unknown keys are stripped, not fatal. Only _structural_ errors are
   fatal.
3. **Silent tolerance has a cost.** A single-letter typo in a field name silently drops that field: the
   mode loads, minus its instructions, with no error anywhere. Tolerance is right for _forward
   compatibility_ and wrong for _authoring mistakes_ — the fix is a warning, not a rejection.

**What to measure instead of a schema.** Interoperability is what a _consumer does with the file_, so
the contract is a three-part artefact:

| Artefact                                | What it is                                                                                                                                                                                              | Why it is the right measure                                                               |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **1. Fixture corpus**                   | Versioned `.roomodes` files in `test-fixtures/modes/`, one per feature and one per failure mode (the table above), each with an expected outcome                                                        | It is the thing every consumer must agree on; it is versioned, diffable and reusable      |
| **2. Each consumer's loader, executed** | The corpus run through our loader and through each fork's loader; outcome classified `ignore · strip · reject · crash`, plus the observable result (does the mode appear? do its instructions survive?) | Users experience the loader, not the linter                                               |
| **3. Round-trip**                       | Export from Roo+ → import there → export there → import back; diff the result                                                                                                                           | Most real interop breakage shows up only here — a field we write that they drop on export |

Published JSON schemas are **secondary evidence** for step 2 (useful when a loader cannot be executed,
e.g. an archived binary) and must be labelled as such. The rule for ADR-3: **the fixture corpus is the
contract; the schemas are views of it.**

The corpus described above now exists as [`test-fixtures/modes/`](../test-fixtures/modes/README.md):
ten fixtures, the outcome classes, the round-trip protocol, and the rule that a `?` means _unmeasured_
rather than _presumably fine_.

**Do we need to research the foreign repositories? Yes — but the loaders, not the docs.** With the
upstream archived (2026-05-15), the comparison targets are Roo Code at its final commit, Zoo Code at its
current commit, and — only if they actually import `.roomodes` — Cline and Kilo. If a fork has no
`.roomodes` importer, it leaves the matrix rather than contributing a speculative row. Estimated cost:
half a day, and it decides whether Route A is safe across the lineage or merely within our own tree.

**It has been done** — [`docs/research/modes-interop-2026-11.md`](research/modes-interop-2026-11.md).
Result: **load-safe, not enforcement-safe.** No qualifying reader rejects F4; every one of them _strips_
`allow`/`deny`, and Roo Code also strips `allowedMcpServers`. Kilo Code does not read `.roomodes` at all
(it reads `custom_modes.yaml` / `.kilocodemodes`), and Cline does not read the artefact — it was dropped
from the matrix. The decision that follows is recorded in
[ADR: Mode capability policy is fail-closed](adr/adr-mode-capability-enforcement.md): `legacyGrant ⊆ policy`,
`edit` refinements only where `fileRegex` bounds them, and `command`/`mcp` policy on the loader/manifest
route or the empty-groups fail-closed form.

| Route                       | Mechanism                                                                                                                                                        | Verdict                                                                                                                                                                                              |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Extend group options** | `["edit", { fileRegex, allow: [...], deny: [...] }]` — the option object is hand-validated today, so an unknown property may pass an older reader and be ignored | **Preferred if verified.** Forward-compatible by construction: old readers ignore, new readers enforce. The ADR must _test_ the strictness behaviour of the generated JSON schema before adopting it |
| **B. Versioned file**       | `.roomodes` gains a schema-version envelope                                                                                                                      | **Rejected for now.** An old extension rejects the whole file — all modes disappear. Unacceptable failure mode                                                                                       |
| **C. Loader-side only**     | Ship the map in the manifest; the extension teaches nothing new                                                                                                  | **Fallback.** No schema risk, but users cannot express per-path policy in their own modes                                                                                                            |

**Rule:** until the ADR lands, nothing new is persisted. Every target-state feature below is written so
that it can ship **either** as a persisted field **or** as manifest/loader-side behaviour, with the same
user-visible semantics.

### 3.3 An annotated target mode

```yaml
customModes:
    - slug: api-contract-reviewer # lowercase, ≤40
      name: 📜 API Contract Reviewer
      description: >- # what + when, 60–120 chars, human-facing only
          Reviews OpenAPI/GraphQL contract changes for breaking changes before merge.
      whenToUse: >- # trigger + domain noun (≤200)
          Use when reviewing an API schema diff or contract change before release.
          Not for authoring new endpoints (use api-designer).
      roleDefinition: >- # CHARTER: scope · standard · refusal · handoff
          Scope: API contracts in this repository. Standard: additive-only changes unless
          the change is marked breaking in the PR. Refuse product decisions — route to
          product-manager. Hand off implementation to backend-developer.
      customInstructions: | # BOOKENDED contract
          ## Non-negotiables
          Cite every finding as path:line. Mark each breaking change with its consumer impact.

          ## Procedure
          1. read_file the contract and its diff.
          2. search_files for consumers of each changed field.
          3. Report findings in the output contract below.

          ## Output contract
          Table: field | change | breaking? | consumers | required action.
          Severity: breaking / risky / cosmetic.

          ## Handoff
          Use switch_mode("backend-developer", reason) for fixes; new_task for multi-repo work.

          ## Refusal & routing
          Product trade-offs → product-manager. Legal wording → corporate-law.

          ## Quality gates (run before attempt_completion)
          - Every breaking change has a consumer list.
          - No unverified consumer counts.
      groups:
          - read
          - [edit, { fileRegex: "\\.(ya?ml|md)$", description: "Contracts and docs only" }]
          - mcp
      allowedMcpServers: [git] # explicit; `all` would have to be literal
```

What is deliberately **absent**: a fourth paragraph of adjectives, a 40-item checklist, a tool
inventory, and any prohibition without a destination.

---

## 4. Budgets, gates and enforcement points

| Surface                     | Budget                                             | Authoring feedback | Build                        | Runtime             |
| --------------------------- | -------------------------------------------------- | ------------------ | ---------------------------- | ------------------- |
| routing index               | Σ gist ≤ **5.5k chars** (stage 1)                  | warning            | fail                         | warning in selector |
| `whenToUse`                 | 100–200 / hard 250                                 | warning            | fail                         | —                   |
| doctrine                    | ≤ 4k / hard 6k; ≤ 12 constraints                   | warning            | fail                         | —                   |
| constraints per section     | ≤ 3                                                | warning            | warn                         | —                   |
| charter                     | 300–700                                            | warning            | warn                         | —                   |
| skills index (**per mode**) | ≤ **1,200 chars including markup**, ≤ **6 skills** | warning            | fail                         | —                   |
| skill body                  | < 500 lines (spec)                                 | warning            | fail                         | —                   |
| `groups` / capability       | ≤ 2–3 grants; every `edit` scoped                  | warning            | fail on max-grant in preload | —                   |

**Failure semantics, fixed by policy:** anything that is _content_ fails the build; anything that is
_environment-dependent_ (how many modes a user installed) warns in the product. A user must never be
unable to work because they installed a lot of modes.

**Where gates attach** (real entry points, already in `package.json`):

| Hook           | Today                                                | Add                                                                       |
| -------------- | ---------------------------------------------------- | ------------------------------------------------------------------------- |
| `prevsix`      | submodule pin → announcement version → readme parity | + `gate:modes` (schema, budget, routing, doctrine, capability, staleness) |
| `prebundle`    | same, `--skip-descriptions`                          | + same gate, cheap subset                                                 |
| `gate:sync`    | marketplace/roomodes sync                            | unchanged; the catalogue-integrity check joins it                         |
| `test:scripts` | explicit spec list                                   | + the spec for each new gate                                              |
| CI             | style/type/test                                      | + routing evals (sampled cohort, nightly rather than per-PR if slow)      |

A gate that cannot print the number it enforces is not a gate — it is a mood. Each one must emit
`field, value, budget, file` on failure.

---

## 5. Catalogue: tiers, target spec, and how the counts work

### 5.1 Tier contract

| Tier                       | Size                                                                           | Admission test                                                                                                                               | Cost                  |
| -------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| **Bootstrap baseline**     | **1–3**                                                                        | the only modes shipped in core: a default mode and a read-only mode, so a zero-file, zero-config start always works                          | free (always present) |
| ~~Built-in~~ → **Preload** | 5 → 45                                                                         | superseded (ADR-6): today's `architect`/`code`/`ask`/`debug`/`orchestrator` become ordinary preload entries — same slugs, no privileged tier | Σ routing ≤ 12k chars |
| **Preload**                | **45** — incl. the 16 non-coding; was 60–90 ([why](modes-architecture.md:795)) | owned, dated, eval-backed, ≤ budget, distinct from neighbours; non-coding entries keep their label                                           | Σ routing ≤ 12k chars |
| **Marketplace**            | target + declared specialisations + labelled non-coding                        | passes schema + budget + a declared `ownerOf` job or `nonCoding: true`; no eval requirement at install                                       | zero until installed  |
| **Skills**                 | ~10 spine + tail                                                               | a procedure used by ≥ 2 modes, or > 800 chars in a contract                                                                                  | index only            |

### 5.2 Target catalogue spec (the "ideal catalogue" the refactor is measured against)

For each axis (defined in Phase 3.9 from an external taxonomy), the spec records:

- **jobs** to be served (the counting unit — not modes);
- **target job count** per axis and a **capability profile** (which grants the axis legitimately needs);
- **preload share** — how many of the axis's jobs the preload carries, and why;
- **one primary owner** per job;
- **disposition classes** for the refactor: `keep` · `merge into <slug>` · `thin to skill` · `retire` · `create`.
- **the words a user types** — E24 measured, per owner, which of them the line does not contain, and whether a model can reach the owner without them ([`triggers-candidates.json`](../test-fixtures/reach/triggers-candidates.json:1), log §34). Candidate list only; it is the input to J3, not a decision.

### 5.3 Counts are functions, never literals

Every published number (302, 90, 301-as-fixed, coverage percentages) is computed by a script from the
manifest and the catalogue. The existing failure — a generated document asserting "301 items" against a
302-mode catalogue — is the argument. If a number cannot be computed, it is not published.

### 5.4 What gets published about coverage

Four quantities, never blended ([`modes-doctrine.md`](modes-doctrine.md) Part VI): **supply breadth**
(jobs per axis), **allocation** (routing chars, preload slots), **eval coverage** (evidence per axis),
**need** (external baseline). Before evals exist, `C` is blank, not estimated; percentages use coarse
bins until each axis carries enough jobs to justify them.

> **Worked example deferred, deliberately.** Publishing S/A/C/N for one axis — with real catalogue
> numbers, and `C` and `N` marked blank rather than estimated — is a **Phase 3.10 deliverable**. Until
> that exists this section is a definition, not a chart.

### 5.5 Sequence: research → jobs → plan → refactor

The catalogue cannot be planned before its need baseline exists, and it must not be planned from the
shape of the current 302. Four steps, strictly ordered, research first:

| Step                    | Question                                                                                                      | Output                                                                                                       | Roadmap    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------- |
| **J1 — Axis research**  | What are the recognised dimensions of coding work, per external standards (not our categories)?               | 6–12 axis definitions, each with sources and a rationale                                                     | Phase 3.9  |
| **J2 — Job inventory**  | Within each axis, which **jobs** do developers actually bring to an agent?                                    | A job list per axis, each with a trigger description and a definition of done                                | Phase 3.9  |
| **J3 — Catalogue plan** | Which jobs get a mode, which are preloaded, which stay marketplace-only, which are covered by a skill instead | The target catalogue spec: the named mode list, the 45-mode preload selection, a capability profile per mode | Phase 3.11 |
| **J4 — Refactor**       | Apply dispositions to the existing catalogue                                                                  | Per-axis batches, each independently shippable                                                               | Phase 3.12 |

Two rules keep this honest. **A job enters the plan only with a failing eval or a named research source
behind it** (demand by failure). And **the preload is chosen from the job inventory, never from the
existing catalogue's shape** — otherwise the refactor becomes a relabelling of the status quo.

Consequence worth stating: the number 302 does not survive J3 by assumption. If the job inventory
yields 140 jobs, the catalogue targets ~140 owners plus a small number of deliberate variants, and the
rest is retired or absorbed. The number is an output, not a constraint.

---

## 6. The skill spine

| Property       | Rule                                                                                                                                                                                                       |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Extracted when | a block > 800 chars appears in ≥ 2 modes, **or** a contract exceeds 6k                                                                                                                                     |
| Where          | `.roo/skills/<name>/SKILL.md` (project) or `~/.roo/skills` (personal)                                                                                                                                      |
| Scope          | `modeSlugs: [...]`; empty = any mode                                                                                                                                                                       |
| Description    | ≤ 1,024 chars, states **what + when** (spec rule)                                                                                                                                                          |
| Body           | < 500 lines; longer content becomes reference files inside the skill folder                                                                                                                                |
| Trust model    | Rules and skills are **developer-owned configuration**, never retrieved documents. Moving instructions into a knowledge base is not indirection — it converts directives into untrusted data (doctrine T7) |
| Naming         | lowercase kebab; `require`-style dependencies not supported — a mode's charter must name the skills it expects                                                                                             |

The spine (from the architecture document §8.6) is the starting set, not a fixed law: evidence,
verification loop, diff hygiene, test selection, release/versioning, incident triage, security review,
API contract change, data migration, structured reporting.

---

## 7. Routing: stage 1 index, tags, and `search_modes` ⚖️

**Stage 1 (always on).** One line per installed mode: `slug · name · ≤60-char gist · tags`. The gist is
_derived_ from `whenToUse` (first clause), not authored twice. Cost at 90 modes ≈ 5.4k chars instead of
17.0k.

**Stage 2 (per task).** Full `whenToUse` for a retrieved shortlist (k ≈ 8–12), selected by tags, file
types and task keywords from the first message. A "show all modes" escape hatch is mandatory; a silent
drop is forbidden.

**For orchestrators: `search_modes(query, k)`** returns slug, name, one-line `whenToUse`, capability
summary, match score. It follows the existing `skill` tool pattern — an index the model can query — and
makes retrieval auditable and recoverable. `switch_mode` and `new_task` already sit in a `modes` tool
group, so this is a naming correction rather than a new concept.

**Gating:** below ~15 installed modes, filtering buys nothing and adds a failure mode. Enable by
threshold, not by default.

---

## 8. Capability map — decided (fail-closed)

> **Status: decided** — [ADR: Mode capability policy is fail-closed and Roo+-enforced](adr/adr-mode-capability-enforcement.md)
> (2026-11-06). The mechanism below survives with one rule added after the interop evidence: **the legacy
> grant must never be broader than the declared policy** (`legacyGrant ⊆ policy`). `edit` refinements may
> ride inside group options because `fileRegex` survives as a floor; `command`/`mcp` policy may not,
> because a stripped restriction over a surviving grant is a silent **widening**. Cross-lineage evidence:
> Roo Code `b867ec9` strips `allow`/`deny` **and `allowedMcpServers`**; Zoo Code `4d1a543` strips
> `allow`/`deny`; Kilo Code `b2ba8bb` never validates the shape and projects groups into its own
> permission map; Cline does not read the artefact at all.

```yaml
capabilities:
    read: allow
    edit:
        "**/*.md": allow
        "docs/**": allow
        "": deny # default deny
    command:
        "git status": allow
        "git diff": allow
        "": ask # default ask, never allow
    mcp: [git, docs] # or the literal `all`, written down
```

Rules the gate enforces: globs must compile; a wildcard grant must be the literal `all`; **a charter
that says "review only" while the map allows `edit` fails the build**; every preloaded mode's MCP policy
is stated in the UI; the mode card shows a one-line summary (`edit: docs/** · command: ask · MCP: git`).

`groups` expansion, so nothing breaks:

| `groups` entry            | Expands to                                                                             |
| ------------------------- | -------------------------------------------------------------------------------------- |
| `"read"`                  | `read: allow`                                                                          |
| `"edit"`                  | `edit: { "": allow }`                                                                  |
| `["edit", { fileRegex }]` | `edit: { <fileRegex>: allow, "": deny }`                                               |
| `"command"`               | `command: { "": ask }` (not allow)                                                     |
| `"mcp"`                   | `mcp: all` **only if** `allowedMcpServers` is absent — with the explicit-`all` warning |

---

## 9. Measurement

### 9.1 Two eval layers (not one)

| Layer                     | Question                                              | Assertion                                  | Cadence                    |
| ------------------------- | ----------------------------------------------------- | ------------------------------------------ | -------------------------- |
| **Routing eval**          | Did the right mode get chosen?                        | expected slug vs selected slug, per prompt | per change to routing text |
| **Behavioural eval**      | Did the mode do the job, and refuse the right things? | happy path · refusal · handoff             | per change to doctrine     |
| **Output-contract check** | Is the deliverable the promised shape?                | structure assertion, not "completed"       | same run                   |

### 9.2 The KPI loop

`score(mode) = correct selections ÷ times offered`, recomputed on every routing or doctrine change,
recorded locally, shown with a trend in Settings → Modes, and blocking in CI on regression. The
installation measures itself; nothing is transmitted. (Precedent: `claude plugin eval`.)
**Visibility and cost.** The _recorded_ score is free to display and should be written to the existing
`Roo+` output channel ([`outputChannelLogger`](../src/utils/outputChannelLogger.ts:9)) as well as
Settings → Modes — following the precedent of the ripgrep diagnostic
([`diagnostic.ts`](../src/services/ripgrep/diagnostic.ts:129)), which writes to its own channel and
offers a copy-to-clipboard action.

**Running** the evals is not free: every routing or behavioural eval is a model call that spends the
user's tokens. Hence four rules: run on demand or nightly, never per turn; show a token estimate before
a run; cache the result keyed by the doctrine hash it was measured against, so a stale score cannot
masquerade as a current one; and never run evals automatically on activation, where the cost would be
invisible.

**Onboarding hook.** "On demand" only works if a user discovers it. The KPI run belongs in the guided
first-run path as an **optional sixth step** beside the five blockers already tracked in
[`DEBT.md`](../DEBT.md:351) (provider, Semble, workspace trust, shell integration, indexing):
_"measure which modes work best for your projects"_. It inherits the same binding constraints recorded
there and in the public framing at [`ROADMAP.md`](../ROADMAP.md:29) — local-only, dismissible, never
blocking, never a nag, no network, and no auto-run.

### 9.3 Local ledger (opt-in export, no network)

Per slug: activations · completions · **immediate switch-aways** (misfire proxy) · last used · source.
Purpose: measure preload waste and routing misfires without telemetry. Export is an explicit user
action producing a file they may attach to an issue.

### 9.4 Experiment programme → phases

| Phase | Experiments                                                              | Question                                                |
| ----- | ------------------------------------------------------------------------ | ------------------------------------------------------- |
| 1     | **E1 bookend**, E2 constraint count, E5 model classes                    | Does our own doctrine design move compliance?           |
| 2     | E3 retrieval vs full index, E6 KPI validity, E7 `search_modes` vs static | Does filtering transfer to modes?                       |
| 3     | E4 thin modes, E8 staleness detection, E9 review time                    | How thin can a contract get?                            |
| 4     | —                                                                        | capability work is safety, not quality; gated by policy |

---

## 10. Migration from 302 — stages with exit criteria

| Stage  | Work                                                                                                                                                                                                                      | Exit criterion                                                                                          | Reversible?               |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------- |
| **M0** | Write this proposal, accept/reject the seven ADRs                                                                                                                                                                         | ADRs accepted, each with a falsifier                                                                    | n/a                       |
| **M1** | **Topology** — **DECIDED** ([ADR: vendor the catalogue](adr/adr-modes-catalogue-vendored.md)): vendored via `git subtree`; description gate split into `gate:catalogue`; the pin replaced by `verify:catalogue-integrity` | One home, nothing to drift                                                                              | Yes (git)                 |
| **M2** | Gates in **warn-only** mode across the whole catalogue                                                                                                                                                                    | A full report of every violation, nothing blocking                                                      | Yes (config)              |
| **M3** | Fix the preload (45 modes): rewrite `whenToUse`, dedupe, thin the worst offenders                                                                                                                                         | Σ routing ≤ 12k; no mode > 6k; distinctness passes                                                      | Yes (git revert)          |
| **M4** | Extract the skill spine; thin the modes that reference it                                                                                                                                                                 | ≥ 8 skills live, ≥ 3 modes each, doctrine shrink ≥ 30%                                                  | Yes (skills are additive) |
| **M5** | Flip gates to **fail** for preload + preload-adjacent; marketplace stays warn-only for one release                                                                                                                        | Two clean releases                                                                                      | Yes (config)              |
| **M6** | Refactor the **whole** catalogue to the target spec, in axis batches — preload and marketplace alike                                                                                                                      | Target spec met per axis; **every retired slug aliased** and the alias gate green; coverage regenerated | Per batch                 |

**M2 before M3 is not optional.** Turning a gate to fail before anyone has seen the violation report
converts a quality programme into an outage.

**The marketplace is not exempt (scope widened 2026-11-10).** It may exceed the target only through declared
specialisations and labelled non-coding modes. Every entry, wherever it sits, carries a disposition, a contract
inside budget, and the same grant rules. "Unbounded" described today's state; it was never a target.

**Disposition rules** used throughout (from doctrine Part IV): `keep` if it owns a job and passes
budgets; `merge` if two modes own one job; `thin` if the contract is mostly procedure; `retire` if no
failing eval can be named; `create` only against a failing eval.

---

## 11. What we keep, change and drop — target-state view

|            |                                                                                                                                                                                                                                                                                   |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Keep**   | three planes · capability as the enforced plane · canonical `custom_modes.d/` · sync pipeline · approval ladder · **the five slugs** (as ordinary preload entries) · the 10-axis taxonomy (after dedupe)                                                                          |
| **Change** | **built-in tier → preload + a 1–3 mode bootstrap baseline** · `groups` → map · persona → charter · doctrine → bookended contract + skills · `whenToUse` → trigger + conditional disambiguator · preload → budgeted portfolio chosen from a job inventory · gates → warn-then-fail |
| **Drop**   | any popularity display · runtime truncation · mode-count as a quality claim · procedures living in contracts · persona-shaped budgets                                                                                                                                             |
| **Add**    | `search_modes` · routing evals · KPI loop · local ledger · `gate:doctrine` · `gate:staleness` · coverage map · target catalogue spec                                                                                                                                              |

---

## 12. Risks

| Risk                                      | Mitigation                                                                                   |
| ----------------------------------------- | -------------------------------------------------------------------------------------------- |
| Schema change breaks users' `.roomodes`   | Route A/C only; no versioned envelope; migration is additive and tested against a v1 fixture |
| Retrieval misses the right mode           | Escape hatch, visible shortlist, threshold enablement, ADR falsifier                         |
| Thin modes lose needed context            | E4 gates the migration per batch; charter must name its skills                               |
| Gates block a release with no time to fix | Warn-only stage (M2), then flip per tier                                                     |
| Coverage map becomes marketing            | Four quantities; `C` blank until evals; coarse bins                                          |
| Migration stalls at M4                    | Batch by axis; each batch independently shippable                                            |

---

## 13. Open decisions (the ADR queue)

| #   | ADR                                                                                                                | The question it must answer                                                                                                                                                                      | Falsifier                                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Retrieval-filtered routing                                                                                         | Shortlist or full index, and how a miss is surfaced                                                                                                                                              | E3: accuracy drop without token win                                                                                             |
| 2   | `search_modes` tool                                                                                                | Tool, static shortlist, or hybrid; threshold                                                                                                                                                     | E7: no gain over the extra turn                                                                                                 |
| 3   | ~~Capability map~~ **DECIDED** — [ADR: fail-closed capability enforcement](adr/adr-mode-capability-enforcement.md) | Invariant `legacyGrant ⊆ policy`; `edit` refinements via group options (bounded by `fileRegex`); `command`/`mcp` via loader/manifest or the empty-groups fail-closed form; Route B rejected      | Revisit only if a reader preserves unknown group-option keys **on export** _and_ an older reader fails closed on unknown policy |
| 4   | Thin-modes migration                                                                                               | Extraction threshold and review cadence                                                                                                                                                          | E4: pass-rate loss beyond tolerance                                                                                             |
| 5   | Per-model policy                                                                                                   | One ceiling or profiles                                                                                                                                                                          | E5: no class difference                                                                                                         |
| 6   | ~~Target catalogue~~ **DECIDED** — [ADR: target catalogue](adr/adr-target-catalogue.md)                            | Jobs are the unit (119 jobs, one owner each); preload = ≥80% deep-band job coverage then ≤40 specialisations; built-ins absorbed into the preload with a 2-mode core baseline; size is an output | Revisit if eval coverage contradicts ownership, or a restricted preload underperforms today 90                                  |
| 7   | ~~Repository topology~~ **DECIDED** — [ADR: vendor the catalogue](adr/adr-modes-catalogue-vendored.md)             | Vendored via `git subtree`; gates split by concern; pin verifier retired                                                                                                                         | Revisit only if a real consumer needs the catalogue **by git** — then publish an artefact, do not re-nest a repo                |

**Decision rule for every ADR in this queue.** Each one is decided by the question _"what makes the best
possible product?"_ — never _"what can we do within today's configuration?"_. Current limitations (the
strict schema, the submodule, the absence of telemetry, the single-regex capability model) are
**constraints on the path, not on the target**. Where a limit blocks the better product, the ADR's job is
to name the change that removes the limit, state its migration cost, and _then_ choose. An ADR that
concludes "we cannot, because that is how it is built today" is not a decision; it is a status report.

Each ADR names the measurement that would overturn it. An ADR without a falsifier is an opinion with a
letterhead.

---

## 14. Definition of done

1. All seven ADRs **decided** — accepted _or_ rejected — each with a falsifier and an owner. A rejection
   with a reason is a decision; indefinite deferral is not.
2. Catalogue lives in one home, with the sync guard as the sole reproducibility gate.
3. Every gate runs in CI; the preload is clean; the marketplace is warn-only for one release, then clean.
4. Preload ≤ 90 jobs, Σ routing ≤ 12k chars, no contract over 6k, ≤ 12 constraints each.
5. ≥ 8 spine skills live and referenced by ≥ 3 modes each.
6. Routing and behavioural evals exist for the sampled cohort; the KPI records and blocks regressions.
7. The ledger ships with an export path and no network code.
8. Every published count is computed; the coverage map renders from data with `C` and `N` honestly blank
   or sourced.
9. `docs/modes-architecture.md` v3 describes the target as _today_, and this file is archived.

---

## 15. Appendix — the shape of the migration in one table

| From                                           | To                                            | Example                                                                            |
| ---------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------- |
| 302 contracts holding procedure                | 302 contracts + ~10 skills                    | `devops` keeps release _policy_; `release-and-versioning` skill holds the steps    |
| `read+edit+command+mcp+browser` ×283           | 15+ distinct capability profiles              | reviewer: `read` + `edit(docs/**)` + `mcp:[git]`                                   |
| `whenToUse` up to 285 chars, no disambiguation | trigger + conditional disambiguator           | `Not for authoring new endpoints (use api-designer)` only where neighbours collide |
| "Do not touch Terraform"                       | "Terraform changes belong to `devops`"        | one direction, one destination                                                     |
| Persona paragraph                              | Charter: scope · standard · refusal · handoff | four sentences, each checkable                                                     |
| 49,299-char contract                           | bookended contract + skills + rule files      | non-negotiables first, checklist last                                              |
| "301 items" in generated prose                 | computed count                                | the generator reads the catalogue                                                  |
| Popularity intuition                           | demand by failure                             | no new mode without a failing eval                                                 |
