import * as assert from "assert"
import * as fs from "fs/promises"
import * as path from "path"
import * as vscode from "vscode"

import { RooCodeEventName, type ClineMessage, type WebviewMessage } from "@roo-code/types"

import { waitFor } from "../utils"
import { setDefaultSuiteTimeout } from "../test-utils"
import { SEMBLE_E2E_FIXTURE_DIR, SEMBLE_E2E_SUM_FILE } from "../../fixtures/codebase-search-semble"

/**
 * Extension-host journey test for the Semble code-index provider (remediation
 * item 5 of plans/architecture-review-code-index-semble.md).
 *
 * Covers the exact gap the binary-level smoke test cannot: enabling the
 * "Semble - Local" embedder -> the manager/provider reaching "Indexed" ->
 * `codebase_search` returning real snippets, all through the real VS Code
 * extension host + webview message router + spawned Semble binary.
 *
 * OPERATIONAL DEPENDENCY (mirrors scripts/semble-smoke.mjs): the first run may
 * download the ~150MB pinned binary and then the HuggingFace embedding model on
 * the first search. Both can exceed the 120s search timeout on a cold machine,
 * so this suite uses generous per-test timeouts, retries the search once, and
 * SKIPS (instead of failing) when the binary/model cannot be fetched in a
 * network-restricted CI environment.
 *
 * Because of the ~150MB binary download this suite is OPT-IN: it skips unless
 * SEMBLE_E2E_RUN=true (or SEMBLE_E2E_REQUIRED=true, which additionally forces a
 * failure instead of a skip). Intended CI placement is a scheduled/manual or
 * release-validation job, NOT the every-PR mocked e2e run.
 */

const DISPATCH_COMMAND = "roo-plus.testing.dispatchCodeIndexMessage"
const STATUS_COMMAND = "roo-plus.testing.getCodeIndexStatus"

// Mirror of SEMBLE_ARCHIVES keys in src/services/code-index/semble/semble-downloader.ts,
// so the suite can skip fast on platforms without a prebuilt binary.
const SEMBLE_SUPPORTED_PLATFORMS = new Set(["linux-x64", "linux-arm64", "darwin-arm64", "win32-x64"])

const SEMBLE_E2E_REQUIRED = process.env.SEMBLE_E2E_REQUIRED === "true"

// Binary download + checkInstalled on a cold machine can take minutes.
const INDEXED_WAIT_TIMEOUT_MS = 300_000
// First search may download the HuggingFace model; the extension search
// timeout is 120s and a retry covers the cold-start model-download case.
const SEARCH_TIMEOUT_MS = 300_000

type CodeIndexStatus = {
	systemStatus?: string
	message?: string
	processedItems?: number
	totalItems?: number
	currentItemUnit?: string
	workspacePath?: string
	workspaceEnabled?: boolean
}

function isCodeIndexStatus(value: unknown): value is CodeIndexStatus {
	return typeof value === "object" && value !== null && "systemStatus" in value
}

async function dispatchCodeIndexMessage(message: WebviewMessage): Promise<void> {
	await vscode.commands.executeCommand(DISPATCH_COMMAND, message)
}

async function getCodeIndexStatus(): Promise<CodeIndexStatus | undefined> {
	const status = await vscode.commands.executeCommand(STATUS_COMMAND)
	return isCodeIndexStatus(status) ? status : undefined
}

function buildTranscript(messages: ClineMessage[]): string {
	return messages
		.filter((m) => m.type === "say")
		.map((m) => `[${m.say}] ${typeof m.text === "string" ? m.text.slice(0, 500) : JSON.stringify(m.text)}`)
		.join("\n")
}

suite("Semble code-index journey (e2e)", function () {
	setDefaultSuiteTimeout(this)

	let workspaceDir: string

	suiteSetup(async function () {
		// Opt-in gate: this suite downloads the ~150MB pinned Semble binary and
		// may embed a HuggingFace model on the first search, so it must not run
		// on every PR. Scheduled/manual/release-validation jobs set
		// SEMBLE_E2E_RUN=true (see .github/workflows/e2e.yml placement note).
		if (process.env.SEMBLE_E2E_RUN !== "true" && process.env.SEMBLE_E2E_REQUIRED !== "true") {
			console.warn(
				"Skipping Semble journey suite: set SEMBLE_E2E_RUN=true (or SEMBLE_E2E_REQUIRED=true) to run it. It downloads a ~150MB binary and may embed a model on first search.",
			)
			this.skip()
			return
		}

		const workspaceFolders = vscode.workspace.workspaceFolders
		if (!workspaceFolders || workspaceFolders.length === 0) {
			throw new Error("No workspace folder found")
		}
		workspaceDir = workspaceFolders[0]!.uri.fsPath

		const fixtureDir = path.join(workspaceDir, SEMBLE_E2E_FIXTURE_DIR)
		await fs.rm(fixtureDir, { recursive: true, force: true })
		await fs.mkdir(fixtureDir, { recursive: true })

		await fs.writeFile(
			path.join(fixtureDir, "sum.js"),
			`// Tiny fixture file with a distinctive function for Semble to index.
function sumTwoNumbers(a, b) {
	return a + b
}

function multiplyTwoNumbers(a, b) {
	return a * b
}

module.exports = { sumTwoNumbers, multiplyTwoNumbers }
`,
		)
		await fs.writeFile(
			path.join(fixtureDir, "README.md"),
			`# Semble E2E Fixture

This directory exists so the extension-host Semble journey test has a small,
stable workspace to search. It contains a sumTwoNumbers function.
`,
		)
	})

	suiteTeardown(async () => {
		// Leave code indexing disabled so later suites start from a clean state.
		try {
			await dispatchCodeIndexMessage({
				type: "saveCodeIndexSettingsAtomic",
				codeIndexSettings: {
					codebaseIndexEnabled: false,
					codebaseIndexQdrantUrl: "http://localhost:6333",
					codebaseIndexEmbedderProvider: "semble",
					codebaseIndexEmbedderModelId: "",
				},
			})
		} catch {
			// Best-effort cleanup.
		}
		try {
			await fs.rm(path.join(workspaceDir, SEMBLE_E2E_FIXTURE_DIR), { recursive: true, force: true })
		} catch {
			// Best-effort cleanup.
		}
	})

	test("enabling 'Semble - Local' reaches Indexed status", async function () {
		this.timeout(INDEXED_WAIT_TIMEOUT_MS + 30_000)

		// Skip fast when the platform has no prebuilt binary (mirrors the
		// provider's own isSembleSupportedPlatform gate).
		const platformKey = `${process.platform}-${process.arch}`
		if (!SEMBLE_SUPPORTED_PLATFORMS.has(platformKey)) {
			console.warn(`Skipping Semble journey: no prebuilt binary for ${platformKey}`)
			this.skip()
		}

		// Enable the "Semble - Local" embedder through the real settings-save
		// message path. The provider change (default "openai" -> "semble")
		// triggers handleSettingsChange -> _recreateServices ->
		// SembleProvider.initialize(), which downloads + validates the pinned
		// binary and marks the shared state "Indexed".
		await dispatchCodeIndexMessage({
			type: "saveCodeIndexSettingsAtomic",
			codeIndexSettings: {
				codebaseIndexEnabled: true,
				codebaseIndexQdrantUrl: "http://localhost:6333",
				codebaseIndexEmbedderProvider: "semble",
				codebaseIndexEmbedderModelId: "",
				codebaseIndexEmbedderModelDimension: 0,
				codebaseIndexSearchMinScore: 0,
				codebaseIndexSearchMaxResults: 50,
				codebaseIndexSembleBinaryPath: "",
			},
		})

		let status: CodeIndexStatus | undefined
		try {
			await waitFor(
				async () => {
					status = await getCodeIndexStatus()
					return status?.systemStatus === "Indexed"
				},
				{ timeout: INDEXED_WAIT_TIMEOUT_MS, interval: 1_000 },
			)
		} catch {
			const message = status?.message ?? "unknown"
			if (SEMBLE_E2E_REQUIRED) {
				throw new Error(
					`Semble did not reach Indexed (SEMBLE_E2E_REQUIRED=true). status=${status?.systemStatus ?? "undefined"} message="${message}"`,
				)
			}
			console.warn(
				`Skipping Semble journey: binary/model could not be fetched (status=${status?.systemStatus ?? "undefined"}, message="${message}"). This mirrors the operational dependency documented in scripts/semble-smoke.mjs; set SEMBLE_E2E_REQUIRED=true to fail instead of skip.`,
			)
			this.skip()
		}

		assert.strictEqual(status?.systemStatus, "Indexed", `expected Indexed, got ${JSON.stringify(status)}`)
	})

	test("codebase_search returns snippets from the fixture workspace", async function () {
		this.timeout(SEARCH_TIMEOUT_MS + 30_000)
		// Cold start: the first search may download the HuggingFace embedding
		// model past the 120s search timeout. The retry runs against the now
		// cached model.
		this.retries(1)

		// If the enable step was skipped (binary unavailable), skip the search
		// step with the same reason rather than failing on an environmental gap.
		const currentStatus = await getCodeIndexStatus()
		if (currentStatus?.systemStatus !== "Indexed") {
			if (SEMBLE_E2E_REQUIRED) {
				throw new Error(
					`Cannot run codebase_search: Semble is not Indexed (SEMBLE_E2E_REQUIRED=true). status=${currentStatus?.systemStatus ?? "undefined"}`,
				)
			}
			console.warn(
				`Skipping codebase_search step: Semble is not Indexed (status=${currentStatus?.systemStatus ?? "undefined"}). Set SEMBLE_E2E_REQUIRED=true to fail instead of skip.`,
			)
			this.skip()
		}

		const api = globalThis.api
		const messages: ClineMessage[] = []
		let taskCompleted = false
		let taskId = ""

		const messageHandler = ({ message }: { message: ClineMessage }) => {
			messages.push(message)
		}
		const taskCompletedHandler = (id: string) => {
			if (id === taskId) {
				taskCompleted = true
			}
		}
		api.on(RooCodeEventName.Message, messageHandler)
		api.on(RooCodeEventName.TaskCompleted, taskCompletedHandler)

		try {
			taskId = await api.startNewTask({
				configuration: {
					mode: "code",
					autoApprovalEnabled: true,
					alwaysAllowReadOnly: true,
				},
				text: `Use the codebase_search tool to find the function that returns the sum of two numbers in the ${SEMBLE_E2E_FIXTURE_DIR} directory. Report the file path and the code chunk exactly as returned.`,
			})

			await waitFor(() => taskCompleted, { timeout: SEARCH_TIMEOUT_MS, interval: 1_000 })

			const transcript = buildTranscript(messages)

			// The tool posts a structured "codebase_search_result" say message
			// carrying { tool, content: { query, results: [{ filePath, score,
			// startLine, endLine, codeChunk }] } }.
			const searchResultMessage = messages.find((m) => m.type === "say" && m.say === "codebase_search_result")
			let parsed: { content?: { results?: Array<{ filePath?: string; codeChunk?: string }> } } | undefined
			if (searchResultMessage?.text) {
				try {
					parsed = JSON.parse(searchResultMessage.text) as typeof parsed
				} catch {
					parsed = undefined
				}
			}

			const results = parsed?.content?.results ?? []
			const nonEmptySnippets = results.filter((r) => !!r.filePath && !!r.codeChunk)

			assert.ok(
				nonEmptySnippets.length > 0,
				`codebase_search should return at least one snippet with non-empty file_path + content. Transcript:\n${transcript.slice(0, 3000)}`,
			)
			assert.ok(
				results.some((r) => r.filePath?.includes(SEMBLE_E2E_SUM_FILE)),
				`expected a snippet from ${SEMBLE_E2E_SUM_FILE}. Transcript:\n${transcript.slice(0, 3000)}`,
			)
		} finally {
			api.off(RooCodeEventName.Message, messageHandler)
			api.off(RooCodeEventName.TaskCompleted, taskCompletedHandler)
		}
	})
})
