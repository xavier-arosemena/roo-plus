export * from "./api.js"
export * from "./cli.js"
export * from "./cloud.js"
export * from "./codebase-index.js"
export * from "./context-management.js"
export * from "./cookie-consent.js"
export * from "./custom-tool.js"
export * from "./embedding.js"
export * from "./events.js"
export * from "./experiment.js"
export * from "./followup.js"
export * from "./git.js"
export * from "./global-settings.js"
export * from "./history.js"
export * from "./image-generation.js"
export * from "./ipc.js"
export * from "./mcp.js"
export * from "./message.js"
export * from "./mode.js"
export * from "./model.js"
export * from "./provider-identifiers.js"
export * from "./provider-settings.js"
export * from "./task.js"
export * from "./todo.js"
export * from "./skills.js"
export * from "./rules.js"
export * from "./marketplace.js"
export * from "./telemetry.js"
export * from "./terminal.js"
export * from "./tool.js"
export * from "./tool-params.js"
export * from "./type-fu.js"
export * from "./vscode-extension-host.js"
export * from "./vscode.js"
export * from "./worktree.js"

export * from "./providers/index.js"

export * from "./utils/looksLikeFilePath.js"
export * from "./webview-messages/index.js"
export * from "./extension-messages/index.js"
// `CodeIndexMessage` is exported by BOTH the inbound webview-messages registry
// (S1 sub-task 3 — the code-index webview message union) and the outbound
// extension-messages registry (Phase 2 — the code-index response union, which
// grew from the Phase-0 indexing-status-update message to the full Domain-6
// union). The star re-exports above collide on the name, so disambiguate
// explicitly in favor of the inbound type at the package root. The outbound
// type remains available directly from "./extension-messages/index.js".
export type { CodeIndexMessage } from "./webview-messages/index.js"
// `codeIndexMessageSchema` is likewise exported by BOTH registries: the
// inbound webview-messages code-index module (S1 sub-task 3 — the inbound
// code-index webview-message union) and the outbound extension-messages
// code-index module (Phase 2, Domain 6 — the outbound code-index response
// union). Disambiguated in favor of the inbound schema at the package root
// (the `CodeIndexMessage` precedent); the outbound variant remains available
// directly from "./extension-messages/index.js".
export { codeIndexMessageSchema } from "./webview-messages/index.js"
// `marketplaceMessageSchema` / `MarketplaceMessage` are likewise exported by
// BOTH registries: the inbound webview-messages marketplace module (S1 — the
// inbound marketplace webview-message union) and the outbound
// extension-messages marketplace module (Phase 2, Domain 5 — the outbound
// marketplace response union). Disambiguated in favor of the inbound names at
// the package root; the outbound variants remain available directly from
// "./extension-messages/index.js".
export { marketplaceMessageSchema } from "./webview-messages/index.js"
export type { MarketplaceMessage } from "./webview-messages/index.js"
// `worktreeMessageSchema` / `WorktreeMessage` are likewise exported by BOTH
// registries: the inbound webview-messages worktree module (S1 — the inbound
// worktree webview-message union) and the outbound extension-messages worktree
// module (Phase 2, Domain 7 — the outbound worktree response union).
// Disambiguated in favor of the inbound names at the package root (the
// `CodeIndexMessage` precedent); the outbound variants remain available
// directly from "./extension-messages/index.js".
export { worktreeMessageSchema } from "./webview-messages/index.js"
export type { WorktreeMessage } from "./webview-messages/index.js"
// `autoApprovalEnabledMessageSchema`, `toggleApiConfigPinMessageSchema`,
// `updatePromptMessageSchema`, `commandsMessageSchema`,
// `insertTextIntoTextareaMessageSchema`, `updateCustomModeMessageSchema`,
// `deleteCustomModeMessageSchema`, `checkRulesDirectoryMessageSchema`,
// `exportModeMessageSchema` and `importModeMessageSchema` are direction-mixed
// message types: they are exported by BOTH the inbound webview-messages
// registry (S1 — where the webview sends them) and the outbound
// extension-messages registry (Phase 2 — registered outbound for completeness;
// `autoApprovalEnabled` and `toggleApiConfigPin`/`updatePrompt` outbound
// traffic is expected/vestigial, while `commands` and `insertTextIntoTextarea`
// are active outbound responses, and the Phase-2 Domain-4 outbound
// `updateCustomMode`/`deleteCustomMode`/`exportModeResult`-adjacent schemas are
// vestigial with no outbound producer — see
// `packages/types/src/extension-messages/checkpointModes.ts`). The star
// re-exports above collide on the names, so disambiguate explicitly in favor of
// the INBOUND schemas at the package root (the `CodeIndexMessage` precedent).
// The outbound variants remain available directly from
// "./extension-messages/index.js".
export {
	autoApprovalEnabledMessageSchema,
	checkRulesDirectoryMessageSchema,
	commandsMessageSchema,
	deleteCustomModeMessageSchema,
	exportModeMessageSchema,
	importModeMessageSchema,
	insertTextIntoTextareaMessageSchema,
	toggleApiConfigPinMessageSchema,
	updateCustomModeMessageSchema,
	updatePromptMessageSchema,
} from "./webview-messages/index.js"
// `shareTaskSuccessMessageSchema` was direction-mixed (a member of BOTH the
// inbound `WebviewMessage` union and the outbound `ExtensionMessage` union).
// Phase 3 (2026-08-12) removed the dead INBOUND standalone member (no sender,
// handler, or consumer anywhere in the repo); the OUTBOUND registration
// (Phase 2, Domain 5 — `packages/types/src/extension-messages/marketplace.ts`)
// is now the ONLY one and is re-exported from there at the package root.
export { shareTaskSuccessMessageSchema } from "./extension-messages/index.js"
// `skillsMessageSchema` and `rulesMessageSchema` are exported by BOTH
// registries: the inbound webview-messages skills/rules modules (S1 — the
// webview→extension request unions) and the outbound extension-messages
// skills/rules module (Phase 2, Domain 8 — the extension→webview response
// schemas). The star re-exports above collide on the names, so disambiguate
// explicitly in favor of the INBOUND schemas at the package root (the
// `CodeIndexMessage` precedent). The outbound variants remain available
// directly from "./extension-messages/index.js".
export { rulesMessageSchema, skillsMessageSchema } from "./webview-messages/index.js"
