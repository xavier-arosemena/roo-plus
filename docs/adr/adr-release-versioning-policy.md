# ADR: Unified Release Versioning (Iterate-then-Stabilize, Same Minor) + Line-Keyed Announcements

**Date**: 2026-08-27

**Status**: Accepted

**Decision owners**: Roo+ maintainers (publishing / release engineering)

## Context

The extension ships to two registries — the VS Code Marketplace and Open VSX —
and also shows an in-extension "What's New" popup. Two systems interact with
the version number, and they had diverged:

1. **Runtime identity vs. published version (the bifurcation bug).** The old
   release process rewrote `src/package.json` **at CI time** to a _derived_
   version — `<major>.<minor>.<run>` computed by querying Open VSX for the max
   already-published patch and adding one (or falling back to
   `github.run_number`). That meant the version a user actually ran and the
   version committed in the repo were **different strings** for every pre-release
   build.

2. **Exact-match announcement lookup.** The "What's New" popup content is
   generated from the CHANGELOG and keyed to the _committed_ version. Because
   the runtime version was a _derived_ string, the runtime lookup
   `hasAnnouncementForVersion(<derived>)` returned `false` for every
   pre-release build — **the popup silently never fired on the pre-release
   channel**, hiding the marketplace links it carries.

3. **Registry constraints (verified, not redesignable).** Both Marketplaces
   accept only a plain `major.minor.patch` — no semver pre-release tags. The
   pre-release version **must differ** from the stable version, and each
   pre-release **must be higher** than the last stable/published version. These
   constraints bound every viable scheme.

A decision was needed **now** because the derived-version scheme made the
"ship announcement data" guarantee (`verify-announcement-version.mjs`) skip
itself for pre-release builds, so the regression could not be caught, and the
popup's pre-release behaviour was unverifiable.

## Decision

Adopt the **iterate-then-stabilize, same-minor** versioning policy and make
announcement lookup **line-resolved**. Concretely:

1. **INTERNAL == PUBLISHING, ALWAYS.** The version in `src/package.json` **is**
   the version shipped for every build. There is **no** build-time derivation or
   mutation of the version number, for pre-release **or** stable.

2. **Pre-releases are committed consecutive patches on the current minor:**
   `3.88.0`, `3.88.1`, `3.88.2`, … (each bump via `pnpm bump:pre-release`).

3. **The stable is the NEXT PATCH on that same minor** (`3.88.3`) — it promotes
   the tested bits. It is **not** a new minor.

4. **The next release cycle starts a new minor** (`3.89.0`, via
   `pnpm bump:line`).

5. **One accumulating CHANGELOG section per minor**, titled
   `## [<major>.<minor>.0]` (e.g. `## [3.88.0]`). No per-patch sections are ever
   created.

6. **Announcements are keyed to the LINE BASE `<major>.<minor>.0`.** At runtime
   ANY `<major>.<minor>.<patch>` resolves to the line base via
   `getAnnouncementForVersion`. The popup arms **once per minor**
   (`latestAnnouncementId` = `v<major>.<minor>.0`).

7. **CI guard instead of derivation.** `.github/workflows/pre-release-publish.yml`
   queries Open VSX and **fails** if the committed version is already published
   or is not greater than the max published patch on the same `<major>.<minor>`
   line. The `Microsoft.VisualStudio.Code.PreRelease` marker is stamped
   **ephemerally** around packaging (back up → add marker → package → restore) so
   the committed tree stays clean; the version itself is never changed.

### Alternatives considered and rejected

- **Keep the derived `<major>.<minor>.<run>` scheme, but fix the lookup.**
  Line-resolved lookup would fix the popup, but the runtime version would still
  diverge from the committed version, making every pre-release build's version
  un-reviewable, un-pinnable, and different from what the repo says. Rejected —
  the bifurcation is the root defect; eliminating it is strictly simpler.
- **Per-stable / per-build popup re-arming.** Rejected — the decided cadence is
  **once per minor** (one announcement per minor line, shared by all patches on
  it). Per-build re-arming would spam users on every pre-release patch.
- **Unify pre-release and stable version strings.** Rejected — impossible per
  Marketplace rules (pre-release must differ from stable and be higher), and not
  requested.

## Migration Strategy

- The current committed version is **3.86.0** and it is **already the correct
  line base** (announcement keyed to `3.86.0`, changelog section
  `## [3.86.0]`). It is kept as-is.
- The already-published pre-releases under the old scheme are `3.86.1..3.86.18`.
  The next pre-release after this change must therefore be committed at
  **3.86.19** (higher than max published) — the new CI guard enforces this.
- The `verify-announcement-version.mjs` script resolves the committed version to
  its line base **before** checking the changelog section and byte-comparing the
  asset, and its pre-release skip (`isPreReleaseChannel`) is removed so **both**
  channels verify the resolved line.
- The bump helper (`scripts/bump-pre-release-version.mjs`) is purely local and
  deterministic; it does not query registries (the CI guard owns monotonicity).

## Consequences

### Positive

- Runtime version **equals** the committed version for every build — pre-release
  builds are reviewable, pinnable, and reproducible from the repo.
- The "What's New" popup **fires on the pre-release channel** again: any patch
  resolves to the line base, so `hasAnnouncementForVersion` returns true and the
  marketplace links are shown.
- One changelog section per minor keeps release notes reviewable and removes the
  churn of per-patch sections.
- Announcement cadence is predictable: once per minor, regardless of how many
  pre-release patches ship.
- The CI guard makes duplicate/out-of-order publishes fail loudly instead of
  being silently skipped by `--skip-duplicate`.

### Negative

- A maintainer must bump the committed version for every pre-release
  (`pnpm bump:pre-release`) — version bumps are now explicit commits instead of
  an automatic CI side effect.
- The pre-release guard fails the current committed `3.86.0` (already superseded
  on the registry through `3.86.18`); one manual bump to `3.86.19` is required
  to resume publishing. This is a one-time cost of converging on the new scheme.
- A transient Open VSX API failure blocks the pre-release publish (fail-closed
  guard) until re-run.

### Neutral

- `PKG_RELEASE_CHANNEL=prerelease` remains on the pre-release build/package steps
  but is now harmless — the verify script no longer branches on it.
- The pre-release can still transiently become Open VSX `latest` until the next
  stable (next patch on the same minor) outranks it — an accepted, per-cycle
  trade-off identical to Marketplace pre-release-user behaviour.

## See Also

- [`scripts/generate-announcements.mjs`](../../scripts/generate-announcements.mjs)
  — line-keyed generator (single source of truth for `resolveLineVersion`).
- [`scripts/verify-announcement-version.mjs`](../../scripts/verify-announcement-version.mjs)
  — line-resolved release guard.
- [`scripts/bump-pre-release-version.mjs`](../../scripts/bump-pre-release-version.mjs)
  — `pnpm bump:pre-release` / `pnpm bump:line`.
- [`.github/workflows/pre-release-publish.yml`](../../.github/workflows/pre-release-publish.yml)
  — duplicate/monotonicity guard + ephemeral PreRelease stamp.
- [`.github/workflows/marketplace-publish.yml`](../../.github/workflows/marketplace-publish.yml)
  — stable release notes resolved to the line base section.
- This index ([`ADR-INDEX.md`](ADR-INDEX.md)).
