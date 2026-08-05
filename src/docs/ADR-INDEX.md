# Roo+ Architecture Decision Records (ADRs)

This directory collects Architecture Decision Records (ADRs), architecture reviews, and planning references for the Roo+ fork. ADRs document **why** a decision was made (Context → Decision → Consequences), following the repo's [Documentation & ADR Protocol](../../.roo/rules/rules.md).

## ADR Index

| Document                                                                                        | Status      | Date       | Decision                                                                                                                                                                                                                |
| ----------------------------------------------------------------------------------------------- | ----------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Semble Release Governance](../../docs/SEMBLE-RELEASE-GOVERNANCE.md)                            | ✅ ACTIVE   | 2026-08-05 | Formalize the immutable-release-tags rule + version↔checksum coupling procedure for the `Audare-est-Facere/sembleexec` installer (review item 2c); CI-enforced by `scripts/verify-semble-release-coupling.mjs`          |
| [Architecture Review: Code-Index & Semble](../../docs/architecture-review-code-index-semble.md) | —           | 2026-08-05 | Root-cause of the field code-index breakage (stale cached stub + sticky Error state); Qdrant core byte-identical to upstream (keep), Semble layer intentionally hardened (keep); remediation R1/R2 + release governance |
| [Typed + Runtime-Validated Webview Message Protocol](adr-typed-message-protocol.md)             | ✅ ACCEPTED | 2026-07-31 | Adopt a zod schema registry (`packages/types/src/webview-messages/`) as the single source of truth for webview↔extension messages; boundary-validate at `ClineProvider` and the CLI; ratchet the untyped count          |
| [Semble Binary — Download-Only Distribution](adr-semble-binary-download-only.md)                | ✅ ACCEPTED | 2026-07-31 | Make download the sole installation mechanism for the semble code-index binary; resolve the real executable in PyInstaller one-dir archives                                                                             |
| [Bulk Install Modes in Marketplace](adr-bulk-install-modes.md)                                  | ✅ ACCEPTED | 2026-07-27 | Multi-select mode installation with scope selection, progress tracking, and per-item results                                                                                                                            |
| [Remove Roo Code Cloud Integration](adr-cloud-removal.md)                                       | ✅ ACCEPTED | 2026-07-27 | Remove `packages/cloud/` entirely after the backend was permanently shut down (HTTP 410)                                                                                                                                |
| [Upgrade to Node.js v22 LTS](adr-nodejs-v22.md)                                                 | ✅ ACCEPTED | 2026-07-27 | Raise the minimum engine to `>=22.23.1` for V8 12.4+ gains and native features                                                                                                                                          |
| [Architecture Review: Semble Download 404](arch-review-semble-download-404.md)                  | —           | 2026-07-27 | Root-cause analysis of the semble binary HTTP 404; bundled-launcher option (Solution D) superseded by download-only                                                                                                     |

## Related Registers

- [Changelog](../../CHANGELOG.md) — release notes; synced copy at [`src/CHANGELOG.md`](../CHANGELOG.md)
- [Technical Debt Register](../../DEBT.md) — open debt and recently-resolved rows
- [Mode Description Pipeline](../../scripts/DESCRIPTIONS.md) — canonical-source decision + `ensure_descriptions.py` enforcement for mode descriptions
- [S1 Message Protocol Plan](../../plans/s1-message-protocol.md) — S1–S3 milestones referenced by the typed-message-protocol ADR

## Contributing an ADR

1. Copy the template from the repo protocol: `# ADR-NNNN: Title` → **Status**, **Context**, **Decision**, **Consequences**.
2. Place the file in `src/docs/` and add a row to the index above (keep the table sorted newest-first).
3. Link the ADR from the relevant `CHANGELOG.md` release entry so readers can trace decisions back to their rationale.
