import * as vscode from "vscode"

import { t } from "../i18n"

/**
 * i18n key used to explain why Roo+ needs a trusted workspace.
 *
 * The manifest declares `capabilities.untrustedWorkspaces.supported: false`
 * (see src/package.json), which makes VS Code disable this extension in
 * Restricted Mode entirely. The helpers in this module are the in-code
 * defense-in-depth layer for the narrow case where the extension host is
 * active while `vscode.workspace.isTrusted` reports an untrusted workspace
 * (for example a trusted-but-untrusted-folder edge or a development launch),
 * so a workspace can never grant the agent approvals on its own.
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
 * VS Code only resolves `vscode.workspace.isTrusted` once it has decided on
 * workspace trust. When the value is `undefined` (no workspace open, or an
 * environment that never resolved trust — e.g. unit tests) we treat the
 * workspace as trusted so the runtime gate is a no-op; the manifest's
 * `supported: false` declaration remains the authoritative protection for
 * truly Restricted workspaces, where this extension is never activated.
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
