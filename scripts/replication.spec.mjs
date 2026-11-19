/**
 * replication.spec.mjs — pins the second-provider replication material and the
 * runner's pure mappings, without spending a call.
 *
 * WHAT IT PINS
 *   1. The OpenAI → Gemini finish-reason mapping, so `run-routing-round.mjs`
 *      needs no second rule: only `stop` is scorable, `length` is truncation.
 *   2. The usage mapping keeps the counts under the names the existing sidecars
 *      use, keeps the provider's raw object, and leaves absent fields absent.
 *   3. E20-BC is 800 entries in the cycle `B C` × 400 with 400 draws per arm, two
 *      distinct prompt hashes and 799 alternating transitions; E20C-XZ is 400
 *      entries in `X Z` × 200 with 200 per arm and 399 transitions.
 *   4. The sealed keys name `explain` for every arm and carry no line text, and
 *      the on-disk pickers are byte-identical copies of the registered ones.
 *   5. The executor takes both plans unchanged: `planShape` is "e20", the total
 *      comes from the plan, and a `--dry-run` writes every prompt.
 *   6. The runner refuses to run with an empty key before any request.
 *
 * NO MODEL CALL IS POSSIBLE HERE
 *   The runner is imported, never executed with credentials; the one child
 *   process it starts is the empty-key refusal, which fails before a request.
 *
 * Run with: node --test scripts/replication.spec.mjs
 */

import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import * as fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import { parseRoomodes } from "./lib/framing-pretest.mjs"
import { E20_BC, E20C_XZ } from "./lib/replication.mjs"
import { mapFinishReason, mapUsage } from "./lib/openai-compatible-runner.mjs"
import { planShape, registeredTotal } from "./run-routing-round.mjs"

const ROOT = path.resolve(".")
const BASE_PICKER = path.join(ROOT, "test-fixtures/frames/routing-round/C1.roomodes")

const read = (target) => fs.readFile(target, "utf-8")
const loadJson = async (target) => JSON.parse(await read(target))

async function buildReplication(module) {
	const baseText = await read(BASE_PICKER)
	const spec = module.experimentSpec(module.id)
	const fixtureSet = module.buildExperimentSet({ experimentId: module.id, baseText })
	const labelsByArm = module.labelArms(module.id, spec.defaultSeed)
	const runs = module.buildRuns({ experimentId: module.id, fixtureSet, labelsByArm })
	const plan = module.buildPlanDocument({ runs, seed: spec.defaultSeed })
	const key = module.buildAnswerKey({ fixtureSet, labelsByArm })
	const labelMap = module.buildLabelMap({ seed: spec.defaultSeed, labelsByArm })
	return { spec, fixtureSet, labelsByArm, runs, plan, key, labelMap }
}

describe("finish reason mapping", () => {
	it("maps only stop to the scorable value", () => {
		assert.equal(mapFinishReason("stop"), "STOP")
		assert.equal(mapFinishReason("STOP"), "STOP")
	})

	it("maps truncation and filtering away from STOP", () => {
		assert.equal(mapFinishReason("length"), "MAX_TOKENS")
		assert.equal(mapFinishReason("content_filter"), "SAFETY")
		assert.equal(mapFinishReason("tool_calls"), "OTHER")
		assert.equal(mapFinishReason("function_call"), "OTHER")
		assert.equal(mapFinishReason("something_new"), "OTHER")
	})

	it("keeps an absent reason absent rather than inventing STOP", () => {
		assert.equal(mapFinishReason(null), null)
		assert.equal(mapFinishReason(undefined), null)
		assert.equal(mapFinishReason(""), null)
	})
})

describe("usage mapping", () => {
	it("uses the sidecar's names and keeps the provider's raw counts", () => {
		const usage = {
			prompt_tokens: 120,
			completion_tokens: 30,
			total_tokens: 150,
			prompt_tokens_details: { cached_tokens: 20 },
			completion_tokens_details: { reasoning_tokens: 10 },
		}
		const mapped = mapUsage(usage)
		assert.equal(mapped.promptTokenCount, 120)
		assert.equal(mapped.candidatesTokenCount, 30)
		assert.equal(mapped.totalTokenCount, 150)
		assert.equal(mapped.cachedContentTokenCount, 20)
		assert.equal(mapped.thoughtsTokenCount, 10)
		assert.deepEqual(mapped.provider, usage)
	})

	it("does not turn a missing count into zero", () => {
		const mapped = mapUsage({ prompt_tokens: 7 })
		assert.equal(mapped.promptTokenCount, 7)
		assert.equal("candidatesTokenCount" in mapped, false)
		assert.equal("totalTokenCount" in mapped, false)
		assert.equal(mapUsage(null), null)
	})
})

describe("E20-BC", () => {
	it("is the plan's own cycle: B C × 400, 400 draws per arm", async () => {
		const { spec, runs, plan } = await buildReplication(E20_BC)
		assert.equal(plan.experiment, "E20-BC")
		assert.deepEqual(plan.cycle, ["B", "C"])
		assert.equal(plan.cycles, 400)
		assert.equal(runs.length, plan.cycle.length * plan.cycles)
		assert.equal(runs.length, 800)

		const perArm = new Map()
		for (const run of runs) perArm.set(run.arm, (perArm.get(run.arm) ?? 0) + 1)
		assert.equal(perArm.get("B"), 400)
		assert.equal(perArm.get("C"), 400)
		assert.deepEqual(
			spec.arms.map((arm) => `${arm.arm}:${arm.draws}`),
			["B:400", "C:400"],
		)
	})

	it("alternates every call and stays binary", async () => {
		const { runs } = await buildReplication(E20_BC)
		assert.equal(new Set(runs.map((run) => run.label)).size, 2)
		assert.equal(
			runs.filter((run, index) => index > 0 && runs[index - 1].label === run.label).length,
			0,
		)
		assert.equal(
			runs.filter((run, index) => index > 0 && runs[index - 1].label !== run.label).length,
			runs.length - 1,
		)
		assert.equal(new Set(runs.map((run) => run.promptSha256)).size, 2)
	})

	it("is the executor's e20/1 shape, with the total taken from the plan", async () => {
		const { plan } = await buildReplication(E20_BC)
		assert.equal(planShape(plan), "e20")
		assert.equal(registeredTotal(plan, "e20"), 800)
		assert.equal(plan.entries.length, 800)
		assert.equal(plan.entries.filter((entry) => !/^ARM-\d+$/.test(entry.label)).length, 0)
	})
})

describe("E20C-XZ", () => {
	it("is the plan's own cycle: X Z × 200, 200 draws per arm", async () => {
		const { runs, plan } = await buildReplication(E20C_XZ)
		assert.equal(plan.experiment, "E20C-XZ")
		assert.deepEqual(plan.cycle, ["X", "Z"])
		assert.equal(plan.cycles, 200)
		assert.equal(runs.length, 400)

		const perArm = new Map()
		for (const run of runs) perArm.set(run.arm, (perArm.get(run.arm) ?? 0) + 1)
		assert.equal(perArm.get("X"), 200)
		assert.equal(perArm.get("Z"), 200)
		assert.equal(new Set(runs.map((run) => run.promptSha256)).size, 2)
		assert.equal(registeredTotal(plan, "e20"), 400)
	})

	it("reproduces the registered X and Z pickers byte for byte", async () => {
		const { fixtureSet } = await buildReplication(E20C_XZ)
		for (const arm of fixtureSet.arms) {
			const registered = await read(path.join(ROOT, "test-fixtures/frames/e20c", `${arm.arm}.roomodes`))
			assert.equal(arm.text, registered, `${arm.arm}.roomodes must be the registered picker`)
		}
		// X is the control and must be the closing round's C1 picker verbatim.
		const control = fixtureSet.arms.find((arm) => arm.arm === "X")
		assert.equal(control.text, await read(BASE_PICKER))
	})
})

describe("sealed material and on-disk material", () => {
	for (const module of [E20_BC, E20C_XZ]) {
		it(`${module.id}: the sealed key names explain and carries no line text`, async () => {
			const { spec, key, labelMap, fixtureSet } = await buildReplication(module)
			assert.equal(key.sealed, true)
			assert.equal(key.arms.length, 2)
			for (const arm of key.arms) {
				assert.equal(arm.expectedOwner, "explain")
				assert.match(arm.armId, /^ARM-\d+$/)
			}
			const text = JSON.stringify(key)
			for (const line of Object.values(module.REGISTERED_LINES)) {
				assert.equal(text.includes(line), false)
			}
			assert.equal(labelMap.arms.length, 2)

			// The key's vocabulary is the picker's slug set, sorted, so it encodes no order.
			assert.deepEqual(key.slugVocabulary, [...key.slugVocabulary].sort())
			assert.deepEqual(key.slugVocabulary, parseRoomodes(fixtureSet.arms[0].text, "arm").map((m) => m.slug).sort())
			assert.equal(spec.dir.endsWith(path.basename(spec.dir)), true)
		})

		it(`${module.id}: what is on disk is what the derivation produces`, async () => {
			const { spec, runs, plan, key, labelMap, fixtureSet } = await buildReplication(module)
			assert.deepEqual(await loadJson(path.join(spec.dir, "plan.json")), plan)
			assert.deepEqual(await loadJson(path.join(spec.dir, "answer-key.json")), key)
			assert.deepEqual(await loadJson(path.join(spec.dir, "_label-map.json")), labelMap)
			for (const arm of fixtureSet.arms) {
				assert.equal(await read(path.join(spec.dir, `${arm.arm}.roomodes`)), arm.text)
			}
			assert.equal(runs.length, spec.cycle.length * spec.cycles)
		})
	}
})

describe("the executor accepts both plans unchanged", () => {
	for (const module of [E20_BC, E20C_XZ]) {
		it(`${module.id}: a dry-run writes every prompt`, async () => {
			const { spec, runs } = await buildReplication(module)
			const out = await fs.mkdtemp(path.join(os.tmpdir(), `replication-${module.id.toLowerCase()}-`))
			const result = spawnSync(
				process.execPath,
				["scripts/run-routing-round.mjs", "--plan", path.join(spec.dir, "plan.json"), "--out", out, "--dry-run"],
				{ cwd: ROOT, encoding: "utf-8" },
			)
			assert.equal(result.status, 0, result.stderr)
			assert.match(result.stdout, /plan matches the current derivation/)
			const written = await fs.readdir(path.join(out, "prompts"))
			assert.equal(written.length, runs.length)
			await fs.rm(out, { recursive: true, force: true })
		})
	}
})

describe("the runner refuses before a request", () => {
	it("exits non-zero with an empty key and writes nothing", async () => {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), "replication-runner-"))
		const prompt = path.join(dir, "prompt.txt")
		const out = path.join(dir, "out.txt")
		await fs.writeFile(prompt, "Reply with the single word: ok\n", "utf-8")

		const result = spawnSync(
			process.execPath,
			["scripts/lib/openai-compatible-runner.mjs", prompt, out, "no-such-model", path.join(dir, "usage"), "refusal"],
			{
				cwd: ROOT,
				encoding: "utf-8",
				env: { ...process.env, SECOND_PROVIDER_API_KEY: "", SECOND_PROVIDER_BASE_URL: "https://invalid.example" },
			},
		)
		assert.notEqual(result.status, 0)
		assert.match(result.stderr, /SECOND_PROVIDER_API_KEY is empty; refusing to call the API/)
		await assert.rejects(fs.stat(out))
		assert.deepEqual(await fs.readdir(dir), ["prompt.txt"])
		await fs.rm(dir, { recursive: true, force: true })
	})
})
