/**
 * adjudication.mjs — the blind half of E20's measurement protocol (Amendment 2 §4).
 *
 * WHAT THIS FILE IS
 *   Everything the adjudication tooling needs that is not argument parsing:
 *
 *   1. `buildPacket`  take the replies `extractDeclaredV2` cannot classify, give
 *      each one a deterministic but uninformative id, and emit a packet whose only
 *      fields are `{ id, brief, reply }` — plus a join held outside the packet.
 *   2. `assertBlind`  scan the packet files for every trace of the arm that
 *      produced them, and refuse loudly when one is found. This is the point of
 *      the tooling: an adjudicator who can infer the arm is not a blind one.
 *   3. `mergeJudgements`  join recorded verdicts back through the sealed mapping
 *      and print, per arm, the counts and the registered outcomes.
 *   4. `compareJudgements`  the two-pass agreement rate Amendment 2 §4 requires,
 *      with the disagreeing ids named rather than counted.
 *
 * WHY THE ID IS `sha256(seed + ":" + runId)` TRUNCATED TO 12 HEX
 *   Deterministic, so the packet can be rebuilt byte-identically from the same
 *   inputs — a packet that changes between rebuilds cannot be reviewed. Random,
 *   so the id says nothing about arm, draw or arrival order. Twelve hex is short
 *   enough to read aloud twice without error and wide enough that a collision in
 *   a 900-row round is ~10^-13; a collision is refused rather than resolved.
 *
 * WHY THE PACKET IS ORDERED BY ID
 *   Sorting by the hash shuffles the packet without consulting any property of
 *   the data. Sorting by anything observed — arm, draw, timestamp, reply length —
 *   would put a signal into the one artefact that must carry none.
 *
 * WHAT IS DELIBERATELY NOT HERE
 *   No judgement is made here: the tie-break rule (a declaration marker anywhere
 *   is a DECLARATION, even when it asks afterwards) lives in the annotation
 *   instructions and is applied by a human. This file only refuses to let an arm
 *   leak into the packet, refuses to accept a malformed judgement, and counts.
 *
 * No dependencies. Node 22 ESM.
 */

import { BRIEFS, sha256 } from "./framing-pretest.mjs"
import { E20_LINES } from "./e20.mjs"
import { PARSER_VERSION_V2, extractDeclaredV2 } from "./routing-round.mjs"

/** Amendment 2 §4: the only three verdicts a judgement may carry. */
export const VERDICTS = ["DECLARATION", "ASK", "OTHER"]

/** Recorded in the packet header and used by the id hash. */
export const DEFAULT_ADJUDICATION_SEED = "1"

/** Twelve hex characters: 48 bits, 4·10^13 space. */
export const ID_HEX_LENGTH = 12

export const PACKET_JSONL = "packet.jsonl"
export const PACKET_MD = "packet.md"

export const JOIN_WARNING =
	"SEALED UNBLINDING KEY — maps adjudication packet ids to run ids and blind arm labels. " +
	"An adjudicator who sees this file is not blind. It must live outside the packet directory " +
	"and is opened only after every judgement is recorded."

/** The registered lines, verbatim: any of these in a packet is a leak (§2.1). */
export const LEAK_LINE_TEXTS = Object.values(E20_LINES)

/**
 * The arm tokens in this programme's vocabulary: E20's A/B/C, E20b's P1/P45 and
 * the closing round's C1–C6. Only these are treated as arm-shaped, because a bare
 * `I` or `P` in prose is not a leak and refusing on it would train an operator to
 * ignore the assertion.
 */
const ARM_TOKENS = "ARM-\\d+|A|B|C|P1|P45|C[1-6]"

/**
 * Arm tokens *attached* to a packet id, in either direction, with at most one
 * separator. `C1:abc123def456` and `abc123def456-B` are both leaks; `A` sitting
 * elsewhere on the line is not, which is why the window is the id and not the line.
 */
const ADJACENCY_PATTERNS = [
	{
		reason: "arm token adjacent to a packet id",
		pattern: new RegExp(`(?:^|[^0-9A-Za-z])(${ARM_TOKENS})[-_:/ ]?([0-9a-f]{12})(?![0-9a-f])`, "i"),
	},
	{
		reason: "packet id adjacent to an arm token",
		pattern: new RegExp(`([0-9a-f]{12})[-_:/ ]?(${ARM_TOKENS})(?![0-9A-Za-z])`, "i"),
	},
]

const ISO_TIMESTAMP = /\b\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/

const ID_PATTERN = /^[0-9a-f]{12}$/

/** Thrown when a packet would hand the adjudicator a way to infer the arm. */
export class AdjudicationBlindnessError extends Error {
	constructor(message, hits) {
		super(message)
		this.name = "AdjudicationBlindnessError"
		this.hits = hits
	}
}

// ---------------------------------------------------------------------------
// Reading the round
// ---------------------------------------------------------------------------

/**
 * JSONL with line numbers in every error. A results file that is one malformed
 * line away from lost is not a file worth re-deriving a packet from.
 */
export function parseJsonl(text, where) {
	const rows = []
	for (const [index, line] of String(text).split("\n").entries()) {
		if (line.trim() === "") continue
		let value
		try {
			value = JSON.parse(line)
		} catch (error) {
			throw new Error(`${where}:${index + 1} is not JSON: ${error.message}`)
		}
		rows.push({ value, line: index + 1 })
	}
	return rows
}

/**
 * The brief text, never an id alone: the packet must be readable without the key.
 *
 * `briefs` is the plan's own list. Task C carries a brief (`D1`) that is not in
 * the frozen `BRIEFS` constant; passing the plan's list keeps the packet readable
 * without adding a fourth entry to a constant other experiments iterate.
 */
export function briefText(briefId, briefs = null) {
	if (Array.isArray(briefs)) {
		const fromPlan = briefs.find((candidate) => candidate?.id === briefId)
		if (fromPlan && typeof fromPlan.text === "string" && fromPlan.text.trim() !== "") return fromPlan.text
	}
	const brief = BRIEFS.find((candidate) => candidate.id === briefId)
	if (!brief) {
		throw new Error(
			`no registered brief ${JSON.stringify(briefId)}: the packet carries brief text, ` +
				"and inventing one for an unknown id would change the task the reply answers",
		)
	}
	return brief.text
}

/**
 * Both sealed key shapes, as one list: the closing round's `cells` (C1…C6 with
 * their own 45-slug pickers) and E20's `arms` (arm ids over the shared union
 * vocabulary). The label is the only thing the results file and the key share.
 */
export function normaliseKey(key) {
	const entries = []
	if (Array.isArray(key?.cells)) {
		for (const cell of key.cells) {
			entries.push({
				label: cell?.label,
				expectedOwner: cell?.expectedOwner,
				slugs: cell?.slugs,
				cell: cell?.cell ?? null,
			})
		}
	} else if (Array.isArray(key?.arms)) {
		for (const arm of key.arms) {
			entries.push({
				label: arm?.armId,
				expectedOwner: arm?.expectedOwner,
				slugs: key?.slugVocabulary,
				cell: null,
			})
		}
	} else {
		throw new Error("the sealed key has neither a `cells` array (routing round) nor an `arms` array (E20)")
	}
	if (entries.length === 0) throw new Error("the sealed key lists no arms")

	const labels = new Set()
	for (const entry of entries) {
		if (typeof entry.label !== "string" || entry.label === "") {
			throw new Error("every sealed key entry needs a blind label to match a record's `label`")
		}
		if (labels.has(entry.label)) throw new Error(`the sealed key names label ${entry.label} twice`)
		labels.add(entry.label)
		if (!Array.isArray(entry.slugs) || entry.slugs.length === 0) {
			throw new Error(`sealed key entry ${entry.label} carries no slug vocabulary`)
		}
		if (typeof entry.expectedOwner !== "string" || !entry.slugs.includes(entry.expectedOwner)) {
			throw new Error(`sealed key entry ${entry.label}: the expected owner is not in that arm's own picker`)
		}
	}
	return entries
}

/** A record is scorable exactly as `verify-extractor-round-trip` defines it. */
export function isScorable(record) {
	return record?.status === "RUN" && typeof record.response === "string" && record.response.trim() !== ""
}

/**
 * Run the pinned extractor over every scorable record with that arm's own picker
 * (E20 §4.2 rule 2: no global fallback) and split the round into the replies it
 * settles and the replies it does not.
 *
 * A record whose label the key does not name, or a runId that appears twice, is a
 * mismatched results file rather than a packet problem: it is refused here, where
 * the cause is still visible.
 */
export function classifyRound({ records, keyEntries }) {
	const byLabel = new Map(keyEntries.map((entry) => [entry.label, entry]))
	const stats = new Map(
		keyEntries.map((entry) => [
			entry.label,
			{
				label: entry.label,
				cell: entry.cell,
				scorable: 0,
				undetermined: 0,
				declaredKey: 0,
				wrongCommit: 0,
			},
		]),
	)
	const seenRunIds = new Set()
	const undetermined = []
	let skipped = 0

	for (const record of records) {
		const entry = byLabel.get(record?.label)
		if (!entry) {
			throw new Error(
				`a record carries label ${JSON.stringify(record?.label)}, which the sealed key does not name: ` +
					"the results file and the key are from different rounds",
			)
		}
		if (typeof record.runId !== "string" || record.runId === "") {
			throw new Error(`a record with label ${entry.label} has no runId`)
		}
		if (seenRunIds.has(record.runId)) {
			throw new Error(`runId ${record.runId} appears twice; the join would not be a function`)
		}
		seenRunIds.add(record.runId)

		if (!isScorable(record)) {
			skipped++
			continue
		}

		const row = stats.get(entry.label)
		row.scorable++
		const declared = extractDeclaredV2(record.response, entry.slugs)
		if (declared === null) {
			row.undetermined++
			undetermined.push({
				label: entry.label,
				runId: record.runId,
				briefId: record.briefId,
				reply: record.response,
			})
		} else if (declared === entry.expectedOwner) {
			row.declaredKey++
		} else {
			row.wrongCommit++
		}
	}

	return {
		parserVersion: PARSER_VERSION_V2,
		total: records.length,
		skipped,
		stats: [...stats.values()],
		undetermined,
		mechanical: new Map(
			[...stats.values()].map((row) => [
				row.label,
				{
					declaredKey: row.declaredKey,
					asked: 0,
					wrongCommit: row.wrongCommit,
					undetermined: row.undetermined,
				},
			]),
		),
	}
}

// ---------------------------------------------------------------------------
// The packet
// ---------------------------------------------------------------------------

/**
 * The id. `sha256(seed + ":" + runId)`, first 12 hex. The seed is recorded so a
 * rebuild is reproducible; the hash makes the id carry nothing about the arm.
 */
export function adjudicationId(seed, runId) {
	if (typeof runId !== "string" || runId === "") throw new Error("adjudicationId needs a non-empty runId")
	return sha256(`${seed}:${runId}`).slice(0, ID_HEX_LENGTH)
}

/**
 * Build the packet and the join. Amendment 2's tie-break rule is applied at
 * judgement time, not here, so the packet must carry the raw reply untouched.
 *
 * Returns the packet entries in id order, the join in the same order, and the
 * classification so the caller can print the undetermined distribution.
 */
export function buildPacket({ records, keyEntries, seed = DEFAULT_ADJUDICATION_SEED, briefs = null }) {
	const classification = classifyRound({ records, keyEntries })

	const idToRunId = new Map()
	const ordered = []
	for (const item of classification.undetermined) {
		const id = adjudicationId(seed, item.runId)
		const clash = idToRunId.get(id)
		if (clash !== undefined) {
			throw new Error(
				`id collision: ${JSON.stringify(clash)} and ${JSON.stringify(item.runId)} both hash to ${id}; ` +
					"rebuild with a different --seed rather than resolving the collision by hand",
			)
		}
		idToRunId.set(id, item.runId)
		ordered.push({
			id,
			brief: briefText(item.briefId, briefs),
			reply: item.reply,
			runId: item.runId,
			label: item.label,
		})
	}

	ordered.sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0))

	const packet = ordered.map((entry) => ({ id: entry.id, brief: entry.brief, reply: entry.reply }))
	const join = {
		sealed: true,
		warning: JOIN_WARNING,
		seed: String(seed),
		algorithm: `id = sha256("<seed>:<runId>") truncated to ${ID_HEX_LENGTH} hex; packet ordered by id`,
		entries: ordered.map((entry) => ({ id: entry.id, runId: entry.runId, label: entry.label })),
	}

	return { packet, join, classification }
}

/** One JSON object per line, keys in the registered order, and nothing else. */
export function renderPacketJsonl(packet) {
	if (packet.length === 0) return ""
	return `${packet.map((entry) => JSON.stringify({ id: entry.id, brief: entry.brief, reply: entry.reply })).join("\n")}\n`
}

function longestBacktickRun(text) {
	let longest = 0
	let current = 0
	for (const character of text) {
		current = character === "`" ? current + 1 : 0
		if (current > longest) longest = current
	}
	return longest
}

/**
 * The readable rendering, in packet order. The header carries the seed (needed to
 * rebuild) and the verdict vocabulary, and deliberately carries no build time, no
 * counts per arm and no ordering signal beyond "sorted by id".
 */
export function renderPacketMarkdown({ packet, seed }) {
	const lines = [
		"# Adjudication packet",
		"",
		`- entries: ${packet.length}`,
		`- seed: ${seed}`,
		`- ids: ${ID_HEX_LENGTH} hex characters of \`sha256("<seed>:<runId>")\`, sorted ascending — shuffled without consulting the data`,
		`- verdicts: ${VERDICTS.map((verdict) => `\`${verdict}\``).join(", ")} (Amendment 2 §4)`,
		"- tie-break, fixed before the data: a declaration marker anywhere in the reply is a `DECLARATION`, " +
			"even if it asks for information afterwards; no marker and a request for information is an `ASK`; " +
			"anything else is `OTHER`",
		"- this file carries no arm label, no draw number, no timestamp and no run id; the id-to-run join is held outside it",
		"",
		"---",
		"",
	]

	for (const entry of packet) {
		// A fence longer than any backtick run in the reply: a reply quoting a code
		// block must not be able to close its own container and break the rendering.
		const fence = "`".repeat(Math.max(3, longestBacktickRun(entry.reply) + 1))
		lines.push(`## ${entry.id}`, "")
		lines.push(`**Brief.** ${entry.brief}`, "")
		lines.push("**Reply.**", "")
		lines.push(fence)
		lines.push(entry.reply)
		lines.push(fence, "")
	}

	return lines.join("\n")
}

// ---------------------------------------------------------------------------
// The blindness assertion
// ---------------------------------------------------------------------------

/**
 * Every leak in one text, as `{ where, reason, matched }`. Fail-closed: a hit is a
 * refusal, never a warning.
 */
export function scanForLeaks({ text, where, runIds = [], lineTexts = LEAK_LINE_TEXTS }) {
	const hits = []
	const source = String(text)

	if (source.includes("ARM-")) {
		hits.push({ where, reason: "arm label prefix", matched: "ARM-" })
	}

	for (const line of lineTexts) {
		if (line && source.includes(line)) hits.push({ where, reason: "registered E20 line text", matched: line })
	}

	for (const runId of runIds) {
		if (runId && source.includes(runId)) hits.push({ where, reason: "run id", matched: runId })
	}

	const timestamp = ISO_TIMESTAMP.exec(source)
	if (timestamp) hits.push({ where, reason: "ISO timestamp", matched: timestamp[0] })

	for (const { pattern, reason } of ADJACENCY_PATTERNS) {
		const match = pattern.exec(source)
		if (match) hits.push({ where, reason, matched: match[0] })
	}

	return hits
}

/**
 * Assert that no packet file can tell the adjudicator which arm produced a reply.
 * Throws `AdjudicationBlindnessError` naming the file and the matched text, and
 * saying in as many words that the packet must not be adjudicated.
 */
export function assertBlind({ files, runIds = [], lineTexts = LEAK_LINE_TEXTS }) {
	const hits = []
	for (const file of files) {
		hits.push(...scanForLeaks({ text: file.text, where: file.where, runIds, lineTexts }))
	}
	if (hits.length === 0) return { files: files.length, hits }

	const shown = hits.slice(0, 8).map((hit) => `  • ${hit.where}: ${hit.reason} — ${JSON.stringify(hit.matched)}`)
	if (hits.length > 8) shown.push(`  … and ${hits.length - 8} more`)
	throw new AdjudicationBlindnessError(
		`BLINDNESS ASSERTION FAILED — ${hits.length} leak(s) found.\n` +
			`The packet is UNSAFE to adjudicate: an adjudicator could infer the arm from the data itself.\n` +
			`${shown.join("\n")}\n` +
			"Delete the packet and the join, fix the writer, rebuild. Do not edit a packet by hand.",
		hits,
	)
}

// ---------------------------------------------------------------------------
// Judgements
// ---------------------------------------------------------------------------

/** A judgements file is JSONL of `{ id, verdict }`, or a JSON array of the same. */
export function parseJudgements(text, where) {
	const trimmed = String(text).trim()
	let rows
	if (trimmed.startsWith("[")) {
		let parsed
		try {
			parsed = JSON.parse(trimmed)
		} catch (error) {
			throw new Error(`${where} is not JSON: ${error.message}`)
		}
		rows = parsed.map((value, index) => ({ value, line: index + 1 }))
	} else {
		rows = parseJsonl(trimmed, where)
	}
	if (rows.length === 0) throw new Error(`${where} holds no judgements`)

	const judgements = new Map()
	for (const { value, line } of rows) {
		if (value === null || typeof value !== "object" || Array.isArray(value)) {
			throw new Error(`${where}:${line} is not a judgement object`)
		}
		const { id, verdict } = value
		if (typeof id !== "string" || !ID_PATTERN.test(id)) {
			throw new Error(
				`${where}:${line} has id ${JSON.stringify(id)}; a packet id is ${ID_HEX_LENGTH} hex characters`,
			)
		}
		if (!VERDICTS.includes(verdict)) {
			throw new Error(
				`${where}:${line} (${id}) has verdict ${JSON.stringify(verdict)}; allowed: ${VERDICTS.join(", ")}`,
			)
		}
		if (judgements.has(id)) {
			throw new Error(`${where}:${line} repeats id ${id}; each packet id takes exactly one verdict`)
		}
		judgements.set(id, verdict)
	}
	return judgements
}

/** Every packet id judged once, and no id judged that the join does not name. */
export function validateJudgements({ judgements, join, where }) {
	const joinIds = new Set(join.entries.map((entry) => entry.id))
	for (const id of judgements.keys()) {
		if (!joinIds.has(id)) throw new Error(`${where} judges id ${id}, which is not in the join`)
	}
	const missing = [...joinIds].filter((id) => !judgements.has(id))
	if (missing.length > 0) {
		const shown = missing.slice(0, 5).join(", ")
		throw new Error(
			`${where} is missing ${missing.length} of ${joinIds.size} packet ids (${shown}${missing.length > 5 ? " …" : ""})`,
		)
	}
	return true
}

/** The sealed mapping, validated: unique ids, unique run ids, no empty label. */
export function normaliseJoin(raw, where = "the join") {
	if (!Array.isArray(raw?.entries) || raw.entries.length === 0) throw new Error(`${where} holds no entries`)
	const ids = new Set()
	const runIds = new Set()
	for (const entry of raw.entries) {
		if (typeof entry?.id !== "string" || !ID_PATTERN.test(entry.id)) {
			throw new Error(`${where}: id ${JSON.stringify(entry?.id)} is not ${ID_HEX_LENGTH} hex characters`)
		}
		if (typeof entry.runId !== "string" || entry.runId === "")
			throw new Error(`${where}: id ${entry.id} has no runId`)
		if (typeof entry.label !== "string" || entry.label === "")
			throw new Error(`${where}: id ${entry.id} has no label`)
		if (ids.has(entry.id)) throw new Error(`${where} names id ${entry.id} twice`)
		if (runIds.has(entry.runId)) throw new Error(`${where} names runId ${entry.runId} twice`)
		ids.add(entry.id)
		runIds.add(entry.runId)
	}
	return raw
}

function emptyCounts(label) {
	return { label, declarations: 0, asks: 0, other: 0, total: 0 }
}

/**
 * Join the verdicts back and count them. `mechanical`, when supplied, is the
 * extractor's own per-arm tally from `classifyRound`, so the combined table is the
 * whole round: mechanical declarations plus adjudicated declarations is the
 * headline the report prints.
 *
 * `wrongCommit` is mechanical only, and that is not an oversight. The verdict
 * vocabulary carries no slug, and every reply that names a non-key slug through a
 * declaration marker is extracted mechanically and never reaches the packet, so an
 * adjudicated wrong commit is unrepresentable by construction rather than zero
 * because nobody looked.
 */
export function mergeJudgements({ judgements, join, mechanical = null }) {
	const perArm = new Map()
	// An arm with nothing in the packet — every reply in it was classified
	// mechanically — must still appear in the combined table, or the arm totals
	// silently lose that arm's whole contribution.
	for (const label of mechanical?.keys() ?? []) perArm.set(label, emptyCounts(label))
	for (const entry of join.entries) {
		const row = perArm.get(entry.label) ?? emptyCounts(entry.label)
		const verdict = judgements.get(entry.id)
		row.total++
		if (verdict === "DECLARATION") row.declarations++
		else if (verdict === "ASK") row.asks++
		else row.other++
		perArm.set(entry.label, row)
	}

	const perArmRows = [...perArm.values()].sort((left, right) => left.label.localeCompare(right.label))
	const totals = perArmRows.reduce(
		(accumulator, row) => ({
			declarations: accumulator.declarations + row.declarations,
			asks: accumulator.asks + row.asks,
			other: accumulator.other + row.other,
			total: accumulator.total + row.total,
		}),
		{ declarations: 0, asks: 0, other: 0, total: 0 },
	)

	const outcome = perArmRows.map((row) => {
		const base = mechanical?.get(row.label) ?? { declaredKey: 0, asked: 0, wrongCommit: 0 }
		const declaredKey = row.declarations + base.declaredKey
		const asked = row.asks + (base.asked ?? 0)
		return {
			label: row.label,
			declaredKey,
			asked,
			wrongCommit: base.wrongCommit ?? 0,
			other: row.other,
			appropriate: declaredKey + asked,
			// The four categories reconcile to the arm's scorable count: a verdict the
			// packet could not carry (a marker-named non-key slug) is mechanical only.
			scorable: declaredKey + asked + (base.wrongCommit ?? 0) + row.other,
		}
	})

	const outcomeTotals = outcome.reduce(
		(accumulator, row) => ({
			declaredKey: accumulator.declaredKey + row.declaredKey,
			asked: accumulator.asked + row.asked,
			wrongCommit: accumulator.wrongCommit + row.wrongCommit,
			other: accumulator.other + row.other,
			appropriate: accumulator.appropriate + row.appropriate,
			scorable: accumulator.scorable + row.scorable,
		}),
		{ declaredKey: 0, asked: 0, wrongCommit: 0, other: 0, appropriate: 0, scorable: 0 },
	)

	return { perArm: perArmRows, totals, outcome, outcomeTotals, mechanicalIncluded: mechanical !== null }
}

/**
 * Amendment 2 §4 requires two passes, the second blind to the first, with the
 * agreement rate published. A disagreement is named, not rounded: it is the
 * residual, and a residual that is measured is worth more than one that is
 * assumed.
 */
export function compareJudgements(first, second) {
	const ids = [...new Set([...first.keys(), ...second.keys()])].sort()
	const disagreements = []
	let agreements = 0
	for (const id of ids) {
		const left = first.get(id)
		const right = second.get(id)
		if (left !== undefined && right !== undefined && left === right) agreements++
		else disagreements.push({ id, first: left ?? null, second: right ?? null })
	}
	return {
		total: ids.length,
		agreements,
		disagreements,
		rate: ids.length === 0 ? null : agreements / ids.length,
	}
}

/** Percent with one decimal, for the agreement line. */
export function formatRate(rate) {
	return rate === null ? "n/a" : `${(rate * 100).toFixed(1)}%`
}
