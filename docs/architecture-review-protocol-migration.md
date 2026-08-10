# Architecture Review — Complete Protocol Migration (DEBT #5 / #6)

**Reviewer:** Architecture Reviewer
**Date:** 2026-08-10
**Scope:** "Complete protocol migration" — (a) the 147 transitional (untyped) `WebviewMessage` types and (b) the untyped outbound `ExtensionMessage`.
**Verdict:** ❌ **Neither item is addressed.** The ratchet holds the line but the migration is stalled: only **2 of the 165 inbound types** have been registered since the S1-M4 baseline, and the outbound direction has **zero** schema coverage.

---

## 1. Status assessment (verified live, not from docs)

| Item                                       | Claimed (DEBT.md / ADR) | Verified live                                                                     | Status                                              |
| ------------------------------------------ | ----------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------- |
| Inbound `WebviewMessage.type` members      | 165                     | **165** (`packages/types/src/vscode-extension-host.ts:433`)                       | ✅ accurate                                         |
| Registered schemas (inbound)               | 16 baseline             | **18** (16 baseline + `fetchMarketplaceData`, `filterMarketplaceItems`)           | ⚠️ docs stale                                       |
| Untyped (transitional) inbound             | 149                     | **147** (165 − 18)                                                                | ⚠️ docs stale (149 is the ceiling, 2 headroom left) |
| Outbound `ExtensionMessage.type` members   | 87                      | **77** (`packages/types/src/vscode-extension-host.ts:26`)                         | ❌ docs stale by 10                                 |
| Outbound schemas / `parseExtensionMessage` | n/a (planned)           | **0 / absent**                                                                    | ❌ unaddressed                                      |
| `any` escapes in `ExtensionMessage`        | n/a                     | **11** (`payload`, `values`, `value`, `settings`, `marketplaceInstalledMetadata`) | ❌ unaddressed                                      |
| CI ratchet                                 | wired (S1-M4)           | **passes** (`verify-message-schemas.mjs`: 147 untyped ≤ 149)                      | ✅ working                                          |

**Evidence:**

- Live run of [`scripts/verify-message-schemas.mjs`](scripts/verify-message-schemas.mjs): `Message types: 165 total, 18 registered, 147 untyped (limit 149)` → ratchet OK.
- Git history: the last protocol-migration commits are the S1-M1..M4 + S2-scaffold series (v3.76.0, ~2026-07-31). Since then only marketplace `fetch/filter` schemas were added (`81c151ef5`, Issue #158). **No new inbound domain has migrated in ~7 releases.**
- No `parseExtensionMessage`, `extensionMessageSchemas`, or `ExtensionMessageSchema` symbol exists anywhere in `packages/types/`.

---

## 2. Findings

### 2.1 Inbound: the ratchet is a _ceiling_, not a _forcing function_

- The S1-M4 ratchet correctly prevents regression: baseline types cannot lose their schema, and the untyped count cannot increase ([`scripts/message-schema-analysis.mjs`](scripts/message-schema-analysis.mjs:105)).
- It does **not** drive completion. Nothing fails when a PR ships zero new schemas. The 147 transitional types — the "largest remaining security/correctness surface" — have sat unchanged.
- The S2 handler split already landed ([`src/core/webview/handlers/`](src/core/webview/handlers/)), so the per-domain scaffolding the plan envisioned is _already in place_. The only missing piece is the schema migration itself.

### 2.2 Outbound: the "Type Lie" is half-closed

- `WebviewMessage` (webview→extension) has strict runtime validation for 18 types.
- `ExtensionMessage` (extension→webview | CLI) is still a flat ~11 KB interface with a 77-member literal union, dozens of optional fields, and 11 `any` escapes. Every webview consumer ([`ExtensionStateContext.tsx`](webview-ui/src/context/ExtensionStateContext.tsx:465), [`App.tsx`](webview-ui/src/App.tsx:114), `FileChangesPanel`, …) trusts the producer's shape with zero validation.
- The CLI path makes this a _runtime_ issue, not just a type-safety issue: [`message-processor.ts`](apps/cli/src/agent/message-processor.ts:104) receives extension→CLI traffic (`ExtensionMessage`) but parses it with the **inbound** `parseWebviewMessage`, then force-casts `parsed.message as unknown as ExtensionMessage`. The direction-mixing is baked into the code.

### 2.3 Documentation drift compounds the problem

- [`DEBT.md`](DEBT.md:47) still says "149 of 165 remain unregistered" and "`ExtensionMessage` (87 types)" — both stale (actual: 147 untyped, 77 outbound).
- The ADR ([`adr-typed-message-protocol.md`](src/docs/adr-typed-message-protocol.md:43)) repeats 149/87.
- The ratchet's own comment (`"165 − 16 = 149"`) no longer reflects the 18 registered entries. The 149 limit now encodes 2 units of _past_ progress as permanent headroom.

---

## 3. Recommended way forward

Adopt a **three-phase plan** that (1) makes the ratchet self-correcting, (2) completes the inbound migration domain-by-domain, and (3) brings the outbound direction to parity. Keep the existing "same PR per domain" rule (schema + handler + sender + tests together) — it is the correct safety property and the reason nothing has broken; batch small domains to reduce its cost.

### Phase 0 — Instrumentation corrections & ratchet hardening — ✅ DELIVERED 2026-08-10

Status: all four sub-tasks landed and verified (inbound 147 untyped ≤ 147; outbound 72 untyped ≤ 72; 13/13 ratchet specs pass).

1. **Corrected the numbers** so the register reflects reality:
    - [`scripts/message-schema-analysis.mjs`](scripts/message-schema-analysis.mjs:50): `UNTYPED_MESSAGE_LIMIT` corrected 149 → 147 with the verified derivation (165 − 18); boundary tests added at 147/148.
    - Added the **outbound ratchet**: [`packages/types/src/extension-messages/index.ts`](packages/types/src/extension-messages/index.ts) with `extensionMessageSchemas`, `parseExtensionMessage`, and 5 baseline schemas (`state`, `commandExecutionStatus`, `mcpExecutionStatus`, `fileContent`, `indexingStatusUpdate`); `EXTENSION_MESSAGE_BASELINE` + `UNTYPED_EXTENSION_MESSAGE_LIMIT = 72` in the analysis module; [`scripts/verify-message-schemas.mjs`](scripts/verify-message-schemas.mjs) now validates both directions.
2. **Replaced the CLI direction hack**: [`message-processor.ts`](apps/cli/src/agent/message-processor.ts:111) now parses extension→CLI traffic with `parseExtensionMessage` (the outbound parser) instead of `parseWebviewMessage` + `as unknown as ExtensionMessage`; 10/10 CLI tests pass.
3. **Updated [`DEBT.md`](DEBT.md:47), the ADR, and the plan** with verified counts (147 untyped / 77 outbound / 18 registered); stale 149/87/187 figures removed.

### Phase 1 — Complete the inbound migration (147 types) — **the priority**

Follow the S1-M4 domain list, ordered by security sensitivity (handlers already exist under `src/core/webview/handlers/`):

| Order | Domain                  | Types   | Rationale                           |
| ----- | ----------------------- | ------- | ----------------------------------- |
| 1     | Terminal                | ×9      | command execution path              |
| 2     | Worktree                | ×12     | filesystem mutation + path handling |
| 3     | Code-index              | ×10     | settings + secret-status messages   |
| 4     | Marketplace (remaining) | ×7      | install/remove side effects         |
| 5     | Images                  | ×4      | file reads                          |
| 6     | Skills + Rules          | ×6 + ×5 | metadata responses                  |
| 7     | Debug + misc            | ×8+     | diagnostics                         |

Each domain = one PR: per-domain zod file → registry entry → boundary stays as-is → handler narrowed to the `z.infer` union → sender updated → per-domain tests (mirror the existing [`__tests__/`](packages/types/src/webview-messages/__tests__/) pattern). Reuse existing schemas (`rooCodeSettingsSchema`, `modeConfigSchema`, `todoItemSchema`, …) to keep the schemas small. Batching (skills+rules, images+debug) cuts PR count roughly in half.

### Phase 2 — Outbound `ExtensionMessage` typing (77 types)

Mirror the inbound architecture in `packages/types/src/extension-messages/` (per-domain files, `extensionMessageSchemas` registry, `parseExtensionMessage`), same-PR discipline per domain:

1. `state` — the largest and highest-traffic; validate structurally against a subset schema (or a derived `ExtensionState` schema) during the transitional period.
2. `commandExecutionStatus`, `mcpExecutionStatus` — security-relevant execution status.
3. `fileContent`, `indexingStatusUpdate`, marketplace result types — content/status surfaces.
4. Remaining response types in batches.

Wire `parseExtensionMessage` at:

- **webview receive boundary** — [`App.tsx`](webview-ui/src/App.tsx:114) / [`ExtensionStateContext.tsx`](webview-ui/src/context/ExtensionStateContext.tsx:472): runtime validation of the trusted-producer direction catches producer bugs in dev (origin trust via `isTrustedMessage` stays).
- **CLI boundary** — `message-processor.ts`: replaces the `as unknown as ExtensionMessage` cast with a real parse.

Delete the 11 `any` fields (`payload`, `values`, `value`, `settings`, `marketplaceInstalledMetadata`) as each domain types. This also drains DEBT #11 (`as any` reduction).

### Phase 3 — Completion & close-out (≈1 day + doc updates)

- Finish moving any remaining misclassified outbound-only types out of `WebviewMessage` (direction-mixing cleanup, S1-M1 remainder).
- Drop the ratchet limit to 0 headroom as domains complete, so the last domain cannot hide behind past progress.
- Mark DEBT #5 and #6 **RESOLVED** in [`DEBT.md`](DEBT.md) (same style as the "Recently Resolved Debt" table) and update the ADR.

---

## 4. Governance changes (so this cannot stall again)

1. **Ratchet → quota**: extend `MESSAGE_SCHEMA_BASELINE` with each newly migrated domain and print a trend line (`untyped 147 → 120 → … → 0`) in CI output so progress is observable per PR.
2. **Per-domain checkpoints**: after each Phase-1/2 domain, land the baseline extension + DEBT.md update in the _same_ PR — the register then reads as the progress tracker.
3. **Pair with DEBT #11**: the per-domain migrations naturally remove `as any` casts; track the counts so lint suppression ceilings benefit automatically.

---

## 5. Risks & mitigations

| Risk                                    | Mitigation                                                                                                                                          |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `state` / `ExtensionState` schema size  | Structural subset schema first; full schema later; `.passthrough()`/`.strict(false)` during transition (pattern already used for `updateSettings`). |
| Webview consumer regressions            | Same-PR rule + existing per-handler specs (`webviewMessageHandler.*.spec.ts`, `ExtensionStateContext` tests).                                       |
| Direction-mixing moves breaking senders | Verify each moved type is truly outbound-only before moving (S1-M1 rule, covered by `tsc --noEmit` + specs).                                        |
| Migration stalls again                  | Quota ratchet + per-domain checkpoints + CI trend line make non-progress visible.                                                                   |

---

## 6. Effort estimate

- **Phase 0:** 0.5–1 day (mostly mechanical corrections + outbound scaffold).
- **Phase 1:** ~147 types across ~7 PR batches; 2–4 days per batch with same-PR discipline → **~3–5 weeks** part-time, compressible by batching small domains.
- **Phase 2:** 77 mostly simple response types → **~1–2 weeks**.
- **Phase 3:** ~1 day + documentation.

**Total: ≈4–7 weeks of part-time work to fully close both items.** The single highest-leverage first step is **Phase 0**: it makes the outbound direction ratchetable, fixes the CLI direction hack, and corrects the drift that currently hides the true state.
