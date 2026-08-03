const { spawnSync } = require("child_process")
const fs = require("fs")
const readline = require("readline")

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

		console.log(`\n🚀 Roo Code VSIX Installer (${buildType})`)
		console.log("========================")
		console.log("\nThis script will:")
		console.log("1. Uninstall any existing version of the Roo Code extension")
		console.log("2. Install the newly built VSIX package")
		console.log(`\nExtension: ${extensionId}`)
		console.log(`VSIX file: ${vsixFileName}`)

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
			console.log("Installation cancelled.")
			rl.close()
			process.exit(0)
		}

		// Validate the editor command against the allowlist before using it.
		if (!SUPPORTED_EDITOR_COMMANDS.has(editorCommand)) {
			console.error(
				`\n❌ Unsupported editor command '${editorCommand}'. Supported commands: ${[
					...SUPPORTED_EDITOR_COMMANDS,
				].join(", ")}`,
			)
			rl.close()
			process.exit(1)
		}

		console.log(`\nProceeding with installation using '${editorCommand}' command...`)

		try {
			// Use spawnSync with an args array (no shell) so the user-supplied
			// editor command cannot inject additional shell arguments.
			const uninstall = spawnSync(editorCommand, ["--uninstall-extension", extensionId], { stdio: "inherit" })
			if (uninstall.status !== 0 || uninstall.error) {
				throw uninstall.error ?? new Error(`uninstall-extension exited with status ${uninstall.status}`)
			}
		} catch (e) {
			console.log("Extension not installed, skipping uninstall step")
		}

		if (!fs.existsSync(vsixFileName)) {
			console.error(`\n❌ VSIX file not found: ${vsixFileName}`)
			console.error("Make sure the build completed successfully")
			rl.close()
			process.exit(1)
		}

		const install = spawnSync(editorCommand, ["--install-extension", vsixFileName], { stdio: "inherit" })
		if (install.status !== 0 || install.error) {
			throw install.error ?? new Error(`install-extension exited with status ${install.status}`)
		}

		console.log(`\n✅ Successfully installed extension from ${vsixFileName}`)
		console.log("\n⚠️  IMPORTANT: You need to restart VS Code for the changes to take effect.")
		console.log("   Please close and reopen VS Code to use the updated extension.\n")

		rl.close()
	} catch (error) {
		console.error("\n❌ Failed to install extension:", error.message)
		rl.close()
		process.exit(1)
	}
}

main()
