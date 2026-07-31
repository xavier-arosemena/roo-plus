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

### 6. Webview Message Protocol — Transitional (Untyped) Types

**Location**: [`packages/types/src/webview-messages/`](packages/types/src/webview-messages/index.ts)
**Issue**: 149 of 166 `WebviewMessage.type` members remain unregistered — they have no zod schema and rely on the transitional pass-through in `parseWebviewMessage`. The CI ratchet ([`scripts/verify-message-schemas.mjs`](scripts/verify-message-schemas.mjs)) enforces the untyped count never increases, but broadening is ongoing.
**Impact**: Untyped message types still lack runtime validation and payload-type coupling; a crafted webview can send any shape for these types.
**Suggested Fix**: Migrate remaining domains into the registry per [`plans/s1-message-protocol.md`](plans/s1-message-protocol.md) (S1-M4): worktree ×12, marketplace ×7, skills ×6, rules ×5, code-index ×10, terminal ×9, images ×4, debug ×4, misc.

### 7. Outbound `ExtensionMessage` Not Yet Typed/Validated

**Location**: [`packages/types/src/vscode-extension-host.ts`](packages/types/src/vscode-extension-host.ts)
**Issue**: The outbound `ExtensionMessage` union (87 types) has not received the same discriminated-union/zod treatment as `WebviewMessage`. Webview consumers must still trust the producer's shape.
**Impact**: No schema-driven type safety on the extension→webview direction; the "Type Lie" is only half-closed.
**Suggested Fix**: Apply the same `z.infer` registry + boundary-parse treatment (e.g., `parseExtensionMessage`). Lower priority — the extension is the trusted producer.

---

## 🟢 Low Priority

### 8. CI Test Coverage Threshold

**Issue**: While test counts are reported in changelogs (e.g., "All 7119 source tests pass"), there is no CI-enforced minimum code coverage threshold.
**Impact**: Coverage could regress between releases without visibility.
**Suggested Fix**: Add a `coverage` threshold in vitest config (e.g., 80% branch coverage) and enforce in CI.

### 9. Locale README Files Out of Sync

**Locations**: `locales/*/README.md` (17 locale directories)
**Issue**: Localized README files exist but are not maintained in lockstep with the English root README. The agent count, feature list, and installation instructions may be stale in non-English READMEs.
**Impact**: Non-English users may see outdated documentation.
**Suggested Fix**: Add a CI check that compares locale README structure against the English README, or generate locale READMEs from templates.

### 10. `scripts/` Directory Documentation

**Location**: `scripts/` directory
**Issue**: Several utility scripts exist (`bundle-semble.sh`, `sync-custom-modes.mjs`, `verify-roomodes-sync.mjs`, `verify-message-schemas.mjs`, `generate-catalog.mjs`, `find-missing-i18n-key.js`, etc.) but there is no single document explaining what each script does, when to run it, and its dependencies.
**Impact**: New contributors and maintainers must read script source to understand purpose.
**Suggested Fix**: Add a `scripts/README.md` with a table of scripts, their purpose, and usage.

### 11. Large Webview Components

**Locations**:

- [`webview-ui/src/components/chat/ChatView.tsx`](webview-ui/src/components/chat/ChatView.tsx) — ~1.8k lines
- [`webview-ui/src/components/chat/CodeIndexPopover.tsx`](webview-ui/src/components/chat/CodeIndexPopover.tsx) — ~1.8k lines
- [`webview-ui/src/components/modes/ModesView.tsx`](webview-ui/src/components/modes/ModesView.tsx) — ~1.8k lines
- [`webview-ui/src/components/chat/ChatRow.tsx`](webview-ui/src/components/chat/ChatRow.tsx) — ~1.7k lines

**Issue**: The webview UI still contains several monolithic components (each ~1.7–1.9k lines) mixing rendering, state, and business logic. The extension-side `ClineProvider` slimming (S3) did not touch the webview.
**Impact**: Hard to test and maintain; risk of regressions when extending features.
**Suggested Fix**: Decompose into hooks and smaller subcomponents; add unit tests at the narrowest layer.

### 12. Residual `as any` / `@ts-ignore` Counts

**Locations**: `src/`, `packages/types/`, `webview-ui/`
**Issue**: Scattered type-escape hatches (`as any`, `@ts-ignore`) remain across the codebase. There is no tracked baseline or CI-enforced ceiling — lint blocks new `as any` in changed files, but existing occurrences persist (handlers previously relied on `message.values as any`).
**Impact**: Undermines type safety and complicates the typed-message-protocol effort.
**Suggested Fix**: Track per-file counts (extend the `src/eslint-suppressions.json` pattern), reduce over time, and prefer typed APIs.

### 13. Hardcoded `SEMBLE_VERSION` in Downloader

**Location**: [`src/services/code-index/semble/semble-downloader.ts`](src/services/code-index/semble/semble-downloader.ts)
**Issue**: The semble binary version is hardcoded as a constant. While a "latest" mode and configurable binary path were added in v3.72.1, the default version is still a compile-time constant.
**Impact**: Version bumps require a source code change even when "latest" mode is available as an opt-in.
**Suggested Fix**: Make "latest" the default behavior for the semble download version.

---

## ✅ Recently Resolved Debt

| Debt                                                                   | Resolution                                                                                                                                            | Version    |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Webview message "Type Lie" (flat interface, payloads untied to type)   | Zod schema registry in `packages/types/src/webview-messages/`; `z.infer` types; 17 security-sensitive domains typed + validated                       | Unreleased |
| Missing runtime validation at webview→extension boundary ("Input Gap") | `parseWebviewMessage` at `ClineProvider.setWebviewMessageListener` + CLI `message-processor.ts`; malformed messages rejected before dispatch          | Unreleased |
| God-object `ClineProvider` (~3,800 lines)                              | Slimmed to ~2,500 lines; extracted `TaskHistoryService`, `ProviderProfileService`, `MarketplaceService`, `TaskOrchestrator` into `src/core/services/` | Unreleased |
| God-switch webview dispatcher (~4,000-line switch)                     | 15 per-domain handler modules in `src/core/webview/handlers/` behind a thin router                                                                    | Unreleased |
| `dangerouslySetInnerHTML` XSS sites                                    | DOMPurify `sanitizeHtml.ts` applied to all sites; Mermaid `securityLevel: "strict"`; `escapeXML` pinned                                               | Unreleased |
| Relaxed HMR CSP (`https://*` wildcard)                                 | Wildcard removed; Vite-identity probe (`/@vite/client`) added                                                                                         | Unreleased |
| Stale cloud test + floating-promise lint readiness issues              | Removed stale `@roo-code/cloud` test; fixed 2 floating promises; completed "Zoo Code" rebrand                                                         | Unreleased |
| `.roomodes` could drift from committed content                         | [`scripts/verify-roomodes-sync.mjs`](scripts/verify-roomodes-sync.mjs) regenerates `.roomodes` and fails on drift                                     | Unreleased |
| Roo Code Cloud dead code (`packages/cloud/`)                           | Removed entirely (~400 lines)                                                                                                                         | v3.74.0    |
| Semble binary download 404 (hardcoded single source)                   | Added multi-source fallback, configurable binary path, checksum manifest                                                                              | v3.72.1    |
| 46 Dependabot advisories + 7 code scanning alerts                      | Resolved via dependency updates and code fixes                                                                                                        | v3.72.0    |
| Dead code and unused exports                                           | Knip configured and dead code removed                                                                                                                 | v3.72.0    |
| "Zoo's Changes" in diff tab (rebrand incomplete)                       | Renamed to "Roo+'s Changes"                                                                                                                           | v3.70.3    |
| Mode Marketplace not documented as primary install                     | READMEs updated with marketplace instructions                                                                                                         | v3.70.2    |
| Pre-installed modes not seeded on first activation                     | Bundled `pre-installed-modes.yml` and seeded on first run                                                                                             | v3.70.1    |
| Sync-custom-modes not in VSIX build pipeline                           | Integrated into `vscode:prepublish`                                                                                                                   | v3.70.1    |
