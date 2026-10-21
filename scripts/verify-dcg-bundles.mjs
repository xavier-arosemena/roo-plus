#!/usr/bin/env node

/**
 * verify-dcg-bundles.mjs — hash gate for the bundled DCG binaries (review finding M8).
 *
 * `src/services/destructive-command-guard/constants.ts` pins TWO hashes per
 * platform: `sha256` for the upstream release archive and `binarySha256` for the
 * executable inside it. The notices gate re-derives the archive hash, but nothing
 * in CI ever extracted an archive to compare the extracted executable — so a
 * typo in `binarySha256` was undetectable until a user on that platform enabled
 * the guard, at which point the (correctly fail-closed) install rejects the
 * binary forever and the feature is dead for every user on that OS/arch.
 *
 * This gate closes that hole. For every pinned platform it:
 *
 *   1. hashes the committed archive and compares it to `sha256`;
 *   2. extracts the archive into a throwaway staging directory with the same
 *      tools the runtime uses (`tar -xJf` / `unzip`);
 *   3. hashes the extracted executable and compares it to `binarySha256`.
 *
 * It is offline and deterministic, and it does not run in any publish workflow
 * (the VSIX audit cluster is the only late-stage gate there; adding bytes-level
 * verification to a publish path would create a new way to fail a release).
 *
 * Usage (repo root):
 *   node scripts/verify-dcg-bundles.mjs            # gate
 *   node scripts/verify-dcg-bundles.mjs --json     # machine-readable verdict
 *   node scripts/verify-dcg-bundles.mjs --help
 *
 * Exit codes:
 *   0  PASS
 *   1  FAIL — an archive is missing, an archive hash drifted, the executable is
 *             absent from the archive, or the executable hash drifted.
 *   2  USAGE error.
 *   3  TOOL error — `constants.ts` unreadable/unparseable, or tar/unzip missing.
 */

import { execFileSync } from "node:child_process"
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import { pathToFileURL } from "node:url"

import { logError, logInfo, logOk, logStep, logWarn } from "./lib/logger.mjs"
import { DCG_BUNDLE_DIR, DCG_CONSTANTS_PATH, ROOT, parseDcgPins, sha256File } from "./verify-third-party-notices.mjs"

/** Hierarchical tag identifying this process (same scheme as the sibling gates). */
export const TAG = "VERIFY:DCG-BUNDLES"

/** Repo-relative label for the bundle directory (`src/bin/dcg`), used in messages. */
export const BUNDLE_LABEL = path.relative(ROOT, DCG_BUNDLE_DIR)

export const EXIT = {
	PASS: 0,
	FAIL: 1,
	USAGE: 2,
	TOOL_ERROR: 3,
}

/* ------------------------------------------------------------------ *
 * Pure decision logic (unit-testable without tar/unzip or real archives).
 * ------------------------------------------------------------------ */

/**
 * Verifies every pinned DCG archive and the executable inside it.
 *
 * All I/O is injected so the decision logic can be tested without extracting
 * five real archives:
 *
 * @param {{archive: string, binary: string, sha256: string, binarySha256: string}[]} pins
 * @param {string} bundleDir - directory holding the committed archives
 * @param {{
 *   hashFile: (file: string) => string,
 *   exists: (file: string) => boolean,
 *   createStaging: () => string,
 *   removeStaging: (dir: string) => void,
 *   extract: (archivePath: string, stagingDir: string) => void,
 * }} io
 * @returns {{
 *   checked: number,
 *   missing: string[],
 *   archiveMismatch: {archive: string, expected: string, actual: string}[],
 *   binaryMissing: {archive: string, binary: string}[],
 *   binaryMismatch: {archive: string, binary: string, expected: string, actual: string}[],
 *   extractFailed: {archive: string, error: string}[],
 * }}
 */
export function verifyBundles(pins, bundleDir, io) {
	const result = {
		checked: 0,
		missing: [],
		archiveMismatch: [],
		binaryMissing: [],
		binaryMismatch: [],
		extractFailed: [],
	}

	for (const pin of pins) {
		const archivePath = path.join(bundleDir, pin.archive)
		if (!io.exists(archivePath)) {
			result.missing.push(pin.archive)
			continue
		}

		const archiveActual = io.hashFile(archivePath)
		if (archiveActual !== pin.sha256) {
			result.archiveMismatch.push({ archive: pin.archive, expected: pin.sha256, actual: archiveActual })
			// The extracted bytes of a drifted archive are meaningless to compare,
			// so stop here for this platform rather than reporting noise.
			continue
		}

		const stagingDir = io.createStaging()
		try {
			try {
				io.extract(archivePath, stagingDir)
			} catch (error) {
				result.extractFailed.push({
					archive: pin.archive,
					error: error instanceof Error ? error.message : String(error),
				})
				continue
			}
			const binaryPath = path.join(stagingDir, pin.binary)
			if (!io.exists(binaryPath)) {
				result.binaryMissing.push({ archive: pin.archive, binary: pin.binary })
				continue
			}
			const binaryActual = io.hashFile(binaryPath)
			if (binaryActual !== pin.binarySha256) {
				result.binaryMismatch.push({
					archive: pin.archive,
					binary: pin.binary,
					expected: pin.binarySha256,
					actual: binaryActual,
				})
			}
			result.checked += 1
		} finally {
			io.removeStaging(stagingDir)
		}
	}

	return result
}

/** True when `verifyBundles` found no problem at all. */
export function bundlesOk(result) {
	return (
		result.missing.length === 0 &&
		result.archiveMismatch.length === 0 &&
		result.binaryMissing.length === 0 &&
		result.binaryMismatch.length === 0 &&
		result.extractFailed.length === 0
	)
}

/**
 * Flattens a `verifyBundles` result into human-readable failure lines.
 * @param {ReturnType<typeof verifyBundles>} result
 * @returns {string[]}
 */
export function bundleFailureMessages(result) {
	const messages = []
	for (const archive of result.missing) {
		messages.push(`bundled DCG archive is missing: ${BUNDLE_LABEL}/${archive}`)
	}
	for (const m of result.archiveMismatch) {
		messages.push(`DCG archive ${m.archive} hashes to ${m.actual}, pinned ${m.expected}`)
	}
	for (const f of result.extractFailed) {
		messages.push(`could not extract DCG archive ${f.archive}: ${f.error}`)
	}
	for (const m of result.binaryMissing) {
		messages.push(`DCG archive ${m.archive} does not contain ${m.binary}`)
	}
	for (const m of result.binaryMismatch) {
		messages.push(
			`DCG executable ${m.binary} in ${m.archive} hashes to ${m.actual}, pinned binarySha256 ${m.expected}`,
		)
	}
	return messages
}

/* ------------------------------------------------------------------ *
 * Real I/O
 * ------------------------------------------------------------------ */

/** Extracts an archive with the same tools the runtime uses. */
export function extractArchive(archivePath, stagingDir) {
	if (archivePath.endsWith(".zip")) {
		// `unzip` is used on POSIX hosts; the runtime uses Expand-Archive on
		// Windows, but this gate runs on the Linux CI runner.
		execFileSync("unzip", ["-oqq", archivePath, "-d", stagingDir], { stdio: ["ignore", "pipe", "pipe"] })
		return
	}
	const args = ["-xJf", archivePath, "-C", stagingDir, "--no-same-owner"]
	if (process.platform !== "win32") args.push("--no-overwrite-dir")
	execFileSync("tar", args, { stdio: ["ignore", "pipe", "pipe"] })
}

/** Creates the injected I/O bundle used by `main()`. */
export function realIo() {
	return {
		hashFile: sha256File,
		exists: (file) => {
			try {
				return existsSync(file) && statSync(file).isFile()
			} catch {
				return false
			}
		},
		createStaging: () => mkdtempSync(path.join(os.tmpdir(), "dcg-bundle-")),
		removeStaging: (dir) => rmSync(dir, { recursive: true, force: true }),
		extract: extractArchive,
	}
}

/* ------------------------------------------------------------------ *
 * CLI
 * ------------------------------------------------------------------ */

const HELP = `verify-dcg-bundles.mjs — verify the bundled DCG archives AND the executables inside them

Usage:
  node scripts/verify-dcg-bundles.mjs [--json] [--help]

For every platform pinned in src/services/destructive-command-guard/constants.ts:
  · the committed archive must hash to the pinned sha256;
  · the archive must extract, and the extracted executable must hash to the
    pinned binarySha256.

Offline and deterministic. Requires tar (with xz) and unzip on the host.

Exit codes:
  0 PASS · 1 FAIL (missing archive / hash drift / missing executable) ·
  2 usage error · 3 tool error (constants.ts unreadable, tar/unzip missing)
`

function parseArgs(argv) {
	const args = { json: false, help: false }
	for (const a of argv) {
		if (a === "--json") args.json = true
		else if (a === "--help" || a === "-h") args.help = true
		else return { error: `unknown option: ${a}` }
	}
	return args
}

export async function main(argv = process.argv.slice(2)) {
	const args = parseArgs(argv)
	if (args.error) {
		process.stderr.write(`Error: ${args.error}\n\n${HELP}`)
		return EXIT.USAGE
	}
	if (args.help) {
		process.stdout.write(HELP)
		return EXIT.PASS
	}

	let pins
	try {
		pins = parseDcgPins(readFileSync(DCG_CONSTANTS_PATH, "utf8"))
	} catch (error) {
		process.stderr.write(
			`Error: could not read DCG pins from ${path.relative(ROOT, DCG_CONSTANTS_PATH)}: ${error.message}\n`,
		)
		return EXIT.TOOL_ERROR
	}
	if (pins.archives.length === 0) {
		process.stderr.write("Error: no DCG archive pins were parsed from constants.ts — refusing to pass\n")
		return EXIT.TOOL_ERROR
	}

	// DCG_BUNDLE_DIR is already absolute (`<root>/src/bin/dcg`).
	logStep(TAG, `verifying ${pins.archives.length} bundled DCG archive(s) in ${BUNDLE_LABEL}`)

	let result
	try {
		result = verifyBundles(pins.archives, DCG_BUNDLE_DIR, realIo())
	} catch (error) {
		process.stderr.write(`Error: could not verify the bundled DCG archives: ${error.message}\n`)
		return EXIT.TOOL_ERROR
	}

	const failures = bundleFailureMessages(result)
	const verdict = {
		ok: bundlesOk(result),
		pins: pins.archives.length,
		verified: result.checked,
		failures,
	}

	if (args.json) {
		process.stdout.write(JSON.stringify(verdict, null, 2) + "\n")
	} else if (verdict.ok) {
		logOk(
			TAG,
			`${result.checked}/${pins.archives.length} bundled DCG archives verified (archive SHA-256 + extracted binary SHA-256)`,
		)
	} else {
		logError(TAG, `${failures.length} bundled-DCG problem(s)`)
		for (const failure of failures) logWarn(TAG, failure)
		logInfo(
			TAG,
			"re-download the upstream v" +
				`${(pins.version || "").replace(/^v/, "")} release assets and update constants.ts — never re-pin a hash to match a local file`,
		)
	}

	return verdict.ok ? EXIT.PASS : EXIT.FAIL
}

// Run only when executed directly (not when imported by the spec file).
const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
if (isDirectRun) {
	main()
		.then((code) => {
			process.exitCode = code
		})
		.catch((error) => {
			process.stderr.write(`Error: ${error.message}\n`)
			process.exitCode = EXIT.TOOL_ERROR
		})
}
