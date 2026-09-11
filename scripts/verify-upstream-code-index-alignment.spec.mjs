/**
 * verify-upstream-code-index-alignment.spec.mjs
 *
 * Unit tests for the pure alignment logic in
 * scripts/verify-upstream-code-index-alignment.mjs (the upstream-alignment
 * diff-gate for the Qdrant code-index core).
 *
 * Run with: node --test scripts/verify-upstream-code-index-alignment.spec.mjs
 * (scripts/ has no vitest runner, so node:test built into Node 22 is used —
 * same as scripts/verify-submodule-pin.spec.mjs / verify-message-schemas.spec.mjs.)
 */

import { describe, it } from "node:test"
import assert from "node:assert/strict"

import {
	assessAll,
	compareCoreFile,
	decideRunMode,
	failedPaths,
	getNormalizer,
	normalizeBranding,
	stripForkTelemetry,
	stripSembleBinaryPath,
} from "./verify-upstream-code-index-alignment.mjs"

const UPSTREAM_CORE = "export const core = 1\n"

describe("normalizeBranding", () => {
	it("leaves non-branding content untouched", () => {
		assert.equal(normalizeBranding("const x = 1\n"), "const x = 1\n")
	})

	it("maps every fork/upstream branding spelling to the same placeholder", () => {
		const fork = `User-Agent: Roo-Plus\nX-Title: Roo+\nid: RooPlus\norg: Roo-Plus-Org\n`
		const upstream = `User-Agent: Zoo-Code\nX-Title: Zoo Code\nid: ZooCode\norg: Zoo-Code-Org\n`
		assert.equal(normalizeBranding(fork), normalizeBranding(upstream))
	})

	it("consumes the longer org token before the shorter one", () => {
		// "Roo-Plus-Org" must normalize as a whole, not leave "-Org" behind.
		const fork = normalizeBranding("Roo-Plus-Org")
		const upstream = normalizeBranding("Zoo-Code-Org")
		assert.equal(fork, upstream)
		assert.ok(!fork.includes("Org"))
	})
})

describe("stripSembleBinaryPath", () => {
	it("removes only the fork's sembleBinaryPath lines", () => {
		const fork = [
			"export interface CodeIndexConfig {",
			"\tqdrantUrl?: string",
			"\tsembleBinaryPath?: string",
			"}",
		].join("\n")
		const upstream = ["export interface CodeIndexConfig {", "\tqdrantUrl?: string", "}"].join("\n")
		assert.equal(stripSembleBinaryPath(fork), upstream)
	})
})

describe("getNormalizer", () => {
	it("selects branding normalization for mode:branding", () => {
		assert.equal(getNormalizer({ mode: "branding" }), normalizeBranding)
	})
	it("selects the fork-config stripper for mode:fork-config", () => {
		assert.equal(getNormalizer({ mode: "fork-config" }), stripSembleBinaryPath)
	})
	it("defaults to identity for exact files", () => {
		assert.equal(getNormalizer({})(UPSTREAM_CORE), UPSTREAM_CORE)
	})
})

describe("compareCoreFile", () => {
	it("passes a core file that is byte-identical to upstream", () => {
		const verdict = compareCoreFile({ path: "core.ts" }, UPSTREAM_CORE, UPSTREAM_CORE)
		assert.equal(verdict.ok, true)
		assert.equal(verdict.status, "identical")
	})

	it("fails a core file that drifted from upstream", () => {
		const verdict = compareCoreFile({ path: "core.ts" }, "export const core = 2\n", UPSTREAM_CORE)
		assert.equal(verdict.ok, false)
		assert.equal(verdict.status, "drift")
	})

	it("fails when the file is missing locally but exists upstream", () => {
		const verdict = compareCoreFile({ path: "core.ts" }, null, UPSTREAM_CORE)
		assert.equal(verdict.ok, false)
		assert.equal(verdict.status, "missing-local")
	})

	it("fails when the file does not exist upstream", () => {
		const verdict = compareCoreFile({ path: "core.ts" }, UPSTREAM_CORE, null)
		assert.equal(verdict.ok, false)
		assert.equal(verdict.status, "missing-upstream")
	})

	it("passes a branding-mode file whose only diff is branding", () => {
		const entry = { path: "embedders/bedrock.ts", mode: "branding" }
		const fork = `userAgentAppId: \`RooPlus#\${Package.version}\`\n`
		const upstream = `userAgentAppId: \`ZooCode#\${Package.version}\`\n`
		const verdict = compareCoreFile(entry, fork, upstream)
		assert.equal(verdict.ok, true)
		assert.equal(verdict.status, "allowed-diff")
	})

	it("passes a branding-mode file with URL/header branding (openrouter)", () => {
		const entry = { path: "embedders/openrouter.ts", mode: "branding" }
		const fork = `"HTTP-Referer": "https://github.com/Roo-Plus-Org/Roo-Plus", "X-Title": "Roo+"\n`
		const upstream = `"HTTP-Referer": "https://github.com/Zoo-Code-Org/Zoo-Code", "X-Title": "Zoo Code"\n`
		assert.equal(compareCoreFile(entry, fork, upstream).ok, true)
	})

	it("passes a branding-mode file with User-Agent branding (qdrant)", () => {
		const entry = { path: "vector-store/qdrant-client.ts", mode: "branding" }
		assert.equal(compareCoreFile(entry, '"User-Agent": "Roo-Plus"', '"User-Agent": "Zoo-Code"').ok, true)
	})

	it("fails a branding-mode file that drifted beyond branding", () => {
		const entry = { path: "embedders/bedrock.ts", mode: "branding" }
		const fork = `userAgentAppId: \`RooPlus#\${Package.version}\`\nconst extra = true\n`
		const verdict = compareCoreFile(entry, fork, `userAgentAppId: \`ZooCode#\${Package.version}\`\n`)
		assert.equal(verdict.ok, false)
		assert.equal(verdict.status, "drift")
	})

	it("passes the fork-config file (interfaces/config.ts) with its sembleBinaryPath fields", () => {
		const entry = { path: "interfaces/config.ts", mode: "fork-config" }
		const fork = [
			"export interface CodeIndexConfig {",
			"\tqdrantApiKey?: string",
			"\tsembleBinaryPath?: string",
			"}",
		].join("\n")
		const upstream = ["export interface CodeIndexConfig {", "\tqdrantApiKey?: string", "}"].join("\n")
		assert.equal(compareCoreFile(entry, fork, upstream).ok, true)
	})

	it("fails the fork-config file if it drifts beyond sembleBinaryPath", () => {
		const entry = { path: "interfaces/config.ts", mode: "fork-config" }
		const fork = "export const changed = true\n\tsembleBinaryPath?: string\n"
		const upstream = "export interface CodeIndexConfig {}\n"
		assert.equal(compareCoreFile(entry, fork, upstream).ok, false)
	})

	it("passes a fork-telemetry file whose only diff is the telemetry purge (incl. emptied try/rethrow shell)", () => {
		const entry = { path: "orchestrator.ts", mode: "fork-telemetry" }
		// Upstream: telemetry import + a captureEvent call inside a try/rethrow wrapper.
		const upstream = [
			'import { TelemetryService } from "@roo-code/telemetry"',
			"export function go(): void {",
			"\ttry {",
			"\t\tdoWork()",
			"\t} catch (error) {",
			"\t\tTelemetryService.instance.captureEvent(EVT, {",
			"\t\t\terror: String(error),",
			"\t\t})",
			"\t\tthrow error",
			"\t}",
			"}",
		].join("\n")
		// Fork: same file after the v3.88.0 telemetry purge (wrapper deleted, body dedented).
		const fork = ["export function go(): void {", "\tdoWork()", "}"].join("\n")
		const verdict = compareCoreFile(entry, fork, upstream)
		assert.equal(verdict.ok, true)
		assert.equal(verdict.status, "allowed-diff")
	})

	it("fails a fork-telemetry file that changed logic beyond the telemetry purge", () => {
		const entry = { path: "orchestrator.ts", mode: "fork-telemetry" }
		const upstream = 'import { TelemetryService } from "@roo-code/telemetry"\nconst a = 1\n'
		const fork = "const a = 2\nconst forkAdded = true\n"
		assert.equal(compareCoreFile(entry, fork, upstream).ok, false)
	})

	it("applies the same telemetry strip to upstream, so an upstream-side telemetry edit still counts as drift", () => {
		const entry = { path: "orchestrator.ts", mode: "fork-telemetry" }
		// Fork removed telemetry AND accidentally diverged a shared line.
		const upstream = "const shared = 1\nTelemetryService.instance.captureEvent(EVT)\n"
		const fork = "const shared = 2\n"
		assert.equal(compareCoreFile(entry, fork, upstream).ok, false)
	})

	it("composes branding + fork-telemetry modes via entry.modes", () => {
		const entry = { path: "embedders/bedrock.ts", modes: ["branding", "fork-telemetry"] }
		const upstream = [
			'import { TelemetryService } from "@roo-code/telemetry"',
			"\tuserAgentAppId: `ZooCode#${Package.version}`",
			"\tTelemetryService.instance.captureEvent(EVT, {",
			"\t\tattempt: attempts + 1,",
			"\t})",
		].join("\n")
		const fork = "\tuserAgentAppId: `RooPlus#${Package.version}`"
		assert.equal(compareCoreFile(entry, fork, upstream).ok, true)
	})
})

describe("stripForkTelemetry", () => {
	it("removes telemetry imports from @roo-code/telemetry and @roo-code/types", () => {
		const input = [
			'import { TelemetryService } from "@roo-code/telemetry"',
			'import { TelemetryEventName } from "@roo-code/types"',
			"import { t } from \"../../i18n\"",
		].join("\n")
		const out = stripForkTelemetry(input)
		assert.ok(!out.includes("TelemetryService"))
		assert.ok(!out.includes("TelemetryEventName"))
		assert.ok(out.includes('import { t } from "../../i18n"'))
	})

	it("removes whole multi-line captureEvent statements and telemetry-only comments", () => {
		const input = [
			"function f() {",
			"\t// Capture telemetry for validation errors",
			"\tTelemetryService.instance.captureEvent(TelemetryEventName.CODE_INDEX_ERROR, {",
			"\t\terror: error instanceof Error ? error.message : String(error),",
			"\t})",
			"\treturn 1",
			"}",
		].join("\n")
		const out = stripForkTelemetry(input)
		assert.ok(!/captureEvent|CODE_INDEX_ERROR|Capture telemetry/.test(out))
		assert.ok(out.includes("return 1"))
	})

	it("keeps a non-empty catch body untouched (only emptied rethrow shells are unwrapped)", () => {
		const input = ["try {", "\ta()", "} catch (error) {", "\tconsole.error(error)", "\tthrow error", "}"].join("\n")
		const out = stripForkTelemetry(input)
		assert.ok(out.includes("try {"))
		assert.ok(out.includes("console.error(error)"))
	})
})

describe("getNormalizer (modes)", () => {
	it("selects the telemetry stripper for mode:fork-telemetry", () => {
		assert.equal(getNormalizer({ mode: "fork-telemetry" }), stripForkTelemetry)
	})
	it("composes normalizers for entry.modes in order", () => {
		const composed = getNormalizer({ modes: ["branding", "fork-telemetry"] })
		const upstream = 'import { TelemetryService } from "@roo-code/telemetry"\n\tuserAgentAppId: `ZooCode#x`'
		const fork = "\tuserAgentAppId: `RooPlus#x`"
		assert.equal(composed(fork), composed(upstream))
	})
})

describe("assessAll / failedPaths", () => {
	const entries = [
		{ path: "a.ts" },
		{ path: "b.ts" },
		{ path: "bedrock.ts", mode: "branding" },
	]

	it("reports only the drifted file path on failure", () => {
		const forkContents = { "a.ts": "same", "b.ts": "fork drift", "bedrock.ts": "RooPlus brand" }
		const upstreamContents = { "a.ts": "same", "b.ts": "upstream original", "bedrock.ts": "ZooCode brand" }
		const results = assessAll(entries, forkContents, upstreamContents)
		assert.deepEqual(failedPaths(results), ["b.ts"])
		assert.equal(results[1].verdict.status, "drift")
	})

	it("returns no failures when every core file is aligned", () => {
		const forkContents = { "a.ts": "same", "b.ts": "same", "bedrock.ts": "RooPlus brand" }
		const upstreamContents = { "a.ts": "same", "b.ts": "same", "bedrock.ts": "ZooCode brand" }
		assert.deepEqual(failedPaths(assessAll(entries, forkContents, upstreamContents)), [])
	})
})

describe("decideRunMode (network-unavailable → skip, not fail)", () => {
	it("runs offline against a local upstream/main ref", () => {
		assert.deepEqual(decideRunMode({ localRef: true, fetchSucceeded: false, strict: false }), {
			run: true,
			fail: false,
		})
	})

	it("runs when the fetch succeeded", () => {
		assert.deepEqual(decideRunMode({ localRef: false, fetchSucceeded: true, strict: false }), {
			run: true,
			fail: false,
		})
	})

	it("skips (never fails CI) when upstream is unavailable by default", () => {
		assert.deepEqual(decideRunMode({ localRef: false, fetchSucceeded: false, strict: false }), {
			run: false,
			fail: false,
		})
	})

	it("fails only when upstream is unavailable AND --strict is set", () => {
		assert.deepEqual(decideRunMode({ localRef: false, fetchSucceeded: false, strict: true }), {
			run: false,
			fail: true,
		})
	})
})
