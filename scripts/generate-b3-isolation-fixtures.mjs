#!/usr/bin/env node

/**
 * generate-b3-isolation-fixtures.mjs — derive the six E12 fixtures
 * (`docs/reviews/2026-11-11-b3-isolation-preregistration.md`).
 *
 * WHY A GENERATOR RATHER THAN SIX HAND-EDITED COPIES
 *   A0 and A5 are 45- and 47-mode files. Copying them by hand would let a
 *   transcription error into registered material. Deriving them here means the
 *   only edits that exist are the ones the registration names, and the diff
 *   summary printed at the end is computed from the bytes rather than claimed.
 *
 * WHAT IT WRITES (all under test-fixtures/frames/b3-isolation/)
 *   A0.roomodes  byte-identical copy of axis-stance.roomodes
 *   A1.roomodes  A0 with the comprehension mode's slug AND name renamed
 *   A2.roomodes  A1 with that mode's whenToUse replaced by the artefact line
 *   A3.roomodes  A0 plus the two neutral padding modes appended
 *   A5.roomodes  byte-identical copy of artefact.roomodes
 *   C2.roomodes  A0 with the mode blocks in reverse order
 *
 * WHAT IT DOES NOT DO
 *   It writes nothing outside test-fixtures/frames/b3-isolation/, makes no model
 *   call, reads no secret, and refuses to write a fixture whose mode count or
 *   field diff is not the registered one.
 *
 * No dependencies. Node 22 ESM.
 */

import * as fs from "node:fs/promises"
import * as path from "node:path"

import { FRAME_DIR, parseRoomodes } from "./lib/framing-pretest.mjs"

const OUT_DIR = path.join(FRAME_DIR, "b3-isolation")

const AXIS = path.join(FRAME_DIR, "axis-stance.roomodes")
const ARTEFACT = path.join(FRAME_DIR, "artefact.roomodes")

/** The comprehension mode in each source fixture. Named here, not inferred. */
const AXIS_COMPREHENSION = { fromSlug: "explain", toSlug: "explanation", fromName: "Explain", toName: "Explanation" }
const ARTEFACT_COMPREHENSION_SLUG = "explanation"

/**
 * The two A3 padding modes. Neutrality criteria, checked by `assertPadding`:
 * no banned word in slug/name/whenToUse, and the minimal `groups: [read]` that a
 * neighbouring mode (legal-review, compliance-mapping) already carries, so the
 * padding adds a picker line and no capability.
 */
const PADDING = [
	{
		slug: "onboarding-guide",
		name: "Onboarding Guide",
		description: "Onboarding Guide mode — a new contributor needs the steps to get a local development environment running.",
		whenToUse: "Use when a new contributor needs the steps to get a local development environment running.",
	},
	{
		slug: "release-notes",
		name: "Release Notes",
		description: "Release Notes mode — shipped changes must be listed for the people who use them.",
		whenToUse: "Use when shipped changes must be listed for the people who use them.",
	},
]

const BANNED = ["why", "explain", "reason", "rationale", "structure", "evidence"]

/**
 * The placebo arm P (Amendment 2 §A2.4). Derived from A0 with exactly TWO fields
 * changed: the `slug` of two unrelated modes. Nothing else moves — not `name`,
 * not `description`, not `roleDefinition`, not `whenToUse`, not the order.
 *
 * CHOICE AND WHY (recorded as IN-13 in the implementation notes)
 *   `career-coach` and `pricing-analyst` are the two furthest modes from the
 *   brief's semantics that still read as ordinary catalogue members: career
 *   advice and pricing are non-engineering domains, neither can own "why is this
 *   module structured the way it is", and neither is a comprehension, review,
 *   mapping, reasoning or implementation mode. The excluded set is asserted
 *   below so a future edit cannot quietly rename something adjacent.
 *
 * WHY SLUG ONLY, WHEN A1 CHANGES SLUG *AND* NAME
 *   A1 changes two fields of one mode because it must test the noun form a
 *   reader sees. P must change material with no consequence, so the smallest
 *   quotient of change is the honest one: two fields, total. The cost is a
 *   slug/label mismatch on those two lines (`career-adviser — Career Coach`),
 *   which is visible only if a model elects to talk about a career-coach mode on
 *   a comprehension brief. If it does, the floor moves, which is the safe
 *   direction: a larger floor makes attribution HARDER, not easier.
 */
const PLACEBO_RENAMES = [
	{ fromSlug: "career-coach", toSlug: "career-adviser" },
	{ fromSlug: "pricing-analyst", toSlug: "pricing-strategist" },
]

/** Modes P may not rename: the comprehension mode, its artefact twin, and neighbours. */
const PLACEBO_EXCLUDED = [
	"explain",
	"explanation",
	"architecture-reviewer",
	"codebase-cartographer",
	"code",
	"requirements",
]

/** Words a placebo rename must not introduce: the brief's vocabulary or the candidate causes. */
const PLACEBO_BANNED = [...BANNED, "explanation", "arrange", "modul", "verb", "noun", "terminolog"]

/** Split a `.roomodes` file into its header lines and its mode blocks, losslessly. */
function splitBlocks(text) {
	const lines = text.split("\n")
	const starts = []
	for (let i = 0; i < lines.length; i++) if (/^ {2}- slug: /.test(lines[i])) starts.push(i)
	if (starts.length === 0) throw new Error("no mode blocks found")

	const head = lines.slice(0, starts[0])
	const blocks = starts.map((start, index) => {
		const end = index + 1 < starts.length ? starts[index + 1] : lines.length
		return lines.slice(start, end)
	})
	return { head, blocks }
}

function joinBlocks({ head, blocks }) {
	return [...head, ...blocks.flat()].join("\n")
}

function blockFor(blocks, slug) {
	const found = blocks.filter((block) => block[0] === `  - slug: ${slug}`)
	if (found.length !== 1) throw new Error(`expected exactly one block for slug ${slug}, found ${found.length}`)
	return found[0]
}

function renderPaddingMode(spec) {
	return [
		`  - slug: ${spec.slug}`,
		`    name: ${spec.name}`,
		`    description: ${spec.description}`,
		`    roleDefinition: "You are the ${spec.name} mode. Your charter: ${spec.description.slice(
			spec.name.length + " mode — ".length,
		)} Work only while that condition holds, state your assumptions, and end with the evidence a reviewer can check."`,
		`    whenToUse: ${spec.whenToUse}`,
		"    groups:",
		"      - read",
	]
}

/** Replace one line, asserting it occurred exactly once, so an edit cannot miss. */
function replaceOnce(lines, from, to) {
	const hits = lines.filter((line) => line === from)
	if (hits.length !== 1) throw new Error(`expected exactly one line ${JSON.stringify(from)}, found ${hits.length}`)
	return lines.map((line) => (line === from ? to : line))
}

function assertPadding(spec) {
	const visible = `${spec.slug} ${spec.name} ${spec.whenToUse}`.toLowerCase()
	for (const word of BANNED) {
		if (visible.includes(word)) throw new Error(`padding ${spec.slug} contains banned word "${word}"`)
	}
	// Objection 21: `explanation` does not contain `explain`, which is exactly the
	// slip recorded as D-5. The longer form is banned explicitly.
	if (visible.includes("explanation")) throw new Error(`padding ${spec.slug} contains banned word "explanation"`)
}

function assertPlaceboRename(axisBlocks, rename) {
	const slug = rename.fromSlug
	const lowered = slug.toLowerCase()
	if (PLACEBO_EXCLUDED.some((excluded) => excluded === lowered || lowered.startsWith(excluded))) {
		throw new Error(`placebo rename of ${slug} is excluded: it is the comprehension mode or a near neighbour`)
	}
	const target = rename.toSlug.toLowerCase()
	for (const word of PLACEBO_BANNED) {
		if (target.includes(word)) throw new Error(`placebo slug ${target} contains banned word "${word}"`)
	}
	if (axisBlocks.some((block) => block[0] === `  - slug: ${rename.toSlug}`)) {
		throw new Error(`placebo slug ${rename.toSlug} already exists in A0`)
	}
	if (axisBlocks.filter((block) => block[0] === `  - slug: ${slug}`).length !== 1) {
		throw new Error(`placebo source slug ${slug} does not occur exactly once in A0`)
	}
}

/**
 * Exactly one trailing newline, and no blank line before an appended block.
 * A0 and A5 are already in this shape; the helper keeps A3 from acquiring a
 * stray blank line (and a missing final newline) where the padding is joined on.
 */
function withCleanTail(tree) {
	const blocks = tree.blocks.map((block) => {
		const copy = [...block]
		while (copy.length > 1 && copy[copy.length - 1] === "") copy.pop()
		return copy
	})
	blocks[blocks.length - 1].push("")
	return { head: tree.head, blocks }
}

function changedLines(before, after) {
	const a = before.split("\n")
	const b = after.split("\n")
	if (a.length !== b.length) throw new Error(`line count changed: ${a.length} -> ${b.length}`)
	const changes = []
	for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) changes.push({ line: i + 1, from: a[i], to: b[i] })
	return changes
}

async function main() {
	const axisText = await fs.readFile(AXIS, "utf-8")
	const artefactText = await fs.readFile(ARTEFACT, "utf-8")
	const axis = splitBlocks(axisText)
	const artefact = splitBlocks(artefactText)

	const artefactLine = blockFor(artefact.blocks, ARTEFACT_COMPREHENSION_SLUG).find((line) =>
		line.startsWith("    whenToUse: "),
	)
	if (!artefactLine) throw new Error(`artefact/${ARTEFACT_COMPREHENSION_SLUG}: no whenToUse line`)

	// A0 and A5 are copies. `axisText`/`artefactText` are re-serialised through the
	// block splitter and asserted byte-identical, so the copy is verified not assumed.
	const a0 = { head: axis.head, blocks: axis.blocks }
	const a5 = { head: artefact.head, blocks: artefact.blocks }
	if (joinBlocks(a0) !== axisText) throw new Error("A0 re-serialisation is not byte-identical to axis-stance")
	if (joinBlocks(a5) !== artefactText) throw new Error("A5 re-serialisation is not byte-identical to artefact")

	// A1 — slug and name of the comprehension mode. Nothing else, route line untouched.
	const a1Blocks = axis.blocks.map((block) =>
		block[0] === `  - slug: ${AXIS_COMPREHENSION.fromSlug}`
			? replaceOnce(
					replaceOnce(block, `  - slug: ${AXIS_COMPREHENSION.fromSlug}`, `  - slug: ${AXIS_COMPREHENSION.toSlug}`),
					`    name: ${AXIS_COMPREHENSION.fromName}`,
					`    name: ${AXIS_COMPREHENSION.toName}`,
				)
			: block,
	)
	const a1 = withCleanTail({ head: axis.head, blocks: a1Blocks })

	// A2 — A1 with the comprehension mode's whenToUse replaced by the artefact's line.
	const a2Blocks = a1Blocks.map((block) =>
		block[0] === `  - slug: ${AXIS_COMPREHENSION.toSlug}`
			? replaceOnce(
					block,
					block.find((line) => line.startsWith("    whenToUse: ")),
					artefactLine,
				)
			: block,
	)
	const a2 = withCleanTail({ head: axis.head, blocks: a2Blocks })

	// A3 — A0 plus two appended padding modes, so the existing 45 picker lines do
	// not move and only the count/position of the two new lines differs.
	for (const spec of PADDING) assertPadding(spec)
	const a3 = withCleanTail({ head: axis.head, blocks: [...axis.blocks, ...PADDING.map(renderPaddingMode)] })

	// P — the placebo: A0 with two unrelated slugs renamed, nothing else touched.
	for (const rename of PLACEBO_RENAMES) assertPlaceboRename(axis.blocks, rename)
	const pBlocks = axis.blocks.map((block) =>
		PLACEBO_RENAMES.reduce(
			(current, rename) =>
				current[0] === `  - slug: ${rename.fromSlug}`
					? replaceOnce(current, `  - slug: ${rename.fromSlug}`, `  - slug: ${rename.toSlug}`)
					: current,
			block,
		),
	)
	const placebo = withCleanTail({ head: axis.head, blocks: pBlocks })

	// C2 — A0 with the mode blocks reversed, each block intact.
	const c2 = withCleanTail({ head: axis.head, blocks: [...axis.blocks].reverse() })

	const files = {
		"A0.roomodes": a0,
		"A1.roomodes": a1,
		"A2.roomodes": a2,
		"A3.roomodes": a3,
		"A5.roomodes": a5,
		"P.roomodes": placebo,
		"C2.roomodes": c2,
	}

	await fs.mkdir(OUT_DIR, { recursive: true })
	const counts = {
		"A0.roomodes": 45,
		"A1.roomodes": 45,
		"A2.roomodes": 45,
		"A3.roomodes": 47,
		"A5.roomodes": 47,
		"P.roomodes": 45,
		"C2.roomodes": 45,
	}
	for (const [name, tree] of Object.entries(files)) {
		const text = joinBlocks(tree)
		const modes = parseRoomodes(text, name)
		if (modes.length !== counts[name]) throw new Error(`${name}: parsed ${modes.length} modes, expected ${counts[name]}`)
		await fs.writeFile(path.join(OUT_DIR, name), text, "utf-8")
		console.log(`wrote ${name} (${modes.length} modes, ${Buffer.byteLength(text, "utf8")} bytes)`)
	}

	const a1Diff = changedLines(joinBlocks(a0), joinBlocks(a1))
	const a2Diff = changedLines(joinBlocks(a1), joinBlocks(a2))
	const pDiff = changedLines(joinBlocks(a0), joinBlocks(placebo))
	if (pDiff.length !== 2) throw new Error(`P must change exactly 2 fields versus A0, changed ${pDiff.length}`)
	console.log(`\nA1 vs A0 — ${a1Diff.length} changed line(s):`)
	for (const change of a1Diff) console.log(`  L${change.line}: ${change.from}  ->  ${change.to}`)
	console.log(`A2 vs A1 — ${a2Diff.length} changed line(s):`)
	for (const change of a2Diff) console.log(`  L${change.line}: ${change.from}  ->  ${change.to}`)
	console.log(`P vs A0 — ${pDiff.length} changed field(s):`)
	for (const change of pDiff) console.log(`  L${change.line}: ${change.from}  ->  ${change.to}`)
	console.log(`A3 vs A0 — modes ${axis.blocks.length} -> ${a3.blocks.length} (+${a3.blocks.length - axis.blocks.length}) [NOT RUN]`)
	console.log(`C2 vs A0 — block order reversed; same ${c2.blocks.length} blocks, no field changed [NOT RUN]`)
}

main().catch((error) => {
	console.error(`generate-b3-isolation-fixtures failed: ${error.message}`)
	process.exit(1)
})
