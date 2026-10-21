/**
 * vsix-audit-oversized.spec.mjs
 *
 * Unit tests for the oversized-file YARA-X stage added to scripts/vsix-audit.mjs
 * (review defect 2: `@trailofbits/vsix-audit@0.3.0` skips every file larger than
 * 10 MiB for its YARA stage, so `dist/extension.js` was never YARA-scanned while
 * the report said `coverage: full`).
 *
 * These tests are FAST, OFFLINE and need neither the real VSIX nor the real
 * `yr` binary: the archive is generated in-process (a minimal ZIP writer) and
 * `runYr` is injected. What is exercised here is the part that could be wrong
 * silently — enumeration, thresholding, rule-metadata mapping, the finding
 * shape, and the accounting that makes `coverage: full` truthful.
 *
 * Run from the repo root with: node --test scripts/vsix-audit-oversized.spec.mjs
 */

import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { deflateRawSync } from "node:zlib"

import {
	OVERSIZED_STAGE,
	assessAudit,
	buildYaraFinding,
	deriveYaraSeverity,
	discoverYaraRulesDir,
	findOversizedEntries,
	formatCoverageLine,
	formatOversizedReport,
	normalizeOversizedReport,
	parseRuleMetadata,
	parseScan,
	parseYaraOutput,
	readZipDirectory,
	readZipEntryContents,
	runOversizedStage,
} from "./vsix-audit.mjs"

/* ------------------------------------------------------------------ *
 * Minimal ZIP writer (mirror image of the reader under test)
 * ------------------------------------------------------------------ */

const CRC_TABLE = (() => {
	const table = new Uint32Array(256)
	for (let i = 0; i < 256; i++) {
		let c = i
		for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
		table[i] = c >>> 0
	}
	return table
})()

function crc32(buffer) {
	let c = 0xffffffff
	for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
	return (c ^ 0xffffffff) >>> 0
}

/** @param {{name: string, data: Buffer}[]} files */
function buildZip(files) {
	const localParts = []
	const centralParts = []
	let offset = 0
	for (const file of files) {
		const name = Buffer.from(file.name, "utf8")
		const compressed = deflateRawSync(file.data)
		const crc = crc32(file.data)

		const local = Buffer.alloc(30)
		local.writeUInt32LE(0x04034b50, 0)
		local.writeUInt16LE(20, 4)
		local.writeUInt16LE(8, 8) // deflate
		local.writeUInt32LE(crc, 14)
		local.writeUInt32LE(compressed.length, 18)
		local.writeUInt32LE(file.data.length, 22)
		local.writeUInt16LE(name.length, 26)
		localParts.push(local, name, compressed)

		const central = Buffer.alloc(46)
		central.writeUInt32LE(0x02014b50, 0)
		central.writeUInt16LE(20, 4)
		central.writeUInt16LE(20, 6)
		central.writeUInt16LE(8, 10) // deflate
		central.writeUInt32LE(crc, 16)
		central.writeUInt32LE(compressed.length, 20)
		central.writeUInt32LE(file.data.length, 24)
		central.writeUInt16LE(name.length, 28)
		central.writeUInt32LE(offset, 42)
		centralParts.push(central, name)

		offset += local.length + name.length + compressed.length
	}

	const centralDirectory = Buffer.concat(centralParts)
	const eocd = Buffer.alloc(22)
	eocd.writeUInt32LE(0x06054b50, 0)
	eocd.writeUInt16LE(files.length, 8)
	eocd.writeUInt16LE(files.length, 10)
	eocd.writeUInt32LE(centralDirectory.length, 12)
	eocd.writeUInt32LE(offset, 16)

	return Buffer.concat([...localParts, centralDirectory, eocd])
}

const YARA_RULE_SOURCE = `rule TEST_SUSP_RULE_Jan25 {
  meta:
    description = "test rule for the mapping"
    severity    = "high"
    score       = 80
  strings:
    $a = "needle"
  condition:
    $a
}

rule TEST_NO_META_RULE_Jan25 {
  strings:
    $a = "needle"
  condition:
    $a
}
`

/** Creates a temp dir with a rule set + a VSIX holding one oversized file. */
async function makeFixture({ threshold = 100, oversizedBytes = 4096 } = {}) {
	const dir = await mkdtemp(path.join(os.tmpdir(), "vsix-oversized-spec-"))
	const rulesDir = path.join(dir, "rules")
	await mkdir(rulesDir, { recursive: true })
	await writeFile(path.join(rulesDir, "test_rules.yar"), YARA_RULE_SOURCE, "utf8")

	const vsixPath = path.join(dir, "fake.vsix")
	const zip = buildZip([
		{ name: "extension/dist/extension.js", data: Buffer.alloc(oversizedBytes, 0x2f) },
		{ name: "extension/package.json", data: Buffer.from("{}", "utf8") },
	])
	await writeFile(vsixPath, zip)
	return { dir, rulesDir, vsixPath, threshold }
}

/** Injected `yr` double: records invocations, returns canned output. */
function fakeYr({ version = "yara-x-cli 1.20.0\n", matches = ["TEST_SUSP_RULE_Jan25"], code = 0, versionCode = 0 } = {}) {
	const calls = []
	const runYr = async (args) => {
		calls.push(args)
		if (args[0] === "--version") {
			if (versionCode !== 0) return { stdout: "", stderr: "command not found", code: versionCode }
			return { stdout: version, stderr: "", code: 0 }
		}
		if (code !== 0) return { stdout: "", stderr: "boom", code }
		return { stdout: matches.map((rule) => `${rule} ${args[args.length - 1]}`).join("\n") + "\n", stderr: "", code: 0 }
	}
	return { runYr, calls }
}

/* ------------------------------------------------------------------ *
 * Pure helpers
 * ------------------------------------------------------------------ */

describe("VSIX enumeration (ZIP central directory)", () => {
	it("round-trips entry names, sizes and contents", () => {
		const payload = Buffer.from("hello oversized world", "utf8")
		const buffer = buildZip([
			{ name: "extension/dist/extension.js", data: payload },
			{ name: "extension/package.json", data: Buffer.from("{}", "utf8") },
		])
		const entries = readZipDirectory(buffer)
		assert.deepEqual(
			entries.map((e) => e.name),
			["extension/dist/extension.js", "extension/package.json"],
		)
		assert.equal(entries[0].size, payload.length)
		assert.deepEqual(readZipEntryContents(buffer, entries[0]), payload)
	})

	it("rejects a non-ZIP buffer instead of returning an empty list", () => {
		assert.throws(() => readZipDirectory(Buffer.from("definitely not a zip file at all")), /not a ZIP archive/)
	})

	it("enumerates ONLY files strictly above the threshold, largest first", () => {
		const buffer = buildZip([
			{ name: "extension/dist/small.js", data: Buffer.alloc(10, 0x41) },
			{ name: "extension/dist/extension.js", data: Buffer.alloc(500, 0x42) },
			{ name: "extension/dist/tree-sitter-x.wasm", data: Buffer.alloc(900, 0x43) },
		])
		const oversized = findOversizedEntries(readZipDirectory(buffer), 100)
		assert.deepEqual(
			oversized.map((o) => o.file),
			["dist/tree-sitter-x.wasm", "dist/extension.js"],
		)
		assert.equal(oversized[0].size, 900)
	})

	it("treats the threshold as exclusive, so a file of exactly 10 MiB is not oversized", () => {
		const buffer = buildZip([{ name: "extension/dist/exact.js", data: Buffer.alloc(64, 0x41) }])
		assert.equal(findOversizedEntries(readZipDirectory(buffer), 64).length, 0)
		assert.equal(findOversizedEntries(readZipDirectory(buffer), 63).length, 1)
	})
})

describe("YARA-X output + rule metadata mapping (same shape as stage 1)", () => {
	it("parses `rule_name path` lines and ignores blanks", () => {
		const parsed = parseYaraOutput("\nA_RULE  /tmp/x/dist/extension.js\nB_RULE /tmp/x/dist/extension.js\n\n")
		assert.deepEqual(parsed, [
			{ rule: "A_RULE", file: "/tmp/x/dist/extension.js" },
			{ rule: "B_RULE", file: "/tmp/x/dist/extension.js" },
		])
		assert.deepEqual(parseYaraOutput(""), [])
	})

	it("reads severity and description out of the rule files", () => {
		const meta = parseRuleMetadata([{ source: YARA_RULE_SOURCE, ruleFile: "test_rules.yar" }])
		assert.equal(meta.get("TEST_SUSP_RULE_Jan25").severity, "high")
		assert.equal(meta.get("TEST_SUSP_RULE_Jan25").ruleFile, "test_rules.yar")
		assert.equal(meta.get("TEST_SUSP_RULE_Jan25").description, "test rule for the mapping")
		// A rule with no `meta:` block is not mapped at all — exactly like the
		// tool, which then falls back to the name-prefix severity.
		assert.equal(meta.has("TEST_NO_META_RULE_Jan25"), false)
	})

	it("falls back to the tool's documented name-prefix severities", () => {
		assert.equal(deriveYaraSeverity("TEST_SUSP_RULE_Jan25", { severity: "low" }), "low")
		assert.equal(deriveYaraSeverity("MAL_JS_GlassWorm_Unicode_Stealth_Jan25", null), "critical")
		assert.equal(deriveYaraSeverity("STEALER_JS_X_Jan25", null), "high")
		assert.equal(deriveYaraSeverity("RAT_JS_X_Jan25", null), "high")
		assert.equal(deriveYaraSeverity("C2_JS_X_Jan25", null), "high")
		assert.equal(deriveYaraSeverity("SUSP_JS_X_Jan25", null), "medium")
		assert.equal(deriveYaraSeverity("SOMETHING_ELSE", null), "medium")
	})

	it("maps a match into the tool's finding shape so register triage applies unchanged", () => {
		const finding = buildYaraFinding({
			rule: "TEST_SUSP_RULE_Jan25",
			file: "dist/extension.js",
			ruleFile: "test_rules.yar",
			meta: { severity: "high" },
		})
		assert.equal(finding.id, "YARA_TEST_SUSP_RULE_Jan25")
		assert.equal(finding.title, "YARA rule match: TEST_SUSP_RULE_Jan25")
		assert.equal(finding.severity, "high")
		assert.equal(finding.category, "yara")
		assert.deepEqual(finding.location, { file: "dist/extension.js" })
		assert.equal(finding.metadata.rule, "TEST_SUSP_RULE_Jan25")
		assert.equal(finding.metadata.ruleFile, "test_rules.yar")
		assert.equal(finding.metadata.fileType, ".js")
		assert.equal(finding.metadata.stage, OVERSIZED_STAGE)
		assert.match(finding.description, /matched this file/)
	})
})

describe("discoverYaraRulesDir", () => {
	it("honours VSIX_AUDIT_ZOO_PATH like the tool itself", async () => {
		const dir = await mkdtemp(path.join(os.tmpdir(), "vsix-zoo-"))
		try {
			const rules = path.join(dir, "signatures", "yara")
			await mkdir(rules, { recursive: true })
			assert.equal(discoverYaraRulesDir({ env: { VSIX_AUDIT_ZOO_PATH: dir }, toolRoots: [] }), rules)
		} finally {
			await rm(dir, { recursive: true, force: true })
		}
	})

	it("returns null (a coverage gap, not a pass) when no rule set is present", () => {
		assert.equal(discoverYaraRulesDir({ env: {}, toolRoots: ["/nonexistent/root"] }), null)
	})
})

/* ------------------------------------------------------------------ *
 * Stage execution (injected yr, generated archive)
 * ------------------------------------------------------------------ */

describe("runOversizedStage", () => {
	it("scans every oversized file and maps matches into findings", async () => {
		const fixture = await makeFixture()
		try {
			const { runYr, calls } = fakeYr()
			const report = await runOversizedStage({
				vsixPath: fixture.vsixPath,
				threshold: fixture.threshold,
				rulesDir: fixture.rulesDir,
				runYr,
			})
			assert.equal(report.ran, true)
			assert.equal(report.available, true)
			assert.equal(report.yaraVersion, "yara-x-cli 1.20.0")
			assert.deepEqual(
				report.oversized.map((f) => f.file),
				["dist/extension.js"],
			)
			assert.deepEqual(report.scanned, ["dist/extension.js"])
			assert.deepEqual(report.failed, [])
			assert.equal(report.findings.length, 1)
			assert.equal(report.findings[0].id, "YARA_TEST_SUSP_RULE_Jan25")
			assert.equal(report.findings[0].severity, "high")
			assert.equal(report.findings[0].location.file, "dist/extension.js")
			// One --version probe + one scan of the oversized file only.
			assert.equal(calls.filter((c) => c[0] === "scan").length, 1)
			assert.deepEqual(normalizeOversizedReport(report).gaps, [])
		} finally {
			await rm(fixture.dir, { recursive: true, force: true })
		}
	})

	it("reports a MISSING yr as unavailable instead of skipping silently", async () => {
		const fixture = await makeFixture()
		try {
			const { runYr } = fakeYr({ versionCode: -1 })
			const report = await runOversizedStage({
				vsixPath: fixture.vsixPath,
				threshold: fixture.threshold,
				rulesDir: fixture.rulesDir,
				runYr,
			})
			assert.equal(report.available, false)
			assert.match(report.unavailableReason, /not available/)
			assert.deepEqual(report.scanned, [])
			const gaps = normalizeOversizedReport(report).gaps
			assert.equal(gaps.length, 1)
			assert.match(gaps[0], /oversized-file stage unavailable/)
			// The oversized list is still reported: the gap is never invisible.
			assert.deepEqual(
				report.oversized.map((f) => f.file),
				["dist/extension.js"],
			)
		} finally {
			await rm(fixture.dir, { recursive: true, force: true })
		}
	})

	it("reports a missing rule set as unavailable", async () => {
		const fixture = await makeFixture()
		try {
			const { runYr } = fakeYr()
			const report = await runOversizedStage({
				vsixPath: fixture.vsixPath,
				threshold: fixture.threshold,
				rulesDir: null,
				toolRoots: ["/nonexistent/root"],
				runYr,
			})
			assert.equal(report.available, false)
			assert.match(report.unavailableReason, /rule set not found/)
		} finally {
			await rm(fixture.dir, { recursive: true, force: true })
		}
	})

	it("records a failed scan per file and does not count the file as scanned", async () => {
		const fixture = await makeFixture()
		try {
			const { runYr } = fakeYr({ code: 3 })
			const report = await runOversizedStage({
				vsixPath: fixture.vsixPath,
				threshold: fixture.threshold,
				rulesDir: fixture.rulesDir,
				runYr,
			})
			assert.equal(report.available, true)
			assert.deepEqual(report.scanned, [])
			assert.equal(report.failed.length, 1)
			assert.match(report.failed[0].reason, /yr scan exited 3/)
			const gaps = normalizeOversizedReport(report).gaps
			assert.equal(gaps.length, 1)
			assert.match(gaps[0], /oversized file scan failed: dist\/extension\.js/)
		} finally {
			await rm(fixture.dir, { recursive: true, force: true })
		}
	})

	it("is vacuously complete when nothing exceeds the threshold (yr not required)", async () => {
		const fixture = await makeFixture({ threshold: 1024 * 1024 * 1024 })
		try {
			const { runYr, calls } = fakeYr()
			const report = await runOversizedStage({
				vsixPath: fixture.vsixPath,
				threshold: fixture.threshold,
				rulesDir: fixture.rulesDir,
				runYr,
			})
			assert.equal(report.available, true)
			assert.deepEqual(report.oversized, [])
			assert.deepEqual(calls, [], "no yr invocation is needed when there is nothing to scan")
			assert.deepEqual(normalizeOversizedReport(report).gaps, [])
		} finally {
			await rm(fixture.dir, { recursive: true, force: true })
		}
	})

	it("reports an unreadable VSIX as unavailable rather than throwing", async () => {
		const report = await runOversizedStage({
			vsixPath: "/nonexistent/does-not-exist.vsix",
			rulesDir: "/nonexistent",
			runYr: fakeYr().runYr,
		})
		assert.equal(report.ran, true)
		assert.equal(report.available, false)
		assert.match(report.unavailableReason, /cannot read VSIX/)
	})

	it("formats the oversized-file list so the gap is visible in the report", () => {
		const text = formatOversizedReport({
			oversized: ["dist/extension.js", "dist/other.js"],
			scanned: ["dist/extension.js"],
			failed: [{ file: "dist/other.js", reason: "boom" }],
			findings: [{ id: "YARA_X", severity: "high", location: { file: "dist/extension.js" } }],
		})
		assert.match(text, /oversized files \(> 10 MiB, never YARA-scanned by stage 1\): 2/)
		assert.match(text, /dist\/extension\.js — YARA-X scanned, 1 rule match\(es\)/)
		assert.match(text, /YARA_X \[high\]/)
		assert.match(text, /dist\/other\.js — NOT SCANNED \(boom\)/)
	})
})

describe("end-to-end gate decision over both stages", () => {
	const scan = parseScan({ metadata: { coverage: { degraded: false, unavailableModules: [], warnings: [] } }, findings: [] })

	it("exits 0 with full coverage only when the stage scanned the oversized file", async () => {
		const fixture = await makeFixture()
		try {
			const report = await runOversizedStage({
				vsixPath: fixture.vsixPath,
				threshold: fixture.threshold,
				rulesDir: fixture.rulesDir,
				runYr: fakeYr().runYr,
			})
			const register = {
				entries: [
					{
						rule: "YARA_TEST_SUSP_RULE_Jan25",
						file: "dist/extension.js",
						severity: "high",
						count: 1,
						verdict: "by-design",
						reason: "test fixture entry",
					},
				],
			}
			const decision = assessAudit(scan, register, { publish: true, oversized: report })
			assert.equal(decision.exitCode, 0, JSON.stringify(decision.real, null, 2))
			assert.equal(formatCoverageLine(scan, decision), "coverage: full")

			// Same artefact, but the rule was never registered -> fail closed.
			const unregistered = assessAudit(scan, { entries: [] }, { publish: true, oversized: report })
			assert.equal(unregistered.exitCode, 1)
			assert.equal(unregistered.real.length, 1)
		} finally {
			await rm(fixture.dir, { recursive: true, force: true })
		}
	})

	it("exits 2 in a publish context when yr is absent, naming the gap", async () => {
		const fixture = await makeFixture()
		try {
			const report = await runOversizedStage({
				vsixPath: fixture.vsixPath,
				threshold: fixture.threshold,
				rulesDir: fixture.rulesDir,
				runYr: fakeYr({ versionCode: -1 }).runYr,
			})
			const decision = assessAudit(scan, { entries: [] }, { publish: true, oversized: report })
			assert.equal(decision.exitCode, 2)
			assert.equal(decision.degraded, true)
			assert.match(formatCoverageLine(scan, decision), /^coverage: DEGRADED \(oversized-file stage unavailable/)
		} finally {
			await rm(fixture.dir, { recursive: true, force: true })
		}
	})

	it("the shipped rule set is readable and carries the rules the register names", async () => {
		// Guards against a register entry for a rule the vendored rule set no
		// longer defines (a renamed upstream rule would silently stop matching).
		const rulesDir = discoverYaraRulesDir({ env: {}, toolRoots: [] }) ?? discoverYaraRulesDir()
		if (!rulesDir) {
			// The tool is not installed on this host; the stage reports that as a gap.
			return
		}
		const { loadRuleMetadata } = await import("./vsix-audit.mjs")
		const meta = await loadRuleMetadata(rulesDir)
		assert.ok(meta.size > 50, `expected a substantial rule set, saw ${meta.size}`)
		assert.equal(meta.get("STEALER_JS_Credential_File_Exfil_Jan25").severity, "critical")
		assert.equal(meta.get("LOADER_JS_Download_Write_Execute_Jan25").severity, "critical")
		assert.equal(meta.get("SUSP_JS_WebAssembly_Remote_Jan25").severity, "low")
	})

	it("the oversized stage is recorded on the finding without changing the id", async () => {
		const { loadRuleMetadata } = await import("./vsix-audit.mjs")
		const rulesDir = discoverYaraRulesDir()
		if (!rulesDir) return
		const meta = await loadRuleMetadata(rulesDir)
		const finding = buildYaraFinding({
			rule: "SUSP_PS_Encoded_Command_Jan25",
			file: "dist/extension.js",
			ruleFile: "powershell_attacks.yar",
			meta: meta.get("SUSP_PS_Encoded_Command_Jan25"),
		})
		assert.equal(finding.id, "YARA_SUSP_PS_Encoded_Command_Jan25")
		assert.equal(finding.severity, "high")
		assert.equal(finding.metadata.stage, "oversized-yara")
	})

	it("keeps the real register honest: every dist/extension.js YARA entry covers the rule it names", async () => {
		const registerPath = new URL("./vsix-audit-register.json", import.meta.url)
		const register = JSON.parse(await readFile(registerPath, "utf8"))
		const extensionEntries = register.entries.filter((e) => e.file === "dist/extension.js" && e.rule.startsWith("YARA_"))
		assert.ok(extensionEntries.length >= 19, `expected the 19 oversized-stage entries, saw ${extensionEntries.length}`)
		for (const entry of extensionEntries) {
			assert.equal(entry.severity in { low: 1, medium: 1, high: 1, critical: 1 }, true)
			assert.match(entry.reason, /Oversized-file stage: the tool never YARA-scanned this file\./)
		}
	})
})
