/**
 * eval-output-dir.mjs — where a local model-eval run writes its output.
 *
 * WHY THIS EXISTS (code-scanning `js/insecure-temporary-file`)
 *   Both eval runners used to default to a FIXED path under `os.tmpdir()`
 *   (`<tmp>/roo-plus-routing-round/stage-1`, `<tmp>/roo-plus-scoring-bundles`).
 *   A predictable path in a world-writable directory is pre-creatable by any
 *   other local user, and every file written beneath it inherits that exposure.
 *   `fs.mkdtemp` creates a directory that is unique to this process and is
 *   created with owner-only permissions, so the default output is no longer
 *   predictable while staying as easy to find (the resolved path is printed).
 *
 * COMPATIBILITY
 *   An explicit `--out` (or any other flag) is used verbatim, so scripted
 *   workflows and the specs that pre-create their own run directory are
 *   unaffected. Only the DEFAULT changes.
 *
 * No dependencies. Node 22 ESM.
 */

import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"

/**
 * Resolve a run's output directory.
 *
 * @param {string | null | undefined} explicit  the operator's `--out`, if any
 * @param {{ prefix?: string, parent?: string }} [options]
 *   `prefix` names the mkdtemp directory (must end in something unique-ish);
 *   `parent` defaults to `os.tmpdir()` and exists so the behaviour can be tested
 *   without writing outside the system temp root.
 * @returns {Promise<string>} an absolute path that exists and is a directory
 */
export async function resolveEvalOutputDir(explicit, options = {}) {
	const { prefix = "roo-plus-eval-", parent = os.tmpdir() } = options

	if (typeof explicit === "string" && explicit.trim() !== "") {
		return path.resolve(explicit)
	}

	return fs.mkdtemp(path.join(parent, prefix))
}
