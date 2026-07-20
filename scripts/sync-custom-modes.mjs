#!/usr/bin/env node

/**
 * sync-custom-modes.mjs
 *
 * Converts agent YAML files from the custom-modes submodule into:
 *   1. .roomodes — the project's custom modes configuration
 *   2. src/assets/marketplace/modes.yml — the Modes Marketplace catalog
 *
 * Workflow:
 *   1. Reads the curation manifest (custom-modes/manifest.json)
 *   2. Scans agent YAML files from custom-modes/agents/ using the yaml library
 *   3a. Converts curated agents to .roomodes format (stripping extra fields)
 *   3b. Converts ALL agents to Modes Marketplace format
 *   4. Merges with existing content (preserving existing entries)
 *   5. Writes .roomodes and marketplace modes.yml
 *
 * Usage:
 *   node scripts/sync-custom-modes.mjs
 */

import * as fs from "node:fs/promises"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import * as yaml from "yaml"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")

const AGENTS_DIR = path.join(ROOT, "custom-modes", "agents")
const MANIFEST_PATH = path.join(ROOT, "custom-modes", "manifest.json")
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
 * Get the category name from the file path relative to agents/ directory.
 * The path is like: agents/<category>/<subcategory>/<file>.yaml
 */
function getCategoryFromPath(relativePath) {
  const parts = relativePath.split(path.sep)
  return parts[0]
}

/**
 * Read and parse a YAML agent file.
 */
async function parseAgentFile(filePath) {
  const content = await fs.readFile(filePath, "utf-8")
  return yaml.parse(content)
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
  const agentFiles = await findYamlFiles(AGENTS_DIR)
  const agents = []

  for (const filePath of agentFiles) {
    const relativePath = path.relative(AGENTS_DIR, filePath)
    const category = getCategoryFromPath(relativePath)

    try {
      const agent = await parseAgentFile(filePath)
      if (agent && agent.slug) {
        agents.push({ agent, filePath, relativePath, category })
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
function generateRoomodesYaml(existingModes, newModes) {
  const allModes = [...existingModes, ...newModes]
  const cleanModes = allModes.map((mode) => {
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

  // 3. Combine: original items first, then agent items
  const allItems = [...originalItems, ...agentItems]

  // 4. Write combined modes.yml
  const output = yaml.stringify({ items: allItems }, { lineWidth: 0 })
  await fs.writeFile(MARKETPLACE_MODES_PATH, output, "utf-8")

  return { originalCount: originalItems.length, agentCount: agentItems.length }
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

  // 2. Check if agents directory exists (git submodule may not be initialized in CI)
  console.log("\n🔍 Checking agents directory...")
  let agentsDirExists = false
  try {
    await fs.access(AGENTS_DIR)
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
      console.log("   ⚠ Agents directory not found (git submodule not initialized in CI)")
      console.log("   ✓ All output files already exist — skipping sync")
      console.log("\n" + "═".repeat(50))
      console.log("✅ Sync complete (cached artifacts)")
      return
    }

    console.warn("\n⚠ Agents directory not found and output files missing.")
    console.warn("   Run `git submodule update --init` to populate custom-modes/agents/")
    return
  }

  // Scan ALL agents
  console.log("\n🔍 Scanning agents directory...")
  const allAgents = await scanAllAgents()
  console.log(`   Found ${allAgents.length} total agents`)

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
  const { modes: existingModes } = await loadExistingRoomodes()
  console.log(`   Existing modes in .roomodes: ${existingModes.length}`)

  // Merge (existing modes take priority on slug conflict)
  const existingSlugs = new Set(existingModes.map((m) => m.slug))
  const newEntries = roomodesEntries.filter((m) => !existingSlugs.has(m.slug))
  const skipped = roomodesEntries.filter((m) => existingSlugs.has(m.slug))

  console.log(`   Adding: ${newEntries.length} new modes`)
  if (skipped.length > 0) {
    console.log(`   Skipped (slug conflict): ${skipped.map((m) => m.slug).join(", ")}`)
  }

  // Write .roomodes
  const totalModes = existingModes.length + newEntries.length
  const roomodesYamlContent = newEntries.length > 0
    ? generateRoomodesYaml(existingModes, newEntries)
    : generateRoomodesYaml(existingModes, [])

  if (newEntries.length > 0) {
    console.log("\n✍️ Writing .roomodes...")
    await fs.writeFile(ROOMODES_PATH, roomodesYamlContent, "utf-8")
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

main().catch((err) => {
  console.error("\n❌ Sync failed:", err.message)
  process.exit(1)
})
