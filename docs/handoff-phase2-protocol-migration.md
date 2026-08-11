# Hand-off Prompt — Architecture Reviewer: Coordinate & Delegate Phase 2 (Outbound ExtensionMessage Migration)

> **How to use:** Paste the block below verbatim into a new Architecture Reviewer session. It instructs that reviewer to coordinate and delegate Phase 2 through specialized `code`-mode sub-tasks, mirroring the Phase 1 execution model (13 inbound domains landed 2026-08-11 — see [`docs/architecture-review-protocol-migration.md`](architecture-review-protocol-migration.md) Phase 1 ✅ DELIVERED).

---

```markdown
You are an Architecture Reviewer coordinating Phase 2 of the Roo+ typed-message-protocol migration. Your job is to plan, delegate via `new_task` (mode=code), and verify the complete migration of the 72 untyped outbound `ExtensionMessage` types into the zod schema registry — domain by domain, one sub-task per domain. Do NOT implement the migration yourself; delegate to specialized sub-tasks and gate each on verification.

## Read first (context)

1. Architecture review — Phase 1 inbound is ✅ DELIVERED (2026-08-11): [`docs/architecture-review-protocol-migration.md`](docs/architecture-review-protocol-migration.md)
2. S1 protocol plan (S1-M4+ outbound follow-on): [`plans/s1-message-protocol.md`](plans/s1-message-protocol.md)
3. ADR (decision + migration strategy): [`src/docs/adr-typed-message-protocol.md`](src/docs/adr-typed-message-protocol.md)
4. Debt register (items #5 resolved-inbound, #6 outbound): [`DEBT.md`](DEBT.md)
5. Outbound schema registry + parse boundary (Phase 0 scaffold): [`packages/types/src/extension-messages/index.ts`](packages/types/src/extension-messages/index.ts)
6. Outbound message type union source: [`packages/types/src/vscode-extension-host.ts`](packages/types/src/vscode-extension-host.ts) (`ExtensionMessage` interface, line ~26)
7. Ratchet + analysis: [`scripts/verify-message-schemas.mjs`](scripts/verify-message-schemas.mjs) and [`scripts/message-schema-analysis.mjs`](scripts/message-schema-analysis.mjs)
8. Inbound migration as the template (per-domain recipes, verification gates, ratchet mechanics): the 13 Phase-1 sub-tasks and [`docs/handoff-phase1-protocol-migration.md`](docs/handoff-phase1-protocol-migration.md)

## Verified baseline (2026-08-11 — do not re-derive, but re-confirm once)

- Inbound (DONE — do not touch): `WebviewMessage.type` = **165** members, **all 165 registered**, **0 untyped**, `UNTYPED_MESSAGE_LIMIT = 0`.
- Outbound: `ExtensionMessage.type` = **77** members ([`vscode-extension-host.ts:26`](packages/types/src/vscode-extension-host.ts:26)); **5** registered in `extensionMessageSchemas` (Phase 0 scaffold: `state`, `commandExecutionStatus`, `mcpExecutionStatus`, `fileContent`, `indexingStatusUpdate`); **72** untyped; `UNTYPED_EXTENSION_MESSAGE_LIMIT = 72`.
- Both ratchets are wired into CI and currently pass. Run `pnpm --filter @roo-code/types build && node scripts/verify-message-schemas.mjs` once to confirm before starting (inbound must read `0 untyped (limit 0)`; outbound `72 untyped (limit 72)`).

## Goal

Get the outbound untyped count from **72 → 0** by registering every remaining `ExtensionMessage` type, in the priority order below, one `new_task` sub-task per domain. Each landed domain must DECREASE the outbound untyped count and ratchet `UNTYPED_EXTENSION_MESSAGE_LIMIT` down to the new count so CI stays green and progress is forced.

## Phase 2 domain order (priority = traffic volume + security sensitivity)

Each sub-task must extract its own exact type list from the `ExtensionMessage.type` union in `packages/types/src/vscode-extension-host.ts` (the union is the single source of truth). The grouping below is the coordinator's verified mapping — confirm each against the union before delegating (the union has 77 members; the registered 5 are NOT yours):

1. **state variants + UI/navigation** (×18) — `taskHistoryUpdated`, `taskHistoryItemUpdated`, `selectedImages`, `theme`, `workspaceUpdated`, `messageUpdated`, `invoke`, `action`, `acceptInput`, `setHistoryPreviewCollapsed`, `toggleApiConfigPin`, `autoApprovalEnabled`, `updatePrompt`, `ttsStart`, `ttsStop`, `condenseTaskContextStarted`, `condenseTaskContextResponse`. Highest traffic; `state` (already registered) and `action`/`invoke` are the pattern anchors. `action`/`invoke` have narrow string-literal unions already on the interface — model them precisely.
2. **Model/status responses** (×12) — `routerModels`, `openAiModels`, `ollamaModels`, `lmStudioModels`, `vsCodeLmModels`, `vsCodeLmApiAvailable`, `singleRouterModelFetchResponse`, `systemPrompt`, `enhancedPrompt`, `terminalProfiles`, `vsCodeSetting`, `authenticatedUser`. Reuse the typed model-record shapes from `@roo-code/types` (`RouterModels`, `ModelRecord`, …).
3. **Task/chat/history responses** (×15) — `commitSearchResults`, `fileSearchResults`, `listApiConfig`, `mcpServers`, `showDeleteMessageDialog`, `showEditMessageDialog`, `commands`, `insertTextIntoTextarea`, `dismissedUpsells`, `customToolsResult`, `modes`, `taskWithAggregatedCosts`, `openAiCodexRateLimits`, `interactionRequired`, `organizationSwitchResult`. Reuse `HistoryItem`, `Command`, `McpServer`, `GitCommit`, `ProviderSettingsEntry`, `SerializedCustomToolDefinition` types.
4. **Checkpoint/modes responses** (×8) — `currentCheckpointUpdated`, `checkpointInitWarning`, `updateCustomMode`, `deleteCustomMode`, `deleteCustomModeCheck`, `exportModeResult`, `importModeResult`, `checkRulesDirectoryResult`. Reuse `modeConfigSchema`; model `checkpointWarning` precisely (it has an inline union on the interface).
5. **Marketplace responses** (×5) — `marketplaceInstallResult`, `marketplaceBulkInstallResult`, `marketplaceRemoveResult`, `marketplaceData`, `shareTaskSuccess`. Reuse `marketplaceItemSchema` / `MarketplaceItem`.
6. **Code-index responses** (×4) — `indexCleared`, `codebaseIndexConfig`, `codeIndexSettingsSaved`, `codeIndexSecretStatus`. NOTE: `packages/types/src/extension-messages/codeIndex.ts` already exists (with `indexingStatusUpdateMessageSchema`); extend it.
7. **Worktree responses** (×8) — `worktreeList`, `worktreeResult`, `worktreeCopyProgress`, `branchList`, `worktreeDefaults`, `worktreeIncludeStatus`, `branchWorktreeIncludeResult`, `folderSelected`. Reuse `Worktree`, `WorktreeIncludeStatus` from `packages/types/src/worktree.ts`.
8. **Skills/Rules/history-import responses** (×3) — `skills`, `rules`, `rooHistoryImportProgress`. Reuse `SkillMetadata`, `RuleMetadata`; model `rooHistoryImportProgress` precisely (inline shape on the interface).

Sum: 18 + 12 + 15 + 8 + 5 + 4 + 8 + 3 = **73 candidates**; 1 of them (`shareTaskSuccess`) is ALSO a member of the inbound `WebviewMessage` union (direction-mixed — it was registered inbound with a minimal schema in Phase 1). When you register it outbound, update its inbound minimal schema/comment and `DEBT.md` to note the direction-mixing resolution; do NOT remove it from the inbound union in Phase 2 (that is Phase 3 cleanup) — but the outbound registration is authoritative. This yields **72 newly-registered outbound types → 0 untyped**.

## Per-domain implementation recipe (the "same PR per domain" rule — non-negotiable)

Each delegated sub-task must do ALL of the following in one change set:

1. **Schema**: create/extend `packages/types/src/extension-messages/<domain>.ts` with a zod schema per message type (`z.literal("type")` discriminated). REUSE existing schemas and typed interfaces wherever possible (`stateMessageSchema`/`extensionStateSubsetSchema`, `modeConfigSchema`, `marketplaceItemSchema`, `SkillMetadata`, `RuleMetadata`, `Worktree`, `WorktreeIncludeStatus`, `HistoryItem`, `ModelRecord`, `McpServer`, `Command`, `GitCommit`, `QueuedMessage`, …). Payload fields that map to existing typed interfaces should reference those types — never `z.unknown()` unless truly transitional (with a justifying comment). Remember zod strips unknown keys: if the producer includes a field the consumer reads, the schema MUST include it.
2. **Register**: add each schema to `extensionMessageSchemas` AND to the `extensionMessageSchema` discriminated union in `packages/types/src/extension-messages/index.ts`; export the domain module. Watch for name collisions in the barrel (`packages/types/src/index.ts` re-exports both registries — the Phase-1 `CodeIndexMessage` collision set the precedent for disambiguation).
3. **Producer**: the outbound producers live in the EXTENSION core (`src/`) and the CLI (`apps/cli/src/`), plus `webview-ui` has no outbound producers (it CONSUMES). Update the construction sites that post these types in the SAME change set (this is what keeps every domain atomic and breakage-free). Search `postMessageToWebview({ type: "<type>"` and `type: "<type>"` in `src/` and `apps/cli/`.
4. **Consumers**: wire the typed parse at the CONSUMER boundaries in the same change set where the domain's senders change:
    - Webview receive boundary — [`App.tsx`](webview-ui/src/App.tsx) and [`ExtensionStateContext.tsx`](webview-ui/src/context/ExtensionStateContext.tsx): keep the origin-based `isTrustedMessage()` guard; for registered types, run the domain schema (or `parseExtensionMessage`) so malformed producer payloads fail loudly in dev. Do NOT break the unregistered pass-through.
    - CLI boundary — [`apps/cli/src/agent/message-processor.ts`](apps/cli/src/agent/message-processor.ts): it already uses `parseExtensionMessage`; extend its handling for the newly-typed domains.
5. **Tests**:
    - `packages/types/src/extension-messages/__tests__/<domain>.spec.ts` (valid parses, malformed rejected, registry seeded) mirroring the existing per-domain specs (`parseExtensionMessage.spec.ts`, `state`/`execution`/`fileContent` specs).
    - Extend the relevant producer/consumer spec(s) for the domain.
    - Extend `packages/types/src/extension-messages/__tests__/parseExtensionMessage.spec.ts` registry-seed test with the new types.
6. **Ratchet**: after the domain lands and its untyped count is known, add the domain's types to `EXTENSION_MESSAGE_BASELINE` in `scripts/message-schema-analysis.mjs` and ratchet `UNTYPED_EXTENSION_MESSAGE_LIMIT` down to the new verified untyped count. Update the module comment derivation.
7. **Docs**: update `DEBT.md` item #6 count after the domain lands.

## Verification gates (every sub-task must pass before you accept it)

- `pnpm --filter @roo-code/types build` (ESM + CJS + DTS).
- `node scripts/verify-message-schemas.mjs` — outbound untyped count must have DECREASED vs. the previous domain; baseline must include the new types; exit 0. Inbound must stay `0 untyped (limit 0)`.
- `cd packages/types && npx vitest run` — full types suite green.
- `cd src && npx tsc --noEmit` — clean.
- `cd apps/cli && npx tsc --noEmit` (or the CLI's typecheck) — clean if a CLI producer/consumer changed.
- `pnpm --dir src exec eslint --prune-suppressions --max-warnings=0 <touched-files>` — no suppression-count increases.
- Relevant producer/consumer specs green (`cd src && npx vitest run <spec>`; `cd webview-ui && npx vitest run <spec>` if a consumer changed).
- `node --test scripts/verify-message-schemas.spec.mjs` — ratchet specs green.

## Orchestration rules

- Create sub-tasks ONE at a time — `new_task` MUST be called alone, never alongside other tools.
- Domains are largely independent; the ordering above is priority, not hard dependency. Do NOT land the next domain until the previous one's ratchet update is in and CI-green, so `UNTYPED_EXTENSION_MESSAGE_LIMIT` always tracks reality.
- Give each sub-task: the exact domain, its type list (extracted from the union), the files to touch, the implementation recipe (above), the verification gates, and the constraint list (below). Provide rich context so the sub-task is self-contained.
- After each sub-task, spot-check the diff and re-run the ratchet yourself before delegating the next.
- Progress tracking: keep the outbound registered/untyped count visible; after the final domain, the outbound untyped count must be 0 and `UNTYPED_EXTENSION_MESSAGE_LIMIT` must be 0.

## Constraints (pass to every sub-task)

- NO `.changeset` files (maintainers manage them).
- NO new eslint suppressions; no `as any` — prefer typed APIs or precise `unknown` type guards with a justifying comment (double assertions only as a last resort, documented).
- NO floating promises — `void`/`await`/`.catch()` as appropriate.
- Keep the `ExtensionMessage` interface name and all construction sites compiling until a domain is fully migrated (the same-PR rule guarantees this).
- Do NOT touch the inbound `webview-messages` code beyond the documented `shareTaskSuccess` direction-mixing note (Phase 2 is outbound-only; moving types out of `WebviewMessage` is Phase 3).
- Do NOT modify `scripts/message-schema-analysis.mjs`/`verify-message-schemas.mjs` beyond the baseline/limit ratchet updates described above.

## Completion criteria for Phase 2

- Outbound untyped count = **0**; `UNTYPED_EXTENSION_MESSAGE_LIMIT` = 0; all 77 types registered; both ratchets pass (inbound stays 0).
- Every producer posts typed payloads; the webview + CLI consumers parse registered types via `parseExtensionMessage` (no `as any`/`as unknown as ExtensionMessage` remaining on the outbound path).
- The 11 `any` escapes on the `ExtensionMessage` interface (`payload`, `values`, `value`, `settings`, `marketplaceInstalledMetadata`, …) are drained as domains type (track per-domain).
- `DEBT.md` item #6, the ADR, and the review doc updated to the terminal state (Phase 2 ✅ DELIVERED).
- Report: final registered count, final untyped count, domains completed, remaining `any` escapes, and any residual transitional types with rationale (none expected).

Then, with your remaining capacity, produce a Phase 3 hand-off prompt for the direction-mixing cleanup (moving outbound-only types out of `WebviewMessage` — the 11 loose types registered minimally in Phase 1) and dropping the now-vestigial transitional pass-through paths.
```

---

## Notes for the coordinator (context beyond the prompt)

- **Effort:** Phase 2 is ~72 types across 8 sub-tasks; each is smaller than the Phase-1 settings/task domains, so expect ~1–2 days per sub-task with the same-PR discipline.
- **The "Type Lie" is half-closed**: unlike inbound, the outbound producer is trusted (the extension itself), so the primary value is producer-bug detection + the CLI boundary (`message-processor.ts` previously force-cast `as unknown as ExtensionMessage` — the Phase 0 `parseExtensionMessage` fixed the direction-mixing; Phase 2 extends it).
- **Consumer boundary subtlety**: `ExtensionStateContext.tsx` (root state handler) and `App.tsx` receive ALL messages. Registering `state`-adjacent domains means `parseExtensionMessage` will strictly validate them; ensure schemas are NOT stricter than the producers (e.g. `state` uses `Partial<ExtensionState>` with optional heavy fields — mirror the existing `extensionStateSubsetSchema` pattern).
- **Reuse-first:** the codebase already has schemas/types for nearly every payload shape. Sub-tasks should reference these rather than re-typing shapes.
- **`action`/`invoke`/`theme`** are tiny string-literal unions — ideal first candidates for the UI/navigation sub-task to build momentum.
- **Name-collision precedent:** Phase 1 disambiguated `CodeIndexMessage` between the inbound and outbound registries in `packages/types/src/index.ts` (explicit re-export preferring inbound). Expect similar collisions (e.g. `updatePrompt`, `toggleApiConfigPin`, `autoApprovalEnabled` exist in BOTH directions' type unions) — the barrel must stay unambiguous.
