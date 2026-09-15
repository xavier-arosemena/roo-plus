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
   A multi-MB value (> ~1.5 MB) here = the legacy `taskHistory` Memento mirror is live (pre-3.88.1 build). Continue to §3 mitigation. Note: on fixed builds a residual ~750–1100 KB reading is expected while the `customModes` mirror remains in Memento (issue #64 follow-up, postmortem §5a) — that is the _payload/storage_ follow-up's signature, not a taskHistory regression.

2. **Payload-size WARN lines (Roo+ output channel).**
   Output panel → channel **Roo+**. Look for:
   `[webview-metrics] WARN "state" payload <N>KB > 256KB top[...]`
   or `[webview-metrics] ERROR "state" payload <N>KB > 1MB ...`.
   The `top[...]` field breakdown names the biggest static state fields
   (`clineMessages` / `taskHistory`) in KB — that identifies the regression
   owner without exposing any content.

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

| Situation                                                                  | Route to                                                                                      |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `[webview-metrics]` WARN/ERROR lines reproduce with a specific pattern     | **Debug mode** — payload regression investigation (capture the `top[...]` field breakdown)    |
| Multi-window / non-Roo+ webviews gray simultaneously (triage step 3 = yes) | **Upstream VS Codium issue** — environmental webview-resource/GPU factor (postmortem item 5)  |
| Fixed build installed but large-state warning persists                     | Roo+ issue #64 — reopen Memento-clear path; include §4a step-2 inspection output (sizes only) |
| Extension-host itself hangs (no task progress at all)                      | Out of scope for this runbook — separate investigation                                        |

## 5. Post-fix verification checklist (postmortem §6 watch criteria)

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
