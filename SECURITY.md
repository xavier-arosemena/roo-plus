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

The published VSIX is a **clean build of this repository with no build-time
secrets and no analytics/telemetry endpoints**. `POSTHOG_API_KEY` (and any
other endpoint key) is **not** injected by any build or packaging step; the
webview and `dist/` bundles contain no PostHog client, no `machineId`, and no
analytics `ingest`/`collect`/`track` endpoint.

### Verify the published VSIX matches this repo

From a clean checkout at the tagged release commit:

```bash
# 1. Deterministic install (frozen lockfile) then a clean build + package.
pnpm install --frozen-lockfile
pnpm clean
cd src && pnpm exec vsce package --no-dependencies --out ../bin
# Equivalent one-shot script: `pnpm vsix` (root) — runs the same chain.
```

`vsce package` runs `vscode:prepublish`, which rebuilds the shared types, the
webview (`webview-ui` → `src/webview-ui/build`), and the extension bundle
(`src/esbuild.mjs --production`). The expected artifact for the current line
is `bin/roo-plus-3.87.3.vsix` — ~**34.19 MB / 1,934 files** (measured
2026-09-04; local SHA-256 `a31a4cda36c3ae8cdf81d9fd758f50450edc396fa4892909d03e6e14611dc501`).

> **Byte-for-byte reproducibility caveat:** the bundle ships source maps whose
> content may embed build-machine absolute paths and timestamps, so two builds
> on different machines may not be byte-identical. Verify by (a) rebuilding
> from the same pinned `custom-modes` submodule + release commit, and
> (b) re-running the content checks below — not by comparing raw bytes alone.

Then confirm the artifact has no hidden collector:

```bash
unzip -q bin/roo-plus-3.87.3.vsix -d /tmp/vsix-inspect
grep -rliE 'posthog|POSTHOG_API_KEY|machineId|captureEvent|phc_' \
  /tmp/vsix-inspect/extension --exclude='*.map'   # expect: no output
# No analytics endpoint should appear in shipped JS:
grep -rhoE 'https://[a-zA-Z0-9._/-]*(ingest|collect|track|analytics|telemetry)[a-zA-Z0-9._/?=&-]*' \
  /tmp/vsix-inspect/extension/dist /tmp/vsix-inspect/extension/webview-ui --include='*.js'  # expect: no output
```

The packaged `extension/package.json` must declare
`capabilities.untrustedWorkspaces.supported: false` and no telemetry fields.
Source maps, locale files, icons and WAsMs are intentionally included; `.env`,
`node_modules/`, `coverage/`, tests, and TypeScript sources are excluded via
[`src/.vscodeignore`](src/.vscodeignore).

### Runtime-acquired binaries are NOT part of the published source

Roo+ downloads and runs two **externally-authored** helper binaries at first
use after an explicit, workspace-trusted consent prompt. They are not bundled
in the VSIX and are not Roo+ source — full authorship/provenance:

- **Semble** (code search) — upstream [`MinishLab/semble`](https://github.com/MinishLab/semble)
  (MIT, Thomas van Dongen); Roo+-controlled packaging repo
  [`Audare-est-Facere/sembleexec`](https://github.com/Audare-est-Facere/sembleexec),
  pinned `v0.5.2`, checksums + consent metadata — see
  [`docs/SEMBLE-RELEASE-GOVERNANCE.md`](docs/SEMBLE-RELEASE-GOVERNANCE.md).
- **DCG** (destructive command guard) — upstream
  [`Dicklesworthstone/destructive_command_guard`](https://github.com/Dicklesworthstone/destructive_command_guard)
  ("MIT License with OpenAI/Anthropic Rider", Jeffrey Emanuel), pinned
  `v0.7.7` — see [`docs/DCG-RELEASE-GOVERNANCE.md`](docs/DCG-RELEASE-GOVERNANCE.md).

Both are SHA-256 verified after download and only ever run in a trusted
workspace after explicit user approval (see
[`src/services/binary-acquisition/`](src/services/binary-acquisition)).

## Questions

For general security questions that are **not** vulnerability reports, open a
GitHub Discussion on the repository and tag `security` in the title.
