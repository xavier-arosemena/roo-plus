/**
 * sync-custom-modes.spec.mjs
 *
 * Unit tests for the SOURCE-WINS merge semantics in scripts/sync-custom-modes.mjs.
 *
 * Regression coverage for architecture review RC-3: the `.roomodes` merge used
 * to give existing entries priority on slug conflict, so stale committed entries
 * (missing/old descriptions) were NEVER refreshed by re-running the sync. Now
 * freshly generated entries (from the curated agent source) must win, while
 * existing modes whose slug is absent from the source are preserved as manual
 * additions.
 *
 * Run with: node --test scripts/sync-custom-modes.spec.mjs
 * (scripts/ has no vitest runner, so node:test built into Node 22 is used —
 * no new dependencies or configuration, same as semble-smoke.spec.mjs)
 */

import { describe, it } from "node:test"
import assert from "node:assert/strict"

import { mergeRoomodesModes, generateRoomodesYaml } from "./sync-custom-modes.mjs"

const source = [
	{ slug: "architect", name: "🏗️ Architect", description: "Designs scalable system architectures." },
	{ slug: "code", name: "💻 Code", description: "Writes clean, production-ready code." },
]

describe("mergeRoomodesModes (source-wins merge semantics)", () => {
	it("refreshes an existing entry on slug conflict (source wins)", () => {
		// Existing `.roomodes` entry has a STALE/missing description; source has the
		// fresh description. The source entry must replace the existing one.
		const existing = [
			{ slug: "architect", name: "🏗️ Architect" }, // stale: no description
		]
		const { merged, replaced, preserved } = mergeRoomodesModes(existing, source)

		assert.equal(replaced.length, 1)
		assert.equal(replaced[0].slug, "architect")
		assert.equal(preserved.length, 0)

		const bySlug = new Map(merged.map((m) => [m.slug, m]))
		assert.equal(bySlug.get("architect").description, "Designs scalable system architectures.")
		assert.equal(merged.length, 2)
	})

	it("preserves existing modes whose slug is NOT in the source (manual additions)", () => {
		const existing = [
			{ slug: "manual-mode", name: "Manual Mode", description: "Hand-written mode." },
		]
		const { merged, replaced, preserved } = mergeRoomodesModes(existing, source)

		assert.equal(replaced.length, 0)
		assert.equal(preserved.length, 1)
		assert.equal(preserved[0].slug, "manual-mode")
		assert.equal(merged[0].slug, "manual-mode") // extras first
		assert.equal(merged.length, 3)
	})

	it("produces byte-identical output to regenerating from scratch when there are no extras", () => {
		const existing = source.map((m) => ({ ...m })) // existing mirrors source
		const fromExisting = generateRoomodesYaml(existing, source)
		const fromScratch = generateRoomodesYaml([], source)
		assert.equal(fromExisting, fromScratch)
	})

	it("is idempotent — merging the merged result again yields the same output", () => {
		const existing = [
			{ slug: "architect", name: "🏗️ Architect" }, // stale
			{ slug: "manual-mode", name: "Manual Mode" }, // preserved
		]
		const first = mergeRoomodesModes(existing, source).merged
		const firstYaml = generateRoomodesYaml(existing, source)
		// Re-run with the previous output as the "existing" state: no churn.
		const second = mergeRoomodesModes(first, source).merged
		const secondYaml = generateRoomodesYaml(first, source)
		assert.equal(secondYaml, firstYaml)
		assert.deepEqual(second.map((m) => m.slug), first.map((m) => m.slug))
	})
})
