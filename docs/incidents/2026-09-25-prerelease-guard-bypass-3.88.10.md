# Incident: pre-release guard bypass published stable-prep `3.88.10` as a pre-release

**Date**: 2026-09-25
**Severity**: Medium — a version was consumed on two registries; no user-facing outage, no data loss
**Owner**: release engineering
**Affected artifacts**: `xavier-arosemena.roo-plus@3.88.10` (flag: pre-release) on the VS Code Marketplace and Open VSX
**Related**: [`docs/adr/adr-release-versioning-policy.md`](../adr/adr-release-versioning-policy.md), [`docs/runbooks/release-publishing.md`](../runbooks/release-publishing.md)

## Summary

The stable-prep PR [#380](https://github.com/xavier-arosemena/roo-plus/pull/380)
(`chore: prepare v3.88.10 stable release`) was merged to `master` with a **merge
commit**. That push triggered `.github/workflows/pre-release-publish.yml`, whose
release-prep guard **failed to detect the merge**, so the workflow **published
`3.88.10` as a pre-release** to both registries instead of skipping.

Because a version that exists on a registry cannot be re-published, `3.88.10`
could no longer be released as stable. The stable was shipped as **`3.88.11`**
(see [Resolution](#resolution)).

## Root cause

The guard's merge branch depends on `git rev-parse --verify HEAD^2`
([`pre-release-publish.yml`](../../.github/workflows/pre-release-publish.yml:103)).
The `Checkout code` step did **not** set `fetch-depth: 0`, so the default
**depth-1 shallow checkout** contained only the tip object. The parent SHAs are
recorded in the merge commit object, but the parent objects themselves were
absent, so `HEAD^2` was unresolvable → the "Merge brought in release-prep"
branch never fired → `skip=false`.

The remaining detection path, `git log -1 --format=%s`, only matches a
**non-merge** tip (a direct push), so a merge-pushed stable-prep slipped through.

## Evidence

| Item | Value |
| --- | --- |
| Run | [`actions/runs/36126444728`](https://github.com/xavier-arosemena/roo-plus/actions/runs/36126444728) (merge push `c6975c50e`) |
| Guard step | `Skip if this push is a release merge` → `skip=false` |
| Publish steps | `Publish pre-release to VS Code Marketplace` **and** `… to Open VSX Registry` both executed |
| VS Marketplace | `3.88.10` → HTTP 200 with `Microsoft.VisualStudio.Code.PreRelease=true` |
| Open VSX | `3.88.10` published; `latest` moved to it (until `3.88.11` outranked it) |
| Tag / release | none created (the stable workflow owns tags) |

Control probes during verification: `3.88.99` and `3.88.8` → HTTP 404 on the
Marketplace, confirming the 200 for `3.88.10` was real.

## Impact

- `3.88.10` consumed on **both** registries, so the intended stable could not use it.
- Open VSX `latest` pointed at a **pre-release** build until stable `3.88.11` shipped.
- The shipped extension **code** was unchanged; the failure was purely a
  version/provenance hijack.
- No loud failure: every workflow step reported success. **That is the defect.**

## Detection

Manual registry probing during release verification (Marketplace gallery API +
Open VSX API). The pipeline itself was green, which is why this was invisible to
CI.

## Resolution

1. **Stable shipped as `3.88.11`** — cut from `master`, merged with a **rebase**
   merge so `master`'s tip is a plain single-parent commit whose subject matches
   the committed `release_re` (the guard's *direct-push* branch, which does not
   need `HEAD^2`). Then `Publish Stable Extension` was dispatched on `master`
   (run `36134895485`), publishing to both registries and creating the
   `v3.88.11` tag/release.
2. **Guard hardening** (same PR as the parked upstream-sync WIP, as its own
   commit):
   - `fetch-depth: 0` on the pre-release checkout — the root fix for `HEAD^2`.
   - **Fail-closed history guard** — if HEAD is a merge commit but `HEAD^2` is
     unavailable, the run **fails** instead of publishing.
   - **Cross-registry duplicate guard** — the pre-release guard now checks the
     **VS Code Marketplace** in addition to Open VSX, and `marketplace-publish.yml`
     gained a fail-closed pre-flight that refuses a version that already exists on
     either registry.

## Preventive actions

- Prefer a **rebase** merge for stable-prep branches; alternatively land the
  guard fix on `master` *before* merging release-prep work. With the fail-closed
  guard in place a silent hijack is no longer possible — it turns red instead.
- Verify the pre-release run for a stable-prep merge reports `skip=true`.
- Documented end-to-end in [`docs/runbooks/release-publishing.md`](../runbooks/release-publishing.md).

## Considered and rejected: unpublishing `3.88.10`

- `vsce unpublish` removes the **entire extension**; there is no per-version
  delete in `vsce` (`vsce --help`; [microsoft/vscode-vsce#846](https://github.com/microsoft/vscode-vsce/issues/846)).
- Per-version deletion is not supported through the CLI/API and requires emailing
  `VSMarketplace@microsoft.com`.
- The Marketplace **rejects** re-publishing an existing version number, so a
  non-destructive edit of `3.88.10` into the stable was not possible.
- Unpublishing also breaks publishers' policy expectations for users who pinned
  the version, and Open VSX had already promoted `3.88.10` to `latest`.

**Conclusion**: moving the stable to the next patch (`3.88.11`) was the correct
and only safe path.
