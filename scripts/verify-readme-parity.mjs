#!/usr/bin/env node
/**
 * verify-readme-parity.mjs
 *
 * `README.md` and `src/README.md` must stay identical.
 *
 * Why: VS Code packages `src/` as the extension root, so `src/README.md` is the
 * file that ends up in the marketplace listing, while `README.md` is what people
 * read on the repository page. They have been kept byte-identical by hand, and
 * nothing enforced it — the next single-sided edit would silently make the
 * listing disagree with the repository.
 *
 * Usage:
 *   node scripts/verify-readme-parity.mjs         # fail if they differ
 *   node scripts/verify-readme-parity.mjs --fix   # copy README.md -> src/README.md
 *
 * Exit codes: 0 identical (or fixed), 1 drift, 2 missing source README.
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const HERE = path.dirname(fileURLToPath(import.meta.url))
export const REPO_ROOT = path.resolve(HERE, "..")

/**
 * Compare two README payloads, ignoring line-ending style only.
 *
 * CRLF vs LF is a checkout artefact, not editorial drift, so normalising it
 * avoids failing on Windows checkouts while still catching real divergence.
 *
 * @param {{ rootText: string, packagedText: string }} input
 * @returns {{ equal: boolean, reason?: string }}
 */
export function compareReadmes({ rootText, packagedText }) {
	const normalise = (text) => text.replace(/\r\n/g, "\n")

	if (normalise(rootText) === normalise(packagedText)) {
		return { equal: true }
	}

	return {
		equal: false,
		reason: "README.md and src/README.md differ — run `node scripts/verify-readme-parity.mjs --fix` (or copy README.md over src/README.md) and commit both.",
	}
}

function main() {
	const fix = process.argv.includes("--fix")
	const rootPath = path.join(REPO_ROOT, "README.md")
	const packagedPath = path.join(REPO_ROOT, "src", "README.md")

	if (!fs.existsSync(rootPath)) {
		console.error("[verify-readme-parity] README.md is missing")
		return 2
	}

	if (!fs.existsSync(packagedPath)) {
		console.error("[verify-readme-parity] src/README.md is missing — it is the packaged listing README")
		return 2
	}

	const rootText = fs.readFileSync(rootPath, "utf8")
	const packagedText = fs.readFileSync(packagedPath, "utf8")
	const result = compareReadmes({ rootText, packagedText })

	if (result.equal) {
		console.log("[verify-readme-parity] README.md and src/README.md are identical")
		return 0
	}

	if (fix) {
		fs.writeFileSync(packagedPath, rootText, "utf8")
		console.log("[verify-readme-parity] copied README.md -> src/README.md")
		return 0
	}

	console.error(`[verify-readme-parity] ${result.reason}`)
	return 1
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	process.exitCode = main()
}
