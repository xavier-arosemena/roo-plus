# Post-deploy watch: agent prompt (copy-paste)

Reusable prompt pair for the **post-deploy monitoring pass** on the Roo+ `3.88` line.
Companion docs:
[`gray-webview.md`](gray-webview.md), [`host-health-analysis-template.md`](host-health-analysis-template.md),
[`../incidents/2026-09-15-clineMessages-state-payload.md`](../incidents/2026-09-15-clineMessages-state-payload.md),
[`../incidents/2026-09-15-extension-host-unresponsive-diagnosis.md`](../incidents/2026-09-15-extension-host-unresponsive-diagnosis.md).

## When to run — two passes, not one

| Pass                 | When                                                         | Purpose                                                                                                        | Why this order                                                                                                        |
| -------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **A — verify & arm** | **Immediately after deploy**                                 | Confirm the fixes are actually in the _installed_ build; run the §6 checklist; **start the always-on capture** | You must verify the release, and the capture has to be running **before** the next event or the event is lost forever |
| **B — analyze**      | **After the first event, or at the end of the watch window** | Attribute any `unresponsive` event (H1/H2/H3/H4); check for a payload regression; record it                    | Needs Pass A's running capture + `[host-health]` baseline                                                             |

**Do not skip Pass A and wait for an event.** Two reasons: (1) a build can ship _without_ the fixes — verify, never assume (precedent: `3.88.0` shipped without the branch fixes, postmortem §6); (2) a capture started after the event has nothing to show.

Run both passes in **📈 Deployment Monitor**. Hand off to **⚡ Performance Engineer** or **🪲 Debug** only if Pass B needs deeper attribution.

---

## Pass A — verify & arm (run immediately after deploy)

```text
ROLE: Post-deployment monitoring pass for Roo+ (VS extension `xavier-arosemena.roo-plus`, version line 3.88).

READ FIRST:
- docs/runbooks/gray-webview.md            (triage, §5 capture protocol, §6 post-fix checklist, §4 escalation matrix)
- docs/runbooks/host-health-analysis-template.md  (verdict checklist)
- docs/incidents/2026-09-15-clineMessages-state-payload.md        (payload incident; a/b/c ruling)
- docs/incidents/2026-09-15-extension-host-unresponsive-diagnosis.md (§5 capture, §7 decision tree)

DEPLOYMENT CONTEXT — capture first (ask me for anything you cannot determine):
- Version installed: ____
- Commit / release tag: ____
- Rollout scope: ____   (Open VSX pre-release | stable | local VSIX)
- Watch window: ____    (e.g. 24h, or one full remote-SSH working session)
- Environment: VS Codium <ver>, Linux, remote-SSH to <host>; extension host on local or remote?

TASK A1 — Verify the three fixes are in the INSTALLED build (not just the repo):
  P0 bounded clineMessages · P1 SLI probe guard · P2 [host-health] instrumentation
  a) Locate the installed extension on the host that runs the panel:
       ls -d ~/.vscodium-server/extensions/xavier-arosemena.roo-plus-*  2>/dev/null
       ls -d ~/.vscode-server/extensions/xavier-arosemena.roo-plus-*    2>/dev/null
  b) Check the shipped bundles for each fix marker (adapt <INSTALLED>):
       grep -rl 'projectClineMessagesForWebview\|boundClineMessagesForWebview' <INSTALLED>/dist | head
       grep -rl 'estimateFieldBytes'                                           <INSTALLED>/dist | head
       grep -rl 'ROO_HOST_HEALTH_DEBUG\|extensionHostHealthMetrics'            <INSTALLED>/dist | head
  c) Report PRESENT/ABSENT per fix. If a marker is ABSENT, that fix is NOT live: say so explicitly and skip its verification.
     Never assume "deployed" == "fixed".

TASK A2 — Run the post-fix checklist (runbook §6) and record each result:
  [ ] mainThreadStorage large-state warning gone after one session
  [ ] `[webview-metrics]` state payloads < ~200 KB (watch `state_msgs=... p50=... p99=... max=...`)
  [ ] zero `[webview-metrics]` WARN/ERROR during normal use
  [ ] zero gray-out events during active tasks (especially remote-SSH)
  [ ] History panel still renders

TASK A3 — Arm the passive capture BEFORE any event (this is what makes Pass B possible):
  On the REMOTE host:
       bash scripts/host-health-capture.sh --out-dir /tmp/roo-perf &      # always-on; Ctrl-C to stop
       # or bounded:  bash scripts/host-health-capture.sh --duration 3600 --label watch
  For [host-health] correlation (requires a build containing P2) set the flag in the SERVER's env, then restart the server:
       echo 'export ROO_HOST_HEALTH_DEBUG=1' >> ~/.bashrc
       # then: Command Palette -> "Kill VS Code Server on Host"
  Confirm artifact files are being written, and (only if P2 is present) that `[host-health]` lines appear.

TASK A4 — Take a baseline snapshot for THIS deploy: record the first window's
  `[webview-metrics]` line and, if available, the first `[host-health]` line, plus the capture file names.

ACCEPTANCE (Pass A): a verification note stating, per fix, PRESENT/ABSENT in the installed build; the §6
checklist result; and confirmation that the capture is running + its artifact paths.

CONSTRAINTS:
- LOCAL-ONLY. No uploads, no egress, no telemetry. Artifacts stay on the operator's machine
  (delete with `rm -rf /tmp/roo-perf` after analysis).
- Do NOT change payload semantics, alert thresholds, or the P0/P1/P2 logic during a watch pass.
- Repo policy: no .changeset, no CHANGELOG edits, no version bump; src/package.json must not change.
- Record the pass in docs/postmortems/2026-09-09-webview-grayout-console-warnings.md §6 (append a dated entry).
```

---

## Pass B — analyze (run on the first event, or at the end of the watch window)

```text
ROLE: Post-deployment monitoring ANALYSIS pass for Roo+ 3.88, after the Pass-A deploy verification.

READ FIRST:
- docs/runbooks/host-health-analysis-template.md   (fill this in — it drives the verdict)
- docs/runbooks/gray-webview.md                    (§5 correlation procedure + §4 escalation matrix)
- docs/incidents/2026-09-15-extension-host-unresponsive-diagnosis.md  (§5.4 discriminators, §7 decision tree)
- docs/incidents/2026-09-15-clineMessages-state-payload.md            (§10 the a/b/c ruling)

INPUTS: the capture artifacts under /tmp/roo-perf, plus the Roo+ output channel for the event window
        (`[webview-metrics]` + `[host-health]`) and any `INFO Extension host (Remote) is unresponsive.` line(s).

TASK B1 — Did the payload regression recur?
  If any `[webview-metrics]` WARN/ERROR fired, capture the `top[...]` breakdown:
    - `clineMessages` large again     -> P0 regressed: re-open the incident.
    - `customModes`/`taskHistory`     -> a bounded-projection regression.
    - a single oversized message      -> the known residual risk (follow-up row 5).

TASK B2 — Attribute any host `unresponsive` event (H1/H2/H3/H4) using §5.4 + §7.
  Correlate the SAME ~60 s window across `[host-health]`, `[webview-metrics]`, and the capture
  (EH %CPU, PSI, steal, loadavg, RSS, iowait):
    - H1 payload CPU      : large state_serialize_ms + pegged EH %CPU + LOW host pressure.
    - H2 concurrent work  : bursty CPU aligned to checkpoints/IO; high iowait.
    - H3 environmental    : unresponsive while EH %CPU is low, but PSI/steal/load high;
                            or multi-window / multi-server simultaneity.
    - H4 memory/GC        : RSS/heap climbing at steady workload; check memory.events/oom_kill.
  Do NOT assert H1 unless ALL THREE H1 conditions hold; otherwise report "not attributable" and
  state exactly which measurement is missing.

TASK B3 — Record outcomes:
  - Append a dated entry to docs/postmortems/2026-09-09-webview-grayout-console-warnings.md §6.
    Byte sizes, milliseconds, percentages, and static field names ONLY — never content, IDs, or paths.
  - If a regression or a new detection gap is found: create/append a doc under docs/incidents/ and
    state the exact next action + owner.
  - Recommend automation (e.g. canary renderer reload, a probe guard for a new field) only when a gap REPEATS.

ACCEPTANCE (Pass B): a one-line verdict per observed event
  (healthy | H1 | H2 | H3 | H4 | not attributable) backed by the specific measurements,
  with the watch-log entry appended.

CONSTRAINTS: identical to Pass A — local-only, no telemetry, no payload/threshold changes,
  no changeset/CHANGELOG/version bump, do not modify P0/P1/P2 logic.
```

---

## If the screen grays out while you watch

Immediate mitigation (runbook §3): `Developer: Reload Window`. Then run Pass B. Keep the capture running —
the window you need is the one _around_ the freeze, which is why Pass A arms it first.
