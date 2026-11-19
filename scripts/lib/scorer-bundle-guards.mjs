/**
 * scorer-bundle-guards.mjs — the two guards that make a scorer bundle blind:
 * the leak patterns and the "the map may not live in a bundle" path check.
 *
 * WHY THEY LIVE OUTSIDE THE CLI
 *   A guard that is only exercised by running the whole tool is a guard nobody
 *   tests. These are pure functions over strings and paths, so they can be
 *   pinned by `scripts/b3-isolation.spec.mjs` with no file system and no run
 *   directory involved.
 *
 * WHAT A LEAK TOKEN IS, AND WHY EACH ONE IS HERE
 *   `plan.json` / `arms.json` / `_blind-map.json` — the three files that name an
 *   arm. E11's `plan.json` de-blinded a whole batch.
 *   `answer-key.json` — the sealed owners file (Amendment 2 §A2.5). A bundle that
 *   contained it would hand the scorer the target it is supposed to record
 *   against, which converts "record the declared mode" back into "decide the
 *   owner". Its name is therefore a banned token as well as a banned file.
 *   `CATALOGUE-n` / `PICKER-n` — the blind labels themselves, which are one hash
 *   sort away from the frame names and are recorded in the sealed map.
 *   `A0`–`A5`, `C1`, `C2` — the registered arm letters.
 *   `axis-stance` / `artefact` / `b3-isolation` / `.roomodes` — fixture names.
 *   `A0-P1-r1` — E12's run id, which encodes condition, persona and repetition.
 *
 * WHY THE RUBRIC GETS A NARROWER FRAME-NAME PATTERN
 *   Amendment 1's frozen `DELIVERABLE` definition says a response "names an
 *   artefact to be produced". That is the ordinary English noun, and the rubric
 *   is byte-identical in both bundles, so nothing about a case's provenance can
 *   be inferred from it. `RUBRIC_LEAK_PATTERNS` therefore bans the fixture-file
 *   forms (`axis-stance`, `artefact.roomodes`) but not the bare noun. Every other
 *   token is still checked in the rubric.
 *
 * No dependencies. Node 22 ESM.
 */

import * as path from "node:path"

import { sha256 } from "./framing-pretest.mjs"

export const LEAK_PATTERNS = [
 { name: "plan file", pattern: /plan\.json/i },
 { name: "arms file", pattern: /arms\.json/i },
 { name: "blind map", pattern: /_blind-map\.json/i },
 { name: "answer key file", pattern: /answer-key\.json/i },
 { name: "answer key phrase", pattern: /answer[-\s]key/i },
 { name: "catalogue label", pattern: /CATALOGUE-\d/ },
 { name: "picker label", pattern: /PICKER-\d/ },
 { name: "condition id", pattern: /\b(?:A[0-5]|C[12])\b/ },
 { name: "frame name", pattern: /axis-stance|artefact/i },
 { name: "fixture directory", pattern: /b3-isolation/i },
 { name: "fixture extension", pattern: /\.roomodes/i },
 { name: "run id", pattern: /\b[A-C]\d-P\d-r\d\b/ },
]

/** The same list, with the bare noun `artefact` allowed (frozen rubric prose only). */
export const RUBRIC_LEAK_PATTERNS = LEAK_PATTERNS.map((entry) =>
 entry.name === "frame name" ? { name: entry.name, pattern: /axis-stance|artefact\.roomodes/i } : entry,
)

/** Every line of `text` that matches a leak token, with the token that matched. */
export function findLeaks(text, where, patterns = LEAK_PATTERNS) {
 const leaks = []
 for (const [index, line] of text.split("\n").entries()) {
 	for (const { name, pattern } of patterns) {
 		if (pattern.test(line)) leaks.push(`${where}:${index + 1}: ${name} (${JSON.stringify(line.slice(0, 80))})`)
 	}
 }
 return leaks
}

/**
 * Files that may never appear inside a bundle, by filename. Checked against the
 * written tree rather than only against the inputs, because a bundle is the thing
 * that gets handed to a scorer.
 */
export const SEALED_FILENAMES = ["answer-key.json", "plan.json", "arms.json", "_blind-map.json", "_case-maps.json", "_duplicate-map.json"]

/** Any sealed filename found anywhere under `entries` (`[{ name, path }]`, relative paths). */
export function findSealedFiles(entries) {
 const banned = new Set(SEALED_FILENAMES.map((name) => name.toLowerCase()))
 return entries.filter((entry) => banned.has(path.basename(entry.path).toLowerCase())).map((entry) => entry.path)
}

/** True when any segment of `target` is one of the bundle directories. */
export function isInsideBundle(target) {
 const segments = path.resolve(target).split(path.sep).map((segment) => segment.toLowerCase())
 return segments.includes("bundle-a") || segments.includes("bundle-b")
}

/**
 * True when `target` sits inside `root`. Used for the objection-18 rule: neither
 * the bundles nor the case map may be written into the run directory, because
 * that directory holds `plan.json`, the blind map and the sealed answer key.
 */
export function isInside(target, root) {
 const resolved = path.resolve(target)
 const parent = path.resolve(root)
 return resolved === parent || resolved.startsWith(parent + path.sep)
}

/**
 * Deterministic shuffle: order by `sha256(runId + seed)`, ties broken by run id.
 * Two different seeds give two orderings that cannot be aligned by position.
 */
export function shuffle(cases, seed) {
	return [...cases].sort((a, b) => {
		const ha = sha256(a.runId + seed)
		const hb = sha256(b.runId + seed)
		if (ha !== hb) return ha < hb ? -1 : 1
		return a.runId.localeCompare(b.runId)
	})
}
