> **[redacted]** Remote-SSH host identifiers in this record were replaced with placeholders so
> this file is safe to serve from the public repo: host A's SSH alias and kernel hostname →
> `<remote-A>`, and host B's public IPv4 address → `<remote-ip>`. Only the identifiers changed —
> measurements, timings, byte counts and conclusions are unaltered.

# Host-health capture — analysis result (filled-in form)

- **Event:** 2026-09-16 · Roo+ **3.88.3** · post-deploy monitoring **Pass B**
- **Verdict:** **HEALTHY — no `INFO Extension host (Remote) is unresponsive.` event observed.**
  One payload `[webview-metrics] WARN` fired and is attributed under B1; there is **no host
  event to classify** under B2 (none of H1/H2/H3/H4, and not "not attributable" — nothing fired).
- **Sources of truth:** [incident §5.4 / §7](../../incidents/2026-09-15-extension-host-unresponsive-diagnosis.md) ·
  [runbook §5](../gray-webview.md) · template: [host-health-analysis-template.md](../host-health-analysis-template.md)
- **Harness:** [`scripts/host-health-capture.sh`](../../../scripts/host-health-capture.sh)

> This form was filled for a window in which **no** `unresponsive` pair occurred. Steps 1–3 are
> therefore recorded as observed, and Step 4 ticks no hypothesis. The provenance, measurements
> and the two captured gaps (G1/G2) are the substance of this result.

---

## Step 0 — Provenance

| Field                                                                                                                         | Value                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Event date/time (UTC) + window start/end                                                                                      | `2026-09-16` — observed Roo+ window ~`14:2xZ` (pasted channel carries **no** timestamps); capture `10:04:19Z → ≥14:31:20Z` |
| Build/version under test                                                                                                      | `3.88.3` (installed `xavier-arosemena.roo-plus-3.88.3-universal`)                                                          |
| Does the build contain **P2** ([`extensionHostHealthMetrics.ts`](../../../src/core/webview/extensionHostHealthMetrics.ts:1))? | `yes` (P2 present — Pass A; `[host-health]` lines emitted here)                                                            |
| `ROO_HOST_HEALTH_DEBUG=1` in the **remote server's** environment + server restarted?                                          | `yes` (Pass A; `[host-health]` lines present in this window)                                                               |
| `[host-health]` lines actually present in the Roo+ output channel?                                                            | `yes` — 6 consecutive windows                                                                                              |
| Capture artifacts (paths)                                                                                                     | `/tmp/roo-perf/20260916-100419-watch-3883-s2.{meta.txt,pidstat,psi.log}` + `…-baseline.snapshot.log`                       |
| Target PID / resolution method (`meta.txt`)                                                                                   | `1208955` via `pgrep -f --type=extensionHost` — **went stale at 14:21:41Z** (see gap G2)                                   |
| `CLK_TCK`, sampler mode (`pidstat` vs `proc`), `nproc` (`meta.txt`)                                                           | `clk_tck=100` · `pidstat` · `nproc=2` (host `<remote-A>`, `Linux 6.8.0-107-generic`)                                       |
| `[webview-metrics]` lines present for the window?                                                                             | `yes` — 1 `WARN` + 1 summary                                                                                               |

P2 is **present**, so the (b) columns are filled from the real `[host-health]` line (not inferred).

---

## Step 1 — Did a payload signal fire in the same ~60 s window?

- [x] `[webview-metrics] WARN` (> 256 KB) in the window:
      `[webview-metrics] WARN "state" payload 634KB > 256KB top[taskHistory=560KB customModes=71KB clineMessages=0KB] runbook=docs/runbooks/gray-webview.md`
- [x] Periodic summary for the window: `[webview-metrics] state_msgs=2 p50=335KB p99=634KB max=634KB`
- [ ] `unresponsive` line timestamp `—` · `is responsive` line timestamp `—` (duration `—`)
- [ ] **NO payload signal** → N/A
- [x] **YES payload signal** → Step 2, then Step 3 **branch A** — **but branch A presumes an
      `unresponsive` event; none is present**, so the branch-A discriminators are recorded only
      as "present/absent", not used to assign a verdict.

---

## Step 2 — Measurements in the window

(a)-side per-process capture is **absent** for this window (EH restarted; `pidstat` target stale
→ gap G2). Values below are the (b) `[host-health]` line + host-level PSI from `.psi.log`.

| #   | Measurement                                    | H1 expects               | H2 expects                 | H3 expects                   | H4 expects         | Observed                                                                   |
| --- | ---------------------------------------------- | ------------------------ | -------------------------- | ---------------------------- | ------------------ | -------------------------------------------------------------------------- |
| 1   | EH `%CPU` during the event                     | high, pegged             | bursty, checkpoint-aligned | **low** (blocked)            | moderate sawtooth  | `cpu_pct=2–8 %` (b); (a) stale — max `99 %` earlier, see below             |
| 2   | EH `%usr` vs `%system`                         | `%usr`-dominant          | mixed                      | low both                     | moderate `%system` | usr-dominant when hot (`94/5`, `86/10`)                                    |
| 3   | IOwait / disk for the EH                       | low                      | **high iowait / disk**     | variable                     | low                | (a) stale; disk bursts `kB_wr/s` ≤195 MB/s, `kB_rd/s` ≤126 MB/s            |
| 4   | `state_serialize_ms` p99/max **(b)**           | large (≥ WARN)           | small/normal               | small/normal                 | small/normal       | `p50=0 p99=9 max=9` (n=2), then `0`                                        |
| 5   | Correlation with push rate                     | strong                   | strong w/ checkpoints      | none                         | weak               | no event to correlate                                                      |
| 6   | `/proc/pressure/cpu` `some avg10`              | **< 5 %**                | low                        | **> 10 %** (`full` > 5 %)    | low                | `≈1–2 %`; `full avg10=0` throughout                                        |
| 7   | `steal` (`st`) in `top`                        | ~0                       | ~0                         | **> 0**                      | ~0                 | `0.0` (baseline snapshot)                                                  |
| 8   | `loadavg / nproc`                              | < 1                      | < 1–2                      | **> 1 sustained**            | ~1                 | `0.22 / 2 ≈ 0.11` (baseline)                                               |
| 9   | RSS/heap trend over the session                | flat                     | flat                       | flat                         | **climbing**       | heap `130–139 MB` flat; EH RSS 441–876 MB, ended **lower** (494 vs 650 MB) |
| 10  | Event-loop lag p99/max **(b)**                 | **p99 > 200, max > 1 s** | 50–200 ms bursts           | variable/large w/o CPU corr. | large sawtooth     | `p99=11–12`, `max=16–75` (**far below WARN**)                              |
| 11  | Heartbeat jitter max **(b)**                   | large                    | small                      | large                        | large sawtooth     | `jitter_ms max≤7` (WARN needs `>500`)                                      |
| 12  | Multi-window, different servers, simultaneous? | no                       | no                         | **yes**                      | no                 | no (single remote host observed)                                           |

**Same-window host PSI:** `cpu some avg10≈1–2 %`, `full avg10=0`, `io/memory some=0` ⇒
H1-compatible (host not starved) and **no H3 signature**.

---

## Step 3 — Branch A / Branch B

- **Branch A does not apply** — it is gated on a co-occurring `unresponsive` event, which is absent.
- **Branch B does not apply** — it is gated on "EH flagged unresponsive"; the host was never flagged.

Recorded for completeness (branch-A discriminators, none of the three H1 conditions holds):
`state_serialize_ms` **small** (max 9 ms) **AND** EH `%CPU` **not pegged** (`cpu_pct 2–8`)
⇒ the payload path is **exonerated** as a cause of anything in this window. There was no
`unresponsive` line for it to have caused.

---

## Step 4 — Verdict and action (tick one)

- [ ] H1 — not applicable (no event)
- [ ] H2 — not applicable (no event)
- [ ] H3 — not applicable (no event)
- [ ] H4 — not applicable (no event)
- [x] **HEALTHY — no `unresponsive` event observed.**
- [ ] Indeterminate — instrument-first

**One-line summary for the incident/ticket:**
`2026-09-16 3.88.3 Pass B — healthy (no unresponsive event); WARN = known taskHistory residual, not a regression; capture stale after EH restart (new host uncaptured).`

---

## Step 5 — Falsifiers to record (incident §10)

- [ ] fixed-build `[host-health] max` > 3 s with no payload signal ⇒ H2/H3/H4 — **not triggered**
- [ ] `/proc/pressure/cpu some avg10 > 10 %` during the event ⇒ H3 — **not triggered in the observed window**
- [ ] `state_serialize_ms` small while flagged unresponsive ⇒ payload exonerated — **partially
      observed** (serialize is small) but there was **no unresponsive flag** to exonerate it against.

---

## B1 attribution (payload regression?)

**No regression.** The single WARN is the **known `taskHistory` residual**:

| `top[...]` field | Observed | Reading                                                                                                                                       |
| ---------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `taskHistory`    | `560KB`  | **count-bounded (cap 100) but not byte-bounded** = the known residual (3.88.1: 649 KB; Pass A: 562 KB) — dominant field, **not** a regression |
| `customModes`    | `71KB`   | bounded catalog (post-3.88.2) — intact                                                                                                        |
| `clineMessages`  | `0KB`    | **P0 bound live** — transcript not re-shipped                                                                                                 |

Not the §8-row-5 "single oversized message" signature either. Detail recorded in
[postmortem §6](../../postmortems/2026-09-09-webview-grayout-console-warnings.md).

---

## Gaps captured this pass

- **G1 (repeating — 3rd occurrence):** [runbook §2 "Triage order"](../gray-webview.md:36) classifies
  "`customModes`/`taskHistory` large again" as _a bounded-projection regression_; the cap-100,
  byte-unbounded `taskHistory` window is a **known residual**, so every watch mis-attributes it.
  Next action: reconcile §2/§6 wording **or** byte-bound `taskHistory` (like `clineMessages`).
  Owner: docs (§2) + code/observability (byte-bound). Recorded in incident §11.
- **G2 (repeating — Pass A orphan note, now instantiated):** the (a)-side harness `pidstat` sampler
  stopped at `14:21:41Z` when the captured host exited, while its PSI loop continued (bounded by
  `--duration 86400`); the new host (`1290741`) is **uncaptured**. Next action: add target-liveness
  detection / auto re-resolve to [`host-health-capture.sh`](../../../scripts/host-health-capture.sh:1);
  re-arm with `--label watch-3883-s3`. Owner: observability / tooling. Recorded in incident §11.

---

## Hygiene

- Artifacts are **local-only** (host-level data; no egress). Numbers and static field names only —
  no message content, task IDs, or file paths appear above.
- Recommended after analysis: `rm -rf /tmp/roo-perf` (per template hygiene) **once the live harness
  is stopped/drained** (it is still running, `--duration 86400`).
