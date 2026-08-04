import { describe, it, expect, vi, beforeEach } from "vitest"
import { EventEmitter } from "events"
import { SembleCLI, isVersionAtLeast, supportsMaxSnippetLinesFlag } from "../semble-cli"

// Mock spawn
const mockSpawn = vi.fn()

vi.mock("child_process", () => ({
	spawn: (...args: any[]) => mockSpawn(...args),
}))

/**
 * Helper to create a fake child process that emits stdout/stderr and closes.
 */
function createMockProcess(stdout: string, stderr: string, exitCode: number) {
	const proc = new EventEmitter() as any
	proc.stdout = new EventEmitter()
	proc.stderr = new EventEmitter()

	// Schedule data emission and close on next tick
	setImmediate(() => {
		if (stdout) proc.stdout.emit("data", Buffer.from(stdout))
		if (stderr) proc.stderr.emit("data", Buffer.from(stderr))
		proc.emit("close", exitCode)
	})

	return proc
}

/**
 * Helper to create a mock process that emits an error.
 */
function createErrorProcess(errorMessage: string) {
	const proc = new EventEmitter() as any
	proc.stdout = new EventEmitter()
	proc.stderr = new EventEmitter()

	setImmediate(() => {
		proc.emit("error", new Error(errorMessage))
	})

	return proc
}

/**
 * Creates a mock child process that stays alive until the test drives it, so
 * the abort() path can be exercised while a spawn is still in-flight. Built
 * via Object.assign so the fake stays fully typed (no `any` casts).
 */
function createPendingProcess() {
	const proc = Object.assign(new EventEmitter(), {
		stdout: new EventEmitter(),
		stderr: new EventEmitter(),
		kill: vi.fn(() => true),
	})
	return proc
}

describe("SembleCLI", () => {
	let cli: SembleCLI

	beforeEach(() => {
		vi.clearAllMocks()
		cli = new SembleCLI("semble")
	})

	describe("constructor", () => {
		it("should accept a path to the semble executable", () => {
			const customCli = new SembleCLI("/usr/local/bin/semble")
			expect(customCli).toBeDefined()
		})
	})

	describe("checkInstalled", () => {
		it("should return installed: true when --help succeeds and mentions search", async () => {
			// Reference v0.4.1 help output advertises the `search` subcommand.
			mockSpawn.mockReturnValueOnce(
				createMockProcess("usage: semble [-h] {search,clear,find-related,...}", "", 0),
			)

			const result = await cli.checkInstalled()

			expect(result).toEqual({ installed: true })
			expect(mockSpawn).toHaveBeenCalledWith("semble", ["--help"], expect.objectContaining({ shell: false }))
		})

		it("should return installed: true when --help exits 0 and output mentions search (case-insensitive)", async () => {
			mockSpawn.mockReturnValueOnce(
				createMockProcess("USAGE: semble [-h] {SEARCH,CLEAR,FIND-RELATED,...}", "", 0),
			)

			const result = await cli.checkInstalled()

			expect(result).toEqual({ installed: true })
		})

		it("should return installed: false when --help exits 0 with no usable output", async () => {
			// A corrupted PyInstaller build (e.g. v0.5.2) exits 0 silently with no output.
			mockSpawn.mockReturnValueOnce(createMockProcess("", "", 0))

			const result = await cli.checkInstalled()

			expect(result.installed).toBe(false)
			expect(result.error).toContain("Semble binary is not functional")
			expect(result.error).toContain("--help")
		})

		it("should return installed: false when --help exits 0 but does not advertise search", async () => {
			mockSpawn.mockReturnValueOnce(createMockProcess("usage: semble [-h] {clear,find-related,...}", "", 0))

			const result = await cli.checkInstalled()

			expect(result.installed).toBe(false)
			expect(result.error).toContain("Semble binary is not functional")
		})

		it("should return installed: false when semble --help fails", async () => {
			mockSpawn.mockReturnValueOnce(createMockProcess("", "semble: command not found", 127))

			const result = await cli.checkInstalled()

			expect(result.installed).toBe(false)
			expect(result.error).toContain("semble: command not found")
		})

		it("should return installed: false on spawn error", async () => {
			mockSpawn.mockReturnValueOnce(createErrorProcess("spawn ENOENT"))

			const result = await cli.checkInstalled()

			expect(result.installed).toBe(false)
			expect(result.error).toContain("spawn ENOENT")
		})
	})

	describe("search", () => {
		it("should spawn with array args (no shell)", async () => {
			const jsonResponse = JSON.stringify({ query: "auth", results: [] })
			mockSpawn.mockReturnValue(createMockProcess(jsonResponse, "", 0))

			await cli.search("authentication", "/path/to/repo")

			expect(mockSpawn).toHaveBeenCalledWith(
				"semble",
				["search", "authentication", "/path/to/repo", "-k", "10"],
				expect.objectContaining({ shell: false }),
			)
		})

		it("should pass special characters safely in query (no shell interpretation)", async () => {
			const jsonResponse = JSON.stringify({ query: "test", results: [] })
			mockSpawn.mockReturnValue(createMockProcess(jsonResponse, "", 0))

			await cli.search('test $(rm -rf /) `whoami` "injection"', "/repo")

			// With spawn (no shell), these are just string args — not interpreted
			expect(mockSpawn).toHaveBeenCalledWith(
				"semble",
				["search", 'test $(rm -rf /) `whoami` "injection"', "/repo", "-k", "10"],
				expect.objectContaining({ shell: false }),
			)
		})

		it("should build correct args with custom topK", async () => {
			mockSpawn.mockReturnValue(createMockProcess(JSON.stringify({ query: "test", results: [] }), "", 0))

			await cli.search("test", "/repo", { topK: 5 })

			expect(mockSpawn).toHaveBeenCalledWith("semble", ["search", "test", "/repo", "-k", "5"], expect.any(Object))
		})

		it("should add --content flag for non-default content types", async () => {
			mockSpawn.mockReturnValue(createMockProcess(JSON.stringify({ query: "test", results: [] }), "", 0))

			await cli.search("test", "/repo", { content: "all" })

			expect(mockSpawn).toHaveBeenCalledWith(
				"semble",
				["search", "test", "/repo", "-k", "10", "--content", "all"],
				expect.any(Object),
			)
		})

		it("should not add --content flag for code (default)", async () => {
			mockSpawn.mockReturnValue(createMockProcess(JSON.stringify({ query: "test", results: [] }), "", 0))

			await cli.search("test", "/repo", { content: "code" })

			expect(mockSpawn).toHaveBeenCalledWith(
				"semble",
				["search", "test", "/repo", "-k", "10"],
				expect.any(Object),
			)
		})

		it("should add --max-snippet-lines flag when configured", async () => {
			mockSpawn.mockReturnValue(createMockProcess(JSON.stringify({ query: "test", results: [] }), "", 0))

			await cli.search("test", "/repo", { maxSnippetLines: 150 })

			expect(mockSpawn).toHaveBeenCalledWith(
				"semble",
				["search", "test", "/repo", "-k", "10", "--max-snippet-lines", "150"],
				expect.any(Object),
			)
		})

		it("should omit --max-snippet-lines flag when not configured", async () => {
			mockSpawn.mockReturnValue(createMockProcess(JSON.stringify({ query: "test", results: [] }), "", 0))

			await cli.search("test", "/repo")

			expect(mockSpawn).toHaveBeenCalledWith(
				"semble",
				["search", "test", "/repo", "-k", "10"],
				expect.any(Object),
			)
		})

		it("should throw error when semble search fails", async () => {
			mockSpawn.mockReturnValue(createMockProcess("", "Error: something went wrong", 1))

			await expect(cli.search("test", "/repo")).rejects.toThrow("Semble search failed")
		})
	})

	describe("_parseOutput (via search)", () => {
		it("should parse v0.4.0+ flat JSON format (no chunk wrapper)", async () => {
			const jsonResponse = {
				query: "authentication",
				results: [
					{
						content: "function authenticate() {}",
						file_path: "src/auth.ts",
						start_line: 10,
						end_line: 25,
						score: 0.92,
					},
					{
						content: "export function login() {}",
						file_path: "src/login.ts",
						start_line: 5,
						end_line: 15,
						score: 0.78,
					},
				],
			}

			mockSpawn.mockReturnValue(createMockProcess(JSON.stringify(jsonResponse), "", 0))

			const results = await cli.search("authentication", "/repo")

			expect(results).toHaveLength(2)
			expect(results[0].file_path).toBe("src/auth.ts")
			expect(results[0].start_line).toBe(10)
			expect(results[0].end_line).toBe(25)
			expect(results[0].content).toBe("function authenticate() {}")
			expect(results[0].score).toBe(0.92)
			expect(results[1].file_path).toBe("src/login.ts")
			expect(results[1].score).toBe(0.78)
		})

		it("should handle empty results response", async () => {
			mockSpawn.mockReturnValue(createMockProcess(JSON.stringify({ query: "nonexistent", results: [] }), "", 0))

			const results = await cli.search("nonexistent", "/repo")

			expect(results).toEqual([])
		})

		it("should handle error response from semble", async () => {
			mockSpawn.mockReturnValue(createMockProcess(JSON.stringify({ error: "No results found." }), "", 0))

			const results = await cli.search("nonexistent", "/repo")

			expect(results).toEqual([])
		})

		it("should handle empty stdout", async () => {
			mockSpawn.mockReturnValue(createMockProcess("", "", 0))

			const results = await cli.search("test", "/repo")

			expect(results).toEqual([])
		})

		it("should handle whitespace-only stdout", async () => {
			mockSpawn.mockReturnValue(createMockProcess("   \n  \n  ", "", 0))

			const results = await cli.search("test", "/repo")

			expect(results).toEqual([])
		})

		it("should handle non-JSON output gracefully", async () => {
			mockSpawn.mockReturnValue(createMockProcess("Some plain text output that is not JSON", "", 0))

			const results = await cli.search("test", "/repo")

			expect(results).toEqual([])
		})

		it("should handle flat array format (bare array of result entries)", async () => {
			const flatArray = [
				{
					content: "flat array result",
					file_path: "src/old.ts",
					start_line: 1,
					end_line: 5,
					score: 0.7,
				},
			]
			mockSpawn.mockReturnValue(createMockProcess(JSON.stringify(flatArray), "", 0))

			const results = await cli.search("test", "/repo")

			expect(results).toHaveLength(1)
			expect(results[0].file_path).toBe("src/old.ts")
			expect(results[0].score).toBe(0.7)
		})

		it("should return empty array for unexpected JSON structure", async () => {
			mockSpawn.mockReturnValue(createMockProcess(JSON.stringify({ unexpected: "format" }), "", 0))

			const results = await cli.search("test", "/repo")

			expect(results).toEqual([])
		})
	})

	describe("search error handling", () => {
		it("should include stderr in error message when available", async () => {
			mockSpawn.mockReturnValue(createMockProcess("", "Permission denied: /repo", 1))

			await expect(cli.search("test", "/repo")).rejects.toThrow("Permission denied: /repo")
		})

		it("should fall back to process exit message when stderr is empty", async () => {
			mockSpawn.mockReturnValue(createMockProcess("", "", 1))

			await expect(cli.search("test", "/repo")).rejects.toThrow("Semble search failed")
		})

		it("should handle spawn error during search", async () => {
			mockSpawn.mockReturnValue(createErrorProcess("EACCES: permission denied"))

			await expect(cli.search("test", "/repo")).rejects.toThrow("EACCES: permission denied")
		})
	})

	describe("abort", () => {
		it("should kill the active child and reject the pending promise on abort", async () => {
			const proc = createPendingProcess()
			mockSpawn.mockReturnValue(proc)

			const pending = cli.search("test", "/repo")
			cli.abort()

			// The pending search rejects cleanly (wrapped by search's error handling).
			await expect(pending).rejects.toThrow("Semble process aborted")
			expect(proc.kill).toHaveBeenCalled()
		})

		it("should be a safe no-op when no child is active", () => {
			expect(() => cli.abort()).not.toThrow()
		})

		it("should not double-settle when the killed process later emits close/error", async () => {
			const proc = createPendingProcess()
			mockSpawn.mockReturnValue(proc)

			const pending = cli.search("test", "/repo")
			cli.abort()

			// Emulate Node emitting close/error after a manual kill — the killed
			// guard must swallow these so the promise settles exactly once.
			proc.emit("close", null)
			proc.emit("error", new Error("killed"))

			await expect(pending).rejects.toThrow("Semble process aborted")
			expect(proc.kill).toHaveBeenCalledTimes(1)
		})

		it("should abort a previously-tracked child when a new spawn starts", async () => {
			const proc1 = createPendingProcess()
			const proc2 = createPendingProcess()
			mockSpawn.mockReturnValueOnce(proc1).mockReturnValueOnce(proc2)

			const first = cli.search("test", "/repo")
			const second = cli.search("test2", "/repo")

			// Starting a second spawn aborts the first so it can't orphan.
			expect(proc1.kill).toHaveBeenCalled()

			cli.abort()

			await expect(first).rejects.toThrow("Semble process aborted")
			await expect(second).rejects.toThrow("Semble process aborted")
			expect(proc2.kill).toHaveBeenCalled()
		})
	})
})

describe("isVersionAtLeast", () => {
	it("compares dotted-numeric versions", () => {
		expect(isVersionAtLeast("v0.4.1", "v0.4.1")).toBe(true)
		expect(isVersionAtLeast("v0.4.2", "v0.4.1")).toBe(true)
		expect(isVersionAtLeast("v0.5.2", "v0.4.1")).toBe(true)
		expect(isVersionAtLeast("v0.10.0", "v0.4.1")).toBe(true)
		expect(isVersionAtLeast("v0.4.0", "v0.4.1")).toBe(false)
		expect(isVersionAtLeast("v0.3.9", "v0.4.1")).toBe(false)
		expect(isVersionAtLeast("v0.4.1", "v0.4.0")).toBe(true)
	})

	it("handles bare and v-prefixed versions interchangeably", () => {
		expect(isVersionAtLeast("0.5.2", "v0.4.1")).toBe(true)
		expect(isVersionAtLeast("v0.4.1", "0.4.1")).toBe(true)
		expect(isVersionAtLeast("0.3.1", "v0.4.1")).toBe(false)
	})

	it("returns false (conservative) for empty or unparseable input", () => {
		expect(isVersionAtLeast(undefined, "v0.4.1")).toBe(false)
		expect(isVersionAtLeast("", "v0.4.1")).toBe(false)
		expect(isVersionAtLeast("latest", "v0.4.1")).toBe(false)
		expect(isVersionAtLeast("v0.4.1-beta", "v0.4.1")).toBe(false)
		expect(isVersionAtLeast("not-a-version", "v0.4.1")).toBe(false)
	})
})

describe("supportsMaxSnippetLinesFlag", () => {
	it("returns true for v0.4.1 and newer", () => {
		expect(supportsMaxSnippetLinesFlag("v0.4.1")).toBe(true)
		expect(supportsMaxSnippetLinesFlag("v0.4.2")).toBe(true)
		expect(supportsMaxSnippetLinesFlag("v0.5.2")).toBe(true)
		expect(supportsMaxSnippetLinesFlag("v0.10.0")).toBe(true)
		expect(supportsMaxSnippetLinesFlag("0.4.1")).toBe(true)
	})

	it("returns false for versions older than v0.4.1", () => {
		expect(supportsMaxSnippetLinesFlag("v0.3.1")).toBe(false)
		expect(supportsMaxSnippetLinesFlag("v0.4.0")).toBe(false)
		expect(supportsMaxSnippetLinesFlag("v0.3.10")).toBe(false)
	})

	it("returns false (conservative) for empty or unknown versions", () => {
		expect(supportsMaxSnippetLinesFlag(undefined)).toBe(false)
		expect(supportsMaxSnippetLinesFlag("")).toBe(false)
		expect(supportsMaxSnippetLinesFlag("latest")).toBe(false)
		expect(supportsMaxSnippetLinesFlag("unknown")).toBe(false)
	})
})
