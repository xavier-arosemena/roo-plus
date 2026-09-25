/**
 * gate-sync.spec.mjs
 *
 * Regression tests for the single-source-of-truth gate chain (F-A-9).
 *
 * The defect being guarded: `docs/upstream-sync/README.md` §4.4 and
 * `docs/runbooks/upstream-sync.md` TASK 6 described DIFFERENT gate chains. The
 * runbook — the file agents must obey — substituted `pnpm lint` for the README's
 * `pnpm verify:*` re-run and dropped `pnpm test:scripts` entirely, so an agent
 * following it ran a strictly smaller gate set and nothing failed. A prose
 * "keep these in sync" note cannot catch that; these tests can, because both
 * documents and the runner read the same exported constants.
 *
 * Run with: node --test scripts/gate-sync.spec.mjs
 * (scripts/ has no vitest runner, so node:test built into Node 22 is used — same
 * as the sibling gate specs.)
 */

import * as fs from "node:fs"
import path from "node:path"
import { describe, it } from "node:test"
import assert from "node:assert/strict"

import {
	GATE_DOC_REGIONS,
	GATE_SYNC_COMMAND,
	gateRegionLines,
	restatedGateCommands,
	ROOT,
	stepArgv,
	stepScriptPath,
	SYNC_GATE_STEPS,
} from "./gate-sync.mjs"

/** The eight node gates, pinned independently of the runner (CP1-4 style). */
const EXPECTED_NODE_GATES = [
	"node scripts/verify-message-schemas.mjs",
	"node scripts/verify-upstream-code-index-alignment.mjs --strict",
	"node scripts/verify-announcement-version.mjs",
	"node scripts/verify-submodule-pin.mjs",
	"node scripts/verify-roomodes-sync.mjs",
	"node scripts/verify-locale-readmes.mjs",
	"node scripts/verify-semble-checksums.mjs --strict",
	"node scripts/verify-semble-release-coupling.mjs --strict",
]

/** The H-28 resolution steps added on top of the node gates. */
const EXPECTED_RESOLUTION_INTEGRITY_GATE = "node scripts/verify-resolutions.mjs --integrity"
const EXPECTED_TYPE_CHECK_GATE = "pnpm check-types"

/** Steps that legitimately run no `scripts/…mjs` file. */
const NON_NODE_STEP_COMMANDS = new Set(["pnpm run test:scripts", EXPECTED_TYPE_CHECK_GATE])

function readDoc(relativePath) {
	return fs.readFileSync(path.join(ROOT, relativePath), "utf8")
}

describe("gate:sync — the canonical list is the eight node gates plus the scripts unit tests", () => {
	it("pins the step list independently (a dropped gate fails BY NAME)", () => {
		assert.deepEqual(SYNC_GATE_STEPS.map((step) => step.command), [
			...EXPECTED_NODE_GATES,
			"pnpm run test:scripts",
			EXPECTED_RESOLUTION_INTEGRITY_GATE,
			EXPECTED_TYPE_CHECK_GATE,
		])
	})

	it("runs the cheap resolution-integrity scan before the slow type check", () => {
		const ids = SYNC_GATE_STEPS.map((step) => step.id)
		assert.ok(
			ids.indexOf("resolution-integrity") < ids.indexOf("check-types"),
			"the integrity scan must run before the type check so a marker fails fast",
		)
	})

	it("has unique step ids and no duplicate commands", () => {
		const ids = SYNC_GATE_STEPS.map((step) => step.id)
		assert.equal(new Set(ids).size, ids.length, "step ids must be unique")
		const commands = SYNC_GATE_STEPS.map((step) => step.command)
		assert.equal(new Set(commands).size, commands.length, "a gate must not be run twice")
	})

	it("every node-gate step's script exists (a renamed gate must not slip through)", () => {
		for (const step of SYNC_GATE_STEPS) {
			const script = stepScriptPath(step.command)
			if (!script) {
				assert.ok(
					NON_NODE_STEP_COMMANDS.has(step.command),
					`step "${step.id}" must reference an existing scripts/ file or be a declared non-node step`,
				)
				continue
			}
			assert.ok(fs.existsSync(path.join(ROOT, script)), `step "${step.id}" references missing ${script}`)
		}
	})

	it("splits each command into argv without a shell", () => {
		assert.deepEqual(stepArgv("node scripts/verify-roomodes-sync.mjs", "linux"), [
			"node",
			"scripts/verify-roomodes-sync.mjs",
		])
		assert.deepEqual(stepArgv("pnpm run test:scripts", "win32"), ["pnpm.cmd", "run", "test:scripts"])
	})
})

describe("gate:sync — both documents reference the aggregate and never restate a divergent list", () => {
	it("the README gate section references `pnpm gate:sync`", () => {
		const region = GATE_DOC_REGIONS.find((entry) => entry.path === "docs/upstream-sync/README.md")
		const text = gateRegionLines(readDoc(region.path), region).join("\n")
		assert.match(
			text,
			new RegExp(GATE_SYNC_COMMAND.replace(":", "\\:")),
			"the README must send the reader to the aggregate",
		)
	})

	it("the runbook TASK 6 references `pnpm gate:sync`", () => {
		const region = GATE_DOC_REGIONS.find((entry) => entry.path === "docs/runbooks/upstream-sync.md")
		const text = gateRegionLines(readDoc(region.path), region).join("\n")
		assert.match(
			text,
			new RegExp(GATE_SYNC_COMMAND.replace(":", "\\:")),
			"TASK 6 must send the reader to the aggregate",
		)
	})

	it("neither document restates a canonical gate command (the divergence this closes)", () => {
		for (const region of GATE_DOC_REGIONS) {
			const restated = restatedGateCommands(readDoc(region.path), region)
			assert.deepEqual(
				restated,
				[],
				`${region.path} restates gate command(s) instead of referencing \`${GATE_SYNC_COMMAND}\`: ` +
					restated.join(" · "),
			)
		}
	})

	// Discriminating on purpose: the previous README §4.4 listed every node gate,
	// so this synthetic document is exactly the shape the check must reject. A
	// check that cannot fail on the defect it documents is not a check.
	it("the divergence check fails on a restated list (negative control)", () => {
		const region = { path: "synthetic.md", anchor: /^GATES$/, boundary: /^END$/ }
		const markdown = [
			"GATES",
			"```bash",
			...EXPECTED_NODE_GATES,
			"pnpm test:scripts",
			"```",
			"Follow the runbook.",
			"END",
		].join("\n")
		const restated = restatedGateCommands(markdown, region)
		assert.equal(restated.length, EXPECTED_NODE_GATES.length, "every restated node gate must be reported")
		assert.ok(restated.includes("node scripts/verify-roomodes-sync.mjs"))
	})

	it("the divergence check ignores a trailing comment on the aggregate line (positive control)", () => {
		const region = { path: "synthetic.md", anchor: /^GATES$/, boundary: /^END$/ }
		const markdown = [
			"GATES",
			`${GATE_SYNC_COMMAND}   # the eight node gates + pnpm test:scripts, in order`,
			"END",
		].join("\n")
		assert.deepEqual(restatedGateCommands(markdown, region), [])
	})

	it("throws instead of passing vacuously when the anchor is gone", () => {
		const region = { path: "synthetic.md", anchor: /^GATES$/, boundary: /^END$/ }
		assert.throws(() => gateRegionLines("no anchor here", region), /no line matches the gate-chain anchor/)
	})
})
