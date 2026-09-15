# Incident Report: `state` payload > 1 MB after v3.88.2 (unbounded `clineMessages`)

- **Date:** 2026-09-15
- **Status:** Fix landed in code (bounded projection + lazy-fetch, see §7a) — pending release on the `3.88` line
- **Severity:** Medium (SLI ERROR + user notification; **no gray-out observed** in this event)
- **Author:** 📈 Deployment Monitor (post-deploy observability pass)
- **Related:** [Postmortem 2026-09-09 — webview gray-out](../postmortems/2026-09-09-webview-grayout-console-warnings.md) · [Runbook: gray webview](../runbooks/gray-webview.md) · issue #64 (parts A/C)
- **Environment observed:** VS Codium, Linux x64, remote-SSH workspace; Roo+ **3.88.2** on the `3.88` line.

## 1. Deployment context

| Field        | Value                                                                                                                       |
| ------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Version      | `3.88.2` (`61279b004 chore: prepare v3.88.2 pre-release`)                                                                   |
| Change scope | Two payload/storage fixes: `3feae426a` (taskHistory bounded) and `1b55142e0` (customModes bounded + Memento mirror removed) |
| Owner        | xavier-arosemena                                                                                                            |
| Rollout      | Open VSX pre-release (`xavier-arosemena.roo-plus`), manual VS Codium install                                                |
| Watch window | First session after upgrade                                                                                                 |

**Verdict on scope:** this is a **detection event, not a new regression**. The two shipped fixes are working; they removed the two previous top contributors and thereby **unmasked the last remaining unbounded field**.

## 2. Signals and SLO variance

SLI: `[webview-metrics]` host→webview `state` payload size (bytes), defined in
[`webviewPayloadMetrics.ts`](../../src/core/webview/webviewPayloadMetrics.ts:31).

| Threshold                    | Value    | Source                                                                    |
| ---------------------------- | -------- | ------------------------------------------------------------------------- |
| WARN                         | 256 KB   | [`STATE_WARN_BYTES`](../../src/core/webview/webviewPayloadMetrics.ts:31)  |
| ERROR + one-time user popup  | 1 MB     | [`STATE_ERROR_BYTES`](../../src/core/webview/webviewPayloadMetrics.ts:34) |
| Post-fix target (runbook §6) | < 200 KB | [runbook](../runbooks/gray-webview.md:211)                                |

Observed (single ~60 s window, from the reported console output):

```
[webview-metrics] ERROR "state" payload 1045KB > 1MB top[clineMessages=962KB customModes=73KB messageQueue=0KB] runbook=docs/runbooks/gray-webview.md
[webview-metrics] state_msgs=4 p50=691KB p99=1045KB max=1045KB
```

| Measure           | Observed      | Target   | Variance      |
| ----------------- | ------------- | -------- | ------------- |
| p50 payload       | 691 KB        | < 200 KB | **3.5× over** |
| p99 / max payload | 1045 KB       | < 200 KB | **5.2× over** |
| Messages > WARN   | 4 / 4 (100 %) | ~0 %     | breach        |
| Messages > ERROR  | 1 / 4 (25 %)  | 0        | breach        |

SLI/SLO compliance: **not met**. The alert fired correctly and the runbook path was surfaced to the user.

## 3. Evidence → code

| Signal (console)                                                 | Code path                                                                                                                                                                                                                                                                                                                        | Verdict                   |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| `top[clineMessages=962KB …]`                                     | [`getStateToPostToWebview()`](../../src/core/webview/ClineProvider.ts:2388) sets `clineMessages: currentTask?.clineMessages \|\| []` ([line 2500](../../src/core/webview/ClineProvider.ts:2500)) with **no bound** — the task's entire message array is serialized on every push.                                                | **Root cause (code)**     |
| `customModes=73KB` (was 762 KB in the 3.88.1 watch)              | [`boundCustomModesForWebview()`](../../src/core/config/CustomModesManager.ts:42) strips per-mode `customInstructions`.                                                                                                                                                                                                           | **Fix confirmed working** |
| `taskHistory` absent from `top[...]`                             | [`boundTaskHistoryForWebview()`](../../src/core/services/TaskHistoryService.ts:41) caps to the newest 100.                                                                                                                                                                                                                       | **Fix confirmed working** |
| `[createTaskWithHistoryItem] parent task … instantiated` → ERROR | [`createTaskWithHistoryItemUnlocked()`](../../src/core/webview/ClineProvider.ts:1126) → `Task` ctor → [`resumeTaskFromHistory()`](../../src/core/task/Task.ts:1967) → [`getSavedClineMessages()`](../../src/core/task/Task.ts:1029) rehydrates the task's **full** persisted message array, then the state push ships all of it. | **Trigger**               |
| `[clearTask]` / `[Task#dispose]` after the ERROR                 | Normal teardown; the task completed its lifecycle without a crash.                                                                                                                                                                                                                                                               | **Host healthy**          |

**Timeline**

1. User opens a task from history → `createTaskWithHistoryItem` instantiates it.
2. The task loads its saved `clineMessages` from disk (a long task → 962 KB of JSON).
3. The resulting `state` push is 1045 KB → **ERROR** + one-time popup.
4. Task is cleared/disposed normally.
5. Window flush: `state_msgs=4 p50=691KB p99=1045KB max=1045KB`.

## 4. Is this a code issue or limited server RAM?

**It is a code issue. It is not a RAM/memory-pressure problem.** Reasoning:

1. **The metric is serialized payload size, not memory.** `[webview-metrics]` measures the bytes of one `postMessage` payload ([`estimateMessageBytes()`](../../src/core/webview/webviewPayloadMetrics.ts:114)). It has no relationship to available RAM.
2. **The extension host stayed healthy.** The log shows a full, normal task lifecycle (instantiated → error → clearTask → dispose) with no OOM, GC storm, or crash. This is exactly the "renderer struggles, host is fine" signature already documented for the analogous `taskHistory` bug ([postmortem §2](../postmortems/2026-09-09-webview-grayout-console-warnings.md:21)).
3. **The failure mode is structural, not capacity.** VS Code structured-clones the entire `state` object across the webview IPC boundary on every push. A ~1 MB clone at high frequency can wedge the renderer regardless of how much RAM the machine has. More RAM would not change the serialized byte count.
4. **It is data-dependent, not load-dependent.** The size tracks _that task's message count_ — reopening a long task reproduces it deterministically. A RAM limit would produce random, host-wide failures, not a size that matches one task's message history.

**Do not respond by adding RAM.** The correct fix is bounding the payload.

## 5. Impact and blast radius

- **Trigger:** opening a long-running task from history (`createTaskWithHistoryItem`), and any streaming tick on such a task.
- **User-visible:** one notification popup per session (by design, once per session via `userNotified`); at-risk gray/unresponsive renderer on large tasks.
- **This event:** **no gray-out reported** — the popup is the _detection_ working, not proof the renderer died. The user's concern ("I hope the screen won't turn gray again") is consistent with a near-miss rather than a wedge.
- **Data safety:** unaffected. Message content is intact on disk under `globalStorage/tasks/…`.

## 6. Immediate mitigation (available now)

1. `Developer: Reload Window` — recovers a wedged renderer.
2. Keep tasks from growing unbounded where practical; start a fresh task instead of resuming a very long one.
3. The popup is safe to dismiss; it fires at most once per session.

## 7. Fix required (delegated)

Bound `clineMessages` in the webview payload, mirroring the existing patterns, and give the chat view a lazy path to older messages.

- Apply a `boundClineMessagesForWebview(...)` projection at
  [`getStateToPostToWebview()`](../../src/core/webview/ClineProvider.ts:2500) (and any state-push helper that carries `clineMessages`),
  following [`boundTaskHistoryForWebview()`](../../src/core/services/TaskHistoryService.ts:41) (cap newest-first) and
  [`boundCustomModesForWebview()`](../../src/core/config/CustomModesManager.ts:42) (strip bulky bodies + `bounded` marker + lazy-fetch).
- Because the chat view renders the whole transcript, the bound must be **tail-anchored** (newest N) with a lazy-fetch/up-scroll path for older messages — not a silent truncation.
- Add regression tests at the lowest layer that would have caught this: a `getStateToPostToWebview` test asserting payload size stays < WARN with a large `clineMessages`, plus a `webviewPayloadMetrics` attribution test naming `clineMessages`.

Delegated to **code mode** via `new_task` (see §8).

## 7a. Fix landed (code mode)

[`boundClineMessagesForWebview()`](../../src/core/webview/clineMessagesForWebview.ts:130) now projects the
transcript tail-first for every `state` push: the newest messages (≤ 200 rows, ≤ 128 KB) plus the
transcript's FIRST message as a head anchor (the chat view derives its task header from
`messages.at(0)`), with the head's bytes subtracted from the budget so the shipped array stays inside it.
The webview merges each window instead of replacing it — rows it has already rendered are kept, so a
growing conversation never loses its top — and lazy-fetches the omitted middle via the typed
`getOlderClineMessages` → `olderClineMessages` pair ("Load earlier messages" button).
`clineMessagesBounded` / `clineMessagesTotal` drive that affordance; `postStateToWebviewWithoutClineMessages`
still omits the transcript (and now its window metadata) for cloud/mode pushes.
`globalStorage/tasks/…` remains the source of truth.

Measured on the same 4-push window shape as §2 (byte sizes only, no content):

| Window                                 | p50    | p99    | max    | SLI lines |
| -------------------------------------- | ------ | ------ | ------ | --------- |
| Before (unbounded `clineMessages`)     | 690 KB | 987 KB | 987 KB | 1 WARN    |
| After (`boundClineMessagesForWebview`) | 141 KB | 141 KB | 141 KB | none      |

Both windows also carried the post-3.88.2 bounded `customModes` projection (~12 KB in this sample);
the runbook §6 post-fix target (< 200 KB) is met.

## 8. Follow-ups / owners

| #   | Action                                                                                                                                                                                                                                                                                                                                             | Owner                      |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| 1   | Bound `clineMessages` in `state` payloads + lazy-fetch older messages; regression tests                                                                                                                                                                                                                                                            | code mode — **done** (§7a) |
| 2   | Re-run the runbook §6 post-fix checklist on the next pre-release; capture `state_msgs` p50/p99/max                                                                                                                                                                                                                                                 | observability              |
| 3   | Consider a WARN-level fallback (log-only, no popup) between 256 KB and 1 MB so near-misses stay quiet                                                                                                                                                                                                                                              | observability              |
| 4   | Confirm the VS Codium popup wording still matches the runbook after the fix                                                                                                                                                                                                                                                                        | docs                       |
| 5   | **Residual risk:** a SINGLE message larger than the 128 KB budget (e.g. a very large tool output or pasted file) is still shipped whole by design so the active turn is never dropped — it can therefore breach WARN alone. Watch `[webview-metrics]` for this signature and consider per-field size caps/truncation for tool results if it recurs | code mode / observability  |
| 6   | On the fixed build, confirm `Extension host (Remote) is unresponsive` disappears alongside the payload drop; if it persists, open a **separate** host-saturation investigation with process metrics (see §10)                                                                                                                                      | observability              |
| 7   | Guard the SLI probe so it never full-serializes an over-budget field on every push (cheap size guard before `JSON.stringify`) — monitoring must not amplify the failure it watches (§10)                                                                                                                                                           | code mode — **done** (§10) |

## 9. Detection assessment

- ✅ The SLI fired, named the culprit field, and pointed at the runbook — detection worked end-to-end.
- ✅ The `top[...]` attribution closed cleanly (`962 + 73 + 0 ≈ 1035 KB` of the 1045 KB total) — the 2026-09-11 probe-gap fix paid off.
- ⚠️ Gap: the pipeline now **reliably reports** the payload but does not yet prevent it. Prevention is the §7 fix.

## 10. Recurrence during the fix window (2026-09-15, released build)

The failure reproduced **while the fix was still uncommitted**. The running extension is
the published `3.88.2` (working tree: `src/package.json` = `3.88.2`; the fix files are
untracked/modified and **not released**), so the unbounded `clineMessages` path is still
live for the user. This is the predicted behaviour of §7 — it does not invalidate the fix.

Observed (session running a long agent task):

```
[webview-metrics] ERROR "state" payload 1645KB > 1MB top[clineMessages=1554KB customModes=71KB messageQueue=0KB]
[webview-metrics] ERROR "state" payload 1677KB > 1MB top[clineMessages=1587KB customModes=71KB messageQueue=0KB]
[webview-metrics] state_msgs=24 p50=1653KB p99=1663KB max=1663KB
[webview-metrics] state_msgs=11 p50=1703KB p99=1706KB max=1706KB
```

### Ruling on the three hypotheses

| #   | Hypothesis                            | Verdict                    | Basis                                                                                                                                                                                                                                      |
| --- | ------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| a   | Same issue as §1–§7, cured on release | **Yes (primary)**          | `clineMessages` is still the top field (1554–1587 KB). `customModes=71KB` proves the _released_ `3.88.2` customModes fix is active while the clineMessages fix is not.                                                                     |
| b   | RAM-limited server                    | **No**                     | Payloads grew 962 KB → 1554 KB because the **task got longer**, not because memory changed. Still a byte-volume problem.                                                                                                                   |
| c   | Something else                        | **Partly — an escalation** | New line: `INFO Extension host (Remote) is unresponsive.` / `is responsive.` The first incident was explicitly webview-renderer-only; the remote host now misses heartbeats. Treat as a **more severe expression of (a)** until disproven. |

### Non-Roo+ noise (verified not ours)

`ERR … Document … not found in AST tracker` and `deleteChain called from onDidChangeVisibleTextEditors`
are **not emitted by Roo+**. A repo-wide search finds **zero** occurrences of `AST tracker` or
`deleteChain` (source, `node_modules`, and the extension directories available here), so these come
from another extension-host component. They are benign file-watch/AST churn triggered by editing a
newly created file (`docs/incidents/2026-09-15-clineMessages-state-payload.md`) before the tracker
registered it. **Not actionable in this repo.**

### New signal: extension host (Remote) unresponsive

- **Correlation:** the unresponsive→responsive pair appears in the same window as ~24 `state`
  pushes at ~1.65 MB each (p50) ≈ **40 MB/min** of serialization + structured clone, alongside
  checkpoint saves (`[t#saveCheckpoint] … saved in ~107 ms`) and AST-tracker churn
  (`deleteChain called from onDidChangeVisibleTextEditors` ×many).
- **Plausible mechanism:** CPU / event-loop saturation on the **remote** host from serializing
  and cloning multi-MB payloads at high frequency — not a memory-capacity ceiling. In
  `Help → Open Process Explorer` this would show a hot/unresponsive **extension host** process,
  unlike the first incident (unresponsive **renderer**).
- **Verify, don't assume:** the runbook explicitly scopes extension-host hangs out
  ([escalation matrix](../runbooks/gray-webview.md:62)). Capture remote `top`/`ps` or Process
  Explorer **during** the next event to separate payload-CPU saturation from an unrelated host issue.
- The bound (§7a) removes the dominant serialization load and is expected to resolve this too —
  confirm on the fixed build (§8 row 6).

### Observability-cost finding (amplifier)

The SLI is expensive precisely in this failure mode: [`jsonSizeBytes()`](../../src/core/webview/webviewPayloadMetrics.ts:82)
runs a **full `JSON.stringify` of every probed field** (including the ~1.5 MB `clineMessages`)
on **every** push, and [`estimateMessageBytes()`](../../src/core/webview/webviewPayloadMetrics.ts:114)
pays a **second** full `JSON.stringify(message)` because the probe is over threshold. Each push
therefore serializes ~3 MB _before_ `postMessage` does it again via structured clone. The bound
fixes this (a bounded `clineMessages` stays on the cheap-probe path), but the probe should also be
guarded so monitoring never amplifies the failure it is watching (§8 row 7).

**Landed (P1).** [`estimateFieldBytes()`](../../src/core/webview/webviewPayloadMetrics.ts:169)
now derives the per-push WARN/ERROR decision from an O(n) byte proxy that never serializes arrays
longer than [`EXACT_ARRAY_MAX_LENGTH`](../../src/core/webview/webviewPayloadMetrics.ts:83) (`8`)
elements, and the exact probe runs only on the ≤ once-per-window alert path
([`needsExact`](../../src/core/webview/webviewPayloadMetrics.ts:296)). Thresholds, the event schema,
the privacy contract and the emitted line are unchanged. Measured on the incident's ~1.5 MB shape:
an over-threshold push went **3.48 ms → 0.047 ms** (~98.7 % less), and a _second_ over-threshold push
in the same window now performs **0** full serializes (was 2). Only near-threshold _misses_ are
possible (the proxy under-estimates by ≤ [`ESTIMATE_TOLERANCE`](../../src/core/webview/webviewPayloadMetrics.ts:93)
≈ 15 %); the alert itself is classified on the **exact** bytes, so no false WARN/ERROR is emitted.
Tests: 17 pass in [`webviewPayloadMetrics.spec.ts`](../../src/core/webview/__tests__/webviewPayloadMetrics.spec.ts:1);
608 pass across `core/webview`.

### Incident status

Still **Open for the released build**; **fixed in the working tree** (§7a) pending release. The
recurrence confirms the diagnosis rather than contradicting it.

## Privacy note

All figures here are byte counts and static `ExtensionState` field names. No message content, task text, prompts, file paths, or identifiers are reproduced. All `[webview-metrics]` data is local-only (see [runbook Privacy note](../runbooks/gray-webview.md:81)).
