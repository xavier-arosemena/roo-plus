/**
 * routing-round.mjs — the pure half of the routing closing round (E13-R, Stage 1).
 *
 * WHAT THIS FILE IS
 *   The whole instrument as functions over strings and numbers: derive the six
 *   pickers from one base fixture, prove they differ only in the target entry,
 *   build the 600-run round-robin plan, decide abstention mechanically, compute
 *   the per-cell statistics and the two co-primary interactions, and fabricate
 *   clearly-marked synthetic run data so the report can be exercised without a
 *   model call. The two CLI files stay thin.
 *
 * THE SIX CELLS (registration §A1.2, as amended by §A2.2 and §A2.3)
 *   One base picker — `test-fixtures/frames/axis-stance.roomodes`, 45 entries —
 *   with only the target entry rewritten. C1/C2/C3/C4 sit on the ambiguous brief
 *   as a 2×2 (verb|noun × IN|DC). C5/C6 sit on the unambiguous brief as a
 *   single-field manipulation: C6 uses `debug`'s routing line VERBATIM and
 *   changes only slug and name. That last rule is the independent red team's
 *   objection 3, and `buildFixtureSet` asserts it rather than trusting a comment.
 *
 * WHY THE DERIVATION IS ASSERTED RATHER THAN DESCRIBED
 *   A picker that quietly changed a neighbour line would make a cell difference
 *   unattributable. Every derived file is therefore diffed against the base by
 *   line, and the exact set of changed lines must equal the set the cell's own
 *   specification implies. `description` and `roleDefinition` are left as the
 *   base bytes on purpose: they are never rendered into a prompt (the picker
 *   projection is a three-field whitelist), so changing them would add untested
 *   differences to the material for no experimental gain.
 *
 * WHAT IS DELIBERATELY NOT HERE
 *   No network, no provider protocol, no key, no `.env`, no dependency. The
 *   report never calls a model; the only fabricated data is stamped
 *   `"synthetic": true` on every record and in `SYNTHETIC-DATA.md`.
 *
 * No dependencies. Node 22 ESM.
 */

import * as fs from "node:fs/promises"
import * as path from "node:path"

import { extractDeclaredMode } from "./b3-sequence.mjs"
import {
	BRIEFS,
	FRAME_DIR,
	PERSONAS,
	assignLabels,
	buildPrompt,
	parseRoomodes,
	pickerTextFor,
	sha256,
} from "./framing-pretest.mjs"

export const ROUTING_ROUND_DIR = path.join(FRAME_DIR, "routing-round")
export const AXIS_FIXTURE_PATH = path.join(FRAME_DIR, "axis-stance.roomodes")
export const ARTEFACT_FIXTURE_PATH = path.join(FRAME_DIR, "artefact.roomodes")

/** Fixed so a repeated dry-run is byte-identical. A real sweep should pass a fresh seed. */
export const DEFAULT_BLIND_SEED = "roo-plus-routing-round-2026-11-12"

export const DRAWS_PER_CELL = 100
export const CLUSTER_RUN_LIMIT = 5

/**
 * The registered refusal threshold (§A2.5 row 10). A cell whose exclusions exceed
 * 5% of its draws voids the comparison; at or below it the cell is reported with
 * its own denominator and flagged. It is a constant rather than a flag because the
 * design is frozen: an operator must not be able to widen it after seeing data.
 */
export const MAX_EXCLUSION_RATE = 0.05

/**
 * The version of the mechanical response parser (`extractDeclaredMode` plus this
 * file's abstention rule). Recorded on every run record, so a future change to the
 * rule cannot be mistaken for a change in the model's behaviour.
 */
export const PARSER_VERSION = "routing-round-parser/1"

/**
 * The pinned v2 declaration contract (E20 §4.2): six reply shapes, the arm's own
 * picker as the only vocabulary, and a residual that is published rather than
 * rounded. It is a separate constant because a run recorded under v1 must never be
 * scored as if v2 had read it.
 */
export const PARSER_VERSION_V2 = "routing-round-parser/2"
export const CLUSTER_DUPLICATE_LIMIT = 0.2
export const DEFAULT_BOOTSTRAP_RESAMPLES = 10000
export const DEFAULT_BOOTSTRAP_SEED = 20261112
export const TEMPERATURE = 0

/** The two routing lines, byte-for-byte as registration §A1.2/A2.3 states them. */
export const LINE_IN =
	"Use when someone asks why code behaves as it does and the answer must cite evidence, not recall."
export const LINE_DC = "Use when someone asks why code behaves as it does and evidence must be cited."

export const AMBIGUOUS_BRIEF_ID = "B3"
export const UNAMBIGUOUS_BRIEF_ID = "B1"

/**
 * The six cells. `target` names the base entry that is rewritten; `line: null`
 * means "keep the target entry's own routing line verbatim" (C5), which for C6
 * is also `debug`'s line, never the artefact fixture's.
 *
 * `factor` records the 2×2 coordinates. It is null for the control pair, which
 * is not part of the ambiguous factorial.
 */
export const CELLS = [
	{
		cell: "C1",
		briefId: AMBIGUOUS_BRIEF_ID,
		target: "explain",
		slug: "explain",
		name: "Explain",
		line: LINE_IN,
		expectedOwner: "explain",
		factor: { register: "verb", mood: "IN" },
	},
	{
		cell: "C2",
		briefId: AMBIGUOUS_BRIEF_ID,
		target: "explain",
		slug: "explanation",
		name: "Explanation",
		line: LINE_IN,
		expectedOwner: "explanation",
		factor: { register: "noun", mood: "IN" },
	},
	{
		cell: "C3",
		briefId: AMBIGUOUS_BRIEF_ID,
		target: "explain",
		slug: "explain",
		name: "Explain",
		line: LINE_DC,
		expectedOwner: "explain",
		factor: { register: "verb", mood: "DC" },
	},
	{
		cell: "C4",
		briefId: AMBIGUOUS_BRIEF_ID,
		target: "explain",
		slug: "explanation",
		name: "Explanation",
		line: LINE_DC,
		expectedOwner: "explanation",
		factor: { register: "noun", mood: "DC" },
	},
	{
		cell: "C5",
		briefId: UNAMBIGUOUS_BRIEF_ID,
		target: "debug",
		slug: "debug",
		name: "Debug",
		line: null,
		expectedOwner: "debug",
		factor: null,
	},
	{
		cell: "C6",
		briefId: UNAMBIGUOUS_BRIEF_ID,
		target: "debug",
		slug: "bug-report",
		name: "Bug Report",
		line: null,
		expectedOwner: "bug-report",
		factor: null,
	},
]

export const CELL_IDS = CELLS.map((spec) => spec.cell)

/** Literals only doctrine or grants could contribute. Zero of each is asserted. */
const FORBIDDEN_PROMPT_STRINGS = ["roleDefinition", "customInstructions", "groups:"]

/** The goal-only explorer directive, taken from the frozen constant, never retyped. */
export function fixedPersona() {
	const persona = PERSONAS.find((candidate) => candidate.condition === "goal-only explorer")
	if (!persona) throw new Error("PERSONAS has no goal-only explorer directive; the round cannot be built")
	if (typeof persona.directive !== "string" || persona.directive.trim() === "") {
		throw new Error("the goal-only explorer directive is empty")
	}
	return persona
}

function briefById(id) {
	const brief = BRIEFS.find((candidate) => candidate.id === id)
	if (!brief) throw new Error(`brief ${id} is not a frozen BRIEFS entry`)
	return brief
}

function splitLines(text) {
	return text.split("\n")
}

/** Zero-based [start, end) of the block whose slug line is `  - slug: <slug>`. */
export function blockRange(lines, slug) {
	const start = lines.findIndex((line) => line === `  - slug: ${slug}`)
	if (start < 0) throw new Error(`base fixture has no entry with slug ${JSON.stringify(slug)}`)
	let end = lines.length
	for (let index = start + 1; index < lines.length; index++) {
		if (/^ {2}- slug: /.test(lines[index])) {
			end = index
			break
		}
	}
	return { start, end }
}

function keyLineIndex(lines, start, end, key) {
	for (let index = start + 1; index < end; index++) {
		if (lines[index].startsWith(`    ${key}: `) || lines[index] === `    ${key}:`) return index
	}
	throw new Error(`entry at line ${start + 1} has no ${key} field`)
}

/**
 * Rewrite one target entry and leave every other byte alone.
 *
 * `spec.line === null` keeps the entry's own routing line, quoting included, so
 * C5 and C6 carry exactly the fixture's bytes rather than a re-rendered line.
 */
export function derivePickerText(baseText, spec) {
	const lines = splitLines(baseText)
	const { start, end } = blockRange(lines, spec.target)
	const derived = [...lines]

	const slugIndex = start
	const nameIndex = keyLineIndex(lines, start, end, "name")
	const whenIndex = keyLineIndex(lines, start, end, "whenToUse")

	derived[slugIndex] = `  - slug: ${spec.slug}`
	derived[nameIndex] = `    name: ${spec.name}`
	if (spec.line !== null) derived[whenIndex] = `    whenToUse: ${spec.line}`

	return {
		text: derived.join("\n"),
		lineNumbers: { slug: slugIndex + 1, name: nameIndex + 1, whenToUse: whenIndex + 1 },
	}
}

/** One-based line numbers that differ between two same-length texts. */
export function differingLineNumbers(before, after) {
	const a = splitLines(before)
	const b = splitLines(after)
	if (a.length !== b.length) {
		throw new Error(`texts are not line-for-line comparable (${a.length} vs ${b.length} lines)`)
	}
	const changed = []
	for (let index = 0; index < a.length; index++) {
		if (a[index] !== b[index]) changed.push(index + 1)
	}
	return changed
}

function assertNoDoctrine(prompt, where) {
	for (const literal of FORBIDDEN_PROMPT_STRINGS) {
		if (prompt.includes(literal)) throw new Error(`${where}: doctrine literal ${JSON.stringify(literal)} in prompt`)
	}
}

/**
 * Derive all six pickers, assert the single-entry manipulation, and build the
 * six prompts. Throws on any violation; the caller may not run material that
 * failed here.
 */
export function buildFixtureSet({ baseText, artefactText }) {
	const persona = fixedPersona()
	const baseModes = parseRoomodes(baseText, "axis-stance.roomodes")
	if (baseModes.length !== 45) throw new Error(`base picker parsed ${baseModes.length} entries, expected 45`)

	const artefactModes = parseRoomodes(artefactText, "artefact.roomodes")
	const artefactBugReport = artefactModes.find((mode) => mode.slug === "bug-report")
	if (!artefactBugReport) throw new Error("artefact fixture has no bug-report entry")

	const baseLines = splitLines(baseText)
	const baseBySlug = new Map(baseModes.map((mode, index) => [mode.slug, { mode, index }]))
	const debugBase = baseBySlug.get("debug")
	if (!debugBase) throw new Error("base picker has no debug entry")

	const cells = CELLS.map((spec) => {
		const brief = briefById(spec.briefId)
		const derived = derivePickerText(baseText, spec)

		// The target entry's expected values, before parsing.
		const targetIndex = baseBySlug.get(spec.target)?.index
		if (targetIndex === undefined) throw new Error(`${spec.cell}: base picker has no ${spec.target} entry`)
		const baseTarget = baseModes[targetIndex]
		const expectedWhenToUse = spec.line === null ? baseTarget.whenToUse : spec.line

		const modes = parseRoomodes(derived.text, `${spec.cell}.roomodes`)
		if (modes.length !== baseModes.length) {
			throw new Error(`${spec.cell}: derived ${modes.length} entries, expected ${baseModes.length}`)
		}

		// Slug order is preserved; only the target entry may move.
		const slugsBefore = baseModes.map((mode) => mode.slug)
		const slugsAfter = modes.map((mode) => mode.slug)
		for (let index = 0; index < slugsAfter.length; index++) {
			if (index === targetIndex) continue
			if (slugsBefore[index] !== slugsAfter[index]) {
				throw new Error(
					`${spec.cell}: entry ${index + 1} changed from ${slugsBefore[index]} to ${slugsAfter[index]}`,
				)
			}
		}
		// A duplicated slug would make the picker ambiguous in a way no cell declares.
		if (slugsAfter.filter((slug) => slug === spec.slug).length !== 1) {
			throw new Error(`${spec.cell}: slug ${spec.slug} is not unique in the derived picker`)
		}

		const entry = modes[targetIndex]
		if (entry.slug !== spec.slug) throw new Error(`${spec.cell}: slug is ${entry.slug}, expected ${spec.slug}`)
		if (entry.name !== spec.name) throw new Error(`${spec.cell}: name is ${entry.name}, expected ${spec.name}`)
		if (entry.whenToUse !== expectedWhenToUse) {
			throw new Error(
				`${spec.cell}: whenToUse is ${JSON.stringify(entry.whenToUse)}, expected ${JSON.stringify(expectedWhenToUse)}`,
			)
		}

		// The exact set of changed lines must be the set this cell's spec implies.
		const expectedChanged = []
		if (spec.slug !== baseTarget.slug) expectedChanged.push(derived.lineNumbers.slug)
		if (spec.name !== baseTarget.name) expectedChanged.push(derived.lineNumbers.name)
		if (spec.line !== null && spec.line !== baseTarget.whenToUse)
			expectedChanged.push(derived.lineNumbers.whenToUse)
		const changedLines = differingLineNumbers(baseText, derived.text)
		if (JSON.stringify(changedLines) !== JSON.stringify(expectedChanged)) {
			throw new Error(
				`${spec.cell}: changed lines ${JSON.stringify(changedLines)} but the spec implies ${JSON.stringify(expectedChanged)}`,
			)
		}

		const picker = pickerTextFor(modes)
		const prompt = buildPrompt(persona, brief, picker)
		if (!prompt.text.includes(picker)) throw new Error(`${spec.cell}: prompt does not carry its picker`)
		if (prompt.text.split(picker).length !== 2) throw new Error(`${spec.cell}: picker does not appear exactly once`)
		assertNoDoctrine(prompt.text, spec.cell)

		return {
			spec,
			brief,
			persona,
			text: derived.text,
			modes,
			picker,
			prompt: prompt.text,
			changedLines,
			targetIndex,
		}
	})

	// C1 and C5 render the base entry unchanged, so their files are the base bytes.
	for (const cell of cells) {
		if (cell.changedLines.length === 0 && cell.text !== baseText) {
			throw new Error(`${cell.spec.cell}: no field changed but the bytes moved`)
		}
	}

	// Objection 3, asserted: C6's routing line is debug's, verbatim, and not the
	// artefact fixture's bug-report line.
	const c6 = cells.find((cell) => cell.spec.cell === "C6")
	const c5 = cells.find((cell) => cell.spec.cell === "C5")
	if (!c6 || !c5) throw new Error("C5 and C6 must exist")
	const debugWhenToUse = debugBase.mode.whenToUse
	if (c5.modes[c5.targetIndex].whenToUse !== debugWhenToUse)
		throw new Error("C5 does not carry debug's line verbatim")
	if (c6.modes[c6.targetIndex].whenToUse !== debugWhenToUse) {
		throw new Error(
			`C6's routing line is ${JSON.stringify(c6.modes[c6.targetIndex].whenToUse)} but debug's is ${JSON.stringify(debugWhenToUse)}`,
		)
	}
	if (c6.modes[c6.targetIndex].whenToUse === artefactBugReport.whenToUse) {
		throw new Error("C6 copied the artefact fixture's bug-report line: that is the rejected design")
	}

	// Six unique prompts.
	const hashes = new Set(cells.map((cell) => sha256(cell.prompt)))
	if (hashes.size !== cells.length) throw new Error(`the six prompts are not unique (${hashes.size} distinct)`)

	return { baseText, baseModes, persona, cells }
}

/**
 * Zero-based index of the first picker line inside a prompt. The slice leaves
 * the blank separator line behind, so the index is one less than the line count.
 */
export function pickerOffset(prompt, picker) {
	const header = prompt.slice(0, prompt.length - picker.length)
	return splitLines(header).length - 1
}

/**
 * Pairwise proof that two cells' prompts differ only in the brief line and in
 * the target entry's own lines. Returns one row per pair for printing.
 */
export function analysePromptPairs(cells) {
	const rows = []
	for (let left = 0; left < cells.length; left++) {
		for (let right = left + 1; right < cells.length; right++) {
			const a = cells[left]
			const b = cells[right]
			const offsetA = pickerOffset(a.prompt, a.picker)
			const offsetB = pickerOffset(b.prompt, b.picker)
			if (offsetA !== offsetB)
				throw new Error(`${a.spec.cell}/${b.spec.cell}: prompts differ in header line count`)

			const changed = differingLineNumbers(a.prompt, b.prompt)
			const briefLine = splitLines(a.prompt).indexOf(a.brief.text) + 1
			if (briefLine < 1) throw new Error(`${a.spec.cell}: brief text is not a prompt line`)

			const allowed = new Set()
			if (a.brief.text !== b.brief.text) allowed.add(briefLine)

			const aPicker = splitLines(a.picker)
			const bPicker = splitLines(b.picker)
			const pickerChanged = differingLineNumbers(a.picker, b.picker)
			for (const pickerLine of pickerChanged) allowed.add(offsetA + pickerLine)

			const unexpected = changed.filter((line) => !allowed.has(line))
			if (unexpected.length > 0) {
				throw new Error(
					`${a.spec.cell}/${b.spec.cell}: prompts differ at line(s) ${unexpected.join(", ")} outside the brief and the target entry`,
				)
			}

			const zones = changed.map((line) =>
				line === briefLine && a.brief.text !== b.brief.text ? "brief" : "target-entry",
			)
			rows.push({ left: a.spec.cell, right: b.spec.cell, changed, zones })
		}
	}
	return rows
}

/**
 * Draw-major round-robin: draw 1 of every cell, then draw 2 of every cell, and
 * so on. No cell ever runs in a block, and no two consecutive runs share a cell.
 */
export function buildRuns({ fixtureSet, labelsByCell }) {
	const byCell = new Map(fixtureSet.cells.map((cell) => [cell.spec.cell, cell]))
	const runs = []

	for (let draw = 1; draw <= DRAWS_PER_CELL; draw++) {
		for (const spec of CELLS) {
			const cell = byCell.get(spec.cell)
			const label = labelsByCell.get(spec.cell)
			if (!cell) throw new Error(`no fixture for ${spec.cell}`)
			if (!label) throw new Error(`no blind label for ${spec.cell}`)
			const runId = `${label}-d${String(draw).padStart(3, "0")}`
			runs.push({
				index: runs.length + 1,
				runId,
				label,
				cell: spec.cell,
				draw,
				briefId: spec.briefId,
				persona: cell.persona.id,
				text: cell.prompt,
				promptSha256: sha256(cell.prompt),
				promptBytes: Buffer.byteLength(cell.prompt, "utf8"),
			})
		}
	}

	assertRoundRobin(runs)
	return runs
}

/**
 * Fails unless the executed calls are strictly interleaved: over records sorted
 * by `startedAt`, every consecutive pair has a different label, and no two calls
 * overlap in time (maximum concurrency 1). The closing round measured 600 calls,
 * 599 transitions, longest same-label block 1 and concurrency 1 (log §16.1); this
 * turns that measurement into a regression test the executor runs before it
 * writes results, so a batch that drifts to blocked execution fails loudly.
 *
 * `labelOf` is the caller's accessor (records may carry the label anywhere); it
 * is a function so this file never assumes a record schema it does not own.
 */
export function assertInterleaved(records, labelOf) {
	if (!Array.isArray(records)) throw new Error("assertInterleaved: records must be an array")
	if (typeof labelOf !== "function") throw new Error("assertInterleaved: labelOf must be a function")
	if (records.length === 0) throw new Error("assertInterleaved: no records to check")

	const timestamp = (record, field) => {
		const value = Date.parse(record?.[field])
		if (!Number.isFinite(value)) {
			throw new Error(`assertInterleaved: ${JSON.stringify(record?.runId ?? "record")} has no parseable ${field}`)
		}
		return value
	}

	const ordered = records
		.map((record) => ({
			record,
			started: timestamp(record, "startedAt"),
			ended: timestamp(record, "endedAt"),
		}))
		.sort((left, right) => left.started - right.started)

	const describe = (entry) =>
		`${JSON.stringify(entry.record?.runId ?? "record")} [${entry.record.startedAt} → ${entry.record.endedAt}]`

	let transitions = 0
	for (let index = 1; index < ordered.length; index++) {
		const previous = ordered[index - 1]
		const current = ordered[index]
		if (current.ended < current.started) {
			throw new Error(`assertInterleaved: ${describe(current)} ends before it starts`)
		}
		if (current.started < previous.ended) {
			throw new Error(
				`assertInterleaved: ${describe(current)} starts before ${describe(previous)} ends: ` +
					"calls overlap, so maximum concurrency exceeds 1",
			)
		}
		if (labelOf(current.record) !== labelOf(previous.record)) transitions++
	}

	const expected = ordered.length - 1
	if (transitions !== expected) {
		throw new Error(
			`assertInterleaved: ${transitions} transitions across ${ordered.length} calls, expected ${expected}: ` +
				"adjacent calls repeat a label, so the round is blocked rather than interleaved",
		)
	}
	return { calls: ordered.length, transitions, expected, maxConcurrency: 1 }
}

/** Fails unless the plan is draw-major and no adjacent pair shares a cell. */
export function assertRoundRobin(runs) {
	if (runs.length !== CELLS.length * DRAWS_PER_CELL) {
		throw new Error(`plan has ${runs.length} runs, expected ${CELLS.length * DRAWS_PER_CELL}`)
	}
	for (let index = 0; index < runs.length; index++) {
		const expectedDraw = Math.floor(index / CELLS.length) + 1
		if (runs[index].draw !== expectedDraw) {
			throw new Error(
				`run ${index + 1} is draw ${runs[index].draw}, expected ${expectedDraw}: the plan is not draw-major`,
			)
		}
	}
	for (let index = 1; index < runs.length; index++) {
		if (runs[index].label === runs[index - 1].label) {
			throw new Error(`runs ${index} and ${index + 1} share a cell: the plan is blocked`)
		}
	}
	const perLabel = new Map()
	for (const run of runs) perLabel.set(run.label, (perLabel.get(run.label) ?? 0) + 1)
	for (const [label, count] of perLabel) {
		if (count !== DRAWS_PER_CELL) throw new Error(`${label} has ${count} runs, expected ${DRAWS_PER_CELL}`)
	}
	return true
}

/** The plan entry that is written to `plan.json`: labels only, never a cell name. */
export function planEntry(run) {
	return {
		index: run.index,
		runId: run.runId,
		label: run.label,
		draw: run.draw,
		briefId: run.briefId,
		persona: run.persona,
		prompt: `prompts/${run.runId}.txt`,
		promptSha256: run.promptSha256,
		promptBytes: run.promptBytes,
	}
}

/** Deterministic labels: ascending sha256(cell + seed), exactly as E11/E12 label. */
export function labelCells(seed) {
	const catalogues = new Map(
		CELLS.map((spec) => [
			spec.cell,
			{ frame: spec.cell, file: path.join(ROUTING_ROUND_DIR, `${spec.cell}.roomodes`), modes: [] },
		]),
	)
	const labelled = assignLabels(seed, catalogues, "CELL-")
	return new Map(labelled.map((catalogue) => [catalogue.frame, catalogue.label]))
}

/**
 * The sealed label → cell map. No prompt, plan or bundle may carry it: the plan
 * names labels only, so this file is the single place the vocabulary of a label
 * is recoverable.
 */
export function buildLabelMap({ seed, labelsByCell }) {
	return {
		sealed: true,
		warning: "SEALED — maps blind labels to the six cells. No scorer bundle may contain this file.",
		blindSeed: seed,
		algorithm: "labels assigned by ascending sha256(cell + blindSeed)",
		labels: CELLS.map((spec) => ({ label: labelsByCell.get(spec.cell), cell: spec.cell })),
	}
}

/**
 * The run plan. Labels only: no cell name appears here, so a scorer holding the
 * plan cannot tell which vocabulary it is scoring.
 */
export function buildPlanDocument({ runs, seed }) {
	const persona = fixedPersona()
	return {
		instrument: "routing closing round (E13-R) — Stage 1",
		registration: "docs/reviews/2026-11-12-routing-closing-round-preregistration.md",
		amendment: "Amendment 2 — §A2.1–§A2.5",
		design: `${CELLS.length} cells × ${DRAWS_PER_CELL} draws = ${CELLS.length * DRAWS_PER_CELL} runs, round-robin by draw index`,
		drawsPerCell: DRAWS_PER_CELL,
		temperature: TEMPERATURE,
		provider: null,
		model: null,
		blindSeed: seed,
		persona: { id: persona.id, condition: persona.condition, directive: persona.directive },
		briefs: [...new Set(CELLS.map((spec) => spec.briefId))].map((id) => {
			const brief = briefById(id)
			return { id: brief.id, text: brief.text, sha256: sha256(brief.text) }
		}),
		runs: runs.map(planEntry),
	}
}

/** The sealed analysis key: per label, the expected owner and that picker's slugs. */
export function buildAnswerKey({ fixtureSet, labelsByCell }) {
	return {
		sealed: true,
		warning:
			"SEALED ANALYSIS KEY — maps blind labels to the six cells, their expected owner and their picker slugs. " +
			"No scorer bundle may contain this file.",
		registration: "docs/reviews/2026-11-12-routing-closing-round-preregistration.md",
		amendment: "Amendment 2 — §A2.1–§A2.5",
		cells: CELLS.map((spec) => {
			const cell = fixtureSet.cells.find((candidate) => candidate.spec.cell === spec.cell)
			if (!cell) throw new Error(`no fixture for ${spec.cell}`)
			return {
				cell: spec.cell,
				label: labelsByCell.get(spec.cell),
				slug: spec.slug,
				name: spec.name,
				register: spec.factor?.register ?? null,
				mood: spec.factor?.mood ?? null,
				lineText: cell.modes[cell.targetIndex].whenToUse,
				briefId: spec.briefId,
				expectedOwner: spec.expectedOwner,
				slugs: cell.modes.map((mode) => mode.slug),
			}
		}),
	}
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/**
 * ABSTENTION RULE (one line): a run abstains iff no slug from its own picker
 * occurs in the response as a whole token; a response that names a slug and then
 * asks for more information is a DECLARATION, because this rule never reads the
 * request-for-information, only slug presence.
 *
 * The whole-token match is `extractDeclaredMode` from the E12 key's mechanical
 * definitions (imported, not re-invented), so `explain` does not match inside
 * `explanation` — the D-5 substring slip.
 */
export function isAbstention(text, slugs) {
	return extractDeclaredMode(text, slugs).declared === null
}

/**
 * The v2 declaration extractor (E20 §4.2, pinned as `routing-round-parser/2`).
 *
 * Six reply shapes are recognised, case-insensitively:
 *   1. `**Mode:** `slug``
 *   2. `**Mode:** slug`
 *   3. `Mode: `slug``
 *   4. `Mode: slug` at the start of a line
 *   5. `**Selected Mode:** `slug`` (and the unbackticked form)
 *   6. a bare bold slug on a line of its own, e.g. `**debug**`
 *
 * A token is accepted only when it appears in `slugVocabulary`, which is the
 * arm's own picker: there is no global fallback, so a single-picker vocabulary
 * returns null for a slug it does not carry rather than a wrong one.
 *
 * Two tolerances are typography, not a seventh format:
 *   - the marker and the slug may be split across one line break, because the
 *     closing round wrote `**Mode:**` and the token on the next line;
 *   - the token may be bare, backticked or bold, because the decoration does not
 *     change which mode the reply names.
 *
 * A prose commit with no marker declares nothing, and a slug offered in a
 * candidate list (`(fits `explanation`)`) is not a declaration: both return
 * null and reach hand adjudication instead of being guessed.
 */
const DECLARATION_GAP_V2 = "[ \\t]*(?:\\r?\\n[ \\t]*)?"
const DECLARATION_TOKEN_V2 = "(?:`([A-Za-z0-9-]+)`|\\*\\*([A-Za-z0-9-]+)\\*\\*|([A-Za-z0-9-]+)(?![A-Za-z0-9-]))"

const DECLARATION_PATTERNS_V2 = [
	new RegExp(`\\*\\*Mode:\\*\\*${DECLARATION_GAP_V2}${DECLARATION_TOKEN_V2}`, "gi"),
	new RegExp(`^Mode:${DECLARATION_GAP_V2}${DECLARATION_TOKEN_V2}`, "gim"),
	new RegExp(`\\*\\*Selected Mode:\\*\\*${DECLARATION_GAP_V2}${DECLARATION_TOKEN_V2}`, "gi"),
	/^\*\*([A-Za-z0-9-]+)\*\*[ \t]*$/gim,
]

/** The declared slug in lower case, or null when no accepted shape names one. */
export function extractDeclaredV2(text, slugVocabulary) {
	if (typeof text !== "string" || text.trim() === "") return null
	if (!Array.isArray(slugVocabulary) || slugVocabulary.length === 0) return null
	const vocabulary = new Set(slugVocabulary.map((slug) => String(slug).toLowerCase()))

	const matches = []
	for (const [order, pattern] of DECLARATION_PATTERNS_V2.entries()) {
		// The RegExp objects are module-level and carry `g`: reset before each use.
		pattern.lastIndex = 0
		let match
		while ((match = pattern.exec(text)) !== null) {
			const token = (match[1] ?? match[2] ?? match[3]).toLowerCase()
			if (!vocabulary.has(token)) continue
			matches.push({ index: match.index, order, token })
		}
	}
	if (matches.length === 0) return null
	matches.sort((left, right) => left.index - right.index || left.order - right.order)
	return matches[0].token
}

/**
 * Resolve one reply against several arms' pickers, for the fixture generator:
 * the closing round's six pickers each carried 45 slugs and the union was 47, so
 * a token that is absent from one picker may still be a declaration under
 * another. Returns the first arm (in vocabulary order) that accepts the token.
 * Shared slugs such as `explain` resolve to the first arm; the slug is identical
 * either way, and a caller that needs to know which picker carried it has the
 * arm name.
 */
export function extractDeclaredAcrossArms(text, armVocabularies) {
	const entries =
		armVocabularies instanceof Map
			? [...armVocabularies.entries()]
			: armVocabularies !== null && typeof armVocabularies === "object"
				? Object.entries(armVocabularies)
				: null
	if (entries === null) throw new Error("extractDeclaredAcrossArms: armVocabularies must be a Map or an object")

	for (const [arm, vocabulary] of entries) {
		if (!Array.isArray(vocabulary)) {
			throw new Error(`extractDeclaredAcrossArms: arm ${JSON.stringify(arm)} has no slug vocabulary array`)
		}
		const slug = extractDeclaredV2(text, vocabulary)
		if (slug !== null) return { slug, arm }
	}
	return { slug: null, arm: null }
}

/** `true` for a finish reason that may be scored: only `STOP` or absent. */
export function isInvalidFinishReason(finishReason) {
	return finishReason !== null && finishReason !== undefined && finishReason !== "STOP"
}

/**
 * Decide one record. R-2 is enforced here, not merely recorded: a `RUN` whose
 * `finishReason` is neither `STOP` nor absent is INVALID and leaves the
 * denominator. A `RUN` with no response text is INVALID for the same reason —
 * there is nothing to score and guessing would fabricate a datum.
 */
export function classifyRecord(record, cellKey) {
	const reasons = []
	if (record.status !== "RUN") reasons.push(`status ${record.status}`)
	if (isInvalidFinishReason(record.finishReason)) reasons.push(`finishReason ${record.finishReason}`)
	if (typeof record.response !== "string" || record.response.trim() === "") reasons.push("no response")

	if (reasons.length > 0) {
		return {
			scored: false,
			invalid: true,
			reasons,
			hit: false,
			abstention: false,
			declared: null,
			transcriptSha256: null,
		}
	}

	const extraction = extractDeclaredMode(record.response, cellKey.slugs)
	const declared = extraction.declared
	return {
		scored: true,
		invalid: false,
		reasons: [],
		declared,
		ambiguousSlugs: extraction.ambiguous,
		hit: declared === cellKey.expectedOwner,
		abstention: declared === null,
		transcriptSha256: record.transcriptSha256 ?? sha256(record.response),
	}
}

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

export const Z_95 = 1.959963984540054

/** Wilson score interval for a binomial proportion. Returns null for n = 0. */
export function wilsonInterval(successes, n, z = Z_95) {
	if (!Number.isInteger(n) || n <= 0) return null
	const p = successes / n
	const denominator = 1 + (z * z) / n
	const centre = (p + (z * z) / (2 * n)) / denominator
	const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denominator
	return { p, lower: Math.max(0, centre - half), upper: Math.min(1, centre + half) }
}

/** Longest run of one repeated value. */
export function longestRun(sequence) {
	if (sequence.length === 0) return 0
	let best = 1
	let current = 1
	for (let index = 1; index < sequence.length; index++) {
		current = sequence[index] === sequence[index - 1] ? current + 1 : 1
		if (current > best) best = current
	}
	return best
}

/**
 * Wald–Wolfowitz runs test on a binary sequence (1 = the outcome of interest,
 * 0 = its complement), under the normal approximation with the sample-variance
 * correction:
 *
 *   mu  = 2·n1·n0 / n + 1
 *   var = 2·n1·n0·(2·n1·n0 − n) / (n·n·(n − 1))
 *
 * Returns { runs, expected, z }, or null when the sequence carries no variation
 * (every value identical, fewer than two draws, or a variance of zero). Null is
 * the honest answer there: there is no dependence to test and no z to print.
 *
 * Sign convention: z = (runs − expected) / sd. Fewer runs than chance (negative
 * z) means the outcome clumps; more runs (positive z) means it alternates more
 * than independent draws would. |z| < 1.96 is indistinguishable from independence.
 */
export function outcomeRunsTest(sequence) {
	if (!Array.isArray(sequence)) throw new Error("outcomeRunsTest: sequence must be an array")
	if (sequence.length < 2) return null
	const values = sequence.map((value) => (value ? 1 : 0))
	const n1 = values.reduce((sum, value) => sum + value, 0)
	const n0 = values.length - n1
	if (n1 === 0 || n0 === 0) return null

	let runs = 1
	for (let index = 1; index < values.length; index++) {
		if (values[index] !== values[index - 1]) runs++
	}
	const n = n1 + n0
	const expected = (2 * n1 * n0) / n + 1
	const variance = (2 * n1 * n0 * (2 * n1 * n0 - n)) / (n * n * (n - 1))
	if (!(variance > 0)) return null
	return { runs, expected, z: (runs - expected) / Math.sqrt(variance) }
}

/**
 * Duplicate rate is the share of scored draws whose transcript hash already
 * appeared earlier in the same cell: (n − distinct) / n.
 */
export function transcriptStats(hashes) {
	const total = hashes.length
	const distinct = new Set(hashes).size
	return {
		total,
		distinct,
		duplicateRate: total === 0 ? 0 : (total - distinct) / total,
		longestRun: longestRun(hashes),
	}
}

/** Small, seedable PRNG. Deterministic output is the point. */
export function mulberry32(seed) {
	let state = seed >>> 0
	return function next() {
		state = (state + 0x6d2b79f5) >>> 0
		let t = state
		t = Math.imul(t ^ (t >>> 15), t | 1)
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

function mean(values) {
	return values.reduce((sum, value) => sum + value, 0) / values.length
}

function resampleMean(values, rng) {
	let sum = 0
	for (let index = 0; index < values.length; index++) {
		sum += values[Math.floor(rng() * values.length)]
	}
	return sum / values.length
}

/**
 * (C2 − C1) − (C6 − C5) as a percentile bootstrap over draws within cells.
 * 10,000 resamples by default; the seed is recorded so the interval is
 * reproducible.
 */
export function bootstrapInteraction(
	vectors,
	{ resamples = DEFAULT_BOOTSTRAP_RESAMPLES, seed = DEFAULT_BOOTSTRAP_SEED } = {},
) {
	if (!Number.isInteger(resamples) || resamples < 1) throw new Error("resamples must be an integer >= 1")
	const rng = mulberry32(seed)
	const estimate = mean(vectors.C2) - mean(vectors.C1) - (mean(vectors.C6) - mean(vectors.C5))

	const draws = new Array(resamples)
	for (let index = 0; index < resamples; index++) {
		draws[index] =
			resampleMean(vectors.C2, rng) -
			resampleMean(vectors.C1, rng) -
			(resampleMean(vectors.C6, rng) - resampleMean(vectors.C5, rng))
	}
	draws.sort((a, b) => a - b)
	const quantile = (p) => draws[Math.min(draws.length - 1, Math.max(0, Math.floor(p * (draws.length - 1))))]
	return { estimate, lower: quantile(0.025), upper: quantile(0.975), resamples, seed }
}

const LOG_FACTORIAL = (() => {
	const table = [0]
	for (let index = 1; index <= 1024; index++) table.push(table[index - 1] + Math.log(index))
	return table
})()

function logFactorial(n) {
	return LOG_FACTORIAL[n]
}

/**
 * Two-sided Fisher exact test on a 2×2 table given as `[[a, b], [c, d]]`.
 * Used only by Guard 2, where a cell sits at a boundary and the bootstrap
 * interval carries no information.
 */
export function fisherExact(a, b, c, d) {
	const n1 = a + b
	const n2 = c + d
	const col1 = a + c
	const col2 = b + d
	const total = n1 + n2
	const logProbability = (x) => {
		const y = n1 - x
		const z = col1 - x
		const w = n2 - z
		return (
			logFactorial(n1) +
			logFactorial(n2) +
			logFactorial(col1) +
			logFactorial(col2) -
			logFactorial(total) -
			logFactorial(x) -
			logFactorial(y) -
			logFactorial(z) -
			logFactorial(w)
		)
	}
	const minimum = Math.max(0, col1 - n2)
	const maximum = Math.min(n1, col1)
	const observed = logProbability(a)
	let sum = 0
	for (let x = minimum; x <= maximum; x++) {
		const lp = logProbability(x)
		if (lp <= observed + 1e-9) sum += Math.exp(lp)
	}
	return Math.min(1, sum)
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

function validateKey(key) {
	if (!Array.isArray(key?.cells) || key.cells.length !== CELL_IDS.length) {
		throw new Error(`answer key must list exactly ${CELL_IDS.length} cells`)
	}
	const seenCells = new Set()
	const seenLabels = new Set()
	for (const cell of key.cells) {
		if (!CELL_IDS.includes(cell.cell)) throw new Error(`answer key names unknown cell ${cell.cell}`)
		if (seenCells.has(cell.cell)) throw new Error(`answer key repeats cell ${cell.cell}`)
		seenCells.add(cell.cell)
		if (typeof cell.label !== "string" || !/^CELL-\d+$/.test(cell.label)) {
			throw new Error(`answer key cell ${cell.cell} has no blind label`)
		}
		if (seenLabels.has(cell.label)) throw new Error(`answer key repeats label ${cell.label}`)
		seenLabels.add(cell.label)
		if (!Array.isArray(cell.slugs) || cell.slugs.length === 0)
			throw new Error(`answer key cell ${cell.cell} has no slug list`)
		// A key whose owner is not in the picker would silently score 0 forever.
		if (!cell.slugs.includes(cell.expectedOwner)) {
			throw new Error(
				`answer key cell ${cell.cell}: expected owner ${cell.expectedOwner} is not in its own picker`,
			)
		}
	}
	return true
}

function summariseCell(cellKey, records) {
	const ordered = [...records].sort((a, b) => a.draw - b.draw)
	const seenDraws = new Set()
	for (const record of ordered) {
		if (seenDraws.has(record.draw)) {
			throw new Error(
				`${cellKey.label}: draw ${record.draw} appears more than once; a retried call must not double-count`,
			)
		}
		seenDraws.add(record.draw)
	}

	const excludedReasons = {}
	const hits = []
	const abstentions = []
	const hashes = []
	for (const record of ordered) {
		const decision = classifyRecord(record, cellKey)
		if (!decision.scored) {
			for (const reason of decision.reasons) excludedReasons[reason] = (excludedReasons[reason] ?? 0) + 1
			continue
		}
		hits.push(decision.hit ? 1 : 0)
		abstentions.push(decision.abstention ? 1 : 0)
		hashes.push(decision.transcriptSha256)
	}

	const scored = hits.length
	const hitCount = hits.reduce((sum, value) => sum + value, 0)
	const abstentionCount = abstentions.reduce((sum, value) => sum + value, 0)
	const stats = transcriptStats(hashes)
	const clusteredReasons = []
	if (stats.longestRun > CLUSTER_RUN_LIMIT)
		clusteredReasons.push(`longest run ${stats.longestRun} > ${CLUSTER_RUN_LIMIT}`)
	if (stats.duplicateRate > CLUSTER_DUPLICATE_LIMIT) {
		clusteredReasons.push(
			`duplicate rate ${stats.duplicateRate.toFixed(3)} > ${CLUSTER_DUPLICATE_LIMIT.toFixed(2)}`,
		)
	}

	return {
		cell: cellKey.cell,
		label: cellKey.label,
		expectedOwner: cellKey.expectedOwner,
		drawn: ordered.length,
		scored,
		excluded: ordered.length - scored,
		// The share of the cell's draws that left the denominator (§A2.5 row 10).
		// Zero when nothing was drawn, because there is nothing to exclude from.
		exclusionRate: ordered.length === 0 ? 0 : (ordered.length - scored) / ordered.length,
		excludedReasons,
		hits: hitCount,
		abstentions: abstentionCount,
		nonKey: scored - hitCount - abstentionCount,
		hitRate: scored === 0 ? null : hitCount / scored,
		abstentionRate: scored === 0 ? null : abstentionCount / scored,
		// R-5: no interval is emitted for a clustered cell.
		hitInterval: clusteredReasons.length > 0 ? null : wilsonInterval(hitCount, scored),
		abstentionInterval: clusteredReasons.length > 0 ? null : wilsonInterval(abstentionCount, scored),
		longestRun: stats.longestRun,
		duplicateRate: stats.duplicateRate,
		distinctTranscripts: stats.distinct,
		clustered: clusteredReasons.length > 0,
		clusteredReasons,
		// Guard 1 reads transcript text; this reads the outcome sequence Guard 1
		// protects (log §16.3). 1 = the reply declared a mode, 0 = it asked.
		outcomeRunsTest: outcomeRunsTest(abstentions.map((value) => 1 - value)),
		vectors: { hit: hits, abstention: abstentions },
	}
}

function isDegenerate(vector) {
	return vector.length === 0 || vector.every((value) => value === vector[0])
}

function contrast(cells, outcome, { resamples, seed }) {
	const order = ["C1", "C2", "C5", "C6"]
	const vectors = Object.fromEntries(order.map((cell) => [cell, cells[cell].vectors[outcome]]))
	const estimate = mean(vectors.C2) - mean(vectors.C1) - (mean(vectors.C6) - mean(vectors.C5))
	const counts = Object.fromEntries(
		order.map((cell) => [
			cell,
			{ hits: cells[cell][outcome === "hit" ? "hits" : "abstentions"], scored: cells[cell].scored },
		]),
	)

	const clustered = order.filter((cell) => cells[cell].clustered)
	if (clustered.length > 0) {
		return {
			outcome,
			estimable: false,
			reason: "clustered",
			estimate,
			counts,
			clusteredCells: clustered.map((cell) => ({ cell, reasons: cells[cell].clusteredReasons })),
		}
	}

	const degenerate = order.filter((cell) => isDegenerate(vectors[cell]))
	if (degenerate.length > 0) {
		const pairTest = (left, right) =>
			fisherExact(
				counts[left].hits,
				counts[left].scored - counts[left].hits,
				counts[right].hits,
				counts[right].scored - counts[right].hits,
			)
		return {
			outcome,
			estimable: false,
			reason: "boundary",
			estimate,
			counts,
			degenerateCells: degenerate,
			pairTests: { ambiguous: pairTest("C1", "C2"), control: pairTest("C5", "C6") },
		}
	}

	const bootstrap = bootstrapInteraction(vectors, { resamples, seed })
	return { outcome, estimable: true, reason: null, counts, ...bootstrap }
}

function decomposition(cells, outcome) {
	const rate = (cell) => (outcome === "hit" ? cells[cell].hitRate : cells[cell].abstentionRate)
	const term = (left, right) => rate(right) - rate(left)
	return {
		outcome,
		register: [
			{ term: "C2-C1", value: term("C1", "C2") },
			{ term: "C4-C3", value: term("C3", "C4") },
		],
		mood: [
			{ term: "C3-C1", value: term("C1", "C3") },
			{ term: "C4-C2", value: term("C2", "C4") },
		],
		interaction: term("C3", "C4") - term("C1", "C2"),
		clustered: ["C1", "C2", "C3", "C4"].filter((cell) => cells[cell].clustered),
	}
}

/** One decimal place, so 1 of 100 reads as `1.0%` and not as `1%`. */
function percent(rate) {
	return `${(rate * 100).toFixed(1)}%`
}

/**
 * Read a completed run's records and produce the report object.
 *
 * THE REFUSAL RULE IS §A2.5 ROW 10, EXACTLY.
 *   The tool refuses only when a cell's exclusion rate EXCEEDS 5%. That row says a
 *   cell over 5% makes the batch partial and that cells with differing exclusion
 *   rates must not be compared; below or at 5% every cell is reported on its own
 *   denominator instead. Any cell with a non-zero exclusion rate is flagged by
 *   name and rate (`exclusionFlags`), so the caveat travels with the table rather
 *   than being buried in a diagnostic.
 *
 *   This replaces a stricter rule — "refuse unless every cell has all 100 draws
 *   scored" — that voided a whole 600-run sweep for one `MAX_TOKENS`. That was not
 *   the registered rule, and one truncation must not be able to throw away 599
 *   observations.
 *
 *   A cell with no records at all still refuses: there is no denominator, and
 *   reporting an empty cell as a rate would be a fabrication.
 */
export function buildReport({
	results,
	key,
	resamples = DEFAULT_BOOTSTRAP_RESAMPLES,
	seed = DEFAULT_BOOTSTRAP_SEED,
	maxExclusionRate = MAX_EXCLUSION_RATE,
}) {
	if (typeof maxExclusionRate !== "number" || !(maxExclusionRate >= 0) || maxExclusionRate > 1) {
		throw new Error("maxExclusionRate must be a number in [0, 1]")
	}
	validateKey(key)

	const cellByLabel = new Map(key.cells.map((cell) => [cell.label, cell]))
	const byLabel = new Map()
	for (const record of results) {
		if (!cellByLabel.has(record.label)) throw new Error(`result for unknown label ${JSON.stringify(record.label)}`)
		const bucket = byLabel.get(record.label) ?? []
		bucket.push(record)
		byLabel.set(record.label, bucket)
	}

	const cells = {}
	for (const cellKey of key.cells) {
		cells[cellKey.cell] = summariseCell(cellKey, byLabel.get(cellKey.label) ?? [])
	}

	const missing = key.cells.filter((cell) => cells[cell.cell].drawn === 0)
	const over = key.cells.filter(
		(cell) => cells[cell.cell].drawn > 0 && cells[cell.cell].exclusionRate > maxExclusionRate,
	)
	const refused = missing.length > 0 || over.length > 0

	const synthetic = results.length > 0 && results.every((record) => record.synthetic === true)

	// §A2.5 row 10: name every cell whose denominator is short, with its rate, so
	// "denominators differ" is visible in the table rather than inferred from a count.
	const exclusionFlags = key.cells
		.map((cell) => ({
			cell: cell.cell,
			label: cell.label,
			drawn: cells[cell.cell].drawn,
			scored: cells[cell.cell].scored,
			excluded: cells[cell.cell].excluded,
			rate: cells[cell.cell].exclusionRate,
		}))
		.filter((entry) => entry.excluded > 0)

	const reasons = [
		...missing.map((cell) => `${cell.cell} (${cell.label}) has no records: there is no denominator to report`),
		...over.map(
			(cell) =>
				`${cell.cell} (${cell.label}) excludes ${cells[cell.cell].excluded} of ${cells[cell.cell].drawn} draws ` +
				`(${percent(cells[cell.cell].exclusionRate)}), above the ${percent(maxExclusionRate)} registered limit`,
		),
	]

	if (refused) {
		return {
			refused: true,
			synthetic,
			maxExclusionRate,
			resamples,
			seed,
			cells,
			exclusionFlags,
			reasons,
		}
	}

	return {
		refused: false,
		synthetic,
		maxExclusionRate,
		resamples,
		seed,
		cells,
		exclusionFlags,
		denominators: {
			planned: CELLS.length * DRAWS_PER_CELL,
			drawn: Object.values(cells).reduce((sum, cell) => sum + cell.drawn, 0),
			scored: Object.values(cells).reduce((sum, cell) => sum + cell.scored, 0),
		},
		contrasts: {
			hit: contrast(cells, "hit", { resamples, seed }),
			abstention: contrast(cells, "abstention", { resamples, seed }),
		},
		decomposition: { hit: decomposition(cells, "hit"), abstention: decomposition(cells, "abstention") },
	}
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function pad(text, width) {
	return String(text).padEnd(width)
}

function fixed(value, digits = 3) {
	return value === null || value === undefined ? "n/a" : value.toFixed(digits)
}

function signed(value, digits = 3) {
	if (value === null || value === undefined) return "n/a"
	return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}`
}

function intervalText(interval) {
	if (!interval) return "n/a"
	return `[${fixed(interval.lower)}, ${fixed(interval.upper)}]`
}

function renderCellRow(cell) {
	const clustered = cell.clustered
	return [
		pad(cell.label, 8),
		pad(cell.drawn, 5),
		pad(cell.scored, 6),
		pad(cell.excluded, 4),
		pad(cell.excluded > 0 ? percent(cell.exclusionRate) : "—", 6),
		pad(cell.hits, 5),
		pad(fixed(cell.hitRate), 6),
		pad(clustered ? "clustered" : intervalText(cell.hitInterval), 17),
		pad(cell.abstentions, 5),
		pad(fixed(cell.abstentionRate), 6),
		pad(clustered ? "clustered" : intervalText(cell.abstentionInterval), 17),
		pad(cell.longestRun, 4),
		fixed(cell.duplicateRate),
	].join(" ")
}

function renderContrast(contrastResult, label) {
	const order = ["C1", "C2", "C5", "C6"]
	const lines = []
	lines.push(`${label}`)
	lines.push(
		"    " +
			order
				.map((cell) => `${cell} ${contrastResult.counts[cell].hits}/${contrastResult.counts[cell].scored}`)
				.join("  ·  "),
	)

	if (!contrastResult.estimable) {
		if (contrastResult.reason === "clustered") {
			lines.push(
				`    NOT ESTIMABLE at this n — clustered: ${contrastResult.clusteredCells
					.map((entry) => `${entry.cell} (${entry.reasons.join("; ")})`)
					.join(", ")}`,
			)
			lines.push("    no interval is emitted for this contrast (Guard 1 / R-5)")
		} else {
			lines.push(
				`    INTERVAL SUPPRESSED — a constituent cell is at a boundary (${contrastResult.degenerateCells.join(
					", ",
				)}); a bootstrap interval carries no information there`,
			)
			lines.push(
				`    difference in counts: estimate ${signed(contrastResult.estimate)} · Fisher exact p (ambiguous pair) ${fixed(
					contrastResult.pairTests.ambiguous,
				)} · p (control pair) ${fixed(contrastResult.pairTests.control)}`,
			)
		}
		return lines
	}

	const excludesZero = contrastResult.lower > 0 || contrastResult.upper < 0
	lines.push(
		`    estimate ${signed(contrastResult.estimate)} · bootstrap 95% [${fixed(contrastResult.lower)}, ${fixed(
			contrastResult.upper,
		)}] · ${contrastResult.resamples.toLocaleString("en-CA")} resamples · seed ${contrastResult.seed}`,
	)
	lines.push(`    interval excludes 0: ${excludesZero ? "YES" : "NO"}`)
	return lines
}

function renderDecomposition(decompositionResult) {
	const lines = []
	lines.push(
		`  ${decompositionResult.outcome} rate${
			decompositionResult.clustered.length > 0
				? ` — clustered constituent(s): ${decompositionResult.clustered.join(", ")} (arithmetic only)`
				: ""
		}`,
	)
	lines.push(
		`    register main effect (noun − verb): ${decompositionResult.register
			.map((entry) => `${entry.term} = ${signed(entry.value)}`)
			.join(" · ")}`,
	)
	lines.push(
		`    mood main effect (DC − IN):         ${decompositionResult.mood
			.map((entry) => `${entry.term} = ${signed(entry.value)}`)
			.join(" · ")}`,
	)
	lines.push(`    register × mood interaction:        ${signed(decompositionResult.interaction)}`)
	return lines
}

export function renderReport(report) {
	const lines = []
	lines.push("routing closing round (E13-R) — Stage 1 report")
	lines.push(`data: ${report.synthetic ? "SYNTHETIC — fabricated, no model was called" : "recorded run directory"}`)
	lines.push("")

	if (report.refused) {
		lines.push(
			`REFUSED — a cell cannot be scored within the registered ${percent(
				report.maxExclusionRate,
			)} exclusion limit; no statistic is emitted.`,
		)
		lines.push(
			"  (§A2.5 row 10: report per-cell denominators, and do not compare cells with differing exclusion rates.)",
		)
		for (const reason of report.reasons) lines.push(`  - ${reason}`)
		lines.push("")
		lines.push("per cell (diagnostic only):")
		for (const cell of Object.values(report.cells)) {
			const excluded = Object.entries(cell.excludedReasons)
				.map(([reason, count]) => `${reason} ×${count}`)
				.join(", ")
			lines.push(
				`  ${pad(cell.label, 8)} cell ${pad(cell.cell, 3)} drawn ${pad(cell.drawn, 4)} scored ${pad(cell.scored, 4)} excluded ${pad(
					cell.excluded,
					3,
				)}${excluded ? ` (${excluded})` : ""}`,
			)
		}
		return lines.join("\n")
	}

	const { planned, drawn: drawnTotal, scored: scoredTotal } = report.denominators
	lines.push(
		`design: ${CELL_IDS.length} cells × ${DRAWS_PER_CELL} draws = ${planned} planned; drawn ${drawnTotal}; scored ${scoredTotal}`,
	)
	lines.push("")
	lines.push(
		`${pad("label", 8)} ${pad("drawn", 5)} ${pad("scored", 6)} ${pad("excl", 4)} ${pad("excl%", 6)} ${pad(
			"hits",
			5,
		)} ${pad("rate", 6)} ${pad("Wilson 95%", 17)} ${pad("abst", 5)} ${pad("rate", 6)} ${pad(
			"Wilson 95%",
			17,
		)} ${pad("run", 4)} dup`,
	)
	for (const cell of Object.values(report.cells)) lines.push(renderCellRow(cell))
	lines.push("")
	lines.push(
		"exclusion flag (§A2.5 row 10 — report denominators; do not compare cells with differing exclusion rates):",
	)
	if (report.exclusionFlags.length === 0) {
		lines.push("  none — every cell is scored on its full drawn denominator.")
	} else {
		for (const entry of report.exclusionFlags) {
			lines.push(
				`  ${pad(entry.label, 8)} cell ${pad(entry.cell, 3)} excludes ${entry.excluded} of ${entry.drawn} draws (${percent(
					entry.rate,
				)}) — REPORTED WITH A FLAG; its rate rests on ${entry.scored} scored draws`,
			)
		}
		lines.push(`  the refusal threshold is ${percent(report.maxExclusionRate)} per cell; no cell here exceeds it.`)
	}
	lines.push("")
	lines.push("clustering guard (R-5): a cell is clustered when its longest identical run exceeds 5")
	lines.push("or its exact-duplicate transcript rate exceeds 20%; no interval is emitted for it.")
	for (const cell of Object.values(report.cells)) {
		lines.push(
			`  ${pad(cell.label, 8)} cell ${pad(cell.cell, 3)} longest run ${pad(cell.longestRun, 4)} duplicate rate ${fixed(
				cell.duplicateRate,
			)}  ${cell.clustered ? `CLUSTERED (${cell.clusteredReasons.join("; ")})` : "no evidence of clustering"}`,
		)
	}
	lines.push("")
	lines.push("outcome runs test (declared vs asked, per cell): |z| < 1.96 means indistinguishable from")
	lines.push("independent draws; negative z means the outcome clumps, positive z means it alternates.")
	for (const cell of Object.values(report.cells)) {
		const test = cell.outcomeRunsTest
		lines.push(
			`  ${pad(cell.label, 8)} cell ${pad(cell.cell, 3)} ${
				test === null
					? "not defined (every scored outcome is identical)"
					: `runs ${pad(test.runs, 4)} expected ${pad(fixed(test.expected, 1), 6)} z ${signed(test.z, 2)}`
			}`,
		)
	}
	lines.push("")
	lines.push("co-primary contrasts (conditional-ambiguity interaction, (C2 − C1) − (C6 − C5)):")
	for (const line of renderContrast(report.contrasts.hit, "P1 — hit rate")) lines.push(`  ${line}`)
	lines.push("")
	for (const line of renderContrast(report.contrasts.abstention, "P2 — abstention rate")) lines.push(`  ${line}`)
	lines.push("")
	lines.push("2×2 decomposition — descriptive only, underpowered by design (A2.3); no causal claim:")
	for (const line of renderDecomposition(report.decomposition.hit)) lines.push(line)
	for (const line of renderDecomposition(report.decomposition.abstention)) lines.push(line)
	lines.push("")
	lines.push("No reading is emitted here: §A2.5's table is applied by a human after the sweep completes.")
	return lines.join("\n")
}

// ---------------------------------------------------------------------------
// Synthetic data — a dev affordance, never a run
// ---------------------------------------------------------------------------

/**
 * Fabricated outcomes for exercising the report. Every record is stamped
 * `"synthetic": true`, responses are prefixed `SYNTHETIC`, and no model, key or
 * network is involved. `scenario` selects a clean sweep, a clustered cell, a
 * boundary cell, a partial batch that is still reportable (1 exclusion in one
 * cell, 1.0%), or a batch that must be refused (6 exclusions in one cell, 6.0%,
 * above the registered 5% limit).
 */
const PROFILES = {
	clean: {
		hitRate: { C1: 0.45, C2: 0.65, C3: 0.5, C4: 0.68, C5: 0.92, C6: 0.9 },
		abstainRate: { C1: 0.25, C2: 0.1, C3: 0.2, C4: 0.09, C5: 0.03, C6: 0.04 },
		clustered: null,
		truncated: {},
	},
	clustered: {
		hitRate: { C1: 1, C2: 0.65, C3: 0.5, C4: 0.68, C5: 0.92, C6: 0.9 },
		abstainRate: { C1: 0, C2: 0.1, C3: 0.2, C4: 0.09, C5: 0.03, C6: 0.04 },
		clustered: "C1",
		truncated: {},
	},
	// One MAX_TOKENS in one cell: 1 of 100 = 1.0%, inside the registered 5% limit,
	// so the sweep must still be reported, with the cell flagged by name and rate.
	partial: {
		hitRate: { C1: 0.45, C2: 0.65, C3: 0.5, C4: 0.68, C5: 0.92, C6: 0.9 },
		abstainRate: { C1: 0.25, C2: 0.1, C3: 0.2, C4: 0.09, C5: 0.03, C6: 0.04 },
		clustered: null,
		truncated: { C2: 1 },
	},
	// Six MAX_TOKENS in one cell: 6 of 100 = 6.0%, above 5% — refused, naming the
	// cell and the rate.
	"over-exclusion": {
		hitRate: { C1: 0.45, C2: 0.65, C3: 0.5, C4: 0.68, C5: 0.92, C6: 0.9 },
		abstainRate: { C1: 0.25, C2: 0.1, C3: 0.2, C4: 0.09, C5: 0.03, C6: 0.04 },
		clustered: null,
		truncated: { C2: 6 },
	},
	// C5 answers every draw correctly with a unique transcript: no clustering,
	// but a zero-variance cell, which is Guard 2's boundary case.
	boundary: {
		hitRate: { C1: 0.45, C2: 0.65, C3: 0.5, C4: 0.68, C5: 1, C6: 0.9 },
		abstainRate: { C1: 0.25, C2: 0.1, C3: 0.2, C4: 0.09, C5: 0, C6: 0.04 },
		clustered: null,
		truncated: {},
	},
}

export const SYNTHETIC_SCENARIOS = Object.keys(PROFILES)

export function syntheticRecords({ key, scenario = "clean", seed = DEFAULT_BOOTSTRAP_SEED }) {
	const profile = PROFILES[scenario]
	if (!profile) throw new Error(`unknown synthetic scenario ${JSON.stringify(scenario)}`)
	validateKey(key)

	const rng = mulberry32(seed)
	const records = []

	for (let draw = 1; draw <= DRAWS_PER_CELL; draw++) {
		for (const cellKey of key.cells) {
			const label = cellKey.label
			const tag = `${label}-d${String(draw).padStart(3, "0")}`
			const roll = rng()
			let kind
			if (profile.clustered === cellKey.cell) kind = "hit"
			else if (roll < profile.hitRate[cellKey.cell]) kind = "hit"
			else if (roll < profile.hitRate[cellKey.cell] + profile.abstainRate[cellKey.cell]) kind = "abstain"
			else kind = "nonkey"

			let response
			if (profile.clustered === cellKey.cell) {
				// One identical transcript for the whole cell: the guard must fire.
				response = `SYNTHETIC ${label}: use the ${cellKey.expectedOwner} mode.`
			} else if (kind === "hit") {
				response = `SYNTHETIC ${tag}: use the ${cellKey.expectedOwner} mode; evidence line ${draw}.`
			} else if (kind === "abstain") {
				response = `SYNTHETIC ${tag}: I cannot tell which mode fits; please tell me what the goal is.`
			} else {
				const other = otherSlug(cellKey, draw)
				response = `SYNTHETIC ${tag}: use the ${other} mode instead.`
			}

			const truncated = (profile.truncated[cellKey.cell] ?? 0) >= draw
			records.push({
				synthetic: true,
				runId: tag,
				label,
				draw,
				model: "synthetic-none",
				status: "RUN",
				finishReason: truncated ? "MAX_TOKENS" : draw % 10 === 0 ? null : "STOP",
				attempt: 1,
				response,
			})
		}
	}

	return records
}

function otherSlug(cellKey, draw) {
	const slugs = cellKey.slugs
	for (let step = 0; step < slugs.length; step++) {
		const candidate = slugs[(draw * 7 + step) % slugs.length]
		if (candidate !== cellKey.expectedOwner) return candidate
	}
	throw new Error(`${cellKey.cell}: no non-target slug available`)
}

/** Write a synthetic run directory: results.jsonl plus an unmistakable marker file. */
export async function writeSyntheticRunDir({ dir, key, scenario = "clean", seed = DEFAULT_BOOTSTRAP_SEED }) {
	const records = syntheticRecords({ key, scenario, seed })
	await fs.mkdir(dir, { recursive: true })
	await fs.writeFile(
		path.join(dir, "results.jsonl"),
		records.map((record) => JSON.stringify(record)).join("\n") + "\n",
		"utf-8",
	)
	await fs.writeFile(
		path.join(dir, "SYNTHETIC-DATA.md"),
		[
			"# SYNTHETIC DATA — NOT A RUN",
			"",
			`Scenario: ${scenario}. Every record in results.jsonl carries "synthetic": true.`,
			"Every response is prefixed SYNTHETIC, and no model, key or network was used.",
			"These files exist only to exercise scripts/report-routing-round.mjs.",
			"",
		].join("\n"),
		"utf-8",
	)
	return { dir, records: records.length, scenario }
}
