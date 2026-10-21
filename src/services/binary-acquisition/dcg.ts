import * as vscode from "vscode"

import { t } from "../../i18n"
import { DCG_ARCHIVES, DCG_VERSION } from "../destructive-command-guard/constants"
import { requestBinaryAcquisitionApproval, type BinaryAcquisitionInfo } from "./index"

/**
 * Size of the DCG archive bundled inside the VSIX. The guard is a small native
 * CLI (see MAX_ARCHIVE_BYTES in destructive-command-guard/manager.ts); the label
 * is deliberately approximate and platform-independent. Nothing is downloaded:
 * the bytes already ship with the extension.
 */
const DCG_APPROX_SIZE = "~5 MB (bundled with the extension)"

/**
 * Mirrors `getDcgArchiveInfo`/`isDcgSupportedPlatform` in
 * destructive-command-guard/manager.ts without importing that module (which
 * would pull the managed-binary installer into every tool that references the
 * acquisition gate). Kept in lockstep with the DCG_ARCHIVES constant.
 */
function getCurrentDcgArchiveInfo(
	platform = process.platform,
	arch = process.arch,
): { archive: string; binary: "dcg" | "dcg.exe"; sha256: string; binarySha256: string } | undefined {
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
 * (Dicklesworthstone/destructive_command_guard) whose unmodified release
 * archives Roo+ distributes inside its own VSIX; it is NOT Roo+'s own code and
 * the consent prompt says so (Marketplace notice #305, D3/3A). The checksum
 * shown is the pinned upstream archive SHA-256.
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
 * Whether DCG is supported for the current platform (i.e. a bundled archive
 * exists for it).
 */
export function isDcgAcquisitionSupported(): boolean {
	return isCurrentDcgPlatformSupported()
}

/**
 * Gate for the DCG execution path. Resolves `true` (the guard may be provisioned
 * and run) only when the workspace is trusted AND the user explicitly approved
 * this binary@version (or previously chose "Always allow").
 *
 * DCG 3a (2026-10-21): DCG ships inside the VSIX, so this approval governs
 * **execution** of an already-distributed component — it is not a download
 * consent. The dialog still names the version, upstream source and SHA-256.
 */
export async function requestDcgExecutionApproval(context: vscode.ExtensionContext): Promise<boolean> {
	const info = buildDcgAcquisitionInfo()
	if (!info) {
		// Unsupported platform — there is nothing to approve.
		return true
	}
	return requestBinaryAcquisitionApproval(context.globalState, info)
}
