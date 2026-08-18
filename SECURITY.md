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

## Questions

For general security questions that are **not** vulnerability reports, open a
GitHub Discussion on the repository and tag `security` in the title.
