/**
 * verify-submodule-pin.spec.mjs
 *
 * Unit tests for the description-completeness logic of
 * scripts/verify-submodule-pin.mjs (the submodule pin gate).
 *
 * Run with: node --test scripts/verify-submodule-pin.spec.mjs
 * (scripts/ has no vitest runner, so node:test built into Node 22 is used —
 *  same as scripts/sync-custom-modes.spec.mjs.)
 */

import { test } from "node:test"
import assert from "node:assert/strict"
import * as fs from "node:fs"

import { assessDescription, checkCuratedDescriptions } from "./verify-submodule-pin.mjs"
import { AGENTS_DIR } from "./sync-custom-modes.mjs"

test("assessDescription accepts a real description", () => {
  const agent = { slug: "x", description: "A real description.", roleDefinition: "You are an expert." }
  assert.deepEqual(assessDescription(agent), { ok: true, reason: "" })
})

test("assessDescription flags an empty/missing description", () => {
  const agent = { slug: "x", description: "   ", roleDefinition: "You are an expert." }
  const verdict = assessDescription(agent)
  assert.equal(verdict.ok, false)
  assert.match(verdict.reason, /empty|missing/i)
})

test("assessDescription flags a description absent entirely", () => {
  const agent = { slug: "x", roleDefinition: "You are an expert." }
  const verdict = assessDescription(agent)
  assert.equal(verdict.ok, false)
  assert.match(verdict.reason, /empty|missing/i)
})

test("assessDescription flags a clone of roleDefinition", () => {
  const agent = { slug: "x", description: "You are an expert.", roleDefinition: "You are an expert." }
  const verdict = assessDescription(agent)
  assert.equal(verdict.ok, false)
  assert.match(verdict.reason, /clone/i)
})

test("assessDescription normalizes whitespace before comparing", () => {
  // Same text, different whitespace — still treated as a clone.
  const agent = { slug: "x", description: "You  are\nan expert.", roleDefinition: "You are an expert." }
  const verdict = assessDescription(agent)
  assert.equal(verdict.ok, false)
})

test("checkCuratedDescriptions: all curated modes carry a real description", async (t) => {
  let agentsDirExists = true
  try {
    await fs.promises.access(AGENTS_DIR)
  } catch {
    agentsDirExists = false
  }
  if (!agentsDirExists) {
    t.skip("custom-modes submodule not initialized in this environment")
    return
  }
  const result = await checkCuratedDescriptions()
  assert.equal(result.ok, true)
  assert.ok(result.total > 0)
})
