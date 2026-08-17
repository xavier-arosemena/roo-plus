# ADR: Domain-Split Webview Message Handlers and Extracted Services (S2/S3)

**Date**: 2026-08-17

**Status**: ✅ ACCEPTED

**Decision owners**: Roo+ maintainers

## Context

The webview↔extension boundary was a single entry point: `ClineProvider`
registered one message listener and a monolithic `switch` over
`WebviewMessage.type` dispatched every domain (chat, settings, marketplace,
code-index, worktree, …) in one file. As the typed-message protocol matured
([`adr-typed-message-protocol.md`](adr-typed-message-protocol.md)), three
pressures grew:

1. **Size and reviewability** — one handler file for every domain made PRs
   hard to review and ownership unclear.
2. **Testability** — per-domain logic was only reachable through the full
   provider, so domain tests needed heavyweight fixtures.
3. **Provider surface** — `ClineProvider` accumulated responsibilities beyond
   message handling (marketplace, provider profiles, task history, task
   orchestration), making it the de-facto god-object for extension services.

The protocol ADR's S2/S3 tracks explicitly planned a domain-split dispatcher
and service extraction as the reward for completing the schema registry.

## Decision

Split the inbound webview-message `switch` into **per-domain handler modules**
under [`src/core/webview/handlers/`](../../src/core/webview/handlers/) (chat,
task, settings, providerProfiles, mcp, marketplace, worktree, codeIndex, skills,
rules, commands, terminal, images, debug, misc) and turn
[`webviewMessageHandler.ts`](../../src/core/webview/webviewMessageHandler.ts:24) into
a thin router that maps each message type to its owning module via a
`domainHandlers` table. The router keeps `webviewMessageHandler`'s exact
exported signature so the boundary call sites and spec files are unchanged.

Services with cross-domain lifecycle are extracted into
[`src/core/services/`](../../src/core/services/) — `MarketplaceService`,
`ProviderProfileService`, `TaskHistoryService`, `TaskOrchestrator` — so
`ClineProvider` delegates rather than owns them.

Alternatives considered and rejected:

- **Keep the single-file switch** — rejects the testability and reviewability
  gains; would be unchanged at every protocol migration.
- **Framework-level routing (e.g. a DI container / event bus)** — overkill for
  a fixed, schema-typed message set; the static `domainHandlers` table is
  greppable, type-checked, and CI-verifiable against the registry.

## Consequences

### Positive

- Each domain handler is independently unit-testable
  (e.g. [`codeIndexHandler.spec.ts`](../../src/core/webview/__tests__/codeIndexHandler.spec.ts:1)).
- The router's type-set ↔ handler mapping mirrors the schema registry
  (`webview-messages/`), so a new message type has one obvious place to land.
- `ClineProvider` shrinks to coordination; extracted services get their own
  lifecycle, tests, and reuse.
- The old boundary contract is preserved — no sender or consumer changed.

### Negative

- Splitting added indirection: a message now flows boundary → router → domain
  handler, and cross-cutting concerns (logging, telemetry) must be applied
  consistently in each domain module rather than once.
- Responsibility for keeping the `domainHandlers` table in sync with the
  registry is manual (the ratchet script covers the schema side, not the
  handler wiring).

### Neutral

- Internal refactor; no user-facing behavior change.
- `handlers/` and `services/` grow with each new domain — the canonical home
  for future message logic.

## See Also

- [`adr-typed-message-protocol.md`](adr-typed-message-protocol.md) — the protocol ADR whose S2/S3 tracks this enables
- [`webviewMessageHandler.ts`](../../src/core/webview/webviewMessageHandler.ts:24)
- [`src/core/webview/ClineProvider.ts`](../../src/core/webview/ClineProvider.ts:1180) — the slimmed boundary
