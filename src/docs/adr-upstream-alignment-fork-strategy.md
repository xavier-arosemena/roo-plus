# ADR: Upstream-Alignment Fork Strategy (Keep Core Aligned, Harden Only Fork-Specific Layers)

**Date**: 2026-08-17

**Status**: ✅ ACCEPTED

**Decision owners**: Roo+ maintainers

## Context

Roo+ is a fork of `Zoo-Code-Org/Zoo-Code`. A fork faces a structural choice:
diverge freely and pay the cost of painful upstream merges, or track upstream
closely and pay the cost of constrained local changes. The code-index & Semble
architecture review ([`plans/architecture-review-code-index-semble.md`](../../plans/architecture-review-code-index-semble.md))
quantified the situation for the largest shared subsystem: the Qdrant
code-index core was **byte-identical** to `upstream/main` while the Semble
integration layer diverged heavily (the bulk of the fork's 3,436 inserted
lines). A wholesale upstream copy was rejected — it would discard the hardened
Semble layer and the fork's own installer.

The maintainable strategy therefore needs to (1) keep the upstream core aligned
so future upstream improvements cherry-pick cleanly, (2) allow targeted fork
hardening without fighting the diff-gate, and (3) make packaged artifacts
hermetic so a build never silently embeds stale fork data.

## Decision

Adopt an **upstream-alignment fork strategy**:

1. **Keep the upstream core byte-identical** to `upstream/main` and enforce it
   in CI with a diff-gate — [`scripts/verify-upstream-code-index-alignment.mjs`](../../scripts/verify-upstream-code-index-alignment.mjs:3) —
   which compares each gated core file against upstream and fails on drift
   beyond the allow-list.
2. **Allow-list only two kinds of divergence**: _branding_ (normalized
   `Roo-Plus ↔ Zoo-Code` token differences in `bedrock.ts` / `openrouter.ts` /
   `qdrant-client.ts`) and _fork-config_ (the `sembleBinaryPath` field required
   by the intentionally-hardened [`config-manager.ts`](../../src/services/code-index/config-manager.ts:1)).
   Everything else in the core must match upstream.
3. **Do NOT gate fork-specific layers** (Semble provider/downloader,
   `config-manager.ts`) — these are where the fork deliberately diverges and
   hardening lives.
4. **Keep packaged artifacts hermetic** via the `custom-modes` submodule pin
   (`4ee95d2`, see [`adr-custom-modes-canonical-catalog.md`](adr-custom-modes-canonical-catalog.md))
   and the Semble version↔checksum coupling gate
   ([`docs/SEMBLE-RELEASE-GOVERNANCE.md`](../../docs/SEMBLE-RELEASE-GOVERNANCE.md)).

The gate is network-safe by design: it uses the local `upstream/main` ref when
present, fetches when missing, and **skips** (exit 0) when upstream is
unreachable unless `--strict` is passed — so an infrastructure/network issue
never blocks CI.

## Consequences

### Positive

- Upstream code-index fixes land as clean cherry-picks; drift is caught at PR
  time with the offending file listed, not discovered at merge time.
- Fork hardening (Semble, config) is explicitly out of scope for the gate, so
  the fork's differentiators evolve freely.
- Hermetic packaging (submodule pin + checksum coupling) means a release is
  reproducible and can never silently embed stale fork data.

### Negative

- Fork changes to gated core files must go through upstream first (or be
  allow-listed) — a real constraint on local innovation inside the core.
- The gate depends on upstream availability; the skip-on-unreachable default
  means a fully-offline CI could silently skip alignment checks unless
  `--strict` is used in release-validation jobs.
- Branding normalization is a token-based approximation; a rename that isn't
  in the allow-list fails until the normalizer is extended.

### Neutral

- CI-only enforcement; no runtime behavior change.
- The same "track upstream, harden selectively" posture can be extended to
  other subsystems (the locale README gate
  [`scripts/verify-locale-readmes.mjs`](../../scripts/verify-locale-readmes.mjs:1)
  is an existing example of upstream-marker policing).

## See Also

- [`plans/architecture-review-code-index-semble.md`](../../plans/architecture-review-code-index-semble.md) — the review that motivated the strategy
- [`scripts/verify-upstream-code-index-alignment.mjs`](../../scripts/verify-upstream-code-index-alignment.mjs:3)
- [`docs/SEMBLE-RELEASE-GOVERNANCE.md`](../../docs/SEMBLE-RELEASE-GOVERNANCE.md) — Semble release policy (immutable tags, version↔checksum coupling)
- [`adr-custom-modes-canonical-catalog.md`](adr-custom-modes-canonical-catalog.md) — submodule-pinned hermetic catalog
