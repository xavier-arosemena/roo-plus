# Allow-list divergence ledger (H-11)

**What this is.** One row per entry of the alignment gate's allow-list — i.e. every
[`CORE_FILES`](../../scripts/verify-upstream-code-index-alignment.mjs:92) entry that carries an
allow-list mode (`branding` · `fork-config` · `fork-telemetry`). The gate keeps the Qdrant
code-index core byte-aligned with `upstream/main`; an allow-list entry is a place where that
alignment is **deliberately** relaxed. This file records _why_ each relaxation exists and what
its disposition is, so "divergent forever" is an auditable decision instead of a silent omission.

**This ledger records; it does not authorise.** Adding a row here does NOT add an allow-list
entry — the allow-list is code ([`CORE_FILES`](../../scripts/verify-upstream-code-index-alignment.mjs:92)),
and a ledger row that names no allow-list entry is itself a failure. Conversely, removing a
`CORE_FILES` entry makes its ledger row an orphan (also a failure). The two must move together,
deliberately, in one reviewed change.

**The check.** [`scripts/verify-upstream-code-index-alignment.mjs`](../../scripts/verify-upstream-code-index-alignment.mjs:1)
fails (exit 1) when an allow-list entry has no ledger row, when a row names no allow-list entry,
when a row's `kind` disagrees with the entry's real gate mode(s), when a `reason` is empty, when a
`fork-feature` row carries no `forcing upstream SHA`, when the
`disposition` is outside the closed set, or when an entry has more than one row. Failures name the
**entry** (path), never a line number. The same logic is unit-tested in
[`scripts/verify-upstream-code-index-alignment.spec.mjs`](../../scripts/verify-upstream-code-index-alignment.spec.mjs:1).

**Kind is the gate's real mode, by a total mapping.** `branding` → `branding`;
`fork-config` → `fork-config`; **`fork-telemetry` → `fork-feature`** (a fork feature the fork keeps
against upstream's content). An entry with several modes lists the joined kinds in the entry's
declared mode order (e.g. `branding+fork-feature`). The mapping is exported as
`ALLOWLIST_MODE_KINDS` from the gate so the check and this table cannot drift.

**Per-kind requirements.**

| Kind           | Meaning                                                                                                     | `forcing upstream SHA`                                                                            |
| -------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `branding`     | Token-level rename (`Roo-Plus`/`Roo+`/`RooPlus` ↔ `Zoo-Code`/`Zoo Code`/`ZooCode`) normalised on both sides | **not applicable** — systematic, so there is no single upstream commit that forced it             |
| `fork-config`  | A fork-only configuration field with no upstream counterpart                                                | **not applicable** — forced by a recorded decision (the alignment ADR), not by an upstream commit |
| `fork-feature` | A fork feature kept against upstream's content (here: the v3.88.0 telemetry purge)                          | **required** — the upstream SHA that made the permanent exception necessary                       |

`date` is the date the row was recorded. `disposition` is one of `divergent-forever`,
`pending-upstream` (upstream will make this converge), or `local-only` (a fork-only concern with no
upstream counterpart). `—` is the empty placeholder.

| entry                                                    | kind                  | reason                                                                                                                                                                     | forcing upstream SHA | date       | disposition       |
| -------------------------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ---------- | ----------------- |
| `src/services/code-index/orchestrator.ts`                | fork-feature          | Upstream ships `TelemetryService.captureEvent` call sites the fork deleted in the v3.88.0 telemetry purge (Marketplace notice #305); the gate strips them from both sides. | `1ad8f528d`          | 2026-09-28 | divergent-forever |
| `src/services/code-index/search-service.ts`              | fork-feature          | Same v3.88.0 telemetry purge: upstream's captureEvent call sites removed.                                                                                                  | `1ad8f528d`          | 2026-09-28 | divergent-forever |
| `src/services/code-index/service-factory.ts`             | fork-feature          | Same v3.88.0 telemetry purge: upstream's captureEvent call sites removed.                                                                                                  | `1ad8f528d`          | 2026-09-28 | divergent-forever |
| `src/services/code-index/cache-manager.ts`               | fork-feature          | Same v3.88.0 telemetry purge: upstream's captureEvent call sites removed.                                                                                                  | `1ad8f528d`          | 2026-09-28 | divergent-forever |
| `src/services/code-index/processors/parser.ts`           | fork-feature          | Same v3.88.0 telemetry purge: upstream's captureEvent call sites removed.                                                                                                  | `1ad8f528d`          | 2026-09-28 | divergent-forever |
| `src/services/code-index/processors/scanner.ts`          | fork-feature          | Same v3.88.0 telemetry purge: upstream's captureEvent call sites removed.                                                                                                  | `1ad8f528d`          | 2026-09-28 | divergent-forever |
| `src/services/code-index/processors/file-watcher.ts`     | fork-feature          | Same v3.88.0 telemetry purge: upstream's captureEvent call sites removed.                                                                                                  | `1ad8f528d`          | 2026-09-28 | divergent-forever |
| `src/services/code-index/interfaces/config.ts`           | fork-config           | The fork's `sembleBinaryPath` field, required by the intentionally-hardened, non-gated `config-manager.ts`; allowed by `adr-upstream-alignment-fork-strategy.md`.          | —                    | 2026-09-28 | local-only        |
| `src/services/code-index/embedders/bedrock.ts`           | branding+fork-feature | Branding tokens in the User-Agent plus the v3.88.0 telemetry purge of upstream's captureEvent call sites.                                                                  | `1ad8f528d`          | 2026-09-28 | divergent-forever |
| `src/services/code-index/embedders/gemini.ts`            | fork-feature          | Same v3.88.0 telemetry purge: upstream's captureEvent call sites removed.                                                                                                  | `1ad8f528d`          | 2026-09-28 | divergent-forever |
| `src/services/code-index/embedders/mistral.ts`           | fork-feature          | Same v3.88.0 telemetry purge: upstream's captureEvent call sites removed.                                                                                                  | `1ad8f528d`          | 2026-09-28 | divergent-forever |
| `src/services/code-index/embedders/ollama.ts`            | fork-feature          | Same v3.88.0 telemetry purge: upstream's captureEvent call sites removed.                                                                                                  | `1ad8f528d`          | 2026-09-28 | divergent-forever |
| `src/services/code-index/embedders/openai-compatible.ts` | fork-feature          | Same v3.88.0 telemetry purge: upstream's captureEvent call sites removed.                                                                                                  | `1ad8f528d`          | 2026-09-28 | divergent-forever |
| `src/services/code-index/embedders/openai.ts`            | fork-feature          | Same v3.88.0 telemetry purge: upstream's captureEvent call sites removed.                                                                                                  | `1ad8f528d`          | 2026-09-28 | divergent-forever |
| `src/services/code-index/embedders/openrouter.ts`        | branding+fork-feature | Branding tokens in the HTTP-Referer/X-Title headers plus the v3.88.0 telemetry purge of upstream's captureEvent call sites.                                                | `1ad8f528d`          | 2026-09-28 | divergent-forever |
| `src/services/code-index/embedders/vercel-ai-gateway.ts` | fork-feature          | Same v3.88.0 telemetry purge: upstream's captureEvent call sites removed.                                                                                                  | `1ad8f528d`          | 2026-09-28 | divergent-forever |
| `src/services/code-index/vector-store/qdrant-client.ts`  | branding              | Branding-only diff in the `User-Agent` header (`Roo-Plus` vs `Zoo-Code`); normalised on both sides.                                                                        | —                    | 2026-09-28 | divergent-forever |

**Why these are not `pending-upstream`.** The `branding` rows are permanent by construction (the
fork is named differently). The `fork-config` row is a fork-only field. The `fork-feature` rows
would converge only if upstream itself removed its telemetry call sites — nothing upstream has
committed to today, and the fork would still not re-take consent/telemetry UI. So all
seventeen rows are recorded as `divergent-forever` / `local-only`, which is the honest reading
and the reason this ledger exists.

## Resync log

The gate compares the fork against **`upstream/main`**, which moves. A green run therefore decays
on its own: `static-analysis` failed on 2026-11-03 against upstream content the fork had never
seen, with no fork commit involved. Each entry below records a deliberate forward-port; the rows
above are unchanged (the allow-list, its kinds and its dispositions did not move).

### 2026-11-03 — resync to `3ee042d91e`

- **Previous alignment point:** `842b37e76d` (used as the 3-way merge base).
- **Drifted core files:** 11. Three were byte-identical to the previous alignment point and were
  taken from upstream verbatim (`shared/validation-helpers.ts`, `interfaces/embedder.ts`,
  `core/prompts/tools/filter-tools-for-mode.ts`). The other eight carried the fork's telemetry
  purge and/or branding and were merged 3-way so the fork edits survive:
  `orchestrator.ts`, `cache-manager.ts`, `processors/file-watcher.ts`, `embedders/bedrock.ts`,
  `embedders/ollama.ts`, `embedders/openai-compatible.ts`, `embedders/openrouter.ts`,
  `vector-store/qdrant-client.ts`.
- **One conflict, resolved by hand:** `embedders/bedrock.ts`. Upstream dropped `HttpError` from the
  `validation-helpers` import (no longer used) and upstream's telemetry imports had been purged by
  the fork. Resolution: keep upstream's narrowed import, drop the now-unused `HttpError`, and do
  not reintroduce the telemetry imports.
- **Dependency synced with it:** `src/utils/networkProxy.ts` (+ its spec). Upstream's new bedrock
  hunk uses `createProxyRoutingRequestHandler()`, which the fork's older copy of that module did
  not export. Merged 3-way; the fork's SECURITY comment block around the debug-only TLS override
  is preserved.
- **Result:** `12 identical, 16 allow-listed branding/fork diff(s)`; ledger check still
  `17 allow-list entries, 17 ledger rows, all satisfied`.
- **Known limitation (not fixed here, decision needed):** because the gate fetches the latest
  `upstream/main` when no local ref exists, CI can go red again the moment upstream moves — on
  this same day CI saw 6 drifted files and a local run 20 minutes later saw 11. Pinning the
  comparison (record an upstream SHA in this repo and compare against it, refreshing deliberately)
  is the durable fix and is left as an explicit follow-up rather than smuggled into a resync.
