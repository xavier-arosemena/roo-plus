import * as vscode from "vscode"

import type { CreateRuleInput, DeleteRuleInput, RuleMetadata } from "@roo-code/types"
import {
	type CreateRuleValues,
	type DeleteRuleValues,
	type RulesMessage,
	createRuleMessageSchema,
	deleteRuleMessageSchema,
	openRuleFileMessageSchema,
	openRulesDirectoryMessageSchema,
} from "@roo-code/types"

import type { ClineProvider } from "./ClineProvider"
import { openFile } from "../../integrations/misc/open-file"
import { createRule, deleteRule, getRules, getRulesDirectoryPath, resolveRuleFile } from "../../services/rules/rules"

export type RulesProvider = Pick<ClineProvider, "getModes" | "postMessageToWebview" | "log">

/** Minimal shape `parseCreateRuleInput` consumes (createRule member + text fallback). */
interface CreateRuleInputMessage {
	values?: CreateRuleValues
	text?: string
}

/** Minimal shape `parseDeleteRuleInput` consumes (deleteRule/openRuleFile member + text fallback). */
interface DeleteRuleInputMessage {
	values?: DeleteRuleValues
	text?: string
}

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error)
}

export async function handleRequestRules(provider: RulesProvider, cwd: string): Promise<RuleMetadata[]> {
	try {
		const modes = await provider.getModes()
		const rules = await getRules(cwd, { modes })
		await provider.postMessageToWebview({ type: "rules", rules })
		return rules
	} catch (error) {
		provider.log(`Error fetching rules: ${getErrorMessage(error)}`)
		await provider.postMessageToWebview({ type: "rules", rules: [] })
		return []
	}
}

export async function handleCreateRule(
	provider: RulesProvider,
	cwd: string,
	message: RulesMessage,
): Promise<RuleMetadata[] | undefined> {
	// `values` is a typed object — an invalid `scope`/`kind` enum value is
	// rejected before any side effects.
	const result = createRuleMessageSchema.safeParse(message)
	if (!result.success) {
		provider.log(`[rulesMessageHandler] Rejected malformed createRule message: ${result.error.message}`)
		return undefined
	}

	try {
		const input = parseCreateRuleInput(result.data)
		const createdPath = await createRule(cwd, input)
		await openFile(createdPath)
	} catch (error) {
		const errorMessage = getErrorMessage(error)
		provider.log(`Error creating rule: ${errorMessage}`)
		vscode.window.showErrorMessage(`Failed to create rule: ${errorMessage}`)
		return undefined
	}

	try {
		return await refreshRules(provider, cwd)
	} catch (error) {
		const errorMessage = getErrorMessage(error)
		provider.log(`Rule created but failed to refresh rules: ${errorMessage}`)
		vscode.window.showWarningMessage("Rule created, but refreshing the rules list failed.")
		return undefined
	}
}

export async function handleDeleteRule(
	provider: RulesProvider,
	cwd: string,
	message: RulesMessage,
): Promise<RuleMetadata[] | undefined> {
	const result = deleteRuleMessageSchema.safeParse(message)
	if (!result.success) {
		provider.log(`[rulesMessageHandler] Rejected malformed deleteRule message: ${result.error.message}`)
		return undefined
	}

	try {
		const input = parseDeleteRuleInput(result.data)
		await deleteRule(cwd, input)
	} catch (error) {
		const errorMessage = getErrorMessage(error)
		provider.log(`Error deleting rule: ${errorMessage}`)
		vscode.window.showErrorMessage(`Failed to delete rule: ${errorMessage}`)
		return undefined
	}

	try {
		return await refreshRules(provider, cwd)
	} catch (error) {
		const errorMessage = getErrorMessage(error)
		provider.log(`Rule deleted but failed to refresh rules: ${errorMessage}`)
		vscode.window.showWarningMessage("Rule deleted, but refreshing the rules list failed.")
		return undefined
	}
}

export async function handleOpenRuleFile(provider: RulesProvider, cwd: string, message: RulesMessage): Promise<void> {
	const result = openRuleFileMessageSchema.safeParse(message)
	if (!result.success) {
		provider.log(`[rulesMessageHandler] Rejected malformed openRuleFile message: ${result.error.message}`)
		return
	}

	try {
		const input = parseDeleteRuleInput(result.data)
		const filePath = await resolveRuleFile(cwd, input)
		if (!filePath) {
			throw new Error("Rule file not found")
		}

		await openFile(filePath)
	} catch (error) {
		const errorMessage = getErrorMessage(error)
		provider.log(`Error opening rule file: ${errorMessage}`)
		vscode.window.showErrorMessage(`Failed to open rule file: ${errorMessage}`)
	}
}

export async function handleOpenRulesDirectory(
	provider: RulesProvider,
	cwd: string,
	message: RulesMessage,
): Promise<void> {
	const result = openRulesDirectoryMessageSchema.safeParse(message)
	if (!result.success) {
		provider.log(`[rulesMessageHandler] Rejected malformed openRulesDirectory message: ${result.error.message}`)
		return
	}

	try {
		const values = result.data.values ?? {}
		const scope = values.scope
		const kind = values.kind
		// scope/kind are optional on the schema (matching the interface fields);
		// mirror getTargetRuleDirectory's runtime validation so an omitted
		// scope/kind surfaces the same error as before.
		if (!scope || !kind) {
			throw new Error(scope ? "Invalid rule kind" : "Invalid rule scope")
		}
		const directoryPath = getRulesDirectoryPath(cwd, { scope, kind, modeSlug: values.modeSlug })
		await openFile(directoryPath)
	} catch (error) {
		const errorMessage = getErrorMessage(error)
		provider.log(`Error opening rules directory: ${errorMessage}`)
		vscode.window.showErrorMessage(`Failed to open rules directory: ${errorMessage}`)
	}
}

async function refreshRules(provider: RulesProvider, cwd: string): Promise<RuleMetadata[]> {
	const modes = await provider.getModes()
	const rules = await getRules(cwd, { modes })
	await provider.postMessageToWebview({ type: "rules", rules })
	return rules
}

function parseCreateRuleInput(message: CreateRuleInputMessage): CreateRuleInput {
	const values = message.values ?? {}
	const scope = values.scope
	const kind = values.kind
	const fileName = values.fileName ?? message.text

	if (!scope || !kind || !fileName) {
		throw new Error("Missing required fields: scope, kind, or fileName")
	}

	return {
		scope,
		kind,
		modeSlug: values.modeSlug,
		fileName,
	}
}

function parseDeleteRuleInput(message: DeleteRuleInputMessage): DeleteRuleInput {
	const values = message.values ?? {}
	const scope = values.scope
	const kind = values.kind
	const relativePath = values.relativePath ?? message.text

	if (!scope || !kind || !relativePath) {
		throw new Error("Missing required fields: scope, kind, or relativePath")
	}

	return {
		id: values.id,
		scope,
		kind,
		modeSlug: values.modeSlug,
		relativePath,
	}
}
