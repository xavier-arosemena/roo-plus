#!/usr/bin/env node
/**
 * Generates AGENT_CATALOG.md — a comprehensive reference of all 225 agents
 * in the custom-modes submodule, with slugs, names, descriptions, and
 * pre-load status.
 */
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import * as yaml from "yaml"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")
const AGENTS_DIR = path.join(ROOT, "custom-modes", "agents")
const ROOMODES_PATH = path.join(ROOT, ".roomodes")
const CATALOG_PATH = path.join(ROOT, "custom-modes", "AGENT_CATALOG.md")

// Load curated slugs from .roomodes
const roomodesContent = fs.readFileSync(ROOMODES_PATH, "utf-8")
const roomodesParsed = yaml.parse(roomodesContent)
const curatedSlugs = new Set(roomodesParsed.customModes.map((m) => m.slug))

// Scan all agent files
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
        if (parsed && parsed.slug) {
          const relativePath = path.relative(AGENTS_DIR, fullPath)
          const rawDesc = parsed.description || parsed.roleDefinition || ""
          const cleanDesc = rawDesc
            .replace(/\\n/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 120)
            .replace(/^"|"$/g, "")
          agents.push({
            slug: parsed.slug,
            name: parsed.name || parsed.slug,
            description: cleanDesc + "...",
            category: category || parsed.category || "unknown",
            curated: curatedSlugs.has(parsed.slug),
            file: relativePath,
          })
        }
      } catch (e) {
        // skip unparseable files
      }
    }
  }
}

scanDir(AGENTS_DIR)

// Group by category
const byCategory = {}
for (const a of agents) {
  if (!byCategory[a.category]) byCategory[a.category] = []
  byCategory[a.category].push(a)
}

// Generate markdown
let md = "# Roo+ Agent Catalog\n\n"
md += `Total: **${agents.length} agents** — `
md += `${agents.filter((a) => a.curated).length} pre-loaded in .roomodes, `
md += `${agents.filter((a) => !a.curated).length} available for import\n\n`
md += "To add an agent to your pre-loaded set, see the [Adding More Agents](../README.md#adding-more-agents-the-remaining-86) section in the README.\n\n"
md += "## All Agents\n\n"
md += "| Status | Slug | Name | Category | Description |\n"
md += "|--------|------|------|----------|-------------|\n"

const sorted = [...agents].sort((a, b) => a.slug.localeCompare(b.slug))
for (const a of sorted) {
  const status = a.curated ? "✅ Pre-loaded" : "⬜ Available"
  const fileLink = `[${a.slug}](agents/${a.file})`
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

fs.writeFileSync(CATALOG_PATH, md)
console.log(`\n=== Catalog generated ===`)
console.log(`Total agents: ${agents.length}`)
console.log(`Pre-loaded:    ${agents.filter((a) => a.curated).length}`)
console.log(`Available:     ${agents.filter((a) => !a.curated).length}`)
console.log(`File: custom-modes/AGENT_CATALOG.md`)
