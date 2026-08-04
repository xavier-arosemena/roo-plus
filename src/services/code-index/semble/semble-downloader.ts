import * as fs from "fs/promises"
import * as path from "path"
import * as https from "https"
import { createWriteStream } from "fs"
import { createHash } from "crypto"
import { createReadStream } from "fs"
import { spawn } from "child_process"

/**
 * Supported platform/arch combinations for the semble standalone executable.
 * Maps to archive names at https://github.com/Audare-est-Facere/sembleexec/releases
 *
 * Uses "fast-start" archives (one-dir builds) for ~20x faster startup
 * compared to single-file binaries.
 */
export const SEMBLE_ARCHIVES: Record<string, { archive: string; binary: string }> = {
	"linux-x64": { archive: "semble-linux-x64-fast.tar.gz", binary: "semble" },
	"linux-arm64": { archive: "semble-linux-arm64-fast.tar.gz", binary: "semble" },
	"darwin-arm64": { archive: "semble-macos-arm64-fast.tar.gz", binary: "semble" },
	"win32-x64": { archive: "semble-windows-x64-fast.zip", binary: "semble.exe" },
}

/**
 * The bundled semble version. Surfaced to the UI via the provider's
 * system-state message so users can see which version is active.
 */
export const SEMBLE_VERSION = "v0.5.2"

/**
 * Version resolution pattern. Pinned to a concrete release tag (SEMBLE_VERSION)
 * so fresh installs download exactly the version this repo tests against — no
 * runtime HEAD requests, no drift from upstream.
 *
 * The "latest" mechanism (fetch the newest GitHub release tag before
 * downloading) is retained but DISABLED by default: it is only used when this
 * constant is "latest" OR the SEMBLE_RESOLVE_LATEST env var is set. Opting in
 * means a future upstream release could be auto-pulled and verified against
 * this repo's CLI contract and checksums WITHOUT prior testing — SEMBLE_SHA256
 * must be regenerated for any new tag first.
 */
// Typed as `string` (not the literal `"v0.5.2"`) so the `=== "latest"` opt-in
// check in shouldResolveLatest() remains valid.
export const SEMBLE_VERSION_PATTERN: string = SEMBLE_VERSION

/**
 * Env var that opts into resolving the latest GitHub release tag at install
 * time (see SEMBLE_VERSION_PATTERN). Defaults to off so installs stay
 * deterministic and network-independent.
 */
const RESOLVE_LATEST_ENV = "SEMBLE_RESOLVE_LATEST"

/**
 * Returns true only when the "latest" version-resolution mechanism is
 * explicitly opted into — via SEMBLE_VERSION_PATTERN === "latest" or the
 * SEMBLE_RESOLVE_LATEST env var being set to "1"/"true".
 */
function shouldResolveLatest(): boolean {
	if (SEMBLE_VERSION_PATTERN === "latest") {
		return true
	}
	const raw = process.env[RESOLVE_LATEST_ENV]
	return raw === "1" || raw?.toLowerCase() === "true"
}

const DOWNLOAD_BASE_URL = `https://github.com/Audare-est-Facere/sembleexec/releases/download/${SEMBLE_VERSION}`
const VERSION_FILE = ".semble-version"

/**
 * Ordered list of download sources for the semble binary. Each entry is a
 * base URL pointing to a GitHub release directory for the current
 * SEMBLE_VERSION. The archive filename is appended by the download logic.
 *
 * Sources are tried in order; if a source fails, the download moves to the
 * next. Only the primary source is currently configured.
 */
const DOWNLOAD_FALLBACK_URLS = [
	DOWNLOAD_BASE_URL, // primary: Audare-est-Facere/sembleexec
]

/**
 * SHA-256 checksums for each platform archive at SEMBLE_VERSION.
 * These are verified after download to guard against tampered release assets.
 * Update these when bumping SEMBLE_VERSION.
 *
 * To regenerate: `shasum -a 256 <archive-file>`
 */
export const SEMBLE_SHA256: Record<string, string> = {
	"linux-x64": "bd5be465659c220335f1e2d4e1afe117288ae7f8ceab93902ac737662e9309d3",
	"linux-arm64": "2f7fae09d5144eb5f58f566f7c507c7feea3ba0b1cee9972f97ae992234a5a1f",
	"darwin-arm64": "f79e0d52cdd6b9680e31ceba8dbaacfa6ea93fa21785f84cc04d13fb782e5881",
	"win32-x64": "c793051829fd440939f7d9735649e6027bb42182f19f1c324dbeb0ed6c9118ad",
}

/**
 * Estimated required disk space for the semble archive + extracted binary (~150MB).
 * Used by checkDiskSpace() to pre-validate available space before downloading.
 */
const ESTIMATED_REQUIRED_BYTES = 150 * 1024 * 1024 // 150 MB

/**
 * Version resolution pattern URL suffix for fetching the latest release.
 * GitHub redirects /releases/latest to the actual latest tag.
 */
const LATEST_RELEASE_SUFFIX = "/releases/latest"

/**
 * Fetches the latest semble release tag from GitHub releases API.
 * Follows redirects from /releases/latest to extract the tag from the final URL.
 * Falls back to the hardcoded SEMBLE_VERSION on network error.
 *
 * @returns The resolved version string (e.g. "v0.5.2")
 */
export async function resolveSembleVersion(): Promise<string> {
	// Deterministic fast path: when the pattern is pinned (the default), return
	// the pinned SEMBLE_VERSION directly — no HEAD requests, no network I/O.
	// Fresh installs are therefore network-independent and identical every time.
	if (!shouldResolveLatest()) {
		return SEMBLE_VERSION
	}

	// Build latest-release URLs from the fallback base URLs
	const urls = DOWNLOAD_FALLBACK_URLS.map((base) => {
		// Replace /download/{version} with /latest
		const idx = base.indexOf(`/download/${SEMBLE_VERSION}`)
		if (idx === -1) return base + LATEST_RELEASE_SUFFIX
		return base.substring(0, idx) + LATEST_RELEASE_SUFFIX
	})

	for (const apiUrl of urls) {
		try {
			const version = await fetchLatestVersionFromUrl(apiUrl)
			if (version) {
				return version
			}
		} catch {
			continue
		}
	}
	return SEMBLE_VERSION // fallback to hardcoded
}

/**
 * Makes a HEAD request to the given URL and follows redirects to extract the
 * version tag from the final redirected URL.
 *
 * GitHub's /releases/latest redirects (302) to /releases/tag/v{version}.
 * We follow the chain and parse the tag from the final Location header.
 */
async function fetchLatestVersionFromUrl(apiUrl: string): Promise<string | undefined> {
	return new Promise((resolve, reject) => {
		const request = https.get(
			apiUrl,
			{
				method: "HEAD",
				timeout: 3_000,
			},
			(response) => {
				// Follow redirects manually
				if (
					response.statusCode &&
					response.statusCode >= 300 &&
					response.statusCode < 400 &&
					response.headers.location
				) {
					response.destroy()
					const redirectUrl = response.headers.location
					// The final redirect target should be /releases/tag/v{version}
					const tagMatch = redirectUrl.match(/\/releases\/tag\/(v[\d.]+)/i)
					if (tagMatch) {
						resolve(tagMatch[1])
					} else {
						// Follow one more redirect if needed
						fetchLatestVersionFromUrl(redirectUrl).then(resolve).catch(reject)
					}
					return
				}

				if (response.statusCode === 200) {
					// Some mirrors may return the tag in the response URL directly
					resolve(undefined)
				} else {
					response.destroy()
					reject(new Error(`HTTP ${response.statusCode}`))
				}
			},
		)

		request.on("error", reject)
		request.on("timeout", () => {
			request.destroy()
			reject(new Error("Request timed out"))
		})
	})
}

/**
 * Downloads and parses the SHA-256 checksums manifest from the release.
 * Falls back to the hardcoded SEMBLE_SHA256 on any failure.
 *
 * The manifest file (`checksums-sha256.txt`) contains lines in the format:
 *   <sha256-hash>  <filename>
 *
 * @param storageDir - Directory to cache the manifest file
 * @param version - The semble version to fetch checksums for
 * @param baseUrl - Base URL of the release (without trailing slash)
 * @returns A record mapping filenames to their SHA-256 hashes
 */
export async function downloadChecksums(
	storageDir: string,
	version: string,
	baseUrl: string,
): Promise<Record<string, string>> {
	const manifestUrl = `${baseUrl}/checksums-sha256.txt`
	try {
		const manifestPath = path.join(storageDir, `checksums-${version}.txt`)
		await downloadFile(manifestUrl, manifestPath)

		const content = await fs.readFile(manifestPath, "utf-8")
		const checksums: Record<string, string> = {}
		for (const line of content.trim().split("\n")) {
			const trimmed = line.trim()
			if (!trimmed) continue
			const parts = trimmed.split(/\s+/)
			if (parts.length >= 2) {
				checksums[parts[1]] = parts[0]
			}
		}
		return Object.keys(checksums).length > 0 ? checksums : SEMBLE_SHA256
	} catch {
		// Fallback to hardcoded checksums
		return SEMBLE_SHA256
	}
}

/**
 * Checks that the storage directory has sufficient disk space for the download.
 * Uses platform-specific tools (df on Linux/macOS).
 *
 * @param storageDir - Directory to check
 * @param requiredBytes - Minimum required bytes
 * @throws If there is insufficient disk space
 */
export async function checkDiskSpace(storageDir: string, requiredBytes: number): Promise<void> {
	if (process.platform === "win32") {
		// Windows: use `dir` to check, but skip detailed check for simplicity
		// Windows disk space checks are handled by validateInstallPath
		return
	}

	try {
		// Use `df -k` (reports in 1K blocks) on the storage directory's filesystem
		const { execFile } = await import("child_process")
		const { promisify } = await import("util")
		const execFileAsync = promisify(execFile)
		const { stdout } = await execFileAsync("df", ["-k", "--output=avail", storageDir], {
			timeout: 5_000,
		})
		const lines = stdout.trim().split("\n")
		if (lines.length >= 2) {
			const availableKB = parseInt(lines[1].trim(), 10)
			if (!isNaN(availableKB)) {
				const availableBytes = availableKB * 1024
				if (availableBytes < requiredBytes) {
					throw new Error(
						`Insufficient disk space in ${storageDir}: ` +
							`${(availableBytes / 1024 / 1024).toFixed(1)} MiB available, ` +
							`${(requiredBytes / 1024 / 1024).toFixed(1)} MiB required`,
					)
				}
			}
		}
	} catch (error) {
		// If df fails (e.g. directory doesn't exist yet), skip the check
		if (error instanceof Error && error.message.startsWith("Insufficient disk space")) {
			throw error
		}
		// Otherwise silently skip — validateInstallPath will catch permission issues
	}
}

/**
 * Validates that the storage directory exists and is writable.
 * Creates the directory if it does not exist.
 *
 * @param storageDir - Directory to validate
 * @throws If the directory is not writable
 */
export async function validateInstallPath(storageDir: string): Promise<void> {
	await fs.mkdir(storageDir, { recursive: true })

	const testFile = path.join(storageDir, ".write-test")
	try {
		await fs.writeFile(testFile, "test", "utf-8")
		await fs.unlink(testFile)
	} catch (error) {
		throw new Error(
			`Storage directory is not writable: ${storageDir}${error instanceof Error ? ` (${error.message})` : ""}`,
		)
	}
}

/**
 * Verifies the SHA-256 checksum of a downloaded file against the expected value.
 * Throws if the checksum does not match.
 */
export async function verifyChecksum(filePath: string, expected: string): Promise<void> {
	const hash = createHash("sha256")
	await new Promise<void>((resolve, reject) => {
		const stream = createReadStream(filePath)
		stream.on("data", (chunk) => hash.update(chunk))
		stream.on("end", resolve)
		stream.on("error", reject)
	})
	const actual = hash.digest("hex")
	if (actual !== expected) {
		throw new Error(
			`Checksum mismatch for ${path.basename(filePath)}: expected ${expected.slice(0, 12)}…, got ${actual.slice(0, 12)}…`,
		)
	}
}

/**
 * Returns whether the current platform/arch has a prebuilt semble binary available.
 */
export function isSembleSupportedPlatform(platform?: string, arch?: string): boolean {
	const p = platform ?? process.platform
	const a = arch ?? process.arch
	return `${p}-${a}` in SEMBLE_ARCHIVES
}

/**
 * Returns the list of supported platform-arch keys (e.g. "linux-x64", "darwin-arm64").
 */
export function getSembleSupportedPlatforms(): string[] {
	return Object.keys(SEMBLE_ARCHIVES)
}

/**
 * Returns the archive info for the given platform/arch, or undefined if unsupported.
 */
function getArchiveInfo(platform?: string, arch?: string): { archive: string; binary: string } | undefined {
	const p = platform ?? process.platform
	const a = arch ?? process.arch
	return SEMBLE_ARCHIVES[`${p}-${a}`]
}

/**
 * Resolve the actual semble executable under `baseDir`.
 * Handles flat archives (<base>/semble) AND PyInstaller one-dir archives
 * (<base>/semble/semble). Returns undefined when no regular FILE named
 * `binaryName` is found (a directory at <base>/<binaryName> is NOT a binary —
 * spawning a directory yields EACCES).
 */
async function resolveSembleBinary(baseDir: string, binaryName: string): Promise<string | undefined> {
	const direct = path.join(baseDir, binaryName)
	try {
		if ((await fs.stat(direct)).isFile()) return direct
	} catch {
		// not present
	}

	const nested = path.join(direct, binaryName)
	try {
		if ((await fs.stat(nested)).isFile()) return nested
	} catch {
		// not present
	}

	// Bounded recursive fallback (max depth ~4) for renamed wrapper dirs.
	return findFileNamed(baseDir, binaryName, 0, 4)
}

async function findFileNamed(dir: string, name: string, depth: number, maxDepth: number): Promise<string | undefined> {
	if (depth > maxDepth) return undefined
	let entries: import("fs").Dirent[]
	try {
		entries = await fs.readdir(dir, { withFileTypes: true })
	} catch {
		return undefined
	}
	for (const entry of entries) {
		const full = path.join(dir, entry.name)
		if (entry.isFile() && entry.name === name) return full
		if (entry.isDirectory()) {
			const found = await findFileNamed(full, name, depth + 1, maxDepth)
			if (found) return found
		}
	}
	return undefined
}

/**
 * Reads the locally installed semble version from the version metadata file
 * (`<storageDir>/semble/.semble-version`). Returns undefined if no version file
 * exists (first install, legacy, or a manual binaryPathOverride with no prior
 * download). Exposed so the provider can surface the actually-installed version
 * in its ready message when the opt-in "latest" resolution resolves a different
 * tag than the hardcoded SEMBLE_VERSION.
 */
export async function getInstalledSembleVersion(storageDir: string): Promise<string | undefined> {
	try {
		const versionPath = path.join(storageDir, "semble", VERSION_FILE)
		const version = (await fs.readFile(versionPath, "utf-8")).trim()
		return version || undefined
	} catch {
		return undefined
	}
}

/**
 * Writes the version metadata file after a successful download.
 */
async function writeInstalledVersion(storageDir: string, version: string): Promise<void> {
	const versionPath = path.join(storageDir, "semble", VERSION_FILE)
	await fs.writeFile(versionPath, version, "utf-8")
}

/**
 * Best-effort removal of archive files left over from previous semble versions.
 *
 * Because the local archive cache path is version-prefixed (see `downloadSemble`),
 * upgrading SEMBLE_VERSION leaves the prior version's archive orphaned on disk.
 * This sweeps those stale packages so a version upgrade doesn't accumulate them.
 *
 * Matches both the version-prefixed cache names (`${version}-${archiveName}`,
 * used since v0.4.0) and the legacy unversioned cache name (`${archiveName}`,
 * used before v0.4.0), so a v0.3.1 → v0.4.1 upgrade also clears the legacy file.
 * The current archive path is always preserved.
 *
 * Errors are swallowed since this is purely cosmetic cleanup.
 */
async function cleanupStaleArchives(
	storageDir: string,
	archiveName: string,
	currentArchivePath: string,
): Promise<void> {
	try {
		const entries = await fs.readdir(storageDir)
		const suffix = `-${archiveName}`
		await Promise.all(
			entries
				.filter(
					(name) =>
						(name === archiveName || name.endsWith(suffix)) &&
						path.join(storageDir, name) !== currentArchivePath,
				)
				.map((name) => fs.unlink(path.join(storageDir, name)).catch(() => {})),
		)
	} catch {
		// ignore — storage dir may not be listable yet
	}
}

/**
 * Downloads and extracts the semble archive for the current platform.
 *
 * Compares the hardcoded SEMBLE_VERSION against the version stored on disk.
 * If they differ (i.e. the version was bumped in source), it re-downloads.
 * Otherwise it returns the existing binary path.
 *
 * The archive is extracted into `storageDir/semble/` and the binary path
 * is `storageDir/semble/<binary>`.
 *
 * Uses a source chain:
 *   1. Try user-configured binary path (binaryPathOverride) → return if valid
 *   2. Try the primary GitHub release (Audare-est-Facere/sembleexec)
 *   3. If all sources fail: provide helpful error with per-source details
 *
 * Each source is retried with exponential backoff before moving to the next.
 *
 * @param storageDir - Directory to store the extracted binary (e.g. globalStorageUri.fsPath)
 * @param binaryPathOverride - Optional path to a manually installed semble binary.
 *   If provided and the file exists, the download is skipped entirely.
 * @returns The full path to the semble executable, or undefined if the platform is unsupported.
 */
export async function downloadSemble(storageDir: string, binaryPathOverride?: string): Promise<string | undefined> {
	// 1. Check binary path override — no network calls needed.
	//    Require a regular FILE: a directory passes fs.access but cannot be
	//    spawned (EACCES), so also require fs.stat().isFile() === true.
	if (binaryPathOverride && binaryPathOverride.length > 0) {
		try {
			await fs.access(binaryPathOverride)
			const stat = await fs.stat(binaryPathOverride)
			if (stat.isFile()) {
				console.log(`[SembleDownloader] Using manually configured binary at ${binaryPathOverride}`)
				return binaryPathOverride
			}
			console.warn(
				`[SembleDownloader] Binary path override "${binaryPathOverride}" is not a regular file, falling back to auto-download...`,
			)
		} catch {
			console.warn(
				`[SembleDownloader] Binary path override "${binaryPathOverride}" does not exist, falling back to auto-download...`,
			)
		}
	}

	const info = getArchiveInfo()
	if (!info) {
		return undefined
	}

	const extractDir = path.join(storageDir, "semble")

	// 2. Check installed version against hardcoded SEMBLE_VERSION first.
	//    We defer resolveSembleVersion() until after this check to avoid unnecessary
	//    HTTP calls when the binary is already up-to-date.
	const installedVersion = await getInstalledSembleVersion(storageDir)

	// 3. Fast path: installed version matches hardcoded version and binary exists.
	//    Resolution requires a regular FILE — a directory is not runnable (spawning
	//    it yields EACCES). This also self-heals prior broken one-dir installs where
	//    the real executable lives at <extractDir>/semble/semble (see resolveSembleBinary).
	if (installedVersion === SEMBLE_VERSION) {
		const existingBinary = await resolveSembleBinary(extractDir, info.binary)
		if (existingBinary) {
			// Binary exists and version matches — nothing to do
			if (process.platform !== "win32") {
				await fs.chmod(existingBinary, 0o755)
			}
			return existingBinary
		}
		// Binary missing despite version file — re-download below
	}

	// 4. Pre-flight validation — check write permissions and disk space before attempting download
	await validateInstallPath(storageDir)
	await checkDiskSpace(storageDir, ESTIMATED_REQUIRED_BYTES)

	// 5. Resolve the semble version. With the default pinned pattern this is a
	//    pure constant — no network calls. The "latest" mechanism is only used
	//    when explicitly opted in (SEMBLE_VERSION_PATTERN === "latest" or
	//    SEMBLE_RESOLVE_LATEST=1), so a fresh install never depends on GitHub
	//    HEAD requests or an upstream tag that hasn't been tested/checksummed.
	const resolvedVersion = shouldResolveLatest() ? await resolveSembleVersion() : SEMBLE_VERSION

	// 6. If the resolved version differs from hardcoded, check against installed version again
	if (resolvedVersion !== SEMBLE_VERSION && installedVersion === resolvedVersion) {
		const existingBinary = await resolveSembleBinary(extractDir, info.binary)
		if (existingBinary) {
			if (process.platform !== "win32") {
				await fs.chmod(existingBinary, 0o755)
			}
			return existingBinary
		}
		// re-download below
	}

	// Version mismatch — log so the user can see what's happening
	if (installedVersion && installedVersion !== resolvedVersion) {
		console.log(`[SembleDownloader] Version changed from ${installedVersion} to ${resolvedVersion}, updating...`)
	}

	// 7. Build dynamic fallback URLs using the resolved version
	const dynamicFallbackUrls = DOWNLOAD_FALLBACK_URLS.map((base) =>
		base.replace(`/download/${SEMBLE_VERSION}`, `/download/${resolvedVersion}`),
	)

	// 8. Try each source in order
	const errors: string[] = []
	for (const [index, sourceUrl] of dynamicFallbackUrls.entries()) {
		try {
			return await attemptDownload(sourceUrl, storageDir, info, extractDir, resolvedVersion)
		} catch (error) {
			errors.push(`[Source ${index + 1}] ${error instanceof Error ? error.message : String(error)}`)
			console.warn(`[SembleDownloader] Source ${index + 1} failed, trying next...`)
		}
	}

	// 9. All sources failed
	throw new Error(`Failed to download semble from all sources:\n${errors.join("\n")}`)
}

/**
 * Attempts to download, verify, and extract the semble binary from a single source.
 * Uses retry with exponential backoff for the HTTP download step.
 *
 * @param sourceBaseUrl - Base URL for this download source (archive name is appended)
 * @param storageDir - Directory to store the extracted binary
 * @param info - Archive info for the current platform
 * @param extractDir - Directory to extract the archive into
 * @returns The binary path on success
 */
async function attemptDownload(
	sourceBaseUrl: string,
	storageDir: string,
	info: { archive: string; binary: string },
	extractDir: string,
	version?: string,
): Promise<string> {
	const resolvedVersion = version || SEMBLE_VERSION
	const url = `${sourceBaseUrl}/${info.archive}`
	// Version-prefix the local archive cache path so a stale archive left over
	// from a previous semble version can never be reused or verified against the
	// new checksum. The release asset URL keeps the unversioned asset name
	// (info.archive); only the on-disk cache path is versioned. This guarantees a
	// fresh download immediately after a version upgrade.
	const archivePath = path.join(storageDir, `${resolvedVersion}-${info.archive}`)
	// Stage the new installation in a temporary directory. The old binary stays
	// intact until the new one is fully verified, preventing broken state on failure.
	const stagingDir = extractDir + ".new"
	console.log(`[SembleDownloader] Downloading semble ${resolvedVersion} from ${url}`)

	try {
		// Clean any leftover staging directory from a previous failed attempt
		try {
			await fs.rm(stagingDir, { recursive: true, force: true })
		} catch {
			// ignore
		}

		// Remove any stale/partial archive from a previous attempt so we always
		// download a fresh package. This is critical immediately after a version
		// upgrade, where a corrupt leftover would otherwise fail checksum
		// verification against the new SEMBLE_SHA256 on first launch.
		try {
			await fs.unlink(archivePath)
		} catch {
			// ignore — may not exist
		}

		// Download with retry (exponential backoff: 2s, 4s)
		await attemptDownloadWithRetry(url, archivePath)

		// Download checksums manifest and merge with hardcoded checksums
		const checksums = await downloadChecksums(storageDir, resolvedVersion, sourceBaseUrl)

		// Verify archive integrity before extraction. The checksums manifest
		// (from downloadChecksums) is keyed by archive FILENAME (e.g.
		// "semble-linux-x64-fast.tar.gz"), NOT by platform key ("linux-x64").
		// Look up by info.archive so a fetched manifest is actually honored;
		// fall back to the hardcoded SEMBLE_SHA256 table (platform-keyed) only
		// when the manifest has no entry for this archive.
		const platformKey = `${process.platform}-${process.arch}`
		const expectedChecksum = checksums[info.archive] || SEMBLE_SHA256[platformKey]
		if (!expectedChecksum) {
			throw new Error(`No checksum configured for platform ${platformKey} at ${resolvedVersion}`)
		}
		await verifyChecksum(archivePath, expectedChecksum)

		// Extract to staging directory
		await fs.mkdir(stagingDir, { recursive: true })

		if (info.archive.endsWith(".tar.gz")) {
			await extractTarGz(archivePath, stagingDir)
		} else if (info.archive.endsWith(".zip")) {
			await extractZip(archivePath, stagingDir)
		}

		// Resolve the actual executable. Fast archives are PyInstaller one-dir
		// builds wrapped in a top-level directory (staging/semble/semble), not a
		// flat file — resolveSembleBinary finds the real file in either layout.
		const stagedBinaryPath = await resolveSembleBinary(stagingDir, info.binary)
		if (!stagedBinaryPath) {
			throw new Error(
				`Extracted archive did not contain expected binary "${info.binary}" (checked flat and one-dir layouts)`,
			)
		}

		// Make binary executable on unix platforms
		if (process.platform !== "win32") {
			await fs.chmod(stagedBinaryPath, 0o755)
		}

		// Verify the staged binary exists before swapping
		await fs.access(stagedBinaryPath)

		// Atomic swap: remove old installation, rename staging → final
		const relativeBinaryPath = path.relative(stagingDir, stagedBinaryPath)
		try {
			await fs.rm(extractDir, { recursive: true, force: true })
		} catch {
			// ignore — may not exist on first install
		}
		await fs.rename(stagingDir, extractDir)

		// The final binary path is relative to the renamed (final) install dir,
		// so it stays correct after the staging → extractDir rename.
		const finalBinaryPath = path.join(extractDir, relativeBinaryPath)

		// Record the installed version
		await writeInstalledVersion(storageDir, resolvedVersion)

		// Clean up the archive file
		try {
			await fs.unlink(archivePath)
		} catch {
			// ignore cleanup errors
		}

		// Best-effort: remove orphaned archives left by previous semble versions
		// so a version upgrade doesn't accumulate stale packages on disk.
		await cleanupStaleArchives(storageDir, info.archive, archivePath)

		console.log(`[SembleDownloader] Successfully installed semble ${resolvedVersion} to ${finalBinaryPath}`)
		return finalBinaryPath
	} catch (error) {
		// Clean up partial download/staging — leave old installation intact
		try {
			await fs.unlink(archivePath)
		} catch {
			// ignore cleanup errors
		}
		try {
			await fs.rm(stagingDir, { recursive: true, force: true })
		} catch {
			// ignore cleanup errors
		}
		console.error(
			`[SembleDownloader] Failed to download from source: ${error instanceof Error ? error.message : String(error)}`,
		)
		throw error
	}
}

/**
 * Downloads a file with retry and exponential backoff.
 * Tries up to `maxRetries` attempts, with delays of 2^attempt * 1000ms between retries.
 *
 * @param url - URL to download from
 * @param destPath - Local file path to write to
 * @param maxRetries - Maximum number of download attempts (default: 2)
 */
async function attemptDownloadWithRetry(url: string, destPath: string, maxRetries = 2): Promise<void> {
	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			await downloadFile(url, destPath)
			return
		} catch (error) {
			if (attempt < maxRetries) {
				const delay = Math.pow(2, attempt) * 1000 // 2s, 4s
				await new Promise((r) => setTimeout(r, delay))
			} else {
				throw error
			}
		}
	}
}

/**
 * Archive format discriminator used to select the entry-listing command.
 */
type ArchiveKind = "zip" | "tar.gz"

/**
 * Rejects an archive entry name that could escape the extraction directory
 * (zip-slip / tar path traversal).
 *
 * We normalize with `path.posix.normalize` AFTER mapping `\` to `/`, so
 * Windows-style separators and drive-letter roots are handled identically on
 * every platform. `path.posix` is used unconditionally (not `path` or
 * `path.win32`) so the verdict depends only on the archive's OWN separators,
 * never on the host OS:
 *   - interior traversal like `semble/../../evil` collapses to `../evil` and is
 *     caught even though no literal `..` starts the raw name;
 *   - absolute paths (`/etc/passwd`, `\etc\passwd`) are rejected outright;
 *   - a Windows drive-letter prefix (`C:\...`, `C:/...`) is rejected because
 *     `path.posix.normalize("C:/evil")` yields `C:/evil`, which POSIX does not
 *     treat as absolute.
 *
 * The `\`→`/` normalization also provides the equivalent of a "reject any
 * backslash on non-Windows" guard uniformly on every platform (including
 * Windows, where a backslash is a real separator and matters most).
 *
 * @throws If `entry` is an absolute path or escapes above the extraction root.
 */
export function assertSafeArchiveEntry(entry: string): void {
	const forwardSlashed = entry.replace(/\\/g, "/")
	if (forwardSlashed.startsWith("/") || /^[a-zA-Z]:(\/|$)/.test(forwardSlashed)) {
		throw new Error(`Unsafe archive entry rejected (absolute path): ${entry}`)
	}
	const normalized = path.posix.normalize(forwardSlashed)
	if (path.posix.isAbsolute(normalized) || normalized === ".." || normalized.startsWith("../")) {
		throw new Error(`Unsafe archive entry rejected (path traversal): ${entry}`)
	}
}

/**
 * Lists the entries of an archive using the platform-appropriate listing tool:
 *   - zip:    `unzip -Z1 <archive>` (PowerShell ZipFile listing on Windows, since
 *     `unzip` is not installed by default there)
 *   - tar.gz: `tar -tzf <archive>`
 *
 * Kept shell-safe: the command is spawned as an argv array with `shell: false`.
 * Rejects if the listing tool itself fails (see assertSafeArchiveListing).
 */
function listArchiveEntries(archivePath: string, kind: ArchiveKind): Promise<string[]> {
	return new Promise((resolve, reject) => {
		let cmd: string
		let args: string[]
		if (kind === "zip") {
			if (process.platform === "win32") {
				cmd = "powershell"
				args = [
					"-NoProfile",
					"-NonInteractive",
					"-Command",
					`Add-Type -AssemblyName System.IO.Compression.FileSystem; ` +
						`[System.IO.Compression.ZipFile]::OpenRead('${escapePowerShellLiteral(archivePath)}').Entries | ForEach-Object { $_.FullName }`,
				]
			} else {
				cmd = "unzip"
				args = ["-Z1", archivePath]
			}
		} else {
			cmd = "tar"
			args = ["-tzf", archivePath]
		}

		const child = spawn(cmd, args, { shell: false, stdio: ["ignore", "pipe", "pipe"] })

		let stdout = ""
		let stderr = ""
		child.stdout?.on("data", (data: Buffer) => {
			stdout += data.toString()
		})
		child.stderr?.on("data", (data: Buffer) => {
			stderr += data.toString()
		})

		child.on("error", reject)
		child.on("close", (code) => {
			if (code === 0) {
				resolve(
					stdout
						.split("\n")
						.map((line) => line.trim())
						.filter(Boolean),
				)
			} else {
				reject(new Error(`${cmd} archive listing failed (code ${code}): ${stderr.trim()}`))
			}
		})
	})
}

/**
 * Validates that every entry in an archive is safe to extract BEFORE any file is
 * written, closing the zip-slip / tar-traversal hole on both extractors.
 *
 * Runs once per download (kept cheap). Fails CLOSED: if the listing command
 * itself fails we cannot prove the archive is safe, so we reject rather than
 * fall through to extraction.
 */
async function assertSafeArchiveListing(archivePath: string, kind: ArchiveKind): Promise<void> {
	const entries = await listArchiveEntries(archivePath, kind)
	for (const entry of entries) {
		assertSafeArchiveEntry(entry)
	}
}

/**
 * Extracts a .tar.gz archive into the destination directory using the system `tar` command.
 * Uses --no-same-owner to avoid issues with permission elevation,
 * strips absolute paths and blocks directory overwrites to prevent path traversal attacks.
 * Entry paths are validated for traversal BEFORE extraction (see assertSafeArchiveListing).
 */
async function extractTarGz(archivePath: string, destDir: string): Promise<void> {
	await assertSafeArchiveListing(archivePath, "tar.gz")

	return new Promise((resolve, reject) => {
		const args = ["-xzf", archivePath, "-C", destDir, "--no-same-owner"]
		// GNU tar: --no-overwrite-dir adds defense-in-depth against ../relative traversal.
		// macOS bsdtar strips absolute paths by default.
		if (process.platform === "linux") {
			args.push("--no-overwrite-dir")
		}
		const child = spawn("tar", args, {
			shell: false,
			stdio: ["ignore", "pipe", "pipe"],
		})

		let stderr = ""
		child.stderr?.on("data", (data: Buffer) => {
			stderr += data.toString()
		})

		child.on("error", (err) => reject(err))
		child.on("close", (code) => {
			if (code === 0) {
				resolve()
			} else {
				reject(new Error(`tar extraction failed (code ${code}): ${stderr.trim()}`))
			}
		})
	})
}

/**
 * Escapes a string for use inside a PowerShell single-quoted literal.
 * In PowerShell, the only special character in a single-quoted string is the
 * apostrophe itself, which is escaped by doubling it.
 */
function escapePowerShellLiteral(value: string): string {
	return value.replace(/'/g, "''")
}

/**
 * Extracts a .zip archive into the destination directory.
 * Uses PowerShell on Windows, unzip on other platforms.
 * Entry paths are validated for traversal BEFORE extraction (see assertSafeArchiveListing).
 */
async function extractZip(archivePath: string, destDir: string): Promise<void> {
	await assertSafeArchiveListing(archivePath, "zip")

	return new Promise((resolve, reject) => {
		let child

		if (process.platform === "win32") {
			child = spawn(
				"powershell",
				[
					"-NoProfile",
					"-Command",
					`Expand-Archive -Path '${escapePowerShellLiteral(archivePath)}' -DestinationPath '${escapePowerShellLiteral(destDir)}' -Force`,
				],
				{ shell: false, stdio: ["ignore", "pipe", "pipe"] },
			)
		} else {
			child = spawn("unzip", ["-o", archivePath, "-d", destDir], {
				shell: false,
				stdio: ["ignore", "pipe", "pipe"],
			})
		}

		let stderr = ""
		child.stderr?.on("data", (data: Buffer) => {
			stderr += data.toString()
		})

		child.on("error", (err) => reject(err))
		child.on("close", (code) => {
			if (code === 0) {
				resolve()
			} else {
				reject(new Error(`zip extraction failed (code ${code}): ${stderr.trim()}`))
			}
		})
	})
}

/**
 * Trusted domains for following redirects during semble binary download.
 * GitHub releases redirect to objects.githubusercontent.com for the actual download.
 */
const TRUSTED_DOWNLOAD_DOMAINS = ["github.com", "objects.githubusercontent.com", "release-assets.githubusercontent.com"]

/**
 * Validates that a URL belongs to a trusted domain.
 * Uses domain-boundary aware matching to prevent suffix-based bypasses
 * (e.g. "evilgithub.com" does NOT match "github.com").
 */
function isTrustedDownloadUrl(url: string): boolean {
	try {
		const parsed = new URL(url)
		const h = parsed.hostname
		return parsed.protocol === "https:" && TRUSTED_DOWNLOAD_DOMAINS.some((d) => h === d || h.endsWith("." + d))
	} catch {
		return false
	}
}

/**
 * Downloads a file from the given URL to the destination path.
 * Follows redirects (GitHub releases use 302 redirects to CDN).
 * Only follows redirects to trusted domains to prevent redirect-based attacks.
 */
function downloadFile(url: string, destPath: string, maxRedirects = 5): Promise<void> {
	return new Promise((resolve, reject) => {
		if (maxRedirects <= 0) {
			reject(new Error("Too many redirects"))
			return
		}

		const request = https.get(url, (response) => {
			// Follow redirects
			if (
				response.statusCode &&
				response.statusCode >= 300 &&
				response.statusCode < 400 &&
				response.headers.location
			) {
				response.destroy()
				const redirectUrl = response.headers.location
				if (!isTrustedDownloadUrl(redirectUrl)) {
					reject(
						new Error(
							`Redirect to untrusted domain blocked: ${redirectUrl}. Only ${TRUSTED_DOWNLOAD_DOMAINS.join(", ")} are allowed.`,
						),
					)
					return
				}
				downloadFile(redirectUrl, destPath, maxRedirects - 1)
					.then(resolve)
					.catch(reject)
				return
			}

			if (response.statusCode !== 200) {
				response.destroy()
				reject(new Error(`HTTP ${response.statusCode}: Failed to download ${url}`))
				return
			}

			const file = createWriteStream(destPath)
			response.pipe(file)

			file.on("finish", () => {
				file.close()
				resolve()
			})

			file.on("error", (err) => {
				file.close()
				reject(err)
			})
		})

		request.on("error", reject)
		request.on("timeout", () => {
			request.destroy()
			reject(new Error("Download timed out"))
		})

		// 2 minute timeout for download
		request.setTimeout(120_000)
	})
}
