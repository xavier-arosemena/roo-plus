# Postmortem: Roo+ webview gray-out + developer-console warnings

- **Date:** 2026-09-09
- **Status:** Fixed on branch `fix/console-warnings-webview-hang` (base: `release/v3.88.0-prerelease`)
- **Severity:** High (user-visible loss of UI interactivity during active agent tasks)
- **Author:** 📈 Deployment Monitor (post-deploy observability pass)
- **Environment observed:** VS Codium 1.126.04524 (Electron 42.2.0, Chromium 148), Linux x64, **remote-SSH** workspace; Roo+ 3.87.3 installed from Open VSX (`xavier-arosemena.roo-plus`).

## 1. Symptoms

1. **Gray/hung webview (primary):** The Roo+ panel turns pale gray with nothing rendering. The agent task continues in the extension host (commands run, messages stream), but the user cannot Accept/Save or type — the webview renderer is dead to input. Recurs multiple times per session; also prevents approving extension tool calls (observed as "interrupted" during this investigation).
2. **Console warning at startup:** `WARN [mainThreadStorage] large extension state detected (extensionId: xavier-arosemena.roo-plus, global: true): 3538.98 kb. Consider to use 'storageUri' or 'globalStorageUri'…`
3. **Extension-host log spam:** `[SembleProvider] Searching in …` / `Filtered to …` / `Search returned …` on every codebase search.
4. **Console 404/401 entries:** webview requesting `…/build/assets/index.map.json` and `…/index.sourcemap` (404), plus VS Code's own webview bootstrap assets occasionally failing with 401 over the remote-resource channel.

## 2. Diagnosis (evidence → code)

| Signal                                           | Source                                                                                                                                                                                                                                                                                                                                                                                                                                            | Verdict                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| 3.5 MB large-state warning                       | Legacy `taskHistory` mirror written into the VS Code **global Memento** by `TaskHistoryService.writeGlobalTaskHistory` (5 s debounced flush) even though history is file-backed (`globalStorage/tasks/…`).                                                                                                                                                                                                                                        | **Real issue — fixed**           |
| Webview freeze                                   | `getStateToPostToWebview()` serialized the **full** task history into _every_ `state` message; `Task.addToClineMessages` posts state on every streamed message. Multi-MB payloads re-serialized/structured-cloned over remote-SSH IPC saturate the webview renderer while the extension host stays healthy — exactly matching "agent continues, UI dies".                                                                                         | **Root cause addressed — fixed** |
| Semble logs                                      | `SembleProvider.searchIndex` verbose `console.log` ×3 per search. Cosmetic.                                                                                                                                                                                                                                                                                                                                                                       | **Noise — gated**                |
| Sourcemap 404s                                   | `webview-ui/src/utils/sourceMapInitializer.ts` preloaded **five guessed** map URLs per script and fetched full JS text (~5.3 MB entry bundle); packaged build only has the canonical `.map`. Harmless but noisy; extra remote fetches.                                                                                                                                                                                                            | **Real issue — fixed (item 4)**  |
| `/assets/*.js` 401s                              | VS Code's own webview bootstrap resources (not Roo+ paths). Multi-window correlation: several windows on **different servers** gray out **simultaneously** — per-window Roo+ data cannot explain simultaneity, so there is a **second, environmental factor** in the client's shared webview-resource layer (remote auth token expiry under load / Electron GPU-process pressure). Editor + terminal survive because they don't use that channel. | **Deferred (item 5)**            |
| VSIX "1740 files, 288 JS, bundle your extension" | Extension host ships unbundled loose JS. Performance/packaging debt; unrelated to the gray-out.                                                                                                                                                                                                                                                                                                                                                   | **Deferred (packaging)**         |

**Correlation answer:** the large-state warning and the gray-out are the **same data problem** (full `taskHistory` blob) surfacing in two places (Memento storage vs IPC payload); the Semble logs are independent noise; the 401s are likely a second, environmental contributor to be verified.

## 3. Fixes implemented (branch `fix/console-warnings-webview-hang`)

1. **Bounded webview payload** — new shared `boundTaskHistoryForWebview()` in `TaskHistoryService` (filter `ts && task`, newest-first, cap 100 = existing recent-tasks cap). Applied to `getStateToPostToWebview`, `getState`, and `broadcastTaskHistoryUpdate`. Store remains complete; History panel unaffected (renders recent list; full data still file-backed).
2. **Memento mirror removed** — deleted the debounced `taskHistory` write-through and all fallback readers (`getTaskWithId`, mode-switch sticky mode, provider-profile sticky persist); file store is the single source of truth. `initializeTaskHistoryStore()` now **clears the legacy `"taskHistory"` key on every startup** so existing installs (including already-migrated ones) drop below VS Code's large-state threshold immediately; the key is retained only if migration itself fails (downgrade fallback).
3. **Semble log gating** — verbose per-search logs and the one-time raw-score diagnostic now require `SEMBLE_DEBUG=1|true`; warnings/errors untouched; tests updated.
4. **Sourcemap preload noise** (2026-09-10) — `initializeSourceMaps()` no longer injects five guessed map URLs per script nor re-fetches full script text. On-demand mapping via the global error handlers (StackTrace.js resolves the real `//# sourceMappingURL=`) is unchanged; eager preloading is opt-in behind `localStorage["roo-plus:sourcemap-debug"]="1"` and requests only the canonical `<script src>.map`. Regression tests: `webview-ui/src/utils/__tests__/sourceMapInitializer.spec.ts` (5 pass).

**Verification:** independent re-run of the three most-affected suites: 96/96 pass; full sweep reported 614 + 160 + 141 pass; `tsc --noEmit` clean; eslint clean with suppression counts reduced (37→27). No `.changeset`/CHANGELOG changes (repo policy).

## 4. Deferred follow-ups (owner / next actions)

| #   | Action                                                                                                                                                                                                                                                                               | Suggested owner    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------ |
| 4   | ~~Reduce `sourceMapInitializer` to request only the real map URL (or gate behind a debug flag)~~ — **DONE 2026-09-10** (canonical `.map` only, opt-in via `localStorage["roo-plus:sourcemap-debug"]="1"`; zero guessed URLs or script-text fetches by default)                       | code mode          |
| 5   | Confirm scope of multi-window gray-out: when it next happens, check **Markdown preview** (a non-Roo+ webview) for graying; inspect `Help → Open Process Explorer` for a dead/hot GPU/renderer process; note whether re-focusing the window recovers it                               | user + debug mode  |
| —   | VSIX packaging: bundle extension-host JS / trim `.vscodeignore` (1740 files)                                                                                                                                                                                                         | release governance |
| —   | Post-release watch: confirm the `mainThreadStorage` warning disappears after one session, `state` message size < ~200 KB, and zero gray-out events; consider an IPC-payload-size metric (e.g. count of state messages > 256 KB) and a canary auto-reload on webview unresponsiveness | observability      |

## 4a. Interim mitigation (run now, on the LOCAL machine, until the fixed build is installed)

The `mainThreadStorage` blob is persisted in the local VS Codium profile's
`state.vscdb` (confirmed: no `state.vscdb` exists under `~/.vscodium-server`
on the remote host, while the warning is emitted by the local renderer's
mainThreadStorage). Purge it while VS Codium is fully quit.

Run these in a **system terminal on the local machine** (GNOME Terminal,
Konsole, xterm — NOT the VS Code integrated terminal, which dies when
VS Codium quits). The working directory does not matter (absolute paths);
`cd ~` first is just tidy. Run the steps **one at a time**, verifying the
step-2 output before running the step-3 DELETE.

```bash
# 0. Quit ALL VSCodium windows, then verify nothing is left running:
ps aux | grep -i codium | grep -v grep   # should print nothing

cd ~
DB="$HOME/.config/VSCodium/User/globalStorage/state.vscdb"
ls -lh "$DB"   # if missing, locate it:  find ~/.config -maxdepth 5 -name 'state.vscdb'

# 1. Backup first (safe to restore by copying back while VS Codium is closed)
cp "$DB" "$DB.bak.$(date +%s)"   # backup

# 2. Inspect. IMPORTANT: VS Code stores an extension's entire globalState as a
#    SINGLE row in ItemTable keyed by the extension id (`xavier-arosemena.roo-plus`).
#    `taskHistory` is a nested FIELD inside that JSON blob — NOT a row of its own.
#    (Do not DELETE rows by LIKE '%taskHistory%' — it matches nothing; and wiping
#    the whole ext-id row would erase unrelated settings such as mode/profiles.)
python3 - <<'EOF'
import sqlite3, os, json
p = os.path.expanduser("~/.config/VSCodium/User/globalStorage/state.vscdb")
db = sqlite3.connect(p)
print("large rows:", db.execute("SELECT key, length(value) FROM ItemTable ORDER BY length(value) DESC LIMIT 5").fetchall())
row = db.execute("SELECT value FROM ItemTable WHERE key='xavier-arosemena.roo-plus'").fetchone()
if row:
    v = json.loads(row[0])
    maps = [("top", v)] + ([("nested", v["value"])] if isinstance(v.get("value"), dict) else [])
    for name, m in maps:
        sized = sorted(((len(json.dumps(x)), k) for k, x in m.items()), reverse=True)[:8]
        print(f"-- {name} map, biggest fields:")
        for size, k in sized:
            print(f"  {size:>10}  {k}")
EOF
```

```bash
# 3. Surgical strip: remove ONLY the nested taskHistory field(s), keep everything else
python3 - <<'EOF'
import sqlite3, os, json
p = os.path.expanduser("~/.config/VSCodium/User/globalStorage/state.vscdb")
db = sqlite3.connect(p)
row = db.execute("SELECT value FROM ItemTable WHERE key='xavier-arosemena.roo-plus'").fetchone()
if not row:
    print("ext-id row not found; nothing to do"); raise SystemExit
v = json.loads(row[0])
maps = [v] + ([v["value"]] if isinstance(v.get("value"), dict) else [])
removed = 0
for m in maps:
    for k in [k for k in list(m) if "taskHistory" in k and k != "taskHistoryMigratedToFiles"]:
        del m[k]; removed += 1
print("removed fields:", removed)
if removed:
    db.execute("UPDATE ItemTable SET value=? WHERE key='xavier-arosemena.roo-plus'", (json.dumps(v),))
    db.commit(); db.execute("VACUUM"); db.close()
    print("purged + compacted")
EOF
```

(`sudo apt install sqlite3` also works for the CLI, but the python3 snippets above need **no install** and perform the nested-field surgery the CLI can't do safely. A local Node CLI is NOT required — the earlier node one-liner assumed Node was installed.)

- **Safe:** per-task files on the server (`~/.vscodium-server/data/User/globalStorage/xavier-arosemena.roo-plus/tasks`, 287 tasks / 5.1 GB) are the source of truth and are untouched.
- **Temporary on v3.87.3:** the installed release re-writes the Memento mirror ~5 s after any task-history change. After purging, install the fixed VSIX (branch `fix/console-warnings-webview-hang`) for the permanent cure — it clears the key on startup and never rewrites it.

## 5. Detection gaps closed / to add

- Closed: large-state warning now has an owner + fix + regression tests (payload cap + legacy-key clearing).
- Closed 2026-09-10: sourcemap preload 404 noise (item 4) — canonical `.map` only, opt-in debug flag, 5 regression tests.
- Closed 2026-09-10: webview **message payload-size SLI** (issue #64 part A) — `src/core/webview/webviewPayloadMetrics.ts` aggregates host→webview `state` payloads per ~60 s window in session memory: periodic `state_msgs=N p50=XKB p99=YKB max=ZKB` summary, WARN > 256 KB with top-3 field-size breakdown, ERROR + one-time popup > 1 MB. Local-only: no egress, no persistence (see runbook Privacy note).
- Closed 2026-09-10: runbook entry for "gray webview" — see [docs/runbooks/gray-webview.md](../runbooks/gray-webview.md) (symptoms, triage order, mitigations incl. §4a purge, escalation matrix, post-fix verification).

## 5a. Detection gap found in the watch: `customModes` was un-probed (2026-09-11)

The payload-size SLI (issue #64 part A) shipped with a probe list containing only
`clineMessages` and `taskHistory` — **not** the `ExtensionState.customModes` mode
catalog. On v3.88.1 the ERROR line fired at **1410 KB** while `top[...]`
attributed only `taskHistory=649KB`, leaving ~761 KB unexplained.

Measured against this repo's shipped catalog (`src/assets/marketplace/
pre-installed-modes.yml`, 90 modes): its JSON serializes to **762 KB**, and
`taskHistory=649KB + customModes=762KB + wrapper ≈ 1410KB` — exact. So the
largest single contributor to a "fixed" build's `state` message is the full
custom-modes catalog, and the same array re-persisted into the global Memento by
`CustomModesManager` (`globalState.update("customModes", …)`) explains the
residual `mainThreadStorage` warning on 3.88.1 (**755→1067 KB**, vs 3539 KB on
3.88.0 — the taskHistory purge worked; customModes is the new floor).

Root fix is **not** attribution-only: the catalog is derived, file-backed data
(like `taskHistory` was) and should not ride on every state push, nor be
mirrored into Memento. That fix is delegated to code mode; this commit only
closes the detection gap (probe `customModes`/`messageQueue`/`marketplaceItems`
so WARN/ERROR attribution matches the total).

## 6. Watch log (post-release)

- **2026-09-17 — ⚠️ `state` ERROR (1065 KB) from `taskHistory` on server B — the cap-100 residual crossed 1 MB and fired the user popup; byte-bound `taskHistory` is now the top fix.**
    - **Field evidence (bytes only):** B `[webview-metrics] ERROR "state" payload 1065KB > 1MB top[taskHistory=1011KB customModes=56KB clineMessages=0KB]` (`state_msgs=2 p50=1065KB p99=1065KB max=1065KB`) **plus the over-1 MB user popup**; A `WARN "state" payload 701KB`/`709KB top[taskHistory=625KB customModes=73KB clineMessages=0KB]` (`p50=402KB` across 4–6 pushes). `clineMessages=0KB` on both ⇒ P0/P1/P2 intact — the **known `taskHistory` residual breaching ERROR**, **not a regression**. Hosts healthy, **no `unresponsive`** on either (`[host-health]` A: `elu p99=13/12 max=60/89`, `cpu 7–9`, `state_serialize_ms max=10/6`; B emitted none).
    - **Root cause (code):** [`boundTaskHistoryForWebview()`](../../src/core/services/TaskHistoryService.ts:41) caps **count only** (`100`, [`:28`](../../src/core/services/TaskHistoryService.ts:28)) — **no byte budget** — so ~10 KB/entry × 100 ≈ 1 MB on a history-heavy install, re-sent on **every** push (unlike `clineMessages`, bounded by count **and** bytes). Applied at [`ClineProvider#getStateToPostToWebview()`](../../src/core/webview/ClineProvider.ts:2767).
    - **Recommendation (owner: code mode):** byte-bound `taskHistory` newest-first (≤ ~128 KB) using the existing cheap estimator [`estimateFieldBytes()`](../../src/core/webview/webviewPayloadMetrics.ts:169), with a `bounded` marker + lazy paging; optionally trim the per-entry projection (drop delegation/plumbing fields from the push). Docs: reconcile §2/§6. Observability: enable `ROO_HOST_HEALTH_DEBUG` on host B. Full report: [2026-09-17 incident](../incidents/2026-09-17-taskHistory-state-payload.md).
    - **Verdict:** `2026-09-17 — ERROR 1065KB (taskHistory=1011KB) on server B + user popup; not a regression; byte-bound taskHistory is the top fix.`

- **2026-09-17 (later) — gap G2 fixed and independently verified; capture re-armed on the fixed harness.**
    - **Fix:** [`scripts/host-health-capture.sh`](../../scripts/host-health-capture.sh:1) now records arm-time identity (`/proc/<pid>/stat` field 22 `starttime`) in `meta.txt`, runs a **foreground identity-checked watchdog** (2 s), and on target exit **or PID reuse** emits `TARGET_GONE` / `TARGET_REPLACED` / `WINDOW_CLOSED` to `<stamp>-<label>.target-gone.log`, stops every sampler through the existing `cleanup()` path (so the PSI loop can no longer outlive the parent), and exits **4**. Opt-in `--follow` re-resolves into a fresh `-tN` artifact set per target — one file never holds two PIDs.
    - **Verified independently (not taken on report):** `--self-test` → **58 passed, 0 failed** (was 28). The log includes the `pid_reused` classifier case ("not alive, unlike `kill -0`"), a live decoy-kill end-to-end that **exits 4 within 1117 ms**, an explicit no-orphan assertion (`psi.log` frozen after exit), and `--follow` two-set / two-PID isolation. `--help` documents `--follow` + exit `4`; `--dry-run` is unchanged apart from new `target_identity` / `watchdog` / `follow` lines.
    - **Fourth live occurrence, caught during verification:** the pre-fix `--label watch-3883-s4` harness (`1513372`) had armed on EH `1485457`; `pidstat` froze at `12:08Z` while `psi.log` grew until `12:39Z`, and the live EH was `1522044` — the identical G2 class (Pass A orphan note → Pass B `14:21:41Z` → the `22:45Z` ~13 h PSI-only degradation → this one). Stopped by explicit PID; window archived to `/tmp/roo-perf/stale-20260917-s4-prefix/`.
    - **Re-armed on the fixed harness:** `--label watch-3883-s5 --follow --duration 86400`, bound to live EH `1522044` with `target_starttime=1383891466`, `watchdog_interval_s=2`, `follow=1` — artifacts `/tmp/roo-perf/20260917-124009-watch-3883-s5.{meta.txt,pidstat,psi.log}`.
    - **Docs updated by the same change:** runbook §5.3 (stale-PID bullet now covers exit **and** PID reuse, `target-gone.log`, `-tN`); incident §11 Finding 2 marked resolved (58/58).
    - **Drift observed (watch-relevant):** `src/package.json` in the repo now reads **3.88.5** and is _not_ dirty (the line has advanced past the build under observation); the installed/active build under watch is still **3.88.3**. Re-base the next §6 pass on whichever build is actually installed at that time.
    - **G1 remains open:** runbook §2 still classifies a large `taskHistory` as a projection regression; the cap-100 / byte-unbounded window is a known residual (562 KB on Pass A; 560–634 KB on Pass B).

- **2026-09-17 — dual-server replay (Pass B follow-up): healthy — no `unresponsive` on either host; `taskHistory` residual now near-ERROR on server B (1006 KB); capture stale again (G2 at runtime).**
    - **Context:** the same operator drove two remote-SSH windows on **different** hosts simultaneously — server A `ArchonServer` (2 vCPU) and server B `204.168.197.3` (4 vCPU); both extension hosts (re)started `~12:08–12:12Z` (A's EH `1485457` exited `12:08:51Z`, replaced by `1522044` `12:08:55Z`). Build: Roo+ **3.88.3** on both.
    - **B1 — payload (both hosts, bytes only):** A `WARN "state" payload 699KB > 256KB top[taskHistory=625KB customModes=71KB clineMessages=0KB]` then `WARN … 707KB top[taskHistory=625KB customModes=71KB clineMessages=0KB]` (the 2nd immediately after `[createTaskWithHistoryItem] … instantiated`), summaries `state_msgs=2 p50=402KB p99=699KB max=699KB` → `p50=177KB p99=707KB max=707KB`. B `WARN "state" payload 1006KB > 256KB top[taskHistory=951KB customModes=56KB clineMessages=0KB]`, summary `state_msgs=2 p50=588KB p99=1006KB max=1006KB`. **`clineMessages=0KB` on both ⇒ P0 holds** (no transcript re-ship, no `createTaskWithHistoryItem`→ERROR storm); `customModes` bounded (71/56 KB). Dominant = `taskHistory` = the known cap-100 / byte-unbounded residual — **not a regression**. **Escalation (G1):** B's `951 KB` residual puts the total at **1006 KB ≈ 18 KB under the 1 MB ERROR threshold** — the quiet WARN residual is now a _near-ERROR_, so byte-binding `taskHistory` is the top follow-up.
    - **B2 — host event? NONE on either host** ⇒ verdict **healthy** (no `INFO Extension host (Remote) is unresponsive.` line in either console). A `[host-health]`: `elu_ms p99=13/12 max=61/92`, `jitter max 5/6`, `cpu_pct=8`, `state_serialize_ms max=35/7`, `heap 155→170 MB`, `rss 520–522 MB` — all far under §8.2 WARN/ERROR. **B emitted NO `[host-health]` lines** ⇒ `ROO_HOST_HEALTH_DEBUG` is not enabled on B's host; only `[webview-metrics]` covers B (multi-server attribution gap to record, not a fault).
    - **A-host capture (a), s4 window (`archon-core-01`):** target `1485457`, `11:38:19→12:08:51Z` ⇒ max `%CPU=142` (≈1.4 of 2 cores), `51 s ≥50 %` (no multi-second peg), `%wait ≤20`, RSS 490 MB–981 MB peak (ending 741 MB) ⇒ no H4 sawtooth. Host PSI `cpu some avg10` ≥10 episodes: `11:48` (18.40), `12:00:06` (**23.71**), `12:09:06–12:09:16` (15.77, coincident with the restart + dual relaunch); `full avg10=0` throughout ⇒ **partial** contention only, no whole-host stall, and **no co-occurring `unresponsive` ⇒ not attributable**.
    - **Multi-window / dual-server simultaneity:** two distinct hosts both restarted ~`12:09Z` and both pushed large `taskHistory` state — the _topology_ of postmortem item 5 — but the H3 branch is **gated on a host being flagged `unresponsive`**, which did not occur; A's pressure was partial (`some` 15.77, `full` 0). **Not H3.**
    - **G2 at runtime (recurrence):** the **live** s4 harness predates the watchdog fix (its `meta.txt` has no `target_starttime=`; no `.target-gone.log`), so it left the window stale — `pidstat` stops at `12:08:51Z` while the PSI loop keeps running (new EH `1522044` uncaptured). The fix is in the working tree (incident §11 Finding 2) but the 11:38-armed instance doesn't carry it. **Next action:** stop the stale loop and re-arm the fixed harness (`bash scripts/host-health-capture.sh --out-dir /tmp/roo-perf --label watch-3883-s5`), which auto-closes on any future target loss.
    - **Not ours / noise:** Continue `config.yaml` schema error, `navigator` PendingMigrationError, Vercel AI Gateway schema (`context_window`/`max_tokens` Required), webview-bootstrap `/assets/*.js` 401s. **B-specific:** `[MCP migration] Failed to parse MCP config … settings.json SyntaxError (position 178)` ⇒ malformed MCP settings JSON on B (config hygiene, not payload); and B's console carries `indexing …ArchonServer/root/roo-plus` despite B's authority being `204.168.197.3` (worth confirming; not a payload issue).
    - **Verdict line:** `2026-09-17 ~12:09Z dual-server — healthy (no unresponsive either host); WARN = known taskHistory residual (A 625KB; B 951KB → 1006KB, ~18KB under ERROR); capture stale on EH restart 12:08:51Z (running instance predates the G2 fix).`

- **2026-09-17 — cross-server check (Pass A-lite on server B): NO cascade; no shared-host coupling; both servers healthy.**
    - **B — build verification (A1):** Roo+ **3.88.3** is the ACTIVE build (`extensions.json` lists only `3.88.3`; `.obsolete` empty; `3.88.1`/`3.88.2` were deleted `10:08Z` on 2026-09-16). All three fixes **PRESENT** (`olderClineMessages`×8, `getOlderClineMessages`×5, `clineMessagesBounded`×3, `clineMessagesTotal`×3; `ROO_HOST_HEALTH_DEBUG`, `[host-health]`, `monitorEventLoopDelay`, `hostHealthMetrics`×4; sourcemap `names` = `estimateFieldBytes`, `projectClineMessagesForWebview`, `boundTaskHistoryForWebview`, `boundCustomModesForWebview`). The bundle has 0 occurrences of `is unresponsive` / `mainThreadStorage`, confirming those strings are client-emitted, not shipped in the extension.
    - **B — §6 items (A2):** history store intact (439 tasks / 6.7 GiB; `_index.json` parses). **No** `INFO Extension host (Remote) is unresponsive.` / `is responsive.` line anywhere (server logs + journald, whole boot). EHs exited `code 0` at `14:27:57Z`/`14:28:00Z` after graceful client disconnects and relaunched `14:28:02Z`/`14:28:07Z`.
    - **Simultaneity (X1, from `sar -f /var/log/sysstat/sa16`, 10-min buckets, 13:50–14:40Z):** B `%steal = 0.00` throughout, `blocked = 0`, `pswpin`/`pswpout = 0`, `%iowait ≤ 0.66`, peak `ldavg-1 = 1.26` (4 vCPU ⇒ ≈ 0.32/nproc), peak `%user = 13.03`. No host-contention signature on B.
    - **Window alignment:** A's PSI cpu peak `14:02:28–14:03:08Z`; B's EH restart `14:27:57Z` vs A's `~14:21:41Z` — **not** the same ~60 s window, and neither host logged an `unresponsive` line.
    - **Topology:** both hosts are Hetzner `vServer` (KVM) guests but **distinct machines** — machine-ids `97faf472…` (A) vs `a2151f57…` (B); A `nproc=2`, B `nproc=4`. Shared provider/platform, not a shared guest; whether the physical host is the same cannot be read from inside a guest, but B's `%steal = 0.00` during A's pressure episode empirically excludes shared-vCPU starvation.
    - **Verdict — NO cascade.** Cross-server coupling is possible only via (i) a shared hypervisor — empirically excluded (B `steal = 0`, no pressure while A spiked), or (ii) the shared client webview-resource layer (postmortem item 5) — for which neither host logged a simultaneous event. The payload path cannot cross servers (all SLI/bound state is per-extension-host). This closes the "did B's event cascade into A?" hypothesis: **no**. A's `14:02–14:03Z` PSI episode was **A-local**, and A recorded no `unresponsive` event for it.
    - **Identity note:** the absence of a `## [3.88.3]` changelog section on B is **by design** (AGENTS.md: one CHANGELOG section per minor, `## [3.88.0]`) and is not an identity signal; `package.json` carries no `commit` field. Artifact identity is settled by comparing bundle hashes — A `dist/extension.js` = `676a71a0b9132b211352b2c78b9b19a58bada36e810fa66a44733f99dfc8b534` (15,000,438 B), `package.json` = `f594ef4c65550b047a279744fac1bbddbe5dfd7ad8527c9b082eda5f19b3bf82`. The `preRelease: true` gallery stamp alongside `.vsixmanifest Release="true"` is the documented **ephemeral** pre-release marking (AGENTS.md), expected on the Open VSX pre-release channel.
    - **Gap (new, second-server pass):** no fresh remote host carries the repo, so the runbook/template/incident docs and `scripts/host-health-capture.sh` are absent there and A3 cannot be armed without copying them from A. Recorded so the next multi-server pass ships the harness + docs upfront.

- **2026-09-16 — v3.88.3 Pass B (monitor): healthy — no host `unresponsive` event; one `taskHistory`-driven WARN (known residual, not a regression); capture went stale on EH restart.**
    - **Deployment context:** same build as Pass A (installed `xavier-arosemena.roo-plus` **3.88.3**). Watch window: one remote-SSH session, capture `2026-09-16T10:04:19Z → ≥14:31:20Z`; the extension host restarted at ~`14:21:41Z` (target PID 1208955 exited, new host 1290741 uncaptured — see G2).
    - **B1 — payload regression? NO.** The observed Roo+ window carried one WARN, `[webview-metrics] WARN "state" payload 634KB > 256KB top[taskHistory=560KB customModes=71KB clineMessages=0KB]`, plus the summary `state_msgs=2 p50=335KB p99=634KB max=634KB`. `clineMessages=0KB` ⇒ the **P0 bound is live** (transcript not re-shipped). `customModes=71KB` ⇒ the bounded catalog (post-3.88.2) is intact. The dominant field is **`taskHistory=560KB`** — the **count-bounded (cap 100) but byte-unbounded** projection = the **known residual** (3.88.1: 649 KB; Pass A: 562 KB), **not** a regression of P0/P1/P2 and **not** the §8-row-5 single-oversized-message signature.
    - **B2 — host `unresponsive` event? NONE** ⇒ verdict **healthy** for the observed window. No `INFO Extension host (Remote) is unresponsive.` line was present. Six consecutive `[host-health]` windows were far below the §8.2 WARN/ERROR thresholds: `elu_ms p50=10 p95=10–11 p99=11–12 max=16–75 mean=10` (WARN needs `p99>200`), `jitter_ms max≤7` (WARN needs `>500`), `cpu_pct=2–8`, `state_serialize_ms p50=0 p99=0–9 max=9` (n=2 then 0), `heap_mb=130–139` flat, `rss_mb=300–455`. Host PSI in the window: `cpu some avg10≈1–2 %`, `full avg10=0`, `io/memory some=0` ⇒ H1-compatible (no starvation), no H3 signature.
    - **A-side capture (a):** EH 1208955, 2 vCPU, ~15,441 samples ⇒ max `%CPU=99` (usr-dominant 94/5), avg `%CPU=4 %`, only **68 s** ≥50 %, **longest sustained ≥50 % run = 2 s** (no multi-second peg); `%wait` peak 61 %; RSS 441–876 MB ending **lower** than it started (494 vs 650 MB) ⇒ no H4 leak/sawtooth; disk bursts `kB_wr/s` ≤195 MB/s (checkpoints). Host pressure stayed partial (`some`) with `full avg10=0` throughout; the largest episode — `14:02:28–14:03:08Z`, `cpu some avg10` peak **33.37 %**, `avg60` 13.73 % — had **no co-occurring Roo+ `unresponsive` line in the observed output ⇒ not attributable.**
    - **Not attributable, precisely:** the only genuinely missing measurement for the observed (post-restart) window is the per-process **(a)** half — the EH restarted (~`14:21:41Z`) so the harness `pidstat` target went stale while its PSI loop continued. The verdict rests on the **(b)** `[host-health]` half + host PSI, both healthy; the absent (a) half is recorded as absent and **not** inferred from (template Step 0).
    - **Gaps recorded (incident §11):** **G1** — runbook §2 still calls "`taskHistory` large again" a _regression_, so this **known residual** (3rd occurrence: 3.88.1 / Pass A / Pass B) mis-attributes on every watch ⇒ reconcile §2/§6 or byte-bound `taskHistory`. **G2** — the capture harness did not notice the EH restart ⇒ `pidstat` target stale (a repeat of Pass A's orphan note) ⇒ add target-liveness detection + auto re-resolve.
    - **Housekeeping:** the harness (bounded `--duration 86400`) is still running; its `pidstat` half is stale since `14:21:41Z`. Re-arm for the new EH with `bash scripts/host-health-capture.sh --out-dir /tmp/roo-perf --label watch-3883-s3`.

- **2026-09-16 — v3.88.3 Pass A (verify & arm): all three fixes PRESENT in the _installed_ build; capture armed; one `taskHistory`-driven WARN (not a P0/P1/P2 regression).**
    - **Deployment context:** active build `xavier-arosemena.roo-plus` **3.88.3** (`extensions.json`; `.obsolete` marks `3.88.2-universal` obsolete); repo HEAD `77a670196` (`release/v3.88.3-prerelease` merge, PR #338). Rollout: Open VSX pre-release. Watch window: one full remote-SSH session. Extension host on the remote host (2 vCPU, Linux 6.8.0-107-generic).
    - **A1 — installed-build markers (differential 3.88.2 → 3.88.3; verified, not assumed):** P0 **PRESENT** — shipped `dist/extension.js` literals `olderClineMessages`×8, `getOlderClineMessages`×5, `clineMessagesBounded`×3, `clineMessagesTotal`×3, and sourcemap `names` gains `projectClineMessagesForWebview`; P1 **PRESENT** — sourcemap `names` gains `estimateFieldBytes` (identifier-level: no literal survives minification); P2 **PRESENT** — shipped literals `ROO_HOST_HEALTH_DEBUG`×1, `[host-health]`×1, `monitorEventLoopDelay`×1, `hostHealthMetrics`×4, and `extensionHostHealthMetrics` in the map `sources`. All three **ABSENT** from the obsolete 3.88.2 build.
    - **A2 — runbook §6 checklist:** history store intact (301 tasks / 5.3 GiB; `_index.json` present; newest task today) and a task was reopened from History ⇒ **History panel renders ✅**; **payloads < ~200 KB ✗**; **zero WARN/ERROR ✗**; **no gray-out / no `unresponsive` ✅** in the observed window; `mainThreadStorage` large-state warning not present in the (partial) console excerpt — local-renderer item, unconfirmed.
    - **A4 — first window baseline (operator console; bytes/ms only):** `[webview-metrics] state_msgs=5 p50=333KB p99=647KB max=647KB`; one `WARN "state" payload 647KB > 256KB top[taskHistory=562KB customModes=73KB clineMessages=0KB]`. First `[host-health]`: `elu_ms p50=10 p95=10 p99=12 max=141 mean=10 | jitter_ms max=1 | cpu_pct=6 | heap_mb=158 rss_mb=419 ext_mb=17 | state_serialize_ms p50=0 p99=7 max=7 n=5`.
    - **Verdict:** **P0 live** (`clineMessages=0KB` on that push — the transcript is no longer re-shipped) and **P1 live** (`state_serialize_ms` max 7 ms for a 647 KB push; the probe no longer full-serializes). The WARN is **`taskHistory=562KB`** — the **count-bounded (cap 100) but not byte-bounded** projection, i.e. the **known residual** (3.88.1 recorded 649 KB), **not** a regression of the three fixes. Gap: the §6 target (< 200 KB / zero WARN) is unattainable while the 100-item `taskHistory` window rides every push, and runbook §2 ("`taskHistory` large again → projection regressed") mis-attributes this known residual ⇒ follow-up: byte-bound `taskHistory` like `clineMessages`, or reconcile §6/§2 with the incident §8-row-3 WARN-level fallback. No code/threshold change made (watch-pass rule).
    - **A3 — capture armed (host-side, local-only, no egress):** `/tmp/roo-perf/20260916-100419-watch-3883-s2.{meta.txt,pidstat,psi.log}` plus one-shot `/tmp/roo-perf/20260916-100425-watch-3883-s2-baseline.snapshot.log`; target PID `1208955` via `pgrep -f --type=extensionHost`; sampler `pidstat`; `clk_tck=100`; 24 h bound. `ROO_HOST_HEALTH_DEBUG=1` confirmed in the extension host's environment (runbook §5.2 satisfied after the server restart). Baseline PSI `cpu some avg10=0.97`, `io/memory=0.00`, `st=0.0` ⇒ H1-compatible, so a future `unresponsive` event is attributable.
    - **Housekeeping:** a stale capture from the 09-15 session (target died; its PSI loop kept the parent alive and the log grew to ~4.7 MB) was stopped and moved to `/tmp/roo-perf/stale-20260915-oldsession/`. Harness note: the `pidstat` sampler can exit without the parent noticing while the PSI loop continues — prefer a bounded `--duration` to avoid the orphan.

- **2026-09-15 — v3.88.2 watch result: both shipped fixes confirmed; `clineMessages` unmasked as the last unbounded field.** Field evidence from a VS Codium remote-SSH session: `[webview-metrics] ERROR "state" payload 1045KB > 1MB top[clineMessages=962KB customModes=73KB messageQueue=0KB]` and window summary `state_msgs=4 p50=691KB p99=1045KB max=1045KB`. The customModes fix is confirmed (762 KB → 73 KB; no longer dominant) and taskHistory no longer appears in `top[...]`. The ERROR fires immediately after `[createTaskWithHistoryItem] … instantiated` — reopening a long task rehydrates its full saved transcript, and `getStateToPostToWebview()` ships `currentTask.clineMessages` unbounded (same IPC-payload class as the taskHistory bug). **Not RAM-related:** the extension host completed the lifecycle normally (no OOM/crash) and the metric measures serialized bytes, not memory. **No gray-out reported** — the popup is the SLI detecting a near-miss. Fix (bound `clineMessages` tail-first + lazy-fetch older messages) delegated to code mode; full analysis in the [2026-09-15 incident report](../incidents/2026-09-15-clineMessages-state-payload.md). Follow-ups also landed the same day: the P1 probe guard (monitoring no longer full-serializes the payload it watches) and P2/P3 host-health instrumentation + capture harness. Re-run the runbook §6 post-fix checklist on the next pre-release.

- **2026-09-11 — v3.88.1 watch result: original fix confirmed, new regression surfaced.** Field evidence: the `[webview-metrics]` SLI fired (only fixed builds have it), the legacy 3539 KB `mainThreadStorage` blob is gone (now 755→1067 KB — the taskHistory mirror is cleared and stays cleared, no re-fill), and `top[...]` shows `taskHistory=649KB` (bounded at the 100-item cap) `clineMessages=0KB`. Remaining issue: the ~762 KB `customModes` catalog inflates every `state` push to 1410 KB (crosses the 1 MB ERROR threshold; user popup shown) and is re-persisted to Memento by `CustomModesManager` — see §5a. Payload slimming + storage-mirror removal delegated to code mode; re-run §5 checklist on the next pre-release.

- **2026-09-10 — published `3.88.0` Open VSX pre-release does NOT contain the branch fixes.** Inspected the installed server copy (`~/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.0-universal/dist/extension.js`): zero occurrences of `boundTaskHistoryForWebview` / `SEMBLE_DEBUG`, while `writeGlobalTaskHistory` is still present (Memento mirror live) and the shipped webview bundle still contains the guessed `map.json`/`sourcemap` preload URLs. **The gray-out + large-state risk is still live on 3.88.0.** Permanent cure requires building a VSIX off this branch and shipping it as the next patch on the line (`3.88.1` via `pnpm bump:pre-release`, then `pnpm generate:announcements` + `pnpm verify:announcement-version`).
- Housekeeping done 2026-09-10: removed orphaned `/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.53.0` (148 MB, unregistered + flagged obsolete). `xavier-arosemena.roo-plus-3.87.3-universal` is likewise obsolete/unregistered but was retained as the last-known-good rollback; purge once the fixed build is verified.
