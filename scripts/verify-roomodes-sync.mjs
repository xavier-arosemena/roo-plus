#!/usr/bin/env node

/**
 * verify-roomodes-sync.mjs
 *
 * Fails (exit 1) when the committed parent `.roomodes` is NOT reproducible from
 * the `custom-modes` submodule content at its pinned commit.
 *
 * It reuses sync-custom-modes.mjs's own generation pipeline to produce `.roomodes`
 * FROM SCRATCH (empty existing modes + the curated manifest), then compares the
 * result byte-for-byte against the committed `.roomodes`. Any drift means the
 * shipped product is no longer derivable from the submodule.
 *
 * Usage:
 *   node scripts/verify-roomodes-sync.mjs        # exit 0 = in sync, exit 1 = drift
 *
 * CI wiring: run after `git submodule update --init` so the submodule is checked
 * out at its pinned commit, then run this script. On failure, regenerate with:
 *   node scripts/sync-custom-modes.mjs
 * and commit `.roomodes` + the submodule together.
 */

import * as fs from "node:fs/promises"
import {
  loadManifest,
  scanAllAgents,
  filterCuratedAgents,
  convertToRoomodesEntry,
  generateRoomodesYaml,
  AGENTS_DIR,
  ROOMODES_PATH,
} from "./sync-custom-modes.mjs"

async function main() {
  let agentsDirExists = true
  try {
    await fs.access(AGENTS_DIR)
  } catch {
    agentsDirExists = false
  }

  if (!agentsDirExists) {
    console.log("⚠ custom-modes/agents not found (submodule not initialized) — skipping check")
    process.exit(0)
  }

  const manifest = await loadManifest()
  const allAgents = await scanAllAgents()
  const curated = filterCuratedAgents(allAgents, manifest)
  const entries = curated.map(({ agent }) => convertToRoomodesEntry(agent))
  const regenerated = generateRoomodesYaml([], entries)

  let committed
  try {
    committed = await fs.readFile(ROOMODES_PATH, "utf-8")
  } catch {
    console.error(`❌ Could not read ${ROOMODES_PATH}`)
    process.exit(1)
  }

  if (regenerated === committed) {
    console.log(`✅ .roomodes is in sync with the custom-modes submodule (${entries.length} curated modes)`)
    process.exit(0)
  }

  console.error("❌ .roomodes is OUT OF SYNC with the custom-modes submodule.")
  console.error("   Regenerate with: node scripts/sync-custom-modes.mjs")
  process.exit(1)
}

main().catch((err) => {
  console.error("❌ Verify failed:", err.message)
  process.exit(1)
})
