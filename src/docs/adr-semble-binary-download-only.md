# ADR: Semble Binary — Download-Only Distribution

**Date**: 2026-07-31

**Status**: ✅ ACCEPTED

## Context

The semble code-index binary reached users through two mechanisms: a bundled launcher shipped inside the VSIX, and a checksum-verified download from the GitHub release. Both had structural problems:

- **Bundled launcher was non-functional.** The 9.2 MB `bin/semble` launcher bundled into the VSIX ships _without_ its ~130 MB PyInstaller `_internal/` runtime directory. Spawning the launcher without that runtime fails, so the bundled copy could never run.
- **Bundling the full runtime is impractical for a universal VSIX.** The complete PyInstaller one-dir runtime is ~140 MB per platform (130 MB `_internal/` + 9.2 MB launcher). A platform-universal VSIX covering linux-x64, linux-arm64, macos-x64, and windows-x64 would balloon to ~552 MB.
- **Download path mis-resolved one-dir archives.** The v0.5.2 release archives are PyInstaller **one-dir** builds wrapped in a `semble/` directory (i.e. the archive extracts to `…/semble/semble/semble`). The downloader treated the wrapper _directory_ as the binary, and spawning a directory yields `EACCES` — the persistent `spawn …/semble/semble EACCES` failure. Existing installs were also left in this broken state and never self-repaired.

## Decision

Make **download the sole installation mechanism** for the semble binary, and fix the downloader to resolve the real executable in both archive layouts:

- **Remove the bundled launcher.** Delete `bin/semble`, the `.vscodeignore` include, the `extensionPath` bundled-copy path in `downloadSemble`, and `scripts/bundle-semble.sh` (plus its `vsix` invocation). Semble is now **download-only**.
- **Resolve the real executable.** New `resolveSembleBinary()`/`findFileNamed()` in [`src/services/code-index/semble/semble-downloader.ts`](../../src/services/code-index/semble/semble-downloader.ts) handle flat archives (`<base>/semble`) **and** PyInstaller one-dir archives (`<base>/semble/semble`). `getSembleBinaryPath()` is file-only — a directory is not runnable, so resolution returns the regular file, not the wrapper directory. Existing broken one-dir installs self-heal on the next resolution.
- **Offline/air-gapped users** supply a manually-installed binary via the existing `codebaseIndexSembleBinaryPath` setting; no download is attempted when it is set.

## Consequences

### Positive

- The VSIX stays small — no ~9.2 MB non-functional launcher, and no multi-platform runtime payload (~552 MB avoided).
- The `spawn …/semble/semble EACCES` failure is fixed: both fresh downloads and existing one-dir installs resolve the actual executable file.
- A single, checksum-verified download path is the only acquisition mechanism — no divergence between bundled and downloaded binaries.

### Negative

- First use of the semble code index requires network access to download the binary.
- Offline users must manually install the binary and configure `codebaseIndexSembleBinaryPath`.

### Neutral

- No change to code-index behavior, provider validation, or the `codebaseIndexSembleBinaryPath` setting semantics.
- The downloader's checksum verification, trusted-domain redirect checks, and atomic staging remain unchanged.

## See Also

- [`arch-review-semble-download-404.md`](arch-review-semble-download-404.md) — the bundling option (Solution D) was superseded and rejected on 2026-07-31 for the same size/runtime reasons
- [`DEBT.md`](../../DEBT.md) — resolved-debt rows for the Semble EACCES one-dir layout and bundled-launcher removal
