# Frame outcome pilot (2026-11-09): B1 material built, six runs UNRUN

The outcome-arm material now exists: three snapshots (12 / 11 / 12 files, 84K / 72K / 80K, 5 / 4 / 5
commits), a six-run B1 harness and a blind scoring sheet. All three reproduce deterministically — B1
exits **1** with `# tests 5 / # pass 1 / # fail 4`, B2 exits **0** with 8/8 plus a fixed work counter,
B3 exits **0** with 11/11. The six B1 runs are **UNRUN**: no model ran, no transcript exists, no
`meta.json` has `status: "RUN"`, no score was entered. Harness and scoring sheet are ready for a human.

**Not done:** no 54-run panel, no model run, no score, no verdict, no frame decision.

## 1. What was built

| Snapshot              | Files | Size | Commits | `./run.sh` default                                | One-command reproduction                                                                                                |
| --------------------- | ----- | ---- | ------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `b1-failing-ci`       | 12    | 84K  | 5       | exit **1**, `# tests 5 / # pass 1 / # fail 4`     | [`snapshots/b1-failing-ci/run.sh`](../../test-fixtures/frames/outcome-arm/snapshots/b1-failing-ci/run.sh:1)             |
| `b2-slow-path`        | 11    | 72K  | 4       | exit **0**, 8/8 tests, one `bench` line           | [`snapshots/b2-slow-path/run.sh`](../../test-fixtures/frames/outcome-arm/snapshots/b2-slow-path/run.sh:1)               |
| `b3-confusing-module` | 12    | 80K  | 5       | exit **0**, 11/11 tests, then `git log --oneline` | [`snapshots/b3-confusing-module/run.sh`](../../test-fixtures/frames/outcome-arm/snapshots/b3-confusing-module/run.sh:1) |

All three were executed for this report on `/tmp` copies; the counts above are observed stdout.

### b1-failing-ci — "failing CI, no local repro"

**What it is.** A dependency-free Node.js tool that rolls timestamped incident events into one bucket
per calendar day, with a per-severity breakdown and days ordered busiest first. The suite uses
`node:test` only; there is nothing to install.

**The failing mechanism.** [`src/dates.mjs`](../../test-fixtures/frames/outcome-arm/snapshots/b1-failing-ci/src/dates.mjs:8)
parses each event with `new Date(timestamp)` and then derives the day label with the host-local
accessors `getFullYear` / `getMonth` / `getDate`
([line 14](../../test-fixtures/frames/outcome-arm/snapshots/b1-failing-ci/src/dates.mjs:14)). The label
therefore depends on the process time zone, not the event's own `Z` offset. The office zone is three
hours behind UTC, so the events at `2026-10-02T00:30Z`, `2026-10-02T02:15Z` and `2026-10-03T01:10Z`
fall on Oct 1 / Oct 1 / Oct 2 in the office and on Oct 2 / Oct 2 / Oct 3 under `TZ=UTC`. Verified by
executing both environments: buckets go from `4 / 3 / 1` (office) to `4 / 2 / 2` (UTC), and because
[`src/rollup.mjs`](../../test-fixtures/frames/outcome-arm/snapshots/b1-failing-ci/src/rollup.mjs:33)
sorts by total descending then day ascending, the order flips from
`[2026-10-01, 2026-10-02, 2026-10-03]` to `[2026-10-02, 2026-10-01, 2026-10-03]`.

**Evidence available to a solver.**

- `ci/last-failure.log` — 259 real TAP lines showing actual versus expected for four tests.
- `ci/pipeline.yml` — pins `TZ: UTC`, `CI: "1"`, `LANG: C.UTF-8` with no explanatory comment.
- The `--local` versus default differential: same tree, same data, exit 0 and exit 1.
- A 5-commit history (`e961e5f`, `9676824`, `41651f1`, `a897a81`, `cf4eed4`) for `git blame` / `git bisect`.
- Determinism: two consecutive runs differ only in `duration_ms` values, so the failure is stable.
- Grep found exactly two `UTC` hits — `ci/pipeline.yml:10` and `run.sh:38` — and no
  `timezone` / `offset` / `boundary` wording anywhere in the tree.

**What must still be inferred.** That the day label must come from the event's own offset rather than
the process zone; which of the eight events straddle the boundary and why; and that making the two
environments agree is the requirement, not changing either environment (environment-gating is a
disallowed fix).

**Most revealing README sentence.**

> `./run.sh` fails. `./run.sh --local` passes. Same commit, same data file, same assertions, no edits
> in between.

It narrows the search to what differs between two invocations of the same code — a strong pointer to
environment — without naming time zones or the date accessors.

**What "fixed" means** (the snapshot's own definition): `./run.sh` exits 0 **and** `./run.sh --local`
still exits 0, with the fixture data, module behaviour and existing assertions unchanged; both
environments must agree on each event's day and on the order of days.

### b2-slow-path — "make this endpoint 3× faster"

**What it is.** A dependency-free Node.js module with one read-only endpoint returning a per-region
order summary (counts, units, gross/discount/net in integer cents, leading category, batch totals)
over a fixed, seeded batch of 70 000 orders.

**The slow mechanism.** `resolve()` in
[`src/summarise.mjs`](../../test-fixtures/frames/outcome-arm/snapshots/b2-slow-path/src/summarise.mjs:6)
walks the `customers`, `products` and `tiers` tables from index 0 **for every order**, so work scales
as orders × reference-table size. The `stats` counter in
[`src/stats.mjs`](../../test-fixtures/frames/outcome-arm/snapshots/b2-slow-path/src/stats.mjs:8)
exposes the total: `work=315172190` counted comparisons. The tables are invariant across orders, so the
walk is redundant; an audit experiment on a throwaway copy (not shipped) built the index once and
collapsed the same workload to `work=0` at roughly 23 ms — about 70×, well past the 3× bar — with all
8 assertions still green.

Observed here: `./run.sh` exits 0 with `# tests 8 / # pass 8 / # fail 0` and prints
`bench orders=70000 work=315172190 elapsed_ms=<varies> net_cents=53808472913`; `work` and `net_cents`
are identical across runs, only `elapsed_ms` varies.

**Evidence available to a solver.**

- The benchmark line itself, including the deterministic `work` counter.
- The four-commit history (`bbc7ba4`, `c17012a`, `751e286`, `2780b11`) and the README baseline.
- `test/summarise.test.mjs` and `test/endpoint.test.mjs`, which pin output shape and values.

**What must still be inferred.** Which of the three lookups dominate; that the reference tables never
change between orders; and that an index must preserve the existing ordering and rounding so the
summary stays byte-identical.

**Most revealing README sentence.**

> Shrinking the workload, skipping orders, memoising results between runs, or dropping fields from the
> response is not a fix: the returned summary must stay identical for every input.

It removes the four cheap escapes and forces an algorithmic change, without pointing at `resolve()`.

**What "fixed" means:** `./run.sh` still exits 0, `--bench` prints the same `net_cents`, and measured
`elapsed_ms` is at least 3× smaller on the same workload and fixed input, with every existing
assertion still passing.

### b3-confusing-module — "explain why this module is structured this way"

**What it is.** A dependency-free Node.js module that turns one scanner line from a warehouse label
feed into a six-field record, plus a small command that prints its behaviour for two sample lines.

**The confusing mechanism.** [`src/labels.mjs`](../../test-fixtures/frames/outcome-arm/snapshots/b3-confusing-module/src/labels.mjs:5)
is a pure rename facade (`parseRecord → parseLabel`, `readRecord → scanRecord`), so the entry point
holds no logic. [`src/internal/parse.mjs`](../../test-fixtures/frames/outcome-arm/snapshots/b3-confusing-module/src/internal/parse.mjs:35)
routes wide records to `readWide`, which calls the newer `readRecord`
([line 49](../../test-fixtures/frames/outcome-arm/snapshots/b3-confusing-module/src/internal/parse.mjs:49))
and then **overwrites** `weight_g` and `dock` with the legacy conversions at
[lines 51–52](../../test-fixtures/frames/outcome-arm/snapshots/b3-confusing-module/src/internal/parse.mjs:51);
the new reader is live for four fields and dead for two. Two tables hold the same six names in
different orders — `COLUMN_ORDER` for the returned key order, `LAYOUT_COLUMNS` for the 2019 ingest
positions — and the duplication is load-bearing: wide records are re-ordered through `COLUMN_ORDER`
and reassembled from `LAYOUT_COLUMNS`. Only commits `66d7ab7` (a partial rollback after `"1,5kg"` was
mis-read as 15 g) and `ec5a281` (the archive projector's positional dependency, tracking issue #4711)
explain why. No code comment explains any of it.

The fixture carries **4 narrative commits plus 1 mechanical bundle commit** (`6c2852b`), which
satisfies the "3–4 commits whose messages explain the history" requirement with the bundle commit
added for clone-reproducibility.

**Evidence available to a solver.**

- The narrative history (`bc78bc8`, `3699141`, `66d7ab7`, `ec5a281`) with its two explaining revert/restore commits.
- `demo.mjs` output and `test/tables.test.mjs`, which pin the ordering relationship.
- Both tables, readable at `path:line`.
- A green suite, so no failure points at the answer.

**What must still be inferred.** Why the new reader is live for four fields and dead for two; that the
duplicate tables differ in purpose rather than by accident; and what the alternatives would have cost
(the decimal-comma mis-parse and the projector's positional dependency).

**Most revealing README sentence.**

> covers every table of field names in the tree and the exact relationship between them.

It tells an answerer that the two tables are the crux and that a comparison is expected, while leaving
the direction and purpose of each unstated.

**What "fixed" means:** nothing is broken; a correct answer is a written explanation citing `path:line`
for every structural claim, naming at least one decision the alternatives would have changed, covering
every reachable path through the public surface and every table of field names. Editing the source is
not required and does not by itself score.

**History packaging decision (applies to all three).** A live `.git` cannot be tracked by the parent
repository — git stores an embedded repository as a gitlink and will not add its contents — so each
snapshot ships a real `git bundle` and `./run.sh --init-history` materialises it on demand. The
consequence is that after `--init-history` the tree shows one expected dirty line, ` M history.bundle`,
because a bundle cannot contain itself.

## 2. What was executed

**The six B1 runs are UNRUN.** No model run was executed; there is no `runs/` directory, no transcript,
no `meta.json` with `status: "RUN"`, and no score.

Why: no provider credentials here; the repository's CLI (`apps/cli`) is unbuilt and needs an install
plus network; and this work was required to be network-free.

| Run   | Arm     | Mode         | Status | Transcript |
| ----- | ------- | ------------ | ------ | ---------- |
| `r01` | `arm-a` | `debug`      | UNRUN  | —          |
| `r02` | `arm-b` | `bug-report` | UNRUN  | —          |
| `r03` | `arm-b` | `bug-report` | UNRUN  | —          |
| `r04` | `arm-a` | `debug`      | UNRUN  | —          |
| `r05` | `arm-a` | `debug`      | UNRUN  | —          |
| `r06` | `arm-b` | `bug-report` | UNRUN  | —          |

The commands a human runs, verbatim:

```
export PILOT_MODEL='<model-id>'
export PILOT_RUNNER_CMD='node /abs/path/to/apps/cli/dist/index.js --print "$(cat %PROMPT_FILE%)" --mode %MODE% -w %WORKSPACE% --output-format stream-json > %OUT_FILE%'
test-fixtures/frames/outcome-arm/run-b1-pilot.sh --model "$PILOT_MODEL" --runner "$PILOT_RUNNER_CMD" --out test-fixtures/frames/outcome-arm/runs
```

Re-blinding only (no run, no model): `test-fixtures/frames/outcome-arm/run-b1-pilot.sh --blinder-only
--out test-fixtures/frames/outcome-arm/runs`.

Dry run (no runner, nothing measured):
`test-fixtures/frames/outcome-arm/run-b1-pilot.sh --dry-run --out /tmp/b1-dry`.

What the harness verifiably does, from its source and from a dry run executed for this report:

- Six runs in the fixed order `a b b a a b`; `--runs` rejects anything but `3`.
- A fresh `cp -R` workspace per run, refusing to reuse an existing run directory without `--force`.
- `./run.sh --init-history`, then a red pre-state captured to `pre-state.log` / `pre-state.exit`
  (observed: exit 1); a green pre-state is recorded `INVALID`, not scored.
- Exactly one arm installed as `<workspace>/.roomodes`, with its sha256 recorded in `meta.json`.
- `prompt.txt` of exactly **60 bytes** — `CI is red on a test that passes locally. I have no idea why.`
  — with no trailing newline (verified with `wc -c`).
- `temperature: 0`; `tool_grants: ["read","edit","command"]` parsed from the installed arm file.
- `meta.json` with the enumerated fields `run_id`, `brief`, `brief_text`, `brief_source`, `arm`, `mode`,
  `model`, `temperature`, `tool_grants`, `snapshot`, `snapshot_commit`, `arm_file`, `arm_file_sha256`,
  `runner`, `status`, `reason`, `invalid_reason`, `exit_code`, `started_at`, `finished_at`,
  `duration_s`, `pre_state_exit`, `transcript`, `blinded_as`.
- Blinding into `runs/_blinded/case-NN.md` via a seeded permutation of run-ids, a secret map, and a
  residue check that fails the run on any surviving arm/mode/run-id token.

The mechanism was exercised with `--dry-run` (six UNRUN records, `RUN=0 UNRUN=6 INVALID=0 REFUSED=0`)
and, during the audit, with a synthetic out-of-repo fixture that found the path-scrub ordering bug.
**No measurement came from either.**

## 3. Pilot reading rule

**The pre-registration contains no pilot reading rule and no tier called "the simplest brief".** It
contains §6 (the arm-versus-arm decision rule) and §9 (a separate first-run human-observation rule). The
wording quoted in the task brief — "if the two arms cannot be separated on the simplest brief…" — does
not exist in the document; a repository search returns no such sentence, and the scoring sheet's §2 says so.

§5's blind-scoring rule, verbatim:

> **Blind-scoring rule:** the scorer receives the transcript with all mode names replaced by `MODE-X`.
> If de-blinding happens for any run, that run is reported separately.

§6, verbatim:

> | Result                                                          | Decision                                                                                                          |
> | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
> | One arm +≥ 10 pp, CI excluding zero, on ≥ 2 of 3 briefs         | **Adopt that frame** for the catalogue structure                                                                  |
> | Difference < 10 pp, or CI includes zero, or mixed across briefs | **H3 stands: one catalogue, two views.** No frame wins; the next increment is UI and `planner`, not restructuring |
> | Both arms fail a brief systematically (< 40% pass)              | The _doctrine_ is wrong, not the frame. Stop frame work; fix the six shared doctrines and re-run                  |

The three rows in words: (1) an arm wins only with ≥ 10 points, a CI excluding zero, on ≥ 2 of 3
briefs; (2) anything smaller, zero-crossing or mixed leaves H3 in force and moves the next increment to
UI and `planner`; (3) if both arms fail a brief below 40% pass, the doctrine is at fault and work stops.

Applying the pre-registered rule rather than a fresh judgement: with **zero** of the six runs executed
there is no success rate, no difference and no confidence interval, so **no row of §6 can be
evaluated** — row 1 needs ≥ 10 pp with a CI excluding zero on ≥ 2 of 3 briefs; row 2 needs a measured
difference below 10 pp or a CI including zero; row 3 needs both arms below 40% pass. The pilot returns
**no result**, which is not a licence to conclude "we need more data": it means the pilot has not been run.

An arithmetic limit holds even after execution: 3 runs per arm cannot produce the §6 comparison at the
stated power, so a six-run pilot can only report **descriptive counts**; §6's thresholds are for the
54-run panel. Per §7, per-model comparisons are underpowered and descriptive-only.

**Recommendation (orchestrator recommendation, not a pre-registered outcome).**

- **Proceed to the full 54-run panel** once one model completes the six-run B1 pilot and a second person
  scores the blinded cases. Reason: the material supply — the binding constraint — is removed, and the
  remaining risk is harness validity, which the pilot probes cheaply.
- **Change the briefs before a full run** only if the pilot shows both arms at 6/6 or 0/6 on B1, a
  ceiling or floor §6 row 3 would read as doctrine failure — the brief, not the frame, then limits.
- **The two-view conclusion** (H3: one catalogue, two views) remains the default under §6 row 2 and is
  what the pre-registration says applies absent a ≥ 10 pp difference. Reason: H3 is the null the design
  was built to accept, and the pre-commitment binds unless the data exclude it.

None of these has occurred; the pilot has not been run.

## 4. What the snapshots cannot test

- **Real repository scale** — three fixtures of 84K / 72K / 80K cannot represent tens of thousands of
  files or cross-module archaeology, so a solver's navigation cost is radically understated.
- **Real CI infrastructure** — a one-line `TZ` pin replaces container images, caches, matrix builds and
  flaky runners, so environment-dependent failures are represented by one clean mechanism only.
- **Real user intent** — all three briefs are `CONSTRUCTED` one-liners under §3's sourcing rule, with no
  tracker text, so the ambiguity a real report carries is absent.
- **Real model/provider variation** — one runner, one temperature and one tool set; the panel needs three
  families and reports per-model results separately.
- **Languages other than Node.js and tooling beyond `node:test` / `git`** — no compiled build, no package
  manager resolution, no other ecosystem's idioms.
- **Non-deterministic failure modes** — seeded data only, with no flake, timing race or network failure,
  so diagnosis is cleaner than in production.
- **Permission and sandbox behaviour** — grants are recorded in `meta.json` but nothing enforces them, so
  a policy violation would not be observable.
- **Reviewer-independent scoring** — the sheet exists, but §8's second-scorer check on 20% of runs
  requires a person.
- **B2's timing sensitivity** — even with a deterministic work counter, `elapsed_ms` still depends on host
  load, which is why the counter, not the clock, is the comparable number.

## 5. Defects found and NOT fixed

No doctrine was changed. A doctrine defect found during a test is reported, not fixed mid-test.

| Defect                                                                                                                                                 | Where                                                                                                                                                    | Why it was not fixed                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| The pre-registration lists "same brief text" as a Control in §2 but contains no brief text, so the control cannot be falsified from the document       | [`docs/reviews/2026-11-09-frame-decision-preregistration.md`](2026-11-09-frame-decision-preregistration.md:31), §3                                       | Changing a filed pre-registration after material exists would invalidate the registration; it is disclosed instead                 |
| §3 promises `generate-frame-fixtures.mjs --outcome-arm` and no such mode exists (the script has no CLI argument handling at all)                       | [`scripts/generate-frame-fixtures.mjs`](../../scripts/generate-frame-fixtures.mjs:1); disclosure in the arm README's amendment log                       | The six modes were hand-written and disclosed before any trial, which is the pre-registration's own remedy                         |
| §4 step 6 names the report path `docs/reviews/<date>-frame-outcome-arm.md`, while this task specified `docs/reviews/2026-11-09-frame-outcome-pilot.md` | [`docs/reviews/2026-11-09-frame-decision-preregistration.md`](2026-11-09-frame-decision-preregistration.md:67)                                           | The report is written at the task-specified path; this mismatch is recorded rather than resolved unilaterally                      |
| The arm files' header comments say only `slug`, `name` and `whenToUse` differ, but `description` also differs in all three pairs                       | [`arm-a.roomodes`](../../test-fixtures/frames/outcome-arm/arm-a.roomodes:2), [`arm-b.roomodes`](../../test-fixtures/frames/outcome-arm/arm-b.roomodes:2) | Editing an arm file changes the treatment; the arm README states the correct list, and the comments are left as filed and reported |
| The B1 brief text is not pre-registered; it comes from the bake-off run document and is marked `CONSTRUCTED`                                           | [`docs/reviews/2026-11-09-frame-bakeoff-run.md`](2026-11-09-frame-bakeoff-run.md:146)                                                                    | Pre-registration cannot be back-filled after material exists; the harness records `brief_source` in every `meta.json`              |

## 6. Reproduction

B1 (run on a copy if you do not want a `.git` created inside the fixture tree):

```
cd test-fixtures/frames/outcome-arm/snapshots/b1-failing-ci
./run.sh --init-history     # expected: "history: restored from history.bundle", exit 0
./run.sh                    # expected: exit 1; "# tests 5 / # pass 1 / # fail 4"
./run.sh --local            # expected: exit 0; "# tests 5 / # pass 5 / # fail 0"
```

B2:

```
cd test-fixtures/frames/outcome-arm/snapshots/b2-slow-path
./run.sh --init-history     # expected: exit 0, history restored
./run.sh                    # expected: exit 0; "8 pass"; bench line with net_cents=53808472913
./run.sh --bench            # expected: exit 0; one "bench orders=70000 work=315172190 ..." line
```

B3:

```
cd test-fixtures/frames/outcome-arm/snapshots/b3-confusing-module
./run.sh --init-history     # expected: exit 0, history restored
./run.sh                    # expected: exit 0; 11 pass; behaviour table; "add fixture history bundle" first in git log
```

Harness:

```
test-fixtures/frames/outcome-arm/run-b1-pilot.sh --dry-run --out /tmp/b1-dry
# expected: exit 0; "run-b1-pilot: RUN=0 UNRUN=6 INVALID=0 REFUSED=0"; nothing measured

test-fixtures/frames/outcome-arm/run-b1-pilot.sh --blinder-only --out /tmp/b1-dry
# expected: exit 0; summary table plus "blind_seed: 2026-11-09"
```

Gate:

```
node scripts/verify-docs-no-public-ip.mjs
# expected: exit 0, clean
```

## 7. Definition of done

| Item                                                                                          | Status                                          | Evidence                                                                                                                       |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Scoring sheet warns that the raw `runs/` trees are de-blinded                                 | Done                                            | `scoring-sheet-b1.md`, warning paragraph above the harness link; §5/§6 blocks unchanged                                        |
| Scoring sheet §5/§6 remain byte-identical to the pre-registration                             | Done                                            | `diff` of the quoted blocks against the pre-registration returns clean                                                         |
| README Status table reflects what exists                                                      | Done                                            | `snapshots/b1-failing-ci`, `snapshots/b2-slow-path`, `snapshots/b3-confusing-module`, `run-b1-pilot.sh`, `scoring-sheet-b1.md` |
| README records the B1 pilot as unrun                                                          | Done                                            | Status row: "UNRUN — no model run has been executed"                                                                           |
| README Operational notes cover bundle history, the one dirty line, the pinned order, blinding | Done                                            | "Operational notes" section                                                                                                    |
| README Amendment log entry dated 2026-11-10                                                   | Done                                            | Second Amendment log row; `.roomodes` untouched, pilot not executed                                                            |
| Control table, disclosed asymmetries and doctrine statements untouched                        | Done                                            | No diff in those sections                                                                                                      |
| Report sections 1–7 exist and every relative link resolves                                    | Done                                            | This document; link-target check                                                                                               |
| Six B1 runs executed and scored                                                               | **UNRUN — harness and scoring sheet delivered** | Section 2; no `runs/` tree, no transcript, no score                                                                            |
| No IPv4 literal in the report                                                                 | Done                                            | `grep -nE '([0-9]{1,3}\.){3}[0-9]{1,3}'` returns no output                                                                     |
| Changes confined to the outcome-arm directory and this report                                 | Done                                            | `git status --porcelain -uall` compared before and after                                                                       |
