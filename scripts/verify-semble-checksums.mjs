/**
 * verify-semble-checksums.mjs
 *
 * Release-readiness guard for the Semble code-index feature.
 *
 * The Semble downloader hardcodes three constants that must stay in lockstep:
 *   - SEMBLE_VERSION   (src/services/code-index/semble/semble-downloader.ts)
 *   - SEMBLE_ARCHIVES  (platform-keyed -> { archive, binary })
 *   - SEMBLE_SHA256    (platform-keyed hashes pinned to SEMBLE_VERSION)
 *
 * At runtime, the downloader prefers the GitHub `checksums-sha256.txt` manifest
 * and only falls back to the hardcoded SEMBLE_SHA256 when the manifest is
 * unavailable. If SEMBLE_VERSION is bumped without regenerating SEMBLE_SHA256,
 * that fallback silently verifies against the WRONG (old) hashes. This script
 * makes that drift impossible to miss by confirming the release tagged at
 * SEMBLE_VERSION actually ships the checksums manifest and that every archive's
 * manifest hash matches the hardcoded SEMBLE_SHA256.
 *
 * It does NOT require a TypeScript build: the three constants are extracted
 * from the source file with a small regex-based parser (importing the TS module
 * would pull in fs/https/child_process side effects).
 *
 * Usage (repo root):
 *   node scripts/verify-semble-checksums.mjs            # non-blocking (default)
 *   node scripts/verify-semble-checksums.mjs --strict   # fail on network errors too
 *   node scripts/verify-semble-checksums.mjs --help
 *
 * Exit codes:
 *   0  verified OK, or (non-strict) verification skipped due to no network
 *   1  a checksum/archive mismatch was found, or a network error under --strict
 */

import { readFile } from "node:fs/promises"
import { get } from "node:https"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// Overridable so CI/tests can point at a different checkout of the downloader.
const DOWNLOADER_PATH = process.env.SEMBLE_DOWNLOADER_PATH
	? path.resolve(process.env.SEMBLE_DOWNLOADER_PATH)
	: path.resolve(__dirname, "../src/services/code-index/semble/semble-downloader.ts")
const MANIFEST_URL = (version) =>
	`https://github.com/Audare-est-Facere/sembleexec/releases/download/${version}/checksums-sha256.txt`

const REQUEST_TIMEOUT_MS = 15_000

const args = process.argv.slice(2)
const isStrict = args.includes("--strict")
const isHelp = args.includes("--help") || args.includes("-h")

if (isHelp) {
	console.log(`
verify-semble-checksums.mjs

Verifies that the GitHub release tagged at SEMBLE_VERSION ships a
checksums-sha256.txt manifest whose hashes match the hardcoded SEMBLE_SHA256
table in the Semble downloader. Prevents SEMBLE_VERSION from drifting from
SEMBLE_SHA256 / SEMBLE_ARCHIVES.

Usage:
  node scripts/verify-semble-checksums.mjs [options]

Options:
  --strict   Exit non-zero if the manifest cannot be fetched (network error).
             Without --strict, network failures print "offline — skipped" and
             exit 0 so CI runs are not blocked by transient connectivity.
  --help     Show this help message
`)
	process.exit(0)
}

/**
 * Extracts a single quoted string constant, e.g. `SEMBLE_VERSION = "v0.5.2"`.
 */
function extractVersion(source) {
	const match = source.match(/SEMBLE_VERSION\s*=\s*"([^"]+)"/)
	if (!match) {
		throw new Error(`Could not parse SEMBLE_VERSION from ${DOWNLOADER_PATH}`)
	}
	return match[1]
}

/**
 * Returns the source text spanning an object literal, given the index just past
 * the opening `{` (already consumed by the caller). Stops at the matching
 * top-level `}`. Depth starts at 1 to account for the consumed opening brace,
 * so inner entry braces (`"linux-x64": { archive: ... }`) do not terminate the
 * block early.
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
 * up to (but not including) the literal's opening `{`. The generic type
 * parameters may themselves contain braces (`Record<string, { archive: string }>`),
 * so we anchor on the LAST `{` of the matched assignment `= {`.
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
function extractArchives(source) {
	const block = extractObjectBody(
		source,
		/SEMBLE_ARCHIVES[\s\S]*?=\s*{/,
		"SEMBLE_ARCHIVES",
	)
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
function extractSha256(source) {
	const block = extractObjectBody(
		source,
		/SEMBLE_SHA256[\s\S]*?=\s*{/,
		"SEMBLE_SHA256",
	)
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

/**
 * Fetches a URL as text, following redirects (GitHub release assets 302 to the
 * CDN). Rejects on non-200 responses, network errors, or timeout.
 */
function fetchText(url, timeoutMs) {
	return new Promise((resolve, reject) => {
		const request = get(url, (response) => {
			if (
				response.statusCode &&
				response.statusCode >= 300 &&
				response.statusCode < 400 &&
				response.headers.location
			) {
				response.resume()
				fetchText(new URL(response.headers.location, url).toString(), timeoutMs)
					.then(resolve)
					.catch(reject)
				return
			}

			if (response.statusCode !== 200) {
				response.resume()
				reject(new Error(`HTTP ${response.statusCode} for ${url}`))
				return
			}

			const chunks = []
			response.on("data", (chunk) => chunks.push(chunk))
			response.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")))
			response.on("error", reject)
		})
		request.setTimeout(timeoutMs, () => {
			request.destroy(new Error(`Request timed out after ${timeoutMs}ms for ${url}`))
		})
		request.on("error", reject)
	})
}

/**
 * Parses a checksums manifest: `<sha256>  <filename>` per line.
 */
function parseManifest(content) {
	const checksums = {}
	for (const line of content.split("\n")) {
		const trimmed = line.trim()
		if (!trimmed) continue
		const parts = trimmed.split(/\s+/)
		if (parts.length >= 2) {
			checksums[parts[1]] = parts[0]
		}
	}
	return checksums
}

async function main() {
	let source
	try {
		source = await readFile(DOWNLOADER_PATH, "utf-8")
	} catch (error) {
		console.error(`✖ Cannot read ${DOWNLOADER_PATH}: ${error.message}`)
		process.exit(1)
	}

	const version = extractVersion(source)
	const archives = extractArchives(source)
	const sha256 = extractSha256(source)

	console.log(`SEMBLE_VERSION : ${version}`)
	console.log(`Archives       : ${Object.values(archives).map((info) => info.archive).join(", ")}`)

	const manifestUrl = MANIFEST_URL(version)
	let manifest
	try {
		const content = await fetchText(manifestUrl, REQUEST_TIMEOUT_MS)
		manifest = parseManifest(content)
		console.log(`Manifest       : fetched ${Object.keys(manifest).length} checksum(s) from ${manifestUrl}`)
	} catch (error) {
		const message = `offline — skipped: ${error.message}`
		if (isStrict) {
			console.error(`✖ ${message}`)
			console.error("  --strict set, so a network failure is treated as fatal.")
			process.exit(1)
		}
		console.warn(`⚠ ${message}`)
		console.warn("  Cannot verify SEMBLE_SHA256 against the live release; verification skipped.")
		console.warn("  Re-run with --strict (or on a networked machine) to enforce the lockstep guard.")
		process.exit(0)
	}

	const problems = []
	for (const [platformKey, { archive }] of Object.entries(archives)) {
		const manifestHash = manifest[archive]
		const pinnedHash = sha256[platformKey]
		if (!manifestHash) {
			problems.push(
				`  - archive "${archive}" (${platformKey}) is MISSING from the ${version} checksums manifest.`,
			)
		} else if (manifestHash !== pinnedHash) {
			problems.push(
				`  - archive "${archive}" (${platformKey}): manifest=${manifestHash} vs SEMBLE_SHA256=${pinnedHash}`,
			)
		}
	}

	if (problems.length > 0) {
		console.error(
			`✖ SEMBLE_VERSION was bumped without regenerating SEMBLE_SHA256 — run \`shasum -a 256 <archive>\` for each platform and update SEMBLE_SHA256.`,
		)
		console.error(`  Detected ${problems.length} mismatch(es) for ${version}:`)
		for (const problem of problems) console.error(problem)
		process.exit(1)
	}

	console.log(`✔ All ${Object.keys(archives).length} archives at ${version} match SEMBLE_SHA256.`)
	process.exit(0)
}

main().catch((error) => {
	console.error(`✖ Unexpected error: ${error instanceof Error ? error.message : String(error)}`)
	process.exit(1)
})
