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

import {
	DEFAULT_TOOL_VERSION,
	assessAudit,
	classifyFindings,
	loadRegister,
	parseScan,
	yaraUnavailable,
} from "./vsix-audit.mjs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REGISTER = path.join(__dirname, "vsix-audit-register.json")

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
		const d = assessAudit(fakeScan({ findings: [registeredFinding] }), register, { publish: true })
		assert.equal(d.exitCode, 0)
		assert.equal(d.real.length, 0)
	})

	it("returns REAL_FINDINGS (exit 1) when a finding is unregistered", () => {
		const d = assessAudit(fakeScan({ findings: [registeredFinding, unregisteredFinding] }), register, { publish: true })
		assert.equal(d.exitCode, 1)
		assert.equal(d.real.length, 1)
	})

	it("fails closed on degraded coverage in publish context (exit 2)", () => {
		const d = assessAudit(fakeScan({ findings: [registeredFinding], degraded: true, unavailableModules: ["yara"] }), register, { publish: true })
		assert.equal(d.exitCode, 2)
		assert.equal(d.yaraMissing, true)
		assert.equal(d.degraded, true)
	})

	it("fails closed on degraded coverage even with zero findings in publish context", () => {
		const d = assessAudit(fakeScan({ degraded: true, unavailableModules: ["yara"] }), register, { publish: true })
		assert.equal(d.exitCode, 2)
	})

	it("non-publish degraded scan without --allow-degraded still fails closed (exit 2)", () => {
		const d = assessAudit(fakeScan({ findings: [registeredFinding], degraded: true, unavailableModules: ["yara"] }), register, {})
		assert.equal(d.exitCode, 2)
	})

	it("non-publish degraded scan with --allow-degraded inspects and passes when clean", () => {
		const d = assessAudit(fakeScan({ findings: [registeredFinding], degraded: true, unavailableModules: ["yara"] }), register, { allowDegraded: true })
		assert.equal(d.exitCode, 0)
		assert.equal(d.degraded, true)
	})

	it("non-publish degraded scan with --allow-degraded still fails on real findings", () => {
		const d = assessAudit(fakeScan({ findings: [registeredFinding, unregisteredFinding], degraded: true, unavailableModules: ["yara"] }), register, { allowDegraded: true })
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
		const decision = assessAudit(scan, register, { publish: true })
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
		const decision = assessAudit(scan, register, { publish: true })
		assert.equal(decision.exitCode, 1)
		assert.equal(decision.real.length, 1)
	})

	it("pin version string is the documented @trailofbits/vsix-audit version", () => {
		assert.equal(DEFAULT_TOOL_VERSION, "@trailofbits/vsix-audit@0.3.0")
	})
})
