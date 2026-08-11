# Hand-off Prompt — Architecture Reviewer: Coordinate & Delegate Phase 3 (Direction-Mixing Cleanup + Vestigial Pass-Through Removal)

> **How to use:** Paste the block below verbatim into a new Architecture Reviewer session. It instructs that reviewer to coordinate and delegate Phase 3 through specialized `code`-mode sub-tasks, mirroring the Phase 1/Phase 2 execution model (13 inbound domains landed 2026-08-11, 8 outbound domains landed 2026-08-11 — see [`docs/architecture-review-protocol-migration.md`](architecture-review-protocol-migration.md) Phases 1 & 2 ✅ DELIVERED).

---

```markdown
You are an Architecture Reviewer coordinating Phase 3 of the Roo+ typed-message-protocol migration: the direction-mixing cleanup and removal of the now-vestigial transitional pass-through paths. Your job is to plan, delegate via `new_task` (mode=code), and verify each cleanup item. Do NOT implement the migration yourself; delegate to specialized sub-tasks and gate each on verification.

## Read first (context)

1. Architecture review — Phases 0/1/2 all ✅ DELIVERED: [`docs/architecture-review-protocol-migration.md`](docs/architecture-review-protocol-migration.md) (Phase 3 section updated 2026-08-11 with the current next-step list)
2. Phase 1 hand-off (inbound template, 11 "loose" types registered minimally): [`docs/handoff-phase1-protocol-migration.md`](docs/handoff-phase1-protocol-migration.md)
3. Phase 2 hand-off (outbound template, vestigial types + direction-mixed notes): [`docs/handoff-phase2-protocol-migration.md`](docs/handoff-phase2-protocol-migration.md)
4. ADR (decision + migration strategy + terminal state): [`src/docs/adr-typed-message-protocol.md`](src/docs/adr-typed-message-protocol.md)
5. Debt register (items #5 inbound delivered, #6 outbound delivered; both targeted for the RESOLVED table after Phase 3): [`DEBT.md`](DEBT.md)
6. Inbound registry + parse boundary: [`packages/types/src/webview-messages/index.ts`](packages/types/src/webview-messages/index.ts)
7. Outbound registry + parse boundary: [`packages/types/src/extension-messages/index.ts`](packages/types/src/extension-messages/index.ts)
8. Message type union source (both interfaces): [`packages/types/src/vscode-extension-host.ts`](packages/types/src/vscode-extension-host.ts) (`WebviewMessage` line ~433, `ExtensionMessage` line ~26)
9. Ratchet + analysis: [`scripts/verify-message-schemas.mjs`](scripts/verify-message-schemas.mjs) and [`scripts/message-schema-analysis.mjs`](scripts/message-schema-analysis.mjs)

## Verified baseline (2026-08-11 — do not re-derive, but re-confirm once)

- Inbound: `WebviewMessage.type` = **165** members, **all 165 registered**, **0 untyped**, `UNTYPED_MESSAGE_LIMIT = 0`.
- Outbound: `ExtensionMessage.type` = **77** members, **all 77 registered**, **0 untyped**, `UNTYPED_EXTENSION_MESSAGE_LIMIT = 0`.
- Both ratchets pass (`node scripts/verify-message-schemas.mjs` exit 0; `node --test scripts/verify-message-schemas.spec.mjs` 13/13).
- Run `pnpm --filter @roo-code/types build && node scripts/verify-message-schemas.mjs` once to confirm before starting (both directions must read `0 untyped (limit 0)`).

## Goal

Phase 3 has three workstreams. Each must land in ONE atomic change set and keep both ratchets green (0 untyped / limit 0 in both directions).

### Workstream A — Direction-mixing cleanup: the 11 "loose" inbound types

These are `WebviewMessage.type` members registered in Phase 1 with **minimal structural schemas and NO dispatcher case** in `src/core/webview/handlers/`. Each must be classified as (a) outbound-only → **move out of `WebviewMessage` into `ExtensionMessage`** (removing it from the inbound union + registry + baseline), (b) dead → remove from the union entirely (verify no sender in `webview-ui/`, no handler, no consumer), or (c) genuinely inbound → keep and type properly. The Phase-1 list (verify against the current union + handler `ReadonlySet` exports — some may already have been touched):

`currentApiConfigName`, `updateCondensingPrompt`, `playSound`, `draggedImages`, `setopenAiCustomModelInfo`, `codebaseIndexEnabled`, `marketplaceButtonClicked`, `cancelMarketplaceInstall`, `imageGenerationSettings`, `switchMode`, `shareTaskSuccess`

Known classification anchors from Phase 1/2:

- `marketplaceButtonClicked` — **confirmed outbound-only** (an `action` value; the webview sends it as an `action` message, not a standalone type) → move out of `WebviewMessage`.
- `shareTaskSuccess` — **direction-mixed**; the OUTBOUND registration (Phase 2, Domain 5) is authoritative; the inbound minimal schema in `packages/types/src/webview-messages/loose.ts` was kept for union completeness → now remove it from the inbound union/registry/baseline (outbound registration is untouched and authoritative).
- `switchMode` — check: it exists in BOTH unions (`WebviewMessage.type` and `ExtensionMessage.type`). Verify the actual direction (the webview sends `switchMode` inbound to change mode; is there an outbound producer? Phase 2 did NOT register `switchMode` outbound — confirm whether it belongs only inbound).
- `playSound`, `updateCondensingPrompt`, `currentApiConfigName`, `setopenAiCustomModelInfo`, `codebaseIndexEnabled`, `draggedImages`, `cancelMarketplaceInstall`, `imageGenerationSettings` — classify each by searching `vscode.postMessage({ type: "<type>"` in `webview-ui/` (inbound sender) and `postMessageToWebview({ type: "<type>"` in `src/` (outbound producer). No sender + no handler + no consumer → dead (remove). Outbound producer only → move out.

For every type you move or remove: update the inbound union in [`vscode-extension-host.ts`](packages/types/src/vscode-extension-host.ts), the inbound registry + `webviewMessageSchema` union + exports in [`packages/types/src/webview-messages/index.ts`](packages/types/src/webview-messages/index.ts), and `MESSAGE_SCHEMA_BASELINE` in [`scripts/message-schema-analysis.mjs`](scripts/message-schema-analysis.mjs). The ratchet `UNPTYED_MESSAGE_LIMIT` stays 0 (moving types OUT of the inbound union DECREASES the inbound member count — 165 → 165−k — which is fine; the ratchet only forbids an INCREASE in untyped, and removed types are no longer in the union).

### Workstream B — Drop the vestigial transitional pass-through paths

Both parse boundaries currently pass unregistered types through structurally. With ALL types registered in both directions, that branch is unreachable. Options (pick per boundary, keep both directions consistent):

1. **Fail closed**: change the pass-through branch to REJECT unknown/unregistered types (log + reject, never dispatch). This converts the boundary into a hard allowlist — the strictest posture and the original design intent.
2. **Remove the branch**: if the union type (`WebviewMessageType`/`ExtensionMessageType`) is a closed set, a registered-schema lookup can no longer miss; simplify `parseWebviewMessage`/`parseExtensionMessage` to assume registration.

Apply to:

- [`packages/types/src/webview-messages/index.ts`](packages/types/src/webview-messages/index.ts) — `parseWebviewMessage`.
- [`packages/types/src/extension-messages/index.ts`](packages/types/src/extension-messages/index.ts) — `parseExtensionMessage`.
- Consumers that rely on pass-through behavior: [`src/core/webview/ClineProvider.ts`](src/core/webview/ClineProvider.ts) (setWebviewMessageListener), [`apps/cli/src/agent/message-processor.ts`](apps/cli/src/agent/message-processor.ts), [`webview-ui/src/App.tsx`](webview-ui/src/App.tsx), [`webview-ui/src/context/ExtensionStateContext.tsx`](webview-ui/src/context/ExtensionStateContext.tsx) — remove any "unregistered types pass through" comments and ensure no test depends on pass-through of a now-registered-or-removed type.

### Workstream C — Interface `any`-escape hardening

Drain the remaining interface-level `any` fields on `ExtensionMessage` (and `WebviewMessage` if any remain) that are not consumed through a typed schema on every path: `payload`, `values`, `value`, `settings`, `marketplaceInstalledMetadata`, … For each, find every producer/consumer and either (a) replace with the precise typed shape (many are now covered by per-domain schemas — e.g. `settings` is `codebaseIndexConfigSchema`-typed on `codeIndexSettingsSaved`, `values` is typed on `routerModels`/`singleRouterModelFetchResponse`/`codeIndexSecretStatus`/`indexCleared`/`openAiCodexRateLimits`), or (b) remove the field if dead, or (c) document any genuinely-irreducible `unknown` with a justified comment. Track per-field.

## Per-item implementation recipe (the "same PR per item" rule — non-negotiable)

Each delegated sub-task must do ALL of the following in one change set:

1. **Classify/type**: for Workstream A, classify each loose type (outbound-only / dead / inbound) with evidence from `webview-ui/` senders, `src/` producers, and handler `ReadonlySet` exports; for Workstream C, map each `any` field to its typed schema or justify retention.
2. **Edit the union + registry**: update [`vscode-extension-host.ts`](packages/types/src/vscode-extension-host.ts) (union members) and the relevant registry/parse boundary ([`webview-messages/index.ts`](packages/types/src/webview-messages/index.ts) and/or [`extension-messages/index.ts`](packages/types/src/extension-messages/index.ts)) in the SAME change set. Keep every construction site compiling.
3. **Update ratchet baselines**: reflect any moved/removed inbound types in `MESSAGE_SCHEMA_BASELINE` and any outbound moves in `EXTENSION_MESSAGE_BASELINE` in [`scripts/message-schema-analysis.mjs`](scripts/message-schema-analysis.mjs). Both `UNTYPED_*_LIMIT` values stay 0. This is the ONLY allowed change to the analysis script.
4. **Update senders/handlers/consumers**: any `webview-ui/` sender, `src/` handler, or consumer that referenced a moved/removed type must be updated in the same change set (e.g. `marketplaceButtonClicked` is an `action` value — the `action` schema already covers it; `switchMode` inbound handler stays, etc.).
5. **Tests**:
    - Extend/update `packages/types/src/webview-messages/__tests__/parseWebviewMessage.spec.ts` and `packages/types/src/extension-messages/__tests__/parseExtensionMessage.spec.ts` — remove registry-seed entries for moved/removed types; for Workstream B, update pass-through tests to the new fail-closed/removed behavior.
    - Extend/update the relevant handler/sender/consumer specs for moved types (e.g. `webviewMessageHandler.*.spec.ts`, `ExtensionStateContext.spec.tsx`, CLI `message-processor.test.ts`).
6. **Ratchet**: run the ratchet — both directions must stay `0 untyped (limit 0)`.
7. **Docs**: update [`DEBT.md`](DEBT.md) (items #5 and #6 → move to the "Recently Resolved Debt" table once Phase 3 lands; keep the direction-mixing resolution notes) and the ADR.

## Verification gates (every sub-task must pass before you accept it)

- `pnpm --filter @roo-code/types build` (ESM + CJS + DTS).
- `node scripts/verify-message-schemas.mjs` — BOTH directions read `0 untyped (limit 0)`; baselines reflect any moved/removed types; exit 0.
- `cd packages/types && npx vitest run` — full types suite green.
- `cd src && npx tsc --noEmit` — clean.
- `cd apps/cli && npx tsc --noEmit` — clean if a CLI producer/consumer changed.
- `pnpm --dir src exec eslint --prune-suppressions --max-warnings=0 <touched-files>` — no suppression-count increases.
- Relevant producer/consumer specs green (`cd src && npx vitest run <spec>`; `cd webview-ui && npx vitest run <spec>` if a consumer changed).
- `node --test scripts/verify-message-schemas.spec.mjs` — ratchet specs green.

## Orchestration rules

- Create sub-tasks ONE at a time — `new_task` MUST be called alone, never alongside other tools.
- Suggested order: (1) Workstream A — classify + move/remove the loose types in small batches (e.g. `marketplaceButtonClicked` + `shareTaskSuccess` first — both have confirmed classifications), (2) Workstream C — `any`-escape hardening per field, (3) Workstream B — pass-through removal LAST (it is only safe once every type is either registered in the correct direction or removed).
- Give each sub-task: the exact scope (which types/fields/boundaries), the classification evidence, the files to touch, the recipe (above), the verification gates, and the constraint list (below). Provide rich context so the sub-task is self-contained.
- After each sub-task, spot-check the diff and re-run the ratchet yourself before delegating the next.
- Progress tracking: keep the inbound/outbound member counts and `any`-escape counts visible; after the final sub-task, both directions must still be `0 untyped (limit 0)` with no vestigial pass-through and no irreducible `any` escapes (except documented).

## Constraints (pass to every sub-task)

- NO `.changeset` files (maintainers manage them).
- NO new eslint suppressions; no `as any` — prefer typed APIs or precise `unknown` type guards with a justifying comment (double assertions only as a last resort, documented).
- NO floating promises — `void`/`await`/`.catch()` as appropriate.
- Keep the `WebviewMessage`/`ExtensionMessage` interface names and all construction sites compiling until an item is fully migrated (the same-PR rule guarantees this).
- Do NOT change the outbound `extension-messages` registrations that are already authoritative (Phase 2 complete) EXCEPT for moves that relocate a type from inbound → outbound (add to `extensionMessageSchemas` if not already there) and the Workstream B pass-through change.
- Do NOT modify `scripts/message-schema-analysis.mjs`/`verify-message-schemas.mjs` beyond the baseline/limit ratchet updates described above.

## Completion criteria for Phase 3

- Both directions still `0 untyped (limit 0)`; the inbound union shrinks to only genuinely-inbound types (165 − moved − removed); the outbound union grows to include the relocated outbound-only types.
- `parseWebviewMessage`/`parseExtensionMessage` have no vestigial unregistered pass-through (fail-closed or simplified).
- No irreducible `any` escapes remain on the message interfaces except documented `unknown`-typed transitional fields.
- `DEBT.md` items #5 and #6 moved to the "Recently Resolved Debt" table; the ADR updated to the terminal state (Phase 3 ✅ DELIVERED).
- Report: final inbound/outbound member counts, types moved/removed with classification, pass-through behavior change, `any`-escapes drained, and any residual transitional types with rationale.
```

---

## Notes for the coordinator (context beyond the prompt)

- **This is the close-out phase.** Phases 0–2 already delivered both fully-typed directions with 0 untyped each. The risk profile is now LOW (no new schemas needed; it's reclassification + simplification), but the same-PR discipline still applies because every move touches the union, the registry, the baseline, and at least one sender/handler/consumer.
- **The 11 loose types are the S1-M1 direction-mixing remainder** — the plan always intended to verify each is truly outbound-only/dead before moving. Phase 1 registered them minimally because moving them then would have risked breaking senders; Phase 3 has the full picture.
- **`switchMode` needs care**: it is a member of BOTH unions. Phase 2 did NOT register it outbound (it wasn't in any of the 8 outbound domains). Verify the actual direction before classifying — if the webview sends `switchMode` inbound (it does — `ModesView`/`switchMode`), it stays inbound; do NOT move it outbound without an outbound producer.
- **`marketplaceButtonClicked`** is the cleanest first move (confirmed outbound-only, an `action` value already covered by the Domain-1 `action` schema).
- **Workstream B ordering matters**: removing the pass-through before Workstream A/C could break tests that dispatch a not-yet-moved type. Delegate B last.
- **Ratchet mechanics**: moving types out of the inbound union decreases the inbound member count; `UNTYPED_MESSAGE_LIMIT` stays 0 (the ratchet only forbids an increase in untyped, and removed types are not in the union). Moving types into the outbound union increases the outbound member count but they are immediately registered, so `UNTYPED_EXTENSION_MESSAGE_LIMIT` stays 0.
