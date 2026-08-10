import { z } from "zod"

import type { ExtensionMessage } from "../vscode-extension-host.js"
import { stateMessageSchema } from "./state.js"
import { commandExecutionStatusMessageSchema, mcpExecutionStatusMessageSchema } from "./execution.js"
import { fileContentMessageSchema } from "./fileContent.js"
import { indexingStatusUpdateMessageSchema } from "./codeIndex.js"

/**
 * String-literal union of every extension (outbound) message type.
 *
 * Derived from the existing `ExtensionMessage.type` union so the literal list
 * stays in sync with the sender-facing interface (single source of truth).
 */
export type ExtensionMessageType = ExtensionMessage["type"]

/**
 * Registry of zod schemas keyed by message type.
 *
 * A type only appears here once its payload is fully typed (see Phase 2 of
 * docs/architecture-review-protocol-migration.md for the migration of the
 * remaining domains). The boundary (`parseExtensionMessage`) validates
 * registered types strictly and passes unregistered ones through structurally.
 */
export const extensionMessageSchemas: Partial<Record<ExtensionMessageType, z.ZodType>> = {
	state: stateMessageSchema,
	commandExecutionStatus: commandExecutionStatusMessageSchema,
	mcpExecutionStatus: mcpExecutionStatusMessageSchema,
	fileContent: fileContentMessageSchema,
	indexingStatusUpdate: indexingStatusUpdateMessageSchema,
}

/**
 * Fully-typed subset of the outbound protocol as a discriminated union, built
 * from the registered schemas. Grows over time as domains migrate (Phase 2+).
 */
export const extensionMessageSchema = z.discriminatedUnion("type", [
	stateMessageSchema,
	commandExecutionStatusMessageSchema,
	mcpExecutionStatusMessageSchema,
	fileContentMessageSchema,
	indexingStatusUpdateMessageSchema,
])

export type ParseExtensionMessageResult = { ok: true; message: ExtensionMessage } | { ok: false; error: string }

/**
 * Boundary validation for extension→webview|CLI messages.
 *
 * Three modes (mirroring `parseWebviewMessage`):
 *  - non-object input or a missing/invalid `type` field → rejected
 *  - `type` with a registered schema → strict `safeParse`; failure → rejected
 *  - `type` unregistered → structural pass-through (transitional, never reject)
 *
 * This is the fail-closed gate that starts closing the outbound "Type Lie"
 * without breaking the existing flat `ExtensionMessage` interface or its
 * producers/consumers.
 */
export function parseExtensionMessage(raw: unknown): ParseExtensionMessageResult {
	if (typeof raw !== "object" || raw === null) {
		return { ok: false, error: "Extension message must be an object" }
	}

	const type = (raw as { type?: unknown }).type
	if (typeof type !== "string") {
		return { ok: false, error: "Extension message is missing a string 'type' field" }
	}

	const schema = extensionMessageSchemas[type as ExtensionMessageType]
	if (schema) {
		const result = schema.safeParse(raw)
		if (!result.success) {
			return { ok: false, error: `Invalid '${type}' message: ${result.error.message}` }
		}
		return { ok: true, message: result.data as ExtensionMessage }
	}

	// Transitional pass-through for unregistered types — keeps the migration
	// incremental without breaking the existing producer construction sites.
	return { ok: true, message: raw as ExtensionMessage }
}

export { stateMessageSchema, extensionStateSubsetSchema } from "./state.js"
export type { StateMessage } from "./state.js"
export {
	commandExecutionStatusMessageSchema,
	mcpExecutionStatusMessageSchema,
	executionMessageSchema,
} from "./execution.js"
export type { ExecutionMessage } from "./execution.js"
export { fileContentMessageSchema } from "./fileContent.js"
export type { FileContentMessage } from "./fileContent.js"
export { indexingStatusUpdateMessageSchema, indexingStatusSchema } from "./codeIndex.js"
export type { CodeIndexMessage } from "./codeIndex.js"
