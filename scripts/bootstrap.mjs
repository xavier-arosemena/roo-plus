#!/usr/bin/env node

import { spawnSync } from "child_process"
import { writeFileSync } from "fs"

import { logStep, logEndGroup, logInfo, logOk, logWarn, logError, logSuccess } from "./lib/logger.mjs"

// Hierarchical tag identifying this process.
const TAG = "BOOTSTRAP"

if (process.env.BOOTSTRAP_IN_PROGRESS) {
	logInfo(TAG, "bootstrap already in progress, continuing with normal installation...")
	process.exit(0)
}

// If we're already using pnpm, just exit normally.
if (process.env.npm_execpath && process.env.npm_execpath.includes("pnpm")) {
	logInfo(TAG, "already running under pnpm — skipping bootstrap")
	process.exit(0)
}

logStep(TAG, "Bootstrapping to pnpm")

/**
 * Run pnpm install with bootstrap environment variable.
 */
function runPnpmInstall(pnpmCommand) {
	return spawnSync(pnpmCommand, ["install"], {
		stdio: "inherit",
		shell: true,
		env: {
			...process.env,
			BOOTSTRAP_IN_PROGRESS: "1", // Set environment variable to indicate bootstrapping
		},
	})
}

/**
 * Create a temporary package.json if it doesn't exist.
 */
function ensurePackageJson() {
	// Use the "wx" exclusive flag so the write fails atomically if the file
	// already exists, instead of a check-then-act (TOCTOU) race between
	// existsSync and writeFileSync.
	try {
		writeFileSync("package.json", JSON.stringify({ name: "temp", private: true }, null, 2), { flag: "wx" })
		logInfo(TAG, "creating temporary package.json...")
	} catch (error) {
		if (error.code === "EEXIST") {
			// File already exists — nothing to do.
			return
		}
		throw error
	}
}

try {
	// Check if pnpm is installed globally.
	const pnpmCheck = spawnSync("pnpm", ["-v"], { shell: true })

	let pnpmInstall

	if (pnpmCheck.status === 0) {
		logOk(TAG, "found pnpm")
		pnpmInstall = runPnpmInstall("pnpm")
	} else {
		logWarn(TAG, "unable to find pnpm, installing it temporarily...")
		ensurePackageJson()

		logInfo(TAG, "installing pnpm locally...")

		const npmInstall = spawnSync("npm", ["install", "--no-save", "pnpm"], {
			stdio: "inherit",
			shell: true,
		})

		if (npmInstall.status !== 0) {
			logError(TAG, "failed to install pnpm locally")
			process.exit(1)
		}

		logInfo(TAG, "running pnpm install with local installation...")
		pnpmInstall = runPnpmInstall("node_modules/.bin/pnpm")
	}

	if (pnpmInstall.status !== 0) {
		logError(TAG, "pnpm install failed")
		process.exit(pnpmInstall.status)
	}

	logSuccess(TAG, "bootstrap completed successfully!")
	logEndGroup()
	process.exit(0)
} catch (error) {
	logError(TAG, `bootstrap failed: ${error.message}`)
	process.exit(1)
}
