// npx vitest run src/services/mcp/__tests__/stderrClassification.spec.ts

import { isBenignMcpStderr } from "../stderrClassification"

describe("isBenignMcpStderr", () => {
	it("treats explicit INFO output as benign", () => {
		expect(isBenignMcpStderr("INFO connecting to upstream")).toBe(true)
	})

	it("treats common startup banners as benign", () => {
		expect(isBenignMcpStderr("Tavily MCP server running on stdio")).toBe(true)
		expect(isBenignMcpStderr("Server started")).toBe(true)
		expect(isBenignMcpStderr("listening on port 3000")).toBe(true)
	})

	it("treats only-whitespace output as benign", () => {
		expect(isBenignMcpStderr("   \n")).toBe(true)
	})

	it("keeps genuine errors as errors (not benign)", () => {
		expect(isBenignMcpStderr("Error: invalid API key")).toBe(false)
		expect(isBenignMcpStderr("connect ECONNREFUSED 127.0.0.1:1234")).toBe(false)
		expect(isBenignMcpStderr("panic: runtime error: index out of range")).toBe(false)
		expect(isBenignMcpStderr("Failed to spawn child process")).toBe(false)
	})

	it("never downgrades output that mentions a failure, even with benign tokens", () => {
		// Regression guard for the error-first ordering: these all contain a
		// benign-looking token (info / listening on / server started) but are real
		// failures and must NOT be classified benign.
		expect(isBenignMcpStderr("Error: insufficient information to authenticate")).toBe(false)
		expect(isBenignMcpStderr("ERROR: could not fetch server info before init")).toBe(false)
		expect(isBenignMcpStderr("Error: retrying while listening on socket 8080")).toBe(false)
		expect(isBenignMcpStderr("fatal: server started but crashed immediately")).toBe(false)
		expect(isBenignMcpStderr("error: INFO flag invalid")).toBe(false)
	})

	it("still treats timestamped INFO lines as benign", () => {
		expect(isBenignMcpStderr("[2024-01-01 12:00:00] INFO starting")).toBe(true)
	})
})
