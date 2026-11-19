# ADR: The CLI is a Supported Second Implementation, Not an IPC Client

**Date**: 2026-10-22

**Status**: ✅ ACCEPTED

## Context

`apps/cli` is a headless agent. It was assumed by more than one document to be a thin client that
drives a running extension over `@roo-code/ipc`. That is not what it is.

Facts as of this decision:

- `apps/cli` depends on `@roo-code/core`, `@roo-code/types`, and `@roo-code/vscode-shim`. It does
  **not** depend on `@roo-code/ipc`.
- It vendors its own host emulation and loop: `apps/cli/src/agent/extension-host.ts`,
  `extension-client.ts`, and `message-processor.ts`.
- The extension _does_ expose an `API` class and a local `IpcServer` (`src/extension/api.ts`), but
  the CLI does not consume either.
- The CLI is released as its own artefact (`.github/workflows/cli-release.yml`), so "developer
  tooling only" understates its surface.

The practical consequence is two implementations of the agent loop and **two validated protocol
boundaries**. That is a real cost: a protocol change must land in both places, and a bug fix in one
loop does not fix the other.

## Decision

**Treat the CLI as a supported second implementation of the loop, and enforce protocol parity with
a shared conformance test rather than pretending the duplication does not exist.**

Concretely:

1. Both boundaries validate with the same registry (`@roo-code/types`). Neither may hand-roll
   message parsing.
2. A conformance test asserts that both boundaries reject the same malformed inputs and accept the
   same well-formed ones. Parity is a test, not a convention.
3. Documentation must describe the CLI as a second implementation, never as an IPC client.

### Alternatives considered

- **IPC thin client.** Rejected for now: it requires a running VS Code instance, which defeats the
  CLI's primary use (CI, headless automation, code-server environments). It also requires a
  supported protocol version handshake that does not exist yet.
- **Extract the loop into `@roo-code/core` and have both consume it.** The correct long-term
  answer, but the loop is still entangled with `Task` and the tool layer. A narrowed tool contract
  (`ToolExecutionContext`) is the first prerequisite; this ADR records the direction without
  pretending it is cheap.
- **Drop the CLI.** Rejected: it has released users and a changelog history.

## Consequences

### Positive

- The duplication is named, so reviews can ask "did you update both?" instead of discovering it in
  production.
- Protocol parity is enforced by an executable test rather than by reviewer memory.
- The migration path to a shared loop is explicit and unblocked by the tool-contract work.

### Negative

- Two loops must be maintained until extraction happens.
- The conformance test covers the _boundary_, not behavioural equivalence of the two loops: they can
  still diverge in how they drive tools.

### Neutral

- No user-facing behaviour changes.
- `@roo-code/ipc` remains supported for external editors and automation that _do_ want to drive a
  running extension.

## See also

- [`docs/architecture.md`](../../docs/architecture.md) §5 (containers) and §19 (debt)
- [`adr-typed-message-protocol.md`](adr-typed-message-protocol.md) — the registry both boundaries use
