# Pending Upstream Commits — Sync Register

**Source of truth** for what remains to be synced from
`Zoo-Code-Org/Zoo-Code` (`upstream/main`) into Roo+ (`master`).

Decision record: [`adr-upstream-sync-triage-strategy.md`](../adr/adr-upstream-sync-triage-strategy.md).
Operating manual + refresh procedure: [`README.md`](README.md).

**Agents: start with [`../runbooks/upstream-sync.md`](../runbooks/upstream-sync.md)** — the imperative runbook (hard rules, stop conditions, copy-paste prompts, definition of done). This register is the _data_; the runbook is the _procedure_.

## Baseline

| Field                                    | Value                                                                                                                                                                                                                                                                |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Baseline recorded                        | 2026-09-16 (initial register; each later refresh is recorded in the README §9 changelog)                                                                                                                                                                             |
| Merge base                               | `252c69b5` (2026-08-20, "fix: stream reasoning_content in LM Studio provider (#1175)")                                                                                                                                                                               |
| Upstream tip                             | `d672d7961` (2026-11-24, "[Fix] Sliding-window truncation skips messages hidden by condensation (#2647)")                                                                                                                                                            |
| Fork tip                                 | `77a670196` (2026-09-15, PR #338 merge)                                                                                                                                                                                                                              |
| Pending upstream commits                 | **427**                                                                                                                                                                                                                                                              |
| Fork-only commits                        | 180                                                                                                                                                                                                                                                                  |
| Conflict surface (files changed by both) | 272                                                                                                                                                                                                                                                                  |
| Refresh procedure                        | Automated by [`scripts/upstream-sync-triage.mjs`](../../scripts/upstream-sync-triage.mjs:1) — `--refresh` (dry run), `--refresh --write` to apply, `--verify` to check. See [`README.md` §6](README.md).                                                             |
| Evidence snapshots                       | [`raw-upstream-commits.txt`](raw-upstream-commits.txt) and [`triage-raw.tsv`](triage-raw.tsv) — generated 2026-09-16 at the initial baseline (they are a dated snapshot, not a view of the current tip); regenerate via [`README.md` §2](README.md), never hand-edit |

> **Shallow-clone warning.** This checkout is shallow (`.git/shallow`). Before
> computing a merge base, deepen the upstream ref or the numbers are wrong.
> `--refresh` does this deterministically (`git fetch --shallow-since=<date>
upstream main`, the date derived from this header); by hand, use
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
  resolution **`Resolved:`** date, and its fork SHA must be **linked**: the fork commit
  message carries the `-x` trailer `cherry picked from commit <row sha>`, or the row
  declares a `Local-fix:`/`divergence:` record (a re-implementation). A fork SHA that is
  merely reachable fails the check `synced-fork-sha` by row SHA.
- `✖` — **deliberately discarded**. It MUST carry an **attributable** rationale: inline in
  the Status cell (`✖ <reason>`) or in its batch's **Rationale.** block, which must name the
  row's SHA (or a SHA range). One shared paragraph that names no SHA fails the check
  `discard-rationale` by row SHA.
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

- **Hard** (`blocked-by`): every token must name a **different row in this register**,
  and the prerequisite graph must be **acyclic** — an A↔B loop can never be satisfied, so
  a cycle fails by member SHA. A token that names no row, names the row itself, or is the
  literal `unknown` fails by row SHA. The literal `unknown` is **forbidden** — a named
  unknown looks like a resolved reference while carrying no information, so write `—` when
  the documented chain names no row.
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

| Class           | Count                         |
| --------------- | ----------------------------- |
| `A-CLEAN`       | 66 (45 are `A-CLEAN` ∧ P0–P2) |
| `B-CAREFUL`     | 155                           |
| `C-REIMPLEMENT` | 121                           |
| `D-LOCAL`       | 50                            |
| `E-SKIP`        | 34                            |
| `X-REJECT`      | 1                             |
| **Total**       | **427**                       |

| Priority | Count |
| -------- | ----- |
| `P0`     | 16    |
| `P1`     | 165   |
| `P2`     | 67    |
| `P3`     | 139   |
| `P4`     | 40    |

**Read this as:** the fork is not "427 commits behind" — the backlog is the
`Pending upstream commits` count above, and what is _pickable today_ is the
**derived ready set**, which `--verify` computes (`A-CLEAN` ∧ Δ 0 ∧ `Blocked-by` = ∅
∧ open). This prose pins no ready-set number on purpose: it is a predicate over the
rows, not a stored fact, so a pinned literal would only rot. 121 rows are
`C-REIMPLEMENT` — deliberate re-implementation because of architecture the fork
changed — and 84 are either owned locally or permanently out of scope (50 `D-LOCAL`

- 34 `E-SKIP`). (The 2026-09-24 ladder enforcement moved four `A-CLEAN` rows with
  Δ > 0 to `B-CAREFUL`; the 2026-09-24, 2026-09-25, 2026-10-01, 2026-10-07 and
  2026-11-24 guarded refreshes folded in 24, 2, 28, 32 and 239 upstream commits
  respectively — see the manual's §9 changelog.)

### Tracked-versus-recorded scope (the two progress series)

The headline `Pending upstream commits` count above is raw backlog and, by
construction, can only grow as upstream advances. Progress is reported as two
**series** (ADR amendment 2026-09-28, H-21 / HD-11):

| Series               | What it counts                                                                                             | How to read it off the register                       |
| -------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| **Tracked absorbed** | `P0`/`P1` rows that are `☑`, plus the divergence program as it lands                                       | count `☑` rows whose priority is `P0`/`P1`            |
| **Divergence stock** | open `C-REIMPLEMENT` rows — the structural program that forces hand-ports, plus the rebrand/conflict scope | count `☐`/`◐`/`⏸` rows whose class is `C-REIMPLEMENT` |

**Tracked (counted):** `P0`/`P1` + the divergence program. **Recorded but never
counted as "pending":** `P3`/`P4`, `D-LOCAL`, `E-SKIP`, and the single `X-REJECT`
row. **Forced decision:** if the _ready set_ drops below **5**, the oldest
unresolved `P0` passes **30 days**, or **two consecutive cycles close zero rows**,
the next cycle MUST record a decision (fund the divergence program, declare a
merge mode with a written resolution policy, or add capacity) instead of
continuing. The register owner re-confirms the tracked scope quarterly. The
machine-parsed `## Baseline` table above is deliberately left unchanged.

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
| `bd399fa77` | 2026-08-22 | fix(openai-codex): complete prompts over the streaming transport (#1243)       | `B-CAREFUL`     | P1  | 4   | ☐           | —          | —          | —       | —         |
| `b0fdbc7a7` | 2026-08-28 | [Fix] Vertex Gemini 3.7 fails after tools return empty output (#1250)          | `B-CAREFUL`     | P1  | 2   | ☐           | —          | —          | —       | —         |
| `4c7474d42` | 2026-09-06 | [Fix] Reasoning models stop thinking after model selection (#1349)             | `B-CAREFUL`     | P1  | 1   | ☐           | —          | —          | —       | —         |
| `a3e31e14b` | 2026-09-07 | [Fix] Provider settings contact unselected model services (#1425)              | `B-CAREFUL`     | P1  | 10  | ☐           | —          | —          | —       | —         |
| `d5f779575` | 2026-09-12 | fix(openai-compatible): consistently apply configured reasoning effort (#1604) | `B-CAREFUL`     | P1  | 5   | ☐           | —          | —          | —       | —         |
| `db52d7fc7` | 2026-08-22 | feat(models): add Gemini 3.5 Flash Lite and 3.1 Flash Lite (#1334)             | `A-CLEAN`       | P2  | 0   | ☑ 388a75a6d | —          | 2026-09-16 | 3.88.4  | —         |
| `5e8fcc846` | 2026-09-02 | [Feat] Add deepseek-v4-flash-vision-exp to Deepseek AI (#1438)                 | `A-CLEAN`       | P2  | 0   | ☑ 567b94bd9 | —          | 2026-09-16 | 3.88.4  | —         |
| `c4574ffef` | 2026-09-05 | feat(providers): add DeepSeek V4 Flash Vision Exp (#1488)                      | `B-CAREFUL`     | P2  | 2   | ☐           | —          | —          | —       | —         |
| `ec77e3f1e` | 2026-08-28 | feat(providers): add GLM-5.3-Flash support (#1430)                             | `B-CAREFUL`     | P2  | 1   | ☐           | —          | —          | —       | —         |
| `0d937c050` | 2026-09-04 | Add Claude Fable 5.1 support (#1508)                                           | `B-CAREFUL`     | P2  | 6   | ☐           | —          | —          | —       | —         |
| `f424bbbe4` | 2026-09-04 | [Feat] Add verified GPT-6 Astra support across providers (#1506)               | `B-CAREFUL`     | P2  | 8   | ☐           | —          | —          | —       | —         |
| `6ad8a6e58` | 2026-08-22 | fix(zoo-gateway): stop inventing UI cost from default model prices (#1339)     | `B-CAREFUL`     | P2  | 5   | ☑ 783d82f45 | —          | 2026-10-01 | 3.88.12 | —         |
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

| SHA         | Date       | Subject                                                                  | Class           | Pri | Δ   | Status | Blocked-by  | Resolved: | Version | Exception |
| ----------- | ---------- | ------------------------------------------------------------------------ | --------------- | --- | --- | ------ | ----------- | --------- | ------- | --------- |
| `216450810` | 2026-09-16 | refactor(code-index): extract manager registry (#1622)                   | `C-REIMPLEMENT` | P3  | 13  | ☐      | —           | —         | —       | —         |
| `afdede5b9` | 2026-08-20 | lint(providers): enforce canonical identifiers (#1297)                   | `C-REIMPLEMENT` | P3  | 36  | ☐      | —           | —         | —       | —         |
| `972e75078` | 2026-09-01 | refactor(eslint): share provider identifier rule across packages (#1421) | `C-REIMPLEMENT` | P3  | 30  | ☐      | —           | —         | —       | —         |
| `c82f0a35b` | 2026-09-11 | refactor(providers): finish canonical identifier audit (#1493)           | `C-REIMPLEMENT` | P3  | 7   | ☐      | —           | —         | —       | —         |
| `db61d7364` | 2026-09-11 | test(code-index,tools): cover lines left uncovered by #1297 (#1317)      | `C-REIMPLEMENT` | P3  | 3   | ☐      | —           | —         | —       | —         |
| `1a7e71883` | 2026-09-01 | [Chore] Add concurrent task lifecycle model check (#1478)                | `C-REIMPLEMENT` | P3  | 4   | ☐      | —           | —         | —       | —         |
| `97265fd8e` | 2026-08-30 | test(webview): capture typed host messages (#1446)                       | `A-CLEAN`       | P2  | 0   | ☐      | `fec4e1353` | —         | —       | —         |

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

**Numbers.** Dependency rows discharged by regenerating the lockfile locally in
the SYNC-23 sweep (in-range only — no override range was widened or relaxed):
hono 4.13.22, `@hono/node-server` 2.1.11, ip-address 10.7.6, fflate 0.8.3,
qs 6.17.1 (`9ae00199e`), fast-uri 3.1.9, smol-toml 1.9.1, serialize-javascript
7.1.4, `@humanfs/node` 0.16.8, and vitest 4.1.11 (`1ebbd954e`).
**Not closed:** `@ai-sdk/provider-utils` stays at 4.0.14 — `@ai-sdk/anthropic`
3.0.42, `@ai-sdk/openai` 3.0.27 and `ai-sdk-provider-poe` 2.0.18 pin that exact
version, so the patched 4.0.33 is unreachable without an override, which D4
forbids; `@vitest/mocker` stays at 4.1.11 because its advisory asks for
4.1.12, past the authorised 4.1.11 target; and **`glob`** stays at **11.1.0**
(moderate, patched `>=14.0.2`) because it is pinned by the `pnpm.overrides`
block in `pnpm-workspace.yaml` — unclosable without an override change, which D4
forbids. **Majors still open:** zod v4 (`8dd553332`, migration deferred), katex
0.18 (`e536e8258`), i18next 26, minimatch 11 and glob 14.

**What the SYNC-23 caps do and do not mitigate.** The `.max()` caps added to the
`.roomodes` (`customModes`, `allowedMcpServers`) and `.roo/mcp.json` (`args`,
`alwaysAllow`, `watchPaths`, `disabledTools`) schemas are **product limits**: they
bound the valid-and-oversized case and give a clean "too big" error. They are
**not** the advisory's mitigation, because zod v3 records one `too_big` issue and
then walks every element anyway. What is now enforced is a **pre-parse length
gate** at the two untrusted parse boundaries — `assertRoomodesBounded()` in
`packages/types/src/mode.ts` and `assertMcpSettingsBounded()` in
`src/services/mcp/McpHub.ts`, both called before `safeParse`, the second of which
also bounds the previously uncapped `mcpServers` record and each server's `env`
— so rejection is O(1) per field and no element is read. **Not mitigated:** any
future schema that parses an unbounded array or record from workspace content
without calling the gate. The zod HIGH advisory therefore stays open pending the
v4 migration. No row changes state here: the upstream commits were never
cherry-picked, so every row stays `☐`.

## SYNC-10 — Test-Only Ports (`P3`)

| SHA         | Date       | Subject                                                    | Class       | Pri | Δ   | Status | Blocked-by               | Resolved: | Version | Exception |
| ----------- | ---------- | ---------------------------------------------------------- | ----------- | --- | --- | ------ | ------------------------ | --------- | ------- | --------- |
| `87d41aa4f` | 2026-09-12 | test(webview): stabilize theme contrast audit (#1613)      | `A-CLEAN`   | P3  | 0   | ☐      | `d7795ca3f`, `fec4e1353` | —         | —       | —         |
| `147147cda` | 2026-08-30 | test(e2e): ignore partial asks in completion waits (#1449) | `B-CAREFUL` | P3  | 1   | ☐      | —                        | —         | —       | —         |

**Notes.** Cheap, but only worth taking where the fork has the corresponding test
lane. Per the fork's test-placement guidance, port these at the lowest layer that
would catch the regression rather than importing upstream's E2E verbatim.

## SYNC-11 — Rejected (`X-REJECT`)

| SHA         | Date       | Subject                                                                       | Class      | Pri | Δ   | Status | Blocked-by | Resolved: | Version | Exception |
| ----------- | ---------- | ----------------------------------------------------------------------------- | ---------- | --- | --- | ------ | ---------- | --------- | ------- | --------- |
| `1ad8f528d` | 2026-08-21 | fix(telemetry): default telemetry to opt-out with explicit consent UI (#1069) | `X-REJECT` | P4  | 53  | ✖      | —          | —         | —       | —         |

**Rationale.** Row `` `1ad8f528d` `` — the commit adds a telemetry consent UI across 61 files including
17 locale `settings.json`/`welcome.json` pairs and `PRIVACY.md`. The fork has
**zero telemetry transport call sites** (`captureEvent(` → 0 across tracked
`src/**`) after the deliberate v3.88.0 telemetry purge responding to Marketplace
notice #305; the token "telemetry" still lingers in inert scaffolding in a
minority of tracked files. Opt-out is strictly weaker than the fork's removal;
merging this would re-introduce the very surface that was purged. If the privacy
_language_ in `PRIVACY.md` is an improvement, lift the wording only.

> **Superseded by plan §2 (E11d/E12) / §11 — 2026-09-28 (H-05, lens D).** The
> original "**zero** telemetry references in `src/` and `webview-ui/src/`
> (upstream: 131 files)" was withdrawn: the verified invariant is "0
> `captureEvent(` call sites", and the "131 files" figure has no recorded scope
> or SHA and is not reproducible.

## SYNC-12 — Out of Scope (`E-SKIP`, upstream-org automation)

**Rationale.** These 27 commits operate upstream's automation stack (CodeRabbit,
merge queue, mutation-testing gates, coverage caching, PR labelling, VSIX upload).
The fork runs different CI (`.github/workflows/code-qa.yml`,
`label-pr-review-state.yml` are among the most-diverged files: 9 and 7 upstream
touches respectively). Re-evaluate only if the fork adopts the same tooling.
The discarded rows are, in table order: `d28e4a129`, `efc30cfa0`, `8f7f48ad5`,
`ad05c1c14`, `b18b6f01c`, `7bc054ba8`, `104700e92`, `6b319e330`, `a1ca0c8f7`,
`79cd12f2c`, `b2f63d366`, `ca8a22f12`, `dee40cc3d`, `134923e15`, `034c14104`,
`01c7357a7`, `d8f2d47ec`, `7cd854972`, `0ea690508`, `294c5fff1`, `4fe5a1f77`,
`ba46d1f34`, `99025b1fb`, `1da6fa660`, `072b6f36f`, `fdef10685`, `99736300f`
(each row is attributed here by SHA, WS-8 item 5).

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

## SYNC-13 — Provider quick-wins blocked on unsynced upstream prerequisites (`P1`/`P2`) — ✅ DONE (3/6)

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

| SHA         | Date       | Subject                                                                     | Class       | Pri | Δ   | Status       | Blocked-by               | Resolved:  | Version | Exception |
| ----------- | ---------- | --------------------------------------------------------------------------- | ----------- | --- | --- | ------------ | ------------------------ | ---------- | ------- | --------- |
| `a80b3b3ab` | 2026-08-30 | [Fix] Opencode Go routes gpt-5.6-luna through /v1/responses (#1443)         | `A-CLEAN`   | P1  | 0   | ☑ f1edfd9ef  | 6ad8a6e58                | 2026-10-01 | 3.88.12 | —         |
| `7bb14e44e` | 2026-09-04 | fix(opencode-go): send conversation session header (#1512)                  | `A-CLEAN`   | P1  | 0   | ☑ c40ddb877  | `a80b3b3ab`              | 2026-10-01 | 3.88.12 | —         |
| `1165aebc8` | 2026-09-11 | fix(nanogpt): preserve optional tool parameters (#1590)                     | `A-CLEAN`   | P1  | 0   | ◐ 220a5a679f | —                        | —          | —       | —         |
| `500152b78` | 2026-09-16 | [Fix] DeepSeek Flash cannot read attached images (#1618)                    | `A-CLEAN`   | P1  | 0   | ☐            | `c4574ffef`, `d5f779575` | —          | —       | —         |
| `745656a50` | 2026-09-12 | fix(settings): preserve configured LiteLLM model ID in model picker (#1368) | `B-CAREFUL` | P1  | 2   | ☐            | —                        | —          | —       | —         |
| `cc9c0afe9` | 2026-09-10 | [Fix] OpenCode Go context meter shows incorrect limits (#1428)              | `A-CLEAN`   | P2  | 0   | ☑ 3fdeebd27  | `a80b3b3ab`              | 2026-10-01 | 3.88.12 | —         |

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
  **Corrected 2026-11-26 (SYNC-23 task 6).** The conflict was structural, not semantic: the fork
  spec does not carry the intervening upstream test cases that anchor the hunk, so the pick was
  hand-grafted by intent (the import line plus the 95-line optional-tool-parameter block) and
  landed as `◐ 220a5a679f`. The `✖` this row carried rested on the unrelated `1ad8f528d`
  (telemetry consent) row and is withdrawn.
- `745656a50` (#1368) conflicts in `webview-ui/src/components/ui/hooks/useSelectedModel.ts`.

---

---

## SYNC-14 — Refresh 2026-09-24 (proposals — needs human triage)

These 22 commit(s) landed on `upstream/main` after the recorded baseline tip `500152b78`. Classes/priorities below are **proposals** computed from git-derived evidence (README §3) by `scripts/upstream-sync-triage.mjs --refresh`; review before picking and re-home any row whose theme belongs to an existing batch.

| SHA         | Date       | Subject                                                                                                    | Class           | Pri | Δ   | Status | Blocked-by                                         | Resolved: | Version | Exception |
| ----------- | ---------- | ---------------------------------------------------------------------------------------------------------- | --------------- | --- | --- | ------ | -------------------------------------------------- | --------- | ------- | --------- |
| `10b45abf7` | 2026-09-17 | fix(ci): scope mutation diff to merge result base (#1655)                                                  | `A-CLEAN`       | P1  | 0   | ☐      | `057dfeebb`, `2ecbf35a8`, `4140c2c83`, `9d43817fd` | —         | —       | —         |
| `77e422faf` | 2026-09-17 | fix: \_isGrokXAI() false-positive substring match breaks token usage for domains containing "x.ai" (#1484) | `B-CAREFUL`     | P1  | 1   | ☐      | —                                                  | —         | —       | —         |
| `a0f2e0355` | 2026-09-18 | [Fix] Prevent unavailable tools from appearing in system prompts (#1505)                                   | `C-REIMPLEMENT` | P1  | 9   | ☐      | —                                                  | —         | —       | —         |
| `332b83f22` | 2026-09-18 | [Fix] Awaiting-author label clears before maintainer re-review after author pushes (#1672)                 | `B-CAREFUL`     | P1  | 1   | ☐      | —                                                  | —         | —       | —         |
| `8535808da` | 2026-09-19 | chore: prepare v3.82.2 release (#1677)                                                                     | `D-LOCAL`       | P3  | 3   | ☐      | —                                                  | —         | —       | —         |
| `9e4a52d99` | 2026-09-19 | fix: align codebase search readiness across mode filters (#1630)                                           | `A-CLEAN`       | P1  | 0   | ☐      | `216450810`                                        | —         | —       | —         |
| `7c302a51b` | 2026-09-19 | fix(visual): mask context-token counter in electron sidebar snapshot (#1680)                               | `A-CLEAN`       | P1  | 0   | ☐      | `8187d3cf9`                                        | —         | —       | —         |
| `c5b585565` | 2026-09-19 | [Docs] Add lifecycle verification GAP report and remediation blocks (#1626)                                | `B-CAREFUL`     | P3  | 1   | ☐      | —                                                  | —         | —       | —         |
| `a799355ee` | 2026-09-19 | chore: replace Navad with James in weekly release reminder rotation (#1700)                                | `E-SKIP`        | P4  | 1   | ☐      | —                                                  | —         | —       | —         |
| `914f0c42a` | 2026-09-20 | test(e2e): poll restart conversation history (#1663)                                                       | `A-CLEAN`       | P3  | 0   | ☐      | `2ecbf35a8`, `8d296deef`                           | —         | —       | —         |
| `08d05eb0f` | 2026-09-20 | fix(vscode-lm): add guarded recovery parser and schema conversion (#1188)                                  | `B-CAREFUL`     | P1  | 2   | ☐      | —                                                  | —         | —       | —         |
| `741f19830` | 2026-09-20 | [Chore] Reduce Windows CI cold-start time (#1654)                                                          | `B-CAREFUL`     | P3  | 3   | ☐      | —                                                  | —         | —       | —         |
| `1ebbd954e` | 2026-09-20 | chore(deps): update dependency vitest to v4.1.11 [security] (#1582)                                        | `D-LOCAL`       | P0  | 7   | ☐      | —                                                  | —         | —       | —         |
| `4436ac537` | 2026-09-20 | fix(mcp): preserve concurrent MCP settings during initial creation (fixes #1371) (#1380)                   | `B-CAREFUL`     | P1  | 1   | ☐      | —                                                  | —         | —       | —         |
| `f797477b8` | 2026-09-20 | fix(code-index): search the task workspace without initializing managers (#1629)                           | `B-CAREFUL`     | P1  | 2   | ☐      | —                                                  | —         | —       | —         |
| `f6af57a1d` | 2026-09-20 | fix(openai-native): use canonical default model (#1627)                                                    | `B-CAREFUL`     | P1  | 3   | ☐      | —                                                  | —         | —       | —         |
| `1a0f8fc04` | 2026-09-20 | fix(task): keep delegated child mode isolated (#1637)                                                      | `C-REIMPLEMENT` | P1  | 6   | ☐      | —                                                  | —         | —       | —         |
| `01928c3c4` | 2026-09-21 | fix(model-cache): propagate caller cancellation into catalog fetches (#1683)                               | `B-CAREFUL`     | P1  | 3   | ☐      | —                                                  | —         | —       | —         |
| `7328cbf9f` | 2026-09-23 | fix(task): preserve subtask links after repeated Stop (#1678)                                              | `C-REIMPLEMENT` | P1  | 2   | ☐      | —                                                  | —         | —       | —         |
| `f78064753` | 2026-09-23 | chore: append scope-boundary instruction to CodeRabbit global path instructions (#1757)                    | `E-SKIP`        | P4  | 0   | ☐      | —                                                  | —         | —       | —         |
| `9176f2f69` | 2026-09-24 | [Feat] Add GPT-6 Sol and Luna to OpenAI model catalogs (#1755)                                             | `A-CLEAN`       | P2  | 0   | ☐      | `f424bbbe4`                                        | —         | —       | —         |
| `9ec139cd8` | 2026-09-24 | [Feat] Add Claude Opus 5.5 to model providers (#1756)                                                      | `B-CAREFUL`     | P2  | 3   | ☐      | —                                                  | —         | —       | —         |

**`10b45abf7` evidence.** Δ 0 of 2 file(s). Proposed `A-CLEAN` / P1: Δ 0 — no overlap with any fork-touched file; intent prefix "fix"

**`77e422faf` evidence.** Δ 1 of 2 file(s). Proposed `B-CAREFUL` / P1: Δ 1 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`a0f2e0355` evidence.** Δ 9 of 35 file(s) · hot: src/core/task/Task.ts, src/eslint-suppressions.json · CORE_FILES: src/core/prompts/tools/filter-tools-for-mode.ts. Proposed `C-REIMPLEMENT` / P1: telemetry hit — the fork purged the telemetry transport; re-implement, never cherry-pick; intent prefix "fix"

**`332b83f22` evidence.** Δ 1 of 2 file(s) · hot: .github/workflows/label-pr-review-state.yml. Proposed `B-CAREFUL` / P1: Δ 1 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`8535808da` evidence.** Δ 3 of 3 file(s) · hot: src/package.json. Proposed `D-LOCAL` / P3: scope of concern the fork owns (CHANGELOG.md, src/CHANGELOG.md, src/package.json) with no runtime source change; hygiene intent prefix "chore"

**`9e4a52d99` evidence.** Δ 0 of 3 file(s). Proposed `A-CLEAN` / P1: Δ 0 — no overlap with any fork-touched file; intent prefix "fix"

**`7c302a51b` evidence.** Δ 0 of 2 file(s). Proposed `A-CLEAN` / P1: Δ 0 — no overlap with any fork-touched file; intent prefix "fix"

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

**`7328cbf9f` evidence.** Δ 2 of 2 file(s) · hot: src/core/webview/ClineProvider.ts. Proposed `C-REIMPLEMENT` / P1: structural divergence (decomposed webview handlers / ClineProvider); intent prefix "fix"

**`f78064753` evidence.** Δ 0 of 1 file(s) · hot: .coderabbit.yaml. Proposed `E-SKIP` / P4: files touch only upstream-org automation (.github/.coderabbit/CONTRIBUTING); E-SKIP — not applicable to the fork

**`9176f2f69` evidence.** Δ 0 of 3 file(s). Proposed `A-CLEAN` / P2: Δ 0 — no overlap with any fork-touched file; intent prefix "feat"

**`9ec139cd8` evidence.** Δ 3 of 15 file(s). Proposed `B-CAREFUL` / P2: Δ 3 — small overlap, cherry-pick then rebrand + gates; intent prefix "feat"

---

## SYNC-15 — Refresh 2026-09-25 (proposals — needs human triage)

These 1 commit(s) landed on `upstream/main` after the recorded baseline tip `9ec139cd8`. Classes/priorities below are **proposals** computed from git-derived evidence (README §3) by `scripts/upstream-sync-triage.mjs --refresh`; review before picking and re-home any row whose theme belongs to an existing batch.

| SHA         | Date       | Subject                                                                | Class    | Pri | Δ   | Status | Blocked-by | Resolved: | Version | Exception |
| ----------- | ---------- | ---------------------------------------------------------------------- | -------- | --- | --- | ------ | ---------- | --------- | ------- | --------- |
| `fadd66a34` | 2026-09-25 | chore(coderabbit): allow non-org members to interact with chat (#1775) | `E-SKIP` | P4  | 0   | ☐      | —          | —         | —       | —         |

**`fadd66a34` evidence.** Δ 0 of 1 file(s) · hot: .coderabbit.yaml. Proposed `E-SKIP` / P4: files touch only upstream-org automation (.github/.coderabbit/CONTRIBUTING); E-SKIP — not applicable to the fork

---

## SYNC-16 — Refresh 2026-10-01 (proposals — needs human triage)

These 27 commit(s) landed on `upstream/main` after the recorded baseline tip `fadd66a34`. Classes/priorities below are **proposals** computed from git-derived evidence (README §3) by `scripts/upstream-sync-triage.mjs --refresh`; review before picking and re-home any row whose theme belongs to an existing batch.

| SHA         | Date       | Subject                                                                                                    | Class           | Pri | Δ   | Status | Blocked-by               | Resolved: | Version | Exception |
| ----------- | ---------- | ---------------------------------------------------------------------------------------------------------- | --------------- | --- | --- | ------ | ------------------------ | --------- | ------- | --------- |
| `c8c3926d5` | 2026-09-25 | fix(ci): isolate workflow config test from Turbo cache (#1782)                                             | `B-CAREFUL`     | P1  | 3   | ☐      | —                        | —         | —       | —         |
| `c028d24ba` | 2026-09-25 | fix(code-index): initialize external task managers before search (#1725)                                   | `C-REIMPLEMENT` | P1  | 6   | ☐      | —                        | —         | —       | —         |
| `219db1da5` | 2026-09-25 | perf(webview): stop task history globalState writes (#1664)                                                | `C-REIMPLEMENT` | P1  | 5   | ☐      | —                        | —         | —       | —         |
| `921810d84` | 2026-09-25 | fix(bedrock): report output truncation and expose model token limits (#1718)                               | `C-REIMPLEMENT` | P1  | 6   | ☐      | —                        | —         | —       | —         |
| `601f4a5fc` | 2026-09-26 | fix(task): pass null targetTask to handleModeSwitch for slash commands (#1784)                             | `B-CAREFUL`     | P1  | 2   | ☐      | —                        | —         | —       | —         |
| `a9ebf1a6a` | 2026-09-26 | fix(vertex): correct Claude Opus 5.5 max output tokens to 128K (#1777)                                     | `A-CLEAN`       | P1  | 0   | ☐      | `0d937c050`, `9ec139cd8` | —         | —       | —         |
| `eb83244e9` | 2026-09-26 | [Docs] Add release documentation PR step (#1786)                                                           | `B-CAREFUL`     | P3  | 1   | ☐      | —                        | —         | —       | —         |
| `898ec061b` | 2026-09-26 | fix: clear nativeArgs when tool-call finalize fails (#1221) (#1634)                                        | `B-CAREFUL`     | P1  | 2   | ☐      | —                        | —         | —       | —         |
| `c0a50e5b9` | 2026-09-26 | Update code owners (#1809)                                                                                 | `E-SKIP`        | P4  | 1   | ☐      | —                        | —         | —       | —         |
| `1803c01ba` | 2026-09-26 | Release v3.84.0 (#1810)                                                                                    | `C-REIMPLEMENT` | P3  | 42  | ☐      | —                        | —         | —       | —         |
| `7c291bb08` | 2026-09-26 | fix(webview-message-handler): enforce workspace containment for markdown-sourced openFile requests (#1762) | `C-REIMPLEMENT` | P1  | 19  | ☐      | —                        | —         | —       | —         |
| `3c09f1756` | 2026-09-28 | refactor(code-index): separate service factories and embedder validation (#1818)                           | `C-REIMPLEMENT` | P3  | 2   | ☐      | —                        | —         | —       | —         |
| `d0dec4b12` | 2026-09-28 | fix(task): keep the first abort reason (RSK-19) (#1811)                                                    | `C-REIMPLEMENT` | P1  | 3   | ☐      | —                        | —         | —       | —         |
| `222585693` | 2026-09-28 | fix: reset didFinishAbortingStream for each API request (#1801) (#1812)                                    | `B-CAREFUL`     | P1  | 2   | ☐      | —                        | —         | —       | —         |
| `d351a155e` | 2026-09-28 | refactor(code-index): introduce workspace scope behind registry (#1766)                                    | `A-CLEAN`       | P3  | 0   | ☐      | `216450810`              | —         | —       | —         |
| `8bec7c138` | 2026-09-28 | refactor(code-index): extract scan execution without behavior changes (#1834)                              | `B-CAREFUL`     | P3  | 2   | ☐      | —                        | —         | —       | —         |
| `778ad3e18` | 2026-09-28 | refactor(code-index): scope state ownership and workspace status delivery (#1768)                          | `C-REIMPLEMENT` | P3  | 5   | ☐      | —                        | —         | —       | —         |
| `e277ab927` | 2026-09-29 | refactor(code-index): extract single-file preparation (#1836)                                              | `B-CAREFUL`     | P3  | 2   | ☐      | —                        | —         | —       | —         |
| `2da6ea2ae` | 2026-09-30 | fix: streaming tool-call argument loss in NativeToolCallParser (#695) (#700)                               | `A-CLEAN`       | P1  | 0   | ☐      | `9d43817fd`              | —         | —       | —         |
| `0f75a60bc` | 2026-09-30 | fix(vscode-lm): window-safe middle-out truncation of tool_result content (#1606)                           | `B-CAREFUL`     | P1  | 2   | ☐      | `08d05eb0f`              | —         | —       | —         |
| `bf3bc781b` | 2026-09-30 | refactor(code-index): route workspace actions through scopes (#1778)                                       | `C-REIMPLEMENT` | P3  | 3   | ☐      | —                        | —         | —       | —         |
| `0b7cd10fc` | 2026-09-30 | refactor(code-index): use immutable configuration snapshots (#1815)                                        | `B-CAREFUL`     | P3  | 3   | ☐      | —                        | —         | —       | —         |
| `ceceb087f` | 2026-09-30 | feat(openai): add GPT-6.1 Sol support (#1864)                                                              | `C-REIMPLEMENT` | P2  | 1   | ☐      | —                        | —         | —       | —         |
| `9a2c3fbcf` | 2026-10-01 | [Feat] Add community-approved label for community code approvals (#1873)                                   | `B-CAREFUL`     | P2  | 2   | ☐      | —                        | —         | —       | —         |
| `5bb51916e` | 2026-10-01 | chore(deps): update dependency lru-cache to v11.5.3 (#1583)                                                | `D-LOCAL`       | P3  | 1   | ☐      | —                        | —         | —       | —         |
| `0b6c41895` | 2026-10-01 | fix(dev): use 127.0.0.1 instead of localhost for dev server (IPv6 resolution) (#1589)                      | `C-REIMPLEMENT` | P1  | 3   | ☐      | —                        | —         | —       | —         |
| `c6e6ee398` | 2026-10-01 | fix(webview): batch repeated tool preambles (#1658)                                                        | `B-CAREFUL`     | P1  | 1   | ☐      | —                        | —         | —       | —         |

**`c8c3926d5` evidence.** Δ 3 of 10 file(s) · hot: .github/workflows/code-qa.yml, src/eslint.config.mjs, src/package.json. Proposed `B-CAREFUL` / P1: Δ 3 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`c028d24ba` evidence.** Δ 6 of 7 file(s). Proposed `C-REIMPLEMENT` / P1: Δ 6 — large overlap; runbook §2 stop condition (Δ>5 outside C-REIMPLEMENT) means inspect by hand; intent prefix "fix"

**`219db1da5` evidence.** Δ 5 of 5 file(s) · hot: src/core/webview/ClineProvider.ts, src/eslint-suppressions.json. Proposed `C-REIMPLEMENT` / P1: structural divergence (decomposed webview handlers / ClineProvider); intent prefix "perf"

**`921810d84` evidence.** Δ 6 of 14 file(s) · hot: src/core/task/Task.ts, src/eslint-suppressions.json. Proposed `C-REIMPLEMENT` / P1: Δ 6 — large overlap; runbook §2 stop condition (Δ>5 outside C-REIMPLEMENT) means inspect by hand; intent prefix "fix"

**`601f4a5fc` evidence.** Δ 2 of 2 file(s) · hot: src/core/task/Task.ts. Proposed `B-CAREFUL` / P1: Δ 2 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`a9ebf1a6a` evidence.** Δ 0 of 2 file(s). Proposed `A-CLEAN` / P1: Δ 0 — no overlap with any fork-touched file; intent prefix "fix"

**`eb83244e9` evidence.** Δ 1 of 1 file(s). Proposed `B-CAREFUL` / P3: Δ 1 — small overlap, cherry-pick then rebrand + gates; hygiene intent prefix "docs"

**`898ec061b` evidence.** Δ 2 of 3 file(s) · hot: src/core/task/Task.ts. Proposed `B-CAREFUL` / P1: Δ 2 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`c0a50e5b9` evidence.** Δ 1 of 1 file(s). Proposed `E-SKIP` / P4: files touch only upstream-org automation (.github/.coderabbit/CONTRIBUTING); E-SKIP — not applicable to the fork

**`1803c01ba` evidence.** Δ 42 of 43 file(s) · hot: src/core/webview/ClineProvider.ts, src/package.json. Proposed `C-REIMPLEMENT` / P3: structural divergence (decomposed webview handlers / ClineProvider); unrecognised intent prefix — defaulting to P3 for human review

**`7c291bb08` evidence.** Δ 19 of 22 file(s) · hot: src/core/webview/webviewMessageHandler.ts. Proposed `C-REIMPLEMENT` / P1: structural divergence (decomposed webview handlers / ClineProvider); intent prefix "fix"

**`3c09f1756` evidence.** Δ 2 of 24 file(s) · CORE_FILES: src/services/code-index/service-factory.ts. Proposed `C-REIMPLEMENT` / P3: telemetry hit — the fork purged the telemetry transport; re-implement, never cherry-pick; hygiene intent prefix "refactor"

**`d0dec4b12` evidence.** Δ 3 of 4 file(s) · hot: src/core/task/Task.ts, src/core/webview/ClineProvider.ts. Proposed `C-REIMPLEMENT` / P1: telemetry hit — the fork purged the telemetry transport; re-implement, never cherry-pick; intent prefix "fix"

**`222585693` evidence.** Δ 2 of 2 file(s) · hot: src/core/task/Task.ts. Proposed `B-CAREFUL` / P1: Δ 2 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`d351a155e` evidence.** Δ 0 of 4 file(s). Proposed `A-CLEAN` / P3: Δ 0 — no overlap with any fork-touched file; hygiene intent prefix "refactor"

**`8bec7c138` evidence.** Δ 2 of 4 file(s) · CORE_FILES: src/services/code-index/orchestrator.ts. Proposed `B-CAREFUL` / P3: Δ 2 — small overlap, cherry-pick then rebrand + gates; hygiene intent prefix "refactor"

**`778ad3e18` evidence.** Δ 5 of 13 file(s) · hot: src/core/webview/ClineProvider.ts. Proposed `C-REIMPLEMENT` / P3: structural divergence (decomposed webview handlers / ClineProvider); hygiene intent prefix "refactor"

**`e277ab927` evidence.** Δ 2 of 5 file(s) · CORE_FILES: src/services/code-index/processors/file-watcher.ts. Proposed `B-CAREFUL` / P3: Δ 2 — small overlap, cherry-pick then rebrand + gates; hygiene intent prefix "refactor"

**`2da6ea2ae` evidence.** Δ 0 of 2 file(s). Proposed `A-CLEAN` / P1: Δ 0 — no overlap with any fork-touched file; intent prefix "fix"

**`0f75a60bc` evidence.** Δ 2 of 3 file(s). Proposed `B-CAREFUL` / P1: Δ 2 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`bf3bc781b` evidence.** Δ 3 of 9 file(s) · hot: src/core/webview/ClineProvider.ts, src/core/webview/webviewMessageHandler.ts. Proposed `C-REIMPLEMENT` / P3: structural divergence (decomposed webview handlers / ClineProvider); hygiene intent prefix "refactor"

**`0b7cd10fc` evidence.** Δ 3 of 4 file(s) · CORE_FILES: src/services/code-index/interfaces/config.ts. Proposed `B-CAREFUL` / P3: Δ 3 — small overlap, cherry-pick then rebrand + gates; hygiene intent prefix "refactor"

**`ceceb087f` evidence.** Δ 1 of 6 file(s). Proposed `C-REIMPLEMENT` / P2: telemetry hit — the fork purged the telemetry transport; re-implement, never cherry-pick; intent prefix "feat"

**`9a2c3fbcf` evidence.** Δ 2 of 3 file(s) · hot: .github/workflows/label-pr-review-state.yml. Proposed `B-CAREFUL` / P2: Δ 2 — small overlap, cherry-pick then rebrand + gates; intent prefix "feat"

**`5bb51916e` evidence.** Δ 1 of 1 file(s) · hot: pnpm-lock.yaml. Proposed `D-LOCAL` / P3: files are dependency manifests / lockfile — regenerate locally; hygiene intent prefix "chore"

**`0b6c41895` evidence.** Δ 3 of 3 file(s) · hot: src/core/webview/ClineProvider.ts. Proposed `C-REIMPLEMENT` / P1: structural divergence (decomposed webview handlers / ClineProvider); intent prefix "fix"

**`c6e6ee398` evidence.** Δ 1 of 4 file(s). Proposed `B-CAREFUL` / P1: Δ 1 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

## SYNC-17 — Inline Terminal & shell-reporting correctness (`P1`) — ✅ DONE (3/3)

Created 2026-10-01 by re-homing three `A-CLEAN` rows out of the SYNC-14 (`bac8adcf2`, `78b74ec1c`) and SYNC-15 (`ebf4bd2d3`) refresh proposals. All three measure `Δ 0` against the current fork surface, and every target file is untouched by the fork since the merge base. `bac8adcf2` is the intra-batch prerequisite for `78b74ec1c` (same file, `src/integrations/terminal/ExecaTerminalProcess.ts`; the 15 upstream commits between them touch none of these paths) and was landed first.

| SHA         | Date       | Subject                                                                             | Class     | Pri | Δ   | Status      | Blocked-by  | Resolved:  | Version | Exception |
| ----------- | ---------- | ----------------------------------------------------------------------------------- | --------- | --- | --- | ----------- | ----------- | ---------- | ------- | --------- |
| `bac8adcf2` | 2026-09-19 | fix(terminal): prevent inline terminal cmd.exe fallback on Windows (#1673)          | `A-CLEAN` | P1  | 0   | ☑ 7f1a94513 | —           | 2026-10-01 | 3.88.12 | —         |
| `78b74ec1c` | 2026-09-22 | fix(terminal): inherit the host UTF-8 locale instead of forcing en_US.UTF-8 (#1713) | `A-CLEAN` | P1  | 0   | ☑ 36987eca6 | `bac8adcf2` | 2026-10-01 | 3.88.12 | —         |
| `ebf4bd2d3` | 2026-09-24 | fix(prompts): report the shell that actually runs under Inline Terminal (#1682)     | `A-CLEAN` | P1  | 0   | ☑ 5bdc36375 | —           | 2026-10-01 | 3.88.12 | —         |

**Notes.** No resolution record is required: all three picks applied without a conflict (`ebf4bd2d3` auto-merged `src/integrations/terminal/__tests__/shell-system-prompt-divergence.spec.ts`, which the earlier branding sweep had normalised), and each is a `git cherry-pick -x` whose message carries the trailer.

**Deferred runner-ups (dependency-blocked — §2 empty-fork-side stop condition).** The same batch proposed `a9ebf1a6a` (Vertex Claude Opus 5.5 max output 128K) and `2da6ea2ae` (streaming tool-call argument loss in `NativeToolCallParser`). Both read `A-CLEAN` / `Δ 0` on fork-side overlap, but their upstream pre-images differ from the merge base while the fork side equals it, so they are deltas on upstream content the fork lacks:

- `a9ebf1a6a` (#1777) is blocked by the unsynced `9ec139cd8` (#1756, add Claude Opus 5.5) and `0d937c050` (#1508, add Claude Fable 5.1); its trial pick conflicted on the exact `claude-opus-5-5` / `claude-fable-5-1` insertion block in `packages/types/src/providers/vertex.ts`. Land the provider chain first.
- `2da6ea2ae` (#695/#700) is blocked by the unsynced `9d43817fd` (#1470), which is `C-REIMPLEMENT` and must be hand-ported, never cherry-picked.

## SYNC-18 — vscode-lm robustness (`P1`) — ✅ DONE (1/1)

Created 2026-10-01 by re-homing `aaa22e167` out of the SYNC-16 refresh proposal. Its sibling `0f75a60bc` (#1606) was attempted in the same batch and **deferred**: it is dependency-blocked on the unsynced `08d05eb0f` (#1188), which introduced `extractLeakedToolCalls` / `trailingPartialToolMarkerLength` into `src/api/providers/vscode-lm.ts` — the fork lacks that block, so `0f75a60bc`'s trial pick conflicted on it and was aborted rather than resolved by importing an unsynced feature. Recorded in `Blocked-by`.

| SHA         | Date       | Subject                                                                        | Class       | Pri | Δ   | Status      | Blocked-by | Resolved:  | Version | Exception |
| ----------- | ---------- | ------------------------------------------------------------------------------ | ----------- | --- | --- | ----------- | ---------- | ---------- | ------- | --------- |
| `aaa22e167` | 2026-09-26 | fix(vscode-lm): sanitize lone UTF-16 surrogates in text and tool input (#1605) | `B-CAREFUL` | P1  | 4   | ☑ 6d3c71c51 | —          | 2026-10-01 | 3.88.12 | —         |

**Notes.** Resolution record: [`resolutions/SYNC-18.md`](resolutions/SYNC-18.md) — one `vscode-lm.ts` import conflict (upstream's import block is a superset of the fork's) plus three auto-merged files; 4 blocks, `verify-resolutions --batch` green. The pick is a `git cherry-pick -x` with the trailer present.

## SYNC-19 — Provider routing (clean pick) (`P2`) — ✅ DONE (1/1)

Created 2026-10-01 by re-homing `22cc416ba` out of the SYNC-5 curated list. It auto-merged cleanly (one file, `src/api/index.ts`) — no conflict, so no resolution record is required.

| SHA         | Date       | Subject                                                         | Class       | Pri | Δ   | Status      | Blocked-by | Resolved:  | Version | Exception |
| ----------- | ---------- | --------------------------------------------------------------- | ----------- | --- | --- | ----------- | ---------- | ---------- | ------- | --------- |
| `22cc416ba` | 2026-09-03 | refactor(api): make Gemini CLI handler routing explicit (#1442) | `B-CAREFUL` | P2  | 1   | ☑ 0228b1f96 | —          | 2026-10-01 | 3.88.12 | —         |

**Notes.** **Deferred in this batch — `ec77e3f1e` (#1430, add GLM-5.3-Flash).** Attempted and aborted: its `webview-ui/src/components/ui/hooks/__tests__/useSelectedModel.spec.ts` hunk adds a `Z AI provider` describe block that the fork does not have, and those cases fail (4 tests) because the fork's zai model-selection diverges from upstream's catalog/identifiers. The fork's Z AI selection path needs its own sync before this row can land; recorded here rather than as a `Blocked-by` SHA because the gap is a fork divergence, not a single unsynced predecessor.

**Lesson (recorded for the next refresh).** The strict predecessor check still over-reports: `ec77e3f1e` passed it yet failed at cherry-pick + test time. Trial-picking is the only reliable filter; the register's derived ready set should be treated as a _candidate_ list.

## Refresh 2026-10-01 — dependency annotation (`☐` readiness pass)

The 2026-10-01 refresh found **0 new upstream commits** (`--refresh`: baseline tip `c6e6ee398` unchanged), so no rows were added. This pass instead corrects the **readiness data** the earlier refreshes left blank: every open `A-CLEAN` row now records the **unsynced upstream predecessor(s)** it actually depends on, in `Blocked-by`.

**Method.** For an open `A-CLEAN` row, for every file it touches, list the upstream commits in `merge-base..<row>` that also touch that file; a predecessor is "unsynced" when it is not reachable from the fork ref; keep only those whose own register status is still open (`☐`) — a `☑` predecessor has landed and is not a blocker.

**Result.** The derived ready set drops from **14 to 2** (`9e4a52d99` P1, `ae6c1a876` P3): 11 of the 13 open `A-CLEAN` rows were never pickable.

- `10b45abf7` → `057dfeebb`, `2ecbf35a8`, `4140c2c83`, `9d43817fd`
- `1165aebc8` → `4c7474d42`, `4e8fa09f2`, `f424bbbe4`
- `2da6ea2ae` → `9d43817fd`
- `500152b78` → `4e8fa09f2`, `c4574ffef`, `d5f779575`
- `7c302a51b` → `8187d3cf9`
- `87d41aa4f` → `d7795ca3f`, `fec4e1353`
- `914f0c42a` → `2ecbf35a8`, `8d296deef`
- `9176f2f69` → `f424bbbe4`
- `97265fd8e` → `fec4e1353`
- `a9ebf1a6a` → `0d937c050`, `9ec139cd8`
- `d351a155e` → `216450810`

This is the same defect the SYNC-13 section documents: `Δ` measures fork-side overlap only, so an `A-CLEAN`/Δ 0 label cannot see an unsynced upstream predecessor. `Blocked-by` is the missing half.

**Flagged for the next refresh (not changed here):**

- **Stale `Δ`/class on two rows.** `500152b78` records `A-CLEAN` Δ 0, but after its unsynced predecessor `5e8fcc846` landed on the fork the fork now overlaps 4 of its files (true Δ 4); `1165aebc8` likewise recomputes to Δ 2. An `A-CLEAN` label asserts Δ 0 (hard ladder), so both should be reclassified to `B-CAREFUL` by the next refresh — deliberately left as-is here to keep this pass to readiness data only.
- **`✖`-blocked rows.** `97265fd8e` and `87d41aa4f` also depend on discarded `E-SKIP` rows (`8efff00e6`, `8f7f48ad5`) that will never land, so they are `D-LOCAL`/`✖` candidates rather than pickable rows.
- **Trial-picking is the only reliable filter.** `ec77e3f1e` (SYNC-19) passed this annotation _and_ the structural check, yet failed at pick + test time (fork-divergent Z AI selection) — see the SYNC-19 Notes.

## SYNC-20 — Prerequisite drain: provider reasoning-chunk ordering (`P1`) — ✅ DONE (1/1)

Created 2026-10-01 from the bottom-up prerequisite drain (see the dependency-annotation section above). `4e8fa09f2` is a **root** — it had no unsynced predecessor — and it advances the chain for `1165aebc8` / `500152b78` / `f424bbbe4` / `d5f779575`. Landed cleanly (16 files, all auto-merged); no resolution record required. The `Blocked-by` cells of its dependents were updated to drop the now-synced `4e8fa09f2`.

| SHA         | Date       | Subject                                                                | Class       | Pri | Δ   | Status      | Blocked-by | Resolved:  | Version | Exception |
| ----------- | ---------- | ---------------------------------------------------------------------- | ----------- | --- | --- | ----------- | ---------- | ---------- | ------- | --------- |
| `4e8fa09f2` | 2026-09-03 | fix: yield reasoning chunks before content chunks in providers (#1462) | `B-CAREFUL` | P1  | 4   | ☑ 8934b150f | —          | 2026-10-01 | 3.88.12 | —         |

**Deferred from this drain (time / risk review).** The chains bottom out largely in work that cannot be a cherry-pick, so bottom-up draining is a program rather than a batch:

- **Sibling root `0d937c050`** (#1508, Claude Fable 5.1) — attempted and aborted: it conflicts **structurally** in `src/api/providers/anthropic.ts` (the fork's `createMessage` streaming setup differs from upstream's), so its `claude-fable-5-1` cases plus the tool-choice normalisation need a hand-port. It also unblocks nothing on its own.
- **`C-REIMPLEMENT` blockers** (hand-port, never cherry-pick): `fec4e1353` (Δ 14), `2ecbf35a8` (Δ 13), `216450810` (Δ 13), `9d43817fd` (Δ 10, a P1 gating `2da6ea2ae`), `d5f779575`'s `8d296deef` (Δ 5) / `4140c2c83`, and `972e75078` (Δ 30).
- **`D-LOCAL` blocker**: `057dfeebb` — never cherry-picked.
- **`✖` blockers that will never land**: `8f7f48ad5`, `8efff00e6` — their dependents `97265fd8e`, `87d41aa4f`, `8187d3cf9` are local-reimplementation or reject candidates, not sync targets.
- **Fork divergence**: `ec77e3f1e` (see SYNC-19), which gates `c4574ffef`.

## SYNC-21 — Test-only ports (`P3`) — ✅ DONE (1/1)

Created 2026-10-01 while draining the remaining verified-clean rows. `ae6c1a876` is self-contained (a new fixture plus a new suite file; all its imports resolve on the fork) and applied cleanly — no resolution record required.

| SHA         | Date       | Subject                                                      | Class     | Pri | Δ   | Status      | Blocked-by | Resolved:  | Version | Exception |
| ----------- | ---------- | ------------------------------------------------------------ | --------- | --- | --- | ----------- | ---------- | ---------- | ------- | --------- |
| `ae6c1a876` | 2026-09-11 | test(e2e): add LM Studio reasoning_content e2e guard (#1322) | `A-CLEAN` | P3  | 0   | ☑ c5c45b999 | —          | 2026-10-01 | 3.88.12 | —         |

**Notes — the other clean candidate, deferred.** `9e4a52d99` (#1630) was attempted and aborted: its new spec imports `src/services/code-index/code-index-manager-registry.ts`, a module that **does not exist on the fork** — it is created by the unsynced `216450810` (#1622, `C-REIMPLEMENT`). This is an **import-level dependency** that the same-file predecessor scan cannot see, so `9e4a52d99` now records `Blocked-by: 216450810`.

**Latent defect closed.** `1165aebc8` (#1590) is now `✖`: one of its prerequisites, `1ad8f528d` (#1069, telemetry consent), is `X-REJECT`, so the chain can never land and the row was never pickable. `Blocked-by` was cleared with the status.

> **Correction — 2026-11-26 (SYNC-23 task 6, decisions D9/D10).** The `✖` above was a **data
> error**: `1ad8f528d` (#1069, telemetry consent) is unrelated to a nanogpt tool-parameter fix, so
> `1165aebc8` had no such prerequisite and was never unpickable. `Blocked-by` stays `—`; the row
> was probed, applied with a structural conflict resolved by intent, and now reads `◐ 220a5a679f`.

---

## SYNC-22 — Refresh 2026-10-07 (proposals — needs human triage)

These 32 commit(s) landed on `upstream/main` after the recorded baseline tip `c6e6ee398`. Classes/priorities below are **proposals** computed from git-derived evidence (README §3) by `scripts/upstream-sync-triage.mjs --refresh`; review before picking and re-home any row whose theme belongs to an existing batch.

| SHA         | Date       | Subject                                                                                                    | Class           | Pri | Δ   | Status                                                                                                                                                                 | Blocked-by | Resolved:  | Version | Exception |
| ----------- | ---------- | ---------------------------------------------------------------------------------------------------------- | --------------- | --- | --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------- | ------- | --------- |
| `82e3f21e4` | 2026-10-01 | fix(mcp): validate native mcp_tool_use dispatch through the shared tool-policy layer (#1724)               | `C-REIMPLEMENT` | P1  | 2   | ☐                                                                                                                                                                      | —          | —          | —       | —         |
| `0aa636c26` | 2026-10-01 | fix(webview): stop flushing throttled state for partial say messages (#1852)                               | `B-CAREFUL`     | P1  | 3   | ☐                                                                                                                                                                      | —          | —          | —       | —         |
| `c38db3ed7` | 2026-10-02 | fix(anthropic): correct Opus 5.5 output budget (#1854)                                                     | `B-CAREFUL`     | P1  | 1   | ☐                                                                                                                                                                      | 9ec139cd8  | —          | —       | —         |
| `be2de3461` | 2026-10-02 | chore(deps): update dependency mocha to v11.8.0 (#1585)                                                    | `D-LOCAL`       | P3  | 3   | ☐                                                                                                                                                                      | —          | —          | —       | —         |
| `feb3386f6` | 2026-10-02 | fix(opencode-go): add DeepSeek V4.1 Flash metadata (#1659)                                                 | `B-CAREFUL`     | P1  | 3   | ☑ ae7049cb1                                                                                                                                                            | —          | 2026-10-09 | 3.89.0  | —         |
| `632ef53b8` | 2026-10-02 | Stop interrupted tasks from replaying rejected subtasks (#1726)                                            | `C-REIMPLEMENT` | P3  | 6   | ☐                                                                                                                                                                      | —          | —          | —       | —         |
| `a704002b6` | 2026-10-02 | [Docs] Specify P1 persisted ownership and add the run-state kernel target architecture (#1706)             | `A-CLEAN`       | P3  | 0   | ☐                                                                                                                                                                      | —          | —          | —       | —         |
| `299bddfaa` | 2026-10-02 | fix(prompts): add line-number stripping warning to search_replace, edit_file, and read_file (#1685)        | `A-CLEAN`       | P1  | 0   | ☑ d44b40281                                                                                                                                                            | —          | 2026-10-09 | 3.89.0  | —         |
| `a07706653` | 2026-10-03 | fix(prompts): prevent models from hallucinating line numbers in apply_diff (#641)                          | `A-CLEAN`       | P1  | 0   | ✖ `a07706653` is reverted upstream by `31c4a6427`; the pair is net-zero, so neither half is picked (SYNC-23 decision, 2026-11-24)                                      | —          | —          | —       | —         |
| `fcc51b564` | 2026-10-03 | Release v3.86.0 (#1897)                                                                                    | `C-REIMPLEMENT` | P3  | 41  | ☐                                                                                                                                                                      | —          | —          | —       | —         |
| `7186191a6` | 2026-10-03 | Blanket auto-deny for unapproved commands (hands-free mode) (#1760)                                        | `C-REIMPLEMENT` | P3  | 30  | ☐                                                                                                                                                                      | —          | —          | —       | —         |
| `72143527f` | 2026-10-03 | Disable extensions when launching Extension Host for debugging (#1860)                                     | `A-CLEAN`       | P3  | 0   | ☐                                                                                                                                                                      | —          | —          | —       | —         |
| `21576772e` | 2026-10-03 | [Fix] DeepSeek/OpenAI requests fail permanently when task history contains a lone UTF-16 surrogate (#1831) | `B-CAREFUL`     | P1  | 5   | ☐                                                                                                                                                                      | —          | —          | —       | —         |
| `05d683a3b` | 2026-10-03 | feat(api): shared abort-signal cancellation-scope helpers (#1651)                                          | `B-CAREFUL`     | P2  | 2   | ☐                                                                                                                                                                      | —          | —          | —       | —         |
| `ba35bb35b` | 2026-10-03 | chore(deps): update dependency posthog-js to v1.435.3 (#1586)                                              | `D-LOCAL`       | P3  | 1   | ☐                                                                                                                                                                      | —          | —          | —       | —         |
| `51181e824` | 2026-10-03 | fix(providers): forward task abortSignal in openai and lm-studio handlers (#1686)                          | `B-CAREFUL`     | P1  | 4   | ☐                                                                                                                                                                      | —          | —          | —       | —         |
| `3859e5dd8` | 2026-10-03 | fix(code-index): remove automatic startup embedder validation (#1879)                                      | `C-REIMPLEMENT` | P1  | 7   | ☑ cf04b8f02 (divergence: hand-port — see resolutions/SYNC-22.md)                                                                                                       | —          | 2026-10-09 | 3.89.0  | —         |
| `754a9160d` | 2026-10-04 | fix(bedrock): expose Opus 5.5 output token limit (#1903)                                                   | `B-CAREFUL`     | P1  | 1   | ☐                                                                                                                                                                      | 9ec139cd8  | —          | —       | —         |
| `0298294d6` | 2026-10-04 | fix(api): honor custom model IDs for OpenAI-compatible providers (#1846)                                   | `B-CAREFUL`     | P1  | 4   | ☐                                                                                                                                                                      | —          | —          | —       | —         |
| `95acd2ad2` | 2026-10-04 | feat(xai): add grok-build-0.1 model metadata (#1687)                                                       | `B-CAREFUL`     | P2  | 1   | ☑ d1b73aa44                                                                                                                                                            | —          | 2026-10-09 | 3.89.0  | —         |
| `c9cac8fce` | 2026-10-04 | chore(deps): update dependency posthog-node to v5.55.0 (#1587)                                             | `D-LOCAL`       | P3  | 1   | ☐                                                                                                                                                                      | —          | —          | —       | —         |
| `8cd3a763f` | 2026-10-04 | [Chore] Add packages/types to changed-code mutation testing (#1892) (#1893)                                | `A-CLEAN`       | P3  | 0   | ☐                                                                                                                                                                      | —          | —          | —       | —         |
| `70cafe419` | 2026-10-04 | fix: update openai sane-default parameter values for custom models (#1847)                                 | `B-CAREFUL`     | P1  | 3   | ☐                                                                                                                                                                      | 0298294d6  | —          | —       | —         |
| `31c4a6427` | 2026-10-04 | Revert "fix(prompts): prevent models from hallucinating line numbers in apply_diff (#641)" (#1908)         | `A-CLEAN`       | P3  | 0   | ✖ `31c4a6427` is itself the revert of `a07706653`; picking it alone would land a regression against a fork that never took the original (SYNC-23 decision, 2026-11-24) | —          | —          | —       | —         |
| `a1cc065d2` | 2026-10-04 | fix(prompts): remove stray tab before Tool Use Guidelines heading (#1415) (#1440)                          | `B-CAREFUL`     | P1  | 1   | ☐                                                                                                                                                                      | —          | —          | —       | —         |
| `3e027343d` | 2026-10-05 | fix(mcp): parse tool names with double underscores in server names (#1737)                                 | `A-CLEAN`       | P1  | 0   | ☑ abe25656d                                                                                                                                                            | —          | 2026-10-09 | 3.89.0  | —         |
| `1368407c0` | 2026-10-05 | fix(task): check abort before an ask row posts (RSK-20) (#1895)                                            | `B-CAREFUL`     | P1  | 1   | ☐                                                                                                                                                                      | —          | —          | —       | —         |
| `9af61f87e` | 2026-10-05 | refactor(task): remove dead Task.isPaused field (RSK-12) (#1894)                                           | `B-CAREFUL`     | P3  | 4   | ☐                                                                                                                                                                      | —          | —          | —       | —         |
| `3bea5b1b3` | 2026-10-06 | test(e2e): wait for resolved context window in visual chat scenario (#1941)                                | `A-CLEAN`       | P3  | 0   | ☐                                                                                                                                                                      | —          | —          | —       | —         |
| `d7963fc2d` | 2026-10-06 | perf(write-path): remove artificial write delays by default (part of #1375) (#1381)                        | `B-CAREFUL`     | P1  | 5   | ☐                                                                                                                                                                      | —          | —          | —       | —         |
| `e69c6a6b3` | 2026-10-07 | feat(task): add the pure run-state kernel module (#1942)                                                   | `B-CAREFUL`     | P2  | 1   | ☐                                                                                                                                                                      | —          | —          | —       | —         |
| `842b37e76` | 2026-10-07 | fix(webview): route code actions to the last active chat (#1946)                                           | `C-REIMPLEMENT` | P1  | 24  | ☐                                                                                                                                                                      | —          | —          | —       | —         |

**`82e3f21e4` evidence.** Δ 2 of 2 file(s). Proposed `C-REIMPLEMENT` / P1: telemetry hit — the fork purged the telemetry transport; re-implement, never cherry-pick; intent prefix "fix"

**`0aa636c26` evidence.** Δ 3 of 3 file(s) · hot: src/core/task/Task.ts. Proposed `B-CAREFUL` / P1: Δ 3 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`c38db3ed7` evidence.** Δ 1 of 2 file(s). Proposed `B-CAREFUL` / P1: Δ 1 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`be2de3461` evidence.** Δ 3 of 3 file(s) · hot: package.json, pnpm-lock.yaml. Proposed `D-LOCAL` / P3: files are dependency manifests / lockfile — regenerate locally; hygiene intent prefix "chore"

**`feb3386f6` evidence.** Δ 3 of 3 file(s). Proposed `B-CAREFUL` / P1: Δ 3 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`632ef53b8` evidence.** Δ 6 of 19 file(s) · hot: src/core/task/Task.ts, src/core/webview/ClineProvider.ts. Proposed `C-REIMPLEMENT` / P3: structural divergence (decomposed webview handlers / ClineProvider); unrecognised intent prefix — defaulting to P3 for human review

**`a704002b6` evidence.** Δ 0 of 8 file(s). Proposed `A-CLEAN` / P3: Δ 0 — no overlap with any fork-touched file; hygiene intent prefix "docs"

**`299bddfaa` evidence.** Δ 0 of 3 file(s). Proposed `A-CLEAN` / P1: Δ 0 — no overlap with any fork-touched file; intent prefix "fix"

**`a07706653` evidence.** Δ 0 of 2 file(s). Proposed `A-CLEAN` / P1: Δ 0 — no overlap with any fork-touched file; intent prefix "fix"

**`fcc51b564` evidence.** Δ 41 of 41 file(s) · hot: src/core/webview/ClineProvider.ts, src/package.json. Proposed `C-REIMPLEMENT` / P3: structural divergence (decomposed webview handlers / ClineProvider); unrecognised intent prefix — defaulting to P3 for human review

**`7186191a6` evidence.** Δ 30 of 61 file(s) · hot: src/core/task/Task.ts, src/core/webview/ClineProvider.ts. Proposed `C-REIMPLEMENT` / P3: telemetry hit — the fork purged the telemetry transport; re-implement, never cherry-pick; unrecognised intent prefix — defaulting to P3 for human review

**`72143527f` evidence.** Δ 0 of 1 file(s). Proposed `A-CLEAN` / P3: Δ 0 — no overlap with any fork-touched file; unrecognised intent prefix — defaulting to P3 for human review

**`21576772e` evidence.** Δ 5 of 14 file(s). Proposed `B-CAREFUL` / P1: Δ 5 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`05d683a3b` evidence.** Δ 2 of 3 file(s). Proposed `B-CAREFUL` / P2: Δ 2 — small overlap, cherry-pick then rebrand + gates; intent prefix "feat"

**`ba35bb35b` evidence.** Δ 1 of 1 file(s) · hot: pnpm-lock.yaml. Proposed `D-LOCAL` / P3: files are dependency manifests / lockfile — regenerate locally; hygiene intent prefix "chore"

**`51181e824` evidence.** Δ 4 of 5 file(s). Proposed `B-CAREFUL` / P1: Δ 4 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`3859e5dd8` evidence.** Δ 7 of 7 file(s) · hot: src/eslint-suppressions.json · CORE_FILES: src/services/code-index/orchestrator.ts. Proposed `C-REIMPLEMENT` / P1: telemetry hit — the fork purged the telemetry transport; re-implement, never cherry-pick; intent prefix "fix"

**`754a9160d` evidence.** Δ 1 of 3 file(s). Proposed `B-CAREFUL` / P1: Δ 1 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`0298294d6` evidence.** Δ 4 of 4 file(s). Proposed `B-CAREFUL` / P1: Δ 4 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`95acd2ad2` evidence.** Δ 1 of 2 file(s). Proposed `B-CAREFUL` / P2: Δ 1 — small overlap, cherry-pick then rebrand + gates; intent prefix "feat"

**`c9cac8fce` evidence.** Δ 1 of 1 file(s) · hot: pnpm-lock.yaml. Proposed `D-LOCAL` / P3: files are dependency manifests / lockfile — regenerate locally; hygiene intent prefix "chore"

**`8cd3a763f` evidence.** Δ 0 of 2 file(s). Proposed `A-CLEAN` / P3: Δ 0 — no overlap with any fork-touched file; hygiene intent prefix "chore"

**`70cafe419` evidence.** Δ 3 of 10 file(s). Proposed `B-CAREFUL` / P1: Δ 3 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`31c4a6427` evidence.** Δ 0 of 2 file(s). Proposed `A-CLEAN` / P3: Δ 0 — no overlap with any fork-touched file; unrecognised intent prefix — defaulting to P3 for human review

**`a1cc065d2` evidence.** Δ 1 of 10 file(s). Proposed `B-CAREFUL` / P1: Δ 1 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`3e027343d` evidence.** Δ 0 of 2 file(s). Proposed `A-CLEAN` / P1: Δ 0 — no overlap with any fork-touched file; intent prefix "fix"

**`1368407c0` evidence.** Δ 1 of 3 file(s) · hot: src/core/task/Task.ts. Proposed `B-CAREFUL` / P1: Δ 1 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`9af61f87e` evidence.** Δ 4 of 6 file(s) · hot: src/core/task/Task.ts, src/eslint-suppressions.json. Proposed `B-CAREFUL` / P3: Δ 4 — small overlap, cherry-pick then rebrand + gates; hygiene intent prefix "refactor"

**`3bea5b1b3` evidence.** Δ 0 of 1 file(s). Proposed `A-CLEAN` / P3: Δ 0 — no overlap with any fork-touched file; hygiene intent prefix "test"

**`d7963fc2d` evidence.** Δ 5 of 7 file(s) · hot: src/eslint-suppressions.json. Proposed `B-CAREFUL` / P1: Δ 5 — small overlap, cherry-pick then rebrand + gates; intent prefix "perf"

**`e69c6a6b3` evidence.** Δ 1 of 3 file(s). Proposed `B-CAREFUL` / P2: Δ 1 — small overlap, cherry-pick then rebrand + gates; intent prefix "feat"

**`842b37e76` evidence.** Δ 24 of 46 file(s) · hot: src/core/webview/ClineProvider.ts. Proposed `C-REIMPLEMENT` / P1: structural divergence (decomposed webview handlers / ClineProvider); intent prefix "fix"

---

## SYNC-23 — Refresh 2026-11-24 (proposals — needs human triage)

These 239 commit(s) landed on `upstream/main` after the recorded baseline tip `842b37e76`. Classes/priorities below are **proposals** computed from git-derived evidence (README §3) by `scripts/upstream-sync-triage.mjs --refresh`; review before picking and re-home any row whose theme belongs to an existing batch.

| SHA         | Date       | Subject                                                                                                                          | Class           | Pri | Δ   | Status                                                                                                                                                                                                           | Blocked-by                                         | Resolved: | Version | Exception |
| ----------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------- | --- | --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | --------- | ------- | --------- |
| `2baac5e5b` | 2026-10-07 | fix(api): add openAiStrictToolSchemas setting for OpenAI-compatible gateways (#1828)                                             | `C-REIMPLEMENT` | P1  | 23  | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `2681ccbac` | 2026-10-08 | fix(code-index): refresh status routing on workspace-folder changes (#1957)                                                      | `A-CLEAN`       | P1  | 0   | ☐                                                                                                                                                                                                                | `778ad3e18`                                        | —         | —       | —         |
| `fc1fc9ab1` | 2026-10-09 | fix(task): recover completed tool turn continuation (#1884)                                                                      | `B-CAREFUL`     | P1  | 5   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `036245c5e` | 2026-10-09 | fix(task): stage-independent saveClineMessages + finalize open partial tool ask (split 1/6 of #1066) (#1927)                     | `B-CAREFUL`     | P1  | 3   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `d4ce624cc` | 2026-10-09 | fix(webview): omit originalContent from webview messages and fetch on demand (#1943)                                             | `C-REIMPLEMENT` | P1  | 6   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `ffb243555` | 2026-10-09 | fix: keep streamed read path empty until available (#1948) (#1962)                                                               | `B-CAREFUL`     | P1  | 3   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `a101c613e` | 2026-10-09 | fix(read-file): preserve Unicode when clipping file lines (#1960)                                                                | `A-CLEAN`       | P1  | 0   | ◐ 72e3c9442                                                                                                                                                                                                      | —                                                  | —         | —       | —         |
| `9b6d742e9` | 2026-10-09 | fix(openai-codex): send the verbosity setting in requests (#1977)                                                                | `B-CAREFUL`     | P1  | 2   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `1a98c5516` | 2026-10-09 | fix(bedrock): resolve custom ARN capabilities from the underlying model (#1970)                                                  | `C-REIMPLEMENT` | P1  | 26  | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `b7ab5a83e` | 2026-10-09 | fix: reject unsupported MIME types in image blocks (#1961)                                                                       | `A-CLEAN`       | P1  | 0   | ◐ 72e3c9442                                                                                                                                                                                                      | —                                                  | —         | —       | —         |
| `d1f584597` | 2026-10-10 | chore: prepare v3.88.0 release (#1980)                                                                                           | `C-REIMPLEMENT` | P3  | 41  | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `667ff5891` | 2026-10-10 | fix: resolve shared AI-SDK tool-call dedup and error handling gaps (#797) (#799)                                                 | `C-REIMPLEMENT` | P1  | 20  | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `09e7326cf` | 2026-10-10 | fix(task): apply command protection checks in queued-message drain (#1699)                                                       | `B-CAREFUL`     | P1  | 1   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `2267656fe` | 2026-10-10 | chore(deps): update dependency undici to v6.28.1 [security] (#1874)                                                              | `D-LOCAL`       | P0  | 2   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `ecab51985` | 2026-10-10 | fix(codex): preserve encrypted reasoning alongside visible summaries (#1966)                                                     | `A-CLEAN`       | P1  | 0   | ☐                                                                                                                                                                                                                | `afdede5b9`, `8d296deef`                           | —         | —       | —         |
| `d40c45a38` | 2026-10-11 | fix(opencode-go): add GPT-6 Luna support (#2003)                                                                                 | `B-CAREFUL`     | P1  | 5   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `af9d7e763` | 2026-10-11 | feat(task): add runState field, write helpers, and projection (RSK-04) (#1985)                                                   | `C-REIMPLEMENT` | P2  | 1   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `9c069e94e` | 2026-10-11 | docs: write contributor docs and templates in Simplified Technical English (#1987)                                               | `C-REIMPLEMENT` | P3  | 43  | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `995167eed` | 2026-10-12 | feat: add tiered tool-repetition detection (soft warning + hard stop) (#1829)                                                    | `C-REIMPLEMENT` | P2  | 52  | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `5c60a4257` | 2026-10-12 | fix(ci): key label-pr-review-state concurrency per PR (#1739)                                                                    | `B-CAREFUL`     | P1  | 1   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `89a90f513` | 2026-10-12 | feat(api): abort signal support for openai-codex (completePrompt + createMessage) (#1290)                                        | `C-REIMPLEMENT` | P2  | 3   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `fafad20b0` | 2026-10-12 | fix(vscode-lm): integrate guarded recovery into streaming responses (#1608)                                                      | `B-CAREFUL`     | P1  | 2   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `adee4d2db` | 2026-10-12 | fix(telemetry): remove redundant captureException calls that double-count errors (#1702)                                         | `C-REIMPLEMENT` | P1  | 5   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `793b65b79` | 2026-10-12 | fix: validate tools against the request's policy snapshot instead of live settings (#1749)                                       | `C-REIMPLEMENT` | P1  | 8   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `7389d9836` | 2026-10-12 | Implement symlinks for skills (#1843)                                                                                            | `A-CLEAN`       | P3  | 0   | ◐ de2ec1870                                                                                                                                                                                                      | —                                                  | —         | —       | —         |
| `496bd1146` | 2026-10-12 | chore(deps): update dependency axios to v1.20.0 [security] (#1875)                                                               | `D-LOCAL`       | P0  | 1   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `707f1442d` | 2026-10-12 | fix(webview): show sane defaults for custom OpenAI-compatible models (#1848)                                                     | `B-CAREFUL`     | P1  | 2   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `b8abc3807` | 2026-10-12 | chore(deps): update dependency pretty-bytes to v7.2.0 (#1880)                                                                    | `D-LOCAL`       | P3  | 1   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `36b01ef85` | 2026-10-12 | fix: let any requester clear a maintainer block in the label workflow (#2026) (#2027)                                            | `B-CAREFUL`     | P1  | 1   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `839fd6c03` | 2026-10-12 | refactor: Fetch model lists via ApiHandler interface (#1906)                                                                     | `C-REIMPLEMENT` | P3  | 30  | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `e9c8d05a4` | 2026-10-12 | refactor(extraction): decode documents from required buffers (#2002)                                                             | `B-CAREFUL`     | P3  | 2   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `af2841724` | 2026-10-13 | [Fix] Label workflow strips has-conflicts when mergeability is unknown (#2028)                                                   | `B-CAREFUL`     | P1  | 1   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `571796ee6` | 2026-10-13 | chore(deps): update dependency react-i18next to v15.7.4 (#1887)                                                                  | `D-LOCAL`       | P3  | 1   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `4bcb1e1b8` | 2026-10-13 | fix(api): surface adaptive thinking display and thinking_tokens for Anthropic models (#1327)                                     | `B-CAREFUL`     | P1  | 3   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `285f6687a` | 2026-10-13 | docs(agents): add typed-test checklist to the ESLint suppressions guidance (#1420)                                               | `B-CAREFUL`     | P3  | 1   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `26331c403` | 2026-10-13 | chore(deps): update dependency ai to v7 (#1907)                                                                                  | `B-CAREFUL`     | P3  | 3   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `1d3799466` | 2026-10-13 | fix(openai): preserve reasoning for local OpenAI-compatible models via R1 toggle (#1119)                                         | `B-CAREFUL`     | P1  | 3   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `4fea3e638` | 2026-10-14 | chore(deps): update dependency shell-quote to v1.11.0 [security] (#1973)                                                         | `D-LOCAL`       | P0  | 1   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `f315cf4ac` | 2026-10-14 | feat(vscode-lm): port six Copilot model entries (#2032)                                                                          | `A-CLEAN`       | P2  | 0   | ◐ c318ee46f                                                                                                                                                                                                      | —                                                  | —         | —       | —         |
| `58341d882` | 2026-10-14 | [Chore] Turn off unused-variable linting in src and remove dead code (#2038)                                                     | `C-REIMPLEMENT` | P3  | 117 | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `2bf171463` | 2026-10-15 | refactor(task): scope tool state to each tool call (#2015)                                                                       | `C-REIMPLEMENT` | P3  | 15  | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `99f9090b4` | 2026-10-15 | fix: exempt attempt_completion from disabledTools (#1751)                                                                        | `C-REIMPLEMENT` | P1  | 27  | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `530d01e37` | 2026-10-15 | fix(vscode-lm): complete combined Copilot model port with safe input ceilings (#2052)                                            | `B-CAREFUL`     | P1  | 1   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `8018cba40` | 2026-10-15 | feat(providers): add Gemini 4 Argon to Gemini and Vertex AI providers (#2043)                                                    | `B-CAREFUL`     | P2  | 2   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `041c9e539` | 2026-10-16 | feat(api): add GitHub Copilot provider with sign-in and live model capabilities (#1969)                                          | `C-REIMPLEMENT` | P2  | 55  | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `07cec92f3` | 2026-10-16 | fix(deps): update dependency @modelcontextprotocol/sdk to v1.31.0 [security] (#1974)                                             | `B-CAREFUL`     | P0  | 4   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `e2fc548b2` | 2026-10-16 | fix(opencode-go): always send x-opencode-session via per-instance session id (#1710)                                             | `B-CAREFUL`     | P1  | 2   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `4f1dee18e` | 2026-10-16 | chore(deps): update dependency @ai-sdk/openai-compatible to v3 (#1899)                                                           | `D-LOCAL`       | P3  | 2   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `ff0a2bd3b` | 2026-10-16 | fix(prompts): warn that apply_diff SEARCH requires whole lines, not substrings (#1712)                                           | `B-CAREFUL`     | P1  | 1   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `a06127157` | 2026-10-16 | feat: add IO Intelligence provider (#1758)                                                                                       | `C-REIMPLEMENT` | P2  | 50  | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `3edc2ffc3` | 2026-10-17 | feat(task): add run-state divergence comparison and metrics (#2047)                                                              | `C-REIMPLEMENT` | P2  | 2   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `89e374580` | 2026-10-17 | chore: prepare v3.90.0 release (#2074)                                                                                           | `C-REIMPLEMENT` | P3  | 41  | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `e536e8258` | 2026-10-17 | fix(deps): update dependency katex to ^0.18.0 [security] (#1975)                                                                 | `D-LOCAL`       | P0  | 3   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `df4da75f5` | 2026-10-17 | feat(chat): add inline model selector to chat composer (#2034)                                                                   | `C-REIMPLEMENT` | P2  | 43  | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `cb698bea7` | 2026-10-17 | [Fix] has-conflicts label flaps off while GitHub recomputes mergeability (#2048)                                                 | `B-CAREFUL`     | P1  | 1   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `124b12fc1` | 2026-10-17 | [Fix] Fork PR review-state labels stay stale until the hourly sweep (#2049)                                                      | `B-CAREFUL`     | P1  | 1   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `07cc5c562` | 2026-10-17 | chore(deps): pin dependencies (#2035)                                                                                            | `D-LOCAL`       | P3  | 3   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `c00676cb8` | 2026-10-17 | fix(deps): update dependency simple-git to v4 [security] (#1976)                                                                 | `B-CAREFUL`     | P0  | 3   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `1cbc0f4d6` | 2026-10-17 | deps(knip): enable production mode and remove dead code (#527)                                                                   | `C-REIMPLEMENT` | P3  | 45  | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `f707b6dfe` | 2026-10-17 | [Fix] Stale PR clock resets on bot activity so stale PRs never close (#2077)                                                     | `B-CAREFUL`     | P1  | 3   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `289538e2d` | 2026-10-17 | [Fix] Restart-persistence E2E flakes when the final ui_messages.json write lands after VS Code quits (#2080)                     | `B-CAREFUL`     | P1  | 2   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `8dd553332` | 2026-10-18 | fix(deps): update dependency zod to v4 (#2029)                                                                                   | `C-REIMPLEMENT` | P1  | 18  | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `e4e112e15` | 2026-10-18 | [Fix] Review-state labels missing on new PRs because GitHub rejects the label workflow (#2088)                                   | `B-CAREFUL`     | P1  | 2   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `e6edad1ef` | 2026-10-18 | fix(api): require HTTPS for custom Google Gemini base URLs (CWE-319) (#2033)                                                     | `C-REIMPLEMENT` | P1  | 6   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `397e51c28` | 2026-10-18 | feat(providers): clamp Gemini 4 Argon limits on Vercel AI Gateway to Google's values (#2073)                                     | `B-CAREFUL`     | P2  | 2   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `b69989b82` | 2026-10-18 | chore(deps): update build, lint, and test tooling (#804)                                                                         | `C-REIMPLEMENT` | P3  | 20  | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `ddd6f0b8d` | 2026-10-19 | feat(terminal): add default command output collapse setting (#2042)                                                              | `C-REIMPLEMENT` | P2  | 26  | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `e623cde9f` | 2026-10-19 | Fix DCG startup errors in remote workspaces (#1639)                                                                              | `B-CAREFUL`     | P3  | 3   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `135847e47` | 2026-10-19 | fix(code-index): route Bedrock embedder through the system proxy (#1773)                                                         | `B-CAREFUL`     | P1  | 4   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `a62c1798c` | 2026-10-19 | feat(mcp): add AnySearch MCP server (#1955)                                                                                      | `A-CLEAN`       | P2  | 0   | ☐                                                                                                                                                                                                                | `667ff5891`                                        | —         | —       | —         |
| `9ef94f22b` | 2026-10-20 | chore(deps): update ai sdk core and providers (#2071)                                                                            | `D-LOCAL`       | P3  | 3   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `9a801b077` | 2026-10-20 | [Fix] Review-state labels swap on unchanged PRs while GitHub computes mergeability (#2091)                                       | `B-CAREFUL`     | P1  | 1   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `6c76f9019` | 2026-10-20 | chore(deps): lock file maintenance (#2097)                                                                                       | `B-CAREFUL`     | P3  | 4   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `16425bcf3` | 2026-10-20 | [Feat] Add Claude Haiku 5.5 to the AWS Bedrock model dropdown (#2100)                                                            | `B-CAREFUL`     | P2  | 2   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `36f8bd834` | 2026-10-21 | chore(deps): update dependency @changesets/cli to v2.31.1 (#2081)                                                                | `D-LOCAL`       | P3  | 2   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `ce596a745` | 2026-10-21 | feat(mcp): add Tradehand to the MCP marketplace (#2123)                                                                          | `A-CLEAN`       | P2  | 0   | ☐                                                                                                                                                                                                                | `a62c1798c`                                        | —         | —       | —         |
| `b14f6b586` | 2026-10-21 | chore(deps): pin dependencies (#2087)                                                                                            | `D-LOCAL`       | P3  | 4   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `26a0807ea` | 2026-10-21 | feat(api): abort signal support for native-ollama (completePrompt + createMessage) (#1299)                                       | `C-REIMPLEMENT` | P2  | 23  | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `6b219d91e` | 2026-10-21 | ci: weekly release kickoff via zoomote mention with maintainer rotation (#2075)                                                  | `E-SKIP`        | P4  | 1   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `90969906e` | 2026-10-21 | [Fix] Conflicted PRs keep awaiting-author alongside the has-conflicts flag (#2102)                                               | `B-CAREFUL`     | P1  | 1   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `9cb83c35a` | 2026-10-21 | fix(chat): keep API request and reasoning rows after a batched group (#2126)                                                     | `A-CLEAN`       | P1  | 0   | ◐ 72e3c9442                                                                                                                                                                                                      | —                                                  | —         | —       | —         |
| `c1eb1a999` | 2026-10-21 | perf: cache eslint, enable incremental tsc, lint staged files only in pre-commit (#2092)                                         | `B-CAREFUL`     | P1  | 4   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `169d1414c` | 2026-10-21 | chore(deps): update dependency @eslint/js to v9.39.5 (#2094)                                                                     | `D-LOCAL`       | P3  | 2   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `13cb03a16` | 2026-10-21 | fix(openrouter): profile moonshotai/kimi-k3 with truthful max_tokens and reasoning effort (#1325)                                | `C-REIMPLEMENT` | P1  | 2   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `a89275dd4` | 2026-10-22 | [Fix] Review-state label on fork PRs does not update after a new review (#2134)                                                  | `B-CAREFUL`     | P1  | 1   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `13c6f6c5f` | 2026-10-22 | feat(run-state): add the turn sub-machine (#1800) (#2127)                                                                        | `A-CLEAN`       | P2  | 0   | ☐                                                                                                                                                                                                                | `e69c6a6b3`, `a704002b6`                           | —         | —       | —         |
| `05d01f33d` | 2026-10-22 | refactor(task): route latch and isInitialized writes through events (RSK-06) (#2128)                                             | `C-REIMPLEMENT` | P3  | 3   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `eb5f39c79` | 2026-10-23 | feat(evals): add trusted fixture runner and execution traces (substrate only) (#1909)                                            | `B-CAREFUL`     | P2  | 5   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `3dbd44b8f` | 2026-10-23 | [MCP] Add Mailtea to the marketplace (#1869)                                                                                     | `A-CLEAN`       | P3  | 0   | ☐                                                                                                                                                                                                                | `ce596a745`                                        | —         | —       | —         |
| `f1be1c093` | 2026-10-23 | fix(apply-diff): report all failures and diagnose malformed markers (#2053)                                                      | `C-REIMPLEMENT` | P1  | 2   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `37b66fe74` | 2026-10-23 | [Refactor] Make Task.create share its startup path with Task.run (#2146)                                                         | `B-CAREFUL`     | P3  | 2   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `3b3f6c780` | 2026-10-24 | chore: prepare v3.92.0 release (#2166)                                                                                           | `C-REIMPLEMENT` | P3  | 40  | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `01789cebc` | 2026-10-24 | chore(deps): update build, lint, and test tooling (#2101)                                                                        | `D-LOCAL`       | P3  | 10  | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `d9278a076` | 2026-10-24 | chore(deps): update ai sdk core and providers (#2103)                                                                            | `D-LOCAL`       | P3  | 3   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `e5912fde5` | 2026-10-24 | fix(deps): update dependency @modelcontextprotocol/sdk to v1.32.0 [security] (#2131)                                             | `D-LOCAL`       | P0  | 2   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `b33817a31` | 2026-10-24 | chore(deps): update dependency @next/eslint-plugin-next to v15.5.28 (#2132)                                                      | `D-LOCAL`       | P3  | 2   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `9f1c01dd9` | 2026-10-24 | chore(deps): update dependency undici to v6.29.1 [security] (#2169)                                                              | `D-LOCAL`       | P0  | 2   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `93c1f96ce` | 2026-10-24 | chore(deps): update dependency @types/node (#2135)                                                                               | `D-LOCAL`       | P3  | 10  | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `2bba754e4` | 2026-10-24 | Feature #2112 Rename tasks in history (#2122)                                                                                    | `C-REIMPLEMENT` | P3  | 28  | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `333db913c` | 2026-10-24 | chore(deps): update dependency esbuild-wasm to v0.28.2 (#2137)                                                                   | `D-LOCAL`       | P3  | 2   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `e879f8de4` | 2026-10-24 | feat(opencode-go): opt-in temperature for Responses models (#2055) (#2160)                                                       | `C-REIMPLEMENT` | P2  | 7   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `8383de489` | 2026-10-24 | Add static OAuth client settings for MCP servers (#2129)                                                                         | `B-CAREFUL`     | P3  | 4   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `ca05b7305` | 2026-10-24 | feat(api): abort signal support for anthropic, anthropic-vertex, xai, minimax (#1293)                                            | `C-REIMPLEMENT` | P2  | 12  | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `e0d27257e` | 2026-10-25 | fix(openai): count compatible cache reads (#1662)                                                                                | `B-CAREFUL`     | P1  | 2   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `6a9bd2c9b` | 2026-10-25 | chore: move release kickoff to 12pm EST (#2190)                                                                                  | `E-SKIP`        | P4  | 0   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `97228c7ca` | 2026-10-25 | feat(vscode-lm): runtime image input support (#2159)                                                                             | `B-CAREFUL`     | P2  | 4   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `64908ab43` | 2026-10-26 | refactor(cli): resolve the model ID through the provider definitions (#2192)                                                     | `B-CAREFUL`     | P3  | 2   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `5cc5a3795` | 2026-10-26 | test(webview): use the real VS Code toolkit in Playwright visual baselines (#2163)                                               | `A-CLEAN`       | P3  | 0   | ✖ `5cc5a3795` imports ~24 upstream visual-baseline PNGs; those baselines destabilise the fork's own Playwright visual suite and the commit closes no fork defect (SYNC-23 decision, 2026-11-24)                  | —                                                  | —         | —       | —         |
| `f932deb52` | 2026-10-27 | feat(vscode-lm): support image input conversion and shim data parts (#2196)                                                      | `B-CAREFUL`     | P2  | 2   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `764db84eb` | 2026-10-27 | [Fix] Link review gate Details to the workflow run (#2204)                                                                       | `B-CAREFUL`     | P1  | 1   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `3b825bf72` | 2026-10-27 | [Fix] Five webview visual tests fail on every pull request (#2209)                                                               | `B-CAREFUL`     | P1  | 1   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `8fb804687` | 2026-10-28 | [Feat] Add Claude Haiku 5.5 model to the Anthropic provider (#2212)                                                              | `B-CAREFUL`     | P2  | 4   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `3f51e9df7` | 2026-10-28 | [Improve] Dispose view listeners and ignore stale views when the webview is replaced (#2213)                                     | `C-REIMPLEMENT` | P3  | 7   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `0e208c443` | 2026-10-28 | feat(api): add ensureModelFetched to the six remaining catalog providers (#2191)                                                 | `C-REIMPLEMENT` | P2  | 15  | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `660673368` | 2026-10-29 | feat(api): abort signal support for vscode-lm (completePrompt + createMessage) (#1300)                                           | `B-CAREFUL`     | P2  | 4   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `c2f7b40fe` | 2026-10-29 | [Fix] Dragging files into the chat input fails unless Shift is held (#2184)                                                      | `B-CAREFUL`     | P1  | 1   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `c4ed96c0a` | 2026-10-29 | [Improve] Reduce chat memory retained during long sessions (#2217)                                                               | `C-REIMPLEMENT` | P3  | 6   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `545e4d554` | 2026-10-29 | [Feat] Support custom MCP OAuth callback paths and WWW-Authenticate discovery (#2219)                                            | `B-CAREFUL`     | P2  | 2   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `0952a8999` | 2026-10-29 | [Fix] Preserve subtask link identities (#2228)                                                                                   | `C-REIMPLEMENT` | P1  | 3   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `4d14dbe13` | 2026-10-29 | [Refactor] Treat apiConfiguration as always defined in the webview (#2234)                                                       | `C-REIMPLEMENT` | P3  | 17  | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `16fced147` | 2026-10-30 | refactor(task): replace dispatch lock booleans with DispatchState (#2198)                                                        | `C-REIMPLEMENT` | P3  | 7   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `159c42e15` | 2026-10-30 | feat(api): abort signal support for gemini, mistral, lite-llm (completePrompt + createMessage) (#1303)                           | `C-REIMPLEMENT` | P2  | 10  | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `87b57cbf7` | 2026-10-30 | Update VS Code LM model metadata and regression tests (#2255)                                                                    | `B-CAREFUL`     | P3  | 2   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `f92cb9339` | 2026-10-30 | Report an MCP OAuth callback failure before a retry (#2238)                                                                      | `B-CAREFUL`     | P3  | 2   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `4eef474dc` | 2026-10-31 | chore: prepare v3.94.0 release (#2272)                                                                                           | `C-REIMPLEMENT` | P3  | 40  | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `535e25a92` | 2026-10-31 | chore(deps): update dependency @tanstack/react-query to v5.105.0 (#2180)                                                         | `D-LOCAL`       | P3  | 1   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `3ac57f1f9` | 2026-10-31 | chore(deps): update dependency ignore to v7.0.13 (#2181)                                                                         | `D-LOCAL`       | P3  | 1   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `973cd13e9` | 2026-10-31 | Update dependency posthog-js to v1.440.0 (#2182)                                                                                 | `D-LOCAL`       | P3  | 1   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `9ae00199e` | 2026-10-31 | chore(deps): update dependency qs to v6.16.1 [security] (#2214)                                                                  | `D-LOCAL`       | P0  | 2   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `a90a5beb4` | 2026-10-31 | Update dependency posthog-node to v5.57.2 (#2183)                                                                                | `D-LOCAL`       | P3  | 1   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `c818f4ca0` | 2026-10-31 | Update GitHub Actions (#2186)                                                                                                    | `C-REIMPLEMENT` | P3  | 7   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `dcc6bcf49` | 2026-10-31 | refactor(shared): resolve profile model IDs through provider definitions (#2239)                                                 | `A-CLEAN`       | P3  | 0   | ☐                                                                                                                                                                                                                | `a06127157`                                        | —         | —       | —         |
| `87523baed` | 2026-10-31 | fix(api): adopt cumulative message_delta output tokens in Anthropic/MiniMax cost (#2242)                                         | `B-CAREFUL`     | P1  | 2   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `102e3b1eb` | 2026-10-31 | [Refactor] Add test-utils guardrails and convert remaining stragglers (#2279)                                                    | `C-REIMPLEMENT` | P3  | 13  | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `51b7f579f` | 2026-10-31 | chore(mutation-gate): use plugin-side related-test discovery for the extension package (#2211)                                   | `A-CLEAN`       | P3  | 0   | ☐                                                                                                                                                                                                                | `79cd12f2c`                                        | —         | —       | —         |
| `71a21c2cb` | 2026-10-31 | fix(opencode-go): add MiMo V2.6 Flash and Pro model configurations (#2246)                                                       | `B-CAREFUL`     | P1  | 4   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `24da00f86` | 2026-10-31 | refactor: remove no-explicit-any suppressions in utils (#2281)                                                                   | `B-CAREFUL`     | P3  | 2   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `7e74ebe82` | 2026-10-31 | fix(mistral): bill cache reads at 0.1x instead of the full input price (#2257)                                                   | `B-CAREFUL`     | P1  | 2   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `a90133dd4` | 2026-10-31 | chore(test): drop test-only tool-use interfaces from shared/tools (#2258)                                                        | `B-CAREFUL`     | P3  | 2   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `c6d53609c` | 2026-10-31 | refactor(providers): map xAI tool_choice to the Responses API shape with a typed request body (#2036)                            | `C-REIMPLEMENT` | P3  | 9   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `57307f62b` | 2026-10-31 | perf(webview): replace axios in key-info hooks with fetch (#2261)                                                                | `B-CAREFUL`     | P1  | 3   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `070ee98eb` | 2026-10-31 | [refactor] Move default provider ID functionality into provider definition (#2233)                                               | `C-REIMPLEMENT` | P3  | 13  | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `33b565071` | 2026-10-31 | fix(read-file): propagate beyond-EOF error instead of reporting file as empty (#1734)                                            | `B-CAREFUL`     | P1  | 2   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `236833933` | 2026-11-01 | [Chore] Close lint coverage and knip hygiene gaps (#2280)                                                                        | `C-REIMPLEMENT` | P3  | 7   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `997f5d822` | 2026-11-01 | fix(webview): detect dead webview renderer via heartbeat and auto-reload (#1715)                                                 | `C-REIMPLEMENT` | P1  | 49  | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `70eba96ca` | 2026-11-01 | fix(anthropic): keep tool_result blocks contiguous by grouping image blocks separately (#2243)                                   | `B-CAREFUL`     | P1  | 4   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `07007b431` | 2026-11-01 | chore(webview): remove dead CSS classes from the global stylesheet (#2251)                                                       | `A-CLEAN`       | P3  | 0   | ◐ 945b9e38f                                                                                                                                                                                                      | —                                                  | —         | —       | —         |
| `627579b44` | 2026-11-01 | fix(deepseek): read documented top-level prompt-cache counters (#2252)                                                           | `B-CAREFUL`     | P1  | 2   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `c71705efb` | 2026-11-01 | fix(xai): send body prompt_cache_key for Responses cache affinity (#2256)                                                        | `B-CAREFUL`     | P1  | 2   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `1d78f7499` | 2026-11-01 | [Refactor] Remove no-explicit-any suppressions: batch 2 (small directories) (#2286)                                              | `C-REIMPLEMENT` | P3  | 11  | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `16cd5ad0d` | 2026-11-02 | [Chore] Show the Zoo Code panel in the Solheim smoke video and bound the apt step (#2195)                                        | `A-CLEAN`       | P3  | 0   | ✖ `16cd5ad0d` is Solheim smoke-video/agent-evals tooling whose only entry point is a `.github/**` workflow the fork owns; taking it without that workflow leaves orphaned scripts (SYNC-23 decision, 2026-11-24) | —                                                  | —         | —       | —         |
| `a53ac5cf6` | 2026-11-02 | [Feat] Add privacy-safe diagnostics reports (#2292)                                                                              | `C-REIMPLEMENT` | P2  | 29  | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `12ea0f888` | 2026-11-02 | chore(i18n): sweep dead locale keys (AST-gated) (#2263)                                                                          | `C-REIMPLEMENT` | P3  | 236 | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `f8aa881c5` | 2026-11-02 | perf(webview): load locales on demand instead of eager-globbing all 18 (#2267)                                                   | `A-CLEAN`       | P1  | 0   | ◐ ec8f283d31                                                                                                                                                                                                     | `fec4e1353`, `8f7f48ad5`                           | —         | —       | —         |
| `a4f774b17` | 2026-11-02 | perf(webview): replace the debounce package with a local leading-edge helper (#2268)                                             | `B-CAREFUL`     | P1  | 3   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `debd3c72c` | 2026-11-03 | feat(settings): user-facing prompt-cache TTL for Anthropic profiles (C6) (#2271)                                                 | `C-REIMPLEMENT` | P2  | 35  | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `7ecc66723` | 2026-11-03 | Fix checkpoint restore when the saved commit is missing (#2269)                                                                  | `C-REIMPLEMENT` | P3  | 27  | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `3ee042d91` | 2026-11-03 | fix(condense): summarize only the API-visible history (#2300)                                                                    | `B-CAREFUL`     | P1  | 2   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `d4722af3f` | 2026-11-03 | feat(mcp): add Keenable to the MCP marketplace (#2313)                                                                           | `A-CLEAN`       | P2  | 0   | ☐                                                                                                                                                                                                                | `3dbd44b8f`                                        | —         | —       | —         |
| `69401af2c` | 2026-11-04 | feat(api): abort-signal wiring for lm-studio and qwen-code (round 2) (#1309)                                                     | `C-REIMPLEMENT` | P2  | 11  | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `a15ba8c8a` | 2026-11-04 | [Feat] Post surviving mutants as a PR comment (#2293)                                                                            | `A-CLEAN`       | P2  | 0   | ✖ `a15ba8c8a` only extends the upstream mutation workflow and its PR-comment automation, whose files are all created by the discarded `E-SKIP` row `79cd12f2c`; the fork runs neither (SYNC-23, 2026-11-26)      | `79cd12f2c`                                        | —         | —       | —         |
| `6bbc7a091` | 2026-11-05 | feat(tools): add dependency-free BM25 ranker (#1207)                                                                             | `B-CAREFUL`     | P2  | 1   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `1c1569558` | 2026-11-05 | [Chore] Cancel obsolete PR CI runs and remove duplicate builds (#2294)                                                           | `B-CAREFUL`     | P3  | 5   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `e943530c8` | 2026-11-05 | feat(ui): add time and date format settings and message timestamps (#2223)                                                       | `C-REIMPLEMENT` | P2  | 34  | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `4d1a543c5` | 2026-11-05 | fix(task): report emergency condense like the automatic path (#1838)                                                             | `B-CAREFUL`     | P1  | 2   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `7ec58d4d4` | 2026-11-06 | perf(ci): run webview tests with four workers (#2308)                                                                            | `A-CLEAN`       | P1  | 0   | ◐ 34aeaed12                                                                                                                                                                                                      | —                                                  | —         | —       | —         |
| `457bed3ca` | 2026-11-06 | [Perf] Throttle partial message updates while streaming (#2120)                                                                  | `B-CAREFUL`     | P1  | 2   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `bb6cbee59` | 2026-11-06 | [Fix] Completed task fails to resume after restart when a message write is interrupted (#2297)                                   | `C-REIMPLEMENT` | P1  | 9   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `5a7f3f81b` | 2026-11-07 | [Refactor] Remove no-explicit-any suppressions: batch 3 (integrations) (#2309)                                                   | `C-REIMPLEMENT` | P3  | 8   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `d2a59a8b2` | 2026-11-07 | chore: prepare v3.96.0 release (#2341)                                                                                           | `C-REIMPLEMENT` | P3  | 40  | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `0496e3885` | 2026-11-07 | fix(deps): update dependency @types/katex (#2273)                                                                                | `D-LOCAL`       | P1  | 3   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `90290b115` | 2026-11-07 | chore(deps): update ai sdk core and providers (#2274)                                                                            | `D-LOCAL`       | P3  | 3   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `73931fe8b` | 2026-11-07 | chore(deps): update dependency zustand to v5.0.16 (#2275)                                                                        | `D-LOCAL`       | P3  | 1   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `d956405c2` | 2026-11-08 | chore(deps): update dependency @copilotkit/aimock to v1.47.0 (#2277)                                                             | `B-CAREFUL`     | P3  | 2   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `5319fe91f` | 2026-11-08 | refactor(task): read abort and abortReason from run-state latches (#2283)                                                        | `C-REIMPLEMENT` | P3  | 8   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `1b9cb7d35` | 2026-11-09 | [Fix] apply_diff auto-approves edits outside the workspace (#2343)                                                               | `C-REIMPLEMENT` | P1  | 1   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `a0d03a06a` | 2026-11-09 | [Chore] Correct Turbo cache inputs and add a build cache input contract (#2324)                                                  | `C-REIMPLEMENT` | P3  | 2   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `e487cd7b2` | 2026-11-09 | test(webview): finish CSS transitions after the visual theme changes (#2327)                                                     | `A-CLEAN`       | P3  | 0   | ☐                                                                                                                                                                                                                | `fec4e1353`                                        | —         | —       | —         |
| `ba105e65c` | 2026-11-09 | fix(deps): update ai sdks and providers (#2276)                                                                                  | `B-CAREFUL`     | P1  | 2   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `d3d9cd48e` | 2026-11-09 | feat(api): abort signal support for requesty (completePrompt + shared helpers) (#1537)                                           | `B-CAREFUL`     | P2  | 4   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `332d30fbb` | 2026-11-10 | feat(settings): dynamic thinking effort experimental toggle (DTE-1) (#1521)                                                      | `C-REIMPLEMENT` | P2  | 20  | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `a71571572` | 2026-11-10 | feat(openai): add GPT-6.1 Terra support (#2379)                                                                                  | `C-REIMPLEMENT` | P2  | 1   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `18861b2e3` | 2026-11-10 | feat(friendli): fetch models from /v1/models (#2331)                                                                             | `C-REIMPLEMENT` | P2  | 14  | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `8254e11ff` | 2026-11-10 | fix(settings): pin Zoo Gateway provider first (#2419)                                                                            | `B-CAREFUL`     | P1  | 1   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `766b906ce` | 2026-11-10 | [Fix] teach #2343's apply_diff outside-workspace doubles about the hardened guarded write (#2372)                                | `A-CLEAN`       | P1  | 0   | ☐                                                                                                                                                                                                                | `1b9cb7d35`                                        | —         | —       | —         |
| `53cb5b5e7` | 2026-11-10 | unit 2 of the #1914 split (5 files, whole-file module cut) (#2384)                                                               | `B-CAREFUL`     | P3  | 3   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `631374617` | 2026-11-12 | chore: add flaky test detection to Playwright (#2358)                                                                            | `B-CAREFUL`     | P3  | 2   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `efc22ed9f` | 2026-11-12 | fix(ui): correct i18n for Marketplace tag tooltip and "Clear tags" button (#2373)                                                | `C-REIMPLEMENT` | P1  | 20  | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `8c801752a` | 2026-11-13 | fix(utils): refuse ambiguous backup recency in jsonFileRecovery (#2395)                                                          | `A-CLEAN`       | P1  | 0   | ☐                                                                                                                                                                                                                | `bb6cbee59`                                        | —         | —       | —         |
| `f98fcf7d8` | 2026-11-13 | fix(ui): make UI language change consistent (#2185) (#2194)                                                                      | `C-REIMPLEMENT` | P1  | 38  | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `5f42a918b` | 2026-11-13 | feat(api): abort signal support for openai-native (#1291)                                                                        | `C-REIMPLEMENT` | P2  | 2   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `d76dffa86` | 2026-11-13 | feat(task-title): auto-generate task titles for new root tasks (#2398)                                                           | `C-REIMPLEMENT` | P2  | 32  | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `cd66dc577` | 2026-11-14 | fix(i18n): use correct CLDR plural forms in all locales (#2424)                                                                  | `C-REIMPLEMENT` | P1  | 106 | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `d94017469` | 2026-11-14 | [Fix] Mode profile choices leak between VS Code windows (#2110)                                                                  | `C-REIMPLEMENT` | P1  | 8   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `601937024` | 2026-11-14 | feat(api): abort signal support for Zoo Gateway completePrompt (#2430)                                                           | `B-CAREFUL`     | P2  | 2   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `f2b4d1c0d` | 2026-11-14 | feat(core): add ObservationRegistry with completeness scope and close semantics, wired into Task (U5c-7, split of #1991) (#2396) | `B-CAREFUL`     | P2  | 2   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `3b06b953a` | 2026-11-14 | fix(prompts): stop spawning PowerShell for the OS name on Windows (#2449)                                                        | `B-CAREFUL`     | P1  | 1   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `b140824e4` | 2026-11-14 | fix(providers): remove unsupported keywords from strict tool schemas (#2439)                                                     | `B-CAREFUL`     | P1  | 3   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `f015dae53` | 2026-11-14 | fix(commands): prevent code execution in command frontmatter (#2420)                                                             | `A-CLEAN`       | P1  | 0   | ◐ 7da3b1b138                                                                                                                                                                                                     | —                                                  | —         | —       | —         |
| `77f24d7ae` | 2026-11-15 | Release v3.98.0 (#2451)                                                                                                          | `C-REIMPLEMENT` | P3  | 42  | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `d112b7f73` | 2026-11-15 | fix(webview): prevent CSP injection through OpenRouter URLs (#2422)                                                              | `C-REIMPLEMENT` | P1  | 5   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `0cfed55f4` | 2026-11-16 | Require consent before applying Requesty deep links (#2408)                                                                      | `C-REIMPLEMENT` | P3  | 20  | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `6843b60b8` | 2026-11-16 | Secure command parsing; add task titles, cancellation and observation tracking; fix profiles, recovery, i18n and CI (#2455)      | `A-CLEAN`       | P3  | 0   | ◐ 545d045549                                                                                                                                                                                                     | —                                                  | —         | —       | —         |
| `5e32badca` | 2026-11-16 | fix(security): prevent code execution in skill and command frontmatter (#2456)                                                   | `A-CLEAN`       | P0  | 0   | ◐ 16c3dd1d64                                                                                                                                                                                                     | —                                                  | —         | —       | —         |
| `252d9ce26` | 2026-11-16 | test(frontmatter): cover json skills, YAML tags and more languages (#2457)                                                       | `A-CLEAN`       | P3  | 0   | ◐ 06ace86763                                                                                                                                                                                                     | —                                                  | —         | —       | —         |
| `dc6d1435e` | 2026-11-16 | test(frontmatter): model valid-header acceptance in TLA+ spec (#2465)                                                            | `A-CLEAN`       | P3  | 0   | ◐ aa317317b0                                                                                                                                                                                                     | —                                                  | —         | —       | —         |
| `7b60351cf` | 2026-11-17 | fix(cli): escape untrusted text in all ask prompts (#2473)                                                                       | `A-CLEAN`       | P1  | 0   | ◐ 971115ca6                                                                                                                                                                                                      | —                                                  | —         | —       | —         |
| `3a332bbc1` | 2026-11-18 | Enforce CLI host approval policy for task configurations (#2472)                                                                 | `B-CAREFUL`     | P3  | 2   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `94c26d5b1` | 2026-11-18 | fix(auto-approval): match symlinked workspace roots (#2454)                                                                      | `A-CLEAN`       | P1  | 0   | ☐                                                                                                                                                                                                                | `c747c024b`, `7186191a6`, `bb6e254c2`, `58341d882` | —         | —       | —         |
| `66b07e0e6` | 2026-11-18 | fix(opencode-go): expose Max reasoning effort for deepseek-v4.1-flash (#2477) (#2478)                                            | `B-CAREFUL`     | P1  | 3   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `75a93a9d9` | 2026-11-18 | Require authentication for the VS Code E2E mock server (#2474)                                                                   | `B-CAREFUL`     | P3  | 4   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `32a56f30b` | 2026-11-19 | [Feat] Tell the model which shell syntax execute_command uses (cmd.exe / PowerShell) (#2115)                                     | `A-CLEAN`       | P2  | 0   | ☐                                                                                                                                                                                                                | `a0f2e0355`, `3b06b953a`                           | —         | —       | —         |
| `94ce66a58` | 2026-11-19 | fix(mentions): restrict expansion to authorized user input (#2421)                                                               | `C-REIMPLEMENT` | P1  | 20  | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `44cf71272` | 2026-11-19 | feat(tools): add singleton tool router with MCP index invalidation (#2322)                                                       | `B-CAREFUL`     | P2  | 1   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `e3de60a7c` | 2026-11-19 | test(skills): move shared spec fixtures into a named harness module (#2417)                                                      | `A-CLEAN`       | P3  | 0   | ◐ 5521075b61                                                                                                                                                                                                     | —                                                  | —         | —       | —         |
| `5b9f3e2df` | 2026-11-19 | fix(task): drop the space after the comma in two mutation-exclusion directives (#2428)                                           | `B-CAREFUL`     | P1  | 1   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `a462937b6` | 2026-11-19 | fix(ui): translate remaining hardcoded labels (#2458)                                                                            | `C-REIMPLEMENT` | P1  | 160 | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `ac6bfaf52` | 2026-11-20 | Add a per-profile LiteLLM reasoning override (#2476)                                                                             | `C-REIMPLEMENT` | P3  | 26  | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `2684e1517` | 2026-11-20 | [Feat] Add listing discussion form and PR checklist item for new provider and MCP server listings (#2517)                        | `E-SKIP`        | P4  | 1   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `5ba06451e` | 2026-11-20 | [Chore] Rewrite listing discussion templates in STE100 and remove title prefixes (#2518)                                         | `B-CAREFUL`     | P3  | 2   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `466ade69a` | 2026-11-20 | [Chore] Remove broken and unmaintained marketplace entries (#2625)                                                               | `C-REIMPLEMENT` | P3  | 48  | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `4dc45fe8c` | 2026-11-21 | feat(providers): add Claude Sonnet 5.5 support (#2521)                                                                           | `C-REIMPLEMENT` | P2  | 8   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `f600e93ba` | 2026-11-21 | feat(openai): add GPT-6.2 Sol and Astra (#2483) (#2484)                                                                          | `B-CAREFUL`     | P2  | 2   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `cd3ec4826` | 2026-11-21 | Release v3.98.1 (#2635)                                                                                                          | `C-REIMPLEMENT` | P3  | 41  | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `f948b5ba0` | 2026-11-21 | [Fix] LiteLLM + Gemini: tool call id truncation corrupts thought_signature (#2119)                                               | `B-CAREFUL`     | P1  | 3   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `cc271bdd9` | 2026-11-21 | [Fix] Ollama tasks condense before their configured context limit (#2520)                                                        | `B-CAREFUL`     | P1  | 1   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `410e5ad3d` | 2026-11-22 | [Fix] Reasoning with tool use fails on OpenAI Compatible endpoints that require the Responses API (#2498)                        | `C-REIMPLEMENT` | P1  | 27  | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `2a082ce5a` | 2026-11-22 | fix(vertex): prevent Gemini requests from ending with a model turn (#2641)                                                       | `C-REIMPLEMENT` | P1  | 1   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `7d8053fef` | 2026-11-23 | feat: add Gemini 3.8 Flash, Carbon, Hydrogen, and Neon (#2640)                                                                   | `B-CAREFUL`     | P2  | 2   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `5a05ff1af` | 2026-11-23 | Release v3.98.2 (#2658)                                                                                                          | `C-REIMPLEMENT` | P3  | 41  | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `bfdf93327` | 2026-11-23 | [Fix] OpenRouter error telemetry emits consistent provider value (#2645)                                                         | `C-REIMPLEMENT` | P1  | 2   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `050c49ef8` | 2026-11-23 | fix(auto-approval): decide read_file approval on its file targets (#2657)                                                        | `B-CAREFUL`     | P1  | 3   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `ebfe57454` | 2026-11-24 | fix(auto-approval): extract nested shell substitutions for allowlist (#2068)                                                     | `A-CLEAN`       | P1  | 0   | ☐                                                                                                                                                                                                                | `7186191a6`, `1cbc0f4d6`, `1d78f7499`              | —         | —       | —         |
| `a6c2a900b` | 2026-11-24 | chore(deps): update dependency @next/eslint-plugin-next to v15.5.29 (#2346)                                                      | `D-LOCAL`       | P3  | 2   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `fc07f210a` | 2026-11-24 | Update dependency @tanstack/react-query to v5.108.2 (#2347)                                                                      | `D-LOCAL`       | P3  | 1   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `1adc986bb` | 2026-11-24 | chore(deps): update dependency hast-util-to-jsx-runtime to v2.3.7 (#2348)                                                        | `D-LOCAL`       | P3  | 1   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `65ab2b70d` | 2026-11-24 | Update AI SDK core and providers (#2364)                                                                                         | `D-LOCAL`       | P3  | 3   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `bdd417cdb` | 2026-11-24 | Update dependency react-virtuoso to v4.18.24 (#2394)                                                                             | `D-LOCAL`       | P3  | 1   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |
| `d672d7961` | 2026-11-24 | [Fix] Sliding-window truncation skips messages hidden by condensation (#2647)                                                    | `B-CAREFUL`     | P1  | 5   | ☐                                                                                                                                                                                                                | —                                                  | —         | —       | —         |

**`2baac5e5b` evidence.** Δ 23 of 33 file(s). Proposed `C-REIMPLEMENT` / P1: Δ 23 — large overlap; runbook §2 stop condition (Δ>5 outside C-REIMPLEMENT) means inspect by hand; intent prefix "fix"

**`2681ccbac` evidence.** Δ 0 of 2 file(s). Proposed `A-CLEAN` / P1: Δ 0 — no overlap with any fork-touched file; intent prefix "fix"

**`fc1fc9ab1` evidence.** Δ 5 of 7 file(s) · hot: package.json, src/core/task/Task.ts. Proposed `B-CAREFUL` / P1: Δ 5 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`036245c5e` evidence.** Δ 3 of 3 file(s) · hot: src/core/task/Task.ts. Proposed `B-CAREFUL` / P1: Δ 3 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`d4ce624cc` evidence.** Δ 6 of 12 file(s) · hot: src/core/webview/ClineProvider.ts, src/core/webview/webviewMessageHandler.ts. Proposed `C-REIMPLEMENT` / P1: structural divergence (decomposed webview handlers / ClineProvider); intent prefix "fix"

**`ffb243555` evidence.** Δ 3 of 3 file(s) · hot: src/eslint-suppressions.json. Proposed `B-CAREFUL` / P1: Δ 3 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`a101c613e` evidence.** Δ 0 of 2 file(s). Proposed `A-CLEAN` / P1: Δ 0 — no overlap with any fork-touched file; intent prefix "fix"

**`9b6d742e9` evidence.** Δ 2 of 2 file(s). Proposed `B-CAREFUL` / P1: Δ 2 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`1a98c5516` evidence.** Δ 26 of 39 file(s). Proposed `C-REIMPLEMENT` / P1: Δ 26 — large overlap; runbook §2 stop condition (Δ>5 outside C-REIMPLEMENT) means inspect by hand; intent prefix "fix"

**`b7ab5a83e` evidence.** Δ 0 of 5 file(s). Proposed `A-CLEAN` / P1: Δ 0 — no overlap with any fork-touched file; intent prefix "fix"

**`d1f584597` evidence.** Δ 41 of 41 file(s) · hot: src/core/webview/ClineProvider.ts, src/package.json. Proposed `C-REIMPLEMENT` / P3: structural divergence (decomposed webview handlers / ClineProvider); hygiene intent prefix "chore"

**`667ff5891` evidence.** Δ 20 of 48 file(s) · hot: .github/workflows/code-qa.yml, .github/workflows/label-pr-review-state.yml, package.json, src/core/task/Task.ts. Proposed `C-REIMPLEMENT` / P1: telemetry hit — the fork purged the telemetry transport; re-implement, never cherry-pick; intent prefix "fix"

**`09e7326cf` evidence.** Δ 1 of 2 file(s) · hot: src/core/task/Task.ts. Proposed `B-CAREFUL` / P1: Δ 1 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`2267656fe` evidence.** Δ 2 of 2 file(s) · hot: package.json, pnpm-lock.yaml. Proposed `D-LOCAL` / P0: files are dependency manifests / lockfile — regenerate locally; value override on "security" (data loss / security / crash / stall)

**`ecab51985` evidence.** Δ 0 of 2 file(s). Proposed `A-CLEAN` / P1: Δ 0 — no overlap with any fork-touched file; intent prefix "fix"

**`d40c45a38` evidence.** Δ 5 of 5 file(s). Proposed `B-CAREFUL` / P1: Δ 5 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`af9d7e763` evidence.** Δ 1 of 5 file(s) · hot: src/core/task/Task.ts. Proposed `C-REIMPLEMENT` / P2: telemetry hit — the fork purged the telemetry transport; re-implement, never cherry-pick; intent prefix "feat"

**`9c069e94e` evidence.** Δ 43 of 43 file(s). Proposed `C-REIMPLEMENT` / P3: Δ 43 — large overlap; runbook §2 stop condition (Δ>5 outside C-REIMPLEMENT) means inspect by hand; hygiene intent prefix "docs"

**`995167eed` evidence.** Δ 52 of 63 file(s) · hot: src/core/task/Task.ts, src/core/webview/ClineProvider.ts, src/eslint-suppressions.json. Proposed `C-REIMPLEMENT` / P2: telemetry hit — the fork purged the telemetry transport; re-implement, never cherry-pick; intent prefix "feat"

**`5c60a4257` evidence.** Δ 1 of 2 file(s) · hot: .github/workflows/label-pr-review-state.yml. Proposed `B-CAREFUL` / P1: Δ 1 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`89a90f513` evidence.** Δ 3 of 3 file(s). Proposed `C-REIMPLEMENT` / P2: telemetry hit — the fork purged the telemetry transport; re-implement, never cherry-pick; intent prefix "feat"

**`fafad20b0` evidence.** Δ 2 of 2 file(s). Proposed `B-CAREFUL` / P1: Δ 2 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`adee4d2db` evidence.** Δ 5 of 7 file(s) · hot: src/core/task/Task.ts. Proposed `C-REIMPLEMENT` / P1: telemetry hit — the fork purged the telemetry transport; re-implement, never cherry-pick; intent prefix "fix"

**`793b65b79` evidence.** Δ 8 of 10 file(s) · hot: src/core/task/Task.ts. Proposed `C-REIMPLEMENT` / P1: telemetry hit — the fork purged the telemetry transport; re-implement, never cherry-pick; intent prefix "fix"

**`7389d9836` evidence.** Δ 0 of 20 file(s). Proposed `A-CLEAN` / P3: Δ 0 — no overlap with any fork-touched file; unrecognised intent prefix — defaulting to P3 for human review

**`496bd1146` evidence.** Δ 1 of 1 file(s) · hot: pnpm-lock.yaml. Proposed `D-LOCAL` / P0: files are dependency manifests / lockfile — regenerate locally; value override on "security" (data loss / security / crash / stall)

**`707f1442d` evidence.** Δ 2 of 2 file(s). Proposed `B-CAREFUL` / P1: Δ 2 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`b8abc3807` evidence.** Δ 1 of 1 file(s) · hot: pnpm-lock.yaml. Proposed `D-LOCAL` / P3: files are dependency manifests / lockfile — regenerate locally; hygiene intent prefix "chore"

**`36b01ef85` evidence.** Δ 1 of 2 file(s) · hot: .github/workflows/label-pr-review-state.yml. Proposed `B-CAREFUL` / P1: Δ 1 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`839fd6c03` evidence.** Δ 30 of 43 file(s) · hot: src/core/webview/ClineProvider.ts, src/core/webview/webviewMessageHandler.ts. Proposed `C-REIMPLEMENT` / P3: telemetry hit — the fork purged the telemetry transport; re-implement, never cherry-pick; hygiene intent prefix "refactor"

**`e9c8d05a4` evidence.** Δ 2 of 11 file(s) · hot: src/eslint-suppressions.json. Proposed `B-CAREFUL` / P3: Δ 2 — small overlap, cherry-pick then rebrand + gates; hygiene intent prefix "refactor"

**`af2841724` evidence.** Δ 1 of 2 file(s) · hot: .github/workflows/label-pr-review-state.yml. Proposed `B-CAREFUL` / P1: Δ 1 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`571796ee6` evidence.** Δ 1 of 1 file(s) · hot: pnpm-lock.yaml. Proposed `D-LOCAL` / P3: files are dependency manifests / lockfile — regenerate locally; hygiene intent prefix "chore"

**`4bcb1e1b8` evidence.** Δ 3 of 7 file(s). Proposed `B-CAREFUL` / P1: Δ 3 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`285f6687a` evidence.** Δ 1 of 1 file(s). Proposed `B-CAREFUL` / P3: Δ 1 — small overlap, cherry-pick then rebrand + gates; hygiene intent prefix "docs"

**`26331c403` evidence.** Δ 3 of 5 file(s) · hot: package.json, pnpm-lock.yaml, src/package.json. Proposed `B-CAREFUL` / P3: Δ 3 — small overlap, cherry-pick then rebrand + gates; hygiene intent prefix "chore"

**`1d3799466` evidence.** Δ 3 of 3 file(s). Proposed `B-CAREFUL` / P1: Δ 3 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`4fea3e638` evidence.** Δ 1 of 1 file(s) · hot: pnpm-lock.yaml. Proposed `D-LOCAL` / P0: files are dependency manifests / lockfile — regenerate locally; value override on "security" (data loss / security / crash / stall)

**`f315cf4ac` evidence.** Δ 0 of 2 file(s). Proposed `A-CLEAN` / P2: Δ 0 — no overlap with any fork-touched file; intent prefix "feat"

**`58341d882` evidence.** Δ 117 of 223 file(s) · hot: src/core/task/Task.ts, src/core/webview/ClineProvider.ts, src/core/webview/webviewMessageHandler.ts, src/eslint-suppressions.json, src/eslint.config.mjs · CORE_FILES: src/services/code-index/cache-manager.ts, src/services/code-index/embedders/bedrock.ts, src/services/code-index/embedders/ollama.ts, src/services/code-index/embedders/openai-compatible.ts, src/services/code-index/embedders/openrouter.ts, src/services/code-index/orchestrator.ts, src/services/code-index/processors/file-watcher.ts, src/services/code-index/shared/validation-helpers.ts, src/services/code-index/vector-store/qdrant-client.ts. Proposed `C-REIMPLEMENT` / P3: telemetry hit — the fork purged the telemetry transport; re-implement, never cherry-pick; hygiene intent prefix "chore"

**`2bf171463` evidence.** Δ 15 of 32 file(s) · hot: src/core/task/Task.ts. Proposed `C-REIMPLEMENT` / P3: telemetry hit — the fork purged the telemetry transport; re-implement, never cherry-pick; hygiene intent prefix "refactor"

**`99f9090b4` evidence.** Δ 27 of 38 file(s) · hot: src/core/task/Task.ts · CORE_FILES: src/core/prompts/tools/filter-tools-for-mode.ts. Proposed `C-REIMPLEMENT` / P1: telemetry hit — the fork purged the telemetry transport; re-implement, never cherry-pick; intent prefix "fix"

**`530d01e37` evidence.** Δ 1 of 3 file(s). Proposed `B-CAREFUL` / P1: Δ 1 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`8018cba40` evidence.** Δ 2 of 3 file(s). Proposed `B-CAREFUL` / P2: Δ 2 — small overlap, cherry-pick then rebrand + gates; intent prefix "feat"

**`041c9e539` evidence.** Δ 55 of 84 file(s) · hot: src/core/task/Task.ts, src/core/webview/webviewMessageHandler.ts. Proposed `C-REIMPLEMENT` / P2: structural divergence (decomposed webview handlers / ClineProvider); intent prefix "feat"

**`07cec92f3` evidence.** Δ 4 of 5 file(s) · hot: pnpm-lock.yaml, src/package.json. Proposed `B-CAREFUL` / P0: Δ 4 — small overlap, cherry-pick then rebrand + gates; value override on "security" (data loss / security / crash / stall)

**`e2fc548b2` evidence.** Δ 2 of 2 file(s). Proposed `B-CAREFUL` / P1: Δ 2 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`4f1dee18e` evidence.** Δ 2 of 3 file(s) · hot: pnpm-lock.yaml, renovate.json, src/package.json. Proposed `D-LOCAL` / P3: files are dependency manifests / lockfile — regenerate locally; hygiene intent prefix "chore"

**`ff0a2bd3b` evidence.** Δ 1 of 4 file(s). Proposed `B-CAREFUL` / P1: Δ 1 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`a06127157` evidence.** Δ 50 of 69 file(s) · hot: src/core/webview/webviewMessageHandler.ts. Proposed `C-REIMPLEMENT` / P2: structural divergence (decomposed webview handlers / ClineProvider); intent prefix "feat"

**`3edc2ffc3` evidence.** Δ 2 of 9 file(s) · hot: src/core/task/Task.ts. Proposed `C-REIMPLEMENT` / P2: telemetry hit — the fork purged the telemetry transport; re-implement, never cherry-pick; intent prefix "feat"

**`89e374580` evidence.** Δ 41 of 41 file(s) · hot: src/core/webview/ClineProvider.ts, src/package.json. Proposed `C-REIMPLEMENT` / P3: structural divergence (decomposed webview handlers / ClineProvider); hygiene intent prefix "chore"

**`e536e8258` evidence.** Δ 3 of 3 file(s) · hot: package.json, pnpm-lock.yaml. Proposed `D-LOCAL` / P0: files are dependency manifests / lockfile — regenerate locally; value override on "security" (data loss / security / crash / stall)

**`df4da75f5` evidence.** Δ 43 of 56 file(s) · hot: src/core/webview/ClineProvider.ts, src/core/webview/webviewMessageHandler.ts. Proposed `C-REIMPLEMENT` / P2: structural divergence (decomposed webview handlers / ClineProvider); intent prefix "feat"

**`cb698bea7` evidence.** Δ 1 of 2 file(s) · hot: .github/workflows/label-pr-review-state.yml. Proposed `B-CAREFUL` / P1: Δ 1 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`124b12fc1` evidence.** Δ 1 of 2 file(s) · hot: .github/workflows/label-pr-review-state.yml. Proposed `B-CAREFUL` / P1: Δ 1 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`07cc5c562` evidence.** Δ 3 of 3 file(s) · hot: pnpm-lock.yaml. Proposed `D-LOCAL` / P3: files are dependency manifests / lockfile — regenerate locally; hygiene intent prefix "chore"

**`c00676cb8` evidence.** Δ 3 of 4 file(s) · hot: pnpm-lock.yaml, renovate.json, src/package.json. Proposed `B-CAREFUL` / P0: Δ 3 — small overlap, cherry-pick then rebrand + gates; value override on "security" (data loss / security / crash / stall)

**`1cbc0f4d6` evidence.** Δ 45 of 124 file(s) · hot: .github/workflows/code-qa.yml, package.json, pnpm-lock.yaml, src/core/webview/ClineProvider.ts, src/eslint-suppressions.json, src/package.json · CORE_FILES: src/core/prompts/tools/filter-tools-for-mode.ts, src/services/code-index/shared/validation-helpers.ts. Proposed `C-REIMPLEMENT` / P3: telemetry hit — the fork purged the telemetry transport; re-implement, never cherry-pick; hygiene intent prefix "deps"

**`f707b6dfe` evidence.** Δ 3 of 9 file(s) · hot: .github/workflows/code-qa.yml, .github/workflows/label-pr-review-state.yml, src/eslint.config.mjs. Proposed `B-CAREFUL` / P1: Δ 3 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`289538e2d` evidence.** Δ 2 of 7 file(s). Proposed `B-CAREFUL` / P1: Δ 2 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`8dd553332` evidence.** Δ 18 of 27 file(s) · hot: package.json, pnpm-lock.yaml, src/package.json. Proposed `C-REIMPLEMENT` / P1: telemetry hit — the fork purged the telemetry transport; re-implement, never cherry-pick; intent prefix "fix"

**`e4e112e15` evidence.** Δ 2 of 7 file(s) · hot: .github/workflows/label-pr-review-state.yml, src/eslint.config.mjs. Proposed `B-CAREFUL` / P1: Δ 2 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`e6edad1ef` evidence.** Δ 6 of 8 file(s) · hot: .coderabbit.yaml, src/core/task/Task.ts, src/eslint.config.mjs. Proposed `C-REIMPLEMENT` / P1: Δ 6 — large overlap; runbook §2 stop condition (Δ>5 outside C-REIMPLEMENT) means inspect by hand; intent prefix "fix"

**`397e51c28` evidence.** Δ 2 of 2 file(s). Proposed `B-CAREFUL` / P2: Δ 2 — small overlap, cherry-pick then rebrand + gates; intent prefix "feat"

**`b69989b82` evidence.** Δ 20 of 37 file(s) · hot: package.json, pnpm-lock.yaml, src/core/task/Task.ts, src/package.json · CORE_FILES: src/services/code-index/interfaces/embedder.ts. Proposed `C-REIMPLEMENT` / P3: telemetry hit — the fork purged the telemetry transport; re-implement, never cherry-pick; hygiene intent prefix "chore"

**`ddd6f0b8d` evidence.** Δ 26 of 35 file(s) · hot: src/core/webview/ClineProvider.ts. Proposed `C-REIMPLEMENT` / P2: structural divergence (decomposed webview handlers / ClineProvider); intent prefix "feat"

**`e623cde9f` evidence.** Δ 3 of 6 file(s) · hot: src/eslint-suppressions.json. Proposed `B-CAREFUL` / P3: Δ 3 — small overlap, cherry-pick then rebrand + gates; unrecognised intent prefix — defaulting to P3 for human review

**`135847e47` evidence.** Δ 4 of 4 file(s) · CORE_FILES: src/services/code-index/embedders/bedrock.ts. Proposed `B-CAREFUL` / P1: Δ 4 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`a62c1798c` evidence.** Δ 0 of 1 file(s). Proposed `A-CLEAN` / P2: Δ 0 — no overlap with any fork-touched file; intent prefix "feat"

**`9ef94f22b` evidence.** Δ 3 of 3 file(s) · hot: package.json, pnpm-lock.yaml, src/package.json. Proposed `D-LOCAL` / P3: files are dependency manifests / lockfile — regenerate locally; hygiene intent prefix "chore"

**`9a801b077` evidence.** Δ 1 of 2 file(s) · hot: .github/workflows/label-pr-review-state.yml. Proposed `B-CAREFUL` / P1: Δ 1 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`6c76f9019` evidence.** Δ 4 of 6 file(s) · hot: package.json, pnpm-lock.yaml, src/package.json. Proposed `B-CAREFUL` / P3: Δ 4 — small overlap, cherry-pick then rebrand + gates; hygiene intent prefix "chore"

**`16425bcf3` evidence.** Δ 2 of 3 file(s). Proposed `B-CAREFUL` / P2: Δ 2 — small overlap, cherry-pick then rebrand + gates; intent prefix "feat"

**`36f8bd834` evidence.** Δ 2 of 2 file(s) · hot: package.json, pnpm-lock.yaml. Proposed `D-LOCAL` / P3: files are dependency manifests / lockfile — regenerate locally; hygiene intent prefix "chore"

**`ce596a745` evidence.** Δ 0 of 1 file(s). Proposed `A-CLEAN` / P2: Δ 0 — no overlap with any fork-touched file; intent prefix "feat"

**`b14f6b586` evidence.** Δ 4 of 4 file(s) · hot: pnpm-lock.yaml. Proposed `D-LOCAL` / P3: files are dependency manifests / lockfile — regenerate locally; hygiene intent prefix "chore"

**`26a0807ea` evidence.** Δ 23 of 38 file(s) · hot: src/eslint-suppressions.json, src/eslint.config.mjs. Proposed `C-REIMPLEMENT` / P2: Δ 23 — large overlap; runbook §2 stop condition (Δ>5 outside C-REIMPLEMENT) means inspect by hand; intent prefix "feat"

**`6b219d91e` evidence.** Δ 1 of 2 file(s). Proposed `E-SKIP` / P4: files touch only upstream-org automation (.github/.coderabbit/CONTRIBUTING); E-SKIP — not applicable to the fork

**`90969906e` evidence.** Δ 1 of 2 file(s) · hot: .github/workflows/label-pr-review-state.yml. Proposed `B-CAREFUL` / P1: Δ 1 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`9cb83c35a` evidence.** Δ 0 of 2 file(s). Proposed `A-CLEAN` / P1: Δ 0 — no overlap with any fork-touched file; intent prefix "fix"

**`c1eb1a999` evidence.** Δ 4 of 6 file(s) · hot: package.json, src/package.json. Proposed `B-CAREFUL` / P1: Δ 4 — small overlap, cherry-pick then rebrand + gates; intent prefix "perf"

**`169d1414c` evidence.** Δ 2 of 2 file(s) · hot: pnpm-lock.yaml. Proposed `D-LOCAL` / P3: files are dependency manifests / lockfile — regenerate locally; hygiene intent prefix "chore"

**`13cb03a16` evidence.** Δ 2 of 5 file(s). Proposed `C-REIMPLEMENT` / P1: telemetry hit — the fork purged the telemetry transport; re-implement, never cherry-pick; intent prefix "fix"

**`a89275dd4` evidence.** Δ 1 of 3 file(s) · hot: .github/workflows/label-pr-review-state.yml. Proposed `B-CAREFUL` / P1: Δ 1 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`13c6f6c5f` evidence.** Δ 0 of 3 file(s). Proposed `A-CLEAN` / P2: Δ 0 — no overlap with any fork-touched file; intent prefix "feat"

**`05d01f33d` evidence.** Δ 3 of 8 file(s) · hot: src/core/task/Task.ts, src/core/webview/ClineProvider.ts. Proposed `C-REIMPLEMENT` / P3: structural divergence (decomposed webview handlers / ClineProvider); hygiene intent prefix "refactor"

**`eb5f39c79` evidence.** Δ 5 of 44 file(s) · hot: .github/workflows/code-qa.yml, package.json, pnpm-lock.yaml. Proposed `B-CAREFUL` / P2: Δ 5 — small overlap, cherry-pick then rebrand + gates; intent prefix "feat"

**`3dbd44b8f` evidence.** Δ 0 of 1 file(s). Proposed `A-CLEAN` / P3: Δ 0 — no overlap with any fork-touched file; unrecognised intent prefix "mcp" — defaulting to P3 for human review

**`f1be1c093` evidence.** Δ 2 of 7 file(s). Proposed `C-REIMPLEMENT` / P1: telemetry hit — the fork purged the telemetry transport; re-implement, never cherry-pick; intent prefix "fix"

**`37b66fe74` evidence.** Δ 2 of 2 file(s) · hot: src/core/task/Task.ts. Proposed `B-CAREFUL` / P3: Δ 2 — small overlap, cherry-pick then rebrand + gates; hygiene intent prefix "refactor"

**`3b3f6c780` evidence.** Δ 40 of 40 file(s) · hot: src/core/webview/ClineProvider.ts, src/package.json. Proposed `C-REIMPLEMENT` / P3: structural divergence (decomposed webview handlers / ClineProvider); hygiene intent prefix "chore"

**`01789cebc` evidence.** Δ 10 of 13 file(s) · hot: package.json, pnpm-lock.yaml, pnpm-workspace.yaml, src/package.json. Proposed `D-LOCAL` / P3: files are dependency manifests / lockfile — regenerate locally; hygiene intent prefix "chore"

**`d9278a076` evidence.** Δ 3 of 3 file(s) · hot: package.json, pnpm-lock.yaml, src/package.json. Proposed `D-LOCAL` / P3: files are dependency manifests / lockfile — regenerate locally; hygiene intent prefix "chore"

**`e5912fde5` evidence.** Δ 2 of 2 file(s) · hot: pnpm-lock.yaml, src/package.json. Proposed `D-LOCAL` / P0: files are dependency manifests / lockfile — regenerate locally; value override on "security" (data loss / security / crash / stall)

**`b33817a31` evidence.** Δ 2 of 2 file(s) · hot: pnpm-lock.yaml. Proposed `D-LOCAL` / P3: files are dependency manifests / lockfile — regenerate locally; hygiene intent prefix "chore"

**`9f1c01dd9` evidence.** Δ 2 of 2 file(s) · hot: package.json, pnpm-lock.yaml. Proposed `D-LOCAL` / P0: files are dependency manifests / lockfile — regenerate locally; value override on "security" (data loss / security / crash / stall)

**`93c1f96ce` evidence.** Δ 10 of 17 file(s) · hot: package.json, pnpm-lock.yaml, pnpm-workspace.yaml, src/package.json. Proposed `D-LOCAL` / P3: scope of concern the fork owns (src/package.json) with no runtime source change; hygiene intent prefix "chore"

**`2bba754e4` evidence.** Δ 28 of 48 file(s) · hot: src/core/webview/ClineProvider.ts, src/core/webview/webviewMessageHandler.ts. Proposed `C-REIMPLEMENT` / P3: structural divergence (decomposed webview handlers / ClineProvider); unrecognised intent prefix — defaulting to P3 for human review

**`333db913c` evidence.** Δ 2 of 2 file(s) · hot: pnpm-lock.yaml, src/package.json. Proposed `D-LOCAL` / P3: files are dependency manifests / lockfile — regenerate locally; hygiene intent prefix "chore"

**`e879f8de4` evidence.** Δ 7 of 13 file(s). Proposed `C-REIMPLEMENT` / P2: Δ 7 — large overlap; runbook §2 stop condition (Δ>5 outside C-REIMPLEMENT) means inspect by hand; intent prefix "feat"

**`8383de489` evidence.** Δ 4 of 9 file(s) · hot: src/eslint-suppressions.json. Proposed `B-CAREFUL` / P3: Δ 4 — small overlap, cherry-pick then rebrand + gates; unrecognised intent prefix — defaulting to P3 for human review

**`ca05b7305` evidence.** Δ 12 of 25 file(s) · hot: src/eslint.config.mjs. Proposed `C-REIMPLEMENT` / P2: telemetry hit — the fork purged the telemetry transport; re-implement, never cherry-pick; intent prefix "feat"

**`e0d27257e` evidence.** Δ 2 of 3 file(s) · hot: src/eslint-suppressions.json. Proposed `B-CAREFUL` / P1: Δ 2 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`6a9bd2c9b` evidence.** Δ 0 of 1 file(s). Proposed `E-SKIP` / P4: files touch only upstream-org automation (.github/.coderabbit/CONTRIBUTING); E-SKIP — not applicable to the fork

**`97228c7ca` evidence.** Δ 4 of 6 file(s). Proposed `B-CAREFUL` / P2: Δ 4 — small overlap, cherry-pick then rebrand + gates; intent prefix "feat"

**`64908ab43` evidence.** Δ 2 of 2 file(s). Proposed `B-CAREFUL` / P3: Δ 2 — small overlap, cherry-pick then rebrand + gates; hygiene intent prefix "refactor"

**`5cc5a3795` evidence.** Δ 0 of 27 file(s). Proposed `A-CLEAN` / P3: Δ 0 — no overlap with any fork-touched file; hygiene intent prefix "test"

**`f932deb52` evidence.** Δ 2 of 7 file(s). Proposed `B-CAREFUL` / P2: Δ 2 — small overlap, cherry-pick then rebrand + gates; intent prefix "feat"

**`764db84eb` evidence.** Δ 1 of 2 file(s) · hot: .github/workflows/label-pr-review-state.yml. Proposed `B-CAREFUL` / P1: Δ 1 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`3b825bf72` evidence.** Δ 1 of 6 file(s). Proposed `B-CAREFUL` / P1: Δ 1 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`8fb804687` evidence.** Δ 4 of 14 file(s). Proposed `B-CAREFUL` / P2: Δ 4 — small overlap, cherry-pick then rebrand + gates; intent prefix "feat"

**`3f51e9df7` evidence.** Δ 7 of 8 file(s) · hot: src/core/webview/ClineProvider.ts. Proposed `C-REIMPLEMENT` / P3: telemetry hit — the fork purged the telemetry transport; re-implement, never cherry-pick; hygiene intent prefix "improve"

**`0e208c443` evidence.** Δ 15 of 22 file(s). Proposed `C-REIMPLEMENT` / P2: Δ 15 — large overlap; runbook §2 stop condition (Δ>5 outside C-REIMPLEMENT) means inspect by hand; intent prefix "feat"

**`660673368` evidence.** Δ 4 of 5 file(s). Proposed `B-CAREFUL` / P2: Δ 4 — small overlap, cherry-pick then rebrand + gates; intent prefix "feat"

**`c2f7b40fe` evidence.** Δ 1 of 2 file(s). Proposed `B-CAREFUL` / P1: Δ 1 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`c4ed96c0a` evidence.** Δ 6 of 17 file(s). Proposed `C-REIMPLEMENT` / P3: Δ 6 — large overlap; runbook §2 stop condition (Δ>5 outside C-REIMPLEMENT) means inspect by hand; hygiene intent prefix "improve"

**`545e4d554` evidence.** Δ 2 of 6 file(s). Proposed `B-CAREFUL` / P2: Δ 2 — small overlap, cherry-pick then rebrand + gates; intent prefix "feat"

**`0952a8999` evidence.** Δ 3 of 6 file(s) · hot: src/core/webview/ClineProvider.ts. Proposed `C-REIMPLEMENT` / P1: structural divergence (decomposed webview handlers / ClineProvider); intent prefix "fix"

**`4d14dbe13` evidence.** Δ 17 of 41 file(s). Proposed `C-REIMPLEMENT` / P3: Δ 17 — large overlap; runbook §2 stop condition (Δ>5 outside C-REIMPLEMENT) means inspect by hand; hygiene intent prefix "refactor"

**`16fced147` evidence.** Δ 7 of 14 file(s) · hot: src/core/task/Task.ts. Proposed `C-REIMPLEMENT` / P3: telemetry hit — the fork purged the telemetry transport; re-implement, never cherry-pick; hygiene intent prefix "refactor"

**`159c42e15` evidence.** Δ 10 of 14 file(s) · hot: src/eslint.config.mjs. Proposed `C-REIMPLEMENT` / P2: telemetry hit — the fork purged the telemetry transport; re-implement, never cherry-pick; intent prefix "feat"

**`87b57cbf7` evidence.** Δ 2 of 4 file(s). Proposed `B-CAREFUL` / P3: Δ 2 — small overlap, cherry-pick then rebrand + gates; unrecognised intent prefix — defaulting to P3 for human review

**`f92cb9339` evidence.** Δ 2 of 5 file(s). Proposed `B-CAREFUL` / P3: Δ 2 — small overlap, cherry-pick then rebrand + gates; unrecognised intent prefix — defaulting to P3 for human review

**`4eef474dc` evidence.** Δ 40 of 40 file(s) · hot: src/core/webview/ClineProvider.ts, src/package.json. Proposed `C-REIMPLEMENT` / P3: structural divergence (decomposed webview handlers / ClineProvider); hygiene intent prefix "chore"

**`535e25a92` evidence.** Δ 1 of 1 file(s) · hot: pnpm-lock.yaml. Proposed `D-LOCAL` / P3: files are dependency manifests / lockfile — regenerate locally; hygiene intent prefix "chore"

**`3ac57f1f9` evidence.** Δ 1 of 1 file(s) · hot: pnpm-lock.yaml. Proposed `D-LOCAL` / P3: files are dependency manifests / lockfile — regenerate locally; hygiene intent prefix "chore"

**`973cd13e9` evidence.** Δ 1 of 1 file(s) · hot: pnpm-lock.yaml. Proposed `D-LOCAL` / P3: files are dependency manifests / lockfile — regenerate locally; unrecognised intent prefix — defaulting to P3 for human review

**`9ae00199e` evidence.** Δ 2 of 2 file(s) · hot: package.json, pnpm-lock.yaml. Proposed `D-LOCAL` / P0: files are dependency manifests / lockfile — regenerate locally; value override on "security" (data loss / security / crash / stall)

**`a90a5beb4` evidence.** Δ 1 of 1 file(s) · hot: pnpm-lock.yaml. Proposed `D-LOCAL` / P3: files are dependency manifests / lockfile — regenerate locally; unrecognised intent prefix — defaulting to P3 for human review

**`c818f4ca0` evidence.** Δ 7 of 33 file(s) · hot: .github/workflows/code-qa.yml, pnpm-lock.yaml, renovate.json. Proposed `C-REIMPLEMENT` / P3: Δ 7 — large overlap; runbook §2 stop condition (Δ>5 outside C-REIMPLEMENT) means inspect by hand; unrecognised intent prefix — defaulting to P3 for human review

**`dcc6bcf49` evidence.** Δ 0 of 2 file(s). Proposed `A-CLEAN` / P3: Δ 0 — no overlap with any fork-touched file; hygiene intent prefix "refactor"

**`87523baed` evidence.** Δ 2 of 4 file(s). Proposed `B-CAREFUL` / P1: Δ 2 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`102e3b1eb` evidence.** Δ 13 of 22 file(s) · hot: src/eslint.config.mjs. Proposed `C-REIMPLEMENT` / P3: Δ 13 — large overlap; runbook §2 stop condition (Δ>5 outside C-REIMPLEMENT) means inspect by hand; hygiene intent prefix "refactor"

**`51b7f579f` evidence.** Δ 0 of 2 file(s). Proposed `A-CLEAN` / P3: Δ 0 — no overlap with any fork-touched file; hygiene intent prefix "chore"

**`71a21c2cb` evidence.** Δ 4 of 4 file(s). Proposed `B-CAREFUL` / P1: Δ 4 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`24da00f86` evidence.** Δ 2 of 15 file(s) · hot: src/eslint-suppressions.json. Proposed `B-CAREFUL` / P3: Δ 2 — small overlap, cherry-pick then rebrand + gates; hygiene intent prefix "refactor"

**`7e74ebe82` evidence.** Δ 2 of 4 file(s). Proposed `B-CAREFUL` / P1: Δ 2 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`a90133dd4` evidence.** Δ 2 of 4 file(s). Proposed `B-CAREFUL` / P3: Δ 2 — small overlap, cherry-pick then rebrand + gates; hygiene intent prefix "chore"

**`c6d53609c` evidence.** Δ 9 of 12 file(s) · hot: src/eslint-suppressions.json, src/eslint.config.mjs. Proposed `C-REIMPLEMENT` / P3: Δ 9 — large overlap; runbook §2 stop condition (Δ>5 outside C-REIMPLEMENT) means inspect by hand; hygiene intent prefix "refactor"

**`57307f62b` evidence.** Δ 3 of 10 file(s) · hot: pnpm-lock.yaml. Proposed `B-CAREFUL` / P1: Δ 3 — small overlap, cherry-pick then rebrand + gates; intent prefix "perf"

**`070ee98eb` evidence.** Δ 13 of 85 file(s). Proposed `C-REIMPLEMENT` / P3: Δ 13 — large overlap; runbook §2 stop condition (Δ>5 outside C-REIMPLEMENT) means inspect by hand; hygiene intent prefix "refactor"

**`33b565071` evidence.** Δ 2 of 5 file(s). Proposed `B-CAREFUL` / P1: Δ 2 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`236833933` evidence.** Δ 7 of 13 file(s) · hot: .github/workflows/code-qa.yml, package.json. Proposed `C-REIMPLEMENT` / P3: Δ 7 — large overlap; runbook §2 stop condition (Δ>5 outside C-REIMPLEMENT) means inspect by hand; hygiene intent prefix "chore"

**`997f5d822` evidence.** Δ 49 of 60 file(s) · hot: .github/workflows/code-qa.yml, package.json, src/core/webview/ClineProvider.ts, src/core/webview/webviewMessageHandler.ts, src/eslint-suppressions.json, src/package.json. Proposed `C-REIMPLEMENT` / P1: structural divergence (decomposed webview handlers / ClineProvider); intent prefix "fix"

**`70eba96ca` evidence.** Δ 4 of 5 file(s) · hot: .coderabbit.yaml, src/core/task/Task.ts, src/eslint-suppressions.json. Proposed `B-CAREFUL` / P1: Δ 4 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`07007b431` evidence.** Δ 0 of 1 file(s). Proposed `A-CLEAN` / P3: Δ 0 — no overlap with any fork-touched file; hygiene intent prefix "chore"

**`627579b44` evidence.** Δ 2 of 4 file(s). Proposed `B-CAREFUL` / P1: Δ 2 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`c71705efb` evidence.** Δ 2 of 2 file(s). Proposed `B-CAREFUL` / P1: Δ 2 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`1d78f7499` evidence.** Δ 11 of 36 file(s) · hot: src/eslint-suppressions.json. Proposed `C-REIMPLEMENT` / P3: Δ 11 — large overlap; runbook §2 stop condition (Δ>5 outside C-REIMPLEMENT) means inspect by hand; hygiene intent prefix "refactor"

**`16cd5ad0d` evidence.** Δ 0 of 15 file(s). Proposed `A-CLEAN` / P3: Δ 0 — no overlap with any fork-touched file; hygiene intent prefix "chore"

**`a53ac5cf6` evidence.** Δ 29 of 44 file(s) · hot: src/core/webview/ClineProvider.ts, src/package.json. Proposed `C-REIMPLEMENT` / P2: structural divergence (decomposed webview handlers / ClineProvider); intent prefix "feat"

**`12ea0f888` evidence.** Δ 236 of 243 file(s) · hot: .github/workflows/code-qa.yml, src/eslint.config.mjs. Proposed `C-REIMPLEMENT` / P3: Δ 236 — large overlap; runbook §2 stop condition (Δ>5 outside C-REIMPLEMENT) means inspect by hand; hygiene intent prefix "chore"

**`f8aa881c5` evidence.** Δ 0 of 10 file(s). Proposed `A-CLEAN` / P1: Δ 0 — no overlap with any fork-touched file; intent prefix "perf"

**`a4f774b17` evidence.** Δ 3 of 7 file(s) · hot: pnpm-lock.yaml. Proposed `B-CAREFUL` / P1: Δ 3 — small overlap, cherry-pick then rebrand + gates; intent prefix "perf"

**`debd3c72c` evidence.** Δ 35 of 63 file(s) · hot: src/core/task/Task.ts, src/core/webview/webviewMessageHandler.ts. Proposed `C-REIMPLEMENT` / P2: telemetry hit — the fork purged the telemetry transport; re-implement, never cherry-pick; intent prefix "feat"

**`7ecc66723` evidence.** Δ 27 of 33 file(s) · hot: src/core/webview/ClineProvider.ts, src/core/webview/webviewMessageHandler.ts, src/eslint-suppressions.json. Proposed `C-REIMPLEMENT` / P3: telemetry hit — the fork purged the telemetry transport; re-implement, never cherry-pick; unrecognised intent prefix — defaulting to P3 for human review

**`3ee042d91` evidence.** Δ 2 of 2 file(s). Proposed `B-CAREFUL` / P1: Δ 2 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`d4722af3f` evidence.** Δ 0 of 1 file(s). Proposed `A-CLEAN` / P2: Δ 0 — no overlap with any fork-touched file; intent prefix "feat"

**`69401af2c` evidence.** Δ 11 of 22 file(s) · hot: src/eslint-suppressions.json, src/eslint.config.mjs. Proposed `C-REIMPLEMENT` / P2: Δ 11 — large overlap; runbook §2 stop condition (Δ>5 outside C-REIMPLEMENT) means inspect by hand; intent prefix "feat"

**`a15ba8c8a` evidence.** Δ 0 of 5 file(s). Proposed `A-CLEAN` / P2: Δ 0 — no overlap with any fork-touched file; intent prefix "feat"

**`6bbc7a091` evidence.** Δ 1 of 4 file(s). Proposed `B-CAREFUL` / P2: Δ 1 — small overlap, cherry-pick then rebrand + gates; intent prefix "feat"

**`1c1569558` evidence.** Δ 5 of 5 file(s) · hot: .github/workflows/code-qa.yml. Proposed `B-CAREFUL` / P3: Δ 5 — small overlap, cherry-pick then rebrand + gates; hygiene intent prefix "chore"

**`e943530c8` evidence.** Δ 34 of 77 file(s) · hot: src/core/webview/ClineProvider.ts, src/core/webview/webviewMessageHandler.ts. Proposed `C-REIMPLEMENT` / P2: structural divergence (decomposed webview handlers / ClineProvider); intent prefix "feat"

**`4d1a543c5` evidence.** Δ 2 of 3 file(s) · hot: src/core/task/Task.ts. Proposed `B-CAREFUL` / P1: Δ 2 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`7ec58d4d4` evidence.** Δ 0 of 1 file(s). Proposed `A-CLEAN` / P1: Δ 0 — no overlap with any fork-touched file; intent prefix "perf"

**`457bed3ca` evidence.** Δ 2 of 2 file(s) · hot: src/core/task/Task.ts. Proposed `B-CAREFUL` / P1: Δ 2 — small overlap, cherry-pick then rebrand + gates; intent prefix "perf"

**`bb6cbee59` evidence.** Δ 9 of 33 file(s) · hot: package.json, src/core/webview/ClineProvider.ts. Proposed `C-REIMPLEMENT` / P1: structural divergence (decomposed webview handlers / ClineProvider); intent prefix "fix"

**`5a7f3f81b` evidence.** Δ 8 of 27 file(s) · hot: src/eslint-suppressions.json. Proposed `C-REIMPLEMENT` / P3: Δ 8 — large overlap; runbook §2 stop condition (Δ>5 outside C-REIMPLEMENT) means inspect by hand; hygiene intent prefix "refactor"

**`d2a59a8b2` evidence.** Δ 40 of 40 file(s) · hot: src/core/webview/ClineProvider.ts, src/package.json. Proposed `C-REIMPLEMENT` / P3: structural divergence (decomposed webview handlers / ClineProvider); hygiene intent prefix "chore"

**`0496e3885` evidence.** Δ 3 of 3 file(s) · hot: package.json, pnpm-lock.yaml. Proposed `D-LOCAL` / P1: files are dependency manifests / lockfile — regenerate locally; intent prefix "fix"

**`90290b115` evidence.** Δ 3 of 3 file(s) · hot: package.json, pnpm-lock.yaml, src/package.json. Proposed `D-LOCAL` / P3: files are dependency manifests / lockfile — regenerate locally; hygiene intent prefix "chore"

**`73931fe8b` evidence.** Δ 1 of 1 file(s) · hot: pnpm-lock.yaml. Proposed `D-LOCAL` / P3: files are dependency manifests / lockfile — regenerate locally; hygiene intent prefix "chore"

**`d956405c2` evidence.** Δ 2 of 4 file(s) · hot: pnpm-lock.yaml. Proposed `B-CAREFUL` / P3: Δ 2 — small overlap, cherry-pick then rebrand + gates; hygiene intent prefix "chore"

**`5319fe91f` evidence.** Δ 8 of 17 file(s) · hot: src/core/task/Task.ts, src/eslint-suppressions.json. Proposed `C-REIMPLEMENT` / P3: Δ 8 — large overlap; runbook §2 stop condition (Δ>5 outside C-REIMPLEMENT) means inspect by hand; hygiene intent prefix "refactor"

**`1b9cb7d35` evidence.** Δ 1 of 3 file(s). Proposed `C-REIMPLEMENT` / P1: telemetry hit — the fork purged the telemetry transport; re-implement, never cherry-pick; intent prefix "fix"

**`a0d03a06a` evidence.** Δ 2 of 9 file(s) · hot: .github/workflows/code-qa.yml, src/package.json. Proposed `C-REIMPLEMENT` / P3: telemetry hit — the fork purged the telemetry transport; re-implement, never cherry-pick; hygiene intent prefix "chore"

**`e487cd7b2` evidence.** Δ 0 of 2 file(s). Proposed `A-CLEAN` / P3: Δ 0 — no overlap with any fork-touched file; hygiene intent prefix "test"

**`ba105e65c` evidence.** Δ 2 of 4 file(s) · hot: pnpm-lock.yaml, src/package.json. Proposed `B-CAREFUL` / P1: Δ 2 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`d3d9cd48e` evidence.** Δ 4 of 8 file(s) · hot: src/eslint.config.mjs. Proposed `B-CAREFUL` / P2: Δ 4 — small overlap, cherry-pick then rebrand + gates; intent prefix "feat"

**`332d30fbb` evidence.** Δ 20 of 33 file(s). Proposed `C-REIMPLEMENT` / P2: Δ 20 — large overlap; runbook §2 stop condition (Δ>5 outside C-REIMPLEMENT) means inspect by hand; intent prefix "feat"

**`a71571572` evidence.** Δ 1 of 5 file(s). Proposed `C-REIMPLEMENT` / P2: telemetry hit — the fork purged the telemetry transport; re-implement, never cherry-pick; intent prefix "feat"

**`18861b2e3` evidence.** Δ 14 of 23 file(s) · hot: src/core/webview/webviewMessageHandler.ts. Proposed `C-REIMPLEMENT` / P2: structural divergence (decomposed webview handlers / ClineProvider); intent prefix "feat"

**`8254e11ff` evidence.** Δ 1 of 5 file(s). Proposed `B-CAREFUL` / P1: Δ 1 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`766b906ce` evidence.** Δ 0 of 1 file(s). Proposed `A-CLEAN` / P1: Δ 0 — no overlap with any fork-touched file; intent prefix "fix"

**`53cb5b5e7` evidence.** Δ 3 of 5 file(s) · hot: src/core/task/Task.ts. Proposed `B-CAREFUL` / P3: Δ 3 — small overlap, cherry-pick then rebrand + gates; unrecognised intent prefix — defaulting to P3 for human review

**`631374617` evidence.** Δ 2 of 2 file(s). Proposed `B-CAREFUL` / P3: Δ 2 — small overlap, cherry-pick then rebrand + gates; hygiene intent prefix "chore"

**`efc22ed9f` evidence.** Δ 20 of 20 file(s). Proposed `C-REIMPLEMENT` / P1: Δ 20 — large overlap; runbook §2 stop condition (Δ>5 outside C-REIMPLEMENT) means inspect by hand; intent prefix "fix"

**`8c801752a` evidence.** Δ 0 of 2 file(s). Proposed `A-CLEAN` / P1: Δ 0 — no overlap with any fork-touched file; intent prefix "fix"

**`f98fcf7d8` evidence.** Δ 38 of 112 file(s). Proposed `C-REIMPLEMENT` / P1: Δ 38 — large overlap; runbook §2 stop condition (Δ>5 outside C-REIMPLEMENT) means inspect by hand; intent prefix "fix"

**`5f42a918b` evidence.** Δ 2 of 4 file(s). Proposed `C-REIMPLEMENT` / P2: telemetry hit — the fork purged the telemetry transport; re-implement, never cherry-pick; intent prefix "feat"

**`d76dffa86` evidence.** Δ 32 of 58 file(s) · hot: src/core/webview/ClineProvider.ts. Proposed `C-REIMPLEMENT` / P2: structural divergence (decomposed webview handlers / ClineProvider); intent prefix "feat"

**`cd66dc577` evidence.** Δ 106 of 114 file(s) · hot: .github/workflows/code-qa.yml, package.json. Proposed `C-REIMPLEMENT` / P1: Δ 106 — large overlap; runbook §2 stop condition (Δ>5 outside C-REIMPLEMENT) means inspect by hand; intent prefix "fix"

**`d94017469` evidence.** Δ 8 of 10 file(s) · hot: src/core/webview/ClineProvider.ts. Proposed `C-REIMPLEMENT` / P1: structural divergence (decomposed webview handlers / ClineProvider); intent prefix "fix"

**`601937024` evidence.** Δ 2 of 2 file(s). Proposed `B-CAREFUL` / P2: Δ 2 — small overlap, cherry-pick then rebrand + gates; intent prefix "feat"

**`f2b4d1c0d` evidence.** Δ 2 of 3 file(s). Proposed `B-CAREFUL` / P2: Δ 2 — small overlap, cherry-pick then rebrand + gates; intent prefix "feat"

**`3b06b953a` evidence.** Δ 1 of 3 file(s) · hot: src/eslint-suppressions.json. Proposed `B-CAREFUL` / P1: Δ 1 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`b140824e4` evidence.** Δ 3 of 10 file(s). Proposed `B-CAREFUL` / P1: Δ 3 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`f015dae53` evidence.** Δ 0 of 2 file(s). Proposed `A-CLEAN` / P1: Δ 0 — no overlap with any fork-touched file; intent prefix "fix"

**`77f24d7ae` evidence.** Δ 42 of 44 file(s) · hot: src/core/webview/ClineProvider.ts, src/package.json. Proposed `C-REIMPLEMENT` / P3: structural divergence (decomposed webview handlers / ClineProvider); unrecognised intent prefix — defaulting to P3 for human review

**`d112b7f73` evidence.** Δ 5 of 18 file(s) · hot: src/core/webview/ClineProvider.ts, src/core/webview/webviewMessageHandler.ts. Proposed `C-REIMPLEMENT` / P1: structural divergence (decomposed webview handlers / ClineProvider); intent prefix "fix"

**`0cfed55f4` evidence.** Δ 20 of 31 file(s). Proposed `C-REIMPLEMENT` / P3: Δ 20 — large overlap; runbook §2 stop condition (Δ>5 outside C-REIMPLEMENT) means inspect by hand; unrecognised intent prefix — defaulting to P3 for human review

**`6843b60b8` evidence.** Δ 0 of 5 file(s). Proposed `A-CLEAN` / P3: Δ 0 — no overlap with any fork-touched file; unrecognised intent prefix — defaulting to P3 for human review

**`5e32badca` evidence.** Δ 0 of 14 file(s). Proposed `A-CLEAN` / P0: Δ 0 — no overlap with any fork-touched file; value override on "security" (data loss / security / crash / stall)

**`252d9ce26` evidence.** Δ 0 of 3 file(s). Proposed `A-CLEAN` / P3: Δ 0 — no overlap with any fork-touched file; hygiene intent prefix "test"

**`dc6d1435e` evidence.** Δ 0 of 4 file(s). Proposed `A-CLEAN` / P3: Δ 0 — no overlap with any fork-touched file; hygiene intent prefix "test"

**`7b60351cf` evidence.** Δ 0 of 12 file(s). Proposed `A-CLEAN` / P1: Δ 0 — no overlap with any fork-touched file; intent prefix "fix"

**`3a332bbc1` evidence.** Δ 2 of 6 file(s). Proposed `B-CAREFUL` / P3: Δ 2 — small overlap, cherry-pick then rebrand + gates; unrecognised intent prefix — defaulting to P3 for human review

**`94c26d5b1` evidence.** Δ 0 of 16 file(s). Proposed `A-CLEAN` / P1: Δ 0 — no overlap with any fork-touched file; intent prefix "fix"

**`66b07e0e6` evidence.** Δ 3 of 3 file(s). Proposed `B-CAREFUL` / P1: Δ 3 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`75a93a9d9` evidence.** Δ 4 of 12 file(s) · hot: .github/workflows/code-qa.yml. Proposed `B-CAREFUL` / P3: Δ 4 — small overlap, cherry-pick then rebrand + gates; unrecognised intent prefix — defaulting to P3 for human review

**`32a56f30b` evidence.** Δ 0 of 4 file(s). Proposed `A-CLEAN` / P2: Δ 0 — no overlap with any fork-touched file; intent prefix "feat"

**`94ce66a58` evidence.** Δ 20 of 72 file(s) · hot: package.json, src/core/task/Task.ts, src/core/webview/ClineProvider.ts, src/core/webview/webviewMessageHandler.ts, src/eslint-suppressions.json. Proposed `C-REIMPLEMENT` / P1: structural divergence (decomposed webview handlers / ClineProvider); intent prefix "fix"

**`44cf71272` evidence.** Δ 1 of 5 file(s). Proposed `B-CAREFUL` / P2: Δ 1 — small overlap, cherry-pick then rebrand + gates; intent prefix "feat"

**`e3de60a7c` evidence.** Δ 0 of 2 file(s). Proposed `A-CLEAN` / P3: Δ 0 — no overlap with any fork-touched file; hygiene intent prefix "test"

**`5b9f3e2df` evidence.** Δ 1 of 1 file(s) · hot: src/core/task/Task.ts. Proposed `B-CAREFUL` / P1: Δ 1 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`a462937b6` evidence.** Δ 160 of 199 file(s) · hot: pnpm-lock.yaml. Proposed `C-REIMPLEMENT` / P1: Δ 160 — large overlap; runbook §2 stop condition (Δ>5 outside C-REIMPLEMENT) means inspect by hand; intent prefix "fix"

**`ac6bfaf52` evidence.** Δ 26 of 33 file(s). Proposed `C-REIMPLEMENT` / P3: Δ 26 — large overlap; runbook §2 stop condition (Δ>5 outside C-REIMPLEMENT) means inspect by hand; unrecognised intent prefix — defaulting to P3 for human review

**`2684e1517` evidence.** Δ 1 of 3 file(s). Proposed `E-SKIP` / P4: files touch only upstream-org automation (.github/.coderabbit/CONTRIBUTING); E-SKIP — not applicable to the fork

**`5ba06451e` evidence.** Δ 2 of 4 file(s). Proposed `B-CAREFUL` / P3: Δ 2 — small overlap, cherry-pick then rebrand + gates; hygiene intent prefix "chore"

**`466ade69a` evidence.** Δ 48 of 66 file(s) · hot: src/core/webview/webviewMessageHandler.ts. Proposed `C-REIMPLEMENT` / P3: structural divergence (decomposed webview handlers / ClineProvider); hygiene intent prefix "chore"

**`4dc45fe8c` evidence.** Δ 8 of 33 file(s). Proposed `C-REIMPLEMENT` / P2: Δ 8 — large overlap; runbook §2 stop condition (Δ>5 outside C-REIMPLEMENT) means inspect by hand; intent prefix "feat"

**`f600e93ba` evidence.** Δ 2 of 11 file(s). Proposed `B-CAREFUL` / P2: Δ 2 — small overlap, cherry-pick then rebrand + gates; intent prefix "feat"

**`cd3ec4826` evidence.** Δ 41 of 43 file(s) · hot: src/core/webview/ClineProvider.ts, src/package.json. Proposed `C-REIMPLEMENT` / P3: structural divergence (decomposed webview handlers / ClineProvider); unrecognised intent prefix — defaulting to P3 for human review

**`f948b5ba0` evidence.** Δ 3 of 32 file(s) · hot: src/eslint-suppressions.json. Proposed `B-CAREFUL` / P1: Δ 3 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`cc271bdd9` evidence.** Δ 1 of 10 file(s). Proposed `B-CAREFUL` / P1: Δ 1 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`410e5ad3d` evidence.** Δ 27 of 93 file(s) · hot: src/eslint-suppressions.json. Proposed `C-REIMPLEMENT` / P1: Δ 27 — large overlap; runbook §2 stop condition (Δ>5 outside C-REIMPLEMENT) means inspect by hand; intent prefix "fix"

**`2a082ce5a` evidence.** Δ 1 of 5 file(s). Proposed `C-REIMPLEMENT` / P1: telemetry hit — the fork purged the telemetry transport; re-implement, never cherry-pick; intent prefix "fix"

**`7d8053fef` evidence.** Δ 2 of 13 file(s) · hot: .coderabbit.yaml. Proposed `B-CAREFUL` / P2: Δ 2 — small overlap, cherry-pick then rebrand + gates; intent prefix "feat"

**`5a05ff1af` evidence.** Δ 41 of 42 file(s) · hot: src/core/webview/ClineProvider.ts, src/package.json. Proposed `C-REIMPLEMENT` / P3: structural divergence (decomposed webview handlers / ClineProvider); unrecognised intent prefix — defaulting to P3 for human review

**`bfdf93327` evidence.** Δ 2 of 7 file(s). Proposed `C-REIMPLEMENT` / P1: telemetry hit — the fork purged the telemetry transport; re-implement, never cherry-pick; intent prefix "fix"

**`050c49ef8` evidence.** Δ 3 of 15 file(s) · hot: src/core/task/Task.ts. Proposed `B-CAREFUL` / P1: Δ 3 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**`ebfe57454` evidence.** Δ 0 of 5 file(s). Proposed `A-CLEAN` / P1: Δ 0 — no overlap with any fork-touched file; intent prefix "fix"

**`a6c2a900b` evidence.** Δ 2 of 2 file(s) · hot: pnpm-lock.yaml. Proposed `D-LOCAL` / P3: files are dependency manifests / lockfile — regenerate locally; hygiene intent prefix "chore"

**`fc07f210a` evidence.** Δ 1 of 1 file(s) · hot: pnpm-lock.yaml. Proposed `D-LOCAL` / P3: files are dependency manifests / lockfile — regenerate locally; unrecognised intent prefix — defaulting to P3 for human review

**`1adc986bb` evidence.** Δ 1 of 1 file(s) · hot: pnpm-lock.yaml. Proposed `D-LOCAL` / P3: files are dependency manifests / lockfile — regenerate locally; hygiene intent prefix "chore"

**`65ab2b70d` evidence.** Δ 3 of 3 file(s) · hot: package.json, pnpm-lock.yaml, src/package.json. Proposed `D-LOCAL` / P3: files are dependency manifests / lockfile — regenerate locally; unrecognised intent prefix — defaulting to P3 for human review

**`bdd417cdb` evidence.** Δ 1 of 1 file(s) · hot: pnpm-lock.yaml. Proposed `D-LOCAL` / P3: files are dependency manifests / lockfile — regenerate locally; unrecognised intent prefix — defaulting to P3 for human review

**`d672d7961` evidence.** Δ 5 of 15 file(s). Proposed `B-CAREFUL` / P1: Δ 5 — small overlap, cherry-pick then rebrand + gates; intent prefix "fix"

**Notes.** **C4 — three rows ported, six dependency-blocked (2026-11-25).** Three `A-CLEAN`/Δ 0 rows were ported in one fork commit, `72e3c9442`, each carrying its own `cherry picked from` trailer: `a101c613e`, `b7ab5a83e`, `9cb83c35a`. No conflict was kept, so this batch needs no resolution-record block; the three rows are marked `◐ 72e3c9442`. **Δ is fork-side only**, so it cannot see upstream precedence: six further `A-CLEAN`/Δ 0 rows were _not_ pickable — `2681ccbac`, `ecab51985`, `766b906ce`, `8c801752a`, `94c26d5b1`, `ebfe57454`. The files their patches modify are **created by unsynced upstream predecessors**: the fork side is not merely unchanged, it is absent, so `git cherry-pick` reports modify/delete (`2681ccbac` ← `778ad3e18`; `766b906ce` ← `1b9cb7d35`; `8c801752a` ← `bb6cbee59`; `94c26d5b1` ← `c747c024b`) or a content conflict against an upstream-drifted pre-image (`ecab51985` ← `afdede5b9`, `8d296deef`; `ebfe57454` ← `7186191a6`, `1cbc0f4d6`, `1d78f7499`; `94c26d5b1` additionally ← `7186191a6`, `bb6e254c2`, `58341d882`). Because the fork never had those files, "resolving by intent" would mean porting the unsynced feature — including the `P0` Read+Write allowlist (`c747c024b`) — so the dependency is recorded in `Blocked-by` instead, the six rows stay `☐`, and they must not be picked until their named predecessors land. Their ready-set membership was therefore false, and the derived ready set no longer contains them.

**Notes.** **C6/C7 — sixteen probed, six ported, ten dependency-blocked (2026-11-25).** Every remaining `A-CLEAN`/Δ 0 row in these two batches was probed before picking, in a throwaway worktree and in upstream chronological order, so a row whose prerequisite landed earlier in the probe would still have applied. Five applied cleanly and were ported one commit per theme: `7389d9836` → `de2ec1870` (skills symlinks), `f315cf4ac` → `c318ee46f` (vscode-lm catalog), `07007b431` → `945b9e38f` (dead CSS), `7ec58d4d4` → `34aeaed12` (webview test workers), `7b60351cf` → `971115ca6` (CLI ask-prompt escaping). A sixth, `32a56f30b` (shell dialect in the system prompt), applied textually but failed `pnpm gate:sync` check-types — it reads `executeCommandAvailable` and calls the two-argument `getSystemInfoSection`, both introduced by the unsynced `a0f2e0355` — so its pick (`436d7a416`) was reverted in `715067b63b` and it joins the blocked list below; on
2026-11-26 both the pick and its revert were **dropped from the branch history** (decision D10),
so the pair no longer exists on `sync/sync-23-31-row-security-sweep` and the row stays `☐` with
its `Blocked-by` intact. Eleven did not, for the same Δ-blindness recorded above, in two shapes. **Modify/delete**, because the target file is created upstream and absent in the fork: `13c6f6c5f` (run-state sub-machine, created by `e69c6a6b3`; its architecture doc by `a704002b6`), `51b7f579f` and `a15ba8c8a` (stryker scripts, created by `79cd12f2c`, itself a discarded `E-SKIP` row — so both are permanently unpickable unless that decision changes), `f8aa881c5` (playwright harness files, created by `fec4e1353` and `8f7f48ad5`, the latter also discarded), and `e487cd7b2` (`webview-ui/playwright/themes.ts`, created by `fec4e1353`). **Content conflict** in a shared data file or drifted source: `src/assets/marketplace/mcps.yml` is drifted by each sibling MCP-marketplace row, so `a62c1798c`, `ce596a745`, `3dbd44b8f` and `d4722af3f` form a chain that only unwinds from `667ff5891`; `dcc6bcf49` conflicts on `ProfileValidator` after `a06127157`. `32a56f30b` ← `a0f2e0355`, `3b06b953a` is the eleventh. All eleven record `Blocked-by` and stay `☐`. `a15ba8c8a` was the batch's R5-flagged row (`.github/**`): because it was never picked, no R5 hunk entered the tree and nothing needed dropping.

**Notes.** **SYNC-23 task 6 — D9/D10/D11 dispositions (2026-11-26).** **(1) D10 history surgery.** The `32a56f30b` pick `436d7a416` and its revert `715067b63b` were dropped from `sync/sync-23-31-row-security-sweep`; both register/docs commits after them were preserved (`279cbedc26` → `d157303a75`, `39828287a9` → `2611d4e46e`), and `cd src && npx tsc --noEmit -p .` is green at each replayed tip. The `32a56f30b` row is unchanged: `☐`, still `Blocked-by a0f2e0355, 3b06b953a`. **(2) `a15ba8c8a` → `✖`.** The row is pure upstream-org CI surface — the mutation PR-comment workflow plus the `scripts/stryker-diff*` harness, both created by the discarded `E-SKIP` row `79cd12f2c` — and the fork runs neither. No hunk was taken, so no R5 drop was needed. **(3) `51b7f579f` — D-LOCAL hand-port attempted and impossible, row left `☐`.** Its entire intent is a ten-line flag flip (`vitestRelated: true` / `discoverRelatedTests: false`) inside `scripts/stryker-diff.mjs`, a file the fork does not have: that file is created by the discarded `E-SKIP` row `79cd12f2c`, and `git grep stryker HEAD -- scripts package.json src/package.json` is empty, so there is no host for the change and the fork does not own the mutation-gate concern (`D-LOCAL` does not apply). The intent cannot be separated from the E-SKIP row, so it was reported rather than guessed; the row keeps `Blocked-by 79cd12f2c`. **(4) `f8aa881c5` → `◐ ec8f283d31` — PARTIAL.** The i18n core is picked verbatim (`webview-ui/src/i18n/setup.ts`, `TranslationContext.tsx`, the three new i18n specs, `TranslationContext.spec.tsx` and the `IndexingStatusBadge.spec.tsx` mock line). The playwright harness hunks are omitted: `playwright/AppProviders.tsx`, `playwright/gallery/stories.tsx` and `settings/__tests__/UISettings.visual.fixture.tsx` do not exist in the fork (created by the discarded `8f7f48ad5` / `fec4e1353`), so the `stories.tsx` hunk is blocked by `8f7f48ad5` and the other two by the same unpicked harness. Evidence: 34 tests pass across 8 i18n/webview spec files and webview `tsc --noEmit` is clean. **(5) `1165aebc8` → `◐ 220a5a679f`.** Picked with `-x`; the spec conflict was structural (the fork lacks upstream's intervening Astra cases), resolved by intent with only this commit's 95-line block grafted. 27/27 tests pass. **(6) D11 divergence.** `src/services/skills/SkillsManager.ts` keeps the named-`stringify` import; byte-identity with upstream is deliberately not claimed and the reason is recorded in `docs/upstream-sync/resolutions/SYNC-23.md` (`## Fork-side divergence (declared)`), which also records that `SkillsManager.spec.ts` is now byte-identical to upstream after `de2ec1870b` landed.

**Notes.** **CP4 review dispositions (2026-11-26).** The final adversarial review
([`docs/reviews/2026-11-26-sync23-cp4-red-team.md`](../../docs/reviews/2026-11-26-sync23-cp4-red-team.md))
returned APPROVE WITH CONDITIONS: one BLOCKER — the committed `3.89.5` was already
the published `latest` on Open VSX, so the publish guard would have exited 1 — and
five record items. The blocker is closed by the 3.89.6 pre-release bump in this same
landing. **Committed evidence:** the CP2 and CP4 review reports are committed with
this note (the CP1 report was already tracked in `56e2d236f3`), so the full gate
chain is readable from `master`. **Already recorded, not missing:** the
`f8aa881c5` partial pick is paragraph `(4)` above, and the `1165aebc8`
`✖` → `◐` transition with its withdrawn data-error rationale is paragraph `(5)`;
the review grepped the resolution record only, which is why it reported them
missing. **Corrected — splice attribution:** `ec8f283d31`'s body attributes all
three omitted visual-harness files to `8f7f48ad5`; only
`webview-ui/playwright/gallery/stories.tsx` was created there (`A`), while
`webview-ui/playwright/AppProviders.tsx` and
`webview-ui/src/components/settings/__tests__/UISettings.visual.fixture.tsx` were
created by `fec4e1353` and only modified by `8f7f48ad5`. Both creators are
unpicked, so the omission stands and the row's `Blocked-by fec4e1353, 8f7f48ad5`
is unchanged. **Corrected — dependency arithmetic:** of the 48 open Dependabot
alerts at review time, **34 are closed** by this branch's lockfile and **14
remain**: zod 5 (v4 deferred), i18next 3, katex 2, `@vitest/mocker` 2 (installed
4.1.11, the advisory asks for 4.1.12), minimatch 1 and
`@ai-sdk/provider-utils` 1 (pinned to 4.0.14 by three dependents, so unclosable
without the override D4 forbids). `glob` carries **no** open alert; it stays
override-pinned at 11.1.0. **NITs recorded, deliberately not acted on:** the
guard's concatenated-package-name bypass (`require("gray-" + "matter")`) and its
`src/`-only scan, and the `.prettierignore` exemption for `embedder.ts`, which is
justified in place.

## Recommended execution order

1. **SYNC-1 `A-CLEAN` trio** — ✅ synced (☑) on `master` — merged via PR #345 (merge `6c4e9df5c`): `c6eb8fb57` → `f4287ff4f`,
   `e12a42e7a` → `1f38eb5b1`, `a5f4192bf` → `3c44a7d5a`.
2. **SYNC-5 clean subset** — ✅ synced (☑) on `master` — merged via PR #345 (merge `6c4e9df5c`): `7e85e2793` → `2868dec51`, `db52d7fc7` → `388a75a6d`,
   `5e8fcc846` → `567b94bd9`. Six further rows proved dependency-blocked and moved to **SYNC-13**.
3. **SYNC-13** — re-attempt `500152b78` first (its prerequisite `5e8fcc846` is now synced), then the
   opencode-go chain (`a80b3b3ab` → `7bb14e44e` / `cc9c0afe9`), then `745656a50` (`1165aebc8`
   was picked on 2026-11-26 as `220a5a679f`).
4. **SYNC-2** — async robustness (`P1`), reconciling eslint rather than importing.
5. **SYNC-3 / SYNC-4** — task-history and lifecycle reliability, as two investigations (`P0`/`P1`).
6. **SYNC-1 `c747c024b`** (#1274 allowlists) — security feature, deliberate port.
7. **SYNC-8**, **SYNC-10**, **SYNC-9 local re-implementations** as capacity allows.
8. **SYNC-7** — background enabler; lowers the cost of every subsequent sync.
9. **SYNC-6** — evaluate each theming fix for "already solved by fork" before doing any work.
10. **SYNC-17** — inline terminal & shell-reporting correctness — ✅ synced (☑) on `sync/SYNC-17-inline-terminal-shell`:
    `bac8adcf2` → `e0ccd6931`, `78b74ec1c` → `7758c5c1f`, `ebf4bd2d3` → `c7d039612`.
11. **SYNC-18** — vscode-lm robustness — ✅ synced (☑) on `sync/SYNC-18-vscode-lm-robustness`: `aaa22e167` → `9e23f8be2`.
    `0f75a60bc` deferred (blocked by the unsynced `08d05eb0f`).
