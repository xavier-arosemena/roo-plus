/**
 * ensure_descriptions.spec.mjs
 *
 * End-to-end gate test for scripts/ensure_descriptions.py --check — the
 * CI-visible description-completeness gate for the "Mode descriptions" feature.
 *
 * The gate must EXIT 1 when any mode in the bundled sets has a blank/missing
 * description (or a clone of roleDefinition) and EXIT 0 when the sets are clean.
 * The test drives the real Python script against a throwaway fixture mounted via
 * the ROO_SUBMODULE_PATH override, so the actual custom-modes submodule is never
 * touched and the test is fully self-contained.
 *
 * Run with: node --test scripts/ensure_descriptions.spec.mjs
 * (scripts/ has no vitest runner, so node:test built into Node 22 is used —
 *  same as sync-custom-modes.spec.mjs and verify-submodule-pin.spec.mjs.)
 *
 * Requires python3 + PyYAML; skipped gracefully when either is unavailable so
 * `pnpm test:scripts` still works on machines without Python.
 */

import { test } from "node:test"
import assert from "node:assert/strict"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")
const SCRIPT = path.join(ROOT, "scripts", "ensure_descriptions.py")

// Exact canonical descriptions from CANONICAL_DESCRIPTIONS in ensure_descriptions.py,
// so a "clean" fixture produces ZERO pending changes (exit 0).
const FINITECH_DESC =
  "Builds financial systems with regulatory compliance, secure transaction processing, and audit trails."
const SQLPRO_DESC = "Optimizes complex database queries, designs schemas, and tunes performance across major SQL databases."

function pythonAvailable() {
  try {
    spawnSync("python3", ["-c", "import yaml"], { stdio: "ignore" })
    return true
  } catch {
    return false
  }
}

/**
 * Build a temp custom-modes root covering the canonical set the enforcer
 * tracks: custom_modes.d/ (nested `customModes:` wrapper).
 * `opts.blank` blanks every description; `opts.clone` makes one description a
 * verbatim copy of its roleDefinition.
 */
function makeFixture(root, { blank = false, clone = false } = {}) {
  fs.mkdirSync(path.join(root, "custom_modes.d"), { recursive: true })

  const fintechDesc = clone ? "You are an Expert fintech engineer." : blank ? "" : FINITECH_DESC
  const sqlDesc = blank ? "" : SQLPRO_DESC

  fs.writeFileSync(
    path.join(root, "custom_modes.d", "fintech-engineer.yaml"),
    `customModes:\n- slug: fintech-engineer\n  name: Fintech Engineer Elite\n  description: ${fintechDesc}\n  roleDefinition: You are an Expert fintech engineer.\n  groups:\n  - read\n  - edit\n`,
  )

  const nestedSql = `customModes:\n- slug: sql-pro\n  name: SQL Pro\n  description: ${sqlDesc}\n  roleDefinition: You are an expert SQL developer.\n  groups:\n  - read\n`
  fs.writeFileSync(path.join(root, "custom_modes.d", "sql-pro.yaml"), nestedSql)
}

function runCheck(customModesRoot, extraArgs = []) {
  return spawnSync("python3", [SCRIPT, "--check", ...extraArgs], {
    cwd: ROOT,
    env: { ...process.env, ROO_SUBMODULE_PATH: customModesRoot },
    encoding: "utf8",
  })
}

test("ensure_descriptions.py --check exits 1 on a deliberately blanked description", (t) => {
  if (!pythonAvailable()) {
    t.skip("python3 + PyYAML not available in this environment")
    return
  }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "roo-desc-blank-"))
  try {
    makeFixture(tmp, { blank: true })
    const res = runCheck(tmp)
    assert.equal(res.status, 1, `expected exit 1 for blanked description, got ${res.status}\n${res.stdout}\n${res.stderr}`)
    assert.match(res.stdout + res.stderr, /fintech-engineer/)
    assert.match(res.stdout + res.stderr, /sql-pro/)
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }
})

test("ensure_descriptions.py --check exits 1 on a clone-of-roleDefinition description", (t) => {
  if (!pythonAvailable()) {
    t.skip("python3 + PyYAML not available in this environment")
    return
  }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "roo-desc-clone-"))
  try {
    makeFixture(tmp, { clone: true })
    const res = runCheck(tmp)
    assert.equal(res.status, 1, `expected exit 1 for clone description, got ${res.status}\n${res.stdout}\n${res.stderr}`)
    assert.match(res.stdout + res.stderr, /fintech-engineer/)
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }
})

test("ensure_descriptions.py --check exits 0 on a clean fixture", (t) => {
  if (!pythonAvailable()) {
    t.skip("python3 + PyYAML not available in this environment")
    return
  }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "roo-desc-clean-"))
  try {
    makeFixture(tmp, {})
    const res = runCheck(tmp)
    assert.equal(res.status, 0, `expected exit 0 for clean fixture, got ${res.status}\n${res.stdout}\n${res.stderr}`)
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }
})
