# Resolution record — `SYNC-<n>` (template)

> **Copy this file to `docs/upstream-sync/resolutions/SYNC-<n>.md`** as the first
> action of a batch that hits a conflict, and fill it in as you resolve. One file
> per batch, **append-only**: never rewrite an entry after the batch is merged —
> add a new dated line instead.

**Why this file exists.** R4 says "never resolve a conflict by picking a side".
Until this record existed, that rule left no trace: a resolution could be
justified by the wrong commit, an upstream hunk could be dropped silently, and a
half-ported `C-REIMPLEMENT` fix passed all seven gates (H-23 · H-28 · H-17 ·
F-C-1 · F-C-3 · F-C-7 · M6). The record is the only place the gate chain can host
**fix-equivalence evidence**: the test that failed before and passes after.

The record is deliberately a **sidecar** — it is not a register column. The
register is parsed cell-by-cell and stays narrow; judgement lives here.

---

## 1. Metadata (edit the values, keep the keys)

```markdown
- batch: SYNC-<n>
- base: <the fork point the batch branched from — origin/master or a SHA>
- head: <the batch tip — the sync/* branch name or a SHA>
- conflicted_files: <path>, <path>
```

`conflicted_files:` is what ties the record to the batch: `verify-resolutions`
runs `git diff --name-only <base>...<head>` and fails if the list and the range
disagree in **either** direction — a padded record (a path the batch never
touched) and an omitted file (a path it did touch, with no block) are both
defects. That is why the list must be exact, not a summary.

## 2. Block schema — one per conflicted file

```markdown
### <path> [shape: add/add | modify/modify | delete/modify | empty-fork-side | rename]

- upstream:  <sha> — <what upstream changed and why>
- fork:      <sha> — <the fork behaviour that must survive>
- fork_locus: <path> | none — <where the surviving behaviour lives if the file moved>
- resolution: both-re-expressed | upstream-adapted | fork-wins-forever | upstream-wins
- rationale:  <why this and not the other side — at least 20 characters>
- dropped:    none | <R5 path> — <hunk summary>[; <R5 path> — <hunk summary>]
- evidence:   <the test that fails before / passes after> + <the gate ids run>
- divergence: none | divergent-forever:<reason> | promoted-to-row:<sha>
```

| Field         | Where the value comes from                                                                                                                                |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `upstream:`   | `git show <sha> -- <file>` **plus the upstream PR body / issue** — the *why*, not the diff.                                                                |
| `fork:`       | **`git blame -L <a>,<b> HEAD -- <file>`** (R4). Fallback `git log -L <a>,<b>:<file>` when the hunk is brand new. The file-scoped `git log --oneline <merge-base>..master -- <file>` is a fallback **only** for a brand-new hunk — after a rebrand sweep and `-x` imports, the file-scoped log returns churn, not intent. |
| `fork_locus:` | Where the surviving behaviour lives **when the file moved** (the fork's `handlers/chat.ts`, the typed registry, …). `none` when the file itself is the locus. |
| `resolution:` | **Closed set.** Anything else fails.                                                                                                                      |
| `rationale:`  | One or two sentences. The 20-character floor exists to reject `rationale: n/a`.                                                                             |
| `dropped:`    | `none`, or every dropped hunk with the **R5 path** it belonged to. A path outside R5 fails (R5's refuses are the *only* sanctioned drops).                  |
| `evidence:`   | The ported upstream test, or the fork test that fails before / passes after — plus the gate ids run. This is H-17's fix-equivalence evidence.               |
| `divergence:` | `none`, or `divergent-forever:<reason>`, or `promoted-to-row:<sha>` (a new register row). **Every `C-REIMPLEMENT` row the batch closes must be cited by a non-`none` `divergence:` value** in one of the blocks. |

Write conflict markers **escaped** whenever you quote one in this record
(`\<<<<<<<`, `\=======`, `\>>>>>>>`), so the integrity scan can tell a quoted
marker from a live one.

## 3. Running the checks

```bash
# the record: fields, closed set, rationale floor, SHA resolution + fork
# reachability, not-a-rebrand fork SHA, R5-only drops, record ⇔ batch range,
# C-REIMPLEMENT divergence coverage
node scripts/verify-resolutions.mjs --batch SYNC-<n> --base <base> --head <ref>

# the integrity scan alone (markers in every file the batch touched +
# `git diff --check`) — also a step of `pnpm gate:sync`
node scripts/verify-resolutions.mjs --integrity
```

Both are offline. `--batch` with no record yet is a **failure with an actionable
message** (it prints the path to create and the template to copy) — never a
silent pass.

## 4. Worked example (fake data — replace every value)

```markdown
# SYNC-3 — Task-History Durability

- batch: SYNC-3
- base: origin/master
- head: sync/sync-3-task-history
- conflicted_files: src/core/task/Task.ts

### src/core/task/Task.ts [shape: modify/modify]

- upstream:  21d35c4a9 — atomic per-task merge; upstream needed one write so a crash cannot leave a split index.
- fork:      4a455eeeb — "fix(task-history): scope the history window and paging per workspace" (the fork's per-workspace window must survive).
- fork_locus: src/core/webview/handlers/history.ts — the write path moved into the handler decomposition.
- resolution: both-re-expressed
- rationale:  The fork's per-workspace scoping and upstream's atomic write are independent, so upstream's write is re-expressed inside the fork's handler.
- dropped:    none
- evidence:   src/core/task/__tests__/Task.spec.ts "atomic merge survives an interrupted write" — fails before, passes after. Gates run: gate:sync.
- divergence: promoted-to-row:21d35c4a9
```

An escaped marker quoted in prose looks like this: `\<<<<<<< HEAD`.
