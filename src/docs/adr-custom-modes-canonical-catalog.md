# ADR: Canonical `custom_modes.d/` Catalog as the Single Source for Custom Modes

**Date**: 2026-08-06

**Status**: ✅ ACCEPTED

## Context

Roo+ ships a large custom-modes library through a git submodule (`custom-modes/`),
and several shipped artifacts are generated from it: [`.roomodes`](../../.roomodes)
(the pre-loaded modes), [`pre-installed-modes.yml`](../../src/assets/marketplace/pre-installed-modes.yml)
(the seeded modes), and the marketplace catalog [`modes.yml`](../../src/assets/marketplace/modes.yml).

Before this change the submodule contained **several overlapping catalogs** with
different schemas and overlapping-but-not-identical slug sets:

- `custom-modes/agents/` — a flat-YAML catalog previously used as the sync source;
- `custom-modes/custom_modes.d/` — nested `customModes:`-wrapped files (one mode
  per file);
- `custom-modes/vs-code/converted_modes.d/` — a derived conversion set;
- a monolithic `custom_modes.yaml` and split `.roomodes.00…10` batch artifacts.

The pipeline regenerated `.roomodes` from `agents/` while the other sets were only
description-enforced and drift-reported, so the sets could silently diverge (slugs
present in one set but not another, different schemas, extra `style-*` /
`flow-nexus-*` / `swarm-*` families). "Which catalog is canonical" was ambiguous,
raising the risk of shipping packaged artifacts out of sync with the source of
truth (Issue [#159](https://github.com/xavier-arosemena/roo-plus/issues/159)).

Additionally, the extension core owns built-in modes (`architect`, `code`, `ask`,
`debug`, `orchestrator`). If a generated artifact ever included one of these slugs
it would create colliding mode definitions at runtime.

## Decision

**Make `custom-modes/custom_modes.d/` the single canonical catalog and rewire the
whole sync pipeline around it** (Issue #159):

- **Remove** the legacy `custom-modes/agents/` catalog, the derived
  `vs-code/converted_modes.d/` set, the monolithic `custom_modes.yaml`, and the
  split `.roomodes.00…10` batch artifacts. `custom_modes.d/` (one YAML file per
  mode, 301 modes) is the only source of truth.
- **Regenerate all shipped artifacts from the canonical source**:
  [`scripts/sync-custom-modes.mjs`](../../scripts/sync-custom-modes.mjs) consumes
  `custom_modes.d/**/*.yaml` (guided by the curation manifest
  [`custom-modes/manifest.json`](../../custom-modes/manifest.json)) and emits
  `.roomodes`, `pre-installed-modes.yml`, and the marketplace `modes.yml`
  (301 items = the 301-mode catalog).
- **Keep SOURCE-WINS merge semantics** (`mergeRoomodesModes()`): on slug conflict
  the freshly generated canonical entry wins, so re-running sync repairs stale
  committed entries; manual additions whose slug is absent from the catalog are
  preserved; user-level edits in globalStorage `custom_modes.yaml` are untouched
  (merged at runtime by `CustomModesManager`).
- **Add a built-in slug guard**: `sync-custom-modes.mjs` fails the build if any
  core mode slug (`architect`, `code`, `ask`, `debug`, `orchestrator`) leaks into
  `.roomodes`, `pre-installed-modes.yml`, or `modes.yml`.
- **Pin the submodule** at a recorded commit (currently `8cdf378b`) and enforce it
  with [`scripts/verify-submodule-pin.mjs`](../../scripts/verify-submodule-pin.mjs),
  wired into `prevsix` / `prebundle` / `prevscode:prepublish`, so every packaging
  path builds against a known-good, clean checkout.
- **Regenerate and verify**: `.roomodes` reproducibility is guarded by
  [`scripts/verify-roomodes-sync.mjs`](../../scripts/verify-roomodes-sync.mjs); the
  description pipeline is consolidated in
  [`scripts/ensure_descriptions.py`](../../scripts/ensure_descriptions.py) and
  documented in [`scripts/DESCRIPTIONS.md`](../../scripts/DESCRIPTIONS.md).

## Consequences

### Positive

- One canonical catalog, one schema, one pipeline — no more cross-set drift
  reporting or ambiguous "which set is source of truth".
- Packaged artifacts cannot silently diverge from the source (submodule pin +
  roomodes-sync gates, wired into CI and every packaging path).
- Built-in core slugs can never be duplicated from the catalog, preventing
  colliding mode definitions at runtime.
- Contributors have a single place to add or edit modes (`custom_modes.d/`).

### Negative

- The removed legacy layouts (`agents/`, `converted_modes.d/`, monolithic
  `custom_modes.yaml`, `.roomodes.00…10`) break any external tooling that
  depended on them.
- The curated preload set changed slightly (90 curated modes vs the previous 89),
  which is user-visible in the mode selector and the READMEs.

### Neutral

- `BUILT_IN_SLUGS` in the sync script duplicates the extension core's built-in
  mode slugs; the set is stable today but the duplication is unenforced (tracked
  in [`DEBT.md`](../../DEBT.md) item #14).

## Related

- Issue [#159](https://github.com/xavier-arosemena/roo-plus/issues/159) — "Roo-plus Custom Modes".
- [`scripts/DESCRIPTIONS.md`](../../scripts/DESCRIPTIONS.md) — canonical-source decision and enforcement for mode descriptions.
- [`DEBT.md`](../../DEBT.md) — technical debt register (item #14).
- Registered in the ADR index at [`src/docs/ADR-INDEX.md`](ADR-INDEX.md).
