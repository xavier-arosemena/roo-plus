# Host-health capture: analysis template (fill-in checklist)

- **Purpose:** turn one captured `INFO Extension host (Remote) is unresponsive.` event into a verdict
  (H1 payload CPU / H2 concurrent checkpoint-IO / H3 environmental / H4 GC-memory) **without
  re-deriving** the logic.
- **Sources of truth:** [incident diagnosis §5.4 (discriminators)](../incidents/2026-09-15-extension-host-unresponsive-diagnosis.md)
  and [§7 (decision tree)](../incidents/2026-09-15-extension-host-unresponsive-diagnosis.md); protocol
  and artifacts are documented in [runbook §5 "Capture protocol"](./gray-webview.md).
- **Harness:** [`scripts/host-health-capture.sh`](../../scripts/host-health-capture.sh) · **Result file:**
  copy this template per event, e.g. `perf/host-health-<date>-<label>.md`.

Fill in the blanks; then tick exactly one verdict in step 4 and follow its action. Do not skip step 1's
build check — half of the correlation is unavailable on a released build.

---

## Step 0 — Provenance (fill before reading any number)

| Field                                                                                                                      | Value                  |
| -------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| Event date/time (UTC) + window start/end                                                                                   | `____`                 |
| Build/version under test                                                                                                   | `____` (e.g. `3.88.2`) |
| Does the build contain **P2** ([`extensionHostHealthMetrics.ts`](../../src/core/webview/extensionHostHealthMetrics.ts:1))? | `yes / no ____`        |
| `ROO_HOST_HEALTH_DEBUG=1` set in the **remote server's** environment (runbook §5.2) + server restarted?                    | `yes / no ____`        |
| `[host-health]` lines actually present in the Roo+ output channel?                                                         | `yes / no ____`        |
| Capture artifacts (paths)                                                                                                  | `____`                 |
| Target PID / resolution method (`meta.txt`)                                                                                | `____`                 |
| `CLK_TCK`, sampler mode (`pidstat` vs `proc`), `nproc` (`meta.txt`)                                                        | `____`                 |
| `[webview-metrics]` lines present for the window?                                                                          | `yes / no ____`        |

**If P2 is absent (`no`):** columns marked **(b)** below cannot be filled. Record `n/a` — do **not**
infer lag/jitter/serialize numbers, and do **not** conclude "no correlation" from their absence.
(a)-only verdicts (H2/H3/H4 patterns, and "payload fired but was a side-effect") remain valid.

---

## Step 1 — Did a payload signal fire in the same ~60 s window?

- [ ] `[webview-metrics] WARN` (> 256 KB) or `ERROR` (> 1 MB) in the window: `____` (paste the line)
- [ ] Periodic `state_msgs=… p50=…KB p99=…KB max=…KB` summary for the window: `____`
- [ ] `unresponsive` line timestamp `____` · `is responsive` line timestamp `____` (duration `____` s)

- [ ] **NO payload signal** → go to **step 3 (branch B)**.
- [ ] **YES payload signal** → go to **step 2**, then **step 3 (branch A)**.

---

## Step 2 — Measurements in the window (fill each; "how" says where to look)

| #   | Measurement                                               | How                                                 | H1 expects                       | H2 expects                                             | H3 expects                                                  | H4 expects                    | Observed |
| --- | --------------------------------------------------------- | --------------------------------------------------- | -------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------- | ----------------------------- | -------- |
| 1   | EH `%CPU` during the event                                | `pidstat`/`proc-cpu`, or Process Explorer           | high, pegged ~100 % of one core  | high but bursty, aligned to checkpoint/file-watch      | **low** (blocked, not running)                              | moderate, sawtooth            | `____`   |
| 2   | EH `%usr` vs `%system` (split)                            | `.pidstat` columns                                  | `%usr`-dominant                  | mixed                                                  | low both                                                    | moderate `%system`            | `____`   |
| 3   | IOwait / disk for the EH                                  | `.pidstat` `%wait`, `kB_rd/s`, `kB_wr/s`, `iodelay` | low                              | **high iowait / disk**                                 | variable                                                    | low                           | `____`   |
| 4   | `state_serialize_ms` p99/max **(b)**                      | `[host-health]` line                                | co-occurs and is large (>= WARN) | small/normal                                           | small/normal                                                | small/normal                  | `____`   |
| 5   | Correlation with push rate                                | drop pausing the task (~1 s)                        | **strong**                       | strong with `saveCheckpoint`/file-watch, not push rate | none                                                        | weak                          | `____`   |
| 6   | `/proc/pressure/cpu` `some avg10`                         | `.psi.log`                                          | **< 5 %**                        | low                                                    | **> 10 %** (`full avg10` > 5 %)                             | low                           | `____`   |
| 7   | `steal` (`st`) in `top`                                   | `.snapshot.log` `cpu_line`                          | ~0                               | ~0                                                     | **> 0**                                                     | ~0                            | `____`   |
| 8   | `loadavg / nproc`                                         | `.snapshot.log`                                     | < 1                              | < 1-2                                                  | **> 1 sustained**                                           | ~1                            | `____`   |
| 9   | RSS/heap trend over the session                           | `.pidstat` RSS, `[host-health]` `rss_mb`/`heap_mb`  | flat                             | flat                                                   | flat                                                        | **climbing** / `oom_kill` > 0 | `____`   |
| 10  | Event-loop lag p99/max **(b)**                            | `[host-health]` `elu_ms`                            | **p99 > 200 ms, max > 1 s**      | 50-200 ms bursts                                       | variable/large but **without** CPU or serialize correlation | large sawtooth                | `____`   |
| 11  | Heartbeat jitter max **(b)**                              | `[host-health]` `jitter_ms`                         | large (follows lag)              | small                                                  | large                                                       | large sawtooth                | `____`   |
| 12  | Multi-window, **different** remote servers, simultaneous? | operator observation                                | no                               | no                                                     | **yes** (postmortem item 5 signature)                       | no                            | `____`   |

---

## Step 3 — Branch A: payload signal fired (incident §7)

- [ ] `state_serialize_ms` p99 large **(b)** **AND** EH `%CPU` pegged **AND** PSI `some avg10 < 5 %`
      **AND** `steal ~ 0` → **H1 CONFIRMED** (all three must hold together).
- [ ] EH `%CPU` pegged but PSI `some avg10 > 10 %` **OR** `steal > 0` **OR** `loadavg/nproc > 1`
      → host was starved → **H3** (even though a payload fired).
- [ ] Payload fired but `state_serialize_ms` normal **(b)** **AND** CPU **not** pegged
      → payload is a **side-effect, not the cause** → continue into **step 3 branch B**.

## Step 3 — Branch B: no payload signal (or payload exonerated)

- [ ] EH `%CPU` **low** while flagged unresponsive:
    - [ ] PSI/steal/load high → **H3 (environmental)**.
    - [ ] PSI flat **and** RSS climbing → **H4 (GC/memory)** — check `memory.events` `oom_kill`.
- [ ] EH `%CPU` **bursty**, aligned to checkpoint saves / file-watch / disk (iowait high)
      → **H2 (concurrent task work)** — profile `saveCheckpoint` + file watchers.
- [ ] None of the above / cannot tell → **INSTRUMENT-FIRST**: enable `ROO_HOST_HEALTH_DEBUG=1`
      (server side, runbook §5.2), run the always-on capture (runbook §5.3), wait for the NEXT event
      (no reproduction needed).
- [ ] Multiple windows on **different** remote servers unresponsive simultaneously
      → **H3 (environmental, postmortem item 5)** — per-window Roo+ data cannot explain simultaneity.

---

## Step 4 — Verdict and action (tick one)

- [ ] **H1 payload CPU — CONFIRMED.** Action: land the `clineMessages` bound (already in the working
      tree); land the incident §3.5 probe guard; re-verify on the fixed build (incident §8 row 6).
- [ ] **H2 concurrent task work.** Action: profile `saveCheckpoint` + file watchers / disk;
      not a payload regression; keep the capture running across the next event.
- [ ] **H3 environmental / host contention.** Action: postmortem item 5 branch — Process Explorer for
      a dead/hot GPU/renderer, noisy-neighbour check on the remote host (PSI `full`, `st`, `loadavg`);
      escalate upstream (VS Codium), **not** as a Roo+ payload bug.
- [ ] **H4 GC / memory.** Action: check `memory.events` (`oom_kill`) and the heap/RSS sawtooth; treat
      the payload garbage as a _contributor_ (H4 can co-exist with H1), not the sole cause.
- [ ] **Indeterminate — instrument-first.** Action: (b) build + flag + capture, wait for the next event.

One-line summary for the incident/ticket: `____`

## Step 5 — Falsifiers to record (incident §10)

- [ ] If, on the fixed build (bound landed), `[host-health] max` stays > 3 s with **no** payload
      signal ⇒ H1 was not the cause → pursue H2/H3/H4.
- [ ] If capture shows `/proc/pressure/cpu some avg10 > 10 %` during the event ⇒ environmental (H3),
      regardless of payload size.
- [ ] If `state_serialize_ms` is small while the host is flagged unresponsive ⇒ the payload path is
      exonerated (the probe guard remains worthwhile, but it is not the fix).

## Hygiene (do this when finished)

- Artifacts are **local-only** and contain host-level data (PIDs, process cmdlines, paths, load).
  Nothing is uploaded and there is no network egress.
- **Delete the artifacts after analysis** (`rm -rf /tmp/roo-perf`) and keep only this filled-in form
  (numbers and static field names only — never paste payload/message content here).
