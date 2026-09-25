#!/usr/bin/env node

/**
 * gate-sync.mjs — the SINGLE source of truth for the upstream-sync batch gate chain.
 *
 * Why this file exists (F-A-9 / lens B "docs-as-code"): the two documents that
 * describe the gate chain disagreed, and the agent-facing one was the weaker of
 * the two. `docs/upstream-sync/README.md` §4.4 listed eight node gates plus
 * `pnpm test:scripts`; `docs/runbooks/upstream-sync.md` TASK 6 listed the same
 * eight node gates but substituted `pnpm lint` for the `pnpm verify:*` re-run and
 * DROPPED `pnpm test:scripts` entirely. An agent obeying the runbook therefore ran
 * a strictly smaller gate set than the manual prescribed, and nothing noticed.
 *
 * So the list lives HERE, once:
 *   - `pnpm gate:sync` runs every step below in order and stops at the first
 *     failure (the batch is not done if any step fails);
 *   - both documents reference the aggregate instead of restating commands, and
 *     `scripts/gate-sync.spec.mjs` FAILS if either document restates a divergent
 *     command list — the test reads the same exported constants this runner uses,
 *     so the docs, the test and the runner cannot drift apart.
 *
 * The list is the eight node gates + `pnpm test:scripts` (the `.spec.mjs` suites
 * for the gates themselves) + the two H-28 resolution steps:
 *   - `node scripts/verify-resolutions.mjs --integrity` — an unmerged conflict
 *     marker in any file the batch touched, or a `git diff --check` whitespace
 *     error, fails the batch (cheap, so it runs before the slow step below);
 *   - `pnpm check-types` — `eslint` is not `tsc`, so a type-broken resolution is
 *     invisible to the rest of the chain. `src/package.json` already defines
 *     `check-types` (`tsc --noEmit`); the aggregate just runs it.
 * `pnpm lint`, the package-local Vitest suites and the rebrand step stay explicit
 * in the runbook because they depend on what the batch touched, not on the aggregate.
 *
 * Scope note: `verify-semble-release-coupling.mjs` resolves its own base
 * (GITHUB_BASE_REF → origin/<ref> → origin/master, override with `--base`) and
 * SKIPs when no base is resolvable, so the aggregate needs no merge-base
 * argument. `verify-message-schemas.mjs` expects the `@roo-code/types` build,
 * exactly as CI runs it (`pnpm --filter @roo-code/types build` first).
 *
 * Usage (from the repo root):
 *   pnpm gate:sync        # run every gate in order
 *   node scripts/gate-sync.mjs --list
 *   node scripts/gate-sync.mjs --help
 *
 * Exit codes: 0 all gates passed · 1 the first failing gate (named, with its
 * command) · 2 unusable invocation (unknown flag).
 */

import { execFileSync } from "node:child_process"
import { existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

import { logEndGroup, logError, logInfo, logStep, logSuccess } from "./lib/logger.mjs"

/** Hierarchical tag identifying this process (same scheme as the sibling gates). */
export const TAG = "GATE:SYNC"

/** Repository root (the workspace root, one level above scripts/). */
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

/** The one command both documents reference instead of restating the list. */
export const GATE_SYNC_COMMAND = "pnpm gate:sync"

/**
 * The canonical gate chain, in execution order. `id` is stable (tests and log
 * lines key on it); `command` is the exact command line an operator would run —
 * the divergence test compares against these strings, so keep them literal.
 */
export const SYNC_GATE_STEPS = [
	{ id: "message-schemas", command: "node scripts/verify-message-schemas.mjs" },
	{
		id: "code-index-alignment",
		command: "node scripts/verify-upstream-code-index-alignment.mjs --strict",
	},
	{ id: "announcement-version", command: "node scripts/verify-announcement-version.mjs" },
	{ id: "submodule-pin", command: "node scripts/verify-submodule-pin.mjs" },
	{ id: "roomodes-sync", command: "node scripts/verify-roomodes-sync.mjs" },
	{ id: "locale-readmes", command: "node scripts/verify-locale-readmes.mjs" },
	{ id: "semble-checksums", command: "node scripts/verify-semble-checksums.mjs --strict" },
	{
		id: "semble-release-coupling",
		command: "node scripts/verify-semble-release-coupling.mjs --strict",
	},
	{ id: "scripts-unit-tests", command: "pnpm run test:scripts" },
	{ id: "resolution-integrity", command: "node scripts/verify-resolutions.mjs --integrity" },
	{ id: "check-types", command: "pnpm check-types" },
]

/**
 * Where the gate chain is described. `anchor` starts the region, `boundary` ends
 * it (the first following line matching it is NOT part of the region). Both docs
 * must reference {@link GATE_SYNC_COMMAND} inside their region and must NOT
 * restate a divergent command list there.
 */
export const GATE_DOC_REGIONS = [
	{
		path: "docs/upstream-sync/README.md",
		anchor: /^###\s+4\.4\s/,
		boundary: /^#{2,3}\s/,
	},
	{
		path: "docs/runbooks/upstream-sync.md",
		anchor: /^TASK 6 — Gate chain/,
		boundary: /^TASK \d+ —/,
	},
]

/** Every canonical gate command line, for the divergence check. */
export function gateSyncCommands(steps = SYNC_GATE_STEPS) {
	return steps.map((step) => step.command)
}

/**
 * Extracts the documentation region that describes the gate chain. Throws when
 * the anchor is absent — a missing anchor means the description was deleted or
 * renamed, which would otherwise make the divergence check pass vacuously.
 * Pure — exported for the spec.
 */
export function gateRegionLines(markdown, region) {
	const lines = markdown.split("\n")
	const start = lines.findIndex((line) => region.anchor.test(line))
	if (start === -1) {
		throw new Error(`${region.path}: no line matches the gate-chain anchor ${String(region.anchor)}`)
	}
	const rest = lines.slice(start + 1)
	const end = rest.findIndex((line) => region.boundary.test(line))
	const region_ = end === -1 ? [lines[start], ...rest] : [lines[start], ...rest.slice(0, end)]
	return region_
}

/**
 * Command lines inside a region that RESTATE a canonical gate command. A line
 * whose command part (before a trailing `#` comment) equals a canonical command
 * is a divergent restatement — the docs must reference the aggregate instead.
 * Pure — exported for the spec.
 */
export function restatedGateCommands(markdown, region, steps = SYNC_GATE_STEPS) {
	const canonical = new Set(gateSyncCommands(steps))
	return gateRegionLines(markdown, region)
		.map((line) => line.replace(/\s+#.*$/, "").trim())
		.filter((line) => canonical.has(line))
}

/**
 * Resolves a step's command into an argv array. Deliberately a plain split: the
 * canonical commands contain no quoting, and keeping it naive means a command
 * that needs shell quoting fails loudly at review time instead of silently.
 */
export function stepArgv(command, platform = process.platform) {
	const [bin, ...args] = command.split(/\s+/).filter(Boolean)
	if (bin === "pnpm" && platform === "win32") return ["pnpm.cmd", ...args]
	return [bin, ...args]
}

/** The `scripts/…` file a step runs, or null for a non-node step. Pure. */
export function stepScriptPath(command) {
	const match = /(?:^|\s)(scripts\/\S+\.mjs|webview-ui\/scripts\/\S+\.mjs)/.exec(command)
	return match ? match[1] : null
}

function printHelp() {
	console.log(`
gate-sync.mjs — the upstream-sync batch gate chain (single source of truth)

Usage:
  pnpm gate:sync                  # run every step, in order, stop at the first failure
  node scripts/gate-sync.mjs --list
  node scripts/gate-sync.mjs --help

Steps (${SYNC_GATE_STEPS.length} total) — referenced by docs/upstream-sync/README.md §4.4 and
docs/runbooks/upstream-sync.md TASK 6 as \`${GATE_SYNC_COMMAND}\`:
${SYNC_GATE_STEPS.map((step, index) => `  ${String(index + 1).padStart(2)}. ${step.id.padEnd(26)} ${step.command}`).join("\n")}

Adding, removing or reordering a gate is a one-line change in this file; both
documents and the divergence test read the same constant, so they cannot argue.
`)
}

function main(argv = process.argv.slice(2)) {
	if (argv.includes("--help") || argv.includes("-h")) {
		printHelp()
		return 0
	}
	if (argv.includes("--list")) {
		for (const step of SYNC_GATE_STEPS) console.log(`${step.id}\t${step.command}`)
		return 0
	}
	const unknown = argv.filter((arg) => !arg.startsWith("--"))
	if (unknown.length > 0 || argv.length > 0) {
		logError(TAG, `unknown argument(s): ${argv.join(", ")} — run with --help`)
		return 2
	}

	logStep(TAG, `Running the upstream-sync gate chain — ${SYNC_GATE_STEPS.length} step(s), in order`)
	for (const [index, step] of SYNC_GATE_STEPS.entries()) {
		const label = `${step.id} — ${step.command}`
		logInfo(`${TAG}:STEP`, `${String(index + 1).padStart(2)}/${SYNC_GATE_STEPS.length} ${label}`)
		const script = stepScriptPath(step.command)
		if (script && !existsSync(path.join(ROOT, script))) {
			logError(TAG, `step "${step.id}" runs ${script}, which does not exist — fix the gate list before the batch`)
			logEndGroup()
			return 1
		}
		try {
			const [bin, ...args] = stepArgv(step.command)
			execFileSync(bin, args, { cwd: ROOT, stdio: "inherit" })
		} catch (error) {
			logEndGroup()
			logError(TAG, `GATE FAILED — ${label}`)
			logError(
				TAG,
				`Fix it (never suppress it), then re-run \`${GATE_SYNC_COMMAND}\`. ` +
					`A batch is not done until every step passes.`,
			)
			return 1
		}
	}
	logEndGroup()
	logSuccess(TAG, `every gate passed (${SYNC_GATE_STEPS.length} step(s)) — the batch's gate chain is green`)
	return 0
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
	process.exit(main())
}
