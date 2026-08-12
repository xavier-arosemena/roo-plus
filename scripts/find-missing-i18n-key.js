const fs = require("fs")
const path = require("path")

// Hierarchical tag identifying this process; every log line is prefixed so CI
// logs are greppable per process.
const TAG = "VERIFY:I18N-KEYS"
const log = (msg) => console.log(`[${TAG}] ${msg}`)
const logWarn = (msg) => console.warn(`[${TAG}] ${msg}`)
const logErr = (msg) => console.error(`[${TAG}] ${msg}`)

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

A useful script to identify whether the i18n keys used in component files exist in all language files.

Usage:
  node scripts/find-missing-i18n-key.js [options]

Options:
  --locale=<locale>   Only check a specific language (e.g., --locale=de)
  --file=<file>       Only check a specific file (e.g., --file=chat.json)
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

// Regular expressions to match i18n keys
const i18nPatterns = [
	/{t\("([^"]+)"\)}/g, // Match {t("key")} format
	/i18nKey="([^"]+)"/g, // Match i18nKey="key" format
	/t\("([a-zA-Z][a-zA-Z0-9_]*[:.][a-zA-Z0-9_.]+)"\)/g, // Match t("key") format, where key contains a colon or dot
]

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
			console.warn(`Warning: Locales directory not found: ${localesDir}`)
			return []
		}
		throw error
	}
}

// Get the value from JSON by path
function getValueByPath(obj, path) {
	const parts = path.split(".")
	let current = obj

	for (const part of parts) {
		if (current === undefined || current === null) {
			return undefined
		}
		current = current[part]
	}

	return current
}

// Check if the key exists in all language files, return a list of missing language files
function checkKeyInLocales(key, localeDirs, localesDir) {
	const [file, ...pathParts] = key.split(":")
	const jsonPath = pathParts.join(".")

	const missingLocales = []

	localeDirs.forEach((locale) => {
		const filePath = path.join(localesDir, locale, `${file}.json`)
		if (!fs.existsSync(filePath)) {
			missingLocales.push(`${locale}/${file}.json`)
			return
		}

		const json = JSON.parse(fs.readFileSync(filePath, "utf8"))
		if (getValueByPath(json, jsonPath) === undefined) {
			missingLocales.push(`${locale}/${file}.json`)
		}
	})

	return missingLocales
}

// Recursively traverse the directory
function findMissingI18nKeys() {
	const results = []

	function walk(dir, baseDir, localeDirs, localesDir) {
		// readdirSync with withFileTypes folds the file-type check into the
		// readdir result, avoiding a separate statSync + readFileSync
		// check-then-act (TOCTOU) race.
		const entries = fs.readdirSync(dir, { withFileTypes: true })

		for (const entry of entries) {
			const filePath = path.join(dir, entry.name)

			// Exclude test files and __mocks__ directory
			if (filePath.includes(".test.") || filePath.includes("__mocks__")) continue

			if (entry.isDirectory()) {
				walk(filePath, baseDir, localeDirs, localesDir) // Recursively traverse subdirectories
			} else if (entry.isFile() && [".ts", ".tsx", ".js", ".jsx"].includes(path.extname(filePath))) {
				const content = fs.readFileSync(filePath, "utf8")

				// Match all i18n keys
				for (const pattern of i18nPatterns) {
					let match
					while ((match = pattern.exec(content)) !== null) {
						const key = match[1]
						const missingLocales = checkKeyInLocales(key, localeDirs, localesDir)
						if (missingLocales.length > 0) {
							results.push({
								key,
								missingLocales,
								file: path.relative(baseDir, filePath),
							})
						}
					}
				}
			}
		}
	}

	// Walk through all directories
	Object.entries(DIRS).forEach(([name, config]) => {
		const localeDirs = getLocaleDirs(config.localesDir)
		if (localeDirs.length > 0) {
			log(`checking ${name} directory with ${localeDirs.length} languages: ${localeDirs.join(", ")}`)
			walk(config.path, config.path, localeDirs, config.localesDir)
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
			missingLocales.forEach((file) => log(`  - ${file}`))
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

main()
