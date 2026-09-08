import * as vscode from "vscode"

import { t } from "../../i18n"
import { DCG_ARCHIVES, DCG_VERSION } from "../destructive-command-guard/constants"
import { requestBinaryAcquisitionApproval, type BinaryAcquisitionInfo } from "./index"

/**
 * Approximate compressed download size for the DCG archive.
 * The guard is a small native CLI (see MAX_ARCHIVE_BYTES in
 * destructive-command-guard/manager.ts); the label is deliberately
 * approximate and platform-independent.
 */
const DCG_APPROX_SIZE = "~5 MB"

/**
 * Mirrors `getDcgArchiveInfo`/`isDcgSupportedPlatform` in
 * destructive-command-guard/manager.ts without importing that module (which
 * would pull the managed-binary installer into every tool that references the
 * acquisition gate). Kept in lockstep with the DCG_ARCHIVES constant.
 */
function getCurrentDcgArchiveInfo(
	platform = process.platform,
	arch = process.arch,
): { archive: string; binary: "dcg" | "dcg.exe"; sha256: string } | undefined {
	return DCG_ARCHIVES[`${platform}-${arch}`]
}

function isCurrentDcgPlatformSupported(): boolean {
	return getCurrentDcgArchiveInfo() !== undefined
}

/**
 * Builds the acquisition attribution metadata for the DCG component on the
 * current platform, or `undefined` when this platform has no prebuilt DCG.
 *
 * DCG (destructive command guard) is an externally-authored project
 * (Dicklesworthstone/destructive_command_guard) that Roo+ packages; it is NOT
 * Roo+'s own code and the consent prompt says so (Marketplace notice #305,
 * D3/3A).
 */
export function buildDcgAcquisitionInfo(): BinaryAcquisitionInfo | undefined {
	const archive = getCurrentDcgArchiveInfo()
	if (!archive) {
		return undefined
	}

	return {
		id: "destructive-command-guard",
		name: "DCG (Destructive Command Guard)",
		version: DCG_VERSION,
		source: "Dicklesworthstone/destructive_command_guard (github.com/Dicklesworthstone/destructive_command_guard)",
		purpose: t("common:binaryConsent.dcgPurpose"),
		checksumSha256: archive.sha256,
		approxSize: DCG_APPROX_SIZE,
	}
}

/**
 * Whether a DCG download is supported for the current platform.
 */
export function isDcgAcquisitionSupported(): boolean {
	return isCurrentDcgPlatformSupported()
}

/**
 * Gate for the DCG auto-download path. Resolves `true` (download may proceed)
 * only when the workspace is trusted AND the user explicitly approved this
 * binary@version (or previously chose "Always allow").
 */
export async function requestDcgDownloadApproval(context: vscode.ExtensionContext): Promise<boolean> {
	const info = buildDcgAcquisitionInfo()
	if (!info) {
		// Unsupported platform — there is nothing to approve.
		return true
	}
	return requestBinaryAcquisitionApproval(context.globalState, info)
}
