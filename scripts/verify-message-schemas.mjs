#!/usr/bin/env node

/**
 * verify-message-schemas.mjs
 *
 * Ratchet guard for the typed webview↔extension message protocol (S1-M4,
 * extended in Phase 0 of docs/architecture-review-protocol-migration.md to the
 * outbound extension→webview|CLI direction).
 *
 * Fails (exit 1) when, for EITHER direction:
 *   (a) a security-sensitive baseline message type loses its zod schema, or
 *   (b) the number of UNTYPED message types increases past its limit.
 *
 * Both registries (`webviewMessageSchemas`, `extensionMessageSchemas`) are
 * imported from the BUILT `@roo-code/types` package (packages/types/dist/index.js
 * — the package's `import` export points at TS source and it is not symlinked
 * into root node_modules, so the built artifact is imported directly). The
 * message-type lists are parsed from the `WebviewMessage.type` and
 * `ExtensionMessage.type` unions in the package source, which are type-only
 * (erased at runtime).
 *
 * CI ordering matters: build the package first, then run this script.
 *   pnpm --filter @roo-code/types build
 *   node scripts/verify-message-schemas.mjs
 */

import { readFile } from "node:fs/promises"

import {
	EXTENSION_MESSAGE_BASELINE,
	MESSAGE_SCHEMA_BASELINE,
	UNTYPED_EXTENSION_MESSAGE_LIMIT,
	UNTYPED_MESSAGE_LIMIT,
	analyzeRegistry,
	evaluateRatchet,
	extractExtensionMessageTypesFromSource,
	extractMessageTypesFromSource,
} from "./message-schema-analysis.mjs"
import { logStep, logInfo, logError, logSuccess } from "./lib/logger.mjs"

const TYPES_DIST_URL = new URL("../packages/types/dist/index.js", import.meta.url)
const WEBVIEW_MESSAGE_SOURCE_URL = new URL("../packages/types/src/vscode-extension-host.ts", import.meta.url)

// Hierarchical tag identifying this process.
const TAG = "VERIFY:MESSAGE-SCHEMAS"

async function main() {
	// 1. Registries from the built package (fails loudly if the package isn't built).
	logStep(TAG, "Verifying message-schema ratchet (S1-M4, Phase 0 outbound)")
	let webviewMessageSchemas
	let extensionMessageSchemas
	try {
		const typesModule = await import(TYPES_DIST_URL.href)
		webviewMessageSchemas = typesModule.webviewMessageSchemas
		extensionMessageSchemas = typesModule.extensionMessageSchemas
	} catch (error) {
		logError(TAG, "could not import the message-schema registries from the built @roo-code/types package.")
		logError(TAG, `expected ${TYPES_DIST_URL.pathname} — build it first with:`)
		logError(TAG, "pnpm --filter @roo-code/types build")
		logError(TAG, `(${error.message})`)
		process.exit(1)
	}

	// 2. Full message-type lists from the source unions (both type-only).
	let source
	try {
		source = await readFile(WEBVIEW_MESSAGE_SOURCE_URL, "utf-8")
	} catch (error) {
		logError(TAG, `could not read ${WEBVIEW_MESSAGE_SOURCE_URL.pathname}: ${error.message}`)
		process.exit(1)
	}
	const inboundTypeList = extractMessageTypesFromSource(source)
	const outboundTypeList = extractExtensionMessageTypesFromSource(source)

	// 3. Analyze + report both directions so each ratchet is observable.
	const inbound = analyzeRegistry(webviewMessageSchemas, inboundTypeList, MESSAGE_SCHEMA_BASELINE)
	const inboundVerdict = evaluateRatchet(inbound, UNTYPED_MESSAGE_LIMIT)

	const outbound = analyzeRegistry(extensionMessageSchemas, outboundTypeList, EXTENSION_MESSAGE_BASELINE)
	const outboundVerdict = evaluateRatchet(
		outbound,
		UNTYPED_EXTENSION_MESSAGE_LIMIT,
		"extensionMessageSchemas",
	)

	const inboundSample = inbound.untyped.slice(0, 8)
	const inboundSampleText =
		inboundSample.length < inbound.untyped.length ? `${inboundSample.join(", ")}, …` : inboundSample.join(", ")
	logInfo(
		TAG,
		`Inbound (webview→extension): ${inboundTypeList.length} total, ${inbound.registered.length} registered, ${inbound.untypedCount} untyped (limit ${UNTYPED_MESSAGE_LIMIT})`,
	)
	logInfo(TAG, `Inbound untyped sample: ${inboundSampleText || "(none)"}`)

	const outboundSample = outbound.untyped.slice(0, 8)
	const outboundSampleText =
		outboundSample.length < outbound.untyped.length ? `${outboundSample.join(", ")}, …` : outboundSample.join(", ")
	logInfo(
		TAG,
		`Outbound (extension→webview|CLI): ${outboundTypeList.length} total, ${outbound.registered.length} registered, ${outbound.untypedCount} untyped (limit ${UNTYPED_EXTENSION_MESSAGE_LIMIT})`,
	)
	logInfo(TAG, `Outbound untyped sample: ${outboundSampleText || "(none)"}`)

	const problems = [...inboundVerdict.problems, ...outboundVerdict.problems]
	if (problems.length > 0) {
		for (const problem of problems) {
			logError(TAG, problem)
		}
		logError(
			TAG,
			"Untyped types must not increase; baseline types must never lose their schema (see docs/architecture-review-protocol-migration.md).",
		)
		process.exit(1)
	}

	logSuccess(
		TAG,
		`Message-schema ratchet OK: ${MESSAGE_SCHEMA_BASELINE.length} inbound baseline types registered (${inbound.untypedCount} untyped ≤ ${UNTYPED_MESSAGE_LIMIT}); ` +
			`${EXTENSION_MESSAGE_BASELINE.length} outbound baseline types registered (${outbound.untypedCount} untyped ≤ ${UNTYPED_EXTENSION_MESSAGE_LIMIT})`,
	)
	process.exit(0)
}

main().catch((error) => {
	logError(TAG, `verify failed: ${error.message}`)
	process.exit(1)
})
