#!/usr/bin/env node
/**
 * Generates AGENT_CATALOG.md — a comprehensive reference of all modes in the
 * canonical `custom-modes/custom_modes.d/` catalog, with slugs, names,
 * descriptions, and pre-load status.
 *
 * The canonical catalog is a set of YAML files at
 * `custom-modes/custom_modes.d/<category>/.../<file>.yaml`, each wrapping a
 * `customModes:` array (the shape consumed by scripts/sync-custom-modes.mjs).
 * This script unwraps that array, so a single file can contribute multiple
 * modes, and emits links relative to the submodule root (`custom_modes.d/...`).
 */
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import * as yaml from "yaml"

import { logStep, logEndGroup, logInfo, logOk, logSuccess } from "./lib/logger.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")
const SOURCE_DIR = path.join(ROOT, "custom-modes", "custom_modes.d")
const ROOMODES_PATH = path.join(ROOT, ".roomodes")
const CATALOG_PATH = path.join(ROOT, "custom-modes", "AGENT_CATALOG.md")

// Hierarchical tag identifying this process.
const TAG = "GENERATE:CATALOG"

// Load curated slugs from .roomodes
const roomodesContent = fs.readFileSync(ROOMODES_PATH, "utf-8")
const roomodesParsed = yaml.parse(roomodesContent)
const curatedSlugs = new Set(roomodesParsed.customModes.map((m) => m.slug))

// Scan all mode files in custom_modes.d. Each file wraps a `customModes:` array;
// unwrap it to individual modes (also accept a bare array or a raw single-mode
// object for robustness, mirroring sync-custom-modes.mjs).
const agents = []

function scanDir(dirPath, category) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)
    if (entry.isDirectory()) {
      scanDir(fullPath, category || entry.name)
    } else if (entry.name.endsWith(".yaml") || entry.name.endsWith(".yml")) {
      try {
        const content = fs.readFileSync(fullPath, "utf-8")
        const parsed = yaml.parse(content)
        let modes = []
        if (Array.isArray(parsed)) {
          modes = parsed
        } else if (parsed && typeof parsed === "object" && Array.isArray(parsed.customModes)) {
          modes = parsed.customModes
        } else if (parsed && typeof parsed === "object" && parsed.slug) {
          modes = [parsed]
        }
        for (const mode of modes) {
          if (!mode || !mode.slug) continue
          const relativePath = path.relative(SOURCE_DIR, fullPath)
          const rawDesc = mode.description || mode.roleDefinition || ""
          const cleanDesc = rawDesc
            .replace(/\\n/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 120)
            .replace(/^"|"$/g, "")
          agents.push({
            slug: mode.slug,
            name: mode.name || mode.slug,
            description: cleanDesc + "...",
            category: category || mode.category || "unknown",
            curated: curatedSlugs.has(mode.slug),
            // Link is relative to the custom-modes submodule root, pointing into
            // the canonical catalog directory.
            file: path.posix.join("custom_modes.d", relativePath.split(path.sep).join("/")),
          })
        }
      } catch (e) {
        // skip unparseable files
      }
    }
  }
}

scanDir(SOURCE_DIR)

// Group by category
const byCategory = {}
for (const a of agents) {
  if (!byCategory[a.category]) byCategory[a.category] = []
  byCategory[a.category].push(a)
}

// Generate markdown
let md = "# Roo+ Agent Catalog\n\n"
md += `Total: **${agents.length} modes** — `
md += `**${agents.filter((a) => a.curated).length} pre-loaded** into [\`.roomodes\`](../.roomodes) and \`pre-installed-modes.yml\`, `
md += `**${agents.filter((a) => !a.curated).length} additional modes** available for import from the Modes Marketplace.\n\n`
md += "> **Two user-facing lists.** The **Preloaded** list (curated via `custom-modes/manifest.json`) ships in `.roomodes` and `src/assets/marketplace/pre-installed-modes.yml`. The **Marketplace** (`src/assets/marketplace/modes.yml`) contains **301 items** — the unified `custom_modes.d/` catalog, with every item tagged `custom-modes` and no preserved originals. Built-in slugs (`architect`, `code`, `ask`, `debug`, `orchestrator`) are excluded from all lists.\n\n"
md += "To add a mode to your pre-loaded set, see [Adding a Mode](../README.md#adding-a-mode) in the README.\n\n"
md += "## All Modes\n\n"
md += "| Status | Slug | Name | Category | Description |\n"
md += "|--------|------|------|----------|-------------|\n"

const sorted = [...agents].sort((a, b) => a.slug.localeCompare(b.slug))
for (const a of sorted) {
  const status = a.curated ? "✅ Pre-loaded" : "⬜ Available"
  const fileLink = `[${a.slug}](${a.file})`
  md += `| ${status} | ${fileLink} | ${a.name} | ${a.category} | ${a.description} |\n`
}

md += "\n## By Category\n\n"
for (const [cat, items] of Object.entries(byCategory).sort()) {
  md += `### ${cat}\n\n`
  md += "| Status | Slug | Name | Description |\n"
  md += "|--------|------|------|-------------|\n"
  for (const a of items.sort((a, b) => a.slug.localeCompare(b.slug))) {
    const status = a.curated ? "✅" : "⬜"
    md += `| ${status} | \`${a.slug}\` | ${a.name} | ${a.description} |\n`
  }
  md += "\n"
}

logStep(TAG, "Generating AGENT_CATALOG.md")
logInfo(TAG, `source: ${SOURCE_DIR}`)
logInfo(TAG, `curated slugs loaded from: ${ROOMODES_PATH} (${curatedSlugs.size})`)
fs.writeFileSync(CATALOG_PATH, md)
logOk(TAG, `Total modes: ${agents.length}`)
logOk(TAG, `Pre-loaded:    ${agents.filter((a) => a.curated).length}`)
logOk(TAG, `Available:     ${agents.filter((a) => !a.curated).length}`)
logSuccess(TAG, `Catalog written to custom-modes/AGENT_CATALOG.md`)
logEndGroup()
