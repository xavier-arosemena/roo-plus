# ADR: Typed + Runtime-Validated Webview Message Protocol

**Date**: 2026-07-31

**Status**: ✅ ACCEPTED

## Context

The webview↔extension message protocol was a flat [`WebviewMessage`](../../packages/types/src/vscode-extension-host.ts) interface with a 165-member literal `type` union and dozens of optional payload fields. Two structural problems resulted:

- **Type Lie** — payloads were not tied to their `type`: any message variant could carry any optional field, so the type system could not express "this type has exactly this payload." Handlers relied on `as any` casts (`message.values as any`, `message.settings as any`).
- **Input Gap** — the webview→extension boundary performed **zero runtime validation**. A compromised or crafted webview could send any message shape and it would be dispatched unchecked to handlers. The CLI inbound path ([`apps/cli/src/agent/message-processor.ts`](../../apps/cli/src/agent/message-processor.ts)) had the same gap.

Direction mixing compounded this: inbound `WebviewMessage` also contained outbound-only types (`indexingStatusUpdate`, `marketplaceBulkInstallResult`, `importModeResult`, …) that belong in `ExtensionMessage`.

## Decision

**Adopt a zod schema registry as the single source of truth** — chosen over:

- **Option B: Big-bang conversion of all 165 types** — high churn and regression risk; would block release.
- **Option C: Hand-written parallel types** — reintroduces drift between the schema and the TypeScript type.
- **Option D: Hand-rolled runtime guards only** — no schema as single source of truth, no `z.infer` type derivation.

The chosen approach:

- Each message type gets a zod schema; the TypeScript type is `z.infer` of the schema union. No hand-written parallel types.
- Boundary [`parseWebviewMessage(raw)`](../../packages/types/src/webview-messages/index.ts) is applied at [`ClineProvider.setWebviewMessageListener`](../../src/core/webview/ClineProvider.ts) and the CLI [`message-processor.ts`](../../apps/cli/src/agent/message-processor.ts): **registered types are validated strictly and fail closed** (malformed → logged and rejected, never dispatched); **unregistered types pass through** a structural check (`typeof type === "string"`) so nothing regresses mid-migration.
- Direction-mixed outbound-only types move from `WebviewMessage` into `ExtensionMessage`.

## Migration Strategy (incremental, ratchetable)

- **S1-M1 — Foundation** in [`packages/types/src/webview-messages/`](../../packages/types/src/webview-messages/index.ts): per-domain zod modules, registry `webviewMessageSchemas`, `parseWebviewMessage`, and `webviewMessageSchema = z.discriminatedUnion("type", …)` for the fully-typed subset.
- **S1-M2 — Boundary validation** at `ClineProvider.setWebviewMessageListener` and the CLI (closes the Input Gap; = X3).
- **S1-M3 — Security-sensitive domains first** (16 types): checkpoint, allowed/deniedCommands, updateSettings, provider config (save/upsert), marketplace installs, message queue, todos, custom modes.
- **S1-M4 — Ratchet + broaden** ([`scripts/verify-message-schemas.mjs`](../../scripts/verify-message-schemas.mjs) wired into [`.github/workflows/code-qa.yml`](../../.github/workflows/code-qa.yml)).

Each domain's sender, handler, and tests migrate in the **same PR**; the `WebviewMessage` interface name and construction sites are preserved until a domain is fully migrated, so no sender breaks mid-transition.

## What Shipped

- **16 security-sensitive message types** fully typed + runtime-validated (checkpoint, allowed/deniedCommands, updateSettings, provider config, marketplace installs, message queue, todos, custom modes).
- **Phase 1 (DELIVERED 2026-08-11)**: all **165** `WebviewMessage.type` members registered in `webviewMessageSchemas` — **0 untyped**, `UNTYPED_MESSAGE_LIMIT = 0`. Landed as 13 atomic per-domain change sets (terminal, worktree, code-index, marketplace, images, skills+rules, commands, provider-profiles, settings, task, chat, mcp, debug+misc+loose) following the same-PR rule (schema + registry + handler + sender + tests + ratchet together). Handlers now consume `z.infer` domain unions with no `as any` payload casts.
- **10 direction-mixed types** moved from `WebviewMessage` into `ExtensionMessage`.
- **CI ratchet** enforces the 165 baseline types stay registered and the untyped count never increases (now 0/165).
- **Outbound scaffold (Phase 0)**: [`parseExtensionMessage`](../../packages/types/src/extension-messages/index.ts) + `extensionMessageSchemas` registry with 5 baseline types (state, commandExecutionStatus, mcpExecutionStatus, fileContent, indexingStatusUpdate) and an outbound ratchet (`EXTENSION_MESSAGE_BASELINE`, limit 72).
- **Phase 2 (DELIVERED 2026-08-11)**: all **77** `ExtensionMessage.type` members registered in `extensionMessageSchemas` — **0 untyped**, `UNTYPED_EXTENSION_MESSAGE_LIMIT = 0`. Landed as 8 atomic per-domain change sets (UI/navigation+state variants, model/status, task/chat/history, checkpoint/modes, marketplace, code-index, worktree, skills/rules/history-import) following the same-PR rule (schema + registry + producer + consumer + tests + ratchet together). Both directions are now fully typed: the outbound "Type Lie" is closed. The webview boundary (`App.tsx`, `ExtensionStateContext.tsx`, per-domain consumers) and the CLI boundary (`apps/cli/src/agent/message-processor.ts`) strictly validate all registered outbound types via `parseExtensionMessage`.
- **Phase 3 (DELIVERED 2026-08-12)**: completion & close-out — the direction-mixing cleanup classified the 11 "loose" inbound types: `marketplaceButtonClicked` (outbound-only `action` value) and `shareTaskSuccess` (direction-mixed, OUTBOUND registration authoritative) moved out of the inbound union, 8 confirmed-dead types removed (`currentApiConfigName`, `updateCondensingPrompt`, `playSound`, `setopenAiCustomModelInfo`, `codebaseIndexEnabled`, `cancelMarketplaceInstall`, `imageGenerationSettings`, `switchMode`), and `draggedImages` (genuinely inbound — live sender in `ChatTextArea.tsx`) typed with its real `dataUrls` payload. Inbound union **165 → 155**, all registered, **0 untyped**. The vestigial unregistered pass-through branches in [`parseWebviewMessage`](../../packages/types/src/webview-messages/index.ts) / [`parseExtensionMessage`](../../packages/types/src/extension-messages/index.ts) were dropped — both boundaries are now **hard-allowlist fail-closed** (unknown types rejected). Every interface-level `any` escape on `ExtensionMessage`/`ExtensionState`/`WebviewMessage` was drained: `payload`/`settings`/`config` removed (dead), `value` → `boolean \| number`, `values` → `Record<string, unknown>` (documented free-form `switchTab` passthrough), `settings` → `CodebaseIndexConfig`, `todos` → `TodoItem[]`, `marketplaceInstalledMetadata` → `MarketplaceInstalledMetadata` — **zero `any`** remaining on the message interfaces. DEBT #5/#6 moved to the "Recently Resolved Debt" table.

This decision unlocked **S2** (domain-split dispatcher under [`src/core/webview/handlers/`](../../src/core/webview/handlers/)) and **S3** (slimmed `ClineProvider` with extracted services in [`src/core/services/`](../../src/core/services/)), documented in the changelog.

## Remaining Work

**None — the migration is COMPLETE.** Terminal state (verified 2026-08-12):

- Inbound `WebviewMessage.type` = **155** members, all registered, **0 untyped** (`UNTYPED_MESSAGE_LIMIT = 0`).
- Outbound `ExtensionMessage.type` = **77** members, all registered, **0 untyped** (`UNTYPED_EXTENSION_MESSAGE_LIMIT = 0`).
- `parseWebviewMessage` / `parseExtensionMessage` reject unknown/unregistered types — no pass-through remains.
- Zero `any` on either message interface; `values` is the only documented `unknown`-typed field (free-form `switchTab` passthrough) on both interfaces.

## Consequences

### Positive

- Malformed or crafted webview messages are rejected at the boundary instead of dispatched (closes the runtime Input Gap).
- 16 security-sensitive domains (command allow/deny, provider config, marketplace installs, user message queue, todos, custom modes) now have schema-typed payloads with no `as any` casts.
- Types and schemas cannot drift — the TypeScript type is derived from the schema.
- The CI ratchet makes protocol hygiene enforced and prevents regression.

### Negative

- The transitional two-path boundary (strict validation for registered types + pass-through for unregistered ones) is gone: both `parseWebviewMessage` and `parseExtensionMessage` are now hard-allowlist fail-closed — unknown/unregistered types are rejected at the boundary, never dispatched.
- Deriving the full `updateSettings`/`RooCodeSettings` schema incrementally required care (`strict: false` allow-list semantics for the transitional period).
- Both directions are fully typed and runtime-validated at their boundaries; a few outbound union members remain registered minimally because they are vestigial (no outbound producer — `vsCodeLmApiAvailable`, `authenticatedUser`, `organizationSwitchResult`, `codebaseIndexConfig`, `shareTaskSuccess`) — documented per-domain.

### Neutral

- No user-facing behavior changed; the refactor is internal.
- The `WebviewMessage` and `ExtensionMessage` interface names are preserved; [`src/shared/WebviewMessage.ts`](../../src/shared/WebviewMessage.ts) now re-exports from `@roo-code/types`.

## See Also

- Plan: [`plans/s1-message-protocol.md`](../../plans/s1-message-protocol.md) — S1-M1..M4 milestones, S2/S3 unlock, X1/X2 tracks
