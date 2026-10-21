# Third-Party Notices — Roo+

**Applies to:** the packaged extension `xavier-arosemena.roo-plus` (the `.vsix`
published to Open VSX) and the source in this repository.
**Maintained by:** Roo+ maintainers · **Last regenerated:** 2026-10-21

Roo+ is a fork of [Zoo Code](https://github.com/Zoo-Code-Org/Zoo-Code), which is
itself a fork of Roo Code / Cline. The inherited core is licensed Apache-2.0 and
that licence text ships with the extension (`LICENSE` → `LICENSE.txt` in the
packaged artefact); the `license` field in `package.json` declares
`Apache-2.0`. This file covers **third-party components**: the binaries Roo+
distributes inside the VSIX, the binary Roo+ acquires at first use and never
redistributes (Semble), and every JavaScript dependency reachable from `src/` in
production.

Roo+ ships **no telemetry transport** and makes no network request at start-up.

---

## 1. Third-party binaries distributed inside the VSIX

### 1.1 DCG (`destructive_command_guard`) — MIT with the OpenAI/Anthropic rider

| Field                   | Value                                                                                                                                  |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Component               | `destructive_command_guard` (DCG), the `dcg` / `dcg.exe` CLI                                                                           |
| Version                 | `v0.7.7`                                                                                                                               |
| Licence                 | MIT License **with the OpenAI/Anthropic Rider** (reproduced verbatim in §1.1.1)                                                        |
| Copyright holder        | Copyright (c) 2026 Jeffrey Emanuel                                                                                                     |
| Upstream source         | <https://github.com/Dicklesworthstone/destructive_command_guard>                                                                       |
| Distribution model      | **Bundled.** The five unmodified upstream release archives ship inside the VSIX under `bin/dcg/`. Roo+ never downloads DCG at runtime. |
| Decision record         | [ADR: Binary Acquisition Strategy](docs/adr/adr-binary-acquisition-strategy.md) (DCG 3a, 2026-10-21)                                   |
| Provenance / governance | [`docs/DCG-RELEASE-GOVERNANCE.md`](docs/DCG-RELEASE-GOVERNANCE.md)                                                                     |

The bundled files are the upstream release assets, byte-for-byte, so the
published upstream checksums still apply. Roo+ additionally pins the SHA-256 of
the **extracted executable** and verifies it before the binary is ever run, so a
tampered or partially replaced VSIX is rejected.

| Platform       | Bundled archive                                | Archive SHA-256                                                    | Binary SHA-256                                                     |
| -------------- | ---------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `darwin-x64`   | `bin/dcg/dcg-x86_64-apple-darwin.tar.xz`       | `15b42fbbbeab47123899e6328d90cd593e14999f3d275f71294815ad8ed9479c` | `8f2a53fb20ea3e91b7e91bdb64f12c800b8c3b789a784a5871f26475ac0981d2` |
| `darwin-arm64` | `bin/dcg/dcg-aarch64-apple-darwin.tar.xz`      | `a63cf82bd3584055112d5ec7a4ab3d7e0619a9f806a53930c27aa0e6297484de` | `48616e766d6579eaa7cbb9dac949c1d36455f1374f91872d6ed5591976ecd282` |
| `linux-x64`    | `bin/dcg/dcg-x86_64-unknown-linux-musl.tar.xz` | `472b130a9b235edc57e6cb7566641da5fef905e9dbefd3a46f9ad1e33205fa04` | `131acedaa3e3576fe2c3e253a5f4209e5ba4b75bbff7faf1ee3e18cb88e95a66` |
| `linux-arm64`  | `bin/dcg/dcg-aarch64-unknown-linux-gnu.tar.xz` | `abb0d94f23ab50f9edc16f8ca6939ff8eec23e1831d3ad7a28d9f03252c3306d` | `8927f75a3b337c1a2f5d87585f4c9abc0a3e17a214a72ccb5c46cee5db8163bc` |
| `win32-x64`    | `bin/dcg/dcg-x86_64-pc-windows-msvc.zip`       | `435127410eabc53e772be4f5c668a875b45fbaf806654b577c2d975bd0e38964` | `93d3da674c1ab398fec425532f72b2d3d55ab72340bd91ccd90cf8acd5f21912` |

**Licence obligation.** The rider is a condition of the licence, and it requires
that _"any distribution of the Software or any Derivative Works must include
this rider provision unmodified."_ DCG is opt-in at runtime
(`destructiveCommandGuardEnabled` defaults to `false`) and the user is asked for
explicit, version-scoped approval before it is executed.

#### 1.1.1 DCG licence text (verbatim, unmodified)

```text
MIT License (with OpenAI/Anthropic Rider)

Copyright (c) 2026 Jeffrey Emanuel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

ADDITIONAL RIDER / RESTRICTION (OpenAI / Anthropic):

This rider is part of the "conditions" of this License. In the event of any
conflict between this rider and any other portion of this License, this rider
controls.

"Restricted Parties" means OpenAI, L.L.C.; Anthropic, PBC; any of their
respective Affiliates; and any person or entity acting directly or indirectly
on behalf of, for the benefit of, or under the direction of any of the
foregoing (including any officer, director, employee, contractor, agent,
consultant, service provider, or representative).

Notwithstanding any other provision of this License, no rights are granted to
any Restricted Party. Any purported license, sublicense, assignment, transfer,
or other permission to any Restricted Party is null and void absent the
express prior written permission of Jeffrey Emanuel.

You may not provide, disclose, distribute, sublicense, sell, lease, lend,
host, make available, or otherwise permit access to the Software or any
derivative work of the Software (as defined in applicable copyright law)
(collectively, "Derivative Works") to or for any Restricted Party.

For purposes of this rider, "use" includes, without limitation: copying,
modifying, merging, publishing, distributing, sublicensing, selling,
transferring, making available, hosting, deploying, executing, benchmarking,
testing, analyzing, indexing, or incorporating the Software or any Derivative
Works into any dataset, training corpus, evaluation harness, or pipeline for
machine learning or other automated systems.

This rider applies to the Software and all Derivative Works. As a condition of
use, you agree that this rider is a precondition to exercising any rights
under this License, and you agree that any distribution of the Software or any
Derivative Works must include this rider provision unmodified.

Any breach of this rider automatically and immediately terminates the
permissions granted by this License. Upon termination, you must immediately
cease all use and distribution of the Software and any Derivative Works and
destroy all copies under your control.

You agree that a breach of this rider would cause irreparable harm and that
Jeffrey Emanuel may seek injunctive or other equitable relief to enforce this
rider, in addition to any other remedies available at law. To the maximum
extent permitted by applicable law, the prevailing party in any action to
enforce this rider shall be entitled to recover reasonable attorneys' fees and
costs.

For purposes of this rider, "Affiliate" means any entity that directly or
indirectly controls, is controlled by, or is under common control with the
specified party. "Control" means ownership of more than 50% of the voting
securities or other ownership interest, or the power to direct management or
policies by contract or otherwise.

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### 1.2 esbuild (WASM shims) — MIT

| Field             | Value                                                                                                                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Component         | `esbuild` / `esbuild-wasm` runtime shims                                                                                                                                                               |
| Licence           | MIT                                                                                                                                                                                                    |
| Copyright holder  | Copyright (c) 2020 Evan Wallace                                                                                                                                                                        |
| Upstream source   | <https://github.com/evanw/esbuild>                                                                                                                                                                     |
| Files in the VSIX | `dist/bin/esbuild`, `dist/wasm_exec.js`, `dist/wasm_exec_node.js`                                                                                                                                      |
| Not in the VSIX   | `esbuild.wasm` (the ~13.9 MB engine) is **not** bundled; it is fetched at first use of custom-tool transpilation, consent-gated and checksum-verified (`src/services/custom-tools/esbuild-engine.ts`). |

### 1.3 tree-sitter runtimes — MIT

| Field             | Value                                                                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Components        | `web-tree-sitter` (`dist/tree-sitter.wasm`) and the per-language grammar WASMs (`dist/tree-sitter-<language>.wasm`, 36 grammars)                       |
| Licence           | MIT                                                                                                                                                    |
| Copyright holders | Copyright (c) 2018 Max Brunsfeld (web-tree-sitter); individual tree-sitter grammar authors (grammars packaged via the `tree-sitter-wasms` npm package) |
| Upstream sources  | <https://github.com/tree-sitter/tree-sitter> · <https://github.com/Gregoor/tree-sitter-wasms>                                                          |

### 1.4 tiktoken — MIT

| Field             | Value                                                                                   |
| ----------------- | --------------------------------------------------------------------------------------- |
| Component         | `tiktoken` (WebAssembly tokenizer used for token counting)                              |
| Licence           | MIT                                                                                     |
| Copyright holder  | Copyright (c) 2023 OpenAI                                                               |
| Upstream source   | <https://github.com/dqbd/tiktoken>                                                      |
| Files in the VSIX | `dist/tiktoken_bg.wasm`, `dist/workers/tiktoken_bg.wasm`, `dist/workers/countTokens.js` |

---

## 2. Components Roo+ acquires at runtime (never distributed inside the VSIX)

### 2.1 Semble — MIT (not bundled; **downloaded at first use, after consent**)

| Field               | Value                                                                                                                                                                                                                                                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Component           | `semble` (code search / indexing CLI)                                                                                                                                                                                                                                                                                                |
| Licence             | MIT                                                                                                                                                                                                                                                                                                                                  |
| Copyright holder    | Copyright (c) Thomas van Dongen / MinishLab                                                                                                                                                                                                                                                                                          |
| Upstream project    | <https://github.com/MinishLab/semble>                                                                                                                                                                                                                                                                                                |
| Release assets used | `Audare-est-Facere/sembleexec`, pinned to `v0.5.2` (`SEMBLE_VERSION` in `src/services/code-index/semble/semble-downloader.ts`)                                                                                                                                                                                                       |
| Distribution model  | **Not bundled, acquired at first use.** No Semble bytes are present in this repository or in the VSIX. The extension downloads the version-pinned archive from GitHub release assets only after an explicit consent prompt naming the version, source and SHA-256, and verifies the archive's SHA-256 before the binary is executed. |
| Decision record     | [ADR: Binary Acquisition Strategy](docs/adr/adr-binary-acquisition-strategy.md) — decision 2a (detect an existing installation and guide the user; no acquisition by Roo+) is **planned, not shipped**                                                                                                                               |
| User action         | None required: the first use of codebase indexing offers the downloaded binary behind the consent prompt. An existing installation can be reused by pointing `roo-plus.codebaseIndexSembleBinaryPath` at it.                                                                                                                         |

Semble is licensed MIT. The acquisition path is **live** in
`src/services/code-index/semble/semble-downloader.ts`, which holds the pinned
`DOWNLOAD_BASE_URL` for `Audare-est-Facere/sembleexec` (`v0.5.2`) and is only
reached after consent, in a trusted workspace, with SHA-256 verification — which is
why this section records Semble as acquired by Roo+ at runtime rather than
distributed with it. Migration to decision 2a (detect and guide only) is planned
and will update this section in the same commit that removes that download path
(DEBT #28). Provenance and per-platform checksums:
[`docs/SEMBLE-RELEASE-GOVERNANCE.md`](docs/SEMBLE-RELEASE-GOVERNANCE.md).

### 2.2 Model providers and other network services

Roo+ talks only to the AI provider endpoints that the user configures with
their own credentials. Those services are not distributed with Roo+ and are
governed by their own terms. See [`PRIVACY.md`](PRIVACY.md).

---

## 3. Bundled JavaScript dependencies

Generated from the real production dependency tree of `src/`
(`pnpm --filter ./src licenses list --prod --json`), grouped by declared
licence. Every package the extension resolves at runtime is listed; the
`scripts/verify-third-party-notices.mjs` gate fails if a production dependency,
or a shipped binary component, is missing from this file.

<!-- BEGIN GENERATED: js-dependencies -->

### (AFL-2.1 OR BSD-3-Clause) (1 packages)

| Package       | Version |
| ------------- | ------- |
| `json-schema` | `0.4.0` |

### (MIT AND Zlib) (1 packages)

| Package | Version  |
| ------- | -------- |
| `pako`  | `1.0.11` |

### (MIT OR CC0-1.0) (2 packages)

| Package     | Version  |
| ----------- | -------- |
| `type-fest` | `0.13.1` |
| `type-fest` | `4.41.0` |

### (MIT OR GPL-3.0-or-later) (1 packages)

| Package | Version  |
| ------- | -------- |
| `jszip` | `3.10.1` |

### (WTFPL OR MIT) (1 packages)

| Package            | Version |
| ------------------ | ------- |
| `utf8-byte-length` | `1.0.5` |

### 0BSD (1 packages)

| Package | Version |
| ------- | ------- |
| `tslib` | `2.8.1` |

### Apache-2.0 (56 packages)

| Package                                         | Version    |
| ----------------------------------------------- | ---------- |
| `@ai-sdk/anthropic`                             | `3.0.42`   |
| `@ai-sdk/gateway`                               | `3.0.142`  |
| `@ai-sdk/openai`                                | `3.0.27`   |
| `@ai-sdk/openai-compatible`                     | `2.0.56`   |
| `@ai-sdk/provider`                              | `3.0.13`   |
| `@ai-sdk/provider`                              | `3.0.8`    |
| `@ai-sdk/provider-utils`                        | `4.0.14`   |
| `@ai-sdk/provider-utils`                        | `4.0.35`   |
| `@aws-sdk/client-bedrock-runtime`               | `3.1078.0` |
| `@aws-sdk/client-cognito-identity`              | `3.1078.0` |
| `@aws-sdk/core`                                 | `3.974.27` |
| `@aws-sdk/credential-provider-cognito-identity` | `3.972.52` |
| `@aws-sdk/credential-provider-env`              | `3.972.53` |
| `@aws-sdk/credential-provider-http`             | `3.972.55` |
| `@aws-sdk/credential-provider-ini`              | `3.972.60` |
| `@aws-sdk/credential-provider-login`            | `3.972.59` |
| `@aws-sdk/credential-provider-node`             | `3.972.62` |
| `@aws-sdk/credential-provider-process`          | `3.972.53` |
| `@aws-sdk/credential-provider-sso`              | `3.972.59` |
| `@aws-sdk/credential-provider-web-identity`     | `3.972.59` |
| `@aws-sdk/credential-providers`                 | `3.1078.0` |
| `@aws-sdk/eventstream-handler-node`             | `3.972.25` |
| `@aws-sdk/middleware-eventstream`               | `3.972.21` |
| `@aws-sdk/middleware-websocket`                 | `3.972.35` |
| `@aws-sdk/nested-clients`                       | `3.997.27` |
| `@aws-sdk/signature-v4-multi-region`            | `3.996.38` |
| `@aws-sdk/token-providers`                      | `3.1078.0` |
| `@aws-sdk/token-providers`                      | `3.1079.0` |
| `@aws-sdk/types`                                | `3.973.15` |
| `@aws-sdk/xml-builder`                          | `3.972.33` |
| `@aws/lambda-invoke-store`                      | `0.3.0`    |
| `@google/genai`                                 | `2.16.0`   |
| `@lmstudio/lms-isomorphic`                      | `0.4.6`    |
| `@lmstudio/sdk`                                 | `1.5.0`    |
| `@opentelemetry/api`                            | `1.9.0`    |
| `@qdrant/js-client-rest`                        | `1.18.0`   |
| `@smithy/core`                                  | `3.29.1`   |
| `@smithy/credential-provider-imds`              | `4.4.6`    |
| `@smithy/fetch-http-handler`                    | `5.6.3`    |
| `@smithy/node-http-handler`                     | `4.9.3`    |
| `@smithy/signature-v4`                          | `5.6.2`    |
| `@smithy/types`                                 | `4.15.1`   |
| `@vercel/oidc`                                  | `3.2.0`    |
| `ai`                                            | `6.0.218`  |
| `crc-32`                                        | `1.2.2`    |
| `ecdsa-sig-formatter`                           | `1.0.11`   |
| `gaxios`                                        | `7.3.1`    |
| `gcp-metadata`                                  | `8.1.2`    |
| `google-auth-library`                           | `10.9.1`   |
| `google-logging-utils`                          | `1.1.3`    |
| `human-signals`                                 | `5.0.0`    |
| `long`                                          | `5.3.2`    |
| `openai`                                        | `5.23.2`   |
| `readdir-glob`                                  | `1.1.3`    |
| `typescript`                                    | `5.9.3`    |
| `workerpool`                                    | `10.0.3`   |

### BSD (1 packages)

| Package | Version  |
| ------- | -------- |
| `duck`  | `0.1.12` |

### BSD-2-Clause (7 packages)

| Package              | Version  |
| -------------------- | -------- |
| `dingbat-to-unicode` | `1.0.1`  |
| `dotenv`             | `17.4.2` |
| `esprima`            | `4.0.1`  |
| `json-schema-typed`  | `8.0.2`  |
| `lop`                | `0.4.2`  |
| `mammoth`            | `1.11.0` |
| `option`             | `0.2.4`  |

### BSD-3-Clause (21 packages)

| Package                      | Version  |
| ---------------------------- | -------- |
| `@protobufjs/aspromise`      | `1.1.2`  |
| `@protobufjs/base64`         | `1.1.2`  |
| `@protobufjs/codegen`        | `2.0.5`  |
| `@protobufjs/eventemitter`   | `1.1.1`  |
| `@protobufjs/fetch`          | `1.1.1`  |
| `@protobufjs/float`          | `1.0.2`  |
| `@protobufjs/path`           | `1.1.2`  |
| `@protobufjs/pool`           | `1.1.0`  |
| `@protobufjs/utf8`           | `1.1.2`  |
| `buffer-equal-constant-time` | `1.0.1`  |
| `diff`                       | `5.2.2`  |
| `duplexer2`                  | `0.1.4`  |
| `fast-uri`                   | `3.1.8`  |
| `fzf`                        | `0.5.2`  |
| `global-agent`               | `3.0.0`  |
| `ieee754`                    | `1.2.1`  |
| `protobufjs`                 | `7.6.5`  |
| `qs`                         | `6.15.2` |
| `roarr`                      | `2.15.4` |
| `sprintf-js`                 | `1.0.3`  |
| `sprintf-js`                 | `1.1.3`  |

### BlueOak-1.0.0 (5 packages)

| Package                  | Version  |
| ------------------------ | -------- |
| `glob`                   | `11.1.0` |
| `jackspeak`              | `4.1.1`  |
| `minimatch`              | `10.2.5` |
| `package-json-from-dist` | `1.0.1`  |
| `path-scurry`            | `2.0.0`  |

### ISC (22 packages)

| Package               | Version  |
| --------------------- | -------- |
| `@isaacs/cliui`       | `8.0.2`  |
| `foreground-child`    | `3.3.1`  |
| `fstream`             | `1.0.12` |
| `graceful-fs`         | `4.2.11` |
| `inherits`            | `2.0.4`  |
| `isexe`               | `2.0.0`  |
| `json-stringify-safe` | `5.0.1`  |
| `listenercount`       | `1.0.1`  |
| `lru-cache`           | `11.2.2` |
| `minimatch`           | `5.1.9`  |
| `minipass`            | `7.1.2`  |
| `once`                | `1.4.0`  |
| `rimraf`              | `2.7.1`  |
| `saxes`               | `5.0.1`  |
| `semver`              | `7.7.3`  |
| `setprototypeof`      | `1.2.0`  |
| `signal-exit`         | `3.0.7`  |
| `signal-exit`         | `4.1.0`  |
| `which`               | `2.0.2`  |
| `wrappy`              | `1.0.2`  |
| `yaml`                | `2.9.0`  |
| `zod-to-json-schema`  | `3.25.2` |

### MIT (295 packages)

| Package                                  | Version    |
| ---------------------------------------- | ---------- |
| `@anthropic-ai/sdk`                      | `0.109.1`  |
| `@anthropic-ai/vertex-sdk`               | `0.19.0`   |
| `@babel/runtime`                         | `7.29.7`   |
| `@fast-csv/format`                       | `4.3.5`    |
| `@fast-csv/parse`                        | `4.3.6`    |
| `@hono/node-server`                      | `2.1.3`    |
| `@kwsites/file-exists`                   | `1.1.1`    |
| `@kwsites/promise-deferred`              | `1.1.1`    |
| `@modelcontextprotocol/sdk`              | `1.29.0`   |
| `@qdrant/openapi-typescript-fetch`       | `1.2.6`    |
| `@simple-git/args-pathspec`              | `1.0.3`    |
| `@simple-git/argv-parser`                | `1.1.1`    |
| `@stablelib/base64`                      | `1.0.1`    |
| `@standard-schema/spec`                  | `1.1.0`    |
| `@types/node`                            | `14.18.63` |
| `@types/node`                            | `22.20.1`  |
| `@types/retry`                           | `0.12.0`   |
| `@xmldom/xmldom`                         | `0.8.15`   |
| `accepts`                                | `2.0.0`    |
| `agent-base`                             | `6.0.2`    |
| `agent-base`                             | `7.1.3`    |
| `ajv`                                    | `8.20.0`   |
| `ajv-formats`                            | `3.0.1`    |
| `ansi-regex`                             | `5.0.1`    |
| `ansi-styles`                            | `4.3.0`    |
| `archiver`                               | `5.3.2`    |
| `archiver-utils`                         | `2.1.0`    |
| `archiver-utils`                         | `3.0.4`    |
| `argparse`                               | `1.0.10`   |
| `async`                                  | `3.2.6`    |
| `async-mutex`                            | `0.5.0`    |
| `asynckit`                               | `0.4.0`    |
| `axios`                                  | `1.20.0`   |
| `balanced-match`                         | `4.0.4`    |
| `base64-js`                              | `1.5.1`    |
| `bignumber.js`                           | `9.3.1`    |
| `binary`                                 | `0.3.0`    |
| `bl`                                     | `4.1.0`    |
| `bluebird`                               | `3.7.2`    |
| `body-parser`                            | `2.3.0`    |
| `boolean`                                | `3.2.0`    |
| `bowser`                                 | `2.14.1`   |
| `brace-expansion`                        | `5.0.12`   |
| `buffer`                                 | `5.7.1`    |
| `buffer-crc32`                           | `0.2.13`   |
| `buffer-indexof-polyfill`                | `1.0.2`    |
| `bytes`                                  | `3.1.2`    |
| `call-bind-apply-helpers`                | `1.0.2`    |
| `call-bound`                             | `1.0.4`    |
| `chalk`                                  | `4.1.2`    |
| `chokidar`                               | `4.0.3`    |
| `clone`                                  | `2.1.2`    |
| `clone-deep`                             | `4.0.1`    |
| `color-convert`                          | `2.0.1`    |
| `color-name`                             | `1.1.4`    |
| `combined-stream`                        | `1.0.8`    |
| `commander`                              | `8.3.0`    |
| `compress-commons`                       | `4.1.2`    |
| `content-disposition`                    | `1.0.0`    |
| `content-type`                           | `1.0.5`    |
| `content-type`                           | `2.0.0`    |
| `cookie`                                 | `0.7.2`    |
| `cookie-signature`                       | `1.2.2`    |
| `core-util-is`                           | `1.0.3`    |
| `cors`                                   | `2.8.5`    |
| `crc32-stream`                           | `4.0.3`    |
| `cross-spawn`                            | `7.0.6`    |
| `data-uri-to-buffer`                     | `4.0.1`    |
| `dayjs`                                  | `1.11.21`  |
| `debug`                                  | `4.4.3`    |
| `define-data-property`                   | `1.1.4`    |
| `define-properties`                      | `1.2.1`    |
| `delay`                                  | `6.0.0`    |
| `delayed-stream`                         | `1.0.0`    |
| `depd`                                   | `2.0.0`    |
| `detect-node`                            | `2.1.0`    |
| `dunder-proto`                           | `1.0.1`    |
| `duplexer`                               | `0.1.2`    |
| `ee-first`                               | `1.1.1`    |
| `emoji-regex`                            | `8.0.0`    |
| `encodeurl`                              | `2.0.0`    |
| `end-of-stream`                          | `1.4.4`    |
| `es-define-property`                     | `1.0.1`    |
| `es-errors`                              | `1.3.0`    |
| `es-object-atoms`                        | `1.1.1`    |
| `es-set-tostringtag`                     | `2.1.0`    |
| `es6-error`                              | `4.1.1`    |
| `escape-html`                            | `1.0.3`    |
| `escape-string-regexp`                   | `4.0.0`    |
| `etag`                                   | `1.8.1`    |
| `event-stream`                           | `3.3.4`    |
| `eventsource`                            | `3.0.7`    |
| `eventsource-parser`                     | `3.1.0`    |
| `exceljs`                                | `4.4.0`    |
| `execa`                                  | `8.0.1`    |
| `express`                                | `5.2.1`    |
| `express-rate-limit`                     | `8.5.2`    |
| `extend`                                 | `3.0.2`    |
| `extend-shallow`                         | `2.0.1`    |
| `fast-csv`                               | `4.3.6`    |
| `fast-deep-equal`                        | `3.1.3`    |
| `fastest-levenshtein`                    | `1.0.16`   |
| `fetch-blob`                             | `3.2.0`    |
| `finalhandler`                           | `2.1.0`    |
| `follow-redirects`                       | `1.16.1`   |
| `form-data`                              | `4.0.6`    |
| `formdata-polyfill`                      | `4.0.10`   |
| `forwarded`                              | `0.2.0`    |
| `fresh`                                  | `2.0.0`    |
| `from`                                   | `0.1.7`    |
| `fs-constants`                           | `1.0.0`    |
| `fs-extra`                               | `7.0.1`    |
| `function-bind`                          | `1.1.2`    |
| `get-folder-size`                        | `5.0.0`    |
| `get-intrinsic`                          | `1.3.0`    |
| `get-proto`                              | `1.0.1`    |
| `get-stream`                             | `8.0.1`    |
| `globalthis`                             | `1.0.4`    |
| `gopd`                                   | `1.2.0`    |
| `gray-matter`                            | `4.0.3`    |
| `has-flag`                               | `4.0.0`    |
| `has-property-descriptors`               | `1.0.2`    |
| `has-symbols`                            | `1.1.0`    |
| `has-tostringtag`                        | `1.0.2`    |
| `hasown`                                 | `2.0.4`    |
| `hono`                                   | `4.12.34`  |
| `http-errors`                            | `2.0.1`    |
| `http-proxy-agent`                       | `7.0.2`    |
| `https-proxy-agent`                      | `5.0.1`    |
| `https-proxy-agent`                      | `7.0.6`    |
| `i18next`                                | `25.2.1`   |
| `iconv-lite`                             | `0.7.0`    |
| `iconv-lite`                             | `0.7.3`    |
| `ignore`                                 | `7.0.5`    |
| `immediate`                              | `3.0.6`    |
| `ip-address`                             | `10.3.1`   |
| `ipaddr.js`                              | `1.9.1`    |
| `is-extendable`                          | `0.1.1`    |
| `is-fullwidth-code-point`                | `3.0.0`    |
| `is-plain-object`                        | `2.0.4`    |
| `is-promise`                             | `4.0.0`    |
| `is-stream`                              | `3.0.0`    |
| `isarray`                                | `1.0.0`    |
| `isbinaryfile`                           | `5.0.7`    |
| `isobject`                               | `3.0.1`    |
| `jose`                                   | `6.2.3`    |
| `js-yaml`                                | `3.15.2`   |
| `json-bigint`                            | `1.0.0`    |
| `json-schema-to-ts`                      | `3.1.1`    |
| `json-schema-traverse`                   | `1.0.0`    |
| `json-stream-stringify`                  | `3.1.7`    |
| `jsonfile`                               | `4.0.0`    |
| `jsonschema`                             | `1.5.0`    |
| `jwa`                                    | `2.0.1`    |
| `jws`                                    | `4.0.1`    |
| `kind-of`                                | `6.0.3`    |
| `lazystream`                             | `1.0.1`    |
| `lie`                                    | `3.3.0`    |
| `lodash.debounce`                        | `4.0.8`    |
| `lodash.defaults`                        | `4.2.0`    |
| `lodash.difference`                      | `4.5.0`    |
| `lodash.escaperegexp`                    | `4.1.2`    |
| `lodash.flatten`                         | `4.4.0`    |
| `lodash.groupby`                         | `4.6.0`    |
| `lodash.isboolean`                       | `3.0.3`    |
| `lodash.isequal`                         | `4.5.0`    |
| `lodash.isfunction`                      | `3.0.9`    |
| `lodash.isnil`                           | `4.0.0`    |
| `lodash.isplainobject`                   | `4.0.6`    |
| `lodash.isundefined`                     | `3.0.1`    |
| `lodash.union`                           | `4.6.0`    |
| `lodash.uniq`                            | `4.5.0`    |
| `macos-release`                          | `3.3.0`    |
| `matcher`                                | `3.0.0`    |
| `math-intrinsics`                        | `1.1.0`    |
| `media-typer`                            | `1.1.0`    |
| `merge-descriptors`                      | `2.0.0`    |
| `merge-stream`                           | `2.0.0`    |
| `mime-db`                                | `1.52.0`   |
| `mime-db`                                | `1.54.0`   |
| `mime-types`                             | `2.1.35`   |
| `mime-types`                             | `3.0.1`    |
| `mimic-fn`                               | `4.0.0`    |
| `minimist`                               | `1.2.8`    |
| `mkdirp`                                 | `0.5.6`    |
| `monaco-vscode-textmate-theme-converter` | `0.1.7`    |
| `ms`                                     | `2.1.3`    |
| `negotiator`                             | `1.0.0`    |
| `node-cache`                             | `5.1.2`    |
| `node-domexception`                      | `1.0.0`    |
| `node-ensure`                            | `0.0.0`    |
| `node-fetch`                             | `3.3.2`    |
| `normalize-path`                         | `3.0.0`    |
| `npm-run-path`                           | `5.3.0`    |
| `object-assign`                          | `4.1.1`    |
| `object-inspect`                         | `1.13.4`   |
| `object-keys`                            | `1.1.1`    |
| `ollama`                                 | `0.6.3`    |
| `on-finished`                            | `2.4.1`    |
| `one-time`                               | `0.0.4`    |
| `onetime`                                | `6.0.0`    |
| `os-name`                                | `6.1.0`    |
| `p-limit`                                | `7.3.1`    |
| `p-retry`                                | `4.6.2`    |
| `p-timeout`                              | `6.1.4`    |
| `p-wait-for`                             | `5.0.2`    |
| `parseurl`                               | `1.3.3`    |
| `partial-json`                           | `0.1.7`    |
| `path-is-absolute`                       | `1.0.1`    |
| `path-key`                               | `3.1.1`    |
| `path-key`                               | `4.0.0`    |
| `path-to-regexp`                         | `8.4.2`    |
| `pause-stream`                           | `0.0.11`   |
| `pdf-parse`                              | `1.1.4`    |
| `pkce-challenge`                         | `5.0.0`    |
| `pretty-bytes`                           | `7.0.0`    |
| `process-nextick-args`                   | `2.0.1`    |
| `proper-lockfile`                        | `4.1.2`    |
| `proxy-addr`                             | `2.0.7`    |
| `proxy-from-env`                         | `2.1.0`    |
| `ps-tree`                                | `1.2.0`    |
| `range-parser`                           | `1.2.1`    |
| `raw-body`                               | `3.0.2`    |
| `readable-stream`                        | `2.3.8`    |
| `readable-stream`                        | `3.6.2`    |
| `readdirp`                               | `4.1.2`    |
| `reconnecting-eventsource`               | `1.6.5`    |
| `require-from-string`                    | `2.0.2`    |
| `retry`                                  | `0.12.0`   |
| `retry`                                  | `0.13.1`   |
| `router`                                 | `2.2.0`    |
| `safe-buffer`                            | `5.1.2`    |
| `safe-buffer`                            | `5.2.1`    |
| `safe-stable-stringify`                  | `2.5.0`    |
| `safer-buffer`                           | `2.1.2`    |
| `say`                                    | `0.16.0`   |
| `section-matter`                         | `1.0.0`    |
| `semver-compare`                         | `1.0.0`    |
| `send`                                   | `1.2.0`    |
| `serialize-error`                        | `12.0.0`   |
| `serialize-error`                        | `7.0.1`    |
| `serve-static`                           | `2.2.0`    |
| `setimmediate`                           | `1.0.5`    |
| `shallow-clone`                          | `3.0.1`    |
| `shebang-command`                        | `2.0.0`    |
| `shebang-regex`                          | `3.0.0`    |
| `shell-quote`                            | `1.9.0`    |
| `side-channel`                           | `1.1.0`    |
| `side-channel-list`                      | `1.0.0`    |
| `side-channel-map`                       | `1.0.1`    |
| `side-channel-weakmap`                   | `1.0.2`    |
| `simple-git`                             | `3.36.0`   |
| `split`                                  | `0.3.3`    |
| `standardwebhooks`                       | `1.0.0`    |
| `statuses`                               | `2.0.2`    |
| `stream-combiner`                        | `0.0.4`    |
| `string_decoder`                         | `1.1.1`    |
| `string-width`                           | `4.2.3`    |
| `strip-ansi`                             | `6.0.1`    |
| `strip-bom`                              | `5.0.0`    |
| `strip-bom-string`                       | `1.0.0`    |
| `strip-final-newline`                    | `3.0.0`    |
| `supports-color`                         | `7.2.0`    |
| `supports-color`                         | `8.1.1`    |
| `tar-stream`                             | `2.2.0`    |
| `through`                                | `2.3.8`    |
| `tiktoken`                               | `1.0.22`   |
| `tmp`                                    | `0.2.7`    |
| `toidentifier`                           | `1.0.1`    |
| `ts-algebra`                             | `2.0.0`    |
| `type-is`                                | `2.0.1`    |
| `type-is`                                | `2.1.0`    |
| `underscore`                             | `1.13.8`   |
| `undici`                                 | `6.28.1`   |
| `undici-types`                           | `6.21.0`   |
| `universalify`                           | `0.1.2`    |
| `unpipe`                                 | `1.0.0`    |
| `unzipper`                               | `0.10.14`  |
| `util-deprecate`                         | `1.0.2`    |
| `uuid`                                   | `11.1.1`   |
| `uuid`                                   | `14.0.1`   |
| `vary`                                   | `1.1.2`    |
| `vscode-material-icons`                  | `0.1.1`    |
| `web-streams-polyfill`                   | `3.3.3`    |
| `web-tree-sitter`                        | `0.25.6`   |
| `whatwg-fetch`                           | `3.6.20`   |
| `windows-release`                        | `6.1.0`    |
| `wrap-ansi`                              | `7.0.0`    |
| `ws`                                     | `8.21.0`   |
| `ws`                                     | `8.21.3`   |
| `xmlbuilder`                             | `10.1.1`   |
| `xmlchars`                               | `2.2.0`    |
| `yocto-queue`                            | `1.2.2`    |
| `zip-stream`                             | `4.1.1`    |
| `zod`                                    | `3.25.76`  |

### MIT/X11 (2 packages)

| Package    | Version |
| ---------- | ------- |
| `chainsaw` | `0.1.0` |
| `traverse` | `0.3.9` |

### Unknown (4 packages)

| Package                | Version  |
| ---------------------- | -------- |
| `@mistralai/mistralai` | `1.15.1` |
| `ai-sdk-provider-poe`  | `2.0.18` |
| `buffers`              | `0.1.1`  |
| `map-stream`           | `0.1.0`  |

### Unlicense (3 packages)

| Package             | Version  |
| ------------------- | -------- |
| `big-integer`       | `1.6.52` |
| `fast-sha256`       | `1.3.0`  |
| `tree-sitter-wasms` | `0.1.13` |

### WTFPL (1 packages)

| Package               | Version |
| --------------------- | ------- |
| `truncate-utf8-bytes` | `1.0.2` |

### WTFPL OR ISC (1 packages)

| Package             | Version |
| ------------------- | ------- |
| `sanitize-filename` | `1.6.4` |

<!-- END GENERATED: js-dependencies -->

> Licences marked `Unknown` are packages whose `package.json` declares no
> licence; they are listed for completeness and reviewed before release.

---

## 4. How to regenerate this file

Run from the repository root (requires a `pnpm install` so `node_modules`
resolves; no network access is needed by the generator itself):

```bash
# 1. Refresh the generated JavaScript dependency table in place
node scripts/verify-third-party-notices.mjs --write

# 2. Keep the packaged copy in sync (the VSIX can only include files under src/)
cp THIRD-PARTY-NOTICES.md src/THIRD-PARTY-NOTICES.md

# 3. Verify the result (fails on a missing dependency or shipped component)
node scripts/verify-third-party-notices.mjs
pnpm test:scripts
```

The binary sections (§1, §2) are maintained by hand because their versions and
checksums are pinned deliberatively:

- DCG: bump `DCG_VERSION` and **both** checksums per platform in
  [`src/services/destructive-command-guard/constants.ts`](src/services/destructive-command-guard/constants.ts),
  re-copy the upstream archives into `src/bin/dcg/`, and update §1.1 — the
  procedure is in [`docs/DCG-RELEASE-GOVERNANCE.md`](docs/DCG-RELEASE-GOVERNANCE.md).
- Semble: keep §2.1 consistent with
  [`docs/SEMBLE-RELEASE-GOVERNANCE.md`](docs/SEMBLE-RELEASE-GOVERNANCE.md).

`scripts/verify-third-party-notices.mjs` additionally re-checks the pinned DCG
checksums against the archives on disk, so a swapped archive cannot sit
unnoticed next to a stale notices file.
