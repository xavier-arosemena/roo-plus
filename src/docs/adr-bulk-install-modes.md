# ADR: Bulk Install Modes in Marketplace

**Date**: 2026-07-28

**Status**: ✅ ACCEPTED

## Context

The Mode Marketplace in the webview UI allowed installing modes one-by-one by clicking "Install" on each mode card. For users who wanted to add multiple modes (e.g., all legal/compliance agents, or a full team toolkit), this was a tedious process requiring repeated individual installs.

Users needed to:

1. Click into the marketplace
2. Find a mode
3. Click Install
4. Wait for installation
5. Repeat steps 2-4 for each desired mode

This was particularly painful when:

- Setting up a new workspace with a pre-defined team of agents
- Evaluating multiple agents from the same category
- Restoring a previous configuration after a reset

## Decision

**Option A: Checkbox-based multi-select with bulk install modal** — chosen over:

- **Option B: "Install All" per-category button** — limited flexibility; users couldn't pick and choose specific modes across categories
- **Option C: JSON import** — developer-only workflow; too technical for most users
- **Option D: Pre-configured bundles** — too opinionated; users have different needs

## Implementation

### Frontend Components

- **Checkbox Selection** — Each `MarketplaceItemCard` in the Modes tab now displays a checkbox (visible only on the Modes tab, not the All/MCP tabs)
- **Select All Header** — A header checkbox in the mode list lets users select all uninstalled visible modes at once
- **Selection Action Bar** — A sticky bottom action bar appears when selections are > 0, showing:
    - Selected count (e.g., "5 modes selected")
    - "Install N Modes" primary button
    - "Clear selection" secondary button
- **BulkInstallModal** — A new modal component (`BulkInstallModal.tsx`) showing:
    - Selected items list with status indicators (pending/installing/success/failed)
    - Scope selector: project vs. global installation
    - Progress bar showing installation progress
    - Result summary with per-item success/failure details

### Backend

- **MarketplaceManager.installMarketplaceItems()** — New method that installs items sequentially with per-item status tracking
- **ClineProvider.installMarketplaceItems()** — New handler wrapping the manager call and returning results
- **WebviewMessage Types** — Added `installMarketplaceItems` request type and `marketplaceBulkInstallResult` response type

### Message Flow

```
User selects modes in Modes tab
  → SelectionActionBar shows "Install 5 Modes"
  → User clicks install
    → BulkInstallModal opens with scope picker
    → User selects scope + clicks "Install"
      → webview sends installMarketplaceItems message
        → ClineProvider calls MarketplaceManager.installMarketplaceItems()
          → For each item sequentially:
            → Download and extract mode YAML
            → Write to global or workspace settings
            → Track success/failure
        → Returns bulkInstallResult with per-item status
      → Modal updates with progress and results
```

### Files Modified

| File                                                            | Change                                                                   |
| --------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `webview-ui/src/components/marketplace/MarketplaceView.tsx`     | Added selection state, action bar rendering, bulk install handler        |
| `webview-ui/src/components/marketplace/MarketplaceItemCard.tsx` | Added checkbox rendering for Modes tab                                   |
| `webview-ui/src/components/marketplace/MarketplaceListView.tsx` | Added select-all logic, filtered checkbox visibility                     |
| `webview-ui/src/components/marketplace/BulkInstallModal.tsx`    | **NEW** — Modal with scope picker, progress bar, results                 |
| `webview-ui/src/components/marketplace/types.ts`                | Added selection-related types                                            |
| `src/core/webview/ClineProvider.ts`                             | Added `installMarketplaceItems` message handler                          |
| `src/services/marketplace/MarketplaceManager.ts`                | Added `installMarketplaceItems()` sequential install method              |
| `src/shared/WebviewMessage.ts`                                  | Added `installMarketplaceItems` and `marketplaceBulkInstallResult` types |
| `src/i18n/locales/en/common.json`                               | Added backend i18n keys                                                  |
| `webview-ui/src/i18n/locales/en/translation.json`               | Added frontend i18n keys                                                 |

## Consequences

### Positive

- Users can install 10+ modes in a single operation instead of 10+ individual clicks
- Scope selection (project vs. global) built into the bulk flow
- Progress tracking provides visual feedback during installation
- Per-item result summary makes it easy to identify failures
- Sequential installation prevents race conditions in settings file writes
- No reload required after installation — modes available immediately

### Negative

- Additional UI complexity in the Modes tab (selection state management)
- Sequential installation means total time scales linearly with number of items
- Bulk install UX flow adds ~450 lines of new frontend code

### Neutral

- Checkbox selection only available in Modes tab (not All/MCP tabs) to avoid confusion
- "Select All" only applies to visible (filtered) modes, not the full catalog
- Single-install "Install" button remains on mode cards for users who prefer one-by-one

---

## Update (2026-07-31)

As part of the typed-message-protocol work (see [`adr-typed-message-protocol.md`](adr-typed-message-protocol.md)), the `WebviewMessage` message types referenced above now live in `@roo-code/types` ([`packages/types/src/webview-messages/`](../packages/types/src/webview-messages/index.ts)); [`src/shared/WebviewMessage.ts`](../src/shared/WebviewMessage.ts) re-exports from the package. The `marketplaceBulkInstallResult` response type was also moved to the outbound `ExtensionMessage` union during the direction cleanup. `installMarketplaceItems` is among the 16 baseline types now strictly validated at the boundary.
