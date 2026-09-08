import * as vscode from "vscode"

import { t } from "../../i18n"
import {
	SEMBLE_ARCHIVES,
	SEMBLE_SHA256,
	SEMBLE_VERSION,
	isSembleSupportedPlatform,
} from "../code-index/semble/semble-downloader"
import { requestBinaryAcquisitionApproval, type BinaryAcquisitionInfo } from "./index"

/**
 * Approximate disk space the semble archive + extracted binary requires
 * (see ESTIMATED_REQUIRED_BYTES in semble-downloader.ts).
 */
const SEMBLE_APPROX_SIZE = "~150 MB"

/**
 * Builds the acquisition attribution metadata for the semble component on the
 * current platform, or `undefined` when this platform has no prebuilt semble.
 *
 * Semble is an externally-authored, source-published project
 * (Audare-est-Facere/sembleexec) that Roo+ builds and pins; it is NOT Roo+'s
 * own code and the consent prompt says so (Marketplace notice #305, D3/3A).
 */
export function buildSembleAcquisitionInfo(): BinaryAcquisitionInfo | undefined {
	const platformKey = `${process.platform}-${process.arch}`
	const archive = SEMBLE_ARCHIVES[platformKey]
	if (!archive) {
		return undefined
	}

	return {
		id: "semble",
		name: "Semble",
		version: SEMBLE_VERSION,
		source: "Audare-est-Facere/sembleexec (github.com/Audare-est-Facere/sembleexec)",
		purpose: t("common:binaryConsent.semblePurpose"),
		checksumSha256: SEMBLE_SHA256[platformKey],
		approxSize: SEMBLE_APPROX_SIZE,
	}
}

/**
 * Whether a Semble download is supported for the current platform.
 */
export function isSembleAcquisitionSupported(): boolean {
	return isSembleSupportedPlatform()
}

/**
 * Gate for the semble auto-download path. Resolves `true` (download may
 * proceed) only when the workspace is trusted AND the user explicitly
 * approved this binary@version (or previously chose "Always allow").
 */
export async function requestSembleDownloadApproval(context: vscode.ExtensionContext): Promise<boolean> {
	const info = buildSembleAcquisitionInfo()
	if (!info) {
		// Unsupported platform — there is nothing to approve.
		return true
	}
	return requestBinaryAcquisitionApproval(context.globalState, info)
}
