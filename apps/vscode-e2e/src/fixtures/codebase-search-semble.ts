import { LLMock } from "@copilotkit/aimock"

import { toolResultContains } from "./fixture-utils"

/**
 * Tool-call id shared by the fixtures below; scoping the tool-result predicates
 * to this id keeps them from colliding with any other suite's tool calls.
 */
export const SEMBLE_CODEBASE_SEARCH_TOOL_CALL_ID = "call_codebase_search_semble_001"

/** The workspace-relative fixture file the search must surface. */
export const SEMBLE_E2E_FIXTURE_DIR = "semble-e2e-fixture"
export const SEMBLE_E2E_SUM_FILE = `${SEMBLE_E2E_FIXTURE_DIR}/sum.js`

/**
 * Fixtures that drive the Semble code-index journey's `codebase_search` step
 * through the mocked LLM:
 *
 * 1. When the task prompt asks to use `codebase_search`, respond with a
 *    `codebase_search` tool call targeting the fixture workspace.
 * 2. Complete the task ONLY when the REAL tool result — produced by the actual
 *    Semble binary in the extension host — contains the expected snippet shape
 *    (a non-empty `File path:` / `Code Chunk:` pointing at the fixture file).
 * 3. Safety net: terminate the task on any other outcome for the same tool
 *    call (e.g. a cold-start HuggingFace model-download timeout or an empty
 *    result) so the suite can retry/skip instead of hanging. It is mutually
 *    exclusive with fixture 2 (it matches only when fixture 2's markers are
 *    absent), so it can never shadow a real success regardless of match order.
 */
export function addCodebaseSearchSembleFixtures(mock: InstanceType<typeof LLMock>) {
	mock.addFixture({
		match: {
			userMessage: /use the codebase_search tool/i,
		},
		response: {
			toolCalls: [
				{
					name: "codebase_search",
					arguments: JSON.stringify({ query: "function that returns the sum of two numbers" }),
					id: SEMBLE_CODEBASE_SEARCH_TOOL_CALL_ID,
				},
			],
		},
	})

	const successMarkers = ["File path:", "Code Chunk:", SEMBLE_E2E_SUM_FILE]

	mock.addFixture({
		match: {
			predicate: (req) => toolResultContains(req, SEMBLE_CODEBASE_SEARCH_TOOL_CALL_ID, successMarkers),
		},
		response: {
			toolCalls: [
				{
					name: "attempt_completion",
					arguments: JSON.stringify({
						result: `The codebase search returned a snippet from ${SEMBLE_E2E_SUM_FILE} with a non-empty code chunk.`,
					}),
					id: "call_codebase_search_semble_complete_001",
				},
			],
		},
	})

	mock.addFixture({
		match: {
			predicate: (req) => {
				// Only consider requests that carry a tool result for our call id.
				if (!toolResultContains(req, SEMBLE_CODEBASE_SEARCH_TOOL_CALL_ID, [])) {
					return false
				}
				// Never shadow the success fixture above.
				return !toolResultContains(req, SEMBLE_CODEBASE_SEARCH_TOOL_CALL_ID, successMarkers)
			},
		},
		response: {
			toolCalls: [
				{
					name: "attempt_completion",
					arguments: JSON.stringify({
						result: "The codebase search did not return the expected snippets.",
					}),
					id: "call_codebase_search_semble_fallback_001",
				},
			],
		},
	})
}
