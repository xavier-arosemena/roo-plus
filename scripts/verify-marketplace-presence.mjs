#!/usr/bin/env node

/**
 * verify-marketplace-presence.mjs
 *
 * POST-PUBLISH gate: asserts that `<publisher>.<extension>` still resolves in the
 * PUBLIC VS Code Marketplace gallery, and optionally that a specific version is
 * listed.
 *
 * Why this exists
 * ---------------
 * `vsce publish` returning success is NOT proof of publication. During the
 * 2026-10 incident the Marketplace reported success while the item page and every
 * `/vspackage` URL returned 404, and the publisher's management console returned
 * `429 - Woah, that's a lot of requests` (`RequestBlockedException`, resource
 * `Concurrency`, namespace `VSID`). Nothing in the pipeline noticed, because
 * every Marketplace step is deliberately advisory: it failed "green".
 *
 * The 2026-09-25 -> 2026-10-06 window where the listing silently disappeared was
 * only found by hand-probing the gallery API. This gate automates that probe.
 *
 * Exit semantics (deliberate)
 * ----------------------------
 *   present                              -> 0
 *   absent | version-missing             -> 1   (definitive: something is wrong)
 *   unreachable (network/timeout/5xx)    -> 0 + ::warning::
 *
 * `--advisory` downgrades the definitive failures to a non-zero-free warning, so
 * a Marketplace problem can NEVER block an Open VSX release. Every publish step
 * in this repo uses `--advisory`: Open VSX is the registry this project ships on,
 * and the Marketplace must remain best-effort (see docs/runbooks/release-publishing.md).
 *
 * Usage
 *   node scripts/verify-marketplace-presence.mjs                     # presence + committed version, strict
 *   node scripts/verify-marketplace-presence.mjs --presence-only     # presence only (PR validation)
 *   node scripts/verify-marketplace-presence.mjs --advisory          # never exits non-zero
 *   node scripts/verify-marketplace-presence.mjs --wait 300          # poll for CDN propagation
 *   node scripts/verify-marketplace-presence.mjs --json              # machine-readable result
 *
 * Tests: node --test scripts/verify-marketplace-presence.spec.mjs
 */

import { appendFileSync, readFileSync } from "node:fs"

import { logStep, logEndGroup, logInfo, logOk, logWarn, logError } from "./lib/logger.mjs"

const TAG = "VERIFY:MARKETPLACE-PRESENCE"
const GALLERY_URL = "https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery"
const DEFAULT_TIMEOUT_MS = 20_000
const DEFAULT_WAIT_SECONDS = 0
const DEFAULT_INTERVAL_SECONDS = 15

/**
 * Queries the public gallery for one extension.
 *
 * @param {object} options
 * @param {string} options.publisher - Publisher id (e.g. `xavier-arosemena`).
 * @param {string} options.extension - Extension name (e.g. `roo-plus`).
 * @param {typeof fetch} [options.fetchImpl] - Injectable fetch (tests).
 * @param {AbortSignal} [options.signal] - Abort signal.
 * @returns {Promise<{publisher: string, name: string, versions: string[]} | null>}
 */
export async function fetchExtension({ publisher, extension, fetchImpl = fetch, signal } = {}) {
  const body = {
    filters: [{ criteria: [{ filterType: 7, value: `${publisher}.${extension}` }], pageSize: 1 }],
    // 914 = IncludeVersions | IncludeFiles | IncludeVersionProperties
    flags: 914,
  }

  const res = await fetchImpl(GALLERY_URL, {
    method: "POST",
    headers: {
      Accept: "application/json;api-version=7.2-preview.1",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!res.ok) {
    throw new Error(`gallery extensionquery responded HTTP ${res.status}`)
  }

  const json = await res.json()
  const ext = json?.results?.[0]?.extensions?.[0]
  if (!ext) return null

  return {
    publisher: ext.publisher?.publisherName ?? publisher,
    name: ext.extensionName ?? extension,
    versions: (ext.versions ?? []).map((v) => v.version).filter(Boolean),
  }
}

/**
 * One presence check — no retries.
 *
 * @param {object} options
 * @param {string} options.publisher
 * @param {string} options.extension
 * @param {string} [options.version] - When omitted, only presence is asserted.
 * @param {typeof fetch} [options.fetchImpl]
 * @param {number} [options.timeoutMs]
 * @returns {Promise<{status: "present"|"absent"|"version-missing"|"unreachable", reason: string, versions: string[]}>}
 */
export async function checkPresence({
  publisher,
  extension,
  version,
  fetchImpl = fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const ext = await fetchExtension({ publisher, extension, fetchImpl, signal: controller.signal })
    if (!ext) {
      return {
        status: "absent",
        reason: `${publisher}.${extension} is not present in the public gallery`,
        versions: [],
      }
    }
    if (version && !ext.versions.includes(version)) {
      return {
        status: "version-missing",
        reason: `${publisher}.${extension} exists but ${version} is not listed (found ${ext.versions.length} version(s))`,
        versions: ext.versions,
      }
    }
    return { status: "present", reason: "", versions: ext.versions }
  } catch (err) {
    const message = err?.name === "AbortError" ? `timed out after ${timeoutMs}ms` : String(err?.message ?? err)
    return { status: "unreachable", reason: message, versions: [] }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Polls until the extension (and version, when given) is visible, because both
 * registries are CDN-cached. A version that is still absent at the deadline did
 * not "propagate late" — it never landed.
 *
 * @param {object} options
 * @param {string} options.publisher
 * @param {string} options.extension
 * @param {string} [options.version]
 * @param {number} [options.waitMs] - Total polling window (0 = single attempt).
 * @param {number} [options.intervalMs]
 * @param {typeof fetch} [options.fetchImpl]
 * @param {(ms: number) => Promise<void>} [options.sleep]
 * @returns {Promise<{status: string, reason: string, versions: string[], attempts: number}>}
 */
export async function waitForPresence({
  publisher,
  extension,
  version,
  waitMs = 0,
  intervalMs = DEFAULT_INTERVAL_SECONDS * 1000,
  fetchImpl = fetch,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
} = {}) {
  // Attempt-count bounded (not clock bounded) so the polling window is
  // deterministic and testable without real timers.
  const maxAttempts = Math.max(1, Math.floor(Math.max(0, waitMs) / intervalMs) + 1)
  let attempts = 0
  let last = { status: "unreachable", reason: "no attempt made", versions: [] }

  while (attempts < maxAttempts) {
    attempts += 1
    last = await checkPresence({ publisher, extension, version, fetchImpl })

    if (last.status === "present" || last.status === "unreachable") break
    if (attempts < maxAttempts) await sleep(intervalMs)
  }

  return { ...last, attempts }
}

/**
 * Parses CLI arguments.
 *
 * @param {string[]} argv
 * @returns {{publisher?: string, extension?: string, version?: string, presenceOnly: boolean, advisory: boolean, json: boolean, waitSeconds: number}}
 */
export function parseArgs(argv) {
  const out = {
    presenceOnly: false,
    advisory: false,
    json: false,
    waitSeconds: DEFAULT_WAIT_SECONDS,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    switch (arg) {
      case "--publisher":
        out.publisher = argv[++i]
        break
      case "--extension":
        out.extension = argv[++i]
        break
      case "--version":
        out.version = argv[++i]
        break
      case "--wait":
        out.waitSeconds = Number.parseInt(argv[++i] ?? "", 10) || 0
        break
      case "--presence-only":
        out.presenceOnly = true
        break
      case "--advisory":
        out.advisory = true
        break
      case "--json":
        out.json = true
        break
      default:
        break
    }
  }

  return out
}

/** Reads the packaged identity + version from src/package.json. */
function readPackageManifest() {
  return JSON.parse(readFileSync(new URL("../src/package.json", import.meta.url), "utf8"))
}

/**
 * Publishes `verified`/`status` as GitHub Actions step outputs so downstream
 * steps (job summary, notifications) can branch on the result. No-op locally.
 *
 * @param {string} status
 */
function writeGitHubOutputs(status) {
  const file = process.env.GITHUB_OUTPUT
  if (!file) return
  // `unreachable` deliberately writes no verdict: an outage is not evidence that
  // the listing is missing, and downstream summaries must not claim otherwise.
  const verified = status === "present" ? "true" : status === "unreachable" ? "" : "false"
  try {
    appendFileSync(file, `status=${status}\nverified=${verified}\n`)
  } catch {
    // Output wiring is best-effort; never fail the gate over it.
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  let manifest = {}
  try {
    manifest = readPackageManifest()
  } catch {
    // Fall through to explicit flags / env; the check still works without a manifest.
  }

  const publisher = args.publisher ?? process.env.MARKETPLACE_PUBLISHER ?? manifest.publisher
  const extension = args.extension ?? process.env.MARKETPLACE_EXTENSION ?? manifest.name
  const version = args.presenceOnly ? undefined : (args.version ?? process.env.MARKETPLACE_VERSION ?? manifest.version)

  if (!publisher || !extension) {
    throw new Error("publisher/extension could not be resolved (pass --publisher/--extension)")
  }

  const label = version ? `${publisher}.${extension}@${version}` : `${publisher}.${extension}`

  if (!args.json) {
    logStep(TAG, `Checking public gallery for ${label}`)
  }

  const result = await waitForPresence({
    publisher,
    extension,
    version,
    waitMs: args.waitSeconds * 1000,
  })

  if (args.json) {
    process.stdout.write(`${JSON.stringify({ label, ...result })}\n`)
  } else {
    logEndGroup()
  }

  writeGitHubOutputs(result.status)

  if (result.status === "present") {
    if (!args.json) logOk(TAG, `${label} present (${result.versions.length} version(s) listed)`)
    return 0
  }

  if (result.status === "unreachable") {
    // Never block on Marketplace weather; this registry is best-effort by design.
    logWarn(TAG, `${label} could not be verified: ${result.reason}. Treating as advisory.`)
    return 0
  }

  const detail = `${label} ${result.status}: ${result.reason}`
  if (args.advisory) {
    // ::error:: annotation without a non-zero exit: loud in the UI, incapable of
    // blocking an Open VSX release.
    logError(TAG, detail)
    logError(
      TAG,
      "The Marketplace is advisory in this workflow — Open VSX is unaffected. The listing was removed by enforcement on 2026-10-20 and will not be reinstated; see docs/runbooks/release-publishing.md §Status. Do not re-publish under another publisher.",
    )
    return 0
  }

  logError(TAG, detail)
  logError(
    TAG,
    "If this is the enforced removal of 2026-10-20 there is nothing to fix here — see `docs/runbooks/release-publishing.md` §Status.",
  )
  return 1
}

// Only run when invoked directly (the spec imports this module).
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const code = await main().catch((err) => {
    logError(TAG, `fatal: ${String(err?.message ?? err)}`)
    return 1
  })
  process.exitCode = code
}
