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
git show <sha> -- <file>            # what upstream intended
git log --oneline <mergebase>..master -- <file>   # what the fork intended
```

Resolve so **both intents survive**: upstream's bugfix logic, expressed in the
fork's structure (decomposed handlers, typed messages, branding, no telemetry).
Escape conflict markers with `\` when writing diffs (`\<<<<<<<`).

### 4.3 Re-apply branding

Upstream strings leak `Zoo Code` / `zoo-code` tokens. Normalise from the repo root:

```bash
bash scripts/full-rebrand.sh
```

Then confirm the code-index gate's branding normalisation still passes (§5) — it
compares `Roo-Plus ↔ Zoo-Code` tokens explicitly.

### 4.4 Mandatory gate chain

No batch merges without all of these passing:

```bash
node scripts/verify-message-schemas.mjs
node scripts/verify-upstream-code-index-alignment.mjs --strict
node scripts/verify-announcement-version.mjs
node scripts/verify-submodule-pin.mjs
node scripts/verify-roomodes-sync.mjs
node scripts/verify-locale-readmes.mjs
node scripts/verify-semble-checksums.mjs --strict
node scripts/verify-semble-release-coupling.mjs --base <pr-merge-base> --strict
pnpm verify:roomodes && pnpm verify:submodule-pin && pnpm verify:announcement-version
pnpm test:scripts          # the .spec.mjs suites for the gates themselves
```

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
A batch is not done until the register says so.

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
node scripts/upstream-sync-triage.mjs --verify          # register integrity (default mode)
node scripts/upstream-sync-triage.mjs --refresh         # dry run: propose triage for NEW commits
node scripts/upstream-sync-triage.mjs --refresh --write # apply the proposal + header rewrite
node scripts/upstream-sync-triage.mjs --refresh --json  # machine-readable output
node scripts/upstream-sync-triage.mjs --verify --strict # fail (do not skip) if upstream is unreachable
```

Shortcuts: `pnpm verify:upstream-sync` and `pnpm refresh:upstream-sync`; the spec
suite (`scripts/upstream-sync-triage.spec.mjs`) runs as part of `pnpm test:scripts`.

Exit codes: `0` verified / refreshed / skipped · `1` a check failed, the merge base
is unusable (shallow clone), or upstream was unavailable with `--strict`.

- `--verify` (default) — assert the register against the repo, reporting **six
  independent checks**: (1) `row-sha-format` every row SHA is the canonical
  9-character prefix; (2) `row-sha-resolves` every row SHA resolves to a commit;
  (3) `coverage` every commit in `merge-base..upstream/main` has exactly one row
  and no row points outside that range; (4) `duplicates` no row SHA repeats;
  (5) `synced-fork-sha` every `☑` row carries a fork SHA reachable from `master`
  (runbook R9); (6) `header-counts` the header's pending count, baseline tip and
  merge base agree with git. It also prints a **per-batch progress roll-up**
  (resolved vs pending per `SYNC-n`).
- `--refresh` — fetch/deepen upstream, diff `upstream/main` against the baseline
  tip recorded in the register header, compute evidence per new commit (Δ, file
  count, hot-file hits, `CORE_FILES` hits, and telemetry / version / CHANGELOG /
  lockfile / `.github` / `.coderabbit` signals), **propose** a class + priority
  using §3's rules, and print a ready-to-paste register diff. **Dry run by
  default; only `--refresh --write` touches the register.**
- `--strict` — exit 1 (instead of skipping with the default exit 0) when
  `upstream/main` cannot be resolved because there is no local ref and the fetch
  failed. An infra/network problem must not block CI, but it must not be hidden
  either.
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

| Date       | Event                                                                                                                                                                                  |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-16 | Register created. Baseline merge base `252c69b5`; 102 pending upstream commits classified (18 `A-CLEAN`, 25 `B-CAREFUL`, 19 `C-REIMPLEMENT`, 12 `D-LOCAL`, 27 `E-SKIP`, 1 `X-REJECT`). |
