# Runbook: Upstream sync (agent-executable)

- **Audience:** any agent asked to "sync upstream", "drain a sync batch", or "refresh the pending-commit register".
- **Companions:** [`../adr/adr-upstream-sync-triage-strategy.md`](../adr/adr-upstream-sync-triage-strategy.md) (why the classes exist), [`../upstream-sync/pending-upstream-commits.md`](../upstream-sync/pending-upstream-commits.md) (**the register — source of truth**), [`../upstream-sync/README.md`](../upstream-sync/README.md) (procedures + classifier rules), [`../../AGENTS.md`](../../AGENTS.md) (repo-wide agent rules).
- **Modes:** work in **💻 Code**. Hand off to **🪲 Debug** only if a gate fails with unclear cause; to **🏗️ Architect** only if a commit needs re-classification.

> This runbook exists because [`README.md`](../upstream-sync/README.md) is a _maintainer manual_: it explains and computes, but it does not issue imperatives, stop conditions, or a definition of done. Agents MUST follow **this** file; treat the README as reference material.

## 1. Non-negotiable rules

These are hard constraints, not preferences. Violating any of them invalidates the batch.

| #   | Rule                                                                                                                                                                                           | Why                                                                                                                                        |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| R1  | **Deepen before measuring.** `git fetch --deepen=400 upstream main`, then confirm `git merge-base upstream/main master` prints a SHA.                                                          | This clone is shallow. Without it, `merge-base` is empty and counts are wrong (reported 22 instead of 102).                                |
| R2  | **One batch = one theme = one branch.** `git checkout -b sync/<batch-id>-<theme>`.                                                                                                             | Keeps a bad sync revertable per theme instead of unpicking a 272-file merge.                                                               |
| R3  | **Cherry-pick with provenance:** `git cherry-pick -x <sha>`.                                                                                                                                   | Makes the register's fork-SHA column verifiable.                                                                                           |
| R4  | **Never resolve a conflict by picking a side.** Read `git show <sha> -- <file>` (upstream intent) **and** `git log --oneline <merge-base>..master -- <file>` (fork intent), then satisfy both. | Upstream fixes must be re-expressed in the fork's structure, not substituted for it.                                                       |
| R5  | **Never take these from upstream:** `src/package.json` version/name fields, `CHANGELOG*`, `locales/*/README.md`, `pnpm-lock.yaml`, `.github/**`, `.coderabbit*`.                               | The fork owns its version line (`3.88.x` / `roo-plus`, upstream is `3.82.x` / `zoo-code`), its changelog policy, its lockfile, and its CI. |
| R6  | **Suppression counts may never increase.** After editing a file: `pnpm --dir src exec eslint --prune-suppressions --max-warnings=0 <relative-file>`.                                           | [`src/eslint-suppressions.json`](../../src/eslint-suppressions.json:1) is a ratchet; counts are a ceiling.                                 |
| R7  | **No `as any`, no `as unknown as T` (except documented last resort), no new lint disables, no silently swallowed promises.**                                                                   | [`AGENTS.md`](../../AGENTS.md) rules; fix the new code instead.                                                                            |
| R8  | **No `.changeset` files. No CHANGELOG edits.**                                                                                                                                                 | Changesets are maintainer-managed; CHANGELOG is updated in bulk at release time.                                                           |
| R9  | **The register may only be marked `☑` when the fork SHA exists on `master`.**                                                                                                                  | Prevents "we fixed something similar" from being recorded as a sync.                                                                       |
| R10 | **Run the full gate chain before claiming done** (§4).                                                                                                                                         | The gates _are_ the fork's invariants.                                                                                                     |

## 2. Stop conditions — ask the human instead of guessing

Stop and report when any of these is true:

| Trigger                                                                                                                                                       | Why stop                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `Δ > 5` and the commit's register class is **not** `C-REIMPLEMENT`                                                                                            | The classification is probably wrong; patch classes need re-triage.                                                              |
| A commit changes behaviour of the decomposed handlers ([`src/core/webview/handlers/`](../../src/core/webview/handlers/chat.ts:1)) and the intent is ambiguous | Only the maintainer knows which fork behaviour is load-bearing.                                                                  |
| A gate fails for a reason **not** local to the picked change                                                                                                  | Pre-existing drift; fixing it silently would hide a real problem.                                                                |
| A batch needs a new persisted setting                                                                                                                         | The round trip has 11 mandatory steps (see [`AGENTS.md`](../../AGENTS.md) _Persisted Setting Checklist_); confirm before wiring. |
| The picked change would re-introduce telemetry, cloud, or branding regressions                                                                                | Contradicts a recorded fork decision (`X-REJECT`/`D-LOCAL`).                                                                     |
| Two upstream commits conflict _with each other_ (e.g. a re-land superseded by a later fix)                                                                    | Requires a human decision on which to keep.                                                                                      |

**Report format when stopping:** commit SHA + subject · class from the register · the concrete blocker · the options you see · your recommendation. Do not proceed on a guess.

## 3. When to run

| Pass                         | Trigger                                           | Deliverable                                             |
| ---------------------------- | ------------------------------------------------- | ------------------------------------------------------- |
| **A — drain a batch**        | A batch is scheduled                              | One PR for one `SYNC-n` batch, register rows updated    |
| **B — refresh the register** | Upstream advanced since the recorded baseline tip | New/updated rows for the new commits; recomputed counts |
| **C — verify the register**  | Before any sync PR, and ideally in CI             | A pass/fail on register completeness                    |

Run B **before** A whenever upstream has advanced — otherwise you sync against a stale classification.

## 4. Pass A — drain a batch (agent prompt)

Copy-paste the block below, filling the two blanks.

```text
ROLE: Upstream sync pass for Roo+ (fork of Zoo-Code-Org/Zoo-Code).

READ FIRST, in order:
- docs/runbooks/upstream-sync.md                 (this file: rules, stop conditions, gate chain)
- docs/upstream-sync/pending-upstream-commits.md (the register: find batch SYNC-<n>)
- docs/upstream-sync/README.md                   (class playbooks, classifier rules)
- AGENTS.md                                      (ESLint suppressions, settings checklist, test placement)

BATCH: ______ (e.g. SYNC-1)   MODE: 💻 Code

TASK 1 — Establish the baseline (do not skip).
  git fetch --deepen=400 upstream main
  git merge-base upstream/main master          # MUST print a SHA; if empty, you are in a shallow clone
  git rev-list --count master..upstream/main   # MUST equal the register's pending count
  If either check fails, STOP and report.

TASK 2 — Branch for the batch.
  git checkout master && git pull
  git checkout -b sync/<batch-id>-<theme>

TASK 3 — For each row in the batch with class A-CLEAN or B-CAREFUL:
  a) Inspect intent before picking:  git show <sha>
  b) Pick with provenance:           git cherry-pick -x <sha>
  c) On conflict: read BOTH intents (git show <sha>; git log --oneline <merge-base>..master -- <file>),
     then resolve so upstream's fix is re-expressed in the fork's structure. Never pick a side blindly.
  d) Drop hunks that touch the files listed in R5 (version, CHANGELOG, lockfile, .github, .coderabbit).
  e) Re-check whether the change was already ported:  git cherry -v master upstream/main | grep <sha>
     ('-' means an equivalent patch is already in master — note it in the register instead of re-porting).
     Caveat: patch-ids differ for C-REIMPLEMENT work, so this is only a hint for A/B classes.

TASK 4 — For each row in the batch with class C-REIMPLEMENT: DO NOT cherry-pick.
  Read the upstream diff, identify the intent, re-implement it into the fork's decomposed handlers
  (src/core/webview/handlers/*) or typed message registry (packages/types/src/webview-messages/),
  and port the accompanying test at the LOWEST layer that would catch the regression.

TASK 5 — Branding aftermath. Run from repo root: bash scripts/full-rebrand.sh

TASK 6 — Gate chain. Run every command; a single failure means the batch is NOT done.
  node scripts/verify-message-schemas.mjs
  node scripts/verify-upstream-code-index-alignment.mjs --strict
  node scripts/verify-announcement-version.mjs
  node scripts/verify-submodule-pin.mjs
  node scripts/verify-roomodes-sync.mjs
  node scripts/verify-locale-readmes.mjs
  node scripts/verify-semble-checksums.mjs --strict
  node scripts/verify-semble-release-coupling.mjs --base <merge-base> --strict
  pnpm lint
  Run the relevant Vitest suites FROM THE PACKAGE that declares Vitest:
    cd src && npx vitest run <path-without-src-prefix>
    cd webview-ui && npx vitest run <path-without-webview-ui-prefix>

TASK 7 — Update the register.
  Set each synced row's status to ☑ and append the fork SHA; use ✖ only with a recorded rationale.
  Update the batch heading to "— ✅ DONE (n/n)" when every row is resolved.
  Do NOT mark ☑ without a fork SHA on master (R9).

TASK 8 — Report.
  Batch · commits picked (sha → fork sha) · commits re-implemented and where · gate results ·
  register rows changed · anything deferred with the reason.

STOP AND ASK (see runbook §2) rather than guessing when: Δ>5 outside C-REIMPLEMENT, a gate fails
for a non-local reason, the intent of a handler change is ambiguous, or a new persisted setting
is required.
```

## 5. Pass B — refresh the register (agent prompt)

```text
ROLE: Upstream register refresh for Roo+.

READ FIRST: docs/runbooks/upstream-sync.md, docs/upstream-sync/README.md (§3 classifier, §6 refresh),
docs/upstream-sync/pending-upstream-commits.md (note its recorded baseline tip).

TASK 1 — Deepen and re-baseline:  git fetch --deepen=400 upstream main
  Note the register's recorded upstream tip (OLD). Confirm it is still reachable:  git log -1 <OLD>

TASK 2 — Isolate the NEW commits only:  git log --reverse --format='%h|%ad|%an|%s' --date=short <OLD>..upstream/main

TASK 3 — Compute evidence per new commit (README §2 loop): Δ (files changed by both sides),
  file count, hot-file hits, whether it touches a CORE_FILES path in
  scripts/verify-upstream-code-index-alignment.mjs, and whether it touches telemetry,
  version/CHANGELOG, lockfiles, or .github/.coderabbit.

TASK 4 — Classify with README §3's rules and assign each to an existing SYNC-n batch (theme match)
  or a new one. Never renumber existing batches. Set class + priority + Δ + status (☐).

TASK 5 — Update the register header: new upstream tip and pending count. Append a dated row to its
  changelog section (how many new commits, how classified, what was promoted to P0/P1).

TASK 6 — Verification is mandatory: run the register check (scripts/upstream-sync-triage.mjs --verify
  once implemented; otherwise README §8's row-scoped command). Report rows = pending commits,
  0 duplicates, 0 missing, 0 unexpected.

DO NOT reclassify or delete existing rows without saying so explicitly and why.
```

## 6. Register update format (exact edits)

- Row: ``| `<9-char sha>` | <date> | <subject> | `<CLASS>` | <P#> | <Δ> | ☑ <fork-sha> |``
- Row SHAs MUST be the canonical **9-character** prefix. A 10-character SHA is a defect — it silently fails prefix matching and makes the commit look absent (this happened once; see README §8).
- Batch heading: append ` — ✅ DONE (n/n)` when all rows are resolved.
- Header: update _Upstream tip_ and _Pending upstream commits_ only on a refresh (Pass B).
- Never hand-edit the evidence snapshots [`../upstream-sync/triage-raw.tsv`](../upstream-sync/triage-raw.tsv) / [`../upstream-sync/raw-upstream-commits.txt`](../upstream-sync/raw-upstream-commits.txt) — regenerate them.

## 7. Definition of done (per batch)

- [ ] Branch is `sync/<batch-id>-<theme>` and contains only that batch's commits.
- [ ] Every picked commit used `-x`; no R5 file was taken from upstream.
- [ ] `C-REIMPLEMENT` rows were ported by hand with a test at the lowest viable layer.
- [ ] Full gate chain green (§4 TASK 6); lint suppressions did not increase.
- [ ] Register rows updated with fork SHAs; batch heading marked DONE if complete.
- [ ] PR opened with the batch id, the commits, gate results, and the register diff.

## 8. Known failure modes

| Symptom                                                                                                                              | Cause                                                | Action                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `merge-base` prints nothing / "22 behind"                                                                                            | Shallow clone                                        | R1 — deepen first                                                                                                          |
| Conflict in [`webviewMessageHandler.ts`](../../src/core/webview/webviewMessageHandler.ts:1) that mixes 4000 lines of unrelated logic | Wrong class: it is structural                        | Re-classify to `C-REIMPLEMENT`, close the pick, re-implement into [`handlers/`](../../src/core/webview/handlers/chat.ts:1) |
| Code-index gate fails on one file after a clean pick                                                                                 | File is in `CORE_FILES` and must stay byte-identical | Re-align that file (or extend the allow-list deliberately, with a reason)                                                  |
| Gate fails in a file the batch never touched                                                                                         | Pre-existing drift                                   | Report it; do not fix silently                                                                                             |
| Register looks complete but a commit is missing                                                                                      | 10-char SHA row                                      | Re-check with the row-scoped regex (README §8)                                                                             |
| Endless conflict churn on a whole-history merge                                                                                      | Escape hatch used as default                         | Abandon; return to batches                                                                                                 |
