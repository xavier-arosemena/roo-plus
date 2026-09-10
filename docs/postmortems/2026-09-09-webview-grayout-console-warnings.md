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
| Sourcemap 404s                                   | `webview-ui/src/utils/sourceMapInitializer.ts` preloads **five guessed** map URLs per script and fetches full JS text; packaged build only has `.map`. Harmless but noisy; extra remote fetches.                                                                                                                                                                                                                                                  | **Deferred (item 4)**            |
| `/assets/*.js` 401s                              | VS Code's own webview bootstrap resources (not Roo+ paths). Multi-window correlation: several windows on **different servers** gray out **simultaneously** — per-window Roo+ data cannot explain simultaneity, so there is a **second, environmental factor** in the client's shared webview-resource layer (remote auth token expiry under load / Electron GPU-process pressure). Editor + terminal survive because they don't use that channel. | **Deferred (item 5)**            |
| VSIX "1740 files, 288 JS, bundle your extension" | Extension host ships unbundled loose JS. Performance/packaging debt; unrelated to the gray-out.                                                                                                                                                                                                                                                                                                                                                   | **Deferred (packaging)**         |

**Correlation answer:** the large-state warning and the gray-out are the **same data problem** (full `taskHistory` blob) surfacing in two places (Memento storage vs IPC payload); the Semble logs are independent noise; the 401s are likely a second, environmental contributor to be verified.

## 3. Fixes implemented (branch `fix/console-warnings-webview-hang`)

1. **Bounded webview payload** — new shared `boundTaskHistoryForWebview()` in `TaskHistoryService` (filter `ts && task`, newest-first, cap 100 = existing recent-tasks cap). Applied to `getStateToPostToWebview`, `getState`, and `broadcastTaskHistoryUpdate`. Store remains complete; History panel unaffected (renders recent list; full data still file-backed).
2. **Memento mirror removed** — deleted the debounced `taskHistory` write-through and all fallback readers (`getTaskWithId`, mode-switch sticky mode, provider-profile sticky persist); file store is the single source of truth. `initializeTaskHistoryStore()` now **clears the legacy `"taskHistory"` key on every startup** so existing installs (including already-migrated ones) drop below VS Code's large-state threshold immediately; the key is retained only if migration itself fails (downgrade fallback).
3. **Semble log gating** — verbose per-search logs and the one-time raw-score diagnostic now require `SEMBLE_DEBUG=1|true`; warnings/errors untouched; tests updated.

**Verification:** independent re-run of the three most-affected suites: 96/96 pass; full sweep reported 614 + 160 + 141 pass; `tsc --noEmit` clean; eslint clean with suppression counts reduced (37→27). No `.changeset`/CHANGELOG changes (repo policy).

## 4. Deferred follow-ups (owner / next actions)

| #   | Action                                                                                                                                                                                                                                                                               | Suggested owner    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------ |
| 4   | Reduce `sourceMapInitializer` to request only the real `index-<hash>.js.map` (or drop preloading behind a debug flag) → kills the 404 noise and wasted remote fetches                                                                                                                | code mode          |
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
- Gap: no monitor for **webview message payload size** (recommended above) — the freeze was silent until the renderer died.
- Gap: no runbook entry for "gray webview" — this document doubles as the first draft; recovery until the fix ships: reload window (`Developer: Reload Window`).
