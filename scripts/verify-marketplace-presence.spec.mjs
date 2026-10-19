/**
 * verify-marketplace-presence.spec.mjs
 *
 * Unit tests for scripts/verify-marketplace-presence.mjs (the post-publish
 * Marketplace visibility gate). The network is fully injected, so these tests
 * never touch marketplace.visualstudio.com.
 *
 * Run with: node --test scripts/verify-marketplace-presence.spec.mjs
 * (scripts/ has no vitest runner — same convention as
 *  scripts/verify-submodule-pin.spec.mjs.)
 */

import { test } from "node:test"
import assert from "node:assert/strict"

import { checkPresence, fetchExtension, parseArgs, waitForPresence } from "./verify-marketplace-presence.mjs"

const PUBLISHER = "xavier-arosemena"
const EXTENSION = "roo-plus"

/** Builds a gallery payload; `null` versions means "extension not present". */
function galleryPayload(versions) {
  if (!versions) {
    return { results: [{ extensions: [], resultMetadata: [{ metadataType: "ResultCount", metadataItems: [{ count: 0 }] }] }] }
  }
  return {
    results: [
      {
        extensions: [
          {
            publisher: { publisherName: PUBLISHER },
            extensionName: EXTENSION,
            versions: versions.map((version) => ({ version })),
          },
        ],
      },
    ],
  }
}

/** A fetch stub that always answers with the given payload. */
function stubFetch(payload, { ok = true, status = 200 } = {}) {
  const calls = []
  const impl = async (url, init) => {
    calls.push({ url, init })
    return { ok, status, json: async () => payload }
  }
  impl.calls = calls
  return impl
}

test("fetchExtension returns the listed versions", async () => {
  const ext = await fetchExtension({
    publisher: PUBLISHER,
    extension: EXTENSION,
    fetchImpl: stubFetch(galleryPayload(["3.89.0", "3.89.1"])),
  })
  assert.deepEqual(ext, { publisher: PUBLISHER, name: EXTENSION, versions: ["3.89.0", "3.89.1"] })
})

test("fetchExtension returns null when the gallery has no match", async () => {
  const ext = await fetchExtension({
    publisher: PUBLISHER,
    extension: EXTENSION,
    fetchImpl: stubFetch(galleryPayload(null)),
  })
  assert.equal(ext, null)
})

test("fetchExtension throws on a non-2xx response", async () => {
  await assert.rejects(
    () =>
      fetchExtension({
        publisher: PUBLISHER,
        extension: EXTENSION,
        fetchImpl: stubFetch({}, { ok: false, status: 429 }),
      }),
    /HTTP 429/,
  )
})

test("fetchExtension queries the exact publisher.extension pair", async () => {
  const impl = stubFetch(galleryPayload(["1.0.0"]))
  await fetchExtension({ publisher: PUBLISHER, extension: EXTENSION, fetchImpl: impl })

  assert.equal(impl.calls.length, 1)
  const body = JSON.parse(impl.calls[0].init.body)
  assert.equal(body.filters[0].criteria[0].value, `${PUBLISHER}.${EXTENSION}`)
})

test("checkPresence is present when the version is listed", async () => {
  const result = await checkPresence({
    publisher: PUBLISHER,
    extension: EXTENSION,
    version: "3.89.1",
    fetchImpl: stubFetch(galleryPayload(["3.89.0", "3.89.1"])),
  })
  assert.equal(result.status, "present")
  assert.deepEqual(result.versions, ["3.89.0", "3.89.1"])
})

test("checkPresence asserts presence only when no version is given", async () => {
  const result = await checkPresence({
    publisher: PUBLISHER,
    extension: EXTENSION,
    fetchImpl: stubFetch(galleryPayload(["0.0.1"])),
  })
  assert.equal(result.status, "present")
})

test("checkPresence is absent when the publisher/extension does not resolve", async () => {
  const result = await checkPresence({
    publisher: PUBLISHER,
    extension: EXTENSION,
    version: "3.89.1",
    fetchImpl: stubFetch(galleryPayload(null)),
  })
  assert.equal(result.status, "absent")
  assert.match(result.reason, /not present in the public gallery/)
})

test("checkPresence reports version-missing when the extension exists but the version does not", async () => {
  const result = await checkPresence({
    publisher: PUBLISHER,
    extension: EXTENSION,
    version: "9.9.9",
    fetchImpl: stubFetch(galleryPayload(["3.89.0"])),
  })
  assert.equal(result.status, "version-missing")
  assert.match(result.reason, /9\.9\.9 is not listed/)
})

test("checkPresence degrades to unreachable on a transport error", async () => {
  const result = await checkPresence({
    publisher: PUBLISHER,
    extension: EXTENSION,
    version: "3.89.1",
    fetchImpl: async () => {
      throw new Error("ETIMEDOUT")
    },
  })
  assert.equal(result.status, "unreachable")
  assert.match(result.reason, /ETIMEDOUT/)
})

test("checkPresence reports a timeout as unreachable", async () => {
  const abortError = Object.assign(new Error("aborted"), { name: "AbortError" })
  const result = await checkPresence({
    publisher: PUBLISHER,
    extension: EXTENSION,
    timeoutMs: 25,
    fetchImpl: async () => {
      throw abortError
    },
  })
  assert.equal(result.status, "unreachable")
  assert.match(result.reason, /timed out/)
})

test("checkPresence degrades to unreachable on an HTTP error status", async () => {
  const result = await checkPresence({
    publisher: PUBLISHER,
    extension: EXTENSION,
    fetchImpl: stubFetch({}, { ok: false, status: 503 }),
  })
  assert.equal(result.status, "unreachable")
  assert.match(result.reason, /HTTP 503/)
})

test("waitForPresence makes exactly one attempt when the wait window is zero", async () => {
  const impl = stubFetch(galleryPayload(null))
  const result = await waitForPresence({
    publisher: PUBLISHER,
    extension: EXTENSION,
    version: "3.89.1",
    waitMs: 0,
    fetchImpl: impl,
  })
  assert.equal(result.attempts, 1)
  assert.equal(result.status, "absent")
  assert.equal(impl.calls.length, 1)
})

test("waitForPresence polls until a CDN-cached version becomes visible", async () => {
  let call = 0
  const impl = async () => {
    call += 1
    return { ok: true, status: 200, json: async () => galleryPayload(call < 3 ? ["3.89.0"] : ["3.89.0", "3.89.1"]) }
  }

  const result = await waitForPresence({
    publisher: PUBLISHER,
    extension: EXTENSION,
    version: "3.89.1",
    waitMs: 60_000,
    intervalMs: 15_000,
    fetchImpl: impl,
    sleep: async () => {},
  })

  assert.equal(result.status, "present")
  assert.equal(result.attempts, 3)
})

test("waitForPresence gives up after the polling window on a permanently absent version", async () => {
  const impl = stubFetch(galleryPayload(["3.89.0"]))
  const result = await waitForPresence({
    publisher: PUBLISHER,
    extension: EXTENSION,
    version: "9.9.9",
    waitMs: 30_000,
    intervalMs: 15_000,
    fetchImpl: impl,
    sleep: async () => {},
  })
  // floor(30000/15000) + 1 === 3
  assert.equal(result.attempts, 3)
  assert.equal(result.status, "version-missing")
})

test("waitForPresence stops immediately on an unreachable gallery", async () => {
  const impl = async () => {
    throw new Error("ENOTFOUND marketplace.visualstudio.com")
  }
  const result = await waitForPresence({
    publisher: PUBLISHER,
    extension: EXTENSION,
    waitMs: 120_000,
    intervalMs: 15_000,
    fetchImpl: impl,
    sleep: async () => {},
  })
  assert.equal(result.attempts, 1)
  assert.equal(result.status, "unreachable")
})

test("parseArgs reads the CLI surface", () => {
  const args = parseArgs([
    "--publisher",
    "acme",
    "--extension",
    "widget",
    "--version",
    "1.2.3",
    "--wait",
    "300",
    "--advisory",
    "--json",
  ])
  assert.deepEqual(args, {
    publisher: "acme",
    extension: "widget",
    version: "1.2.3",
    waitSeconds: 300,
    presenceOnly: false,
    advisory: true,
    json: true,
  })
})

test("parseArgs defaults are strict and single-shot", () => {
  assert.deepEqual(parseArgs([]), {
    presenceOnly: false,
    advisory: false,
    json: false,
    waitSeconds: 0,
  })
})

test("parseArgs supports --presence-only and ignores unknown flags", () => {
  const args = parseArgs(["--presence-only", "--not-a-real-flag"])
  assert.equal(args.presenceOnly, true)
  assert.equal(args.version, undefined)
})
