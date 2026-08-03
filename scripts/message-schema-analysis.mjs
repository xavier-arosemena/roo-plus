/**
 * message-schema-analysis.mjs
 *
 * Pure analysis logic for the webview↔extension message-schema ratchet (S1-M4).
 *
 * Split out of the executable (`verify-message-schemas.mjs`) so the ratchet
 * decisions are unit-testable without importing the built `@roo-code/types`
 * package or reading files.
 */

/**
 * Security-sensitive message types that MUST always have a schema in
 * `webviewMessageSchemas` (see `packages/types/src/webview-messages/index.ts`).
 *
 * This list must only ever GROW: once a type is added here, unregistering it is
 * a regression that fails CI. Newly typed domains are appended here during
 * follow-up migration work (S1-M4).
 */
export const MESSAGE_SCHEMA_BASELINE = [
	"checkpointDiff",
	"checkpointRestore",
	"allowedCommands",
	"deniedCommands",
	"updateSettings",
	"saveApiConfiguration",
	"upsertApiConfiguration",
	"installMarketplaceItem",
	"installMarketplaceItems",
	"installMarketplaceItemWithParameters",
	"queueMessage",
	"removeQueuedMessage",
	"editQueuedMessage",
	"updateTodoList",
	"updateCustomMode",
	"deleteCustomMode",
]

/**
 * Maximum permitted number of UNTYPED message types (WebviewMessageType members
 * without a schema in the registry).
 *
 * This is the current count as of S1-M4: 165 literal members of the
 * `WebviewMessage.type` union minus 16 registered = 149. It must only ever
 * DECREASE as domains migrate; increasing it is a ratchet regression (the guard
 * goal is "the count of untyped message types must not increase").
 */
export const UNTYPED_MESSAGE_LIMIT = 149

/**
 * Extract the string-literal members of `WebviewMessage["type"]` from the
 * `WebviewMessage` interface in the package source. The union is type-only
 * (erased at runtime), so the source is the authoritative message-type list.
 *
 * @param {string} source  contents of packages/types/src/vscode-extension-host.ts
 * @returns {string[]} every quoted member of the interface's `type` union
 */
export function extractMessageTypesFromSource(source) {
	const interfaceStart = source.indexOf("export interface WebviewMessage {")
	if (interfaceStart === -1) {
		throw new Error('Could not find "export interface WebviewMessage" in the source')
	}
	const fieldsStart = source.indexOf("text?: string", interfaceStart)
	if (fieldsStart === -1) {
		throw new Error('Could not find the end of the WebviewMessage "type" union in the source')
	}
	const union = source.slice(interfaceStart, fieldsStart)
	const types = []
	for (const line of union.split("\n")) {
		const match = line.match(/^\s*\|\s*"([^"]+)"\s*$/)
		if (match) {
			types.push(match[1])
		}
	}
	return types
}

/**
 * Analyze a message-schema registry against the full message-type list and the
 * baseline. Pure — no I/O.
 *
 * @param {Record<string, unknown>} registry  e.g. webviewMessageSchemas (keyed by type)
 * @param {string[]} typeList  every WebviewMessageType member
 * @param {string[]} baseline  security-sensitive types that must stay registered
 * @returns {{ registered: string[], missingBaseline: string[], untyped: string[], untypedCount: number }}
 */
export function analyzeRegistry(registry, typeList, baseline) {
	const registered = new Set(Object.keys(registry))
	const missingBaseline = baseline.filter((type) => !registered.has(type))
	const untyped = typeList.filter((type) => !registered.has(type))
	return {
		registered: [...registered].sort(),
		missingBaseline: [...missingBaseline].sort(),
		untyped: [...untyped].sort(),
		untypedCount: untyped.length,
	}
}

/**
 * Decide whether the ratchet passes for the given analysis.
 *
 * @param {{ missingBaseline: string[], untypedCount: number }} analysis
 * @param {number} untypedLimit
 * @returns {{ ok: boolean, problems: string[] }}
 */
export function evaluateRatchet({ missingBaseline, untypedCount }, untypedLimit) {
	const problems = []
	if (missingBaseline.length > 0) {
		problems.push(
			`Registered-schema regression: baseline type(s) missing from webviewMessageSchemas: ${missingBaseline.join(", ")}`,
		)
	}
	if (untypedCount > untypedLimit) {
		problems.push(`Untyped message count increased: ${untypedCount} > ${untypedLimit}`)
	}
	return { ok: problems.length === 0, problems }
}
