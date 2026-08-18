# Architecture Review: Modes Missing from Marketplace / Infinite Loader (Issue #158)

**Status:** ✅ RESOLVED (v3.77.4) + proactive hardening recommendations
**Date:** 2026-08-07
**Scope:** Issue #158 — "Modes not present in the marketplace" (regression vs v3.72.0)
**Related:** [`plans/architecture-review-code-index-semble.md`](../../plans/architecture-review-code-index-semble.md) (v3.77.4 addendum), [`adr-typed-message-protocol.md`](adr-typed-message-protocol.md)

## Summary

The Modes Marketplace (Modes tab) hung on an infinite "searching…" loader while the bottom
mode selector (enabled modes) worked correctly. Root cause was **not** in the marketplace
data pipeline — the catalog, the zod validation, the backend fetch flow, and the webview
state machine were all intact. The regression was a **webview message-trust filter** that
silently dropped every extension→webview message in remote/server webviews
(VSCodium Desktop + Remote-SSH), and the marketplace was the only surface whose data is
delivered exclusively through that filtered channel.

Fixed in v3.77.4 by [`isTrustedMessage()`](../../webview-ui/src/utils/trustedMessages.ts) trusting
**origin only** (commit `ab232adb0`). This document validates that fix, explains why the
symptom was marketplace-specific, and inventories every other message consumer so the same
class of bug cannot recur.

---

## 1. Symptom vs. architecture

| Surface                            | Data path                                                                                    | Worked?           |
| ---------------------------------- | -------------------------------------------------------------------------------------------- | ----------------- |
| Bottom mode selector (`ModesView`) | `.roomodes` / global config → `state` message → **unguarded** root `ExtensionStateContext`   | ✅ Worked         |
| Modes Marketplace (Modes tab)      | `fetchMarketplaceData` → `marketplaceData` response → **guarded** `useStateManager` listener | ❌ Hung on loader |

Both depend on the same extension host, so the asymmetry is explained entirely by which
message channel each surface consumes:

- The mode selector is populated from the `state` message, consumed by the unguarded root
  handler in [`ExtensionStateContext.tsx`](../../webview-ui/src/context/ExtensionStateContext.tsx:473).
- The marketplace list is populated **only** from the `marketplaceData` response message,
  consumed by the `isTrustedMessage`-guarded listener in
  [`useStateManager.ts`](../../webview-ui/src/components/marketplace/useStateManager.ts:29).

In remote webviews the guarded channel dropped every message, so `isFetching` stayed `true`
forever and [`MarketplaceListView.tsx`](../../webview-ui/src/components/marketplace/MarketplaceListView.tsx:229)
rendered the loader (`state.isFetching && isEmpty`) indefinitely.

## 2. What was verified as NOT the cause

Reviewed to eliminate red herrings and confirm the regression window:

| Candidate                                             | Result                                                                                                                                                                        |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `modes.yml` catalog (301 items)                       | ✅ Valid — 301 items, passes `modeMarketplaceResponse` zod validation (`yaml.parse` + `safeParse`)                                                                            |
| `mcps.yml` catalog (63 items)                         | ✅ Valid                                                                                                                                                                      |
| Backend fetch flow                                    | ✅ Unchanged since v3.72.0: `fetchMarketplaceData` → `marketplaceData` (extracted to `MarketplaceService` in v3.76.0, logic preserved exactly)                                |
| Webview state machine (`MarketplaceViewStateManager`) | ✅ Byte-identical to v3.72.0                                                                                                                                                  |
| Typed message protocol (v3.76.0)                      | ✅ `fetchMarketplaceData` is an unregistered type → structural pass-through in [`parseWebviewMessage`](../../packages/types/src/webview-messages/index.ts:95), never rejected |
| Marketplace handler routing                           | ✅ `fetchMarketplaceData` dispatched to `handleMarketplaceMessages` via `marketplaceMessageTypes`                                                                             |

## 3. Root cause (regression since v3.72.0)

`isTrustedMessage()` did not exist at v3.72.0. It was introduced in v3.76.0 and required
`event.source === window` (later relaxed to `null/window/parent/top`). On VSCodium Desktop
(Electron) + Remote-SSH, the extension host forwards messages through an **intermediate
same-origin `Window`** — `origin === window.origin`, but `source` is neither `window`,
`window.parent`, nor `window.top`. The source check therefore rejected **every**
extension→webview message for `isTrustedMessage`-guarded components, silently.

The unfiltered root `ExtensionStateContext` kept working, which is why chat/settings/state
appeared fine while only guarded surfaces (marketplace, code-index save, workspace toggle,
status badge) broke. Marketplace symptoms dominated because it is the surface whose _only_
data source is the guarded channel.

## 4. Fix validation (v3.77.4, commit `ab232adb0`)

```ts
export function isTrustedMessage(event: MessageEvent): boolean {
	const { origin } = event
	return origin === "" || origin === "null" || origin === window.origin || origin.startsWith("vscode-webview://")
}
```

- **Correct trust boundary.** Browsers set `MessageEvent.origin` to the sender's real origin;
  cross-origin embedded content cannot spoof it (`postMessage` enforces sender origin). The
  source window legitimately differs across desktop / server / Remote-SSH delivery paths, so
  source identity is not a valid signal.
- **Rejects the threat model.** Cross-origin injection (`https://evil.example.com`) is still
  rejected regardless of source — the original motivation for the filter is preserved.
- **Coverage.** Applies uniformly to all 24 guarded consumers (marketplace, settings,
  chat/code-index, worktrees, modes, model hooks).
- **Tests.** [`trustedMessages.spec.ts`](../../webview-ui/src/utils/__tests__/trustedMessages.spec.ts)
  covers the exact "different same-origin Window" regression case plus cross-origin rejection
  cases — 13/13 pass. Marketplace suite 11/11 passes. Full run: 24/24 green.

**Residual observation (non-blocking):** `origin.startsWith("vscode-webview://")` is broader
than `=== window.origin` (accepts any VS Code webview origin). This is not exploitable from
web content (a browser page cannot acquire a `vscode-webview://` origin) and only other
webviews in the same host could match, which have no `window` reference into this webview.
Safe as-is; if desired, tightening to `origin.startsWith(window.origin)` would narrow it
further with identical practical behavior.

## 5. Complete inventory of extension→webview message consumers

### 5.1 Guarded with `isTrustedMessage` (fixed by v3.77.4 — no action needed)

Marketplace: `useStateManager.ts`, `MarketplaceView.tsx`, `MarketplaceItemCard.tsx`,
`MarketplaceInstallModal.tsx`, `BulkInstallModal.tsx`
Settings: `SettingsView.tsx`, `PromptsSettings.tsx`, `About.tsx`, `LiteLLM.tsx`, `Poe.tsx`,
`Ollama.tsx`, `Moonshot.tsx`, `OpenCodeGo.tsx`, `OpenAICodexRateLimitDashboard.tsx`
Chat: `ChatTextArea.tsx`, `ChatRow.tsx`, `CodeIndexPopover.tsx` (×3), `IndexingStatusBadge.tsx`,
`WorktreeSelector.tsx`
Worktrees: `WorktreesView.tsx`, `CreateWorktreeModal.tsx`, `DeleteWorktreeModal.tsx`
Modes: `ModesView.tsx` · Common: `DismissibleUpsell.tsx`
Hooks: `useOllamaModels.ts`, `useRouterModels.ts`, `useLmStudioModels.ts`

### 5.2 Unguarded (never affected by the drop; **proactive hardening candidates**)

| Consumer                                                                                                         | Messages                                    | Risk today          | Recommended action                                                                                                                                                                        |
| ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`ExtensionStateContext.tsx`](../../webview-ui/src/context/ExtensionStateContext.tsx:473) — root state handler   | `state`, `marketplaceData`, task history, … | None (receives all) | Add origin-based `isTrustedMessage` guard for defense-in-depth. **Largest blast radius** — treat as the final migration step after 5.2 next item ships + re-tested across desktop/remote. |
| [`FileChangesPanel.tsx`](../../webview-ui/src/components/chat/FileChangesPanel.tsx:105) — `fileContent` listener | `fileContent`                               | None (receives all) | Add origin-based `isTrustedMessage` guard (low blast radius, good first candidate)                                                                                                        |

The two unguarded consumers above receive every message, so they never suffered the drop
bug — they are listed for **security consistency**, not correctness. Guarding them with the
origin-based check (never the old source check) is safe and aligns the whole webview on one
trust model.

### 5.3 Extension-host side (outbound) — no analogous filtering

`postMessageToWebview` ([`ClineProvider.ts`](../../src/core/webview/ClineProvider.ts:952)) has no
source/origin filtering; inbound messages are typed-boundary validated at
[`ClineProvider.ts`](../../src/core/webview/ClineProvider.ts:1187) and routed per-domain. No
action needed.

## 6. Recommendations

1. **Keep the origin-only trust model.** Never reintroduce a source-identity check — the
   delivery window legitimately varies by environment. Encode this in a comment (already
   present) and in the regression spec (already present).
2. **Proactively guard the two unguarded consumers** (§5.2) with the origin-based
   `isTrustedMessage`, starting with `FileChangesPanel` (low risk), then the root
   `ExtensionStateContext` once validated across desktop + Remote-SSH.
3. **Add a marketplace retry/fallback** so a lost `marketplaceData` response cannot strand
   the UI on an infinite loader: on `hasReceivedInitialState` timeout, re-post
   `fetchMarketplaceData` (or surface the `errors[]` payload as an empty/error state).
   Currently [`MarketplaceView.tsx`](../../webview-ui/src/components/marketplace/MarketplaceView.tsx:44)
   posts the fetch exactly once and never retries.
4. **Document the lesson** (this document + §10 addendum in the code-index review): webview
   "trusted message" hardening must key on origin, never source.
5. **Keep the typed-protocol boundary pass-through** for unregistered types (as designed in
   [`webview-messages/index.ts`](../../packages/types/src/webview-messages/index.ts:114)) — a
   strict-reject boundary here would have converted this silent drop into a hard failure;
   adding `fetchMarketplaceData` to the schema registry is a cheap next ratchet.

## 7. Conclusion

Issue #158 is fully explained and resolved: the marketplace's data channel was the only
message path that relied on the `isTrustedMessage`-guarded listener, and that listener's
source check silently dropped all extension messages in remote webviews. The v3.77.4
origin-only fix is correct, complete, and regression-tested. The remaining work is
proactive: guard the two unguarded consumers for defense-in-depth and add a marketplace
retry so no future delivery failure can strand the UI on a permanent loader.
