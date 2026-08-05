# Semble Release Governance

**Status:** ✅ ACTIVE · **Owner:** Roo+ maintainers · **Applies to:** `Audare-est-Facere/sembleexec` (the fork's Semble installer repo) and this repository's [`semble-downloader.ts`](../src/services/code-index/semble/semble-downloader.ts:1)

**Origin:** remediation item 2c of the architecture review — [`docs/architecture-review-code-index-semble.md`](architecture-review-code-index-semble.md:121). Registered in the ADR index — [`src/docs/ADR-INDEX.md`](../src/docs/ADR-INDEX.md:7).

This document is the release policy for the Semble binary that powers the fork's local code-index (`codebaseIndexEmbedderProvider: "semble"`). It exists because the v0.5.2 era demonstrated that a **broken release is not self-healing**: the downloader's fast path trusts what is already on disk, so a tag that is "fixed in place" is invisible to machines that already cached the broken binary.

---

## 1. Immutable release tags (the single most important rule)

> **Never re-upload or delete assets under an existing release tag. A broken artifact must be superseded by a NEW tag (e.g. `v0.5.2` → `v0.5.3`), never "fixed in place".**

### Why

The downloader pins the release tag in [`SEMBLE_VERSION`](../src/services/code-index/semble/semble-downloader.ts:27) and the per-platform hashes in [`SEMBLE_SHA256`](../src/services/code-index/semble/semble-downloader.ts:87). On an already-provisioned machine the fast path ([`semble-downloader.ts`](../src/services/code-index/semble/semble-downloader.ts:594)) treats "`.semble-version` matches `SEMBLE_VERSION` **and** the binary file exists" as sufficient and returns the cached binary **without re-downloading**. Consequently:

- A machine that cached the broken artifact **keeps the broken artifact forever** after an in-place "fix" — the tag string did not change, so the cache key did not change.
- The fork's checksum contract silently breaks: [`SEMBLE_SHA256`](../src/services/code-index/semble/semble-downloader.ts:87) is regenerated to match the new bytes, but only fresh installs ever see the new bytes. Cached installs now hold a binary that **fails** the very checksum this repo promises.
- The runtime stub-detection in [`SembleCLI.checkInstalled()`](../src/services/code-index/semble/semble-cli.ts:128) (`--help` must advertise `search`) can _detect_ the stale stub, but detection is not recovery — the feature stays broken until a human clears the cache.

### The motivating incident (the silent-exit-0 stub era)

The earlier `v0.5.2` release shipped a **silent-exit-0 stub**: the binary exited `0` with no output, so the extension reported "ready" while every search returned nothing (documented in [`semble-smoke.mjs`](../scripts/semble-smoke.mjs:8)). The fix was applied to the _code_ (stub detection + hardened downloader), but a server that had already downloaded the stub kept reusing it because the fast path never re-verifies — the "fix" could not reach machines that trusted the old tag. The architecture review ([`architecture-review-code-index-semble.md`](architecture-review-code-index-semble.md:74), R1) confirms the field symptom was exactly this: **"works in Zoo-Code (fresh storage dir), broken in ours (stale cache)"**.

**Operational consequence:** a tag is a promise. Once `v0.5.2` is published, its assets are immutable facts. Any defect means shipping `v0.5.3` (or `v0.5.2-hotfix` — a _new_ tag either way) and bumping the pinned version, so cached installs are forced onto the new tag.

---

## 2. Release procedure (numbered checklist)

For every new Semble release (initial, patch, or "hotfix" of a broken tag):

1. **Publish immutable assets to `Audare-est-Facere/sembleexec` under a NEW tag** (e.g. `v0.5.3`). Publish the per-platform archives **and** the `checksums-sha256.txt` manifest. Never attach to, re-upload over, or delete from an existing tag (§1).
2. **Regenerate `SEMBLE_SHA256` from the published artifacts**: `shasum -a 256 <archive>` for each platform archive, and confirm the values match the published `checksums-sha256.txt`.
3. **Bump `SEMBLE_VERSION` and `SEMBLE_SHA256` in the SAME commit** in [`semble-downloader.ts`](../src/services/code-index/semble/semble-downloader.ts:27). Never bump one without the other — the coupling gate (§3) rejects a version change without a checksum change **and** a checksum change without a version change.
4. **Run the binary smoke test**: `node scripts/semble-smoke.mjs` — downloads the pinned release, verifies SHA-256, extracts, and proves `--help` advertises `search` **and** a real `semble search` returns results against [`test-fixtures/semble-repo`](../test-fixtures/semble-repo) ([`semble-smoke.mjs`](../scripts/semble-smoke.mjs:1)). This is what catches a silent-exit-0 stub before it ships.
5. **Run the release-readiness checksum gate**: `node scripts/verify-semble-checksums.mjs` (and `--strict` on a networked machine) — confirms the release tagged at `SEMBLE_VERSION` actually ships the `checksums-sha256.txt` manifest whose hashes match the hardcoded [`SEMBLE_SHA256`](../src/services/code-index/semble/semble-downloader.ts:87).
6. **Run the coupling gate**: `node scripts/verify-semble-release-coupling.mjs` — confirms the diff that bumped the constants changed `SEMBLE_VERSION` and `SEMBLE_SHA256` together (§3). On a fresh checkout with no base ref it SKIPs; enforce with `--base <merge-base>`.
7. **Optional — run the e2e Semble journey**: the extension-host suite [`apps/vscode-e2e/src/suite/tools/codebase-search-semble.test.ts`](../apps/vscode-e2e/src/suite/tools/codebase-search-semble.test.ts:1) with `SEMBLE_E2E_RUN=true SEMBLE_E2E_REQUIRED=true` covers enable "Semble - Local" → status `Indexed` → `codebase_search` returns snippets. It downloads ~150 MB and may embed a model on first search, so it is opt-in and belongs in a scheduled/manual or release-validation job, not every PR.

The three gates (steps 4–6) run **locally before merge** as a release checklist; steps 5–6 are additionally CI-enforced (§3).

---

## 3. Where the rules are enforced

| Rule                                                                        | Enforced in this repo's CI?                                                                                                                                                                                                                                                                                                                                           | Enforced where?                                  |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `SEMBLE_VERSION` ↔ `SEMBLE_SHA256` coupling (both directions)               | ✅ **Yes** — [`verify-semble-release-coupling.mjs`](../scripts/verify-semble-release-coupling.mjs:1) runs in `.github/workflows/code-qa.yml` ("Verify Semble version↔checksum coupling", [`code-qa.yml`](../.github/workflows/code-qa.yml:93)); diff-gated against the PR merge base, SKIP-safe when no base ref is resolvable, hard-fail on violation                | PR / push CI in this repo                        |
| Release tagged at `SEMBLE_VERSION` ships a matching `checksums-sha256.txt`  | ✅ **Yes** — [`verify-semble-checksums.mjs`](../scripts/verify-semble-checksums.mjs:1) runs in `.github/workflows/code-qa.yml` ("Verify Semble release checksums", [`code-qa.yml`](../.github/workflows/code-qa.yml:80)); network-failure SKIP-safe, checksum mismatch hard-fails                                                                                     | PR / push CI in this repo                        |
| Binary is functional (not a silent-exit-0 stub)                             | ⚠️ **Manual / scheduled** — [`semble-smoke.mjs`](../scripts/semble-smoke.mjs:1) is too heavy (downloads ~150 MB, may embed a model) to gate every PR; run it in step 4 of §2 and in release-validation jobs                                                                                                                                                           | Local release checklist / scheduled job          |
| e2e Semble journey                                                          | ⚠️ **Optional** — [`codebase-search-semble.test.ts`](../apps/vscode-e2e/src/suite/tools/codebase-search-semble.test.ts:31) is opt-in via `SEMBLE_E2E_RUN=true` / `SEMBLE_E2E_REQUIRED=true`; intended for scheduled/manual/release-validation jobs                                                                                                                    | `apps/vscode-e2e`                                |
| **Immutable release tags** (never re-upload / delete under an existing tag) | ❌ **Not CI-enforceable in this repo** — GitHub does not expose tag-asset mutation history to a fork's CI. This is a **manual policy on the installer repo** (`Audare-est-Facere/sembleexec`), enforced by maintainer discipline and the coupling gate's indirect guard (a checksum change without a version bump — the signature of an in-place "fix" — is rejected) | Manual process on `Audare-est-Facere/sembleexec` |

**In short:** this repo CI-enforces the _consequences_ of the policy (version↔checksum coupling, manifest↔pinned-hash alignment, and — via the smoke test — binary functionality). The _cause_ — publishing discipline on the installer repo — is a manual rule that §1 exists to make unambiguous.

---

## 4. Related ADRs and documents

- [`src/docs/adr-semble-binary-download-only.md`](../src/docs/adr-semble-binary-download-only.md:1) — ADR: the Semble binary is **download-only** (checksum-verified download is the sole acquisition mechanism); the policy above governs how that download is released.
- [`docs/architecture-review-code-index-semble.md`](architecture-review-code-index-semble.md:121) — review item 2c: "Formalize a release procedure so version + checksums always move together" (source of this document).
- [`scripts/verify-semble-release-coupling.mjs`](../scripts/verify-semble-release-coupling.mjs:1) / [`scripts/verify-semble-checksums.mjs`](../scripts/verify-semble-checksums.mjs:1) / [`scripts/semble-smoke.mjs`](../scripts/semble-smoke.mjs:1) — the enforcing scripts.
- Registered in the ADR index at [`src/docs/ADR-INDEX.md`](../src/docs/ADR-INDEX.md:7).
