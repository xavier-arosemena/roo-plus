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
const SEMBLE_ARCHIVES: Record<string, { archive: string; binary: string }> = {
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
 * Version resolution pattern. When set to "latest", the downloader fetches the
 * latest release tag from GitHub API before downloading. Supports wildcard
 * patterns for future expansion.
 */
export const SEMBLE_VERSION_PATTERN = "latest" // "latest" = fetch latest release, or use wildcards

const DOWNLOAD_BASE_URL = `https://github.com/Audare-est-Facere/sembleexec/releases/download/${SEMBLE_VERSION}`
const VERSION_FILE = ".semble-version"

/**
 * Ordered list of fallback download sources for the semble binary.
 * Each entry is a base URL pointing to a GitHub release directory for the
 * current SEMBLE_VERSION. The archive filename is appended by the download
 * logic.
 *
 * Sources are tried in order: if the primary fails, the next mirror is used.
 */
const DOWNLOAD_FALLBACK_URLS = [
	DOWNLOAD_BASE_URL, // primary: Audare-est-Facere/sembleexec
	// Mirror: fallback to original Roo-Plus-Org if it ever gets created
	`https://github.com/Roo-Plus-Org/sembleexec/releases/download/${SEMBLE_VERSION}`,
]

/**
 * SHA-256 checksums for each platform archive at SEMBLE_VERSION.
 * These are verified after download to guard against tampered release assets.
 * Update these when bumping SEMBLE_VERSION.
 *
 * To regenerate: `shasum -a 256 <archive-file>`
 */
export const SEMBLE_SHA256: Record<string, string> = {
	"linux-x64": "1315d3faae9fd446764ee5d0cf8e8d83e862ead0f7fa51e1ed0685755dc96a8e",
	"linux-arm64": "883b250faf61957d9859fc691bbe8387aaca4fe2f00e8a6f041cc44880301ac4",
	"darwin-arm64": "d690765b500103c13aeab8c5a31e78efaeaa4e3e0b20ee5d040ddd41fa21b084",
	"win32-x64": "2aac0a9c55f823ea30151fea188bcf9268318b8ef41aafa7162498a04710fcc0",
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
				timeout: 10_000,
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
 * Reads the locally installed version from the version metadata file.
 * Returns undefined if no version file exists (first install or legacy).
 */
async function getInstalledVersion(storageDir: string): Promise<string | undefined> {
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
 * Uses a multi-source fallback chain:
 *   1. Try user-configured binary path (binaryPathOverride) → return if valid
 *   2. Try primary GitHub release (Audare-est-Facere/sembleexec)
 *   3. Try alternative/mirror source (configurable URL pattern)
 *   4. If all fail: provide helpful error with per-source details
 *
 * Each source is retried with exponential backoff before moving to the next.
 *
 * @param storageDir - Directory to store the extracted binary (e.g. globalStorageUri.fsPath)
 * @param binaryPathOverride - Optional path to a manually installed semble binary.
 *   If provided and the file exists, the download is skipped entirely.
 * @returns The full path to the semble executable, or undefined if the platform is unsupported.
 */
export async function downloadSemble(storageDir: string, binaryPathOverride?: string): Promise<string | undefined> {
	// 1. Check binary path override — no network calls needed
	if (binaryPathOverride && binaryPathOverride.length > 0) {
		try {
			await fs.access(binaryPathOverride)
			console.log(`[SembleDownloader] Using manually configured binary at ${binaryPathOverride}`)
			return binaryPathOverride
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
	const binaryPath = path.join(extractDir, info.binary)

	// 2. Check installed version against hardcoded SEMBLE_VERSION first.
	//    We defer resolveSembleVersion() until after this check to avoid unnecessary
	//    HTTP calls when the binary is already up-to-date.
	const installedVersion = await getInstalledVersion(storageDir)

	// 3. Fast path: installed version matches hardcoded version and binary exists
	if (installedVersion === SEMBLE_VERSION) {
		try {
			await fs.access(binaryPath)
			// Binary exists and version matches — nothing to do
			if (process.platform !== "win32") {
				await fs.chmod(binaryPath, 0o755)
			}
			return binaryPath
		} catch {
			// Binary missing despite version file — re-download below
		}
	}

	// 4. Pre-flight validation — check write permissions and disk space before attempting download
	await validateInstallPath(storageDir)
	await checkDiskSpace(storageDir, ESTIMATED_REQUIRED_BYTES)

	// 5. Resolve the semble version (fetches latest from GitHub if SEMBLE_VERSION_PATTERN === "latest").
	//    Only called when we actually need to download.
	const resolvedVersion = SEMBLE_VERSION_PATTERN === "latest" ? await resolveSembleVersion() : SEMBLE_VERSION

	// 6. If the resolved version differs from hardcoded, check against installed version again
	if (resolvedVersion !== SEMBLE_VERSION && installedVersion === resolvedVersion) {
		try {
			await fs.access(binaryPath)
			if (process.platform !== "win32") {
				await fs.chmod(binaryPath, 0o755)
			}
			return binaryPath
		} catch {
			// re-download below
		}
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
			return await attemptDownload(sourceUrl, storageDir, info, extractDir, binaryPath, resolvedVersion)
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
 * @param binaryPath - Expected path of the extracted binary
 * @returns The binary path on success
 */
async function attemptDownload(
	sourceBaseUrl: string,
	storageDir: string,
	info: { archive: string; binary: string },
	extractDir: string,
	binaryPath: string,
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
	const stagedBinaryPath = path.join(stagingDir, info.binary)
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

		// Verify archive integrity before extraction
		const platformKey = `${process.platform}-${process.arch}`
		const expectedChecksum = checksums[platformKey] || SEMBLE_SHA256[platformKey]
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

		// Make binary executable on unix platforms
		if (process.platform !== "win32") {
			await fs.chmod(stagedBinaryPath, 0o755)
		}

		// Verify the staged binary exists before swapping
		await fs.access(stagedBinaryPath)

		// Atomic swap: remove old installation, rename staging → final
		try {
			await fs.rm(extractDir, { recursive: true, force: true })
		} catch {
			// ignore — may not exist on first install
		}
		await fs.rename(stagingDir, extractDir)

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

		console.log(`[SembleDownloader] Successfully installed semble ${resolvedVersion} to ${binaryPath}`)
		return binaryPath
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
		console.error(`[SembleDownloader] Failed to download from source: ${error instanceof Error ? error.message : String(error)}`)
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
 * Returns the path to the semble binary if it's already been downloaded, or undefined.
 */
export async function getSembleBinaryPath(storageDir: string): Promise<string | undefined> {
	const info = getArchiveInfo()
	if (!info) {
		return undefined
	}

	const binaryPath = path.join(storageDir, "semble", info.binary)

	try {
		await fs.access(binaryPath)
		return binaryPath
	} catch {
		return undefined
	}
}

/**
 * Extracts a .tar.gz archive into the destination directory using the system `tar` command.
 * Uses --no-same-owner to avoid issues with permission elevation,
 * strips absolute paths and blocks directory overwrites to prevent path traversal attacks.
 */
function extractTarGz(archivePath: string, destDir: string): Promise<void> {
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
 */
function extractZip(archivePath: string, destDir: string): Promise<void> {
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
