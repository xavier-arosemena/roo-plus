/**
 * framing-pretest.mjs — material and blinding for the agent framing pretest
 * (pre-registration Amendment 5).
 *
 * WHAT THIS IS
 *   The pure half of `scripts/run-framing-pretest.mjs`: read the two frozen frame
 *   fixtures, project each mode down to the three fields a picker actually shows
 *   (`slug`, `name`, `whenToUse`), assign the blind labels, build the prompts.
 *   It performs no I/O other than reading the two fixtures.
 *
 * WHY THE PROJECTION IS A WHITELIST
 *   The fixtures carry `description`, `roleDefinition` and `groups`. Amendment 5
 *   allows a run to see only slug / name / `whenToUse`. The projection copies
 *   exactly those three keys, so doctrine and grants cannot reach a prompt by
 *   accident; `framing-pretest-audit.mjs` then re-checks the emitted bytes.
 *
 * WHY THE LABELS ARE A HASH SORT
 *   The fixtures are named `axis-stance` and `artefact`. Any label derived from
 *   the frame name, the file order or the mode count would de-blind the material
 *   at a glance. Labels are therefore assigned by sorting the frame names on
 *   `sha256(frame + seed)`, as `run-b1-pilot.sh` does for case ids: reproducible,
 *   independent of execution order, recorded in the blind map.
 *
 * No dependencies. Node 22 ESM.
 */

import * as crypto from "node:crypto"
import * as fs from "node:fs/promises"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..")
export const FRAME_DIR = path.join(ROOT, "test-fixtures", "frames")

/** The two catalogues under test. `expectedModes` is an assertion, not a label. */
export const FRAMES = [
	{ frame: "axis-stance", file: "axis-stance.roomodes", expectedModes: 45 },
	{ frame: "artefact", file: "artefact.roomodes", expectedModes: 47 },
]

/**
 * The five declared personas (Amendment 5, item 3). Each is a framing
 * CONDITION, not a demographic: the directive is the only text that varies
 * between personas, so a persona effect is a directive effect and nothing more.
 */
export const PERSONAS = [
	{
		id: "P1",
		condition: "goal-only explorer",
		directive: "You are exploring. Say what you want to achieve, not what you want handed back.",
	},
	{
		id: "P2",
		condition: "artefact-only deliverer",
		directive: "You are commissioning work. Name the deliverable you want in your hand, not the goal behind it.",
	},
	{
		id: "P3",
		condition: "terse one-liner",
		directive: "You write one short line and nothing else.",
	},
	{
		id: "P4",
		condition: "verbose context dump",
		directive: "You describe the surrounding situation at length before you say anything else.",
	},
	{
		id: "P5",
		condition: "imprecise vocabulary / non-native phrasing",
		directive: "You use approximate, everyday words: you do not know this project's technical vocabulary.",
	},
]

/**
 * Identical across every persona and every run, so that help-seeking and the
 * choice itself are measured against one instruction rather than five.
 */
export const STANDING_REQUEST = [
	"Pick exactly one mode from the list below for the request that follows.",
	"If you cannot tell which mode fits, say what information you need instead of guessing.",
].join(" ")

/**
 * The briefs are the pre-registration's §3.1 texts, reused VERBATIM. They are
 * not rewritten for this instrument: inventing new briefs would make the pretest
 * a different experiment from the registered one. Provenance is `CONSTRUCTED`,
 * which §3.1 already discloses.
 */
export const BRIEFS = [
	{
		id: "B1",
		text: "CI is red on a test that passes locally. I have no idea why.",
		provenance: "CONSTRUCTED — pre-registration §3.1",
	},
	{
		id: "B2",
		text: "Make this endpoint 3× faster.",
		provenance: "CONSTRUCTED — pre-registration §3.1",
	},
	{
		id: "B3",
		text: "Explain why this module is structured the way it is.",
		provenance: "CONSTRUCTED — pre-registration §3.1",
	},
]

/**
 * The one brief Amendment 2 replaces, carried as a frozen string.
 *
 * WHY IT IS HERE AND NOT ONLY IN arms.json
 *   Objection 21 found `B3P` accepted unvalidated by the plan loader, so nothing
 *   stopped A4's brief drifting away from the registration. Amending the
 *   registration (§A2.4) does not fix that unless the string is a constant the
 *   loader checks against. A4's text is therefore registered here, verbatim, and
 *   a plan that carries any other text for `B3P` is refused.
 */
export const REGISTERED_B3P = {
	id: "B3P",
	text: "Set out the reasons this module is arranged as it is.",
	provenance: "REGISTERED — pre-registration Amendment 2 §A2.4 (A4's replacement brief)",
}

export function sha256(text) {
	return crypto.createHash("sha256").update(text, "utf8").digest("hex")
}

function unquote(value) {
	const text = value.trim()
	if (text.length >= 2 && text.startsWith('"') && text.endsWith('"')) {
		try {
			return JSON.parse(text)
		} catch {
			throw new Error(`unparseable double-quoted scalar: ${text.slice(0, 60)}…`)
		}
	}
	if (text.length >= 2 && text.startsWith("'") && text.endsWith("'")) {
		return text.slice(1, -1).replace(/''/g, "'")
	}
	return text
}

/**
 * Parse one `.roomodes` fixture into `{ slug, name, whenToUse }` entries.
 *
 * The fixtures are emitted by `yaml.stringify({ customModes }, { lineWidth: 0 })`,
 * so the shape is uniform: `  - slug: <s>` starts an entry, `    <key>: <scalar>`
 * sets a key, `      - <scalar>` is a `groups` list item. Anything else is
 * rejected loudly rather than skipped: a partial parse must never emit prompts.
 */
export function parseRoomodes(text, frameName) {
	const lines = text.split(/\r?\n/)
	const entries = []
	let current = null
	let inGroups = false

	for (const line of lines) {
		if (line.trim() === "" || line === "customModes:") continue

		const start = /^ {2}- slug: (.*)$/.exec(line)
		if (start) {
			current = { slug: unquote(start[1]) }
			entries.push(current)
			inGroups = false
			continue
		}

		const key = /^ {4}([A-Za-z]+):(?: (.*))?$/.exec(line)
		if (key && current) {
			const [, name, raw] = key
			inGroups = name === "groups"
			if (name === "slug" || name === "name" || name === "whenToUse") {
				current[name] = raw === undefined ? "" : unquote(raw)
			}
			continue
		}

		if (/^ {6}- /.test(line) && inGroups) continue

		throw new Error(`${frameName}: unparsed line ${JSON.stringify(line.slice(0, 80))}`)
	}

	for (const entry of entries) {
		if (!entry.slug || !/^[a-z0-9][a-z0-9-]*$/.test(entry.slug)) {
			throw new Error(`${frameName}: bad slug ${JSON.stringify(entry.slug)}`)
		}
		for (const field of ["name", "whenToUse"]) {
			if (!entry[field] || entry[field].trim() === "") {
				throw new Error(`${frameName}/${entry.slug}: missing ${field}`)
			}
		}
	}

	return entries
}

/**
 * The two catalogues share no slug. That is what lets the audit treat "a slug
 * that belongs to the other catalogue" as a disclosure rather than as noise.
 */
function assertDisjointSlugs(catalogues) {
	const seen = new Map()
	for (const { frame, modes } of catalogues.values()) {
		for (const mode of modes) {
			if (seen.has(mode.slug)) {
				throw new Error(`slug ${mode.slug} appears in both ${seen.get(mode.slug)} and ${frame}`)
			}
			seen.set(mode.slug, frame)
		}
	}
}

/** Load both fixtures and assert each yielded its expected mode count. */
export async function loadCatalogues(dir = FRAME_DIR) {
	const catalogues = new Map()

	for (const spec of FRAMES) {
		const filePath = path.join(dir, spec.file)
		const modes = parseRoomodes(await fs.readFile(filePath, "utf-8"), spec.frame)

		if (modes.length !== spec.expectedModes) {
			throw new Error(
				`${spec.frame}: parsed ${modes.length} modes, expected ${spec.expectedModes}. ` +
					`Fix the parser or regenerate the fixture — never hand-edit a fixture to match.`,
			)
		}

		catalogues.set(spec.frame, { frame: spec.frame, file: filePath, modes })
	}

	assertDisjointSlugs(catalogues)
	return catalogues
}

/**
 * The picker line shape: the three visible fields and nothing else.
 *
 * `pickerLine` is exported because the echo detector must test the SAME string
 * the rubric names. Objection 16: the harness looked for the bulleted line while
 * the rubric defined echo as "a whole slug — Name — routing line", so the two
 * measured different quantities. One renderer, used by both, closes that.
 */
export function pickerLine(mode) {
	return `- ${mode.slug} — ${mode.name} — ${mode.whenToUse}`
}

export function pickerTextFor(modes) {
	return modes.map(pickerLine).join("\n") + "\n"
}

/**
 * Label the catalogues by a deterministic sort on `sha256(frame + seed)`. Ties
 * (which a 64-hex collision would have to cause) fall back to the frame name so
 * the order is total.
 *
 * The prefix is a parameter because E12 has eight pickers under test rather than
 * two catalogues: labelling eight fixtures "CATALOGUE-1..8" would imply a
 * two-catalogue design it does not have. The default preserves E11's labels
 * byte-for-byte.
 */
export function assignLabels(seed, catalogues, prefix = "CATALOGUE-") {
	return [...catalogues.values()]
		.map((catalogue) => ({ ...catalogue, hash: sha256(`${catalogue.frame}${seed}`) }))
		.sort((a, b) => (a.hash < b.hash ? -1 : a.hash > b.hash ? 1 : a.frame.localeCompare(b.frame)))
		.map((catalogue, index) => ({ ...catalogue, label: `${prefix}${index + 1}` }))
}

/** Build one prompt: persona directive, standing request, brief, picker. */
export function buildPrompt(persona, brief, pickerText) {
	const header = [persona.directive, "", STANDING_REQUEST, "", brief.text].join("\n") + "\n"
	return { header, picker: pickerText, text: header + "\n" + pickerText }
}

/**
 * The fixed run order: 5 personas × 3 briefs × 2 catalogues.
 *
 * The two catalogues alternate first position so that drift or fatigue does not
 * sit permanently on one label. Deterministic, so the plan is reproducible and a
 * re-run cannot silently reorder the material.
 */
export function planRuns(labelled) {
	const runs = []
	let slot = 0
	for (const persona of PERSONAS) {
		for (const brief of BRIEFS) {
			const order = slot % 2 === 0 ? labelled : [...labelled].reverse()
			slot++
			for (const catalogue of order) {
				runs.push({ runId: `run-${String(runs.length + 1).padStart(2, "0")}`, persona, brief, catalogue })
			}
		}
	}
	return runs
}
