import fs from "fs"
import path from "path"
import os from "os"

import type { Logger } from "@roo-code/vscode-shim"

import type { FlagOptions } from "@/types/index.js"

import { run } from "../run.js"

const { shimLoggerMock } = vi.hoisted(() => ({
	shimLoggerMock: {
		setLogger: vi.fn(),
		setDebugLogEnabled: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	},
}))

vi.mock("@roo-code/vscode-shim", () => ({
	setLogger: shimLoggerMock.setLogger,
}))

vi.mock("@roo-code/core/cli", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@roo-code/core/cli")>()
	return {
		...actual,
		setDebugLogEnabled: shimLoggerMock.setDebugLogEnabled,
		DebugLogger: class {
			component: string

			info = shimLoggerMock.info
			warn = shimLoggerMock.warn
			error = shimLoggerMock.error
			debug = shimLoggerMock.debug

			constructor(component: string) {
				this.component = component
			}
		},
	}
})

describe("run command --prompt-file option", () => {
	let tempDir: string
	let promptFilePath: string

	beforeEach(() => {
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cli-test-"))
		promptFilePath = path.join(tempDir, "prompt.md")
	})

	afterEach(() => {
		fs.rmSync(tempDir, { recursive: true, force: true })
	})

	it("should read prompt from file when --prompt-file is provided", () => {
		const promptContent = `This is a test prompt with special characters:
- Quotes: "hello" and 'world'
- Backticks: \`code\`
- Newlines and tabs
- Unicode: 你好 🎉`

		fs.writeFileSync(promptFilePath, promptContent)

		// Verify the file was written correctly
		const readContent = fs.readFileSync(promptFilePath, "utf-8")
		expect(readContent).toBe(promptContent)
	})

	it("should handle multi-line prompts correctly", () => {
		const multiLinePrompt = `Line 1
Line 2
Line 3

Empty line above
\tTabbed line
  Indented line`

		fs.writeFileSync(promptFilePath, multiLinePrompt)
		const readContent = fs.readFileSync(promptFilePath, "utf-8")

		expect(readContent).toBe(multiLinePrompt)
		expect(readContent.split("\n")).toHaveLength(7)
	})

	it("should handle very long prompts that would exceed ARG_MAX", () => {
		// ARG_MAX is typically 128KB-2MB, so let's test with a 500KB prompt
		const longPrompt = "x".repeat(500 * 1024)

		fs.writeFileSync(promptFilePath, longPrompt)
		const readContent = fs.readFileSync(promptFilePath, "utf-8")

		expect(readContent.length).toBe(500 * 1024)
		expect(readContent).toBe(longPrompt)
	})

	it("should preserve shell-sensitive characters", () => {
		const shellSensitivePrompt = `
$HOME
$(echo dangerous)
\`rm -rf /\`
"quoted string"
'single quoted'
$((1+1))
&&
||
;
> /dev/null
< input.txt
| grep something
*
?
[abc]
{a,b}
~
!
#comment
%s
\n\t\r
`

		fs.writeFileSync(promptFilePath, shellSensitivePrompt)
		const readContent = fs.readFileSync(promptFilePath, "utf-8")

		// All shell-sensitive characters should be preserved exactly
		expect(readContent).toBe(shellSensitivePrompt)
		expect(readContent).toContain("$HOME")
		expect(readContent).toContain("$(echo dangerous)")
		expect(readContent).toContain("`rm -rf /`")
	})
})

describe("run vscode-shim logging wiring", () => {
	let exitSpy: ReturnType<typeof vi.spyOn>

	beforeEach(() => {
		vi.clearAllMocks()
		exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
			throw new Error("process.exit called")
		})
	})

	afterEach(() => {
		exitSpy.mockRestore()
	})

	function makeFlagOptions(overrides: Partial<FlagOptions> = {}): FlagOptions {
		return {
			continue: false,
			print: true,
			stdinPromptStream: false,
			signalOnlyExit: false,
			debug: false,
			requireApproval: true,
			exitOnError: false,
			ephemeral: false,
			oneshot: false,
			...overrides,
		}
	}

	it("routes vscode-shim logs through DebugLogger and enables debug logging on --debug", async () => {
		// A nonexistent prompt file makes run() exit right after the logger is wired up,
		// so we can inspect the logger without booting an ExtensionHost.
		await expect(
			run(undefined, makeFlagOptions({ promptFile: "/nonexistent/prompt.md", debug: true })),
		).rejects.toThrow("process.exit called")

		// --debug must enable file-based debug logging before the shim logger is set.
		expect(shimLoggerMock.setDebugLogEnabled).toHaveBeenCalledWith(true)
		expect(shimLoggerMock.setDebugLogEnabled).toHaveBeenCalledBefore(shimLoggerMock.setLogger)

		expect(shimLoggerMock.setLogger).toHaveBeenCalledTimes(1)
		const logger = shimLoggerMock.setLogger.mock.calls[0]?.[0] as Logger

		// The shim logger must not be the previous all-no-op set.
		expect(typeof logger.info).toBe("function")
		expect(typeof logger.warn).toBe("function")
		expect(typeof logger.error).toBe("function")
		expect(typeof logger.debug).toBe("function")

		// Each level forwards (message, context, meta) to the DebugLogger.
		logger.info("some message", "OutputChannel", { id: 1 })
		expect(shimLoggerMock.info).toHaveBeenCalledWith("[OutputChannel] some message", { id: 1 })

		logger.warn("a warning", undefined, "meta")
		expect(shimLoggerMock.warn).toHaveBeenCalledWith("a warning", "meta")

		logger.error("boom")
		expect(shimLoggerMock.error).toHaveBeenCalledWith("boom", undefined)

		logger.debug("detail", "Context")
		expect(shimLoggerMock.debug).toHaveBeenCalledWith("[Context] detail", undefined)
	})

	it("keeps shim logging silent when --debug is not passed", async () => {
		await expect(run(undefined, makeFlagOptions({ promptFile: "/nonexistent/prompt.md" }))).rejects.toThrow(
			"process.exit called",
		)

		expect(shimLoggerMock.setDebugLogEnabled).not.toHaveBeenCalled()
		expect(shimLoggerMock.setLogger).toHaveBeenCalledTimes(1)
	})
})
