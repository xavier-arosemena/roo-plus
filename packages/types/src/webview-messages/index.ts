import { z } from "zod"

import type { WebviewMessage } from "../vscode-extension-host.js"
import { checkpointDiffMessageSchema, checkpointRestoreMessageSchema } from "./checkpoint.js"
import { allowedCommandsMessageSchema, deniedCommandsMessageSchema } from "./commands.js"
import { updateSettingsMessageSchema } from "./settings.js"
import { saveApiConfigurationMessageSchema, upsertApiConfigurationMessageSchema } from "./providerConfig.js"
import {
	fetchMarketplaceDataMessageSchema,
	filterMarketplaceItemsMessageSchema,
	installMarketplaceItemMessageSchema,
	installMarketplaceItemsMessageSchema,
	installMarketplaceItemWithParametersMessageSchema,
} from "./marketplace.js"
import {
	queueMessageMessageSchema,
	removeQueuedMessageMessageSchema,
	editQueuedMessageMessageSchema,
} from "./messageQueue.js"
import {
	updateTodoListMessageSchema,
	updateCustomModeMessageSchema,
	deleteCustomModeMessageSchema,
} from "./customModes.js"

/**
 * String-literal union of every webview message type.
 *
 * Derived from the existing `WebviewMessage.type` union so the literal list
 * stays in sync with the sender-facing interface (single source of truth).
 */
export type WebviewMessageType = WebviewMessage["type"]

/**
 * Registry of zod schemas keyed by message type.
 *
 * A type only appears here once its payload is fully typed (see S1-M3 for the
 * migration of the remaining domains). The boundary (`parseWebviewMessage`)
 * validates registered types strictly and passes unregistered ones through
 * structurally.
 */
export const webviewMessageSchemas: Partial<Record<WebviewMessageType, z.ZodType>> = {
	checkpointDiff: checkpointDiffMessageSchema,
	checkpointRestore: checkpointRestoreMessageSchema,
	allowedCommands: allowedCommandsMessageSchema,
	deniedCommands: deniedCommandsMessageSchema,
	updateSettings: updateSettingsMessageSchema,
	saveApiConfiguration: saveApiConfigurationMessageSchema,
	upsertApiConfiguration: upsertApiConfigurationMessageSchema,
	installMarketplaceItem: installMarketplaceItemMessageSchema,
	installMarketplaceItems: installMarketplaceItemsMessageSchema,
	installMarketplaceItemWithParameters: installMarketplaceItemWithParametersMessageSchema,
	fetchMarketplaceData: fetchMarketplaceDataMessageSchema,
	filterMarketplaceItems: filterMarketplaceItemsMessageSchema,
	queueMessage: queueMessageMessageSchema,
	removeQueuedMessage: removeQueuedMessageMessageSchema,
	editQueuedMessage: editQueuedMessageMessageSchema,
	updateTodoList: updateTodoListMessageSchema,
	updateCustomMode: updateCustomModeMessageSchema,
	deleteCustomMode: deleteCustomModeMessageSchema,
}

/**
 * Fully-typed subset of the protocol as a discriminated union, built from the
 * registered schemas. Grows over time as domains migrate (S1-M3+).
 */
export const webviewMessageSchema = z.discriminatedUnion("type", [
	checkpointDiffMessageSchema,
	checkpointRestoreMessageSchema,
	allowedCommandsMessageSchema,
	deniedCommandsMessageSchema,
	updateSettingsMessageSchema,
	saveApiConfigurationMessageSchema,
	upsertApiConfigurationMessageSchema,
	installMarketplaceItemMessageSchema,
	installMarketplaceItemsMessageSchema,
	installMarketplaceItemWithParametersMessageSchema,
	fetchMarketplaceDataMessageSchema,
	filterMarketplaceItemsMessageSchema,
	queueMessageMessageSchema,
	removeQueuedMessageMessageSchema,
	editQueuedMessageMessageSchema,
	updateTodoListMessageSchema,
	updateCustomModeMessageSchema,
	deleteCustomModeMessageSchema,
])

export type ParseWebviewMessageResult = { ok: true; message: WebviewMessage } | { ok: false; error: string }

/**
 * Boundary validation for webview→extension messages.
 *
 * Three modes:
 *  - non-object input or a missing/invalid `type` field → rejected
 *  - `type` with a registered schema → strict `safeParse`; failure → rejected
 *  - `type` unregistered → structural pass-through (transitional, never reject)
 *
 * This is the fail-closed gate that closes the webview→extension "Input Gap"
 * without breaking the existing `WebviewMessage` interface or its senders.
 */
export function parseWebviewMessage(raw: unknown): ParseWebviewMessageResult {
	if (typeof raw !== "object" || raw === null) {
		return { ok: false, error: "Webview message must be an object" }
	}

	const type = (raw as { type?: unknown }).type
	if (typeof type !== "string") {
		return { ok: false, error: "Webview message is missing a string 'type' field" }
	}

	const schema = webviewMessageSchemas[type as WebviewMessageType]
	if (schema) {
		const result = schema.safeParse(raw)
		if (!result.success) {
			return { ok: false, error: `Invalid '${type}' message: ${result.error.message}` }
		}
		return { ok: true, message: result.data as WebviewMessage }
	}

	// Transitional pass-through for unregistered types — keeps the migration
	// incremental without breaking the existing sender construction sites.
	return { ok: true, message: raw as WebviewMessage }
}

export { checkpointDiffMessageSchema, checkpointRestoreMessageSchema } from "./checkpoint.js"
export type { CheckpointMessage } from "./checkpoint.js"
export { allowedCommandsMessageSchema, deniedCommandsMessageSchema, commandsMessageSchema } from "./commands.js"
export type { CommandsMessage } from "./commands.js"
export { updateSettingsMessageSchema } from "./settings.js"
export type { SettingsMessage } from "./settings.js"
export {
	saveApiConfigurationMessageSchema,
	upsertApiConfigurationMessageSchema,
	providerConfigMessageSchema,
} from "./providerConfig.js"
export type { ProviderConfigMessage } from "./providerConfig.js"
export {
	fetchMarketplaceDataMessageSchema,
	filterMarketplaceItemsMessageSchema,
	installMarketplaceItemMessageSchema,
	installMarketplaceItemsMessageSchema,
	installMarketplaceItemWithParametersMessageSchema,
	marketplaceMessageSchema,
} from "./marketplace.js"
export type { MarketplaceMessage } from "./marketplace.js"
export {
	queueMessageMessageSchema,
	removeQueuedMessageMessageSchema,
	editQueuedMessageMessageSchema,
	messageQueueMessageSchema,
} from "./messageQueue.js"
export type { MessageQueueMessage } from "./messageQueue.js"
export {
	updateTodoListMessageSchema,
	updateCustomModeMessageSchema,
	deleteCustomModeMessageSchema,
	customModesMessageSchema,
} from "./customModes.js"
export type { CustomModesMessage } from "./customModes.js"
