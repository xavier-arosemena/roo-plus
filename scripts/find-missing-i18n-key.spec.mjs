/**
 * find-missing-i18n-key.spec.mjs
 *
 * Tests for scripts/find-missing-i18n-key.js (the missing-key scanner).
 *
 * Covers the three defect classes that previously made the gate noise-only:
 *   1. ignored/build output (src/dist/extension.js, node_modules, *.min.js) and
 *      test files must never be scanned,
 *   2. comments (JSDoc examples) must be stripped before matching,
 *   3. the options form t("key", { … }) and i18nKey="key" must be matched, and
 *      namespace-less keys must resolve against the file's bound namespace
 *      (including pluralised keys).
 *
 * Run with: node --test scripts/find-missing-i18n-key.spec.mjs
 * (scripts/ has no vitest runner; Node's built-in node:test is used — same
 * pattern as scripts/verify-branding.spec.mjs.)
 */

import { test } from "node:test"
import assert from "node:assert/strict"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"

import {
	stripComments,
	extractI18nKeys,
	detectDefaultNamespace,
	collectSourceFiles,
	keyExists,
	splitKey,
	checkKeyInLocales,
	findMissingI18nKeys,
} from "./find-missing-i18n-key.js"

const toPosix = (p) => p.split(path.sep).join("/")

const withTmpDir = (prefix, fn) => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix))
	try {
		return fn(dir)
	} finally {
		fs.rmSync(dir, { recursive: true, force: true })
	}
}

const write = (root, rel, content) => {
	const abs = path.join(root, rel)
	fs.mkdirSync(path.dirname(abs), { recursive: true })
	fs.writeFileSync(abs, typeof content === "string" ? content : JSON.stringify(content, null, "\t"))
}

// ---------------------------------------------------------------------------
// Comment stripping
// ---------------------------------------------------------------------------

test("stripComments removes line and block comments but preserves strings", () => {
	const source = [
		'// t("settings:line.commented")',
		'/* {t("settings:block.commented")} */',
		'const url = "https://example.com/a//b"',
		'const key = t("chat:real.key")',
	].join("\n")

	const stripped = stripComments(source)
	assert.ok(!stripped.includes("settings:line.commented"), "line comment must be removed")
	assert.ok(!stripped.includes("settings:block.commented"), "block comment must be removed")
	assert.ok(stripped.includes("https://example.com/a//b"), "string literal must be preserved")
	assert.ok(stripped.includes('t("chat:real.key")'), "real call must survive")
})

test("extractI18nKeys ignores JSDoc examples that live in comments", () => {
	const source = [
		"/**",
		' * @example label={t("settings:browser.enable.label")}',
		" */",
		'export const x = t("chat:real.key")',
	].join("\n")

	const keys = extractI18nKeys(source)
	assert.ok(keys.has("chat:real.key"))
	assert.ok(!keys.has("settings:browser.enable.label"))
})

// ---------------------------------------------------------------------------
// Pattern extraction
// ---------------------------------------------------------------------------

test("extractI18nKeys catches t(key, options), {t(key)} and i18nKey forms", () => {
	const source = [
		'const a = t("chat:queuedMessages.clickToEdit", { count: 2 })',
		'const b = <Trans i18nKey="chat:codebaseSearch.didSearch" count={3} />',
		'const c = <span>{t("common:dismiss")}</span>',
		'const d = i18nKey={"settings:about.title"}',
	].join("\n")

	const keys = extractI18nKeys(source)
	assert.ok(keys.has("chat:queuedMessages.clickToEdit"), "options form must match")
	assert.ok(keys.has("chat:codebaseSearch.didSearch"), "i18nKey attribute must match")
	assert.ok(keys.has("common:dismiss"), "brace form must match")
	assert.ok(keys.has("settings:about.title"), "i18nKey expression form must match")
})

test("extractI18nKeys keeps only key-shaped strings (ignores bare words)", () => {
	const keys = extractI18nKeys('t("Save"); t("common:save")')
	assert.ok(keys.has("common:save"))
	assert.ok(!keys.has("Save"))
})

// ---------------------------------------------------------------------------
// Namespace resolution
// ---------------------------------------------------------------------------

test("detectDefaultNamespace reads useTranslation/withTranslation and defaults to common", () => {
	assert.equal(detectDefaultNamespace('const { t } = useTranslation("chat")'), "chat")
	assert.equal(detectDefaultNamespace('export default withTranslation("common")(X)'), "common")
	assert.equal(detectDefaultNamespace("const { t } = useAppTranslation()"), "common")
	assert.equal(detectDefaultNamespace('const { t } = useTranslation("mcp", { keyPrefix: "x" })'), "mcp")
})

test("splitKey falls back to the default namespace for namespace-less keys", () => {
	assert.deepEqual(splitKey("chat:autoApprove.title", "common"), {
		namespace: "chat",
		jsonPath: "autoApprove.title",
	})
	assert.deepEqual(splitKey("errorBoundary.title", "common"), {
		namespace: "common",
		jsonPath: "errorBoundary.title",
	})
	assert.deepEqual(splitKey("queuedMessages.title", "chat"), {
		namespace: "chat",
		jsonPath: "queuedMessages.title",
	})
})

// ---------------------------------------------------------------------------
// File collection
// ---------------------------------------------------------------------------

test("collectSourceFiles skips dist, node_modules, *.min.js and test files", () => {
	withTmpDir("i18n-scan-", (dir) => {
		write(dir, "components/Real.tsx", 'const x = t("chat:real")')
		write(dir, "components/thing.spec.tsx", 'const x = t("chat:test.only")')
		write(dir, "components/thing.test.ts", 'const x = t("chat:test.only")')
		write(dir, "components/__tests__/Inner.tsx", 'const x = t("chat:test.inner")')
		write(dir, "components/__mocks__/mock.ts", 'const x = t("chat:mock")')
		write(dir, "node_modules/pkg/index.js", 'const x = t("chat:dep")')
		write(dir, "dist/extension.js", 'const x = t("svg:tspan")')
		write(dir, "build/bundle.js", 'const x = t("chat:built")')
		write(dir, "components/vendor.min.js", 'const x = t("chat:min")')

		const files = collectSourceFiles(dir).map((abs) => toPosix(path.relative(dir, abs)))
		assert.deepEqual(files.sort(), ["components/Real.tsx"])
	})
})

// ---------------------------------------------------------------------------
// Key existence (plural-aware)
// ---------------------------------------------------------------------------

test("keyExists accepts a base key and its i18next plural forms", () => {
	assert.ok(keyExists({ a: { b: "x" } }, "a.b"))
	assert.ok(keyExists({ a: { b_one: "1", b_other: "n" } }, "a.b"), "plural-only key must resolve")
	assert.ok(!keyExists({ a: {} }, "a.b"))
})

test("checkKeyInLocales flags a genuinely missing key and tolerates plural forms", () => {
	withTmpDir("i18n-locales-", (dir) => {
		write(dir, "en/chat.json", {
			codebaseSearch: { didSearch_one: "1", didSearch_other: "n" },
			present: "yes",
		})
		write(dir, "de/chat.json", { present: "ja" })

		assert.deepEqual(checkKeyInLocales("chat:codebaseSearch.didSearch", "chat", ["en"], dir), [])
		assert.deepEqual(checkKeyInLocales("chat:present", "chat", ["en", "de"], dir), [])
		assert.deepEqual(checkKeyInLocales("chat:missing", "chat", ["en"], dir), ["en/chat.json"])
		// A namespace-less key falls back to the passed default namespace, and a
		// missing namespace FILE counts as missing.
		assert.deepEqual(checkKeyInLocales("present", "common", ["de"], dir), ["de/common.json"])
	})
})

// ---------------------------------------------------------------------------
// End-to-end (injected config)
// ---------------------------------------------------------------------------

test("findMissingI18nKeys reports only the genuinely missing key from a sample tree", () => {
	withTmpDir("i18n-e2e-", (dir) => {
		write(
			dir,
			"app/Widget.tsx",
			[
				'const { t } = useTranslation("chat")',
				'const a = t("chat:widget.title") // present in en',
				'const b = t("chat:widget.subtitle", { count: 1 }) // genuinely missing',
				'// const c = t("chat:widget.commented")',
			].join("\n"),
		)
		write(dir, "locales/en/chat.json", { widget: { title: "Title" } })

		const results = findMissingI18nKeys({
			app: { path: path.join(dir, "app"), localesDir: path.join(dir, "locales") },
		})

		assert.equal(results.length, 1)
		assert.equal(results[0].key, "chat:widget.subtitle")
		assert.deepEqual(results[0].missingLocales, ["en/chat.json"])
	})
})
