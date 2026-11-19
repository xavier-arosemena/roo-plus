# Mode-file interoperability fixtures

**Status:** seed corpus (2026-11-05) for **ADR-3** — the capability-map / `.roomodes` compatibility decision.
This directory is intended to become the **contract** for mode-file interoperability: every consumer
(Roo+, Roo Code, Zoo Code, and any fork that imports `.roomodes`) must agree on what happens to each
fixture.

> **The corpus is the contract; every schema is a view of it.** A new mode field is not "designed" until
> it has a fixture here, an expected outcome, and a recorded result per reader.

## Outcome classes

| Class      | Meaning                                                               | Acceptable?                                                                |
| ---------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **ignore** | Unknown keys are skipped; the mode loads with its known fields intact | ✅ ideal                                                                   |
| **strip**  | Unknown keys are dropped silently; the mode loads                     | ✅ acceptable for _forward_ compatibility, ⚠️ lossy for authoring mistakes |
| **reject** | The reader refuses the file or the mode                               | ❌ disqualifying if it loses the whole file                                |
| **crash**  | Unhandled error, broken state, or silent data corruption              | ❌ always disqualifying                                                    |

Record the **observable** result as well as the class: does the mode appear in the picker? Do its
instructions survive? Is an error logged? Does anything get rewritten on disk?

## The fixtures

Each fixture is a complete `.roomodes` file. The expected outcome columns are filled from execution
against our own build on 2026-11-05; the fork columns stay `?` until the interop research lands.

| #   | Fixture                  | Exercises                                             | Roo+ runtime              | Roo+ published schema | Roo Code | Zoo Code | Cline | Kilo |
| --- | ------------------------ | ----------------------------------------------------- | ------------------------- | --------------------- | -------- | -------- | ----- | ---- |
| F1  | `v1-baseline`            | The shape every reader must accept                    | load                      | valid                 | ?        | ?        | ?     | ?    |
| F2  | `unknown-root-key`       | Forward tolerance at file level                       | strip                     | reject                | ?        | ?        | ?     | ?    |
| F3  | `typo-mode-key`          | Authoring-mistake loss (`customInstrutions`)          | strip ⚠️                  | reject                | ?        | ?        | ?     | ?    |
| F4  | `group-options-extended` | **Route A**: `allow`/`deny` inside group options      | strip (keeps `fileRegex`) | reject                | ?        | ?        | ?     | ?    |
| F5  | `bounded-marker`         | Transport marker must never persist                   | keeps ⚠️                  | reject                | ?        | ?        | ?     | ?    |
| F6  | `missing-required`       | Structural failure: one mode missing `roleDefinition` | **reject whole file**     | invalid               | ?        | ?        | ?     | ?    |
| F7  | `duplicate-slug`         | Structural failure: slug uniqueness                   | **reject whole file**     | invalid               | ?        | ?        | ?     | ?    |
| F8  | `unknown-group`          | Structural failure: `["bogus-group"]`                 | **reject whole file**     | invalid               | ?        | ?        | ?     | ?    |
| F9  | `uppercase-slug`         | Known core/schema divergence (`Demo-Case`)            | load                      | reject                | ?        | ?        | ?     | ?    |
| F10 | `empty-groups`           | Minimal capability surface (`groups: []`)             | load                      | valid                 | ?        | ?        | ?     | ?    |

## Fixture contents (canonical; materialise as files on first use)

**F1 — `v1-baseline.roomodes`**

```yaml
customModes:
    - slug: fixture-baseline
      name: Fixture Baseline
      roleDefinition: You are a fixture mode used to verify mode-file interoperability.
      description: Minimal valid mode used as the interoperability baseline.
      whenToUse: Use when verifying that a reader accepts the baseline mode shape.
      customInstructions: Report the fixture identifier and stop.
      groups:
          - read
```

**F2 — `unknown-root-key.roomodes`** — F1 plus a root key `fixtureMetadata: { origin: "interop" }`.

**F3 — `typo-mode-key.roomodes`** — F1 with `customInstrutions: Report the fixture identifier and stop.`
(the `s`/`t` transposition). A reader that strips silently loses the instructions with no error.

**F4 — `group-options-extended.roomodes`** — F1 with:

```yaml
groups:
    - read
    - [edit, { fileRegex: "\\.(md|ya?ml)$", description: "Docs only", allow: ["**/*.md"], deny: ["src/**"] }]
    - mcp
allowedMcpServers: [git]
```

**F5 — `bounded-marker.roomodes`** — F1 plus `bounded: true` inside the mode.

**F6 — `missing-required.roomodes`** — two modes; the second omits `roleDefinition`.

**F7 — `duplicate-slug.roomodes`** — two modes with the same `slug`.

**F8 — `unknown-group.roomodes`** — F1 with `groups: [bogus-group]`.

**F9 — `uppercase-slug.roomodes`** — F1 with `slug: Fixture-Baseline-Caps`.

**F10 — `empty-groups.roomodes`** — F1 with `groups: []`.

## Round-trip protocol

Import alone does not prove interoperability. For each reader that can export:

1. Import the fixture into the reader.
2. Export it back out.
3. Diff against the fixture.
4. Record every dropped, rewritten or reordered field, and whether an unknown key survived.

A reader that **imports** F4 but **drops** `allow`/`deny` on export is not round-trip safe, and any
"edit your mode over there" workflow silently erases the refinement.

## Rules for adding fixtures

- One file per case; name it after the behaviour, not the bug.
- Every fixture states its expected outcome for **every** reader in the table above (`?` means
  unmeasured, never "presumably fine").
- Executed results only. A result inferred from documentation is marked `(doc)` and treated as
  secondary evidence.
- Provenance for foreign readers: repository, commit SHA, retrieval date.

## Related

- [`docs/modes-target-state.md`](../../docs/modes-target-state.md) §3.2 — the compatibility analysis and
  the executed first results.
- [`packages/types/src/mode.ts`](../../packages/types/src/mode.ts) — the runtime schema the loader uses.
- [`schemas/roomodes.json`](../../schemas/roomodes.json) — the strict authoring schema (a _view_, not the
  contract).
