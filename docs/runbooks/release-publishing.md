# Runbook: Release Publishing (pre-release & stable)

Scope: `xavier-arosemena/roo-plus` (`origin`). Owns the two publish workflows and
the guard chain that stops them hijacking each other. Versioning policy:
[`docs/adr/adr-release-versioning-policy.md`](../adr/adr-release-versioning-policy.md).
Incident that motivated the guards:
[`docs/incidents/2026-09-25-prerelease-guard-bypass-3.88.10.md`](../incidents/2026-09-25-prerelease-guard-bypass-3.88.10.md).

## Channels and triggers

| Channel     | Workflow                                                                       | Trigger                                    | Ref gate                        |
| ----------- | ------------------------------------------------------------------------------ | ------------------------------------------ | ------------------------------- |
| Pre-release | [`pre-release-publish.yml`](../../.github/workflows/pre-release-publish.yml:1) | `push` to `master` (+ `workflow_dispatch`) | `require-master-ref`            |
| Stable      | [`marketplace-publish.yml`](../../.github/workflows/marketplace-publish.yml:1) | `workflow_dispatch` **only**               | `require-master-ref` (`master`) |

`master` is the only branch that publishes. The version in `src/package.json`
**is** the published version — there is no build-time derivation or mutation.

## Versioning in one line each

- **Pre-releases** are consecutive patches on the current minor: `pnpm bump:pre-release`.
- **Stable** is the _next patch_ on that same minor (it promotes the tested bits).
- The **next cycle** starts a new minor: `pnpm bump:line`.
- A version that already exists on a registry **cannot** be re-issued. If it is
  consumed (e.g. published as a pre-release by mistake), the stable **must** move
  to the next patch.

## Guard chain — read this before touching the workflows

**Pre-release** ([`pre-release-publish.yml`](../../.github/workflows/pre-release-publish.yml:1)):

1. **Release-prep skip** — a pushed commit whose subject matches
   `^chore: prepare vX.Y.Z( stable)? release` (direct push) or the merged commit
   `HEAD^2` (merge push) skips the publish. `… pre-release` intentionally does
   **not** match, so pre-release bumps still publish.
2. **Fail-closed history guard** — if HEAD is a merge commit but `HEAD^2` cannot
   be resolved (shallow checkout), the run **fails** rather than publish.
   GitHub evaluates the workflow file **from the pushed commit**, so this guard
   takes effect on the very push that introduces it.
3. **Publish path predicate** — only a pushed range touching `src/**`,
   `packages/**`, `webview-ui/**` (which contains `src/package.json`) publishes; a
   range touching no publishable path skips with a `::notice::`. When the
   predicate **cannot** be evaluated it no longer publishes implicitly: publishing
   requires an explicit `workflow_dispatch` confirmation
   (`confirm_publish=true` — see the polarity note below), and otherwise skips
   with a `::notice::` that says how to publish deliberately.
4. **Cross-registry duplicate / monotonic guard** — fails when the committed
   version already exists on **Open VSX _or_ the VS Code Marketplace**, or is not
   greater than the max published patch on its minor line.

> **Guard polarity — guards 2 and 3 are deliberately opposite; do not "fix" one
> to match the other.** Guard 2 (the history guard) is **fail-closed**: an
> unevaluable merge history _refuses_ to publish (exit 1), because publishing a
> stable-prep merge as a pre-release is the 2026-09-25 incident. Guard 3 (the path
> predicate) is **fail-open-by-confirmation**: when it cannot be evaluated —
> `github.event.before` is unusable (first push of a branch, a manual dispatch, or
> a checkout too shallow to contain it) **or** `github.event.forced` is true — it
> skips unless the run was dispatched with `confirm_publish=true`. So a deliberate
> manual publish still works, while a force-push or an implicit `workflow_dispatch`
> can no longer publish by accident. A normal push with a resolvable, non-forced
> `before` is unchanged: the predicate decides on the changed paths alone. Guard 4
> remains the fail-closed backstop for any publish that proceeds.

**Stable** ([`marketplace-publish.yml`](../../.github/workflows/marketplace-publish.yml:1)):

1. `check-pr-approval` — write/admin actors bypass; everyone else needs an
   approved PR for the dispatched commit.
2. `publish-stable` — `environment: marketplace-production`, concurrency group
   `marketplace-production` (never two concurrent stable publishes).
3. **Pre-flight duplicate guard** — the **Open VSX leg is fail-closed** (a version
   already on Open VSX aborts the run before the build/package steps), while the
   **VS Code Marketplace leg is advisory** (`::warning::` only): the Marketplace is
   an unavailable publish target and must never be able to block an Open VSX
   release.
4. **Open VSX is published FIRST** and is **not** `continue-on-error`, so the
   GitHub release/tag is only created once Open VSX actually has the version.
5. **VS Code Marketplace is best-effort** — `continue-on-error: true`, with its
   outcome reported by a final summary step (`::warning::` + job summary). A
   Marketplace-only failure therefore leaves the run **green**: the release is
   considered delivered on Open VSX.
6. **`fail-on-invalid-vsce-pat: "false"`** — an expired/blocked VSCE PAT must not
   abort the run before the Open VSX publish.

> ⚠️ **Known limitation — Marketplace backfill.** Because the Open VSX leg of
> guard 3 is fail-closed, re-dispatching this workflow for a version that is
> already on Open VSX fails at the guard, so the workflow cannot be used to
> backfill a version onto the VS Code Marketplace after an outage. Backfill it
> manually with
> `npx @vscode/vsce publish --packagePath bin/roo-plus-<version>.vsix` (or add a
> dedicated dispatch input) once the Marketplace accepts publishes again.

> ⚠️ **`fetch-depth: 0` on the pre-release checkout is load-bearing.** Removing it
> reintroduces the shallow-history blind spot; the fail-closed guard turns that
> into a red run instead of a silent hijack, but publishing would still be blocked
> until it is restored.

## Cutting a stable (procedure)

1. Branch from current `master` (never commit on `master`; Husky blocks it).
2. Bump `src/package.json` to the next patch (e.g. `pnpm bump:pre-release` gives
   the next patch — it is a plain patch bump).
3. Commit with the subject **`chore: prepare vX.Y.Z stable release`** — this exact
   shape is what guard 1 matches.
4. Open a PR and merge with **`--rebase`** (recommended). A **merge** commit is
   safe _only_ when `fetch-depth: 0` is present on the pre-release checkout; a
   rebase merge makes the pushed tip a single-parent commit, which guard 1
   matches without needing `HEAD^2`.
5. Confirm the pre-release run for the merge push logs
   `Commit 'chore: prepare vX.Y.Z stable release' is a release-prep; skipping pre-release publish.` → `skip=true`.
6. Dispatch the stable publish:
    ```bash
    gh workflow run marketplace-publish.yml --ref master
    ```
7. Verify (see below) — **Open VSX must show the version as stable** and the
   GitHub release + tag `vX.Y.Z` must exist. The VS Code Marketplace is
   best-effort while it is unavailable: a `::warning::` from the summary step is
   expected and does **not** mean the release failed.

Refuse direct `git push` to `master`: Husky's `pre-commit`/`pre-push` reject it,
and the rebase-merge path is what makes the guard deterministic.

## Verification snippets

```bash
# VS Marketplace: does the version exist? (200 = yes, 404 = no)
curl -s -o /dev/null -w "HTTP %{http_code}\n" \
  "https://marketplace.visualstudio.com/_apis/public/gallery/publishers/xavier-arosemena/vsextensions/roo-plus/<version>/vspackage"

# VS Marketplace: versions + stable/pre-release flag
curl -s -X POST "https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery" \
  -H "Accept: application/json;api-version=7.2-preview.1" \
  -H "Content-Type: application/json" \
  -d '{"filters":[{"criteria":[{"filterType":7,"value":"xavier-arosemena.roo-plus"}]}],"flags":2167}' \
  | jq -r '.results[0].extensions[0].versions[] | .version + " " + ([.properties[]? | select(.key=="Microsoft.VisualStudio.Code.PreRelease") | .value] | first // "STABLE")'

# Open VSX: latest + presence of a specific version
curl -s "https://open-vsx.org/api/xavier-arosemena/roo-plus" | jq -r '.version, (.allVersions|keys|join(","))'

# GitHub release + tag
gh release view v<version> --json tagName,isPrerelease,assets --jq '"\(.tagName) prerelease=\(.isPrerelease) assets=\([.assets[].name]|join(","))"'
```

Both registries are **CDN-cached** — allow several minutes before concluding a
publish failed (a `--skip-duplicate` publish of an already-present version is a
no-op, not an error).

## Recovery: a version was consumed by mistake

1. Do **not** run `vsce unpublish` — it deletes the **entire** extension, not one
   version (`vsce --help`; [microsoft/vscode-vsce#846](https://github.com/microsoft/vscode-vsce/issues/846)).
   Per-version deletion is not available via the CLI/API and requires emailing
   `VSMarketplace@microsoft.com`.
2. Bump `src/package.json` to the next patch and cut the stable from there.
3. Record an incident note under [`docs/incidents/`](../incidents/).
