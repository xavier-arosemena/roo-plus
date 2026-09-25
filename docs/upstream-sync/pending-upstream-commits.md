# Pending Upstream Commits — Sync Register

**Source of truth** for what remains to be synced from
`Zoo-Code-Org/Zoo-Code` (`upstream/main`) into Roo+ (`master`).

Decision record: [`adr-upstream-sync-triage-strategy.md`](../adr/adr-upstream-sync-triage-strategy.md).
Operating manual + refresh procedure: [`README.md`](README.md).

**Agents: start with [`../runbooks/upstream-sync.md`](../runbooks/upstream-sync.md)** — the imperative runbook (hard rules, stop conditions, copy-paste prompts, definition of done). This register is the _data_; the runbook is the _procedure_.

## Baseline

| Field                                    | Value                                                                                                                                                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Baseline recorded                        | 2026-09-16 (initial register; each later refresh is recorded in the README §9 changelog)                                                                                                                     |
| Merge base                               | `252c69b5` (2026-08-20, "fix: stream reasoning_content in LM Studio provider (#1175)")                                                                                                                       |
| Upstream tip                             | `fadd66a34` (2026-09-25, "chore(coderabbit): allow non-org members to interact with chat (#1775)")                                                                                                           |
| Fork tip                                 | `77a670196` (2026-09-15, PR #338 merge)                                                                                                                                                                      |
| Pending upstream commits                 | **128**                                                                                                                                                                                                      |
| Fork-only commits                        | 180                                                                                                                                                                                                          |
| Conflict surface (files changed by both) | 272                                                                                                                                                                                                          |
| Refresh procedure                        | Automated by [`scripts/upstream-sync-triage.mjs`](../../scripts/upstream-sync-triage.mjs:1) — `--refresh` (dry run), `--refresh --write` to apply, `--verify` to check. See [`README.md` §6](README.md).     |
| Evidence snapshots                       | [`raw-upstream-commits.txt`](raw-upstream-commits.txt) and [`triage-raw.tsv`](triage-raw.tsv) — generated 2026-09-16 at the initial baseline (they are a dated snapshot, not a view of the current tip); regenerate via [`README.md` §2](README.md), never hand-edit |

> **Shallow-clone warning.** This checkout is shallow (`.git/shallow`). Before
> computing a merge base, deepen the upstream ref or the numbers are wrong.
> `--refresh` does this deterministically (`git fetch --shallow-since=<date>
> upstream main`, the date derived from this header); by hand, use
> `git fetch --unshallow upstream main`. With a shallow graft `git merge-base`
> returns nothing and `rev-list --count upstream/main` reports only the fetch
> window, not the real backlog recorded in the `Pending upstream commits` cell
> above — never trust a count taken across a graft.

## Legend

**Class** — how the commit is synced (see ADR §Decision):

| Class           | Mechanism                                                                            |
| --------------- | ------------------------------------------------------------------------------------ |
| `A-CLEAN`       | No overlap with any fork-touched file → direct cherry-pick                           |
| `B-CAREFUL`     | Small overlap → cherry-pick, then rebrand + gates                                    |
| `C-REIMPLEMENT` | Hits a structural divergence → port intent by hand with tests, **never** cherry-pick |
| `D-LOCAL`       | Fork already owns the concern → re-implement locally, never take the commit          |
| `E-SKIP`        | Upstream-org automation the fork does not run → permanently out of scope             |
| `X-REJECT`      | Contradicts a fork decision → rejected                                               |

**Priority** — `P0` security/data-loss · `P1` core-flow correctness ·
`P2` feature/model support · `P3` hygiene/tests · `P4` not applicable.
**quick-win** = `A-CLEAN` + `P0`–`P2` + small diff: sync these first.

**Status** — one marker, exactly one meaning, machine-checked by
`node scripts/upstream-sync-triage.mjs --verify`:

- `☑ <fork-sha>` — **merged**. It MUST also record the released **`Version`** and the
  resolution **`Resolved:`** date; a `☑` row missing either fails the check
  `synced-fork-sha` by row SHA.
- `✖` — **deliberately discarded**. It MUST carry a rationale: inline in the Status
  cell (`✖ <reason>`) or in its batch's **Rationale.** block. Absent that, the check
  `discard-rationale` fails by row SHA.
- `☐` pending · `◐` in flight · `⏸` deferred by decision. A landed `◐` row is stale
  (`stale-in-progress`); a bare `◐` with no fork SHA is not checked.
- A `☐`/`◐` row is also checked against the fork by **patch identity**: if its
  change is already in the fork, `git cherry` marks the upstream commit `-` and the
  matching fork commit is named as evidence, so the row fails `landed-unflipped` by
  row SHA — as does a `☐` row that already records `Resolved:`/`Version`. This is
  the "flip the table to `☑` once the commit lands" control. It needs history, so it
  is a **full-profile** check; `--repo-only` skips it.

**`Blocked-by`** — the prerequisite row SHA(s) that must land first (the `SYNC-13`
chains), comma-separated when there is more than one. `—` = not blocked. Two
different things are checked, at two different levels:

- **Hard** (`blocked-by`): every token must name a **different row in this register**.
  A token that names no row, names the row itself, or is the literal `unknown` fails
  by row SHA. The literal `unknown` is **forbidden** — a named unknown looks like a
  resolved reference while carrying no information, so write `—` when the documented
  chain names no row.
- **Advisory** (`blocked-by-pending`, never fatal): the named prerequisite has not
  landed yet. That is a **readiness** fact, not a data defect — a correctly blocked
  row is precisely one whose blocker has not landed.

**`Resolved:`** — the date the row's merge landed on the fork ref (`YYYY-MM-DD`);
`—` until then. This is the input the age/dwell metrics read (F-A-3).

**`Version`** — the released extension version at that merge; `—` until then.

**`Exception`** — a **dated** token that honours a decision already recorded for the
row: `excepted <YYYY-MM-DD> — <reason>`. `—` = none. Its only permitted use is a
row that violates `A-CLEAN` ⇒ Δ = 0; an undated/mis-shaped token, or one on a row that
does not violate that rule, is a hard failure. `--verify` prints every excepted row
**by SHA**, so an exception can never be silent.

**Class ↔ Δ ladder** — `A-CLEAN` ⇒ Δ = 0 is **hard** (`class-ladder`): an `A-CLEAN`
label asserts pickability, so Δ > 0 is a false claim — reclassify the row, or record a
dated `Exception` (used once below, for an already-merged row). `B-CAREFUL` ⇒ 1 ≤ Δ ≤ 5
is an **advisory** (`class-ladder-advisory`, never fatal): Δ > 5 means "inspect before
picking", a human judgement the tool must not auto-correct. A recorded prerequisite is
**readiness, not a class**: the **ready set** is the derived predicate
`A-CLEAN` ∧ Δ 0 ∧ `Blocked-by` = ∅ ∧ open (informational — never affects an exit code).
`B-CAREFUL` rows can never be ready (they are defined by Δ ≥ 1, so `B-CAREFUL` ∧ Δ 0 is
empty by construction) and are listed separately as **inspect-first**.

**Δ** = number of files in the commit that the fork has also modified since the
merge base (conflict-surface size). `Δ 0` is the strongest clean-pick signal.

> **Δ is fork-side only.** It measures overlap with files the fork changed, and is therefore
> **blind to unsynced upstream prerequisites**: a commit whose upstream predecessor has not been
> synced conflicts with an _empty_ fork side even though `Δ = 0`. Check for that before trusting
> an `A-CLEAN` label — see [§3 of the manual](README.md) and the `SYNC-13` chains below.

## Summary

| Class           | Count                  |
| --------------- | ---------------------- |
| `A-CLEAN`       | 22 (19 are `A-CLEAN` ∧ P0–P2) |
| `B-CAREFUL`     | 39                            |
| `C-REIMPLEMENT` | 22                            |
| `D-LOCAL`       | 14                            |
| `E-SKIP`        | 30                            |
| `X-REJECT`      | 1                             |
| **Total**       | **128**                       |

| Priority | Count |
| -------- | ----- |
| `P0`     | 6     |
| `P1`     | 42    |
| `P2`     | 16    |
| `P3`     | 28    |
| `P4`     | 36    |

**Read this as:** the fork is not "128 commits behind" — the backlog is the
`Pending upstream commits` count above, and what is *pickable today* is the
**derived ready set**, which `--verify` computes (`A-CLEAN` ∧ Δ 0 ∧ `Blocked-by` = ∅
∧ open). This prose pins no ready-set number on purpose: it is a predicate over the
rows, not a stored fact, so a pinned literal would only rot. 22 rows are
`C-REIMPLEMENT` — deliberate re-implementation because of architecture the fork
changed — and 44 are either owned locally or permanently out of scope (14 `D-LOCAL`
+ 30 `E-SKIP`). (The 2026-09-24 ladder enforcement moved four `A-CLEAN` rows with
Δ > 0 to `B-CAREFUL`; the 2026-09-24 and 2026-09-25 guarded refreshes folded in 24
and 2 upstream commits respectively — see the manual's §9 changelog.)

---

## SYNC-1 — Security & Safety Features (`P0`/`P1`)

Theme: security hardening, file-safety, cancellation correctness.
Gates: message-schema gate (settings round-trips), full Vitest for `src/core`,
`src/api`.

| SHA         | Date       | Subject                                                                                  | Class           | Pri | Δ   | Status      | Blocked-by | Resolved:  | Version | Exception                                                                                |
| ----------- | ---------- | ---------------------------------------------------------------------------------------- | --------------- | --- | --- | ----------- | ---------- | ---------- | ------- | ---------------------------------------------------------------------------------------- |
| `c747c024b` | 2026-08-22 | feat: Add Read+Write allowlists (#1274)                                                  | `C-REIMPLEMENT` | P0  | 28  | ☐           | —          | —          | —       | —                                                                                        |
| `c6eb8fb57` | 2026-09-12 | feat(file-safety): file version token for the guarded-write path (#1383)                 | `A-CLEAN`       | P0  | 0   | ☑ f4287ff4f | —          | 2026-09-16 | 3.88.4  | —                                                                                        |
| `e12a42e7a` | 2026-09-05 | feat(api): add throwIfAborted helper and completePrompt options regression tests (#1288) | `A-CLEAN`       | P1  | 0   | ☑ 1f38eb5b1 | —          | 2026-09-16 | 3.88.4  | —                                                                                        |
| `a5f4192bf` | 2026-09-01 | feat(api): abort signal support for bedrock (#1292)                                      | `A-CLEAN`       | P1  | 2   | ☑ 3c44a7d5a | —          | 2026-09-16 | 3.88.4  | excepted 2026-09-16 — merged with Δ2 under the pre-ladder classifier (2026-09-16 triage) |
| `e5248e59e` | 2026-09-10 | [Fix] MCP OAuth registration fails for unsupported grants (#1532)                        | `B-CAREFUL`     | P1  | 2   | ☐           | —          | —          | —       | —                                                                                        |

**Notes.** `c6eb8fb57` / `e12a42e7a` are the highest-value low-risk picks in the
whole backlog — take them first. `c747c024b` (#1274) is a genuine security
feature but touches `ClineProvider`, `Task`, the decomposed handlers,
`global-settings`, and 17 locale `settings.json` files; port it by hand via the
handler modules and follow the _Persisted Setting Checklist_ in `AGENTS.md`
(bind to `cachedState`, add to `getStateToPostToWebview`, test both the set and
unset cases). For `e5248e59e`, exclude the `.github/workflows/code-qa.yml` hunk.
`a5f4192bf` touches `bedrock.ts`, which is branding-normalised in the
code-index gate — re-run the gate after the pick. It is also the register's single
dated **`Exception`**: it merged with Δ 2 under the pre-ladder classifier (2026-09-16
triage), and rewriting that history would be worse than recording it, so `--verify`
prints the row by SHA under `class-ladder` instead of failing. The other four
`A-CLEAN` rows with Δ > 0 were still open, so they were reclassified to `B-CAREFUL`
(manual §9 changelog, 2026-09-24).

## SYNC-2 — Async Robustness (`P1`)

Theme: unhandled rejections, floating promises, awaited persistence.
Note: the fork already ratcheted `no-floating-promises` (`85f6f27cb`), so
upstream's `eslint.config.mjs` rule changes must be reconciled, not applied.

| SHA         | Date       | Subject                                                                       | Class           | Pri | Δ   | Status | Blocked-by | Resolved: | Version | Exception |
| ----------- | ---------- | ----------------------------------------------------------------------------- | --------------- | --- | --- | ------ | ---------- | --------- | ------- | --------- |
| `87077e1b1` | 2026-08-23 | fix(integrations): propagate async failures (#1351)                           | `B-CAREFUL`     | P1  | 3   | ☐      | —          | —         | —       | —         |
| `cdc25dda2` | 2026-08-22 | fix(config): await settings import persistence (#1340)                        | `B-CAREFUL`     | P1  | 3   | ☐      | —          | —         | —       | —         |
| `78c712ac4` | 2026-08-23 | [Fix] Background service failures can surface as unhandled rejections (#1352) | `B-CAREFUL`     | P1  | 6   | ☐      | —          | —         | —       | —         |
| `3dcac600b` | 2026-08-22 | [Chore] Enforce safe async handling in core tools (#1255)                     | `C-REIMPLEMENT` | P1  | 3   | ☐      | —          | —         | —       | —         |
| `4140c2c83` | 2026-09-05 | [Fix] Commits fail after users interrupt mutation tests (#1525)               | `C-REIMPLEMENT` | P3  | 1   | ☐      | —          | —         | —       | —         |

**Notes.** `78c712ac4` touches `processors/scanner.ts`, which **is** gated by
`verify-upstream-code-index-alignment.mjs` — expect the gate to demand byte
alignment on that file; `manager.ts` in the same commit is intentionally not
gated. Port the fix, do not import upstream's `eslint.config.mjs`.

## SYNC-3 — Task-History Durability (`P0`/`P1`)

Theme: persisted task history must never disappear or corrupt. Highest
user-visible severity class in the backlog.

| SHA         | Date       | Subject                                                                             | Class           | Pri | Δ   | Status | Blocked-by | Resolved: | Version | Exception |
| ----------- | ---------- | ----------------------------------------------------------------------------------- | --------------- | --- | --- | ------ | ---------- | --------- | ------- | --------- |
| `21d35c4a9` | 2026-08-20 | fix(task-history): atomic per-task merge and drop shared index file (#1231) (#1261) | `C-REIMPLEMENT` | P0  | 5   | ☐      | —          | —         | —       | —         |
| `8d296deef` | 2026-09-06 | [Fix] Task history disappears when user reopens a task (#1319)                      | `C-REIMPLEMENT` | P0  | 5   | ☐      | —          | —         | —       | —         |
| `2ecbf35a8` | 2026-09-07 | [Fix] Task history can disappear when users restart after completion (#1452)        | `C-REIMPLEMENT` | P0  | 13  | ☐      | —          | —         | —       | —         |
| `c28a1ffe7` | 2026-08-22 | fix(task): mark interrupted tool calls as errors in persisted history (#1323)       | `B-CAREFUL`     | P1  | 2   | ☐      | —          | —         | —       | —         |
| `49c3f5851` | 2026-09-05 | [Fix] Unit tests report teardown errors after Task cleanup (#1527)                  | `C-REIMPLEMENT` | P3  | 10  | ☐      | —          | —         | —       | —         |

**Notes.** `8d296deef` and `2ecbf35a8` are the same defect fixed twice upstream;
both touch `webviewMessageHandler.ts` (fork: 131-line router) so the routing
change must be re-derived into the decomposed handlers, while the `Task.ts` /
`events.ts` hunks may port more directly. The fork's own postmortem
`docs/postmortems/2026-09-09-webview-grayout-console-warnings.md` and incident
`docs/incidents/2026-09-15-clineMessages-state-payload.md` cover adjacent
message-payload territory — check for overlap before duplicating work.

## SYNC-4 — Task/Subtask Lifecycle Reliability (`P1`)

Theme: stalls and lost approvals in nested/delegated tasks.

| SHA         | Date       | Subject                                                                                    | Class           | Pri | Δ   | Status | Blocked-by | Resolved: | Version | Exception |
| ----------- | ---------- | ------------------------------------------------------------------------------------------ | --------------- | --- | --- | ------ | ---------- | --------- | ------- | --------- |
| `1dbe3bd22` | 2026-08-28 | [Fix] Restore subtask approvals when users return to tasks (#1320)                         | `C-REIMPLEMENT` | P1  | 9   | ☐      | —          | —         | —       | —         |
| `cd09db10e` | 2026-08-31 | [Fix] Child task view returns to Home during state updates (#1458)                         | `C-REIMPLEMENT` | P1  | 2   | ☐      | —          | —         | —       | —         |
| `9d43817fd` | 2026-09-05 | [Fix] Tasks stall when interrupted subtasks resume (#1470)                                 | `C-REIMPLEMENT` | P1  | 10  | ☐      | —          | —         | —       | —         |
| `b89962460` | 2026-09-10 | [Fix] Nested subtask tool calls no longer stall (#1494)                                    | `C-REIMPLEMENT` | P1  | 9   | ☐      | —          | —         | —       | —         |
| `8c9662966` | 2026-09-15 | fix(delegation): read task-local mode in getEnvironmentDetails and validateToolUse (#1625) | `B-CAREFUL`     | P1  | 6   | ☐      | —          | —         | —       | —         |
| `b55ff8707` | 2026-08-29 | [Fix] Subtask approval E2E times out after task restoration (#1434)                        | `B-CAREFUL`     | P3  | 2   | ☐      | —          | —         | —       | —         |

**Notes.** Treat as one investigation, not six picks: all five fixes concern the
same lifecycle state machine, and four touch `Task.ts` (the fork has 6 commits of
its own there) plus `ClineProvider`. `b55ff8707` is the E2E companion to
`1dbe3bd22` and should land with it. `8c96629661` intersects the fork's
own modes/delegation work — verify the per-mode validation path still holds.

## SYNC-5 — Provider & Model Correctness (`P1`/`P2`)

Theme: the bulk of the `A-CLEAN` quick-wins live here.

| SHA         | Date       | Subject                                                                        | Class           | Pri | Δ   | Status      | Blocked-by | Resolved:  | Version | Exception |
| ----------- | ---------- | ------------------------------------------------------------------------------ | --------------- | --- | --- | ----------- | ---------- | ---------- | ------- | --------- |
| `7e85e2793` | 2026-08-22 | [Fix] NanoGPT Muse Spark fails during tool use (#1310)                         | `A-CLEAN`       | P1  | 0   | ☑ 2868dec51 | —          | 2026-09-16 | 3.88.4  | —         |
| `4e8fa09f2` | 2026-09-03 | fix: yield reasoning chunks before content chunks in providers (#1462)         | `B-CAREFUL`     | P1  | 4   | ☐           | —          | —          | —       | —         |
| `bd399fa77` | 2026-08-22 | fix(openai-codex): complete prompts over the streaming transport (#1243)       | `B-CAREFUL`     | P1  | 4   | ☐           | —          | —          | —       | —         |
| `b0fdbc7a7` | 2026-08-28 | [Fix] Vertex Gemini 3.7 fails after tools return empty output (#1250)          | `B-CAREFUL`     | P1  | 2   | ☐           | —          | —          | —       | —         |
| `4c7474d42` | 2026-09-06 | [Fix] Reasoning models stop thinking after model selection (#1349)             | `B-CAREFUL`     | P1  | 1   | ☐           | —          | —          | —       | —         |
| `a3e31e14b` | 2026-09-07 | [Fix] Provider settings contact unselected model services (#1425)              | `B-CAREFUL`     | P1  | 10  | ☐           | —          | —          | —       | —         |
| `d5f779575` | 2026-09-12 | fix(openai-compatible): consistently apply configured reasoning effort (#1604) | `B-CAREFUL`     | P1  | 5   | ☐           | —          | —          | —       | —         |
| `db52d7fc7` | 2026-08-22 | feat(models): add Gemini 3.5 Flash Lite and 3.1 Flash Lite (#1334)             | `A-CLEAN`       | P2  | 0   | ☑ 388a75a6d | —          | 2026-09-16 | 3.88.4  | —         |
| `5e8fcc846` | 2026-09-02 | [Feat] Add deepseek-v4-flash-vision-exp to Deepseek AI (#1438)                 | `A-CLEAN`       | P2  | 0   | ☑ 567b94bd9 | —          | 2026-09-16 | 3.88.4  | —         |
| `c4574ffef` | 2026-09-05 | feat(providers): add DeepSeek V4 Flash Vision Exp (#1488)                      | `B-CAREFUL`     | P2  | 2   | ☐           | —          | —          | —       | —         |
| `22cc416ba` | 2026-09-03 | refactor(api): make Gemini CLI handler routing explicit (#1442)                | `B-CAREFUL`     | P2  | 1   | ☐           | —          | —          | —       | —         |
| `ec77e3f1e` | 2026-08-28 | feat(providers): add GLM-5.3-Flash support (#1430)                             | `B-CAREFUL`     | P2  | 1   | ☐           | —          | —          | —       | —         |
| `0d937c050` | 2026-09-04 | Add Claude Fable 5.1 support (#1508)                                           | `B-CAREFUL`     | P2  | 6   | ☐           | —          | —          | —       | —         |
| `f424bbbe4` | 2026-09-04 | [Feat] Add verified GPT-6 Astra support across providers (#1506)               | `B-CAREFUL`     | P2  | 8   | ☐           | —          | —          | —       | —         |
| `6ad8a6e58` | 2026-08-22 | fix(zoo-gateway): stop inventing UI cost from default model prices (#1339)     | `B-CAREFUL`     | P2  | 5   | ☐           | —          | —          | —       | —         |
| `d033a14c2` | 2026-09-03 | [Feat] Add custom request fields for OpenAI-compatible providers (#1350)       | `C-REIMPLEMENT` | P2  | 27  | ☐           | —          | —          | —       | —         |

**Notes.** `7e85e2793`, `db52d7fc7` and `5e8fcc846` are synced (☑) on `master` — merged via PR #345 (merge `6c4e9df5c`).
Six rows that were classed `A-CLEAN` on `Δ` alone turned out to depend on unsynced upstream
predecessors — they were moved to **SYNC-13**. `Δ` measures fork-side overlap only; see the
`Δ` caveat in the legend above and [`README.md`](README.md) §3.
`c4574ffef` and `5e8fcc846` add the same model twice (re-land); with `5e8fcc846` now synced, treat
`c4574ffef` as likely subsumed and verify before picking. `0d937c050` and `f424bbbe4` touch
`bedrock.ts` / `eslint-suppressions.json` (branding + suppression ratchet). `d033a14c2` needs the
full settings round-trip across 17 locales — schedule it separately from one-line provider fixes.

## SYNC-6 — Webview UX & Theming (`P2`/`P3`)

| SHA         | Date       | Subject                                                                    | Class           | Pri | Δ   | Status | Blocked-by | Resolved: | Version | Exception |
| ----------- | ---------- | -------------------------------------------------------------------------- | --------------- | --- | --- | ------ | ---------- | --------- | ------- | --------- |
| `dfed27dcd` | 2026-08-31 | [Fix] Approval controls disappear when user scrolls through chat (#1448)   | `B-CAREFUL`     | P2  | 2   | ☐      | —          | —         | —       | —         |
| `0b2b2281f` | 2026-09-04 | [Fix] Provider profile actions are cut off in settings (#1515)             | `B-CAREFUL`     | P2  | 1   | ☐      | —          | —         | —       | —         |
| `bb6e254c2` | 2026-09-07 | fix(webview): ignore blank or missing follow-up suggestion answers (#1286) | `B-CAREFUL`     | P2  | 4   | ☐      | —          | —         | —       | —         |
| `871bb982d` | 2026-08-20 | [Fix] Chat controls fade into light IDE themes (#1298)                     | `B-CAREFUL`     | P3  | 4   | ☐      | —          | —         | —       | —         |
| `39bdfb188` | 2026-08-21 | [Fix] Remaining chat controls fade into light IDE themes (#1312)           | `B-CAREFUL`     | P3  | 5   | ☐      | —          | —         | —       | —         |
| `d7795ca3f` | 2026-08-28 | [Improve] Keep rendered content legible across IDE themes (#1344)          | `B-CAREFUL`     | P3  | 4   | ☐      | —          | —         | —       | —         |
| `8187d3cf9` | 2026-08-30 | [Fix] Chat and History labels clip at narrow widths (#1445)                | `B-CAREFUL`     | P3  | 3   | ☐      | —          | —         | —       | —         |
| `fec4e1353` | 2026-08-22 | [Improve] Keep shared controls legible across IDE themes (#1333)           | `C-REIMPLEMENT` | P3  | 14  | ☐      | —          | —         | —       | —         |

**Notes.** The fork already invested in webview theming (see
`docs/runbooks/gray-webview.md` and the 2026-09-09 postmortem). Check whether
each upstream theming fix is already solved differently before picking — these
are candidates for `✖` if the fork's own implementation is superior.
`fec4e1353` spans 96 files and touches the handlers, so port only the CSS/contrast
intent.

## SYNC-7 — Protocol & Handler Re-Implementation Program (`P3`, enabler)

Theme: reduce the structural divergence that forces `C-REIMPLEMENT` on everything
else. This batch has no direct user-visible value but lowers the cost of all
future syncs.

| SHA         | Date       | Subject                                                                  | Class           | Pri | Δ   | Status | Blocked-by | Resolved: | Version | Exception |
| ----------- | ---------- | ------------------------------------------------------------------------ | --------------- | --- | --- | ------ | ---------- | --------- | ------- | --------- |
| `216450810` | 2026-09-16 | refactor(code-index): extract manager registry (#1622)                   | `C-REIMPLEMENT` | P3  | 13  | ☐      | —          | —         | —       | —         |
| `afdede5b9` | 2026-08-20 | lint(providers): enforce canonical identifiers (#1297)                   | `C-REIMPLEMENT` | P3  | 36  | ☐      | —          | —         | —       | —         |
| `972e75078` | 2026-09-01 | refactor(eslint): share provider identifier rule across packages (#1421) | `C-REIMPLEMENT` | P3  | 30  | ☐      | —          | —         | —       | —         |
| `c82f0a35b` | 2026-09-11 | refactor(providers): finish canonical identifier audit (#1493)           | `C-REIMPLEMENT` | P3  | 7   | ☐      | —          | —         | —       | —         |
| `db61d7364` | 2026-09-11 | test(code-index,tools): cover lines left uncovered by #1297 (#1317)      | `C-REIMPLEMENT` | P3  | 3   | ☐      | —          | —         | —       | —         |
| `1a7e71883` | 2026-09-01 | [Chore] Add concurrent task lifecycle model check (#1478)                | `C-REIMPLEMENT` | P3  | 4   | ☐      | —          | —         | —       | —         |
| `97265fd8e` | 2026-08-30 | test(webview): capture typed host messages (#1446)                       | `A-CLEAN`       | P2  | 0   | ☐      | —          | —         | —       | —         |

**Notes.** The provider-identifier family (`afdede5b9`, `972e75078`,
`c82f0a35be`, `db61d7364`) is one logical change spread over four commits and
collides with the fork's ESLint suppression ratchet (counts must never
increase). `216450810` moves the code-index manager registry — if ported, it
changes which code-index files are gated, so it must be paired with an update to
`scripts/verify-upstream-code-index-alignment.mjs`. `97265fd8e` is protocol-aligned
with the fork's typed registry and is a safe pick.

## SYNC-8 — Code-Index / Semble Alignment (`P1`)

| SHA         | Date       | Subject                                              | Class       | Pri | Δ   | Status | Blocked-by | Resolved: | Version | Exception |
| ----------- | ---------- | ---------------------------------------------------- | ----------- | --- | --- | ------ | ---------- | --------- | ------- | --------- |
| `63aca680e` | 2026-08-20 | fix(semble): increase archive download limit (#1306) | `B-CAREFUL` | P1  | 2   | ☐      | —          | —         | —       | —         |

**Notes.** Both sides have `src/services/code-index/semble/semble-downloader.ts`,
and Semble is treated as fork-specific/ungated by the alignment ADR. **Verify the
direction of this file** (fork-created-then-upstreamed, or converged
independently) before syncing; if the fork's downloader is the hardened one, the
upstream limit change must be re-applied as a patch to the fork's file rather
than a cherry-pick.

## SYNC-9 — Local Equivalents (`D-LOCAL`, never cherry-pick)

These commits encode decisions the fork has already made differently. Sync the
_intent_ locally or not at all; taking the commit would regress the fork.

| SHA         | Date       | Subject                                                              | Class     | Pri | Δ   | Status | Blocked-by | Resolved: | Version | Exception |
| ----------- | ---------- | -------------------------------------------------------------------- | --------- | --- | --- | ------ | ---------- | --------- | ------- | --------- |
| `f7ec103c6` | 2026-08-22 | chore: prepare v3.80.0 release (#1347)                               | `D-LOCAL` | P4  | 41  | ✖      | —          | —         | —       | —         |
| `8efff00e6` | 2026-08-29 | Release v3.80.1 (#1432)                                              | `D-LOCAL` | P4  | 43  | ✖      | —          | —         | —       | —         |
| `0dbd5846f` | 2026-09-05 | chore: prepare v3.82.0 release (#1533)                               | `D-LOCAL` | P4  | 41  | ✖      | —          | —         | —       | —         |
| `ebcd1a003` | 2026-09-12 | chore: prepare v3.82.1 release (#1609)                               | `D-LOCAL` | P4  | 3   | ✖      | —          | —         | —       | —         |
| `057dfeebb` | 2026-09-05 | ci: bump GitHub Actions to node24 runtimes (#1534)                   | `D-LOCAL` | P3  | 8   | ☐      | —          | —         | —       | —         |
| `edaf7a14e` | 2026-08-31 | [Chore] Remove unused nightly extension path (#1454)                 | `D-LOCAL` | P3  | 12  | ☐      | —          | —         | —       | —         |
| `9c9e68c96` | 2026-09-01 | [Refactor] Remove obsolete cloud account lifecycle listeners (#1353) | `D-LOCAL` | P4  | 4   | ✖      | —          | —         | —       | —         |
| `313ca59cb` | 2026-09-10 | Update dependency mammoth to v1.12.2 (#1472)                         | `D-LOCAL` | P3  | 1   | ☐      | —          | —         | —       | —         |
| `4db554918` | 2026-09-10 | Update dependency globals to v16.5.0 (#1474)                         | `D-LOCAL` | P3  | 3   | ☐      | —          | —         | —       | —         |
| `116ed7139` | 2026-09-10 | Update dependency i18next to v25.10.10 (#1475)                       | `D-LOCAL` | P3  | 1   | ☐      | —          | —         | —       | —         |
| `4e7f7dee8` | 2026-09-10 | Update dependency ink to v6.8.0 (#1477)                              | `D-LOCAL` | P3  | 1   | ☐      | —          | —         | —       | —         |
| `a6c48642f` | 2026-09-12 | chore(ci): model test bundle dependencies in Turbo (#1611)           | `D-LOCAL` | P3  | 1   | ☐      | —          | —         | —       | —         |

**Rationale.**

- **Release commits** (`f7ec103c6`, `8efff00e6`, `0dbd5846f`, `ebcd1a003`): the
  fork is on its own version line (`3.88.3` / package `roo-plus`) which is
  _ahead_ of upstream (`3.82.1` / `zoo-code`). Cherry-picking would downgrade the
  version, rename the package, and violate the release policy in
  [`adr-release-versioning-policy.md`](../adr/adr-release-versioning-policy.md)
  (one CHANGELOG section per minor; no per-patch sections). Rejected.
- **Dependency bumps**: the fork manages its own `pnpm-lock.yaml` via
  `renovate.json`; regenerate locally instead of importing lockfile churn
  (lockfile is changed by both sides — 9 upstream touches).
- **`9c9e68c96`** (cloud listeners): the fork removed `packages/cloud/` entirely
  ([`adr-cloud-removal.md`](../adr/adr-cloud-removal.md)); there is nothing to
  remove. Rejected.
- **`057dfeebb`** (node24 Actions) genuinely applies to the fork's own workflows —
  re-apply locally.
- **`edaf7a14e`** (nightly path): only relevant if the fork still ships a nightly
  path; verify then re-implement locally.

## SYNC-10 — Test-Only Ports (`P3`)

| SHA         | Date       | Subject                                                      | Class       | Pri | Δ   | Status | Blocked-by | Resolved: | Version | Exception |
| ----------- | ---------- | ------------------------------------------------------------ | ----------- | --- | --- | ------ | ---------- | --------- | ------- | --------- |
| `ae6c1a876` | 2026-09-11 | test(e2e): add LM Studio reasoning_content e2e guard (#1322) | `A-CLEAN`   | P3  | 0   | ☐      | —          | —         | —       | —         |
| `87d41aa4f` | 2026-09-12 | test(webview): stabilize theme contrast audit (#1613)        | `A-CLEAN`   | P3  | 0   | ☐      | —          | —         | —       | —         |
| `147147cda` | 2026-08-30 | test(e2e): ignore partial asks in completion waits (#1449)   | `B-CAREFUL` | P3  | 1   | ☐      | —          | —         | —       | —         |

**Notes.** Cheap, but only worth taking where the fork has the corresponding test
lane. Per the fork's test-placement guidance, port these at the lowest layer that
would catch the regression rather than importing upstream's E2E verbatim.

## SYNC-11 — Rejected (`X-REJECT`)

| SHA         | Date       | Subject                                                                       | Class      | Pri | Δ   | Status | Blocked-by | Resolved: | Version | Exception |
| ----------- | ---------- | ----------------------------------------------------------------------------- | ---------- | --- | --- | ------ | ---------- | --------- | ------- | --------- |
| `1ad8f528d` | 2026-08-21 | fix(telemetry): default telemetry to opt-out with explicit consent UI (#1069) | `X-REJECT` | P4  | 53  | ✖      | —          | —         | —       | —         |

**Rationale.** The commit adds a telemetry consent UI across 61 files including
17 locale `settings.json`/`welcome.json` pairs and `PRIVACY.md`. The fork has
**zero** telemetry references in `src/` and `webview-ui/src/` (upstream: 131
files) after the deliberate v3.88.0 telemetry purge responding to Marketplace
notice #305. Opt-out is strictly weaker than the fork's removal; merging this
would re-introduce the very surface that was purged. If the privacy _language_
in `PRIVACY.md` is an improvement, lift the wording only.

## SYNC-12 — Out of Scope (`E-SKIP`, upstream-org automation)

**Rationale.** These 27 commits operate upstream's automation stack (CodeRabbit,
merge queue, mutation-testing gates, coverage caching, PR labelling, VSIX upload).
The fork runs different CI (`.github/workflows/code-qa.yml`,
`label-pr-review-state.yml` are among the most-diverged files: 9 and 7 upstream
touches respectively). Re-evaluate only if the fork adopts the same tooling.

| SHA         | Date       | Subject                                                                             | Class    | Pri | Δ   | Status | Blocked-by | Resolved: | Version | Exception |
| ----------- | ---------- | ----------------------------------------------------------------------------------- | -------- | --- | --- | ------ | ---------- | --------- | ------- | --------- |
| `d28e4a129` | 2026-08-22 | ci: upload test VSIX for pull requests (#1314)                                      | `E-SKIP` | P4  | 1   | ✖      | —          | —         | —       | —         |
| `efc30cfa0` | 2026-08-29 | feat: configure CodeRabbit adversarial PR reviews (#1433)                           | `E-SKIP` | P4  | 0   | ✖      | —          | —         | —       | —         |
| `8f7f48ad5` | 2026-08-29 | [Chore] Add Extension Host visual regression coverage (#1426)                       | `E-SKIP` | P4  | 9   | ✖      | —          | —         | —       | —         |
| `ad05c1c14` | 2026-08-30 | [Chore] Queue CodeRabbit after required CI (#1437)                                  | `E-SKIP` | P4  | 2   | ✖      | —          | —         | —       | —         |
| `b18b6f01c` | 2026-08-30 | fix: let reviewed fork PRs enter merge queue (#1455)                                | `E-SKIP` | P4  | 1   | ✖      | —          | —         | —       | —         |
| `7bc054ba8` | 2026-08-31 | fix: review label-opted PR updates (#1457)                                          | `E-SKIP` | P4  | 0   | ✖      | —          | —         | —       | —         |
| `104700e92` | 2026-09-01 | fix: open Renovate PRs before status checks (#1473)                                 | `E-SKIP` | P4  | 0   | ✖      | —          | —         | —       | —         |
| `6b319e330` | 2026-09-01 | [Fix] PR labels remain stale after CI completes (#1467)                             | `E-SKIP` | P4  | 1   | ✖      | —          | —         | —       | —         |
| `a1ca0c8f7` | 2026-09-01 | chore: ground CodeRabbit reviews with web search (#1490)                            | `E-SKIP` | P4  | 0   | ✖      | —          | —         | —       | —         |
| `79cd12f2c` | 2026-09-03 | [Chore] Require changed-code mutation tests before review (#1479)                   | `E-SKIP` | P4  | 3   | ✖      | —          | —         | —       | —         |
| `b2f63d366` | 2026-09-03 | [Fix] Mutation gate fails for stale and current pull requests (#1499)               | `E-SKIP` | P4  | 0   | ✖      | —          | —         | —       | —         |
| `ca8a22f12` | 2026-09-04 | [Fix] Fork PR review state stays stale after automated review (#1510)               | `E-SKIP` | P4  | 2   | ✖      | —          | —         | —       | —         |
| `dee40cc3d` | 2026-09-04 | [Fix] PR review labels stay stale after automated reviews or base conflicts (#1509) | `E-SKIP` | P4  | 1   | ✖      | —          | —         | —       | —         |
| `134923e15` | 2026-09-08 | [Chore] Refine CodeRabbit review checks (#1571)                                     | `E-SKIP` | P4  | 0   | ✖      | —          | —         | —       | —         |
| `034c14104` | 2026-09-10 | [Chore] Clarify CodeRabbit approval checks (#1577)                                  | `E-SKIP` | P4  | 0   | ✖      | —          | —         | —       | —         |
| `01c7357a7` | 2026-09-11 | [Fix] Review labels disappear after base updates (#1584)                            | `E-SKIP` | P4  | 1   | ✖      | —          | —         | —       | —         |
| `d8f2d47ec` | 2026-09-12 | [Improve] Make mutation findings advisory (#1610)                                   | `E-SKIP` | P4  | 0   | ✖      | —          | —         | —       | —         |
| `7cd854972` | 2026-09-12 | [Chore] Separate extension unit and bundle smoke tests (#1614)                      | `E-SKIP` | P4  | 1   | ✖      | —          | —         | —       | —         |
| `0ea690508` | 2026-09-12 | [Improve] Make mutation warnings easier to review (#1619)                           | `E-SKIP` | P4  | 0   | ✖      | —          | —         | —       | —         |
| `294c5fff1` | 2026-09-12 | chore(coderabbit): make completeness checks advisory (#1621)                        | `E-SKIP` | P4  | 0   | ✖      | —          | —         | —       | —         |
| `4fe5a1f77` | 2026-09-13 | [Fix] Review Roomote pull requests with CodeRabbit (#1598)                          | `E-SKIP` | P4  | 1   | ✖      | —          | —         | —       | —         |
| `ba46d1f34` | 2026-09-13 | [Chore] Use cacheable extension test lanes in CI (#1620)                            | `E-SKIP` | P4  | 2   | ✖      | —          | —         | —       | —         |
| `99025b1fb` | 2026-09-14 | [Chore] Cache extension coverage by ownership (#1631)                               | `E-SKIP` | P4  | 2   | ✖      | —          | —         | —       | —         |
| `1da6fa660` | 2026-09-15 | [Fix] Merge queue rejects legitimate source changes (#1644)                         | `E-SKIP` | P4  | 0   | ✖      | —          | —         | —       | —         |
| `072b6f36f` | 2026-09-15 | fix(ci): skip mutation testing for draft PRs (#1645)                                | `E-SKIP` | P4  | 0   | ✖      | —          | —         | —       | —         |
| `fdef10685` | 2026-09-16 | fix(ci): union extension coverage before upload (#1650)                             | `E-SKIP` | P4  | 2   | ✖      | —          | —         | —       | —         |
| `99736300f` | 2026-09-16 | [Fix] Preserve coverage caches for verifier-only changes (#1649)                    | `E-SKIP` | P4  | 2   | ✖      | —          | —         | —       | —         |

---

## SYNC-13 — Provider quick-wins blocked on unsynced upstream prerequisites (`P1`/`P2`)

Created 2026-09-16 from the former `SYNC-5` dependent subset (the “SYNC-5b” grouping). These rows
were classed `A-CLEAN` on `Δ` alone, which proved wrong: `Δ` measures **fork-side** overlap only
and is blind to _“upstream’s own predecessor for this file has not been synced yet”_. Every pick
below conflicts with an **empty fork side** — the fork’s content equals the merge base, and the
incoming diff is a delta on a model/feature entry the fork does not have. Verified 2026-09-16.

**Rule:** land each row’s prerequisite first (see the chains below), then re-attempt the row. Do not
cherry-pick these until the named prerequisite is on the target branch.

**`Blocked-by` recorded 2026-09-24, resolved 2026-09-24.** Each row below records its documented
prerequisite in `Blocked-by`. Two of them previously carried the literal `unknown`, which is no
longer permitted — the documented chains name no prerequisite row for `a80b3b3ab` (it _is_ the
opencode-go prerequisite, so it is in the ready set) or for `745656a50`, so both cells now read
`—`. No class, priority or `Δ` was changed by that migration — the six rows were `A-CLEAN` with
these `Δ` values before it.

The WS-1b adjudication (H-02 amendment) then split what this cell means, because `A-CLEAN` plus a
recorded prerequisite is two different things and only one of them is a defect:

- **Rule (hard, `class-ladder`)**: `A-CLEAN` ⇒ Δ = 0. An `A-CLEAN` label asserts pickability, so
  `745656a50` (Δ 2) was **reclassified to `B-CAREFUL`** on 2026-09-24 (the manual's §9 changelog
  names it and the three other rows).
- **Readiness (advisory, `blocked-by-pending` + the ready set)**: a row whose named prerequisite
  has not landed is _correctly blocked_ — that is precisely what `Blocked-by` means — so it is
  reported as an advisory and excluded from the derived ready set, never as a failure. The five
  remaining `A-CLEAN` rows here therefore stay `A-CLEAN`: `a80b3b3ab` is ready, `7bb14e44e` and
  `cc9c0afe9` are blocked on `a80b3b3ab`, and `1165aebc8` / `500152b78` name a prerequisite that
  has already landed (`7e85e2793` / `5e8fcc846`).

| SHA         | Date       | Subject                                                                     | Class       | Pri | Δ   | Status | Blocked-by  | Resolved: | Version | Exception |
| ----------- | ---------- | --------------------------------------------------------------------------- | ----------- | --- | --- | ------ | ----------- | --------- | ------- | --------- |
| `a80b3b3ab` | 2026-08-30 | [Fix] Opencode Go routes gpt-5.6-luna through /v1/responses (#1443)         | `A-CLEAN`   | P1  | 0   | ☐      | —           | —         | —       | —         |
| `7bb14e44e` | 2026-09-04 | fix(opencode-go): send conversation session header (#1512)                  | `A-CLEAN`   | P1  | 0   | ☐      | `a80b3b3ab` | —         | —       | —         |
| `1165aebc8` | 2026-09-11 | fix(nanogpt): preserve optional tool parameters (#1590)                     | `A-CLEAN`   | P1  | 0   | ☐      | `7e85e2793` | —         | —       | —         |
| `500152b78` | 2026-09-16 | [Fix] DeepSeek Flash cannot read attached images (#1618)                    | `A-CLEAN`   | P1  | 0   | ☐      | `5e8fcc846` | —         | —       | —         |
| `745656a50` | 2026-09-12 | fix(settings): preserve configured LiteLLM model ID in model picker (#1368) | `B-CAREFUL` | P1  | 2   | ☐      | —           | —         | —       | —         |
| `cc9c0afe9` | 2026-09-10 | [Fix] OpenCode Go context meter shows incorrect limits (#1428)              | `A-CLEAN`   | P2  | 0   | ☐      | `a80b3b3ab` | —         | —       | —         |

**Prerequisite chains (verified 2026-09-16)**

- `500152b78` (#1618) is a **git descendant** of `5e8fcc846` (#1438) and `c4574ffef` (#1488), which
  introduce `deepseek-v4-flash-vision-exp`. `5e8fcc846` is now ☑ `567b94bd9`, so **re-attempt
  `500152b78` first** — it should land as the alias/pricing rewrite on top. Observed conflicts:
  `packages/types/src/providers/deepseek.ts` (58–76), `src/api/providers/deepseek.ts` (31–40),
  `packages/types/src/__tests__/deepseek-v4-pro.test.ts` (44–59),
  `src/api/providers/__tests__/deepseek.spec.ts` (252–272, 348–407).
- `7bb14e44e` (#1512) and `cc9c0afe9` (#1428) are opencode-go changes built on `a80b3b3ab` (#1443);
  `a80b3b3ab`’s incoming diff assumes upstream’s `gpt-5.6-luna` fixtures. Order: `a80b3b3ab` → then
  `7bb14e44e` / `cc9c0afe9`.
- `1165aebc8` (#1590) still conflicts after `7e85e2793` (#1310) landed — inspect the nanogpt
  tool-parameter surface before attempting.
- `745656a50` (#1368) conflicts in `webview-ui/src/components/ui/hooks/useSelectedModel.ts`.

---

---

## SYNC-14 — Refresh 2026-09-24 (proposals — needs human triage)

These 24 commit(s) landed on `upstream/main` after the recorded baseline tip `500152b78`. Classes/priorities below are **proposals** computed from git-derived evidence (README §3) by `scripts/upstream-sync-triage.mjs --refresh`; review before picking and re-home any row whose theme belongs to an existing batch.

| SHA         | Date       | Subject                                                                                                    | Class           | Pri | Δ   | Status | Blocked-by | Resolved: | Version | Exception |
| ----------- | ---------- | ---------------------------------------------------------------------------------------------------------- | --------------- | --- | --- | ------ | ---------- | --------- | ------- | --------- |
| `10b45abf7` | 2026-09-17 | fix(ci): scope mutation diff to merge result base (#1655)                                                  | `A-CLEAN`       | P1  | 0   | ☐      | —          | —         | —       | —         |
| `77e422faf` | 2026-09-17 | fix: \_isGrokXAI() false-positive substring match breaks token usage for domains containing "x.ai" (#1484) | `B-CAREFUL`     | P1  | 1   | ☐      | —          | —         | —       | —         |
| `a0f2e0355` | 2026-09-18 | [Fix] Prevent unavailable tools from appearing in system prompts (#1505)                                   | `C-REIMPLEMENT` | P1  | 9   | ☐      | —          | —         | —       | —         |
| `332b83f22` | 2026-09-18 | [Fix] Awaiting-author label clears before maintainer re-review after author pushes (#1672)                 | `B-CAREFUL`     | P1  | 1   | ☐      | —          | —         | —       | —         |
| `8535808da` | 2026-09-19 | chore: prepare v3.82.2 release (#1677)                                                                     | `D-LOCAL`       | P3  | 3   | ☐      | —          | —         | —       | —         |
| `9e4a52d99` | 2026-09-19 | fix: align codebase search readiness across mode filters (#1630)                                           | `A-CLEAN`       | P1  | 0   | ☐      | —          | —         | —       | —         |
| `7c302a51b` | 2026-09-19 | fix(visual): mask context-token counter in electron sidebar snapshot (#1680)                               | `A-CLEAN`       | P1  | 0   | ☐      | —          | —         | —       | —         |
| `bac8adcf2` | 2026-09-19 | fix(terminal): prevent inline terminal cmd.exe fallback on Windows (#1673)                                 | `A-CLEAN`       | P1  | 0   | ☐      | —          | —         | —       | —         |
| `c5b585565` | 2026-09-19 | [Docs] Add lifecycle verification GAP report and remediation blocks (#1626)                                | `B-CAREFUL`     | P3  | 1   | ☐      | —          | —         | —       | —         |
| `a799355ee` | 2026-09-19 | chore: replace Navad with James in weekly release reminder rotation (#1700)                                | `E-SKIP`        | P4  | 1   | ☐      | —          | —         | —       | —         |
| `914f0c42a` | 2026-09-20 | test(e2e): poll restart conversation history (#1663)                                                       | `A-CLEAN`       | P3  | 0   | ☐      | —          | —         | —       | —         |
| `08d05eb0f` | 2026-09-20 | fix(vscode-lm): add guarded recovery parser and schema conversion (#1188)                                  | `B-CAREFUL`     | P1  | 2   | ☐      | —          | —         | —       | —         |
| `741f19830` | 2026-09-20 | [Chore] Reduce Windows CI cold-start time (#1654)                                                          | `B-CAREFUL`     | P3  | 3   | ☐      | —          | —         | —       | —         |
| `1ebbd954e` | 2026-09-20 | chore(deps): update dependency vitest to v4.1.11 [security] (#1582)                                        | `D-LOCAL`       | P0  | 7   | ☐      | —          | —         | —       | —         |
| `4436ac537` | 2026-09-20 | fix(mcp): preserve concurrent MCP settings during initial creation (fixes #1371) (#1380)                   | `B-CAREFUL`     | P1  | 1   | ☐      | —          | —         | —       | —         |
| `f797477b8` | 2026-09-20 | fix(code-index): search the task workspace without initializing managers (#1629)                           | `B-CAREFUL`     | P1  | 2   | ☐      | —          | —         | —       | —         |
| `f6af57a1d` | 2026-09-20 | fix(openai-native): use canonical default model (#1627)                                                    | `B-CAREFUL`     | P1  | 3   | ☐      | —          | —         | —       | —         |
| `1a0f8fc04` | 2026-09-20 | fix(task): keep delegated child mode isolated (#1637)                                                      | `C-REIMPLEMENT` | P1  | 6   | ☐      | —          | —         | —       | —         |
| `01928c3c4` | 2026-09-21 | fix(model-cache): propagate caller cancellation into catalog fetches (#1683)                               | `B-CAREFUL`     | P1  | 3   | ☐      | —          | —         | —       | —         |
| `78b74ec1c` | 2026-09-22 | fix(terminal): inherit the host UTF-8 locale instead of forcing en_US.UTF-8 (#1713)                        | `A-CLEAN`       | P1  | 0   | ☐      | —          | —         | —       | —         |
| `7328cbf9f` | 2026-09-23 | fix(task): preserve subtask links after repeated Stop (#1678)                                              | `C-REIMPLEMENT` | P1  | 2   | ☐      | —          | —         | —       | —         |
| `f78064753` | 2026-09-23 | chore: append scope-boundary instruction to CodeRabbit global path instructions (#1757)                    | `E-SKIP`        | P4  | 0   | ☐      | —          | —         | —       | —         |
| `9176f2f69` | 2026-09-24 | [Feat] Add GPT-6 Sol and Luna to OpenAI model catalogs (#1755)                                             | `A-CLEAN`       | P2  | 0   | ☐      | —          | —         | —       | —         |
| `9ec139cd8` | 2026-09-24 | [Feat] Add Claude Opus 5.5 to model providers (#1756)                                                      | `B-CAREFUL`     | P2  | 3   | ☐      | —          | —         | —       | —         |

**`10b45abf7` evidence.** Δ 0 of 2 file(s). Proposed `A-CLEAN` / P1: Δ 0 — no overlap with any fork-touched file; intent prefix "fix"

**`77e422faf` evidence.** Δ 1 of 2 file(s). Proposed `B-CAREFUL` / P1: Δ 1 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`a0f2e0355` evidence.** Δ 9 of 35 file(s) · hot: src/core/task/Task.ts, src/eslint-suppressions.json · CORE_FILES: src/core/prompts/tools/filter-tools-for-mode.ts. Proposed `C-REIMPLEMENT` / P1: telemetry hit — the fork purged the telemetry transport; re-implement, never cherry-pick; intent prefix "fix"

**`332b83f22` evidence.** Δ 1 of 2 file(s) · hot: .github/workflows/label-pr-review-state.yml. Proposed `B-CAREFUL` / P1: Δ 1 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`8535808da` evidence.** Δ 3 of 3 file(s) · hot: src/package.json. Proposed `D-LOCAL` / P3: scope of concern the fork owns (CHANGELOG.md, src/CHANGELOG.md, src/package.json) with no runtime source change; hygiene intent prefix "chore"

**`9e4a52d99` evidence.** Δ 0 of 3 file(s). Proposed `A-CLEAN` / P1: Δ 0 — no overlap with any fork-touched file; intent prefix "fix"

**`7c302a51b` evidence.** Δ 0 of 2 file(s). Proposed `A-CLEAN` / P1: Δ 0 — no overlap with any fork-touched file; intent prefix "fix"

**`bac8adcf2` evidence.** Δ 0 of 2 file(s). Proposed `A-CLEAN` / P1: Δ 0 — no overlap with any fork-touched file; intent prefix "fix"

**`c5b585565` evidence.** Δ 1 of 8 file(s) · hot: package.json. Proposed `B-CAREFUL` / P3: Δ 1 — small overlap, cherry-pick then rebrand + gates; hygiene intent prefix "docs"

**`a799355ee` evidence.** Δ 1 of 1 file(s). Proposed `E-SKIP` / P4: files touch only upstream-org automation (.github/.coderabbit/CONTRIBUTING); E-SKIP — not applicable to the fork

**`914f0c42a` evidence.** Δ 0 of 1 file(s). Proposed `A-CLEAN` / P3: Δ 0 — no overlap with any fork-touched file; hygiene intent prefix "test"

**`08d05eb0f` evidence.** Δ 2 of 4 file(s). Proposed `B-CAREFUL` / P1: Δ 2 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`741f19830` evidence.** Δ 3 of 7 file(s) · hot: .github/workflows/code-qa.yml, package.json, src/package.json. Proposed `B-CAREFUL` / P3: Δ 3 — small overlap, cherry-pick then rebrand + gates; hygiene intent prefix "chore"

**`1ebbd954e` evidence.** Δ 7 of 10 file(s) · hot: pnpm-lock.yaml, src/package.json. Proposed `D-LOCAL` / P0: files are dependency manifests / lockfile — regenerate locally; value override on "security" (data loss / security / crash / stall)

**`4436ac537` evidence.** Δ 1 of 3 file(s). Proposed `B-CAREFUL` / P1: Δ 1 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`f797477b8` evidence.** Δ 2 of 3 file(s). Proposed `B-CAREFUL` / P1: Δ 2 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`f6af57a1d` evidence.** Δ 3 of 3 file(s). Proposed `B-CAREFUL` / P1: Δ 3 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`1a0f8fc04` evidence.** Δ 6 of 16 file(s) · hot: src/eslint-suppressions.json. Proposed `C-REIMPLEMENT` / P1: Δ 6 — large overlap; runbook §2 stop condition (Δ>5 outside C-REIMPLEMENT) means inspect by hand; intent prefix "fix"

**`01928c3c4` evidence.** Δ 3 of 29 file(s). Proposed `B-CAREFUL` / P1: Δ 3 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`78b74ec1c` evidence.** Δ 0 of 4 file(s). Proposed `A-CLEAN` / P1: Δ 0 — no overlap with any fork-touched file; intent prefix "fix"

**`7328cbf9f` evidence.** Δ 2 of 2 file(s) · hot: src/core/webview/ClineProvider.ts. Proposed `C-REIMPLEMENT` / P1: structural divergence (decomposed webview handlers / ClineProvider); intent prefix "fix"

**`f78064753` evidence.** Δ 0 of 1 file(s) · hot: .coderabbit.yaml. Proposed `E-SKIP` / P4: files touch only upstream-org automation (.github/.coderabbit/CONTRIBUTING); E-SKIP — not applicable to the fork

**`9176f2f69` evidence.** Δ 0 of 3 file(s). Proposed `A-CLEAN` / P2: Δ 0 — no overlap with any fork-touched file; intent prefix "feat"

**`9ec139cd8` evidence.** Δ 3 of 15 file(s). Proposed `B-CAREFUL` / P2: Δ 3 — small overlap, cherry-pick then rebrand + gates; intent prefix "feat"

---

## SYNC-15 — Refresh 2026-09-25 (proposals — needs human triage)

These 2 commit(s) landed on `upstream/main` after the recorded baseline tip `9ec139cd8`. Classes/priorities below are **proposals** computed from git-derived evidence (README §3) by `scripts/upstream-sync-triage.mjs --refresh`; review before picking and re-home any row whose theme belongs to an existing batch.

| SHA | Date | Subject | Class | Pri | Δ | Status | Blocked-by | Resolved: | Version | Exception |
| --- | ---- | ------- | ----- | --- | - | ------ | ---------- | --------- | ------- | ------- |
| `ebf4bd2d3` | 2026-09-24 | fix(prompts): report the shell that actually runs under Inline Terminal (#1682) | `A-CLEAN` | P1 | 0 | ☐ | — | — | — | — |
| `fadd66a34` | 2026-09-25 | chore(coderabbit): allow non-org members to interact with chat (#1775) | `E-SKIP` | P4 | 0 | ☐ | — | — | — | — |

**`ebf4bd2d3` evidence.** Δ 0 of 4 file(s). Proposed `A-CLEAN` / P1: Δ 0 — no overlap with any fork-touched file; intent prefix "fix"

**`fadd66a34` evidence.** Δ 0 of 1 file(s) · hot: .coderabbit.yaml. Proposed `E-SKIP` / P4: files touch only upstream-org automation (.github/.coderabbit/CONTRIBUTING); E-SKIP — not applicable to the fork

## Recommended execution order

1. **SYNC-1 `A-CLEAN` trio** — ✅ synced (☑) on `master` — merged via PR #345 (merge `6c4e9df5c`): `c6eb8fb57` → `f4287ff4f`,
   `e12a42e7a` → `1f38eb5b1`, `a5f4192bf` → `3c44a7d5a`.
2. **SYNC-5 clean subset** — ✅ synced (☑) on `master` — merged via PR #345 (merge `6c4e9df5c`): `7e85e2793` → `2868dec51`, `db52d7fc7` → `388a75a6d`,
   `5e8fcc846` → `567b94bd9`. Six further rows proved dependency-blocked and moved to **SYNC-13**.
3. **SYNC-13** — re-attempt `500152b78` first (its prerequisite `5e8fcc846` is now synced), then the
   opencode-go chain (`a80b3b3ab` → `7bb14e44e` / `cc9c0afe9`), then `1165aebc8` and `745656a50`.
4. **SYNC-2** — async robustness (`P1`), reconciling eslint rather than importing.
5. **SYNC-3 / SYNC-4** — task-history and lifecycle reliability, as two investigations (`P0`/`P1`).
6. **SYNC-1 `c747c024b`** (#1274 allowlists) — security feature, deliberate port.
7. **SYNC-8**, **SYNC-10**, **SYNC-9 local re-implementations** as capacity allows.
8. **SYNC-7** — background enabler; lowers the cost of every subsequent sync.
9. **SYNC-6** — evaluate each theming fix for "already solved by fork" before doing any work.
   doing any work.
