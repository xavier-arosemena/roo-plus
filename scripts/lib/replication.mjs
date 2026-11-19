/**
 * replication.mjs — the two second-provider replications of E20 (B against C) and
 * E20c (X against Z), as modules the existing executor can select by
 * `plan.experiment`.
 *
 * WHY THESE EXIST
 *   Both runs repeat a registered design against a different model, so the arm
 *   material must be the registered material verbatim: B and C are E20's arms B
 *   and C, X and Z are E20c's control and rival. Nothing is re-derived here that
 *   a registration already derives — `buildExperimentSet` delegates to
 *   `e20.mjs` / `e20c.mjs` and then keeps only the two arms the run needs, so
 *   every single-field assertion those modules make (line lengths, the
 *   byte-identical control picker, the clean two-index swap, one distinct prompt
 *   per arm) is made again for these runs.
 *
 * WHAT IS NEW, AND ONLY THIS
 *   The plan DOCUMENT is new: a two-arm cycle with its own repeat count and its
 *   own sealed answer key. The `e20/1` shape already derives its total from
 *   `cycle.length × cycles`, and the executor selects its derivation by
 *   `plan.experiment`, so no arm count is written as a constant here — each
 *   module states its cycle and its repeats, and every count below is computed
 *   from them.
 *
 *   E20-BC   cycle B C × 400 = 800 calls, 400 per arm.
 *   E20C-XZ  cycle X Z × 200 = 400 calls, 200 per arm.
 *
 * No network, no provider protocol, no key. Node 22 ESM.
 */

import * as path from "node:path"

import { FRAME_DIR, assignLabels, sha256 } from "./framing-pretest.mjs"
import { E20_LINES, buildExperimentSet as buildE20ExperimentSet, e20Brief } from "./e20.mjs"
import {
	E20C_LINE,
	buildExperimentSet as buildE20cExperimentSet,
	e20cBrief,
} from "./e20c.mjs"
import { fixedPersona } from "./routing-round.mjs"

/** The plan DOCUMENT shape the executor already reads. */
const PLAN_SCHEMA = "e20/1"

const TEMPERATURE = 0

/**
 * Build one replication module from a descriptor. The descriptor names the arms
 * and the number of repeats; every total is derived from those two values.
 */
function defineReplication({
	id,
	title,
	dirName,
	sourceModule,
	sourceDirName,
	armIds,
	drawsPerArm,
	cycles,
	seed,
	registration,
}) {
	const dir = path.join(FRAME_DIR, dirName)
	const sourceDir = path.join(FRAME_DIR, sourceDirName)
	const cycle = [...armIds]
	const arms = armIds.map((arm) => ({ arm, draws: drawsPerArm }))

	const spec = { id, title, dir, sourceDir, cycle, cycles, defaultSeed: seed, arms }

	// The frozen persona and brief the source experiment uses; taken from the same
	// constants, so a plan can never state a directive the executor refuses.
	const fixturePersona = fixedPersona()
	const briefRecord = sourceModule === "E20" ? e20Brief() : e20cBrief()

	function experimentSpec(experimentId) {
		if (experimentId !== id) throw new Error(`this module builds only ${JSON.stringify(id)}; got ${JSON.stringify(experimentId)}`)
		return spec
	}

	/** The registered material, taking only the arms this run repeats. */
	function buildExperimentSet({ experimentId, baseText }) {
		experimentSpec(experimentId)
		const source =
			sourceModule === "E20"
				? buildE20ExperimentSet({ experimentId: "E20", baseText })
				: buildE20cExperimentSet({ experimentId: "E20c", baseText })

		const byArm = new Map(source.arms.map((arm) => [arm.arm, arm]))
		const selected = armIds.map((arm) => {
			const fixture = byArm.get(arm)
			if (!fixture) throw new Error(`${id}: the source experiment has no arm ${JSON.stringify(arm)}`)
			return fixture
		})

		const hashes = new Set(selected.map((arm) => sha256(arm.prompt)))
		if (hashes.size !== selected.length) {
			throw new Error(`${id}: ${hashes.size} distinct prompts, expected ${selected.length} (one per arm)`)
		}

		return { ...source, spec, arms: selected }
	}

	/** Blind arm ids: ascending `sha256(arm + seed)`, the programme's algorithm. */
	function labelArms(experimentId, seedValue = spec.defaultSeed) {
		experimentSpec(experimentId)
		const catalogues = new Map(
			spec.arms.map((arm) => [arm.arm, { frame: arm.arm, file: path.join(spec.dir, `${arm.arm}.roomodes`), modes: [] }]),
		)
		const labelled = assignLabels(seedValue, catalogues, "ARM-")
		return new Map(labelled.map((catalogue) => [catalogue.frame, catalogue.label]))
	}

	/** The runs in the declared cycle order, asserted from the runs themselves. */
	function buildRuns({ experimentId, fixtureSet, labelsByArm }) {
		experimentSpec(experimentId)
		const byArm = new Map(fixtureSet.arms.map((arm) => [arm.arm, arm]))
		const draws = new Map(spec.arms.map((arm) => [arm.arm, 0]))
		const runs = []

		for (let repeat = 1; repeat <= spec.cycles; repeat++) {
			for (const [offset, arm] of spec.cycle.entries()) {
				const fixture = byArm.get(arm)
				if (!fixture) throw new Error(`${id}: no picker for arm ${arm}`)
				const label = labelsByArm.get(arm)
				if (!label) throw new Error(`${id}: no blind label for arm ${arm}`)

				const draw = (draws.get(arm) ?? 0) + 1
				draws.set(arm, draw)
				const runId = `${label}-d${String(draw).padStart(3, "0")}`

				runs.push({
					index: runs.length + 1,
					runId,
					label,
					arm,
					draw,
					repeat,
					cyclePosition: offset + 1,
					briefId: fixtureSet.brief.id,
					persona: fixtureSet.persona.id,
					text: fixture.prompt,
					promptSha256: sha256(fixture.prompt),
					promptBytes: Buffer.byteLength(fixture.prompt, "utf8"),
				})
			}
		}

		const expected = spec.cycle.length * spec.cycles
		if (runs.length !== expected) throw new Error(`${id}: ${runs.length} runs, expected ${expected}`)
		const counts = new Map(spec.arms.map((arm) => [arm.arm, 0]))
		for (const [position, run] of runs.entries()) {
			const arm = spec.cycle[position % spec.cycle.length]
			if (run.arm !== arm) {
				throw new Error(`${id}: run ${position + 1} is arm ${run.arm}, expected ${arm}: not the declared cycle`)
			}
			if (run.label !== labelsByArm.get(arm)) {
				throw new Error(`${id}: run ${position + 1} carries label ${run.label}, expected ${labelsByArm.get(arm)}`)
			}
			if (position > 0 && runs[position - 1].label === run.label) {
				throw new Error(`${id}: runs ${position} and ${position + 1} share an arm: the plan is blocked`)
			}
			counts.set(arm, (counts.get(arm) ?? 0) + 1)
		}
		for (const arm of spec.arms) {
			if (counts.get(arm.arm) !== arm.draws) {
				throw new Error(`${id}: arm ${arm.arm} has ${counts.get(arm.arm)} runs, expected ${arm.draws}`)
			}
		}

		return runs
	}

	/** No arm letter, no line, no owner — labels and hashes only. */
	function planEntry(run) {
		return {
			index: run.index,
			runId: run.runId,
			label: run.label,
			draw: run.draw,
			cyclePosition: run.cyclePosition,
			briefId: run.briefId,
			persona: run.persona,
			prompt: `prompts/${run.runId}.txt`,
			promptSha256: run.promptSha256,
			promptBytes: run.promptBytes,
		}
	}

	function buildPlanDocument({ runs, seed: seedValue }) {
		return {
			planSchema: PLAN_SCHEMA,
			instrument: title,
			experiment: id,
			registration,
			amendment: "Second-provider replication — same arms, interleaved cycle, no text changed",
			design:
				`${spec.arms.length} arms (${spec.arms.map((arm) => `${arm.arm} ${arm.draws}`).join(", ")}) = ` +
				`${runs.length} runs, cycle ${spec.cycle.join(" ")} repeated ${spec.cycles} times`,
			drawsPerArm: Object.fromEntries(spec.arms.map((arm) => [arm.arm, arm.draws])),
			cycle: [...spec.cycle],
			cycles: spec.cycles,
			temperature: TEMPERATURE,
			provider: null,
			model: null,
			blindSeed: seedValue,
			persona: {
				id: fixturePersona.id,
				condition: fixturePersona.condition,
				directive: fixturePersona.directive,
			},
			briefs: [{ id: briefRecord.id, text: briefRecord.text, sha256: sha256(briefRecord.text) }],
			entries: runs.map(planEntry),
		}
	}

	/** The sealed analysis key: arm id → expected owner, plus the shared vocabulary. */
	function buildAnswerKey({ fixtureSet, labelsByArm }) {
		const vocabulary = [...fixtureSet.arms[0].modes.map((mode) => mode.slug)].sort()
		for (const arm of fixtureSet.arms.slice(1)) {
			if (
				[...arm.modes.map((mode) => mode.slug)].sort().join(",") !== vocabulary.join(",")
			) {
				throw new Error(`${id}: arm ${arm.arm} does not share one slug vocabulary`)
			}
		}
		return {
			sealed: true,
			warning:
				"SEALED ANALYSIS KEY — maps blind arm ids to their expected owner and the shared picker vocabulary. " +
				"No scorer bundle may contain this file.",
			registration,
			experiment: id,
			slugVocabulary: vocabulary,
			arms: spec.arms.map((arm) => ({ armId: labelsByArm.get(arm.arm), expectedOwner: "explain" })),
		}
	}

	function buildLabelMap({ seed: seedValue, labelsByArm }) {
		return {
			sealed: true,
			warning: "SEALED — maps blind arm ids to the registered arms. No scorer bundle may contain this file.",
			blindSeed: seedValue,
			algorithm: "arm ids assigned by ascending sha256(arm + blindSeed)",
			arms: spec.arms.map((arm) => ({ armId: labelsByArm.get(arm.arm), arm: arm.arm })),
		}
	}

	return {
		id,
		experimentSpec,
		buildExperimentSet,
		labelArms,
		buildRuns,
		buildPlanDocument,
		buildAnswerKey,
		buildLabelMap,
		REGISTERED_LINES: sourceModule === "E20" ? { B: E20_LINES.B, C: E20_LINES.C } : { B: E20C_LINE },
	}
}

/** E20's B and C, interleaved, 400 draws each. */
export const E20_BC = defineReplication({
	id: "E20-BC",
	title: "E20-BC — artefact polarity on a second provider: B against C, interleaved",
	dirName: "e20-bc",
	sourceModule: "E20",
	sourceDirName: "e20",
	armIds: ["B", "C"],
	drawsPerArm: 400,
	cycles: 400,
	seed: "roo-plus-e20-bc-2026-11-18",
	registration: "docs/reviews/2026-11-13-e20-preregistration.md",
})

/** E20c's X and Z, interleaved, 200 draws each. */
export const E20C_XZ = defineReplication({
	id: "E20C-XZ",
	title: "E20c-XZ — the rival slot on a second provider: X against Z, interleaved",
	dirName: "e20c-xz",
	sourceModule: "E20c",
	sourceDirName: "e20c",
	armIds: ["X", "Z"],
	drawsPerArm: 200,
	cycles: 200,
	seed: "roo-plus-e20c-xz-2026-11-18",
	registration: "docs/reviews/2026-11-17-e20c-preregistration.md",
})

export const REPLICATIONS = [E20_BC, E20C_XZ]
