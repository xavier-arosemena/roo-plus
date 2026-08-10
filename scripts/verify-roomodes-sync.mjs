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
  SOURCE_DIR,
  ROOMODES_PATH,
} from "./sync-custom-modes.mjs"
import { logStep, logInfo, logOk, logError, logSuccess } from "./lib/logger.mjs"

// Hierarchical tag identifying this process.
const TAG = "VERIFY:ROOMODES-SYNC"

async function main() {
  let sourceDirExists = true
  try {
    await fs.access(SOURCE_DIR)
  } catch {
    sourceDirExists = false
  }

  if (!sourceDirExists) {
    logError(TAG, "custom-modes submodule is NOT initialized (custom_modes.d/ missing).")
    logError(TAG, "A missing submodule is a packaging hazard: sync-custom-modes.mjs would")
    logError(TAG, "silently reuse stale committed artifacts and the VSIX could ship modes")
    logError(TAG, "without descriptions. Initialize it and re-run:")
    logError(TAG, "git submodule update --init --recursive custom-modes")
    process.exit(1)
  }
  logOk(TAG, "custom-modes submodule is initialized")

  logStep(TAG, "Regenerating .roomodes from the custom-modes submodule")
  const manifest = await loadManifest()
  const allAgents = await scanAllAgents()
  const curated = filterCuratedAgents(allAgents, manifest)
  const entries = curated.map(({ agent }) => convertToRoomodesEntry(agent))
  const regenerated = generateRoomodesYaml([], entries)
  logInfo(TAG, `regenerated from ${entries.length} curated modes`)

  let committed
  try {
    committed = await fs.readFile(ROOMODES_PATH, "utf-8")
  } catch {
    logError(TAG, `could not read ${ROOMODES_PATH}`)
    process.exit(1)
  }

  if (regenerated === committed) {
    logSuccess(TAG, `.roomodes is in sync with the custom-modes submodule (${entries.length} curated modes)`)
    process.exit(0)
  }

  logError(TAG, ".roomodes is OUT OF SYNC with the custom-modes submodule.")
  logError(TAG, "Regenerate with: node scripts/sync-custom-modes.mjs")
  process.exit(1)
}

main().catch((err) => {
  logError(TAG, `verification failed: ${err.message}`)
  process.exit(1)
})
