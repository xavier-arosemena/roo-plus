# ADR: Mode capability policy is fail-closed and Roo+-enforced

**Date**: 2026-11-06

**Status**: ✅ ACCEPTED

**Decision owners**: Repository maintainer

## Context

Roo+ needs to express capability policy finer than "this mode may use `edit`": which paths, which
commands, which MCP servers. The target state proposed a `capabilities` map
(path/command → `allow | ask | deny`), and three routes were open for carrying it in a `.roomodes` file:

| Route | Mechanism                                                                           | Predicted failure mode                                       |
| ----- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **A** | Extend the existing group-options object — `["edit", { fileRegex, allow, deny }]`   | Old readers ignore the new keys                              |
| **B** | Versioned file (`modeSchemaVersion`, or a restructuring envelope)                   | Old readers reject the file, or silently apply old semantics |
| **C** | Loader-side / catalogue-side — the file keeps a coarse grant; Roo+ holds the policy | The file cannot carry policy for other tools                 |

The question was treated as a compatibility question, and the answer was measured rather than argued.
Our own validators were executed against a 10-fixture corpus
([`test-fixtures/modes/`](../../test-fixtures/modes/README.md)), then the foreign readers were examined at
pinned commits ([interop research](../research/modes-interop-2026-11.md)): Roo Code at `b867ec9`
(archived 2026-05-15), Zoo Code at `4d1a543`, Kilo Code at `b2ba8bb`. Cline was screened out — it does
not read the artefact at all.

Three facts decide this ADR:

1. **Every qualifying reader loads `allow`/`deny` rather than rejecting the file.** The worst outcome
   across the lineage is _strip_, never _reject_. Route A is load-safe.
2. **Every foreign reader strips them.** Roo Code strips `allow`, `deny`, **and `allowedMcpServers`**
   (the field did not exist in its schema). Zoo Code strips `allow`/`deny` but keeps the MCP allow-list.
   Kilo never validates the shape and projects the group into its own permission map.
3. **A stripped restriction is not a neutral loss when the grant survives.** For `edit`, the surviving
   `fileRegex` is a floor, so the loss is bounded. For `command` and `mcp` there is **no floor**: the
   stripped result is the _whole group granted_ — a silent widening to maximum capability. Roo Code goes
   further and turns "this mode may use one MCP server" into "any connected server".

The generalisable sentence: **the grant is the part every reader understands; the restriction is the part
only the newest reader understands.** Any design that keeps the grant in a legacy field and puts the
restriction in a new one will be silently widened by every older reader.

## Decision

**Capability policy is fail-closed, and the `.roomodes` file is a legacy floor — not the enforcement
boundary.**

1. **The invariant.** For every mode and every capability, the legacy grant must be **no broader** than
   the intended policy: `legacyGrant ⊆ policy`. A mode whose policy is narrower than its legacy group is
   invalid — a build failure, not a warning. This is the rule; everything below is its application.
2. **`edit` refinements (Route A, bounded).** `allow`/`deny` may live inside the group-options object when
   they **only narrow** `fileRegex`. Old readers then apply `fileRegex` — broader than authored, still
   bounded — which satisfies the invariant because `fileRegex` is itself part of the declared policy.
3. **`command` and `mcp` policy (Route C).** Policy is never expressed by keeping a broad group and
   adding a stripped key. Two compliant encodings:
    - **fail-closed**: the mode omits the group (or declares `groups: []`) so foreign readers grant
      nothing, with the Roo+ policy carried in an additive optional key;
    - **deliberate widening**: keep the broad group and accept that foreign readers grant it fully — a
      documented product choice for modes whose _intent_ is the whole group, never for restrictions.
4. **No required keys, no new group names, no envelope.** A new required field turns into whole-file
   failure for every pre-existing file; a new group name (`"capabilities"`, `"paths"`) is fatal at F8 for
   Roo Code and Zoo Code; a version key is stripped (so it enforces nothing) and an envelope is rejected.
   Route B is therefore **rejected** on evidence, not preference.
5. **The UI shows the effective policy, not the authored one.** A mode card must read
   `Roo+ enforces: docs/** only · elsewhere: fileRegex only` and mark any `command`/`mcp` restriction as
   Roo+-only. A restriction the product cannot enforce elsewhere is stated, never implied.
6. **The two validators get explicit, documented jobs.** The runtime loader is the **compatibility
   contract**: tolerant, strips unknown keys, and now **warns** (never rejects) so a typo such as
   `customInstrutions` is visible instead of silently losing instructions. The published
   [`schemas/roomodes.json`](../../schemas/roomodes.json) is the **authoring linter**: strict, generated
   to include the new optional keys, and no longer described anywhere as a statement about runtime
   behaviour.
7. **`bounded` is dropped at load.** The transport-only marker is currently accepted and kept by the
   loader despite the code comment claiming otherwise; the loader will strip it (as it already does for
   deprecated groups) and a regression test will assert it never round-trips to disk.
8. **No round-trip promise.** Roo Code and Zoo Code erase `allow`/`deny` on load/save, and Roo Code
   erases `allowedMcpServers`. "Edit your mode over there" is documented as destructive to the policy.

## Alternatives rejected

| Alternative                                                    | Why rejected                                                                                                                          |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Route A as the general carrier for the whole map               | Enables silent widening for `command`/`mcp`, where no legacy floor exists. Violates the invariant                                     |
| Route B (versioned file)                                       | Additive version key is stripped (enforces nothing); a restructuring envelope is a whole-file failure. Both lose on evidence          |
| Keep the file as the enforcement boundary and document the gap | Documentation does not bound a blast radius; a mode that _looks_ restricted but is not is worse than a mode that is visibly tool-less |
| Reject unknown keys at runtime to force fidelity               | Would break every file authored by a newer version and every foreign-mode import — trading a safety gap for an availability outage    |

## Consequences

### Positive

- The failure direction becomes safe: older readers **disable** capability rather than **widen** it.
- One rule (`legacyGrant ⊆ policy`) is checkable by `gate:capability` and explainable in one sentence.
- No version envelope, no migration cliff, no user action for existing files.
- Typo silent-loss is fixed by a warning, without tightening acceptance.

### Negative

- **Capability policy is not portable.** A `.roomodes` file cannot carry an enforceable policy to other
  tools; only `groups` + `fileRegex` travel. Interchange with the lineage is lossy by design.
- The UI owes the user an explanation on every mode with a Roo+-only restriction — real design work, and
  a place where a bad label becomes a false assurance.
- Modes restricted by policy will look _less_ capable when opened elsewhere (tool-less), which will draw
  support questions.

### Neutral

- Kilo maps `browser` to `bash`, so the same file already yields different capabilities across the
  lineage; Roo+ already deprecates `browser`, which reduces one axis of divergence.
- The published schema stays strict — it just stops pretending to be the runtime.

## Falsifier

Revisit this ADR if **both** of the following become true: a foreign reader preserves unknown
group-option keys **on export** (round-trip fidelity returns), and an older reader fails **closed** by
default on unknown policy. Either alone is insufficient — the first restores the map, the second removes
the widening — but only together do they make the file a viable enforcement boundary again.

## Migration Strategy

1. `gate:capability` implements the invariant, warn-only first (migration stage M2).
2. `edit` refinements ship behind the existing `fileRegex` floor; the UI label and the schema extension
   land in the same change.
3. `command`/`mcp` policy ships as Route C (loader-side) with the fail-closed authoring rule documented.
4. `bounded` is dropped at load with a regression test.
5. A warning is emitted for unknown keys at load, and the authoring linter is regenerated from the
   loader's rules.

## See Also

- [Interop research (2026-11)](../research/modes-interop-2026-11.md) — the executed verdict matrix, per-reader
  evidence, silent-downgrade analysis.
- [`test-fixtures/modes/`](../../test-fixtures/modes/README.md) — the contract corpus (F1–F10).
- [Modes Target State](../modes-target-state.md) §3.2 (compatibility), §8 (capability map).
- [Modes Architecture](../modes-architecture.md) §11.1 (`gate:capability`), §12 Phase 4.
- Related ADRs: [Canonical catalog](adr-custom-modes-canonical-catalog.md).
