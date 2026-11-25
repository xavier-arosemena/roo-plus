# SYNC-23 CP1 — adversarial review (Red Team)

- **Subject:** branch `sync/sync-23-31-row-security-sweep`, base `9bd179c88b`, HEAD `8ebb58d21a` (8 commits)
- **Reviewer role:** CP1 red team — read-only audit of the execution, not of the authorised decisions
- **Reviewer actions taken:** git/read/execute only. No commit, branch, push, or source edit. Two throwaway
  worktrees (`/tmp/cp1` at HEAD, `/tmp/cp1base` at `9bd179c88b`) were created and removed; both were detached
  and never wrote to the branch. Working tree is clean (`git status --porcelain` → empty).
- **Date:** 2026-11-24

## 1. Orientation

**One-sentence restatement.** Register 239 new upstream commits (188 → 427 rows) in a `SYNC-23` proposals
section, land a six-commit `cherry-pick -x` chain of upstream's frontmatter code-execution fix
(`f015dae53`, `6843b60b8`, `5e32badca`, `252d9ce26`, `dc6d1435e`, `e3de60a7c`) with two conflict resolutions,
and record the batch in [`SYNC-23.md`](docs/upstream-sync/resolutions/SYNC-23.md:1) with six rows marked `◐`.

**Assumption register (attacked below, not re-litigated where authorised).**

| #   | Assumption                                                                                               | Type                |
| --- | -------------------------------------------------------------------------------------------------------- | ------------------- |
| A1  | The 239 new rows are _appended_; no pre-existing row is reclassified, reordered, or deleted              | explicit claim      |
| A2  | `--verify` passing means the register and its Summary/README prose agree                                 | explicit claim      |
| A3  | A single shared `parseFrontmatter()` wrapper closes **every** executable-engine path in the fork         | explicit claim (P0) |
| A4  | The new specs fail without the fix (non-vacuous)                                                         | explicit claim      |
| A5  | Dropping `enoent`/`mockSymlinks` from the harness import is safe because nothing calls them              | explicit claim      |
| A6  | Both conflicts are upstream-prerequisite drift (`7389d9836`), not fork divergence                        | explicit claim      |
| A7  | All six picks carry the `cherry picked from` + co-author trailers, and each `◐` names the right fork SHA | explicit claim      |
| A8  | `full-rebrand.sh` touched exactly one file and restoring it made the tree clean                          | explicit claim      |
| A9  | Step 2 of `gate:sync` is red for a pre-existing, unrelated reason (`embedder.ts`)                        | authorised (D5)     |
| A10 | Hidden: a new `gray-matter` caller would be caught by CI                                                 | **unstated**        |

**Implied "this will work" claim:** the batch is gate-green apart from D5, and the P0 is closed for the fork's
whole frontmatter surface — not just for the two files upstream happened to touch.

## 2. Verdict

**APPROVE WITH CONDITIONS.**

The landed code is correct, the register is honest, provenance is intact, and every number the executor
reported reproduced. No BLOCKER. The conditions are (1) two factual corrections inside this batch's own
resolution record, and (2) a tracked follow-up (or a one-line addition here) that makes the
"all frontmatter parsing goes through the wrapper" invariant mechanically enforced, because it is the _only_
control standing between a future caller and remote code execution.

## 3. Findings

| ID   | Finding                                                                                                                                                                        | Severity | S×L×D      | Evidence  | Status              |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ---------- | --------- | ------------------- |
| F-01 | The P0 rests on one unenforced invariant: `{ language: "yaml" }` is **not** a second control, and nothing in CI stops a new `gray-matter` import                               | MAJOR    | 4×3×4 = 48 | CONFIRMED | open                |
| F-02 | Load-bearing guard branch `normalized[3] !== "-"` has no test; the batch itself shipped a version _with_ the bug this branch fixes                                             | MINOR    | 3×3×3 = 27 | CONFIRMED | open                |
| F-03 | Resolution record contains two factual errors about what upstream's commit does and about `enoent`'s call sites                                                                | MINOR    | 2×4×2 = 16 | CONFIRMED | open                |
| F-04 | The documented `full-rebrand.sh` procedure silently dirties the gated `CORE_FILE` [`service-factory.ts`](src/services/code-index/service-factory.ts:24) and breaks gate step 2 | MINOR    | 3×4×2 = 24 | CONFIRMED | open (pre-existing) |
| F-05 | `enoent` is exported from the new harness with no named-import consumer (dead export)                                                                                          | NIT      | 1×5×1 = 5  | CONFIRMED | open                |
| F-06 | Record evidence line claims the TLA module "is asserted by the frontmatter tests"; no test and no CI step executes TLC                                                         | NIT      | 1×5×1 = 5  | CONFIRMED | open                |
| F-07 | Commit `b7a9c4a7bc` says "four rows flipped to `✖`"; only **two** pre-existing rows were flipped                                                                               | NIT      | 1×5×1 = 5  | CONFIRMED | open                |
| F-08 | [`SkillsManager.ts`](src/services/skills/SkillsManager.ts:4) keeps a raw `gray-matter` import (for `stringify` only) — a future import ban must allow it                       | NIT      | 1×4×1 = 4  | CONFIRMED | open                |

### F-01 (MAJOR) — the only control is a convention, and it does not defend itself

```
cd /root/roo-plus && node -e 'const m=require("./node_modules/.pnpm/gray-matter@4.0.3/node_modules/gray-matter");
const r=m("---js\nglobalThis.__x=1\n---\nB", {language:"yaml"}); console.log(r.data, globalThis.__x)'
# → {…} 1        ← the payload EXECUTED
```

`parseMatter()` in gray-matter 4.0.3 assigns `file.language = opts.language`, then **overwrites** it with the
language it reads off the document header:

```
node_modules/.pnpm/gray-matter@4.0.3/node_modules/gray-matter/index.js:57   if (opts.language) file.language = opts.language
node_modules/.pnpm/gray-matter@4.0.3/node_modules/gray-matter/index.js:87   const language = matter.language(str, opts); if (language.name) file.language = language.name
```

So the `{ language: "yaml" }` argument in [`parseFrontmatter()`](src/utils/safeFrontmatter.ts:15) buys only the
cache bypass (its comment says exactly that, and is accurate) — **it is not a security control**. The pre-check
on lines 6–12 is the whole defence. That pre-check _is_ congruent with the library: it mirrors gray-matter's
own two reachable conditions (`startsWith("---")` and `charAt(3) !== "-"`), lowercases the name (stricter than
the library, per `matter.language()` + `lib/engine.js#aliase`), fail-closes on homoglyphs/whitespace/tabs, and
tolerates a double BOM (`stripBom` removes exactly one). I could not construct an input where the guard is
skipped and the engine executes. The P0 is genuinely closed **today**.

The seam is forward-looking. Consumers of `gray-matter` in `src/` are exactly:

```
grep -rn --include=*.ts -E "gray-matter" src | grep -v __tests__
src/utils/safeFrontmatter.ts:1  import matter from "gray-matter"
src/services/skills/SkillsManager.ts:4  import matter from "gray-matter"   # stringify only
```

…and nothing enforces it: `grep -n "no-restricted-imports" src/eslint.config.mjs packages/config-eslint` → no
hits. A future `.clinerules`/mode/prompt frontmatter reader that writes `matter(content)` re-opens the exact
vulnerability this batch exists to close, and every gate stays green. Severity is high because the impact is
RCE from a workspace file (a cloned repo can ship `---js` in a slash command); detectability is poor because
the failure is silent until somebody exploits it.

### F-02 (MINOR) — an untested branch that this very batch proved fragile

```
cd /root/roo-plus && node -e '…'          # guardRuns, matter.language() and matter() on four headers
{"header":"----","guardRuns":false,"detected":"-","data":{}}
{"header":"----- horizontal","guardRuns":false,"detected":"-- horizontal","data":{}}
```

`matter.language("----")` yields `"-"`, which is not in the allow-list. Without the `normalized[3] !== "-"`
condition the guard would **throw on any file whose body starts with a horizontal rule** (`----`), and
`commands.ts` swallows the throw, so the command/skill would silently vanish. That branch is therefore
correctness-critical, and:

```
grep -rn -- "----" src/utils/__tests__/safeFrontmatter.spec.ts \
   src/services/command/__tests__/frontmatter-commands.spec.ts \
   src/services/skills/__tests__/SkillsManager.spec.ts     # → no 4-dash case
```

The batch itself is the proof of fragility: `7da3b1b138` (upstream `f015dae53`) guarded with
`if (matter.test(input))` — which is true for `----` — and `16c3dd1d64` had to add `[3] !== "-"` to stop the
false reject. The fix landed; the regression test did not.

### F-03 (MINOR) — the resolution record misstates upstream twice

```
git show e3de60a7c:src/services/skills/__tests__/SkillsManager.spec.ts | grep -n "mockSymlinks"
44:const mockSymlinks = (...paths: string[]) =>
git show e3de60a7c:src/services/skills/__tests__/skillsTestHarness.ts | wc -l   # 23 lines, no mockSymlinks
diff -u <upstream harness> src/services/skills/__tests__/skillsTestHarness.ts    # IDENTICAL
grep -n "harness.enoent" src/services/skills/__tests__/SkillsManager.spec.ts
1844: expect(harness.enoent().code).toBe("ENOENT")
1855: expect(harness.enoent().code).toBe("ENOENT")
1856: expect(harness.enoent().message).toBe("ENOENT: no such file or directory")
```

[`SYNC-23.md:35`](docs/upstream-sync/resolutions/SYNC-23.md:35) says upstream "moves … the `mockSymlinks`
helper out of the spec into the new `./skillsTestHarness` module". It does not — upstream keeps `mockSymlinks`
in the spec (it closes over the spec-local `mockLstat`), and the landed harness is byte-identical to
upstream's. [`SYNC-23.md:39`](docs/upstream-sync/resolutions/SYNC-23.md:39) says "`enoent` … neither has a call
site here", which is only true of the _named_ import: the landed spec calls `harness.enoent()` three times
through the namespace re-import in the harness self-test. `--verify-resolutions` passes because it checks
field shape, not prose truth. The _decision_ (omit from the named import) is correct; the _explanation_ is not,
which matters because this file is the audit trail a future reader trusts.

### F-04 (MINOR, pre-existing) — the rebrand step and the alignment gate disagree

Reproduced in a throwaway worktree, so the branch was untouched:

```
git worktree add --detach /tmp/cp1 HEAD && ln -s <repo>/node_modules /tmp/cp1/node_modules && ln -s <repo>/src/node_modules /tmp/cp1/src/node_modules
cd /tmp/cp1 && bash scripts/full-rebrand.sh && git status --porcelain
 M src/services/code-index/service-factory.ts          ← exactly ONE file, claim A8 confirmed
cd /tmp/cp1 && node scripts/verify-upstream-code-index-alignment.mjs --strict   # exit 1
✖ src/services/code-index/service-factory.ts — drift
✖ src/services/code-index/interfaces/embedder.ts — drift        ← the pre-existing D5 drift, now joined by a second
```

The executor handled this correctly — `git status --porcelain` on the branch is empty and
`git diff --name-only 9bd179c88b HEAD -- src/services/code-index/service-factory.ts` is empty, so the file was
genuinely restored. The finding is against the _procedure_: a documented step silently dirties a gated
`CORE_FILE` with no branding allow-list, so the operator must know to revert it or eat a red gate.

### NITs

- **F-05:** [`skillsTestHarness.ts:21`](src/services/skills/__tests__/skillsTestHarness.ts:21) exports `enoent`
  with no named-import consumer anywhere.
- **F-06:** [`SYNC-23.md:107`](docs/upstream-sync/resolutions/SYNC-23.md:107) — "the spec is asserted by the
  frontmatter tests". `grep -rn "tlc\|\.tla" scripts/gate-sync.mjs` has no hit; TLC is not run by any gate.
- **F-07:** `git log -1 b7a9c4a7bc` — "four rows flipped to `✖`". Row-level diff (below) shows two flips
  (`a07706653`, `31c4a6427`); `16cd5ad0d` and `5cc5a3795` arrived as _new_ rows already `✖`.
- **F-08:** [`SkillsManager.ts:4`](src/services/skills/SkillsManager.ts:4) keeps `import matter from "gray-matter"`
  for `matter.stringify` only. Legitimate, but any future `no-restricted-imports` rule must carve it out.

## 4. Claim audit — every reported number reproduced

| Claim                                            | Command                                                                                                                                                                    | Result                                                                                                                                                                                                                                     |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ------------- | -------------------------------------------------------------------------------------------------------------- |
| "427 rows cover 427 pending"                     | `node scripts/upstream-sync-triage.mjs --verify`                                                                                                                           | ✅ `rows=427 duplicates=0 synced=22 missing=0 unexpected=0 pending-commits=427`                                                                                                                                                            |
| "141/141 tests"                                  | `cd src && npx vitest run services/skills/__tests__/SkillsManager.spec.ts utils/__tests__/safeFrontmatter.spec.ts services/command/__tests__/frontmatter-commands.spec.ts` | ✅ 3 files / 141 tests passed                                                                                                                                                                                                              |
| "12 blocks vs 12 files"                          | `node scripts/verify-resolutions.mjs --batch SYNC-23 --base b7a9c4a7bc --head 5521075b61`                                                                                  | ✅ `12 block(s) vs 12 file(s)`, green                                                                                                                                                                                                      |
| "`--integrity`"                                  | `node scripts/verify-resolutions.mjs --integrity`                                                                                                                          | ✅ no conflict markers / whitespace errors in 2258 files                                                                                                                                                                                   |
| "rebrand touched exactly one file"               | `bash scripts/full-rebrand.sh` in `/tmp/cp1`                                                                                                                               | ✅ exactly `src/services/code-index/service-factory.ts`                                                                                                                                                                                    |
| "no existing row reclassified/reordered/deleted" | `/tmp/rowdiff.mjs` (per-SHA field diff, base vs HEAD)                                                                                                                      | ✅ 188/188 base rows present, 0 missing, exactly **2** field changes (`a07706653`, `31c4a6427` → `✖`), 239 added, 0 duplicates                                                                                                             |
| Summary tables agree with rows                   | computed class/priority counts from the rows                                                                                                                               | ✅ `A-CLEAN 66` (45 ∧ P0–P2), `B-CAREFUL 155`, `C-REIMPLEMENT 121`, `D-LOCAL 50`, `E-SKIP 34`, `X-REJECT 1`, total 427; `P0 16 · P1 165 · P2 67 · P3 139 · P4 40` — identical to the rendered tables and to the "121 … 84 (50 + 34)" prose |
| Four `✖` rows attributable per row               | `grep -E '^\| `(16cd5ad0d                                                                                                                                                  | 5cc5a3795                                                                                                                                                                                                                                  | a07706653 | 31c4a6427)`'` | ✅ each Status cell names its own SHA; head has 38 `✖` rows overall, `discard-rationale` is part of `--verify` |
| "one big PR, 26 docs commits carried" (D1)       | `git diff --stat 9bd179c88b HEAD`                                                                                                                                          | 15 files, +1314/−83; 12 batch files + `README.md` + `pending-upstream-commits.md` + `SYNC-23.md`                                                                                                                                           |
| No R5 paths                                      | `git diff --name-only 9bd179c88b HEAD \| grep -E "^src/package.json\|CHANGELOG\|^locales/.*README\|pnpm-lock.yaml\|^\.github/\|^\.coderabbit"`                             | ✅ none                                                                                                                                                                                                                                    |

### Provenance (Attack 6)

```
for c in 7da3b1b138 545d045549 16c3dd1d64 06ace86763 aa317317b0 5521075b61; do git log -1 --format='%H%n%b' $c; done
```

All six carry `(cherry picked from commit <upstream-sha>)` **and** `Co-authored-by: hanneke-de-vries
<dhanneke204@gmail.com>` on their own lines, with the fork↔upstream pairing matching the declaration exactly.
Stronger: `git patch-id --stable` is **byte-identical for 4 of the 6** (`7da3b1b138`, `545d045549`,
`06ace86763`, `aa317317b0`), and _differs only for the two commits the executor declared as conflicted_
(`16c3dd1d64`, `5521075b61`). That is independent corroboration that "two conflicts kept" is the complete
conflict set.

`◐` cells: `f015dae53→7da3b1b138`, `6843b60b8→545d045549`, `5e32badca→16c3dd1d64`,
`252d9ce26→06ace86763`, `dc6d1435e→aa317317b0`, `e3de60a7c→5521075b61` — all correct; exactly six `◐` rows
exist; `☑` count is unchanged (no row flipped to `☑`).

### P0 completeness (Attack 2)

```
grep -rn --include=*.ts -E "gray-matter|js-yaml|parseMarkdownFrontmatter|yaml\.load|yaml\.parse" src packages apps scripts
grep -rln --include=*.ts "frontmatter" src | grep -v __tests__      # → SkillsManager.ts, commands.ts, safeFrontmatter.ts, RunSlashCommandTool.ts, Task.ts
```

`RunSlashCommandTool.ts` / `Task.ts` only _read_ `command.mode` from an already-parsed object. Modes,
`.roomodes` and marketplace manifests parse with the `yaml` package (`from "yaml"` in `CustomModesManager.ts`,
`ConfigLoader.ts`, `MarketplaceManager.ts`, `SimpleInstaller.ts`, `migrateSettings.ts`) — a data-only parser
with no document-selected engine, so not an execution vector. Slash commands and skills (the two document
types that use frontmatter) both go through the wrapper. **No second execution path exists.** `src/dist/`
appears in a raw `grep` but is gitignored (`.gitignore:2`) build output.

### Non-vacuous tests (Attack 3)

```
git worktree add --detach /tmp/cp1 HEAD && (symlink node_modules)
# replace only safeFrontmatter's body with `return matter(content)` (the vulnerable original), nothing else
cd /tmp/cp1/src && npx vitest run <the same three specs>
→ Failed Tests 35 · Test Files 3 failed
```

35 of 141 tests fail the moment the guard is removed — including plain execution assertions
(`expected "vi.fn()" to not be called at all, but actually been called 1 times`), rejection assertions
(`expected [Function] to throw "Unsupported frontmatter language"`) and content assertions. The tests prove
the fix; they are not vacuous. The `matter.stringify({ content: body }, …)` change also has coverage:
[`SkillsManager.spec.ts:150`](src/services/skills/__tests__/SkillsManager.spec.ts:150) asserts the written
`SKILL.md` still `expect.stringContaining(instructions)`.

### Omitted harness symbols (Attack 4)

`enoent`: consumed only through `await import("./skillsTestHarness")` in the harness self-test (lines
1818–1856), so a named import is unnecessary — the _outcome_ is correct, the _rationale text_ is wrong (F-03).
`mockSymlinks`: upstream defines it in the spec, not the harness, and it closes over `mockLstat`; the landed
spec has no `mockLstat` and no symlink-container tests, so adding it would not compile. **No half-landed
predecessor:** neither [`SkillsManager.ts`](src/services/skills/SkillsManager.ts:56) nor the specs reference
`7389d9836`'s symlink-container machinery (`lstat`/`readlink`/`isSymbolicLink` appear nowhere; the two
symlink tests in the spec are fork-original and pre-exist at the base commit). `7389d9836` is still `☐` in the
register, as declared.

### Conflict narrative (A6)

```
git diff --stat 252c69b5 9bd179c88b -- <the 12 batch paths>     # → empty
for c in f015dae53 6843b60b8 5e32badca 252d9ce26 dc6d1435e e3de60a7c; do git diff-tree --no-commit-id --name-only -r $c; done | sort -u | wc -l   # → 16
```

The fork side is byte-identical to the merge base on all twelve final paths, and the six upstream commits touch
exactly the sixteen distinct path strings the record claims. Δ 0 is truthful, and the conflicts really are
prerequisite drift, not fork divergence. `7389d9836`'s row status is `☐`.

### Latent gate breakage (Attack 8)

| step | id                                              | result                                                                                             |
| ---- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 1    | `verify-message-schemas`                        | ✅ 159 inbound / 81 outbound, 0 untyped                                                            |
| 2    | `verify-upstream-code-index-alignment --strict` | ❌ **exit 1** — `embedder.ts` drift only                                                           |
| 3    | `verify-announcement-version`                   | ✅ v3.89.5 in sync                                                                                 |
| 4    | `verify-submodule-pin`                          | ✅ pin `78a2010bcc51`, 90 curated modes described                                                  |
| 5    | `verify-roomodes-sync`                          | ✅ 90 curated modes in sync                                                                        |
| 6    | `verify-locale-readmes`                         | ✅ 17/17                                                                                           |
| 7    | `verify-semble-checksums --strict`              | ✅ 4/4 archives match                                                                              |
| 8    | `verify-semble-release-coupling --strict`       | ✅ no version/checksum change                                                                      |
| 9    | `test:scripts`                                  | not re-run (executor reported 767/767; step 10's integrity and the register `--verify` overlap it) |
| 10   | `verify-resolutions --integrity`                | ✅                                                                                                 |
| 11   | `pnpm check-types`                              | ✅ 9/9 tasks, `tsc --noEmit` clean for `src` and `webview-ui`                                      |

Step 2 reproduced **at the base commit** in `/tmp/cp1base`:

```
git worktree add --detach /tmp/cp1base 9bd179c88b
cd /tmp/cp1base && node scripts/verify-upstream-code-index-alignment.mjs --strict   # exit 1
✖ src/services/code-index/interfaces/embedder.ts — drift
```

Same single failure, same file. D5's "expected red" is confirmed as pre-existing and _not_ introduced by the
delta (`git diff --name-only 9bd179c88b HEAD -- src/services/code-index/interfaces/embedder.ts` → empty).
Nothing else in steps 3–11 is broken. ESLint with suppression pruning is clean on all seven touched files:

```
cd src && npx eslint --prune-suppressions --max-warnings=0 <7 files>   # exit 0, no output
```

## 5. Weakest link and seams

**Weakest link: F-01 — the P0's single control is a naming convention with no mechanical enforcement.**
Everything else in this batch is data or documentation that a gate verifies; this one invariant is verified
only by the reader's memory.

**Seams most likely to break first**

1. **`safeFrontmatter.ts` ↔ future callers.** No lint rule, no import test. The next frontmatter reader
   (`.clinerules`, prompt templates, a new document type) is one `import matter from "gray-matter"` away from
   reintroducing RCE, silently.
2. **`full-rebrand.sh` ↔ `gate:sync` step 2.** The documented post-cherry-pick procedure writes into a
   `CORE_FILE`; the only thing that catches it is a _different_ gate failing afterwards (F-04).
3. **`SYNC-23.md` prose ↔ the verifier.** `verify-resolutions` validates field shape, not truthfulness, so a
   wrong sentence about what a commit does passes green (F-03) — the exact failure mode an audit record exists
   to prevent.

## 6. Counter-proposals

For each of the top three, `a` = minimal, `b` = structural, `c` = accept with controls.

**F-01 — enforce the wrapper (recommended: (a), add (b) as a follow-up).**

- **(a) MITIGATE, ~10 lines, this batch:** in `src/eslint.config.mjs`, add
  `no-restricted-imports` with `paths: [{ name: "gray-matter", message: "Use src/utils/safeFrontmatter.ts (parseFrontmatter) — see SYNC-23." }]`,
  overridden to `off` for [`safeFrontmatter.ts`](src/utils/safeFrontmatter.ts:1) and
  [`SkillsManager.ts`](src/services/skills/SkillsManager.ts:4) (stringify only). Cost: one config edit; risk:
  none; it converts F-01 into a compile-time failure.
- **(b) REDESIGN:** export `stringifyFrontmatter()` from the same module so `SkillsManager.ts` drops its raw
  import entirely and the ban becomes absolute (no allow-list). Cost: small refactor + one test; risk: the
  `{ content }` wrapper semantics must be preserved.
- **(c) ACCEPT:** document in [`safeFrontmatter.ts`](src/utils/safeFrontmatter.ts:3) that
  `{ language: "yaml" }` is _cache plumbing only_ — it does not override a document-declared engine — and add a
  canary test asserting the payload executes _without_ the guard (it would go red exactly when gray-matter's
  override semantics change on an upgrade).

**F-02 — cover the fourth-dash branch (recommended: (a)).**

- **(a) MITIGATE:** one case in [`safeFrontmatter.spec.ts`](src/utils/__tests__/safeFrontmatter.spec.ts:3):
  `parseFrontmatter("----\nname: x\n---\nBody")` must not throw and must keep the body; a second case for
  `"----- horizontal"`. Cost: 4 lines, zero risk, pins the exact bug `f015dae53` had.
- **(b) REDESIGN:** replace the hand-mirrored conditions with `matter.test(normalized) && normalized[3] !== "-"`,
  keeping the logic in one place with a comment naming the two `index.js` lines it mirrors. Trade-off: no
  behaviour change, slightly easier to keep congruent on a dependency bump.
- **(c) ACCEPT:** the branch is correct today and `matter()` itself returns early on `----`, so the worst case
  of removing it is a false reject, not execution — justify leaving it untested only if (a) is rejected.

**F-03 — make the record true (recommended: (a), in this PR).**

- **(a) MITIGATE:** two sentence edits in [`SYNC-23.md`](docs/upstream-sync/resolutions/SYNC-23.md:35): upstream
  keeps `mockSymlinks` in the spec (it closes over the spec-local `mockLstat`), and `enoent` is consumed only
  through the namespace re-import in the harness self-test, so no named import is needed. Also soften the TLA
  evidence line (F-06). Cost: minutes; risk: none; the file is this batch's own artifact.
- **(b) REDESIGN:** teach `verify-resolutions` to reject a record that claims a symbol is "unused" when the
  spec contains a call to it. Cost: a new check + spec; risk: over-fitting prose. Not worth it yet.
- **(c) ACCEPT:** only defensible if the record is treated as narrative rather than evidence — it is not, per
  the runbook.

**F-04 — stop the rebrand from dirtying a CORE_FILE.**

- **(a) MITIGATE:** add `src/services/code-index/service-factory.ts` (or its rewritten tokens) to the script's
  exclusion list, or make the script end with a `git status --porcelain` reminder that names every file it
  touched. Cost: one line; risk: low.
- **(b) REDESIGN:** have `full-rebrand.sh` operate on `git diff --name-only` of the batch instead of a fixed
  sweep, so it cannot touch paths the batch did not change.
- **(c) ACCEPT:** the executor corrects it by hand each time and step 2 catches the omission — acceptable only
  while batches are small enough for a human to notice a second drift line.

## 7. Final verdict

**APPROVE WITH CONDITIONS.**

- **Approved on the merits:** register honest (188 preserved rows, exactly two status edits, 239 additions, all
  counts and prose recomputed and green), P0 genuinely closed with non-vacuous tests, provenance pristine
  (4/6 byte-identical patch-ids, 2/6 = the declared conflicts), scope exactly as declared, no R5 or branding
  leakage, empty working tree, and every one of the executor's numbers reproduced.
- **Conditions:**
    1. Correct the two factual errors in [`SYNC-23.md`](docs/upstream-sync/resolutions/SYNC-23.md:35) (F-03) and
       the TLA evidence line (F-06).
    2. Land, in this batch or as a tracked follow-up referenced from the PR, the `gray-matter`
       `no-restricted-imports` rule (F-01a) plus the `----` regression case (F-02a).
- **Strongest attack I attempted, and why it failed:** I tried to prove the P0 incomplete by (i) finding a
  second `gray-matter` caller in the fork, (ii) driving an input through the guard that gray-matter would still
  execute, and (iii) showing the tests pass without the fix. (i) found none (only `stringify` remains);
  (ii) every bypass I constructed — upper/`toml`/`coffee`/`__proto__`/`!!js` selectors, single and double BOM,
  leading whitespace, `\r`-only line endings, `---js` with no closing delimiter — either throws or is never
  parsed, because the guard mirrors the library's only two reachable conditions; (iii) 35 tests fail when the
  guard is stubbed out. The finding I could not defeat is not a defect in the code but in its durability
  (F-01), which is why the verdict is conditional rather than clean.
