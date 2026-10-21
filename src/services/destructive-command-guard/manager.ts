import * as fs from "fs/promises"
import * as path from "path"

import { extractTarXzArchive, extractZipArchive } from "../managed-binary/archive"
import { verifySha256Checksum } from "../managed-binary/download"
import { ensureManagedBinaryInstalled } from "../managed-binary/install"

import { DCG_ARCHIVES, DCG_BUNDLE_DIR, DCG_VERSION, type DcgArchiveInfo } from "./constants"

const VERSION_FILE = ".dcg-version"

/**
 * Availability warnings are emitted ONCE per session, not once per command.
 *
 * A guard whose bundle is missing would otherwise warn on every
 * `execute_command` call — noise that trains users to ignore the message that
 * explains why their guard is not running.
 */
const availabilityWarnings = new Set<string>()

function warnAvailabilityOnce(key: string, message: string): void {
	if (availabilityWarnings.has(key)) {
		return
	}
	availabilityWarnings.add(key)
	console.warn(message)
}

export function getDcgArchiveInfo(platform = process.platform, arch = process.arch): DcgArchiveInfo | undefined {
	return DCG_ARCHIVES[`${platform}-${arch}`]
}

export function isDcgSupportedPlatform(platform = process.platform, arch = process.arch): boolean {
	return getDcgArchiveInfo(platform, arch) !== undefined
}

export function getDcgBinaryPath(
	storageDir: string,
	platform = process.platform,
	arch = process.arch,
): string | undefined {
	const info = getDcgArchiveInfo(platform, arch)
	return info ? path.join(storageDir, "destructive-command-guard", info.binary) : undefined
}

/**
 * Every place the bundled archive may live for a given "extension root".
 *
 * Two layouts are supported, in probe order:
 *
 *   1. `<extensionPath>/bin/dcg/<archive>` — a real install. A VSIX unpacked on
 *      disk is the package root, so the archives sit directly under it.
 *   2. `<extensionPath>/../bin/dcg/<archive>` — a BUILD OUTPUT directory. The
 *      CLI/headless host points `extensionPath` at `src/dist` (the directory
 *      that holds `extension.js`), and `bin/dcg` lives one level up in the
 *      package root (`src/bin/dcg`). Without this probe the guard would find no
 *      archive in the CLI and — before the fail-open change below — refuse every
 *      command (review finding M7).
 *
 * Roo+ never downloads DCG (decision DCG 3a, 2026-10-21), so these are the only
 * sources.
 */
export function getBundledDcgArchiveCandidates(
	extensionPath: string,
	platform = process.platform,
	arch = process.arch,
): string[] {
	const info = getDcgArchiveInfo(platform, arch)
	if (!info) {
		return []
	}
	const relative = [...DCG_BUNDLE_DIR.split("/"), info.archive]
	return [path.join(extensionPath, ...relative), path.resolve(extensionPath, "..", ...relative)]
}

/**
 * Primary absolute path of the DCG archive bundled inside the extension package,
 * or `undefined` when the platform has no prebuilt DCG. Prefer
 * {@link resolveBundledDcgArchive}, which probes every supported layout; this
 * remains for path reporting (error messages, tests).
 */
export function getBundledDcgArchivePath(
	extensionPath: string,
	platform = process.platform,
	arch = process.arch,
): string | undefined {
	return getBundledDcgArchiveCandidates(extensionPath, platform, arch)[0]
}

/**
 * Resolves the bundled archive for the current platform and confirms it is a
 * readable regular file, probing every supported package layout.
 *
 * `undefined` means AVAILABILITY: no archive ships for this platform, or none of
 * the candidate paths is readable. Callers fail open on that (see
 * {@link ensureDcgInstalled}).
 */
export async function resolveBundledDcgArchive(
	extensionPath: string,
	platform = process.platform,
	arch = process.arch,
): Promise<{ archivePath: string; info: DcgArchiveInfo } | undefined> {
	const info = getDcgArchiveInfo(platform, arch)
	if (!info) {
		return undefined
	}
	for (const candidate of getBundledDcgArchiveCandidates(extensionPath, platform, arch)) {
		try {
			const stats = await fs.stat(candidate)
			if (stats.isFile()) {
				return { archivePath: candidate, info }
			}
		} catch {
			// Not this layout; try the next candidate.
		}
	}
	return undefined
}

export async function verifyChecksum(filePath: string, expected: string): Promise<void> {
	await verifySha256Checksum(
		filePath,
		expected,
		(actual) => new Error(`DCG bundled archive checksum verification failed (got ${actual})`),
	)
}

/**
 * Verifies the extracted executable against the pinned per-platform hash, so a
 * VSIX whose archive was swapped (or whose extraction produced different
 * bytes) is rejected before the binary is executed.
 */
export async function verifyBinaryChecksum(filePath: string, expected: string): Promise<void> {
	await verifySha256Checksum(
		filePath,
		expected,
		(actual) => new Error(`DCG binary checksum verification failed (got ${actual})`),
	)
}

export async function extractSingleBinary(
	archivePath: string,
	stagingDir: string,
	info: DcgArchiveInfo,
): Promise<void> {
	if (info.archive.endsWith(".zip")) {
		await extractZipArchive(archivePath, stagingDir)
		return
	}

	await extractTarXzArchive(archivePath, stagingDir)
}

/**
 * Raised when the bytes that should have shipped in the package are absent.
 *
 * It is distinguished from an integrity failure because the two have OPPOSITE
 * policies: a missing bundle is an availability problem (fail open), while a
 * checksum mismatch is an integrity problem (fail closed).
 */
class DcgBundleUnavailableError extends Error {
	constructor(message: string) {
		super(message)
		this.name = "DcgBundleUnavailableError"
	}
}

/**
 * True when `error` — or anything in its `cause` chain — is a bundle-availability
 * failure. The managed-binary installer wraps every error it throws
 * (`Failed to install DCG: …`, with `{ cause }`), so `instanceof` alone is not
 * enough.
 */
export function isDcgBundleUnavailableError(error: unknown): boolean {
	let current: unknown = error
	while (current && typeof current === "object") {
		if (current instanceof DcgBundleUnavailableError) {
			return true
		}
		current = (current as { cause?: unknown }).cause
	}
	return false
}

/**
 * Gate forwarded to the managed-binary installer. It is invoked only when an
 * actual installation is required (never when an up-to-date binary is already
 * present), giving the acquisition consent flow a single interception point.
 */
export type DcgInstallGate = {
	onBeforeInstall?: () => Promise<boolean>
}

export type DcgInstallOptions = {
	/** Absolute path of the installed extension (`ExtensionContext.extensionPath`). */
	extensionPath: string
	gate?: DcgInstallGate
}

/**
 * Ensures the DCG binary is installed for `storageDir` from the archive bundled
 * in the extension package.
 *
 * No network access happens here: the bundled archive is copied into the
 * extension's storage directory, checked against the pinned upstream SHA-256,
 * extracted, and the extracted executable is checked against its own pinned
 * SHA-256 before the version marker is written. There is no download fallback.
 *
 * AVAILABILITY vs INTEGRITY — the distinction is the contract:
 *
 *   · AVAILABILITY failure (no prebuilt DCG for this OS/arch, no bundled archive
 *     for this layout, unreadable path) resolves `undefined` after ONE loud
 *     warning. The guard disables itself and the caller runs the command exactly
 *     as if the feature were off. A pack that lost the bytes, or a host with no
 *     prebuilt binary, must never refuse every command.
 *   · INTEGRITY failure (archive hash mismatch, corrupt archive, extracted
 *     executable hash mismatch, unexpected executable, user denied consent) is
 *     THROWN. The guard refuses to run and says why — the command is never run
 *     unguarded as though the check had passed.
 */
export async function ensureDcgInstalled(storageDir: string, options: DcgInstallOptions): Promise<string | undefined> {
	const info = getDcgArchiveInfo()
	if (!info) {
		// Availability: nothing ships for this platform. Fail open, loudly, once.
		const platformKey = `${process.platform}-${process.arch}`
		warnAvailabilityOnce(
			`unsupported-platform:${platformKey}`,
			`[DCG] Unsupported platform: ${platformKey}. The destructive command guard is disabled and commands run unguarded.`,
		)
		return undefined
	}

	const bundled = await resolveBundledDcgArchive(options.extensionPath)

	try {
		return await ensureManagedBinaryInstalled({
			storageDir,
			id: "destructive-command-guard",
			version: DCG_VERSION,
			versionFile: VERSION_FILE,
			archiveName: info.archive,
			binaryName: info.binary,
			errorPrefix: "Failed to install DCG",
			// Local copy only — the bundled archive is the artefact that ships. An
			// already-installed current binary short-circuits before this runs, so a
			// missing archive only matters when an installation is actually needed.
			provisionArchive: async (destination) => {
				if (!bundled) {
					throw new DcgBundleUnavailableError(
						`bundled archive is missing from the extension package (looked in: ${getBundledDcgArchiveCandidates(
							options.extensionPath,
						).join(", ")})`,
					)
				}
				await fs.copyFile(bundled.archivePath, destination)
			},
			verifyArchive: (archive) => verifyChecksum(archive, info.sha256),
			extractArchive: (archive, stagingDir) => extractSingleBinary(archive, stagingDir, info),
			validateBinary: (binary) => verifyBinaryChecksum(binary, info.binarySha256),
			onBeforeProvision: options.gate?.onBeforeInstall,
		})
	} catch (error) {
		if (!isDcgBundleUnavailableError(error)) {
			// Integrity (or consent) failure: fail closed, exactly as before.
			throw error
		}
		// Availability: fail open with one loud warning per session.
		const platformKey = `${process.platform}-${process.arch}`
		warnAvailabilityOnce(
			`bundle-missing:${platformKey}:${options.extensionPath}`,
			`[DCG] The destructive command guard is DISABLED: no bundled DCG archive was found for ${platformKey} under ${options.extensionPath}. Commands run unguarded (nothing is downloaded). Reinstall the extension to restore the guard.`,
		)
		return undefined
	}
}
