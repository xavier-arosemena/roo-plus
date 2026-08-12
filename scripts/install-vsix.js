const { spawnSync } = require("child_process")
const fs = require("fs")
const readline = require("readline")

// Hierarchical tag identifying this process; every log line is prefixed so CI
// logs are greppable per process.
const TAG = "INSTALL:VSIX"
const log = (msg) => console.log(`[${TAG}] ${msg}`)
const logErr = (msg) => console.error(`[${TAG}] ${msg}`)

// Allowlist of supported editor CLI commands. The value may be supplied via the
// interactive prompt or --editor=<name>; restricting it to this allowlist
// prevents shell-command injection through the editor argument
// (indirect-command-line-injection).
const SUPPORTED_EDITOR_COMMANDS = new Set(["code", "code-insiders", "cursor"])

// detect "yes" flags
const autoYes = process.argv.includes("-y")

// detect nightly flag
const isNightly = process.argv.includes("--nightly")

// detect editor command from args or default to "code"
const editorArg = process.argv.find((arg) => arg.startsWith("--editor="))
const defaultEditor = editorArg ? editorArg.split("=")[1] : "code"

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
})

const askQuestion = (question) => {
	return new Promise((resolve) => {
		rl.question(question, (answer) => {
			resolve(answer)
		})
	})
}

async function main() {
	try {
		let name, version, publisher

		if (isNightly) {
			// For nightly, read the nightly-specific package.json and get publisher from src
			const nightlyPackageJson = JSON.parse(
				fs.readFileSync("./apps/vscode-nightly/package.nightly.json", "utf-8"),
			)
			const srcPackageJson = JSON.parse(fs.readFileSync("./src/package.json", "utf-8"))
			name = nightlyPackageJson.name
			version = nightlyPackageJson.version
			publisher = srcPackageJson.publisher
		} else {
			const packageJson = JSON.parse(fs.readFileSync("./src/package.json", "utf-8"))
			name = packageJson.name
			version = packageJson.version
			publisher = packageJson.publisher
		}

		const vsixFileName = `./bin/${name}-${version}.vsix`
		const extensionId = `${publisher}.${name}`
		const buildType = isNightly ? "Nightly" : "Regular"

		log(`🚀 Roo Code VSIX Installer (${buildType})`)
		log("This script will:")
		log("1. Uninstall any existing version of the Roo Code extension")
		log("2. Install the newly built VSIX package")
		log(`Extension: ${extensionId}`)
		log(`VSIX file: ${vsixFileName}`)

		// Ask for editor command if not provided
		let editorCommand = defaultEditor
		if (!editorArg && !autoYes) {
			const editorAnswer = await askQuestion(
				"\nWhich editor command to use? (code/cursor/code-insiders) [default: code]: ",
			)
			if (editorAnswer.trim()) {
				editorCommand = editorAnswer.trim()
			}
		}

		// skip prompt if auto-yes
		const answer = autoYes ? "y" : await askQuestion("\nDo you wish to continue? (y/n): ")

		if (answer.toLowerCase() !== "y") {
			log("installation cancelled.")
			rl.close()
			process.exit(0)
		}

		// Validate the editor command against the allowlist before using it.
		if (!SUPPORTED_EDITOR_COMMANDS.has(editorCommand)) {
			logErr(
				`❌ Unsupported editor command '${editorCommand}'. Supported commands: ${[
					...SUPPORTED_EDITOR_COMMANDS,
				].join(", ")}`,
			)
			rl.close()
			process.exit(1)
		}

		log(`proceeding with installation using '${editorCommand}' command...`)

		try {
			// Use spawnSync with an args array (no shell) so the user-supplied
			// editor command cannot inject additional shell arguments.
			const uninstall = spawnSync(editorCommand, ["--uninstall-extension", extensionId], { stdio: "inherit" })
			if (uninstall.status !== 0 || uninstall.error) {
				throw uninstall.error ?? new Error(`uninstall-extension exited with status ${uninstall.status}`)
			}
		} catch (e) {
			log("extension not installed, skipping uninstall step")
		}

		if (!fs.existsSync(vsixFileName)) {
			logErr(`❌ VSIX file not found: ${vsixFileName}`)
			logErr("make sure the build completed successfully")
			rl.close()
			process.exit(1)
		}

		const install = spawnSync(editorCommand, ["--install-extension", vsixFileName], { stdio: "inherit" })
		if (install.status !== 0 || install.error) {
			throw install.error ?? new Error(`install-extension exited with status ${install.status}`)
		}

		log(`✅ Successfully installed extension from ${vsixFileName}`)
		log("⚠️  IMPORTANT: You need to restart VS Code for the changes to take effect.")
		log("   Please close and reopen VS Code to use the updated extension.")

		rl.close()
	} catch (error) {
		logErr(`❌ Failed to install extension: ${error.message}`)
		rl.close()
		process.exit(1)
	}
}

main()
