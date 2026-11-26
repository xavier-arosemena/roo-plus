# SYNC-23 CP2 — adversarial review (Red Team)

- **Subject:** branch `sync/sync-23-31-row-security-sweep`, review base `9bd179c88b`, HEAD `e87ea3a89d`
- **Commits under review:** `56e2d236f3` (C1.1), `e228cacd65` (C0.5), `e87ea3a89d` (C2)
- **Reviewer role:** CP2 red team — read-only audit of the execution, not of the authorised decisions (D1/D4/D5/D6)
- **Reviewer actions taken:** `git` / `read` / `execute` only. No commit, branch, push, or source edit. One throwaway
  detached worktree (`/tmp/cp2` at HEAD) was created for payload probes and removed; it never wrote to the branch.
- **Read-only caveat, disclosed:** the prescribed lint command
  `eslint --prune-suppressions` rewrites `src/eslint-suppressions.json` as a side effect. It fired once, produced
  **no count increase** (it pruned), and the file was restored with `git checkout --`. Final
  `git status --porcelain` on `/root/roo-plus` is **empty** and `HEAD` is still `e87ea3a89d`.
- **Date:** 2026-11-25

## 1. Orientation

**One-sentence restatement.** Close CP1's three conditions (an enforced `gray-matter` import boundary, the `----`
regression case, and two corrected sentences in the SYNC-23 record) in C1.1; hand-port upstream's one-line
`AvailableEmbedders` union into the gated `CORE_FILE` with the pre-commit hook bypassed in C0.5; and in C2 take
nine in-range dependency advisories plus seven zod array caps, without touching manifests beyond exact devDependency
pins, without introducing `pnpm.overrides`, and without flipping any register row.

**Assumption register (attacked below; authorised decisions are not re-litigated).**

| #   | Assumption                                                                                                                                   | Type                     |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| A1  | No CI path runs `prettier --check`, so an unformatted `embedder.ts` cannot turn `master` red                                                 | explicit claim (C0.5)    |
| A2  | `--no-verify` skipped nothing else material (the hook also runs `pnpm lint`)                                                                 | **unstated**             |
| A3  | `.max()` on a zod v3 array short-circuits before per-element issue accumulation                                                              | explicit claim (C2)      |
| A4  | The caps sit on the schemas that parse untrusted workspace content, and no legitimate artefact exceeds them                                  | explicit claim           |
| A5  | The caps are the D4 mitigation for the zod advisory (zod stays v3)                                                                           | authorised decision (D4) |
| A6  | The import guard catches "any default, namespace, require, dynamic, side-effect or re-export import"                                         | explicit claim (C1.1)    |
| A7  | The guard does not reject legitimate imports                                                                                                 | explicit claim (C1.1)    |
| A8  | The nine named packages are closed on the resolved lockfile; the two leftovers are exactly as described; no range widened, no override added | explicit claim (C2)      |
| A9  | The leftover set is complete: 35 close / 13 remain out of 48                                                                                 | explicit claim (C2)      |
| A10 | The two record corrections (C1.1) are factually right and nothing else in the record is now false                                            | explicit claim           |
| A11 | No row changed state; the new `**Numbers.**` paragraph does not flip a `D-LOCAL` row                                                         | explicit claim (C2)      |
| A12 | Hidden: if the caps do not mitigate, the alert bookkeeping still records that honestly                                                       | **unstated**             |

**Implied "this will work" claim:** the branch is gate-green, the frontmatter boundary is now mechanically enforced,
the upstream drift is gone "again", and the dependency sweep both closes the in-range advisories and blunts the
zod array-DoS without a v4 migration.

## 2. Verdict

**APPROVE WITH CONDITIONS.**

Nothing in the three commits turns CI red today and every scope/R5/register claim reproduces. But the central
technical claim of C2 — that the `.max()` caps mitigate the zod array-issue accumulation — is **false as
implemented** (F-01), and the C1.1 guard has two real escape shapes plus one false positive (F-02, F-04). C0.5's
`--no-verify` is justified as written (no CI format gate exists) but converts a one-off drift into a recurring trap
(F-03). All four are fixable in-branch in well under a screen of code.

## 3. Findings

| ID   | Finding                                                                                                                                                                                            | Severity | S×L×D      | Evidence                                  |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------- | ----------------------------------------- |
| F-01 | zod v3 `.max()` does **not** short-circuit: it adds one `too_big` issue and still walks every element. `customModes` amplifies 4 issues per invalid mode; `mcpServers`/`env` are not capped at all | MAJOR    | 4×3×3 = 36 | CONFIRMED (measured)                      |
| F-02 | The import guard misses a multi-line default import and a `node:module` `createRequire`-mediated `require`                                                                                         | MAJOR    | 3×2×4 = 24 | CONFIRMED (probed)                        |
| F-03 | `embedder.ts` is not prettier-3.8.4-clean; the husky `lint-staged` hook rewrites it on the next routine edit and re-breaks the alignment gate. `--no-verify` deferred the failure                  | MAJOR    | 3×4×2 = 24 | CONFIRMED                                 |
| F-04 | The guard rejects `import { type X } from "gray-matter"` — a legitimate type-only import (false positive)                                                                                          | MINOR    | 2×3×1 = 6  | CONFIRMED (probed)                        |
| F-05 | C1.1's own SYNC-23 evidence lines still say "141 tests"; the suite is **143** after the same commit added two cases                                                                                | MINOR    | 2×5×1 = 10 | CONFIRMED                                 |
| F-06 | The "13 remain" list omits `glob` (moderate, patched `>=14.0.2`, resolved `11.1.0` via override); the 48/35/13 split is not reproducible without the Dependabot API                                | MINOR    | 2×3×3 = 18 | CONFIRMED (audit) / CANNOT VERIFY (split) |
| F-07 | The published `schemas/roomodes.json` does not expose the 512 `customModes` cap (generator builds its own array schema), so the contract says "unbounded" while runtime rejects `>512`             | NIT      | 1×3×2 = 6  | CONFIRMED                                 |
| F-08 | The guard scans only `src/`; `packages/`, `apps/`, `webview-ui/`, `scripts/` are out of scope (currently clean)                                                                                    | NIT      | 2×2×3 = 12 | CONFIRMED                                 |

### F-01 (MAJOR) — the caps do not bind where the CVE bites

zod v3's array parser checks `maxLength`, calls `addIssueToContext` + `status.dirty()`, and then **falls through to
the element loop** ([`types.js:1788`](../../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/types.js:1788) →
[`types.js:1808`](../../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/types.js:1808)). Measured in a throwaway
worktree at HEAD, writing results to a file (via `vitest run` against the real exported schemas):

```
{"label":"raw z.array(z.string()).max(256), 50k numbers","issues":50001,"ms":52}
{"label":"raw z.array(z.string()).max(256), 50k strings (valid)","issues":1,"ms":23}
{"label":"roomodes.customModes 50k invalid modes","issues":200001,"ms":452}
{"label":"roomodes.customModes 200k invalid modes","issues":800001,"ms":1591}
{"label":"McpHub stdio explicit, 50k number args","issues":1,"ms":53}          // masked by the z.union's invalid_union
{"label":"z.record(ServerConfigSchema) with 5k invalid servers","issues":5000,"ms":344}
```

Reading:

- The cap controls **one** outcome only: a _valid_ array that is too long yields exactly one issue
  (`customModes` at 513 valid → `1` issue). That is the case the new specs pin
  ([`mode-array-caps.spec.ts:18`](../../../packages/types/src/__tests__/mode-array-caps.spec.ts:18) and
  [`serverConfigCaps.spec.ts:23`](../../../src/services/mcp/__tests__/serverConfigCaps.spec.ts:23) both feed **valid**
  elements). The advisory's vector — many _invalid_ elements — is untouched.
- `customModes` is worse than a bare array: each invalid mode object yields 4 issues (slug/name/roleDefinition/groups),
  so 200 000 elements → **800 001** issue objects in 1.6 s, with a `path` array on each. Memory, not just CPU.
- The two collections that carry the same amplification inside the same untrusted files are **uncapped**:
  [`McpHub.ts:161`](../../../src/services/mcp/McpHub.ts:161) `mcpServers: z.record(ServerConfigSchema)` and
  [`McpHub.ts:111`](../../../src/services/mcp/McpHub.ts:111) `env: z.record(z.string())`.
- The `McpHub` leaf caps _look_ effective in the probe (`issues: 1`) only because `ServerConfigSchema` is a
  `z.union`, which reports one `invalid_union` issue at the top; the 50 000 per-element issues are still allocated
  and discarded internally (identical 52–53 ms cost to the raw array).

So the commit message's "zod mitigation" and the code comments' "zod parsing DoS caps" describe a property the code
does not have. This is not a regression (the DoS pre-exists), and the alert bookkeeping is honest (the 5 zod alerts
stay open, zod v4 deferred), which is why I rank it MAJOR rather than BLOCKER. It becomes a BLOCKER the moment anyone
records "the array-DoS is mitigated by caps".

### F-02 (MAJOR) — two guard escapes

Probed by dropping one fixture file per shape under `src/__probe__/` in the worktree and running the real spec
([`safeFrontmatterImportGuard.spec.ts:177`](../../../src/utils/__tests__/safeFrontmatterImportGuard.spec.ts:177)):

```
caught:    a_default.ts            default import (gm)
caught:    b_namespace.ts          namespace import (* as m)
caught:    c_require.ts            require()
caught:    d_dynamic.ts            await import()
caught:    e_reexport.ts           export { default } from
caught:    f_sideeffect.ts         import "gray-matter"
caught:    i_import_equals.ts      import matter = require(...)
NOT caught: g_newline_default.ts   import matter \n  from "gray-matter"
NOT caught: j_createrequire.ts     createRequire(...) then req("gray-matter")
NOT caught (correctly): k_named_ok.ts        import { stringify } ...
```

Both misses are structural, not cosmetic:

- **Multi-line default import.** The `from "gray-matter"` line does not start with `}`/`,` so
  [`statementAt()`](../../../src/utils/__tests__/safeFrontmatterImportGuard.spec.ts:64) returns it alone; the
  classifier sees no `import`/`export`/`require` token and returns "not a module statement". Prettier would
  normally collapse it — but this very branch shipped two commits that bypass that hook.
- **`node:module`-mediated require.** `const m = req("gray-matter")` contains no `require(` token, so it is never
  classified. `createRequire` is the standard way to reach a CJS package from ESM.

Note the default-deny fallback is otherwise good: `import gm from "gray-matter/x.js"` and a backtick specifier both
land in "unrecognised gray-matter import form" → forbidden. The holes are only the two shapes above.

### F-03 (MAJOR) — `--no-verify` is justified, and it installs a recurring trap

The claim is **true**: no CI path runs prettier.

```
grep -rn -E "pnpm (lint|gate|format|check)|prettier|turbo (lint|format)" .github/workflows/
  → only .github/workflows/code-qa.yml:303  run: pnpm lint        (= turbo → eslint only)
  → only .github/workflows/code-qa.yml:305  run: pnpm check-types
grep -rln -i "prettier" --include="eslint.config.*" .
  → (none)          # no eslint-plugin-prettier anywhere
```

`src/package.json` `lint` is `eslint . --ext=ts --max-warnings=0`; root `format` is `turbo format` (a writer, never
invoked by CI). So C0.5 alone cannot redden `master`. Confirmed the exact failure it avoids:

```
npx prettier --version            → 3.8.4
npx prettier --check src/services/code-index/interfaces/embedder.ts
  → [warn] src/services/code-index/interfaces/embedder.ts — exit 1
  (re-expands lines 32-38: the union the alignment gate requires to be one line)
```

The seam: [`.husky/pre-commit`](../../../.husky/pre-commit:38) runs `npx lint-staged`, whose config is
`prettier --write` on `*.{js,jsx,ts,tsx,json,css,md}`. The **next** normal commit that touches `embedder.ts` silently
re-expands the union and re-reddens `gate:sync` step 2 / the `code-qa` alignment job. `--no-verify` also skipped the
hook's `pnpm lint`; I ran it and it is clean (`eslint exit 0` on all seven changed `src` files), so nothing was hidden.

### F-04 (MINOR) — the guard's inline-`type` false positive

`import { type GrayMatterFile } from "gray-matter"` was flagged as `imports GrayMatterFile from the module object`.
The brace branch strips `type ` only to normalise the _name_, then checks it against `ALLOWED_NAMED_BINDINGS`
(`{"stringify"}`) — so any inline type specifier is rejected. `import type { … }` (the whole-clause form) is
otherwise handled. A legitimate type-only import now fails CI.

### F-05 (MINOR) — the record's own test count is stale in the same commit

```
cd src && npx vitest run utils/__tests__/safeFrontmatter.spec.ts \
  services/command/__tests__/frontmatter-commands.spec.ts services/skills/__tests__/SkillsManager.spec.ts
  → Tests 143 passed (143)
```

[`SYNC-23.md`](../../../docs/upstream-sync/resolutions/SYNC-23.md:39) and
[`SYNC-23.md`](../../../docs/upstream-sync/resolutions/SYNC-23.md:74) still say "141 tests pass across the three
specs" — written by C1.1, which itself added the two `----` cases that make it 143. Same defect class as CP1 F-07,
in the commit that exists to fix a record's accuracy.

### F-06 (MINOR) — the leftover list is incomplete

`pnpm audit --audit-level=low --json` against the **post-change** lockfile returns **8 advisories / 9 finding
instances / 7 modules** (2 low, 6 moderate, 1 high):

| module                   | sev      | instances | patched    | resolved          | in the report? |
| ------------------------ | -------- | --------- | ---------- | ----------------- | -------------- |
| `zod`                    | high     | 1         | `>=4.6.6`  | `3.25.76`         | yes (5 alerts) |
| `i18next`                | moderate | 1         | `>=26.3.4` | `25.2.1`          | yes (3 alerts) |
| `minimatch`              | moderate | 2         | `>=11.0.1` | `10.2.5`, `9.0.9` | yes (1 alert)  |
| `katex`                  | low      | 1         | `>=0.18.2` | `0.16.47`         | yes (2 alerts) |
| `@vitest/mocker`         | moderate | 2         | `>=4.1.12` | `4.1.11`          | yes (1 alert)  |
| `@ai-sdk/provider-utils` | low      | 1         | `>=4.0.33` | `4.0.14`          | yes (1 alert)  |
| **`glob`**               | moderate | **1**     | `>=14.0.2` | `11.1.0`          | **no**         |

`glob` is pinned by the `overrides` block and is therefore unclosable without an override change (which D4 forbids) —
the executor was right not to touch it, but the paragraph in
[`pending-upstream-commits.md:384`](../../../docs/upstream-sync/pending-upstream-commits.md:384) presents the
leftover list as the complete complement. Also worth stating plainly: `pnpm audit --audit-level=high` still exits 1
(the zod HIGH), so the `audit-dependencies` CI job is red on this branch exactly as it was on `master` — pre-existing
and documented in the runbook, not introduced here.

I **cannot verify** the 48 open / 35 close / 13 remain split: it is a Dependabot-API artefact and there is no alert
inventory in-repo. The arithmetic is internally consistent (5+3+1+2+1+1 = 13; 48−13 = 35), and the nine claimed
closures are genuinely gone from `pnpm audit`; `glob` is the one module the enumeration misses.

### NITs

- **F-07:** [`schemas/roomodes.json`](../../../schemas/roomodes.json:4) carries `maxItems: 256` on `allowedMcpServers`
  (from `modeConfigSchema`) but no `maxItems: 512` on the top-level `customModes` array.
  [`roomodes-schema.ts:45`](../../../packages/types/src/roomodes-schema.ts:45) builds its own
  `z.array(exportedModeConfigSchema)` without the `.max()`, so
  [`roomodes-schema-sync.spec.ts`](../../../packages/types/src/__tests__/roomodes-schema-sync.spec.ts:1) passes and
  there is **no drift** — but the published contract silently disagrees with runtime for >512 modes.
- **F-08:** [`safeFrontmatterImportGuard.spec.ts:21`](../../../src/utils/__tests__/safeFrontmatterImportGuard.spec.ts:21)
  roots the scan at `src/`. `grep -rn "gray-matter" packages apps webview-ui scripts` is currently empty, so today's
  coverage is complete; the boundary is nevertheless `src`-shaped, and files under `dist/out/coverage/node_modules`
  are skipped by design.

## 4. Claim audit — what reproduced, what did not

| Executor claim                                      | Command                                                                                                                                                                                             | Result                                                                                                                                       |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "nothing in the gate chain runs `prettier --check`" | workflow/script/config greps above; `prettier --check embedder.ts`                                                                                                                                  | ✅ true (exit 1 for the file, but nothing runs it)                                                                                           |
| `gate:sync` passes                                  | `pnpm gate:sync`                                                                                                                                                                                    | ✅ **11 steps**, `every gate passed (11 step(s))`; 767/767 scripts tests; 2274 files integrity                                               |
| C0.5 is one file, one hunk                          | `git show --stat e228cacd65`                                                                                                                                                                        | ✅ 1 file, +1/−8, single hunk                                                                                                                |
| `embedder.ts` matches upstream                      | `git diff --stat upstream/main HEAD -- …/embedder.ts`                                                                                                                                               | ✅ empty                                                                                                                                     |
| `CORE_FILES` untouched                              | `git diff --name-only 9bd179c88b...HEAD \| grep verify-upstream-code-index-alignment`                                                                                                               | ✅ untouched                                                                                                                                 |
| caps short-circuit before accumulation              | oversized-payload probes (F-01)                                                                                                                                                                     | ❌ **false** — O(n) issues remain                                                                                                            |
| no legitimate artefact exceeds a cap                | `.roomodes` = **90** slugs; `.roo/mcp.json` = `{"mcpServers":{}}`; `allowedMcpServers` appears in **zero** custom-modes YAML; docs examples are tiny                                                | ✅                                                                                                                                           |
| caps on the untrusted parse path                    | [`CustomModesManager.ts:310`](../../../src/core/config/CustomModesManager.ts:310) and `:421` call `customModesSettingsSchema.safeParse`; `McpHub.ts:356/443/575` call `McpSettingsSchema.safeParse` | ✅ (but see F-01: `mcpServers` record itself is uncapped)                                                                                    |
| schema regeneration matches source                  | `cd packages/types && npx vitest run src/__tests__/roomodes-schema-sync.spec.ts`                                                                                                                    | ✅ 1/1 pass (see F-07 for what it does not cover)                                                                                            |
| nine packages closed at the resolved version        | `pnpm audit` — hono/@hono/node-server/ip-address/fflate/qs/fast-uri/smol-toml/serialize-javascript/@humanfs/node all absent                                                                         | ✅                                                                                                                                           |
| `provider-utils` pinned to exactly `4.0.14`         | `pnpm-lock.yaml` — `@ai-sdk/anthropic@3.0.42` → `4.0.14`, `@ai-sdk/openai@3.0.27` → `4.0.14`                                                                                                        | ✅ (a second instance `4.0.35` exists via `@ai-sdk/gateway` / `openai-compatible`, not named)                                                |
| `@vitest/mocker` 4.1.11, advisory wants 4.1.12      | `pnpm audit` — `>=2.1.0-beta.7 <4.1.12`, patched `>=4.1.12`; resolved `4.1.11`                                                                                                                      | ✅                                                                                                                                           |
| companion vitest pins "moved in lockstep"           | lockfile peers `@vitest/coverage-v8@4.1.11(vitest@4.1.11)`, `@vitest/ui@4.1.11(vitest@4.1.11)`                                                                                                      | ✅ **necessary**, not creep — the peer graph is keyed to the exact vitest version                                                            |
| no manifest range widened                           | `git diff … -- '**/package.json'` — exact `"4.1.9"` → `"4.1.11"` pins only                                                                                                                          | ✅                                                                                                                                           |
| no `pnpm.overrides` added or relaxed                | overrides live in `pnpm-workspace.yaml`; `git diff 9bd179c88b...HEAD -- pnpm-workspace.yaml` → **empty**                                                                                            | ✅                                                                                                                                           |
| register: 22 `☑`, 6 `◐`, no row flipped             | `grep -c "                                                                                                                                                                                          | ☑"`/`"                                                                                                                                       | ◐"`at HEAD vs`8ebb58d21a`; `git diff 8ebb58d21a..HEAD -- pending-upstream-commits.md` | ✅ 22/6 unchanged; the only register delta is the `**Numbers.**` paragraph; `node scripts/upstream-sync-triage.mjs --verify` → `rows=427 … synced=22 missing=0`, green |
| no R5 path, no changeset, no version bump           | `git diff --name-only 9bd179c88b...HEAD`                                                                                                                                                            | ✅ no `CHANGELOG*`, no `.github/**`, no `locales/*/README.md`, no `.coderabbit*`, no `.changeset/`; `src/package.json` `"version"` unchanged |
| record corrections true                             | `git show e3de60a7c:…/SkillsManager.spec.ts \| grep mockSymlinks` → lines 44/731/817; `grep -n harness.enoent` → 1844/1855/1856; TLA line now says "no gate runs TLC"                               | ✅ both corrections are right; F-05 is the new inaccuracy                                                                                    |
| lint clean, suppressions not increased              | `eslint --prune-suppressions --max-warnings=0` on 7 `src` files + 2 `packages/types` files                                                                                                          | ✅ exit 0 both; `git diff -- src/eslint-suppressions.json` empty; `eslint.config.mjs` untouched                                              |
| F-02 regression case                                | `git show 56e2d236f3 -- src/utils/__tests__/safeFrontmatter.spec.ts`                                                                                                                                | ✅ asserts `content` preserved, `data === {}`, payload not executed                                                                          |

## 5. Weakest link and seams

**Weakest link: F-01 — a mitigation that reads as closed but is measurably inert.** Every other number in this
batch reproduced; this one is the only place where the report and the code disagree about what the code _does_.

**Seams most likely to break first**

1. **`mode.ts`/`McpHub.ts` caps ↔ zod v3 semantics.** Someone will read "DoS caps" in the record and assume the
   advisory is bounded. It is not, for any oversized _invalid_ payload, and the top-level `mcpServers`/`env` records
   are not capped at all.
2. **`embedder.ts` ↔ the husky `lint-staged` prettier step.** Two formatters (fork 3.8.4, upstream 3.9.10) disagree
   over one union; the only thing keeping them apart is a human remembering `--no-verify`.
3. **`safeFrontmatterImportGuard.spec.ts` ↔ real import syntax.** A regex scanner is being asked to be a parser. It
   already misses two valid shapes and rejects one legitimate one.

## 6. Counter-proposals

**F-01 — make the bound bind, or stop calling it a mitigation (recommended: (a) + (c) wording).**

- **(a) MITIGATE, ~15 lines:** a length pre-check _before_ `safeParse` at the three entry points —
  [`CustomModesManager.ts:310`](../../../src/core/config/CustomModesManager.ts:310),
  [`CustomModesManager.ts:421`](../../../src/core/config/CustomModesManager.ts:421) and the `McpSettingsSchema` reads
  at [`McpHub.ts:356`](../../../src/services/mcp/McpHub.ts:356)/`:443`/`:575`. Check
  `customModes.length`, `Object.keys(mcpServers).length`, and the leaf arrays and return the same user-facing schema
  error without parsing. Cost: trivial; risk: none for valid input; it actually removes the O(n) walk. Add one
  invalid-element case per schema to the two new specs so the property is pinned (today both feed valid elements).
- **(b) REDESIGN:** a shared `boundedArray(schema, max)` / `boundedRecord(schema, max)` helper built on
  `z.preprocess` that aborts (`ctx.addIssue` + a sentinel, or a thrown `ZodError`) before the array/record is
  entered; migrate the seven sites onto it so the guarantee is expressed once.
- **(c) ACCEPT:** keep the caps as _product limits_ — they do bound the valid-and-oversized case and give a clean
  error — and correct the commit message, the two code comments and the record sentence to say exactly that. The
  CVE remains open pending the zod v4 migration, which the register already records.

**F-02/F-04 — replace the regex tripwire with a parser (recommended: (b)).**

- **(a) MITIGATE:** teach `statementAt()` to walk up to the nearest `import`/`export` line regardless of the
  continuation shape, and add a whole-file rule: if a file contains `/["'\`]gray-matter["'\`]/`and is not`safeFrontmatter.ts`, allow **only** the exact `import { stringify } from "gray-matter"`form. Also strip inline`type` specifiers in the brace branch. Cost: ~20 lines; risk: over-broad matching (mitigated by default-deny).
- **(b) REDESIGN:** put `no-restricted-imports` (paths: `gray-matter`) plus a `no-restricted-syntax` selector for
  `CallExpression[callee.name=/require|createRequire/]` into [`src/eslint.config.mjs`](../../../src/eslint.config.mjs:1),
  overridden off for `safeFrontmatter.ts` (and `SkillsManager.ts` if the named import is kept). That is a real
  parser, runs on every push via `pnpm lint`, and needs no bespoke text scanning. Keep the spec as a cheap
  belt-and-braces check if desired.
- **(c) ACCEPT:** describe the guard as an "accident tripwire, not a security boundary" — defensible only if the
  commit's "enforces" wording is dropped.

**F-03 — defuse the formatter trap (recommended: (a)).**

- **(a) MITIGATE:** add `src/services/code-index/interfaces/embedder.ts` (or the `src/services/code-index/**` tree) to
  `.prettierignore`. The alignment gate already owns that file; prettier should not. One line, no upstream coupling.
- **(b) REDESIGN:** move the fork's prettier to the version upstream uses. Out of scope for this batch and it would
  reformat the tree — do not attempt inside a sync batch.
- **(c) ACCEPT:** document "use `--no-verify` when touching `CORE_FILE`s" in the runbook, with the alignment gate as
  the backstop. Acceptable only alongside (a)-style relief, because the failure lands on the next author, not this
  one.

**F-05/F-06 — make the record true (recommended: (a), in this PR).** Change `141` → `143` in the two SYNC-23 evidence
lines; add `glob 11.1.0 (patched >=14.0.2; override-pinned, not closable under D4)` to the `**Not closed:**` list and
state that the 48/35/13 split is a Dependabot-API figure. Cost: minutes; risk: none.

## 7. Final verdict

**APPROVE WITH CONDITIONS.**

- **Approved on the merits:** `gate:sync` green at **11/11** steps; `embedder.ts` byte-identical to `upstream/main`
  with `CORE_FILES` untouched; nine dependency advisories genuinely closed on the resolved lockfile with no widened
  range and no override change; the vitest companion bump is a peer-graph necessity, not creep; `.max()` caps land
  above every real artefact (90 curated modes, empty `.roo/mcp.json`); the `----` regression case is real and
  well-aimed; both C1.1 record corrections are factually right; register 22 `☑` / 6 `◐` unchanged with `--verify`
  green; scope clean of R5 paths, changesets and version bumps; lint and suppression counts clean.
- **Conditions before merge:**
    1. Resolve F-01: either make the caps actually bound the parse of invalid input (and add an invalid-element case to
       each new spec), or restate the claim as "product limit, CVE still open pending zod v4" in the commit message,
       both code comments and the register `**Numbers.**` paragraph.
    2. Resolve F-02/F-04: close the multi-line and `createRequire` holes and the inline-`type` false positive —
       preferably by moving the rule into ESLint.
    3. Resolve F-03: keep `embedder.ts` out of prettier's path so the next routine edit cannot re-break gate step 2.
    4. Correct F-05 (`141` → `143`) and F-06 (`glob`).
- **No BLOCKER.** Nothing in the three commits breaks a gate today; the false claim in F-01 is a documentation-grade
  defect with a real security consequence only if it is believed.
- **Strongest attack I attempted, and why it survived:** I tried to prove C0.5 reddens `master` by finding a
  prettier/format check in CI. It does not exist — no workflow, no `package.json` script that CI runs, no
  `eslint-plugin-prettier` in any of the nine ESLint configs — so the `--no-verify` decision is sound as written.
  The attack that _did_ land was the opposite of the reported claim: the zod caps, which are the batch's only
  security-property change, do not change the security property.
