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
| Upstream tip                             | `c6e6ee398` (2026-10-01, "fix(webview): batch repeated tool preambles (#1658)")                                                                                                                                                                                      |
| Fork tip                                 | `77a670196` (2026-09-15, PR #338 merge)                                                                                                                                                                                                                              |
| Pending upstream commits                 | **156**                                                                                                                                                                                                                                                              |
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
| `A-CLEAN`       | 25 (21 are `A-CLEAN` ∧ P0–P2) |
| `B-CAREFUL`     | 51                            |
| `C-REIMPLEMENT` | 33                            |
| `D-LOCAL`       | 15                            |
| `E-SKIP`        | 31                            |
| `X-REJECT`      | 1                             |
| **Total**       | **156**                       |

| Priority | Count |
| -------- | ----- |
| `P0`     | 6     |
| `P1`     | 57    |
| `P2`     | 18    |
| `P3`     | 38    |
| `P4`     | 37    |

**Read this as:** the fork is not "156 commits behind" — the backlog is the
`Pending upstream commits` count above, and what is _pickable today_ is the
**derived ready set**, which `--verify` computes (`A-CLEAN` ∧ Δ 0 ∧ `Blocked-by` = ∅
∧ open). This prose pins no ready-set number on purpose: it is a predicate over the
rows, not a stored fact, so a pinned literal would only rot. 33 rows are
`C-REIMPLEMENT` — deliberate re-implementation because of architecture the fork
changed — and 46 are either owned locally or permanently out of scope (15 `D-LOCAL`

- 31 `E-SKIP`). (The 2026-09-24 ladder enforcement moved four `A-CLEAN` rows with
  Δ > 0 to `B-CAREFUL`; the 2026-09-24, 2026-09-25 and 2026-10-01 guarded refreshes
  folded in 24, 2 and 28 upstream commits respectively — see the manual's §9
  changelog.)

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

| SHA         | Date       | Subject                                                                     | Class       | Pri | Δ   | Status                                            | Blocked-by               | Resolved:  | Version | Exception |
| ----------- | ---------- | --------------------------------------------------------------------------- | ----------- | --- | --- | ------------------------------------------------- | ------------------------ | ---------- | ------- | --------- |
| `a80b3b3ab` | 2026-08-30 | [Fix] Opencode Go routes gpt-5.6-luna through /v1/responses (#1443)         | `A-CLEAN`   | P1  | 0   | ☑ f1edfd9ef                                       | 6ad8a6e58                | 2026-10-01 | 3.88.12 | —         |
| `7bb14e44e` | 2026-09-04 | fix(opencode-go): send conversation session header (#1512)                  | `A-CLEAN`   | P1  | 0   | ☑ c40ddb877                                       | `a80b3b3ab`              | 2026-10-01 | 3.88.12 | —         |
| `1165aebc8` | 2026-09-11 | fix(nanogpt): preserve optional tool parameters (#1590)                     | `A-CLEAN`   | P1  | 0   | ✖ predecessor 1ad8f528d is X-REJECT — unreachable | —                        | —          | —       | —         |
| `500152b78` | 2026-09-16 | [Fix] DeepSeek Flash cannot read attached images (#1618)                    | `A-CLEAN`   | P1  | 0   | ☐                                                 | `c4574ffef`, `d5f779575` | —          | —       | —         |
| `745656a50` | 2026-09-12 | fix(settings): preserve configured LiteLLM model ID in model picker (#1368) | `B-CAREFUL` | P1  | 2   | ☐                                                 | —                        | —          | —       | —         |
| `cc9c0afe9` | 2026-09-10 | [Fix] OpenCode Go context meter shows incorrect limits (#1428)              | `A-CLEAN`   | P2  | 0   | ☑ 3fdeebd27                                       | `a80b3b3ab`              | 2026-10-01 | 3.88.12 | —         |

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
10. **SYNC-17** — inline terminal & shell-reporting correctness — ✅ synced (☑) on `sync/SYNC-17-inline-terminal-shell`:
    `bac8adcf2` → `e0ccd6931`, `78b74ec1c` → `7758c5c1f`, `ebf4bd2d3` → `c7d039612`.
11. **SYNC-18** — vscode-lm robustness — ✅ synced (☑) on `sync/SYNC-18-vscode-lm-robustness`: `aaa22e167` → `9e23f8be2`.
    `0f75a60bc` deferred (blocked by the unsynced `08d05eb0f`).
