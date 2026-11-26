# SYNC-23 CP4 — final adversarial review (Red Team)

- **Subject:** branch `sync/sync-23-31-row-security-sweep`, declared review base `9bd179c88b`, tip `5ced1d523a`
- **Reviewer role:** CP4 final gate before push. Read-only audit: no commit, branch, rebase, push, or source/register/record edit.
- **Reviewer actions taken:** `git` / `read` / `execute` only. Two detached throwaway worktrees (`/tmp/cp4tsc`, `/tmp/cp4probe`) were created, used, and removed; neither ever wrote to the branch. The only tracked-tree write is this report.
- **Read-only caveat, disclosed:** the probe fixtures (`src/__probe__/*.ts`, 14 files) were created **only inside `/tmp/cp4probe`**, never in `/root/roo-plus`. Final `git status --porcelain` on `/root/roo-plus` shows one entry — the still-untracked CP2 report (see F-02).
- **Date:** 2026-11-26

## 0. Two corrections to the review request itself

1. **The range is 26 commits, not 7.** `git rev-list --count 9bd179c88b..HEAD` → `26`. There is no 7-commit prefix/suffix of this range that contains 5 non-doc commits: the last 7 commits (`de2ec1870b..HEAD`) contain 4 code-bearing commits, and the whole range contains **20** commits that touch `.ts/.tsx` (19 under `src/`, `packages/`, `webview-ui/`, `scripts/`, plus `971115ca66` under `apps/cli/`). I therefore bisected **every code-bearing commit in the full range**, which is a superset of what was asked.
2. **"every `✖` has an attributable rationale naming its own SHA" is not the register's design.** 33 of the 38 `✖` rows (all `D-LOCAL`) carry a bare `✖` in the Status cell and `—` in every explanatory column; their rationale is the `D-LOCAL` class deferred to the batch/README rationale block, and [`upstream-sync-triage.mjs`](scripts/upstream-sync-triage.mjs:1237) documents exactly that ("the register … has no per-row rationale column by design"). Only the 5 new `✖` rows name their own SHA — and all 5 do. See F-05.

## 1. Orientation

**One-sentence restatement.** Land the SYNC-23 "row/security sweep": 239 newly registered upstream rows (188 → 427) plus a 22-commit cherry-pick chain (frontmatter RCE hardening, skills symlinks, locale lazy-loading, nanogpt tool parameters, CLI prompt escaping, vscode-lm models, webview/CI chores), one dependency-lockfile regeneration with zod array caps and a pre-parse length gate, a 13-alert Code-scanning dismissal pass with 9 code fixes, and an enforced `gray-matter` import boundary — all recorded in [`pending-upstream-commits.md`](docs/upstream-sync/pending-upstream-commits.md:1) and [`SYNC-23.md`](docs/upstream-sync/resolutions/SYNC-23.md:1).

**Assumption register.**

| #   | Assumption                                                                                                              | Type          | Result                                   |
| --- | ----------------------------------------------------------------------------------------------------------------------- | ------------- | ---------------------------------------- |
| A1  | Every commit in the range type-checks at its own tip (bisect safety)                                                    | explicit      | **CONFIRMED**                            |
| A2  | Register arithmetic is 22 `☑` / 351 `☐` / 16 `◐` / 38 `✖` = 427 and no row was silently reclassified                    | explicit      | **CONFIRMED**                            |
| A3  | Every `◐` points at a real fork commit carrying `cherry picked from` (or a declared `Local-fix`)                        | explicit      | **CONFIRMED**                            |
| A4  | The `SkillsManager.ts` fork divergence is exactly as the record describes, and the inventory is complete                | explicit      | **CONFIRMED**                            |
| A5  | The `1165aebc8` graft is content-complete, so `◐` is honest rather than "partial"                                       | explicit      | **CONFIRMED**                            |
| A6  | The `f8aa881c5` omission is exactly the three harness files, for the stated reason, and is recorded                     | explicit      | **CONFIRMED (reason text wrong — F-04)** |
| A7  | The `gray-matter` boundary catches default/multiline/`require`/dynamic/`createRequire` and still allows `{ stringify }` | explicit (P0) | **CONFIRMED**                            |
| A8  | Security-tab numbers are true (9 open / 13 dismissals / #119 open / 48 Dependabot)                                      | explicit      | **CONFIRMED, one count drift (F-06)**    |
| A9  | Scope is clean: no CHANGELOG, no version bump, no `.changeset`, no `.github/**`                                         | explicit      | **CONFIRMED**                            |
| A10 | Hidden: merging this branch at `3.89.5` can publish                                                                     | **unstated**  | **FALSE — F-01 (BLOCKER)**               |
| A11 | Hidden: the CP1/CP2 gate evidence is in the branch history                                                              | **unstated**  | **FALSE — F-02**                         |

**Implied "this will work" claim:** pushing this branch is safe, the register is honest, and a subsequent merge to `master` will release the sweep without further intervention.

## 2. Verdict

**APPROVE WITH CONDITIONS.**

The technical content is sound and, unusually for a sweep this size, every number I was asked to check reproduced: 26/26 commits (all 20 code-bearing ones) type-check at their own tip, the register is arithmetically exact with only three row-level changes (all explained), both `--verify` profiles pass, the divergence claim is byte-exact, the guard catches every shape I could construct, and gate step 2 — CP1's `D5` red — is now green.

One thing blocks a _merge_ (not a push): `src/package.json` is still at **`3.89.5`, which is already the published `latest` on Open VSX**, so the pre-release guard will exit non-zero on the first push to `master`. That is a one-command fix (`pnpm bump:pre-release`) but it must happen before the merge, not after.

## 3. Findings

| ID   | Finding                                                                                                                                           | Severity | S×L×D      | Evidence                                   |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------- | ------------------------------------------ |
| F-01 | `src/package.json` is `3.89.5`, already published on Open VSX; the publish guard's `patch <= maxPatch` check fails closed                         | BLOCKER  | 4×5×1 = 20 | CONFIRMED (API + guard)                    |
| F-02 | The CP2 review report is untracked; the gate chain's CP2 evidence is not in the branch                                                            | MAJOR    | 3×4×2 = 24 | CONFIRMED                                  |
| F-03 | The `f8aa881c5` omission is not recorded in the SYNC-23 record (Notes); only the commit body and the row's `Blocked-by` cell carry it             | MAJOR    | 3×4×2 = 24 | CONFIRMED                                  |
| F-04 | `ec8f283d31`'s splice note says all three omitted files "are created by `8f7f48ad5`"; two were created by `fec4e1353` and only modified by it     | MINOR    | 2×5×1 = 10 | CONFIRMED                                  |
| F-05 | The `1165aebc8` row flipped `✖ → ◐` and dropped the superseded "predecessor `1ad8f528d` is X-REJECT" rationale; `Blocked-by` is now `—`           | MINOR    | 2×4×2 = 16 | CONFIRMED                                  |
| F-06 | Dependabot "not closed" list does not match the API: `glob` has 0 open alerts (doc says 1), `@vitest/mocker` has 2 (doc implies 1)                | MINOR    | 2×3×3 = 18 | CONFIRMED (API) / CANNOT VERIFY post-merge |
| F-07 | The register's `✖` rationale invariant is weaker than the review brief assumes (33 `D-LOCAL` rows defer to class, not to a SHA)                   | NIT      | 1×5×2 = 10 | CONFIRMED                                  |
| F-08 | [`.prettierignore`](.prettierignore:18) gains an `embedder.ts` exemption — an undeclared scope addition (justified inline, but not dispositioned) | NIT      | 1×4×2 = 8  | CONFIRMED                                  |
| F-09 | Guard residual bypass: `require("gray-" + "matter")` / a substituted template literal is invisible to the pre-filter                              | NIT      | 2×1×4 = 8  | CONFIRMED (probed)                         |
| F-10 | The guard scans only `src/`; `packages/`, `apps/`, `webview-ui/`, `scripts/` remain out of scope (currently clean)                                | NIT      | 2×2×3 = 12 | CONFIRMED (carried from CP2 F-08)          |

### F-01 (BLOCKER) — the merge cannot publish at the committed version

```
node -e 'console.log(require("./src/package.json").version)'          # 3.89.5
curl -s https://open-vsx.org/api/xavier-arosemena/roo-plus | jq -r .version   # 3.89.5 (== latest)
git show 9bd179c88b:src/package.json | grep '"version"'               # 3.89.5 (unchanged in range)
```

[`.github/workflows/pre-release-publish.yml`](.github/workflows/pre-release-publish.yml:389) contains:

```
if (patch <= maxPatch) { error(…bump to the next patch (pnpm bump:pre-release)); process.exit(1) }
```

`maxPatch` on the `3.89.x` line is 5. Merging this branch to `master` pushes a `3.89.5` build into that guard and it exits 1. Detectability is trivial (the workflow is red immediately), which is why severity is bounded — but the release does not go out, so this must be fixed **before** the merge, not treated as a follow-up.

### F-02 (MAJOR) — half the gate chain's evidence is untracked

```
git status --porcelain
?? docs/reviews/2026-11-25-sync23-cp2-red-team.md
git log --all --oneline -- docs/reviews/2026-11-25-sync23-cp2-red-team.md   # (empty)
git log --oneline -1 -- docs/reviews/2026-11-24-sync23-cp1-red-team.md      # 56e2d236f3 (tracked)
```

The CP1 report is in history; the CP2 report is not, and the CP4 report (this file) will not be either unless someone commits it. The branch is being pushed as the audit trail of a security sweep whose central claim (`F-01` of CP2, the zod caps, was _wrong_ and corrected in `fb0734edb0`) is only documented in that untracked file. A reader of `master` a year from now sees the correction but not the review that found it.

### F-03 (MAJOR) — the `f8aa881c5` omission lives only in a commit body

```
grep -n 'f8aa881c5\|2267\|ec8f283d31' docs/upstream-sync/resolutions/SYNC-23.md   # no hits
sed -n '1098p' docs/upstream-sync/pending-upstream-commits.md
| `f8aa881c5` | … | ◐ ec8f283d31 | `fec4e1353`, `8f7f48ad5` | — | — | — |
```

The row's `Blocked-by` cell names both prerequisite commits (correct — see below), and `ec8f283d31`'s body explains the partial pick in detail. But the SYNC-23 _record_ — the file the runbook designates as the resolution of record — says nothing, and the Status cell says `◐` with no qualifier. For a row whose upstream commit touched 10 files and landed 7, "partial" is materially different from "adapted", and the reviewer's stated control ("the omission is recorded in the row and Notes") is only half true.

### F-04 (MINOR) — the splice note misattributes two of three omitted files

```
git log --all --diff-filter=A --format='%h %s' -- webview-ui/playwright/AppProviders.tsx
fec4e13530 [Improve] Keep shared controls legible across IDE themes (#1333)
git log --all --diff-filter=A --format='%h %s' -- webview-ui/src/components/settings/__tests__/UISettings.visual.fixture.tsx
fec4e13530 …
git log --all --diff-filter=A --format='%h %s' -- webview-ui/playwright/gallery/stories.tsx
8f7f48ad57 [Chore] Add Extension Host visual regression coverage (#1426)
git show --name-status --format="" 8f7f48ad5 | grep -E 'AppProviders|stories\.tsx|UISettings\.visual'
M  webview-ui/playwright/AppProviders.tsx
A  webview-ui/playwright/gallery/stories.tsx
M  webview-ui/src/components/settings/__tests__/UISettings.visual.fixture.tsx
```

Only `stories.tsx` is _created_ by `8f7f48ad5`; the other two are created by `fec4e1353` (a `C-REIMPLEMENT` row, not E-SKIP) and merely modified by `8f7f48ad5` (an `E-SKIP` row). The decision is still right — none of the three exists in the fork — and the row's `Blocked-by` names the correct pair. The prose is what is wrong, and it is prose in a permanent commit message.

### F-05 (MINOR) — a `✖` row became `◐` without saying why the blocker stopped applying

```
git diff 9bd179c88b:…pending-upstream-commits.md HEAD:…pending-upstream-commits.md   → for 1165aebc8
  [6] "✖ predecessor 1ad8f528d is X-REJECT — unreachable" -> "◐ 220a5a679f"
grep -E '^\| `1ad8f528d`' → | `1ad8f528d` | … | `X-REJECT` | P4 | 53 | ✖ | — | …
```

The register now asserts the commit landed while the commit it was declared blocked-by is still `✖ X-REJECT`, and every explanatory cell on the row is `—`. The justification exists — the graft was resolved by intent and is content-complete (see §4) — but it is nowhere the register points.

### NITs

- **F-06:** API split of the 48 open Dependabot alerts: `hono 10 · vitest 8 · ip-address 5 · zod 5 · fast-uri 4 · i18next 3 · @hono/node-server 2 · @vitest/mocker 2 · katex 2 · @humanfs/node 1 · @ai-sdk/provider-utils 1 · fflate 1 · minimatch 1 · qs 1 · serialize-javascript 1 · smol-toml 1` — **no `glob`**. The doc's "13 remain" arithmetic (zod 5 + i18next 3 + katex 2 + minimatch 1 + `@vitest/mocker` 1 + `@ai-sdk/provider-utils` 1) is 13; the live set sums to 14. Alerts are default-branch-scoped, so the post-merge number cannot be verified before merge.
- **F-07:** see §0.2.
- **F-08:** `.prettierignore` is not in the declared disposition list. The added block is well-argued (it is CP2 F-03's fix) and is the reason gate step 2 is now green, but it changes a repo-wide formatting contract from inside a sync branch.
- **F-09:** probed with a throwaway worktree: every direct shape is caught, but `const n = "gray-" + "matter"; require(n)` is invisible because the whole-tree pre-filter looks for the literal substring. This is architecturally acceptable (the threat model is untrusted _workspace content_, not a malicious committer), and the spec's deny-by-default pass would catch any _literal_ occurrence.
- **F-10:** carried from CP2; still true, still clean.

## 4. Verification log (every item requested, with commands)

### Item 1 — bisect safety

A detached worktree at each commit, `node_modules` symlinked from the working tree, `cd src && npx tsc --noEmit -p .`:

| Commit       | Result | Commit       | Result |
| ------------ | ------ | ------------ | ------ |
| `7da3b1b138` | exit 0 | `56e2d236f3` | exit 0 |
| `545d045549` | exit 0 | `e228cacd65` | exit 0 |
| `16c3dd1d64` | exit 0 | `e87ea3a89d` | exit 0 |
| `06ace86763` | exit 0 | `fb0734edb0` | exit 0 |
| `aa317317b0` | exit 0 | `f6e595c7e1` | exit 0 |
| `5521075b61` | exit 0 | `72e3c94429` | exit 0 |
| `de2ec1870b` | exit 0 | `c318ee46fb` | exit 0 |
| `34aeaed128` | exit 0 | `fc2a40b417` | exit 0 |
| `ec8f283d31` | exit 0 | `220a5a679f` | exit 0 |

`971115ca66` touches only [`apps/cli/src/**`](apps/cli/src/agent/ask-dispatcher.ts:1); checked separately with `cd apps/cli && npx tsc --noEmit` → **exit 0** (and exit 0 at HEAD). Pure-doc commits (`b7a9c4a7bc`, `8ebb58d21a`, `c37d9f99e5`, `945b9e38fc`, `d157303a75`, `2611d4e46d`, `5ced1d523a`) have no TypeScript surface.

`436d7a4160` / `715067b63b`: **gone from the branch**. Both still exist as loose objects (`git cat-file -t` → `commit`) but `git merge-base --is-ancestor <sha> HEAD` is false and `git for-each-ref --contains <sha>` is empty — they are unreachable, i.e. no ref or commit in this branch can reach them.

### Item 2 — register arithmetic and honesty

```
node /tmp/cp4_parse.mjs docs/upstream-sync/pending-upstream-commits.md
rows: 427 dupe-shas: 0
status counts: {"☐":351,"☑":22,"✖":38,"◐":16}          ← exact
node scripts/upstream-sync-triage.mjs --verify
… rows=427 duplicates=0 synced=22 missing=0 unexpected=0 pending-commits=427 🎉
node scripts/upstream-sync-triage.mjs --verify --repo-only
… rows=427 duplicates=0 synced=22 🎉
```

Row-level diff, base → HEAD: `added=239 removed=0 changed=3`, and every change is confined to the Status cell:

```
CHANGED 1165aebc8  [6] "✖ predecessor 1ad8f528d is X-REJECT — unreachable" -> "◐ 220a5a679f"
CHANGED a07706653  [6] "☐" -> "✖ `a07706653` is reverted upstream by `31c4a6427`; the pair is net-zero…"
CHANGED 31c4a6427  [6] "☐" -> "✖ `31c4a6427` is itself the revert of `a07706653`…"
```

- **No class/priority/Δ edit** anywhere (only field index 6 differs).
- **No row flipped to `☑`:** base `☑` = 22, head `☑` = 22, same SHAs, `removed=0`.
- **Five new `✖`** (`16cd5ad0d`, `5cc5a3795`, `a07706653`, `31c4a6427`, `a15ba8c8a`): all five name their own SHA in the Status cell. `16cd5ad0d`/`5cc5a3795`/`a15ba8c8a` arrived as new rows; `a07706653`/`31c4a6427` are `☐ → ✖` flips.
- **All 16 `◐`** name a fork commit whose message carries `(cherry picked from commit <sha>)`: `1165aebc8→220a5a679f`, `a101c613e/b7ab5a83e/9cb83c35a→72e3c9442`, `7389d9836→de2ec1870`, `f315cf4ac→c318ee46f`, `07007b431→945b9e38f`, `f8aa881c5→ec8f283d31`, `7ec58d4d4→34aeaed12`, plus the six CP1 picks and `7b60351cf→971115ca6`. All 14 distinct fork SHAs resolve.
- **`☐ → ◐` in this branch: 0.** Fifteen rows _arrived_ as `◐` (inside the 239 added), and one row moved `✖ → ◐` (`1165aebc8`). If the PR body says "N rows moved `☐ → ◐`", the honest N is **0**.

### Item 3 — code-vs-record agreement

```
git diff HEAD:src/services/skills/SkillsManager.ts upstream/main:src/services/skills/SkillsManager.ts --numstat
2  2  src/services/skills/SkillsManager.ts
-import { stringify } from "gray-matter"   /  +import matter from "gray-matter"
-const newContent = stringify(...)          /  +const newContent = matter.stringify(...)
```

Exactly the two lines the record claims at [`SYNC-23.md:158`](docs/upstream-sync/resolutions/SYNC-23.md:158), and nothing else. Inventory:

```
git grep 'from "gray-matter"' upstream/main -- src/
upstream/main:src/services/skills/SkillsManager.ts:4:import matter from "gray-matter"
upstream/main:src/utils/safeFrontmatter.ts:1:import matter from "gray-matter"
```

Exactly two files, as claimed. The "superseded by `de2ec1870b`" statement is also true: `git diff --quiet upstream/main HEAD -- src/services/skills/__tests__/SkillsManager.spec.ts` → empty (**byte-identical**), and the four specs total **222 tests**, matching the record's 222.

### Item 4 — the `1165aebc8` graft

The stat is identical on both sides (2 files, +102/−1), and the behavioural hunk is byte-identical:

```
diff of 1165aebc8:src/api/providers/nanogpt.ts vs 220a5a679f:…  → identical hunk (tools?.map … strict:false)
```

The spec looked 311 lines short against upstream's post-image, but that is **pre-existing drift, not missing content from this commit**:

```
1165aebc8^:…spec.ts = 707 lines   220a5a679f^:…spec.ts = 396 lines   (Δ 311 before the pick)
1165aebc8:…spec.ts  = 803 lines   220a5a679f:…spec.ts  = 492 lines   (Δ 311 after the pick)
git diff --numstat 1165aebc8:…spec.ts HEAD:…spec.ts → 0 311      (zero insertions)
```

Zero insertions means the fork's whole spec is an in-order subsequence of upstream's post-image, and both sides grew by exactly 96 lines — so all 96 lines this commit adds are present (verified line-by-line: `missingInForkInOrder=0`). The `nanogpt.ts` residual (`16 +/52 −`) is upstream's `f424bbbe49` ("GPT-6 Astra support") which the fork does not carry — another row's content, not this one's.

**Answer: content-complete for this commit. `◐` is honest; "partial" would be wrong.** The caveat is F-05 (the superseded rationale).

### Item 5 — the `f8aa881c5` partial

Upstream touched 10 files; the fork landed 7. The 3 absent ones are, exactly:

```
ABSENT webview-ui/playwright/AppProviders.tsx
ABSENT webview-ui/playwright/gallery/stories.tsx
ABSENT webview-ui/src/components/settings/__tests__/UISettings.visual.fixture.tsx
```

(They are genuinely absent — an earlier `git diff … | wc -l` of mine read `0` because the path did not exist and stderr was discarded; the `git cat-file -e` check above is the correct one.)

The 7 picked files are byte-identical to upstream's post-image except [`TranslationContext.tsx`](webview-ui/src/i18n/TranslationContext.tsx:16), which differs by **one word** — `const` → `export const TranslationProvider` — and that word was already in the fork's pre-image (`ec8f283d31^` line 16), i.e. pre-existing fork divergence the pick preserved, not something this commit introduced. Behaviourally identical. Recording is covered by F-03/F-04.

### Item 6 — the P0 boundary still holds

14 probe files in a throwaway worktree, then the real spec:

```
caught:    p1_default.ts         default import
caught:    p2_multiline.ts       import matter \n from "gray-matter"
caught:    p3_require.ts         require("gray-matter")
caught:    p4_dynamic.ts         await import("gray-matter")
caught:    p5_createrequire.ts   const req = createRequire(…); req("gray-matter")
caught:    p6_template.ts        await import(`gray-matter`)        ← NoSubstitutionTemplateLiteral
caught:    p10_reassign.ts       const req2 = req; req2("gray-matter")  ← deny-by-default
caught:    p11_resolve.ts        require.resolve("gray-matter")
caught:    p12_getbuiltin.ts     process.getBuiltinModule("module").createRequire
caught:    p13_importequals.ts   import matter = require("gray-matter")
NOT caught: p14_concat.ts        require("gray-" + "matter")        ← F-09 (pre-filter), by design
allowed:   p7_named / p8_inline-type / p9_type-only  (no verdicts)
```

With the probes removed, the spec is **31/31 green**; with them present, exactly the 11 forbidden files are reported and the 3 legitimate ones are not. CP2's F-02 and F-04 are closed. CP1's F-02 (`----` horizontal-rule branch) is also closed — [`safeFrontmatter.spec.ts:61`](src/utils/__tests__/safeFrontmatter.spec.ts:61) now carries the four-dash and `-----` cases.

### Item 7 — Security-tab truth

```
gh api 'repos/xavier-arosemena/roo-plus/code-scanning/alerts?state=open'      → 9
  #119 js/clear-text-logging  scripts/run-framing-pretest.mjs:247   (OPEN, not dismissed) ✓
  #122–126 insecure-temporary-file  scripts/build-scorer-bundle.mjs
  #133–135 insecure-temporary-file  scripts/run-routing-round.mjs
gh api '…?state=dismissed'                                                     → 22 total, 13 at 2026-11-25T13:58–13:59Z
```

Every one of the 22 dismissals carries a specific per-alert comment (e.g. #112 "strips CR/LF and all Unicode control characters", #127 "mkdtemp would break the sealed comparison"), and none of the 22 covers a path in the 9 open alerts. The 9 are the ones fixed in code (`mkdtemp` in [`eval-output-dir.mjs:42`](scripts/lib/eval-output-dir.mjs:42), constant error text at [`run-framing-pretest.mjs:151`](scripts/run-framing-pretest.mjs:151)), so they close on push. 9 + 13 = the 22 the security commit itself cites.

Dependabot: 48 open, matching. Split: see F-06.

### Item 8 — scope

`git diff --name-only 9bd179c88b...HEAD` → 95 files: 41 `src/`, 17 `docs/`, 12 `webview-ui/`, 10 `packages/`, 6 `scripts/`, 5 `apps/`, 1 `schemas/`, 1 `pnpm-lock.yaml`, 1 `package.json`, 1 `.prettierignore`.

- No `CHANGELOG*`, no `.changeset/`, no `.github/**`, no `locales/*/README.md`.
- No `src/services/code-index/service-factory.ts` (branding untouched).
- `pnpm-lock.yaml` touched only by `e87ea3a89d` (the dependency commit). ✓
- **No version bump:** `git show 9bd179c88b:src/package.json | grep version` → `3.89.5`; the range's `src/package.json` diff is two `devDependencies` pins (`@vitest/coverage-v8`, `vitest` 4.1.9 → 4.1.11). `webview-ui/package.json` likewise only vitest pins. Root `package.json` only appends `scripts/eval-output-dir.spec.mjs` to `test:scripts`.
- `.prettierignore` — see F-08.

### Item 9 — landing checklist facts

1. **Current version:** `src/package.json` → **`3.89.5`** (publisher `xavier-arosemena`, name `roo-plus`). Unchanged by this branch.
2. **`pnpm bump:pre-release` required before merge: YES.** `3.89.5` is already the published `latest` on Open VSX, and the guard rejects `patch <= maxPatch`. The next committed version must be `3.89.6`.
3. **`pnpm generate:announcements` required: NO** — no line-base section changed. No CHANGELOG file is touched anywhere in the range, and `node scripts/verify-announcement-version.mjs` passes at `3.89.5` ("announcement data in sync with the current changelog section"). It becomes required **only if** the pre-release bump is accompanied by a What's New amendment — which the release policy expects for the user-facing changes in this branch (skills symlinks, nanogpt tool parameters, locale lazy-loading, vscode-lm models, CLI prompt escaping). That is a release-prep decision, not a condition of this branch.
4. **`◐` SHAs that need re-pointing if anything is rebased** (16 cells, 14 distinct fork commits):

    `220a5a679f` (`1165aebc8`) · `72e3c9442` (`a101c613e`, `b7ab5a83e`, `9cb83c35a`) · `de2ec1870` (`7389d9836`) · `c318ee46f` (`f315cf4ac`) · `945b9e38f` (`07007b431`) · `ec8f283d31` (`f8aa881c5`) · `34aeaed12` (`7ec58d4d4`) · `7da3b1b138` (`f015dae53`) · `545d045549` (`6843b60b8`) · `16c3dd1d64` (`5e32badca`) · `06ace86763` (`252d9ce26`) · `aa317317b0` (`dc6d1435e`) · `971115ca6` (`7b60351cf`) · `5521075b61` (`e3de60a7c`)

5. **Rows that move `☐ → ◐` in this branch: 0.** (15 arrived as `◐`; 1 moved `✖ → ◐`.) Rows that move `☐ → ✖`: 2. Rows flipped to `☑`: 0.
6. **Gate state:** `gate:sync` step 2 (upstream code-index alignment, the old `D5` red) is **green** — `node scripts/verify-upstream-code-index-alignment.mjs --strict` → "12 identical, 16 allow-listed branding/fork diff(s)", exit 0. `--verify` and `--verify --repo-only` green.

## 5. Weakest link and seams

1. **Weakest link: the version/publish boundary (F-01).** Everything in the branch is correct; the branch cannot become a release at its current version. This is the only seam that fails deterministically.
2. **Seam: "the record" vs "the commit message" (F-02, F-03, F-04, F-05).** Four of the ten findings are the same shape — a true, well-argued justification that exists somewhere other than where a reader will look for it. The register is machine-verified for arithmetic but not for prose truth, so prose drift accumulates silently. Cheapest structural fix: make the `◐` Status cell carry a mandatory qualifier (`◐ <fork-sha> (partial: <n> files — see Body)`) and have `--verify` require a non-empty `Notes` anchor for every `◐`.
3. **Seam: the guard's own coverage (F-09, F-10).** The P0's enforcement is a `src/`-only, literal-string-scoped scan. Sound for its threat model; it will not notice a second copy of the package under `packages/`.

## 6. Counter-proposals (top 3, recommended option marked)

- **F-01 → MITIGATE (recommended).** Run `pnpm bump:pre-release` (→ `3.89.6`) as the final commit before merge, then `pnpm verify:announcement-version`. Cost: one commit, one regeneration check. Alternative REDESIGN (make the pipeline derive a build-local version) is forbidden by the release ADR — do not do it. ACCEPT is not available: the guard fails closed and the release stops.
- **F-02 → MITIGATE (recommended).** Commit `docs/reviews/2026-11-25-sync23-cp2-red-team.md` (and this report) into the branch, following the `56e2d236f3` precedent. ACCEPT is defensible only if the review docs are guaranteed to be committed in the release-prep PR — if so, say so explicitly in the PR body.
- **F-03/F-04/F-05 → MITIGATE (recommended).** Three one-line edits in the record: add a `Notes` bullet for `f8aa881c5` naming the three files and `fec4e1353`/`8f7f48ad5`; correct the `ec8f283d31` splice note's attribution; restore `1ad8f528d` to the `1165aebc8` row's `Blocked-by` with a clause saying the rejection no longer blocks because the graft is content-complete. All three are prose in tracked files, safe to amend before the push.

## 7. Verdict

**APPROVE WITH CONDITIONS.**

Conditions, in order: (1) `pnpm bump:pre-release` before merge — F-01; (2) commit the CP2 review report (and this one) or state explicitly where they will land — F-02; (3) three record-prose corrections — F-03/F-04/F-05.

None of the findings is a code defect. The strongest attack I attempted — that the `1165aebc8` graft is secretly partial, or that the `f8aa881c5` pick silently dropped behaviour — **fails on evidence**: the nanogpt spec's 96 added lines are all present in order and the 311-line gap pre-dates the pick, and the locale pick is byte-identical in 6 of 7 files with a one-word pre-existing divergence in the seventh. The P0 boundary also holds against every shape I could construct that a normal caller might write.
