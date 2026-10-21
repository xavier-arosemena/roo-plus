# Roo+ Privacy Policy

**Last Updated: October 21st, 2026**

Roo+ respects your privacy and is committed to transparency about how we
handle your data. Below is a simple breakdown of where key pieces of data
go—and, importantly, where they don't.

## **Where Your Data Goes (And Where It Doesn’t)**

- **Code & Files**: Roo+ accesses files on your local machine when needed
  for AI-assisted features. When you send commands to Roo+, relevant files
  may be transmitted to your chosen AI model provider (e.g., OpenAI, Anthropic,
  OpenRouter) to generate responses. Your code is sent directly to the
  provider you selected; we do not relay or store it.
- **Commands**: Any commands executed through Roo+ happen on your local
  environment. However, when you use AI-powered features, the relevant code and
  context from your commands may be transmitted to your chosen AI model provider
  (e.g., OpenAI, Anthropic, OpenRouter) to generate responses. We do not have
  access to or store this data, but AI providers may process it per their
  privacy policies.
- **Prompts & AI Requests**: When you use AI-powered features, your prompts and
  relevant project context are sent to your chosen AI model provider (e.g.,
  OpenAI, Anthropic, OpenRouter) to generate responses. We do not store or
  process this data. These AI providers have their own privacy policies and may
  store data per their terms of service.
- **API Keys & Credentials**: If you enter an API key (e.g., to connect an AI
  model), it is stored locally on your device and never sent to us or any third
  party, except the provider you have chosen.
- **Third-Party Executables**: Roo+ runs two external binaries. DCG (destructive
  command guard) is **bundled inside the extension** — nothing is fetched. Semble
  (code search) is downloaded from GitHub release assets at first use, after you
  explicitly allow it. See **Third-Party Executables** below, and
  [`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md) for full attribution.
- **No Telemetry**: Roo+ does **not** collect usage, analytics, or error
  telemetry. It contains no embedded analytics/PostHog SDK, does not transmit
  feature-usage data, VS Code machine IDs, or exception reports to Roo+ or any
  analytics provider, and there is no telemetry setting or consent prompt.
- **Marketplace Requests**: When you browse or search the Marketplace for Model
  Configuration Profiles (MCPs) or Custom Modes, Roo+ makes a secure API
  call to Roo+'s backend servers to retrieve listing information. These
  requests send only the query parameters (e.g., extension version, search term)
  necessary to fulfill the request and do not include your code, prompts, or
  personally identifiable information.

## **Third-Party Executables**

Roo+ runs two external executables. They are governed differently:

- **DCG** (`destructive_command_guard`) — blocks destructive shell commands.
  Sourced from the upstream `Dicklesworthstone/destructive_command_guard`, pinned
  to `v0.7.7`. It is **bundled inside the VSIX** (unmodified upstream release
  archives for all supported platforms, under `bin/dcg/`); **no network request
  is made**. The extension **never** downloads DCG. Enabling the guard shows an
  **explicit consent** prompt naming the version, upstream source and SHA-256;
  the archive and the extracted executable are verified against pinned SHA-256
  values before the binary runs, so a tampered VSIX is refused.
- **Semble** — code search for the codebase index. Built from the upstream
  `MinishLab/semble`; the prebuilt release assets are published under
  `Audare-est-Facere/sembleexec`, pinned to `v0.5.2`. It is **downloaded at first
  use** (and again only when its pinned version changes):
    - The download happens only after an **explicit consent** prompt that names the
      executable, its pinned version, its upstream source and its SHA-256 checksum.
      Declining disables that one feature; it does not degrade the others.
    - Downloads are **pinned to a fixed version**, and each archive is **verified
      by SHA-256** before the binary is executed.
    - No download is attempted in an untrusted workspace.
    - The request goes to GitHub release assets (`github.com`,
      `objects.githubusercontent.com`, `release-assets.githubusercontent.com`). As
      with any HTTPS request, GitHub sees the requesting IP address; Roo+ sends no
      code, prompts, or credentials with it.

Full attribution for both components — including the DCG licence text (MIT with
the OpenAI/Anthropic rider) and the generated list of bundled JavaScript
dependencies — is in [`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md). The
acquisition strategy and its rationale are recorded in
[`docs/adr/adr-binary-acquisition-strategy.md`](docs/adr/adr-binary-acquisition-strategy.md).

Full provenance, per-platform checksums and the version-bump procedure:
[`docs/SEMBLE-RELEASE-GOVERNANCE.md`](docs/SEMBLE-RELEASE-GOVERNANCE.md) and
[`docs/DCG-RELEASE-GOVERNANCE.md`](docs/DCG-RELEASE-GOVERNANCE.md).

## **How We Use Your Data (If Collected)**

- We do **not** sell or share your data.
- We do **not** train any models on your data.
- Because Roo+ collects no telemetry, there is no usage or error data to use
  for product analytics.

## **Your Choices & Control**

- You can run models locally to prevent data being sent to third-parties.
- You can delete Roo+ to stop all data collection.

## **Security & Updates**

We take reasonable measures to secure your data, but no system is 100% secure.
If our privacy policy changes, we will notify you within the extension.

## **Contact Us**

Roo+ is open source and collects no personal data, so questions and requests are
handled through the project's public channels:

- **Privacy questions or requests**: open an issue with the `privacy` label —
  <https://github.com/xavier-arosemena/roo-plus/issues/new?labels=privacy>.
- **Security vulnerabilities**: use GitHub Private Vulnerability Disclosure via
  the repository's **Security** tab (see [`SECURITY.md`](SECURITY.md)), not a
  public issue.

Because Roo+ does not collect telemetry or personal data, there is no account or
usage data to access, correct, or delete. If Roo+ ever begins collecting
personal data, this policy and its contact options will be updated accordingly.

---

By using Roo+, you agree to this Privacy Policy.
