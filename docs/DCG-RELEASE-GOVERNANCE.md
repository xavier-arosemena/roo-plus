# DCG (Destructive Command Guard) — Release & Provenance Notes

**Status:** ✅ ACTIVE · **Owner:** Roo+ maintainers + Security · **Applies to:** the DCG native CLI that Roo+ installs at first use of an execution tool (consent-gated)

Short, proportionate provenance record for the second externally-authored binary Roo+ acquires at runtime (Marketplace notice #305, D3/3A / WS-C3). Full consent-gate mechanics are shared with Semble — see [`SEMBLE-RELEASE-GOVERNANCE.md`](SEMBLE-RELEASE-GOVERNANCE.md) §4 and the shared gate in [`src/services/binary-acquisition/index.ts`](../src/services/binary-acquisition/index.ts:184).

---

## 1. Authorship reality — DCG is NOT Roo+ code

- **Upstream project:** [`Dicklesworthstone/destructive_command_guard`](https://github.com/Dicklesworthstone/destructive_command_guard) — a high-performance hook for AI coding agents that blocks destructive commands before they execute.
- **Author / maintainer:** Jeffrey Emanuel (GitHub: `Dicklesworthstone`).
- **License:** **"MIT License (with OpenAI/Anthropic Rider)"** — a custom MIT with an additional rider clause, Copyright (c) 2026 Jeffrey Emanuel (see the upstream [`LICENSE`](https://github.com/Dicklesworthstone/destructive_command_guard/blob/main/LICENSE)).

Roo+ **packages and pins upstream release binaries**; it does not author DCG. DCG is **not bundled** into the Roo+ VSIX and is **not part of Roo+'s published source** — it is downloaded at first use after an explicit consent prompt and executed as a guard. Auto-install entry point: [`ExecuteCommandTool.ts`](../src/core/tools/ExecuteCommandTool.ts) (DCG ensure-installed path, consent-gated by ST-2/WS-B3).

---

## 2. Pinned version & checksums

Single source of truth: [`src/services/destructive-command-guard/constants.ts`](../src/services/destructive-command-guard/constants.ts:1)

- `DCG_VERSION = "v0.7.7"` (line 1)
- Download base: `https://github.com/Dicklesworthstone/destructive_command_guard/releases/download/${DCG_VERSION}` (line 37)
- Trusted download domains: `github.com`, `objects.githubusercontent.com`, `release-assets.githubusercontent.com` (lines 42–46)

Per-platform archives + pinned SHA-256 from `DCG_ARCHIVES` (lines 9–35):

| Platform / arch | Archive asset                          | SHA-256                                                            |
| --------------- | -------------------------------------- | ------------------------------------------------------------------ |
| `darwin-x64`    | `dcg-x86_64-apple-darwin.tar.xz`       | `15b42fbbbeab47123899e6328d90cd593e14999f3d275f71294815ad8ed9479c` |
| `darwin-arm64`  | `dcg-aarch64-apple-darwin.tar.xz`      | `a63cf82bd3584055112d5ec7a4ab3d7e0619a9f806a53930c27aa0e6297484de` |
| `linux-arm64`   | `dcg-aarch64-unknown-linux-gnu.tar.xz` | `abb0d94f23ab50f9edc16f8ca6939ff8eec23e1831d3ad7a28d9f03252c3306d` |
| `linux-x64`     | `dcg-x86_64-unknown-linux-musl.tar.xz` | `472b130a9b235edc57e6cb7566641da5fef905e9dbefd3a46f9ad1e33205fa04` |
| `win32-x64`     | `dcg-x86_64-pc-windows-msvc.zip`       | `435127410eabc53e772be4f5c668a875b45fbaf806654b577c2d975bd0e38964` |

## 3. Version ↔ checksum coupling

Same rule as Semble: `DCG_VERSION` and the `sha256` entries in `DCG_ARCHIVES` must move together. Upstream publishes **immutable release tags**; never re-point a tag. Bump procedure:

1. Publish a new immutable upstream tag (or adopt an existing one), and pull the platform archive hashes.
2. In **one commit** update `DCG_VERSION` **and** every `sha256` in `DCG_ARCHIVES` in [`constants.ts`](../src/services/destructive-command-guard/constants.ts:1) (keep `DCG_DOWNLOAD_BASE_URL`, which derives from the version, consistent).
3. Re-verify against the upstream `checksums`/release manifest and run the DCG runner/manager tests.
4. **Consent metadata** in [`src/services/binary-acquisition/dcg.ts`](../src/services/binary-acquisition/dcg.ts:41) (`buildDcgAcquisitionInfo()`) reads `DCG_VERSION`/`DCG_ARCHIVES` from `constants.ts` (single source of truth) — the dialog shows the new version/SHA automatically. Verify the localized purpose string and `DCG_APPROX_SIZE` (`~5 MB`) are still accurate.
5. Consent is version-scoped (`destructive-command-guard@v0.7.7`) — a bump clears prior "Always allow" and re-prompts, which is expected.

## 4. Related governance

- Shared consent/workspace-trust gate: [`src/services/binary-acquisition/index.ts`](../src/services/binary-acquisition/index.ts:1)
- Semble (the other acquired binary): [`SEMBLE-RELEASE-GOVERNANCE.md`](SEMBLE-RELEASE-GOVERNANCE.md)
- Reproducing the Roo+ VSIX & security posture: [`SECURITY.md`](../SECURITY.md)
- Marketplace notice tracking: [`docs/marketplace-305-remediation-plan.md`](marketplace-305-remediation-plan.md)
