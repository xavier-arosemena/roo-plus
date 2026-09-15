# Runbook: Gray (unresponsive) Roo+ webview

- **Audience:** users/operators hitting a pale-gray Roo+ panel, and maintainers triaging payload regressions.
- **Related:** [Postmortem 2026-09-09 — webview gray-out + console warnings](../postmortems/2026-09-09-webview-grayout-console-warnings.md) (fix branch `fix/console-warnings-webview-hang`, Roo+ issue #64 part C).
- **SLI:** `[webview-metrics]` lines in the Roo+ output channel + `RooCodeEventName.WebviewPayloadSize` events (issue #64 part A).

## 1. Symptoms

- The Roo+ panel turns **pale gray** with nothing rendering.
- The agent task **continues** in the extension host: commands run, messages stream, cost accrues.
- The chat **input is dead** — Accept/Save buttons do not respond, typing does nothing.
- Recurs multiple times per session; may also block approving extension tool calls (observed as "interrupted").

This is a **webview-renderer** failure, not an extension-host hang.

## 2. Triage order

Work through these in order; stop at the first hit.

1. **Large-state warning (devtools).**
   Help → Toggle Developer Tools → Console. Look for:
   `WARN [mainThreadStorage] large extension state detected (extensionId: xavier-arosemena.roo-plus, global: true): <N> kb`
   A multi-MB value (> ~1.5 MB) here = the legacy `taskHistory` Memento mirror is live (pre-3.88.1 build). Continue to §3 mitigation.
   Note: on `3.88.1` a residual ~750–1100 KB reading was expected while the `customModes` mirror remained in Memento (postmortem §5a); that mirror is **removed on `3.88.2`+**, so a persistent multi-hundred-KB reading on a `3.88.2`+ build is no longer expected and indicates a newly-introduced writer rather than the known follow-up.

2. **Payload-size WARN lines (Roo+ output channel).**
   Output panel → channel **Roo+**. Look for:
   `[webview-metrics] WARN "state" payload <N>KB > 256KB top[...]`
   or `[webview-metrics] ERROR "state" payload <N>KB > 1MB ...`.
   The `top[...]` field breakdown names the biggest static state fields
   (`clineMessages` / `taskHistory` / `customModes` / `messageQueue` /
   `marketplaceItems`) in KB — that identifies the regression owner without
   exposing any content.

    **What each field means (post-`3.88.2`):**
    - `customModes` / `taskHistory` large again → one of the bounded projections
      regressed; re-open postmortem §5a / issue #64.
    - `clineMessages` large (**the dominant field on `3.88.2`, before the bound
      landed**) → a **long task** is open, and its full transcript is being
      re-shipped on every `state` push. Signature: the ERROR appears immediately
      after `[createTaskWithHistoryItem] … instantiated` when reopening a task
      from history. See the [2026-09-15 incident report](../incidents/2026-09-15-clineMessages-state-payload.md).
      **Fixed on the `3.88` line after `3.88.2`** (incident §7a): `state` pushes now
      ship a tail-anchored, byte-bounded window plus the transcript's head anchor,
      and the omitted middle is lazy-fetched by the chat view. On a build that
      includes that fix, a large `clineMessages` means the projection **regressed**
      → re-open the incident report; it is no longer "just a long task".
      (Expected residue on such a build: ≈140 KB per push, well under the WARN
      threshold.)
    - Multiple fields large at once → re-check §4a (Memento blob).

    The **"over 1 MB" popup** and the `ERROR` line are the SLI doing its job — they
    mean the payload crossed the threshold, not that the renderer has died. Treat
    them as a near-miss signal and continue triage; see §4 for the escalation route.

    **Co-occurring `INFO Extension host (Remote) is unresponsive.` / `is responsive.`**
    When this line appears in the same window as large-payload `ERROR`s, treat it as a
    **more severe expression of the same payload problem**, not an unrelated bug: multi-MB
    payloads serialized + structured-cloned at high frequency can saturate the remote
    host's event loop. This is still **not** a RAM ceiling — do not respond by adding RAM.
    Confirm with `Help → Open Process Explorer` (hot/unresponsive **extension host** process)
    or remote `top`/`ps` captured **during** the event, then see incident §10. An
    extension-host hang with **no** large-payload signal is different — see §4.

3. **Environmental branch check (postmortem item 5).**
   Does the **Markdown preview** (or any other webview, e.g. built-in Simple Browser) gray out **at the same time**, across multiple windows — possibly on **different remote servers**?
    - **Yes** → environmental: per-window Roo+ data cannot explain simultaneity. Likely the shared webview-resource layer (remote auth-token expiry under load / Electron GPU-process pressure). Check `Help → Open Process Explorer` for a dead/hot GPU/renderer process; re-focusing the window may recover it. Escalate per §4 (upstream VS Codium issue), not as a Roo+ payload bug.
    - **No** (only Roo+ grays) → proceed to step 4.

4. **Version check — is this a fixed build?**
   Compare the installed version against the release line containing the fix
   (branch `fix/console-warnings-webview-hang`; see postmortem §6 watch log —
   the `3.88.0` pre-release did **not** contain the fixes). Fixed builds bound
   `taskHistory` in the webview payload (cap 100), never re-write the Memento
   mirror, and clear the legacy key on startup. If on a pre-fix version,
   install the fixed VSIX (§3 mitigation B) for the permanent cure.

## 3. Immediate mitigations

**A. Reload the window (always safe, works when the renderer is wedged):**
Command Palette → `Developer: Reload Window`.

**B. Purge the `state.vscdb` taskHistory blob (≤ 3.88.0, local machine only):**
Follow [postmortem §4a](../postmortems/2026-09-09-webview-grayout-console-warnings.md#4a-interim-mitigation-run-now-on-the-local-machine-until-the-fixed-build-is-installed)
step by step (quit all editor windows first; python3 snippets, no install
needed; surgical strip of only the nested `taskHistory` fields — do **not**
delete the extension-id row).

> **Re-fill caveat:** on v3.87.x/≤3.88.0 the purge is **temporary** — the
> installed release re-writes the Memento mirror ~5 s after any task-history
> change. Only the fixed build (which clears the key on startup and never
> rewrites it) is a permanent cure.

## 4. Escalation matrix

| Situation                                                                  | Route to                                                                                                                                                                                                              |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `[webview-metrics]` WARN/ERROR lines reproduce with a specific pattern     | **Debug mode** — payload regression investigation (capture the `top[...]` field breakdown)                                                                                                                            |
| Multi-window / non-Roo+ webviews gray simultaneously (triage step 3 = yes) | **Upstream VS Codium issue** — environmental webview-resource/GPU factor (postmortem item 5)                                                                                                                          |
| Fixed build installed but large-state warning persists                     | Roo+ issue #64 — reopen Memento-clear path; include §4a step-2 inspection output (sizes only)                                                                                                                         |
| Extension host unresponsive **with** a co-occurring large-payload `ERROR`  | Payload-driven host CPU saturation — see [incident §10](../incidents/2026-09-15-clineMessages-state-payload.md); capture Process Explorer/`top` during the event; the `clineMessages` bound is expected to resolve it |
| Extension host hangs **without** any large-payload signal                  | Out of scope for this runbook — separate investigation                                                                                                                                                                |

For the last two rows, do not wait for a reproduction: run the always-on capture in §5 and let the
next event classify itself (H1 payload CPU / H2 checkpoint-IO / H3 environmental / H4 GC).

## 5. Capture protocol (extension-host health, no reproduction required)

Purpose: capture the next `INFO Extension host (Remote) is unresponsive.` event with host-side
numbers, so it is attributable — H1 payload CPU, H2 concurrent checkpoint/IO work, H3 environmental
contention, H4 GC/memory — instead of being a one-line mystery.

- Harness: [`scripts/host-health-capture.sh`](../../scripts/host-health-capture.sh) (implements
  [incident](../incidents/2026-09-15-extension-host-unresponsive-diagnosis.md) §5.1-§5.3).
- Verdict checklist: [`host-health-analysis-template.md`](./host-health-analysis-template.md)
  (incident §5.4 discriminator table + §7 decision tree as a fill-in form).

### 5.1 Availability split — read this before running anything

| Part                                | What it gives you                                                                                                                                 | Requires                                                                                                                                                                                                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **(a) Host-side capture**           | EH `%CPU` (`%usr`/`%system`), RSS, `kB_rd/s`/`kB_wr/s`/`iodelay`, PSI (`/proc/pressure/*`), and `top`/`free`/`loadavg`/`nproc`/steal snapshots    | **Nothing from this repo.** Works today against the installed release build (e.g. `3.88.2`) on the remote host.                                                                                                                                                 |
| **(b) `[host-health]` correlation** | `elu_ms` (event-loop lag), `jitter_ms`, `cpu_pct`, `state_serialize_ms`, `state_msgs` — the lines that tie host lag to payload serialization cost | A build that contains **P2** ([`extensionHostHealthMetrics.ts`](../../src/core/webview/extensionHostHealthMetrics.ts:1)), which exists **only in the uncommitted working tree** — i.e. a dev build or the next pre-release — plus the server-side flag in §5.2. |

**On a released build you get (a) plus `[webview-metrics]` — and no `[host-health]` lines.**
Do not run the (b) correlation against a release build and conclude the instrumentation is broken:
that half of the correlation is simply not in that binary. The (a) half is useful on its own (it is
what distinguishes H2/H3/H4 when no payload signal fired).

### 5.2 Enabling `[host-health]` on a remote-SSH host (server side, not the integrated terminal)

The extension host is spawned by the **remote vscodium-server**, so the variable must be in the
**server's** environment. `terminal.integrated.env.linux` — and anything you `export` in the VS Codium
integrated terminal — does **not** reach the extension host.

```bash
# On the REMOTE host, append to the profile the server inherits:
echo 'export ROO_HOST_HEALTH_DEBUG=1' >> ~/.bashrc
# Then RESTART the remote server so the extension host is re-spawned with it:
#   Command Palette -> "Kill VS Code Server on Host"   (or fully quit VS Codium)
```

Verify from the Roo+ output channel that `[host-health]` lines appear. If they do not, the server was
not restarted — the profile edit alone does not apply to the already-running server. The flag is off
by default, session-memory only, and logs numbers + static field names only.

### 5.3 Start / stop the capture (remote host terminal)

```bash
# §5.1: resolve the extension-host PID once per session.
# Cross-check in the GUI: Help -> Open Process Explorer shows it as "extensionHost".
EHPID=$(pgrep -f extensionHostProcess.js | head -1)

# Always-on capture for the whole session (background terminal); Ctrl-C to stop.
bash scripts/host-health-capture.sh --out-dir /tmp/roo-perf
```

**Newer server builds do not use `extensionHostProcess.js`.** They spawn the host as
`node …/out/bootstrap-fork --type=extensionHost`, so the §5.1 `pgrep` line above can return
nothing while a host is plainly running (the sibling `--type=fileWatcher` process is a different
one — do not capture that). The harness therefore tries the documented primary pattern first and
then `--type=extensionHost` (override with `$ROO_EH_PATTERN_FALLBACK`), and only asks for `--pid`
(`--pid "$EHPID"`) if neither matches. `Help → Open Process Explorer` remains the GUI cross-check.

- Artifacts default to `/tmp/roo-perf` (`--out-dir` or `$ROO_PERF_OUT_DIR` overrides it); the run
  prints the exact file list on exit.
- Sampler preference: `pidstat -u -r -d` when `sysstat` is installed; otherwise a
  `/proc/<pid>/stat` delta loop that honours `getconf CLK_TCK` (it does **not** assume 100 ticks/s).
  PSI (`/proc/pressure/*`) is sampled either way.
- **During** the event (second remote terminal), take the §5.3 instant snapshot:
  `bash scripts/host-health-capture.sh --snapshot --pid "$EHPID"`.
- Stop only **after** the `is responsive` line, so the whole event window is captured.
- If the remote server restarts the extension host mid-capture the recorded PID goes stale (the
  sampler artifact shows a `target_gone`/pidstat error, and `meta.txt` records the PID actually
  captured, so this is detectable). Re-run the harness — it re-resolves the PID — rather than
  correlating a stale window.
- `--self-test` validates the harness anywhere (no extension host, no `sysstat` needed); `--help`
  lists every option (`--duration`, `--label`, `--proc`, `--snapshot-every`, …).

| Artifact (timestamped, in `--out-dir`)     | Content                                                                                   |
| ------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `<stamp>[-label].meta.txt`                 | target PID + how it was resolved, `CLK_TCK`, host, `nproc`, sampler mode                  |
| `<stamp>[-label].pidstat` (or `.proc-cpu`) | per-second `%usr`/`%system`/`%CPU`, RSS, `kB_rd/s`/`kB_wr/s`/`iodelay`                    |
| `<stamp>[-label].psi.log`                  | `/proc/pressure/{cpu,io,memory}` every 5 s — the H3 discriminator                         |
| `<stamp>[-label].snapshot.log`             | instant snapshot: `top -b -n1`, `loadavg`/`nproc`, `free -m`, `/proc/<pid>/status`, steal |

### 5.4 Correlation procedure (one ~60 s window, three sources)

1. Take the 60 s window of the `INFO … unresponsive` / `is responsive` pair.
2. Same window, Roo+ output channel: `[webview-metrics]` (`WARN`/`ERROR` and the periodic
   `state_msgs=… p50/p99/max` summary) and — only on a **(b)** build — `[host-health]`
   (`elu_ms`, `jitter_ms`, `cpu_pct`, `state_serialize_ms`).
3. Same window, the harness artifacts: EH `%CPU` shape (pegged vs idle-but-blocked), `iodelay`,
   PSI `some avg10` / `full avg10`, and the snapshot's `loadavg / nproc` + `st` (steal).
4. Record the verdict in [`host-health-analysis-template.md`](./host-health-analysis-template.md).

Expected shapes (incident §6.1-§6.4): the `[host-health]` lag window should be the **same 60 s
window** as the payload `ERROR`; H1-compatible PSI is `< 5 %`; H3-compatible is `> 10 %` (with
`full avg10 > 5 %`) and/or `st > 0`. Lag large **without** any payload signal ⇒ the payload is not
the cause (H2/H3/H4 branch).

### 5.5 Hygiene — local-only artifacts

- **No network egress.** The harness makes no network calls, uploads nothing, and emits no telemetry;
  it is operator-run shell tooling, not extension code.
- Artifacts contain **host-level data** (PIDs, process cmdlines, paths, load/pressure). They stay on
  the operator's machine — **delete them after analysis** (`rm -rf /tmp/roo-perf`).
- The harness never reads or copies workspace file contents into its artifacts, and `[host-health]` /
  `[webview-metrics]` lines carry numbers and static field names only.

## 6. Post-fix verification checklist (postmortem §6 watch criteria)

After installing the fixed build, confirm all of:

- [ ] `mainThreadStorage` large-state warning **disappears after one session** (legacy key cleared on startup).
- [ ] `state` message payloads stay **< ~200 KB**: periodic `[webview-metrics] state_msgs=N p50=…KB p99=…KB max=…KB` summary lines show `max` under the 256 KB WARN threshold during normal streaming.
- [ ] **Zero** `[webview-metrics] WARN`/`ERROR` lines during normal use.
- [ ] **Zero gray-out events** during active agent tasks (especially remote-SSH sessions).
- [ ] History panel still renders (recent list; full history remains file-backed under `globalStorage/tasks/…`).

## Privacy note

All `[webview-metrics]` SLI data is **local-only**:

- Metrics live in **session memory only** — nothing is persisted to
  `globalState`/Memento/`state.vscdb` (a growing persisted state blob is the
  exact bug this branch fixed).
- Logged/emitted data is restricted to **byte-size integers**, the literal
  message kind `"state"`, and **static ExtensionState field names**
  (`clineMessages`, `taskHistory`, …). Message content, task text, prompts,
  file paths, task IDs, provider config values, and identifiers are never
  logged or emitted.
- There is **no network egress** of any metric, event, or log line. Output is
  the local Roo+ output channel, the one-time local VS Code warning popup, and
  the typed `WebviewPayloadSize` event consumed only by local programmatic
  consumers (extension host / local CLI event stream). Routing that event to
  any remote sink requires a privacy review.
