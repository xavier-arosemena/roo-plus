/**
 * Legacy Roo auth token storage — READ/DELETE only.
 *
 * Roo Code Router has been removed, so nothing writes credentials anymore.
 * These functions only read or delete a legacy `cli-credentials.json` file
 * left behind by older releases, so `roo auth status` and `roo auth logout`
 * can report on and clean up leftover tokens.
 */
import fs from "fs/promises"
import path from "path"

import { getConfigDir } from "./index.js"

const CREDENTIALS_FILE = path.join(getConfigDir(), "cli-credentials.json")

// Only used to parse legacy credential files; the fields must remain so old
// files written by previous releases still parse correctly.
export interface Credentials {
	token: string
	createdAt: string
	userId?: string
	orgId?: string
}

export async function loadToken(): Promise<string | null> {
	try {
		const data = await fs.readFile(CREDENTIALS_FILE, "utf-8")
		const credentials: Credentials = JSON.parse(data)
		return credentials.token
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			return null
		}
		throw error
	}
}

export async function loadCredentials(): Promise<Credentials | null> {
	try {
		const data = await fs.readFile(CREDENTIALS_FILE, "utf-8")
		return JSON.parse(data) as Credentials
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			return null
		}
		throw error
	}
}

export async function clearToken(): Promise<void> {
	try {
		await fs.unlink(CREDENTIALS_FILE)
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
			throw error
		}
	}
}

export async function hasToken(): Promise<boolean> {
	const token = await loadToken()
	return token !== null
}

export function getCredentialsPath(): string {
	return CREDENTIALS_FILE
}
