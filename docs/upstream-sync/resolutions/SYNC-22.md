# SYNC-22 — code-index embedder-validation re-alignment — resolution record

- batch: SYNC-22
- base: d54b62e7f5
- head: cf04b8f026
- conflicted_files: src/eslint-suppressions.json, src/services/code-index/__tests__/code-index-scan-executor.spec.ts, src/services/code-index/__tests__/manager.spec.ts, src/services/code-index/__tests__/orchestrator.spec.ts, src/services/code-index/code-index-scan-executor.ts, src/services/code-index/manager.ts, src/services/code-index/orchestrator.ts

> **Scope.** One row, hand-ported (never cherry-picked): upstream `3859e5dd8` (#1879,
> `C-REIMPLEMENT`, P1, Δ7). `base`/`head` are pinned to the batch's own pick commit
> (`d54b62e7f5...cf04b8f026`), so the range is exactly the seven files below — the
> resolution record commit itself is outside the range, exactly as `SYNC-13`/`SYNC-18`
> pinned theirs. No git conflict was produced (a `C-REIMPLEMENT` is never picked); the
> "conflicted" file is `src/services/code-index/orchestrator.ts`, a `CORE_FILES` entry
> whose gate alignment broke when `upstream/main` advanced, plus the two production
> files and three specs the commit actually changes. The register row is **not** flipped
> to `☑`: R9 requires the fork SHA on `master`, and this run is commit-only.

### src/eslint-suppressions.json [shape: modify/modify]

- upstream: 3859e5dd8 — lowers the `@typescript-eslint/no-explicit-any` ceilings for the two touched specs (manager.spec.ts 87→84, orchestrator.spec.ts 25→23) now that the ported tests drop `any` usages.
- fork: 07509d7c2 — the fork's suppression ratchet, which carries the same rule at the fork's own counts.
- fork_locus: none
- resolution: upstream-adapted
- rationale: The fork's ceilings drop by the same shape (manager.spec.ts 89→86, orchestrator.spec.ts 25→23); both counts only decrease, so the R6 ratchet is honoured and no unrelated entry is touched.
- dropped: none
- evidence: gates: lint, gate:sync
- divergence: none

### src/services/code-index/__tests__/code-index-scan-executor.spec.ts [shape: modify/modify]

- upstream: 3859e5dd8 — rewrites the incremental tolerance case into an `AggregateError` assertion (instance, deduped message, `errors` identity).
- fork: f820e27e3 — the fork's scan-executor spec, which carried the old "reported batch errors do not prevent completion" case.
- fork_locus: none
- resolution: upstream-wins
- rationale: The single case needs no fork adaptation and is the fix-equivalence witness for the executor change, so upstream's implementation is taken verbatim.
- dropped: none
- evidence: src/services/code-index/__tests__/code-index-scan-executor.spec.ts — "rejects incremental batch errors with 0|2 indexed blocks"; gates: gate:sync
- divergence: none

### src/services/code-index/__tests__/manager.spec.ts [shape: modify/modify]

- upstream: 3859e5dd8 — replaces the three startup-validation tests with one assertion that `validateEmbedder` is *not* called, and inverts the recovery-path assertion the same way.
- fork: e34d93e2c — the fork's manager spec, which asserted the preflight call in all three places.
- fork_locus: none
- resolution: both-re-expressed
- rationale: The inverted assertions are the fix-equivalence witness for the manager change; the fork's larger spec keeps every other case, so only the validation trio was replaced.
- dropped: none
- evidence: src/services/code-index/__tests__/manager.spec.ts — "should create indexing services without a startup embedder validation request"; gates: gate:sync
- divergence: none

### src/services/code-index/__tests__/orchestrator.spec.ts [shape: modify/modify]

- upstream: 3859e5dd8 — rewrites the cleanup-gating cases to the `clearIndexOnError` semantics, adds the partial-full-scan and failed-retry cases, corrects the i18n mock path, and adds a telemetry-payload privacy case.
- fork: 05f8a3e32 — the fork's orchestrator spec, which asserted cleanup gated on "the Qdrant connection succeeded".
- fork_locus: none
- resolution: both-re-expressed
- rationale: The behaviour assertions are re-expressed on the fork's own spec layout; upstream's telemetry-payload case is inapplicable because the fork has no `captureEvent` call to assert on, and that omission is recorded here instead of being dropped silently.
- dropped: none
- evidence: src/services/code-index/__tests__/orchestrator.spec.ts — the gating/retry cases fail before the port and pass after (9 fail → 70 pass); gates: gate:sync
- divergence: none

### src/services/code-index/code-index-scan-executor.ts [shape: modify/modify]

- upstream: 3859e5dd8 — an incremental scan that collected `batchErrors` now throws a deduped `AggregateError` instead of reporting completion, so a partially failed incremental run cannot mark an existing index complete.
- fork: f820e27e3 — the fork's extracted scan executor, which preserved upstream's earlier tolerant incremental policy.
- fork_locus: none
- resolution: upstream-wins
- rationale: The hunk is pure behaviour with no fork-specific structure or telemetry in it, so upstream's implementation is adopted unchanged and the file stays byte-identical to `upstream/main`.
- dropped: none
- evidence: src/services/code-index/__tests__/code-index-scan-executor.spec.ts — fails before, passes after; gates: gate:sync
- divergence: none

### src/services/code-index/manager.ts [shape: modify/modify]

- upstream: 3859e5dd8 — deletes the automatic startup embedder preflight (`validateEmbedder`) from `_recreateServices`, so a failed validation no longer sets `Error` and blocks service creation.
- fork: e34d93e2c — the fork's manager carried the same preflight block; the file is fork-hardened and intentionally **not** a `CORE_FILES` entry.
- fork_locus: none
- resolution: upstream-wins
- rationale: Removing the preflight is the commit's headline intent; the surrounding fork-only `_recreateServices` structure is untouched and `validateEmbedder` stays public on the factory for explicit callers.
- dropped: none
- evidence: src/services/code-index/__tests__/manager.spec.ts — fails before, passes after; gates: gate:sync
- divergence: none

### src/services/code-index/orchestrator.ts [shape: modify/modify]

- upstream: 3859e5dd8 — replaces the `indexingStarted` cleanup gate with `clearIndexOnError = collectionCreated`, so error cleanup (clear collection + clear cache) runs only when *this* run created the collection and an existing index survives a failed retry; also reworks the telemetry error payloads to exclude private details.
- fork: e34d93e2c — the fork's aligned orchestrator carried the same `indexingStarted` gate from the upstream import, with the v3.88.0 telemetry purge already applied.
- fork_locus: none
- resolution: both-re-expressed
- rationale: Upstream's retry-safety semantics are re-expressed verbatim in the fork's telemetry-purged file — `stripForkTelemetry(fork) === stripForkTelemetry(upstream/main)` holds at `842b37e76`, so the `CORE_FILE` stays gate-aligned while the fork keeps zero `@roo-code/telemetry` imports and no allow-list entry is added.
- dropped: none
- evidence: src/services/code-index/__tests__/orchestrator.spec.ts — the gating/retry cases fail before, pass after; gates: upstream-code-index-alignment, gate:sync
- divergence: divergent-forever:3859e5dd8 — the fork's v3.88.0 telemetry purge (allowlist-ledger `fork-feature` row for this file) removes upstream's `captureEvent` payload hardening; no non-telemetry divergence remains.
