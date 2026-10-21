# Security Policy

Roo+ takes the security of our software and the safety of our users seriously.
This policy describes which versions we support, how to report a vulnerability,
and what you can expect once a report is submitted.

## Supported Versions

Roo+ follows [Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`).
Security patches are released for the **latest stable minor version** and, on a
best-effort basis, for the most recent previous minor version.

| Version        | Supported          |
| -------------- | ------------------ |
| Latest stable  | ✅ Fully supported |
| Previous minor | ⚠️ Best effort     |
| Older versions | ❌ Not supported   |

If you are running an unsupported version, upgrade to the latest release before
reporting a vulnerability.

## Reporting a Vulnerability

**Do NOT open a public GitHub issue for security vulnerabilities.** Please
report privately so the issue can be assessed and fixed before it is disclosed.

Use **GitHub Private Vulnerability Disclosure** — the only supported reporting
channel:

1. Open the repository's **Security** tab.
2. Select **Report a vulnerability**.
3. Fill in the form using the template below.

Direct link: <https://github.com/xavier-arosemena/roo-plus/security/advisories/new>

> Why GitHub-only: the form keeps the report private, delivers a structured and
> triage-ready report, notifies maintainers immediately, and automatically
> creates a draft security advisory for coordinated disclosure.

### What to include

| Field              | Details                                                 |
| ------------------ | ------------------------------------------------------- |
| Summary            | A short, clear description of the vulnerability         |
| Affected versions  | Version(s) of Roo+ you verified the issue against       |
| Steps to reproduce | Minimal, reproducible steps or a proof of concept       |
| Impact             | What an attacker can achieve, and under what conditions |
| Suggested fix      | Optional: any mitigation or patch you have identified   |

If your report involves credentials or other sensitive data, do not include
them in the form; we will request them securely if needed.

## What happens next

| Step                                 | Timeframe                     |
| ------------------------------------ | ----------------------------- |
| Acknowledgment                       | Within 48 hours of submission |
| Triage and severity assessment       | Within 5 business days        |
| Fix, release, coordinated disclosure | Target of 90 days from triage |

We will keep you informed as the report progresses. If remediation will take
longer than 90 days, we will agree on a revised timeline before the deadline.

## Coordinated Disclosure

We follow a coordinated disclosure process:

1. You report the vulnerability privately.
2. We confirm and triage the report.
3. A fix is prepared, tested, and released.
4. The vulnerability is disclosed publicly (advisory and changelog entry) after
   the fix is available.

Researchers who report valid vulnerabilities are credited in the advisory and
changelog, unless they prefer to remain anonymous.

## Scope

**In scope:** The Roo+ source code in this repository.

**Out of scope:**

- Vulnerabilities in upstream projects (Zoo Code, Roo Code, Cline) — report
  these to the respective projects.
- Vulnerabilities in third-party dependencies — tracked automatically via
  Dependabot and CodeQL; no manual report is needed.
- Vulnerabilities in API providers or services that Roo+ connects to — report
  these to the provider directly.
- Issues caused by user-installed third-party modes, MCP servers, or custom
  extensions.

## Our Security Posture

The repository runs an automated security toolchain on every change:

- **Dependabot** — automated dependency updates and advisory alerts
- **CodeQL** — static analysis for JavaScript/TypeScript on push and PRs
- **Secret scanning** — detection of leaked credentials in committed code
- **Automated alert triage** — high/critical alerts are surfaced as tracked
  issues for manual remediation

## Reproducibility & Binary Provenance

This section documents the intended provenance of a VSIX built from the
**current source tree**: a **clean build with no build-time secrets and no
analytics/telemetry endpoints**. `POSTHOG_API_KEY` (and any other endpoint key)
is **not** injected by any build or packaging step; the webview and `dist/`
bundles contain no PostHog client, no `machineId`, and no analytics
`ingest`/`collect`/`track` endpoint.

> ✅ **Status of this record (2026-09-08):** this section is measured from the
> post-#305-fix tree (commit `1aa18aef0` + the working-tree edits listed in the
> callout below), superseding the 2026-09-04 pre-fix figures. These numbers are
> a snapshot of that tree: **any later change to shipped code that does not bump
> the version invalidates them**, so future rebuilds must re-measure (see
> below) — do not reuse these figures for a different tree.

### Verify the published VSIX matches this repo

From a clean checkout at the tagged release commit:

```bash
# 1. Deterministic install (frozen lockfile).
pnpm install --frozen-lockfile
# 2. Clean build outputs. NOTE: `pnpm clean` (turbo clean + rimraf dist out bin)
#    ALSO deletes the packaging inputs src/README.md and src/CHANGELOG.md (both
#    git-tracked), src/LICENSE, and the whole bin/ directory. Restore the two
#    tracked inputs and recreate bin/ before packaging — `vsce` and its
#    pre-packaging verify-announcement-version gate require them:
pnpm clean
git checkout -- src/README.md src/CHANGELOG.md
mkdir -p bin
# 3. Package. `vsce package` runs `vscode:prepublish`, which re-copies
#    README.md/CHANGELOG.md/LICENSE from the repo root and rebuilds the shared
#    types, the webview, and the extension bundle (src/esbuild.mjs --production):
cd src && pnpm exec vsce package --no-dependencies --out ../bin
# One-shot CI-equivalent (does NOT run `pnpm clean`): `pnpm --filter ./src vsix`.
```

`vsce package` runs `vscode:prepublish`, which rebuilds the shared types, the
webview (`webview-ui` → `src/webview-ui/build`), and the extension bundle
(`src/esbuild.mjs --production`). Per
[`docs/adr/adr-release-versioning-policy.md`](docs/adr/adr-release-versioning-policy.md)
the committed version in [`src/package.json`](src/package.json) is the shipped
version, so the expected artifact filename for the current line is
`bin/roo-plus-3.87.3.vsix` (the version is unchanged at **3.87.3** on the
post-#305-fix tree).

> ✅ **Recorded measurement (2026-09-08) — post-#305-fix tree.**
>
> `bin/roo-plus-3.87.3.vsix` was rebuilt and measured on **2026-09-08** from the
> **current working tree**: commit `1aa18aef0` ("Security: resolve Marketplace
> notification #305", 2026-09-08) **plus 9 uncommitted, already-reviewed
> follow-up edits present at measurement time**: `DEBT.md`, `SECURITY.md`,
> `packages/types/src/telemetry.ts`, `scripts/message-schema-analysis.mjs`,
> `src/core/config/__tests__/importExport.spec.ts`,
> `src/core/webview/__tests__/ClineProvider.spec.ts`,
> `src/eslint-suppressions.json`, `src/utils/workspaceTrust.ts`,
> `src/utils/__tests__/workspaceTrust.spec.ts`. Of those, only
> `packages/types/src/telemetry.ts` (removed dead zod schemas; the kept
> `staticAppPropertiesSchema`/`gitPropertiesSchema` are what `cloud.ts` uses)
> can affect shipped bundle content.
>
> | Metric  | 2026-09-04 · pre-#305-fix tree (superseded)                        | 2026-09-08 · post-#305-fix tree (current)                                                            |
> | ------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
> | SHA-256 | `a31a4cda36c3ae8cdf81d9fd758f50450edc396fa4892909d03e6e14611dc501` | `d60a9adbeb3c107b6db3cea494c9a02cee45439766343f96d64392b5e424e514`                                   |
> | Size    | ~34.19 MB (35,847,633 bytes)                                       | ~34.18 MB (35,844,036 bytes)                                                                         |
> | Files   | 1,934                                                              | 1,934 total in archive (1,932 under `extension/` + `[Content_Types].xml` + `extension.vsixmanifest`) |
>
> **Future rebuilds must re-measure.** The version is unchanged at 3.87.3, so
> any later edit that changes shipped code (like `1aa18aef0` did) makes these
> bytes stale. Rebuild with the steps above, re-run the content checks below,
> and update this table with the new SHA-256 / size / file count — do **not**
> reuse the 2026-09-04 or 2026-09-08 figures for any other tree.

> **Byte-for-byte reproducibility caveat:** the bundle ships source maps whose
> content may embed build-machine absolute paths and timestamps, so two builds
> on different machines may not be byte-identical. Verify by (a) rebuilding
> from the same pinned `custom-modes` submodule + release commit, and
> (b) re-running the content checks below — not by comparing raw bytes alone.

Then confirm the artifact has no hidden collector:

```bash
unzip -q bin/roo-plus-3.87.3.vsix -d /tmp/vsix-inspect
# 1) No PostHog/telemetry client marker in any shipped JS bundle (expect: no output):
grep -rilE 'posthog|POSTHOG_API_KEY|phc_|posthog-js' \
  /tmp/vsix-inspect/extension/dist /tmp/vsix-inspect/extension/webview-ui/build \
  --include='*.js' --exclude='*.map'
# 2) No telemetry machineId key, case-sensitive, in shipped JS (expect: no output):
grep -rl 'machineId' \
  /tmp/vsix-inspect/extension/dist /tmp/vsix-inspect/extension/webview-ui/build \
  --include='*.js' --exclude='*.map'
# 3) No analytics ingest/collect/track/analytics/telemetry endpoint URL in shipped JS (expect: no output):
grep -rhoE 'https://[a-zA-Z0-9._/-]*(ingest|collect|track|analytics|telemetry)[a-zA-Z0-9._/?=&-]*' \
  /tmp/vsix-inspect/extension/dist /tmp/vsix-inspect/extension/webview-ui/build \
  --include='*.js' --exclude='*.map'
```

> **Known benign hits (2026-09-08 measurement):** the broader case-insensitive
> pattern `machineId|captureEvent` applied to the whole extracted `extension/`
> does match non-telemetry content and must not be read as a collector:
>
> - `extension/changelog.md` — release-note prose mentioning PostHog only
>   historically (entries describing its past removal and the `posthog-js`
>   dependency).
> - `extension/webview-ui/build/assets/coffee-*.js` and `wolfram-*.js` — the
>   CoffeeScript and Wolfram TextMate grammars, whose identifier lists contain
>   the legacy DOM API `captureEvents` and the Wolfram symbol `MachineID`.
> - Bundled WASM payloads (`extension/dist/esbuild.wasm`; base64 wasm inside a
>   `extension/webview-ui/build/assets/wasm-*.js`) — byte-level coincidences
>   (`captureEvent`, `PHC`).
>
> Verified clean on 2026-09-08: `phc_` and `POSTHOG_API_KEY` have **zero** hits
> in the package, case-sensitive `machineId` has **zero** hits in shipped JS,
> and `posthog` appears in **zero** of the 381 shipped `.js` files — no PostHog
> client is present.

The packaged `extension/package.json` must declare
`capabilities.untrustedWorkspaces.supported: false` and the
`capabilities.untrustedWorkspaces.restrictedConfigurations` allowlist
(`roo-plus.allowedCommands`, `roo-plus.deniedCommands`,
`roo-plus.commandTimeoutAllowlist`), with no telemetry fields (all verified on
2026-09-08).
Source maps, locale files, icons and WAsMs are intentionally included; `.env`,
`node_modules/`, `coverage/`, tests, and TypeScript sources are excluded via
[`src/.vscodeignore`](src/.vscodeignore).

### VSIX audit gate (DEBT #23 — re-armed 2026-10-21)

Trail of Bits' [`@trailofbits/vsix-audit`](https://github.com/trailofbits/vsix-audit)
(**pinned `0.3.0`**) runs as an **advisory gate** in
[`release-validation.yml`](.github/workflows/release-validation.yml), with
**YARA-X `v1.20.0` installed** (pinned release archive, checksum-verified) so the
scan has full detection coverage. The gate was removed on 2026-09-08 on the
assumption that the Marketplace scanned for us; the publisher was blocked and the
listing removed on 2026-10-20, which retired that assumption. The reversal and
the register-regeneration procedure are recorded in [DEBT #23](DEBT.md).

**The publish workflows do not run this gate.** Wiring it into
`pre-release-publish.yml` and `marketplace-publish.yml` is **parked** on the
`wip/publish-workflow-audit` branch and is deliberately absent from this tree:
both publish workflows are unchanged until the delivery model is re-decided.
Until that wiring lands, `VSIX_AUDIT_ENFORCE` exists only in
`release-validation.yml`, and no publication is gated — or delayed — by an audit
result.

**Two scanning stages, one finding shape.** `@trailofbits/vsix-audit@0.3.0` skips
every file larger than 10 MiB in its YARA check (`dist/scanner/checks/yara.js`:
`if (buffer.length > 10 * 1024 * 1024) continue;`). The packaged
`dist/extension.js` is 15,059,325 bytes, so stage 1 never YARA-scans the bundle
that runs at activation. [`scripts/vsix-audit.mjs`](scripts/vsix-audit.mjs)
therefore runs a **second stage**: it enumerates every packaged file above the
same 10 MiB threshold straight out of the VSIX central directory, scans each with
the **pinned `yr` binary (YARA-X v1.20.0)** and the rule set the tool itself
ships (`@trailofbits/vsix-audit/zoo/signatures/yara/*.yar`), and maps matches into
the tool's finding shape (`id: "YARA_<rule>"`, `category: "yara"`,
`location.file`) so the register triage applies unchanged. Stage 2 deliberately
does **not** inherit the tool's `dist/**` suppression table: `dist/` is where the
blind file lives. It produces more findings, never fewer.

**What `coverage: full` means.** It is printed **only** when stage 1 reported no
degradation **and** YARA-X was present **and** every packaged file over 10 MiB was
actually scanned. Anything else prints `coverage: DEGRADED` with the reason —
`YARA-X unavailable`, `oversized-file stage unavailable: …`, `oversized files not
scanned: …`, `oversized file scan failed: …`, or `oversized-file stage not run`.
There is **no flag that skips stage 2**; a missing `yr` is a degraded-coverage
failure, never a silent skip.

**Register identity.** Entries record the exact path that was triaged, but
matching normalises the **trailing 1–2 content-hash segments** of a `.js`/`.js.map`
bundle on both sides (`mermaid~…~ganttDiagram-~gdd5p7yb-DHB4NmXe.js` →
`mermaid~…~ganttDiagram--<hash>.js`). A webview rebuild that re-hashes chunks
therefore keeps matching its reviewed family instead of forcing a bulk re-accept
of a dozen entries. Files with no hash suffix (`changelog.md`, `dist/extension.js`,
…) still match exactly. Caps combine strictly inside a family (lowest severity,
largest per-file count), so normalisation can only _stabilise_ a cap, never widen
it: a new file family, a new rule inside a family, a raised severity or more hits
than the baseline still fails the gate.

**Exit-code policy.** One contract, shared with the workflows: `0` pass with full
coverage · `1` unregistered or escalated findings · `2` degraded coverage (YARA-X
unavailable, or an oversized file not scanned) or tool failure · `3`
usage/configuration error (bad arguments, missing VSIX, malformed register). Exit
`2` is **reachable by design**: the workflows install YARA-X with
`continue-on-error`, so a missing scanner produces a degraded scan and exit `2`
rather than a job that dies in its own toolchain, and the report line always names
the degradation (`coverage: DEGRADED (…)`) so it cannot disagree with the exit
code.

**Enforcement is one switch.** `VSIX_AUDIT_ENFORCE` is a workflow-level `env`
value in all three workflows and defaults to `"false"` = **advisory**: the scan
runs, findings annotate, and nothing fails because of it. It is flipped to
`"true"` only after the by-design register has been regenerated from a current
artefact; while enforcing, a _missing_ audit result (step skipped, cancelled,
timed out) is a **failure, never a pass**. See
[`docs/runbooks/release-publishing.md`](docs/runbooks/release-publishing.md)
("VSIX audit enforcement switch").

**No audit outcome may block an Open VSX publication**, and that is now
structural rather than aspirational: in both publish workflows the entire audit
cluster (YARA-X install, scan, enforcement) runs _after_ the Open VSX publish and
_after_ the GitHub release/tag, the install and the scan are `continue-on-error`
with per-step `timeout-minutes`, and the Marketplace leg stays
`continue-on-error: true`.

Run it manually from the repo root against any built `.vsix`:

```bash
pnpm --filter ./src vsix
PATH=<pinned-yara-x>:$PATH node scripts/vsix-audit.mjs bin/roo-plus-<version>.vsix --publish
```

[`scripts/vsix-audit.mjs`](scripts/vsix-audit.mjs) invokes
`npx --yes @trailofbits/vsix-audit@0.3.0 scan <vsix> --output json` for stage 1,
`yr scan` over every oversized file for stage 2, reports structured findings, and
checks both against the by-design register. Convenience scripts:
`pnpm verify:vsix-audit --publish <vsix>` (gate a built artefact) and
`pnpm vsix:audit` (package, then audit the newest `.vsix`). Neither is wired into
`prevsix`/`prebundle`, so a local build does not require YARA-X. **YARA-X
availability**: full detection coverage requires the YARA-X `yr` binary on
`PATH` — the CI workflows install **v1.20.0**; install it yourself for a
full-coverage local pass. Without it the scan is **degraded** and the wrapper
exits nonzero — pass `--allow-degraded` for a local inspection pass that only
warns and exits `0` when there are no real findings. Exit codes: `0` pass ·
`1` real findings · `2` degraded/tool error · `3` usage (including a malformed
register). The register is schema-validated on load: every entry needs a
non-empty `reason`, verdict `by-design`, a `low|medium|high|critical` severity cap
and a positive integer `count`, so a bare entry cannot silence a finding.

**By-design register**: [`scripts/vsix-audit-register.json`](scripts/vsix-audit-register.json)
records the triage of every finding as by-design (rule + exact file + severity
cap + baseline count + reason). It is a **3.87.3 baseline snapshot**: a real
full-coverage scan of `bin/roo-plus-3.87.3.vsix` on 2026-09-08 (YARA-X
**v1.20.0** present, `coverage.degraded: false`) found **208 findings across 19
rule classes**, all registered by-design. The dominant classes are content
coincidence, not threats: `CRYPTO_WALLET_DETECTED` (base64 BPE-tokenizer vocab /
WASM payloads, all `knownMalicious:false`), `AST_*` eval/`Function` in bundled
OSS libraries (underscore templates, pdf.js, tree-sitter), YARA `SUSP_*`
heuristics on minified diagram/source-map/grammar/YAML/changelog content,
KaTeX/bidi regex character-range matches, localized emoji/variation-selector
strings, and the declared `onStartupFinished` + child-process capability (gated
by `untrustedWorkspaces.supported:false` + consent — see
[`src/utils/workspaceTrust.ts`](src/utils/workspaceTrust.ts)). A maintainer may
**regenerate** the register when running a deliberate pass on a newer artifact —
any new file/rule, or a severity/count escalation of a listed finding, should be
re-triaged into the register with a reason. The register is **filename-keyed** to
the scanner's reported paths, so a webview rebuild that re-hashes chunk names
invalidates the affected entries and the gate **fails closed** until they are
re-mapped — regenerate it with YARA-X present before treating it as a baseline.

**Standing supply-chain / #305 controls** — these, not vsix-audit, are the
automated release-time checks:

- Supply chain / advisories: `actions/dependency-review-action` in
  [`code-qa.yml`](.github/workflows/code-qa.yml).
- #305-class telemetry: the **no-telemetry content greps** above (no PostHog /
  `phc_` / `POSTHOG_API_KEY`, no telemetry `machineId`, no analytics endpoint
  URLs in shipped JS), backed by the source-level Unicode/bidi-override scan in
  [`code-qa.yml`](.github/workflows/code-qa.yml), building from public source,
  and the Marketplace's own scanning.

**Tests**: [`scripts/vsix-audit.spec.mjs`](scripts/vsix-audit.spec.mjs)
(node:test, injected fake scan results; 24 cases) — run with
`node --test scripts/vsix-audit.spec.mjs` or via `test:scripts`.

### Externally-authored binaries in and around the package

Roo+ runs two **externally-authored** helper executables. Neither is Roo+ source;
both are disclosed in [`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md), which
ships inside the VSIX, and both only ever run in a trusted workspace after
explicit user approval (see
[`src/services/binary-acquisition/`](src/services/binary-acquisition)).

- **DCG** (destructive command guard) — upstream
  [`Dicklesworthstone/destructive_command_guard`](https://github.com/Dicklesworthstone/destructive_command_guard)
  ("MIT License with OpenAI/Anthropic Rider", Jeffrey Emanuel), pinned `v0.7.7`.
  **Bundled** in the VSIX under `bin/dcg/` (unmodified upstream release archives,
  five platforms); there is **no download path**. Both the archive and the
  extracted executable are verified against pinned SHA-256 values before
  execution. See [`docs/DCG-RELEASE-GOVERNANCE.md`](docs/DCG-RELEASE-GOVERNANCE.md).
- **Semble** (code search) — upstream [`MinishLab/semble`](https://github.com/MinishLab/semble)
  (MIT, Thomas van Dongen), pinned `v0.5.2`. Still **downloaded at first use**
  (consent-gated, SHA-256 verified); decision 2a — detect and guide only, no
  acquisition by Roo+ — is recorded and its code removal is tracked in
  [`DEBT.md`](DEBT.md) #28. See
  [`docs/SEMBLE-RELEASE-GOVERNANCE.md`](docs/SEMBLE-RELEASE-GOVERNANCE.md).

Acquisition strategy and its rationale:
[`docs/adr/adr-binary-acquisition-strategy.md`](docs/adr/adr-binary-acquisition-strategy.md).

## Questions

For general security questions that are **not** vulnerability reports, open a
GitHub Discussion on the repository and tag `security` in the title.
