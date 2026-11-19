#!/usr/bin/env node
/**
 * architecture-facts.mjs
 *
 * Derives the quantitative facts quoted in `docs/architecture.md` from the
 * repository source and keeps them honest.
 *
 * Why this exists: the architecture document previously quoted counts and file
 * sizes that were hand-copied from prose. Every one of them rotted, and at least
 * three sources disagreed (source code, CI allowlists, ADR text). Numbers that
 * cannot be regenerated are numbers that will eventually lie, so the document
 * now carries a generated block instead of hand-maintained figures.
 *
 * Usage:
 *   node scripts/architecture-facts.mjs           # rewrite the block in place
 *   node scripts/architecture-facts.mjs --check   # exit 1 if the block is stale
 *
 * Exit codes:
 *   0  block is current (or was rewritten successfully)
 *   1  block is stale, markers are missing, or allowlist drift was detected
 *
 * The block is delimited by `<!-- architecture-facts:start -->` and
 * `<!-- architecture-facts:end -->` in `docs/architecture.md`.
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { EXTENSION_MESSAGE_BASELINE, MESSAGE_SCHEMA_BASELINE } from "./message-schema-analysis.mjs"

const HERE = path.dirname(fileURLToPath(import.meta.url))
export const REPO_ROOT = path.resolve(HERE, "..")

/**
 * Normalise a facts rendering so markdown table padding (added by prettier)
 * cannot make the generated block look stale.
 *
 * @param {string} text
 * @returns {string}
 */
export function normalizeFactsText(text) {
	return text
		.split("\n")
		.map((line) =>
			line
				.replace(/\s*\|\s*/g, "|")
				// prettier pads separator rows to the column width; dash runs carry no meaning
				.replace(/-{3,}/g, "---")
				.trim(),
		)
		.filter((line) => line.length > 0)
		.join("\n")
}

/**
 * Extract the current generated block, or an empty string when absent.
 *
 * @param {string} document
 * @returns {string}
 */
export function extractFactsBlock(document) {
	const start = document.indexOf(START_MARKER)
	const end = document.indexOf(END_MARKER)
	if (start === -1 || end === -1 || end < start) return ""
	return document.slice(start + START_MARKER.length, end)
}

export const START_MARKER = "<!-- architecture-facts:start -->"
export const END_MARKER = "<!-- architecture-facts:end -->"

const DOC_PATH = path.join(REPO_ROOT, "docs", "architecture.md")
const WEBVIEW_MESSAGES = path.join(REPO_ROOT, "packages/types/src/webview-messages/index.ts")
const EXTENSION_MESSAGES = path.join(REPO_ROOT, "packages/types/src/extension-messages/index.ts")
const API_INDEX = path.join(REPO_ROOT, "src/api/index.ts")
const TOOLS_DIR = path.join(REPO_ROOT, "src/core/tools")
const HANDLERS_DIR = path.join(REPO_ROOT, "src/core/webview/handlers")
const LOCALES_DIR = path.join(REPO_ROOT, "src/i18n/locales")
const SIZED_FILES = [
	"src/core/task/Task.ts",
	"src/core/webview/ClineProvider.ts",
	"src/core/services/TaskOrchestrator.ts",
]

/**
 * Count the keys of a zod registry object literal.
 *
 * Matches `export const <markerName>... = {` through the closing `}` at column
 * zero, then counts top-level `key:` entries. Comments and blank lines are
 * ignored by construction.
 *
 * @param {string} source file contents
 * @param {string} markerName exported binding name, e.g. "webviewMessageSchemas"
 * @returns {string[]} registry keys, in file order
 */
export function parseRegistryKeys(source, markerName) {
	const start = source.indexOf(`export const ${markerName}`)
	if (start === -1) {
		throw new Error(`Could not find "export const ${markerName}"`)
	}
	const end = source.indexOf("\n}", start)
	if (end === -1) {
		throw new Error(`Could not find the end of the "${markerName}" object literal`)
	}
	const block = source.slice(start, end)
	return [...block.matchAll(/^\t([A-Za-z0-9_]+):/gm)].map((match) => match[1])
}

/**
 * Count the members of a zod `discriminatedUnion("type", [...])` array.
 *
 * Each member is a `...Schema,` line. Comments and blank lines are ignored.
 *
 * @param {string} source file contents
 * @param {string} markerName exported binding name, e.g. "webviewMessageSchema"
 * @returns {number} number of union members
 */
export function parseUnionMembers(source, markerName) {
	const start = source.indexOf(`export const ${markerName} = z.discriminatedUnion(`)
	if (start === -1) {
		throw new Error(`Could not find "export const ${markerName} = z.discriminatedUnion("`)
	}
	const end = source.indexOf("])", start)
	if (end === -1) {
		throw new Error(`Could not find the end of the "${markerName}" union`)
	}
	const block = source.slice(start, end)
	return [...block.matchAll(/^\t[A-Za-z0-9_]+Schema,$/gm)].length
}

/**
 * Compare an allowlist against a registry in both directions.
 *
 * `missingFromRegistry` is a ratchet regression (a protected type lost its
 * schema). `notInBaseline` means a registered type is unprotected against
 * removal — the guard only covers what it lists.
 *
 * @param {string[]} baseline
 * @param {string[]} registryKeys
 * @returns {{ missingFromRegistry: string[], notInBaseline: string[] }}
 */
export function computeDrift(baseline, registryKeys) {
	const baselineSet = new Set(baseline)
	const registrySet = new Set(registryKeys)
	return {
		missingFromRegistry: baseline.filter((type) => !registrySet.has(type)),
		notInBaseline: registryKeys.filter((type) => !baselineSet.has(type)),
	}
}

function countFiles(dir, predicate) {
	return fs.readdirSync(dir, { withFileTypes: true }).filter((entry) => entry.isFile() && predicate(entry.name))
		.length
}

function countDirs(dir) {
	return fs.readdirSync(dir, { withFileTypes: true }).filter((entry) => entry.isDirectory()).length
}

function countLines(relativePath) {
	const contents = fs.readFileSync(path.join(REPO_ROOT, relativePath), "utf8")
	return contents.split("\n").length - (contents.endsWith("\n") ? 1 : 0)
}

/**
 * Collect every fact rendered into the document block.
 *
 * Pure with respect to the repository (reads files, no writes) so `--check` and
 * the rewrite path always agree.
 *
 * @returns {Record<string, number|string>}
 */
export function collectFacts() {
	const webviewSource = fs.readFileSync(WEBVIEW_MESSAGES, "utf8")
	const extensionSource = fs.readFileSync(EXTENSION_MESSAGES, "utf8")

	const inboundRegistryKeys = parseRegistryKeys(webviewSource, "webviewMessageSchemas")
	const outboundRegistryKeys = parseRegistryKeys(extensionSource, "extensionMessageSchemas")

	const inboundDrift = computeDrift(MESSAGE_SCHEMA_BASELINE, inboundRegistryKeys)
	const outboundDrift = computeDrift(EXTENSION_MESSAGE_BASELINE, outboundRegistryKeys)

	const apiSource = fs.readFileSync(API_INDEX, "utf8")

	const fileSizes = Object.fromEntries(SIZED_FILES.map((file) => [file, countLines(file)]))

	return {
		inboundUnion: parseUnionMembers(webviewSource, "webviewMessageSchema"),
		inboundRegistry: inboundRegistryKeys.length,
		inboundBaseline: MESSAGE_SCHEMA_BASELINE.length,
		outboundUnion: parseUnionMembers(extensionSource, "extensionMessageSchema"),
		outboundRegistry: outboundRegistryKeys.length,
		outboundBaseline: EXTENSION_MESSAGE_BASELINE.length,
		inboundMissing: inboundDrift.missingFromRegistry.length,
		outboundMissing: outboundDrift.missingFromRegistry.length,
		inboundUnprotected: inboundDrift.notInBaseline.length,
		outboundUnprotected: outboundDrift.notInBaseline.length,
		tools: countFiles(TOOLS_DIR, (name) => name.endsWith("Tool.ts") && name !== "BaseTool.ts"),
		handlers: countFiles(HANDLERS_DIR, (name) => name.endsWith(".ts") && name !== "shared.ts"),
		locales: countDirs(LOCALES_DIR),
		providerArms: [...apiSource.matchAll(/case providerIdentifiers\./g)].length,
		taskLines: fileSizes["src/core/task/Task.ts"],
		clineProviderLines: fileSizes["src/core/webview/ClineProvider.ts"],
		orchestratorLines: fileSizes["src/core/services/TaskOrchestrator.ts"],
	}
}

/**
 * Render the fact block as markdown.
 *
 * @param {Record<string, number|string>} facts
 * @returns {string} markdown table, without the surrounding markers
 */
export function renderFactsTable(facts) {
	return [
		"| Fact | Value | Derived from |",
		"| --- | --- | --- |",
		`| Inbound schema entries (\`webviewMessageSchema\`) | ${facts.inboundUnion} | \`packages/types/src/webview-messages/index.ts\` |`,
		`| Inbound registry keys (\`webviewMessageSchemas\`) | ${facts.inboundRegistry} | same file |`,
		`| Inbound CI allowlist size (\`MESSAGE_SCHEMA_BASELINE\`) | ${facts.inboundBaseline} | \`scripts/message-schema-analysis.mjs\` |`,
		`| Outbound schema entries (\`extensionMessageSchema\`) | ${facts.outboundUnion} | \`packages/types/src/extension-messages/index.ts\` |`,
		`| Outbound registry keys (\`extensionMessageSchemas\`) | ${facts.outboundRegistry} | same file |`,
		`| Outbound CI allowlist size (\`EXTENSION_MESSAGE_BASELINE\`) | ${facts.outboundBaseline} | \`scripts/message-schema-analysis.mjs\` |`,
		`| Allowlist types missing from a registry (must be 0) | ${facts.inboundMissing + facts.outboundMissing} | derived |`,
		`| Registered types missing from an allowlist (must be 0) | ${facts.inboundUnprotected + facts.outboundUnprotected} | derived |`,
		`| Tool implementations (\`*Tool.ts\`) | ${facts.tools} | \`src/core/tools/\` |`,
		`| Webview handler domain modules | ${facts.handlers} | \`src/core/webview/handlers/\` |`,
		`| Host locales | ${facts.locales} | \`src/i18n/locales/\` |`,
		`| Provider arms in \`buildApiHandler\` | ${facts.providerArms} | \`src/api/index.ts\` |`,
		`| \`Task.ts\` lines | ${facts.taskLines} | \`src/core/task/Task.ts\` |`,
		`| \`ClineProvider.ts\` lines | ${facts.clineProviderLines} | \`src/core/webview/ClineProvider.ts\` |`,
		`| \`TaskOrchestrator.ts\` lines | ${facts.orchestratorLines} | \`src/core/services/TaskOrchestrator.ts\` |`,
	].join("\n")
}

/**
 * Replace the marked block in a document.
 *
 * @param {string} document full markdown text
 * @param {string} table rendered facts
 * @returns {string} document with the block replaced
 * @throws when either marker is missing (never silently appends)
 */
export function replaceFactsBlock(document, table) {
	const start = document.indexOf(START_MARKER)
	const end = document.indexOf(END_MARKER)
	if (start === -1 || end === -1 || end < start) {
		throw new Error(
			`Missing ${START_MARKER} / ${END_MARKER} markers in docs/architecture.md — refusing to guess where the block belongs`,
		)
	}
	return document.slice(0, start + START_MARKER.length) + "\n\n" + table + "\n\n" + document.slice(end)
}

function main() {
	const check = process.argv.includes("--check")
	const facts = collectFacts()
	const table = renderFactsTable(facts)

	if (facts.inboundMissing > 0 || facts.outboundMissing > 0) {
		console.error(
			`[architecture-facts] Ratchet regression: allowlist type(s) missing from a registry (inbound ${facts.inboundMissing}, outbound ${facts.outboundMissing}). Run node scripts/verify-message-schemas.mjs for details.`,
		)
		return 1
	}

	if (facts.inboundUnprotected > 0 || facts.outboundUnprotected > 0) {
		console.error(
			`[architecture-facts] Unprotected message types: ${facts.inboundUnprotected} inbound and ${facts.outboundUnprotected} outbound registered type(s) are absent from their CI allowlist. Add them to scripts/message-schema-analysis.mjs.`,
		)
		return 1
	}

	const document = fs.readFileSync(DOC_PATH, "utf8")
	const expected = replaceFactsBlock(document, table)

	if (!check) {
		if (expected !== document) {
			fs.writeFileSync(DOC_PATH, expected, "utf8")
			console.log("[architecture-facts] docs/architecture.md updated")
		} else {
			console.log("[architecture-facts] docs/architecture.md already current")
		}
		return 0
	}

	if (normalizeFactsText(extractFactsBlock(expected)) !== normalizeFactsText(extractFactsBlock(document))) {
		console.error(
			"[architecture-facts] docs/architecture.md is stale. Run `pnpm architecture:facts` and commit the result.",
		)
		return 1
	}

	console.log("[architecture-facts] docs/architecture.md is current")
	return 0
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	process.exitCode = main()
}
