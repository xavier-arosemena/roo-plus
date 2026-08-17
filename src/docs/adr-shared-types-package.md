# ADR: Shared `@roo-code/types` Package as the Single Source of Truth

**Date**: 2026-08-17

**Status**: ✅ ACCEPTED

**Decision owners**: Roo+ maintainers

## Context

The fork ships four surfaces that share a protocol and domain model: the VS
Code extension (`src/`), the headless CLI (`apps/cli`), the React webview
(`webview-ui`), and internal workspace packages (`@roo-code/core`, `@roo-code/ipc`,
`@roo-code/telemetry`, `@roo-code/vscode-shim`). Historically, types, constants,
and provider model catalogs lived inside the extension source and were
duplicated or re-declared at each boundary.

The typed-message-protocol work ([`adr-typed-message-protocol.md`](adr-typed-message-protocol.md))
made the problem structural: both boundaries (`webview↔extension` and
`extension↔CLI`) need **one** zod schema registry that producers and consumers
share. If the schema lived in the extension, the CLI and webview could not
import it without pulling the whole extension in — and drift between the schema
and the TypeScript type was exactly the "Type Lie" the protocol ADR set out to
kill. At the same time the provider model registry (context windows, capability
flags, pricing) was needed by all surfaces so the UI, API layer, and CLI agree
on what a model can do.

## Decision

Extract a dedicated workspace package — [`packages/types`](../../packages/types/package.json:1),
published as **`@roo-code/types`** ([`packages/types/package.json`](../../packages/types/package.json:2)) —
as the single source of truth for everything the surfaces share:

- Domain interfaces and their zod schemas, including the **message protocol
  registries** [`packages/types/src/webview-messages/index.ts`](../../packages/types/src/webview-messages/index.ts:1)
  (inbound) and [`packages/types/src/extension-messages/index.ts`](../../packages/types/src/extension-messages/index.ts:1)
  (outbound), with `z.infer` deriving the TypeScript types from the schemas.
- The provider model catalog (`providers/`), `provider-identifiers`, and shared
  constants (defaults, thresholds, timeouts).
- Barrel re-exports via [`packages/types/src/index.ts`](../../packages/types/src/index.ts:1)
  plus subpath exports (`@roo-code/types/model`, `@roo-code/types/provider-identifiers`).

The extension, CLI, webview, and sibling packages all import from this one
package — e.g. extension [`src/extension/api.ts`](../../src/extension/api.ts:21),
CLI boundary [`apps/cli/src/agent/message-processor.ts`](../../apps/cli/src/agent/message-processor.ts:26),
and webview boundary [`webview-ui/src/App.tsx`](../../webview-ui/src/App.tsx:5) —
so a type/schema change is compiled against every consumer in one build.

Alternatives considered and rejected:

- **Keep types in the extension and re-declare at each boundary** — reintroduces
  the drift the protocol ADR eliminated; each surface would re-implement
  validation with its own (diverging) copy.
- **A single giant "everything" package** — no; `@roo-code/types` is deliberately
  dependency-light (zod only) so the CLI/webview bundles stay small and the
  package stays importable from every runtime.

## Consequences

### Positive

- One definition of every shared type/schema; the TypeScript type cannot drift
  from the runtime schema.
- The message registries are consumed identically by the extension, CLI, and
  webview boundaries, making the fail-closed validation uniform everywhere.
- Provider/model capability data is shared, so the API layer, settings UI, and
  CLI agree on context windows, pricing, and feature flags.
- Small, fast-to-build package with clear ownership and its own tests.

### Negative

- Changing a shared type now compiles against all consumers, so cross-surface
  changes are inherently wider PRs (mitigated by the same-PR rule in the
  protocol ADR).
- The package barrel must explicitly disambiguate name collisions between the
  inbound and outbound registries (e.g. `CodeIndexMessage`,
  [`packages/types/src/index.ts`](../../packages/types/src/index.ts:42)) — a small
  ongoing maintenance cost.

### Neutral

- Internal refactor; no user-facing behavior change.
- `src/shared/WebviewMessage.ts` remains as a re-export shim
  ([`src/shared/WebviewMessage.ts`](../../src/shared/WebviewMessage.ts:1)) so legacy
  import sites keep working.

## See Also

- [`adr-typed-message-protocol.md`](adr-typed-message-protocol.md) — the protocol decision this package enables
- [`adr-webview-handler-decomposition.md`](adr-webview-handler-decomposition.md) — consumer-side dispatch
- [`packages/types/package.json`](../../packages/types/package.json:1)
