# ADR: Upstream Sync Triage & Batched Cherry-Pick Strategy

**Date**: 2026-09-16

**Status**: ✅ ACCEPTED

**Decision owners**: Roo+ maintainers

## Context

Roo+ is a fork of `Zoo-Code-Org/Zoo-Code`. Upstream ships faster than the fork can
absorb, and the previous sync mechanism — whole-history merges
(`Merge remote-tracking branch 'upstream/main'`, e.g. `47d864776`, `ce5f37b2e`,
`b0b4ce3c3`, `9bd824eab`) — produced large, opaque conflict sets that had to be
repaired after the fact (`e86706d85` "repair upstream alignment regressions",
`189f7b640` / `096bbfea4` "align … with upstream/main").

A measurement of the current backlog (2026-09-16) establishes the size of the
problem rather than estimating it:

| Metric                                       | Value                                                      |
| -------------------------------------------- | ---------------------------------------------------------- |
| Merge base                                   | `252c69b5` (2026-08-20)                                    |
| Upstream commits pending                     | **102**                                                    |
| Fork-only commits                            | 180                                                        |
| Files changed by fork since merge base       | 977                                                        |
| Files changed by upstream since merge base   | 689                                                        |
| **Files changed by both (conflict surface)** | **272**                                                    |
| Commits changed by both, by overlap          | 25 have 0 overlap · 33 have 1–2 · 20 have 3–5 · 24 have >5 |

Three _structural_ divergences (not merely textual conflicts) make a repeat of
the big-bang merge both expensive and risky:

1. **Handler decomposition.** The fork's
   [`webviewMessageHandler.ts`](../../src/core/webview/webviewMessageHandler.ts:1)
   is **131 lines** (a thin router) with per-domain modules under
   [`src/core/webview/handlers/`](../../src/core/webview/handlers/chat.ts:1);
   upstream's equivalent file is **4206 lines** (see
   [`adr-webview-handler-decomposition.md`](adr-webview-handler-decomposition.md)).
   Upstream edits to that file cannot be cherry-picked — only re-implemented.
2. **Typed message protocol.** The fork migrated webview↔extension messaging to a
   zod registry ([`adr-typed-message-protocol.md`](adr-typed-message-protocol.md))
   and enforces it via [`scripts/verify-message-schemas.mjs`](../../scripts/verify-message-schemas.mjs:1);
   upstream still passes untyped messages. Protocol-level changes need re-derivation.
3. **Telemetry purge and version-line inversion.** The fork deleted telemetry
   (0 references in `src/` and `webview-ui/src/`; upstream has **131 files**
   referencing it), while upstream continues to add telemetry UI
   (`1ad8f528d`), and the fork's version line (`3.88.3`, package `roo-plus`) is
   _ahead_ of upstream's (`3.82.1`, package `zoo-code`). Upstream release commits
   would therefore downgrade the fork and rename its package.

Additionally, a large share of upstream commits exist to operate upstream's
org-scale automation (CodeRabbit, merge queue, mutation-testing gates, coverage
caching, PR labelling). The fork runs different CI and cannot consume them.

The fork already owns partial machinery for a disciplined sync — the code-index
alignment diff-gate
([`scripts/verify-upstream-code-index-alignment.mjs`](../../scripts/verify-upstream-code-index-alignment.mjs:3),
with `branding` / `fork-config` / `fork-telemetry` allow-list modes),
[`scripts/full-rebrand.sh`](../../scripts/full-rebrand.sh:1), and the message-schema
gate. What was missing was a **triage and tracking layer**: a categorised,
prioritised register that converts "102 behind" into small, independently
shippable batches, and a repeatable procedure that folds _new_ upstream commits
into that register.

### Alternatives considered and rejected

- **Continue whole-history merges.** Rejected: reproduces the 272-file conflict
  set in one operation, mixes unrelated intent, and is un-reviewable; conflicts
  in decomposed handlers and the typed protocol cannot be resolved safely at
  that scale.
- **Continuous rebase of the fork onto upstream.** Rejected: the fork's 180
  commits include intentional, permanent divergences (cloud removal, telemetry
  purge, branding, canonical modes catalog); rebasing would force those decisions
  to be re-litigated on every upstream advance.
- **Stop tracking upstream.** Rejected: forgoes upstream security and
  performance fixes, which is the opposite of the fork's goal.
- **Wholesale vendor copy of upstream directories.** Rejected previously in
  [`adr-upstream-alignment-fork-strategy.md`](adr-upstream-alignment-fork-strategy.md)
  because it discards the hardened Semble layer and the fork installer.

## Decision

Adopt a **triage-first, batched cherry-pick strategy** with a
machine-refreshable pending register.

1. **Every upstream commit receives exactly one class** in the register
   ([`docs/upstream-sync/pending-upstream-commits.md`](../upstream-sync/pending-upstream-commits.md)):

    | Class           | Meaning                                                                                                    | Mechanism                                                |
    | --------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
    | `A-CLEAN`       | No overlap with any fork-touched file                                                                      | Direct `git cherry-pick`                                 |
    | `B-CAREFUL`     | Small overlap (typically ≤ 3 fork-touched files)                                                           | Cherry-pick + rebrand + gates                            |
    | `C-REIMPLEMENT` | Hits a structural divergence (decomposed handlers, typed protocol, purged telemetry, i18n, eslint ratchet) | Port intent by hand, with tests — **do not** cherry-pick |
    | `D-LOCAL`       | Fork already owns the concern (versioning, announcements, branding, deps, node runtime)                    | Re-implement locally; **never** take the upstream commit |
    | `E-SKIP`        | Upstream-org automation the fork does not run                                                              | Permanently out of scope                                 |
    | `X-REJECT`      | Directly contradicts a fork decision                                                                       | Rejected, with rationale recorded                        |

2. **Every commit receives exactly one priority**: `P0` security/data-loss,
   `P1` correctness in core flows, `P2` feature/model support, `P3` hygiene/tests,
   `P4` not applicable. `quick-win` is a cross-cutting flag for `A-CLEAN` commits
   with a small diff and `P0`–`P2` value — these are the "sync today" set.

3. **Batches are the unit of work.** A batch (e.g. `SYNC-3` task-history
   durability) is the smallest group that is independently reviewable,
   independently shippable, and internally coherent (one theme, one set of tests).
   One branch per batch; never a mixed-intent branch.

4. **The register is the single source of truth** for what remains. It records the
   baseline merge base, per-commit class/priority/batch/status, and is
   regenerated — not hand-edited from scratch — when upstream advances. Refresh and
   verification are automated by
   [`scripts/upstream-sync-triage.mjs`](../../scripts/upstream-sync-triage.mjs:1)
   (`--refresh`, `--verify`), which now exists; **classification remains a human
   decision** — the tool proposes classes for new commits only and never
   reclassifies or deletes an existing row.

5. **Merge remains an escape hatch, not the default.** A whole-history merge is
   permitted only for `E-SKIP`-heavy ranges or as a deliberate catch-up once the
   `C-REIMPLEMENT` structural program (below) has reduced the divergence.

6. **Mandatory gate chain after every batch** — no batch is merged without
   passing: message-schema gate (`verify-message-schemas.mjs`), code-index
   alignment gate (`verify-upstream-code-index-alignment.mjs`),
   announcement-version gate (`verify-announcement-version.mjs`), submodule/roomodes
   pins (`verify-submodule-pin.mjs`, `verify-roomodes-sync.mjs`), locale-readme gate
   (`verify-locale-readmes.mjs`), plus the relevant Vitest suites for touched
   packages. Rationale: these gates encode exactly the invariants the fork
   refuses to trade away, so they are the objective definition of "sync did not
   regress the fork".

## Migration Strategy

- **Phase 1 — Clear the cheap, high-value backlog.** Execute the `quick-win`
  batches (`SYNC-1` safety/abort, `SYNC-5` provider correctness) and the
  `A-CLEAN` slice of `SYNC-3`/`SYNC-4`. These are low-risk and yield the
  security/performance value that motivates tracking upstream at all.
- **Phase 2 — Re-implementation program for structural divergences.**
  Systematically port `C-REIMPLEMENT` intents (handler/protocol-adjacent fixes)
  by hand into the decomposed handlers with tests, and treat code-index
  refactors (`216450810`) as enablers that reduce future conflict mass.
- **Phase 3 — Steady state.** Each upstream advance is folded into the register by
  the documented refresh procedure; batches are drained newest-first by priority;
  the `E-SKIP` set is re-evaluated only when the fork adopts the corresponding
  automation.

## Consequences

### Positive

- The backlog becomes legible: the register shows the fork is not "102 commits
  behind" but ~15 commits of immediate `A-CLEAN` quick wins, ~19 requiring
  re-implementation, and ~39 that are either locally-owned or permanently
  out of scope.
- Batches are reviewable in isolation, so a bad sync can be reverted per theme
  rather than unpicking a 272-file merge.
- The refresh procedure makes upstream advances a routine bookkeeping step
  instead of an event.

### Negative

- Triage has an ongoing cost: every new upstream commit needs classification, and
  the register must be kept honest or it becomes fiction.
- `C-REIMPLEMENT` work is more expensive than a merge _per commit_ — the strategy
  trades total merge pain for deliberate, bounded engineering effort.
- Class assignment needs judgement; a mis-classified `A-CLEAN` commit that turns
  out to be structural will fail its gates, which is the intended detection but
  costs a cycle.

### Neutral

- No runtime behaviour change; this is a process and documentation decision.
- The `E-SKIP` classification is only valid while the fork does not adopt
  CodeRabbit/merge-queue/mutation-testing automation.
- The register duplicates information derivable from git; it is a _decision_
  record, deliberately not auto-derivable from `git log` alone.

## Amendment — 2026-09-16: `Δ` is fork-side only

The first real batch exposed a gap in the classifier above. `Δ` (a commit's overlap with files
the fork changed) is blind to **upstream precedence**: six rows classed `A-CLEAN` on `Δ = 0`
turned out to be deltas on upstream commits the fork had not synced — `500152b78` is a git
descendant of `5e8fcc846` — so they conflicted against an _empty_ fork side. Those rows moved to
a prerequisite batch (`SYNC-13`) that lands the predecessor first, and the empty-fork-side test
is now part of the classifier and the runbook's stop conditions.

Consequence for the taxonomy: `A-CLEAN` requires **both** `Δ = 0` **and** the absence of an
unsynced upstream predecessor. Follow-up work: teach `scripts/upstream-sync-triage.mjs` to detect
prerequisites automatically rather than leaving it to a manual check.

## See Also

- Register: [`docs/upstream-sync/pending-upstream-commits.md`](../upstream-sync/pending-upstream-commits.md)
- Operating manual + refresh procedure: [`docs/upstream-sync/README.md`](../upstream-sync/README.md)
- [`adr-upstream-alignment-fork-strategy.md`](adr-upstream-alignment-fork-strategy.md) — core-alignment diff-gate
- [`adr-webview-handler-decomposition.md`](adr-webview-handler-decomposition.md) — source of the structural divergence
- [`adr-typed-message-protocol.md`](adr-typed-message-protocol.md) — protocol gate
- [`adr-release-versioning-policy.md`](adr-release-versioning-policy.md) — why upstream release commits are `D-LOCAL`
- [`adr-cloud-removal.md`](adr-cloud-removal.md) — resolved upstream cloud-lifecycle commits
