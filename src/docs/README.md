# Documentation & ADR Protocol — moved

The canonical protocol now lives in **[`docs/adr/README.md`](../../docs/adr/README.md)**.

This file is kept as a pointer so existing references (issues, PRs, ADRs, review notes) keep
resolving.

## Why it moved

ADRs have lived in [`docs/adr/`](../../docs/adr/) for some time, but the protocol document told
contributors to put them in `src/docs/`. Two sources of truth for the same rule produced exactly
the drift you would expect: contributors filed decisions in the wrong directory, and the index
linked files that did not exist.

`docs/adr/` is now canonical because:

- it sits next to the records it governs;
- it is inside the documentation tree the doc-link gate already scans;
- `src/docs/` remains a valid home for **code-adjacent** notes, but not for decisions.

## Quick reference

| If you are writing…                         | Put it in                                                                               |
| ------------------------------------------- | --------------------------------------------------------------------------------------- |
| A decision with lasting consequences        | [`docs/adr/`](../../docs/adr/) + a row in [`ADR-INDEX.md`](../../docs/adr/ADR-INDEX.md) |
| A description of how the system works today | [`docs/`](../../docs/) (e.g. [`architecture.md`](../../docs/architecture.md))           |
| A plan or execution record for one session  | `plans/` (gitignored, not committed)                                                    |

Enforcement: `pnpm verify:adr-index` ([`scripts/verify-adr-index.mjs`](../../scripts/verify-adr-index.mjs)).
