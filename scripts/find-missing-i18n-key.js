const fs = require("fs")
const path = require("path")
const { execFileSync } = require("child_process")

// Hierarchical tag identifying this process; every log line is prefixed so CI
// logs are greppable per process.
const TAG = "VERIFY:I18N-KEYS"
const log = (msg) => console.log(`[${TAG}] ${msg}`)
const logWarn = (msg) => console.warn(`[${TAG}] ${msg}`)
const logErr = (msg) => console.error(`[${TAG}] ${msg}`)

const REPO_ROOT = path.resolve(__dirname, "..")

// Parse command-line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
	if (arg === "--help") {
		acc.help = true
	} else if (arg.startsWith("--locale=")) {
		acc.locale = arg.split("=")[1]
	} else if (arg.startsWith("--file=")) {
		acc.file = arg.split("=")[1]
	}
	return acc
}, {})

// Display help information
if (args.help) {
	console.log(`
Find missing i18n translations

A useful script to identify whether the i18n keys used in source files exist in
all language files.

The scanner intentionally:
  - skips build output and dependencies (honours .gitignore via \`git check-ignore\`,
    plus an explicit denylist for dist/build/node_modules/*.min.js),
  - skips test files (__tests__, __mocks__, \*.test.\*, \*.spec.\*),
  - strips line and block comments before matching, so JSDoc examples such as
    t("settings:browser.enable.label") are not counted,
  - understands the options form t("key", { ... }) and i18nKey="key",
  - resolves keys without an explicit namespace against the namespace bound at the
    top of the file (useTranslation("ns") / withTranslation("ns")), defaulting to
    "common",
  - accepts pluralised keys (key_one / key_other / ...) as present.

Usage:
  node scripts/find-missing-i18n-key.js [options]

Options:
  --locale=<locale>   Only check a specific language (e.g., --locale=de)
  --help              Display help information

Output:
  - Generate a report of missing translations
  `)
	process.exit(0)
}

// Directories to traverse and their corresponding locales
const DIRS = {
	components: {
		path: path.join(__dirname, "../webview-ui/src/components"),
		localesDir: path.join(__dirname, "../webview-ui/src/i18n/locales"),
	},
	src: {
		path: path.join(__dirname, "../src"),
		localesDir: path.join(__dirname, "../src/i18n/locales"),
	},
}

// Source file extensions we scan.
const SOURCE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"]

// Directory segments that are never source: build output, dependencies, caches.
// Kept in sync with .gitignore; `git check-ignore` is used as the primary filter
// and this list is the fallback when git is unavailable.
const DENIED_DIR_SEGMENTS = new Set([
	"node_modules",
	"dist",
	"build",
	"out",
	"coverage",
	".git",
	".turbo",
	".pnpm-store",
	".worktrees",
	".test_env",
	".vscode-test",
	"bin",
	"mock",
	"test-fixtures",
])

// i18next plural suffixes. A key that only exists as `key_one`/`key_other`
// resolves correctly at runtime (t("key", { count })), so it must not be
// reported as missing.
const PLURAL_SUFFIXES = ["zero", "one", "two", "few", "many", "other"]

// A syntactically-plausible namespaced (or dotted) key.
const KEY_SHAPE = /^[A-Za-z][A-Za-z0-9_-]*[.:]/

// Patterns that capture the first string argument of a translation call:
//   {t("key")}            — JSX brace form
//   t("key")              — plain call
//   t("key", { ... })     — call with interpolation/options
//   i18nKey="key"         — <Trans> prop
//   i18nKey={"key"}       — <Trans> prop (expression form)
const CALL_PATTERNS = [
	/\{\s*t\(\s*["']([^"']+)["']/g,
	/(?<![\w$])i18nKey\s*=\s*(?:\{\s*)?["']([^"']+)["']/g,
	/(?<![\w$])t\(\s*["']([^"']+)["']/g,
]

// Matches the namespace bound at the top of a file, e.g.
//   const { t } = useTranslation("chat")
//   withTranslation("common")
const NAMESPACE_PATTERN = /(?:useTranslation|useAppTranslation|withTranslation)\s*(?:<[^>]*>)?\(\s*["']([^"']+)["']/

/**
 * Remove JavaScript line and block comments while preserving string literals, so
 * a `https://…` inside a string is not mistaken for a comment and JSDoc examples
 * inside comments are not matched.
 */
function stripComments(source) {
	let out = ""
	let i = 0
	const n = source.length
	// code | line | block | sq | dq | tpl
	let state = "code"

	while (i < n) {
		const ch = source[i]
		const next = source[i + 1]

		if (state === "code") {
			if (ch === "/" && next === "/") {
				state = "line"
				out += "  "
				i += 2
				continue
			}
			if (ch === "/" && next === "*") {
				state = "block"
				out += "  "
				i += 2
				continue
			}
			if (ch === "'") state = "sq"
			else if (ch === '"') state = "dq"
			else if (ch === "`") state = "tpl"
			out += ch
			i++
			continue
		}

		if (state === "line") {
			if (ch === "\n") {
				state = "code"
				out += ch
			} else {
				out += " "
			}
			i++
			continue
		}

		if (state === "block") {
			if (ch === "*" && next === "/") {
				state = "code"
				out += "  "
				i += 2
				continue
			}
			out += ch === "\n" ? "\n" : " "
			i++
			continue
		}

		// String states: copy verbatim, honouring escapes.
		out += ch
		if (ch === "\\") {
			out += source[i + 1] ?? ""
			i += 2
			continue
		}
		if ((state === "sq" && ch === "'") || (state === "dq" && ch === '"') || (state === "tpl" && ch === "`")) {
			state = "code"
		}
		i++
	}

	return out
}

/**
 * Extract every plausible i18n key referenced by a source file.
 * @param {string} rawContent
 * @returns {Set<string>}
 */
function extractI18nKeys(rawContent) {
	const content = stripComments(rawContent)
	const keys = new Set()

	for (const pattern of CALL_PATTERNS) {
		pattern.lastIndex = 0
		let match
		while ((match = pattern.exec(content)) !== null) {
			const key = match[1]
			if (KEY_SHAPE.test(key)) {
				keys.add(key)
			}
		}
	}

	return keys
}

/**
 * Detect the default namespace a file translates into. Falls back to "common"
 * (the i18next default) when the file does not bind one explicitly.
 */
function detectDefaultNamespace(rawContent) {
	const content = stripComments(rawContent)
	const match = NAMESPACE_PATTERN.exec(content)
	return match ? match[1] : "common"
}

function isTestFile(relativePath) {
	const normalised = relativePath.split(path.sep).join("/")
	if (normalised.includes("/__tests__/") || normalised.includes("/__mocks__/")) return true
	return /\.(test|spec)\.[cm]?[jt]sx?$/.test(normalised)
}

function isDeniedPath(relativePath) {
	const normalised = relativePath.split(path.sep).join("/")
	const segments = normalised.split("/")
	if (segments.some((segment) => DENIED_DIR_SEGMENTS.has(segment))) return true
	if (/\.min\.js$/.test(normalised)) return true
	return isTestFile(normalised)
}

/**
 * Walk a directory collecting scannable source files (absolute paths), skipping
 * denylisted directories and test files.
 * @returns {string[]}
 */
function collectSourceFiles(rootDir) {
	const files = []

	const walk = (dir) => {
		let entries
		try {
			entries = fs.readdirSync(dir, { withFileTypes: true })
		} catch (error) {
			if (error.code === "ENOENT") return
			throw error
		}

		for (const entry of entries) {
			const abs = path.join(dir, entry.name)
			const rel = path.relative(REPO_ROOT, abs)
			if (isDeniedPath(rel)) continue

			if (entry.isDirectory()) {
				walk(abs)
			} else if (entry.isFile() && SOURCE_EXTENSIONS.includes(path.extname(abs))) {
				files.push(abs)
			}
		}
	}

	walk(rootDir)
	return files
}

/**
 * Filter out files git considers ignored (build output, bundles, …). Falls back
 * to the explicit denylist when git is unavailable.
 * @param {string[]} absPaths
 * @returns {string[]}
 */
function filterGitIgnored(absPaths) {
	if (absPaths.length === 0) return absPaths

	const relativeToRepo = (abs) => path.relative(REPO_ROOT, abs)
	// git check-ignore only understands paths inside the work tree; keep anything
	// outside (e.g. a temp fixture directory) untouched.
	const outsideRepo = absPaths.filter((abs) => relativeToRepo(abs).startsWith(".."))
	const insideRepo = absPaths.filter((abs) => !relativeToRepo(abs).startsWith(".."))
	if (insideRepo.length === 0) return absPaths

	let ignored
	try {
		ignored = execFileSync("git", ["check-ignore", "--stdin"], {
			cwd: REPO_ROOT,
			input: insideRepo.map(relativeToRepo).join("\n"),
			encoding: "utf8",
			stdio: ["pipe", "pipe", "ignore"],
		})
	} catch (error) {
		// Exit code 1 = nothing ignored (still a successful query). Any other
		// failure (e.g. git missing, not a repo) means we cannot filter, so keep
		// every file rather than silently dropping real source.
		if (error.status === 1) return absPaths
		logWarn(`git check-ignore unavailable (${error.message}); relying on the built-in denylist`)
		return absPaths
	}

	const ignoredSet = new Set(
		String(ignored)
			.split("\n")
			.map((line) => line.trim())
			.filter(Boolean),
	)
	return [...outsideRepo, ...insideRepo.filter((abs) => !ignoredSet.has(relativeToRepo(abs)))]
}

// Get all language directories for a specific locales directory
function getLocaleDirs(localesDir) {
	try {
		const allLocales = fs.readdirSync(localesDir).filter((file) => {
			const stats = fs.statSync(path.join(localesDir, file))
			return stats.isDirectory() // Do not exclude any language directories
		})

		// Filter to a specific language if specified
		return args.locale ? allLocales.filter((locale) => locale === args.locale) : allLocales
	} catch (error) {
		if (error.code === "ENOENT") {
			logWarn(`Locales directory not found: ${localesDir}`)
			return []
		}
		throw error
	}
}

// Get the value from JSON by path
function getValueByPath(obj, jsonPath) {
	const parts = jsonPath.split(".")
	let current = obj

	for (const part of parts) {
		if (current === undefined || current === null) {
			return undefined
		}
		current = current[part]
	}

	return current
}

// A key is "present" when it exists directly or in any i18next plural form.
function keyExists(json, jsonPath) {
	if (getValueByPath(json, jsonPath) !== undefined) return true
	return PLURAL_SUFFIXES.some((suffix) => getValueByPath(json, `${jsonPath}_${suffix}`) !== undefined)
}

// Split an i18n key into its namespace and dot path. Keys without an explicit
// namespace use the namespace detected from the source file.
function splitKey(key, defaultNamespace) {
	const colon = key.indexOf(":")
	if (colon === -1) {
		return { namespace: defaultNamespace || "common", jsonPath: key }
	}
	return { namespace: key.slice(0, colon), jsonPath: key.slice(colon + 1) }
}

// Check if the key exists in all language files, return a list of missing language files
function checkKeyInLocales(key, defaultNamespace, localeDirs, localesDir) {
	const { namespace, jsonPath } = splitKey(key, defaultNamespace)
	const missingLocales = []

	localeDirs.forEach((locale) => {
		const filePath = path.join(localesDir, locale, `${namespace}.json`)
		if (!fs.existsSync(filePath)) {
			missingLocales.push(`${locale}/${namespace}.json`)
			return
		}

		const json = JSON.parse(fs.readFileSync(filePath, "utf8"))
		if (!keyExists(json, jsonPath)) {
			missingLocales.push(`${locale}/${namespace}.json`)
		}
	})

	return missingLocales
}

// Recursively traverse the configured directories and collect missing keys.
function findMissingI18nKeys(dirs = DIRS) {
	const results = []

	Object.entries(dirs).forEach(([name, config]) => {
		const localeDirs = getLocaleDirs(config.localesDir)
		if (localeDirs.length === 0) return

		const files = filterGitIgnored(collectSourceFiles(config.path))
		log(`checking ${name} directory (${files.length} source files) with ${localeDirs.length} languages`)

		for (const filePath of files) {
			const content = fs.readFileSync(filePath, "utf8")
			const keys = extractI18nKeys(content)
			if (keys.size === 0) continue

			const defaultNamespace = detectDefaultNamespace(content)
			const relFile = path.relative(config.path, filePath)

			for (const key of keys) {
				const missingLocales = checkKeyInLocales(key, defaultNamespace, localeDirs, config.localesDir)
				if (missingLocales.length > 0) {
					results.push({ key, missingLocales, file: relFile })
				}
			}
		}
	})

	return results
}

// Execute and output the results
function main() {
	try {
		if (args.locale) {
			// Check if the specified locale exists in any of the locales directories
			const localeExists = Object.values(DIRS).some((config) => {
				const localeDirs = getLocaleDirs(config.localesDir)
				return localeDirs.includes(args.locale)
			})

			if (!localeExists) {
				logErr(`Error: Language '${args.locale}' not found in any locales directory`)
				process.exit(1)
			}
		}

		const missingKeys = findMissingI18nKeys()

		if (missingKeys.length === 0) {
			log("✅ All i18n keys are present!")
			return
		}

		log(`missing i18n keys found: ${missingKeys.length}`)
		missingKeys.forEach(({ key, missingLocales, file }) => {
			log(`File: ${file}`)
			log(`Key: ${key}`)
			log("Missing in:")
			missingLocales.forEach((localeFile) => log(`  - ${localeFile}`))
			log("-------------------")
		})

		// Exit code 1 indicates missing keys
		process.exit(1)
	} catch (error) {
		logErr(`Error: ${error.message}`)
		logErr(error.stack)
		process.exit(1)
	}
}

if (require.main === module) {
	main()
}

module.exports = {
	DIRS,
	extractI18nKeys,
	stripComments,
	detectDefaultNamespace,
	collectSourceFiles,
	filterGitIgnored,
	getValueByPath,
	keyExists,
	splitKey,
	checkKeyInLocales,
	findMissingI18nKeys,
	main,
}
