> **[redacted]** Remote-SSH host identifiers in this record were replaced with placeholders so
> this file is safe to serve from the public repo: host A's SSH alias and kernel hostname →
> `<remote-A>`, and host B's public IPv4 address → `<remote-ip>`. Only the identifiers changed —
> measurements, timings, byte counts and conclusions are unaltered.

# Incident Report: `state` payload > 1 MB from `taskHistory` (cap-100 but **not** byte-bounded)

- **Date:** 2026-09-17
- **Status:** **Open** — user-visible `ERROR` popup reproduced; fix delegated (byte-bound the projection).
- **Severity:** Medium (SLI `ERROR` + one-time user notification popup). **No gray-out and no `unresponsive` observed** in this event.
- **Author:** 📈 Deployment Monitor (post-deploy observability pass)
- **Related:** [postmortem 2026-09-09](../postmortems/2026-09-09-webview-grayout-console-warnings.md) (§5a / §6) · [runbook: gray webview §2, §4, §6](../runbooks/gray-webview.md) · [incident 2026-09-15 — `clineMessages` payload](./2026-09-15-clineMessages-state-payload.md) · [EH-unresponsive diagnosis §11](./2026-09-15-extension-host-unresponsive-diagnosis.md)
- **Environment:** VS Codium remote-SSH, Linux x64; **two distinct remote hosts** — A `<remote-A>` (2 vCPU) and B `<remote-ip>` (4 vCPU); Roo+ **3.88.3**.

## 1. Summary (one line)

The **count-bounded (cap 100) but byte-unbounded** `taskHistory` projection reached **1011 KB** on server B, pushing the `state` payload to **1065 KB → `ERROR` + user popup**; the three 3.88 fixes are intact (`clineMessages=0KB`), so this is the **known residual breaching the ERROR threshold**, not a regression.

## 2. Evidence (byte sizes and static field names only)

**Server B — ERROR + popup (the incident):**

```
[webview-metrics] ERROR "state" payload 1065KB > 1MB top[taskHistory=1011KB customModes=56KB clineMessages=0KB] runbook=docs/runbooks/gray-webview.md
[webview-metrics] state_msgs=2 p50=1065KB p99=1065KB max=1065KB
```

User-visible notification (verbatim, no content):

> Roo+ sent a "state" message over 1 MB (1065KB: taskHistory=1011KB customModes=56KB clineMessages=0KB) to the webview. The panel may turn gray or stop responding. Runbook: docs/runbooks/gray-webview.md (immediate mitigation: "Developer: Reload Window").

**Server A — same shape, still below ERROR (near-miss):**

```
[webview-metrics] WARN "state" payload 701KB > 256KB top[taskHistory=625KB customModes=73KB clineMessages=0KB]
[webview-metrics] state_msgs=4 p50=402KB p99=701KB max=701KB
[webview-metrics] WARN "state" payload 709KB > 256KB top[taskHistory=625KB customModes=73KB clineMessages=0KB]
[webview-metrics] state_msgs=6 p50=402KB p99=709KB max=709KB
```

| Host | `taskHistory` | `customModes` | `clineMessages` | total        | SLI               |
| ---- | ------------- | ------------- | --------------- | ------------ | ----------------- |
| A    | `625 KB`      | `73 KB`       | **`0 KB`**      | `701–709 KB` | WARN (near-miss)  |
| B    | `1011 KB`     | `56 KB`       | **`0 KB`**      | `1065 KB`    | **ERROR + popup** |

**Host health during the event — both hosts healthy, no `unresponsive` line on either:**

- A `[host-health]`: `elu_ms p99=13/12 max=60/89`, `jitter_ms max=8/5/1`, `cpu_pct=7–9`, `state_serialize_ms max=10/6`, `heap_mb=167–192`, `rss_mb=507–510`, `ext_mb=18–56` — far below the §8.2 WARN/ERROR thresholds.
- B emitted **no `[host-health]`** lines (flag not set on B's host) — see §8 gap.
- No `INFO Extension host (Remote) is unresponsive.` on either host.

## 3. Root cause (code)

[`boundTaskHistoryForWebview()`](../../src/core/services/TaskHistoryService.ts:41) bounds the array by **count only** — `.filter(ts && task).sort(newest-first).slice(0, 100)` with `MAX_TASK_HISTORY_SHIPPED_TO_WEBVIEW = 100` ([`:28`](../../src/core/services/TaskHistoryService.ts:28)). There is **no byte budget**. It is applied at [`ClineProvider#getStateToPostToWebview()`](../../src/core/webview/ClineProvider.ts:2767) (`taskHistory: includeTaskHistory ? boundTaskHistoryForWebview(this.taskHistoryStore.getAll()) : []`) — i.e. on **every** `state` push, not only when the History panel is visible.

Each projected entry is a full [`HistoryItem`](../../packages/types/src/history.ts:7) (`id, rootTaskId, parentTaskId, number, ts, task, tokensIn, tokensOut, cacheWrites, cacheReads, totalCost, size, workspace, mode, apiConfigName, status, delegatedToId, childIds[], awaitingChildId, completedByChildId, completionResultSummary`). On a history-heavy install the entries are large (the `task` description and/or `completionResultSummary` dominate), so **100 entries ≈ 1 MB** (B: 1011 KB / 100 ≈ **~10 KB/entry**).

Contrast: `clineMessages` is bounded **both** by count **and** bytes ([`boundClineMessagesForWebview()`](../../src/core/webview/clineMessagesForWebview.ts:130), ≤ 200 rows **and** ≤ 128 KB). `taskHistory` never got the byte half of that contract. This is the **§5a / 3.88.1 residual** finally crossing 1 MB.

> **Not a regression.** `clineMessages=0KB` (P0 bound live), `customModes` bounded (56–73 KB), `state_serialize_ms` small (≤10 ms → P1 probe guard working). Nothing in the 3.88 payload fixes regressed.

## 4. Impact and blast radius

- **Frequency, not just size:** because `taskHistory` rides **every** push, the ~1 MB payload is re-serialized and structured-cloned on **each** `state` message. A's window shows `p50 = 402 KB` across 4–6 pushes — i.e. **most pushes are > 256 KB**, and the SLI emits only **one** WARN per 60 s window (the `warnEmittedThisWindow` guard), so the WARN **count understates** the true rate. `p50` is the honest signal.
- **Renderer risk:** repeated multi-hundred-KB → 1 MB clones over remote-SSH IPC are the original 3.88.0 gray-out mechanism. **No gray-out was reported this time** — the popup is detection working — but the safety margin is gone.
- **Data safety:** unaffected; per-task files under `globalStorage/tasks/…` remain the source of truth.

## 5. Immediate mitigations (operator / user)

1. `Developer: Reload Window` — recovers a wedged renderer (as the popup states).
2. The popup fires at most once per session; safe to dismiss.
3. Nothing to purge — this is the **projection**, not the Memento mirror (that fix holds).

## 6. Recommended fix (owner: **code mode**)

**Primary — byte-bound `taskHistory`, mirroring `clineMessages`:**

1. Replace the count-only cap with a **newest-first, byte-budgeted** projection, e.g. `MAX_TASK_HISTORY_BYTES_SHIPPED_TO_WEBVIEW ≈ 128 KB` (≈ 2× headroom under the 256 KB WARN), always keeping at least a small floor of rows (e.g. 20) so the panel is never empty.
2. Size each entry with the **existing cheap estimator** [`estimateFieldBytes()`](../../src/core/webview/webviewPayloadMetrics.ts:169) — do **not** call `JSON.stringify` per entry, or the bound re-introduces the P1 cost it was written to remove.
3. Add a `bounded: true` marker + total count so the History panel can lazily page older entries (same lazy-fetch pattern as `getOlderClineMessages`), since the full store stays file-backed.

**Secondary — trim the per-entry projection (cheap, independent win):** the History panel needs only a small subset (`id, ts, task`, tokens, `totalCost`, `status`, `workspace`/`mode`). Dropping the delegation/plumbing fields (`rootTaskId`, `parentTaskId`, `delegatedToId`, `childIds[]`, `awaitingChildId`, `completedByChildId`, `completionResultSummary`, `apiConfigName`) from the **state push** (kept in the store) can halve each entry without touching persistence.

**Detection (incident §8 row 3, already listed):** add a **WARN-level, log-only** band between 256 KB and 1 MB and/or make the > 1 MB popup **notify-first** (non-blocking), so the user-visibility threshold and the byte reality stay aligned.

**Docs (owner: docs):** reconcile [runbook §2](../runbooks/gray-webview.md:36) and the §6 "< 200 KB / zero WARN" acceptance with reality — either implement the byte bound (preferred) or state that the cap-100 `taskHistory` window is a known limit.

## 7. Prioritized actions

| #   | Action                                                                                            | Owner         | Why now                                                      |
| --- | ------------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------ |
| 1   | Byte-bound `taskHistory` (newest-first, ≤ ~128 KB, cheap estimator, `bounded` marker + lazy page) | code mode     | Removes the ≥ 1 MB payload; restores §6 acceptance           |
| 2   | Trim per-entry projection (drop delegation/plumbing fields from the push)                         | code mode     | Cheap, independent, compounds with #1                        |
| 3   | WARN-level log-only band / notify-first popup                                                     | observability | Stops a user popup for a sub-ERROR near-miss                 |
| 4   | Reconcile runbook §2 + §6 acceptance text                                                         | docs          | Removes the "taskHistory large = regression" mis-attribution |
| 5   | Enable `ROO_HOST_HEALTH_DEBUG=1` on **every** watched host (B has none)                           | observability | B's next event would be unattributable (see §8)              |

## 8. Detection gaps

- **Multi-host telemetry (new):** server B produced **no `[host-health]`** lines — the (b) half needed to attribute a future host event is missing on B. Only `[webview-metrics]` covered B here.
- **Capture staleness (G2, recurring):** the live `watch-3883-s4` window predated the harness watchdog and went stale when its target exited (`12:08:51Z`); the fix is in the working tree ([`scripts/host-health-capture.sh`](../../scripts/host-health-capture.sh:1), [EH diagnosis §11](./2026-09-15-extension-host-unresponsive-diagnosis.md)) but not in the running instance. Re-arm for the new host.
- **WARN frequency under-reporting:** the once-per-window WARN dedup hides that most pushes are over threshold; recommend surfacing `p50` vs the 256 KB threshold in the summary line's headroom.

## 9. Open question (not a payload issue)

Server B's console carries `indexing …<remote-A>/root/roo-plus` lines although B's `remoteAuthority` is `<remote-ip>`. Worth confirming whether the two windows share a workspace/extension host or the dev-console paste mixed lines. **Not** a payload/SLI matter — recorded for completeness only.

## Privacy note

All figures are byte counts, millisecond/percentage measurements, and static `ExtensionState` field names (`taskHistory`, `customModes`, `clineMessages`). No message content, task text, prompts, file paths, task IDs, or provider config values are reproduced. All `[webview-metrics]` / `[host-health]` data is local-only (see [runbook Privacy note](../runbooks/gray-webview.md:81)).
