# Post-Deployment Review: v3.88.8 fixed the gray webview but collapsed visible history (per-workspace)

- **Date:** 2026-09-23
- **Status:** **Open** — design reviewed against committed source; fix to be implemented on the `3.88` line.
- **Severity:** Medium (functionality loss: History/"Recent Tasks" unusable for multi-workspace installs; user reverted to `3.88.7`, which restores history but **re-introduces the gray-out**).
- **Author:** 📈 Deployment Monitor (post-deploy review pass)
- **Related:** [`plans/roo-plus-history-per-workspace.md`](plans/roo-plus-history-per-workspace.md:1) (root-cause + Option A spec) · [postmortem 2026-09-09](../postmortems/2026-09-09-webview-grayout-console-warnings.md) · [incident 2026-09-17 (taskHistory payload)](2026-09-17-taskHistory-state-payload.md) · [incident 2026-09-18 (gray webview)](2026-09-18-gray-webview.md) · [runbook: gray webview](../runbooks/gray-webview.md)
- **Environment:** VS Codium remote-SSH; Roo+ pre-release `3.88.8` (regressing build), rollback `3.88.7`; multi-workspace install (`duke-io` 213 sessions, `lead-genie` 241, `aef-site` 38; 492 total).

## 1. Summary (one line)

`3.88.8` correctly stopped the gray webview by byte-bounding the `taskHistory` payload, but the bound is computed over **all workspaces** and the webview filters by workspace **after** truncation, so the `Workspace: Current` panel shows ~1 row; "Load older tasks" is unreliable because it pages the **global** pool from a **non-advancing** anchor and a background push can still replace the list.

## 2. Reported symptoms (verbatim intent)

1. `3.88.8` "does work well" for the gray-out — the panel no longer grays.
2. It "significantly reduces the 'recent tasks' history" — needed to coordinate complex tasks.
3. "Load previous tasks" was "either broken, or just so slow that seemed broken".
4. Rolling back to `3.88.7` restores history but the **gray-out persists**.

All four are explained by the mechanism in §4/§5; none require new data.

## 3. Review of prior fixes (release timeline)

| Version      | Payload fix that shipped                                                                                                                                           | Verified outcome                                 | Residual                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ | -------------------------------------------------------------------------- |
| `3.88.0`     | none (branch fixes **absent** in the published build)                                                                                                              | 3.5 MB Memento `taskHistory` blob live; gray-out | full `taskHistory` on every `state` push                                   |
| `3.88.1`     | `taskHistory` bounded by **COUNT** (100); legacy Memento key cleared on startup                                                                                    | large-state warning gone; no re-fill             | 100 rows × ~10 KB ≈ 649 KB; `customModes` unmasked (1410 KB ERROR)         |
| `3.88.2`     | `customModes` bounded projection (~71 KB)                                                                                                                          | catalog no longer dominant                       | `clineMessages` unmasked (1045 KB ERROR)                                   |
| `3.88.3`     | `clineMessages` **tail-anchored + byte-bounded** (128 KB) + lazy paging; cheap est. probe; host-health metrics                                                     | payload class closed for `clineMessages`         | **`taskHistory` still byte-unbounded** (cap 100)                           |
| `3.88.7`     | (no webview/host diff vs `3.88.3`)                                                                                                                                 | —                                                | `taskHistory` 1035–1042 KB → **gray webview** (incident 2026-09-18)        |
| **`3.88.8`** | `taskHistory` **count+byte bounded** (100 rows, **32 KB**, floor 3, ≤8 ancestors) + `getOlderTaskHistory` lazy paging + `bounded`/`total`/`pagingAnchorTs` markers | **gray webview fixed** (payload bounded)         | **history collapsed to ~1 row/workspace; paging unreliable** → this review |

Net: `3.88.8` is the **first** build that bounds `taskHistory` bytes — and that is exactly why it both fixes the gray-out and regresses the visible history: the same window is applied globally.

## 4. Verified current-source state (what is committed now)

Confirmed by reading the source in this workspace; the committed projection matches the `3.88.8` bundle constants (`maxItems=100`, `maxBytes=32*1024`, `minRows=3`, `maxAncestorRows=8`).

| #   | Behavior                                                                                         | Verdict | Anchor                                                                                                                                                                                                                             |
| --- | ------------------------------------------------------------------------------------------------ | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Count+byte window builder exists (newest-first, floor, ancestor re-attachment, `pagingAnchorTs`) | ✅      | [`projectTaskHistoryForWebview()`](src/core/services/TaskHistoryService.ts:163)                                                                                                                                                    |
| 2   | Window computed over **all** workspaces (not scoped)                                             | ❌      | [`ClineProvider.getStateToPostToWebview()`](src/core/webview/ClineProvider.ts:2808) and [`getState()`](src/core/webview/ClineProvider.ts:2805) call `projectTaskHistoryForWebview(this.taskHistoryStore.getAll())`                 |
| 3   | Paging selects from the **global** store (no scope)                                              | ❌      | [`misc.ts` `getOlderTaskHistory`](src/core/webview/handlers/misc.ts:556) → [`selectOlderTaskHistory()`](src/core/services/TaskHistoryService.ts:285) over `taskHistoryStore.getAll()`                                              |
| 4   | Paging anchor **never advances** across clicks                                                   | ❌      | [`HistoryView.loadOlderTasks()`](webview-ui/src/components/history/HistoryView.tsx:57) uses `taskHistoryPagingAnchorTs` (a `state` field) that the `olderTaskHistory` merge never updates; no `nextAnchorTs` field exists anywhere |
| 5   | Webview filters by workspace **after** truncation                                                | ❌      | [`useTaskSearch()`](webview-ui/src/components/history/useTaskSearch.ts:27) — `if (!showAllWorkspaces) tasks = tasks.filter(item => item.workspace === cwd)`                                                                        |
| 6   | Background `taskHistoryUpdated` **replaces** the list (second clobber path)                      | ❌      | [`ExtensionStateContext.tsx` reducer](webview-ui/src/context/ExtensionStateContext.tsx:546) sets `taskHistory: message.taskHistory!` (no merge)                                                                                    |
| 7   | `state`-push merge preserves paged-in rows                                                       | ✅      | [`mergeTaskHistoryState()`](webview-ui/src/utils/mergeTaskHistoryState.ts:51) (routed at [`ExtensionStateContext.tsx:188`](webview-ui/src/context/ExtensionStateContext.tsx:188))                                                  |
| 8   | Store already exposes per-workspace reads                                                        | ✅      | [`TaskHistoryStore.getByWorkspace()`](src/core/task-persistence/TaskHistoryStore.ts:216)                                                                                                                                           |
| 9   | Scope-aware fetch / scope marker absent                                                          | ❌      | no `taskHistoryScope`, `getTaskHistory`, or `nextAnchorTs` in `packages/types` or `src`                                                                                                                                            |

**Reconciliation with the plan:** the plan was derived from the minified `3.88.8` bundle. Two of its claims are now only partly true in source — (a) the `state`-push path **does** merge (finding 7), so the "replace" problem is confined to the `taskHistoryUpdated` message (finding 6); (b) the "button does nothing" root cause in source is the **stale `pagingAnchorTs`** (finding 4), not a literal missing advance statement. The plan's central root cause — **global window + client post-filter** — is confirmed exactly (findings 2, 5).

## 5. Why the regression happens (mechanism)

1. **Truncate-then-filter.** The host admits newest-first until 32 KB across **all** workspaces. On a 3-workspace install that is ~7 rows total (plan §3 repro: `Counter{lead-genie:4, aef-site:2, duke-io:1}`). The webview then keeps only `workspace === cwd`, so `duke-io` shows **1** row. The `minRows=3` floor is **global**, so it does not protect a per-workspace view.
2. **Global paging.** "Load older tasks" requests the next global page; most of what returns is filtered out client-side, so each click yields few (often zero) new _visible_ rows.
3. **Anchor never advances.** The view re-requests from the same `taskHistoryPagingAnchorTs`; the merge appends but does not move the cursor, so repeated clicks return the same global page → "broken or so slow it seemed broken".
4. **Background replace.** `broadcastTaskHistoryUpdate()` still ships a **global, bounded** window via `taskHistoryUpdated`, whose reducer **replaces** the list — discarding paged-in rows and re-imposing the global scope mid-session.

Rolling back to `3.88.7` removes the 32 KB bound (finding 1 not in that build), so 100 rows × ~10 KB ≈ 1 MB rides every push → the **gray-out returns**. There is no configuration that gives both; the bound and the scope must be fixed **together**.

## 6. Recommended fix (Option A, refined against committed source)

**Principle:** move workspace scope from a _client post-filter_ to a _host window parameter_, make paging **scope-aware** and **anchor-advancing**, and stop the `taskHistoryUpdated` replace. Keep the byte bound **per scope** so the gray-out fix is preserved.

### 6.1 Host (`src`)

1. **Scope the window.** Add a scope-aware builder that reuses the existing projection and the existing store read:
    ```ts
    // scope: "current" | "all"; cwd = provider workspace
    function buildTaskHistoryWindow(scope, beforeTs?) {
    	const all = scope === "all" ? store.getAll() : store.getByWorkspace(cwd)
    	const pool = beforeTs === undefined ? all : all.filter((x) => x.ts < beforeTs)
    	return projectTaskHistoryForWebview(pool) // same 32 KB / floor / ancestors
    }
    ```
    Use it in [`getStateToPostToWebview()`](src/core/webview/ClineProvider.ts:2808) and [`getState()`](src/core/webview/ClineProvider.ts:2805). Default scope **`current`** (the panel defaults to `Workspace: Current`, [`useTaskSearch.ts:14`](webview-ui/src/components/history/useTaskSearch.ts:14)). Add an additive `taskHistoryScope` field so the client knows what it holds.
2. **Scope + advance paging.** Extend `getOlderTaskHistoryMessageSchema` ([`packages/types/src/webview-messages/misc.ts:159`](packages/types/src/webview-messages/misc.ts:159)) with `scope?: "current" | "all"` and have the [handler](src/core/webview/handlers/misc.ts:556) select from `getByWorkspace(cwd)` (or `getAll()`), replying with the existing `olderTaskHistoryHasMore` **plus** a new `olderTaskHistoryNextAnchorTs = page.at(-1)?.ts`. Keep `selectOlderTaskHistory()`'s count+byte budget so no page can itself trip the SLI.
3. **Stop the replace.** In [`broadcastTaskHistoryUpdate()`](src/core/services/TaskHistoryService.ts:372) either (a) emit a single-row `taskHistoryItemUpdated` instead of a full list, or (b) include `scope`/`anchorTs` so the client can merge via `mergeTaskHistoryState()`. Preferred: (a) — pushes become O(1) and the list is driven by `state` + pages.
4. **Backward compatibility.** Keep `taskHistory`/`taskHistoryBounded`/`taskHistoryTotal`/`taskHistoryPagingAnchorTs` as the **current**-scope fields; add `taskHistoryScope` / `olderTaskHistoryNextAnchorTs` additively.

### 6.2 Webview (`webview-ui`)

1. **Remove the client post-filter** in [`useTaskSearch.ts:29`](webview-ui/src/components/history/useTaskSearch.ts:29); the host now returns the correct scope.
2. **Repurpose `showAllWorkspaces` as a scope selector**: on change, post `{ type: "getTaskHistory", scope }` (or reset via `getOlderTaskHistory` with `scope` and no `beforeTs`) and **reset** the list to page 1; clear the stored anchor.
3. **Advance the cursor.** In [`HistoryView.loadOlderTasks()`](webview-ui/src/components/history/HistoryView.tsx:57), page from `olderTaskHistoryNextAnchorTs` (tracked in state from the last page response) rather than the frozen `taskHistoryPagingAnchorTs`; hide the affordance when `olderTaskHistoryHasMore === false`.
4. **Fix the `taskHistoryUpdated` reducer** ([`ExtensionStateContext.tsx:546`](webview-ui/src/context/ExtensionStateContext.tsx:546)) to route through `mergeTaskHistoryState()` (or drop the list from that message entirely, per 6.1.3).

### 6.3 Explicitly **not** recommended

- Raising the global byte budget (plan Option D) — restores the gray-out and still dilutes across workspaces.
- Defaulting `showAllWorkspaces = true` (Option C) — mixes workspaces; not "per workspace".
- Downgrading (Option E) — re-introduces the gray-out.

## 7. Observability additions (monitoring-owned)

- **Payload SLI must stay green.** Re-assert the composite budget: the [`statePayloadBudget.spec.ts`](src/core/webview/__tests__/statePayloadBudget.spec.ts) invariant (composite `< 256 KB` WARN with every bounded field maxed) is what protects the gray-out fix; the per-scope window must not weaken it.
- **New history-paging SLI (log-only).** Extend `[webview-metrics]` with a per-window line for history paging, e.g. `history_paging scope=current pages=N rows=K bytes=B hasMore=0|1`, no content. This makes "paging is fast/working" measurable rather than anecdotal — directly answering the user's "seemed broken" report.
- **Scope tag on the payload metric** so a `taskHistory` WARN can be attributed to `current` vs `all`.
- **Post-fix verification (runbook §6 extension).** On a many-session workspace, `Workspace: Current` shows ≥ `minRows` rows immediately, pages monotonically to `taskHistoryTotal`, the button hides at the tail, `Current ↔ All` resets correctly, and no `WARN`/`ERROR` co-occurs with paging.

## 8. Acceptance criteria

**Unit (pure functions):**

1. Fixture `duke-io=213, lead-genie=241, aef-site=38`: `buildTaskHistoryWindow("current")` returns **only** `duke-io` rows and `total === 213`.
2. Paging loop over `("current", nextAnchorTs)` enumerates **all 213** ids, strictly decreasing `ts`, no duplicates/gaps, each page within the count+byte budget.
3. `("all")` window `total === 492`; paging enumerates all 492.
4. Tree integrity: a split parent/child set re-attaches the ancestor; `pagingAnchorTs` is the last **contiguous** row.
5. Every page's serialized `items` ≤ 32 KB, or contains only `minRows` rows (whichever binds first).

**Integration (webview):**

6. `Workspace: Current` on `duke-io` shows ≥ `minRows` and grows to 213 across clicks; button hides at `hasMore === false`.
7. `Current ↔ All` resets to the correct page 1 and correct `total`.
8. A background `taskHistoryUpdated` push during paging does **not** reduce the visible row count.
9. Search/sort/multi-select/delete/export unaffected.

**Payload / regression guard:**

10. `state` payloads stay **< 256 KB** (composite invariant); no gray-out.
11. `_index.json` and every `history_item.json` byte-identical before/after (read-only).

## 9. Risk / rollback

- **Payload regression** → would re-open the gray-out (issue #64). Mitigation: the byte budget is applied **per scope**; the composite budget test is the guard.
- **Schema drift** between host and webview — they ship in the same VSIX, so they must land together.
- **Anchor errors** can duplicate/skip rows — covered by AC-2.
- **Rollback:** additive schema; reverting the VSIX restores prior behavior with no data migration (the store is untouched).

## 10. Delegation

Implementation (§6 + §8) was delegated to **code mode** via `new_task`. Do not hand-edit `dist/`; fix in source. Status below.

## 11. Fix status (2026-09-23) — implemented in source, independently verified

**Implemented** (source only; `dist/`, `tasks/`, `_index.json`, `.changeset`, `CHANGELOG.md` untouched):

- Host: `TaskHistoryScope`, `resolveTaskHistoryScope()`, `buildTaskHistoryWindow()`, `selectScopedOlderTaskHistory()` in [`TaskHistoryService.ts`](src/core/services/TaskHistoryService.ts:312) — the existing 32 KB/floor/tree-closure projection is reused but computed over the scope's pool (`getByWorkspace(cwd)` for `current`, `getAll()` for `all`).
- Window applied at [`getStateToPostToWebview()`](src/core/webview/ClineProvider.ts:2603) and [`getState()`](src/core/webview/ClineProvider.ts:2814) with scope `current`; `taskHistoryScope` emitted; `broadcastTaskHistoryUpdate()` now ships the scoped window **with markers** instead of a bare global list.
- Handler: [`getOlderTaskHistory`](src/core/webview/handlers/misc.ts:563) is scope-aware and returns `olderTaskHistoryNextAnchorTs` (the last **contiguous** row) + `olderTaskHistoryScope`; `beforeTs` omitted ⇒ first page of the scope (the reset fetch).
- Types: additive `taskHistoryScope`, `olderTaskHistoryNextAnchorTs`, `olderTaskHistoryScope`, and `getOlderTaskHistory.scope`.
- Webview: post-truncation workspace filter **removed** ([`useTaskSearch.ts`](webview-ui/src/components/history/useTaskSearch.ts:21)); `showAllWorkspaces` is now a scope switch; [`HistoryView`](webview-ui/src/components/history/HistoryView.tsx:47) pages from the advancing cursor; [`taskHistoryUpdated`](webview-ui/src/context/ExtensionStateContext.tsx:578) now **merges** (no replace), scope-aware.
- Observability: `[webview-metrics]` WARN/ERROR lines carry `scope=current|all`; new log-only `[webview-metrics] history_paging scope=… pages=… rows=… bytes=… hasMore=0|1` ([`webviewPayloadMetrics.ts`](src/core/webview/webviewPayloadMetrics.ts:277)).

**Independent verification (re-run by this reviewer, not taken on report):**

- Host: `cd src && npx vitest run core/services/__tests__/TaskHistoryService.spec.ts core/webview/__tests__/statePayloadBudget.spec.ts core/webview/__tests__/ClineProvider.taskHistory.spec.ts core/webview/__tests__/webviewPayloadMetrics.spec.ts` → **88 passed** — the composite `< 256 KB` invariant holds, so the **gray-out guard is intact**.
- Webview: `cd webview-ui && npx vitest run src/context/__tests__/ExtensionStateContext.spec.tsx src/components/history/__tests__/HistoryView.spec.tsx src/components/history/__tests__/useTaskSearch.spec.tsx src/utils/__tests__/mergeTaskHistoryState.spec.ts` → **70 passed**.

**Accepted deviations from §6:**

1. `olderTaskHistoryNextAnchorTs` = the projection's `pagingAnchorTs` (last contiguous row), not `page.at(-1).ts` — required for AC-2 once ancestor re-attachment is in play.
2. A scope switch reuses `getOlderTaskHistory` with `scope` and no `beforeTs` (first page) instead of a new `getTaskHistory` message — the alternative allowed by plan §6.2.2.
3. Requirement 3 shipped as option (b) — scope+anchor markers with a client merge — rather than single-row `taskHistoryItemUpdated`, because `broadcastTaskHistoryUpdate` takes an array. The reducer no longer assigns a list verbatim.
4. `ExtensionState` gained webview-maintained `taskHistoryNextAnchorTs` / `taskHistoryHasMore`; the host sets only `taskHistoryScope`.

**Residual / monitoring follow-ups (low severity):**

- A scope switch to a scope whose first page is **empty** does not reset the list: the `olderTaskHistory` reducer short-circuits on `!message.olderTaskHistory?.length` ([`ExtensionStateContext.tsx`](webview-ui/src/context/ExtensionStateContext.tsx:556)), so a zero-task scope leaves the previous scope's rows/marker visible. Cosmetic (only a workspace with no prior tasks). Suggested fix: honour a scope-changing empty page (reset + set the scope marker).
- `boundTaskHistoryForWebview` is now unused by source (retained, exported and tested); a later cleanup can remove it.
- Post-release: confirm on the next pre-release patch that `[webview-metrics] history_paging` shows `pages` advancing and `hasMore=0` at the tail, with no `WARN`/`ERROR` co-occurring with paging; run the runbook §6a checklist.

## Privacy note

All figures are byte counts, row counts, and static `ExtensionState` field names. No message content, task text, prompts, file paths, or task IDs are reproduced.
