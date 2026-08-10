#!/usr/bin/env node

/**
 * @fileoverview Shared [TAG]-based logging for all automation scripts.
 *
 * Every automation script should log through this helper so each process and
 * sub-process is clearly identifiable — both in a local terminal and in the
 * GitHub Actions log. The tag scheme is hierarchical:
 *
 *   [PROCESS]            e.g. [VERIFY:SUBMODULE-PIN]
 *   [PROCESS:SUB]        e.g. [VERIFY:SUBMODULE-PIN:CHECKOUT]
 *   [PROCESS:SUB:STEP]   e.g. [VERIFY:SUBMODULE-PIN:DESCRIPTIONS]
 *
 * In CI (GITHUB_ACTIONS=true) the helper additionally emits native GitHub
 * Actions workflow commands (::group:: / ::notice:: / ::warning:: / ::error::)
 * so the Actions log UI renders collapsible groups and annotated messages that
 * make failures and warnings instantly visible.
 *
 * IMPORTANT: This module MUST remain side-effect free at import time (no
 * top-level output) because it is imported by scripts that are themselves
 * imported by node:test spec files.
 */

const IS_CI = process.env.GITHUB_ACTIONS === "true"

/** Formats a message with its hierarchical tag, e.g. `[VERIFY:SUBMODULE-PIN] ...`. */
function format(tag, message) {
	return `[${tag}] ${message}`
}

/**
 * Starts a logged step. In CI this opens a collapsible `::group::`; locally it
 * prints the step header. Always pair with `logEndGroup()`.
 * @param {string} tag - Hierarchical tag identifying the process/sub-process.
 * @param {string} message - Human-readable step description.
 */
export function logStep(tag, message) {
	const line = format(tag, message)
	if (IS_CI) {
		process.stdout.write(`::group::${line}\n`)
	} else {
		process.stdout.write(`▶ ${line}\n`)
	}
}

/**
 * Closes a group opened by `logStep()` (no-op outside CI).
 */
export function logEndGroup() {
	if (IS_CI) {
		process.stdout.write(`::endgroup::\n`)
	}
}

/**
 * Logs an informational message, prefixed with its tag.
 * @param {string} tag - Hierarchical tag identifying the process/sub-process.
 * @param {string} message - Informational message.
 */
export function logInfo(tag, message) {
	process.stdout.write(`${format(tag, message)}\n`)
}

/**
 * Logs a successful outcome.
 * @param {string} tag - Hierarchical tag identifying the process/sub-process.
 * @param {string} message - Success message.
 */
export function logOk(tag, message) {
	process.stdout.write(`✔ ${format(tag, message)}\n`)
}

/**
 * Logs a warning. In CI this also emits `::warning::` so the Actions UI flags it.
 * @param {string} tag - Hierarchical tag identifying the process/sub-process.
 * @param {string} message - Warning message.
 */
export function logWarn(tag, message) {
	const line = format(tag, message)
	if (IS_CI) {
		process.stdout.write(`::warning::${line}\n`)
	}
	process.stdout.write(`⚠️  ${line}\n`)
}

/**
 * Logs an error. In CI this also emits `::error::` so the Actions UI flags it.
 * @param {string} tag - Hierarchical tag identifying the process/sub-process.
 * @param {string} message - Error message.
 */
export function logError(tag, message) {
	const line = format(tag, message)
	if (IS_CI) {
		process.stdout.write(`::error::${line}\n`)
	}
	process.stdout.write(`❌ ${line}\n`)
}

/**
 * Logs a final success banner (e.g. "gate passed").
 * @param {string} tag - Hierarchical tag identifying the process/sub-process.
 * @param {string} message - Success message.
 */
export function logSuccess(tag, message) {
	process.stdout.write(`🎉 ${format(tag, message)}\n`)
}

/**
 * Runs an async function inside a log group with start/end logging.
 * @param {string} tag - Hierarchical tag for the group.
 * @param {string} label - Label for the group header.
 * @param {() => Promise<void>} fn - The work to run inside the group.
 */
export async function withLogGroup(tag, label, fn) {
	logStep(tag, label)
	try {
		await fn()
	} finally {
		logEndGroup()
	}
}

export default {
	IS_CI,
	logStep,
	logEndGroup,
	logInfo,
	logOk,
	logWarn,
	logError,
	logSuccess,
	withLogGroup,
}
