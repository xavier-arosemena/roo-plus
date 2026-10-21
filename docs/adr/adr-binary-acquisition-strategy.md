# ADR: Binary Acquisition Strategy for Third-Party Executables (Semble 2a · DCG 3a)

**Date**: 2026-10-21

**Status**: ✅ ACCEPTED · **Revised 2026-10-21** — the Semble decision was changed by the owner; see [§Revision](#revision-2026-10-21-semble-download-retained).

**Decision owners**: Roo+ maintainer (owner of the compliance remediation). Implementation: extension runtime + release pipeline.

## Context

Roo+ runs two executables it does not author:

- **Semble** — code search for the codebase index, upstream [`MinishLab/semble`](https://github.com/MinishLab/semble) (MIT). ~150 MB per platform.
- **DCG** (`destructive_command_guard`) — pre-command safety checks, upstream [`Dicklesworthstone/destructive_command_guard`](https://github.com/Dicklesworthstone/destructive_command_guard), licence **MIT with the OpenAI/Anthropic rider**. ~5 MB per platform, five platforms.

Both were acquired the same way: downloaded at first use from GitHub release assets, consent-gated, checksum-pinned. That model produced a mismatch between what the packaged artefact _is_ and what the extension _does_: the Marketplace listing and the VSIX describe neither the download nor the binary, while Visual Studio Marketplace Publisher Agreement §8(d) ("must not install or launch executable code … beyond what is identified in or may reasonably be expected from the Listing Information") and Terms of Use §4(v) (unexpected behaviour must be documented "at the top of both the package description and package README") both point at exactly that surface. See [`docs/compliance/marketplace-enforcement-review.md`](../compliance/marketplace-enforcement-review.md) findings **C1**, **C5**, **C7**, **C8**.

The DCG licence rider adds a second, sharper constraint: it withholds all rights from named parties and requires that _any distribution of the Software or any Derivative Works must include this rider provision unmodified_. A download-only design kept that obligation latent; a bundled design makes it live.

Constraints on any solution:

- The fork must stay close to upstream Zoo-Code (see [`adr-upstream-alignment-fork-strategy.md`](adr-upstream-alignment-fork-strategy.md)); this is a fork-specific layer, so it is not gated by the byte-identity check.
- The VSIX footprint is a gated quantity ([`scripts/verify-vsix-budget.mjs`](../../scripts/verify-vsix-budget.mjs)): 1,300 files / 100 `.js` files, no source maps, no duplicate asset trees.
- Open VSX is the only publish target (the Marketplace listing was removed by enforcement on 2026-10-20 — [`docs/runbooks/release-publishing.md`](../runbooks/release-publishing.md) §Status).
- Consent and workspace-trust semantics from Marketplace notice #305 (D2/D3-3A) must be preserved: the user still decides whether these components run, and nothing runs in an untrusted workspace.

### Options considered

**Semble**

1. **2a — detect and guide only.** Roo+ never acquires, installs or mirrors Semble; it detects an installation and points the user at `pipx install semble` (or `roo-plus.codebaseIndexSembleBinaryPath`).
2. **Keep runtime download** with improved disclosure (the status quo of the 3.88 line).
3. **Bundle Semble.** Rejected earlier for size and because the packaged launcher could not run without its ~130 MB runtime — see [`adr-semble-binary-download-only.md`](adr-semble-binary-download-only.md).

**DCG**

1. **3a — bundle the binaries in the VSIX and disclose it.** No runtime download.
2. Per-platform VSIX builds (`vsce --target`), one binary each.
3. Licence/notices/gate work only, with acquisition unchanged (a documented deferral).

## Decision

1. ~~**Semble = option 2a.**~~ **Revised 2026-10-21 — Semble keeps its runtime download (option 2).** Roo+ continues to acquire Semble at first use: consent-gated, version-pinned and SHA-256 verified, with the acquisition disclosed in the Listing Information, `README.md`, `PRIVACY.md` and [`THIRD-PARTY-NOTICES.md`](../../THIRD-PARTY-NOTICES.md) §2.1. Option 2a is **withdrawn**, not deferred. The acquisition prompt is shown to **new users only** (§Revision).
2. **DCG = option 3a.** DCG is **bundled** inside the VSIX (the five unmodified upstream release archives under `bin/dcg/`) and **disclosed**; there is **no runtime download path** for it. Execution keeps the existing consent/opt-in semantics.
3. **Bundled bytes are verified twice**: archive SHA-256 (equal to the published upstream checksum) and extracted-executable SHA-256 (pinned by Roo+), both before the binary is used.
4. **Attribution ships with the artefact**: `THIRD-PARTY-NOTICES.md` is packaged in the VSIX, reproduces the DCG rider verbatim, lists every bundled binary and every production JavaScript dependency by licence, and is enforced by `scripts/verify-third-party-notices.mjs`.

### Why the alternatives were rejected

- **Semble 2 (keep downloading)** — **chosen on 2026-10-21.** The residual §8(d)/§4(v) exposure is accepted deliberately: a ~150 MB external install (`pipx install semble`) is a hard enough requirement to push most users out of codebase indexing entirely, so the mitigation is disclosure plus explicit consent rather than removal of the feature. This is an owner risk decision, not an engineering conclusion — 2a remains the strictly safer option on compliance grounds.
- **Semble 3 (bundle)** remains impractical: ~140 MB per platform, ~552 MB for a universal VSIX, and the earlier bundled launcher was non-functional without its runtime.
- **DCG 2 (per-target VSIX)** would cut the per-user cost from ≈22.5 MB to ≈5 MB but multiplies release artefacts and version-announcement coupling across two publish workflows, and must be repeated for every future platform. Not rejected on merit — deferred as the documented fallback if the footprint becomes binding (see Consequences).
- **DCG 3 (defer bundling)** leaves the rider's distribution question open _and_ leaves the artefact dependent on a network fetch at first use, which is precisely the behaviour the enforcement review identified.

## Consequences

### Positive

- The packaged artefact is self-describing: what ships is what is declared, with attribution and licence text inside the VSIX.
- DCG works offline and in locked-down networks; no first-use failure mode, no mirror to keep alive.
- The rider's distribution condition is satisfied directly (verbatim reproduction, unmodified upstream bytes) instead of being argued as "probably not triggered".
- A tampered VSIX is detected twice (archive and executable hashes) before any execution.
- Attribution cannot silently drift: a new production dependency, a new shipped binary include, a changed DCG pin or a stale `src/` copy fails the gate.

### Negative

- **+22.5 MB** (≈17.5 MB → ≈40 MB VSIX) paid by every user, for five platform binaries of which one is used. If this becomes binding, the fallback is per-platform builds (DCG option 2), not a return to downloading.
- Five third-party archives are committed to the repository, so clones grow by the same amount.
- The DCG licence rider is now an active obligation on every release; the notices file is a release artefact, not documentation.
- **Semble is still acquired at runtime, by design.** The download path in [`src/services/code-index/semble/provider.ts`](../../src/services/code-index/semble/provider.ts:146) → [`semble-downloader.ts`](../../src/services/code-index/semble/semble-downloader.ts:564) stays reachable. Consequences to own explicitly: the packaged artefact does not contain Semble, the extension performs a ~150 MB first-use acquisition after consent, and **no outward-facing text may claim the product installs nothing**. The ~2,000-line downloader spec, the version↔checksum coupling gate and [`docs/SEMBLE-RELEASE-GOVERNANCE.md`](../SEMBLE-RELEASE-GOVERNANCE.md) all remain load-bearing rather than retirable.

### Neutral

- Version↔checksum coupling keeps its meaning for both components, extended with `binarySha256` for DCG.
- Consent prompts and the `binary@version` storage key are unchanged; for DCG the prompt now governs **execution** of an already-distributed component rather than a download.
- `src/bin/dcg/` becomes part of the review surface: a new archive requires a version bump, both hashes, and a notices update in the same commit.

## Revision (2026-10-21): Semble download retained

After the implementation review, the owner withdrew Semble option 2a and kept option 2 (runtime download). DCG stays at 3a (bundled) — that half of the ADR is unchanged and implemented.

**What changes.** Semble continues to be acquired at first use and continues to be absent from the VSIX. The compliance position is therefore _disclosed acquisition_, not _no acquisition_. Everything in the negative consequences above about the §8(d)/§4(v) surface applies to Semble for as long as this stands.

**Prompt scoping — "new users only".** As decided:

| User state                                                                          | Behaviour                                                                                                                |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Semble detected (bundled path, `PATH`, or `roo-plus.codebaseIndexSembleBinaryPath`) | No prompt; the component is used or the setting is honoured                                                              |
| First time the feature is enabled, nothing detected, no persisted decision          | **Prompt once** — names the download, the source (`Audare-est-Facere/sembleexec`), the version, the size and the SHA-256 |
| User previously consented                                                           | No prompt, including across version bumps (see the open question below)                                                  |
| User previously declined                                                            | No prompt; the user can retry explicitly from settings/a command                                                         |
| Workspace untrusted                                                                 | No prompt, no download (existing trust semantics)                                                                        |

**Decided 2026-10-21: once per user, ever.** The decision is stored **component-scoped** (`semble`), not version-scoped (`semble@<version>`), so a version bump never re-prompts. Migration: an existing `semble@v0.5.2` decision is read once and rewritten under the component key; users who already consented are not prompted again, and users who declined stay declined until they retry explicitly from settings. This is a silent behaviour change for anyone who relied on per-version re-prompting, so it must appear in the release notes for the version that ships it.

**Documented alternative, not taken — per-platform VSIX.** For DCG, building one VSIX per platform (`vsce --target`, ~21.7 MB each instead of one 41 MB universal artefact) would cut each user's download to what they need, at the cost of five artefacts per release across two publish destinations. Recorded here so the option is not rediscovered from scratch; revisit only if the 41 MB footprint becomes a user complaint or a distribution constraint.

## See Also

- [`docs/DCG-RELEASE-GOVERNANCE.md`](../DCG-RELEASE-GOVERNANCE.md) — bundled distribution, platform matrix, size impact, bump procedure
- [`docs/SEMBLE-RELEASE-GOVERNANCE.md`](../SEMBLE-RELEASE-GOVERNANCE.md) — Semble provenance while 2a is implemented
- [`docs/compliance/marketplace-enforcement-review.md`](../compliance/marketplace-enforcement-review.md) — C1, C5, C7, C8 and the C8 remediation this ADR executes
- [`adr-semble-binary-download-only.md`](adr-semble-binary-download-only.md) — the earlier download-only decision this ADR narrows for Semble and supersedes for DCG
- [`THIRD-PARTY-NOTICES.md`](../../THIRD-PARTY-NOTICES.md) — the shipped attribution artefact
- [`DEBT.md`](../../DEBT.md) — open items: Semble download removal, notices/audit gate operation, onboarding feature
