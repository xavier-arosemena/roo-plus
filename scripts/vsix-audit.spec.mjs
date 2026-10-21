/**
 * vsix-audit.spec.mjs
 *
 * Unit tests for the pure triage / gate logic in scripts/vsix-audit.mjs
 * (DEBT #23). These tests DO NOT require the real @trailofbits/vsix-audit tool
 * or a real VSIX: they inject fake scan results (as JSON objects shaped like
 * the tool's `--output json`) and exercise parseScan / yaraUnavailable /
 * classifyFindings / assessAudit / loadRegister.
 *
 * Run from the repo root with: node --test scripts/vsix-audit.spec.mjs
 * (scripts/ has no vitest runner, so node:test built into Node 22 is used.)
 */

import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import os from "node:os"

import {
	DEFAULT_TOOL_VERSION,
	assessAudit,
	classifyFindings,
	entryCoversFile,
	formatCoverageLine,
	hasBundleHash,
	loadRegister,
	normalizeFileKey,
	normalizeOversizedReport,
	parseScan,
	validateRegister,
	yaraUnavailable,
} from "./vsix-audit.mjs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REGISTER = path.join(__dirname, "vsix-audit-register.json")

/**
 * A stage-2 report that says "ran, YARA-X present, nothing oversized". The
 * coverage contract requires it: omitting the report means the stage never ran,
 * which is a gap (see normalizeOversizedReport).
 */
const FULL_STAGE = { ran: true, available: true, oversized: [], scanned: [], failed: [], findings: [] }

/** Convenience: assess with a full-coverage oversized report unless overridden. */
function assess(scan, register, opts = {}) {
	return assessAudit(scan, register, { oversized: FULL_STAGE, ...opts })
}

/** Builds a fake scan object shaped like vsix-audit `--output json`. */
function fakeScan({ findings = [], degraded = false, unavailableModules = [] } = {}) {
	return {
		extension: { id: "xavier-arosemena.roo-plus", name: "roo-plus", publisher: "xavier-arosemena", version: "3.87.3" },
		metadata: {
			scannedAt: "2026-09-08T00:00:00.000Z",
			coverage: { degraded, warnings: degraded ? ["coverage warning"] : [], unavailableModules },
		},
		findings,
	}
}

const BY_DESIGN_FINDING = {
	id: "CRYPTO_WALLET_DETECTED",
	severity: "high",
	title: "Wallet address",
	description: "d",
	location: { file: "dist/workers/countTokens.js" },
}

describe("parseScan", () => {
	it("normalizes coverage + findings from a raw scan object", () => {
		const s = parseScan(fakeScan({ findings: [BY_DESIGN_FINDING], degraded: true, unavailableModules: ["yara"] }))
		assert.equal(s.extension.publisher, "xavier-arosemena")
		assert.equal(s.coverage.degraded, true)
		assert.deepEqual(s.coverage.unavailableModules, ["yara"])
		assert.equal(s.findings.length, 1)
	})

	it("accepts a JSON string and parses it", () => {
		const s = parseScan(JSON.stringify(fakeScan({ findings: [BY_DESIGN_FINDING] })))
		assert.equal(s.findings.length, 1)
	})

	it("throws on malformed output", () => {
		assert.throws(() => parseScan("not json"))
		assert.throws(() => parseScan({}))
	})
})

describe("yaraUnavailable", () => {
	it("is true when the scanner reports the yara module unavailable", () => {
		assert.equal(yaraUnavailable(fakeScan({ unavailableModules: ["yara"] })), true)
	})
	it("is true when a YARA_NOT_INSTALLED finding is emitted", () => {
		const s = fakeScan({ findings: [{ id: "YARA_NOT_INSTALLED", severity: "low" }] })
		assert.equal(yaraUnavailable(s), true)
	})
	it("is false on a full-coverage scan", () => {
		assert.equal(yaraUnavailable(fakeScan()), false)
	})
})

describe("classifyFindings", () => {
	const register = {
		entries: [
			{ rule: "CRYPTO_WALLET_DETECTED", file: "dist/workers/countTokens.js", severity: "high", count: 46, verdict: "by-design" },
			{ rule: "CRYPTO_WALLET_DETECTED", file: "dist/extension.js", severity: "high", count: 46, verdict: "by-design" },
			{ rule: "AST_FUNCTION_CONSTRUCTOR", file: "dist/extension.js", severity: "high", count: 25, verdict: "by-design" },
		],
	}

	it("classifies registered findings within the recorded count as by-design", () => {
		const findings = [
			{ id: "CRYPTO_WALLET_DETECTED", severity: "high", location: { file: "dist/workers/countTokens.js" } },
			{ id: "CRYPTO_WALLET_DETECTED", severity: "high", location: { file: "dist/workers/countTokens.js" } },
		]
		const { byDesign, real } = classifyFindings(findings, register)
		assert.equal(byDesign.length, 2)
		assert.equal(real.length, 0)
	})

	it("flags an unregistered rule/file as a real finding", () => {
		const findings = [{ id: "YARA_C2_JS_Telegram_Bot_Jan25", severity: "high", location: { file: "webview-ui/build/assets/index.js" } }]
		const { byDesign, real } = classifyFindings(findings, register)
		assert.equal(byDesign.length, 0)
		assert.equal(real.length, 1)
		assert.match(real[0].why, /unregistered by-design entry/)
	})

	it("flags a severity escalation above the registered cap as a real finding", () => {
		// register caps CRYPTO_WALLET_DETECTED@countTokens at high; report critical.
		const findings = [{ id: "CRYPTO_WALLET_DETECTED", severity: "critical", location: { file: "dist/workers/countTokens.js" } }]
		const { real } = classifyFindings(findings, register)
		assert.equal(real.length, 1)
		assert.match(real[0].why, /severity critical exceeds/)
	})

	it("flags a count escalation beyond the recorded baseline", () => {
		// 47 findings when the register records 46 -> 1 excess is real.
		const findings = Array.from({ length: 47 }, () => ({
			id: "CRYPTO_WALLET_DETECTED",
			severity: "high",
			location: { file: "dist/workers/countTokens.js" },
		}))
		const { byDesign, real } = classifyFindings(findings, register)
		assert.equal(byDesign.length, 46)
		assert.equal(real.length, 1)
		assert.match(real[0].why, /exceeds registered baseline 46/)
	})

	it("ignores YARA_NOT_INSTALLED coverage signals (not a code finding)", () => {
		const findings = [{ id: "YARA_NOT_INSTALLED", severity: "low", location: null }]
		const { byDesign, real } = classifyFindings(findings, register)
		assert.equal(byDesign.length, 0)
		assert.equal(real.length, 0)
	})

	it("handles findings with no location file", () => {
		const findings = [{ id: "SOME_RULE", severity: "high", location: null }]
		const { real } = classifyFindings(findings, register)
		assert.equal(real.length, 1)
	})
})

describe("assessAudit", () => {
	const register = {
		entries: [
			{ rule: "CRYPTO_WALLET_DETECTED", file: "dist/extension.js", severity: "high", count: 46, verdict: "by-design" },
		],
	}
	const registeredFinding = { id: "CRYPTO_WALLET_DETECTED", severity: "high", location: { file: "dist/extension.js" } }
	const unregisteredFinding = { id: "AST_EVAL_DYNAMIC", severity: "high", location: { file: "dist/extension.js" } }

	it("returns PASS (exit 0) on full coverage with all findings registered", () => {
		const d = assess(fakeScan({ findings: [registeredFinding] }), register, { publish: true })
		assert.equal(d.exitCode, 0)
		assert.equal(d.real.length, 0)
	})

	it("returns REAL_FINDINGS (exit 1) when a finding is unregistered", () => {
		const d = assess(fakeScan({ findings: [registeredFinding, unregisteredFinding] }), register, { publish: true })
		assert.equal(d.exitCode, 1)
		assert.equal(d.real.length, 1)
	})

	it("fails closed on degraded coverage in publish context (exit 2)", () => {
		const d = assess(fakeScan({ findings: [registeredFinding], degraded: true, unavailableModules: ["yara"] }), register, {
			publish: true,
		})
		assert.equal(d.exitCode, 2)
		assert.equal(d.yaraMissing, true)
		assert.equal(d.degraded, true)
	})

	it("fails closed on degraded coverage even with zero findings in publish context", () => {
		const d = assess(fakeScan({ degraded: true, unavailableModules: ["yara"] }), register, { publish: true })
		assert.equal(d.exitCode, 2)
	})

	it("non-publish degraded scan without --allow-degraded still fails closed (exit 2)", () => {
		const d = assess(fakeScan({ findings: [registeredFinding], degraded: true, unavailableModules: ["yara"] }), register, {})
		assert.equal(d.exitCode, 2)
	})

	it("non-publish degraded scan with --allow-degraded inspects and passes when clean", () => {
		const d = assess(fakeScan({ findings: [registeredFinding], degraded: true, unavailableModules: ["yara"] }), register, {
			allowDegraded: true,
		})
		assert.equal(d.exitCode, 0)
		assert.equal(d.degraded, true)
	})

	it("non-publish degraded scan with --allow-degraded still fails on real findings", () => {
		const d = assess(
			fakeScan({ findings: [registeredFinding, unregisteredFinding], degraded: true, unavailableModules: ["yara"] }),
			register,
			{ allowDegraded: true },
		)
		assert.equal(d.exitCode, 1)
		assert.equal(d.real.length, 1)
	})
})

describe("loadRegister + register sanity", () => {
	it("loads the checked-in register and reports a full-coverage baseline", async () => {
		const register = await loadRegister(REGISTER)
		assert.equal(register.schemaVersion, 1)
		assert.equal(register.auditTool, "@trailofbits/vsix-audit")
		assert.equal(register.toolVersion, "0.3.0")
		assert.equal(register.scan.coverageDegraded, false)
		assert.ok(register.entries.length > 0, "register should have at least one entry")
	})

	it("every register entry carries a rule, file, severity, count and reason", async () => {
		const register = await loadRegister(REGISTER)
		for (const e of register.entries) {
			assert.ok(e.rule && e.file, `entry missing rule/file: ${JSON.stringify(e)}`)
			assert.ok(["low", "medium", "high", "critical"].includes(e.severity), `bad severity ${e.severity}`)
			assert.ok(Number.isInteger(e.count) && e.count > 0, `bad count ${e.count}`)
			assert.ok(e.verdict === "by-design", `unexpected verdict ${e.verdict}`)
			assert.ok(e.reason && e.reason.length > 0, `missing reason for ${e.rule}`)
		}
	})

	it("the register passes at its own recorded baseline counts (self-consistent)", async () => {
		// Rebuild a synthetic scan from the register's own baseline: for each
		// (rule, file, count) entry we emit `count` findings at the recorded
		// severity. If the register is self-consistent, triage must PASS — this is
		// the contract the gate relies on each release (register baseline == the
		// reviewed full-coverage scan of the artifact it was derived from).
		const register = await loadRegister(REGISTER)
		const findings = []
		for (const e of register.entries) {
			for (let i = 0; i < e.count; i++) {
				findings.push({ id: e.rule, severity: e.severity, location: { file: e.file } })
			}
		}
		const scan = parseScan({ metadata: { coverage: { degraded: false, unavailableModules: [], warnings: [] } }, findings })
		const decision = assess(scan, register, { publish: true })
		assert.equal(decision.exitCode, 0, JSON.stringify(decision.real.slice(0, 5), null, 2))
		assert.equal(decision.real.length, 0)
		assert.equal(decision.byDesign.length, findings.length)
	})

	it("any single extra finding beyond the baseline turns the gate red", async () => {
		// One finding of a rule/file that is NOT in the register must fail.
		const register = await loadRegister(REGISTER)
		const scan = parseScan({
			metadata: { coverage: { degraded: false, unavailableModules: [], warnings: [] } },
			findings: [{ id: "SOME_NEW_RULE_NOT_IN_REGISTER", severity: "high", location: { file: "dist/extension.js" } }],
		})
		const decision = assess(scan, register, { publish: true })
		assert.equal(decision.exitCode, 1)
		assert.equal(decision.real.length, 1)
	})

	it("pin version string is the documented @trailofbits/vsix-audit version", () => {
		assert.equal(DEFAULT_TOOL_VERSION, "@trailofbits/vsix-audit@0.3.0")
	})
})

describe("exit-code contract: coverage reporting must agree with the exit code (M5)", () => {
	// Regression for the observed asymmetry "exit 2 but coverage: full". The
	// scanner can report `metadata.coverage.degraded: false` while still emitting
	// a YARA_NOT_INSTALLED finding; yaraUnavailable() honours that finding, so the
	// gate exits 2 (degraded) — the report line must say the same thing.
	const yaraNotInstalled = { id: "YARA_NOT_INSTALLED", severity: "low", location: { file: "(tool)" } }

	it("exit 2 is reachable when YARA-X is missing even though metadata says full", () => {
		const scan = parseScan(fakeScan({ findings: [yaraNotInstalled], degraded: false }))
		const decision = assess(scan, { entries: [] }, { publish: true })
		assert.equal(decision.exitCode, 2)
		assert.equal(decision.degraded, true)
		assert.equal(decision.yaraMissing, true)
		// The exact bug: the old report printed "coverage: full" for this decision.
		assert.match(formatCoverageLine(scan, decision), /^coverage: DEGRADED \(YARA-X unavailable\)$/)
	})

	it("reports full coverage only when the decision is not degraded", () => {
		const scan = parseScan(fakeScan())
		const decision = assess(scan, { entries: [] }, { publish: true })
		assert.equal(decision.exitCode, 0)
		assert.equal(formatCoverageLine(scan, decision), "coverage: full")
	})

	it("names the unavailable modules when the scanner reports degradation", () => {
		const scan = parseScan(fakeScan({ degraded: true, unavailableModules: ["yara"] }))
		const decision = assess(scan, { entries: [] }, {})
		assert.equal(formatCoverageLine(scan, decision), "coverage: DEGRADED (YARA-X unavailable; unavailable modules: yara)")
	})

	it("exit 1 is reserved for real findings on a full-coverage scan", () => {
		const scan = parseScan(fakeScan({ findings: [{ id: "SOME_RULE", severity: "high", location: { file: "x.js" } }] }))
		const decision = assess(scan, { entries: [] }, { publish: true })
		assert.equal(decision.exitCode, 1)
		assert.equal(formatCoverageLine(scan, decision), "coverage: full")
	})
})

describe("stable entry identity: trailing content hash is normalised on both sides (defect 1)", () => {
	// A webview rebuild re-hashes chunk names. The register records the name that
	// was triaged; the scanner reports the new name. Both normalise to the same
	// family key, so a reviewed entry survives a rebuild instead of forcing the
	// maintainer to bulk re-accept a dozen rows.
	// A grouped chunk carries TWO volatile 8-char segments — the auto-generated
	// name segment (`~gdd5p7yb`) and the content hash (`-DHB4NmXe`) — and BOTH
	// change on a rebuild (observed between two builds of the same tree).
	const FAMILY =
		"webview-ui/build/assets/mermaid~stateDiagram-OKZ733FA~kanban-definition-27J2QSJJ~infoDiagram-6WML65LV~ganttDiagram-"
	const TRIAGED = `${FAMILY}~gdd5p7yb-DHB4NmXe.js`
	const RENAMED = `${FAMILY}~o9ekcsmq-C7gcPuI8.js`
	const RULE = "YARA_SUSP_JS_Decimal_Byte_Array_Jan25"

	const familyRegister = {
		entries: [
			{
				rule: RULE,
				file: TRIAGED,
				severity: "medium",
				count: 1,
				verdict: "by-design",
				reason: "jison parse table in the parser prologue at byte 0x15ca",
			},
		],
	}

	const finding = (file, severity = "medium") => ({ id: RULE, severity, location: { file } })

	it("normalises the trailing 8-char hash of a .js chunk and its .js.map", () => {
		assert.equal(normalizeFileKey(TRIAGED), `${FAMILY}-<hash>.js`)
		assert.equal(normalizeFileKey(`${TRIAGED}.map`), `${FAMILY}-<hash>.js.map`)
		assert.equal(normalizeFileKey(RENAMED), `${FAMILY}-<hash>.js`)
	})

	it("normalises both volatile segments of a grouped chunk, keeping the module list", () => {
		const single = "webview-ui/build/assets/mermaid-core-BsNHBjcS.js"
		assert.equal(normalizeFileKey(single), "webview-ui/build/assets/mermaid-core-<hash>.js")
		// Backslash-normalised too (a Windows scanner reports the same path shape).
		assert.equal(normalizeFileKey(TRIAGED.replace(/\//g, "\\")), `${FAMILY}-<hash>.js`)
	})

	it("hasBundleHash distinguishes hashed chunks from stable paths", () => {
		assert.equal(hasBundleHash(TRIAGED), true)
		assert.equal(hasBundleHash("changelog.md"), false)
		assert.equal(hasBundleHash("dist/extension.js"), false)
	})

	it("leaves non-hashed paths byte-identical, so exact matching stays the default", () => {
		for (const file of [
			"changelog.md",
			"dist/extension.js",
			"dist/workers/countTokens.js",
			"package.json",
			"assets/marketplace/modes.yml",
			"webview-ui/build/assets/index.js",
		]) {
			assert.equal(normalizeFileKey(file), file)
		}
		// Case is part of the identity: the pack ships `changelog.md`.
		assert.notEqual(normalizeFileKey("CHANGELOG.md"), normalizeFileKey("changelog.md"))
	})

	it("does not collapse two different mermaid families", () => {
		assert.notEqual(
			normalizeFileKey(TRIAGED),
			normalizeFileKey("webview-ui/build/assets/mermaid-core-D5Oyv01y.js"),
		)
	})

	it("entryCoversFile matches a renamed chunk in the same family only", () => {
		const entry = familyRegister.entries[0]
		assert.equal(entryCoversFile(entry, RENAMED), true)
		assert.equal(entryCoversFile(entry, TRIAGED), true)
		assert.equal(entryCoversFile(entry, "webview-ui/build/assets/mermaid-core-D5Oyv01y.js"), false)
		assert.equal(entryCoversFile(entry, "changelog.md"), false)
		assert.equal(entryCoversFile({}, RENAMED), false)
	})

	it("ACCEPTANCE: a chunk renamed to a different hash in the same family still passes", () => {
		const { byDesign, real } = classifyFindings([finding(RENAMED)], familyRegister)
		assert.equal(real.length, 0, JSON.stringify(real, null, 2))
		assert.equal(byDesign.length, 1)
		assert.equal(byDesign[0]._registered.rule, RULE)
	})

	it("ACCEPTANCE: the same renamed fixture fails when severity escalates to critical", () => {
		const { byDesign, real } = classifyFindings([finding(RENAMED, "critical")], familyRegister)
		assert.equal(byDesign.length, 0)
		assert.equal(real.length, 1)
		assert.match(real[0].why, /severity critical exceeds registered by-design cap medium/)
	})

	it("still fails when the count through a family exceeds the registered baseline", () => {
		const { byDesign, real } = classifyFindings([finding(RENAMED), finding(RENAMED)], familyRegister)
		assert.equal(byDesign.length, 1)
		assert.equal(real.length, 1)
		assert.match(real[0].why, /exceeds registered baseline 1/)
	})

	it("still fails on a rule that never appeared in the family", () => {
		const exotic = { id: "YARA_C2_JS_Telegram_Bot_Jan25", severity: "high", location: { file: RENAMED } }
		const { real } = classifyFindings([exotic], familyRegister)
		assert.equal(real.length, 1)
		assert.match(real[0].why, /unregistered by-design entry/)
	})

	it("combines a family strictly: the strictest severity cap wins", () => {
		const twoEntryRegister = {
			entries: [
				{ ...familyRegister.entries[0], file: TRIAGED, severity: "medium", count: 1 },
				{ ...familyRegister.entries[0], file: `${FAMILY}-BvfU1FdZ.js`, severity: "low", count: 2 },
			],
		}
		const { real } = classifyFindings([finding(RENAMED, "medium")], twoEntryRegister)
		assert.equal(real.length, 1, "medium must exceed the strictest (low) cap of the family")
		assert.match(real[0].why, /cap low/)
	})

	it("never widens a count cap through normalisation (largest per-file baseline wins)", () => {
		const twoEntryRegister = {
			entries: [
				{ ...familyRegister.entries[0], file: TRIAGED, count: 1 },
				{ ...familyRegister.entries[0], file: `${FAMILY}-BvfU1FdZ.js`, count: 2 },
			],
		}
		const one = classifyFindings([finding(RENAMED)], twoEntryRegister)
		assert.equal(one.real.length, 0, "one hit within the family baseline still passes")
		const three = classifyFindings([finding(RENAMED), finding(RENAMED), finding(RENAMED)], twoEntryRegister)
		assert.equal(three.real.length, 1)
		assert.match(three.real[0].why, /exceeds registered baseline 2/)
	})
})

describe("truthful coverage: stage 2 must have run, found YARA-X and scanned every oversized file", () => {
	const oversizedFile = "dist/extension.js"
	const stage = (over = {}) => ({
		ran: true,
		available: true,
		oversized: [{ file: oversizedFile, size: 15059325 }],
		scanned: [oversizedFile],
		failed: [],
		findings: [],
		...over,
	})

	it("full coverage requires the stage to have run", () => {
		const scan = parseScan(fakeScan())
		const withoutStage = assessAudit(scan, { entries: [] }, { publish: true })
		assert.equal(withoutStage.degraded, true)
		assert.equal(withoutStage.exitCode, 2)
		assert.match(formatCoverageLine(scan, withoutStage), /oversized-file stage not run/)
	})

	it("a missing yr is a degraded-coverage failure, never a silent skip", () => {
		const scan = parseScan(fakeScan())
		const decision = assess(scan, { entries: [] }, {
			publish: true,
			oversized: stage({ available: false, scanned: [], unavailableReason: "YARA-X not installed" }),
		})
		assert.equal(decision.exitCode, 2)
		assert.match(formatCoverageLine(scan, decision), /oversized-file stage unavailable: YARA-X not installed/)
	})

	it("a file that could not be scanned is reported by name", () => {
		const scan = parseScan(fakeScan())
		const decision = assess(scan, { entries: [] }, {
			publish: true,
			oversized: stage({ scanned: [], failed: [{ file: oversizedFile, reason: "boom" }] }),
		})
		assert.equal(decision.exitCode, 2)
		assert.match(formatCoverageLine(scan, decision), /oversized file scan failed: dist\/extension\.js/)
	})

	it("a file that was neither scanned nor failed is reported as unscanned", () => {
		const scan = parseScan(fakeScan())
		const decision = assess(scan, { entries: [] }, { publish: true, oversized: stage({ scanned: [] }) })
		assert.equal(decision.exitCode, 2)
		assert.match(formatCoverageLine(scan, decision), /oversized files not scanned: dist\/extension\.js/)
	})

	it("is full only when YARA-X was present and every oversized file was scanned", () => {
		const scan = parseScan(fakeScan())
		const decision = assess(scan, { entries: [] }, { publish: true, oversized: stage() })
		assert.equal(decision.exitCode, 0)
		assert.deepEqual(decision.oversizedGaps, [])
		assert.equal(formatCoverageLine(scan, decision), "coverage: full")
	})

	it("merges stage-2 findings into the same triage as stage 1", () => {
		const stageFinding = {
			id: "YARA_LOADER_JS_Download_Write_Execute_Jan25",
			severity: "critical",
			location: { file: oversizedFile },
			category: "yara",
		}
		const register = {
			entries: [
				{
					rule: "YARA_LOADER_JS_Download_Write_Execute_Jan25",
					file: oversizedFile,
					severity: "critical",
					count: 1,
					verdict: "by-design",
					reason: "declared, consent-gated binary acquisition path",
				},
			],
		}
		const decision = assess(parseScan(fakeScan()), register, {
			publish: true,
			oversized: stage({ findings: [stageFinding] }),
		})
		assert.equal(decision.exitCode, 0)
		assert.equal(decision.byDesign.length, 1)
		assert.equal(decision.findingsCount, 1)

		// The same finding UNREGISTERED must fail the run (fail-closed).
		const unregistered = assess(parseScan(fakeScan()), { entries: [] }, {
			publish: true,
			oversized: stage({ findings: [stageFinding] }),
		})
		assert.equal(unregistered.exitCode, 1)
		assert.equal(unregistered.real.length, 1)
	})

	it("normalizes a stage report without inventing coverage", () => {
		assert.deepEqual(normalizeOversizedReport(undefined).gaps, ["oversized-file stage not run"])
		assert.deepEqual(normalizeOversizedReport({ ran: true, available: true }).gaps, [])
		const withFiles = normalizeOversizedReport(stage({ scanned: [] }))
		assert.deepEqual(withFiles.scanned, [])
		assert.deepEqual(withFiles.oversized, [oversizedFile])
		assert.equal(withFiles.gaps.length, 1)
	})
})

describe("register schema validation (M9)", () => {
	const validEntry = {
		rule: "CRYPTO_WALLET_DETECTED",
		file: "dist/extension.js",
		severity: "high",
		count: 4,
		verdict: "by-design",
		reason: "base64 BPE-tokenizer vocabulary, knownMalicious:false",
	}

	it("accepts a fully triaged entry", () => {
		assert.deepEqual(validateRegister({ entries: [validEntry] }), [])
	})

	it("rejects a bare entry with no reason", () => {
		const { reason: _reason, ...bare } = validEntry
		const problems = validateRegister({ entries: [bare] })
		assert.equal(problems.length, 1)
		assert.match(problems[0], /"reason" must be a non-empty written justification/)
	})

	it("rejects a whitespace-only reason", () => {
		const problems = validateRegister({ entries: [{ ...validEntry, reason: "   " }] })
		assert.match(problems[0], /"reason"/)
	})

	it("rejects a verdict that is not by-design", () => {
		const problems = validateRegister({ entries: [{ ...validEntry, verdict: "accepted" }] })
		assert.match(problems[0], /"verdict" must be "by-design"/)
	})

	it("rejects a severity cap outside the known set", () => {
		const problems = validateRegister({ entries: [{ ...validEntry, severity: "severe" }] })
		assert.match(problems[0], /"severity" cap must be one of low, medium, high, critical/)
	})

	it("rejects a non-positive or non-integer count", () => {
		for (const count of [0, -1, 1.5, "3", undefined]) {
			const problems = validateRegister({ entries: [{ ...validEntry, count }] })
			assert.equal(problems.length, 1, `count ${JSON.stringify(count)} should be rejected`)
			assert.match(problems[0], /"count" must be a positive integer/)
		}
	})

	it("rejects missing rule/file and non-object entries", () => {
		assert.equal(validateRegister({ entries: [{ ...validEntry, rule: "" }] }).length, 1)
		assert.equal(validateRegister({ entries: [{ ...validEntry, file: "" }] }).length, 1)
		assert.match(validateRegister({ entries: [null] })[0], /is not an object/)
	})

	it("rejects a register without an entries array", () => {
		assert.deepEqual(validateRegister({}), ['register has no "entries" array'])
		assert.deepEqual(validateRegister(null), ['register is not an object with an "entries" array'])
	})

	it("loadRegister refuses a file containing a bare (unjustified) entry", async () => {
		const dir = await mkdtemp(path.join(os.tmpdir(), "vsix-register-"))
		const file = path.join(dir, "register.json")
		const { reason: _reason, ...bare } = validEntry
		await writeFile(file, JSON.stringify({ entries: [bare] }, null, 2))
		try {
			await assert.rejects(
				() => loadRegister(file),
				(error) => {
					assert.match(error.message, /is invalid \(1 problem\(s\)\)/)
					assert.match(error.message, /"reason"/)
					return true
				},
			)
		} finally {
			await rm(dir, { recursive: true, force: true })
		}
	})
})
