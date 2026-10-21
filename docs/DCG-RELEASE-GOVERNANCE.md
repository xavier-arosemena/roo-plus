# DCG (Destructive Command Guard) — Release & Provenance Notes

**Status:** ✅ ACTIVE · **Owner:** Roo+ maintainers + Security · **Applies to:** the DCG native CLI that Roo+ **bundles inside the VSIX** and provisions locally at first use (consent-gated)

Short, proportionate provenance record for the externally-authored binary Roo+ distributes (Marketplace notice #305, D3/3A / WS-C3). Full consent-gate mechanics are shared with Semble — see [`SEMBLE-RELEASE-GOVERNANCE.md`](SEMBLE-RELEASE-GOVERNANCE.md) §4 and the shared gate in [`src/services/binary-acquisition/index.ts`](../src/services/binary-acquisition/index.ts:184). The acquisition strategy itself is recorded in [ADR: Binary Acquisition Strategy](adr/adr-binary-acquisition-strategy.md) (DCG **3a** — bundled, disclosed, never downloaded).

---

## 1. Authorship reality — DCG is NOT Roo+ code

- **Upstream project:** [`Dicklesworthstone/destructive_command_guard`](https://github.com/Dicklesworthstone/destructive_command_guard) — a high-performance hook for AI coding agents that blocks destructive commands before they execute.
- **Author / maintainer:** Jeffrey Emanuel (GitHub: `Dicklesworthstone`).
- **License:** **"MIT License (with OpenAI/Anthropic Rider)"** — a custom MIT with an additional rider clause, Copyright (c) 2026 Jeffrey Emanuel.
- **Rider obligations:** the rider is part of the licence's _conditions_. It withholds all rights from the named Restricted Parties and requires that _"any distribution of the Software or any Derivative Works must include this rider provision unmodified."_

Because Roo+ now **distributes** the bytes (§2), that obligation is live. The rider is reproduced **verbatim** in [`THIRD-PARTY-NOTICES.md`](../THIRD-PARTY-NOTICES.md) §1.1.1, which ships inside the VSIX. Roo+ does not modify, mirror, re-tag or rebuild DCG: the bundled files are the unmodified upstream release assets.

Auto-install entry point: [`ExecuteCommandTool.ts`](../src/core/tools/ExecuteCommandTool.ts) and the settings handler ([`settings.ts`](../src/core/webview/handlers/settings.ts)) — both consent-gated by ST-2/WS-B3.

---

## 2. Distribution model — bundled, never downloaded

> **2026-10-21 (decision DCG 3a).** DCG used to be acquired at first use from GitHub release assets. It is now **distributed inside the VSIX**. There is **no runtime download path**: `grep -rn "download" src/services/destructive-command-guard/manager.ts` returns nothing but comments, and the runtime-acquisition test asserts `https.get` is never called.

| Item                                    | Value                                                                                                                                             |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bundle location (expressed in the VSIX) | `bin/dcg/` — see `DCG_BUNDLE_DIR` in [`constants.ts`](../src/services/destructive-command-guard/constants.ts:1)                                   |
| Bundle location (on disk)               | [`src/bin/dcg/`](../src/bin/dcg) — included by `!bin/dcg/**` in [`src/.vscodeignore`](../src/.vscodeignore:1)                                     |
| Contents                                | The five unmodified upstream release archives for `v0.7.7` (tar.xz for macOS/Linux, zip for Windows)                                              |
| Total size impact                       | 23,602,546 bytes (≈22.5 MB) of already-compressed archives → the VSIX grows from ≈17.5 MB to ≈40 MB                                               |
| Packaged file count impact              | +5 files (1,280 → 1,285, against the 1,300 budget in [`scripts/verify-vsix-budget.mjs`](../scripts/verify-vsix-budget.mjs:1))                     |
| Install mechanism                       | Copies the bundled archive into the extension's global storage, verifies it, extracts it, verifies the executable, then writes `.dcg-version`     |
| Network access                          | **None.** No download, no fallback fetch, no mirror                                                                                               |
| Runtime opt-in                          | `roo-plus.destructiveCommandGuardEnabled` (default **false**); enabling prompts for explicit, version-scoped approval before anything is executed |

### 2.1 Platform matrix

| Platform / arch | Bundled archive                        | Archive SHA-256 (upstream)                                         | Binary SHA-256 (pinned by Roo+)                                    |
| --------------- | -------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `darwin-x64`    | `dcg-x86_64-apple-darwin.tar.xz`       | `15b42fbbbeab47123899e6328d90cd593e14999f3d275f71294815ad8ed9479c` | `8f2a53fb20ea3e91b7e91bdb64f12c800b8c3b789a784a5871f26475ac0981d2` |
| `darwin-arm64`  | `dcg-aarch64-apple-darwin.tar.xz`      | `a63cf82bd3584055112d5ec7a4ab3d7e0619a9f806a53930c27aa0e6297484de` | `48616e766d6579eaa7cbb9dac949c1d36455f1374f91872d6ed5591976ecd282` |
| `linux-arm64`   | `dcg-aarch64-unknown-linux-gnu.tar.xz` | `abb0d94f23ab50f9edc16f8ca6939ff8eec23e1831d3ad7a28d9f03252c3306d` | `8927f75a3b337c1a2f5d87585f4c9abc0a3e17a214a72ccb5c46cee5db8163bc` |
| `linux-x64`     | `dcg-x86_64-unknown-linux-musl.tar.xz` | `472b130a9b235edc57e6cb7566641da5fef905e9dbefd3a46f9ad1e33205fa04` | `131acedaa3e3576fe2c3e253a5f4209e5ba4b75bbff7faf1ee3e18cb88e95a66` |
| `win32-x64`     | `dcg-x86_64-pc-windows-msvc.zip`       | `435127410eabc53e772be4f5c668a875b45fbaf806654b577c2d975bd0e38964` | `93d3da674c1ab398fec425532f72b2d3d55ab72340bd91ccd90cf8acd5f21912` |

Any other platform reports DCG as unavailable and the guard stays off; no download is attempted.

### 2.2 Why bundled instead of downloaded

- **Agreement §8(d)** requires that an offering must not "install or launch executable code … beyond what is identified in or may reasonably be expected from the Listing Information", and **Terms of Use §4(v)** requires unexpected behaviour to be documented up front. A binary that arrives with the package is _identified_ by the package; a binary fetched later is not, unless the listing says so.
- The rider's distribution condition is met head-on (rider shipped verbatim) rather than argued around.
- Air-gapped and firewalled users get the guard; there is no first-use failure mode.
- Cost: ≈22.5 MB for every user, to serve five platforms. That was accepted deliberately; if the VSIX footprint ever becomes the binding constraint, the documented fallback is per-platform VSIX builds (`vsce --target`), not a silent return to downloading.

---

## 3. Integrity — what is verified, and when

Two independent hashes are checked, both pinned in [`constants.ts`](../src/services/destructive-command-guard/constants.ts:1):

1. **Archive hash** (`sha256`) — the bundled file must equal the upstream release asset. This is the same value the upstream release publishes, so a swapped VSIX is detectable against an external reference.
2. **Binary hash** (`binarySha256`) — the _extracted executable_ must match its pinned value. This catches tampering that survives the archive check (a re-packed archive) and pins extraction itself.

A mismatch fails closed: nothing is written to the install root, the staged directory is removed, and the guard does not run. **Execution** additionally requires workspace trust plus explicit user approval of `destructive-command-guard@<version>` (the same version-scoped consent as before; a version bump re-prompts).

Integrity of the notices file itself is gated in CI: [`scripts/verify-third-party-notices.mjs`](../scripts/verify-third-party-notices.mjs:1) re-hashes every bundled archive against `constants.ts` and fails if a notices row or a component section is missing.

---

## 4. Version ↔ checksum coupling

Same rule as Semble: `DCG_VERSION`, the archive hashes and the binary hashes must move together. Upstream publishes **immutable release tags**; never re-point a tag. Bump procedure:

1. Publish (or adopt) a new immutable upstream tag and download all five platform archives.
2. Compute both the archive SHA-256 (compare against the upstream release manifest) and the SHA-256 of the **extracted** executable per platform.
3. In **one commit** update, in [`constants.ts`](../src/services/destructive-command-guard/constants.ts:1): `DCG_VERSION`, every `sha256`, and every `binarySha256`.
4. Replace the five files in [`src/bin/dcg/`](../src/bin/dcg) with the new archives (same file names), then re-run `node scripts/verify-third-party-notices.mjs` — it fails until the archives match the pins.
5. Update [`THIRD-PARTY-NOTICES.md`](../THIRD-PARTY-NOTICES.md) §1.1 (version, per-platform table) and copy it to `src/THIRD-PARTY-NOTICES.md`.
6. Re-run the DCG suites: `cd src && npx vitest run services/destructive-command-guard services/managed-binary services/binary-acquisition`.
7. **Consent metadata** in [`src/services/binary-acquisition/dcg.ts`](../src/services/binary-acquisition/dcg.ts) reads `DCG_VERSION`/`DCG_ARCHIVES` from `constants.ts` (single source of truth) — the dialog shows the new version/SHA automatically. Verify the localized purpose string is still accurate and that `DCG_APPROX_SIZE` still describes the bundled archive.
8. Consent is version-scoped (`destructive-command-guard@v0.7.7`) — a bump clears prior "Always allow" and re-prompts, which is expected.

> **Never** widen the by-design VSIX-audit register, or skip the notices gate, to make a release pass. A checksum or notices failure is a signal, not an obstacle.

---

## 5. Related governance

- Acquisition strategy: [ADR: Binary Acquisition Strategy](adr/adr-binary-acquisition-strategy.md) (Semble 2a, DCG 3a)
- Shared consent/workspace-trust gate: [`src/services/binary-acquisition/index.ts`](../src/services/binary-acquisition/index.ts:1)
- Attribution shipped with the artefact: [`THIRD-PARTY-NOTICES.md`](../THIRD-PARTY-NOTICES.md)
- Semble (the downloaded binary): [`SEMBLE-RELEASE-GOVERNANCE.md`](SEMBLE-RELEASE-GOVERNANCE.md)
- Reproducing the Roo+ VSIX & security posture: [`SECURITY.md`](../SECURITY.md)
- Marketplace notice tracking: [`docs/compliance/marketplace-305-remediation-plan.md`](compliance/marketplace-305-remediation-plan.md)
