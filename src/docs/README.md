# Documentation & ADR Protocol

This repository separates three kinds of documents. Keeping them distinct
keeps [`docs/`](../../docs/) durable, [`plans/`](../../plans/) ephemeral, and
`src/docs/` (this folder) the permanent record of architectural decisions.

## Where does a document go?

| Location    | Contains                                                                                                                | Tracked in git?    | Examples                                                                                                                             |
| ----------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `src/docs/` | **Architecture Decision Records (ADRs)** and architecture reviews — the _why_ behind decisions, immutable once accepted | ✅ Yes             | [`adr-typed-message-protocol.md`](adr-typed-message-protocol.md)                                                                     |
| `docs/`     | **Living operational documentation** — runbooks and policies that are actively maintained and referenced from CI/docs   | ✅ Yes             | [`RELEASE-WORKFLOWS.md`](../../docs/RELEASE-WORKFLOWS.md), [`SEMBLE-RELEASE-GOVERNANCE.md`](../../docs/SEMBLE-RELEASE-GOVERNANCE.md) |
| `plans/`    | **Temporal plans & execution records** — plans, hand-off prompts, one-off review reports, release-change reports        | ❌ No (gitignored) | `plans/s1-message-protocol.md`, `plans/handoff-phase1-protocol-migration.md`                                                         |

Rule of thumb:

- If a document explains **why a decision was made** and should be cited
  permanently → it is an ADR, in `src/docs/`.
- If a document describes **how the project currently works** and is updated as
  the process evolves → it is living documentation, in `docs/`.
- If a document records **what a session/agent planned or executed at a point
  in time** → it is a plan/execution record, in `plans/` (and is not committed).

## Writing an ADR

1. Copy [`ADR-TEMPLATE.md`](ADR-TEMPLATE.md) into `src/docs/` as
   `adr-<kebab-case-slug>.md` (or `arch-review-<slug>.md` for a review).
2. Fill in **Context → Decision → Consequences**, and a Migration Strategy
   when the decision lands incrementally.
3. Add a row to the index in [`ADR-INDEX.md`](ADR-INDEX.md), keeping the table
   sorted newest-first.
4. Link the ADR from the relevant `CHANGELOG.md` release entry so readers can
   trace decisions back to their rationale.

## ADR lifecycle

- **Proposed** — under discussion, not yet binding.
- **Accepted** — the decision is in effect; the code should match it.
- **Deprecated** — no longer recommended for new work.
- **Superseded by [ADR-…]** — replaced by a newer decision; keep the old ADR
  (history is the point), and link to its replacement.

## Related registers

- [`CHANGELOG.md`](../../CHANGELOG.md) — release notes
- [`DEBT.md`](../../DEBT.md) — technical debt register
