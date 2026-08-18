# ADR: Upgrade to Node.js v22 LTS

**Date**: 2026-07-27

**Status**: ✅ ACCEPTED

## Context

The project was using Node.js v20 LTS as the minimum engine requirement. Node.js v22 entered LTS status in October 2025, bringing several improvements relevant to the project:

- **Native `require(esm)`** — ESM modules can be `require()`d without --experimental-require-module flags
- **V8 12.4+** — Improved WebAssembly compilation, RegExp `v` flag support, and faster `Array`/`TypedArray` methods
- **`Array.fromAsync()`** — Natively available without polyfills
- **`fs.glob()`** — Native glob pattern matching, eliminating the need for `glob`/`fast-glob` packages in many cases
- **Stable `--run` flag** — Execute `package.json` scripts directly without `npm run`
- **Updated `npm` v10.9+** — Improved `overrides` handling and workspace support

The CLI package (`apps/cli`) and the VS Code extension packaging both benefit from the V8 performance improvements and reduced dependency footprint.

## Decision

**Option A: Upgrade engine requirement to `>=22.23.1`** — chosen over:

- **Option B: Stay on Node.js v20** — misses out on V8 performance gains and native features that reduce dependency count
- **Option C: Require Node.js v23+** — too aggressive; v23 has a faster cadence and shorter LTS overlap window

## Changes

### Package Configuration

- [`package.json`](../../package.json): Updated `engines.node` from `>=20.0.0` to `>=22.23.1`
- [`apps/cli/package.json`](../../apps/cli/package.json): Updated `engines.node` to `>=22.23.1`
- CI/CD workflow files updated to use Node.js 22.x

### CI/CD Impact

All CI workflows (GitHub Actions):

- `actions/setup-node@v4` with `node-version: 22` or `22.x`
- Prettier, ESLint, and TypeScript check steps verified against v22
- Build and test matrices updated to drop v20, add v22

### Relevant Dependencies

The following dependencies gained Node.js v22 native alternatives:

| Dependency  | Node.js v22 Alternative | Status          |
| ----------- | ----------------------- | --------------- |
| `fast-glob` | `fs.glob()`             | Still used      |
| `glob`      | `fs.glob()`             | Still used      |
| `rimraf`    | `fs.rmSync(recursive)`  | Can be replaced |

Full native alternatives were not adopted in this change; this ADR covers only the engine version bump.

## Consequences

### Positive

- V8 12.4+ performance improvements benefit all runtime operations
- Native `require(esm)` simplifies mixed CJS/ESM module handling
- Future dependency upgrades may reduce bundle size as native APIs replace packages
- CI pipelines run faster with newer V8 optimizations
- Alignment with VS Code's own Node.js v22 requirement (VS Code 1.96+)

### Negative

- Existing CI runners and developer machines must have Node.js 22 installed
- Projects using `nvm` or `fnm` need to update `.nvmrc` (done: `22.23.1`)
- Some developers on older OS versions (e.g., Ubuntu 20.04) may need to update their Node.js
- The `@vscode/ripgrep` v1.18.0 dependency also needed updating to support the new Node.js version

### Neutral

- Most existing code continues to work without changes — the upgrade is transparent to source code
- The minimum Node.js version for the VS Code extension host is determined by VS Code itself, not this project
