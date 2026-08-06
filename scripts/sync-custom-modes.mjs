#!/usr/bin/env node

/**
 * sync-custom-modes.mjs
 *
 * Converts agent YAML files from the custom-modes submodule into:
 *   1. .roomodes — the project's custom modes configuration (curated set)
 *   2. src/assets/marketplace/pre-installed-modes.yml — same curated set, bundled
 *      in the VSIX and seeded at first run
 *   3. src/assets/marketplace/modes.yml — the full Modes Marketplace catalog
 *
 * Workflow:
 *   1. Reads the curation manifest (custom-modes/manifest.json)
 *   2. Scans agent YAML files from custom-modes/custom_modes.d/ using the yaml
 *      library (canonical catalog; each file wraps a `customModes:` array)
 *   3a. Converts curated agents to .roomodes format (stripping extra fields)
 *   3b. Converts ALL agents to Modes Marketplace format
 *   4. Merges with existing content — SOURCE WINS on slug conflict, so re-running
 *      the sync refreshes stale committed entries (e.g. missing/old descriptions)
 *      instead of preserving them. Only user-level settings (custom_modes.yaml in
 *      globalStorage) preserve user edits; that file is merged at runtime by
 *      CustomModesManager and is never touched by this script.
 *   5. Writes .roomodes and marketplace modes.yml
 *
 * Usage:
 *   node scripts/sync-custom-modes.mjs
 */

import * as fs from "node:fs/promises"
import * as path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import * as yaml from "yaml"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")

// The submodule path can be overridden (e.g. by verify-submodule-pin.mjs or CI
// fixtures) so every consumer of this pipeline resolves the SAME source of truth.
const SUBMODULE_PATH = process.env.ROO_SUBMODULE_PATH || "custom-modes"
// Canonical source directory. The legacy custom-modes/agents/ layout is obsolete
// and being removed; the canonical catalog now lives at
// custom-modes/custom_modes.d/<category>/.../<file>.yaml (each file wraps a
// `customModes:` array). ROO_SUBMODULE_PATH still overrides the submodule root.
const SOURCE_DIR = path.resolve(ROOT, SUBMODULE_PATH, "custom_modes.d")
// Back-compat alias — kept so verify-roomodes-sync.mjs / verify-submodule-pin.mjs
// and their specs keep importing a working directory.
const AGENTS_DIR = SOURCE_DIR
const MANIFEST_PATH = path.resolve(ROOT, SUBMODULE_PATH, "manifest.json")
const ROOMODES_PATH = path.join(ROOT, ".roomodes")
const MARKETPLACE_MODES_PATH = path.join(ROOT, "src", "assets", "marketplace", "modes.yml")
const PRE_INSTALLED_MODES_PATH = path.join(ROOT, "src", "assets", "marketplace", "pre-installed-modes.yml")

// Fields allowed in .roomodes mode entries (from modeConfigSchema)
const ALLOWED_FIELDS = new Set([
  "slug",
  "name",
  "roleDefinition",
  "whenToUse",
  "description",
  "customInstructions",
  "groups",
  "allowedMcpServers",
])

/**
 * Default groups for agents that don't specify any.
 */
const DEFAULT_GROUPS = ["read", "edit", "command", "mcp"]

/**
 * Slugs owned by the extension core itself (built-in modes). These must NEVER be
 * shipped from the custom-modes catalog — the runtime provides them, so including
 * them in .roomodes / pre-installed-modes.yml / modes.yml would create colliding
 * mode definitions. The canonical catalog no longer contains them; this guard
 * prevents regressions.
 */
const BUILT_IN_SLUGS = new Set(["architect", "code", "ask", "debug", "orchestrator"])

/**
 * Assert that no built-in mode slug leaks into any generated artifact.
 * Throws with a clear message listing every offender.
 */
function assertNoBuiltInSlugs({ roomodesModes = [], marketplaceItems = [] } = {}) {
  const offenders = new Set()
  for (const m of roomodesModes) {
    if (BUILT_IN_SLUGS.has(m?.slug)) offenders.add(`${m.slug} (in .roomodes / pre-installed-modes.yml)`)
  }
  for (const item of marketplaceItems) {
    if (BUILT_IN_SLUGS.has(item?.id)) offenders.add(`${item.id} (in modes.yml marketplace item)`)
  }
  if (offenders.size > 0) {
    throw new Error(
      "BUILT-IN MODE COLLISION: generated artifacts contain built-in mode slug(s) " +
        `that must be provided by the extension core, not the custom-modes catalog: ${[...offenders].join(", ")}. ` +
        "Remove them from the catalog/curation and re-run.",
    )
  }
}

/**
 * Truncate a string to a given length, keeping whole words.
 */
function truncate(str, maxLen) {
  if (!str || str.length <= maxLen) return str || ""
  return str.slice(0, maxLen).replace(/\s+\S*$/, "") + "..."
}

/**
 * Load the curation manifest.
 */
async function loadManifest() {
  try {
    const content = await fs.readFile(MANIFEST_PATH, "utf-8")
    return JSON.parse(content)
  } catch (err) {
    console.error("⚠ Failed to load manifest:", err.message)
    console.error("  Using default: include all agents")
    return {
      includeCategories: {},
      includeSlugs: [],
      excludeSlugs: [],
    }
  }
}

/**
 * Get the category name from the file path relative to the source directory.
 * The path is like: custom_modes.d/<category>/<subcategory>/<file>.yaml, so the
 * category is the first path segment after custom_modes.d.
 */
function getCategoryFromPath(relativePath) {
  const parts = relativePath.split(path.sep)
  return parts[0]
}

/**
 * Read and parse a YAML agent file, normalizing it to a list of modes.
 *
 * The canonical catalog files are wrapped as `customModes:\n- slug: ...` arrays
 * (one mode per entry). For robustness we also accept a bare array or a raw
 * single-mode object at the top level (the shape used by the legacy agents/
 * files).
 */
async function parseAgentFile(filePath) {
  const content = await fs.readFile(filePath, "utf-8")
  const parsed = yaml.parse(content)
  if (Array.isArray(parsed)) return parsed
  if (parsed && typeof parsed === "object" && Array.isArray(parsed.customModes)) {
    return parsed.customModes
  }
  if (parsed && typeof parsed === "object" && parsed.slug) {
    return [parsed]
  }
  return []
}

/**
 * Recursively find all YAML files in a directory.
 */
async function findYamlFiles(dirPath) {
  const files = []
  async function scan(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        await scan(fullPath)
      } else if (entry.name.endsWith(".yaml") || entry.name.endsWith(".yml")) {
        files.push(fullPath)
      }
    }
  }
  await scan(dirPath)
  return files
}

/**
 * Scan all agent files, returning them parsed with metadata.
 */
async function scanAllAgents() {
  const agentFiles = await findYamlFiles(SOURCE_DIR)
  const agents = []

  for (const filePath of agentFiles) {
    const relativePath = path.relative(SOURCE_DIR, filePath)
    const category = getCategoryFromPath(relativePath)

    try {
      const parsedAgents = await parseAgentFile(filePath)
      for (const agent of parsedAgents) {
        if (agent && agent.slug) {
          agents.push({ agent, filePath, relativePath, category })
        }
      }
    } catch (err) {
      console.warn(`  ⚠ Failed to parse ${relativePath}: ${err.message}`)
    }
  }

  return agents
}

/**
 * Filter agents based on curation manifest.
 */
function filterCuratedAgents(allAgents, manifest) {
  const { includeCategories = {}, includeSlugs = [], excludeSlugs = [] } = manifest
  const excludeSet = new Set(excludeSlugs)

  const fullCategories = new Set(
    Object.entries(includeCategories)
      .filter(([, v]) => v === "all")
      .map(([k]) => k),
  )

  const slugAllowSet = new Set(includeSlugs)

  return allAgents.filter(({ agent, category }) => {
    if (excludeSet.has(agent.slug)) return false
    return fullCategories.has(category) || slugAllowSet.has(agent.slug)
  })
}

/**
 * Convert a parsed agent object to .roomodes format (filtering allowed fields only).
 * Also handles edge cases: missing groups, deprecated groups, etc.
 */
function convertToRoomodesEntry(agent) {
  const entry = {}
  for (const key of Object.keys(agent)) {
    if (ALLOWED_FIELDS.has(key)) {
      entry[key] = agent[key]
    }
  }

  // Ensure groups exist — some agents don't have the field
  if (!entry.groups || !Array.isArray(entry.groups) || entry.groups.length === 0) {
    entry.groups = [...DEFAULT_GROUPS]
  } else {
    // Strip deprecated 'browser' group (schema does this too, but clean it preemptively)
    entry.groups = entry.groups.filter(
      (g) => g !== "browser" && !(Array.isArray(g) && g[0] === "browser"),
    )
    // If filtering removed everything, fall back to defaults
    if (entry.groups.length === 0) {
      entry.groups = [...DEFAULT_GROUPS]
    }
  }

  return entry
}

/**
 * Load existing .roomodes file and extract custom modes.
 */
async function loadExistingRoomodes() {
  try {
    const content = await fs.readFile(ROOMODES_PATH, "utf-8")
    const parsed = yaml.parse(content)
    const modes = parsed?.customModes || []
    return { modes, rawContent: content }
  } catch {
    return { modes: [], rawContent: null }
  }
}

/**
 * Generate the complete .roomodes YAML content.
 */
/**
 * Merge existing + freshly-generated modes with SOURCE-WINS semantics.
 *
 * `newModes` are freshly generated from the curated agent source
 * (custom-modes/custom_modes.d/) and therefore win on slug conflict. This is what makes
 * re-running sync REFRESH stale committed artifacts (e.g. `.roomodes` entries
 * with missing/old descriptions) instead of preserving them.
 *
 * Existing modes whose slug is NOT present in the source are treated as manual
 * additions and preserved. User-level settings (`custom_modes.yaml` in
 * globalStorage) are never merged here — they are handled at runtime by
 * CustomModesManager so user edits always survive.
 *
 * Returns { merged, replaced, preserved }:
 *   - merged:    final mode list (preserved extras first, then all source entries)
 *   - replaced:  existing modes that were refreshed from the source
 *   - preserved: existing modes kept because their slug is not in the source
 */
function mergeRoomodesModes(existingModes, newModes) {
  const newBySlug = new Map(newModes.map((m) => [m.slug, m]))
  const replaced = existingModes.filter((m) => newBySlug.has(m.slug))
  const preserved = existingModes.filter((m) => !newBySlug.has(m.slug))
  return { merged: [...preserved, ...newModes], replaced, preserved }
}

/**
 * Generate the complete .roomodes YAML content (source-wins merge).
 */
function generateRoomodesYaml(existingModes, newModes) {
  const { merged } = mergeRoomodesModes(existingModes, newModes)
  const cleanModes = merged.map((mode) => {
    const m = { ...mode }
    delete m.source
    return m
  })
  return yaml.stringify({ customModes: cleanModes }, { lineWidth: 0 })
}

/**
 * Convert an agent to Modes Marketplace item format.
 */
function convertToMarketplaceItem(agent, curatedSlugs) {
  // Build the content YAML (only allowed fields)
  const contentObj = convertToRoomodesEntry(agent)

  // Create a clean description from roleDefinition
  const description = truncate(
    (agent.description || agent.roleDefinition || "").replace(/\s+/g, " ").trim(),
    150,
  )

  return {
    type: "mode",
    id: agent.slug,
    name: agent.name || agent.slug,
    description,
    author: "@roo-plus",
    tags: ["custom-modes", agent.category || "general"].filter(Boolean),
    content: yaml.stringify(contentObj, { lineWidth: 0 }),
  }
}

/**
 * CATALOG-WINS dedupe for the Modes Marketplace: when preserving legacy
 * non-custom-modes items, skip any whose id collides with a catalog item (e.g.
 * the legacy "security-review" marketplace item vs
 * custom_modes.d/security/security-review.yaml). The catalog is the source of
 * truth, so the duplicate original item is dropped.
 *
 * Returns { preserved, dropped } — preserved items keep original order.
 */
export function dedupeMarketplaceById(originalItems, agentItems) {
  const catalogItemIds = new Set(agentItems.map((item) => item.id))
  const dropped = originalItems.filter((item) => catalogItemIds.has(item.id))
  const preserved = originalItems.filter((item) => !catalogItemIds.has(item.id))
  return { preserved, dropped }
}

/**
 * Generate marketplace modes.yml with ALL agents + preserve original marketplace items.
 */
async function generateMarketplaceModes(allAgents, curatedSlugs) {
  // 1. Read existing marketplace modes.yml to preserve original items
  let originalItems = []
  try {
    const existingContent = await fs.readFile(MARKETPLACE_MODES_PATH, "utf-8")
    const existing = yaml.parse(existingContent)
    if (existing?.items) {
      // Keep only items that are NOT from the custom-modes submodule
      originalItems = existing.items.filter((item) => !item.tags?.includes("custom-modes"))
      console.log(`   Preserved ${originalItems.length} original marketplace items`)
    }
  } catch {
    console.log("   No existing marketplace modes.yml found, creating new one")
  }

  // 2. Convert all agents to marketplace items
  const agentItems = allAgents.map(({ agent }) => convertToMarketplaceItem(agent, curatedSlugs))

  // 3. Dedupe preserved originals by id with CATALOG-WINS semantics.
  const { preserved: preservedOriginals, dropped } = dedupeMarketplaceById(originalItems, agentItems)
  if (dropped.length > 0) {
    console.log(
      `   Dropped ${dropped.length} legacy duplicate(s) colliding with catalog ids: ${dropped.map((d) => d.id).join(", ")}`,
    )
  }

  // 4. Combine: preserved original items first, then agent items
  const allItems = [...preservedOriginals, ...agentItems]

  // 5. Built-in collision guard: the extension core owns these slugs and they
  // must never appear in the marketplace catalog.
  assertNoBuiltInSlugs({ marketplaceItems: allItems })

  // 6. Write combined modes.yml
  const output = yaml.stringify({ items: allItems }, { lineWidth: 0 })
  await fs.writeFile(MARKETPLACE_MODES_PATH, output, "utf-8")

  return { originalCount: preservedOriginals.length, agentCount: agentItems.length }
}

/**
 * Main entry point.
 */
async function main() {
  console.log("🔧 Roo+ Custom Modes Sync")
  console.log("═".repeat(50))

  // 1. Load manifest
  console.log("\n📋 Loading curation manifest...")
  const manifest = await loadManifest()
  const fullCats = Object.entries(manifest.includeCategories || {})
    .filter(([, v]) => v === "all")
    .map(([k]) => k)
  console.log(`   Full categories: ${fullCats.join(", ") || "none"}`)
  console.log(`   Individual slugs: ${(manifest.includeSlugs || []).length}`)
  console.log(`   Excluded slugs: ${(manifest.excludeSlugs || []).length}`)

  // 2. Check if the source directory exists (git submodule may not be initialized in CI)
  console.log("\n🔍 Checking custom_modes.d directory...")
  let agentsDirExists = false
  try {
    await fs.access(SOURCE_DIR)
    agentsDirExists = true
  } catch {
    agentsDirExists = false
  }

  if (!agentsDirExists) {
    // Check if output files already exist (committed to repo)
    const outputsExist = await Promise.all([
      fs.access(PRE_INSTALLED_MODES_PATH).then(() => true).catch(() => false),
      fs.access(MARKETPLACE_MODES_PATH).then(() => true).catch(() => false),
      fs.access(ROOMODES_PATH).then(() => true).catch(() => false),
    ])

    if (outputsExist.every(Boolean)) {
      console.log("   ⚠ custom_modes.d directory not found (git submodule not initialized in CI)")
      console.log("   ✓ All output files already exist — skipping sync")
      console.log("\n" + "═".repeat(50))
      console.log("✅ Sync complete (cached artifacts)")
      return
    }

    console.warn("\n⚠ custom_modes.d directory not found and output files missing.")
    console.warn("   Run `git submodule update --init` to populate custom-modes/custom_modes.d/")
    return
  }

  // Scan ALL agents
  console.log("\n🔍 Scanning custom_modes.d catalog...")
  const allAgents = await scanAllAgents()
  console.log(`   Found ${allAgents.length} total modes`)

  if (allAgents.length === 0) {
    console.log("\n⚠ No agents found. Nothing to do.")
    return
  }

  // ===============================
  // PART 1: Generate .roomodes (curated set)
  // ===============================
  console.log("\n📦 Part 1: Generating .roomodes (curated set)")

  // Filter curated agents
  const curated = filterCuratedAgents(allAgents, manifest)
  console.log(`   Curated agents: ${curated.length}`)

  // Convert to .roomodes format
  const roomodesEntries = curated.map(({ agent }) => convertToRoomodesEntry(agent))

  // Load existing .roomodes
  const { modes: existingModesRaw } = await loadExistingRoomodes()
  // Built-in modes are owned by the extension core and must never be sourced
  // from (or preserved from) the custom-modes artifacts. Drop any stale copies
  // that previous pipelines committed so the collision guard below can never
  // trip on the regenerated output.
  const existingModes = existingModesRaw.filter((m) => !BUILT_IN_SLUGS.has(m.slug))
  console.log(
    `   Existing modes in .roomodes: ${existingModesRaw.length}` +
      (existingModesRaw.length !== existingModes.length
        ? ` (dropped ${existingModesRaw.length - existingModes.length} built-in)`
        : ""),
  )

  // Merge with SOURCE-WINS semantics: freshly generated curated entries REFRESH
  // existing ones on slug conflict (so stale `.roomodes` entries with missing or
  // old descriptions are repaired on re-run). Only existing modes whose slug is
  // absent from the curated source are preserved (manual additions).
  const { merged: mergedModes, replaced, preserved } = mergeRoomodesModes(existingModes, roomodesEntries)
  const totalModes = mergedModes.length

  console.log(`   Source entries: ${roomodesEntries.length} modes (source wins on conflict)`)
  if (replaced.length > 0) {
    console.log(`   Refreshed from source (slug conflict): ${replaced.map((m) => m.slug).join(", ")}`)
  }
  if (preserved.length > 0) {
    console.log(`   Preserved (not in curated source): ${preserved.map((m) => m.slug).join(", ")}`)
  }

  // Built-in collision guard: built-in mode slugs must never ship in the
  // curated artifacts (the extension core provides them).
  assertNoBuiltInSlugs({ roomodesModes: mergedModes })

  // Write .roomodes only when the generated artifact actually changed, so
  // re-running sync is idempotent (byte-for-byte stable output).
  const roomodesYamlContent = generateRoomodesYaml(existingModes, roomodesEntries)
  let currentRoomodes = null
  try {
    currentRoomodes = await fs.readFile(ROOMODES_PATH, "utf-8")
  } catch {
    currentRoomodes = null
  }

  if (roomodesYamlContent !== currentRoomodes) {
    console.log("\n✍️ Writing .roomodes (source-wins refresh)...")
    await fs.writeFile(ROOMODES_PATH, roomodesYamlContent, "utf-8")
  } else {
    console.log("   .roomodes already up to date (no changes)")
  }

  // Write pre-installed-modes.yml (bundled in VSIX for first-run seeding)
  console.log("\n📦 Writing pre-installed-modes.yml for extension bundling...")
  await fs.writeFile(PRE_INSTALLED_MODES_PATH, roomodesYamlContent, "utf-8")

  // ===============================
  // PART 2: Generate Modes Marketplace catalog
  // ===============================
  console.log("\n🛒 Part 2: Generating Modes Marketplace catalog")

  const curatedSlugsForMarketplace = new Set([
    ...existingModes.map((m) => m.slug),
    ...roomodesEntries.map((m) => m.slug),
  ])

  const { originalCount, agentCount } = await generateMarketplaceModes(allAgents, curatedSlugsForMarketplace)
  console.log(`   Original marketplace items preserved: ${originalCount}`)
  console.log(`   Custom mode agents added to catalog: ${agentCount}`)

  // ===============================
  // SUMMARY
  // ===============================
  console.log("\n" + "═".repeat(50))
  console.log(`✅ Sync complete!`)
  console.log(`   📄 .roomodes: ${totalModes} custom modes`)
  console.log(`   📦 pre-installed-modes.yml: ${totalModes} modes (for extension bundling)`)
  console.log(`   � Modes Marketplace: ${originalCount + agentCount} items available`)
  console.log(`      - ${agentCount} agents from custom-modes submodule`)
  console.log(`      - ${originalCount} original marketplace items`)

  // Category breakdown for curated
  const byCategory = {}
  for (const { category } of curated) {
    byCategory[category] = (byCategory[category] || 0) + 1
  }
  console.log("\n📊 Curated category breakdown:")
  for (const [cat, count] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${cat}: ${count} agents`)
  }

  console.log("\n💡 Tip: Open the Modes Marketplace to browse all available agents")
}

// Only run when executed directly (not when imported, e.g. by verify-roomodes-sync.mjs).
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
  main().catch((err) => {
    console.error("\n❌ Sync failed:", err.message)
    process.exit(1)
  })
}

export {
  loadManifest,
  scanAllAgents,
  filterCuratedAgents,
  convertToRoomodesEntry,
  mergeRoomodesModes,
  generateRoomodesYaml,
  parseAgentFile,
  assertNoBuiltInSlugs,
  BUILT_IN_SLUGS,
  SOURCE_DIR,
  AGENTS_DIR,
  MANIFEST_PATH,
  ROOMODES_PATH,
}
