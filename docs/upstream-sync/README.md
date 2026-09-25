# Upstream Sync — Operating Manual

How Roo+ consumes changes from `Zoo-Code-Org/Zoo-Code` in small, prioritised,
independently shippable batches instead of whole-history merges.

> **Agents:** follow [`../runbooks/upstream-sync.md`](../runbooks/upstream-sync.md) — the agent-executable runbook (hard rules, stop conditions, copy-paste prompts, definition of done). **This file is reference material:** it explains and computes, but does not issue imperatives.

| Artefact                                                                                     | Role                                                                                                                      |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| [`pending-upstream-commits.md`](pending-upstream-commits.md)                                 | The register: every upstream commit, classified, prioritised, batched, with status. **Source of truth for what remains.** |
| [`../adr/adr-upstream-sync-triage-strategy.md`](../adr/adr-upstream-sync-triage-strategy.md) | Why the strategy exists (classes, priorities, rejected alternatives).                                                     |
| This file                                                                                    | How to execute a batch, and how to fold _new_ upstream commits into the register.                                         |

---

## 1. Prerequisites — never triage from a shallow clone

This checkout is shallow by default. With a shallow upstream ref,
`git merge-base` returns **nothing** and `git rev-list --count upstream/main`
reports only the fetch window (22), not the real backlog (102). Deepen first:

```bash
git fetch --deepen=400 upstream main
git fetch --prune upstream
git rev-parse --is-shallow-repository     # re-check; a real merge base is required
git merge-base upstream/main master        # must print a SHA
```

> **Shell gotcha.** The default shell on this host is `/bin/sh` (dash), which does
> not support process substitution (`<(…)`). Wrap multi-line analyses in
> `bash -c '…'` or they fail with `Syntax error: "(" unexpected`.

## 2. Compute the divergence and conflict surface

```bash
bash -c '
MB=$(git merge-base upstream/main master)
echo "merge base: $MB"; git log -1 --format="  %ad %s" --date=short $MB
printf "pending upstream: "; git rev-list --count master..upstream/main
printf "fork-only:        "; git rev-list --count upstream/main..master

# files changed by each side since the merge base
git diff --name-only $MB master       | sort > /tmp/fork.txt
git diff --name-only $MB upstream/main | sort > /tmp/up.txt
comm -12 /tmp/fork.txt /tmp/up.txt > /tmp/both.txt     # <-- the conflict surface
printf "conflict surface (files changed by both): "; wc -l < /tmp/both.txt

# per-commit triage input: overlap size + hot-file hits
for sha in $(git rev-list --reverse master..upstream/main); do
  git show --pretty="" --name-only $sha | grep -v "^$" | sort -u > /tmp/c.txt
  nf=$(wc -l < /tmp/c.txt); nov=$(comm -12 /tmp/c.txt /tmp/both.txt | wc -l)
  printf "%s|%s|%s|%s\n" "$(echo $sha | cut -c1-9)" "$nov" "$nf" "$(git log -1 --format=%s $sha)"
done
'
```

## 3. The classifier — deterministic rules

Classification uses **git-derived evidence**, then judgement. Reproduce the
evidence before disagreeing with a class in the register.

| Signal                           | How to measure                                                                                                                          | Effect                                                                                                                           |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Δ (overlap — fork-side only)** | `comm -12` of the commit's files vs `/tmp/both.txt`                                                                                     | `Δ 0` → `A-CLEAN` **only if the commit has no unsynced upstream predecessor** (see below); `1–3` → `B-CAREFUL`; larger → inspect |
| **Structural hit**               | commit touches `src/core/webview/webviewMessageHandler.ts`, `src/core/webview/ClineProvider.ts`, or areas the fork restructured         | → `C-REIMPLEMENT` (fork's handler is a 131-line router; upstream's is 4206 lines)                                                |
| **Telemetry hit**                | `git log -S captureEvent` / telemetry paths                                                                                             | → `C-REIMPLEMENT` or `X-REJECT` (fork has 0 telemetry refs)                                                                      |
| **Scope of concern**             | commit touches `src/package.json` version, `CHANGELOG*`, `locales/*/README.md`, `Announcement.tsx`                                      | → `D-LOCAL` (fork owns versioning/announcements)                                                                                 |
| **Lockfile-only**                | files ⊆ `pnpm-lock.yaml` / dependency manifests                                                                                         | → `D-LOCAL` (regenerate via `renovate.json`, don't import)                                                                       |
| **Upstream automation**          | files ⊆ `.github/**`, `.coderabbit*`, `CONTRIBUTING.md` with no runtime code                                                            | → `E-SKIP`                                                                                                                       |
| **Gated core file**              | path appears in `CORE_FILES` in [`verify-upstream-code-index-alignment.mjs`](../../scripts/verify-upstream-code-index-alignment.mjs:92) | Clean-pick signal — but the gate must pass afterwards                                                                            |
| **Intent prefix**                | `fix`/`security`/`perf` → `P0`/`P1`; `feat` → `P2`; `chore`/`lint`/`test`/`ci` → `P3`                                                   | Sets priority (before value override)                                                                                            |
| **Value override**               | data loss, security, crash, stall                                                                                                       | Raises to `P0` even if `chore`/`fix` prefix                                                                                      |

**Before trusting `Δ 0`: the empty-fork-side test (added 2026-09-16).** `Δ` measures
overlap with files the fork changed, so it is **blind to upstream precedence**. A commit can have
`Δ = 0` and still not be pickable, because its upstream _predecessor_ has not been synced: the
fork side then equals the merge base, and the incoming diff is a delta on a model/feature entry
the fork does not have. Test for it before picking:

```bash
git show <sha> -- <file>          # upstream's pre-image for the conflicted hunk
git show <merge-base>:<file>      # compare with the fork's content (fork never touched it?)
git merge-base --is-ancestor <candidate-predecessor> <sha>   # is it a git descendant?
```

If the conflict is against an **empty fork side** while upstream's pre-image differs, the row is
dependency-blocked: move it to a prerequisite batch (the `SYNC-13` pattern) and land the
predecessor first. Six of the first twelve rows labelled `A-CLEAN` failed exactly this way.

**Priority rubric.** `P0` = security or data-loss/durability. `P1` = correctness
in a core flow the user feels (task lifecycle, approvals, provider responses).
`P2` = feature/model support. `P3` = hygiene, lint, tests, refactors. `P4` =
not applicable to the fork.

**`quick-win` flag** = `A-CLEAN` **and** `P0`–`P2` **and** small diff. These are
the "sync today" set.

## 4. Running a batch

One batch = one theme = one branch = one PR.

### 4.1 Branch and pick

```bash
git checkout master && git pull
git checkout -b sync/sync-1-security-safety
git cherry-pick -x <sha> [<sha>…]     # -x records the upstream SHA for provenance
```

`-x` matters: it makes the register's "fork SHA" column verifiable and keeps the
provenance of each ported change auditable.

### 4.2 Resolve conflicts by intent, not by side

When a pick conflicts, do **not** default to `--ours`/`--theirs`:

```bash
git show <sha> -- <file>                          # what upstream intended (+ its PR body)
git blame -L <a>,<b> HEAD -- <file>               # what the fork intended, attributed to the hunk
git log -L <a>,<b>:<file>                         # fallback for a brand-new (unblameable) hunk
```

The file-scoped `git log --oneline <merge-base>..master -- <file>` is a fallback
**only** for a brand-new hunk: after a rebrand sweep and the `-x` imports it
returns churn rather than intent, which is why fork intent is attributed with
`git blame -L`.

Resolve so **both intents survive**: upstream's bugfix logic, expressed in the
fork's structure (decomposed handlers, typed messages, branding, no telemetry).
Escape conflict markers with `\` when writing diffs (`\<<<<<<<`).

Write the two intents, the fork locus, the closed-set resolution and the
fail-before/pass-after evidence into the batch's resolution record
([`resolutions/_TEMPLATE.md`](resolutions/_TEMPLATE.md)) and check it with
`node scripts/verify-resolutions.mjs --batch SYNC-<n> --base <base> --head <ref>`
before the gate chain — a batch with a conflicted file and no block fails by name.

### 4.3 Re-apply branding

Upstream strings leak `Zoo Code` / `zoo-code` tokens. Normalise from the repo root:

```bash
bash scripts/full-rebrand.sh
```

Then confirm the code-index gate's branding normalisation still passes (§5) — it
compares `Roo-Plus ↔ Zoo-Code` tokens explicitly.

### 4.4 Mandatory gate chain

No batch merges without all of these passing. The chain has **one** source of
truth — the `gate:sync` aggregate — so this section and
[`../runbooks/upstream-sync.md`](../runbooks/upstream-sync.md) TASK 6 can never
drift apart (they used to list different chains, and the runbook was the weaker
one):

```bash
pnpm gate:sync     # every gate, in order: the node gates, the scripts unit tests,
                   # the resolution-integrity scan (markers + `git diff --check`) and the type check
```

The list itself lives in [`../../scripts/gate-sync.mjs`](../../scripts/gate-sync.mjs:1)
(`--list`/`--help` print it); adding or removing a gate is a one-line change
there, and a test fails if either document restates a divergent command list.

Rationale: these gates _are_ the fork's invariants. A sync that breaks one has
regressed the fork, regardless of how clean the pick looked.

### 4.5 Tests, lint, suppression ratchet

Run tests **from the package that declares Vitest** (never from the repo root):

```bash
cd src         && npx vitest run core/task/__tests__/Task.spec.ts
cd webview-ui  && npx vitest run src/components/chat/__tests__/ChatView.spec.tsx
```

ESLint suppressions may **never increase**:

```bash
pnpm --dir src exec eslint --prune-suppressions --max-warnings=0 <relative-file>
```

Prefer fixing lint in the picked code over suppressing it. `eslint-suppressions.json`
is one of the most-diverged files (12 upstream touches) — expect friction there.

### 4.6 Close out the register

Update [`pending-upstream-commits.md`](pending-upstream-commits.md): set the
commit's status to `☑` and append the fork SHA, then re-check the summary counts.
A batch is not done until the register says so. Cite the batch's resolution
record ([`resolutions/`](resolutions/_TEMPLATE.md)) in the batch's **Notes.**
block so the per-file judgement is reachable from the row.

## 5. Class playbooks

| Class           | Do                                                                                                                   | Don't                                                                                                               |
| --------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `A-CLEAN`       | `git cherry-pick -x`, run gates, ship                                                                                | Assume it's clean without running the gates                                                                         |
| `B-CAREFUL`     | Pick, then rebrand; drop CI/lockfile hunks the fork owns                                                             | Import `.github/**` or `pnpm-lock.yaml` churn                                                                       |
| `C-REIMPLEMENT` | Read `git show <sha>`, understand the intent, re-implement into the fork's handlers/protocol, port the upstream test | Attempt a cherry-pick — the fork's `webviewMessageHandler.ts` is a 131-line router vs upstream's 4206-line monolith |
| `D-LOCAL`       | Re-apply the _intent_ locally (bump the dep via Renovate, bump Actions runtimes, reword docs)                        | Take release/version/CHANGELOG commits — the fork is on `3.88.x`/`roo-plus`, upstream on `3.82.x`/`zoo-code`        |
| `E-SKIP`        | Leave alone; revisit only if the fork adopts the tooling                                                             | Spend review time resolving CodeRabbit/merge-queue conflicts                                                        |
| `X-REJECT`      | Record the rationale; lift only standalone prose if genuinely better                                                 | Re-introduce surfaces the fork deliberately removed (telemetry)                                                     |

## 6. Refresh procedure — folding in new upstream commits

Run this whenever upstream advances (weekly, or before starting a batch).

**Step 1 — fetch and re-baseline.**

```bash
git fetch --deepen=400 upstream main
git merge-base upstream/main master
git rev-list --count master..upstream/main
```

**Step 2 — isolate the new commits only.** The register's baseline merge base is
recorded in its header. Any commit reachable from `upstream/main` but not from the
_previous upstream tip_ is new:

```bash
OLD=<previous upstream tip from the register header>   # e.g. 500152b78
git log --reverse --format='%h|%ad|%an|%s' --date=short $OLD..upstream/main
```

**Step 3 — compute evidence for each new commit** (reuse §2's loop), capturing
Δ, file count, hot-file hits, and whether it touches a `CORE_FILES` path.

**Step 4 — classify** each new commit with §3's rules and assign it to either an
existing batch (if the theme matches) or a new `SYNC-n` section. Batch numbering
continues forward; never renumber existing batches.

**Step 5 — append to the register** and update:

- the header's _Upstream tip_ and _Pending upstream commits_ figures,
- the _Summary_ tables (class and priority counts),
- the _Recommended execution order_ if a new `P0`/`P1` outranks existing work.

**Step 6 — record the triage.** Add a dated line to the register's changelog
section (below) so the decision trail is visible: how many new commits, how
classified, and which were promoted to `P0`/`P1`.

> **Honesty rule.** A commit may only be marked `☑` when its fork SHA exists on
> `master`. Never mark a commit synced because a similar change was made
> locally — that is what the `D-LOCAL` class is for.

## 7. When to fall back to a whole-history merge

Merging `upstream/main` wholesale is an escape hatch, justified only when:

1. the pending set is dominated by `E-SKIP`/`D-LOCAL` commits, **and**
2. the `C-REIMPLEMENT` structural debt in [`SYNC-7`](pending-upstream-commits.md)
   has been paid down enough that handler conflicts are mechanical, **and**
3. the merge is done on its own branch with the §4.4 gates green.

Previous experiments with this mode (`47d864776`, `ce5f37b2e`, `9bd824eab`)
produced the regression-repair commits (`e86706d85`, `189f7b640`, `096bbfea4`)
that this strategy exists to avoid. If a merge is attempted, budget for that
repair phase explicitly.

## 8. Automation — [`scripts/upstream-sync-triage.mjs`](../../scripts/upstream-sync-triage.mjs:1)

The register is maintained by
[`scripts/upstream-sync-triage.mjs`](../../scripts/upstream-sync-triage.mjs:1):
ESM, zero new runtime dependencies, and the same conventions as the sibling gates
(a `TAG`-prefixed log via [`scripts/lib/logger.mjs`](../../scripts/lib/logger.mjs:1),
`--help`, explicit exit codes).

```bash
node scripts/upstream-sync-triage.mjs --verify           # register integrity (default mode)
node scripts/upstream-sync-triage.mjs --verify --repo-only  # merge-base-free subset (the CI profile)
node scripts/upstream-sync-triage.mjs --refresh          # dry run: propose triage for NEW commits
node scripts/upstream-sync-triage.mjs --refresh --write  # apply the proposal + header rewrite
node scripts/upstream-sync-triage.mjs --refresh --json   # machine-readable output
node scripts/upstream-sync-triage.mjs --verify --strict  # fail on stale ◐ rows and on unreachable upstream
node scripts/upstream-sync-triage.mjs --verify --fork-ref origin/master  # override the fork ref
```

Shortcuts: `pnpm verify:upstream-sync` and `pnpm refresh:upstream-sync`; the spec
suite (`scripts/upstream-sync-triage.spec.mjs`) runs as part of `pnpm test:scripts`.

Exit codes: `0` verified / refreshed / skipped (a stale `◐` warning alone does NOT
fail) · `1` a check failed, the merge base is unusable (shallow clone), upstream
was unavailable with `--strict`, or stale `◐` rows were found with `--strict`.
Unknown flags and `--repo-only` outside `--verify` fail loudly with `1`.

- `--verify` (default) — assert the register against the repo, reporting **sixteen
  independent checks**, eight of which need no merge base: (1) `row-sha-format`
  every row SHA is the canonical 9-character prefix; (2) `row-sha-resolves` every
  row SHA resolves to a commit; (3) `row-parse` every data row in a commit table
  parses into a register row — a row whose SHA cell lost its backticks is invisible
  to coverage, and the repo-only profile used to exit 0 blind to it, so this fails
  by line; (4) `coverage` every commit in `merge-base..upstream/main` has exactly
  one row and no row points outside that range; (5) `duplicates` no row SHA repeats;
  (6) `synced-fork-sha` every `☑` row carries a fork SHA reachable from the fork ref
  (runbook R9) **and** records `Resolved:` and `Version`; (7) `stale-in-progress`
  every `◐` row that records a fork SHA must **not** already be reachable from the
  fork ref — a `◐` row whose fork SHA has landed is _stale_ and must be flipped to
  `☑` (a `◐` row with no fork SHA is not checked; see §6 of the runbook). This is a
  **warning by default** and a failure only under `--strict`; (8) `class-ladder` —
  **hard**: `A-CLEAN` ⇒ Δ = 0, because an `A-CLEAN` label asserts pickability;
  (9) `class-ladder-advisory` — **warning**: `B-CAREFUL` ⇒ 1 ≤ Δ ≤ 5 (Δ > 5 means
  "inspect before picking", a judgement the tool must not auto-correct);
  (10) `exception-advisory` — **warning**: a dated `Exception` older than 90 days
  needs re-confirmation, reported by SHA; (11) `blocked-by` — **hard**: every
  `Blocked-by` token names a **different row in this register**, and the literal
  `unknown` is forbidden (write `—`); (12) `blocked-by-pending` — **warning**: the
  named prerequisite has not landed yet, which is what "blocked" means — a
  readiness fact, not a defect; (13) `discard-rationale` every `✖` row carries a
  rationale, inline or in its batch's `**Rationale.**` block; (14) `header-tip` the
  header's `Upstream tip` is a canonical SHA that resolves in this repo;
  (15) `header-pending-count` the header's pending count, merge base and tip agree
  with git; (16) `landed-unflipped` — **hard**: no `☐`/`◐` row's change is already
  in the fork by patch identity (`git cherry -v <forkRef> upstream/main` marks the
  upstream commit `-`, and the matching fork commit is named as evidence) or
  because it already records `Resolved:`/`Version` while still `☐`. This is the
  "update the table to `☑` when the commit lands" control; it needs history, so it
  is **full-profile only**. It also prints a **per-batch progress roll-up**
  (resolved vs pending per `SYNC-n`), the derived **ready set** and every dated
  **exception**.
- **Four finding levels** — every finding an operator sees is exactly one of these,
  and only the first can fail the run:
    - **fail** — an `error`-severity check reported a defect: a false claim about the
      register (bad row SHA, a `☑` row without reachability or without
      `Resolved:`/`Version`, a hard class violation, a `Blocked-by` that is not a
      different register row). Exit 1.
    - **advisory** — a `warning`-severity check reported a judgement call
      (`stale-in-progress`, `class-ladder-advisory`, `exception-advisory`,
      `blocked-by-pending`). Printed, never fatal; only stale `◐` rows are promoted
      by `--strict`, because a judgement is not a defect.
    - **informational** — the **derived ready set** (`A-CLEAN` ∧ Δ 0 ∧
      `Blocked-by` = ∅ ∧ open, per F-A-4 — a predicate, **not** a class) and the
      separately labelled **inspect-first** list (`B-CAREFUL` Δ outside 1–5;
      `B-CAREFUL` ∧ Δ 0 is empty by definition). Printed; never affects the exit code.
    - **exception** — a **dated** `Exception` cell, `excepted <YYYY-MM-DD> — <reason>`.
      Its only permitted use is honouring a decision already recorded for a row that
      violates `A-CLEAN` ⇒ Δ = 0; an undated/mis-shaped token, or one on a row that
      does not violate the rule, is a hard failure. `--verify` prints every excepted
      row **by SHA** under its own heading, so an exception can never be silent.
- `--repo-only` (with `--verify`) — run **only the eight merge-base-free checks**
  (`row-sha-format`, `row-sha-resolves`, `row-parse`, `duplicates`,
  `synced-fork-sha`, `stale-in-progress`, `exception-advisory`, `header-tip`) and
  issue **no git command that references `upstream/main`** or computes the upstream
  merge base — `coverage`, `header-pending-count` and `landed-unflipped` (the
  history-dependent checks) are invoked only in the full profile (CP1-3). `row-parse`
  and `exception-advisory` are pure-markdown, so they run here too, which is what
  stops the profile going blind to a row whose SHA cell lost its backticks. In
  `--json`, the quantities this profile cannot evaluate — `counts.pendingCommits`,
  `counts.missing`, `counts.unexpected` and the top-level `missing`/`unexpected` —
  are reported as **`null`, never `0`**, so no consumer reads "0 pending" from a
  profile that never measured it (CP1-7). This is the profile CI gates with, because
  a `--depth=1` checkout has no merge base and the full profile would be red by
  construction there (H-03 / F-A-7 / F-G-5).
  **Precondition — merge-base-free is not object-free.** The profile still needs the
  commits the register names to exist locally, so a CI job must fetch the fork
  history and the register's upstream window before running it (`fetch-depth: 0`,
  or an explicit `git fetch upstream main`). Measured on 2026-09-24: in a fresh
  1-commit clone `--repo-only` exits 1 on `row-sha-resolves` (101 of 102 rows
  unresolvable) — red by construction, which is why the check was not made
  tolerant: an unresolvable row SHA is a real finding, not a skip.
- **Row cells are resolved by header name, never by index.** Inserting a column
  before `Status` used to make the parser read the wrong cell, so `☑` rows read as
  unsynced and the reachability checks went _quiet_ instead of red (F-B-1). The
  appended schema — `Blocked-by`, `Resolved:`, `Version` — is documented in the
  register's Legend and in [runbook §6](../runbooks/upstream-sync.md:171).
- `--refresh` — fetch/deepen upstream, diff `upstream/main` against the baseline
  tip recorded in the register header, compute evidence per new commit (Δ, file
  count, hot-file hits, `CORE_FILES` hits, and telemetry / version / CHANGELOG /
  lockfile / `.github` / `.coderabbit` signals), **propose** a class + priority
  using §3's rules, and print a ready-to-paste register diff. **Dry run by
  default; only `--refresh --write` touches the register.**
- `--strict` — exit 1 (instead of the default exit 0) in two cases: (a)
  `upstream/main` cannot be resolved because there is no local ref and the fetch
  failed, and (b) a `◐` row is stale (`stale-in-progress`). An infra/network
  problem and a stale register must not turn mainline red on their own, but
  neither may be hidden either.
- `--fork-ref <ref>` — override the fork ref used by the `synced-fork-sha` and
  `stale-in-progress` reachability checks. Both checks resolve it through the
  **same** helper, so they cannot diverge: `--fork-ref`, else `origin/master` when
  it resolves and local `master` is an ancestor of it (a stale local ref), else
  local `master`. The resolved ref is printed and reflected in the check messages.
- `--json` — emit the machine-readable report (both modes) for scripted consumption.

> **Classification is never automated for existing rows.** `--refresh` proposes
> classes for **new** commits only and flags mismatches for a human. `--write`
> only _appends_ a new `SYNC-n` section (numbering continues forward; existing
> batches are never renumbered) and rewrites the header's tip + pending count. It
> never reclassifies, reorders or deletes a row. The Summary tables and the §9
> changelog line stay manual (§6 steps 5–6).

> **Checker pitfall (learned the hard way).** Match row cells only
> (`^| \`[0-9a-f]{9}\` |`). Do **not** grep for "any backticked hex token":
> SHAs legitimately repeat in Notes, in the recommended execution order, and as
> the baseline upstream/fork tips, so a naive grep reports ~29 false duplicates.
> Row SHAs must be the canonical **9-character** prefix — a 10-character row SHA
> is a real defect, because it silently fails 9-char prefix matching and makes the
> commit look absent from the register.

**Shallow clones.** Both modes require a real merge base. Without one
`git merge-base` returns nothing and the count reads 22 instead of 102, so the
tool fails with the exact remediation:
`git fetch --deepen=400 upstream main`.

§6 remains the procedure of record when the script is unavailable; the script
automates §6 steps 1–4 and the §8 verification itself.

## 9. Register changelog

| Date       | Event                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-09-25 | **Guarded refresh (WS-1c) — 2 upstream commits folded in; register green on both profiles.** `--refresh` ran behind the H-01 guard: deterministic deepen `git fetch --shallow-since=2026-08-19 upstream main` (derived from the register own baseline dates), then the three post-conditions asserted BEFORE any write — a real merge base resolves (`252c69b5`), the recorded baseline tip `9ec139cd8` is an ancestor of `upstream/main`, and the new-commit count (2) is strictly less than the local shallow window (131). Header: Upstream tip `9ec139cd8` → `fadd66a34` (2026-09-25, `chore(coderabbit): allow non-org members to interact with chat` (#1775)); Pending upstream commits 126 → 128. The 2 new rows live in the `SYNC-15` proposals section: `ebf4bd2d3` (`A-CLEAN`/P1, Δ 0) and `fadd66a34` (`E-SKIP`/P4). The Summary tables and the `Baseline recorded` header cell were updated to the recorded counts; `--verify` and `--verify --repo-only` both exit 0. |
| 2026-09-24 | **Baseline advance (WS-2 / H-01 / HD-04) — 24 upstream commits folded in, register green on both profiles.** `--refresh` ran behind the new guard: deterministic deepen `git fetch --shallow-since=2026-08-19 upstream main` (derived from the register's own merge-base/tip dates, replacing the fixed `--deepen=400`), then three post-conditions asserted BEFORE any write — a real merge base resolves, the recorded baseline tip `500152b78` is an ancestor of `upstream/main`, and the new-commit count (24) is strictly less than the local shallow window (129). A failed post-condition refuses (`--write` included), prints `git fetch --unshallow` / `--shallow-since=<date>`, and leaves the register byte-identical; a window that is gone (unshallowed) is reported explicitly. Header: Upstream tip `500152b78` → `9ec139cd8` (2026-09-24, [Feat] Add Claude Opus 5.5 to model providers (#1756)); Pending upstream commits 102 → 126; 126 rows now cover 126 pending commits (checks `coverage` and `header-pending-count` green; `--verify --repo-only` exits 0). The new rows live in the `SYNC-14` proposals section with the WS-1 column shape (`Blocked-by`/`Resolved:`/`Version` = `—`). Proposed classes: 7 `A-CLEAN` (5 quick-wins), 10 `B-CAREFUL`, 3 `C-REIMPLEMENT`, 2 `D-LOCAL`, 2 `E-SKIP`; proposed priorities: 1 `P0`, 15 `P1`, 2 `P2`, 4 `P3`, 2 `P4`. The single `P0` promotion (`1ebbd954e`, vitest v4.1.11 [security]) is `D-LOCAL` — regenerate locally; it carries no pick. A SYNC-13-style screen (empty-fork-side predictor) flags 8 of the 17 pickable new rows — 3 `A-CLEAN` (`914f0c42a`, `78b74ec1c`, `9176f2f69`) and 5 `B-CAREFUL` (`77e422faf`, `741f19830`, `4436ac537`, `01928c3c4`, `9ec139cd8`) — so check the prerequisite before picking and record `Blocked-by` when a row must land first. The docs' own deepen literals (`README` §6/§8, runbook Pass B) still say `--deepen=400` and "22 instead of 102"; those are H-05's sweep, not this advance. |
| 2026-09-16 | Register created. Baseline merge base `252c69b5`; 102 pending upstream commits classified (18 `A-CLEAN`, 25 `B-CAREFUL`, 19 `C-REIMPLEMENT`, 12 `D-LOCAL`, 27 `E-SKIP`, 1 `X-REJECT`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2026-09-24 | **Ladder enforcement (WS-1b / H-02 amendment) — four rows reclassified, one dated exception, `Blocked-by` corrected.** The deepened `--verify` was red on live data against WS-1's literal invariants (16 `class-ladder` + 4 `blocked-by` failures), so the invariants were adjudicated, not abandoned: `A-CLEAN` ⇒ Δ = 0 stays **hard** (an `A-CLEAN` label asserts pickability); `B-CAREFUL` ⇒ 1 ≤ Δ ≤ 5 becomes an **advisory** (`class-ladder-advisory`, never fatal — Δ > 5 is a judgement to inspect, not a misclassification to auto-correct); `Blocked-by` splits into a **hard** existence check (`blocked-by`: every token must name a _different_ row of this register) plus a **readiness warning** (`blocked-by-pending`, never fatal — a correctly blocked row is precisely one whose blocker has not landed). Four **open** rows were reclassified `A-CLEAN` → `B-CAREFUL` because Δ > 0 is a false pickability claim: `4e8fa09f2` (Δ 4), `c4574ffef` (Δ 2), `147147cda` (Δ 1), `745656a50` (Δ 2) — no priority, status or Δ was changed. The already-merged `a5f4192bf` (Δ 2, `☑`) keeps `A-CLEAN` and carries the register's single dated `Exception` — `excepted 2026-09-16 — merged with Δ2 under the pre-ladder classifier (2026-09-16 triage)` — printed by SHA on every `--verify`, so an exception can never be silent. The literal `unknown` in `Blocked-by` became `—` for `a80b3b3ab` and `745656a50` (the documented chains name no prerequisite row) and the token is now forbidden. A fourth appended column, `Exception`, follows `Version`; the derived ready set (`A-CLEAN` ∧ Δ 0 ∧ `Blocked-by` = ∅ ∧ open) and the inspect-first list are reported informationally and never affect the exit code. |
| 2026-09-24 | **Schema migration (HD-06 / H-02 / F-B-1) — no reclassification.** Three columns appended after `Status`: `Blocked-by`, `Resolved:`, `Version`; the parser resolves every cell **by header name** instead of by index, so adding columns can no longer make a `☑` row read as unsynced. Populated: `Resolved:` = `2026-09-16` and `Version` = `3.88.4` for the six `☑` rows (merged via PR #345, merge `6c4e9df5c`; the version is the one committed at that merge — `git show 6c4e9df5c:src/package.json`), and `Blocked-by` for the six `SYNC-13` rows from their documented chains (`unknown` where the chain names no row). **No class, priority or Δ was changed** — the 102 rows are byte-identical apart from the appended cells.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-09-17 | **Release note — `v3.88.5` superseded by `v3.88.6`.** `src/package.json` was bumped to `3.88.5` by `afe35f6a8`, but the publish run for `master` at `71d621532` (run [`35194285835`](https://github.com/xavier-arosemena/roo-plus/actions/runs/35194285835)) aborted **fail-closed**: the version guard could not query Open VSX (`Open VSX API returned HTTP 503`) and refuses to continue rather than risk a silent skip or a non-monotonic publish. That is an **infrastructure** failure, not a version error — `3.88.5` itself was never rejected as duplicate or non-monotonic. The release was deliberately **not** re-triggered. The mechanism matters: [`pre-release-publish.yml`](../../.github/workflows/pre-release-publish.yml:1) runs on **every push to `master`** and only sets `skip=true` for release-prep subjects (`^chore: prepare vX.Y.Z( stable)? release`), so **any** merge to `master` publishes whatever version is committed — an unbumped merge would have published `3.88.5`. This release is therefore cut with an explicit bump to **`v3.88.6`**: that merge publishes `3.88.6`, and `3.88.5` remains unpublished **as a consequence of that bump**, not by design. A future reader must not read the `3.88.5` gap as a failed or incomplete sync.                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
