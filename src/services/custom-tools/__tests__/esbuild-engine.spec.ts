import * as fs from "fs"
import * as os from "os"
import * as path from "path"
import { execFileSync } from "child_process"
import { createHash } from "crypto"

import nock from "nock"

import {
	ESBUILD_WASM_VERSION,
	ensureEsbuildEngine,
	getEsbuildEngineDir,
	getEsbuildEngineScriptPath,
	isEsbuildEngineInstalled,
	sha256File,
	type EsbuildEngineSpec,
} from "../esbuild-engine"

const TARBALL_ORIGIN = "https://fixtures.test"
const TARBALL_URL = `${TARBALL_ORIGIN}/esbuild-wasm.tgz`
const WASM_BYTES = Buffer.from("FAKE-ESBUILD-WASM-ENGINE-BYTES")
const CLI_BYTES = "#!/usr/bin/env node\n// fake patched esbuild CLI\n"

function sha256(buffer: Buffer): string {
	return createHash("sha256").update(buffer).digest("hex")
}

describe("esbuild-engine", () => {
	let tempDir: string
	let storageDir: string
	let extensionPath: string
	let tarballBuffer: Buffer
	let spec: EsbuildEngineSpec

	/** Build a small, valid npm-style tarball containing package/esbuild.wasm. */
	function buildFixtureTarball(): Buffer {
		const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "esbuild-engine-fixture-"))
		const packageDir = path.join(fixtureRoot, "package")
		fs.mkdirSync(packageDir, { recursive: true })
		fs.writeFileSync(path.join(packageDir, "esbuild.wasm"), WASM_BYTES)

		const tarballPath = path.join(fixtureRoot, "fixture.tgz")
		execFileSync("tar", ["-czf", tarballPath, "-C", fixtureRoot, "package/esbuild.wasm"])

		const buffer = fs.readFileSync(tarballPath)
		fs.rmSync(fixtureRoot, { recursive: true, force: true })
		return buffer
	}

	function seedBundledRuntime(): void {
		const dist = path.join(extensionPath, "dist")
		fs.mkdirSync(path.join(dist, "bin"), { recursive: true })
		fs.writeFileSync(path.join(dist, "bin", "esbuild"), CLI_BYTES)
		fs.writeFileSync(path.join(dist, "wasm_exec_node.js"), "// wasm_exec_node\n")
		fs.writeFileSync(path.join(dist, "wasm_exec.js"), "// wasm_exec\n")
	}

	function seedInstalledEngine(): void {
		const engineDir = getEsbuildEngineDir(storageDir)
		fs.mkdirSync(path.join(engineDir, "bin"), { recursive: true })
		fs.writeFileSync(path.join(engineDir, "bin", "esbuild"), CLI_BYTES)
		fs.writeFileSync(path.join(engineDir, "esbuild.wasm"), WASM_BYTES)
		fs.writeFileSync(path.join(engineDir, "wasm_exec_node.js"), "// wasm_exec_node\n")
		fs.writeFileSync(path.join(engineDir, "wasm_exec.js"), "// wasm_exec\n")
		fs.writeFileSync(path.join(engineDir, ".esbuild-version"), ESBUILD_WASM_VERSION)
	}

	beforeEach(() => {
		nock.cleanAll()
		nock.disableNetConnect()

		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "esbuild-engine-test-"))
		storageDir = path.join(tempDir, "storage")
		extensionPath = path.join(tempDir, "extension")
		fs.mkdirSync(storageDir, { recursive: true })
		seedBundledRuntime()

		tarballBuffer = buildFixtureTarball()
		spec = {
			tarballUrl: TARBALL_URL,
			tarballSha256: sha256(tarballBuffer),
			wasmSha256: sha256(WASM_BYTES),
		}
	})

	afterEach(() => {
		nock.cleanAll()
		nock.enableNetConnect()
		fs.rmSync(tempDir, { recursive: true, force: true })
	})

	it("downloads, verifies and installs the engine on first use", async () => {
		const scope = nock(TARBALL_ORIGIN).get("/esbuild-wasm.tgz").reply(200, tarballBuffer)
		const gate = vi.fn().mockResolvedValue(true)

		const scriptPath = await ensureEsbuildEngine({ storageDir, extensionPath, onBeforeDownload: gate, spec })

		expect(gate).toHaveBeenCalledTimes(1)
		expect(scope.isDone()).toBe(true)
		expect(scriptPath).toBe(getEsbuildEngineScriptPath(storageDir))
		expect(fs.existsSync(scriptPath)).toBe(true)
		expect(fs.readFileSync(scriptPath, "utf-8")).toBe(CLI_BYTES)
		expect(await sha256File(path.join(getEsbuildEngineDir(storageDir), "esbuild.wasm"))).toBe(spec.wasmSha256)
		expect(await isEsbuildEngineInstalled(storageDir)).toBe(true)
	})

	it("uses the cached engine without any network access", async () => {
		seedInstalledEngine()
		const gate = vi.fn().mockResolvedValue(true)

		const scriptPath = await ensureEsbuildEngine({ storageDir, extensionPath, onBeforeDownload: gate, spec })

		expect(scriptPath).toBe(getEsbuildEngineScriptPath(storageDir))
		expect(gate).not.toHaveBeenCalled()
	})

	it("rejects and deletes the artefact when the tarball checksum does not match", async () => {
		nock(TARBALL_ORIGIN).get("/esbuild-wasm.tgz").reply(200, tarballBuffer)

		await expect(
			ensureEsbuildEngine({
				storageDir,
				extensionPath,
				onBeforeDownload: async () => true,
				spec: { ...spec, tarballSha256: "0".repeat(64) },
			}),
		).rejects.toThrow(/Checksum mismatch for esbuild-wasm tarball/)

		expect(await isEsbuildEngineInstalled(storageDir)).toBe(false)
		expect(fs.existsSync(path.join(storageDir, `.esbuild-wasm-${ESBUILD_WASM_VERSION}.tgz`))).toBe(false)
		expect(fs.existsSync(`${getEsbuildEngineDir(storageDir)}.new`)).toBe(false)
	})

	it("rejects and deletes the artefact when the extracted wasm checksum does not match", async () => {
		nock(TARBALL_ORIGIN).get("/esbuild-wasm.tgz").reply(200, tarballBuffer)

		await expect(
			ensureEsbuildEngine({
				storageDir,
				extensionPath,
				onBeforeDownload: async () => true,
				spec: { ...spec, wasmSha256: "0".repeat(64) },
			}),
		).rejects.toThrow(/Checksum mismatch for esbuild.wasm engine/)

		expect(await isEsbuildEngineInstalled(storageDir)).toBe(false)
		expect(fs.existsSync(path.join(storageDir, `.esbuild-wasm-${ESBUILD_WASM_VERSION}.tgz`))).toBe(false)
	})

	it("aborts without downloading when the user declines consent", async () => {
		const scope = nock(TARBALL_ORIGIN).get("/esbuild-wasm.tgz").reply(200, tarballBuffer)
		const gate = vi.fn().mockResolvedValue(false)

		await expect(ensureEsbuildEngine({ storageDir, extensionPath, onBeforeDownload: gate, spec })).rejects.toThrow(
			/cancelled/,
		)

		expect(gate).toHaveBeenCalledTimes(1)
		expect(scope.isDone()).toBe(false)
		expect(await isEsbuildEngineInstalled(storageDir)).toBe(false)
		expect(fs.existsSync(getEsbuildEngineDir(storageDir))).toBe(false)
	})

	it("surfaces a clear, actionable error when offline", async () => {
		nock(TARBALL_ORIGIN).get("/esbuild-wasm.tgz").replyWithError(new Error("getaddrinfo ENOTFOUND fixtures.test"))

		await expect(
			ensureEsbuildEngine({ storageDir, extensionPath, onBeforeDownload: async () => true, spec }),
		).rejects.toThrow(/Failed to install the esbuild engine required for custom tools/)

		expect(await isEsbuildEngineInstalled(storageDir)).toBe(false)
		expect(fs.existsSync(path.join(storageDir, `.esbuild-wasm-${ESBUILD_WASM_VERSION}.tgz`))).toBe(false)
	})
})
