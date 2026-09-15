# Diagnosis & Design: "Extension host (Remote) is unresponsive"

- **Date:** 2026-09-15
- **Status:** **Design / diagnosis only** — no code implemented (task scope: doc first, implement on approval)
- **Author:** ⚡ Performance Engineer (bottleneck analysis pass)
- **Trigger:** [Incident 2026-09-15 §10](./2026-09-15-clineMessages-state-payload.md) — the `INFO Extension host (Remote) is unresponsive.` / `is responsive.` pair that co-occurred with ~1.65 MB `state` payloads on a VS Codium remote-SSH workspace.
- **Related:** [Postmortem 2026-09-09 — webview gray-out](../postmortems/2026-09-09-webview-grayout-console-warnings.md) (item 5 = deferred environmental factor) · [Runbook: gray webview](../runbooks/gray-webview.md) (escalation matrix)
- **SLI in place:** [`[webview-metrics]`](../../src/core/webview/webviewPayloadMetrics.ts:31) (WARN > 256 KB, ERROR > 1 MB, ~60 s window summary)

## 0. Verdict up front

**H1 is a real amplifier, but the measurements below show it is NOT sufficient on its own to explain a missed extension-host heartbeat.** The observability probe is a first-class contributor — in fact the _dominant_ synchronous cost per push — and it is fixable cheaply and independently of the incident. Attribution of the heartbeat miss still requires remote-host measurement (§5/§7).

| Question                                                                  | Answer                                                                                          |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Does the probe cost real CPU at ~1.5 MB?                                  | **Yes** — ~3.9 ms/push of `JSON.stringify`, every push, even healthy ones.                      |
| Is that enough to saturate the event loop at the observed ~24 pushes/min? | **No, not alone** — ~19 % duty cycle of one core on a fast host.                                |
| Is the probe still worth fixing first?                                    | **Yes** — it is ~2× the payload's own in-process clone cost and is removed by a ~0.03 ms guard. |
| Should we claim H1 caused the "unresponsive" line?                        | **No** — instrument-first; the line cannot be attributed from the current evidence.             |
| Any code change warranted now?                                            | One small one (§3.5, the probe guard) — **pending approval**.                                   |

---

## 1. Scope, constraints, non-goals

Constraints honored by this design:

- **No payload-semantics change** and **no change to the `clineMessages` bound contract** ([`boundClineMessagesForWebview()`](../../src/core/webview/clineMessagesForWebview.ts:164), [`MAX_CLINE_MESSAGES_BYTES_SHIPPED_TO_WEBVIEW`](../../src/core/webview/clineMessagesForWebview.ts:52)).
- **Local-only telemetry, no network egress.** A remote sink requires a privacy review (same rule as the existing SLI).
- **AGENTS.md:** no `.changeset`, no `CHANGELOG` edits, do not increase `src/eslint-suppressions.json` counts, tests at the lowest layer.
- Already established and **not re-litigated**: the > 1 MB payloads come from unbounded `clineMessages`; the bound exists in the working tree but is uncommitted/unreleased; `customModes`/`taskHistory` are already bounded; this is a byte-volume problem, not a RAM-capacity problem; the `AST tracker` / `deleteChain` lines have **zero** occurrences in this repo.

Non-goals: implementing the instrumentation, changing alert thresholds, or shipping a canary auto-reload. This document specifies them; it does not land them.

---

## 2. Method (how the numbers below were produced)

Microbenchmark of the exact production call chain, run on `Node v22.22.2` (the repo's ADR-pinned runtime, [ADR: Node.js v22](../adr/adr-nodejs-v22.md)), in-process, `hrtime.bigint()` timing, median of ≥ 200 iterations after warmup:

1. `clineMessages` = 756 messages × ~2 KB `text` ≈ **1,554 KB** JSON (matches the incident's `clineMessages=1554KB`).
2. `state` = `{ version, clineMessages, customModes (~68 KB), taskHistory (100), messageQueue, marketplaceItems }` ≈ **1.686 MB** total (matches the incident's 1645–1677 KB `state` payloads).
3. Timed the three operations the host performs per push (see [`recordStateMessage()`](../../src/core/webview/webviewPayloadMetrics.ts:144) → [`jsonSizeBytes()`](../../src/core/webview/webviewPayloadMetrics.ts:82) → [`estimateMessageBytes()`](../../src/core/webview/webviewPayloadMetrics.ts:114) → [`postMessageToWebview()`](../../src/core/webview/ClineProvider.ts:1366)).

> Caveat (stated plainly): this is a _fast dev host_, and `structuredClone` is only an **in-process proxy** for the host→renderer RPC serialization, which is strictly more expensive. Treat every figure below as a **lower bound**; the remote `ArchonServer` CPU speed is unknown and is exactly what §5 measures. Scaling: if the remote host is 3× slower at single-threaded stringify, the duty cycle in §3.4 roughly triples.

---

## 3. Deliverable 4 — the real cost of the probe at ~1.5 MB

### 3.1 Measured per-operation cost

| Operation (per `state` push)                                      | Code site                                                                       | Median                                          |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------- |
| `JSON.stringify(clineMessages)` (1.5 MB array)                    | [`jsonSizeBytes()`](../../src/core/webview/webviewPayloadMetrics.ts:82)         | **3.68 ms**                                     |
| `Buffer.byteLength(<that string>)`                                | [`jsonSizeBytes()`](../../src/core/webview/webviewPayloadMetrics.ts:82)         | **~0.23 ms** (cheap; the stringify is the cost) |
| **Probe, all known-bloat fields**                                 | [`jsonSizeBytes()`](../../src/core/webview/webviewPayloadMetrics.ts:82)         | **3.9 ms**                                      |
| `JSON.stringify(message)` (full 1.69 MB)                          | [`estimateMessageBytes()`](../../src/core/webview/webviewPayloadMetrics.ts:114) | **3.7 ms**                                      |
| `structuredClone(state)` (in-process floor for the IPC serialize) | [`postMessageToWebview()`](../../src/core/webview/ClineProvider.ts:1366)        | **0.61 ms**                                     |

### 3.2 The key finding: the probe is the _largest_ single serialization cost

Per over-threshold push the host now serializes the 1.5 MB array **twice** — once inside the probe ([`jsonSizeBytes()`](../../src/core/webview/webviewPayloadMetrics.ts:82)) and again inside the exact path ([`estimateMessageBytes()`](../../src/core/webview/webviewPayloadMetrics.ts:114)) — before `postMessage` serializes it a **third** time for the RPC:

```
monitor overhead per push = probe (3.9 ms) + exact full stringify (3.7 ms) ≈ 7.6 ms   ← synchronous, blocks the event loop
unavoidable payload work  = structuredClone (0.61 ms)                                    ← in-process floor only
```

So the monitoring layer costs **~12× the measured clone** and **~2× the payload's own serialization**. The comment at [`estimateMessageBytes()`](../../src/core/webview/webviewPayloadMetrics.ts:114) already anticipated this ("would roughly double the serialization CPU cost on the hottest host→webview path"); at the 1.5 MB scale the _first_ stage ([`jsonSizeBytes()`](../../src/core/webview/webviewPayloadMetrics.ts:82)) is also a full serialize of the dominant field, so the doubling happens on **every** push, healthy or not.

### 3.3 Duty cycle at the observed rate (~24 pushes/min, §10 evidence)

```
7.6 ms/push × 24 pushes/min ≈ 0.18 s/min  ⇒  ~19 % of one core, purely synchronous
```

**Interpretation.** 19 % of one core in short synchronous bursts is a genuine drag — it lengthens every co-scheduled callback and raises tail latency — but it is **not** an event-loop saturation signature on this CPU. A missed VS Code heartbeat requires the host to be unresponsive for seconds, not ~8 ms at a time. Therefore:

- H1's _mechanism_ is confirmed (**the payload path does burn meaningful host CPU, and the monitor amplifies it**).
- H1's _magnitude_ is **not** confirmed as the cause of the `unresponsive` line. On a 3–5× slower/contended remote VM, plus the real (more expensive) IPC serialization, plus H2's checkpoint/I/O work, the sum could reach saturation — but that is a hypothesis to measure, not a conclusion to assert.

### 3.4 Candidate cheap guard — measured

| Candidate guard                                                              | Median       | vs current          |
| ---------------------------------------------------------------------------- | ------------ | ------------------- |
| `Array.isArray(v) && v.length > cap` (no serialize)                          | **0.000 ms** | —                   |
| Bounded sample: stringify first-5 + last-5, extrapolate by count             | **0.029 ms** | ~260× cheaper       |
| **O(n) allocation-free byte proxy** (Σ `text.length` + per-message constant) | **0.002 ms** | **~1,800× cheaper** |

The allocation-free proxy is both the fastest and the most accurate for this data shape:

```
proxy estimate = 1,596,672 bytes   exact = 1,593,649 bytes   error = +0.2 %
```

It touches only `.length`/type fields per element (no allocation, no string building), so it is ~2,266× faster than `JSON.stringify` in isolation, and its error is well inside any sane WARN headroom (the gap between the 128 KB shipped bound and the 256 KB WARN threshold is ~2×).

### 3.5 Decision: is a cheap size guard required? **Yes.**

**Requirement.** Monitoring must not amplify the failure it watches ([incident §8 row 7](./2026-09-15-clineMessages-state-payload.md)). The current probe does: on a regression it adds ~7.6 ms/push of event-loop-blocking CPU on the exact path already under suspicion.

**Minimal change (spec only — not implemented).** Keep the module's contract intact (same thresholds, same numeric+static-name event schema at [`webviewPayloadSizeEventSchema`](../../packages/types/src/events.ts:76)) and change only _how_ the number is derived:

1. Add a **cheap estimator** alongside [`jsonSizeBytes()`](../../src/core/webview/webviewPayloadMetrics.ts:82) that never calls `JSON.stringify` on an array:
    - array → O(n) proxy (`Σ` known string-field lengths + a per-element constant), fall back to `JSON.stringify` only for arrays shorter than a small constant where exactness is free;
    - string → `.length`; `undefined`/`null` → 0.
2. Use the cheap estimate for the **per-push WARN decision** and for the rolling `windowSizes` histogram (`p50`/`p99`/`max` keep working; the summary stays in KB).
3. Run the **existing exact probe** ([`jsonSizeBytes()`](../../src/core/webview/webviewPayloadMetrics.ts:82) + [`estimateMessageBytes()`](../../src/core/webview/webviewPayloadMetrics.ts:114)) **only when a WARN/ERROR line is actually about to be emitted** — i.e. at most once per [`METRICS_WINDOW_MS`](../../src/core/webview/webviewPayloadMetrics.ts:37) window (the existing `warnEmittedThisWindow` / `errorEmittedThisWindow` guards already bound this). The emitted `top[...]` attribution and `messageBytes` stay exact, so the operator-facing line is unchanged and the schema is untouched.

Result: healthy pushes go from 3.9 ms → ~0.03 ms of probe cost; regression pushes pay the exact cost at most once per minute instead of every push. **This is a ~99.7 % reduction in monitoring CPU on the hot path** and it is a local change to one file, with unit tests at the lowest layer ([`webviewPayloadMetrics.spec.ts`](../../src/core/webview/__tests__/webviewPayloadMetrics.spec.ts:367) already asserts the "healthy payload ⇒ single, non-full serialize" property — that test's intent is preserved and strengthened).

> Why this is safe for the `clineMessages` contract: after the working-tree bound lands, `clineMessages` is ≤ 128 KB + head, so the cheap path is the normal path and the exact path becomes a rare regression-reporting convenience. The bound itself is untouched; the guard only avoids _measuring_ it the expensive way.

---

## 4. Deliverable 1 — instrumentation plan (extension-host health)

Mirror the proven [`WebviewPayloadMetrics`](../../src/core/webview/webviewPayloadMetrics.ts:126) shape: pure class, injectable deps, session memory only, local output channel only, numbers + static names only.

**Proposed module:** `src/core/webview/extensionHostHealthMetrics.ts` (new; sibling of the payload SLI).
**Suggested log prefix:** `[host-health]` (distinct from `[webview-metrics]` so the two can be correlated by window).

### 4.1 Metrics, exactly

| #   | Metric                                                         | Source                                                                                                                | Notes                                                                                                    |
| --- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 1   | **Event-loop lag** (`mean`, `p50`, `p95`, `p99`, `max`)        | `perf_hooks.monitorEventLoopDelay({ resolution: 10 })` histogram                                                      | Primary SLI. Nanoseconds → ms at flush. Continuous, negligible cost.                                     |
| 2   | **Timer/heartbeat jitter** (`max`, `mean`)                     | a `setInterval(…, 1000)` (or `setTimeout` self-rearm) measuring `actual − 1000`                                       | Directly models the mechanism VS Code uses to declare the host unresponsive; correlates lag → heartbeat. |
| 3   | **CPU usage** (`cpu_pct` = user+system ÷ window)               | `process.cpuUsage()` delta across the window                                                                          | Monotonic counters; one delta per window, no per-push cost.                                              |
| 4   | **Memory** (`heap_mb`, `rss_mb`, `external_mb`)                | `process.memoryUsage()` at flush                                                                                      | Single sample per window; H4 discriminator.                                                              |
| 5   | **Per-push serialize time** (`state_serialize_ms` p50/p99/max) | one `hrtime` pair around the state branch of [`postMessageToWebview()`](../../src/core/webview/ClineProvider.ts:1366) | This is the **attribution bridge**: it is the direct causal link between payload work and host lag.      |
| 6   | **Window counters** (`state_msgs`, `warn`, `error`)            | already known to the payload SLI                                                                                      | Lets a single window be read without cross-referencing two lines.                                        |

**Not collected** (privacy + noise): no task IDs, no message content, no file paths, no provider config, no stack traces, no thread dumps.

### 4.2 Sampling rate & cost

- Event-loop histogram: `resolution: 10` ms, enabled for the session, read (not reset per push) once per window — effectively free.
- Health snapshot (`cpuUsage`/`memoryUsage`/histogram percentiles): **once per 60 s window**, same cadence as the payload SLI.
- Per-push serialize timing: one `process.hrtime.bigint()` pair per `state` push — tens of nanoseconds, only when the flag is on.

### 4.3 Hook points

| Hook                  | Location                                                                                                                                                                                      | Change                                                                                                                                                                                                                                                                                                      |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Instantiate           | next to [`payloadMetrics`](../../src/core/webview/ClineProvider.ts:216) (`private readonly hostHealthMetrics`)                                                                                | Deps: `now`, `log: (m) => this.log(m)` ([`log()`](../../src/core/webview/ClineProvider.ts:2887)), `schedule` (reuse the existing `unref`'d timer pattern at [line 221](../../src/core/webview/ClineProvider.ts:221)), plus **injectable clock/histogram factories** so unit tests never touch `perf_hooks`. |
| Start                 | lazily on the first state push (or on `resolveWebviewView`)                                                                                                                                   | Enables the histogram only when the flag is on; otherwise the object is a no-op and costs zero.                                                                                                                                                                                                             |
| Record serialize time | state branch of [`postMessageToWebview()`](../../src/core/webview/ClineProvider.ts:1366), wrapping the `recordStateMessage` call at [line 1376](../../src/core/webview/ClineProvider.ts:1376) | `t = hrtime(); payloadMetrics.recordStateMessage(m); hostHealthMetrics.recordStateSerialize(hrtime() - t)`.                                                                                                                                                                                                 |
| Flush                 | 60 s timer, reusing the window-flush pattern of [`flushWindow()`](../../src/core/webview/webviewPayloadMetrics.ts:225)                                                                        | Emit one `[host-health]` line; reset window state.                                                                                                                                                                                                                                                          |
| Dispose               | next to `this.payloadMetrics?.dispose()` at [line 809](../../src/core/webview/ClineProvider.ts:809)                                                                                           | `this.hostHealthMetrics?.dispose()` → disable histogram, cancel timer.                                                                                                                                                                                                                                      |

### 4.4 Gating (local-only, no persisted setting)

Primary gate: **environment variable** `ROO_HOST_HEALTH_DEBUG=1|true`, read once via `process.env`, mirroring the established [`SEMBLE_DEBUG`](../../src/services/code-index/semble/provider.ts:27) pattern. Secondary gate: `context.extensionMode === vscode.ExtensionMode.Development` (mirrors [`isDebugMode()`](../../src/utils/networkProxy.ts:357)).

Rationale for an env var over a persisted setting: it avoids the full "Persisted Setting Checklist" round trip (schema + `ExtensionState` + `SettingsView.cachedState` + `getStateToPostToWebview` + import/export) in [`packages/types/src/global-settings.ts`](../../packages/types/src/global-settings.ts:1), and it guarantees **zero persistence** — satisfying the privacy posture by construction.

Remote-SSH note (important, and easy to get wrong): the extension host is spawned by the **remote vscodium-server**, so the variable must be in the **server's** environment, not the integrated terminal's. See §6.2 for the exact procedure. `terminal.integrated.env.linux` does **not** affect the extension host.

### 4.5 Privacy contract (must be documented in the module header, like the payload SLI)

- Session memory only; nothing written to `globalState`/Memento/`state.vscdb`.
- Logged data = byte-size integers, millisecond values, percentages, and the literal prefix `[host-health]`. No content, IDs, paths, or identifiers.
- Output goes to the local Roo+ output channel ([`log()`](../../src/core/webview/ClineProvider.ts:2887)) only. No egress. Routing to a remote sink requires a privacy review.
- Flag off ⇒ no allocation, no timers, no output.

### 4.6 Log-line shapes

```text
[host-health] elu_ms p50=3 p95=18 p99=42 max=210 mean=6 | jitter_ms max=52 | cpu_pct=38 | heap_mb=412 rss_mb=780 ext_mb=64 | state_serialize_ms p50=8 p99=12 max=19 n=24
[host-health] WARN elu_ms p99=238 max=1480 | jitter_ms max=920 | cpu_pct=71 | state_serialize_ms p99=11 max=19 n=31
[host-health] ERROR elu_ms p99=612 max=3420 | jitter_ms max=2610 | cpu_pct=74 | window runbook=docs/runbooks/gray-webview.md
```

(The WARN/ERROR variants are the permanent-detection forms in §7; the plain line is the periodic summary.)

---

## 5. Deliverable 2 — runnable measurement protocol (no repro required)

This protocol is designed for **passive, always-on capture**: run it in a background terminal on the remote host for the whole session, so the next `unresponsive` event is captured automatically without needing to reproduce it deliberately.

### 5.1 Find the extension-host PID (remote host terminal)

```bash
# The remote extension host is a node process launched by the vscodium-server.
ps -eo pid,ppid,etimes,pcpu,pmem,rss,cmd --sort=-pcpu \
  | grep -Ei 'extensionHost|vscodium-server|\.vscodium-server' | grep -v grep
```

Expected shape (`<EHPID>` = the `.../extensionHostProcess.js` row, whose parent is the server):

```text
  PID  PPID ETIMES %CPU %MEM    RSS CMD
 8412     1   4320  3.1  1.9 512340 /usr/share/.../out/vs/server/node/extensionHostProcess.js
```

Record it once per session: `export EHPID=8412`.
`Help → Open Process Explorer` shows the same process as **extensionHost** (not the renderer) — use it as the GUI cross-check.

### 5.2 Start the always-on capture (one background terminal per session)

```bash
mkdir -p /tmp/roo-perf && cd /tmp/roo-perf
EHPID=$(pgrep -f extensionHostProcess.js | head -1); echo "EHPID=$EHPID"

# (a) Per-second CPU + RSS + I/O for the extension host, 1-hour rolling file.
#     Prefer pidstat (sysstat); it reports %usr/%system/iowait split.
pidstat -p "$EHPID" -u -r -d 1 3600 > "eh-$(date +%Y%m%d-%H%M%S).pidstat" 2>&1 &
echo $! > pidstat.pid

# (b) Host-level pressure (PSI): the single best H3 (environmental) discriminator.
( while :; do
    { date -Is; grep -H . /proc/pressure/cpu /proc/pressure/io /proc/pressure/memory; echo; } \
      | paste - - - - ;
    sleep 5
  done ) > "psi-$(date +%Y%m%d-%H%M%S).log" 2>&1 &
echo $! > psi.pid

# (c) /proc fallback if sysstat is unavailable (%usr,%system from utime+stime deltas)
( prev=""; while :; do
    read -r _ _ _ _ _ _ _ _ _ _ _ _ _ ut st _ _ _ _ _ _ rss _ < /proc/$EHPID/stat
    now=$(date +%s%3N)
    [ -n "$prev" ] && awk -v t="$now" -v pt="$prev" -v u="$ut" -v pu="$prev_u" -v s="$st" -v ps="$prev_s" \
      'BEGIN{printf "%s cpu_pct=%.1f\n", t, (u-pu+s-ps)/10.0/((t-pt)/1000.0)*100}'
    prev=$now; prev_u=$ut; prev_s=$st
    sleep 1
  done ) > "proc-cpu-$(date +%Y%m%d-%H%M%S).log" 2>&1 &
echo $! > proc.pid
```

> Note: `/proc/<pid>/stat` fields 14/15 are `utime`/`stime` in **clock ticks** (usually 100/s → divide by 10 for centiseconds-per-second → the `%/10` above assumes `getconf CLK_TCK` = 100; verify with `getconf CLK_TCK`).

### 5.3 What to capture **during** a heavy task

1. Leave §5.2 running; start a long agent task and, if safe, resume a long task from history (§10's trigger).
2. In a second remote terminal, capture an instant snapshot when the UI freezes or the `INFO … unresponsive` line appears:

```bash
EHPID=$(pgrep -f extensionHostProcess.js | head -1)
top -b -n1 -p "$EHPID" -o PID,PCpu,PMem,RES,SHR,TIME+,CMD | head -5
cat /proc/loadavg; nproc; free -m
grep -E 'VmRSS|Threads|voluntary_ctxt_switches' /proc/$EHPID/status
```

3. Capture the Roo+ output channel (`[webview-metrics]` + `[host-health]`) and the extension-host log for the same minute.
4. In `Help → Open Process Explorer`, note for **extensionHost**: steady %CPU, whether it is a _hot_ (pegged) or _blocked_ (idle but unresponsive) process, and RSS trend. Also check the **shared-process**/renderer rows to see whether the freeze is renderer-side.
5. Stop only after the `is responsive` line is seen (so the whole event window is captured).

### 5.4 Thresholds that discriminate H1 / H2 / H3 / H4

| Discriminator                                 | H1 payload CPU                                         | H2 concurrent task work                                | H3 environmental                                                   | H4 memory/GC                                  |
| --------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------ | ------------------------------------------------------------------ | --------------------------------------------- |
| EH `%CPU` during event                        | **high (pegged ~100 % of a core)**                     | high but bursty, aligned to checkpoints/IO             | **low** (blocked, not running) while flagged unresponsive          | moderate; sawtooth with long GC pauses        |
| `state_serialize_ms` (§4)                     | **co-occurs and is large (≥ WARN)**                    | small/normal                                           | small/normal                                                       | small/normal                                  |
| Correlation with push rate                    | **strong** (CPU drops within ~1 s of pausing the task) | strong with `saveCheckpoint`/file-watch, not push rate | none                                                               | weak                                          |
| `pidstat -d` / iowait                         | low                                                    | **high IOwait / disk**                                 | variable                                                           | low                                           |
| `/proc/pressure/cpu` `some avg10`             | **< 5 %** (cgroup/host not starved)                    | low                                                    | **> 10 %** (`full avg10` > 5 %) ⇒ noisy neighbor / host contention | low                                           |
| `steal` in `top` (`st`)                       | ~0                                                     | ~0                                                     | **> 0** ⇒ hypervisor contention                                    | ~0                                            |
| `loadavg / nproc`                             | < 1                                                    | < 1–2                                                  | **> 1 sustained**                                                  | ~1                                            |
| RSS/heap trend                                | flat                                                   | flat                                                   | flat                                                               | **climbing** / `memory.events` `oom_kill` > 0 |
| Multi-window (different servers) simultaneous | no                                                     | no                                                     | **yes** (postmortem item 5 signature)                              | no                                            |
| Event-loop lag `p99` (§4)                     | **> 200 ms, max > 1 s**                                | 50–200 ms bursts                                       | variable/large but **without** CPU or serialize correlation        | large sawtooth                                |

Interpretation rules:

- **H1** needs **three** things together: large `state_serialize_ms` / payload ERROR, high EH `%CPU`, and **low host-level pressure** (PSI + steal ~0). Missing any one ⇒ not H1 alone.
- **H3** is suggested whenever the host is flagged unresponsive while EH `%CPU` is low **and** PSI/steal/load indicate contention — that is the postmortem item 5 branch.
- **H4** is suggested by RSS/heap growth over the session with steady workload (the payload's ~3 MB/push of garbage is a _contributor_ to GC, so H4 can co-exist with H1).

---

## 6. Deliverable 6 — evidence pack

### 6.1 Expected Roo+ log shapes

```text
[webview-metrics] ERROR "state" payload 1645KB > 1MB top[clineMessages=1554KB customModes=71KB messageQueue=0KB] runbook=docs/runbooks/gray-webview.md
[webview-metrics] state_msgs=24 p50=1653KB p99=1663KB max=1663KB
[host-health] elu_ms p50=3 p95=18 p99=42 max=210 mean=6 | jitter_ms max=52 | cpu_pct=38 | heap_mb=412 rss_mb=780 ext_mb=64 | state_serialize_ms p50=8 p99=12 max=19 n=24
INFO Extension host (Remote) is unresponsive.
INFO Extension host (Remote) is responsive.
```

Correlation to look for: the `[host-health]` window whose `elu_ms p99`/`max` is large should be the **same 60 s window** as the `[webview-metrics]` ERROR and the `unresponsive`/`responsive` pair. If the lag window is large **without** a payload signal (§5.4), the cause is not the payload.

### 6.2 Setting the flag on a remote-SSH host

```bash
# On the REMOTE host (server side), add to the shell profile the server inherits:
echo 'export ROO_HOST_HEALTH_DEBUG=1' >> ~/.bashrc
# Then restart the remote server so the extension host is re-spawned with it:
#   Command Palette → "Kill VS Code Server on Host"  (or fully quit VS Codium)
```

Verify from the extension host's own output channel that `[host-health]` lines appear. If they do not, the server was not restarted (the profile change alone does not apply to the already-running server).

### 6.3 Expected `pidstat` output

```text
# Time   UID  PID   %usr %system  %CPU   CPU  Command
12:00:01  1000 8412  18.0    4.0   22.0    3   extensionHostProcess.js
12:00:02  1000 8412  96.0    3.0   99.0    3   extensionHostProcess.js   <-- during a payload hot window
```

### 6.4 Expected PSI output

```text
/proc/pressure/cpu:  some avg10=0.42 avg60=0.31 avg300=0.22 total=...      <-- H1-compatible (host not starved)
/proc/pressure/cpu:  some avg10=23.10 avg60=18.40 avg300=12.70 total=...  <-- H3-compatible (host contention)
```

---

## 7. Deliverable 3 — decision tree

```text
INFO "Extension host (Remote) is unresponsive"
│
├─ Is there a co-occurring [webview-metrics] WARN/ERROR in the same ~60 s window?
│   │
│   ├─ NO ─────────────► NOT payload-driven. Go to the H2/H3/H4 branch below.
│   │
│   └─ YES
│       │
│       ├─ [host-health] state_serialize_ms p99 large AND EH %CPU pegged
│       │   AND /proc/pressure/cpu some avg10 < 5% AND steal ~0
│       │      └─► H1 (payload CPU) — CONFIRMED
│       │          Action: land the clineMessages bound (already in the working tree);
│       │          land the §3.5 probe guard; re-verify on the fixed build (incident §8 row 6).
│       │
│       ├─ EH %CPU pegged but /proc/pressure/cpu some avg10 > 10% OR steal > 0
│       │   OR loadavg/nproc > 1
│       │      └─► H3 (environmental/host contention) — even if a payload fired,
│       │          the host was starved. Action: postmortem item 5 branch — Process Explorer
│       │          for dead/hot GPU/renderer, upstream VS Codium issue, NOT a Roo+ payload bug.
│       │
│       └─ payload fired but state_serialize_ms normal AND CPU NOT pegged
│              └─► Payload is a side-effect, not the cause. Continue below.
│
├─ NO payload signal at all:
│   ├─ EH %CPU low while flagged unresponsive
│   │      ├─ PSI/steal/load high ────► H3 (environmental)
│   │      └─ PSI flat, RSS climbing  ─► H4 (GC/memory) — check memory.events oom_kill
│   ├─ EH %CPU bursty, aligned to checkpoint saves / file-watch / disk (iowait high)
│   │      └─► H2 (concurrent task work) — profile saveCheckpoint + file watchers
│   └─ none of the above / can't tell ─► INSTRUMENT-FIRST: enable ROO_HOST_HEALTH_DEBUG=1,
│                                          run §5.2 capture, wait for the NEXT event (no repro needed)
│
└─ Multiple windows on DIFFERENT remote servers unresponsive simultaneously
       └─► H3 (environmental, postmortem item 5) — per-window Roo+ data cannot explain simultaneity
```

---

## 8. Deliverable 5 — permanent detection recommendation

### 8.1 Candidate SLI

**Extension-host event-loop lag p99** (`[host-health] elu_ms p99`, §4.6), emitted per 60 s window with the co-located `state_serialize_ms` and `cpu_pct`. This is the host-side analogue of the existing payload SLI and is the missing half of the incident's detection story.

### 8.2 Alert thresholds (proposed)

| Severity           | Condition                                                                                        | Rationale                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| WARN               | `elu_ms p99 > 200` **or** `jitter_ms max > 500`                                                  | Noticeably degraded responsiveness; still below VS Code's multi-second unresponsive trigger. |
| ERROR              | `elu_ms p99 > 500` **or** `max > 3000` **or** `jitter_ms max > 2000`                             | Approaches the multi-second no-response window that VS Code labels `unresponsive`.           |
| Attribution suffix | append `top[clineMessages=…]` when the same window also emitted a `[webview-metrics]` WARN/ERROR | Closes the H1 loop in one line, mirroring `[webview-metrics] top[...]`.                      |

Keep the existing payload thresholds unchanged ([`STATE_WARN_BYTES`](../../src/core/webview/webviewPayloadMetrics.ts:31) / [`STATE_ERROR_BYTES`](../../src/core/webview/webviewPayloadMetrics.ts:34)).

### 8.3 Canary auto-reload: **not warranted for the host; opt-in only for the renderer**

- **Do not auto-reload the extension host.** A host reload tears down running tasks mid-operation (checkpoint writes, tool calls awaiting approval) and risks data loss/duplicated side effects; a long synchronous operation can look "unresponsive" while doing legitimate work. Auto-recovery here is unsafe.
- **Renderer gray-out** is the failure mode where a reload is _safe and reversible_ (`Developer: Reload Window` is already the documented mitigation at [runbook §3A](../runbooks/gray-webview.md:80)). Recommendation: a **notify-first** UX (non-blocking notification + runbook link) after sustained lag, with an **opt-in** (`roo-plus` setting) auto-reload for the renderer only, and only when no task is active or awaiting approval. Default off.
- This is a product decision; the observability work in §4/§8.1 should land first so the reload decision can be driven by real lag data.

### 8.4 Runbook alignment (proposed delta to [`docs/runbooks/gray-webview.md`](../runbooks/gray-webview.md), not applied here)

Add to the escalation matrix ([runbook §4](../runbooks/gray-webview.md:94)):

| Situation                                                                                           | Route to                                                                                 |
| --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `[host-health]` lag > WARN **with** co-occurring large-payload `ERROR`                              | Payload-driven host CPU saturation — incident §10; land the bound + probe guard          |
| `[host-health]` lag > WARN **without** any payload signal                                           | Out of scope for this runbook — separate host-performance investigation (H2/H3/H4, §5.4) |
| Extension host flagged unresponsive **while** `[host-health] cpu_pct` is low and PSI/steal elevated | Environmental — postmortem item 5 branch (upstream VS Codium)                            |

---

## 9. Prioritized recommendation

> **Status (2026-09-15, post-deploy observability pass):** **P1 ✅** landed & verified ([`estimateFieldBytes()`](../../src/core/webview/webviewPayloadMetrics.ts:169); ~98.7 % less hot-path monitoring CPU). **P2 ✅** landed & verified ([`extensionHostHealthMetrics.ts`](../../src/core/webview/extensionHostHealthMetrics.ts:1); `ROO_HOST_HEALTH_DEBUG`, log-only, off by default, no persistence/setting/egress; 12/12 tests). **P3 ✅** harness + docs landed ([`scripts/host-health-capture.sh`](../../scripts/host-health-capture.sh:1), self-test 28/28; runbook §5 + [analysis template](../runbooks/host-health-analysis-template.md:1)) — the capture itself is operator-run. **P0** (`clineMessages` bound) remains **uncommitted/unreleased** (`src/package.json` = `3.88.2`). The prioritization below is retained for provenance.

**Instrument-first** — but with one cheap, independent fix prioritized above further diagnosis.

| P      | Action                                                                                                                        | Why now                                                                                                                                           | Owner                       |
| ------ | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| **P0** | Land the [`clineMessages` bound](../../src/core/webview/clineMessagesForWebview.ts:164) (already written in the working tree) | Removes the dominant payload; expected to resolve the symptom (incident §8 row 6)                                                                 | release (already delegated) |
| **P1** | Implement the §3.5 **probe guard**                                                                                            | Removes ~7.6 ms/push of event-loop-blocking monitoring CPU that exists _only_ because we watch; measured ~99.7 % reduction; one file + unit tests | code mode (needs approval)  |
| **P2** | Implement §4 **`[host-health]` instrumentation** behind `ROO_HOST_HEALTH_DEBUG`                                               | Turns the next event from un-attributable into a one-line verdict; no repro needed                                                                | code mode (needs approval)  |
| **P3** | Run §5 capture for one session **before** the fixed build ships, then again after                                             | Establishes the remote host's baseline lag/CPU and proves/refutes H1                                                                              | user + observability        |
| **P4** | Apply §8.4 runbook delta; consider §8.3 notify-first UX                                                                       | Documentation of the actual causal split; no code risk                                                                                            | docs / product              |
| **P5** | Canary auto-reload                                                                                                            | Deferred — unsafe for the host (see §8.3)                                                                                                         | product (decision)          |

**Do not** claim H1 caused the `unresponsive` line from the current evidence (§3.3), and **do not** respond by adding RAM (incident §4).

## 10. What would falsify this plan

- If, on the fixed build (bound landed), `[host-health] max` remains > 3 s with **no** payload signal ⇒ H1 was not the cause; pursue H2/H3/H4 via §5.4.
- If §5.2 capture shows `/proc/pressure/cpu some avg10` > 10 % during the event ⇒ environmental (H3), regardless of payload size.
- If `state_serialize_ms` is small while the host is flagged unresponsive ⇒ the payload path is exonerated and the probe guard, while still worthwhile, is not the fix.

## Privacy note

All figures in this document are byte counts, millisecond/percentage measurements, and static `ExtensionState`/metric field names. No message content, task text, prompts, file paths, task IDs, or provider config values are reproduced. The proposed `[host-health]` telemetry is session-memory only, local output channel only, with no network egress and no Memento persistence — routing it to a remote sink requires a privacy review.
