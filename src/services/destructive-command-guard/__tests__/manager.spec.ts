import { createHash } from "crypto"
import { EventEmitter } from "events"
import { access, chmod, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "fs/promises"
import { tmpdir } from "os"
import path from "path"
import { PassThrough } from "stream"

import { spawn } from "child_process"
import { get } from "https"
import type { IncomingMessage } from "http"

import { DCG_ARCHIVES, DCG_BUNDLE_DIR, DCG_VERSION } from "../constants"
import {
	ensureDcgInstalled,
	extractSingleBinary,
	getBundledDcgArchiveCandidates,
	getBundledDcgArchivePath,
	getDcgArchiveInfo,
	getDcgBinaryPath,
	isDcgSupportedPlatform,
	resolveBundledDcgArchive,
	verifyBinaryChecksum,
	verifyChecksum,
} from "../manager"

vi.mock("child_process", () => ({ spawn: vi.fn() }))
// Nothing in the DCG path may touch the network: keep a spy so the tests can
// assert it is never used (DCG 3a — bundled distribution, no runtime download).
vi.mock("https", () => ({ get: vi.fn() }))

const mockSpawn = vi.mocked(spawn)
const mockGet = vi.mocked(get)

function sha256(contents: Buffer | string): string {
	return createHash("sha256").update(contents).digest("hex")
}

/**
 * Test double for a spawned extractor. The production code uses only this
 * event/stream subset; the cast is confined to this single construction site.
 */
function makeTarChild() {
	return Object.assign(new EventEmitter(), {
		stdout: new PassThrough(),
		stderr: new PassThrough(),
		kill: vi.fn(),
	})
}

/** Narrows the double to the `spawn` return type expected by `mockSpawn`. */
function asSpawnedChild(child: ReturnType<typeof makeTarChild>): ReturnType<typeof spawn> {
	return child as unknown as ReturnType<typeof spawn>
}

describe("Destructive Command Guard manager", () => {
	let tempDir: string
	let extensionPath: string

	beforeEach(async () => {
		tempDir = await mkdtemp(path.join(tmpdir(), "dcg-manager-"))
		extensionPath = path.join(tempDir, "extension")
		mockSpawn.mockReset()
		mockGet.mockReset()
	})

	afterEach(async () => {
		await rm(tempDir, { recursive: true, force: true })
	})

	it("maps all supported platform and architecture combinations", () => {
		expect(Object.keys(DCG_ARCHIVES).sort()).toEqual([
			"darwin-arm64",
			"darwin-x64",
			"linux-arm64",
			"linux-x64",
			"win32-x64",
		])
		expect(getDcgArchiveInfo("darwin", "arm64")?.archive).toBe("dcg-aarch64-apple-darwin.tar.xz")
		expect(getDcgArchiveInfo("darwin", "x64")?.archive).toBe("dcg-x86_64-apple-darwin.tar.xz")
		expect(getDcgArchiveInfo("win32", "x64")?.binary).toBe("dcg.exe")
	})

	it("pins both an archive and an extracted-binary checksum for every platform", () => {
		for (const [platform, info] of Object.entries(DCG_ARCHIVES)) {
			expect(info.sha256, `${platform} archive hash`).toMatch(/^[0-9a-f]{64}$/)
			expect(info.binarySha256, `${platform} binary hash`).toMatch(/^[0-9a-f]{64}$/)
			expect(info.binarySha256, `${platform} hashes must differ`).not.toBe(info.sha256)
		}
	})

	it("rejects unsupported platforms", () => {
		expect(isDcgSupportedPlatform("freebsd", "x64")).toBe(false)
		expect(getDcgBinaryPath("/storage", "freebsd", "x64")).toBeUndefined()
		expect(getBundledDcgArchivePath("/ext", "freebsd", "x64")).toBeUndefined()
	})

	it("returns the managed binary path", () => {
		expect(getDcgBinaryPath("/storage", "linux", "x64")).toBe(
			path.join("/storage", "destructive-command-guard", "dcg"),
		)
	})

	it("resolves the bundled archive path inside the extension package", () => {
		expect(getBundledDcgArchivePath("/ext", "linux", "x64")).toBe(
			path.join("/ext", DCG_BUNDLE_DIR, "dcg-x86_64-unknown-linux-musl.tar.xz"),
		)
		expect(getBundledDcgArchivePath("/ext", "win32", "x64")).toBe(
			path.join("/ext", DCG_BUNDLE_DIR, "dcg-x86_64-pc-windows-msvc.zip"),
		)
	})

	it("selects the bundled provider when the archive ships in the package", async () => {
		const info = getDcgArchiveInfo()
		if (!info) return
		const archivePath = getBundledDcgArchivePath(extensionPath)
		if (!archivePath) throw new Error("expected a bundled path")
		await mkdir(path.dirname(archivePath), { recursive: true })
		await writeFile(archivePath, "bundled archive")

		await expect(resolveBundledDcgArchive(extensionPath)).resolves.toEqual({ archivePath, info })
	})

	it("reports the provider as absent when the bundled archive is missing", async () => {
		await mkdir(path.join(extensionPath, DCG_BUNDLE_DIR), { recursive: true })
		await expect(resolveBundledDcgArchive(extensionPath)).resolves.toBeUndefined()
	})

	it("reports the provider as absent when the bundled path is a directory", async () => {
		const info = getDcgArchiveInfo()
		if (!info) return
		const archivePath = getBundledDcgArchivePath(extensionPath)
		if (!archivePath) throw new Error("expected a bundled path")
		await mkdir(archivePath, { recursive: true })

		await expect(resolveBundledDcgArchive(extensionPath)).resolves.toBeUndefined()
	})

	it("verifies matching archive checksums and rejects mismatches", async () => {
		const filePath = path.join(tempDir, "archive")
		const contents = Buffer.from("verified archive")
		await writeFile(filePath, contents)
		const checksum = sha256(contents)

		await expect(verifyChecksum(filePath, checksum)).resolves.toBeUndefined()
		await expect(verifyChecksum(filePath, "0".repeat(64))).rejects.toThrow(`got ${checksum}`)
	})

	it("verifies the extracted binary checksum and rejects a tampered executable", async () => {
		const binaryPath = path.join(tempDir, "dcg")
		await writeFile(binaryPath, "tampered binary")

		await expect(verifyBinaryChecksum(binaryPath, sha256("tampered binary"))).resolves.toBeUndefined()
		await expect(verifyBinaryChecksum(binaryPath, "1".repeat(64))).rejects.toThrow(
			"DCG binary checksum verification failed",
		)
	})

	it("uses the platform ZIP extractor", async () => {
		const child = makeTarChild()
		mockSpawn.mockReturnValue(asSpawnedChild(child))

		const extraction = extractSingleBinary("C:\\dcg.zip", "C:\\staging", DCG_ARCHIVES["win32-x64"])
		child.emit("close", 0)
		await extraction

		const expectedExecutable = process.platform === "win32" ? "powershell" : "unzip"
		const expectedArgs =
			process.platform === "win32"
				? ["-NoProfile", "-NonInteractive", "-EncodedCommand", expect.any(String)]
				: ["-o", "C:\\dcg.zip", "-d", "C:\\staging"]

		expect(mockSpawn).toHaveBeenCalledWith(expectedExecutable, expectedArgs, {
			shell: false,
			stdio: ["ignore", "pipe", "pipe"],
		})
	})

	it("extracts tar archives without imposing a single-file layout", async () => {
		const child = makeTarChild()
		mockSpawn.mockReturnValue(asSpawnedChild(child))

		const extraction = extractSingleBinary("/tmp/dcg.tar.xz", tempDir, DCG_ARCHIVES["linux-x64"])
		child.emit("close", 0)

		await expect(extraction).resolves.toBeUndefined()
		expect(mockSpawn).toHaveBeenCalledTimes(1)
		const expectedArgs = ["-xJf", "/tmp/dcg.tar.xz", "-C", tempDir, "--no-same-owner"]
		if (process.platform === "linux") expectedArgs.push("--no-overwrite-dir")
		expect(mockSpawn).toHaveBeenCalledWith("tar", expectedArgs, { shell: false, stdio: ["ignore", "pipe", "pipe"] })
	})

	it("surfaces process failures during extraction", async () => {
		const child = makeTarChild()
		mockSpawn.mockReturnValue(asSpawnedChild(child))

		const extraction = extractSingleBinary("/tmp/dcg.tar.xz", tempDir, DCG_ARCHIVES["linux-x64"])
		child.stderr.write("invalid archive")
		child.emit("close", 2)

		await expect(extraction).rejects.toThrow("invalid archive")
	})

	it("reuses an existing managed binary and restores its executable permissions", async () => {
		const binaryPath = getDcgBinaryPath(tempDir)
		expect(binaryPath).toBeDefined()
		await mkdir(path.dirname(binaryPath!), { recursive: true })
		await writeFile(binaryPath!, "existing binary")
		await writeFile(path.join(path.dirname(binaryPath!), ".dcg-version"), DCG_VERSION)
		if (process.platform !== "win32") {
			await chmod(binaryPath!, 0o600)
		}

		await expect(ensureDcgInstalled(tempDir, { extensionPath })).resolves.toBe(binaryPath)
		expect(mockSpawn).not.toHaveBeenCalled()
		expect(mockGet).not.toHaveBeenCalled()
		if (process.platform !== "win32") {
			expect((await stat(binaryPath!)).mode & 0o111).toBe(0o111)
		}
	})

	it("does not invoke the consent gate when the binary is already installed", async () => {
		const binaryPath = getDcgBinaryPath(tempDir)
		expect(binaryPath).toBeDefined()
		await mkdir(path.dirname(binaryPath!), { recursive: true })
		await writeFile(binaryPath!, "existing binary")
		await writeFile(path.join(path.dirname(binaryPath!), ".dcg-version"), DCG_VERSION)

		const gate = vi.fn().mockRejectedValue(new Error("consent gate must not run"))
		await expect(ensureDcgInstalled(tempDir, { extensionPath, gate: { onBeforeInstall: gate } })).resolves.toBe(
			binaryPath,
		)
		expect(gate).not.toHaveBeenCalled()
		expect(mockGet).not.toHaveBeenCalled()
	})

	it("fails closed without touching the network when the consent gate denies the install", async () => {
		const info = getDcgArchiveInfo()
		if (!info) return
		const archivePath = getBundledDcgArchivePath(extensionPath)
		if (!archivePath) throw new Error("expected a bundled path")
		await mkdir(path.dirname(archivePath), { recursive: true })
		await writeFile(archivePath, "bundled archive")

		const gate = vi.fn().mockResolvedValue(false)
		await expect(ensureDcgInstalled(tempDir, { extensionPath, gate: { onBeforeInstall: gate } })).rejects.toThrow(
			"Failed to install DCG: installation cancelled by user",
		)
		expect(gate).toHaveBeenCalledTimes(1)
		expect(mockGet).not.toHaveBeenCalled()
	})

	it("reports unavailable and warns when the platform has no prebuilt DCG", async () => {
		const platformKey = `${process.platform}-${process.arch}`
		const info = DCG_ARCHIVES[platformKey]
		if (!info) return
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
		Reflect.deleteProperty(DCG_ARCHIVES, platformKey)

		try {
			await expect(ensureDcgInstalled(tempDir, { extensionPath })).resolves.toBeUndefined()
			expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining(`Unsupported platform: ${platformKey}`))
			expect(mockGet).not.toHaveBeenCalled()
		} finally {
			Reflect.set(DCG_ARCHIVES, platformKey, info)
			warnSpy.mockRestore()
		}
	})

	// AVAILABILITY failure. The guard must NOT refuse every command when the
	// bytes it needs are absent: it disables itself, says so once per session, and
	// the caller proceeds as if the feature were off (review finding M7).
	it("fails open with exactly ONE warning when a supported platform's bundled archive is missing", async () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
		try {
			await expect(ensureDcgInstalled(tempDir, { extensionPath })).resolves.toBeUndefined()
			// A second command in the same session must not repeat the warning.
			await expect(ensureDcgInstalled(tempDir, { extensionPath })).resolves.toBeUndefined()
			await expect(ensureDcgInstalled(tempDir, { extensionPath })).resolves.toBeUndefined()

			expect(warnSpy).toHaveBeenCalledTimes(1)
			expect(warnSpy.mock.calls[0]?.[0]).toContain("no bundled DCG archive was found")
			expect(warnSpy.mock.calls[0]?.[0]).toContain("Commands run unguarded")
			expect(mockGet).not.toHaveBeenCalled()
			// Nothing was installed, and no download was attempted.
			await expect(access(getDcgBinaryPath(tempDir)!)).rejects.toThrow()
		} finally {
			warnSpy.mockRestore()
		}
	})

	it("still uses an already-installed binary when the bundle is absent for this layout", async () => {
		// The installer short-circuits on the version marker before provisioning, so
		// a missing bundle must not disable a working guard.
		const binaryPath = getDcgBinaryPath(tempDir)
		if (!binaryPath) throw new Error("expected a supported platform")
		await mkdir(path.dirname(binaryPath), { recursive: true })
		await writeFile(binaryPath, "existing binary")
		await writeFile(path.join(path.dirname(binaryPath), ".dcg-version"), DCG_VERSION)
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
		try {
			await expect(ensureDcgInstalled(tempDir, { extensionPath })).resolves.toBe(binaryPath)
			expect(warnSpy).not.toHaveBeenCalled()
			expect(mockGet).not.toHaveBeenCalled()
		} finally {
			warnSpy.mockRestore()
		}
	})

	it("fails closed with a checksum error when the bundled archive was tampered with", async () => {
		const info = getDcgArchiveInfo()
		if (!info) return
		const archivePath = getBundledDcgArchivePath(extensionPath)
		if (!archivePath) throw new Error("expected a bundled path")
		await mkdir(path.dirname(archivePath), { recursive: true })
		await writeFile(archivePath, "tampered archive")

		await expect(ensureDcgInstalled(tempDir, { extensionPath })).rejects.toThrow(
			"DCG bundled archive checksum verification failed",
		)
		expect(mockGet).not.toHaveBeenCalled()
	})

	it("rejects an extracted binary whose hash does not match the pinned constant", async () => {
		const info = getDcgArchiveInfo()
		if (!info || info.archive.endsWith(".zip")) return

		const archive = Buffer.from("test archive")
		const originalArchiveHash = info.sha256
		Object.defineProperty(info, "sha256", { value: sha256(archive), configurable: true })
		const archivePath = getBundledDcgArchivePath(extensionPath)
		if (!archivePath) throw new Error("expected a bundled path")
		await mkdir(path.dirname(archivePath), { recursive: true })
		await writeFile(archivePath, archive)

		mockSpawn.mockImplementation((_executable, args) => {
			const child = makeTarChild()
			setImmediate(async () => {
				const stagingDir = args[args.indexOf("-C") + 1]
				// A binary that does NOT match the pinned binarySha256.
				await writeFile(path.join(stagingDir, info.binary), "unexpected executable")
				child.emit("close", 0)
			})
			return asSpawnedChild(child)
		})

		try {
			await expect(ensureDcgInstalled(tempDir, { extensionPath })).rejects.toThrow(
				"DCG binary checksum verification failed",
			)
			expect(mockGet).not.toHaveBeenCalled()
			await expect(access(getDcgBinaryPath(tempDir)!)).rejects.toThrow()
		} finally {
			Object.defineProperty(info, "sha256", { value: originalArchiveHash, configurable: true })
		}
	})

	// The CLI/headless host points `extensionPath` at the BUILD OUTPUT directory
	// (`src/dist`, which holds extension.js); the archives ship one level up in
	// the package root (`src/bin/dcg`). Before this probe existed the guard found
	// no archive there and refused every command (review finding M7).
	it("finds the bundle when extensionPath is a build-output directory (CLI/headless layout)", async () => {
		const info = getDcgArchiveInfo()
		if (!info || info.archive.endsWith(".zip")) return

		const packageRoot = path.join(tempDir, "package")
		const distPath = path.join(packageRoot, "dist")
		const archive = Buffer.from("cli bundled archive")
		const originalArchiveHash = info.sha256
		const originalBinaryHash = info.binarySha256
		Object.defineProperty(info, "sha256", { value: sha256(archive), configurable: true })
		Object.defineProperty(info, "binarySha256", { value: sha256("cli executable"), configurable: true })

		const archivePath = path.join(packageRoot, "bin", "dcg", info.archive)
		await mkdir(path.dirname(archivePath), { recursive: true })
		await writeFile(archivePath, archive)
		await mkdir(distPath, { recursive: true })
		await writeFile(path.join(distPath, "extension.js"), "")

		// Layout assertions: the primary candidate is inside the dist dir (absent
		// here) and the second is the package root that actually carries the bytes.
		expect(getBundledDcgArchiveCandidates(distPath)).toEqual([
			path.join(distPath, "bin", "dcg", info.archive),
			path.join(packageRoot, "bin", "dcg", info.archive),
		])
		await expect(resolveBundledDcgArchive(distPath)).resolves.toEqual({ archivePath, info })

		mockSpawn.mockImplementation((_executable, args) => {
			const child = makeTarChild()
			setImmediate(async () => {
				const stagingDir = args[args.indexOf("-C") + 1]
				await writeFile(path.join(stagingDir, info.binary), "cli executable")
				child.emit("close", 0)
			})
			return asSpawnedChild(child)
		})

		try {
			const binaryPath = await ensureDcgInstalled(tempDir, { extensionPath: distPath })
			// The guard is ACTIVE (not silently disabled) and no network is touched.
			expect(binaryPath).toBe(getDcgBinaryPath(tempDir))
			expect(await readFile(binaryPath!, "utf8")).toBe("cli executable")
			expect(mockGet).not.toHaveBeenCalled()
		} finally {
			Object.defineProperty(info, "sha256", { value: originalArchiveHash, configurable: true })
			Object.defineProperty(info, "binarySha256", { value: originalBinaryHash, configurable: true })
		}
	})

	it("installs from the bundled archive without any network access", async () => {
		const info = getDcgArchiveInfo()
		if (!info || info.archive.endsWith(".zip")) return

		const archive = Buffer.from("bundled test archive")
		const originalArchiveHash = info.sha256
		const originalBinaryHash = info.binarySha256
		Object.defineProperty(info, "sha256", { value: sha256(archive), configurable: true })
		Object.defineProperty(info, "binarySha256", { value: sha256("executable"), configurable: true })

		const archivePath = getBundledDcgArchivePath(extensionPath)
		if (!archivePath) throw new Error("expected a bundled path")
		await mkdir(path.dirname(archivePath), { recursive: true })
		await writeFile(archivePath, archive)

		mockSpawn.mockImplementation((_executable, args) => {
			const child = makeTarChild()
			setImmediate(async () => {
				const stagingDir = args[args.indexOf("-C") + 1]
				await writeFile(path.join(stagingDir, info.binary), "executable")
				child.emit("close", 0)
			})
			return asSpawnedChild(child)
		})

		try {
			// Concurrent calls converge on one installation (dedupe is enforced by
			// the shared managed-binary installer; see install.spec.ts).
			const [binaryPath, concurrentBinaryPath] = await Promise.all([
				ensureDcgInstalled(tempDir, { extensionPath }),
				ensureDcgInstalled(tempDir, { extensionPath }),
			])
			expect(concurrentBinaryPath).toBe(binaryPath)

			if (!binaryPath) throw new Error("Expected DCG to be supported in this test")
			expect(await readFile(binaryPath, "utf8")).toBe("executable")
			expect(mockSpawn).toHaveBeenCalledTimes(1)
			// The bundled archive is copied into storage, then removed again.
			await expect(access(path.join(tempDir, `${DCG_VERSION}-${info.archive}`))).rejects.toThrow()
			expect(await readFile(path.join(tempDir, "destructive-command-guard", ".dcg-version"), "utf8")).toBe(
				DCG_VERSION,
			)
			// The bundled archive itself is untouched in the extension package.
			expect(await readFile(archivePath, "utf8")).toBe("bundled test archive")
			// Hard no-network guarantee.
			expect(mockGet).not.toHaveBeenCalled()
		} finally {
			Object.defineProperty(info, "sha256", { value: originalArchiveHash, configurable: true })
			Object.defineProperty(info, "binarySha256", { value: originalBinaryHash, configurable: true })
		}
	})

	it.skipIf(!getDcgArchiveInfo()?.archive.endsWith(".zip"))(
		"installs from a bundled ZIP archive without any network access",
		async () => {
			const info = getDcgArchiveInfo()
			if (!info) throw new Error("Expected a ZIP archive in this test")

			const archive = Buffer.from("bundled ZIP archive")
			const originalArchiveHash = info.sha256
			const originalBinaryHash = info.binarySha256
			Object.defineProperty(info, "sha256", { value: sha256(archive), configurable: true })
			Object.defineProperty(info, "binarySha256", { value: sha256("ZIP executable"), configurable: true })

			const archivePath = getBundledDcgArchivePath(extensionPath)
			if (!archivePath) throw new Error("expected a bundled path")
			await mkdir(path.dirname(archivePath), { recursive: true })
			await writeFile(archivePath, archive)

			mockSpawn.mockImplementation((_executable, args) => {
				const child = makeTarChild()
				setImmediate(async () => {
					const encodedCommandIndex = args.indexOf("-EncodedCommand")
					const script = Buffer.from(args[encodedCommandIndex + 1], "base64").toString("utf16le")
					const destinationMatch = script.match(/\$destination = '((?:[^']|'')*)'/)
					if (!destinationMatch) throw new Error("Expected a PowerShell destination")
					const stagingDir = destinationMatch[1].replace(/''/g, "'")
					await writeFile(path.join(stagingDir, info.binary), "ZIP executable")
					child.emit("close", 0)
				})
				return asSpawnedChild(child)
			})

			try {
				const binaryPath = await ensureDcgInstalled(tempDir, { extensionPath })
				if (!binaryPath) throw new Error("Expected DCG to be supported in this test")
				expect(await readFile(binaryPath, "utf8")).toBe("ZIP executable")
				expect(await readFile(path.join(tempDir, "destructive-command-guard", ".dcg-version"), "utf8")).toBe(
					DCG_VERSION,
				)
				await expect(access(path.join(tempDir, `${DCG_VERSION}-${info.archive}`))).rejects.toThrow()
				expect(mockGet).not.toHaveBeenCalled()
			} finally {
				Object.defineProperty(info, "sha256", { value: originalArchiveHash, configurable: true })
				Object.defineProperty(info, "binarySha256", { value: originalBinaryHash, configurable: true })
			}
		},
	)
})
