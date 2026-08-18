# Roo+ Release Workflows

**Status:** ✅ ACTIVE · **Owner:** Roo+ maintainers · **Applies to:** this repository's GitHub Actions release pipelines

This document describes how Roo+ ships code through the **pre-release** channel (for testing) and the **stable** channel (for everyone), and which workflow does what. The goal is a "pre-release first" flow: every push to `master` produces an installable pre-release build, and a stable release is published only when the pre-release has been validated.

---

## 1. The three release workflows

There are exactly **three** release-related workflows. Two publish to the marketplaces; the third is a validation gate that never publishes.

| Workflow                        | File                                                                        | Trigger                            | What it does                                                                                                               | Publishes?     |
| ------------------------------- | --------------------------------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------- |
| **Publish Pre-release Version** | [`pre-release-publish.yml`](../.github/workflows/pre-release-publish.yml:1) | Push to `master` + manual dispatch | Builds the newest code as a semver pre-release and publishes it to the VS Code Marketplace and Open VSX pre-release tracks | ✅ Pre-release |
| **Publish Stable Extension**    | [`marketplace-publish.yml`](../.github/workflows/marketplace-publish.yml:1) | Tag `v*.*.*` + manual dispatch     | Builds the tagged version and publishes it as the stable release (marketplaces + GitHub release)                           | ✅ Stable      |
| **Release Validation**          | [`release-validation.yml`](../.github/workflows/release-validation.yml:1)   | PRs touching release files         | Verifies release readiness (submodule pin, identity, metadata, build, package, README sync) before merge                   | ❌ Gate only   |

All three share their pre-flight logic through one composite action — [`prepare-extension/action.yml`](../.github/actions/prepare-extension/action.yml:1) — which validates the submodule pin, `.roomodes` sync, package identity, publish ref, and marketplace tokens.

---

## 2. The release lifecycle

```
push to master ──► Publish Pre-release Version ──► marketplace "Install Pre-Release Version"
                                                        │
                                                        ▼
                                               testers validate
                                                        │
                                                        ▼
tag vX.Y.Z ──► Publish Stable Extension ──► marketplace "Install" (stable)
                                                        │
                                                        ▼
                                          GitHub release + VSIX asset
```

1. **Pre-release channel** — every merge to `master` triggers [`pre-release-publish.yml`](../.github/workflows/pre-release-publish.yml:1). Testers opt in via the marketplace's **"Install Pre-Release Version"** dropdown and always run the newest code.
2. **Validation gate** — before a stable version is cut, [`release-validation.yml`](../.github/workflows/release-validation.yml:1) runs on the release PR and fails fast on any packaging/identity/metadata problem.
3. **Stable channel** — when the pre-release has been validated, maintainers tag the release (`vX.Y.Z`) and [`marketplace-publish.yml`](../.github/workflows/marketplace-publish.yml:1) ships it as the stable version to both marketplaces and creates the GitHub release.

### Versioning scheme

- **Stable:** plain semver from `src/package.json` (e.g. `3.78.0`), must match the release tag (`v3.78.0`).
- **Pre-release:** derived from `src/package.json` using the "next odd minor" rule so it always outranks the latest stable (a marketplace requirement for offering the pre-release), with a valid semver pre-release identifier:

    `{major}.{nextOddMinor}.0-pre-release.{run_number}` → e.g. `3.79.0-pre-release.123`

    The `-pre-release.<run>` identifier is what makes the marketplace treat it as a genuine pre-release (in addition to the `Microsoft.VisualStudio.Code.PreRelease` manifest flag set by `vsce package --pre-release`).

### Known trade-off

Open VSX's `latest` alias resolves to the highest semver across stable **and** pre-release, so a pre-release like `3.79.0-pre-release.123` can transiently become `latest` until the next stable (`3.79.0`) outranks it. This mirrors how Marketplace pre-release users already track the newest build and is an accepted trade-off (see the note in [`pre-release-publish.yml`](../.github/workflows/pre-release-publish.yml:168)).

---

## 3. How to release

### Publish a pre-release (automatic)

Nothing to do — it happens on every push to `master`. To publish one manually (e.g. for an out-of-band test build):

1. Open **Actions → Publish Pre-release Version → Run workflow**.
2. Confirm the branch is `master`. The workflow validates this and refuses other refs.
3. The run skips automatically when the head commit matches a `chore: prepare vX.Y.Z release` release-prep merge, so a stable release never races a pre-release.

### Publish a stable release

1. Merge the release PR (bumped `src/package.json`, updated `CHANGELOG.md`/`src/CHANGELOG.md`) — [`release-validation.yml`](../.github/workflows/release-validation.yml:1) confirms it is release-ready.
2. Tag the release commit and push the tag:
    ```bash
    git tag v3.79.0
    git push origin v3.79.0
    ```
    The tag must match `src/package.json` exactly or [`marketplace-publish.yml`](../.github/workflows/marketplace-publish.yml:1) aborts.
3. The workflow publishes to VS Code Marketplace and Open VSX, then creates (or updates) the GitHub release `v3.79.0` with the VSIX attached and changelog notes.
4. Manual dispatch from `master` is also supported; it runs the PR-approval gate and respects the `marketplace-production` environment protection.

> **Rollback:** a broken stable release is fixed by shipping the **next** tag (`v3.79.1`), never by mutating an existing tag. The VSIX of every run is kept as a run artifact for 7 days for audit/manual install.

---

## 4. Environments & secrets

| Environment              | Used by                                                                      | Secrets                                   |
| ------------------------ | ---------------------------------------------------------------------------- | ----------------------------------------- |
| `marketplace-prerelease` | [`pre-release-publish.yml`](../.github/workflows/pre-release-publish.yml:26) | `VSCE_PAT`, `OVSX_PAT`, `POSTHOG_API_KEY` |
| `marketplace-production` | [`marketplace-publish.yml`](../.github/workflows/marketplace-publish.yml:99) | `VSCE_PAT`, `OVSX_PAT`, `POSTHOG_API_KEY` |

- `VSCE_PAT` — VS Code Marketplace PAT (Manage scope, publisher `xavier-arosemena`). Read by `vsce` via the `VSCE_PAT` env var.
- `OVSX_PAT` — Open VSX access token (publisher `xavier-arosemena`). Read by `ovsx` via the `OVSX_PAT` env var.
- If a token is unset, the corresponding registry's publish step is **skipped with a warning** (so an Open-VSX-only setup works); a configured but invalid token **hard-fails** (`vsce verify-pat`).

---

## 5. Safety & audit properties

- **Least privilege:** both publish workflows run with `contents: read` at the workflow level; only the publish jobs escalate to `contents: write` (`marketplace-publish`) for GitHub-release creation.
- **Concurrency guards:** `marketplace-production` (stable) and `marketplace-prerelease` (pre-release) groups prevent overlapping publishes from racing on the same version.
- **Approval gate:** manual stable dispatches require either a write/admin actor or an approved PR; tag pushes skip the gate because they already require write access.
- **Identity + packaging checks:** every run re-verifies package name/publisher both in source and inside the packaged VSIX, and greps the archive for required assets before any publish.
- **Release-merge suppression:** a pre-release run triggered by a `chore: prepare vX.Y.Z release` commit is skipped so the stable release isn't contaminated by a same-commit pre-release.

---

## 6. Related governance

The Semble binary that powers the local code-index has its own independent release policy (immutable tags, version↔checksum coupling) — see [`docs/SEMBLE-RELEASE-GOVERNANCE.md`](SEMBLE-RELEASE-GOVERNANCE.md:1). It is enforced in CI via `code-qa` and the `--strict` checksum gate inside [`marketplace-publish.yml`](../.github/workflows/marketplace-publish.yml:149) before any stable publish proceeds.
