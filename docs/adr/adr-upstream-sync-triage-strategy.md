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

The backlog figures below are **one observation** recorded on 2026-09-16 in a
shallow clone — the shape of the problem, not a repeatable measurement:

> **Superseded by plan §2 / §10.1 — 2026-09-28 (H-05, lens D / F-D-4).** The
> original text claimed this "establishes the size of the problem rather than
> estimating it". It does not: the counts are a single observation from a grafted
> clone. Reproducible today: the overlap buckets (25 · 33 · 20 · 24) from the
> register alone, and the 4206-line upstream handler from `upstream/main`'s tree
> (at the tip, not the baseline). **Not** reproducible here — `git merge-base`
> returns nothing and the fork-only count reads a saturated value — are the
> fork-only 180 and the 977 / 689 / 272 file counts; these need
> `git fetch --unshallow`. The register header records the current pending count.

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
3. **Telemetry purge and version-line inversion.** The fork deleted telemetry:
   **0 telemetry transport call sites** (verified by
   `git grep -Il "captureEvent(" -- "src/**"` → 0; not yet enforced by a gate —
   H-10's `verify-no-telemetry.mjs` is proposed), while the token "telemetry"
   still lingers in inert scaffolding in a minority of tracked source files.
   Upstream continues to add telemetry UI (`1ad8f528d`), and the fork's version
   line (`3.88.3`, package `roo-plus`) is _ahead_ of upstream's (`3.82.1`,
   package `zoo-code`), so upstream release commits would downgrade the fork and
   rename its package.

    > **Superseded by plan §2 (E11d/E12) / §10.1 — 2026-09-28 (H-05, lens D).**
    > "0 references in `src/` and `webview-ui/src/`" → "0 `captureEvent(` call
    > sites"; the "upstream has **131 files**" figure is **withdrawn** — it has no
    > recorded scope or SHA and is not reproducible (a token grep at the current
    > tip reads a different number). Only the call-site invariant is
    > machine-checkable today, and it is not yet gated.

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

- **Phase 1 — Clear the cheap, high-value backlog.** Execute the rows that are
  actually pickable — the `quick-win` `SYNC-1` safety/abort and `SYNC-5`
  provider-correctness rows, and the dependency-blocked `SYNC-13` chain (plus any
  ready rows folded in by later refreshes, `SYNC-14`/`SYNC-15`). These are
  low-risk and yield the security/performance value that motivates tracking
  upstream at all.

    > **Superseded by plan §2 (E10) / §11 — 2026-09-28 (H-05, L4).** The original
    > text named "the `A-CLEAN` slice of `SYNC-3`/`SYNC-4`". Both batches contain
    > **zero** `A-CLEAN` rows (`SYNC-3`: 4 `C-REIMPLEMENT` + 1 `B-CAREFUL`;
    > `SYNC-4`: 4 `C-REIMPLEMENT` + 2 `B-CAREFUL`). The immediately-ready rows live
    > in `SYNC-13`, with later refreshes appended as `SYNC-14`/`SYNC-15`.

- **Phase 2 — Re-implementation program for structural divergences.**
  Systematically port `C-REIMPLEMENT` intents (handler/protocol-adjacent fixes)
  by hand into the decomposed handlers with tests, and treat code-index
  refactors (`216450810`) as enablers that reduce future conflict mass.
- **Phase 3 — Steady state.** Each upstream advance is folded into the register by
  the documented refresh procedure; batches are drained **predecessor-first** — a
  row is picked only after its `Blocked-by` prerequisite has landed (the `SYNC-13`
  chains) — and then by priority, **never newest-first**; the `E-SKIP` set is
  re-evaluated only when the fork adopts the corresponding automation.

    > **Superseded by plan §11 — 2026-09-28 (H-05).** The original text said
    > "drained newest-first by priority", which contradicts the register's own
    > execution order (prerequisite-first: `500152b78` before the rest of
    > `SYNC-13`). The rule is now **predecessor-first within a theme, then by
    > priority**.

## Consequences

### Positive

- The backlog becomes legible: the register shows the fork is not "102 commits
  behind" but a small **derived ready set** of immediately-pickable rows, a
  re-implementation program, and a large local/out-of-scope residue that the fork
  records but never counts as "pending" (see the convergence clause below).

    > **Superseded by plan §2 (D-24/D-25) / §11 — 2026-09-28 (H-05).** The original
    > "~15 commits of immediate `A-CLEAN` quick wins" was optimistic: 15 `A-CLEAN`
    > rows carry P0–P2, but most are already merged, blocked on an unsynced
    > prerequisite, or carry Δ > 0. `--verify` now reports the **derived ready set**
    > (`A-CLEAN` ∧ Δ 0 ∧ `Blocked-by` = ∅ ∧ open) — cite that predicate, not a
    > fixed count. Likewise "~39 locally-owned or permanently out of scope" is the
    > `D-LOCAL` + `E-SKIP` classes, with the single `X-REJECT` row additional; the
    > recorded counts live in the register's Summary.

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

## Amendment — 2026-09-28: Convergence condition and tracking scope (H-21)

A register that only ever grows cannot show whether the strategy is working. This
amendment fixes what is counted, states when the queue converges, and puts a
bounded trigger on the decision when it does not.

- **Convergence condition.** The backlog converges iff **drain ≥ arrival**
  (`D ≥ R`). Drain = rows closed per cycle on the fork ref; arrival = upstream
  commits entering the register per cycle. Both are reported, neither is asserted.
- **Tracked backlog (counted).** `P0` and `P1` rows plus the **divergence
  program** — the `C-REIMPLEMENT` work (chiefly `SYNC-7`) that lowers per-row
  cost. This is the number the register headlines, and it can go **down**.
- **Recorded but not counted.** `P3`/`P4` rows, `D-LOCAL`, `E-SKIP`, and the
  single `X-REJECT` row are recorded for provenance but are **never** counted as
  "pending"; they carry no arrival pressure the fork can act on.
- **Two reported series.** The register reports (1) **tracked items absorbed**
  and (2) **divergence stock** (`C-REIMPLEMENT` open, plus the rebrand/conflict
  scope that forces those ports) where it is legible — the register's manual
  `## Summary`/progress area, never by mutating the machine-parsed `## Baseline`
  table.
- **Forced-decision rule** (the observable-state form of plan H-16). If **any** of
  the following holds, the next cycle MUST record a decision — fund the divergence
  program to completion, declare a merge mode with a written resolution policy
  (runbook R4), or add capacity — instead of continuing: (i) the derived ready set
  is **< 5** rows; (ii) the oldest unresolved `P0` row exceeds **30 days**; or
  (iii) **two consecutive cycles close zero rows**.
- **Quarterly tracking-scope review.** Once a quarter, re-confirm the tracked
  scope and move permanently-unreachable rows (`✖`, and the `D-LOCAL` rows the
  fork will never take) to an appendix, so the headline stays falsifiable.

> **New in** plan §10.3 (H-21, from lens G F-G-2/F-G-7) — 2026-09-28 (WS-7 /
> HD-11). The convergence condition was previously implicit.

## See Also

- Register: [`docs/upstream-sync/pending-upstream-commits.md`](../upstream-sync/pending-upstream-commits.md)
- Operating manual + refresh procedure: [`docs/upstream-sync/README.md`](../upstream-sync/README.md)
- [`adr-upstream-alignment-fork-strategy.md`](adr-upstream-alignment-fork-strategy.md) — core-alignment diff-gate
- [`adr-webview-handler-decomposition.md`](adr-webview-handler-decomposition.md) — source of the structural divergence
- [`adr-typed-message-protocol.md`](adr-typed-message-protocol.md) — protocol gate
- [`adr-release-versioning-policy.md`](adr-release-versioning-policy.md) — why upstream release commits are `D-LOCAL`
- [`adr-cloud-removal.md`](adr-cloud-removal.md) — resolved upstream cloud-lifecycle commits
