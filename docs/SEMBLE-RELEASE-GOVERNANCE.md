# Semble Release & Provenance Governance

**Status:** ✅ ACTIVE · **Owner:** Roo+ maintainers (release) + Security (attribution) · **Applies to:** the Semble code-index binary that Roo+ downloads at first use

> This file restores the provenance document that several ADRs/scripts/CI gates reference but that had been removed during an earlier release-cycle cleanup (see [`CHANGELOG.md`](../CHANGELOG.md) v3.77.0-era cleanup note). It is the canonical source of truth for **who authored Semble, how the Roo+-distributed artifact is produced, and how a version bump must keep version/checksum/consent metadata coupled** (Marketplace notice #305, D3/3A and WS-C3).

---

## 1. Authorship reality — Semble is NOT Roo+ code

Semble is a **fast and accurate code-search tool for AI agents**, authored and maintained **upstream** by:

- **Upstream project:** [`MinishLab/semble`](https://github.com/MinishLab/semble) — "Fast and Accurate Code Search for Agents. Uses 99% fewer tokens than grep+read"
- **Author / maintainer:** Thomas van Dongen (MinishLab)
- **Upstream license:** MIT — Copyright (c) 2026 Thomas van Dongen (see the upstream [`LICENSE`](https://github.com/MinishLab/semble/blob/main/LICENSE))

**Roo+ does not author, host, or vendor Semble's source.** What Roo+ controls is the **packaging repo**:

- **Packaging / installer repo:** [`Audare-est-Facere/sembleexec`](https://github.com/Audare-est-Facere/sembleexec) — a repository under Roo+ control that **builds PyInstaller standalone binaries from upstream [`MinishLab/semble`](https://github.com/MinishLab/semble) PyPI releases** (automated by that repo's `.github/workflows/release.yaml`) and publishes them as GitHub release assets.
- The packaging repo contains **no Semble source and carries no separate LICENSE** — the distributed binaries inherit the **upstream MIT license**.

For "publish matching source" purposes (Marketplace #305) this means: **Semble is an externally-authored, source-published component that Roo+ builds and pins — it is not part of Roo+'s published source and is deliberately not bundled into the VSIX** (bundling was ruled out — see [ADR: Semble Binary — Download-Only Distribution](../docs/adr/adr-semble-binary-download-only.md)). Acquisition is **consent-gated at first use** with the consent dialog attributing name, pinned version, upstream source, SHA-256 and size.

### Roo+-built artifact vs. upstream relationship

| Layer            | Repo                                                                              | Owner                              | Content                                                                                                           |
| ---------------- | --------------------------------------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Source of Semble | [`MinishLab/semble`](https://github.com/MinishLab/semble)                         | Thomas van Dongen (MinishLab), MIT | Semble source, PyPI releases                                                                                      |
| Packaging        | [`Audare-est-Facere/sembleexec`](https://github.com/Audare-est-Facere/sembleexec) | Roo+ control                       | Build automation + published standalone binaries (`semble-<platform>-fast.tar.gz`/`.zip`, `checksums-sha256.txt`) |
| Distributor      | `roo-plus` VSIX (`xavier-arosemena/roo-plus`)                                     | Roo+                               | Downloads the pinned binary on first use (after consent), SHA-256 verifies, does **not** bundle it                |

---

## 2. Immutable tag policy (pinned version)

The Semble download is **pinned to an immutable GitHub release tag**, never "latest" at runtime:

- `SEMBLE_VERSION = "v0.5.2"` in [`semble-downloader.ts`](../src/services/code-index/semble/semble-downloader.ts:27)
- Download base URL is derived from that constant: `https://github.com/Audare-est-Facere/sembleexec/releases/download/${SEMBLE_VERSION}` (line 65).
- A "resolve latest" mechanism exists but is **disabled by default** (`SEMBLE_VERSION_PATTERN === "latest"` or the `SEMBLE_RESOLVE_LATEST` env var) — see lines 50–63.

**Rule (immutable tags):** release tags under `Audare-est-Facere/sembleexec` are **never mutated, re-uploaded, or "fixed in place."** A corrected artifact requires a **new tag** (`v0.5.2 → v0.5.3`). Re-publishing bytes under an existing tag is the exact stub-era anti-pattern that silently breaks cached installs and is a hard CI failure (enforced by [`verify-semble-release-coupling.mjs`](../scripts/verify-semble-release-coupling.mjs)).

---

## 3. Version ↔ checksum coupling (the rule)

Two constants in [`semble-downloader.ts`](../src/services/code-index/semble/semble-downloader.ts) must **always move together**:

- `SEMBLE_VERSION` (line 27)
- `SEMBLE_SHA256` (line 87) — platform-keyed hashes pinned to `SEMBLE_VERSION`

**Both directions fail, no exceptions** (enforced by the CI diff-gate [`scripts/verify-semble-release-coupling.mjs`](../scripts/verify-semble-release-coupling.mjs)):

1. A change to `SEMBLE_VERSION` **without** a `SEMBLE_SHA256` change in the same diff → **hard fail**.
2. A change to `SEMBLE_SHA256` **without** a `SEMBLE_VERSION` change → **hard fail** (only a new tag may change artifact bytes; a checksum change under an existing version implies an in-place re-upload).

Additional Semble release gates:

- [`scripts/verify-semble-checksums.mjs`](../scripts/verify-semble-checksums.mjs) — the hardcoded `SEMBLE_SHA256` set stays internally consistent.
- [`scripts/semble-smoke.mjs`](../scripts/semble-smoke.mjs) — live smoke test of the pinned binary against the CLI contract.
- CI wiring described in [`plans/RELEASE-WORKFLOWS.md`](../plans/RELEASE-WORKFLOWS.md) (the `--strict` checksum gate before stable publish).

### Pinned checksums at `v0.5.2` (in-repo source of truth)

These mirror `SEMBLE_SHA256` in [`semble-downloader.ts`](../src/services/code-index/semble/semble-downloader.ts:87). They are verified after every download and against the fetched `checksums-sha256.txt` manifest.

| Platform / arch | Archive asset                    | SHA-256                                                            |
| --------------- | -------------------------------- | ------------------------------------------------------------------ |
| `linux-x64`     | `semble-linux-x64-fast.tar.gz`   | `bd5be465659c220335f1e2d4e1afe117288ae7f8ceab93902ac737662e9309d3` |
| `linux-arm64`   | `semble-linux-arm64-fast.tar.gz` | `2f7fae09d5144eb5f58f566f7c507c7feea3ba0b1cee9972f97ae992234a5a1f` |
| `darwin-arm64`  | `semble-macos-arm64-fast.tar.gz` | `f79e0d52cdd6b9680e31ceba8dbaacfa6ea93fa21785f84cc04d13fb782e5881` |
| `win32-x64`     | `semble-windows-x64-fast.zip`    | `c793051829fd440939f7d9735649e6027bb42182f19f1c324dbeb0ed6c9118ad` |

> Regenerate a hash with `shasum -a 256 <archive-file>` when a new tag is published, then update `SEMBLE_SHA256` **and** `SEMBLE_VERSION` in the same commit.

---

## 4. Consent metadata & single source of truth

The **consent dialog metadata** shown before any download lives in [`src/services/binary-acquisition/semble.ts`](../src/services/binary-acquisition/semble.ts:26) (`buildSembleAcquisitionInfo()`), but it **reads the version, archive set, and checksums from the same `SEMBLE_*` constants in [`semble-downloader.ts`](../src/services/code-index/semble/semble-downloader.ts:16)** — there is a single source of truth. The dialog therefore always reflects the pinned constants.

The acquisition gate itself ([`binary-acquisition/index.ts`](../src/services/binary-acquisition/index.ts:184)) enforces, in order: **workspace must be trusted** → a persisted per-`id@version` "Always allow" decision may short-circuit → otherwise an explicit modal consent (Allow once / Always allow / Deny) is shown. Persisted consent is **version-scoped** (`semble@v0.5.2`): bumping the pinned version clears prior consent and forces a fresh approval. No download is ever attempted in an untrusted workspace.

---

## 5. Air-gapped / manual-install path

Semble is **download-only** (see the [ADR](../docs/adr/adr-semble-binary-download-only.md)); offline users supply the binary manually:

1. On a networked machine, fetch the correct archive for your platform from the pinned release `v0.5.2` (`Audare-est-Facere/sembleexec` releases).
2. Verify: `shasum -a 256 <archive>` against the table in §3.
3. Extract the PyInstaller one-dir archive; the runnable file is `semble/semble` (the downloader resolves the nested binary — see `resolveSembleBinary()`/`findFileNamed()` in [`semble-downloader.ts`](../src/services/code-index/semble/semble-downloader.ts:354)).
4. Set the Roo+ setting **`codebaseIndexSembleBinaryPath`** to the absolute path of the `semble` executable (default declared in [`config-manager.ts`](../src/services/code-index/config-manager.ts:59)). When set, `downloadSemble()` short-circuits ("Using manually configured binary…", [`semble-downloader.ts`](../src/services/code-index/semble/semble-downloader.ts:577)) and no network is used.

---

## 6. How to bump Semble (checklist)

1. Publish a **new immutable tag** upstream in `Audare-est-Facere/sembleexec` (built from the upstream `MinishLab/semble` release of your choice) — never mutate `v0.5.2`.
2. Download each new platform archive and record `shasum -a 256` output.
3. In a **single commit**, update **both** `SEMBLE_VERSION` and `SEMBLE_SHA256` in [`semble-downloader.ts`](../src/services/code-index/semble/semble-downloader.ts:27) (this also updates `SEMBLE_VERSION_PATTERN`/`DOWNLOAD_BASE_URL` which derive from `SEMBLE_VERSION`).
4. Re-run [`scripts/verify-semble-checksums.mjs`](../scripts/verify-semble-checksums.mjs) and the coupling gate [`scripts/verify-semble-release-coupling.mjs`](../scripts/verify-semble-release-coupling.mjs).
5. Run [`scripts/semble-smoke.mjs`](../scripts/semble-smoke.mjs) against the new binary.
6. **Consent metadata in [`binary-acquisition/semble.ts`](../src/services/binary-acquisition/semble.ts) derives from the downloader constants**, so it follows automatically; still verify the localized purpose string and `SEMBLE_APPROX_SIZE` (`~150 MB`) remain accurate, and confirm a fresh install shows the new `version`/`sha256` in the consent dialog.
7. Update this document's §3 checksum table and any Marketplace listing/DEBT notes referencing the version.
8. Because consent is version-scoped, existing users who approved `semble@v0.5.2` will be re-prompted for the new version — expected behavior.

---

## 7. Related governance

- Decision to be download-only (and why bundling is ruled out): [`docs/adr/adr-semble-binary-download-only.md`](adr/adr-semble-binary-download-only.md)
- Consent/workspace-trust gate for all acquired binaries: [`src/services/binary-acquisition/index.ts`](../src/services/binary-acquisition/index.ts:1)
- DCG (the other consent-gated external binary): [`docs/DCG-RELEASE-GOVERNANCE.md`](DCG-RELEASE-GOVERNANCE.md)
- Release workflow + Semble CI gates: [`plans/RELEASE-WORKFLOWS.md`](../plans/RELEASE-WORKFLOWS.md)
- Security posture & reproducing the VSIX: [`SECURITY.md`](../SECURITY.md)
- Marketplaces notice tracking: [`docs/marketplace-305-remediation-plan.md`](marketplace-305-remediation-plan.md)
