import * as vscode from "vscode"

import { t } from "../../i18n"
import {
	ESBUILD_WASM_APPROX_SIZE,
	ESBUILD_WASM_SHA256,
	ESBUILD_WASM_TARBALL_URL,
	ESBUILD_WASM_VERSION,
} from "../custom-tools/esbuild-engine"
import { requestBinaryAcquisitionApproval, type BinaryAcquisitionInfo } from "./index"

/**
 * Builds the acquisition attribution metadata for the esbuild-wasm engine used
 * to transpile custom tools.
 *
 * esbuild is an externally-authored project (evanw/esbuild) distributed as the
 * `esbuild-wasm` npm package; it is NOT Roo+'s own code and the consent prompt
 * says so (Marketplace notice #305, D3/3A). The engine is fetched from the
 * canonical npm registry tarball for the pinned version.
 */
export function buildEsbuildAcquisitionInfo(): BinaryAcquisitionInfo {
	return {
		id: "esbuild-wasm",
		name: "esbuild-wasm (custom tools transpiler)",
		version: ESBUILD_WASM_VERSION,
		source: `esbuild-wasm on the npm registry (${ESBUILD_WASM_TARBALL_URL})`,
		purpose: t("common:binaryConsent.esbuildPurpose"),
		checksumSha256: ESBUILD_WASM_SHA256,
		approxSize: ESBUILD_WASM_APPROX_SIZE,
	}
}

/**
 * Gate for the esbuild engine auto-download path. Resolves `true` (download may
 * proceed) only when the workspace is trusted AND the user explicitly approved
 * this engine@version (or previously chose "Always allow").
 */
export async function requestEsbuildDownloadApproval(context: vscode.ExtensionContext): Promise<boolean> {
	return requestBinaryAcquisitionApproval(context.globalState, buildEsbuildAcquisitionInfo())
}
