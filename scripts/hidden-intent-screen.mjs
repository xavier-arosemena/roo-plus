#!/usr/bin/env node
/**
 * hidden-intent-screen.mjs — a 20-call screen for the commit-versus-ask channel.
 *
 * THE QUESTION THIS ASKS
 *   The second brief screen (modes-experiment-log.md §29) found no second brief
 *   that both (a) sometimes draws a question and (b) leaves a mode contested.
 *   Six of seven briefs closed the channel because only the code was missing:
 *   ownership was obvious, so the model committed and then asked for the file.
 *
 *   This screen tests one hypothesis about generating the missing class: put the
 *   deciding fact in the user's head rather than in the repository. Ten briefs
 *   whose intent is withheld, plus the one brief known to pass (B3), interleaved
 *   in a single run. If the hidden-intent class asks, it is a candidate
 *   population; if it does not, the class is closed for about ten cents.
 *
 * WHAT IS FIXED, AND WHAT IS NOT
 *   Fixed: the 45-entry picker (`test-fixtures/frames/axis-stance.roomodes`), the
 *   goal-only persona and the standing request from the E20 harness, one model,
 *   brief-major interleaving (H1 K H2 K … H10 K).
 *   Deliberately different: the picker lines use the PRODUCT template,
 *   `  * "<name>" mode (<slug>) - <whenToUse>` (src/core/prompts/sections/modes.ts:33),
 *   not the fixture template E13/E20 used (`- <slug> — <name> — <whenToUse>`).
 *   The format is held constant across all 20 calls, so it cannot explain a
 *   difference between briefs; but a rate from here must not be subtracted from
 *   an E20 rate (M-9).
 *
 * NO MODEL CALL WITHOUT A FLAG AND A KEY
 *   `--dry-run` (default) writes the 20 prompt files and a plan, prints the
 *   digests, and exits. `--run` requires `--model`, a runner and
 *   $FRAMING_PRETEST_API_KEY; a refusal is recorded as a refusal, never as a null.
 *
 * COUNTING RULE, AND WHY IT IS NOT TRUSTED
 *   The mechanical classifier separates a SELECTION from a MENTION: a reply that
 *   lists candidates and asks ("do you want explain, debug or architect?") is an
 *   ASK, however many slugs it contains (M-12, D-26). Anything it cannot resolve
 *   goes to `unresolved` and MUST be adjudicated by hand before a rate is quoted
 *   (M-1).
 *
 * EXIT CODES
 *   0 wrote material or reported · 1 a call failed · 2 usage error or refused
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs"
import * as path from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"

import { buildPrompt, sha256 } from "./lib/framing-pretest.mjs"
import { fixedPersona } from "./lib/routing-round.mjs"
import { parseRoomodes } from "./lib/roomodes-lite.mjs"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const CATALOGUE = path.join(ROOT, "test-fixtures/frames/axis-stance.roomodes")
const BRIEFS = path.join(ROOT, "test-fixtures/hidden-intent/briefs.json")
const OUT = path.join(ROOT, "runs/hidden-intent-screen-2026-11-20")

const USAGE = `usage: node scripts/hidden-intent-screen.mjs [--dry-run | --run --model <id> | --report]
       [--runner <template>]

  --dry-run   write prompts + plan only (default; no network, no key)
  --run       execute the calls through the runner (needs $FRAMING_PRETEST_API_KEY)
  --report    classify the transcripts that exist and print counts
  --runner    shell template with {prompt} {out} {model} {usage} {runId}
              (default: node scripts/lib/gemini-runner.mjs <the same five>)
`

/** The line the extension renders. Deviates from `pickerLine` on purpose — see the header. */
export function productPickerLine(mode) {
	return `  * "${mode.name}" mode (${mode.slug}) - ${mode.whenToUse}`
}

/**
 * Build the interleaved prompt list. Pure: no clock, no filesystem, no model.
 * @param {{catalogueText: string, briefs: object, persona: object}} input
 */
export function buildScreen({ catalogueText, briefs, persona }) {
	const { entries, digest } = parseRoomodes(catalogueText)
	const picker = `${entries.map(productPickerLine).join("\n")}\n`
	const plan = []
	for (const brief of briefs.briefs) {
		plan.push({ slot: plan.length + 1, arm: "hidden-intent", briefId: brief.id, brief: brief.brief })
		plan.push({ slot: plan.length + 1, arm: "control", briefId: briefs.control.id, brief: briefs.control.brief })
	}
	return {
		catalogueDigest: digest,
		pickerDigest: sha256(picker),
		runs: plan.map((slot) => {
			const built = buildPrompt(persona, { id: slot.briefId, text: slot.brief }, picker)
			return {
				...slot,
				runId: `r${String(slot.slot).padStart(2, "0")}-${slot.briefId}`,
				prompt: built.text,
				promptSha256: sha256(built.text),
			}
		}),
	}
}

/**
 * Mechanical classification, deliberately conservative.
 *
 * v1 (question mark only) agreed with the hand pass on 15 of 20 replies and
 * failed in BOTH directions: it missed two declarations written `Selected mode:
 * **"Explain" mode (explain)**` and scored one ask as a declaration because the
 * asker wrote "source code" and the lower-case matcher saw the slug `code`.
 * v2 adds case-insensitive slug matching and a `Mode:`/`Selected mode:` marker;
 * v3 (this version) rejects the word "clarify" as an ask signal — the first
 * goal statement containing "without needing to ask for clarification" was
 * scored as a question. Anything still ambiguous stays UNRESOLVED, and the hand
 * pass in `adjudication.json` is the authority, not this function.
 */
export function classify(reply, slugs) {
	const text = String(reply ?? "").trim()
	if (!text) return { verdict: "EMPTY", slug: null }
	const lower = text.toLowerCase()
	const found = [...new Set((lower.match(/\b[a-z][a-z0-9-]{1,40}\b/g) ?? []).filter((word) => slugs.has(word)))]
	const firstLine =
		text
			.split("\n")
			.map((line) => line.trim())
			.filter(Boolean)[0] ?? ""
	const bare = firstLine.replace(/^[`*_]+|[`*_.:]+$/g, "").toLowerCase()
	const marker = lower.match(/(?:selected\s+)?mode\s*[:*-]+\s*[`*_"'(\s]*([a-z][a-z0-9-]{1,40})/)
	const opening = lower.slice(0, 200)
	const asks =
		text.includes("?") ||
		/^to\s+(?:select|determine|choose|pick)\b/.test(opening) ||
		/\b(?:i|we)\s+(?:need|require)\b[^.]{0,80}\b(?:information|clarification|details|context|to know)\b/.test(
			opening,
		) ||
		/\bplease\s+(?:provide|tell)\b/.test(opening)
	if (slugs.has(bare)) return { verdict: "DECLARATION", slug: bare }
	if (marker && slugs.has(marker[1])) return { verdict: "DECLARATION", slug: marker[1] }
	if (asks) return { verdict: "ASK", slug: null }
	if (found.length === 1) return { verdict: "DECLARATION", slug: found[0] }
	return { verdict: "UNRESOLVED", slug: null, candidates: found }
}

function parseArgs(argv) {
	const options = { mode: "dry-run", model: null, runner: null }
	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index]
		const value = () => {
			const next = argv[index + 1]
			if (!next || next.startsWith("--")) fail(`${arg} needs a value`)
			index += 1
			return next
		}
		if (arg === "--dry-run") options.mode = "dry-run"
		else if (arg === "--run") options.mode = "run"
		else if (arg === "--report") options.mode = "report"
		else if (arg === "--model") options.model = value()
		else if (arg === "--runner") options.runner = value()
		else if (arg === "--help" || arg === "-h") {
			process.stdout.write(USAGE)
			process.exit(0)
		} else fail(`unknown argument: ${arg}`)
	}
	return options
}

function fail(message) {
	process.stderr.write(`hidden-intent-screen: ${message}\n`)
	process.exit(2)
}

function loadMaterial() {
	const catalogueText = readFileSync(CATALOGUE, "utf8")
	const briefs = JSON.parse(readFileSync(BRIEFS, "utf8"))
	if (!Array.isArray(briefs.briefs) || briefs.briefs.length === 0) fail("briefs.json has no briefs")
	const screen = buildScreen({ catalogueText, briefs, persona: fixedPersona() })
	return { briefs, screen }
}

function writeMaterial(screen) {
	mkdirSync(path.join(OUT, "prompts"), { recursive: true })
	for (const run of screen.runs) writeFileSync(path.join(OUT, "prompts", `${run.runId}.txt`), run.prompt)
	writeFileSync(
		path.join(OUT, "plan.json"),
		`${JSON.stringify({ schemaVersion: "ecc.hidden-intent-screen.v1", catalogueDigest: screen.catalogueDigest, pickerDigest: screen.pickerDigest, runs: screen.runs.map(({ prompt, ...rest }) => rest) }, null, 2)}\n`,
	)
}

function runCalls({ screen, model, runner }) {
	const key = process.env.FRAMING_PRETEST_API_KEY
	if (!key) fail("refused: $FRAMING_PRETEST_API_KEY is not set; no call was made")
	const template = runner ?? `node scripts/lib/gemini-runner.mjs {prompt} {out} {model} {usage} {runId}`
	mkdirSync(path.join(OUT, "transcripts"), { recursive: true })
	mkdirSync(path.join(OUT, "usage"), { recursive: true })
	const results = []
	for (const run of screen.runs) {
		const promptPath = path.join(OUT, "prompts", `${run.runId}.txt`)
		const outPath = path.join(OUT, "transcripts", `${run.runId}.txt`)
		const command = template
			.replaceAll("{prompt}", JSON.stringify(promptPath))
			.replaceAll("{out}", JSON.stringify(outPath))
			.replaceAll("{model}", JSON.stringify(model))
			.replaceAll("{usage}", JSON.stringify(path.join(OUT, "usage")))
			.replaceAll("{runId}", JSON.stringify(run.runId))
		const child = spawnSync(command, { shell: true, cwd: ROOT, encoding: "utf8" })
		const ok = child.status === 0 && existsSync(outPath)
		results.push({
			runId: run.runId,
			ok,
			status: child.status ?? null,
			stderr: ok ? undefined : (child.stderr ?? "").slice(-400),
		})
		process.stderr.write(`${run.runId}: ${ok ? "ok" : "FAILED"}\n`)
		if (!ok) break
	}
	writeFileSync(path.join(OUT, "results.jsonl"), results.map((row) => JSON.stringify(row)).join("\n") + "\n")
	const failed = results.find((row) => !row.ok)
	if (failed) {
		process.stderr.write(
			`hidden-intent-screen: stopped at ${failed.runId}; ${results.length} attempt(s) recorded\n`,
		)
		process.exit(1)
	}
}

function report(screen) {
	const slugs = new Set(parseRoomodes(readFileSync(CATALOGUE, "utf8")).entries.map((entry) => entry.slug))
	const dir = path.join(OUT, "transcripts")
	if (!existsSync(dir)) fail(`no transcripts at ${path.relative(ROOT, dir)}; run with --run first`)
	const rows = []
	for (const run of screen.runs) {
		const file = path.join(dir, `${run.runId}.txt`)
		if (!existsSync(file)) {
			rows.push({ runId: run.runId, arm: run.arm, briefId: run.briefId, verdict: "MISSING", slug: null })
			continue
		}
		rows.push({
			runId: run.runId,
			arm: run.arm,
			briefId: run.briefId,
			...classify(readFileSync(file, "utf8"), slugs),
		})
	}
	const count = (arm, verdict) => rows.filter((row) => row.arm === arm && row.verdict === verdict).length
	const summary = {
		hiddenIntent: {
			n: rows.filter((row) => row.arm === "hidden-intent").length,
			ask: count("hidden-intent", "ASK"),
			declaration: count("hidden-intent", "DECLARATION"),
			unresolved: count("hidden-intent", "UNRESOLVED"),
		},
		control: {
			n: rows.filter((row) => row.arm === "control").length,
			ask: count("control", "ASK"),
			declaration: count("control", "DECLARATION"),
			unresolved: count("control", "UNRESOLVED"),
		},
	}
	const payload = {
		schemaVersion: "ecc.hidden-intent-screen.v1",
		warning:
			"Mechanical counts only. Adjudicate every UNRESOLVED and every multi-candidate reply by hand before quoting (M-1, M-12).",
		summary,
		rows,
	}
	writeFileSync(path.join(OUT, "report.json"), `${JSON.stringify(payload, null, 2)}\n`)
	process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`)
	if (rows.some((row) => row.verdict === "UNRESOLVED"))
		process.stdout.write("unresolved replies require hand adjudication before this screen can be read.\n")
}

// A module imported for its helpers must not run the batch. It did once: importing
// this file to borrow `classify` rewrote `prompts/*` and `plan.json` in the
// published run directory. The guard is the fix; the incident is why it is here.
const invokedDirectly = Boolean(process.argv[1]) && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (invokedDirectly) {
	const options = parseArgs(process.argv.slice(2))
	const { screen } = loadMaterial()
	if (options.mode === "report") report(screen)
	else {
		writeMaterial(screen)
		if (options.mode === "run") {
			if (!options.model) fail("--run needs --model")
			runCalls({ screen, model: options.model, runner: options.runner })
		}
		process.stdout.write(
			`${screen.runs.length} prompts written to ${path.relative(ROOT, OUT)}; catalogue ${screen.catalogueDigest.slice(0, 16)}… picker ${screen.pickerDigest.slice(0, 16)}…\n`,
		)
	}
}
