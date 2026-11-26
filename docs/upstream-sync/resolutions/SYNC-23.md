# SYNC-23 — frontmatter code-execution hardening — resolution record

- batch: SYNC-23
- base: b7a9c4a7bc
- head: 5521075b61
- conflicted_files: docs/architecture/tla/Frontmatter.CaseSensitive.cfg, docs/architecture/tla/Frontmatter.NoBomStrip.cfg, docs/architecture/tla/Frontmatter.None.cfg, docs/architecture/tla/Frontmatter.cfg, docs/architecture/tla/Frontmatter.tla, src/services/command/__tests__/frontmatter-commands.spec.ts, src/services/command/commands.ts, src/services/skills/SkillsManager.ts, src/services/skills/__tests__/SkillsManager.spec.ts, src/services/skills/__tests__/skillsTestHarness.ts, src/utils/__tests__/safeFrontmatter.spec.ts, src/utils/safeFrontmatter.ts

> **Scope.** Six rows shipped in one chain: `f015dae53` (#2420), `6843b60b8` (#2455),
> `5e32badca` (#2456), `252d9ce26` (#2457), `dc6d1435e` (#2465) and `e3de60a7c` (#2417).
> Only **two** files hit real conflict markers (`SkillsManager.ts` and
> `SkillsManager.spec.ts`); the other ten auto-merged and are recorded here because
> `conflicted_files:` must equal the batch range in both directions.
>
> **Prerequisite drift, disclosed.** The triage recorded Δ 0 for all six rows and the
> re-run empty-fork-side test confirmed it for all sixteen touched paths
> (`git diff 252c69b5 <base> -- <path>` empty). The conflicts are therefore **not**
> fork-versus-upstream: they exist because upstream's own predecessors were never
> picked. `7389d9836` ("Implement symlinks for skills", `A-CLEAN`/P3, still open in
> SYNC-23) is the prerequisite for both conflicts — upstream's file at the picks'
> parents carries the symlink-container code and tests that the fork does not have.

### src/services/skills/SkillsManager.ts [shape: modify/modify]

- upstream: 5e32badca — replaces every gray-matter parse call site with `parseFrontmatter` so a document can no longer select an executable frontmatter engine, and re-wraps the `stringify` call as `matter.stringify({ content: body }, frontmatter)`.
- fork: 04ffb64bb7 — the fork commit that last shaped `SkillsManager.ts` (the Batches 3-4 reapply); its content at the batch base is byte-identical to the merge base, so the parse call still read `matter(fileContent)` with a `content: body` destructuring.
- fork_locus: none
- resolution: upstream-adapted
- rationale: The conflicted scan-site line differs only by the fork's dead `content: body` binding — `body` has no other occurrence in that function, so upstream's narrower destructuring is a strict superset of the surviving behaviour while carrying the security fix the row exists for.
- dropped: none
- evidence: src/services/skills/__tests__/SkillsManager.spec.ts and src/utils/__tests__/safeFrontmatter.spec.ts — the unsupported-language cases fail on the pre-pick tree and pass after; `npx vitest run` over the three specs: 143 tests pass; gates: gate:sync
- divergence: none

### src/services/skills/__tests__/SkillsManager.spec.ts [shape: modify/modify]

- upstream: e3de60a7c — moves the shared fixture declarations (`HOME_DIR`, `PROJECT_DIR`, `SHARED_DIR`, `p`, `GLOBAL_ROO_DIR`, `GLOBAL_AGENTS_DIR`, `enoent`) out of the spec into the new `./skillsTestHarness` module and keeps every `vi.mock`/`vi.hoisted` call in the spec. It does **not** move `mockSymlinks`: that helper stays in upstream's own spec because it closes over the spec-local `mockLstat`, and upstream's harness is exactly the seven declarations the fork adopted.
- fork: 04ffb64bb7 — the fork commit that last shaped `SkillsManager.spec.ts`; at the batch base the spec still declared the four path constants and `p` locally and declared `GLOBAL_ROO_DIR`/`GLOBAL_AGENTS_DIR` further down, which the refactor's deletions remove.
- fork_locus: src/services/skills/__tests__/skillsTestHarness.ts
- resolution: upstream-adapted
- rationale: The harness import supplies exactly the six symbols the fork spec uses as bindings, so the declaration move is adopted. `enoent` is deliberately absent from the named import list: its only call sites are inside the harness self-test, which reaches it through `await import("./skillsTestHarness")` as `harness.enoent()`, so a named binding would be unused and rejected as dead code — the export itself is consumed and stays. `mockSymlinks` is not added because upstream never put it in the harness (see above) and the fork's spec has no `mockLstat` for it to close over; the upstream harness file is adopted byte-for-byte.
- rationale (dated note, 2026-11-26 — task 6 / D10): **the omission rationale above is SUPERSEDED, and is kept verbatim as history.** It expired when `de2ec1870b` landed the symlink predecessor (`7389d9836`): the spec now carries the symlink-container cases, so `enoent` is a live binding and `mockSymlinks` has a `mockLstat` to close over. The file was restored from `upstream/main` (`d672d7961a`) and is now **byte-identical to it** — `git diff upstream/main HEAD -- src/services/skills/__tests__/SkillsManager.spec.ts` is empty. The old `divergent-forever` value is likewise retired; see `divergence:` below.
- dropped: none
- evidence: src/services/skills/__tests__/SkillsManager.spec.ts plus safeFrontmatter, safeFrontmatterImportGuard and frontmatter-commands — 222 tests pass across the four specs after the restore (2026-11-26); gates: gate:sync
- divergence: none

### src/services/command/commands.ts [shape: modify/modify]

- upstream: f015dae53 — routes slash-command frontmatter through `parseFrontmatter`, so `---js`/`---toml`-style selectors throw instead of executing.
- fork: 252c69b5 — the fork's tree at the merge base, which is byte-identical to the batch base for this file (empty fork side), so the hunks applied without a marker.
- fork_locus: none
- resolution: upstream-adapted
- rationale: The fork never touched this file, so upstream's intent is adopted verbatim; the auto-merge needed no edit and no fork behaviour was at stake.
- dropped: none
- evidence: src/services/command/__tests__/frontmatter-commands.spec.ts — the malicious-frontmatter cases fail before the pick and pass after; 143 tests pass across the three specs; gates: gate:sync
- divergence: none

### src/services/command/__tests__/frontmatter-commands.spec.ts [shape: modify/modify]

- upstream: f015dae53 and 6843b60b8 — cover the rejected frontmatter selectors and the accepted YAML/JSON shapes for commands.
- fork: 252c69b5 — the fork's tree at the merge base; the spec carried no competing cases and no fork-side edit since.
- fork_locus: none
- resolution: upstream-adapted
- rationale: Both upstream commits add cases to a spec file the fork had not modified, so the additions apply cleanly and every pre-existing assertion survives.
- dropped: none
- evidence: src/services/command/__tests__/frontmatter-commands.spec.ts — passes with the new cases; 143 tests pass across the three specs; gates: gate:sync
- divergence: none

### src/utils/safeFrontmatter.ts [shape: empty-fork-side]

- upstream: 5e32badca — adds the shared, engine-pinned parser that strips a leading BOM, rejects any non-YAML/JSON selector and bypasses gray-matter's input-only parse cache.
- fork: 252c69b5 — the fork has no equivalent module; the file did not exist at the merge base.
- fork_locus: none
- resolution: upstream-adapted
- rationale: A brand-new module with no fork counterpart: the fork side is empty, so upstream's implementation is adopted verbatim.
- dropped: none
- evidence: src/utils/__tests__/safeFrontmatter.spec.ts — the BOM/selector/cache cases pass; the "only this module may hold gray-matter's callable export" boundary is enforced by src/utils/__tests__/safeFrontmatterImportGuard.spec.ts, which parses every file under `src/` with the TypeScript compiler and fails on a default/namespace/`require`/dynamic-import/`createRequire` reference anywhere else; 143 tests pass across the three specs; gates: gate:sync
- divergence: none

### src/utils/__tests__/safeFrontmatter.spec.ts [shape: empty-fork-side]

- upstream: 5e32badca and 252d9ce26 — cover the parser directly: BOM stripping, JSON skills, YAML tags, ambiguous selectors and additional languages.
- fork: 252c69b5 — the fork has no equivalent spec; the file did not exist at the merge base.
- fork_locus: none
- resolution: upstream-adapted
- rationale: Brand-new spec file with no fork counterpart, so it is adopted verbatim and stands as the parser's fix-equivalence evidence.
- dropped: none
- evidence: src/utils/__tests__/safeFrontmatter.spec.ts — passes; 143 tests pass across the three specs; gates: gate:sync
- divergence: none

### src/services/skills/__tests__/skillsTestHarness.ts [shape: empty-fork-side]

- upstream: e3de60a7c — adds the declaration-only harness module (path constants, `p`, `enoent`, the global directory paths) so the spec files share one fixture source.
- fork: 252c69b5 — the fork has no harness module; the file did not exist at the merge base.
- fork_locus: none
- resolution: upstream-adapted
- rationale: Brand-new module with no fork counterpart; adopting it verbatim keeps the fixture declarations in the one place upstream chose.
- dropped: none
- evidence: src/services/skills/__tests__/SkillsManager.spec.ts — the `skillsTestHarness platform branches` block exercises it on both platforms and passes; gates: gate:sync
- divergence: none

### docs/architecture/tla/Frontmatter.tla [shape: empty-fork-side]

- upstream: 6843b60b8, 5e32badca, 252d9ce26 and dc6d1435e — model the accepted frontmatter header shapes, then rename the module from `CommandFrontmatter` to `Frontmatter` and add case-sensitive selector acceptance.
- fork: 252c69b5 — the fork has no TLA module for frontmatter; the file did not exist at the merge base.
- fork_locus: none
- resolution: upstream-adapted
- rationale: The module is created and then renamed inside this same batch, so the range only ever shows the final `Frontmatter.tla`; there is no fork-side spec to reconcile and the upstream sequence is preserved exactly.
- dropped: none
- evidence: docs/architecture/tla/Frontmatter.tla — documentation only: no gate runs TLC, and nothing in `scripts/gate-sync.mjs` references `.tla`. The module models the same accept/reject table that `src/utils/__tests__/safeFrontmatter.spec.ts` and `src/services/command/__tests__/frontmatter-commands.spec.ts` assert at runtime; gates: gate:sync
- divergence: none

### docs/architecture/tla/Frontmatter.cfg [shape: empty-fork-side]

- upstream: 6843b60b8, 5e32badca and dc6d1435e — the default TLA configuration for the accepted-header model, renamed from `CommandFrontmatter.cfg`.
- fork: 252c69b5 — no fork counterpart; the file did not exist at the merge base.
- fork_locus: none
- resolution: upstream-adapted
- rationale: Created and renamed within the batch; no fork-side content exists to weigh against upstream's.
- dropped: none
- evidence: docs/architecture/tla/Frontmatter.cfg — paired with the spec above; gates: gate:sync
- divergence: none

### docs/architecture/tla/Frontmatter.NoBomStrip.cfg [shape: empty-fork-side]

- upstream: 6843b60b8 and 5e32badca — the no-BOM-strip TLA configuration, renamed from `CommandFrontmatter.NoBomStrip.cfg`.
- fork: 252c69b5 — no fork counterpart; the file did not exist at the merge base.
- fork_locus: none
- resolution: upstream-adapted
- rationale: Created and renamed within the batch; this configuration isolates the "leading BOM is not stripped" variant, so adopting upstream's file verbatim keeps the model's scenario name and its constant assignment consistent with `Frontmatter.tla`.
- dropped: none
- evidence: docs/architecture/tla/Frontmatter.NoBomStrip.cfg — paired with the spec above; gates: gate:sync
- divergence: none

### docs/architecture/tla/Frontmatter.None.cfg [shape: empty-fork-side]

- upstream: 6843b60b8 and 5e32badca — the no-frontmatter TLA configuration, renamed from `CommandFrontmatter.None.cfg`.
- fork: 252c69b5 — no fork counterpart; the file did not exist at the merge base.
- fork_locus: none
- resolution: upstream-adapted
- rationale: Created and renamed within the batch; the fork side is empty for this path.
- dropped: none
- evidence: docs/architecture/tla/Frontmatter.None.cfg — paired with the spec above; gates: gate:sync
- divergence: none

### docs/architecture/tla/Frontmatter.CaseSensitive.cfg [shape: empty-fork-side]

- upstream: dc6d1435e — the case-sensitive-selector configuration that models which header spellings are accepted.
- fork: 252c69b5 — no fork counterpart; the file did not exist at the merge base.
- fork_locus: none
- resolution: upstream-adapted
- rationale: A brand-new configuration file added by the last-but-one pick in the chain; there is no fork-side version to preserve.
- dropped: none
- evidence: docs/architecture/tla/Frontmatter.CaseSensitive.cfg — paired with the spec above; gates: gate:sync
- divergence: none

## Fork-side divergence (declared)

- **File:** `src/services/skills/SkillsManager.ts` — declared 2026-11-26 (task 6, decision **D11**).
- **Upstream form** (`upstream/main` = `d672d7961a`, introduced by `5e32badca`): `import matter from "gray-matter"`,
  then `matter.stringify({ content: body }, frontmatter)`.
- **Fork form:** `import { stringify } from "gray-matter"`, then `stringify({ content: body }, frontmatter)`.
- **Why:** `src/utils/__tests__/safeFrontmatterImportGuard.spec.ts` default-denies every module under `src/` that holds
  gray-matter's callable export — a default import, a namespace import, `require(...)`, a dynamic `import(...)`, a
  side-effect import, a re-export, `import x = require(...)` or a `createRequire` indirection — and exempts only
  `src/utils/safeFrontmatter.ts` and itself. `stringify` is a pure serializer: it cannot parse a document header, so it
  cannot select an engine, and the named binding is the guard's own sanctioned shape (`ALLOWED_NAMED_BINDINGS =
  {"stringify"}`). The guard is the P0's enforcement mechanism; a module that could call `matter(...)` is exactly what it
  exists to prevent.
- **Byte-identity with upstream is deliberately NOT claimed for this file.** The remaining delta is exactly the import
  line plus the one `matter.stringify(` → `stringify(` call site, and nothing else
  (`git diff upstream/main HEAD -- src/services/skills/SkillsManager.ts`). The guard was not weakened and this file was
  not added to any allow-list.
- **D11 inventory sweep.** `git grep 'from "gray-matter"' upstream/main -- src/` returns exactly two files:
  `src/utils/safeFrontmatter.ts` (the sanctioned holder, byte-identical) and `src/services/skills/SkillsManager.ts`
  (declared here). No other upstream `src/` module imports gray-matter, so this is the complete divergence set.
- **Spec side:** `src/services/skills/__tests__/SkillsManager.spec.ts` **is** byte-identical to `upstream/main`; the
  earlier `enoent`/`mockSymlinks` omission is superseded by `de2ec1870b`, with that history retained in the block above.
