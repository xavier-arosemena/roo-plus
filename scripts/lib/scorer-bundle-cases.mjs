/**
 * scorer-bundle-cases.mjs — case ordering for a scorer bundle (objections 10b, 18).
 *
 * WHY THIS IS NOT IN THE BUILDER
 *   The duplicate rule and the ordering rule are the two parts of the bundle that
 *   can be wrong quietly: a duplicate that is positional is not a reliability
 *   check, and a duplicate drawn from a truncated response measures the truncation
 *   instead of the scorer. Both are pure functions over case lists here, so
 *   `scripts/b3-isolation.spec.mjs` can exercise them without a run directory.
 *
 * DUPLICATE SELECTION IS DETERMINISTIC AND CLEAN-ONLY
 *   Callers pass only clean cases (status RUN, finishReason STOP or absent). The
 *   choice is ordered by `sha256(runId + salt)` so it cannot drift with plan order
 *   or file system order, and it is written to `_duplicate-map.json` outside both
 *   bundles so the audit can see exactly which responses were repeated.
 *
 * A DUPLICATE IS NOT POSITIONAL
 *   Duplicates are shuffled into the bundle with the base cases, not appended, so a
 *   scorer cannot tell a repeated response from where it sits in the list.
 *
 * No dependencies. Node 22 ESM.
 */

import * as fs from "node:fs/promises"
import * as path from "node:path"

import { sha256 } from "./framing-pretest.mjs"
import { shuffle } from "./scorer-bundle-guards.mjs"

/** Deterministically choose the responses to repeat under fresh case ids. */
export function selectDuplicateSources(cases, salt, count) {
	return [...cases]
		.sort((a, b) => {
			const ha = sha256(a.runId + salt)
			const hb = sha256(b.runId + salt)
			if (ha !== hb) return ha < hb ? -1 : 1
			return a.runId.localeCompare(b.runId)
		})
		.slice(0, Math.min(count, cases.length))
}

/** Base cases plus their duplicates, shuffled together so a duplicate is not positional. */
export function orderForBundle(cases, sources, seed) {
	const entries = cases.map((entry) => ({ ...entry, kind: "base" }))
	for (const source of sources) {
		entries.push({
			runId: `${source.runId}#dup`,
			duplicateOf: source.runId,
			kind: "duplicate",
			prompt: source.prompt,
			response: source.response,
		})
	}
	return shuffle(entries, seed)
}

/** Every file under `dir`, as `{ name, path }` with `path` relative to `base`. */
export async function walkFiles(dir, base = dir) {
	const found = []
	for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name)
		if (entry.isDirectory()) found.push(...(await walkFiles(full, base)))
		else found.push({ name: entry.name, path: path.relative(base, full) })
	}
	return found
}
