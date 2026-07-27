import { describe, it, expect, vi, beforeEach } from "vitest"
import * as fs from "fs/promises"
import * as path from "path"
import { EventEmitter } from "events"

// Mock crypto — verifyChecksum reads the archive file (mocked via createReadStream)
// and computes a SHA-256. We make digest() dynamically return the expected checksum
// for the current process.platform/arch so verification always passes in unit tests.
const CHECKSUMS: Record<string, string> = {
	"linux-x64": "1315d3faae9fd446764ee5d0cf8e8d83e862ead0f7fa51e1ed0685755dc96a8e",
	"linux-arm64": "883b250faf61957d9859fc691bbe8387aaca4fe2f00e8a6f041cc44880301ac4",
	"darwin-arm64": "d690765b500103c13aeab8c5a31e78efaeaa4e3e0b20ee5d040ddd41fa21b084",
	"win32-x64": "2aac0a9c55f823ea30151fea188bcf9268318b8ef41aafa7162498a04710fcc0",
}
vi.mock("crypto", () => ({
	createHash: vi.fn(() => ({
		update: vi.fn().mockReturnThis(),
		digest: vi.fn(() => CHECKSUMS[`${process.platform}-${process.arch}`] ?? "no-match"),
	})),
}))

// Mock fs/promises
vi.mock("fs/promises", () => ({
	mkdir: vi.fn().mockResolvedValue(undefined),
	access: vi.fn(),
	chmod: vi.fn().mockResolvedValue(undefined),
	unlink: vi.fn().mockResolvedValue(undefined),
	rm: vi.fn().mockResolvedValue(undefined),
	readFile: vi.fn(),
	writeFile: vi.fn().mockResolvedValue(undefined),
	rename: vi.fn().mockResolvedValue(undefined),
	readdir: vi.fn().mockResolvedValue([]),
}))

// Mock fs (createWriteStream and createReadStream for checksum verification)
const mockWriteStream = {
	on: vi.fn(),
	close: vi.fn(),
}
vi.mock("fs", () => ({
	createWriteStream: vi.fn(() => mockWriteStream),
	createReadStream: vi.fn(() => {
		const { EventEmitter } = require("events")
		const stream = new EventEmitter()
		setImmediate(() => {
			stream.emit("data", Buffer.from("fake-archive-content"))
			stream.emit("end")
		})
		return stream
	}),
}))

// Mock https — fresh emitters per invocation to avoid listener leaks across tests
let mockRequest: any
let mockResponse: any

vi.mock("https", () => ({
	get: vi.fn((_url: string, callback: (res: any) => void) => {
		mockRequest = Object.assign(new EventEmitter(), { setTimeout: vi.fn() })
		mockResponse = Object.assign(new EventEmitter(), {
			statusCode: 200,
			headers: {},
			pipe: vi.fn(),
			destroy: vi.fn(),
		})
		setImmediate(() => callback(mockResponse))
		return mockRequest
	}),
}))

// Mock child_process spawn for tar/unzip extraction and execFile for disk space checks
const mockExtractProcess = new EventEmitter() as any
mockExtractProcess.stderr = new EventEmitter()

/**
 * Default mock execFile implementation that returns sufficient disk space.
 * Tests can override this by setting mockExecFileCallback.
 * Uses callback-based signature: execFile(cmd, args, options, callback)
 */
let mockExecFileCallback: (cmd: string, args: string[], options: any, cb: (err: any, result: any) => void) => void = (
	_cmd: string,
	_args: string[],
	_options: any,
	cb: (err: any, result: any) => void,
) => {
	cb(null, { stdout: "Avail\n5000000\n" })
}

vi.mock("child_process", () => ({
	spawn: vi.fn(() => {
		// Simulate successful extraction
		setImmediate(() => mockExtractProcess.emit("close", 0))
		return mockExtractProcess
	}),
	execFile: vi.fn((cmd: string, args: string[], options: any, cb: (err: any, result: any) => void) => {
		mockExecFileCallback(cmd, args, options, cb)
	}),
}))

import {
	isSembleSupportedPlatform,
	getSembleSupportedPlatforms,
	downloadSemble,
	getSembleBinaryPath,
	SEMBLE_SHA256,
	SEMBLE_VERSION,
	SEMBLE_VERSION_PATTERN,
	resolveSembleVersion,
	downloadChecksums,
	checkDiskSpace,
	validateInstallPath,
} from "../semble-downloader"
import * as https from "https"
import { spawn } from "child_process"

// Guards against drift: the local CHECKSUMS table that drives the crypto mock
// must stay in lock-step with the production SEMBLE_SHA256 constant. A future
// version bump that updates SEMBLE_SHA256 but misses this copy would otherwise
// silently mock the wrong hash and let checksum verification pass spuriously.
describe("SEMBLE_SHA256 checksum fixture", () => {
	it("the local CHECKSUMS table matches the exported SEMBLE_SHA256 constant", () => {
		expect(CHECKSUMS).toEqual(SEMBLE_SHA256)
	})
})

describe("semble-downloader", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockWriteStream.on = vi.fn()
		mockWriteStream.close = vi.fn()
		// Reset execFile mock to return sufficient disk space by default
		mockExecFileCallback = (_cmd: string, _args: string[], _options: any, cb: (err: any, result: any) => void) => {
			cb(null, { stdout: "Avail\n5000000\n" })
		}

		// Restore the default https.get mock so tests that override it don't leak
		;(https.get as any).mockImplementation((_url: string, callback: (res: any) => void) => {
			mockRequest = Object.assign(new EventEmitter(), { setTimeout: vi.fn() })
			mockResponse = Object.assign(new EventEmitter(), {
				statusCode: 200,
				headers: {},
				pipe: vi.fn(),
				destroy: vi.fn(),
			})
			setImmediate(() => callback(mockResponse))
			return mockRequest
		})
	})

	describe("isSembleSupportedPlatform", () => {
		it("should return true for linux-x64", () => {
			expect(isSembleSupportedPlatform("linux", "x64")).toBe(true)
		})

		it("should return true for linux-arm64", () => {
			expect(isSembleSupportedPlatform("linux", "arm64")).toBe(true)
		})

		it("should return true for darwin-arm64", () => {
			expect(isSembleSupportedPlatform("darwin", "arm64")).toBe(true)
		})

		it("should return true for win32-x64", () => {
			expect(isSembleSupportedPlatform("win32", "x64")).toBe(true)
		})

		it("should return false for darwin-x64 (Intel Mac not supported)", () => {
			expect(isSembleSupportedPlatform("darwin", "x64")).toBe(false)
		})

		it("should return false for win32-arm64", () => {
			expect(isSembleSupportedPlatform("win32", "arm64")).toBe(false)
		})

		it("should return false for freebsd-x64", () => {
			expect(isSembleSupportedPlatform("freebsd", "x64")).toBe(false)
		})

		it("should use process.platform and process.arch when no args provided", () => {
			const result = isSembleSupportedPlatform()
			expect(typeof result).toBe("boolean")
		})
	})

	describe("getSembleSupportedPlatforms", () => {
		it("should return all supported platform-arch combinations", () => {
			const platforms = getSembleSupportedPlatforms()

			expect(platforms).toContain("linux-x64")
			expect(platforms).toContain("linux-arm64")
			expect(platforms).toContain("darwin-arm64")
			expect(platforms).toContain("win32-x64")
			expect(platforms).toHaveLength(4)
		})
	})

	describe("downloadSemble", () => {
		it("should return undefined on unsupported platform", async () => {
			const originalPlatform = Object.getOwnPropertyDescriptor(process, "platform")
			const originalArch = Object.getOwnPropertyDescriptor(process, "arch")

			Object.defineProperty(process, "platform", { value: "freebsd", configurable: true })
			Object.defineProperty(process, "arch", { value: "x64", configurable: true })

			try {
				const result = await downloadSemble("/some/dir")
				expect(result).toBeUndefined()
			} finally {
				if (originalPlatform) Object.defineProperty(process, "platform", originalPlatform)
				if (originalArch) Object.defineProperty(process, "arch", originalArch)
			}
		})

		it("should return existing binary path if already extracted", async () => {
			const originalPlatform = Object.getOwnPropertyDescriptor(process, "platform")
			const originalArch = Object.getOwnPropertyDescriptor(process, "arch")

			Object.defineProperty(process, "platform", { value: "darwin", configurable: true })
			Object.defineProperty(process, "arch", { value: "arm64", configurable: true })

			// fs.access resolves => file exists
			;(fs.access as any).mockResolvedValue(undefined)
			// Version file matches current version
			;(fs.readFile as any).mockResolvedValue("v0.5.2")

			try {
				const result = await downloadSemble("/storage")

				expect(result).toBe(path.join("/storage", "semble", "semble"))
				expect(fs.mkdir).toHaveBeenCalledWith("/storage", { recursive: true })
				expect(fs.chmod).toHaveBeenCalledWith(path.join("/storage", "semble", "semble"), 0o755)
				// Should NOT attempt to download
				expect(https.get).not.toHaveBeenCalled()
			} finally {
				if (originalPlatform) Object.defineProperty(process, "platform", originalPlatform)
				if (originalArch) Object.defineProperty(process, "arch", originalArch)
			}
		})

		it("should download and extract archive when not present", async () => {
			const originalPlatform = Object.getOwnPropertyDescriptor(process, "platform")
			const originalArch = Object.getOwnPropertyDescriptor(process, "arch")

			Object.defineProperty(process, "platform", { value: "linux", configurable: true })
			Object.defineProperty(process, "arch", { value: "x64", configurable: true })

			// fs.access resolves — only called for staged binary verification
			// (version is undefined so the binaryPath check is skipped)
			;(fs.access as any).mockResolvedValue(undefined)
			// No version file exists
			;(fs.readFile as any).mockRejectedValue(new Error("ENOENT"))

			// Simulate successful download: pipe is called, then "finish" fires
			mockWriteStream.on.mockImplementation((event: string, cb: () => void) => {
				if (event === "finish") {
					setImmediate(cb)
				}
			})

			try {
				const result = await downloadSemble("/storage")

				expect(result).toBe(path.join("/storage", "semble", "semble"))
				// The release URL must target the current SEMBLE_VERSION tag — a typo
				// in SEMBLE_VERSION would otherwise fetch the wrong release while still
				// matching the unversioned asset filename.
				expect(https.get).toHaveBeenCalledWith(expect.stringContaining("v0.5.2"), expect.any(Function))
				expect(https.get).toHaveBeenCalledWith(
					expect.stringContaining("semble-linux-x64-fast.tar.gz"),
					expect.any(Function),
				)
				// Should call tar for extraction into staging directory
				expect(spawn).toHaveBeenCalledWith(
					"tar",
					[
						"-xzf",
						path.join("/storage", "v0.5.2-semble-linux-x64-fast.tar.gz"),
						"-C",
						path.join("/storage", "semble.new"),
						"--no-same-owner",
						"--no-overwrite-dir",
					],
					expect.any(Object),
				)
				expect(fs.chmod).toHaveBeenCalledWith(path.join("/storage", "semble.new", "semble"), 0o755)
				// Should rename staging to final
				expect(fs.rename).toHaveBeenCalledWith(
					path.join("/storage", "semble.new"),
					path.join("/storage", "semble"),
				)
				// Version file should be written
				expect(fs.writeFile).toHaveBeenCalledWith(
					path.join("/storage", "semble", ".semble-version"),
					"v0.5.2",
					"utf-8",
				)
				// Archive should be cleaned up (version-prefixed local cache path)
				expect(fs.unlink).toHaveBeenCalledWith(path.join("/storage", "v0.5.2-semble-linux-x64-fast.tar.gz"))
			} finally {
				if (originalPlatform) Object.defineProperty(process, "platform", originalPlatform)
				if (originalArch) Object.defineProperty(process, "arch", originalArch)
			}
		})

		it("should not chmod on windows", async () => {
			const originalPlatform = Object.getOwnPropertyDescriptor(process, "platform")
			const originalArch = Object.getOwnPropertyDescriptor(process, "arch")

			Object.defineProperty(process, "platform", { value: "win32", configurable: true })
			Object.defineProperty(process, "arch", { value: "x64", configurable: true })

			// fs.access resolves => file exists
			;(fs.access as any).mockResolvedValue(undefined)
			// Version file matches
			;(fs.readFile as any).mockResolvedValue("v0.5.2")

			try {
				const result = await downloadSemble("/storage")

				expect(result).toBe(path.join("/storage", "semble", "semble.exe"))
				expect(fs.chmod).not.toHaveBeenCalled()
			} finally {
				if (originalPlatform) Object.defineProperty(process, "platform", originalPlatform)
				if (originalArch) Object.defineProperty(process, "arch", originalArch)
			}
		})

		it("should throw and clean up on download failure from all sources", async () => {
			const originalPlatform = Object.getOwnPropertyDescriptor(process, "platform")
			const originalArch = Object.getOwnPropertyDescriptor(process, "arch")

			Object.defineProperty(process, "platform", { value: "linux", configurable: true })
			Object.defineProperty(process, "arch", { value: "arm64", configurable: true })

			// fs.access rejects => file not present
			;(fs.access as any).mockRejectedValue(new Error("ENOENT"))
			// No version file
			;(fs.readFile as any).mockRejectedValue(new Error("ENOENT"))

			// Simulate HTTP error response for ALL URLs (both fallback sources)
			;(https.get as any).mockImplementation((_url: string, callback: (res: any) => void) => {
				const res = Object.assign(new EventEmitter(), {
					statusCode: 404,
					headers: {},
					pipe: vi.fn(),
					destroy: vi.fn(),
				})
				setImmediate(() => callback(res))
				const req = Object.assign(new EventEmitter(), { setTimeout: vi.fn() })
				return req
			})

			try {
				await expect(downloadSemble("/storage")).rejects.toThrow("Failed to download semble from all sources")
				// Cleanup happens inside attemptDownload for each source.
				// Both sources attempt cleanup of the same archivePath and stagingDir.
				expect(fs.unlink).toHaveBeenCalledWith(path.join("/storage", "v0.5.2-semble-linux-arm64-fast.tar.gz"))
				expect(fs.rm).toHaveBeenCalledWith(path.join("/storage", "semble.new"), {
					recursive: true,
					force: true,
				})
			} finally {
				if (originalPlatform) Object.defineProperty(process, "platform", originalPlatform)
				if (originalArch) Object.defineProperty(process, "arch", originalArch)
			}
		})

		it("should follow redirects", async () => {
			const originalPlatform = Object.getOwnPropertyDescriptor(process, "platform")
			const originalArch = Object.getOwnPropertyDescriptor(process, "arch")

			Object.defineProperty(process, "platform", { value: "darwin", configurable: true })
			Object.defineProperty(process, "arch", { value: "arm64", configurable: true })

			// fs.access resolves — only called for staged binary verification
			;(fs.access as any).mockResolvedValue(undefined)
			// No version file
			;(fs.readFile as any).mockRejectedValue(new Error("ENOENT"))

			// First call returns a redirect, second call returns 200
			let callCount = 0
			;(https.get as any).mockImplementation((_url: string, callback: (res: any) => void) => {
				callCount++
				const res = new EventEmitter() as any
				if (callCount === 1) {
					res.statusCode = 302
					res.headers = {
						location: "https://objects.githubusercontent.com/semble-macos-arm64-fast.tar.gz",
					}
					res.destroy = vi.fn()
				} else {
					res.statusCode = 200
					res.headers = {}
					res.pipe = vi.fn()
					res.destroy = vi.fn()
				}
				setImmediate(() => callback(res))

				const req = new EventEmitter() as any
				req.setTimeout = vi.fn()
				return req
			})

			// Simulate successful download on the second response
			mockWriteStream.on.mockImplementation((event: string, cb: () => void) => {
				if (event === "finish") {
					setImmediate(cb)
				}
			})

			try {
				const result = await downloadSemble("/storage")

				expect(result).toBe(path.join("/storage", "semble", "semble"))
				expect(https.get).toHaveBeenCalledTimes(2)
			} finally {
				if (originalPlatform) Object.defineProperty(process, "platform", originalPlatform)
				if (originalArch) Object.defineProperty(process, "arch", originalArch)
			}
		})

		it("should block redirects to untrusted domains", async () => {
			const originalPlatform = Object.getOwnPropertyDescriptor(process, "platform")
			const originalArch = Object.getOwnPropertyDescriptor(process, "arch")

			Object.defineProperty(process, "platform", { value: "darwin", configurable: true })
			Object.defineProperty(process, "arch", { value: "arm64", configurable: true })

			// fs.access rejects => file not present
			;(fs.access as any).mockRejectedValue(new Error("ENOENT"))
			// No version file
			;(fs.readFile as any).mockRejectedValue(new Error("ENOENT"))

			// Redirect to an untrusted domain
			;(https.get as any).mockImplementation((_url: string, callback: (res: any) => void) => {
				const res = new EventEmitter() as any
				res.statusCode = 302
				res.headers = { location: "https://evil.example.com/malicious-binary.tar.gz" }
				res.destroy = vi.fn()
				setImmediate(() => callback(res))

				const req = new EventEmitter() as any
				req.setTimeout = vi.fn()
				return req
			})

			try {
				await expect(downloadSemble("/storage")).rejects.toThrow("untrusted domain")
			} finally {
				if (originalPlatform) Object.defineProperty(process, "platform", originalPlatform)
				if (originalArch) Object.defineProperty(process, "arch", originalArch)
			}
		})

		it("should block redirects to domains that suffix-match trusted domains (e.g. evilgithub.com)", async () => {
			const originalPlatform = Object.getOwnPropertyDescriptor(process, "platform")
			const originalArch = Object.getOwnPropertyDescriptor(process, "arch")

			Object.defineProperty(process, "platform", { value: "darwin", configurable: true })
			Object.defineProperty(process, "arch", { value: "arm64", configurable: true })

			// fs.access rejects => file not present
			;(fs.access as any).mockRejectedValue(new Error("ENOENT"))
			// No version file
			;(fs.readFile as any).mockRejectedValue(new Error("ENOENT"))

			// Redirect to a domain that suffix-matches "github.com" without a dot boundary
			;(https.get as any).mockImplementation((_url: string, callback: (res: any) => void) => {
				const res = new EventEmitter() as any
				res.statusCode = 302
				res.headers = { location: "https://evilgithub.com/malicious-binary.tar.gz" }
				res.destroy = vi.fn()
				setImmediate(() => callback(res))

				const req = new EventEmitter() as any
				req.setTimeout = vi.fn()
				return req
			})

			try {
				await expect(downloadSemble("/storage")).rejects.toThrow("untrusted domain")
			} finally {
				if (originalPlatform) Object.defineProperty(process, "platform", originalPlatform)
				if (originalArch) Object.defineProperty(process, "arch", originalArch)
			}
		})

		it("should fall back to mirror source when primary fails with 404", async () => {
			const originalPlatform = Object.getOwnPropertyDescriptor(process, "platform")
			const originalArch = Object.getOwnPropertyDescriptor(process, "arch")

			Object.defineProperty(process, "platform", { value: "linux", configurable: true })
			Object.defineProperty(process, "arch", { value: "x64", configurable: true })

			// fs.access resolves → staged binary verification passes
			;(fs.access as any).mockResolvedValue(undefined)
			// No version file → triggers download
			;(fs.readFile as any).mockRejectedValue(new Error("ENOENT"))

			// Primary source URL returns 404, fallback source returns 200
			;(https.get as any).mockImplementation((url: string, callback: (res: any) => void) => {
				const res = Object.assign(new EventEmitter(), {
					statusCode: url.includes("Audare-est-Facere") ? 404 : 200,
					headers: {},
					pipe: vi.fn(),
					destroy: vi.fn(),
				})
				setImmediate(() => callback(res))
				return Object.assign(new EventEmitter(), { setTimeout: vi.fn() })
			})

			// Simulate successful download on the fallback source
			mockWriteStream.on.mockImplementation((event: string, cb: () => void) => {
				if (event === "finish") {
					setImmediate(cb)
				}
			})

			try {
				const result = await downloadSemble("/storage")

				expect(result).toBe(path.join("/storage", "semble", "semble"))
				// Should have attempted both sources — primary (with retries) + fallback
				expect(https.get).toHaveBeenCalledWith(
					expect.stringContaining("Audare-est-Facere"),
					expect.any(Function),
				)
				expect(https.get).toHaveBeenCalledWith(expect.stringContaining("Roo-Plus-Org"), expect.any(Function))
			} finally {
				if (originalPlatform) Object.defineProperty(process, "platform", originalPlatform)
				if (originalArch) Object.defineProperty(process, "arch", originalArch)
			}
		})

		it("should throw combined error when all sources fail", async () => {
			const originalPlatform = Object.getOwnPropertyDescriptor(process, "platform")
			const originalArch = Object.getOwnPropertyDescriptor(process, "arch")

			Object.defineProperty(process, "platform", { value: "linux", configurable: true })
			Object.defineProperty(process, "arch", { value: "x64", configurable: true })

			// fs.access rejects => file not present
			;(fs.access as any).mockRejectedValue(new Error("ENOENT"))
			// No version file
			;(fs.readFile as any).mockRejectedValue(new Error("ENOENT"))

			// All URLs return 404
			;(https.get as any).mockImplementation((_url: string, callback: (res: any) => void) => {
				const res = Object.assign(new EventEmitter(), {
					statusCode: 404,
					headers: {},
					pipe: vi.fn(),
					destroy: vi.fn(),
				})
				setImmediate(() => callback(res))
				return Object.assign(new EventEmitter(), { setTimeout: vi.fn() })
			})

			try {
				await expect(downloadSemble("/storage")).rejects.toThrow("Failed to download semble from all sources")
			} finally {
				if (originalPlatform) Object.defineProperty(process, "platform", originalPlatform)
				if (originalArch) Object.defineProperty(process, "arch", originalArch)
			}
		})

		it("should retry with exponential backoff and succeed on second attempt", async () => {
			const originalPlatform = Object.getOwnPropertyDescriptor(process, "platform")
			const originalArch = Object.getOwnPropertyDescriptor(process, "arch")

			Object.defineProperty(process, "platform", { value: "linux", configurable: true })
			Object.defineProperty(process, "arch", { value: "x64", configurable: true })

			// fs.access resolves → staged binary verification passes
			;(fs.access as any).mockResolvedValue(undefined)
			// No version file → triggers download
			;(fs.readFile as any).mockRejectedValue(new Error("ENOENT"))

			// First call fails (404), second call (retry) succeeds (200)
			let callCount = 0
			;(https.get as any).mockImplementation((_url: string, callback: (res: any) => void) => {
				callCount++
				const res = Object.assign(new EventEmitter(), {
					statusCode: callCount === 1 ? 404 : 200,
					headers: {},
					pipe: vi.fn(),
					destroy: vi.fn(),
				})
				setImmediate(() => callback(res))
				return Object.assign(new EventEmitter(), { setTimeout: vi.fn() })
			})

			// Simulate successful download on the retry
			mockWriteStream.on.mockImplementation((event: string, cb: () => void) => {
				if (event === "finish") {
					setImmediate(cb)
				}
			})

			try {
				// The 2s retry delay is real — give this test extra time
				const result = await downloadSemble("/storage")

				expect(result).toBe(path.join("/storage", "semble", "semble"))
				// Should have called https.get twice (initial + retry)
				expect(https.get).toHaveBeenCalledTimes(2)
			} finally {
				if (originalPlatform) Object.defineProperty(process, "platform", originalPlatform)
				if (originalArch) Object.defineProperty(process, "arch", originalArch)
			}
		}, 15000)

		it("should respect exponential backoff delay between retries", async () => {
			const originalPlatform = Object.getOwnPropertyDescriptor(process, "platform")
			const originalArch = Object.getOwnPropertyDescriptor(process, "arch")

			Object.defineProperty(process, "platform", { value: "linux", configurable: true })
			Object.defineProperty(process, "arch", { value: "x64", configurable: true })

			// fs.access resolves → staged binary verification passes
			;(fs.access as any).mockResolvedValue(undefined)
			// No version file → triggers download
			;(fs.readFile as any).mockRejectedValue(new Error("ENOENT"))

			// All calls fail so we can observe the retry loop
			;(https.get as any).mockImplementation((_url: string, callback: (res: any) => void) => {
				const res = Object.assign(new EventEmitter(), {
					statusCode: 404,
					headers: {},
					pipe: vi.fn(),
					destroy: vi.fn(),
				})
				setImmediate(() => callback(res))
				return Object.assign(new EventEmitter(), { setTimeout: vi.fn() })
			})

			const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout")

			try {
				// Check that setTimeout was called with the expected delay (2000ms for attempt 1)
				// The all-sources-fail path has real 2s delays per source, so give it extra time
				await expect(downloadSemble("/storage")).rejects.toThrow("Failed to download semble from all sources")
				expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 2000)
			} finally {
				setTimeoutSpy.mockRestore()
				if (originalPlatform) Object.defineProperty(process, "platform", originalPlatform)
				if (originalArch) Object.defineProperty(process, "arch", originalArch)
			}
		}, 15000)
	})

	describe("getSembleBinaryPath", () => {
		it("should return path when binary exists", async () => {
			const originalPlatform = Object.getOwnPropertyDescriptor(process, "platform")
			const originalArch = Object.getOwnPropertyDescriptor(process, "arch")

			Object.defineProperty(process, "platform", { value: "linux", configurable: true })
			Object.defineProperty(process, "arch", { value: "x64", configurable: true })
			;(fs.access as any).mockResolvedValue(undefined)

			try {
				const result = await getSembleBinaryPath("/storage")
				expect(result).toBe(path.join("/storage", "semble", "semble"))
			} finally {
				if (originalPlatform) Object.defineProperty(process, "platform", originalPlatform)
				if (originalArch) Object.defineProperty(process, "arch", originalArch)
			}
		})

		it("should return undefined when binary does not exist", async () => {
			const originalPlatform = Object.getOwnPropertyDescriptor(process, "platform")
			const originalArch = Object.getOwnPropertyDescriptor(process, "arch")

			Object.defineProperty(process, "platform", { value: "linux", configurable: true })
			Object.defineProperty(process, "arch", { value: "x64", configurable: true })
			;(fs.access as any).mockRejectedValue(new Error("ENOENT"))

			try {
				const result = await getSembleBinaryPath("/storage")
				expect(result).toBeUndefined()
			} finally {
				if (originalPlatform) Object.defineProperty(process, "platform", originalPlatform)
				if (originalArch) Object.defineProperty(process, "arch", originalArch)
			}
		})

		it("should return undefined on unsupported platform", async () => {
			const originalPlatform = Object.getOwnPropertyDescriptor(process, "platform")
			const originalArch = Object.getOwnPropertyDescriptor(process, "arch")

			Object.defineProperty(process, "platform", { value: "freebsd", configurable: true })
			Object.defineProperty(process, "arch", { value: "x64", configurable: true })

			try {
				const result = await getSembleBinaryPath("/storage")
				expect(result).toBeUndefined()
			} finally {
				if (originalPlatform) Object.defineProperty(process, "platform", originalPlatform)
				if (originalArch) Object.defineProperty(process, "arch", originalArch)
			}
		})

		it("should use correct binary name for windows", async () => {
			const originalPlatform = Object.getOwnPropertyDescriptor(process, "platform")
			const originalArch = Object.getOwnPropertyDescriptor(process, "arch")

			Object.defineProperty(process, "platform", { value: "win32", configurable: true })
			Object.defineProperty(process, "arch", { value: "x64", configurable: true })
			;(fs.access as any).mockResolvedValue(undefined)

			try {
				const result = await getSembleBinaryPath("/storage")
				expect(result).toBe(path.join("/storage", "semble", "semble.exe"))
			} finally {
				if (originalPlatform) Object.defineProperty(process, "platform", originalPlatform)
				if (originalArch) Object.defineProperty(process, "arch", originalArch)
			}
		})
	})

	describe("downloadSemble - zip extraction on Windows", () => {
		it("should use PowerShell Expand-Archive on Windows", async () => {
			const originalPlatform = Object.getOwnPropertyDescriptor(process, "platform")
			const originalArch = Object.getOwnPropertyDescriptor(process, "arch")

			Object.defineProperty(process, "platform", { value: "win32", configurable: true })
			Object.defineProperty(process, "arch", { value: "x64", configurable: true })

			// fs.access resolves — only called for staged binary verification
			// (version is undefined so the binaryPath check is skipped)
			;(fs.access as any).mockResolvedValue(undefined)
			// No version file
			;(fs.readFile as any).mockRejectedValue(new Error("ENOENT"))

			// Simulate successful download
			mockWriteStream.on.mockImplementation((event: string, cb: () => void) => {
				if (event === "finish") {
					setImmediate(cb)
				}
			})

			try {
				const result = await downloadSemble("/storage")

				expect(result).toBe(path.join("/storage", "semble", "semble.exe"))
				// Should call PowerShell for zip extraction
				expect(spawn).toHaveBeenCalledWith(
					"powershell",
					expect.arrayContaining(["-NoProfile", "-Command", expect.stringContaining("Expand-Archive")]),
					expect.any(Object),
				)
				// Should NOT call chmod on windows
				expect(fs.chmod).not.toHaveBeenCalled()
			} finally {
				if (originalPlatform) Object.defineProperty(process, "platform", originalPlatform)
				if (originalArch) Object.defineProperty(process, "arch", originalArch)
			}
		})
	})

	describe("downloadSemble - error handling edge cases", () => {
		it("should not throw when archive cleanup fails after successful extraction", async () => {
			const originalPlatform = Object.getOwnPropertyDescriptor(process, "platform")
			const originalArch = Object.getOwnPropertyDescriptor(process, "arch")

			Object.defineProperty(process, "platform", { value: "linux", configurable: true })
			Object.defineProperty(process, "arch", { value: "x64", configurable: true })

			// fs.access resolves — only called for staged binary verification
			// (version is undefined so the binaryPath check is skipped)
			;(fs.access as any).mockResolvedValue(undefined)
			// No version file
			;(fs.readFile as any).mockRejectedValue(new Error("ENOENT"))

			// Simulate successful download
			mockWriteStream.on.mockImplementation((event: string, cb: () => void) => {
				if (event === "finish") {
					setImmediate(cb)
				}
			})

			// Archive cleanup fails but should not throw (only archive removal after extraction)
			;(fs.unlink as any).mockRejectedValue(new Error("unlink cleanup failed"))

			try {
				const result = await downloadSemble("/storage")
				// Should still succeed — archive cleanup failure is ignored
				expect(result).toBe(path.join("/storage", "semble", "semble"))
			} finally {
				if (originalPlatform) Object.defineProperty(process, "platform", originalPlatform)
				if (originalArch) Object.defineProperty(process, "arch", originalArch)
			}
		})
	})

	describe("downloadSemble - binary path override", () => {
		it("should return the override path when binaryPathOverride is provided and file exists", async () => {
			const originalPlatform = Object.getOwnPropertyDescriptor(process, "platform")
			const originalArch = Object.getOwnPropertyDescriptor(process, "arch")

			Object.defineProperty(process, "platform", { value: "linux", configurable: true })
			Object.defineProperty(process, "arch", { value: "x64", configurable: true })

			// fs.access resolves => file exists
			;(fs.access as any).mockResolvedValue(undefined)

			try {
				const result = await downloadSemble("/storage", "/custom/path/semble")
				expect(result).toBe("/custom/path/semble")
				// Should NOT attempt to download or extract
				expect(https.get).not.toHaveBeenCalled()
				expect(spawn).not.toHaveBeenCalled()
			} finally {
				if (originalPlatform) Object.defineProperty(process, "platform", originalPlatform)
				if (originalArch) Object.defineProperty(process, "arch", originalArch)
			}
		})

		it("should log a warning when binaryPathOverride does not exist and fall back to download", async () => {
			const originalPlatform = Object.getOwnPropertyDescriptor(process, "platform")
			const originalArch = Object.getOwnPropertyDescriptor(process, "arch")
			const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

			Object.defineProperty(process, "platform", { value: "linux", configurable: true })
			Object.defineProperty(process, "arch", { value: "x64", configurable: true })

			// fs.access rejects first (override path not found), then resolves for staged binary
			let accessCallCount = 0
			;(fs.access as any).mockImplementation(() => {
				accessCallCount++
				// First call: override path check (reject), subsequent: staged binary verify (resolve)
				if (accessCallCount === 1) {
					return Promise.reject(new Error("ENOENT"))
				}
				return Promise.resolve(undefined)
			})
			// No version file
			;(fs.readFile as any).mockRejectedValue(new Error("ENOENT"))

			// Simulate successful download for the fallback path
			mockWriteStream.on.mockImplementation((event: string, cb: () => void) => {
				if (event === "finish") {
					setImmediate(cb)
				}
			})

			try {
				const result = await downloadSemble("/storage", "/nonexistent/path/semble")
				expect(result).toBe(path.join("/storage", "semble", "semble"))
				// Should have logged a warning about the missing override path
				expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("does not exist"))
				// Should have attempted download (falls back)
				expect(https.get).toHaveBeenCalled()
			} finally {
				consoleWarnSpy.mockRestore()
				if (originalPlatform) Object.defineProperty(process, "platform", originalPlatform)
				if (originalArch) Object.defineProperty(process, "arch", originalArch)
			}
		})

		it("should use override path on Windows when binaryPathOverride is provided", async () => {
			const originalPlatform = Object.getOwnPropertyDescriptor(process, "platform")
			const originalArch = Object.getOwnPropertyDescriptor(process, "arch")

			Object.defineProperty(process, "platform", { value: "win32", configurable: true })
			Object.defineProperty(process, "arch", { value: "x64", configurable: true })

			// fs.access resolves => file exists
			;(fs.access as any).mockResolvedValue(undefined)

			try {
				const result = await downloadSemble("/storage", "C:\\tools\\semble.exe")
				expect(result).toBe("C:\\tools\\semble.exe")
				// Should NOT attempt to download or extract
				expect(https.get).not.toHaveBeenCalled()
				expect(spawn).not.toHaveBeenCalled()
			} finally {
				if (originalPlatform) Object.defineProperty(process, "platform", originalPlatform)
				if (originalArch) Object.defineProperty(process, "arch", originalArch)
			}
		})

		it("should ignore empty binaryPathOverride and proceed with normal download", async () => {
			const originalPlatform = Object.getOwnPropertyDescriptor(process, "platform")
			const originalArch = Object.getOwnPropertyDescriptor(process, "arch")

			Object.defineProperty(process, "platform", { value: "linux", configurable: true })
			Object.defineProperty(process, "arch", { value: "x64", configurable: true })

			// Version file matches
			;(fs.readFile as any).mockResolvedValue("v0.5.2")
			// Binary exists
			;(fs.access as any).mockResolvedValue(undefined)

			try {
				const result = await downloadSemble("/storage", "")
				// Should behave normally — empty override is ignored
				expect(result).toBe(path.join("/storage", "semble", "semble"))
				expect(https.get).not.toHaveBeenCalled()
			} finally {
				if (originalPlatform) Object.defineProperty(process, "platform", originalPlatform)
				if (originalArch) Object.defineProperty(process, "arch", originalArch)
			}
		})
	})

	describe("downloadSemble - version tracking", () => {
		it("should re-download when installed version differs from SEMBLE_VERSION", async () => {
			const originalPlatform = Object.getOwnPropertyDescriptor(process, "platform")
			const originalArch = Object.getOwnPropertyDescriptor(process, "arch")

			Object.defineProperty(process, "platform", { value: "linux", configurable: true })
			Object.defineProperty(process, "arch", { value: "x64", configurable: true })

			// Version file has an old version
			;(fs.readFile as any).mockResolvedValue("v0.2.0")
			// fs.access resolves — only called for staged binary verification
			// (version mismatch means binaryPath check is skipped)
			;(fs.access as any).mockResolvedValue(undefined)

			// Simulate successful download
			mockWriteStream.on.mockImplementation((event: string, cb: () => void) => {
				if (event === "finish") {
					setImmediate(cb)
				}
			})

			try {
				const result = await downloadSemble("/storage")

				expect(result).toBe(path.join("/storage", "semble", "semble"))
				// Should remove old installation during atomic swap
				expect(fs.rm).toHaveBeenCalledWith(path.join("/storage", "semble"), {
					recursive: true,
					force: true,
				})
				// Should rename staging dir to final
				expect(fs.rename).toHaveBeenCalledWith(
					path.join("/storage", "semble.new"),
					path.join("/storage", "semble"),
				)
				// Should download the new version
				expect(https.get).toHaveBeenCalledWith(expect.stringContaining("v0.5.2"), expect.any(Function))
				// Should write the new version file
				expect(fs.writeFile).toHaveBeenCalledWith(
					path.join("/storage", "semble", ".semble-version"),
					"v0.5.2",
					"utf-8",
				)
			} finally {
				if (originalPlatform) Object.defineProperty(process, "platform", originalPlatform)
				if (originalArch) Object.defineProperty(process, "arch", originalArch)
			}
		})

		it("should download a fresh package immediately after a version upgrade (version-prefixed archive path)", async () => {
			const originalPlatform = Object.getOwnPropertyDescriptor(process, "platform")
			const originalArch = Object.getOwnPropertyDescriptor(process, "arch")

			Object.defineProperty(process, "platform", { value: "linux", configurable: true })
			Object.defineProperty(process, "arch", { value: "x64", configurable: true })

			// Old version recorded on disk → must trigger a fresh download
			;(fs.readFile as any).mockResolvedValue("v0.4.0")
			// Simulate a prior-version archive (v0.4.0) and a legacy unversioned
			// archive (pre-v0.4.0 cache layout) left over in the storage dir.
			// cleanupStaleArchives must sweep both during the upgrade.
			;(fs.readdir as any).mockResolvedValue([
				"v0.4.0-semble-linux-x64-fast.tar.gz",
				"semble-linux-x64-fast.tar.gz",
				"v0.5.2-semble-linux-x64-fast.tar.gz",
				"unrelated-file.txt",
			])
			// fs.access resolves — only called for staged binary verification
			;(fs.access as any).mockResolvedValue(undefined)

			// Simulate successful download
			mockWriteStream.on.mockImplementation((event: string, cb: () => void) => {
				if (event === "finish") {
					setImmediate(cb)
				}
			})

			try {
				const result = await downloadSemble("/storage")

				expect(result).toBe(path.join("/storage", "semble", "semble"))
				const versionedArchive = path.join("/storage", "v0.5.2-semble-linux-x64-fast.tar.gz")

				// A fresh download must happen after the version upgrade
				expect(https.get).toHaveBeenCalledWith(expect.stringContaining("v0.5.2"), expect.any(Function))
				// The release URL keeps the unversioned asset name
				expect(https.get).toHaveBeenCalledWith(
					expect.stringContaining("semble-linux-x64-fast.tar.gz"),
					expect.any(Function),
				)
				// Extraction reads from the version-prefixed local cache path
				expect(spawn).toHaveBeenCalledWith(
					"tar",
					expect.arrayContaining(["-xzf", versionedArchive]),
					expect.any(Object),
				)
				// The stale archive is removed before the fresh download to guarantee
				// a clean package is verified against the new checksum.
				expect(fs.unlink).toHaveBeenCalledWith(versionedArchive)
				// The prior-version archive (v0.4.0-*) is swept by cleanupStaleArchives
				// after a successful install, so a version upgrade doesn't accumulate
				// orphaned packages on disk.
				expect(fs.unlink).toHaveBeenCalledWith(path.join("/storage", "v0.4.0-semble-linux-x64-fast.tar.gz"))
				// The legacy unversioned archive (pre-v0.4.0 cache layout) is also
				// swept, covering the v0.3.1 → v0.5.2 upgrade path.
				expect(fs.unlink).toHaveBeenCalledWith(path.join("/storage", "semble-linux-x64-fast.tar.gz"))
				// Unrelated files in the storage dir must not be touched.
				expect(fs.unlink).not.toHaveBeenCalledWith(path.join("/storage", "unrelated-file.txt"))
				// The new version file is recorded
				expect(fs.writeFile).toHaveBeenCalledWith(
					path.join("/storage", "semble", ".semble-version"),
					"v0.5.2",
					"utf-8",
				)
			} finally {
				if (originalPlatform) Object.defineProperty(process, "platform", originalPlatform)
				if (originalArch) Object.defineProperty(process, "arch", originalArch)
			}
		})

		it("should skip download when installed version matches SEMBLE_VERSION and binary exists", async () => {
			const originalPlatform = Object.getOwnPropertyDescriptor(process, "platform")
			const originalArch = Object.getOwnPropertyDescriptor(process, "arch")

			Object.defineProperty(process, "platform", { value: "linux", configurable: true })
			Object.defineProperty(process, "arch", { value: "x64", configurable: true })

			// Version matches
			;(fs.readFile as any).mockResolvedValue("v0.5.2")
			// Binary exists
			;(fs.access as any).mockResolvedValue(undefined)

			try {
				const result = await downloadSemble("/storage")

				expect(result).toBe(path.join("/storage", "semble", "semble"))
				// Should NOT download
				expect(https.get).not.toHaveBeenCalled()
				// Should NOT remove the extract dir
				expect(fs.rm).not.toHaveBeenCalled()
			} finally {
				if (originalPlatform) Object.defineProperty(process, "platform", originalPlatform)
				if (originalArch) Object.defineProperty(process, "arch", originalArch)
			}
		})

		it("should re-download when version matches but binary is missing", async () => {
			const originalPlatform = Object.getOwnPropertyDescriptor(process, "platform")
			const originalArch = Object.getOwnPropertyDescriptor(process, "arch")

			Object.defineProperty(process, "platform", { value: "linux", configurable: true })
			Object.defineProperty(process, "arch", { value: "x64", configurable: true })

			// Version matches
			;(fs.readFile as any).mockResolvedValue("v0.5.2")
			// But binary is missing
			let accessCallCount = 0
			;(fs.access as any).mockImplementation(() => {
				accessCallCount++
				// First call: binary path check (miss), subsequent: staged binary verify (pass)
				if (accessCallCount === 1) {
					return Promise.reject(new Error("ENOENT"))
				}
				return Promise.resolve(undefined)
			})

			// Simulate successful download
			mockWriteStream.on.mockImplementation((event: string, cb: () => void) => {
				if (event === "finish") {
					setImmediate(cb)
				}
			})

			try {
				const result = await downloadSemble("/storage")

				expect(result).toBe(path.join("/storage", "semble", "semble"))
				// Should download since binary was missing — pin the version tag so a
				// wrong SEMBLE_VERSION can't fetch a stale release unnoticed.
				expect(https.get).toHaveBeenCalledWith(expect.stringContaining("v0.5.2"), expect.any(Function))
				// Should rename staging to final
				expect(fs.rename).toHaveBeenCalledWith(
					path.join("/storage", "semble.new"),
					path.join("/storage", "semble"),
				)
				// Should write version file again
				expect(fs.writeFile).toHaveBeenCalledWith(
					path.join("/storage", "semble", ".semble-version"),
					"v0.5.2",
					"utf-8",
				)
			} finally {
				if (originalPlatform) Object.defineProperty(process, "platform", originalPlatform)
				if (originalArch) Object.defineProperty(process, "arch", originalArch)
			}
		})

		it("should download when no version file exists (first install)", async () => {
			const originalPlatform = Object.getOwnPropertyDescriptor(process, "platform")
			const originalArch = Object.getOwnPropertyDescriptor(process, "arch")

			Object.defineProperty(process, "platform", { value: "linux", configurable: true })
			Object.defineProperty(process, "arch", { value: "x64", configurable: true })

			// No version file
			;(fs.readFile as any).mockRejectedValue(new Error("ENOENT"))
			// fs.access resolves — only called for staged binary verification
			;(fs.access as any).mockResolvedValue(undefined)

			// Simulate successful download
			mockWriteStream.on.mockImplementation((event: string, cb: () => void) => {
				if (event === "finish") {
					setImmediate(cb)
				}
			})

			try {
				const result = await downloadSemble("/storage")

				expect(result).toBe(path.join("/storage", "semble", "semble"))
				// First-install path: the download URL must target the current version.
				expect(https.get).toHaveBeenCalledWith(expect.stringContaining("v0.5.2"), expect.any(Function))
				// Should rename staging to final
				expect(fs.rename).toHaveBeenCalledWith(
					path.join("/storage", "semble.new"),
					path.join("/storage", "semble"),
				)
				// Should write version file
				expect(fs.writeFile).toHaveBeenCalledWith(
					path.join("/storage", "semble", ".semble-version"),
					"v0.5.2",
					"utf-8",
				)
			} finally {
				if (originalPlatform) Object.defineProperty(process, "platform", originalPlatform)
				if (originalArch) Object.defineProperty(process, "arch", originalArch)
			}
		})
	})

	describe("downloadSemble - stale archive cleanup", () => {
		it("should ignore readdir failures during stale-archive cleanup", async () => {
			const originalPlatform = Object.getOwnPropertyDescriptor(process, "platform")
			const originalArch = Object.getOwnPropertyDescriptor(process, "arch")

			Object.defineProperty(process, "platform", { value: "linux", configurable: true })
			Object.defineProperty(process, "arch", { value: "x64", configurable: true })

			// First install (no version file) → triggers a fresh download
			;(fs.readFile as any).mockRejectedValue(new Error("ENOENT"))
			;(fs.access as any).mockResolvedValue(undefined)
			// readdir rejects — exercises the catch block in cleanupStaleArchives
			;(fs.readdir as any).mockRejectedValue(new Error("EACCES"))

			mockWriteStream.on.mockImplementation((event: string, cb: () => void) => {
				if (event === "finish") {
					setImmediate(cb)
				}
			})

			try {
				const result = await downloadSemble("/storage")

				// Should still succeed — cleanup failure is swallowed
				expect(result).toBe(path.join("/storage", "semble", "semble"))
				expect(fs.readdir).toHaveBeenCalledWith("/storage")
			} finally {
				if (originalPlatform) Object.defineProperty(process, "platform", originalPlatform)
				if (originalArch) Object.defineProperty(process, "arch", originalArch)
			}
		})

		it("should preserve the current archive and unrelated files during cleanup", async () => {
			const originalPlatform = Object.getOwnPropertyDescriptor(process, "platform")
			const originalArch = Object.getOwnPropertyDescriptor(process, "arch")

			Object.defineProperty(process, "platform", { value: "linux", configurable: true })
			Object.defineProperty(process, "arch", { value: "x64", configurable: true })

			// First install (no version file) → triggers a fresh download
			;(fs.readFile as any).mockRejectedValue(new Error("ENOENT"))
			;(fs.access as any).mockResolvedValue(undefined)
			// Storage dir contains the current archive plus unrelated files
			;(fs.readdir as any).mockResolvedValue([
				"v0.5.2-semble-linux-x64-fast.tar.gz",
				"v0.4.0-semble-linux-x64-fast.tar.gz",
				"semble-linux-x64-fast.tar.gz",
				"unrelated.txt",
			])

			mockWriteStream.on.mockImplementation((event: string, cb: () => void) => {
				if (event === "finish") {
					setImmediate(cb)
				}
			})

			try {
				await downloadSemble("/storage")

				const currentArchive = path.join("/storage", "v0.5.2-semble-linux-x64-fast.tar.gz")
				// Stale versioned + legacy unversioned archives are swept
				expect(fs.unlink).toHaveBeenCalledWith(path.join("/storage", "v0.4.0-semble-linux-x64-fast.tar.gz"))
				expect(fs.unlink).toHaveBeenCalledWith(path.join("/storage", "semble-linux-x64-fast.tar.gz"))
				// The current archive is never swept by cleanupStaleArchives (it is
				// excluded by the currentArchivePath guard). It is unlinked only by
				// the pre-download partial-archive cleanup and the post-install
				// archive cleanup steps. unrelated.txt is never touched.
				expect(fs.unlink).not.toHaveBeenCalledWith(path.join("/storage", "unrelated.txt"))
				// Sanity: the current archive path is never passed to the stale sweep.
				// It is unlinked exactly twice (pre-download cleanup + post-install
				// archive cleanup), never via cleanupStaleArchives.
				const currentUnlinks = (fs.unlink as any).mock.calls.filter((c: any[]) => c[0] === currentArchive)
				expect(currentUnlinks.length).toBe(2)
			} finally {
				if (originalPlatform) Object.defineProperty(process, "platform", originalPlatform)
				if (originalArch) Object.defineProperty(process, "arch", originalArch)
			}
		})
	})

	describe("SEMBLE_VERSION_PATTERN", () => {
		it("should be set to 'latest'", () => {
			expect(SEMBLE_VERSION_PATTERN).toBe("latest")
		})
	})

	describe("resolveSembleVersion", () => {
		it("should fetch latest version when API returns a redirect to release tag", async () => {
			// Mock https.get to handle HEAD request with options object
			;(https.get as any).mockImplementation((_url: string, _options: any, callback: (res: any) => void) => {
				const res = Object.assign(new EventEmitter(), {
					statusCode: 302,
					headers: { location: "https://github.com/Audare-est-Facere/sembleexec/releases/tag/v0.6.0" },
					destroy: vi.fn(),
				})
				setImmediate(() => callback(res))
				return Object.assign(new EventEmitter(), { setTimeout: vi.fn() })
			})

			const version = await resolveSembleVersion()
			expect(version).toBe("v0.6.0")
		})

		it("should fall back to hardcoded SEMBLE_VERSION when API fails", async () => {
			// Mock https.get to reject with error
			;(https.get as any).mockImplementation((_url: string, _options: any, _callback: (res: any) => void) => {
				const req = Object.assign(new EventEmitter(), { setTimeout: vi.fn() })
				setImmediate(() => req.emit("error", new Error("Network error")))
				return req
			})

			const version = await resolveSembleVersion()
			expect(version).toBe(SEMBLE_VERSION)
		})
	})

	describe("downloadChecksums", () => {
		it("should parse checksums manifest and return records", async () => {
			// Mock downloadFile to succeed, then readFile to return manifest content
			mockWriteStream.on.mockImplementation((event: string, cb: () => void) => {
				if (event === "finish") {
					setImmediate(cb)
				}
			})
			;(fs.readFile as any).mockResolvedValue(
				"1315d3faae9fd446764ee5d0cf8e8d83e862ead0f7fa51e1ed0685755dc96a8e  semble-linux-x64-fast.tar.gz\n" +
					"883b250faf61957d9859fc691bbe8387aaca4fe2f00e8a6f041cc44880301ac4  semble-linux-arm64-fast.tar.gz\n",
			)

			const result = await downloadChecksums(
				"/storage",
				"v0.5.2",
				"https://github.com/org/repo/releases/download/v0.5.2",
			)

			expect(result["semble-linux-x64-fast.tar.gz"]).toBe(
				"1315d3faae9fd446764ee5d0cf8e8d83e862ead0f7fa51e1ed0685755dc96a8e",
			)
			expect(result["semble-linux-arm64-fast.tar.gz"]).toBe(
				"883b250faf61957d9859fc691bbe8387aaca4fe2f00e8a6f041cc44880301ac4",
			)
		})

		it("should fall back to hardcoded SEMBLE_SHA256 when manifest download fails", async () => {
			// Mock downloadFile to fail (https.get returns 404)
			;(https.get as any).mockImplementation((_url: string, callback: (res: any) => void) => {
				const res = Object.assign(new EventEmitter(), {
					statusCode: 404,
					headers: {},
					pipe: vi.fn(),
					destroy: vi.fn(),
				})
				setImmediate(() => callback(res))
				return Object.assign(new EventEmitter(), { setTimeout: vi.fn() })
			})

			const result = await downloadChecksums(
				"/storage",
				"v0.5.2",
				"https://github.com/org/repo/releases/download/v0.5.2",
			)

			// Should return the hardcoded SEMBLE_SHA256
			expect(result).toEqual(SEMBLE_SHA256)
		})

		it("should fall back to SEMBLE_SHA256 when readFile fails on the manifest", async () => {
			// Mock downloadFile to succeed (200), but readFile to fail
			mockWriteStream.on.mockImplementation((event: string, cb: () => void) => {
				if (event === "finish") {
					setImmediate(cb)
				}
			})
			;(fs.readFile as any).mockRejectedValue(new Error("ENOENT"))

			const result = await downloadChecksums(
				"/storage",
				"v0.5.2",
				"https://github.com/org/repo/releases/download/v0.5.2",
			)

			expect(result).toEqual(SEMBLE_SHA256)
		})
	})

	describe("checkDiskSpace", () => {
		it("should not throw when sufficient disk space is available", async () => {
			// mockExecFileImpl already returns 5GB by default in beforeEach
			await expect(checkDiskSpace("/storage", 150 * 1024 * 1024)).resolves.toBeUndefined()
		})

		it("should throw when disk space is insufficient", async () => {
			mockExecFileCallback = (_cmd, _args, _options, cb) => {
				cb(null, { stdout: "Avail\n100\n" })
			} // 100KB available

			await expect(checkDiskSpace("/storage", 150 * 1024 * 1024)).rejects.toThrow("Insufficient disk space")
		})
	})

	describe("validateInstallPath", () => {
		it("should succeed when storage directory is writable", async () => {
			await expect(validateInstallPath("/storage")).resolves.toBeUndefined()
			expect(fs.mkdir).toHaveBeenCalledWith("/storage", { recursive: true })
			expect(fs.writeFile).toHaveBeenCalledWith("/storage/.write-test", "test", "utf-8")
			expect(fs.unlink).toHaveBeenCalledWith("/storage/.write-test")
		})

		it("should throw when storage directory is not writable", async () => {
			// Mock writeFile to fail
			;(fs.writeFile as any).mockRejectedValue(new Error("EACCES: permission denied"))

			await expect(validateInstallPath("/other-storage")).rejects.toThrow("Storage directory is not writable")
		})
	})
})
