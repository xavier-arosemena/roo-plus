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

- **2026-09-11 — v3.88.1 watch result: original fix confirmed, new regression surfaced.** Field evidence: the `[webview-metrics]` SLI fired (only fixed builds have it), the legacy 3539 KB `mainThreadStorage` blob is gone (now 755→1067 KB — the taskHistory mirror is cleared and stays cleared, no re-fill), and `top[...]` shows `taskHistory=649KB` (bounded at the 100-item cap) `clineMessages=0KB`. Remaining issue: the ~762 KB `customModes` catalog inflates every `state` push to 1410 KB (crosses the 1 MB ERROR threshold; user popup shown) and is re-persisted to Memento by `CustomModesManager` — see §5a. Payload slimming + storage-mirror removal delegated to code mode; re-run §5 checklist on the next pre-release.

- **2026-09-10 — published `3.88.0` Open VSX pre-release does NOT contain the branch fixes.** Inspected the installed server copy (`~/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.88.0-universal/dist/extension.js`): zero occurrences of `boundTaskHistoryForWebview` / `SEMBLE_DEBUG`, while `writeGlobalTaskHistory` is still present (Memento mirror live) and the shipped webview bundle still contains the guessed `map.json`/`sourcemap` preload URLs. **The gray-out + large-state risk is still live on 3.88.0.** Permanent cure requires building a VSIX off this branch and shipping it as the next patch on the line (`3.88.1` via `pnpm bump:pre-release`, then `pnpm generate:announcements` + `pnpm verify:announcement-version`).
- Housekeeping done 2026-09-10: removed orphaned `/root/.vscodium-server/extensions/xavier-arosemena.roo-plus-3.53.0` (148 MB, unregistered + flagged obsolete). `xavier-arosemena.roo-plus-3.87.3-universal` is likewise obsolete/unregistered but was retained as the last-known-good rollback; purge once the fixed build is verified.
