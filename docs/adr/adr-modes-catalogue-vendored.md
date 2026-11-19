# ADR: Vendor the modes catalogue into the repository

**Date**: 2026-11-06

**Status**: ✅ ACCEPTED

**Decision owners**: Repository maintainer

## Context

`custom-modes/` is a **git submodule** with its own remote
(`git@github.com:xavier-arosemena/Custom-Modes-Roo-Code.git`), carried over from the fork era. The
superproject records a gitlink — `78a2010bcc511e014be2f3852e965f92e8a756e3` — and every packaging path
runs [`verify-submodule-pin.mjs`](../../scripts/verify-submodule-pin.mjs) to refuse a stale, wrong or
dirty checkout. The catalogue's _work_ is finished; only the re-wiring remains, and the upstream PRs
have been pushed and are unmerged by design: the goal is to stop operating as a fork.

**What the submodule buys today**, measured rather than assumed:

| Claimed benefit                               | Reality                                                                                                                                                           |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hermetic packaging                            | The pin proves _which commit_ was checked out, not what the build consumed — and it fails closed only if the gate runs                                            |
| Independent release cadence for the catalogue | The catalogue ships **inside the VSIX** as generated artefacts (`.roomodes`, `pre-installed-modes.yml`, `modes.yml`). There has never been an independent release |
| Independent history and attribution           | The remote is **our own** fork-era repository. Independence is a fiction unless a third party consumes it                                                         |
| Updatable without touching the app repo       | That is the _problem_, not the benefit: catalogue changes escape review by the code that consumes them                                                            |

**What it costs today**, also measured:

| Cost                       | Evidence                                                                                                                                                                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Clone friction             | A clone without `--recurse-submodules` cannot build; the remote is an **SSH** URL, so contributors without GitHub SSH keys cannot initialise it                                                                                       |
| Two-step change ritual     | Every catalogue edit is a submodule commit **plus** a superproject pin bump — two reviews, two histories, one reviewable artefact                                                                                                     |
| A bespoke gate to maintain | The pin verifier is ~200 lines whose only purpose is detecting the drift the submodule creates                                                                                                                                        |
| CI complexity              | Submodule checkout must be configured in [`code-qa.yml`](../../.github/workflows/code-qa.yml) and [`marketplace-publish.yml`](../../.github/workflows/marketplace-publish.yml)                                                        |
| Coupled gates              | The **description** check lives _inside_ the pin verifier (it imports `loadManifest`/`scanAllAgents` from the sync script), so a pin concern and a content concern share a lifetime                                                   |
| **Demonstrated drift**     | The [canonical-catalog ADR](adr-custom-modes-canonical-catalog.md) documents the pin as `8cdf378b`; the actual gitlink is `78a2010`. Two places that must agree already disagree — which is the failure mode the gate exists to catch |
| 14 coupling points         | `sync-custom-modes`, `verify-roomodes-sync`, `verify-submodule-pin`, `generate-catalog`, `ensure_descriptions`, `add_descriptions`, `verify-docs-no-public-ip`, both CI workflows, root and `src` `package.json` hooks                |

The decisive observation: **the pin's guarantee is exactly the guarantee a normal commit already gives.**
A vendored directory at commit _C_ cannot be stale, wrong, or dirty relative to the superproject — it
_is_ the superproject. The verifier's only remaining job would be content checks, which belong to a
catalogue gate regardless of topology.

## Decision

**Vendor `custom-modes/` into the repository and delete the submodule, the pin gate and the
`.gitmodules` entry.**

1. **History-preserving import** via `git subtree add --prefix=custom-modes <url> <sha>`. Prefer a
   non-squashed import when the imported commit count is manageable (it preserves per-mode authorship and
   blame); fall back to `--squash` with the source URL and SHA recorded in the commit message and a note
   in [`scripts/DESCRIPTIONS.md`](../../scripts/DESCRIPTIONS.md).
2. **One commit per catalogue change.** Merging the two-step ritual is the point; a catalogue edit and
   the code that consumes it must be reviewable together.
3. **Split the gates.** The description assertions move out of the pin verifier into `gate:catalogue`
   (content: schema, budget, routing, doctrine, staleness, descriptions, counts). Reproducibility stays
   with [`verify-roomodes-sync.mjs`](../../scripts/verify-roomodes-sync.mjs). `verify-submodule-pin.mjs`
   and its spec are deleted; a `verify:catalogue-integrity` check (manifest ↔ files bijection, computed
   counts, no orphan files) replaces it.
4. **Rename the abstraction.** Scripts stop taking a "submodule path": one exported constant
   (`MODES_CATALOGUE_PATH`) replaces `ROO_SUBMODULE_PATH`, and every consumer reads it.
5. **CI simplifies.** Both workflows drop submodule checkout. `code-qa.yml` runs `gate:catalogue`;
   packaging hooks (`prevsix`, `prebundle`, `prevscode:prepublish`) run it in place of the pin check.
6. **External consumption, if it ever becomes real, is an artefact — not a submodule.** A published
   `modes.yml` (already generated) plus a standalone repository is the correct answer then; nesting a
   second git inside the app repo is not.

## Alternatives rejected

| Alternative                                                        | Why rejected                                                                                                                                                       |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Keep the submodule unchanged**                                   | Retains 14 coupling points and a bespoke gate to detect drift, while providing a guarantee (immutable content at a commit) the superproject already gives for free |
| **Keep the submodule for marketplace publishing**                  | The marketplace ingests a **bundled YAML**, not a repository. No current or planned consumer clones the catalogue by git                                           |
| **Mirror: submodule plus vendored copy**                           | Two sources of truth is the exact failure already observed (`8cdf378b` vs `78a2010`), doubled                                                                      |
| **Split into a separate repository with a published artefact now** | Premature: no external consumer exists. Recorded as the correct future move if one appears                                                                         |

## Consequences

### Positive

- **One clone, one build, one review.** No `--recurse-submodules`, no SSH key requirement, no pin bump.
- **Drift becomes impossible**, not merely detected: there is no second SHA to disagree with.
- One fewer bespoke gate, and the remaining gates are decoupled by concern (content vs reproducibility).
- Catalogue changes get reviewed alongside the schema and gates that constrain them.

### Negative

- **+5.2 MB / 339 files** in the main repository, plus imported history.
- A catalogue fix can no longer be "released" without an extension release — true in practice, but it was
  previously _possible_ to imagine otherwise.
- Contributors lose the convenience of a standalone repository for catalogue-only work; they must branch
  the app repo.

### Neutral

- The remote repository stays archived/available for history and provenance; nothing is deleted upstream.
- `git subtree` is a plumbing tool; the resulting tree is ordinary files, so no contributor needs to
  learn it.

## Falsifier

Revisit if **a real consumer needs the catalogue by git** — a downstream fork tracking catalogue changes
independently, or a marketplace that ingests repositories rather than a bundled YAML. The response then is
**a published artefact and a standalone repository**, not a submodule re-nested inside the application
repository. A mere preference for separate history is not a falsifier; separation without a consumer is
cost without a beneficiary.

## Migration Strategy

1. **Freeze catalogue PRs**, then `git subtree add` at the current pin; verify the tree hashes match the
   submodule checkout byte-for-byte (`git diff --stat` between the two trees must be empty).
2. Split the description assertions out of the pin verifier into `gate:catalogue`; keep the existing
   spec cases, moved rather than rewritten.
3. Update the 14 coupling points: `sync-custom-modes.mjs`, `verify-roomodes-sync.mjs`,
   `generate-catalog.mjs`, `ensure_descriptions.py` / `add_descriptions.py`, `verify-docs-no-public-ip.mjs`,
   both workflows, and the `prevsix` / `prebundle` / `prevscode:prepublish` chains.
4. Delete `.gitmodules`, `git rm --cached custom-modes`, remove the `.git/config` entry, delete
   `verify-submodule-pin.mjs` and its spec.
5. Add `verify:catalogue-integrity`; wire it into `gate:sync` and the packaging hooks.
6. Correct every document that quotes a pin (including the [canonical-catalog ADR](adr-custom-modes-canonical-catalog.md),
   whose `8cdf378b` reference is already stale) and close the related DEBT item.

## See Also

- [Modes Target State](../modes-target-state.md) §12 Workstream P — the sequencing rationale.
- [Modes Architecture](../modes-architecture.md) §11.1 (gates), §12 Phase 3–4.
- [Canonical catalog ADR](adr-custom-modes-canonical-catalog.md) — the pipeline this preserves.
- [`scripts/verify-submodule-pin.mjs`](../../scripts/verify-submodule-pin.mjs) — the gate this retires.
