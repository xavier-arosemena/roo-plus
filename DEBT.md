# Roo+ Technical Debt Register

This document tracks known technical debt, areas for improvement, and maintenance tasks that have been deferred or are in progress.

---

## 🔴 High Priority

### 1. Upstream Merge Drift

**Location**: [`Merge upstream/main into master (sync fork)`](https://github.com/xavier-arosemena/roo-plus/commits/master)
**Issue**: The fork has diverged significantly from upstream Zoo Code. Each merge requires resolving conflicts across 50+ files. The `Merge remote-tracking branch 'origin/master'` pattern in git history shows manual merge overhead.
**Impact**: Integrating upstream security fixes and features requires significant manual effort per merge.
**Suggested Fix**: Consider using `git merge --squash` for upstream syncs, or set up automated merge conflict detection.

---

## 🟡 Medium Priority

### 2. Package CHANGELOGs Out of Sync

**Locations**:

- [`packages/types/CHANGELOG.md`](packages/types/CHANGELOG.md) — Only contains `0.0.1` with one change
- [`packages/core/CHANGELOG.md`](packages/core/CHANGELOG.md) — Only contains `0.0.1`
- [`packages/ipc/CHANGELOG.md`](packages/ipc/CHANGELOG.md) — Only contains `0.0.1`
- [`packages/telemetry/CHANGELOG.md`](packages/telemetry/CHANGELOG.md) — Only contains `0.0.1`

**Issue**: Shared package CHANGELOGs (types, core, ipc, telemetry) are stubs with `0.0.1` version and minimal entries. These packages receive regular changes but their changelogs are not maintained.
**Impact**: Developers and downstream consumers of these packages cannot track historical changes.
**Suggested Fix**: Automate changelog generation for packages using changesets or a commit-based generator.

### 3. `apps/cli/CHANGELOG.md` Stale Since March 2026

**Location**: [`apps/cli/CHANGELOG.md`](apps/cli/CHANGELOG.md)
**Issue**: The CLI changelog stops at `0.1.17` (2026-03-04). Multiple CLI features (zoo command, autonomous orchestrator, autonomous mode coverage) have been added since but are not documented.
**Impact**: CLI users cannot track what's new.
**Suggested Fix**: Audit CLI commits since March 2026 and update the changelog, or automate from git history.

### 4. Duplicate README Files

**Locations**: [`README.md`](README.md) and [`src/README.md`](src/README.md)
**Issue**: The root and `src/` README files are nearly identical (both document the full custom modes library, project structure, etc.). The `src/` copy exists because VS Code extension packaging includes `src/` as the root. However, this creates a maintenance burden — both must be updated in lockstep.
**Impact**: Documentation drift is likely; the `src/` copy was already behind the root on the Option 0 marketplace instructions.
**Suggested Fix**: Consider consolidating the `src/README.md` to reference the root README, or add a build step that copies `README.md` → `src/README.md`.

### 5. Webview Message Protocol — Transitional (Untyped) Types

**Location**: [`packages/types/src/webview-messages/`](packages/types/src/webview-messages/index.ts)
**Issue**: 149 of 165 `WebviewMessage.type` members remain unregistered — they have no zod schema and rely on the transitional pass-through in `parseWebviewMessage`. The CI ratchet ([`scripts/verify-message-schemas.mjs`](scripts/verify-message-schemas.mjs)) enforces the untyped count never increases, but broadening is ongoing.
**Impact**: Untyped message types still lack runtime validation and payload-type coupling; a crafted webview can send any shape for these types.
**Suggested Fix**: Migrate remaining domains into the registry per [`plans/s1-message-protocol.md`](plans/s1-message-protocol.md) (S1-M4): worktree ×12, marketplace ×7, skills ×6, rules ×5, code-index ×10, terminal ×9, images ×4, debug ×4, misc.

### 6. Outbound `ExtensionMessage` Not Yet Typed/Validated

**Location**: [`packages/types/src/vscode-extension-host.ts`](packages/types/src/vscode-extension-host.ts)
**Issue**: The outbound `ExtensionMessage` union (87 types) has not received the same discriminated-union/zod treatment as `WebviewMessage`. Webview consumers must still trust the producer's shape.
**Impact**: No schema-driven type safety on the extension→webview direction; the "Type Lie" is only half-closed.
**Suggested Fix**: Apply the same `z.infer` registry + boundary-parse treatment (e.g., `parseExtensionMessage`). Lower priority — the extension is the trusted producer.

---

## 🟢 Low Priority

### 7. CI Test Coverage Threshold

**Issue**: While test counts are reported in changelogs (e.g., "All 7119 source tests pass"), there is no CI-enforced minimum code coverage threshold.
**Impact**: Coverage could regress between releases without visibility.
**Suggested Fix**: Add a `coverage` threshold in vitest config (e.g., 80% branch coverage) and enforce in CI.

### 8. Locale README Files Out of Sync

**Locations**: `locales/*/README.md` (17 locale directories)
**Issue**: Localized README files exist but are not maintained in lockstep with the English root README. The agent count, feature list, and installation instructions may be stale in non-English READMEs.
**Impact**: Non-English users may see outdated documentation.
**Suggested Fix**: Add a CI check that compares locale README structure against the English README, or generate locale READMEs from templates.

### 9. `scripts/` Directory Documentation

**Location**: `scripts/` directory
**Issue**: Several utility scripts exist (`sync-custom-modes.mjs`, `verify-roomodes-sync.mjs`, `verify-message-schemas.mjs`, `generate-catalog.mjs`, `find-missing-i18n-key.js`, etc.) but there is no single document explaining what each script does, when to run it, and its dependencies.
**Impact**: New contributors and maintainers must read script source to understand purpose.
**Suggested Fix**: Add a `scripts/README.md` with a table of scripts, their purpose, and usage.

### 10. Large Webview Components

**Locations**:

- [`webview-ui/src/components/chat/ChatView.tsx`](webview-ui/src/components/chat/ChatView.tsx) — ~1.8k lines
- [`webview-ui/src/components/chat/CodeIndexPopover.tsx`](webview-ui/src/components/chat/CodeIndexPopover.tsx) — ~1.8k lines
- [`webview-ui/src/components/modes/ModesView.tsx`](webview-ui/src/components/modes/ModesView.tsx) — ~1.8k lines
- [`webview-ui/src/components/chat/ChatRow.tsx`](webview-ui/src/components/chat/ChatRow.tsx) — ~1.7k lines

**Issue**: The webview UI still contains several monolithic components (each ~1.7–1.9k lines) mixing rendering, state, and business logic. The extension-side `ClineProvider` slimming (S3) did not touch the webview.
**Impact**: Hard to test and maintain; risk of regressions when extending features.
**Suggested Fix**: Decompose into hooks and smaller subcomponents; add unit tests at the narrowest layer.

### 11. Residual `as any` / `@ts-ignore` Counts

**Locations**: `src/`, `packages/types/`, `webview-ui/`
**Issue**: Scattered type-escape hatches (`as any`, `@ts-ignore`) remain across the codebase. There is no tracked baseline or CI-enforced ceiling — lint blocks new `as any` in changed files, but existing occurrences persist (handlers previously relied on `message.values as any`).
**Impact**: Undermines type safety and complicates the typed-message-protocol effort.
**Suggested Fix**: Track per-file counts (extend the `src/eslint-suppressions.json` pattern), reduce over time, and prefer typed APIs.

### 12. `sync-custom-modes.mjs` Preserves Stale `.roomodes` Entries (Architecture Review 2026-07-31)

**Location**: [`scripts/sync-custom-modes.mjs`](scripts/sync-custom-modes.mjs:347)

**Issue**: The `.roomodes` merge gives existing entries priority on slug conflict (`existingSlugs` filter skips freshly-generated entries). If `.roomodes` is ever stale (e.g. generated before descriptions were added), re-running the sync preserves the stale entries without descriptions. The CI guard ([`verify-roomodes-sync.mjs`](scripts/verify-roomodes-sync.mjs)) regenerates from scratch and fails on drift, so the committed file is currently clean — but the sync script's preserve-existing behavior is a latent trap for maintainers running it locally.

**Impact**: Future stale `.roomodes` regeneration could reintroduce missing descriptions/fields.

**Suggested Fix**: In `sync-custom-modes.mjs`, on slug conflict prefer the freshly-generated entry's `description` when the existing entry's is empty (merge descriptions into existing), so re-running sync repairs stale fields while preserving manual edits.

### 13. Playwright Visual Regression Baseline Maintenance (v3.76.0)

**Location**: [`webview-ui/playwright-ct.config.ts`](webview-ui/playwright-ct.config.ts), [`webview-ui/playwright/TranslationContext.ts`](webview-ui/playwright/TranslationContext.ts), [`webview-ui/src/components/settings/__tests__/ModelInfoView.visual.tsx`](webview-ui/src/components/settings/__tests__/ModelInfoView.visual.tsx)

**Issue**: The v3.76.0 Playwright Component-Testing visual regression harness ships static PNG baselines (e.g. `model-info-service-tier-pricing-dark.png`) and `TranslationContext`-wrapped CT fixtures. Any intentional UI change requires regenerating and committing new baselines; without discipline, baselines silently drift out of sync or the CT suite becomes flaky in headless CI.

**Impact**: Out-of-date baselines mask regressions or fail CI unexpectedly; visual coverage may be skipped if flaky.

**Suggested Fix**: Wire the visual CT suite into CI (code-qa), document a baseline-regeneration workflow (`npx playwright test --update-snapshots`), and gate intentional baseline changes in PRs.

---

## ✅ Recently Resolved Debt

| Debt                                                                   | Resolution                                                                                                                                                                           | Version    |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| Dead `setApiConfigPassword` webview message type                       | Removed schema, registry entry, exports, type-union member, and tests (dead protocol surface)                                                                                        | v3.76.0    |
| Webview message "Type Lie" (flat interface, payloads untied to type)   | Zod schema registry in `packages/types/src/webview-messages/`; `z.infer` types; 16 security-sensitive domains typed + validated                                                      | v3.76.0    |
| Missing runtime validation at webview→extension boundary ("Input Gap") | `parseWebviewMessage` at `ClineProvider.setWebviewMessageListener` + CLI `message-processor.ts`; malformed messages rejected before dispatch                                         | v3.76.0    |
| God-object `ClineProvider` (~3,800 lines)                              | Slimmed to ~2,500 lines; extracted `TaskHistoryService`, `ProviderProfileService`, `MarketplaceService`, `TaskOrchestrator` into `src/core/services/`                                | v3.76.0    |
| God-switch webview dispatcher (~4,000-line switch)                     | 15 per-domain handler modules in `src/core/webview/handlers/` behind a thin router                                                                                                   | v3.76.0    |
| `dangerouslySetInnerHTML` XSS sites                                    | DOMPurify `sanitizeHtml.ts` applied to all sites; Mermaid `securityLevel: "strict"`; `escapeXML` pinned                                                                              | v3.76.0    |
| Relaxed HMR CSP (`https://*` wildcard)                                 | Wildcard removed; Vite-identity probe (`/@vite/client`) added                                                                                                                        | v3.76.0    |
| Stale cloud test + floating-promise lint readiness issues              | Removed stale `@roo-code/cloud` test; fixed 2 floating promises; completed "Zoo Code" rebrand                                                                                        | v3.76.0    |
| `.roomodes` could drift from committed content                         | [`scripts/verify-roomodes-sync.mjs`](scripts/verify-roomodes-sync.mjs) regenerates `.roomodes` and fails on drift                                                                    | v3.76.0    |
| Semble bundled launcher (broken, no runtime)                           | Removed; download-only mechanism; manual binary via `codebaseIndexSembleBinaryPath`                                                                                                  | v3.76.0    |
| Semble EACCES (one-dir archive layout)                                 | `resolveSembleBinary` resolves the real executable; self-heals existing installs                                                                                                     | v3.76.0    |
| Pre-installed mode descriptions missing / "not always present"         | Rewrote `seedPreInstalledModes` to merge-fill: `.some()`→ any-bundled-mode check repairs partial seeds; never overwrites user modes/edits; adds bundled modes only on version change | v3.76.0    |
| CLI README references upstream repo                                    | Prominent warning callout added documenting fork divergence; users directed to build-from-source or release binaries                                                                 | v3.76.0    |
| CLI `process` event-listener leak in quiet mode (F1)                   | Named handler stored on instance; removed in `restoreConsole()`; regression test asserts `process.listenerCount("warning")` baseline                                                 | v3.76.0    |
| Silent drop of unregistered webview messages (F2)                      | Debug-gated (`roo-plus.debug`) `provider.log()` added in router fall-through                                                                                                         | v3.76.0    |
| Legacy CLI credential plaintext write path (F4)                        | `saveToken` write path retired; module is read/delete-only for legacy token cleanup                                                                                                  | v3.76.0    |
| No-op `vscode-shim` logger in CLI (F5)                                 | Wired to CLI `DebugLogger` per-level when `--debug` is passed                                                                                                                        | v3.76.0    |
| Fragile closure ordering in `waitForTaskCompletion` (F6)               | Declarations reordered before referencing closures; TDZ hazard removed                                                                                                               | v3.76.0    |
| 7 new + ~100 pre-existing CodeQL code-scanning alerts                  | Fixed port-validation, temp-file handling, command-race, and path-escaping findings on the release branch                                                                            | v3.76.0    |
| Semble empty search results (0.4 min-score filter on Semble path)      | Removed the score filter; Semble path reference-aligned with Zoo Code (no filter, no cap); `searchMinScore`/`searchMaxResults` are Qdrant-only                                       | Unreleased |
| Fabricated 1-token context window in task header                       | `TaskHeader` only trusts a real finite positive window; token rows hidden when model info is unavailable; `ContextWindowProgress` clamps segments to ≤100%                           | Unreleased |
| Dead `ICodeIndexManager` interface                                     | Removed (nothing implemented it; stale `searchIndex` contract)                                                                                                                       | Unreleased |
| `SEMBLE_VERSION` default resolution (hardcoded constant)               | Version pinned by default for deterministic installs; "latest" is opt-in via `SEMBLE_RESOLVE_LATEST`; `SEMBLE_SHA256` checksums regenerated                                          | Unreleased |
| Roo Code Cloud dead code (`packages/cloud/`)                           | Removed entirely (~400 lines)                                                                                                                                                        | v3.74.0    |
| Semble binary download 404 (hardcoded single source)                   | Added multi-source fallback, configurable binary path, checksum manifest                                                                                                             | v3.72.1    |
| 46 Dependabot advisories + 7 code scanning alerts                      | Resolved via dependency updates and code fixes                                                                                                                                       | v3.72.0    |
| Dead code and unused exports                                           | Knip configured and dead code removed                                                                                                                                                | v3.72.0    |
| "Zoo's Changes" in diff tab (rebrand incomplete)                       | Renamed to "Roo+'s Changes"                                                                                                                                                          | v3.70.3    |
| Mode Marketplace not documented as primary install                     | READMEs updated with marketplace instructions                                                                                                                                        | v3.70.2    |
| Pre-installed modes not seeded on first activation                     | Bundled `pre-installed-modes.yml` and seeded on first run                                                                                                                            | v3.70.1    |
| Sync-custom-modes not in VSIX build pipeline                           | Integrated into `vscode:prepublish`                                                                                                                                                  | v3.70.1    |

---

## 📋 TODO/FIXME Inventory (production code, 2026-07-31)

Genuine `TODO`/`FIXME` markers in non-test production code. Doc-example and tool-description matches excluded.

| Location                                                                                            | Marker  | Note                                                           |
| --------------------------------------------------------------------------------------------------- | ------- | -------------------------------------------------------------- |
| [`src/utils/migrateSettings.ts`](src/utils/migrateSettings.ts:14)                                   | `TODO`  | Remove migration code (originally Sept 2025)                   |
| [`src/shared/experiments.ts`](src/shared/experiments.ts:26)                                         | `TODO`  | Add i18n keys in same PR that enables `showInSettings`         |
| [`src/shared/embeddingModels.ts`](src/shared/embeddingModels.ts:154)                                | `TODO`  | Make embedding selection configurable                          |
| [`src/activate/registerCommands.ts`](src/activate/registerCommands.ts:263)                          | `TODO`  | Use better SVG icon with light/dark variants                   |
| [`src/api/transform/model-params.ts`](src/api/transform/model-params.ts:161)                        | `TODO`  | Add `supportsTemperature` to model info                        |
| [`src/api/providers/openai.ts`](src/api/providers/openai.ts:28)                                     | `TODO`  | Rename to `OpenAICompatibleHandler`                            |
| [`src/api/providers/openrouter.ts`](src/api/providers/openrouter.ts:302)                            | `TODO`  | Add `promptCacheStratey` field to `ModelInfo` (typo in source) |
| [`src/api/providers/mistral.ts`](src/api/providers/mistral.ts:189)                                  | `@TODO` | Move logic to `getModelParams`                                 |
| [`src/integrations/editor/DiffViewProvider.ts`](src/integrations/editor/DiffViewProvider.ts:27)     | `TODO`  | Track upstream cline/cline PR #3354                            |
| [`src/integrations/terminal/TerminalRegistry.ts`](src/integrations/terminal/TerminalRegistry.ts:33) | `TODO`  | Init code is VSCode-specific; abstract                         |
| [`src/core/webview/handlers/settings.ts`](src/core/webview/handlers/settings.ts:571)                | `TODO`  | Cache model info like OpenRouter                               |
| [`src/core/webview/ClineProvider.ts`](src/core/webview/ClineProvider.ts:756)                        | `TODO`  | Improve type safety for `promptType`                           |
| [`src/core/services/ProviderProfileService.ts`](src/core/services/ProviderProfileService.ts:85)     | `TODO`  | Confirm `activateProfile` call is required                     |
| [`src/core/services/ProviderProfileService.ts`](src/core/services/ProviderProfileService.ts:113)    | `TODO`  | Rename `buildApiHandler` for clarity                           |
| [`src/core/config/ProviderSettingsManager.ts`](src/core/config/ProviderSettingsManager.ts:82)       | `TODO`  | Avoid async methods in constructor                             |
| [`src/core/config/importExport.ts`](src/core/config/importExport.ts:237)                            | `TODO`  | Re-evaluate provider settings presence in export               |
| [`src/core/task/Task.ts`](src/core/task/Task.ts:1165)                                               | `TODO`  | Be more efficient saving/posting only new messages             |
| [`apps/cli/src/commands/cli/run.ts`](apps/cli/src/commands/cli/run.ts:187)                          | `TODO`  | Validate API key for chosen provider                           |
| [`apps/cli/src/commands/cli/run.ts`](apps/cli/src/commands/cli/run.ts:188)                          | `TODO`  | Validate model for chosen provider                             |
| [`apps/cli/src/ui/hooks/useExtensionHost.ts`](apps/cli/src/ui/hooks/useExtensionHost.ts:39)         | `TODO`  | Unify TUI app props                                            |

All entries above are **open debt** (no owner assigned); triage per ICE and resolve in dedicated debt sprints.
