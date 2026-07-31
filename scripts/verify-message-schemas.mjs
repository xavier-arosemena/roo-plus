#!/usr/bin/env node

/**
 * verify-message-schemas.mjs
 *
 * Ratchet guard for the typed webview↔extension message protocol (S1-M4).
 *
 * Fails (exit 1) when:
 *   (a) a security-sensitive baseline message type loses its zod schema, or
 *   (b) the number of UNTYPED message types increases past UNTYPED_MESSAGE_LIMIT.
 *
 * The registry (`webviewMessageSchemas`) is imported from the BUILT
 * `@roo-code/types` package (packages/types/dist/index.js — the package's
 * `import` export points at TS source and it is not symlinked into root
 * node_modules, so the built artifact is imported directly). The message-type
 * list is parsed from the `WebviewMessage.type` union in the package source,
 * which is type-only (erased at runtime).
 *
 * CI ordering matters: build the package first, then run this script.
 *   pnpm --filter @roo-code/types build
 *   node scripts/verify-message-schemas.mjs
 */

import { readFile } from "node:fs/promises"

import {
	MESSAGE_SCHEMA_BASELINE,
	UNTYPED_MESSAGE_LIMIT,
	analyzeRegistry,
	evaluateRatchet,
	extractMessageTypesFromSource,
} from "./message-schema-analysis.mjs"

const TYPES_DIST_URL = new URL("../packages/types/dist/index.js", import.meta.url)
const WEBVIEW_MESSAGE_SOURCE_URL = new URL("../packages/types/src/vscode-extension-host.ts", import.meta.url)

async function main() {
	// 1. Registry from the built package (fails loudly if the package isn't built).
	let webviewMessageSchemas
	try {
		const typesModule = await import(TYPES_DIST_URL.href)
		webviewMessageSchemas = typesModule.webviewMessageSchemas
	} catch (error) {
		console.error("❌ Could not import the message-schema registry from the built @roo-code/types package.")
		console.error(`   Expected ${TYPES_DIST_URL.pathname} — build it first with:`)
		console.error("   pnpm --filter @roo-code/types build")
		console.error(`   (${error.message})`)
		process.exit(1)
	}

	// 2. Full message-type list from the source union.
	let source
	try {
		source = await readFile(WEBVIEW_MESSAGE_SOURCE_URL, "utf-8")
	} catch (error) {
		console.error(`❌ Could not read ${WEBVIEW_MESSAGE_SOURCE_URL.pathname}: ${error.message}`)
		process.exit(1)
	}
	const typeList = extractMessageTypesFromSource(source)

	// 3. Analyze + report so the ratchet is observable.
	const analysis = analyzeRegistry(webviewMessageSchemas, typeList, MESSAGE_SCHEMA_BASELINE)
	const verdict = evaluateRatchet(analysis, UNTYPED_MESSAGE_LIMIT)

	const sample = analysis.untyped.slice(0, 8)
	const sampleText = sample.length < analysis.untyped.length ? `${sample.join(", ")}, …` : sample.join(", ")
	console.log(
		`ℹ Message types: ${typeList.length} total, ${analysis.registered.length} registered, ${analysis.untypedCount} untyped (limit ${UNTYPED_MESSAGE_LIMIT})`,
	)
	console.log(`ℹ Untyped sample: ${sampleText || "(none)"}`)

	if (!verdict.ok) {
		for (const problem of verdict.problems) {
			console.error(`❌ ${problem}`)
		}
		console.error(
			"   Untyped types must not increase; baseline types must never lose their schema (see plans/s1-message-protocol.md, S1-M4).",
		)
		process.exit(1)
	}

	console.log(
		`✅ Message-schema ratchet OK: all ${MESSAGE_SCHEMA_BASELINE.length} baseline types registered, ${analysis.untypedCount} untyped ≤ ${UNTYPED_MESSAGE_LIMIT}`,
	)
	process.exit(0)
}

main().catch((error) => {
	console.error("❌ Verify failed:", error.message)
	process.exit(1)
})
