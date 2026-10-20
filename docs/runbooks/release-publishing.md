# Runbook: Release Publishing (pre-release & stable)

Scope: `xavier-arosemena/roo-plus` (`origin`). Owns the two publish workflows and
the guard chain that stops them hijacking each other. Versioning policy:
[`docs/adr/adr-release-versioning-policy.md`](../adr/adr-release-versioning-policy.md).
Incident that motivated the guards:
[`docs/incidents/2026-09-25-prerelease-guard-bypass-3.88.10.md`](../incidents/2026-09-25-prerelease-guard-bypass-3.88.10.md).

## ⛔ Status: the Marketplace listing was removed by enforcement (2026-10-20)

The VS Code Marketplace listing `xavier-arosemena.roo-plus` **no longer exists**, and
publisher `xavier-arosemena` is blocked. VS Marketplace Support confirmed on 2026-10-20
that this was done "in accordance with the Visual Studio Marketplace Publisher Agreement
and the Terms of Use", and that they "will not be reinstating" (representative
`733be9c8`).

What this changes for this repository:

- **The Marketplace is not a publish target any more.** It is not "temporarily
  unavailable"; there is nothing to wait out, backfill, or re-create. The
  `429 / VSID Concurrency` block seen from 2026-09-15 onward was the enforcement action
  presenting as a rate limit.
- **Open VSX is the only registry.** It carries every version through `3.89.0`, and both
  publish workflows already treat the Marketplace as best-effort.
- **Never re-publish under another publisher to work around the decision.** Publishing
  the same extension from a new publisher after an enforcement action is circumvention
  and can escalate a publisher-level block into an account-level one.
- **`verify-marketplace-presence` now reports a tombstone, not a regression.** `absent`
  is the expected, permanent state; the check is retained so an unexpected reappearance
  (or restoration) is noticed.

Evidence kept for the record: `extensionquery` returns `TotalCount 0` against a healthy
control; every `/vspackage` URL returns 404; `/publishers/xavier-arosemena` returns `200`
with `"extensions":[]`. Pre-enforcement last known good: `3.88.10` → HTTP 200 on
2026-09-25.

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
>
> ⚠️ **The listing was removed by enforcement on 2026-10-20** (see the status section at
> the top of this runbook). There is no backfill target and no re-publish path: the
> publisher is blocked and Support has confirmed no reinstatement. Do not attempt to
> re-create the listing under another publisher.

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

## Automation: the presence gate

`vsce publish` reporting success is **not** proof of publication. Between
2026-09-25 and 2026-10-06 the listing `xavier-arosemena.roo-plus` disappeared from
the public gallery while CI stayed green: every `/vspackage` URL returned 404 and
the publisher console returned
`429 - Woah, that's a lot of requests` (`RequestBlockedException`, resource
`Concurrency`, namespace `VSID`).

[`scripts/verify-marketplace-presence.mjs`](../../scripts/verify-marketplace-presence.mjs:1)
automates the probe that found it:

- **What** — `extensionquery` for `xavier-arosemena.roo-plus`, then the committed
  version inside `.versions[]`.
- **Where** — after every Marketplace publish (both channels) and in
  [`release-validation.yml`](../../.github/workflows/release-validation.yml:144)
  as `--presence-only` (a PR legitimately carries an unpublished version).
- **Semantics** — `present` → exit 0 · `absent` / `version-missing` → exit 1 ·
  `unreachable` → exit 0 + `::warning::`.
- **Why every call site passes `--advisory`** — it downgrades a definitive failure
  to an `::error::` annotation with a zero exit. The Marketplace must never block
  or delay Open VSX; the gate reports, it does not gate the release.

**Invariant:** the Open VSX publish step must never depend on the VS Code
Marketplace — the VS step is `continue-on-error` **and** carries
`timeout-minutes` (a hang is not covered by `continue-on-error`), and the stable
channel publishes Open VSX **first**. Re-verify after touching either workflow:

```bash
sed -n '/Publish pre-release to Open VSX/,/run: |/p' .github/workflows/pre-release-publish.yml | grep -c 'publish-vsce'   # expect 0
```

Local: `pnpm verify:marketplace-presence` (strict) · `--advisory` ·
`--wait 300` (CDN polling). Tests:
`node --test scripts/verify-marketplace-presence.spec.mjs`.

## Credential triage — `verify-pat` before every publish

`npx @vscode/vsce verify-pat xavier-arosemena` is the cheapest gate there is: run
it before any publish attempt and **never publish when it fails**. Read the error
literally, because two very different problems look alike:

| Error                                                                          | Meaning                                                                                                                                                                                                     | Action                                                                     |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `TF400813: The user 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' is not authorized…` | That GUID is Azure DevOps' **Anonymous** identity — no user was resolved at all. The token was rejected outright: expired, revoked, mistyped, or created for an organization the caller does not belong to. | Create a fresh PAT (`Marketplace → Manage`, _Show all scopes_) and retry.  |
| `TF400813` naming **your** real user id                                        | Token is valid; the identity is not authorized for this publisher                                                                                                                                           | Publisher membership — escalate (`vsmarketplace@microsoft.com`).           |
| `401` / `Access Denied`                                                        | Token invalid, expired, or missing `Marketplace → Manage`                                                                                                                                                   | Recreate the token.                                                        |
| JSON `429` with `Retry-After`                                                  | Write throttle (`RequestBlockedException`, resource `Concurrency`, namespace `VSID`)                                                                                                                        | Wait the header out; do not retry in a loop.                               |
| Console page `429 - Woah, that's a lot of requests`                            | Front-door rate limit on the browser session / IP — **not** a publisher verdict                                                                                                                             | Stop reloading the console; verify the credential through the API instead. |

> **Assert the token length before drawing any conclusion.** Modern Azure DevOps
> PATs are **84 characters** (the older format was 52). An **11-character** value
> is the literal shell placeholder `<new token>`. A garbage value and a revoked
> token produce the _same_ `TF400813 … 'aaaa…'` (Anonymous) response, so a
> mis-pasted token will read as a publisher problem for as long as you let it.

> **Confirmed 2026-10-19 — the publisher endpoint throttles reads too.** With a
> valid 84-character `Marketplace: Manage` token, `GET /_apis/gallery/publishers/xavier-arosemena/vsextensions`
> returns `HTTP 429` with `x-tfs-serviceerror: Request was blocked due to exceeding
usage of resource 'Concurrency' in namespace 'VSID'` and **no `Retry-After`**
> header — so there is no advertised reset window to wait out. The same error has
> blocked `vsce verify-pat` and `vsce publish` since 2026-09-15.

Confirm the token against Azure DevOps directly, bypassing both `vsce` and the
Marketplace console:

```bash
# who does this PAT resolve to? (empty=Anonymous, 401=dead token)
curl -s -u ":$VSCE_PAT" \
  "https://app.vssps.visualstudio.com/_apis/profile/profiles/me?api-version=7.1-preview.3" \
  | jq -r '.displayName // .emailAddress // "ANONYMOUS"'

# can it reach the organization at all?
curl -s -o /dev/null -w "%{http_code}\n" -u ":$VSCE_PAT" \
  "https://dev.azure.com/<org>/_apis/projects?api-version=7.1"
```

> **A least-privilege token cannot be probed anywhere except the gallery.**
> `/_apis/profile/profiles/me` requires `vso.profile` and `/_apis/projects`
> requires `vso.project`, so a `Marketplace: Manage`-only token returns 401/203
> from both **by design** — that is not evidence the token is dead, and piping the
> response into `jq` yields a parse error instead of a verdict. To test liveness in
> isolation, mint a throwaway token with `User Profile: Read` **plus**
> `Marketplace: Manage`, run the probes, then revoke it. Never widen the token that
> CI stores.

> ⚠️ **Never let `vsce` persist the token.** A headless host logs
> `Failed to open credential store. Falling back to storing secrets clear-text in:
/root/.vsce` and writes the PAT in the clear. Prefer the `VSCE_PAT` environment
> variable for one-shot commands, and `rm -rf ~/.vsce` after; rotate any token that
> was ever stored that way.

### Credential register

| Field             | Value                                                                                                                                                                                                                                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Token name        | `vsce-roo-plus-marketplace-manage-20261019`                                                                                                                                                                                                                                                           |
| Organization      | `arosemenaxavier` (the previously used `xavier-arosemena` slug now returns 404 from `dev.azure.com`; either the org was renamed, in which case its ID — and the publisher binding — is preserved, or a new org exists and the publisher is orphaned. Confirm the org ID before trusting the binding.) |
| Scope             | Custom defined → `Marketplace` → **Manage** only. Nothing else ticked: no `Full access`, no Code/Build, no separate `Marketplace: Publish`/`Acquire`/`Read`.                                                                                                                                          |
| Expires           | **2027-10-18** (365 days — the maximum)                                                                                                                                                                                                                                                               |
| Stored in         | GitHub environments `marketplace-prerelease` and `marketplace-production` → secret `VSCE_PAT`                                                                                                                                                                                                         |
| Rotation reminder | **2027-10-04** (two weeks before expiry)                                                                                                                                                                                                                                                              |

Two dated constraints bind **before** the expiry does:

- **2026-12-01** — global PATs stop working. An organization-scoped token survives
  this date; a token scoped to _All accessible organizations_ does not, whatever its
  2027 expiry says.
- **Before 2026-11-15** — migrate to Microsoft Entra ID
  (`vsce publish --azure-credential`) and delete `VSCE_PAT` entirely.

Do not let the 2027 expiry date create false comfort: the retirement is the earlier
deadline, and a global token's printed expiry is meaningless after 2026-12-01.

## Recovery: a version was consumed by mistake

1. Do **not** run `vsce unpublish` — it deletes the **entire** extension, not one
   version (`vsce --help`; [microsoft/vscode-vsce#846](https://github.com/microsoft/vscode-vsce/issues/846)).
   Per-version deletion is not available via the CLI/API and requires emailing
   `VSMarketplace@microsoft.com`.
2. Bump `src/package.json` to the next patch and cut the stable from there.
3. Record an incident note under [`docs/incidents/`](../incidents/).
