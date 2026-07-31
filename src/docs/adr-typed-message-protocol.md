# ADR: Typed + Runtime-Validated Webview Message Protocol

**Date**: 2026-07-31

**Status**: ✅ ACCEPTED

## Context

The webview↔extension message protocol was a flat [`WebviewMessage`](packages/types/src/vscode-extension-host.ts) interface with a ~187-member literal `type` union and dozens of optional payload fields. Two structural problems resulted:

- **Type Lie** — payloads were not tied to their `type`: any message variant could carry any optional field, so the type system could not express "this type has exactly this payload." Handlers relied on `as any` casts (`message.values as any`, `message.settings as any`).
- **Input Gap** — the webview→extension boundary performed **zero runtime validation**. A compromised or crafted webview could send any message shape and it would be dispatched unchecked to handlers. The CLI inbound path ([`apps/cli/src/agent/message-processor.ts`](apps/cli/src/agent/message-processor.ts)) had the same gap.

Direction mixing compounded this: inbound `WebviewMessage` also contained outbound-only types (`indexingStatusUpdate`, `marketplaceBulkInstallResult`, `importModeResult`, …) that belong in `ExtensionMessage`.

## Decision

**Adopt a zod schema registry as the single source of truth** — chosen over:

- **Option B: Big-bang conversion of all ~187 types** — high churn and regression risk; would block release.
- **Option C: Hand-written parallel types** — reintroduces drift between the schema and the TypeScript type.
- **Option D: Hand-rolled runtime guards only** — no schema as single source of truth, no `z.infer` type derivation.

The chosen approach:

- Each message type gets a zod schema; the TypeScript type is `z.infer` of the schema union. No hand-written parallel types.
- Boundary [`parseWebviewMessage(raw)`](packages/types/src/webview-messages/index.ts) is applied at [`ClineProvider.setWebviewMessageListener`](src/core/webview/ClineProvider.ts) and the CLI [`message-processor.ts`](apps/cli/src/agent/message-processor.ts): **registered types are validated strictly and fail closed** (malformed → logged and rejected, never dispatched); **unregistered types pass through** a structural check (`typeof type === "string"`) so nothing regresses mid-migration.
- Direction-mixed outbound-only types move from `WebviewMessage` into `ExtensionMessage`.

## Migration Strategy (incremental, ratchetable)

- **S1-M1 — Foundation** in [`packages/types/src/webview-messages/`](packages/types/src/webview-messages/index.ts): per-domain zod modules, registry `webviewMessageSchemas`, `parseWebviewMessage`, and `webviewMessageSchema = z.discriminatedUnion("type", …)` for the fully-typed subset.
- **S1-M2 — Boundary validation** at `ClineProvider.setWebviewMessageListener` and the CLI (closes the Input Gap; = X3).
- **S1-M3 — Security-sensitive domains first** (16 types): checkpoint, allowed/deniedCommands, updateSettings, provider config (save/upsert), marketplace installs, message queue, todos, custom modes.
- **S1-M4 — Ratchet + broaden** ([`scripts/verify-message-schemas.mjs`](scripts/verify-message-schemas.mjs) wired into [`.github/workflows/code-qa.yml`](.github/workflows/code-qa.yml)).

Each domain's sender, handler, and tests migrate in the **same PR**; the `WebviewMessage` interface name and construction sites are preserved until a domain is fully migrated, so no sender breaks mid-transition.

## What Shipped

- **16 security-sensitive message types** fully typed + runtime-validated (checkpoint, allowed/deniedCommands, updateSettings, provider config, marketplace installs, message queue, todos, custom modes).
- **10 direction-mixed types** moved from `WebviewMessage` into `ExtensionMessage`.
- **CI ratchet** enforces the 16 baseline types stay registered and the untyped count (149 of 165 total `WebviewMessage.type` members) never increases.

This decision unlocked **S2** (domain-split dispatcher under [`src/core/webview/handlers/`](src/core/webview/handlers/)) and **S3** (slimmed `ClineProvider` with extracted services in [`src/core/services/`](src/core/services/)), documented in the changelog.

## Remaining Work

- **149 transitional (unregistered) message types** still rely on the pass-through path; the ratchet forbids the count from increasing, and broadening is ongoing (worktree ×12, marketplace ×7, skills ×6, rules ×5, code-index ×10, terminal ×9, images ×4, debug ×4, misc).
- **Outbound `ExtensionMessage` (87 types)** has not yet received the same discriminated-union/zod treatment — lower priority because the extension is the trusted producer.

## Consequences

### Positive

- Malformed or crafted webview messages are rejected at the boundary instead of dispatched (closes the runtime Input Gap).
- 16 security-sensitive domains (command allow/deny, provider config, marketplace installs, user message queue, todos, custom modes) now have schema-typed payloads with no `as any` casts.
- Types and schemas cannot drift — the TypeScript type is derived from the schema.
- The CI ratchet makes protocol hygiene enforced and prevents regression.

### Negative

- Two code paths exist during the transition: strict validation for registered types, pass-through for unregistered ones.
- Deriving the full `updateSettings`/`RooCodeSettings` schema incrementally required care (`strict: false` allow-list semantics for the transitional period).
- ~149 types remain transitional and are not yet runtime-validated.

### Neutral

- No user-facing behavior changed; the refactor is internal.
- The `WebviewMessage` and `ExtensionMessage` interface names are preserved; [`src/shared/WebviewMessage.ts`](src/shared/WebviewMessage.ts) now re-exports from `@roo-code/types`.

## See Also

- Plan: [`plans/s1-message-protocol.md`](plans/s1-message-protocol.md) — S1-M1..M4 milestones, S2/S3 unlock, X1/X2 tracks
