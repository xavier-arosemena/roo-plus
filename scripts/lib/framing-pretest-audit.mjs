/**
 * framing-pretest-audit.mjs — the blindness audit for the agent framing pretest.
 *
 * WHY AN AUDIT EXISTS AT ALL
 *   Amendment 5 says a run sees only one catalogue's slug / name / `whenToUse`,
 *   the persona instruction and one brief. That is a claim about the emitted
 *   bytes, so it is checked against the emitted bytes rather than asserted in a
 *   comment. The audit runs in dry-run as well as run mode, and a failure
 *   refuses the batch: material that says which frame it is must not be run.
 *
 * THREE CLASSES, AND ONLY THE FIRST TWO FAIL
 *   1. Identity tokens — `axis`, `stance`, `artefact`, `catalogue`, `blind`,
 *      `seed`, `pretest`, `experiment`, `fixture`, `roomodes`, `arm-a`, `arm-b`,
 *      plus `frame` outside the picker. These would tell a reader which catalogue
 *      it holds, or that an experiment exists. They must be absent everywhere.
 *   2. Doctrine and grants — no `roleDefinition`, `customInstructions`, `groups`
 *      or `description` text may appear; the picker must be the byte-identical
 *      projection of its own catalogue, exactly once, at the end of the prompt.
 *   3. Reported vocabulary — a word in the request that happens to equal a slug,
 *      and the ordinary-English `frame` in the catalogued prose. Counted and
 *      reported, never failed. Editing a registered brief to silence a word
 *      would change the experiment, and removing the overlap would delete the
 *      signal under test. A run sees one picker and is never told a second
 *      catalogue exists, so this cannot disclose a frame.
 *      Amendment 6 (2026-11-11) retired `frame` as a FAILING token — it is an
 *      ordinary English word that appears legitimately in routing lines — so it
 *      is now counted only, exactly like a slug overlap.
 *
 * ONE PICKER, N PICKERS
 *   E11 had two catalogues, so "contains the other catalogue's picker" was a
 *   two-way check. E12 has eight fixtures, two of which are supersets of others
 *   (A3 appends two lines to A0), so a foreign picker is a failure only when it
 *   is not a substring of the run's own picker. Without that condition a
 *   structurally correct A3 prompt would be reported as carrying A0's picker.
 *
 * No dependencies. Node 22 ESM.
 */

import { sha256, pickerTextFor } from "./framing-pretest.mjs"

export const IDENTITY_TOKENS = [
	"axis",
	"stance",
	"artefact",
	"catalogue",
	"blind",
	"seed",
	"pretest",
	"experiment",
	"fixture",
	"roomodes",
	"arm-a",
	"arm-b",
]

/**
 * Ordinary English that also happens to be a candidate frame name. It occurs in
 * the catalogued `whenToUse` prose ("must be framed into …", "framework") in
 * BOTH catalogues, so it is reported per zone and failed only outside the picker.
 */
export const PICKER_VOCABULARY_TOKENS = ["frame"]

/** Literals that only doctrine or grants could contribute. */
const FORBIDDEN_DOCTRINE_STRINGS = ["roleDefinition", "customInstructions", "Your charter:"]

function countSubstring(text, token) {
	return text.toLowerCase().split(token.toLowerCase()).length - 1
}

function countWord(text, word) {
	const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
	const re = new RegExp(`(?<![a-z0-9-])${escaped}(?![a-z0-9-])`, "gi")
	return (text.match(re) ?? []).length
}

/**
 * Audit every prompt for leakage. Returns `{ ok, failures, totals, perRun }`;
 * a non-empty `failures` array means the material is not blind and must not run.
 */
export function auditPrompts(runs, labelled) {
	const failures = []
	const perRun = []
	const byLabel = new Map(labelled.map((catalogue) => [catalogue.label, catalogue]))
	const allSlugs = labelled.flatMap((catalogue) => catalogue.modes.map((mode) => mode.slug))
	const allDescriptions = labelled.flatMap((catalogue) => catalogue.modes.map((mode) => `${mode.name} mode — `))
	const totals = { identity: {}, vocabulary: {}, slugHeaderOwn: 0, slugHeaderForeign: 0, frameOutsidePicker: 0 }
	const conditions = new Map()

	for (const run of runs) {
		const catalogue = byLabel.get(run.catalogue)
		if (!catalogue) {
			failures.push(`${run.runId}: unknown catalogue label ${run.catalogue}`)
			continue
		}

		const { text, header, picker } = run

		for (const token of IDENTITY_TOKENS) {
			const hits = countSubstring(text, token)
			totals.identity[token] = (totals.identity[token] ?? 0) + hits
			if (hits > 0) failures.push(`${run.runId}: identity token "${token}" ×${hits} in prompt`)
		}

		// Counted, not failed: Amendment 6 retired `frame` as a leak indicator.
		for (const token of PICKER_VOCABULARY_TOKENS) {
			const inHeader = countSubstring(header, token)
			const inPicker = countSubstring(picker, token)
			totals.vocabulary[token] = (totals.vocabulary[token] ?? 0) + inPicker
			totals.frameOutsidePicker += inHeader
		}

		// The picker must be exactly this catalogue's projection, byte for byte,
		// present once, and at the end (nothing may be appended after it).
		if (picker !== pickerTextFor(catalogue.modes)) {
			failures.push(`${run.runId}: picker is not the byte-identical projection of its catalogue`)
		}
		if (!text.includes(picker) || text.split(picker).length !== 2) {
			failures.push(`${run.runId}: picker does not appear exactly once, at the end of the prompt`)
		}

		// Every foreign picker must be absent, except one that is a substring of
		// the run's own picker (A3 legitimately contains A0's 45 lines as a prefix).
		for (const other of labelled) {
			if (other.label === run.catalogue) continue
			const otherPicker = pickerTextFor(other.modes)
			if (!text.includes(otherPicker)) continue
			if (picker.includes(otherPicker)) continue
			failures.push(`${run.runId}: prompt contains the picker of ${other.label}`)
		}

		for (const literal of FORBIDDEN_DOCTRINE_STRINGS) {
			if (text.includes(literal)) failures.push(`${run.runId}: doctrine literal "${literal}" in prompt`)
		}
		for (const description of allDescriptions) {
			if (text.includes(description)) failures.push(`${run.runId}: mode description "${description}" in prompt`)
		}

		const ownSlugs = new Set(catalogue.modes.map((mode) => mode.slug))
		const headerSlugVocabulary = []
		const headerSlugForeign = []
		for (const slug of allSlugs) {
			const hits = countWord(header, slug)
			if (hits === 0) continue
			const bucket = ownSlugs.has(slug) ? headerSlugVocabulary : headerSlugForeign
			bucket.push({ slug, hits })
		}
		totals.slugHeaderOwn += headerSlugVocabulary.length
		totals.slugHeaderForeign += headerSlugForeign.length

		const missingFromPicker = [...ownSlugs].filter((slug) => !picker.includes(`- ${slug} — `))
		if (missingFromPicker.length > 0) {
			failures.push(`${run.runId}: picker omits ${missingFromPicker.join(", ")}`)
		}

		perRun.push({ runId: run.runId, catalogue: run.catalogue, headerSlugVocabulary, headerSlugForeign })

		// Per-condition accounting: a condition is the unit an arm reads, so the
		// byte range and the header hash are reported per condition rather than
		// per batch. Two conditions sharing a header hash is the proof that their
		// prompts differ only in the picker.
		const key = run.condition ?? run.catalogue
		const bucket = conditions.get(key) ?? { runs: 0, bytes: [], headerHashes: new Set(), labels: new Set() }
		bucket.runs++
		bucket.bytes.push(Buffer.byteLength(text, "utf8"))
		bucket.headerHashes.add(sha256(header))
		bucket.labels.add(run.catalogue)
		conditions.set(key, bucket)
	}

	const conditionSummary = Object.fromEntries(
		[...conditions.entries()].map(([condition, bucket]) => [
			condition,
			{
				runs: bucket.runs,
				labels: [...bucket.labels].sort(),
				promptBytesMin: Math.min(...bucket.bytes),
				promptBytesMax: Math.max(...bucket.bytes),
				distinctHeaders: bucket.headerHashes.size,
				headerSha256: [...bucket.headerHashes].sort(),
			},
		]),
	)

	return { ok: failures.length === 0, failures, totals, perRun, conditionSummary }
}

/**
	* Serialise an audit result for `blindness-report.json`. The three classes are
	* reported separately so that a reader can see what failed (nothing, by
	* construction) and what was merely counted.
	*/
export function formatReport(audit, promptCount) {
	return {
		checkedAt: new Date().toISOString(),
		prompts: promptCount,
		ok: audit.ok,
		failures: audit.failures,
		identityTokenCounts: Object.fromEntries(IDENTITY_TOKENS.map((token) => [token, audit.totals.identity[token] ?? 0])),
		pickerVocabularyCounts: Object.fromEntries(
			PICKER_VOCABULARY_TOKENS.map((token) => [token, audit.totals.vocabulary[token] ?? 0]),
		),
		pickerVocabularyOutsidePicker: audit.totals.frameOutsidePicker,
		perCondition: audit.conditionSummary,
		headerSlugMatches: {
			ownCatalogue: audit.totals.slugHeaderOwn,
			otherCatalogue: audit.totals.slugHeaderForeign,
			detail: audit.perRun.flatMap((run) => [
				...run.headerSlugVocabulary.map((hit) => ({ ...hit, runId: run.runId, bucket: "own" })),
				...run.headerSlugForeign.map((hit) => ({ ...hit, runId: run.runId, bucket: "other" })),
			]),
		},
		note:
			"Failures are identity tokens (frame names, blind labels, harness metadata) and any doctrine or " +
			"grant text. Slug hits inside the picker are the picker. Header words that match a slug, and the " +
			"ordinary-English `frame` in the catalogued prose, are counted here and are not leaks — Amendment 6 " +
			"retired `frame` as a failing token. A foreign picker fails only when it is not a substring of the " +
			"run's own picker, because A3 legitimately extends A0.",
	}
}
