# Architecture Review: Semble Download 404 (Code Index #42)

## Executive Summary

| Metric             | Value                                                             |
| ------------------ | ----------------------------------------------------------------- |
| **Review Date**    | 2026-07-27                                                        |
| **Bug**            | Semble binary download fails with HTTP 404                        |
| **Impact**         | All users on all platforms cannot use "Semble - Local" code index |
| **Root Cause**     | Repository `Roo-Plus-Org/sembleexec` does not exist (HTTP 404)    |
| **Severity**       | Critical — entire feature is gated on this download               |
| **Fix Complexity** | Medium (configurable target)                                      |

---

## 1. Current Architecture & Download Flow

```
User clicks "Semble - Local" in settings
  → CodeIndexManager._recreateServices()
    → new SembleProvider(workspacePath, context, stateManager)
      → SembleProvider.initialize()
        → downloadSemble(storageDir)
          → GET https://github.com/Roo-Plus-Org/sembleexec/releases/download/v0.4.1/semble-{platform}-{arch}-fast.tar.gz
          → HTTP 404 ← REPOSITORY DOES NOT EXIST
            → Error: "Failed to download semble: HTTP 404: ..."
              → SembleProvider state = "Error"
                → User sees error in UI
```

### Key Files

| File                                                                                                             | Role                                                                  |
| ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| [`src/services/code-index/semble/semble-downloader.ts`](src/services/code-index/semble/semble-downloader.ts:28)  | Contains `DOWNLOAD_BASE_URL` pointing to `Roo-Plus-Org/sembleexec`    |
| [`src/services/code-index/semble/semble-downloader.ts`](src/services/code-index/semble/semble-downloader.ts:161) | `downloadSemble()` — downloads, verifies checksum, extracts binary    |
| [`src/services/code-index/semble/provider.ts`](src/services/code-index/semble/provider.ts:80)                    | `SembleProvider._doInitialize()` — orchestrates download + validation |
| [`src/services/code-index/manager.ts`](src/services/code-index/manager.ts:405)                                   | Branch: creates `SembleProvider` when provider is `"semble"`          |
| [`webview-ui/src/components/chat/CodeIndexPopover.tsx`](webview-ui/src/components/chat/CodeIndexPopover.tsx:179) | UI schema — `"semble"` requires no API keys                           |

---

## 2. Root Cause Analysis

### 2.1 Direct Cause

The repository [`https://github.com/Roo-Plus-Org/sembleexec`](https://github.com/Roo-Plus-Org/sembleexec) **returns HTTP 404**. Verified via:

```bash
curl -s -o /dev/null -w "%{http_code}" \
  "https://github.com/Roo-Plus-Org/sembleexec"  # → 404
curl -s "https://api.github.com/repos/Roo-Plus-Org/sembleexec" \
  # → {"message": "Not Found", "status": "404"}
```

The configured release asset:

```
https://github.com/Roo-Plus-Org/sembleexec/releases/download/v0.4.1/semble-linux-x64-fast.tar.gz
```

...resolves to a non-existent repository. The binary cannot be downloaded from _any_ path under this org/repo name.

### 2.2 Underlying Architectural Issues

| Issue                                | Detail                                                                                                                               | Location                                                                              |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| **Hardcoded single source**          | `DOWNLOAD_BASE_URL` is hardcoded to one GitHub repository with **no fallback**                                                       | [`semble-downloader.ts:28`](src/services/code-index/semble/semble-downloader.ts:28)   |
| **No user-configurable binary path** | Users cannot point to a manually downloaded binary. The download is fully automated with zero user configuration for the binary path | [`semble-downloader.ts:161`](src/services/code-index/semble/semble-downloader.ts:161) |
| **No mirror/fallback sources**       | If the primary URL fails, there are no alternative download locations attempted                                                      | [`semble-downloader.ts:194`](src/services/code-index/semble/semble-downloader.ts:194) |
| **No retry mechanism**               | Download is one-shot — no exponential backoff or retry logic on transient failures                                                   | [`semble-downloader.ts:422`](src/services/code-index/semble/semble-downloader.ts:422) |
| **2-minute timeout only**            | The single timeout is 120s. No network error classification or connectivity diagnosis                                                | [`semble-downloader.ts:480`](src/services/code-index/semble/semble-downloader.ts:480) |
| **No graceful degradation**          | When download fails, user gets an error with no alternative setup path offered                                                       | [`provider.ts:101`](src/services/code-index/semble/provider.ts:101)                   |

---

## 3. SOTA 2026 Forensic Code Analysis

Applying the 12-point protocol to the download flow:

| #   | Check                  | Status  | Finding                                                                                                                                             |
| --- | ---------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Ghost Check**        | ✅ PASS | `downloadSemble()` is called from `SembleProvider._doInitialize()` — no orphan function                                                             |
| 2   | **Lifecycle Trace**    | ✅ PASS | Staging directory cleaned up on success and failure; archive cleaned up                                                                             |
| 3   | **State Drift**        | ❌ FAIL | After failed download, `_state = "Error"` but `_initPromise` is reset. A subsequent `startIndexing()` on error state returns silently without retry |
| 4   | **Race Window**        | ✅ PASS | `_initPromise` guard prevents concurrent initialization                                                                                             |
| 5   | **Type Lie**           | ✅ PASS | Return types match actual behavior                                                                                                                  |
| 6   | **Circuit Death**      | ✅ PASS | Rejected paths correctly clean up staging dirs and archive                                                                                          |
| 7   | **Memory Bombshell**   | ✅ PASS | Archives streamed to disk via `createWriteStream`, not held in memory                                                                               |
| 8   | **Protocol Treachery** | ✅ PASS | Response shape is validated (status code checks)                                                                                                    |
| 9   | **Input Gap**          | ⚠️ WARN | Validates redirect domains but does **not** validate that the host repository exists before attempting the download                                 |
| 10  | **Async Trap**         | ✅ PASS | All promises awaited properly                                                                                                                       |
| 11  | **Error Forgery**      | ⚠️ WARN | The raw `error?.message` is forwarded to the UI via i18n. This exposes `"HTTP 404: Failed to download ..."` — leaks internal URL structure to users |
| 12  | **Mutation Crime**     | ✅ PASS | Input parameters are not mutated                                                                                                                    |

---

## 4. Security Architecture Assessment

| Check                        | Status  | Notes                                                                                                                                   |
| ---------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Trusted download domains** | ✅ PASS | `TRUSTED_DOWNLOAD_DOMAINS` restricts redirects to `github.com`, `objects.githubusercontent.com`, `release-assets.githubusercontent.com` |
| **Checksum verification**    | ✅ PASS | SHA-256 verified post-download against hardcoded `SEMBLE_SHA256`                                                                        |
| **No shell injection**       | ✅ PASS | `spawn` with array arguments, `shell: false`                                                                                            |
| **Path traversal guard**     | ✅ PASS | tar extraction uses `--no-overwrite-dir` on Linux; archive paths scoped to staging dir                                                  |
| **Atomic swap**              | ✅ PASS | Staging directory used before renaming over existing installation                                                                       |
| **Staging cleanup**          | ✅ PASS | Leftover staging directories from failed attempts are cleaned up                                                                        |

---

## 5. Recommended Solutions

### Solution A (Immediate Fix): Create/Publish `sembleexec` Repository

If the `sembleexec` binary exists and needs a distribution home:

1. Create the `Roo-Plus-Org/sembleexec` repository on GitHub
2. Publish release `v0.4.1` with all four platform assets:
    - `semble-linux-x64-fast.tar.gz`
    - `semble-linux-arm64-fast.tar.gz`
    - `semble-macos-arm64-fast.tar.gz`
    - `semble-windows-x64-fast.zip`
3. Update `SEMBLE_SHA256` checksums in [`semble-downloader.ts:38`](src/services/code-index/semble/semble-downloader.ts:38) to match the published binaries

**Effort**: 1-2 hours (creating repo + uploading release assets)

### Solution B (Recommended): Add User-Configurable Binary Path

Add a setting for an alternative semble binary path. This provides a fallback if:

- The auto-download fails
- Users want to use a custom build of semble
- The GitHub repository is unavailable

**Changes required:**

1. **Types layer** ([`types.ts`](src/services/code-index/semble/types.ts)): Add `SembleConfig.binaryPath?: string`

2. **Downloader** ([`semble-downloader.ts`](src/services/code-index/semble/semble-downloader.ts)):
    - Add `getSembleBinaryPath()` (already exists at line 296) to check for user-configured path
    - Modify `downloadSemble()` to accept optional `binaryPath` override, skipping download if provided

3. **Provider** ([`provider.ts`](src/services/code-index/semble/provider.ts)):
    - Accept optional binary path from config
    - If binary path provided, skip download and validate directly

4. **UI** ([`CodeIndexPopover.tsx`](webview-ui/src/components/chat/CodeIndexPopover.tsx)):
    - Add optional text input for manual semble binary path (shown only for `"semble"` provider)
    - Show helper text with download instructions

5. **Config Manager** ([`config-manager.ts`](src/services/code-index/config-manager.ts)):
    - Persist the user-configured binary path

### Solution C (Medium-term): Multi-Source Fallback

Implement a fallback chain:

1. Try configured binary path (if provided) → validate directly
2. Try primary GitHub release (`Roo-Plus-Org/sembleexec`)
3. Try alternative/mirror source (configurable URL pattern)
4. If all fail: show UI with manual download instructions and path configuration

**Effort**: 3-5 days (moderate refactor)

### Solution D (Long-term): Offline Installation Support

Beyond Solution B, add:

- Version-agnostic download URL pattern (major.minor wildcards)
- Publish verification manifest (checksums + signatures) as a separate release asset
- Bundle the semble binary as a VS Code extension dependency (if licensing permits)

> **Superseded (2026-07-31)**: Bundling the semble runtime into the VSIX was evaluated
> and **rejected** — the PyInstaller one-dir runtime is ~140 MB per platform (130 MB
> `_internal/` + 9.2 MB launcher), so a platform-universal VSIX would balloon to ~552 MB,
> and a launcher-only bundle (without `_internal/`) is non-functional. The bundled-binary
> mechanism was removed; the checksum-verified download path is now the sole installation
> mechanism. Offline/air-gapped users set `codebaseIndexSembleBinaryPath` to point at a
> manually-installed binary.

---

## 6. Implementation Priority

| Priority | Solution                         | Effort   | User Impact                               |
| -------- | -------------------------------- | -------- | ----------------------------------------- |
| 🔴 P0    | **A — Publish sembleexec repo**  | 1-2 hrs  | Unblocks all users immediately            |
| 🟡 P1    | **B — Configurable binary path** | 1-2 days | Prevents future occurrences               |
| 🟢 P2    | **C — Multi-source fallback**    | 3-5 days | Defensive hardening                       |
| ⛔ P3    | **D — Offline/bundled support**  | Rejected | Not practical (~140 MB/platform) — see §5 |

---

## 7. Architectural Decision Record

### Decision: Hardcoded single GitHub source for binary distribution

**Status**: ❌ REJECTED (needs revision)

**Context**: The semble binary is downloaded from a hardcoded GitHub release URL with no fallback, no user configuration, and no retry mechanism.

**Consequences**:

- When the repository is missing (current state), the entire feature is broken for all users
- No workaround exists for users in restricted network environments
- Version upgrades require a source code change (`SEMBLE_VERSION` constant) and a new GitHub release

**Recommendation**: Evolve toward Solution B as the minimum viable architecture, and Solution C as the longer-term target, to decouple the extension from the availability of a single GitHub repository.

---

## 8. Summary of Findings

The `sembleexec` repository at `Roo-Plus-Org/sembleexec` does not exist on GitHub, causing an unrecoverable 404 on every semble binary download attempt. While the download code itself is well-structured (checksum verification, atomic swap, redirect validation, path traversal protection), the lack of a fallback mechanism or user-configurable binary path makes the entire "Semble - Local" feature unusable for all users on all platforms.

**Immediate action required**: Publish the `sembleexec` repository with the required release assets, or switch the download URL to point to an existing repository containing the semble binary.
