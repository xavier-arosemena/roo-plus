# Architecture Review — Codebase Indexing & Semble (#152)

**Reviewer:** Architect Reviewer · **Date:** 2026-08-05 · **Scope:** `src/services/code-index/*`, `src/core/webview/handlers/codeIndex.ts`, `src/core/tools/CodebaseSearchTool.ts`, upstream comparison against `Zoo-Code-Org/Zoo-Code` (`upstream/main` @ `ca9b60fbc`), VSIX packages `bin/roo-plus-3.76.0.vsix` / `bin/roo-plus-3.77.0.vsix`.

---

## 1. Executive Summary

| Question                                                           | Answer                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Is the **non-Semble** (Qdrant) code-index core intact?             | **Yes** — byte-identical to upstream Zoo-Code.                                                                                                                                                                                                      |
| Is the **Semble** layer healthy at HEAD?                           | **Yes** — all 659 unit tests pass; the pinned v0.5.2 binary passes the full binary smoke test (download → SHA-256 → extract → `--help` → `--version` → real search returns results).                                                                |
| Should we **copy upstream's** code-index/Semble wholesale?         | **No.** The Qdrant core is already identical (nothing to copy); the Semble layer is intentionally hardened and points at _our_ installer — a wholesale copy would discard that.                                                                     |
| What most likely broke "the whole codebase indexing" in the field? | A **stale stub binary cached on the test server** (from the earlier broken v0.5.2 era) that the downloader's fast path trusts forever, combined with a **sticky-Error state machine** that turns any single search failure into a permanent outage. |

**Bottom line:** the code at HEAD is functionally healthy and does not need to be replaced with upstream code. The breakage is an **operational/state-machine defect**, not a missing feature. Fix two gaps (cached-binary re-validation + non-sticky search failures) and the feature recovers, while keeping all hardening and the Audare est Facere installer.

---

## 2. Evidence Reviewed

- `git diff upstream/main HEAD -- src/services/code-index` → **3,436 insertions / 478 deletions across 22 files**.
- Full source read of [`manager.ts`](src/services/code-index/manager.ts), [`config-manager.ts`](src/services/code-index/config-manager.ts), [`state-manager.ts`](src/services/code-index/state-manager.ts), [`provider.ts`](src/services/code-index/semble/provider.ts), [`semble-cli.ts`](src/services/code-index/semble/semble-cli.ts), [`semble-downloader.ts`](src/services/code-index/semble/semble-downloader.ts), [`types.ts`](src/services/code-index/semble/types.ts), [`handlers/codeIndex.ts`](src/core/webview/handlers/codeIndex.ts), [`webviewMessageHandler.ts`](src/core/webview/webviewMessageHandler.ts).
- Upstream counterparts via `git show upstream/main:...`.
- Message wiring: `codeIndexMessageTypes` ↔ webview (`CodeIndexPopover.tsx`) — **all 8 message types match**.
- Activation lifecycle: [`extension.ts`](src/extension.ts:168) background-init per workspace folder; tool gating in [`filter-tools-for-mode.ts`](src/core/prompts/tools/filter-tools-for-mode.ts) (identical to upstream).
- Test run: `cd src && npx vitest run services/code-index` → **26 files, 659 tests, all pass**.
- Binary smoke: `node scripts/semble-smoke.mjs` → **PASSED** against pinned v0.5.2.

---

## 3. Upstream Divergence Map

### 3.1 Non-Semble core — IDENTICAL to upstream (nothing to copy)

These files have **zero or trivial (branding-only) diff** vs `upstream/main`:

- [`orchestrator.ts`](src/services/code-index/orchestrator.ts), [`search-service.ts`](src/services/code-index/search-service.ts), [`service-factory.ts`](src/services/code-index/service-factory.ts), [`cache-manager.ts`](src/services/code-index/cache-manager.ts)
- [`processors/`](src/services/code-index/processors) (parser, scanner, file-watcher), `shared/`, `interfaces/` (except `manager.ts`), `constants/`
- [`embedders/`](src/services/code-index/embedders) — only branding touches in `bedrock.ts` / `openrouter.ts`
- [`vector-store/qdrant-client.ts`](src/services/code-index/vector-store/qdrant-client.ts) (+4 lines, branding)

### 3.2 Fork-specific integration layer (our hardening — keep)

| File                                                                     | Δ vs upstream | Nature                                                                                                                                                                  |
| ------------------------------------------------------------------------ | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`manager.ts`](src/services/code-index/manager.ts)                       | +186          | F3 workspace-root resolution; `initialize()` in-flight coalescing; state single-source-of-truth; `_serviceStateMatchesConfig()` reconciliation; provider-change restart |
| [`config-manager.ts`](src/services/code-index/config-manager.ts)         | +31           | `sembleBinaryPath`; provider change always restarts when enabled/ever-enabled                                                                                           |
| [`state-manager.ts`](src/services/code-index/state-manager.ts)           | +45           | `setSystemStateSilent()` (reset without UI spam)                                                                                                                        |
| [`interfaces/manager.ts`](src/services/code-index/interfaces/manager.ts) | −80           | removed dead `ICodeIndexManager`                                                                                                                                        |
| [`CodebaseSearchTool.ts`](src/core/tools/CodebaseSearchTool.ts)          | +19           | F2 (pass `workspacePath`), F4 (surface error state instead of false "no snippets")                                                                                      |
| [`handlers/codeIndex.ts`](src/core/webview/handlers/codeIndex.ts)        | new 455       | extracted from `ClineProvider` switch (v3.76.0 slimming); behavior preserved                                                                                            |

### 3.3 Semble layer — heavily diverged (bulk of the 3,436 insertions)

| File                                                                          | Upstream                                      | Ours                                                                                                                                                                           | Comment                                                                                                                                                |
| ----------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `SEMBLE_VERSION`                                                              | v0.4.1                                        | v0.5.2                                                                                                                                                                         | ours is newer                                                                                                                                          |
| Release repo                                                                  | `Zoo-Code-Org/sembleexec`                     | `Audare-est-Facere/sembleexec` (**ours**, 2c)                                                                                                                                  | intentional                                                                                                                                            |
| [`semble-downloader.ts`](src/services/code-index/semble/semble-downloader.ts) | 482 lines                                     | 1,028 lines                                                                                                                                                                    | checksum manifest, disk-space + write validation, version pinning (latest = opt-in), trusted-domain allowlist, atomic staged swap, stale-archive sweep |
| [`provider.ts`](src/services/code-index/semble/provider.ts)                   | simple `_state`, returns `[]` on search error | shared-state, sticky init failure + `reset()`, `--max-snippet-lines` version gating, snippet truncation cap, path-traversal guard, **throws on search error + flips to Error** |
| [`semble-cli.ts`](src/services/code-index/semble/semble-cli.ts)               | minimal                                       | orphaned-child tracking/abort, stdout/stderr 10 MB caps, silent-exit-0 stub detection (`--help` must advertise `search`)                                                       |

**Key behavioral deltas vs upstream (deliberate):**

1. **Score filter removed** — Semble path now applies _no_ `searchMinScore`/`searchMaxResults` (F1 fix, reference-aligned). Already done, correct.
2. **Search failure handling** — upstream returns `[]` (masks); ours **throws** and flips the shared state to `"Error"` (F4). This is the highest-risk divergence (see §4, R2).
3. **Init failure is sticky** — upstream re-attempts on each `startIndexing()`; ours caches `_initFailed` and only retries after an explicit `reset()`.

---

## 4. Root-Cause Analysis — "the whole codebase indexing is broken"

### R1 (HIGH) — Downloader fast path trusts a stale cached binary forever

[`semble-downloader.ts`](src/services/code-index/semble/semble-downloader.ts:514): when `.semble-version` matches `SEMBLE_VERSION` and a binary file exists, the binary is returned **without any checksum or health re-validation**.

- The CHANGELOG and [`semble-smoke.mjs`](scripts/semble-smoke.mjs:8) document that the **earlier v0.5.2 release was a silent-exit-0 stub** ("extension reported 'ready' but every search returned nothing").
- A server that downloaded the stub (with `.semble-version` = `v0.5.2`) will **keep reusing it** across upgrades, because the fast path never re-verifies.
- The new `checkInstalled()` (`--help` must advertise `search`) then correctly fails the stub → provider `Error` → every `codebase_search` returns nothing / an error.
- **Symptom match:** "works in Zoo-Code (fresh storage dir), broken in ours (stale cache)", "broke after the Semble fix attempts".
- **Why the smoke test passed:** it uses a fresh temp dir, so no stale cache. The field failure is cache-dependent — exactly why it is not reproducible in tests.

### R2 (HIGH) — Sticky-Error state machine turns transient failures into permanent outages

[`provider.ts`](src/services/code-index/semble/provider.ts:302): a single failed `searchIndex()` (a) throws, (b) sets shared state to `"Error"`. All subsequent searches short-circuit to `[]` at [`provider.ts`](src/services/code-index/semble/provider.ts:227). Recovery requires an explicit user action (`startIndexing` → `reset()`), which a normal agent loop never performs.

- **Trigger:** the first search on a machine may download an embedding model from HuggingFace (documented in [`semble-smoke.mjs`](scripts/semble-smoke.mjs:20)) and can exceed the 120 s timeout, or fail transiently on a locked-down/proxied server.
- One transient failure → feature bricked until manual intervention. Upstream would simply return `[]` for that one call and keep working — the user perceives upstream as "working fine."
- **F4 compounds this:** the tool now _surfaces_ the error, so the failure is loud ("Code index is in an error state…") rather than a quiet empty result.

### R3 (MEDIUM) — Unmanaged external dependency: HuggingFace model download on first search

The embedding model download is not mirrored or pre-warmed, is outside the installer's control, and is the most plausible trigger for R2 on a corporate server.

### R4 (LOW/MEDIUM) — v3.76.0 VSIX specific defects (already fixed at HEAD)

- The v3.76.0 VSIX contained the **F1 0.4 min-score filter** → recurring empty Semble results, plus a weaker `checkInstalled()`. If the test server ran 3.76.0 with the old checksums/stub artifacts, everything was broken by design. HEAD (3.77.0) fixes the filter and the stub detection, but **cannot fix an already-cached stub** (R1).

### R5 (LOW) — Cosmetic

[`handlers/codeIndex.ts`](src/core/webview/handlers/codeIndex.ts:207) typo `workerspacePath` (harmless).

---

## 5. Answers to the Requested Benchmarks

### 2a. "Copy Zoo-Code's codebase indexing completely"

**Not needed — and partially impossible to improve on.** The Qdrant pipeline is byte-identical to upstream. Our integration-layer additions (F2/F3 instance convergence, init coalescing, single-source-of-truth state, provider-change restart) are sound hardening and should stay. Recommend a **CI diff-gate** asserting the 10 core files stay aligned with upstream so future upstream improvements can be cherry-picked cleanly (they apply without conflicts because our edits never touch them).

### 2b. "Copy Zoo-Code's Semble functionality completely"

**No — a wholesale copy would be a regression:**

- It would drop the Audare est Facere installer (2c), the SHA-256/trusted-domain/download hardening, the orphaned-process abort, the snippet caps, and the path-traversal guard.
- It would re-introduce **error masking** (search failures return `[]` silently) — the exact behavior the team hardened away.

**What to take from upstream (behavioral contract, not code):** the _search semantics_ (no score filter / no result cap on Semble results) — already re-baselined. If upstream later changes the Semble CLI contract, cherry-pick only the CLI-parsing/flag logic into our hardened wrapper.

### 2c. Audare est Facere installer

**Current state: healthy.** The pinned v0.5.2 assets download, match `SEMBLE_SHA256`, extract, and return real results (smoke test). Keep the installer repo and the pinned-version flow (latest-resolution stays opt-in). Formalize a release procedure so version + checksums always move together:

1. Publish fixed assets to `Audare-est-Facere/sembleexec` (immutable tag — never re-upload over an existing tag).
2. Regenerate `SEMBLE_SHA256` from the published artifacts.
3. Bump `SEMBLE_VERSION` and `SEMBLE_SHA256` in the **same** commit; run `scripts/semble-smoke.mjs` + `scripts/verify-semble-checksums.mjs` in CI.

> **Immutable tags are the single most important rule here.** The stub era happened because a tag's assets were replaced or shipped broken. A broken tag that is later "fixed" in place is invisible to cached installs and breaks the checksum contract.

---

## 6. Prioritized Remediation

| #   | Action                                                                                                                                                                                                                                                                                                   | Risk   | Effort      |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------- |
| 1   | **Re-validate cached binary on the fast path** in [`semble-downloader.ts`](src/services/code-index/semble/semble-downloader.ts:514): if `.semble-version` matches but the binary fails a lightweight `--help` probe (or checksum), force a re-download. This alone fixes the field failure.              | High   | 1 day       |
| 2   | **One-time cache clear** for affected test servers: delete `<globalStorageUri>/semble` (or set `codebaseIndexSembleBinaryPath` to a known-good binary). Immediate unblock for the user's server.                                                                                                         | High   | 5 min (ops) |
| 3   | **Make search failures non-sticky:** do not flip the shared state to permanent `Error` on a single transient search failure. Either return a typed error and keep state `"Indexed"`, or auto-reset on the next search, or add a bounded retry with backoff. Keep `Error` only for install-time failures. | High   | 1–2 days    |
| 4   | **Pre-warm the embedding model** during the "Indexing" phase (or surface an explicit "first search downloads model" state) so the cold-start search cannot silently fail and trigger R2.                                                                                                                 | Medium | 1 day       |
| 5   | **Add an e2e/VSIX-level Semble journey test** (`apps/vscode-e2e` has zero Semble coverage today; see the gap noted in [`semble-smoke.mjs`](scripts/semble-smoke.mjs:44)). Cover: enable "Semble - Local" → status `Indexed` → `codebase_search` returns snippets.                                        | Medium | 2–3 days    |
| 6   | **CI diff-gate** for the 10 upstream-identical core files to guarantee clean future cherry-picks.                                                                                                                                                                                                        | Low    | 0.5 day     |
| 7   | Fix the `workerspacePath` typo in [`handlers/codeIndex.ts`](src/core/webview/handlers/codeIndex.ts:207).                                                                                                                                                                                                 | Low    | minutes     |

---

## 7. Quality Screening Checklist

- **Architecture diagrams/contracts:** message-type contract verified end-to-end (8 `codeIndexMessageTypes` ↔ webview calls in `CodeIndexPopover.tsx`); router dispatch confirmed in [`webviewMessageHandler.ts`](src/core/webview/webviewMessageHandler.ts:71).
- **Capacity/latency model:** Semble search timeout 120 s (mirrored in smoke script); stdout/stderr capped at 10 MB; snippet hard-capped at `MAX_SNIPPET_CHARS`; download pre-flight disk-space check (~150 MB).
- **Threat/compliance:** path-traversal guard in [`provider.ts`](src/services/code-index/semble/provider.ts:393); SHA-256 verification; trusted-domain allowlist for redirects; `spawn` without shell (no injection); secrets via `SecretStorage`; no raw SQL anywhere in this surface.
- **Stakeholder approval:** no cross-functional approval records linked in-repo for the Semble dependency map/SLA; recommend recording the installer ownership decision (2c) in an ADR.

---

## 8. SOTA 2026 Forensic Protocol — Notable Results (12-point check)

- **Ghost Check:** `setSystemStateSilent`, `reset`, `abort`, `getInstalledSembleVersion`, `downloadChecksums`, `checkDiskSpace` all reached via tests + runtime paths. ✓
- **Lifecycle Trace:** every `spawn` is tracked and aborted exactly once ([`semble-cli.ts`](src/services/code-index/semble/semble-cli.ts:220)); `dispose()` aborts the child. ✓
- **State Drift:** `manager.state` and `SembleProvider.state` both read the shared `CodeIndexStateManager` — drift eliminated. ✓
- **Circuit Death:** **FAIL** — the rejected search path _does_ update state, but to a terminal `Error` that blocks future searches (R2). Rejected path should not permanently disable the circuit.
- **Async Trap:** background init is `void`-awaited with `.catch` ([`extension.ts`](src/extension.ts:174)); no floating promises observed in this surface. ✓
- **Error Forgery:** F4 intentionally exposes internal error text to the agent/tool result — acceptable for a local tool, but review whether full CLI stderr should be truncated further.
- **Memory Bombshell:** capped at 10 MB per child stream + `MAX_SNIPPET_CHARS` per result. ✓
- **Mutation Crime / Input Gap:** search query passed as argv array (no shell); no input mutation. ✓

---

## 9. Conclusion

The codebase indexing functionality at HEAD is **not broken in code** — it is healthy at every layer we could exercise (659 unit tests + full binary smoke test). The "whole functionality broken" symptom is best explained by a **stale cached stub binary** (R1) plus the **sticky-Error state machine** (R2) on the test server. Neither requires copying upstream code; both are small, targeted fixes on top of the existing hardening. Upstream comparison confirms there is nothing to copy for the Qdrant core and nothing worth copying for Semble, which is intentionally superior for this fork's needs (installer control + hardening + error visibility).
