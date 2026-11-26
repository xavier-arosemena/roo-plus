/**
 * mode-probe-gate.mjs — a model-free routing probe over the rendered picker.
 *
 * WHAT THIS MEASURES, AND WHAT IT DOES NOT
 *   It ranks the catalogue the way a *retrieval* selector would: BM25 over the
 *   three fields a mode line is built from — name, slug, `whenToUse` — exactly
 *   the text `getModesSection()` renders. It therefore measures one thing our
 *   model benchmark cannot measure cheaply and repeatedly: whether a cataloged
 *   line is discriminable at all, and whether an edit moves the answer.
 *
 *   It does NOT model the model. There is no commit-versus-ask, no position, no
 *   provider variance. A rate from this file is a statement about text overlap;
 *   quoting it as a routing result would repeat the construct error the routing
 *   report records in its §3.7. Every rate this gate prints carries that label.
 *
 * THE TWO SETS
 *   - `gate` probes have one defensible owner (or a small allowed set). The gate
 *     FAILS when the top-1 entry is outside the allowed set ("wrong owner") or no
 *     allowed entry appears in the top 3 ("miss").
 *   - `report` probes are deliberately ambiguous — the screened briefs from the
 *     experiment log. Their answers are printed and summarised; they never fail
 *     the gate, because an ambiguous brief's top-1 is an observation about the
 *     catalogue, not a defect.
 *
 * THE BASELINE IS THE REGRESSION CONTRACT
 *   A baseline records each gate probe's top-1 and the catalogue/probe digests.
 *   Comparing against it reports `changed-top1` per probe and fails when a line
 *   edit moves an answer. Without a baseline the run still checks owners.
 */

import { createHash } from "node:crypto"

export const SCHEMA_VERSION = "ecc.mode-probe-gate.v1"
export const DEFAULT_TOPK = 3

/** Function words only. Content words are never dropped: "why", "how", "code",
 * "test" and "api" all discriminate in this catalogue. "why" is deliberately
 * kept even though it is a question word: it is the term that separates
 * `explain` from `debug` in this catalogue's own lines, and every screened brief
 * in the experiment log opens with it. */
const STOP_WORDS = new Set(
	`a an and are as at be been before between both but by can could did do does doing for from had has have if in into is it its may might must not of on or our over so than that the their them then there these they this those to too under up was were what when where which while who whom will with within without would you your`.split(
		" ",
	),
)

/** Lowercase word tokens with a light, stated stemmer: plural "s"/"ies", then
 * "ing"/"ed". No synonyms, no alias table — an alias table would encode the
 * answer and make the probe unfalsifiable. */
export function tokenize(text) {
	const words = String(text ?? "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.trim()
		.split(/\s+/)
		.filter(Boolean)
	return words
		.filter((word) => !STOP_WORDS.has(word) && (word.length >= 3 || ["ai", "db", "ci", "cve", "ui"].includes(word)))
		.map((word) => {
			if (word.endsWith("ies") && word.length > 4) return `${word.slice(0, -3)}y`
			if (word.endsWith("ss")) return word
			if (word.endsWith("s") && word.length > 3) return word.slice(0, -1)
			if (word.endsWith("ing") && word.length > 5) return word.slice(0, -3)
			if (word.endsWith("ed") && word.length > 5) return word.slice(0, -2)
			return word
		})
}

/** The text a picker line exposes: name, slug and whenToUse, nothing else. */
export function documentText(entry) {
	return `${entry.name} ${entry.slug.replace(/-/g, " ")} ${entry.whenToUse}`
}

/**
 * Build a BM25 index over catalogue entries.
 * @param {Array<{slug: string, name: string, whenToUse: string}>} entries
 * @param {{k1?: number, b?: number}} [options]
 */
export function buildIndex(entries, { k1 = 1.2, b = 0.75 } = {}) {
	const documents = entries.map((entry) => {
		const tokens = tokenize(documentText(entry))
		const tf = new Map()
		for (const token of tokens) tf.set(token, (tf.get(token) ?? 0) + 1)
		return { entry, tf, length: tokens.length }
	})
	const averageLength = documents.reduce((sum, doc) => sum + doc.length, 0) / (documents.length || 1)
	const documentFrequency = new Map()
	for (const doc of documents) for (const token of doc.tf.keys()) documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1)
	const total = documents.length
	const idf = (token) => {
		const df = documentFrequency.get(token) ?? 0
		return Math.log(1 + (total - df + 0.5) / (df + 0.5))
	}
	return { documents, averageLength, idf, k1, b, total }
}

/**
 * Rank entries for one query. Ties break on slug ascending, so the order is a
 * function of the catalogue and the query only — never of file order.
 */
export function rank(index, query, { limit = 5 } = {}) {
	const queryTokens = tokenize(query)
	const scored = index.documents.map((doc) => {
		let score = 0
		const matched = []
		for (const token of new Set(queryTokens)) {
			const frequency = doc.tf.get(token) ?? 0
			if (frequency === 0) continue
			matched.push(token)
			const norm = frequency + index.k1 * (1 - index.b + (index.b * doc.length) / (index.averageLength || 1))
			score += index.idf(token) * ((frequency * (index.k1 + 1)) / norm)
		}
		return { slug: doc.entry.slug, score: Number(score.toFixed(6)), matchedTokens: matched.sort() }
	})
	scored.sort((left, right) => right.score - left.score || left.slug.localeCompare(right.slug))
	return scored.slice(0, limit).filter((row) => row.score > 0)
}

/** Tokens of name and slug only — the "anchor" surface. A line can describe a
 * job in `whenToUse` and still be unreachable by the words a user types; that
 * distinction is what separates a failing gate from a catalogue coverage gap. */
function nameSlugTokens(entry) {
	return new Set(tokenize(`${entry.name} ${entry.slug.replace(/-/g, " ")}`))
}

/** Compare one probe's ranking with its allowed owner set.
 * @param {object} probe
 * @param {Array<{slug: string, score: number}>} ranking
 * @param {Map<string, Set<string>>} anchors slug -> name/slug tokens
 */
export function judgeProbe(probe, ranking, anchors = new Map()) {
	const allowed = new Set(probe.expected)
	const top1 = ranking[0]?.slug ?? null
	const top3 = ranking.slice(0, 3).map((row) => row.slug)
	const second = ranking[1]?.score ?? 0
	const first = ranking[0]?.score ?? 0
	const queryTokens = tokenize(probe.query)
	const reachable = probe.expected.some((slug) => {
		const anchor = anchors.get(slug)
		return anchor ? queryTokens.some((token) => anchor.has(token)) : false
	})
	return {
		id: probe.id,
		set: probe.set,
		query: probe.query,
		expected: probe.expected,
		top1,
		top3,
		hit1: top1 !== null && allowed.has(top1),
		hit3: top3.some((slug) => allowed.has(slug)),
		wrongOwner: top1 !== null && !allowed.has(top1),
		reachable,
		top1Matched: ranking[0]?.matchedTokens ?? [],
		margin: second > 0 ? Number((first / second).toFixed(2)) : null,
	}
}

export function digestOf(value) {
	return createHash("sha256").update(JSON.stringify(value)).digest("hex")
}

/**
 * Run the gate.
 * @param {{catalogue: {entries: Array, digest: string}, probes: {probes: Array, digest?: string}, baseline?: object|null, topk?: number}} input
 */
export function runGate({ catalogue, probes, baseline = null, topk = DEFAULT_TOPK }) {
	const index = buildIndex(catalogue.entries)
	const anchors = new Map(catalogue.entries.map((entry) => [entry.slug, nameSlugTokens(entry)]))
	const rows = probes.probes.map((probe) => judgeProbe(probe, rank(index, probe.query, { limit: Math.max(topk, 3) }), anchors))
	const gateRows = rows.filter((row) => row.set === "gate")
	const anchoredRows = gateRows.filter((row) => row.reachable)
	const unreachableRows = gateRows.filter((row) => !row.reachable)
	const reportRows = rows.filter((row) => row.set === "report")
	const breaches = []
	for (const row of anchoredRows) {
		if (row.wrongOwner) breaches.push({ id: row.id, code: "wrong-owner", top1: row.top1, expected: row.expected })
		else if (!row.hit3) breaches.push({ id: row.id, code: "no-owner-in-top3", top3: row.top3, expected: row.expected })
	}
	const changed = []
	if (baseline) {
		if (baseline.catalogueDigest !== catalogue.digest) {
			breaches.push({ code: "catalogue-digest-changed", expected: baseline.catalogueDigest, actual: catalogue.digest })
		}
		for (const row of gateRows) {
			const was = baseline.top1?.[row.id]
			if (was !== undefined && was !== row.top1) changed.push({ id: row.id, was, now: row.top1 })
		}
		if (changed.length > 0) breaches.push({ code: "changed-top1", probes: changed.map((row) => row.id) })
	}
	const rate = (rows, key) => (rows.length ? Number((rows.filter((row) => row[key]).length / rows.length).toFixed(3)) : null)
	return {
		schemaVersion: SCHEMA_VERSION,
		construct: "BM25 over name+slug+whenToUse; a retrieval proxy, not a model result",
		catalogueDigest: catalogue.digest,
		probesDigest: probes.digest ?? digestOf(probes.probes),
		topk,
		status: breaches.length ? "fail" : "pass",
		summary: {
			gate: {
				n: gateRows.length,
				anchored: anchoredRows.length,
				reachability: Number((anchoredRows.length / (gateRows.length || 1)).toFixed(3)),
				hit1Rate: rate(anchoredRows, "hit1"),
				hit3Rate: rate(anchoredRows, "hit3"),
				wrongOwners: anchoredRows.filter((row) => row.wrongOwner).length,
			},
			unreachable: unreachableRows.map((row) => row.id),
			report: { n: reportRows.length, hit1Rate: rate(reportRows, "hit1"), hit3Rate: rate(reportRows, "hit3") },
			changedTop1: changed,
		},
		rows,
		breaches,
	}
}
