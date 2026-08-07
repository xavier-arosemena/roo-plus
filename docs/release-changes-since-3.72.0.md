# Release Changes Report — Since v3.72.0

**Prepared:** 2026-08-07 · **Scope:** `v3.72.0` (2026-07-20) → `HEAD` (`3.77.4`, unreleased tag `v3.77.2`)
**Source:** [`CHANGELOG.md`](../CHANGELOG.md) sections 3.72.1 → 3.77.2, plus 2 unreleased commits after `v3.77.2`.

> Purpose: inform the curation of the in-extension release announcement (`chat.json` `announcement.release.highlight1/2/3`).

---

## Releases in this window

| Version      | Date       | Theme                                                                                 |
| ------------ | ---------- | ------------------------------------------------------------------------------------- |
| 3.72.1       | 2026-07-27 | Semble binary download fix, configurable path, multi-source fallback                  |
| 3.73.0       | 2026-07-27 | Mode subtitles (descriptions) completed                                               |
| 3.74.0       | 2026-07-27 | **Cloud service removal** (Roo Code Cloud shut down — HTTP 410)                       |
| 3.75.0       | 2026-07-28 | Bulk install modes in the Marketplace                                                 |
| 3.75.1       | 2026-07-29 | Zoo Gateway removal & full CI pipeline cleanup                                        |
| 3.76.0       | 2026-08-03 | Release Readiness & Architecture Program (typed message protocol, slim ClineProvider) |
| 3.77.0       | 2026-08-04 | Code Index reliability & context-window accuracy                                      |
| 3.77.1       | 2026-08-05 | Mode description completeness & code-index release governance                         |
| 3.77.2       | 2026-08-06 | Custom Modes canonical catalog pipeline & remote-webview messaging                    |
| (unreleased) | —          | Marketplace bounded fetch retry + typed schemas; webview origin-only trust            |

---

## Prioritized change list

Ranked by user impact (1 = highest impact for daily users).

### 1. Cloud services removed + startup/remote-connection stability fixed (3.74.0, 3.75.1)

The upstream Roo Code Cloud backend was permanently shut down (HTTP 410). All cloud-dependent features (sign-in, settings sync, task sharing, telemetry, retry queue) were eliminated. Extension activation no longer blocks on cloud-service init — **no more HTTP calls to `app.roocode.com` on startup**, eliminating the exponential-backoff loop that could **stall extension loading**. The Zoo Gateway provider was fully removed too. Smaller footprint (~400 lines + up-to-1MB+ retry queue removed).

- _This is the user-proposed bullet: "cloud services removed, and stability issues fixed."_

### 2. Semble / code-index reliability overhaul (3.72.1, 3.77.0, 3.77.1)

- Semble binary download fixed (404 → migrated repo), **now pre-bundled / checksum-verified** with multi-source fallback + trusted-domain redirects.
- Broken-cached-binary trust removed; sticky `Error` state removed; empty-result filtering fixed; version pinned deterministically.
- Context-window bar no longer fabricates a fake "1-token" window (the broken "4050600%" display) — now accurate or hidden.
- Stalled/failing searches now surface actionable errors instead of "no relevant snippets".
- Concurrency fixes: no more double-init, subdirectory/multi-root instance mismatch fixed.
- **These are the "Semble" and "more reliable workflows" themes of the current announcement.**

### 3. Custom modes: descriptions + bulk install + canonical catalog (3.73.0, 3.75.0, 3.77.1, 3.77.2)

- Every mode now has a description/subtitle (no more blank descriptions — enforced at every layer).
- **Bulk install**: select multiple marketplace modes with checkboxes → install all at once with progress (3.75.0).
- Single canonical `custom_modes.d/` catalog (290 modes), hermetic builds via pinned submodule, 89 curated preloaded modes.
- **These are the "Custom modes" theme of the current announcement.**

### 4. Security hardening (3.76.0)

- Typed + runtime-validated webview message protocol (16 security-sensitive message types validated at the boundary).
- Webview HTML sanitization (DOMPurify) on all `dangerouslySetInnerHTML` sites.
- HMR CSP hardening; CodeQL alert remediation (~100 alerts fixed).

### 5. Marketplace reliability (3.77.2, unreleased)

- Remote/server webview messages (VSCodium server, Remote SSH over the web) no longer silently dropped.
- Bounded fetch retry + typed marketplace message schemas.

### 6. Architecture & maintainability (3.76.0)

- `ClineProvider` slimmed ~3,800 → ~2,500 lines; 15 domain-split webview handlers; task-history/profile/marketplace services extracted.

### 7. Dependency audit (3.77.0)

- `pnpm audit` clean (0 known vulnerabilities) after overriding `undici`, `fast-uri`, `ip-address`, etc.

---

## Proposed Top 3 for the announcement

| #   | Bullet (EN draft)                                                                                                                                                                 | Maps to            |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| 1   | **Cloud services removed, and stability fixed.** Extension no longer waits on the retired Roo Code Cloud backend — faster, more reliable startup and remote connections.          | #1 (user proposal) |
| 2   | **Semble & code-index made reliable.** Codebase search is pre-bundled, checksum-verified, and resilient — no more stalled searches, and the context-window bar is accurate again. | #2                 |
| 3   | **Custom modes got a major upgrade.** Every mode now shows a description, and you can install multiple marketplace modes in bulk.                                                 | #3                 |

**Awaiting user selection:** confirm which 3 bullets should ship (the current 3 highlight slots), and whether to reword any.

---

## Files affected by an announcement update

1. **EN content:** `webview-ui/src/i18n/locales/en/chat.json` (`announcement.*`)
2. **Social links:** `webview-ui/src/components/chat/Announcement.tsx` (+ `webview-ui/src/constants/externalLinks.ts`)
3. **Trigger:** `src/core/webview/ClineProvider.ts` — `latestAnnouncementId`
4. **17 locales:** `webview-ui/src/i18n/locales/*/chat.json` (currently STALE — old v3.72.0 content)
5. **Dead keys:** `announcement.cloudAgents.*` in all 18 locales (cloud removed) — remove
