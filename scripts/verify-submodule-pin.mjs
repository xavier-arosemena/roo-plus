#!/usr/bin/env node

/**
 * verify-submodule-pin.mjs
 *
 * PRE-BUILD gate for the "Mode descriptions" feature (architecture review #5).
 *
 * The shipped VSIX embeds `src/assets/marketplace/pre-installed-modes.yml` and
 * `.roomodes`, which are REGENERATED from the `custom-modes` git submodule by
 * `scripts/sync-custom-modes.mjs` at build time. If the build server checks out a
 * stale / wrong / dirty submodule (or the submodule is missing entirely), the
 * packaged asset silently ships modes WITHOUT descriptions ("garbage in, garbage
 * out" — the runtime back-fill in `CustomModesManager` can only repair from what
 * the bundle already contains).
 *
 * This gate fails the build unless ALL of the following hold:
 *   1. The `custom-modes` submodule is initialized.
 *   2. The checked-out submodule HEAD matches the recorded pin (the gitlink stored
 *      in the superproject index, i.e. `git ls-tree HEAD custom-modes`).
 *   3. The submodule working tree is clean (no uncommitted changes).
 *   4. (default ON) Every curated mode in `custom-modes/custom_modes.d/` has a
 *      non-empty description that is not a clone of its `roleDefinition` — so
 *      descriptions can never be dropped at the source.
 *
 * Usage:
 *   node scripts/verify-submodule-pin.mjs                     # pin + clean + descriptions
 *   node scripts/verify-submodule-pin.mjs --skip-descriptions # pin + clean only
 *   ROO_SUBMODULE_PATH=relative/path node scripts/verify-submodule-pin.mjs  # override (testing/CI)
 *
 * Wired as `prevsix`, `prebundle` and `prevscode:prepublish` in src/package.json
 * (and matching root hooks), so it runs before every packaging path — `pnpm vsix`,
 * `pnpm bundle`, and direct `vsce package` — and cannot be bypassed.
 */

import { execFileSync } from "node:child_process"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

import { loadManifest, scanAllAgents, filterCuratedAgents } from "./sync-custom-modes.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")
const SUBMODULE_PATH = process.env.ROO_SUBMODULE_PATH || "custom-modes"
const SUBMODULE_DIR = path.resolve(ROOT, SUBMODULE_PATH)

function git(args, cwd = ROOT) {
  try {
    return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })
  } catch (err) {
    const stderr = (err.stderr && err.stderr.toString()) || ""
    throw new Error(`git ${args.join(" ")} failed: ${stderr.trim() || err.message}`)
  }
}

/**
 * The recorded pin is the gitlink commit for the submodule path in the
 * superproject's index (what `git submodule update` would check out).
 */
function getRecordedPin() {
  const out = git(["ls-tree", "HEAD", SUBMODULE_PATH])
  const match = out.match(/^160000\s+commit\s+([0-9a-f]{40})\t/m)
  if (!match) {
    throw new Error(
      `No gitlink recorded for '${SUBMODULE_PATH}' in the superproject index. ` +
        `Commit the submodule first, or set ROO_SUBMODULE_PATH to its path.`,
    )
  }
  return match[1]
}

function isInitialized() {
  // `git submodule status` prefix: ' ' in sync · '+' checkout differs from pin ·
  // '-' not initialized · 'U' merge conflict.
  let line = ""
  try {
    line = git(["submodule", "status", SUBMODULE_PATH])
      .split("\n")
      .find((l) => l.includes(SUBMODULE_PATH)) || ""
  } catch {
    line = ""
  }
  if (line.startsWith("-")) return false
  // Fallback for exotic setups: check for the submodule's own git metadata.
  return fs.existsSync(path.join(SUBMODULE_DIR, ".git")) || fs.existsSync(path.join(SUBMODULE_DIR, "custom_modes.d"))
}

/**
 * Pure verdict for a single agent's description: non-empty AND not a clone of its
 * roleDefinition (the repo treats a clone as "missing").
 */
export function assessDescription(agent) {
  const description = (agent.description || "").replace(/\s+/g, " ").trim()
  const roleDefinition = (agent.roleDefinition || "").replace(/\s+/g, " ").trim()
  if (!description) return { ok: false, reason: "description is empty/missing" }
  if (description === roleDefinition) {
    return { ok: false, reason: "description is a clone of roleDefinition (treated as missing)" }
  }
  return { ok: true, reason: "" }
}

export async function checkCuratedDescriptions() {
  const manifest = await loadManifest()
  const allAgents = await scanAllAgents()
  const curated = filterCuratedAgents(allAgents, manifest)
  const bad = []
  for (const { agent } of curated) {
    const verdict = assessDescription(agent)
    if (!verdict.ok) bad.push({ slug: agent.slug, reason: verdict.reason })
  }
  return { ok: bad.length === 0, bad, total: curated.length }
}

async function main() {
  const skipDescriptions = process.argv.includes("--skip-descriptions")
  const onlyDescriptions = process.argv.includes("--only-descriptions")
  console.log("🔒 Verifying custom-modes submodule pin...")
  console.log(`   submodule: ${SUBMODULE_PATH}  (dir: ${SUBMODULE_DIR})`)

  let checkedOut = ""
  if (!onlyDescriptions) {
    // 1. Submodule must be initialized.
    if (!isInitialized()) {
      console.error("\n❌ custom-modes submodule is NOT initialized.")
      console.error("   Packaging from a missing submodule would silently reuse stale committed")
      console.error("   artifacts and could ship modes without descriptions. Initialize it:")
      console.error(`\n   git submodule update --init --recursive ${SUBMODULE_PATH}\n`)
      process.exit(1)
    }

    // 2. Checked-out HEAD must match the recorded pin.
    const recordedPin = getRecordedPin()
    checkedOut = git(["rev-parse", "HEAD"], SUBMODULE_DIR).trim()
    if (checkedOut !== recordedPin) {
      console.error(`\n❌ Submodule ${SUBMODULE_PATH} is NOT at its recorded pin.`)
      console.error(`   Recorded pin (superproject gitlink):  ${recordedPin}`)
      console.error(`   Checked-out HEAD:                     ${checkedOut}`)
      console.error("\n   The VSIX would be generated from an unreviewed / unpinned submodule state.")
      console.error("   Fix with one of:")
      console.error(`   - git submodule update --init --recursive ${SUBMODULE_PATH}   (checkout recorded pin)`)
      console.error("   - or deliberately bump the pin (see scripts/DESCRIPTIONS.md § Submodule pinning policy)\n")
      process.exit(1)
    }

    // 3. Working tree must be clean.
    const porcelain = git(["status", "--porcelain"], SUBMODULE_DIR)
    if (porcelain.trim().length > 0) {
      console.error(`\n❌ Submodule ${SUBMODULE_PATH} has uncommitted changes.`)
      console.error(porcelain.split("\n").filter(Boolean).map((l) => `   ${l}`).join("\n"))
      console.error("\n   A dirty submodule is not reproducible. Commit or stash these changes,")
      console.error("   or bump the pin to a committed revision.\n")
      process.exit(1)
    }
  }

  // 4. (default ON) Every curated mode must carry a real description.
  if (!skipDescriptions) {
    let result
    try {
      result = await checkCuratedDescriptions()
    } catch (err) {
      console.error(`\n❌ Could not verify curated mode descriptions: ${err.message}\n`)
      process.exit(1)
    }
    if (!result.ok) {
      console.error(`\n❌ ${result.bad.length} curated mode(s) ship without a real description:`)
      for (const { slug, reason } of result.bad) {
        console.error(`   - ${slug}: ${reason}`)
      }
      console.error(`\n   Fix the YAML in ${SUBMODULE_PATH}/custom_modes.d/ (see scripts/DESCRIPTIONS.md)\n`)
      process.exit(1)
    }
    console.log(`   ✓ ${result.total} curated modes all have non-empty descriptions`)
  }

  if (onlyDescriptions) {
    console.log("\n✅ Curated mode descriptions verified — all non-empty.")
    process.exit(0)
  }

  console.log(`\n✅ Submodule pin verified: ${checkedOut.slice(0, 12)} — build source is pinned and clean.`)
  process.exit(0)
}

// Only run when executed directly (not when imported by the spec / CI).
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
  main().catch((err) => {
    console.error(`\n❌ Submodule pin verification failed: ${err.message}\n`)
    process.exit(1)
  })
}
