import * as vscode from "vscode"

import { t } from "../../i18n"
import { ensureWorkspaceTrusted, WORKSPACE_TRUST_MESSAGE_KEY } from "../../utils/workspaceTrust"

/**
 * Binary acquisition consent.
 *
 * Roo+ can download and run helper components (Semble, DCG) that are authored
 * and maintained outside of this repository. Before any download+execute the
 * user must explicitly approve the acquisition — with the component name,
 * pinned version, upstream source repository, SHA-256 and approximate size
 * (Marketplace notice #305, D3/3A).
 *
 * The decision is persisted in VS Code storage ONLY after an explicit user
 * choice. There is no auto-default to "allow": an un-persisted binary always
 * prompts. A download is never attempted while the workspace is untrusted.
 */

/** GlobalState key that holds the persisted per binary@version decisions. */
export const BINARY_ACQUISITION_CONSENT_STORAGE_KEY = "binaryAcquisitionConsent.v1"

export type BinaryAcquisitionDecision = "allow-once" | "always-allow" | "deny"

export interface BinaryAcquisitionInfo {
	/** Stable machine id used in the storage key (e.g. "semble"). */
	id: string
	/** Human readable component name (e.g. "Semble"). */
	name: string
	/** Pinned version (e.g. "v0.5.2"). */
	version: string
	/** Upstream source repository (e.g. "Audare-est-Facere/sembleexec"). */
	source: string
	/** Purpose sentence used in the consent prompt (already localized). */
	purpose: string
	/** SHA-256 of the artifact that will be verified after download. */
	checksumSha256?: string
	/** Approximate download/extracted size, human readable (e.g. "~150 MB"). */
	approxSize: string
}

/**
 * Minimal view of the VS Code `Memento` surface we persist to. `ExtensionContext.globalState`
 * satisfies this, and unit tests can provide an in-memory double.
 */
export interface BinaryAcquisitionConsentStorage {
	get(key: string, defaultValue: unknown): unknown
	update(key: string, value: unknown): Thenable<void>
}

/**
 * "Allow once" and "Deny" decisions are scoped to the current session only
 * (they are not persisted), so the same acquisition is not re-prompted in a
 * single run but is asked again on the next VS Code session. "Always allow"
 * is the only decision persisted to VS Code storage.
 */
const sessionOnceAllowed = new Set<string>()
const sessionDenied = new Set<string>()

/**
 * Resets the session-scoped consent bookkeeping. Used by tests and by the
 * reset paths that explicitly retry an acquisition after a user action.
 */
export function resetBinaryConsentSession(): void {
	sessionOnceAllowed.clear()
	sessionDenied.clear()
}

export function binaryAcquisitionStorageKey(id: string, version: string): string {
	return `${id}@${version}`
}

function readConsentRecord(storage: BinaryAcquisitionConsentStorage): Record<string, string> {
	const raw = storage.get(BINARY_ACQUISITION_CONSENT_STORAGE_KEY, {})
	if (raw && typeof raw === "object" && !Array.isArray(raw)) {
		return raw as Record<string, string>
	}
	return {}
}

/**
 * True when an explicit "Always allow" decision has been persisted for this
 * binary at this exact version. Version-scoped: bumping the pinned version
 * clears the prior consent and requires a fresh approval.
 */
export async function hasAlwaysAllowConsent(
	storage: BinaryAcquisitionConsentStorage,
	id: string,
	version: string,
): Promise<boolean> {
	return readConsentRecord(storage)[binaryAcquisitionStorageKey(id, version)] === "always-allow"
}

/**
 * Persists an explicit consent decision. Only `always-allow` is stored;
 * `allow-once` and `deny` remain session-scoped and must be re-decided next
 * session. This guarantees there is never a stored default that silently
 * authorizes an acquisition the user did not explicitly approve.
 */
export async function persistConsentDecision(
	storage: BinaryAcquisitionConsentStorage,
	id: string,
	version: string,
	decision: BinaryAcquisitionDecision,
): Promise<void> {
	if (decision !== "always-allow") {
		return
	}

	const key = binaryAcquisitionStorageKey(id, version)
	const record = readConsentRecord(storage)
	record[key] = decision
	await storage.update(BINARY_ACQUISITION_CONSENT_STORAGE_KEY, record)
}

/**
 * Builds the localized consent prompt message for the given component.
 */
export function buildBinaryAcquisitionConsentMessage(info: BinaryAcquisitionInfo): string {
	return t("common:binaryConsent.prompt", {
		name: info.name,
		version: info.version,
		source: info.source,
		sha256: info.checksumSha256 ?? "-",
		size: info.approxSize,
		purpose: info.purpose,
	})
}

/**
 * Shows an explicit three-way consent dialog (Allow once / Always allow /
 * Deny). When the dialog is dismissed (no selection) the decision is "deny" —
 * never an implicit allow.
 *
 * @param prompt - Overridable prompt for tests. Defaults to a VS Code modal
 * warning dialog.
 */
export async function requestBinaryAcquisitionConsent(
	info: BinaryAcquisitionInfo,
	prompt: (message: string) => Thenable<string | undefined> = defaultConsentPrompt,
): Promise<BinaryAcquisitionDecision> {
	const allowOnceLabel = t("common:binaryConsent.allowOnce")
	const alwaysAllowLabel = t("common:binaryConsent.alwaysAllow")
	const denyLabel = t("common:binaryConsent.deny")

	const selection = await prompt(buildBinaryAcquisitionConsentMessage(info))

	if (selection === allowOnceLabel) {
		return "allow-once"
	}
	if (selection === alwaysAllowLabel) {
		return "always-allow"
	}
	// Dismissed or Deny → deny. Never auto-default to allow.
	return "deny"
}

function defaultConsentPrompt(message: string): Thenable<string | undefined> {
	return vscode.window.showWarningMessage(message, { modal: true }, ...consentButtonLabels())
}

function consentButtonLabels(): [string, string, string] {
	return [t("common:binaryConsent.allowOnce"), t("common:binaryConsent.alwaysAllow"), t("common:binaryConsent.deny")]
}

/**
 * Full approval gate for a binary acquisition, shared by Semble and DCG.
 *
 * Order of operations:
 * 1. The workspace must be trusted — a download is NEVER attempted in an
 *    untrusted workspace (Marketplace #305 D2). If not trusted we show a
 *    message and request trust.
 * 2. A persisted "Always allow" decision short-circuits to approval.
 * 3. A session "Allow once" or "Deny" short-circuits within this session.
 * 4. Otherwise an explicit consent dialog is shown. Only an explicit
 *    "Always allow" is persisted to VS Code storage.
 *
 * @returns true when acquisition may proceed.
 */
export async function requestBinaryAcquisitionApproval(
	storage: BinaryAcquisitionConsentStorage,
	info: BinaryAcquisitionInfo,
): Promise<boolean> {
	const key = binaryAcquisitionStorageKey(info.id, info.version)

	// Step 1 — trust gate.
	if (!(await ensureWorkspaceTrusted(WORKSPACE_TRUST_MESSAGE_KEY))) {
		return false
	}

	// Step 2 — persisted "Always allow".
	if (await hasAlwaysAllowConsent(storage, info.id, info.version)) {
		return true
	}

	// Step 3 — session-scoped decisions.
	if (sessionDenied.has(key)) {
		return false
	}
	if (sessionOnceAllowed.has(key)) {
		return true
	}

	// Step 4 — explicit consent dialog.
	const decision = await requestBinaryAcquisitionConsent(info)

	if (decision === "deny") {
		sessionDenied.add(key)
		return false
	}
	if (decision === "allow-once") {
		sessionOnceAllowed.add(key)
		return true
	}
	if (decision === "always-allow") {
		await persistConsentDecision(storage, info.id, info.version, decision)
		return true
	}
	return false
}
