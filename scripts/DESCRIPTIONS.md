# Mode Description Pipeline (canonical source decision)

This document captures the source-of-truth decision for mode descriptions in the
`roo-plus` repo and documents the single tool that enforces them. It consolidates
architecture review recommendations #3, #4 and #7.

## Canonical source: `custom-modes/custom_modes.d/`

`custom-modes/custom_modes.d/` (nested `customModes:` wrapper, **one mode per
file**, 301 modes) is the canonical store. It is what feeds the shipped
artifacts via [`scripts/sync-custom-modes.mjs`](sync-custom-modes.mjs):

```
custom-modes/custom_modes.d/**/*.yaml  ──►  sync-custom-modes.mjs  ──►  .roomodes
      (CANONICAL)                                             └──►  src/assets/marketplace/pre-installed-modes.yml
                                                               └──►  src/assets/marketplace/modes.yml (catalog)
```

The curation manifest [`custom-modes/manifest.json`](../custom-modes/manifest.json)
controls which modes are included in `.roomodes` (`includeSlugs`, `excludeSlugs`).

> The legacy `custom-modes/agents/` catalog (flat YAML), the derived
> `custom-modes/vs-code/converted_modes.d/` set, the monolithic
> `custom-modes/custom_modes.yaml`, and the split `custom-modes/.roomodes.00…10`
> batch artifacts were **removed**. `custom_modes.d/` is the single canonical
> catalog, and this pipeline enforces descriptions there and nowhere else.

## The single tool: `scripts/ensure_descriptions.py`

[`scripts/ensure_descriptions.py`](ensure_descriptions.py) is the ONE
deterministic, idempotent tool that replaced the three overlapping fixers:

| Retired script                                                                                                                | Replacement                                                |
| ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `custom-modes/scripts/fix_descriptions.py` (USER_FRIENDLY_DESCRIPTIONS + fallback, plus the `whenToUse` side-effect mutation) | thin wrapper → `ensure_descriptions.py` (mutation removed) |
| `scripts/add_descriptions.py` (CURATED_DESCRIPTIONS, `.roomodes`-era)                                                         | thin wrapper → `ensure_descriptions.py`                    |
| `scripts/fix_missing_descriptions.py` (derives from `roleDefinition`)                                                         | thin wrapper → `ensure_descriptions.py`                    |

Guarantees:

- **Canonical store**: `CANONICAL_DESCRIPTIONS` (237 curated slugs; the legacy
  `CURATED_DESCRIPTIONS` is fully subsumed and kept only for provenance).
- **Deterministic derivation fallback** when no curated entry exists and the
  current description is missing or a clone of `roleDefinition`:
  `whenToUse` → `roleDefinition` first line.
- **Idempotent**: re-running produces zero churn (verified on all 301 modes).
- **Never destroys a good description**: for unknown slugs, an existing good
  description is preserved; only missing/clone descriptions are replaced.
- **Surgical edits**: only the `description:` scalar is replaced in place — all
  other lines, comments, formatting and ordering are preserved byte-for-byte
  (the old fixer rewrote whole files via `yaml.dump`).

### Usage

```bash
python3 scripts/ensure_descriptions.py                 # enforce on the canonical set
python3 scripts/ensure_descriptions.py --check         # dry-run; exit 1 if changes pending (CI gate)
python3 scripts/ensure_descriptions.py --report        # summary + coverage report (no writes)
python3 scripts/ensure_descriptions.py --self-test     # in-memory self checks
```

## Sync semantics: source wins for committed artifacts (RC-3)

[`scripts/sync-custom-modes.mjs`](sync-custom-modes.mjs) merges freshly generated
entries with existing `.roomodes` content using **SOURCE-WINS** semantics
([`mergeRoomodesModes()`](sync-custom-modes.mjs)):

- On slug conflict the freshly generated entry (from the curated mode source)
  **wins**, so re-running sync refreshes stale entries (e.g. missing/old
  descriptions) instead of preserving them.
- Existing modes whose slug is absent from the curated source are preserved as
  manual additions.
- Only the **user-level settings file** (`custom_modes.yaml` in globalStorage)
  preserves user edits; that file is merged at runtime by `CustomModesManager`
  and is never touched by the sync script.
- The script is idempotent: it only writes `.roomodes` /
  `pre-installed-modes.yml` when the generated content actually changed.

`.roomodes` reproducibility is guarded by
[`scripts/verify-roomodes-sync.mjs`](verify-roomodes-sync.mjs), which regenerates
`.roomodes` from scratch and fails on any drift:

```bash
node scripts/verify-roomodes-sync.mjs
```

## Marketplace descriptions

The Modes Marketplace catalog item-level `description` is a short blurb
(truncated to 150 chars) for browsing; the installed mode content retains the
**full** description via the `content` field. `SimpleInstaller` installs from
`item.content`, so the full description always survives installation (covered by
`src/services/marketplace/__tests__/SimpleInstaller.spec.ts`).

When preserving legacy non-custom-modes marketplace items, the sync script
dedupes by item id with **CATALOG-WINS** semantics
([`dedupeMarketplaceById()`](sync-custom-modes.mjs)): any preserved original
whose id collides with a catalog mode (e.g. the legacy `security-review` item vs
`custom_modes.d/security/security-review.yaml`) is dropped, so `modes.yml`
never contains duplicate ids.

## Coverage reporting

```bash
python3 scripts/ensure_descriptions.py --report
```

Reports the canonical `custom_modes.d/` slug count and per-mode description
coverage (missing / clone-of-`roleDefinition`).

## Submodule pinning policy (build-hermetic gate)

> **Why this matters (architecture review #5).** The shipped VSIX embeds
> `src/assets/marketplace/pre-installed-modes.yml` and `.roomodes`, which are
> **regenerated from the `custom-modes` submodule at build time** by
> [`scripts/sync-custom-modes.mjs`](sync-custom-modes.mjs). If a build server has a
> stale / wrong / dirty submodule checkout (or none at all), the packaged asset
> **silently ships modes without descriptions**. The runtime back-fill in
> `CustomModesManager` can only repair from whatever the bundle contains —
> garbage in, garbage out.

### Where the pin lives

`custom-modes/` is a git submodule of the external repo `Custom-Modes-Roo-Code`.
The **pin is the gitlink commit recorded in the superproject index** (not
`.gitmodules`, which only stores the path/URL):

```bash
git ls-tree HEAD custom-modes        # → 160000 commit <PIN> custom-modes
git submodule status custom-modes    # ' ' = at pin · '+' = checkout differs · '-' = uninitialized
```

### The gate: `scripts/verify-submodule-pin.mjs`

[`scripts/verify-submodule-pin.mjs`](verify-submodule-pin.mjs) fails (exit 1) the
build unless **all** of the following hold:

1. The `custom-modes` submodule is **initialized** (a missing submodule is a
   packaging hazard, not a skip condition).
2. The checked-out HEAD **matches the recorded pin**.
3. The submodule working tree is **clean** (no uncommitted changes).
4. (default ON) Every **curated** mode in `custom-modes/custom_modes.d/` has a
   **non-empty description** that is not a clone of its `roleDefinition`.

```bash
node scripts/verify-submodule-pin.mjs                    # pin + clean + descriptions
node scripts/verify-submodule-pin.mjs --skip-descriptions # pin + clean only (prebundle)
node scripts/verify-submodule-pin.mjs --only-descriptions # description scan only
```

It is wired so **no packaging path can bypass it**:

| Invocation                                       | Hook that runs the gate      |
| ------------------------------------------------ | ---------------------------- |
| `pnpm vsix` (or `pnpm --filter ./src vsix`)      | `prevsix`                    |
| `pnpm bundle` / `turbo bundle` (incl. `pretest`) | `prebundle` (pin + clean)    |
| `vsce package` (any workflow, incl. nightly)     | `prevscode:prepublish`       |
| root `pnpm vsix` / `pnpm bundle`                 | root `prevsix` / `prebundle` |

The gate is also chained into CI (`code-qa`, `release-validation`,
`marketplace-publish`, `pre-release-publish`), which now check out the submodule
recursively with `actions/checkout` `submodules: recursive` — so CI builds from
the **pinned** submodule state, never from committed-but-unverified artifacts.

`verify-roomodes-sync.mjs` complements the gate: it **fails** (exit 1) when the
submodule is missing and confirms the committed `.roomodes` is byte-reproducible
from the pinned submodule content.

### When to bump the pin

- **Bump** whenever `custom_modes.d/` content (descriptions, role definitions,
  instructions) or the curation manifest (`manifest.json`) changes — those
  directly feed the shipped artifacts.
- **Do not bump** for submodule-internal changes that don't affect the generated
  artifacts (e.g. pure tooling in `custom-modes/scripts/`). Keep the pin at the
  reviewed commit; the gate enforces that the checkout matches it regardless.

### How to bump the pin

```bash
# 1. Commit & push the desired change inside the submodule FIRST.
cd custom-modes && git add . && git commit && git push && cd ..

# 2. Point the parent at the new submodule commit.
git submodule update --remote -- custom-modes        # or: git -C custom-modes checkout <new-sha>
git add custom-modes

# 3. Regenerate committed artifacts from the NEW pin.
pnpm sync:custom-modes

# 4. Commit submodule pin + regenerated artifacts together (never one without the other).
git add .roomodes src/assets/marketplace/pre-installed-modes.yml \
        src/assets/marketplace/modes.yml custom-modes

# 5. Prove hermetic + reproducible before merging.
node scripts/verify-submodule-pin.mjs
node scripts/verify-roomodes-sync.mjs
pnpm run test:scripts
```

### Reproducibility confirmation

Given the same submodule pin, `sync:custom-modes` is byte-idempotent:

```bash
node scripts/sync-custom-modes.mjs && sha256sum .roomodes src/assets/marketplace/pre-installed-modes.yml
node scripts/sync-custom-modes.mjs && sha256sum .roomodes src/assets/marketplace/pre-installed-modes.yml
# Both runs must print IDENTICAL hashes; pre-installed-modes.yml must equal .roomodes.
```

## Missing-description policy & enforcement gates (architecture review #6)

### Policy: a mode without a description is a defect

A mode that omits `description` (or leaves it blank / a clone of its
`roleDefinition`) is treated as **missing** — the same class of defect that
originally shipped in the VSIX and triggered this work. Policy:

| Scope                                                               | Missing description is…                                     | Enforced by                                                                       |
| ------------------------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Canonical `custom_modes.d/` set                                     | **ERROR** (exit 1)                                          | `scripts/ensure_descriptions.py --check`, `scripts/verify-submodule-pin.mjs` (CI) |
| Bundled marketplace assets (`pre-installed-modes.yml`, `modes.yml`) | **ERROR** (test failure)                                    | `src/__tests__/dist_assets.spec.ts` description-completeness assertions           |
| Schema-level (`custom_modes.d/` per-file / `.roomodes` validation)  | warning by default; **ERROR** with `--require-descriptions` | `custom-modes/scripts/validate_custom_modes.py`                                   |
| Compiled / individual verifier                                      | ERROR (reported issue)                                      | `custom-modes/scripts/verify_modes.py`                                            |

### `ensure_descriptions.py --check` is wired into CI

`scripts/ensure_descriptions.py --check` (dry-run; exit 1 on any pending
description fix) is chained into the same validation jobs that already run
`verify-submodule-pin.mjs`:

- `.github/workflows/code-qa.yml` → `static-analysis` job
- `.github/workflows/release-validation.yml` → `validate-release` job

CI installs PyYAML when needed (`python3 -c "import yaml" || sudo apt-get install
python3-yaml`) before invoking the gate. The gate is proven by
`scripts/ensure_descriptions.spec.mjs` (node:test), which drives the real script
against a temp fixture via `ROO_SUBMODULE_PATH` and asserts exit 1 on a blanked
description / clone-of-`roleDefinition` and exit 0 when clean. The spec is part
of `pnpm run test:scripts`.

### Submodule-internal verifiers (`custom-modes/scripts/`)

Per the "When to bump the pin" rule above, changes to pure tooling in
`custom-modes/scripts/` (which do not affect generated artifacts) are committed
and pushed in the **custom-modes repo without bumping the pin**. The two
verifiers have a validated patch (applied, exercised, then reverted here to keep
the pinned submodule clean) that flags a missing/blank description:

- `custom-modes/scripts/validate_custom_modes.py` — adds a `--require-descriptions`
  flag: a missing `description` is a **warning** on stderr by default
  (derived/drifted sets) and an **ERROR** (exit 1) when the flag is set (canonical
  `custom_modes.d/` set / compiled artifact). Policy constant `DESCRIPTION_POLICY`
  documents the rationale.
- `custom-modes/scripts/verify_modes.py` — `description` is added to the
  empty-fields scan, so a missing/blank description is reported as
  `EMPTY description` exactly like any other required field.

Both were validated against a fixture with a mode that omits `description`
(see completion summary for the exact diffstat). Apply them via the custom-modes
repo workflow when next touching that repository.
