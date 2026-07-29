# Roo+ Technical Debt Register

This document tracks known technical debt, areas for improvement, and maintenance tasks that have been deferred or are in progress.

---

## 🔴 High Priority

### 1. CLI `README.md` References Upstream Repository

**Location**: [`apps/cli/README.md`](apps/cli/README.md)
**Issue**: The CLI README still references `https://github.com/RooCodeInc/Roo-Code` (upstream Zoo Code) for installation scripts, links, and documentation. As a fork, Roo+ should either mirror the CLI install infrastructure or clearly document the fork divergence.
**Impact**: Users following the CLI install script may end up installing upstream Zoo Code instead of Roo+.
**Suggested Fix**: Either:

- Fork the install script to the Roo+ org and update URLs, or
- Add a clear warning that the CLI README is inherited from upstream and the install script points to Zoo Code.

### 2. Upstream Merge Drift

**Location**: [`Merge upstream/main into master (sync fork)`](https://github.com/xavier-arosemena/roo-plus/commits/master)
**Issue**: The fork has diverged significantly from upstream Zoo Code. Each merge requires resolving conflicts across 50+ files. The `Merge remote-tracking branch 'origin/master'` pattern in git history shows manual merge overhead.
**Impact**: Integrating upstream security fixes and features requires significant manual effort per merge.
**Suggested Fix**: Consider using `git merge --squash` for upstream syncs, or set up automated merge conflict detection.

---

## 🟡 Medium Priority

### 3. Package CHANGELOGs Out of Sync

**Locations**:

- [`packages/types/CHANGELOG.md`](packages/types/CHANGELOG.md) — Only contains `0.0.1` with one change
- [`packages/core/CHANGELOG.md`](packages/core/CHANGELOG.md) — Only contains `0.0.1`
- [`packages/ipc/CHANGELOG.md`](packages/ipc/CHANGELOG.md) — Only contains `0.0.1`
- [`packages/telemetry/CHANGELOG.md`](packages/telemetry/CHANGELOG.md) — Only contains `0.0.1`

**Issue**: Shared package CHANGELOGs (types, core, ipc, telemetry) are stubs with `0.0.1` version and minimal entries. These packages receive regular changes but their changelogs are not maintained.
**Impact**: Developers and downstream consumers of these packages cannot track historical changes.
**Suggested Fix**: Automate changelog generation for packages using changesets or a commit-based generator.

### 4. `apps/cli/CHANGELOG.md` Stale Since March 2026

**Location**: [`apps/cli/CHANGELOG.md`](apps/cli/CHANGELOG.md)
**Issue**: The CLI changelog stops at `0.1.17` (2026-03-04). Multiple CLI features (zoo command, autonomous orchestrator, autonomous mode coverage) have been added since but are not documented.
**Impact**: CLI users cannot track what's new.
**Suggested Fix**: Audit CLI commits since March 2026 and update the changelog, or automate from git history.

### 5. Duplicate README Files

**Locations**: [`README.md`](README.md) and [`src/README.md`](src/README.md)
**Issue**: The root and `src/` README files are nearly identical (both document the full custom modes library, project structure, etc.). The `src/` copy exists because VS Code extension packaging includes `src/` as the root. However, this creates a maintenance burden — both must be updated in lockstep.
**Impact**: Documentation drift is likely; the `src/` copy was already behind the root on the Option 0 marketplace instructions.
**Suggested Fix**: Consider consolidating the `src/README.md` to reference the root README, or add a build step that copies `README.md` → `src/README.md`.

---

## 🟢 Low Priority

### 6. CI Test Coverage Threshold

**Issue**: While test counts are reported in changelogs (e.g., "All 7087 source tests pass"), there is no CI-enforced minimum code coverage threshold.
**Impact**: Coverage could regress between releases without visibility.
**Suggested Fix**: Add a `coverage` threshold in vitest config (e.g., 80% branch coverage) and enforce in CI.

### 7. Locale README Files Out of Sync

**Locations**: `locales/*/README.md` (17 locale directories)
**Issue**: Localized README files exist but are not maintained in lockstep with the English root README. The agent count, feature list, and installation instructions may be stale in non-English READMEs.
**Impact**: Non-English users may see outdated documentation.
**Suggested Fix**: Add a CI check that compares locale README structure against the English README, or generate locale READMEs from templates.

### 8. `scripts/` Directory Documentation

**Location**: `scripts/` directory
**Issue**: Several utility scripts exist (`bundle-semble.sh`, `sync-custom-modes.mjs`, `generate-catalog.mjs`, `find-missing-i18n-key.js`, etc.) but there is no single document explaining what each script does, when to run it, and its dependencies.
**Impact**: New contributors and maintainers must read script source to understand purpose.
**Suggested Fix**: Add a `scripts/README.md` with a table of scripts, their purpose, and usage.

### 9. `.roomodes` Is Auto-Generated but Committed

**Location**: [`.roomodes`](.roomodes)
**Issue**: The `.roomodes` file is auto-generated by `scripts/sync-custom-modes.mjs` but is committed to the repository. This is intentional (ensures pre-loaded modes are versioned), but there's no CI check that `.roomodes` is in sync with `custom-modes/manifest.json` and agent YAMLs.
**Impact**: The committed `.roomodes` could drift from the manifest, causing mode inconsistencies.
**Suggested Fix**: Add a CI step that runs `sync:custom-modes` in dry-run mode and fails if `.roomodes` would change.

### 10. Hardcoded `SEMBLE_VERSION` in Downloader

**Location**: [`src/services/code-index/semble/semble-downloader.ts`](src/services/code-index/semble/semble-downloader.ts)
**Issue**: The semble binary version is hardcoded as a constant. While a "latest" mode and configurable binary path were added in v3.72.1, the default version is still a compile-time constant.
**Impact**: Version bumps require a source code change even when "latest" mode is available as an opt-in.
**Suggested Fix**: Make "latest" the default behavior for the semble download version.

---

## ✅ Recently Resolved Debt

| Debt                                                 | Resolution                                                               | Version |
| ---------------------------------------------------- | ------------------------------------------------------------------------ | ------- |
| Roo Code Cloud dead code (`packages/cloud/`)         | Removed entirely (~400 lines)                                            | v3.74.0 |
| Semble binary download 404 (hardcoded single source) | Added multi-source fallback, configurable binary path, checksum manifest | v3.72.1 |
| 46 Dependabot advisories + 7 code scanning alerts    | Resolved via dependency updates and code fixes                           | v3.72.0 |
| Dead code and unused exports                         | Knip configured and dead code removed                                    | v3.72.0 |
| "Zoo's Changes" in diff tab (rebrand incomplete)     | Renamed to "Roo+'s Changes"                                              | v3.70.3 |
| Mode Marketplace not documented as primary install   | READMEs updated with marketplace instructions                            | v3.70.2 |
| Pre-installed modes not seeded on first activation   | Bundled `pre-installed-modes.yml` and seeded on first run                | v3.70.1 |
| Sync-custom-modes not in VSIX build pipeline         | Integrated into `vscode:prepublish`                                      | v3.70.1 |
