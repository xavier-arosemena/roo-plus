/**
 * eval-output-dir.spec.mjs — pins the default output directory of the eval runners.
 *
 * The property under test is the one the code-scanning alert was about: the
 * DEFAULT must not be a predictable path in the temp directory. An explicit
 * `--out` must still be used verbatim, because scripted workflows (and the specs
 * that pre-create a run directory) pass one.
 */

import { after, describe, it } from "node:test"
import assert from "node:assert/strict"

import * as fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import { resolveEvalOutputDir } from "./lib/eval-output-dir.mjs"

const created = []

async function makeDefault(prefix) {
	const directory = await resolveEvalOutputDir(undefined, { prefix })
	created.push(directory)
	return directory
}

describe("resolveEvalOutputDir", () => {
	it("uses an explicit path verbatim, resolved against the working directory", async () => {
		const explicit = path.join(os.tmpdir(), "eval-output-dir-explicit")
		created.push(explicit)
		await fs.mkdir(explicit, { recursive: true })

		assert.equal(await resolveEvalOutputDir(explicit), path.resolve(explicit))
		assert.equal(await resolveEvalOutputDir(explicit, { prefix: "ignored-" }), path.resolve(explicit))
	})

	it("ignores an empty or whitespace-only --out", async () => {
		const a = await resolveEvalOutputDir("", { prefix: "eval-empty-" })
		created.push(a)
		const b = await resolveEvalOutputDir("   ", { prefix: "eval-empty-" })
		created.push(b)

		assert.notEqual(a, b)
	})

	it("creates a fresh directory under the temp root for every invocation", async () => {
		const a = await makeDefault("eval-round-")
		const b = await makeDefault("eval-round-")

		assert.notEqual(a, b, "two runs must not share a predictable directory")
		assert.equal(path.dirname(a), os.tmpdir())
		assert.ok(path.basename(a).startsWith("eval-round-"))
		assert.ok((await fs.stat(a)).isDirectory())
	})

	it("creates the directory owner-only, so another local user cannot read the run", async () => {
		const directory = await makeDefault("eval-mode-")
		const mode = (await fs.stat(directory)).mode & 0o777

		assert.equal(mode & 0o077, 0, `expected no group/other bits, got ${mode.toString(8)}`)
	})

	it("honours a custom parent directory", async () => {
		const parent = await fs.mkdtemp(path.join(os.tmpdir(), "eval-parent-"))
		created.push(parent)
		const directory = await resolveEvalOutputDir(null, { prefix: "child-", parent })
		created.push(directory)

		assert.equal(path.dirname(directory), parent)
	})
})

after(async () => {
	for (const directory of created) {
		await fs.rm(directory, { recursive: true, force: true })
	}
})
