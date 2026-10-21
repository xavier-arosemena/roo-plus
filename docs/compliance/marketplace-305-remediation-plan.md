# Marketplace Notification #305 — Remediation Plan (Roo+)

**Status**: ✅ DECIDED — approved 2026-09-04; ready for delegation to implementation sub-tasks
**Owner**: Security audit (findings) → Code / DevOps (implementation) → Security (validation)
**Target**: Next publishable release must include the privacy-hygiene improvement; workspace-trust enforcement and source-matching fixes land in the same or immediately following release.

## Locked decisions (approval 2026-09-04)

- **D1 — Telemetry**: **Option 1B — remove PostHog entirely** (not 1A).
- **D2 — Workspace trust**: declare `capabilities.untrustedWorkspaces.supported = false` **and** gate agent start + sensitive tools behind `vscode.workspace.isTrusted` / `requestWorkspaceTrust()`.
- **D3 — Semble acquisition**: **Option 3A — download-with-explicit-consent + provenance**. **Option 3B (per-platform bundling) is ruled out.**
- **D4 — Build/publish**: remove `POSTHOG_API_KEY` build-time injection; builds reproducible from the repo alone (no required secrets).

---

## 1. What the Marketplace is flagging (root cause)

Microsoft's VS Code Marketplace told us Roo+ contains _"implementation patterns that present unacceptable risk to users"_ and required three things. This table maps each requirement to the concrete code evidence and classifies the root cause (inherited vs. fork drift vs. fork-specific).

| #   | Marketplace requirement                                                    | Code evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Root cause                                                                                                                                                                               | Fix workstream |
| --- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| 1   | **Privacy-hygiene improvement**                                            | Telemetry (PostHog) is **opt-out by default**: `isOptedIn = telemetrySetting !== "disabled"` in [misc.ts](../../src/core/webview/handlers/misc.ts:163), so `"unset"` = ON. Consent banner's only close ✕ **enables** telemetry ([TelemetryBanner.tsx](../../webview-ui/src/components/common/TelemetryBanner.tsx:14)). Distinct ID = persistent `vscode.env.machineId` ([PostHogTelemetryClient.ts](../../packages/telemetry/src/PostHogTelemetryClient.ts:26)); CSP whitelists `*.posthog.com` ([ClineProvider.ts](../../src/core/webview/ClineProvider.ts:1454)); API key injected at build from `process.env.POSTHOG_API_KEY` ([esbuild.mjs](../../src/esbuild.mjs:51)). Our own [PRIVACY.md](../../PRIVACY.md:35) admits _"enabled by default"_. | **Fork drift**: upstream Zoo-Code already fixed this in PR #1069 ("default telemetry to opt-out with explicit consent UI"); Roo+ never merged it. **Decision: remove entirely (D1/1B).** | WS-A           |
| 2   | **Enforce workspace trust and explicit approval for sensitive operations** | No `capabilities.untrustedWorkspaces` in [src/package.json](../../src/package.json:1). No `vscode.workspace.isTrusted`/`requestWorkspaceTrust` anywhere. Agent reads/writes/executes; two executables are **auto-downloaded and executed at runtime** without a visible consent step: Semble ([semble-downloader.ts](../../src/services/code-index/semble/semble-downloader.ts:65)) and DCG (auto-installed on first command in [ExecuteCommandTool.ts](../../src/core/tools/ExecuteCommandTool.ts:126), from [constants.ts](../../src/services/destructive-command-guard/constants.ts:37)).                                                                                                                                                         | **Mixed**: workspace-trust gap shared with upstream; Semble download fork-specific; DCG upstream-added                                                                                   | WS-B           |
| 3   | **Publish matching source**                                                | Published artifact is not verifiably reproducible from the repo: telemetry key injected from a CI secret ([marketplace-publish.yml](../../.github/workflows/marketplace-publish.yml:145), [pre-release-publish.yml](../../.github/workflows/pre-release-publish.yml:241)); runtime-acquired executables (Semble/DCG) are not part of the reviewed VSIX.                                                                                                                                                                                                                                                                                                                                                                                              | **Fork-specific + upstream-inherited**                                                                                                                                                   | WS-C           |

---

## 2. Findings from the provenance review (answers to maintainer questions)

### 2.1 Telemetry: is it "active"? Is it sending to upstream Zoo-Code?

**No, it is not sending to upstream.** The PostHog _system_ (client, event taxonomy, consent UI design) was inherited from Zoo-Code, but each project injects **its own** API key from its own CI secrets:

- This repo's pipelines inject `secrets.POSTHOG_API_KEY` ([marketplace-publish.yml](../../.github/workflows/marketplace-publish.yml:145), [pre-release-publish.yml](../../.github/workflows/pre-release-publish.yml:241), [release-validation.yml](../../.github/workflows/release-validation.yml:98)) — a secret owned by the **Roo+** publisher (`xavier-arosemena`), not upstream.
- Upstream injects its own key in its own workflows (Zoo-Code `marketplace-publish.yml` / `nightly-publish.yml`).
- If the Roo+ GitHub secret is **unset**, the build compiles `""` as the key ([esbuild.mjs](../../src/esbuild.mjs:51)) → the PostHog client has no token → **no events can be ingested** (telemetry inert). If the secret **is set**, events flow to the PostHog project that key belongs to (Roo+-controlled, not Zoo-Code's).

**Conclusion**: telemetry is only "active" if `POSTHOG_API_KEY` is configured in this repo's GitHub environments. The conditional action in the original brief ("if it is being sent back to upstream, disable it and add a DEBT entry") does **not** trigger — we are not sending to upstream. **Decision (D1/1B): remove PostHog telemetry entirely.** See WS-A and the DEBT entry (WS-E) noting the option to re-introduce opt-in analytics later under full Roo+ control.

### 2.2 Did upstream fix these? Do they have these problems? Is this new?

- **Telemetry**: Upstream **fixed it** (PR #1069: default to opt-out with explicit Accept/Decline consent UI; verified live on `Zoo-Code-Org/Zoo-Code@main`). Roo+ **still carries the pre-fix design** — fork drift, and the strongest candidate for the "privacy-hygiene" flag. We are removing it rather than back-porting the fix.
- **Workspace trust**: Upstream also has **no** `capabilities.untrustedWorkspaces` today. This gap is shared/industry-wide for agent extensions — we will lead by fixing it on the fork (consistent with the "harden fork-specific layers" strategy in [adr-upstream-alignment-fork-strategy.md](../../docs/adr/adr-upstream-alignment-fork-strategy.md:1)).
- **Semble runtime download**: fork-specific. **DCG** runtime download: upstream-added.
- **Is this a new barrier?** Microsoft has tightened Marketplace review of AI-agent extensions since mid-2025 (Security & Trust policy; workspace-trust and telemetry criteria; automated scanning). This is an **evolving enforcement baseline** that upstream and forks must now meet.

### 2.3 Semble acquisition (decided: 3A; 3B ruled out)

- **Semble is NOT Roo+'s source code.** `Audare-est-Facere/sembleexec` is a repo under Roo+ control, but it is **built from another maintainer's code** — Roo+ only packages it to make it "Roo+ ready." For Marketplace/source-matching purposes it must therefore be treated as an **externally-authored, source-published component** that we build and pin, **not** as "our published source."
- Acquisition is already hardened mechanically: **pinned** to immutable tag `v0.5.2`, **checksum-verified** (hardcoded `SEMBLE_SHA256` + fetched manifest), TLS + trusted-domain constrained ([semble-downloader.ts](../../src/services/code-index/semble/semble-downloader.ts:16)).
- **Bundling (3B) is ruled out** for two reasons: (1) size — ~140 MB per platform far exceeds the Marketplace's default ~25 MB package limit (no per-publisher exception in scope); (2) authorship — since Semble is built from a third party's code, bundling it would not improve "publish matching source" (it still wouldn't be Roo+'s source) and would bloat every VSIX. **Chosen: 3A — download-with-explicit-consent + provenance**, with the consent dialog and provenance doc accurately attributing the upstream source/author/license. DCG (also externally authored, upstream-added, opt-in) gets the same treatment.

### 2.4 How confident are we that these are the _only_ problems?

**High confidence** that the three stated requirements correspond to the three evidence-backed patterns above (default-on telemetry, no workspace-trust/approval gating around sensitive ops + runtime binary acquisition, non-reproducible secret-injected builds). **Cannot be 100% certain there are no additional findings**, because the notice text is generic.

**Additional candidates we checked and cleared**:

- No hidden phone-home endpoint beyond PostHog (runtime outbound = user-configured AI/embedding providers, user-initiated OAuth sign-ins, MCP tool calls, Semble/DCG downloads, PostHog).
- Announcements are bundled assets, not fetched at runtime.
- `qdrant.ashbyfam.com` / `mcp.kapa.ai` appear only in tests.
- Roo Code Cloud (a prior upstream phone-home) was already removed ([adr-cloud-removal.md](../../docs/adr/adr-cloud-removal.md:1)).

**Remaining soft candidates** (fix cheaply, low risk):

- Marketplace listing must carry an explicit privacy-policy link and data-collection disclosure (**still open — manual portal action, see ST-3 status below**).
- [PRIVACY.md](../../PRIVACY.md:3) is stale: says telemetry is "enabled by default", references removed "Roo+ Cloud", lists upstream `support@zoocode.dev`. — ✅ **resolved by ST-1 (A4 rewrite)**.
- [SEMBLE-RELEASE-GOVERNANCE](../../docs/adr/adr-semble-binary-download-only.md:45) is referenced by ADRs but the file does not exist — provenance doc gap. — ✅ **resolved by ST-3 (C3): [`docs/SEMBLE-RELEASE-GOVERNANCE.md`](../SEMBLE-RELEASE-GOVERNANCE.md) recreated** (+ companion `docs/DCG-RELEASE-GOVERNANCE.md`).

**Close the loop**: request full review detail from `vsmarketplace@microsoft.com` (publisher `xavier-arosemena`, extension `roo-plus`) and run an automated scanner (Trail of Bits `vsix-audit`) on the packaged VSIX (WS-D5).

---

## 3. Decisions (locked)

### D1 — Telemetry: **REMOVE entirely (1B)** — selected

- Delete PostHog client registration ([extension.ts](../../src/extension.ts:130)); remove `machineId`/`telemetryKey` plumbing to the webview ([ClineProvider.ts](../../src/core/webview/ClineProvider.ts:2426)); remove `*.posthog.com` CSP entries ([ClineProvider.ts](../../src/core/webview/ClineProvider.ts:1454)); remove banner ([TelemetryBanner.tsx](../../webview-ui/src/components/common/TelemetryBanner.tsx:1)) + settings toggle ([About.tsx](../../webview-ui/src/components/settings/About.tsx:121)); drop `packages/telemetry` consumers/deps and (if nothing remains) the package; remove `POSTHOG` define from [esbuild.mjs](../../src/esbuild.mjs:49) and the three workflows; remove the consent semantics from [misc.ts](../../src/core/webview/handlers/misc.ts:160). Not selected: 1A (align/keep PostHog).

### D2 — Workspace trust: explicit `false` + runtime gate

- `"capabilities": { "untrustedWorkspaces": { "supported": false } }` in [src/package.json](../../src/package.json:1) **and** runtime `isTrusted`/`requestWorkspaceTrust()` gate before the agent can act.

### D3 — Semble/DCG acquisition: **3A — consent-gated download** — selected (3B ruled out)

- First-run explicit approval dialog (name, version, **upstream source repo/author/license**, SHA-256, size) before any download/execution; remember only after approval; no acquisition in an untrusted workspace.

### D4 — Build/publish: **remove secret injection**

- Remove `POSTHOG_API_KEY` from [esbuild.mjs](../../src/esbuild.mjs:51), [marketplace-publish.yml](../../.github/workflows/marketplace-publish.yml:145), [pre-release-publish.yml](../../.github/workflows/pre-release-publish.yml:241), [release-validation.yml](../../.github/workflows/release-validation.yml:98); builds reproducible from repo alone.

---

## 4. Workstreams & concrete changes

### WS-A — Telemetry privacy-hygiene (REMOVE)

- A1: Strip all PostHog/telemetry code paths, UI, and CSP entries per D1 (files listed above; also `src/services/*`, `src/core/*` and `webview-ui/src/*` sites that call `TelemetryService`/`telemetryClient` — see Appendix A for the full call-surface; tests mock `@roo-code/telemetry` and will need to drop those mocks/assertions).
- A2: Remove `POSTHOG` from [esbuild.mjs](../../src/esbuild.mjs:49) + the two `apps/vscode-nightly/esbuild.mjs` and CI workflows; delete/stop wiring `secrets.POSTHOG_API_KEY`.
- A3: Remove `packages/telemetry` if it becomes unused; otherwise prune to empty shell. Remove the telemetry toggle and its i18n keys; delete `TelemetryBanner` and its tests/visual fixtures.
- A4: Rewrite [PRIVACY.md](../../PRIVACY.md:3): no telemetry section (or "no telemetry collected"), fix Cloud/email staleness, state actual data flows (AI provider, marketplace backend).
- A5: Update/remove all affected unit, webview and e2e tests + locale snapshots; confirm no `telemetrySetting`/`machineId`/`POSTHOG` references remain in shipped code.
- **Acceptance**: `grep -r "POSTHOG\|TelemetryService\|telemetryClient\|posthog"` over `src`, `packages`, `webview-ui/src`, `.github` returns nothing but docs/DEBT notes; build succeeds with no secrets; no CSP `*.posthog.com`.

### ST-1 implementation status (2026-09-04)

WS-A (telemetry removal) production scope implemented:

- [x] A1 — Removed `packages/telemetry` (PostHog client + `TelemetryService`) and all runtime call sites in `src/`, `webview-ui/src/`, and `src/package.json`.
- [x] A1 — Deleted `TelemetryBanner`, `TelemetryClient` (posthog-js), the About telemetry toggle, ChatView banner gating, and the `telemetrySetting`/`machineId`/`telemetryKey` plumbing (App, ExtensionStateContext, SettingsView, ClineProvider).
- [x] A2/A4 — Removed `POSTHOG_API_KEY` define from `src/esbuild.mjs` + `apps/vscode-nightly/esbuild.mjs`; dropped the secret from `marketplace-publish.yml`, `pre-release-publish.yml`, `release-validation.yml` (and `code-qa.yml` coverage refs); removed `*.posthog.com` CSP entries.
- [x] A4 — `PRIVACY.md` rewritten (no telemetry; no stale Cloud/contact).
- [x] A3 — `@roo-code/types`: `telemetrySetting`/`telemetryKey`/`machineId` removed from `ExtensionState`, message schemas, and webview-messages. `packages/types/src/telemetry.ts` kept as **minimal type scaffolding** (required by `cloud.ts` MDM integration + shared `ApiProviderError`/`ConsecutiveMistakeError`/property schemas); its PostHog client/event-transmission surface (`TelemetryClient`, PostHog comments) removed.
- [~] A5 — Locale telemetry strings pruned; unit/webview mocks & assertions updated in progress; affected suites still need a full pass (several provider/webview test specs retain legacy `mockCaptureException`/`TelemetryClient`-mock assertions).

### WS-B — Workspace trust & explicit approval for sensitive operations

- B1: Add workspace-trust `capabilities` (D2) to [src/package.json](../../src/package.json:1).
- B2: Runtime trust gate — at session/task start and before sensitive tools (execute, write/apply-diff, read/write outside workspace, MCP tool use, binary acquisition) require a trusted workspace; else `requestWorkspaceTrust()`.
- B3: Explicit first-use approval for Semble and DCG acquisition (name, version, upstream source/author/license, SHA-256, size) before download/execution; remember only after approval; no acquisition when workspace is untrusted. Insert at [semble provider.ts](../../src/services/code-index/semble/provider.ts:124) init and the `ensureDcgInstalled` path in [ExecuteCommandTool.ts](../../src/core/tools/ExecuteCommandTool.ts:126).
- B4: Confirm no execution-affecting setting can be enabled from workspace (attacker-controllable) scope; use `restrictedConfigurations` for any such settings.
- **Acceptance**: agent cannot operate in an untrusted workspace; every first-time binary acquisition requires explicit approval; workspace content alone cannot grant approval.

### WS-C — Publish matching source / reproducibility

- C1: Remove build-time secret injection (D4) — [esbuild.mjs](../../src/esbuild.mjs:49) and workflows.
- C2: Packaging hygiene — extend [.vscodeignore](../../src/.vscodeignore:1) as needed; clean VSIX from HEAD; run `vsix-audit` + manual diff of shipped `dist/` vs build output.
- C3: Semble/DCG provenance (D3/3A): consent + disclosure UI; write the missing **SEMBLE-RELEASE-GOVERNANCE** doc: immutable tag, in-repo checksums, **upstream source/author/license attribution**, how the Roo+-built artifact is produced from the third-party source, and the air-gap manual-binary path. DCG documented likewise.
- **Acceptance**: no secrets required to build; scanner reports no high-severity telemetry/RCE flags; Semble/DCG acquisition transparent, attributed, consent-gated.

### ST-3 implementation status (2026-09-04) — WS-C (reproducibility + provenance)

- [x] **C1 — no build-time secret/analytics injection.** Repo-wide grep (`.github/`, `scripts/`, `package.json`, `apps/*/esbuild.mjs`, `src/esbuild.mjs`, `src/package.json`) finds no `POSTHOG`/`API_KEY`/`process.env.*KEY` injection. The only esbuild `define`s are public (`PKG_RELEASE_CHANNEL`, nightly `PKG_NAME/PKG_VERSION/PKG_OUTPUT_CHANNEL/PKG_RELEASE_CHANNEL/PKG_SHA`). `.github` secrets are publish tokens + `GITHUB_TOKEN`/`CODECOV_TOKEN`/`SLACK_WEBHOOK_URL` only. No analytics `ingest/collect/track` endpoint remains in shipped code. (`packages/types/src/telemetry.ts` is inert zod/type scaffolding required by the cloud MDM integration; `Task.ts` legacy `flushTelemetryInstallment` naming now only drives local task metrics — no client/endpoint/key. Benign bundled third-party strings only: inert `@opentelemetry/api`, AI-SDK optional telemetry metadata, LSP `telemetry/event` protocol constant, Wolfram `MachineID`/DOM `captureEvents` grammar symbols.)
- [x] **C2 — clean reproducible package produced.** `cd src && pnpm exec vsce package --no-dependencies --out ../bin` (runs `vscode:prepublish`: types + webview + `esbuild --production`) succeeded with **no required secrets**. Artifact `bin/roo-plus-3.87.3.vsix`: **1,934 files, 34.19 MB** (`35,847,633` bytes; local SHA-256 `a31a4cda36c3ae8cdf81d9fd758f50450edc396fa4892909d03e6e14611dc501`). Unpacked inspection: **no `posthog`/`machineId`/`captureEvent`/`phc_`** and **no analytics endpoint URL** in `dist/` or webview assets; packaged `package.json` has `capabilities.untrustedWorkspaces.supported: false` and no telemetry fields. `.vscodeignore` whitelist excludes `.env`, `node_modules/`, `coverage/`, tests, `.ts`; no `bin/semble` bundled.
    - **Unblocked two ST-1/A5 build-blockers found during verification**: `webview-ui/src/components/settings/__tests__/About.spec.tsx` and `webview-ui/src/context/__tests__/ExtensionStateContext.spec.tsx` still referenced the removed `telemetrySetting`/`setTelemetrySetting` (broke `webview-ui` `tsc -b`); stale `pnpm-lock.yaml` still pinned `posthog-js` (broke `pnpm install --frozen-lockfile`). Both fixed; `pnpm install --frozen-lockfile --offline` now passes and the lockfile is telemetry-free. **Remaining A5 residue:** ~10 webview spec files still carry stale runtime telemetry expectations (they type-check, but may fail at test runtime) → ST-4 test pass.
- [x] **C3 — Semble/DCG provenance docs written.**
    - [`docs/SEMBLE-RELEASE-GOVERNANCE.md`](../SEMBLE-RELEASE-GOVERNANCE.md) — restored/expanded: authorship reality (upstream `MinishLab/semble`, MIT, Thomas van Dongen; Roo+-controlled packaging repo `Audare-est-Facere/sembleexec`), immutable `v0.5.2` tag, in-repo `SEMBLE_SHA256` table, version↔checksum coupling rule + CI gate, bump checklist (incl. `binary-acquisition/semble.ts` consent metadata), air-gap `codebaseIndexSembleBinaryPath` path.
    - [`docs/DCG-RELEASE-GOVERNANCE.md`](../DCG-RELEASE-GOVERNANCE.md) — proportionate companion (upstream `Dicklesworthstone/destructive_command_guard`, "MIT License with OpenAI/Anthropic Rider", Jeffrey Emanuel; `v0.7.7` + `DCG_ARCHIVES` SHA-256 table; bump procedure).
    - Consent-dialog metadata referenced/kept in sync with [`src/services/binary-acquisition/semble.ts`](../../src/services/binary-acquisition/semble.ts:26) and [`dcg.ts`](../../src/services/binary-acquisition/dcg.ts:41) (single source = downloader/constants modules).
    - [`SECURITY.md`](../../SECURITY.md) gained a **"Reproducibility & Binary Provenance"** section (reproduce-the-VSIX steps, expected size/checksum, no-hidden-collector grep checks, provenance pointers).

### ⚠️ Manual action — Marketplace portal (cannot be done from the repo)

The Marketplace **listing** for publisher `xavier-arosemena` / extension `roo-plus` must be updated **by a maintainer in the Marketplace portal** before/at release (no repo change can do this):

- Set/confirm the **Privacy Policy URL** pointing at [`PRIVACY.md`](../../PRIVACY.md) (repo blob URL or published copy).
- Set/confirm the **data-collection disclosure** (no telemetry; data flows = user-configured AI/embedding providers, Marketplace backend, optional runtime downloads of Semble/DCG after consent).
- This is a pre-release checklist item for WS-D (`marketplace-publish`), tracked in the release PR — do not close Marketplace notice #305 until done.

### Remaining after ST-3

- **ST-4 (WS-D validation)**: CI rebuild + `vsix-audit` scan, full unit/webview/e2e test pass (including the ~10 stale webview specs above), release on the current line.
- **ST-5 (WS-E)**: DEBT.md entries (telemetry removed / re-add-analytics intent; Semble/DCG provenance + consent; periodic Marketplace re-scan; provenance-doc↔constants sync gate).
- No `.changeset`/`CHANGELOG` changes were made by ST-3 (per repo policy).

### WS-D — Verification & release

- D1–D3: Tests per repo policy ([AGENTS.md](../../AGENTS.md:1)): package-local unit tests, webview tests, e2e only where needed; narrow suites then full `cd src && npx vitest run …` and `webview-ui` suites; eslint must not increase suppression counts.
- D4: Full build → VSIX → scanner → release on the current version line per [adr-release-versioning-policy.md](../../docs/adr/adr-release-versioning-policy.md:1); publish to VS Marketplace + Open VSX.
- D5: Reply to the Marketplace notice (fix summary + source pointer); request full review detail to confirm no residual findings.

### WS-E — DEBT register

- Add entries to [DEBT.md](../../DEBT.md:1): (1) telemetry removed — note re-add-opt-in-analytics intent if ever wanted; (2) Semble/DCG provenance + consent follow-ups (3B bundling permanently ruled out); (3) periodic Marketplace-security re-scan; (4) privacy-doc + provenance-doc sync gate (prevent `SEMBLE-RELEASE-GOVERNANCE`-style dangling references).

---

## 5. Sequencing & priority

1. **Immediate (next release)**: WS-A (remove telemetry — required by the notice) + WS-C1 (drop secret injection).
2. **Same/next release**: WS-B (workspace trust + approval for Semble/DCG) + WS-C3 (provenance docs) + WS-A4 (PRIVACY.md).
3. **Verification + publish** (WS-D), then **WS-E**.
4. **Deferred**: none for Semble bundling — 3B ruled out. Only optional future item: opt-in product analytics under full Roo+ control (tracked in DEBT).

## 6. Risks

- **Upstream diff-gate**: gated code-index core files are untouched by this plan; telemetry/trust/webview files are not gated, so changes are safe. Cherry-pick upstream where possible to minimize divergence (DEBT already lists "Upstream Merge Drift" as high priority). Removing telemetry diverges from upstream on these files — acceptable and intentional (fork hardening).
- **Scope creep**: telemetry removal touches many files/tests — keep as a dedicated sub-task (ST-1).
- **Marketplace timeline**: coordinate WS-A/B/C into one or two releases to minimize review cycles.

## 7. Delegation mapping (post-approval)

| Sub-task | Scope                                                      | Mode                          |
| -------- | ---------------------------------------------------------- | ----------------------------- |
| ST-1     | WS-A telemetry removal (+ A4 PRIVACY)                      | code                          |
| ST-2     | WS-B workspace trust + Semble/DCG consent dialogs          | code                          |
| ST-3     | WS-C/D packaging/reproducibility, provenance docs, CI (D4) | devops / deployment-engineer  |
| ST-4     | WS-D validation: rebuild, `vsix-audit`, full test pass     | security-auditor / qa-expert  |
| ST-5     | WS-E DEBT register + docs                                  | code / documentation-engineer |

## Appendix A — Evidence index

- [misc.ts:160-165](../../src/core/webview/handlers/misc.ts:160) — default-on telemetry (consent semantics to remove)
- [TelemetryBanner.tsx:10-17](../../webview-ui/src/components/common/TelemetryBanner.tsx:10) — ✕ = enable (to delete)
- [PostHogTelemetryClient.ts:26-39,147-165](../../packages/telemetry/src/PostHogTelemetryClient.ts:26) — machineId + client (to remove)
- [esbuild.mjs:49-52](../../src/esbuild.mjs:49) + [apps/vscode-nightly/esbuild.mjs:40](apps/vscode-nightly/esbuild.mjs:40) — build-time key injection (to remove)
- [ClineProvider.ts:2426,1454,2465](../../src/core/webview/ClineProvider.ts:2426) — telemetryKey/machineId, CSP, announcement gating
- [extension.ts:130-137](../../src/extension.ts:130) — PostHog registration at activation
- [src/package.json:1-23](../../src/package.json:1) — manifest: add `capabilities`
- [ExecuteCommandTool.ts:126-140](../../src/core/tools/ExecuteCommandTool.ts:126) — DCG auto-install on use (add consent)
- [constants.ts:37](../../src/services/destructive-command-guard/constants.ts:37) — DCG external source
- [semble-downloader.ts:16-27,65](../../src/services/code-index/semble/semble-downloader.ts:16) — Semble pinned v0.5.2, checksums (externally authored)
- [marketplace-publish.yml:145](../../.github/workflows/marketplace-publish.yml:145), [pre-release-publish.yml:241](../../.github/workflows/pre-release-publish.yml:241), [release-validation.yml:98](../../.github/workflows/release-validation.yml:98) — own-secret injection (to remove)
- [PRIVACY.md:35-42,70](../../PRIVACY.md:35) — stale "enabled by default", upstream contact
- [adr-cloud-removal.md](../../docs/adr/adr-cloud-removal.md:1), [adr-semble-binary-download-only.md](../../docs/adr/adr-semble-binary-download-only.md:1), [adr-upstream-alignment-fork-strategy.md](../../docs/adr/adr-upstream-alignment-fork-strategy.md:1)

## Appendix B — Upstream comparison (verified against `Zoo-Code-Org/Zoo-Code@main`, 2026-09-04)

| Area                               | Upstream Zoo-Code                          | Roo+ (fork)                                                             |
| ---------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------- |
| Telemetry consent                  | Fixed: opt-out + Accept/Decline (PR #1069) | Drifted: default-on, ✕=enable → **decision: remove entirely**           |
| Telemetry key owner                | Zoo-Code's own CI secret                   | Roo+'s own CI secret (or none) → **removing injection**                 |
| `capabilities.untrustedWorkspaces` | Absent                                     | Absent (shared gap) → **fixing on fork**                                |
| Semble binary                      | N/A (Qdrant code-index)                    | Fork-specific, externally-authored, pinned download → **consent-gated** |
| Runtime DCG download               | Present (opt-in)                           | Present (inherited) → **consent-gated**                                 |
| Build-time POSTHOG injection       | Present (own secret)                       | Present (own secret) → **removed**                                      |

---

## 8. Execution status (2026-09-08)

All implementation sub-tasks are complete and verified. DoD met on each.

| Sub-task                                  | Result                                                                                                                                                                                                                                                                                     |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **ST-1** Telemetry removal + test cleanup | PostHog removed from code/tests/build/CSP/CI/PRIVACY. Grep clean except CHANGELOG history + inert `packages/types/src/telemetry.ts` scaffolding + `tool-id.spec` MCP fixtures.                                                                                                             |
| **ST-2** Workspace trust + binary consent | `capabilities.untrustedWorkspaces.supported=false` + `restrictedConfigurations` (allowedCommands/deniedCommands/timeoutAllowlist); runtime trust gates (task start, execute, auto-approval); Semble/DCG consent gate (fail-closed; persisted only on explicit "Always allow"); 18 locales. |
| **ST-3** Reproducibility + provenance     | Secret-free reproducible VSIX (34.19 MB, 1,934 files; no telemetry/key/endpoint); `docs/SEMBLE-RELEASE-GOVERNANCE.md` + `docs/DCG-RELEASE-GOVERNANCE.md` created (external authorship disclosed); SECURITY.md reproducibility section.                                                     |
| **ST-4** Validation                       | Full suites green: src 7,710 / webview-ui 1,784 / packages/types 1,424 / scripts 103 (0 failed). eslint clean (suppressions −4, no per-file increases). `@trailofbits/vsix-audit` run (YARA-X unavailable): findings = false positives/by-design; manual greps clean.                      |
| **ST-5** DEBT/docs                        | Open follow-ups #22–#25 added to [`DEBT.md`](../../DEBT.md) (portal action, periodic re-scan, consent-metadata sync guard, optional opt-in analytics).                                                                                                                                     |

**Remaining manual (cannot close from repo)**: surface the privacy link on the Marketplace listing and republish, publish the post-#305 release, and reply to notice #305 with the privacy URL + fix summary (WS-D5 / DEBT #22).

**Clarification (2026-09-23)**: there is **no dedicated "Privacy Policy URL" field** in the VS Code Marketplace portal. For VS Code extensions the listing's Resources links come only from `package.json` (`repository`, `homepage`, `bugs`, `license`); privacy is surfaced via the listing **README**. The policy link has been added to the Marketplace-visible README (root + `src/README.md`); a republish is required for it to appear. [`PRIVACY.md`](../../PRIVACY.md) "Contact Us" uses a GitHub `privacy`-labeled issue link (plus [`SECURITY.md`](../../SECURITY.md) for private vulnerability reports) — no email required.
