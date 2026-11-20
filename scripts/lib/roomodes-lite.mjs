/**
 * roomodes-lite.mjs — a strict reader for the generated `.roomodes` subset.
 *
 * WHY THIS EXISTS
 *   `scripts/` has no YAML dependency (`yaml` is a devDependency of the package,
 *   not of the scripts, and scripts must run with `node --test` alone). The
 *   routing probe gate needs the three fields the model actually reads —
 *   `slug`, `name`, `whenToUse` — from the generated frame fixtures. Rather than
 *   guess at YAML, this reader accepts exactly the shape
 *   `scripts/generate-frame-fixtures.mjs` emits and throws on anything else.
 *
 * WHAT IT ACCEPTS
 *   - A top-level `customModes:` key.
 *   - A list of maps, two-space indented, each starting `- slug:`.
 *   - Keys at four spaces: slug, name, description, roleDefinition, whenToUse,
 *     groups. Any other key throws with its line number.
 *   - Scalars are plain, double-quoted (parsed as JSON, so escapes work) or
 *     single-quoted. Block scalars (`|`, `>`) throw: they change what the model
 *     reads and the fixtures never use them.
 *   - `groups:` is a list of `      - value` items; values are validated as
 *     strings and otherwise ignored.
 *
 * WHAT IT DOES NOT DO
 *   No anchors, aliases, flow collections, comments mid-value, multi-line
 *   folded strings, or nested maps. Those are not in the fixtures, and a reader
 *   that silently half-parses them is worse than one that refuses.
 *
 * THE DIGEST IS THE CONTRACT
 *   `digest` is the SHA-256 of the source bytes. The probe gate records it, so a
 *   catalogue that changes without the probes being re-reviewed fails loudly.
 */

import { createHash } from "node:crypto"

const ALLOWED_KEYS = new Set(["slug", "name", "description", "roleDefinition", "whenToUse", "groups"])
const REQUIRED = ["slug", "name", "whenToUse"]

function fail(lineNumber, message) {
	throw new Error(`roomodes-lite: line ${lineNumber}: ${message}`)
}

function unquote(raw, lineNumber) {
	const value = raw.trim()
	if (value === "") return ""
	if (value.startsWith("|") || value.startsWith(">")) {
		fail(lineNumber, "block scalars are not supported; the fixtures use inline scalars")
	}
	if (value.startsWith('"')) {
		if (!value.endsWith('"') || value.length < 2) fail(lineNumber, "unterminated double-quoted scalar")
		try {
			return JSON.parse(value)
		} catch {
			fail(lineNumber, "double-quoted scalar is not JSON-parseable")
		}
	}
	if (value.startsWith("'")) {
		if (!value.endsWith("'") || value.length < 2) fail(lineNumber, "unterminated single-quoted scalar")
		return value.slice(1, -1).replace(/''/g, "'")
	}
	return value
}

/**
 * Parse `.roomodes` bytes.
 * @param {string} text raw file content
 * @returns {{ entries: Array<{slug: string, name: string, whenToUse: string, description?: string}>, digest: string }}
 */
export function parseRoomodes(text) {
	const body = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n")
	const digest = createHash("sha256").update(body, "utf8").digest("hex")
	const lines = body.split("\n")
	const entries = []
	let current = null
	let inGroups = false

	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index]
		const lineNumber = index + 1
		if (line.trim() === "") continue
		if (line.includes("\t")) fail(lineNumber, "tab characters are not valid indentation")

		if (/^customModes:\s*$/.test(line)) {
			if (entries.length > 0) fail(lineNumber, "duplicate top-level customModes key")
			continue
		}
		const entryStart = line.match(/^ {2}- slug:\s*(.+)$/)
		if (entryStart) {
			current = { slug: unquote(entryStart[1], lineNumber) }
			entries.push(current)
			inGroups = false
			continue
		}
		if (!current) fail(lineNumber, `content before the first entry: ${JSON.stringify(line)}`)
		const keyMatch = line.match(/^ {4}([A-Za-z]+):\s*(.*)$/)
		if (keyMatch) {
			const [, key, raw] = keyMatch
			if (!ALLOWED_KEYS.has(key)) fail(lineNumber, `unknown key: ${key}`)
			if (Object.prototype.hasOwnProperty.call(current, key)) fail(lineNumber, `duplicate key in entry: ${key}`)
			inGroups = key === "groups"
			current[key] = key === "groups" ? [] : unquote(raw, lineNumber)
			continue
		}
		const itemMatch = line.match(/^ {6}- (\S.*)$/)
		if (itemMatch && inGroups) {
			current.groups.push(unquote(itemMatch[1], lineNumber))
			continue
		}
		fail(lineNumber, `unrecognised line: ${JSON.stringify(line)}`)
	}

	if (entries.length === 0) throw new Error("roomodes-lite: no entries found")
	const seen = new Set()
	for (const entry of entries) {
		for (const key of REQUIRED) {
			if (typeof entry[key] !== "string" || entry[key].trim() === "") {
				throw new Error(`roomodes-lite: entry ${entry.slug ?? "(?)"} is missing ${key}`)
			}
		}
		if (seen.has(entry.slug)) throw new Error(`roomodes-lite: duplicate slug ${entry.slug}`)
		seen.add(entry.slug)
	}

	return { entries, digest }
}

/** The one line the model is shown, per `src/core/prompts/sections/modes.ts`. */
export function renderPickerLine(entry) {
	return `* "${entry.name}" mode (${entry.slug}) - ${entry.whenToUse}`
}
