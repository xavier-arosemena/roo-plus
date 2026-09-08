import * as vscode from "vscode"

import { t } from "../i18n"

/**
 * i18n key used to explain why Roo+ needs a trusted workspace.
 *
 * Trust model & contract (Marketplace notice #305, D2; decision recorded in
 * DEBT.md #27):
 *
 * - The manifest declares `capabilities.untrustedWorkspaces.supported: false`
 *   (see src/package.json). VS Code therefore never activates this extension
 *   in a Restricted (untrusted) workspace — the editor enforces the boundary,
 *   so any window that runs this code has already been granted trust.
 * - `vscode.workspace.isTrusted` only ever reads two RESOLVED values in a
 *   window where this extension can run: `true` (trusted workspace) or
 *   `false` (a resolved-but-untrusted edge, e.g. a trusted-but-untrusted-
 *   folder transition or a development launch). These helpers are the in-code
 *   defense-in-depth layer for that resolved-`false` case, so a workspace can
 *   never grant the agent approvals on its own.
 * - `undefined` (trust not yet resolved, no workspace open, or a host with no
 *   workspace-trust surface — the CLI vscode-shim or unit tests) is treated as
 *   TRUSTED by reviewed contract: it never represents a restricted-but-active
 *   workspace (that state is either resolved `false` or the extension is not
 *   activated), and failing it closed would break the headless CLI and test
 *   hosts that legitimately run this code without a trust API.
 */
export const WORKSPACE_TRUST_MESSAGE_KEY = "common:workspaceTrust.message"

/**
 * Minimal structural view of the workspace-trust surface we consume.
 *
 * `@types/vscode` (the versioned stub this repo pins) does not expose the
 * workspace-trust API members, so we read them structurally through `unknown`
 * and a runtime type guard rather than casting to an uninhabitable type.
 */
type WorkspaceTrustApi = {
	isTrusted?: boolean
	requestWorkspaceTrust?: (options?: { modal?: boolean; message?: string }) => Thenable<boolean>
}

function getWorkspaceTrustApi(): WorkspaceTrustApi {
	const workspace = vscode.workspace as unknown
	return workspace && typeof workspace === "object" ? (workspace as WorkspaceTrustApi) : {}
}

/**
 * Returns whether the current workspace is trusted.
 *
 * CONTRACT (reviewed — see DEBT.md #27): only a RESOLVED `false`
 * (`vscode.workspace.isTrusted === false`) is treated as untrusted. A resolved
 * `true` is trusted, and an `undefined` value — trust not yet resolved, no
 * workspace open, or a host with no workspace-trust surface (the CLI
 * vscode-shim, unit tests) — is treated as trusted by design.
 *
 * Why `undefined` → true is deliberate, not an accident:
 * - The manifest's `supported: false` declaration makes VS Code refuse to
 *   activate this extension in Restricted Mode, so `undefined` can never mean
 *   "a restricted workspace is running this code". A restricted-but-active
 *   window is impossible; a resolved untrusted workspace reports `false`,
 *   which this gate already blocks.
 * - In every real window where this extension runs, trust has been resolved
 *   to `true` before any gated operation (activation follows the trust grant),
 *   and an empty window (no workspace open) is trusted by default
 *   (`security.workspace.trust.emptyWindow` defaults to `true`).
 * - Failing `undefined` closed would break the headless CLI (whose vscode-shim
 *   exposes no `isTrusted`) and the unit-test host, which legitimately run
 *   these gates without a workspace-trust API. It would therefore regress
 *   legitimate flows while adding no protection in a real VS Code window.
 */
export function isWorkspaceTrusted(): boolean {
	return getWorkspaceTrustApi().isTrusted !== false
}

/**
 * Asks the user to grant workspace trust using VS Code's native trust dialog.
 *
 * Fails safe to `false` when the API is unavailable or the user declines, so
 * callers never proceed with a sensitive operation on a best-effort basis.
 *
 * @param messageKey - Optional i18n key (resolved via {@link t}) shown in the
 * trust request to explain why trust is required.
 */
export async function requestWorkspaceTrust(messageKey?: string): Promise<boolean> {
	const request = getWorkspaceTrustApi().requestWorkspaceTrust

	if (typeof request !== "function") {
		return false
	}

	const options: { modal?: boolean; message?: string } = {}
	if (messageKey) {
		options.message = t(messageKey)
	}

	try {
		const granted = await request(options)
		return granted === true
	} catch {
		// A failing/failing-closed trust request must never slide into an
		// approval — treat it as not granted.
		return false
	}
}

/**
 * Ensures the current workspace is trusted before a sensitive operation runs.
 *
 * Returns `true` when the operation may proceed (already trusted, or trust was
 * just granted). When the workspace is explicitly untrusted, a clear message
 * is shown and trust is requested; if the user declines (or the request
 * cannot be shown) this returns `false` and the caller must NOT run the
 * operation.
 *
 * @param messageKey - i18n key explaining why this operation needs trust.
 */
export async function ensureWorkspaceTrusted(messageKey: string = WORKSPACE_TRUST_MESSAGE_KEY): Promise<boolean> {
	if (isWorkspaceTrusted()) {
		return true
	}

	return requestWorkspaceTrust(messageKey)
}
