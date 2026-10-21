/**
 * verify-dcg-bundles.spec.mjs
 *
 * Unit tests for the bundled-DCG hash gate (review finding M8). The decision
 * logic is exercised with an injected extractor and hash function, so no real
 * archive is unpacked here; the final block checks that the checked-in pins
 * parse and cover every archive that actually ships.
 *
 * Run from the repo root with: node --test scripts/verify-dcg-bundles.spec.mjs
 */

import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { readFileSync, readdirSync } from "node:fs"

import {
	DCG_BUNDLE_DIR,
	DCG_CONSTANTS_PATH,
	parseDcgPins,
} from "./verify-third-party-notices.mjs"
import { bundleFailureMessages, bundlesOk, verifyBundles } from "./verify-dcg-bundles.mjs"

const PIN = {
	archive: "dcg-x86_64-unknown-linux-musl.tar.xz",
	binary: "dcg",
	sha256: "a".repeat(64),
	binarySha256: "b".repeat(64),
}

/**
 * Builds the injected I/O used by verifyBundles.
 *
 * @param {object} options
 * @param {Record<string, string>} options.files - virtual filesystem: path suffix -> sha256
 * @param {string[]} options.extracted - binaries an extraction produces (relative names)
 * @param {Record<string, string>} options.contents - virtual hashes for extracted binaries
 */
function makeIo({ archiveHash = PIN.sha256, extracted = [PIN.binary], binaryHash = PIN.binarySha256, extractError } = {}) {
	const stagings = []
	let counter = 0
	return {
		io: {
			hashFile: (file) => {
				if (file.includes("dcg-bundle-")) {
					return file.endsWith(PIN.binary) ? binaryHash : "unknown"
				}
				return archiveHash
			},
			exists: (file) => {
				if (file.includes("dcg-bundle-")) return extracted.some((name) => file.endsWith(name))
				return archiveHash !== undefined
			},
			createStaging: () => {
				const dir = `/tmp/dcg-bundle-${counter++}`
				stagings.push(dir)
				return dir
			},
			removeStaging: (dir) => {
				const index = stagings.indexOf(dir)
				if (index >= 0) stagings.splice(index, 1)
			},
			extract: () => {
				if (extractError) throw new Error(extractError)
			},
		},
		stagings,
	}
}

describe("verifyBundles", () => {
	it("passes when the archive and the extracted binary match their pins", () => {
		const { io, stagings } = makeIo()
		const result = verifyBundles([PIN], "/bundle", io)
		assert.deepEqual(bundleFailureMessages(result), [])
		assert.equal(bundlesOk(result), true)
		assert.equal(result.checked, 1)
		// Staging directories are always cleaned up, success or failure.
		assert.deepEqual(stagings, [])
	})

	it("fails when the archive hash drifted, without trying to compare the binary", () => {
		const { io } = makeIo({ archiveHash: "c".repeat(64) })
		const result = verifyBundles([PIN], "/bundle", io)
		assert.equal(bundlesOk(result), false)
		assert.equal(result.archiveMismatch.length, 1)
		assert.equal(result.checked, 0)
		assert.match(bundleFailureMessages(result)[0], /pinned a{64}/)
	})

	it("fails when the extracted executable does not match binarySha256", () => {
		const { io } = makeIo({ binaryHash: "d".repeat(64) })
		const result = verifyBundles([PIN], "/bundle", io)
		assert.equal(bundlesOk(result), false)
		assert.equal(result.binaryMismatch.length, 1)
		assert.match(bundleFailureMessages(result)[0], /pinned binarySha256 b{64}/)
	})

	it("fails when the archive extracts but does not contain the expected executable", () => {
		const { io } = makeIo({ extracted: ["README.md"] })
		const result = verifyBundles([PIN], "/bundle", io)
		assert.equal(bundlesOk(result), false)
		assert.equal(result.binaryMissing.length, 1)
		assert.match(bundleFailureMessages(result)[0], /does not contain dcg/)
	})

	it("reports an extraction failure instead of throwing", () => {
		const { io, stagings } = makeIo({ extractError: "tar: not found" })
		const result = verifyBundles([PIN], "/bundle", io)
		assert.equal(bundlesOk(result), false)
		assert.equal(result.extractFailed.length, 1)
		assert.match(bundleFailureMessages(result)[0], /could not extract DCG archive/)
		assert.deepEqual(stagings, [])
	})

	it("reports a missing archive", () => {
		const { io } = makeIo({ archiveHash: undefined })
		io.exists = () => false
		const result = verifyBundles([PIN], "/bundle", io)
		assert.deepEqual(result.missing, [PIN.archive])
		assert.equal(bundlesOk(result), false)
	})

	it("checks every pinned platform, not just the current one", () => {
		const pins = [
			PIN,
			{ ...PIN, archive: "dcg-x86_64-pc-windows-msvc.zip", binary: "dcg.exe" },
			{ ...PIN, archive: "dcg-aarch64-apple-darwin.tar.xz" },
		]
		const { io } = makeIo()
		// Every extraction yields the binary named by the pin.
		io.exists = (file) => (file.includes("dcg-bundle-") ? true : true)
		io.hashFile = (file) => (file.includes("dcg-bundle-") ? PIN.binarySha256 : PIN.sha256)
		const result = verifyBundles(pins, "/bundle", io)
		assert.equal(result.checked, 3)
		assert.equal(bundlesOk(result), true)
	})
})

describe("checked-in DCG pins", () => {
	const source = readFileSync(DCG_CONSTANTS_PATH, "utf8")
	const pins = parseDcgPins(source)

	it("parses one pin per bundled archive", () => {
		// DCG_BUNDLE_DIR is the absolute `<root>/src/bin/dcg`.
		const bundled = readdirSync(DCG_BUNDLE_DIR).filter((f) => /\.(?:tar\.xz|zip)$/.test(f))
		assert.equal(pins.archives.length, bundled.length)
		assert.equal(pins.archives.length, 5)
	})

	it("pins a distinct archive hash and binary hash for each platform", () => {
		const binaryHashes = new Set(pins.archives.map((p) => p.binarySha256))
		const archiveHashes = new Set(pins.archives.map((p) => p.sha256))
		assert.equal(binaryHashes.size, pins.archives.length)
		assert.equal(archiveHashes.size, pins.archives.length)
		for (const pin of pins.archives) {
			assert.match(pin.sha256, /^[0-9a-f]{64}$/)
			assert.match(pin.binarySha256, /^[0-9a-f]{64}$/)
		}
	})
})
