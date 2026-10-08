/**
 * esbuild-engine - Lazy acquisition of the esbuild-wasm engine for custom tools.
 *
 * Custom tools are TypeScript files transpiled at runtime by the esbuild-wasm
 * CLI. That CLI needs the ~14 MB `esbuild.wasm` engine, which used to be the
 * single largest file packaged in the VSIX. It is no longer packaged: this
 * module downloads it on first use, verifies it against a pinned SHA-256
 * checksum, and caches it in the extension's global storage so subsequent uses
 * work offline.
 *
 * Source: the immutable, per-version npm tarball for the exact `esbuild-wasm`
 * version declared in `src/package.json`. Only `package/esbuild.wasm` is
 * extracted from the checksum-verified archive.
 *
 * Mirrors `src/services/code-index/semble/semble-downloader.ts`: consent gate
 * before any network download, SHA-256 verification, atomic install, and a
 * clear, actionable error on failure.
 */

import * as fs from "fs/promises"
import { createReadStream, createWriteStream } from "fs"
import * as https from "https"
import * as path from "path"
import { createHash } from "crypto"
import { spawn } from "child_process"

/**
 * The pinned esbuild-wasm version. Must stay in lockstep with the
 * `esbuild-wasm` dependency in `src/package.json`.
 */
export const ESBUILD_WASM_VERSION = "0.28.1"

/**
 * Deterministic, pinnable source for the engine: the immutable npm tarball for
 * `esbuild-wasm@ESBUILD_WASM_VERSION`, served by the canonical npm registry.
 *
 * To regenerate the checksums when bumping ESBUILD_WASM_VERSION:
 *   curl -sL <tarballUrl> -o esbuild-wasm.tgz && sha256sum esbuild-wasm.tgz
 *   tar -xzf esbuild-wasm.tgz package/esbuild.wasm && sha256sum package/esbuild.wasm
 */
export const ESBUILD_WASM_TARBALL_URL = `https://registry.npmjs.org/esbuild-wasm/-/esbuild-wasm-${ESBUILD_WASM_VERSION}.tgz`

/** SHA-256 of the pinned npm tarball (verified before extraction). */
export const ESBUILD_WASM_TARBALL_SHA256 = "7f78f774a22becc6567c26859c14de698854e2a4f8ce8015967e8d6779ed86ee"

/** SHA-256 of the `esbuild.wasm` engine itself (verified after extraction). */
export const ESBUILD_WASM_SHA256 = "cc8c5e14db584cd75c6c9fc16e1aae3d5b8e99ab7f333aeee71f59e23fa9f24e"

/** Approximate download size label used in the consent prompt (~3.7 MB tarball). */
export const ESBUILD_WASM_APPROX_SIZE = "~4 MB"

/** The archive member that holds the engine. */
const ENGINE_MEMBER = "package/esbuild.wasm"

/** Directory (under global storage) that holds the installed engine. */
const ENGINE_DIR_NAME = "esbuild-engine"

/** Version marker written after a successful install. */
const VERSION_FILE = ".esbuild-version"

/** Small runtime files that must sit beside the engine (bundled in `dist/`). */
const RUNTIME_FILES = ["wasm_exec_node.js", "wasm_exec.js"] as const

/** Trusted hosts allowed while following download redirects. */
const TRUSTED_DOWNLOAD_DOMAINS = ["registry.npmjs.org", "npmjs.org"]

/**
 * Injectable description of the engine artefact to acquire. Defaults to the
 * pinned constants above; tests override it with a small fixture archive.
 */
export interface EsbuildEngineSpec {
	tarballUrl: string
	tarballSha256: string
	wasmSha256: string
}

export const ESBUILD_ENGINE_SPEC: EsbuildEngineSpec = {
	tarballUrl: ESBUILD_WASM_TARBALL_URL,
	tarballSha256: ESBUILD_WASM_TARBALL_SHA256,
	wasmSha256: ESBUILD_WASM_SHA256,
}

export interface EnsureEsbuildEngineOptions {
	/** Extension global storage directory (cache root). */
	storageDir: string
	/** Extension root directory that contains the bundled esbuild-wasm runtime files. */
	extensionPath: string
	/**
	 * Consent gate invoked only when a network download is actually required
	 * (never for a cache hit). Return `false` to abort without downloading.
	 */
	onBeforeDownload?: () => Promise<boolean>
	/** Overridable engine spec; defaults to the pinned constants. */
	spec?: EsbuildEngineSpec
}

/** Directory that holds the installed engine. */
export function getEsbuildEngineDir(storageDir: string): string {
	return path.join(storageDir, ENGINE_DIR_NAME)
}

/** Path to the esbuild CLI script inside the installed engine directory. */
export function getEsbuildEngineScriptPath(storageDir: string): string {
	return path.join(getEsbuildEngineDir(storageDir), "bin", "esbuild")
}

async function fileExists(filePath: string): Promise<boolean> {
	try {
		return (await fs.stat(filePath)).isFile()
	} catch {
		return false
	}
}

function toMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error)
}

/**
 * True when a valid engine is already cached: the version marker matches the
 * pinned version AND both the CLI script and the engine WASM are present.
 */
export async function isEsbuildEngineInstalled(storageDir: string): Promise<boolean> {
	const engineDir = getEsbuildEngineDir(storageDir)
	try {
		const version = (await fs.readFile(path.join(engineDir, VERSION_FILE), "utf-8")).trim()
		if (version !== ESBUILD_WASM_VERSION) {
			return false
		}
		return (
			(await fileExists(getEsbuildEngineScriptPath(storageDir))) &&
			(await fileExists(path.join(engineDir, "esbuild.wasm")))
		)
	} catch {
		return false
	}
}

/**
 * Ensure the esbuild engine is available in `storageDir` and return the path to
 * its CLI script.
 *
 * On a cache hit no network is touched. Otherwise the consent gate runs, the
 * pinned tarball is downloaded and checksum-verified, `esbuild.wasm` is
 * extracted and re-verified, and the runnable layout is installed atomically.
 *
 * @throws On consent decline, download/offline failure, or checksum mismatch
 *   (the offending artefact is deleted before throwing).
 */
export async function ensureEsbuildEngine(options: EnsureEsbuildEngineOptions): Promise<string> {
	const { storageDir, extensionPath, onBeforeDownload, spec = ESBUILD_ENGINE_SPEC } = options

	// Fast path: cached and valid — no network, works offline.
	if (await isEsbuildEngineInstalled(storageDir)) {
		return getEsbuildEngineScriptPath(storageDir)
	}

	// Consent gate runs only when an actual download is required.
	if (onBeforeDownload) {
		const approved = await onBeforeDownload()
		if (!approved) {
			throw new Error("esbuild engine download cancelled: the user did not approve the download")
		}
	}

	await installEsbuildEngine(storageDir, extensionPath, spec)
	return getEsbuildEngineScriptPath(storageDir)
}

async function installEsbuildEngine(storageDir: string, extensionPath: string, spec: EsbuildEngineSpec): Promise<void> {
	const engineDir = getEsbuildEngineDir(storageDir)
	const stagingDir = `${engineDir}.new`
	const extractDir = `${engineDir}.extract`
	const tarballPath = path.join(storageDir, `.esbuild-wasm-${ESBUILD_WASM_VERSION}.tgz`)

	// The bundled runtime files are the source for the installed layout. Fail
	// early with an actionable message if the installation is incomplete.
	const bundledDist = path.join(extensionPath, "dist")
	const bundledCli = path.join(bundledDist, "bin", "esbuild")

	if (!(await fileExists(bundledCli))) {
		throw new Error(
			`Bundled esbuild runtime is missing (${bundledCli}). The Roo+ installation may be incomplete; reinstall the extension.`,
		)
	}

	for (const name of RUNTIME_FILES) {
		const src = path.join(bundledDist, name)
		if (!(await fileExists(src))) {
			throw new Error(
				`Bundled esbuild runtime is missing (${src}). The Roo+ installation may be incomplete; reinstall the extension.`,
			)
		}
	}

	await fs.mkdir(storageDir, { recursive: true })

	try {
		// Clean up any leftovers from a previous failed attempt.
		await fs.rm(stagingDir, { recursive: true, force: true })
		await fs.rm(extractDir, { recursive: true, force: true })
		await fs.rm(tarballPath, { force: true })

		// 1. Download the pinned tarball and verify it before touching its contents.
		await downloadFile(spec.tarballUrl, tarballPath)
		await verifyFileChecksum(tarballPath, spec.tarballSha256, "esbuild-wasm tarball")

		// 2. Extract only the engine member from the verified archive.
		await fs.mkdir(extractDir, { recursive: true })
		await extractTarGzMember(tarballPath, extractDir, ENGINE_MEMBER)

		const extractedWasm = path.join(extractDir, ENGINE_MEMBER)
		await verifyFileChecksum(extractedWasm, spec.wasmSha256, "esbuild.wasm engine")

		// 3. Assemble the runnable layout:
		//    <dir>/bin/esbuild (patched CLI) + <dir>/esbuild.wasm + runtime files.
		const stagingBinDir = path.join(stagingDir, "bin")
		await fs.mkdir(stagingBinDir, { recursive: true })
		await fs.copyFile(bundledCli, path.join(stagingBinDir, "esbuild"))
		for (const name of RUNTIME_FILES) {
			await fs.copyFile(path.join(bundledDist, name), path.join(stagingDir, name))
		}
		await fs.copyFile(extractedWasm, path.join(stagingDir, "esbuild.wasm"))

		// 4. Atomic swap: drop the old engine (if any) and publish the new one.
		await fs.rm(engineDir, { recursive: true, force: true })
		await fs.rename(stagingDir, engineDir)

		// 5. Record the installed version.
		await fs.writeFile(path.join(engineDir, VERSION_FILE), ESBUILD_WASM_VERSION, "utf-8")
	} catch (error) {
		// Reject and delete on mismatch/failure — never leave a partial engine.
		await fs.rm(stagingDir, { recursive: true, force: true }).catch(() => {})
		await fs.rm(extractDir, { recursive: true, force: true }).catch(() => {})
		await fs.rm(tarballPath, { force: true }).catch(() => {})
		throw new Error(
			`Failed to install the esbuild engine required for custom tools: ${toMessage(error)}. ` +
				"Custom tools are unavailable until the engine can be downloaded; all other features are unaffected.",
		)
	} finally {
		// Best-effort cleanup of transient artefacts on success too.
		await fs.rm(extractDir, { recursive: true, force: true }).catch(() => {})
		await fs.rm(tarballPath, { force: true }).catch(() => {})
	}
}

/**
 * Compute the SHA-256 hex digest of a file by streaming it (bounded memory).
 */
export async function sha256File(filePath: string): Promise<string> {
	const hash = createHash("sha256")
	await new Promise<void>((resolve, reject) => {
		const stream = createReadStream(filePath)
		stream.on("data", (chunk) => hash.update(chunk))
		stream.on("end", () => resolve())
		stream.on("error", reject)
	})
	return hash.digest("hex")
}

async function verifyFileChecksum(filePath: string, expected: string, label: string): Promise<void> {
	const actual = await sha256File(filePath)
	if (actual !== expected) {
		throw new Error(
			`Checksum mismatch for ${label}: expected ${expected.slice(0, 12)}…, got ${actual.slice(0, 12)}…`,
		)
	}
}

/**
 * Extract a single member from a gzipped tar archive using the system `tar`
 * binary (the same dependency the Semble downloader relies on across platforms).
 */
function extractTarGzMember(archivePath: string, destDir: string, member: string): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		const child = spawn("tar", ["-xzf", archivePath, "-C", destDir, member], {
			shell: false,
			stdio: ["ignore", "pipe", "pipe"],
		})

		let stderr = ""
		child.stderr?.on("data", (data: Buffer) => {
			stderr += data.toString()
		})

		child.on("error", (error) => {
			reject(new Error(`tar is required to extract the esbuild engine: ${error.message}`))
		})
		child.on("close", (code) => {
			if (code === 0) {
				resolve()
			} else {
				reject(new Error(`tar extraction failed (code ${code}): ${stderr.trim()}`))
			}
		})
	})
}

function isTrustedDownloadUrl(url: string): boolean {
	try {
		const parsed = new URL(url)
		const host = parsed.hostname
		return (
			parsed.protocol === "https:" && TRUSTED_DOWNLOAD_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))
		)
	} catch {
		return false
	}
}

/**
 * Download a file over HTTPS, following redirects to trusted hosts only.
 * Mirrors the Semble downloader's redirect policy.
 */
function downloadFile(url: string, destPath: string, maxRedirects = 5): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		if (maxRedirects <= 0) {
			reject(new Error("Too many redirects while downloading the esbuild engine"))
			return
		}

		const request = https.get(url, (response) => {
			const statusCode = response.statusCode ?? 0

			if (statusCode >= 300 && statusCode < 400 && response.headers.location) {
				response.resume()
				const redirectUrl = response.headers.location
				if (!isTrustedDownloadUrl(redirectUrl)) {
					reject(
						new Error(
							`Redirect to untrusted host blocked: ${redirectUrl}. Only ${TRUSTED_DOWNLOAD_DOMAINS.join(", ")} are allowed.`,
						),
					)
					return
				}
				downloadFile(redirectUrl, destPath, maxRedirects - 1)
					.then(resolve)
					.catch(reject)
				return
			}

			if (statusCode !== 200) {
				response.resume()
				reject(new Error(`HTTP ${statusCode}: failed to download ${url}`))
				return
			}

			const file = createWriteStream(destPath)
			response.pipe(file)

			file.on("finish", () => {
				file.close()
				resolve()
			})
			file.on("error", (error) => {
				file.close()
				reject(error)
			})
		})

		request.on("error", reject)
		request.on("timeout", () => {
			request.destroy()
			reject(new Error("Download of the esbuild engine timed out"))
		})
		request.setTimeout(120_000)
	})
}
