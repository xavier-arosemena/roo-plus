# Documentation & ADR Protocol

This is the **canonical** protocol for where documentation lives in this
repository. It supersedes the copy that used to live in [`src/docs/`](../../src/docs/README.md);
that file is now a pointer here.

## Where does a document go?

| Location                    | Contains                                                                                                                     | Tracked in git?    | Examples                                                                                                       |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------- |
| [`docs/adr/`](ADR-INDEX.md) | **Architecture Decision Records** and architecture reviews — the _why_, immutable once accepted                              | ✅ Yes             | [`adr-typed-message-protocol.md`](adr-typed-message-protocol.md)                                               |
| [`docs/`](../)              | **Living operational documentation** — architecture overview, runbooks, governance policies maintained as the system changes | ✅ Yes             | [`architecture.md`](../architecture.md), [`runbooks/release-publishing.md`](../runbooks/release-publishing.md) |
| `plans/`                    | **Temporal plans & execution records** — plans, hand-off prompts, one-off review reports                                     | ❌ No (gitignored) | `plans/s1-message-protocol.md`                                                                                 |

Rule of thumb:

- Explains **why a decision was made** and should be cited permanently → **ADR**, in `docs/adr/`.
- Describes **how the project currently works** and is updated as it evolves → **living doc**, in `docs/`.
- Records **what a session/agent planned or executed at a point in time** → **plan**, in `plans/` (not committed).

> This split is enforced, not aspirational: [`scripts/verify-adr-index.mjs`](../../scripts/verify-adr-index.mjs)
> fails if the index links a file that does not exist, if an ADR is not listed, or if an index row
> states a status outside the vocabulary below. Run `pnpm verify:adr-index`.

## Writing an ADR

1. Copy [`ADR-TEMPLATE.md`](ADR-TEMPLATE.md) into `docs/adr/` as `adr-<kebab-case-slug>.md`
   (or `arch-review-<slug>.md` for a review).
2. Fill in **Context → Decision → Consequences**, plus a **Migration Strategy** when the decision
   lands incrementally, and a **Revision** section if a later decision changes part of it.
3. Add a row to [`ADR-INDEX.md`](ADR-INDEX.md), keeping the table sorted newest-first.
4. Link the ADR from the relevant `CHANGELOG.md` release entry so readers can trace a decision
   back to its rationale.

## ADR lifecycle

- **Proposed** — under discussion, not yet binding.
- **Accepted** — in effect; the code should match it.
- **Deprecated** — no longer recommended for new work.
- **Superseded by [ADR-…]** — replaced by a newer decision. Keep the old ADR (history is the
  point) and link to its replacement.

## Revising an accepted ADR

An accepted ADR is immutable _as a record_, but a decision can change. When it does:

1. Append a dated `## Revision (YYYY-MM-DD)` section stating what changed and why, and set
   `**Status**: ✅ ACCEPTED · **Revised YYYY-MM-DD**`.
2. **Update the index row in the same commit.** The index is a pointer to the decision's current
   state — if it paraphrases an old version, it becomes a false compliance statement. This exact
   failure happened with the binary-acquisition ADR (see
   [`adr-binary-acquisition-strategy.md`](adr-binary-acquisition-strategy.md) and index row 1).

## Related registers

- [`docs/architecture.md`](../architecture.md) — how the system works today
- [`ADR-INDEX.md`](ADR-INDEX.md) — every decision, newest first
- [`CHANGELOG.md`](../../CHANGELOG.md) — release notes
- [`DEBT.md`](../../DEBT.md) — technical debt register
- [`docs/runbooks/`](../runbooks/) — operational procedures
