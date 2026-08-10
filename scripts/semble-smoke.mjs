#!/usr/bin/env node
/**
 * semble-smoke.mjs
 *
 * Binary-level smoke test for the Semble code-index feature.
 *
 * Drives the REAL, published Semble binary end-to-end (download -> SHA-256
 * verify -> extract -> --help -> --version -> search) so a silent-exit-0 stub
 * build — the exact regression that broke the v0.5.2 VSIX, where the binary
 * exited 0 with no output so the extension reported "ready" but every search
 * returned nothing — can never slip through unnoticed again.
 *
 * The downloader's checkInstalled() hardening (see
 * src/services/code-index/semble/semble-cli.ts) only proves `--help` mentions
 * `search`; it does NOT prove the binary actually returns results. This script
 * closes that gap by running a real `semble search` against a tiny committed
 * fixture repo (test-fixtures/semble-repo) and asserting the stdout parses as
 * JSON with a non-empty `results` array.
 *
 * OPERATIONAL DEPENDENCY: the first `semble search` on a machine may download
 * an embedding model from HuggingFace (observed with v0.4.1). The search step
 * therefore uses a generous timeout (default 120s, mirroring the extension's
 * search timeout; override with SEMBLE_SMOKE_SEARCH_TIMEOUT_MS or
 * --search-timeout-ms). We assert on JSON shape only — never on exact scores.
 *
 * SEMBLE_VERSION / SEMBLE_ARCHIVES / SEMBLE_SHA256 are extracted from the
 * downloader source with a small regex parser (no TypeScript build, no
 * fs/https side effects — same approach as scripts/verify-semble-checksums.mjs).
 * The binary layout rule mirrors the extension's resolveSembleBinary()
 * (<root>/semble flat file OR <root>/semble/semble one-dir PyInstaller build).
 *
 * Usage (repo root):
 *   node scripts/semble-smoke.mjs                        # full smoke vs pinned release
 *   node scripts/semble-smoke.mjs --keep                 # keep the temp work dir for debugging
 *   node scripts/semble-smoke.mjs --dir <path>           # reuse an extracted binary (skips download)
 *   node scripts/semble-smoke.mjs --search-timeout-ms <n>
 *   node scripts/semble-smoke.mjs --query <q>
 *   node scripts/semble-smoke.mjs --help
 *
 * Exit codes:
 *   0  all checks passed against the published binary
 *   1  any step failed (download, checksum, extraction, --help, version, search)
 *
 * CI placement: intended for a scheduled/manual job or a release-validation
 * step — it downloads ~150 MB and may embed a model on first run, so it must
 * NOT gate every PR. The VSIX/extension-level journey (enable "Semble - Local"
 * -> status transitions to Indexed -> codebase_search returns snippets) is a
 * follow-up; apps/vscode-e2e has no Semble coverage yet.
 */

import { createHash } from "node:crypto"
import { createReadStream, createWriteStream } from "node:fs"
import * as fs from "node:fs/promises"
import { spawn } from "node:child_process"
import https from "node:https"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { logStep, logInfo, logOk, logError, logSuccess } from "./lib/logger.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// Hierarchical tag identifying this process; steps extend it (e.g.
// SEMBLE-SMOKE:ACQUIRE) so each smoke phase is identifiable in CI logs.
const TAG = "SEMBLE-SMOKE"

// Overridable so CI/tests can point at a different checkout of the downloader.
const DOWNLOADER_PATH = process.env.SEMBLE_DOWNLOADER_PATH
	? path.resolve(process.env.SEMBLE_DOWNLOADER_PATH)
	: path.resolve(__dirname, "../src/services/code-index/semble/semble-downloader.ts")

const RELEASE_OWNER_REPO = "Audare-est-Facere/sembleexec"
const releaseDownloadUrl = (version, archive) =>
	`https://github.com/${RELEASE_OWNER_REPO}/releases/download/${version}/${archive}`

const DEFAULT_FIXTURE_REPO = path.resolve(__dirname, "../test-fixtures/semble-repo")

export const DEFAULT_SEARCH_TIMEOUT_MS = 120_000 // mirrors the extension's search timeout
export const DEFAULT_DOWNLOAD_TIMEOUT_MS = 120_000 // mirrors the extension's per-download timeout
export const DEFAULT_VERSION_CHECK_TIMEOUT_MS = 10_000

const DEFAULT_TOP_K = 5
const DEFAULT_MAX_SNIPPET_LINES = 150
const DEFAULT_QUERY = "function that returns the sum of two numbers"

// Trusted domains for following redirects during download (GitHub release
// assets 302 to their CDN). Mirrors the extension's guard.
const TRUSTED_DOWNLOAD_DOMAINS = ["github.com", "objects.githubusercontent.com", "release-assets.githubusercontent.com"]

// ---------------------------------------------------------------------------
// Constant extraction (regex-based, no TS build — mirrors verify-semble-checksums)
// ---------------------------------------------------------------------------

/**
 * Extracts a single quoted string constant, e.g. `SEMBLE_VERSION = "v0.5.2"`.
 */
export function extractVersion(source) {
	const match = source.match(/SEMBLE_VERSION\s*=\s*"([^"]+)"/)
	if (!match) {
		throw new Error(`Could not parse SEMBLE_VERSION from ${DOWNLOADER_PATH}`)
	}
	return match[1]
}

/**
 * Returns the source text spanning an object literal, given the index just past
 * the opening `{` (already consumed by the caller). Depth starts at 1 to
 * account for the consumed opening brace, so inner entry braces do not
 * terminate the block early.
 */
function readObjectBlock(source, openBraceIndex) {
	let depth = 1
	for (let i = openBraceIndex; i < source.length; i++) {
		if (source[i] === "{") depth++
		else if (source[i] === "}") {
			depth--
			if (depth === 0) return source.slice(openBraceIndex, i)
		}
	}
	throw new Error(`Unterminated object literal in ${DOWNLOADER_PATH}`)
}

/**
 * Returns the source text of an object literal body, given a regex that matched
 * up to (but not including) the literal's opening `{`. We anchor on the LAST
 * `{` of the matched assignment `= {` so generic type parameters containing
 * braces are not mistaken for the literal's opening brace.
 */
function extractObjectBody(source, headerPattern, label) {
	const match = source.match(headerPattern)
	if (!match) {
		throw new Error(`Could not parse ${label} from ${DOWNLOADER_PATH}`)
	}
	const openBraceInMatch = match[0].lastIndexOf("{")
	if (openBraceInMatch === -1) {
		throw new Error(`Could not locate object literal for ${label} in ${DOWNLOADER_PATH}`)
	}
	return readObjectBlock(source, match.index + openBraceInMatch + 1)
}

/**
 * Extracts SEMBLE_ARCHIVES: platform key -> { archive, binary }.
 */
export function extractArchives(source) {
	const block = extractObjectBody(source, /SEMBLE_ARCHIVES[\s\S]*?=\s*{/, "SEMBLE_ARCHIVES")
	const archives = {}
	const entryPattern = /"([^"]+)":\s*\{\s*archive:\s*"([^"]+)",\s*binary:\s*"([^"]+)"\s*\}/g
	for (const entry of block.matchAll(entryPattern)) {
		archives[entry[1]] = { archive: entry[2], binary: entry[3] }
	}
	if (Object.keys(archives).length === 0) {
		throw new Error(`No SEMBLE_ARCHIVES entries parsed from ${DOWNLOADER_PATH}`)
	}
	return archives
}

/**
 * Extracts SEMBLE_SHA256: platform key -> lowercase hex digest.
 */
export function extractSha256(source) {
	const block = extractObjectBody(source, /SEMBLE_SHA256[\s\S]*?=\s*{/, "SEMBLE_SHA256")
	const hashes = {}
	const entryPattern = /"([^"]+)":\s*"([^"]+)"/g
	for (const entry of block.matchAll(entryPattern)) {
		hashes[entry[1]] = entry[2]
	}
	if (Object.keys(hashes).length === 0) {
		throw new Error(`No SEMBLE_SHA256 entries parsed from ${DOWNLOADER_PATH}`)
	}
	return hashes
}

// ---------------------------------------------------------------------------
// Binary resolution (mirrors the extension's resolveSembleBinary)
// ---------------------------------------------------------------------------

/**
 * Resolve the semble executable under `baseDir`, mirroring the extension's
 * resolveSembleBinary(): flat archive (<base>/semble) AND PyInstaller one-dir
 * archives (<base>/semble/semble), plus a bounded recursive fallback for
 * renamed wrapper dirs. Returns undefined when no regular FILE is found.
 */
export async function resolveSembleBinaryPath(baseDir, binaryName) {
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

	return findFileNamed(baseDir, binaryName, 0, 4)
}

async function findFileNamed(dir, name, depth, maxDepth) {
	if (depth > maxDepth) return undefined
	let entries
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

// ---------------------------------------------------------------------------
// Output assertions (mirror the extension's checkInstalled + _parseOutput)
// ---------------------------------------------------------------------------

/**
 * Asserts `--help` output advertises the `search` subcommand (case-insensitive),
 * mirroring checkInstalled(). A silent-exit-0 stub produces no such text.
 */
export function assertHelpOutput(stdout) {
	const help = stdout.trim()
	if (!help.toLowerCase().includes("search")) {
		throw new Error(
			"Semble binary is not functional: `--help` produced no output mentioning the `search` subcommand (silent-exit-0 stub regression)",
		)
	}
	return true
}

/**
 * Returns the first version-like token (e.g. "0.5.2" / "v0.5.2") found in CLI
 * output, or undefined when the output carries no version string.
 */
export function extractVersionFromOutput(output) {
	const text = output.trim()
	if (!text) return undefined
	const match = text.match(/v?\d+\.\d+(?:\.\d+)?(?:[-+][0-9A-Za-z.-]+)?/)
	return match ? match[0] : undefined
}

/**
 * Parses `semble search` stdout. Asserts it is JSON with a non-empty `results`
 * array whose entries carry a `file_path` (the extension's _convertResults
 * skips entries without file_path, so an all-empty-object stub must fail here).
 */
export function parseSearchOutput(stdout) {
	const trimmed = stdout.trim()
	if (!trimmed) {
		throw new Error("Semble search produced empty stdout")
	}

	let parsed
	try {
		parsed = JSON.parse(trimmed)
	} catch {
		throw new Error(`Semble search stdout is not valid JSON:\n${trimmed.slice(0, 500)}`)
	}

	if (parsed && typeof parsed === "object" && parsed.error) {
		throw new Error(`Semble search returned an error payload: ${parsed.error}`)
	}
	if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.results)) {
		throw new Error(`Semble search stdout has no top-level "results" array:\n${trimmed.slice(0, 500)}`)
	}
	if (parsed.results.length === 0) {
		throw new Error("Semble search returned an empty results array — no matches for the fixture query")
	}
	if (!parsed.results.some((r) => r && r.file_path)) {
		throw new Error("Semble search returned results but none carry a file_path — stub-like payload")
	}
	return parsed
}

// ---------------------------------------------------------------------------
// Process / network / archive helpers
// ---------------------------------------------------------------------------

/**
 * Spawns a command (argv array, no shell) and captures stdout/stderr. Rejects
 * on non-zero exit or timeout. Mirrors the CLI wrapper's spawn semantics.
 */
export function spawnCapture(command, args, { timeoutMs = 30_000 } = {}) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, { shell: false, stdio: ["ignore", "pipe", "pipe"] })
		let stdout = ""
		let stderr = ""
		let settled = false

		const timer = setTimeout(() => {
			settled = true
			child.kill("SIGKILL")
			reject(new Error(`Command timed out after ${timeoutMs}ms: ${command} ${args.join(" ")}`))
		}, timeoutMs)

		child.stdout?.on("data", (data) => {
			stdout += data.toString()
		})
		child.stderr?.on("data", (data) => {
			stderr += data.toString()
		})
		child.on("error", (err) => {
			if (settled) return
			settled = true
			clearTimeout(timer)
			reject(err)
		})
		child.on("close", (code) => {
			if (settled) return
			settled = true
			clearTimeout(timer)
			if (code === 0) {
				resolve({ stdout, stderr })
			} else {
				const detail = stderr.trim() || stdout.trim()
				reject(
					new Error(
						`Command exited with code ${code}: ${command} ${args.join(" ")}${detail ? `\n${detail.slice(0, 1000)}` : ""}`,
					),
				)
			}
		})
	})
}

function isTrustedDownloadUrl(url) {
	try {
		const parsed = new URL(url)
		const host = parsed.hostname
		return (
			parsed.protocol === "https:" && TRUSTED_DOWNLOAD_DOMAINS.some((d) => host === d || host.endsWith("." + d))
		)
	} catch {
		return false
	}
}

/**
 * Downloads a URL to a file, following redirects to trusted domains only.
 */
function downloadToFile(url, destPath, { timeoutMs = DEFAULT_DOWNLOAD_TIMEOUT_MS, maxRedirects = 5 } = {}) {
	return new Promise((resolve, reject) => {
		if (maxRedirects <= 0) {
			reject(new Error(`Too many redirects downloading ${url}`))
			return
		}

		const request = https.get(url, (response) => {
			if (
				response.statusCode &&
				response.statusCode >= 300 &&
				response.statusCode < 400 &&
				response.headers.location
			) {
				const redirectUrl = response.headers.location
				response.destroy()
				if (!isTrustedDownloadUrl(redirectUrl)) {
					reject(new Error(`Redirect to untrusted domain blocked: ${redirectUrl}`))
					return
				}
				downloadToFile(new URL(redirectUrl, url).toString(), destPath, {
					timeoutMs,
					maxRedirects: maxRedirects - 1,
				})
					.then(resolve)
					.catch(reject)
				return
			}

			if (response.statusCode !== 200) {
				response.destroy()
				reject(new Error(`HTTP ${response.statusCode} downloading ${url}`))
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

		request.setTimeout(timeoutMs, () => {
			request.destroy(new Error(`Download timed out after ${timeoutMs}ms: ${url}`))
		})
		request.on("error", reject)
	})
}

/**
 * Verifies a file's SHA-256 digest against an expected hex string.
 */
export async function verifyChecksum(filePath, expected) {
	const hash = createHash("sha256")
	await new Promise((resolve, reject) => {
		const stream = createReadStream(filePath)
		stream.on("data", (chunk) => hash.update(chunk))
		stream.on("end", resolve)
		stream.on("error", reject)
	})
	const actual = hash.digest("hex")
	if (actual !== expected.toLowerCase()) {
		throw new Error(
			`Checksum mismatch for ${path.basename(filePath)}: expected ${expected.slice(0, 12)}…, got ${actual.slice(0, 12)}…`,
		)
	}
	return actual
}

/**
 * Extracts a tar.gz or zip archive into destDir using the system tools.
 */
export async function extractArchive(archivePath, destDir, kind) {
	await fs.mkdir(destDir, { recursive: true })
	if (kind === "zip") {
		await spawnCapture("unzip", ["-o", archivePath, "-d", destDir], { timeoutMs: 60_000 })
	} else {
		const args = ["-xzf", archivePath, "-C", destDir, "--no-same-owner"]
		if (process.platform === "linux") args.push("--no-overwrite-dir")
		await spawnCapture("tar", args, { timeoutMs: 60_000 })
	}
}

/**
 * Runs `--version` then `-V` and returns the first that reports a version
 * string. Throws if neither yields one (silent-exit-0 stub regression).
 */
export async function runVersionCheck(binaryPath) {
	for (const flag of ["--version", "-V"]) {
		try {
			const { stdout } = await spawnCapture(binaryPath, [flag], {
				timeoutMs: DEFAULT_VERSION_CHECK_TIMEOUT_MS,
			})
			const version = extractVersionFromOutput(stdout)
			if (version) return { flag, version }
		} catch {
			// try the next flag
		}
	}
	throw new Error("Semble binary did not report a version string via --version or -V (silent-exit-0 stub regression)")
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

function parseArgs(argv) {
	const args = {
		help: false,
		keep: false,
		dir: undefined,
		query: process.env.SEMBLE_SMOKE_QUERY ?? DEFAULT_QUERY,
		searchTimeoutMs: Number(process.env.SEMBLE_SMOKE_SEARCH_TIMEOUT_MS) || DEFAULT_SEARCH_TIMEOUT_MS,
		fixtureRepo: process.env.SEMBLE_SMOKE_FIXTURE_REPO ?? DEFAULT_FIXTURE_REPO,
	}
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i]
		switch (arg) {
			case "--help":
			case "-h":
				args.help = true
				break
			case "--keep":
				args.keep = true
				break
			case "--dir":
				args.dir = argv[++i]
				break
			case "--search-timeout-ms":
				args.searchTimeoutMs = Number(argv[++i])
				break
			case "--query":
				args.query = argv[++i]
				break
			default:
				throw new Error(`Unknown option: ${arg}`)
		}
	}
	return args
}

function printHelp() {
	console.log(`
semble-smoke.mjs

End-to-end binary-level smoke test for the Semble code-index feature. Drives
the REAL published binary: download -> SHA-256 verify -> extract -> --help ->
--version -> search (against test-fixtures/semble-repo). Fails loudly if the
binary is a silent-exit-0 stub.

Usage:
  node scripts/semble-smoke.mjs [options]

Options:
  --dir <path>            Reuse an existing extracted binary dir (skips download)
  --keep                  Keep the temp work dir on exit (debugging)
  --search-timeout-ms <n> Search timeout in ms (default ${DEFAULT_SEARCH_TIMEOUT_MS}, mirrors the extension)
  --query <q>             Search query (default: "${DEFAULT_QUERY}")
  --help                  Show this help message

Env overrides:
  SEMBLE_SMOKE_SEARCH_TIMEOUT_MS  same as --search-timeout-ms
  SEMBLE_SMOKE_QUERY              same as --query
  SEMBLE_SMOKE_FIXTURE_REPO       fixture repo path (default: test-fixtures/semble-repo)
  SEMBLE_DOWNLOADER_PATH          path to semble-downloader.ts (default: src/...)

Operational note: the first search may download an embedding model from
HuggingFace (observed with v0.4.1); the search timeout defaults to 120s.
`)
}

async function main() {
	let args
	try {
		args = parseArgs(process.argv.slice(2))
	} catch (error) {
		logError(TAG, error.message)
		logError(TAG, "run `node scripts/semble-smoke.mjs --help` for usage.")
		process.exit(1)
	}
	if (args.help) {
		printHelp()
		return
	}

	let source
	try {
		source = await fs.readFile(DOWNLOADER_PATH, "utf-8")
	} catch (error) {
		throw new Error(`Cannot read ${DOWNLOADER_PATH}: ${error.message}`)
	}

	const version = extractVersion(source)
	const archives = extractArchives(source)
	const sha256 = extractSha256(source)

	const platformKey = `${process.platform}-${process.arch}`
	const info = archives[platformKey]
	if (!info) {
		throw new Error(
			`Unsupported platform ${platformKey}. Supported platforms: ${Object.keys(archives).join(", ")}. ` +
				"Run this smoke test on a machine that matches a published archive.",
		)
	}

	const workDir = args.dir ? path.resolve(args.dir) : await fs.mkdtemp(path.join(os.tmpdir(), "semble-smoke-"))
	const extractRoot = path.join(workDir, "extract")
	const archivePath = path.join(workDir, info.archive)
	const removeWorkDir = !args.keep && !args.dir

	logStep(TAG, `Semble smoke test (pinned ${version}, platform ${platformKey})`)
	logInfo(TAG, `archive : ${info.archive}`)
	logInfo(TAG, `binary  : ${info.binary}`)
	logInfo(TAG, `fixture : ${args.fixtureRepo}`)

	try {
		// [1/4] Acquire the real binary (download -> verify -> extract -> resolve)
		logStep(`${TAG}:ACQUIRE`, "Acquire binary (download -> verify -> extract -> resolve)")
		let binaryPath = await resolveSembleBinaryPath(extractRoot, info.binary)
		if (binaryPath) {
			logOk(`${TAG}:ACQUIRE`, `reusing extracted binary at ${binaryPath}`)
		} else {
			const url = releaseDownloadUrl(version, info.archive)
			logInfo(`${TAG}:ACQUIRE`, `downloading ${info.archive} from pinned ${version} release…`)
			await downloadToFile(url, archivePath)
			const size = (await fs.stat(archivePath)).size
			logOk(`${TAG}:ACQUIRE`, `downloaded ${(size / 1024 / 1024).toFixed(1)} MiB`)

			logInfo(`${TAG}:ACQUIRE`, `verifying SHA-256 against SEMBLE_SHA256[${platformKey}]…`)
			await verifyChecksum(archivePath, sha256[platformKey])

			logInfo(`${TAG}:ACQUIRE`, "extracting archive…")
			const kind = info.archive.endsWith(".zip") ? "zip" : "tar.gz"
			await extractArchive(archivePath, extractRoot, kind)

			binaryPath = await resolveSembleBinaryPath(extractRoot, info.binary)
			if (!binaryPath) {
				throw new Error(
					`Extracted archive did not contain expected binary "${info.binary}" (checked flat and one-dir layouts under ${extractRoot})`,
				)
			}
			if (process.platform !== "win32") {
				await fs.chmod(binaryPath, 0o755)
			}
			logOk(`${TAG}:ACQUIRE`, `resolved binary at ${binaryPath}`)
		}
		logEndGroup()

		// [2/4] Functional check: --help must advertise `search`
		logStep(`${TAG}:HELP`, "Functional check: `--help` advertises the `search` subcommand")
		const help = await spawnCapture(binaryPath, ["--help"], { timeoutMs: 10_000 })
		assertHelpOutput(help.stdout)
		logOk(`${TAG}:HELP`, "`--help` advertises the `search` subcommand")
		logEndGroup()

		// [3/4] Version check: --version / -V
		logStep(`${TAG}:VERSION`, "Version check: `--version` / `-V` reports a version string")
		const { flag, version: cliVersion } = await runVersionCheck(binaryPath)
		logOk(`${TAG}:VERSION`, `${flag} reported version ${cliVersion}`)
		logEndGroup()

		// [4/4] Real search against the fixture repo
		const searchArgs = [
			"search",
			args.query,
			args.fixtureRepo,
			"-k",
			String(DEFAULT_TOP_K),
			"--content",
			"code",
			"--max-snippet-lines",
			String(DEFAULT_MAX_SNIPPET_LINES),
		]
		logStep(`${TAG}:SEARCH`, "Real search against fixture repo")
		logInfo(`${TAG}:SEARCH`, `${path.basename(binaryPath)} ${searchArgs.join(" ")}`)
		logInfo(`${TAG}:SEARCH`, `(first run may download an embedding model from HuggingFace; timeout ${args.searchTimeoutMs}ms)`)
		const search = await spawnCapture(binaryPath, searchArgs, { timeoutMs: args.searchTimeoutMs })
		const parsed = parseSearchOutput(search.stdout)
		const first = parsed.results.find((r) => r && r.file_path) ?? parsed.results[0]
		logOk(`${TAG}:SEARCH`, `search returned ${parsed.results.length} result(s); first hit: ${first?.file_path ?? "<none>"}`)
		logEndGroup()

		logSuccess(
			TAG,
			`Semble smoke test PASSED: ${version} binary downloads, verifies, extracts, passes --help/--version, and returns real search results.`,
		)
	} finally {
		if (removeWorkDir) {
			await fs.rm(workDir, { recursive: true, force: true }).catch(() => {})
		}
	}
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
	main().catch((error) => {
		logError(TAG, `semble smoke test FAILED: ${error instanceof Error ? error.message : String(error)}`)
		process.exit(1)
	})
}
